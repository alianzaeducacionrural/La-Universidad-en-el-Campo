// =============================================
// MODAL: CREAR / EDITAR ALIADO (SOLO LECTURA CON MUNICIPIOS ASIGNADOS)
// =============================================

import { useState, useEffect } from 'react';
import { supabase, crearClienteTemporal } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';

export default function ModalAliado({ isOpen, onClose, onGuardado, aliado }) {
  const notificacion = useNotificacion();
  const esEdicion = Boolean(aliado);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [activo, setActivo] = useState(true);
  const [municipiosSeleccionados, setMunicipiosSeleccionados] = useState([]);

  const [municipios, setMunicipios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    cargarMunicipios();
    if (aliado) {
      setNombre(aliado.nombre_completo || '');
      setCorreo(aliado.correo || '');
      setTelefono(aliado.telefono || '');
      setActivo(aliado.activo ?? true);
      setMunicipiosSeleccionados(aliado.municipios_asignados || []);
    } else {
      setNombre('');
      setCorreo('');
      setTelefono('');
      setPassword('');
      setActivo(true);
      setMunicipiosSeleccionados([]);
    }
    setBusqueda('');
  }, [isOpen, aliado]);

  async function cargarMunicipios() {
    const { data } = await supabase.from('municipios').select('nombre').order('nombre');
    if (data) setMunicipios(data.map(m => m.nombre));
  }

  function toggleMunicipio(nombreMunicipio) {
    setMunicipiosSeleccionados(prev =>
      prev.includes(nombreMunicipio)
        ? prev.filter(m => m !== nombreMunicipio)
        : [...prev, nombreMunicipio]
    );
  }

  const municipiosFiltrados = busqueda.trim()
    ? municipios.filter(m => m.toLowerCase().includes(busqueda.toLowerCase()))
    : municipios;

  const todosVisiblesSeleccionados =
    municipiosFiltrados.length > 0 &&
    municipiosFiltrados.every(m => municipiosSeleccionados.includes(m));

  function toggleSeleccionarTodos() {
    if (todosVisiblesSeleccionados) {
      setMunicipiosSeleccionados(prev => prev.filter(m => !municipiosFiltrados.includes(m)));
    } else {
      setMunicipiosSeleccionados(prev => [...new Set([...prev, ...municipiosFiltrados])]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!nombre.trim() || !correo.trim()) {
      notificacion.error('El nombre y el correo son obligatorios', 'Formulario incompleto');
      return;
    }
    if (!esEdicion && !password.trim()) {
      notificacion.error('Debes asignar una contraseña para el nuevo aliado', 'Formulario incompleto');
      return;
    }
    if (municipiosSeleccionados.length === 0) {
      notificacion.error('Selecciona al menos un municipio para el aliado', 'Formulario incompleto');
      return;
    }

    setCargando(true);

    if (esEdicion) {
      // Actualizar solo el perfil (el correo/login no se modifica desde el cliente)
      const { error } = await supabase
        .from('padrinos')
        .update({
          nombre_completo: nombre.trim(),
          telefono: telefono.trim() || null,
          activo,
          municipios_asignados: municipiosSeleccionados,
        })
        .eq('id', aliado.id);

      setCargando(false);

      if (error) {
        notificacion.error(interpretarError(error), 'Error al actualizar aliado');
      } else {
        notificacion.success(`Aliado "${nombre}" actualizado correctamente`);
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
      notificacion.error(interpretarError(authError) || 'No se pudo crear el usuario', 'Error al crear aliado');
      return;
    }

    const { error: insertError } = await supabase
      .from('padrinos')
      .insert([{
        auth_id: authData.user.id,
        nombre_completo: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim() || null,
        rol: 'aliado',
        activo: true,
        municipios_asignados: municipiosSeleccionados,
      }]);

    setCargando(false);

    if (insertError) {
      notificacion.error(interpretarError(insertError), 'Error al crear aliado');
    } else {
      notificacion.success(`Aliado "${nombre}" creado correctamente`);
      onGuardado();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800">
            {esEdicion ? '✏️ Editar Aliado' : '🤝 Nuevo Aliado'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Los aliados solo pueden <strong>consultar</strong> la información de sus municipios asignados.
          </p>
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
                placeholder="Ej: aliado@example.com"
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
                  className="rounded border-gray-300 text-teal-600"
                />
                <span className="text-sm text-gray-700">Aliado activo (puede iniciar sesión)</span>
              </label>
            )}

            {/* Municipios asignados */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Municipios asignados <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">
                  {municipiosSeleccionados.length} seleccionado(s)
                </span>
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar municipio..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-2"
              />
              {municipiosFiltrados.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSeleccionarTodos}
                  className="text-sm font-medium text-teal-600 hover:text-teal-700 transition mb-2"
                >
                  {todosVisiblesSeleccionados ? '☐ Deseleccionar todos' : '☑ Seleccionar todos'}
                </button>
              )}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {municipiosFiltrados.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No se encontraron municipios</p>
                ) : (
                  municipiosFiltrados.map(m => (
                    <label key={m} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={municipiosSeleccionados.includes(m)}
                        onChange={() => toggleMunicipio(m)}
                        className="rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-800">{m}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3 sticky bottom-0 rounded-b-xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Aliado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
