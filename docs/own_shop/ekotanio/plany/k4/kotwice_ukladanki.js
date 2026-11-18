/* kotwice_ukladanki.js — komentarz albo „Jestem OK” przy KAŻDEJ wersji modułu frontu-układanki (Tomek 11.11: „nie głosowanie, komentowanie lub okejka”).
   Ładowany PRZED komentarze_ekotanio.js (zwykły skrypt przed deferowanym): nadaje data-komentarz każdej wersji (.ukv) i każdej sekcji bez wersji,
   więc widżet komentarzy daje przy nich przycisk „Dodaj komentarz” z ocenami. Osoby nie ustawia — trzeba ją wybrać (widżet startuje bez osoby).
   Rozwinięty panel zmienia wysokość wersji, więc ResizeObserver woła ukup(), żeby tor przewijania nie uciął panelu. */
(function () {
  // subtelniej (Tomek 11.11): zamiast złotego guzika — mała obwódka, szary napis, po prawej
  var st = document.createElement('style');
  st.textContent = '.ukv .kmt-anchor,section[data-komentarz]>.kmt-anchor{display:flex!important;flex-direction:column;align-items:flex-end;margin:10px 0 0}' +
    '.ukv .kmt-btn,section[data-komentarz]>.kmt-anchor>.kmt-btn{background:transparent!important;color:#5b667a!important;border:1px solid #d9dee8!important;' +
    'font-size:13.5px!important;font-weight:600!important;padding:0 14px!important;min-height:40px!important;border-radius:999px!important;box-shadow:none!important;width:auto!important;display:inline-flex!important;align-items:center}' +
    '.ukv .kmt-btn:hover,section[data-komentarz]>.kmt-anchor>.kmt-btn:hover{color:#0f1a2e!important;border-color:#9aa3b2!important}' +
    '.ukv .kmt-anchor .kmt-panel,section[data-komentarz]>.kmt-anchor .kmt-panel{align-self:stretch}';
  document.head.appendChild(st);
  document.querySelectorAll('.uk[id]').forEach(function (u) {
    var m = u.id.replace(/^uk-/, '');
    u.querySelectorAll('.uktr > .ukv').forEach(function (v, i) { v.setAttribute('data-komentarz', m + '-wersja-' + (i + 1)); });
  });
  document.querySelectorAll('body section').forEach(function (s, i) {
    if (s.querySelector('.uk') || s.closest('[data-komentarz]') || s.parentElement.closest('section')) return;
    s.setAttribute('data-komentarz', s.id || ((s.className.split(' ')[0] || 'sekcja') + '-' + (i + 1)));
  });
  // wysokość toru = wysokość widocznej wersji (ukup() strony siedzi w jej domknięciu, więc liczymy sami)
  function dopasuj(u) { var t = u.querySelector('.uktr'), i = Math.round(t.scrollLeft / ((t.clientWidth + 24) || 1)), v = t.children[Math.max(0, Math.min(t.children.length - 1, i))]; if (v) t.style.height = v.offsetHeight + 'px'; }
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function (e) { e.forEach(function (x) { var u = x.target.closest('.uk'); if (u) dopasuj(u); }); });
    document.querySelectorAll('.uk .ukv').forEach(function (v) { ro.observe(v); });
  }
})();
