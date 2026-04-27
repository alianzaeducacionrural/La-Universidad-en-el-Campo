# 🌱 SISTEMA DE SEGUIMIENTO - UNIVERSIDAD EN EL CAMPO
## Comité de Cafeteros de Caldas

**Versión:** 2.0.0  
**Fecha:** Abril 2026  
**Desarrollador:** Alejandro (Coordinador del Proyecto)  
**Tecnologías:** React + Vite + Tailwind CSS + Supabase

---

## 📋 DESCRIPCIÓN GENERAL

Sistema web para el seguimiento de estudiantes del programa **Universidad en el Campo** del Comité de Cafeteros de Caldas.

El sistema permite a los **padrinos** registrar y dar seguimiento a la asistencia, permanencia y contacto con estudiantes de grados 10° y 11° que cursan programas técnicos profesionales en alianza con diferentes universidades.

### 🎯 Objetivos del Sistema

1. **Centralizar** la información de estudiantes y seguimientos
2. **Facilitar** el registro de gestiones (llamadas, WhatsApp, visitas)
3. **Visualizar** el historial completo de cada estudiante
4. **Clasificar** las causas de ausencia (conectividad, salud, cosecha, etc.)
5. **Generar reportes** para la toma de decisiones

---

## 👥 ROLES Y PERMISOS

| Rol | Descripción | Permisos Clave |
|:---|:---|:---|
| **admin** | Administrador del sistema | Acceso TOTAL |
| **coord_superior** | Coordinador de Educación Superior | Gestión completa (igual que admin, sin eliminar) |
| **coord_pedagogico** | Coordinador Pedagógico | Mismos permisos que coord_superior |
| **asistente_admin** | Asistente Administrativa | Carga masiva, asignar grupos, reportes, cambiar estado |
| **padrino** | Padrino de estudiantes | Ver SOLO sus grupos asignados, registrar seguimientos |

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS (Supabase)

### Tablas Principales

| Tabla | Descripción | Campos Clave |
|:---|:---|:---|
| **padrinos** | Usuarios del sistema | id, nombre_completo, correo, rol, auth_id |
| **universidades** | Catálogo de universidades aliadas | id, nombre |
| **programas** | Programas técnicos por universidad | id, nombre, universidad_id |
| **grupos** | Grupos académicos (aulas virtuales) | id, nombre, cohorte, universidad, programa |
| **grupo_padrino** | Relación muchos a muchos | grupo_id, padrino_id |
| **estudiantes** | Beneficiarios del programa | id, nombre_completo, municipio, institucion_educativa, cohorte, programa, universidad, grupo_id, estado, total_faltas |
| **seguimientos** | Registro de gestiones | id, estudiante_id, padrino_id, tipo_gestion, causa_ausencia, resultado, fecha_contacto |

### Scripts SQL Importantes

Los scripts completos de creación de tablas y políticas RLS se encuentran en:
- `sql/01_crear_tablas.sql`
- `sql/02_politicas_rls.sql`
- `sql/03_datos_iniciales.sql`

---

## 📁 ESTRUCTURA DEL PROYECTO
app-padrinos-ucampo/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env ← Variables de entorno (NO SUBIR A GIT)
│
└── src/
├── lib/
│ └── supabaseClient.js ← Cliente de Supabase
│
├── context/
│ └── AuthContext.jsx ← Contexto de autenticación
│
├── hooks/
│ ├── useGrupos.js ← Lógica de grupos
│ ├── useEstudiantes.js ← Lógica de estudiantes
│ ├── useSeguimientos.js ← Lógica de seguimientos
│ └── usePadrinos.js ← Lógica de padrinos
│
├── utils/
│ ├── constants.js ← Constantes (estados, roles, colores)
│ └── helpers.js ← Funciones auxiliares
│
├── components/
│ ├── common/
│ │ ├── Header.jsx ← Barra superior con usuario
│ │ ├── Tabs.jsx ← Pestañas de navegación
│ │ └── LoadingSpinner.jsx ← Spinner de carga
│ │
│ ├── grupos/
│ │ ├── GrupoInfo.jsx ← Tarjeta con info del grupo
│ │ ├── GrupoSelector.jsx ← Selector de grupo + botones
│ │ └── ModalCrearGrupo.jsx ← Modal para crear grupo
│ │
│ ├── estudiantes/
│ │ ├── TablaEstudiantes.jsx ← Tabla principal
│ │ ├── ModalImportar.jsx ← Importar desde Excel
│ │ ├── ModalSeguimiento.jsx ← Registrar seguimiento
│ │ ├── ModalEditarEstudiante.jsx ← Editar información
│ │ └── ModalPerfilEstudiante.jsx ← Perfil completo + línea de tiempo
│ │
│ └── seguimientos/
│ └── SeguimientosRecientes.jsx ← Lista de seguimientos
│
├── pages/
│ ├── Login.jsx ← Pantalla de inicio de sesión
│ └── Dashboard.jsx ← Panel principal (UNE TODO)
│
├── App.jsx ← Enrutador principal
├── index.css ← Estilos Tailwind
└── main.jsx ← Punto de entrada

