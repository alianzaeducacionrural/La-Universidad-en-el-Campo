// =============================================
// PÁGINA: GESTIÓN DE EQUIPO (ADMIN, COORDINADORES, ASISTENTE ADMIN — SOLO ADMIN)
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useReportesNuevos } from '../../hooks/useReportesNuevos';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ModalEquipo from '../../components/admin/ModalEquipo';
import { useNotificacion } from '../../context/NotificacionContext';
import { getNombreRol, getRolColor } from '../../utils/helpers';
import { ROLES } from '../../utils/constants';

const ROLES_EQUIPO = [ROLES.ADMIN, ROLES.COORD_SUPERIOR, ROLES.COORD_PEDAGOGICO, ROLES.ASISTENTE_ADMIN];

export default function GestionEquipo({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const { count: totalReportesNuevos } = useReportesNuevos();
  const [vistaActiva, setVistaActiva] = useState('equipo');
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [miembroEditando, setMiembroEditando] = useState(null);

  useEffect(() => {
    cargarEquipo();
  }, []);

  async function cargarEquipo() {
    setCargando(true);
    const { data } = await supabase
      .from('padrinos')
      .select('*')
      .in('rol', ROLES_EQUIPO)
      .order('nombre_completo');
    if (data) setEquipo(data);
    setCargando(false);
  }

  function abrirCrear() {
    setMiembroEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(miembro) {
    setMiembroEditando(miembro);
    setModalAbierto(true);
  }

  async function toggleActivo(miembro) {
    const { error } = await supabase
      .from('padrinos')
      .update({ activo: !miembro.activo })
      .eq('id', miembro.id);
    if (error) {
      notificacion.error(error.message, 'Error al cambiar estado');
    } else {
      notificacion.success(miembro.activo ? 'Usuario desactivado' : 'Usuario activado');
      cargarEquipo();
    }
  }

  function handleGuardado() {
    setModalAbierto(false);
    setMiembroEditando(null);
    cargarEquipo();
  }

  const equipoFiltrado = busqueda.trim()
    ? equipo.filter(m =>
        m.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.correo?.toLowerCase().includes(busqueda.toLowerCase()))
    : equipo;

  if (!usuario) {
    return <LoadingSpinner mensaje="Cargando..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        rol={usuario.rol}
        totalReportesNuevos={totalReportesNuevos}
      />

      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">🧑‍💼 Gestión de Equipo</h1>
              <p className="text-gray-600">
                Administradores, coordinadores y asistentes administrativos con acceso al panel de control.
              </p>
            </div>
            <button
              onClick={abrirCrear}
              className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2 whitespace-nowrap"
            >
              <span>➕</span>
              <span>Nuevo Usuario</span>
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar por nombre o correo..."
              className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando equipo..." />
            </div>
          ) : equipoFiltrado.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {equipo.length === 0 ? 'Aún no hay usuarios de equipo registrados.' : 'No hay usuarios que coincidan con la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {equipoFiltrado.map(miembro => (
                <div
                  key={miembro.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">{miembro.nombre_completo}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRolColor(miembro.rol)}`}>
                        {getNombreRol(miembro.rol)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${miembro.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {miembro.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{miembro.correo}</p>
                    {miembro.telefono && <p className="text-xs text-gray-400 mt-0.5">📞 {miembro.telefono}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActivo(miembro)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        miembro.activo
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      {miembro.activo ? '🚫 Desactivar' : '✅ Activar'}
                    </button>
                    <button
                      onClick={() => abrirEditar(miembro)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ModalEquipo
        isOpen={modalAbierto}
        onClose={() => { setModalAbierto(false); setMiembroEditando(null); }}
        onGuardado={handleGuardado}
        miembro={miembroEditando}
      />
    </div>
  );
}
