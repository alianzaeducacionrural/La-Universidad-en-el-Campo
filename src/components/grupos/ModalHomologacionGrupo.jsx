// =============================================
// HOMOLOGACIÓN DE UN GRUPO (SOLO LECTURA)
// =============================================
// Muestra, para el técnico de este grupo, la malla de homologación
// configurada y las notas que las instituciones educativas ya subieron
// desde su portal, más los certificados de reconocimiento de saberes de
// esas instituciones. `ContenidoHomologacionGrupo` es el contenido
// reutilizable (tabla + certificados); se usa dentro de un modal en
// Gestión de Grupos (admin) y Mis Grupos (padrino), y embebido directo
// como pestaña en el panel de coordinador de universidad. En todos los
// casos es solo consulta: la única fuente de escritura de estos datos es
// el portal de instituciones.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { NOMBRE_CERTIFICADO_HOMOLOGACION } from '../../utils/constants';
import { formatearFecha } from '../../utils/helpers';
import { exportarNotasHomologacionExcel } from '../../utils/exportUtils';

// Orden: alfabético por materia y, dentro de una misma materia, grado de
// menor a mayor — comparar el texto del grado directamente ordenaría "10°"
// antes que "4°", por eso se compara el número.
function compararMallaItems(a, b) {
  return a.materia.localeCompare(b.materia, 'es') || (parseInt(a.grado, 10) - parseInt(b.grado, 10));
}

