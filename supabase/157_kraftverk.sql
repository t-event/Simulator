-- B-509: kraftverket, det fjerde strategiske selskapet (SLUTTSPILL-FORSLAG 2.2). Eieren (22.10): «Velg din anbefaling og
-- fortsett» – valget mellom kraftverk, ildfastfabrikk og havn.
--
-- Eieren av kraftverket tjener på strømmen de andre verkene bruker: 12 øre per kWh. Strøm er den største kostnaden i en
-- lysbueovn, og serveren har alt kWh per spiller i tidslinja (`snapshots.kwh_total`, B-396).
--
-- Det som teller en ekte dag, bygger på produksjonsmåleren som de andre selskapene (029, 042, 043), så ekte tid og
-- juksesperren gjelder likt:
--   stålet som teller den dagen (skraplagerets tonn / 1,1 – høyst én normal spilldag)
--   × spillerens kWh per tonn de siste 7 ekte dagene (fra tidslinja, mellom 150 og 800, ellers 300).
-- Lokal fart gir derfor ikke mer. Ingen rabatt på strømmen hjemme: selskapet gir penger i ekte tid til eieren, og eget
-- verk regnes i spilltid (B-323).
--
-- Kraftverket står i Østskogen (elvene). Det er bygget ferdig, men **slått av** (`active = false`) til appen som kjenner
-- typen, er publisert – eldre apper viser ukjente typer som skraplageret. Slås på med:
--   update public.companies set active = true where type = 'kraftverk'; select public.company_estimate_refresh(true);
-- Anbudet åpnes da av verdensjobben (`verden-tick`, hvert 5. minutt).

update public.config
set value = value || jsonb_build_object('power_fee_per_kwh', 0.12, 'power_kwh_min', 150, 'power_kwh_max', 800,
                                        'power_kwh_typical', 300)
where id = 'world' and not (value ? 'power_fee_per_kwh');

alter table public.companies drop constraint if exists companies_type_check;
alter table public.companies add constraint companies_type_check
  check (type in ('skraplager', 'slagg', 'verksted', 'kraftverk'));

-- kWh per tonn stål for en spiller de siste 7 ekte dagene fram til og med dagen: økningen i telleren for strøm delt på
-- økningen i tonnene, innenfor grensene. Tall merket `pre_reform` brukes ikke (B-190). For lite data: det typiske tallet.
create or replace function public.power_kwh_per_t(p_user uuid, p_day date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           (select least(greatest((max(s.kwh_total) - min(s.kwh_total))::numeric
                                  / nullif(max(s.produced_t) - min(s.produced_t), 0),
                                  coalesce((w.value->>'power_kwh_min')::numeric, 150)),
                         coalesce((w.value->>'power_kwh_max')::numeric, 800))
            from public.snapshots s
            where s.user_id = p_user and s.kwh_total is not null and s.produced_t is not null
              and not coalesce(s.pre_reform, false)
              and s.at >= (p_day - 7)::timestamp at time zone 'Europe/Oslo'
              and s.at < (p_day + 1)::timestamp at time zone 'Europe/Oslo'
            having max(s.produced_t) - min(s.produced_t) >= 100),
           coalesce((w.value->>'power_kwh_typical')::numeric, 300))
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.power_kwh_per_t(uuid, date) from public, anon, authenticated;

-- Det som teller: tonn skrap, tonn slagg, kroner vedlikehold eller kWh strøm (ellers lik 043)
create or replace function public.company_counted_t(p_type text, p_user uuid, p_day date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'slagg' then public.scrap_counted_t(p_user, p_day)
                      / coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                      * coalesce((w.value->>'slag_per_steel')::numeric, 0.12)
    when 'verksted' then public.maint_counted_kr(p_user, p_day)
    when 'kraftverk' then case when public.scrap_counted_t(p_user, p_day) > 0
                               then public.scrap_counted_t(p_user, p_day)
                                    / coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                                    * public.power_kwh_per_t(p_user, p_day)
                               else 0 end
    else public.scrap_counted_t(p_user, p_day)
  end
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.company_counted_t(text, uuid, date) from public, anon, authenticated;

-- Kroner per enhet som teller: per tonn for skrap og slagg, andel for verkstedet, per kWh for kraftverket
create or replace function public.company_fee(p_type text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'slagg' then coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    when 'verksted' then coalesce((w.value->>'workshop_share')::numeric, 0.5)
    when 'kraftverk' then coalesce((w.value->>'power_fee_per_kwh')::numeric, 0.12)
    else coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000)
  end
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.company_fee(text) from public, anon, authenticated;

-- Det gamle anslaget, brukt til det finnes nok tall (ellers lik 133)
create or replace function public.company_estimate_cap(p_company integer, p_exclude uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case c.type
    when 'slagg' then public.scrap_yard_estimate(p_exclude)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * coalesce((w.value->>'slag_per_steel')::numeric, 0.12)
                      * coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    when 'verksted' then public.scrap_yard_estimate(p_exclude)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * public.maint_rate_estimate(p_exclude)
                      * coalesce((w.value->>'workshop_share')::numeric, 0.5)
    when 'kraftverk' then public.scrap_yard_estimate(p_exclude)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * coalesce((w.value->>'power_kwh_typical')::numeric, 300)
                      * coalesce((w.value->>'power_fee_per_kwh')::numeric, 0.12)
    else public.scrap_yard_estimate(p_exclude)
  end
  from public.companies c, public.config w
  where c.id = p_company and w.id = 'world';
$$;
revoke all on function public.company_estimate_cap(integer, uuid) from public, anon, authenticated;

-- Kraftverket i Østskogen, slått av til appen kjenner det
insert into public.companies (type, name, active, region)
select 'kraftverk', 'Kraftverket', false, 'ost'
where not exists (select 1 from public.companies where type = 'kraftverk');
