// =============================================
// HOOK: useSeguimientos - SOLO GRUPOS ASIGNADOS
// =============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSeguimientos(padrino, gruposAsignados) {
  const [seguimientos, setSeguimientos] = useState([]);
  const [historialEstudiante, setHistorialEstudiante] = useState([]);
  const [cargando, setCargando] = useState(false);

  // 🔥 Cargar seguimientos SOLO de los grupos asignados al padrino
  const cargarSeguimientos = useCallback(async () => {
    if (!padrino) return;
    
    // Obtener IDs de los grupos asignados
    const gruposIds = gruposAsignados.map(g => g.id);
    
    if (gruposIds.length === 0) {
      setSeguimientos([]);
      return;
    }
    
    // Obtener IDs de estudiantes de esos grupos
    const { data: estudiantesData } = await supabase
      .from('estudiantes')
      .select('id')
      .in('grupo_id', gruposIds);
    
    const estudiantesIds = estudiantesData?.map(e => e.id) || [];
    
    if (estudiantesIds.length === 0) {
      setSeguimientos([]);
      return;
    }
    
    // Cargar seguimientos de esos estudiantes
    const { data } = await supabase
      .from('seguimientos')
      .select(`
        *,
        estudiante:estudiante_id (
          id, nombre_completo, documento, telefono, correo, municipio,
          institucion_educativa, universidad, programa, cohorte, estado,
          total_faltas, acudiente_nombre, acudiente_telefono, grupo_id
        ),
        padrino:padrino_id (id, nombre_completo)
      `)
      .in('estudiante_id', estudiantesIds)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setSeguimientos(data);
    return data;
  }, [padrino, gruposAsignados]);

  const cargarHistorial = async (estudianteId) => {
    setCargando(true);
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, padrino:padrino_id (id, nombre_completo)`)
      .eq('estudiante_id', estudianteId)
      .order('fecha_contacto', { ascending: false });
    
    if (data) setHistorialEstudiante(data);
    setCargando(false);
    return data;
  };

  const registrarSeguimiento = async (datos) => {
    const { data, error } = await supabase
      .from('seguimientos')
      .insert([datos])
      .select()
      .single();
    
    if (error) return { success: false, error: error.message };
    await cargarSeguimientos();
    return { success: true, data };
  };

  const actualizarSeguimiento = async (id, datos) => {
    const { error } = await supabase
      .from('seguimientos')
      .update(datos)
      .eq('id', id);
    
    if (error) return { success: false, error: error.message };
    await cargarSeguimientos();
    return { success: true };
  };

  useEffect(() => {
    if (padrino && gruposAsignados.length > 0) {
      cargarSeguimientos();
    }
  }, [padrino?.id, gruposAsignados.length]);

  return {
    seguimientos,
    historialEstudiante,
    cargando,
    cargarSeguimientos,
    cargarHistorial,
    registrarSeguimiento,
    actualizarSeguimiento,
    setHistorialEstudiante
  };
}