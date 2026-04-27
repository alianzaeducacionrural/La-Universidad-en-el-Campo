// =============================================
// MODAL DE CONFIRMACIÓN (Reemplaza confirm())
// =============================================

export default function ModalConfirmacion({ 
  isOpen, 
  onClose, 
  onConfirm, 
  titulo = '¿Estás seguro?', 
  mensaje = 'Esta acción no se puede deshacer.',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  tipo = 'warning'
}) {
  if (!isOpen) return null;

  const colores = {
    warning: 'bg-amber-500 hover:bg-amber-600',
    danger: 'bg-red-600 hover:bg-red-700',
    info: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700'
  };

  const iconos = {
    warning: '⚠️',
    danger: '🚨',
    info: 'ℹ️',
    success: '✅'
  };

  const fondos = {
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${fondos[tipo]}`}>
              <span className="text-2xl">{iconos[tipo]}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">{titulo}</h3>
          </div>
          <p className="text-gray-600 mb-6">{mensaje}</p>
          <div className="flex justify-end space-x-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              {textoCancelar}
            </button>
            <button 
              onClick={() => { 
                onConfirm(); 
                onClose(); 
              }} 
              className={`${colores[tipo]} text-white px-6 py-2 rounded-lg transition shadow-sm`}
            >
              {textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}