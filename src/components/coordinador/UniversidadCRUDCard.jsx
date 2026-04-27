// =============================================
// COMPONENTE: TARJETA DE UNIVERSIDAD (CRUD) - CORREGIDO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function UniversidadCRUDCard({ universidad, onEliminar, onRecargar }) {
  const notificacion = useNotificacion();
  const [programas, setProgramas] = useState([]);
  const [totalProgramas, setTotalProgramas] = useState(0); // 🔥 NUEVO: total sin expandir
  const [expandido, setExpandido] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [modalPrograma, setModalPrograma] = useState(false);
  const [nuevoProgramaNombre, setNuevoProgramaNombre] = useState('');

  // 🔥 Cargar total de programas al montar
  useEffect(() => {
    cargarTotalProgramas();
  }, []);

  async function cargarTotalProgramas() {
    const { count } = await supabase
      .from('programas')
      .select('*', { count: 'exact', head: true })
      .eq('universidad_id', universidad.id);
    
    if (count !== null) setTotalProgramas(count);
  }

  useEffect(() => {
    if (expandido && !datosCargados) {
      cargarProgramas();
    }
  }, [expandido, datosCargados]);

  async function cargarProgramas() {
    setCargando(true);
    const { data } = await supabase
      .from('programas')
      .select('*')
      .eq('universidad_id', universidad.id)
      .order('nombre');
    if (data) {
      setProgramas(data);
      setTotalProgramas(data.length); // Actualizar total
    }
    setDatosCargados(true);
    setCargando(false);
  }

  function toggleExpandir() {
    if (!expandido && !datosCargados) {
      cargarProgramas();
    }
    setExpandido(!expandido);
  }

  async function handleAgregarPrograma(e) {
    e.preventDefault();
    if (!nuevoProgramaNombre.trim()) return;
    
    const { error } = await supabase
      .from('programas')
      .insert([{ nombre: nuevoProgramaNombre.trim(), universidad_id: universidad.id }]);
    
    if (error) {
      notificacion.error(error.message, 'Error al agregar');
    } else {
      notificacion.success('Programa agregado correctamente');
      setNuevoProgramaNombre('');
      setModalPrograma(false);
      setDatosCargados(false);
      cargarProgramas();
      onRecargar();
    }
  }

  async function handleEditarPrograma(id, nombreActual) {
    const nuevoNombre = prompt('Editar nombre del programa:', nombreActual);
    if (!nuevoNombre || nuevoNombre === nombreActual) return;
    
    const { error } = await supabase
      .from('programas')
      .update({ nombre: nuevoNombre.trim() })
      .eq('id', id);
    
    if (error) {
      notificacion.error(error.message, 'Error al editar');
    } else {
      notificacion.success('Programa actualizado correctamente');
      setDatosCargados(false);
      cargarProgramas();
      onRecargar();
    }
  }

  async function handleEliminarPrograma(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar el programa "${nombre}"?`)) return;
  
  console.log('🗑️ Eliminando programa:', { id, nombre });
  
  const { error } = await supabase
    .from('programas')
    .delete()
    .eq('id', id);
  
  console.log('📊 Resultado delete:', { error });
  
  if (error) {
    console.error('❌ Error al eliminar:', error);
    if (error.message?.includes('foreign key') || error.code === '23503') {
      notificacion.error(
        `No se puede eliminar "${nombre}" porque está asignado a uno o más grupos.`,
        'No se puede eliminar'
      );
    } else {
      notificacion.error(error.message || 'Error al eliminar', 'Error');
    }
  } else {
    console.log('✅ Programa eliminado correctamente');
    notificacion.success('Programa eliminado correctamente');
    
    // Recargar la lista
    const { data: nuevosProgramas } = await supabase
      .from('programas')
      .select('*')
      .eq('universidad_id', universidad.id)
      .order('nombre');
    
    if (nuevosProgramas) {
      setProgramas(nuevosProgramas);
      setTotalProgramas(nuevosProgramas.length);
    }
    onRecargar();
  }
}

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* CABECERA CLICKEABLE */}
      <div 
        onClick={toggleExpandir}
        className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <span className={`transition-transform duration-300 ${expandido ? 'rotate-90' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-2xl">🎓</span>
          <h4 className="font-semibold text-gray-800 text-lg">{universidad.nombre}</h4>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 🔥 TARJETA CON TOTAL DE PROGRAMAS (SIEMPRE VISIBLE) */}
          <div className="bg-purple-50 rounded-lg px-3 py-1.5 text-center border border-purple-200 min-w-[80px]">
            <p className="text-lg font-bold text-purple-700">{totalProgramas}</p>
            <p className="text-xs text-purple-600">Programas</p>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); onEliminar(universidad.id, universidad.nombre); }}
            className="text-red-500 hover:text-red-700 p-1"
            title="Eliminar universidad"
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* CONTENIDO EXPANDIDO */}
      {expandido && (
        <div className="p-4 bg-white border-t border-gray-200">
          {cargando ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <p className="text-gray-500 text-sm mt-1">Cargando programas...</p>
            </div>
          ) : (
            <>
              {programas.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {programas.map(programa => (
                    <div key={programa.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📚</span>
                        <span className="text-gray-800 text-sm">{programa.nombre}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button onClick={() => handleEditarPrograma(programa.id, programa.nombre)} className="text-blue-500 hover:text-blue-700 p-1 text-xs" title="Editar">✏️</button>
                        <button onClick={() => handleEliminarPrograma(programa.id, programa.nombre)} className="text-red-500 hover:text-red-700 p-1 text-xs" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-2 text-sm">No hay programas registrados</p>
              )}
              
              {modalPrograma ? (
                <form onSubmit={handleAgregarPrograma} className="flex items-center space-x-2">
                  <input type="text" value={nuevoProgramaNombre} onChange={(e) => setNuevoProgramaNombre(e.target.value)} placeholder="Nombre del programa" className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary" autoFocus />
                  <button type="submit" className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm">✅</button>
                  <button type="button" onClick={() => setModalPrograma(false)} className="text-gray-500 px-2">✕</button>
                </form>
              ) : (
                <button onClick={() => setModalPrograma(true)} className="text-primary hover:text-primary-dark text-sm flex items-center space-x-1">
                  <span>➕</span><span>Agregar programa</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}