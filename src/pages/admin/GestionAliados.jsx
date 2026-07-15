// =============================================
// PÁGINA: GESTIÓN DE ALIADOS (SOLO ADMIN)
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useReportesNuevos } from '../../hooks/useReportesNuevos';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ModalAliado from '../../components/admin/ModalAliado';
import { useNotificacion } from '../../context/NotificacionContext';

export default function GestionAliados({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const notificacion = useNotificacion();
  const { count: totalReportesNuevos } = useReportesNuevos();
  const [vistaActiva, setVistaActiva] = useState('aliados');
  const [aliados, setAliados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [aliadoEditando, setAliadoEditando] = useState(null);

  useEffect(() => {
    cargarAliados();
  }, []);

  async function cargarAliados() {
    setCargando(true);
    const { data } = await supabase
      .from('padrinos')
      .select('*')
      .eq('rol', 'aliado')
      .order('nombre_completo');
    if (data) setAliados(data);
    setCargando(false);
  }

  function abrirCrear() {
    setAliadoEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(aliado) {
    setAliadoEditando(aliado);
    setModalAbierto(true);
  }

  async function toggleActivo(aliado) {
    const { error } = await supabase
      .from('padrinos')
      .update({ activo: !aliado.activo })
      .eq('id', aliado.id);
    if (error) {
      notificacion.error(error.message, 'Error al cambiar estado');
    } else {
      notificacion.success(aliado.activo ? 'Aliado desactivado' : 'Aliado activado');
      cargarAliados();
    }
  }

  function handleGuardado() {
    setModalAbierto(false);
    setAliadoEditando(null);
    cargarAliados();
  }

  const aliadosFiltrados = busqueda.trim()
    ? aliados.filter(a =>
        a.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.correo?.toLowerCase().includes(busqueda.toLowerCase()))
    : aliados;

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
              <h1 className="text-2xl font-bold text-gray-800 mb-2">🤝 Gestión de Aliados</h1>
              <p className="text-gray-600">
                Usuarios de <strong>solo lectura</strong> con acceso a la información de los municipios que les asignes.
              </p>
            </div>
            <button
              onClick={abrirCrear}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm flex items-center space-x-2 whitespace-nowrap"
            >
              <span>➕</span>
              <span>Nuevo Aliado</span>
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar aliado por nombre o correo..."
              className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando aliados..." />
            </div>
          ) : aliadosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {aliados.length === 0 ? 'Aún no hay aliados registrados.' : 'No hay aliados que coincidan con la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {aliadosFiltrados.map(aliado => (
                <div
                  key={aliado.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800">{aliado.nombre_completo}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${aliado.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {aliado.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{aliado.correo}</p>
                    {aliado.telefono && <p className="text-xs text-gray-400 mt-0.5">📞 {aliado.telefono}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(aliado.municipios_asignados?.length > 0) ? (
                        aliado.municipios_asignados.map(m => (
                          <span key={m} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                            📍 {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-600">⚠️ Sin municipios asignados</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleActivo(aliado)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        aliado.activo
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      {aliado.activo ? '🚫 Desactivar' : '✅ Activar'}
                    </button>
                    <button
                      onClick={() => abrirEditar(aliado)}
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

      <ModalAliado
        isOpen={modalAbierto}
        onClose={() => { setModalAbierto(false); setAliadoEditando(null); }}
        onGuardado={handleGuardado}
        aliado={aliadoEditando}
      />
    </div>
  );
}
