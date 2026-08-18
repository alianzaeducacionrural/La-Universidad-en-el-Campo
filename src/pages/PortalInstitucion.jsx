// =============================================
// PÁGINA PÚBLICA: PORTAL DE INSTITUCIÓN EDUCATIVA
// =============================================
//
// Ruta pública /ie/:token — fuera de ProtectedRoute, sin sesión de Supabase.
// Todos los datos vienen de la Edge Function `portal-institucion`, que valida
// el token contra la tabla `instituciones` usando la service_role key. La RLS
// para `anon` sigue bloqueada; esta página nunca consulta Supabase directo.
//
// La vista replica, en modo solo-lectura, lo que ve un padrino en su
// dashboard (selector de grupos + tabla de estudiantes + perfil completo).

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { getEstadoColor, formatearFecha, limpiarEmojis, cruzarCronogramaConAsistencia, normalizarTexto } from '../utils/helpers';
import { TIPOS_DOCUMENTO_DESERCION, NOMBRE_CERTIFICADO_HOMOLOGACION } from '../utils/constants';
import {
  exportarEstudiantesExcel,
  exportarSeguimientosExcel,
  exportarNotasEstudianteExcel,
  exportarInasistenciasExcel,
  exportarNotasGrupoExcel,
  exportarAsistenciaGrupoExcel
} from '../utils/exportUtils';
import BotonWhatsApp from '../components/common/BotonWhatsApp';
import VisorImagen from '../components/common/VisorImagen';
import FiltrosReportes, { FILTROS_VACIOS, aplicarFiltrosGenerico } from '../components/reportes/FiltrosReportes';
import ReportesPanel from '../components/reportes/ReportesPanel';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const FUNCIONES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-institucion`;
const FUNCIONES_HOMOLOGACION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-homologacion`;
const TAB_RESUMEN = '__resumen__';
const TAB_REPORTES = '__reportes__';
const TAB_HOMOLOGACION = '__homologacion__';

