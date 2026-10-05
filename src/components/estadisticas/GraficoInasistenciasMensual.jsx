// =============================================
// GRÁFICO: INASISTENCIAS POR MES (BARRAS VERTICALES)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { obtenerTodasLasFilas } from '../../utils/supabasePaginado';
import { aplicarFiltrosEstudiante, hayFiltrosEstudiante } from '../../utils/filtrosConsulta';
import ErrorGrafico from './ErrorGrafico';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

export default function GraficoInasistenciasMensual({ filtros = {} }) {
  const [datos, setDatos] = useState(null);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(false);

    const hoy = new Date();
    const inicioVentana = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
    const inicioVentanaStr = `${inicioVentana.getFullYear()}-${String(inicioVentana.getMonth() + 1).padStart(2, '0')}-01`;

    // El join con estudiantes solo se agrega si hay filtros: con !inner
    // excluiría inasistencias sin estudiante asociado.
    const conFiltros = hayFiltrosEstudiante(filtros);
    let data;
    try {
      data = await obtenerTodasLasFilas(() => {
        const query = supabase
          .from('inasistencias')
          .select(`id, registros_asistencia!inner(fecha)${conFiltros ? ', estudiantes!inner(id)' : ''}`)
          .gte('registros_asistencia.fecha', inicioVentanaStr);
        return conFiltros ? aplicarFiltrosEstudiante(query, filtros, 'estudiantes') : query;
      });
    } catch (error) {
      console.error('Error cargando inasistencias mensuales:', error);
      setErrorCarga(true);
      setCargando(false);
      return;
    }

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const conteoMensual = Array(6).fill(0);
    const labels = [];
    for (let i = 5; i >= 0; i--) {
      labels.push(meses[new Date(hoy.getFullYear(), hoy.getMonth() - i, 1).getMonth()]);
    }

    let totalInasistencias = 0;
    data.forEach(item => {
      const fecha = item.registros_asistencia?.fecha;
      if (!fecha) return;
      // Año/mes leídos del texto: new Date('YYYY-MM-DD') es UTC y en Colombia
      // corre el día 1 de cada mes al mes anterior.
      const [anio, mes] = fecha.split('-').map(Number);
      const diffMeses = (hoy.getFullYear() - anio) * 12 + (hoy.getMonth() + 1 - mes);
      if (diffMeses >= 0 && diffMeses < 6) {
        conteoMensual[5 - diffMeses]++;
        totalInasistencias++;
      }
    });

    if (totalInasistencias > 0) {
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

  if (errorCarga) return <ErrorGrafico titulo="📈 Inasistencias por Mes" />;

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