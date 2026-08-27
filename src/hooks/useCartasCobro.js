// =============================================
// HOOK: ESTADO DE CARTAS DE COBRO
// =============================================
// Única fuente de verdad para la pestaña "Estado de Cartas" (GestionMultas.jsx)
// y para el modal de alerta automática (App.jsx, solo asistente_admin).
// Reutiliza la misma consulta y el mismo filtro de elegibilidad que
// cargarMultas() en GestionMultas.jsx: un estudiante solo cuenta si sigue
// siendo "Desertor" Y la multa pertenece a su registro de deserción más
// reciente Y ese registro sigue siendo "Sin Justificar" — así una multa
// queda automáticamente fuera de la alerta/pestaña en cuanto el estudiante
// cambia de estado o su deserción se reclasifica como justificada.
//
// Elegibilidad para la alerta (25/30 días): solo estudiantes con al menos
// una carta ya enviada (avisar sobre el envío de la carta 1 está fuera de
// alcance) y cuya última carta enviada no sea la #3 (proceso completo, no
// hay carta 4 que esperar). "Última carta" se calcula con el número más alto
// (no con la cantidad de filas), porque el flujo de generación no obliga a
// enviar las cartas en orden.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const UN_DIA_MS = 24 * 60 * 60 * 1000;

function diasDesde(fechaEmision, hoyISO) {
  const emision = new Date(fechaEmision.split('T')[0]);
  const hoy = new Date(hoyISO);
  return Math.floor((hoy - emision) / UN_DIA_MS);
}

export default function useCartasCobro() {
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase
      .from('multas_desercion')
      .select(`
        *,
        estudiante:estudiante_id (*, registros_desercion (id, tipo_desercion, fecha_reporte, created_at)),
        cartas:cartas_cobro(*)
      `)
      .order('created_at', { ascending: false });

    const hoyISO = new Date().toISOString().split('T')[0];
    const resultado = [];

    (data || []).forEach(m => {
      if (m.estudiante?.estado !== 'Desertor') return;
      const registros = m.estudiante?.registros_desercion || [];
      const registroActual = [...registros].sort((a, b) => {
        const porFecha = (b.fecha_reporte || '').localeCompare(a.fecha_reporte || '');
        if (porFecha !== 0) return porFecha;
        return (b.created_at || '').localeCompare(a.created_at || '');
      })[0];
      const elegible = registroActual?.id === m.registro_desercion_id && registroActual?.tipo_desercion === 'Sin Justificar';
      if (!elegible) return;

      const cartas = m.cartas || [];
      if (cartas.length === 0) return; // sin cartas enviadas: fuera de alcance
      const numeroUltimaCarta = Math.max(...cartas.map(c => c.numero_carta));
      if (numeroUltimaCarta >= 3) return; // ya se envió la carta 3: proceso completo

      const ultimaCarta = cartas.find(c => c.numero_carta === numeroUltimaCarta);
      const dias = diasDesde(ultimaCarta.fecha_emision, hoyISO);
      const estadoAlerta = dias < 25 ? 'a_tiempo' : dias < 30 ? 'proximo_a_vencer' : 'vencido';

      resultado.push({
        multa: m,
        estudiante: m.estudiante,
        ultimaCarta,
        siguienteNumeroCarta: numeroUltimaCarta + 1,
        dias,
        estadoAlerta
      });
    });

    resultado.sort((a, b) => b.dias - a.dias);
    setPendientes(resultado);
    setCargando(false);
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const alertables = pendientes.filter(p => p.estadoAlerta !== 'a_tiempo');

  return { cargando, pendientes, alertables, recargar };
}
