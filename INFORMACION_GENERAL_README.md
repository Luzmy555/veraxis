# Información General del Expediente - Guía Completa

## ✅ Cambios Realizados

### 1. Base de Datos (Backend)

#### Nuevas Columnas Agregadas a `clientes`
- `email` - Correo electrónico del cliente
- `sexo` - Género (M, F, Otro)
- `ciudad` - Ciudad de residencia
- `telefono_emergencia` - Teléfono del contacto de emergencia
- `estado_cliente` - Estado del cliente (Activo, Inactivo, Suspendido)
- `direccion` - Dirección completa

#### Columnas Existentes Preservadas
- `cedula`
- `telefono`
- `fecha_inicio` (fecha de inscripción)
- `curso_actual`
- `precio_total`, `inscripcion`, `descuento`
- `curso_id`, `instructor_id`
- `foto`
- `fecha_nacimiento`
- `contacto_emergencia`
- `horas_requeridas`, `horas_completadas`
- `saldo_pendiente`

#### Script de Migración
Ejecutar manualmente si es necesario:
```bash
node montas-backend/scripts/crearCamposExpediente.js
```

### 2. Controlador de Clientes (Backend)

Archivos modificados: `montas-backend/controllers/clientesController.js`

**Cambios:**
- `getClientes()` - Retorna todos los nuevos campos
- `getClientePorId()` - Retorna todos los nuevos campos
- `crearCliente()` - Acepta y guarda todos los nuevos campos
- `actualizarCliente()` - Acepta y actualiza todos los nuevos campos

**No se modificaron:**
- Rutas
- Estructura de respuesta
- Métodos de eliminación
- Relaciones existentes

### 3. Formulario Agregar Cliente (Frontend)

Archivo modificado: `cliente.html`

**Cambios:**
- Modal expandido de `modal-dialog` a `modal-lg`
- Scroll interno en el body del modal
- Organización en 5 secciones:
  1. **Información Personal** - Nombre, Cédula, Sexo, Fecha Nacimiento
  2. **Información de Contacto** - Teléfono, Email, Dirección, Ciudad
  3. **Contacto de Emergencia** - Nombre y Teléfono
  4. **Información Académica** - Curso, Instructor, Fecha Inscripción, Horas, Estado
  5. **Información Financiera** - Precio, Inscripción, Descuento

**Nuevas Funcionalidades:**
- Función `cargarInstructoresCliente()` - Carga la lista de instructores
- Event listener en modal open: carga cursos, instructores y configuración
- Validación de campos requeridos: Nombre, Cédula, Teléfono, Curso, Precio, Fecha Inscripción

### 4. Formulario Editar Cliente (Frontend)

Archivo modificado: `detalle-cliente.html`

**Cambios:**
- Modal de edición expandido a `modal-lg`
- Mismo formato y organización que el formulario de agregar
- Scroll interno
- Todos los campos se populizan al abrir el modal

**Funciones actualizadas:**
- `abrirModalEditar()` - Carga todos los campos incluyendo los nuevos
- Event listener del submit - Envía todos los campos al servidor

### 5. Pestaña Información General (Frontend)

Archivo modificado: `js/expediente.js`

**Función `loadGeneral()` completamente reescrita:**

Ahora muestra **2 Cards profesionales:**

#### Card 1: Información Personal
- Foto del cliente (con fallback a `assets/avatar-placeholder.png`)
- Nombre completo
- Cédula
- Sexo
- Fecha de nacimiento
- Edad (calculada automáticamente)
- Teléfono
- Correo electrónico
- Dirección
- Ciudad
- Contacto de emergencia
- Teléfono de emergencia
- Estado del cliente (con badge de color)

#### Card 2: Información Académica
- Curso
- **Instructor Asignado** (NOMBRE, no ID - obtenido via fetch adicional)
- Fecha de inscripción
- Estado del curso
- **Progreso de Horas:**
  - Horas Completadas
  - Horas Requeridas
  - Barra de progreso con porcentaje
  - Horas Restantes (calculadas)
  - Ratio de completado (%)
- Resumen en alert box

**Características:**
- Usa Bootstrap Icons para iconos visuales
- Datos vacíos muestran "—"
- Estado del cliente con badges de color (success/secondary/warning)
- Obtiene nombre del instructor mediante fetch a `/api/instructores/:id`
- Calcula edad automáticamente
- Calcula horas restantes y porcentaje de progreso
- Diseño responsive con dos columnas (md-6 cada una)

