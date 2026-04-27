// =============================================
// BARRA SUPERIOR (CON SOPORTE PARA UNIVERSIDAD)
// =============================================

import { useAuth } from '../../context/AuthContext';
import BuscadorGlobal from './BuscadorGlobal';

export default function Header({ onVerPerfil }) {
  const { perfil, tipoUsuario, signOut } = useAuth();

  if (!perfil) return null;

  const esUniversidad = tipoUsuario === 'universidad';

  return (
    <header className="bg-gradient-to-r from-primary to-primary-dark border-b border-primary-dark/20 px-6 py-4 sticky top-0 z-10 shadow-md">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            {/* Logo: ☕ para padrinos, 🎓 para universidad */}
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
              <span className="text-primary text-2xl font-bold">
                {esUniversidad ? '🎓' : '☕'}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">La Universidad en el Campo</h1>
              <p className="text-sm text-warm-light/80">
                {esUniversidad ? perfil.universidad : 'Equipo de Padrinos'}
              </p>
            </div>
          </div>
          
          {!esUniversidad && onVerPerfil && <BuscadorGlobal onVerPerfil={onVerPerfil} />}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {perfil.nombre_completo?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="text-sm font-medium text-white">{perfil.nombre_completo}</span>
          </div>
          <button 
            onClick={signOut}
            className="text-sm text-warm-light hover:text-white font-medium transition hover:bg-white/10 px-3 py-1.5 rounded-lg"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}