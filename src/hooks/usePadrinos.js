// =============================================
// HOOK: usePadrinos - Lógica de Padrinos
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePadrinos() {
  const [padrinos, setPadrinos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargarPadrinos = async () => {
    setCargando(true);
    
    const { data } = await supabase
      .from('padrinos')
      .select('*')
      .eq('activo', true)
      .order('nombre_completo');
    
    if (data) setPadrinos(data);
    setCargando(false);
    
    return data;
  };

  const crearPadrino = async (datos) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: datos.correo,
        password: datos.password,
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('No se pudo crear el usuario de autenticación');

      const { data, error } = await supabase
        .from('padrinos')
        .insert([{
          auth_id: authData.user.id,
          nombre_completo: datos.nombre_completo,
          correo: datos.correo,
          telefono: datos.telefono || null,
          rol: 'padrino',
          activo: true,
        }])
        .select()
        .single();

      if (error) throw error;

      await cargarPadrinos();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const eliminarPadrino = async (id, nombre) => {
    try {
      const { count: grupoCount } = await supabase
        .from('grupo_padrino')
        .select('*', { count: 'exact', head: true })
        .eq('padrino_id', id);

      if (grupoCount > 0) {
        return {
          success: false,
          error: `No se puede eliminar "${nombre}" porque tiene ${grupoCount} grupo(s) asignado(s).`
        };
      }

      const { error } = await supabase.from('padrinos').update({ activo: false }).eq('id', id);

      if (error) throw error;

      await cargarPadrinos();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    cargarPadrinos();
  }, []);

  return {
    padrinos,
    cargando,
    cargarPadrinos,
    crearPadrino,
    eliminarPadrino
  };
}