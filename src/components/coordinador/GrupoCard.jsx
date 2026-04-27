// =============================================
// COMPONENTE: TARJETA DE GRUPO (DISEÑO MEJORADO)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import EstudiantePendienteCard from './EstudiantePendienteCard';

export default function GrupoCard({ grupo, expandido, onToggle, onSeguimiento, onVerPerfil }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);

  useEffect(() => {
    if (expandido && !datosCargados) {
      cargarEstudiantes();
    }
  }, [expandido, datosCargados]);

  async function cargarEstudiantes() {
    setCargando(true);
    
    const { data } = await supabase
      .from('vista_estudiantes_pendientes_grupo')
      .select('*')
      .eq('grupo_id', grupo.grupo_id)
      .order('fecha_inasistencia', { ascending: false });
    
    if (data) setEstudiantes(data);
    setDatosCargados(true);
    setCargando(false);
  }

  const tienePendientes = grupo.total_pendientes > 0;

  return (
    <div className="pl-8">
      {/* Cabecera del Grupo */}
      <div 
        onClick={onToggle}
        className={`p-4 cursor-pointer hover:bg-gray-100 transition rounded-lg ${expandido ? 'bg-amber-50/50' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-lg">
              {expandido ? '▼' : '▶'}
            </span>
            <div className="flex-1">
              <h5 className="font-medium text-gray-800">{grupo.grupo_nombre}</h5>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  🎓 {grupo.universidad}
                </span>
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  📚 {grupo.programa}
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  👥 {grupo.total_estudiantes} estudiantes
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  📅 Cohorte {grupo.cohorte}
                </span>
              </div>
            </div>
          </div>
          
          {/* Indicador de pendientes */}
          <div className="flex items-center space-x-3">
            <div className={`rounded-lg px-3 py-1.5 text-center min-w-[80px] ${
              tienePendientes ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <p className={`text-xl font-bold ${
                tienePendientes ? 'text-amber-700' : 'text-green-700'
              }`}>
                {grupo.total_pendientes}
              </p>
              <p className={`text-xs ${
                tienePendientes ? 'text-amber-600' : 'text-green-600'
              }`}>
                pendientes
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenido expandido: Estudiantes */}
      {expandido && (
        <div className="ml-8 mt-3 mb-4">
          {cargando ? (
            <div className="p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
              <p className="text-gray-500 text-sm mt-2">Cargando estudiantes...</p>
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="p-6 text-center text-gray-500 bg-green-50 rounded-lg border border-green-200">
              <span className="text-2xl mr-2">✅</span>
              No hay estudiantes pendientes por realizar seguimiento en este grupo
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-600">
                📋 {estudiantes.length} estudiante(s) con inasistencias sin seguimiento:
              </p>
              {estudiantes.map(estudiante => (
                <EstudiantePendienteCard
                  key={estudiante.estudiante_id}
                  estudiante={estudiante}
                  onSeguimiento={onSeguimiento}
                  onVerPerfil={onVerPerfil}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}