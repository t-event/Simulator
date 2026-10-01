-- B-408: antall spillere aktive siste 24 timer, til startskjermen.
-- En spiller er aktiv når spillet er lagret på nett siste 24 timer (bare enheten som spilles på, laster opp, B-143).
-- Gjester (anonyme kontoer) teller med – de spiller også. Flaggede og sperrede kontoer teller ikke.
-- Bare et tall, ingen navn: kan leses uten konto (KONTO.md: å se, ikke å stå på en liste).
create or replace function public.players_active_24h()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.saves s
  left join public.profiles p on p.id = s.user_id
  where s.updated_at > now() - interval '24 hours'
    and p.flagged_at is null
    and not coalesce(p.banned, false);
$$;
revoke execute on function public.players_active_24h() from public;
grant execute on function public.players_active_24h() to anon, authenticated;

-- Gjester slipper til tallet (startskjermen viser det for alle)
create or replace function public.guest_gate()
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  p text;
begin
  if not public.is_guest() then
    return;
  end if;
  p := regexp_replace(coalesce(current_setting('request.path', true), ''), '^/?(rest/v1/)?', '');
  if p in ('rpc/save_game', 'rpc/guest_handover', 'rpc/delete_my_account', 'saves', 'snapshots', 'config',
           'rpc/leaderboard', 'rpc/season_status', 'rpc/active_events', 'rpc/weekly_board',
           'seasons', 'events', 'eras', 'season_results', 'rpc/players_active_24h') then
    return;
  end if;
  raise sqlstate 'PGRST' using
    message = json_build_object('code', 'GJEST', 'message', 'Dette krever en konto.')::text,
    detail = json_build_object('status', 403)::text;
end;
$$;
