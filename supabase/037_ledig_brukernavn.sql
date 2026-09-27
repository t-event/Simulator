-- 037 Brukernavn ved ny konto (B-214)
--
-- Brukernavnet (kallenavnet på topplista) velges når kontoen opprettes. Appen sjekker at det er ledig før kontoen
-- lages, så spilleren ikke får en konto uten plass på lista. Kallenavnene er offentlige på topplista fra før; funksjonen
-- sier bare ja eller nei. Selve lagringen skjer som før i set_nickname etter at e-posten er bekreftet.
create or replace function public.nickname_available(name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select length(btrim(name)) between 3 and 20
     and not exists (select 1 from public.profiles where lower(nickname) = lower(btrim(name)));
$$;
revoke execute on function public.nickname_available(text) from public;
grant execute on function public.nickname_available(text) to anon, authenticated;
