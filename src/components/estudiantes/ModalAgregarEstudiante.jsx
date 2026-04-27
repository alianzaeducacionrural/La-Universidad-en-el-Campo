// =============================================
// MODAL: AGREGAR ESTUDIANTE INDIVIDUAL
// =============================================

import { useState, useEffect } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import { ESTADOS_ESTUDIANTE } from '../../utils/constants';
import { supabase } from '../../lib/supabaseClient';

export default function ModalAgregarEstudiante({ isOpen, onClose, onGuardar, grupoSeleccionado }) {
  const notificacion = useNotificacion();
  const [cargando, setCargando] = useState(false);
  const [municipios, setMunicipios] = useState([]);
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState('');
  const [instituciones, setInstituciones] = useState([]);
  const [cargandoInstituciones, setCargandoInstituciones] = useState(false);

  useEffect(() => { if (isOpen) cargarMunicipios(); }, [isOpen]);
  useEffect(() => { if (municipioSeleccionado) cargarInstituciones(municipioSeleccionado); else setInstituciones([]); }, [municipioSeleccionado]);

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
      documento: formData.get('documento') || null,
      genero: formData.get('genero') || null,
      telefono: formData.get('telefono') || null,
      correo: formData.get('correo') || null,
      acudiente_nombre: formData.get('acudiente_nombre') || null,
      acudiente_telefono: formData.get('acudiente_telefono') || null,
      municipio: municipioNombre,
      institucion_educativa: formData.get('institucion_educativa'),
      cohorte: grupoSeleccionado.cohorte,
      programa: grupoSeleccionado.programa,
      universidad: grupoSeleccionado.universidad,
      grupo_id: grupoSeleccionado.id,
      estado: formData.get('estado') || 'Activo',
      total_faltas: parseInt(formData.get('total_faltas')) || 0
    };
    
    const resultado = await onGuardar(datos);
    setCargando(false);
    
    if (resultado.success) {
      notificacion.success(`Estudiante "${datos.nombre_completo}" agregado correctamente`);
      setMunicipioSeleccionado('');
      onClose();
    } else {
      notificacion.error(resultado.error, 'Error al agregar');
    }
  }

  if (!isOpen || !grupoSeleccionado) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-blue-50"><h3 className="text-lg font-bold">➕ Agregar Nuevo Estudiante</h3><p className="text-sm text-gray-600">Grupo: <span className="font-medium">{grupoSeleccionado.nombre}</span></p></div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="border-b pb-4"><h4 className="font-medium mb-3">📋 Datos Personales</h4>
              <div className="space-y-4">
                <div><label className="block text-sm mb-1">Nombre Completo *</label><input type="text" name="nombre_completo" required placeholder="Ej: María Fernanda Pérez" className="w-full border rounded-lg px-3 py-2.5" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm mb-1">Documento</label><input type="text" name="documento" placeholder="Ej: 1234567890" className="w-full border rounded-lg px-3 py-2.5" /></div>
                  <div><label className="block text-sm mb-1">Género</label><select name="genero" className="w-full border rounded-lg px-3 py-2.5"><option value="">Seleccionar...</option><option value="Femenino">Femenino</option><option value="Masculino">Masculino</option><option value="Otro">Otro</option></select></div>
                </div>
              </div>
            </div>
            <div className="border-b pb-4"><h4 className="font-medium mb-3">📱 Contacto</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1">Teléfono</label><input type="text" name="telefono" placeholder="Ej: 3115551234" className="w-full border rounded-lg px-3 py-2.5" /></div>
                <div><label className="block text-sm mb-1">Correo Electrónico</label><input type="email" name="correo" placeholder="Ej: maria@email.com" className="w-full border rounded-lg px-3 py-2.5" /></div>
              </div>
            </div>
            <div className="border-b pb-4"><h4 className="font-medium mb-3">👨‍👩‍👧 Datos del Acudiente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1">Nombre del Acudiente</label><input type="text" name="acudiente_nombre" placeholder="Ej: Dora Miryam Ríos" className="w-full border rounded-lg px-3 py-2.5" /></div>
                <div><label className="block text-sm mb-1">Teléfono del Acudiente</label><input type="text" name="acudiente_telefono" placeholder="Ej: 3105559876" className="w-full border rounded-lg px-3 py-2.5" /></div>
              </div>
            </div>
            <div className="border-b pb-4"><h4 className="font-medium mb-3">📍 Ubicación</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1">Municipio *</label><select value={municipioSeleccionado} onChange={e => setMunicipioSeleccionado(e.target.value)} required className="w-full border rounded-lg px-3 py-2.5"><option value="">Seleccionar...</option>{municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
                <div><label className="block text-sm mb-1">Institución Educativa *</label><select name="institucion_educativa" required disabled={!municipioSeleccionado || cargandoInstituciones} className="w-full border rounded-lg px-3 py-2.5 disabled:bg-gray-100"><option value="">{cargandoInstituciones ? 'Cargando...' : !municipioSeleccionado ? 'Primero selecciona municipio' : 'Seleccionar...'}</option>{instituciones.map(i => <option key={i.id} value={i.nombre}>{i.nombre}</option>)}</select></div>
              </div>
            </div>
            <div><h4 className="font-medium mb-3">📊 Estado Académico</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1">Estado</label><select name="estado" className="w-full border rounded-lg px-3 py-2.5">{Object.values(ESTADOS_ESTUDIANTE).map(e => <option key={e} value={e}>{e}</option>)}</select></div>
                <div><label className="block text-sm mb-1">Total Faltas</label><input type="number" name="total_faltas" min="0" defaultValue="0" className="w-full border rounded-lg px-3 py-2.5" /></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-xs text-gray-500"><span className="block">📌 Cohorte: {grupoSeleccionado.cohorte}</span><span className="block">🎓 Universidad: {grupoSeleccionado.universidad}</span><span className="block">📚 Programa: {grupoSeleccionado.programa}</span></p></div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700">Cancelar</button><button type="submit" disabled={cargando} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg">{cargando ? 'Guardando...' : 'Agregar Estudiante'}</button></div>
        </form>
      </div>
    </div>
  );
}