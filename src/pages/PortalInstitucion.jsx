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

import { useState, useEffect, useMemo } from 'react';
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
const GRUPO_TODOS = '__todos__';

export default function PortalInstitucion() {
  const { token } = useParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [datos, setDatos] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupoActivo, setGrupoActivo] = useState(GRUPO_TODOS);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);

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

  const estudiantesFiltrados = useMemo(() => {
    let lista = datos?.estudiantes || [];
    if (grupoActivo !== GRUPO_TODOS) {
      lista = lista.filter(e => e.grupo_id === grupoActivo);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(e => e.nombre_completo.toLowerCase().includes(q) || e.documento?.includes(q));
    }
    return lista;
  }, [datos, grupoActivo, busqueda]);

  function descargarExcel() {
    exportarEstudiantesExcel(estudiantesFiltrados, datos?.institucion?.nombre);
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white text-xl font-bold">☕</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-800">{datos.institucion.nombre}</h1>
              <p className="text-sm text-gray-500">{datos.institucion.municipio} · La Universidad en el Campo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
            <p className="text-2xl font-bold text-green-700">{kpis.activos}</p>
            <p className="text-xs text-green-600">Activos</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-700">{kpis.enRiesgo}</p>
            <p className="text-xs text-yellow-600">En Riesgo</p>
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

        {/* Selector de grupos, igual al flujo del padrino */}
        {gruposOrdenados.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-700 mb-3">📚 Grupos con estudiantes de esta institución</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGrupoActivo(GRUPO_TODOS)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  grupoActivo === GRUPO_TODOS
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Todos ({datos.estudiantes.length})
              </button>
              {gruposOrdenados.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGrupoActivo(g.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    grupoActivo === g.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                  title={`${g.universidad} · ${g.programa} · Cohorte ${g.cohorte}`}
                >
                  {g.nombre} · {g.total_estudiantes_institucion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buscador + descarga */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar estudiante..."
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm flex-1 min-w-[200px] max-w-md bg-white"
          />
          <button
            onClick={descargarExcel}
            disabled={estudiantesFiltrados.length === 0}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            📥 Descargar Excel
          </button>
        </div>

        {/* Tabla de estudiantes, con el mismo estilo de TablaEstudiantes */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {estudiantesFiltrados.length === 0 ? (
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
                    {estudiantesFiltrados.map(est => (
                      <tr key={est.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-gray-800">{est.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{est.documento || 'Sin documento'}</p>
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
                          <span className={`font-semibold text-sm ${est.total_faltas > 3 ? 'text-red-600' : 'text-gray-700'}`}>
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
                            onClick={() => setEstudianteSeleccionado(est)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
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
                {estudiantesFiltrados.map(est => (
                  <div
                    key={est.id}
                    onClick={() => setEstudianteSeleccionado(est)}
                    className="p-4 cursor-pointer active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
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
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Portal de solo lectura · Comité de Cafeteros de Caldas
        </p>
      </div>

      <PerfilEstudiantePortal
        estudiante={estudianteSeleccionado}
        onClose={() => setEstudianteSeleccionado(null)}
      />
    </div>
  );
}

// =============================================
// MODAL: PERFIL DEL ESTUDIANTE (SOLO LECTURA)
// =============================================
// Réplica de ModalPerfilEstudiante sin ninguna acción de edición/gestión —
// los datos ya vienen resueltos desde la Edge Function, no se consulta
// Supabase directamente.
function PerfilEstudiantePortal({ estudiante, onClose }) {
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

        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-xl">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">
                {estudiante.nombre_completo}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(estudiante.estado)}`}>
                  {estudiante.estado || 'Activo'}
                </span>
                <span className="text-sm text-gray-600">📋 {estudiante.documento || 'Sin documento'}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition">
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
