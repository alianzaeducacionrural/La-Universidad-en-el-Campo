// =============================================
// SPINNER DE CARGA
// =============================================

import LoaderCafe from './LoaderCafe';

export default function LoadingSpinner({ mensaje = 'Cargando...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center">
      <div className="text-center">
        <LoaderCafe size="lg" />
        <h2 className="text-xl font-bold text-primary-dark mt-6 mb-2">La Universidad en el Campo</h2>
        <p className="text-gray-500">{mensaje}</p>
      </div>
    </div>
  );
}