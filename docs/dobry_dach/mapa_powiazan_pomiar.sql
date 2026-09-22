-- ZESTAW POMIAROWY — mapa powiazan dokumentow (proof of concept)
-- Zrodlo: kontener subiekt-mssql, baza Kopia_2024_KOMANDYTOWA (spolka komandytowa), dane do 2026-08-07
-- Data pomiaru: 2026-09-21
-- Uruchomienie (haslo wylacznie ze zmiennej srodowiskowej kontenera, nigdy w pliku):
--   docker exec -i subiekt-mssql bash -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa \
--     -P "$MSSQL_SA_PASSWORD" -C -d Kopia_2024_KOMANDYTOWA -h-1 -W -s"|" -I' < sql/mapa_powiazan_pomiar.sql
-- UWAGA: zapytania podawac przez '<' — inline w cudzyslowie sie psuje.
-- Wersja do repo: bez nazw firm, nazwisk, NIP-ow i adresow.

-- ============================================================
-- PLIK: q1.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'WZ_TOTAL', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11;
SELECT 'WZ_DODOK_GT0', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_DoDokId>0;
SELECT 'WZ_ODBIORCA', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_OdbiorcaId IS NOT NULL AND dok_OdbiorcaId>0;
SELECT 'WZ_PLATNIK', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_PlatnikId IS NOT NULL AND dok_PlatnikId>0;
SELECT 'WZ_KAT', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_KatId IS NOT NULL AND dok_KatId>0;

-- ============================================================
-- PLIK: q2.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'TYP_11_DODOK_TARGET', d2.dok_Typ, d2.dok_NrPelny, COUNT(*) AS ile
FROM dok__Dokument d1
LEFT JOIN dok__Dokument d2 ON d2.dok_Id = d1.dok_DoDokId
WHERE d1.dok_Typ=11 AND d1.dok_DoDokId>0
GROUP BY d2.dok_Typ, d2.dok_NrPelny
ORDER BY ile DESC;

-- ============================================================
-- PLIK: q2b.sql
-- ============================================================
SET NOCOUNT ON;
SELECT d2.dok_Typ, COUNT(*) AS ile
FROM dok__Dokument d1
LEFT JOIN dok__Dokument d2 ON d2.dok_Id = d1.dok_DoDokId
WHERE d1.dok_Typ=11 AND d1.dok_DoDokId>0
GROUP BY d2.dok_Typ
ORDER BY ile DESC;

-- ============================================================
-- PLIK: q3.sql
-- ============================================================
SET NOCOUNT ON;
SELECT nzf_Typ, COUNT(*) AS ile, SUM(nzf_WartoscWaluta) AS suma
FROM nz__Finanse
GROUP BY nzf_Typ
ORDER BY nzf_Typ;
SELECT 'RAZEM', COUNT(*), SUM(nzf_WartoscWaluta) FROM nz__Finanse;
SELECT 'Z_IDDOK', COUNT(*) FROM nz__Finanse WHERE nzf_IdDokumentAuto IS NOT NULL AND nzf_IdDokumentAuto>0;

-- ============================================================
-- PLIK: q4.sql
-- ============================================================
SET NOCOUNT ON;
SELECT dok_Id, dok_Typ, dok_NrPelny, CONVERT(varchar(10),dok_DataWyst,120) AS data, dok_WartNetto, dok_WartBrutto, dok_OdbiorcaId, dok_PlatnikId, dok_KatId, dok_DoDokId, dok_Status
FROM dok__Dokument WHERE dok_NrPelny IN ('WZ 1624/MAG/08/2026','FS 61/MAG/08/2026','WZ 1631/MAG/08/2026','ZK 2/MAG/08/2026');
SELECT '---';
SELECT nzf_Id, nzf_Typ, nzf_IdDokumentAuto, nzf_WartoscWaluta, CONVERT(varchar(10),nzf_TerminPlatnosci,120) AS termin, nzf_Status
FROM nz__Finanse WHERE nzf_IdDokumentAuto IN (76003, 75405);

-- ============================================================
-- PLIK: q4b.sql
-- ============================================================
SET NOCOUNT ON;
SELECT nzf_Id, nzf_Typ, nzf_IdDokumentAuto, nzf_WartoscPierwotna, nzf_Wartosc, nzf_WartoscWaluta, nzf_Splata, nzf_SplataWaluta, CONVERT(varchar(10),nzf_Data,120) AS data, CONVERT(varchar(10),nzf_TerminPlatnosci,120) AS termin, nzf_Status, nzf_NumerPelny, nzf_IdRozrachunku, nzf_Powiazanie
FROM nz__Finanse WHERE nzf_IdDokumentAuto IN (76003, 75405);
SELECT '---SPLATY---';
SELECT nzs_Id, nzs_IdSplaty, nzs_IdDlugu, nzs_WartoscWaluta, CONVERT(varchar(10),nzs_Data,120) AS data, nzs_Typ
FROM nz_FinanseSplata WHERE nzs_IdSplaty IN (63380,63381,63382,63383,63384,63385) OR nzs_IdDlugu IN (63380,63381);

