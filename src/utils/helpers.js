// =============================================
// FUNCIONES AUXILIARES
// =============================================

import {
  COLORES_ESTADO,
  COLORES_ROL,
  ROLES_GESTION,
  ROLES,
  NOMBRES_ROLES,
  NOMBRES_ROLES_UNIVERSIDAD,
  COLORES_ROL_UNIVERSIDAD
} from './constants';

export const getEstadoColor = (estado) => {
  return COLORES_ESTADO[estado] || 'bg-gray-100 text-gray-700 border-gray-300';
};

// Deriva el checklist de pasos del proceso de deserción a partir del registro (con su
// `tipo_desercion`, `paso_manual_completado` y `documentos` embebidos) — no se guarda como
// un texto de "estado actual" para evitar desincronización si se borra un documento.
export const calcularPasosDesercion = (registro) => {
  if (!registro || !registro.tipo_desercion) return [];
  const docs = registro.documentos || [];
  const tieneDoc = (tipo) => docs.some(d => d.tipo_documento === tipo);
  const base = [{ key: 'retiro_ie', label: 'Retiro de la I.E.', tipo: 'auto', completado: true }];

  if (registro.tipo_desercion === 'Sin Justificar') {
    return [
      ...base,
      { key: 'confirmacion_retiro', label: 'Confirmación del retiro sin justificar', tipo: 'manual', completado: !!registro.paso_manual_completado },
      { key: 'carta_cobro_1', label: 'Carta cobro 1', tipo: 'auto', completado: tieneDoc('carta_cobro_1') },
      { key: 'carta_cobro_2', label: 'Carta cobro 2', tipo: 'auto', completado: tieneDoc('carta_cobro_2') },
      { key: 'carta_cobro_3', label: 'Carta cobro 3', tipo: 'auto', completado: tieneDoc('carta_cobro_3') }
    ];
  }

  return [
    ...base,
    { key: 'evidencia_justificado', label: 'Evidencia del Retiro Justificado', tipo: 'manual', completado: !!registro.paso_manual_completado },
    { key: 'cierre_caso', label: 'Cierre de caso', tipo: 'auto', completado: tieneDoc('cierre_caso') }
  ];
};

export const getRolColor = (rol) => {
  return COLORES_ROL[rol] || 'bg-gray-100 text-gray-700';
};

export const getNombreRolUniversidad = (rol) => {
  return NOMBRES_ROLES_UNIVERSIDAD[rol] || rol;
};

export const getRolColorUniversidad = (rol) => {
  return COLORES_ROL_UNIVERSIDAD[rol] || 'bg-gray-100 text-gray-700';
};

export const getNombreRol = (rol) => {
  return NOMBRES_ROLES[rol] || rol;
};

export const puedeGestionar = (rol) => {
  return ROLES_GESTION.includes(rol);
};

// El aliado es un rol de solo lectura con acceso limitado a sus municipios
export const esAliado = (rol) => rol === ROLES.ALIADO;

// Devuelve la lista de municipios permitidos para el usuario, o null si puede ver todos.
// Los aliados solo pueden ver la información de sus municipios asignados.
export const getMunicipiosPermitidos = (perfil) => {
  if (perfil?.rol === ROLES.ALIADO) {
    return Array.isArray(perfil.municipios_asignados) ? perfil.municipios_asignados : [];
  }
  return null;
};

// Un padrino puede tener asignado un grupo completo (instituciones_asignadas = null) o solo
// una o varias instituciones dentro de ese grupo. `gruposAsignados` es el array de useGrupos,
// donde cada grupo lleva su propio `instituciones_asignadas`. `item` es cualquier registro
// con `grupo_id` + `institucion_educativa` (estudiante, o fila ya hidratada con esos datos).
export const enAlcancePadrino = (item, gruposAsignados) => {
  const asignacion = gruposAsignados.find(g => g.id === item.grupo_id);
  if (!asignacion) return false;
  return !asignacion.instituciones_asignadas || asignacion.instituciones_asignadas.includes(item.institucion_educativa);
};

