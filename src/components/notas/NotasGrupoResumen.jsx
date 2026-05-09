import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha } from '../../utils/helpers';
import { exportarNotasGrupoExcel } from '../../utils/exportUtils';

export default function NotasGrupoResumen({ grupo }) {
  const [notasModulos, setNotasModulos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [expandidas, setExpandidas] = useState(new Set());

  useEffect(() => {
    if (grupo?.id) cargarNotas(grupo.id);
    else setNotasModulos([]);
  }, [grupo?.id]);

  async function cargarNotas(grupoId) {
    setCargando(true);
    const { data } = await supabase
      .from('notas_modulos')
      .select(`
        *,
        notas_estudiantes (
          id, estudiante_id, nota, observaciones,
          estudiante:estudiante_id ( id, nombre_completo, estado )
        )
      `)
      .eq('grupo_id', grupoId)
      .order('fecha_evaluacion', { ascending: false });
    if (data) setNotasModulos(data);
    setCargando(false);
  }

  function toggleExpandir(id) {
    setExpandidas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (!grupo) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center">
              <span className="text-xl mr-2">📊</span>
              Notas Finales del Grupo
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {notasModulos.length} módulo{notasModulos.length !== 1 ? 's' : ''} evaluado{notasModulos.length !== 1 ? 's' : ''}
            </p>
          </div>
          {notasModulos.length > 0 && (
            <button
              onClick={() => exportarNotasGrupoExcel(notasModulos, grupo.nombre)}
              className="bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition border border-green-200 flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Descargar Historial</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        {cargando ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-2 text-sm">Cargando notas...</p>
          </div>
        ) : notasModulos.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">Aún no hay notas registradas para este grupo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notasModulos.map(nm => {
              const notasArr = nm.notas_estudiantes || [];
              const conNota = notasArr.filter(n => n.nota !== null && n.nota !== undefined);
              const promedio = conNota.length > 0
                ? (conNota.reduce((s, n) => s + n.nota, 0) / conNota.length).toFixed(1)
                : null;
              const aprobados = conNota.filter(n => n.nota >= 3.0).length;
              const estaExpandida = expandidas.has(nm.id);

              return (
                <div key={nm.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleExpandir(nm.id)}
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-xl mt-0.5">📚</span>
                      <div>
                        <p className="font-semibold text-gray-800">{nm.modulo}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>📅 {formatearFecha(nm.fecha_evaluacion)}</span>
                          <span>👨‍🏫 {nm.docente_nombre}</span>
                          {promedio && (
                            <span className={`font-medium ${parseFloat(promedio) >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                              Promedio: {promedio}
                            </span>
                          )}
                          {conNota.length > 0 && (
                            <span>{aprobados}/{conNota.length} aprobados</span>
                          )}
                        </div>
                        {nm.observaciones && (
                          <p className="text-xs text-gray-400 mt-1">📝 {nm.observaciones}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm ml-3">{estaExpandida ? '▲' : '▼'}</span>
                  </div>

                  {estaExpandida && (
                    <div className="border-t border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-2 text-left font-medium text-gray-600">Estudiante</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-600">Nota</th>
                            <th className="px-4 py-2 text-center font-medium text-gray-600">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {notasArr
                            .filter(ne => ne.estudiante)
                            .sort((a, b) => a.estudiante.nombre_completo.localeCompare(b.estudiante.nombre_completo))
                            .map(ne => (
                              <tr key={ne.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-800">{ne.estudiante.nombre_completo}</td>
                                <td className="px-4 py-2 text-center font-semibold">
                                  {ne.nota !== null && ne.nota !== undefined ? (
                                    <span className={ne.nota >= 3 ? 'text-green-600' : 'text-red-500'}>
                                      {Number(ne.nota).toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">–</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {ne.nota !== null && ne.nota !== undefined ? (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      ne.nota >= 3 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                      {ne.nota >= 3 ? 'Aprobado' : 'Reprobado'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Sin nota</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
