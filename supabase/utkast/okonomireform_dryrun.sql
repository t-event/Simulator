-- Økonomireformen – DRY-RUN (B-180). Bare lesing: endrer ingenting.
-- Ikke en migrasjon. Kjøres med Supabase-connectoren (execute_sql) for å vise forslaget med ferske tall før en
-- eventuell utføring, som krever eierens godkjenning og en egen migrasjon (fase 1 i docs/RETNING.md).
--
-- Modell: under terskelen (50 mill.) er kassa uendret. Over: ny kasse = terskel × (kasse / terskel)^k.
-- Modell A: k = 0,35. Modell B: k = 0,45. Rekkefølgen mellom spillerne beholdes, og store er fortsatt store.
-- «Timer på 10×» viser hvor fort kassa er tjent inn igjen med dagens inntekt – derfor må også inntektsmotoren
-- (datterverkene) endres i samme runde (RETNING.md 5.1).

with base as (
  select
    p.nickname,
    s.day,
    (s.state->>'stage')::int as stage,
    (s.state->>'cash')::numeric as cash,
    coalesce((s.state->>'loan')::numeric, 0) as loan,
    (select x.equity from public.snapshots x where x.user_id = s.user_id order by x.at desc limit 1)::numeric as equity,
    jsonb_array_length(coalesce(s.state->'konsern'->'plants', '[]'::jsonb)) as plants,
    coalesce((
      select avg((select sum(value::numeric) from jsonb_each_text(h->'income')))
      from jsonb_array_elements(s.state->'history') h
      where (h->>'day')::int > s.day - 8
    ), 0) as income_day,
    (select count(*) from public.save_backups b where b.user_id = s.user_id) as backups,
    p.flagged_at is not null as flagged
  from public.saves s
  join public.profiles p on p.id = s.user_id
),
modell as (
  select *, 50000000::numeric as terskel from base
)
select
  nickname,
  day,
  stage,
  plants,
  round(cash / 1e9, 3) as kasse_mrd,
  round(equity / 1e9, 3) as konsernverdi_mrd,
  round(income_day / 1e9, 3) as inntekt_mrd_per_spilldogn,
  round(case when cash <= terskel then cash else terskel * power(cash / terskel, 0.35) end / 1e9, 3) as ny_kasse_a_mrd,
  round(case when cash <= terskel then cash else terskel * power(cash / terskel, 0.45) end / 1e9, 3) as ny_kasse_b_mrd,
  round(case when income_day > 0 then
    (cash - (case when cash <= terskel then cash else terskel * power(cash / terskel, 0.35) end)) / income_day * 12 / 3600
  end, 1) as timer_pa_10x_for_a_er_tjent_inn,
  backups,
  flagged
from modell
order by cash desc;
