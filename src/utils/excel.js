// =============================================
// UTILIDAD: ARMADO Y DESCARGA DE ARCHIVOS EXCEL
// =============================================

import * as XLSX from 'xlsx';

const LARGO_MAXIMO_HOJA = 31;

function limpiarNombreHoja(nombre) {
  const limpio = String(nombre ?? '')
    .replace(/[\/?*[\]:]/g, '-')
    .replace(/^'+|'+$/g, '')
    .trim();
  return (limpio || 'Hoja').slice(0, LARGO_MAXIMO_HOJA);
}

// Excel exige nombres de hoja únicos (sin distinguir mayúsculas) de máximo
// 31 caracteres; al recortar, nombres largos parecidos chocan y la librería
// falla, así que se numeran: "Saneamiento Ambiental - Ma (2)".
export function agregarHoja(wb, ws, nombreDeseado) {
  const base = limpiarNombreHoja(nombreDeseado);
  const existe = n => wb.SheetNames.some(s => s.toLowerCase() === n.toLowerCase());
  let nombre = base;
  for (let i = 2; existe(nombre); i++) {
    const sufijo = ` (${i})`;
    nombre = base.slice(0, LARGO_MAXIMO_HOJA - sufijo.length) + sufijo;
  }
  XLSX.utils.book_append_sheet(wb, ws, nombre);
  return nombre;
}

export function descargarExcelCompleto(filas, nombreArchivo) {
  const wb = XLSX.utils.book_new();
  agregarHoja(wb, XLSX.utils.json_to_sheet(filas), 'Datos');
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

// Una hoja por valor del campo, más una hoja "Índice" que relaciona cada
// hoja con su nombre completo (los nombres de hoja suelen quedar recortados).
export function descargarExcelAgrupado(filas, campoAgrupacion, nombreArchivo) {
  const grupos = new Map();
  filas.forEach(fila => {
    const valor = fila[campoAgrupacion] || 'Sin especificar';
    if (!grupos.has(valor)) grupos.set(valor, []);
    grupos.get(valor).push(fila);
  });
  const ordenados = [...grupos.entries()].sort(([a], [b]) => String(a).localeCompare(String(b), 'es'));

  const wb = XLSX.utils.book_new();
  const nombreIndice = agregarHoja(wb, XLSX.utils.aoa_to_sheet([[]]), 'Índice');
  const indice = ordenados.map(([valor, items]) => ({
    [campoAgrupacion]: valor,
    'Hoja': agregarHoja(wb, XLSX.utils.json_to_sheet(items), valor),
    'Registros': items.length
  }));
  wb.Sheets[nombreIndice] = XLSX.utils.json_to_sheet(indice);
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}
