// =============================================
// COMPONENTE: CHIPS DE PROGRESO DEL PROCESO DE DESERCIÓN
// =============================================
// Recibe el array ya calculado por calcularPasosDesercion(). Verde = completado,
// ámbar = pendiente y requiere acción del equipo (paso manual), gris = pendiente,
// solo falta que llegue un documento (paso automático).

function colorPaso(paso) {
  if (paso.completado) return 'bg-green-100 text-green-700 border-green-300';
  if (paso.tipo === 'manual') return 'bg-amber-100 text-amber-700 border-amber-300';
  return 'bg-gray-100 text-gray-500 border-gray-300';
}

function colorPunto(paso) {
  if (paso.completado) return 'bg-green-500';
  if (paso.tipo === 'manual') return 'bg-amber-500';
  return 'bg-gray-300';
}

export default function PasosDesercion({ pasos, compacto = false }) {
  if (!pasos || pasos.length === 0) {
    return compacto
      ? <span className="text-gray-300">—</span>
      : <p className="text-sm text-gray-400">Sin proceso formal registrado</p>;
  }

  if (compacto) {
    return (
      <div className="flex items-center gap-1">
        {pasos.map(paso => (
          <span
            key={paso.key}
            title={`${paso.completado ? '✅' : paso.tipo === 'manual' ? '🟠' : '⚪'} ${paso.label}`}
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorPunto(paso)}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pasos.map(paso => (
        <span
          key={paso.key}
          className={`text-xs px-2.5 py-1 rounded-full font-medium border ${colorPaso(paso)}`}
        >
          {paso.completado ? '✅' : paso.tipo === 'manual' ? '🟠' : '⚪'} {paso.label}
        </span>
      ))}
    </div>
  );
}
