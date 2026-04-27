// =============================================
// MODAL: NUEVA/EDITAR UNIVERSIDAD
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function ModalNuevaUniversidad({ isOpen, onClose, universidad, onGuardado }) {
  const notificacion = useNotificacion();
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && universidad) {
      setNombre(universidad.nombre);
    } else {
      setNombre('');
    }
  }, [isOpen, universidad]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    
    setCargando(true);
    
    let error;
    if (universidad) {
      // Editar
      const { error: updateError } = await supabase
        .from('universidades')
        .update({ nombre: nombre.trim() })
        .eq('id', universidad.id);
      error = updateError;
    } else {
      // Crear
      const { error: insertError } = await supabase
        .from('universidades')
        .insert([{ nombre: nombre.trim() }]);
      error = insertError;
    }
    
    setCargando(false);
    
    if (error) {
      notificacion.error(error.message, 'Error al guardar');
    } else {
      notificacion.success(
        universidad 
          ? 'Universidad actualizada correctamente' 
          : 'Universidad creada correctamente'
      );
      onGuardado();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            {universidad ? '✏️ Editar Universidad' : '➕ Nueva Universidad'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Universidad
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Universidad de Caldas"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              required
              autoFocus
            />
          </div>
          
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {cargando ? 'Guardando...' : (universidad ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}