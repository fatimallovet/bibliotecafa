function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
}

/* URLs SEPARADAS */
const URL_PELIS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";

const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

/* CARGAR PELÍCULAS */
fetch(URL_PELIS)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    llenarTabla(res.data, "tablaPeliculas", "Película");
  });

/* CARGAR SERIES */
fetch(URL_SERIES)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    llenarTabla(res.data, "tablaSeries", "Serie");
  });

/* LLENAR TABLAS */
function llenarTabla(data, tablaId, tipo) {
  const tbody = document.querySelector(`#${tablaId} tbody`);
  tbody.innerHTML = "";

  data.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item["Título"] || ""}</td>
      <td>${item["Año"] || ""}</td>
      <td>${item["Calificación"] || ""}</td>
      <td>${item["Género"] || ""}</td>
    `;

    row.addEventListener("click", () => mostrarModal({ ...item, Tipo: tipo }));

    tbody.appendChild(row);
  });
}

/* MODAL */
function mostrarModal(d) {
  document.getElementById("modal-titulo").textContent = d["Título"];
  document.getElementById("modal-anio").textContent = d["Año"];
  document.getElementById("modal-calificacion").textContent = d["Calificación"];
  document.getElementById("modal-genero").textContent = d["Género"];
  document.getElementById("modal-tipo").textContent = d["Tipo"];

  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
