// =============================================
// COMPONENTE: COMPARATIVO INTER-COHORTE (CON FILTROS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { obtenerTodasLasFilas } from '../../utils/supabasePaginado';
import { aplicarFiltrosEstudiante } from '../../utils/filtrosConsulta';
import ErrorGrafico from './ErrorGrafico';

export default function ComparativoCohortes({ filtros = {} }) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(false);
    
    try {
      const todosLosEstudiantes = await obtenerTodasLasFilas(() =>
        aplicarFiltrosEstudiante(supabase.from('estudiantes').select('cohorte, estado'), filtros));
      
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
          desertores: c.desertores,
          graduados: c.graduados,
          desercion_pct: c.total > 0 ? Math.round((c.desertores / c.total) * 100) : 0,
          graduacion_pct: c.total > 0 ? Math.round((c.graduados / c.total) * 100) : 0
        }))
        .sort((a, b) => a.cohorte.localeCompare(b.cohorte));
      
      setDatos(datosProcesados);
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setDatos([]);
      setErrorCarga(true);
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

  if (errorCarga) return <ErrorGrafico titulo="📅 Comparativo Inter-Cohorte" />;

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
            <tr className="border-b border-gray-100 hover:bg-primary/20 transition-colors">
              <td className="py-3 px-2 font-medium text-gray-700">👥 Total Estudiantes</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-gray-800">{d.total_estudiantes}</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-100 hover:bg-primary/20 transition-colors">
              <td className="py-3 px-2 font-medium text-gray-700">🚨 Deserción</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-red-600">{d.desercion_pct}%</span>
                  <span className="block text-xs text-red-400">{d.desertores} est.</span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-primary/20 transition-colors">
              <td className="py-3 px-2 font-medium text-gray-700">🎓 Graduación</td>
              {datos.map(d => (
                <td key={d.cohorte} className="text-center py-3 px-2">
                  <span className="font-semibold text-blue-600">{d.graduacion_pct}%</span>
                  <span className="block text-xs text-blue-400">{d.graduados} est.</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}