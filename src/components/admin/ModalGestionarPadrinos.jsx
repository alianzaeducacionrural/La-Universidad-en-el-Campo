// =============================================
// MODAL: GESTIONAR PADRINOS DE UN GRUPO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function ModalGestionarPadrinos({ isOpen, onClose, grupo, onRecargar }) {
  const notificacion = useNotificacion();
  const [padrinosActuales, setPadrinosActuales] = useState([]);
  const [padrinosDisponibles, setPadrinosDisponibles] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [quitando, setQuitando] = useState(null);

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  async function cargarDatos() {
    setCargando(true);

    // Cargar padrinos actuales del grupo
    const { data: actuales } = await supabase
      .from('grupo_padrino')
      .select('padrino_id, padrinos:padrino_id (id, nombre_completo, correo)')
      .eq('grupo_id', grupo.id);

    if (actuales) {
      const padrinosFormateados = actuales.map(a => a.padrinos).filter(p => p);
      setPadrinosActuales(padrinosFormateados);
      setSeleccionados(padrinosFormateados.map(p => p.id));
    }

    // Cargar todos los padrinos disponibles
    const { data: todos } = await supabase
      .from('padrinos')
      .select('id, nombre_completo, correo')
      .eq('activo', true)
      .eq('rol', 'padrino')
      .order('nombre_completo');

    if (todos) {
      setPadrinosDisponibles(todos);
    }

    setCargando(false);
  }

  function togglePadrino(padrinoId) {
    setSeleccionados(prev =>
      prev.includes(padrinoId)
        ? prev.filter(id => id !== padrinoId)
        : [...prev, padrinoId]
    );
  }

  async function handleGuardar() {
    setCargando(true);

    // 1. Quitar padrinos que ya no están seleccionados
    const paraQuitar = padrinosActuales.filter(p => !seleccionados.includes(p.id));
    for (const padrino of paraQuitar) {
      await supabase
        .from('grupo_padrino')
        .delete()
        .eq('grupo_id', grupo.id)
        .eq('padrino_id', padrino.id);
    }

    // 2. Agregar padrinos nuevos
    const paraAgregar = seleccionados.filter(
      id => !padrinosActuales.find(p => p.id === id)
    );
    if (paraAgregar.length > 0) {
      const asignaciones = paraAgregar.map(padrinoId => ({
        grupo_id: grupo.id,
        padrino_id: padrinoId
      }));
      await supabase.from('grupo_padrino').insert(asignaciones);
    }

    setCargando(false);
    notificacion.success('Padrinos actualizados correctamente');
    onRecargar();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">👥 Gestionar Padrinos</h3>
          <p className="text-sm text-gray-600 mt-1">Grupo: {grupo.nombre}</p>
        </div>

        <div className="p-6">
          {cargando ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Padrinos actuales */}
              {padrinosActuales.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Padrinos actuales ({padrinosActuales.length}):
                  </p>
                  <div className="space-y-1">
                    {padrinosActuales.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{p.correo}</p>
                        </div>
                        <button
                          onClick={() => togglePadrino(p.id)}
                          className={`text-xs px-2 py-1 rounded-full ${
                            seleccionados.includes(p.id)
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {seleccionados.includes(p.id) ? 'Quitar' : 'Agregar'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agregar nuevos padrinos */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Agregar padrinos:
                </p>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {padrinosDisponibles
                    .filter(p => !padrinosActuales.find(pa => pa.id === p.id))
                    .map(p => (
                      <label key={p.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(p.id)}
                          onChange={() => togglePadrino(p.id)}
                          className="rounded border-gray-300 text-purple-600"
                        />
                        <div>
                          <p className="text-sm text-gray-800">{p.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{p.correo}</p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              <p className="text-sm text-gray-500">
                {seleccionados.length} padrino(s) seleccionado(s)
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {cargando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}