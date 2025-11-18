function openTab(tabId, event) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  document.getElementById(tabId).classList.add('visible');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

const URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?output=csv";

fetch(URL)
  .then(r => r.text())
  .then(txt => {
    const res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    render(res.data);
  });

function render(data) {
  const tbMovies = document.querySelector("#tablaPeliculas tbody");
  const tbSeries = document.querySelector("#tablaSeries tbody");

  tbMovies.innerHTML = "";
  tbSeries.innerHTML = "";

  data.forEach(item => {
    if (!item["Título"]) return;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item["Título"]}</td>
      <td>${item["Año"]}</td>
      <td>${item["Calificación"]}</td>
      <td>${item["Género"]}</td>
    `;

    row.addEventListener("click", () => abrirModal(item));

    if ((item["Serie o Película"] || "").toLowerCase().includes("pel")) {
      tbMovies.appendChild(row);
    } else {
      tbSeries.appendChild(row);
    }
  });
}

/* MODAL */
function abrirModal(d) {
  document.getElementById("m-titulo").textContent = d["Título"];
  document.getElementById("m-anio").textContent = d["Año"];
  document.getElementById("m-calif").textContent = d["Calificación"];
  document.getElementById("m-genero").textContent = d["Género"];
  document.getElementById("m-tono").textContent = d["Tono"];
  document.getElementById("m-ritmo").textContent = d["Ritmo"];
  document.getElementById("m-publico").textContent = d["Público"];
  document.getElementById("m-etiquetas").textContent = d["Etiquetas"];
  document.getElementById("m-flags").textContent = d["Flags"];
  document.getElementById("m-resena").textContent = d["Reseña"];

  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
