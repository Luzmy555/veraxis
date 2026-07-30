const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB, igual que el límite del backend

function validarArchivo(file) {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return 'Formato no permitido. Usa JPG, PNG, WEBP o PDF.';
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return 'El archivo supera el tamaño máximo permitido (5 MB).';
  }
  return null;
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Un <img src> o <a href> normal no puede llevar el header Authorization, así que
// los archivos que sirve /api/... (documentos, certificados) hay que traerlos con
// fetch (que sí lleva el token) y abrirlos/descargarlos como blob.
async function abrirArchivoAutenticado(url, nombreDescarga) {
  try {
    const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('No se pudo abrir el archivo.');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (nombreDescarga) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombreDescarga;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(blobUrl, '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return blobUrl;
  } catch (error) {
    if (typeof showToast === 'function') showToast(error.message || 'No se pudo abrir el archivo.', 'danger');
    else alert(error.message || 'No se pudo abrir el archivo.');
    return null;
  }
}

function getIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function getEstadoBadgeClass(estado) {
  const value = String(estado || '').toLowerCase();
  if (value.includes('gradu')) return 'bg-success';
  if (value.includes('curso') || value.includes('curso')) return 'bg-info';
  if (value.includes('suspend')) return 'bg-warning text-dark';
  if (value.includes('retir')) return 'bg-secondary';
  if (value.includes('inactivo')) return 'bg-secondary';
  return 'bg-primary';
}

async function renderHeader(cliente) {
  const estado = cliente.estado_cliente || cliente.estado || 'Inscrito';
  document.getElementById('nombreCliente').textContent = cliente.nombre || '—';
  document.getElementById('metaCliente').textContent = `${cliente.curso_nombre || cliente.curso_actual || ''} · Instructor: ${cliente.instructor_nombre || cliente.instructor_id || '—'}`;
  const foto = cliente.foto ? `${API_BASE}/uploads/clientes/${cliente.id}/${cliente.foto}` : 'assets/avatar-placeholder.png';
  document.getElementById('fotoCliente').src = foto;
  document.getElementById('fechaInscripcion').textContent = cliente.fecha ? new Date(cliente.fecha).toLocaleDateString('es-DO') : '';
  const badgeEstado = document.getElementById('badgeEstado');
  badgeEstado.textContent = estado;
  badgeEstado.className = `badge ${getEstadoBadgeClass(estado)}`;
  const requeridas = cliente.horas_requeridas || 0;
  const completadas = cliente.horas_completadas || 0;
  const pct = requeridas ? Math.min(100, Math.round((completadas / requeridas) * 100)) : 0;
  document.getElementById('barraProgreso').style.width = pct + '%';
  document.getElementById('barraProgreso').textContent = pct + '%';
  document.getElementById('horasInfo').textContent = `${completadas} / ${requeridas} hrs`;
  document.getElementById('saldoPendiente').textContent = (cliente.saldo_pendiente || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

let clienteActual = null;

async function loadGeneral(id) {
  const cliente = await fetchJson(`${API_BASE}/api/clientes/${id}`);
  clienteActual = cliente;

  let instructorNombre = cliente.instructor_nombre || '—';
  if (!cliente.instructor_nombre && cliente.instructor_id) {
    try {
      const instructor = await fetchJson(`${API_BASE}/api/instructores/${cliente.instructor_id}`);
      instructorNombre = instructor.nombre || '—';
    } catch (e) {
      console.warn('No se pudo obtener instructor:', e);
    }
  }

  // Calcular edad
  const calcularEdad = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };
  const edad = calcularEdad(cliente.fecha_nacimiento);

  // Calcular horas restantes y porcentaje
  const horasRequeridas = cliente.horas_requeridas || 0;
  const horasCompletadas = cliente.horas_completadas || 0;
  const horasRestantes = Math.max(0, horasRequeridas - horasCompletadas);
  const porcentaje = horasRequeridas ? Math.min(100, Math.round((horasCompletadas / horasRequeridas) * 100)) : 0;

  // Foto del cliente
  const fotoUrl = cliente.foto ? `${API_BASE}/uploads/clientes/${id}/${cliente.foto}` : 'assets/avatar-placeholder.png';

  const container = document.getElementById('infoGeneral');
  container.innerHTML = `
    <div class="row g-3">
      <!-- CARD 1: INFORMACIÓN PERSONAL -->
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0"><i class="bi bi-person-fill me-2"></i>Información Personal</h5>
          </div>
          <div class="card-body">
            <div class="text-center mb-3">
              <img src="${escapeHtml(fotoUrl)}" alt="Foto cliente" class="img-fluid rounded" style="width:120px; height:120px; object-fit:cover;" />
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-person me-1"></i>Nombre Completo</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.nombre) || '—'}</strong></p>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-card-text me-1"></i>Cédula</h6>
                <p class="mb-0"><strong>${escapeHtml(cliente.cedula) || '—'}</strong></p>
              </div>
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-venus-mars me-1"></i>Sexo</h6>
                <p class="mb-0"><strong>${cliente.sexo === 'M' ? 'Masculino' : cliente.sexo === 'F' ? 'Femenino' : escapeHtml(cliente.sexo) || '—'}</strong></p>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-cake2 me-1"></i>Fecha Nacimiento</h6>
                <p class="mb-0"><strong>${cliente.fecha_nacimiento ? new Date(cliente.fecha_nacimiento).toLocaleDateString('es-DO') : '—'}</strong></p>
              </div>
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-calendar-event me-1"></i>Edad</h6>
                <p class="mb-0"><strong>${edad || '—'}</strong></p>
              </div>
            </div>

            <hr />

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-telephone me-1"></i>Teléfono</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.telefono) || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-envelope me-1"></i>Correo Electrónico</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.email) || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-geo-alt me-1"></i>Dirección</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.direccion) || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-building me-1"></i>Ciudad</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.ciudad) || '—'}</strong></p>
            </div>

            <hr />

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Contacto de Emergencia</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.contacto_emergencia) || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-telephone me-1"></i>Teléfono Emergencia</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.telefono_emergencia) || '—'}</strong></p>
            </div>

            <hr />

            <div>
              <h6 class="text-muted small mb-1"><i class="bi bi-info-circle me-1"></i>Estado del Cliente</h6>
              <p class="mb-0">
                <span class="badge ${getEstadoBadgeClass(cliente.estado_cliente || cliente.estado || 'Inscrito')}">
                  ${escapeHtml(cliente.estado_cliente || cliente.estado || 'Inscrito')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CARD 2: INFORMACIÓN ACADÉMICA -->
      <div class="col-md-6">
        <div class="card h-100">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0"><i class="bi bi-book-fill me-2"></i>Información Académica</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-bookmark me-1"></i>Curso</h6>
              <p class="mb-0"><strong>${escapeHtml(cliente.curso_actual) || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-person-badge me-1"></i>Instructor Asignado</h6>
              <p class="mb-0"><strong>${escapeHtml(instructorNombre)}</strong></p>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-calendar-check me-1"></i>Fecha de Inscripción</h6>
                <p class="mb-0"><strong>${cliente.fecha ? new Date(cliente.fecha).toLocaleDateString('es-DO') : '—'}</strong></p>
              </div>
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-activity me-1"></i>Estado del Curso</h6>
                <p class="mb-0"><span class="badge ${getEstadoBadgeClass(cliente.estado_cliente || cliente.estado || 'Inscrito')}">${escapeHtml(cliente.estado_cliente || cliente.estado || 'Inscrito')}</span></p>
              </div>
            </div>

            <hr />

            <h6 class="text-primary fw-bold mb-3"><i class="bi bi-clock me-1"></i>Progreso de Horas</h6>
            
            <div class="row mb-2">
              <div class="col-6">
                <p class="small text-muted mb-1">Horas Completadas</p>
                <p class="mb-0"><strong>${horasCompletadas}</strong></p>
              </div>
              <div class="col-6">
                <p class="small text-muted mb-1">Horas Requeridas</p>
                <p class="mb-0"><strong>${horasRequeridas}</strong></p>
              </div>
            </div>

            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small text-muted">Progreso</span>
                <span class="badge bg-primary">${porcentaje}%</span>
              </div>
              <div class="progress" style="height: 24px;">
                <div class="progress-bar bg-success" role="progressbar" style="width: ${porcentaje}%;" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">
                  <small class="text-white fw-bold">${porcentaje}%</small>
                </div>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <p class="small text-muted mb-1">Horas Restantes</p>
                <p class="mb-0"><strong>${horasRestantes}</strong></p>
              </div>
              <div class="col-6">
                <p class="small text-muted mb-1">Ratio Completado</p>
                <p class="mb-0"><strong>${horasRequeridas > 0 ? Math.round((horasCompletadas / horasRequeridas) * 100) : 0}%</strong></p>
              </div>
            </div>

            <hr />

            <div class="alert alert-info mb-0" role="alert">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Resumen:</strong> El cliente ha completado <strong>${horasCompletadas}</strong> de <strong>${horasRequeridas}</strong> horas requeridas.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  await renderHeader(cliente);
}

async function loadPagos(id) {
  const pagos = await fetchJson(`${API_BASE}/api/pagos/cliente/${id}`);
  const container = document.getElementById('pagosContent');
  if (!Array.isArray(pagos) || pagos.length === 0) return container.innerHTML = '<p>No hay pagos registrados.</p>';
  let total = 0;
  container.innerHTML = `<div class="list-group"></div>`;
  const list = container.querySelector('.list-group');
  pagos.forEach(p => {
    total += parseFloat(p.monto || 0);
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex justify-content-between align-items-start';
    item.innerHTML = `<div><strong>${escapeHtml(p.tipo) || 'Pago'}</strong><div class="small text-muted">${new Date(p.fecha).toLocaleString()}</div></div><div>${(p.monto||0).toLocaleString('en-US',{style:'currency',currency:'USD'})}</div>`;
    list.appendChild(item);
  });
  const saldo = (await fetchJson(`${API_BASE}/api/clientes/${id}`)).saldo_pendiente || 0;
  container.innerHTML += `<div class="mt-3"><strong>Total pagado:</strong> ${(total).toLocaleString('en-US',{style:'currency',currency:'USD'})} <br/><strong>Saldo pendiente:</strong> ${(saldo).toLocaleString('en-US',{style:'currency',currency:'USD'})}</div>`;
}

async function loadAsistencias(id) {
  const asistencias = await fetchJson(`${API_BASE}/api/asistencias/cliente/${id}`);
  const container = document.getElementById('asistenciasContent');
  if (!Array.isArray(asistencias) || asistencias.length === 0) return container.innerHTML = '<p>No hay asistencias registradas.</p>';
  let present = asistencias.filter(a => a.estado === 'presente' || a.asistio === true).length;
  const pct = Math.round((present / asistencias.length) * 100);
  container.innerHTML = `<p>Asistencias: ${present} / ${asistencias.length} (${pct}%)</p>`;
  const list = document.createElement('div');
  list.className = 'list-group';
  asistencias.forEach(a => {
    const el = document.createElement('div');
    el.className = 'list-group-item';
    el.innerHTML = `${new Date(a.fecha).toLocaleString()} - ${escapeHtml(a.estado) || (a.asistio ? 'Presente' : 'Ausente')}`;
    list.appendChild(el);
  });
  container.appendChild(list);
}

function showPreview(url, name) {
  const body = document.getElementById('previewBody');
  const img = document.createElement('img');
  img.className = 'img-fluid';
  img.src = url;
  img.alt = name;
  body.innerHTML = '';
  body.appendChild(img);
  document.getElementById('previewTitle').textContent = name;
  const modal = new bootstrap.Modal(document.getElementById('previewModal'));
  modal.show();
}

function showToast(message, type='info') {
  const container = document.getElementById('toasts');
  const id = 't' + Date.now();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 mb-2`;
  toast.id = id;
  toast.role = 'alert';
  toast.ariaLive = 'assertive';
  toast.ariaAtomic = 'true';
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(toast);
  const bToast = new bootstrap.Toast(toast, { delay: 4000 });
  bToast.show();
}

async function loadDocumentos(id) {
  const docs = await fetchJson(`${API_BASE}/api/clientes/${id}/documentos`);
  const container = document.getElementById('documentosContent');
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'list-group';
  docs.forEach(d => {
    const el = document.createElement('div');
    el.className = 'list-group-item d-flex justify-content-between align-items-center';
    const isImage = (d.mime || '').startsWith('image/');
    const docUrl = `${API_BASE}/api/clientes/${id}/documentos/${d.id}`;
    const docName = d.original_name || d.filename;
    const thumb = isImage ? `<img class="doc-thumb me-2 doc-thumb-img"/>` : `<i class="bi bi-file-earmark-fill fs-3 me-2"></i>`;
    el.innerHTML = `<div class="d-flex align-items-center"><div>${thumb}</div><div><strong>${escapeHtml(d.tipo)}</strong><div class="small text-muted">${escapeHtml(docName)}</div></div></div>
      <div>
        <button class="btn btn-sm btn-outline-primary me-2 btn-ver-doc">${isImage ? 'Ver' : 'Abrir'}</button>
        <button class="btn btn-sm btn-outline-success me-2 btn-descargar-doc">Descargar</button>
        ${typeof isAdmin === 'function' && isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="eliminarDoc(${id}, ${d.id})">Eliminar</button>` : ''}
      </div>`;

    // Los documentos requieren token (no son públicos como /uploads), así que la miniatura
    // y los botones traen el archivo con fetch (con el header ya puesto) en vez de un src/href directo.
    if (isImage) {
      const thumbImg = el.querySelector('.doc-thumb-img');
      (async () => {
        try {
          const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
          const res = await fetch(docUrl, { headers });
          if (res.ok) thumbImg.src = URL.createObjectURL(await res.blob());
        } catch (e) { /* si falla, se queda sin miniatura */ }
      })();
    }
    el.querySelector('.btn-ver-doc').addEventListener('click', async () => {
      if (isImage) {
        const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
        const res = await fetch(docUrl, { headers });
        if (res.ok) showPreview(URL.createObjectURL(await res.blob()), docName);
      } else {
        abrirArchivoAutenticado(docUrl);
      }
    });
    el.querySelector('.btn-descargar-doc').addEventListener('click', () => {
      abrirArchivoAutenticado(`${docUrl}/download`, docName);
    });
    list.appendChild(el);
  });
  container.appendChild(list);
}

function createDocumentUploadForm(id) {
  const area = document.getElementById('documentosUploadArea');
  area.innerHTML = '';
  const role = (typeof getUserRole === 'function') ? getUserRole() : '';
  if (!['admin','administrador','instructor'].includes(role)) {
    area.innerHTML = '<div class="small text-muted">No tienes permisos para subir documentos.</div>';
    return;
  }

  const form = document.createElement('form');
  form.className = 'd-flex gap-2 align-items-center';
  form.enctype = 'multipart/form-data';
  const select = document.createElement('select');
  select.className = 'form-select w-auto';
  ['Cédula','Contrato','Examen médico','Licencia','Otro'].forEach(t => { const o = document.createElement('option'); o.value = t; o.text = t; select.appendChild(o); });
  const previewImg = document.createElement('img'); previewImg.className = 'doc-thumb me-2 d-none';
  const file = document.createElement('input'); file.type = 'file'; file.className = 'form-control form-control-sm';
  file.accept = 'image/jpeg,image/png,image/webp,application/pdf';
  const btn = document.createElement('button'); btn.className = 'btn btn-sm btn-success'; btn.textContent = 'Subir';
  const progressWrap = document.createElement('div'); progressWrap.className = 'flex-grow-1 d-none ms-2';
  const progressBar = document.createElement('div'); progressBar.className = 'progress upload-progress';
  progressBar.innerHTML = '<div class="progress-bar" style="width:0%"></div>';
  progressWrap.appendChild(progressBar);

  form.appendChild(select); form.appendChild(previewImg); form.appendChild(file); form.appendChild(btn); form.appendChild(progressWrap);

  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) { previewImg.classList.add('d-none'); return; }
    if (f.type && f.type.startsWith('image/')) {
      previewImg.src = URL.createObjectURL(f);
      previewImg.classList.remove('d-none');
    } else {
      previewImg.classList.add('d-none');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!file.files[0]) return showToast('Selecciona un archivo', 'warning');
    const errorArchivo = validarArchivo(file.files[0]);
    if (errorArchivo) return showToast(errorArchivo, 'warning');
    const fd = new FormData();
    fd.append('file', file.files[0]);
    fd.append('tipo', select.value);
    const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
    if (headers['Content-Type']) delete headers['Content-Type'];

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/clientes/${id}/documentos`);
    Object.entries(headers).forEach(([k,v]) => xhr.setRequestHeader(k, v));
    progressWrap.classList.remove('d-none');
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded/ev.total)*100);
        progressBar.firstElementChild.style.width = pct + '%';
      }
    };
    xhr.onload = () => {
      progressBar.firstElementChild.style.width = '0%';
      progressWrap.classList.add('d-none');
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('Documento subido', 'success');
        file.value = '';
        previewImg.classList.add('d-none');
        loadDocumentos(id);
      } else {
        showToast('Error subiendo documento', 'danger');
        console.error('Upload error', xhr.status, xhr.responseText);
      }
    };
    xhr.onerror = () => { showToast('Error de conexión', 'danger'); };
    xhr.send(fd);
  });
  area.appendChild(form);
}

