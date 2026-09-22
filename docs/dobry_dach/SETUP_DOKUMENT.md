# SETUP — dokument projektu automatyzacji Dobry Dach

## Cel główny

Budowa automatyzacji w oparciu o:
- **kluczowy proces biznesowy**
- **kluczowe dane klienta**:
  - baza danych z Subiekta
  - kilka raportów Excel (np. raport kasowy)
  - nasz mapping procesu — dlatego musi być potem **osobnym assetem**
  - dokumenty Tomasza
  - kalendarze jako narzędzie logistyczne
  - maile jako narzędzie komunikacji — ale i też (chyba) źródło wiedzy o powodach zmian

## Najważniejsze założenie

**Całość stoi na jednym fundamencie: runner (Python) czyta bazę Subiekta (read-only), a wiedza o firmie żyje w folderze .md — i oba są na maszynie w biurze, nigdy nie zasypiającej.** Od tego zależą wszystkie automaty: A6/N4 (raporty), A3 (marża), A5/A7 (WZ→ZK). Bez dostępu do bazy nie ma nic.

## Najważniejsze źródła danych i połączenia

| # | Źródło danych | Co tam żyje | Połączenie | Status |
|---|---|---|---|---|
| 1 | **Baza KOMANDYTOWA** (Subiekt GT) | ZK (zamówienia = oferty), WZ (wydania), zakupy, materiały | MS SQL przez LAN (pymssql, konto `dd_auto` read-only) | ✅ mamy kopię lokalną; produkcyjna u klienta |
| 2 | **Baza JAWNA** (Subiekt GT) | faktury do klienta (FV, FZ), usługi | MS SQL, to samo konto `dd_auto`, GRANT SELECT | ⏳ czeka na dostęp — bez niej A6 = pół obrazu |
| 3 | **Raporty Excel klienta** | raport kasowy, sprzedaż, marże (np. sprzedaż 2026-05.xlsx) | pliki → import/odczyt | ✅ wzorce rozpoznane |
| 4 | **Mapping procesu (nasz)** | AS-IS/TO-BE, węzły, pytania-blokery, odkrycia | osobny asset (osobny plik/folder) | ✅ istnieje (STRUKTURA_WEZLOW, proces-roboczy) |
| 5 | **Dokumenty Tomasza** | notatki z wizyt, specyfikacje, reguły (np. stanu zero) | pliki → folder wiedzy | ✅ |
| 6 | **Kalendarze Google** | 6 kalendarzy pojazdów = narzędzie logistyczne (A4) | Google Calendar API (OAuth) | ✅ działa (37 eventów odczytanych) |
| 7 | **Maile (SMTP)** | wysyłka raportów/alertów; **źródło wiedzy o powodach zmian** | poczta.dobry-dach.pl:587 | ✅ SMTP działa; odczyt historii maili do rozważenia |
| 8 | **Folder wiedzy .md (second brain)** | procesy, asortyment, procedury, zbiory | czat czyta pliki wprost | 🆕 do zbudowania (vault DD) |

**Zasada łączności:** wszystko read-only poza wysyłką maili (SMTP) i zapisem do kalendarza (A4 — po akceptacji). Żaden automat nie pisze do Subiekta poza A2 (przez Sferę, osobna decyzja). Konto `dd_auto` = tylko SELECT.

## Założenia

1. **Setup jest lokalny** — oparty o **jeden konkretny lokalny folder z wiedzą** (skille i reszta w jednym miejscu).
   → pytanie otwarte: czy to dobre/złe? czy można inaczej? (do rozstrzygnięcia)
2. **Second brain = folder z plikami .md (Obsidian), nie baza danych.** Czat czyta pliki wprost; człowiek widzi i edytuje. Postgres do rozważenia dopiero gdy automaty zaczną pisać dane strukturalne (logi/zdarzenia) i trzeba po nich query — wtedy obok, nie zamiast. (werdykt 26.08)
   → **Obsidian to tylko edytor; magazynem jest folder .md** — czyste pliki, zero lock-inu: każdy czat je czyta bez Obsidiana, a zmiana edytora (Logseq, cokolwiek) = zero migracji. .md wygrywa uniwersalnością; nie ma „lepszego" formatu na poziomie magazynu.
