import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function useBreakpoint() {
  const getBreakpoint = () => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 1024) return 'mobile';
    if (w < 1280) return 'tablet';
    return 'desktop';
  };

  const [bp, setBp] = useState(getBreakpoint);

  useEffect(() => {
    const update = () => setBp(getBreakpoint());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}

export default function Sidebar({ vistaActiva, setVistaActiva, rol, totalPendientes = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { perfil } = useAuth();
  const bp = useBreakpoint();
  const [colapsado, setColapsado] = useState(false);
  const [masVisible, setMasVisible] = useState(false);
  const masRef = useRef(null);

  useEffect(() => {
    if (!masVisible) return;
    function handleClick(e) {
      if (masRef.current && !masRef.current.contains(e.target)) setMasVisible(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('touchstart', handleClick); };
  }, [masVisible]);

  // Tablet: siempre colapsado. Desktop: el usuario puede togglear.
  const isCollapsed = bp === 'tablet' || (bp === 'desktop' && colapsado);

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
    { id: 'grupos',        label: 'Mis Grupos',               mobileLabel: 'Grupos',   icon: '📋', visible: esPadrino,  badge: 0,              action: () => handleMiGestionClick('grupos') },
    { id: 'inasistencias', label: 'Inasistencias Pendientes', mobileLabel: 'Faltas',   icon: '⚠️', visible: esPadrino,  badge: totalPendientes, action: () => handleMiGestionClick('inasistencias') },
    { id: 'seguimientos',  label: 'Seguimientos Recientes',   mobileLabel: 'Seguim.',  icon: '📝', visible: esPadrino,  badge: 0,              action: () => handleMiGestionClick('seguimientos') },
  ];

  const menuAdmin = [
    { id: 'panel',       label: 'Panel de Control', mobileLabel: 'Panel',    icon: '📊', visible: esCoordinador, badge: 0, action: () => navigate('/panel') },
    { id: 'estadisticas',label: 'Estadísticas',     mobileLabel: 'Stats',    icon: '📈', visible: esCoordinador, badge: 0, action: () => navigate('/estadisticas') },
    { id: 'reportes',    label: 'Reportes',          mobileLabel: 'Reportes', icon: '📑', visible: esCoordinador, badge: 0, action: () => navigate('/reportes') },
    { id: 'grupos-admin',label: 'Grupos',            mobileLabel: 'Grupos',   icon: '📚', visible: esCoordinador, badge: 0, action: () => navigate('/grupos') },
    { id: 'multas',      label: 'Multas',            mobileLabel: 'Multas',   icon: '💰', visible: esCoordinador, badge: 0, action: () => navigate('/multas') },
  ];

  const allVisibleItems = [...menuPadrino, ...menuAdmin].filter(i => i.visible);

  // ─── MÓVIL: barra de navegación inferior fija ─────────────────────────────
  if (bp === 'mobile') {
    const MAX_VISIBLE = 4;
    const hasMas = allVisibleItems.length > MAX_VISIBLE;
    const mainItems = hasMas ? allVisibleItems.slice(0, MAX_VISIBLE) : allVisibleItems;
    const extraItems = hasMas ? allVisibleItems.slice(MAX_VISIBLE) : [];
    const anyExtraActive = extraItems.some(i => activeId === i.id);

    return (
      <div ref={masRef}>
        {/* Menú desplegable "Más" */}
        {masVisible && (
          <div className="fixed bottom-16 left-0 right-0 z-50 px-3 pb-2" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Más opciones</p>
              </div>
              {extraItems.map(item => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setMasVisible(false); item.action(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-stretch justify-around px-1 py-1">
            {mainItems.map(item => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMasVisible(false); item.action(); }}
                  className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                    isActive ? 'text-primary' : 'text-gray-500 active:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl leading-none">{item.icon}</span>
                  <span className={`text-[10px] mt-0.5 font-medium leading-tight ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                    {item.mobileLabel}
                  </span>
                  {item.badge > 0 && (
                    <span className="absolute top-1 right-[calc(50%-18px)] bg-red-500 text-white text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {hasMas && (
              <button
                onClick={() => setMasVisible(v => !v)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                  masVisible || anyExtraActive ? 'text-primary' : 'text-gray-500 active:bg-gray-100'
                }`}
              >
                <span className="text-2xl leading-none">{masVisible ? '✕' : '⋯'}</span>
                <span className={`text-[10px] mt-0.5 font-medium leading-tight ${masVisible || anyExtraActive ? 'text-primary' : 'text-gray-500'}`}>
                  Más
                </span>
                {anyExtraActive && !masVisible && (
                  <span className="absolute top-1 right-[calc(50%-18px)] bg-primary w-2 h-2 rounded-full" />
                )}
              </button>
            )}
          </div>
        </nav>
      </div>
    );
  }

  // ─── TABLET / DESKTOP: barra lateral ──────────────────────────────────────
  const renderMenuItem = (item, isAdmin = false) => {
    const isActive = activeId === item.id;
    return (
      <button
        key={item.id}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.action(); }}
        className={`relative w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center ${
          isCollapsed ? 'justify-center' : 'space-x-3'
        } ${
          isActive
            ? isAdmin
              ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-l-4 border-purple-600 shadow-sm'
              : 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-l-4 border-primary shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
        }`}
        title={isCollapsed ? item.label : ''}
      >
        <span className="text-xl flex-shrink-0">{item.icon}</span>
        {!isCollapsed && (
          <>
            <span className="font-medium text-sm flex-1">{item.label}</span>
            {item.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
        {isCollapsed && item.badge > 0 && (
          <span className="absolute top-0 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto transition-all duration-300 flex-shrink-0 ${
      isCollapsed ? 'w-16' : 'w-72'
    }`}>
      {/* Cabecera */}
      <div className={`p-4 border-b border-gray-200 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-bold">☕</span>
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Panel de Control</h2>
                <p className="text-xs text-gray-500">
                  {perfil?.rol === 'admin'           ? 'Administrador'        :
                   perfil?.rol === 'coord_superior'  ? 'Coordinador Superior' :
                   perfil?.rol === 'coord_pedagogico'? 'Coord. Pedagógico'    :
                   perfil?.rol === 'asistente_admin' ? 'Asistente Admin'      :
                   perfil?.rol === 'padrino'         ? 'Padrino'              : 'Sin rol'}
                </p>
              </div>
            </div>
            {bp === 'desktop' && (
              <button
                onClick={() => setColapsado(!colapsado)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
                title="Colapsar menú"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">☕</span>
            </div>
            {bp === 'desktop' && (
              <button
                onClick={() => setColapsado(!colapsado)}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-500"
                title="Expandir menú"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Menú */}
      <nav className="p-2 space-y-4">
        {menuPadrino.some(item => item.visible) && (
          <div>
            {!isCollapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">📋 Mi Gestión</p>
            )}
            <div className="space-y-1 mt-1">
              {menuPadrino.filter(item => item.visible).map(item => renderMenuItem(item, false))}
            </div>
          </div>
        )}

        {menuAdmin.some(item => item.visible) && (
          <div>
            {!isCollapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">⚙️ Administración</p>
            )}
            <div className="space-y-1 mt-1">
              {menuAdmin.filter(item => item.visible).map(item => renderMenuItem(item, true))}
            </div>
          </div>
        )}
      </nav>

      {/* Pie */}
      <div className={`absolute bottom-0 ${isCollapsed ? 'w-16' : 'w-72'} p-3 border-t border-gray-200 bg-gray-50 transition-all duration-300`}>
        {!isCollapsed ? (
          <div className="text-xs text-gray-500 text-center">
            <p>Comité de Cafeteros de Caldas</p>
            <p className="mt-1">v2.1.0</p>
          </div>
        ) : (
          <div className="text-[10px] text-gray-400 text-center">v2.1</div>
        )}
      </div>
    </div>
  );
}