// Paleta rotativa para diferenciar cada grupo a simple vista — el mismo
// grupo conserva siempre el mismo color mientras no cambie su posición en
// la lista ordenada alfabéticamente.
const TEMAS_GRUPO = [
  { nombre: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', solido: 'bg-blue-400', dot: 'bg-blue-400', activo: 'bg-blue-400 text-white border-blue-400 shadow-md shadow-blue-200', gradiente: 'from-blue-200 to-blue-300', anillo: 'focus-visible:ring-blue-400' },
  { nombre: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', solido: 'bg-purple-400', dot: 'bg-purple-400', activo: 'bg-purple-400 text-white border-purple-400 shadow-md shadow-purple-200', gradiente: 'from-purple-200 to-purple-300', anillo: 'focus-visible:ring-purple-400' },
  { nombre: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', solido: 'bg-amber-400', dot: 'bg-amber-400', activo: 'bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-200', gradiente: 'from-amber-200 to-amber-300', anillo: 'focus-visible:ring-amber-400' },
  { nombre: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', solido: 'bg-rose-400', dot: 'bg-rose-400', activo: 'bg-rose-400 text-white border-rose-400 shadow-md shadow-rose-200', gradiente: 'from-rose-200 to-rose-300', anillo: 'focus-visible:ring-rose-400' },
  { nombre: 'teal', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', solido: 'bg-teal-400', dot: 'bg-teal-400', activo: 'bg-teal-400 text-white border-teal-400 shadow-md shadow-teal-200', gradiente: 'from-teal-200 to-teal-300', anillo: 'focus-visible:ring-teal-400' },
  { nombre: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', solido: 'bg-indigo-400', dot: 'bg-indigo-400', activo: 'bg-indigo-400 text-white border-indigo-400 shadow-md shadow-indigo-200', gradiente: 'from-indigo-200 to-indigo-300', anillo: 'focus-visible:ring-indigo-400' },
  { nombre: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', solido: 'bg-orange-400', dot: 'bg-orange-400', activo: 'bg-orange-400 text-white border-orange-400 shadow-md shadow-orange-200', gradiente: 'from-orange-200 to-orange-300', anillo: 'focus-visible:ring-orange-400' },
  { nombre: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', solido: 'bg-cyan-400', dot: 'bg-cyan-400', activo: 'bg-cyan-400 text-white border-cyan-400 shadow-md shadow-cyan-200', gradiente: 'from-cyan-200 to-cyan-300', anillo: 'focus-visible:ring-cyan-400' },
];

function TarjetaGrupo({ g, tema, stats, onIrAGrupo }) {
  const pctActivos = stats.total > 0 ? Math.round(((stats.activos + stats.enRiesgo) / stats.total) * 100) : 0;
  return (
    <button
      onClick={() => onIrAGrupo(g.id)}
      className={`text-left rounded-xl border ${tema.border} ${tema.bg} p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 ${tema.anillo}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${tema.dot} flex-shrink-0`}></span>
        <span className="text-xs font-medium text-gray-500 ml-auto">{stats.total} estudiante{stats.total !== 1 ? 's' : ''}</span>
      </div>
      <p className={`font-bold ${tema.text} leading-snug mb-3`}>{etiquetaGrupo(g)}</p>
      <div className="h-1.5 rounded-full bg-white/70 overflow-hidden mb-1.5">
        <div className={`h-full ${tema.solido}`} style={{ width: `${pctActivos}%` }}></div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{pctActivos}% activos</span>
        {stats.desertores > 0 && <span className="text-red-500">{stats.desertores} desertor{stats.desertores !== 1 ? 'es' : ''}</span>}
      </div>
    </button>
  );
}

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

// Las instituciones no reconocen el nombre interno del grupo (p. ej. "Internet
// de las Cosas Manizales - La Trinidad - 2026"); lo que les es útil es a qué
// universidad, programa y cohorte pertenece.
// Solo para las etiquetas de grupo del portal: nombres cortos para que quepan
// en las pestañas y tarjetas, sin tocar las universidades/programas mostrados
// en otras secciones (p. ej. Información Académica del perfil).
const ABREVIATURAS_UNIVERSIDAD = {
  'Universidad Católica de Manizales': 'U. Católica',
  'Universidad de Manizales': 'U. Manizales',
  'Universidad Autónoma de Manizales': 'U. Autónoma',
  'Universidad de Caldas': 'U. Caldas',
};

function etiquetaGrupo(g) {
  const universidad = ABREVIATURAS_UNIVERSIDAD[g.universidad] || g.universidad;
  const programa = (g.programa || '').replace('Técnico Profesional', 'T.P.');
  return `${universidad} - ${programa} - Cohorte ${g.cohorte}`;
}

export default function PortalInstitucion() {
  const { token } = useParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [datos, setDatos] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaGrupo, setBusquedaGrupo] = useState('');
  const [tabActiva, setTabActiva] = useState(TAB_RESUMEN);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [filtrosResumen, setFiltrosResumen] = useState(FILTROS_VACIOS);
  const buscadorRef = useRef(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(false);
      try {
        const res = await fetch(FUNCIONES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(import.meta.env.VITE_SUPABASE_ANON_KEY ? { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } : {})
          },
          body: JSON.stringify({ token })
        });
        if (!res.ok) { setError(true); setCargando(false); return; }
        const data = await res.json();
        setDatos(data);
      } catch {
        setError(true);
      }
      setCargando(false);
    }
    if (token) cargar();
  }, [token]);

  const gruposOrdenados = useMemo(() => {
    return [...(datos?.grupos || [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [datos]);

  const temaPorGrupo = useMemo(() => {
    const mapa = {};
    gruposOrdenados.forEach((g, idx) => { mapa[g.id] = TEMAS_GRUPO[idx % TEMAS_GRUPO.length]; });
    return mapa;
  }, [gruposOrdenados]);

  // Solo para el orden visual de las pestañas: agrupa por universidad sin
  // tocar `gruposOrdenados` (que sigue rigiendo colores y el resto de vistas).
  const pestanasPorUniversidad = useMemo(() => {
    const mapa = new Map();
    gruposOrdenados.forEach(g => {
      const clave = g.universidad || '';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(g);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [gruposOrdenados]);
  const variasUniversidadesEnPestanas = pestanasPorUniversidad.length > 1;

  // Filtros del resumen: municipio/universidad/programa/cohorte/grupo/estado
  // operando en memoria sobre lo que ya trajo la Edge Function — el portal
  // nunca consulta Supabase directo, así que no hay nada que pedirle al server.
  const gettersInstitucion = {
    municipio: e => e.municipio,
    universidad: e => e.universidad,
    programa: e => e.programa,
    cohorte: e => e.cohorte,
    grupoId: e => e.grupo_id,
    estado: e => e.estado
  };

  const opcionesResumen = useMemo(() => {
    const estudiantes = datos?.estudiantes || [];
    function opcionesUnicas(campo) {
      const set = new Set(estudiantes.map(e => e[campo]).filter(Boolean));
      return Array.from(set).sort().map(v => ({ valor: v, label: v }));
    }
    return {
      municipios: opcionesUnicas('municipio'),
      universidades: opcionesUnicas('universidad'),
      programas: opcionesUnicas('programa'),
      cohortes: opcionesUnicas('cohorte'),
      grupos: gruposOrdenados.map(g => ({ valor: g.id, label: etiquetaGrupo(g) })),
      estados: opcionesUnicas('estado')
    };
  }, [datos, gruposOrdenados]);

  const estudiantesFiltradosResumen = useMemo(
    () => aplicarFiltrosGenerico(datos?.estudiantes || [], gettersInstitucion, filtrosResumen, null),
    [datos, filtrosResumen]
  );

  const kpis = useMemo(() => {
    const estudiantes = estudiantesFiltradosResumen;
    return {
      total: estudiantes.length,
      activos: estudiantes.filter(e => e.estado === 'Activo' || !e.estado).length,
      enRiesgo: estudiantes.filter(e => e.estado === 'En Riesgo').length,
      desertores: estudiantes.filter(e => e.estado === 'Desertor').length,
      graduados: estudiantes.filter(e => e.estado === 'Graduado').length
    };
  }, [estudiantesFiltradosResumen]);

  const estadisticasPorGrupo = useMemo(() => {
    const estudiantes = estudiantesFiltradosResumen;
    const mapa = {};
    gruposOrdenados.forEach(g => {
      const deGrupo = estudiantes.filter(e => e.grupo_id === g.id);
      mapa[g.id] = {
        total: deGrupo.length,
        activos: deGrupo.filter(e => e.estado === 'Activo' || !e.estado).length,
        enRiesgo: deGrupo.filter(e => e.estado === 'En Riesgo').length,
        desertores: deGrupo.filter(e => e.estado === 'Desertor').length,
      };
    });
    return mapa;
  }, [estudiantesFiltradosResumen, gruposOrdenados]);

  // Grupos "etiquetados" para la pestaña de Reportes: reutiliza la misma
  // terna universidad/programa/cohorte que ya se usa en pestañas y tarjetas
  // — la institución nunca ve el nombre interno del grupo (g.nombre).
  const gruposEtiquetados = useMemo(
    () => gruposOrdenados.map(g => ({ id: g.id, nombre: etiquetaGrupo(g) })),
    [gruposOrdenados]
  );

  // Deserciones/inasistencias/seguimientos para la pestaña de Reportes:
  // se aplanan desde los arreglos anidados que ya trae cada estudiante
  // (misma información que ya ve la institución en el perfil individual),
  // sin ninguna consulta adicional — el portal nunca llama a Supabase directo.
  const rawDesercionesInstitucion = useMemo(() => {
    return (datos?.estudiantes || [])
      .filter(e => e.desercion)
      .map(e => ({ ...e.desercion, ...e, reportado_por: e.desercion.usuario?.nombre_completo || '' }));
  }, [datos]);

  const rawInasistenciasInstitucion = useMemo(() => {
    const filas = [];
    (datos?.estudiantes || []).forEach(e => {
      (e.inasistencias || []).forEach(i => {
        filas.push({
          ...i,
          ...e,
          fecha: i.registros_asistencia?.fecha || '',
          modulo: i.registros_asistencia?.modulo || '',
          docente_nombre: i.registros_asistencia?.docente_nombre || '',
          estado_seguimiento:
            i.estado_seguimiento === 'realizado' ? 'Realizado' :
            i.estado_seguimiento === 'justificado' ? 'Justificado' : 'Pendiente'
        });
      });
    });
    return filas;
  }, [datos]);

  const rawSeguimientosInstitucion = useMemo(() => {
    const filas = [];
    (datos?.estudiantes || []).forEach(e => {
      (e.seguimientos || []).forEach(seg => {
        filas.push({
          ...seg,
          ...e,
          tipo_gestion: limpiarEmojis(seg.tipo_gestion),
          causa_ausencia: limpiarEmojis(seg.causa_ausencia) || '',
          padrino_nombre: seg.padrino?.nombre_completo || 'N/A'
        });
      });
    });
    return filas;
  }, [datos]);

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    const estudiantes = datos?.estudiantes || [];
    return estudiantes
      .filter(e => e.nombre_completo.toLowerCase().includes(q) || e.documento?.includes(q))
      .slice(0, 8);
  }, [datos, busqueda]);

  const estudiantesDeGrupoActivo = useMemo(() => {
    if (tabActiva === TAB_RESUMEN) return [];
    let lista = (datos?.estudiantes || []).filter(e => e.grupo_id === tabActiva);
    if (busquedaGrupo.trim()) {
      const q = busquedaGrupo.toLowerCase();
      lista = lista.filter(e => e.nombre_completo.toLowerCase().includes(q) || e.documento?.includes(q));
    }
    return lista;
  }, [datos, tabActiva, busquedaGrupo]);

  const grupoActivoInfo = gruposOrdenados.find(g => g.id === tabActiva);
  const temaActivo = temaPorGrupo[tabActiva];

  function descargarExcel(lista, nombreArchivo) {
    exportarEstudiantesExcel(lista, nombreArchivo);
  }

  function irAEstudiante(est) {
    setBusqueda('');
    if (est.grupo_id) setTabActiva(est.grupo_id);
    setEstudianteSeleccionado(est);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">Este enlace no está disponible</h1>
          <p className="text-sm text-gray-500">
            Puede haber expirado o haber sido revocado. Contacta al Comité de Cafeteros para solicitar uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ENCABEZADO */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white text-xl font-bold">☕</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-800">{datos.institucion.nombre}</h1>
              <p className="text-sm text-gray-500">{datos.institucion.municipio} · La Universidad en el Campo</p>
            </div>
          </div>
        </div>
      </div>

      {/* BUSCADOR GLOBAL, siempre visible sin importar la pestaña activa */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3">
          <div className="relative max-w-md">
            <input
              ref={buscadorRef}
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar estudiante en toda la institución..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary transition"
            />
            {resultadosBusqueda.length > 0 && (
              <div className="absolute mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-30 animate-fade-in">
                {resultadosBusqueda.map(est => {
                  const tema = temaPorGrupo[est.grupo_id];
                  const grupoRef = gruposOrdenados.find(g => g.id === est.grupo_id);
                  const grupoNombre = grupoRef ? etiquetaGrupo(grupoRef) : undefined;
                  return (
                    <button
                      key={est.id}
                      onClick={() => irAEstudiante(est)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition flex items-center justify-between gap-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{est.nombre_completo}</p>
                        <p className="text-xs text-gray-500 truncate">{grupoNombre || 'Sin grupo'}</p>
                      </div>
                      {tema && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tema.dot}`}></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PESTAÑAS: Resumen + una por grupo, coloreadas para identificarlas al instante */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-thin">
            <button
              onClick={() => setTabActiva(TAB_RESUMEN)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                tabActiva === TAB_RESUMEN
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              📊 Resumen
            </button>
            <button
              onClick={() => setTabActiva(TAB_REPORTES)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                tabActiva === TAB_REPORTES
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              📑 Reportes
            </button>
            <button
              onClick={() => setTabActiva(TAB_HOMOLOGACION)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                tabActiva === TAB_HOMOLOGACION
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎓 Homologación
            </button>
            {pestanasPorUniversidad.map(([universidad, gruposUni], idxUni) => (
              <div key={universidad} className="flex items-center gap-1.5 flex-shrink-0">
                {variasUniversidadesEnPestanas && (
                  <span className={`flex items-center gap-1.5 flex-shrink-0 ${idxUni > 0 ? 'pl-1.5 ml-0.5 border-l border-gray-200' : ''}`}>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {ABREVIATURAS_UNIVERSIDAD[universidad] || universidad || 'Sin universidad'}
                    </span>
                  </span>
                )}
                {gruposUni.map(g => {
                  const tema = temaPorGrupo[g.id];
                  const activa = tabActiva === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setTabActiva(g.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition focus:outline-none focus-visible:ring-2 ${tema.anillo} ${
                        activa ? tema.activo : `${tema.bg} ${tema.border} ${tema.text} hover:brightness-95`
                      }`}
                      title={`${g.universidad} · ${g.programa} · Cohorte ${g.cohorte}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${activa ? 'bg-white' : tema.dot}`}></span>
                      {etiquetaGrupo(g)}
                      <span className={activa ? 'text-white/80' : 'text-gray-400'}>· {g.total_estudiantes_institucion}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div key={tabActiva} className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-in">
        {tabActiva === TAB_RESUMEN ? (
          <>
            <FiltrosReportes
              filtros={filtrosResumen}
              onCambio={setFiltrosResumen}
              opciones={opcionesResumen}
              filas={datos.estudiantes}
              getters={gettersInstitucion}
              mostrarFecha={false}
              mostrarEstado
            />
            <VistaResumen
              kpis={kpis}
              estudiantes={estudiantesFiltradosResumen}
              gruposOrdenados={gruposOrdenados}
              temaPorGrupo={temaPorGrupo}
              estadisticasPorGrupo={estadisticasPorGrupo}
              onIrAGrupo={setTabActiva}
              onDescargarTodo={() => descargarExcel(estudiantesFiltradosResumen, datos.institucion.nombre)}
            />
          </>
        ) : tabActiva === TAB_REPORTES ? (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">📑 Reportes Descargables</h2>
            <p className="text-gray-600 mb-6 text-sm">Descarga en Excel la información de {datos.institucion.nombre}</p>
            <ReportesPanel
              rawEstudiantes={datos.estudiantes}
              rawDeserciones={rawDesercionesInstitucion}
              rawInasistencias={rawInasistenciasInstitucion}
              rawSeguimientos={rawSeguimientosInstitucion}
              grupos={gruposEtiquetados}
              prefijoArchivo={datos.institucion.nombre}
            />
          </div>
        ) : tabActiva === TAB_HOMOLOGACION ? (
          <VistaHomologacion token={token} />
        ) : (
          <VistaGrupo
            grupo={grupoActivoInfo}
            tema={temaActivo}
            estudiantes={estudiantesDeGrupoActivo}
            busqueda={busquedaGrupo}
            setBusqueda={setBusquedaGrupo}
            onVerPerfil={setEstudianteSeleccionado}
            onDescargar={() => descargarExcel(estudiantesDeGrupoActivo, `${datos.institucion.nombre}_${grupoActivoInfo?.nombre}`)}
          />
        )}

        <p className="text-xs text-gray-400 text-center">
          Portal de solo lectura · Comité de Cafeteros de Caldas
        </p>
      </div>

      <PerfilEstudiantePortal
        estudiante={estudianteSeleccionado}
        tema={estudianteSeleccionado ? temaPorGrupo[estudianteSeleccionado.grupo_id] : null}
        onClose={() => setEstudianteSeleccionado(null)}
      />
    </div>
  );
}

// =============================================
// PESTAÑA: RESUMEN GENERAL
// =============================================
function VistaResumen({ kpis, estudiantes, gruposOrdenados, temaPorGrupo, estadisticasPorGrupo, onIrAGrupo, onDescargarTodo }) {
  // Una institución puede tener estudiantes en varias universidades a la vez;
  // cuando es así, agrupar por universidad orienta mucho más que una grilla plana.
  const gruposPorUniversidad = useMemo(() => {
    const mapa = new Map();
    gruposOrdenados.forEach(g => {
      const clave = g.universidad || 'Sin universidad';
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(g);
    });
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [gruposOrdenados]);
  const variasUniversidades = gruposPorUniversidad.length > 1;

  const segmentos = [
    { valor: kpis.activos, color: 'bg-green-500', label: 'Activos' },
    { valor: kpis.enRiesgo, color: 'bg-amber-400', label: 'En Riesgo' },
    { valor: kpis.desertores, color: 'bg-red-500', label: 'Desertores' },
    { valor: kpis.graduados, color: 'bg-blue-500', label: 'Graduados' },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm hover:shadow-md transition">
          <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200 shadow-sm hover:shadow-md transition">
          <p className="text-2xl font-bold text-green-700">{kpis.activos}</p>
          <p className="text-xs text-green-600">Activos</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200 shadow-sm hover:shadow-md transition">
          <p className="text-2xl font-bold text-amber-700">{kpis.enRiesgo}</p>
          <p className="text-xs text-amber-600">En Riesgo</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200 shadow-sm hover:shadow-md transition">
          <p className="text-2xl font-bold text-red-700">{kpis.desertores}</p>
          <p className="text-xs text-red-600">Desertores</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200 shadow-sm hover:shadow-md transition">
          <p className="text-2xl font-bold text-blue-700">{kpis.graduados}</p>
          <p className="text-xs text-blue-600">Graduados</p>
        </div>
      </div>

      {/* Barra de composición */}
      {kpis.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
            {segmentos.filter(s => s.valor > 0).map(s => (
              <div key={s.label} className={s.color} style={{ width: `${(s.valor / kpis.total) * 100}%` }} title={`${s.label}: ${s.valor}`}></div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {segmentos.map(s => (
              <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${s.color}`}></span>
                {s.label} · {s.valor}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tarjetas de grupo, coloreadas para identificarlas de un vistazo */}
      {gruposOrdenados.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">📚 Grupos de esta institución</h2>
            <button
              onClick={onDescargarTodo}
              className="bg-primary hover:bg-primary-dark text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition shadow-sm"
            >
              📥 Descargar todo (Excel)
            </button>
          </div>
          {variasUniversidades ? (
            <div className="space-y-5">
              {gruposPorUniversidad.map(([universidad, gruposUni]) => (
                <div key={universidad}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    🎓 {ABREVIATURAS_UNIVERSIDAD[universidad] || universidad}
                    <span className="text-gray-400 font-normal normal-case">· {gruposUni.length} grupo{gruposUni.length !== 1 ? 's' : ''}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {gruposUni.map(g => (
                      <TarjetaGrupo
                        key={g.id}
                        g={g}
                        tema={temaPorGrupo[g.id]}
                        stats={estadisticasPorGrupo[g.id] || { total: 0, activos: 0, enRiesgo: 0, desertores: 0 }}
                        onIrAGrupo={onIrAGrupo}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gruposOrdenados.map(g => (
                <TarjetaGrupo
                  key={g.id}
                  g={g}
                  tema={temaPorGrupo[g.id]}
                  stats={estadisticasPorGrupo[g.id] || { total: 0, activos: 0, enRiesgo: 0, desertores: 0 }}
                  onIrAGrupo={onIrAGrupo}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estadísticas, al estilo del Panel de Estadísticas del administrador */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoDoughnutPortal
          titulo="📊 Estudiantes por Estado"
          detalles={[
            { etiqueta: 'Activo', total: kpis.activos, color: '#10b981', icono: '✅' },
            { etiqueta: 'En Riesgo', total: kpis.enRiesgo, color: '#f59e0b', icono: '⚠️' },
            { etiqueta: 'Desertor', total: kpis.desertores, color: '#ef4444', icono: '🚨' },
            { etiqueta: 'Graduado', total: kpis.graduados, color: '#3b82f6', icono: '🎓' },
          ].filter(d => d.total > 0)}
        />
        <GraficoGeneroPortal estudiantes={estudiantes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoBarrasPortal
          titulo="📚 Estudiantes por Grupo"
          datos={gruposOrdenados.map(g => ({ nombre: etiquetaGrupo(g), total: (estadisticasPorGrupo[g.id] || {}).total || 0 }))}
        />
        <GraficoCausasInasistenciaPortal estudiantes={estudiantes} />
      </div>

      <ComparativoCohortesPortal estudiantes={estudiantes} />

      {kpis.desertores > 0 && <GraficoMotivosDesercionPortal estudiantes={estudiantes} />}
    </div>
  );
}

// =============================================
// GRÁFICOS DE LA PESTAÑA RESUMEN (estilo del Panel de Estadísticas)
// =============================================

function GraficoDoughnutPortal({ titulo, detalles }) {
  const total = detalles.reduce((s, d) => s + d.total, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">{titulo}</h3>
        <p className="text-gray-500 text-center py-8 text-sm">No hay datos disponibles</p>
      </div>
    );
  }

  const datos = {
    labels: detalles.map(d => d.etiqueta),
    datasets: [{ data: detalles.map(d => d.total), backgroundColor: detalles.map(d => d.color), borderWidth: 0, borderRadius: 8 }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = detalles[ctx.dataIndex];
            const pct = Math.round((d.total / total) * 1000) / 10;
            return `${d.etiqueta}: ${d.total} (${pct}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">{titulo}</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} estudiantes</p>
      <div className="h-48">
        <Doughnut data={datos} options={options} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {detalles.map(d => {
          const pct = Math.round((d.total / total) * 1000) / 10;
          return (
            <div key={d.etiqueta} className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium shadow-sm"
              style={{ backgroundColor: d.color + '20', color: d.color, border: `1px solid ${d.color}40` }}>
              <span className="mr-2">{d.icono}</span>
              <span>{d.etiqueta}</span>
              <span className="ml-2 font-bold">{d.total}</span>
              <span className="ml-1 text-xs opacity-75">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GraficoGeneroPortal({ estudiantes }) {
  const colores = { 'Masculino': '#3b82f6', 'Femenino': '#ec4899', 'Otro': '#8b5cf6', 'Prefiero no decir': '#6b7280', 'No especificado': '#9ca3af' };
  const iconos = { 'Masculino': '👨', 'Femenino': '👩', 'Otro': '👤', 'Prefiero no decir': '⚪', 'No especificado': '❓' };

  const conteo = {};
  estudiantes.forEach(e => { const g = e.genero || 'No especificado'; conteo[g] = (conteo[g] || 0) + 1; });
  const detalles = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .map(([genero, total]) => ({ etiqueta: genero, total, color: colores[genero] || '#6b7280', icono: iconos[genero] || '👤' }));

  return <GraficoDoughnutPortal titulo="👥 Estudiantes por Género" detalles={detalles} />;
}

function GraficoBarrasPortal({ titulo, datos }) {
  const ordenados = [...datos].sort((a, b) => b.total - a.total);
  const total = ordenados.reduce((s, d) => s + d.total, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">{titulo}</h3>
        <p className="text-gray-500 text-center py-8 text-sm">No hay datos disponibles</p>
      </div>
    );
  }

  const chartData = {
    labels: ordenados.map(d => d.nombre),
    datasets: [{ label: 'Estudiantes', data: ordenados.map(d => d.total), backgroundColor: '#3b82f6', borderRadius: 8, barPercentage: 0.7, categoryPercentage: 0.8 }]
  };
  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.raw} estudiantes (${Math.round((ctx.raw / total) * 1000) / 10}%)` } }
    },
    scales: {
      x: { beginAtZero: true, grid: { display: false }, ticks: { precision: 0 } },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          callback: (value) => {
            const label = chartData.labels[value];
            return label && label.length > 22 ? label.substring(0, 22) + '...' : label;
          }
        }
      }
    },
    layout: { padding: { left: 4 } }
  };
  const altura = Math.min(400, Math.max(180, ordenados.length * 40));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">{titulo}</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} estudiantes</p>
      <div style={{ height: `${altura}px` }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

function GraficoCausasInasistenciaPortal({ estudiantes }) {
  const colores = ['#f97316', '#ef4444', '#eab308', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#6366f1'];
  const conteo = {};
  estudiantes.forEach(est => {
    (est.seguimientos || []).forEach(s => {
      if (!s.causa_ausencia || s.tipo_seguimiento === 'rendimiento_academico') return;
      const causa = limpiarEmojis(s.causa_ausencia) || 'Sin especificar';
      conteo[causa] = (conteo[causa] || 0) + 1;
    });
  });
  const detalles = Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .map(([causa, total], idx) => ({ etiqueta: causa, total, color: colores[idx % colores.length], icono: '' }));

  return <GraficoDoughnutPortal titulo="🔍 Causas de Inasistencia" detalles={detalles} />;
}

function ComparativoCohortesPortal({ estudiantes }) {
  const cohortesMap = new Map();
  estudiantes.forEach(e => {
    if (!e.cohorte) return;
    if (!cohortesMap.has(e.cohorte)) cohortesMap.set(e.cohorte, { cohorte: e.cohorte, total: 0, desertores: 0, graduados: 0 });
    const c = cohortesMap.get(e.cohorte);
    c.total++;
    if (e.estado === 'Desertor') c.desertores++;
    if (e.estado === 'Graduado') c.graduados++;
  });
  const datos = Array.from(cohortesMap.values())
    .map(c => ({
      ...c,
      desercion_pct: c.total > 0 ? Math.round((c.desertores / c.total) * 100) : 0,
      graduacion_pct: c.total > 0 ? Math.round((c.graduados / c.total) * 100) : 0
    }))
    .sort((a, b) => a.cohorte.localeCompare(b.cohorte));

  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">📅 Comparativo Inter-Cohorte</h3>
        <p className="text-gray-500 text-center py-8 text-sm">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">📅 Comparativo Inter-Cohorte</h3>
      <p className="text-sm text-gray-500 mb-4">Indicadores clave por cohorte</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Indicador</th>
              {datos.map(d => (
                <th key={d.cohorte} className="text-center py-3 px-2 font-semibold text-gray-700">{d.cohorte}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">👥 Total Estudiantes</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-gray-800">{d.total}</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">🚨 Deserción</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-red-600">{d.desercion_pct}%</span>
                  <span className="block text-xs text-red-400">{d.desertores} est.</span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">🎓 Graduación</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-blue-600">{d.graduacion_pct}%</span>
                  <span className="block text-xs text-blue-400">{d.graduados} est.</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GraficoMotivosDesercionPortal({ estudiantes }) {
  const conteo = {};
  estudiantes.forEach(est => {
    if (est.estado !== 'Desertor') return;
    const motivo = est.desercion?.motivo_principal || 'Sin especificar';
    conteo[motivo] = (conteo[motivo] || 0) + 1;
  });
  const datos = Object.entries(conteo).map(([nombre, total]) => ({ nombre, total }));

  return <GraficoBarrasPortal titulo="🚨 Motivos de Deserción" datos={datos} />;
}

// =============================================
// PESTAÑA: DETALLE DE UN GRUPO
// =============================================
function VistaGrupo({ grupo, tema, estudiantes, busqueda, setBusqueda, onVerPerfil, onDescargar }) {
  const [subTab, setSubTab] = useState('estudiantes');

  if (!grupo || !tema) return null;

  const notasModulos = grupo.notas_modulos || [];
  const registrosAsistencia = grupo.registros_asistencia || [];
  const cronograma = grupo.cronograma || [];

  function descargarSubTabActual() {
    if (subTab === 'notas') {
      const modulosConEstudiantes = notasModulos.map(nm => ({
        ...nm,
        notas_estudiantes: estudiantes
          .map(est => {
            const ne = (est.notas || []).find(n => n.nota_modulo_id === nm.id);
            return ne ? { estudiante_id: est.id, estudiante: { nombre_completo: est.nombre_completo }, nota: ne.nota, observaciones: ne.observaciones } : null;
          })
          .filter(Boolean)
      }));
      exportarNotasGrupoExcel(modulosConEstudiantes, grupo.nombre);
    } else if (subTab === 'asistencia') {
      exportarAsistenciaGrupoExcel(registrosAsistencia, estudiantes, grupo.nombre);
    } else {
      onDescargar();
    }
  }

  const subTabs = [
    { id: 'estudiantes', label: '👥 Estudiantes' },
    { id: 'notas', label: '🎓 Notas del Grupo' },
    { id: 'asistencia', label: '📅 Asistencia del Grupo' },
    { id: 'cronograma', label: '🗓️ Cronograma de Clases' },
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado del grupo, coloreado con el tema del grupo */}
      <div className={`rounded-xl bg-gradient-to-r ${tema.gradiente} p-5 shadow-sm`}>
        <p className={`text-lg font-bold leading-tight ${tema.text}`}>{etiquetaGrupo(grupo)}</p>
        <div className={`flex flex-wrap items-center gap-2 mt-2 text-sm ${tema.text}`}>
          <span className="bg-white/60 px-2.5 py-1 rounded-full">{grupo.total_estudiantes_institucion} estudiante{grupo.total_estudiantes_institucion !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Sub-pestañas: estudiantes / notas del grupo / asistencia del grupo */}
      <div className="flex gap-1.5 overflow-x-auto">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-shrink-0 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition focus:outline-none focus-visible:ring-2 ${tema.anillo} ${
              subTab === t.id ? tema.activo : `bg-white ${tema.border} text-gray-500 hover:bg-gray-50`
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Buscador local + descarga (aplica a la sub-pestaña activa; el cronograma no tiene ninguna de las dos) */}
      {subTab !== 'cronograma' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar en este grupo..."
            className={`border ${tema.border} rounded-lg px-4 py-2.5 text-sm flex-1 min-w-[200px] max-w-md bg-white focus:outline-none focus-visible:ring-2 ${tema.anillo}`}
          />
          <button
            onClick={descargarSubTabActual}
            disabled={estudiantes.length === 0}
            className={`${tema.solido} text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 hover:brightness-95`}
          >
            📥 {subTab === 'notas' ? 'Descargar notas del grupo' : subTab === 'asistencia' ? 'Descargar asistencia del grupo' : 'Descargar Excel del grupo'}
          </button>
        </div>
      )}

      {subTab === 'notas' ? (
        <TablaNotasGrupo tema={tema} estudiantes={estudiantes} notasModulos={notasModulos} />
      ) : subTab === 'asistencia' ? (
        <TablaAsistenciaGrupo tema={tema} estudiantes={estudiantes} registros={registrosAsistencia} />
      ) : subTab === 'cronograma' ? (
        <TablaCronogramaGrupo tema={tema} cronograma={cronograma} registrosAsistencia={registrosAsistencia} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {estudiantes.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">No hay estudiantes que coincidan</p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Estudiante</th>
                      <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Contacto</th>
                      <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Estado</th>
                      <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Faltas</th>
                      <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm">Notas</th>
                      <th className="text-left py-3.5 px-4 text-gray-600 font-semibold text-sm"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map(est => (
                      <tr key={est.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full ${tema.bg} ${tema.text} border ${tema.border} flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
                              {iniciales(est.nombre_completo)}
                            </span>
                            <div>
                              <p className="font-medium text-gray-800">{est.nombre_completo}</p>
                              <p className="text-xs text-gray-500">{est.documento || 'Sin documento'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-sm text-gray-700">{est.telefono || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{est.correo || 'Sin correo'}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getEstadoColor(est.estado)}`}>
                            {est.estado || 'Activo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${est.total_inasistencias > 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                            {est.total_inasistencias || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`font-semibold text-sm ${est.promedio_notas !== null && est.promedio_notas < 3 ? 'text-red-500' : 'text-gray-700'}`}>
                            {est.promedio_notas ?? '–'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => onVerPerfil(est)}
                            className={`${tema.solido} hover:brightness-95 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition`}
                            title="Ver perfil completo"
                          >
                            👤
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Móvil */}
              <div className="lg:hidden divide-y divide-gray-100">
                {estudiantes.map(est => (
                  <div
                    key={est.id}
                    onClick={() => onVerPerfil(est)}
                    className="p-4 cursor-pointer active:bg-gray-50 flex items-center gap-3"
                  >
                    <span className={`w-9 h-9 rounded-full ${tema.bg} ${tema.text} border ${tema.border} flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
                      {iniciales(est.nombre_completo)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{est.nombre_completo}</p>
                      <p className="text-xs text-gray-400 mb-1.5">{est.documento || 'Sin documento'}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(est.estado)}`}>
                          {est.estado || 'Activo'}
                        </span>
                        <span className="text-xs text-gray-500">{est.total_inasistencias || 0} falta(s)</span>
                      </div>
                    </div>
                    <span className="text-gray-400 text-xl flex-shrink-0">›</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// TABLA: NOTAS DEL GRUPO (matriz estudiante × módulo)
// =============================================
function TablaNotasGrupo({ tema, estudiantes, notasModulos }) {
  if (notasModulos.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-sm text-gray-500">
        Este grupo aún no tiene módulos evaluados
      </div>
    );
  }
  if (estudiantes.length === 0) {
    return <p className="text-center text-gray-500 py-10 text-sm bg-white rounded-lg border border-gray-200">No hay estudiantes que coincidan</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className={`sticky left-0 z-10 bg-gray-50 text-left py-3 px-4 font-semibold text-gray-600 min-w-[180px] border-r ${tema.border}`}>Estudiante</th>
            {notasModulos.map(nm => (
              <th key={nm.id} className="py-3 px-3 font-semibold text-gray-600 min-w-[110px] text-center whitespace-nowrap">
                <p className="truncate max-w-[110px]" title={nm.modulo}>{nm.modulo}</p>
                <p className="text-xs font-normal text-gray-400">{formatearFecha(nm.fecha_evaluacion)}</p>
              </th>
            ))}
            <th className="py-3 px-3 font-semibold text-gray-600 min-w-[90px] text-center">Promedio</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map(est => {
            const notasEnEsteGrupo = notasModulos
              .map(nm => (est.notas || []).find(n => n.nota_modulo_id === nm.id)?.nota)
              .filter(n => n !== null && n !== undefined);
            const promedio = notasEnEsteGrupo.length > 0
              ? (notasEnEsteGrupo.reduce((s, n) => s + Number(n), 0) / notasEnEsteGrupo.length)
              : null;
            return (
              <tr key={est.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className={`sticky left-0 z-10 bg-white py-2.5 px-4 font-medium text-gray-800 border-r ${tema.border} whitespace-nowrap`}>
                  {est.nombre_completo}
                </td>
                {notasModulos.map(nm => {
                  const nota = (est.notas || []).find(n => n.nota_modulo_id === nm.id)?.nota;
                  return (
                    <td key={nm.id} className="py-2.5 px-3 text-center">
                      {nota !== null && nota !== undefined ? (
                        <span className={`font-semibold ${nota >= 3 ? 'text-green-600' : 'text-red-500'}`}>{Number(nota).toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-center">
                  {promedio !== null ? (
                    <span className={`font-bold ${promedio >= 3 ? 'text-green-600' : 'text-red-500'}`}>{promedio.toFixed(1)}</span>
                  ) : (
                    <span className="text-gray-300">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// TABLA: ASISTENCIA DEL GRUPO (matriz estudiante × sesión)
// =============================================
function TablaAsistenciaGrupo({ tema, estudiantes, registros }) {
  if (registros.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-sm text-gray-500">
        Este grupo aún no tiene sesiones de asistencia reportadas
      </div>
    );
  }
  if (estudiantes.length === 0) {
    return <p className="text-center text-gray-500 py-10 text-sm bg-white rounded-lg border border-gray-200">No hay estudiantes que coincidan</p>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className={`sticky left-0 z-10 bg-gray-50 text-left py-3 px-4 font-semibold text-gray-600 min-w-[180px] border-r ${tema.border}`}>Estudiante</th>
            {registros.map(r => (
              <th key={r.id} className="py-3 px-2 font-semibold text-gray-600 min-w-[90px] text-center whitespace-nowrap">
                <p>{formatearFecha(r.fecha)}</p>
                <p className="text-xs font-normal text-gray-400 truncate max-w-[90px]" title={r.modulo}>{r.modulo || 'N/A'}</p>
              </th>
            ))}
            <th className="py-3 px-3 font-semibold text-gray-600 min-w-[90px] text-center">Faltas</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map(est => {
            const registroIdsAusente = new Set((est.inasistencias || []).map(i => i.registro_id));
            const faltasEnEsteGrupo = registros.filter(r => registroIdsAusente.has(r.id)).length;
            return (
              <tr key={est.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className={`sticky left-0 z-10 bg-white py-2.5 px-4 font-medium text-gray-800 border-r ${tema.border} whitespace-nowrap`}>
                  {est.nombre_completo}
                </td>
                {registros.map(r => {
                  const inasistencia = (est.inasistencias || []).find(i => i.registro_id === r.id);
                  if (!inasistencia) {
                    return (
                      <td key={r.id} className="py-2.5 px-2 text-center">
                        <span className="text-green-600" title="Asistió">✅</span>
                      </td>
                    );
                  }
                  const estado = inasistencia.estado_seguimiento;
                  const titulo = estado === 'realizado' ? 'No asistió · seguimiento hecho' : estado === 'justificado' ? 'No asistió · justificado' : 'No asistió · pendiente';
                  return (
                    <td key={r.id} className="py-2.5 px-2 text-center">
                      <span className="text-red-500" title={titulo}>❌</span>
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-center">
                  <span className={`font-semibold ${faltasEnEsteGrupo > 3 ? 'text-red-600' : 'text-gray-600'}`}>{faltasEnEsteGrupo}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TablaCronogramaGrupo({ tema, cronograma, registrosAsistencia }) {
  if (cronograma.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-sm text-gray-500">
        Este grupo aún no tiene cronograma de clases cargado
      </div>
    );
  }

  const filas = cruzarCronogramaConAsistencia(cronograma, registrosAsistencia);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`bg-gray-50 border-b ${tema.border}`}>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Fecha</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Módulo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Docente</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-600">Teléfono de contacto</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-600">Clase Vista</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(c => (
            <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2.5 px-4 font-medium text-gray-800 whitespace-nowrap align-top">{formatearFecha(c.fecha)}</td>
              <td className="py-2.5 px-4 text-gray-700 align-top">
                {c.moduloEfectivo || '—'}
                {c.huboAjuste && <p className="text-[11px] text-blue-500 mt-0.5">🕘 Programado: {c.moduloOriginal || '—'}</p>}
              </td>
              <td className="py-2.5 px-4 text-gray-700 align-top">
                {c.docenteEfectivo || '—'}
                {c.huboAjuste && c.docenteOriginal && normalizarTexto(c.docenteEfectivo) !== normalizarTexto(c.docenteOriginal) && (
                  <p className="text-[11px] text-blue-500 mt-0.5">🕘 Programado: {c.docenteOriginal}</p>
                )}
              </td>
              <td className="py-2.5 px-4 text-gray-700 align-top">{c.telefonoEfectivo || '—'}</td>
              <td className="py-2.5 px-4 text-center align-top">
                {c.estado === 'confirmada' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary-dark px-2.5 py-1 rounded-full">
                    ✅ Vista
                  </span>
                ) : c.estado === 'pendiente' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    ⏳ Pendiente
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                    📅 Próxima
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// MODAL: PERFIL DEL ESTUDIANTE (SOLO LECTURA)
// =============================================
// Réplica de ModalPerfilEstudiante sin ninguna acción de edición/gestión —
// los datos ya vienen resueltos desde la Edge Function, no se consulta
// Supabase directamente.
function PerfilEstudiantePortal({ estudiante, tema, onClose }) {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  if (!estudiante) return null;

  const seguimientos = estudiante.seguimientos || [];
  const notas = estudiante.notas || [];
  const inasistencias = estudiante.inasistencias || [];
  const traslados = estudiante.traslados || [];
  const multas = estudiante.multas || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className={`p-4 sm:p-6 border-b border-gray-200 rounded-t-xl sticky top-0 z-10 ${tema ? `bg-gradient-to-r ${tema.gradiente}` : 'bg-warm-light'}`}>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className={`text-xl sm:text-2xl font-bold leading-tight ${tema ? tema.text : 'text-gray-800'}`}>
                {estudiante.nombre_completo}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(estudiante.estado)}`}>
                  {estudiante.estado || 'Activo'}
                </span>
                <span className={`text-sm ${tema ? tema.text : 'text-gray-600'}`}>📋 {estudiante.documento || 'Sin documento'}</span>
              </div>
            </div>
            <button onClick={onClose} className={`text-2xl w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0 ${tema ? `${tema.text} hover:bg-white/50` : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* CONTACTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2 text-xl">📱</span> Contacto del Estudiante
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <p><strong>Teléfono:</strong> {estudiante.telefono || 'No registrado'}</p>
                  {estudiante.telefono && <BotonWhatsApp telefono={estudiante.telefono} size="sm" />}
                </div>
                <p><strong>Correo:</strong> {estudiante.correo || 'No registrado'}</p>
                <p><strong>Municipio:</strong> {estudiante.municipio}</p>
                <p><strong>Institución:</strong> {estudiante.institucion_educativa}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2 text-xl">👨‍👩‍👧</span> Datos del Acudiente
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Nombre:</strong> {estudiante.acudiente_nombre || 'No registrado'}</p>
                <div className="flex items-center justify-between">
                  <p><strong>Teléfono:</strong> {estudiante.acudiente_telefono || 'No registrado'}</p>
                  {estudiante.acudiente_telefono && <BotonWhatsApp telefono={estudiante.acudiente_telefono} size="sm" className="bg-blue-500 hover:bg-blue-600" />}
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{inasistencias.length}</p>
              <p className="text-xs text-blue-600">Faltas Acumuladas</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
              <p className="text-2xl font-bold text-green-700">{seguimientos.length}</p>
              <p className="text-xs text-green-600">Seguimientos</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">
                {seguimientos.length > 0 ? formatearFecha(seguimientos[0].fecha_contacto, 'corta-con-año') : 'N/A'}
              </p>
              <p className="text-xs text-purple-600">Último Contacto</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
              <p className="text-2xl font-bold text-amber-700">{estudiante.cohorte}</p>
              <p className="text-xs text-amber-600">Cohorte</p>
            </div>
          </div>

          {/* INFORMACIÓN ACADÉMICA */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 mb-6 border border-primary/20">
            <h3 className="font-semibold text-primary-dark mb-3">📚 Información Académica</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Universidad:</strong> {estudiante.universidad}</p>
              <p><strong>Programa:</strong> {estudiante.programa}</p>
              <p><strong>Cohorte:</strong> {estudiante.cohorte}</p>
            </div>
          </div>

          {/* TRASLADOS */}
          {traslados.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2 text-xl">🔄</span> Traslados de Grupo
              </h3>
              <div className="space-y-2">
                {traslados.map(t => (
                  <div key={t.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-700">{t.grupo_origen ? etiquetaGrupo(t.grupo_origen) : 'Sin grupo'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-700">{t.grupo_destino ? etiquetaGrupo(t.grupo_destino) : 'N/A'}</span>
                      <span className="text-xs text-gray-400 ml-auto">{formatearFecha(t.fecha_traslado)}</span>
                    </div>
                    {t.motivo && <p className="text-xs text-gray-500 mt-1">📝 {t.motivo}</p>}
                    <p className="text-xs text-gray-400 mt-1">👤 Registrado por: {t.usuario?.nombre_completo || 'Sistema'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DESERCIÓN */}
          {estudiante.estado === 'Desertor' && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 mb-6 border border-red-200">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="mr-2 text-xl">🚨</span> Información de Deserción
              </h3>
              {estudiante.desercion ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <p><strong>Tipo:</strong> {estudiante.desercion.tipo_desercion}</p>
                    <p><strong>Fecha de reporte:</strong> {formatearFecha(estudiante.desercion.fecha_reporte)}</p>
                    <p><strong>Motivo principal:</strong> {estudiante.desercion.motivo_principal}</p>
                    <p><strong>Reportado por:</strong> {estudiante.desercion.usuario?.nombre_completo || 'Sistema'}</p>
                  </div>
                  {estudiante.desercion.observaciones && (
                    <div className="bg-white p-3 rounded-lg text-sm"><strong>Observaciones:</strong> {estudiante.desercion.observaciones}</div>
                  )}
                  {estudiante.desercion.documentos?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium text-sm mb-2">📎 Documentos adjuntos:</p>
                      <div className="space-y-2">
                        {estudiante.desercion.documentos.map(doc => {
                          const tipoDoc = TIPOS_DOCUMENTO_DESERCION.find(t => t.value === doc.tipo_documento);
                          return (
                            <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                              <span className="text-sm">{tipoDoc ? `${tipoDoc.icon} ${tipoDoc.label}` : `📎 ${doc.tipo_documento}`}</span>
                              <a href={doc.url_archivo} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark text-sm font-medium">Ver →</a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No se encontraron registros de deserción</p>
              )}
              {multas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-100">
                  <p className="font-medium text-sm text-gray-700 mb-2">💰 Multas</p>
                  <div className="space-y-1.5">
                    {multas.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg">
                        <span>${Number(m.valor_total).toLocaleString('es-CO')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.estado === 'pagado' ? 'bg-green-100 text-green-700' :
                          m.estado === 'condonado' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {m.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NOTAS ACADÉMICAS */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
              <span className="flex items-center"><span className="mr-2 text-xl">🎓</span> Notas Académicas</span>
              {notas.length > 0 && (
                <button
                  onClick={() => exportarNotasEstudianteExcel(notas, estudiante.nombre_completo)}
                  className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
                >
                  <span>📥</span><span>Descargar Historial Académico</span>
                </button>
              )}
            </h3>

            {notas.length === 0 ? (
              <div className="text-center py-5 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-400 text-sm">Aún no hay notas registradas para este estudiante</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Módulo</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">Fecha</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">Nota</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notas.map(ne => (
                      <tr key={ne.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{ne.notas_modulos?.modulo || 'N/A'}</td>
                        <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{formatearFecha(ne.notas_modulos?.fecha_evaluacion)}</td>
                        <td className="px-4 py-2.5 text-center">
                          {ne.nota !== null && ne.nota !== undefined ? (
                            <span className={`font-bold text-base ${ne.nota >= 3 ? 'text-green-600' : 'text-red-500'}`}>{Number(ne.nota).toFixed(1)}</span>
                          ) : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {ne.nota !== null && ne.nota !== undefined ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ne.nota >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {ne.nota >= 3 ? 'Aprobado' : 'Reprobado'}
                            </span>
                          ) : <span className="text-gray-400 text-xs">Sin nota</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* INASISTENCIAS */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
              <span className="flex items-center"><span className="mr-2 text-xl">⚠️</span> Histórico de Inasistencias</span>
              {inasistencias.length > 0 && (
                <button
                  onClick={() => exportarInasistenciasExcel(
                    inasistencias.map(i => ({ ...i, grupo_nombre: i.registros_asistencia?.grupos ? etiquetaGrupo(i.registros_asistencia.grupos) : 'N/A' })),
                    estudiante.nombre_completo
                  )}
                  className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
                >
                  <span>📥</span><span>Descargar Inasistencias</span>
                </button>
              )}
            </h3>

            {inasistencias.length === 0 ? (
              <div className="text-center py-5 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-400 text-sm">Este estudiante no registra inasistencias</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Fecha</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Módulo</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Grupo</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Docente</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inasistencias.map(ina => {
                      const ra = ina.registros_asistencia;
                      const estado = ina.estado_seguimiento;
                      const estadoColor =
                        estado === 'realizado' ? 'text-green-600 bg-green-50' :
                        estado === 'justificado' ? 'text-blue-600 bg-blue-50' :
                        'text-amber-600 bg-amber-50';
                      return (
                        <tr key={ina.id} className="hover:bg-gray-50 align-top">
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatearFecha(ra?.fecha)}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{ra?.modulo || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-gray-600">{ra?.grupos ? etiquetaGrupo(ra.grupos) : 'N/A'}</td>
                          <td className="px-4 py-2.5 text-gray-600">{ra?.docente_nombre || 'N/A'}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColor}`}>
                              {estado === 'realizado' ? '✅ Seguimiento hecho' : estado === 'justificado' ? '📋 Justificado' : '⏳ Pendiente'}
                            </span>
                            {ina.observacion_docente && <p className="mt-1 text-xs text-gray-400 italic">💬 {ina.observacion_docente}</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SEGUIMIENTOS */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
              <span className="flex items-center"><span className="mr-2 text-xl">📋</span> Historial de Seguimientos</span>
              {seguimientos.length > 0 && (
                <button
                  onClick={() => exportarSeguimientosExcel(seguimientos, estudiante.nombre_completo)}
                  className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
                >
                  <span>📥</span><span>Descargar Reporte</span>
                </button>
              )}
            </h3>

            {seguimientos.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">Aún no hay seguimientos registrados</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-primary/10"></div>
                <div className="space-y-4">
                  {seguimientos.map((seg, index) => (
                    <div key={seg.id} className="relative flex items-start pl-12">
                      <div className={`absolute left-4 w-4 h-4 rounded-full border-2 border-white shadow ${index === 0 ? 'bg-primary ring-2 ring-primary/20' : 'bg-gray-300'}`}></div>
                      <div className="bg-gray-50 rounded-xl p-4 flex-1 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-800">{seg.tipo_gestion}</span>
                            {seg.tipo_seguimiento === 'rendimiento_academico' && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">📚 Rendimiento Académico</span>}
                            {seg.causa_ausencia && <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">{seg.causa_ausencia}</span>}
                          </div>
                          <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">{formatearFecha(seg.fecha_contacto)}</span>
                        </div>
                        <p className="text-gray-700 text-sm mb-3 bg-white p-3 rounded-lg">{seg.resultado}</p>
                        {seg.evidencias?.length > 0 && (
                          <div className="mt-3 mb-3">
                            <p className="text-xs font-medium text-gray-600 mb-2">📸 Evidencias:</p>
                            <div className="flex flex-wrap gap-2">
                              {seg.evidencias.map((url, idx) => (
                                <button key={idx} onClick={() => setImagenSeleccionada(url)}
                                  className="block w-16 h-16 rounded-lg border border-gray-200 overflow-hidden hover:border-primary transition cursor-pointer">
                                  <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 flex items-center mt-3">
                          <span className="mr-1">👤</span> Registrado por: {seg.padrino?.nombre_completo || 'Sistema'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>

      {imagenSeleccionada && (
        <VisorImagen url={imagenSeleccionada} onClose={() => setImagenSeleccionada(null)} />
      )}
    </div>
  );
}

// =============================================
// VISTA: HOMOLOGACIÓN (RECONOCIMIENTO DE APRENDIZAJES)
// =============================================
// Única sección de este portal donde la institución escribe datos. Por eso
// no usa `portal-institucion` (solo-lectura) sino la función separada
// `portal-homologacion`, que valida el mismo token con service_role.
function VistaHomologacion({ token }) {
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState(null);
  const [guardandoClave, setGuardandoClave] = useState(null);
  const [subiendoCertificado, setSubiendoCertificado] = useState(false);

  useEffect(() => { cargar(); }, [token]);

  async function llamar(body) {
    const res = await fetch(FUNCIONES_HOMOLOGACION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(import.meta.env.VITE_SUPABASE_ANON_KEY ? { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } : {})
      },
      body: JSON.stringify({ token, ...body })
    });
    return res.json();
  }

  async function cargar() {
    setCargando(true);
    const data = await llamar({ accion: 'listar' });
    setDatos(data);
    setCargando(false);
  }

  async function guardarNota(malla_item_id, estudiante_id, valorTexto) {
    const nota = valorTexto === '' ? null : Number(valorTexto);
    if (nota !== null && (Number.isNaN(nota) || nota < 0 || nota > 5)) return;
    const clave = `${malla_item_id}::${estudiante_id}`;
    setGuardandoClave(clave);
    setDatos(prev => ({
      ...prev,
      estudiantes: prev.estudiantes.map(e => e.id !== estudiante_id ? e : {
        ...e,
        notas: [...(e.notas || []).filter(n => n.malla_item_id !== malla_item_id), { malla_item_id, estudiante_id, nota }]
      })
    }));
    await llamar({ accion: 'guardar_nota', malla_item_id, estudiante_id, nota });
    setGuardandoClave(null);
  }

  async function subirCertificado(file) {
    if (file.type !== 'application/pdf') { alert('Solo se aceptan archivos PDF'); return; }
    if (file.size > 8 * 1024 * 1024) { alert('El archivo supera el tamaño máximo de 8MB'); return; }
    setSubiendoCertificado(true);
    const contenido_base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const resp = await llamar({ accion: 'subir_certificado', nombre_archivo: file.name, contenido_base64 });
    if (resp?.certificado) {
      setDatos(prev => ({ ...prev, certificados: [resp.certificado, ...(prev.certificados || [])] }));
    } else {
      alert('No se pudo subir el certificado. Intenta de nuevo.');
    }
    setSubiendoCertificado(false);
  }

  async function eliminarCertificado(id) {
    if (!confirm('¿Eliminar este certificado?')) return;
    setDatos(prev => ({ ...prev, certificados: (prev.certificados || []).filter(c => c.id !== id) }));
    await llamar({ accion: 'eliminar_certificado', certificado_id: id });
  }

  if (cargando) {
    return <div className="text-center py-10"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  if (!datos) {
    return <p className="text-center text-gray-500 py-10">No se pudo cargar la información de homologación.</p>;
  }

  const mallaPorPrograma = {};
  for (const item of datos.mallaItems || []) {
    if (!mallaPorPrograma[item.programa_id]) mallaPorPrograma[item.programa_id] = [];
    mallaPorPrograma[item.programa_id].push(item);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">🎓 Homologación — Reconocimiento de Aprendizajes</h2>
        <p className="text-gray-600 text-sm">Sube las notas de tus estudiantes en las materias que homologan créditos de cada técnico.</p>
      </div>

      {Object.keys(mallaPorPrograma).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
          Aún no hay técnicos con malla de homologación configurada para tus estudiantes.
        </div>
      ) : (
        Object.entries(mallaPorPrograma).map(([programaId, items]) => {
          const estudiantesPrograma = (datos.estudiantes || []).filter(e => e.programa_id === programaId);
          if (estudiantesPrograma.length === 0) return null;
          const nombrePrograma = estudiantesPrograma[0]?.programa;
          return (
            <div key={programaId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">📚 {nombrePrograma}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-4">Estudiante</th>
                      {items.map(item => (
                        <th key={item.id} className="text-center py-2 px-3 whitespace-nowrap">
                          <div className="text-xs font-medium">{item.materia}</div>
                          <div className="text-[10px] text-gray-400">{item.grado}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estudiantesPrograma.map(est => (
                      <tr key={est.id}>
                        <td className="py-2 px-4">{est.nombre_completo}</td>
                        {items.map(item => {
                          const notaActual = est.notas?.find(n => n.malla_item_id === item.id)?.nota;
                          const clave = `${item.id}::${est.id}`;
                          return (
                            <td key={item.id} className="text-center py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                defaultValue={notaActual ?? ''}
                                onBlur={e => guardarNota(item.id, est.id, e.target.value)}
                                disabled={guardandoClave === clave}
                                className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">📄 {NOMBRE_CERTIFICADO_HOMOLOGACION}</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <input
              type="file"
              accept="application/pdf"
              id="certificado-homologacion-input"
              className="hidden"
              disabled={subiendoCertificado}
              onChange={e => { const f = e.target.files[0]; if (f) subirCertificado(f); e.target.value = ''; }}
            />
            <label
              htmlFor="certificado-homologacion-input"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer transition ${
                subiendoCertificado ? 'opacity-50 pointer-events-none' : 'bg-primary/5 border-primary/30 text-primary-dark hover:bg-primary/10'
              }`}
            >
              {subiendoCertificado ? '⏳ Subiendo...' : '➕ Subir certificado (PDF, máx. 8MB)'}
            </label>
          </div>
          {(datos.certificados || []).length === 0 ? (
            <p className="text-sm text-gray-400">Aún no has subido certificados.</p>
          ) : (
            <div className="space-y-2">
              {datos.certificados.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                  <a href={c.url_archivo} target="_blank" rel="noreferrer" className="text-sm text-gray-700 hover:text-primary truncate flex-1">📎 {c.nombre_archivo}</a>
                  <span className="text-xs text-gray-400 whitespace-nowrap mx-3">{formatearFecha(c.created_at)}</span>
                  <button onClick={() => eliminarCertificado(c.id)} className="text-gray-300 hover:text-red-500 transition p-1" title="Eliminar">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
