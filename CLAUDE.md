# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Montas Auto Academy — a driving school management system. It has two parts in one repo:

- **Frontend**: plain multi-page HTML/CSS/vanilla JS at the repo root (no build step, no framework, no bundler). Bootstrap 5 and Bootstrap Icons are pulled from CDN in each HTML file. Pages are opened directly / served via a static file server (VS Code Live Server, configured in `settings.json` on port 5501).
- **Backend**: `montas-backend/` — a Node/Express REST API backed by PostgreSQL (`pg`), using the MVC-ish pattern `routes/` → `controllers/` → `db.js` (a single shared `Pool`).

There is no root-level JS build tooling, TypeScript, linter, or test runner. `npm test` at the root is a placeholder (`echo "Error: no test specified" && exit 1`) — there is no real test suite anywhere in the project.

## Running the app

Backend:
```bash
cd montas-backend
npm install        # if not already installed (root package.json covers backend deps too)
node index.js       # starts Express on http://localhost:4000 (or $PORT)
```
On startup, `index.js` runs an idempotent schema-migration block (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) against the DB in `DATABASE_URL`, so new columns/tables just need to be added there rather than via a separate migration tool.

Frontend: open the HTML files directly or serve the repo root with a static server (e.g. VS Code Live Server on port 5501, per `settings.json`). There is no dev server npm script.

Backend config lives in `montas-backend/.env` (`DATABASE_URL`, `PORT`) — not committed with real values; do not print or commit secrets from it.

One-off DB/admin scripts live in `montas-backend/scripts/` (e.g. `crearAdmin.js`, `crearCamposExpediente.js`, `dumpSchema.js`, `diagnostico.js`) and are run manually with `node montas-backend/scripts/<script>.js` when needed — they are not wired into any npm script.

## Backend architecture

- `montas-backend/index.js` — app entrypoint: CORS setup, JSON body parsing, static `/uploads` serving, route mounting, DB schema bootstrap, and `app.listen`.
- `montas-backend/db.js` — single shared `pg` `Pool` (SSL required), imported by every controller as `require('../db')`.
- `montas-backend/routes/*.js` — thin Express routers, one per resource (`clientes`, `pagos`, `asistencias`, `horarios`, `configuracion`, `auth`, `cursos`, `instructores`, `dashboard`, `documentos`, `observaciones`). They just map HTTP verbs to controller functions.
- `montas-backend/controllers/*.js` — all business logic and raw SQL (parameterized queries via `pool.query`) lives here. No ORM.
- `montas-backend/middlewares/roleMiddleware.js` — `requireAdmin` checks the `x-user-role` request header.
- File uploads (client photos, documents) use `multer` disk storage under `montas-backend/uploads/`, organized per-client (`uploads/clientes/<id>/...`), served statically at `/uploads`.

### Auth model (important, non-obvious)

There is no session/token/JWT auth. Login (`POST /api/auth/login`) checks `usuario`/`clave` (bcrypt) against the `usuarios` table and returns `{ id, usuario, rol }`. The frontend stores this in `localStorage` (`sesionActiva`, `userRole`, `currentUser`, `currentUserId`) and, on every subsequent API call, sends the role/id back as **plain request headers** (`x-user-role`, `x-user-id`, `x-user-name`) via `getAuthHeaders()` in `js/authHelpers.js`. The backend trusts these headers as-is (see `roleMiddleware.requireAdmin` and per-instructor filtering in `dashboardController`). Roles in use: `admin`, `instructor`/`usuario`. When adding new protected endpoints or pages, follow this same header-based convention rather than introducing a different auth scheme.

## Frontend architecture

- Each top-level page (`cliente.html`, `panel.html`, `pagos.html`, `asistencias.html`, `horario.html`, `cursos.html`, `instructores.html`, `configuracion.html`, `reportes.html`, `factura.html`, `expediente.html`/`detalle-cliente.html`, `login.html`) is self-contained: markup + inline `<script>` (or a paired `.js` file) that calls the backend directly with `fetch`.
- The backend base URL is hardcoded as `http://localhost:4000` in each page's fetch calls (no shared config/env for the frontend) — when changing the API host/port, it must be updated per-file.
- `js/authHelpers.js` is the shared client-side auth helper (role/user getters, `getAuthHeaders()`, `requireAdminPage()` gate, `logout()`) — include it on any page that calls the API or needs role-based UI gating.
- `js/expediente.js` drives the client "expediente" (record) detail view — tabs for general info, payments, attendance, documents, observations — and is the largest/most complex frontend script; it fetches supplementary data (e.g. instructor name via `/api/instructores/:id`) rather than expecting the API to join it.
- `css/styles.css` holds shared custom styles on top of the Bootstrap CDN theme.
- `assets/` holds images/logo/video used across pages (e.g. `assets/avatar-placeholder.png` fallback for missing client photos — note this file may not currently exist in the repo).

## Data model notes

Core tables: `usuarios`, `clientes`, `cursos`, `instructores`, `curso_instructor` (join table), `horarios`, `pagos`, `asistencias`, `cliente_documentos`, `cliente_observaciones`. `clientes` is the widest table (personal, contact, emergency-contact, academic, and financial fields) — see the frontend↔DB field name mapping table in `INFORMACION_GENERAL_README.md` if working on client records or the "expediente" (record) feature, since form field IDs (camelCase) differ from DB column names (snake_case).

`INFORMACION_GENERAL_README.md` and `CHANGES.md` document past feature work in detail (schema changes, form field IDs, endpoint behavior) — check them for context before modifying `clientesController.js`, `cliente.html`, `detalle-cliente.html`, or `js/expediente.js`.

## Things to be careful about

- `dhhdhd.html` and `reporteop2.html` appear to be stray/unused scratch files (empty or oddly named) — don't treat them as canonical examples of page structure.
- SQL is written as raw parameterized `pool.query` calls throughout — keep using `$1, $2, ...` placeholders, never string-interpolate user input into SQL.
- Since there's no test suite, verify backend changes by running the server and hitting endpoints (`curl`/browser), and verify frontend changes by exercising the actual page in a browser against the running backend.
