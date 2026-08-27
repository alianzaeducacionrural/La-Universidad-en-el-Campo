// =============================================
// HOOK: ESTADO DE CARTAS DE COBRO
// =============================================
// Única fuente de verdad para la pestaña "Estado de Cartas" (GestionMultas.jsx)
// y para el modal de alerta automática (App.jsx, solo asistente_admin).
// Reutiliza el mismo filtro de elegibilidad que cargarMultas() en
// GestionMultas.jsx: un estudiante solo cuenta si sigue siendo "Desertor" Y
// la multa pertenece a su registro de deserción más reciente Y ese registro
// sigue siendo "Sin Justificar" — así una multa queda automáticamente fuera
// de la alerta/pestaña en cuanto el estudiante cambia de estado o su
// deserción se reclasifica como justificada.
//
// IMPORTANTE: el estado se calcula con base en los DOCUMENTOS realmente
// subidos (documentos_desercion con tipo_documento carta_cobro_1/2/3, vía
// ModalEditarDesercion.jsx), no con las filas de la tabla cartas_cobro que
// genera el botón "Generar Carta" de GestionMultas.jsx — esa tabla registra
// una intención/plantilla, no evidencia de envío real, así que no es fuente
// de verdad para este seguimiento.
//
// Elegibilidad para la alerta (25/30 días): solo estudiantes con al menos
// un documento de carta ya subido (avisar sobre la carta 1 está fuera de
// alcance) y cuya última carta subida no sea la #3 (proceso completo, no
// hay carta 4 que esperar). "Última carta" se calcula con el número más alto
// (no con la cantidad de documentos), porque no hay garantía de que se suban
// en orden.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const REGEX_CARTA_COBRO = /^carta_cobro_([123])$/;

function diasDesde(fechaISO, hoyISO) {
  const inicio = new Date(fechaISO.split('T')[0]);
  const hoy = new Date(hoyISO);
  return Math.floor((hoy - inicio) / UN_DIA_MS);
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
        estudiante:estudiante_id (
          *,
          registros_desercion (
            id, tipo_desercion, fecha_reporte, created_at,
            documentos:documentos_desercion (tipo_documento, created_at)
          )
        )
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

      // Cartas de cobro subidas como documento — cada una con su número
      // (extraído de tipo_documento) y la fecha en que se subió.
      const cartasSubidas = (registroActual.documentos || [])
        .map(d => {
          const match = REGEX_CARTA_COBRO.exec(d.tipo_documento);
          return match ? { numero: parseInt(match[1], 10), fecha: d.created_at } : null;
        })
        .filter(Boolean);
      if (cartasSubidas.length === 0) return; // sin cartas subidas: fuera de alcance

      const numeroUltimaCarta = Math.max(...cartasSubidas.map(c => c.numero));
      if (numeroUltimaCarta >= 3) return; // ya se subió la carta 3: proceso completo

      // Si el mismo número se subió más de una vez (re-subida/reemplazo), usar la más reciente.
      const fechaUltimaCarta = cartasSubidas
        .filter(c => c.numero === numeroUltimaCarta)
        .reduce((masReciente, c) => (c.fecha > masReciente ? c.fecha : masReciente), '');

      const dias = diasDesde(fechaUltimaCarta, hoyISO);
      const estadoAlerta = dias < 25 ? 'a_tiempo' : dias < 30 ? 'proximo_a_vencer' : 'vencido';

      resultado.push({
        multa: m,
        estudiante: m.estudiante,
        numeroUltimaCarta,
        fechaUltimaCarta,
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
