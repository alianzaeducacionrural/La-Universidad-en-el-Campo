// =============================================
// DASHBOARD DE ESTADÍSTICAS
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TarjetaKPI from './TarjetaKPI';
import GraficoEstados from './GraficoEstados';
import GraficoCausas from './GraficoCausas';
import GraficoMensual from './GraficoMensual';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DashboardEstadisticas() {
  const [kpis, setKpis] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarKPIs();
  }, []);

  async function cargarKPIs() {
    const { data } = await supabase
      .from('vista_kpis_generales')
      .select('*')
      .single();
    
    if (data) setKpis(data);
    setCargando(false);
  }

  if (cargando || !kpis) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando estadísticas..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📊 Dashboard de Estadísticas</h1>
        <p className="text-gray-600">Visión general del programa Universidad en el Campo</p>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <TarjetaKPI 
          titulo="Estudiantes Totales" 
          valor={kpis.total_estudiantes} 
          icono="👥" 
          color="bg-blue-500"
        />
        <TarjetaKPI 
          titulo="Retención" 
          valor={`${kpis.porcentaje_retencion || 0}%`} 
          icono="📈" 
          color="bg-green-500"
        />
        <TarjetaKPI 
          titulo="Deserción" 
          valor={`${kpis.porcentaje_desercion || 0}%`} 
          icono="📉" 
          color="bg-red-500"
        />
        <TarjetaKPI 
          titulo="Promedio Faltas" 
          valor={kpis.promedio_faltas || 0} 
          icono="📊" 
          color="bg-amber-500"
        />
        <TarjetaKPI 
          titulo="Grupos Activos" 
          valor={kpis.total_grupos || 0} 
          icono="📚" 
          color="bg-purple-500"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GraficoEstados />
        <GraficoCausas />
      </div>

      {/* Gráfico Mensual */}
      <GraficoMensual />
    </div>
  );
}