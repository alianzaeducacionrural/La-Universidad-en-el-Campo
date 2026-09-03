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
  PADRINO: 'padrino',
  ALIADO: 'aliado'
};

// Colores por rol
export const COLORES_ROL = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-700',
  [ROLES.COORD_SUPERIOR]: 'bg-blue-100 text-blue-700',
  [ROLES.COORD_PEDAGOGICO]: 'bg-indigo-100 text-indigo-700',
  [ROLES.ASISTENTE_ADMIN]: 'bg-purple-100 text-purple-700',
  [ROLES.PADRINO]: 'bg-green-100 text-green-700',
  [ROLES.ALIADO]: 'bg-teal-100 text-teal-700'
};

// Nombres legibles de roles
export const NOMBRES_ROLES = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.COORD_SUPERIOR]: 'Coordinador de Educación Superior',
  [ROLES.COORD_PEDAGOGICO]: 'Coordinador Pedagógico',
  [ROLES.ASISTENTE_ADMIN]: 'Asistente Administrativo',
  [ROLES.PADRINO]: 'Padrino',
  [ROLES.ALIADO]: 'Aliado (solo lectura)'
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

// Tipos de documento para el proceso de deserción. `aplicaA` restringe la opción a una
// ruta (tipo_desercion) específica; null significa que aplica a ambas.
export const TIPOS_DOCUMENTO_DESERCION = [
  { value: 'carta_retiro_ie', label: 'Carta de Retiro (Institución Educativa)', icon: '📄', aplicaA: null },
  { value: 'certificado_vecindad', label: 'Certificado de Vecindad', icon: '📎', aplicaA: null },
  { value: 'certificado_medico', label: 'Certificado Médico', icon: '📎', aplicaA: null },
  { value: 'soporte_economico', label: 'Soporte Económico', icon: '📎', aplicaA: null },
  { value: 'carta_cobro_1', label: 'Carta de Cobro 1', icon: '💰', aplicaA: 'Sin Justificar' },
  { value: 'carta_cobro_2', label: 'Carta de Cobro 2', icon: '💰', aplicaA: 'Sin Justificar' },
  { value: 'carta_cobro_3', label: 'Carta de Cobro 3', icon: '💰', aplicaA: 'Sin Justificar' },
  { value: 'cierre_caso', label: 'Carta de cierre de caso', icon: '✅', aplicaA: 'Justificada' },
  { value: 'otro', label: 'Otro Documento', icon: '📎', aplicaA: null }
];

// Tipo de seguimiento — a qué situación responde el contacto registrado
export const TIPOS_SEGUIMIENTO = [
  { value: 'inasistencia', label: '🚫 Inasistencia' },
  { value: 'rendimiento_academico', label: '📚 Rendimiento Académico' }
];

// Tipos de seguimiento que los coordinadores de universidad registran sobre
// un estudiante (independiente de TIPOS_SEGUIMIENTO, que es del padrino).
export const TIPOS_SEGUIMIENTO_UNIVERSIDAD = [
  { value: 'Rendimiento académico', label: 'Rendimiento académico', icon: '📚', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'Bienestar', label: 'Bienestar', icon: '🌱', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'Psicosocial', label: 'Psicosocial', icon: '🧠', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'Socioemocional', label: 'Socioemocional', icon: '💛', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Administrativo', label: 'Administrativo', icon: '🗂️', color: 'bg-gray-100 text-gray-700 border-gray-300' }
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

// Tipos de discapacidad reconocidos (caracterización de estudiantes). 'NO APLICA'
// es una selección explícita (evaluado, no aplica) distinta de no haber marcado nada.
export const DISCAPACIDAD_OPCIONES = [
  { value: 'VISUAL - BAJA VISIÓN IRREVERSIBLE', label: 'VISUAL - BAJA VISIÓN IRREVERSIBLE' },
  { value: 'VISUAL - CEGUERA', label: 'VISUAL - CEGUERA' },
  { value: 'TRASTORNO DEL ESPECTRO AUTISTA', label: 'TRASTORNO DEL ESPECTRO AUTISTA' },
  { value: 'DISCAPACIDAD INTELECTUAL', label: 'DISCAPACIDAD INTELECTUAL' },
  { value: 'DISCAPACIDAD MÚLTIPLE', label: 'DISCAPACIDAD MÚLTIPLE' },
  { value: 'DISCAPACIDAD AUDITIVA - USUARIO LENGUA DE SEÑAS COLOMBIANA', label: 'DISCAPACIDAD AUDITIVA - USUARIO LENGUA DE SEÑAS COLOMBIANA' },
  { value: 'DISCAPACIDAD AUDITIVA - USUARIO DEL CASTELLANO', label: 'DISCAPACIDAD AUDITIVA - USUARIO DEL CASTELLANO' },
  { value: 'SORDOCEGUERA', label: 'SORDOCEGUERA' },
  { value: 'DISCAPACIDAD FÍSICA', label: 'DISCAPACIDAD FÍSICA' },
  { value: 'DISCAPACIDAD PSICOSOCIAL (MENTAL)', label: 'DISCAPACIDAD PSICOSOCIAL (MENTAL)' },
  { value: 'NO APLICA', label: 'NO APLICA' },
  { value: 'OTRA DISCAPACIDAD', label: 'OTRA DISCAPACIDAD' },
  { value: 'SISTEMICA', label: 'SISTEMICA' }
];

// Tipos de trastorno reconocidos (caracterización de estudiantes)
export const TRASTORNO_OPCIONES = [
  { value: 'TRASTORNOS ESPECÍFICOS DE APRENDIZAJE ESCOLAR', label: 'TRASTORNOS ESPECÍFICOS DE APRENDIZAJE ESCOLAR' },
  { value: 'TRASTORNO POR DÉFICIT DE ATENCIÓN CON/SIN HIPERACTIVIDAD', label: 'TRASTORNO POR DÉFICIT DE ATENCIÓN CON/SIN HIPERACTIVIDAD' },
  { value: 'TRASTORNOS ESPECÍFICOS DE APRENDIZAJE ESCOLAR Y POR DÉFICIT DE ATENCIÓN', label: 'TRASTORNOS ESPECÍFICOS DE APRENDIZAJE ESCOLAR Y POR DÉFICIT DE ATENCIÓN' },
  { value: 'NO APLICA', label: 'NO APLICA' }
];

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

// Grados escolares homologables (Reconocimiento de Aprendizajes)
export const GRADOS_ESCOLARES = ['1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°'];

// Nombre del documento PDF que acredita la validez de las notas homologadas
export const NOMBRE_CERTIFICADO_HOMOLOGACION = 'Certificación de reconocimiento de saberes';