text

---

## 🔐 VARIABLES DE ENTORNO (.env)
VITE_SUPABASE_URL=https://rmlvwuertisspqeqkmns.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtbHZ3dWVydGlzc3BxZXFrbW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjcyMTksImV4cCI6MjA5MjAwMzIxOX0.ccPmXZOFh1IvexDU0oFFOZPOIU2Wqj4o9bVmHmHjiOo

text

---

## 📥 FORMATO DEL EXCEL PARA IMPORTAR ESTUDIANTES

| Columna | ¿Obligatorio? | Ejemplo |
|:---|:---:|:---|
| nombre_completo | ✅ | María Fernanda Pérez |
| documento | ❌ | 1234567890 |
| genero | ❌ | Femenino |
| telefono | ❌ | 3115551234 |
| correo | ❌ | maria@email.com |
| acudiente_nombre | ❌ | Dora Miryam Ríos |
| acudiente_telefono | ❌ | 3105559876 |
| municipio | ✅ | Aguadas |
| institucion_educativa | ✅ | I.E. San José |

**Nota:** Los campos `cohorte`, `universidad`, `programa` y `grupo_id` se asignan automáticamente según el grupo seleccionado.

---

## 🚀 COMANDOS ÚTILES

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Previsualizar build de producción
npm run preview
✅ FUNCIONALIDADES IMPLEMENTADAS
Autenticación
Login con correo y contraseña (Supabase Auth)

Persistencia de sesión

Cierre de sesión

Roles y permisos

Gestión de Grupos
Crear grupos (con selector de universidad/programa)

Asignar múltiples padrinos a un grupo

Visualizar información del grupo (universidad, programa, cohorte)

Selector de grupo filtrado por permisos

Gestión de Estudiantes
Importar estudiantes desde Excel (.xlsx, .xls, .csv)

Tabla de estudiantes con filtro por grupo

Ver perfil completo del estudiante

Editar información del estudiante

Cambiar estado (Activo/En Riesgo/Desertor/Graduado)

Seguimientos
Registrar seguimiento (tipo, causa, resultado)

Línea de tiempo en perfil del estudiante

Vista de seguimientos recientes

Filtro automático por permisos (padrinos solo ven sus grupos)

Interfaz
Diseño responsive (Tailwind CSS)

Modales para todas las acciones

Indicadores visuales de estado (colores)

Spinner de carga

Mensajes de confirmación

🔧 PENDIENTES / MEJORAS FUTURAS
Tarea	Prioridad	Complejidad
Recuperación de contraseña	Media	Baja (configurar en Supabase)
Dashboard de estadísticas (gráficos)	Alta	Media
Exportar reportes a Excel/PDF	Media	Media
Adjuntar archivos en seguimientos	Baja	Alta
Notificaciones por correo	Baja	Media
Firma digital de seguimientos	Baja	Alta
📞 CONTACTO
Desarrollador: Alejandro
Rol: Administrador del Sistema
Correo: alejandro@cafeteroscaldas.org
Proyecto Supabase: rmlvwuertisspqeqkmns

📝 NOTAS IMPORTANTES
El archivo .env NO debe subirse a GitHub. Contiene las claves de Supabase.

Las políticas RLS están configuradas para desarrollo (acceso público). Para producción, ajustar según roles.

Los usuarios deben estar creados en Supabase Auth y vinculados a la tabla padrinos mediante el campo auth_id.

Para agregar nuevas universidades/programas, usar el SQL Editor en Supabase.

🎯 PRÓXIMOS PASOS (Sugeridos)
Cargar datos reales de la Cohorte 2025

Desplegar en Railway para acceso público

Capacitar al equipo de padrinos

Implementar Dashboard de estadísticas

Documento generado el 21 de abril de 2026
Sistema desarrollado para el Comité de Cafeteros de Caldas - Programa Universidad en el Campo