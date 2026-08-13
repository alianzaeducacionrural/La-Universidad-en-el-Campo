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
  instituciones: [],
  estados: [],
  fechaInicio: '',
  fechaFin: ''
};

const CATEGORIA_A_GETTER = {
  municipios: 'municipio',
  universidades: 'universidad',
  programas: 'programa',
  cohortes: 'cohorte',
  grupoIds: 'grupoId',
  instituciones: 'institucion'
};

const LABELS_CATEGORIA = {
  municipios: 'Municipio',
  universidades: 'Universidad',
  programas: 'Programa',
  cohortes: 'Cohorte',
  grupoIds: 'Grupo',
  instituciones: 'Institución',
  estados: 'Estado'
};

const ICONOS_CATEGORIA = {
  municipios: '📍',
  universidades: '🎓',
  programas: '📘',
  cohortes: '📅',
  grupoIds: '👥',
  instituciones: '🏫',
  estados: '📊'
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
  if (getters.institucion && filtros.instituciones.length > 0) {
    resultado = resultado.filter(r => filtros.instituciones.includes(getters.institucion(r)));
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

function MultiSelect({ label, icon, opciones, seleccionados, onChange, disponibles }) {
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
    const alcanzables = disponibles ? opciones.filter(o => disponibles.has(o.valor)) : opciones;
    if (seleccionados.length === alcanzables.length && alcanzables.length > 0) onChange([]);
    else onChange(alcanzables.map(o => o.valor));
  }

  const alcanzables = disponibles ? opciones.filter(o => disponibles.has(o.valor)) : opciones;
  const hayActivos = seleccionados.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className={`w-full h-10 px-3 rounded-lg text-sm border transition-colors flex items-center gap-2 whitespace-nowrap ${
          hayActivos
            ? 'bg-primary border-primary text-white shadow-sm'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="truncate flex-1 text-left font-medium">{label}</span>
        {hayActivos && (
          <span className="bg-white/25 text-white text-[11px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
            {seleccionados.length}
          </span>
        )}
        <span className={`text-[10px] flex-shrink-0 transition-transform duration-150 ${abierto ? '-rotate-180' : ''} ${hayActivos ? 'text-white/70' : 'text-gray-400'}`}>▾</span>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-900/10 max-h-72 overflow-y-auto py-1">
          {opciones.length > 0 && (
            <button
              type="button"
              onClick={toggleTodos}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 border-b border-gray-100 sticky top-0 bg-white"
            >
              {seleccionados.length === alcanzables.length && alcanzables.length > 0 ? '☐ Deseleccionar todos' : '☑ Seleccionar los disponibles'}
            </button>
          )}
          {opciones.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-400">Sin opciones</p>
          ) : (
            opciones.map(o => {
              const marcado = seleccionados.includes(o.valor);
              const alcanzable = !disponibles || disponibles.has(o.valor) || marcado;
              return (
                <label
                  key={o.valor}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm ${alcanzable ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                  title={alcanzable ? undefined : 'Sin resultados con los demás filtros activos'}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={!alcanzable}
                    onChange={() => toggle(o.valor)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed"
                  />
                  <span className="truncate">{o.label ?? o.valor}</span>
                </label>
              );
            })
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
  filas,
  getters,
  municipiosPermitidos = null,
  mostrarEstado = true,
  mostrarFecha = true,
  mostrarInstitucion = false
}) {
  const categorias = ['municipios', 'universidades', 'programas', 'cohortes', 'grupoIds', 'instituciones'];
  const hayFiltros = Object.entries(filtros).some(([, v]) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );
  const totalActivos = categorias.reduce((acc, c) => acc + filtros[c].length, 0)
    + filtros.estados.length + (filtros.fechaInicio ? 1 : 0) + (filtros.fechaFin ? 1 : 0);

  function set(campo, valor) {
    onCambio({ ...filtros, [campo]: valor });
  }

  function quitarValor(campo, valor) {
    set(campo, filtros[campo].filter(v => v !== valor));
  }

  // Calcula, por categoría, qué valores siguen siendo alcanzables dado el
  // resto de filtros activos (excluyendo la propia categoría) — así elegir
  // Universidad reduce las Cohortes/Grupos que tiene sentido mostrar.
  function disponiblesPara(categoria) {
    if (!filas || !getters) return null;
    const sinEsta = { ...filtros, [categoria]: [] };
    const reducidas = aplicarFiltrosGenerico(filas, getters, sinEsta, municipiosPermitidos);
    const getter = getters[CATEGORIA_A_GETTER[categoria]];
    if (!getter) return null;
    return new Set(reducidas.map(getter).filter(Boolean));
  }

  function labelValor(campo, valor) {
    const opcion = opciones[campo === 'grupoIds' ? 'grupos' : campo]?.find(o => o.valor === valor);
    return opcion?.label ?? valor;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm flex-shrink-0">🔍</span>
          <span className="text-sm font-semibold text-gray-700">Filtros</span>
          {totalActivos > 0 && (
            <span className="bg-primary text-white text-xs font-semibold rounded-full px-2 py-0.5 leading-4">{totalActivos}</span>
          )}
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => onCambio(FILTROS_VACIOS)}
            className="text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${mostrarEstado && mostrarInstitucion ? 'lg:grid-cols-7' : mostrarEstado || mostrarInstitucion ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-2.5`}>
        <MultiSelect label="Municipio" icon={ICONOS_CATEGORIA.municipios} opciones={opciones.municipios} seleccionados={filtros.municipios} onChange={v => set('municipios', v)} disponibles={disponiblesPara('municipios')} />
        <MultiSelect label="Universidad" icon={ICONOS_CATEGORIA.universidades} opciones={opciones.universidades} seleccionados={filtros.universidades} onChange={v => set('universidades', v)} disponibles={disponiblesPara('universidades')} />
        <MultiSelect label="Programa" icon={ICONOS_CATEGORIA.programas} opciones={opciones.programas} seleccionados={filtros.programas} onChange={v => set('programas', v)} disponibles={disponiblesPara('programas')} />
        <MultiSelect label="Cohorte" icon={ICONOS_CATEGORIA.cohortes} opciones={opciones.cohortes} seleccionados={filtros.cohortes} onChange={v => set('cohortes', v)} disponibles={disponiblesPara('cohortes')} />
        <MultiSelect label="Grupo" icon={ICONOS_CATEGORIA.grupoIds} opciones={opciones.grupos} seleccionados={filtros.grupoIds} onChange={v => set('grupoIds', v)} disponibles={disponiblesPara('grupoIds')} />
        {mostrarInstitucion && (
          <MultiSelect label="Institución" icon={ICONOS_CATEGORIA.instituciones} opciones={opciones.instituciones} seleccionados={filtros.instituciones} onChange={v => set('instituciones', v)} disponibles={disponiblesPara('instituciones')} />
        )}
        {mostrarEstado && (
          <MultiSelect label="Estado" icon={ICONOS_CATEGORIA.estados} opciones={opciones.estados} seleccionados={filtros.estados} onChange={v => set('estados', v)} />
        )}
      </div>

      {mostrarFecha && (
        <div className="flex flex-wrap items-center gap-3 mt-3 bg-gray-50/70 border border-gray-200 rounded-xl px-3.5 py-2.5">
          <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center text-[10px] flex-shrink-0">📆</span>
            Rango de fechas:
          </span>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span>Desde</span>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={e => set('fechaInicio', e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span>Hasta</span>
            <input
              type="date"
              value={filtros.fechaFin}
              onChange={e => set('fechaFin', e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          {(filtros.fechaInicio || filtros.fechaFin) && (
            <button
              type="button"
              onClick={() => onCambio({ ...filtros, fechaInicio: '', fechaFin: '' })}
              className="text-xs text-gray-500 hover:text-red-600 underline"
            >
              Limpiar fechas
            </button>
          )}
        </div>
      )}

      {/* Chips de filtros activos — visibilidad inmediata sin abrir cada dropdown */}
      {hayFiltros && (
        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-100">
          {categorias.concat('estados').flatMap(campo =>
            filtros[campo].map(valor => (
              <span key={`${campo}-${valor}`} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark text-xs px-2.5 py-1 rounded-full">
                <span>{ICONOS_CATEGORIA[campo]}</span>
                <span className="font-semibold">{LABELS_CATEGORIA[campo]}:</span>
                <span>{labelValor(campo, valor)}</span>
                <button type="button" onClick={() => quitarValor(campo, valor)} className="text-primary-dark/50 hover:text-red-600 transition-colors">✕</button>
              </span>
            ))
          )}
          {filtros.fechaInicio && (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark text-xs px-2.5 py-1 rounded-full">
              Desde: {filtros.fechaInicio}
              <button type="button" onClick={() => set('fechaInicio', '')} className="text-primary-dark/50 hover:text-red-600 transition-colors">✕</button>
            </span>
          )}
          {filtros.fechaFin && (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary-dark text-xs px-2.5 py-1 rounded-full">
              Hasta: {filtros.fechaFin}
              <button type="button" onClick={() => set('fechaFin', '')} className="text-primary-dark/50 hover:text-red-600 transition-colors">✕</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
