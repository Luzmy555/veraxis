async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
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
  const foto = cliente.foto ? `/uploads/clientes/${cliente.id}/${cliente.foto}` : 'assets/avatar-placeholder.png';
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

async function loadGeneral(id) {
  const cliente = await fetchJson(`http://localhost:4000/api/clientes/${id}`);
  
  let instructorNombre = cliente.instructor_nombre || '—';
  if (!cliente.instructor_nombre && cliente.instructor_id) {
    try {
      const instructor = await fetchJson(`http://localhost:4000/api/instructores/${cliente.instructor_id}`);
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
  const fotoUrl = cliente.foto ? `http://localhost:4000/uploads/clientes/${id}/${cliente.foto}` : 'assets/avatar-placeholder.png';

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
              <img src="${fotoUrl}" alt="Foto cliente" class="img-fluid rounded" style="width:120px; height:120px; object-fit:cover;" />
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-person me-1"></i>Nombre Completo</h6>
              <p class="mb-0"><strong>${cliente.nombre || '—'}</strong></p>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-card-text me-1"></i>Cédula</h6>
                <p class="mb-0"><strong>${cliente.cedula || '—'}</strong></p>
              </div>
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-venus-mars me-1"></i>Sexo</h6>
                <p class="mb-0"><strong>${cliente.sexo === 'M' ? 'Masculino' : cliente.sexo === 'F' ? 'Femenino' : cliente.sexo || '—'}</strong></p>
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
              <p class="mb-0"><strong>${cliente.telefono || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-envelope me-1"></i>Correo Electrónico</h6>
              <p class="mb-0"><strong>${cliente.email || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-geo-alt me-1"></i>Dirección</h6>
              <p class="mb-0"><strong>${cliente.direccion || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-building me-1"></i>Ciudad</h6>
              <p class="mb-0"><strong>${cliente.ciudad || '—'}</strong></p>
            </div>

            <hr />

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Contacto de Emergencia</h6>
              <p class="mb-0"><strong>${cliente.contacto_emergencia || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-telephone me-1"></i>Teléfono Emergencia</h6>
              <p class="mb-0"><strong>${cliente.telefono_emergencia || '—'}</strong></p>
            </div>

            <hr />

            <div>
              <h6 class="text-muted small mb-1"><i class="bi bi-info-circle me-1"></i>Estado del Cliente</h6>
              <p class="mb-0">
                <span class="badge ${getEstadoBadgeClass(cliente.estado_cliente || cliente.estado || 'Inscrito')}">
                  ${cliente.estado_cliente || cliente.estado || 'Inscrito'}
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
              <p class="mb-0"><strong>${cliente.curso_actual || '—'}</strong></p>
            </div>

            <div class="mb-3">
              <h6 class="text-muted small mb-1"><i class="bi bi-person-badge me-1"></i>Instructor Asignado</h6>
              <p class="mb-0"><strong>${instructorNombre}</strong></p>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-calendar-check me-1"></i>Fecha de Inscripción</h6>
                <p class="mb-0"><strong>${cliente.fecha ? new Date(cliente.fecha).toLocaleDateString('es-DO') : '—'}</strong></p>
              </div>
              <div class="col-6">
                <h6 class="text-muted small mb-1"><i class="bi bi-activity me-1"></i>Estado del Curso</h6>
                <p class="mb-0"><span class="badge ${getEstadoBadgeClass(cliente.estado_cliente || cliente.estado || 'Inscrito')}">${cliente.estado_cliente || cliente.estado || 'Inscrito'}</span></p>
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
  const pagos = await fetchJson(`http://localhost:4000/api/pagos/cliente/${id}`);
  const container = document.getElementById('pagosContent');
  if (!Array.isArray(pagos) || pagos.length === 0) return container.innerHTML = '<p>No hay pagos registrados.</p>';
  let total = 0;
  container.innerHTML = `<div class="list-group"></div>`;
  const list = container.querySelector('.list-group');
  pagos.forEach(p => {
    total += parseFloat(p.monto || 0);
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex justify-content-between align-items-start';
    item.innerHTML = `<div><strong>${p.tipo || 'Pago'}</strong><div class="small text-muted">${new Date(p.fecha).toLocaleString()}</div></div><div>${(p.monto||0).toLocaleString('en-US',{style:'currency',currency:'USD'})}</div>`;
    list.appendChild(item);
  });
  const saldo = (await fetchJson(`http://localhost:4000/api/clientes/${id}`)).saldo_pendiente || 0;
  container.innerHTML += `<div class="mt-3"><strong>Total pagado:</strong> ${(total).toLocaleString('en-US',{style:'currency',currency:'USD'})} <br/><strong>Saldo pendiente:</strong> ${(saldo).toLocaleString('en-US',{style:'currency',currency:'USD'})}</div>`;
}

async function loadAsistencias(id) {
  const asistencias = await fetchJson(`http://localhost:4000/api/asistencias/cliente/${id}`);
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
    el.innerHTML = `${new Date(a.fecha).toLocaleString()} - ${a.estado || (a.asistio ? 'Presente' : 'Ausente')}`;
    list.appendChild(el);
  });
  container.appendChild(list);
}

function showPreview(url, name) {
  const body = document.getElementById('previewBody');
  body.innerHTML = `<img src="${url}" class="img-fluid" alt="${name}"/>`;
  document.getElementById('previewTitle').textContent = decodeURIComponent(String(name).replace(/\+/g,' '));
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
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(toast);
  const bToast = new bootstrap.Toast(toast, { delay: 4000 });
  bToast.show();
}

async function loadDocumentos(id) {
  const docs = await fetchJson(`http://localhost:4000/api/clientes/${id}/documentos`);
  const container = document.getElementById('documentosContent');
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'list-group';
  docs.forEach(d => {
    const el = document.createElement('div');
    el.className = 'list-group-item d-flex justify-content-between align-items-center';
    const isImage = (d.mime || '').startsWith('image/');
    const thumb = isImage ? `<img src="http://localhost:4000/api/clientes/${id}/documentos/${d.id}" class="doc-thumb me-2"/>` : `<i class="bi bi-file-earmark-fill fs-3 me-2"></i>`;
    el.innerHTML = `<div class="d-flex align-items-center"><div>${thumb}</div><div><strong>${d.tipo}</strong><div class="small text-muted">${d.original_name}</div></div></div>
      <div>
        ${isImage ? `<button class="btn btn-sm btn-outline-primary me-2" onclick="showPreview('${encodeURI(`http://localhost:4000/api/clientes/${id}/documentos/${d.id}`)}','${escape(d.original_name||d.filename)}')">Ver</button>` : `<a class="btn btn-sm btn-outline-primary me-2" href="http://localhost:4000/api/clientes/${id}/documentos/${d.id}" target="_blank">Abrir</a>`}
        <a class="btn btn-sm btn-outline-success me-2" href="http://localhost:4000/api/clientes/${id}/documentos/${d.id}/download">Descargar</a>
        ${typeof isAdmin === 'function' && isAdmin() ? `<button class="btn btn-sm btn-danger" onclick="eliminarDoc(${id}, ${d.id})">Eliminar</button>` : ''}
      </div>`;
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
    const fd = new FormData();
    fd.append('file', file.files[0]);
    fd.append('tipo', select.value);
    const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
    if (headers['Content-Type']) delete headers['Content-Type'];

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `http://localhost:4000/api/clientes/${id}/documentos`);
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
  await fetch(`http://localhost:4000/api/clientes/${clienteId}/documentos/${docId}`, { method: 'DELETE' });
  loadDocumentos(clienteId);
}

async function loadObservaciones(id) {
  const obs = await fetchJson(`http://localhost:4000/api/clientes/${id}/observaciones`);
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
    await fetch(`http://localhost:4000/api/clientes/${id}/observaciones`, {
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
    el.innerHTML = `<div><strong>${o.usuario_nombre || 'Usuario'}</strong> <small class="text-muted">${o.usuario_rol || ''} · ${new Date(o.created_at).toLocaleString()}</small><div class="mt-2">${o.comentario}</div></div>
      <div>${typeof isAdmin === 'function' && isAdmin() ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarObs(${id}, ${o.id})">Eliminar</button>` : ''}</div>`;
    list.appendChild(el);
  });
  container.appendChild(list);
}

async function eliminarObs(clienteId, obsId) {
  if (!confirm('Eliminar observación?')) return;
  await fetch(`http://localhost:4000/api/clientes/${clienteId}/observaciones/${obsId}`, { method: 'DELETE' });
  loadObservaciones(clienteId);
}

window.addEventListener('DOMContentLoaded', async () => {
  const id = getIdFromQuery();
  if (!id) return alert('ID de cliente requerido');
  await Promise.all([loadGeneral(id), loadPagos(id), loadAsistencias(id)]);
  createDocumentUploadForm(id);
  await Promise.all([loadDocumentos(id), loadObservaciones(id)]);
});
