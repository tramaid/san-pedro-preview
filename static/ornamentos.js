/* Los ornamentos de la home v5 brotan al entrar en pantalla, escalonados
   dentro de cada tanda (home.css). Sin IntersectionObserver (o sin JS) no se
   pone .io y quedan visibles y quietos: nunca dependen del script. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  var ows = document.querySelectorAll('.v-home .ow');
  if (!ows.length) return;
  document.documentElement.classList.add('io');
  var io = new IntersectionObserver(function (es, obs) {
    var n = 0;
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.style.transitionDelay = (n++ * 0.12) + 's';
      e.target.classList.add('vis');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  ows.forEach(function (el) { io.observe(el); });
})();
