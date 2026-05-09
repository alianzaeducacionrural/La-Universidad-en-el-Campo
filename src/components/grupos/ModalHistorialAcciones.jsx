// =============================================
// MODAL: HISTORIAL DE ACCIONES DEL GRUPO
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha } from '../../utils/helpers';
import EmptyState from '../common/EmptyState';

const LABELS_ACCION = {
  visita_semana: { label: 'Visita Semana', icono: '🏫' },
  visita_sabado: { label: 'Visita Sábado', icono: '📅' },
  practica_academica: { label: 'Práctica Académica', icono: '🎓' },
  comite_calidad: { label: 'Comité de Calidad', icono: '📋' },
  bienestar_universitario: { label: 'Bienestar Universitario', icono: '🎯' },
  otra: { label: 'Otra Actividad', icono: '📝' },
  asistencia_completa: { label: 'Asistencia Completa', icono: '✅' }
};

export default function ModalHistorialAcciones({ isOpen, onClose, grupo }) {
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && grupo) {
      cargarAcciones();
    } else {
      setAcciones([]);
    }
  }, [isOpen, grupo]);

  async function cargarAcciones() {
    setCargando(true);
    
    const { data } = await supabase
      .from('acciones_grupo')
      .select(`*, padrino:padrino_id (nombre_completo)`)
      .eq('grupo_id', grupo.id)
      .order('fecha', { ascending: false });
    
    if (data) setAcciones(data);
    setCargando(false);
  }

  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-xl">
        {/* Encabezado */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5 sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">📋</span>
                Acciones Desarrolladas
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
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-gray-500 mt-4">Cargando acciones...</p>
            </div>
          ) : acciones.length === 0 ? (
            <EmptyState 
              icono="📋"
              titulo="Sin acciones registradas"
              descripcion="Aún no se han registrado acciones para este grupo"
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                📋 {acciones.length} acción(es) registrada(s)
              </p>
              
              <div className="relative">
                {/* Línea de tiempo */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 to-primary/10"></div>
                
                <div className="space-y-4">
                  {acciones.map((accion, index) => {
                    const config = LABELS_ACCION[accion.tipo_accion] || LABELS_ACCION.otra;
                    const tieneNumero = ['visita_semana', 'visita_sabado'].includes(accion.tipo_accion);
                    
                    return (
                      <div key={accion.id} className="relative flex items-start pl-10">
                        {/* Punto en la línea */}
                        <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow ${
                          index === 0 ? 'bg-primary ring-2 ring-primary/20' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 flex-1 border border-gray-200 hover:shadow-sm transition">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{config.icono}</span>
                              <span className="font-medium text-gray-800">
                                {tieneNumero ? `${config.label} #${accion.numero_accion}` : config.label}
                              </span>
                            </div>
                            <span className="text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                              📅 {formatearFecha(accion.fecha)}
                            </span>
                          </div>
                          
                          {/* Contenido para "Otra Actividad" y "Asistencia Completa" */}
                          {(accion.tipo_accion === 'otra' || accion.tipo_accion === 'asistencia_completa') && (
                            <div className="ml-7 space-y-2">
                              {accion.tipo_accion === 'otra' && accion.actividad && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Actividad:</p>
                                  <p className="text-sm text-gray-800">{accion.actividad}</p>
                                </div>
                              )}
                              {accion.resultado && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Resultado:</p>
                                  <p className="text-sm text-gray-800">{accion.resultado}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-400 mt-2 ml-7">
                            👤 Registrado por: {accion.padrino?.nombre_completo || 'Sistema'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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