// =============================================
// MODAL: CREAR GRUPO (CON NOTIFICACIONES)
// =============================================

import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { supabase } from '../../lib/supabaseClient';
import { COHORTES } from '../../utils/constants';

export default function ModalCrearGrupo({ isOpen, onClose, onCrear, padrinoActual }) {
  const notificacion = useNotificacion();
  const [padrinosDisponibles, setPadrinosDisponibles] = useState([]);
  const [padrinosSeleccionados, setPadrinosSeleccionados] = useState([]);
  const [universidades, setUniversidades] = useState([]);
  const [universidadSeleccionada, setUniversidadSeleccionada] = useState('');
  const [programas, setProgramas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { if (isOpen) { cargarPadrinos(); cargarUniversidades(); } }, [isOpen]);
  useEffect(() => { if (universidadSeleccionada) cargarProgramas(universidadSeleccionada); else setProgramas([]); }, [universidadSeleccionada]);

  async function cargarPadrinos() {
    const { data } = await supabase.from('padrinos').select('*').eq('activo', true).order('nombre_completo');
    if (data) setPadrinosDisponibles(data);
  }
  async function cargarUniversidades() {
    const { data } = await supabase.from('universidades').select('*').order('nombre');
    if (data) setUniversidades(data);
  }
  async function cargarProgramas(universidadId) {
    const { data } = await supabase.from('programas').select('*').eq('universidad_id', universidadId).order('nombre');
    if (data) setProgramas(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    const formData = new FormData(e.target);
    const datosGrupo = {
      nombre: formData.get('nombre'),
      cohorte: formData.get('cohorte'),
      universidad: universidades.find(u => u.id === universidadSeleccionada)?.nombre || '',
      programa: formData.get('programa')
    };
    const resultado = await onCrear(datosGrupo, padrinosSeleccionados);
    if (resultado.success) {
      notificacion.success(`Grupo "${datosGrupo.nombre}" creado exitosamente`);
      onClose();
      setPadrinosSeleccionados([]);
      setUniversidadSeleccionada('');
    } else {
      notificacion.error(resultado.error, 'Error al crear grupo');
    }
    setCargando(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b"><h3 className="text-lg font-bold">➕ Crear Nuevo Grupo</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div><label className="block text-sm mb-1">Nombre *</label><input type="text" name="nombre" required placeholder="Ej: Técnico en Sistemas - 2025" className="w-full border rounded-lg px-3 py-2.5" /></div>
            <div><label className="block text-sm mb-1">Cohorte *</label><select name="cohorte" required className="w-full border rounded-lg px-3 py-2.5"><option value="">Seleccionar...</option>{COHORTES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm mb-1">Universidad *</label><select value={universidadSeleccionada} onChange={e => setUniversidadSeleccionada(e.target.value)} required className="w-full border rounded-lg px-3 py-2.5"><option value="">Seleccionar...</option>{universidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>
            <div><label className="block text-sm mb-1">Programa *</label><select name="programa" required disabled={!universidadSeleccionada} className="w-full border rounded-lg px-3 py-2.5 disabled:bg-gray-100"><option value="">Seleccionar...</option>{programas.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}</select></div>
            <div><label className="block text-sm mb-2">Padrinos Responsables</label><div className="border rounded-lg p-3 max-h-48 overflow-y-auto">{padrinosDisponibles.filter(p => p.rol === 'padrino' || p.rol?.includes('coord') || p.rol === 'admin').map(p => <label key={p.id} className="flex items-center space-x-2 py-1"><input type="checkbox" checked={padrinosSeleccionados.includes(p.id)} onChange={e => { if (e.target.checked) setPadrinosSeleccionados([...padrinosSeleccionados, p.id]); else setPadrinosSeleccionados(padrinosSeleccionados.filter(id => id !== p.id)); }} className="rounded" /><span>{p.nombre_completo}</span></label>)}</div></div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700">Cancelar</button><button type="submit" disabled={cargando} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">{cargando ? 'Creando...' : 'Crear Grupo'}</button></div>
        </form>
      </div>
    </div>
  );
}