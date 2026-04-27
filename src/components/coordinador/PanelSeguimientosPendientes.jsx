// =============================================
// PANEL: SEGUIMIENTOS PENDIENTES (DRILL-DOWN)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PadrinoCard from './PadrinoCard';
import LoadingSpinner from '../common/LoadingSpinner';

export default function PanelSeguimientosPendientes({ onSeguimiento, onVerPerfil }) {
  const [padrinos, setPadrinos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [padrinoExpandido, setPadrinoExpandido] = useState(null);

  useEffect(() => {
    cargarPadrinos();
  }, []);

  async function cargarPadrinos() {
    setCargando(true);
    
    const { data } = await supabase
      .from('vista_resumen_padrinos_pendientes')
      .select('*')
      .order('total_pendientes', { ascending: false });
    
    if (data) setPadrinos(data);
    setCargando(false);
  }

  const togglePadrino = (padrinoId) => {
    setPadrinoExpandido(padrinoExpandido === padrinoId ? null : padrinoId);
  };

  const padrinosFiltrados = padrinos.filter(p => 
    p.padrino_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando padrinos..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <h3 className="font-bold text-gray-800 flex items-center">
          <span className="text-xl mr-2">⚠️</span>
          Seguimientos Pendientes por Padrino
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Estudiantes con inasistencias que aún no tienen seguimiento registrado
        </p>
        
        {/* Buscador */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="🔍 Buscar padrino..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full md:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {padrinosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {busqueda ? 'No se encontraron padrinos' : 'No hay padrinos registrados'}
          </div>
        ) : (
          padrinosFiltrados.map(padrino => (
            <PadrinoCard
              key={padrino.padrino_id}
              padrino={padrino}
              expandido={padrinoExpandido === padrino.padrino_id}
              onToggle={() => togglePadrino(padrino.padrino_id)}
              onSeguimiento={onSeguimiento}
              onVerPerfil={onVerPerfil}
            />
          ))
        )}
      </div>
    </div>
  );
}