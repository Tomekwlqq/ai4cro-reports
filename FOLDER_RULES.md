# FOLDER_RULES — eel-reports-pages/docs/

*Ostatnia aktualizacja: 2026-07-29. Powód: 404 w HUB_pumeksy_do_stop.html (iframe szukał `research/` w rocie, plik leżał w `pumeksy/research/`).*

---

## Zasada nadrzędna

**Root `docs/` = globalne huby i cross-klientowe raporty. Wszystko co dotyczy jednego klienta/projektu → subfolder `docs/<klient>/`.**

Jeśli plik ma w nazwie klienta (GLOV_, ANIAKRUK_, PUMEKSY_, itp.) → NIE należy do roota. Wyjątek: pliki które Tomek explicite trzyma na shortlinku bez ścieżki (np. `EEL_HUB.html`, `Agency_Build.html`, `KNOWLEDGE_BASE.html`).

---

## Konwencja nazewnictwa folderów

| Folder | Co to | Kiedy tworzyć |
|---|---|---|
| `docs/glov/` | wszystkie pliki klienta GLOV | nowy klient = nowy folder |
| `docs/aniakruk/` | klient Ania Kruk | j.w. |
| `docs/own_shop/` | własny e-comm Tomka | projekt niekomercyjny |
| `docs/glov/pumeksy/` | subprojekt kategorii pumeksy w ramach GLOV | subkategoria pod klientem |
| `docs/glov/pumeksy/research/` | badania konkurencji dla tej kategorii | gdy jest ANALIZA_KONK lub VISION_SCAN |
| `docs/glov/pumeksy/research/screens/` | screenshoty z researchu | automatycznie przez pipeline |
| `docs/<klient>/screens/` | screenshoty sklepu (homepage, PDP, mapping) | capture pipeline |
| `docs/<klient>/beauty_vision/` | podkatalog raportów vision per brand | batch raportów |

**Zasada głębokości:** max 3 poziomy (`klient/subprojekt/research/`). Głębiej = zamiast folderu prefix w nazwie pliku.

**Nazewnictwo:** lowercase, bez spacji, slug klienta albo slug kategorii. Nie `Pumeksy/`, tylko `pumeksy/`.

---

## IFRAME RULE — jak linkować żeby nie było 404

**Reguła:** iframe `src` musi być relatywny do pliku HTML który go ZAWIERA, nie do `docs/`.

### Przykład: HUB w `docs/glov/pumeksy/HUB_pumeksy_do_stop.html`
```html
<!-- DOBRZE — research/ jest obok HUB w tym samym folderze -->
<iframe src="research/ANALIZA_KONKURENCJI_pumeksy.html"></iframe>

<!-- ŹLE — szuka docs/research/ który nie istnieje -->
<iframe src="research/ANALIZA_KONKURENCJI_pumeksy.html"></iframe>
<!-- (ten sam src ale plik HUB leży w docs/ root = 404) -->
```

**Reguła HUB + iframe:** HUB musi leżeć w tym samym folderze co pliki które ładuje jako iframe. Nie możesz mieć HUB w `docs/` a zasoby w `docs/pumeksy/research/`.

**Alternatywa:** absolutny URL GitHub Pages.
```html
<iframe src="https://tomekwlqq.github.io/eel-reports/glov/pumeksy/research/ANALIZA_KONKURENCJI_pumeksy.html"></iframe>
```
Absolutne = zawsze działa niezależnie od lokalizacji HUB, ale trudniejsze do lokalnego podglądu.

**Zasada przy publish_web.sh:** wywołując skrypt podaj DEST jako pełną ścieżkę `docs/<klient>/...` — skrypt nie zgaduje folderu.
```bash
# DOBRZE
bash _shared/publish_web.sh HUB_pumeksy.html tomekwlqq/eel-reports docs/glov/pumeksy/HUB_pumeksy.html

# ŹLE — ląduje w docs/ root, iframy do research/ będą 404
bash _shared/publish_web.sh HUB_pumeksy.html tomekwlqq/eel-reports docs/HUB_pumeksy.html
```

---

## Tabela typów plików — gdzie co ląduje

