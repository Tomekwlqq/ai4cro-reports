# GA4 Unassigned Sessions — naprawa (GLOV)

Instrukcja redukcji kanału "Unassigned" w GA4 property 342844459.

---

## Przyczyny (GLOV-specyficzne)

| Przyczyna | Objawy | Priorytet |
|---|---|---|
| Zły `utm_medium` w Meta Ads | Meta Ads → Unassigned (zamiast Paid Social) | 🔴 P0 |
| Brak cross-domain config | Allegro/TikTok Shop → Direct / Unassigned | 🔴 P0 |
| Reporting Identity = Observed | Więcej Unassigned z powodu braku User ID | 🟡 P1 |
| GTM tag initialization order | Sesje bez kontekstu UTM | 🟡 P1 |

---

## Fix #1 — `utm_medium=paid_social` w Meta Ads (P0, 15 min)

GA4 Default Channel Groups rozpoznaje `paid_social` — nie `social`, `cpc` ani `paid`.

**Meta Ads Manager → Kampania → Zestaw reklam → Tracking:**
```
utm_source=meta
utm_medium=paid_social
utm_campaign={{campaign.name}}
utm_content={{ad.name}}
```

> Dla kampanii Advantage+ (automatyczne adresy URL): wymuś URL params ręcznie na poziomie Ad Set.

---

## Fix #2 — Cross-domain tracking (P0, 10 min)

**GA4 Admin → Data Streams → glov.co → Configure Tag Settings → Configure your domains:**

Dodaj domeny:
- `glov.co`
- `glov.eu` (jeśli jest zakup cross-domain)

Weryfikacja: kliknij link między domenami, sprawdź czy URL ma `?_gl=` parametr.

> Allegro/TikTok/Hebe nie obsługują cross-domain GA4 — te sesje zawsze będą Direct/Unassigned. Jedyne rozwiązanie: Custom Channel Group (patrz Fix #4).

---

## Fix #3 — Reporting Identity (P1, 2 min — quick win)

**GA4 Admin → Property Settings → Reporting Identity → Device-Based**

Efekt: mniej Unassigned bo GA4 nie próbuje łączyć sesji cross-device (gdzie źródło ginie).
Koszt: dane demograficzne mniej dokładne.

---

## Fix #4 — Custom Channel Group dla Allegro/TikTok/Hebe (P1, 20 min)

**GA4 Admin → Channel Groups → +Create:**

| Nazwa kanału | Reguła |
|---|---|
| Allegro | `source contains "allegro"` |
| TikTok Shop | `source contains "tiktok" AND medium = "(none)"` |
| Hebe | `source contains "hebe"` |

---

## Fix #5 — GTM initialization order (P2, dev)

Google Tag (GA4 base) musi być na triggerze **Initialization — All Pages**, nie Page View.
Wszystkie event tagi = trigger Page View lub zdarzenie. Kolejność tagów GTM jest kluczowa.

Sprawdź: GTM Preview → sekwencja tagów na stronie głównej.

---

## Oczekiwany efekt

| Fix | Redukcja Unassigned |
|---|---|
| #1 `utm_medium=paid_social` | ~40–60% (Meta = główny kanał płatny) |
| #2 Cross-domain | ~5–10% (jeśli glov.eu zakupy) |
| #3 Reporting Identity | ~10–20% |
| #4 Custom Channel Group | ~10% (BL źródła) |

Łącznie: możliwe zejście z Unassigned ~15% → ~3–5%.

---

*Źródła: analyticsmania.com, conversios.io, littledata.io | 2026-07-29*
