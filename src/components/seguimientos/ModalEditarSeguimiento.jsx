// =============================================
// MODAL: EDITAR SEGUIMIENTO (CON NOTIFICACIONES)
// =============================================

import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { TIPOS_GESTION, CAUSAS_AUSENCIA } from '../../utils/constants';
import { formatearFechaInput } from '../../utils/helpers';
import { supabase } from '../../lib/supabaseClient';

export default function ModalEditarSeguimiento({ isOpen, onClose, onGuardar, seguimiento }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [evidenciasExistentes, setEvidenciasExistentes] = useState([]);
  const [evidenciasEliminadas, setEvidenciasEliminadas] = useState([]);
  const [nuevosArchivos, setNuevosArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => { if (isOpen && seguimiento) { setEvidenciasExistentes(seguimiento.evidencias || []); setEvidenciasEliminadas([]); setNuevosArchivos([]); } }, [isOpen, seguimiento]);

  const subirArchivos = async (seguimientoId) => {
    if (nuevosArchivos.length === 0) return [];
    setSubiendo(true);
    const urls = [];
    for (const archivo of nuevosArchivos) {
      if (archivo.size > 5 * 1024 * 1024) { notificacion.warning(`El archivo ${archivo.name} supera los 5MB`); continue; }
      if (!archivo.type.startsWith('image/')) { notificacion.warning(`El archivo ${archivo.name} no es una imagen`); continue; }
      const nombreArchivo = `${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const ruta = `seguimientos/${seguimientoId}/${nombreArchivo}`;
      const { error } = await supabase.storage.from('evidencias').upload(ruta, archivo);
      if (!error) { const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(ruta); urls.push(urlData.publicUrl); }
    }
    setSubiendo(false);
    return urls;
  };

  const eliminarArchivoStorage = async (url) => {
    try { const urlObj = new URL(url); const pathParts = urlObj.pathname.split('/'); const bucketIndex = pathParts.findIndex(part => part === 'evidencias'); if (bucketIndex !== -1) { const filePath = pathParts.slice(bucketIndex + 1).join('/'); await supabase.storage.from('evidencias').remove([filePath]); } } catch (error) { console.error('Error eliminando:', error); }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    const formData = new FormData(e.target);
    const datos = { tipo_gestion: formData.get('tipo'), causa_ausencia: formData.get('causa') || null, resultado: formData.get('resultado'), fecha_contacto: formData.get('fecha_contacto') };
    for (const url of evidenciasEliminadas) await eliminarArchivoStorage(url);
    const urlsNuevas = nuevosArchivos.length > 0 ? await subirArchivos(seguimiento.id) : [];
    datos.evidencias = [...evidenciasExistentes.filter(url => !evidenciasEliminadas.includes(url)), ...urlsNuevas];
    if (datos.evidencias.length === 0) datos.evidencias = null;
    const resultado = await onGuardar(seguimiento.id, datos);
    setCargando(false); setSubiendo(false);
    if (resultado.success) { notificacion.success('Seguimiento actualizado correctamente'); onClose(); }
    else { notificacion.error(resultado.error, 'Error al actualizar'); }
  }

  const handleFileChange = (e) => { setNuevosArchivos(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = ''; };
  const removerNuevoArchivo = (index) => setNuevosArchivos(prev => prev.filter((_, i) => i !== index));
  const marcarParaEliminar = (url) => { setEvidenciasEliminadas(prev => [...prev, url]); setEvidenciasExistentes(prev => prev.filter(u => u !== url)); };
  const restaurarEvidencia = (url) => { setEvidenciasEliminadas(prev => prev.filter(u => u !== url)); setEvidenciasExistentes(prev => [...prev, url]); };

  if (!isOpen || !seguimiento) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b"><h3 className="text-lg font-bold">✏️ Editar Seguimiento</h3><p className="text-sm text-gray-600">Estudiante: <span className="font-medium">{seguimiento.estudiante?.nombre_completo || 'N/A'}</span></p></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div><label className="block text-sm mb-2">📅 Fecha de Contacto *</label><input type="date" name="fecha_contacto" required defaultValue={formatearFechaInput(seguimiento.fecha_contacto)} className="w-full border rounded-lg px-3 py-2.5" /></div>
            <div><label className="block text-sm mb-2">📞 Tipo de Gestión *</label><select name="tipo" required defaultValue={seguimiento.tipo_gestion} className="w-full border rounded-lg px-3 py-2.5"><option value="">Seleccionar...</option>{TIPOS_GESTION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label className="block text-sm mb-2">🔍 Causa de Ausencia</label><select name="causa" defaultValue={seguimiento.causa_ausencia || ''} className="w-full border rounded-lg px-3 py-2.5"><option value="">Seleccionar (opcional)...</option>{CAUSAS_AUSENCIA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <div><label className="block text-sm mb-2">📋 Resultado *</label><textarea name="resultado" required rows={4} defaultValue={seguimiento.resultado} className="w-full border rounded-lg px-3 py-2.5 resize-none"></textarea></div>
            <div className="border-t pt-4"><label className="block text-sm mb-3">📸 Gestión de Evidencias</label>
              {evidenciasExistentes.length > 0 && <div className="mb-4"><p className="text-xs text-gray-600 mb-2">📌 Evidencias actuales:</p><div className="flex flex-wrap gap-2">{evidenciasExistentes.map((url, idx) => <div key={idx} className="relative"><img src={url} alt={`Evidencia ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border" /><button type="button" onClick={() => marcarParaEliminar(url)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button></div>)}</div></div>}
              {evidenciasEliminadas.length > 0 && <div className="mb-4"><p className="text-xs text-gray-400 mb-2">🗑️ Marcadas para eliminar:</p><div className="flex flex-wrap gap-2 opacity-50">{evidenciasEliminadas.map((url, idx) => <div key={idx} className="relative"><img src={url} alt={`Eliminada ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border grayscale" /><button type="button" onClick={() => restaurarEvidencia(url)} className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-5 h-5 text-xs">↻</button></div>)}</div></div>}
              <div className="mt-3"><p className="text-xs text-gray-600 mb-2">➕ Agregar nuevas evidencias:</p><div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center"><input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" id="nuevas-evidencias" /><label htmlFor="nuevas-evidencias" className="cursor-pointer"><div className="text-2xl mb-1">📷</div><p className="text-xs text-gray-600">Haz clic para agregar</p></label></div>
                {nuevosArchivos.length > 0 && <div className="mt-3 space-y-2">{nuevosArchivos.map((archivo, i) => <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"><span className="text-xs truncate">{archivo.name}</span><button type="button" onClick={() => removerNuevoArchivo(i)} className="text-red-500">✕</button></div>)}</div>}
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700">Cancelar</button><button type="submit" disabled={cargando || subiendo} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">{cargando || subiendo ? 'Guardando...' : 'Guardar Cambios'}</button></div>
        </form>
      </div>
    </div>
  );
}