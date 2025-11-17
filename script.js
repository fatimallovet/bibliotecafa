/* ------------------------------------------------------------ */
/* --------------------- JS FILE (script.js) ------------------- */


function openTab(tabId, event) {
document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
document.getElementById(tabId).classList.add('visible');
document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
event.target.classList.add('active');
}


// ---------------------------
// Cargar BD desde Google Sheets
// ---------------------------
const SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?output=csv";


fetch(SHEETS_URL)
.then(res => res.text())
.then(csv => parseCSV(csv));


function parseCSV(csv) {
const lines = csv.split("
").map(l => l.trim()).filter(l => l.length);
const headers = lines[0].split(",");


const data = lines.slice(1).map(row => {
const values = row.split(",");
let obj = {};
headers.forEach((h, i) => {
obj[h.trim()] = values[i] ? values[i].trim() : "";
});
return obj;
});


renderData(data);
}


function renderData(data) {
const moviesContainer = document.querySelector('#peliculas .cards');
const seriesContainer = document.querySelector('#series .cards');


moviesContainer.innerHTML = "";
seriesContainer.innerHTML = "";


data.forEach(item => {
const card = document.createElement('div');
card.classList.add('card');
card.innerHTML = `<strong>${item.Titulo}</strong><br>${item.Genero || ''}<br>${item.Tipo}`;


if (item.Tipo.toLowerCase() === 'pelicula') moviesContainer.appendChild(card);
if (item.Tipo.toLowerCase() === 'serie') seriesContainer.appendChild(card);
});
}