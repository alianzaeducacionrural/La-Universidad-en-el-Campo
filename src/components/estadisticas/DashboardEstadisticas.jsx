// =============================================
// DASHBOARD DE ESTADÍSTICAS (CON FILTROS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TarjetaKPI from './TarjetaKPI';
import GraficoEstadosDoughnut from './GraficoEstadosDoughnut';
import GraficoCausasInasistencia from './GraficoCausasInasistencia';
import GraficoMensual from './GraficoMensual';
import FiltrosEstadisticas from './FiltrosEstadisticas';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DashboardEstadisticas() {
  const [kpis, setKpis] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({
    municipios: [],
    cohortes: [],
    universidades: [],
    estados: []
  });

  useEffect(() => {
    cargarKPIs();
  }, [filtros]);

  async function cargarKPIs() {
    setCargando(true);
    
    try {
      // ==========================================
      // PASO 1: Obtener estudiantes con filtros
      // ==========================================
      let queryEstudiantes = supabase.from('estudiantes').select('id, estado, total_faltas, grupo_id, universidad, cohorte, municipio');
      
      if (filtros.municipios?.length > 0) {
        queryEstudiantes = queryEstudiantes.in('municipio', filtros.municipios);
      }
      if (filtros.cohortes?.length > 0) {
        queryEstudiantes = queryEstudiantes.in('cohorte', filtros.cohortes);
      }
      if (filtros.universidades?.length > 0) {
        queryEstudiantes = queryEstudiantes.in('universidad', filtros.universidades);
      }
      if (filtros.estados?.length > 0) {
        queryEstudiantes = queryEstudiantes.in('estado', filtros.estados);
      }
      
      const { data: estudiantesData, error: estudiantesError } = await queryEstudiantes;
      
      if (estudiantesError) throw estudiantesError;
      
      const totalEstudiantes = estudiantesData?.length || 0;
      
      // Calcular deserción y retención
      const desertores = estudiantesData?.filter(e => e.estado === 'Desertor').length || 0;
      const activos = estudiantesData?.filter(e => e.estado === 'Activo').length || 0;
      const graduados = estudiantesData?.filter(e => e.estado === 'Graduado').length || 0;
      
      const porcentajeDesercion = totalEstudiantes > 0 ? Math.round((desertores / totalEstudiantes) * 100) : 0;
      const porcentajeRetencion = totalEstudiantes > 0 ? Math.round(((activos + graduados) / totalEstudiantes) * 100) : 0;
      
      // Promedio de faltas
      const totalFaltas = estudiantesData?.reduce((sum, e) => sum + (e.total_faltas || 0), 0) || 0;
      const promedioFaltas = totalEstudiantes > 0 ? Math.round((totalFaltas / totalEstudiantes) * 10) / 10 : 0;
      
      // ==========================================
      // PASO 2: TOTAL GRUPOS (basado en estudiantes filtrados)
      // ==========================================
      let totalGrupos = 0;
      
      // Obtener IDs de grupos únicos de los estudiantes filtrados
      const gruposIdsUnicos = [...new Set(
        estudiantesData
          ?.map(e => e.grupo_id)
          .filter(id => id !== null && id !== undefined) || []
      )];
      
      console.log('Grupos IDs únicos encontrados:', gruposIdsUnicos.length);
      console.log('IDs:', gruposIdsUnicos);
      
      if (gruposIdsUnicos.length > 0) {
        // Contar cuántos de esos grupos existen en la tabla grupos (y están activos si quieres)
        const { data: gruposData, error: gruposError } = await supabase
          .from('grupos')
          .select('id')
          .in('id', gruposIdsUnicos);
        
        if (!gruposError) {
          totalGrupos = gruposData?.length || 0;
          console.log('Grupos encontrados en tabla grupos:', totalGrupos);
        } else {
          console.error('Error al consultar grupos:', gruposError);
          // Fallback: usar la cuenta de IDs únicos
          totalGrupos = gruposIdsUnicos.length;
        }
      } else {
        console.log('No se encontraron grupos asociados a los estudiantes filtrados');
      }
      
      setKpis({
        total_estudiantes: totalEstudiantes,
        porcentaje_retencion: porcentajeRetencion,
        porcentaje_desercion: porcentajeDesercion,
        promedio_faltas: promedioFaltas,
        total_grupos: totalGrupos
      });
      
    } catch (error) {
      console.error('Error al cargar KPIs:', error);
    }
    
    setCargando(false);
  }

  function handleAplicarFiltros(nuevosFiltros) {
    setFiltros(nuevosFiltros);
  }

  function handleLimpiarFiltros() {
    setFiltros({
      municipios: [],
      cohortes: [],
      universidades: [],
      estados: []
    });
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

      {/* Filtros */}
      <FiltrosEstadisticas 
        onAplicarFiltros={handleAplicarFiltros}
        onLimpiarFiltros={handleLimpiarFiltros}
      />

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <TarjetaKPI 
          titulo="Estudiantes Totales" 
          valor={kpis.total_estudiantes.toLocaleString()} 
          color="from-blue-500 to-blue-600"
        />
        <TarjetaKPI 
          titulo="Retención" 
          valor={`${kpis.porcentaje_retencion}%`} 
          color="from-green-500 to-green-600"
        />
        <TarjetaKPI 
          titulo="Deserción" 
          valor={`${kpis.porcentaje_desercion}%`} 
          color="from-red-500 to-red-600"
        />
        <TarjetaKPI 
          titulo="Promedio Faltas" 
          valor={kpis.promedio_faltas} 
          color="from-amber-500 to-amber-600"
        />
        <TarjetaKPI 
          titulo="Grupos Activos" 
          valor={kpis.total_grupos.toLocaleString()} 
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GraficoEstadosDoughnut filtros={filtros} />
        <GraficoCausasInasistencia filtros={filtros} />
      </div>

      {/* Gráfico Mensual */}
      <GraficoMensual filtros={filtros} />
    </div>
  );
}