// =============================================
// MODAL: CRONOGRAMA DE UN GRUPO (EDICIÓN INDIVIDUAL)
// =============================================
// Línea de tiempo del cronograma: cada sesión programada se cruza contra
// registros_asistencia (misma fecha, módulo tolerante a variaciones de
// escritura) para saber si esa clase ya se dictó, y en ese caso se muestra
// lo que el docente realmente reportó (módulo/docente/teléfono), no lo
// planeado con anticipación. Lo planeado queda guardado aparte
// (columnas *_original) y se muestra como referencia si hubo un ajuste.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, interpretarError, cruzarCronogramaConAsistencia } from '../../utils/helpers';

const ESTILOS_ESTADO = {
  confirmada: {
    marcador: 'bg-primary text-white ring-4 ring-primary/15',
    icono: '✓',
    chip: 'bg-primary/10 text-primary-dark',
    texto: 'Asistencia registrada',
    tarjeta: 'bg-white border-gray-200 hover:shadow-sm'
  },
  pendiente: {
    marcador: 'bg-amber-500 text-white ring-4 ring-amber-200 animate-pulse',
    icono: '!',
    chip: 'bg-amber-100 text-amber-700',
    texto: 'Asistencia pendiente',
    tarjeta: 'bg-amber-50/60 border-amber-200'
  },
  programada: {
    marcador: 'bg-white border-2 border-gray-300 text-gray-400',
    icono: '',
    chip: 'bg-gray-100 text-gray-500',
    texto: 'Próxima sesión',
    tarjeta: 'bg-gray-50/60 border-gray-200'
  }
};

