// =============================================
// MODAL: MALLA DE HOMOLOGACIÓN DE UN TÉCNICO
// =============================================
// Configura, por técnico (programa), qué materias del colegio (con su
// grado, 4° a 11°) se homologan con créditos de ese técnico. Esta malla es
// la que luego usan las instituciones educativas para saber qué notas
// deben subir desde su portal.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';
import { GRADOS_ESCOLARES } from '../../utils/constants';

export default function ModalMallaHomologacion({ isOpen, onClose, programa }) {
  const notificacion = useNotificacion();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [nuevoGrado, setNuevoGrado] = useState(GRADOS_ESCOLARES[0]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && programa) cargarItems();
    else { setItems([]); setNuevaMateria(''); setNuevoGrado(GRADOS_ESCOLARES[0]); }
  }, [isOpen, programa?.id]);

  async function cargarItems() {
    setCargando(true);
    const { data } = await supabase
      .from('malla_homologacion')
      .select('id, materia, grado')
      .eq('programa_id', programa.id)
      .order('grado')
      .order('materia');
    setItems(data || []);
    setCargando(false);
  }

  async function agregarItem(e) {
    e.preventDefault();
    if (!nuevaMateria.trim()) return;
    setGuardando(true);
    const { error } = await supabase
      .from('malla_homologacion')
      .insert([{ programa_id: programa.id, materia: nuevaMateria.trim(), grado: nuevoGrado }]);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al agregar');
    } else {
      setNuevaMateria('');
      cargarItems();
    }
    setGuardando(false);
  }

  async function eliminarItem(id) {
    if (!confirm('¿Eliminar esta materia de la malla de homologación?')) return;
    const { error } = await supabase.from('malla_homologacion').delete().eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    } else {
      cargarItems();
    }
  }

  if (!isOpen || !programa) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl animate-scale-in">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800">🎓 Malla de Homologación</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{programa.nombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={agregarItem} className="flex flex-wrap gap-2 items-end mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Materia *</label>
              <input
                type="text"
                value={nuevaMateria}
                onChange={e => setNuevaMateria(e.target.value)}
                placeholder="Ej: Matemáticas"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grado *</label>
              <select value={nuevoGrado} onChange={e => setNuevoGrado(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                {GRADOS_ESCOLARES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button type="submit" disabled={guardando || !nuevaMateria.trim()} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
              + Agregar
            </button>
          </form>

          {cargando ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Este técnico aún no tiene materias de homologación configuradas</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-primary/10 text-primary-dark px-2 py-0.5 rounded-full">{item.grado}</span>
                    <span className="text-sm text-gray-800">{item.materia}</span>
                  </div>
                  <button onClick={() => eliminarItem(item.id)} className="text-gray-300 hover:text-red-500 transition p-1" title="Eliminar">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
