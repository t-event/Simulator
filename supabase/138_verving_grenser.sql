-- B-472: grensene i verv en venn (B-459) holder også ved sletting, samtidige kall og nettfeil (gjennomgangen 7.10).
--
-- * Taket (5 venner, 50 mill.) teller også venner som har gitt belønning og siden slettet kontoen: raden i `referrals`
--   forsvinner da (on delete cascade), men raden i kassaboka (`verving:<venn>`) står. Før frigjorde slettingen en plass.
-- * Vervinger og belønninger for samme spiller går én om gangen (lås på raden i `referral_codes`), så to venner som
--   kobler seg samtidig, ikke begge slipper inn når det er én plass igjen. Utbetalingen stopper også på taket.
-- * Kobler vennen seg på nytt med samme kode (svaret forsvant på nettet), svarer serveren `ok` igjen, så startpakken
--   kan legges inn. Appen gir den høyst én gang per spill (`counters.vervStart`). En annen kode gir fortsatt «brukt».

-- Hvor mange plasser spilleren har brukt: venner som står i lista, og belønnede venner som er slettet siden
create or replace function public.referral_used(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (select count(*) from public.referrals r where r.referrer_id = p_user)::int
       + (select count(*) from public.treasury_ledger l
           where l.user_id = p_user and l.kind = 'justering' and l.ref like 'verving:%'
             and not exists (select 1 from public.referrals r
                              where r.referrer_id = p_user and l.ref = 'verving:' || r.friend_id::text))::int;
$$;
revoke all on function public.referral_used(uuid) from public, anon, authenticated;

create or replace function public.referral_settle(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  amount numeric := public.referral_cfg('reward', 10000000);
  cap integer := public.referral_cfg('cap', 5)::int;
  paid_total integer;
  n integer := 0;
begin
  -- Sjekk uten lås først (B-353): de fleste har ingen venn som venter på belønning
  if not exists (select 1 from public.referrals where referrer_id = p_user and rewarded_at is null) then
    return 0;
  end if;
  perform 1 from public.referral_codes where user_id = p_user for update;
  select count(*) into paid_total from public.treasury_ledger
   where user_id = p_user and kind = 'justering' and ref like 'verving:%';
  for r in select friend_id from public.referrals where referrer_id = p_user and rewarded_at is null
           order by created_at loop
    exit when paid_total >= cap;
    if public.referral_qualifies(r.friend_id) then
      update public.referrals set rewarded_at = now() where friend_id = r.friend_id and rewarded_at is null;
      if found then
        insert into public.treasury (user_id, balance, updated_at) values (p_user, amount, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (p_user, amount, 'justering', 'verving:' || r.friend_id);
        n := n + 1;
        paid_total := paid_total + 1;
      end if;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.referral_settle(uuid) from public, anon, authenticated;

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
  prev uuid;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'gjest');
  end if;
  -- Låsen gjør at vervinger til samme kode går én om gangen
  select user_id into ref from public.referral_codes where code = upper(trim(coalesce(p_code, ''))) for update;
  if ref is null then
    return json_build_object('ok', false, 'reason', 'ukjent');
  end if;
  if ref = uid then
    return json_build_object('ok', false, 'reason', 'egen');
  end if;
  select created_at into born from public.profiles where id = uid;
  if born is null or born < now() - make_interval(days => public.referral_cfg('max_age_days', 14)::int) then
    return json_build_object('ok', false, 'reason', 'gammel');
  end if;
  select referrer_id into prev from public.referrals where friend_id = uid;
  if prev is not null then
    -- Samme kode igjen: svaret kom kanskje aldri fram, så startpakken kan legges inn (appen gir den én gang)
    return case when prev = ref then json_build_object('ok', true, 'again', true)
                else json_build_object('ok', false, 'reason', 'brukt') end;
  end if;
  if public.referral_used(ref) >= public.referral_cfg('cap', 5) then
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
