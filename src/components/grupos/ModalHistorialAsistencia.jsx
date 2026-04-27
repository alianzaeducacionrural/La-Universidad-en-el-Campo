// =============================================
// MODAL: HISTORIAL DE ASISTENCIAS DEL GRUPO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha } from '../../utils/helpers';
import BotonWhatsApp from '../common/BotonWhatsApp';

export default function ModalHistorialAsistencia({ isOpen, onClose, grupo }) {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [reporteExpandido, setReporteExpandido] = useState(null);

  useEffect(() => {
    if (isOpen && grupo) {
      cargarReportes();
    } else {
      setReportes([]);
      setReporteExpandido(null);
    }
  }, [isOpen, grupo]);

  async function cargarReportes() {
    setCargando(true);
    
    const { data } = await supabase
      .from('registros_asistencia')
      .select(`
        *,
        inasistencias (
          id,
          estudiante_id,
          estado_seguimiento,
          estudiantes:estudiante_id (
            nombre_completo,
            documento
          )
        )
      `)
      .eq('grupo_id', grupo.id)
      .order('fecha', { ascending: false });
    
    if (data) setReportes(data);
    setCargando(false);
  }

  const toggleExpandir = (reporteId) => {
    setReporteExpandido(reporteExpandido === reporteId ? null : reporteId);
  };

  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
        {/* Encabezado */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50 sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">📊</span>
                Historial de Asistencias
              </h3>
              <p className="text-gray-600 mt-1">{grupo.nombre}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-white px-3 py-1 rounded-full shadow-sm">
                  🎓 {grupo.universidad}
                </span>
                <span className="text-xs bg-white px-3 py-1 rounded-full shadow-sm">
                  📚 {grupo.programa}
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Contenido */}
        <div className="p-6">
          {cargando ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              <p className="text-gray-500 mt-4">Cargando reportes...</p>
            </div>
          ) : reportes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500 text-lg mb-2">📭 No hay reportes</p>
              <p className="text-gray-400">Aún no se ha registrado ninguna asistencia en este grupo</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">
                📋 {reportes.length} reporte(s) encontrado(s)
              </p>
              
              {reportes.map(reporte => {
                const totalInasistencias = reporte.inasistencias?.length || 0;
                const esAsistenciaCompleta = totalInasistencias === 0;
                const expandido = reporteExpandido === reporte.id;
                
                return (
                  <div 
                    key={reporte.id} 
                    className={`border rounded-xl overflow-hidden transition ${
                      esAsistenciaCompleta 
                        ? 'border-green-200 bg-green-50/30' 
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    {/* Cabecera del reporte (clickeable) */}
                    <div 
                      onClick={() => toggleExpandir(reporte.id)}
                      className="p-4 cursor-pointer hover:bg-white/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`text-2xl ${esAsistenciaCompleta ? 'text-green-600' : 'text-amber-600'}`}>
                            {esAsistenciaCompleta ? '✅' : '⚠️'}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {reporte.modulo}
                            </p>
                            <p className="text-sm text-gray-600">
                              👨‍🏫 {reporte.docente_nombre}
                            </p>
                            
                            {/* INFORMACIÓN DE CONTACTO DEL DOCENTE */}
                              {reporte.docente_telefono && (
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                  <span className="text-gray-500">📞 {reporte.docente_telefono}</span>
                                  <BotonWhatsApp 
                                    telefono={reporte.docente_telefono} 
                                    prefijo="+57" 
                                    size="sm" 
                                  />
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                            📅 {formatearFecha(reporte.fecha)}
                          </span>
                          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                            esAsistenciaCompleta 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {esAsistenciaCompleta 
                              ? 'Asistencia Completa' 
                              : `${totalInasistencias} inasistencia(s)`}
                          </span>
                          <span className="text-gray-400 text-lg">
                            {expandido ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Observaciones (si hay) */}
                      {reporte.observaciones && reporte.observaciones !== 'Asistencia Completa' && (
                        <div className="mt-3 ml-11 p-3 bg-white rounded-lg text-sm text-gray-600 border border-gray-200">
                          <span className="font-medium">📝 Observaciones:</span> {reporte.observaciones}
                        </div>
                      )}
                    </div>
                    
                    {/* Detalle expandido - Lista de inasistencias */}
                    {expandido && !esAsistenciaCompleta && (
                      <div className="border-t border-gray-200 bg-white p-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          📋 Estudiantes ausentes:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {reporte.inasistencias.map(ina => {
                            const estado = ina.estado_seguimiento;
                            const estadoColor = 
                              estado === 'realizado' ? 'text-green-600 bg-green-50' :
                              estado === 'justificado' ? 'text-blue-600 bg-blue-50' :
                              'text-amber-600 bg-amber-50';
                            
                            return (
                              <div key={ina.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <span className="text-red-500">❌</span>
                                  <span className="text-sm text-gray-800">
                                    {ina.estudiantes?.nombre_completo}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${estadoColor}`}>
                                  {estado === 'realizado' ? '✅ Seguimiento hecho' :
                                   estado === 'justificado' ? '📋 Justificado' :
                                   '⏳ Pendiente'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Pie del modal */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}