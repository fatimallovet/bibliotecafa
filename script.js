const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv';

let libros = [];

fetch(csvUrl)
  .then(res => res.text())
  .then(csv => {
    const rows = csv.split('\n').map(r => r.split(','));
    const headers = rows[0];
    const data = rows.slice(1); // sin encabezados
    libros = data.map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    cargarTabla(libros);
    crearBotonesGeneros(libros);
  });

function cargarTabla(libros) {
  const tbody = document.querySelector('#tabla-libros tbody');
  tbody.innerHTML = '';
  libros.forEach((libro, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${libro['Título']}</td>
      <td>${libro['Autor']}</td>
      <td>${libro['Género']}</td>
    `;
    tr.addEventListener('click', () => {
      window.location.href = `detalle.html?index=${index}`;
    });
    tbody.appendChild(tr);
  });
}

function crearBotonesGeneros(libros) {
  const cont = document.getElementById('botones-generos');
  cont.innerHTML = '';
  // Saca todos los géneros (aunque estén separados por comas)
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
      <p><em>Más info disponible en detalle.</em></p>
    `;
    cont.appendChild(card);
  });
}
