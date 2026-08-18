// =============================================
// MODAL: MALLA DE HOMOLOGACIÓN DE UN TÉCNICO
// =============================================
// Configura, por técnico (programa), qué materias del colegio (con su
// grado, 4° a 11°) se homologan con créditos de ese técnico. Esta malla es
// la que luego usan las instituciones educativas para saber qué notas
// deben subir desde su portal.
//
// La materia se elige de un catálogo compartido (tabla materias_homologacion)
// en vez de texto libre por fila, para que el listado de materias sea
// consistente entre técnicos — el catálogo mismo (agregar/quitar nombres)
// solo lo gestiona el admin, igual que el resto de esta pantalla.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { useAuth } from '../../context/AuthContext';
import { interpretarError } from '../../utils/helpers';
import { GRADOS_ESCOLARES } from '../../utils/constants';

// Orden: alfabético por materia y, dentro de una misma materia, grado de
// menor a mayor — comparar el texto del grado directamente ordenaría "10°"
// antes que "4°", por eso se compara el número.
function compararMallaItems(a, b) {
  return a.materia.localeCompare(b.materia, 'es') || (parseInt(a.grado, 10) - parseInt(b.grado, 10));
}

export default function ModalMallaHomologacion({ isOpen, onClose, programa, soloLectura = false }) {
  const notificacion = useNotificacion();
  const { perfil: usuario } = useAuth();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [completa, setCompleta] = useState(false);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [catalogoMaterias, setCatalogoMaterias] = useState([]);
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [modoNuevaMateria, setModoNuevaMateria] = useState(false);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [nuevaMateriaCatalogo, setNuevaMateriaCatalogo] = useState('');
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
  const [materiaEditando, setMateriaEditando] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [nuevoGrado, setNuevoGrado] = useState(GRADOS_ESCOLARES[0]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && programa) {
      cargarItems();
      cargarEstado();
      if (!soloLectura) cargarCatalogo();
    } else {
      setItems([]);
      setCompleta(false);
      setCatalogoMaterias([]);
      setNuevaMateria('');
      setModoNuevaMateria(false);
      setMostrarCatalogo(false);
      setNuevaMateriaCatalogo('');
      setMateriaEditando(null);
      setNombreEditado('');
      setNuevoGrado(GRADOS_ESCOLARES[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, programa?.id]);

  async function cargarItems() {
    setCargando(true);
    const { data } = await supabase
      .from('malla_homologacion')
      .select('id, materia, grado')
      .eq('programa_id', programa.id);
    setItems((data || []).sort(compararMallaItems));
    setCargando(false);
  }

  async function cargarEstado() {
    const { data } = await supabase.from('malla_homologacion_estado').select('completa').eq('programa_id', programa.id).maybeSingle();
    setCompleta(data?.completa || false);
  }

  // Cualquier cambio en la malla invalida una confirmación previa — evita
  // que quede marcada "completa" con una materia agregada o quitada después.
  async function reiniciarEstadoCompleta() {
    await supabase.from('malla_homologacion_estado').upsert({ programa_id: programa.id, completa: false }, { onConflict: 'programa_id' });
    setCompleta(false);
  }

  async function marcarCompleta(valor) {
    setGuardandoEstado(true);
    const { error } = await supabase.from('malla_homologacion_estado').upsert({
      programa_id: programa.id,
      completa: valor,
      marcado_en: new Date().toISOString(),
      marcado_por: usuario?.id || null
    }, { onConflict: 'programa_id' });
    if (error) {
      notificacion.error(interpretarError(error), 'Error al actualizar');
    } else {
      setCompleta(valor);
      notificacion.success(valor ? 'Malla marcada como completa' : 'Malla marcada como incompleta');
    }
    setGuardandoEstado(false);
  }

  async function cargarCatalogo() {
    const { data } = await supabase.from('materias_homologacion').select('id, nombre').order('nombre');
    setCatalogoMaterias(data || []);
  }

  async function agregarItem(e) {
    e.preventDefault();
    const materia = nuevaMateria.trim();
    if (!materia) return;
    setGuardando(true);

    if (modoNuevaMateria) {
      const { error: errorCatalogo } = await supabase.from('materias_homologacion').insert([{ nombre: materia }]);
      if (errorCatalogo && errorCatalogo.code !== '23505') { // 23505 = ya existe en el catálogo, se ignora y se usa igual
        notificacion.error(interpretarError(errorCatalogo), 'Error al agregar materia al catálogo');
        setGuardando(false);
        return;
      }
    }

    const { error } = await supabase
      .from('malla_homologacion')
      .insert([{ programa_id: programa.id, materia, grado: nuevoGrado }]);
    if (error) {
      notificacion.error(
        error.code === '23505' ? `"${materia}" de ${nuevoGrado} ya está en la malla de este técnico` : interpretarError(error),
        'Error al agregar'
      );
    } else {
      setNuevaMateria('');
      setModoNuevaMateria(false);
      cargarItems();
      cargarCatalogo();
      if (completa) reiniciarEstadoCompleta();
    }
    setGuardando(false);
  }

  async function eliminarItem(id) {
    if (!confirm('¿Eliminar esta materia de la malla de homologación?')) return;
    const { error } = await supabase.from('malla_homologacion').delete().eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    } else {
      cargarItems();
      if (completa) reiniciarEstadoCompleta();
    }
  }

  async function agregarMateriaCatalogo(e) {
    e.preventDefault();
    const nombre = nuevaMateriaCatalogo.trim();
    if (!nombre) return;
    setGuardandoCatalogo(true);
    const { error } = await supabase.from('materias_homologacion').insert([{ nombre }]);
    if (error) {
      notificacion.error(error.code === '23505' ? `"${nombre}" ya está en el catálogo` : interpretarError(error), 'Error al agregar');
    } else {
      setNuevaMateriaCatalogo('');
      cargarCatalogo();
    }
    setGuardandoCatalogo(false);
  }

  function abrirEdicionMateria(m) {
    setMateriaEditando(m);
    setNombreEditado(m.nombre);
  }

  async function guardarEdicionMateria(e) {
    e.preventDefault();
    const nombre = nombreEditado.trim();
    if (!nombre) return;
    if (nombre === materiaEditando.nombre) { setMateriaEditando(null); return; }
    setGuardandoEdicion(true);

    const { error: errorCatalogo } = await supabase.from('materias_homologacion').update({ nombre }).eq('id', materiaEditando.id);
    if (errorCatalogo) {
      notificacion.error(errorCatalogo.code === '23505' ? `"${nombre}" ya existe en el catálogo` : interpretarError(errorCatalogo), 'Error al editar');
      setGuardandoEdicion(false);
      return;
    }

    // Esta materia puede estar ya usada en la malla de otros técnicos (texto
    // copiado, no una referencia) — se propaga el nuevo nombre a todas esas
    // filas para que quede consistente en cualquier homologación existente.
    const { error: errorMalla } = await supabase.from('malla_homologacion').update({ materia: nombre }).eq('materia', materiaEditando.nombre);
    if (errorMalla) {
      notificacion.error(
        'El nombre se actualizó en el catálogo, pero no se pudo actualizar en algunas mallas que ya lo usaban (posible choque con una combinación materia+grado existente).',
        'Actualización parcial'
      );
    } else {
      notificacion.success('Materia renombrada en el catálogo y en las mallas que ya la usaban');
    }
    cargarCatalogo();
    cargarItems();
    setGuardandoEdicion(false);
    setMateriaEditando(null);
  }

  async function eliminarMateriaCatalogo(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}" del catálogo de materias? Esto no afecta las mallas que ya la usan.`)) return;
    const { error } = await supabase.from('materias_homologacion').delete().eq('id', id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al eliminar');
    } else {
      cargarCatalogo();
    }
  }

  if (!isOpen || !programa) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl animate-scale-in">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800">🎓 Malla de Homologación</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{programa.nombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
        </div>

        <div className="p-6">
          {soloLectura ? (
            <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-5">
              🔒 Solo el equipo administrador puede agregar o eliminar materias de esta malla.
            </p>
          ) : (
            <>
              <form onSubmit={agregarItem} className="flex flex-wrap gap-2 items-end mb-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs text-gray-500 mb-1">Materia *</label>
                  {modoNuevaMateria ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nuevaMateria}
                        onChange={e => setNuevaMateria(e.target.value)}
                        placeholder="Nombre de la nueva materia"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                        autoFocus
                      />
                      {catalogoMaterias.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setModoNuevaMateria(false); setNuevaMateria(''); }}
                          className="text-xs text-gray-500 hover:text-primary underline whitespace-nowrap"
                        >
                          volver a lista
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      value={nuevaMateria}
                      onChange={e => {
                        if (e.target.value === '__nueva__') { setModoNuevaMateria(true); setNuevaMateria(''); }
                        else setNuevaMateria(e.target.value);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {catalogoMaterias.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                      <option value="__nueva__">+ Nueva materia...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Grado *</label>
                  <select value={nuevoGrado} onChange={e => setNuevoGrado(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    {GRADOS_ESCOLARES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={guardando || !nuevaMateria.trim()} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                  + Agregar
                </button>
              </form>

              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setMostrarCatalogo(v => !v)}
                  className={`w-full flex items-center justify-between gap-2 border rounded-xl px-4 py-3 text-sm transition ${
                    mostrarCatalogo
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-white border-gray-200 hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary-dark flex items-center justify-center text-base flex-shrink-0">🛠️</span>
                    <span className="text-left">
                      <span className="block font-medium text-gray-800">Catálogo de materias</span>
                      <span className="block text-xs text-gray-500">{catalogoMaterias.length} materia{catalogoMaterias.length !== 1 ? 's' : ''} disponible{catalogoMaterias.length !== 1 ? 's' : ''}</span>
                    </span>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${mostrarCatalogo ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {mostrarCatalogo && (
                  <div className="mt-2 border border-gray-200 rounded-xl p-3 bg-gray-50 animate-fade-in">
                    <form onSubmit={agregarMateriaCatalogo} className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={nuevaMateriaCatalogo}
                        onChange={e => setNuevaMateriaCatalogo(e.target.value)}
                        placeholder="Nombre de la nueva materia"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                      />
                      <button
                        type="submit"
                        disabled={guardandoCatalogo || !nuevaMateriaCatalogo.trim()}
                        className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
                      >
                        + Agregar
                      </button>
                    </form>
                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {catalogoMaterias.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Aún no hay materias en el catálogo</p>
                    ) : (
                      catalogoMaterias.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{m.nombre}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => abrirEdicionMateria(m)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar nombre">✏️</button>
                            <button type="button" onClick={() => eliminarMateriaCatalogo(m.id, m.nombre)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar del catálogo">🗑️</button>
                          </div>
                        </div>
                      ))
                    )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!cargando && items.length > 0 && (
            <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 mb-4 ${completa ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg flex-shrink-0">{completa ? '✅' : '🕗'}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${completa ? 'text-green-800' : 'text-amber-800'}`}>
                    {completa ? 'Malla marcada como completa' : 'Malla en progreso'}
                  </p>
                  {!soloLectura && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {completa ? 'Ya no se esperan más materias para este técnico.' : 'Confirma cuando ya hayas subido todas las materias necesarias.'}
                    </p>
                  )}
                </div>
              </div>
              {!soloLectura && (
                <button
                  onClick={() => marcarCompleta(!completa)}
                  disabled={guardandoEstado}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 whitespace-nowrap flex-shrink-0 ${
                    completa ? 'bg-white border border-green-300 text-green-700 hover:bg-green-100' : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                >
                  {completa ? '↩️ Marcar incompleta' : '✅ Confirmar completa'}
                </button>
              )}
            </div>
          )}

          {cargando ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Este técnico aún no tiene materias de homologación configuradas</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-primary/10 text-primary-dark px-2 py-0.5 rounded-full">{item.grado}</span>
                    <span className="text-sm text-gray-800">{item.materia}</span>
                  </div>
                  {!soloLectura && (
                    <button onClick={() => eliminarItem(item.id)} className="text-gray-300 hover:text-red-500 transition p-1" title="Eliminar">🗑️</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">Cerrar</button>
        </div>
      </div>

      {materiaEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl animate-scale-in">
            <form onSubmit={guardarEdicionMateria}>
              <div className="p-5 border-b border-gray-200">
                <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">✏️ Editar materia</h4>
              </div>
              <div className="p-5">
                <label className="block text-xs text-gray-500 mb-1">Nombre de la materia</label>
                <input
                  type="text"
                  value={nombreEditado}
                  onChange={e => setNombreEditado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                  autoFocus
                  onFocus={e => e.target.select()}
                />
                <p className="text-xs text-gray-400 mt-2">Se actualizará en el catálogo y en cualquier malla de homologación que ya use este nombre.</p>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end gap-2">
                <button type="button" onClick={() => setMateriaEditando(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                <button
                  type="submit"
                  disabled={guardandoEdicion || !nombreEditado.trim()}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
