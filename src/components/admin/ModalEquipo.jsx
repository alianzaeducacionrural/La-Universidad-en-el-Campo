// =============================================
// MODAL: CREAR / EDITAR USUARIO DE COORDINACIÓN (EQUIPO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase, crearClienteTemporal } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';
import { ROLES, NOMBRES_ROLES } from '../../utils/constants';

const ROLES_EQUIPO = [ROLES.ADMIN, ROLES.COORD_SUPERIOR, ROLES.COORD_PEDAGOGICO, ROLES.ASISTENTE_ADMIN];

export default function ModalEquipo({ isOpen, onClose, onGuardado, miembro }) {
  const notificacion = useNotificacion();
  const esEdicion = Boolean(miembro);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('');
  const [activo, setActivo] = useState(true);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (miembro) {
      setNombre(miembro.nombre_completo || '');
      setCorreo(miembro.correo || '');
      setTelefono(miembro.telefono || '');
      setRol(miembro.rol || '');
      setActivo(miembro.activo ?? true);
    } else {
      setNombre('');
      setCorreo('');
      setTelefono('');
      setPassword('');
      setRol(ROLES.ASISTENTE_ADMIN);
      setActivo(true);
    }
  }, [isOpen, miembro]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!nombre.trim() || !correo.trim() || !rol) {
      notificacion.error('El nombre, el correo y el rol son obligatorios', 'Formulario incompleto');
      return;
    }
    if (!esEdicion && !password.trim()) {
      notificacion.error('Debes asignar una contraseña para el nuevo usuario', 'Formulario incompleto');
      return;
    }

    setCargando(true);

    if (esEdicion) {
      const { error } = await supabase
        .from('padrinos')
        .update({
          nombre_completo: nombre.trim(),
          telefono: telefono.trim() || null,
          rol,
          activo,
        })
        .eq('id', miembro.id);

      setCargando(false);

      if (error) {
        notificacion.error(interpretarError(error), 'Error al actualizar');
      } else {
        notificacion.success(`"${nombre}" actualizado correctamente`);
        onGuardado();
      }
      return;
    }

    // ── CREAR ─────────────────────────────────────────────
    // Se usa un cliente temporal para no sobrescribir la sesión del admin.
    const clienteTemporal = crearClienteTemporal();
    const { data: authData, error: authError } = await clienteTemporal.auth.signUp({
      email: correo.trim(),
      password,
    });

    if (authError || !authData?.user) {
      setCargando(false);
      notificacion.error(interpretarError(authError) || 'No se pudo crear el usuario', 'Error al crear');
      return;
    }

    const { error: insertError } = await supabase
      .from('padrinos')
      .insert([{
        auth_id: authData.user.id,
        nombre_completo: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim() || null,
        rol,
        activo: true,
      }]);

    setCargando(false);

    if (insertError) {
      notificacion.error(interpretarError(insertError), 'Error al crear');
    } else {
      notificacion.success(`"${nombre}" creado correctamente como ${NOMBRES_ROLES[rol]}`);
      onGuardado();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800">
            {esEdicion ? '✏️ Editar Usuario de Equipo' : '➕ Nuevo Usuario de Equipo'}
          </h3>
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
                placeholder="Ej: María González"
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
                placeholder="Ej: usuario@example.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                required
                disabled={esEdicion}
              />
              {esEdicion && (
                <p className="text-xs text-gray-400 mt-1">El correo de inicio de sesión no puede modificarse.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
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
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                required
              >
                <option value="">Selecciona un rol...</option>
                {ROLES_EQUIPO.map(r => (
                  <option key={r} value={r}>{NOMBRES_ROLES[r]}</option>
                ))}
              </select>
            </div>

            {!esEdicion && (
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
            )}

            {esEdicion && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="rounded border-gray-300 text-primary"
                />
                <span className="text-sm text-gray-700">Usuario activo (puede iniciar sesión)</span>
              </label>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 sticky bottom-0 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
