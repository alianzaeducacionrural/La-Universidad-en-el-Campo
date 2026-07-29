// =============================================
// COMPONENTE: GESTIÓN DE INSTITUCIONES EDUCATIVAS (PORTAL PÚBLICO POR TOKEN)
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { formatearFecha, interpretarError } from '../../utils/helpers';

function generarToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function GestionInstituciones() {
  const notificacion = useNotificacion();
  const [instituciones, setInstituciones] = useState([]);
  const [conteos, setConteos] = useState({});
  const [huerfanas, setHuerfanas] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    const [instRes, estRes, muniRes] = await Promise.all([
      supabase.from('instituciones').select('*, municipios:municipio_id (nombre)').order('nombre'),
      supabase.from('estudiantes').select('institucion_educativa, municipio'),
      supabase.from('municipios').select('id, nombre').order('nombre')
    ]);

    const listaInstituciones = instRes.data || [];
    const filasEstudiantes = estRes.data || [];
    setMunicipios(muniRes.data || []);

    // Conteo real de estudiantes por institución (cruzando nombre + municipio,
    // porque hay nombres de institución repetidos en municipios distintos)
    const mapaConteo = {};
    filasEstudiantes.forEach(e => {
      const clave = `${e.institucion_educativa}|${e.municipio}`;
      mapaConteo[clave] = (mapaConteo[clave] || 0) + 1;
    });
    setConteos(mapaConteo);

    // Instituciones "huérfanas": nombres usados en estudiantes que no existen
    // en la tabla instituciones — ese estudiante nunca aparecerá en ningún portal.
    const nombresInstituciones = new Set(listaInstituciones.map(i => i.nombre));
    const huerfanasMap = new Map();
    filasEstudiantes.forEach(e => {
      if (!e.institucion_educativa || nombresInstituciones.has(e.institucion_educativa)) return;
      const clave = `${e.institucion_educativa}|${e.municipio}`;
      if (!huerfanasMap.has(clave)) {
        huerfanasMap.set(clave, { nombre: e.institucion_educativa, municipio: e.municipio, count: 0 });
      }
      huerfanasMap.get(clave).count++;
    });
    setHuerfanas(Array.from(huerfanasMap.values()));

    setInstituciones(listaInstituciones);
    setCargando(false);
  }

  async function generarOActivarLink(institucion) {
    setProcesandoId(institucion.id);
    const token = generarToken();
    const { error } = await supabase
      .from('instituciones')
      .update({ token_acceso: token, token_activo: true, token_creado_at: new Date().toISOString() })
      .eq('id', institucion.id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al generar el enlace');
    } else {
      notificacion.success('Enlace generado correctamente');
      cargarDatos();
    }
    setProcesandoId(null);
  }

  async function revocarLink(institucion) {
    if (!confirm('¿Revocar el enlace de esta institución? Dejará de funcionar de inmediato.')) return;
    setProcesandoId(institucion.id);
    const { error } = await supabase
      .from('instituciones')
      .update({ token_activo: false })
      .eq('id', institucion.id);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al revocar');
    } else {
      notificacion.success('Enlace revocado');
      cargarDatos();
    }
    setProcesandoId(null);
  }

  function copiarLink(institucion) {
    const url = `${window.location.origin}/ie/${institucion.token_acceso}`;
    navigator.clipboard.writeText(url)
      .then(() => notificacion.success('Enlace copiado al portapapeles'))
      .catch(() => notificacion.error('No se pudo copiar el enlace'));
  }

  async function crearInstitucionFaltante(huerfana) {
    const municipio = municipios.find(m => m.nombre === huerfana.municipio);
    if (!municipio) {
      notificacion.error(`El municipio "${huerfana.municipio}" no existe en el catálogo.`, 'Error');
      return;
    }
    const { error } = await supabase.from('instituciones').insert([{ nombre: huerfana.nombre, municipio_id: municipio.id }]);
    if (error) {
      notificacion.error(interpretarError(error), 'Error al crear la institución');
    } else {
      notificacion.success(`Institución "${huerfana.nombre}" creada`);
      cargarDatos();
    }
  }

  const institucionesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return instituciones;
    const q = busqueda.toLowerCase();
    return instituciones.filter(i =>
      i.nombre.toLowerCase().includes(q) || i.municipios?.nombre?.toLowerCase().includes(q)
    );
  }, [instituciones, busqueda]);

  const agrupadasPorMunicipio = useMemo(() => {
    const grupos = {};
    institucionesFiltradas.forEach(i => {
      const municipio = i.municipios?.nombre || 'Sin municipio';
      (grupos[municipio] = grupos[municipio] || []).push(i);
    });
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));
  }, [institucionesFiltradas]);

  if (cargando) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-gray-500 mt-4">Cargando instituciones...</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Genera un enlace de solo lectura para que cada institución vea únicamente la información
        de sus propios estudiantes y grupos, sin necesidad de iniciar sesión.
      </p>

      {huerfanas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            ⚠️ {huerfanas.length} institución(es) usada(s) por estudiantes pero no registrada(s) en el catálogo
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Esos estudiantes no aparecerán en ningún portal hasta que la institución exista aquí.
          </p>
          <div className="space-y-2">
            {huerfanas.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                <span className="text-sm text-gray-700">{h.nombre} · {h.municipio} ({h.count} estudiante{h.count !== 1 ? 's' : ''})</span>
                <button
                  onClick={() => crearInstitucionFaltante(h)}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  + Crear institución
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar institución o municipio..."
        className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4"
      />

      <div className="space-y-6">
        {agrupadasPorMunicipio.map(([municipio, lista]) => (
          <div key={municipio}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">📍 {municipio}</h3>
            <div className="space-y-2">
              {lista.map(inst => {
                const total = conteos[`${inst.nombre}|${municipio}`] || 0;
                const procesando = procesandoId === inst.id;
                return (
                  <div key={inst.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{inst.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        👥 {total} estudiante{total !== 1 ? 's' : ''}
                        {inst.token_activo && (
                          <span className="ml-2 text-green-600">
                            · {inst.total_accesos || 0} acceso(s)
                            {inst.ultimo_acceso_at && ` · último ${formatearFecha(inst.ultimo_acceso_at)}`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      {inst.token_activo ? (
                        <>
                          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200">🔗 Enlace activo</span>
                          <button
                            onClick={() => copiarLink(inst)}
                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                          >
                            📋 Copiar
                          </button>
                          <button
                            onClick={() => generarOActivarLink(inst)}
                            disabled={procesando}
                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                          >
                            🔄 Regenerar
                          </button>
                          <button
                            onClick={() => revocarLink(inst)}
                            disabled={procesando}
                            className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                          >
                            🚫 Revocar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => generarOActivarLink(inst)}
                          disabled={procesando}
                          className="text-xs bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          {procesando ? 'Generando...' : '🔗 Generar Enlace'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
