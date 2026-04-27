// =============================================
// HOOK: useEstudiantes - Lógica de Estudiantes
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';

export function useEstudiantes(grupoSeleccionado) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar estudiantes del grupo seleccionado
  const cargarEstudiantes = useCallback(async () => {
    if (!grupoSeleccionado) {
      setEstudiantes([]);
      return;
    }
    
    setCargando(true);
    
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('grupo_id', grupoSeleccionado.id)
      .order('nombre_completo');
    
    if (error) {
      console.error('❌ Error cargando estudiantes:', error.message);
    } else {
      setEstudiantes(data || []);
    }
    
    setCargando(false);
    return data;
  }, [grupoSeleccionado]);

  // Importar estudiantes desde Excel
  const importarDesdeExcel = async (archivoExcel) => {
    if (!archivoExcel || !grupoSeleccionado) {
      return { success: false, error: 'Falta archivo o grupo' };
    }
    
    setCargando(true);
    
    try {
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onload = async (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          let insertados = 0;
          let errores = 0;
          
          for (const row of jsonData) {
            const estudiante = {
              nombre_completo: row.nombre_completo,
              documento: row.documento?.toString(),
              genero: row.genero,
              telefono: row.telefono?.toString(),
              correo: row.correo,
              acudiente_nombre: row.acudiente_nombre,
              acudiente_telefono: row.acudiente_telefono?.toString(),
              municipio: row.municipio,
              institucion_educativa: row.institucion_educativa,
              cohorte: grupoSeleccionado.cohorte,
              programa: grupoSeleccionado.programa,
              universidad: grupoSeleccionado.universidad,
              grupo_id: grupoSeleccionado.id,
              estado: 'Activo',
              total_faltas: 0
            };
            
            if (!estudiante.nombre_completo || !estudiante.municipio || !estudiante.institucion_educativa) {
              errores++;
              continue;
            }
            
            const { error } = await supabase
              .from('estudiantes')
              .upsert([estudiante], { 
                onConflict: 'documento',
                ignoreDuplicates: false 
              });
            
            if (error) {
              errores++;
            } else {
              insertados++;
            }
          }
          
          await cargarEstudiantes();
          setCargando(false);
          
          resolve({ 
            success: true, 
            insertados, 
            errores 
          });
        };
        
        reader.readAsArrayBuffer(archivoExcel);
      });
    } catch (error) {
      setCargando(false);
      return { success: false, error: error.message };
    }
  };

  // Agregar un estudiante individual
  const agregarEstudiante = async (datos) => {
    const { data, error } = await supabase
      .from('estudiantes')
      .insert([datos])
      .select()
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    await cargarEstudiantes();
    return { success: true, data };
  };

  // Actualizar estudiante
  const actualizarEstudiante = async (id, datos) => {
    const { error } = await supabase
      .from('estudiantes')
      .update(datos)
      .eq('id', id);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    await cargarEstudiantes();
    return { success: true };
  };

  // Cambiar estado del estudiante
  const cambiarEstado = async (id, nuevoEstado) => {
    return actualizarEstudiante(id, { estado: nuevoEstado });
  };

  // Obtener un estudiante por ID
  const obtenerEstudiante = async (id) => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Error obteniendo estudiante:', error.message);
      return null;
    }
    
    return data;
  };

  // Efecto: recargar cuando cambia el grupo
  useEffect(() => {
    cargarEstudiantes();
  }, [cargarEstudiantes]);

  return {
    estudiantes,
    cargando,
    cargarEstudiantes,
    importarDesdeExcel,
    agregarEstudiante,
    actualizarEstudiante,
    cambiarEstado,
    obtenerEstudiante
  };
}