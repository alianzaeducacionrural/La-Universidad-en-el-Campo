// =============================================
// GRÁFICO: CAUSAS DE INASISTENCIA (PIE CHART - SIMPLIFICADO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GraficoCausasInasistencia({ filtros = {} }) {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    
    let query = supabase.from('seguimientos').select('causa_ausencia');
    query = query.not('causa_ausencia', 'is', null);
    
    const { data } = await query;
    
    if (data && data.length > 0) {
      const conteo = {};
      data.forEach(e => {
        const causa = e.causa_ausencia || 'Sin especificar';
        conteo[causa] = (conteo[causa] || 0) + 1;
      });
      
      const totalInasistencias = Object.values(conteo).reduce((a, b) => a + b, 0);
      setTotal(totalInasistencias);
      
      const colores = ['#f97316', '#ef4444', '#eab308', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#6366f1'];
      
      const datosFiltrados = Object.entries(conteo)
        .map(([causa, total]) => ({
          causa,
          total,
          porcentaje: totalInasistencias > 0 ? Math.round((total / totalInasistencias) * 1000) / 10 : 0,
          color: colores[Object.keys(conteo).indexOf(causa) % colores.length]
        }))
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total);
      
      setDatos({
        labels: datosFiltrados.map(d => d.causa),
        datasets: [{
          data: datosFiltrados.map(d => d.total),
          backgroundColor: datosFiltrados.map(d => d.color),
          borderWidth: 0,
          borderRadius: 8
        }],
        detalles: datosFiltrados
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
        <h3 className="font-semibold text-gray-800 mb-4">🔍 Causas de Inasistencia</h3>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!datos || total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">🔍 Causas de Inasistencia</h3>
        <p className="text-gray-500 text-center py-8">
          Aún no hay registros de inasistencias con causa especificada
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
            const label = context.label || '';
            const value = context.raw || 0;
            const detalle = datos.detalles.find(d => d.causa === label);
            return `${label}: ${value} (${detalle?.porcentaje || 0}%)`;
          }
        }
      },
      datalabels: { display: false }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">🔍 Causas de Inasistencia</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} inasistencias</p>
      
      <div className="h-48">
        <Pie data={datos} options={options} />
      </div>
      
      {/* LEYENDA PERSONALIZADA TIPO TAGS - TEXTO TAL CUAL DE LA BD */}
      <div className="mt-4 flex flex-wrap gap-2">
        {datos.detalles.map((d) => (
          <div
            key={d.causa}
            className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium shadow-sm"
            style={{ backgroundColor: d.color + '20', color: d.color, border: `1px solid ${d.color}40` }}
          >
            <span className="truncate max-w-[150px]">{d.causa}</span>
            <span className="ml-2 font-bold">{d.total}</span>
            <span className="ml-1 text-xs opacity-75">({d.porcentaje}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}   