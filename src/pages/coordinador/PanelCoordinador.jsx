// =============================================
// PANEL DE CONTROL - COORDINADOR (CON MÓDULO B)
// =============================================

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PanelSeguimientosPendientes from '../../components/coordinador/PanelSeguimientosPendientes';
import PanelReportesAsistencia from '../../components/coordinador/PanelReportesAsistencia';
import GestionPadrinos from '../../components/coordinador/GestionPadrinos';
import GestionUniversidades from '../../components/coordinador/GestionUniversidades';
import PanelMonitoreoAcciones from '../../components/coordinador/PanelMonitoreoAcciones';

export default function PanelCoordinador({ onSeguimiento, onVerPerfil }) {
  const { perfil: usuario } = useAuth();
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
      
      <div className="flex-1">
        <Header onVerPerfil={(estudiante) => {
          console.log('Estudiante seleccionado:', estudiante);
        }} />
        
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 Panel de Control</h1>
          
          {/* Pestañas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
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
                onClick={() => setVistaActiva('asistencias')}
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
                  vistaActiva === 'asistencias' 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Reportes de Asistencia
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
                className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
                  vistaActiva === 'monitoreo' 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Monitoreo Acciones
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
          
          {vistaActiva === 'asistencias' && (
            <PanelReportesAsistencia />
          )}
          
          {vistaActiva === 'padrinos' && (
            <GestionPadrinos />
          )}
          
          {vistaActiva === 'universidades' && (
            <GestionUniversidades />
          )}
          {vistaActiva === 'monitoreo' && (
            <PanelMonitoreoAcciones />
          )}
        </div>
      </div>
    </div>
  );
}