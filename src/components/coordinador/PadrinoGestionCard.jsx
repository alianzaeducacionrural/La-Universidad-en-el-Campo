// =============================================
// COMPONENTE: TARJETA DE PADRINO (GESTIÓN)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ModalAsignarGrupo from './ModalAsignarGrupo';

export default function PadrinoGestionCard({ padrino, expandido, onToggle, onGrupoQuitado, onGrupoAsignado, onToggleActivo }) {
  const inactivo = padrino.activo === false;
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
      // institución delegada). Se agrupan en una sola tarjeta por grupo, con el detalle de
      // instituciones adentro, para no mostrarlo como si fueran grupos distintos.
      setGrupos(agruparPorGrupo(data.filter(item => item.grupos !== null)));
    }

    setDatosCargados(true);
    setCargando(false);
  }

  function agruparPorGrupo(filas) {
    const mapa = new Map();
    filas.forEach(item => {
      if (!mapa.has(item.grupo_id)) {
        mapa.set(item.grupo_id, { ...item.grupos, asignaciones: [] });
      }
      mapa.get(item.grupo_id).asignaciones.push({
        asignacion_id: item.id,
        institucion_educativa: item.institucion_educativa
      });
    });
    return [...mapa.values()];
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
      setGrupos(prev => prev
        .map(g => ({ ...g, asignaciones: g.asignaciones.filter(a => a.asignacion_id !== asignacionId) }))
        .filter(g => g.asignaciones.length > 0)
      );
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
        className={`p-5 cursor-pointer hover:bg-gray-50 transition ${expandido ? 'border-l-4 border-purple-500 bg-purple-50/30' : ''} ${inactivo ? 'opacity-60' : ''}`}
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
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-800 text-lg">{padrino.nombre_completo}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inactivo ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                  {inactivo ? 'Inhabilitado' : 'Habilitado'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{padrino.correo}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-purple-50 rounded-xl px-4 py-2 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-purple-700">{padrino.total_grupos}</p>
              <p className="text-xs text-purple-600">Grupos asignados</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleActivo(padrino); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                inactivo
                  ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              {inactivo ? '✅ Habilitar' : '🚫 Inhabilitar'}
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
                  <div className="space-y-3">
                    {grupos.map(grupo => (
                      <div key={grupo.id} className="bg-white p-3 rounded-lg border border-gray-200">
                        <p className="font-medium text-gray-800">{grupo.nombre}</p>
                        <div className="flex flex-wrap gap-2 mt-1 mb-2">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            🎓 {grupo.universidad}
                          </span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            📚 {grupo.programa}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {grupo.asignaciones.map(a => (
                            <div key={a.asignacion_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                              <span className="text-xs text-gray-600">
                                {a.institucion_educativa ? `🏫 ${a.institucion_educativa}` : '📋 Todo el grupo'}
                              </span>
                              <button
                                onClick={() => handleQuitarGrupo(a.asignacion_id)}
                                disabled={quitando === a.asignacion_id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded text-xs transition disabled:opacity-50"
                              >
                                {quitando === a.asignacion_id ? '...' : '❌ Quitar'}
                              </button>
                            </div>
                          ))}
                        </div>
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