// =============================================
// COMPONENTE: HISTORIAL DE REPORTES DE ASISTENCIA
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha } from '../../utils/helpers';
import LoadingSpinner from '../common/LoadingSpinner';

function StatCard({ value, label, icon, colorClass }) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-medium opacity-75">{label}</p>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function BadgeEstado({ grupo }) {
  if (grupo.totalReportes === 0) {
    return (
      <span className="text-xs font-medium bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 whitespace-nowrap">
        🔴 Sin reportes
      </span>
    );
  }
  if (!grupo.alDia) {
    return (
      <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">
        ⚠️ Desactualizado
      </span>
    );
  }
  return (
    <span className="text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200 whitespace-nowrap">
      ✅ Al día
    </span>
  );
}

function FilaGrupo({ grupo, expandido, onToggle }) {
  return (
    <div>
      <div
        onClick={onToggle}
        className="p-4 hover:bg-gray-50 cursor-pointer transition select-none"
      >
        <div className="flex items-start gap-3">
          <span className="text-gray-400 mt-0.5 flex-shrink-0 text-xs pt-1">
            {expandido ? '▼' : '▶'}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h4 className="font-semibold text-gray-800 text-sm">{grupo.nombre}</h4>
              <BadgeEstado grupo={grupo} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                🏛️ {grupo.universidad}
              </span>
              {grupo.programa && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                  📚 {grupo.programa}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Cohorte {grupo.cohorte}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 text-right">
            <div className="hidden sm:block text-center min-w-[56px]">
              <p className="text-xl font-bold text-gray-800">{grupo.totalReportes}</p>
              <p className="text-xs text-gray-500">reportes</p>
            </div>
            <div className="text-right min-w-[90px]">
              {grupo.ultimoReporte ? (
                <>
                  <p className="text-xs text-gray-500">Último reporte</p>
                  <p className="text-sm font-medium text-gray-700">{formatearFecha(grupo.ultimoReporte.fecha)}</p>
                  <p className={`text-xs ${grupo.alDia ? 'text-green-600' : 'text-amber-600'}`}>
                    hace {grupo.diasDesdeUltimo} día{grupo.diasDesdeUltimo !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <p className="text-xs text-red-500 font-medium">Sin reportes</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {expandido && (
        <div className="bg-gray-50 border-t border-gray-100 px-5 pb-5 pt-3">
          {grupo.reportes.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center bg-white rounded-lg border border-gray-200">
              Este grupo aún no tiene reportes de asistencia registrados.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 mb-3">
                {grupo.totalReportes} reporte(s) · {grupo.totalAusencias} ausencia(s) en total
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-sm bg-white min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                      <th className="px-4 py-2.5 text-left font-medium">Fecha</th>
                      <th className="px-4 py-2.5 text-left font-medium">Módulo</th>
                      <th className="px-4 py-2.5 text-left font-medium">Docente</th>
                      <th className="px-4 py-2.5 text-center font-medium">Ausentes</th>
                      <th className="px-4 py-2.5 text-center font-medium">Seguimientos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grupo.reportes.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {formatearFecha(r.fecha)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700">{r.modulo}</td>
                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[160px]">
                          {r.docente_nombre}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            r.total_ausentes === 0
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {r.total_ausentes}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {r.total_ausentes === 0 ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <span className={`text-xs font-semibold ${
                              r.ausentes_seguidos === r.total_ausentes
                                ? 'text-green-600'
                                : r.ausentes_seguidos > 0
                                  ? 'text-amber-600'
                                  : 'text-red-500'
                            }`}>
                              {r.ausentes_seguidos}/{r.total_ausentes}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistorialAsistencias() {
  const [grupos, setGrupos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [ausencias, setAusencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroUniversidad, setFiltroUniversidad] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [grupoExpandido, setGrupoExpandido] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);

    const [
      { data: dataGrupos },
      { data: dataReportes },
      { data: dataAusencias },
    ] = await Promise.all([
      supabase
        .from('grupos')
        .select('id, nombre, universidad, cohorte, programa')
        .eq('activo', true)
        .order('universidad')
        .order('nombre'),
      supabase
        .from('registros_asistencia')
        .select('id, grupo_id, fecha, modulo, docente_nombre, created_at')
        .order('fecha', { ascending: false }),
      supabase
        .from('inasistencias')
        .select('id, registro_id, estado_seguimiento'),
    ]);

    setGrupos(dataGrupos || []);
    setReportes(dataReportes || []);
    setAusencias(dataAusencias || []);
    setCargando(false);
  }

  const universidades = useMemo(
    () => [...new Set(grupos.map(g => g.universidad).filter(Boolean))].sort(),
    [grupos]
  );

  const gruposProcesados = useMemo(() => {
    let lista = filtroUniversidad === 'todas'
      ? grupos
      : grupos.filter(g => g.universidad === filtroUniversidad);

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(g =>
        g.nombre?.toLowerCase().includes(q) ||
        g.universidad?.toLowerCase().includes(q) ||
        g.programa?.toLowerCase().includes(q)
      );
    }

    const procesados = lista.map(g => {
      const reportesGrupo = reportes.filter(r => r.grupo_id === g.id);
      const ultimoReporte = reportesGrupo[0];

      const diasDesdeUltimo = ultimoReporte
        ? Math.floor((Date.now() - new Date(ultimoReporte.fecha).getTime()) / 86400000)
        : null;

      const alDia = diasDesdeUltimo !== null && diasDesdeUltimo <= 7;

      const reportesConStats = reportesGrupo.map(r => {
        const aus = ausencias.filter(a => a.registro_id === r.id);
        return {
          ...r,
          total_ausentes: aus.length,
          ausentes_seguidos: aus.filter(a => a.estado_seguimiento === 'realizado').length,
          ausentes_pendientes: aus.filter(a => a.estado_seguimiento === 'pendiente').length,
        };
      });

      const totalAusencias = reportesConStats.reduce((s, r) => s + r.total_ausentes, 0);

      return {
        ...g,
        reportes: reportesConStats,
        ultimoReporte,
        diasDesdeUltimo,
        alDia,
        totalReportes: reportesGrupo.length,
        totalAusencias,
      };
    });

    const filtradosPorEstado = filtroEstado === 'todos'
      ? procesados
      : filtroEstado === 'al_dia'
        ? procesados.filter(g => g.alDia)
        : filtroEstado === 'desactualizado'
          ? procesados.filter(g => !g.alDia && g.totalReportes > 0)
          : procesados.filter(g => g.totalReportes === 0);

    return filtradosPorEstado.sort((a, b) => {
      const prioridad = g => g.totalReportes === 0 ? 0 : !g.alDia ? 1 : 2;
      return prioridad(a) - prioridad(b);
    });
  }, [grupos, reportes, ausencias, filtroUniversidad, filtroEstado, busqueda]);

  const stats = useMemo(() => {
    const base = filtroUniversidad === 'todas'
      ? grupos
      : grupos.filter(g => g.universidad === filtroUniversidad);

    const procesados = base.map(g => {
      const reportesGrupo = reportes.filter(r => r.grupo_id === g.id);
      const ultimoReporte = reportesGrupo[0];
      const diasDesdeUltimo = ultimoReporte
        ? Math.floor((Date.now() - new Date(ultimoReporte.fecha).getTime()) / 86400000)
        : null;
      const alDia = diasDesdeUltimo !== null && diasDesdeUltimo <= 7;
      return { totalReportes: reportesGrupo.length, alDia };
    });

    return {
      total: procesados.length,
      alDia: procesados.filter(g => g.alDia).length,
      desactualizados: procesados.filter(g => !g.alDia && g.totalReportes > 0).length,
      sinReportes: procesados.filter(g => g.totalReportes === 0).length,
    };
  }, [grupos, reportes, filtroUniversidad]);

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <LoadingSpinner mensaje="Cargando historial de reportes..." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          value={stats.total}
          label="Grupos activos"
          icon="📊"
          colorClass="bg-gray-50 border-gray-200 text-gray-800"
        />
        <StatCard
          value={stats.alDia}
          label="Al día (≤7 días)"
          icon="✅"
          colorClass="bg-green-50 border-green-200 text-green-800"
        />
        <StatCard
          value={stats.desactualizados}
          label="Desactualizados"
          icon="⚠️"
          colorClass="bg-amber-50 border-amber-200 text-amber-800"
        />
        <StatCard
          value={stats.sinReportes}
          label="Sin reportes"
          icon="🔴"
          colorClass="bg-red-50 border-red-200 text-red-700"
        />
      </div>

      {/* Panel principal */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Encabezado y filtros */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <h3 className="font-bold text-gray-800 flex items-center text-base">
            <span className="mr-2 text-xl">📅</span>
            Historial de Reportes de Asistencia
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Estado de reportes por grupo · Al día = reporte en los últimos 7 días
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Filtro por universidad */}
            <select
              value={filtroUniversidad}
              onChange={e => {
                setFiltroUniversidad(e.target.value);
                setGrupoExpandido(null);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="todas">🏛️ Todas las universidades</option>
              {universidades.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {/* Filtro por estado */}
            <select
              value={filtroEstado}
              onChange={e => {
                setFiltroEstado(e.target.value);
                setGrupoExpandido(null);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="todos">📋 Todos los estados</option>
              <option value="al_dia">✅ Al día</option>
              <option value="desactualizado">⚠️ Desactualizados</option>
              <option value="sin_reportes">🔴 Sin reportes</option>
            </select>

            {/* Búsqueda */}
            <input
              type="text"
              placeholder="🔍 Buscar grupo o programa..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 sm:max-w-xs"
            />
          </div>
        </div>

        {/* Lista de grupos */}
        {gruposProcesados.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-medium">No se encontraron grupos</p>
            <p className="text-sm mt-1">Intenta cambiar los filtros aplicados</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {gruposProcesados.map(grupo => (
              <FilaGrupo
                key={grupo.id}
                grupo={grupo}
                expandido={grupoExpandido === grupo.id}
                onToggle={() =>
                  setGrupoExpandido(grupoExpandido === grupo.id ? null : grupo.id)
                }
              />
            ))}
          </div>
        )}

        {/* Footer con total visible */}
        {gruposProcesados.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            Mostrando {gruposProcesados.length} grupo(s)
          </div>
        )}
      </div>
    </div>
  );
}
