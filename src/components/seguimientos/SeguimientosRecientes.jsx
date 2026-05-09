// =============================================
// COMPONENTE: Lista de Seguimientos Recientes (CON EMPTY STATE)
// =============================================

import { useState } from 'react';
import { formatearFecha } from '../../utils/helpers';
import VisorImagen from '../common/VisorImagen';
import EmptyState from '../common/EmptyState';

export default function SeguimientosRecientes({ 
  seguimientos,
  onEditarSeguimiento,
  onVerPerfil
}) {
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  if (seguimientos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <EmptyState 
          icono="📝"
          titulo="No hay seguimientos"
          descripcion="Aún no se han registrado seguimientos en tus grupos asignados"
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-4">
          {seguimientos.map((seg) => (
            <div 
              key={seg.id} 
              className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition bg-white relative"
            >
              {/* Botón de editar - SIEMPRE VISIBLE PARA TODOS */}
              <button
                onClick={() => onEditarSeguimiento(seg)}
                className="absolute top-3 right-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition p-2 bg-white rounded-full shadow-sm border border-gray-200 z-10"
                title="Editar seguimiento"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>

              {/* Encabezado */}
              <div className="flex justify-between items-start mb-3 pr-10">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-base mb-2">
                    {seg.estudiante?.nombre_completo || 'Estudiante'}
                  </h3>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                      🏫 {seg.estudiante?.institucion_educativa || 'N/A'}
                    </span>
                    <span className="text-sm bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                      📍 {seg.estudiante?.municipio || 'N/A'}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                  {formatearFecha(seg.fecha_contacto)}
                </span>
              </div>
              
              {/* Tipo y causa */}
              <div className="mb-3 flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">
                  {seg.tipo_gestion}
                </span>
                {seg.causa_ausencia && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {seg.causa_ausencia}
                  </span>
                )}
              </div>
              
              {/* Resultado */}
              <p className="text-gray-700 text-sm mb-3 bg-gray-50 p-3 rounded-lg">
                {seg.resultado}
              </p>
              
              {/* Evidencias */}
              {seg.evidencias && seg.evidencias.length > 0 && (
                <div className="mt-3 mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">📸 Evidencias:</p>
                  <div className="flex flex-wrap gap-2">
                    {seg.evidencias.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setImagenSeleccionada(url)}
                        className="block w-16 h-16 rounded-lg border border-gray-200 overflow-hidden hover:border-green-400 transition cursor-pointer"
                      >
                        <img 
                          src={url} 
                          alt={`Evidencia ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pie con padrino y botón Ver Perfil */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400 flex items-center">
                  <span className="mr-1">👤</span>
                  Registrado por: {seg.padrino?.nombre_completo || 'Sistema'}
                </p>
                
                {/* Botón Ver Perfil */}
                <button
                  onClick={() => onVerPerfil(seg.estudiante)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1 border border-indigo-200 shadow-sm"
                  title="Ver perfil completo del estudiante"
                >
                  <span>👤</span>
                  <span>Ver Perfil</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {imagenSeleccionada && (
        <VisorImagen url={imagenSeleccionada} onClose={() => setImagenSeleccionada(null)} />
      )}
    </>
  );
}