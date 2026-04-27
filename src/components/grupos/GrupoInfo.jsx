// =============================================
// COMPONENTE: Tarjeta de Información del Grupo (REDISEÑO FINAL)
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { exportarEstudiantesExcel } from '../../utils/exportUtils';
import ModalWhatsAppGrupos from './ModalWhatsAppGrupos';
import ModalRegistrarAccion from './ModalRegistrarAccion';
import ModalHistorialAcciones from './ModalHistorialAcciones';

export default function GrupoInfo({ 
  grupo, 
  totalEstudiantes,
  estudiantes,
  onVerHistorialAsistencia,
  padrino
}) {
  const [enlaces, setEnlaces] = useState({ estudiantes: null, acudientes: null });
  const [modalWhatsApp, setModalWhatsApp] = useState(false);
  const [modalRegistrarAccion, setModalRegistrarAccion] = useState(false);
  const [modalAcciones, setModalAcciones] = useState(false);

  useEffect(() => {
    if (grupo) cargarEnlaces();
  }, [grupo]);

  async function cargarEnlaces() {
    const { data } = await supabase
      .from('whatsapp_grupos')
      .select('*')
      .eq('grupo_id', grupo.id);
    
    if (data) {
      const est = data.find(e => e.tipo_grupo === 'estudiantes');
      const acu = data.find(e => e.tipo_grupo === 'acudientes');
      setEnlaces({
        estudiantes: est?.enlace || null,
        acudientes: acu?.enlace || null
      });
    }
  }

  if (!grupo) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
      {/* Fila 1: Nombre y botón Excel */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-lg">{grupo.nombre}</h3>
        {estudiantes && estudiantes.length > 0 && (
          <button 
            onClick={() => exportarEstudiantesExcel(estudiantes, grupo.nombre)}
            className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center space-x-1"
          >
            <span>📥</span>
            <span>Excel</span>
          </button>
        )}
      </div>

      {/* Fila 2: Tags de información */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-full border border-blue-100">
          🎓 {grupo.universidad}
        </span>
        <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-full border border-purple-100">
          📚 {grupo.programa}
        </span>
        <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-full border border-amber-100">
          📅 Cohorte {grupo.cohorte}
        </span>
        <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-full border border-gray-200">
          👥 {totalEstudiantes} estudiantes
        </span>
      </div>

      {/* Fila 3: Botones de acción (WhatsApp incluido) */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200">
        {padrino && (
          <>
            <button
              onClick={() => setModalRegistrarAccion(true)}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              ➕ Registrar Acción
            </button>
            <button
              onClick={() => setModalAcciones(true)}
              className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition border-2 border-gray-300 shadow-sm"
            >
              📋 Ver Acciones
            </button>
          </>
        )}

        {onVerHistorialAsistencia && (
          <button onClick={onVerHistorialAsistencia}
            className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition border-2 border-gray-300 shadow-sm"
          >
            📊 Historial Asistencia
          </button>
        )}
        
        {/* ENLACES DIRECTOS SI EXISTEN */}
        {enlaces.estudiantes && (
          <a href={enlaces.estudiantes} target="_blank" rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            💬 Grupo Estudiantes
          </a>
        )}
        {enlaces.acudientes && (
          <a href={enlaces.acudientes} target="_blank" rel="noopener noreferrer"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            👨‍👩‍👧 Grupo Acudientes
          </a>
        )}

        <button
          onClick={() => setModalWhatsApp(true)}
          className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition border-2 border-green-300 shadow-sm"
        >
          💬 Configurar WhatsApp
        </button>
      </div>

      {/* MODALES */}
      <ModalWhatsAppGrupos isOpen={modalWhatsApp} onClose={() => setModalWhatsApp(false)} grupo={grupo} padrino={padrino} />
      <ModalRegistrarAccion isOpen={modalRegistrarAccion} onClose={() => setModalRegistrarAccion(false)} grupo={grupo} padrino={padrino} onAccionRegistrada={() => setModalAcciones(false)} />
      <ModalHistorialAcciones isOpen={modalAcciones} onClose={() => setModalAcciones(false)} grupo={grupo} />
    </div>
  );
}