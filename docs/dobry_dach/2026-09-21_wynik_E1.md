# E1 — klasyfikacja wszystkich wydań (wynik)

Data pomiaru: 2026-09-21 · źródło: kopia bazy komandytowej · zapytanie: `sql/e1_klasyfikacja.sql`, `sql/e1b_czy-fs-to-przychod.sql`
Kontrola: suma klas = suma wydań **co do 0,00 zł**, sztuki 19 477 = 19 477.

| Klasa | Wydań | Netto | Udział |
|---|---|---|---|
| **Przychód z dowodem** — FS na klienta spoza grupy | 9 978 | **38 474 748,80** | 58,2% |
| **W DRODZE** — FS na własną spółkę (nie zakończenie) | 6 003 | **23 233 738,23** | 35,1% |
| **Dziury** — brak powiązania | 1 171 | **3 892 693,44** | 5,9% |
| Korekty (KFS/KFZ) | 188 | 291 482,04 | 0,4% |
| Paragony (PA) | 1 085 | 178 653,00 | 0,3% |
| ZK nierozliczone | 10 | 67 443,56 | 0,1% |
| FZ (kierunek odwrotny) | 1 | 19,77 | 0,0% |
| Nagłówki 0,00 (obieg wewnętrzny) | 1 041 | 0,00 | 0,0% |
| **RAZEM** | **19 477** | **66 138 778,84** | 100% |

## Ustalenie kluczowe (poprawia poprzednie rachunki)
Faktura typu FS **nie znaczy „klient zewnętrzny"** — klasa FS zawiera faktury na własne spółki:
- HURTOWNIA POKRYĆ DACHOWYCH DOBRY DACH — 5 266 wydań / 19 508 512,67 zł
- DOBRY DACH SP. Z O.O. — 737 wydań / 3 725 225,56 zł
Razem **6 003 wydań / 23 233 738,23 zł = przesunięcie, zero przychodu**.
Bez tego podziału „przychód" byłby zawyżony o 23,2 mln zł.

## Rozjazd do wyjaśnienia (etap E4)
Dziury: **1 171 wydań / 3,89 mln** (powiązanie nagłówkiem) vs **557 / 1,21 mln** (mapa stanów 15.09) vs **1 359** (pomiar cron 17.09).
Trzy liczby opisują to samo zjawisko trzema metodami. Do rozstrzygnięcia na żywej bazie.

## Do zrobienia u M (żywa baza)
1. Powtórzyć oba zapytania na żywej bazie (bez zmian) i podać surowe liczby.
2. Potwierdzić listę własnych spółek (czy tylko te dwie kartoteki).
3. Rozstrzygnąć rozjazd dziur: która metoda jest prawdziwa i dlaczego.

## Rozdzielenie pojęć (poprawka Tomka, 2026-09-21)
Wydanie nie „kończy się" przesunięciem na własną spółkę — to **stan przejściowy („w drodze")**: coś się stało, ale nie wiadomo jeszcze, czy będzie kasa, korekta czy strata.

**Zakończenia (4):** Z1 kasa — faktura dla klienta zewnętrznego · Z2 korekta (inwentaryzacja, zwrot) · Z3 strata — łańcuch urwany · Z4 pytanie — brak dokumentu.
**Stany przejściowe „w drodze" (4):** W1 przesunięcie na własną spółkę · W2 wydanie na budowę klienta · W3 zaliczka bez faktury końcowej · W4 towar wyszedł, faktury nie ma.

Uwaga do „inwestycji": wydania na **budowy klientów** (16,0 mln) to **przychód fakturowany w innym okresie**, a nie koszt — poprawione 2026-09-21 (wcześniej błędnie „nie przychód").
