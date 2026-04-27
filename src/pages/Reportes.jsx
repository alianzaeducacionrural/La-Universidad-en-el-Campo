// =============================================
// PÁGINA: REPORTES DESCARGABLES
// =============================================

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import * as XLSX from 'xlsx';
import { formatearFecha, limpiarEmojis } from '../utils/helpers';

export default function Reportes({ onVerPerfil }) {
  const { perfil: usuario } = useAuth();
  const [vistaActiva, setVistaActiva] = useState('reportes');
  const [cargando, setCargando] = useState({});

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
    'cohorte', 'estado', 'total_faltas', 'acudiente_nombre', 'acudiente_telefono'
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
    estado: 'Estado',
    total_faltas: 'Faltas',
    acudiente_nombre: 'Acudiente',
    acudiente_telefono: 'Tel. Acudiente'
  };

  async function obtenerEstudiantes() {
    const { data } = await supabase.from('estudiantes').select('*').order('nombre_completo');
    return data || [];
  }

  function formatearEstudiantes(data) {
    return data.map(e => {
      const obj = {};
      COLUMNAS_ESTUDIANTES.forEach(col => {
        obj[LABELS_ESTUDIANTES[col] || col] = e[col] || '';
      });
      return obj;
    });
  }

  async function descargarEstudiantesCompleto() {
    setCargando(prev => ({ ...prev, estudiantesCompleto: true }));
    const data = await obtenerEstudiantes();
    descargarExcelCompleto(formatearEstudiantes(data), 'Listado_General_Estudiantes');
    setCargando(prev => ({ ...prev, estudiantesCompleto: false }));
  }

  async function descargarEstudiantesAgrupado(campo, nombre) {
    setCargando(prev => ({ ...prev, [`estudiantes_${campo}`]: true }));
    const data = await obtenerEstudiantes();
    descargarExcelAgrupado(formatearEstudiantes(data), LABELS_ESTUDIANTES[campo] || campo, `Listado_Estudiantes_Por_${nombre}`);
    setCargando(prev => ({ ...prev, [`estudiantes_${campo}`]: false }));
  }

  // =============================================
  // 2. REPORTE DE DESERCIONES
  // =============================================

  const COLUMNAS_DESERCION = [
    'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
    'universidad', 'programa', 'cohorte', 'tipo_desercion', 'motivo_principal',
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
    tipo_desercion: 'Tipo Deserción',
    motivo_principal: 'Motivo Principal',
    motivo_otro: 'Motivo Especificado',
    observaciones: 'Observaciones',
    fecha_reporte: 'Fecha Reporte',
    reportado_por: 'Reportado por'
  };

  async function obtenerDeserciones() {
    const { data } = await supabase
      .from('registros_desercion')
      .select(`*, estudiante:estudiante_id (*), usuario:usuario_id (nombre_completo)`)
      .order('fecha_reporte', { ascending: false });
    
    return (data || []).map(d => ({
      ...d,
      ...d.estudiante,
      reportado_por: d.usuario?.nombre_completo || ''
    }));
  }

  function formatearDeserciones(data) {
    return data.map(d => {
      const obj = {};
      COLUMNAS_DESERCION.forEach(col => {
        obj[LABELS_DESERCION[col] || col] = d[col] || '';
      });
      return obj;
    });
  }

  async function descargarDesercionesCompleto() {
    setCargando(prev => ({ ...prev, desercionesCompleto: true }));
    const data = await obtenerDeserciones();
    descargarExcelCompleto(formatearDeserciones(data), 'Reporte_Deserciones');
    setCargando(prev => ({ ...prev, desercionesCompleto: false }));
  }

  async function descargarDesercionesAgrupado(campo, nombre) {
    setCargando(prev => ({ ...prev, [`deserciones_${campo}`]: true }));
    const data = await obtenerDeserciones();
    descargarExcelAgrupado(formatearDeserciones(data), LABELS_DESERCION[campo] || campo, `Reporte_Deserciones_Por_${nombre}`);
    setCargando(prev => ({ ...prev, [`deserciones_${campo}`]: false }));
  }

  // =============================================
  // 3. REPORTE DE INASISTENCIAS
  // =============================================

  const COLUMNAS_INASISTENCIAS = [
    'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
    'universidad', 'programa', 'cohorte', 'fecha', 'modulo', 'docente_nombre',
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
    fecha: 'Fecha',
    modulo: 'Módulo',
    docente_nombre: 'Docente',
    estado_seguimiento: 'Estado Seguimiento'
  };

  async function obtenerInasistencias() {
    const { data } = await supabase
      .from('inasistencias')
      .select(`*, estudiante:estudiante_id (*), registros_asistencia (fecha, modulo, docente_nombre)`)
      .order('created_at', { ascending: false });
    
    return (data || []).map(i => ({
      ...i,
      ...i.estudiante,
      fecha: i.registros_asistencia?.fecha || '',
      modulo: i.registros_asistencia?.modulo || '',
      docente_nombre: i.registros_asistencia?.docente_nombre || '',
      estado_seguimiento: i.estado_seguimiento === 'realizado' ? 'Realizado' : 'Pendiente'
    }));
  }

  function formatearInasistencias(data) {
    return data.map(i => {
      const obj = {};
      COLUMNAS_INASISTENCIAS.forEach(col => {
        obj[LABELS_INASISTENCIAS[col] || col] = i[col] || '';
      });
      return obj;
    });
  }

  async function descargarInasistenciasCompleto() {
    setCargando(prev => ({ ...prev, inasistenciasCompleto: true }));
    const data = await obtenerInasistencias();
    descargarExcelCompleto(formatearInasistencias(data), 'Reporte_Inasistencias');
    setCargando(prev => ({ ...prev, inasistenciasCompleto: false }));
  }

  async function descargarInasistenciasAgrupado(campo, nombre) {
    setCargando(prev => ({ ...prev, [`inasistencias_${campo}`]: true }));
    const data = await obtenerInasistencias();
    descargarExcelAgrupado(formatearInasistencias(data), LABELS_INASISTENCIAS[campo] || campo, `Reporte_Inasistencias_Por_${nombre}`);
    setCargando(prev => ({ ...prev, [`inasistencias_${campo}`]: false }));
  }

  // =============================================
  // 4. REPORTE DE SEGUIMIENTOS
  // =============================================

  const COLUMNAS_SEGUIMIENTOS = [
    'nombre_completo', 'documento', 'municipio', 'institucion_educativa',
    'universidad', 'programa', 'cohorte', 'fecha_contacto', 'tipo_gestion',
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
    fecha_contacto: 'Fecha',
    tipo_gestion: 'Tipo Gestión',
    causa_ausencia: 'Causa',
    resultado: 'Resultado',
    padrino_nombre: 'Padrino'
  };

  async function obtenerSeguimientos() {
    const { data } = await supabase
      .from('seguimientos')
      .select(`*, estudiante:estudiante_id (*), padrino:padrino_id (nombre_completo)`)
      .order('created_at', { ascending: false });
    
    return (data || []).map(s => ({
      ...s,
      ...s.estudiante,
      padrino_nombre: s.padrino?.nombre_completo || ''
    }));
  }

  function formatearSeguimientos(data) {
    return data.map(s => ({
      'Estudiante': s.estudiante?.nombre_completo || 'N/A',
      'Documento': s.estudiante?.documento || 'N/A',
      'Fecha': formatearFecha(s.fecha_contacto),
      'Tipo Gestión': limpiarEmojis(s.tipo_gestion),
      'Causa': limpiarEmojis(s.causa_ausencia) || 'N/A',
      'Resultado': s.resultado,
      'Padrino': s.padrino?.nombre_completo || 'N/A'
    }));
  }

  async function descargarSeguimientosCompleto() {
    setCargando(prev => ({ ...prev, seguimientosCompleto: true }));
    const data = await obtenerSeguimientos();
    descargarExcelCompleto(formatearSeguimientos(data), 'Reporte_Seguimientos');
    setCargando(prev => ({ ...prev, seguimientosCompleto: false }));
  }

  async function descargarSeguimientosAgrupado(campo, nombre) {
    setCargando(prev => ({ ...prev, [`seguimientos_${campo}`]: true }));
    const data = await obtenerSeguimientos();
    descargarExcelAgrupado(formatearSeguimientos(data), LABELS_SEGUIMIENTOS[campo] || campo, `Reporte_Seguimientos_Por_${nombre}`);
    setCargando(prev => ({ ...prev, [`seguimientos_${campo}`]: false }));
  }

  // =============================================
  // CONFIGURACIÓN DE REPORTES
  // =============================================

  const reportes = [
    {
      id: 'estudiantes',
      titulo: '👥 Listado General de Estudiantes',
      descripcion: 'Todos los estudiantes del sistema',
      color: 'blue',
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'programa', label: 'Por Programa' },
        { campo: 'estado', label: 'Por Estado' }
      ],
      descargarCompleto: descargarEstudiantesCompleto,
      descargarAgrupado: descargarEstudiantesAgrupado,
      loadingKey: 'estudiantes'
    },
    {
      id: 'deserciones',
      titulo: '🚨 Reporte de Deserciones',
      descripcion: 'Estudiantes desertores con tipo, motivo y documentos',
      color: 'red',
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'tipo_desercion', label: 'Por Tipo (Justificada/Sin Justificar)' },
        { campo: 'motivo_principal', label: 'Por Motivo' }
      ],
      descargarCompleto: descargarDesercionesCompleto,
      descargarAgrupado: descargarDesercionesAgrupado,
      loadingKey: 'deserciones'
    },
    {
      id: 'inasistencias',
      titulo: '⚠️ Reporte de Inasistencias',
      descripcion: 'Todas las inasistencias con estado de seguimiento',
      color: 'amber',
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'estado_seguimiento', label: 'Por Estado (Pendiente/Realizado)' }
      ],
      descargarCompleto: descargarInasistenciasCompleto,
      descargarAgrupado: descargarInasistenciasAgrupado,
      loadingKey: 'inasistencias'
    },
    {
      id: 'seguimientos',
      titulo: '📝 Reporte de Seguimientos',
      descripcion: 'Todos los seguimientos realizados por los padrinos',
      color: 'green',
      categorias: [
        { campo: 'municipio', label: 'Por Municipio' },
        { campo: 'universidad', label: 'Por Universidad' },
        { campo: 'cohorte', label: 'Por Cohorte' },
        { campo: 'padrino_nombre', label: 'Por Padrino' },
        { campo: 'tipo_gestion', label: 'Por Tipo de Gestión' }
      ],
      descargarCompleto: descargarSeguimientosCompleto,
      descargarAgrupado: descargarSeguimientosAgrupado,
      loadingKey: 'seguimientos'
    }
  ];

  const coloresFondo = {
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-green-200 bg-green-50'
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} rol={usuario?.rol} />
      <div className="flex-1">
        <Header onVerPerfil={onVerPerfil} />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">📑 Reportes Descargables</h1>
          <p className="text-gray-600 mb-8">Descarga reportes en Excel con la información del sistema</p>

          <div className="space-y-6">
            {reportes.map(reporte => (
              <div key={reporte.id} className={`rounded-xl border p-6 ${coloresFondo[reporte.color]}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{reporte.titulo}</h3>
                    <p className="text-sm opacity-75">{reporte.descripcion}</p>
                  </div>
                  <button
                    onClick={reporte.descargarCompleto}
                    disabled={cargando[`${reporte.loadingKey}Completo`]}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {cargando[`${reporte.loadingKey}Completo`] ? 'Descargando...' : '📥 Descargar Excel'}
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
                        disabled={cargando[`${reporte.loadingKey}_${cat.campo}`]}
                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 transition disabled:opacity-50"
                      >
                        {cargando[`${reporte.loadingKey}_${cat.campo}`] ? '...' : cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}