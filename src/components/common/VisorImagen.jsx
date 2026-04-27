// =============================================
// COMPONENTE: VISOR DE IMAGEN (LIGHTBOX)
// =============================================

export default function VisorImagen({ url, onClose }) {
  if (!url) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-[90vh]">
        <img 
          src={url} 
          alt="Vista ampliada" 
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
        <button 
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 text-3xl transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}