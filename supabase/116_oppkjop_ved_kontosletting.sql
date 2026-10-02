-- B-430: åpne oppkjøpsbud gjøres opp før en konto slettes (funn 2 i etterkontrollen 2.10).
--
-- Budet og motbudet trekkes fra konsernkassa med én gang (068). Radene i `takeovers` peker på `profiles` med
-- `on delete cascade`, så slettet angriperen eller eieren kontoen mens budet var åpent, forsvant raden – og
-- `resolve_takeovers` fant aldri raden som skulle gitt motparten pengene tilbake. Nå gjøres åpne bud opp før profilen
-- slettes, likt med `avbrutt` i `resolve_takeovers`: angriperen får hele budet tilbake, eieren får motbudet tilbake dit
-- det kom fra (kassa og forsvarsfondet). Den som sletter kontoen, får ingenting (kontoen og kassa forsvinner uansett).
--
-- Regelen står i `takeovers_settle_for_user`, så den kan prøves uten å slette noe (connectoren holder igjen `delete`).

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

create or replace function public.takeovers_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.takeovers_settle_for_user(old.id);
  return old;
end;
$$;
revoke execute on function public.takeovers_on_profile_delete() from public, anon, authenticated;

-- `create or replace trigger`, ikke `drop` + `create`: connectoren holder igjen `drop` til eieren bekrefter
create or replace trigger takeovers_on_profile_delete
  before delete on public.profiles
  for each row execute function public.takeovers_on_profile_delete();