-- ============================================================
-- PLIK: q6.sql
-- ============================================================
SET NOCOUNT ON;
WITH wz AS (SELECT dok_Id, dok_DoDokId FROM dok__Dokument WHERE dok_Typ=11)
SELECT
  COUNT(DISTINCT wz.dok_Id) AS wz_all,
  COUNT(DISTINCT CASE WHEN f.dok_Id IS NOT NULL THEN wz.dok_Id END) AS wz_z_fs,
  COUNT(DISTINCT CASE WHEN f.dok_Id IS NOT NULL AND fn.nzf_Id IS NOT NULL THEN wz.dok_Id END) AS wz_fs_z_rozrachunkiem,
  COUNT(DISTINCT CASE WHEN f.dok_Id IS NOT NULL AND fn.nzf_Id IS NULL THEN wz.dok_Id END) AS wz_fs_bez_rozrachunku
FROM wz
LEFT JOIN dok__Dokument f ON f.dok_Id = wz.dok_DoDokId AND f.dok_Typ=2
LEFT JOIN nz__Finanse fn ON fn.nzf_IdDokumentAuto = f.dok_Id;
SELECT '---KASA_BANK_WART_PIERWOTNA---';
SELECT nzf_Typ, COUNT(*) AS ile, SUM(nzf_WartoscWaluta) AS suma_waluta, SUM(nzf_WartoscPierwotna) AS suma_pierwotna, SUM(nzf_SplataWaluta) AS suma_splata
FROM nz__Finanse WHERE nzf_Typ IN (17,18,19,20,39,40,41,42) GROUP BY nzf_Typ ORDER BY nzf_Typ;

-- ============================================================
-- PLIK: q7.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'WZ_BEZ_DODOK', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND (dok_DoDokId IS NULL OR dok_DoDokId=0);
SELECT 'WZ_Z_DODOK_ALE_CEL_BRAK', COUNT(*) FROM dok__Dokument d1 LEFT JOIN dok__Dokument d2 ON d2.dok_Id=d1.dok_DoDokId WHERE d1.dok_Typ=11 AND d1.dok_DoDokId>0 AND d2.dok_Id IS NULL;
SELECT 'WZ_ZERO_NETTO', COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_WartNetto=0;
SELECT 'WZ_ZERO_NETTO_KAT', dok_KatId, COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_WartNetto=0 GROUP BY dok_KatId ORDER BY 2 DESC;
SELECT '---DATA RANGE---';
SELECT MIN(CONVERT(varchar(10),dok_DataWyst,120)), MAX(CONVERT(varchar(10),dok_DataWyst,120)) FROM dok__Dokument WHERE dok_Typ=11;

-- ============================================================
-- PLIK: q9.sql
-- ============================================================
SET NOCOUNT ON;
SELECT TOP 5 d1.dok_NrPelny AS wz, f.dok_NrPelny AS fs, f.dok_Id AS fs_id, f.dok_WartNetto
FROM dok__Dokument d1
JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2
LEFT JOIN nz__Finanse fn ON fn.nzf_IdDokumentAuto=f.dok_Id
WHERE d1.dok_Typ=11 AND fn.nzf_Id IS NULL AND d1.dok_WartNetto>1000
ORDER BY d1.dok_DataWyst DESC;
SELECT '---PRZYKLAD_Z_BANKIEM---';
SELECT TOP 3 fn.nzf_IdDokumentAuto AS dok, fn.nzf_Typ, fn.nzf_Id, fn.nzf_WartoscWaluta, fn.nzf_NumerPelny, CONVERT(varchar(10),fn.nzf_Data,120)
FROM nz__Finanse fn WHERE fn.nzf_Typ=19 AND fn.nzf_WartoscWaluta>5000 ORDER BY fn.nzf_Data DESC;

-- ============================================================
-- PLIK: q10.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'FS_BEZ_ROZR_NETTO_ZERO', COUNT(*) FROM (
 SELECT d1.dok_Id, f.dok_Id AS fid, f.dok_WartNetto
 FROM dok__Dokument d1 JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2
 LEFT JOIN nz__Finanse fn ON fn.nzf_IdDokumentAuto=f.dok_Id
 WHERE d1.dok_Typ=11 AND fn.nzf_Id IS NULL) t WHERE fid IS NOT NULL AND dok_WartNetto=0;
