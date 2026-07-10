Preparación y cambios aplicados (fecha: 2026-05-21)

- Añadido `js/authHelpers.js` en páginas clave para enviar headers de sesión/rol.
- Modificado `pagos.html` para usar `getAuthHeaders()` en fetch (GET/POST/DELETE).
- Modificado `asistencias.html` para usar `getAuthHeaders()` en fetch (GET/POST).
- Corregido y limpiado `horario.html`; añadido `getAuthHeaders()` y reparado scripts rotos.
- Añadido perfil-instructor UI en `panel.html`: tarjeta de perfil, modal de perfil y estilos.
- Backend: `dashboardController` ahora responde métricas filtradas por instructor cuando `x-user-role`/`x-user-id` están presentes.
- Backend: añadida ruta PUT `/api/configuracion/usuario/self` para que usuarios actualicen su propio usuario/clave.

Pruebas realizadas:
- Backend arrancó en http://localhost:4000
- Endpoints clave (`/api/clientes`, `/api/pagos`, `/api/asistencias`, `/api/horarios`) respondieron correctamente.
- Pruebas POST/DELETE para `pagos` y `horarios` y POST para `asistencias` pasaron.

Siguientes pasos:
1. Finalizar mejoras del `panel.html` (perfil, métricas específicas para instructor, accesos).
2. Revisar UX en navegador y ajustar estilos/ocultamientos según rol.
3. Commit de los cambios y preparar instrucciones para despliegue.
