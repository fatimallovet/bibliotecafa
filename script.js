const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv';

let libros = [];

// Usar PapaParse para cargar CSV correctamente
Papa.parse(csvUrl, {
  download: true,
  header: true,
  complete: function(results) {
    libros = results.data.filter(l => l['Título']); // quitar filas vacías
    cargarTabla(libros);
    crearBotonesGeneros(libros);
  }
});

function cargarTabla(libros) {
  const tbody = document.querySelector('#tabla-libros tbody');
  tbody.innerHTML = '';
  libros.forEach((libro) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${libro['Título']}</td>
      <td>${libro['Autor']}</td>
      <td>${libro['Género']}</td>
    `;
    tbody.appendChild(tr);
  });
}

function crearBotonesGeneros(libros) {
  const cont = document.getElementById('botones-generos');
  cont.innerHTML = '';
  const generosSet = new Set();
  libros.forEach(l => {
    l['Género'].split(',').forEach(g => generosSet.add(g.trim()));
  });

  generosSet.forEach(genero => {
    const btn = document.createElement('button');
    btn.textContent = genero;
    btn.addEventListener('click', () => filtrarPorGenero(genero));
    cont.appendChild(btn);
  });
}

function filtrarPorGenero(genero) {
  const filtrados = libros.filter(l => l['Género'].includes(genero));
  mostrarFiltrados(filtrados);
}

function mostrarFiltrados(lista) {
  const cont = document.getElementById('resultados-filtrados');
  cont.innerHTML = '';
  lista.forEach(l => {
    const card = document.createElement('div');
    card.className = 'card-libro';
    card.innerHTML = `
      <h3>${l['Título']}</h3>
      <p><strong>Autor:</strong> ${l['Autor']}</p>
      <p><strong>Género:</strong> ${l['Género']}</p>
    `;
    cont.appendChild(card);
  });
}

// Libro al azar
document.getElementById('btn-azar').addEventListener('click', () => {
  if (libros.length > 0) {
    const random = libros[Math.floor(Math.random() * libros.length)];
    document.getElementById('libro-azar').innerHTML = `
      <p><strong>${random['Título']}</strong> — ${random['Autor']}<br>
      <em>${random['Género']}</em></p>
    `;
  }
});
