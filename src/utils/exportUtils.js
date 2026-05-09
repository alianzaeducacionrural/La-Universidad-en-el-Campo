// =============================================
// UTILIDADES DE EXPORTACIÓN (EXCEL Y PDF) - CORREGIDO
// =============================================

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { formatearFecha, limpiarEmojis } from './helpers';


// =============================================
// EXPORTAR A EXCEL
// =============================================

/**
 * Exporta una lista de estudiantes a Excel
 */
export function exportarEstudiantesExcel(estudiantes, grupoNombre) {
  const datos = estudiantes.map(e => ({
    'Nombre Completo': e.nombre_completo,
    'Documento': e.documento || 'N/A',
    'Género': e.genero || 'N/A',
    'Teléfono': e.telefono || 'N/A',
    'Correo': e.correo || 'N/A',
    'Municipio': e.municipio,
    'Institución Educativa': e.institucion_educativa,
    'Estado': e.estado || 'Activo',
    'Faltas': e.total_faltas || 0,
    'Acudiente': e.acudiente_nombre || 'N/A',
    'Tel. Acudiente': e.acudiente_telefono || 'N/A'
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
  XLSX.writeFile(wb, `Estudiantes_${grupoNombre?.replace(/\s+/g, '_') || 'grupo'}.xlsx`);
}

/**
 * Exporta historial de seguimientos a Excel
 */
export function exportarSeguimientosExcel(seguimientos, estudianteNombre) {
  const datos = seguimientos.map(s => ({
    'Fecha': formatearFecha(s.fecha_contacto),
    'Tipo de Gestión': limpiarEmojis(s.tipo_gestion),  // 🔥 LIMPIAR EMOJIS
    'Causa de Ausencia': limpiarEmojis(s.causa_ausencia) || 'N/A',  // 🔥 LIMPIAR EMOJIS
    'Resultado': s.resultado,
    'Padrino': s.padrino?.nombre_completo || 'Sistema'
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Seguimientos');
  XLSX.writeFile(wb, `Seguimientos_${estudianteNombre?.replace(/\s+/g, '_') || 'estudiante'}.xlsx`);
}

/**
 * Exporta reporte de inasistencias a Excel
 */
export function exportarInasistenciasExcel(inasistencias, grupoNombre) {
  const datos = inasistencias.map(i => ({
    'Estudiante': i.estudiante_nombre || i.estudiante?.nombre_completo,
    'Fecha': formatearFecha(i.fecha_inasistencia || i.fecha),
    'Módulo': i.modulo || 'N/A',
    'Docente': i.docente_nombre || 'N/A',
    'Estado Seguimiento': i.estado_seguimiento === 'realizado' ? 'Realizado' : 'Pendiente'
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inasistencias');
  XLSX.writeFile(wb, `Inasistencias_${grupoNombre?.replace(/\s+/g, '_') || 'grupo'}.xlsx`);
}

/**
 * Exporta KPIs del dashboard a Excel
 */
export function exportarKPIsExcel(kpis) {
  const datos = [{
    'Total Estudiantes': kpis.total_estudiantes || 0,
    'Activos': kpis.activos || 0,
    '% Activos': (kpis.activos_pct || 0) + '%',
    'Desertores': kpis.desertores || 0,
    '% Deserción': (kpis.desertores_pct || 0) + '%',
    'Graduados': kpis.graduados || 0,
    '% Graduación': (kpis.graduados_pct || 0) + '%',
    'En Riesgo': kpis.en_riesgo || 0,
    '% En Riesgo': (kpis.en_riesgo_pct || 0) + '%',
    'Grupos Totales': kpis.total_grupos || 0
  }];

  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KPIs');
  XLSX.writeFile(wb, 'Dashboard_KPIs.xlsx');
}

// =============================================
// EXPORTAR A PDF
// =============================================

/**
 * Exporta lista de estudiantes a PDF
 */
export function exportarEstudiantesPDF(estudiantes, grupoNombre) {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(16);
  doc.text(grupoNombre || 'Lista de Estudiantes', 14, 20);
  doc.setFontSize(12);
  doc.text(`Total: ${estudiantes.length} estudiantes`, 14, 28);
  
  // Tabla
  const datos = estudiantes.map(e => [
    e.nombre_completo,
    e.documento || 'N/A',
    e.municipio,
    e.institucion_educativa,
    e.estado || 'Activo',
    e.total_faltas || 0
  ]);

  // 🔥 USAR autoTable DIRECTAMENTE
  autoTable(doc, {
    startY: 35,
    head: [['Nombre', 'Documento', 'Municipio', 'Institución', 'Estado', 'Faltas']],
    body: datos,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 }
  });

  doc.save(`Estudiantes_${grupoNombre?.replace(/\s+/g, '_') || 'grupo'}.pdf`);
}

/**
 * Exporta notas finales de un grupo a Excel (hoja resumen + una hoja por módulo)
 */
export function exportarNotasGrupoExcel(notasModulos, grupoNombre) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Matriz resumen (estudiantes × módulos)
  if (notasModulos.length > 0) {
    const estudiantesMap = {};
    notasModulos.forEach(nm => {
      (nm.notas_estudiantes || []).forEach(ne => {
        if (ne.estudiante && !estudiantesMap[ne.estudiante_id]) {
          estudiantesMap[ne.estudiante_id] = ne.estudiante.nombre_completo;
        }
      });
    });

    const estudiantes = Object.entries(estudiantesMap)
      .sort((a, b) => a[1].localeCompare(b[1]));

    const cabeceras = [
      'Estudiante',
      ...notasModulos.map(nm => `${nm.modulo} (${formatearFecha(nm.fecha_evaluacion)})`),
      'Promedio'
    ];

    const filas = estudiantes.map(([estId, nombre]) => {
      const notasFila = notasModulos.map(nm => {
        const ne = nm.notas_estudiantes?.find(n => n.estudiante_id === estId);
        return ne?.nota ?? '';
      });
      const numericas = notasFila.filter(n => n !== '');
      const promedio = numericas.length > 0
        ? parseFloat((numericas.reduce((s, n) => s + n, 0) / numericas.length).toFixed(1))
        : '';
      return [nombre, ...notasFila, promedio];
    });

    const ws = XLSX.utils.aoa_to_sheet([cabeceras, ...filas]);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  // Una hoja por módulo
  notasModulos.forEach(nm => {
    const datos = (nm.notas_estudiantes || [])
      .filter(ne => ne.estudiante)
      .sort((a, b) => a.estudiante.nombre_completo.localeCompare(b.estudiante.nombre_completo))
      .map(ne => ({
        'Estudiante': ne.estudiante.nombre_completo,
        'Nota': ne.nota ?? 'N/R',
        'Estado': ne.nota !== null && ne.nota !== undefined
          ? (ne.nota >= 3.0 ? 'Aprobado' : 'Reprobado')
          : 'Sin nota',
        'Observaciones': ne.observaciones || ''
      }));

    if (datos.length > 0) {
      const ws = XLSX.utils.json_to_sheet(datos);
      XLSX.utils.book_append_sheet(wb, ws, nm.modulo.substring(0, 31));
    }
  });

  XLSX.writeFile(wb, `Notas_${grupoNombre?.replace(/\s+/g, '_') || 'grupo'}.xlsx`);
}

/**
 * Exporta historial académico de un estudiante a Excel
 */
export function exportarNotasEstudianteExcel(notas, estudianteNombre) {
  const datos = notas.map(ne => ({
    'Módulo': ne.notas_modulos?.modulo || 'N/A',
    'Fecha Evaluación': formatearFecha(ne.notas_modulos?.fecha_evaluacion),
    'Docente': ne.notas_modulos?.docente_nombre || 'N/A',
    'Nota': ne.nota ?? 'No registrada',
    'Estado': ne.nota !== null && ne.nota !== undefined
      ? (ne.nota >= 3.0 ? 'Aprobado' : 'Reprobado')
      : 'Sin nota',
    'Observaciones': ne.observaciones || ''
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial Académico');
  XLSX.writeFile(wb, `Notas_${estudianteNombre?.replace(/\s+/g, '_') || 'estudiante'}.xlsx`);
}

/**
 * Exporta historial de seguimientos a PDF
 */
export function exportarSeguimientosPDF(seguimientos, estudianteNombre) {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text('Historial de Seguimientos', 14, 20);
  doc.setFontSize(12);
  doc.text(`Estudiante: ${estudianteNombre || 'N/A'}`, 14, 28);
  
  const datos = seguimientos.map(s => [
    formatearFecha(s.fecha_contacto),
    limpiarEmojis(s.tipo_gestion),  // 🔥 LIMPIAR EMOJIS
    limpiarEmojis(s.causa_ausencia) || 'N/A',  // 🔥 LIMPIAR EMOJIS
    s.resultado?.substring(0, 50) || '',
    s.padrino?.nombre_completo || 'Sistema'
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Fecha', 'Tipo de Gestión', 'Causa', 'Resultado', 'Padrino']],
    body: datos,
    theme: 'grid',
    styles: { fontSize: 8 }
  });

  doc.save(`Seguimientos_${estudianteNombre?.replace(/\s+/g, '_') || 'estudiante'}.pdf`);
}