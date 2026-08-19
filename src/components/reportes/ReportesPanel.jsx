// =============================================
// COMPONENTE: PANEL DE REPORTES DESCARGABLES (REUTILIZABLE)
// =============================================
// Misma UI y lógica de descarga que src/pages/Reportes.jsx (admin/aliado),
// pero como componente embebible: el llamador ya trae los datos crudos
// alcance-limitados (a su universidad, institución, etc.) y este componente
// solo se encarga de filtrar en cliente, mostrar los KPIs por reporte y
// generar los Excel. Los nombres de columna reproducen exactamente los de
// Reportes.jsx para que ambos se mantengan consistentes.

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import FiltrosReportes, { FILTROS_VACIOS, aplicarFiltrosGenerico } from './FiltrosReportes';
import { ESTADOS_ESTUDIANTE } from '../../utils/constants';

const COLUMNAS_ESTUDIANTES = [
  'nombre_completo', 'documento', 'genero', 'telefono', 'correo',
  'municipio', 'institucion_educativa', 'universidad', 'programa',
  'cohorte', 'grupo_nombre', 'estado', 'total_faltas', 'acudiente_nombre', 'acudiente_telefono'
];
const LABELS_ESTUDIANTES = {
  nombre_completo: 'Nombre Completo', documento: 'Documento', genero: 'Género', telefono: 'Teléfono',
  correo: 'Correo', municipio: 'Municipio', institucion_educativa: 'Institución Educativa',
  universidad: 'Universidad', programa: 'Programa', cohorte: 'Cohorte', grupo_nombre: 'Grupo',
  estado: 'Estado', total_faltas: 'Faltas', acudiente_nombre: 'Acudiente', acudiente_telefono: 'Tel. Acudiente'
};

const COLUMNAS_DESERCION = [
  'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
  'universidad', 'programa', 'cohorte', 'grupo_nombre', 'tipo_desercion', 'motivo_principal',
  'motivo_otro', 'observaciones', 'fecha_reporte', 'reportado_por'
];
const LABELS_DESERCION = {
  nombre_completo: 'Estudiante', documento: 'Documento', municipio: 'Municipio',
  institucion_educativa: 'Institución Educativa', universidad: 'Universidad', programa: 'Programa',
  cohorte: 'Cohorte', grupo_nombre: 'Grupo', tipo_desercion: 'Tipo Deserción',
  motivo_principal: 'Motivo Principal', motivo_otro: 'Motivo Especificado', observaciones: 'Observaciones',
  fecha_reporte: 'Fecha Reporte', reportado_por: 'Reportado por'
};

const COLUMNAS_INASISTENCIAS = [
  'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
  'universidad', 'programa', 'cohorte', 'grupo_nombre', 'fecha', 'modulo', 'docente_nombre',
  'estado_seguimiento'
];
const LABELS_INASISTENCIAS = {
  nombre_completo: 'Estudiante', documento: 'Documento', municipio: 'Municipio',
  institucion_educativa: 'Institución Educativa', universidad: 'Universidad', programa: 'Programa',
  cohorte: 'Cohorte', grupo_nombre: 'Grupo', fecha: 'Fecha', modulo: 'Módulo',
  docente_nombre: 'Docente', estado_seguimiento: 'Estado Seguimiento'
};

const COLUMNAS_SEGUIMIENTOS = [
  'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
  'universidad', 'programa', 'cohorte', 'grupo_nombre', 'fecha_contacto', 'tipo_gestion',
  'causa_ausencia', 'resultado', 'padrino_nombre'
];
const LABELS_SEGUIMIENTOS = {
  nombre_completo: 'Estudiante', documento: 'Documento', municipio: 'Municipio',
  institucion_educativa: 'Institución Educativa', universidad: 'Universidad', programa: 'Programa',
  cohorte: 'Cohorte', grupo_nombre: 'Grupo', fecha_contacto: 'Fecha', tipo_gestion: 'Tipo Gestión',
  causa_ausencia: 'Causa', resultado: 'Resultado', padrino_nombre: 'Padrino'
};

