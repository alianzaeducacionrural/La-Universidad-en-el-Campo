// =============================================
// MODAL: EDITAR INSTITUCIÓN EDUCATIVA
// =============================================
// Mismo patrón que ModalCrearInstitucion.jsx, pero actualiza una institución
// existente e incluye los datos de contacto de rector y docente líder.
// Reutilizado desde GestionInstituciones.jsx (gestión central) y desde
// ModalEnlacesInstituciones.jsx (editar directamente desde un grupo).

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';

export default function ModalEditarInstitucion({ isOpen, onClose, institucion, onGuardado }) {
  const notificacion = useNotificacion();
  const [municipios, setMunicipios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoCorreo, setContactoCorreo] = useState('');
  const [rectorNombre, setRectorNombre] = useState('');
  const [rectorTelefono, setRectorTelefono] = useState('');
  const [rectorCorreo, setRectorCorreo] = useState('');
  const [docenteLiderNombre, setDocenteLiderNombre] = useState('');
  const [docenteLiderTelefono, setDocenteLiderTelefono] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) cargarMunicipios();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && institucion) {
      setNombre(institucion.nombre || '');
      setMunicipioId(institucion.municipio_id || '');
      setContactoNombre(institucion.contacto_nombre || '');
      setContactoCorreo(institucion.contacto_correo || '');
      setRectorNombre(institucion.rector_nombre || '');
      setRectorTelefono(institucion.rector_telefono || '');
      setRectorCorreo(institucion.rector_correo || '');
      setDocenteLiderNombre(institucion.docente_lider_nombre || '');
      setDocenteLiderTelefono(institucion.docente_lider_telefono || '');
    }
  }, [isOpen, institucion]);

  async function cargarMunicipios() {
    const { data } = await supabase.from('municipios').select('id, nombre').order('nombre');
    setMunicipios(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !municipioId) {
      notificacion.error('El nombre y el municipio son obligatorios', 'Formulario incompleto');
      return;
    }

    setCargando(true);
    const { error } = await supabase.from('instituciones').update({
      nombre: nombre.trim(),
      municipio_id: municipioId,
      contacto_nombre: contactoNombre.trim() || null,
      contacto_correo: contactoCorreo.trim() || null,
      rector_nombre: rectorNombre.trim() || null,
      rector_telefono: rectorTelefono.trim() || null,
      rector_correo: rectorCorreo.trim() || null,
      docente_lider_nombre: docenteLiderNombre.trim() || null,
      docente_lider_telefono: docenteLiderTelefono.trim() || null
    }).eq('id', institucion.id);
    setCargando(false);

    if (error) {
      notificacion.error(interpretarError(error), 'Error al guardar la institución');
      return;
    }

    notificacion.success(`Institución "${nombre}" actualizada correctamente`);
    onGuardado();
  }

  if (!isOpen || !institucion) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b bg-white sticky top-0 z-10 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-800">✏️ Editar Institución Educativa</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Municipio <span className="text-red-500">*</span>
              </label>
              <select
                value={municipioId}
                onChange={(e) => setMunicipioId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                required
              >
                <option value="">Selecciona un municipio...</option>
                {municipios.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">🎓 Rector</h4>
              <div className="space-y-3">
                <input type="text" value={rectorNombre} onChange={(e) => setRectorNombre(e.target.value)} placeholder="Nombre del rector" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={rectorTelefono} onChange={(e) => setRectorTelefono(e.target.value)} placeholder="Teléfono" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                  <input type="email" value={rectorCorreo} onChange={(e) => setRectorCorreo(e.target.value)} placeholder="Correo" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">👩‍🏫 Docente líder</h4>
              <div className="space-y-3">
                <input type="text" value={docenteLiderNombre} onChange={(e) => setDocenteLiderNombre(e.target.value)} placeholder="Nombre del docente líder" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
                <input type="text" value={docenteLiderTelefono} onChange={(e) => setDocenteLiderTelefono(e.target.value)} placeholder="Teléfono" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {cargando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
