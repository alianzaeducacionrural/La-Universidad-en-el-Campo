// =============================================
// HOOK: useGrupos - SOLO GRUPOS ASIGNADOS (CORREGIDO)
// =============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useGrupos(padrino) {
  const [grupos, setGrupos] = useState([]);
  const [gruposAsignados, setGruposAsignados] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  // 🔥 Usar ref para evitar bucles
  const inicializado = useRef(false);
  const padrinoAnterior = useRef(null);

  const cargarTodosGrupos = useCallback(async () => {
    const { data } = await supabase.from('grupos').select('*').order('nombre');
    if (data) setGrupos(data);
    return data;
  }, []);

  const cargarGruposDelPadrino = useCallback(async () => {
    if (!padrino) return;
    
    // 🔥 Evitar recarga si ya se cargaron los mismos grupos
    if (padrinoAnterior.current === padrino.id && inicializado.current) {
      return;
    }
    
    padrinoAnterior.current = padrino.id;
    inicializado.current = true;
    
    // Obtener grupos asignados al padrino
    const { data } = await supabase
      .from('grupo_padrino')
      .select(`grupo_id, grupos:grupo_id (*)`)
      .eq('padrino_id', padrino.id);
    
    if (data) {
      const gruposFiltrados = data
        .map(item => item.grupos)
        .filter(g => g !== null && g.activo === true);
      
      setGruposAsignados(gruposFiltrados);
      
      // Solo seleccionar el primer grupo si no hay uno seleccionado
      if (gruposFiltrados.length > 0) {
        setGrupoSeleccionado(prev => prev || gruposFiltrados[0]);
      } else {
        setGrupoSeleccionado(null);
      }
    }
  }, [padrino]);

  const crearGrupo = async (datosGrupo, padrinosSeleccionados) => {
    setCargando(true);
    try {
      const { data: grupoData, error: grupoError } = await supabase
        .from('grupos')
        .insert([datosGrupo])
        .select()
        .single();
      
      if (grupoError) throw grupoError;
      
      if (padrinosSeleccionados.length > 0) {
        const asignaciones = padrinosSeleccionados.map(padrinoId => ({
          grupo_id: grupoData.id,
          padrino_id: padrinoId
        }));
        await supabase.from('grupo_padrino').insert(asignaciones);
      }
      
      await cargarTodosGrupos();
      await cargarGruposDelPadrino();
      return { success: true, data: grupoData };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (padrino) {
      cargarGruposDelPadrino();
    }
  }, [padrino?.id]); // 🔥 Solo dependencia del ID del padrino

  return {
    grupos,
    gruposAsignados,
    grupoSeleccionado,
    setGrupoSeleccionado,
    cargando,
    cargarTodosGrupos,
    cargarGruposDelPadrino,
    crearGrupo
  };
}