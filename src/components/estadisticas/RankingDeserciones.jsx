// =============================================
// COMPONENTE: RANKING DE DESERCIONES (CON FILTROS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RankingDeserciones({ filtros = {} }) {
  const [municipios, setMunicipios] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [universidades, setUniversidades] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('municipios');

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  async function cargarDatos() {
    setCargando(true);
    
    // Construir query base con filtros
    let query = supabase.from('estudiantes').select('*');
    if (filtros.municipios?.length > 0) query = query.in('municipio', filtros.municipios);
    if (filtros.cohortes?.length > 0) query = query.in('cohorte', filtros.cohortes);
    if (filtros.universidades?.length > 0) query = query.in('universidad', filtros.universidades);
    
    const { data } = await query;
    
    if (data) {
      // Función para calcular ranking
      const calcularRanking = (campo) => {
        const agrupado = {};
        data.forEach(e => {
          const valor = e[campo] || 'Sin especificar';
          if (!agrupado[valor]) agrupado[valor] = { total: 0, desertores: 0 };
          agrupado[valor].total++;
          if (e.estado === 'Desertor') agrupado[valor].desertores++;
        });
        
        return Object.entries(agrupado)
          .map(([nombre, stats]) => ({
            nombre,
            total_estudiantes: stats.total,
            desertores: stats.desertores,
            porcentaje_desercion: stats.total > 0 
              ? Math.round((stats.desertores / stats.total) * 1000) / 10 
              : 0
          }))
          .filter(d => d.desertores > 0)
          .sort((a, b) => b.porcentaje_desercion - a.porcentaje_desercion)
          .slice(0, 5);
      };
      
      setMunicipios(calcularRanking('municipio'));
      setInstituciones(calcularRanking('institucion_educativa'));
      setUniversidades(calcularRanking('universidad'));
      setProgramas(calcularRanking('programa'));
    }
    
    setCargando(false);
  }

  const renderBarras = (valor, maximo) => {
    const porcentaje = maximo > 0 ? (valor / maximo) * 100 : 0;
    return (
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full" style={{ width: `${porcentaje}%` }} />
      </div>
    );
  };

  const renderTabla = (datos, columnaNombre) => {
    if (!datos || datos.length === 0) {
      return <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>;
    }

    const maxDesertores = Math.max(...datos.map(d => d.desertores));
    const maxPorcentaje = Math.max(...datos.map(d => d.porcentaje_desercion));

    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 font-medium text-gray-600 text-xs">#</th>
            <th className="text-left py-2 px-2 font-medium text-gray-600 text-xs">{columnaNombre}</th>
            <th className="text-center py-2 px-2 font-medium text-gray-600 text-xs">Total</th>
            <th className="text-left py-2 px-2 font-medium text-gray-600 text-xs">Desertores</th>
            <th className="text-left py-2 px-2 font-medium text-gray-600 text-xs">% Deserción</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-2 font-medium text-gray-800">{idx + 1}.</td>
              <td className="py-2 px-2 text-gray-800">{d.nombre}</td>
              <td className="py-2 px-2 text-center text-gray-600">{d.total_estudiantes}</td>
              <td className="py-2 px-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-red-600">{d.desertores}</span>
                  {renderBarras(d.desertores, maxDesertores)}
                </div>
              </td>
              <td className="py-2 px-2">
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${
                    d.porcentaje_desercion > 20 ? 'text-red-600' : 
                    d.porcentaje_desercion > 10 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {d.porcentaje_desercion}%
                  </span>
                  {renderBarras(d.porcentaje_desercion, maxPorcentaje)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">🚨 Ranking de Deserciones</h3>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-2">🚨 Ranking de Deserciones</h3>
      <p className="text-sm text-gray-500 mb-4">Top 5 con mayor tasa de deserción</p>
      
      {/* Pestañas */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { id: 'municipios', label: '📍 Municipios', datos: municipios },
          { id: 'instituciones', label: '🏫 Instituciones', datos: instituciones },
          { id: 'universidades', label: '🎓 Universidades', datos: universidades },
          { id: 'programas', label: '📚 Programas', datos: programas }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setVistaActiva(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${
              vistaActiva === tab.id
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="overflow-x-auto">
        {vistaActiva === 'municipios' && renderTabla(municipios, 'Municipio')}
        {vistaActiva === 'instituciones' && renderTabla(instituciones, 'Institución')}
        {vistaActiva === 'universidades' && renderTabla(universidades, 'Universidad')}
        {vistaActiva === 'programas' && renderTabla(programas, 'Programa')}
      </div>
    </div>
  );
}