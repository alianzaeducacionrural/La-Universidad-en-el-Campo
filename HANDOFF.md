# HANDOFF · app-padrinos

> Si eres un chat nuevo: lee este archivo completo y luego los demás .md del proyecto antes de seguir.

<!-- handoff:auto:start -->
## Estado (automático, 2026-10-26T16:02:42.582Z)

- Carpeta del proyecto: C:\Users\alejo\Documents\Comité de Cafeteros\2026\Plataformas\La Universidad en el Campo\app-padrinos
- Contexto de la sesión: 8% (80119 de 1000000 tokens)
- Costo de la sesión: $0.44
- Git (solo esta carpeta): 3 archivos sin commit · 0 commits por subir · 0 commits de otras carpetas
- Servidores locales: ninguno

## Plan por fases

### Fase 1 · Handoff del proyecto (50%)
Cómo: Se deja el estado actual guardado para retomar el trabajo en un chat nuevo.
- [x] Preparar el handoff con el estado actual del proyecto
- [~] Guardar el handoff (botón en el panel) (en curso)


## Ideas para el programa

- **Políticas de seguridad por fila (RLS por rol)** (propuesta): Hoy el alcance de aliados y padrinos es solo de interfaz; cualquier usuario autenticado puede leer y escribir todo.
- **Reemplazar el README de plantilla de Vite** (propuesta): No describe el proyecto; la documentación útil está en CLAUDE.md y AGENTS.md.
- **Agregar script de lint y algunas pruebas** (propuesta): Existe la configuración de ESLint pero no hay script, y no hay pruebas automáticas.

## Tareas del usuario

- [ ] Confirmar que lo último (Saber TyT y edición de datos por padrinos) está desplegado en Vercel y las migraciones aplicadas en Supabase
- [ ] Decidir si el alcance por municipio de los aliados debe ser seguridad real en la base de datos

## Agentes

_Ninguno._

## Enlaces

- Repositorio: https://github.com/alianzaeducacionrural/La-Universidad-en-el-Campo
- GitHub Pages: https://alianzaeducacionrural.github.io/La-Universidad-en-el-Campo/
<!-- handoff:auto:end -->

## Resumen y decisiones

En esta conversación no se cambió código: solo se preparó el handoff. El estado del código es el de `main`, árbol limpio. Los últimos commits (trabajo de sesiones anteriores) fueron:

- Estudiantes: el filtro Saber TyT separa quienes presentaron con certificado de quienes presentaron sin él.
- Saber TyT: el certificado es obligatorio (foto comprimida) cuando el estudiante presentó.
- Padrinos: pueden editar teléfonos del estudiante y del acudiente, y también correo y nombre del acudiente.
- Aliados: acceso a la pestaña Estudiantes, limitado a sus municipios.

Decisiones que siguen vigentes (vienen de la memoria del proyecto, no de esta conversación):

- **Rol Aliado**: solo lectura, vive en la tabla `padrinos` (rol `aliado`) con `municipios_asignados`. El alcance por municipio se aplica solo en la interfaz (`getMunicipiosPermitidos` y `esAliado` en `src/utils/helpers.js`).
- **Seguridad de la base de datos (RLS)**: es permisiva a propósito. Cualquier usuario autenticado puede leer y escribir todo, y el acceso anónimo está bloqueado. Esto se montó el 2026-07-15 en el proyecto Supabase `rmlvwuertisspqeqkmns`. Se hizo así porque la app no tiene autorización por fila; hacerla estricta sin rehacer los permisos rompería la app.
- **Crear usuarios**: se usa `crearClienteTemporal()` de `src/lib/` para no cerrar la sesión del admin.

Trampas conocidas:

- La documentación vieja decía que `admin`, `coord_superior`, `coord_pedagogico` y `asistente_admin` están en `usuarios_universidad`. Es falso: están en `padrinos`. En `usuarios_universidad` solo hay `docente` y `coordinador_universidad`.
- El reporte de Deserciones debe dejar un solo registro por estudiante (el más reciente); había estudiantes con varios `registros_desercion` que inflaban el conteo.
- El README.md es la plantilla de Vite, sin información del proyecto. La documentación útil está en CLAUDE.md y AGENTS.md.

## Cómo continuar

1. `npm install` y `npm run dev` (puerto 5173). Hace falta un `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (está en `.gitignore`).
2. No hay pruebas automáticas ni script de lint; verifica los cambios a mano en el navegador y con `npm run build`.
3. Pendientes de seguridad (existían antes, no bloquean): unas 40 vistas `vista_*` son `SECURITY DEFINER`, 3 funciones tienen `search_path` mutable, el bucket `evidencias` permite listar archivos y la protección contra contraseñas filtradas está desactivada. Si se quiere que el alcance de los aliados sea seguridad real y no solo de interfaz, hay que escribir políticas por fila; es un proyecto aparte.
4. No se verificó en esta conversación si lo último (Saber TyT y edición de datos por padrinos) está desplegado en Vercel, ni si las migraciones de Supabase de esas funciones están aplicadas. Compruébalo antes de dar esas funciones por activas.
