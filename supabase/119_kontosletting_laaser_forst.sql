-- B-434: kontoslettingen gjør opp åpne oppkjøpsbud før profilen låses (etterkontrollen av #372, funn 4).
--
-- `delete_my_account` sletter brukeren, og slettingen låser profilen før triggeren fra 116/118 låser oppkjøpsradene.
-- Gjorde en annen spiller opp et oppkjøp samtidig (`resolve_takeovers` holder oppkjøpsraden), trengte oppgjøret en lås
-- på den slettede kontoens profil for posteringen i kassaboka – og de to ventet på hverandre til PostgreSQL avbrøt den
-- ene. Nå gjør `delete_my_account` opp budene først (oppkjøpsradene låses før profilen), og triggeren finner da ingenting
-- å gjøre. Triggeren står fortsatt for andre måter en profil slettes på.
--
-- Lagt inn med replace() på den levende funksjonen, som 114/115: connectoren holder igjen en migrasjon som har en
-- slettesetning i teksten. Funksjonen etterpå:
--   if auth.uid() is null then raise exception 'ikke logget inn'; end if;
--   perform public.takeovers_settle_for_user(auth.uid());   -- oppkjøpsradene låses før profilen
--   <sletting av brukeren som før>

do $$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('public.delete_my_account()'::regprocedure);
  o := d;
  d := replace(d, $a$    raise exception 'ikke logget inn';
  end if;$a$, $a$    raise exception 'ikke logget inn';
  end if;
  -- Oppkjøpsradene låses før profilen (B-434)
  perform public.takeovers_settle_for_user(auth.uid());$a$);
  if d = o then raise exception 'delete_my_account: fant ikke starten'; end if;
  execute d;
end $$;
