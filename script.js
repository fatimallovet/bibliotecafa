/* script.js — Videoteca Fátima */

/* ── NAVEGACIÓN ── */
function openTab(tabId) { setTab(tabId); } // alias por compatibilidad

/* Aplica el cambio visual de tab. No toca el historial del navegador;
   eso lo maneja setTab()/aplicarHash() para que el botón "atrás" funcione. */
function mostrarTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('visible'));
  var target = document.getElementById(tabId);
  if (target) target.classList.add('visible');

  /* Tabs del header (desktop) */
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.toggle('activo', b.dataset.tab === tabId);
  });

  /* Botones barra inferior (móvil) */
  document.querySelectorAll('.bottom-btn').forEach(function(b) {
    b.classList.toggle('activo', b.dataset.tab === tabId);
  });
}

/* Cambia de tab y actualiza la URL (#peliculas, #series, etc.)
   para que el usuario pueda usar el botón "atrás" del navegador. */
function setTab(tabId) {
  var nuevoHash = '#' + tabId;
  if (location.hash === nuevoHash) { mostrarTab(tabId); return; }
  location.hash = nuevoHash; // dispara "hashchange" → aplicarHash() hace el resto
}

/* ── URLS ── */
const URL_PELIS  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=0&single=true&output=csv";
const URL_SERIES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfZKKu9u0USHXUnyUHQXSxf4uRXK--I5t_5JEE4pjUhe23SWVEZfg1u1R33zazOyh2GIDb9koa8hga/pub?gid=2141924116&single=true&output=csv";

/* ── DATOS ── */
var dataPeliculas = [];
var dataSeries    = [];
var streamingData = {}; // { "tt1234567": { titulo, plataformas, link, actualizado } }

/* ── ESTADO MODAL ── */
var _itemActual   = {};
var _tituloActual = "";

/* ══════════════════════════════════════
   CARGA DE DATOS — un fetch por sección
   ══════════════════════════════════════ */
fetch(URL_PELIS)
  .then(function(r) { if (!r.ok) throw new Error("Error"); return r.text(); })
  .then(function(txt) {
    var res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataPeliculas = res.data.filter(function(i) { return Object.values(i).join("").trim() !== ""; });
    renderizar("Pelicula");
    activarBusqueda("busquedaPeliculas", "Pelicula");
    activarOrden("ordenPeliculas", "Pelicula");
    checkMoodsReady();
  });

fetch(URL_SERIES)
  .then(function(r) { return r.text(); })
  .then(function(txt) {
    var res = Papa.parse(txt, { header: true, skipEmptyLines: true });
    dataSeries = res.data.filter(function(i) { return Object.values(i).join("").trim() !== ""; });
    renderizar("Serie");
    activarBusqueda("busquedaSeries", "Serie");
    activarOrden("ordenSeries", "Serie");
    checkMoodsReady();
  });

/* info.html se separó del index para que se pueda editar sin tocar el resto del sitio */
fetch("info.html")
  .then(function(r) { return r.ok ? r.text() : "<p>No se pudo cargar la información.</p>"; })
  .then(function(html) { document.getElementById("info-contenido").innerHTML = html; })
  .catch(function() {
    document.getElementById("info-contenido").innerHTML = "<p>No se pudo cargar la información.</p>";
  });

/* streaming.json se genera solo cada semana vía GitHub Action.
   Si por algo no existe o falla, seguimos sin romper el resto del sitio. */
fetch("streaming.json")
  .then(function(r) { return r.ok ? r.json() : {}; })
  .then(function(json) { streamingData = json; })
  .catch(function() { streamingData = {}; });

/* ══════════════════════════════════════
   ORDENAR + FILTRAR → RENDERIZAR
   ══════════════════════════════════════ */
function getNum(item, key) {
  var v = item[key] || item[key.replace(/[óÓ]/g,"o").replace(/[éÉ]/g,"e")] || "";
  return parseFloat(v) || 0;
}
function getAnio(item) {
  var v = item["Año"] || item["Anio"] || "";
  var m = String(v).match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}
function getNo(item) { return Number(item["No."] || item["No"] || 0); }

function ordenarData(data, criterio) {
  var c = data.slice();
  if (criterio === "recientes")    c.sort(function(a,b){ return getNo(b) - getNo(a); });
  if (criterio === "calificacion") c.sort(function(a,b){
    var diff = getNum(b,"Calificación") - getNum(a,"Calificación");
    return diff !== 0 ? diff : getNo(b) - getNo(a);
  });
  if (criterio === "anio")         c.sort(function(a,b){
    var diff = getAnio(b) - getAnio(a);
    return diff !== 0 ? diff : getNo(b) - getNo(a);
  });
  return c;
}

function renderizar(tipo) {
  var esPeli  = tipo === "Pelicula";
  var data    = esPeli ? dataPeliculas : dataSeries;
  var gridId  = esPeli ? "cardsPeliculas" : "cardsSeries";
  var inputId = esPeli ? "busquedaPeliculas" : "busquedaSeries";
  var ordenId = esPeli ? "ordenPeliculas" : "ordenSeries";

  var texto    = (document.getElementById(inputId) || {value:""}).value.toLowerCase();
  var criterio = (document.getElementById(ordenId)  || {value:"recientes"}).value;

  var filtrados = data.filter(function(item) {
    var streaming = obtenerStreaming(item);
    var campos = [
      item["Título"] || item["Titulo"],
      item["Género"] || item["Genero"],
      item["Tono"], item["Ritmo"], item["Etiquetas"],
      item["Reseña"] || item["Resena"],
      streaming && streaming.plataformas ? streaming.plataformas.join(" ") : ""
    ];
    return campos.some(function(c) { return (c||"").toString().toLowerCase().includes(texto); });
  });

  llenarCards(ordenarData(filtrados, criterio), gridId, tipo);
}

function activarBusqueda(inputId, tipo) {
  var el = document.getElementById(inputId);
  if (el) el.addEventListener("input", function() { renderizar(tipo); });
}
function activarOrden(selectId, tipo) {
  var el = document.getElementById(selectId);
  if (el) el.addEventListener("change", function() { renderizar(tipo); });
}

/* Limpiar */
document.querySelectorAll(".clear-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    var input = btn.closest(".buscador-wrapper").querySelector(".buscador");
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    cerrarModal();
    document.querySelectorAll(".buscador").forEach(function(i) {
      if (i.value !== "") { i.value = ""; i.dispatchEvent(new Event("input")); }
    });
  }
});

/* ══════════════════════════════════════
   CARDS
   ══════════════════════════════════════ */
function claseBanda(g) {
  if (!g) return "banda-otros";
  g = g.toLowerCase();
  if (g.includes("drama"))                                            return "banda-drama";
  if (g.includes("comedia") || g.includes("comedy"))                 return "banda-comedia";
  if (g.includes("thriller") || g.includes("suspen"))                return "banda-thriller";
  if (g.includes("terror")  || g.includes("horror"))                 return "banda-terror";
  if (g.includes("accion")  || g.includes("acción") || g.includes("aventura")) return "banda-accion";
  if (g.includes("romance") || g.includes("romántic"))               return "banda-romance";
  if (g.includes("ciencia") || g.includes("sci-fi")  || g.includes("ficcion")) return "banda-ciencia";
  if (g.includes("animacion") || g.includes("animación") || g.includes("anime")) return "banda-animacion";
  if (g.includes("documental"))                                       return "banda-doc";
  if (g.includes("crimen")  || g.includes("crime")   || g.includes("policial")) return "banda-crimen";
  if (g.includes("historia")|| g.includes("period")  || g.includes("biogr"))    return "banda-historia";
  return "banda-otros";
}

function estrellas(calif) {
  var n = parseFloat(calif);
  if (isNaN(n) || calif === "") return "";
  return "⭐ " + n.toFixed(1).replace(".0","");
}

