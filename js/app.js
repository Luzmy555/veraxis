document.getElementById("formAgregarCliente").addEventListener("submit", function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const telefono = document.getElementById("telefono").value;

  const fecha = new Date().toLocaleDateString('es-DO');

  // Mostrar en tabla por ahora (luego lo enviaremos al backend)
  const tabla = document.getElementById("tablaClientes");
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${nombre}</td>
    <td>${telefono}</td>
    <td>${fecha}</td>
    <td><button class="btn btn-sm btn-danger">Eliminar</button></td>
  `;
  tabla.appendChild(fila);

  this.reset();
  const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregarCliente'));
  modal.hide();
});
