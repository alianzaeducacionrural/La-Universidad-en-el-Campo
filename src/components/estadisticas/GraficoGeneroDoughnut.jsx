// =============================================
// GRÁFICO: ESTUDIANTES POR GÉNERO (DOUGHNUT SIN ETIQUETAS INTERNAS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GraficoGeneroDoughnut({ filtros = {} }) {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    
    let query = supabase.from('estudiantes').select('genero');
    
    if (filtros.municipios?.length > 0) query = query.in('municipio', filtros.municipios);
    if (filtros.cohortes?.length > 0) query = query.in('cohorte', filtros.cohortes);
    if (filtros.universidades?.length > 0) query = query.in('universidad', filtros.universidades);
    if (filtros.estados?.length > 0) query = query.in('estado', filtros.estados);
    
    const { data } = await query;
    
    if (data && data.length > 0) {
      const colores = {
        'Masculino': '#3b82f6',
        'Femenino': '#ec4899',
        'Otro': '#8b5cf6',
        'Prefiero no decir': '#6b7280'
      };
      const iconos = {
        'Masculino': '👨',
        'Femenino': '👩',
        'Otro': '👤',
        'Prefiero no decir': '⚪'
      };
      
      const conteo = {};
      data.forEach(e => {
        const genero = e.genero || 'Prefiero no decir';
        conteo[genero] = (conteo[genero] || 0) + 1;
      });
      
      const totalEstudiantes = Object.values(conteo).reduce((a, b) => a + b, 0);
      setTotal(totalEstudiantes);
      
      const datosFiltrados = Object.entries(conteo)
        .map(([genero, total]) => ({
          genero,
          total,
          porcentaje: totalEstudiantes > 0 ? Math.round((total / totalEstudiantes) * 1000) / 10 : 0,
          color: colores[genero] || '#6b7280',
          icono: iconos[genero] || '👤'
        }))
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total);
      
      setDatos({
        labels: datosFiltrados.map(d => d.genero),
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
        <h3 className="font-semibold text-gray-800 mb-4">👥 Estudiantes por Género</h3>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!datos || total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">👥 Estudiantes por Género</h3>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },  // Sin leyenda interna
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const detalle = datos.detalles.find(d => d.genero === label);
            return `${label}: ${value} (${detalle?.porcentaje || 0}%)`;
          }
        }
      },
      datalabels: { display: false }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">👥 Estudiantes por Género</h3>
      <p className="text-sm text-gray-500 mb-4">Total: {total} estudiantes</p>
      
      <div className="h-48">
        <Doughnut data={datos} options={options} />
      </div>
      
      {/* LEYENDA PERSONALIZADA TIPO TAGS (EXTERNA) */}
      <div className="mt-4 flex flex-wrap gap-2">
        {datos.detalles.map((d) => (
          <div
            key={d.genero}
            className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium shadow-sm"
            style={{ backgroundColor: d.color + '20', color: d.color, border: `1px solid ${d.color}40` }}
          >
            <span className="mr-2">{d.icono}</span>
            <span>{d.genero}</span>
            <span className="ml-2 font-bold">{d.total}</span>
            <span className="ml-1 text-xs opacity-75">({d.porcentaje}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}