-- B-473: egen gjennomgang av rettelsene i B-472 (7.10). Serverdelen:
--
-- * Varselkøen: ryddingen (gamle og strandede varsler) står i `push_housekeeping` og kjøres av `push_kick` hvert minutt –
--   før gikk den bare når noe annet ventet. Et varsel som ble hentet men aldri meldt tilbake, legges tilbake bare hvis det
--   er under 6 timer gammelt; ellers merkes det «for gammelt». Nye forsøk venter lenger og lenger (`retry_at`: 2, 4, 8,
--   16 minutter, ca. en halvtime i alt), og en midlertidig feil (ingen svar, 408, 429, 5xx) teller ikke mot enheten
--   (`fails`) – før kunne et kort avbrudd hos Apple/Google slå av en enhet etter to varsler.
-- * Verving: samme kode igjen gir `ok` bare det første døgnet etter koblingen (svaret gikk tapt på nettet), så en venn fra
--   før B-472 ikke kan hente startpakken igjen. `referral_my_code` gir `used` – plassene som er brukt, også av belønnede
--   venner som har slettet kontoen – så kortet viser det samme som serveren.
-- * Tidslinjetallene: utgangspunktet før perioden er aldri en rad merket `pre_reform` (fast regel, B-190).

alter table public.push_outbox add column if not exists retry_at timestamptz;

create or replace function public.push_housekeeping()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Aldri sendt og eldre enn 6 timer
  update public.push_outbox set sent_at = now(), sent = 0, error = 'for gammelt'
   where sent_at is null and created_at < now() - interval '6 hours';
  -- Hentet, men aldri meldt tilbake (funksjonen stoppet underveis)
  update public.push_outbox
     set sent = 0, error = case when created_at < now() - interval '6 hours' then 'for gammelt' else 'ikke meldt tilbake' end
   where sent_at is not null and sent is null and error is null and sent_at < now() - interval '10 minutes'
     and (attempts >= 5 or created_at < now() - interval '6 hours');
  update public.push_outbox set sent_at = null, retry_at = now()
   where sent_at is not null and sent is null and error is null and sent_at < now() - interval '10 minutes'
     and attempts < 5 and created_at >= now() - interval '6 hours';
end;
$$;
revoke all on function public.push_housekeeping() from public, anon, authenticated;

create or replace function public.push_claim(p_limit int default 100)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  out json;
begin
  perform public.push_housekeeping();
  with c as (
    update public.push_outbox o set sent_at = now(), attempts = o.attempts + 1
     where o.id in (select id from public.push_outbox
                     where sent_at is null and (retry_at is null or retry_at <= now())
                     order by id limit greatest(1, p_limit)
                    for update skip locked)
    returning o.*
  )
  select coalesce(json_agg(json_build_object(
           'id', c.id, 'kind', c.kind, 'title', c.title, 'body', c.body, 'link', c.link, 'ref', c.ref,
           'subs', (select coalesce(json_agg(json_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]')
                      from public.push_subscriptions s
                     where s.user_id = c.user_id and s.active and (c.kind = 'test' or c.kind = any (s.kinds))))
           order by c.id), '[]')
    into out from c;
  return out;
end;
$$;
revoke all on function public.push_claim(int) from public, anon, authenticated;
grant execute on function public.push_claim(int) to service_role;

create or replace function public.push_done(p_results jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  st int;
begin
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]')) loop
    st := coalesce((r ->> 'status')::int, 0);
    if (r ->> 'endpoint') is not null then
      if coalesce((r ->> 'gone')::boolean, false) then
        update public.push_subscriptions set active = false, updated_at = now() where endpoint = r ->> 'endpoint';
      elsif st between 200 and 299 then
        update public.push_subscriptions set fails = 0, last_ok_at = now() where endpoint = r ->> 'endpoint';
      elsif not (st = 0 or st = 408 or st = 429 or st >= 500) then
        -- Bare varige feil teller mot enheten; midlertidige feil prøves igjen
        update public.push_subscriptions set fails = fails + 1, active = active and fails + 1 < 10
         where endpoint = r ->> 'endpoint';
      end if;
    end if;
    if (r ->> 'id') is not null then
      if coalesce((r ->> 'retry')::boolean, false) and st = 0 then
        update public.push_outbox
           set sent_at = case when attempts < 5 then null else sent_at end,
               sent = case when attempts < 5 then null else 0 end,
               retry_at = case when attempts < 5 then now() + interval '1 minute' * power(2, attempts) else retry_at end,
               error = case when attempts < 5 then null else coalesce(left(r ->> 'error', 200), error) end
         where id = (r ->> 'id')::bigint;
      else
        update public.push_outbox
           set sent = coalesce(sent, 0) + case when st between 200 and 299 then 1 else 0 end,
               error = coalesce(left(r ->> 'error', 200), error)
         where id = (r ->> 'id')::bigint;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.push_done(jsonb) from public, anon, authenticated;
grant execute on function public.push_done(jsonb) to service_role;

create or replace function public.push_kick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  url text;
  kick text;
begin
  perform public.push_scan();
  perform public.push_housekeeping();
  if not exists (select 1 from public.push_outbox where sent_at is null and (retry_at is null or retry_at <= now())) then
    return;
  end if;
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url' limit 1;
  select decrypted_secret into kick from vault.decrypted_secrets where name = 'push_kick_key' limit 1;
  if url is not null and kick is not null then
    perform net.http_post(url := url, body := '{}'::jsonb,
                          headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-key', kick),
                          timeout_milliseconds := 30000);
  end if;
end;
$$;
revoke all on function public.push_kick() from public, anon, authenticated;

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
  prev_at timestamptz;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'gjest');
  end if;
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
  select referrer_id, created_at into prev, prev_at from public.referrals where friend_id = uid;
  if prev is not null then
    -- Samme kode igjen det første døgnet: svaret kom kanskje aldri fram, så startpakken kan legges inn
    return case when prev = ref and prev_at > now() - interval '1 day' then json_build_object('ok', true, 'again', true)
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
    'used', public.referral_used(uid),
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

