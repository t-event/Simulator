-- B-459: verv en venn (forslaget 3.10, eieren 5.10: «kjør på med dine anbefalinger»).
--
-- * Hver spiller med konto får en vervekode (`referral_my_code`). Lenken er …/Simulator/?verv=KODE.
-- * Vennen kobles til koden med `referral_register` etter at kontoen er laget: egen konto (ikke gjest), konto yngre enn
--   14 dager, aldri vervet før, ikke sin egen kode. Høyst 5 vervinger per spiller.
-- * Belønningen utløses først når vennen er ekte: minst 3 ulike ekte dager med lagring og nådd nivå 2 (tidslinja).
--   Da får den som vervet 10 mill. i konsernkassa, én gang per venn. Den føres i kassaboka som `justering` med
--   ref `verving:<venn>` – ikke `utbytte`/`bidrag`, så den øker ikke lånerammen (`bank_limit`).
-- * Vennen får en startpakke i eget spill (appen, spilltid) – serveren svarer `ok` bare én gang per konto.
-- * Belønningen regnes når den som vervet ser kortet sitt (`referral_my_code`) – «lat», som anbudene.

create table if not exists public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  friend_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz
);
create index if not exists referrals_referrer on public.referrals (referrer_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
revoke all on public.referral_codes from anon, authenticated;
revoke all on public.referrals from anon, authenticated;

update public.config
   set value = value || jsonb_build_object('referral', jsonb_build_object(
     'reward', 10000000, 'cap', 5, 'min_days', 3, 'min_stage', 2, 'max_age_days', 14))
 where id = 'world';

create or replace function public.referral_cfg(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value -> 'referral' ->> p_key)::numeric from public.config where id = 'world'), p_default);
$$;
revoke all on function public.referral_cfg(text, numeric) from public, anon, authenticated;

-- Er vennen ekte nok til belønning? Egen konto, ikke sperret, nok ekte dager og nådd nivå 2 (fra tidslinja)
create or replace function public.referral_qualifies(p_friend uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.user_is_guest(p_friend)
    and exists (select 1 from public.profiles p where p.id = p_friend and not p.banned and p.flagged_at is null)
    and (select count(distinct public.world_day(s.at)) from public.snapshots s where s.user_id = p_friend)
        >= public.referral_cfg('min_days', 3)
    and coalesce((select max(s.stage) from public.snapshots s where s.user_id = p_friend), 0)
        >= public.referral_cfg('min_stage', 2);
$$;
revoke all on function public.referral_qualifies(uuid) from public, anon, authenticated;

-- Belønner vennene som har blitt ekte, for én spiller. Hver venn betales én gang (rewarded_at settes først)
create or replace function public.referral_settle(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  amount numeric := public.referral_cfg('reward', 10000000);
  n integer := 0;
begin
  for r in select friend_id from public.referrals where referrer_id = p_user and rewarded_at is null loop
    if public.referral_qualifies(r.friend_id) then
      update public.referrals set rewarded_at = now() where friend_id = r.friend_id and rewarded_at is null;
      if found then
        insert into public.treasury (user_id, balance, updated_at) values (p_user, amount, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (p_user, amount, 'justering', 'verving:' || r.friend_id);
        n := n + 1;
      end if;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.referral_settle(uuid) from public, anon, authenticated;

-- Min kode, vennene mine og hvor langt de har kommet (og belønningene som er klare)
create or replace function public.referral_my_code()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c text;
  paid integer;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('code', null);
  end if;
  select code into c from public.referral_codes where user_id = uid;
  while c is null loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 6));
    insert into public.referral_codes (user_id, code) values (uid, c) on conflict do nothing;
    select code into c from public.referral_codes where user_id = uid;
  end loop;
  paid := public.referral_settle(uid);
  return json_build_object(
    'code', c,
    'cap', public.referral_cfg('cap', 5),
    'reward', public.referral_cfg('reward', 10000000),
    'min_days', public.referral_cfg('min_days', 3),
    'min_stage', public.referral_cfg('min_stage', 2),
    'paid_now', paid,
    'friends', coalesce((
      select json_agg(json_build_object(
        'nick', p.nickname,
        'days', (select count(distinct public.world_day(s.at)) from public.snapshots s where s.user_id = r.friend_id),
        'stage', coalesce((select max(s.stage) from public.snapshots s where s.user_id = r.friend_id), 0),
        'rewarded', r.rewarded_at is not null) order by r.created_at)
      from public.referrals r join public.profiles p on p.id = r.friend_id
      where r.referrer_id = uid), '[]'::json)
  );
end;
$$;
revoke all on function public.referral_my_code() from public, anon;
grant execute on function public.referral_my_code() to authenticated;

-- Vennen kobler seg til koden (én gang per konto). Svarer hvorfor ikke når det ikke går
create or replace function public.referral_register(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ref uuid;
  born timestamptz;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'gjest');
  end if;
  select user_id into ref from public.referral_codes where code = upper(trim(coalesce(p_code, '')));
  if ref is null then
    return json_build_object('ok', false, 'reason', 'ukjent');
  end if;
  if ref = uid then
    return json_build_object('ok', false, 'reason', 'egen');
  end if;
  if exists (select 1 from public.referrals where friend_id = uid) then
    return json_build_object('ok', false, 'reason', 'brukt');
  end if;
  select created_at into born from public.profiles where id = uid;
  if born is null or born < now() - make_interval(days => public.referral_cfg('max_age_days', 14)::int) then
    return json_build_object('ok', false, 'reason', 'gammel');
  end if;
  if (select count(*) from public.referrals where referrer_id = ref) >= public.referral_cfg('cap', 5) then
    return json_build_object('ok', false, 'reason', 'fullt');
  end if;
  insert into public.referrals (friend_id, referrer_id) values (uid, ref) on conflict do nothing;
  if not found then
    return json_build_object('ok', false, 'reason', 'brukt');
  end if;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.referral_register(text) from public, anon;
grant execute on function public.referral_register(text) to authenticated;
