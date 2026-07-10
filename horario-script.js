

async function cargarClientes() {

  const select =
  document.getElementById(
    "cliente"
  );

  if(!select) return;

  select.innerHTML =
  '<option value="">Seleccione</option>';

  try{

    const res =
    await fetch(
      "http://localhost:4000/api/clientes"
    );

    const clientes =
    await res.json();

    clientes.forEach(c=>{

      const option =
      document.createElement(
        "option"
      );

      option.value=c.id;
      option.textContent=
      c.nombre;

      select.appendChild(
        option
      );

    });

  }catch(error){

    console.error(
      "Error cargando clientes",
      error
    );

  }

}


async function guardarHorario(e){

  e.preventDefault();

  const cliente =
  document.getElementById(
    "cliente"
  );

  if(!cliente?.value){

    alert(
      "Seleccione cliente"
    );

    return;

  }

  const data={

    cliente_id:
    parseInt(
      cliente.value
    ),

    dia:
    document.getElementById(
      "dia"
    )?.value,

    hora:
    document.getElementById(
      "hora"
    )?.value,

    numero_clase:
    parseInt(

      document.getElementById(
        "numeroClase"
      )?.value

    )||1,

    repetir:

    document.getElementById(
      "repetir"
    )?.value==="true"

  };


  try{

    const res=
    await fetch(

      "http://localhost:4000/api/horarios",

      {

        method:"POST",

        headers:{
          "Content-Type":
          "application/json"
        },

        body:
        JSON.stringify(
          data
        )

      }

    );

    if(res.ok){

      mostrarMensajeExito(
        "Clase agregada"
      );

      e.target.reset();

      const numero=

      document.getElementById(
        "numeroClase"
      );

      if(numero)
      numero.value="";

      cargarHorarios();

    }

    else{

      alert(
        "Error guardando"
      );

    }

  }

  catch(error){

    console.error(
      error
    );

    alert(
      "Error conexión"
    );

  }

}



async function cargarHorarios(){

  const tbody=

  document.getElementById(
    "tablaHorarios"
  );

  if(!tbody) return;

  tbody.innerHTML="";

  try{

    const res=

    await fetch(

      "http://localhost:4000/api/horarios"

    );

    const horarios=

    await res.json();

    horarios.forEach(h=>{

      const fila=

      document.createElement(
        "tr"
      );

      fila.className = "horario-item";

      fila.innerHTML = `
        <td>${h.nombre_cliente || "Sin cliente"}</td>
        <td>${h.dia}</td>
        <td>${h.hora}</td>
        <td>${h.numero_clase || 1}</td>
        <td>${h.repetir ? "Sí" : "No"}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="marcarClaseHecha(${h.id})">Hecho</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarHorario(${h.id})">Eliminar</button>
        </td>
      `;

      "eliminarHorario(

      ${h.id}

      )">

      Eliminar

      </button>

      </td>

      `;

      tbody.appendChild(
        fila
      );

    });

  }

  catch(error){

    console.error(
      error
    );

  }

}



async function eliminarHorario(id){

  if(

    !confirm(

      "Eliminar clase?"

    )

  ) return;

  await fetch(

    `http://localhost:4000/api/horarios/${id}`,

    {

      method:"DELETE"

    }

  );

  cargarHorarios();

}



async function marcarClaseHecha(id){

  try{

    const res=

    await fetch(

      `http://localhost:4000/api/horarios/hecho/${id}`,

      {

        method:"PATCH"

      }

    );

    if(res.ok){

      mostrarMensajeExito(

        "Clase completada"

      );

      cargarHorarios();

    }

  }

  catch(error){

    console.error(
      error
    );

  }

}

function printHorario(){

const tabla=
document.getElementById(
"tablaHorarios"
);

if(!tabla) return;

const w=
window.open(
"",
"",
"width=900,height=700"
);

w.document.write(`
<html>
<head>
<title>Horario</title>
</head>

<body>

<h2>Mi Horario</h2>

${tabla.outerHTML}

</body>

</html>
`);

w.document.close();

w.onload=()=>{

w.print();

};

}



function mostrarMensajeExito(texto){

const mensaje=

document.getElementById(
"mensajeExito"
);

if(!mensaje){

alert(texto);

return;

}

mensaje.textContent=
texto;

mensaje.style.display=
"block";

setTimeout(()=>{

mensaje.style.display=
"none";

},3000);

}



document.addEventListener(

"DOMContentLoaded",

()=>{

cargarClientes();

cargarHorarios();

const form=

document.getElementById(
"formHorario"
);

if(form){

form.addEventListener(
"submit",
guardarHorario
);

}

const cliente=

document.getElementById(
"cliente"
);

if(cliente){

cliente.addEventListener(

"change",

async function(){

const id=this.value;

if(!id){

document.getElementById(
"numeroClase"
).value="";

return;

}

try{

const res=

await fetch(

`http://localhost:4000/api/asistencias/cliente/${id}`

);

const asistencias=

await res.json();

document.getElementById(
"numeroClase"
).value=

asistencias.length+1;

}

catch{

document.getElementById(
"numeroClase"
).value=1;

}

}

);

}

}

);

