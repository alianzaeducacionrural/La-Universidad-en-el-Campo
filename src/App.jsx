// =============================================
// ENRUTADOR PRINCIPAL (MODALES SEPARADOS)
// =============================================

import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificacionProvider } from './context/NotificacionContext';
import { supabase } from './lib/supabaseClient';
import { puedeGestionar } from './utils/helpers';
import useCartasCobro from './hooks/useCartasCobro';
import ModalAlertaCartasCobro from './components/admin/ModalAlertaCartasCobro';
import { emitirEstudianteActualizado } from './hooks/useEstudianteActualizado';
import Login from './pages/Login';
import SplashScreen from './components/common/SplashScreen';
import ErrorBoundary from './components/common/ErrorBoundary';
import ModalSeguimiento from './components/estudiantes/ModalSeguimiento';
import ModalPerfilEstudiante from './components/estudiantes/ModalPerfilEstudiante';
import ModalEditarEstudiante from './components/estudiantes/ModalEditarEstudiante';
import ModalReportarDesercion from './components/estudiantes/ModalReportarDesercion';
import ModalEditarSeguimiento from './components/seguimientos/ModalEditarSeguimiento';
import { useNotificacion } from './context/NotificacionContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardUniversidad = lazy(() => import('./pages/universidad/DashboardUniversidad'));
const PanelCoordinador = lazy(() => import('./pages/coordinador/PanelCoordinador'));
const Estadisticas = lazy(() => import('./pages/Estadisticas'));
const Reportes = lazy(() => import('./pages/Reportes'));
const GestionGrupos = lazy(() => import('./pages/admin/GestionGrupos'));
const GestionMultas = lazy(() => import('./pages/admin/GestionMultas'));
const HistorialReportesAsistencia = lazy(() => import('./pages/coordinador/HistorialReportesAsistencia'));
const GestionAliados = lazy(() => import('./pages/admin/GestionAliados'));
const GestionEquipo = lazy(() => import('./pages/admin/GestionEquipo'));
const GestionDesertores = lazy(() => import('./pages/admin/GestionDesertores'));
const ListadoEstudiantes = lazy(() => import('./pages/admin/ListadoEstudiantes'));
const SeguimientosUniversidad = lazy(() => import('./pages/admin/SeguimientosUniversidad'));
const PortalInstitucion = lazy(() => import('./pages/PortalInstitucion'));
const VerComo = lazy(() => import('./pages/admin/VerComo'));

// Rutas a las que un aliado (solo lectura) tiene acceso
const RUTAS_ALIADO = ['/estadisticas', '/reportes', '/grupos'];

function ProtectedRoute({ children }) {
  const { user, perfil, loading } = useAuth();
  const location = useLocation();
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">☕</div>
        <h2 className="text-xl font-bold text-primary-dark mb-2">La Universidad en el Campo</h2>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  // Los aliados solo pueden entrar a Estadísticas, Reportes y Grupos
  if (perfil?.rol === 'aliado' && !RUTAS_ALIADO.includes(location.pathname)) {
    return <Navigate to="/estadisticas" replace />;
  }
  return children;
}

