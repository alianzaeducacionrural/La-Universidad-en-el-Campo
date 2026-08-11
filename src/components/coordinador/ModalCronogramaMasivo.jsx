// =============================================
// MODAL: CARGA MASIVA DE CRONOGRAMA (POR UNIVERSIDAD)
// =============================================
//
// 1. Se elige una universidad y se descarga una plantilla con una fila por
//    grupo activo y columnas Fecha 1/Módulo 1/Docente 1/Teléfono 1 ... por
//    sesión. Las sesiones ya cargadas en el grupo salen pre-llenas con su
//    histórico real, y quedan columnas vacías al final para seguir agregando.
// 2. Se sube el archivo diligenciado: fecha y módulo son obligatorios por
//    par, docente y teléfono son opcionales. Se muestra una vista previa con
//    errores antes de escribir en la base de datos.

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { useNotificacion } from '../../context/NotificacionContext';
import { interpretarError } from '../../utils/helpers';

const MAX_PARES = 20;
const COLUMNA_MODULO = 'Módulo';
const COLUMNA_DOCENTE = 'Docente';
const COLUMNA_TELEFONO = 'Teléfono';

function parsearFecha(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (valor instanceof Date) {
    const y = valor.getFullYear(), m = String(valor.getMonth() + 1).padStart(2, '0'), d = String(valor.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof valor === 'number') {
    // Serial de fecha de Excel (celda sin formato de fecha detectado)
    const utcDias = Math.floor(valor - 25569);
    const fecha = new Date(utcDias * 86400 * 1000);
    const y = fecha.getUTCFullYear(), m = String(fecha.getUTCMonth() + 1).padStart(2, '0'), d = String(fecha.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = valor.toString().trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const diaN = Number(dd), mesN = Number(mm);
  if (mesN < 1 || mesN > 12 || diaN < 1 || diaN > 31) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function formatearFechaDDMMYYYY(fechaISO) {
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

export default function ModalCronogramaMasivo({ isOpen, onClose, onCargado }) {
  const notificacion = useNotificacion();
  const [universidades, setUniversidades] = useState([]);
  const [universidadSeleccionada, setUniversidadSeleccionada] = useState('');
  const [preview, setPreview] = useState(null); // { filas, errores, gruposCount, fechasCount, nombreArchivo }
  const [modoReemplazar, setModoReemplazar] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [gruposTodos, setGruposTodos] = useState([]);

  useEffect(() => {
    if (isOpen) {
      cargarUniversidades();
      cargarGrupos();
      setPreview(null);
      setUniversidadSeleccionada('');
      setModoReemplazar(false);
    }
  }, [isOpen]);

  async function cargarUniversidades() {
    const { data } = await supabase.from('universidades').select('nombre').order('nombre');
    setUniversidades((data || []).map(u => u.nombre));
  }

  async function cargarGrupos() {
    const { data } = await supabase.from('grupos').select('id, nombre, universidad, programa, cohorte').eq('activo', true).order('nombre');
    setGruposTodos(data || []);
  }

  async function descargarPlantilla() {
    if (!universidadSeleccionada) {
      notificacion.warning('Selecciona una universidad primero.', 'Campo requerido');
      return;
    }
    const grupos = gruposTodos.filter(g => g.universidad === universidadSeleccionada);
    if (grupos.length === 0) {
      notificacion.warning('Esa universidad no tiene grupos activos.', 'Sin datos');
      return;
    }

    setDescargando(true);
    const { data: historico, error } = await supabase
      .from('cronograma_clases')
      .select('grupo_id, fecha, modulo, docente_universitario, telefono_contacto')
      .in('grupo_id', grupos.map(g => g.id))
      .order('fecha');
    setDescargando(false);

    if (error) {
      notificacion.error(interpretarError(error), 'Error al cargar el histórico');
      return;
    }

    const historicoPorGrupo = {};
    (historico || []).forEach(h => {
      (historicoPorGrupo[h.grupo_id] ||= []).push(h);
    });

    const mayorHistorial = Math.max(0, ...Object.values(historicoPorGrupo).map(arr => arr.length));
    const paresNecesarios = Math.max(MAX_PARES, mayorHistorial + 5);

    const filas = grupos.map(g => {
      const fila = { 'Grupo': g.nombre, 'Cohorte': g.cohorte, 'Programa': g.programa };
      const historialGrupo = historicoPorGrupo[g.id] || [];
      for (let n = 1; n <= paresNecesarios; n++) {
        const sesion = historialGrupo[n - 1];
        fila[`Fecha ${n}`] = sesion ? formatearFechaDDMMYYYY(sesion.fecha) : '';
        fila[`${COLUMNA_MODULO} ${n}`] = sesion ? (sesion.modulo || '') : '';
        fila[`${COLUMNA_DOCENTE} ${n}`] = sesion ? (sesion.docente_universitario || '') : '';
        fila[`${COLUMNA_TELEFONO} ${n}`] = sesion ? (sesion.telefono_contacto || '') : '';
      }
      return fila;
    });
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cronograma');
    XLSX.writeFile(wb, `Plantilla_Cronograma_${universidadSeleccionada.replace(/\s+/g, '_')}.xlsx`);
  }

  function procesarArchivo(archivo) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

      // El número de pares por fila es dinámico (la plantilla puede traer más
      // de MAX_PARES si un grupo ya tiene mucho histórico) — se detecta a
      // partir de las columnas "Fecha N" realmente presentes en el archivo.
      const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];
      const numerosDetectados = columnas
        .map(c => c.match(/^Fecha (\d+)$/))
        .filter(Boolean)
        .map(m => Number(m[1]));
      const maxPar = numerosDetectados.length > 0 ? Math.max(...numerosDetectados) : MAX_PARES;

      const filasParaInsertar = [];
      const errores = [];
      const gruposEncontrados = new Set();
      const clavesVistas = new Set(); // dedupe grupo_id+fecha+modulo dentro del mismo archivo

      filas.forEach((fila, idx) => {
        const nombreGrupo = (fila['Grupo'] || '').toString().trim();
        if (!nombreGrupo) return; // fila vacía
        const grupo = gruposTodos.find(g => g.nombre === nombreGrupo);
        if (!grupo) {
          errores.push(`Fila ${idx + 2}: no existe un grupo activo llamado "${nombreGrupo}"`);
          return;
        }
        gruposEncontrados.add(grupo.id);

        for (let n = 1; n <= maxPar; n++) {
          const valorFecha = fila[`Fecha ${n}`];
          const valorModulo = (fila[`${COLUMNA_MODULO} ${n}`] || '').toString().trim();
          const valorDocente = (fila[`${COLUMNA_DOCENTE} ${n}`] || '').toString().trim();
          const valorTelefono = (fila[`${COLUMNA_TELEFONO} ${n}`] || '').toString().trim();
          const fechaVacia = valorFecha === '' || valorFecha === null || valorFecha === undefined;

          if (fechaVacia) {
            if (valorModulo || valorDocente || valorTelefono) {
              errores.push(`Fila ${idx + 2} (${nombreGrupo}): la columna "Fecha ${n}" está vacía pero tiene otros datos de esa sesión`);
            }
            continue;
          }

          const fechaISO = parsearFecha(valorFecha);
          if (!fechaISO) {
            errores.push(`Fila ${idx + 2} (${nombreGrupo}): "Fecha ${n}" no tiene un formato válido (dd/mm/aaaa)`);
            continue;
          }

          if (!valorModulo) {
            errores.push(`Fila ${idx + 2} (${nombreGrupo}): "${COLUMNA_MODULO} ${n}" es obligatorio porque "Fecha ${n}" tiene valor`);
            continue;
          }

          const clave = `${grupo.id}|${fechaISO}|${valorModulo}`;
          if (clavesVistas.has(clave)) {
            errores.push(`Fila ${idx + 2} (${nombreGrupo}): la fecha ${valorFecha} con módulo "${valorModulo}" está repetida`);
            continue;
          }
          clavesVistas.add(clave);
          filasParaInsertar.push({
            grupo_id: grupo.id,
            fecha: fechaISO,
            modulo: valorModulo,
            docente_universitario: valorDocente || null,
            telefono_contacto: valorTelefono || null,
            // Snapshot de lo cargado — el upsert con ignoreDuplicates nunca
            // pisa una fila ya existente, así que esto solo aplica a filas
            // realmente nuevas y queda como registro de lo programado.
            modulo_original: valorModulo,
            docente_original: valorDocente || null,
            telefono_original: valorTelefono || null
          });
        }
      });

      setPreview({
        filasParaInsertar,
        errores,
        gruposCount: gruposEncontrados.size,
        gruposIds: Array.from(gruposEncontrados),
        fechasCount: filasParaInsertar.length,
        nombreArchivo: archivo.name
      });
    };
    reader.readAsArrayBuffer(archivo);
  }

  async function confirmarCarga() {
    if (!preview || preview.filasParaInsertar.length === 0) return;
    setProcesando(true);
    try {
      if (modoReemplazar && preview.gruposIds.length > 0) {
        const { error: errorBorrar } = await supabase
          .from('cronograma_clases')
          .delete()
          .in('grupo_id', preview.gruposIds);
        if (errorBorrar) throw errorBorrar;
      }

      const { error } = await supabase
        .from('cronograma_clases')
        .upsert(preview.filasParaInsertar, { onConflict: 'grupo_id,fecha,modulo', ignoreDuplicates: true });
      if (error) throw error;

      notificacion.success(`Cronograma cargado: ${preview.fechasCount} fecha(s) en ${preview.gruposCount} grupo(s)`);
      setPreview(null);
      onCargado?.();
      onClose();
    } catch (error) {
      notificacion.error(interpretarError(error), 'Error al cargar el cronograma');
    } finally {
      setProcesando(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-800">⬆️ Cargar Cronograma Masivo</h3>
          <p className="text-sm text-gray-500 mt-1">Descarga la plantilla de una universidad, complétala y súbela de vuelta.</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Paso 1: plantilla */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">1. Descargar plantilla</p>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={universidadSeleccionada}
                onChange={e => setUniversidadSeleccionada(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white flex-1 min-w-[200px]"
              >
                <option value="">Seleccionar universidad...</option>
                {universidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button
                onClick={descargarPlantilla}
                disabled={descargando}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                {descargando ? 'Preparando...' : '📥 Descargar'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Por cada sesión: "Fecha N" y "Módulo N" son obligatorios, "Docente N" y "Teléfono N" son opcionales.
              Las sesiones ya cargadas salen pre-llenas con su histórico — solo agrega las fechas nuevas al final.
            </p>
          </div>

          {/* Paso 2: subir */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">2. Subir plantilla diligenciada</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={e => { if (e.target.files?.[0]) procesarArchivo(e.target.files[0]); }}
              className="text-sm"
            />
          </div>

          {/* Vista previa */}
          {preview && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 bg-primary/5 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-800">📄 {preview.nombreArchivo}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {preview.gruposCount} grupo(s) reconocido(s) · {preview.fechasCount} fecha(s) válida(s)
                  {preview.errores.length > 0 && ` · ${preview.errores.length} error(es)`}
                </p>
              </div>

              {preview.errores.length > 0 && (
                <div className="p-4 max-h-40 overflow-y-auto bg-red-50 border-b border-red-100">
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    {preview.errores.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div className="p-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={modoReemplazar} onChange={e => setModoReemplazar(e.target.checked)} className="rounded" />
                  Reemplazar el cronograma existente de estos grupos (en vez de solo agregar fechas nuevas)
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">Cancelar</button>
          <button
            onClick={confirmarCarga}
            disabled={!preview || preview.filasParaInsertar.length === 0 || procesando}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            {procesando ? 'Guardando...' : `Confirmar carga (${preview?.fechasCount || 0} fechas)`}
          </button>
        </div>
      </div>
    </div>
  );
}
