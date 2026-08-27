// =============================================
// PÁGINA: LISTADO DE ESTUDIANTES (TODOS, CON FILTROS DINÁMICOS)
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FiltrosReportes, { FILTROS_VACIOS, aplicarFiltrosGenerico } from '../../components/reportes/FiltrosReportes';
import { getMunicipiosPermitidos, getEstadoColor } from '../../utils/helpers';
import BadgeDiscapacidad from '../../components/estudiantes/BadgeDiscapacidad';
import { ESTADOS_ESTUDIANTE } from '../../utils/constants';

export default function ListadoEstudiantes({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('estudiantes');
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const [rawEstudiantes, setRawEstudiantes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [municipiosDb, setMunicipiosDb] = useState([]);
  const [universidadesDb, setUniversidadesDb] = useState([]);
  const [programasDb, setProgramasDb] = useState([]);

  const municipiosPermitidos = getMunicipiosPermitidos(usuario);

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function obtenerEstudiantesCrudo() {
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('estudiantes')
        .select('*, grupos:grupo_id (nombre)')
        .order('nombre_completo')
        .range(from, from + limit - 1);

      if (municipiosPermitidos) query = query.in('municipio', municipiosPermitidos);

      const { data, error } = await query;

      if (error) {
        console.error('Error:', error);
        break;
      }

      if (data && data.length > 0) {
        todosLosDatos = [...todosLosDatos, ...data];
        from += limit;
      }

      if (!data || data.length < limit) {
        hasMore = false;
      }
    }

    return todosLosDatos.map(e => ({ ...e, grupo_nombre: e.grupos?.nombre || 'Sin grupo' }));
  }

  async function cargarTodo() {
    setCargando(true);
    const [est, gruposRes, municipiosRes, universidadesRes, programasRes] = await Promise.all([
      obtenerEstudiantesCrudo(),
      supabase.from('grupos').select('id, nombre, universidad, programa, cohorte').eq('activo', true).order('nombre'),
      supabase.from('municipios').select('nombre').order('nombre'),
      supabase.from('universidades').select('nombre').order('nombre'),
      supabase.from('programas').select('nombre').order('nombre')
    ]);
    setRawEstudiantes(est);
    setGrupos(gruposRes.data || []);
    setMunicipiosDb(municipiosRes.data || []);
    setUniversidadesDb(universidadesRes.data || []);
    setProgramasDb(programasRes.data || []);
    setCargando(false);
  }

  const getters = {
    municipio: e => e.municipio,
    universidad: e => e.universidad,
    programa: e => e.programa,
    cohorte: e => e.cohorte,
    grupoId: e => e.grupo_id,
    institucion: e => e.institucion_educativa,
    estado: e => e.estado || ESTADOS_ESTUDIANTE.ACTIVO
  };

  const estudiantesFiltrados = useMemo(() => {
    let resultado = aplicarFiltrosGenerico(rawEstudiantes, getters, filtros, municipiosPermitidos);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre_completo?.toLowerCase().includes(q) || e.documento?.toLowerCase().includes(q)
      );
    }
    return resultado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawEstudiantes, filtros, busqueda, municipiosPermitidos]);

  const cohortesDisponibles = useMemo(() => {
    const set = new Set(rawEstudiantes.map(e => e.cohorte).filter(Boolean));
    return Array.from(set).sort();
  }, [rawEstudiantes]);

  const institucionesDisponibles = useMemo(() => {
    const set = new Set(rawEstudiantes.map(e => e.institucion_educativa).filter(Boolean));
    return Array.from(set).sort();
  }, [rawEstudiantes]);

  const opcionesFiltro = useMemo(() => ({
    municipios: municipiosDb
      .filter(m => !municipiosPermitidos || municipiosPermitidos.includes(m.nombre))
      .map(m => ({ valor: m.nombre, label: m.nombre })),
    universidades: universidadesDb.map(u => ({ valor: u.nombre, label: u.nombre })),
    programas: programasDb.map(p => ({ valor: p.nombre, label: p.nombre })),
    cohortes: cohortesDisponibles.map(c => ({ valor: c, label: c })),
    grupos: grupos.map(g => ({ valor: g.id, label: `${g.nombre} — ${g.universidad}` })),
    instituciones: institucionesDisponibles.map(i => ({ valor: i, label: i })),
    estados: Object.values(ESTADOS_ESTUDIANTE).map(e => ({ valor: e, label: e }))
  }), [municipiosDb, universidadesDb, programasDb, grupos, cohortesDisponibles, institucionesDisponibles, municipiosPermitidos]);

  const kpis = useMemo(() => ({
    total: estudiantesFiltrados.length,
    activos: estudiantesFiltrados.filter(e => (e.estado || 'Activo') === ESTADOS_ESTUDIANTE.ACTIVO).length,
    enRiesgo: estudiantesFiltrados.filter(e => e.estado === ESTADOS_ESTUDIANTE.EN_RIESGO).length,
    desertores: estudiantesFiltrados.filter(e => e.estado === ESTADOS_ESTUDIANTE.DESERTOR).length,
    graduados: estudiantesFiltrados.filter(e => e.estado === ESTADOS_ESTUDIANTE.GRADUADO).length
  }), [estudiantesFiltrados]);

  if (!usuario) return <LoadingSpinner mensaje="Cargando..." />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario.rol} />

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">👥 Estudiantes</h1>
            <p className="text-gray-600">Listado completo de estudiantes del sistema, con acceso directo a su perfil</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
              <p className="text-2xl font-bold text-green-700">{kpis.activos}</p>
              <p className="text-xs text-green-600">Activos</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
              <p className="text-2xl font-bold text-amber-700">{kpis.enRiesgo}</p>
              <p className="text-xs text-amber-600">En Riesgo</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
              <p className="text-2xl font-bold text-red-700">{kpis.desertores}</p>
              <p className="text-xs text-red-600">Desertores</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{kpis.graduados}</p>
              <p className="text-xs text-blue-600">Graduados</p>
            </div>
          </div>

          <FiltrosReportes
            filtros={filtros}
            onCambio={setFiltros}
            opciones={opcionesFiltro}
            filas={rawEstudiantes}
            getters={getters}
            municipiosPermitidos={municipiosPermitidos}
            mostrarFecha={false}
            mostrarInstitucion
          />

          <div className="mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar por nombre o documento..."
              className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <LoadingSpinner mensaje="Cargando estudiantes..." />
            </div>
          ) : estudiantesFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {rawEstudiantes.length === 0 ? 'No hay estudiantes registrados.' : 'Ningún estudiante coincide con los filtros actuales.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Estudiante</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Municipio</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Universidad / Grupo</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Cohorte</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Estado</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">Perfil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estudiantesFiltrados.map(e => (
                      <tr
                        key={e.id}
                        onClick={() => onVerPerfil?.(e)}
                        className="hover:bg-primary/20 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{e.nombre_completo}</p>
                          <p className="text-xs text-gray-400">{e.documento}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          <p>{e.municipio}</p>
                          <p className="text-xs text-gray-400">{e.institucion_educativa}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          <p>{e.universidad}</p>
                          <p className="text-xs text-gray-400">{e.grupo_nombre}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{e.cohorte}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getEstadoColor(e.estado)}`}>
                              {e.estado || 'Activo'}
                            </span>
                            <BadgeDiscapacidad estudiante={e} />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={(ev) => { ev.stopPropagation(); onVerPerfil?.(e); }}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 w-8 h-8 rounded-full inline-flex items-center justify-center transition"
                            title="Ver perfil"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-400">{estudiantesFiltrados.length} estudiante{estudiantesFiltrados.length !== 1 ? 's' : ''} con los filtros actuales</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