| Typ pliku | Przykład | Gdzie | Uwagi |
|---|---|---|---|
| **Globalny HUB** | `EEL_HUB.html`, `Agency_Build.html`, `KNOWLEDGE_BASE.html` | `docs/` root | Cross-klientowe, shortlink bez ścieżki |
| **HUB klienta** | `GLOV_HUB.html`, `HUB_pumeksy_do_stop.html` | `docs/<klient>/` | Nigdy root |
| **HUB kategorii** | `HUB_maska_led_na_twarz.html` | `docs/<klient>/<kategoria>/` | Razem z zasobami które ładuje |
| **MAPA_PERCEPCJI** | `MAPA_PERCEPCJI_pumeksy_v5.5.html` | `docs/<klient>/<kategoria>/` albo root gdy cross-klientowa | |
| **ANALIZA_KONKURENCJI** | `ANALIZA_KONKURENCJI_pumeksy.html` | `docs/<klient>/<kategoria>/research/` | Zawsze w research/ |
| **VISION_SCAN** | `VISION_SCAN_pumeksy_v5.html` | `docs/<klient>/<kategoria>/research/` | j.w. |
| **VISION_REPORT** | `GLOV_VISION_REPORT_V5.html` | `docs/<klient>/` | Nie root |
| **CS (Category Standard)** | `cs_pumeksy_v5.7.html` | `docs/<klient>/<kategoria>/` | Przy odpowiadającym HUB |
| **Screeny sklepu** | `*.png`, `*.jpg` | `docs/<klient>/screens/` | |
| **Screeny research** | `pumeksy_screen_*.png` | `docs/<klient>/<kategoria>/research/screens/` | |
| **`_img/` foldery** | `TRACKSMITH_VISION_REPORT_img/` | `docs/<klient>/` obok `.html` który ich używa | Linked vision — folder musi być obok HTML |
| **JSON data** | `glov_pl_daily.json`, `naprawy_master.json` | `docs/<klient>/` | Pliki danych dla Live dashboardów |
| **Raporty GA4 / SEO** | `GLOV_Full_SEO_Audit_*.html` | `docs/<klient>/` | |
| **`.md` pliki** | `GLOV_20_Frictions.md`, scenariusze | `docs/<klient>/` | Wyjątkowo w repo — gdy brak lepszego miejsca |
| **Globalne `_img/`** | `HOMIES_VISION_REPORT_img/` | `docs/<klient>/` NIE root | Aktualnie błędnie w root — sprzątać |

---

## Co posprzątać (aktualny bałagan)

### Duplikaty pumeksy — plik jest w 3 miejscach
```
docs/HUB_pumeksy_do_stop.html          ← kopia w root (usuń)
docs/pumeksy/                           ← duplikat glov/pumeksy/ (usuń cały folder)
docs/glov/pumeksy/                      ← JEDYNE właściwe miejsce
```
Dotyczy też: `MAPA_PERCEPCJI_pumeksy_v5.5.html`, `cs_pumeksy_v5.7.html` i całego `research/`.

### Duplikat GLOV_audit_screenshots
```
docs/GLOV_audit_screenshots/           ← błędnie w root (usuń lub przenieś)
docs/glov/GLOV_audit_screenshots/      ← właściwe miejsce
```

### Pliki GLOV leżące w root docs/ zamiast w docs/glov/
Przykłady: `GLOV_HUB.html`, `GLOV_VISION_REPORT_V5.html`, `GLOV_Lista_Napraw.html`, `GLOV_Meta_3Poziomy.html`, `GLOV_SEO_Raport_2026-05.html`, `GLOV_Full_SEO_Audit_*.html`, `GLOV_Technical_OnPage_SEO_*.html`, `GLOV_GA4_*.html`, `GLOV_Sciezki_Miesieczny.html`, `GLOV_Audyt_360_*.html`.
Uwaga: `docs/glov/` ma swoje kopie tych plików — przed usunięciem z root sprawdź czy wersje są identyczne.

### Luźne `_img/` foldery w root
```
docs/HOMIES_VISION_REPORT_img/         ← powinno być docs/glov/ albo przy HOMIES_VISION_REPORT.html
```

### `.md` pliki w docs/ root
`GLOV_DEMAKIJAZ_ASORTYMENT.md` — do `docs/glov/` albo do `Projects/Shopify GLOV/`.

---

## publish_web.sh v2.0 — auto-routing + walidacja

Skrypt `_shared/publish_web.sh` ma teraz auto-routing dla `eel-reports`. Bez 3. argumentu — plik sam trafia we właściwe miejsce. Z 3. argumentem — skrypt waliduje czy zgadza się z regułami i ostrzega (nie blokuje).

```bash
# AUTO-ROUTING (zalecane dla eel-reports)
bash ~/Documents/Claude/_shared/publish_web.sh plik.html tomekwlqq/eel-reports
# → skrypt sam wykryje: docs/glov/pumeksy/plik.html (albo docs/ root, albo docs/aniakruk/ etc.)
# → wypisze: "🗂️ Auto-routing: plik.html → docs/glov/pumeksy/plik.html"

# RĘCZNE DEST (np. inne repo, albo override)
bash ~/Documents/Claude/_shared/publish_web.sh plik.html tomekwlqq/eel-reports docs/glov/pumeksy/plik.html

# INNE REPO — stare zachowanie, brak auto-routingu
bash ~/Documents/Claude/_shared/publish_web.sh plik.html tomekwlqq/audi-plichta-raport docs/raport.html
```

**Nowe pliki bez reguły** lądują w `docs/` root z ostrzeżeniem `⚠️ BRAK REGUŁY` na stderr. Jeśli nowy typ pliku powinien trafiać do konkretnego folderu — dodaj `case` w `auto_route()` w skrypcie.
