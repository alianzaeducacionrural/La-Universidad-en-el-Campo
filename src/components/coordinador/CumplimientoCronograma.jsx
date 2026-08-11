// =============================================
// COMPONENTE: CUMPLIMIENTO DEL CRONOGRAMA DE CLASES
// =============================================
//
// Cruza cronograma_clases (fechas programadas por grupo, módulo opcional)
// contra registros_asistencia (lo efectivamente reportado por los docentes)
// para mostrar qué grupos están al día y cuáles tienen sesiones pendientes.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatearFecha, obtenerFechaColombiaHoy, normalizarTexto as normalizar } from '../../utils/helpers';
import * as XLSX from 'xlsx';
import ModalCronogramaMasivo from './ModalCronogramaMasivo';
import ModalCronogramaGrupo from './ModalCronogramaGrupo';

export default function CumplimientoCronograma() {
  const [grupos, setGrupos] = useState([]);
  const [cronograma, setCronograma] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [filtroUniversidad, setFiltroUniversidad] = useState('');
  const [filtroCohorte, setFiltroCohorte] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalMasivo, setModalMasivo] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(null);

  useEffect(() => { cargarTodo(); }, []);

  async function cargarTodo() {
    setCargando(true);
    const [gruposRes, cronoRes, regRes] = await Promise.all([
      supabase.from('grupos').select('id, nombre, universidad, programa, cohorte').eq('activo', true).order('nombre'),
      supabase.from('cronograma_clases').select('id, grupo_id, fecha, modulo'),
      supabase.from('registros_asistencia').select('grupo_id, fecha, modulo, docente_nombre')
    ]);
    setGrupos(gruposRes.data || []);
    setCronograma(cronoRes.data || []);
    setRegistros(regRes.data || []);
    setCargando(false);
  }

  // Cálculo de cumplimiento por grupo
  const resumenPorGrupo = useMemo(() => {
    const hoy = obtenerFechaColombiaHoy();
    return grupos.map(g => {
      const programadas = cronograma
        .filter(c => c.grupo_id === g.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const registrosGrupo = registros.filter(r => r.grupo_id === g.id);

      const fechas = programadas.map(prog => {
        const sinModulo = !prog.modulo;
        const reportadaExacta = registrosGrupo.some(r =>
          r.fecha === prog.fecha && (sinModulo || normalizar(r.modulo) === normalizar(prog.modulo))
        );
        let estado = prog.fecha > hoy ? 'programada' : 'pendiente';
        let moduloReportado = null;
        if (reportadaExacta) {
          estado = 'reportada';
        } else if (!sinModulo) {
          const otraSesion = registrosGrupo.find(r => r.fecha === prog.fecha);
          if (otraSesion) {
            estado = 'otro_modulo';
            moduloReportado = otraSesion.modulo;
          }
        }
        return { ...prog, estado, moduloReportado };
      });

      // Reportes que no corresponden a ninguna fecha programada
      const fechasProgramadas = new Set(programadas.map(p => p.fecha));
      const fueraDeCronograma = registrosGrupo.filter(r => !fechasProgramadas.has(r.fecha));

      const totalProgramadas = fechas.length;
      const totalReportadas = fechas.filter(f => f.estado === 'reportada' || f.estado === 'otro_modulo').length;
      // Solo cuentan como "pendientes" las fechas de hoy o anteriores sin reportar —
      // una sesión futura todavía no debería mostrarse como incumplimiento.
      const totalPendientes = fechas.filter(f => f.estado === 'pendiente').length;

      let semaforo = 'verde';
      if (totalProgramadas === 0) semaforo = 'rojo';
      else if (totalPendientes > 0) semaforo = 'amarillo';

      return {
        grupo: g,
        fechas,
        fueraDeCronograma,
        totalProgramadas,
        totalReportadas,
        totalPendientes,
        semaforo
      };
    });
  }, [grupos, cronograma, registros]);

  const universidades = useMemo(() => [...new Set(grupos.map(g => g.universidad).filter(Boolean))].sort(), [grupos]);
  const cohortes = useMemo(() => [...new Set(grupos.map(g => g.cohorte).filter(Boolean))].sort(), [grupos]);

  const resumenFiltrado = useMemo(() => {
    return resumenPorGrupo.filter(r => {
      if (filtroUniversidad && r.grupo.universidad !== filtroUniversidad) return false;
      if (filtroCohorte && r.grupo.cohorte !== filtroCohorte) return false;
      if (filtroEstado && r.semaforo !== filtroEstado) return false;
      if (busqueda && !r.grupo.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
      return true;
    });
  }, [resumenPorGrupo, filtroUniversidad, filtroCohorte, filtroEstado, busqueda]);

  function descargarExcel() {
    const datos = resumenPorGrupo.map(r => ({
      'Grupo': r.grupo.nombre,
      'Universidad': r.grupo.universidad,
      'Programa': r.grupo.programa,
      'Cohorte': r.grupo.cohorte,
      'Programadas': r.totalProgramadas,
      'Reportadas': r.totalReportadas,
      'Pendientes': r.totalPendientes,
      'Estado': r.semaforo === 'verde' ? 'Al día' : r.semaforo === 'amarillo' ? 'Con pendientes' : 'Sin cronograma'
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cumplimiento');
    XLSX.writeFile(wb, 'Cumplimiento_Cronograma.xlsx');
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4">Cargando cronograma...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-gray-500">
          Compara el cronograma cargado contra lo efectivamente reportado por cada universidad.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setModalMasivo(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            ⬆️ Cargar Cronograma Masivo
          </button>
          <button
            onClick={descargarExcel}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            📥 Descargar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-3">
        <select value={filtroUniversidad} onChange={e => setFiltroUniversidad(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas las universidades</option>
          {universidades.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filtroCohorte} onChange={e => setFiltroCohorte(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas las cohortes</option>
          {cohortes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todos los estados</option>
          <option value="verde">🟢 Al día</option>
          <option value="amarillo">🟡 Con pendientes</option>
          <option value="rojo">🔴 Sin cronograma</option>
        </select>
        <input
          type="text"
          placeholder="🔍 Buscar grupo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-[160px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {resumenFiltrado.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Ningún grupo coincide con los filtros actuales
        </div>
      ) : (
        <div className="space-y-3">
          {resumenFiltrado.map(r => {
            const estaExpandido = expandido === r.grupo.id;
            const pct = r.totalProgramadas > 0 ? Math.round((r.totalReportadas / r.totalProgramadas) * 100) : 0;
            return (
              <div key={r.grupo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div
                  onClick={() => setExpandido(estaExpandido ? null : r.grupo.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {r.semaforo === 'verde' ? '🟢' : r.semaforo === 'amarillo' ? '🟡' : '🔴'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{r.grupo.nombre}</p>
                        <p className="text-xs text-gray-500">{r.grupo.universidad} · Cohorte {r.grupo.cohorte}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-xs text-gray-600 text-right">
                        <p>{r.totalReportadas}/{r.totalProgramadas} reportadas</p>
                        {r.totalPendientes > 0 && <p className="text-amber-600 font-medium">{r.totalPendientes} pendiente(s)</p>}
                        {r.fueraDeCronograma.length > 0 && (
                          <p className="text-blue-600">⚠️ {r.fueraDeCronograma.length} fuera de cronograma</p>
                        )}
                      </div>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setModalGrupo(r.grupo); }}
                        className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                      >
                        ✏️ Cronograma
                      </button>
                      <span className="text-gray-400 text-xs">{estaExpandido ? '▲' : '▼'}</span>
                    </div>
                  </div>
                </div>

                {estaExpandido && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    {r.totalProgramadas === 0 ? (
                      <p className="text-sm text-gray-500">Este grupo no tiene cronograma cargado.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {r.fechas.map(f => (
                          <div key={f.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-700">{formatearFecha(f.fecha)}</span>
                              <span>
                                {f.estado === 'reportada' ? '✅' : f.estado === 'otro_modulo' ? '⚠️' : f.estado === 'programada' ? '📅' : '⏳'}
                              </span>
                            </div>
                            {f.modulo && <p className="text-xs text-gray-500 mt-0.5">Programado: {f.modulo}</p>}
                            {f.estado === 'otro_modulo' && (
                              <p className="text-xs text-blue-600 mt-0.5">Reportado con otro módulo: {f.moduloReportado}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {r.fueraDeCronograma.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                          Reportes fuera de cronograma
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {r.fueraDeCronograma.map((rep, i) => (
                            <div key={i} className="bg-blue-50 rounded-lg border border-blue-200 px-3 py-2 text-sm">
                              <span className="font-medium text-gray-700">{formatearFecha(rep.fecha)}</span>
                              {rep.modulo && <p className="text-xs text-gray-500 mt-0.5">{rep.modulo}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalCronogramaMasivo
        isOpen={modalMasivo}
        onClose={() => setModalMasivo(false)}
        onCargado={cargarTodo}
      />

      <ModalCronogramaGrupo
        isOpen={!!modalGrupo}
        onClose={() => setModalGrupo(null)}
        grupo={modalGrupo}
        onActualizado={cargarTodo}
        puedeGestionar={true}
      />
    </div>
  );
}
