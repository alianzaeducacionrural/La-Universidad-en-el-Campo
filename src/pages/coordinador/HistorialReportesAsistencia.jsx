import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useReportesNuevos } from '../../hooks/useReportesNuevos';
import { formatearFecha } from '../../utils/helpers';

export default function HistorialReportesAsistencia() {
  const { perfil: usuario } = useAuth();
  const { marcarComoVisto, getLastSeen } = useReportesNuevos();
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroUniversidad, setFiltroUniversidad] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [expandido, setExpandido] = useState(null);
  const prevLastSeen = useRef(null);
  const cantidadNuevos = useRef(0);

  useEffect(() => {
    prevLastSeen.current = getLastSeen();
    marcarComoVisto();
    cargarReportes();
  }, []);

  async function cargarReportes() {
    setCargando(true);
    const { data } = await supabase
      .from('registros_asistencia')
      .select('id, fecha, modulo, docente_nombre, created_at, grupo:grupo_id(nombre, universidad), inasistencias(id, estudiantes:estudiante_id(nombre_completo))')
      .order('created_at', { ascending: false });

    if (data) {
      const con_nuevo = data.map(r => ({
        ...r,
        esNuevo: new Date(r.created_at) > new Date(prevLastSeen.current)
      }));
      cantidadNuevos.current = con_nuevo.filter(r => r.esNuevo).length;
      setReportes(con_nuevo);
    }
    setCargando(false);
  }

  const universidades = useMemo(() => {
    const set = new Set(reportes.map(r => r.grupo?.universidad).filter(Boolean));
    return [...set].sort();
  }, [reportes]);

  const reportesFiltrados = useMemo(() => {
    return reportes.filter(r => {
      if (filtroUniversidad && r.grupo?.universidad !== filtroUniversidad) return false;
      if (fechaInicio && r.fecha < fechaInicio) return false;
      if (fechaFin && r.fecha > fechaFin) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          r.grupo?.nombre?.toLowerCase().includes(q) ||
          r.grupo?.universidad?.toLowerCase().includes(q) ||
          r.modulo?.toLowerCase().includes(q) ||
          r.docente_nombre?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reportes, filtroUniversidad, fechaInicio, fechaFin, busqueda]);

  if (!usuario) return <LoadingSpinner mensaje="Cargando..." />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        vistaActiva="historial-reportes"
        setVistaActiva={() => {}}
        rol={usuario.rol}
        totalReportesNuevos={0}
      />

      <div className="flex-1 min-w-0">
        <Header onVerPerfil={() => {}} />

        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 pb-24 lg:pb-8">
          {/* Encabezado */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">📅 Historial de Reportes</h1>
            <p className="text-gray-500 text-sm mt-1">Todos los reportes de asistencia enviados por las universidades</p>
          </div>

          {/* Banner de nuevos */}
          {cantidadNuevos.current > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-amber-600 text-lg">🔔</span>
              <p className="text-amber-800 text-sm font-medium">
                {cantidadNuevos.current} reporte{cantidadNuevos.current > 1 ? 's' : ''} nuevo{cantidadNuevos.current > 1 ? 's' : ''} desde tu última visita
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={filtroUniversidad}
                onChange={e => setFiltroUniversidad(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Todas las universidades</option>
                {universidades.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Buscar por grupo, módulo, docente..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  max={fechaFin || undefined}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Fecha fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  min={fechaInicio || undefined}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {(fechaInicio || fechaFin) && (
                <button
                  onClick={() => { setFechaInicio(''); setFechaFin(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          {cargando ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12">
              <LoadingSpinner mensaje="Cargando reportes..." />
            </div>
          ) : reportesFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              No hay reportes disponibles
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100">
                {reportesFiltrados.map(r => {
                  const ausentes = r.inasistencias?.length || 0;
                  const estaExpandido = expandido === r.id;
                  return (
                    <div key={r.id}>
                      {/* Fila principal — clickeable */}
                      <div
                        onClick={() => setExpandido(estaExpandido ? null : r.id)}
                        className={`px-5 py-4 cursor-pointer transition select-none ${
                          r.esNuevo
                            ? 'bg-amber-50 border-l-4 border-amber-400 hover:bg-amber-100/60'
                            : 'bg-white hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {r.esNuevo && (
                                <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                  Nuevo
                                </span>
                              )}
                              <span className="font-semibold text-gray-800 text-sm truncate">
                                {r.grupo?.nombre || 'Grupo desconocido'}
                              </span>
                              {ausentes === 0 ? (
                                <span className="text-[10px] font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                  ✅ Completa
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                                  ⚠️ {ausentes} ausente{ausentes !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              🎓 {r.grupo?.universidad || '—'}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                              {r.modulo && (
                                <span className="text-xs text-gray-500">📚 {r.modulo}</span>
                              )}
                              {r.docente_nombre && (
                                <span className="text-xs text-gray-500">👤 {r.docente_nombre}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">{formatearFecha(r.fecha)}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Enviado {formatearFecha(r.created_at?.split('T')[0])}
                              </p>
                            </div>
                            <span className="text-gray-400 text-xs">{estaExpandido ? '▲' : '▼'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detalle expandido */}
                      {estaExpandido && (
                        <div className={`px-5 pb-4 pt-2 border-t border-gray-100 ${r.esNuevo ? 'bg-amber-50/60' : 'bg-gray-50'}`}>
                          {ausentes === 0 ? (
                            <p className="text-sm text-green-700 font-medium py-2">
                              ✅ Asistencia completa — ningún estudiante ausente en este reporte.
                            </p>
                          ) : (
                            <>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Estudiantes ausentes ({ausentes})
                              </p>
                              <ul className="space-y-1">
                                {r.inasistencias.map((ina, i) => (
                                  <li key={ina.id} className="flex items-center gap-2 text-sm text-gray-700">
                                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {i + 1}
                                    </span>
                                    {ina.estudiantes?.nombre_completo || 'Estudiante desconocido'}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reportesFiltrados.length > 0 && (
            <p className="text-xs text-gray-400 text-center mt-4">
              {reportesFiltrados.length} reporte{reportesFiltrados.length !== 1 ? 's' : ''} en total
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
