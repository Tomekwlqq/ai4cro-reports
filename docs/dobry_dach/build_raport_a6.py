#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
A6 v3b — RAPORT PH (docelowy, wg specyfikacji z notatek Jura 25.08).
STAN NA DZIEŃ, SUMARYCZNIE DO DNIA (narastająco), PER KLIENT.
Budowa (prosta, walidowana):
  - aktywne ZK per klient (typ 16, status 6/7, data <= dzien) -> wartość ofert
  - WZ per klient do dnia (typ 11, status aktyw, data <= dzien) przez 3 mechanizmy
    powiązań z ZK -> ile WZ ma ZK, koszt (ob_WartMag), wartość
  - FS/FZ per klient do dnia (faktury) -> suma
  - wpłaty per klient do dnia -> suma
Użycie: SUBIEKT_PASS=... python3 build_raport_a6.py --dzien YYYY-MM-DD --out plik.html [--ph KAT]
  --ph KAT  (opcjonalnie) filtr: tylko klienci danego PH (np. --ph 12 = CD). Bez = wersja zbiorcza dla Tomasza.
"""
import os, sys, argparse, datetime, html as _html
from collections import defaultdict
import pymssql

DB = os.environ.get('SUBIEKT_DB', 'Kopia_2024_KOMANDYTOWA')

def q(cur, sql, params=None):
    cur.execute(sql, params or ())
    return cur.fetchall()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dzien', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--ph', type=int, default=None)
    a = ap.parse_args()
    dzien = datetime.date.fromisoformat(a.dzien)
    koniec = dzien + datetime.timedelta(days=1)   # do końca dnia raportu (data < koniec)

    conn = pymssql.connect(server='localhost', user='sa',
                           password=os.environ['SUBIEKT_PASS'], database=DB)
    cur = conn.cursor()

    kat = {r[0]: (r[1] or '') for r in q(cur, f"SELECT kat_Id, kat_Nazwa FROM {DB}.dbo.sl_Kategoria")}
    def lab(ph):
        if ph is None: return "(brak)"
        u = kat.get(ph)
        return f"{u}".strip() if u else f"#{ph}"

    # ── 1. AKTYWNE ZK per klient — PIERWOTNA WARTOŚĆ = SUMA POZYCJI (ob_WartNetto po ob_DokHanId)
    zk = q(cur, f"""
      SELECT z.dok_OdbiorcaId AS kh, z.dok_KatId AS ph,
             COUNT(DISTINCT z.dok_Id) AS ile, SUM(COALESCE(p.ob_WartNetto,0)) AS wart
        FROM {DB}.dbo.dok__Dokument z
        LEFT JOIN {DB}.dbo.dok_Pozycja p ON p.ob_DokHanId = z.dok_Id
       WHERE z.dok_Typ=16 AND z.dok_Status IN (6,7) AND z.dok_DataWyst < %s
       GROUP BY z.dok_OdbiorcaId, z.dok_KatId""", (koniec,))

    # ── 2. WZ do dnia per klient: wszystkie + koszt (z osobnej agregacji pozycji)
    wz = q(cur, f"""
      SELECT v.kh_Id AS kh, w.dok_KatId AS ph,
             COUNT(*) AS ile, SUM(w.dok_WartNetto) AS wart
        FROM {DB}.dbo.dok__Dokument w
        LEFT JOIN {DB}.dbo.vwKlienci v ON v.kh_Id = w.dok_OdbiorcaId
       WHERE w.dok_Typ=11 AND w.dok_Status NOT IN (0,2) AND w.dok_DataWyst < %s
       GROUP BY v.kh_Id, w.dok_KatId""", (koniec,))

    # ── 3. FS/FZ per klient do dnia (faktury wystawione)
    fv = q(cur, f"""
      SELECT f.dok_OdbiorcaId AS kh, f.dok_KatId AS ph,
             COUNT(*) AS ile, SUM(f.dok_WartNetto) AS suma
        FROM {DB}.dbo.dok__Dokument f
       WHERE f.dok_Typ IN (2,1) AND f.dok_Status NOT IN (0,2) AND f.dok_DataWyst < %s
       GROUP BY f.dok_OdbiorcaId, f.dok_KatId""", (koniec,))

    # ── 4. WPŁATY per klient do dnia (splata 41 -> dlug -> dokument -> odbiorca)
    wpl = q(cur, f"""
      SELECT f.dok_OdbiorcaId AS kh, COUNT(*) AS ile, SUM(sp.nzf_Wartosc) AS suma
        FROM {DB}.dbo.nz__Finanse sp
        JOIN {DB}.dbo.nz_FinanseSplata ns ON ns.nzs_IdSplaty = sp.nzf_Id
        JOIN {DB}.dbo.nz__Finanse dl ON ns.nzs_IdDlugu = dl.nzf_Id
        LEFT JOIN {DB}.dbo.dok__Dokument f ON dl.nzf_IdDokumentAuto = f.dok_Id
       WHERE sp.nzf_Typ=41 AND sp.nzf_Data < %s AND sp.nzf_Status<>2
         AND f.dok_OdbiorcaId IS NOT NULL
       GROUP BY f.dok_OdbiorcaId""", (koniec,))

    # nazwy klientów
    kh_ids = set()
    for src in (zk, wz, fv, wpl):
        for r in src: kh_ids.add(r[0])
    klienci = {}
    if kh_ids:
        ids = ','.join(str(x) for x in kh_ids if x is not None)
        if ids:
            for r in q(cur, f"SELECT kh_Id, COALESCE(adr_NazwaPelna, adr_Nazwa, 'BRAK NAZWY') AS n FROM {DB}.dbo.vwKlienci WHERE kh_Id IN ({ids})"):
                klienci[r[0]] = r[1]

    # ── 5. WZ bez ZK do dnia (dziury) — OSTATNIE 14 dni
    gole = q(cur, f"""
      SELECT w.dok_NrPelny, v.adr_NazwaPelna AS klient, w.dok_KatId AS ph,
             w.dok_DataWyst, w.dok_WartNetto,
             (SELECT COALESCE(SUM(poz.ob_WartMag),0) FROM {DB}.dbo.dok_Pozycja poz WHERE poz.ob_DokMagId=w.dok_Id) AS koszt
        FROM {DB}.dbo.dok__Dokument w
        LEFT JOIN {DB}.dbo.vwKlienci v ON v.kh_Id = w.dok_OdbiorcaId
       WHERE w.dok_Typ=11 AND w.dok_Status NOT IN (0,2)
         AND w.dok_DataWyst < %s AND w.dok_DataWyst >= %s
         AND NOT EXISTS (SELECT 1 FROM {DB}.dbo.dok__Dokument zk
                          WHERE zk.dok_Typ=16 AND (zk.dok_DoDokId = w.dok_Id OR w.dok_DoDokId = zk.dok_Id))
         AND NOT EXISTS (SELECT 1 FROM {DB}.dbo.dok__Dokument fs
                          WHERE fs.dok_Typ IN (2,1) AND fs.dok_Id = w.dok_DoDokId)
         AND NOT EXISTS (SELECT 1 FROM {DB}.dbo.dok_Pozycja pp
                          WHERE pp.ob_DokMagId = w.dok_Id AND pp.ob_DokHanId IS NOT NULL)
       ORDER BY w.dok_DataWyst DESC""", (koniec, dzien - datetime.timedelta(days=14)))

    # ── 5b. WZ per dokument: klient + koszt + czy ma ZK (agregacja w Pythonie)
    wz_dok = q(cur, f"""
      SELECT w.dok_Id AS wz, v.kh_Id AS kh,
             (SELECT COALESCE(SUM(poz.ob_WartMag),0) FROM {DB}.dbo.dok_Pozycja poz
               WHERE poz.ob_DokMagId = w.dok_Id) AS koszt,
             CASE WHEN EXISTS (SELECT 1 FROM {DB}.dbo.dok__Dokument zk
                                WHERE zk.dok_Typ=16 AND zk.dok_DoDokId = w.dok_Id)
                   OR EXISTS (SELECT 1 FROM {DB}.dbo.dok__Dokument zp
                               WHERE zp.dok_Id = w.dok_DoDokId AND zp.dok_Typ=16)
                   OR EXISTS (SELECT 1 FROM {DB}.dbo.dok__Dokument fs
                               WHERE fs.dok_Typ IN (2,1)
                                 AND fs.dok_DoDokId IN (SELECT zz.dok_Id FROM {DB}.dbo.dok__Dokument zz
                                                         WHERE zz.dok_Typ=16)
                                 AND (fs.dok_Id = w.dok_DoDokId OR fs.dok_Id = w.dok_Id
                                      OR w.dok_DoDokId = fs.dok_Id))
             THEN 1 ELSE 0 END AS ma_zk
        FROM {DB}.dbo.dok__Dokument w
        LEFT JOIN {DB}.dbo.vwKlienci v ON v.kh_Id = w.dok_OdbiorcaId
       WHERE w.dok_Typ=11 AND w.dok_Status NOT IN (0,2) AND w.dok_DataWyst < %s""", (koniec,))

    conn.close()

    # ── agregacja per klient (suma wszystkich PH klienta)
    P = defaultdict(lambda: {'zk': 0, 'zk_wart': 0.0, 'wz': 0, 'wz_wart': 0.0, 'wz_koszt': 0.0, 'wz_zk': 0,
                             'fv': 0, 'fv_suma': 0.0, 'wpl': 0, 'wpl_suma': 0.0, 'ph': None})
    for r in zk:
        k = r[0]
        if k is None: continue
        P[k]['zk'] += r[2]; P[k]['zk_wart'] += float(r[3] or 0)
        if P[k]['ph'] is None: P[k]['ph'] = r[1]
    for r in wz_dok:
        k = r[1]
        if k is None: continue
        P[k]['wz'] += 1
        P[k]['wz_koszt'] += float(r[2] or 0)
        P[k]['wz_zk'] += (r[3] or 0)
        if P[k]['ph'] is None: P[k]['ph'] = None
    # wartość netto WZ per klient
    for r in wz:
        k = r[0]
        if k is None: continue
        P[k]['wz_wart'] += float(r[3] or 0)
        if P[k]['ph'] is None: P[k]['ph'] = r[1]
    for r in fv:
        k = r[0]
        if k is None: continue
        P[k]['fv'] += r[2]; P[k]['fv_suma'] += float(r[3] or 0)
        if P[k]['ph'] is None: P[k]['ph'] = r[1]
    for r in wpl:
        k = r[0]
        if k is None: continue
        P[k]['wpl'] += r[1]; P[k]['wpl_suma'] += float(r[2] or 0)

    # tylko klienci z aktywnym ZK lub WZ
    aktyw = {k: d for k, d in P.items() if d['zk'] > 0 or d['wz'] > 0}
    # filtr per PH (wersja dla handlowca): klient należy do PH jeśli ma AKTYWNE ZK w tej kategorii
    if a.ph is not None:
        aktyw = {k: d for k, d in aktyw.items()
                 if any(r[0] == k and r[1] == a.ph for r in zk)}
    # sortuj: najpierw klienci z ZK (ofertami) wg wartości ZK, potem reszta wg WZ
    aktyw = dict(sorted(aktyw.items(), key=lambda kv: (-kv[1]['zk_wart'], -kv[1]['wz_wart'])))

    e = _html.escape
    def zl(x): return f"{x:,.0f}".replace(",", " ")
    def zl2(x): return f"{x:,.2f}".replace(",", " ")
    rows_html = []
    tot = {'zk': 0, 'wz': 0, 'wz_zk': 0}
    for k, d in aktyw.items():
        pct = round(d['wz_koszt'] / d['zk_wart'] * 100) if d['zk_wart'] else 0
        if d['zk']: pct2 = f'<b style="color:{"#1d7a3f" if pct>=80 else ("#9a6b00" if pct>=50 else "#b42318")}">{pct}%</b>'
        else: pct2 = '<span style="color:#98a2b3">—</span>'
        tot['zk'] += d['zk']; tot['wz'] += d['wz']; tot['wz_zk'] += d['wz_zk']
        kl = klienci.get(k, 'BRAK NAZWY') or 'BRAK NAZWY'
        ph_wysw = lab(a.ph) if a.ph is not None else lab(d['ph'])
        rows_html.append(f"""<tr>
