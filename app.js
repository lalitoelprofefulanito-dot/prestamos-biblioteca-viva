/* =====================================================================
   Sistema de préstamos Biblioteca Viva · Escuela Primaria Molino de Rosas
   Aplicación estática: funciona en GitHub Pages o abriendo index.html.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- Datos y configuración ---------------- */
  var CFG = Object.assign({
    escuela: "", diasPrestamo: 7, librosPorVale: 2, grupos: [], descontarBibliotecaDeAula: true,
    claveMostrador: "", endpointPrestamos: ""
  }, window.BV_CONFIG || {});
  var ACERVO = window.ACERVO || [];
  var ESTANTES = window.ESTANTES || {};
  var POR_ID = {};
  ACERVO.forEach(function (b, i) { b._n = i; POR_ID[b.id] = b; });

  var COLORES = [
    ["Verde", "#3f9f4a", "#fff"], ["Amarillo", "#f2c230", "#1d2745"], ["Rosa claro", "#f6b3c8", "#1d2745"],
    ["Gris claro", "#c9ced8", "#1d2745"], ["Azul cielo", "#6cc4ee", "#1d2745"], ["Morado", "#6b3fa0", "#fff"],
    ["Café", "#8a5a34", "#fff"], ["Gris oscuro", "#555c69", "#fff"], ["Lila", "#b9a2e0", "#1d2745"],
    ["Azul", "#1f5fbf", "#fff"], ["Rosa", "#e2589b", "#fff"], ["Rojo", "#d71635", "#fff"]
  ];
  var COLOR = {}; COLORES.forEach(function (c) { COLOR[c[0]] = { fondo: c[1], texto: c[2] }; });
  function colorDe(nombre) { return COLOR[nombre] || { fondo: "#cfd5e3", texto: "#1d2745" }; }

  var SERIES = [
    { n: "Al sol solito", f: "al-sol-solito", edad: "3 a 5 años" },
    { n: "Pasos de luna", f: "pasos-de-luna", edad: "6 a 8 años" },
    { n: "Astrolabio", f: "astrolabio", edad: "9 a 11 años" },
    { n: "Espejo de Urania", f: "espejo-de-urania", edad: "12 a 14 años" }
  ];
  var SERIE = {}; SERIES.forEach(function (s) { SERIE[s.n] = s; });
  var TIPOLOGIA_ALUMNOS = { "Libro": 1, "Consulta": 1, "Material didáctico": 1 };

  var PLATICA = {
    Literario: [
      "¿Qué personaje te gustaría tener de amigo y por qué?",
      "Si pudieras cambiar el final, ¿cómo terminaría la historia?",
      "¿Qué parte te dio más risa, miedo o sorpresa?",
      "¿A quién de la familia le recomendarías este libro?"
    ],
    Informativo: [
      "¿Qué dato nuevo aprendiste que no sabías?",
      "¿Qué te gustaría investigar después de leerlo?",
      "¿Dónde has visto en tu vida diaria algo de lo que explica el libro?",
      "Explícale con tus palabras una idea del libro a alguien de tu casa."
    ]
  };

  /* ---------------- Utilidades ---------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function norm(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function azar(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function barajar(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function miles(n) { return n.toLocaleString("es-MX"); }
  function hoyISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function sumarDias(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function fechaCorta(iso) {
    if (!iso) return "";
    return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  }
  function fechaLarga(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  }
  function leer(clave, def) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch (e) { aviso("No se pudo guardar en este navegador."); } }
  function portada(id) { return (window.PORTADAS && window.PORTADAS[id]) || ("portadas/" + id + ".webp"); }
  function lomo(f) { return (window.LOMOS && window.LOMOS[f]) || ("assets/lomos/" + f + ".jpeg"); }
  function ubicTexto(b) { return "Anaquel " + b.an + ", entrepaño " + b.en; }
  function normalizarId(t) {
    var m = String(t || "").trim().match(/^bv[\s\-_]*0*(\d{1,5})$/i);
    if (!m) return null;
    var n = m[1]; while (n.length < 4) n = "0" + n;
    return "BV-" + n;
  }
  var toastT;
  function aviso(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("ver");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("ver"); }, 2800);
  }
  function para(b) { return TIPOLOGIA_ALUMNOS[b.ti] === 1; }

  /* índice de búsqueda */
  ACERVO.forEach(function (b) {
    b._t = norm(b.t); b._a = norm(b.a);
    b._x = norm([b.t, b.a, b.e, b.tm, b.cs, b.c, b.s, b.id, b.i, b.il, b.tr, b.m, b.y].join(" "));
  });

  /* ---------------- Préstamos y disponibilidad ---------------- */
  var PRESTAMOS = leer("bv.prestamos", []);
  var REMOTO = null; // {id: {n, vence}} cuando hay servidor
  function activos() { return PRESTAMOS.filter(function (p) { return !p.devuelto; }); }
  function vencido(p) { return !p.devuelto && p.vence < hoyISO(); }
  function enAula(b) {
    if (!CFG.descontarBibliotecaDeAula || !b.au) return 0;
    return b.au.reduce(function (s, x) { return s + x[1]; }, 0);
  }
  function prestados(id) {
    if (REMOTO) return REMOTO[id] ? REMOTO[id].n : 0;
    return PRESTAMOS.filter(function (p) { return p.id === id && !p.devuelto; }).length;
  }
  function proximaVuelta(id) {
    if (REMOTO) return REMOTO[id] ? REMOTO[id].vence : "";
    var v = PRESTAMOS.filter(function (p) { return p.id === id && !p.devuelto; }).map(function (p) { return p.vence; }).sort();
    return v[0] || "";
  }
  function disponibles(b) { return Math.max(0, (b.q || 1) - enAula(b) - prestados(b.id)); }
  function gruposAula(b) { return (b.au || []).map(function (x) { return x[0]; }).join(" y "); }
  function estado(b) {
    var d = disponibles(b);
    if (d > 0) return { c: "si", t: d === 1 ? "1 disponible" : d + " disponibles" };
    if (enAula(b) >= (b.q || 1)) return { c: "aula", t: "En la biblioteca de aula de " + gruposAula(b) };
    var v = proximaVuelta(b.id);
    return { c: "no", t: v ? "Prestado, vuelve el " + fechaCorta(v) : "Prestado por ahora" };
  }

  /* ---------------- Tarjetas ---------------- */
  function tapa(b, conEtiqueta) {
    var k = colorDe(b.k);
    var est = "--k:" + k.fondo + ";--kt:" + k.texto;
    var etq = conEtiqueta ? '<span class="etiqueta" style="' + est + '">' + esc(b.id) + "</span>" : "";
    if (b.img) {
      return '<div class="tapa"><img loading="lazy" decoding="async" src="' + portada(b.id) + '" alt="Portada de ' + esc(b.t) + '">' + etq + "</div>";
    }
    return '<div class="tapa tapa--sin" style="' + est + '"><span>' + esc(b.t) + "</span>" + etq + "</div>";
  }
  function tarjeta(b) {
    var e = estado(b);
    return '<button type="button" class="libro" data-id="' + b.id + '">' + tapa(b, true) +
      "<h3>" + esc(b.t) + "</h3>" + (b.a ? '<p class="autor">' + esc(b.a) + "</p>" : "") +
      '<p class="estado estado--' + e.c + '">' + esc(e.t) + "</p></button>";
  }
  document.addEventListener("click", function (ev) {
    var l = ev.target.closest(".libro, .libro-pie, [data-abrir]");
    if (l) { abrirFicha(l.dataset.id || l.dataset.abrir); }
  });

  /* ---------------- Explorar ---------------- */
  var F = { q: "", series: {}, genero: "", color: "", origen: "", disp: false, resena: false, docentes: false, orden: "relevancia" };
  var pagina = 1, POR_PAGINA = 48, ultimos = [];

  function montarFiltros() {
    var fs = $("#filtroSerie");
    fs.innerHTML = SERIES.map(function (s) {
      return '<button type="button" class="lomo-btn" data-s="' + esc(s.n) + '" aria-pressed="false" title="' + esc(s.n + ", " + s.edad) + '">' +
        '<img src="' + lomo(s.f) + '" alt="' + esc(s.n) + '"></button>';
    }).join("") + '<button type="button" class="lomo-btn lomo-btn--otros" data-s="__otros" aria-pressed="false" title="Libros que no son de Libros del Rincón"><span>Otros</span></button>';
    fs.insertAdjacentHTML("afterend", '<p class="lomos-filtro__nombres" id="nombresSerie">Toca un lomo para elegir la serie.</p>');
    fs.addEventListener("click", function (e) {
      var b = e.target.closest(".lomo-btn"); if (!b) return;
      var s = b.dataset.s; F.series[s] = !F.series[s]; if (!F.series[s]) delete F.series[s];
      b.setAttribute("aria-pressed", String(!!F.series[s]));
      var sel = Object.keys(F.series).map(function (x) { return x === "__otros" ? "Otros acervos" : x + " (" + SERIE[x].edad + ")"; });
      $("#nombresSerie").textContent = sel.length ? sel.join(", ") : "Toca un lomo para elegir la serie.";
      buscar(true);
    });

    $("#filtroGenero").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      F.genero = b.dataset.v; $$("#filtroGenero button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      buscar(true);
    });

    var cats = {};
    ACERVO.forEach(function (b) { if (!cats[b.k]) cats[b.k] = b.c; });
    $("#filtroColor").innerHTML = COLORES.map(function (c) {
      return '<button type="button" class="color-btn" data-v="' + c[0] + '" aria-pressed="false" style="--k:' + c[1] + ';--kt:' + c[2] +
        '" title="' + esc(c[0] + ": " + (cats[c[0]] || "")) + '" aria-label="' + esc("Etiqueta " + c[0] + ", " + (cats[c[0]] || "")) + '"></button>';
    }).join("");
    $("#filtroColor").addEventListener("click", function (e) {
      var b = e.target.closest(".color-btn"); if (!b) return;
      F.color = F.color === b.dataset.v ? "" : b.dataset.v;
      $$(".color-btn").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.v === F.color)); });
      buscar(true);
    });

    var orig = {}; ACERVO.forEach(function (b) { orig[b.p] = (orig[b.p] || 0) + 1; });
    $("#filtroOrigen").innerHTML = '<option value="">Todas</option>' + Object.keys(orig).sort().map(function (o) {
      return '<option value="' + esc(o) + '">' + esc(o) + " (" + orig[o] + ")</option>";
    }).join("");
    $("#filtroOrigen").addEventListener("change", function () { F.origen = this.value; buscar(true); });
    $("#soloDisponibles").addEventListener("change", function () { F.disp = this.checked; buscar(true); });
    $("#soloResena").addEventListener("change", function () { F.resena = this.checked; buscar(true); });
    $("#incluirDocentes").addEventListener("change", function () { F.docentes = this.checked; buscar(true); });
    $("#orden").addEventListener("change", function () { F.orden = this.value; buscar(true); });

    var t;
    $("#q").addEventListener("input", function () {
      clearTimeout(t); var v = this.value; t = setTimeout(function () { F.q = v; buscar(true); }, 160);
    });
    $("#buscador").addEventListener("submit", function (e) {
      e.preventDefault(); F.q = $("#q").value; buscar(true);
      var id = normalizarId(F.q); if (id && POR_ID[id]) abrirFicha(id);
    });
    $("#limpiarFiltros").addEventListener("click", limpiarFiltros);
    $("#btnMas").addEventListener("click", function () { pagina++; pintarResultados(); });
    $("#btnFiltrosMovil").addEventListener("click", function () {
      var a = $("#filtros").classList.toggle("abierto"); this.setAttribute("aria-expanded", String(a));
    });
  }
  function limpiarFiltros() {
    F.series = {}; F.genero = ""; F.color = ""; F.origen = ""; F.disp = F.resena = F.docentes = false;
    $$(".lomo-btn").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    $$("#filtroGenero button").forEach(function (x, i) { x.setAttribute("aria-pressed", String(i === 0)); });
    $$(".color-btn").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
    $("#filtroOrigen").value = ""; $("#soloDisponibles").checked = $("#soloResena").checked = $("#incluirDocentes").checked = false;
    $("#nombresSerie").textContent = "Toca un lomo para elegir la serie.";
    buscar(true);
  }

  function buscar(reiniciar) {
    if (reiniciar) pagina = 1;
    var q = norm(F.q).trim(), toks = q.split(/\s+/).filter(Boolean);
    var idExacto = normalizarId(F.q);
    var hayFiltroSerie = Object.keys(F.series).length > 0;
    var r = ACERVO.filter(function (b) {
      if (idExacto) return b.id === idExacto;
      if (!F.docentes && !para(b)) return false;
      if (hayFiltroSerie && !(F.series[b.s] || (!b.s && F.series.__otros))) return false;
      if (F.genero && b.g !== F.genero) return false;
      if (F.color && b.k !== F.color) return false;
      if (F.origen && b.p !== F.origen) return false;
      if (F.resena && !b.r) return false;
      if (F.disp && disponibles(b) === 0) return false;
      for (var i = 0; i < toks.length; i++) if (b._x.indexOf(toks[i]) < 0) return false;
      return true;
    });
    var ord = F.orden;
    if (ord === "relevancia" && q) {
      r.forEach(function (b) {
        var s = 0; if (b._t.indexOf(q) === 0) s += 100; else if (b._t.indexOf(q) > 0) s += 50;
        toks.forEach(function (t) { if (b._t.indexOf(t) >= 0) s += 10; if (b._a.indexOf(t) >= 0) s += 6; });
        if (b.img) s += 1; b._s = s;
      });
      r.sort(function (a, b) { return b._s - a._s || a._n - b._n; });
    } else if (ord === "titulo") r.sort(function (a, b) { return a._t.localeCompare(b._t, "es"); });
    else if (ord === "autor") r.sort(function (a, b) { return (a._a || "zzz").localeCompare(b._a || "zzz", "es"); });
    else if (ord === "anio") r.sort(function (a, b) { return (parseInt(b.y) || 0) - (parseInt(a.y) || 0); });
    else if (ord === "relevancia") {
      // Sin búsqueda: primero lo que tiene portada y reseña, con una mezcla estable por día.
      var dia = hoyISO();
      r.sort(function (a, b) {
        var pa = (a.img ? 2 : 0) + (a.r ? 1 : 0), pb = (b.img ? 2 : 0) + (b.r ? 1 : 0);
        return pb - pa || hash(a.id + dia) - hash(b.id + dia);
      });
    } else r.sort(function (a, b) { return a._n - b._n; });
    ultimos = r; pintarResultados();
  }
  function pintarResultados() {
    var r = ultimos, n = Math.min(r.length, pagina * POR_PAGINA);
    $("#conteo").textContent = r.length === 0 ? "Sin resultados" : (r.length === 1 ? "1 título" : miles(r.length) + " títulos");
    if (!r.length) {
      $("#rejilla").innerHTML = '<div class="vacio"><h3>No encontramos ese libro</h3><p>Prueba con otra palabra, revisa la ortografía o quita algunos filtros.</p>' +
        '<button type="button" class="btn btn--borde" id="vacioLimpiar">Quitar filtros</button></div>';
      $("#vacioLimpiar").addEventListener("click", function () { $("#q").value = ""; F.q = ""; limpiarFiltros(); });
      $("#btnMas").hidden = true; return;
    }
    $("#rejilla").innerHTML = r.slice(0, n).map(tarjeta).join("");
    $("#btnMas").hidden = n >= r.length;
    if (n < r.length) $("#btnMas").textContent = "Mostrar más libros (" + miles(r.length - n) + " más)";
  }

  /* ---------------- Hero ---------------- */
  function hero() {
    var pub = ACERVO.filter(para), ej = pub.reduce(function (s, b) { return s + (b.q || 1); }, 0);
    $("#resumenAcervo").textContent = "En nuestra biblioteca viven " + miles(pub.length) + " títulos y " + miles(ej) +
      " ejemplares. Búscalo, ubícalo en el librero y prepara tu vale para llevártelo a casa.";
    var con = barajar(pub.filter(function (b) { return b.img && b.r; })).slice(0, 18);
    $("#estanteVivo").innerHTML = con.map(function (b) {
      var h = 78 + (hash(b.id) % 22);
      return '<button type="button" class="libro-pie" data-id="' + b.id + '" style="height:' + h + '%" title="' + esc(b.t) + '">' +
        '<img src="' + portada(b.id) + '" alt="' + esc(b.t) + '"></button>';
    }).join("");
    $("#btnSorpresa").addEventListener("click", function () {
      var c = pub.filter(function (b) { return b.img && b.r && disponibles(b) > 0; });
      abrirFicha(azar(c).id);
    });
  }

  /* ---------------- Ficha ---------------- */
  var ficha = $("#ficha"), fichaActual = null, vistaPrevia = "explorar";
  function abrirFicha(id) {
    var b = POR_ID[id]; if (!b) { aviso("No encontramos el libro " + id); return; }
    fichaActual = id;
    var e = estado(b), serie = SERIE[b.s];
    var k = colorDe(b.k), estK = "--k:" + k.fondo + ";--kt:" + k.texto;
    var chips = [];
    if (serie) chips.push('<li class="chip"><img src="' + lomo(serie.f) + '" alt="">' + esc(b.s) + ", " + serie.edad + "</li>");
    chips.push('<li class="chip chip--k" style="' + estK + '">Etiqueta ' + esc(b.k.toLowerCase()) + "</li>");
    if (b.g) chips.push('<li class="chip">' + esc(b.g) + "</li>");
    if (b.cs) chips.push('<li class="chip">' + esc(b.cs) + "</li>");
    if (b.m) chips.push('<li class="chip">' + esc(b.m) + "</li>");

    var mini = "";
    for (var en = 1; en <= 4; en++) for (var an = 1; an <= 7; an++) mini += "<i" + (an === b.an && en === b.en ? ' class="aqui"' : "") + "></i>";

    var datos = [
      ["ID de la etiqueta", b.id], ["Autor", b.a], ["Ilustración", b.il], ["Traducción o adaptación", b.tr],
      ["Editorial", b.e], ["Año", b.y], ["Edición", b.ed], ["Número o volumen", b.v], ["ISBN o ISSN", b.i],
      ["Categoría", b.c], ["Tema", b.tm], ["Procedencia", b.p], ["Ejemplares", b.q], ["Estado físico", b.f]
    ].filter(function (x) { return x[1] !== undefined && x[1] !== ""; });

    var enMochila = MOCHILA.indexOf(id) >= 0;
    var pregunta = azar(PLATICA[b.g] || PLATICA.Literario);

    $("#fichaContenido").innerHTML =
      '<button class="ficha__cerrar" type="button" aria-label="Cerrar ficha" data-cerrar>×</button>' +
      '<div><div class="ficha__portada">' +
      (b.img ? '<img src="' + portada(b.id) + '" alt="Portada de ' + esc(b.t) + '">' :
        '<div class="tapa tapa--sin" style="' + estK + '"><span>' + esc(b.t) + "</span></div>") +
      '</div><p class="ficha__aviso-portada">' + (b.img ? "Compara esta portada con el libro que tomes del estante." : "Este libro aún no tiene fotografía.") + "</p></div>" +
      '<div class="ficha__datos">' +
      '<h2 id="fichaTitulo">' + esc(b.t) + "</h2>" +
      '<p class="ficha__autor">' + esc(b.a || "Autor por confirmar") + (b.e ? ", " + esc(b.e) : "") + (b.y ? " (" + esc(b.y) + ")" : "") + "</p>" +
      '<ul class="chips">' + chips.join("") + "</ul>" +
      (b.r ? '<p class="ficha__resena">' + esc(b.r) + "</p>" :
        '<p class="ficha__resena ficha__resena--vacia">Todavía no tenemos la reseña de este libro. ¡Puedes ser la primera persona en contarnos de qué trata!</p>') +
      '<div class="ubica"><div class="miniestante" aria-hidden="true">' + mini + "</div>" +
      "<p><strong>" + ubicTexto(b) + "</strong><br>Busca la etiqueta " + esc(b.k.toLowerCase()) + " con el número " + esc(b.id) + "." +
      (ESTANTES[b.an + "-" + b.en] ? '<br><span class="nota">' + esc(ESTANTES[b.an + "-" + b.en]) + "</span>" : "") + "</p></div>" +
      '<p class="ficha__disp estado estado--' + e.c + '">' + esc(e.t) + (b.q > 1 ? " de " + b.q + " ejemplares" : "") + "</p>" +
      '<div class="ficha__acciones">' +
      '<button class="btn btn--primario" type="button" data-mochila="' + b.id + '">' + (enMochila ? "Quitar de mi mochila" : "Guardar en mi mochila") + "</button>" +
      '<button class="btn btn--borde" type="button" data-librero="' + b.id + '">Ubícalo en el librero</button>' +
      '<button class="btn btn--borde" type="button" data-compartir="' + b.id + '">Copiar enlace</button>' +
      "</div>" +
      '<div class="platica"><h3>Para platicar en casa</h3><p>' + esc(pregunta) + "</p></div>" +
      '<details class="datos-tecnicos"><summary>Ficha bibliográfica completa</summary><dl>' +
      datos.map(function (d) { return "<dt>" + esc(d[0]) + "</dt><dd>" + esc(d[1]) + "</dd>"; }).join("") + "</dl></details>" +
      "</div>";
    if (!ficha.open) ficha.showModal();
    ficha.scrollTop = 0;
    var h = "#libro=" + id;
    if (location.hash !== h) history.replaceState(null, "", h);
  }
  function cerrarFicha() { if (ficha.open) ficha.close(); }
  ficha.addEventListener("close", function () {
    fichaActual = null;
    if (/^#libro=/.test(location.hash)) history.replaceState(null, "", "#" + vistaPrevia);
  });
  ficha.addEventListener("click", function (e) {
    if (e.target === ficha || e.target.closest("[data-cerrar]")) { cerrarFicha(); return; }
    var m = e.target.closest("[data-mochila]");
    if (m) { alternarMochila(m.dataset.mochila); m.textContent = MOCHILA.indexOf(m.dataset.mochila) >= 0 ? "Quitar de mi mochila" : "Guardar en mi mochila"; return; }
    var l = e.target.closest("[data-librero]");
    if (l) { var id = l.dataset.librero; cerrarFicha(); irA("librero"); resaltarEnLibrero(id); return; }
    var c = e.target.closest("[data-compartir]");
    if (c) {
      var url = location.href.split("#")[0] + "#libro=" + c.dataset.compartir;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { aviso("Enlace copiado"); }, function () { prompt("Copia este enlace:", url); });
    }
  });

  /* ---------------- El librero ---------------- */
  var libreroListo = false;
  function montarLibrero() {
    if (libreroListo) return; libreroListo = true;
    var html = "";
    for (var an = 1; an <= 7; an++) {
      html += '<div class="anaquel" id="anaquel-' + an + '"><h2>Anaquel ' + an + "</h2>";
      for (var en = 1; en <= 4; en++) {
        var libros = ACERVO.filter(function (b) { return b.an === an && b.en === en; });
        var ej = libros.reduce(function (s, b) { return s + (b.q || 1); }, 0);
        html += '<button type="button" class="entrepano" data-ae="' + an + "-" + en + '" aria-expanded="false" aria-label="Anaquel ' + an + ", entrepaño " + en + ": " +
          esc(ESTANTES[an + "-" + en] || "") + ", " + libros.length + ' títulos">' +
          '<span class="entrepano__hueco">' + libros.map(function (b) {
            var c = colorDe(b.k), h = 58 + (hash(b.id) % 40);
            return '<span class="lomito" data-l="' + b.id + '" style="--k:' + c.fondo + ";height:" + h + '%"></span>';
          }).join("") + '</span><span class="entrepano__tabla"></span>' +
          '<span class="entrepano__num">Entrepaño ' + en + ", " + ej + " ej.</span></button>";
      }
      html += "</div>";
    }
    $("#libreroEstantes").innerHTML = html;
    $("#libreroEstantes").addEventListener("click", function (e) {
      var b = e.target.closest(".entrepano"); if (!b) return;
      abrirEntrepano(b.dataset.ae, true);
    });
    var cats = {}; ACERVO.forEach(function (b) { if (!cats[b.k]) cats[b.k] = b.c; });
    $("#leyendaColores").innerHTML = COLORES.map(function (c) {
      return '<span><i style="--k:' + c[1] + '"></i>' + esc(c[0]) + ": " + esc(cats[c[0]] || "") + "</span>";
    }).join("");
  }
  function abrirEntrepano(ae, desplazar) {
    var p = ae.split("-"), an = +p[0], en = +p[1];
    $$(".entrepano").forEach(function (x) { x.setAttribute("aria-expanded", String(x.dataset.ae === ae)); });
    var libros = ACERVO.filter(function (b) { return b.an === an && b.en === en; });
    var d = $("#entrepanoDetalle"); d.hidden = false;
    d.innerHTML = '<div class="entrepano-detalle__cab"><h2>Anaquel ' + an + ", entrepaño " + en + "</h2><p>" + esc(ESTANTES[ae] || "") +
      ". " + libros.length + " títulos, en el orden en que están en el estante.</p></div>" +
      '<div class="rejilla">' + libros.map(tarjeta).join("") + "</div>";
    if (desplazar) d.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resaltarEnLibrero(id) {
    var b = POR_ID[id]; if (!b) return;
    montarLibrero();
    $$(".lomito.brilla").forEach(function (x) { x.classList.remove("brilla"); });
    var l = $('.lomito[data-l="' + id + '"]'); if (l) l.classList.add("brilla");
    abrirEntrepano(b.an + "-" + b.en, false);
    setTimeout(function () { $("#anaquel-" + b.an).scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
    aviso(b.t + ": " + ubicTexto(b));
  }

  /* ---------------- ¿Qué leo hoy? ---------------- */
  var GRADOS = [
    { v: "1", t: "1°", s: ["Al sol solito", "Pasos de luna"] }, { v: "2", t: "2°", s: ["Pasos de luna"] },
    { v: "3", t: "3°", s: ["Pasos de luna", "Astrolabio"] }, { v: "4", t: "4°", s: ["Astrolabio"] },
    { v: "5", t: "5°", s: ["Astrolabio", "Espejo de Urania"] }, { v: "6", t: "6°", s: ["Astrolabio", "Espejo de Urania"] },
    { v: "f", t: "Leemos en familia", s: ["Al sol solito", "Pasos de luna", "Astrolabio", "Espejo de Urania"] }
  ];
  var ANTOJOS = [
    { t: "Vivir una aventura", d: "Viajes, retos y mundos lejanos", cs: ["Cuentos de aventuras", "Narrativa de ciencia ficción"] },
    { t: "Reírme mucho", d: "Historias con humor", cs: ["Cuentos de humor"] },
    { t: "Un poco de misterio", d: "Enigmas, sustos y detectives", cs: ["Cuentos de misterio", "Narrativa policiaca"] },
    { t: "Mitos y leyendas", d: "Relatos de pueblos y culturas", cs: ["Mitos y Leyendas"] },
    { t: "Historias como la mía", d: "Familia, amigos y la vida diaria", cs: ["Cuentos de vida cotidiana", "Narrativa contemporánea (universal / latinoamericana / mexicana)", "Diarios", "Crónicas y reportajes"] },
    { t: "Cuentos clásicos", d: "Obras que han leído muchas generaciones", cs: ["Narrativa histórica y clásica"] },
    { t: "Animales, plantas y mi cuerpo", d: "Naturaleza, salud y cuidado del planeta", cs: ["Biodiversidad", "Ecología", "Ecosistemas", "Anatomía", "Fisiología", "Salud", "Sostenibilidad"] },
    { t: "El planeta y el espacio", d: "Estrellas, regiones y fenómenos", cs: ["Astronomía", "Regiones", "Clima", "Geoformas", "Fenómenos naturales"] },
    { t: "Cómo funcionan las cosas", d: "Inventos, máquinas y experimentos", cs: ["Innovación", "Procesos tecnológicos", "Máquinas simples", "Experimentos", "Fenómenos físicos", "Propiedades de la materia", "Reacciones químicas", "Energía", "Diseño"] },
    { t: "Números y retos", d: "Acertijos, juegos y matemáticas", cs: ["Numeración", "Geometría", "Medida", "Operaciones", "Resolución de problemas", "Acertijos", "Pasatiempos", "Juegos de mesa", "Aprender jugando", "Dinámicas"] },
    { t: "Personas y pueblos", d: "Biografías, historia y tradiciones", cs: ["Biografías", "Civilizaciones", "Identidad cultural", "Costumbres", "Tradiciones", "Convivencia"] },
    { t: "Poemas, rimas y adivinanzas", d: "Palabras que suenan bonito", cs: ["Poesía de autor", "Poesía", "Poesía popular", "Adivinanzas y juegos de palabras", "Rimas", "Canciones"] },
    { t: "Arte, música y teatro", d: "Crear, actuar y expresarse", cs: ["Plástica", "Música", "Danza", "Expresión creativa", "Oficios tradicionales", "Teatro", "Representaciones con títeres y marionetas"] }
  ];
  var QL = { g: null, a: null };
  var MAT_PEQUES = { "Álbum ilustrado": 1, "Cuento": 1, "Poesía": 1, "Libro informativo": 1, "Cómic o novela gráfica": 1 };
  function montarQueLeo() {
    $("#opGrado").innerHTML = GRADOS.map(function (g, i) {
      var s = SERIE[g.s[0]];
      return '<button type="button" class="opcion" data-i="' + i + '" aria-pressed="false">' +
        (g.v !== "f" ? '<img src="' + lomo(s.f) + '" alt="">' : "") + "<span>" + g.t + (g.v !== "f" ? "<small>" + esc(g.s.join(" y ")) + "</small>" : "<small>Para todas las edades</small>") + "</span></button>";
    }).join("");
    $("#opAntojo").innerHTML = ANTOJOS.map(function (a, i) {
      return '<button type="button" class="opcion" data-i="' + i + '" aria-pressed="false"><span>' + esc(a.t) + "<small>" + esc(a.d) + "</small></span></button>";
    }).join("");
    $("#opGrado").addEventListener("click", function (e) {
      var b = e.target.closest(".opcion"); if (!b) return; QL.g = GRADOS[+b.dataset.i];
      $$("#opGrado .opcion").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); proponer();
    });
    $("#opAntojo").addEventListener("click", function (e) {
      var b = e.target.closest(".opcion"); if (!b) return; QL.a = ANTOJOS[+b.dataset.i];
      $$("#opAntojo .opcion").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); proponer();
    });
  }
  function apto(b, g) {
    // Libros fuera del Rincón: solo formatos infantiles; las novelas sin serie se dejan a criterio de un adulto.
    if (g.v === "f") return MAT_PEQUES[b.m] || b.m === "Novela" || b.m === "Antología" || b.m === "Teatro";
    if (g.v === "1" || g.v === "2" || g.v === "3") return !!MAT_PEQUES[b.m];
    return !!MAT_PEQUES[b.m] || b.m === "Teatro";
  }
  function proponer() {
    var box = $("#propuesta");
    if (!QL.g || !QL.a) { box.innerHTML = ""; return; }
    var base = ACERVO.filter(function (b) { return b.ti === "Libro" && QL.a.cs.indexOf(b.cs) >= 0 && disponibles(b) > 0; });
    // Nivel 1: Libros del Rincón de la serie del grado. Nivel 2: otros libros aptos. Nivel 3: el resto.
    var n1 = base.filter(function (b) { return b.s && QL.g.s.indexOf(b.s) >= 0; });
    var n2 = base.filter(function (b) { return !b.s && apto(b, QL.g); });
    var n3 = base.filter(function (b) { return n1.indexOf(b) < 0 && n2.indexOf(b) < 0; });
    var relajado = n1.length + n2.length < 3;
    function mezcla(l) { return barajar(l).sort(function (x, y) { return ((y.img ? 2 : 0) + (y.r ? 1 : 0)) - ((x.img ? 2 : 0) + (x.r ? 1 : 0)); }); }
    var orden = mezcla(n1).concat(mezcla(n2), relajado ? mezcla(n3) : []);
    var vistos = {}, elegidos = [];
    for (var i = 0; i < orden.length && elegidos.length < 3; i++) { if (!vistos[orden[i]._t]) { vistos[orden[i]._t] = 1; elegidos.push(orden[i]); } }
    if (!elegidos.length) {
      box.innerHTML = '<div class="vacio"><h3>Por ahora no hay libros disponibles con ese antojo</h3><p>Prueba con otra opción o pregunta al Promotor de Lectura.</p></div>';
      return;
    }
    box.innerHTML = '<div class="propuesta__cab"><h2>Te proponemos</h2>' +
      '<button type="button" class="btn btn--borde" id="otraRonda">Otros tres</button></div>' +
      (relajado ? '<p class="nota">No encontramos tres libros de tu serie con ese antojo, así que te mostramos opciones para otras edades. Pide ayuda a un adulto para elegir.</p>' : "") +
      '<div class="trio">' + elegidos.map(function (b) {
        var e = estado(b);
        return '<article class="sugerida">' + '<button type="button" class="libro" data-id="' + b.id + '" aria-label="Ver ficha de ' + esc(b.t) + '">' + tapa(b, true) + "</button>" +
          "<h3>" + esc(b.t) + "</h3><p>" + esc(b.a || "") + "</p>" +
          (b.r ? "<p>" + esc(b.r.length > 170 ? b.r.slice(0, 167).replace(/\s+\S*$/, "") + "…" : b.r) + "</p>" : "") +
          '<p class="estado estado--' + e.c + '">' + esc(e.t) + ". " + ubicTexto(b) + "</p>" +
          '<div class="botones"><button type="button" class="btn btn--primario btn--chico" data-guardar="' + b.id + '">' +
          (MOCHILA.indexOf(b.id) >= 0 ? "Ya está en tu mochila" : "Guardar en mi mochila") + "</button></div></article>";
      }).join("") + "</div>";
    $("#otraRonda").addEventListener("click", proponer);
  }
  $("#propuesta").addEventListener("click", function (e) {
    var g = e.target.closest("[data-guardar]"); if (!g) return;
    if (MOCHILA.indexOf(g.dataset.guardar) < 0) alternarMochila(g.dataset.guardar);
    g.textContent = "Ya está en tu mochila";
  });

  /* ---------------- Mi mochila y vale ---------------- */
  var MOCHILA = leer("bv.mochila", []).filter(function (id) { return POR_ID[id]; });
  function alternarMochila(id) {
    var i = MOCHILA.indexOf(id);
    if (i >= 0) { MOCHILA.splice(i, 1); aviso("Quitado de tu mochila"); }
    else { MOCHILA.push(id); aviso("Guardado en tu mochila"); }
    guardar("bv.mochila", MOCHILA); contadorMochila(); if (vistaActual === "mochila") pintarMochila();
  }
  function contadorMochila() { var c = $("#contadorMochila"); c.hidden = !MOCHILA.length; c.textContent = MOCHILA.length; }
  function pintarMochila() {
    var l = $("#mochilaLista");
    if (!MOCHILA.length) {
      l.innerHTML = '<div class="vacio"><h3>Tu mochila está vacía</h3><p>Abre la ficha de un libro y toca «Guardar en mi mochila».</p>' +
        '<a class="btn btn--primario" href="#explorar">Explorar el acervo</a></div>';
    } else {
      l.innerHTML = MOCHILA.map(function (id) {
        var b = POR_ID[id], e = estado(b);
        return '<div class="renglon"><button type="button" class="libro" data-id="' + id + '" aria-label="Ver ficha">' + tapa(b, false) + "</button>" +
          "<div><h3>" + esc(b.t) + "</h3><p>" + esc(b.a || "") + "</p><p>" + ubicTexto(b) + ", etiqueta " + esc(b.k.toLowerCase()) + " " + esc(b.id) + "</p>" +
          '<p class="estado estado--' + e.c + '">' + esc(e.t) + "</p></div>" +
          '<button type="button" class="btn btn--chico btn--peligro" data-quitar="' + id + '">Quitar</button></div>';
      }).join("");
    }
    $("#valeLimite").textContent = "Puedes llevar hasta " + CFG.librosPorVale + (CFG.librosPorVale === 1 ? " libro" : " libros") +
      " por vale y regresarlos en " + CFG.diasPrestamo + " días.";
  }
  $("#mochilaLista").addEventListener("click", function (e) {
    var q = e.target.closest("[data-quitar]"); if (q) alternarMochila(q.dataset.quitar);
  });
  $("#formVale").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!MOCHILA.length) { aviso("Primero guarda algún libro en tu mochila."); return; }
    if (MOCHILA.length > CFG.librosPorVale) { aviso("Tu vale puede llevar hasta " + CFG.librosPorVale + " libros. Quita alguno de tu mochila."); return; }
    var nombre = $("#valeNombre").value.trim(), grupo = $("#valeGrupo").value;
    guardar("bv.valeDatos", { nombre: nombre, grupo: grupo });
    crearVale(MOCHILA.slice(), nombre, grupo);
  });
  function qrSvg(texto) {
    try {
      var q = window.qrcode(0, "M"); window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];
      q.addData(texto, "Byte"); q.make(); return q.createSvgTag(4, 8);
    } catch (e) { return ""; }
  }
  function crearVale(ids, nombre, grupo) {
    var folio = "V" + Date.now().toString(36).toUpperCase().slice(-6);
    var hoy = hoyISO(), vence = sumarDias(hoy, CFG.diasPrestamo);
    var carga = ["BV1", ids.join(","), nombre.replace(/\|/g, " "), grupo, folio].join("|");
    $("#valeZona").innerHTML = '<div class="vale"><div class="vale__tarjeta">' +
      '<div class="vale__cab"><div><h2>Vale de préstamo</h2><p class="nota">Biblioteca Viva, ' + esc(CFG.escuela) + "</p></div>" +
      '<p class="vale__folio">Folio ' + folio + "<br>" + esc(fechaLarga(hoy)) + "</p></div>" +
      '<div class="vale__cuerpo"><div>' +
      '<p class="vale__quien"><strong>' + esc(nombre) + "</strong>, " + esc(grupo) + "</p>" +
      ids.map(function (id) {
        var b = POR_ID[id];
        return '<div class="vale__libro">' + tapa(b, false) + "<div><h3>" + esc(b.t) + "</h3><p>" + esc(b.a || "") + "</p><p><strong>" +
          ubicTexto(b) + "</strong>, etiqueta " + esc(b.k.toLowerCase()) + " " + esc(b.id) + "</p></div></div>";
      }).join("") +
      '<ol class="vale__pasos"><li>Busca tus libros en el librero y compara la portada.</li><li>Muestra este vale al Promotor de Lectura para registrar la salida.</li>' +
      "<li>Regrésalos a más tardar el " + esc(fechaLarga(vence)) + ". ¡Lee 20 minutos cada día!</li></ol></div>" +
      '<div class="vale__qr">' + qrSvg(carga) + "<span>Código para el mostrador</span></div></div>" +
      '<span class="vale__sello" aria-hidden="true">Biblioteca Viva</span></div>' +
      '<div class="vale__acciones"><button type="button" class="btn btn--primario" id="imprimirVale">Imprimir o guardar en PDF</button>' +
      '<button type="button" class="btn btn--borde" id="vaciarMochila">Vaciar mi mochila</button></div></div>';
    $("#imprimirVale").addEventListener("click", function () { window.print(); });
    $("#vaciarMochila").addEventListener("click", function () { MOCHILA = []; guardar("bv.mochila", MOCHILA); contadorMochila(); pintarMochila(); aviso("Mochila vacía"); });
    $("#valeZona").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------- Escáner con cámara ---------------- */
  var camaraOK = "BarcodeDetector" in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  var escaner = $("#escaner"), flujo = null, detectando = false;
  function escanear(alLeer) {
    if (!camaraOK) return;
    var det;
    try { det = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "itf", "codabar"] }); }
    catch (e) { det = new window.BarcodeDetector(); }
    escaner.showModal();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (s) {
      flujo = s; var v = $("#video"); v.srcObject = s; v.play(); detectando = true;
      (function ciclo() {
        if (!detectando) return;
        det.detect(v).then(function (r) {
          if (r && r.length) { var val = r[0].rawValue; cerrarEscaner(); alLeer(val); }
          else setTimeout(ciclo, 220);
        }).catch(function () { setTimeout(ciclo, 400); });
      })();
    }).catch(function () { cerrarEscaner(); aviso("No se pudo usar la cámara. Revisa los permisos del navegador."); });
  }
  function cerrarEscaner() {
    detectando = false;
    if (flujo) { flujo.getTracks().forEach(function (t) { t.stop(); }); flujo = null; }
    if (escaner.open) escaner.close();
  }
  $("#cerrarEscaner").addEventListener("click", cerrarEscaner);
  escaner.addEventListener("cancel", cerrarEscaner);
  if (camaraOK) {
    $("#btnEscanearPublico").hidden = false;
    $("#btnEscanearPublico").addEventListener("click", function () {
      escanear(function (v) {
        var id = normalizarId(v) || (v.indexOf("libro=") >= 0 ? v.split("libro=")[1] : null);
        if (id && POR_ID[id]) abrirFicha(id); else aviso("No reconocimos esa etiqueta.");
      });
    });
  }

  /* ---------------- Servidor opcional (Apps Script) ---------------- */
  var EP = (CFG.endpointPrestamos || "").trim();
  function token() { return leer("bv.token", ""); }
  function apiGet(params) {
    var qs = Object.keys(params).map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(EP + (EP.indexOf("?") >= 0 ? "&" : "?") + qs).then(function (r) { return r.json(); });
  }
  function apiPost(body) {
    body.token = token();
    return fetch(EP, { method: "POST", body: JSON.stringify(body) }).then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || "Error del servidor"); return j; });
  }
  function cargarDisponibilidad() {
    if (!EP) return;
    apiGet({ accion: "disponibilidad" }).then(function (j) {
      if (j && j.ok) { REMOTO = j.prestados || {}; refrescarTodo(); }
    }).catch(function () { /* sin conexión: se usan los datos locales */ });
  }

  /* ---------------- Mostrador del Promotor ---------------- */
  var cola = [], datosVale = null;
  function guardarPrestamos() { guardar("bv.prestamos", PRESTAMOS); actualizarContadores(); }
  function actualizarContadores() {
    $("#cActivos").textContent = activos().length;
    $("#cVencidos").textContent = activos().filter(vencido).length;
  }
  function montarMostrador() {
    $("#puerta").addEventListener("submit", function (e) {
      e.preventDefault();
      if ($("#clave").value === CFG.claveMostrador) {
        var tk = $("#tokenSrv"); if (tk && tk.value.trim()) guardar("bv.token", tk.value.trim());
        sessionStorage.setItem("bv.mostrador", "1"); $("#puertaMsg").textContent = ""; entrarMostrador();
      } else $("#puertaMsg").textContent = "Esa clave no es correcta.";
    });
    if (EP) {
      $("#puerta").insertAdjacentHTML("afterbegin", '<label>Token del servidor (solo la primera vez) <input type="password" id="tokenSrv" value="' + esc(token()) + '"></label>');
    }
    $$(".pestanas button").forEach(function (b) { b.addEventListener("click", function () { pestana(b.dataset.p); }); });
    $("#captura").addEventListener("submit", function (e) { e.preventDefault(); atender($("#capturaId").value); });
    if (camaraOK) {
      $("#btnCamaraMostrador").hidden = false;
      $("#btnCamaraMostrador").addEventListener("click", function () { escanear(function (v) { $("#capturaId").value = v; atender(v); }); });
    }
    $("#atencion").addEventListener("submit", function (e) {
      if (!e.target.matches(".form-prestamo")) return;
      e.preventDefault(); registrarPrestamo(e.target);
    });
    $("#panelMostrador").addEventListener("click", function (e) {
      var d = e.target.closest("[data-devolver]"); if (d) { devolver(d.dataset.devolver); return; }
      var s = e.target.closest("[data-saltar]"); if (s) { siguienteDeCola(); }
    });
    $("#expCsv").addEventListener("click", exportarCsv);
    $("#expJson").addEventListener("click", function () {
      descargar("respaldo-prestamos-" + hoyISO() + ".json", JSON.stringify({ version: 1, generado: new Date().toISOString(), prestamos: PRESTAMOS }, null, 1), "application/json");
    });
    $("#impJson").addEventListener("change", importarJson);
    $("#btnSalir").addEventListener("click", function () { sessionStorage.removeItem("bv.mostrador"); location.hash = "#explorar"; aviso("Mostrador cerrado"); });
    if (EP) { $("#btnSync").hidden = false; $("#btnSync").addEventListener("click", sincronizar); }
  }
  function entrarMostrador() {
    $("#puerta").hidden = true; $("#panelMostrador").hidden = false;
    actualizarContadores(); pestana("atender");
    $("#estadoSync").textContent = EP ? "Conectado a Google Sheets. Los préstamos se guardan en la hoja y también en este equipo." :
      "Los préstamos se guardan solo en este navegador. Descarga un respaldo cada semana.";
    if (EP) sincronizar();
    setTimeout(function () { $("#capturaId").focus(); }, 50);
  }
  function pestana(p) {
    $$(".pestanas button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.p === p)); });
    $$(".panel-m").forEach(function (x) { x.hidden = x.dataset.p !== p; });
    if (p === "activos") tabla("#tablaActivos", activos().sort(function (a, b) { return a.vence < b.vence ? -1 : 1; }), true);
    if (p === "vencidos") tabla("#tablaVencidos", activos().filter(vencido).sort(function (a, b) { return a.vence < b.vence ? -1 : 1; }), true);
    if (p === "historial") tabla("#tablaHistorial", PRESTAMOS.slice().sort(function (a, b) { return a.salida < b.salida ? 1 : -1; }).slice(0, 400), false);
    if (p === "numeros") numeros();
    if (p === "atender") setTimeout(function () { $("#capturaId").focus(); }, 30);
  }
  function atender(texto) {
    texto = String(texto || "").trim(); if (!texto) return;
    if (/^BV1\|/.test(texto)) {
      var p = texto.split("|");
      cola = (p[1] || "").split(",").filter(function (id) { return POR_ID[id]; });
      datosVale = { nombre: p[2] || "", grupo: p[3] || "", folio: p[4] || "" };
      aviso("Vale " + datosVale.folio + ": " + cola.length + (cola.length === 1 ? " libro" : " libros"));
      siguienteDeCola(); return;
    }
    var id = normalizarId(texto);
    if (!id || !POR_ID[id]) { $("#atencion").innerHTML = '<div class="vacio"><h3>No encontramos «' + esc(texto) + '»</h3><p>Revisa el ID de la etiqueta. Debe verse como BV-0123.</p></div>'; return; }
    cola = []; datosVale = null; verificar(id);
  }
  function siguienteDeCola() {
    if (!cola.length) { $("#atencion").innerHTML = '<div class="vacio"><h3>Vale atendido</h3><p>Escanea el siguiente libro o vale.</p></div>'; datosVale = null; $("#capturaId").value = ""; $("#capturaId").focus(); return; }
    verificar(cola.shift());
  }
  function verificar(id) {
    var b = POR_ID[id], suyos = PRESTAMOS.filter(function (p) { return p.id === id && !p.devuelto; });
    var d = disponibles(b), aula = enAula(b);
    var ult = leer("bv.ultimoGrupo", CFG.grupos[0] || "");
    var nom = datosVale ? datosVale.nombre : "", gru = datosVale ? datosVale.grupo : ult;
    $("#atencion").innerHTML = '<div class="verifica">' + tapa(b, true) + "<div>" +
      "<h2>" + esc(b.t) + "</h2><p>" + esc(b.a || "") + "</p>" +
      "<p><strong>" + ubicTexto(b) + "</strong>, etiqueta " + esc(b.k.toLowerCase()) + " " + esc(b.id) + "</p>" +
      '<p class="nota">' + (b.q || 1) + " en total" + (aula ? ", " + aula + " en la biblioteca de aula de " + esc(gruposAula(b)) : "") +
      ", " + prestados(id) + " prestado" + (prestados(id) === 1 ? "" : "s") + ". Quedan " + d + " en la biblioteca.</p>" +
      (suyos.length ? "<h3>Préstamos abiertos de este libro</h3><ul>" + suyos.map(function (p) {
        return "<li>" + esc(p.nombre) + " (" + esc(p.grupo) + "), vence el " + fechaCorta(p.vence) +
          ' <button type="button" class="btn btn--chico btn--primario" data-devolver="' + p.folio + '">Recibir devolución</button></li>';
      }).join("") + "</ul>" : "") +
      '<p class="verifica__pregunta">¿La portada coincide con el libro que tienes en la mano?</p>' +
      (d === 0 ? '<p class="estado estado--no">Según el registro no quedan ejemplares en la biblioteca. Si el libro está en tu mano, puedes prestarlo de todos modos y revisar el registro después.</p>' : "") +
      '<form class="form-prestamo" data-id="' + id + '">' +
      '<label>Nombre <input name="nombre" required maxlength="60" value="' + esc(nom) + '"></label>' +
      '<label>Grupo <select name="grupo">' + CFG.grupos.map(function (g) { return "<option" + (g === gru ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("") + "</select></label>" +
      '<label>Días <input name="dias" type="number" min="1" max="60" value="' + CFG.diasPrestamo + '"></label>' +
      '<button class="btn btn--primario" type="submit">Sí, registrar préstamo</button></form>' +
      (cola.length || datosVale ? '<div class="cola">' + (cola.length ? (cola.length === 1 ? "Falta 1 libro" : "Faltan " + cola.length + " libros") + " de este vale. " : "") +
        '<button type="button" class="enlace" data-saltar>Omitir este libro</button></div>' : "") +
      "</div></div>";
    var n = $(".form-prestamo [name=nombre]"); if (!nom) n.focus(); else $(".form-prestamo button").focus();
  }
  function registrarPrestamo(f) {
    var id = f.dataset.id, b = POR_ID[id], hoy = hoyISO();
    var p = {
      folio: "P" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 36).toString(36).toUpperCase(),
      id: id, t: b.t, nombre: f.nombre.value.trim(), grupo: f.grupo.value, salida: hoy,
      vence: sumarDias(hoy, Math.max(1, parseInt(f.dias.value, 10) || CFG.diasPrestamo)), devuelto: null
    };
    if (datosVale && datosVale.folio) p.vale = datosVale.folio;
    guardar("bv.ultimoGrupo", p.grupo);
    PRESTAMOS.push(p); guardarPrestamos();
    if (EP) apiPost({ accion: "prestar", prestamo: Object.assign({}, p) }).catch(function () { p.pend = true; guardarPrestamos(); aviso("Guardado en el equipo. Se enviará a la hoja al sincronizar."); });
    aviso("Préstamo registrado: " + b.t + ", regresa el " + fechaCorta(p.vence));
    refrescarTodo();
    if (cola.length) siguienteDeCola();
    else { $("#atencion").innerHTML = ""; $("#capturaId").value = ""; $("#capturaId").focus(); datosVale = null; }
  }
  function devolver(folio) {
    var p = PRESTAMOS.filter(function (x) { return x.folio === folio; })[0]; if (!p) return;
    p.devuelto = hoyISO(); guardarPrestamos();
    if (EP) apiPost({ accion: "devolver", folio: folio, fecha: p.devuelto }).catch(function () { p.pend = true; guardarPrestamos(); });
    aviso("Devolución recibida: " + p.t);
    refrescarTodo();
    var sel = $(".pestanas button[aria-selected=true]").dataset.p;
    if (sel === "atender") { $("#atencion").innerHTML = ""; $("#capturaId").value = ""; $("#capturaId").focus(); } else pestana(sel);
  }
  function tabla(sel, filas, conBoton) {
    if (!filas.length) { $(sel).innerHTML = '<div class="vacio"><h3>No hay registros aquí</h3></div>'; return; }
    var hoy = hoyISO();
    $(sel).innerHTML = '<div class="tabla-envoltura"><table><thead><tr><th></th><th>ID</th><th>Título</th><th>Nombre</th><th>Grupo</th><th>Salida</th><th>Vence</th><th>Estado</th>' +
      (conBoton ? "<th></th>" : "") + "</tr></thead><tbody>" + filas.map(function (p) {
        var b = POR_ID[p.id] || { t: p.t }, v = vencido(p);
        return '<tr class="' + (v ? "vencido" : "") + '"><td>' + (b.img ? '<img src="' + portada(p.id) + '" alt="">' : "") + "</td><td>" + esc(p.id) + "</td><td>" + esc(b.t || p.t) +
          "</td><td>" + esc(p.nombre) + "</td><td>" + esc(p.grupo) + "</td><td>" + fechaCorta(p.salida) + "</td><td>" + fechaCorta(p.vence) + "</td><td>" +
          (p.devuelto ? "Devuelto el " + fechaCorta(p.devuelto) : v ? "Vencido hace " + Math.round((new Date(hoy) - new Date(p.vence)) / 864e5) + " días" : "En casa") +
          (p.pend ? " (por sincronizar)" : "") + "</td>" +
          (conBoton ? '<td><button type="button" class="btn btn--chico btn--primario" data-devolver="' + p.folio + '">Devolver</button></td>' : "") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function numeros() {
    var tot = PRESTAMOS.length, act = activos().length, ven = activos().filter(vencido).length;
    var porTit = {}, porGru = {};
    PRESTAMOS.forEach(function (p) { porTit[p.id] = (porTit[p.id] || 0) + 1; porGru[p.grupo] = (porGru[p.grupo] || 0) + 1; });
    var top = Object.keys(porTit).sort(function (a, b) { return porTit[b] - porTit[a]; }).slice(0, 8);
    var maxG = Math.max.apply(null, [1].concat(Object.keys(porGru).map(function (g) { return porGru[g]; })));
    $("#numeros").innerHTML = '<div class="numeros">' +
      '<div class="cifra"><strong>' + tot + "</strong>préstamos registrados</div>" +
      '<div class="cifra"><strong>' + act + "</strong>libros en casa ahora</div>" +
      '<div class="cifra"><strong>' + ven + "</strong>con fecha vencida</div>" +
      '<div class="cifra"><strong>' + (tot - act) + "</strong>devoluciones recibidas</div></div>" +
      '<div class="numeros" style="margin-top:18px"><div><h2>Préstamos por grupo</h2><ul class="barras">' +
      CFG.grupos.map(function (g) { var n = porGru[g] || 0; return "<li><span>" + esc(g) + '</span><span class="b" style="width:' + (n / maxG * 100) + '%"></span><span>' + n + "</span></li>"; }).join("") +
      "</ul></div><div><h2>Los más pedidos</h2>" + (top.length ? "<ol>" + top.map(function (id) { return "<li>" + esc((POR_ID[id] || {}).t || id) + " (" + porTit[id] + ")</li>"; }).join("") + "</ol>" : '<p class="nota">Aún no hay préstamos.</p>') + "</div></div>";
  }
  function descargar(nombre, contenido, tipo) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportarCsv() {
    var cols = ["folio", "id", "t", "nombre", "grupo", "salida", "vence", "devuelto", "vale"];
    var cab = ["Folio", "ID", "Título", "Nombre", "Grupo", "Salida", "Vence", "Devuelto", "Vale"];
    var csv = "\ufeff" + cab.join(",") + "\n" + PRESTAMOS.map(function (p) {
      return cols.map(function (c) { var v = p[c] == null ? "" : String(p[c]); return '"' + v.replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    descargar("prestamos-biblioteca-viva-" + hoyISO() + ".csv", csv, "text/csv;charset=utf-8");
  }
  function importarJson(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result), lista = j.prestamos || j, idx = {}, nuevos = 0;
        PRESTAMOS.forEach(function (p) { idx[p.folio] = p; });
        lista.forEach(function (p) { if (!p.folio || !p.id) return; if (!idx[p.folio]) { PRESTAMOS.push(p); nuevos++; } else if (p.devuelto && !idx[p.folio].devuelto) idx[p.folio].devuelto = p.devuelto; });
        guardarPrestamos(); refrescarTodo(); aviso("Respaldo restaurado: " + nuevos + " préstamos nuevos");
      } catch (err) { aviso("Ese archivo no es un respaldo válido."); }
      e.target.value = "";
    };
    r.readAsText(f);
  }
  function sincronizar() {
    if (!EP) return;
    var pend = PRESTAMOS.filter(function (p) { return p.pend; });
    var envios = pend.map(function (p) {
      var copia = Object.assign({}, p); delete copia.pend;
      return apiPost({ accion: "prestar", prestamo: copia }).then(function () { delete p.pend; });
    });
    Promise.all(envios).catch(function () { }).then(function () {
      return apiGet({ accion: "prestamos", token: token() });
    }).then(function (j) {
      if (!j || !j.ok) throw new Error(j && j.error);
      var locales = PRESTAMOS.filter(function (p) { return p.pend; });
      PRESTAMOS = j.prestamos.concat(locales.filter(function (l) { return !j.prestamos.some(function (s) { return s.folio === l.folio; }); }));
      guardarPrestamos(); REMOTO = null; refrescarTodo();
      $("#estadoSync").textContent = "Sincronizado con Google Sheets el " + new Date().toLocaleString("es-MX") + ".";
    }).catch(function (err) {
      $("#estadoSync").textContent = "No se pudo sincronizar (" + (err && err.message ? err.message : "sin conexión") + "). Los datos siguen guardados en este equipo.";
    });
  }

  /* ---------------- Navegación ---------------- */
  var vistaActual = "explorar", VISTAS = ["explorar", "librero", "que-leo", "mochila", "mostrador"];
  function irA(v) { if (location.hash !== "#" + v) history.pushState(null, "", "#" + v); mostrarVista(v); }
  function mostrarVista(v) {
    if (VISTAS.indexOf(v) < 0) v = "explorar";
    vistaActual = v; vistaPrevia = v;
    $$(".vista").forEach(function (s) { s.hidden = s.dataset.vista !== v; });
    $$(".menu a").forEach(function (a) { if (a.dataset.vista === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (v === "librero") montarLibrero();
    if (v === "mochila") pintarMochila();
    if (v === "mostrador" && sessionStorage.getItem("bv.mostrador") === "1") entrarMostrador();
    window.scrollTo(0, 0);
  }
  function ruta() {
    var h = decodeURIComponent(location.hash.slice(1));
    var m = h.match(/^libro=(.+)$/);
    if (m) {
      if (!vistaActual || $("#vista-" + vistaActual).hidden) mostrarVista(vistaPrevia);
      abrirFicha(normalizarId(m[1]) || m[1]); return;
    }
    cerrarFicha(); mostrarVista(h || "explorar");
  }
  window.addEventListener("hashchange", ruta);
  function refrescarTodo() {
    if (vistaActual === "explorar") pintarResultados();
    if (vistaActual === "mochila") pintarMochila();
    if (vistaActual === "mostrador") actualizarContadores();
  }

  /* ---------------- Arranque ---------------- */
  $("#pieEscuela").textContent = CFG.escuela + (CFG.cct ? " (C.C.T. " + CFG.cct + ")" : "");
  $("#valeGrupo").innerHTML = CFG.grupos.map(function (g) { return "<option>" + esc(g) + "</option>"; }).join("");
  var vd = leer("bv.valeDatos", null); if (vd) { $("#valeNombre").value = vd.nombre || ""; $("#valeGrupo").value = vd.grupo || CFG.grupos[0]; }
  montarFiltros(); hero(); montarQueLeo(); montarMostrador(); contadorMochila();
  buscar(true);
  ruta();
  cargarDisponibilidad();
})();
