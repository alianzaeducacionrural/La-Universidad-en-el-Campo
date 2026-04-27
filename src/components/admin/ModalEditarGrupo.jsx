// =============================================
// MODAL: EDITAR INFORMACIÓN DEL GRUPO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { COHORTES } from '../../utils/constants';

export default function ModalEditarGrupo({ isOpen, onClose, grupo, onRecargar }) {
  const notificacion = useNotificacion();
  const [nombre, setNombre] = useState('');
  const [universidad, setUniversidad] = useState('');
  const [programa, setPrograma] = useState('');
  const [cohorte, setCohorte] = useState('');
  const [universidades, setUniversidades] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && grupo) {
      setNombre(grupo.nombre);
      setUniversidad(grupo.universidad);
      setPrograma(grupo.programa);
      setCohorte(grupo.cohorte);
      cargarUniversidades();
    }
  }, [isOpen, grupo]);

  async function cargarUniversidades() {
    const { data } = await supabase.from('universidades').select('*').order('nombre');
    if (data) setUniversidades(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);

    const { error } = await supabase
      .from('grupos')
      .update({ nombre, universidad, programa, cohorte })
      .eq('id', grupo.id);

    setCargando(false);

    if (error) {
      notificacion.error(error.message, 'Error al actualizar');
    } else {
      notificacion.success('Grupo actualizado correctamente');
      onRecargar();
      onClose();
    }
  }

  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">✏️ Editar Grupo</h3>
          <p className="text-sm text-gray-600 mt-1">{grupo.nombre}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Universidad *</label>
              <select
                value={universidad}
                onChange={(e) => setUniversidad(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">Seleccionar...</option>
                {universidades.map(u => (
                  <option key={u.id} value={u.nombre}>{u.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programa *</label>
              <input
                type="text"
                value={programa}
                onChange={(e) => setPrograma(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cohorte *</label>
              <select
                value={cohorte}
                onChange={(e) => setCohorte(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="">Seleccionar...</option>
                {COHORTES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}