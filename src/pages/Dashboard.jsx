// =============================================
// DASHBOARD PRINCIPAL - VERSIÓN COMPLETA
// =============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useGrupos } from '../hooks/useGrupos';
import { useEstudiantes } from '../hooks/useEstudiantes';
import { useSeguimientos } from '../hooks/useSeguimientos';
import { puedeGestionar } from '../utils/helpers';

// Componentes Common
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Componentes Grupos
import GrupoSelector from '../components/grupos/GrupoSelector';
import GrupoInfo from '../components/grupos/GrupoInfo';
import ModalCrearGrupo from '../components/grupos/ModalCrearGrupo';
import ModalHistorialAsistencia from '../components/grupos/ModalHistorialAsistencia';

// Componentes Estudiantes
import TablaEstudiantes from '../components/estudiantes/TablaEstudiantes';
import ModalImportar from '../components/estudiantes/ModalImportar';
import ModalSeguimiento from '../components/estudiantes/ModalSeguimiento';
import ModalEditarEstudiante from '../components/estudiantes/ModalEditarEstudiante';
import ModalPerfilEstudiante from '../components/estudiantes/ModalPerfilEstudiante';
import ModalAgregarEstudiante from '../components/estudiantes/ModalAgregarEstudiante';
import ModalReportarDesercion from '../components/estudiantes/ModalReportarDesercion';

// Componentes Seguimientos
import SeguimientosRecientes from '../components/seguimientos/SeguimientosRecientes';
import ModalEditarSeguimiento from '../components/seguimientos/ModalEditarSeguimiento';

// Componentes Padrino
import InasistenciasPendientes from '../components/padrino/InasistenciasPendientes';

