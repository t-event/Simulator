-- Stålverket: ukekista går bare til topp 3 i hver liga (B-155). Kjørt som migrasjonen «ukekiste_topp3».
--
-- Brukeren: «Vi har ikke så mange spillere enda, så det bør være topp 3 som får ukeskiste.» Topp 3 får medalje og
-- kiste (100, 75 og 50 fagpoeng); plass 4–10 får ingenting. Ellers som i 016.

create or replace function public.finish_weeks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w date;
  cur date := public.week_start_of(now());
begin
  select coalesce(max(week_start) + 7, date '2026-09-21') into w from public.weekly_weeks;
  while w < cur loop
    insert into public.weekly_results (week_start, user_id, league, kind, plass, value, fp)
    select w, r.user_id, r.league, public.week_kind(w), r.plass, r.value,
      case r.plass when 1 then 100 when 2 then 75 else 50 end
    from (
      select s.user_id, s.league, s.value,
        (row_number() over (partition by s.league order by s.value desc, s.day asc))::int as plass
      from public.weekly_scores(w) s
      where s.value > 0
    ) r
    where r.plass <= 3
    on conflict do nothing;
    insert into public.weekly_weeks (week_start) values (w) on conflict do nothing;
    w := w + 7;
  end loop;
end;
$$;
revoke execute on function public.finish_weeks() from public, anon, authenticated;
