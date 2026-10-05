// =============================================
// UTILIDAD: AJUSTAR MUNICIPIO/INSTITUCIÓN AL CATÁLOGO
// =============================================

import { supabase } from '../lib/supabaseClient';

const limpiar = (texto) => String(texto ?? '').replace(/\s+/g, ' ').trim();

const claveComparacion = (texto) =>
  limpiar(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Los filtros comparan texto exacto contra el catálogo: "Villamaria" o
// "Victoria " (como suelen venir de un Excel) dejaban al estudiante fuera.
export async function crearNormalizadorUbicacion() {
  const [municipiosRes, institucionesRes] = await Promise.all([
    supabase.from('municipios').select('id, nombre'),
    supabase.from('instituciones').select('nombre, municipio_id')
  ]);
  if (municipiosRes.error) throw municipiosRes.error;
  if (institucionesRes.error) throw institucionesRes.error;

  const municipiosPorClave = new Map(municipiosRes.data.map(m => [claveComparacion(m.nombre), m]));
  const institucionesPorClave = new Map(
    institucionesRes.data.map(i => [`${i.municipio_id}|${claveComparacion(i.nombre)}`, i.nombre])
  );

  return (municipio, institucion) => {
    const enCatalogo = municipiosPorClave.get(claveComparacion(municipio));
    const institucionCatalogo = enCatalogo
      && institucionesPorClave.get(`${enCatalogo.id}|${claveComparacion(institucion)}`);
    return {
      municipio: enCatalogo?.nombre ?? limpiar(municipio),
      institucion_educativa: institucionCatalogo ?? limpiar(institucion)
    };
  };
}
