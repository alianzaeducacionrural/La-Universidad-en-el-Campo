// =============================================
// COMPONENTE: MAPA DE CALOR DE CALDAS
// =============================================

import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { supabase } from '../../lib/supabaseClient';
import caldasGeoJSON from '../../data/caldas.geo.json';

// Colores según densidad
const getColorPorDensidad = (densidad) => {
  switch (densidad) {
    case 'muy-alta': return '#dc2626'; // Rojo
    case 'alta': return '#f97316';      // Naranja
    case 'media': return '#eab308';     // Amarillo
    case 'baja': return '#22c55e';      // Verde
    default: return '#e5e7eb';          // Gris (sin datos)
  }
};

export default function MapaCalorCaldas({ filtros = {} }) {
  const [datosMunicipios, setDatosMunicipios] = useState({});
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatosMapa();
  }, [filtros]);

  async function cargarDatosMapa() {
    setCargando(true);
    
    // Construir query con filtros
    let query = supabase.from('vista_mapa_caldas').select('*');
    
    // Aplicar filtros si existen (esto requeriría una función SQL con parámetros)
    // Por ahora cargamos todos los datos
    
    const { data } = await query;
    
    if (data) {
      const datosMap = {};
      data.forEach(d => {
        datosMap[d.municipio] = {
          total: d.total_estudiantes,
          densidad: d.densidad
        };
      });
      setDatosMunicipios(datosMap);
    }
    
    setCargando(false);
  }

  const handleMouseEnter = (geo, municipioData) => {
    const { name } = geo.properties;
    const datos = municipioData || { total: 0, densidad: null };
    
    setTooltipContent(`
      <div class="p-3">
        <p class="font-bold text-gray-800 mb-1">${name}</p>
        <p class="text-sm text-gray-600">👥 ${datos.total || 0} estudiantes</p>
        <p class="text-sm text-gray-600">📊 Densidad: ${datos.densidad || 'Sin datos'}</p>
      </div>
    `);
    setShowTooltip(true);
  };

  const handleMouseMove = (e) => {
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 40 });
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">🗺️ Mapa de Caldas - Estudiantes por Municipio</h3>
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <p className="text-gray-500">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm relative">
      <h3 className="font-semibold text-gray-800 mb-2">🗺️ Mapa de Caldas - Estudiantes por Municipio</h3>
      <p className="text-sm text-gray-500 mb-4">
        Pasa el cursor sobre cada municipio para ver detalles
      </p>
      
      {/* Leyenda */}
      <div className="flex items-center space-x-4 mb-4 text-xs">
        <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-1"></span> Baja (0-10)</div>
        <div className="flex items-center"><span className="w-3 h-3 bg-yellow-500 rounded mr-1"></span> Media (11-25)</div>
        <div className="flex items-center"><span className="w-3 h-3 bg-orange-500 rounded mr-1"></span> Alta (26-50)</div>
        <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-1"></span> Muy Alta (50+)</div>
        <div className="flex items-center"><span className="w-3 h-3 bg-gray-300 rounded mr-1"></span> Sin datos</div>
      </div>

      <div className="relative" style={{ height: '450px' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 3500,
            center: [-75.3, 5.3] // Centro aproximado de Caldas
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup zoom={1} center={[-75.3, 5.3]}>
            <Geographies geography={caldasGeoJSON}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const municipioNombre = geo.properties.name;
                  const datos = datosMunicipios[municipioNombre] || { total: 0, densidad: null };
                  const color = getColorPorDensidad(datos.densidad);
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none', transition: 'all 0.2s' },
                        hover: { fill: '#3b82f6', outline: 'none', cursor: 'pointer' },
                        pressed: { outline: 'none' }
                      }}
                      onMouseEnter={() => handleMouseEnter(geo, datos)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip personalizado */}
        {showTooltip && (
          <div
            className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-xl pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translateY(-100%)'
            }}
            dangerouslySetInnerHTML={{ __html: tooltipContent }}
          />
        )}
      </div>
      
      <p className="text-xs text-gray-400 mt-4 text-center">
        * Los colores representan la densidad de estudiantes por municipio
      </p>
    </div>
  );
}