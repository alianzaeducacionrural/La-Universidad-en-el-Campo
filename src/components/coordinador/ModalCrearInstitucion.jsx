// =============================================
// MODAL: CREAR INSTITUCIÓN EDUCATIVA
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';

export default function ModalCrearInstitucion({ isOpen, onClose, onCreada }) {
  const notificacion = useNotificacion();
  const [municipios, setMunicipios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoCorreo, setContactoCorreo] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen) cargarMunicipios();
    else {
      setNombre('');
      setMunicipioId('');
      setContactoNombre('');
      setContactoCorreo('');
    }
  }, [isOpen]);

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
    const { error } = await supabase.from('instituciones').insert([{
      nombre: nombre.trim(),
      municipio_id: municipioId,
      contacto_nombre: contactoNombre.trim() || null,
      contacto_correo: contactoCorreo.trim() || null
    }]);
    setCargando(false);

    if (error) {
      notificacion.error(interpretarError(error), 'Error al crear la institución');
      return;
    }

    notificacion.success(`Institución "${nombre}" creada correctamente`);
    onCreada();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b bg-white sticky top-0 z-10 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-800">➕ Nueva Institución Educativa</h3>
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
                placeholder="Ej: Institución Educativa San José"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de contacto
              </label>
              <input
                type="text"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                placeholder="Opcional"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo de contacto
              </label>
              <input
                type="email"
                value={contactoCorreo}
                onChange={(e) => setContactoCorreo(e.target.value)}
                placeholder="Opcional"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">
              El enlace de solo lectura se genera automáticamente al crear la institución. No aparecerá
              en la lista hasta que tenga estudiantes activos asignados.
            </p>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {cargando ? 'Creando...' : 'Crear Institución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