function crearCard(item, tipo) {
  var card = document.createElement("div");
  card.className = "pelicard " + (tipo === "Serie" ? "pelicard--serie" : "pelicard--pelicula");

  var titulo    = campo(item, ["Título","Titulo"]);
  var anio      = campo(item, ["Año","Anio"]);
  var genero    = campo(item, ["Género","Genero"]);
  var calif     = campo(item, ["Calificación","Calificacion"]);
  var poster    = campo(item, ["Poster","poster","Póster","póster"]).trim();
  var label     = tipo === "Serie" ? "Serie" : "Película";
  var anioCorto = (String(anio).match(/\d{4}/) || [""])[0];
  var enD       = estaEnDeseos(titulo);
  var bandaClass = claseBanda(genero);

  /* Zona superior: póster si existe, banda de color si no */
  var zonaTop;
  if (poster) {
    var wrap = document.createElement("div");
    wrap.className = "pelicard-poster-wrap";
    var img = document.createElement("img");
    img.className = "pelicard-poster";
    img.src = poster;
    img.alt = titulo;
    img.loading = "lazy";
    img.onerror = function() {
      wrap.outerHTML = '<div class="pelicard-banda ' + bandaClass + '"></div>';
    };
    var overlay = document.createElement("div");
    overlay.className = "pelicard-poster-overlay";
    overlay.innerHTML =
      '<span class="pelicard-estrellas-over">' + estrellas(calif) + '</span>' +
      '<button class="card-deseo-btn' + (enD ? " activo" : "") + '" title="Guardar en lista">' + (enD ? "♥" : "♡") + '</button>';
    wrap.appendChild(img);
    wrap.appendChild(overlay);
    card.appendChild(wrap);
    zonaTop = null; // ya añadido
  } else {
    zonaTop = '<div class="pelicard-banda ' + bandaClass + '"></div>';
  }

  /* Cuerpo de la card (siempre) */
  var body = document.createElement("div");
  body.className = "pelicard-body";
  body.innerHTML =
    '<div class="pelicard-header">' +
      '<span class="pelicard-tipo">' + label + '</span>' +
      '<span class="pelicard-anio">' + anioCorto + '</span>' +
    '</div>' +
    '<div class="pelicard-titulo">' + titulo + '</div>' +
    '<div class="pelicard-genero">' + genero + '</div>' +
    (poster ? '' :
      '<div class="pelicard-footer">' +
        '<span class="pelicard-estrellas">' + estrellas(calif) + '</span>' +
        '<button class="card-deseo-btn' + (enD ? " activo" : "") + '" title="Guardar en lista">' + (enD ? "♥" : "♡") + '</button>' +
      '</div>'
    );

  if (!poster) {
    card.innerHTML = zonaTop;
  }
  card.appendChild(body);

  /* Botón ♡ — no abre modal */
  card.querySelector(".card-deseo-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    var obj = { titulo: titulo, tipo: label, genero: genero, calif: calif, anio: anioCorto, poster: poster };
    toggleDeseoItem(obj);
    var ahora = estaEnDeseos(titulo);
    this.textContent = ahora ? "♥" : "♡";
    this.classList.toggle("activo", ahora);
  });

  card.addEventListener("click", function() {
    mostrarModal(Object.assign({}, item, { Tipo: tipo }));
  });

  return card;
}

function llenarCards(data, gridId, tipo) {
  var grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = "";
  data.forEach(function(item) {
    if (Object.values(item).join("").trim() === "") return;
    grid.appendChild(crearCard(item, tipo));
  });
}

/* ══════════════════════════════════════
   MODAL
   ══════════════════════════════════════ */
function toggleModalBloque(id, valor) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.display = (valor && String(valor).trim()) ? "" : "none";
}

function mostrarModal(d) {
  _itemActual   = d;
  _tituloActual = d["Título"] || d["Titulo"] || "";

  document.getElementById("modal-titulo").textContent       = _tituloActual;
  document.getElementById("modal-calificacion").textContent = d["Calificación"] || d["Calificacion"] || "";
  document.getElementById("modal-origen").textContent       = d["Origen"] || "";
  document.getElementById("modal-anio").textContent         = d["Año"] || d["Anio"] || "";

  document.getElementById("modal-label-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? "⏱ Minutos:" : "⏱ Capítulos:";
  document.getElementById("modal-minutos-o-caps").textContent =
    d["Tipo"] === "Pelicula" ? (d["Minutos"] || "") : (d["Capítulos"] || d["Capitulos"] || "");

  var genero    = d["Género"]    || d["Genero"]    || "";
  var tono      = d["Tono"]      || "";
  var ritmo     = d["Ritmo"]     || "";
  var publico   = d["Público"]   || d["Publico"]   || "";
  var etiquetas = d["Etiquetas"] || "";
  var flags     = d["Flags"]     || "";
  var resena    = d["Reseña"]    || d["Resena"]    || "";

  document.getElementById("modal-genero").textContent    = genero;
  document.getElementById("modal-tono").textContent      = tono;
  document.getElementById("modal-ritmo").textContent     = ritmo;
  document.getElementById("modal-publico").textContent   = publico;
  document.getElementById("modal-etiquetas").textContent = etiquetas;
  document.getElementById("modal-flags").textContent     = flags;
  document.getElementById("modal-resena").textContent    = resena;

  /* Oculta pills y secciones vacías para que la ficha no muestre huecos */
  toggleModalBloque("modal-genero-pill", genero);
  toggleModalBloque("modal-tono-pill", tono);
  toggleModalBloque("modal-ritmo-pill", ritmo);
  toggleModalBloque("modal-publico-pill", publico);
  toggleModalBloque("modal-etiquetas-wrap", etiquetas);
  toggleModalBloque("modal-flags-wrap", flags);
  toggleModalBloque("modal-resena-wrap", resena);

  var imdb = document.getElementById("modal-imdb");
  if (d["IMDB"]) { imdb.href = d["IMDB"]; imdb.style.display = "inline-flex"; }
  else           { imdb.href = "#";        imdb.style.display = "none";        }

  /* Póster en modal */
  var poster = campo(d, ["Poster","poster","Póster","póster"]).trim();
  var modalPoster = document.getElementById("modal-poster-wrap");
  if (poster) {
    modalPoster.innerHTML =
      '<img id="modal-poster-img" class="modal-poster-img" src="' + poster + '" alt="' + (d["Título"]||d["Titulo"]||"") + '" title="Ver en grande">';
    modalPoster.style.display = "block";
    document.getElementById("modal-poster-img").addEventListener("click", function() {
      abrirPosterGrande(poster, d["Título"]||d["Titulo"]||"");
    });
  } else {
    modalPoster.style.display = "none";
    modalPoster.innerHTML = "";
  }

  /* Disponibilidad en streaming */
  var streaming = obtenerStreaming(d);
  var streamingWrap = document.getElementById("modal-streaming-wrap");
  if (streaming && streaming.plataformas && streaming.plataformas.length > 0) {
    document.getElementById("modal-streaming").innerHTML = pillsStreaming(streaming.plataformas);
    streamingWrap.classList.remove("sin-streaming");
  } else {
    document.getElementById("modal-streaming").innerHTML =
      '<span class="streaming-pill streaming-ninguna">No disponible actualmente</span>';
    streamingWrap.classList.add("sin-streaming");
  }
  streamingWrap.style.display = "block";

  /* Botón deseos en modal */
  actualizarBtnDeseoModal();
  document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
function cerrarModalFuera(e) {
  if (e.target === document.getElementById("modal")) cerrarModal();
}

/* ══════════════════════════════════════
   COMPARTIR — escritorio siempre clipboard,
               móvil usa share nativo
   ══════════════════════════════════════ */
/* ══════════════════════════════════════
   FICHA COMPLETA EN TEXTO
   ══════════════════════════════════════ */
function extraerImdbId(url) {
  if (!url) return null;
  var m = String(url).match(/tt\d+/);
  return m ? m[0] : null;
}

function obtenerStreaming(d) {
  var imdbId = extraerImdbId(campo(d, ["IMDB"]));
  if (!imdbId) return null;
  return streamingData[imdbId] || null;
}

function claseStreaming(nombre) {
  var slug = nombre.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return "streaming-" + slug;
}

function pillsStreaming(plataformas) {
  return plataformas.map(function(p) {
    return '<span class="streaming-pill ' + claseStreaming(p) + '">' + p + '</span>';
  }).join("");
}

function campo(d, nombres) {
  /* Busca la primera clave que exista en el objeto, ignorando tildes y mayúsculas */
  var keys = Object.keys(d);
  for (var i = 0; i < nombres.length; i++) {
    var buscado = nombres[i].toLowerCase();
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].toLowerCase() === buscado) return d[keys[j]] || "";
    }
  }
  return "";
}

