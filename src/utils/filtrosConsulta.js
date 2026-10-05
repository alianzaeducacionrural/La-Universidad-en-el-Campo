// =============================================
// UTILIDAD: FILTROS DE ESTUDIANTE EN CONSULTAS SUPABASE
// =============================================

const COLUMNA_POR_FILTRO = [
  ['municipios', 'municipio'],
  ['cohortes', 'cohorte'],
  ['universidades', 'universidad'],
  ['estados', 'estado'],
  ['programas', 'programa'],
  ['instituciones', 'institucion_educativa'],
  ['grupoIds', 'grupo_id']
];

// Mismo criterio que tieneEtiquetaEspecial(): 'NO APLICA' cuenta como sin etiqueta.
const OR_NECESIDADES_ESPECIALES =
  'and(discapacidad_tipo.not.is.null,discapacidad_tipo.neq.NO APLICA),and(trastorno_tipo.not.is.null,trastorno_tipo.neq.NO APLICA)';

// Traduce el estado de FiltrosReportes a filtros de Supabase. `tablaEmbebida`
// es el nombre del embed (con !inner) cuando la consulta es sobre otra tabla.
export function aplicarFiltrosEstudiante(query, filtros = {}, tablaEmbebida = null) {
  const columna = c => (tablaEmbebida ? `${tablaEmbebida}.${c}` : c);
  for (const [clave, nombreColumna] of COLUMNA_POR_FILTRO) {
    if (filtros[clave]?.length > 0) query = query.in(columna(nombreColumna), filtros[clave]);
  }
  if (filtros.necesidadesEspeciales) {
    query = tablaEmbebida
      ? query.or(OR_NECESIDADES_ESPECIALES, { referencedTable: tablaEmbebida })
      : query.or(OR_NECESIDADES_ESPECIALES);
  }
  return query;
}

export function hayFiltrosEstudiante(filtros = {}) {
  return COLUMNA_POR_FILTRO.some(([clave]) => filtros[clave]?.length > 0) || Boolean(filtros.necesidadesEspeciales);
}
