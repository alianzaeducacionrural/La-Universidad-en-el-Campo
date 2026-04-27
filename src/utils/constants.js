// =============================================
// CONSTANTES DEL SISTEMA
// =============================================

// Estados de estudiantes
export const ESTADOS_ESTUDIANTE = {
  ACTIVO: 'Activo',
  EN_RIESGO: 'En Riesgo',
  DESERTOR: 'Desertor',
  GRADUADO: 'Graduado'
};

// Colores por estado (para Tailwind)
export const COLORES_ESTADO = {
  [ESTADOS_ESTUDIANTE.ACTIVO]: 'bg-green-100 text-green-700 border-green-300',
  [ESTADOS_ESTUDIANTE.EN_RIESGO]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  [ESTADOS_ESTUDIANTE.DESERTOR]: 'bg-red-100 text-red-700 border-red-300',
  [ESTADOS_ESTUDIANTE.GRADUADO]: 'bg-blue-100 text-blue-700 border-blue-300'
};

// Roles del sistema
export const ROLES = {
  ADMIN: 'admin',
  COORD_SUPERIOR: 'coord_superior',
  COORD_PEDAGOGICO: 'coord_pedagogico',
  ASISTENTE_ADMIN: 'asistente_admin',
  PADRINO: 'padrino'
};

// Colores por rol
export const COLORES_ROL = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-700',
  [ROLES.COORD_SUPERIOR]: 'bg-blue-100 text-blue-700',
  [ROLES.COORD_PEDAGOGICO]: 'bg-indigo-100 text-indigo-700',
  [ROLES.ASISTENTE_ADMIN]: 'bg-purple-100 text-purple-700',
  [ROLES.PADRINO]: 'bg-green-100 text-green-700'
};

// Nombres legibles de roles
export const NOMBRES_ROLES = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.COORD_SUPERIOR]: 'Coordinador de Educación Superior',
  [ROLES.COORD_PEDAGOGICO]: 'Coordinador Pedagógico',
  [ROLES.ASISTENTE_ADMIN]: 'Asistente Administrativo',
  [ROLES.PADRINO]: 'Padrino'
};

// Roles que pueden gestionar (crear grupos, importar, etc.)
export const ROLES_GESTION = [
  ROLES.ADMIN,
  ROLES.COORD_SUPERIOR,
  ROLES.COORD_PEDAGOGICO,
  ROLES.ASISTENTE_ADMIN
];

// Tipos de gestión para seguimientos
export const TIPOS_GESTION = [
  { value: '📞 Llamada Telefónica', label: '📞 Llamada Telefónica' },
  { value: '💬 WhatsApp', label: '💬 WhatsApp' },
  { value: '✉️ Correo Electrónico', label: '✉️ Correo Electrónico' },
  { value: '🏫 Visita Institución', label: '🏫 Visita Institución' }
];

// Causas de ausencia
export const CAUSAS_AUSENCIA = [
  { value: '📡 Conectividad', label: '📡 Conectividad / Sin Señal' },
  { value: '🏥 Salud', label: '🏥 Problemas de Salud' },
  { value: '🌾 Cosecha', label: '🌾 Labores de Cosecha' },
  { value: '📚 Académico', label: '📚 Dificultad Académica' },
  { value: '💰 Económico', label: '💰 Situación Económica' },
  { value: '👨‍👩‍👧 Familiar', label: '👨‍👩‍👧 Situación Familiar' },
  { value: '📋 Otro', label: '📋 Otro' }
];

// Cohortes disponibles
export const COHORTES = ['2024', '2025', '2026'];

// Roles de universidad
export const ROLES_UNIVERSIDAD = {
  DOCENTE: 'docente',
  COORDINADOR_UNIVERSIDAD: 'coordinador_universidad'
};

// Nombres legibles de roles de universidad
export const NOMBRES_ROLES_UNIVERSIDAD = {
  [ROLES_UNIVERSIDAD.DOCENTE]: 'Docente Universitario',
  [ROLES_UNIVERSIDAD.COORDINADOR_UNIVERSIDAD]: 'Coordinador TyT'
};

// Colores por rol de universidad
export const COLORES_ROL_UNIVERSIDAD = {
  [ROLES_UNIVERSIDAD.DOCENTE]: 'bg-cyan-100 text-cyan-700',
  [ROLES_UNIVERSIDAD.COORDINADOR_UNIVERSIDAD]: 'bg-sky-100 text-sky-700'
};