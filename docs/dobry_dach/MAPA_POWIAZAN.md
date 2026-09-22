# MAPA POWIĄZAŃ — pliki, dokumenty, widoki (baza komandytowa, kopia do 07.08.2026)

Wygenerowane: 2026-09-21 · kopia: `Kopia_2024_KOMANDYTOWA` · tabel: **979**, widoków: **369**.

**Po co:** żeby wiedzieć, gdzie w bazie i w plikach żyje każda wartość i przez co się łączy — zamiast zgadywać przy każdym WZ.

## 1. Warstwy i klucze

| Warstwa | Gdzie | Klucz główny |
|---|---|---|
| Dokumenty | `dok__Dokument` (nagłówek) + `dok_Pozycja` (pozycje) | `dok_Id`, `ob_Id` |
| Kartoteki | `kh__Kontrahent` + `vwKlienci` (nazwa i NIP: `adr_NazwaPelna`, `adr_NIP`) | `kh_Id` |
| Rozrachunki i kasa | `nz__Finanse`, `nzf__Finanse` | `nzf_IdDokumentAuto` → `dok_Id` |
| Transakcje | `tr__Transakcja` | `tr_DokZamowienieId` → ZK, `tr_DokKoncowyId` → dokument końcowy |
| Wydruki i wzory | `dok_StatusWydruku` → `wy_Wzorzec` | `dsw_IdDokumentu`, `dsw_IdWzorca` |
| KSeF | `ksef_Faktury`, `ksef_NumerKSeF` (+18 tabel) | liczby na dokumencie: `dok_NumerKSeFId` |
| Widoki Subiekta | 369 widoków `vw*` | dziedziczą klucze tabel |

## 2. Wartości, które są kluczami łączenia (na dokumencie)

| Kolumna | Co łączy |
|---|---|
| `dok_DoDokId (+dok_DoDokNrPelny, dok_DoDokDataWyst)` | dokument powiązany — najczęstsza droga (18 118 z 19 477 WZ) |
| `dok_PlatnikId` | nabywca/płatnik → `kh__Kontrahent` → `vwKlienci` |
| `dok_OdbiorcaId` | odbiorca (budowa) — inny niż płatnik w 33% wydań |
| `dok_KatId` | handlowiec (kategoria dokumentu) → `sl_Kategoria` |
| `dok_MagId` | magazyn → `sl_Magazyn` (Główny / BRUSY / DEPOZYT) |
| `dok_Wystawil` | kto wpisał dokument — atrybut, NIE klucz |
| `dok_Uwagi` | ślad systemowy „Dokumenty źródłowe” + notatki (budowa, rejestracja) |
| `dok_ZlecenieId / dok_TransakcjaId` | powiązanie z transakcją CRM/Vendero/Sello |
| `dok_NumerKSeFId / dok_IdPaczkiKSeF` | powiązanie z KSeF |

## 3. Krawędzie: co z czego czyta (top 60 par widok → obiekt)

