-- B-469: varsel når eieren legger inn motbud, og når kjøperen hever sitt eget bud (eieren 5.10: «Jeg som prøver å ta over
-- en bedrift får ikke varsel på mobilen om eier byr over meg igjen»). Triggeren i 134 så bare på status og kjøper.
-- Motbudets beløp står ikke i varselet – det er ikke offentlig (oppkjøpsbudet er det, B-339). Ellers som i 134.

-- Oppkjøp: budet, overbud, høyere bud, motbud og utfallet
create or replace function public.push_on_takeover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co text := lower((select name from public.companies where id = new.company_id));
  bidder text := public.chat_nick(new.attacker_id);
begin
  if tg_op = 'INSERT' then
    perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:bud:%s', new.id, new.bid),
      format('Oppkjøpsbud på %s', co),
      format('%s byr %s. Du kan legge inn motbud til %s.', bidder, public.chat_kr(new.bid), public.chat_when(new.closes_at)),
      'industri');
  elsif new.status is distinct from old.status then
    if new.status = 'overtatt' then
      perform public.push_enqueue(new.attacker_id, 'oppkjop', format('oppkjop:%s:ut', new.id),
        format('Du har kjøpt %s', co), 'Oppkjøpet gikk gjennom. Selskapet er ditt.', 'industri');
      perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:ut', new.id) || ':eier',
        format('%s er solgt', upper(left(co, 1)) || substr(co, 2)), format('%s kjøpte selskapet. Se oppgjøret under Industrien.', bidder),
        'industri');
    elsif new.status = 'avverget' then
      perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:ut', new.id) || ':eier',
        format('Du beholder %s', co), format('Motbudet holdt mot %s.', bidder), 'industri');
      perform public.push_enqueue(new.attacker_id, 'oppkjop', format('oppkjop:%s:ut', new.id),
        format('Oppkjøpet av %s gikk ikke gjennom', co), 'Eieren beholder selskapet. Se oppgjøret under Industrien.',
        'industri');
    end if;
  elsif new.status = 'åpent' and new.attacker_id is distinct from old.attacker_id then
    perform public.push_enqueue(old.attacker_id, 'oppkjop', format('oppkjop:%s:overbydd:%s', new.id, new.bid),
      format('Du er overbydd på %s', co),
      format('%s byr %s. Du kan by over til %s.', bidder, public.chat_kr(new.bid), public.chat_when(new.closes_at)),
      'industri');
    perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:bud:%s', new.id, new.bid),
      format('Nytt oppkjøpsbud på %s', co),
      format('%s byr %s. Du kan legge inn motbud til %s.', bidder, public.chat_kr(new.bid), public.chat_when(new.closes_at)),
      'industri');
  elsif new.status = 'åpent' and new.bid > old.bid then
    -- Samme kjøper hever budet (B-469): eieren får vite det
    perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:bud:%s', new.id, new.bid),
      format('Høyere oppkjøpsbud på %s', co),
      format('%s byr nå %s. Du kan legge inn motbud til %s.', bidder, public.chat_kr(new.bid),
             public.chat_when(new.closes_at)),
      'industri');
  elsif new.status = 'åpent' and coalesce(new.defense, 0) > coalesce(old.defense, 0) then
    -- Eieren legger inn motbud (B-469): kjøperen får vite det, uten beløpet (motbudet er ikke offentlig).
    -- Høyst ett varsel per 10 minutter, så mange små motbud på rad ikke gir mange varsler.
    perform public.push_enqueue(new.attacker_id, 'oppkjop',
      format('oppkjop:%s:motbud:%s', new.id, floor(extract(epoch from now()) / 600)::bigint),
      format('Eieren la inn motbud på %s', co),
      format('Åpne Industrien for å se hvordan det står. Du kan by mer til %s.', public.chat_when(new.closes_at)),
      'industri');
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.push_on_takeover() from public, anon, authenticated;
create or replace trigger push_on_takeover after insert or update of status, attacker_id, bid, defense on public.takeovers
  for each row execute function public.push_on_takeover();