function fichaTexto(d) {
  var esPeli    = d["Tipo"] === "Pelicula";
  var tipo      = esPeli ? "Película" : "Serie";
  var titulo    = campo(d, ["Título","Titulo"]);
  var calif     = campo(d, ["Calificación","Calificacion"]);
  var origen    = campo(d, ["Origen"]);
  var anio      = campo(d, ["Año","Anio"]);
  var durLabel  = esPeli ? "Minutos" : "Capítulos";
  var durVal    = esPeli ? campo(d, ["Minutos"]) : campo(d, ["Capítulos","Capitulos"]);
  var genero    = campo(d, ["Género","Genero"]);
  var tono      = campo(d, ["Tono"]);
  var ritmo     = campo(d, ["Ritmo"]);
  var publico   = campo(d, ["Público","Publico"]);
  var etiquetas = campo(d, ["Etiquetas"]);
  var flags     = campo(d, ["Flags"]);
  var resena    = campo(d, ["Reseña","Resena"]);
  var imdb      = campo(d, ["IMDB"]);
  var streaming = obtenerStreaming(d);

  var lineas = [];
  lineas.push("🎬 " + titulo + " (" + tipo + ")");
  lineas.push("─────────────────────────");
  if (calif)     lineas.push("⭐ Calificación: " + calif + " / 10");
  if (anio)      lineas.push("Año: " + anio);
  if (origen)    lineas.push("Origen: " + origen);
  if (durVal)    lineas.push(durLabel + ": " + durVal);
  if (genero)    lineas.push("Género: " + genero);
  if (tono)      lineas.push("Tono: " + tono);
  if (ritmo)     lineas.push("Ritmo: " + ritmo);
  if (publico)   lineas.push("Público: " + publico);
  if (etiquetas) lineas.push("Etiquetas: " + etiquetas);
  if (flags)     lineas.push("⚠️ Flags: " + flags);
  if (streaming && streaming.plataformas && streaming.plataformas.length > 0) {
    lineas.push("📺 Disponible en: " + streaming.plataformas.join(", "));
  }
  if (resena)    lineas.push("\nReseña: " + resena);
  lineas.push("\n— Recomendada por: Fátima Llovet");
  lineas.push("https://fatimallovet.github.io/videotecafatima/");
  return lineas.join("\n");
}

function compartirTitulo(e) {
  var anchor = (e && e.currentTarget) || document.getElementById("modal-deseos-btn");
  mostrarMenuCompartir(anchor, {
    texto:  function() { _compartirTextoDirecto(fichaTexto(_itemActual)); },
    imagen: function() { _compartirImagenFicha(_itemActual); }
  });
}

function mostrarToast(msg) {
  var t = document.getElementById("toast-compartir");
  t.textContent = msg;
  t.classList.add("visible");
  setTimeout(function() { t.classList.remove("visible"); }, 2800);
}

/* ══════════════════════════════════════
   MENÚ "COMPARTIR" — texto o imagen
   Overlay centrado (no depende de la posición de ningún botón,
   así siempre queda visible por encima del modal / panel de deseos).
   ══════════════════════════════════════ */
var _menuCompartirFondo = null;

function mostrarMenuCompartir(anchorEl, handlers) {
  cerrarMenuCompartir();

  var fondo = document.createElement("div");
  fondo.className = "menu-compartir-fondo";

  var menu = document.createElement("div");
  menu.className = "menu-compartir";
  menu.innerHTML =
    '<div class="menu-compartir-titulo">¿Cómo quieres compartir?</div>' +
    '<button class="menu-compartir-op" data-op="texto">📝 Como texto</button>' +
    '<button class="menu-compartir-op" data-op="imagen">🖼️ Como imagen</button>' +
    '<button class="menu-compartir-cancelar" data-op="cancelar">Cancelar</button>';

  fondo.appendChild(menu);
  document.body.appendChild(fondo);

  fondo.addEventListener("click", function(ev) {
    if (ev.target === fondo) cerrarMenuCompartir();
  });

  menu.querySelector('[data-op="texto"]').addEventListener("click", function(ev) {
    ev.stopPropagation();
    cerrarMenuCompartir();
    handlers.texto();
  });
  menu.querySelector('[data-op="imagen"]').addEventListener("click", function(ev) {
    ev.stopPropagation();
    cerrarMenuCompartir();
    handlers.imagen();
  });
  menu.querySelector('[data-op="cancelar"]').addEventListener("click", function(ev) {
    ev.stopPropagation();
    cerrarMenuCompartir();
  });

  _menuCompartirFondo = fondo;
}

function cerrarMenuCompartir() {
  if (_menuCompartirFondo) {
    _menuCompartirFondo.remove();
    _menuCompartirFondo = null;
  }
}

/* ══════════════════════════════════════
   COMPARTIR — texto directo (share nativo o portapapeles)
   ══════════════════════════════════════ */
function _compartirTextoDirecto(texto) {
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (esMobil && navigator.share) {
    navigator.share({ text: texto }).catch(function(){});
  } else {
    _copiarAlPortapapeles(texto);
  }
}

/* ══════════════════════════════════════
   COMPARTIR — archivo de imagen (share nativo, portapapeles o descarga)
   ══════════════════════════════════════ */
/* En escritorio, navigator.clipboard.write() SOLO funciona si se invoca
   de inmediato dentro del clic del usuario. Si esperamos a que la imagen
   termine de generarse (cargar póster, fuentes, etc.) antes de llamarlo,
   el navegador ya no lo permite y falla en silencio. Por eso aquí llamamos
   a clipboard.write() ya mismo, pasándole la PROMESA de la imagen — el
   navegador espera a que resuelva sin perder el permiso del clic. */
function _compartirImagenDesdePromesa(promesaBlob, nombreArchivo, textoAlt) {
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!esMobil && navigator.clipboard && window.ClipboardItem) {
    navigator.clipboard.write([ new ClipboardItem({ "image/png": promesaBlob }) ])
      .then(function() { mostrarToast("¡Imagen copiada! Pégala donde quieras 🖼️"); })
      .catch(function() {
        promesaBlob.then(function(blob) { _descargarImagen(blob, nombreArchivo); })
          .catch(function() { mostrarToast("No se pudo generar la imagen 😕"); });
      });
    return;
  }

  promesaBlob.then(function(blob) {
    _compartirArchivoImagen(blob, nombreArchivo, textoAlt);
  }).catch(function() {
    mostrarToast("No se pudo generar la imagen 😕");
  });
}

function _compartirArchivoImagen(blob, nombreArchivo, textoAlt) {
  var esMobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var file    = new File([blob], nombreArchivo, { type: "image/png" });

  if (esMobil && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], text: textoAlt }).catch(function(err) {
      if (!err || err.name !== "AbortError") _descargarImagen(blob, nombreArchivo);
    });
    return;
  }

  _descargarImagen(blob, nombreArchivo);
}