3. **Chatbot w sieci biura (LAN)** — instalacja second brain do setupu. Inni (handlowcy, logistyka) wchodzą przez przeglądarkę na maszynę always-on (`http://maszyna:port`) i pytają. Odpowiedzi z folderu wiedzy (RAG, cytuje źródło); dane nie wychodzą z sieci biura. Zdalnie: przez RDP/VPN biura. Internet/klient końcowy — osobna decyzja, nie teraz.
   → **Rozróżnienie źródeł:** folder = wiedza stała (opisy, kategorie, cenniki, procedury) · baza Subiekta = stan na dziś (stany, ceny, WZ) — pytania „żywe" (asortyment/stan) wymagają mostu runnera do bazy, nie tylko plików. (use case: pytania asortymentowe)
4. **Osobny vault DD, osobny vault TW — jedna metoda.** Wiedza firmy (procesy, asortyment, mapping) nie miesza się z osobistym vaultem Tomka (TW_vault: Raw → Wiki, frontmatter, wikilinki). Wzorzec potwierdzony działaniem TW_vault (537 stron Wiki, pluginy dataview + local-rest-api).
   → **W jednym vaultcie wiele zbiorów** (foldery + tagi): Procesy / Asortyment / Klienci / Automaty / Ludzie / Czat-publiczny. Czat wybiera zbiór per pytanie; zbiory można dodawać bez zmiany struktury.
5. **Sposób budowy agentów (wzorzec z CASE_STUDY_AGENT_Z_WIKI, 02.09.2026) — do trzymania w głowie przy budowie, nie do przenosin.** Wiedza zmienia zachowanie systemu dopiero, gdy jej czytanie jest KROKIEM procesu (nie dobrą praktyką), a nauka wraca do pliku, który czyta kod.
   → Struktura `_WIKI/`: KANON · MASZYNA (pipeline, progi, bramki) · TRIKI + ZAKAZY osobno · RESEARCH (klasa dowodu ✅✅/✅/⚠️/❌, INDEX obalonych) · CASE_STUDIES · SESSION_LOG.
   → Agent: protokół START = kroki wiążące (ctx_search → LEARNINGS → RESEARCH/INDEX → ZAKAZY → SESSION_LOG → PIPELINE). Kolejność ma powód.
   → Pętla: korekta zapisana w TEJ SAMEJ turze → destylacja przy 2× → nauka ląduje w pliku, który czyta automat.
   → CBA: reguła z datą + źródłem + warunkiem rewizji. Hierarchia: pomiar N≥30 > praktyka > opinia > analogia. Progi = minimum, nie sufit.
   → **Cel: agenci i bazy pod CRO budowane wg tego wzorca** (audyty, LP, kontent, analityka).
6. **Strażnik — audytor procesu (agent-środek ciężkości).** Nie opiekun automatów (ten po miesiącu produkcji) — audytor, który od pierwszego dnia czyta bazę (4 lata historii) i mierzy proces: ile trwa ZK→WZ→FV, gdzie się sypie (WZ bez ZK 62%, ZK bez WZ 65%, ZK bez handlowca, FV 8% z komandytowej), jak ma być vs jak jest, co działa a co nie (per PH/kategoria/miesiąc). Cykliczny raport dziur (np. co tydzień) → każda dziura = kandydat na automat lub regułę. Automaty = egzekucja, strażnik = detekcja. Karmi obszary 1–4 naraz. Persona: NIE — rola z protokołem START i ZAKAZAMI (przewidywalność > charyzma). Persona publiczna na stronie DD — osobna decyzja, osobny czat.
   → **Hierarchia: watchdog to robotnik strażnika.** Watchdog zbiera (logi, czy automat wstał, liczby z doby), strażnik osądza (co to znaczy dla procesu, gdzie dziura). Strażnik zarządza watchdogiem — nie odwrotnie. Watchdog bez strażnika = alarm bez interpretacji; strażnik bez watchdoga = ślepy na awarie.
   → **Watchdog musi być też NAPRAWIACZEM, nie tylko alarmistą.** Wykrył → naprawia sam: restart automatu, ponowienie wysyłki, przywrócenie configu, rollback do ostatniej dobrej wersji. Mail/alert dopiero gdy naprawa nie pomogła (np. 2 nieudane próby) — wtedy eskalacja do strażnika/człowieka. Zasada: ciche samonaprawienie = zero hałasu; krzyk tylko przy realnej awarii.
