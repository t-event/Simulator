# Plan: konto, lagring på nett, toppliste og konkurranse

Vedtatt i B-124 (2026-09-25). Dette er arbeidsplanen for å gjøre Stålverket til et spill man ikke blir ferdig
med: lagring på nett med konto, toppliste, sesonger med ligaer, felles hendelser, ventetid på de store tingene, og
konkurranse om kunder og skrap mellom spillerne. Fasene nederst er rekkefølgen vi bygger i.

## Mål

- Spilleren kan spille videre på en annen mobil, i Safari og fra hjemskjermen, uten å laste ned en fil.
- Ingen mister spillet sitt. Den lokale lagringen kobles til kontoen første gang man logger inn.
- Man kan sammenligne seg med andre, og hver sesong gir en ny grunn til å spille.
- Konkurransen skal være på pris og kvalitet, ikke sabotasje. Spillet skal fortsatt lære bort hvordan et stålverk
  fungerer, og en ny spiller skal kunne spille hele kampanjen uten å bry seg om konkurransen.
- Spillerne skal kunne spille hele tiden mens vi bygger dette.

## Svar på spørsmålene som kom opp

**Kan noen dele sikkerhetskopien og jukse?** Ja, med bare en overføringskode kunne man det. Derfor:

- Konto med e-post og passord. Kontoen er identiteten på topplista, én konto per spiller.
- En lagring som er koblet til en konto, merkes med konto-id. Fila fra «Last ned sikkerhetskopi» kan bare lastes inn
  på den samme kontoen. Fila fra en annen konto blir avvist.
- Serveren tar vare på tidslinja (spilldag, kasse, konsernverdi hver gang det lagres). Laster man inn en eldre kopi,
  ser serveren at spilldagen går bakover, og spillet mister plassen i pågående anbud og auksjoner. Man kan fortsatt
  bruke kopien til å redde et spill som gikk galt.
- Det som avgjør konkurransen (anbud, auksjoner, sesongresultat), avgjøres på serveren, ikke i appen.
- Sikkerhetskopien blir sjelden nødvendig når spillet ligger på nett, men vi beholder den.

Det som ikke går å stoppe helt: spillet kjører på mobilen, så en teknisk kyndig spiller kan redigere sin egen lagring.
Det vi gjør mot det står under «Juksesperre». Det er godt nok for et hobbyspill.

**Blir det for vanskelig for nye spillere med konkurranse?** Ikke hvis vi holder oss til dette:

- Kampanjen fra garasje til storverk er som i dag. Ingen må delta i konkurransen.
- Topplista er synlig fra start (det motiverer), men anbud og auksjoner åpner først på nivået Stålverk, samtidig med
  rammeavtalene. Da kjenner spilleren kontrakter, resepter og kapasitet.
- Ligaer etter nivå: garasjen møter aldri storverket.
- Man kan bare vinne noe ekstra. Ingen kan ta kontrakter, skrap eller penger fra deg. Forespørslene og spotmarkedet
  fortsetter som før for alle.
- Fagboka får et kapittel om anbud og auksjoner, og veiledningen forklarer det første anbudet.

**Ventetid.** Ekte ventetid kommer bare på de store tingene i konsernet og i konkurransen, ikke i kampanjen før det.
Tida varierer med hva man venter på (tabell under «Ventetid»). Klokka kommer fra serveren når man er logget inn, så
man kan ikke stille klokka på mobilen for å slippe å vente. Ingen kan kjøpe seg forbi ventetiden.

## Grunnlag: Supabase

Supabase er en gratis nettjeneste med database, innlogging og planlagte jobber. Spillet i nettleseren snakker direkte
med den. GitHub Pages publiserer fortsatt selve spillet som i dag.

- **Innlogging:** e-post og passord (Supabase Auth). Glemt passord via e-post.
- **Nøkler:** ingen nøkler i repoet (brukerens beskjed). Prosjektets URL og den offentlige nøkkelen
  («publishable») ligger i GitHub Secrets og legges inn når spillet bygges. Den offentlige nøkkelen er likevel synlig
  i det publiserte spillet (nettleseren må ha den), og det er greit: sikkerheten ligger i tilgangsreglene (RLS) i
  databasen. Den hemmelige nøkkelen («service_role») skal aldri sendes, committes eller brukes av spillet.
