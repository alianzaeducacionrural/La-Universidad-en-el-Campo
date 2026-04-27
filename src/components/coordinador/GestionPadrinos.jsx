// =============================================
// COMPONENTE: GESTIÓN DE PADRINOS
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PadrinoGestionCard from './PadrinoGestionCard';
import LoadingSpinner from '../common/LoadingSpinner';

export default function GestionPadrinos() {
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
      .from('vista_padrinos_con_grupos')
      .select('*')
      .order('nombre_completo');
    
    if (data) setPadrinos(data);
    setCargando(false);
  }

  const togglePadrino = (padrinoId) => {
    setPadrinoExpandido(padrinoExpandido === padrinoId ? null : padrinoId);
  };

  const handleGrupoQuitado = () => {
    cargarPadrinos();
  };

  const handleGrupoAsignado = () => {
    cargarPadrinos();
  };

  const padrinosFiltrados = padrinos.filter(p => 
    p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.correo.toLowerCase().includes(busqueda.toLowerCase())
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
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <h3 className="font-bold text-gray-800 flex items-center">
          <span className="text-xl mr-2">👥</span>
          Gestión de Padrinos
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Asigna o quita grupos a cada padrino
        </p>
        
        {/* Buscador */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full md:w-96 border border-gray-300 rounded-lg px-4 py-2 text-sm"
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
            <PadrinoGestionCard
              key={padrino.padrino_id}
              padrino={padrino}
              expandido={padrinoExpandido === padrino.padrino_id}
              onToggle={() => togglePadrino(padrino.padrino_id)}
              onGrupoQuitado={handleGrupoQuitado}
              onGrupoAsignado={handleGrupoAsignado}
            />
          ))
        )}
      </div>
    </div>
  );
}