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