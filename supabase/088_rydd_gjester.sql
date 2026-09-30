-- B-377: forlatte gjester ryddes bort automatisk (eieren: «Ja det skal de»).
-- En gjest (anonym konto, B-212) som ikke har lagret på 60 dager, slettes hver natt. Tida regnes fra siste lagring –
-- ikke fra når gjesten ble laget – så en gjest som fortsatt spiller, blir aldri slettet. Spillet, tidslinja og kopiene
-- følger med (on delete cascade). Kommer gjesten tilbake, lager appen en ny gjest og laster opp spillet igjen.
-- Sperrer: bare `is_anonymous`, aldri en konto med konsernkasse, konsern eller selskap, og høyst 500 per natt.

create table if not exists public.guest_cleanup_log (
  at timestamptz primary key default now(),
  deleted int not null
);
alter table public.guest_cleanup_log enable row level security;
revoke all on public.guest_cleanup_log from anon, authenticated;

create or replace function public.cleanup_guests(p_days int default 60, p_max int default 500)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  with old as (
    select u.id
    from auth.users u
    where u.is_anonymous
      and coalesce((select s.updated_at from public.saves s where s.user_id = u.id), u.last_sign_in_at, u.created_at)
          < now() - make_interval(days => greatest(30, p_days))
      and not exists (select 1 from public.treasury t where t.user_id = u.id)
      and not exists (select 1 from public.konsern k where k.user_id = u.id)
      and not exists (select 1 from public.companies c where c.owner_id = u.id)
    order by u.created_at
    limit greatest(0, p_max)
  )
  delete from auth.users u using old where u.id = old.id;
  get diagnostics n = row_count;
  insert into public.guest_cleanup_log (at, deleted) values (now(), n);
  delete from public.guest_cleanup_log where at < now() - interval '180 days';
  return n;
end;
$$;
revoke execute on function public.cleanup_guests(int, int) from public, anon, authenticated;

select cron.schedule('gjester-rydding', '47 3 * * *', 'select public.cleanup_guests()');
