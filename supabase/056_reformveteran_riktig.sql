-- Stålverket: «Reformveteran» (I) gis bare for den første økonomireformen (B-312).
--
-- Feilen: badges_of (049) ga merket 'reform' til alle med en rad i economy_reform_log. Reform 2 (052, 054) skrev også
-- rader der, så alle som ble truffet av reform 2, fikk både «Reformveteran» og «Reformveteran II». Nå teller bare rader
-- som ikke er reform 2 (model 'reform 2 (B-3xx): …'). Merkene fra tabellen badges (gitt for hånd, B-300) står som før.
-- Appen tar bort merker serveren ikke lenger gir (applyServerBadges), så de fire som alt hadde fått feil merke, mister
-- det neste gang spillet åpnes. Fagpoengene de fikk, står.

create or replace function public.badges_of(uid uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct b order by b), '{}'::text[])
  from (
    select 'reform'::text as b from public.economy_reform_log l where l.user_id = uid and l.model not like 'reform 2%'
    union
    select x.badge from public.badges x where x.user_id = uid
  ) m;
$$;
revoke execute on function public.badges_of(uuid) from public, anon, authenticated;
