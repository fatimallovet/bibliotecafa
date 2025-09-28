// script.js — versión robusta
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_lN4MQGP2PigjKJFOV8ZK92MvfpQWj8aH7qqntBJHOKv6XsvLAxriHmjU3WcD7kafNvNbj3pTFqND/pub?gid=0&single=true&output=csv';

let headers = [];
let libros = [];
let generosSet = new Set();
let generosActivos = new Set();

// Normaliza cabeceras: quita acentos, espacios y signos y pasa a minúsculas
function normalize(s){
  if(!s) return '';
  return s.toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'') // quitar diacríticos
    .replace(/[^a-z0-9]/g,''); // quitar todo menos letras y números
}

// Candidatos comunes para detectar columnas
const tituloCands = ['titulo','title','titulodelibro','nombre','nombrelibro','booktitle'];
const autorCands = ['autor','author','escritor','writer'];
const generoCands = ['genero','genero','genero','genre','categorias','categoria','tags'];

// Mensaje en pantalla
const msgEl = document.getElementById('msg');

function showMsg(txt, isError=false){
  msgEl.textContent = txt;
  msgEl.style.color = isError ? '#ffd2d2' : '#ffd9b2';
}

// Cargar CSV con PapaParse
function init(){
  showMsg('Cargando base de datos...');
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results){
      if(results.errors && results.errors.length){
        console.warn('PapaParse errores sample:', results.errors.slice(0,5));
      }
      // Si no hay datos, mostrar aviso
      if(!results.data || results.data.length === 0){
        showMsg('No se cargó información desde la hoja. ¿La hoja está publicada como CSV público?', true);
        console.error('PapaParse: datos vacíos', results);
        return;
      }

      // Headers (meta.fields) o sacamos keys del primer objeto
      headers = results.meta && results.meta.fields ? results.meta.fields.slice() : Object.keys(results.data[0] || {});
      console.log('Cabeceras detectadas:', headers);

      // Mapeo normalizado => nombre real
      const normMap = {};
      headers.forEach(h => normMap[normalize(h)] = h);

      function findKey(cands){
        for(const c of cands){
          if(normMap[c]) return normMap[c];
        }
        return null;
      }

      const keyTitulo = findKey(tituloCands);
      const keyAutor = findKey(autorCands);
      const keyGenero = findKey(generoCands);

      if(!keyTitulo || !keyAutor || !keyGenero){
        showMsg('No se detectaron columnas obligatorias (Título, Autor, Género). Columnas encontradas: ' + headers.join(', '), true);
        console.error('Mapeo falló. keys:', {keyTitulo, keyAutor, keyGenero, headers});
        // pero aún así intentamos usar lo que haya
      } else {
        showMsg('Datos cargados correctamente.');
      }

      // Construir array de libros usando los encabezados detectados (si no se detectó alguno, intentar usar nombres aproximados)
      libros = results.data.map((row, i) => {
        // row es un objeto con claves tal cual la hoja
        return row;
      }).filter(r => {
        // filtramos filas vacías: título o autor presente
        const t = (keyTitulo ? (rVal(r, keyTitulo)) : (rVal(r, headers[0])));
        return t && t.toString().trim() !== '';
      });

      // Si aún libros vacíos -> intentar limpiar rows que no sean completamente vacías
      if(libros.length === 0 && results.data.length > 0){
        libros = results.data.filter(r => Object.values(r).some(v => v && v.toString().trim() !== ''));
      }

      // Guardar nombres de columnas útiles (si existen)
      window.__colKeys = { keyTitulo, keyAutor, keyGenero, headers }; // para debug en consola
      buildGeneros(keyGenero);
      renderTabla(keyTitulo, keyAutor, keyGenero);
      renderGeneros();
      // inicial render cards vacías
      document.getElementById('cards').innerHTML = '';
      console.log('Libros cargados (muestra 5):', libros.slice(0,5));
    },
    error: function(err){ 
      showMsg('Error cargando CSV: ' + (err && err.message ? err.message : err), true);
      console.error('PapaParse error', err);
    }
  });
}

function rVal(obj, key){
  if(!obj || !key) return '';
  return obj[key] ?? obj[normalize(key)] ?? '';
}

function renderTabla(keyTitulo, keyAutor, keyGenero){
  const tbody = document.querySelector('#tabla-libros tbody');
  tbody.innerHTML = '';
  libros.forEach((libro, idx) => {
    const tr = document.createElement('tr');
    const titulo = safe(libro, keyTitulo) || safe(libro, headers[0]) || '—';
    const autor  = safe(libro, keyAutor)  || safe(libro, headers[1]) || '—';
    const genero = safe(libro, keyGenero) || safe(libro, headers.find(h=>/genero|genre|categoria|tags/i.test(h))) || '';

    tr.innerHTML = `<td>${escapeHtml(titulo)}</td><td>${escapeHtml(autor)}</td><td>${escapeHtml(genero)}</td>`;
    tr.addEventListener('click', ()=> showDetalle(libro));
    tbody.appendChild(tr);
  });
}

