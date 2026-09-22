# Mapa powiązań dokumentów (proof of concept) + plan śledztwa za wydaniami magazynowymi (WZ)

**Projekt:** Dobry Dach (firma dekarska), spółki: komandytowa i jawna
**System źródłowy:** Subiekt GT (MS SQL), lokalna kopia w Dockerze — kontener `subiekt-mssql`, baza `Kopia_2024_KOMANDYTOWA`, dane do **2026-08-07**
**Autor:** ARGUS dla Tomka · **Data:** 2026-09-21 · **Wersja:** 1
**Zakres:** dokument roboczy (markdown). HTML z tego powstanie osobno.

**Jak czytać ten dokument.** Część I to **mapa powiązań** — który dokument trzyma się którego, po jakim polu, i sprawdzone na prawdziwych rekordach. Część II to **plan śledztwa** — kroki po kolei, z zapytaniem i bramą kontrolną przy każdym kroku. Każda liczba ma etykietę: zapytanie, tabela, data. Liczby z kopii (Mac) są **materiałem kontrolnym** — liczbę wiążącą podaje M na żywej bazie.

---

# CZĘŚĆ I — MAPA POWIĄZAŃ DOKUMENTÓW (proof of concept)

## 1. Po co to jest

Każde wydanie magazynowe (WZ) ma gdzieś swój koniec: fakturę klienta, fakturę na drugą spółkę, paragon, fakturę zbiorczą — albo nie ma nic. Ten dokument pokazuje **jak przejść z WZ do pieniędzy** i **gdzie w tym przejściu łańcuch się urywa**. Nie jest to jeszcze raport — jest to **mapa dróg**, na której opiera się plan śledztwa (Część II).

## 2. Środowisko i sposób uruchamiania pomiarów

| co | jak |
|---|---|
| baza | `Kopia_2024_KOMANDYTOWA` w kontenerze `subiekt-mssql`, dane do 2026-08-07 |
| uruchomienie | `docker exec -i subiekt-mssql bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d Kopia_2024_KOMANDYTOWA -h-1 -W -s"|" -I' < /tmp/qNN.sql` |
| zapytania | pisane **do pliku** `/tmp/qNN.sql` i podawane przez `<` — wersja wewnątrz cudzysłowu się psuje |
| hasło | wyłącznie zmienna środowiskowa kontenera — **nie pojawia się w żadnym pliku** |
| cały zestaw zapytań z tego dokumentu | `sql/mapa_powiazan_pomiar.sql` w repo `dd-pomost` (do powtórzenia) |

## 3. Mapa powiązań — tabela pól

| z czego | pole | na co wskazuje | pewność |
|---|---|---|---|
| WZ (`dok__Dokument`, `dok_Typ`=11) | `dok_DoDokId` | dokument po drugiej stronie (`dok__Dokument.dok_Id`) | **mocna** — 93,0% WZ wypełnione |
| WZ | `dok_OdbiorcaId` | kontrahent, który towar odebrał | mocna (94,4%) |
| WZ | `dok_PlatnikId` | kontrahent, który ma zapłacić (nabywca) | mocna (94,4%) |
| WZ | `dok_KatId` | handlowiec / kategoria dokumentu | pełna (100%) |
| faktura (FS, `dok_Typ`=2) | `nz__Finanse.nzf_IdDokumentAuto` | rozrachunek tej faktury | **słaba, niepełna** — patrz §7 |
| rozrachunek (`nz__Finanse`) | `nz_FinanseSplata.nzs_IdDlugu` | który dług | mocna |
| rozrachunek | `nz_FinanseSplata.nzs_IdSplaty` | czym zapłacono (KP/KW/przelew) | mocna |

**Wniosek z mapy:** łańcuch **WZ → faktura** stoi na jednym polu (`dok_DoDokId`) i jest solidny. Łańcuch **faktura → pieniądze** stoi na dwóch drogach, z których pierwsza (`nzf_IdDokumentAuto`) jest dziurawa — dlatego w planie śledztwa idą **obie równolegle** (§8 i Krok 4 Części II).

## 4. Łańcuch wzorcowy — domknięty do kasy (przykład 1)

Sprawdzone rekordy (`/tmp/q4.sql`, `/tmp/q4b.sql`, `/tmp/q28.sql`, `dok__Dokument` + `nz__Finanse` + `nz_FinanseSplata`, 2026-09-21). Kontrahent zamaskowany numerem ID.

| krok | dokument / rekord | ID | typ | data | kwota | pole prowadzące dalej |
|---|---|---|---|---|---|---|
| 1 | WZ 1624/MAG/08/2026 | `dok_Id` 75985 | 11 (WZ) | 2026-08-07 | netto 2 140,07 / brutto 2 632,29 | `dok_DoDokId` = 76003 |
| 2 | FS 61/MAG/08/2026 | `dok_Id` 76003 | 2 (FS) | 2026-08-07 | netto 2 140,07 / brutto 2 632,29 | `nzf_IdDokumentAuto` = 76003 |
| 3 | rozrachunek: należność | `nzf_Id` 63380 | 39 | 2026-08-07 | **2 632,29** (pole `nzf_WartoscPierwotna`), termin 2026-08-07 | `nzs_IdDlugu` = 63380 |
| 4 | spłata | `nzs_Id` 24129 | `nzs_Typ`=1 | 2026-08-07 | 2 632,29 | `nzs_IdSplaty` = 63381 |
| 5 | rozrachunek: kasa przyjmie KP 33/KAS/08/2026 | `nzf_Id` 63381 | 17 (KP) | 2026-08-07 | 2 632,29 | koniec łańcucha |

**Odczyt:** towar wyszedł z magazynu, faktura wystawiona na klienta (odbiorca i płatnik = ten sam kontrahent, ID 126), zapłata gotówkowa tego samego dnia. **Łańcuch domknięty co do groszа.** Tak wygląda wzorzec, do którego porównujemy wszystko inne.

**Uwaga metodyczna (ważna, zmierzona):** dla rozrachunków typu 39 i 40 kwota **nie leży w `nzf_WartoscWaluta`** — tam jest 0,00. Kwota jest w **`nzf_WartoscPierwotna`**. Kto weźmie `nzf_WartoscWaluta` na typie 39, dostanie zero i uzna, że klient nic nie jest winien. Szczegóły w §9.

## 5. Łańcuch urwany na kroku faktury (przykład 2)

