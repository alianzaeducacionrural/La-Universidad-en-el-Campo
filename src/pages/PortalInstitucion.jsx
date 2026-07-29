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
import { getEstadoColor, formatearFecha } from '../utils/helpers';
import {
  exportarEstudiantesExcel,
  exportarSeguimientosExcel,
  exportarNotasEstudianteExcel,
  exportarInasistenciasExcel
} from '../utils/exportUtils';
import BotonWhatsApp from '../components/common/BotonWhatsApp';
import VisorImagen from '../components/common/VisorImagen';

const FUNCIONES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-institucion`;
const TAB_RESUMEN = '__resumen__';

// Paleta rotativa para diferenciar cada grupo a simple vista — el mismo
// grupo conserva siempre el mismo color mientras no cambie su posición en
// la lista ordenada alfabéticamente.
const TEMAS_GRUPO = [
  { nombre: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', solido: 'bg-blue-600', dot: 'bg-blue-500', activo: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200', gradiente: 'from-blue-500 to-blue-600', anillo: 'focus-visible:ring-blue-400' },
  { nombre: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', solido: 'bg-purple-600', dot: 'bg-purple-500', activo: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200', gradiente: 'from-purple-500 to-purple-600', anillo: 'focus-visible:ring-purple-400' },
  { nombre: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', solido: 'bg-amber-600', dot: 'bg-amber-500', activo: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200', gradiente: 'from-amber-500 to-amber-600', anillo: 'focus-visible:ring-amber-400' },
  { nombre: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', solido: 'bg-rose-600', dot: 'bg-rose-500', activo: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200', gradiente: 'from-rose-500 to-rose-600', anillo: 'focus-visible:ring-rose-400' },
  { nombre: 'teal', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', solido: 'bg-teal-600', dot: 'bg-teal-500', activo: 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200', gradiente: 'from-teal-500 to-teal-600', anillo: 'focus-visible:ring-teal-400' },
  { nombre: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', solido: 'bg-indigo-600', dot: 'bg-indigo-500', activo: 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200', gradiente: 'from-indigo-500 to-indigo-600', anillo: 'focus-visible:ring-indigo-400' },
  { nombre: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', solido: 'bg-orange-600', dot: 'bg-orange-500', activo: 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-200', gradiente: 'from-orange-500 to-orange-600', anillo: 'focus-visible:ring-orange-400' },
  { nombre: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', solido: 'bg-cyan-600', dot: 'bg-cyan-500', activo: 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200', gradiente: 'from-cyan-500 to-cyan-600', anillo: 'focus-visible:ring-cyan-400' },
];

function iniciales(nombre) {
  const partes = (nombre || '').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
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

  const kpis = useMemo(() => {
    const estudiantes = datos?.estudiantes || [];
    return {
      total: estudiantes.length,
      activos: estudiantes.filter(e => e.estado === 'Activo' || !e.estado).length,
      enRiesgo: estudiantes.filter(e => e.estado === 'En Riesgo').length,
      desertores: estudiantes.filter(e => e.estado === 'Desertor').length,
      graduados: estudiantes.filter(e => e.estado === 'Graduado').length
    };
  }, [datos]);

  const estadisticasPorGrupo = useMemo(() => {
    const estudiantes = datos?.estudiantes || [];
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
  }, [datos, gruposOrdenados]);

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
                  const grupoNombre = gruposOrdenados.find(g => g.id === est.grupo_id)?.nombre;
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
            {gruposOrdenados.map(g => {
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
                  {g.nombre}
                  <span className={activa ? 'text-white/80' : 'text-gray-400'}>· {g.total_estudiantes_institucion}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div key={tabActiva} className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6 animate-fade-in">
        {tabActiva === TAB_RESUMEN ? (
          <VistaResumen
            kpis={kpis}
            gruposOrdenados={gruposOrdenados}
            temaPorGrupo={temaPorGrupo}
            estadisticasPorGrupo={estadisticasPorGrupo}
            onIrAGrupo={setTabActiva}
            onDescargarTodo={() => descargarExcel(datos.estudiantes, datos.institucion.nombre)}
          />
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
function VistaResumen({ kpis, gruposOrdenados, temaPorGrupo, estadisticasPorGrupo, onIrAGrupo, onDescargarTodo }) {
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gruposOrdenados.map(g => {
              const tema = temaPorGrupo[g.id];
              const stats = estadisticasPorGrupo[g.id] || { total: 0, activos: 0, enRiesgo: 0, desertores: 0 };
              const pctActivos = stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0;
              return (
                <button
                  key={g.id}
                  onClick={() => onIrAGrupo(g.id)}
                  className={`text-left rounded-xl border ${tema.border} ${tema.bg} p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 ${tema.anillo}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${tema.dot} flex-shrink-0`}></span>
                    <span className="text-xs font-medium text-gray-500 ml-auto">{stats.total} estudiante{stats.total !== 1 ? 's' : ''}</span>
                  </div>
                  <p className={`font-bold ${tema.text} leading-snug mb-1`}>{g.nombre}</p>
                  <p className="text-xs text-gray-500 mb-3">{g.universidad} · {g.programa} · Cohorte {g.cohorte}</p>
                  <div className="h-1.5 rounded-full bg-white/70 overflow-hidden mb-1.5">
                    <div className={`h-full ${tema.solido}`} style={{ width: `${pctActivos}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{pctActivos}% activos</span>
                    {stats.desertores > 0 && <span className="text-red-500">{stats.desertores} desertor{stats.desertores !== 1 ? 'es' : ''}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// PESTAÑA: DETALLE DE UN GRUPO
// =============================================
function VistaGrupo({ grupo, tema, estudiantes, busqueda, setBusqueda, onVerPerfil, onDescargar }) {
  if (!grupo || !tema) return null;

  return (
    <div className="space-y-5">
      {/* Encabezado del grupo, coloreado con el tema del grupo */}
      <div className={`rounded-xl bg-gradient-to-r ${tema.gradiente} p-5 shadow-sm text-white`}>
        <p className="text-lg font-bold leading-tight">{grupo.nombre}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-white/90">
          <span className="bg-white/15 px-2.5 py-1 rounded-full">{grupo.universidad}</span>
          <span className="bg-white/15 px-2.5 py-1 rounded-full">{grupo.programa}</span>
          <span className="bg-white/15 px-2.5 py-1 rounded-full">Cohorte {grupo.cohorte}</span>
          <span className="bg-white/15 px-2.5 py-1 rounded-full">{grupo.total_estudiantes_institucion} estudiante{grupo.total_estudiantes_institucion !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Buscador local + descarga del grupo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar en este grupo..."
          className={`border ${tema.border} rounded-lg px-4 py-2.5 text-sm flex-1 min-w-[200px] max-w-md bg-white focus:outline-none focus-visible:ring-2 ${tema.anillo}`}
        />
        <button
          onClick={onDescargar}
          disabled={estudiantes.length === 0}
          className={`${tema.solido} text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 hover:brightness-95`}
        >
          📥 Descargar Excel del grupo
        </button>
      </div>

      {/* Tabla de estudiantes */}
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

        <div className={`p-4 sm:p-6 border-b border-gray-200 rounded-t-xl ${tema ? `bg-gradient-to-r ${tema.gradiente}` : 'bg-gradient-to-r from-primary/10 to-primary/5'}`}>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className={`text-xl sm:text-2xl font-bold leading-tight ${tema ? 'text-white' : 'text-gray-800'}`}>
                {estudiante.nombre_completo}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(estudiante.estado)}`}>
                  {estudiante.estado || 'Activo'}
                </span>
                <span className={`text-sm ${tema ? 'text-white/90' : 'text-gray-600'}`}>📋 {estudiante.documento || 'Sin documento'}</span>
              </div>
            </div>
            <button onClick={onClose} className={`text-2xl w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0 ${tema ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
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
                      <span className="font-medium text-gray-700">{t.grupo_origen?.nombre || 'Sin grupo'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-700">{t.grupo_destino?.nombre || 'N/A'}</span>
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
                        {estudiante.desercion.documentos.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                            <span className="text-sm">{doc.tipo_documento === 'carta_retiro_ie' ? '📄 Carta de Retiro' : '📎 Soporte Adicional'}</span>
                            <a href={doc.url_archivo} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark text-sm font-medium">Ver →</a>
                          </div>
                        ))}
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
                  onClick={() => exportarInasistenciasExcel(inasistencias, estudiante.nombre_completo)}
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
                          <td className="px-4 py-2.5 text-gray-600">{ra?.grupos?.nombre || 'N/A'}</td>
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
