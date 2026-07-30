# Veraxis

**Management system for driving schools** — students, courses, instructors, schedules, payments, cash register, expenses, fleet, multi-branch support, and an executive reporting dashboard, all in one place.

> 🇪🇸 ¿Buscas la versión en español? Lee [README.es.md](README.es.md).

---

## Screenshots

> Drop your PNG/JPG screenshots into `docs/screenshots/` using the file names below — the images will then render automatically here and in the Spanish README.

| | |
|---|---|
| **Dashboard** <br> `docs/screenshots/dashboard.png` | **Student record (expediente)** <br> `docs/screenshots/expediente.png` |
| **Payments & invoicing** <br> `docs/screenshots/pagos.png` | **Cash register (caja)** <br> `docs/screenshots/caja.png` |
| **Executive reports** <br> `docs/screenshots/reportes.png` | **Public landing page** <br> `docs/screenshots/inicio.png` |
| **Settings** <br> `docs/screenshots/configuracion.png` | **Student portal** <br> `docs/screenshots/portal-estudiante.png` |

![Dashboard](docs/screenshots/dashboard.png)

## About

Veraxis is a full-stack web system built to run the day-to-day operations of a driving school: enrolling students, tracking their theoretical/practical hours, collecting payments, managing instructors and vehicles, closing the daily cash register, and giving owners an executive view of the business — with a dedicated self-service portal for students and role-based access for admins and instructors.

## Key Features

- **Student records ("expediente")** — personal, contact, emergency-contact, academic and financial data; photo, documents, observations, progress evaluations, exam attempts and issued certificates, all in one profile.
- **Courses, instructors & schedules** — course catalog with pricing, instructor assignment, and class scheduling.
- **Payments & invoicing** — partial payments, multiple payment methods, auto-numbered printable invoices/receipts.
- **Attendance tracking** per student/class.
- **Cash register (Caja)** — daily opening/closing with cash reconciliation, unified income/expense movements, configurable categories.
- **Operating expenses** — with fiscal fields for the Dominican Republic (RNC / NCF / ITBIS).
- **Fleet management** — vehicles and maintenance history.
- **Executive reports** — revenue, enrollment, and operational KPIs.
- **Multi-branch (multi-sucursal)** — independent cash register and data scoping per physical location.
- **Student self-service portal** — students log in to see their own progress, payments and schedule.
- **Public landing page** — hero, about, gallery and social links, fully editable from Settings without touching code.
- **WhatsApp notifications** — one-tap `wa.me` reminders for classes and payment due dates.
- **Role-based access** (`admin`, `instructor`, `estudiante`) enforced on both UI and API.
- **Audit log** of key actions across the system.

## Tech Stack

**Frontend**
- Plain HTML5 / CSS3 / vanilla JavaScript — no framework, no bundler, no build step
- [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) (via CDN)
- Each page is self-contained and talks to the backend directly via `fetch`

**Backend**
- [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- REST API following an MVC-ish pattern: `routes/` → `controllers/` → `db.js`
- [PostgreSQL](https://www.postgresql.org/) (hosted on [Neon](https://neon.tech/)) accessed via the [`pg`](https://node-postgres.com/) driver — raw parameterized SQL, no ORM
- Idempotent schema migrations run on startup (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)

**Auth & Security**
- [JSON Web Tokens](https://github.com/auth0/node-jsonwebtoken) (`jsonwebtoken`) for stateless authentication
- Password hashing with `bcrypt` / `bcryptjs`
- Role-based middleware (`requireAdmin`, `verifyToken`) protecting API routes
- Per-client access checks to prevent IDOR (a student can only reach their own record)
- Upload validation (file type/size) via `multer`

**Other**
- [Winston](https://github.com/winstonjs/winston) for centralized logging
- [Jest](https://jestjs.io/) test suite, run automatically on every push/PR via **GitHub Actions** CI

## Architecture

```
Montas/
├── *.html, css/, js/, assets/   → frontend (static, no build step)
└── montas-backend/
    ├── index.js                 → app entrypoint (CORS, routes, DB bootstrap)
    ├── db.js                    → shared PostgreSQL pool
    ├── routes/                  → thin Express routers (one per resource)
    ├── controllers/             → business logic + parameterized SQL
    ├── middlewares/             → auth, roles, upload validation
    ├── scripts/                 → one-off admin/DB scripts
    └── __tests__/                → Jest test suite
```

## Getting Started

**Requirements:** Node.js 20+, a PostgreSQL database (e.g. a free [Neon](https://neon.tech/) instance).

```bash
# 1. Install dependencies (covers both frontend tooling and backend)
npm install

# 2. Configure environment variables
cp montas-backend/.env.example montas-backend/.env
# then fill in DATABASE_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN

# 3. Start the backend (also runs schema migrations on boot)
node montas-backend/index.js
# → API + frontend served from http://localhost:4000
```

Once the backend is running, it also serves the frontend directly — just open `http://localhost:4000`. For local frontend-only development you can alternatively serve the repo root with any static server (e.g. VS Code Live Server); in that case the frontend still talks to the API at `http://localhost:4000`.

```bash
# Run the test suite
npm test
```

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE). Reselling, redistributing, or reusing this code (in whole or in part) without explicit written permission from the author is prohibited.
