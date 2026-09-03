// =============================================
// BARRA LATERAL: PANEL DE COORDINADOR DE UNIVERSIDAD
// =============================================
// Separa lo que es "de un grupo puntual" (Grupos: asistencia, historial,
// notas, estudiantes del grupo, cronograma) de lo que es general de toda la
// universidad (Estadísticas, Reportes, Estudiantes) — antes ambos vivían en
// la misma barra de pestañas horizontal, lo que hacía parecer que
// Estadísticas/Reportes eran del grupo seleccionado cuando en realidad ya
// traían el dato completo de la universidad.
// Puramente CSS-responsive (sin hook de breakpoint): barra lateral fija en
// escritorio, barra horizontal desplazable en pantallas angostas — mismo
// patrón que ya usan las pestañas internas de este panel.

const SECCIONES = [
  { id: 'grupos', label: 'Grupos', icon: '📚' },
  { id: 'estadisticas', label: 'Estadísticas', icon: '📈' },
  { id: 'reportes', label: 'Reportes', icon: '📑' },
  { id: 'estudiantesUniversidad', label: 'Estudiantes', icon: '👥' },
  { id: 'seguimientosUniversidad', label: 'Seguimientos', icon: '📝' }
];

export default function SidebarUniversidad({ seccionActiva, setSeccionActiva, universidad }) {
  return (
    <>
      {/* Escritorio: barra lateral fija (no se desplaza con el scroll).
          sticky en vez de fixed: así respeta el flujo normal del documento y
          no se sobrepone a elementos que vengan antes en el DOM, como el
          banner de "Ver como..." del admin (VerComo.jsx). */}
      <div className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 sticky top-0 h-screen bg-white border-r border-gray-200 z-30">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white text-xl font-bold">☕</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{universidad}</p>
              <p className="text-xs text-gray-500">Panel de Coordinación</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {SECCIONES.map(s => {
            const activa = seccionActiva === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSeccionActiva(s.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                  activa
                    ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-l-4 border-primary shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className="text-xl flex-shrink-0">{s.icon}</span>
                <span className="font-medium text-sm">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Móvil / tablet: barra horizontal desplazable */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-20">
        <nav className="flex gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2">
          {SECCIONES.map(s => {
            const activa = seccionActiva === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSeccionActiva(s.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-full border transition ${
                  activa
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
