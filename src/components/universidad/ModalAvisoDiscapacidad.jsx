// =============================================
// MODAL: AVISO DE DISCAPACIDAD / TRASTORNO
// =============================================
// Popup automático para el docente/coordinador universitario al entrar a un
// grupo que tiene estudiantes caracterizados con discapacidad o trastorno.
// Se muestra una vez por grupo por día calendario (ver helpers.js:
// debeMostrarAvisoDiscapacidad / registrarAvisoDiscapacidadMostrado).

export default function ModalAvisoDiscapacidad({ isOpen, onClose, estudiantes = [] }) {
  if (!isOpen || estudiantes.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold">¡Atención, tenlo en cuenta!</h2>
          <p className="text-sm text-white/90 mt-1">
            {estudiantes.length === 1
              ? 'Este grupo tiene un estudiante con necesidades especiales'
              : `Este grupo tiene ${estudiantes.length} estudiantes con necesidades especiales`}
          </p>
        </div>

        <div className="p-5 max-h-[50vh] overflow-y-auto space-y-3">
          {estudiantes.map(est => (
            <div key={est.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-gray-800 mb-1.5">{est.nombre_completo}</p>
              <div className="flex flex-wrap gap-2">
                {est.discapacidad_tipo && est.discapacidad_tipo !== 'NO APLICA' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    ♿ {est.discapacidad_tipo}
                  </span>
                )}
                {est.trastorno_tipo && est.trastorno_tipo !== 'NO APLICA' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800 border border-violet-300">
                    🧩 {est.trastorno_tipo}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-4 text-center">
            Por favor tenlo en cuenta para el proceso formativo de estos estudiantes.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-semibold transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
