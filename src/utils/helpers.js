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