function _descargarImagen(blob, nombreArchivo) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
  mostrarToast("Imagen descargada 📥");
}

/* ══════════════════════════════════════
   GENERACIÓN DE IMÁGENES (canvas)
   ══════════════════════════════════════ */
var BANDA_COLORES = {
  "banda-drama":"#7b9e87","banda-comedia":"#e8a87c","banda-thriller":"#6b7fa3",
  "banda-terror":"#8b6a6a","banda-accion":"#c47d3e","banda-romance":"#c48a9e",
  "banda-ciencia":"#5b8fa8","banda-animacion":"#80b5a0","banda-doc":"#a89860",
  "banda-crimen":"#7a6e8a","banda-historia":"#8a7a5a","banda-otros":"#9aab9e"
};

function _cargarImagen(url) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = function() { resolve(img); };
    img.onerror = function() { reject(new Error("no-image")); };
    img.src = url;
  });
}

/* TMDB no siempre manda las cabeceras CORS necesarias para poder "leer"
   la imagen desde un canvas (es inconsistente según su CDN). Para que el
   póster SIEMPRE se pueda incluir en la imagen a compartir, la pedimos a
   través de images.weserv.nl, un proxy público que sí agrega esas cabeceras.
   Si por lo que sea el proxy fallara, se intenta cargar la URL original. */
function _urlProxyCORS(url) {
  var sinProtocolo = url.replace(/^https?:\/\//, "");
  return "https://images.weserv.nl/?url=" + encodeURIComponent(sinProtocolo);
}

function _cargarPoster(url) {
  return _cargarImagen(_urlProxyCORS(url)).catch(function() {
    return _cargarImagen(url);
  });
}

/* Parte un texto en líneas que caben en maxWidth. No trunca: devuelve
   todas las líneas necesarias para mostrar el texto completo. */
function _partirLineas(ctx, texto, maxWidth) {
  var palabras = String(texto).split(" ");
  var linea = "", lineas = [];
  for (var i = 0; i < palabras.length; i++) {
    var prueba = linea + palabras[i] + " ";
    if (ctx.measureText(prueba).width > maxWidth && linea !== "") {
      lineas.push(linea.trim());
      linea = palabras[i] + " ";
    } else {
      linea = prueba;
    }
  }
  if (linea.trim()) lineas.push(linea.trim());
  return lineas;
}

function _dibujarLineas(ctx, lineas, x, y, lineHeight) {
  lineas.forEach(function(l, idx) { ctx.fillText(l, x, y + idx * lineHeight); });
  return y + lineas.length * lineHeight;
}

/* Trunca una sola línea con "…" si no cabe en maxWidth (para filas de una sola línea) */
function _truncarLinea(ctx, texto, maxWidth) {
  if (!texto) return "";
  if (ctx.measureText(texto).width <= maxWidth) return texto;
  var t = texto;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function _redondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

function _contarFilasChips(ctx, chips, W) {
  var chipX = 48, filas = 1;
  chips.forEach(function(chip) {
    var anchoChip = ctx.measureText(chip).width + 44;
    if (chipX + anchoChip > W - 48) { chipX = 48; filas++; }
    chipX += anchoChip + 16;
  });
  return filas;
}

/* Ficha individual → imagen (póster + toda la info completa + link a la videoteca).
   El alto del canvas se calcula dinámicamente según el contenido, así que
   nada — ni la reseña ni los flags — queda cortado. */
function generarImagenFicha(d, forzarSinPoster) {
  var W = 760;
  var padX = 36;
  var footerAltura = 84;
  var anchoTexto = W - padX*2;

  var titulo    = campo(d, ["Título","Titulo"]);
  var calif     = campo(d, ["Calificación","Calificacion"]);
  var origen    = campo(d, ["Origen"]);
  var anio      = campo(d, ["Año","Anio"]);
  var esPeli    = d["Tipo"] === "Pelicula";
  var durVal    = esPeli ? campo(d, ["Minutos"]) : campo(d, ["Capítulos","Capitulos"]);
  var durLabel  = esPeli ? "min" : "caps";
  var genero    = campo(d, ["Género","Genero"]);
  var tono      = campo(d, ["Tono"]);
  var ritmo     = campo(d, ["Ritmo"]);
  var publico   = campo(d, ["Público","Publico"]);
  var flags     = campo(d, ["Flags"]);
  var resena    = campo(d, ["Reseña","Resena"]);
  var poster    = campo(d, ["Poster","poster","Póster","póster"]).trim();
  var colorBanda = BANDA_COLORES[claseBanda(genero)] || "#9aab9e";
  var streaming = obtenerStreaming(d);
  var streamingTexto = (streaming && streaming.plataformas && streaming.plataformas.length > 0)
    ? "📺 " + streaming.plataformas.join("  ·  ")
    : "";

  var cargaPoster = (poster && !forzarSinPoster)
    ? _cargarPoster(poster).catch(function() { return null; })
    : Promise.resolve(null);
  var fontsListos = (document.fonts && document.fonts.ready) || Promise.resolve();

  return Promise.all([cargaPoster, fontsListos]).then(function(res) {
    var imgPoster = res[0];

    /* El póster se muestra completo, a su propia proporción (sin recortar).
       Se calcula su alto a partir del ancho fijo y su proporción real. */
    var posterW = 220;
    var posterH = imgPoster
      ? Math.round(posterW * (imgPoster.height / imgPoster.width))
      : Math.round(posterW * 1.5); // proporción estándar de póster (2:3)
    posterH = Math.max(200, Math.min(posterH, 400)); // evita proporciones extremas

    /* Canvas de medición: calcula cuánto espacio necesita cada bloque de
       texto ANTES de crear el canvas final, para que el alto total incluya
       siempre el texto completo (reseña y flags incluidos, sin recortes). */
    var medidor = document.createElement("canvas").getContext("2d");

    medidor.font = "700 34px Poppins, sans-serif";
    var lineasTitulo = _partirLineas(medidor, titulo, anchoTexto);

    var chips = [
      genero  ? "🎭 " + genero  : "",
      tono    ? "🎨 " + tono    : "",
      ritmo   ? "⏩ " + ritmo   : "",
      publico ? "👥 " + publico : ""
    ].filter(Boolean);
    medidor.font = "500 20px Poppins, sans-serif";
    var filasChips = chips.length ? _contarFilasChips(medidor, chips, W) : 0;

    medidor.font = "italic 400 26px Poppins, sans-serif";
    var lineasResena = resena ? _partirLineas(medidor, "“" + resena + "”", anchoTexto) : [];

    medidor.font = "600 20px Poppins, sans-serif";
    var lineasFlags = flags ? _partirLineas(medidor, "⚠️ " + flags, anchoTexto) : [];

    medidor.font = "500 20px Poppins, sans-serif";
    var lineasStreaming = streamingTexto ? _partirLineas(medidor, streamingTexto, anchoTexto) : [];

    var meta = [origen, anio, durVal ? (durVal + " " + durLabel) : ""].filter(Boolean).join("   ·   ");

    /* Alto total dinámico */
    var y = 36 + posterH + 28; // margen superior + póster + espacio
    y += 30; // etiqueta tipo
    y += lineasTitulo.length * 42 + 14;
    if (calif) y += 34;
    if (meta)  y += 36;
    if (lineasStreaming.length) y += lineasStreaming.length * 28 + 10;
    y += 32; // divisor
    if (chips.length)        y += filasChips * 42 + 12;
    if (lineasResena.length) y += 24 + lineasResena.length * 36 + 14;
    if (lineasFlags.length)  y += 24 + lineasFlags.length * 27;
    y += 28; // margen antes del footer
    var H = y + footerAltura;

    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    /* Fondo general (mismo gradiente charcoal del banner del modal) */
    var gFondo = ctx.createLinearGradient(0,0,0,H);
    gFondo.addColorStop(0, "#3a3833");
    gFondo.addColorStop(1, "#1e1c19");
    ctx.fillStyle = gFondo;
    ctx.fillRect(0,0,W,H);

    /* Póster centrado, con su proporción real (sin recortar) y sombra suave */
    var posterX = (W - posterW) / 2;
    var posterY = 36;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = "#000000";
    _redondeado(ctx, posterX, posterY, posterW, posterH, 14);
    ctx.fill();
    ctx.restore();

    ctx.save();
    _redondeado(ctx, posterX, posterY, posterW, posterH, 14);
    ctx.clip();
    if (imgPoster) {
      ctx.drawImage(imgPoster, posterX, posterY, posterW, posterH);
    } else {
      var gBanda = ctx.createLinearGradient(posterX, posterY, posterX, posterY + posterH);
      gBanda.addColorStop(0, colorBanda);
      gBanda.addColorStop(1, "#232323");
      ctx.fillStyle = gBanda;
      ctx.fillRect(posterX, posterY, posterW, posterH);
    }
    ctx.restore();

    if (!imgPoster) {
      ctx.textAlign = "center";
      ctx.font = "84px sans-serif";
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(esPeli ? "🎬" : "📺", posterX + posterW/2, posterY + posterH/2 + 30);
      ctx.globalAlpha = 1;
    }

    var yy = posterY + posterH + 28;
    var centerX = W / 2;

    /* Etiqueta tipo, centrada bajo el póster */
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "600 16px Poppins, sans-serif";
    ctx.fillText(esPeli ? "PELÍCULA" : "SERIE", centerX, yy);
    yy += 34;

    /* Título, centrado */
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 34px Poppins, sans-serif";
    lineasTitulo.forEach(function(l, idx) { ctx.fillText(l, centerX, yy + idx * 42); });
    yy += lineasTitulo.length * 42 + 14;

    /* Calificación, centrada */
    if (calif) {
      ctx.fillStyle = "#f3c344";
      ctx.font = "700 24px Poppins, sans-serif";
      ctx.fillText("⭐ " + calif + " / 10", centerX, yy);
      yy += 34;
    }

    /* Meta: origen · año · duración, centrada */
    if (meta) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "400 20px Poppins, sans-serif";
      ctx.fillText(meta, centerX, yy);
      yy += 36;
    }

    /* Disponibilidad en streaming, centrada */
    if (lineasStreaming.length) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "500 20px Poppins, sans-serif";
      lineasStreaming.forEach(function(l, idx) { ctx.fillText(l, centerX, yy + idx * 28); });
      yy += lineasStreaming.length * 28 + 10;
    }

    /* El resto del contenido vuelve a alineación izquierda para lectura normal */
    ctx.textAlign = "left";

    /* Línea divisoria */
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(padX, yy); ctx.lineTo(W-padX, yy); ctx.stroke();
    yy += 32;

    /* Chips: género / tono / ritmo / público */
    ctx.font = "500 20px Poppins, sans-serif";
    var chipX = padX, chipY = yy, chipAltoLinea = 42;
    chips.forEach(function(chip) {
      var anchoChip = ctx.measureText(chip).width + 32;
      if (chipX + anchoChip > W - padX) { chipX = padX; chipY += chipAltoLinea; }
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      _redondeado(ctx, chipX, chipY, anchoChip, 32, 16);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(chip, chipX + 16, chipY + 22);
      chipX += anchoChip + 12;
    });
    if (chips.length) yy = chipY + chipAltoLinea + 12;

    /* Reseña — completa, sin truncar */
    if (lineasResena.length) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "italic 400 26px Poppins, sans-serif";
      yy = _dibujarLineas(ctx, lineasResena, padX, yy + 24, 36);
      yy += 14;
    }

    /* Flags — completos, sin truncar */
    if (lineasFlags.length) {
      ctx.fillStyle = "#e0a05a";
      ctx.font = "600 20px Poppins, sans-serif";
      yy = _dibujarLineas(ctx, lineasFlags, padX, yy + 24, 27);
    }

    /* Footer con marca y link */
    ctx.fillStyle = "#556b5d";
    ctx.fillRect(0, H-footerAltura, W, footerAltura);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 22px Poppins, sans-serif";
    ctx.fillText("🎬 Videoteca Fátima", W/2, H-footerAltura/2 - 6);
    ctx.font = "400 16px Poppins, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("fatimallovet.github.io/videotecafatima", W/2, H-footerAltura/2 + 18);

    return new Promise(function(resolve, reject) {
      try {
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob); else reject(new Error("toBlob-vacio"));
        }, "image/png");
      } catch (err) { reject(err); }
    });
  }).catch(function(err) {
    /* Si el póster deja el canvas "contaminado", reintenta sin él */
    if (!forzarSinPoster) return generarImagenFicha(d, true);
    throw err;
  });
}

