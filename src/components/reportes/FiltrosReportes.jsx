// =============================================
// COMPONENTE: BARRA DE FILTROS PARA REPORTES
// Filtro genérico reutilizable (Reportes.jsx y GestionDesertores.jsx)
// =============================================

import { useState, useEffect, useRef } from 'react';

export const FILTROS_VACIOS = {
  municipios: [],
  universidades: [],
  programas: [],
  cohortes: [],
  grupoIds: [],
  estados: [],
  fechaInicio: '',
  fechaFin: ''
};

/**
 * Aplica el estado de FiltrosReportes a un arreglo de filas.
 * `getters` mapea cada categoría a una función que extrae ese valor de una fila;
 * si un getter no se provee (p.ej. `estado` o `fecha` en reportes donde no aplica),
 * esa categoría simplemente no filtra ese conjunto.
 * `municipiosPermitidos` (null = sin restricción) se aplica primero y siempre,
 * independiente de la selección de municipios del usuario — es el alcance del aliado.
 */
export function aplicarFiltrosGenerico(filas, getters, filtros, municipiosPermitidos) {
  let resultado = filas;

  if (municipiosPermitidos) {
    resultado = resultado.filter(r => municipiosPermitidos.includes(getters.municipio(r)));
  }
  if (filtros.municipios.length > 0) {
    resultado = resultado.filter(r => filtros.municipios.includes(getters.municipio(r)));
  }
  if (filtros.universidades.length > 0) {
    resultado = resultado.filter(r => filtros.universidades.includes(getters.universidad(r)));
  }
  if (filtros.programas.length > 0) {
    resultado = resultado.filter(r => filtros.programas.includes(getters.programa(r)));
  }
  if (filtros.cohortes.length > 0) {
    resultado = resultado.filter(r => filtros.cohortes.includes(getters.cohorte(r)));
  }
  if (filtros.grupoIds.length > 0) {
    resultado = resultado.filter(r => filtros.grupoIds.includes(getters.grupoId(r)));
  }
  if (getters.estado && filtros.estados.length > 0) {
    resultado = resultado.filter(r => filtros.estados.includes(getters.estado(r)));
  }
  if (getters.fecha && (filtros.fechaInicio || filtros.fechaFin)) {
    resultado = resultado.filter(r => {
      const f = getters.fecha(r);
      if (!f) return false;
      if (filtros.fechaInicio && f < filtros.fechaInicio) return false;
      if (filtros.fechaFin && f > filtros.fechaFin) return false;
      return true;
    });
  }
  return resultado;
}

function MultiSelect({ label, icon, opciones, seleccionados, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickFuera(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  function toggle(valor) {
    onChange(
      seleccionados.includes(valor)
        ? seleccionados.filter(v => v !== valor)
        : [...seleccionados, valor]
    );
  }

  function toggleTodos() {
    if (seleccionados.length === opciones.length) onChange([]);
    else onChange(opciones.map(o => o.valor));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className={`px-3 py-2 rounded-lg text-sm border transition flex items-center gap-1.5 whitespace-nowrap ${
          seleccionados.length > 0
            ? 'bg-primary/10 border-primary/30 text-primary-dark'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
        {seleccionados.length > 0 && (
          <span className="bg-primary text-white text-xs rounded-full px-1.5 leading-4">{seleccionados.length}</span>
        )}
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {opciones.length > 0 && (
            <button
              type="button"
              onClick={toggleTodos}
              className="w-full text-left px-3 py-2 text-xs font-medium text-primary hover:bg-gray-50 border-b border-gray-100 sticky top-0 bg-white"
            >
              {seleccionados.length === opciones.length ? '☐ Deseleccionar todos' : '☑ Seleccionar todos'}
            </button>
          )}
          {opciones.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400">Sin opciones</p>
          ) : (
            opciones.map(o => (
              <label key={o.valor} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(o.valor)}
                  onChange={() => toggle(o.valor)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="truncate">{o.label ?? o.valor}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function FiltrosReportes({
  filtros,
  onCambio,
  opciones,
  mostrarEstado = true,
  mostrarFecha = true
}) {
  const hayFiltros = Object.entries(filtros).some(([, v]) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  function set(campo, valor) {
    onCambio({ ...filtros, [campo]: valor });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 mr-1">🔍 Filtros:</span>

        <MultiSelect label="Municipio" icon="📍" opciones={opciones.municipios} seleccionados={filtros.municipios} onChange={v => set('municipios', v)} />
        <MultiSelect label="Universidad" icon="🎓" opciones={opciones.universidades} seleccionados={filtros.universidades} onChange={v => set('universidades', v)} />
        <MultiSelect label="Programa" icon="📘" opciones={opciones.programas} seleccionados={filtros.programas} onChange={v => set('programas', v)} />
        <MultiSelect label="Cohorte" icon="📅" opciones={opciones.cohortes} seleccionados={filtros.cohortes} onChange={v => set('cohortes', v)} />
        <MultiSelect label="Grupo" icon="👥" opciones={opciones.grupos} seleccionados={filtros.grupoIds} onChange={v => set('grupoIds', v)} />
        {mostrarEstado && (
          <MultiSelect label="Estado" icon="📊" opciones={opciones.estados} seleccionados={filtros.estados} onChange={v => set('estados', v)} />
        )}

        {mostrarFecha && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-2 py-1">
            <span>Desde</span>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={e => set('fechaInicio', e.target.value)}
              className="border-0 text-sm focus:ring-0 p-0.5"
            />
            <span>Hasta</span>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={e => set('fechaFin', e.target.value)}
              className="border-0 text-sm focus:ring-0 p-0.5"
            />
          </div>
        )}

        {hayFiltros && (
          <button
            type="button"
            onClick={() => onCambio(FILTROS_VACIOS)}
            className="text-sm text-gray-500 hover:text-red-600 transition ml-1"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
