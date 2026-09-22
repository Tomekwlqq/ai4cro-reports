# TECH SETUP — wdrożenie automatów A0–A7 u Dobry Dach

> Propozycja technicznego wdrożenia · v2, 2026-08-17 (v1: 2026-08-11).
> Cel: automaty żyją **u klienta**, nie na moim Macu.
> Zasady: **odczyt z bazy tylko przez konto read-only** · zero zmian w Subiekcie · zero obsługi po stronie firmy.

---

## 0. Najpierw rozdzielenie, bez którego cała reszta się myli

W tym projekcie „agent" to **dwie różne rzeczy** i mają zupełnie inne wymagania:

| | **Runner** (Python) | **Model** (Claude API) |
|---|---|---|
| Co robi | łączy się z bazą, liczy, wysyła maile, pisze do kalendarza | czyta skan projektu (A1), formatuje tekst, sprawdza umowę |
| Gdzie musi być | **blisko bazy** — musi ją widzieć po sieci | w chmurze Anthropic; wywoływany przez HTTPS |
| Co widzi | całą bazę w trybie odczytu | **tylko to, co runner mu wyśle w zapytaniu** |
| Kto liczy pieniądze | ✅ runner — deterministycznie, w SQL/Pythonie | ❌ nigdy; model nie dotyka marż ani rozliczeń |

**Konsekwencja praktyczna:** pytanie „gdzie postawić AI" jest źle postawione. Stawiamy **runnera**.
Model nie potrzebuje niczego w biurze klienta — ani serwera, ani dostępu do bazy, ani konta.

**Co realnie trafia do modelu** (do powiedzenia klientowi wprost, bo o to zapyta):
- A1: treść skanu projektu (wymiary dachu) — bo bez tego nie ma czego czytać;
- opcjonalnie: sformułowanie zdania w raporcie.
- **Nie trafiają:** marże, ceny zakupu, dane kontrahentów, salda, rozrachunki, kwoty faktur.
  Te liczby liczy Python i wkleja do gotowego szablonu.

---

## 1. Gdzie ma mieszkać runner — cztery opcje i werdykt

Baza Subiekt GT to MS SQL Server. W firmach tej wielkości stoi zwykle **na serwerze/mocnym pececie w biurze**
(GT jest aplikacją desktopową; chmura InsERT dotyczy głównie linii Nexo). Do potwierdzenia — to pytanie nr 1 z checklisty.

| Opcja | Koszt | Kto to utrzymuje | Ryzyko | Werdykt |
|---|---|---|---|---|
| **A. VPS Linux + tunel do biura** | ~40–80 zł/mc | my (SSH) | wymaga zgody na tunel; jedna instalacja w biurze | ❌ odrzucona (26.08) |
| **B. Maszyna w biurze, nigdy nie zasypiająca** | 0 zł | my (przez RDP) | aktualizacje restartują; Task Scheduler cichnie | ✅ **rekomendacja (decyzja 26.08)** |
| **C. Mini-PC z Linuxem w biurze** | ~1200 zł raz | my (przez Tailscale) | jedno urządzenie więcej w szafie | ➖ zapas, gdy B odpada |
| **D. Chmura InsERT** | wg umowy | provider | tylko jeśli baza już tam jest | zależne od pytania nr 1 |

### Dlaczego nie „niezasypiający Windows w biurze", skoro jest za darmo

Zasypianie to najmniejszy problem i da się je wyłączyć. Prawdziwe koszty opcji B:

1. **Kto to podnosi o 7 rano, gdy nie wyszedł raport.** Bez SSH każda awaria = telefon do biura,
   ktoś musi znaleźć maszynę, zalogować się, kliknąć. To jest dokładne przeciwieństwo „zero obsługi dla firmy".
2. **Aktualizacje Windows restartują maszynę** w środku nocy i nie pytają o zdanie.
   Zadanie w Task Schedulerze wraca po restarcie tylko wtedy, gdy jest dobrze skonfigurowane — a i tak nie zawsze.
3. **Task Scheduler przy wylogowanym użytkowniku** wymaga konta serwisowego z „Log on as a batch job".
   To robota dla ich informatyka, nie dla nas.
4. **Ta sama maszyna obsługuje Subiekta.** Jeśli nasz skrypt cokolwiek zamuli, obrywa produkcja.

Opcja B ma sens **wtedy i tylko wtedy**, gdy mają realny serwer (Windows Server, nie stanowisko księgowej),
konto serwisowe i zgodę na zdalny dostęp. Wtedy jest dobra — zero sieciowej ekwilibrystyki.

### Rekomendowany kształt (opcja B — maszyna w biurze, always-on)

```
                     BIURO KLIENTA
┌──────────────────────────────────────┐
│  maszyna always-on (Windows)         │
│  ├ MS SQL Server                     │
│  │  ├ baza KOMANDYTOWA               │
│  │  └ baza JAWNA                     │
│  ├ runner (Python) — przez LAN       │
│  ├ Task Scheduler (7:00, 7:05, ...)  │
│  └ logi + watchdog                   │
└──────────────┬───────────────────────┘
               ├──► SMTP poczta.dobry-dach.pl:587   (raporty, alerty)
               ├──► Google Calendar API (OAuth)     (A4)
               └──► Claude API                      (tylko A1: skan projektu)
```

