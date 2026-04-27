// =============================================
// COMPONENTE: SKELETON LOADER (PLACEHOLDER)
// =============================================

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ filas = 5, columnas = 4 }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex space-x-4">
          {Array.from({ length: columnas }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-24"></div>
          ))}
        </div>
      </div>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-100">
          <div className="flex space-x-4">
            {Array.from({ length: columnas }).map((_, j) => (
              <div key={j} className="h-3 bg-gray-200 rounded w-24"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrafico() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="h-48 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
}