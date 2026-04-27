// =============================================
// COMPONENTE: GESTIÓN DE UNIVERSIDADES Y PROGRAMAS
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import UniversidadCRUDCard from './UniversidadCRUDCard';
import ModalNuevaUniversidad from './ModalNuevaUniversidad';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotificacion } from '../../context/NotificacionContext';

export default function GestionUniversidades() {
  const notificacion = useNotificacion();
  const [universidades, setUniversidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [universidadEditando, setUniversidadEditando] = useState(null);
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    cargarUniversidades();
  }, [recargar]);

  async function cargarUniversidades() {
    setCargando(true);
    
    const { data } = await supabase
      .from('universidades')
      .select('*')
      .order('nombre');
    
    if (data) setUniversidades(data);
    setCargando(false);
  }

  async function handleEliminarUniversidad(id, nombre) {
  console.log('🗑️ Intentando eliminar universidad:', { id, nombre });
  
  // Verificar si tiene programas
  const { count } = await supabase
    .from('programas')
    .select('*', { count: 'exact', head: true })
    .eq('universidad_id', id);
  
  console.log('📊 Programas asociados:', count);
  
  if (count > 0) {
    notificacion.error(
      `No se puede eliminar "${nombre}" porque tiene ${count} programa(s) asociado(s).`,
      'No se puede eliminar'
    );
    return;
  }
  
  if (!confirm(`¿Estás seguro de eliminar la universidad "${nombre}"?`)) return;
  
  const { error } = await supabase.from('universidades').delete().eq('id', id);
  
  console.log('📊 Resultado delete universidad:', { error });
  
  if (error) {
    notificacion.error(error.message, 'Error al eliminar');
  } else {
    notificacion.success(`Universidad "${nombre}" eliminada correctamente`);
    setRecargar(prev => prev + 1);
  }
}

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando universidades..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center">
              <span className="text-xl mr-2">🏫</span>
              Gestión de Universidades y Programas
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Administra las universidades aliadas y sus programas técnicos
            </p>
          </div>
          <button
            onClick={() => setModalNueva(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Nueva Universidad</span>
          </button>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {universidades.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay universidades registradas. Haz clic en "Nueva Universidad" para agregar una.
          </div>
        ) : (
          universidades.map(universidad => (
            <UniversidadCRUDCard
              key={universidad.id}
              universidad={universidad}
              onEliminar={handleEliminarUniversidad}
              onRecargar={() => setRecargar(prev => prev + 1)}
            />
          ))
        )}
      </div>
      
      {/* Modal Nueva/Editar Universidad */}
      <ModalNuevaUniversidad
        isOpen={modalNueva || universidadEditando !== null}
        onClose={() => {
          setModalNueva(false);
          setUniversidadEditando(null);
        }}
        universidad={universidadEditando}
        onGuardado={() => {
          setRecargar(prev => prev + 1);
          setModalNueva(false);
          setUniversidadEditando(null);
        }}
      />
    </div>
  );
}