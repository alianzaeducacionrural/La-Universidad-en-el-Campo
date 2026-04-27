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