/* Lista de deseos → imagen (miniatura + título + tipo + año + género + calificación) */
function generarImagenLista() {
  var W = 720;
  var filaAltura   = 84;
  var headerAltura = 116;
  var footerAltura = 74;
  var thumbW = 48, thumbH = 72;
  var padX = 28;

  var deseos = _deseos.map(_enriquecerDeseo);
  var H = headerAltura + (deseos.length * filaAltura) + footerAltura + 16;

  var fontsListos = (document.fonts && document.fonts.ready) || Promise.resolve();
  var cargaPosters = Promise.all(deseos.map(function(item) {
    return item.poster ? _cargarPoster(item.poster).catch(function() { return null; }) : Promise.resolve(null);
  }));

  return Promise.all([cargaPosters, fontsListos]).then(function(res) {
    var posters = res[0];
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var gFondo = ctx.createLinearGradient(0,0,0,H);
    gFondo.addColorStop(0, "#3a3833");
    gFondo.addColorStop(1, "#1e1c19");
    ctx.fillStyle = gFondo;
    ctx.fillRect(0,0,W,H);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px Poppins, sans-serif";
    ctx.fillText("🎬 Mi lista de deseos", padX, 54);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "400 18px Poppins, sans-serif";
    ctx.fillText("Videoteca Fátima  ·  " + deseos.length + " título" + (deseos.length === 1 ? "" : "s"), padX, 82);

    var textX = padX + thumbW + 16;
    var anchoDisponible = W - textX - padX;

    var y = headerAltura;
    deseos.forEach(function(item, i) {
      if (i % 2 === 1) {
        ctx.fillStyle = "rgba(255,255,255,0.045)";
        ctx.fillRect(0, y, W, filaAltura);
      }

      var esPeli = item.tipo === "Película" || item.tipo === "Pelicula";
      var thumbY = y + (filaAltura - thumbH) / 2;
      var img = posters[i];

      if (img) {
        /* Fondo del color de género, por si el póster no llena toda la miniatura */
        ctx.fillStyle = BANDA_COLORES[claseBanda(item.genero || "")] || "#9aab9e";
        _redondeado(ctx, padX, thumbY, thumbW, thumbH, 7);
        ctx.fill();

        /* "Contain": se ve la portada completa, sin recortar */
        var escala = Math.min(thumbW/img.width, thumbH/img.height);
        var pw = img.width*escala, ph = img.height*escala;
        var px = padX + (thumbW-pw)/2, py = thumbY + (thumbH-ph)/2;
        ctx.save();
        _redondeado(ctx, padX, thumbY, thumbW, thumbH, 7);
        ctx.clip();
        ctx.drawImage(img, px, py, pw, ph);
        ctx.restore();
      } else {
        ctx.fillStyle = BANDA_COLORES[claseBanda(item.genero || "")] || "#9aab9e";
        _redondeado(ctx, padX, thumbY, thumbW, thumbH, 7);
        ctx.fill();
        ctx.textAlign = "center";
        ctx.font = "22px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(esPeli ? "🎬" : "📺", padX + thumbW/2, thumbY + thumbH/2 + 8);
        ctx.textAlign = "left";
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 21px Poppins, sans-serif";
      var lineaTitulo = _truncarLinea(ctx, (esPeli ? "🎬 " : "📺 ") + item.titulo, anchoDisponible);
      ctx.fillText(lineaTitulo, textX, y + filaAltura/2 - 6);

      var sub = [
        item.anio   ? item.anio : "",
        item.genero ? item.genero.split(",")[0].trim() : "",
        item.calif  ? "⭐ " + item.calif : ""
      ].filter(Boolean).join("   ·   ");
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "400 17px Poppins, sans-serif";
      ctx.fillText(_truncarLinea(ctx, sub, anchoDisponible), textX, y + filaAltura/2 + 20);

      y += filaAltura;
    });

    ctx.fillStyle = "#556b5d";
    ctx.fillRect(0, H - footerAltura, W, footerAltura);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 22px Poppins, sans-serif";
    ctx.fillText("🎬 Videoteca Fátima", W/2, H - footerAltura/2 - 6);
    ctx.font = "400 16px Poppins, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("fatimallovet.github.io/videotecafatima", W/2, H - footerAltura/2 + 18);

    return new Promise(function(resolve, reject) {
      try {
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob); else reject(new Error("toBlob-vacio"));
        }, "image/png");
      } catch (err) { reject(err); }
    });
  });
}

