// =============================================
// COMPONENTE: MODAL DE NOTIFICACIÓN ELEGANTE
// =============================================

import { useEffect } from 'react';

export default function NotificacionModal({ 
  isOpen, 
  onClose, 
  tipo = 'success', // 'success', 'error', 'warning', 'info'
  titulo,
  mensaje,
  duracion = 3000 
}) {
  useEffect(() => {
    if (isOpen && duracion > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duracion);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duracion, onClose]);

  if (!isOpen) return null;

  const configuracion = {
    success: {
      icono: '✅',
      colorFondo: 'bg-gradient-to-r from-green-50 to-emerald-50',
      colorBorde: 'border-green-200',
      colorIcono: 'bg-green-100 text-green-600',
      colorTitulo: 'text-green-800',
      colorMensaje: 'text-green-700'
    },
    error: {
      icono: '❌',
      colorFondo: 'bg-gradient-to-r from-red-50 to-rose-50',
      colorBorde: 'border-red-200',
      colorIcono: 'bg-red-100 text-red-600',
      colorTitulo: 'text-red-800',
      colorMensaje: 'text-red-700'
    },
    warning: {
      icono: '⚠️',
      colorFondo: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      colorBorde: 'border-amber-200',
      colorIcono: 'bg-amber-100 text-amber-600',
      colorTitulo: 'text-amber-800',
      colorMensaje: 'text-amber-700'
    },
    info: {
      icono: 'ℹ️',
      colorFondo: 'bg-gradient-to-r from-blue-50 to-cyan-50',
      colorBorde: 'border-blue-200',
      colorIcono: 'bg-blue-100 text-blue-600',
      colorTitulo: 'text-blue-800',
      colorMensaje: 'text-blue-700'
    }
  };

  const config = configuracion[tipo] || configuracion.info;
  
  const tituloDefault = {
    success: '¡Éxito!',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
  };

  const tituloFinal = titulo || tituloDefault[tipo];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 pointer-events-none">
      <div 
        className={`pointer-events-auto ${config.colorFondo} border ${config.colorBorde} rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 animate-in fade-in zoom-in`}
      >
        <div className="flex items-start space-x-4">
          <div className={`w-12 h-12 ${config.colorIcono} rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className="text-2xl">{config.icono}</span>
          </div>
          <div className="flex-1">
            <h4 className={`font-bold text-lg mb-1 ${config.colorTitulo}`}>{tituloFinal}</h4>
            <p className={`text-sm ${config.colorMensaje}`}>{mensaje}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}