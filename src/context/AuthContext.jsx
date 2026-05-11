// =============================================
// CONTEXTO DE AUTENTICACIÓN (CORREGIDO - setUser añadido)
// =============================================

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [tipoUsuario, setTipoUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isInitialized = useRef(false);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        cargarPerfil(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (currentUserIdRef.current === session.user.id) return;
        setUser(session.user);
        cargarPerfil(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPerfil(null);
        setTipoUsuario(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function cargarPerfil(authUser) {
    currentUserIdRef.current = authUser.id;
    setUser(authUser);

    try {
      const { data: padrino } = await supabase
        .from('padrinos')
        .select('*')
        .eq('auth_id', authUser.id)
        .maybeSingle();

      if (padrino) {
        setPerfil(padrino);
        setTipoUsuario('padrino');
        setLoading(false);
        return;
      }

      const { data: universidad } = await supabase
        .from('usuarios_universidad')
        .select('*')
        .eq('auth_id', authUser.id)
        .maybeSingle();

      if (universidad) {
        setPerfil(universidad);
        setTipoUsuario('universidad');
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setLoading(false);
    } catch (error) {
      console.error('Error cargando perfil:', error.message);
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      throw error;
    }
    
    if (data?.user) {
      await cargarPerfil(data.user);
    }
    
    return data;
  }

  async function signOut() {
    setUser(null);
    setPerfil(null);
    setTipoUsuario(null);
    await supabase.auth.signOut();
    setLoading(false);
  }

  const value = { user, perfil, tipoUsuario, loading, signIn, signOut };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}