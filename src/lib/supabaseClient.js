// =============================================
// CLIENTE DE SUPABASE (CON PERSISTENCIA)
// =============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Configurando Supabase...');
console.log('URL:', supabaseUrl ? '✅' : '❌');
console.log('KEY:', supabaseAnonKey ? '✅' : '❌');

// Crear cliente con configuración de persistencia
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'supabase.auth.token',      // Clave en localStorage
    storage: window.localStorage,            // Usar localStorage (no sessionStorage)
    autoRefreshToken: true,                  // Refrescar token automáticamente
    persistSession: true,                    // PERSISTIR SESIÓN (esto es clave)
    detectSessionInUrl: true                 // Detectar sesión en URL (OAuth)
  }
});

console.log('✅ Cliente Supabase inicializado con persistencia');

// =============================================
// CLIENTE TEMPORAL (SIN PERSISTENCIA)
// Se usa para crear usuarios con auth.signUp sin sobrescribir la sesión
// del administrador que está logueado en el cliente principal.
// =============================================
export function crearClienteTemporal() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}