- **All serverlogikk som SQL i databasen:** tilgangsregler, sjekker og planlagte jobber (pg_cron) skrives som
  SQL-filer i `supabase/` i repoet. Brukeren limer dem inn i SQL-editoren i Supabase. Da trengs verken CLI eller
  hemmelige nøkler hos Claude.
- **Region:** EU.
- **Personvern:** vi lagrer e-post, kallenavn og det lagrede spillet. Innstillinger får en kort personverntekst og en
  knapp for å slette kontoen med alt innhold.
- **E-post:** Supabase sender bekreftelse og «glemt passord» selv, men gratisnivået sender bare noen få e-poster i
  timen. Det holder for testing. Får spillet mange spillere, kobler vi på en egen e-postleverandør (gratisnivå
  finnes). Det endrer ingenting i koden.
- **Plass:** et lagret spill er ca. 90 KB som JSON og ca. 23 KB pakket. Vi lagrer pakket, så gratisnivået (500 MB)
  holder til tusenvis av spillere.

### Tabeller (første utkast)

| Tabell | Innhold |
| --- | --- |
| `profiles` | konto-id, kallenavn (unikt), liga, opprettet, sperret |
| `saves` | konto-id, pakket spilltilstand, spilldag, appversjon, sist lagret |
| `snapshots` | konto-id, spilldag, kasse, konsernverdi, nivå, tidspunkt – tidslinja for toppliste og juksesperre |
| `config` | funksjonsbrytere og laveste appversjon – kan skru av en funksjon uten ny publisering |
| `seasons` | sesong, start, slutt |
| `season_results` | plassering, merker og fordel inn i neste sesong |
| `events` | felles hendelser: type, start, slutt, styrke |
| `tenders`, `tender_bids` | anbud fra storkunder og budene |
| `auctions`, `auction_bids` | skrapauksjoner og budene |

Alle tabeller har tilgangsregler: man leser og skriver bare sitt eget, unntatt det som er offentlig (toppliste,
sesonger, hendelser, åpne anbud og auksjoner).

## Slik utvikler vi uten at noen mister spillet

1. **Alt på nett er valgfritt.** Spillet virker som i dag uten konto og uten nett. Er nettet borte, spiller man
   videre lokalt, og spillet synker når nettet er tilbake.
2. **Lagringsformatet vokser bare.** Nye felt får standardverdi i `migrate()`. Ingen felt bytter navn eller mening.
3. **Databasen vokser bare.** Nye tabeller og kolonner, aldri omdøping. Gamle appversjoner virker mot den nye
   databasen. Serveren overser felt den ikke kjenner.
4. **Funksjonsbrytere i `config`.** Toppliste, sesonger, anbud og auksjoner kan skrus av fra databasen på ett minutt
   hvis noe går galt, uten ny publisering.
5. **Én fase per PR-serie.** Hver fase publiseres for seg, og hver kan rulles tilbake alene.
6. **Testspilleren kjører uten nett.** `balance.ts` og `npm test` bruker aldri Supabase. Ventetid i ekte tid
   simuleres med en klokke som følger spilltiden.
7. **Ny versjon i appen.** PWA-en varsler «Ny versjon, last på nytt» når publiseringen er ny, slik at alle får
   siste versjon.

## Fasene

### Fase 0 – grunnlag (1 økt)

- Supabase-prosjekt (brukeren), nøkler inn i `frontend/src/net/config.ts`.
- Mappen `supabase/` med `001_grunnlag.sql`: `profiles`, `saves`, `snapshots`, `config` og tilgangsregler.
- `frontend/src/net/` med klienten og `config`-lesing. Ingenting synlig for spilleren ennå.
- Regel i CLAUDE.md: aldri commit den hemmelige nøkkelen.

### Fase 1 – konto og lagring på nett (2–3 økter)

Spilleren ser: «Konto» under ⚙️ Innstillinger, med opprett konto, logg inn, glemt passord og logg ut. Et lite
skysymbol i toppen viser om spillet er lagret på nett.

