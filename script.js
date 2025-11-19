/* URLs de las hojas separadas */
const URL_PELIS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";
const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

/* Cargar ambas hojas en paralelo */
Promise.all([
  fetch(URL_PELIS).then(r => {
    if (!r.ok) throw new Error("Error al cargar Películas CSV");
    return r.text();
  }),
  fetch(URL_SERIES).then(r => {
    if (!r.ok) throw new Error("Error al cargar Series CSV");
    return r.text();
  })
])
.then(([csvPelis, csvSeries]) => {
  const pelis = Papa.parse(csvPelis, { header: true, skipEmptyLines: true }).data;
  const series = Papa.parse(csvSeries, { header: true, skipEmptyLines: true }).data;

  console.log("Películas cargadas:", pelis);
  console.log("Series cargadas:", series);

  renderPelis(pelis);
  renderSeries(series);
})
.catch(error => {
  console.error("Hubo un error al cargar los datos:", error);
});

/* Función para renderizar Películas */
function renderPelis(data) {
  const tb = document.querySelector("#tablaPeliculas tbody");
  tb.innerHTML = "";

  data.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item["Título"] || ""}</td>
      <td>${item["Año"] || ""}</td>
      <td>${item["Calificación"] || ""}</td>
      <td>${item["Género"] || ""}</td>
    `;

    row.addEventListener("click", () => mostrarModal(item, "Película"));
    tb.appendChild(row);
  });
}

/* Función para renderizar Series */
function renderSeries(data) {
  const tb = document.querySelector("#tablaSeries tbody");
  tb.innerHTML = "";

  data.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item["Título"] || ""}</td>
      <td>${item["Año"] || ""}</td>
      <td>${item["Calificación"] || ""}</td>
      <td>${item["Género"] || ""}</td>
    `;

    row.addEventListener("click", () => mostrarModal(item, "Serie"));
    tb.appendChild(row);
  });
}

/* Función para mostrar el modal */
function mostrarModal(d, tipo) {
  document.getElementById("modal-titulo").textContent = d["Título"];
  document.getElementById("modal-anio").textContent = d["Año"];
  document.getElementById("modal-calificacion").textContent = d["Calificación"];
  document.getElementById("modal-genero").textContent = d["Género"];
  document.getElementById("modal-tipo").textContent = tipo;

  document.getElementById("modal").style.display = "flex";
}

/* Función para cerrar el modal */
function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}


/* NAVEGAR ENTRE TABS */
function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
}
