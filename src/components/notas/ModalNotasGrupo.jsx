// =============================================
// MODAL: VER NOTAS DEL GRUPO
// =============================================

import NotasGrupoResumen from './NotasGrupoResumen';

export default function ModalNotasGrupo({ isOpen, onClose, grupo }) {
  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl my-6">
        {/* Cabecera */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">📊 Notas del Grupo</h3>
            <p className="text-sm text-gray-500 mt-0.5">{grupo.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Cuerpo: reutiliza NotasGrupoResumen sin su margen extra */}
        <div className="p-5">
          <NotasGrupoResumen grupo={grupo} modoModal />
        </div>
      </div>
    </div>
  );
}