<td class="kl">{e(kl[:58])}</td><td>{ph_wysw}</td>
<td class="num">{d['zk']}</td><td class="num">{zl2(d['zk_wart'])}</td>
<td class="num">{d['wz']}</td><td class="num">{zl2(d['wz_wart'])}</td><td class="num">{zl2(d['wz_koszt'])}</td>
<td class="num">{pct2}</td>
<td class="num">{d['fv']}</td><td class="num">{zl2(d['fv_suma'])}</td>
<td class="num">{d['wpl']}</td><td class="num">{zl2(d['wpl_suma'])}</td></tr>""")
    if not rows_html:
        rows_html.append('<tr><td colspan="12" style="text-align:center;color:#98a2b3;padding:18px">brak aktywnych ZK / WZ na dzień raportu</td></tr>')

    gole_html = []
    for r in gole:
        gole_html.append(f'<tr class="gol"><td class="mono">{r[0]}</td><td>{e((r[1] or "BRAK NAZWY")[:45])}</td><td>{lab(r[2])}</td><td class="num">{r[3].strftime("%d.%m")}</td><td class="num">{zl2(r[4] or 0)}</td><td class="num">{zl2(r[5] or 0)}</td></tr>')

    dpl = dzien.strftime("%d.%m.%Y")
    if a.ph is not None:
        tytul = f"📊 Raport PH — {lab(a.ph)} · stan na {dpl}"
        sub = f"A6 · wersja handlowca {lab(a.ph)} · Twoi klienci · stan na dzień, sumarycznie do dnia · źródło: Subiekt GT (odczyt)"
        # dziury tylko tego PH
        gole = [r for r in gole if r[2] == a.ph]
    else:
        tytul = f"📊 Raport PH — ZBIORCZY · stan na {dpl}"
        sub = "A6 · wersja dla Tomasza (wszyscy handlowcy) · stan na dzień, sumarycznie do dnia · źródło: Subiekt GT (odczyt)"
    html = f"""<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>{tytul}</title>
