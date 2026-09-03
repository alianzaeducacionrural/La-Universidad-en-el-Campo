// =============================================
// UTILIDAD: ELIMINAR SEGUIMIENTO DE UNIVERSIDAD
// =============================================
// Compartida entre ModalPerfilEstudiante.jsx y ConsolidadoSeguimientosUniversidad.jsx
// para no duplicar la limpieza de evidencias en Storage al borrar un seguimiento.

import { supabase } from '../lib/supabaseClient';

function extraerRutaStorage(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === 'evidencias');
    if (bucketIndex === -1) return null;
    return pathParts.slice(bucketIndex + 1).join('/');
  } catch {
    return null;
  }
}

export async function eliminarSeguimientoUniversidad(seguimiento) {
  const rutas = (seguimiento.evidencias || []).map(extraerRutaStorage).filter(Boolean);
  if (rutas.length > 0) {
    await supabase.storage.from('evidencias').remove(rutas);
  }
  const { error } = await supabase.from('seguimientos_universidad').delete().eq('id', seguimiento.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
