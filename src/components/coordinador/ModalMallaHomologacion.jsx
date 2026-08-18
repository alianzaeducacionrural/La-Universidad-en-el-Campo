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
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [catalogoMaterias, setCatalogoMaterias] = useState([]);
  const [nuevaMateria, setNuevaMateria] = useState('');
  const [modoNuevaMateria, setModoNuevaMateria] = useState(false);
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false);
  const [nuevaMateriaCatalogo, setNuevaMateriaCatalogo] = useState('');
  const [guardandoCatalogo, setGuardandoCatalogo] = useState(false);
  const [nuevoGrado, setNuevoGrado] = useState(GRADOS_ESCOLARES[0]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (isOpen && programa) {
      cargarItems();
      if (!soloLectura) cargarCatalogo();
    } else {
      setItems([]);
      setCatalogoMaterias([]);
      setNuevaMateria('');
      setModoNuevaMateria(false);
      setMostrarCatalogo(false);
      setNuevaMateriaCatalogo('');
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
                          <button type="button" onClick={() => eliminarMateriaCatalogo(m.id, m.nombre)} className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar del catálogo">🗑️</button>
                        </div>
                      ))
                    )}
                    </div>
                  </div>
                )}
              </div>
            </>
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
    </div>
  );
}