const COLUMNAS_HOMOLOGACION = [
  'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
  'universidad', 'programa', 'cohorte', 'grupo_nombre', 'materia', 'grado', 'nota', 'estado'
];
const LABELS_HOMOLOGACION = {
  nombre_completo: 'Estudiante', documento: 'Documento', municipio: 'Municipio',
  institucion_educativa: 'Institución Educativa', universidad: 'Universidad', programa: 'Programa',
  cohorte: 'Cohorte', grupo_nombre: 'Grupo', materia: 'Materia', grado: 'Grado',
  nota: 'Nota', estado: 'Estado'
};

const COLORES_FONDO = {
  blue: 'border-blue-200 bg-blue-50',
  red: 'border-red-200 bg-red-50',
  amber: 'border-amber-200 bg-amber-50',
  green: 'border-green-200 bg-green-50',
  purple: 'border-purple-200 bg-purple-50'
};

function formatearFilas(data, columnas, labels) {
  return data.map(fila => {
    const obj = {};
    columnas.forEach(col => {
      if (col === 'total_faltas') { obj[labels[col]] = fila.total_faltas ?? fila.total_inasistencias ?? 0; return; }
      obj[labels[col] || col] = fila[col] || '';
    });
    return obj;
  });
}

function descargarExcelCompleto(datos, nombreArchivo) {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

function descargarExcelAgrupado(datos, campoAgrupacion, nombreArchivo) {
  const wb = XLSX.utils.book_new();
  const agrupado = {};
  datos.forEach(item => {
    const valor = item[campoAgrupacion] || 'Sin especificar';
    if (!agrupado[valor]) agrupado[valor] = [];
    agrupado[valor].push(item);
  });
  Object.entries(agrupado).sort().forEach(([nombreHoja, items]) => {
    const nombreCorto = nombreHoja.substring(0, 31).replace(/[\\[\]*?/]/g, '-');
    const ws = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(wb, ws, nombreCorto);
  });
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

export default function ReportesPanel({
  rawEstudiantes = [],
  rawDeserciones = [],
  rawInasistencias = [],
  rawSeguimientos = [],
  rawHomologacion = [],
  grupos = [],
  municipiosPermitidos = null,
  reportesVisibles: idsVisibles = ['estudiantes', 'deserciones', 'inasistencias', 'seguimientos'],
  cargando = false,
  prefijoArchivo = '',
  mostrarUniversidad = true
}) {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const gruposMap = useMemo(() => new Map(grupos.map(g => [g.id, g.nombre])), [grupos]);
  const conGrupoNombre = (filas, obtenerGrupoId) =>
    filas.map(f => ({ ...f, grupo_nombre: gruposMap.get(obtenerGrupoId(f)) || 'Sin grupo' }));

  const gettersComunes = {
    municipio: r => r.municipio,
    universidad: r => r.universidad,
    programa: r => r.programa,
    cohorte: r => r.cohorte,
    grupoId: r => r.grupo_id
  };

  function aplicarFiltros(filas, getters) {
    return aplicarFiltrosGenerico(filas, getters, filtros, municipiosPermitidos);
  }

  const gettersEstudiantes = { ...gettersComunes, estado: r => r.estado };
  const estudiantesFiltrados = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawEstudiantes, gettersEstudiantes), e => e.grupo_id),
    [rawEstudiantes, filtros, gruposMap, municipiosPermitidos]
  );

  const gettersDeserciones = { ...gettersComunes, fecha: r => r.fecha_reporte };
  const desercionesFiltradas = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawDeserciones, gettersDeserciones), d => d.grupo_id),
    [rawDeserciones, filtros, gruposMap, municipiosPermitidos]
  );

  const gettersInasistencias = { ...gettersComunes, fecha: r => r.fecha };
  const inasistenciasFiltradas = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawInasistencias, gettersInasistencias), i => i.grupo_id),
    [rawInasistencias, filtros, gruposMap, municipiosPermitidos]
  );

  const gettersSeguimientos = { ...gettersComunes, fecha: r => r.fecha_contacto };
  const seguimientosFiltrados = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawSeguimientos, gettersSeguimientos), s => s.grupo_id),
    [rawSeguimientos, filtros, gruposMap, municipiosPermitidos]
  );

  const homologacionFiltrada = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawHomologacion, gettersComunes), h => h.grupo_id),
    [rawHomologacion, filtros, gruposMap, municipiosPermitidos]
  );

  const cohortesDisponibles = useMemo(() => {
    const set = new Set(rawEstudiantes.map(e => e.cohorte).filter(Boolean));
    return Array.from(set).sort();
  }, [rawEstudiantes]);

  const opcionesFiltro = useMemo(() => {
    const conjunto = campo => {
      const set = new Set();
      [rawEstudiantes, rawDeserciones, rawInasistencias, rawSeguimientos, rawHomologacion].forEach(lista =>
        lista.forEach(r => { if (r[campo]) set.add(r[campo]); })
      );
      return Array.from(set).sort().map(v => ({ valor: v, label: v }));
    };
    return {
      municipios: conjunto('municipio').filter(m => !municipiosPermitidos || municipiosPermitidos.includes(m.valor)),
      universidades: conjunto('universidad'),
      programas: conjunto('programa'),
      cohortes: cohortesDisponibles.map(c => ({ valor: c, label: c })),
      grupos: grupos.map(g => ({ valor: g.id, label: g.nombre })),
      estados: Object.values(ESTADOS_ESTUDIANTE).map(e => ({ valor: e, label: e }))
    };
  }, [rawEstudiantes, rawDeserciones, rawInasistencias, rawSeguimientos, rawHomologacion, grupos, cohortesDisponibles, municipiosPermitidos]);

  const nombreArchivo = sufijo => `${prefijoArchivo ? prefijoArchivo + '_' : ''}${sufijo}`;

  const reportes = [
    {
      id: 'estudiantes',
      titulo: '👥 Listado General de Estudiantes',
      descripcion: 'Todos los estudiantes con datos completos',
      color: 'blue',
      total: estudiantesFiltrados.length,
      sinFecha: true,
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'programa', label: 'Por Programa' },
        { campo: 'grupo_nombre', label: 'Por Grupo' },
        { campo: 'estado', label: 'Por Estado' }
      ],
      descargarCompleto: () => descargarExcelCompleto(formatearFilas(estudiantesFiltrados, COLUMNAS_ESTUDIANTES, LABELS_ESTUDIANTES), nombreArchivo('Listado_General_Estudiantes')),
      descargarAgrupado: (campo, nombre) => descargarExcelAgrupado(formatearFilas(estudiantesFiltrados, COLUMNAS_ESTUDIANTES, LABELS_ESTUDIANTES), LABELS_ESTUDIANTES[campo] || campo, nombreArchivo(`Listado_Estudiantes_Por_${nombre}`))
    },
    {
      id: 'deserciones',
      titulo: '🚨 Reporte de Deserciones',
      descripcion: 'Estudiantes desertores con tipo, motivo y fecha',
      color: 'red',
      total: desercionesFiltradas.length,
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'grupo_nombre', label: 'Por Grupo' },
        { campo: 'tipo_desercion', label: 'Por Tipo (Justificada/Sin Justificar)' },
        { campo: 'motivo_principal', label: 'Por Motivo' }
      ],
      descargarCompleto: () => descargarExcelCompleto(formatearFilas(desercionesFiltradas, COLUMNAS_DESERCION, LABELS_DESERCION), nombreArchivo('Reporte_Deserciones')),
      descargarAgrupado: (campo, nombre) => descargarExcelAgrupado(formatearFilas(desercionesFiltradas, COLUMNAS_DESERCION, LABELS_DESERCION), LABELS_DESERCION[campo] || campo, nombreArchivo(`Reporte_Deserciones_Por_${nombre}`))
    },
    {
      id: 'inasistencias',
      titulo: '⚠️ Reporte de Inasistencias',
      descripcion: 'Todas las inasistencias con estado de seguimiento',
      color: 'amber',
      total: inasistenciasFiltradas.length,
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'grupo_nombre', label: 'Por Grupo' },
        { campo: 'estado_seguimiento', label: 'Por Estado (Pendiente/Realizado)' }
      ],
      descargarCompleto: () => descargarExcelCompleto(formatearFilas(inasistenciasFiltradas, COLUMNAS_INASISTENCIAS, LABELS_INASISTENCIAS), nombreArchivo('Reporte_Inasistencias')),
      descargarAgrupado: (campo, nombre) => descargarExcelAgrupado(formatearFilas(inasistenciasFiltradas, COLUMNAS_INASISTENCIAS, LABELS_INASISTENCIAS), LABELS_INASISTENCIAS[campo] || campo, nombreArchivo(`Reporte_Inasistencias_Por_${nombre}`))
    },
    {
      id: 'seguimientos',
      titulo: '📝 Reporte de Seguimientos',
      descripcion: 'Todos los seguimientos realizados por los padrinos',
      color: 'green',
      total: seguimientosFiltrados.length,
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'grupo_nombre', label: 'Por Grupo' },
        { campo: 'padrino_nombre', label: 'Por Padrino' },
        { campo: 'tipo_gestion', label: 'Por Tipo de Gestión' }
      ],
      descargarCompleto: () => descargarExcelCompleto(formatearFilas(seguimientosFiltrados, COLUMNAS_SEGUIMIENTOS, LABELS_SEGUIMIENTOS), nombreArchivo('Reporte_Seguimientos')),
      descargarAgrupado: (campo, nombre) => descargarExcelAgrupado(formatearFilas(seguimientosFiltrados, COLUMNAS_SEGUIMIENTOS, LABELS_SEGUIMIENTOS), LABELS_SEGUIMIENTOS[campo] || campo, nombreArchivo(`Reporte_Seguimientos_Por_${nombre}`))
    },
    {
      id: 'homologacion',
      titulo: '📘 Reporte de Reconocimiento de Aprendizajes',
      descripcion: 'Notas de homologación por materia y grado subidas por las instituciones',
      color: 'purple',
      total: homologacionFiltrada.length,
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'programa', label: 'Por Programa' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'grupo_nombre', label: 'Por Grupo' },
        { campo: 'institucion_educativa', label: 'Por Institución Educativa' },
        { campo: 'materia', label: 'Por Materia' },
        { campo: 'estado', label: 'Por Estado (Aprobado/Reprobado/Sin nota)' }
      ],
      descargarCompleto: () => descargarExcelCompleto(formatearFilas(homologacionFiltrada, COLUMNAS_HOMOLOGACION, LABELS_HOMOLOGACION), nombreArchivo('Reporte_Reconocimiento_Aprendizajes')),
      descargarAgrupado: (campo, nombre) => descargarExcelAgrupado(formatearFilas(homologacionFiltrada, COLUMNAS_HOMOLOGACION, LABELS_HOMOLOGACION), LABELS_HOMOLOGACION[campo] || campo, nombreArchivo(`Reporte_Reconocimiento_Aprendizajes_Por_${nombre}`))
    }
  ].filter(r => idsVisibles.includes(r.id));

  const hayFechaActiva = Boolean(filtros.fechaInicio || filtros.fechaFin);

  return (
    <div>
      <FiltrosReportes
        filtros={filtros}
        onCambio={setFiltros}
        opciones={opcionesFiltro}
        filas={rawEstudiantes}
        getters={gettersComunes}
        municipiosPermitidos={municipiosPermitidos}
        mostrarUniversidad={mostrarUniversidad}
      />

      {cargando ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-gray-500 mt-4">Cargando datos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reportes.map(reporte => (
            <div key={reporte.id} className={`rounded-xl border p-6 ${COLORES_FONDO[reporte.color]}`}>
              <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{reporte.titulo}</h3>
                  <p className="text-sm opacity-75">{reporte.descripcion}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1">
                    {reporte.total} registro{reporte.total === 1 ? '' : 's'} con los filtros actuales
                  </p>
                  {reporte.sinFecha && hayFechaActiva && (
                    <p className="text-xs text-gray-400 italic mt-0.5">Los filtros de fecha no aplican a este listado</p>
                  )}
                </div>
                <button
                  onClick={reporte.descargarCompleto}
                  disabled={reporte.total === 0}
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
                >
                  📥 Descargar Excel
                </button>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">📊 Por Categoría:</p>
                <div className="flex flex-wrap gap-2">
                  {reporte.categorias.map(cat => (
                    <button
                      key={cat.campo}
                      onClick={() => reporte.descargarAgrupado(cat.campo, cat.label.replace('Por ', ''))}
                      disabled={reporte.total === 0}
                      className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition disabled:opacity-50"
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