<style>
:root{{--vio:#7c5cff;--ink:#1a1f2b;--mut:#667085;--line:#e4e7ec;--green:#1d7a3f;--red:#b42318;--amber:#9a6b00}}
*{{box-sizing:border-box}}
body{{margin:0;background:#f2f4f7;font-family:'Space Grotesk',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:var(--ink)}}
.wrap{{max-width:1360px;margin:0 auto;padding:26px 18px 60px}}
h1{{font-size:23px;margin:0 0 2px}} .sub{{color:var(--mut);font-size:13px;margin:0 0 14px}}
.card{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px}}
.big{{font-family:'IBM Plex Mono',monospace;font-size:13px;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:11px 18px;display:inline-flex;gap:20px;margin-bottom:16px;flex-wrap:wrap}}
.big b{{font-size:19px}}
h2{{font-size:15px;margin:0 0 10px}}
table{{border-collapse:collapse;width:100%;font-size:12.8px}}
th{{background:#f8fafc;text-align:right;padding:7px 8px;color:#475467;border-bottom:2px solid var(--line);font-size:10.5px;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}}
th:first-child, td.kl{{text-align:left}}
td{{padding:6px 8px;border-bottom:1px solid #f0f2f5;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
.mono{{font-family:'IBM Plex Mono',monospace;font-size:12px}}
.num{{font-family:'IBM Plex Mono',monospace;font-size:12px}}
.gol{{background:#fff5f4}} .gol td{{color:#7a2e28}}
.note{{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:9px 14px;font-size:12.5px;margin-bottom:14px}}
.foot{{color:#98a2b3;font-size:11px;margin-top:16px;text-align:center}}
</style></head><body><div class="wrap">
<h1>{tytul}</h1>
<p class="sub">{sub}</p>
<div class="note">ℹ️ ZK = oferta. % realizacji = koszt WZ powiązanych ÷ pierwotna wartość ZK (suma pozycji). Klient może mieć wiele ZK i wiele WZ — zsumowane. Dziury (WZ bez ZK) na dole.</div>
<div class="big"><span>klientów <b>{len(aktyw)}</b></span><span>aktywne ZK <b>{tot['zk']}</b></span><span>WZ do dnia <b>{tot['wz']}</b></span><span>WZ z ZK <b>{tot['wz_zk']}</b></span><span>dziury (14 dni) <b style="color:var(--red)">{len(gole)}</b></span></div>
<div class="card"><h2>Portfel per klient</h2>
<table><tr><th>Klient</th><th>PH</th><th>ZK</th><th>pierwotna wart. ZK</th><th>WZ</th><th>wydane (netto)</th><th>wydane (koszt)</th><th>% realizacji</th><th>FV</th><th>FV suma</th><th>wpłaty</th><th>wpłaty suma</th></tr>
{''.join(rows_html)}</table></div>
<div class="card"><h2>⚠️ WZ bez ZK i bez FV — dziury (ostatnie 14 dni)</h2>
<table><tr><th>WZ</th><th>Klient</th><th>PH</th><th>data</th><th>wart. netto</th><th>koszt</th></tr>
{''.join(gole_html) if gole_html else '<tr><td colspan="6" style="text-align:center;color:#1d7a3f;padding:14px">brak dziur ✓</td></tr>'}</table></div>
<div class="foot">A6 v3c · wg specyfikacji klienta 25.08 (węzeł 13) · porządek robi Tomek Jurewicz — raport pokazuje stan</div>
</div></body></html>"""

    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"HTML -> {a.out}")
    print(f"STAN {dpl}: {len(aktyw)} klientów | ZK {tot['zk']} | WZ {tot['wz']} (z ZK {tot['wz_zk']}) | dziury(14d) {len(gole)}")

if __name__ == '__main__':
    main()
