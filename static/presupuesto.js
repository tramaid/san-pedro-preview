/* San Pedro Muebles: el filtro de trabajos, el botón fijo del celular y el
   asistente de presupuesto, un paso por vez.

   Sin JS el formulario muestra los cinco pasos juntos y se manda entero; el
   servidor arma el mensaje (publico/muebles.py). Esto lo parte en pasos,
   llena la costura del avance, pide el «qué» antes de seguir, marca las
   medidas que no son números y muestra la vista previa del mensaje. La
   vista previa repite publico/muebles.py::mensaje (el saludo viene del
   servidor en data-saludo); test_sp_muebles la compara con el servidor. */
(function () {
  'use strict';
  var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Trabajos: Todos / Herrería y exterior / Interior ──────────────── */
  var filtro = document.querySelector('[data-filtro]');
  if (filtro) {
    var bandas = document.querySelectorAll('[data-grupo]');
    filtro.hidden = false;
    filtro.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ver]');
      if (!b) return;
      filtro.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var n = 0;
      bandas.forEach(function (banda) {
        var ver = !b.dataset.ver || banda.dataset.grupo === b.dataset.ver;
        banda.hidden = !ver;
        if (ver) n += banda.querySelectorAll('figure').length;
      });
      var anuncio = document.getElementById('anuncio');
      if (anuncio) anuncio.textContent = n + (n === 1 ? ' trabajo' : ' trabajos');
    });
  }

  /* ── El botón fijo del celular: se va cuando ya se ve otro botón de presupuesto ─ */
  var barra = document.querySelector('[data-m-barra]');
  if (barra && 'IntersectionObserver' in window) {
    var vistos = new Set();
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) vistos.add(en.target); else vistos.delete(en.target); });
      barra.classList.toggle('fuera', vistos.size > 0);
    });
    ['[data-cta-hero]', '[data-cta-como]', '#presupuesto', '#contacto'].forEach(function (s) {
      var el = document.querySelector(s);
      if (el) io.observe(el);
    });
  }

  /* ── El asistente ──────────────────────────────────────────────────── */
  var f = document.querySelector('form[data-asistente]');
  if (!f) return;
  var pasos = Array.prototype.slice.call(f.querySelectorAll('[data-paso]'));
  var prog = f.querySelector('.prog'), marcas = Array.prototype.slice.call(prog.querySelectorAll('li'));
  var atras = f.querySelector('[data-atras]'), sig = f.querySelector('[data-siguiente]');
  var enviar = f.querySelector('[data-enviar]'), error = f.querySelector('[data-error]');
  var tipos = Array.prototype.slice.call(f.querySelectorAll('input[name="tipo"]'));
  var vista = f.querySelector('[data-mensaje]');
  var actual = 0;

  function valor(nombre) {
    var el = f.querySelector('input[name="' + nombre + '"]:checked');
    return el ? el.value : '';
  }
  function texto(nombre) { return (f.elements[nombre] && f.elements[nombre].value || '').trim(); }
  function cm(nombre) { return texto(nombre).replace(/\D/g, '').slice(0, 5); }

  /* El mismo texto que publico/muebles.py::mensaje. */
  function mensaje() {
    var medidas;
    if (f.elements.sin_medidas.checked) medidas = 'Todavía no las tengo';
    else if (cm('ancho') || cm('alto') || cm('prof'))
      medidas = [cm('ancho') || '–', cm('alto') || '–', cm('prof') || '–'].join(' × ') + ' cm (ancho × alto × prof.)';
    else medidas = 'Sin completar';
    var l = [f.dataset.saludo, '',
             'Qué: ' + (valor('tipo') || 'Sin elegir'), 'Dónde: ' + (valor('lugar') || 'Sin elegir'),
             'Instalación: ' + (valor('inst') || 'Sin elegir'), 'Medidas: ' + medidas,
             'Material: ' + (valor('mat') || 'A definir'), 'Hierro: ' + (valor('color') || 'A definir'),
             'Madera: ' + (valor('madera') || 'A definir')];
    if (texto('nombre')) l.push('Nombre: ' + texto('nombre').slice(0, 150));
    if (texto('localidad')) l.push('Localidad: ' + texto('localidad').slice(0, 150));
    if (texto('coment')) l.push('', texto('coment').slice(0, 2000));
    if (f.elements.tengo_fotos.checked) l.push('', 'Tengo fotos o referencias, se las mando por acá.');
    return l.join('\n');
  }
  function pintarVista() { if (vista) vista.textContent = mensaje(); }

  function marcarError(ver) {
    error.hidden = !ver;
    tipos.forEach(function (t) {
      if (ver) t.setAttribute('aria-describedby', error.id); else t.removeAttribute('aria-describedby');
    });
  }

  function mostrar(n, enfocar) {
    actual = n;
    pasos.forEach(function (p, i) { p.hidden = i !== n; });
    marcas.forEach(function (li, i) {
      li.classList.toggle('hecho', i < n);
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    prog.style.setProperty('--avance', n / (pasos.length - 1));
    atras.hidden = n === 0;
    sig.hidden = n === pasos.length - 1;
    enviar.hidden = n !== pasos.length - 1;
    if (n === pasos.length - 1) pintarVista();
    if (enfocar) {
      pasos[n].querySelector('legend').scrollIntoView({ block: 'nearest', behavior: quieto ? 'auto' : 'smooth' });
      var primero = pasos[n].querySelector('input:checked') || pasos[n].querySelector('input, textarea');
      if (primero) primero.focus({ preventScroll: true });
    }
  }

  function faltaTipo() {
    if (valor('tipo')) return false;
    marcarError(true);
    error.textContent = 'Elegí qué querés hacer para seguir.';
    if (actual !== 0) mostrar(0, false);
    error.scrollIntoView({ block: 'nearest', behavior: quieto ? 'auto' : 'smooth' });
    tipos[0].focus({ preventScroll: true });
    return true;
  }

  sig.addEventListener('click', function () {
    if (actual === 0 && faltaTipo()) return;
    mostrar(Math.min(pasos.length - 1, actual + 1), true);
  });
  atras.addEventListener('click', function () { mostrar(Math.max(0, actual - 1), true); });

  // Las medidas: solo números. Se avisa junto al campo; el servidor igual
  // se queda con los dígitos.
  f.querySelectorAll('[data-cm]').forEach(function (campo) {
    var aviso = document.getElementById(campo.getAttribute('aria-describedby'));
    campo.addEventListener('input', function () {
      var mal = /\D/.test(campo.value.trim());
      aviso.hidden = !mal;
      if (mal) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
    });
  });

  f.addEventListener('change', function (e) {
    if (e.target.name === 'tipo') marcarError(false);
    if (e.target.matches('[data-fotos]')) f.querySelector('[data-aviso-fotos]').hidden = !e.target.checked;
    pintarVista();
  });
  f.addEventListener('input', pintarVista);
  f.addEventListener('submit', function (e) {
    if (faltaTipo()) e.preventDefault();
  });
  // Con JS el «qué» ya se validó acá: WhatsApp se abre en otra pestaña y la
  // página queda. Sin JS va en la misma, así un error vuelve a esta pestaña.
  f.target = '_blank';

  // «Qué hacemos»: cada cosa abre el presupuesto con eso elegido.
  document.querySelectorAll('[data-elegir]').forEach(function (a) {
    a.addEventListener('click', function () {
      var op = tipos.filter(function (t) { return t.value === a.dataset.elegir; })[0];
      if (!op) return;
      op.checked = true;
      marcarError(false);
      mostrar(0, false);
      // el ancla hace el scroll; el foco queda en lo elegido
      setTimeout(function () { op.focus({ preventScroll: true }); }, quieto ? 0 : 450);
    });
  });

  // Volvió del servidor con un error: abre en el paso 1, con el aviso.
  var habiaError = !error.hidden;
  mostrar(0, false);
  marcarError(habiaError);
})();
