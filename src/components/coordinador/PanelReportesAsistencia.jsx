// =============================================
// PANEL: REPORTES DE ASISTENCIA PENDIENTES
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import UniversidadCard from './UniversidadCard';
import LoadingSpinner from '../common/LoadingSpinner';

export default function PanelReportesAsistencia() {
  const [universidades, setUniversidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [universidadExpandida, setUniversidadExpandida] = useState(null);

  useEffect(() => {
    cargarUniversidades();
  }, []);

  async function cargarUniversidades() {
    setCargando(true);
    
    const { data } = await supabase
      .from('vista_resumen_universidades_pendientes')
      .select('*')
      .order('grupos_pendientes', { ascending: false });
    
    if (data) setUniversidades(data);
    setCargando(false);
  }

  const toggleUniversidad = (universidadNombre) => {
    setUniversidadExpandida(universidadExpandida === universidadNombre ? null : universidadNombre);
  };

  const universidadesFiltradas = universidades.filter(u => 
    u.universidad.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando universidades..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <h3 className="font-bold text-gray-800 flex items-center">
          <span className="text-xl mr-2">📋</span>
          Reportes de Asistencia Pendientes (Docentes)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Grupos que no han recibido reporte de asistencia en los últimos 7 días
        </p>
        
        {/* Buscador */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="🔍 Buscar universidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full md:w-80 border border-gray-300 rounded-lg px-4 py-2 text-sm"
          />
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {universidadesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {busqueda ? 'No se encontraron universidades' : 'No hay universidades registradas'}
          </div>
        ) : (
          universidadesFiltradas.map(universidad => (
            <UniversidadCard
              key={universidad.universidad}
              universidad={universidad}
              expandido={universidadExpandida === universidad.universidad}
              onToggle={() => toggleUniversidad(universidad.universidad)}
            />
          ))
        )}
      </div>
    </div>
  );
}