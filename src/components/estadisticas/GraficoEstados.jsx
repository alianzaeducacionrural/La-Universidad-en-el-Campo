// =============================================
// GRÁFICO: ESTUDIANTES POR ESTADO (MEJORADO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GraficoEstados() {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data } = await supabase
      .from('vista_estudiantes_por_estado')
      .select('*');
    
    if (data) {
      const totalEstudiantes = data.reduce((sum, d) => sum + d.total, 0);
      setTotal(totalEstudiantes);
      
      setDatos({
        labels: data.map(d => d.estado),
        datasets: [{
          data: data.map(d => d.total),
          backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#6b7280'],
          borderWidth: 0,
          borderRadius: 8,
          spacing: 4
        }]
      });
    }
  }

  if (!datos) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📊 Estudiantes por Estado</h3>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">📊 Estudiantes por Estado</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} estudiantes</p>
      <div className="h-64">
        <Doughnut 
          data={datos} 
          options={{ 
            responsive: true, 
            maintainAspectRatio: false,
            cutout: '60%',
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