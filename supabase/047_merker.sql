-- Stålverket: merker fra serveren (B-296). Kjørt som migrasjonen «merker».
--
-- Noen merker kan bare serveren vite om. Det første er «reform»: spillerne som ble berørt av økonomireformen (B-186,
-- `economy_reform_log`). Appen spør én gang etter innlogging og gir prestasjonen i spillet. Serveren endrer ikke det
-- lagrede spillet; spilleren får merket neste gang appen spør.

create or replace function public.my_badges()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_remove(array[
    case when exists (select 1 from public.economy_reform_log l where l.user_id = auth.uid()) then 'reform' end
  ], null), '{}'::text[]);
$$;
revoke execute on function public.my_badges() from public, anon;
grant execute on function public.my_badges() to authenticated;
