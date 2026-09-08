# Model połączeń dokumentów — Dobry Dach (N4/A6)

*Dokument roboczy 2026-09 · aktualizacja 2026-09-08 (ustalenia z dokumentów procesowych klienta: typ 15 ZD i łańcuch zaliczkowy, FS z zamówienia, WZ-rezerwacje 3-dniowe, zwroty PNBM) · cel: jeden, wspólny sposób czytania powiązań w bazie Subiekt (Kopia_2024_KOMANDYTOWA). Porządek w firmie robi Tomek Jurewicz — my dajemy raport, który pokazuje stan.*

## 1. Typy dokumentów (potwierdzone w bazie)

| Typ | Dokument | Rola | Pozycje przez |
|---|---|---|---|
| 11 | WZ — wydanie z magazynu | towar WYSZEDŁ | `ob_DokMagId` (magazynowe) |
| 16 | ZK — zamówienie klienta | umowa/oferta na towar | `ob_DokHanId` (handlowe) |
| 15 | ZD — zamówienie ZALICZKOWE | osobny typ (NIE podtyp ZK): zaliczka na usługę PNBM, wartość = szacowana cała umowa; realizowane FZ/WZ | `ob_DokHanId` |
| 2 | FS — faktura sprzedaży | rozliczenie (też: FV z KOM) | `ob_DokHanId` |
| 1 | FZ — faktura zaliczkowa | zaliczka od klienta → wpinana w ZD (typ 15), NIGDY w ZK | `ob_DokHanId` |
| 21 | PA — paragon | sprzedaż detaliczna | `ob_DokHanId` |
| 5 | KFZ — korekta faktury | korekta FS/FZ | `ob_DokHanId` |
| 10 | PZ — przyjęcie | towar DO magazynu | `ob_DokMagId` |

**Ustalenie 2026-09-08 (z dokumentów procesowych klienta):** typ 15 ZD = osobny typ „zamówienie zaliczkowe" (1 480 szt / 16,7 mln zł w bazie), NIE podtyp ZK. FZ (typ 1) z `dok_DoDokId` (578 z 8 934) wskazują **WYŁĄCZNIE** ZD (typ 15), **NIGDY** ZK (typ 16) — to domyka wcześniejszą „lukę FZ→ZK": faktura zaliczkowa wpinana jest w zamówienie ZALICZKOWE, nie w zwykłe ZK. ZD bywają korygowane ZD→ZD (66) i mają `dok_DoDokId` do PZ (przyjęcia).

## 2. Trzy fizyczne mechanizmy powiązań (KLUCZ)

W Subiekcie dokumenty łączą się na **trzy sposoby** — raport musi sprawdzać WSZYSTKIE, bo każdy bywa użyty:

**A. Pole `dok_DoDokId` na dokumencie** („dokument powiązany" w UI)
- WZ → wskazuje **FS** (najczęściej: 16 834 w całej bazie) albo **ZK** (rzadko: 10), albo PA
- ZK → wskazuje **WZ** (6 648) ← to jest główne powiązanie ZK↔WZ!
- FS → wskazuje **ZK** (3 016) ← faktura wraca do zamówienia — zgodne z instrukcją klienta: **FS wystawia się Z ZAMÓWIENIA, nie z WZ**
- FZ (typ 1) → wskazuje **ZD** (typ 15, zamówienie zaliczkowe): 578 z 8 934 — WYŁĄCZNIE ZD, NIGDY ZK (typ 16) ← domyka „lukę FZ→ZK"
- ZD (typ 15) → korekty ZD→ZD (66) oraz `dok_DoDokId` do **PZ** (przyjęcia)
- Zapis: ktoś przy wystawianiu wybiera dokument docelowy ręcznie

**B. Wspólna pozycja magazynowa** (`dok_Pozycja`: ta sama pozycja ma `ob_DokMagId` = WZ **i** `ob_DokHanId` = dokument handlowy)
- WZ i FS/PA dzielą tę samą pozycję → towar wyszedł NA tę fakturę
- Przykład (07.08): poz. 620037 = WZ 1622 (przez `ob_DokMagId`) = PA 12 (przez `ob_DokHanId`)
- 127 WZ lipca ma dokument handlowy TYLKO tą drogą — bez tego raport pokaże fałszywą dziurę
- WZ KOM rozliczone FV na JAWNĄ — też przez pozycję

**C. Relacja pozycji `ob_DoId`** — pozycja wskazuje wprost inną pozycję (używane przy PZ i korektach)

## 3. Łańcuch życia dokumentu (kwalifikacja)

```
ZK (16) ──Z→ WZ (11) ──Z→ FS (2)        ZK = zamówienie
   ↑           ↑            │           WZ = wydanie (towar wyszedł)
   └── FS wskazuje ZK ──────┘           FS = faktura (rozliczenie)
                                        PA (21) = detal — też domyka WZ
```

**Łańcuch zaliczkowy (ZD — zamówienie zaliczkowe, typ 15):**

```
ZD (15) ──Z→ FZ (1) zaliczkowe, dowolna ilość ──Z→ FZ KOŃCOWA
   │
   ├──Z→ WZ (11) — „Zrealizuj jako wydanie zewnętrzne": pozycja NIE znika
   │              z ZD, ale nie pojawia się na kolejnych dokumentach WZ
   └──Z→ PZ (10) — przyjęcia (przez `dok_DoDokId`); korekty ZD→ZD (66)
```

- ZD zakłada się z usługą **„PRACE BUD. NA BUDYNKU MIESZKALNYM"** o wartości = **szacowana wartość CAŁEJ umowy**; rozlicza się je „Zrealizuj jako fakturę VAT zaliczkową" (dowolna ilość), na końcu „…zaliczkową **KOŃCOWĄ**"
- Spójne z zasadą: **FS/FZ końcową wystawia się Z ZAMÓWIENIA, nie z WZ** (instrukcja klienta) — tłumaczy łańcuch ZK→FS (3 016 w bazie)
- **Wartość zamówienia (w tym ZK) bywa zmieniana na rzeczywistą przy zakończeniu transakcji** → możliwe rozbieżności między pierwotną a finalną wartością ZK

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
