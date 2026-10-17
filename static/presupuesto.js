/* El asistente de presupuesto de Muebles: un paso por vez.

   Sin JS el formulario muestra los cinco pasos juntos y se manda entero; el
   servidor arma el mensaje (publico/muebles.py). Esto solo lo parte en pasos,
   pinta el progreso, pide el «qué» antes de seguir y arma el resumen del
   último paso. El texto del WhatsApp NO se arma acá. */
(function () {
  'use strict';
  var f = document.querySelector('form[data-asistente]');
  if (!f) return;
  var pasos = Array.prototype.slice.call(f.querySelectorAll('[data-paso]'));
  var prog = Array.prototype.slice.call(f.querySelectorAll('.prog li'));
  var atras = f.querySelector('[data-atras]'), sig = f.querySelector('[data-siguiente]');
  var enviar = f.querySelector('[data-enviar]'), error = f.querySelector('[data-error]');
  var resumen = f.querySelector('[data-resumen]');
  var actual = 0;

  function valor(nombre) {
    var el = f.querySelector('input[name="' + nombre + '"]:checked');
    return el ? el.value : '';
  }
  function texto(nombre) { return (f.elements[nombre] && f.elements[nombre].value || '').trim(); }

  function armarResumen() {
    var medidas;
    if (f.elements.sin_medidas.checked) medidas = 'Todavía no las tengo';
    else if (texto('ancho') || texto('alto') || texto('prof'))
      medidas = [texto('ancho') || '–', texto('alto') || '–', texto('prof') || '–'].join(' × ') + ' cm (ancho × alto × prof.)';
    else medidas = 'Sin completar';
    var filas = [['Qué', valor('tipo') || 'Sin elegir'], ['Dónde', valor('lugar') || 'Sin elegir'],
                 ['Instalación', valor('inst') || 'Sin elegir'], ['Medidas', medidas],
                 ['Material', valor('mat') || 'A definir'], ['Hierro', valor('color') || 'A definir'],
                 ['Madera', valor('madera') || 'A definir']];
    resumen.innerHTML = '';
    filas.forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0]; dd.textContent = r[1];
      resumen.appendChild(dt); resumen.appendChild(dd);
    });
  }

  function mostrar(n, enfocar) {
    actual = n;
    pasos.forEach(function (p, i) { p.hidden = i !== n; });
    prog.forEach(function (li, i) {
      li.classList.toggle('hecho', i < n);
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    atras.hidden = n === 0;
    sig.hidden = n === pasos.length - 1;
    enviar.hidden = n !== pasos.length - 1;
    error.hidden = true;
    if (n === pasos.length - 1) armarResumen();
    if (enfocar) pasos[n].querySelector('legend').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (enfocar) { var primero = pasos[n].querySelector('input, textarea'); if (primero) primero.focus({ preventScroll: true }); }
  }

  sig.addEventListener('click', function () {
    if (actual === 0 && !valor('tipo')) {
      error.hidden = false;
      error.textContent = 'Elegí qué querés hacer para seguir.';
      var op = f.querySelector('input[name="tipo"]');
      if (op) op.focus();
      return;
    }
    mostrar(Math.min(pasos.length - 1, actual + 1), true);
  });
  atras.addEventListener('click', function () { mostrar(Math.max(0, actual - 1), true); });

  f.addEventListener('change', function (e) {
    if (e.target.name === 'tipo') error.hidden = true;
    if (e.target.matches('[data-fotos]')) f.querySelector('[data-aviso-fotos]').hidden = !e.target.checked;
  });
  f.addEventListener('submit', function (e) {
    if (!valor('tipo')) { e.preventDefault(); mostrar(0, true); sig.click(); }
  });

  // Volvió del servidor con un error: abre en el paso 1, con el aviso.
  var habiaError = !error.hidden;
  mostrar(0, false);
  if (habiaError) { error.hidden = false; }
})();
