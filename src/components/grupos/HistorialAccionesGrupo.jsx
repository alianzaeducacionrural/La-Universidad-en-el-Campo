// =============================================
// COMPONENTE: HISTORIAL DE ACCIONES DEL GRUPO
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
  otra: { label: 'Otra Actividad', icono: '📝' }
};

export default function HistorialAccionesGrupo({ grupo, refresh }) {
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (grupo) cargarAcciones();
  }, [grupo, refresh]);

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

  if (cargando) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-500 text-sm mt-2">Cargando acciones...</p>
      </div>
    );
  }

  if (acciones.length === 0) {
    return (
      <EmptyState 
        icono="📋"
        titulo="Sin acciones registradas"
        descripcion="Aún no se han registrado acciones para este grupo"
      />
    );
  }

  return (
    <div className="space-y-3">
      {acciones.map(accion => {
        const config = LABELS_ACCION[accion.tipo_accion] || LABELS_ACCION.otra;
        const tieneNumero = ['visita_semana', 'visita_sabado'].includes(accion.tipo_accion);
        
        return (
          <div key={accion.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{config.icono}</span>
                  <span className="font-medium text-gray-800">
                    {tieneNumero ? `${config.label} #${accion.numero_accion}` : config.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    📅 {formatearFecha(accion.fecha)}
                  </span>
                </div>
                
                <div className="ml-8 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Actividad:</p>
                    <p className="text-sm text-gray-800">{accion.actividad}</p>
                  </div>
                  
                  {accion.resultado && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Resultado:</p>
                      <p className="text-sm text-gray-800">{accion.resultado}</p>
                    </div>
                  )}
                  
                  {accion.observaciones && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Observaciones:</p>
                      <p className="text-sm text-gray-600 italic">{accion.observaciones}</p>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-400 mt-2 ml-8">
                  👤 Registrado por: {accion.padrino?.nombre_completo || 'Sistema'}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}