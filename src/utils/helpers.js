// =============================================
// FUNCIONES AUXILIARES
// =============================================

import { 
  COLORES_ESTADO, 
  COLORES_ROL, 
  ROLES_GESTION,
  NOMBRES_ROLES,
  NOMBRES_ROLES_UNIVERSIDAD,
  COLORES_ROL_UNIVERSIDAD
} from './constants';

export const getEstadoColor = (estado) => {
  return COLORES_ESTADO[estado] || 'bg-gray-100 text-gray-700 border-gray-300';
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

export const limpiarEmojis = (texto) => {
  if (!texto) return '';
  
  const reemplazos = {
    '📞 Llamada Telefónica': 'Llamada Telefónica',
    '💬 WhatsApp': 'WhatsApp',
    '✉️ Correo Electrónico': 'Correo Electrónico',
    '🏫 Visita Institución': 'Visita Institución',
    '📡 Conectividad / Sin Señal': 'Conectividad / Sin Señal',
    '🏥 Problemas de Salud': 'Problemas de Salud',
    '🌾 Labores de Cosecha': 'Labores de Cosecha',
    '📚 Dificultad Académica': 'Dificultad Académica',
    '💰 Situación Económica': 'Situación Económica',
    '👨‍👩‍👧 Situación Familiar': 'Situación Familiar',
    '📋 Otro': 'Otro',
  };

  if (reemplazos[texto]) return reemplazos[texto];

  let resultado = texto;
  const emojisComunes = ['📞', '💬', '✉️', '🏫', '📡', '🏥', '🌾', '📚', '💰', '👨‍👩‍👧', '📋'];
  emojisComunes.forEach(emoji => {
    resultado = resultado.replace(new RegExp(emoji, 'g'), '');
  });

  return resultado.replace(/\s+/g, ' ').trim();
};