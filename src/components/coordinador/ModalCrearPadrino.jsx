// =============================================
// MODAL: CREAR PADRINO
// =============================================

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';

export default function ModalCrearPadrino({ isOpen, onClose, onCreado }) {
  const notificacion = useNotificacion();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim() || !correo.trim() || !password.trim()) {
      notificacion.error('Todos los campos obligatorios deben estar llenos', 'Formulario incompleto');
      return;
    }

    setCargando(true);
    let error;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: correo.trim(),
      password,
    });

    if (authError) {
      error = authError.message;
    } else if (!authData?.user) {
      error = 'No se pudo crear el usuario de autenticación';
    } else {
      const { error: insertError } = await supabase
        .from('padrinos')
        .insert([{
          auth_id: authData.user.id,
          nombre_completo: nombre.trim(),
          correo: correo.trim(),
          telefono: telefono.trim() || null,
          rol: 'padrino',
          activo: true,
        }]);

      if (insertError) {
        error = insertError.message;
      }
    }

    setCargando(false);

    if (error) {
      notificacion.error(error, 'Error al crear padrino');
    } else {
      notificacion.success(`Padrino "${nombre}" creado correctamente`);
      setNombre('');
      setCorreo('');
      setTelefono('');
      setPassword('');
      onCreado();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-800">➕ Nuevo Padrino</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Ej: juan@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 3001234567"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña para iniciar sesión"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={cargando} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg disabled:opacity-50">
              {cargando ? 'Creando...' : 'Crear Padrino'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}