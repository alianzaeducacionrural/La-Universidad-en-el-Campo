// =============================================
// UTILIDAD: TRAER TODAS LAS FILAS DE UNA CONSULTA
// =============================================

const TAMANO_PAGINA = 1000;

// Supabase corta cada respuesta en 1000 filas. Se pagina con `id` como
// desempate: ordenar solo por un campo repetido (p. ej. el created_at que
// comparten las inasistencias de una misma clase) hace que unas filas se
// repitan entre páginas y otras nunca lleguen.
export async function obtenerTodasLasFilas(construirConsulta) {
  let filas = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await construirConsulta()
      .order('id', { ascending: true })
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    filas = filas.concat(data || []);
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}