export const filtrarPorAlcancePadrino = (items, gruposAsignados) =>
  items.filter(item => enAlcancePadrino(item, gruposAsignados));

// A partir de filas planas {grupo_id, institucion_educativa} de grupo_padrino (un padrino
// puede tener varias filas para el mismo grupo, una por institución delegada), agrupa por
// grupo devolviendo un Map(grupo_id -> instituciones_asignadas). Si hay alguna fila general
// (institución null) para ese grupo, el valor queda en null (sin restricción); si no, es el
// arreglo de instituciones delegadas.
export const agruparInstitucionesPorGrupo = (filas) => {
  const porGrupo = new Map();
  (filas || []).forEach(({ grupo_id, institucion_educativa }) => {
    const actual = porGrupo.get(grupo_id);
    if (actual === undefined) {
      porGrupo.set(grupo_id, institucion_educativa ? [institucion_educativa] : null);
    } else if (actual && institucion_educativa) {
      actual.push(institucion_educativa);
    } else {
      porGrupo.set(grupo_id, null);
    }
  });
  return porGrupo;
};

// Fecha de "hoy" en la zona horaria de Colombia (America/Bogota), como
// 'YYYY-MM-DD'. new Date().toISOString() usa UTC, que va varias horas
// adelante de Colombia y puede hacer que una fecha de "mañana" en Bogotá
// se cuente como si ya hubiera pasado — usar esto para comparar contra
// columnas `date` (fecha de cronograma, asistencia, etc.).
export const obtenerFechaColombiaHoy = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
};

const DIACRITICOS_REGEX = /[̀-ͯ]/g;

// Normaliza texto para comparar sin distinguir mayúsculas/acentos — nombres de
// módulo que el docente escribió ligeramente distinto al programado siguen
// contando como la misma sesión.
export const normalizarTexto = (txt) => {
  return (txt || '').toString().trim().toLowerCase().normalize('NFD').replace(DIACRITICOS_REGEX, '');
};

// Cruza el cronograma de un grupo contra lo efectivamente reportado en
// registros_asistencia. La fecha es la clave confiable — la asistencia se
// sube el día de la clase — así que primero se busca un reporte de esa
// fecha con el mismo módulo (normalizado) y, si no hay, se usa igual
// cualquier reporte de esa fecha (se asume la misma sesión, escrita
// distinto). Cuando hay reporte, sus datos (módulo, docente, teléfono) son
// los que se muestran: reflejan lo que realmente pasó, no lo planeado con
// anticipación. Lo programado originalmente (columnas *_original, fijadas
// una sola vez al crear la fila) queda disponible aparte para que se pueda
// comparar qué cambió.
export const cruzarCronogramaConAsistencia = (cronograma = [], registrosAsistencia = [], hoy = obtenerFechaColombiaHoy()) => {
  return cronograma.map(c => {
    const delDia = registrosAsistencia.filter(r => r.fecha === c.fecha);
    const reportado = delDia.find(r => normalizarTexto(r.modulo) === normalizarTexto(c.modulo)) || delDia[0] || null;

    const estado = reportado ? 'confirmada' : c.fecha <= hoy ? 'pendiente' : 'programada';
    const moduloEfectivo = reportado?.modulo || c.modulo;
    const docenteEfectivo = reportado?.docente_nombre || c.docente_universitario;
    const telefonoEfectivo = reportado?.docente_telefono || c.telefono_contacto;

    const moduloOriginal = c.modulo_original ?? c.modulo;
    const docenteOriginal = c.docente_original ?? c.docente_universitario;
    const telefonoOriginal = c.telefono_original ?? c.telefono_contacto;

    const huboAjuste = !!reportado && (
      normalizarTexto(moduloEfectivo) !== normalizarTexto(moduloOriginal) ||
      normalizarTexto(docenteEfectivo) !== normalizarTexto(docenteOriginal) ||
      (telefonoEfectivo || '') !== (telefonoOriginal || '')
    );

    return {
      ...c,
      estado,
      moduloEfectivo, docenteEfectivo, telefonoEfectivo,
      moduloOriginal, docenteOriginal, telefonoOriginal,
      huboAjuste
    };
  });
};

