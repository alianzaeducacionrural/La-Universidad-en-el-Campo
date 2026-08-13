// =============================================
// MODAL: EDITAR UNA FECHA PUNTUAL DEL CRONOGRAMA
// =============================================
// A diferencia de ModalCronogramaGrupo (que muestra todo el historial del
// grupo), este modal solo carga y modifica la fecha específica en la que se
// hizo clic — pensado para el flujo "clic en una fila → editar solo eso".
// Se le pasa únicamente el id de la fila de cronograma_clases; el propio
// modal trae sus datos (y el registro de asistencia del mismo día, si ya se
// reportó) para no depender de cómo cada pantalla que lo usa calculó su
// propia lista — así sirve igual para el panel de universidad y para
// Cumplimiento del Cronograma en el panel de admin.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, interpretarError, cruzarCronogramaConAsistencia } from '../../utils/helpers';

const ESTILOS_ESTADO = {
  confirmada: { chip: 'bg-primary/10 text-primary-dark', texto: 'Asistencia registrada' },
  pendiente: { chip: 'bg-amber-100 text-amber-700', texto: 'Asistencia pendiente' },
  programada: { chip: 'bg-gray-100 text-gray-500', texto: 'Próxima sesión' }
};

export default function ModalEditarFechaCronograma({ isOpen, onClose, fechaId, grupoNombre, onActualizado }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [fecha, setFecha] = useState(null);
  const [detalle, setDetalle] = useState({ fecha: '', modulo: '', docente_universitario: '', telefono_contacto: '' });
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (isOpen && fechaId) cargarFecha();
    else { setFecha(null); setDetalle({ fecha: '', modulo: '', docente_universitario: '', telefono_contacto: '' }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fechaId]);

  async function cargarFecha() {
    setCargando(true);
    const { data: crono } = await supabase
      .from('cronograma_clases')
      .select('id, grupo_id, fecha, modulo, docente_universitario, telefono_contacto, modulo_original, docente_original, telefono_original')
      .eq('id', fechaId)
      .maybeSingle();

    if (!crono) {
      setCargando(false);
      return;
    }

    const { data: registrosDelDia } = await supabase
      .from('registros_asistencia')
      .select('fecha, modulo, docente_nombre, docente_telefono')
      .eq('grupo_id', crono.grupo_id)
      .eq('fecha', crono.fecha);

    const [fechaConEstado] = cruzarCronogramaConAsistencia([crono], registrosDelDia || []);
    setFecha(fechaConEstado);
    setDetalle({
      fecha: fechaConEstado.fecha || '',
      modulo: fechaConEstado.moduloEfectivo || '',
      docente_universitario: fechaConEstado.docenteEfectivo || '',
      telefono_contacto: fechaConEstado.telefonoEfectivo || ''
    });
    setCargando(false);
  }

  async function guardar() {
    if (!detalle.fecha) {
      notificacion.warning('La fecha es obligatoria', 'Campo requerido');
      return;
    }
    if (!detalle.modulo.trim()) {
      notificacion.warning('El módulo es obligatorio', 'Campo requerido');
      return;
    }
    setGuardando(true);
    const { error } = await supabase
      .from('cronograma_clases')
      .update({
        fecha: detalle.fecha,
        modulo: detalle.modulo.trim(),
        docente_universitario: detalle.docente_universitario.trim() || null,
        telefono_contacto: detalle.telefono_contacto.trim() || null
      })
      .eq('id', fechaId);
    setGuardando(false);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al actualizar');
      return;
    }
    notificacion.success('Fecha del cronograma actualizada');
    onActualizado?.();
    onClose();
  }

  async function eliminar() {
    if (!confirm('¿Eliminar esta fecha del cronograma?')) return;
    setEliminando(true);
    const { error } = await supabase.from('cronograma_clases').delete().eq('id', fechaId);
    setEliminando(false);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
      return;
    }
    notificacion.success('Fecha eliminada del cronograma');
    onActualizado?.();
    onClose();
  }

  if (!isOpen) return null;

  const estilo = fecha ? (ESTILOS_ESTADO[fecha.estado] || ESTILOS_ESTADO.programada) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-warm-light z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800">🗓️ Editar Fecha</h3>
              {grupoNombre && <p className="text-sm text-gray-500 mt-1 truncate">{grupoNombre}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none hover:bg-white/60 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0"
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {cargando || !fecha ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estilo.chip}`}>{estilo.texto}</span>
                <span className="text-xs text-gray-400">{formatearFecha(fecha.fecha)}</span>
              </div>

              {fecha.huboAjuste && (
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  🕘 Programado originalmente: {fecha.moduloOriginal || '—'}
                  {fecha.docenteOriginal ? ` · ${fecha.docenteOriginal}` : ''}
                  {fecha.telefonoOriginal ? ` · ${fecha.telefonoOriginal}` : ''}
                </p>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                <input
                  type="date"
                  value={detalle.fecha}
                  onChange={e => setDetalle(d => ({ ...d, fecha: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Módulo *</label>
                <input
                  type="text"
                  value={detalle.modulo}
                  onChange={e => setDetalle(d => ({ ...d, modulo: e.target.value }))}
                  placeholder="Ej: Matemáticas"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Docente universitario (opcional)</label>
                <input
                  type="text"
                  value={detalle.docente_universitario}
                  onChange={e => setDetalle(d => ({ ...d, docente_universitario: e.target.value }))}
                  placeholder="Nombre del docente"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono de contacto (opcional)</label>
                <input
                  type="text"
                  value={detalle.telefono_contacto}
                  onChange={e => setDetalle(d => ({ ...d, telefono_contacto: e.target.value }))}
                  placeholder="3115551234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={eliminar}
                disabled={eliminando}
                className="text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition disabled:opacity-50"
              >
                🗑️ Eliminar fecha
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