7. **Boty — warstwa komunikacyjna z ludźmi.** Dochodzą do strażnika i watchdogów jako osobny byt: interfejsy konwersacyjne dla konkretnych ludzi w konkretnych sytuacjach. Każdy bot ma własny protokół, zakres i ZAKAZY (nie udaje człowieka, nie obiecuje, eskalacja do człowieka przy granicy zakresu). Kandydaci: bot wewnętrzny w biurze (pracownicy pytają o procesy/asortyment — patrz założenie 3), bot brygadzisty w terenie (3–5 pytań wieczorem, raport z dachu — obszar 3), bot na stronie DD (publiczny, lead — osobna decyzja). Boty czytają tę samą wiedzę co strażnik — nie mają własnych wysp wiedzy.
   → **Kanał: WhatsApp, nie Discord — to nie to pokolenie.** Dekarz na dachu ma telefon z WhatsApp, nie przeglądarkę na LAN biura. Boty terenowe (brygadzista, pracownicy) żyją tam, gdzie ludzie już są — WhatsApp (API/Meta lub most). Bot wewnętrzny biurowy może zostać na LAN; bot terenowy = WhatsApp.
   → **Marzenie (wizja): ludzie GADAJĄ do botów i DZWONIĄ do botów, boty REJESTRUJĄ.** Głos jako wejście (transkrypcja rozmowy), rejestr jako wyjście (notatka/zdarzenie w systemie automatycznie). Dekarz dzwoni i mówi „skończyliśmy u Kowalskiego, brakuje 2 rolek" → bot transkrybuje, rejestruje, dopytuje o braki. Kanał głosowy = naturalny dla pokolenia które nie pisze; rejestracja = zero pracy admina. To samo nagranie karmi rejestr zdarzeń i strażnika (zmiany w procesie).
8. **Repo HTML/dokumentów — osobne od folderu wiedzy.** Vault .md = wiedza robocza (edytuje Tomek/czat); repo publikacji = HTML/dokumenty gotowe do pokazania (raporty, hub, portfel, status). **Istnieje:** `ai4cro-reports` (GH Pages, github.com/Tomekwlqq/ai4cro-reports.git) → `docs/dobry_dach/` — 20+ plików live. Folder wiedzy i repo to dwa byty, publikacja = kopiowanie z projektu do repo + push.

## Cele dodatkowe / na później

1. **Zebranie wiedzy o firmie w jednym miejscu dla czata** — żeby mógł on dowolnie odpowiedzieć na pytanie.
2. **Ekstrakcja oferty i pokazanie na stronie (później?)** — najpierw sprawdzić: czy strona DD w ogóle ma ofertę produktową? (raczej nie ma...) — póki co trzeba „do nich przyjść" (do ofert).

## Zadania / obszary (dyktando 02.09)

### 1. Automatyzacje — nr 1

- **7 automatów w planie**, jedna trudna
- **3 nowe zidentyfikowane** (z wizyty 25.08: N1 walidator podmiotów · N2 rozliczanie inwestycji po OPIS · N3 obieg pieniądza)
- **2 w realizacji / testach** (A6 raport PH — end-to-end, testy na lipcu · N4 dziennik WZ dla PH — 10 dni testowych)

> Mapowanie na stan projektu (do weryfikacji): „7 w planie" = A0–A7 bez A1 (A1 czeka na próbki PDF) · „jedna trudna" = A2 (Sfera, licencja, jedyny piszący) lub A7 (obie bazy + definicja rozjazdu) · „2 w realizacji" = A6 + N4.

### 2. Bieżące wsparcie

- Dobra znajomość: **bazy**, **procesów**, **procedur**
- **jak ma być vs jak jest** (luka między procedurą a praktyką — np. pole „dokument powiązany" na WZ istnieje, ale 62% WZ go nie używa)
- znajomość **asortymentu** itp.

### 3. Wsparcie inwestycji i pracy w terenie

- wsparcie realizacji **inwestycji** (duże zlecenia / GW)
- wsparcie **pracy w terenie** (brygady, raportowanie z dachu)

### 4. NADZÓR NAD UMOWAMI

### 5. Asystent i czat

- asystent dla ludzi w firmie (pracowników) — odpowiada na pytania o firmę/procesy
- czat w sieci biura (patrz założenie 3: LAN, wiedza z folderu, RAG)
