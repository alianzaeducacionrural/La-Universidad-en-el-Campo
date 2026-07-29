// =============================================
// PÁGINA PÚBLICA: PORTAL DE INSTITUCIÓN EDUCATIVA
// =============================================
//
// Ruta pública /ie/:token — fuera de ProtectedRoute, sin sesión de Supabase.
// Todos los datos vienen de la Edge Function `portal-institucion`, que valida
// el token contra la tabla `instituciones` usando la service_role key. La RLS
// para `anon` sigue bloqueada; esta página nunca consulta Supabase directo.

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { formatearFecha } from '../utils/helpers';

const FUNCIONES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-institucion`;

export default function PortalInstitucion() {
  const { token } = useParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [datos, setDatos] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(false);
      try {
        const res = await fetch(FUNCIONES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(import.meta.env.VITE_SUPABASE_ANON_KEY ? { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } : {})
          },
          body: JSON.stringify({ token })
        });
        if (!res.ok) { setError(true); setCargando(false); return; }
        const data = await res.json();
        setDatos(data);
      } catch {
        setError(true);
      }
      setCargando(false);
    }
    if (token) cargar();
  }, [token]);

  const kpis = useMemo(() => {
    const estudiantes = datos?.estudiantes || [];
    return {
      total: estudiantes.length,
      activos: estudiantes.filter(e => e.estado === 'Activo' || !e.estado).length,
      enRiesgo: estudiantes.filter(e => e.estado === 'En Riesgo').length,
      desertores: estudiantes.filter(e => e.estado === 'Desertor').length,
      graduados: estudiantes.filter(e => e.estado === 'Graduado').length
    };
  }, [datos]);

  const estudiantesFiltrados = useMemo(() => {
    const lista = datos?.estudiantes || [];
    if (!busqueda.trim()) return lista;
    const q = busqueda.toLowerCase();
    return lista.filter(e => e.nombre_completo.toLowerCase().includes(q) || e.documento?.includes(q));
  }, [datos, busqueda]);

  function descargarExcel() {
    const filas = estudiantesFiltrados.map(e => ({
      'Nombre Completo': e.nombre_completo,
      'Documento': e.documento || '',
      'Estado': e.estado || 'Activo',
      'Universidad': e.universidad || '',
      'Programa': e.programa || '',
      'Cohorte': e.cohorte || '',
      'Inasistencias': e.total_inasistencias || 0,
      'Promedio Notas': e.promedio_notas ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
    XLSX.writeFile(wb, `Estudiantes_${datos?.institucion?.nombre?.replace(/\s+/g, '_') || 'institucion'}.xlsx`);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-light to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-gray-800 mb-2">Este enlace no está disponible</h1>
          <p className="text-sm text-gray-500">
            Puede haber expirado o haber sido revocado. Contacta al Comité de Cafeteros para solicitar uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white text-xl font-bold">☕</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-800">{datos.institucion.nombre}</h1>
              <p className="text-sm text-gray-500">{datos.institucion.municipio} · La Universidad en el Campo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
            <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
            <p className="text-2xl font-bold text-green-700">{kpis.activos}</p>
            <p className="text-xs text-green-600">Activos</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
            <p className="text-2xl font-bold text-yellow-700">{kpis.enRiesgo}</p>
            <p className="text-xs text-yellow-600">En Riesgo</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
            <p className="text-2xl font-bold text-red-700">{kpis.desertores}</p>
            <p className="text-xs text-red-600">Desertores</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
            <p className="text-2xl font-bold text-blue-700">{kpis.graduados}</p>
            <p className="text-xs text-blue-600">Graduados</p>
          </div>
        </div>

        {/* Grupos */}
        {datos.grupos?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-700 mb-3">📚 Grupos con estudiantes de esta institución</h2>
            <div className="flex flex-wrap gap-2">
              {datos.grupos.map(g => (
                <span key={g.id} className="text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-gray-600">
                  {g.nombre} · {g.universidad} · {g.total_estudiantes_institucion} estudiante{g.total_estudiantes_institucion !== 1 ? 's' : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buscador + descarga */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar estudiante..."
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm flex-1 min-w-[200px] max-w-md bg-white"
          />
          <button
            onClick={descargarExcel}
            disabled={estudiantesFiltrados.length === 0}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            📥 Descargar Excel
          </button>
        </div>

        {/* Tabla de estudiantes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {estudiantesFiltrados.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">No hay estudiantes que coincidan con la búsqueda</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {estudiantesFiltrados.map(e => {
                const estaExpandido = expandido === e.id;
                return (
                  <div key={e.id}>
                    <div
                      onClick={() => setExpandido(estaExpandido ? null : e.id)}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{e.nombre_completo}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{e.universidad} · {e.programa} · Cohorte {e.cohorte}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          e.estado === 'Activo' || !e.estado ? 'bg-green-100 text-green-700' :
                          e.estado === 'En Riesgo' ? 'bg-yellow-100 text-yellow-700' :
                          e.estado === 'Desertor' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {e.estado || 'Activo'}
                        </span>
                        <span className="text-gray-400 text-xs">{estaExpandido ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {estaExpandido && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Inasistencias ({e.inasistencias?.length || 0})
                            </p>
                            {(e.inasistencias || []).length === 0 ? (
                              <p className="text-xs text-gray-400">Sin inasistencias registradas</p>
                            ) : (
                              <ul className="space-y-1">
                                {e.inasistencias.map((ina, i) => (
                                  <li key={i} className="text-xs text-gray-600 bg-white rounded px-2 py-1 border border-gray-100">
                                    {formatearFecha(ina.fecha)} — {ina.modulo || 'N/A'}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Notas {e.promedio_notas !== null ? `(prom. ${e.promedio_notas})` : ''}
                            </p>
                            {(e.notas || []).length === 0 ? (
                              <p className="text-xs text-gray-400">Sin notas registradas</p>
                            ) : (
                              <ul className="space-y-1">
                                {e.notas.map((n, i) => (
                                  <li key={i} className="text-xs text-gray-600 bg-white rounded px-2 py-1 border border-gray-100 flex justify-between">
                                    <span>{n.modulo || 'N/A'}</span>
                                    <span className={`font-semibold ${n.nota >= 3 ? 'text-green-600' : 'text-red-500'}`}>
                                      {n.nota !== null ? Number(n.nota).toFixed(1) : '–'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Portal de solo lectura · Comité de Cafeteros de Caldas
        </p>
      </div>
    </div>
  );
}
