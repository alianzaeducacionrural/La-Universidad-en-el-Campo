// =============================================
// SINCRONIZACIÓN: ESTUDIANTE ACTUALIZADO
// =============================================
// El modal global de "Ver Perfil" (App.jsx: GlobalModales/PanelModales) vive
// fuera de cada página — al guardar un cambio ahí no hay forma directa de
// avisarle a la página que abrió el perfil (ListadoEstudiantes, Estadisticas,
// DashboardUniversidad, etc.) que su copia local del estudiante quedó
// desactualizada, y hasta ahora eso obligaba a recargar la página para ver
// el cambio reflejado (p.ej. el badge de discapacidad/trastorno).
//
// Este evento de `window` resuelve eso sin tener que enhebrar un callback de
// recarga a través de App.jsx hacia cada página: quien guarda emite el
// cambio una sola vez, y cualquier página montada que tenga su propia copia
// del estudiante se suscribe y la parchea en el momento.

import { useEffect } from 'react';

const NOMBRE_EVENTO = 'app:estudiante-actualizado';

// `datos` es el objeto parcial que se guardó (los campos que cambiaron).
export function emitirEstudianteActualizado(id, datos) {
  window.dispatchEvent(new CustomEvent(NOMBRE_EVENTO, { detail: { id, datos } }));
}

// `onActualizado(id, datos)` se llama cada vez que algún componente emite un
// cambio — quien escucha decide si ese id le importa y cómo aplicarlo.
export function useEstudianteActualizado(onActualizado) {
  useEffect(() => {
    function handler(e) {
      onActualizado(e.detail.id, e.detail.datos);
    }
    window.addEventListener(NOMBRE_EVENTO, handler);
    return () => window.removeEventListener(NOMBRE_EVENTO, handler);
  }, [onActualizado]);
}
