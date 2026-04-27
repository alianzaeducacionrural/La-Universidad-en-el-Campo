// =============================================
// PANEL: MONITOREO DE ACCIONES POR GRUPO (SIN ABREVIATURAS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

export default function PanelMonitoreoAcciones() {
  const [grupos, setGrupos] = useState([]);
  const [acciones, setAcciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [filtroUniversidad, setFiltroUniversidad] = useState('');
  const [filtroCohorte, setFiltroCohorte] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    
    const { data: gruposData } = await supabase
      .from('grupos')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    
    const { data: accionesData } = await supabase
      .from('acciones_grupo')
      .select('*');
    
    if (gruposData && accionesData) {
      const accionesPorGrupo = {};
      accionesData.forEach(a => {
        if (!accionesPorGrupo[a.grupo_id]) accionesPorGrupo[a.grupo_id] = {};
        if (!accionesPorGrupo[a.grupo_id][a.tipo_accion]) accionesPorGrupo[a.grupo_id][a.tipo_accion] = [];
        accionesPorGrupo[a.grupo_id][a.tipo_accion].push(a);
      });
      
      setGrupos(gruposData);
      setAcciones(accionesPorGrupo);
    }
    
    setCargando(false);
  }

  // 🔥 Indicadores con nombres completos
  const indicadores = [
    { key: 'visita_sabado', num: 1, label: 'Visita Sábado 1', icono: '📅' },
    { key: 'visita_sabado', num: 2, label: 'Visita Sábado 2', icono: '📅' },
    { key: 'visita_sabado', num: 3, label: 'Visita Sábado 3', icono: '📅' },
    { key: 'visita_semana', num: 1, label: 'Visita Semana 1', icono: '🏫' },
    { key: 'visita_semana', num: 2, label: 'Visita Semana 2', icono: '🏫' },
    { key: 'bienestar_universitario', num: 1, label: 'Bienestar Universitario', icono: '🎯' },
    { key: 'practica_academica', num: 1, label: 'Práctica Académica', icono: '🎓' },
  ];

  function getEstadoIndicador(grupoId, tipo, numero) {
    const accionesGrupo = acciones[grupoId]?.[tipo] || [];
    const cumplidas = accionesGrupo.filter(a => a.numero_accion >= numero).length;
    return cumplidas > 0;
  }

  function getCumplimiento(grupoId) {
    let cumplidos = 0;
    indicadores.forEach(ind => {
      if (getEstadoIndicador(grupoId, ind.key, ind.num)) cumplidos++;
    });
    return cumplidos;
  }

  const gruposFiltrados = grupos.filter(g => {
    if (filtroUniversidad && g.universidad !== filtroUniversidad) return false;
    if (filtroCohorte && g.cohorte !== filtroCohorte) return false;
    return true;
  });

  const universidades = [...new Set(grupos.map(g => g.universidad))].sort();
  const cohortes = [...new Set(grupos.map(g => g.cohorte))].sort();

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando monitoreo..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Encabezado */}
      <div className="p-5 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <h3 className="font-bold text-gray-800 flex items-center">
          <span className="text-xl mr-2">📋</span>
          Monitoreo de Acciones por Grupo
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Estado de cumplimiento de las acciones requeridas para cada grupo activo
        </p>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mt-4">
          <select value={filtroUniversidad} onChange={e => setFiltroUniversidad(e.target.value)} 
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Todas las universidades</option>
            {universidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filtroCohorte} onChange={e => setFiltroCohorte(e.target.value)} 
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Todas las cohortes</option>
            {cohortes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-5">
        {gruposFiltrados.length === 0 ? (
          <EmptyState icono="📋" titulo="Sin grupos" descripcion="No hay grupos activos que coincidan con los filtros" />
        ) : (
          <div className="space-y-4">
            {gruposFiltrados.map(grupo => {
              const cumplidos = getCumplimiento(grupo.id);
              const total = indicadores.length;
              const porcentaje = Math.round((cumplidos / total) * 100);
              
              return (
                <div key={grupo.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
                  {/* Encabezado del grupo */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-lg">{grupo.nombre}</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">🎓 {grupo.universidad}</span>
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">📚 {grupo.programa}</span>
                      </div>
                    </div>
                    {/* Progreso */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{cumplidos}/{total}</p>
                        <p className="text-xs text-gray-500">completado</p>
                      </div>
                      <div className="w-28 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            porcentaje === 100 ? 'bg-green-500' :
                            porcentaje >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 🔥 INDICADORES CON NOMBRES COMPLETOS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {indicadores.map(ind => {
                      const cumplido = getEstadoIndicador(grupo.id, ind.key, ind.num);
                      return (
                        <div
                          key={ind.label}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                            cumplido 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <span className="text-sm">{ind.icono}</span>
                          <span className={`text-xs font-medium ${cumplido ? 'text-green-700' : 'text-red-700'}`}>
                            {ind.label}
                          </span>
                          <span className="ml-auto">{cumplido ? '✅' : '❌'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}