// =============================================
// GENERACIÓN DE LA CARTA DE COBRO 1 EN FORMATO .DOCX
// =============================================
// Reemplaza tokens {{...}} en la plantilla public/plantillas/carta-cobro-1.docx
// (un .docx es un zip de XML) y descarga el resultado. La plantilla conserva el
// formato/membrete original tal cual fue entregado; solo cambian los datos del
// estudiante dentro de un único <w:t> por campo.

import JSZip from 'jszip';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function formatearFechaLarga(fechaISO) {
  const date = new Date(fechaISO);
  const adjustedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000));
  return `${adjustedDate.getDate()} de ${MESES[adjustedDate.getMonth()]} de ${adjustedDate.getFullYear()}`;
}

function escaparXml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generarCartaCobro1({ estudiante, valorTotal, fechaEmision }) {
  const respuesta = await fetch('/plantillas/carta-cobro-1.docx');
  if (!respuesta.ok) {
    throw new Error('No se pudo cargar la plantilla de la Carta de Cobro 1');
  }
  const buffer = await respuesta.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  let xml = await zip.file('word/document.xml').async('string');

  const valores = {
    '{{FECHA}}': formatearFechaLarga(fechaEmision),
    '{{NOMBRE_ESTUDIANTE}}': estudiante.nombre_completo?.toUpperCase(),
    '{{PROGRAMA_COHORTE}}': `${estudiante.programa} ${estudiante.cohorte}`,
    '{{INSTITUCION}}': estudiante.institucion_educativa,
    '{{CORREO}}': estudiante.correo,
    '{{TELEFONO}}': estudiante.telefono,
    '{{MUNICIPIO}}': estudiante.municipio,
    '{{VALOR_MULTA}}': `$${Math.round(valorTotal).toLocaleString('es-CO')}`
  };

  for (const [token, valor] of Object.entries(valores)) {
    xml = xml.split(token).join(escaparXml(valor));
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const nombreArchivo = `Carta_Cobro_1_${estudiante.nombre_completo?.replace(/\s+/g, '_')}.docx`;
  descargarBlob(blob, nombreArchivo);
}
