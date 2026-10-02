-- B-433: refusjonen ved kontosletting (116) låser i samme rekkefølge som verkskjøpet, og 112 sjekker funksjonene.
--
-- 1. `takeovers_settle_for_user` (116) låste kassa før konsernet når motbudet gikk tilbake til både kassa og fondet.
--    `konsern_order` låser konsernet før kassa. Samtidig kontosletting og verkskjøp kunne da vente på hverandre, og
--    PostgreSQL avbrøt den ene (hele handlingen rulles tilbake – ingen halv refusjon, men en handling som feiler). Nå tas
--    alle låsene først: oppkjøpsradene, konsernet, så kassa. 116 står som den ble lagt inn.
-- 2. Grunnlaget for etterbetalingen (117) får definisjonene og kontrollsummene til funksjonene 112 regner med
--    (`basis_112_functions`), så 112 kan stoppe hvis en av dem er endret siden.

create or replace function public.takeovers_settle_for_user(p_user uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  n int := 0;
begin
  -- Alle låsene tas først, i samme rekkefølge som verkskjøpet (`konsern_order`: konsernet før kassa) og motbudet
  -- (`takeover_defend`: oppkjøpsraden først). Før låste refusjonen kassa før konsernet, og samtidig kontosletting og
  -- verkskjøp kunne vente på hverandre til PostgreSQL avbrøt den ene (B-433)
  perform 1 from public.takeovers
  where status = 'åpent' and (attacker_id = p_user or owner_id = p_user) order by id for update;
  perform 1 from public.konsern
  where user_id in (select owner_id from public.takeovers
                    where status = 'åpent' and attacker_id = p_user and owner_id <> p_user)
  order by user_id for update;
  perform 1 from public.treasury
  where user_id in (select case when t.attacker_id = p_user then t.owner_id else t.attacker_id end
                    from public.takeovers t
                    where t.status = 'åpent' and (t.attacker_id = p_user or t.owner_id = p_user))
    and user_id <> p_user
  order by user_id for update;
  for o in select * from public.takeovers
           where status = 'åpent' and (attacker_id = p_user or owner_id = p_user)
           order by id for update loop
    if o.attacker_id <> p_user and o.bid > 0 then
      insert into public.treasury (user_id, balance, updated_at) values (o.attacker_id, o.bid, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref)
      values (o.attacker_id, o.bid, 'overtakelse', 'avbrutt konto slettet:' || o.id);
    end if;
    if o.owner_id <> p_user then
      if o.defense - o.defense_fund > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, o.defense - o.defense_fund, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (o.owner_id, o.defense - o.defense_fund, 'overtakelse', 'motbud tilbake konto slettet:' || o.id);
      end if;
      if o.defense_fund > 0 then
        update public.konsern set fund = fund + o.defense_fund, updated_at = now() where user_id = o.owner_id;
      end if;
    end if;
    update public.takeovers set status = 'avbrutt', resolved_at = now() where id = o.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.takeovers_settle_for_user(uuid) from public, anon, authenticated;

create table public.basis_112_functions as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition,
  md5(pg_get_functiondef(p.oid)) as checksum, now() as taken_at
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('dividend_from_state', 'dividend_to_treasury', 'world_day', 'world_shared', 'world_research');
alter table public.basis_112_functions enable row level security;
revoke all on public.basis_112_functions from anon, authenticated;
