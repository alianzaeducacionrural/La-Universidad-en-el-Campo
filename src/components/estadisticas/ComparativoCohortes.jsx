// =============================================
// COMPONENTE: COMPARATIVO INTER-COHORTE (CON FILTROS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ComparativoCohortes({ filtros = {} }) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    
    try {
      // ==========================================
      // Obtener TODOS los estudiantes con paginación y filtros
      // ==========================================
      let todosLosEstudiantes = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from('estudiantes').select('cohorte, estado');
        
        // Aplicar filtros
        if (filtros.municipios?.length > 0) {
          query = query.in('municipio', filtros.municipios);
        }
        if (filtros.cohortes?.length > 0) {
          query = query.in('cohorte', filtros.cohortes);
        }
        if (filtros.universidades?.length > 0) {
          query = query.in('universidad', filtros.universidades);
        }
        if (filtros.estados?.length > 0) {
          query = query.in('estado', filtros.estados);
        }
        
        const { data, error } = await query.range(from, from + limit - 1);

        if (error) {
          console.error('Error:', error);
          break;
        }
        
        if (data && data.length > 0) {
          todosLosEstudiantes = [...todosLosEstudiantes, ...data];
          from += limit;
        }
        
        if (!data || data.length < limit) {
          hasMore = false;
        }
      }
      
      // ==========================================
      // Procesar datos por cohorte
      // ==========================================
      const cohortesMap = new Map();
      
      todosLosEstudiantes.forEach(estudiante => {
        const cohorte = estudiante.cohorte;
        const estado = estudiante.estado;
        
        if (!cohorte) return;
        
        if (!cohortesMap.has(cohorte)) {
          cohortesMap.set(cohorte, {
            cohorte,
            total: 0,
            desertores: 0,
            graduados: 0
          });
        }
        
        const cohorteData = cohortesMap.get(cohorte);
        cohorteData.total++;
        
        if (estado === 'Desertor') cohorteData.desertores++;
        if (estado === 'Graduado') cohorteData.graduados++;
      });
      
      // Convertir a array y calcular porcentajes
      const datosProcesados = Array.from(cohortesMap.values())
        .map(c => ({
          cohorte: c.cohorte,
          total_estudiantes: c.total,
          desercion_pct: c.total > 0 ? Math.round((c.desertores / c.total) * 100) : 0,
          graduacion_pct: c.total > 0 ? Math.round((c.graduados / c.total) * 100) : 0
        }))
        .sort((a, b) => a.cohorte.localeCompare(b.cohorte));
      
      setDatos(datosProcesados);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setDatos([]);
    }
    
    setCargando(false);
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📅 Comparativo Inter-Cohorte</h3>
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📅 Comparativo Inter-Cohorte</h3>
        <p className="text-gray-500 text-center py-8">
          {Object.values(filtros).some(arr => arr?.length > 0) 
            ? 'No hay datos disponibles para los filtros seleccionados.'
            : 'No hay datos disponibles'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">📅 Comparativo Inter-Cohorte</h3>
      <p className="text-sm text-gray-500 mb-4">Indicadores clave por cohorte</p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Indicador</th>
              {datos.map(d => (
                <th key={d.cohorte} className="text-center py-3 px-2 font-semibold text-gray-700">
                  {d.cohorte}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">👥 Total Estudiantes</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-gray-800">{d.total_estudiantes}</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">🚨 % Deserción</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-red-600">{d.desercion_pct}%</span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">🎓 % Graduación</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-blue-600">{d.graduacion_pct}%</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}