SELECT 'FS_BEZ_ROZR_RAZEM', COUNT(DISTINCT d1.dok_Id) FROM dok__Dokument d1 JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2 LEFT JOIN nz__Finanse fn ON fn.nzf_IdDokumentAuto=f.dok_Id WHERE d1.dok_Typ=11 AND fn.nzf_Id IS NULL;
SELECT 'ROZRACHUNKI_Z_IDDOK_PER_TYP';
SELECT nzf_Typ, COUNT(*) AS ile, SUM(CASE WHEN nzf_IdDokumentAuto>0 THEN 1 ELSE 0 END) AS z_id_dok
FROM nz__Finanse GROUP BY nzf_Typ ORDER BY nzf_Typ;
SELECT 'SPLATY_PO_TYPIE';
SELECT nzs_Typ, COUNT(*) AS ile, SUM(nzs_WartoscWaluta) AS suma FROM nz_FinanseSplata GROUP BY nzs_Typ ORDER BY nzs_Typ;
SELECT 'NALEZNOSCI_T39_ILE_Z_SPLATA';
SELECT COUNT(DISTINCT f.nzf_Id) FROM nz__Finanse f JOIN nz_FinanseSplata s ON s.nzs_IdDlugu=f.nzf_Id WHERE f.nzf_Typ=39;

-- ============================================================
-- PLIK: q12.sql
-- ============================================================
SET NOCOUNT ON;
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sl_Kategoria' ORDER BY ORDINAL_POSITION;
SELECT '---';
SELECT YEAR(dok_DataWyst) AS rok, COUNT(*) AS wz,
 SUM(CASE WHEN dok_DoDokId IS NULL OR dok_DoDokId=0 THEN 1 ELSE 0 END) AS bez_dok,
 SUM(CASE WHEN dok_WartNetto=0 THEN 1 ELSE 0 END) AS zero_netto,
 SUM(dok_WartNetto) AS netto
FROM dok__Dokument WHERE dok_Typ=11 GROUP BY YEAR(dok_DataWyst) ORDER BY rok;
SELECT '---KAT---';
SELECT dok_KatId, COUNT(*) AS wz, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 GROUP BY dok_KatId ORDER BY wz DESC;

-- ============================================================
-- PLIK: q13.sql
-- ============================================================
SET NOCOUNT ON;
-- 1 prawdziwy urywany przyklad: WZ z wartoscia > 0, FS netto > 0, brak rozrachunku
SELECT TOP 10 d1.dok_NrPelny AS wz, d1.dok_Id, d1.dok_WartNetto AS wz_netto, f.dok_NrPelny AS fs, f.dok_Id AS fs_id, f.dok_WartNetto AS fs_netto
FROM dok__Dokument d1 JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2
LEFT JOIN nz__Finanse fn ON fn.nzf_IdDokumentAuto=f.dok_Id
WHERE d1.dok_Typ=11 AND fn.nzf_Id IS NULL AND d1.dok_WartNetto>0
ORDER BY d1.dok_WartNetto DESC;
SELECT '---PELNY LANCUCH BANKOWY---';
SELECT TOP 5 s.nzs_Id, s.nzs_IdSplaty, s.nzs_IdDlugu, s.nzs_WartoscWaluta, CONVERT(varchar(10),s.nzs_Data,120) AS data, s.nzs_Typ,
 f39.nzf_Typ AS typ_dlugu, f39.nzf_IdDokumentAuto AS dok_dlugu
FROM nz_FinanseSplata s JOIN nz__Finanse f39 ON f39.nzf_Id=s.nzs_IdDlugu
WHERE f39.nzf_Typ=39 AND s.nzs_WartoscWaluta>3000 ORDER BY s.nzs_Data DESC;

-- ============================================================
-- PLIK: q14.sql
-- ============================================================
SET NOCOUNT ON;
SELECT sl_Id, kat_Id, kat_Nazwa FROM sl_Kategoria WHERE kat_Id IN (10,12,13,14,15,16,17,18,19,20,23,26,27,6,24,21,1,5,2,7,22) ORDER BY kat_Id;

-- ============================================================
-- PLIK: q15.sql
-- ============================================================
SET NOCOUNT ON;
SELECT f.dok_Id, f.dok_NrPelny, CONVERT(varchar(10),f.dok_DataWyst,120) AS data, f.dok_WartNetto, f.dok_OdbiorcaId, f.dok_PlatnikId, f.dok_KatId,
 COUNT(*) AS ile_wz, SUM(d1.dok_WartNetto) AS suma_wz_netto
