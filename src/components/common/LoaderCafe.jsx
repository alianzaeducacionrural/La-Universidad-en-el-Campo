// =============================================
// LOADER CON ÍCONO DE CAFÉ
// =============================================

export default function LoaderCafe({ mensaje = 'Cargando...', size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className={`relative ${sizes[size]}`}>
        {/* Taza de café animada */}
        <div className="animate-spin-slow">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-primary">
            <path d="M18 8H19C20.6569 8 22 9.34315 22 11C22 12.6569 20.6569 14 19 14H18" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M2 8H18V17C18 18.6569 16.6569 20 15 20H5C3.34315 20 2 18.6569 2 17V8Z" 
              stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1"/>
            <path d="M6 1V4M10 1V4M14 1V4" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Vapor animado */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex space-x-1">
          <div className="w-1 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-1 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-2 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
      {mensaje && (
        <p className="mt-4 text-sm text-gray-500 animate-pulse">{mensaje}</p>
      )}
    </div>
  );
}