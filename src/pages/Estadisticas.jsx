// =============================================
// PÁGINA: ESTADÍSTICAS (CON BUSCADOR GLOBAL)
// =============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getMunicipiosPermitidos, tieneEtiquetaEspecial } from '../utils/helpers';
import { useEstudianteActualizado } from '../hooks/useEstudianteActualizado';
import { exportarEstudiantesExcel } from '../utils/exportUtils';
import { ESTADOS_ESTUDIANTE } from '../utils/constants';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FiltrosReportes, { FILTROS_VACIOS, aplicarFiltrosGenerico } from '../components/reportes/FiltrosReportes';
import TarjetaKPI from '../components/estadisticas/TarjetaKPI';
import GraficoEstadosDoughnut from '../components/estadisticas/GraficoEstadosDoughnut';
import GraficoGeneroDoughnut from '../components/estadisticas/GraficoGeneroDoughnut';
import GraficoBarrasHorizontal from '../components/estadisticas/GraficoBarrasHorizontal';
import ComparativoCohortes from '../components/estadisticas/ComparativoCohortes';
import RankingDeserciones from '../components/estadisticas/RankingDeserciones';
import GraficoCausasInasistencia from '../components/estadisticas/GraficoCausasInasistencia';
import GraficoInasistenciasMensual from '../components/estadisticas/GraficoInasistenciasMensual';

