-- Stålverket: skiftrapporten bruker ordene fra virkeligheten om oppkjøp (B-371): oppkjøpsbud og motbud, ikke angrep og
-- forsvar. Bare teksten er ny; når meldingene skrives, er som før (071).

create or replace function public.chat_on_takeover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co text := (select name from public.companies where id = new.company_id);
begin
  if tg_op = 'INSERT' then
    perform public.chat_event(format('%s har lagt inn et oppkjøpsbud på %s på %s. %s har 72 timer på seg til å legge inn et motbud.',
                                     public.chat_nick(new.attacker_id), lower(co), public.chat_kr(new.bid),
                                     public.chat_nick(new.owner_id)));
  elsif new.status is distinct from old.status then
    if new.status = 'overtatt' then
      perform public.chat_event(format('%s har kjøpt %s fra %s.', public.chat_nick(new.attacker_id), lower(co),
                                       public.chat_nick(new.owner_id)));
    elsif new.status = 'avverget' then
      perform public.chat_event(format('%s beholder %s – oppkjøpsbudet fra %s holdt ikke.', public.chat_nick(new.owner_id),
                                       lower(co), public.chat_nick(new.attacker_id)));
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