function _compartirImagenFicha(d) {
  var nombre = (campo(d, ["Título","Titulo"]) || "ficha").replace(/[^\w\-]+/g, "_") + ".png";
  var textoAlt = "🎬 " + campo(d, ["Título","Titulo"]) + " — Videoteca Fátima\nhttps://fatimallovet.github.io/videotecafatima/";
  _compartirImagenDesdePromesa(generarImagenFicha(d), nombre, textoAlt);
}

function _compartirImagenLista() {
  if (_deseos.length === 0) return;
  var textoAlt = "🎬 Mi lista de deseos — Videoteca Fátima\nhttps://fatimallovet.github.io/videotecafatima/";
  _compartirImagenDesdePromesa(generarImagenLista(), "mi-lista-videoteca.png", textoAlt);
}

/* ══════════════════════════════════════
   LISTA DE DESEOS
   ══════════════════════════════════════ */
var _deseos = [];
try { _deseos = JSON.parse(localStorage.getItem("videoteca_deseos") || "[]"); } catch(e) {}

function guardarDeseos() {
  try { localStorage.setItem("videoteca_deseos", JSON.stringify(_deseos)); } catch(e) {}
  actualizarFab();
}

function estaEnDeseos(titulo) {
  return _deseos.some(function(d) { return d.titulo === titulo; });
}

function toggleDeseoItem(obj) {
  if (estaEnDeseos(obj.titulo)) {
    _deseos = _deseos.filter(function(d) { return d.titulo !== obj.titulo; });
  } else {
    _deseos.push(obj);
    mostrarToast("Añadido a tu lista ♥");
  }
  guardarDeseos();
  renderPanelDeseos();
}

/* Desde el modal */
function toggleDeseo() {
  var d      = _itemActual;
  var titulo = d["Título"] || d["Titulo"] || "";
  var tipo   = d["Tipo"] === "Pelicula" ? "Película" : "Serie";
  var genero = d["Género"] || d["Genero"] || "";
  var calif  = d["Calificación"] || d["Calificacion"] || "";
  var anioRaw = d["Año"] || d["Anio"] || "";
  var anio   = (String(anioRaw).match(/\d{4}/) || [""])[0];
  var poster = campo(d, ["Poster","poster","Póster","póster"]).trim();

  toggleDeseoItem({ titulo: titulo, tipo: tipo, genero: genero, calif: calif, anio: anio, poster: poster });
  actualizarBtnDeseoModal();

  /* Sincronizar botón en card visible */
  sincronizarCardDeseo(titulo);
}

function actualizarBtnDeseoModal() {
  var btn = document.getElementById("modal-deseos-btn");
  if (!btn) return;
  var enD = estaEnDeseos(_tituloActual);
  btn.textContent = enD ? "♥ En mi lista" : "♡ Guardar";
  btn.classList.toggle("activo", enD);
}

function sincronizarCardDeseo(titulo) {
  document.querySelectorAll(".pelicard").forEach(function(card) {
    var tit = card.querySelector(".pelicard-titulo");
    if (!tit || tit.textContent !== titulo) return;
    var btn = card.querySelector(".card-deseo-btn");
    if (!btn) return;
    var enD = estaEnDeseos(titulo);
    btn.textContent = enD ? "♥" : "♡";
    btn.classList.toggle("activo", enD);
  });
}

/* FAB */
function actualizarFab() {
  var n = _deseos.length;

  /* FAB — visible en desktop */
  var fab = document.getElementById("fab-deseos");
  var cnt = document.getElementById("fab-count");
  if (fab) { cnt.textContent = n; fab.style.display = n > 0 ? "flex" : "none"; }

  /* Botón wishlist en bottom-nav — visible en móvil */
  var botBtn = document.getElementById("bottom-wishlist-btn");
  var botCnt = document.getElementById("bottom-wishlist-count");
  if (botBtn) {
    var mostrar = n > 0;
    botBtn.style.display  = mostrar ? "flex" : "none";
    botCnt.textContent    = mostrar ? n : "";
    botBtn.classList.toggle("tiene-items", mostrar);
  }
}

/* Panel */
/* Si un registro de la lista de deseos se guardó antes de tener año/poster,
   completa esos datos buscando el título en el catálogo ya cargado. */
function _buscarDatoOriginal(titulo) {
  var todos = dataPeliculas.concat(dataSeries);
  for (var i = 0; i < todos.length; i++) {
    if ((todos[i]["Título"] || todos[i]["Titulo"] || "") === titulo) return todos[i];
  }
  return null;
}

function _enriquecerDeseo(item) {
  if (item.anio && item.poster !== undefined) return item;
  var orig = _buscarDatoOriginal(item.titulo);
  if (!orig) return item;
  var anioOriginal = (String(campo(orig, ["Año","Anio"])).match(/\d{4}/) || [""])[0];
  return {
    titulo: item.titulo,
    tipo:   item.tipo   || (dataPeliculas.indexOf(orig) !== -1 ? "Película" : "Serie"),
    genero: item.genero || campo(orig, ["Género","Genero"]),
    calif:  item.calif  || campo(orig, ["Calificación","Calificacion"]),
    anio:   item.anio   || anioOriginal,
    poster: (item.poster !== undefined ? item.poster : campo(orig, ["Poster","poster","Póster","póster"]).trim())
  };
}

function compartirItem(titulo, e) {
  /* Buscar el item completo en los datos para usar fichaTexto */
  var encontrado = null;
  dataPeliculas.concat(dataSeries).forEach(function(item) {
    if ((item["Título"] || item["Titulo"] || "") === titulo) encontrado = item;
  });

  var d = null;
  if (encontrado) {
    var esPeli = dataPeliculas.some(function(i) { return (i["Título"]||i["Titulo"]||"") === titulo; });
    d = Object.assign({}, encontrado, { Tipo: esPeli ? "Pelicula" : "Serie" });
  }

  var textoFallback = "🎬 " + titulo + "\n— Videoteca Fátima\nhttps://fatimallovet.github.io/videotecafatima/";
  var anchor = e ? e.currentTarget : null;

  mostrarMenuCompartir(anchor, {
    texto:  function() { _compartirTextoDirecto(d ? fichaTexto(d) : textoFallback); },
    imagen: function() {
      if (d) _compartirImagenFicha(d);
      else mostrarToast("No encontré los datos completos de este título 😕");
    }
  });
}

