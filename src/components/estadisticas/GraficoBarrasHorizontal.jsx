// =============================================
// GRÁFICO: BARRAS HORIZONTALES (CON FILTROS Y PAGINACIÓN)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function GraficoBarrasHorizontal({ 
  titulo, 
  campo, 
  icono, 
  filtros = {}, 
  limiteInicial = 10 
}) {
  const [datos, setDatos] = useState(null);
  const [todosLosDatos, setTodosLosDatos] = useState([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [limite, setLimite] = useState(limiteInicial);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [filtros, campo]);

  async function cargarDatos() {
    setCargando(true);
    
    // 🔥 Obtener TODOS los estudiantes con paginación + filtros
    let todosLosEstudiantes = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from('estudiantes').select(campo);
      
      // Aplicar filtros
      if (filtros.municipios?.length > 0) query = query.in('municipio', filtros.municipios);
      if (filtros.cohortes?.length > 0) query = query.in('cohorte', filtros.cohortes);
      if (filtros.universidades?.length > 0) query = query.in('universidad', filtros.universidades);
      if (filtros.estados?.length > 0) query = query.in('estado', filtros.estados);
      
      const { data, error } = await query.range(from, from + limit - 1);

      if (error) { console.error('Error:', error); break; }
      if (data && data.length > 0) { todosLosEstudiantes = [...todosLosEstudiantes, ...data]; from += limit; }
      if (!data || data.length < limit) hasMore = false;
    }
    
    if (todosLosEstudiantes.length > 0) {
      // Agrupar manualmente
      const conteo = {};
      todosLosEstudiantes.forEach(e => {
        const valor = e[campo] || 'Sin especificar';
        conteo[valor] = (conteo[valor] || 0) + 1;
      });
      
      const totalEstudiantes = Object.values(conteo).reduce((a, b) => a + b, 0);
      setTotal(totalEstudiantes);
      
      const datosOrdenados = Object.entries(conteo)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total);
      
      setTodosLosDatos(datosOrdenados);
      actualizarDatosGrafico(datosOrdenados, limite);
    } else {
      setDatos(null);
      setTotal(0);
    }
    
    setCargando(false);
  }

  function actualizarDatosGrafico(datosCompletos, limiteMostrar) {
    const datosLimitados = datosCompletos.slice(0, limiteMostrar);
    
    setDatos({
      labels: datosLimitados.map(d => d.nombre),
      datasets: [{
        label: 'Estudiantes',
        data: datosLimitados.map(d => d.total),
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }]
    });
  }

  function toggleMostrarTodos() {
    if (mostrarTodos) {
      setLimite(limiteInicial);
      actualizarDatosGrafico(todosLosDatos, limiteInicial);
    } else {
      setLimite(todosLosDatos.length);
      actualizarDatosGrafico(todosLosDatos, todosLosDatos.length);
    }
    setMostrarTodos(!mostrarTodos);
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">{icono} {titulo}</h3>
        <div className="h-80 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!datos || total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">{icono} {titulo}</h3>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
      </div>
    );
  }

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const valor = context.raw;
            const porcentaje = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;
            return `${valor} estudiantes (${porcentaje}%)`;
          }
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'right',
        offset: 5,
        color: '#374151',
        font: { weight: 'bold', size: 12 },
        formatter: (value) => value
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          callback: (value) => {
            const label = datos.labels[value];
            return label && label.length > 25 ? label.substring(0, 25) + '...' : label;
          }
        }
      }
    },
    layout: { padding: { right: 50 } }
  };

  const alturaGrafico = Math.min(600, Math.max(300, datos.labels.length * 35));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{icono} {titulo}</h3>
        {todosLosDatos.length > limiteInicial && (
          <button onClick={toggleMostrarTodos} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {mostrarTodos ? '▲ Ver menos' : `▼ Ver todos (${todosLosDatos.length})`}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Total: {total} estudiantes • Mostrando {datos.labels.length} de {todosLosDatos.length}
      </p>
      
      <div style={{ height: `${alturaGrafico}px`, overflowY: 'auto' }}>
        <Bar data={datos} options={options} />
      </div>
    </div>
  );
}