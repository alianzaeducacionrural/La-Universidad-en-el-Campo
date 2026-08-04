// =============================================
// COMPONENTE: ERROR BOUNDARY (RECUPERACIÓN DE FALLOS DE CARGA)
// =============================================
// Las rutas se cargan con React.lazy(). Cuando se publica un despliegue nuevo
// mientras alguien ya tiene la app abierta, los chunks JS viejos referenciados
// por esa pestaña dejan de existir en el servidor: el import() falla, Suspense
// no puede capturar ese rechazo, y sin este boundary React desmonta todo el
// árbol dejando la pantalla en blanco hasta que la persona recarga a mano.

import { Component } from 'react';

const PATRONES_ERROR_CHUNK = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /loading chunk .* failed/i,
  /dynamically imported module/i
];

function esErrorDeChunk(error) {
  const mensaje = error?.message || '';
  return PATRONES_ERROR_CHUNK.some(patron => patron.test(mensaje));
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (esErrorDeChunk(error)) {
      // Recargar una sola vez por sesión: si el problema persiste después de
      // recargar, no queremos entrar en un ciclo infinito de recargas.
      if (!sessionStorage.getItem('recarga_por_chunk_desactualizado')) {
        sessionStorage.setItem('recarga_por_chunk_desactualizado', '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (esErrorDeChunk(this.state.error)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">☕</div>
            <h2 className="text-xl font-bold text-primary-dark mb-2">La Universidad en el Campo</h2>
            <p className="text-gray-600">Actualizando la aplicación...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal</h2>
          <p className="text-gray-600 mb-4">Ocurrió un error inesperado. Intenta recargar la página.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium transition"
          >
            🔄 Recargar página
          </button>
        </div>
      </div>
    );
  }
}
