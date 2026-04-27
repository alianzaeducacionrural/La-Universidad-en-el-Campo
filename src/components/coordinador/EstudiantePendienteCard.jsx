// =============================================
// COMPONENTE: TARJETA DE ESTUDIANTE PENDIENTE (CORREGIDO)
// =============================================

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha, getEstadoColor } from '../../utils/helpers';

export default function EstudiantePendienteCard({ estudiante, onSeguimiento, onVerPerfil }) {
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [datosCompletos, setDatosCompletos] = useState(null);

  const handleVerPerfil = async () => {
    setCargandoPerfil(true);
    
    const { data: estudianteCompleto } = await supabase
      .from('estudiantes')
      .select(`
        id, nombre_completo, documento, genero, telefono, correo,
        acudiente_nombre, acudiente_telefono, municipio, institucion_educativa,
        cohorte, programa, universidad, estado, total_faltas, grupo_id
      `)
      .eq('id', estudiante.estudiante_id)
      .single();
    
    setCargandoPerfil(false);
    
    if (estudianteCompleto) {
      setDatosCompletos(estudianteCompleto);
      onVerPerfil(estudianteCompleto);
    }
  };

  const estadoEstudiante = datosCompletos?.estado || estudiante.estado || 'Activo';
  const generoEstudiante = datosCompletos?.genero || estudiante.genero || 'Otro';
  
  const getIconoGenero = (genero) => {
    const iconos = {
      'Masculino': { icono: '👨', color: 'from-blue-100 to-blue-200' },
      'Femenino': { icono: '👩', color: 'from-pink-100 to-pink-200' },
      'Otro': { icono: '👤', color: 'from-purple-100 to-purple-200' }
    };
    return iconos[genero] || { icono: '👤', color: 'from-gray-100 to-gray-200' };
  };

  const estiloIcono = getIconoGenero(generoEstudiante);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-gray-300">
      {/* Fila superior: Nombre y Estado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* ÍCONO GENERAL (MISMO PARA TODOS) */}
          <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm">👤</span>
          </div>
          <p className="font-semibold text-gray-800">{estudiante.nombre_completo}</p>
        </div>
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getEstadoColor(estadoEstudiante)}`}>
          {estadoEstudiante}
        </span>
      </div>
      
      {/* Fila de Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-amber-200">
          <span className="mr-1">📅</span>
          {formatearFecha(estudiante.fecha_inasistencia)}
        </span>
        <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-blue-200">
          <span className="mr-1">📚</span>
          {estudiante.modulo}
        </span>
        <span className="inline-flex items-center bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-green-200">
          <span className="mr-1">📍</span>
          {estudiante.municipio}
        </span>
        <span className="inline-flex items-center bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-purple-200">
          <span className="mr-1">🏫</span>
          {estudiante.institucion_educativa}
        </span>
      </div>
      
      {/* 🔥 SOLO BOTÓN VER PERFIL (CORPORATIVO) */}
      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-gray-100">
        <button
          onClick={handleVerPerfil}
          disabled={cargandoPerfil}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
        >
          👁️ Ver Perfil
        </button>
      </div>
    </div>
  );
}