create or replace function public.timeline_metrics(p_user uuid, p_from timestamp with time zone,
                                                   p_to timestamp with time zone default now())
returns table(tonn numeric, kwh numeric, kwh_per_tonn numeric, levert integer, misligholdt integer, avbrutt integer,
              reklamasjoner integer, presisjon numeric, rader integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with rows_in as (
    -- Siste lagring før perioden er utgangspunktet, så første økt i perioden kommer med – aldri en rad fra før reformen
    (select s.at, s.produced_t, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints, s.metric_note
       from public.snapshots s
      where s.user_id = p_user and s.at < p_from and not s.pre_reform
      order by s.at desc
      limit 1)
    union all
    (select s.at, s.produced_t, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints, s.metric_note
       from public.snapshots s
      where s.user_id = p_user and s.at >= p_from and s.at < p_to)
  ),
  r as (
    select x.*,
           lag(x.produced_t) over w as p_t, lag(x.kwh_total) over w as p_k, lag(x.deliveries) over w as p_d,
           lag(x.missed) over w as p_m, lag(x.cancelled) over w as p_c, lag(x.complaints) over w as p_r
    from rows_in x
    window w as (order by x.at)
  ),
  d as (
    select
      case when kwh_total is not null and p_k is not null and produced_t >= p_t then produced_t - p_t end as dt,
      case when kwh_total is not null and p_k is not null and produced_t >= p_t then kwh_total - p_k end as dk,
      case when produced_t >= p_t and deliveries is not null and p_d is not null
                and missed is not null and p_m is not null and cancelled is not null and p_c is not null
           then deliveries - p_d end as dd,
      case when produced_t >= p_t and deliveries is not null and p_d is not null
                and missed is not null and p_m is not null and cancelled is not null and p_c is not null
           then missed - p_m end as dm,
      case when produced_t >= p_t and deliveries is not null and p_d is not null
                and missed is not null and p_m is not null and cancelled is not null and p_c is not null
           then cancelled - p_c end as dc,
      case when produced_t >= p_t and complaints is not null and p_r is not null then complaints - p_r end as dr
    from r
    where p_t is not null and at >= p_from and not coalesce('ny_start' = any (metric_note), false)
  )
  select sum(dt), sum(dk), round(sum(dk) / nullif(sum(dt), 0)),
         sum(dd)::int, sum(dm)::int, sum(dc)::int, sum(dr)::int,
         round(sum(dd)::numeric / nullif(sum(dd) + sum(dm) + sum(dc), 0), 4),
         count(*)::int
  from d;
$function$;
