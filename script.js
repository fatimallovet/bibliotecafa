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
    const esPelicula = (item["Serie o Película"] || "").toLowerCase().includes("pel");
    const row = document.createElement("tr");

    if (esPelicula) {
      // --- PELÍCULAS ---
      row.innerHTML = `
        <td>${item["Título"] || ""}</td>
        <td>${item["Año"] || ""}</td>
        <td>${item["Calificación"] || ""}</td>
        <td>${item["Género"] || ""}</td>
        <td>${item["Minutos"] || ""}</td>
        <td>${item["Flags"] || ""}</td>
      `;
      tbMovies.appendChild(row);

    } else {
      // --- SERIES ---
      row.innerHTML = `
        <td>${item["Título"] || ""}</td>
        <td>${item["Año"] || ""}</td>
        <td>${item["Calificación"] || ""}</td>
        <td>${item["Género"] || ""}</td>
        <td>${item["Capítulos"] || ""}</td>
        <td>${item["Flags"] || ""}</td>
      `;
      tbSeries.appendChild(row);
    }

    row.addEventListener("click", () => mostrarModal(item));
  });
}

/* MODAL */
function mostrarModal(d) {
  document.getElementById("modal-titulo").textContent = d["Título"] || "";
  document.getElementById("modal-anio").textContent = d["Año"] || "";
  document.getElementById("modal-calificacion").textContent = d["Calificación"] || "";
  document.getElementById("modal-genero").textContent = d["Género"] || "";
  document.getElementById("modal-tipo").textContent = d["Serie o Película"] || "";
  document.getElementById("modal-flags").textContent = d["Flags"] || "";

  // NUEVOS CAMPOS
  document.getElementById("modal-duracion").textContent =
      d["Minutos"] || d["Capítulos"] || "";

  document.getElementById("modal-tono").textContent = d["Tono"] || "";
  document.getElementById("modal-ritmo").textContent = d["Ritmo"] || "";
  document.getElementById("modal-publico").textContent = d["Público"] || "";
  document.getElementById("modal-etiquetas").textContent = d["Etiquetas"] || "";
  document.getElementById("modal-resena").textContent = d["Reseña"] || "";

  // Si viene link IMDB, lo convertimos en enlace bonito
  if (d["IMDB"]) {
    document.getElementById("modal-imdb").innerHTML =
      `<a href="${d["IMDB"]}" target="_blank">Ver en IMDB</a>`;
  } else {
    document.getElementById("modal-imdb").textContent = "";
  }

  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
