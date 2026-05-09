import { useAuth } from '../../context/AuthContext';
import BuscadorGlobal from './BuscadorGlobal';

export default function Header({ onVerPerfil }) {
  const { perfil, tipoUsuario, signOut } = useAuth();

  if (!perfil) return null;

  const esUniversidad = tipoUsuario === 'universidad';

  return (
    <header className="bg-gradient-to-r from-primary to-primary-dark border-b border-primary-dark/20 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10 shadow-md">
      <div className="flex items-center justify-between max-w-7xl mx-auto">

        {/* Izquierda: logo + título + buscador */}
        <div className="flex items-center space-x-3 md:space-x-6 min-w-0">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-primary text-xl font-bold">
                {esUniversidad ? '🎓' : '☕'}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white leading-tight truncate">
                <span className="hidden sm:inline text-xl">La Universidad en el Campo</span>
                <span className="sm:hidden text-base">U. en el Campo</span>
              </h1>
              <p className="text-xs text-white/70 hidden sm:block truncate">
                {esUniversidad ? perfil.universidad : 'Equipo de Padrinos'}
              </p>
            </div>
          </div>

          {!esUniversidad && onVerPerfil && (
            <div className="hidden md:block">
              <BuscadorGlobal onVerPerfil={onVerPerfil} />
            </div>
          )}
        </div>

        {/* Derecha: usuario + cerrar sesión */}
        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {perfil.nombre_completo?.charAt(0) || 'U'}
              </span>
            </div>
            <span className="text-sm font-medium text-white hidden lg:block">
              {perfil.nombre_completo}
            </span>
          </div>
          <button
            onClick={signOut}
            className="text-white/80 hover:text-white font-medium transition hover:bg-white/10 px-3 py-2 md:px-3 md:py-1.5 rounded-lg text-sm flex items-center space-x-1"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>

      </div>
    </header>
  );
}
