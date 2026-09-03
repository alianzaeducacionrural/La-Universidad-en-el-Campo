// =============================================
// PANEL DE CONTROL - COORDINADOR (CON MÓDULO B)
// =============================================

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PanelSeguimientosPendientes from '../../components/coordinador/PanelSeguimientosPendientes';
import GestionPadrinos from '../../components/coordinador/GestionPadrinos';
import GestionUniversidades from '../../components/coordinador/GestionUniversidades';
import PanelMonitoreoAcciones from '../../components/coordinador/PanelMonitoreoAcciones';
import GestionInstituciones from '../../components/coordinador/GestionInstituciones';
import ConsolidadoSeguimientosUniversidad from '../../components/coordinador/ConsolidadoSeguimientosUniversidad';

export default function PanelCoordinador({ onSeguimiento, onVerPerfil, usuarioForzado = null }) {
  const { perfil: usuarioAuth } = useAuth();
  // usuarioForzado permite que el admin "vea como" un coordinador/asistente
  // administrativo específico desde VerComo.jsx, sin iniciar sesión con esa
  // cuenta (mismo patrón que DashboardUniversidad.jsx).
  const usuario = usuarioForzado || usuarioAuth;
  const [vistaActiva, setVistaActiva] = useState('seguimientos');

  if (!usuario) {
    return <LoadingSpinner mensaje="Cargando panel..." />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        vistaActiva="panel"
        setVistaActiva={() => {}}
        rol={usuario.rol}
      />
      
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 Panel de Control</h1>
          
          {/* Pestañas */}
          <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <nav className="flex space-x-6 min-w-max">
              <button
                onClick={() => setVistaActiva('seguimientos')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
                  vistaActiva === 'seguimientos'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚠️ Seguimientos Pendientes
              </button>
              <button
                onClick={() => setVistaActiva('padrinos')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
                  vistaActiva === 'padrinos'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                👥 Gestión de Padrinos
              </button>
              <button
                onClick={() => setVistaActiva('universidades')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
                  vistaActiva === 'universidades'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🏫 Universidades
              </button>
              <button
                onClick={() => setVistaActiva('monitoreo')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                  vistaActiva === 'monitoreo'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Monitoreo Acciones
              </button>
              <button
                onClick={() => setVistaActiva('instituciones')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                  vistaActiva === 'instituciones'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🏫 Instituciones Educativas
              </button>
              <button
                onClick={() => setVistaActiva('seguimientos-universidad')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition whitespace-nowrap ${
                  vistaActiva === 'seguimientos-universidad'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🎓 Seguim. Universidad
              </button>
            </nav>
          </div>
          
          {/* Contenido de pestañas */}
          {vistaActiva === 'seguimientos' && (
            <PanelSeguimientosPendientes 
              onSeguimiento={onSeguimiento}
              onVerPerfil={onVerPerfil}
            />
          )}
          
          {vistaActiva === 'padrinos' && (
            <GestionPadrinos />
          )}
          
          {vistaActiva === 'universidades' && (
            <GestionUniversidades usuarioForzado={usuario} />
          )}
          {vistaActiva === 'monitoreo' && (
            <PanelMonitoreoAcciones />
          )}
          {vistaActiva === 'instituciones' && (
            <GestionInstituciones />
          )}
          {vistaActiva === 'seguimientos-universidad' && (
            <ConsolidadoSeguimientosUniversidad onVerPerfil={onVerPerfil} />
          )}
        </div>
      </div>
    </div>
  );
}