FROM dok__Dokument d1 JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2
WHERE d1.dok_Typ=11 AND f.dok_WartNetto=0
GROUP BY f.dok_Id, f.dok_NrPelny, f.dok_DataWyst, f.dok_WartNetto, f.dok_OdbiorcaId, f.dok_PlatnikId, f.dok_KatId
ORDER BY ile_wz DESC;

-- ============================================================
-- PLIK: q18.sql
-- ============================================================
SET NOCOUNT ON;
SELECT kat_Id, kat_Nazwa FROM sl_Kategoria WHERE kat_Id IN (1,2,5,6,7,10,12,13,14,15,16,17,18,19,20,21,22,23,24,26,27) ORDER BY kat_Id;
SELECT '---TRZY_ZERO---';
SELECT dok_Id, dok_NrPelny, CONVERT(varchar(10),dok_DataWyst,120) AS data, dok_WartNetto, dok_WartBrutto, dok_WartMag, dok_OdbiorcaId, dok_PlatnikId, dok_KatId, dok_DoDokId
FROM dok__Dokument WHERE dok_NrPelny IN ('WZ 1134/MAG/06/2026','WZ 1101/MAG/06/2026','WZ 554/MAG/04/2026');
SELECT '---POZYCJE---';
SELECT p.ob_DokHanId, COUNT(*) AS poz, SUM(p.ob_Ilosc) AS ilosc, SUM(p.ob_WartNetto) AS poz_netto, SUM(p.ob_WartMag) AS poz_wartmag
FROM dok_Pozycja p JOIN dok__Dokument d ON d.dok_Id=p.ob_DokHanId
WHERE d.dok_NrPelny IN ('WZ 1134/MAG/06/2026','WZ 1101/MAG/06/2026','WZ 554/MAG/04/2026')
GROUP BY p.ob_DokHanId;
SELECT '---WZ ZERO NETTO SZEROKO---';
SELECT COUNT(*) AS ile, SUM(dok_WartMag) AS suma_wartmag FROM dok__Dokument WHERE dok_Typ=11 AND dok_WartNetto=0;

-- ============================================================
-- PLIK: q19.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'ODBIORCA_TYPY';
SELECT d2.dok_Typ, COUNT(*) AS ile FROM dok__Dokument d1 JOIN dok__Dokument d2 ON d2.dok_Id=d1.dok_DoDokId WHERE d1.dok_Typ=11 AND d1.dok_DoDokId>0 GROUP BY d2.dok_Typ ORDER BY ile DESC;
SELECT '---TOP KONTRAHENCI WZ (ID only)---';
SELECT TOP 10 dok_OdbiorcaId, COUNT(*) AS wz, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 AND dok_OdbiorcaId>0 GROUP BY dok_OdbiorcaId ORDER BY netto DESC;
SELECT '---WZ gdzie odbiorca != platnik---';
SELECT COUNT(*) FROM dok__Dokument WHERE dok_Typ=11 AND dok_OdbiorcaId<>dok_PlatnikId;

-- ============================================================
-- PLIK: q21.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'WZ_KAT_NIEHANDLOWE';
SELECT dok_KatId, COUNT(*) AS wz, SUM(dok_WartNetto) AS netto, SUM(dok_WartMag) AS wartmag FROM dok__Dokument WHERE dok_Typ=11 AND dok_KatId IN (5,6,7,10,13,15,21,24) GROUP BY dok_KatId ORDER BY wz DESC;
SELECT '---SUMA---';
SELECT COUNT(*) AS ile, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 AND dok_KatId IN (5,6,7,10,13,15,21,24);
SELECT '---WZ Z DOK NA FS O NETTO 0 - ILE WZ---';
SELECT COUNT(DISTINCT d1.dok_Id) AS ile_wz, SUM(d1.dok_WartNetto) AS suma_wz_netto
FROM dok__Dokument d1 JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2
WHERE d1.dok_Typ=11 AND f.dok_WartNetto=0;

-- ============================================================
-- PLIK: q23.sql
-- ============================================================
SET NOCOUNT ON;
SELECT dok_Typ, COUNT(*) AS ile, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ IN (1,2,5,6,11,16,21) GROUP BY dok_Typ ORDER BY dok_Typ;
SELECT '---DOK_TYP_ALL---';
SELECT dok_Typ, COUNT(*) AS ile FROM dok__Dokument GROUP BY dok_Typ ORDER BY ile DESC;

