// =============================================
// MODAL: REGISTRAR SEGUIMIENTO (CORREGIDO)
// =============================================

import { useState } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { TIPOS_GESTION, CAUSAS_AUSENCIA } from '../../utils/constants';
import { supabase } from '../../lib/supabaseClient';

export default function ModalSeguimiento({ isOpen, onClose, onGuardar, estudiante }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const fechaHoy = new Date().toISOString().split('T')[0];

  const subirArchivos = async (seguimientoId) => {
    if (archivos.length === 0) return [];
    setSubiendo(true);
    const urls = [];
    
    for (const archivo of archivos) {
      if (archivo.size > 5 * 1024 * 1024) {
        notificacion.warning(`El archivo ${archivo.name} supera los 5MB`);
        continue;
      }
      if (!archivo.type.startsWith('image/')) {
        notificacion.warning(`El archivo ${archivo.name} no es una imagen`);
        continue;
      }
      
      const nombreArchivo = `${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const ruta = `seguimientos/${seguimientoId}/${nombreArchivo}`;
      
      const { error } = await supabase.storage.from('evidencias').upload(ruta, archivo);
      if (!error) {
        const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(ruta);
        urls.push(urlData.publicUrl);
      }
    }
    
    setSubiendo(false);
    return urls;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    
    const formData = new FormData(e.target);
    const datos = {
      estudiante_id: estudiante.id,
      tipo_gestion: formData.get('tipo'),
      causa_ausencia: formData.get('causa') || null,
      resultado: formData.get('resultado'),
      fecha_contacto: formData.get('fecha_contacto')
    };
    
    console.log('📝 Enviando datos de seguimiento:', datos);
    
    // 🔥 CORRECCIÓN: Validar que onGuardar devuelva el formato correcto
    const resultado = await onGuardar(datos);
    
    console.log('📊 Resultado de onGuardar:', resultado);
    
    if (resultado && resultado.success) {
      // Subir archivos si hay
      if (archivos.length > 0 && resultado.data?.id) {
        const urls = await subirArchivos(resultado.data.id);
        if (urls.length > 0) {
          await supabase.from('seguimientos').update({ evidencias: urls }).eq('id', resultado.data.id);
        }
      }
      
      notificacion.success(`Seguimiento registrado para ${estudiante.nombre_completo}`);
      onClose();
      setArchivos([]);
    } else {
      const mensajeError = resultado?.error || 'Error desconocido al guardar';
      console.error('❌ Error en onGuardar:', mensajeError);
      notificacion.error(mensajeError, 'Error al guardar');
    }
    
    setCargando(false);
  }

  const handleFileChange = (e) => {
    setArchivos(prev => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const removerArchivo = (index) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen || !estudiante) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">📝 Registrar Seguimiento</h3>
          <p className="text-sm text-gray-600 mt-1">Estudiante: <span className="font-medium">{estudiante.nombre_completo}</span></p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 Fecha de Contacto *</label>
              <input type="date" name="fecha_contacto" required defaultValue={fechaHoy} max={fechaHoy} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📞 Tipo de Gestión *</label>
              <select name="tipo" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                <option value="">Seleccionar...</option>
                {TIPOS_GESTION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Causa de Ausencia</label>
              <select name="causa" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                <option value="">Seleccionar (opcional)...</option>
                {CAUSAS_AUSENCIA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📋 Resultado *</label>
              <textarea name="resultado" required rows={4} placeholder="Describa detalladamente..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📸 Evidencias (Opcional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" id="evidencias-input" />
                <label htmlFor="evidencias-input" className="cursor-pointer block">
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-sm text-gray-600">Haz clic para seleccionar imágenes</p>
                </label>
              </div>
              {archivos.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {archivos.map((archivo, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                      <span className="text-sm truncate">{archivo.name}</span>
                      <button type="button" onClick={() => removerArchivo(index)} className="text-red-500">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={cargando || subiendo} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {cargando || subiendo ? 'Guardando...' : 'Guardar Seguimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}