// Ruta exclusiva para administradores
function AdminRoute({ children }) {
  const { user, perfil, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (perfil?.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user, perfil, tipoUsuario, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">☕</div>
        <h2 className="text-xl font-bold text-primary-dark mb-2">La Universidad en el Campo</h2>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (perfil?.rol === 'aliado') return <Navigate to="/estadisticas" replace />;
  // Los roles administrativos (admin, coordinadores, asistente_admin) no
  // tienen grupos propios — su página principal es el Panel de Control.
  if (tipoUsuario === 'padrino' && puedeGestionar(perfil?.rol)) return <Navigate to="/panel" replace />;
  if (tipoUsuario === 'padrino') return <Navigate to="/dashboard" replace />;
  if (tipoUsuario === 'universidad') return <Navigate to="/universidad/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

// 🔥 COMPONENTE PARA MODALES DEL PANEL DE CONTROL
function PanelModales({ 
  modalSeguimiento, setModalSeguimiento,
  modalPerfilPanel, setModalPerfilPanel,
  modalEditarEstudiante, setModalEditarEstudiante,
  modalReportarDesercion, setModalReportarDesercion,
  modalEditarSeguimiento, setModalEditarSeguimiento,
  estudianteSeleccionado, setEstudianteSeleccionado,
  inasistenciaActual, setInasistenciaActual,
  seguimientoSeleccionado, setSeguimientoSeleccionado,
  historialEstudiante, cargandoHistorial, cargarHistorialPanel,
  handleSeguimientoDesdePanel, handleEditarDesdePanel,
  handleReportarDesercionDesdePanel, handleEditarSeguimientoDesdePanel,
  handleGuardarSeguimientoPanel, handleActualizarEstudiantePanel,
  handleCambiarEstadoPanel, handleActualizarSeguimientoPanel,
  usuario
}) {
  return (
    <>
      <ModalPerfilEstudiante
        isOpen={modalPerfilPanel}
        onClose={() => { setModalPerfilPanel(false); setEstudianteSeleccionado(null); }}
        estudiante={estudianteSeleccionado}
        historial={historialEstudiante}
        cargandoHistorial={cargandoHistorial}
        onCargarHistorial={cargarHistorialPanel}
        onSeguimiento={handleSeguimientoDesdePanel}
        onEditar={handleEditarDesdePanel}
        onEditarSeguimiento={handleEditarSeguimientoDesdePanel}
        onReportarDesercion={handleReportarDesercionDesdePanel}
        puedeGestionar={true}
        onEstadoChange={handleCambiarEstadoPanel}
        esAdmin={usuario?.rol === 'admin'}
        onEstudianteEliminado={() => setEstudianteSeleccionado(null)}
      />
      <ModalEditarEstudiante
        isOpen={modalEditarEstudiante}
        onClose={() => { setModalEditarEstudiante(false); setEstudianteSeleccionado(null); }}
        onGuardar={handleActualizarEstudiantePanel}
        estudiante={estudianteSeleccionado}
        puedeGestionar={true}
        esAdmin={usuario?.rol === 'admin'}
      />
      <ModalReportarDesercion
        isOpen={modalReportarDesercion}
        onClose={() => { setModalReportarDesercion(false); setEstudianteSeleccionado(null); }}
        onConfirmar={() => {}}
        estudiante={estudianteSeleccionado}
        usuario={usuario}
      />
      <ModalEditarSeguimiento
        isOpen={modalEditarSeguimiento}
        onClose={() => { setModalEditarSeguimiento(false); setSeguimientoSeleccionado(null); }}
        onGuardar={handleActualizarSeguimientoPanel}
        seguimiento={seguimientoSeleccionado}
      />
    </>
  );
}

// 🔥 COMPONENTE PARA MODAL GLOBAL (BUSCADOR)
function GlobalModales({
  modalPerfilGlobal, setModalPerfilGlobal,
  modalSeguimientoGlobal, setModalSeguimientoGlobal,
  modalEditarEstudianteGlobal, setModalEditarEstudianteGlobal,
  modalReportarDesercionGlobal, setModalReportarDesercionGlobal,
  estudiantePerfilGlobal, setEstudiantePerfilGlobal,
  historialPerfilGlobal, cargandoHistorialGlobal, cargarHistorialGlobalFn,
  usuario
}) {
  const notificacion = useNotificacion();
  const esLector = ['aliado', 'docente', 'coordinador_universidad'].includes(usuario?.rol);

  return (
    <>
      <ModalPerfilEstudiante
        isOpen={modalPerfilGlobal}
        onClose={() => { setModalPerfilGlobal(false); setEstudiantePerfilGlobal(null); }}
        estudiante={estudiantePerfilGlobal}
        historial={historialPerfilGlobal}
        cargandoHistorial={cargandoHistorialGlobal}
        onCargarHistorial={cargarHistorialGlobalFn}
        onSeguimiento={(est) => {
          setModalPerfilGlobal(false);
          setTimeout(() => {
            setEstudiantePerfilGlobal(est);
            setModalSeguimientoGlobal(true);
          }, 150);
        }}
        onEditar={(est) => {
          setModalPerfilGlobal(false);
          setTimeout(() => {
            setEstudiantePerfilGlobal(est);
            setModalEditarEstudianteGlobal(true);
          }, 150);
        }}
        onEditarSeguimiento={() => {}}
        onReportarDesercion={(est) => {
          setModalPerfilGlobal(false);
          setTimeout(() => {
            setEstudiantePerfilGlobal(est);
            setModalReportarDesercionGlobal(true);
          }, 150);
        }}
        puedeGestionar={!esLector}
        onEstadoChange={async (id, estado) => {
          if (estado === 'Desertor') {
            setModalPerfilGlobal(false);
            setTimeout(() => {
              setModalReportarDesercionGlobal(true);
            }, 150);
            return { success: true };
          }
          const { error } = await supabase.from('estudiantes').update({ estado }).eq('id', id);
          if (error) return { success: false, error: error.message };
          notificacion.success(`Estado actualizado a: ${estado}`);
          return { success: true };
        }}
        esAdmin={usuario?.rol === 'admin'}
        onEstudianteEliminado={() => setEstudiantePerfilGlobal(null)}
      />

      <ModalSeguimiento
        isOpen={modalSeguimientoGlobal}
        onClose={() => { setModalSeguimientoGlobal(false); }}
        onGuardar={async (datos) => {
          const datosCompletos = { ...datos, padrino_id: usuario?.id };
          const { data, error } = await supabase.from('seguimientos').insert([datosCompletos]).select().single();
          if (error) return { success: false, error: error.message };
          notificacion.success('Seguimiento registrado correctamente');
          return { success: true, data };
        }}
        estudiante={estudiantePerfilGlobal}
      />

      <ModalEditarEstudiante
        isOpen={modalEditarEstudianteGlobal}
        onClose={() => { setModalEditarEstudianteGlobal(false); }}
        onGuardar={async (id, datos) => {
          const { error } = await supabase.from('estudiantes').update(datos).eq('id', id);
          if (error) return { success: false, error: error.message };
          notificacion.success('Información actualizada correctamente');
          // Actualiza el perfil abierto ahí mismo y avisa a cualquier otra
          // página montada que tenga su propia copia de este estudiante (ver
          // useEstudianteActualizado.js) — sin esto había que recargar la
          // página para ver reflejado el cambio (p.ej. discapacidad/trastorno).
          setEstudiantePerfilGlobal(prev => (prev && prev.id === id ? { ...prev, ...datos } : prev));
          emitirEstudianteActualizado(id, datos);
          return { success: true };
        }}
        estudiante={estudiantePerfilGlobal}
        puedeGestionar={true}
        esAdmin={usuario?.rol === 'admin'}
      />

      <ModalReportarDesercion
        isOpen={modalReportarDesercionGlobal}
        onClose={() => { setModalReportarDesercionGlobal(false); }}
        onConfirmar={() => {}}
        estudiante={estudiantePerfilGlobal}
        usuario={usuario}
      />
    </>
  );
}

// Alerta global de cartas de cobro — montada solo para asistente_admin (ver
// AppContent), así el hook (y su consulta) ni siquiera corre para otros
// roles. Máximo una vez cada 4 horas: el timestamp solo se guarda cuando el
// modal realmente se muestra, para no ocultar una alerta nueva que surja
// dentro de la ventana de 4h sin nada pendiente al momento de revisar.
function AlertaCartasCobroAsistente() {
  const { alertables, cargando, recargar } = useCartasCobro();
  const [modalAlertaCartas, setModalAlertaCartas] = useState(false);

  useEffect(() => {
    if (cargando || alertables.length === 0) return;
    const CLAVE = 'ultimaAlertaCartasCobroMostrada';
    const CUATRO_HORAS_MS = 4 * 60 * 60 * 1000;
    let ultima = null;
    try { ultima = parseInt(localStorage.getItem(CLAVE), 10) || null; } catch { /* localStorage no disponible */ }
    if (ultima && Date.now() - ultima < CUATRO_HORAS_MS) return;

    setModalAlertaCartas(true);
    try { localStorage.setItem(CLAVE, Date.now().toString()); } catch { /* localStorage no disponible */ }
  }, [cargando, alertables]);

  // Al volver a la pestaña tras una ausencia, refresca los datos — si ya
  // pasaron 4h desde el último aviso, el efecto de arriba lo vuelve a mostrar.
  useEffect(() => {
    function alVolverVisible() {
      if (document.visibilityState === 'visible') recargar();
    }
    document.addEventListener('visibilitychange', alVolverVisible);
    return () => document.removeEventListener('visibilitychange', alVolverVisible);
  }, [recargar]);

  return (
    <ModalAlertaCartasCobro
      isOpen={modalAlertaCartas}
      onClose={() => setModalAlertaCartas(false)}
      alertas={alertables}
    />
  );
}

function AppContent() {
  const { perfil: usuario } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // =============================================
  // ESTADOS PARA MODALES DEL PANEL DE CONTROL
  // =============================================
  const [modalSeguimiento, setModalSeguimiento] = useState(false);
  const [modalPerfilPanel, setModalPerfilPanel] = useState(false);
  const [modalEditarEstudiante, setModalEditarEstudiante] = useState(false);
  const [modalReportarDesercion, setModalReportarDesercion] = useState(false);
  const [modalEditarSeguimiento, setModalEditarSeguimiento] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [inasistenciaActual, setInasistenciaActual] = useState(null);
  const [seguimientoSeleccionado, setSeguimientoSeleccionado] = useState(null);
  const [historialEstudiante, setHistorialEstudiante] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // =============================================
  // ESTADOS PARA MODAL GLOBAL (BUSCADOR)
  // =============================================
  const [modalPerfilGlobal, setModalPerfilGlobal] = useState(false);
  const [modalSeguimientoGlobal, setModalSeguimientoGlobal] = useState(false);
  const [modalEditarEstudianteGlobal, setModalEditarEstudianteGlobal] = useState(false);
  const [modalReportarDesercionGlobal, setModalReportarDesercionGlobal] = useState(false);
  const [estudiantePerfilGlobal, setEstudiantePerfilGlobal] = useState(null);
  const [historialPerfilGlobal, setHistorialPerfilGlobal] = useState([]);
  const [cargandoHistorialGlobal, setCargandoHistorialGlobal] = useState(false);

  // =============================================
  // FUNCIONES DEL PANEL DE CONTROL
  // =============================================
  async function cargarHistorialPanel(estudianteId) {
    setCargandoHistorial(true);
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, padrino:padrino_id (nombre_completo)`)
      .eq('estudiante_id', estudianteId)
      .order('fecha_contacto', { ascending: false });
    if (data) setHistorialEstudiante(data);
    setCargandoHistorial(false);
  }

  function handleSeguimientoDesdePanel(est, inasistencia = null) {
    setEstudianteSeleccionado(est);
    setInasistenciaActual(inasistencia);
    setModalSeguimiento(true);
  }

  function handleVerPerfilDesdePanel(est) {
    setEstudianteSeleccionado(est);
    cargarHistorialPanel(est.id);
    setModalPerfilPanel(true);
  }

  function handleEditarDesdePanel(est) {
    setModalPerfilPanel(false);
    setTimeout(() => {
      setEstudianteSeleccionado(est);
      setModalEditarEstudiante(true);
    }, 150);
  }

  function handleReportarDesercionDesdePanel(est) {
    setModalPerfilPanel(false);
    setTimeout(() => {
      setEstudianteSeleccionado(est);
      setModalReportarDesercion(true);
    }, 150);
  }

  function handleEditarSeguimientoDesdePanel(seg) {
    setSeguimientoSeleccionado(seg);
    setModalEditarSeguimiento(true);
  }

  async function handleGuardarSeguimientoPanel(datos) {
    const datosCompletos = { ...datos, padrino_id: usuario?.id };
    const { data, error } = await supabase.from('seguimientos').insert([datosCompletos]).select().single();
    if (error) return { success: false, error: error.message };
    if (inasistenciaActual?.id) {
      await supabase.from('inasistencias').update({ estado_seguimiento: 'realizado' }).eq('id', inasistenciaActual.id);
    }
    return { success: true, data };
  }

  async function handleActualizarEstudiantePanel(id, datos) {
    const { error } = await supabase.from('estudiantes').update(datos).eq('id', id);
    if (error) return { success: false, error: error.message };
    // Actualiza el perfil abierto ahí mismo y avisa a cualquier otra página
    // montada que tenga su propia copia de este estudiante (ver
    // useEstudianteActualizado.js) — sin esto había que recargar la página
    // para ver reflejado el cambio (p.ej. discapacidad/trastorno).
    setEstudianteSeleccionado(prev => (prev && prev.id === id ? { ...prev, ...datos } : prev));
    emitirEstudianteActualizado(id, datos);
    return { success: true };
  }

  async function handleCambiarEstadoPanel(id, estado) {
    const { error } = await supabase.from('estudiantes').update({ estado }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function handleActualizarSeguimientoPanel(id, datos) {
    const { error } = await supabase.from('seguimientos').update(datos).eq('id', id);
    if (error) return { success: false, error: error.message };
    setHistorialEstudiante(prev => prev.map(s => s.id === id ? { ...s, ...datos } : s));
    return { success: true };
  }

  // =============================================
  // FUNCIONES DEL MODAL GLOBAL (BUSCADOR)
  // =============================================
  async function handleVerPerfilGlobal(estudiante) {
    setEstudiantePerfilGlobal(estudiante);
    setCargandoHistorialGlobal(true);
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, padrino:padrino_id (nombre_completo)`)
      .eq('estudiante_id', estudiante.id)
      .order('fecha_contacto', { ascending: false });
    if (data) setHistorialPerfilGlobal(data);
    setCargandoHistorialGlobal(false);
    setModalPerfilGlobal(true);
  }

  async function cargarHistorialGlobalFn(estudianteId) {
    setCargandoHistorialGlobal(true);
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, padrino:padrino_id (nombre_completo)`)
      .eq('estudiante_id', estudianteId)
      .order('fecha_contacto', { ascending: false });
    if (data) setHistorialPerfilGlobal(data);
    setCargandoHistorialGlobal(false);
  }

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Portal público de Instituciones Educativas — sin sesión, fuera de ProtectedRoute */}
            <Route path="/ie/:token" element={<PortalInstitucion />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/universidad/dashboard" element={<ProtectedRoute><DashboardUniversidad onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/panel" element={
              <ProtectedRoute>
                <PanelCoordinador
                  onSeguimiento={handleSeguimientoDesdePanel}
                  onVerPerfil={handleVerPerfilDesdePanel}
                />
              </ProtectedRoute>
            } />
            <Route path="/estadisticas" element={<ProtectedRoute><Estadisticas onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute><Reportes onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/grupos" element={<ProtectedRoute><GestionGrupos onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/multas" element={<ProtectedRoute><GestionMultas onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/desertores" element={<ProtectedRoute><GestionDesertores onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/estudiantes" element={<ProtectedRoute><ListadoEstudiantes onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/seguimientos-universidad" element={<ProtectedRoute><SeguimientosUniversidad onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/aliados" element={<AdminRoute><GestionAliados onVerPerfil={handleVerPerfilGlobal} /></AdminRoute>} />
            <Route path="/equipo" element={<AdminRoute><GestionEquipo onVerPerfil={handleVerPerfilGlobal} /></AdminRoute>} />
            <Route path="/ver-como" element={<AdminRoute><VerComo /></AdminRoute>} />
            <Route path="/historial-reportes" element={<ProtectedRoute><HistorialReportesAsistencia onVerPerfil={handleVerPerfilGlobal} /></ProtectedRoute>} />
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      {/* MODALES DEL PANEL DE CONTROL */}
      <PanelModales
        modalSeguimiento={modalSeguimiento} setModalSeguimiento={setModalSeguimiento}
        modalPerfilPanel={modalPerfilPanel} setModalPerfilPanel={setModalPerfilPanel}
        modalEditarEstudiante={modalEditarEstudiante} setModalEditarEstudiante={setModalEditarEstudiante}
        modalReportarDesercion={modalReportarDesercion} setModalReportarDesercion={setModalReportarDesercion}
        modalEditarSeguimiento={modalEditarSeguimiento} setModalEditarSeguimiento={setModalEditarSeguimiento}
        estudianteSeleccionado={estudianteSeleccionado} setEstudianteSeleccionado={setEstudianteSeleccionado}
        inasistenciaActual={inasistenciaActual} setInasistenciaActual={setInasistenciaActual}
        seguimientoSeleccionado={seguimientoSeleccionado} setSeguimientoSeleccionado={setSeguimientoSeleccionado}
        historialEstudiante={historialEstudiante} cargandoHistorial={cargandoHistorial}
        cargarHistorialPanel={cargarHistorialPanel}
        handleSeguimientoDesdePanel={handleSeguimientoDesdePanel}
        handleEditarDesdePanel={handleEditarDesdePanel}
        handleReportarDesercionDesdePanel={handleReportarDesercionDesdePanel}
        handleEditarSeguimientoDesdePanel={handleEditarSeguimientoDesdePanel}
        handleGuardarSeguimientoPanel={handleGuardarSeguimientoPanel}
        handleActualizarEstudiantePanel={handleActualizarEstudiantePanel}
        handleCambiarEstadoPanel={handleCambiarEstadoPanel}
        handleActualizarSeguimientoPanel={handleActualizarSeguimientoPanel}
        usuario={usuario}
      />

      {/* MODALES GLOBALES (BUSCADOR) */}
      <GlobalModales
        modalPerfilGlobal={modalPerfilGlobal} setModalPerfilGlobal={setModalPerfilGlobal}
        modalSeguimientoGlobal={modalSeguimientoGlobal} setModalSeguimientoGlobal={setModalSeguimientoGlobal}
        modalEditarEstudianteGlobal={modalEditarEstudianteGlobal} setModalEditarEstudianteGlobal={setModalEditarEstudianteGlobal}
        modalReportarDesercionGlobal={modalReportarDesercionGlobal} setModalReportarDesercionGlobal={setModalReportarDesercionGlobal}
        estudiantePerfilGlobal={estudiantePerfilGlobal} setEstudiantePerfilGlobal={setEstudiantePerfilGlobal}
        historialPerfilGlobal={historialPerfilGlobal} cargandoHistorialGlobal={cargandoHistorialGlobal}
        cargarHistorialGlobalFn={cargarHistorialGlobalFn}
        usuario={usuario}
      />

      {usuario?.rol === 'asistente_admin' && <AlertaCartasCobroAsistente />}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificacionProvider>
          <AppContent />
        </NotificacionProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;