#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAPORT N4 — dziennik wychodzących WZ-tek z magazynu, dla wszystkich PH.
Likwiduje dziurę: "nie wiem czy towar wyjechał i do kogo" (PH) + "WZ bez pokrycia" (zarząd).

Użycie:
  python3 build_raport_n4.py                  # ostatni dzień z bazą WZ
  python3 build_raport_n4.py 2026-08-07       # konkretny dzień
  python3 build_raport_n4.py --test           # 10 dni testowych (ostatnie 10 z ruchem)

Wyjście: docs/raporty_n4/<dzien>.html + raporty_n4/MAIL_<dzien>.txt (propozycja maila)
Źródło: Kopia_2024_KOMANDYTOWA (kontener subiekt-mssql, 127.0.0.1:1433)
"""
import sys, os, io, datetime, subprocess
import pymssql

# ---------- konfiguracja ----------
DB = 'Kopia_2024_KOMANDYTOWA'
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raporty_n4')
KAT_PH = {  # sl_Kategoria: kod -> (nazwa PH) — weryfikowane na bazie 26.08
    12: 'CD — Dariusz Czapiewski', 13: 'PZ — Paweł Zwaliński', 14: 'MR — Rafał Miszewski',
    15: 'WA — Woroniecki Artur', 16: 'LR — Radek Laskowski', 17: 'SM — Misza Sundeev',
    18: 'GG — Grzegorz Gierszewski', 19: 'MP — Marek Pestka', 23: 'GM — Giersewski Maciej',
    26: 'BK — Karolina Blank', 27: 'LP — Laskowski Patryk',
    1: 'Sprzedaż (worek ofert)', 2: 'Zakup', 5: 'Detal', 6: 'Hurtowa', 10: 'Magazyn',
    20: 'PAL — Palety', 21: 'KOSZT', 22: 'MARKETING', 24: 'DEKARZ',
}

def _db_pass():
    out = subprocess.run(['docker', 'inspect', 'subiekt-mssql', '--format',
                          '{{range .Config.Env}}{{println .}}{{end}}'],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if 'MSSQL_SA_PASSWORD' in line:
            return line.split('=', 1)[1].strip()
    raise RuntimeError('brak hasła w env kontenera')

def pobierz_dzien(dzien):
    """WZ danego dnia: nr, klient (nazwa), kategoria, czy ma ZK."""
    conn = pymssql.connect(server='127.0.0.1', port=1433, user='sa',
                           password=_db_pass(), login_timeout=30)
    cur = conn.cursor()
    cur.execute(f"""
        SELECT w.dok_NrPelny,
               COALESCE(k.kh_Nazwisko, k.kh_Symbol, 'BRAK KLIENTA') AS klient,
               w.dok_KatId,
               (SELECT COUNT(*) FROM {DB}.dbo.dok__Dokument zk
                WHERE zk.dok_Typ=16 AND zk.dok_DoDokId=w.dok_Id) AS ma_zk
        FROM {DB}.dbo.dok__Dokument w
        LEFT JOIN {DB}.dbo.kh__Kontrahent k ON k.kh_Id = w.dok_OdbiorcaId
        WHERE w.dok_Typ=11 AND CONVERT(date, w.dok_DataWyst) = %s
        ORDER BY w.dok_KatId, w.dok_NrPelny
    """, (str(dzien),))
    rows = cur.fetchall()
    conn.close()
    return rows

def dni_testowe(n=10):
    conn = pymssql.connect(server='127.0.0.1', port=1433, user='sa',
                           password=_db_pass(), login_timeout=30)
    cur = conn.cursor()
    cur.execute(f"""
        SELECT TOP {n} CONVERT(date, dok_DataWyst)
        FROM {DB}.dbo.dok__Dokument WHERE dok_Typ=11
        GROUP BY CONVERT(date, dok_DataWyst) ORDER BY 1 DESC
    """)
    days = [r[0] for r in cur.fetchall()]
    conn.close()
    return days

def render_html(dzien, rows):
    """Grupuj per PH, potem per klient. Tabela: WZ | klient | ZK?"""
    by_ph = {}
    for nr, klient, kat, ma_zk in rows:
        by_ph.setdefault(kat, []).append((nr, klient, ma_zk))

    total = len(rows)
    z_zk = sum(1 for r in rows if r[3] > 0)
    bez_zk = total - z_zk
    ph_count = len(by_ph)

    # sortuj: najpierw prawdziwi PH (kody 12-19,23,26,27), potem reszta
    def ph_sort_key(k):
        return (0 if k in (12,13,14,15,16,17,18,19,23,26,27) else 1, k)

    cards = []
    for kat in sorted(by_ph, key=ph_sort_key):
        nazwa = KAT_PH.get(kat, f'kategoria {kat}')
        items = by_ph[kat]
        rows_html = ''
        for nr, klient, ma_zk in items:
            badge = ('<span class="zk tak">✓ ma ZK</span>' if ma_zk
                     else '<span class="zk nie">✗ bez ZK</span>')
            rows_html += (f'<tr><td class="mono">{nr}</td>'
                          f'<td>{klient}</td><td>{badge}</td></tr>')
        cards.append(f"""
