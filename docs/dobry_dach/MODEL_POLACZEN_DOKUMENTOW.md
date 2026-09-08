# Model połączeń dokumentów — Dobry Dach (N4/A6)

*Dokument roboczy 2026-09 · cel: jeden, wspólny sposób czytania powiązań w bazie Subiekt (Kopia_2024_KOMANDYTOWA). Porządek w firmie robi Tomek Jurewicz — my dajemy raport, który pokazuje stan.*

## 1. Typy dokumentów (potwierdzone w bazie)

| Typ | Dokument | Rola | Pozycje przez |
|---|---|---|---|
| 11 | WZ — wydanie z magazynu | towar WYSZEDŁ | `ob_DokMagId` (magazynowe) |
| 16 | ZK — zamówienie klienta | umowa/oferta na towar | `ob_DokHanId` (handlowe) |
| 2 | FS — faktura sprzedaży | rozliczenie (też: FV z KOM) | `ob_DokHanId` |
| 1 | FZ — faktura zaliczkowa | zaliczka od klienta | `ob_DokHanId` |
| 21 | PA — paragon | sprzedaż detaliczna | `ob_DokHanId` |
| 5 | KFZ — korekta faktury | korekta FS/FZ | `ob_DokHanId` |
| 10 | PZ — przyjęcie | towar DO magazynu | `ob_DokMagId` |

## 2. Trzy fizyczne mechanizmy powiązań (KLUCZ)

W Subiekcie dokumenty łączą się na **trzy sposoby** — raport musi sprawdzać WSZYSTKIE, bo każdy bywa użyty:

**A. Pole `dok_DoDokId` na dokumencie** („dokument powiązany" w UI)
- WZ → wskazuje **FS** (najczęściej: 16 834 w całej bazie) albo **ZK** (rzadko: 10), albo PA
- ZK → wskazuje **WZ** (6 648) ← to jest główne powiązanie ZK↔WZ!
- FS → wskazuje **ZK** (3 016) ← faktura wraca do zamówienia
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

## 5. Klient i inwestycja — do czego przypisujemy

- **Klient WZ** = `dok_OdbiorcaId` → `kh__Kontrahent` (`kh_Nazwisko` / `kh_Symbol`)
- **Klient faktury (prezentacja)** = `dok_PlatnikId` (nabywca) — może różnić się od odbiorcy WZ! (przy FV na JAWNĄ odbiorcą jest spółka jawna, klient końcowy siedzi dalej)
- **Handlowiec (PH)** = kategoria dokumentu `dok_KatId` → `sl_Kategoria` (CD, MR, LR, SM, GG, MP, GM, BK, LP) — NIE osoba wystawiająca
- **Inwestycja** = grupa dokumentów po nazwie/OPIS (kejs Telmax: kartoteki „telmax + inwestycja", FV rozróżniana po polu OPIS) — do N2/A7

## 6. Czego NIE wolno robić raportowi

- Nie uznawać WZ za „pokryty", bo klient się zgadza — **nazwa klienta to nie powiązanie**
- Nie mieszać odbiorcy (`dok_OdbiorcaId`) z nabywcą (`dok_PlatnikId`)
- Nie liczyć dwa razy (WZ→FS przez pole ORAZ przez pozycję = jedna faktura)
- Nie chować przypadków nierozstrzygniętych — pokazujemy kontrolnie (GOŁE zostaje widoczne)

## 7. Zasada dla nas

**My nie naprawiamy danych.** Raport pokazuje: WZ → klient → PH → pokrycie (ZK/FS/PA/GOŁE) → droga do dokumentu. Tomek Jurewicz widzi dziury i decyduje. Nasza wartość = zero fałszywych „GOŁE" (sprawdzamy wszystkie 3 mechanizmy powiązań) i zero fałszywych „pokrytych" (nazwa klienta to nie dowód).
