const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv";
let libros = [];

Papa.parse(sheetUrl, {
  download: true,
  header: true,
  complete: function(results) {
    libros = results.data.filter(row => row.Título && row.Autor && row.Género);
    mostrarTabla(libros);
    llenarSelectGeneros(libros);
  }
});

function mostrarTabla(data) {
  const tbody = document.querySelector("#tablaLibros tbody");
  tbody.innerHTML = "";
  data.forEach(libro => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${libro.Título}</td><td>${libro.Autor}</td><td>${libro.Género}</td>`;
    tbody.appendChild(tr);
  });
}

function llenarSelectGeneros(data) {
  const select = document.getElementById("generoSelect");
  const generos = [...new Set(data.map(l => l.Género))].sort();
  generos.forEach(g => {
    const option = document.createElement("option");
    option.value = g;
    option.textContent = g;
    select.appendChild(option);
  });
}

document.getElementById("generoSelect").addEventListener("change", e => {
  const genero = e.target.value;
  const filtrados = genero ? libros.filter(l => l.Género === genero) : libros;
  mostrarTarjetas(filtrados);
});

function mostrarTarjetas(data) {
  const contenedor = document.getElementById("tarjetasLibros");
  contenedor.innerHTML = "";
  data.forEach(libro => {
    const div = document.createElement("div");
    div.className = "col-md-4";
    div.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${libro.Título}</h5>
          <p class="card-text"><strong>Autor:</strong> ${libro.Autor}</p>
          <p class="card-text"><strong>Género:</strong> ${libro.Género}</p>
        </div>
      </div>`;
    contenedor.appendChild(div);
  });
}

document.getElementById("btnRandom").addEventListener("click", () => {
  const random = libros[Math.floor(Math.random() * libros.length)];
  document.getElementById("randomLibro").innerHTML = 
    `<strong>${random.Título}</strong> — ${random.Autor} (${random.Género})`;
});
