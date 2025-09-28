const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv';
}


function renderTabla(list){
const tbody = document.querySelector('#tabla-libros tbody');
tbody.innerHTML = '';
list.forEach((libro, idx) =>{
const tr = document.createElement('tr');
const tdTitulo = document.createElement('td'); tdTitulo.textContent = libro['Título'] || '';
const tdAutor = document.createElement('td'); tdAutor.textContent = libro['Autor'] || '';
const tdGenero = document.createElement('td'); tdGenero.textContent = libro['Género'] || '';
tr.appendChild(tdTitulo); tr.appendChild(tdAutor); tr.appendChild(tdGenero);
tr.addEventListener('click', ()=> showDetalle(libro));
tbody.appendChild(tr);
});
}


function renderGeneros(){
const cont = document.getElementById('generos');
cont.innerHTML = '';
Array.from(generosSet).sort().forEach(g =>{
const btn = document.createElement('button');
btn.className = 'chip'; btn.textContent = g;
btn.addEventListener('click', ()=> toggleGenero(btn, g));
cont.appendChild(btn);
});
}


function toggleGenero(button, genero){
if(generosActivos.has(genero)){
generosActivos.delete(genero);
button.classList.remove('active');
} else {
generosActivos.add(genero);
button.classList.add('active');
}
aplicarFiltro();
}


function aplicarFiltro(){
const cardsCont = document.getElementById('cards');
cardsCont.innerHTML = '';
let lista = libros.slice();
if(generosActivos.size){
lista = lista.filter(l => {
const g = (l['Género']||'').toLowerCase();
// Un libro coincide si contiene cualquiera de los géneros activos
for(const ga of generosActivos){
if(g.includes(ga.toLowerCase())) return true;
}
return false;
});
}
lista.forEach(l => cardsCont.appendChild(crearCard(l)));
}


function crearCard(libro){
const card = document.createElement('article');
card.className = 'card';
const h = document.createElement('h3'); h.textContent = libro['Título'] || '—';
const a = document.createElement('p'); a.innerHTML = `<strong>Autor:</strong> ${libro['Autor'] || '—'}`;
const g = document.createElement('p'); g.innerHTML = `<strong>Género:</strong> ${libro['Género'] || '—'}`;
const more = document.createElement('p'); more.className='small'; more.textContent = 'Haz clic para ver detalles';
card.appendChild(h); card.appendChild(a); card.appendChild(g); card.appendChild(more);
card.addEventListener('click', ()=> showDetalle(libro));
return card;
}


function showDetalle(libro){
const modal = document.getElementById('modal');