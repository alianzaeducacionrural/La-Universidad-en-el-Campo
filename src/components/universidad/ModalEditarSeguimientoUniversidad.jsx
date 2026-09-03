// =============================================
// MODAL: EDITAR SEGUIMIENTO DE UNIVERSIDAD
// =============================================

import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { TIPOS_SEGUIMIENTO_UNIVERSIDAD } from '../../utils/constants';
import { formatearFechaInput, interpretarError } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';

export default function ModalEditarSeguimientoUniversidad({ isOpen, onClose, onGuardar, seguimiento }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [tipo, setTipo] = useState('');
  const [evidenciasExistentes, setEvidenciasExistentes] = useState([]);
  const [evidenciasEliminadas, setEvidenciasEliminadas] = useState([]);
  const [nuevosArchivos, setNuevosArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (isOpen && seguimiento) {
      setTipo(seguimiento.tipo || '');
      setEvidenciasExistentes(seguimiento.evidencias || []);
      setEvidenciasEliminadas([]);
      setNuevosArchivos([]);
    }
  }, [isOpen, seguimiento]);

  const subirArchivos = async (seguimientoId) => {
    if (nuevosArchivos.length === 0) return [];
    setSubiendo(true);
    const urls = [];
    for (const { file: archivo } of nuevosArchivos) {
      if (archivo.size > 5 * 1024 * 1024) { notificacion.warning(`El archivo ${archivo.name} supera los 5MB`); continue; }
      if (!archivo.type.startsWith('image/')) { notificacion.warning(`El archivo ${archivo.name} no es una imagen`); continue; }
      const nombreArchivo = `${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const ruta = `seguimientos_universidad/${seguimientoId}/${nombreArchivo}`;
      const { error } = await supabase.storage.from('evidencias').upload(ruta, archivo);
      if (error) { notificacion.error(interpretarError(error), 'Error al subir evidencia'); continue; }
      const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(ruta);
      urls.push(urlData.publicUrl);
    }
    setSubiendo(false);
    return urls;
  };

  const eliminarArchivoStorage = async (url) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'evidencias');
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        await supabase.storage.from('evidencias').remove([filePath]);
      }
    } catch (error) {
      console.error('Error eliminando evidencia:', error);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const persona = formData.get('persona_nombre')?.trim();
    const fecha = formData.get('fecha');
    const resultado = formData.get('resultado')?.trim();

    if (!fecha) {
      notificacion.warning('Selecciona la fecha del seguimiento.', 'Fecha requerida');
      return;
    }
    if (!persona) {
      notificacion.warning('Indica quién realizó el seguimiento.', 'Campo requerido');
      return;
    }
    if (!tipo) {
      notificacion.warning('Selecciona el tipo de seguimiento.', 'Campo requerido');
      return;
    }
    if (!resultado) {
      notificacion.warning('Describe el resultado del seguimiento.', 'Campo requerido');
      return;
    }

    setCargando(true);

    for (const url of evidenciasEliminadas) await eliminarArchivoStorage(url);
    const urlsNuevas = nuevosArchivos.length > 0 ? await subirArchivos(seguimiento.id) : [];

    const datos = {
      persona_nombre: persona,
      tipo,
      fecha,
      resultado,
      evidencias: [...evidenciasExistentes.filter(url => !evidenciasEliminadas.includes(url)), ...urlsNuevas]
    };

    const resultadoGuardar = await onGuardar(seguimiento.id, datos);
    setCargando(false);
    setSubiendo(false);

    if (resultadoGuardar.success) {
      notificacion.success('Seguimiento actualizado correctamente');
      onClose();
    } else {
      notificacion.error(resultadoGuardar.error, 'Error al actualizar');
    }
  }

  const handleFileChange = (e) => {
    const nuevos = Array.from(e.target.files).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setNuevosArchivos(prev => [...prev, ...nuevos]);
    e.target.value = '';
  };
  const removerNuevoArchivo = (index) => setNuevosArchivos(prev => {
    const item = prev[index];
    if (item) URL.revokeObjectURL(item.preview);
    return prev.filter((_, i) => i !== index);
  });
  const marcarParaEliminar = (url) => { setEvidenciasEliminadas(prev => [...prev, url]); setEvidenciasExistentes(prev => prev.filter(u => u !== url)); };
  const restaurarEvidencia = (url) => { setEvidenciasEliminadas(prev => prev.filter(u => u !== url)); setEvidenciasExistentes(prev => [...prev, url]); };

  if (!isOpen || !seguimiento) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800">✏️ Editar Seguimiento</h3>
            <p className="text-sm text-gray-600 mt-1">Estudiante: <span className="font-medium">{seguimiento.estudiante?.nombre_completo || 'N/A'}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 Fecha *</label>
              <input type="date" name="fecha" required defaultValue={formatearFechaInput(seguimiento.fecha)} max={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">👤 Persona que realiza el seguimiento *</label>
              <input type="text" name="persona_nombre" required defaultValue={seguimiento.persona_nombre || ''} placeholder="Nombre de quien realizó el seguimiento" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🧭 Tipo de Seguimiento *</label>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_SEGUIMIENTO_UNIVERSIDAD.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`relative p-3 rounded-lg border-2 text-sm font-semibold transition-all text-center ${
                      tipo === t.value
                        ? 'border-primary bg-primary text-white shadow-md ring-2 ring-primary/30 scale-[1.03]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tipo === t.value && (
                      <span className="absolute -top-2 -right-2 bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shadow border border-primary">✓</span>
                    )}
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📋 Resultado *</label>
              <textarea name="resultado" required rows={4} defaultValue={seguimiento.resultado} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"></textarea>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">📸 Gestión de Evidencias</label>
              {evidenciasExistentes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">📌 Evidencias actuales:</p>
                  <div className="flex flex-wrap gap-2">
                    {evidenciasExistentes.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`Evidencia ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border" />
                        <button type="button" onClick={() => marcarParaEliminar(url)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {evidenciasEliminadas.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">🗑️ Marcadas para eliminar:</p>
                  <div className="flex flex-wrap gap-2 opacity-50">
                    {evidenciasEliminadas.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img src={url} alt={`Eliminada ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border grayscale" />
                        <button type="button" onClick={() => restaurarEvidencia(url)} className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-5 h-5 text-xs">↻</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" id="nuevas-evidencias-seguimiento-universidad" />
                <label htmlFor="nuevas-evidencias-seguimiento-universidad" className="cursor-pointer">
                  <div className="text-2xl mb-1">📷</div>
                  <p className="text-xs text-gray-600">Haz clic para agregar evidencias</p>
                </label>
              </div>
              {nuevosArchivos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {nuevosArchivos.map((item, i) => (
                    <div key={i} className="relative">
                      <img src={item.preview} alt={item.file.name} className="w-16 h-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => removerNuevoArchivo(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={cargando || subiendo} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
              {cargando || subiendo ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
