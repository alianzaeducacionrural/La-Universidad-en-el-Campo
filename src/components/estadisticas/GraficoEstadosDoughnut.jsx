// =============================================
// GRÁFICO: ESTUDIANTES POR ESTADO (DOUGHNUT)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GraficoEstadosDoughnut({ filtros = {} }) {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargarDatos(); }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    
    // Usar vista SQL que ya devuelve datos agregados (sin límite de 1000)
    const { data } = await supabase.from('vista_grafico_estados').select('*');
    
    if (data && data.length > 0) {
      const colores = ['#4A7C59', '#8B5E3C', '#6B9E7A', '#C4A882'];
      const iconos = ['✅', '🚨', '🎓', '⚠️'];
      const totalEstudiantes = data.reduce((sum, d) => sum + d.total, 0);
      setTotal(totalEstudiantes);
      
      const datosFiltrados = data
        .filter(d => d.total > 0)
        .map((d, idx) => ({
          estado: d.estado,
          total: d.total,
          porcentaje: totalEstudiantes > 0 ? Math.round((d.total / totalEstudiantes) * 1000) / 10 : 0,
          color: colores[idx % colores.length],
          icono: iconos[idx] || '📊'
        }));
      
      setDatos({
        labels: datosFiltrados.map(d => d.estado),
        datasets: [{
          data: datosFiltrados.map(d => d.total),
          backgroundColor: datosFiltrados.map(d => d.color),
          borderWidth: 0, borderRadius: 8
        }],
        detalles: datosFiltrados
      });
    } else {
      setDatos(null); setTotal(0);
    }
    
    setCargando(false);
  }

  if (cargando) return <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"><h3 className="font-semibold text-gray-800 mb-4">📊 Estudiantes por Estado</h3><div className="h-64 bg-gray-100 rounded-lg animate-pulse" /></div>;
  if (!datos || total === 0) return <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"><h3 className="font-semibold text-gray-800 mb-4">📊 Estudiantes por Estado</h3><p className="text-gray-500 text-center py-8">No hay datos disponibles</p></div>;

  const options = {
    responsive: true, maintainAspectRatio: false, cutout: '65%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw} (${datos.detalles[ctx.dataIndex].porcentaje}%)` } }, datalabels: { display: false } }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">📊 Estudiantes por Estado</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} estudiantes</p>
      <div className="h-48"><Doughnut data={datos} options={options} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {datos.detalles.map((d) => (
          <div key={d.estado} className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium shadow-sm" style={{ backgroundColor: d.color + '20', color: d.color, border: `1px solid ${d.color}40` }}>
            <span className="mr-2">{d.icono}</span><span>{d.estado}</span>
            <span className="ml-2 font-bold">{d.total}</span><span className="ml-1 text-xs opacity-75">({d.porcentaje}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}