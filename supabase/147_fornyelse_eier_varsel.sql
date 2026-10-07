-- B-481: når fornyelsesanbudet åpner, får eieren av selskapet en egen tekst i varselet på mobilen: perioden går ut, og
-- eieren må by for å beholde selskapet (ingen fordel, `renewal_max` = 0). De andre får samme varsel som før. Samme ref
-- (`anbud:<id>:apent:<bruker>`), så eieren får ett varsel, ikke to.
-- Endret i den levende funksjonen med replace(), som 114/115/119.

do $do$
declare
  d text := pg_get_functiondef('public.push_on_tender()'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$  co text := lower((select name from public.companies where id = new.company_id));
  r record;$a$, $a$  co text := lower((select name from public.companies where id = new.company_id));
  owner uuid := (select owner_id from public.companies where id = new.company_id);
  r record;$a$);
  d := replace(d, $a$      perform public.push_enqueue(r.user_id, 'anbud', format('anbud:%s:apent:%s', new.id, r.user_id),
        format('Anbudet på %s er åpent', co),
        format('Høyeste bud blir eier i 14 dager. Budene er hemmelige til %s.', public.chat_when(new.closes_at)),
        'industri');$a$, $a$      if r.user_id = owner then
        -- Fornyelsen (B-481): eieren har ingen fordel og mister selskapet uten bud
        perform public.push_enqueue(r.user_id, 'anbud', format('anbud:%s:apent:%s', new.id, r.user_id),
          format('Perioden din på %s går ut', co),
          format('By i anbudet for å beholde selskapet – du stiller likt med alle andre. Stenger %s.',
                 public.chat_when(new.closes_at)),
          'industri');
      else
        perform public.push_enqueue(r.user_id, 'anbud', format('anbud:%s:apent:%s', new.id, r.user_id),
          format('Anbudet på %s er åpent', co),
          format('Høyeste bud blir eier i 14 dager. Budene er hemmelige til %s.', public.chat_when(new.closes_at)),
          'industri');
      end if;$a$);
  if d = o or position('owner uuid :=' in d) = 0 or position('Perioden din på %s går ut' in d) = 0 then
    raise exception 'push_on_tender: ikke alle bitene ble byttet';
  end if;
  execute d;
end;
$do$;