function compartirListaCompleta(e) {
  if (_deseos.length === 0) return;
  var anchor = (e && e.currentTarget) || document.querySelector(".deseos-compartir-lista-btn");

  mostrarMenuCompartir(anchor, {
    texto: function() {
      var lineas = _deseos.map(_enriquecerDeseo).map(function(d, i) {
        var extra = [];
        if (d.tipo)   extra.push(d.tipo);
        if (d.anio)   extra.push(d.anio);
        if (d.genero) extra.push(d.genero.split(",")[0].trim());
        return (i+1) + ". " + d.titulo + (extra.length ? " (" + extra.join(" · ") + ")" : "");
      });
      var texto = "🎬 Mi lista de deseos — Videoteca Fátima\n\n" +
                  lineas.join("\n") +
                  "\n\nhttps://fatimallovet.github.io/videotecafatima/";
      _compartirTextoDirecto(texto);
    },
    imagen: function() { _compartirImagenLista(); }
  });
}

function _copiarAlPortapapeles(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto)
      .then(function()  { mostrarToast("¡Copiado al portapapeles! 📋"); })
      .catch(function() { _copiarFallback(texto); });
  } else {
    _copiarFallback(texto);
  }
}

function _copiarFallback(texto) {
  var ta = document.createElement("textarea");
  ta.value = texto; ta.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand("copy"); mostrarToast("¡Copiado al portapapeles! 📋"); }
  catch(e) { mostrarToast("No se pudo copiar 😕"); }
  document.body.removeChild(ta);
}

function renderPanelDeseos() {
  var lista = document.getElementById("deseos-lista");
  var cnt   = document.getElementById("deseos-count");
  if (!lista) return;
  if (cnt) cnt.textContent = _deseos.length;
  lista.innerHTML = "";

  if (_deseos.length === 0) {
    lista.innerHTML = '<p class="deseos-vacia">Tu lista está vacía.<br>Toca ♡ en cualquier tarjeta.</p>';
    return;
  }

  _deseos.forEach(function(item) {
    var row = document.createElement("div");
    row.className = "deseo-item";
    row.innerHTML =
      '<div class="deseo-info">' +
        '<span class="deseo-titulo">' + item.titulo + '</span>' +
        '<span class="deseo-meta">' + (item.tipo || "") +
          (item.genero ? " · " + item.genero.split(",")[0] : "") + '</span>' +
      '</div>' +
      '<div class="deseo-acciones">' +
        '<button class="deseo-compartir-item" title="Compartir">↗</button>' +
        '<button class="deseo-quitar" title="Quitar">✖</button>' +
      '</div>';

    row.querySelector(".deseo-quitar").addEventListener("click", function() {
      _deseos = _deseos.filter(function(d) { return d.titulo !== item.titulo; });
      guardarDeseos();
      renderPanelDeseos();
      sincronizarCardDeseo(item.titulo);
      if (_tituloActual === item.titulo) actualizarBtnDeseoModal();
    });

    row.querySelector(".deseo-compartir-item").addEventListener("click", function(e) {
      compartirItem(item.titulo, e);
    });

    lista.appendChild(row);
  });
}

function abrirPanelDeseos() {
  renderPanelDeseos();
  document.getElementById("panel-deseos").classList.add("abierto");
}
function cerrarPanelDeseos() {
  document.getElementById("panel-deseos").classList.remove("abierto");
}
function vaciarDeseos() {
  _deseos = [];
  guardarDeseos();
  renderPanelDeseos();
  document.querySelectorAll(".card-deseo-btn").forEach(function(b) {
    b.textContent = "♡"; b.classList.remove("activo");
  });
  actualizarBtnDeseoModal();
  mostrarToast("Lista vaciada");
}

/* Init */
document.addEventListener("DOMContentLoaded", function() { actualizarFab(); });

/* ══════════════════════════════════════
   LIGHTBOX PÓSTER
   ══════════════════════════════════════ */
function abrirPosterGrande(url, titulo) {
  var lb = document.getElementById("lightbox-poster");
  if (!lb) {
    lb = document.createElement("div");
    lb.id = "lightbox-poster";
    lb.className = "lightbox-poster";
    lb.innerHTML =
      '<div class="lightbox-inner">' +
        '<button class="lightbox-close" onclick="cerrarPosterGrande()">✖</button>' +
        '<img id="lightbox-img" src="" alt="">' +
        '<p id="lightbox-titulo"></p>' +
      '</div>';
    lb.addEventListener("click", function(e) {
      if (e.target === lb) cerrarPosterGrande();
    });
    document.body.appendChild(lb);
  }
  document.getElementById("lightbox-img").src   = url;
  document.getElementById("lightbox-img").alt   = titulo;
  document.getElementById("lightbox-titulo").textContent = titulo;
  lb.style.display = "flex";
}

function cerrarPosterGrande() {
  var lb = document.getElementById("lightbox-poster");
  if (lb) lb.style.display = "none";
}

/* ══════════════════════════════════════
   MOODS
   ══════════════════════════════════════ */

var MOODS_DEF = {
  accion_aventura: { nombre: "Acción y Aventura" },
  dramas:          { nombre: "Dramas" },
  crimen_suspenso: { nombre: "Crimen y Suspenso" },
  comedia:         { nombre: "Comedia" },
  biografias:      { nombre: "Biografías" },
  scifi_fantasia:  { nombre: "Ciencia Ficción y Fantasía" },
  romance:         { nombre: "Romance" },
  epoca:           { nombre: "Cine de Época" },
  kdrama:          { nombre: "K-dramas" },
  familiares:      { nombre: "Familiares" },
  musicales:       { nombre: "Musicales" },
  deportivo:       { nombre: "Cine Deportivo" },
  lujo:            { nombre: "Amor y Lujo" },
  navidad:         { nombre: "Navideñas" },
  diferente:       { nombre: "Algo diferente" }
};

function clasificarMoodsBase(item) {
  var genero = campo(item, ["Género","Genero"]).toLowerCase();
  var tono   = campo(item, ["Tono"]).toLowerCase();
  var origen = campo(item, ["Origen"]).toLowerCase();

  function m(txt, pp) { return pp.some(function(p){ return txt.indexOf(p) !== -1; }); }

  /* ── 🎄 NAVIDEÑAS: exclusivo, no entra a ninguna otra categoría ── */
  if (m(genero, ["navideña","navideño"])) {
    return ["navidad"];
  }

  var moods = [];

  /* ── Acción y Aventura ── */
  if (m(genero, ["acción","aventura","bélico","guerra","western"])) {
    moods.push("accion_aventura");
  }

  /* ── Comedia (incluye comedia negra) ── */
  if (m(genero, ["comedia"])) {
    moods.push("comedia");
  }

  /* ── Romance ── */
  if (m(genero, ["romance"])) {
    moods.push("romance");
  }

  /* ── Crimen y Suspenso ── */
  if (m(genero, ["crimen","thriller","suspenso","misterio","intriga","espionaje"])) {
    moods.push("crimen_suspenso");
  }

  /* ── Ciencia Ficción y Fantasía ── */
  if (m(genero, ["ciencia ficción","sci-fi","fantasía"])) {
    moods.push("scifi_fantasia");
  }

  /* ── Cine de Época (por ambientación, no por tono) ── */
  if (m(genero, ["histórico","historia","drama de época","drama histórico"])) {
    moods.push("epoca");
  }

  /* ── Familiares ── */
  if (m(genero, ["familiar","familia"])) {
    moods.push("familiares");
  }

  /* ── Musicales ── */
  if (m(genero, ["musical","música"])) {
    moods.push("musicales");
  }

  /* ── Biografías ── */
  if (m(genero, ["biografía","biográfica"])) {
    moods.push("biografias");
  }

  /* ── Cine Deportivo ── */
  if (m(genero, ["deporte","deportivo","fútbol"])) {
    moods.push("deportivo");
  }

  /* ── K-dramas (por Origen, no por género) ── */
  if (m(origen, ["corea"])) {
    moods.push("kdrama");
  }

  /* ── Dramas, depurado: solo si "drama" es realmente el género dominante.
     Si además trae un género que le da otra identidad más fuerte
     (comedia/acción/aventura/fantasía/sci-fi), ya no cuenta como "Drama" puro */
  var contradiceDrama = ["comedia","acción","aventura","fantasía","ciencia ficción","sci-fi"];
  if (m(genero, ["drama"]) && !m(genero, contradiceDrama)) {
    moods.push("dramas");
  }

  /* ── Amor y Lujo: sub-selección especial dentro de Romance ── */
  if (m(genero, ["romance"]) &&
      m(tono, ["elegante","romántico","cálido","sofisticado","nostálgico"])) {
    moods.push("lujo");
  }

  /* ── Algo diferente: animación, tono surrealista/teatral/absurdo,
     o red de seguridad para lo que no calzó en ninguna otra ── */
  if (m(genero, ["animación"]) || m(tono, ["surrealista","teatral","absurdo"])) {
    moods.push("diferente");
  }

  return moods;
}