Zarządzanie zdalne: **RDP** (wirtualny pulpit) — bez tuneli, bez otwierania portów,
bez Tailscale. Runner widzi bazę przez sieć lokalną biura, nie przez internet.

---

## 2. Dostępy — pełna lista (co, gdzie, na jakich prawach)

| # | Do czego | Rodzaj dostępu | Kto zakłada | Potrzebne dla |
|---|---|---|---|---|
| 1 | Baza **komandytowa** (Subiekt) | konto SQL `dd_auto`, **GRANT SELECT** | admin klienta | A0, A2, A3, A5, A6, A7 |
| 2 | Baza **jawna** (Subiekt) | to samo konto, **GRANT SELECT** na drugiej bazie | admin klienta | A6 (faktury do klienta), A7 (komplet dokumentów) |
| 3 | Sieć do serwera bazy | LAN biura (runner stoi na tej samej maszynie/sieci) | — | wszystkie automaty czytające bazę |
| 4 | SMTP `poczta.dobry-dach.pl:587` | login + hasło skrzynki nadawczej | klient | A0, A4, A5, A6 |
| 5 | Google Calendar (6 pojazdów) | OAuth — **działa**, zweryfikowane 17.08 | ✅ mamy | A4 |
| 6 | Claude API | klucz | my | A1 (i tylko A1) |
| 7 | Adresy PH (kategoria → osoba → mail) | tabelka od klienta | klient | A5 |
| 8 | Sfera (InsERT) — **zapis** do Subiekta | licencja + stanowisko Windows | klient | **wyłącznie A2** |

**Dwie bazy, nie jedna** — to najważniejsza poprawka względem v1 tego dokumentu.
Materiały, ZK i WZ żyją w komandytowej, a faktury do klienta wychodzą z jawnej.
A6 liczony wyłącznie na komandytowej pokazuje niepełny obraz sprzedaży, a A7 nie zbierze kompletu dokumentów.
Jeśli obie bazy są na tej samej instancji SQL — to jedno konto i dwa `GRANT SELECT`, nie dwa wdrożenia.

**Zasada minimalnych uprawnień:** `dd_auto` ma tylko SELECT. Żaden automat poza A2 nie zapisuje do Subiekta,
a A2 robi to przez Sferę (oficjalne API InsERT), nie przez SQL — bo zapis po SQL-u łamie licencję i spójność bazy.

```sql
-- na instancji SQL klienta, per baza:
CREATE LOGIN dd_auto WITH PASSWORD = '<z .env>';
USE [<baza_komandytowa>]; CREATE USER dd_auto FOR LOGIN dd_auto;
  ALTER ROLE db_datareader ADD MEMBER dd_auto;
USE [<baza_jawna>];       CREATE USER dd_auto FOR LOGIN dd_auto;
  ALTER ROLE db_datareader ADD MEMBER dd_auto;
```

---

## 3. Architektura katalogu

```
MASZYNA W BIURZE (always-on, Windows)
├── C:\AI_DD\dd-automaty\   (repo — git private)
│   ├── auto4_final.py      A6: raport PH (działa end-to-end)
│   ├── gcal_events.py      A4: odczyt kalendarzy (działa)
│   ├── gcal_auth.py        A4: autoryzacja
│   ├── .env                ⚠️ hasła: DB (×2 bazy), SMTP, token OAuth — chmod 600, POZA repo
│   ├── logs/               dzienne logi automatów, rotacja 30 dni
│   └── venv/               python 3.11 + pymssql + google-api-python-client
└── Task Scheduler (konto serwisowe)
    ├── 07:00  A6 → raport PH
    ├── 07:05  watchdog → sprawdza WSZYSTKIE automaty z ostatniej doby
    ├── co 15 min  A4 → porównywarka terminów (gdy wdrożony)
    ├── co 30 min  A5 → nowe WZ (gdy wdrożony)
    └── pon 7:30   A7 → rozjazdy ZK vs WZ (gdy wdrożony)
```

`.env` trzyma **dwa connection stringi** (komandytowa + jawna) albo jeden host i dwie nazwy baz.

---

## 4. Harmonogram

| Automat | Trigger | Godzina | Uwagi |
|---|---|---|---|
| A6 raport PH | Task Scheduler dzienny | **7:00** (propozycja) | dane z poprzedniego dnia; obie bazy |
| A4 terminy | Task Scheduler co 15 min | — | **start jako raport rozjazdów**, zapis eventów dopiero po akceptacji logistyków |
| A5 WZ→PH | Task Scheduler co 30 min | — | wymaga tabeli adresów PH |
| A7 ZK vs WZ | Task Scheduler tygodniowy | pon. 7:30 | obie bazy |
| Watchdog | Task Scheduler dzienny | 7:05 | patrz niżej — sprawdza wszystkie, nie tylko A6 |

