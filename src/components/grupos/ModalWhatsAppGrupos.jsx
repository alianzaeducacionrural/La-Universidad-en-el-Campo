// =============================================
// MODAL: CONFIGURAR ENLACES DE WHATSAPP DEL GRUPO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function ModalWhatsAppGrupos({ isOpen, onClose, grupo, padrino }) {
  const notificacion = useNotificacion();
  const [enlaceEstudiantes, setEnlaceEstudiantes] = useState('');
  const [enlaceAcudientes, setEnlaceAcudientes] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && grupo) {
      cargarEnlaces();
    }
  }, [isOpen, grupo]);

  async function cargarEnlaces() {
    setCargando(true);
    
    const { data } = await supabase
      .from('whatsapp_grupos')
      .select('*')
      .eq('grupo_id', grupo.id);
    
    if (data) {
      const estudiantes = data.find(e => e.tipo_grupo === 'estudiantes');
      const acudientes = data.find(e => e.tipo_grupo === 'acudientes');
      
      setEnlaceEstudiantes(estudiantes?.enlace || '');
      setEnlaceAcudientes(acudientes?.enlace || '');
    }
    
    setCargando(false);
  }

  async function handleGuardar() {
    setGuardando(true);
    
    // Guardar o actualizar enlace de estudiantes
    if (enlaceEstudiantes.trim()) {
      await supabase
        .from('whatsapp_grupos')
        .upsert({
          grupo_id: grupo.id,
          tipo_grupo: 'estudiantes',
          enlace: enlaceEstudiantes.trim(),
          creado_por: padrino?.id
        }, { onConflict: 'grupo_id,tipo_grupo' });
    } else {
      // Si está vacío, eliminar el enlace existente
      await supabase
        .from('whatsapp_grupos')
        .delete()
        .eq('grupo_id', grupo.id)
        .eq('tipo_grupo', 'estudiantes');
    }
    
    // Guardar o actualizar enlace de acudientes
    if (enlaceAcudientes.trim()) {
      await supabase
        .from('whatsapp_grupos')
        .upsert({
          grupo_id: grupo.id,
          tipo_grupo: 'acudientes',
          enlace: enlaceAcudientes.trim(),
          creado_por: padrino?.id
        }, { onConflict: 'grupo_id,tipo_grupo' });
    } else {
      await supabase
        .from('whatsapp_grupos')
        .delete()
        .eq('grupo_id', grupo.id)
        .eq('tipo_grupo', 'acudientes');
    }
    
    setGuardando(false);
    notificacion.success('Enlaces de WhatsApp actualizados correctamente');
    onClose();
  }

  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">💬 Configurar Grupos de WhatsApp</h3>
          <p className="text-sm text-gray-600 mt-1">Grupo: {grupo.nombre}</p>
        </div>

        <div className="p-6 space-y-4">
          {cargando ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando enlaces...</p>
            </div>
          ) : (
            <>
              {/* Grupo de Estudiantes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👥 Grupo de WhatsApp - Estudiantes
                </label>
                <input
                  type="text"
                  value={enlaceEstudiantes}
                  onChange={(e) => setEnlaceEstudiantes(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pega el enlace de invitación del grupo de WhatsApp de estudiantes
                </p>
              </div>

              {/* Grupo de Acudientes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👨‍👩‍👧 Grupo de WhatsApp - Acudientes
                </label>
                <input
                  type="text"
                  value={enlaceAcudientes}
                  onChange={(e) => setEnlaceAcudientes(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pega el enlace de invitación del grupo de WhatsApp de acudientes
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700">
                  💡 <strong>Consejo:</strong> Estos enlaces serán visibles para todos los padrinos asignados a este grupo.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando || cargando}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : '💾 Guardar Enlaces'}
          </button>
        </div>
      </div>
    </div>
  );
}