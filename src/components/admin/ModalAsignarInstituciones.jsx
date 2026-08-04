// =============================================
// MODAL: ASIGNAR PADRINOS POR INSTITUCIÓN DENTRO DE UN GRUPO
// =============================================
// Un grupo puede tener estudiantes de varias instituciones. Este modal permite,
// además de la asignación normal de padrinos a todo el grupo, delegar una o
// varias instituciones específicas de ese grupo a un padrino (que puede ser
// distinto del padrino general, o no tener padrino general en absoluto).

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function ModalAsignarInstituciones({ isOpen, onClose, grupo }) {
  const notificacion = useNotificacion();
  const [instituciones, setInstituciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]); // filas de grupo_padrino con institución
  const [padrinos, setPadrinos] = useState([]);
  const [padrinoElegido, setPadrinoElegido] = useState('');
  const [institucionesElegidas, setInstitucionesElegidas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(null);

  useEffect(() => {
    if (isOpen) cargarDatos();
    else {
      setPadrinoElegido('');
      setInstitucionesElegidas([]);
    }
  }, [isOpen]);

  async function cargarDatos() {
    setCargando(true);

    const [{ data: estudiantesGrupo }, { data: asignacionesActuales }, { data: todosPadrinos }] = await Promise.all([
      supabase.from('estudiantes').select('institucion_educativa').eq('grupo_id', grupo.id),
      supabase
        .from('grupo_padrino')
        .select('id, institucion_educativa, padrinos:padrino_id (id, nombre_completo, correo)')
        .eq('grupo_id', grupo.id)
        .not('institucion_educativa', 'is', null)
        .order('institucion_educativa'),
      supabase.from('padrinos').select('id, nombre_completo, correo').eq('activo', true).order('nombre_completo')
    ]);

    const institucionesUnicas = [...new Set((estudiantesGrupo || []).map(e => e.institucion_educativa).filter(Boolean))].sort();
    setInstituciones(institucionesUnicas);
    setAsignaciones((asignacionesActuales || []).filter(a => a.padrinos));
    setPadrinos(todosPadrinos || []);

    setCargando(false);
  }

  function toggleInstitucion(inst) {
    setInstitucionesElegidas(prev =>
      prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
    );
  }

  async function handleAsignar() {
    if (!padrinoElegido) {
      notificacion.warning('Selecciona un padrino.', 'Falta el padrino');
      return;
    }
    if (institucionesElegidas.length === 0) {
      notificacion.warning('Selecciona al menos una institución.', 'Sin instituciones seleccionadas');
      return;
    }

    setGuardando(true);

    const filas = institucionesElegidas.map(inst => ({
      grupo_id: grupo.id,
      padrino_id: padrinoElegido,
      institucion_educativa: inst
    }));

    const { error } = await supabase.from('grupo_padrino').insert(filas);

    setGuardando(false);

    if (error) {
      notificacion.error('No se pudo asignar. Verifica que el padrino no tenga ya alguna de estas instituciones.', 'Error al asignar');
      return;
    }

    notificacion.success('Instituciones asignadas correctamente');
    setPadrinoElegido('');
    setInstitucionesElegidas([]);
    // No se llama a onRecargar() aquí: en GestionGrupos eso desmonta toda la grilla
    // de tarjetas (y con ella este modal) mientras recarga. La tarjeta de fondo se
    // actualiza sola la próxima vez que se cierre este modal o se recargue la página.
    await cargarDatos();
  }

  async function handleQuitar(asignacionId) {
    setQuitando(asignacionId);
    const { error } = await supabase.from('grupo_padrino').delete().eq('id', asignacionId);
    setQuitando(null);

    if (error) {
      notificacion.error('No se pudo quitar la asignación.', 'Error al quitar');
      return;
    }
    setAsignaciones(prev => prev.filter(a => a.id !== asignacionId));
  }

  // Instituciones que el padrino elegido aún no tiene asignadas en este grupo
  const institucionesDisponiblesParaElegido = instituciones.filter(
    inst => !asignaciones.some(a => a.padrinos?.id === padrinoElegido && a.institucion_educativa === inst)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">🏫 Asignar Instituciones del Grupo</h3>
          <p className="text-sm text-gray-600 mt-1">Grupo: {grupo.nombre}</p>
        </div>

        <div className="p-6 space-y-5">
          {cargando ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Cargando...</p>
            </div>
          ) : instituciones.length <= 1 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Este grupo solo tiene una institución (o ninguna registrada), así que no aplica una asignación por institución.
            </p>
          ) : (
            <>
              {/* Asignaciones actuales */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Instituciones ya asignadas ({asignaciones.length}):
                </p>
                {asignaciones.length === 0 ? (
                  <p className="text-sm text-gray-400">Ninguna institución de este grupo tiene un padrino específico todavía.</p>
                ) : (
                  <div className="space-y-1">
                    {asignaciones.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">🏫 {a.institucion_educativa}</p>
                          <p className="text-xs text-gray-500">{a.padrinos.nombre_completo}</p>
                        </div>
                        <button
                          onClick={() => handleQuitar(a.id)}
                          disabled={quitando === a.id}
                          className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 disabled:opacity-50"
                        >
                          {quitando === a.id ? '...' : 'Quitar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nueva asignación */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Asignar institución(es) a un padrino:</p>

                <select
                  value={padrinoElegido}
                  onChange={(e) => { setPadrinoElegido(e.target.value); setInstitucionesElegidas([]); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
                >
                  <option value="">Selecciona un padrino...</option>
                  {padrinos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_completo} — {p.correo}</option>
                  ))}
                </select>

                {padrinoElegido && (
                  institucionesDisponiblesParaElegido.length === 0 ? (
                    <p className="text-xs text-gray-500">Este padrino ya tiene asignadas todas las instituciones del grupo.</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                      {institucionesDisponiblesParaElegido.map(inst => (
                        <label key={inst} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={institucionesElegidas.includes(inst)}
                            onChange={() => toggleInstitucion(inst)}
                            className="rounded border-gray-300 text-amber-600"
                          />
                          <span className="text-sm text-gray-800">🏫 {inst}</span>
                        </label>
                      ))}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cerrar
          </button>
          {instituciones.length > 1 && (
            <button
              onClick={handleAsignar}
              disabled={guardando || !padrinoElegido || institucionesElegidas.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {guardando ? 'Asignando...' : 'Asignar Seleccionadas'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