export default function ModalCronogramaGrupo({ isOpen, onClose, grupo, onActualizado, puedeGestionar = true, idFechaEnfocada = null }) {
  const notificacion = useNotificacion();
  const [fechas, setFechas] = useState([]);
  const [registrosAsistencia, setRegistrosAsistencia] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoModulo, setNuevoModulo] = useState('');
  const [nuevoDocente, setNuevoDocente] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [detalleEditado, setDetalleEditado] = useState({ fecha: '', modulo: '', docente_universitario: '', telefono_contacto: '' });

  useEffect(() => {
    if (isOpen && grupo) cargarFechas();
    else { setFechas([]); setRegistrosAsistencia([]); setNuevaFecha(''); setNuevoModulo(''); setNuevoDocente(''); setNuevoTelefono(''); }
  }, [isOpen, grupo?.id]);

  async function cargarFechas() {
    setCargando(true);
    const [{ data: cronograma }, { data: asistencias }] = await Promise.all([
      supabase.from('cronograma_clases').select('id, fecha, modulo, docente_universitario, telefono_contacto, modulo_original, docente_original, telefono_original').eq('grupo_id', grupo.id).order('fecha'),
      supabase.from('registros_asistencia').select('fecha, modulo, docente_nombre, docente_telefono').eq('grupo_id', grupo.id)
    ]);
    setFechas(cronograma || []);
    setRegistrosAsistencia(asistencias || []);
    setCargando(false);
  }

  async function agregarFecha(e) {
    e.preventDefault();
    if (!nuevaFecha || !nuevoModulo.trim()) return;
    setGuardando(true);
    const modulo = nuevoModulo.trim();
    const docente = nuevoDocente.trim() || null;
    const telefono = nuevoTelefono.trim() || null;
    const { error } = await supabase.from('cronograma_clases').insert([{
      grupo_id: grupo.id,
      fecha: nuevaFecha,
      modulo,
      docente_universitario: docente,
      telefono_contacto: telefono,
      // El snapshot original se fija una sola vez, al crear la fila — las
      // ediciones posteriores (o la reconciliación con lo reportado) nunca
      // lo tocan, así queda registro de lo que se programó al inicio.
      modulo_original: modulo,
      docente_original: docente,
      telefono_original: telefono
    }]);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al agregar fecha');
    } else {
      setNuevaFecha('');
      setNuevoModulo('');
      setNuevoDocente('');
      setNuevoTelefono('');
      cargarFechas();
      onActualizado?.();
    }
    setGuardando(false);
  }

  // Si se abrió el modal apuntando a una fecha específica (desde Cumplimiento
  // del Cronograma), entra directo en modo edición sobre esa fecha y la
  // lleva a la vista, en vez de dejar al coordinador a buscarla en la lista.
  useEffect(() => {
    if (cargando || !idFechaEnfocada || !puedeGestionar) return;
    const enfocada = cruzarCronogramaConAsistencia(fechas, registrosAsistencia).find(f => f.id === idFechaEnfocada);
    if (enfocada) {
      abrirEdicion(enfocada);
      requestAnimationFrame(() => {
        document.getElementById(`cronograma-fecha-${idFechaEnfocada}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, idFechaEnfocada]);

  function abrirEdicion(f) {
    setEditandoId(f.id);
    // Se precarga con lo efectivo (lo reportado, si lo hay) — si el docente
    // ya subió la asistencia con otro módulo/teléfono, guardar así reconcilia
    // el cronograma con la realidad en un clic, sin perder lo original.
    setDetalleEditado({
      // La fecha es la clave de cruce con la asistencia, no algo que se
      // "reporte" — siempre se precarga con la del cronograma, nunca la
      // efectiva/reportada.
      fecha: f.fecha || '',
      modulo: f.moduloEfectivo || '',
      docente_universitario: f.docenteEfectivo || '',
      telefono_contacto: f.telefonoEfectivo || ''
    });
  }

  async function guardarDetalle(id) {
    if (!detalleEditado.fecha) {
      notificacion.warning('La fecha es obligatoria', 'Campo requerido');
      return;
    }
    if (!detalleEditado.modulo.trim()) {
      notificacion.warning('El módulo es obligatorio', 'Campo requerido');
      return;
    }
    const { error } = await supabase
      .from('cronograma_clases')
      .update({
        fecha: detalleEditado.fecha,
        modulo: detalleEditado.modulo.trim(),
        docente_universitario: detalleEditado.docente_universitario.trim() || null,
        telefono_contacto: detalleEditado.telefono_contacto.trim() || null
      })
      .eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al actualizar');
    } else {
      setEditandoId(null);
      cargarFechas();
      onActualizado?.();
    }
  }

  async function eliminarFecha(id) {
    if (!confirm('¿Eliminar esta fecha del cronograma?')) return;
    const { error } = await supabase.from('cronograma_clases').delete().eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    } else {
      cargarFechas();
      onActualizado?.();
    }
  }

  if (!isOpen || !grupo) return null;

  const fechasConEstado = cruzarCronogramaConAsistencia(fechas, registrosAsistencia);
  const resumen = {
    confirmadas: fechasConEstado.filter(f => f.estado === 'confirmada').length,
    pendientes: fechasConEstado.filter(f => f.estado === 'pendiente').length,
    programadas: fechasConEstado.filter(f => f.estado === 'programada').length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl animate-scale-in">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-warm-light z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800">🗓️ Cronograma de Clases</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{grupo.nombre}</p>
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

        <div className="p-6">
          {puedeGestionar && (
            <form onSubmit={agregarFecha} className="space-y-2 mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={e => setNuevaFecha(e.target.value)}
                    required
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gray-500 mb-1">Módulo *</label>
                  <input
                    type="text"
                    value={nuevoModulo}
                    onChange={e => setNuevoModulo(e.target.value)}
                    placeholder="Ej: Matemáticas"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs text-gray-500 mb-1">Docente universitario (opcional)</label>
                  <input
                    type="text"
                    value={nuevoDocente}
                    onChange={e => setNuevoDocente(e.target.value)}
                    placeholder="Nombre del docente"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gray-500 mb-1">Teléfono de contacto (opcional)</label>
                  <input
                    type="text"
                    value={nuevoTelefono}
                    onChange={e => setNuevoTelefono(e.target.value)}
                    placeholder="3115551234"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guardando || !nuevaFecha || !nuevoModulo.trim()}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  + Agregar
                </button>
              </div>
            </form>
          )}

          {cargando ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : fechas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Este grupo aún no tiene fechas programadas</p>
          ) : (
            <>
              {/* Resumen: de un vistazo, cuántas sesiones ya tienen asistencia y cuántas quedaron pendientes */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary-dark px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {resumen.confirmadas} confirmada{resumen.confirmadas !== 1 ? 's' : ''}
                </span>
                {resumen.pendientes > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    {resumen.pendientes} pendiente{resumen.pendientes !== 1 ? 's' : ''} de asistencia
                  </span>
                )}
                {resumen.programadas > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    {resumen.programadas} programada{resumen.programadas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Línea de tiempo */}
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-gray-200 to-gray-200"></div>
                <div className="space-y-3">
                  {fechasConEstado.map(f => {
                    const estilo = ESTILOS_ESTADO[f.estado];
                    return (
                      <div key={f.id} id={`cronograma-fecha-${f.id}`} className="relative flex items-start pl-12">
                        <div
                          className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0 ${estilo.marcador}`}
                          title={estilo.texto}
                        >
                          {estilo.icono}
                        </div>

                        <div className={`rounded-xl border p-3 flex-1 min-w-0 transition ${estilo.tarjeta}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800">{formatearFecha(f.fecha)}</p>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${estilo.chip}`}>{estilo.texto}</span>
                              </div>

                              {editandoId === f.id ? (
                                <div className="space-y-1.5 mt-2">
                                  <input
                                    type="date"
                                    value={detalleEditado.fecha}
                                    onChange={e => setDetalleEditado(d => ({ ...d, fecha: e.target.value }))}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                                  />
                                  <input
                                    type="text"
                                    value={detalleEditado.modulo}
                                    onChange={e => setDetalleEditado(d => ({ ...d, modulo: e.target.value }))}
                                    placeholder="Módulo *"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                                    autoFocus
                                  />
                                  <input
                                    type="text"
                                    value={detalleEditado.docente_universitario}
                                    onChange={e => setDetalleEditado(d => ({ ...d, docente_universitario: e.target.value }))}
                                    placeholder="Docente universitario (opcional)"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                                  />
                                  <input
                                    type="text"
                                    value={detalleEditado.telefono_contacto}
                                    onChange={e => setDetalleEditado(d => ({ ...d, telefono_contacto: e.target.value }))}
                                    placeholder="Teléfono de contacto (opcional)"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => guardarDetalle(f.id)} className="text-xs text-green-600 font-medium">Guardar</button>
                                    <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400">Cancelar</button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={puedeGestionar ? 'cursor-pointer group' : ''}
                                  onClick={() => puedeGestionar && abrirEdicion(f)}
                                >
                                  <p className="text-xs text-gray-700 mt-1 font-medium">
                                    {f.moduloEfectivo ? `📚 ${f.moduloEfectivo}` : '— Sin módulo —'}
                                  </p>
                                  {f.docenteEfectivo && <p className="text-xs text-gray-500 mt-0.5">👨‍🏫 {f.docenteEfectivo}</p>}
                                  {f.telefonoEfectivo && <p className="text-xs text-gray-500 mt-0.5">📞 {f.telefonoEfectivo}</p>}
                                  {f.huboAjuste && (
                                    <p className="text-[10px] text-blue-500 mt-1">
                                      🕘 Programado originalmente: {f.moduloOriginal || '—'}
                                      {f.docenteOriginal ? ` · ${f.docenteOriginal}` : ''}
                                      {f.telefonoOriginal ? ` · ${f.telefonoOriginal}` : ''}
                                    </p>
                                  )}
                                  {puedeGestionar && (
                                    <p className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition mt-1">✏️ Clic para editar</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {puedeGestionar && editandoId !== f.id && (
                              <button
                                onClick={() => eliminarFecha(f.id)}
                                className="text-gray-300 hover:text-red-500 transition p-1 flex-shrink-0"
                                title="Eliminar fecha"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
