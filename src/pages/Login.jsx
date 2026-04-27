// =============================================
// LOGIN UNIFICADO (CON COLORES CORPORATIVOS)
// =============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, tipoUsuario, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (tipoUsuario === 'padrino') {
        navigate('/dashboard', { replace: true });
      } else if (tipoUsuario === 'universidad') {
        navigate('/universidad/dashboard', { replace: true });
      }
    }
  }, [user, tipoUsuario, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    
    try {
      await signIn(email, password);
    } catch (err) {
      setError('Correo o contraseña incorrectos');
    } finally {
      setLoggingIn(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-light to-white">
        <div className="text-center">
          <div className="text-4xl mb-4">☕</div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-warm-light to-primary-light/20 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-4xl">☕</span>
          </div>
          <h1 className="text-2xl font-bold text-primary-dark">La Universidad en el Campo</h1>
          <p className="text-gray-600 mt-1">Comité de Cafeteros de Caldas</p>
          <div className="w-16 h-0.5 bg-primary mx-auto mt-3 rounded-full"></div>
          <p className="text-xs text-gray-400 mt-2">Acceso para Padrinos y Universidades</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-slide-down">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
          >
            {loggingIn ? 'Verificando...' : 'Ingresar al Sistema'}
          </button>
        </form>
        
        <p className="text-xs text-gray-400 text-center mt-8">
          © 2026 - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}