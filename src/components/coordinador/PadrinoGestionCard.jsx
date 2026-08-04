// =============================================
// COMPONENTE: TARJETA DE PADRINO (GESTIÓN)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ModalAsignarGrupo from './ModalAsignarGrupo';

export default function PadrinoGestionCard({ padrino, expandido, onToggle, onGrupoQuitado, onGrupoAsignado, onEliminar }) {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [quitando, setQuitando] = useState(null);

  useEffect(() => {
    if (expandido && !datosCargados) {
      cargarGrupos();
    }
  }, [expandido, datosCargados]);

  async function cargarGrupos() {
    setCargando(true);
    
    const { data } = await supabase
      .from('grupo_padrino')
      .select(`
        id,
        grupo_id,
        institucion_educativa,
        grupos:grupo_id (
          id,
          nombre,
          universidad,
          programa,
          cohorte
        )
      `)
      .eq('padrino_id', padrino.padrino_id)
      .order('grupos(nombre)');

    if (data) {
      // Un padrino puede tener varias filas de grupo_padrino para el mismo grupo (una por
      // institución delegada), así que cada fila se muestra como su propia tarjeta,
      // identificada por el id de la asignación (no del grupo, que puede repetirse).
      const gruposFormateados = data
        .filter(item => item.grupos !== null)
        .map(item => ({ ...item.grupos, asignacion_id: item.id, institucion_asignada: item.institucion_educativa }));
      setGrupos(gruposFormateados);
    }

    setDatosCargados(true);
    setCargando(false);
  }

  async function handleQuitarGrupo(asignacionId) {
    if (!confirm('¿Estás seguro de quitar esta asignación del padrino?')) return;

    setQuitando(asignacionId);

    const { error } = await supabase
      .from('grupo_padrino')
      .delete()
      .eq('id', asignacionId);

    setQuitando(null);

    if (error) {
      alert('Error al quitar grupo: ' + error.message);
    } else {
      setGrupos(grupos.filter(g => g.asignacion_id !== asignacionId));
      onGrupoQuitado();
    }
  }

  function handleGrupoAsignado() {
    cargarGrupos();
    onGrupoAsignado();
  }

  return (
    <div className="bg-white">
      {/* Cabecera del Padrino */}
      <div 
        onClick={onToggle}
        className={`p-5 cursor-pointer hover:bg-gray-50 transition ${expandido ? 'border-l-4 border-purple-500 bg-purple-50/30' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-2xl transition-transform">
              {expandido ? '▼' : '▶'}
            </span>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-700 text-xl">👤</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-lg">{padrino.nombre_completo}</h4>
              <p className="text-sm text-gray-500">{padrino.correo}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-purple-50 rounded-xl px-4 py-2 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-purple-700">{padrino.total_grupos}</p>
              <p className="text-xs text-purple-600">Grupos asignados</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onEliminar(padrino.padrino_id, padrino.nombre_completo); }}
              className="text-red-500 hover:text-red-700 p-1"
              title="Eliminar padrino"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
      
      {/* Contenido expandido: Grupos asignados */}
      {expandido && (
        <div className="bg-gray-50/50 border-t border-gray-200 p-5">
          {cargando ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <p className="text-gray-500 text-sm mt-1">Cargando grupos...</p>
            </div>
          ) : (
            <>
              {grupos.length > 0 ? (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-700 mb-3">Grupos asignados:</h5>
                  <div className="space-y-2">
                    {grupos.map(grupo => (
                      <div key={grupo.asignacion_id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-800">{grupo.nombre}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              🎓 {grupo.universidad}
                            </span>
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                              📚 {grupo.programa}
                            </span>
                            {grupo.institucion_asignada && (
                              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                🏫 {grupo.institucion_asignada}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuitarGrupo(grupo.asignacion_id)}
                          disabled={quitando === grupo.asignacion_id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
                        >
                          {quitando === grupo.asignacion_id ? '...' : '❌ Quitar'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Este padrino no tiene grupos asignados</p>
              )}
              
              <button
                onClick={() => setModalAsignar(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Asignar nuevo grupo</span>
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Modal Asignar Grupo */}
      <ModalAsignarGrupo
        isOpen={modalAsignar}
        onClose={() => setModalAsignar(false)}
        padrino={padrino}
        gruposActuales={grupos.map(g => g.id)}
        onAsignado={handleGrupoAsignado}
      />
    </div>
  );
}