-- ============================================================
-- PLIK: q26.sql
-- ============================================================
SET NOCOUNT ON;
SELECT kh_Id, kh_IdGrupa, kh_Rodzaj FROM kh__Kontrahent WHERE kh_Id IN (382,3822,2117);
SELECT '---FS NA TE ID---';
SELECT dok_OdbiorcaId, dok_Typ, COUNT(*) AS ile, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=2 AND dok_OdbiorcaId IN (382,3822) GROUP BY dok_OdbiorcaId, dok_Typ;
SELECT '---WZ -> FS NA TE ID---';
SELECT COUNT(DISTINCT d1.dok_Id) AS wz_ile, SUM(d1.dok_WartNetto) AS wz_netto
FROM dok__Dokument d1 JOIN dok__Dokument f ON f.dok_Id=d1.dok_DoDokId AND f.dok_Typ=2
WHERE d1.dok_Typ=11 AND f.dok_OdbiorcaId IN (382,3822);
SELECT '---WZ DO TYCH KH BEZPOSREDNIO---';
SELECT dok_OdbiorcaId, COUNT(*) AS wz_ile, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 AND dok_OdbiorcaId IN (382,3822) GROUP BY dok_OdbiorcaId;

-- ============================================================
-- PLIK: q27.sql
-- ============================================================
SET NOCOUNT ON;
SELECT 'WZ_BEZ_DOK_RAPORT';
SELECT YEAR(dok_DataWyst) AS rok, COUNT(*) AS ile, SUM(dok_WartNetto) AS netto, SUM(dok_WartMag) AS wartmag
FROM dok__Dokument WHERE dok_Typ=11 AND (dok_DoDokId IS NULL OR dok_DoDokId=0) GROUP BY YEAR(dok_DataWyst) ORDER BY rok;
SELECT '---SUMA---';
SELECT COUNT(*) AS ile, SUM(dok_WartNetto) AS netto, SUM(dok_WartMag) AS wartmag FROM dok__Dokument WHERE dok_Typ=11 AND (dok_DoDokId IS NULL OR dok_DoDokId=0);
SELECT '---P6B sprint---';
SELECT COUNT(*) AS jestruchmag0, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 AND dok_JestRuchMag=0;
SELECT '---P6B i bez dok---';
SELECT COUNT(*) AS ile, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 AND dok_JestRuchMag=0 AND (dok_DoDokId IS NULL OR dok_DoDokId=0);
SELECT '---ANULOWANE---';
SELECT dok_Status, COUNT(*) AS ile, SUM(dok_WartNetto) AS netto FROM dok__Dokument WHERE dok_Typ=11 GROUP BY dok_Status ORDER BY ile DESC;
SELECT '---ZERO NETTO szczegoly---';
SELECT COUNT(*) AS zero_ile, SUM(dok_WartNetto) AS netto, SUM(dok_WartMag) AS wartmag,
 SUM(CASE WHEN dok_DoDokId IS NULL OR dok_DoDokId=0 THEN 1 ELSE 0 END) AS zero_bez_dok
FROM dok__Dokument WHERE dok_Typ=11 AND dok_WartNetto=0;

-- ============================================================
-- PLIK: q28.sql
-- ============================================================
SET NOCOUNT ON;
-- KONTROLA: rozrachunek dla FS 61 - pelny lancuch
SELECT d.dok_Id, d.dok_Typ, d.dok_NrPelny, CONVERT(varchar(10),d.dok_DataWyst,120) AS data, d.dok_WartNetto, d.dok_DoDokId
FROM dok__Dokument d WHERE d.dok_Id IN (75985,76003);
SELECT '---ROZRACHUNEK DLA 76003---';
SELECT nzf_Id, nzf_Typ, nzf_NumerPelny, nzf_WartoscPierwotna, nzf_WartoscWaluta, nzf_SplataWaluta, CONVERT(varchar(10),nzf_Data,120) AS data, nzf_Status
FROM nz__Finanse WHERE nzf_IdDokumentAuto=76003;
SELECT '---SPLATA---';
SELECT nzs_Id, nzs_IdSplaty, nzs_IdDlugu, nzs_WartoscWaluta, CONVERT(varchar(10),nzs_Data,120) AS data, nzs_Typ
FROM nz_FinanseSplata WHERE nzs_IdDlugu=63380 OR nzs_IdSplaty IN (63380,63381);
SELECT '---SPLACAJACY DOKUMENT KP---';
SELECT dok_Id, dok_Typ, dok_NrPelny, dok_WartNetto FROM dok__Dokument WHERE dok_NrPelny='KP 33/KAS/08/2026';
