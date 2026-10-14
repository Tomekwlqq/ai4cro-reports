/* Komentarze zespołu China Select — widżet samodzielny (bez bibliotek).
 *
 * Kontrakt API (ten sam lokalnie i na Workerze):
 *   GET  <API>?strona=<klucz>  -> [{id, strona, kotwica, autor, typ, tekst, ts}]   (JEDNO na wczytanie)
 *   POST <API> {strona, kotwica, autor, typ, tekst} -> rekord
 * Endpoint: localhost/127.0.0.1 -> ten sam serwer (/api/komentarze); inaczej window.KOMENTARZE_API;
 *           file:// i strony w internecie -> wspólny Worker zespołu (cc-komentarze.waleqq.workers.dev).
 * Klucz strony: window.KOMENTARZE_STRONA albo nazwa pliku HTML z adresu (np. REKOMENDACJE_STRONA_GLOWNA.html).
 * Kotwice: elementy z data-komentarz="<id>"; gdy strona nie ma żadnego -> section[id] plus h2 spoza tych sekcji.
 * Zawsze też wątek całej strony (kotwica "cala-strona") w przycisku u dołu.
 * Wygląd: Warm·Gold, jasny. Panele rozwijają się w treści (nie zasłaniają jej na stałe).
 */
(function () {
  'use strict';
  if (window.__komentarzeInit) return;
  window.__komentarzeInit = true;

  var OSOBY = ['Kamil', 'Aniela', 'Tomek', 'Kacper', 'Bartek', 'Marta'];
  // zapis w bazie = klucz z OSOBY; na ekranie = NAZWA, każda osoba ma swój kolor
  var NAZWA = { Tomek: 'Tomek (Tomcio)' };
  var KOLOR = { Kamil: '#1F6FB2', Aniela: '#B0306E', Tomek: '#C2571A', Kacper: '#2E7D4F', Bartek: '#6A4BB8', Marta: '#B8322A' };
  function nazwa(n) { return NAZWA[n] || n; }
  function imie(n, cls) {
    var b = el('b', cls || 'kmt-imie', nazwa(n));
    b.style.color = KOLOR[n] || '#111214';
    return b;
  }
  var LS_KEY = 'cc_komentarze_osoba';
  var MAX = 2000;
  var CALA = 'cala-strona';

  /* ---------- styl ---------- */
  var CSS = [
    '.kmt,.kmt *{box-sizing:border-box}',
    '.kmt{font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111214}',
    '.kmt-anchor{margin:14px 0 0;max-width:760px}',
    '.kmt-btn{appearance:none;cursor:pointer;border:1px solid #B9802A;background:#FFFBF2;color:#111214;border-radius:999px;padding:7px 14px;font-weight:600;font-size:13px;line-height:1;font-family:inherit;min-height:36px}',
    '.kmt-btn:hover{background:#FDF0D3}',
    '.kmt-btn[aria-expanded="true"]{background:#E8AC4C}',
    '.kmt-panel{margin-top:8px;border:1px solid #E8AC4C;background:#FFFBF2;border-radius:10px;padding:12px}',
    '.kmt-lista{margin:0 0 10px;padding:0;list-style:none;max-height:320px;overflow:auto}',
    '.kmt-wpis{padding:8px 0;border-bottom:1px solid rgba(185,128,42,.25)}',
    '.kmt-wpis:last-child{border-bottom:0}',
    '.kmt-meta{font-size:12px;color:#7a5a1e}',
    '.kmt-meta b{color:#111214}',
    '.kmt-tekst{white-space:pre-wrap;word-break:break-word;margin-top:2px}',
    '.kmt-akc{font-weight:600}',
    '.kmt-imie{font-weight:800}',
    /* kto się odniósł — przy każdej propozycji */
    '.kmt-kto{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px;font-size:12px}',
    '.kmt-kto-t{font-weight:700;color:#7a5a1e;margin-right:2px}',
    '.kmt-kto-chip{border-radius:999px;padding:3px 9px;border:1.5px solid currentColor;font-weight:700;background:#fff}',
    '.kmt-kto-chip.brak{color:#9aa0a6;border-style:dashed;font-weight:500;background:transparent}',
    /* slot pod projektem: panel otwarty, wyraźny, wystający */
    '.kmt-slot{margin:20px 0 8px;padding:16px 18px 14px;border:2px solid #E8AC4C;border-left-width:8px;border-radius:12px;background:#FFF6E2;box-shadow:0 6px 20px rgba(185,128,42,.22)}',
    '.kmt-slot-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px;margin-bottom:10px}',
    '.kmt-slot-t{font-weight:800;font-size:19px;line-height:1.25;color:#111214}',
    '.kmt-slot-s{font-size:13px;color:#7a5a1e}',
    '.kmt-slot-n{margin-left:auto;font-size:13px;font-weight:700;color:#7a5a1e}',
    '.kmt-slot .kmt-panel{margin-top:0;background:#fff;border-color:rgba(185,128,42,.45)}',
    '.kmt-slot .kmt-akcja{font-size:15px;min-height:46px;padding:10px 18px}',
    '.kmt-slot .kmt-pole{font-size:16px;min-height:88px}',
    '.kmt-slot .kmt-wiersz{gap:10px}',
    '.kmt-odsw{appearance:none;border:0;background:transparent;color:#7a5a1e;font:600 12px/1 inherit;font-family:inherit;text-decoration:underline;cursor:pointer;margin-left:10px}',
    '@media(max-width:600px){.kmt-slot{padding:12px;border-left-width:6px}.kmt-slot-t{font-size:17px}.kmt-slot-s{display:block;flex-basis:100%}.kmt-slot-n{margin-left:0}.kmt-kto{font-size:12px}.kmt-kto-chip{padding:3px 7px}.kmt-wiersz{flex-direction:column;align-items:stretch}.kmt-sel{max-width:none;width:100%;min-height:46px;font-size:16px}.kmt-akcja{width:100%;min-height:48px;font-size:16px}.kmt-licznik{margin-left:0;text-align:right}.kmt-lista{max-height:240px}}',
    '.kmt-akc-lista{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}',
    '.kmt-akc-chip{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#fff;border:1.5px solid currentColor}',
    '@media(max-width:600px){.kmt-slot{margin:16px 0 8px;padding:12px}.kmt-slot-t{font-size:16px}}',
    '.kmt-pusto{color:#7a5a1e;font-size:13px;padding:4px 0 8px}',
    '.kmt-pole{width:100%;min-height:72px;resize:vertical;border:1px solid #B9802A;border-radius:8px;padding:8px;font:inherit;background:#fff;color:#111214}',
    '.kmt-wiersz{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center}',
    '.kmt-akcja{appearance:none;cursor:pointer;border:1px solid #B9802A;background:#E8AC4C;color:#111214;border-radius:8px;padding:8px 14px;font-weight:600;font-size:13px;line-height:1;font-family:inherit;min-height:38px}',
    '.kmt-akcja--2{background:#FFFBF2}',
    '.kmt-sel{appearance:auto;min-height:46px;border:1.5px solid #B9802A;border-radius:8px;padding:6px 10px;font:600 15px/1 inherit;font-family:inherit;background:#fff;color:#7a5a1e;max-width:300px}',
    '.kmt-akcja:disabled{opacity:.5;cursor:not-allowed}',
    '.kmt-licznik{margin-left:auto;font-size:12px;color:#7a5a1e}',
    '.kmt-err{color:#9A3B2F;font-size:13px;margin-top:6px}',
    '.kmt-info{font-size:12px;color:#7a5a1e;margin-top:6px}',
    /* pasek pływający u dołu */
    '.kmt-pasek{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#FFFBF2;border-top:2px solid #E8AC4C;box-shadow:0 -2px 12px rgba(17,18,20,.12);padding:8px 12px}',
    '.kmt-pasek-in{display:flex;flex-wrap:nowrap;gap:6px 8px;align-items:center;max-width:1280px;margin:0 auto;overflow-x:auto}',
    '.kmt-pasek-tyt{font-size:12px;font-weight:700;color:#7a5a1e}',
    '.kmt-osoby{display:flex;gap:6px;overflow-x:auto;max-width:100%;align-items:center}\n.kmt-pasek-tyt{white-space:nowrap}\n.kmt-kr{display:none}',
    '.kmt-osoba{appearance:none;cursor:pointer;border:1px solid #B9802A;background:#fff;color:#111214;border-radius:999px;padding:6px 12px;font-weight:600;font-size:13px;line-height:1;font-family:inherit;min-height:34px;white-space:nowrap}',
    '.kmt-osoba[aria-pressed="true"]{background:#E8AC4C}',
    '.kmt-pasek .kmt-btn{min-height:34px;padding:6px 12px}',
    '.kmt-min{margin-left:auto}',
    '.kmt-pill{position:fixed;right:12px;bottom:12px;z-index:2147483000;border:1px solid #B9802A;background:#FFFBF2;color:#111214;border-radius:999px;padding:8px 14px;font-weight:600;font-size:13px;line-height:1;font-family:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(17,18,20,.18)}',
    '.kmt-cala{max-width:1100px;margin:8px auto 0;max-height:55vh;overflow:auto}',
    '.kmt-cala .kmt-panel{margin-top:0}',
    '.kmt-nota{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;background:#FFFBF2;border:1px solid #E8AC4C;border-radius:10px;padding:8px 12px;font:13px/1.4 -apple-system,sans-serif;color:#111214;max-width:520px}',
    '@media(max-width:600px){.kmt-pasek{padding:5px 8px}.kmt-pasek-in{gap:4px 6px}.kmt-osoby{flex:1 1 100%}.kmt-osoba{padding:5px 10px;min-height:32px;font-size:12px}.kmt-pasek .kmt-btn{padding:5px 9px;font-size:12px;min-height:32px}.kmt-dl{display:none}.kmt-kr{display:inline}.kmt-min{margin-left:0}.kmt-cala{max-height:45vh}}'
  ].join('\n');

  function stylDodaj() {
    var st = document.createElement('style');
    st.id = 'kmt-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- pomocnicze ---------- */
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function lsGet() { try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; } }
  function lsSet(v) { try { localStorage.setItem(LS_KEY, v); } catch (e) { /* tryb prywatny */ } }
  function dataPl(ts) {
    var d = new Date(ts);
    if (isNaN(d)) return ts;
    return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function slug(t) {
    return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'sekcja';
  }
  function kluczStrony() {
    if (window.KOMENTARZE_STRONA) return String(window.KOMENTARZE_STRONA);
    var m = document.querySelector('meta[name="komentarze-strona"]');
    if (m && m.content) return m.content;
    var p = decodeURIComponent(location.pathname).split('/').filter(Boolean);
    return p.length ? p[p.length - 1] : 'index.html';
  }
  function endpoint() {
    var h = location.hostname;
    // localhost = serwer lokalny (testy); pliki otwierane z dysku i strony w internecie = wspólny Worker zespołu
    if (h === 'localhost' || h === '127.0.0.1' || h === '[::1]') return location.origin + '/api/komentarze';
    return window.KOMENTARZE_API || 'https://cc-komentarze.waleqq.workers.dev/api/komentarze';
  }

  /* ---------- stan ---------- */
  var STRONA = kluczStrony();
  var API = endpoint();
  // Tomek 12.10: imię NIE jest zapamiętywane — każdy wybiera z listy przy swoim komentarzu (bez domyślnego imienia)
  var osoba = '';
  try { localStorage.removeItem(LS_KEY); } catch (e) {}
  var dane = [];            // wszystkie rekordy tej strony
  var kotwice = {};         // id -> {btn, panel, lista, host}
  var pasek, cala, calaBtn, status;

  function rekordy(k) { return dane.filter(function (r) { return r.kotwica === k; }); }
  function liczby(k) {
    var rs = rekordy(k), kom = 0, akc = {};
    rs.forEach(function (r) { if (r.typ === 'komentarz') kom++; else akc[r.autor] = 1; });
    return { kom: kom, akc: Object.keys(akc).length };
  }
  function etykieta(k) { var n = liczby(k); return '💬 ' + n.kom + ' · 👍 ' + n.akc; }

  /* ---------- API ---------- */
  function pobierz() {
    return fetch(API + '?strona=' + encodeURIComponent(STRONA), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) { dane = Array.isArray(rows) ? rows : []; odswiezWidok(); setStatus(''); })
      .catch(function () { setStatus('Nie można pobrać komentarzy (serwer nie odpowiada).'); });
  }
  function wyslij(kotwica, typ, tekst) {
    return fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strona: STRONA, kotwica: kotwica, autor: osoba, typ: typ, tekst: tekst })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j && j.blad ? j.blad : 'HTTP ' + r.status);
        return j;
      });
    });
  }
  function setStatus(t) { if (status) status.textContent = t; }

  /* ---------- panel jednej kotwicy ---------- */
  function zbudujPanel(k, tytul) {
    var panel = el('div', 'kmt-panel');
    if (tytul) { var h = el('div', 'kmt-meta'); h.appendChild(el('b', null, tytul)); panel.appendChild(h); }
    var kto = el('div', 'kmt-kto');
    panel.appendChild(kto);
    var lista = el('ul', 'kmt-lista');
    panel.appendChild(lista);
    var pole = el('textarea', 'kmt-pole');
    pole.maxLength = MAX;
    pole.placeholder = 'Twój komentarz…';
    pole.setAttribute('aria-label', 'Komentarz');
    panel.appendChild(pole);
    var w = el('div', 'kmt-wiersz');
    var sel = el('select', 'kmt-sel');
    sel.setAttribute('aria-label', 'Kto komentuje');
    var o0 = el('option', null, 'Komentarz od: — niewybrana osoba —'); o0.value = ''; sel.appendChild(o0);
    OSOBY.forEach(function (n) { var o = el('option', null, 'Komentarz od: ' + nazwa(n)); o.value = n; if (n === osoba) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', function () { osoba = sel.value; kolorujSel(sel); document.querySelectorAll('.kmt-sel').forEach(function (x) { if (x !== sel) { x.value = osoba; kolorujSel(x); } }); });
    kolorujSel(sel);
    w.appendChild(sel);
    var dodaj = el('button', 'kmt-akcja', '💬 Dodaj komentarz');
    dodaj.type = 'button';
    dodaj.setAttribute('data-kmt', 'dodaj');
    var akc = el('button', 'kmt-akcja kmt-akcja--2', '👍 Jestem OK');
    akc.type = 'button';
    akc.setAttribute('data-kmt', 'akceptuj');
    var lic = el('span', 'kmt-licznik', '0/' + MAX);
    w.appendChild(dodaj); w.appendChild(akc); w.appendChild(lic);
    panel.appendChild(w);
    var err = el('div', 'kmt-err'); err.hidden = true;
    panel.appendChild(err);
    var info = el('div', 'kmt-info'); info.hidden = true;
    panel.appendChild(info);

    pole.addEventListener('input', function () { lic.textContent = pole.value.length + '/' + MAX; });

    function pokazErr(t) { err.textContent = t; err.hidden = !t; }
    function wymagajOsoby() {
      if (osoba) return true;
      pokazErr('Wybierz, od kogo jest komentarz (lista obok przycisku).');
      return false;
    }
    function dopisz(rec) {
      if (!dane.some(function (r) { return r.id === rec.id; })) dane.push(rec);
      odswiezWidok();
    }
    dodaj.addEventListener('click', function () {
      pokazErr('');
      if (!wymagajOsoby()) return;
      var t = pole.value.trim();
      if (!t) { pokazErr('Wpisz treść komentarza.'); return; }
      dodaj.disabled = true;
      wyslij(k, 'komentarz', t).then(function (rec) { pole.value = ''; lic.textContent = '0/' + MAX; dopisz(rec); })
        .catch(function (e) { pokazErr('Nie zapisano: ' + e.message); })
        .then(function () { dodaj.disabled = false; });
    });
    akc.addEventListener('click', function () {
      pokazErr('');
      if (!wymagajOsoby()) return;
      akc.disabled = true;
      wyslij(k, 'akceptacja', '').then(function (rec) {
        info.hidden = !rec.duplikat; info.textContent = rec.duplikat ? '„Jestem OK” już zapisane: ' + nazwa(osoba) + '.' : '';
        dopisz(rec);
      }).catch(function (e) { pokazErr('Nie zapisano: ' + e.message); })
        .then(function () { akc.disabled = false; });
    });
    return { panel: panel, lista: lista, kto: kto };
  }

  function rysujKto(k, box) {
    // kto się odniósł: OK / komentarz / nic — zawsze wszystkie 6 osób, żeby było widać, kogo brakuje
    if (!box) return;
    while (box.firstChild) box.removeChild(box.firstChild);
    var st = {};
    rekordy(k).forEach(function (r) { st[r.autor] = st[r.autor] || {}; st[r.autor][r.typ] = 1; });
    var n = OSOBY.filter(function (o) { return st[o]; }).length;
    box.appendChild(el('span', 'kmt-kto-t', 'Odnieśli się ' + n + ' z ' + OSOBY.length + ':'));
    OSOBY.forEach(function (o) {
      var c = el('span', 'kmt-kto-chip' + (st[o] ? '' : ' brak'), nazwa(o) + (st[o] ? (st[o].akceptacja ? ' 👍 OK' : '') + (st[o].komentarz ? ' 💬' : '') : ''));
      if (st[o]) c.style.color = KOLOR[o];
      box.appendChild(c);
    });
  }

  function rysujListe(k) {
    var o = kotwice[k];
    if (!o) return;
    var lista = o.lista;
    rysujKto(k, o.kto);
    while (lista.firstChild) lista.removeChild(lista.firstChild);
    var rs = rekordy(k).slice().sort(function (a, b) { return String(a.ts).localeCompare(String(b.ts)); });
    if (!rs.length) {
      var li0 = el('li', 'kmt-pusto', 'Brak komentarzy. Bądź pierwszy.');
      lista.appendChild(li0);
    }
    rs.forEach(function (r) {
      var li = el('li', 'kmt-wpis');
      var m = el('div', 'kmt-meta');
      m.appendChild(imie(r.autor));
      m.appendChild(document.createTextNode(' · ' + dataPl(r.ts)));
      li.appendChild(m);
      if (r.typ === 'akceptacja') { var a = el('div', 'kmt-tekst kmt-akc', '👍 '); a.appendChild(imie(r.autor)); a.appendChild(document.createTextNode(' — jestem OK')); li.appendChild(a); }
      else li.appendChild(el('div', 'kmt-tekst', r.tekst));
      lista.appendChild(li);
    });
  }

  function odswiezWidok() {
    // strona-gospodarz (np. zakładka „Do wdrożenia” na liście zmian) dostaje aktualne rekordy
    try { document.dispatchEvent(new CustomEvent('kmt:dane', { detail: dane })); } catch (e) {}
    Object.keys(kotwice).forEach(function (k) {
      var o = kotwice[k];
      if (o.btn) o.btn.textContent = etykieta(k);
      if (o.licz) o.licz.textContent = etykieta(k);
      rysujListe(k);
    });
    if (calaBtn) ustawCalaBtn();
  }
  function ustawCalaBtn() {
    while (calaBtn.firstChild) calaBtn.removeChild(calaBtn.firstChild);
    calaBtn.appendChild(el('span', 'kmt-dl', 'Komentarze do całej strony'));
    calaBtn.appendChild(el('span', 'kmt-kr', 'Cała strona'));
    calaBtn.appendChild(document.createTextNode(' \u00B7 ' + etykieta(CALA)));
  }

  function przelacz(o) {
    var otwarty = o.panel.hidden;
    o.panel.hidden = !otwarty;
    o.btn.setAttribute('aria-expanded', otwarty ? 'true' : 'false');
  }

  /* ---------- kotwice w treści ---------- */
  function znajdzKotwice() {
    var wl = Array.prototype.slice.call(document.querySelectorAll('[data-komentarz]'));
    var tryb = 'atrybut';
    if (!wl.length) {
      tryb = 'auto';
      var sek = Array.prototype.slice.call(document.querySelectorAll('section[id]')).filter(function (x, i, arr) {
        return !x.closest('.kmt,.kmt-pasek') && !arr.some(function (y) { return y !== x && y.contains(x); });
      });
      // nagłówki h2 spoza wybranych sekcji też dostają kotwicę (np. strony z jedną-dwiema sekcjami z id)
      var h2 = Array.prototype.slice.call(document.querySelectorAll('h2')).filter(function (h) {
        return !h.closest('.kmt,.kmt-pasek') && !sek.some(function (s) { return s.contains(h); });
      });
      wl = sek.concat(h2).sort(function (a, b) {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      }).slice(0, 80);
      var uzyte = {};
      wl.forEach(function (x, i) {
        var id = x.id || slug(x.textContent);
        if (uzyte[id] || (!x.id && document.getElementById(id))) id = id + '-' + (i + 1);
        uzyte[id] = 1;
        if (!x.id && x.tagName === 'H2') x.id = id;
        x.setAttribute('data-komentarz', id);
      });
    }
    return { elementy: wl, tryb: tryb };
  }

  function wstawKotwice(host) {
    var k = host.getAttribute('data-komentarz');
    if (!k || k === CALA || kotwice[k]) return;
    var slot = document.querySelector('[data-kmt-slot="' + k + '"]');
    if (slot) {
      // pole komentarzy tuż pod projektem: otwarte od razu, z wezwaniem
      var sw = el('div', 'kmt kmt-slot');
      var hh = el('div', 'kmt-slot-h');
      hh.appendChild(el('span', 'kmt-slot-t', 'Twoja opinia o tej propozycji'));
      hh.appendChild(el('span', 'kmt-slot-s', 'Wybierz imię, dopisz uwagę albo kliknij „Jestem OK”. Widzi to cały zespół.'));
      var od = el('button', 'kmt-odsw', 'odśwież'); od.type = 'button'; od.addEventListener('click', function () { pobierz(); }); hh.appendChild(od);
      var licz = el('span', 'kmt-slot-n', etykieta(k));
      hh.appendChild(licz);
      sw.appendChild(hh);
      var ps = zbudujPanel(k, null);
      sw.appendChild(ps.panel);
      slot.appendChild(sw);
      kotwice[k] = { btn: null, licz: licz, panel: ps.panel, lista: ps.lista, kto: ps.kto, host: host };
      return;
    }
    var wrap = el('div', 'kmt kmt-anchor');
    var btn = el('button', 'kmt-btn', etykieta(k));
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('data-kmt-btn', k);
    var p = zbudujPanel(k, null);
    p.panel.hidden = true;
    wrap.appendChild(btn); wrap.appendChild(p.panel);
    var o = { btn: btn, panel: p.panel, lista: p.lista, kto: p.kto, host: host };
    kotwice[k] = o;
    btn.addEventListener('click', function () { przelacz(o); });
    if (host.tagName === 'H2' || host.tagName === 'H3') host.insertAdjacentElement('afterend', wrap);
    else host.appendChild(wrap);
  }

  /* ---------- pasek pływający ---------- */
  function zbudujPasek() {
    pasek = el('div', 'kmt kmt-pasek');
    pasek.setAttribute('data-kmt-pasek', '1');
    cala = el('div', 'kmt-cala'); cala.hidden = true;
    var pc = zbudujPanel(CALA, 'Cała strona');
    pc.panel.hidden = false;
    cala.appendChild(pc.panel);
    kotwice[CALA] = { btn: null, panel: cala, lista: pc.lista, kto: pc.kto, host: null };
    pasek.appendChild(cala);

    var inn = el('div', 'kmt-pasek-in');
    var oso = el('div', 'kmt-osoby'); oso.hidden = true;
    oso.appendChild(el('span', 'kmt-pasek-tyt', 'Komentujesz jako:'));
    var przyciski = OSOBY.map(function (n) {
      var b = el('button', 'kmt-osoba', nazwa(n));
      b.setAttribute('data-osoba', n);
      b.style.color = KOLOR[n]; b.style.borderColor = KOLOR[n];
      b.type = 'button';
      b.setAttribute('aria-pressed', n === osoba ? 'true' : 'false');
      b.addEventListener('click', function () {
        osoba = n; lsSet(n);
        przyciski.forEach(function (x) { kolorujOsobe(x, x.getAttribute('data-osoba') === n); });
      });
      kolorujOsobe(b, n === osoba);
      oso.appendChild(b);
      return b;
    });
    inn.appendChild(oso);

    calaBtn = el('button', 'kmt-btn');
    ustawCalaBtn();
    calaBtn.type = 'button';
    calaBtn.setAttribute('aria-expanded', 'false');
    calaBtn.setAttribute('data-kmt-btn', CALA);
    calaBtn.addEventListener('click', function () {
      var otw = cala.hidden;
      cala.hidden = !otw;
      calaBtn.setAttribute('aria-expanded', otw ? 'true' : 'false');
      dopasujPadding();
    });
    inn.appendChild(calaBtn);

    var odsw = el('button', 'kmt-btn', 'Odśwież komentarze');
    odsw.type = 'button';
    odsw.setAttribute('data-kmt', 'odswiez');
    odsw.addEventListener('click', function () { setStatus('Odświeżam…'); pobierz(); });
    inn.appendChild(odsw);

    status = el('span', 'kmt-info');
    inn.appendChild(status);

    var min = el('button', 'kmt-btn kmt-min', 'Zwiń');
    min.type = 'button';
    min.addEventListener('click', function () {
      pasek.hidden = true; pill.hidden = false; dopasujPadding();
    });
    inn.appendChild(min);
    pasek.appendChild(inn);

    var pill = el('button', 'kmt kmt-pill', '💬 Komentarze do całej strony');
    pill.type = 'button';
    pill.hidden = true;
    pill.addEventListener('click', function () { pasek.hidden = false; pill.hidden = true; cala.hidden = false; calaBtn.setAttribute('aria-expanded', 'true'); dopasujPadding(); });

    document.body.appendChild(pasek);
    document.body.appendChild(pill);
    // Tomek 12.10: bez paska z wyborem osoby — osoba wybierana w polu komentarza; pasek schowany, zostaje przycisk
    pasek.hidden = true; pill.hidden = false;
  }
  function kolorujSel(sel) {
    var n = sel.value; sel.style.color = n ? KOLOR[n] : '#7a5a1e'; sel.style.borderColor = n ? KOLOR[n] : '#B9802A'; sel.style.fontWeight = n ? '800' : '600';
  }
  function kolorujOsobe(b, wyb) {
    var n = b.getAttribute('data-osoba');
    b.setAttribute('aria-pressed', wyb ? 'true' : 'false');
    b.style.background = wyb ? KOLOR[n] : '#fff';
    b.style.color = wyb ? '#fff' : KOLOR[n];
  }
  function dopasujPadding() {
    // miejsce pod paskiem, żeby nie zasłaniał końca strony
    var h = pasek && !pasek.hidden ? pasek.offsetHeight : 0;
    document.body.style.paddingBottom = h ? (h + 8) + 'px' : '';
  }

  function nota(tekst) {
    var n = el('div', 'kmt kmt-nota', tekst);
    var x = el('button', 'kmt-btn', 'OK');
    x.type = 'button'; x.style.marginLeft = '8px'; x.style.minHeight = '28px'; x.style.padding = '4px 10px';
    x.addEventListener('click', function () { n.remove(); });
    n.appendChild(x);
    document.body.appendChild(n);
  }

  /* ---------- start ---------- */
  function start() {
    stylDodaj();
    if (!API) {
      if (location.protocol === 'file:') nota('Komentarze działają po uruchomieniu serwera.');
      else nota('Komentarze: serwer jeszcze niepodłączony.');
      return;
    }
    // Tomek 12.10: bez paska i bez komentarzy do całej strony — komentuje się konkretną propozycję
    var z = znajdzKotwice();
    z.elementy.forEach(wstawKotwice);
    dopasujPadding();
    window.addEventListener('resize', dopasujPadding);
    pobierz();   // JEDNO zapytanie GET na wczytanie; dalej tylko przycisk „Odśwież komentarze"
    // Kotwice zmieniane dynamicznie (np. para w H2H po zmianie sklepu/widoku) — bez nowego zapytania do serwera
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        var zmiana = false;
        muts.forEach(function (m) {
          if (m.type === 'attributes' && m.target.hasAttribute && m.target.hasAttribute('data-komentarz')) {
            var host = m.target, stary = m.oldValue;
            if (stary && kotwice[stary] && kotwice[stary].host === host) {
              var w = kotwice[stary].btn && kotwice[stary].btn.parentNode;
              if (w && w.parentNode) w.parentNode.removeChild(w);
              delete kotwice[stary];
            }
            wstawKotwice(host); zmiana = true;
          } else if (m.type === 'childList') {
            Array.prototype.forEach.call(m.addedNodes, function (n) {
              if (n.nodeType !== 1 || (n.closest && n.closest('.kmt'))) return;
              if (n.hasAttribute('data-komentarz')) { wstawKotwice(n); zmiana = true; }
              Array.prototype.forEach.call(n.querySelectorAll ? n.querySelectorAll('[data-komentarz]') : [], function (x) { wstawKotwice(x); zmiana = true; });
            });
          }
        });
        if (zmiana) odswiezWidok();
      }).observe(document.body, { attributes: true, attributeFilter: ['data-komentarz'], attributeOldValue: true, subtree: true, childList: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
