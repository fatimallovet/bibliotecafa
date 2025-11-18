function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
}

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?output=csv";

fetch(URL)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    console.log("Datos cargados:", res.data);
    render(res.data);
  });

function render(data) {
  const tbMovies = document.querySelector("#tablaPeliculas tbody");
  const tbSeries = document.querySelector("#tablaSeries tbody");

  tbMovies.innerHTML = "";
  tbSeries.innerHTML = "";

  data.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item["Título"] || ""}</td>
      <td>${item["Año"] || ""}</td>
      <td>${item["Calificación"] || ""}</td>
      <td>${item["Género"] || ""}</td>
    `;

    row.addEventListener("click", () => mostrarModal(item));

    if ((item["Serie o Película"] || "").toLowerCase().includes("pel")) {
      tbMovies.appendChild(row);
    } else {
      tbSeries.appendChild(row);
    }
  });
}

/* MODAL */
function mostrarModal(d) {
  document.getElementById("modal-titulo").textContent = d["Título"];
  document.getElementById("modal-anio").textContent = d["Año"];
  document.getElementById("modal-calificacion").textContent = d["Calificación"];
  document.getElementById("modal-genero").textContent = d["Género"];
  document.getElementById("modal-tipo").textContent = d["Serie o Película"];

  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