Ten sam pomiar (`/tmp/q4.sql`, 2026-09-21).

| krok | dokument | ID | typ | data | netto |
|---|---|---|---|---|---|
| 1 | WZ 1631/MAG/08/2026 | `dok_Id` 76004 | 11 (WZ) | 2026-08-07 | 3 885,84 |
| 2 | `dok_DoDokId` = 75405 → **ZK 2/MAG/08/2026** | `dok_Id` 75405 | 16 (zamówienie) | 2026-08-01 | 5 885,85 |

**Odczyt:** WZ wskazuje **zamówienie**, nie fakturę. Za tym wydaniem nie ma jeszcze ani FS, ani rozrachunku, ani wpłaty. To nie dziura i nie strata — to **krok pośredni**: towar pojechał na zamówienie, faktura ma przyjść później. W trackerze należy to pokazać jako osobną kolumnę („dokument docelowy = ZK, brak FS"), nie wpisywać do dziur.

## 6. Ile łańcuchów się domyka, a ile urywa — pomiar

Zapytanie `/tmp/q6.sql`, tabele `dok__Dokument` + `nz__Finanse`, 2026-09-21. Liczone z `COUNT(DISTINCT)` — bez zdublowania wierszy tam, gdzie faktura ma kilka rozrachunków.

| pozycja | liczba WZ | udział |
|---|---|---|
| wszystkie WZ w kopii | **19 477** | 100,0% |
| WZ → FS (typ 2) | **16 834** | 86,4% |
| WZ → FS → ma rozrachunek | **12 640** | 64,9% |
| WZ → FS → **brak rozrachunku** | **4 194** | 21,5% |
| WZ bez `dok_DoDokId` | **1 359** | 7,0% |
| WZ → dokument docelowy nie istnieje (wskaźnik w pustkę) | **0** | 0,0% |

**Rozkład dokumentu docelowego** (`/tmp/q2b.sql`, `dok__Dokument`, 2026-09-21):

| typ docelowy | co to | liczba WZ |
|---|---|---|
| 2 | faktura sprzedaży (FS) | 16 834 |
| 21 | paragon (PA) | 1 085 |
| 5 | korekta faktury zakupu (KFZ) | 174 |
| 6 | korekta faktury sprzedaży (KFS) | 14 |
| 16 | zamówienie (ZK) | 10 |
| 1 | faktura zakupu (FZ) | 1 |

**Kluczowe ustalenie — te 4 194 „urwane" to prawie w całości artefakt, nie strata:**

| co | liczba |
|---|---|
| WZ → FS bez rozrachunku (razem) | 4 194 |
| z tego takie, gdzie **FS ma netto 0,00** | **4 193** |
| z tego takie, gdzie FS ma netto ≠ 0 | **1** |

Czyli „brak rozrachunku" prawie zawsze znaczy „**faktura zbiorcza z końca roku o wartości zero**", a nie „faktura bez pieniędzy". Te faktury mają `dok_DataWyst` = 31.12 danego roku i wciągają po kilkadziesiąt – kilkaset WZ każda (`/tmp/q15.sql`, 2026-09-21). Największe:

| ID faktury | numer | data | netto FS | `dok_KatId` | WZ wciągniętych | suma netto tych WZ |
|---|---|---|---|---|---|---|
| 74956 | FS 30025/MAG/12/2025 | 2025-12-31 | 0,00 | 7 (Inwentaryzacja) | 247 | 378 602,96 |
| 22850 | FS 30008/MAG/12/2024 | 2024-12-31 | 0,00 | 7 | 234 | 244 805,79 |
| 30631 | FS 20074/MAG/12/2024 | 2024-12-31 | 0,00 | 7 | 202 | **2 369 164,00** |
| 74987 | FS 100121/MAG/12/2025 | 2025-12-31 | 0,00 | 7 | 182 | 304 710,85 |
| 31715 | FS 20066/MAG/12/2024 | 2024-12-31 | 0,00 | 7 | 121 | 464 182,53 |

Suma netto WZ wciągniętych w faktury o wartości zero: **16 118 507,87 zł** na **4 193 WZ** (`/tmp/q21.sql`, 2026-09-21). `dok_KatId`=7 odpowiada kategorii „Inwentaryzacja" (`sl_Kategoria`, `/tmp/q14.sql`).

**Wniosek do planu:** te 4 193 WZ **nie są dziurą i nie są stratą** — to **rozliczenie roczne**. Trzeba je wyjąć z rejestru dziur osobną regułą („faktura zbiorcza z XII, netto 0, kategoria Inwentaryzacja") i dopiero na reszcie szukać pieniędzy.

## 7. Rozrachunki — co jest w tabeli i ile z tego da się podłączyć

Zapytanie `/tmp/q3.sql`, tabela `nz__Finanse`, 2026-09-21.

**Rozkład po `nzf_Typ`:**

| `nzf_Typ` | co to | wiersze — mój pomiar | wiersze — słownik projektu | zgodne? | suma `nzf_WartoscWaluta` |
|---|---|---|---|---|---|
| 17 | KP (kasa przyjmie) | 2 623 | 2 623 | **tak** | 3 971 883,53 |
| 18 | KW (kasa wyda) | 1 931 | 1 931 | **tak** | 3 904 377,25 |
| 19 | Bank przyjmie | 11 335 | 11 335 | **tak** | 106 764 716,97 |
| 20 | Bank wyda | 15 044 | 15 044 | **tak** | 108 041 732,32 |
| 39 | Należności | 9 465 | 9 465 | **tak** | 6 471 941,95 (patrz §9!) |
| 40 | Zobowiązania | 10 359 | 10 359 | **tak** | 4 055 007,71 (patrz §9!) |
| 41 | Spłaty należności | 1 896 | 1 896 | **tak** | 7 917 793,58 |
| 42 | Spłaty zobowiązań | 1 163 | 1 163 | **tak** | 6 699 407,94 |
| **38** | **nie ma go w słowniku** | **4** | — | **nowy typ** | **−1 690 515,20** |
| razem | | **53 820** | | | 246 136 346,05 |

Słownik z dokumentacji projektu **potwierdzony co do wiersza** na wszystkich ośmiu typach. Znaleziony **nowy typ 38** (4 wiersze, kwota ujemna −1 690 515,20) — nie ma go w słowniku, znaczenie `NIEROZSTRZYGNIĘTE` (do ustalenia u klienta).

**Łącznik `nzf_IdDokumentAuto` — jedyne pole wiążące rozrachunek z dokumentem:**

| co | liczba | udział |
|---|---|---|
| wszystkie wiersze `nz__Finanse` | 53 820 | 100,0% |
| z wypełnionym `nzf_IdDokumentAuto` | **23 990** | **44,6%** |
| bez łącznika | 29 830 | 55,4% |

**Ale to nie znaczy, że połowa rozrachunków jest nie do powiązania.** Łącznik jest pełny tam, gdzie trzeba, a pusty tam, gdzie i tak nic nie wnosi (`/tmp/q10.sql`, 2026-09-21):

| `nzf_Typ` | wiersze | z `nzf_IdDokumentAuto` | wniosek |
|---|---|---|---|
| 39 (należności) | 9 465 | **9 106** (96,2%) | łącznik działa — można iść od faktury do długu |
| 40 (zobowiązania) | 10 359 | **10 143** (97,9%) | działa |
| 17 (KP) | 2 623 | 2 337 (89,1%) | działa |
| 18 (KW) | 1 931 | 1 344 (69,6%) | częściowo |
| **19 (Bank przyjmie)** | 11 335 | **0 (0,0%)** | **wpłaty bankowe NIE są podpięte do faktury** |
| **20 (Bank wyda)** | 15 044 | **6 (0,04%)** | praktycznie brak |
| 41 (Spłaty należności) | 1 896 | 1 047 | działa częściowo |
| 42 (Spłaty zobowiązań) | 1 163 | 7 | praktycznie brak |

**To jest najważniejsze ustalenie techniczne całej mapy:** **banku nie da się podłączyć po polu dokumentu.** Przelew widać dopiero przez tabelę spłat (`nz_FinanseSplata`), gdzie każda spłata wskazuje, który dług zamyka.

## 8. Dwie drogi z faktury do pieniądza (obie trzeba przejść)

| droga | pola | co znajduje | gdzie się gubi |
|---|---|---|---|
| **A. pole dokumentu** | `nz__Finanse.nzf_IdDokumentAuto` = `dok__Dokument.dok_Id` | należność, KP/KW | **bank (typ 19/20)** — łącznik pusty |
| **B. tabela spłat** | `nz_FinanseSplata.nzs_IdDlugu` → `nz__Finanse.nzf_Id`, potem `nzs_IdSplaty` → KP/KW/przelew | **wszystkie** spłaty, w tym bankowe | nic — ale trzeba znać `nzf_Id` długu, czyli przejść najpierw drogę A |

**Pomiar spłat** (`/tmp/q10.sql`, `nz_FinanseSplata`, 2026-09-21):

| `nzs_Typ` | wiersze | suma `nzs_WartoscWaluta` |
|---|---|---|
| 1 | 17 315 | 158 343 354,29 |
| 2 | 1 070 | 687 519,75 |
| 4 | 2 104 | 13 762 662,34 |
| 7 | 1 | 9 648,62 |
| razem | **20 490** | **172 803 185,00** |

Należności typu 39, które mają jakąkolwiek spłatę: **9 134 z 9 465** (96,5%). Czyli **331 należności w ogóle nie ruszyło spłaty** — to jest osobna lista podejrzanych do sprawdzenia (nie każda musi być stratą: część to salda kompensowane, część to należności nieściągalne, część to skutek braku łącznika bankowego).

**Reguła pomiarowa:** `nzs_WartoscWaluta` **działa**. Pole `nzs_WartoscSplatyPLN` w tej kopii jest **zerowe — nie używać**.

## 9. Pułapka liczbowa: `nzf_WartoscWaluta` na typach 39 i 40 kłamie

Zapytanie `/tmp/q6.sql`, tabela `nz__Finanse`, 2026-09-21:

| `nzf_Typ` | wiersze | suma `nzf_WartoscWaluta` | suma `nzf_WartoscPierwotna` | suma `nzf_SplataWaluta` |
|---|---|---|---|---|
| 17 (KP) | 2 623 | 3 971 883,53 | 0,00 | 3 649 958,91 |
| 18 (KW) | 1 931 | 3 904 377,25 | 0,00 | 805 385,45 |
| 19 (Bank przyjmie) | 11 335 | 106 764 716,97 | 0,00 | 76 021 331,36 |
| 20 (Bank wyda) | 15 044 | 108 041 732,32 | 0,00 | 77 852 061,92 |
| **39 (Należności)** | 9 465 | **6 471 941,95** | **96 663 075,72** | 0,00 |
| **40 (Zobowiązania)** | 10 359 | **4 055 007,71** | **90 020 470,45** | 0,00 |
| 41 (Spłaty należności) | 1 896 | 7 917 793,58 | 0,00 | 7 917 793,58 |
| 42 (Spłaty zobowiązań) | 1 163 | 6 699 407,94 | 0,00 | 6 699 407,94 |

**Wniosek:** dla typu 39 i 40 kwota **wystawiona** siedzi w `nzf_WartoscPierwotna`, a **pozostała do zapłaty** w `nzf_SplataWaluta`. `nzf_WartoscWaluta` na tych typach pokazuje 6,47 mln zamiast 96,66 mln — **czternastokrotne zaniżenie**. Każde zapytanie o „ile klient wisi" musi brać `nzf_WartoscPierwotna` minus `nzf_SplataWaluta`. To wpisujemy do reguł trackera jako twardą regułę techniczną.

## 10. OSTRZEŻENIE — nie wolno mówić o „stracie 2,1 mln zł"

To jest najważniejsze ostrzeżenie tego dokumentu, żeby liczba nie poszła dalej w złej wersji.

**Skąd bierze się fałszywa liczba.** Jeśli wziąć wydania bez dokumentu po drugiej stronie i policzyć `WZ netto` obok `kosztu magazynowego`, wychodzi różnica około **2,1 mln zł** — i ktoś może to nazwać „stratą".

**Co to naprawdę jest.** Sprawdzone na konkretnych rekordach (`/tmp/q18.sql`, `dok__Dokument`, 2026-09-21):

| WZ | ID | data | netto | brutto | **`dok_WartMag` (koszt)** | `dok_DoDokId` |
|---|---|---|---|---|---|---|
| WZ 554/MAG/04/2026 | `dok_Id` 66772 | 2026-04-21 | **0,00** | **0,00** | 75 184,16 | NULL (brak) |
| WZ 1101/MAG/06/2026 | `dok_Id` 72264 | 2026-06-29 | **0,00** | **0,00** | 90 000,00 | NULL (brak) |
| WZ 1134/MAG/06/2026 | `dok_Id` 72627 | 2026-06-30 | **0,00** | **0,00** | 138 900,00 | NULL (brak) |

**Mechanizm:** w tej bazie są wydania, które mają **wartość sprzedaży zero, a koszt realny** — tzn. towar o realnej wartości wyszedł z magazynu, ale dokument nie ma wyceny sprzedaży. Różnica „koszt − wartość" bierze się z **tych** rekordów, nie z masowej straty na wszystkich dziurach. Mediana różnicy na całej populacji wydań bez dokumentu to **−134 zł**, czyli dla typowego przypadku różnica jest groszowa.

**Pomiar populacji** (`/tmp/q27.sql`, `dok__Dokument`, 2026-09-21):

| co | liczba | suma `dok_WartNetto` | suma `dok_WartMag` |
|---|---|---|---|
| wszystkie WZ o netto = 0 | **1 041** | 0,00 | **13 211 776,43** |
| z tego bez dokumentu docelowego | 188 | 0,00 | — |

**Zapis do raportu (obowiązujący):**
1. **Nie używać sformułowania „strata 2,1 mln zł".** Ta liczba to artefakt wydań zerowych.
2. Mówić: „**N wydań o wartości zero i realnym koszcie — X zł kosztu — do wyjaśnienia u klienta**" (N i X z konkretnego, podanego zapytania).
3. Liczbę 248 wydań zerowych podaną wcześniej przez drugiego agenta **traktować jako niepotwierdzoną w tej kopii** — mój pomiar na kopii daje **1 041** wydań o `netto`=0, a różnica wynika z innego zakresu i innego progu odcięcia. Rozstrzygnięcie należy do M na żywej bazie; do tego czasu obie liczby są **NIEROZSTRZYGNIĘTE** i tak mają być opisane.
4. Rozdział „ile to kosztowało" policzyć **osobno dla wydań zerowych**, a osobno dla reszty dziur.

## 11. Kontrola krzyżowa: moja kopia (Mac) vs pomiar M (żywa baza)

| pozycja | mój pomiar (kopia, do 2026-08-07) | pomiar M (żywa baza, 2026-09-17) | zgodne? |
|---|---|---|---|
| liczba WZ | 19 477 | 26 580 | nie — inny zakres (kopia ucięta + brak jawnej) |
| WZ → FS na klienta | 16 834 | 21 704 (81,6%; 81,6 mln zł netto) | proporcja podobna (86,4% u mnie) |
| brak dokumentu | 1 359 | 2 153 (8,37 mln netto / 10,51 mln kosztu) | nie — patrz poniżej |
| paragon | 1 085 | 1 157 | blisko |
| korekta | 188 (KFZ 174 + KFS 14) | 648 | nie — patrz P6a w kanonie |
| magazyn niehandlowy | 5 063 (`dok_KatId` ∈ {5,6,7,10,13,15,21,24}, netto 17 446 778,34) | 301 | **nie — dwie różne definicje** |
| rozkład po roku (`dok_WartNetto`=0 / brak dokumentu) | 2024: 144 · 2025: 317 · 2026: 898 | 2024: 52 · 2025: 318 · 2026: 1 783 | 2025 zgodne (317 vs 318); 2024 i 2026 nie |
| P6b (`dok_JestRuchMag`=0) | **207 / 1 013 978,14 zł** | 207 / 1 013 978,14 zł (kanon) | **tak, co do sztuki** |
| P6b w dziurach | 10 / 60 827,85 zł | 10 / 60 827,85 zł (kanon) | **tak, co do sztuki** |

**Jak to czytać.** Zgodność P6b co do sztuki i groszа dowodzi, że **zapytania są policzone dobrze** — różnice tam, gdzie są, wynikają z **zakresu**, nie z błędu. Kopia ma tylko spółkę komandytową i kończy się 07.08.2026, a M liczy komandytową + jawną na żywej bazie. Rozbieżności „magazyn niehandlowy" (5 063 vs 301) i „korekta" (188 vs 648) to **różne definicje tego samego słowa**, nie różne dane — trzeba je ujednolicić przed publikacją, inaczej dwa raporty powiedzą co innego.

**Reguła:** każda liczba idąca do Tomka ma podane **środowisko i zakres** („kopia, komandytowa, do 07.08.2026" albo „żywa baza, obie spółki"). Bez tego liczby z dwóch środowisk nie wolno zestawiać w jednym zdaniu.

## 12. Liczby kontrolne, na których stoi ta mapa

| co | wartość | zapytanie | tabela | data |
|---|---|---|---|---|
| WZ razem w kopii | 19 477 | `/tmp/q1.sql` | `dok__Dokument` | 2026-09-21 |
| WZ z `dok_DoDokId` > 0 | 18 118 (93,0%) | `/tmp/q1.sql` | `dok__Dokument` | 2026-09-21 |
| WZ z `dok_OdbiorcaId` | 18 392 (94,4%) | `/tmp/q1.sql` | `dok__Dokument` | 2026-09-21 |
| WZ z `dok_PlatnikId` | 18 392 (94,4%) | `/tmp/q1.sql` | `dok__Dokument` | 2026-09-21 |
| WZ z `dok_KatId` | 19 477 (100%) | `/tmp/q1.sql` | `dok__Dokument` | 2026-09-21 |
| WZ, gdzie odbiorca ≠ płatnik | **2** | `/tmp/q19.sql` | `dok__Dokument` | 2026-09-21 |
| zakres dat WZ | 2024-01-04 … 2026-08-07 | `/tmp/q7.sql` | `dok__Dokument` | 2026-09-21 |
| suma netto WZ | 66 138 778,84 zł | `/tmp/q12.sql` | `dok__Dokument` | 2026-09-21 |
| statusy WZ | 1 = 19 270 · 0 = 178 · 3 = 29 | `/tmp/q27.sql` | `dok__Dokument` | 2026-09-21 |
| WZ na kategorię 10 („Magazyn") | 3 771 / netto 10 092 795,18 | `/tmp/q21.sql` | `dok__Dokument` | 2026-09-21 |
| rozrachunki razem | 53 820 | `/tmp/q3.sql` | `nz__Finanse` | 2026-09-21 |
| rozrachunki z łącznikiem | 23 990 (44,6%) | `/tmp/q3.sql` | `nz__Finanse` | 2026-09-21 |
| spłaty razem | 20 490 / 172 803 185,00 zł | `/tmp/q10.sql` | `nz_FinanseSplata` | 2026-09-21 |

**Słownik handlowców** (`dok_KatId` → `sl_Kategoria.kat_Nazwa`, sprawdzone `/tmp/q14.sql`, 2026-09-21): 10=Magazyn, 12=CD, 13=PZ, 14=MR, 15=WA, 16=LR, 17=SM, 18=GG, 19=MP, 20=PAL, 21=KOSZT, 23=GM, 24=DEKARZ, 26=BK, 27=LP, 1=Sprzedaż, 2=Zakup, 5=Detal, 6=Hurtowa, 7=Inwentaryzacja.

**Największe wydania wg handlowca** (`/tmp/q12.sql`, 2026-09-21): `dok_KatId` 10 → 3 771 WZ / 10,09 mln netto; 17 (SM) → 3 663 / 13,74 mln; 16 (LR) → 2 622 / 7,92 mln; 14 (MR) → 1 923 / 5,42 mln; 12 (CD) → 1 695 / 4,77 mln. Uwaga: 10, 13, 15, 21 **nie są handlowcami**, tylko kategoriami magazynowymi — nie można ich wrzucać do rankingu sprzedawców.

## 13. Czego NIE udało się rozstrzygnąć (lista jawna)

| numer | czego nie wiem | czego brakuje | kto rozstrzyga |
|---|---|---|---|
| N-1 | znaczenie typu rozrachunku **38** (4 wiersze, −1 690 515,20 zł) | brak w słowniku projektu | klient / M |
| N-2 | czy kontrahent o `kh_Id` 382 (grupa 2, grupa założona na firmę) to **druga spółka**, czy duży odbiorca — ma 716 WZ i 258 FS na 15,85 mln netto | potwierdzenie u klienta; nazwy nie cytuję, dopasowanie po fragmencie symbolu nie jest dowodem | Tomek |
| N-3 | czy `kh_Id` 3822 (10 FS / 1,07 mln netto, 12 WZ) to ta sama rola co 382 | jak wyżej | Tomek |
| N-4 | **ile jest wydań zerowych** — 1 041 (kopia) czy 248 (pomiar z drugiej ręki) | pomiar na żywej bazie z jednym progiem | M |
| N-5 | czy 4 193 WZ wciągnięte w faktury zbiorcze z XII to na pewno rozliczenie roczne, a nie ukryta korekta | dokumenty źródłowe u klienta | Tomek / biuro |
| N-6 | które 331 należności typu 39 nie ma żadnej spłaty — i ile z tego to prawdziwe nieściągnięte | żywa baza + potwierdzenie łącznika bankowego | M |
| N-7 | definicja „magazyn niehandlowy" (5 063 u mnie vs 301 u M) | uzgodnienie definicji | ARGUS + M |
| N-8 | definicja „korekta" (188 u mnie vs 648 u M) | jak wyżej | ARGUS + M |
| N-9 | pomiar „FV komandytowa → jawna" na mojej kopii (M podaje 616 na żywej) | kopia ma tylko komandytową | M |
| N-10 | Czy kwota 2 140 820 zł różnicy koszt/wartość obejmuje całą populację dziur, czy tylko wydania zerowe — mój pomiar pokazuje, że praktycznie cała siedzi w wydaniach zerowych, ale nie policzyłem tego rozbicia do końca | pełne rozbicie per rekord | ARGUS (Krok 6 planu) |

---

# CZĘŚĆ II — PLAN ŚLEDZTWA ZA WYDANIAMI MAGAZYNOWYMI (WZ)

Plan jest sekwencją kroków. Każdy krok ma: **zapytanie**, **co ma wyjść**, **bramę** (co musi być prawdą, żeby iść dalej). Kroki 1–5 są zrobione w tym dokumencie (proof of concept). Kroki 6–14 to reszta śledztwa.

## Zasady obowiązujące w każdym kroku

1. **Źródłem jest baza.** Pliki Excel od klienta służą **wyłącznie** do sprawdzenia, czy dobrze znaleźliśmy — nigdy nie są cytowane jako dane.
2. **Każda liczba ma przy sobie zapytanie (albo plik `.sql`), tabelę i datę.** Bez tego liczba dostaje etykietę `NIEROZSTRZYGNIĘTE` i nie idzie do raportu.
3. **Zero wymyślania i zero szacunków podanych jak fakty.**
4. **Obieg wewnętrzny między spółkami = 0 zł przychodu i 0 zł zysku.** To krok, nie kasa.
5. **Urwany łańcuch = strata**, a jej kwota to **koszt WZ**, nie kwota faktury wewnętrznej.
6. **Wersja do repo: bez nazw firm, nazwisk, NIP-ów i adresów.** Tylko numery dokumentów, daty, kwoty, ID, nazwy pól i SQL.
7. **Nie naprawiamy danych w bazie.** Wykryty błąd to defekt do naprawy u klienta, nie cicha korekta w raporcie.
8. **Wzorzec dopiero od trzech przypadków.** Jeden przypadek to wyjątek.
9. **W rozrachunkach typów 39 i 40 kwota siedzi w `nzf_WartoscPierwotna`** — nie w `nzf_WartoscWaluta`. W spłatach zawsze `nzs_WartoscWaluta` (pole `nzs_WartoscSplatyPLN` jest zerowe).
10. **Środowisko i zakres przy każdej liczbie** — „kopia/komandytowa/do 07.08.2026" albo „żywa baza/obie spółki".

## Krok 1. Rejestr wejściowy — policz, co masz (ZROBIONE)

**Cel:** jedna liczba wydań i pewność, że dalej nie zgubimy ani jednego.

**Zapytanie:** `/tmp/q1.sql`

```
SELECT COUNT(*) FROM dok__Dokument WHERE dok_Typ=11;
```

**Wynik:** 19 477 WZ w kopii, zakres dat 2024-01-04 … 2026-08-07 (`dok__Dokument`, 2026-09-21).

**Brama:** liczba z każdego kolejnego kroku musi się sumować do tej liczby. Różnica = wyjaśnienie, nie uśrednienie.

## Krok 2. Otwórz mapę pól — sprawdź, które łączniki są wypełnione (ZROBIONE)

**Cel:** wiedzieć, na którym polu w ogóle da się oprzeć śledzenie.

**Zapytanie:** `/tmp/q1.sql`

```
SELECT
 SUM(CASE WHEN dok_DoDokId>0 THEN 1 ELSE 0 END)     AS z_dokumentem,
 SUM(CASE WHEN dok_OdbiorcaId>0 THEN 1 ELSE 0 END)  AS z_odbiorca,
 SUM(CASE WHEN dok_PlatnikId>0 THEN 1 ELSE 0 END)   AS z_platnikiem,
 SUM(CASE WHEN dok_KatId>0 THEN 1 ELSE 0 END)       AS z_handlowcem
FROM dok__Dokument WHERE dok_Typ=11;
```

**Wynik:** 18 118 / 18 392 / 18 392 / 19 477 → 93,0% · 94,4% · 94,4% · 100%.

**Brama:** jeśli `dok_DoDokId` spadnie poniżej 90%, kaskada tropów startuje od pozycji, nie od pola dokumentu (patrz Krok 3).

**Uwaga z §12:** odbiorca ≠ płatnik tylko w **2** wydaniach. Nie budować na tym rozróżnieniu żadnego raportu — nie ma z czego.

## Krok 3. Kaskada tropów — przypisz każdemu WZ dokument po drugiej stronie (ZROBIONE dla pierwszego tropu)

**Kolejność tropów** (ustalona w `KONCEPT_tropienie-WZ.md`, wersja 2, 2026-09-17 — kolejność ma znaczenie):

1. **pole dokumentu `dok_DoDokId`** ← start tutaj, bo łapie 93% w jednym ruchu
2. wspólna pozycja na dokumencie
3. relacja pozycji (powiązanie wiersz–wiersz)
4. nazwa znormalizowana klienta
5. zaliczka
6. NIP (na końcu — trafia ~1,5%; w wersji do repo **nie wolno** wypisywać NIP-ów, tylko identyfikatory)

**Zapytanie (rozkład dokumentu docelowego):** `/tmp/q2b.sql`

```
SELECT d2.dok_Typ, COUNT(*) AS ile
FROM dok__Dokument d1
JOIN dok__Dokument d2 ON d2.dok_Id = d1.dok_DoDokId
WHERE d1.dok_Typ=11
GROUP BY d2.dok_Typ ORDER BY ile DESC;
```

**Wynik:** FS 16 834 · PA 1 085 · KFZ 174 · KFS 14 · ZK 10 · FZ 1. Wskaźników w pustkę: **0** — każde `dok_DoDokId` wskazuje istniejący dokument.

**Brama:** zero wskaźników donikąd. Jeśli pojawi się choć jeden — najpierw wyjaśnić, potem liczyć dalej.

## Krok 4. Droga A: faktura → rozrachunek → spłata (ZROBIONE)

**Cel:** ustalić, ile łańcuchów dochodzi do pieniędzy.

**Zapytanie:** `/tmp/q6.sql`

```
WITH wz AS (SELECT dok_Id, dok_DoDokId FROM dok__Dokument WHERE dok_Typ=11)
SELECT
  COUNT(DISTINCT wz.dok_Id) AS wz_all,
  COUNT(DISTINCT CASE WHEN f.dok_Id IS NOT NULL THEN wz.dok_Id END) AS wz_z_fs,
  COUNT(DISTINCT CASE WHEN f.dok_Id IS NOT NULL AND fn.nzf_Id IS NOT NULL THEN wz.dok_Id END) AS z_rozrachunkiem,
  COUNT(DISTINCT CASE WHEN f.dok_Id IS NOT NULL AND fn.nzf_Id IS NULL THEN wz.dok_Id END) AS bez_rozrachunku
FROM wz
LEFT JOIN dok__Dokument f ON f.dok_Id = wz.dok_DoDokId AND f.dok_Typ=2
LEFT JOIN nz__Finanse fn ON fn.nzf_IdDokumentAuto = f.dok_Id;
```

**Wynik:** 19 477 → 16 834 → **12 640 z rozrachunkiem** → **4 194 bez**.

**Brama:** te 4 194 trzeba rozbić (Krok 5), zanim ktokolwiek nazwie to dziurą.

**Uwaga wykonawcza:** liczyć `COUNT(DISTINCT)` — jedna faktura może mieć kilka wierszy rozrachunku i `COUNT(*)` zawyża wynik (pierwsze podejście dało 22 061 zamiast 19 477).

## Krok 5. Rozbij „brak rozrachunku" na artefakt i podejrzenie (ZROBIONE)

**Cel:** oddzielić rozliczenie roczne od tego, co naprawdę może być dziurą.

**Zapytanie:** `/tmp/q10.sql` (pierwsza sekcja) + `/tmp/q15.sql`

**Wynik:**
- 4 194 WZ → FS bez rozrachunku, **z tego 4 193 mają FS o netto 0,00 i datę 31.12** → faktury zbiorcze z końca roku, kategoria 7 (Inwentaryzacja)
- **1** WZ → FS o netto ≠ 0 bez rozrachunku → **jedyny prawdziwy kandydat na urwany łańcuch w tej grupie**
- suma netto WZ wciągniętych w faktury zerowe: **16 118 507,87 zł** na 4 193 WZ

**Brama:** reguła wyłączająca („FS z XII, netto 0, `dok_KatId`=7") musi zdjąć 4 193 z 4 194. Jeśli zostaje więcej niż 1 — sprawdzić po kolei, czemu.

## Krok 6. Osobno policz wydania zerowe — i nigdy nie nazwij tego stratą (ZROBIONE, do domknięcia wg N-10)

**Cel:** odciąć artefakt, który psuje każdą sumę.

**Zapytanie:** `/tmp/q27.sql`

```
SELECT COUNT(*) AS ile, SUM(dok_WartMag) AS koszt
FROM dok__Dokument WHERE dok_Typ=11 AND dok_WartNetto=0;
```

**Wynik:** 1 041 wydań o netto 0, koszt magazynowy razem **13 211 776,43 zł**, z tego 188 bez dokumentu docelowego. Trzy potwierdzone rekordy: `dok_Id` 66772 (75 184,16), 72264 (90 000,00), 72627 (138 900,00) — wszystkie netto 0, brutto 0, `dok_DoDokId` pusty.

**Brama:** liczba 1 041 vs 248 (pomiar z drugiej ręki) **musi być rozstrzygnięta przez M** na żywej bazie z jednym progiem odcięcia. Do tego czasu **zakaz** używania sformułowania „strata 2,1 mln zł" — to artefakt tych wydań (§10).

**Do domknięcia (N-10):** rozbić różnicę 2 140 820 zł per rekord i pokazać, ile siedzi w wydaniach zerowych, a ile poza nimi.

## Krok 7. Droga B: dociągnij bank przez tabelę spłat (DO ZROBIENIA)

**Cel:** dopiąć to, czego droga A nie widzi — **wpłaty bankowe** (typ 19/20 mają łącznik pusty w 100% i 99,96%).

**Zapytanie:** `/tmp/q13.sql` (sekcja „PEŁNY ŁAŃCUCH BANKOWY")

```
SELECT s.nzs_Id, s.nzs_IdSplaty, s.nzs_IdDlugu, s.nzs_WartoscWaluta, s.nzs_Data,
       f39.nzf_Typ AS typ_dlugu, f39.nzf_IdDokumentAuto AS dok_dlugu
FROM nz_FinanseSplata s
JOIN nz__Finanse f39 ON f39.nzf_Id = s.nzs_IdDlugu
WHERE f39.nzf_Typ = 39 AND s.nzs_WartoscWaluta > 3000
ORDER BY s.nzs_Data DESC;
```

**Co ma wyjść:** dla każdej należności (typ 39) — czy i czym została spłacona, z numerem dokumentu spłaty.

**Brama:** suma spłat typu 1+2+4+7 = 172 803 185,00 zł; suma spłat typu 41+42 z `nz__Finanse` = 7 917 793,58 + 6 699 407,94 = 14 617 201,52 zł. **Te dwie liczby się nie zgadzają i to jest do wyjaśnienia**, zanim cokolwiek policzymy jako „zapłacone".

## Krok 8. Policz, ile łańcuchów domyka się do kasy — i na jaką kwotę (DO ZROBIENIA)

**Cel:** liczba, która jest sedno sprawy: **ile wydań doszło do pieniędzy, a ile nie**.

**Zapytanie:** do napisania na bazie Kroku 4 + Kroku 7 (droga A ∪ droga B).

**Co ma wyjść — tabela wynikowa:**

| kolumna | treść |
|---|---|
| `Nr WZ`, `dok_Id` | identyfikacja |
| `Data`, `Wartość netto`, `dok_WartMag` (koszt) | kwoty |
| `Dokument po drugiej stronie` + jego typ | numer i `dok_Typ` |
| `Droga powiązania` | `pole-dokumentu` / `pozycja` / `zaliczka` / `BRAK` |
| `Rozrachunek` (`nzf_Id`, `nzf_Typ`) | po drodze A |
| `Spłata` (`nzs_Id`, kwota, data, typ) | po drodze B |
| `Kasa` | `kasa` / `krok` / `dziura` |
| `Scenariusz` | P1–P12 z `KONCEPT_tropienie-WZ.md` albo `NIEROZSTRZYGNIĘTE` |
| `Do zamknięcia przez` | klient / biuro / nikt |

**Brama:** liczba wierszy = 19 477 (kopia) / 26 580 (żywa baza). Zero pustych `Scenariusz`.

## Krok 9. Osobno policz KROK, osobno KASĘ (DO ZROBIENIA)

**Cel:** nie policzyć obiegu wewnętrznego między spółkami jako przychodu.

**Reguła:** faktura komandytowa → jawna (albo odwrotnie) = **0 zł przychodu, 0 zł zysku, 0 zł marży**. To krok w łańcuchu. Kasą staje się dopiero faktura jawna → klient końcowy i jej wpłata.

**Co wiemy (`/tmp/q26.sql`, 2026-09-21):** dwa identyfikatory kontrahentów dopasowane po fragmencie symbolu jako kandydaci na wewnętrzne — `kh_Id` 382 (grupa 2; 716 WZ na 975 559,82 zł netto, 258 FS na 15 854 674,60 zł netto) i `kh_Id` 3822 (12 WZ, 10 FS na 1 065 294,73 zł netto). Razem do nich wpięte jest **5 278 WZ o netto 20 583 555,91 zł**.

**Brama:** identyfikacja spółek **musi** być potwierdzona przez Tomka — dopasowanie po fragmencie symbolu **nie jest dowodem** (N-2, N-3). Dopóki niepotwierdzone, każda kwota z tej grupy idzie do raportu z etykietą `NIEROZSTRZYGNIĘTE`.

**Do porównania:** M na żywej bazie daje **616** faktur komandytowa→jawna. To liczba do potwierdzenia (N-9).

## Krok 10. Rozłóż dziury na wzorce P1–P12 (DO ZROBIENIA)

**Cel:** każda dziura dostaje powód **z dokumentu**, nie „na wyczucie".

**Sposób:** dla każdego przypadku bez dokumentu po drugiej stronie sprawdź po kolei (zapytania `/tmp/q27.sql` + `sql_wzorce_P1-P12.sql`):

| kod | wzorzec | po czym poznać | skutek |
|---|---|---|---|
| P1 | rezerwacja bez wywozu | WZ wskazuje ZK w statusie rezerwacji | nie sprzedaż — wyłączyć |
| P2 | magazyn niehandlowy | DEPOZYT (Brus `BRU` **nie** jest tu liczony — decyzja klienta) | wyłączyć z rejestru sprzedażowego |
| P3 | urwany łańcuch między spółkami | jest FV kom→jawna, brak FV dla klienta | **STRATA = koszt WZ** |
| P4 | usługa w koszt | pozycja: usługa dekarska / ciesielska / azbest | koszt robocizny |
| P5 | zwrot materiału z budowy | dokument `ZWZ`, towary z wcześniejszego wydania | cofa koszt |
| P6a | korekta wydania (KFZ / KFS) | WZ z KFZ/KFS po `dok_DoDokId` — **188** na kopii (KFZ 174 · KFS 14) | nie jest dziurą |
| P6b | wycofany skutek magazynowy | `dok_JestRuchMag`=0 — **207 / 1 013 978,14 zł**, z tego **10 / 60 827,85 zł** w dziurach | osobna kolumna, poza dziurami |
| P7 | zaliczka bez faktury końcowej | ZK/ZD + FZ, brak FS końcowej | otwarte — reszta do rozliczenia |
| P8 | inwestycja bez faktury | wydanie na liście inwestycji klienta | koszt na budowę |
| P9 | detal / sprzedaż gotówkowa | paragon PA (1 085 na kopii) | domknięte paragonem |
| P10 | faktura w innym okresie | faktura późniejsza niż zakres analizy | przesunięcie czasu |
| P11 | przyjęcie korygujące | PZ od klienta | pomniejsza koszt |
| P12 | realna dziura | żaden wzorzec nie pasuje | **towar wyszedł, nic nie ma** |
| ANULOWANE | `dok_Status` 0 lub 3 | **178 + 29 = 207 WZ** | poza rejestrem w ogóle |

**Brama:** po wyłączeniach P1, P2, P6 suma dziur powinna zejść w okolice listy klienta (**557 komandytowa + 22 jawna**). Brama 0,5%. Nie zgadza się → rozkładamy różnicę punkt po punkcie, **nie uśredniamy**.

## Krok 11. Oddziel „otwarte" od „urwanych" (DO ZROBIENIA)

**Cel:** żeby nie nazwać stratą tego, co jeszcze może się domknąć.

- **otwarte:** ZK w toku, zaliczka bez FS (P7), inwestycja bez faktury (P8), faktura w innym okresie (P10) → **kwota do rozliczenia, nie strata**
- **urwane:** FV wewnętrzna jest, faktury dla klienta nie ma (P3), albo nie ma nic (P12) → **strata = koszt WZ** (`dok_WartMag`)

**Brama:** żadna kwota nie występuje jednocześnie w obu kolumnach.

## Krok 12. Złóż listę dla człowieka (DO ZROBIENIA)

**Cel:** Tomek dostaje listę, na której **coś da się zrobić**.

| lista | co zawiera | kto zamyka |
|---|---|---|
| pieniądze do odzyskania | WZ z P12, kwota = koszt WZ | klient / windykacja |
| do wyjaśnienia | wszystkie `NIEROZSTRZYGNIĘTE` z powodem | biuro |
| defekty bazy | błędy ewidentne (np. zła kategoria handlowca) — **lista, nie korekta** | klient |
| otwarte | P7 / P8 / P10 z terminem | handlowiec wskazany w `dok_KatId` |

## Krok 13. Brama jakości przed publikacją (OBOWIĄZKOWA)

1. Suma kontrolna: liczba WZ w wyniku = liczba WZ w bazie **co do sztuki**.
2. Brama 0,5%: dziury z bazy vs lista klienta (557 + 22).
3. Kontrola na 20 losowych przypadkach: czy scenariusz i dokument po drugiej stronie zgadzają się z tym, co widać w Subiekcie.
4. Zero pustych scenariuszy — każdy ma wzorzec albo `NIEROZSTRZYGNIĘTE` z powodem.
5. Każda liczba ma zapytanie, tabelę i datę.
6. **Test na fałszywą stratę:** żadna liczba nie jest nazwana „stratą", jeśli siedzi w wydaniach zerowych (§10).
7. Dwie niezależne metody (kopie / inny autor) przed publikacją.

## Krok 14. Kolejność wykonania — kto, co, kiedy

| kolejność | krok | kto | uwaga |
|---|---|---|---|
| 1 | Kroki 1–6 (ten dokument) | ARGUS | **zrobione** |
| 2 | rozstrzygnąć N-1, N-4, N-6, N-9 | M | na żywej bazie, przed Krokiem 8 |
| 3 | potwierdzić spółki (N-2, N-3) | Tomek | jeden telefon / mail, blokuje Krok 9 |
| 4 | ujednolicić definicje (N-7, N-8) | ARGUS + M | blokuje wszystkie liczby porównawcze |
| 5 | Krok 7 + Krok 8 | M | droga B i pełny tracker |
| 6 | Krok 9, 10, 11 | ARGUS na kopii, M na żywej | równolegle, potem porównanie |
| 7 | Krok 12, 13 | ARGUS | brama przed Tomkiem |
| 8 | dopiero tutaj: HTML / raport | inny agent | ten dokument jest wejściem |

---

## Skąd wzięte liczby (rejestr zapytań)

| plik | czego dotyczy |
|---|---|
| `/tmp/q1.sql` | liczba WZ i wypełnienie pól |
| `/tmp/q2.sql`, `/tmp/q2b.sql` | na co wskazuje `dok_DoDokId` |
| `/tmp/q3.sql` | rozkład `nz__Finanse` po `nzf_Typ` + łącznik |
| `/tmp/q4.sql`, `/tmp/q4b.sql`, `/tmp/q28.sql` | łańcuch wzorcowy WZ → FS → rozrachunek → spłata |
| `/tmp/q5.sql` (błędne — bez `DISTINCT`), `/tmp/q6.sql` (poprawne) | domykanie łańcuchów |
| `/tmp/q7.sql`, `/tmp/q12.sql` | WZ bez dokumentu, rozkład po roku, netto po handlowcu |
| `/tmp/q9.sql`, `/tmp/q13.sql` | przykłady bez rozrachunku i łańcuch bankowy |
| `/tmp/q10.sql` | łącznik per typ, spłaty per typ, należności ze spłatą |
| `/tmp/q14.sql` | nazwy kategorii `sl_Kategoria` |
| `/tmp/q15.sql`, `/tmp/q21.sql` | faktury zbiorcze z XII i ich zawartość |
| `/tmp/q18.sql`, `/tmp/q27.sql` | wydania zerowe, statusy, P6b, ANULOWANE |
| `/tmp/q19.sql` | odbiorca vs płatnik, top kontrahenci |
| `/tmp/q23.sql` | liczebność typów dokumentów |
| `/tmp/q26.sql` | kandydaci na kontrahentów wewnętrznych |

**Wszystkie zapytania są złożone w jednym pliku do powtórzenia: `sql/mapa_powiazan_pomiar.sql` w repo `dd-pomost`.**

**Wersja do repo (`dd_pomost/kanon/`) nie zawiera nazw firm, nazwisk, NIP-ów ani adresów** — wyłącznie numery dokumentów, daty, kwoty, identyfikatory, nazwy pól i zapytania SQL.