### 6. Validaciones y Seguridad

- ✅ Verificación de existencia de campos antes de usar
- ✅ Nulls y valores vacíos manejados correctamente
- ✅ Valores por defecto en campos numéricos
- ✅ No se elimina ni modifica datos existentes
- ✅ Rutas de API no cambiaron
- ✅ Controladores no se reemplazaron, solo se extendieron

---

## 🚀 Cómo Probar

### Paso 1: Preparar la Base de Datos

```bash
cd montas-backend
node scripts/crearCamposExpediente.js
```

O dejar que se cree automáticamente al iniciar el servidor:

```bash
node index.js
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Iniciar el Servidor

```bash
node montas-backend/index.js
```

Verás:
```
✅ Database schema checked and module-ready tables ensured.
✅ Conectado a PostgreSQL: ...
Servidor backend corriendo en http://localhost:4000
```

### Paso 4: Abrir la Aplicación

1. Abre `cliente.html` en el navegador
2. Inicia sesión (usa tus credenciales)
3. Haz clic en **"+ Agregar Cliente"**

### Paso 5: Crear un Cliente Completo

Completa el formulario con:
- **Información Personal**: Nombre, Cédula, Sexo, Fecha Nacimiento
- **Información de Contacto**: Teléfono, Email, Dirección, Ciudad
- **Contacto de Emergencia**: Nombre y Teléfono
- **Información Académica**: Selecciona Curso, Instructor, escribe Horas Requeridas (ej: 30)
- **Información Financiera**: Precio (ej: 5000), Inscripción, Descuento

Haz clic en **"Guardar Cliente"**

### Paso 6: Ver el Expediente

1. En la tabla de clientes, haz clic en **"Ver Expediente"**
2. Verás la **cabecera** con foto, nombre, curso, instructor, progreso de horas
3. Haz clic en tab **"Información General"**
4. Verás **2 Cards profesionales**:
   - **Card 1 (izquierda)**: Información Personal
   - **Card 2 (derecha)**: Información Académica

### Paso 7: Editar el Cliente

1. En la tabla de clientes, haz clic en **"Editar"** 
2. En el modal, verás todos los campos:
   - Información personal completa
   - Información de contacto
   - Contacto de emergencia
   - Información académica
   - Información financiera
3. Modifica algunos campos (ej: cambia las horas completadas a 15)
4. Haz clic en **"Guardar cambios"**

### Paso 8: Verificar Cambios

1. Regresa a la lista de clientes
2. Haz clic nuevamente en **"Ver Expediente"**
3. Verás reflejados los cambios en las Cards
4. La barra de progreso se ha actualizado (15/30 = 50%)

---

## 📋 Validación de Integridad

### ✅ Funcionalidades NO Afectadas

- [x] Tabla de clientes sigue mostrando Nombre, Teléfono, Fecha
- [x] Botones "Ver", "Editar", "Eliminar" funcionan
- [x] Botón "Ver Expediente" funciona
- [x] Pestaña Pagos funciona
- [x] Pestaña Asistencias funciona
- [x] Pestaña Documentos funciona
- [x] Pestaña Observaciones funciona
- [x] Dashboard no se afectó
- [x] Rutas de API `/api/clientes` no cambiaron
- [x] Controladores existentes no se reemplazaron

### ✅ Nuevas Funcionalidades Agregadas

- [x] 2 Cards profesionales en Información General
- [x] Información personal completa con iconos
- [x] Información académica con instructor por nombre
- [x] Barra de progreso con cálculo automático
- [x] Edad calculada automáticamente
- [x] Formulario agregar cliente extendido
- [x] Formulario editar cliente extendido
- [x] Nuevas columnas en base de datos

---

## 🔍 Detalles Técnicos

### IDs de Formulario (Agregar/Editar)

**Información Personal:**
- `#nombre` - Nombre completo
- `#cedula` - Cédula
- `#sexo` - Sexo
- `#fechaNacimiento` - Fecha de nacimiento

**Información de Contacto:**
- `#telefono` - Teléfono
- `#email` - Email
- `#direccion` - Dirección
- `#ciudad` - Ciudad

**Contacto de Emergencia:**
- `#contactoEmergencia` - Nombre del contacto
- `#telefonoEmergencia` - Teléfono

