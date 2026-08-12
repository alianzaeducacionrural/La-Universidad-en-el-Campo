// =============================================
// MODAL: CAMBIAR ESTUDIANTE DE GRUPO (TRASLADO)
// =============================================
//
// Al confirmar: se actualiza estudiantes.grupo_id (y universidad/programa/cohorte
// si el grupo destino difiere) y se registra el traslado en traslados_grupo para
// dejar trazabilidad de origen → destino. El historial (inasistencias, notas,
// seguimientos) del grupo anterior NO se toca — sigue visible en el perfil del
// estudiante, etiquetado con el grupo donde ocurrió cada registro.

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotificacion } from '../../context/NotificacionContext';
import { supabase } from '../../lib/supabaseClient';
import { interpretarError } from '../../utils/helpers';

export default function ModalCambiarGrupo({ isOpen, onClose, estudiante, onTrasladado }) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const [grupos, setGrupos] = useState([]);
  const [grupoDestinoId, setGrupoDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarGrupos();
      setGrupoDestinoId('');
      setMotivo('');
      setObservaciones('');
    }
  }, [isOpen]);

  async function cargarGrupos() {
    setCargandoGrupos(true);
    const { data } = await supabase
      .from('grupos')
      .select('id, nombre, universidad, programa, cohorte')
      .eq('activo', true)
      .order('universidad')
      .order('nombre');
    setGrupos((data || []).filter(g => g.id !== estudiante?.grupo_id));
    setCargandoGrupos(false);
  }

  const grupoDestino = grupos.find(g => g.id === grupoDestinoId);
  const cambianDatosAcademicos = grupoDestino && (
    grupoDestino.universidad !== estudiante?.universidad ||
    grupoDestino.programa !== estudiante?.programa ||
    grupoDestino.cohorte !== estudiante?.cohorte
  );

  // Agrupar por universidad para el selector
  const gruposPorUniversidad = grupos.reduce((acc, g) => {
    (acc[g.universidad] = acc[g.universidad] || []).push(g);
    return acc;
  }, {});

  async function handleSubmit(e) {
    e.preventDefault();
    if (!grupoDestinoId) {
      notificacion.warning('Selecciona el grupo destino.', 'Campo requerido');
      return;
    }
    if (!grupoDestino) return;

    const grupoOrigenId = estudiante.grupo_id;
    setCargando(true);

    const { error: errorUpdate } = await supabase
      .from('estudiantes')
      .update({
        grupo_id: grupoDestino.id,
        universidad: grupoDestino.universidad,
        programa: grupoDestino.programa,
        cohorte: grupoDestino.cohorte
      })
      .eq('id', estudiante.id);

    if (errorUpdate) {
      notificacion.error(interpretarError(errorUpdate), 'Error al trasladar');
      setCargando(false);
      return;
    }

    const { error: errorTraslado } = await supabase.from('traslados_grupo').insert([{
      estudiante_id: estudiante.id,
      grupo_origen_id: grupoOrigenId || null,
      grupo_destino_id: grupoDestino.id,
      usuario_id: usuario?.id || null,
      motivo: motivo.trim() || null,
      observaciones: observaciones.trim() || null
    }]);

    if (errorTraslado) {
      // Revertir el cambio de grupo si no se pudo dejar el registro del traslado
      await supabase
        .from('estudiantes')
        .update({
          grupo_id: grupoOrigenId,
          universidad: estudiante.universidad,
          programa: estudiante.programa,
          cohorte: estudiante.cohorte
        })
        .eq('id', estudiante.id);
      notificacion.error(interpretarError(errorTraslado), 'Error al registrar el traslado');
      setCargando(false);
      return;
    }

    // Reflejar el cambio de inmediato en el objeto en memoria (mismo patrón
    // usado para el cambio de estado en ModalPerfilEstudiante).
    estudiante.grupo_id = grupoDestino.id;
    estudiante.universidad = grupoDestino.universidad;
    estudiante.programa = grupoDestino.programa;
    estudiante.cohorte = grupoDestino.cohorte;

    notificacion.success(`${estudiante.nombre_completo} fue trasladado a "${grupoDestino.nombre}"`);
    setCargando(false);
    onTrasladado?.(grupoDestino);
    onClose();
  }

  if (!isOpen || !estudiante) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-800">🔄 Cambiar de Grupo</h3>
              <p className="text-sm text-gray-500 mt-1">{estudiante.nombre_completo}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p><strong>Grupo actual:</strong> {estudiante.universidad} · {estudiante.programa} · Cohorte {estudiante.cohorte}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Grupo destino *</label>
              {cargandoGrupos ? (
                <p className="text-sm text-gray-400 py-2">Cargando grupos...</p>
              ) : (
                <select
                  value={grupoDestinoId}
                  onChange={e => setGrupoDestinoId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {Object.entries(gruposPorUniversidad).map(([universidad, gs]) => (
                    <optgroup key={universidad} label={universidad}>
                      {gs.map(g => (
                        <option key={g.id} value={g.id}>{g.nombre} (Cohorte {g.cohorte})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {cambianDatosAcademicos && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                ⚠️ Este cambio también actualizará la universidad, programa y/o cohorte del estudiante
                a los del grupo destino ({grupoDestino.universidad} · {grupoDestino.programa} · Cohorte {grupoDestino.cohorte}).
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Motivo del traslado</label>
              <input
                type="text"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Cambio de sede, reagrupación, solicitud del estudiante..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            <p className="text-xs text-gray-400">
              El historial de inasistencias, notas y seguimientos del grupo actual se conserva y sigue
              visible en el perfil del estudiante. El estudiante dejará de aparecer en las tablas y
              reportes del grupo actual.
            </p>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !grupoDestinoId}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
            >
              {cargando ? 'Trasladando...' : 'Confirmar Traslado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