// 🔥 UNA SOLA DECLARACIÓN DE formatearFecha
export const formatearFecha = (fecha, formato = 'completa') => {
  if (!fecha) return 'N/A';
  
  const date = new Date(fecha);
  const adjustedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000));
  
  if (formato === 'corta') {
    return adjustedDate.toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }
  
  if (formato === 'corta-con-año') {
    const dia = String(adjustedDate.getDate()).padStart(2, '0');
    const mes = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const anio = String(adjustedDate.getFullYear()).slice(-2);
    return `${dia}/${mes}/${anio}`;
  }
  
  return adjustedDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatearFechaInput = (fecha) => {
  if (!fecha) return '';
  const date = new Date(fecha);
  const adjustedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000));
  return adjustedDate.toISOString().split('T')[0];
};

// A partir de las filas de cronograma_clases de un grupo (esperadas ordenadas
// por fecha descendente), arma las listas de módulos/docentes conocidos y el
// docente más reciente asociado a cada módulo, para precargar formularios.
export const derivarModulosYDocentes = (cronograma = []) => {
  const modulos = [...new Set(cronograma.map(c => c.modulo).filter(Boolean))].sort();
  const docentes = [...new Set(cronograma.map(c => c.docente_universitario).filter(Boolean))].sort();
  const docentePorModulo = {};
  cronograma.forEach(c => {
    if (c.modulo && c.docente_universitario && !docentePorModulo[c.modulo]) {
      docentePorModulo[c.modulo] = c.docente_universitario;
    }
  });
  return { modulos, docentes, docentePorModulo };
};

export const truncarTexto = (texto, maxLength = 100) => {
  if (!texto || texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength) + '...';
};

export const capitalizar = (texto) => {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

const REEMPLAZOS_EMOJI = new Map([
  ['📞 Llamada Telefónica', 'Llamada Telefónica'],
  ['💬 WhatsApp', 'WhatsApp'],
  ['✉️ Correo Electrónico', 'Correo Electrónico'],
  ['🏫 Visita Institución', 'Visita Institución'],
  ['📡 Conectividad / Sin Señal', 'Conectividad / Sin Señal'],
  ['🏥 Problemas de Salud', 'Problemas de Salud'],
  ['🌾 Labores de Cosecha', 'Labores de Cosecha'],
  ['📚 Dificultad Académica', 'Dificultad Académica'],
  ['💰 Situación Económica', 'Situación Económica'],
  ['👨‍👩‍👧 Situación Familiar', 'Situación Familiar'],
  ['📋 Otro', 'Otro'],
]);

const REGEX_EMOJIS_COMUNES = /📞|💬|✉️|🏫|📡|🏥|🌾|📚|💰|👨‍👩‍👧|📋/g;

export const limpiarEmojis = (texto) => {
  if (!texto) return '';
  const exacto = REEMPLAZOS_EMOJI.get(texto);
  if (exacto) return exacto;
  return texto.replace(REGEX_EMOJIS_COMUNES, '').replace(/\s+/g, ' ').trim();
};

export const interpretarError = (error) => {
  if (!error) return 'Ocurrió un error inesperado. Intenta de nuevo.';
  const msg = typeof error === 'string' ? error : error.message || '';
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists'))
    return 'Ya existe un registro con esos datos (correo o documento duplicado).';
  if (msg.includes('foreign key') || msg.includes('violates foreign key'))
    return 'Error de referencia: uno de los valores seleccionados ya no existe.';
  if (msg.includes('null value') || msg.includes('not-null constraint'))
    return 'Faltan campos obligatorios. Revisa el formulario e intenta de nuevo.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch'))
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
  if (msg.includes('JWT') || msg.includes('session') || msg.includes('token'))
    return 'Tu sesión expiró. Recarga la página e inicia sesión nuevamente.';
  return 'No se pudo completar la operación. Intenta de nuevo.';
};