// =============================================
// MODAL: PERFIL COMPLETO DEL ESTUDIANTE
// =============================================

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificacion } from '../../context/NotificacionContext';
import { supabase } from '../../lib/supabaseClient';
import { getEstadoColor, formatearFecha, calcularPasosDesercion } from '../../utils/helpers';
import { ESTADOS_ESTUDIANTE, TIPOS_DOCUMENTO_DESERCION } from '../../utils/constants';
import { exportarSeguimientosExcel, exportarNotasEstudianteExcel, exportarInasistenciasExcel } from '../../utils/exportUtils';
import VisorImagen from '../common/VisorImagen';
import BotonWhatsApp from '../common/BotonWhatsApp';
import ModalEditarDesercion from './ModalEditarDesercion';
import ModalCambiarGrupo from './ModalCambiarGrupo';
import ModalConfirmarEliminacion from '../common/ModalConfirmarEliminacion';
import PasosDesercion from './PasosDesercion';
import BadgeDiscapacidad from './BadgeDiscapacidad';
import AvisoDiscapacidadPerfil from './AvisoDiscapacidadPerfil';

const ESTADO_MULTA_COLOR = {
  pendiente: 'bg-red-100 text-red-700',
  abonando: 'bg-amber-100 text-amber-700',
  pagado: 'bg-green-100 text-green-700',
  condonado: 'bg-blue-100 text-blue-700'
};

const ESTADO_MULTA_LABEL = {
  pendiente: 'Pendiente',
  abonando: 'Abonando',
  pagado: 'Pagado',
  condonado: 'Condonado'
};

