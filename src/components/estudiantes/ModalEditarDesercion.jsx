// =============================================
// MODAL: EDITAR REGISTRO DE DESERCIÓN (CON DOCUMENTOS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';
import { TIPOS_DOCUMENTO_DESERCION } from '../../utils/constants';

const MOTIVOS_DESERCION = [
  { value: 'Cambio de domicilio', label: 'Cambio de domicilio' },
  { value: 'Situación económica', label: 'Situación económica' },
  { value: 'Problemas de salud', label: 'Problemas de salud' },
  { value: 'Embarazo/Maternidad', label: 'Embarazo/Maternidad' },
  { value: 'Ingreso a otro programa', label: 'Ingreso a otro programa' },
  { value: 'Problemas familiares', label: 'Problemas familiares' },
  { value: 'Rendimiento académico', label: 'Rendimiento académico' },
  { value: 'Falta de conectividad', label: 'Falta de conectividad' },
  { value: 'Desmotivación', label: 'Desmotivación' },
  { value: 'Otro', label: 'Otro' }
];

export default function ModalEditarDesercion({ isOpen, onClose, datosDesercion, onActualizado, onDocumentoAgregado }) {
  const notificacion = useNotificacion();
  const [tipoDesercion, setTipoDesercion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [valorMulta, setValorMulta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [multaExistente, setMultaExistente] = useState(null);

  // 🔥 Estados para documentos
  const [documentos, setDocumentos] = useState([]);
  const [documentosEliminados, setDocumentosEliminados] = useState([]);
  const [archivoCartaRetiro, setArchivoCartaRetiro] = useState(null);
  const [subiendoCartaRetiro, setSubiendoCartaRetiro] = useState(false);
  const [archivoSoporte, setArchivoSoporte] = useState(null);
  const [subiendoSoporte, setSubiendoSoporte] = useState(false);
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [tipoNuevoDocumento, setTipoNuevoDocumento] = useState('certificado_vecindad');
  const [subiendo, setSubiendo] = useState(false);

  // El selector de "otro documento" excluye los dos tipos que ya tienen su propia
  // casilla dedicada (carta de retiro y soporte), y se limita a los tipos que
  // aplican a la ruta (Justificada/Sin Justificar) actualmente seleccionada.
  const tiposOtroDocumento = TIPOS_DOCUMENTO_DESERCION.filter(
    t => (!t.aplicaA || t.aplicaA === tipoDesercion) && t.value !== 'carta_retiro_ie' && t.value !== 'soporte'
  );

  // Se inicializa solo al ABRIR el modal para un registro dado (isOpen o el id
  // cambian) — nunca cuando datosDesercion se refresca en segundo plano con el
  // modal ya abierto (p. ej. al subir un documento, ver subirDocumento más abajo,
  // que dispara onDocumentoAgregado en el padre). De lo contrario, ese refresco
  // pisaba silenciosamente lo que la auxiliar ya había escrito en el formulario
  // (tipo, motivo, observaciones) con los valores viejos todavía en la BD.
  useEffect(() => {
    if (isOpen && datosDesercion) {
      setTipoDesercion(datosDesercion.tipo_desercion || 'Sin Justificar');
      setMotivo(datosDesercion.motivo_principal || '');
      setMotivoOtro(datosDesercion.motivo_otro || '');
      setObservaciones(datosDesercion.observaciones || '');
      setDocumentos(datosDesercion.documentos || []);
      setDocumentosEliminados([]);
      setArchivoCartaRetiro(null);
      setArchivoSoporte(null);
      setNuevoArchivo(null);
      cargarMulta();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, datosDesercion?.id]);

  // Si cambia la ruta (Justificada <-> Sin Justificar), el tipo seleccionado en "otro
  // documento" puede dejar de aplicar (p. ej. una carta de cobro ya no tiene sentido
  // en Justificada) — se ajusta al primer tipo válido para la ruta actual.
  useEffect(() => {
    if (tiposOtroDocumento.length && !tiposOtroDocumento.some(t => t.value === tipoNuevoDocumento)) {
      setTipoNuevoDocumento(tiposOtroDocumento[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoDesercion]);

  async function cargarMulta() {
    if (!datosDesercion) return;
    const { data } = await supabase
      .from('multas_desercion')
      .select('*')
      .eq('registro_desercion_id', datosDesercion.id)
      .maybeSingle();
    
    if (data) {
      setMultaExistente(data);
      setValorMulta(data.valor_total?.toString() || '');
    } else {
      setMultaExistente(null);
      setValorMulta('');
    }
  }

  // 🔥 Eliminar documento (marcar para eliminar)
  function marcarDocumentoEliminar(docId) {
    setDocumentosEliminados(prev => [...prev, docId]);
    setDocumentos(prev => prev.filter(d => d.id !== docId));
  }

  // 🔥 Restaurar documento eliminado
  function restaurarDocumento(docId) {
    const docRestaurado = datosDesercion.documentos?.find(d => d.id === docId);
    if (docRestaurado) {
      setDocumentos(prev => [...prev, docRestaurado]);
      setDocumentosEliminados(prev => prev.filter(id => id !== docId));
    }
  }

  // 🔥 Sube un archivo al storage y lo registra en documentos_desercion. Compartida por
  // las tres casillas de subida (carta de retiro, soporte y "otro documento").
  async function subirDocumentoTipo(archivo, tipo) {
    const nombreSeguro = archivo.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const nombreArchivo = `${Date.now()}_${nombreSeguro}`;
    const ruta = `desercion/${datosDesercion.id}/${tipo}/${nombreArchivo}`;

    const { error: errorUpload } = await supabase.storage
      .from('evidencias')
      .upload(ruta, archivo);

    if (errorUpload) throw errorUpload;

    const { data: urlData } = supabase.storage
      .from('evidencias')
      .getPublicUrl(ruta);

    const { data: nuevoDoc, error: errorInsert } = await supabase
      .from('documentos_desercion')
      .insert([{
        registro_id: datosDesercion.id,
        tipo_documento: tipo,
        nombre_archivo: archivo.name,
        url_archivo: urlData.publicUrl,
        tamanio_bytes: archivo.size
      }])
      .select()
      .single();

    if (errorInsert) throw errorInsert;

    setDocumentos(prev => [...prev, nuevoDoc]);
    // El checklist de pasos depende de qué documentos existen: avisar al padre de
    // inmediato, sin esperar a que se guarde el resto del formulario.
    onDocumentoAgregado?.();
    return nuevoDoc;
  }

  async function subirCartaRetiro() {
    if (!archivoCartaRetiro) {
      notificacion.warning('Selecciona un archivo', 'Campo requerido');
      return;
    }
    setSubiendoCartaRetiro(true);
    try {
      await subirDocumentoTipo(archivoCartaRetiro, 'carta_retiro_ie');
      setArchivoCartaRetiro(null);
      notificacion.success('Documento agregado correctamente');
    } catch (error) {
      console.error('Error:', error);
      notificacion.error(interpretarError(error), 'Error al subir documento');
    } finally {
      setSubiendoCartaRetiro(false);
    }
  }

  async function subirSoporte() {
    if (!archivoSoporte) {
      notificacion.warning('Selecciona un archivo', 'Campo requerido');
      return;
    }
    setSubiendoSoporte(true);
    try {
      await subirDocumentoTipo(archivoSoporte, 'soporte');
      setArchivoSoporte(null);
      notificacion.success('Documento agregado correctamente');
    } catch (error) {
      console.error('Error:', error);
      notificacion.error(interpretarError(error), 'Error al subir documento');
    } finally {
      setSubiendoSoporte(false);
    }
  }

  async function subirDocumento() {
    if (!nuevoArchivo) {
      notificacion.warning('Selecciona un archivo', 'Campo requerido');
      return;
    }
    setSubiendo(true);
    try {
      await subirDocumentoTipo(nuevoArchivo, tipoNuevoDocumento);
      setNuevoArchivo(null);
      notificacion.success('Documento agregado correctamente');
    } catch (error) {
      console.error('Error:', error);
      notificacion.error(interpretarError(error), 'Error al subir documento');
    } finally {
      setSubiendo(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);

    try {
      // 1. Actualizar registro de deserción
      const cambioDeRuta = tipoDesercion !== datosDesercion.tipo_desercion;
      const { error: errorDesercion } = await supabase
        .from('registros_desercion')
        .update({
          tipo_desercion: tipoDesercion,
          motivo_principal: motivo,
          motivo_otro: motivo === 'Otro' ? motivoOtro : null,
          observaciones: observaciones || null,
          // Cambiar de ruta (Justificada <-> Sin Justificar) cambia por completo el
          // significado del paso manual del checklist, así que se resetea a pendiente.
          ...(cambioDeRuta && {
            paso_manual_completado: false,
            paso_manual_completado_at: null,
            paso_manual_completado_por: null
          })
        })
        .eq('id', datosDesercion.id);

      if (errorDesercion) throw errorDesercion;

      // 2. Eliminar documentos marcados
      for (const docId of documentosEliminados) {
        const doc = datosDesercion.documentos?.find(d => d.id === docId);
        if (doc) {
          // Eliminar del storage
          try {
            const urlObj = new URL(doc.url_archivo);
            const pathParts = urlObj.pathname.split('/');
            const bucketIndex = pathParts.findIndex(part => part === 'evidencias');
            if (bucketIndex !== -1) {
              const filePath = pathParts.slice(bucketIndex + 1).join('/');
              await supabase.storage.from('evidencias').remove([filePath]);
            }
          } catch (err) {
            console.warn('No se pudo eliminar archivo del storage:', err);
          }
          // Eliminar de la BD
          await supabase.from('documentos_desercion').delete().eq('id', docId);
        }
      }

      // 3. Gestionar la multa según el tipo
      if (tipoDesercion === 'Sin Justificar') {
        if (multaExistente) {
          await supabase
            .from('multas_desercion')
            .update({ valor_total: parseFloat(valorMulta) || 0 })
            .eq('id', multaExistente.id);
        } else {
          await supabase
            .from('multas_desercion')
            .insert([{
              estudiante_id: datosDesercion.estudiante_id,
              registro_desercion_id: datosDesercion.id,
              valor_total: parseFloat(valorMulta) || 0,
              estado: 'pendiente'
            }]);
        }
      } else {
        if (multaExistente) {
          await supabase.from('multas_desercion').delete().eq('id', multaExistente.id);
        }
      }

      notificacion.success('Deserción actualizada correctamente');
      onActualizado();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      notificacion.error(interpretarError(error), 'Error al actualizar');
    } finally {
      setCargando(false);
    }
  }

  if (!isOpen || !datosDesercion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">✏️ Editar Deserción</h3>
              <p className="text-sm text-gray-600 mt-1">Estudiante: {datosDesercion.estudiante?.nombre_completo || 'N/A'}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Tipo de Deserción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Deserción *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoDesercion('Justificada')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    tipoDesercion === 'Justificada'
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  ✅ Justificada
                </button>
                <button
                  type="button"
                  onClick={() => setTipoDesercion('Sin Justificar')}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                    tipoDesercion === 'Sin Justificar'
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  ⚠️ Sin Justificar
                </button>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Motivo Principal *</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                <option value="">Seleccionar motivo...</option>
                {MOTIVOS_DESERCION.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {motivo === 'Otro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Especificar motivo *</label>
                <input type="text" value={motivoOtro} onChange={(e) => setMotivoOtro(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none" />
            </div>

            {/* Valor Multa (solo Sin Justificar) */}
            {tipoDesercion === 'Sin Justificar' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">💰 Valor de la Multa</label>
                <input type="number" value={valorMulta} onChange={(e) => setValorMulta(e.target.value)} min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
            )}

            {/* 🔥 GESTIÓN DE DOCUMENTOS */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">📎 Documentos Adjuntos</h4>
              
              {/* Documentos existentes */}
            {documentos.length > 0 && (
            <div className="space-y-2 mb-4">
                {documentos.map(doc => (
                <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">
                        {doc.tipo_documento === 'carta_retiro_ie' ? '📄' : 
                        doc.url_archivo?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️' : '📎'}
                    </span>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 truncate block">{doc.nombre_archivo}</span>
                        <span className="text-xs text-gray-400">
                        ({TIPOS_DOCUMENTO_DESERCION.find(t => t.value === doc.tipo_documento)?.label || doc.tipo_documento})
                        </span>
                    </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    {/* 🔥 BOTÓN DE PREVISUALIZACIÓN */}
                    <a
                        href={doc.url_archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Ver documento"
                    >
                        👁️
                    </a>
                    <button 
                        type="button" 
                        onClick={() => marcarDocumentoEliminar(doc.id)} 
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Eliminar documento"
                    >
                        🗑️
                    </button>
                    </div>
                </div>
                ))}
            </div>
            )}

              {/* Documentos marcados para eliminar */}
              {documentosEliminados.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">🗑️ Marcados para eliminar:</p>
                  <div className="space-y-1 opacity-50">
                    {documentosEliminados.map(docId => {
                      const doc = datosDesercion.documentos?.find(d => d.id === docId);
                      if (!doc) return null;
                      return (
                        <div key={docId} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                          <span className="text-sm text-gray-500 line-through truncate max-w-[200px]">{doc.nombre_archivo}</span>
                          <button type="button" onClick={() => restaurarDocumento(docId)} className="text-green-500 hover:text-green-700 text-sm">↩️</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Carta de Retiro (siempre disponible, igual que al reportar la deserción) */}
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">📄 Carta de Retiro (Institución Educativa)</p>
                <div className="flex items-center space-x-2">
                  <input type="file" accept=".pdf,image/*" onChange={(e) => setArchivoCartaRetiro(e.target.files[0])} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  <button type="button" onClick={subirCartaRetiro} disabled={subiendoCartaRetiro || !archivoCartaRetiro} className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">
                    {subiendoCartaRetiro ? '⏳' : '📤 Subir'}
                  </button>
                </div>
              </div>

              {/* Soporte de Causa Justificada (solo Justificada, igual que al reportar la deserción) */}
              {tipoDesercion === 'Justificada' && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">📎 Soporte de Causa Justificada</p>
                  <div className="flex items-center space-x-2">
                    <input type="file" accept=".pdf,image/*" onChange={(e) => setArchivoSoporte(e.target.files[0])} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <button type="button" onClick={subirSoporte} disabled={subiendoSoporte || !archivoSoporte} className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">
                      {subiendoSoporte ? '⏳' : '📤 Subir'}
                    </button>
                  </div>
                </div>
              )}

              {/* Otro documento (cartas de cobro, cierre de caso, certificados...) */}
              {tiposOtroDocumento.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">➕ Agregar otro documento</p>
                  <div className="space-y-2">
                    <select value={tipoNuevoDocumento} onChange={(e) => setTipoNuevoDocumento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {tiposOtroDocumento.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-2">
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setNuevoArchivo(e.target.files[0])} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      <button type="button" onClick={subirDocumento} disabled={subiendo || !nuevoArchivo} className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">
                        {subiendo ? '⏳' : '📤 Subir'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}