- Første innlogging: den lokale lagringen lastes opp og merkes med konto-id. Spillet fortsetter uten avbrudd.
- Lagring på nett hvert minutt hvis noe har skjedd, og når appen legges bort.
- Logger man inn på en annen mobil: spillet fra nettet lastes ned. Finnes det et lokalt spill også, velger spilleren
  («Fortsett fra nettet, dag 140» eller «Fortsett herfra, dag 12»).
- Konflikt: den lagringen som har kommet lengst i spilltid, vinner. Ved tvil spør vi.
- Sikkerhetskopi som fil: som før, men bare på samme konto.
- Slett konto.
- Tester: opp- og nedlasting, konflikt, uten nett, gammel lagring uten konto-id.

### Fase 2 – toppliste (1–2 økter)

Spilleren ser: fanen «Toppliste» (under Verket, eller bak 🏆 i toppen) med kallenavn og plassering.

- Kallenavn velges ved opprettelse (ikke e-post, ikke krav om ekte navn).
- Lister: konsernverdi, raskest til storverk (spilldøgn), raskest til 10 mrd., beste kontrollrom-parti, høyeste
  omdømme. «Alle» og «denne sesongen».
- Serveren regner listene fra `snapshots`, appen sender ikke inn poeng selv.
- Juksesperre (under). Brukeren kan sperre en konto fra Supabase.

### Fase 3 – sesonger, ligaer og felles hendelser (2–3 økter)

Spilleren ser: «Sesong 1 – 18 dager igjen» øverst på topplista, ligaen sin, ukas hendelse på Marked.

- Sesong på 4 uker. Ved slutt: merker (vises ved kallenavnet), plassering i historikken, og en liten fordel inn i
  neste sesong (fagpoeng eller startkapital i nytt spill+). Spillet fortsetter, ingen nullstilles.
- Ligaer etter nivå: **Bronse** (støperi og stålverk), **Sølv** (storverk), **Gull** (konsern). Man rykker opp
  når man flytter.
- Felles hendelser som treffer alle samme uke: skrapmangel (skrap +20 %), strømkrise, eksportboom (pris +10 %),
  streik i transporten. Ligger i `events`, appen leser dem og legger dem på markedet. Uten nett: ingen hendelse.
- Fagboka: kapittel om konjunkturer og hvorfor stålprisen svinger.

### Fase 4 – ventetid i konsernet (1–2 økter)

Spilleren ser: «Bygges – ferdig om 3 t 40 min» på verket i konsernet, med et varsel når det er ferdig.

- Bare de store tingene, se tabellen. Tida starter når man betaler, og serveren gir tidspunktet.
- Uten nett eller konto: mobilens klokke. Det er greit, for et spill uten konto er ikke med i konkurransen.
- Testspilleren: klokka følger spilltiden, så balansen kan måles som før. Målet er at kampanjen til storverk går
  som i dag, og at konsernfasen strekker seg over noen virkelige dager.

### Fase 5 – anbud og skrapauksjoner (3–4 økter)

Spilleren ser: fanen «Anbud» under Salg og «Auksjon» under Marked, fra nivået Stålverk.

- **Anbud:** hver tredje dag legger en storkunde ut et anbud per liga («Brubygger: 8 000 t armering, leveres innen 20
  spilldøgn, krever omdømme 60»). Man byr en pris per tonn innen 48 timer. Laveste bud over kundens gulv vinner, og
  kontrakten dukker opp i vinnerens spill. De andre taper ingenting.
- **Skrapauksjon:** hver kveld auksjoneres et parti førsteklasses skrap per liga. Høyeste bud vinner og får skrapet
  i skrapgården til den prisen. Maks ett vunnet parti per spiller per dag, så ingen kan kjøpe alt.
- Serveren (pg_cron) legger ut og avgjør. Appen viser resultatet og legger vinsten inn i spillet.
- Budene sjekkes mot spillerens kasse og kapasitet i siste snapshot.
- Fagboka: kapittel om anbud, og veiledning ved første anbud.

### Senere (ikke bestemt)

- Felles prismarked: spotprisen påvirkes av hva alle spillerne selger denne uka.
- Merker og prestasjoner utenom sesongene.
- Varsler på mobilen når et anbud er avgjort eller et verk er ferdig bygget.

## Ventetid

