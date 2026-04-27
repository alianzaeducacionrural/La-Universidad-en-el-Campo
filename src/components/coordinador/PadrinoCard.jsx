// =============================================
// COMPONENTE: TARJETA DE PADRINO (EXPANDIBLE)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import GrupoCard from './GrupoCard';

export default function PadrinoCard({ padrino, expandido, onToggle, onSeguimiento, onVerPerfil }) {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [grupoExpandido, setGrupoExpandido] = useState(null);
  const [datosCargados, setDatosCargados] = useState(false);

  useEffect(() => {
    if (expandido && !datosCargados) {
      cargarGrupos();
    }
  }, [expandido, datosCargados]);

  async function cargarGrupos() {
    setCargando(true);
    
    const { data } = await supabase
      .from('vista_grupos_por_padrino')
      .select('*')
      .eq('padrino_id', padrino.padrino_id)
      .order('total_pendientes', { ascending: false });
    
    if (data) setGrupos(data);
    setDatosCargados(true);
    setCargando(false);
  }

  const toggleGrupo = (grupoId) => {
    setGrupoExpandido(grupoExpandido === grupoId ? null : grupoId);
  };

  const tienePendientes = padrino.total_pendientes > 0;

  return (
    <div className="bg-white">
      {/* Cabecera del Padrino */}
      <div 
        onClick={onToggle}
        className={`p-5 cursor-pointer hover:bg-gray-50 transition ${expandido ? 'border-l-4 border-primary bg-primary/5' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-2xl transition-transform">
              {expandido ? '▼' : '▶'}
            </span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              tienePendientes ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
              <span className="text-xl">👤</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 text-lg">{padrino.padrino_nombre}</h4>
              <p className="text-sm text-gray-500">{padrino.correo}</p>
            </div>
          </div>
          
          {/* Tarjetas de estadísticas */}
          <div className="flex items-center space-x-4">
            {/* Tarjeta: Grupos Asignados */}
            <div className="bg-blue-50 rounded-xl px-4 py-2 text-center min-w-[100px] border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{padrino.total_grupos}</p>
              <p className="text-xs text-blue-600">Grupos asignados</p>
            </div>
            
            {/* Tarjeta: Seguimientos Pendientes */}
            <div className={`rounded-xl px-4 py-2 text-center min-w-[120px] border ${
              tienePendientes ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-2xl font-bold ${
                tienePendientes ? 'text-amber-700' : 'text-green-700'
              }`}>
                {padrino.total_pendientes}
              </p>
              <p className={`text-xs ${
                tienePendientes ? 'text-amber-600' : 'text-green-600'
              }`}>
                Seguimientos pendientes
              </p>
            </div>
            
            {/* Estado */}
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
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-gray-500 mt-2">Cargando grupos...</p>
            </div>
          ) : grupos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Este padrino no tiene grupos asignados
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {grupos.map(grupo => (
                <GrupoCard
                  key={grupo.grupo_id}
                  grupo={grupo}
                  expandido={grupoExpandido === grupo.grupo_id}
                  onToggle={() => toggleGrupo(grupo.grupo_id)}
                  onSeguimiento={onSeguimiento}
                  onVerPerfil={onVerPerfil}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}