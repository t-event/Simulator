-- B-210: anbudet på skraplageret var for skjult. Alle som er logget inn, ser nå hvem som har lagt inn bud
-- (kallenavnene, sortert alfabetisk så rekkefølgen ikke avslører noe), men ikke hvor mye. Beløpene er fortsatt
-- skjult til anbudet stenger. Ellers er world_status() lik 030/031.
create or replace function public.world_status()
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  out json;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.world_tick();
  select json_build_object(
    'companies', coalesce((select json_agg(json_build_object(
        'id', c.id, 'type', c.type, 'name', c.name,
        'owner', (select nickname from public.profiles where id = c.owner_id),
        'mine', c.owner_id = uid,
        'concession_until', c.concession_until,
        'next_owner', (select p.nickname from public.company_owners o join public.profiles p on p.id = o.user_id
                       where o.company_id = c.id and o.from_at > now() order by o.from_at limit 1),
        'next_mine', exists (select 1 from public.company_owners o where o.company_id = c.id and o.from_at > now()
                             and o.user_id = uid),
        'income_yesterday', (select amount from public.company_income i where i.company_id = c.id
                             and i.day = (now() at time zone 'utc')::date - 1),
        'income_mine', (select coalesce(sum(amount), 0) from public.company_income i where i.company_id = c.id
                        and i.owner_id = uid),
        'estimate_per_day', round(public.scrap_yard_estimate(c.owner_id)),
        'tender', (select json_build_object('id', t.id, 'opens_at', t.opens_at, 'closes_at', t.closes_at,
                     'min_bid', t.min_bid, 'max_bid', t.max_bid,
                     'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid),
                     -- Hvem som har bydd, uten beløp (B-210)
                     'bidders', coalesce((select json_agg(p.nickname order by lower(p.nickname))
                                          from public.tender_bids b join public.profiles p on p.id = b.user_id
                                          where b.tender_id = t.id), '[]'::json))
                   from public.tenders t where t.company_id = c.id and t.status = 'åpent'
                   order by t.closes_at limit 1),
        'last_result', (select json_build_object('id', t.id, 'closed_at', t.closes_at, 'status', t.status,
                          'winner', (select nickname from public.profiles where id = t.winner_id),
                          'won', t.winner_id = uid, 'winning_bid', t.winning_bid, 'bidders', t.bidders,
                          'tie', t.tie,
                          'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid))
                        from public.tenders t where t.company_id = c.id and t.status <> 'åpent'
                        order by t.closes_at desc limit 1)
      ) order by c.id) from public.companies c), '[]'::json),
    'treasury', public.treasury_status()
  ) into out;
  return out;
end;
$function$;

revoke execute on function public.world_status() from public, anon;
grant execute on function public.world_status() to authenticated;
