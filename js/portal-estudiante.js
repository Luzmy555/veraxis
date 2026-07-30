async function fetchJson(url) {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Descarga un archivo autenticado (fetch + blob) porque un <a href> normal no puede
// llevar el header Authorization; abre el resultado en una pestaña nueva.
async function descargarArchivo(url, nombreSugerido) {
  try {
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('No se pudo descargar el archivo.');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    a.download = nombreSugerido || '';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch (error) {
    alert(error.message || 'No se pudo descargar el archivo.');
  }
}

function formatoMoneda(num) {
  return `RD$ ${(parseFloat(num) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderHeader(cliente) {
  document.getElementById('nombreEstudiante').textContent = cliente.nombre || '—';
  document.getElementById('metaEstudiante').textContent = `${cliente.curso_nombre || cliente.curso_actual || 'Sin curso asignado'} · Instructor: ${cliente.instructor_nombre || 'Sin asignar'}`;
  const badge = document.getElementById('badgeEstado');
  badge.textContent = cliente.estado_cliente || 'Inscrito';

  const foto = cliente.foto ? `${API_BASE}/uploads/clientes/${cliente.id}/${cliente.foto}` : 'assets/avatar-placeholder.png';
  document.getElementById('fotoEstudiante').src = foto;

  const requeridas = cliente.horas_requeridas || 0;
  const completadas = cliente.horas_completadas || 0;
  const pct = requeridas ? Math.min(100, Math.round((completadas / requeridas) * 100)) : 0;
  document.getElementById('barraProgreso').style.width = pct + '%';
  document.getElementById('barraProgreso').textContent = pct + '%';
  document.getElementById('horasInfo').textContent = `${completadas} / ${requeridas} hrs`;
  document.getElementById('saldoPendiente').textContent = formatoMoneda(cliente.saldo_pendiente);
}

function renderGeneral(cliente) {
  const el = document.getElementById('generalContent');
  el.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <h6 class="text-muted small">Teléfono</h6>
        <p>${escapeHtml(cliente.telefono) || '—'}</p>
        <h6 class="text-muted small">Correo</h6>
        <p>${escapeHtml(cliente.email) || '—'}</p>
        <h6 class="text-muted small">Dirección</h6>
        <p>${escapeHtml(cliente.direccion) || '—'} ${escapeHtml(cliente.ciudad) || ''}</p>
      </div>
      <div class="col-md-6">
        <h6 class="text-muted small">Contacto de emergencia</h6>
        <p>${escapeHtml(cliente.contacto_emergencia) || '—'} ${cliente.telefono_emergencia ? '· ' + escapeHtml(cliente.telefono_emergencia) : ''}</p>
        <h6 class="text-muted small">Curso</h6>
        <p>${escapeHtml(cliente.curso_nombre || cliente.curso_actual) || '—'}</p>
        <h6 class="text-muted small">Precio total del curso</h6>
        <p>${formatoMoneda(cliente.precio_total)}</p>
      </div>
    </div>
  `;
}

function renderPagos(pagos) {
  const el = document.getElementById('pagosContent');
  if (!pagos.length) { el.innerHTML = '<p class="text-muted">Sin pagos registrados todavía.</p>'; return; }
  el.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-sm">
        <thead class="table-dark"><tr><th>Fecha</th><th>Concepto</th><th>Método</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody>
          ${pagos.map(p => `<tr>
            <td>${new Date(p.fecha).toLocaleDateString('es-DO')}</td>
            <td>${escapeHtml(p.concepto)}</td>
            <td>${escapeHtml(p.metodo_pago || 'Efectivo')}</td>
            <td>${formatoMoneda(p.monto)}</td>
            <td>${escapeHtml(p.estado)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAsistencias(asistencias) {
  const el = document.getElementById('asistenciasContent');
  if (!asistencias.length) { el.innerHTML = '<p class="text-muted">Sin asistencias registradas todavía.</p>'; return; }
  el.innerHTML = `
    <div class="list-group">
      ${asistencias.map(a => `<div class="list-group-item">${new Date(a.fecha).toLocaleString('es-DO')} — ${escapeHtml(a.estado) || (a.asistio ? 'Presente' : 'Ausente')}</div>`).join('')}
    </div>
  `;
}

function renderHorario(clases) {
  const el = document.getElementById('horarioContent');
  if (!clases.length) { el.innerHTML = '<p class="text-muted">Sin clases programadas todavía.</p>'; return; }
  el.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-sm">
        <thead class="table-dark"><tr><th>Día</th><th>Hora</th><th># Clase</th></tr></thead>
        <tbody>
          ${clases.map(h => `<tr><td>${escapeHtml(h.dia)}</td><td>${escapeHtml(h.hora)}</td><td>${h.numero_clase || 1}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderEvaluaciones(evaluaciones) {
  const el = document.getElementById('evaluacionesContent');
  if (!evaluaciones.length) { el.innerHTML = '<p class="text-muted">Sin evaluaciones registradas todavía.</p>'; return; }
  el.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-sm">
        <thead class="table-dark"><tr><th>Fecha</th><th>Tipo</th><th>Calificación</th><th>Comentarios</th></tr></thead>
        <tbody>
          ${evaluaciones.map(e => `<tr>
            <td>${new Date(e.fecha).toLocaleDateString('es-DO')}</td>
            <td>${escapeHtml(e.tipo)}</td>
            <td>${e.calificacion ?? '—'}</td>
            <td>${escapeHtml(e.comentarios) || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderExamenes(examenes) {
  const el = document.getElementById('examenesContent');
  if (!examenes.length) { el.innerHTML = '<p class="text-muted">Sin exámenes registrados todavía.</p>'; return; }
  el.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered table-sm">
        <thead class="table-dark"><tr><th>Fecha</th><th>Tipo</th><th>Intento</th><th>Resultado</th><th>Calificación</th></tr></thead>
        <tbody>
          ${examenes.map(e => `<tr>
            <td>${new Date(e.fecha).toLocaleDateString('es-DO')}</td>
            <td>${escapeHtml(e.tipo)}</td>
            <td>${e.intento_numero}</td>
            <td>${escapeHtml(e.resultado)}</td>
            <td>${e.calificacion ?? '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCertificados(certificados, clienteId) {
  const el = document.getElementById('certificadosContent');
  if (!certificados.length) { el.innerHTML = '<p class="text-muted">Sin certificados emitidos todavía.</p>'; return; }
  el.innerHTML = `
    <div class="list-group">
      ${certificados.map(c => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(c.numero_certificado || 'Sin número')}</strong>
            <div class="small text-muted">${escapeHtml(c.estado)} · ${c.fecha_emision ? new Date(c.fecha_emision).toLocaleDateString('es-DO') : 'Sin fecha'}</div>
          </div>
          ${c.archivo ? `<button class="btn btn-sm btn-outline-success" data-cert-id="${c.id}">Descargar</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
  el.querySelectorAll('[data-cert-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      descargarArchivo(`${API_BASE}/api/clientes/${clienteId}/certificados/${btn.dataset.certId}/download`, 'certificado');
    });
  });
}

async function cargarPortal() {
  try {
    const cliente = await fetchJson(`${API_BASE}/api/clientes/me`);
    document.getElementById('portalContenido').style.display = 'block';

    renderHeader(cliente);
    renderGeneral(cliente);

    const [pagos, asistencias, horario, evaluaciones, examenes, certificados] = await Promise.all([
      fetchJson(`${API_BASE}/api/pagos/cliente/${cliente.id}`),
      fetchJson(`${API_BASE}/api/asistencias/cliente/${cliente.id}`),
      fetchJson(`${API_BASE}/api/horarios/me`),
      fetchJson(`${API_BASE}/api/clientes/${cliente.id}/evaluaciones`),
      fetchJson(`${API_BASE}/api/clientes/${cliente.id}/examenes`),
      fetchJson(`${API_BASE}/api/clientes/${cliente.id}/certificados`)
    ]);

    renderPagos(pagos);
    renderAsistencias(asistencias);
    renderHorario(horario);
    renderEvaluaciones(evaluaciones);
    renderExamenes(examenes);
    renderCertificados(certificados, cliente.id);
  } catch (error) {
    console.error('Error cargando portal del estudiante:', error);
    document.getElementById('sinAcceso').style.display = 'block';
  }
}

function abrirCambiarClave() {
  document.getElementById('claveNueva').value = '';
  new bootstrap.Modal(document.getElementById('modalCambiarClave')).show();
}

document.getElementById('formCambiarClave').addEventListener('submit', async (e) => {
  e.preventDefault();
  const clave = document.getElementById('claveNueva').value;
  if (clave.length < 8) {
    alert('La contraseña debe tener al menos 8 caracteres.');
    return;
  }
  try {
    const selfRes = await fetch(`${API_BASE}/api/configuracion/usuario/self`, { headers: getAuthHeaders() });
    const self = await selfRes.json();
    if (!selfRes.ok) throw new Error(self.error || 'No se pudo cargar tu usuario.');

    const res = await fetch(`${API_BASE}/api/configuracion/usuario/self`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: self.usuario, clave })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la contraseña.');

    bootstrap.Modal.getInstance(document.getElementById('modalCambiarClave')).hide();
    alert('Contraseña actualizada correctamente.');
  } catch (error) {
    alert(error.message || 'No se pudo actualizar la contraseña.');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  if (getUserRole() !== 'estudiante') {
    window.location.href = 'panel.html';
    return;
  }
  aplicarBranding();
  cargarPortal();
});