export function ContenidoHomologacionGrupo({ grupo }) {
  const [cargando, setCargando] = useState(false);
  const [malla, setMalla] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [notasPorClave, setNotasPorClave] = useState({});
  const [certificados, setCertificados] = useState([]);
  const [sinPrograma, setSinPrograma] = useState(false);

  useEffect(() => {
    if (grupo) cargarDatos();
    else { setMalla([]); setEstudiantes([]); setNotasPorClave({}); setCertificados([]); setSinPrograma(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo?.id]);

  async function cargarDatos() {
    setCargando(true);
    setSinPrograma(false);

    const { data: universidad } = await supabase
      .from('universidades').select('id').eq('nombre', grupo.universidad).maybeSingle();

    const { data: programa } = universidad
      ? await supabase.from('programas').select('id').eq('universidad_id', universidad.id).eq('nombre', grupo.programa).maybeSingle()
      : { data: null };

    if (!programa) {
      setSinPrograma(true);
      setCargando(false);
      return;
    }

    const { data: mallaData } = await supabase
      .from('malla_homologacion')
      .select('id, materia, grado')
      .eq('programa_id', programa.id);

    const { data: estudiantesData } = await supabase
      .from('estudiantes')
      .select('id, nombre_completo, institucion_educativa, municipio')
      .eq('grupo_id', grupo.id)
      .order('nombre_completo');

    const idsEstudiantes = (estudiantesData || []).map(e => e.id);
    const { data: notasData } = idsEstudiantes.length > 0
      ? await supabase.from('notas_homologacion').select('malla_item_id, estudiante_id, nota').in('estudiante_id', idsEstudiantes)
      : { data: [] };

    const notas = {};
    for (const n of notasData || []) notas[`${n.malla_item_id}::${n.estudiante_id}`] = n.nota;

    // Hay nombres de institución repetidos en municipios distintos (ej. "Pío
    // XII"), así que se desambigua por nombre + municipio — no solo por
    // nombre — para no mezclar certificados de una institución con los de
    // otra que comparta nombre en otro municipio.
    const combosInstitucion = new Map();
    for (const e of estudiantesData || []) {
      if (!e.institucion_educativa || !e.municipio) continue;
      combosInstitucion.set(`${e.institucion_educativa}|${e.municipio}`, true);
    }
    const nombresInstituciones = [...new Set((estudiantesData || []).map(e => e.institucion_educativa).filter(Boolean))];
    const { data: institucionesData } = nombresInstituciones.length > 0
      ? await supabase.from('instituciones').select('id, nombre, municipios:municipio_id (nombre)').in('nombre', nombresInstituciones)
      : { data: [] };
    const institucionesFiltradas = (institucionesData || []).filter(i => combosInstitucion.has(`${i.nombre}|${i.municipios?.nombre}`));

    const idsInstituciones = institucionesFiltradas.map(i => i.id);
    const { data: certificadosData } = idsInstituciones.length > 0
      ? await supabase.from('certificados_homologacion').select('id, nombre_archivo, url_archivo, created_at, institucion_id').in('institucion_id', idsInstituciones).order('created_at', { ascending: false })
      : { data: [] };

    const nombreInstitucionPorId = new Map(institucionesFiltradas.map(i => [i.id, i.nombre]));

    setMalla((mallaData || []).sort(compararMallaItems));
    setEstudiantes(estudiantesData || []);
    setNotasPorClave(notas);
    setCertificados((certificadosData || []).map(c => ({ ...c, institucion_nombre: nombreInstitucionPorId.get(c.institucion_id) || '—' })));
    setCargando(false);
  }

  if (!grupo) return null;

  if (cargando) {
    return <div className="text-center py-8"><div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>;
  }
  if (sinPrograma) {
    return <p className="text-sm text-gray-400 text-center py-8">No se encontró el técnico de este grupo en el catálogo de programas.</p>;
  }
  if (malla.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">Este técnico aún no tiene malla de reconocimiento de aprendizajes configurada.</p>;
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>Nota ≥ 3.0 (aprueba)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Nota &lt; 3.0 (no aprueba)</span>
          </div>
          <button
            onClick={() => exportarNotasHomologacionExcel(malla, estudiantes, notasPorClave, grupo.nombre)}
            disabled={estudiantes.length === 0}
            className="bg-primary hover:bg-primary-dark text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
          >
            📥 Descargar Excel
          </button>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-gray-50 text-left py-3 px-4 border-b border-gray-200 min-w-[180px]">Estudiante</th>
                {malla.map(item => (
                  <th key={item.id} className="sticky top-0 z-10 bg-gray-50 text-center py-3 px-3 border-b border-gray-200 whitespace-nowrap min-w-[90px]">
                    <div className="text-xs font-semibold text-gray-700">{item.materia}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.grado}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est, idx) => {
                const filaBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                return (
                  <tr key={est.id} className="group border-b border-gray-100 last:border-0">
                    <td className={`sticky left-0 z-10 ${filaBg} group-hover:bg-primary/20 py-2.5 px-4 font-medium text-gray-700 whitespace-nowrap transition-colors`}>{est.nombre_completo}</td>
                    {malla.map(item => {
                      const nota = notasPorClave[`${item.id}::${est.id}`];
                      return (
                        <td key={item.id} className={`text-center py-2 px-2 ${filaBg} group-hover:bg-primary/20 transition-colors`}>
                          {nota !== undefined && nota !== null ? (
                            <span className={`inline-block min-w-[3rem] px-2 py-1 rounded-lg text-sm font-semibold border ${
                              Number(nota) >= 3 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
                            }`}>
                              {Number(nota).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {estudiantes.length === 0 && (
                <tr><td colSpan={malla.length + 1} className="text-center text-gray-400 py-6">No hay estudiantes registrados en este grupo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-700 mb-2">📄 {NOMBRE_CERTIFICADO_HOMOLOGACION}</h4>
        {certificados.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Aún no hay certificados subidos por las instituciones de este grupo.</p>
        ) : (
          <div className="space-y-2">
            {certificados.map(c => (
              <a key={c.id} href={c.url_archivo} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition">
                <span className="text-sm text-gray-700 truncate">📎 {c.nombre_archivo} <span className="text-xs text-gray-400">— {c.institucion_nombre}</span></span>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatearFecha(c.created_at)}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function ModalHomologacionGrupo({ isOpen, onClose, grupo }) {
  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[85vh] overflow-y-auto shadow-xl animate-scale-in">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800">🎓 Reconocimiento de Aprendizajes</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{grupo.programa} · {grupo.universidad}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0">✕</button>
          </div>
        </div>

        <div className="p-6">
          <ContenidoHomologacionGrupo grupo={grupo} />
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
