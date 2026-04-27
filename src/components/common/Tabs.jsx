// =============================================
// COMPONENTE: Pestañas de Navegación
// =============================================

export default function Tabs({ vistaActiva, setVistaActiva, totalEstudiantes }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8">
        <button 
          onClick={() => setVistaActiva('grupos')}
          className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
            vistaActiva === 'grupos' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Estudiantes ({totalEstudiantes})
        </button>
        <button 
          onClick={() => setVistaActiva('seguimientos')}
          className={`pb-3 px-1 font-medium text-sm border-b-2 transition ${
            vistaActiva === 'seguimientos' 
              ? 'border-green-600 text-green-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Seguimientos Recientes
        </button>
      </nav>
    </div>
  );
}