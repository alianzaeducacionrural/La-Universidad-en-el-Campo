// =============================================
// COMPONENTE: EMPTY STATE BONITO
// =============================================

export default function EmptyState({ 
  icono = '📭', 
  titulo = 'No hay datos', 
  descripcion = 'No se encontraron registros', 
  accion = null,
  textoAccion = ''
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="text-6xl mb-4 opacity-50">{icono}</div>
      <h3 className="text-lg font-medium text-gray-600 mb-2">{titulo}</h3>
      <p className="text-sm text-gray-400 text-center max-w-md mb-6">{descripcion}</p>
      {accion && (
        <button
          onClick={accion}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm"
        >
          {textoAccion}
        </button>
      )}
    </div>
  );
}