export default function Estadisticas({ onVerPerfil, usuarioForzado = null, simulando = false }) {
  const { perfil: usuarioAuth } = useAuth();
  // usuarioForzado permite que el admin "vea como" un aliado específico
  // desde VerComo.jsx, sin necesidad de iniciar sesión con esa cuenta.
  const usuario = usuarioForzado || usuarioAuth;
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('estadisticas');
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const [rawEstudiantes, setRawEstudiantes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [municipiosDb, setMunicipiosDb] = useState([]);
  const [universidadesDb, setUniversidadesDb] = useState([]);
  const [programasDb, setProgramasDb] = useState([]);

  // Municipios permitidos para el usuario (null = todos). Los aliados solo ven los suyos.
  const municipiosPermitidos = useMemo(() => getMunicipiosPermitidos(usuario), [usuario]);

  useEffect(() => {
    if (usuario) cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  // El modal global de "Ver Perfil" (App.jsx) edita fuera de esta página —
  // sin esto, un cambio (p.ej. discapacidad/trastorno) no se veía reflejado
  // aquí hasta recargar. Ver hooks/useEstudianteActualizado.js.
  useEstudianteActualizado(useCallback((id, datos) => {
    setRawEstudiantes(prev => prev.map(e => (e.id === id ? { ...e, ...datos } : e)));
  }, []));

  async function obtenerEstudiantesCrudo() {
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('estudiantes').select('*').order('nombre_completo').range(from, from + limit - 1);
      if (municipiosPermitidos) query = query.in('municipio', municipiosPermitidos);

      const { data, error } = await query;
      if (error) { console.error('Error:', error); break; }
      if (data && data.length > 0) { todosLosDatos = [...todosLosDatos, ...data]; from += limit; }
      if (!data || data.length < limit) hasMore = false;
    }

    return todosLosDatos;
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
    estado: e => e.estado || ESTADOS_ESTUDIANTE.ACTIVO,
    necesidadesEspeciales: e => tieneEtiquetaEspecial(e)
  };

  const estudiantesFiltrados = useMemo(
    () => aplicarFiltrosGenerico(rawEstudiantes, getters, filtros, municipiosPermitidos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawEstudiantes, filtros, municipiosPermitidos]
  );

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

  // KPIs y grupos totales derivados localmente del conjunto ya filtrado, en
  // vez de volver a consultar Supabase en vivo por cada cambio de filtro.
  const kpis = useMemo(() => {
    const total = estudiantesFiltrados.length;
    const activos = estudiantesFiltrados.filter(e => e.estado === 'Activo' || !e.estado).length;
    const desertores = estudiantesFiltrados.filter(e => e.estado === 'Desertor').length;
    const graduados = estudiantesFiltrados.filter(e => e.estado === 'Graduado').length;
    const enRiesgo = estudiantesFiltrados.filter(e => e.estado === 'En Riesgo').length;
    return {
      total_estudiantes: total,
      activos,
      activos_pct: total > 0 ? Math.round((activos / total) * 100 * 10) / 10 : 0,
      desertores,
      desertores_pct: total > 0 ? Math.round((desertores / total) * 100 * 10) / 10 : 0,
      graduados,
      graduados_pct: total > 0 ? Math.round((graduados / total) * 100 * 10) / 10 : 0,
      en_riesgo: enRiesgo,
      en_riesgo_pct: total > 0 ? Math.round((enRiesgo / total) * 100 * 10) / 10 : 0,
      necesidades_especiales: estudiantesFiltrados.filter(tieneEtiquetaEspecial).length
    };
  }, [estudiantesFiltrados]);

  const gruposTotales = useMemo(
    () => new Set(estudiantesFiltrados.map(e => e.grupo_id).filter(Boolean)).size,
    [estudiantesFiltrados]
  );

  // Los gráficos (Grafico*) consultan Supabase directamente y solo entienden
  // municipios/cohortes/universidades/estados — se les sigue forzando el
  // alcance por municipio del aliado, igual que antes.
  const filtrosEfectivos = useMemo(() => {
    if (!municipiosPermitidos) return filtros;
    const seleccion = filtros.municipios?.length > 0
      ? filtros.municipios.filter(m => municipiosPermitidos.includes(m))
      : municipiosPermitidos;
    return { ...filtros, municipios: seleccion };
  }, [filtros, municipiosPermitidos]);

  if (!usuario) {
    return <LoadingSpinner mensaje="Cargando..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        rol={usuario.rol}
        simulando={simulando}
      />

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                📈 Panel de Estadísticas
              </h1>
              <p className="text-gray-600">
                Visión general del programa Universidad en el Campo
              </p>
            </div>
            <button
              onClick={() => exportarEstudiantesExcel(estudiantesFiltrados, 'Estadisticas')}
              disabled={estudiantesFiltrados.length === 0}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
            >
              📥 Descargar Excel
            </button>
          </div>

          {/* FILTROS */}
          <FiltrosReportes
            filtros={filtros}
            onCambio={setFiltros}
            opciones={opcionesFiltro}
            filas={rawEstudiantes}
            getters={getters}
            municipiosPermitidos={municipiosPermitidos}
            mostrarFecha={false}
            mostrarEstado
            mostrarInstitucion
            mostrarNecesidadesEspeciales
          />

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando estadísticas..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <TarjetaKPI titulo="Total Estudiantes" valor={kpis.total_estudiantes || 0} color="from-blue-400 to-blue-500" />
                <TarjetaKPI titulo="Activos" valor={`${kpis.activos || 0} (${kpis.activos_pct || 0}%)`} color="from-emerald-400 to-emerald-500" />
                <TarjetaKPI titulo="Desertores" valor={`${kpis.desertores || 0} (${kpis.desertores_pct || 0}%)`} color="from-rose-400 to-rose-500" />
                <TarjetaKPI titulo="Graduados" valor={`${kpis.graduados || 0} (${kpis.graduados_pct || 0}%)`} color="from-sky-400 to-sky-500" />
                <TarjetaKPI titulo="En Riesgo" valor={`${kpis.en_riesgo || 0} (${kpis.en_riesgo_pct || 0}%)`} color="from-amber-300 to-amber-400" />
                <TarjetaKPI titulo="Grupos Totales" valor={gruposTotales} color="from-purple-400 to-purple-500" />
                <TarjetaKPI titulo="Necesidades Especiales" valor={kpis.necesidades_especiales || 0} color="from-orange-400 to-orange-500" />
              </div>

              {/* GRÁFICOS PRINCIPALES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoEstadosDoughnut filtros={filtrosEfectivos} />
                <GraficoGeneroDoughnut filtros={filtrosEfectivos} />
              </div>

              {/* GRÁFICOS DE DISTRIBUCIÓN - FILA 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Municipio" 
                  campo="municipio" 
                  icono="📍" 
                  filtros={filtrosEfectivos}
                  limite={10}
                />
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Institución" 
                  campo="institucion_educativa" 
                  icono="🏫" 
                  filtros={filtrosEfectivos}
                  limite={10}
                />
              </div>

              {/* GRÁFICOS DE DISTRIBUCIÓN - FILA 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Universidad" 
                  campo="universidad" 
                  icono="🎓" 
                  filtros={filtrosEfectivos}
                  limite={10}
                />
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Programa" 
                  campo="programa" 
                  icono="📚" 
                  filtros={filtrosEfectivos}
                  limite={10}
                />
              </div>

              {/* COMPARATIVO INTER-COHORTE */}
              <ComparativoCohortes filtros={filtrosEfectivos} />

              {/* RANKING DE DESERCIONES */}
              <RankingDeserciones filtros={filtrosEfectivos} />

              {/* INASISTENCIAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoCausasInasistencia filtros={filtrosEfectivos} />
                <GraficoInasistenciasMensual filtros={filtrosEfectivos} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}