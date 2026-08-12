// =============================================
// PÁGINA: REPORTES DESCARGABLES (CON FILTROS Y DESCARGA POR GRUPO)
// =============================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import FiltrosReportes, { FILTROS_VACIOS, aplicarFiltrosGenerico } from '../components/reportes/FiltrosReportes';
import * as XLSX from 'xlsx';
import { formatearFecha, limpiarEmojis, getMunicipiosPermitidos, esAliado } from '../utils/helpers';
import { ESTADOS_ESTUDIANTE } from '../utils/constants';

export default function Reportes({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('reportes');

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  // Datos crudos (una sola carga; el filtrado ocurre en cliente)
  const [rawEstudiantes, setRawEstudiantes] = useState([]);
  const [rawDeserciones, setRawDeserciones] = useState([]);
  const [rawInasistencias, setRawInasistencias] = useState([]);
  const [rawSeguimientos, setRawSeguimientos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [municipiosDb, setMunicipiosDb] = useState([]);
  const [universidadesDb, setUniversidadesDb] = useState([]);
  const [programasDb, setProgramasDb] = useState([]);

  // Municipios permitidos (null = todos). Los aliados solo descargan sus municipios.
  const municipiosPermitidos = getMunicipiosPermitidos(usuario);
  const soloLectura = esAliado(usuario?.rol);

  const gruposMap = useMemo(() => new Map(grupos.map(g => [g.id, g.nombre])), [grupos]);

  // Filtrado central — reemplaza al antiguo filtrarPorMunicipio.
  // El alcance del aliado (municipiosPermitidos) se aplica primero y
  // no se puede ampliar desde los filtros de esta página.
  function aplicarFiltros(filas, getters) {
    return aplicarFiltrosGenerico(filas, getters, filtros, municipiosPermitidos);
  }

  function conGrupoNombre(filas, obtenerGrupoId) {
    return filas.map(f => ({ ...f, grupo_nombre: gruposMap.get(obtenerGrupoId(f)) || 'Sin grupo' }));
  }

  const gettersComunes = {
    municipio: r => r.municipio,
    universidad: r => r.universidad,
    programa: r => r.programa,
    cohorte: r => r.cohorte,
    grupoId: r => r.grupo_id
  };

  // =============================================
  // FUNCIONES DE DESCARGA
  // =============================================

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
      const nombreCorto = nombreHoja.substring(0, 31).replace(/[\\\[\]\*\?\/]/g, '-');
      const ws = XLSX.utils.json_to_sheet(items);
      XLSX.utils.book_append_sheet(wb, ws, nombreCorto);
    });

    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
  }

  // =============================================
  // 1. LISTADO GENERAL DE ESTUDIANTES
  // =============================================

  const COLUMNAS_ESTUDIANTES = [
    'nombre_completo', 'documento', 'genero', 'telefono', 'correo',
    'municipio', 'institucion_educativa', 'universidad', 'programa',
    'cohorte', 'grupo_nombre', 'estado', 'total_faltas', 'acudiente_nombre', 'acudiente_telefono'
  ];

  const LABELS_ESTUDIANTES = {
    nombre_completo: 'Nombre Completo',
    documento: 'Documento',
    genero: 'Género',
    telefono: 'Teléfono',
    correo: 'Correo',
    municipio: 'Municipio',
    institucion_educativa: 'Institución Educativa',
    universidad: 'Universidad',
    programa: 'Programa',
    cohorte: 'Cohorte',
    grupo_nombre: 'Grupo',
    estado: 'Estado',
    total_faltas: 'Faltas',
    acudiente_nombre: 'Acudiente',
    acudiente_telefono: 'Tel. Acudiente'
  };

  async function obtenerEstudiantesCrudo() {
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('estudiantes')
        .select('*')
        .order('nombre_completo')
        .range(from, from + limit - 1);

      if (municipiosPermitidos) query = query.in('municipio', municipiosPermitidos);

      const { data, error } = await query;

      if (error) {
        console.error('Error:', error);
        break;
      }

      if (data && data.length > 0) {
        todosLosDatos = [...todosLosDatos, ...data];
        from += limit;
      }

      if (!data || data.length < limit) {
        hasMore = false;
      }
    }

    // Garantizar un único registro por estudiante (por id)
    const unicos = new Map();
    for (const est of todosLosDatos) {
      if (!unicos.has(est.id)) unicos.set(est.id, est);
    }
    return Array.from(unicos.values());
  }

  const gettersEstudiantes = { ...gettersComunes, estado: r => r.estado };
  const estudiantesFiltrados = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawEstudiantes, gettersEstudiantes), e => e.grupo_id),
    [rawEstudiantes, filtros, gruposMap, municipiosPermitidos]
  );

  function formatearEstudiantes(data) {
    return data.map(e => {
      const obj = {};
      COLUMNAS_ESTUDIANTES.forEach(col => {
        obj[LABELS_ESTUDIANTES[col] || col] = e[col] || '';
      });
      return obj;
    });
  }

  function descargarEstudiantesCompleto() {
    descargarExcelCompleto(formatearEstudiantes(estudiantesFiltrados), 'Listado_General_Estudiantes');
  }

  function descargarEstudiantesAgrupado(campo, nombre) {
    descargarExcelAgrupado(formatearEstudiantes(estudiantesFiltrados), LABELS_ESTUDIANTES[campo] || campo, `Listado_Estudiantes_Por_${nombre}`);
  }

  // =============================================
  // 2. REPORTE DE DESERCIONES
  // =============================================

  const COLUMNAS_DESERCION = [
    'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
    'universidad', 'programa', 'cohorte', 'grupo_nombre', 'tipo_desercion', 'motivo_principal',
    'motivo_otro', 'observaciones', 'fecha_reporte', 'reportado_por'
  ];

  const LABELS_DESERCION = {
    nombre_completo: 'Estudiante',
    documento: 'Documento',
    municipio: 'Municipio',
    institucion_educativa: 'Institución Educativa',
    universidad: 'Universidad',
    programa: 'Programa',
    cohorte: 'Cohorte',
    grupo_nombre: 'Grupo',
    tipo_desercion: 'Tipo Deserción',
    motivo_principal: 'Motivo Principal',
    motivo_otro: 'Motivo Especificado',
    observaciones: 'Observaciones',
    fecha_reporte: 'Fecha Reporte',
    reportado_por: 'Reportado por'
  };

  async function obtenerDesercionesCrudo() {
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('registros_desercion')
        .select(`*, estudiante:estudiante_id (*), usuario:usuario_id (nombre_completo)`)
        .order('fecha_reporte', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        console.error('Error:', error);
        break;
      }

      if (data && data.length > 0) {
        todosLosDatos = [...todosLosDatos, ...data];
        from += limit;
      }

      if (!data || data.length < limit) {
        hasMore = false;
      }
    }

    // Los datos vienen ordenados por fecha_reporte DESC. Se deja un único
    // registro por estudiante: el más reciente (evita duplicados por ediciones).
    const vistos = new Set();
    const unicos = [];
    for (const d of todosLosDatos) {
      const clave = d.estudiante_id;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      unicos.push({
        ...d,
        ...d.estudiante,
        reportado_por: d.usuario?.nombre_completo || ''
      });
    }

    return unicos;
  }

  const gettersDeserciones = { ...gettersComunes, fecha: r => r.fecha_reporte };
  const desercionesFiltradas = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawDeserciones, gettersDeserciones), d => d.grupo_id),
    [rawDeserciones, filtros, gruposMap, municipiosPermitidos]
  );

  function formatearDeserciones(data) {
    return data.map(d => {
      const obj = {};
      COLUMNAS_DESERCION.forEach(col => {
        obj[LABELS_DESERCION[col] || col] = d[col] || '';
      });
      return obj;
    });
  }

  function descargarDesercionesCompleto() {
    descargarExcelCompleto(formatearDeserciones(desercionesFiltradas), 'Reporte_Deserciones');
  }

  function descargarDesercionesAgrupado(campo, nombre) {
    descargarExcelAgrupado(formatearDeserciones(desercionesFiltradas), LABELS_DESERCION[campo] || campo, `Reporte_Deserciones_Por_${nombre}`);
  }

  // =============================================
  // 3. REPORTE DE INASISTENCIAS
  // =============================================

  const COLUMNAS_INASISTENCIAS = [
    'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
    'universidad', 'programa', 'cohorte', 'grupo_nombre', 'fecha', 'modulo', 'docente_nombre',
    'estado_seguimiento'
  ];

  const LABELS_INASISTENCIAS = {
    nombre_completo: 'Estudiante',
    documento: 'Documento',
    municipio: 'Municipio',
    institucion_educativa: 'Institución Educativa',
    universidad: 'Universidad',
    programa: 'Programa',
    cohorte: 'Cohorte',
    grupo_nombre: 'Grupo',
    fecha: 'Fecha',
    modulo: 'Módulo',
    docente_nombre: 'Docente',
    estado_seguimiento: 'Estado Seguimiento'
  };

  async function obtenerInasistenciasCrudo() {
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('inasistencias')
        .select(`*, estudiante:estudiante_id (*), registros_asistencia (fecha, modulo, docente_nombre)`)
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        console.error('Error:', error);
        break;
      }

      if (data && data.length > 0) {
        todosLosDatos = [...todosLosDatos, ...data];
        from += limit;
      }

      if (!data || data.length < limit) {
        hasMore = false;
      }
    }

    return todosLosDatos.map(i => ({
      ...i,
      ...i.estudiante,
      fecha: i.registros_asistencia?.fecha || '',
      modulo: i.registros_asistencia?.modulo || '',
      docente_nombre: i.registros_asistencia?.docente_nombre || '',
      estado_seguimiento:
        i.estado_seguimiento === 'realizado' ? 'Realizado' :
        i.estado_seguimiento === 'justificado' ? 'Justificado' : 'Pendiente'
    }));
  }

  const gettersInasistencias = { ...gettersComunes, fecha: r => r.fecha };
  const inasistenciasFiltradas = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawInasistencias, gettersInasistencias), i => i.grupo_id),
    [rawInasistencias, filtros, gruposMap, municipiosPermitidos]
  );

  function formatearInasistencias(data) {
    return data.map(i => {
      const obj = {};
      COLUMNAS_INASISTENCIAS.forEach(col => {
        obj[LABELS_INASISTENCIAS[col] || col] = i[col] || '';
      });
      return obj;
    });
  }

  function descargarInasistenciasCompleto() {
    descargarExcelCompleto(formatearInasistencias(inasistenciasFiltradas), 'Reporte_Inasistencias');
  }

  function descargarInasistenciasAgrupado(campo, nombre) {
    descargarExcelAgrupado(formatearInasistencias(inasistenciasFiltradas), LABELS_INASISTENCIAS[campo] || campo, `Reporte_Inasistencias_Por_${nombre}`);
  }

  // =============================================
  // 4. REPORTE DE SEGUIMIENTOS
  // =============================================

  const COLUMNAS_SEGUIMIENTOS = [
    'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
    'universidad', 'programa', 'cohorte', 'grupo_nombre', 'fecha_contacto', 'tipo_gestion',
    'causa_ausencia', 'resultado', 'padrino_nombre'
  ];

  const LABELS_SEGUIMIENTOS = {
    nombre_completo: 'Estudiante',
    documento: 'Documento',
    municipio: 'Municipio',
    institucion_educativa: 'Institución Educativa',
    universidad: 'Universidad',
    programa: 'Programa',
    cohorte: 'Cohorte',
    grupo_nombre: 'Grupo',
    fecha_contacto: 'Fecha',
    tipo_gestion: 'Tipo Gestión',
    causa_ausencia: 'Causa',
    resultado: 'Resultado',
    padrino_nombre: 'Padrino'
  };

  async function obtenerSeguimientosCrudo() {
    let todosLosDatos = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('seguimientos')
        .select(`*, estudiante:estudiante_id (*), padrino:padrino_id (nombre_completo)`)
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        console.error('Error:', error);
        break;
      }

      if (data && data.length > 0) {
        todosLosDatos = [...todosLosDatos, ...data];
        from += limit;
      }

      if (!data || data.length < limit) {
        hasMore = false;
      }
    }

    // Se aplana el estudiante al nivel superior, igual que en Deserciones,
    // para poder usar el mismo formateador dirigido por columnas.
    return todosLosDatos.map(s => ({
      ...s,
      ...s.estudiante,
      tipo_gestion: limpiarEmojis(s.tipo_gestion),
      causa_ausencia: limpiarEmojis(s.causa_ausencia) || '',
      padrino_nombre: s.padrino?.nombre_completo || 'N/A'
    }));
  }

  const gettersSeguimientos = { ...gettersComunes, fecha: r => r.fecha_contacto };
  const seguimientosFiltrados = useMemo(
    () => conGrupoNombre(aplicarFiltros(rawSeguimientos, gettersSeguimientos), s => s.grupo_id),
    [rawSeguimientos, filtros, gruposMap, municipiosPermitidos]
  );

  function formatearSeguimientos(data) {
    return data.map(s => {
      const obj = {};
      COLUMNAS_SEGUIMIENTOS.forEach(col => {
        if (col === 'fecha_contacto') {
          obj[LABELS_SEGUIMIENTOS[col]] = formatearFecha(s.fecha_contacto);
          return;
        }
        obj[LABELS_SEGUIMIENTOS[col] || col] = s[col] || '';
      });
      return obj;
    });
  }

  function descargarSeguimientosCompleto() {
    descargarExcelCompleto(formatearSeguimientos(seguimientosFiltrados), 'Reporte_Seguimientos');
  }

  function descargarSeguimientosAgrupado(campo, nombre) {
    descargarExcelAgrupado(formatearSeguimientos(seguimientosFiltrados), LABELS_SEGUIMIENTOS[campo] || campo, `Reporte_Seguimientos_Por_${nombre}`);
  }

  // =============================================
  // CARGA INICIAL (una sola vez)
  // =============================================

  useEffect(() => {
    async function cargarTodo() {
      setCargandoDatos(true);
      const [est, des, ina, seg, gruposRes, municipiosRes, universidadesRes, programasRes] = await Promise.all([
        obtenerEstudiantesCrudo(),
        obtenerDesercionesCrudo(),
        obtenerInasistenciasCrudo(),
        obtenerSeguimientosCrudo(),
        supabase.from('grupos').select('id, nombre, universidad, programa, cohorte').eq('activo', true).order('nombre'),
        supabase.from('municipios').select('nombre').order('nombre'),
        supabase.from('universidades').select('nombre').order('nombre'),
        supabase.from('programas').select('nombre').order('nombre')
      ]);
      setRawEstudiantes(est);
      setRawDeserciones(des);
      setRawInasistencias(ina);
      setRawSeguimientos(seg);
      setGrupos(gruposRes.data || []);
      setMunicipiosDb(municipiosRes.data || []);
      setUniversidadesDb(universidadesRes.data || []);
      setProgramasDb(programasRes.data || []);
      setCargandoDatos(false);
    }
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cohortesDisponibles = useMemo(() => {
    const set = new Set(rawEstudiantes.map(e => e.cohorte).filter(Boolean));
    return Array.from(set).sort();
  }, [rawEstudiantes]);

  const opcionesFiltro = useMemo(() => ({
    municipios: municipiosDb
      .filter(m => !municipiosPermitidos || municipiosPermitidos.includes(m.nombre))
      .map(m => ({ valor: m.nombre, label: m.nombre })),
    universidades: universidadesDb.map(u => ({ valor: u.nombre, label: u.nombre })),
    programas: programasDb.map(p => ({ valor: p.nombre, label: p.nombre })),
    cohortes: cohortesDisponibles.map(c => ({ valor: c, label: c })),
    grupos: grupos.map(g => ({ valor: g.id, label: `${g.nombre} — ${g.universidad}` })),
    estados: Object.values(ESTADOS_ESTUDIANTE).map(e => ({ valor: e, label: e }))
  }), [municipiosDb, universidadesDb, programasDb, grupos, cohortesDisponibles, municipiosPermitidos]);

  // =============================================
  // CONFIGURACIÓN DE REPORTES
  // =============================================

  const reportes = [
    {
      id: 'estudiantes',
      titulo: '👥 Listado General de Estudiantes',
      descripcion: 'Todos los estudiantes del sistema con datos completos',
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
      descargarCompleto: descargarEstudiantesCompleto,
      descargarAgrupado: descargarEstudiantesAgrupado
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
      descargarCompleto: descargarDesercionesCompleto,
      descargarAgrupado: descargarDesercionesAgrupado
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
      descargarCompleto: descargarInasistenciasCompleto,
      descargarAgrupado: descargarInasistenciasAgrupado
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
      descargarCompleto: descargarSeguimientosCompleto,
      descargarAgrupado: descargarSeguimientosAgrupado
    }
  ];

  const coloresFondo = {
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-green-200 bg-green-50'
  };

  // Los aliados solo pueden descargar el Listado General y el Reporte de Deserciones
  const reportesVisibles = soloLectura
    ? reportes.filter(r => r.id === 'estudiantes' || r.id === 'deserciones')
    : reportes;

  const hayFechaActiva = Boolean(filtros.fechaInicio || filtros.fechaFin);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario?.rol} />
      <div className="flex-1 min-w-0 pb-24 lg:pb-0">
        <Header onVerPerfil={onVerPerfil} />
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">📑 Reportes Descargables</h1>
          <p className="text-gray-600 mb-6">Descarga reportes en Excel con la información del sistema</p>

          <FiltrosReportes
            filtros={filtros}
            onCambio={setFiltros}
            opciones={opcionesFiltro}
            filas={rawEstudiantes}
            getters={gettersComunes}
            municipiosPermitidos={municipiosPermitidos}
          />

          {cargandoDatos ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-gray-500 mt-4">Cargando datos del sistema...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reportesVisibles.map(reporte => (
                <div key={reporte.id} className={`rounded-xl border p-6 ${coloresFondo[reporte.color]}`}>
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

                  {/* Categorías */}
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
      </div>
    </div>
  );
}
