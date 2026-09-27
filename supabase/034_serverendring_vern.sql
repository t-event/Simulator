-- B-211: et spill som serveren har endret (f.eks. økonomireformen), skal ikke kunne overskrives av en enhet som har et
-- eldre spill lagret lokalt. Serveren øker state.serverEdit når den endrer et spill. save_game() godtar bare spill med
-- minst like høyt merke; ellers svarer den som ved en vanlig konflikt (null), og appen henter spillet fra nett.
-- Hullet: en enhet hos én spiller hadde spillet fra før reformen og lastet det opp igjen (valget «fortsett med
-- spillet her», eller en eldre app som tok det som hadde kommet lengst). Ellers er save_game() lik 013.
create or replace function public.save_game(p_state jsonb, p_minute integer, p_day integer, p_client_version text,
  p_season_id integer, p_device text, p_base_rev bigint)
 returns bigint
 language plpgsql
 set search_path to 'public'
as $function$
declare
  r bigint;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.touch_activity();
  update public.saves
  set state = p_state, minute = p_minute, day = p_day, client_version = p_client_version,
      season_id = p_season_id, device = p_device
  where user_id = auth.uid() and rev = p_base_rev
    and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0)
  returning rev into r;
  if r is not null then
    return r;
  end if;
  if exists (select 1 from public.saves where user_id = auth.uid()) then
    return null;
  end if;
  insert into public.saves (user_id, state, minute, day, client_version, season_id, device)
  values (auth.uid(), p_state, p_minute, p_day, p_client_version, p_season_id, p_device)
  returning rev into r;
  return r;
end;
$function$;

revoke execute on function public.save_game(jsonb, int, int, text, int, text, bigint) from public, anon;
grant execute on function public.save_game(jsonb, int, int, text, int, text, bigint) to authenticated;
