-- B-512: lavere mål for neste runde av fellesprosjektene. Første runde (åpnet 22.10, frist 12.11) fikk 0–54 % av
-- målet 5.11, med 0–4 givere per region. Målet var 4 dagers utbytte fra verkene i regionen (250–400 mill.); fra neste
-- runde er det 2 dagers utbytte (ca. 160–270 mill.), fortsatt minst 2 % av konsernkassene. Prosjekter som alt er åpne,
-- beholder målet sitt (spillerne har gitt mot det).
update public.config
set value = jsonb_set(value, '{projects,goal_days}', '2'::jsonb)
where id = 'world' and value ? 'projects';