**Información Académica:**
- `#cursoId` - Curso vinculado (select)
- `#curso` - Nombre del curso
- `#fechaInscripcion` - Fecha de inscripción
- `#instructorId` - Instructor (select)
- `#horasRequeridas` - Horas requeridas
- `#horasCompletadas` - Horas completadas
- `#estadoCliente` - Estado

**Información Financiera:**
- `#precio` - Precio total
- `#inscripcion` - Inscripción
- `#descuento` - Descuento

### Endpoints API

Todos los endpoints `/api/clientes` siguen siendo iguales:

```
GET    /api/clientes              - Lista todos
GET    /api/clientes/:id          - Obtiene uno (ahora con 21+ campos)
POST   /api/clientes              - Crea (acepta 21+ campos)
PUT    /api/clientes/:id          - Actualiza (acepta 21+ campos)
DELETE /api/clientes/:id          - Elimina
```

### Mapeo de Campos en Base de Datos

| Frontend (Form) | Backend (DB) | Tipo |
|---|---|---|
| nombre | nombre | TEXT |
| cedula | cedula | TEXT |
| sexo | sexo | TEXT |
| fechaNacimiento | fecha_nacimiento | DATE |
| telefono | telefono | TEXT |
| email | email | TEXT |
| direccion | direccion | TEXT |
| ciudad | ciudad | TEXT |
| contactoEmergencia | contacto_emergencia | TEXT |
| telefonoEmergencia | telefono_emergencia | TEXT |
| cursoId | curso_id | INTEGER |
| curso | curso_actual | TEXT |
| fechaInscripcion | fecha_inicio | DATE |
| instructorId | instructor_id | INTEGER |
| horasRequeridas | horas_requeridas | INTEGER |
| horasCompletadas | horas_completadas | INTEGER |
| estadoCliente | estado_cliente | TEXT |
| precio | precio_total | NUMERIC |
| inscripcion | inscripcion | NUMERIC |
| descuento | descuento | NUMERIC |

---

## 📝 Notas Importantes

1. **Foto del Cliente**: Se usa `assets/avatar-placeholder.png` como fallback si no existe foto
2. **Edad Calculada**: Se calcula automáticamente desde `fecha_nacimiento`
3. **Instructor por Nombre**: Se obtiene mediante fetch adicional a `/api/instructores/:id`
4. **Progreso de Horas**: Se calcula como `(horas_completadas / horas_requeridas) * 100`
5. **Horas Restantes**: Se calcula como `horas_requeridas - horas_completadas`
6. **Estado Cliente**: Por defecto es "Activo" si no se especifica

---

## 🎯 Próximas Fases (NO INCLUIDAS EN ESTA VERSIÓN)

Para desarrollar después de validar Información General al 100%:

1. **Pestaña Foto**: Modal para subir foto del cliente
2. **Pestaña Pagos**: Mejorar vista (ya funciona, pero expandir)
3. **Pestaña Asistencias**: Mejorar vista (ya funciona, pero expandir)
4. **Pestaña Documentos**: Ya funciona completamente
5. **Pestaña Observaciones**: Ya funciona completamente
6. **Pestaña Evaluaciones**: CRUD completo
7. **Pestaña Exámenes**: CRUD completo
8. **Pestaña Certificados**: CRUD completo

---

## ❓ Solución de Problemas

### El formulario no carga instructores
**Solución:** Asegúrate que el backend esté corriendo y que existan instructores en `/api/instructores`

### La foto no se muestra
**Solución:** Coloca la imagen en `assets/avatar-placeholder.png` o sube una foto mediante la pestaña Documentos

### El progreso de horas es 0%
**Solución:** Asegúrate que `horas_requeridas` sea > 0 en el formulario

### El instructor muestra "—"
**Solución:** Asegúrate que el `instructor_id` sea válido y que exista ese instructor en la BD

### Los campos nuevos no se guardan
**Solución:** Reinicia el backend para que se creen las columnas nuevas en la BD

---

## ✨ Diseño y UX

- **Responsive**: 2 columnas en md+, 1 columna en pantallas pequeñas
- **Iconos Bootstrap**: Cada campo tiene un ícono descriptivo
- **Badges**: Estado del cliente con colores
- **Progress Bar**: Barra de progreso profesional con porcentaje
- **Cards**: Diseño limpio y organizado
- **Espaciado**: HR separadores entre secciones
- **Tipografía**: Headings claros, texto muted para etiquetas

---

**Versión:** 1.0
**Última actualización:** 2026-07-09
**Estado:** ✅ Información General - Completado al 100%