| Det man venter på | Ekte tid | Hvorfor |
| --- | --- | --- |
| Kjøpe et stålverk (datterverk) | 4 timer | Et helt verk skal overtas |
| Kjøpe et storverk / bygge ut til storverk | 8 timer | Den største investeringen i spillet |
| Modernisering av et verk | 2 timer | Mindre jobb |
| Felles innkjøp / salgskontor | 1 time | Organisering, ikke bygging |
| Ansette salgsdirektør | 30 minutter | Rekruttering |
| Skrapauksjon | avgjøres hver kveld kl. 20 | Alle må rekke å by |
| Anbud fra storkunde | 48 timer å by, nytt hver tredje dag | Gir tid til å planlegge |
| Sesong | 4 uker | Lang nok til å komme fra garasje til konsern |

Alt før konsernet er som i dag. Ingenting koster penger for å gå fortere.

## Juksesperre

- Serveren avviser en snapshot der kassa eller konsernverdien vokser mer per spilldøgn enn det nivået kan tjene, med
  romslig margin (regnet ut fra testspilleren).
- Serveren avviser verdier som er umulige på nivået (for eksempel 5 mrd. i garasjen).
- Spilldag som går bakover, tar spillet ut av pågående anbud og auksjoner.
- Bud sjekkes mot siste snapshot.
- Sikkerhetskopi bare på egen konto.
- Brukeren kan sperre en konto og slette den fra topplista i Supabase.
- Vi oppdager mistenkelige kontoer med en enkel liste i Supabase: «raskeste vekst siste døgn».

## Det brukeren gjør

1. Opprett gratis konto på supabase.com og et prosjekt i EU.
2. Authentication → Providers → Email: slå på. La «Confirm email» stå på.
3. Send Claude prosjektets **URL** og den **offentlige** nøkkelen (anon/publishable). Aldri service_role.
4. Når Claude har skrevet SQL-filene: lim dem inn i SQL Editor i Supabase, én fil om gangen, i nummerrekkefølge.
   Claude sier fra hver gang det trengs.
5. Database → Extensions: slå på `pg_cron` (fase 5).

## Brukerens svar (2026-09-25)

- **Grupper på topplista:** ikke ennå. Én liste for alle.
- **Sesonger erstatter nytt spill+.** Når en ny sesong starter, starter alle et nytt spill fra garasjen. Den som var
  med i forrige sesong, får en pitteliten fordel (forslag: 5 % mer startkapital og 10 fagpoeng – ikke mer, så nye
  spillere har en sjanse). Spillet fra forrige sesong arkiveres med resultatet sitt. Det skal være lett for oss å
  starte en ny sesong: én ny rad i `seasons`, så gjør appen resten.
- **Storkunder som legger ut anbud** (generiske navn, som ellers i spillet). Forslag, ett anbud per liga:
  | Storkunde | Vil ha | Krever |
  | --- | --- | --- |
  | Brubyggeren | armeringsstål, store mengder | omdømme 50 |
  | Verftet | emner i kvalitetsstål | omdømme 60 |
  | Jernbanen | høykarbon (skinner) | omdømme 60, spektrometer |
  | Vindparken | konstruksjonsstål til tårn | omdømme 65 |
  | Boreplattformen | høyfast stål, små mengder, høy pris | omdømme 75, øseovn |
  | Bilfabrikken | renest mulig stål, lange rammeavtaler | omdømme 80, øseovn |
  Kundene byttes ut etter hvert som spilleren stiger i liga, så det alltid er noe å strekke seg etter.
- Supabase-prosjektet er opprettet. Nøklene ligger i GitHub Secrets (B-126).

## Status

- Fase 0 og 1 er bygget (B-125, B-126). Fase 2 (toppliste) er bygget (B-127). Fase 3 (sesonger, ligaer og felles
  hendelser) er bygget (B-129). Fase 4 er neste.
- **Slik starter du en ny sesong:** i SQL Editor: `select public.start_season('Sesong 2', 4);` (navn, antall uker).
  **Slik legger du ut en hendelse:** `select public.add_event('skrapmangel', 7);` (skrapmangel, stromkrise,
  eksportboom, importpress, transportstreik; antall dager). Claude kan gjøre begge deler gjennom connectoren.