export default function ModalPerfilEstudiante({
  isOpen,
  onClose,
  estudiante,
  historial,
  cargandoHistorial,
  onCargarHistorial,
  onSeguimiento,
  onEditar,
  onEditarSeguimiento,
  onReportarDesercion,
  puedeGestionar,
  onEstadoChange,
  onTrasladoCompletado,
  esAdmin = false,
  onEstudianteEliminado
}) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [modalEliminarEstudiante, setModalEliminarEstudiante] = useState(false);
  const [datosDesercion, setDatosDesercion] = useState(null);
  const [cargandoDesercion, setCargandoDesercion] = useState(false);
  const [datosMulta, setDatosMulta] = useState(null);
  const [cargandoMulta, setCargandoMulta] = useState(false);
  const [guardandoPasoManual, setGuardandoPasoManual] = useState(false);
  const [modalEditarDesercion, setModalEditarDesercion] = useState(false);
  const [modalCambiarGrupo, setModalCambiarGrupo] = useState(false);
  const [notasEstudiante, setNotasEstudiante] = useState([]);
  const [cargandoNotasEst, setCargandoNotasEst] = useState(false);
  const [inasistenciasEst, setInasistenciasEst] = useState([]);
  const [cargandoInasistencias, setCargandoInasistencias] = useState(false);
  const [traslados, setTraslados] = useState([]);
  const [cargandoTraslados, setCargandoTraslados] = useState(false);

  async function cargarTraslados(estudianteId) {
    setCargandoTraslados(true);
    const { data } = await supabase
      .from('traslados_grupo')
      .select(`
        id, fecha_traslado, motivo, observaciones,
        grupo_origen:grupo_origen_id ( nombre ),
        grupo_destino:grupo_destino_id ( nombre ),
        usuario:usuario_id ( nombre_completo )
      `)
      .eq('estudiante_id', estudianteId)
      .order('fecha_traslado', { ascending: false });
    if (data) setTraslados(data);
    setCargandoTraslados(false);
  }

  async function cargarInasistenciasEstudiante(estudianteId) {
    setCargandoInasistencias(true);
    const { data } = await supabase
      .from('inasistencias')
      .select(`
        id, estado_seguimiento, observacion_docente, created_at,
        registros_asistencia:registro_id (
          fecha, modulo, docente_nombre, grupo_id,
          grupos:grupo_id ( nombre )
        )
      `)
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });
    if (data) setInasistenciasEst(data);
    setCargandoInasistencias(false);
  }

  async function cargarNotasEstudiante(estudianteId) {
    setCargandoNotasEst(true);
    const { data } = await supabase
      .from('notas_estudiantes')
      .select(`
        id, nota, observaciones,
        notas_modulos:nota_modulo_id (
          id, modulo, fecha_evaluacion, docente_nombre
        )
      `)
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });
    if (data) {
      const ordenadas = [...data].sort((a, b) => {
        const fa = a.notas_modulos?.fecha_evaluacion || '';
        const fb = b.notas_modulos?.fecha_evaluacion || '';
        return fb.localeCompare(fa);
      });
      setNotasEstudiante(ordenadas);
    }
    setCargandoNotasEst(false);
  }

  async function cargarDatosDesercion(estudianteId) {
    setCargandoDesercion(true);
    const { data: registro } = await supabase
      .from('registros_desercion')
      .select(`*, usuario:usuario_id (nombre_completo, rol), documentos:documentos_desercion(*)`)
      .eq('estudiante_id', estudianteId)
      .order('fecha_reporte', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (registro) {
      setDatosDesercion(registro);
      if (registro.tipo_desercion === 'Sin Justificar') {
        cargarMulta(registro.id);
      } else {
        setDatosMulta(null);
      }
    } else {
      setDatosMulta(null);
    }
    setCargandoDesercion(false);
  }

  async function cargarMulta(registroId) {
    setCargandoMulta(true);
    const { data } = await supabase
      .from('multas_desercion')
      .select('*, pagos:pagos_multa(*)')
      .eq('registro_desercion_id', registroId)
      .maybeSingle();
    setDatosMulta(data || null);
    setCargandoMulta(false);
  }

  async function handleTogglePasoManual() {
    const nuevoValor = !datosDesercion.paso_manual_completado;
    setGuardandoPasoManual(true);
    const { error } = await supabase
      .from('registros_desercion')
      .update({
        paso_manual_completado: nuevoValor,
        paso_manual_completado_at: nuevoValor ? new Date().toISOString() : null,
        paso_manual_completado_por: nuevoValor ? usuario?.id : null
      })
      .eq('id', datosDesercion.id);
    setGuardandoPasoManual(false);

    if (error) {
      notificacion.error(error.message, 'Error al actualizar');
      return;
    }
    cargarDatosDesercion(estudiante.id);
  }

  async function handleEliminarEstudiante() {
    setEliminando(true);
    const { error } = await supabase.rpc('eliminar_estudiante_completo', { p_estudiante_id: estudiante.id });
    setEliminando(false);

    if (error) {
      notificacion.error(error.message, 'Error al eliminar');
      return;
    }

    setModalEliminarEstudiante(false);
    notificacion.success(`"${estudiante.nombre_completo}" fue eliminado correctamente`);
    onClose();
    onEstudianteEliminado?.(estudiante.id);
  }

  useEffect(() => {
    if (isOpen && estudiante) {
      onCargarHistorial(estudiante.id);
      cargarNotasEstudiante(estudiante.id);
      cargarInasistenciasEstudiante(estudiante.id);
      cargarTraslados(estudiante.id);
      if (estudiante.estado === 'Desertor') {
        cargarDatosDesercion(estudiante.id);
      } else {
        setDatosDesercion(null);
      }
    }
  }, [isOpen, estudiante?.id]);

  if (!isOpen || !estudiante) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
          
          {/* ENCABEZADO CON GRADIENTE CORPORATIVO */}
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-warm-light sticky top-0 z-10 rounded-t-xl">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">
                  {estudiante.nombre_completo}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(estudiante.estado)}`}>
                    {estudiante.estado || 'Activo'}
                  </span>
                  <BadgeDiscapacidad estudiante={estudiante} />
                  <span className="text-sm text-gray-600">📋 {estudiante.documento || 'Sin documento'}</span>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition">
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            <AvisoDiscapacidadPerfil estudiante={estudiante} />

            {/* INFORMACIÓN DE CONTACTO */}
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
            
            {/* ESTADÍSTICAS RÁPIDAS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">
                  {cargandoInasistencias ? '…' : inasistenciasEst.length}
                </p>
                <p className="text-xs text-blue-600">Faltas Acumuladas</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-700">{historial.length}</p>
                <p className="text-xs text-green-600">Seguimientos</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                <p className="text-2xl font-bold text-purple-700">
                  {historial.length > 0 ? formatearFecha(historial[0].fecha_contacto, 'corta-con-año') : 'N/A'}
                </p>
                <p className="text-xs text-purple-600">Último Contacto</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                <p className="text-2xl font-bold text-amber-700">{estudiante.cohorte}</p>
                <p className="text-xs text-amber-600">Cohorte</p>
              </div>
            </div>
            
            {/* ACCIONES RÁPIDAS */}
            <div className="flex flex-wrap gap-2 mb-6">
              {puedeGestionar && (
                <>
                  <button onClick={() => { onClose(); onSeguimiento(estudiante); }}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition shadow-sm hover:shadow">
                    📝 Registrar Seguimiento
                  </button>
                  <button onClick={() => onEditar(estudiante)}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition border-2 border-gray-300 shadow-sm">
                    ✏️ Editar Información
                  </button>
                  <button onClick={() => setModalCambiarGrupo(true)}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition border-2 border-gray-300 shadow-sm">
                    🔄 Cambiar de Grupo
                  </button>
                </>
              )}

              {esAdmin && (
                <button
                  onClick={() => setModalEliminarEstudiante(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium transition border-2 border-red-200 shadow-sm"
                >
                  🗑️ Eliminar Estudiante
                </button>
              )}

              {/* BOTÓN EXPORTAR */}
              {historial && historial.length > 0 && (
                <button
                  onClick={() => exportarSeguimientosExcel(historial, estudiante.nombre_completo)}
                  className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
                >
                  <span>📥</span>
                  <span>Descargar Reporte</span>
                </button>
              )}

              {/* SELECTOR DE ESTADO - CON ACTUALIZACIÓN LOCAL */}
              {puedeGestionar ? (
                <select
                  value={estudiante.estado || 'Activo'}
                  onChange={async (e) => {
                    const nuevoEstado = e.target.value;
                    if (nuevoEstado === 'Desertor') {
                      onClose();
                      onReportarDesercion(estudiante);
                    } else {
                      const resultado = await onEstadoChange(estudiante.id, nuevoEstado);
                      if (resultado && resultado.success) {
                        // 🔥 Actualizar el estado localmente para que se refleje en la UI
                        estudiante.estado = nuevoEstado;
                        notificacion.success(`Estado actualizado a: ${nuevoEstado}`);
                      }
                    }
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm"
                >
                  <option value="Activo">Activo</option>
                  <option value="En Riesgo">En Riesgo</option>
                  <option value="Graduado">Graduado</option>
                  <option value="Desertor">Desertor</option>
                </select>
              ) : (
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getEstadoColor(estudiante.estado)}`}>
                  {estudiante.estado || 'Activo'}
                </span>
              )}
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

            {/* TRASLADOS DE GRUPO */}
            {(cargandoTraslados || traslados.length > 0) && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2 text-xl">🔄</span> Traslados de Grupo
                </h3>
                {cargandoTraslados ? (
                  <div className="text-center py-3">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {/* SECCIÓN DE DESERCIÓN */}
            {estudiante.estado === 'Desertor' && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 mb-6 border border-red-200">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-2 text-xl">🚨</span>
                    Información de Deserción
                  </div>
                  {/* 🔥 SOLO COORDINADORES Y ASISTENTE PUEDEN EDITAR */}
                  {puedeGestionar && (
                    <button
                      onClick={() => setModalEditarDesercion(true)}
                      className="text-xs bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg transition"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </h3>
                {cargandoDesercion ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando datos...</p>
                  </div>
                ) : datosDesercion && !datosDesercion.tipo_desercion ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <p className="text-sm font-medium text-amber-800">
                      ⏳ Este reporte está pendiente de información
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {puedeGestionar
                        ? 'Usa "Editar" para completar el tipo, motivo y documentos.'
                        : 'Un coordinador o administrador debe completar el tipo, motivo y documentos.'}
                    </p>
                  </div>
                ) : datosDesercion ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-sm text-gray-700 mb-2">📋 Progreso del proceso:</p>
                      <PasosDesercion pasos={calcularPasosDesercion(datosDesercion)} />
                      {puedeGestionar && (
                        <button
                          onClick={handleTogglePasoManual}
                          disabled={guardandoPasoManual}
                          className={`mt-2 text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ${
                            datosDesercion.paso_manual_completado
                              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              : 'bg-amber-600 hover:bg-amber-700 text-white'
                          }`}
                        >
                          {guardandoPasoManual
                            ? 'Guardando...'
                            : datosDesercion.paso_manual_completado
                              ? '↩️ Desmarcar'
                              : datosDesercion.tipo_desercion === 'Sin Justificar'
                                ? '✅ Marcar confirmación del retiro'
                                : '✅ Marcar evidencia del retiro justificado'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <p><strong>Tipo:</strong> {datosDesercion.tipo_desercion}</p>
                      <p><strong>Fecha de reporte:</strong> {formatearFecha(datosDesercion.fecha_reporte)}</p>
                      <p><strong>Motivo principal:</strong> {datosDesercion.motivo_principal}</p>
                      <p><strong>Reportado por:</strong> {datosDesercion.usuario?.nombre_completo || 'Sistema'}</p>
                    </div>
                    {datosDesercion.observaciones && (
                      <div className="bg-white p-3 rounded-lg text-sm"><strong>Observaciones:</strong> {datosDesercion.observaciones}</div>
                    )}
                    {datosDesercion.documentos && datosDesercion.documentos.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium text-sm mb-2">📎 Documentos adjuntos:</p>
                        <div className="space-y-2">
                          {datosDesercion.documentos.map((doc) => {
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

                    {/* MULTA Y PAGOS (solo Sin Justificar) */}
                    {datosDesercion.tipo_desercion === 'Sin Justificar' && (
                      <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                        <p className="font-medium text-sm text-gray-700 mb-2 flex items-center justify-between">
                          <span>💰 Multa y Pagos</span>
                          {datosMulta && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_MULTA_COLOR[datosMulta.estado] || 'bg-gray-100 text-gray-700'}`}>
                              {ESTADO_MULTA_LABEL[datosMulta.estado] || datosMulta.estado}
                            </span>
                          )}
                        </p>
                        {cargandoMulta ? (
                          <p className="text-sm text-gray-400">Cargando...</p>
                        ) : !datosMulta ? (
                          <p className="text-sm text-gray-500">No hay una multa registrada para esta deserción.</p>
                        ) : (
                          (() => {
                            const totalPagado = (datosMulta.pagos || []).reduce((sum, p) => sum + (p.valor || 0), 0);
                            const saldo = datosMulta.valor_total - totalPagado;
                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500">Valor multa</p>
                                    <p className="font-medium">${datosMulta.valor_total?.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Pagado</p>
                                    <p className="font-medium text-green-600">${totalPagado.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Saldo</p>
                                    <p className="font-medium text-red-600">${saldo.toLocaleString()}</p>
                                  </div>
                                </div>
                                {(datosMulta.pagos || []).length > 0 ? (
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-gray-500">Historial de pagos:</p>
                                    {datosMulta.pagos.map(pago => (
                                      <div key={pago.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                                        <span className="text-gray-700">{formatearFecha(pago.fecha_pago)}</span>
                                        <span className="font-medium text-green-600">${pago.valor?.toLocaleString()}</span>
                                        {pago.comprobante_url ? (
                                          <a href={pago.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark text-xs font-medium whitespace-nowrap">Ver comprobante →</a>
                                        ) : (
                                          <span className="text-xs text-gray-400 whitespace-nowrap">Sin comprobante</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">Aún no se han registrado pagos.</p>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No se encontraron registros de deserción</p>
                )}
              </div>
            )}
            
            {/* NOTAS ACADÉMICAS */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2 text-xl">🎓</span> Notas Académicas
                </span>
                {notasEstudiante.length > 0 && (
                  <button
                    onClick={() => exportarNotasEstudianteExcel(notasEstudiante, estudiante.nombre_completo)}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
                  >
                    <span>📥</span>
                    <span>Descargar Historial Académico</span>
                  </button>
                )}
              </h3>

              {cargandoNotasEst ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <p className="text-sm text-gray-500 mt-2">Cargando notas...</p>
                </div>
              ) : notasEstudiante.length === 0 ? (
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
                      {notasEstudiante.map(ne => (
                        <tr key={ne.id} className="hover:bg-primary/20 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            {ne.notas_modulos?.modulo || 'N/A'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                            {formatearFecha(ne.notas_modulos?.fecha_evaluacion)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {ne.nota !== null && ne.nota !== undefined ? (
                              <span className={`font-bold text-base ${ne.nota >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                                {Number(ne.nota).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400">–</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {ne.nota !== null && ne.nota !== undefined ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                ne.nota >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {ne.nota >= 3 ? 'Aprobado' : 'Reprobado'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin nota</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {notasEstudiante.filter(n => n.nota !== null && n.nota >= 3).length} aprobados
                      · {notasEstudiante.filter(n => n.nota !== null && n.nota < 3).length} reprobados
                      · {notasEstudiante.filter(n => n.nota === null).length} sin nota
                      · {notasEstudiante.length} módulos en total
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* HISTÓRICO DE INASISTENCIAS */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="mr-2 text-xl">⚠️</span> Histórico de Inasistencias
                </span>
                {inasistenciasEst.length > 0 && (
                  <button
                    onClick={() => exportarInasistenciasExcel(inasistenciasEst, estudiante.nombre_completo)}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
                  >
                    <span>📥</span>
                    <span>Descargar Inasistencias</span>
                  </button>
                )}
              </h3>

              {cargandoInasistencias ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <p className="text-sm text-gray-500 mt-2">Cargando inasistencias...</p>
                </div>
              ) : inasistenciasEst.length === 0 ? (
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
                      {inasistenciasEst.map(ina => {
                        const ra = ina.registros_asistencia;
                        const estado = ina.estado_seguimiento;
                        const estadoColor =
                          estado === 'realizado' ? 'text-green-600 bg-green-50' :
                          estado === 'justificado' ? 'text-blue-600 bg-blue-50' :
                          'text-amber-600 bg-amber-50';
                        return (
                          <tr key={ina.id} className="hover:bg-primary/20 transition-colors align-top">
                            <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                              {formatearFecha(ra?.fecha)}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-gray-800">
                              {ra?.modulo || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {ra?.grupos?.nombre || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">
                              {ra?.docente_nombre || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColor}`}>
                                {estado === 'realizado' ? '✅ Seguimiento hecho' :
                                 estado === 'justificado' ? '📋 Justificado' :
                                 '⏳ Pendiente'}
                              </span>
                              {ina.observacion_docente && (
                                <p className="mt-1 text-xs text-gray-400 italic">💬 {ina.observacion_docente}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {inasistenciasEst.length} inasistencia(s) en total
                      · {inasistenciasEst.filter(i => i.estado_seguimiento === 'pendiente').length} pendiente(s)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* LÍNEA DE TIEMPO */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                <span className="mr-2 text-xl">📋</span> Historial de Seguimientos
              </h3>
              
              {cargandoHistorial ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="text-gray-500 mt-2">Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-500">Aún no hay seguimientos registrados</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-primary/10"></div>
                  
                  <div className="space-y-4">
                    {historial.map((seg, index) => (
                      <div key={seg.id} className="relative flex items-start pl-12">
                        <div className={`absolute left-4 w-4 h-4 rounded-full border-2 border-white shadow ${index === 0 ? 'bg-primary ring-2 ring-primary/20' : 'bg-gray-300'}`}></div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 flex-1 border border-gray-200 hover:shadow-sm transition relative">
                          <button onClick={() => onEditarSeguimiento(seg)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-primary transition p-2 bg-white rounded-full shadow-sm border border-gray-200 z-10"
                            title="Editar seguimiento">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>

                          <div className="flex justify-between items-start mb-2 pr-8">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-800">{seg.tipo_gestion}</span>
                              {seg.tipo_seguimiento === 'rendimiento_academico' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">📚 Rendimiento Académico</span>
                              )}
                              {seg.causa_ausencia && (
                                <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">{seg.causa_ausencia}</span>
                              )}
                            </div>
                            <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">{formatearFecha(seg.fecha_contacto)}</span>
                          </div>
                          
                          <p className="text-gray-700 text-sm mb-3 bg-white p-3 rounded-lg">{seg.resultado}</p>
                          
                          {seg.evidencias && seg.evidencias.length > 0 && (
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
      </div>

      {/* VISOR DE IMAGEN */}
      {imagenSeleccionada && (
        <VisorImagen url={imagenSeleccionada} onClose={() => setImagenSeleccionada(null)} />
      )}

      <ModalEditarDesercion
        isOpen={modalEditarDesercion}
        onClose={() => setModalEditarDesercion(false)}
        datosDesercion={datosDesercion}
        onActualizado={() => {
          setModalEditarDesercion(false);
          cargarDatosDesercion(estudiante.id);
          // 🔥 También refrescar datos del estudiante
          if (estudiante?.id) {
            onCargarHistorial(estudiante.id);
          }
        }}
        onDocumentoAgregado={() => cargarDatosDesercion(estudiante.id)}
      />

      <ModalCambiarGrupo
        isOpen={modalCambiarGrupo}
        onClose={() => setModalCambiarGrupo(false)}
        estudiante={estudiante}
        onTrasladado={() => {
          cargarTraslados(estudiante.id);
          cargarInasistenciasEstudiante(estudiante.id);
          cargarNotasEstudiante(estudiante.id);
          onTrasladoCompletado?.();
        }}
      />

      <ModalConfirmarEliminacion
        isOpen={modalEliminarEstudiante}
        onClose={() => setModalEliminarEstudiante(false)}
        onConfirmar={handleEliminarEstudiante}
        cargando={eliminando}
        titulo={`Eliminar a "${estudiante.nombre_completo}"`}
        mensaje="Esta acción borra al estudiante y TODO su historial (seguimientos, notas, inasistencias, deserción, multas). No se puede deshacer."
      />
    </>
  );
}