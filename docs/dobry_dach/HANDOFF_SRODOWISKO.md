# DOBRY DACH — Projekt Raportów Operacyjnych (N4 + A6)
## Pakiet wiedzy dla środowiska docelowego — czyta Hermes ORAZ Claude

*Aktualizacja: 2026-09-08 · Cel tego pliku: dać KAŻDEJ instancji AI (Hermes, Claude Code) pełny, samowystarczalny obraz projektu — bez potrzeby znajomości historii rozmów.*

---

## 1. O co chodzi (cel, po ludzku)

Firma **Dobry Dach** (wykonawca pokryć dachowych, 2 spółki: komandytowa + jawna) ma problem z porządkiem w obiegu dokumentów i pieniędzy:
- handlowcy (PH) **nie dowiadują się, że towar wyjechał** z magazynu,
- **62% wydań (WZ) nie ma powiązanego zamówienia** (ZK),
- nikt realnie nie pilnuje wpłat (odpowiedź klienta: „nikt"),
- szef widzi problemy za późno.

**Porządek w firmie robi Tomek Jurewicz.** Nasza rola: **dawać raporty, które pokazują stan** — gdzie są dziury, kto wisi z kasą, co się dzieje. **Nie naprawiamy danych** — pokazujemy je tak, żeby można było działać.

**Fundament (ustalenie z klientem 25.08):** raporty budujemy na **WZ-tkach** (realne wydania towaru), NIE na ZK (zamówienia = w praktyce **oferty** — tylko ~34% kończy się wydaniem; kategoria „Sprzedaż" = 995 ZK / 90,7 mln zł to worek ofert, nie portfel).

---

## 2. Środowisko i dane

| Element | Wartość |
|---|---|
| Docelowe źródło | serwer `192.168.1.199,1273` (Windows, Subiekt GT) |
| Bazy | `_2024_KOMANDYTOWA`, `_2024_JAWNA`, `_2022_VIA`, `_2024_ZOO` |
| Konto SQL | `audytor_readonly`, tylko SELECT (`db_datareader`), `ApplicationIntent=ReadOnly` |
| Do tej pory (testy) | lokalna kopia `Kopia_2024_KOMANDYTOWA` (Docker, mssql 2022) — **tylko komandytowa** |
| Koniec danych w kopii | 07.08.2026 (anomalia: FV z datą 2026-12-31 — do wyjaśnienia) |
| Raporty/testy | lipiec 2026 jako miesiąc zamknięty; dzień testowy = 07.08 |

**⚠️ KLUCZOWE OGRANICZENIE (odkryte 08.09):** prawdziwa **kasa klienta końcowego żyje w bazie JAWNEJ** — FV do klienta (usługa 8%, „Prace budowlane na budynku mieszkalnym") wystawia spółka jawna, tam też wpływają wpłaty. Baza jawna **nie była dostępna w kopii** → raporty kasy (wpłaty, należności) liczone tylko z komandytowej **kłamią**. **Raporty finansowe A6 trzeba budować/przeliczać na środowisku z obiema bazami.**

---

## 3. MODEL POŁĄCZEŃ DOKUMENTÓW (kanon — JEDEN zbiór reguł)

### 3.1 Typy dokumentów (potwierdzone w bazie)

| Typ | Dokument | Rola | Pozycje przez |
|---|---|---|---|
| 11 | WZ — wydanie z magazynu | **towar WYSZEDŁ** | `ob_DokMagId` (magazynowe) |
| 16 | ZK — zamówienie klienta | **oferta** (nie sprzedaż!) | `ob_DokHanId` (handlowe) |
| 2 | FS — faktura sprzedaży | rozliczenie | `ob_DokHanId` |
| 1 | FZ — faktura zaliczkowa | zaliczka | `ob_DokHanId` |
| 21 | PA — paragon | sprzedaż detaliczna (liczy się jako pokrycie!) | `ob_DokHanId` |
| 5 | KFZ — korekta faktury | korekta FS/FZ | `ob_DokHanId` |
| 10 | PZ — przyjęcie | towar DO magazynu | `ob_DokMagId` |

Statusy ZK: **6** = otwarte/bez rezerwacji, **7** = z rezerwacją (logistyk po mailu PH), **8** = zrealizowane.
Statusy WZ: **1** = aktywne, **0/3** = anulowane/wycofane (nie liczyć w raportach).

### 3.2 Trzy fizyczne mechanizmy powiązań (raport MUSI sprawdzać wszystkie)

**A. Pole `dok_DoDokId`** („dokument powiązany"):
- **ZK → WZ**: 6 648 w całej bazie ← **główne powiązanie ZK↔WZ** (ZK wskazuje WZ!)
- WZ → FS: 16 834 (WZ wskazuje fakturę)
- FS → ZK: 3 016 (faktura wraca do zamówienia)
- WZ → ZK na polu: tylko ~10 w całej bazie (ale BYWA — klient miał rację, pole bywa FS/ZK/PA)

**B. Wspólna pozycja magazynowa**: ta sama `dok_Pozycja` ma `ob_DokMagId` = WZ **i** `ob_DokHanId` = dokument handlowy (FS/PA). Przykład: poz. 620037 = WZ 1622 + PA 12. **127 WZ lipca ma dokument TYLKO tą drogą** — bez sprawdzenia = fałszywe dziury.

**C. Relacja pozycji `ob_DoId`** — pozycja wskazuje inną pozycję (PZ, korekty).

### 3.3 Algorytm kwalifikacji WZ (kolejność ważna, każdy WZ w 1 klasie)

1. ZK wskazuje WZ (`zk.dok_DoDokId = wz`) LUB pole na WZ = ZK → **ZK**
2. Pole na WZ = FS/FZ LUB wspólna pozycja ma FS/FZ → **FS**
3. Pole na WZ = PA LUB wspólna pozycja ma PA → **PA (detal — pokrycie!)**
4. Wspólna pozycja ma KFZ (typ 5) → **FS** (korekta dziedziczy)
5. Nic → **GOŁE ⚠️ (dziura — towar wyjechał bez dokumentu)**

### 3.4 Moment domknięcia

432 z 450 par WZ→dokument w lipcu = **ten sam dzień** (96%). WZ musi dostać dokument handlowy w dniu wystawienia. GOŁE starsze niż 1 dzień = realna dziura (do pokazania Jurze, nie do ukrycia).

### 3.5 Klient / PH / inwestycja

- **NAZWA KLIENTA = `vwKlienci.adr_NazwaPelna` / `adr_Nazwa`** (join po `kh_Id`) — **NIGDY `kh_Nazwisko`/`kh_Symbol` z `kh__Kontrahent`** (puste dla firm! błąd v1-v2 N4, złapany 08.09 — masowy pusty klient = błąd join, nie rzeczywistość)
- Klient WZ = `dok_OdbiorcaId` → `vwKlienci`; klient faktury (prezentacja) = `dok_PlatnikId` (nabywca)
- **PH = kategoria dokumentu** `dok_KatId` → `sl_Kategoria` (CD, MR, LR, SM, GG, MP, GM, BK, LP) — NIE osoba wystawiająca (`dok_PersonelId`, 87% rozjazdu!)
- **Inwestycja = osobna kartoteka klienta** (wzorzec TELMAX: 12 kartotek „TELMAX + inwestycja" — MIROSŁAWIEC, LODOWISKO, HALA CZŁUCHÓW… każda z własnymi ZK/WZ/FS); OPISY na FV z jawnej — do sprawdzenia na środowisku
- Spółki powiązane w kartotece komandytowej: 74 = komandytowa, **382 = jawna** (HURTOWNIA POKRYĆ DACHOWYCH DOBRY DACH MAREK PESTKA I WSPÓLNICY SP. JAWNA), 642 = sp. z o.o. — przy raportach kasy oddzielać (rozliczenia wewnętrzne ≠ klienci)

### 3.6 Czego NIE wolno raportowi

- nazwa klienta ≠ powiązanie (nie uznawać za pokryte „bo klient się zgadza")
- nie mieszać `dok_OdbiorcaId` z `dok_PlatnikId`
- nie liczyć dwa razy (pole ORAZ pozycja = jedna faktura)
- nie chować nierozstrzygniętych — GOŁE zostaje widoczne kontrolnie
- **flaga jakości**: >5% WZ „bez klienta" = sprawdź join do vwKlienci, zanim ogłosisz dziurę

---

## 4. RAPORT N4 — dziennik WZ

**Cel:** codziennie pokazać każde wydanie z magazynu: kto (klient), czy ma pokrycie (ZK/FS/PA), jaką drogą. Likwiduje dziurę „nie wiem czy towar wyjechał i do kogo".

**Kolumny (5/5 zmapowane):** WZ (`dok_NrPelny`, typ 11) · Data (`dok_DataWyst`) · Klient (`vwKlienci.adr_NazwaPelna` przez `dok_OdbiorcaId`) · Kategoria→PH (`dok_KatId`→`sl_Kategoria`) · Czy ma ZK (EXISTS ZK→WZ przez `dok_DoDokId`, typ 16).

**Stan:** generator `build_raport_n4.py` (działa na kopii komandytowej). Skala lipca 2026 (802 WZ): 282 ✓ ZK · 291 FS · 30 PA · **197 GOŁE** · 2 anul. Po poprawkach klienta z `vwKlienci` — walidacja 07.08: 1/23 bez nazwy (nie 13!).

**Wersja rozszerzona (v2/v3):** klasyfikacja pełną logiką 3 mechanizmów + kolumna „Droga" (JAK doszliśmy do klasy — dowód, nie zgadywanie).

**Do decyzji:** odbiorcy (per PH vs zarząd), godzina wysyłki, czy PA pokazywać jako osobną klasę (klient: „PA raczej tak, to sprzedaż detaliczna — było w notatkach").

---

## 5. RAPORT A6 — stan PH / obieg pieniądza

**Cel (przebudowany 08.09 od celu):** codziennie rano widać **KASĘ**:
1. ile wpłynęło (dziś / narastająco),
2. **kto wisi** (należności per KLIENT — jeden wiersz = klient, nie faktura),
3. co się dziś ruszyło (nowe oferty, WZ, FV per PH).

**Specyfikacja od klienta (25.08, węzeł 13):** „stan na dzień, sumarycznie do dnia, wszystkich aktywnych (z aktywnym etapem transakcji, łącznie z zakończoną budową i niezapłaceniem), podział per klient: pierwotna wartość ZK (= SUMA pozycji ZK przez `ob_DokHanId`), % realizacji (= koszt WZ / wartość ZK), wartość wydanych towarów (SUMA `ob_WartMag` WZ), suma wystawionych FV (zaliczek), suma wpłat."

**2 wersje:** per PH (każdy widzi tylko swoich klientów — filtr po aktywnych ZK kategorii) + zbiorcza dla Tomasza.

**Wymagania Tomka (08.09):** SUMY i KASA na górze; **jasne daty przy każdej liczbie** (co jest sumą od początku roku/miesiąca, a co z dziś); narastająco od początku roku; per klient nie per faktura; symulacja na 27.07/31.07 (lipiec jako narastający miesiąc testowy).

**⚠️ BLOKERY A6:**
1. **baza jawna** — bez niej wpłaty/należności klientów końcowych NIEWIDOCZNE (patrz §2) → przejście na środowisko docelowe,
2. FZ→ZK — FZ nie ma `dok_DoDokId`, pozycja FZ wskazuje PZ (typ 10), transakcja = 0 — jak wpiąć zaliczkę w ZK (pytanie do klienta),
3. tabela adresów PH (kategoria→osoba→mail) — blokuje wysyłkę per PH.

**Generator:** `build_raport_a6.py` (`--dzien YYYY-MM-DD --out plik.html [--ph kat]`).

---

## 6. Automaty (A0–A7) — status

| Kod | Nazwa | Status |
|---|---|---|
| A6 | Raport dzienny PH | ✅ działa (prototyp 11/11); **przebudowa wg celu KASA w toku** |
| A3 | Flaga marży <5% | 🟡 algorytm gotowy (koszt = `ob_WartMag`, marża = (Netto−Koszt)/Netto) |
| A4 | Terminy/transport (Google Calendar) | 🟡 OAuth działa (6 kalendarzy pojazdów) |
| A5 | WZ → powiadomienie PH | 🔴 brak tabeli adresów PH |
| A7 | ZK vs WZ rozjazdy | 🔴 budować z A5 |
| A0 | Rejestr zapytań | 🔴 decyzja gdzie rejestr |
| A2 | Oferta z ZK (Sfera) | 🔴 wymaga licencji Sfera |
| A1 | Skan projektu PDF | 🔴 czeka na próbki |

**Hosting (decyzja):** maszyna w biurze klienta, always-on (Windows, RDP) — NIE VPS. Python runner + Task Scheduler, konto SQL `dd_auto` (read-only). Dane klienta zostają w sieci biura.

---

## 7. Otwarte pytania / do potwierdzenia na środowisku

1. Czy na środowisku są WSZYSTKIE 4 bazy (zwłaszcza JAWNA)? — warunek raportów kasy
2. Co znaczy status 8 ZK w kontekście „zakończona budowa niezapłacona"? (jak wykryć niedopłatę: salda `nz__Finanse` per klient przez `vwFinanseRozKontrahenci`)
3. FZ→ZK: jak zaliczki wpinają się w zamówienie?
4. Anomalia: FV z datą 2026-12-31
5. OPIS/tytuły na FV z JAWNEJ jako nośnik inwestycji (kejs Telmax — do weryfikacji na jawnej)
6. Tabela adresów PH (kategoria → osoba → mail)
7. Godzina + odbiorcy raportów (odpowiedź z wizyty: „obaj" — Tomek i kierownik)

---

## 8. Pliki i artefakty (gdzie co żyje)

| Plik | Co zawiera |
|---|---|
| `MODEL_POLACZEN_DOKUMENTOW.md` | kanon powiązań (sekcja 3 tego dokumentu, wersja pełna) |
| `PORTFEL_RAPORTOW.html` | mapa pozycja raportu → tabela.kolumna (N4, A6, struktura) |
| `DOBRY_DACH_KNOWLEDGE_BOARD.html` | hub wiedzy — zakładka 📐 REGUŁY POŁĄCZEŃ |
| `build_raport_n4.py` | generator N4 (dziennik WZ) |
| `build_raport_a6.py` | generator A6 (wersja per PH + zbiorcza) |
| `raporty_n4/` | testy: 07.08 (N4 v3, A6 CD, A6 ZBIORCZY), lipiec 2026, STATUSY_WZ |
| `STRUKTURA_WEZLOW.json` | 23 luki procesu + odpowiedzi klienta (węzeł 13 = specyfikacja A6) |
| `odkrycia.json` | 14 odkryć z dowodami |
| `AUTOMATYZACJE_PROJEKT.html` | start-o-meter A0–A7, wymagania, N1–N4 |
| `SESSION_BRIDGE.md` / `STATUS.md` | stan projektu |

**Publikacja live:** https://tomekwlqq.github.io/ai4cro-reports/dobry_dach/ (GH Pages; uwaga: cron GLOV pushuje do tego samego repo — przed każdym pushem `git pull`, po pushu sprawdzać `git status -sb`).

**Zasady pracy:** komunikacja i raporty po polsku; każda pozycja raportu = konkretne pole bazy (mapa w PORTFEL_RAPORTOW); luki oznaczać, nie zgadywać; walidacja na zamkniętym miesiącu (lipiec 2026); backupy przed zmianami.
