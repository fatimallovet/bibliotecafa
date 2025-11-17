// script.js

function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

// URL de tu Google Sheets (CSV publicado)
const SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?output=csv";

// Usamos PapaParse para parsear
Papa.parse(SHEETS_URL, {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function(results) {
    const data = results.data;
    console.log("Datos parseados:", data);
    renderData(data);
  },
  error: function(err) {
    console.error("Error al parsear CSV:", err);
  }
});

function renderData(data) {
  const moviesContainer = document.querySelector('#peliculas .cards');
  const seriesContainer = document.querySelector('#series .cards');

  // Limpia contenedores
  moviesContainer.innerHTML = "";
  seriesContainer.innerHTML = "";

  // Itera cada fila de tu sheet
  data.forEach(item => {
    const card = document.createElement('div');
    card.classList.add('card');

    // Usa tus encabezados: aquí asumo que la hoja tiene columnas "Título", "Género", "Serie o Película"
    const titulo = item["Título"] || item["Titulo"] || item["Title"] || "Sin título";
    const genero = item["Género"] || item["Genero"] || "";
    const tipo = item["Serie o Película"] || item["Tipo"] || "";

    card.innerHTML = `
      <strong>${escapeHtml(titulo)}</strong><br>
      <em>${escapeHtml(genero)}</em><br>
      <small>${escapeHtml(tipo)}</small>
    `;

    // Dependiendo del tipo, lo metemos en Películas o Series
    if (tipo.toLowerCase().includes("pelicula")) {
      moviesContainer.appendChild(card);
    } else if (tipo.toLowerCase().includes("serie")) {
      seriesContainer.appendChild(card);
    } else {
      // Si no está claro el tipo, lo puedes meter en películas por defecto o ignorar
      moviesContainer.appendChild(card);
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/\'/g, "&#39;");
}
