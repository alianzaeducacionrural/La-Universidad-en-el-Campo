// =============================================
// COMPONENTE: Selector de Grupo (CORREGIDO)
// =============================================

export default function GrupoSelector({ 
  gruposAsignados, 
  grupoSeleccionado, 
  setGrupoSeleccionado
}) {
  // Si no hay grupos asignados
  if (gruposAsignados.length === 0) {
    return (
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-amber-700 text-sm">No tienes grupos asignados actualmente</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <label className="text-base font-medium text-gray-700 whitespace-nowrap">Grupo:</label>
          <select
            value={grupoSeleccionado?.id || ''}
            onChange={(e) => {
              const selected = gruposAsignados.find(g => g.id === e.target.value);
              setGrupoSeleccionado(selected);
            }}
            className="w-full max-w-2xl border border-gray-300 rounded-lg px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-base"
          >
            {gruposAsignados.map(g => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}