export default function Dashboard() {
  // =============================================
  // AUTENTICACIÓN
  // =============================================
  const { perfil: padrino, loading: authLoading } = useAuth();

  // =============================================
  // HOOKS PERSONALIZADOS
  // =============================================
  const { 
    gruposAsignados, 
    grupoSeleccionado, 
    setGrupoSeleccionado, 
    crearGrupo 
  } = useGrupos(padrino);

  const { 
    estudiantes, 
    cargando: cargandoEstudiantes, 
    importarDesdeExcel,
    agregarEstudiante,
    actualizarEstudiante,
    cambiarEstado,
    cargarEstudiantes
  } = useEstudiantes(grupoSeleccionado);

  const { 
    seguimientos, 
    historialEstudiante, 
    cargando: cargandoHistorial,
    cargarHistorial,
    registrarSeguimiento,
    actualizarSeguimiento
  } = useSeguimientos(padrino, gruposAsignados);

  // =============================================
  // ESTADOS DE VISTA Y MODALES
  // =============================================
  const [vistaActiva, setVistaActiva] = useState(() => {
    const saved = sessionStorage.getItem('vistaActivaDashboard');
    return saved || 'grupos';
  });
  const [totalPendientes, setTotalPendientes] = useState(0);
  
  // Modales
  const [modalCrearGrupo, setModalCrearGrupo] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalAgregarEstudiante, setModalAgregarEstudiante] = useState(false);
  const [modalSeguimiento, setModalSeguimiento] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalEditarSeguimiento, setModalEditarSeguimiento] = useState(false);
  const [modalHistorialAsistencia, setModalHistorialAsistencia] = useState(false);
  const [modalReportarDesercion, setModalReportarDesercion] = useState(false);
  
  // Elementos seleccionados
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [seguimientoSeleccionado, setSeguimientoSeleccionado] = useState(null);
  const [inasistenciaActual, setInasistenciaActual] = useState(null);
  const [estudianteParaDesercion, setEstudianteParaDesercion] = useState(null);
  
  // Ref para el componente de inasistencias
  const [refreshInasistencias, setRefreshInasistencias] = useState(0);

  // =============================================
  // CARGAR TOTAL DE PENDIENTES
  // =============================================
  useEffect(() => {
    if (padrino) {
      cargarTotalPendientes();
    }
  }, [padrino, refreshInasistencias]);

  async function cargarTotalPendientes() {
    if (!padrino) return;
    
    const { data: gruposPadrino } = await supabase
      .from('grupo_padrino')
      .select('grupo_id')
      .eq('padrino_id', padrino.id);
    
    const gruposIds = gruposPadrino?.map(g => g.grupo_id) || [];
    
    if (gruposIds.length === 0) {
      setTotalPendientes(0);
      return;
    }
    
    const { count } = await supabase
      .from('vista_inasistencias_pendientes')
      .select('*', { count: 'exact', head: true })
      .in('grupo_id', gruposIds);
    
    setTotalPendientes(count || 0);
  }

  // =============================================
  // MANEJADORES
  // =============================================
  const handleSeguimiento = (est, inasistencia = null) => {
    setEstudianteSeleccionado(est);
    setInasistenciaActual(inasistencia);
    setModalSeguimiento(true);
  };

  const handleVerPerfil = (est) => {
    setEstudianteSeleccionado(est);
    setModalPerfil(true);
  };

  const handleVerPerfilDesdeInasistencia = (inasistencia) => {
    if (inasistencia?.estudiante) {
      setEstudianteSeleccionado(inasistencia.estudiante);
      setModalPerfil(true);
    }
  };

  const handleVerPerfilDesdeSeguimiento = (estudiante) => {
    if (estudiante) {
      setEstudianteSeleccionado(estudiante);
      setModalPerfil(true);
    }
  };

  const handleEditar = (est) => {
    setModalPerfil(false);
    setTimeout(() => {
      setEstudianteSeleccionado(est);
      setModalEditar(true);
    }, 150);
  };

  const handleGuardarSeguimiento = async (datos) => {
    const datosCompletos = {
      ...datos,
      padrino_id: padrino.id
    };
    
    const resultado = await registrarSeguimiento(datosCompletos);
    
    if (resultado.success && inasistenciaActual) {
      await supabase
        .from('inasistencias')
        .update({ 
          estado_seguimiento: 'realizado',
          seguimiento_id: resultado.data?.id 
        })
        .eq('id', inasistenciaActual.id);
      
      setRefreshInasistencias(prev => prev + 1);
    }
    
    return resultado;
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    return await cambiarEstado(id, nuevoEstado);
  };

  const handleEditarSeguimiento = (seg) => {
    setSeguimientoSeleccionado(seg);
    setModalEditarSeguimiento(true);
  };

  const handleReportarDesercion = (est) => {
    setEstudianteParaDesercion(est);
    setModalPerfil(false);
    setModalReportarDesercion(true);
  };

  // =============================================
  // RENDERIZADO
  // =============================================
  if (authLoading || !padrino) {
    return <LoadingSpinner mensaje="Cargando sistema..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* SIDEBAR LATERAL */}
      <Sidebar 
        vistaActiva={vistaActiva} 
        setVistaActiva={setVistaActiva}
        rol={padrino.rol}
        totalPendientes={totalPendientes}
      />

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1">
        <Header onVerPerfil={handleVerPerfil} />

        <div className="max-w-7xl mx-auto px-6 py-8">
          {vistaActiva === 'grupos' && (
            <>
              <GrupoSelector
                gruposAsignados={gruposAsignados}
                grupoSeleccionado={grupoSeleccionado}
                setGrupoSeleccionado={setGrupoSeleccionado}
              />

              <GrupoInfo 
                grupo={grupoSeleccionado} 
                totalEstudiantes={estudiantes.length}
                estudiantes={estudiantes}
                onVerHistorialAsistencia={() => setModalHistorialAsistencia(true)}
                padrino={padrino}
              />
            </>
          )}

          {vistaActiva === 'grupos' && (
            <TablaEstudiantes
              estudiantes={estudiantes}
              cargando={cargandoEstudiantes}
              grupoSeleccionado={grupoSeleccionado}
              puedeGestionar={puedeGestionar(padrino.rol)}
              onSeguimiento={(est) => handleSeguimiento(est)}
              onVerPerfil={handleVerPerfil}
              onImportar={() => setModalImportar(true)}
            />
          )}

          {vistaActiva === 'inasistencias' && (
            <InasistenciasPendientes 
              padrino={padrino}
              onSeguimiento={handleSeguimiento}
              onVerPerfil={handleVerPerfilDesdeInasistencia}
              refresh={refreshInasistencias}
            />
          )}

          {vistaActiva === 'seguimientos' && (
            <SeguimientosRecientes 
              seguimientos={seguimientos}
              onEditarSeguimiento={handleEditarSeguimiento}
              onVerPerfil={handleVerPerfilDesdeSeguimiento}
            />
          )}

          {vistaActiva === 'estadisticas' && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">📊 Panel de Estadísticas</p>
              <p className="text-gray-400">Disponible en la sección de Administración</p>
            </div>
          )}

          {vistaActiva === 'reportes' && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">📈 Panel de Reportes</p>
              <p className="text-gray-400">Disponible en la sección de Administración</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================= */}
      {/* MODALES */}
      {/* ============================================= */}

      <ModalCrearGrupo
        isOpen={modalCrearGrupo}
        onClose={() => setModalCrearGrupo(false)}
        onCrear={crearGrupo}
        padrinoActual={padrino}
      />

      <ModalImportar
        isOpen={modalImportar}
        onClose={() => setModalImportar(false)}
        onImportar={importarDesdeExcel}
        grupoSeleccionado={grupoSeleccionado}
      />

      <ModalAgregarEstudiante
        isOpen={modalAgregarEstudiante}
        onClose={() => setModalAgregarEstudiante(false)}
        onGuardar={agregarEstudiante}
        grupoSeleccionado={grupoSeleccionado}
      />

      <ModalSeguimiento
        isOpen={modalSeguimiento}
        onClose={() => {
          setModalSeguimiento(false);
          setEstudianteSeleccionado(null);
          setInasistenciaActual(null);
        }}
        onGuardar={handleGuardarSeguimiento}
        estudiante={estudianteSeleccionado}
      />

      <ModalEditarEstudiante
        isOpen={modalEditar}
        onClose={() => {
          setModalEditar(false);
          setEstudianteSeleccionado(null);
        }}
        onGuardar={actualizarEstudiante}
        estudiante={estudianteSeleccionado}
        puedeGestionar={puedeGestionar(padrino.rol)}
      />

      <ModalPerfilEstudiante
        isOpen={modalPerfil}
        onClose={() => {
          setModalPerfil(false);
          setEstudianteSeleccionado(null);
        }}
        estudiante={estudianteSeleccionado}
        historial={historialEstudiante}
        cargandoHistorial={cargandoHistorial}
        onCargarHistorial={cargarHistorial}
        onSeguimiento={handleSeguimiento}
        onEditar={handleEditar}
        onEditarSeguimiento={handleEditarSeguimiento}
        onReportarDesercion={handleReportarDesercion}
        puedeGestionar={puedeGestionar(padrino.rol)}
        onEstadoChange={async (id, estado) => {
        const result = await handleCambiarEstado(id, estado);
        // 🔥 Recargar lista de estudiantes del grupo actual
        if (grupoSeleccionado) {
          cargarEstudiantes();
        }
        return result;
      }}
      />

      <ModalEditarSeguimiento
        isOpen={modalEditarSeguimiento}
        onClose={() => {
          setModalEditarSeguimiento(false);
          setSeguimientoSeleccionado(null);
        }}
        onGuardar={actualizarSeguimiento}
        seguimiento={seguimientoSeleccionado}
      />

      <ModalHistorialAsistencia
        isOpen={modalHistorialAsistencia}
        onClose={() => setModalHistorialAsistencia(false)}
        grupo={grupoSeleccionado}
      />

      <ModalReportarDesercion
        isOpen={modalReportarDesercion}
        onClose={() => {
          setModalReportarDesercion(false);
          setEstudianteParaDesercion(null);
        }}
        onConfirmar={() => {
          if (grupoSeleccionado) {
            cargarEstudiantes();
          }
        }}
        estudiante={estudianteParaDesercion}
        usuario={padrino}
      />
    </div>
  );
}