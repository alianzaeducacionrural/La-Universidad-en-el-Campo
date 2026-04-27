// =============================================
// MODAL: EDITAR REGISTRO DE DESERCIÓN (CON DOCUMENTOS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

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

const TIPOS_DOCUMENTO = [
  { value: 'carta_retiro_ie', label: 'Carta de Retiro (Institución Educativa)' },
  { value: 'certificado_vecindad', label: 'Certificado de Vecindad' },
  { value: 'certificado_medico', label: 'Certificado Médico' },
  { value: 'soporte_economico', label: 'Soporte Económico' },
  { value: 'otro', label: 'Otro Documento' }
];

export default function ModalEditarDesercion({ isOpen, onClose, datosDesercion, onActualizado }) {
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
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [tipoNuevoDocumento, setTipoNuevoDocumento] = useState('carta_retiro_ie');
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (isOpen && datosDesercion) {
      setTipoDesercion(datosDesercion.tipo_desercion || 'Sin Justificar');
      setMotivo(datosDesercion.motivo_principal || '');
      setMotivoOtro(datosDesercion.motivo_otro || '');
      setObservaciones(datosDesercion.observaciones || '');
      setDocumentos(datosDesercion.documentos || []);
      setDocumentosEliminados([]);
      setNuevoArchivo(null);
      cargarMulta();
    }
  }, [isOpen, datosDesercion]);

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

  // 🔥 Subir nuevo documento
  async function subirDocumento() {
    if (!nuevoArchivo) {
      notificacion.warning('Selecciona un archivo', 'Campo requerido');
      return;
    }

    setSubiendo(true);
    try {
      const nombreArchivo = `${Date.now()}_${nuevoArchivo.name.replace(/\s+/g, '_')}`;
      const ruta = `desercion/${datosDesercion.id}/${tipoNuevoDocumento}/${nombreArchivo}`;

      const { error: errorUpload } = await supabase.storage
        .from('evidencias')
        .upload(ruta, nuevoArchivo);

      if (errorUpload) throw errorUpload;

      const { data: urlData } = supabase.storage
        .from('evidencias')
        .getPublicUrl(ruta);

      // Insertar en la tabla documentos_desercion
      const { data: nuevoDoc, error: errorInsert } = await supabase
        .from('documentos_desercion')
        .insert([{
          registro_id: datosDesercion.id,
          tipo_documento: tipoNuevoDocumento,
          nombre_archivo: nuevoArchivo.name,
          url_archivo: urlData.publicUrl,
          tamanio_bytes: nuevoArchivo.size
        }])
        .select()
        .single();

      if (errorInsert) throw errorInsert;

      // Agregar a la lista local
      setDocumentos(prev => [...prev, nuevoDoc]);
      setNuevoArchivo(null);
      notificacion.success('Documento agregado correctamente');
    } catch (error) {
      console.error('Error:', error);
      notificacion.error(error.message, 'Error al subir documento');
    } finally {
      setSubiendo(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);

    try {
      // 1. Actualizar registro de deserción
      const { error: errorDesercion } = await supabase
        .from('registros_desercion')
        .update({
          tipo_desercion: tipoDesercion,
          motivo_principal: motivo,
          motivo_otro: motivo === 'Otro' ? motivoOtro : null,
          observaciones: observaciones || null
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
      notificacion.error(error.message, 'Error al actualizar');
    } finally {
      setCargando(false);
    }
  }

  if (!isOpen || !datosDesercion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">✏️ Editar Deserción</h3>
          <p className="text-sm text-gray-600 mt-1">Estudiante: {datosDesercion.estudiante?.nombre_completo || 'N/A'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Tipo de Deserción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Deserción *</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input type="radio" value="Justificada" checked={tipoDesercion === 'Justificada'} onChange={(e) => setTipoDesercion(e.target.value)} className="mr-2" />
                  <span className="text-sm">Justificada</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" value="Sin Justificar" checked={tipoDesercion === 'Sin Justificar'} onChange={(e) => setTipoDesercion(e.target.value)} className="mr-2" />
                  <span className="text-sm">Sin Justificar</span>
                </label>
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
                        ({TIPOS_DOCUMENTO.find(t => t.value === doc.tipo_documento)?.label || doc.tipo_documento})
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

              {/* Agregar nuevo documento */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">➕ Agregar nuevo documento</p>
                <div className="space-y-2">
                  <select value={tipoNuevoDocumento} onChange={(e) => setTipoNuevoDocumento(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="flex items-center space-x-2">
                    <input type="file" accept=".pdf,image/*" onChange={(e) => setNuevoArchivo(e.target.files[0])} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <button type="button" onClick={subirDocumento} disabled={subiendo || !nuevoArchivo} className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 whitespace-nowrap">
                      {subiendo ? '⏳' : '📤 Subir'}
                    </button>
                  </div>
                </div>
              </div>
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