-- Realistiske titler (B-238): grensene er satt etter ekte stålselskaper. Det mest verdifulle stålselskapet i verden
-- er verdt noen hundre milliarder kroner og hele stålindustrien noen tusen, så Stållegende gis ved 400 mrd. og Stålikon
-- ved 5 000 mrd. (før 1 billion og 1 billiard). Samme grenser som LEGENDS i appen (game/konsern.ts).
create or replace function public.title_of(equity numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when equity >= 5000000000000 then 'Stålikon'
    when equity >= 3000000000000 then 'Stålmyte'
    when equity >= 1500000000000 then 'Stålkolosse'
    when equity >= 750000000000 then 'Stålgigant'
    when equity >= 400000000000 then 'Stållegende'
    when equity >= 200000000000 then 'Stålkeiser'
    when equity >= 100000000000 then 'Stålkonge'
    when equity >= 50000000000 then 'Stålfyrste'
    when equity >= 25000000000 then 'Stålmagnat'
    when equity >= 10000000000 then 'Stålbaron'
  end;
$$;
