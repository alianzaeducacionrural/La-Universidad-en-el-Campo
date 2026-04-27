// =============================================
// COMPONENTE: TARJETA DE UNIVERSIDAD (EXPANDIBLE)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import GrupoPendienteCard from './GrupoPendienteCard';

export default function UniversidadCard({ universidad, expandido, onToggle }) {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [grupoExpandido, setGrupoExpandido] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);
  const [mostrarAlDia, setMostrarAlDia] = useState(false);

  useEffect(() => {
    if (expandido && !datosCargados) {
      cargarGrupos();
    }
  }, [expandido, datosCargados]);

  async function cargarGrupos() {
    setCargando(true);
    
    const { data } = await supabase
      .from('vista_grupos_pendientes_por_universidad')
      .select('*')
      .eq('universidad', universidad.universidad)
      .order('ultima_fecha', { ascending: true, nullsFirst: true });
    
    if (data) setGrupos(data);
    setDatosCargados(true);
    setCargando(false);
  }

  const toggleGrupo = (grupoId) => {
    setGrupoExpandido(grupoExpandido === grupoId ? null : grupoId);
  };

  const tienePendientes = universidad.grupos_pendientes > 0;
  const gruposPendientes = grupos.filter(g => g.pendiente);
  const gruposAlDia = grupos.filter(g => !g.pendiente);

  return (
    <div className="bg-white">
      {/* Cabecera de la Universidad */}
      <div 
        onClick={onToggle}
        className={`p-5 cursor-pointer hover:bg-gray-50 transition ${expandido ? 'border-l-4 border-blue-500 bg-blue-50/30' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-2xl transition-transform">
              {expandido ? '▼' : '▶'}
            </span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              tienePendientes ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
              <span className="text-xl">🏫</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-lg">{universidad.universidad}</h4>
            </div>
          </div>
          
          {/* Tarjetas de estadísticas */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue-50 rounded-xl px-4 py-2 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-blue-700">{universidad.total_grupos}</p>
              <p className="text-xs text-blue-600">Grupos totales</p>
            </div>
            
            <div className={`rounded-xl px-4 py-2 text-center min-w-[120px] ${
              tienePendientes ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <p className={`text-2xl font-bold ${
                tienePendientes ? 'text-amber-700' : 'text-green-700'
              }`}>
                {universidad.grupos_pendientes}
              </p>
              <p className={`text-xs ${
                tienePendientes ? 'text-amber-600' : 'text-green-600'
              }`}>
                Sin reporte
              </p>
            </div>
            
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              tienePendientes 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {tienePendientes ? '⚠️ Pendiente' : '✅ Al día'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Contenido expandido: Grupos */}
      {expandido && (
        <div className="bg-gray-50/50 border-t border-gray-200">
          {cargando ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-2">Cargando grupos...</p>
            </div>
          ) : grupos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay grupos registrados para esta universidad
            </div>
          ) : (
            <div>
              {/* Grupos Pendientes */}
              {gruposPendientes.length > 0 && (
                <div className="p-4">
                  <h5 className="font-medium text-amber-700 mb-3 flex items-center">
                    <span className="mr-2">⚠️</span>
                    Grupos con reporte PENDIENTE ({gruposPendientes.length})
                  </h5>
                  <div className="divide-y divide-gray-200 bg-white rounded-lg border border-amber-200">
                    {gruposPendientes.map(grupo => (
                      <GrupoPendienteCard
                        key={grupo.grupo_id}
                        grupo={grupo}
                        expandido={grupoExpandido === grupo.grupo_id}
                        onToggle={() => toggleGrupo(grupo.grupo_id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Grupos al día (colapsables) */}
              {gruposAlDia.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={() => setMostrarAlDia(!mostrarAlDia)}
                    className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center"
                  >
                    <span className="mr-1">{mostrarAlDia ? '▼' : '▶'}</span>
                    ✅ Grupos al día ({gruposAlDia.length})
                  </button>
                  
                  {mostrarAlDia && (
                    <div className="mt-3 divide-y divide-gray-200 bg-white rounded-lg border border-green-200">
                      {gruposAlDia.map(grupo => (
                        <GrupoPendienteCard
                          key={grupo.grupo_id}
                          grupo={grupo}
                          expandido={grupoExpandido === grupo.grupo_id}
                          onToggle={() => toggleGrupo(grupo.grupo_id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}