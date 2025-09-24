// Cambia con el ID de tu Google Sheet
const SHEET_ID = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv"; 
const SHEET_NAME = "Hoja1"; // cambia si tu pestaña tiene otro nombre
const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

let libros = [];
let generosSeleccionados = [];

async function cargarDatos() {
  const res = await fetch(URL);
  const text = await res.text();
  const data = JSON.parse(text.substr(47).slice(0, -2));

  const rows = data.table.rows.map(r => r.c.map(c => c?.v || ""));
  
  // Suponiendo columnas: Título | Autor | Género | Tono | Otras
  libros = rows.map(r => ({
    titulo: r[0],
    autor: r[1],
    genero: r[2],
    tono: r[3],
    otras: r.slice(4)
  }));

  crearBotonesGeneros();
  mostrarLibros(libros);
}

function crearBotonesGeneros() {
  const cont = document.getElementById("botones-genero");
  const generos = [...new Set(libros.map(l => l.genero))];

  generos.forEach(g => {
    const btn = document.createElement("button");
    btn.className = "genero-btn";
    btn.textContent = g;
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      if (generosSeleccionados.includes(g)) {
        generosSeleccionados = generosSeleccionados.filter(x => x !== g);
      } else {
        generosSeleccionados.push(g);
      }
      filtrarLibros();
    });
    cont.appendChild(btn);
  });
}

function filtrarLibros() {
  if (generosSeleccionados.length === 0) {
    mostrarLibros(libros);
  } else {
    const filtrados = libros.filter(l => generosSeleccionados.includes(l.genero));
    mostrarLibros(filtrados);
  }
}

function mostrarLibros(listaLibros) {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";
  listaLibros.forEach(libro => {
    const div = document.createElement("div");
    div.className = "libro";
    div.innerHTML = `<strong>${libro.titulo}</strong><br>
                     Autor: ${libro.autor}<br>
                     Género: ${libro.genero}<br>
                     Tono: ${libro.tono}<br>
                     ${libro.otras.map((o,i) => `<span>Campo ${i+5}: ${o}</span><br>`).join('')}`;
    lista.appendChild(div);
  });
}

cargarDatos();
