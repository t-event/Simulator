-- B-451: begrenset minstebud ved oppkjøp (alternativ F i B-449/B-450). Eierens beslutning 3.10.2026: «Jeg anbefaler F som
-- en forsiktig første endring».
--
-- * Minstebudet for et nytt oppkjøpsforsøk er det høyeste av 10 dagers inntekt og siste anbudspris (som før), men aldri
--   over 12 dagers inntekt (`config.world.takeover.min_bid_cap_days`). Uten inntektsanslag er det verdien, som før.
-- * Øvrige regler beholdes: selskapsverdien (`company_value`) er fortsatt skalaen for budstyrke, motbud, Kontroll og
--   inntektsøkning. Pågående bud, økninger og overbud (`takeover_min_raise`, `takeover_outbid_min`) er urørt; bare
--   `takeover_window` (som `takeover_bid` leser minstebudet fra for nye bud) endres.
-- * `attack_min` i vinduet er styrken ved det nye minstebudet.

update public.config
   set value = jsonb_set(value, '{takeover}', (value -> 'takeover') || jsonb_build_object('min_bid_cap_days', 12))
 where id = 'world';

create or replace function public.takeover_min_bid(p_company integer)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when x.e <= 0 then x.v
              else greatest(public.control_cfg_num('value_days', 10) * x.e,
                            least(x.v, public.takeover_cfg_num('min_bid_cap_days', 12) * x.e)) end
  from (select coalesce(public.company_estimate(p_company), 0) as e, public.company_value(p_company) as v) x;
$$;
revoke all on function public.takeover_min_bid(integer) from public, anon, authenticated;

create or replace function public.takeover_window(p_company integer, p_user uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  since timestamptz;
  v numeric;
  mb numeric;
  reason text;
begin
  if public.takeover_cfg_num('enabled', 0) <= 0 or p_user is null then
    return null;
  end if;
  select * into c from public.companies where id = p_company and active;
  if c.id is null or c.owner_id is null or c.owner_id = p_user then
    return null;
  end if;
  select max(from_at) into since from public.company_owners
  where company_id = p_company and user_id = c.owner_id and from_at <= now();
  v := public.company_value(p_company);
  mb := public.takeover_min_bid(p_company);
  reason := case
    when exists (select 1 from public.takeovers where company_id = p_company and status = 'åpent') then 'pagar'
    when exists (select 1 from public.takeovers where attacker_id = p_user and status = 'åpent') then 'ett'
    when since > now() - make_interval(days => public.takeover_cfg_num('protect_days', 3)::int) then 'vern'
    when c.concession_until < now() + make_interval(days => public.takeover_cfg_num('last_days', 5)::int) then 'sent'
    when exists (select 1 from public.takeovers where company_id = p_company and status = 'avverget'
                 and resolved_at > now() - make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int)) then 'pause'
    else null end;
  return json_build_object('open', reason is null, 'reason', reason, 'min_bid', round(mb), 'value', round(v),
    'rules', 2,
    'from', case
      when reason = 'vern' then since + make_interval(days => public.takeover_cfg_num('protect_days', 3)::int)
      when reason = 'pause' then (select max(resolved_at) from public.takeovers where company_id = p_company
                                  and status = 'avverget')
                                 + make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int) end,
    'defense_now', round(public.takeover_defense_of2(coalesce((public.company_control(p_company) ->> 'score')::numeric, 0),
                     0, v), 1),
    'attack_min', round(public.takeover_attack_of(mb, v, public.activity_factor(p_user, public.world_today()),
                     public.plants_in_region(p_user, c.region)), 1));
end;
$$;
