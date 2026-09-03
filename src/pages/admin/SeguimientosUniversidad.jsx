// =============================================
// PÁGINA: SEGUIMIENTOS DE UNIVERSIDAD (SOLO LECTURA, ADMINISTRATIVOS)
// =============================================
// Cuántos y cuáles seguimientos han registrado los coordinadores de
// universidad sobre los estudiantes (ver ModalRegistrarSeguimientoUniversidad.jsx,
// tabla `seguimientos_universidad`). Los administrativos no registran nada
// aquí — solo supervisan lo que las universidades ya registraron.

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TarjetaKPI from '../../components/estadisticas/TarjetaKPI';
import { formatearFecha, getTipoSeguimientoUniversidadInfo } from '../../utils/helpers';
import { TIPOS_SEGUIMIENTO_UNIVERSIDAD } from '../../utils/constants';
import { exportarSeguimientosUniversidadExcel } from '../../utils/exportUtils';
import VisorImagen from '../../components/common/VisorImagen';

export default function SeguimientosUniversidad({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('seguimientos-universidad');
  const [cargando, setCargando] = useState(true);
  const [seguimientos, setSeguimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUniversidad, setFiltroUniversidad] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  useEffect(() => { cargarSeguimientos(); }, []);

  async function cargarSeguimientos() {
    setCargando(true);
    const { data } = await supabase
      .from('seguimientos_universidad')
      .select(`
        *,
        estudiante:estudiante_id (*),
        grupo:grupo_id (nombre)
      `)
      .order('fecha', { ascending: false });
    if (data) setSeguimientos(data);
    setCargando(false);
  }

  const universidadesDisponibles = useMemo(() => {
    const set = new Set(seguimientos.map(s => s.estudiante?.universidad).filter(Boolean));
    return Array.from(set).sort();
  }, [seguimientos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return seguimientos.filter(s => {
      if (filtroUniversidad && s.estudiante?.universidad !== filtroUniversidad) return false;
      if (filtroTipo && s.tipo !== filtroTipo) return false;
      if (q) {
        const enTexto = `${s.estudiante?.nombre_completo || ''} ${s.persona_nombre || ''} ${s.estudiante?.documento || ''}`.toLowerCase();
        if (!enTexto.includes(q)) return false;
      }
      return true;
    });
  }, [seguimientos, busqueda, filtroUniversidad, filtroTipo]);

  const kpis = useMemo(() => {
    const estudiantesDistintos = new Set(filtrados.map(s => s.estudiante_id)).size;
    const universidadesActivas = new Set(filtrados.map(s => s.estudiante?.universidad).filter(Boolean)).size;
    const porTipo = {};
    TIPOS_SEGUIMIENTO_UNIVERSIDAD.forEach(t => { porTipo[t.value] = filtrados.filter(s => s.tipo === t.value).length; });
    return { total: filtrados.length, estudiantesDistintos, universidadesActivas, porTipo };
  }, [filtrados]);

  if (!usuario) return <LoadingSpinner mensaje="Cargando..." />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario.rol} />
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🎓 Seguimientos de Universidad</h1>
              <p className="text-gray-600">Seguimientos registrados por los coordinadores de las universidades sobre los estudiantes</p>
            </div>
            {filtrados.length > 0 && (
              <button
                onClick={() => exportarSeguimientosUniversidadExcel(filtrados, 'todos')}
                className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-green-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>📥</span> Descargar Excel
              </button>
            )}
          </div>

          {cargando ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-gray-500 mt-3">Cargando seguimientos...</p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
                <TarjetaKPI titulo="Total Seguimientos" valor={kpis.total} color="from-primary to-primary-dark" />
                <TarjetaKPI titulo="Estudiantes Atendidos" valor={kpis.estudiantesDistintos} color="from-sky-400 to-sky-500" />
                <TarjetaKPI titulo="Universidades Activas" valor={kpis.universidadesActivas} color="from-purple-400 to-purple-500" />
                <TarjetaKPI titulo="Con Evidencias" valor={filtrados.filter(s => s.evidencias?.length > 0).length} color="from-emerald-400 to-emerald-500" />
              </div>

              {/* KPIs por tipo */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {TIPOS_SEGUIMIENTO_UNIVERSIDAD.map(t => (
                  <div key={t.value} className={`rounded-xl p-4 border text-center ${t.color}`}>
                    <p className="text-2xl font-bold">{kpis.porTipo[t.value] || 0}</p>
                    <p className="text-xs font-medium mt-0.5">{t.icon} {t.label}</p>
                  </div>
                ))}
              </div>

              {/* FILTROS */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="🔍 Buscar por estudiante, documento o persona..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
                />
                <select
                  value={filtroUniversidad}
                  onChange={e => setFiltroUniversidad(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Todas las universidades</option>
                  {universidadesDisponibles.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select
                  value={filtroTipo}
                  onChange={e => setFiltroTipo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Todos los tipos</option>
                  {TIPOS_SEGUIMIENTO_UNIVERSIDAD.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                {(busqueda || filtroUniversidad || filtroTipo) && (
                  <button
                    onClick={() => { setBusqueda(''); setFiltroUniversidad(''); setFiltroTipo(''); }}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2"
                  >
                    ✕ Limpiar filtros
                  </button>
                )}
              </div>

              {/* LISTADO */}
              {filtrados.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-500">
                    {seguimientos.length === 0
                      ? 'Aún no hay seguimientos registrados por ninguna universidad.'
                      : 'Ningún seguimiento coincide con los filtros aplicados.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtrados.map(s => {
                    const info = getTipoSeguimientoUniversidadInfo(s.tipo);
                    return (
                      <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{s.estudiante?.nombre_completo || 'Estudiante eliminado'}</p>
                            <p className="text-xs text-gray-500">
                              {s.estudiante?.universidad} {s.estudiante?.programa ? `· ${s.estudiante.programa}` : ''} {s.grupo?.nombre ? `· ${s.grupo.nombre}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${info.color}`}>
                              {info.icon} {info.label}
                            </span>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">{formatearFecha(s.fecha)}</span>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mb-3 bg-gray-50 p-3 rounded-lg">{s.resultado}</p>
                        {s.evidencias && s.evidencias.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {s.evidencias.map((url, idx) => (
                              <button key={idx} onClick={() => setImagenSeleccionada(url)}
                                className="block w-16 h-16 rounded-lg border border-gray-200 overflow-hidden hover:border-primary transition cursor-pointer">
                                <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400 flex items-center">
                            <span className="mr-1">👤</span> Registrado por: {s.persona_nombre}
                          </p>
                          {onVerPerfil && s.estudiante && (
                            <button
                              onClick={() => onVerPerfil(s.estudiante)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium transition border border-indigo-200"
                            >
                              👁️ Ver Perfil
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {imagenSeleccionada && (
        <VisorImagen url={imagenSeleccionada} onClose={() => setImagenSeleccionada(null)} />
      )}
    </div>
  );
}
