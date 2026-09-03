// =============================================
// MODAL: REGISTRAR SEGUIMIENTO DE UNIVERSIDAD
// =============================================
// Seguimiento que un coordinador de universidad hace sobre un estudiante
// (rendimiento académico, bienestar, psicosocial, socioemocional o
// administrativo) — independiente de los seguimientos que hacen los
// padrinos (ver ModalSeguimiento.jsx / tabla `seguimientos`).

import { useState } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { TIPOS_SEGUIMIENTO_UNIVERSIDAD } from '../../utils/constants';
import { supabase } from '../../lib/supabaseClient';

export default function ModalRegistrarSeguimientoUniversidad({ isOpen, onClose, onGuardar, estudiante, usuario }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [tipo, setTipo] = useState('');
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
      const ruta = `seguimientos_universidad/${seguimientoId}/${nombreArchivo}`;

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

    const datos = {
      estudiante_id: estudiante.id,
      grupo_id: estudiante.grupo_id || null,
      usuario_universidad_id: usuario?.id || null,
      persona_nombre: persona,
      tipo,
      fecha,
      resultado
    };

    const resultadoGuardar = await onGuardar(datos);

    if (resultadoGuardar && resultadoGuardar.success) {
      if (archivos.length > 0 && resultadoGuardar.data?.id) {
        const urls = await subirArchivos(resultadoGuardar.data.id);
        if (urls.length > 0) {
          await supabase.from('seguimientos_universidad').update({ evidencias: urls }).eq('id', resultadoGuardar.data.id);
        }
      }

      notificacion.success(`Seguimiento registrado para ${estudiante.nombre_completo}`);
      archivos.forEach(a => URL.revokeObjectURL(a.preview));
      setArchivos([]);
      setTipo('');
      onClose();
    } else {
      notificacion.error(resultadoGuardar?.error || 'Error desconocido al guardar', 'Error al guardar');
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
              <h3 className="text-lg font-bold text-gray-800">🎓 Registrar Seguimiento</h3>
              <p className="text-sm text-gray-600 mt-1">Estudiante: <span className="font-medium">{estudiante.nombre_completo}</span></p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📅 Fecha *</label>
              <input type="date" name="fecha" required defaultValue={fechaHoy} max={fechaHoy} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">👤 Persona que realiza el seguimiento *</label>
              <input
                type="text"
                name="persona_nombre"
                required
                placeholder="Nombre de quien realizó el seguimiento"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              />
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
              {!tipo && <p className="text-xs text-gray-400 mt-1">Selecciona un tipo</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📋 Resultado *</label>
              <textarea name="resultado" required rows={4} placeholder="Describa el resultado del seguimiento..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">📸 Evidencias (Opcional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" id="evidencias-seguimiento-universidad-input" />
                <label htmlFor="evidencias-seguimiento-universidad-input" className="cursor-pointer block">
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
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={cargando || subiendo} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">
              {cargando || subiendo ? 'Guardando...' : 'Guardar Seguimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
