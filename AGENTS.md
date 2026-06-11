# AGENTS.md

## Commands

```
npm run dev       # Vite dev server on port 5173
npm run build     # Production build
npm run preview   # Preview production build
```

No test runner. No lint script (ESLint config exists in `eslint.config.js` but no `lint` script in `package.json`).

## Architecture

**App:** Student follow-up platform ("La Universidad en el Campo", Comité de Cafeteros de Caldas).

**Stack:** React 18 + Vite + Tailwind CSS 3 + Supabase (auth + Postgres).

**Entrypoint:** `src/main.jsx` → `App.jsx` (wraps `Router > AuthProvider > NotificacionProvider > AppContent`).

### Auth / Role System

Two separate Supabase tables, resolved in order by `src/context/AuthContext.jsx`:
1. `padrinos` — role: `padrino`, `tipoUsuario = 'padrino'`
2. `usuarios_universidad` — roles: `admin`, `coord_superior`, `coord_pedagogico`, `asistente_admin`, `docente`, `coordinador_universidad`, `tipoUsuario = 'universidad'`

Auth resolution: queries `padrinos` first via `auth_id`, then `usuarios_universidad`. If no match, signs out. All role-gating flows from `AuthContext`.

### Routing (App.jsx)

All routes defined in `App.jsx`. Key redirects:
- `padrino` → `/dashboard`
- `universidad` → `/universidad/dashboard`, also `/panel`, `/estadisticas`, `/reportes`, `/grupos`, `/multas`, `/historial-reportes`

Modals rendered at the app level (not in pages): `PanelModales` and `GlobalModales` components in `App.jsx`.

### State Management

No Redux/Zustand. State lives in:
- `AuthContext` — session, user profile, role
- `NotificacionContext` — toast notifications (modal-based, not react-hot-toast; uses `NotificacionModal` component)
- Custom hooks in `src/hooks/` — each returns `{ data, loading, error, ...actions }`

### Custom Hooks

- `useEstudiantes(grupoSeleccionado)` — Supabase queries on `estudiantes` table, Excel import via `xlsx`
- `useGrupos(padrino)` — loads assigned groups via `grupo_padrino` join table, supports group creation
- `useSeguimientos(padrino, gruposAsignados)` — follow-up records per student
- `usePadrinos()` — queries `padrinos` table
- `useReportesNuevos()` — recent reports

### Design System (tailwind.config.js)

Custom colors: `primary` (#4A7C59), `brown` (#8B5E3C), `warm` (#F5E6D3) with light/dark variants.
Animations: `fade-in`, `slide-up`, `slide-down`, `scale-in`, `spin-slow`.
Font: Inter via `index.css`.

### Key Data Tables (Supabase)

- `grupos` — cohorts, linked to padrinos via `grupo_padrino` junction table
- `estudiantes` — linked to `grupos` via `grupo_id`; states: `Activo`, `En Riesgo`, `Desertor`, `Graduado`
- `seguimientos` — interactions (Llamada, WhatsApp, Correo, Visita) per student
- `inasistencias` — attendance records per student, with `estado_seguimiento` field
- `vista_inasistencias_pendientes` — database view used by Dashboard to count pending absences

### Reports & Export

- `src/utils/exportUtils.js` — Excel via `xlsx`, PDF via `jsPDF` + `jspdf-autotable`
- Emojis stripped from exports via `limpiarEmojis()` helper

### Build / Deployment

Manual chunk splitting in `vite.config.js`: `vendor-react`, `vendor-supabase`, `vendor-charts`, `vendor-reports`.
Deployed via Vercel (`vercel.json` rewrites all routes to index.html). Env required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`.env` is gitignored but present locally.
