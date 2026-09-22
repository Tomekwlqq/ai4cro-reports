# Model połączeń dokumentów — Dobry Dach (N4/A6)

*Dokument roboczy 2026-09 · aktualizacja 2026-09-08 (ustalenia z dokumentów procesowych klienta: WZ-rezerwacje 3-dniowe, zwroty PNBM) · **korekta 2026-09-21: definicje typów 1/2/15 poprawione pomiarem na kopii** (typ 1 = faktura zakupu, zaliczka = FS podtyp 4/5, typ 15 = zamówienie do dostawcy) · cel: jeden, wspólny sposób czytania powiązań w bazie Subiekt (Kopia_2024_KOMANDYTOWA). Porządek w firmie robi Tomek Jurewicz — my dajemy raport, który pokazuje stan.*

## 1. Typy dokumentów (potwierdzone w bazie)

| Typ | Dokument | Rola | Pozycje przez |
|---|---|---|---|
| 11 | WZ — wydanie z magazynu | towar WYSZEDŁ | `ob_DokMagId` (magazynowe) |
| 16 | ZK — zamówienie klienta | umowa/oferta na towar | `ob_DokHanId` (handlowe) |
| 15 | ZD — zamówienie do DOSTAWCY | osobny typ (NIE podtyp ZK); strona zakupowa: realizowane PZ (265 przez `dok_DoDokId`) i korygowane ZD→ZD (66); FZ (faktura zakupu) wpina się w nie polem — 578 z 8 934 | `ob_DokHanId` |
| 2 | FS — faktura sprzedaży | rozliczenie (też: FV z KOM); **podtyp 4 i 5 = faktura VAT zaliczkowa cząstkowa / końcowa** (798 + 691 szt.) — to tu siedzi zaliczka, nie w typie 1 | `ob_DokHanId` |
| 1 | FZ — faktura ZAKUPU | zakup od dostawcy (rozrachunek typ 40 „zobowiązania": 8 922 z 8 934; PZ wskazuje na nią w 8 368 przypadkach; pozycje towarowe w 8 934/8 934). **NIE jest fakturą zaliczkową** | `ob_DokHanId` |
| 21 | PA — paragon | sprzedaż detaliczna | `ob_DokHanId` |
| 5 | KFZ — korekta faktury | korekta FS/FZ | `ob_DokHanId` |
| 10 | PZ — przyjęcie | towar DO magazynu | `ob_DokMagId` |

**Ustalenie 2026-09-08 (z dokumentów procesowych klienta) — SKORYGOWANE 2026-09-21 pomiarem na kopii:** typ 15 ZD = osobny typ (NIE podtyp ZK), ale jest to **zamówienie do dostawcy** — 1 480 z 1 480 dokumentów ma w `dok_Tytul` nazwę „Zamówienie do dostawcy", a wiążą się z nim PZ (265) i FZ (578), czyli strona zakupowa. Wcześniejsze czytanie „ZD = zamówienie zaliczkowe" wzięło się z języka dokumentów procesowych klienta i **nie ma potwierdzenia w bazie**. FZ (typ 1) z `dok_DoDokId` (578 z 8 934) wskazują WYŁĄCZNIE ZD, NIGDY ZK — to nie „łańcuch zaliczkowy", a faktura zakupu wystawiona z zamówienia do dostawcy. **Łańcuch zaliczek klienta siedzi gdzie indziej:** ZK (typ 16) z `dok_StatusEx` 16/24/25 (1 423 szt.), z czego **1 417 ma fakturę zaliczkową FS (typ 2) podtyp 4/5 wpiętą polem** — patrz §3A. Źródło liczb: `PROJEKT/2026-09-21_korekta-typy-dokumentow_AUTO.md` (pomiar na kopii 07.08, 2026-09-21).

## 2. Cztery fizyczne mechanizmy powiązań (KLUCZ)

W Subiekcie dokumenty łączą się na **cztery sposoby** — raport musi sprawdzać WSZYSTKIE, bo każdy bywa użyty:

**A. Pole `dok_DoDokId` na dokumencie** („dokument powiązany" w UI)
- WZ → wskazuje **FS** (najczęściej: 16 834 w całej bazie) albo **ZK** (rzadko: 10), albo PA
- ZK → wskazuje **WZ** (6 648) ← to jest główne powiązanie ZK↔WZ!
- FS → wskazuje **ZK** (3 016) ← faktura wraca do zamówienia — zgodne z instrukcją klienta: **FS wystawia się Z ZAMÓWIENIA, nie z WZ**
- FZ (typ 1, **faktura zakupu**) → wskazuje **ZD** (typ 15, zamówienie do dostawcy): 578 z 8 934 — WYŁĄCZNIE ZD, NIGDY ZK (typ 16). To strona zakupowa, nie zaliczkowa
- FS zaliczkowa (typ 2, podtyp 4/5) → wskazuje **ZK** (typ 16) — 1 417 z 1 423 zamówień zaliczkowych ma wpiętą fakturę zaliczkową polem; to jest łańcuch zaliczek klienta (§3A)
- ZD (typ 15) → korekty ZD→ZD (66) oraz `dok_DoDokId` do **PZ** (265 przyjęć)
- Zapis: ktoś przy wystawianiu wybiera dokument docelowy ręcznie

**B. Wspólna pozycja magazynowa** (`dok_Pozycja`: ta sama pozycja ma `ob_DokMagId` = WZ **i** `ob_DokHanId` = dokument handlowy)
- WZ i FS/PA dzielą tę samą pozycję → towar wyszedł NA tę fakturę
- Przykład (07.08): poz. 620037 = WZ 1622 (przez `ob_DokMagId`) = PA 12 (przez `ob_DokHanId`)
- 127 WZ lipca ma dokument handlowy TYLKO tą drogą — bez tego raport pokaże fałszywą dziurę
- WZ KOM rozliczone FV na JAWNĄ — też przez pozycję

**C. Relacja pozycji `ob_DoId`** — pozycja wskazuje wprost inną pozycję (używane przy PZ i korektach)

**D. Pole `dok_Uwagi` — CZWARTY mechanizm, dopisany 21.09.2026 po pytaniu Tomka („a Uwagi?")**

Pole jest wypełnione w **5 693 z 19 477** WZ (29%) i trzyma **dwie różne rzeczy**:

1. **Ślad pisany przez Subiekta** — tekst `Ilość dokumentów: N Dokumenty źródłowe: WZ …`. Występuje w bazie w **17** wydaniach (w pliku klienta **15** — ten sam mechanizm, więc zgodne). Gdzie jest, jest **zapisanym łańcuchem** i wchodzi do kaskady jako dowód bezpośredni.
2. **Ręczne notatki ludzi** — budowa/miejscowość („BORÓWKOWA", „temat Trzebiatkowo"), numery rejestracyjne (LR-, WA-), telefony. **To dziś jedyne miejsce w bazie, w którym widać, do jakiej inwestycji poszło wydanie** — dopóki klient nie ma rejestru inwestycji.
3. Numery WZ wskazane w tych notatkach: **40 unikalnych, z tego 39 poza kopią** (wydania z 2023 — kopia zaczyna się 04.01.2024). Notatka odsyła poza okno danych.

Zasada użycia: pole jest **wskazówką do potwierdzenia**, nie samodzielnym dowodem (bo bywa pisane ręcznie i nie ma reguły, kiedy kto je wypełnia — pytanie do klienta otwarte). Przy inwestycjach: najpierw grupowanie po notatce, potem potwierdzenie dokumentem.

### 2A. Kaskada dopasowania — kolejność i pokrycie (zmierzone 2026-09-21)

Kolejność jest **jakością**: pierwsza trafiona droga wygrywa, a każdy WZ zapisuje, którą został złapany. Pokrycie policzone na populacji, która naprawdę wymaga dopasowania — **1 359 wydań bez łącznika** (kopia komandytowa):

| Krok | Droga | Trafia | Pokrycie |
|---|---|---|---|
| 1 | Pole `dok_DoDokId` (numer dokumentu na wydaniu) | 18 118 z 19 477 wszystkich | 93,0% populacji ogółem |
| 2 | Wspólna pozycja (`ob_DokMagId`/`ob_DokHanId`) / relacja pozycji | 127 wydań lipca — **wszystkie mają też pole 1** | 0 dodatkowych |
| 3 | Pole `dok_Uwagi` (ślad systemowy „Dokumenty źródłowe") | 17 w bazie | znikome, ale jest dowodem |
| 4 | **NIP** klienta | 585 z 1 359 | 43,0% |
| 5 | **Adres / miejscowość** (gdy brak NIP-u) | 341 z 1 359 — bez NIP, ale z adresem | +25,1% (razem z NIP-em 68,1%) |
| 6 | Nazwa znormalizowana (Levenshtein 1–2 znaki) | jego arkusz: 4 197 z 19 732 | najszersza, najsłabsza |
| 7 | Telefon (192) / e-mail (131) | 14,1% / 9,6% | ostatnia wskazówka |

**Reguła Tomka (2026-09-21):** „nie ma NIP — patrzę na adres, i dane inne; nie ma — idę dalej". Czyli: brak klucza ≠ improwizacja, brak klucza = `NIEROZSTRZYGNIĘTE` z zapisanym powodem. **31,9% przypadków nie ma ani NIP-u, ani adresu** — dla nich zostaje wyłącznie nazwa znormalizowana albo pytanie do klienta.

### 2B. Pomosty między zestawieniami — wartość z jednego rekordu identyfikuje drugi

Tomek 2026-09-21: „może być tak, że w rekordzie WZ jest informacja, która w innym zestawieniu jest z czymś, co dopiero pomoże zidentyfikować tamto — musimy znać łańcuchy powiązań i sprawdzać też łańcuchy".

**Zasada:** szukamy nie tylko pary „WZ ↔ dokument", ale **wartości, która występuje w innych zestawieniach i tam jest już podpięta do klienta/zamówienia**. Wtedy ta wartość jest pomostem.

Zmierzone na kopii (1 359 wydań bez łącznika): **441 ma niepuste `Uwagi`**, a **68 z nich (5,0% całej trudnej populacji)** trafia w kartotekę innego klienta po samej miejscowości z notatki — czyli pomost działa, zanim użyjemy nazwiska.

Kandydaci na pomosty do zbudowania ( każdy = osobny krok kaskady):
1. **Numer dokumentu w Uwagach** („Dokumenty źródłowe: WZ …") — 17 w bazie, dowód bezpośredni.
2. **Miejscowość / adres z Uwag ↔ kartoteka klienta** — zmierzone: 68 trafień; bez tego kroku te wydania zostają dziurami.
3. **„DOSTAWA <nazwisko/2 inicjały>" z Uwag ↔ nazwa klienta** (np. „ROMAŃCZUK DOSTAWA MB", „LAMCZYK JASIU DOSTAWA MB") — do policzenia.
4. **Numer rejestracyjny z Uwag (LR-, WA-, BP-, GD-)** ↔ zestawienia transportowe/kalendarz — w bazie nie ma tabeli pojazdów (`poj_Eksploatacja` pusta), więc to pomost poza bazą (A4/transport).
5. **Kwota wpłaty ↔ wartość WZ** (rozrachunki `nz_*`) — pomost pieniężny: gdy nie ma faktury, wpłata i tak wskazuje klienta.
6. **Numery KSeF** (`ksef_Faktury`, `ksef_NumerKSeF` — 20+ tabel) — pomost do faktur w KSeF, także tych spoza Subiekta.

**Wymóg w silniku:** każdy WZ zapisuje nie tylko „drogę", ale i **„ogniwo pomostowe"** (czym został podpięty: numerem, miejscowością, nazwiskiem, kwotą, numerem rejestracyjnym). Bez tego nie odróżnimy dowodu od poszlaki.



## 3. Łańcuch życia dokumentu (kwalifikacja)

**ZMIERZONE 2026-09-21 (kopia, komandytowa) — łańcuch i dziedziczenie pól:**

| Pytanie | Wynik | Wniosek |
|---|---|---|
| Czy WZ dziedziczy **użytkownika** z dokumentu źródłowego? | ten sam wystawiający na WZ i jego FS: **7 681 z 16 834 (45,6%)**; zgodność z ZK: 1 102 | **NIE dziedziczy** — `dok_Wystawil` to „kto wpisał dokument" (biuro: Sobański 7 654, Lipiński 3 857, Ubowska 2 069, Blank 1 813, Sundeev 1 498). Atrybut operacyjny, **nie klucz powiązania** |
| Czy WZ dziedziczy **kontrahenta**? | ten sam na WZ i FS: **11 118 z 16 834 (66,0%)**; przez ZK: **2 441 z 2 461 (99,2%)** | **NIE dziedziczy wprost** (WZ idzie na budowę/odbiorcę, FV na płatnika) — ale **na ZK zgadza się niemal zawsze** |
| Czy jest **seria powiązań** (więcej niż jeden skok)? | WZ z 1. skokiem: 18 118; z 2. skokiem: **3 427 (18,9%)**; z 3. skokiem: 67 (2%) | Tak, realnie **dwa ogniwa** |
| Jakie łańcuchy występują? | WZ→FS→**ZK** 2 461 · WZ→**PA**→ZK 780 · WZ→KFZ→FZ 172 · WZ→KFS→FS 14 · WZ→ZK 10 | Łańcuch kończy się na **zamówieniu** |

**Wniosek projektowy (zmiana kolejności kaskady):** kręgosłupem łańcucha jest **ZK — zamówienie**. Klienta trzyma zamówienie (99,2%), nie wydanie. Dlatego rozliczenie budujemy **od ZK**, a WZ i FS są jego odnogami — zamiast „WZ → szukaj faktury". Użytkownik (`dok_Wystawil`) i kontrahent z nagłówka WZ **nie są** kluczami powiązania.

```
ZK (16) ──Z→ WZ (11) ──Z→ FS (2)        ZK = zamówienie
   ↑           ↑            │           WZ = wydanie (towar wyszedł)
   └── FS wskazuje ZK ──────┘           FS = faktura (rozliczenie)
                                        PA (21) = detal — też domyka WZ
```

**Łańcuch zaliczek klienta — SKORYGOWANY 2026-09-21 (zmierzone, nie z opisu):**

```
ZK (16), dok_StatusEx 16/24/25  ──Z→  FS (2) podtyp 4 „zaliczkowa cząstkowa" ──Z→  FS podtyp 5 „zaliczkowa końcowa"
   (zamówienie zaliczkowe              (dowolna ilość)                              (domknięcie)
    w języku klienta)                  1 417 z 1 423 ZK ma wpiętą FS zaliczkową polem
```

- Zamówień „zaliczkowych" jest **1 423** (ZK z `dok_StatusEx` 16 = 24 · 24 = 1 281 · 25 = 118) — wszystkie po stronie sprzedaży, nie po stronie zakupowej.
- Faktur zaliczkowych: **FS (typ 2) podtyp 4 = 798 szt. / 7 498 667,47 zł**, **podtyp 5 = 691 szt. / 2 575 865,12 zł**; rozrachunki tych dokumentów to należności (typ 39 — 1 353), wpłaty kasowe (typ 17 — 519) i spłaty należności (typ 41 — 169).
- **W typie 1 nie ma ani jednej zaliczki** — 8 922 z 8 934 dokumentów typu 1 ma rozrachunek typ 40 (zobowiązania wobec dostawcy).
- Typ 15 (zamówienie do dostawcy) **nie występuje** w tym łańcuchu ani razu: z `dok_StatusEx` 16/24/25 ma 0 dokumentów.

**Strona zakupowa (osobny obieg, nie mylić z zaliczkami klienta):** ZD (15) ──Z→ PZ (10) przyjęcia (265) · korekty ZD→ZD (66) · FZ (1) wpięta polem (578).

- Spójne z zasadą: **FS końcową wystawia się Z ZAMÓWIENIA, nie z WZ** (instrukcja klienta) — tłumaczy łańcuch ZK→FS (3 016 w bazie)
- **Wartość zamówienia (w tym ZK) bywa zmieniana na rzeczywistą przy zakończeniu transakcji** → możliwe rozbieżności między pierwotną a finalną wartością ZK
- **Do wyjaśnienia z klientem zostaje jedno:** dlaczego w jego własnej procedurze zamówienie zaliczkowe nazywa się „ZD", skoro w bazie takie zamówienie to ZK z `dok_StatusEx` 16/24/25, a typ 15 ZD to zamówienie do dostawcy (1 480/1 480 z tytułem „Zamówienie do dostawcy"). Nazwa nie zmienia żadnej liczby — wszystkie pomiary idą po typie i statusie.

**Do czego WZ należy (algorytm kwalifikacji — kolejność ważna):**
1. Czy ZK wskazuje ten WZ (`ZK.dok_DoDokId = WZ`)? → **ZK**
2. Czy pole na WZ wskazuje ZK? → **ZK**
3. Czy pole na WZ wskazuje FS/FZ, albo wspólna pozycja ma FS/FZ? → **FS**
4. Czy pole na WZ wskazuje PA, albo wspólna pozycja ma PA? → **PA** (detal — liczy się jako pokrycie)
5. Czy wspólna pozycja ma KFZ? → **FS** (korekta dziedziczy po FS)
6. Nic → **GOŁE** (dziura — towar wyjechał bez dokumentu)

## 4. Moment domknięcia (czas)

- 432 z 450 par WZ→dokument w lipcu: **ten sam dzień** (+0 dni)
- WZ musi dostać dokument handlowy **w dniu wystawienia** — 96% tak robi
- Raport dzienny wieczorem = stan prawie finalny; raport rano może pokazać przejściowe „dziury"
- WZ „gołe" starsze niż 1 dzień = realna dziura do naprawy u źródła (nie nasza robota — pokazujemy)

**⚠️ WZ-rezerwacja (nie każda WZ = wywóz):** procedura z 2021-07-13: „z wyprzedzeniem min 3 dni wystawiana jest WZ do zamówienia w celu zabezpieczenia dostępności towaru". Część WZ to REZERWACJA towaru (min. 3 dni przed), nie faktyczny wywóz — nie każda WZ bez dokumentu tego samego dnia to dziura.

**Zwroty przy pracach na budynku mieszkalnym (PNBM) — reguła korekt/anulacji WZ:** gdy między spółkami NIE wystawiono FV — „usuwamy produkty z WZ"; gdy FV wystawiona — „robimy PZ od klienta bez wywołania skutku magazynowego (ceny jak na WZ)". Taka korekta/anulacja nie jest „gołą" dziurą.

## 5. Klient i inwestycja — do czego przypisujemy

- **NAZWA KLIENTA = `vwKlienci.adr_NazwaPelna` / `adr_Nazwa`** (join po `kh_Id`) — NIGDY `kh_Nazwisko`/`kh_Symbol` z `kh__Kontrahent` (te są puste dla firm! błąd v1-v2 raportu N4, złapany 08.09)
- **Klient WZ** = `dok_OdbiorcaId` → `vwKlienci`
- **Klient faktury (prezentacja)** = `dok_PlatnikId` (nabywca) — może różnić się od odbiorcy WZ! (przy FV na JAWNĄ odbiorcą jest spółka jawna, klient końcowy siedzi dalej)
- **Handlowiec (PH)** = kategoria dokumentu `dok_KatId` → `sl_Kategoria` (CD, MR, LR, SM, GG, MP, GM, BK, LP) — NIE osoba wystawiająca
- **Inwestycja** = grupa dokumentów po nazwie/OPIS (kejs Telmax: kartoteki „telmax + inwestycja", FV rozróżniana po polu OPIS) — do N2/A7

**Pitfall (flaga jakości):** jeśli raport pokazuje >5% WZ „bez klienta" — to NAJPIERW sprawdź join do vwKlienci, zanim ogłosisz dziurę. Pusty klient masowy = błąd dekodowania, nie rzeczywistość.

## 6. Czego NIE wolno robić raportowi

- Nie uznawać WZ za „pokryty", bo klient się zgadza — **nazwa klienta to nie powiązanie**
- Nie mieszać odbiorcy (`dok_OdbiorcaId`) z nabywcą (`dok_PlatnikId`)
- Nie liczyć dwa razy (WZ→FS przez pole ORAZ przez pozycję = jedna faktura)
- Nie chować przypadków nierozstrzygniętych — pokazujemy kontrolnie (GOŁE zostaje widoczne)

## 7. Zasada dla nas

**My nie naprawiamy danych.** Raport pokazuje: WZ → klient → PH → pokrycie (ZK/FS/PA/GOŁE) → droga do dokumentu. Tomek Jurewicz widzi dziury i decyduje. Nasza wartość = zero fałszywych „GOŁE" (sprawdzamy wszystkie 3 mechanizmy powiązań) i zero fałszywych „pokrytych" (nazwa klienta to nie dowód).

## 8. JAKOŚĆ DOKUMENTACJI (mechanizm kontroli — Tomek 08.09)

**Pytanie z odpowiedzią = WIEDZA, nie luka.** Egzekwowane przy KAŻDEJ rundzie odpowiedzi:
1. Odpowiedź wpada do `STRUKTURA_WEZLOW.json` (odp + zrodlo).
2. NATYCHMIAST znika z widoku „CO NIE WIEMY" (proces-roboczy.html) — luka z odpowiedzią nie może wyglądać jak otwarta; zamiast chipów do klikania: kompaktowy wpis „✅ Odpowiedź: … (źródło: …)".
3. W sekcji pytań zostają WYŁĄCZNIE wątpliwości bez odpowiedzi + nowe pytania.
4. To samo dotyczy pozostałych zestawów (KB, lista zadań): rozwiązane = wiedza, nie pozycja do zrobienia.

Weryfikacja po każdej rundzie: liczba wpisów `luka-roz` w proces-roboczy.html = liczba pytań z odpowiedzią w JSON; `nmchip` w treści = 0 (zostają tylko w CSS/JS).

## 9. FAKTY ZMIERZONE NA ŻYWEJ BAZIE (2026-09-15, METRON)

Wszystko poniżej ma źródło (`WYNIKI_Z_BAZY/…`) i datę. Wcześniejsze sekcje pisałyśmy bez dostępu do bazy — te liczby je aktualizują, nie zastępują modelu.

**Dokumenty:**
- **`36 = ZWZ` = zwrot materiału z budowy do magazynu.** Dowód: 599/599 z prefiksem `ZWZ`, 0 ujemnych ilości na 2 353 pozycjach, towary w 100% obecne w powiązanym wydaniu, mediana 35 dni po wydaniu, wartość zawsze ≤ WZ, asortyment = akcesoria dachowe. **Do potwierdzenia nazwy w Subiekcie (Tomek).**
- **`29 = Inwentaryzacja`.** 3 dokumenty, 2 125 pozycji z zerowymi ilościami, bez kontrahenta; nazwa z `sl_Kategoria.kat_Id = 7`. Arkusze spisu, nie transakcje.
- **`14 = ZW`** — brak nazwy w kanonie; jedyny ślad: łańcuch `PZ → ZW → PA` (53/53).
- **`dok_DoDokId` działa w OBIE strony** (`ZK → WZ` wskazuje w przód, `WZ → FS` do tyłu) — raport nie może zakładać, że dziecko jest zawsze po rodzicu.
- **Trzy mechanizmy powiązań dają różne liczby** dla tej samej pary `WZ ↔ FS`: nagłówek 17 459 · pozycje 9 620 · `ob_DoId` 67 707. Raport musi mówić, którego użył.
- **Powiązania między bazami (`FZ`/`WZ` komandytowa ↔ jawna) dokumentowo NIE ISTNIEJĄ** — sprawdzone. Most może iść tylko przez klienta albo przez towar.

**Pieniądze (A6 kasa) — stan 2026-09-15:**
- **Faktury są zbiorcze:** 47% obejmuje 4–10 wydań, 15,2% ponad 10, **tylko 17,6% to jedno wydanie**. Dlatego dopasowanie po kwocie nagłówka nie ma prawa działać — przypisujemy po towarze i ilości.
- **64,7% klientów wydań z 2026 (551 z 851, wszyscy z NIP-em) nie istnieje w jawej** — to nie problem dopasowania, to brak strony w drugiej bazie. Do sprawdzenia: gdzie są ich faktury (komandytowa? brak? inna kartoteka?).
- **GOŁE: 24,3% wydań 2026 bez dokumentu handlowego** (1 186 z 4 877) — kontrola metody zgodna z kanonem lipiec 2026 (24,6%, 197 z 802).
- **Kasa:** rozrachunki powiązane z kasą 2 942 = 31 040 478,22 zł; **otwarte salda 153 = 816 587,93 zł**; **po terminie 131 = 657 245,60 zł**; wpłaty 5 873 = 66 346 054,81 zł.
- **„Bez NIP-u" nie jest przyczyną:** wśród kupujących 2026 brak NIP-u dotyczy **3 kartotek (0,35%)**; 3 884 „bez NIP-u" to głównie rejestr zapytań (ZK bez realizacji). Wcześniejszy wniosek „uzupełnić NIP-y" — **wycofany**.
- **PH = `sl_Kategoria` dokumentu** (identyfikatory: 12=CD, 14=MR, 16=LR, 17=SM, 18=GG, 19=MP, 23=GM, 26=BK, 27=LP); ZK 2026 ma kategorię w 4 868/4 868. Telefonów w kartotekach **nie ma ani jednego** (0 z 7 595) — kanał kontaktu to mail, poza Subiektem (PH pisze z własnej skrzynki).

**Słownik rozrachunków (oficjalny, uzupełnienie §SCHEMAT_BAZY):** `17=KP`, `18=KW`, `19=Bank przyjmie`, `20=Bank wyda`, `39=Należności`, `40=Zobowiązania`, `41=Spłaty należności`, `42=Spłaty zobowiązań`; `nzf_IdDokumentAuto` = łącznik rozrachunek ↔ dokument.

## 10. PRZESUNIĘCIE MIĘDZY SPÓŁKAMI = ZERO PRZYCHODU, ZERO ZYSKU (reguła Tomka, 2026-09-15)

**Faktura wystawiona na własną spółkę (komandytowa → jawna, jawna → komandytowa) to NIE sprzedaż — to przesunięcie.** W takim pokryciu WZ:

- **przychód = 0**, **zysk = 0**, **marża = 0** — nie „mała", nie „wewnętrzna": **zero**;
- kwota na takiej fakturze nie jest pieniędzmi grupy, bo nie weszły z zewnątrz;
- **realny zysk powstaje dopiero na drugim kroku** — gdy jawna sprzedaje towar/usługę **klientowi końcowemu** (PNBM). Dopiero tam są pieniądze z rynku.

**Konsekwencja dla raportów (obowiązkowa):**
1. Segmenty `HURTOWA` (sprzedaż między spółkami) i `ROZLICZONE FV INWENTARYZACJA` **nie wchodzą do przychodu ani do marży** — nigdy, w żadnym zestawieniu.
2. **Nie wolno sumować zysku z kroku wewnętrznego i z kroku końcowego** — to ten sam towar policzony dwa razy. Koszt PNBM zawiera już cenę z komandytowej, więc doliczenie do niego „zysku" z HURTOWEJ zawyża wynik dwukrotnie.
3. To wyjaśnia część anomalii „koszt > sprzedaż" (68 586 748,63 zł vs 67 622 037,88 zł w rejestrze komandytowej): przesunięcia podnoszą koszt, a przychodu nie tworzą.
4. W raporcie dla klienta obieg wewnętrzny pokazujemy **jako informację** (ile towaru przeszło między spółkami), **nigdy jako wynik**.

### 10a. URWANY ŁAŃCUCH = STRATA (doprecyzowanie Tomka, 2026-09-15)

**„Jak komandytowa ma z jawnej, a jawna nie ma od klienta — to jest strata."**

Łańcuch pieniędzy: `koszt WZ (materiał)` → `FV komandytowa → jawna` (**krok, 0 zł**) → `FV jawna → klient` (**kasa**) → `wpłata (rozrachunek 39 + 17/19)`.

- Łańcuch dochodzi do klienta i klient płaci → wynik jest na końcu, **raz**.
- Łańcuch **urywa się na kliencie** (faktura jest, wpłaty nie ma; albo faktury dla klienta nie ma wcale) → **to strata**, nie „należność wewnętrzna". Należność komandytowej od jawnej nie ma za sobą żadnych pieniędzy z rynku, a materiał już wyjechał.
- **Kwota straty = koszt WZ** tego towaru (nie kwota faktury wewnętrznej).
- Dlatego w tropieniu kasy **idzie się do samego końca, po kliencie**: WZ → klient → jego faktury → rozrachunki i wpłaty. Zatrzymanie się na fakturze wewnętrznej jest błędem metody, nie skrótem.
