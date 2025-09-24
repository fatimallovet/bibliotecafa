// ID/URL de tu Google Sheet (CSV publicado)
var SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv";

var libros = [];
var generosSeleccionados = [];

// Función para cargar CSV
function cargarCSV(url) {
  fetch(url)
    .then(function(res) { return res.text(); })
    .then(function(text) {
      var filas = text.split("\n");
      var cabecera = filas.shift().split(","); // primera fila = títulos columnas
      libros = filas.map(function(fila) {
        var columnas = fila.split(",");
        var obj = {};
        cabecera.forEach(function(c, i) {
          obj[c.trim()] = columnas[i] ? columnas[i].trim() : "";
        });
        return obj;
      });

      crearBotonesGeneros();
      mostrarLibros(libros);
    })
    .catch(function(err) {
      console.error("Error al cargar CSV:", err);
    });
}

function crearBotonesGeneros() {
  var cont = document.getElementById("botones-genero");
  cont.innerHTML = "";
  var generos = [];
  libros.forEach(function(l) {
    if (l.genero && generos.indexOf(l.genero) === -1) {
      generos.push(l.genero);
    }
  });

  generos.forEach(function(g) {
    var btn = document.createElement("button");
    btn.className = "genero-btn";
    btn.textContent = g;
    btn.addEventListener("click", function() {
      btn.classList.toggle("active");
      if (generosSeleccionados.indexOf(g) !== -1) {
        generosSeleccionados = generosSeleccionados.filter(function(x){ return x !== g; });
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
    var filtrados = libros.filter(function(l){
      return generosSeleccionados.indexOf(l.genero) !== -1;
    });
    mostrarLibros(filtrados);
  }
}

function mostrarLibros(listaLibros) {
  var lista = document.getElementById("lista");
  lista.innerHTML = "";
  listaLibros.forEach(function(libro){
    var div = document.createElement("div");
    div.className = "libro";
    var info = "<strong>" + libro.titulo + "</strong><br>" +
               "Autor: " + libro.autor + "<br>" +
               "Género: " + libro.genero + "<br>" +
               "Tono: " + libro.tono + "<br>";
    // mostrar columnas extras si existen
    for (var key in libro) {
      if (["titulo","autor","genero","tono"].indexOf(key) === -1) {
        info += key + ": " + libro[key] + "<br>";
      }
    }
    div.innerHTML = info;
    lista.appendChild(div);
  });
}

// Cargar la hoja al iniciar
window.onload = function(){
  cargarCSV(SHEET_URL);
};