| Widok | Czyta z | Kolumn |
|---|---|---|
| `vwDokPowiazane` | `dok__Dokument` | 90 |
| `vwDok4ZamGrid` | `dok__Dokument` | 89 |
| `vwDok4ZamGridvenderoNO` | `vwDok4ZamGrid` | 87 |
| `vwDok4ZamGridvenderoOP` | `vwDok4ZamGrid` | 87 |
| `vwSynchronizacjaImport` | `uf_Synchronizacja` | 65 |
| `vwFinanseRozSplaty` | `nz__Finanse` | 49 |
| `vwFinanseRozDokumentyWszystkie` | `nz__Finanse` | 46 |
| `vwFinanseRozSplatyRew` | `nz__Finanse` | 46 |
| `vw_Zadanie` | `zd__Zadanie` | 44 |
| `vwFinanseRozKontrahenciDok` | `vwFinanseRozKontrahenciDokBazowy` | 42 |
| `vwFinanseRozKontrahenciDokBazowy` | `vwFinanseRozKontrahenciDokBazowyWszystkie` | 42 |
| `vwDokPowiazane` | `dfw__FakturyWewnetrzne` | 37 |
| `vwFinanseRozKontrahenciDokBazowyWszystkie` | `nz__Finanse` | 37 |
| `vwGratRachunkiDoUmowCP` | `plb_RachunekDoUmowyCP` | 36 |
| `vwFinanseRozrachunek` | `nz__Finanse` | 34 |
| `vwHB_operacja_do_skojarzenia` | `vwHB_operacje` | 34 |
| `vwHB_operacja_do_skojarzenia_ebank` | `vwHB_operacje_ebank` | 34 |
| `vwRewSchematyImportu` | `im_SchematImportu` | 33 |
| `vwRewSchematyImportuUEPiK` | `im_SchematImportu` | 33 |
| `vwFinanseDokumentKasowy` | `nz__Finanse` | 33 |
| `vwFinanseDokumenty` | `nz__Finanse` | 33 |
| `vwFinanseRozDekretow` | `nz__Finanse` | 33 |
| `vwOperacjePrzyjeciaST` | `st_Operacja` | 32 |
| `vwSchematyImportu` | `im_SchematImportu` | 31 |
| `vwFinanseKasaRazem` | `nz__Finanse` | 29 |
| `vwFinanseKasaRazemRew` | `nz__Finanse` | 29 |
| `vwHB_operacje` | `nz__Finanse` | 28 |
| `vwHB_operacje_ebank` | `nz__Finanse` | 28 |
| `vwImp_Handlowe` | `dok__Dokument` | 25 |
| `vwHB_transakcje_grid_view` | `hb_Transakcja` | 24 |
| `vwImp_Rachunek` | `plb_RachunekDoUmowyCP` | 24 |
| `vwDokDoDekretacji` | `vwImp_Handlowe` | 23 |
| `vwHB_transakcje_do_rozliczenia_grid_view` | `hb_Transakcja` | 21 |
| `vwImp_Rachunek` | `pl_RachunekDoUmowyCP` | 21 |
| `vwKursyCen` | `tw_Parametr` | 21 |
| `vwHB_transakcje_do_skojarzenia` | `hb_Transakcja` | 20 |
| `vwGratPotraceniaKomornicze` | `kp_KomornikPozyczkaDefinicja` | 20 |
| `vwDokDoDekretacji` | `vwImp_FakturyWewnetrzne` | 20 |
| `vwDokDoDekretacji` | `nz__Finanse` | 18 |
| `vwWyciagiBankowe` | `nz_WyciagBankowy` | 17 |
| `vw_Alarm` | `vw_Zadanie` | 17 |
| `vwDokDoDekretacji` | `vwImp_KorektyKosztow` | 17 |
| `vwFinanseRozliczenia` | `nz__Finanse` | 16 |
| `vwHB_operacje_i_transakcje_skojarzone` | `nz__Finanse` | 16 |
| `vwImp_Wyplata` | `pl_Wyplata` | 16 |
| `vwImp_FakturyWewnetrzne` | `dfw__FakturyWewnetrzne` | 15 |
| `vwImp_KorektyKosztow` | `kor__KorektaKosztow` | 14 |
| `vwRaportyKasowe` | `nz_RaportKasowy` | 14 |
| `vwImp_ListaPlac` | `plb_ListaPlac` | 14 |
| `vwImp_Wyplata` | `plb_Wyplata` | 14 |
| `vwDokDoDekretacji` | `vwImp_Rachunek` | 14 |
| `vwGratProwizje` | `kp_Prowizja` | 13 |
| `vwPodsumowanieKPIR` | `kpr__Ksiega` | 13 |
| `vwFinanseRozNierozliczone` | `nz__Finanse` | 13 |
| `vwGratUmowyCP` | `plb_UmowaCP` | 13 |
| `vwOdliczeniaDoliczenia` | `prz_OdliczenieDoliczenie` | 13 |
| `vwHB_operacje_i_transakcje_skojarzone` | `hb_Transakcja` | 12 |
| `vwNetParametrInd` | `net_ParametrInd` | 12 |
| `vwWyciagiBankoweLookup` | `nz_WyciagBankowy` | 12 |
| `vwImp_ListaPlac` | `pl_ListaPlac` | 12 |

