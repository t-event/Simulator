-- B-339: hendelser fra spillet i Skiftrapporten, og overtakelser slått på.
-- Serveren skriver selv korte meldinger (kind = 'hendelse', uten avsender) når et anbud åpner og avgjøres, når noen
-- prøver å overta et selskap og hvordan det gikk, og når en spiller når en ny konserntittel. Triggere på tabellene, så
-- de store funksjonene (resolve_tenders, takeover_bid, resolve_takeovers, konsern_settle) står urørt.
-- Beløp skrives bare der de alt er offentlige (overtakelsesbudet); anbudsbudene er hemmelige og nevnes ikke.

alter table public.chat_messages alter column user_id drop not null;
alter table public.chat_messages add column if not exists kind text not null default 'spiller';
alter table public.chat_messages drop constraint if exists chat_messages_kind;
alter table public.chat_messages add constraint chat_messages_kind
  check ((kind = 'spiller' and user_id is not null) or (kind = 'hendelse' and user_id is null));

-- Kallenavnet til en spiller i en hendelse
create or replace function public.chat_nick(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select nickname from public.profiles where id = p_user and not banned), 'En spiller');
$$;
revoke execute on function public.chat_nick(uuid) from public, anon, authenticated;

-- «600 mill. kr» / «1,2 mrd. kr»
create or replace function public.chat_kr(p_amount numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case when p_amount >= 1e9 then replace(to_char(round(p_amount / 1e9, 1), 'FM999990.0'), '.', ',') || ' mrd. kr'
              else to_char(round(p_amount / 1e6), 'FM999999') || ' mill. kr' end;
$$;
revoke execute on function public.chat_kr(numeric) from public, anon, authenticated;

-- «8.10. kl. 03:33» i norsk tid
create or replace function public.chat_when(p_at timestamptz)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(p_at at time zone 'Europe/Oslo', 'FMDD.FMMM. "kl." HH24:MI');
$$;
revoke execute on function public.chat_when(timestamptz) from public, anon, authenticated;

create or replace function public.chat_event(p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_messages (user_id, kind, body) values (null, 'hendelse', left(p_body, 300));
end;
$$;
revoke execute on function public.chat_event(text) from public, anon, authenticated;

-- Anbud: åpnet og avgjort
create or replace function public.chat_on_tender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co text := (select name from public.companies where id = new.company_id);
begin
  if tg_op = 'INSERT' and new.status = 'åpent' then
    perform public.chat_event(format('Anbudet på %s er åpent til %s. Høyeste bud blir eier i 14 dager.',
                                     lower(co), public.chat_when(new.closes_at)));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'avgjort' then
      perform public.chat_event(format('%s vant anbudet på %s (%s bud).', public.chat_nick(new.winner_id), lower(co),
                                       coalesce(new.bidders, 1)));
    elsif new.status = 'ingen bud' then
      perform public.chat_event(format('Ingen bød på %s denne gangen.', lower(co)));
    end if;
  end if;
  return new;
exception when others then
  -- En melding som feiler, skal aldri stoppe anbudet
  return new;
end;
$$;
revoke execute on function public.chat_on_tender() from public, anon, authenticated;
drop trigger if exists chat_on_tender on public.tenders;
create trigger chat_on_tender after insert or update of status on public.tenders
  for each row execute function public.chat_on_tender();

-- Overtakelser: forsøket (budet er offentlig) og utfallet
create or replace function public.chat_on_takeover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co text := (select name from public.companies where id = new.company_id);
begin
  if tg_op = 'INSERT' then
    perform public.chat_event(format('%s prøver å overta %s fra %s med %s. Eieren har 72 timer på seg.',
                                     public.chat_nick(new.attacker_id), lower(co), public.chat_nick(new.owner_id),
                                     public.chat_kr(new.bid)));
  elsif new.status is distinct from old.status then
    if new.status = 'overtatt' then
      perform public.chat_event(format('%s har overtatt %s fra %s.', public.chat_nick(new.attacker_id), lower(co),
                                       public.chat_nick(new.owner_id)));
    elsif new.status = 'avverget' then
      perform public.chat_event(format('%s slo tilbake forsøket fra %s og beholder %s.', public.chat_nick(new.owner_id),
                                       public.chat_nick(new.attacker_id), lower(co)));
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.chat_on_takeover() from public, anon, authenticated;
drop trigger if exists chat_on_takeover on public.takeovers;
create trigger chat_on_takeover after insert or update of status on public.takeovers
  for each row execute function public.chat_on_takeover();

-- Ny konserntittel (nivået er det høyeste av `level` og `floor`, som i title_for)
create or replace function public.chat_on_konsern()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lv int := greatest(coalesce(new.level, 0), coalesce(new.floor, 0));
  v_before int := case when tg_op = 'UPDATE' then greatest(coalesce(old.level, 0), coalesce(old.floor, 0)) else 0 end;
  t text;
begin
  if lv > v_before and lv >= 1 then
    t := public.konsern_cfg() -> 'ladder' -> (lv - 1) ->> 'title';
    if t is not null then
      perform public.chat_event(format('%s er blitt %s!', public.chat_nick(new.user_id), t));
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.chat_on_konsern() from public, anon, authenticated;
drop trigger if exists chat_on_konsern on public.konsern;
create trigger chat_on_konsern after insert or update of level, floor on public.konsern
  for each row execute function public.chat_on_konsern();

-- Lista og «nyeste» tar med hendelsene (uten avsender)
create or replace function public.chat_list(p_after bigint default 0, p_limit int default 60)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(json_build_object('id', m.id, 'nick', coalesce(m.nickname, 'Skiftrapporten'),
                                             'mine', m.user_id is not null and m.user_id = auth.uid(),
                                             'event', m.kind = 'hendelse',
                                             'body', m.body, 'at', round(extract(epoch from m.created_at) * 1000))
                           order by m.id), '[]'::json)
  from (
    select c.id, c.user_id, c.kind, c.body, c.created_at, p.nickname
    from public.chat_messages c left join public.profiles p on p.id = c.user_id
    where auth.uid() is not null and not c.hidden
      and (c.kind = 'hendelse' or (not p.banned and p.nickname is not null))
      and c.id > greatest(0, coalesce(p_after, 0))
      and c.created_at > now() - interval '30 days'
    order by c.id desc
    limit least(100, greatest(1, coalesce(p_limit, 60)))
  ) m;
$$;

create or replace function public.chat_latest()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(c.id), 0)
  from public.chat_messages c left join public.profiles p on p.id = c.user_id
  where auth.uid() is not null and not c.hidden and (c.kind = 'hendelse' or not p.banned)
    and c.created_at > now() - interval '30 days';
$$;

revoke execute on function public.chat_list(bigint, int) from public, anon;
revoke execute on function public.chat_latest() from public, anon;
grant execute on function public.chat_list(bigint, int) to authenticated;
grant execute on function public.chat_latest() to authenticated;

-- Overtakelser slått på (eierens beskjed 29.9.2026). Kjørt for seg først, så den gjaldt med én gang
update public.config set value = jsonb_set(value, '{takeover,enabled}', '1'::jsonb) where id = 'world';
