// =============================================
// COMPONENTE: Menú Lateral de Navegación (CORREGIDO)
// =============================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ vistaActiva, setVistaActiva, rol, totalPendientes = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { perfil } = useAuth();
  const [colapsado, setColapsado] = useState(false);
  
  const esCoordinador = ['admin', 'coord_superior', 'coord_pedagogico', 'asistente_admin'].includes(rol);
  const esPadrino = (rol === 'padrino' || esCoordinador) && rol !== 'asistente_admin';

  const getActiveFromRoute = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return vistaActiva || 'grupos';
    if (path === '/panel') return 'panel';
    if (path === '/estadisticas') return 'estadisticas';
    if (path === '/reportes') return 'reportes';
    if (path === '/grupos') return 'grupos-admin';
    return vistaActiva || 'grupos';
  };

  const activeId = getActiveFromRoute();
  
  function handleMiGestionClick(tabId) {
    setVistaActiva(tabId);
    sessionStorage.setItem('vistaActivaDashboard', tabId);
    navigate('/dashboard');
  }

  const menuPadrino = [
    { id: 'grupos', label: 'Mis Grupos', icon: '📋', visible: esPadrino, action: () => handleMiGestionClick('grupos') },
    { id: 'inasistencias', label: 'Inasistencias Pendientes', icon: '⚠️', visible: esPadrino, badge: totalPendientes, action: () => handleMiGestionClick('inasistencias') },
    { id: 'seguimientos', label: 'Seguimientos Recientes', icon: '📝', visible: esPadrino, action: () => handleMiGestionClick('seguimientos') },
  ];
  
  const menuAdmin = [
    { id: 'panel', label: 'Panel de Control', icon: '📊', visible: esCoordinador, action: () => navigate('/panel') },
    { id: 'estadisticas', label: 'Estadísticas', icon: '📈', visible: esCoordinador, action: () => navigate('/estadisticas') },
    { id: 'reportes', label: 'Reportes', icon: '📑', visible: esCoordinador, action: () => navigate('/reportes') },
    { id: 'grupos-admin', label: 'Grupos', icon: '📚', visible: esCoordinador, action: () => navigate('/grupos') },
    { id: 'multas', label: 'Multas', icon: '💰', visible: esCoordinador, action: () => navigate('/multas') }, 
  ];

  const renderMenuItem = (item, isAdmin = false) => {
  const isActive = activeId === item.id;
  
  return (
    <button
      key={item.id}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.action(); }}
      className={`relative w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center ${
        colapsado ? 'justify-center' : 'space-x-3'
      } ${
        isActive
          ? isAdmin
            ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-l-4 border-purple-600 shadow-sm'
            : 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-l-4 border-primary shadow-sm'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
      }`}
      title={colapsado ? item.label : ''}
    >
      <span className="text-xl flex-shrink-0">{item.icon}</span>
      {!colapsado && (
        <>
          <span className="font-medium text-sm flex-1">{item.label}</span>
          {item.badge > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
          )}
        </>
      )}
      {/* 🔥 CORRECCIÓN: Badge en modo colapsado */}
      {colapsado && item.badge > 0 && (
        <span className="absolute top-0 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </button>
  );
};

  return (
    <div className={`bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto transition-all duration-300 ${
      colapsado ? 'w-20' : 'w-72'
    }`}>
      {/* 🔥 CABECERA DEL SIDEBAR */}
      <div className={`p-4 border-b border-gray-200 ${colapsado ? 'flex justify-center' : ''}`}>
        {!colapsado ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-bold">☕</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Panel de Control</h2>
                <p className="text-xs text-gray-500">
                  {perfil?.rol === 'admin' ? 'Administrador' :
                  perfil?.rol === 'coord_superior' ? 'Coordinador de Educación Superior' :
                  perfil?.rol === 'coord_pedagogico' ? 'Coordinador Pedagógico' :
                  perfil?.rol === 'asistente_admin' ? 'Asistente Administrativo' :
                  perfil?.rol === 'padrino' ? 'Padrino' :
                  'Sin rol'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setColapsado(!colapsado)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
              title="Colapsar menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : (
        <div className="flex items-center justify-center space-x-1">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">☕</span>
          </div>
          <button
            onClick={() => setColapsado(!colapsado)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
            title="Expandir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
      </div>
      
      <nav className="p-2 space-y-4">
        {menuPadrino.some(item => item.visible) && (
          <div>
            {!colapsado && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">📋 Mi Gestión</p>
            )}
            <div className="space-y-1 mt-1">
              {menuPadrino.filter(item => item.visible).map(item => renderMenuItem(item, false))}
            </div>
          </div>
        )}
        
        {menuAdmin.some(item => item.visible) && (
          <div>
            {!colapsado && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">⚙️ Administración</p>
            )}
            <div className="space-y-1 mt-1">
              {menuAdmin.filter(item => item.visible).map(item => renderMenuItem(item, true))}
            </div>
          </div>
        )}
      </nav>
      
      <div className={`absolute bottom-0 ${colapsado ? 'w-20' : 'w-72'} p-4 border-t border-gray-200 bg-gray-50 transition-all duration-300`}>
        {!colapsado ? (
          <div className="text-xs text-gray-500 text-center">
            <p>Comité de Cafeteros de Caldas</p>
            <p className="mt-1">v2.1.0</p>
          </div>
        ) : (
          <div className="text-xs text-gray-400 text-center">v2.1</div>
        )}
      </div>
    </div>
  );
}