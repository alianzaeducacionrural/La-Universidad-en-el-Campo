// =============================================
// GRÁFICO: INASISTENCIAS POR MES (BARRAS VERTICALES)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function GraficoInasistenciasMensual({ filtros = {} }) {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - 6);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
    
    let query = supabase
      .from('inasistencias')
      .select(`id, registros_asistencia!inner(fecha)`);
    
    if (filtros.municipios?.length > 0 || filtros.cohortes?.length > 0 || 
        filtros.universidades?.length > 0 || filtros.estados?.length > 0) {
      
      let queryEstudiantes = supabase.from('estudiantes').select('id');
      if (filtros.municipios?.length > 0) queryEstudiantes = queryEstudiantes.in('municipio', filtros.municipios);
      if (filtros.cohortes?.length > 0) queryEstudiantes = queryEstudiantes.in('cohorte', filtros.cohortes);
      if (filtros.universidades?.length > 0) queryEstudiantes = queryEstudiantes.in('universidad', filtros.universidades);
      if (filtros.estados?.length > 0) queryEstudiantes = queryEstudiantes.in('estado', filtros.estados);
      
      const { data: estudiantesFiltrados } = await queryEstudiantes;
      const idsEstudiantes = estudiantesFiltrados?.map(e => e.id) || [];
      
      if (idsEstudiantes.length > 0) {
        query = query.in('estudiante_id', idsEstudiantes);
      }
    }
    
    const { data } = await query;
    
    if (data && data.length > 0) {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const conteoMensual = Array(6).fill(0);
      const labels = [];
      
      const hoy = new Date();
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        labels.push(meses[fecha.getMonth()]);
      }
      
      let totalInasistencias = 0;
      data.forEach(item => {
        const fecha = item.registros_asistencia?.fecha;
        if (!fecha) return;
        
        const fechaInasistencia = new Date(fecha);
        const diffMeses = (hoy.getFullYear() - fechaInasistencia.getFullYear()) * 12 + 
                         hoy.getMonth() - fechaInasistencia.getMonth();
        
        if (diffMeses >= 0 && diffMeses < 6) {
          conteoMensual[5 - diffMeses]++;
          totalInasistencias++;
        }
      });
      
      setTotal(totalInasistencias);
      
      setDatos({
        labels,
        datasets: [{
          data: conteoMensual,
          backgroundColor: '#ef4444',
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }]
      });
    } else {
      setDatos(null);
      setTotal(0);
    }
    
    setCargando(false);
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">📈 Inasistencias por Mes</h3>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!datos || total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">📈 Inasistencias por Mes</h3>
        <p className="text-gray-500 text-center py-8">
          Aún no hay registros de inasistencias en los últimos 6 meses
        </p>
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const valor = context.raw;
            return `${valor} inasistencia${valor !== 1 ? 's' : ''}`;
          }
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        offset: 5,
        color: '#374151',
        font: { weight: 'bold', size: 12 },
        formatter: (value) => value > 0 ? value : ''
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: 'bold' } }
      },
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { display: false }
      }
    },
    layout: {
      padding: { top: 30 }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">📈 Inasistencias por Mes</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} inasistencias • Últimos 6 meses</p>
      
      <div className="h-64">
        <Bar data={datos} options={options} />
      </div>
    </div>
  );
}