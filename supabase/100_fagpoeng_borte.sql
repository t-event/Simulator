-- 100 Fagpoeng mens du var borte (B-399). Serveren regner dem ut, som tida borte: 10 fagpoeng per time borte (ca. 5 %
-- av vanlig takt – testspilleren tjener 5–8 fagpoeng per spilldøgn, og en time på 1× er 30 spilldøgn), høyst åtte
-- timer (80 fagpoeng), ingenting under 30 minutter. Det som begrenser belønningen, er at serveren regner den og at tida
-- borte bare hentes én gang (samme rad i `daily` som pengene). Appen legger inn det serveren svarer; taket i appen er
-- bare et vern mot et feil svar, ikke en juksesperre (B-400).
-- `claim_away()` står som før for eldre apper (de får pengene, ikke fagpoengene).

alter table public.daily add column if not exists away_fp_total integer not null default 0;

/** Tida borte (sekunder, høyst åtte timer) og fagpoengene for den, regnet av serveren og hentet én gang (B-399) */
create or replace function public.claim_away_v2()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  gap int;
  fp int;
begin
  gap := public.claim_away();
  fp := case when gap >= 1800 then least(80, floor(gap / 3600.0 * 10)::int) else 0 end;
  if fp > 0 then
    update public.daily set away_fp_total = away_fp_total + fp where user_id = auth.uid();
  end if;
  return json_build_object('seconds', gap, 'fp', fp);
end;
$$;

revoke execute on function public.claim_away_v2() from public, anon;
grant execute on function public.claim_away_v2() to authenticated;