function clasificarMoods(item, tipo) {
  var moods = clasificarMoodsBase(item);
  /* Red de seguridad: si no matcheó ninguna categoría real, cae en
     "Algo diferente" para que ningún título se quede sin categoría */
  if (moods.length === 0) moods.push("diferente");
  return moods;
}

/* ── Revisión de cobertura de moods ──────────────────────────────
   Corre automáticamente al cargar los datos y deja un reporte en la
   consola del navegador (F12 → Console). Úsalo cada vez que agregues
   títulos nuevos a tus Google Sheets: recarga el sitio, abre la consola
   y revisa qué títulos cayeron solo por la red de seguridad — esos son
   los que probablemente necesitan un ajuste de reglas o de Tono/Género. */
function revisarCoberturaMoods() {
  var todos = dataPeliculas.concat(dataSeries);
  var sinMoodReal = [];

  todos.forEach(function(item) {
    var base = clasificarMoodsBase(item);
    if (base.length === 0) {
      sinMoodReal.push(campo(item, ["Título","Titulo"]) + "  [Género: " + campo(item,["Género","Genero"]) +
        " | Tono: " + campo(item,["Tono"]) + " | Ritmo: " + campo(item,["Ritmo"]) + "]");
    }
  });

  console.log("%c🎭 Revisión de cobertura de moods", "font-weight:bold;font-size:13px");
  console.log("Total de títulos revisados: " + todos.length);
  if (sinMoodReal.length === 0) {
    console.log("✅ Todos los títulos matchean al menos un mood real. Nada cayó solo en la red de seguridad.");
  } else {
    console.warn("⚠️ " + sinMoodReal.length + " título(s) cayeron SOLO por la red de seguridad (mood 'Algo diferente' automático). Revisa si su Género/Tono necesita un ajuste, o si hace falta ampliar alguna regla:");
    sinMoodReal.forEach(function(linea) { console.warn("  • " + linea); });
  }
}

function actualizarContadoresMoods() {
  var todos = dataPeliculas.concat(dataSeries);
  var conteos = {};
  Object.keys(MOODS_DEF).forEach(function(k) { conteos[k] = 0; });

  todos.forEach(function(item) {
    var tipo  = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    var moods = clasificarMoods(item, tipo);
    moods.forEach(function(m) { conteos[m]++; });
  });

  Object.keys(conteos).forEach(function(k) {
    var el = document.getElementById("count-" + k);
    if (el) el.textContent = conteos[k] + " títulos";
  });
}

/* Cambia a un mood y actualiza la URL (#moods/kdrama, etc.) */
function verMood(moodKey) {
  var nuevoHash = '#moods/' + moodKey;
  if (location.hash === nuevoHash) { mostrarMoodResultado(moodKey); return; }
  location.hash = nuevoHash;
}

function mostrarMoodResultado(moodKey) {
  var def   = MOODS_DEF[moodKey];
  if (!def) return;
  var todos = dataPeliculas.concat(dataSeries);

  var filtrados = todos.filter(function(item) {
    var tipo  = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    return clasificarMoods(item, tipo).indexOf(moodKey) !== -1;
  });

  // Ordenar por año desc, desempate por No. desc
  filtrados.sort(function(a, b) {
    var ya = parseInt(((campo(a,["Año","Anio"]) || "0").match(/[0-9]{4}/) || ["0"])[0]);
    var yb = parseInt(((campo(b,["Año","Anio"]) || "0").match(/[0-9]{4}/) || ["0"])[0]);
    if (yb !== ya) return yb - ya;
    return (Number(campo(b,["No.","No"])) || 0) - (Number(campo(a,["No.","No"])) || 0);
  });

  document.getElementById("moods-grid").style.display    = "none";
  document.getElementById("mood-resultado").style.display = "block";
  document.getElementById("mood-resultado-titulo").textContent = def.nombre;
  document.querySelector(".moods-intro").style.display = "none";

  var grid = document.getElementById("mood-cards");
  grid.innerHTML = "";
  filtrados.forEach(function(item) {
    var tipo = dataPeliculas.indexOf(item) !== -1 ? "Pelicula" : "Serie";
    grid.appendChild(crearCard(item, tipo));
  });
}

/* Vuelve a la grilla de colecciones y actualiza la URL (#moods) */
function volverMoods() {
  var nuevoHash = '#moods';
  if (location.hash === nuevoHash) { mostrarMoodGrid(); return; }
  location.hash = nuevoHash;
}

function mostrarMoodGrid() {
  document.getElementById("moods-grid").style.display     = "grid";
  document.getElementById("mood-resultado").style.display = "none";
  document.querySelector(".moods-intro").style.display    = "block";
}

/* Actualizar contadores cuando los datos estén listos */
var _moodsPendientes = 2; // espera pelis + series
function checkMoodsReady() {
  _moodsPendientes--;
  if (_moodsPendientes === 0) {
    actualizarContadoresMoods();
    revisarCoberturaMoods();
    /* Si la página se cargó con una URL tipo #moods/kdrama, la aplicamos
       ahora que ya hay datos suficientes para filtrar el mood. */
    if (_moodPendienteInicial) {
      mostrarMoodResultado(_moodPendienteInicial);
      _moodPendienteInicial = null;
    }
  }
}

/* ══════════════════════════════════════
   RUTAS (hash) — permite usar el botón "atrás" del navegador
   para moverse entre Películas / Series / Colecciones / Info,
   y entre la grilla de colecciones y un mood abierto.
   ══════════════════════════════════════ */
var TABS_VALIDOS = ["peliculas", "series", "moods", "como-funciona"];
var _moodPendienteInicial = null;

function aplicarHash() {
  var hash   = location.hash.replace(/^#/, "");
  var partes = hash.split("/");
  var tab    = partes[0] || "peliculas";
  if (TABS_VALIDOS.indexOf(tab) === -1) tab = "peliculas";

  mostrarTab(tab);

  if (tab === "moods") {
    var moodKey = partes[1];
    if (moodKey && MOODS_DEF[moodKey]) {
      if (_moodsPendientes === 0) {
        mostrarMoodResultado(moodKey);
      } else {
        /* Los datos (CSV) todavía no cargan; se aplica en checkMoodsReady() */
        _moodPendienteInicial = moodKey;
      }
    } else {
      mostrarMoodGrid();
    }
  }
}

window.addEventListener("hashchange", aplicarHash);
aplicarHash(); // aplica el estado inicial según la URL con la que llegó el usuario
