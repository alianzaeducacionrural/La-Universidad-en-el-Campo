// =============================================
// MODAL: REGISTRAR SEGUIMIENTO (CORREGIDO)
// =============================================

import { useState } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { TIPOS_GESTION, CAUSAS_AUSENCIA, TIPOS_SEGUIMIENTO } from '../../utils/constants';
import { supabase } from '../../lib/supabaseClient';

export default function ModalSeguimiento({ isOpen, onClose, onGuardar, estudiante, conInasistencia = false }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [cerrarInasistencia, setCerrarInasistencia] = useState(true);
  const [tipoSeguimiento, setTipoSeguimiento] = useState('inasistencia');
  const fechaHoy = new Date().toISOString().split('T')[0];

  const subirArchivos = async (seguimientoId) => {
    if (archivos.length === 0) return [];
    setSubiendo(true);
    const urls = [];

    for (const { file: archivo } of archivos) {
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

    const formData = new FormData(e.target);
    const tipo = formData.get('tipo');
    const resultado_texto = formData.get('resultado')?.trim();
    const fecha = formData.get('fecha_contacto');

    if (!fecha) {
      notificacion.warning('Selecciona la fecha en que se realizó el contacto.', 'Fecha requerida');
      return;
    }
    if (!tipo) {
      notificacion.warning('Selecciona el tipo de gestión (llamada, WhatsApp, correo, etc.).', 'Tipo de gestión requerido');
      return;
    }
    if (!resultado_texto) {
      notificacion.warning('Describe el resultado del contacto con el estudiante.', 'Resultado requerido');
      return;
    }

    setCargando(true);

    const datos = {
      estudiante_id: estudiante.id,
      tipo_gestion: tipo,
      tipo_seguimiento: conInasistencia ? 'inasistencia' : tipoSeguimiento,
      causa_ausencia: (!conInasistencia && tipoSeguimiento === 'rendimiento_academico') ? null : (formData.get('causa') || null),
      resultado: resultado_texto,
      fecha_contacto: fecha,
      ...(conInasistencia && { cerrarInasistencia })
    };

    const resultado = await onGuardar(datos);
    
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
      archivos.forEach(a => URL.revokeObjectURL(a.preview));
      setArchivos([]);
    } else {
      const mensajeError = resultado?.error || 'Error desconocido al guardar';
      console.error('❌ Error en onGuardar:', mensajeError);
      notificacion.error(mensajeError, 'Error al guardar');
    }
    
    setCargando(false);
  }

  const handleFileChange = (e) => {
    const nuevos = Array.from(e.target.files).map(file => ({ file, preview: URL.createObjectURL(file) }));
    setArchivos(prev => [...prev, ...nuevos]);
    e.target.value = '';
  };

  const removerArchivo = (index) => {
    setArchivos(prev => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  if (!isOpen || !estudiante) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">📝 Registrar Seguimiento</h3>
              <p className="text-sm text-gray-600 mt-1">Estudiante: <span className="font-medium">{estudiante.nombre_completo}</span></p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
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
            
            {!conInasistencia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Seguimiento *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_SEGUIMIENTO.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipoSeguimiento(t.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition text-center ${
                        tipoSeguimiento === t.value
                          ? 'border-primary bg-primary/5 text-primary-dark'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(conInasistencia || tipoSeguimiento === 'inasistencia') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🔍 Causa de Ausencia</label>
                <select name="causa" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                  <option value="">Seleccionar (opcional)...</option>
                  {CAUSAS_AUSENCIA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📋 Resultado *</label>
              <textarea name="resultado" required rows={4} placeholder="Describa detalladamente..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base resize-none"></textarea>
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
                <div className="mt-3 flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {archivos.map((item, index) => (
                    <div key={index} className="relative">
                      <img src={item.preview} alt={item.file.name} className="w-16 h-16 object-cover rounded-lg border" />
                      <button type="button" onClick={() => removerArchivo(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {conInasistencia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">¿Se resolvió la situación del estudiante?</label>
                <div className="flex flex-col space-y-2">
                  <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition ${cerrarInasistencia ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="cerrar_inasistencia"
                      checked={cerrarInasistencia}
                      onChange={() => setCerrarInasistencia(true)}
                      className="mt-0.5 accent-green-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">Sí, cerrar esta inasistencia</span>
                      <p className="text-xs text-gray-500">Se marcará como resuelta y saldrá de las pendientes</p>
                    </div>
                  </label>
                  <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition ${!cerrarInasistencia ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="cerrar_inasistencia"
                      checked={!cerrarInasistencia}
                      onChange={() => setCerrarInasistencia(false)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">No, mantener como pendiente</span>
                      <p className="text-xs text-gray-500">Ej: no pude comunicarme, sigue en seguimiento</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
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