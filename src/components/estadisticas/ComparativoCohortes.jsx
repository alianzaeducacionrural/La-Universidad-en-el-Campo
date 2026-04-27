// =============================================
// COMPONENTE: COMPARATIVO INTER-COHORTE (SIMPLIFICADO)
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
    
    let query = supabase.from('estudiantes').select('cohorte, estado');
    
    if (filtros.municipios?.length > 0) query = query.in('municipio', filtros.municipios);
    if (filtros.universidades?.length > 0) query = query.in('universidad', filtros.universidades);
    if (filtros.estados?.length > 0) query = query.in('estado', filtros.estados);
    
    const { data } = await query;
    
    if (data) {
      // Agrupar por cohorte manualmente
      const porCohorte = {};
      data.forEach(e => {
        if (!e.cohorte) return;
        if (!porCohorte[e.cohorte]) {
          porCohorte[e.cohorte] = { total: 0, desertores: 0, graduados: 0 };
        }
        porCohorte[e.cohorte].total++;
        if (e.estado === 'Desertor') porCohorte[e.cohorte].desertores++;
        if (e.estado === 'Graduado') porCohorte[e.cohorte].graduados++;
      });
      
      const resultado = Object.entries(porCohorte).map(([cohorte, stats]) => ({
        cohorte,
        total_estudiantes: stats.total,
        desercion_pct: stats.total > 0 ? Math.round((stats.desertores / stats.total) * 100 * 10) / 10 : 0,
        graduacion_pct: stats.total > 0 ? Math.round((stats.graduados / stats.total) * 100 * 10) / 10 : 0
      })).sort((a, b) => b.cohorte.localeCompare(a.cohorte));
      
      setDatos(resultado);
    }
    
    setCargando(false);
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📅 Comparativo Inter-Cohorte</h3>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">📅 Comparativo Inter-Cohorte</h3>
        <p className="text-gray-500 text-center py-8">No hay datos disponibles</p>
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
                  <span className={`font-semibold ${
                    d.desercion_pct <= 10 ? 'text-green-600' : 
                    d.desercion_pct <= 20 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {d.desercion_pct}%
                  </span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="py-3 px-2 font-medium text-gray-700">🎓 % Graduación</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-blue-600">{d.graduacion_pct || 0}%</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}