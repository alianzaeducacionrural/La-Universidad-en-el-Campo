// =============================================
// COMPONENTE: INASISTENCIAS PENDIENTES
// =============================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha } from '../../utils/helpers';
import EmptyState from '../common/EmptyState';
import ModalAsistenciaCompleta from './ModalAsistenciaCompleta';

export default function InasistenciasPendientes({ padrino, onSeguimiento, onVerPerfil, refresh = 0 }) {
  const [inasistencias, setInasistencias] = useState([]);
  const [reportesCompletos, setReportesCompletos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAsistencia, setModalAsistencia] = useState(null); // { registro, grupo }

  useEffect(() => {
    if (padrino) cargarDatos();
  }, [padrino?.id, refresh]);

  async function cargarDatos() {
    setCargando(true);

    const { data: gruposPadrino } = await supabase
      .from('grupo_padrino')
      .select('grupo_id')
      .eq('padrino_id', padrino.id);

    const gruposIds = gruposPadrino?.map(g => g.grupo_id) || [];

    if (gruposIds.length === 0) {
      setInasistencias([]);
      setReportesCompletos([]);
      setCargando(false);
      return;
    }

    // Cargar inasistencias pendientes + registros con asistencia completa en paralelo
    const [
      { data: inasistenciasData },
      { data: registros },
      { data: accionesAck }
    ] = await Promise.all([
      supabase
        .from('vista_inasistencias_pendientes')
        .select('*')
        .in('grupo_id', gruposIds)
        .order('fecha_inasistencia', { ascending: false }),
      supabase
        .from('registros_asistencia')
        .select('*, inasistencias(id), grupo:grupo_id(id, nombre, universidad, programa)')
        .in('grupo_id', gruposIds)
        .order('fecha', { ascending: false }),
      supabase
        .from('acciones_grupo')
        .select('observaciones')
        .in('grupo_id', gruposIds)
        .eq('tipo_accion', 'asistencia_completa')
    ]);

    // Hidratar inasistencias con datos del estudiante
    if (inasistenciasData) {
      const conEstudiante = await Promise.all(
        inasistenciasData.map(async (item) => {
          const { data: estudiante } = await supabase
            .from('estudiantes')
            .select('*')
            .eq('id', item.estudiante_id)
            .single();
          return { ...item, estudiante };
        })
      );
      setInasistencias(conEstudiante);
    }

    // Filtrar registros con asistencia completa no reconocidos
    if (registros) {
      const idsAck = new Set(accionesAck?.map(a => a.observaciones) || []);
      const completos = registros.filter(r =>
        r.inasistencias.length === 0 && !idsAck.has(String(r.id))
      );
      setReportesCompletos(completos);
    }

    setCargando(false);
  }

  function handleRegistrado() {
    cargarDatos();
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-500 mt-2">Cargando inasistencias...</p>
      </div>
    );
  }

  const sinPendientes = inasistencias.length === 0 && reportesCompletos.length === 0;

  if (sinPendientes) {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <EmptyState
          icono="✅"
          titulo="¡Todo al día!"
          descripcion="No hay inasistencias pendientes de seguimiento en tus grupos asignados"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inasistencias individuales pendientes */}
      {inasistencias.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
            <h3 className="font-bold text-gray-800 flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              Inasistencias Pendientes de Seguimiento ({inasistencias.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Estos estudiantes faltaron y aún no se ha registrado seguimiento
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {inasistencias.map((item) => (
              <div key={item.id} className="p-4 md:p-5 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 text-lg">👤</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{item.estudiante_nombre}</h4>
                        <p className="text-sm text-gray-500 truncate">
                          {item.estudiante?.municipio} • {item.estudiante?.institucion_educativa}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2 ml-0 sm:ml-13">
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">📅</span>
                        <span className="text-gray-500 flex-shrink-0">Fecha:</span>
                        <span className="text-gray-700 font-medium">{formatearFecha(item.fecha_inasistencia)}</span>
                      </div>
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">📚</span>
                        <span className="text-gray-500 flex-shrink-0">Módulo:</span>
                        <span className="text-gray-700 truncate">{item.modulo}</span>
                      </div>
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">👨‍🏫</span>
                        <span className="text-gray-500 flex-shrink-0">Docente:</span>
                        <span className="text-gray-700 truncate">{item.docente_nombre}</span>
                      </div>
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">🏫</span>
                        <span className="text-gray-500 flex-shrink-0">Grupo:</span>
                        <span className="text-gray-700 truncate">{item.grupo_nombre}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => onSeguimiento(item.estudiante, item)}
                      className="flex-1 sm:flex-none bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm whitespace-nowrap"
                    >
                      📝 Seguimiento
                    </button>
                    <button
                      onClick={() => onVerPerfil(item)}
                      className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition border-2 border-gray-300 shadow-sm whitespace-nowrap"
                    >
                      👤 Ver Perfil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reportes con asistencia completa pendientes de registro */}
      {reportesCompletos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3 className="font-bold text-gray-800 flex items-center">
              <span className="text-xl mr-2">✅</span>
              Asistencia Completa — Pendiente de Registro ({reportesCompletos.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Estos reportes no tuvieron ausentes. Regístralos para confirmar seguimiento.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {reportesCompletos.map((registro) => (
              <div key={registro.id} className="p-4 md:p-5 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 text-lg">✅</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{registro.grupo?.nombre}</h4>
                        <p className="text-sm text-gray-500 truncate">{registro.grupo?.universidad}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2 ml-0 sm:ml-13">
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">📅</span>
                        <span className="text-gray-500 flex-shrink-0">Fecha:</span>
                        <span className="text-gray-700 font-medium">{formatearFecha(registro.fecha)}</span>
                      </div>
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">📚</span>
                        <span className="text-gray-500 flex-shrink-0">Módulo:</span>
                        <span className="text-gray-700 truncate">{registro.modulo}</span>
                      </div>
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">👨‍🏫</span>
                        <span className="text-gray-500 flex-shrink-0">Docente:</span>
                        <span className="text-gray-700 truncate">{registro.docente_nombre}</span>
                      </div>
                      <div className="flex items-center text-sm gap-2">
                        <span className="text-gray-400 flex-shrink-0">📊</span>
                        <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                          Sin ausentes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() => setModalAsistencia({ registro, grupo: registro.grupo })}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm whitespace-nowrap"
                    >
                      ➕ Registrar Acción
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal asistencia completa */}
      {modalAsistencia && (
        <ModalAsistenciaCompleta
          isOpen={!!modalAsistencia}
          onClose={() => setModalAsistencia(null)}
          registro={modalAsistencia.registro}
          grupo={modalAsistencia.grupo}
          padrino={padrino}
          onRegistrado={handleRegistrado}
        />
      )}
    </div>
  );
}
