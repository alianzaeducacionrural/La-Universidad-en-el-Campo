// =============================================
// MODAL: EDITAR ESTUDIANTE (CORREGIDO)
// =============================================

import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { supabase } from '../../lib/supabaseClient';

export default function ModalEditarEstudiante({ isOpen, onClose, onGuardar, estudiante, puedeGestionar }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [municipios, setMunicipios] = useState([]);
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState('');
  const [instituciones, setInstituciones] = useState([]);
  const [cargandoInstituciones, setCargandoInstituciones] = useState(false);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState('');

  // Cargar municipios al abrir
  useEffect(() => {
    if (isOpen && estudiante) {
      cargarMunicipios();
    }
  }, [isOpen, estudiante]);

  // Cuando los municipios se cargan, seleccionar el del estudiante
  useEffect(() => {
    if (municipios.length > 0 && estudiante) {
      const municipioEncontrado = municipios.find(m => m.nombre === estudiante.municipio);
      if (municipioEncontrado) {
        setMunicipioSeleccionado(municipioEncontrado.id);
      }
    }
  }, [municipios, estudiante]);

  // Cargar instituciones cuando cambia el municipio
  useEffect(() => {
    if (municipioSeleccionado) {
      cargarInstituciones(municipioSeleccionado);
    } else {
      setInstituciones([]);
    }
  }, [municipioSeleccionado]);

  // 🔥 CORRECCIÓN: Cuando las instituciones se cargan, seleccionar la del estudiante
  useEffect(() => {
    if (instituciones.length > 0 && estudiante) {
      const institucionEncontrada = instituciones.find(i => i.nombre === estudiante.institucion_educativa);
      if (institucionEncontrada) {
        setInstitucionSeleccionada(institucionEncontrada.nombre);
      } else {
        // Si no está en la lista, dejar el valor actual
        setInstitucionSeleccionada(estudiante.institucion_educativa);
      }
    } else if (estudiante && !municipioSeleccionado) {
      // Si no hay municipio seleccionado, mantener la institución actual
      setInstitucionSeleccionada(estudiante.institucion_educativa);
    }
  }, [instituciones, estudiante]);

  async function cargarMunicipios() {
    const { data } = await supabase.from('municipios').select('*').order('nombre');
    if (data) setMunicipios(data);
  }

  async function cargarInstituciones(municipioId) {
    setCargandoInstituciones(true);
    const { data } = await supabase.from('instituciones').select('*').eq('municipio_id', municipioId).order('nombre');
    if (data) setInstituciones(data);
    setCargandoInstituciones(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setCargando(true);
    const formData = new FormData(e.target);
    const municipioNombre = municipios.find(m => m.id === municipioSeleccionado)?.nombre || '';
    
    const datos = {
      nombre_completo: formData.get('nombre_completo'),
      telefono: formData.get('telefono') || null,
      correo: formData.get('correo') || null,
      acudiente_nombre: formData.get('acudiente_nombre') || null,
      acudiente_telefono: formData.get('acudiente_telefono') || null,
      municipio: municipioNombre,
      institucion_educativa: formData.get('institucion_educativa')
    };
    if (puedeGestionar) datos.total_faltas = parseInt(formData.get('total_faltas')) || 0;
    
    const resultado = await onGuardar(estudiante.id, datos);
    setCargando(false);
    
    if (resultado.success) {
      notificacion.success('Información actualizada correctamente');
      onClose();
    } else {
      notificacion.error(resultado.error, 'Error al actualizar');
    }
  }

  if (!isOpen || !estudiante) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <h3 className="text-lg font-bold text-gray-800">✏️ Editar Información</h3>
          <p className="text-sm text-gray-600 mt-1">{estudiante.nombre_completo}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
              <input type="text" name="nombre_completo" required defaultValue={estudiante.nombre_completo} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="text" name="telefono" defaultValue={estudiante.telefono || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label><input type="email" name="correo" defaultValue={estudiante.correo || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Acudiente</label><input type="text" name="acudiente_nombre" defaultValue={estudiante.acudiente_nombre || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Acudiente</label><input type="text" name="acudiente_telefono" defaultValue={estudiante.acudiente_telefono || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" /></div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">📍 Ubicación</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Municipio *</label>
                  <select value={municipioSeleccionado} onChange={e => { setMunicipioSeleccionado(e.target.value); setInstitucionSeleccionada(''); }} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Seleccionar...</option>
                    {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institución Educativa *</label>
                  <select 
                    name="institucion_educativa" 
                    value={institucionSeleccionada}
                    onChange={e => setInstitucionSeleccionada(e.target.value)}
                    required 
                    disabled={!municipioSeleccionado || cargandoInstituciones} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm disabled:bg-gray-100"
                  >
                    <option value="">
                      {cargandoInstituciones ? 'Cargando...' : !municipioSeleccionado ? 'Primero selecciona municipio' : 'Seleccionar...'}
                    </option>
                    {instituciones.map(i => <option key={i.id} value={i.nombre}>{i.nombre}</option>)}
                    {/* 🔥 Si la institución actual no está en la lista, mostrarla como opción */}
                    {estudiante.institucion_educativa && !instituciones.find(i => i.nombre === estudiante.institucion_educativa) && (
                      <option value={estudiante.institucion_educativa}>{estudiante.institucion_educativa}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}