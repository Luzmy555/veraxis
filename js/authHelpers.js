function getUserRole() {
  return (localStorage.getItem('userRole') || '').toString().toLowerCase();
}

function getCurrentUser() {
  return localStorage.getItem('currentUser') || '';
}

function getToken() {
  return localStorage.getItem('authToken') || '';
}

// '' (vacío) = usuario global, ve todas las sedes. Un valor = atado a esa sede.
function getSucursalId() {
  return localStorage.getItem('sucursalId') || '';
}

function esUsuarioGlobal() {
  return !getSucursalId();
}

// Escapa texto antes de insertarlo en innerHTML, para que nombres/comentarios/nombres
// de archivo que contengan < > " ' no puedan inyectar HTML/JS (XSS almacenado).
function escapeHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAuthHeaders() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function isAdmin() {
  const role = getUserRole();
  return role === 'admin' || role === 'administrador';
}

function isInstructor() {
  const role = getUserRole();
  return role === 'instructor' || role === 'usuario';
}

function requireAdminPage() {
  if (!isAdmin()) {
    alert('Acceso no autorizado. Solo administradores pueden ver esta sección.');
    window.location.href = 'panel.html';
    return false;
  }
  return true;
}

function requireStaffPage() {
  if (!isAdmin() && !isInstructor()) {
    alert('Acceso no autorizado.');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Aplica el nombre/logo configurados en Configuración > Información de la Academia
// a cualquier página que marque sus elementos de header con data-branding="nombre"/"logo".
async function aplicarBranding() {
  try {
    const res = await fetch(API_BASE + '/api/configuracion/branding');
    if (!res.ok) return;
    const config = await res.json();

    if (config.nombre_sistema) {
      document.querySelectorAll('[data-branding="nombre"]').forEach((el) => {
        el.textContent = config.nombre_sistema;
      });
      // Reemplaza lo que haya después del último "| " en el título (en vez de un nombre
      // fijo) para que un futuro cambio de marca no dependa de editar este archivo también.
      document.title = document.title.includes(' | ')
        ? document.title.replace(/\|\s*[^|]+$/, `| ${config.nombre_sistema}`)
        : config.nombre_sistema;
    }
    if (config.logo_url) {
      document.querySelectorAll('[data-branding="logo"]').forEach((el) => {
        el.src = `${API_BASE}/uploads/config/${config.logo_url}`;
      });
    }
  } catch (error) {
    console.error('Error aplicando branding:', error);
  }
}

function logout() {
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('authToken');
  localStorage.removeItem('sucursalId');
  window.location.href = 'login.html';
}

// Todas las llamadas a la API pasan por aquí: se les agrega el token automáticamente
// y si el servidor responde 401 (sesión inválida o expirada) se cierra sesión sola.
(function installAuthFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const isApiCall = url.includes('/api/');

    if (isApiCall) {
      init = init || {};
      const headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
      const token = getToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init.headers = headers;
    }

    return originalFetch(input, init).then((res) => {
      if (isApiCall && res.status === 401 && !url.includes('/api/auth/login')) {
        const yaEnLogin = window.location.pathname.endsWith('login.html');
        localStorage.removeItem('sesionActiva');
        localStorage.removeItem('userRole');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('authToken');
        localStorage.removeItem('sucursalId');
        if (!yaEnLogin) {
          window.location.href = 'login.html';
        }
      }
      return res;
    });
  };
})();