function safe(obj, key){ return (obj && key) ? (obj[key] ?? '') : ''; }

function buildGeneros(keyGenero){
  generosSet = new Set();
  libros.forEach(l => {
    const raw = safe(l, keyGenero) || '';
    raw.split(',').map(s=>s.trim()).filter(s=>s).forEach(g => generosSet.add(g));
  });
}

function renderGeneros(){
  const cont = document.getElementById('generos');
  cont.innerHTML = '';
  Array.from(generosSet).sort().forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = g;
    btn.addEventListener('click', ()=> toggleGenero(btn,g));
    cont.appendChild(btn);
  });
}

function toggleGenero(btn, genero){
  if(generosActivos.has(genero)){
    generosActivos.delete(genero);
    btn.classList.remove('active');
  } else {
    generosActivos.add(genero);
    btn.classList.add('active');
  }
  aplicarFiltro();
}

function aplicarFiltro(){
  const cardsCont = document.getElementById('cards');
  cardsCont.innerHTML = '';
  let lista = libros.slice();

  if(generosActivos.size){
    lista = lista.filter(l => {
      // casar por cualquiera de los géneros activos
      const raw = Object.values(l).join(' ').toLowerCase(); // fallback: revisar todo si no hay campo claro
      for(const ga of generosActivos){
        if(raw.includes(ga.toLowerCase())) return true;
      }
      return false;
    });
  }

  if(lista.length === 0){
    cardsCont.innerHTML = '<p class="muted">No hay resultados para ese/estos géneros.</p>';
    return;
  }

  lista.forEach(libro => {
    const titulo = firstValue(libro, ['Título','Titulo','title']) || '—';
    const author = firstValue(libro, ['Autor','Author','autor']) || '—';
    const genero = firstValue(libro, ['Género','Genero','genre']) || '';
    const card = document.createElement('article'); card.className = 'card';
    card.innerHTML = `<h3>${escapeHtml(titulo)}</h3>
                      <p><strong>Autor:</strong> ${escapeHtml(author)}</p>
                      <p><strong>Género:</strong> ${escapeHtml(genero)}</p>
                      <p class="muted">Haz clic para ver más</p>`;
    card.addEventListener('click', ()=> showDetalle(libro));
    cardsCont.appendChild(card);
  });
}

function firstValue(obj, candidates){
  for(const c of candidates){
    if(obj[c] && obj[c].toString().trim() !== '') return obj[c];
  }
  // fallback: any non-empty prop
  for(const k of Object.keys(obj || {})){
    if(obj[k] && obj[k].toString().trim() !== '') return obj[k];
  }
  return '';
}

function showDetalle(libro){
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  content.innerHTML = '';
  const title = document.createElement('h2'); title.textContent = firstValue(libro, ['Título','Titulo','title']) || 'Detalle';
  content.appendChild(title);
  // mostrar todas las columnas
  for(const key of Object.keys(libro)){
    const p = document.createElement('p');
    p.innerHTML = `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(libro[key] ?? '')}`;
    content.appendChild(p);
  }
  modal.setAttribute('aria-hidden','false');
}

function cerrarModal(){ document.getElementById('modal').setAttribute('aria-hidden','true'); }

function randomLibro(){
  if(libros.length === 0){
    showMsg('No hay libros cargados.', true);
    return;
  }
  const r = Math.floor(Math.random() * libros.length);
  showDetalle(libros[r]);
}

// Escape simple para evitar HTML inyectado desde la hoja (seguridad básica)
function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// Buscar por título/autor (simple)
function buscarTexto(q){
  q = q.trim().toLowerCase();
  if(!q) return renderTabla(window.__colKeys && window.__colKeys.keyTitulo, window.__colKeys && window.__colKeys.keyAutor, window.__colKeys && window.__colKeys.keyGenero);
  const filtrado = libros.filter(l => {
    return JSON.stringify(l).toLowerCase().includes(q);
  });
  // reusar renderTabla con los resultados filtrados (temporal)
  const tbody = document.querySelector('#tabla-libros tbody');
  tbody.innerHTML = '';
  filtrado.forEach(libro => {
    const tr = document.createElement('tr');
    const titulo = firstValue(libro, ['Título','Titulo','title']) || '—';
    const autor  = firstValue(libro, ['Autor','Author','autor']) || '—';
    const genero = firstValue(libro, ['Género','Genero','genre']) || '';
    tr.innerHTML = `<td>${escapeHtml(titulo)}</td><td>${escapeHtml(autor)}</td><td>${escapeHtml(genero)}</td>`;
    tr.addEventListener('click', ()=> showDetalle(libro));
    tbody.appendChild(tr);
  });
}

// arrancar
window.addEventListener('DOMContentLoaded', ()=>{
  init();
  document.getElementById('btn-random').addEventListener('click', randomLibro);
  document.getElementById('cerrar-modal').addEventListener('click', cerrarModal);
  document.getElementById('modal').addEventListener('click', (e)=> { if(e.target.id === 'modal') cerrarModal(); });
  document.getElementById('buscar').addEventListener('input', (e)=> buscarTexto(e.target.value));
});
