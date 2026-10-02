-- B-437: lånet i konsernbanken trekkes fra konsernverdien (topplista «Konsernverdi», sesongen).
--
-- Konsernverdien er konsernkassa + 60 × (utbytte + bidrag) − lånet hjemme. Uten dette ville et lån i konsernbanken
-- gitt flere verk (mer utbytte) uten at gjelden talte, og verdien kunne blåses opp med lånte penger. Lagt inn med
-- replace() på den levende funksjonen; `konsernValueOf` i appen (net/world.ts) gjør det samme.

do $p$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('public.konsern_value(uuid)'::regprocedure);
  o := d;
  d := replace(d, $a$from public.saves where user_id = p_user), 0);$a$,
               $a$from public.saves where user_id = p_user), 0)
       - coalesce((select loan from public.konsern where user_id = p_user), 0);$a$);
  if d = o then
    raise exception 'konsern_value: fant ikke slutten';
  end if;
  execute d;
end $p$;