---

## 5. Bezpieczeństwo

1. **Konto SQL tylko do odczytu** (`db_datareader`), osobne hasło, nie konto administratora.
2. **`.env` poza repo**, `chmod 600`; w repo tylko `.env.example` bez wartości.
3. **Maszyna w biurze**: RDP tylko przez VPN biura (nie publiczny RDP!), konto serwisowe bez uprawnień admina, aktualizacje poza oknem 7:00.
4. **Brak tuneli** — runner na LAN biura, zero otwartych portów na firewallu.
5. **Token OAuth Google** — refresh token; aplikacja w trybie „Testing" bywa ucinana przez Google.
   **Stan faktyczny: token założony 10.08 działał jeszcze 17.08** (37 eventów odczytanych).
   Publikacja aplikacji w Cloud Console dalej zalecana — nie dlatego, że dziś nie działa,
   tylko dlatego, że Google może uciąć dostęp bez ostrzeżenia, a automat padnie po cichu.
6. **Backup**: kopia folderu wiedzy/skryptów (lokalnie na maszynie + dysk zewnętrzny/OneDrive) + kopia `.env` w menedżerze haseł. Repo online nie jest wymagane — maszyna pracuje local-first. Skrypty deterministyczne, exit 0/1.
7. **Dane osobowe**: do modelu nie idą kontrahenci ani kwoty (patrz sekcja 0).

---

## 6. Monitoring — watchdog zamiast wiary

Wersja 1 tego dokumentu sprawdzała tylko A6. To za mało: automat, który nikogo nie budzi,
gdy przestaje działać, po dwóch tygodniach jest gorszy niż jego brak — bo ludzie już mu ufają.

- Każdy automat po przebiegu pisze do `logs/<automat>.log` linię z **liczbą** (ile rekordów, ile maili, ile eventów).
- **Watchdog 7:05** czyta logi z ostatniej doby i sprawdza: czy automat się odpalił, czy skończył bez błędu,
  czy liczba nie jest podejrzanie zerowa (0 nowych ZK w środę = coś nie gra).
- Mail alarmowy tylko przy awarii. Cisza = działa.
- Osobno: **alert braku połączenia z bazą** — najczęstsza awaria przy tunelu, powinna krzyczeć od razu.

---

## 7. Etapy wdrożenia

| Faza | Co | Kryterium akceptacji (liczbowe, nie „działa") |
|---|---|---|
| **0** | Maszyna w biurze (always-on) + Python + `.env`, test na kopii bazy | skrypt łączy się z obiema bazami i wypisuje liczbę ZK |
| **1** | A6 na produkcji (read-only), cron 7:00 | raport o 7:00 na 2 skrzynki; liczby zgodne z Subiektem przy ręcznym sprawdzeniu 3 pozycji |
| **2** | A3 marża + flaga | lista dokumentów z marżą <5% zgadza się z arkuszem Tomasza na próbce miesiąca |
| **3** | A4 jako **raport** rozjazdów | lista „ZK bez transportu" zweryfikowana przez logistyka na 10 pozycjach |
| **4** | A5 WZ→PH | PH potwierdza, że wiadomość przyszła i zgadza się z rzeczywistością |
| **5** | A4 zapis eventów · A7 · A0–A2 | wg decyzji po warsztacie |

---

## 8. Koszty i czas

- **Hosting**: 0 zł/mc — maszyna w biurze klienta (decyzja 26.08). Opcja C (Mini-PC): ~1200 zł jednorazowo, tylko gdy B odpada
- **Claude API**: ~$5–15/mc przy obecnej skali (tylko A1 realnie konsumuje)
- **Wdrożenie fazy 0–1**: ~1 dzień roboczy
- **Obsługa po stronie firmy**: 0 — klient czyta raporty, my utrzymujemy przez RDP

---

## 9. Checklist wdrożenia (do ustalenia z klientem)

- [ ] **Gdzie stoi produkcyjna baza Subiekt** — serwer w biurze / chmura / stanowisko?
- [ ] Czy admin może utworzyć konto `dd_auto` z SELECT — **na obu bazach** (komandytowa + jawna)?
- [x] **Hosting: maszyna w biurze (always-on) — decyzja 26.08** (zero VPS, zero Tailscale)
- [ ] Czy maszyna ma wyłączone usypianie i ustawione aktywne godziny (poza 7:00)?
- [ ] Godzina raportu A6 (propozycja 7:00) + odbiorcy (tomekw@ + tomekj@)?
- [ ] Login i hasło skrzynki nadawczej SMTP?
- [ ] **Tabela: kategoria (CD, MR, LR, SM, GG, MP, GM, BK, LP) → osoba → mail/telefon** (potrzebne do A5)
- [ ] Czy mają licencję Sfera (dotyczy wyłącznie A2 — zapis do Subiekta)?
- [ ] Publikacja aplikacji OAuth w Cloud Console (1 klik, zabezpiecza A4 na przyszłość)
