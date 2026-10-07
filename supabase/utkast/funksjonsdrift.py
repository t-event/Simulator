#!/usr/bin/env python3
"""
Databasen mot repoet (B-403, B-474): lager en spørring som bare leser, og som sammenligner sjekksummen av hver funksjon i
databasen med siste `create [or replace] function` i supabase/*.sql. Kjør fra roten av repoet:

    python3 supabase/utkast/funksjonsdrift.py > /tmp/drift.sql

og kjør innholdet med Supabase-connectoren (execute_sql). Svaret har to slags rader:

- `db_uten_treff`: kroppen i databasen er ikke lik noen kropp i repoet. I orden når funksjonen er endret senere med
  replace() på den levende kroppen (081 i en løkke; 082/084/087/090/091/095/097/111/114/115/118/119/120/121/123/124/125
  navngitt) – se etter en slik patch i en fil med høyere nummer.
- `repo_mangler_i_db`: funksjonen står i repoet, men ikke i databasen.

Normaliseringen er den samme på begge sider: kommentarer (`--` til linjeslutt) tas bort, og alt mellomrom blir ett.
"""
import glob
import hashlib
import os
import re

pat = re.compile(r'create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_0-9]+)"?\s*\(', re.I)
dollar = re.compile(r"\$([a-z_]*)\$", re.I)
last: dict[tuple[str, str], tuple[str, str]] = {}
for f in sorted(glob.glob("supabase/[0-9]*.sql")):
    s = open(f, encoding="utf-8").read()
    for m in pat.finditer(s):
        dq = dollar.search(s, m.end())
        if not dq:
            continue
        end = s.find(dq.group(0), dq.end())
        body = re.sub(r"\s+", " ", re.sub(r"--[^\n]*", "", s[dq.end() : end]))
        # Én rad per navn og signatur (overlaster), siste definisjon vinner
        sig = re.sub(r"\s+", " ", s[m.end() : s.find(")", m.end())]).strip()[:60]
        last[(m.group(1).lower(), sig)] = (hashlib.md5(body.encode()).hexdigest(), os.path.basename(f))

rows = ",".join(f"('{n}','{h}','{f}')" for (n, _), (h, f) in last.items())
print(f"with repo(name, h, f) as (values {rows}),")
print(
    """db as (select proname as name, md5(regexp_replace(regexp_replace(prosrc, '--[^\\n]*', '', 'g'), '\\s+', ' ', 'g')) as h
  from pg_proc where pronamespace = 'public'::regnamespace and prokind = 'f')
select 'db_uten_treff' as hva, d.name, (select string_agg(r.f, ',') from repo r where r.name = d.name) as filer
  from db d where not exists (select 1 from repo r where r.name = d.name and r.h = d.h)
union all
select 'repo_mangler_i_db', r.name, r.f from repo r where not exists (select 1 from db d where d.name = r.name)
order by 1, 2;"""
)
