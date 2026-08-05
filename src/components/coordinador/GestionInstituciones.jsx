// =============================================
// COMPONENTE: GESTIÓN DE INSTITUCIONES EDUCATIVAS (PORTAL PÚBLICO POR TOKEN)
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, interpretarError } from '../../utils/helpers';
import ModalCrearInstitucion from './ModalCrearInstitucion';

function generarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function GestionInstituciones() {
  const notificacion = useNotificacion();
  const [instituciones, setInstituciones] = useState([]);
  const [conteos, setConteos] = useState({});
  const [conteosActivos, setConteosActivos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  // La tabla estudiantes ya supera las 1000 filas (límite por página de
  // PostgREST), así que hay que paginar o el conteo por institución queda
  // truncado silenciosamente.
  async function obtenerTodosLosEstudiantesBasico() {
    let todos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from('estudiantes')
        .select('id, institucion_educativa, municipio, estado')
        .range(from, from + limit - 1);
      if (data && data.length > 0) {
        todos = [...todos, ...data];
        from += limit;
      }
      if (!data || data.length < limit) hasMore = false;
    }
    return todos;
  }

  async function cargarDatos() {
    setCargando(true);
    const [instRes, filasEstudiantes] = await Promise.all([
      supabase.from('instituciones').select('*, municipios:municipio_id (nombre)').order('nombre'),
      obtenerTodosLosEstudiantesBasico()
    ]);

    const listaInstituciones = instRes.data || [];

    // Conteo real de estudiantes por institución (cruzando nombre + municipio,
    // porque hay nombres de institución repetidos en municipios distintos)
    const mapaConteo = {};
    const mapaConteoActivos = {};
    filasEstudiantes.forEach(e => {
      const clave = `${e.institucion_educativa}|${e.municipio}`;
      mapaConteo[clave] = (mapaConteo[clave] || 0) + 1;
      if (e.estado !== 'Desertor' && e.estado !== 'Graduado') {
        mapaConteoActivos[clave] = (mapaConteoActivos[clave] || 0) + 1;
      }
    });
    setConteos(mapaConteo);
    setConteosActivos(mapaConteoActivos);

    setInstituciones(listaInstituciones);
    setCargando(false);
  }

  async function generarOActivarLink(institucion) {
    setProcesandoId(institucion.id);
    const token = generarToken();
    const { error } = await supabase
      .from('instituciones')
      .update({ token_acceso: token, token_activo: true, token_creado_at: new Date().toISOString() })
      .eq('id', institucion.id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al generar el enlace');
    } else {
      notificacion.success('Enlace generado correctamente');
      cargarDatos();
    }
    setProcesandoId(null);
  }

  async function revocarLink(institucion) {
    if (!confirm('¿Revocar el enlace de esta institución? Dejará de funcionar de inmediato.')) return;
    setProcesandoId(institucion.id);
    const { error } = await supabase
      .from('instituciones')
      .update({ token_activo: false })
      .eq('id', institucion.id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al revocar');
    } else {
      notificacion.success('Enlace revocado');
      cargarDatos();
    }
    setProcesandoId(null);
  }

  function copiarLink(institucion) {
    const url = `${window.location.origin}/ie/${institucion.token_acceso}`;
    navigator.clipboard.writeText(url)
      .then(() => notificacion.success('Enlace copiado al portapapeles'))
      .catch(() => notificacion.error('No se pudo copiar el enlace'));
  }

  const institucionesFiltradas = useMemo(() => {
    const base = mostrarTodas
      ? instituciones
      : instituciones.filter(i => {
          const clave = `${i.nombre}|${i.municipios?.nombre}`;
          return (conteosActivos[clave] || 0) > 0;
        });
    if (!busqueda.trim()) return base;
    const q = busqueda.toLowerCase();
    return base.filter(i =>
      i.nombre.toLowerCase().includes(q) || i.municipios?.nombre?.toLowerCase().includes(q)
    );
  }, [instituciones, conteosActivos, busqueda, mostrarTodas]);

  const agrupadasPorMunicipio = useMemo(() => {
    const grupos = {};
    institucionesFiltradas.forEach(i => {
      const municipio = i.municipios?.nombre || 'Sin municipio';
      (grupos[municipio] = grupos[municipio] || []).push(i);
    });
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [institucionesFiltradas]);

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4">Cargando instituciones...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-sm text-gray-500">
          Genera un enlace de solo lectura para que cada institución vea únicamente la información
          de sus propios estudiantes y grupos, sin necesidad de iniciar sesión.
        </p>
        <button
          onClick={() => setModalCrear(true)}
          className="flex-shrink-0 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          ➕ Nueva Institución
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar institución o municipio..."
          className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarTodas}
            onChange={e => setMostrarTodas(e.target.checked)}
            className="rounded border-gray-300"
          />
          Mostrar instituciones sin estudiantes activos
        </label>
      </div>

      <div className="space-y-6">
        {agrupadasPorMunicipio.map(([municipio, lista]) => (
          <div key={municipio}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">📍 {municipio}</h3>
            <div className="space-y-2">
              {lista.map(inst => {
                const total = conteos[`${inst.nombre}|${municipio}`] || 0;
                const procesando = procesandoId === inst.id;
                return (
                  <div key={inst.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{inst.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        👥 {total} estudiante{total !== 1 ? 's' : ''}
                        {inst.token_activo && (
                          <span className="ml-2 text-green-600">
                            · {inst.total_accesos || 0} acceso(s)
                            {inst.ultimo_acceso_at && ` · último ${formatearFecha(inst.ultimo_acceso_at)}`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {inst.token_activo ? (
                        <>
                          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">🔗 Enlace activo</span>
                          <button
                            onClick={() => copiarLink(inst)}
                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                          >
                            📋 Copiar
                          </button>
                          <button
                            onClick={() => generarOActivarLink(inst)}
                            disabled={procesando}
                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                          >
                            🔄 Regenerar
                          </button>
                          <button
                            onClick={() => revocarLink(inst)}
                            disabled={procesando}
                            className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                          >
                            🚫 Revocar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => generarOActivarLink(inst)}
                          disabled={procesando}
                          className="text-xs bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {procesando ? 'Generando...' : '🔗 Generar Enlace'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ModalCrearInstitucion
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onCreada={() => { setModalCrear(false); cargarDatos(); }}
      />
    </div>
  );
}
