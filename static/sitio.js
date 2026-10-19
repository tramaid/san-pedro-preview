/* San Pedro: lo que el sitio hace con JS. Todo es una mejora: sin JS, cada
   cosa anda igual con formularios y links (los templates lo garantizan). */
(function () {
  'use strict';
  // En la vista previa estática no hay servidor: el pedido, los filtros del
  // catálogo y los formularios los maneja static/estatico.js.
  var ESTATICO = document.body.hasAttribute('data-estatico');

  var anuncio = document.getElementById('anuncio');
  function avisar(texto) {
    if (!anuncio) return;
    anuncio.textContent = '';
    setTimeout(function () { anuncio.textContent = texto; }, 50);
  }
  function pesos(n) { return '$' + Number(n).toLocaleString('es-AR'); }

  /* ── El encabezado y la barra del pedido ─────────────────────────────── */
  function actualizarPedido(unidades, total) {
    document.querySelectorAll('.js-cart-count').forEach(function (b) {
      b.textContent = unidades;
      b.setAttribute('aria-label', unidades + (unidades === 1 ? ' producto' : ' productos'));
    });
    var barra = document.querySelector('.js-barra');
    if (!barra) return;
    barra.hidden = !unidades;
    barra.querySelector('.js-barra-n').textContent = unidades;
    barra.querySelector('.js-barra-u').textContent = unidades === 1 ? 'producto' : 'productos';
    barra.querySelector('.js-barra-total').textContent = total;
  }

  /* ── El encabezado a la vista: se pega arriba y, al bajar, se achica a su
     franja de abajo (tema.css). Sin JS se va con el scroll. ─────────────── */
  var hdrF = document.querySelector('.hdr-f');
  if (hdrF) {
    var compacto = null;
    var mirar = function () {
      var c = window.scrollY > 8;
      if (c !== compacto) { compacto = c; hdrF.classList.toggle('compacto', c); }
    };
    hdrF.classList.add('fijo');
    window.addEventListener('scroll', mirar, { passive: true });
    mirar();
  }

  /* ── Menú del celular: se cierra al elegir, con Escape o tocando afuera ─ */
  var menu = document.querySelector('details.menu');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  }

  /* ── Tiras que scrollean de costado (celular): lo que toma el foco entra
     entero, con su anillo; Chrome no mueve lo que ya se ve en parte. ──── */
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t.closest && t.closest('.v-strip ul, .chips, .chips-h')) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  /* ── Agregar al pedido sin recargar (tarjetas y ficha) ───────────────── */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (ESTATICO || !f.matches || !f.matches('form[data-agregar]') || !window.fetch) return;
    e.preventDefault();
    var boton = f.querySelector('[type="submit"]');
    // Deshabilitarlo le saca el foco: al volver se lo devolvemos, así el
    // teclado y el lector siguen donde estaban.
    var tenia = boton && document.activeElement === boton;
    if (boton) boton.disabled = true;
    fetch(f.action, { method: 'POST', body: new FormData(f), headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        if (boton) { boton.disabled = false; if (tenia) boton.focus(); }
        if (!d.ok) { avisar(d.msg); alertaSuave(f, d.msg); return; }
        actualizarPedido(d.unidades, d.total);
        var card = f.closest('.card');
        if (card) {
          card.classList.add('en-pedido');
          (boton.querySelector('.js-btn-txt') || boton).textContent = 'En tu pedido (' + d.en_pedido + ') · sumar';
          boton.classList.add('agregado');
          var sello = card.querySelector('.js-sello');
          if (sello) { sello.hidden = false; sello.querySelector('.js-sello-n').textContent = d.en_pedido; }
        }
        var aviso = f.querySelector('[data-en-pedido]');
        if (aviso) {
          aviso.hidden = false;
          var n = aviso.querySelector('[data-en-pedido-n]');
          if (n) n.textContent = Number(n.textContent || 0) + Number((f.elements.cantidad || {}).value || 1);
        }
        avisar(d.msg + ' Tenés ' + d.unidades + (d.unidades === 1 ? ' producto' : ' productos') + ' en tu pedido.');
      })
      .catch(function () { HTMLFormElement.prototype.submit.call(f); });
  });

  function alertaSuave(f, texto) {
    var p = f.querySelector('.js-error');
    if (!p) { p = document.createElement('p'); p.className = 'aviso js-error'; p.setAttribute('role', 'alert'); f.appendChild(p); }
    p.textContent = texto;
  }

  /* ── Ficha: cantidad − + y el precio en el botón ─────────────────────── */
  document.querySelectorAll('form[data-ficha]').forEach(function (f) {
    var cant = f.elements.cantidad, cta = f.querySelector('[data-cta]'), nota = f.querySelector('[data-nota-cant]');
    function minimo() { return parseInt(cant.min, 10) || 1; }
    function maximo() { return parseInt(cant.max, 10) || 99; }
    f.querySelectorAll('[data-cant]').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        var v = Math.min(maximo(), Math.max(minimo(), (parseInt(cant.value, 10) || minimo()) + Number(b.dataset.cant)));
        cant.value = v; pintar();
      });
    });
    // Lo escrito a mano se lleva al rango al salir del campo; si pidió más
    // del máximo, el aviso lo manda al precio mayorista.
    cant.addEventListener('change', function () {
      var n = parseInt(cant.value, 10);
      var pasado = n > maximo();
      cant.value = Math.min(maximo(), Math.max(minimo(), n || minimo()));
      if (nota) { nota.hidden = !pasado; if (pasado) avisar(nota.textContent); }
      pintar();
    });
    function pintar() {
      if (!cta) return;
      var elegida = f.querySelector('input[name="producto_id"]:checked') || f.querySelector('input[type="hidden"][name="producto_id"]');
      var precio = elegida && elegida.dataset.precio ? Number(elegida.dataset.precio) / 100 : null;
      var n = parseInt(cant.value, 10);
      var ok = n >= minimo() && n <= maximo();
      cta.textContent = 'Agregar al pedido' + (precio && ok ? ' · ' + pesos(precio * n) : '');
      if (elegida && elegida.type === 'radio') {
        var p = document.querySelector('p[data-precio]');
        if (p && precio) p.textContent = pesos(precio);
      }
    }
    f.addEventListener('change', pintar);
    cant.addEventListener('input', pintar);
    pintar();

    // Sin medida elegida, el aviso del template (con la voz del sitio) en
    // vez de la burbuja del navegador. Sin JS queda la del `required`.
    var falta = f.querySelector('[data-falta-medida]');
    if (falta) {
      f.addEventListener('invalid', function (e) {
        if (e.target.name !== 'producto_id') return;
        e.preventDefault();
        if (!falta.hidden) return;              // un aviso por intento, no uno por radio
        falta.hidden = false;
        avisar(falta.textContent);
        var primera = f.querySelector('input[name="producto_id"]:not(:disabled)');
        if (primera) primera.focus();
      }, true);
      f.addEventListener('change', function (e) { if (e.target.name === 'producto_id') falta.hidden = true; });
      f.querySelector('[type="submit"]').addEventListener('click', function () { falta.hidden = true; });
    }
  });

  /* ── Ficha: las miniaturas cambian la foto grande sin recargar ───────── */
  document.querySelectorAll('[data-galeria]').forEach(function (g) {
    var grande = g.querySelector('[data-foto-grande]');
    g.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-foto]');
      if (!a || !grande) return;
      e.preventDefault();
      grande.src = a.dataset.foto;
      grande.removeAttribute('srcset');
      g.querySelectorAll('a[data-foto]').forEach(function (x) { x.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'true');
    });
  });

  /* ── Catálogo: el orden se aplica al elegirlo con el mouse o el dedo. Con
     el teclado cada flecha cambia la opción: recargar ahí le saca el foco
     (WCAG 3.2.2). Se aplica con Enter o con el botón, que aparece. ───── */
  if (!ESTATICO) document.querySelectorAll('select[data-autoenviar]').forEach(function (s) {
    var teclado = false;
    s.addEventListener('pointerdown', function () { teclado = false; });
    s.addEventListener('keydown', function (e) {
      teclado = true;
      if (e.key === 'Enter') { e.preventDefault(); s.form.submit(); }
    });
    s.addEventListener('change', function () {
      if (!teclado) { s.form.submit(); return; }
      var b = s.form.querySelector('.js-ocultar');
      if (b) b.classList.remove('js-ocultar');
    });
  });

  /* ── Chips que filtran una grilla en el lugar (home, trabajos) ────────── */
  document.querySelectorAll('[data-chips]').forEach(function (chips) {
    var grilla = chips.closest('section').querySelector('[data-chips-grilla]');
    if (!grilla) return;
    chips.hidden = false;
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-cat]');
      if (!b) return;
      chips.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var cat = b.dataset.cat, n = 0;
      Array.prototype.forEach.call(grilla.children, function (li) {
        var ver = !cat || li.dataset.cat === cat;
        li.hidden = !ver;
        if (ver) n++;
      });
      avisar(n + (n === 1 ? ' resultado' : ' resultados'));
    });
  });

  /* ── Revisión del pedido: la vista previa del mensaje de WhatsApp. Repite
     servicios/avisos._texto_cliente: el saludo, cada línea y el total los
     escribe el servidor (data-saludo, data-msg, data-total); acá se suman lo
     elegido en cada línea y los datos, a medida que se escriben. En la vista
     previa estática la arma static/estatico.js. ───────────────────────── */
  function pintarVista() {
    var v = document.querySelector('[data-vista-pedido]'), f = document.getElementById('f-pedido');
    if (ESTATICO || !v || !f) return;
    var l = [v.dataset.saludo + ':'];
    document.querySelectorAll('[data-lineas] > li[data-msg]').forEach(function (li) {
      l.push(li.dataset.msg);
      var d = li.querySelector('input[data-detalle]'), t = d ? d.value.replace(/\s+/g, ' ').trim().slice(0, 100) : '';
      if (t) l.push('   ' + v.dataset.detalle + ': ' + t);
    });
    l.push('Total: ' + v.dataset.total);
    var extra = [], x = f.elements;
    if (x.nombre.value.trim()) extra.push('Nombre: ' + x.nombre.value.trim());
    if (x.localidad.value.trim()) extra.push('Envío a: ' + x.localidad.value.trim());
    if (x.observaciones.value.trim()) extra.push('Comentarios: ' + x.observaciones.value.trim());
    if (extra.length) l = l.concat([''], extra);
    v.querySelector('[data-mensaje]').textContent = l.join('\n');
  }
  document.addEventListener('input', function (e) {
    if (e.target.form && e.target.form.id === 'f-pedido') pintarVista();
  });
  pintarVista();

  /* ── Revisión del pedido: − + y Quitar sin perder el scroll ni lo escrito ─ */
  var lineas = document.querySelector('[data-lineas]');
  if (lineas && window.fetch && window.DOMParser) {
    document.addEventListener('submit', function (e) {
      var f = e.target;
      if (!f.matches || !f.matches('form[data-pedido-form]')) return;
      e.preventDefault();
      var b = e.submitter, datos = new FormData(f);
      if (b && b.name) datos.append(b.name, b.value);
      var foco = b && b.dataset.foco;
      f.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
      fetch(f.action, { method: 'POST', body: datos })
        .then(function (r) { if (!r.ok) throw 0; return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var nuevas = doc.querySelector('[data-lineas]');
          if (!nuevas) {                      // quedó vacío: la página entera
            var main = document.getElementById('contenido'), otro = doc.getElementById('contenido');
            if (main && otro) main.innerHTML = otro.innerHTML;
            actualizarPedido(0, pesos(0));
            avisar('Tu pedido quedó vacío.');
            return;
          }
          var actuales = document.querySelector('[data-lineas]');
          // Lo escrito en el campo de cada línea (el color) sigue ahí.
          actuales.querySelectorAll('input[data-detalle]').forEach(function (x) {
            var igual = nuevas.querySelector('input[name="' + x.name + '"]');
            if (igual) igual.value = x.value;
          });
          actuales.replaceWith(nuevas);
          var tot = document.querySelector('.tot'), totNuevo = doc.querySelector('.tot');
          if (tot && totNuevo) tot.innerHTML = totNuevo.innerHTML;
          var vista = document.querySelector('[data-vista-pedido]'), vistaNueva = doc.querySelector('[data-vista-pedido]');
          if (vista && vistaNueva) vista.dataset.total = vistaNueva.dataset.total;
          pintarVista();
          var cuenta = doc.querySelector('.js-cart-count');
          var n = cuenta ? parseInt(cuenta.textContent, 10) || 0 : 0;
          actualizarPedido(n, totNuevo ? totNuevo.querySelector('b').textContent : '');
          var mismo = foco && document.querySelector('[data-foco="' + foco + '"]');
          (mismo || document.querySelector('[data-lineas] button, .resumen button')).focus();
          avisar(totNuevo ? 'Total: ' + totNuevo.querySelector('b').textContent : 'Pedido actualizado');
        })
        .catch(function () {
          if (b && b.name) { var c = document.createElement('input'); c.type = 'hidden'; c.name = b.name; c.value = b.value; f.appendChild(c); }
          HTMLFormElement.prototype.submit.call(f);
        });
    });
  }
})();
