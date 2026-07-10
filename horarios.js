// horarios.js (FRONTEND)

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formHorario");
  const tabla = document.getElementById("tablaHorarios");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clienteSelect = document.getElementById("cliente");
    const cliente_id = clienteSelect.value;
    const nombre_cliente = clienteSelect.options[clienteSelect.selectedIndex].text;
    const dia = document.getElementById("dia").value;
    const hora = document.getElementById("hora").value;
    const repetir = document.getElementById("repetir").checked;
    const numero_clase = parseInt(document.getElementById("numeroClase").value);

    if (!cliente_id || !dia || !hora) {
      alert("Completa todos los campos");
      return;
    }

    const data = { cliente_id, nombre_cliente, dia, hora, numero_clase, repetir };

    try {
      const res = await fetch("http://localhost:4000/api/horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Clase agregada correctamente");
        cargarHorarios();
        form.reset();
      } else {
        alert("Error al guardar: " + result.error);
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
      console.error(error);
    }
  });

  cargarClientes();
  cargarHorarios();
});

// Cargar clientes en el select
async function cargarClientes() {
  const select = document.getElementById("cliente");
  try {
    const res = await fetch("http://localhost:4000/api/clientes");
    const clientes = await res.json();

    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    clientes.forEach((c) => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = c.nombre;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar clientes:", error);
  }
}

// Cargar horarios en la tabla
async function cargarHorarios() {
  const tabla = document.getElementById("tablaHorarios");
  tabla.innerHTML = "";

  try {
    const res = await fetch("http://localhost:4000/api/horarios");
    const horarios = await res.json();

    horarios.forEach((h) => {
      const fila = document.createElement("tr");
      fila.classList.add("horario-item");
      fila.innerHTML = `
        <td>${h.nombre_cliente}</td>
        <td>${h.dia}</td>
        <td>${h.hora}</td>
        <td>${h.repetir ? "Sí" : "No"}</td>
        <td>${h.numero_clase}</td>
        <td><button class="btn btn-danger btn-sm" onclick="eliminarHorario(${h.id})">Eliminar</button></td>
      `;
      tabla.appendChild(fila);
    });
  } catch (error) {
    console.error("Error al cargar horarios:", error);
  }
}

// Eliminar horario
async function eliminarHorario(id) {
  if (confirm("¿Seguro que deseas eliminar esta clase?")) {
    try {
      const res = await fetch(`http://localhost:4000/api/horarios/${id}`, { method: "DELETE" });
      if (res.ok) {
        cargarHorarios();
      } else {
        alert("Error al eliminar la clase");
      }
    } catch (error) {
      alert("Error de conexión al eliminar");
      console.error(error);
    }
  }
}