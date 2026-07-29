// =============================================
// MODAL: CRONOGRAMA DE UN GRUPO (EDICIÓN INDIVIDUAL)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, interpretarError } from '../../utils/helpers';

export default function ModalCronogramaGrupo({ isOpen, onClose, grupo, onActualizado }) {
  const notificacion = useNotificacion();
  const [fechas, setFechas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoModulo, setNuevoModulo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [moduloEditado, setModuloEditado] = useState('');

  useEffect(() => {
    if (isOpen && grupo) cargarFechas();
    else { setFechas([]); setNuevaFecha(''); setNuevoModulo(''); }
  }, [isOpen, grupo?.id]);

  async function cargarFechas() {
    setCargando(true);
    const { data } = await supabase
      .from('cronograma_clases')
      .select('id, fecha, modulo')
      .eq('grupo_id', grupo.id)
      .order('fecha');
    setFechas(data || []);
    setCargando(false);
  }

  async function agregarFecha(e) {
    e.preventDefault();
    if (!nuevaFecha) return;
    setGuardando(true);
    const { error } = await supabase.from('cronograma_clases').insert([{
      grupo_id: grupo.id,
      fecha: nuevaFecha,
      modulo: nuevoModulo.trim() || ''
    }]);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al agregar fecha');
    } else {
      setNuevaFecha('');
      setNuevoModulo('');
      cargarFechas();
      onActualizado?.();
    }
    setGuardando(false);
  }

  async function guardarModulo(id) {
    const { error } = await supabase
      .from('cronograma_clases')
      .update({ modulo: moduloEditado.trim() || '' })
      .eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al actualizar');
    } else {
      setEditandoId(null);
      cargarFechas();
      onActualizado?.();
    }
  }

  async function eliminarFecha(id) {
    if (!confirm('¿Eliminar esta fecha del cronograma?')) return;
    const { error } = await supabase.from('cronograma_clases').delete().eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    } else {
      cargarFechas();
      onActualizado?.();
    }
  }

  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-800">🗓️ Cronograma de Clases</h3>
          <p className="text-sm text-gray-500 mt-1">{grupo.nombre}</p>
        </div>

        <div className="p-6">
          <form onSubmit={agregarFecha} className="flex flex-wrap gap-2 mb-5 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
                required
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">Módulo (opcional)</label>
              <input
                type="text"
                value={nuevoModulo}
                onChange={e => setNuevoModulo(e.target.value)}
                placeholder="Ej: Matemáticas"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={guardando || !nuevaFecha}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              + Agregar
            </button>
          </form>

          {cargando ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : fechas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Este grupo aún no tiene fechas programadas</p>
          ) : (
            <div className="space-y-2">
              {fechas.map(f => (
                <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{formatearFecha(f.fecha)}</p>
                    {editandoId === f.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={moduloEditado}
                          onChange={e => setModuloEditado(e.target.value)}
                          placeholder="Módulo"
                          className="border border-gray-300 rounded px-2 py-1 text-xs flex-1"
                          autoFocus
                        />
                        <button onClick={() => guardarModulo(f.id)} className="text-xs text-green-600 font-medium">Guardar</button>
                        <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400">Cancelar</button>
                      </div>
                    ) : (
                      <p
                        className="text-xs text-gray-500 mt-0.5 cursor-pointer hover:text-primary"
                        onClick={() => { setEditandoId(f.id); setModuloEditado(f.modulo || ''); }}
                        title="Editar módulo"
                      >
                        {f.modulo ? `📚 ${f.modulo}` : '✏️ Sin módulo asignado (clic para editar)'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarFecha(f.id)}
                    className="text-red-500 hover:text-red-700 text-xs ml-3 flex-shrink-0"
                    title="Eliminar fecha"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
