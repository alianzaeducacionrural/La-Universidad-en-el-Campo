// =============================================
// COMPONENTE: TARJETA DE UNIVERSIDAD (CRUD) - CORREGIDO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { useAuth } from '../../context/AuthContext';
import ModalMallaHomologacion from './ModalMallaHomologacion';

// Estilo del chip del botón "Homologación" según el estado de la malla de
// ese técnico: vacia (aún no se agregó ninguna materia), en_progreso (ya
// tiene materias pero el admin no ha confirmado que estén completas) y
// completa (el admin confirmó que ya se subieron todas las materias).
const ESTILOS_HOMOLOGACION = {
  vacia: { chip: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100', dot: 'bg-red-500' },
  en_progreso: { chip: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100', dot: 'bg-amber-500' },
  completa: { chip: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100', dot: 'bg-green-500' }
};

export default function UniversidadCRUDCard({ universidad, onEliminar, onRecargar }) {
  const notificacion = useNotificacion();
  const { perfil: usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const [programas, setProgramas] = useState([]);
  const [totalProgramas, setTotalProgramas] = useState(0); // 🔥 NUEVO: total sin expandir
  const [expandido, setExpandido] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [modalPrograma, setModalPrograma] = useState(false);
  const [nuevoProgramaNombre, setNuevoProgramaNombre] = useState('');
  const [programaHomologacion, setProgramaHomologacion] = useState(null);
  const [estadoHomologacion, setEstadoHomologacion] = useState({});

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
      cargarEstadoHomologacion(data);
    }
    setDatosCargados(true);
    setCargando(false);
  }

  // Calcula, por programa, el estado de su malla de homologación: vacía (sin
  // ninguna materia agregada), en_progreso (tiene materias pero nadie ha
  // confirmado que la malla esté completa) o completa (el admin la marcó
  // como tal desde el modal). 2 consultas batched, no una por programa.
  async function cargarEstadoHomologacion(listaProgramas) {
    const idsProgramas = listaProgramas.map(p => p.id);
    if (idsProgramas.length === 0) { setEstadoHomologacion({}); return; }

    const { data: mallaData } = await supabase.from('malla_homologacion').select('id, programa_id').in('programa_id', idsProgramas);
    const mallaCountPorPrograma = {};
    for (const m of mallaData || []) mallaCountPorPrograma[m.programa_id] = (mallaCountPorPrograma[m.programa_id] || 0) + 1;

    const { data: estadoData } = await supabase.from('malla_homologacion_estado').select('programa_id, completa').in('programa_id', idsProgramas);
    const completaPorPrograma = {};
    for (const e of estadoData || []) completaPorPrograma[e.programa_id] = e.completa;

    const nuevoEstado = {};
    for (const p of listaProgramas) {
      const mallaCount = mallaCountPorPrograma[p.id] || 0;
      let nivel = 'vacia';
      if (mallaCount > 0) nivel = completaPorPrograma[p.id] ? 'completa' : 'en_progreso';
      nuevoEstado[p.id] = { nivel, mallaCount };
    }
    setEstadoHomologacion(nuevoEstado);
  }

  function tituloHomologacion(programa) {
    const info = estadoHomologacion[programa.id];
    if (!info || info.nivel === 'vacia') return 'Aún no se ha agregado ninguna materia a la malla de este técnico';
    if (info.nivel === 'completa') return 'Malla de reconocimiento de aprendizajes completa';
    return `Malla en progreso: ${info.mallaCount} materia${info.mallaCount !== 1 ? 's' : ''} agregada${info.mallaCount !== 1 ? 's' : ''}, sin confirmar`;
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
      cargarEstadoHomologacion(nuevosProgramas);
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
                <div className="space-y-1.5 mb-4">
                  {programas.map(programa => (
                    <div key={programa.id} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg pl-3 pr-2 py-2 hover:border-gray-300 hover:shadow-sm transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base flex-shrink-0">📚</span>
                        <span className="text-gray-800 text-sm truncate">{programa.nombre}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setProgramaHomologacion(programa)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap border ${
                            ESTILOS_HOMOLOGACION[estadoHomologacion[programa.id]?.nivel || 'vacia'].chip
                          }`}
                          title={tituloHomologacion(programa)}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ESTILOS_HOMOLOGACION[estadoHomologacion[programa.id]?.nivel || 'vacia'].dot}`}></span>
                          🎓 Reconocimiento de Aprendizajes
                        </button>
                        <span className="w-px h-5 bg-gray-200 mx-0.5"></span>
                        <button
                          onClick={() => handleEditarPrograma(programa.id, programa.nombre)}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar programa"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleEliminarPrograma(programa.id, programa.nombre)}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar programa"
                        >
                          🗑️
                        </button>
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

      <ModalMallaHomologacion
        isOpen={!!programaHomologacion}
        onClose={() => { setProgramaHomologacion(null); cargarEstadoHomologacion(programas); }}
        programa={programaHomologacion}
        soloLectura={!esAdmin}
      />
    </div>
  );
}