// =============================================
// GRÁFICO: CAUSAS DE INASISTENCIA (MEJORADO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GraficoCausas() {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data } = await supabase
      .from('vista_inasistencias_por_causa')
      .select('*')
      .limit(6);
    
    if (data) {
      const totalInasistencias = data.reduce((sum, d) => sum + d.total, 0);
      setTotal(totalInasistencias);
      
      setDatos({
        labels: data.map(d => d.causa),
        datasets: [{
          data: data.map(d => d.total),
          backgroundColor: ['#f97316', '#ef4444', '#eab308', '#8b5cf6', '#06b6d4', '#ec4899'],
          borderWidth: 0
        }]
      });
    }
  }

  if (!datos) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">🔍 Causas de Inasistencia</h3>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">🔍 Causas de Inasistencia</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} registros</p>
      <div className="h-64">
        <Pie 
          data={datos} 
          options={{ 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
              legend: { 
                position: 'bottom',
                labels: { boxWidth: 12, padding: 15 }
              } 
            }
          }} 
        />
      </div>
    </div>
  );
}