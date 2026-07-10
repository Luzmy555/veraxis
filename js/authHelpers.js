function getUserRole() {
  return (localStorage.getItem('userRole') || '').toString().toLowerCase();
}

function getCurrentUser() {
  return localStorage.getItem('currentUser') || '';
}

function getAuthHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-user-role': getUserRole(),
    'x-user-id': localStorage.getItem('currentUserId') || ''
  };
}

function isAdmin() {
  return getUserRole() === 'admin';
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

function logout() {
  localStorage.removeItem('sesionActiva');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserId');
  window.location.href = 'login.html';
}
