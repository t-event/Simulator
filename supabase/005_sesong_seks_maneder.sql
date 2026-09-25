-- Sesongen varer i seks måneder (B-130). Kjørt som migrasjonen «sesong_seks_maneder».
update public.seasons set ends_at = starts_at + interval '6 months' where id = 1;
-- start_season har nå 26 uker som standard (se 004_sesonger.sql).
