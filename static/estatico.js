/* La vista previa estática (flask exportar-estatico): no hay servidor.

   - El pedido vive en el navegador (localStorage), como {producto_id: cantidad},
     con los precios de static/catalogo.js (lo genera el exportador).
   - «Enviar pedido por WhatsApp», el presupuesto de Muebles y el Botón de
     arrepentimiento arman el mensaje acá y abren WhatsApp. Los textos son
     los mismos que arman servicios/avisos._texto_cliente y publico/muebles.py
     en la app; si cambian allá, se cambian acá.
   - El catálogo filtra, busca y ordena en el lugar.
   En la app de verdad este archivo no se carga. */
(function () {
  'use strict';
  var CLAVE = 'sanpedro-pedido';
  var PRODUCTOS = window.SP_PRODUCTOS || {};
  var body = document.body;
  var WA_DECO = body.dataset.waDeco, WA_MUEBLES = body.dataset.waMuebles;

  function pesos(centavos) {
    var n = centavos / 100;
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: centavos % 100 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function wa(numero, texto) { return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto); }
  function avisar(texto) {
    var a = document.getElementById('anuncio');
    if (a) { a.textContent = ''; setTimeout(function () { a.textContent = texto; }, 50); }
  }

  /* ── El pedido en el navegador ──────────────────────────────────────── */
  function leer() {
    try {
      var c = JSON.parse(localStorage.getItem(CLAVE) || '{}'), limpio = {};
      Object.keys(c).forEach(function (k) {
        var n = parseInt(c[k], 10);
        if (PRODUCTOS[k] && PRODUCTOS[k].p && n > 0) limpio[k] = Math.min(n, 999);
      });
      return limpio;
    } catch (e) { return {}; }
  }
  function guardar(c) { try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch (e) {} }
  function resumen(c) {
    var u = 0, t = 0;
    Object.keys(c).forEach(function (k) { u += c[k]; t += c[k] * PRODUCTOS[k].p; });
    return { unidades: u, total: t };
  }
  function pintarEncabezado() {
    var c = leer(), r = resumen(c);
    document.querySelectorAll('.js-cart-count').forEach(function (b) {
      b.textContent = r.unidades;
      b.setAttribute('aria-label', r.unidades + (r.unidades === 1 ? ' producto' : ' productos'));
    });
    var barra = document.querySelector('.js-barra');
    if (barra) {
      barra.hidden = !r.unidades;
      barra.querySelector('.js-barra-n').textContent = r.unidades;
      barra.querySelector('.js-barra-u').textContent = r.unidades === 1 ? 'producto' : 'productos';
      barra.querySelector('.js-barra-total').textContent = pesos(r.total);
    }
    document.querySelectorAll('.card[data-producto]').forEach(function (card) {
      var q = c[card.dataset.producto] || 0, form = card.querySelector('form[data-agregar]');
      if (!form) return;
      var boton = form.querySelector('[type="submit"]'), sello = card.querySelector('.js-sello');
      card.classList.toggle('en-pedido', q > 0);
      boton.classList.toggle('agregado', q > 0);
      (boton.querySelector('.js-btn-txt') || boton).textContent = q ? 'En tu pedido (' + q + ') · sumar' : 'Agregar al pedido';
      if (sello) { sello.hidden = !q; sello.querySelector('.js-sello-n').textContent = q; }
    });
    return c;
  }

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.matches) return;

    if (f.matches('form[data-agregar]')) {
      e.preventDefault();
      var elegida = f.querySelector('input[name="producto_id"]:checked') || f.querySelector('input[type="hidden"][name="producto_id"]');
      if (!elegida) { avisar('Elegí una medida.'); return; }
      var id = elegida.value, n = parseInt((f.elements.cantidad || {}).value, 10) || 1;
      if (!PRODUCTOS[id] || !PRODUCTOS[id].p) { avisar('Ese producto tiene el precio a consultar: escribinos por WhatsApp.'); return; }
      var c = leer();
      c[id] = Math.min((c[id] || 0) + n, 999);
      guardar(c);
      pintarEncabezado();
      var aviso = f.querySelector('[data-en-pedido]');
      if (aviso) { aviso.hidden = false; aviso.querySelector('[data-en-pedido-n]').textContent = c[id]; }
      var r = resumen(c);
      avisar('Agregado a tu pedido. Tenés ' + r.unidades + (r.unidades === 1 ? ' producto' : ' productos') + ' en tu pedido.');
      return;
    }

    if (f.matches('form[data-enviar-estatico]')) {
      e.preventDefault();
      window.open(wa(WA_DECO, mensajePedido(f)), '_blank', 'noopener');
      return;
    }

    if (f.matches('form[data-presupuesto-estatico]')) {
      if (e.defaultPrevented) return;          // presupuesto.js frenó: falta el «qué»
      e.preventDefault();
      window.open(wa(WA_MUEBLES, mensajePresupuesto(f)), '_blank', 'noopener');
      return;
    }

    if (f.matches('form[data-arr-estatico]')) {
      e.preventDefault();
      var x = f.elements;
      if (x.nombre.value.trim().length < 3 || x.telefono.value.replace(/\D/g, '').length < 8) {
        avisar('Escribí tu nombre y apellido y tu teléfono, con la característica.');
        (x.nombre.value.trim().length < 3 ? x.nombre : x.telefono).focus();
        return;
      }
      var t = ['Hola San Pedro, quiero usar el Botón de arrepentimiento.',
               'Nombre: ' + x.nombre.value.trim(), 'Teléfono: ' + x.telefono.value.trim()];
      if (x.mail.value.trim()) t.push('Mail: ' + x.mail.value.trim());
      t.push('Pedido: ' + (x.pedido.value.trim() || 'no lo indicó'));
      if (x.motivo.value.trim()) t.push('Motivo: ' + x.motivo.value.trim());
      window.open(wa(WA_DECO, t.join('\n')), '_blank', 'noopener');
    }
  });

  /* El mismo texto que publico/muebles.py::mensaje. */
  function mensajePresupuesto(f) {
    function op(n) { var el = f.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ''; }
    function txt(n) { return (f.elements[n].value || '').trim(); }
    function cm(n) { return txt(n).replace(/\D/g, '').slice(0, 5); }
    var medidas;
    if (f.elements.sin_medidas.checked) medidas = 'Todavía no las tengo';
    else if (cm('ancho') || cm('alto') || cm('prof'))
      medidas = [cm('ancho') || '–', cm('alto') || '–', cm('prof') || '–'].join(' × ') + ' cm (ancho × alto × prof.)';
    else medidas = 'Sin completar';
    var l = ['Hola San Pedro Muebles, quiero pedir un presupuesto.', '',
             'Qué: ' + (op('tipo') || 'Sin elegir'), 'Dónde: ' + (op('lugar') || 'Sin elegir'),
             'Instalación: ' + (op('inst') || 'Sin elegir'), 'Medidas: ' + medidas,
             'Material: ' + (op('mat') || 'A definir'), 'Hierro: ' + (op('color') || 'A definir'),
             'Madera: ' + (op('madera') || 'A definir')];
    if (txt('nombre')) l.push('Nombre: ' + txt('nombre'));
    if (txt('localidad')) l.push('Localidad: ' + txt('localidad'));
    if (txt('coment')) l.push('', txt('coment'));
    if (f.elements.tengo_fotos.checked) l.push('', 'Tengo fotos o referencias, se las mando por acá.');
    return l.join('\n');
  }

  /* ── La revisión del pedido ──────────────────────────────────────────── */
  var lista = document.querySelector('[data-lineas-estatico]');
  // El campo de cada línea (p. ej. el color): lo escrito se guarda acá para
  // que sobreviva a los − + que redibujan la lista.
  var molde = document.querySelector('template[data-elegir-estatico]'), elegido = {};
  var NOMBRE_DETALLE = molde ? molde.content.querySelector('span').firstChild.textContent.trim() : '';
  /* El mismo texto que servicios/avisos._texto_cliente, sin número de pedido. */
  function mensajePedido(f) {
    var pedido = leer(), lineas = ['Hola San Pedro, quiero hacer este pedido:'];
    Object.keys(pedido).forEach(function (k) {
      var p = PRODUCTOS[k];
      lineas.push('- ' + pedido[k] + ' x ' + p.n + (p.e ? ' (' + p.e + ')' : '') + ' — ' + pesos(p.p * pedido[k]));
      var det = (elegido[k] || '').replace(/\s+/g, ' ').trim().slice(0, 100);
      if (det) lineas.push('   ' + NOMBRE_DETALLE + ': ' + det);
    });
    lineas.push('Total: ' + pesos(resumen(pedido).total));
    var extra = [], d = f.elements;
    if (d.nombre.value.trim()) extra.push('Nombre: ' + d.nombre.value.trim());
    if (d.localidad.value.trim()) extra.push('Envío a: ' + d.localidad.value.trim());
    if (d.observaciones.value.trim()) extra.push('Comentarios: ' + d.observaciones.value.trim());
    if (extra.length) lineas = lineas.concat([''], extra);
    return lineas.join('\n');
  }
  // La vista previa del mensaje, arriba del botón: se repinta con cada cambio.
  function pintarVista() {
    var v = document.querySelector('[data-vista-pedido] [data-mensaje]'), f = document.getElementById('f-pedido');
    if (v && f) v.textContent = mensajePedido(f);
  }
  document.addEventListener('input', function (e) {
    if (e.target.form && e.target.form.id === 'f-pedido') pintarVista();
  });

  function pintarPedido() {
    var c = pintarEncabezado(), r = resumen(c);
    if (!lista) return;
    document.querySelector('[data-ped-vacio]').hidden = r.unidades > 0;
    document.querySelector('[data-ped-lleno]').hidden = !r.unidades;
    lista.innerHTML = '';
    Object.keys(c).forEach(function (k) {
      var p = PRODUCTOS[k], li = document.createElement('li');
      li.className = 'linea';
      li.innerHTML =
        '<a class="linea-f" tabindex="-1" aria-hidden="true"></a>' +
        '<div><h2><a></a></h2><p class="var"></p><p class="unit"></p></div>' +
        '<p class="sub"></p>' +
        '<div class="linea-acc"><span class="cant" role="group"><button type="button" data-d="-1">−</button>' +
        '<span class="n"></span><button type="button" data-d="1">+</button></span>' +
        '<button class="quitar" type="button" data-quitar>Quitar</button></div>';
      li.querySelector('.linea-f').href = p.u;
      if (p.f) { var img = document.createElement('img'); img.src = p.f; img.alt = ''; li.querySelector('.linea-f').appendChild(img); }
      var a = li.querySelector('h2 a'); a.href = p.u; a.textContent = p.n;
      if (p.e) li.querySelector('.var').textContent = p.e; else li.querySelector('.var').remove();
      li.querySelector('.unit').textContent = pesos(p.p) + ' c/u';
      li.querySelector('.sub').textContent = pesos(p.p * c[k]);
      li.querySelector('.n').textContent = c[k];
      li.querySelector('.cant').setAttribute('aria-label', 'Cantidad de ' + p.n);
      li.querySelector('[data-d="-1"]').setAttribute('aria-label', 'Uno menos de ' + p.n);
      li.querySelector('[data-d="1"]').setAttribute('aria-label', 'Uno más de ' + p.n);
      li.querySelector('[data-quitar]').setAttribute('aria-label', 'Quitar ' + p.n + ' del pedido');
      li.dataset.id = k;
      if (p.c && molde) {
        var campo = molde.content.firstElementChild.cloneNode(true), inp = campo.querySelector('input');
        inp.name = 'detalle_' + k;
        inp.value = elegido[k] || '';
        inp.setAttribute('aria-describedby', 'op-' + k);
        campo.querySelector('small').id = 'op-' + k;
        campo.querySelector('small').textContent = p.c;
        inp.addEventListener('input', function () { elegido[k] = inp.value; });
        li.appendChild(campo);
      }
      lista.appendChild(li);
    });
    document.querySelector('[data-tot-n]').textContent = r.unidades + (r.unidades === 1 ? ' producto' : ' productos');
    document.querySelector('[data-tot-total]').textContent = pesos(r.total);
    pintarVista();
  }
  if (lista) {
    lista.addEventListener('click', function (e) {
      var b = e.target.closest('button'), li = e.target.closest('li[data-id]');
      if (!b || !li) return;
      var c = leer(), id = li.dataset.id;
      if (b.hasAttribute('data-quitar')) delete c[id];
      else { c[id] = (c[id] || 0) + Number(b.dataset.d); if (c[id] <= 0) delete c[id]; }
      guardar(c);
      pintarPedido();
      var r = resumen(c);
      avisar(r.unidades ? 'Total: ' + pesos(r.total) : 'Tu pedido quedó vacío.');
    });
  }

  /* ── El catálogo: categoría, búsqueda y orden en el lugar ─────────────── */
  var grilla = document.querySelector('[data-grilla-tienda]');
  if (grilla) {
    var tarjetas = Array.prototype.slice.call(grilla.querySelectorAll('li.card'));
    var chips = document.querySelectorAll('.chips a[data-cat]');
    var form = document.querySelector('form.filtros'), q = form.elements.q, orden = form.elements.orden;
    var cuenta = document.querySelector('[data-cuenta]');
    var vacio = document.createElement('li');
    vacio.className = 'vacio';
    vacio.innerHTML = '<p class="t"></p><p>Probá con otra palabra o mirá todas las categorías.</p>';
    function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    var params = new URLSearchParams(location.search);
    var cat = params.get('cat') || '';
    q.value = params.get('q') || '';
    if (params.get('orden')) orden.value = params.get('orden');
    var hidden = form.querySelector('input[name="cat"]');
    if (hidden) hidden.remove();

    function aplicar() {
      var palabras = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
      var visibles = tarjetas.filter(function (t) {
        var ok = (!cat || t.dataset.cat === cat) &&
                 palabras.every(function (p) { return norm(t.dataset.buscar).indexOf(p) >= 0; });
        t.hidden = !ok;
        if (ok) n++;
        return ok;
      });
      var precio = function (t) { return t.dataset.precio ? Number(t.dataset.precio) : null; };
      var orden_ = tarjetas.slice();
      if (orden.value === 'precio' || orden.value === 'precio_desc') {
        var sign = orden.value === 'precio' ? 1 : -1;
        orden_.sort(function (a, b) {
          var pa = precio(a), pb = precio(b);
          if (pa === null) return pb === null ? 0 : 1;
          if (pb === null) return -1;
          return sign * (pa - pb);
        });
      } else if (orden.value === 'nombre') {
        orden_.sort(function (a, b) { return a.querySelector('h2').textContent.localeCompare(b.querySelector('h2').textContent, 'es'); });
      }
      orden_.forEach(function (t) { grilla.appendChild(t); });
      if (!n) { vacio.querySelector('.t').textContent = 'No encontramos «' + q.value + '»'; grilla.appendChild(vacio); }
      else if (vacio.parentNode) vacio.remove();
      cuenta.textContent = n + (n === 1 ? ' producto' : ' productos') + (q.value ? ' para «' + q.value + '»' : '');
      chips.forEach(function (a) { if (a.dataset.cat === cat) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      var u = new URLSearchParams();
      if (cat) u.set('cat', cat);
      if (q.value) u.set('q', q.value);
      if (orden.value !== 'relevante') u.set('orden', orden.value);
      history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
      return visibles;
    }
    chips.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); cat = a.dataset.cat; aplicar(); });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); aplicar(); });
    q.addEventListener('input', aplicar);
    orden.addEventListener('change', aplicar);
    aplicar();
  }

  pintarPedido();
  window.addEventListener('storage', pintarPedido);
})();
