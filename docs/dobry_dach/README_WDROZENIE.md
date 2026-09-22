# README — wdrożenie lokalne (Dobry Dach · automaty A0–A7 + N1–N4)

*Dokument dla osoby wdrażającej. Plan i architektura: [SETUP_PLAN.html](SETUP_PLAN.html) · checklista krok po kroku: [SETUP_BOY_PLAN.html#z0](SETUP_BOY_PLAN.html#z0) · szczegóły techniczne: [TECH_SETUP_WDROZENIOWY.md](TECH_SETUP_WDROZENIOWY.md)*

---

## 1. Co jest w tej paczce

| Plik | Do czego |
|---|---|
| `.env.szablon` | **wzór konfiguracji** — skopiuj jako `.env` i uzupełnij (hasła!) |
| `requirements.txt` | zależności Pythona |
| `test_db.py` | test połączenia z obiema bazami — **kryterium fazy 0** |
| `watchdog.py` | pilnowanie automatów (7:05), mail tylko przy błędzie |
| `auto4_final.py` | **A6** — dzienny raport portfeli PH + wysyłka mail |
| `auto4_summary_ph.py` | A6 — wersja zbiorcza |
| `build_raport_n4.py` | **N4** — dziennik wychodzących WZ |
| `build_raport_a6.py` | A6 — budowa raportu z bazy |
| `gcal_auth.py` / `gcal_events.py` | **A4** — autoryzacja i odczyt kalendarzy Google |
| `weryfikacja_faktow.py` | kontrola faktów u źródła (bazy, cennik, atrybuty) |
| dokumentacja `.md` / `.html` | wiedza o procesie i automatach (kanon) |

---

## 2. Środowisko

- **Python** 3.11+ (u nas 3.12) — `python --version`
- **Konto SQL** `dd_auto` z SELECT (`db_datareader`) na obu bazach — **nie `sa`**
- **Katalog roboczy** na maszynie: `C:\dd-automaty\` (Windows) — venv, skrypty, `logs\`
- **Maszyna always-on** u klienta (bez usypiania), dostęp zdalny przez VM/RDP

## 3. Kroki (skrót)

```bash
# 1. Katalog i środowisko
mkdir C:\dd-automaty && cd C:\dd-automaty
python -m venv venv
venv\Scripts\pip install -r requirements.txt

# 2. Konfiguracja
copy .env.szablon .env      # uzupełnij: SUBIEKT_*, MAIL_*
mkdir logs

# 3. TEST — faza 0 zaliczona, gdy widać D W I E liczby
venv\Scripts\python test_db.py

# 4. A6 — najpierw na sucho, potem ostro
venv\Scripts\python auto4_final.py --dry-run
venv\Scripts\python auto4_final.py

# 5. Harmonogram (Task Scheduler)
#    A6          codziennie 7:00  →  venv\Scripts\python.exe C:\dd-automaty\auto4_final.py
#    Watchdog    codziennie 7:05  →  ... watchdog.py
#    (uruchamiaj nawet gdy użytkownik wylogowany — SYSTEM lub konto serwisowe)
```

## 4. Kryteria akceptacji (liczby, nie „działa")

| Faza | Kryterium |
|---|---|
| 0 | `test_db.py` → liczba dokumentów z **obu** baz (komandytowa + jawna) |
| 1 | A6: mail o 7:00 na 2 skrzynki; 3 pozycje sprawdzone ręcznie z Subiektem |
| 2 | A3: lista marży <5% zgodna z arkuszem na próbce miesiąca |
| 3 | A4: lista „ZK bez transportu" potwierdzona przez logistyka na 10 pozycjach |
| 4 | A5: PH potwierdza, że wiadomość przyszła i zgadza się ze stanem |

## 5. Zasady bezpieczeństwa

- `.env` **nigdy** do repo/gita/maila — tylko na maszynie (hasła!)
- konto SQL `dd_auto` = **tylko SELECT**, zero zapisu
- Claude/Hermes **nie widzi bazy** — czyta raporty i logi (MCP filesystem → `logs\`)
- dane klienta nie wychodzą z sieci biura; do API tylko to, co sami wyślemy (np. skan A1)

## 6. Gdy coś nie działa

1. `python test_db.py` — czy bazy odpowiadają
2. `logs\` — co mówi ostatni log automatu
3. `python watchdog.py --dry-run` — pełny przegląd stanu bez wysyłki
4. dopiero potem szukać w kodzie

*Aktualizacja: 2026-09-08 · AI4CRO*