<div class="card">
  <div class="ph"><span class="ph-kod">{nazwa.split(' — ')[0]}</span>
  <b>{nazwa.split(' — ')[1] if ' — ' in nazwa else nazwa}</b>
  <span class="cnt">{len(items)} WZ · {sum(1 for i in items if i[2])} z ZK · {sum(1 for i in items if not i[2])} bez</span></div>
  <table><tr><th>WZ</th><th>Klient</th><th>Pokrycie</th></tr>{rows_html}</table>
</div>""")

    data_pl = dzien.strftime('%d.%m.%Y') if isinstance(dzien, (datetime.date, datetime.datetime)) else str(dzien)
    html = f"""<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Raport WZ — {data_pl}</title>
<style>
:root{{--vio:#7c5cff;--ink:#1a1f2b;--mut:#667085;--line:#e4e7ec;--green:#1d7a3f;--red:#b42318}}
*{{box-sizing:border-box}}
body{{font-family:'Space Grotesk',-apple-system,'Segoe UI',Arial,sans-serif;background:#f4f5f9;color:var(--ink);margin:0;padding:28px 22px 60px}}
.wrap{{max-width:1100px;margin:0 auto}}
h1{{font-size:24px;margin:0 0 4px;letter-spacing:-.3px}}
.sub{{color:var(--mut);font-size:14px;margin:0 0 18px}}
.legend{{display:flex;gap:16px;font-size:13px;font-weight:600;margin-bottom:18px}}
.big{{font-family:'IBM Plex Mono',monospace;font-size:13px;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:12px 18px;display:inline-flex;gap:18px;margin-bottom:20px}}
.big b{{font-size:20px}}
.card{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-bottom:16px}}
.ph{{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}}
.ph-kod{{background:#111;color:#fff;border-radius:8px;padding:3px 10px;font-weight:800;font-size:13px;font-family:'IBM Plex Mono',monospace}}
.cnt{{margin-left:auto;color:var(--mut);font-size:12.5px;font-family:'IBM Plex Mono',monospace}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
th{{text-align:left;background:#f6f8fa;padding:7px 10px;border-bottom:2px solid var(--line);font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#57606a}}
td{{padding:7px 10px;border-bottom:1px solid #f0f2f5}}
.mono{{font-family:'IBM Plex Mono',monospace;font-size:12.5px}}
.zk{{font-size:12px;font-weight:700;border-radius:999px;padding:2px 10px;white-space:nowrap}}
.zk.tak{{background:#e7f6ec;color:var(--green)}}
.zk.nie{{background:#ffe9e7;color:var(--red)}}
.stress{{background:#fff8c5;border:1.5px solid #f2ddb0;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:18px}}
.foot{{color:#98a2b3;font-size:11.5px;margin-top:24px;text-align:center}}
</style></head><body><div class="wrap">
<h1>🚚 WZ z magazynu — {data_pl}</h1>
<p class="sub">Wychodzące wydania towaru · do wszystkich PH · źródło: Subiekt (odczyt 26.08)</p>
<div class="legend"><span class="zk tak">✓ ma ZK</span><span class="zk nie">✗ bez ZK</span></div>
<div class="big"><span>WZ <b>{total}</b></span><span>z ZK <b>{z_zk}</b></span><span>bez ZK <b>{bez_zk}</b></span><span>PH <b>{ph_count}</b></span></div>
{('<div class="stress">⚠️ <b>' + str(bez_zk) + ' WZ bez ZK</b> — towar wyjechał bez powiązanego zamówienia. '
   'Do wyjaśnienia: czy pole „dokument powiązany” nie było wypełnione, czy wydanie szło do faktury (FS).</div>') if bez_zk else ''}
{''.join(cards)}
<div class="foot">Dobry Dach · raport N4 (dziennik WZ) · wygenerowano {datetime.date.today().strftime('%d.%m.%Y')}</div>
</div></body></html>"""
    return html

def render_mail(dzien, rows):
    """Propozycja fizycznego maila do PH — tekst, do wklejenia w treść."""
    total = len(rows)
    z_zk = sum(1 for r in rows if r[3] > 0)
    bez_zk = total - z_zk
    data_pl = dzien.strftime('%d.%m.%Y') if isinstance(dzien, (datetime.date, datetime.datetime)) else str(dzien)
    by_ph = {}
    for nr, klient, kat, ma_zk in rows:
        by_ph.setdefault(kat, []).append((nr, klient, ma_zk))

    sekcje = []
    for kat, items in sorted(by_ph.items()):
        nazwa = KAT_PH.get(kat, f'kategoria {kat}')
        linie = []
        for nr, klient, ma_zk in items:
            znak = 'TAK' if ma_zk else 'NIE'
            linie.append(f"   - {nr}  |  {klient}  |  ZK: {znak}")
        sekcje.append(f"{nazwa} ({len(items)} WZ):\n" + "\n".join(linie) + "\n")

    mail = f"""Temat: WZ z magazynu — {data_pl} ({total} wydań)

Cześć,

dziś z magazynu wyszło {total} WZ-tek. Poniżej rozbicie per handlowiec —
zaznaczone, które wydanie ma pokrycie w zamówieniu (ZK), a które nie.

PODSUMOWANIE:
- WZ łącznie: {total}
- z powiązanym ZK: {z_zk}
- bez ZK: {bez_zk}  ⚠️

{" ".join(sekcje)}

WZ bez ZK = towar wyjechał bez powiązanego zamówienia. Jeśli to nie było
celowe (wydanie do faktury), dopisz ZK w polu „dokument powiązany” —
inaczej system nie pokaże postępu realizacji.

Pozdrawiam,
[automat Dobry Dach]
"""
    return mail

def main():
    args = sys.argv[1:]
    os.makedirs(OUT_DIR, exist_ok=True)
    if '--test' in args:
        dni = dni_testowe(10)
        print(f"Tryb testowy: {len(dni)} dni")
    elif args and args[0] != '--test':
        dni = [datetime.date.fromisoformat(args[0])]
    else:
        dni = dni_testowe(1)

    for dzien in dni:
        rows = pobierz_dzien(dzien)
        if not rows:
            print(f"  {dzien}: brak WZ — pomijam")
            continue
        tag = str(dzien)
        with io.open(os.path.join(OUT_DIR, f'{tag}.html'), 'w', encoding='utf-8') as f:
            f.write(render_html(dzien, rows))
        with io.open(os.path.join(OUT_DIR, f'MAIL_{tag}.txt'), 'w', encoding='utf-8') as f:
            f.write(render_mail(dzien, rows))
        z_zk = sum(1 for r in rows if r[3] > 0)
        print(f"  {dzien}: {len(rows)} WZ ({z_zk} z ZK, {len(rows)-z_zk} bez) → {tag}.html + MAIL_{tag}.txt")

if __name__ == '__main__':
    main()
