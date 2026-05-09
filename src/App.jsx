// =============================================
// ENRUTADOR PRINCIPAL (MODALES SEPARADOS)
// =============================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificacionProvider } from './context/NotificacionContext';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import SplashScreen from './components/common/SplashScreen';
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
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
  return children;
}

function HomeRedirect() {
  const { user, tipoUsuario, loading } = useAuth();
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
      />
      <ModalEditarEstudiante
        isOpen={modalEditarEstudiante}
        onClose={() => { setModalEditarEstudiante(false); setEstudianteSeleccionado(null); }}
        onGuardar={handleActualizarEstudiantePanel}
        estudiante={estudianteSeleccionado}
        puedeGestionar={true}
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
        puedeGestionar={true}
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
          return { success: true };
        }}
        estudiante={estudiantePerfilGlobal}
        puedeGestionar={true}
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
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/universidad/dashboard" element={<ProtectedRoute><DashboardUniversidad /></ProtectedRoute>} />
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
          <Route path="/historial-reportes" element={<ProtectedRoute><HistorialReportesAsistencia /></ProtectedRoute>} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

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