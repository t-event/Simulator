-- Nybegynnertallene (B-482): hvor nye spillere står og hva som tar kassa. Leser bare – endrer ingenting.
-- Brukt 9.10.2026 til gjennomgangen som ga sperren i Salg og «Lån og bytt foringen». Kjør med Supabase-connectoren.
-- Spillerne vises med en kort hash, aldri med kallenavn, i alt som skrives ned.

-- 1. Oversikt siste 7 dager: nye kontoer, nivåer, konkurs og kasse i minus på de første nivåene
select
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as nye_kontoer,
  (select json_object_agg(st, n) from (select coalesce((state ->> 'stage')::int, 0) st, count(*) n
                                         from public.saves where updated_at > now() - interval '7 days' group by 1) x) as nivaer,
  (select count(*) from public.saves where updated_at > now() - interval '7 days'
                                      and coalesce((state ->> 'gameOver')::boolean, false)) as konkurs,
  (select count(*) from public.saves where updated_at > now() - interval '7 days'
                                      and coalesce((state ->> 'stage')::int, 0) <= 1
                                      and (state ->> 'cash')::numeric < 0) as minus_pa_niva_0_1;

-- 2. Per spiller på garasjen og verkstedet: kasse, omdømme, kontrakter etter status og de siste døgnenes regnskap
select left(md5(s.user_id::text), 6) as hvem, (s.state ->> 'stage')::int as niva, s.day as dag,
       round((s.state ->> 'cash')::numeric) as kasse, round(coalesce((s.state ->> 'loan')::numeric, 0)) as lan,
       round((s.state ->> 'reputation')::numeric) as omdomme,
       coalesce((s.state ->> 'gameOver')::boolean, false) as konkurs,
       (select json_object_agg(st, n) from (select c ->> 'status' st, count(*) n
                                             from jsonb_array_elements(coalesce(s.state -> 'contracts', '[]')) c group by 1) x) as kontrakter,
       (select json_agg(f ->> 'waitReason') from jsonb_array_elements(coalesce(s.state -> 'furnaces', '[]')) f) as ovnene_venter,
       (select json_agg(h order by (h ->> 'day')::int desc)
          from (select h from jsonb_array_elements(coalesce(s.state -> 'history', '[]')) h
                 order by (h ->> 'day')::int desc limit 3) y) as siste_dogn,
       s.updated_at as sist_lagret
from public.saves s
where s.updated_at > now() - interval '7 days' and coalesce((s.state ->> 'stage')::int, 0) <= 1
order by s.updated_at desc;
