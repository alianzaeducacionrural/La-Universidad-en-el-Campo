// =============================================
// COMPONENTE: FILTROS PARA GESTIÓN DE GRUPOS
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function FiltrosGrupos({ filtros, setFiltros }) {
  const [universidades, setUniversidades] = useState([]);
  const [cohortes, setCohortes] = useState([]);

  useEffect(() => {
    cargarOpciones();
  }, []);

  async function cargarOpciones() {
    const { data: uni } = await supabase.from('universidades').select('nombre').order('nombre');
    if (uni) setUniversidades(uni.map(u => u.nombre));

    const { data: coh } = await supabase.from('grupos').select('cohorte').order('cohorte');
    if (coh) {
      const unicas = [...new Set(coh.map(c => c.cohorte).filter(c => c))];
      setCohortes(unicas.sort());
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Universidad */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">🎓 Universidad:</label>
          <select
            value={filtros.universidad}
            onChange={(e) => setFiltros({ ...filtros, universidad: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {universidades.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Cohorte */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">📅 Cohorte:</label>
          <select
            value={filtros.cohorte}
            onChange={(e) => setFiltros({ ...filtros, cohorte: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {cohortes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">📊 Estado:</label>
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>

        {/* Botón limpiar */}
        <button
          onClick={() => setFiltros({ universidad: '', cohorte: '', estado: 'activo' })}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          🔄 Limpiar filtros
        </button>
      </div>
    </div>
  );
}