<div align="center">

# 🚗 Veraxis

### Sistema de gestión full-stack para autoescuelas

Estudiantes, cursos, instructores, horarios, pagos, caja, gastos, flota, multi-sucursal y reportes ejecutivos — todo en un solo lugar.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Bootstrap](https://img.shields.io/badge/Bootstrap_5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![JWT](https://img.shields.io/badge/JWT_Auth-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

**[🇬🇧 English](README.md)** · **[🇪🇸 Español](README.es.md)**

</div>

<br>

<p align="center">
  <img src="docs/screenshots/caja.png" alt="Veraxis — módulo de caja" width="850">
</p>

## Tabla de contenidos

- [Demo](#-demo)
- [Descripción](#descripción)
- [Funcionalidades principales](#funcionalidades-principales)
- [Capturas de pantalla](#capturas-de-pantalla)
- [Tecnologías utilizadas](#tecnologías-utilizadas)
- [Arquitectura](#arquitectura)
- [Puesta en marcha](#puesta-en-marcha)
- [Licencia](#licencia)

## 🎬 Demo

**Página de inicio pública**

![Demo de la página de inicio](docs/screenshots/inicio.gif)

**Panel de administración**

![Demo del panel de administración](docs/screenshots/dashboard.gif)

**Portal del estudiante**

![Demo del portal del estudiante](docs/screenshots/portal-estudiante.gif)

## Descripción

Veraxis es un sistema web full-stack para llevar la operación diaria de una autoescuela: inscribir estudiantes, dar seguimiento a sus horas teóricas/prácticas, cobrar, administrar instructores y vehículos, cuadrar la caja del día y darle a los dueños una vista ejecutiva del negocio — con un portal de autoservicio para los estudiantes y acceso por roles para administradores e instructores.

## Funcionalidades principales

| | |
|---|---|
| 🎓 **Expediente del estudiante** | Datos personales, de contacto, contacto de emergencia, académicos y financieros; foto, documentos, observaciones, evaluaciones de progreso, intentos de examen y certificados emitidos — todo en un solo perfil. |
| 📚 **Cursos, instructores y horarios** | Catálogo de cursos con precios, asignación de instructores y programación de clases. |
| 💳 **Pagos y facturación** | Pagos parciales, múltiples métodos de pago, facturas/recibos imprimibles numerados automáticamente. |
| ✅ **Control de asistencias** | Por estudiante y por clase. |
| 💰 **Caja** | Apertura y cierre diario con arqueo, movimientos de ingresos/gastos unificados, categorías configurables. |
| 🧾 **Gastos operativos** | Campos fiscales para República Dominicana (RNC / NCF / ITBIS). |
| 🚐 **Gestión de flota** | Vehículos e historial de mantenimientos. |
| 📊 **Reportes ejecutivos** | Ingresos, inscripciones e indicadores operativos. |
| 🏢 **Multi-sucursal** | Caja y datos independientes por sede física. |
| 👩‍🎓 **Portal del estudiante** | El estudiante inicia sesión y ve su propio progreso, pagos y horario. |
| 🌐 **Página de inicio pública** | Hero, sobre nosotros, galería y redes sociales, editable desde Configuración sin tocar código. |
| 📱 **Notificaciones por WhatsApp** | Recordatorios de clases y pagos con un botón `wa.me` de un toque. |
| 🔐 **Acceso por roles** | `admin`, `instructor`, `estudiante` — aplicado en la interfaz y en la API. |
| 🕵️ **Bitácora de auditoría** | Registra las acciones clave del sistema. |

## Capturas de pantalla

<table>
  <tr>
    <td align="center" width="50%"><img src="docs/screenshots/login.png" alt="Login"><br><sub><b>Inicio de sesión</b></sub></td>
    <td align="center" width="50%"><img src="docs/screenshots/caja.png" alt="Caja"><br><sub><b>Caja</b></sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/vehiculos.png" alt="Flota"><br><sub><b>Gestión de flota</b></sub></td>
    <td align="center"><img src="docs/screenshots/configuracion.png" alt="Configuración"><br><sub><b>Configuración</b></sub></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><img src="docs/screenshots/notificaciones.png" alt="Notificaciones por WhatsApp"><br><sub><b>Notificaciones por WhatsApp</b></sub></td>
  </tr>
</table>

## Tecnologías utilizadas

**Frontend**
- HTML5 / CSS3 / JavaScript puro — sin framework, sin bundler, sin paso de compilación
- [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) (vía CDN)
- Cada página es autocontenida y se comunica con el backend directamente vía `fetch`

**Backend**
- [Node.js](https://nodejs.org/) + [Express 5](https://expressjs.com/)
- API REST con un patrón tipo MVC: `routes/` → `controllers/` → `db.js`
- [PostgreSQL](https://www.postgresql.org/) (alojado en [Neon](https://neon.tech/)) mediante el driver [`pg`](https://node-postgres.com/) — SQL parametrizado sin ORM
- Migraciones de esquema idempotentes al iniciar (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)

**Autenticación y seguridad**
- [JSON Web Tokens](https://github.com/auth0/node-jsonwebtoken) (`jsonwebtoken`) para autenticación sin estado
- Contraseñas encriptadas con `bcrypt` / `bcryptjs`
- Middlewares de roles (`requireAdmin`, `verifyToken`) que protegen las rutas de la API
- Validación de acceso por cliente para evitar IDOR (un estudiante solo puede ver su propio expediente)
- Validación de archivos subidos (tipo/tamaño) con `multer`

**Otros**
- [Winston](https://github.com/winstonjs/winston) para logging centralizado
- Suite de pruebas con [Jest](https://jestjs.io/), ejecutada automáticamente en cada push/PR mediante **GitHub Actions** (CI)

## Arquitectura

```
Montas/
├── *.html, css/, js/, assets/   → frontend (estático, sin build)
└── montas-backend/
    ├── index.js                 → punto de entrada (CORS, rutas, arranque de BD)
    ├── db.js                    → pool de PostgreSQL compartido
    ├── routes/                  → routers de Express (uno por recurso)
    ├── controllers/             → lógica de negocio + SQL parametrizado
    ├── middlewares/             → autenticación, roles, validación de subidas
    ├── scripts/                 → scripts administrativos/de BD puntuales
    └── __tests__/                → suite de pruebas con Jest
```

## Puesta en marcha

**Requisitos:** Node.js 20+, una base de datos PostgreSQL (por ejemplo, una instancia gratuita de [Neon](https://neon.tech/)).

```bash
# 1. Instalar dependencias (cubre frontend y backend)
npm install

# 2. Configurar las variables de entorno
cp montas-backend/.env.example montas-backend/.env
# luego completa DATABASE_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN

# 3. Iniciar el backend (también ejecuta las migraciones de esquema al arrancar)
node montas-backend/index.js
# → API y frontend disponibles en http://localhost:4000
```

Una vez que el backend está corriendo, también sirve el frontend directamente — solo abre `http://localhost:4000`. Para desarrollo local del frontend por separado también puedes servir la raíz del repositorio con cualquier servidor estático (p. ej. VS Code Live Server); en ese caso el frontend seguirá comunicándose con la API en `http://localhost:4000`.

```bash
# Ejecutar la suite de pruebas
npm test
```

## Licencia

Propietario — todos los derechos reservados. Consulta [LICENSE](LICENSE). Queda prohibido revender, redistribuir o reutilizar este código (total o parcialmente) sin permiso explícito y por escrito del autor.

<div align="center">

<br>

Hecho por [Luzmy555](https://github.com/Luzmy555)

</div>