async function eliminarDoc(clienteId, docId) {
  if (!confirm('Eliminar documento?')) return;
  await fetch(`${API_BASE}/api/clientes/${clienteId}/documentos/${docId}`, { method: 'DELETE' });
  loadDocumentos(clienteId);
}

async function loadObservaciones(id) {
  const obs = await fetchJson(`${API_BASE}/api/clientes/${id}/observaciones`);
  const container = document.getElementById('observacionesContent');
  container.innerHTML = '';
  const form = document.createElement('form');
  form.className = 'mb-3 d-flex gap-2';
  const input = document.createElement('input');
  input.className = 'form-control';
  input.placeholder = 'Agregar observación...';
  form.appendChild(input);
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Guardar';
  form.appendChild(btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.value.trim()) return alert('Comentario requerido');
    const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type':'application/json' };
    await fetch(`${API_BASE}/api/clientes/${id}/observaciones`, {
      method: 'POST', headers, body: JSON.stringify({ comentario: input.value.trim() })
    });
    input.value = '';
    loadObservaciones(id);
  });
  container.appendChild(form);

  if (!Array.isArray(obs) || obs.length === 0) return container.appendChild(document.createElement('div')).innerHTML = '<p>No hay observaciones.</p>';
  const list = document.createElement('div');
  list.className = 'list-group';
  obs.forEach(o => {
    const el = document.createElement('div');
    el.className = 'list-group-item d-flex justify-content-between align-items-start';
    el.innerHTML = `<div><strong>${escapeHtml(o.usuario_nombre) || 'Usuario'}</strong> <small class="text-muted">${escapeHtml(o.usuario_rol)} · ${new Date(o.created_at).toLocaleString()}</small><div class="mt-2">${escapeHtml(o.comentario)}</div></div>
      <div>${typeof isAdmin === 'function' && isAdmin() ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarObs(${id}, ${o.id})">Eliminar</button>` : ''}</div>`;
    list.appendChild(el);
  });
  container.appendChild(list);
}

async function eliminarObs(clienteId, obsId) {
  if (!confirm('Eliminar observación?')) return;
  await fetch(`${API_BASE}/api/clientes/${clienteId}/observaciones/${obsId}`, { method: 'DELETE' });
  loadObservaciones(clienteId);
}

function puedeGestionar() {
  const role = (typeof getUserRole === 'function') ? getUserRole() : '';
  return ['admin', 'administrador', 'instructor'].includes(role);
}

// ===== EVALUACIONES =====

let evaluacionEditId = null;

async function loadEvaluaciones(id) {
  const container = document.getElementById('evaluacionesContent');
  container.innerHTML = '';
  evaluacionEditId = null;

  if (puedeGestionar()) {
    const form = document.createElement('form');
    form.className = 'row g-2 align-items-end mb-3';
    form.innerHTML = `
      <div class="col-md-2">
        <label class="form-label small">Tipo</label>
        <select class="form-select form-select-sm" name="tipo" required>
          <option value="Teórica">Teórica</option>
          <option value="Práctica">Práctica</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Fecha</label>
        <input type="date" class="form-control form-control-sm" name="fecha" required value="${new Date().toISOString().slice(0,10)}" />
      </div>
      <div class="col-md-2">
        <label class="form-label small">Calificación (0-100)</label>
        <input type="number" class="form-control form-control-sm" name="calificacion" min="0" max="100" step="0.01" />
      </div>
      <div class="col-md-4">
        <label class="form-label small">Comentarios</label>
        <input type="text" class="form-control form-control-sm" name="comentarios" placeholder="Observaciones de la evaluación" />
      </div>
      <div class="col-md-2 d-flex gap-1">
        <button type="submit" class="btn btn-sm btn-primary w-100" id="btnGuardarEvaluacion">Registrar</button>
        <button type="button" class="btn btn-sm btn-outline-secondary d-none" id="btnCancelarEdicionEvaluacion">Cancelar</button>
      </div>
    `;
    form.querySelector('#btnCancelarEdicionEvaluacion').addEventListener('click', () => {
      evaluacionEditId = null;
      form.reset();
      form.querySelector('#btnGuardarEvaluacion').textContent = 'Registrar';
      form.querySelector('#btnCancelarEdicionEvaluacion').classList.add('d-none');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      const editando = !!evaluacionEditId;
      const url = editando
        ? `${API_BASE}/api/clientes/${id}/evaluaciones/${evaluacionEditId}`
        : `${API_BASE}/api/clientes/${id}/evaluaciones`;
      try {
        const res = await fetch(url, {
          method: editando ? 'PUT' : 'POST', headers,
          body: JSON.stringify(Object.fromEntries(fd.entries()))
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo guardar la evaluación');
        }
        showToast(editando ? 'Evaluación actualizada' : 'Evaluación registrada', 'success');
        evaluacionEditId = null;
        loadEvaluaciones(id);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
    container.appendChild(form);
  }

  const evaluaciones = await fetchJson(`${API_BASE}/api/clientes/${id}/evaluaciones`);
  renderProgresoEvaluaciones(evaluaciones);

  if (!Array.isArray(evaluaciones) || evaluaciones.length === 0) {
    container.innerHTML += '<p class="text-muted">No hay evaluaciones registradas.</p>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'list-group';
  evaluaciones.forEach(ev => {
    const el = document.createElement('div');
    el.className = 'list-group-item d-flex justify-content-between align-items-start';
    el.innerHTML = `
      <div>
        <span class="badge ${ev.tipo === 'Práctica' ? 'bg-info' : 'bg-secondary'} me-2">${escapeHtml(ev.tipo)}</span>
        <strong>${new Date(ev.fecha).toLocaleDateString('es-DO')}</strong>
        ${ev.calificacion != null ? ` · Calificación: <strong>${escapeHtml(ev.calificacion)}</strong>` : ''}
        <div class="small text-muted mt-1">${escapeHtml(ev.comentarios)}</div>
        <div class="small text-muted">Registrado por: ${escapeHtml(ev.registrado_por_nombre) || '—'} (${escapeHtml(ev.registrado_por_rol) || '—'})</div>
      </div>
      <div>
        ${puedeGestionar() ? `<button class="btn btn-sm btn-outline-primary me-2 btn-editar-evaluacion">Editar</button>` : ''}
        ${(typeof isAdmin === 'function' && isAdmin()) ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarEvaluacion(${id}, ${ev.id})">Eliminar</button>` : ''}
      </div>
    `;
    const btnEditar = el.querySelector('.btn-editar-evaluacion');
    if (btnEditar) {
      btnEditar.addEventListener('click', () => {
        evaluacionEditId = ev.id;
        const form = container.querySelector('form');
        form.querySelector('[name="tipo"]').value = ev.tipo;
        form.querySelector('[name="fecha"]').value = new Date(ev.fecha).toISOString().slice(0, 10);
        form.querySelector('[name="calificacion"]').value = ev.calificacion ?? '';
        form.querySelector('[name="comentarios"]').value = ev.comentarios || '';
        form.querySelector('#btnGuardarEvaluacion').textContent = 'Guardar cambios';
        form.querySelector('#btnCancelarEdicionEvaluacion').classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    list.appendChild(el);
  });
  container.appendChild(list);
}

let graficoProgresoChart = null;

function renderProgresoEvaluaciones(evaluaciones) {
  const wrap = document.getElementById('graficoProgresoWrap');
  const alertaBox = document.getElementById('alertaProgreso');
  const canvas = document.getElementById('graficoProgreso');
  alertaBox.innerHTML = '';

  const puntos = (Array.isArray(evaluaciones) ? evaluaciones : [])
    .filter(ev => ev.calificacion != null)
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  if (puntos.length < 1) {
    wrap.classList.add('d-none');
    if (graficoProgresoChart) { graficoProgresoChart.destroy(); graficoProgresoChart = null; }
    return;
  }

  wrap.classList.remove('d-none');
  const labels = puntos.map(p => new Date(p.fecha).toLocaleDateString('es-DO'));
  const data = puntos.map(p => parseFloat(p.calificacion));

  if (graficoProgresoChart) graficoProgresoChart.destroy();
  graficoProgresoChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Calificación',
        data,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13,148,136,0.15)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      scales: { y: { min: 0, max: 100 } },
      plugins: { legend: { display: false } }
    }
  });

  // Alerta: promedio bajo o tendencia descendente en las últimas evaluaciones
  const ultimas = data.slice(-3);
  const promedioUltimas = ultimas.reduce((a, b) => a + b, 0) / ultimas.length;
  const tendenciaBaja = data.length >= 2 && data[data.length - 1] < data[0] && promedioUltimas < 75;

  if (promedioUltimas < 60) {
    alertaBox.innerHTML = `<div class="alert alert-danger py-2"><i class="bi bi-exclamation-octagon-fill me-2"></i>Bajo rendimiento: promedio de las últimas evaluaciones es <strong>${promedioUltimas.toFixed(1)}</strong>.</div>`;
  } else if (tendenciaBaja) {
    alertaBox.innerHTML = `<div class="alert alert-warning py-2"><i class="bi bi-graph-down me-2"></i>Tendencia a la baja en las evaluaciones recientes. Vale la pena dar seguimiento.</div>`;
  }
}

async function eliminarEvaluacion(clienteId, evalId) {
  if (!confirm('¿Eliminar esta evaluación?')) return;
  const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
  await fetch(`${API_BASE}/api/clientes/${clienteId}/evaluaciones/${evalId}`, { method: 'DELETE', headers });
  loadEvaluaciones(clienteId);
}

// ===== EXÁMENES =====

function getResultadoBadgeClass(resultado) {
  if (resultado === 'Aprobado') return 'bg-success';
  if (resultado === 'Reprobado') return 'bg-danger';
  return 'bg-secondary';
}

let examenEditId = null;

async function loadExamenes(id) {
  const container = document.getElementById('examenesContent');
  container.innerHTML = '';
  examenEditId = null;

  if (puedeGestionar()) {
    const form = document.createElement('form');
    form.className = 'row g-2 align-items-end mb-3';
    form.innerHTML = `
      <div class="col-md-2">
        <label class="form-label small">Tipo</label>
        <select class="form-select form-select-sm" name="tipo" required>
          <option value="Teórico">Teórico</option>
          <option value="Práctico">Práctico</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Fecha</label>
        <input type="date" class="form-control form-control-sm" name="fecha" required value="${new Date().toISOString().slice(0,10)}" />
      </div>
      <div class="col-md-2">
        <label class="form-label small">Resultado</label>
        <select class="form-select form-select-sm" name="resultado">
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Reprobado">Reprobado</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Calificación</label>
        <input type="number" class="form-control form-control-sm" name="calificacion" min="0" max="100" step="0.01" />
      </div>
      <div class="col-md-1">
        <label class="form-label small">Intento #</label>
        <input type="number" class="form-control form-control-sm" name="intento_numero" min="1" value="1" />
      </div>
      <div class="col-md-2">
        <label class="form-label small">Observaciones</label>
        <input type="text" class="form-control form-control-sm" name="observaciones" />
      </div>
      <div class="col-md-2 d-flex gap-1">
        <button type="submit" class="btn btn-sm btn-primary w-100" id="btnGuardarExamen">Registrar</button>
        <button type="button" class="btn btn-sm btn-outline-secondary d-none" id="btnCancelarEdicionExamen">Cancelar</button>
      </div>
    `;
    form.querySelector('#btnCancelarEdicionExamen').addEventListener('click', () => {
      examenEditId = null;
      form.reset();
      form.querySelector('#btnGuardarExamen').textContent = 'Registrar';
      form.querySelector('#btnCancelarEdicionExamen').classList.add('d-none');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      const editando = !!examenEditId;
      const url = editando
        ? `${API_BASE}/api/clientes/${id}/examenes/${examenEditId}`
        : `${API_BASE}/api/clientes/${id}/examenes`;
      try {
        const res = await fetch(url, {
          method: editando ? 'PUT' : 'POST', headers,
          body: JSON.stringify(Object.fromEntries(fd.entries()))
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo guardar el examen');
        }
        showToast(editando ? 'Examen actualizado' : 'Examen registrado', 'success');
        examenEditId = null;
        loadExamenes(id);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
    container.appendChild(form);
  }

  const examenes = await fetchJson(`${API_BASE}/api/clientes/${id}/examenes`);
  if (!Array.isArray(examenes) || examenes.length === 0) {
    container.innerHTML += '<p class="text-muted">No hay exámenes registrados.</p>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'list-group';
  examenes.forEach(ex => {
    const el = document.createElement('div');
    el.className = 'list-group-item d-flex justify-content-between align-items-start';
    el.innerHTML = `
      <div>
        <span class="badge ${getResultadoBadgeClass(ex.resultado)} me-2">${escapeHtml(ex.resultado)}</span>
        <strong>${escapeHtml(ex.tipo)}</strong> · ${new Date(ex.fecha).toLocaleDateString('es-DO')} · Intento #${escapeHtml(ex.intento_numero)}
        ${ex.calificacion != null ? ` · Calificación: <strong>${escapeHtml(ex.calificacion)}</strong>` : ''}
        <div class="small text-muted mt-1">${escapeHtml(ex.observaciones)}</div>
        <div class="small text-muted">Registrado por: ${escapeHtml(ex.registrado_por_nombre) || '—'} (${escapeHtml(ex.registrado_por_rol) || '—'})</div>
      </div>
      <div>
        ${puedeGestionar() ? `<button class="btn btn-sm btn-outline-primary me-2 btn-editar-examen">Editar</button>` : ''}
        ${(typeof isAdmin === 'function' && isAdmin()) ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarExamen(${id}, ${ex.id})">Eliminar</button>` : ''}
      </div>
    `;
    const btnEditar = el.querySelector('.btn-editar-examen');
    if (btnEditar) {
      btnEditar.addEventListener('click', () => {
        examenEditId = ex.id;
        const form = container.querySelector('form');
        form.querySelector('[name="tipo"]').value = ex.tipo;
        form.querySelector('[name="fecha"]').value = new Date(ex.fecha).toISOString().slice(0, 10);
        form.querySelector('[name="resultado"]').value = ex.resultado;
        form.querySelector('[name="calificacion"]').value = ex.calificacion ?? '';
        form.querySelector('[name="intento_numero"]').value = ex.intento_numero;
        form.querySelector('[name="observaciones"]').value = ex.observaciones || '';
        form.querySelector('#btnGuardarExamen').textContent = 'Guardar cambios';
        form.querySelector('#btnCancelarEdicionExamen').classList.remove('d-none');
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    list.appendChild(el);
  });
  container.appendChild(list);
}

async function eliminarExamen(clienteId, examId) {
  if (!confirm('¿Eliminar este examen?')) return;
  const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
  await fetch(`${API_BASE}/api/clientes/${clienteId}/examenes/${examId}`, { method: 'DELETE', headers });
  loadExamenes(clienteId);
}

// ===== CERTIFICADOS =====

function getCertEstadoBadgeClass(estado) {
  return estado === 'Emitido' ? 'bg-success' : 'bg-secondary';
}

async function loadCertificados(id) {
  const container = document.getElementById('certificadosContent');
  container.innerHTML = '';

  if (puedeGestionar()) {
    const form = document.createElement('form');
    form.className = 'row g-2 align-items-end mb-3';
    form.enctype = 'multipart/form-data';
    form.innerHTML = `
      <div class="col-md-3">
        <label class="form-label small">Curso</label>
        <select class="form-select form-select-sm" name="curso_id"><option value="">Seleccionar...</option></select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">N.º Certificado</label>
        <input type="text" class="form-control form-control-sm" name="numero_certificado" placeholder="Automático al emitir" />
      </div>
      <div class="col-md-2">
        <label class="form-label small">Fecha de emisión</label>
        <input type="date" class="form-control form-control-sm" name="fecha_emision" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      <div class="col-md-2">
        <label class="form-label small">Estado</label>
        <select class="form-select form-select-sm" name="estado">
          <option value="Pendiente">Pendiente</option>
          <option value="Emitido">Emitido</option>
        </select>
      </div>
      <div class="col-md-2">
        <label class="form-label small">Archivo (opcional)</label>
        <input type="file" class="form-control form-control-sm" name="archivo" accept="application/pdf,image/*" />
      </div>
      <div class="col-md-1">
        <button type="submit" class="btn btn-sm btn-primary w-100">Guardar</button>
      </div>
      <div class="col-12">
        <div class="form-check">
          <input type="checkbox" class="form-check-input" id="certForzar-${id}" name="forzar" value="true" />
          <label class="form-check-label small text-muted" for="certForzar-${id}">Forzar emisión aunque el estudiante no haya completado sus horas requeridas</label>
        </div>
      </div>
    `;

    try {
      const cursos = await fetchJson(API_BASE + '/api/cursos');
      const select = form.querySelector('select[name="curso_id"]');
      cursos.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id; o.textContent = c.nombre;
        select.appendChild(o);
      });
    } catch (e) {
      console.warn('No se pudieron cargar los cursos para certificados:', e);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const archivoInput = form.querySelector('input[name="archivo"]');
      if (archivoInput.files[0]) {
        const errorArchivo = validarArchivo(archivoInput.files[0]);
        if (errorArchivo) return showToast(errorArchivo, 'warning');
      }
      const fd = new FormData(form);
      const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
      if (headers['Content-Type']) delete headers['Content-Type'];

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/clientes/${id}/certificados`);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          showToast('Certificado guardado', 'success');
          form.reset();
          loadCertificados(id);
        } else {
          let msg = 'No se pudo guardar el certificado';
          try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
          showToast(msg, 'danger');
        }
      };
      xhr.onerror = () => showToast('Error de conexión', 'danger');
      xhr.send(fd);
    });

    container.appendChild(form);
  }

  const certificados = await fetchJson(`${API_BASE}/api/clientes/${id}/certificados`);
  if (!Array.isArray(certificados) || certificados.length === 0) {
    container.innerHTML += '<p class="text-muted">No hay certificados registrados.</p>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'list-group';
  certificados.forEach(c => {
    const el = document.createElement('div');
    el.className = 'list-group-item d-flex justify-content-between align-items-start';
    el.innerHTML = `
      <div>
        <span class="badge ${getCertEstadoBadgeClass(c.estado)} me-2">${escapeHtml(c.estado)}</span>
        <strong>${escapeHtml(c.curso_nombre) || 'Curso no especificado'}</strong>
        ${c.numero_certificado ? ` · N.º ${escapeHtml(c.numero_certificado)}` : ''}
        ${c.fecha_emision ? ` · ${new Date(c.fecha_emision).toLocaleDateString('es-DO')}` : ''}
        <div class="small text-muted mt-1">Emitido por: ${escapeHtml(c.emitido_por_nombre) || '—'}</div>
      </div>
      <div>
        ${c.estado === 'Emitido' ? `<a class="btn btn-sm btn-outline-primary me-2" href="certificado.html?clienteId=${id}&certId=${c.id}" target="_blank">Ver certificado</a>` : ''}
        ${c.archivo ? `<button class="btn btn-sm btn-outline-success me-2 btn-descargar-cert" data-cert-id="${c.id}">Ver/Descargar archivo</button>` : ''}
        ${c.estado !== 'Emitido' && puedeGestionar() ? `<button class="btn btn-sm btn-outline-success me-2" onclick="marcarCertificadoEmitido(${id}, ${c.id})">Marcar como Emitido</button>` : ''}
        ${(typeof isAdmin === 'function' && isAdmin()) ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarCertificado(${id}, ${c.id})">Eliminar</button>` : ''}
      </div>
    `;
    const btnDescargarCert = el.querySelector('.btn-descargar-cert');
    if (btnDescargarCert) {
      btnDescargarCert.addEventListener('click', () => {
        abrirArchivoAutenticado(`${API_BASE}/api/clientes/${id}/certificados/${c.id}/download`);
      });
    }
    list.appendChild(el);
  });
  container.appendChild(list);
}

async function marcarCertificadoEmitido(clienteId, certId) {
  const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
  try {
    const res = await fetch(`${API_BASE}/api/clientes/${clienteId}/certificados/${certId}`, {
      method: 'PUT', headers, body: JSON.stringify({ estado: 'Emitido' })
    });
    const data = await res.json();
    if (!res.ok) {
      const forzar = confirm(`${data.error}\n\n¿Deseas forzar la emisión de todas formas?`);
      if (!forzar) return;
      const res2 = await fetch(`${API_BASE}/api/clientes/${clienteId}/certificados/${certId}`, {
        method: 'PUT', headers, body: JSON.stringify({ estado: 'Emitido', forzar: true })
      });
      const data2 = await res2.json();
      if (!res2.ok) return showToast(data2.error || 'No se pudo emitir el certificado', 'danger');
    }
    showToast('Certificado emitido', 'success');
    loadCertificados(clienteId);
  } catch (err) {
    showToast('Error de conexión', 'danger');
  }
}

async function eliminarCertificado(clienteId, certId) {
  if (!confirm('¿Eliminar este certificado?')) return;
  const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
  await fetch(`${API_BASE}/api/clientes/${clienteId}/certificados/${certId}`, { method: 'DELETE', headers });
  loadCertificados(clienteId);
}

// ===== EDITAR CLIENTE =====

let relacionesEdicionCargadas = false;

async function cargarRelacionesEdicion() {
  if (relacionesEdicionCargadas) return;
  try {
    const [cursos, instructores, sucursales] = await Promise.all([
      fetchJson(API_BASE + '/api/cursos'),
      fetchJson(API_BASE + '/api/instructores'),
      fetchJson(API_BASE + '/api/sucursales')
    ]);
    const cursoSelect = document.getElementById('editCursoId');
    cursos.forEach(curso => {
      const option = document.createElement('option');
      option.value = curso.id; option.textContent = curso.nombre;
      cursoSelect.appendChild(option);
    });
    const instructorSelect = document.getElementById('editInstructorId');
    instructores.forEach(instr => {
      const option = document.createElement('option');
      option.value = instr.id; option.textContent = instr.nombre;
      instructorSelect.appendChild(option);
    });
    const sucursalSelect = document.getElementById('editSucursalId');
    sucursales.forEach(s => {
      const option = document.createElement('option');
      option.value = s.id; option.textContent = s.nombre;
      sucursalSelect.appendChild(option);
    });
    relacionesEdicionCargadas = true;
  } catch (e) {
    console.warn('No se pudieron cargar cursos/instructores para editar:', e);
  }
}

function manejarVistaPreviaFotoEdicion() {
  const input = document.getElementById('editFoto');
  const preview = document.getElementById('editFotoPreview');
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) { preview.classList.add('d-none'); preview.removeAttribute('src'); return; }
    const reader = new FileReader();
    reader.onload = (event) => { preview.src = event.target.result; preview.classList.remove('d-none'); };
    reader.readAsDataURL(file);
  });
}

async function abrirModalEditarCliente() {
  if (!clienteActual) return;
  await cargarRelacionesEdicion();

  document.getElementById('editNombre').value = clienteActual.nombre || '';
  document.getElementById('editTelefono').value = clienteActual.telefono || '';
  document.getElementById('editCedula').value = clienteActual.cedula || '';
  document.getElementById('editFecha').value = clienteActual.fecha ? new Date(clienteActual.fecha).toISOString().slice(0, 10) : '';
  document.getElementById('editCursoActual').value = clienteActual.curso_actual || '';
  document.getElementById('editPrecio').value = clienteActual.precio_total || 0;
  document.getElementById('editInscripcion').value = clienteActual.inscripcion || 0;
  document.getElementById('editDescuento').value = clienteActual.descuento || 0;
  document.getElementById('editCursoId').value = clienteActual.curso_id || '';
  document.getElementById('editInstructorId').value = clienteActual.instructor_id || '';
  document.getElementById('editEmail').value = clienteActual.email || '';
  document.getElementById('editSexo').value = clienteActual.sexo || '';
  document.getElementById('editCiudad').value = clienteActual.ciudad || '';
  document.getElementById('editContactoEmergencia').value = clienteActual.contacto_emergencia || '';
  document.getElementById('editTelefonoEmergencia').value = clienteActual.telefono_emergencia || '';
  document.getElementById('editFechaNacimiento').value = clienteActual.fecha_nacimiento ? new Date(clienteActual.fecha_nacimiento).toISOString().slice(0, 10) : '';
  document.getElementById('editDireccion').value = clienteActual.direccion || '';
  document.getElementById('editHorasRequeridas').value = clienteActual.horas_requeridas || 0;
  document.getElementById('editHorasCompletadas').value = clienteActual.horas_completadas || 0;
  document.getElementById('editEstadoCliente').value = clienteActual.estado_cliente || 'Inscrito';
  document.getElementById('editSucursalId').value = clienteActual.sucursal_id || '';

  const preview = document.getElementById('editFotoPreview');
  document.getElementById('editFoto').value = '';
  if (clienteActual.foto) {
    preview.src = `${API_BASE}/uploads/clientes/${clienteActual.id}/${clienteActual.foto}`;
    preview.classList.remove('d-none');
  } else {
    preview.classList.add('d-none');
    preview.removeAttribute('src');
  }

  new bootstrap.Modal(document.getElementById('modalEditarCliente')).show();
}

async function subirFotoClienteExpediente(id, file) {
  const formData = new FormData();
  formData.append('foto', file);
  const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
  delete headers['Content-Type'];
  const res = await fetch(`${API_BASE}/api/clientes/${id}/foto`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'No se pudo guardar la fotografía');
  }
}

async function abrirAccesoPortal(id) {
  const body = document.getElementById('accesoPortalBody');
  body.innerHTML = 'Creando acceso...';
  new bootstrap.Modal(document.getElementById('modalAccesoPortal')).show();
  try {
    const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
    const res = await fetch(`${API_BASE}/api/clientes/${id}/acceso-portal`, { method: 'POST', headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo crear el acceso.');

    if (data.yaExistia) {
      body.innerHTML = `
        <p>Este estudiante ya tiene acceso al portal.</p>
        <p><strong>Usuario:</strong> ${escapeHtml(data.usuario || '—')}</p>
        <p class="text-muted small">La contraseña no se puede recuperar; si la olvidó, un administrador debe restablecerla desde Configuración &gt; Usuarios y Permisos.</p>
      `;
    } else {
      body.innerHTML = `
        <p>Acceso creado. Copia estos datos ahora y compártelos con el estudiante — la contraseña no se volverá a mostrar:</p>
        <p><strong>Usuario:</strong> ${escapeHtml(data.usuario)}</p>
        <p><strong>Contraseña temporal:</strong> <code>${escapeHtml(data.clave_temporal)}</code></p>
      `;
    }
  } catch (error) {
    body.innerHTML = `<p class="text-danger">${escapeHtml(error.message)}</p>`;
  }
}

function initFormEditarCliente(id) {
  document.getElementById('btnEditarCliente').addEventListener('click', abrirModalEditarCliente);
  document.getElementById('btnAccesoPortal').addEventListener('click', () => abrirAccesoPortal(id));
  manejarVistaPreviaFotoEdicion();

  document.getElementById('formEditarCliente').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fotoInput = document.getElementById('editFoto');
    const fotoFile = fotoInput.files && fotoInput.files[0];
    if (fotoFile) {
      const errorArchivo = validarArchivo(fotoFile);
      if (errorArchivo) return showToast(errorArchivo, 'warning');
    }

    const payload = {
      nombre: document.getElementById('editNombre').value.trim(),
      telefono: document.getElementById('editTelefono').value.trim(),
      cedula: document.getElementById('editCedula').value.trim(),
      fecha: document.getElementById('editFecha').value,
      curso_actual: document.getElementById('editCursoActual').value.trim(),
      precio_total: parseFloat(document.getElementById('editPrecio').value) || 0,
      inscripcion: parseFloat(document.getElementById('editInscripcion').value) || 0,
      descuento: parseFloat(document.getElementById('editDescuento').value) || 0,
      curso_id: document.getElementById('editCursoId').value || null,
      instructor_id: document.getElementById('editInstructorId').value || null,
      email: document.getElementById('editEmail').value.trim() || null,
      sexo: document.getElementById('editSexo').value || null,
      ciudad: document.getElementById('editCiudad').value.trim() || null,
      contacto_emergencia: document.getElementById('editContactoEmergencia').value.trim() || null,
      telefono_emergencia: document.getElementById('editTelefonoEmergencia').value.trim() || null,
      fecha_nacimiento: document.getElementById('editFechaNacimiento').value || null,
      direccion: document.getElementById('editDireccion').value.trim() || null,
      horas_requeridas: parseInt(document.getElementById('editHorasRequeridas').value) || 0,
      horas_completadas: parseInt(document.getElementById('editHorasCompletadas').value) || 0,
      estado_cliente: document.getElementById('editEstadoCliente').value || 'Inscrito',
      sucursal_id: document.getElementById('editSucursalId').value || null
    };

    try {
      const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/api/clientes/${id}`, {
        method: 'PUT', headers, body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Error al actualizar cliente');
      }
      if (fotoFile) await subirFotoClienteExpediente(id, fotoFile);

      const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente'));
      modal.hide();
      showToast('Cliente actualizado con éxito', 'success');
      await loadGeneral(id);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'No se pudo actualizar el cliente.', 'danger');
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  const id = getIdFromQuery();
  if (!id) return alert('ID de cliente requerido');
  document.getElementById('linkExportar').href = `expediente-exportar.html?id=${id}`;
  initFormEditarCliente(id);
  await Promise.all([loadGeneral(id), loadPagos(id), loadAsistencias(id)]);
  createDocumentUploadForm(id);
  await Promise.all([
    loadDocumentos(id),
    loadObservaciones(id),
    loadEvaluaciones(id),
    loadExamenes(id),
    loadCertificados(id)
  ]);

  if (new URLSearchParams(window.location.search).get('edit') === 'true') {
    abrirModalEditarCliente();
  }
});
