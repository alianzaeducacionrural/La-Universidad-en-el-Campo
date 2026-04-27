// =============================================
// PÁGINA: ESTADÍSTICAS (CON BUSCADOR GLOBAL)
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FiltrosEstadisticas from '../components/estadisticas/FiltrosEstadisticas';
import TarjetaKPI from '../components/estadisticas/TarjetaKPI';
import GraficoEstadosDoughnut from '../components/estadisticas/GraficoEstadosDoughnut';
import GraficoGeneroDoughnut from '../components/estadisticas/GraficoGeneroDoughnut';
import GraficoBarrasHorizontal from '../components/estadisticas/GraficoBarrasHorizontal';
import ComparativoCohortes from '../components/estadisticas/ComparativoCohortes';
import RankingDeserciones from '../components/estadisticas/RankingDeserciones';
import GraficoCausasInasistencia from '../components/estadisticas/GraficoCausasInasistencia';
import GraficoInasistenciasMensual from '../components/estadisticas/GraficoInasistenciasMensual';

export default function Estadisticas({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [gruposTotales, setGruposTotales] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('estadisticas');
  const [filtros, setFiltros] = useState({});

  useEffect(() => {
    cargarKPIs();
  }, [filtros]);

  async function cargarKPIs() {
    setCargando(true);
    
    let query = supabase.from('estudiantes').select('*', { count: 'exact', head: false });
    
    if (filtros.municipios?.length > 0) query = query.in('municipio', filtros.municipios);
    if (filtros.cohortes?.length > 0) query = query.in('cohorte', filtros.cohortes);
    if (filtros.universidades?.length > 0) query = query.in('universidad', filtros.universidades);
    if (filtros.estados?.length > 0) query = query.in('estado', filtros.estados);
    
    const { data, count } = await query;
    
    const { count: totalGrupos } = await supabase
      .from('grupos')
      .select('*', { count: 'exact', head: true });
    
    setGruposTotales(totalGrupos || 0);
    
    if (data) {
      const total = count || data.length;
      const activos = data.filter(e => e.estado === 'Activo').length;
      const desertores = data.filter(e => e.estado === 'Desertor').length;
      const graduados = data.filter(e => e.estado === 'Graduado').length;
      const enRiesgo = data.filter(e => e.estado === 'En Riesgo').length;
      
      setKpis({
        total_estudiantes: total,
        activos,
        activos_pct: total > 0 ? Math.round((activos / total) * 100 * 10) / 10 : 0,
        desertores,
        desertores_pct: total > 0 ? Math.round((desertores / total) * 100 * 10) / 10 : 0,
        graduados,
        graduados_pct: total > 0 ? Math.round((graduados / total) * 100 * 10) / 10 : 0,
        en_riesgo: enRiesgo,
        en_riesgo_pct: total > 0 ? Math.round((enRiesgo / total) * 100 * 10) / 10 : 0
      });
    }
    
    setCargando(false);
  }

  const handleAplicarFiltros = (nuevosFiltros) => {
    setFiltros(nuevosFiltros);
  };

  const handleLimpiarFiltros = () => {
    setFiltros({});
  };

  if (!usuario) {
    return <LoadingSpinner mensaje="Cargando..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        vistaActiva={vistaActiva} 
        setVistaActiva={setVistaActiva}
        rol={usuario.rol}
      />

      <div className="flex-1">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              📈 Panel de Estadísticas
            </h1>
            <p className="text-gray-600">
              Visión general del programa Universidad en el Campo
            </p>
          </div>

          {/* FILTROS */}
          <FiltrosEstadisticas 
            onAplicarFiltros={handleAplicarFiltros}
            onLimpiarFiltros={handleLimpiarFiltros}
          />

          {cargando || !kpis ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando estadísticas..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <TarjetaKPI titulo="Total Estudiantes" valor={kpis.total_estudiantes || 0} color="from-blue-400 to-blue-500" />
                <TarjetaKPI titulo="Activos" valor={`${kpis.activos || 0} (${kpis.activos_pct || 0}%)`} color="from-emerald-400 to-emerald-500" />
                <TarjetaKPI titulo="Desertores" valor={`${kpis.desertores || 0} (${kpis.desertores_pct || 0}%)`} color="from-rose-400 to-rose-500" />
                <TarjetaKPI titulo="Graduados" valor={`${kpis.graduados || 0} (${kpis.graduados_pct || 0}%)`} color="from-sky-400 to-sky-500" />
                <TarjetaKPI titulo="En Riesgo" valor={`${kpis.en_riesgo || 0} (${kpis.en_riesgo_pct || 0}%)`} color="from-amber-300 to-amber-400" />
                <TarjetaKPI titulo="Grupos Totales" valor={gruposTotales} color="from-purple-400 to-purple-500" />
              </div>

              {/* GRÁFICOS PRINCIPALES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoEstadosDoughnut filtros={filtros} />
                <GraficoGeneroDoughnut filtros={filtros} />
              </div>

              {/* GRÁFICOS DE DISTRIBUCIÓN - FILA 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Municipio" 
                  campo="municipio" 
                  icono="📍" 
                  filtros={filtros}
                  limite={10}
                />
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Institución" 
                  campo="institucion_educativa" 
                  icono="🏫" 
                  filtros={filtros}
                  limite={10}
                />
              </div>

              {/* GRÁFICOS DE DISTRIBUCIÓN - FILA 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Universidad" 
                  campo="universidad" 
                  icono="🎓" 
                  filtros={filtros}
                  limite={10}
                />
                <GraficoBarrasHorizontal 
                  titulo="Estudiantes por Programa" 
                  campo="programa" 
                  icono="📚" 
                  filtros={filtros}
                  limite={10}
                />
              </div>

              {/* COMPARATIVO INTER-COHORTE */}
              <ComparativoCohortes filtros={filtros} />

              {/* RANKING DE DESERCIONES */}
              <RankingDeserciones filtros={filtros} />

              {/* INASISTENCIAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GraficoCausasInasistencia filtros={filtros} />
                <GraficoInasistenciasMensual filtros={filtros} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}