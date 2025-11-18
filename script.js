function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

const SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?output=csv";

// 1) Usamos FETCH normal (sí funciona en GitHub Pages)
fetch(SHEETS_URL)
  .then(response => response.text())
  .then(csvText => {
    // 2) Parseamos el CSV usando Papa.parse desde texto
    const results = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    console.log("CARGADO DESDE SHEETS:", results.data);
    renderData(results.data);
  })
  .catch(err => console.error("ERROR fetching CSV:", err));

function renderData(data) {
  const moviesContainer = document.querySelector('#peliculas .cards');
  const seriesContainer = document.querySelector('#series .cards');

  moviesContainer.innerHTML = "";
  seriesContainer.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('card');

    const titulo = item["Título"] || item["Title"] || item["Titulo"] || "";
    const genero = item["Género"] || item["Genero"] || "";
    const tipo = item["Serie o Película"] || item["Tipo"] || "";

    card.innerHTML = `
      <strong>${titulo}</strong><br>
      <em>${genero}</em><br>
      <small>${tipo}</small>
    `;

    if (tipo.toLowerCase().includes("pel")) {
      moviesContainer.appendChild(card);
    } else if (tipo.toLowerCase().includes("ser")) {
      seriesContainer.appendChild(card);
    }
  });
}
