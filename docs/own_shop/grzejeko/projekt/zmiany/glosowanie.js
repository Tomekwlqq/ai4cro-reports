/* glosowanie.js — głosowanie zespołu grzejeko na wersję startową kafla (Tomek 29.10).
   UX (Tomek: „nie przenoś”, „pod nimi głosowanie”, „wygląda jak głosowanie na paski”): kafle zostają na miejscu,
   pod kaflami każdej wersji jest blok głosu; na dole ekranu cienki pasek „Głosujesz jako” + kto na co głosował.
   Osobna instancja grzejeko-glosy (kopia kodu workera CC, własna baza i lista osób; hub/glosy_worker) — zespół CC jej nie widzi.
   Głos = typ „komentarz”, kotwica „glos-start”, tekst = JSON {wariant, uwaga}; liczy się OSTATNI głos każdej osoby. */
(function () {
  var S = document.currentScript, API = "https://grzejeko-glosy.waleqq.workers.dev/api/komentarze";
  var STRONA = S.dataset.strona, OSOBY = (S.dataset.osoby || "Tomek,Rafał,Bartek").split(","), KOTW = "glos-start";
  var css =
    ".gl-v{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;background:#f4f6fa;border-radius:14px;padding:14px 16px;margin:14px 0 6px}" +
    ".gl-v button.gl-g{font:inherit;cursor:pointer;min-height:48px;padding:0 22px;border-radius:10px;border:0;background:#2251f0;color:#fff;font-weight:700;font-size:15px}" +
    ".gl-v.moj button.gl-g{background:#0a7a4b}.gl-v .gl-n{font-size:14px;color:#5b667a}.gl-v .gl-n b{color:#0f1a2e}" +
    ".gl-v details{flex-basis:100%;font-size:13.5px}.gl-v summary{cursor:pointer;color:#2251f0;font-weight:600;min-height:32px;display:inline-flex;align-items:center}" +
    ".gl-v textarea{width:100%;min-height:60px;border:1px solid #e3e7ef;border-radius:10px;padding:10px;font:inherit;font-size:14px;margin-top:6px;box-sizing:border-box;background:#fff}" +
    ".gl-bar{position:fixed;left:0;right:0;bottom:0;z-index:200;background:#fff;border-top:1px solid #e3e7ef;padding:8px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:13.5px;color:#0f1a2e}" +
    ".gl-bar .os{display:flex;gap:6px;align-items:center}.gl-bar .os button{font:inherit;cursor:pointer;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #e3e7ef;background:#fff;font-weight:600}" +
    ".gl-bar .os button[aria-pressed=true]{background:#0f1a2e;border-color:#0f1a2e;color:#fff}.gl-bar .wy{color:#5b667a}.gl-bar .wy b{color:#0f1a2e}" +
    "body{padding-bottom:110px}.gl-v button:focus-visible,.gl-bar button:focus-visible{outline:2px solid #2251f0;outline-offset:2px}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // wersje: kafel startowy (#b0) + sekcje wariantów; blok głosu ląduje pod ostatnim widokiem kafli w sekcji
  var opcje = [];
  function pod(el) { var k = el.querySelectorAll("article.k"); if (!k.length) return null; var last = k[k.length - 1]; return last.closest("figure") || last.parentNode; }
  var b0 = document.getElementById("b0"); if (b0) opcje.push({ id: "start", nazwa: "kafel startowy", el: b0 });
  document.querySelectorAll("section.wa[id]").forEach(function (s) { opcje.push({ id: s.id, nazwa: s.id.toUpperCase(), el: s }); });
  opcje.forEach(function (o) {
    var v = document.createElement("div"); v.className = "gl-v"; v.dataset.w = o.id;
    v.innerHTML = '<button type="button" class="gl-g">Głosuję na ' + o.nazwa + '</button><span class="gl-n"></span>' +
      '<details><summary>Dodaj uwagę do głosu</summary><textarea aria-label="Uwaga do głosu"></textarea></details>';
    var f = pod(o.el);
    if (f && f.parentNode) f.parentNode.insertBefore(v, f.nextSibling); else o.el.appendChild(v);
    o.v = v;
  });

  var bar = document.createElement("div"); bar.className = "gl-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Głosowanie");
  bar.innerHTML = '<span class="os">Głosujesz jako: ' + OSOBY.map(function (o) { return '<button type="button" data-o="' + o + '">' + o + '</button>'; }).join("") + '</span><span class="wy" aria-live="polite"></span>';
  document.body.appendChild(bar);
  var WY = bar.querySelector(".wy");

  var osoba = null; try { osoba = localStorage.getItem("grzejeko-glos-osoba"); } catch (e) {}
  var glosy = {}, blad = "";
  var nazwa = function (id) { return id === "start" ? "Start" : String(id).toUpperCase(); };

  function rysuj() {
    bar.querySelectorAll("[data-o]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.o === osoba); });
    var n = {}; Object.keys(glosy).forEach(function (a) { (n[glosy[a].wariant] = n[glosy[a].wariant] || []).push(a); });
    opcje.forEach(function (o) {
      var kto = n[o.id] || [], moj = !!(osoba && glosy[osoba] && glosy[osoba].wariant === o.id);
      o.v.classList.toggle("moj", moj);
      o.v.querySelector(".gl-g").textContent = moj ? "Twój głos ✓ " + o.nazwa : "Głosuję na " + o.nazwa;
      o.v.querySelector(".gl-n").innerHTML = kto.length ? "<b>" + kto.length + (kto.length === 1 ? " głos" : " głosy") + "</b>: " + kto.join(", ") : "Jeszcze bez głosów";
    });
    var lider = Object.keys(n).sort(function (a, b) { return n[b].length - n[a].length; })[0];
    WY.innerHTML = blad || ((lider ? "Prowadzi: <b>" + nazwa(lider) + "</b> · " : "") +
      OSOBY.map(function (o) { return o + ": " + (glosy[o] ? "<b>" + nazwa(glosy[o].wariant) + "</b>" : "—"); }).join(" · "));
  }
  function wczytaj() {
    fetch(API + "?strona=" + encodeURIComponent(STRONA)).then(function (r) { return r.json(); }).then(function (rows) {
      glosy = {}; blad = "";
      (rows || []).filter(function (r) { return r.kotwica === KOTW && r.typ === "komentarz"; }).forEach(function (r) {
        try { var d = JSON.parse(r.tekst); glosy[r.autor] = { wariant: d.wariant, uwaga: d.uwaga || "" }; } catch (e) {}
      }); rysuj();
    }).catch(function () { blad = "Głosowanie jeszcze nie działa: baza głosów grzejeko czeka na uruchomienie."; rysuj(); });
  }
  function glosuj(o) {
    if (!osoba) { blad = "Najpierw wybierz na dole, kto głosuje."; rysuj(); blad = ""; return; }
    var ta = o.v.querySelector("textarea");
    var body = { strona: STRONA, kotwica: KOTW, autor: osoba, typ: "komentarz", tekst: JSON.stringify({ wariant: o.id, uwaga: ta.value.trim() }) };
    o.v.querySelector(".gl-n").textContent = "Zapisuję głos…";
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (!x.ok) { o.v.querySelector(".gl-n").textContent = "Głos nie zapisany: " + (x.j.blad || "błąd"); return; } ta.value = ""; wczytaj(); })
      .catch(function () { o.v.querySelector(".gl-n").textContent = "Głos nie zapisany: baza głosów nie odpowiada."; });
  }
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-o]"); if (!b) return;
    osoba = b.dataset.o; try { localStorage.setItem("grzejeko-glos-osoba", osoba); } catch (er) {} rysuj();
  });
  opcje.forEach(function (o) { o.v.querySelector(".gl-g").addEventListener("click", function () { glosuj(o); }); });
  rysuj(); wczytaj();
})();
