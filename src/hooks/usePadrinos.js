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

  useEffect(() => {
    cargarPadrinos();
  }, []);

  return {
    padrinos,
    cargando,
    cargarPadrinos
  };
}