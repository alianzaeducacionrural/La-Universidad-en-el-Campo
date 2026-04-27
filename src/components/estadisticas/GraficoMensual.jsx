// =============================================
// GRÁFICO: INASISTENCIAS POR MES (MEJORADO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function GraficoMensual() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data } = await supabase
      .from('vista_inasistencias_por_mes')
      .select('*')
      .order('anio', { ascending: true })
      .order('mes_numero', { ascending: true });
    
    if (data) {
      setDatos({
        labels: data.map(d => d.mes),
        datasets: [{
          label: 'Inasistencias',
          data: data.map(d => d.total),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderRadius: 8,
          borderSkipped: false
        }]
      });
    }
  }

  if (!datos) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📈 Inasistencias por Mes</h3>
        <div className="h-80 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">📈 Inasistencias por Mes</h3>
      <p className="text-sm text-gray-500 mb-4">Últimos 6 meses</p>
      <div className="h-80">
        <Bar 
          data={datos} 
          options={{ 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1f2937',
                titleColor: '#fff',
                bodyColor: '#fff'
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#e5e7eb' }
              },
              x: {
                grid: { display: false }
              }
            }
          }} 
        />
      </div>
    </div>
  );
}