## 4. Ile kolumn w kluczowych obiektach (rozmiar mapy)

| Obiekt | Kolumn |
|---|---|
| `dok__Dokument` | 173 |
| `kh__Kontrahent` | 164 |
| `nz__Finanse` | 98 |
| `vwDokPowiazane` | 90 |
| `vwMagazyn` | 76 |
| `dok_Pozycja` | 58 |
| `vwKlienci` | 57 |
| `zd__Zadanie` | 54 |
| `vwZbiorcza_Pozycja` | 49 |
| `tr__Transakcja` | 43 |
| `ksef_Faktury` | 31 |
| `vwDokumenty` | 17 |
| `wy_Wzorzec` | 17 |
| `dok_StatusWydruku` | 4 |

## 5. Warstwa PLIKÓW — co w którym pliku klienta i jak się łączy z bazą

| Plik / arkusz | Co trzyma | Klucz do bazy |
|---|---|---|
| `Sprzedaz_..._CODEX.xlsx` → arkusz „WZ komandytowa” (19 732 w.) | rejestr wydań klienta + jego przypisanie | `Nr WZ` = `dok_NrPelny` |
| → „WZ jawna” (6 019) / „WZ zoo” (103) / „WZ HURTOWA” (68) | to samo dla pozostałych podmiotów | `Nr WZ` (baza jawna/ZOO) |
| → „raport o dokumentach” (13 024) | faktury i dokumenty: kategoria, netto, koszt | `Numer` |
| → „KONTROLA” (9 798) / „PODSUMOWANIE” (105) | jego zbiorcze ujęcie i wynik marżowy | `Numer` / segment |
| → „PZ KOM” (1 269) | przyjęcia z dokumentem wskazanym | `Nr PZ` |
| `kasa_wz.csv` / `tracker_wz.csv` (26 580 w.) | nasze pomiary: scenariusz, droga, kasa | `nr_wz` + `baza` |
| `brak_dokumentu_WZ_komandytowa.csv` (557) | jego wydania bez dokumentu | `Nr WZ` |

## 6. Gdzie wartość z WZ prowadzi dalej (pomosty)

| Wartość na WZ | Pomost w innym zestawieniu |
|---|---|
| numer WZ w `dok_Uwagi` | inny dokument (ślad systemowy — 17 w bazie) |
| miejscowość/adres z `dok_Uwagi` | `vwKlienci.adr_Miejscowosc` — 68 wydań bez łącznika (5%) |
| „DOSTAWA <nazwisko>” z Uwag | `kh__Kontrahent.kh_Symbol` / `adr_NazwaPelna` |
| numer rejestracyjny (LR-, WA-, BP-) | zestawienia transportowe / kalendarz (poza bazą) |
| kwota wydania | `nz__Finanse` — wpłata wskazuje klienta |
| NIP nabywcy | `ksef_Faktury` — faktura może nie mieć odbicia w Subiekcie |

## 7. Ile wisi na dokumencie (tabele wskazujące na `dok_Id`)

| Tabela | Kolumn |
|---|---|
| `nz__Finanse` | 98 |
| `dok_Pozycja` | 58 |
| `ewa__EwidencjeAkcyzowe` | 37 |
| `iw_Pozycja` | 21 |
| `kor_Pozycja` | 13 |
| `dok_Vat` | 10 |
| `rf_Pozycja` | 10 |
| `dok_StatusWydruku` | 4 |
| `dok_UzytePromocje` | 2 |
| `LEO_DokumentyZbiorcze2_Powiazania` | 2 |
