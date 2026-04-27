// =============================================
// COMPONENTE: TARJETA DE GRUPO PENDIENTE
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha } from '../../utils/helpers';

export default function GrupoPendienteCard({ grupo, expandido, onToggle }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);

  useEffect(() => {
    if (expandido && !datosCargados) {
      cargarHistorial();
    }
  }, [expandido, datosCargados]);

  async function cargarHistorial() {
    setCargando(true);
    
    const { data } = await supabase
      .from('vista_historial_reportes_grupo')
      .select('*')
      .eq('grupo_id', grupo.grupo_id)
      .order('fecha', { ascending: false })
      .limit(5);
    
    if (data) setHistorial(data);
    setDatosCargados(true);
    setCargando(false);
  }

  const getEstadoColor = (estado) => {
    if (estado === 'Nunca reportado') return 'text-red-600 bg-red-50';
    if (estado.includes('días sin reporte')) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div>
      {/* Cabecera del Grupo */}
      <div 
        onClick={onToggle}
        className={`p-4 cursor-pointer hover:bg-gray-50 transition ${expandido ? 'bg-blue-50/30' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-lg">
              {expandido ? '▼' : '▶'}
            </span>
            <div className="flex-1">
              <h5 className="font-medium text-gray-800">{grupo.grupo_nombre}</h5>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  📚 {grupo.programa}
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  👥 {grupo.total_estudiantes} estudiantes
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  📅 Cohorte {grupo.cohorte}
                </span>
              </div>
            </div>
          </div>
          
          {/* Estado del reporte */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-xs text-gray-500">Último reporte:</p>
              <p className={`text-sm font-medium ${grupo.ultima_fecha ? 'text-gray-700' : 'text-red-600'}`}>
                {grupo.ultima_fecha ? formatearFecha(grupo.ultima_fecha) : 'NUNCA'}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getEstadoColor(grupo.estado_reporte)}`}>
              {grupo.estado_reporte}
            </span>
          </div>
        </div>
      </div>
      
      {/* Contenido expandido: Historial */}
      {expandido && (
        <div className="ml-12 mr-4 mb-4">
          {cargando ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 text-sm mt-1">Cargando historial...</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
              No hay reportes registrados para este grupo
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 mb-2">
                📊 Historial de reportes recientes:
              </p>
              {historial.map(reporte => (
                <div key={reporte.reporte_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-800">
                      {formatearFecha(reporte.fecha)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      📚 {reporte.modulo}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    👨‍🏫 {reporte.docente_nombre} • 
                    {reporte.total_inasistencias > 0 
                      ? ` ${reporte.total_estudiantes - reporte.total_inasistencias} presentes, ${reporte.total_inasistencias} ausentes`
                      : ' Asistencia completa'}
                  </p>
                  {reporte.observaciones && (
                    <p className="text-xs text-gray-500 mt-1 italic">📝 {reporte.observaciones}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}