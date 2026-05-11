# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, port 5173)
npm run build     # Production build
npm run preview   # Preview production build locally
```

No test runner is configured. There is no lint script; ESLint config exists in `eslint.config.js` but is not wired to a script.

## Architecture Overview

**App:** Student follow-up platform for "La Universidad en el Campo" (Comité de Cafeteros de Caldas). Tracks university students assigned to "padrinos" (sponsors) who monitor attendance, academic progress, and risk of dropout.

**Stack:** React 18 + Vite + Tailwind CSS 3 + Supabase (auth + Postgres)

### Role System

There are two separate user tables in Supabase:

| Table | Roles |
|---|---|
| `padrinos` | `padrino` |
| `usuarios_universidad` | `admin`, `coord_superior`, `coord_pedagogico`, `asistente_admin`, `docente`, `coordinador_universidad` |

`AuthContext` (`src/context/AuthContext.jsx`) resolves the logged-in user against both tables to set `perfil`, `tipoUsuario` (`'padrino'` or `'universidad'`), and `rol`. All role-gating logic flows from this context.

### Routing

`App.jsx` defines all routes. Routes are protected by a `ProtectedRoute` component that reads from `AuthContext`. After login, users are redirected to different dashboards based on `tipoUsuario`:
- `padrino` → `/dashboard`
- `universidad` → `/universidad/dashboard`, `/panel`, `/estadisticas`, `/reportes`, `/grupos`, `/multas`

### State Management Pattern

No global store (no Redux/Zustand). State lives in:
1. **`AuthContext`** — session, user profile, role
2. **`NotificacionContext`** — app-wide toast notifications (modal-based)
3. **Custom hooks** in `src/hooks/` — data fetching and mutations per domain

Each custom hook encapsulates Supabase queries for its domain: `useEstudiantes`, `useGrupos`, `useSeguimientos`, `usePadrinos`, `useReportesNuevos`. Hooks return `{ data, loading, error, ...actions }` and are instantiated inside page/container components.

### Key Data Domains

- **Grupos** — cohorts assigned to a padrino; a padrino can manage multiple groups
- **Estudiantes** — students within a group; states: `Activo`, `En Riesgo`, `Desertor`, `Graduado`
- **Seguimientos** — interaction records (Llamada, WhatsApp, Correo, Visita) logged per student
- **Asistencias** — attendance records per group session
- **Notas** — grades per student per group

### Component Structure

```
src/
  lib/supabaseClient.js      # Supabase client singleton
  context/                   # AuthContext, NotificacionContext
  hooks/                     # Domain hooks (data + mutations)
  utils/
    constants.js             # States, roles, colors, cause enums
    helpers.js               # Date formatting, role checks, color getters
    exportUtils.js           # Excel (xlsx) and PDF (jsPDF) export logic
  components/
    common/                  # Shared UI: Header, Sidebar, modals, loaders
    estudiantes/             # Student table + all student modals
    grupos/                  # Group selector, group modals
    coordinador/             # Coordinator dashboard panels and cards
    estadisticas/            # Chart.js-based KPI cards and graphs
    admin/                   # Admin group/fine management
    notas/                   # Grade entry modals
    padrino/                 # Absence review for padrinos
  pages/                     # Route-level components, thin shells
```

### Design System

Colors are defined in `tailwind.config.js`:
- `primary` (#4A7C59) — main green, used for actions and highlights
- `brown` (#8B5E3C) — secondary, headers and accents
- `warm` (#F5E6D3) — backgrounds

Custom Tailwind animations: `fade-in`, `slide-up`, `slide-down`, `scale-in`, `spin-slow`.

### Build / Deployment

`vite.config.js` defines manual chunk splitting:
- `vendor-react` — react, react-dom, react-router-dom
- `vendor-supabase` — @supabase/supabase-js
- `vendor-charts` — chart.js, react-chartjs-2, chartjs-plugin-datalabels
- `vendor-reports` — xlsx, jspdf, jspdf-autotable

Deployed via Vercel (`vercel.json` present). Environment variables required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
