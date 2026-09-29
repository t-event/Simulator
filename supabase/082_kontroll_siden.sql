-- Stålverket: Kontrollen sier også når eieren tok over (B-370), så appen kan vise vernet de første dagene.
-- Bare et nytt felt i svaret fra company_control (`since`); poengene og summen er som før.

do $$
declare
  def text;
begin
  def := pg_get_functiondef('public.company_control'::regproc);
  if position('''since''' in def) > 0 then
    return;
  end if;
  def := replace(def, '''invested'', c.invested);', '''invested'', c.invested, ''since'', run_start);');
  if position('''since''' in def) = 0 then
    raise exception 'fant ikke stedet i company_control';
  end if;
  execute def;
end;
$$;
