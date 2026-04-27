// =============================================
// MODAL: ASIGNAR GRUPO A PADRINO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ModalAsignarGrupo({ isOpen, onClose, padrino, gruposActuales, onAsignado }) {
  const [gruposDisponibles, setGruposDisponibles] = useState([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarGruposDisponibles();
    }
  }, [isOpen]);

  async function cargarGruposDisponibles() {
    setCargando(true);
    
    // Obtener TODOS los grupos
    const { data: todosGrupos } = await supabase
      .from('grupos')
      .select('id, nombre, universidad, programa, cohorte')
      .order('nombre');
    
    // Filtrar los que NO están ya asignados
    const disponibles = todosGrupos?.filter(g => !gruposActuales.includes(g.id)) || [];
    
    setGruposDisponibles(disponibles);
    setCargando(false);
  }

  async function handleAsignar() {
    if (gruposSeleccionados.length === 0) {
      alert('Selecciona al menos un grupo');
      return;
    }
    
    setCargando(true);
    
    const asignaciones = gruposSeleccionados.map(grupoId => ({
      grupo_id: grupoId,
      padrino_id: padrino.padrino_id
    }));
    
    const { error } = await supabase
      .from('grupo_padrino')
      .insert(asignaciones);
    
    setCargando(false);
    
    if (error) {
      alert('Error al asignar: ' + error.message);
    } else {
      onAsignado();
      onClose();
      setGruposSeleccionados([]);
    }
  }

  const toggleGrupo = (grupoId) => {
    setGruposSeleccionados(prev => 
      prev.includes(grupoId) 
        ? prev.filter(id => id !== grupoId) 
        : [...prev, grupoId]
    );
  };

  const gruposFiltrados = gruposDisponibles.filter(g => 
    g.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.universidad.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            ➕ Asignar Grupo a {padrino.nombre_completo}
          </h3>
        </div>
        
        <div className="p-6">
          {/* Buscador */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar grupo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
            />
          </div>
          
          {cargando && gruposDisponibles.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <p className="text-gray-500 mt-2">Cargando grupos...</p>
            </div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {busqueda ? 'No se encontraron grupos' : 'No hay grupos disponibles para asignar'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {gruposFiltrados.map(grupo => (
                <label 
                  key={grupo.id} 
                  className="flex items-start p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={gruposSeleccionados.includes(grupo.id)}
                    onChange={() => toggleGrupo(grupo.id)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{grupo.nombre}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        🎓 {grupo.universidad}
                      </span>
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        📚 {grupo.programa}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        📅 {grupo.cohorte}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-600">
            Grupos seleccionados: <span className="font-bold text-purple-700">{gruposSeleccionados.length}</span>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button 
            onClick={handleAsignar} 
            disabled={cargando || gruposSeleccionados.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {cargando ? 'Asignando...' : 'Asignar Seleccionados'}
          </button>
        </div>
      </div>
    </div>
  );
}