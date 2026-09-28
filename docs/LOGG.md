# Arbeidslogg

Nyeste økt øverst. Hver økt: hva brukeren ba om, hva som ble gjort, hva som
ble testet, og hva som gjenstår.

---

## Økt 175 – 2026-09-28: Realistiske titler, kort som står stille, innstillinger og «Hva er nytt»

**Brukeren ba om:** svar på om inntekt fra selskaper går til konsernkassa; tekst som ikke hopper i produksjonskortet,
under anleggsbildet og i «Produksjon nå»; ryddigere innstillinger og «Hva er nytt»; titler med realistiske mål.

**Gjort:** B-238. Titlene fra 25 mrd. til 5 000 mrd. (hele stålindustrien) med sammenligning, også på serveren (041);
faste rader og plasser i de tre kortene; innstillinger i grupper med knappevalg; endringsloggen per dag, med de eldste
lukket.

**Testet:** `npm test`, tsc, lint, balance og `--konsern` (exit 0), Playwright på 7 størrelser (ingen flytting over 8 s
med spillet i gang, ingen horisontal scrolling, knapper minst 44 px).

**Gjenstår:** veksten på toppen i sluttspillet (flere hundre mrd. per ekte døgn); tom tonn-liste denne uka (B-235);
UI-4d; reserven og kassegrensen; fase 2.

---

## Økt 174 – 2026-09-28: Anbudsvarsel, mesterskapspriser og ikoner overalt

**Brukeren ba om:** svar på om budgivere får vite hvem som vant, fagpoengpris etter verdi i mesterskapet, og Lucide-ikoner
i stedet for alle emojier.

**Gjort:** B-237. Varsel om anbudsresultat til den som bydde; mesterskapet priset etter verdi og viser kroner per døgn;
alle emojier byttet med ikoner, gamle lagringer ryddet, og en sjekk i `npm test`/CI mot nye.

**Testet:** `npm test` (nye tester i spillmotoren og nettlaget), tsc, lint, balance (exit 0), Playwright på 7 størrelser.

**Gjenstår:** tom tonn-liste denne uka (B-235); UI-4d; reserven og kassegrensen; fase 2.

---

## Økt 173 – 2026-09-28: Ikoner i fagboka

**Brukeren ba om:** færre emojier i fagboka.

**Gjort:** B-236. Alle emojier i boka byttet med Lucide-ikoner (kapitler, steg, tellere, stjerner, oppdrag).

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser (ingen emoji igjen i boka).

**Gjenstår:** tom tonn-liste denne uka (B-235); UI-4d; reserven og kassegrensen; fase 2.

---

## Økt 172 – 2026-09-28: Ukelista mot forrige uke, og fire kort ryddet

**Brukeren ba om:** anbefalingen for ukelista, bedre Produksjonen (Anlegg), Kjøp og utvid (Utvid), skraplageranbudet og
konsernkassa, og ikoner i stedet for emoji i utfordringer og prestasjoner.

**Gjort:** B-235. Migrasjon 040 (farten mot uka før, to ekte dager med lagring før uka). Produksjonen som rader,
Utvid med kjøpskort og vurdering, Industrien med status, anbudsboks og tydelig konsernkasse, Lucide-ikoner i Merker.

**Testet:** DO-blokk mot ekte tall (rullet tilbake), sikkerhetsråd, tsc, lint, `npm test`, balance (exit 0), Playwright
på 7 størrelser.

**Gjenstår:** tonn-uka 28.9.–5.10. får tom liste (ingen har to dager før uka); UI-4d; reserven og kassegrensen; fase 2.

---

## Økt 171 – 2026-09-28: Fagboka en bit om gangen

**Brukeren ba om:** at fagboka blir mindre tekstvegg, mer intuitiv og morsommere.

**Gjort:** B-234. Innhold med fremdrift, «Neste»-knapp og temaer; kapitler med «Kort fortalt» og én side om gangen;
quiz ett spørsmål om gangen med svar med én gang og stjerner. Svarene lagres underveis (`quizPartial`), så det er fortsatt
ett forsøk. Sesongkapitlet rettet.

**Testet:** tsc, lint, `npm test` (to nye tester), balance (exit 0), Playwright på 7 størrelser (les → quiz → resultat
→ innhold).

**Gjenstår:** svar fra brukeren på ukens «Mer stål enn før»; UI-4d; reserven og kassegrensen; fase 2 videre.

---

## Økt 170 – 2026-09-28: Vikarer, vedlikehold, navigasjon og avbrutte avtaler

**Brukeren ba om:** ti punkter – vikarer som ikke dekket alle, Marked/Salg/Folk inn i Verket (spørsmål), loggen to
steder, bedre vedlikeholdskort, «Nå» i utstyrsarkene, Mål-knappen som aktiv, kortere «Dine verk», egen fane for
konsernkassa (spørsmål), avbryte rammeavtaler, og lik navigasjon i alle hovedmenyene.

**Gjort:** B-233. Skiftlederen forlenger vikarene med én gang; loggen ut av Økonomi; nytt vedlikeholdskort; «Nå»-linje
i utstyrsarkene; Mål-knappen aktiv; verkene som sammenleggbare rader på mobil; avbryt rammeavtale med bot og omdømme;
hver hovedmeny husker underfanen, nytt trykk går til første. Svar: Marked/Salg/Folk blir hovedmenyer, ingen egen fane
for konsernkassa ennå.

**Testet:** tsc, lint, `npm test` (to nye tester), balance (exit 0), Playwright på 7 størrelser (navigasjon, arkene,
vedlikehold, avtaler, Mål, verkene).

**Gjenstår:** svar fra brukeren på ukens «Mer stål enn før» (forrige ukes fart som grunnlag); UI-4d; reserven og
kassegrensen; fase 2 videre.

---

## Økt 169 – 2026-09-28: Mange flere utfordringer og prestasjoner

**Brukeren ba om:** mange flere utfordringer og prestasjoner, og bedre, mer intuitive kort.

**Gjort:** B-232. Utfordringer i 19 serier med 74 trinn, prestasjoner i 25 serier med 99 merker. Nye kort:
nærmeste først med fremdrift og belønning, trinnprikker, seriene som ruter per gruppe med detaljer ved trykk.

**Testet:** tsc, lint, `npm test` (to nye tester), balance (exit-kode), Playwright på 7 størrelser, effekten på et
ekte spill.

**Gjenstår:** UI-4d; reserven og kassegrensen; fase 2 videre.

---

## Økt 168 – 2026-09-28: Produksjonslinja i én rad

**Brukeren ba om:** at anleggskortet på Oversikt ikke har en rute alene på egen rad, og blir mer intuitivt.

**Gjort:** B-231. Fire ruter i én rad (Skrap › Ovner › Støping › Lager); ovnene samlet i én rute med en stripe per
ovn og én status. 249 → 145 px på mobil.

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser og verksted-nivå.

**Gjenstår:** UI-4d; reserven og kassegrensen; fase 2 videre.

---

## Økt 167 – 2026-09-28: «Produksjon nå» kortere

**Brukeren ba om:** at kortet «Produksjon nå» blir kort og intuitivt.

**Gjort:** B-230. Én linje per ovn (like ovner slått sammen), resepten varsles bare når den ikke holder, én handling
(«Velg selv» / nedtrekk / «La ordrekøen velge igjen»), kontrollrommet, og resten bak «Innstillinger og forklaring».
1 077 → 314 px på 320 px.

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser, «Velg selv» og tidlig spill.

**Gjenstår:** UI-4d; reserven og kassegrensen; fase 2 videre.

---

## Økt 166 – 2026-09-28: Salgsdirektøren til Folk

**Brukeren ba om:** salgsdirektøren ut av Konsern, sammen med de andre ansatte.

**Gjort:** B-229. Salgsdirektøren ansettes under Folk → Ansett og styres under Folk → Ansatte. Konsern har tre faner
(Oversikt, Utvid, Industrien).

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser.

**Gjenstår:** UI-4d; reserven og kassegrensen; fase 2 videre (slagghåndtering, mekanisk verksted).

---

## Økt 165 – 2026-09-28: Leveransene kom fortsatt for sent

**Brukeren ba om:** skjermbilde av rådgiveren «leveransene kommer for sent» igjen, dag 1588.

**Gjort:** B-228. Hentet spillet fra serveren og kjørte det videre i motoren. Valseverket valset feil kvalitet og tok
emner emneordrene ventet på; ovnene fôret ikke valseverket jevnt; kontrakter ble regnet som dekket av andres partier.
Ny lagerplan, jevn fôring av valseverket og strammere margin for salgsdirektøren. Sene kontrakter 10,8 → 3,4 per 30
døgn i samme spill.

**Testet:** tsc, lint, `npm test` (to nye tester som feiler med gammel kode), balance (exit-kode), simulering av spillet
med 6–8 frø.

**Gjenstår:** kvalitetsbyttene i støpingen koster fortsatt tid (sekvenser); UI-4d; reserven og kassegrensen.

---

## Økt 164 – 2026-09-28: Industrien rundt verket

**Brukeren ba om:** at skraplageret ikke skal være en egen side i Konsern, men settes opp etter planen videre.

**Gjort:** B-227. Konsern-fanene er Oversikt, Utvid, Industrien og Ledelse. Industrien har skraplageret som første
selskap og konsernkassa som eget kort (plass til slagghåndtering, mekanisk verksted, Kontroll og overtakelser). Ledelse
har salgsdirektøren (verksjefene kommer der i fase 5).

**Testet:** tsc, lint, `npm test`, balance (exit-kode), Playwright på 7 størrelser med falsk tjeneste (med og uten konto).

**Gjenstår:** fase 2 videre (slagghåndtering, mekanisk verksted) og Industrimakt; UI-4d; reserven og kassegrensen.

---

## Økt 163 – 2026-09-28: Konsern som egen hovedside

**Brukeren ba om:** Konsern som egen hovedside med underfaner som Verket, og at anbudet på skraplageret ikke skal ligge
skjult.

**Gjort:** B-226. Konsern i menyen (mobil og PC) med underfanene Oversikt, Utvid, Skraplager og Direktør. Åpent anbud
gir «!» på Konsern i menyen, merket «Anbud» på fanen og en beskjed på Oversikt. Verket har fire underfaner igjen.

**Testet:** tsc, lint, `npm test`, balance (exit-kode), Playwright på 7 størrelser med falsk tjeneste (med og uten
konto).

**Gjenstår:** UI-4d (polering og animasjon, anleggsbildet per nivå); reserven og kassegrensen; Google/Apple senere.

---

## Økt 162 – 2026-09-28: UI-4c Arkene og de minste skjermene

**Brukeren ba om:** «Fortsett».

**Gjort:** B-225. Felles `SheetHead` (fast topp, lukk 44 px) i alle ark; varselfanene i to rader på 320 px. UI.md:
UI-4c bygget.

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser (fem ark: fast topp, lukk 44 px, ingen scrolling eller
avkorting).

**Gjenstår:** UI-4d (polering og animasjon, anleggsbildet per nivå); reserven og kassegrensen; Google/Apple senere.

---

## Økt 161 – 2026-09-27: UI-4b Topplista og Hall of Fame

**Brukeren ba om:** «Fortsett».

**Gjort:** B-224. Topplista med ikonknapper i toppen, sesong/Hall of Fame som valg med én forklarende linje, din plass
øverst, lasteskisse, Callout for oppfordringer, forklaringen bak «Slik virker lista». UI.md: UI-4b bygget.

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser uten konto og 3 med konto (falsk tjeneste).

**Gjenstår:** UI-4c (øvrige ark og små skjermer), UI-4d (polering, anleggsbildet per nivå); reserven og kassegrensen;
Google/Apple senere.

---

## Økt 160 – 2026-09-27: «Hva skjedde med planleggerne mine?»

**Brukeren ba om:** forklaring på rådgiverkortet som tilbød en innleid planlegger.

**Gjort:** B-223. Planleggerne var der; armeringsordrene ble for sene fordi alle emnene var holdt av for emneordrene
(følge av B-217), så valseverket sto. Emner holdes nå bare av for emneordrene foran den første armeringsordren.
Rådgiveren tilbyr ikke innleid planlegger når verket har egne.

**Testet:** lagringen spilt seks døgn fram (armering leveres igjen), ny test, tsc, lint, `npm test`, `balance.ts` (exit 0).

**Gjenstår:** UI-4b, UI-4c, UI-4d; reserven og kassegrensen; Google/Apple senere.

---

## Økt 159 – 2026-09-27: Pause på Salg

**Brukeren ba om (fra en spiller):** spillet skal stå på pause mens Salg er åpen, til man går ut eller starter tida selv.

**Gjort:** B-222. Pause når Salg åpnes, samme fart igjen når Salg lukkes; startes tida på Salg, blir den stående.
Forklaring øverst på Salg. Innstilling under ⚙️ (på som standard, `pauseOnSales` i `migrate()`).

**Testet:** tsc, lint, `npm test`, Playwright på 320, 390 og 1 920 px (3× → pause på Salg → 3× på Verket; 1× startet på
Salg → 1× etterpå; ingen horisontal scrolling).

**Gjenstår:** UI-4b, UI-4c, UI-4d; reserven og kassegrensen; Google/Apple senere.

---

## Økt 158 – 2026-09-27: Sesonger uten sluttdato

**Brukeren ba om:** ingen sluttdato noen plass; ny sesong skal gjøres manuelt.

**Gjort:** B-221. Migrasjon 039: `ends_at` tom mens sesongen pågår (Sesong 1 har ingen sluttdato lenger), ingen
automatisk neste sesong, `end_season()` og `start_season(navn, vri)` for administrator, sesongstigen teller ukepremiene
uten sluttdato. Appen: `ends_at` kan være null, `daysLeft` fjernet. PLAN-NETT og CLAUDE.md oppdatert.

**Testet:** `season_status()` og `current_season_id()` mot databasen, `end_season`/`start_season` i en transaksjon som
ble rullet tilbake, `get_advisors` (ingen nye råd), tsc, lint, `npm test`.

**Gjenstår:** UI-4b, UI-4c, UI-4d; reserven og kassegrensen; Google/Apple senere.

---

## Økt 157 – 2026-09-27: Storverk-kortet og sesongnedtellingen

**Brukeren ba om:** Storverk-kortet med sluttmål på Verket gir ikke mening lenger; topplista viser dager igjen av
sesongen, men det har vi ikke lenger.

**Gjort:** B-220. Før konsernet: «Neste steg: konsernet». Etter: bare «Neste store steg» når det finnes, ellers intet
kort (sluttmålet står på Konsern). Sesonglinja, startskjermen og «bli med»-beskjeden uten antall dager.

**Testet:** tsc, lint, `npm test`, Playwright på 320, 390 og 1 920 px med og uten konsern (riktig kort, ingen
horisontal scrolling, «Grunnleggeræraen · Sesong 1 pågår»).

**Gjenstår:** UI-4b, UI-4c, UI-4d; reserven og kassegrensen; Google/Apple senere; om Sesong 1 skal beholde sluttdatoen
2027-03-25 i databasen (avgjort i B-221: nei).

---

## Økt 156 – 2026-09-27: Holdeknappen, skrapvarselet og Granes Hall of Fame

**Brukeren ba om:** mobilen skal ikke prøve å kopiere tekst når man holder knappen i kontrollrommet; Granes Hall of Fame
skal være ca. 8 500 mrd. (ikke i sesongen); «skrap mangler» kommer ofte selv med planlegger.

**Gjort:** B-219. Langt trykk i kontrollrommet stoppes (touchstart/selectstart/contextmenu + CSS på alt). Nytt
`scrapAlert`: varsel bare når neste charge står fast, eller uten planlegger for typer som kan kjøpes. Granes
rekordrad lagt tilbake (038), spillet ikke rørt.

**Testet:** tsc, lint, `npm test` (ny test for skrapvarselet), `balance.ts` (exit 0), Playwright iPhone 320/390
(touchstart og selectstart stoppes, knappen virker), `leaderboard('verdi')`: Grane nr. 1 med 8 563 mrd.

**Gjenstår:** UI-4b, UI-4c, UI-4d; reserven og kassegrensen; Google/Apple senere.

---

## Økt 155 – 2026-09-27: Landemerker på Mål, og de går ikke ut

**Brukeren ba om:** landemerkekortet sammen med dagens oppdrag; landemerkekontrakten skal ikke kunne gå ut.

**Gjort:** B-218. Kortet står på Mål → I dag under dagens oppdrag (ikke lenger på Oversikt). Landemerker har ingen
svarfrist og ingen leveringsfrist, trekkes ikke ved bytte av vare, og Salg sier «ingen frist». Landemerker i armering
får igjen størrelse etter valseverket (følge av B-217).

**Testet:** tsc, lint, `npm test` (ny test), `balance.ts` (exit 0), Playwright på de 7 størrelsene (Mål og Salg: ingen
horisontal scrolling, ingen avkortet tekst, lenken til Salg virker).

**Gjenstår:** eierens godkjenning av Granes rekorder (B-217); UI-4b, UI-4c, UI-4d; reserven og kassegrensen;
Google/Apple senere.

---

## Økt 154 – 2026-09-27: Salgsdirektøren og rammeavtalene, Verket på PC, Grane på Hall of Fame

**Brukeren ba om:** salgsdirektøren signerer ikke nye rammeavtaler; på PC går Konsern → Marked → Verket tilbake til
Konsern; Grane mistet plassen på Hall of Fame.

**Gjort:** B-217. Døgnproduksjonen ble kuttet til valseverket (en firedel av det storverkene støper); nå teller emnene
med, og armering sjekkes mot valseverket for seg (`rolledDailyT`, `productCapT`, `rollingNeedDays`). Verket i
sidemenyen på PC åpner Oversikt når underfanen var Konsern. Grane: den gamle kontoen ble slettet med «Slett konto» og en
ny laget 22.05; rekordene kan legges tilbake (dry-run i B-217), men venter på eierens godkjenning.

**Testet:** tsc, lint, `npm test` (ny test for valseverket), `balance.ts` (exit 0), directorHour på en ekte lagring
(New Guy: avtalen signeres), Playwright på 1 366 px før/etter (Konsern → Marked → Verket gir Oversikt).

**Gjenstår:** eierens godkjenning av Granes rekorder (gjort i B-219); UI-4b (toppliste/Hall of Fame), UI-4c, UI-4d; reserven og
kassegrensen; Google/Apple senere.

---

## Økt 153 – 2026-09-27: UI-4a Kontrollrommet

**Brukeren ba om:** «Fortsett» (etter at Figen var fornøyd med forklaringen; utbyttet står).

**Gjort:** B-216. Ikoner i stedet for emoji i kontrollrommet (tre nye: `wind`, `droplet`, `rake`), holdeknappen nederst
på mobil, ovn til venstre og styring til høyre på PC, resultatet i to kolonner. Seiersskjermen venter til chargen er
ferdig.

**Testet:** tsc, lint, `npm test`, Playwright på 7 størrelser og gjennomspilling av alle rundene (mobil og PC).

**Gjenstår:** UI-4b (toppliste/Hall of Fame), UI-4c, UI-4d; reserven og kassegrensen; Google/Apple senere.

---

## Økt 152 – 2026-09-27: Figens verk «går ofte i minus»

**Brukeren ba om:** Figen liker ikke økonomien fordi verket ofte går i minus.

**Gjort:** B-215. Gikk gjennom Figens 120 siste døgn: alt samlet i pluss hvert døgn; utbyttet halvert av B-209;
hjemmeverket i minus 10 døgn (dag 1 430–1 468) på grunn av skrapkjøp før B-208 virket, ingen etter. Økonomi-siden
viser snittet først, gult i stedet for rødt og én forklarende linje når et enkelt døgn er i minus.

**Testet:** tsc, lint, `npm test`, Playwright (320, 390, PC).

**Gjenstår:** eierens valg om utbyttet (se B-215); resten som i økt 151.

---

## Økt 151 – 2026-09-27: Topplista for seg, Mål-knapp og brukernavn ved ny konto

**Brukeren ba om:** topplisteknappen skal ikke vise I dag/uke/prestasjoner; brukernavn når man lager konto, og da med
på topplista; gjester er slått på i Supabase.

**Gjort:** B-214. Pokalen åpner topplista som ark igjen, Mål har egen knapp (blinkskive, prikk når noe kan hentes) og
tre faner. Brukernavn i skjemaet for ny konto, sjekket mot `nickname_available` (migrasjon 037), satt etter
bekreftelsen. RLS gjennomgått etter at gjester ble slått på.

**Testet:** nettest, `npm test`, tsc, lint, build, Playwright (7 størrelser og ny konto på mobil og PC).

**Gjenstår:** følge med på at gjester dukker opp i `auth.users` (0 da dette ble skrevet); Google/Apple senere; reserven
og kassegrensen; UI-4a–d.

---

## Økt 150 – 2026-09-27: Rettingen av Granes spill

**Brukeren ba om:** «Gjør rettingen» (økonomireformen for Grane, dry-run i B-211).

**Gjort:** B-213. Fersk dry-run (8 541,13 mrd. → 11,29 mrd.), deretter `036_retting_grane.sql`: kasse, reserve,
`serverEdit` 1, tidslinja etter reformen merket, rekorden for konsernverdi tilbake til før reformen. Sikkerhetskopi.

**Testet:** kontrollen i blokka; spørring etterpå (kasse 11,29 mrd., reserve null, `serverEdit` 1, 0 umerkede tall).

**Gjenstår:** se økt 149.

---

## Økt 149 – 2026-09-27: Gjestekonto, «Det går du glipp av», flagget spiller og emojier

**Brukeren ba om:** emojier i Dagens oppdrag; flaggede spillere / noen mangler på topplista; automatisk gjestekonto
som ikke får gjøre noe før man oppretter konto, og vise hva man går glipp av; Google/Apple senere.

**Gjort:** B-212. Migrasjon 035: `guest_gate` (pre-request) slipper gjester bare til lagringen, overtakelse av gjest
(`guest_handover`/`adopt_guest`), gjester ute av aktive spillere og skraplagerinntekt, og taket per nivå i juksesperren
bare for første tall. Flagget på enzo fjernet (feilflagg). `net/guest.ts`, `restAs`, `signInAnonymously`, kortet
«Det går du glipp av» (`ui/MissingOut.tsx`), ikoner i stedet for emojier på Mål, kortere fanenavn.

**Testet:** SQL i DO-blokker (sperren, overtakelsen), lagringene til spillerne gikk som før etter migrasjonen,
`npm test` med to nye nettester, tsc, lint, build, Playwright på Mål (7 størrelser).

**Gjenstår:** eieren må slå på «Allow anonymous sign-ins» i Supabase; godkjenning av rettingen av Granes spill (B-211);
Google/Apple senere; rydde gamle gjester når det blir mange; reserven og kassegrensen; UI-4a–d.

---

## Økt 148 – 2026-09-27: Landemerker, Mål-side, økonomireformen og vikarer

**Brukeren ba om:** landemerker blir ikke laget med salgsdirektør; mål og belønninger for gjemt på Verket; en spiller
(Grane) har fortsatt 8 500 mrd. etter reformen; bryter for om skiftlederen skal leie vikarer for alle som er borte.

**Gjort:** B-211. Landemerker først i køen og hos planleggeren, salgsdirektøren holder av plass. Ny side Mål
(`ui/Goals.tsx`) bak pokalen, lenke på Oversikt, i sidemenyen på PC. Reformen: Granes spill ble overskrevet av en enhet
med det gamle spillet; migrasjon 034 (`serverEdit`-vern i `save_game`) og appen tar serverens spill. Dry-run for å rette
Granes spill er gjort, venter på eierens godkjenning. Bryter `leaderTemps` på Folk → Fravær. B-210 rettet (feil spiller).

**Testet:** `npm test` (ny spilltest og nettest), balanse exit 0 (storverk 147, nybegynner 153,5), tsc, lint, build,
Playwright på Mål-siden (7 størrelser, 320 px), rådgiverne i Supabase.

**Gjenstår:** eierens godkjenning av rettingen av Granes spill; eierens valg om kontoer (FORSLAG.md); reserven og
kassegrensen; UI-4a–d.

---

## Økt 147 – 2026-09-27: Tilbakemeldinger fra spillerne (åtte punkter)

**Brukeren ba om:** anbudet for skjult (vis hvem som har bydd), operatør til skiftleder via lederutvikling,
salgsdirektøren vanskelig å finne, «Følg ordrekøen» forvirrer, anbefalt skiftleder kommer ikke opp, samme kort mange
ganger (kobbertyveri), økonomireformen og én spiller, og hva vi gjør med spillere uten konto.

**Gjort:** B-210. Migrasjon 033 (budgivere i `world_status`), lederutvikling (60 døgn, dyr), salgsdirektør på Salg og
Folk → Ansett, forklaring og «Velg selv» ved kvalitetsvalget, søkere til anbefalte roller og «Ansett»-knapp i
anbefalingen, 20 minutter ekte tid mellom like kort og kameraer som varig løsning, `game/clock.ts`. Økonomireformen: sjekket
– spilleren var under gulvet da den ble kjørt, ingen data endret. Kontoer: anbefaling i FORSLAG.md.

**Testet:** `npm test` (ny spilltest og nettest), balanse exit 0 (nybegynner ca. 7–10 døgn senere, innenfor målet),
tsc, lint, build, Playwright på Folk og Salg (7 størrelser), rådgiverne i Supabase etter migrasjonen.

**Gjenstår:** eierens valg om kontoer (FORSLAG.md); reserven og kassegrensen; UI-4a–d.

---

## Økt 146 – 2026-09-27: Utbyttet – byggetid i ekte tid, trim og flaggskip

**Brukeren ba om:** «Gå for din anbefaling» (om utbyttet, økt 144).

**Gjort:** B-209. Bygging, utbygging og modernisering i konsernet tar ekte timer (2/6/12 t for nye verk, 6 t utbygging,
4 t per trinn), ett prosjekt per verk, ferdig også på pause. Trim: kompleks 60 mill./døgn og 3,6 mrd., keepShare 0,3,
upstreamDecay 0,1. Flaggskipet: inntil +20 % utbytte etter omdømme og kvalitet hjemme. Konsern-siden viser prosjekter med
nedtelling, byggetid på knappene og flaggskipet i nøkkeltallene. Testspilleren har en ekte klokke (3×).

**Testet:** `npm test` (ny test B-209), balanse exit 0, `--konsern`, tsc, lint, build, Playwright med prosjekter (7
størrelser).

**Gjenstår:** hva den bundne reserven blir og om kassegrensen skal bort; UI-4a–d.

---

## Økt 145 – 2026-09-27: Returskrapet hopet seg opp, og planleggeren kom for sent

**Brukeren ba om:** planleggeren er dårlig til å kjøpe inn etter resepten, stadige varsler om tomt for skrap, og
returskrapet samler seg opp på lageret.

**Gjort:** Lest brukerens spill på serveren (bare lest): 73 000 t returskrap, reseptene brukte 0 % retur. B-208:
skrapklasseren bytter inn eget returskrap (inntil 25 %, bare der det er minst like rent, og ikke mer karbon i
induksjonsovn), og planleggeren selger det som ikke trengs når lageret er over 90 % fullt. Rettet at testfila ikke talte
med testene etter oppsummeringen.

**Testet:** simulering av et verk som brukerens før/etter, `npm test`, balanse (exit 0), tsc, lint, build.

**Gjenstår:** brukerens valg om utbyttet; UI-4a–d.

---

## Økt 144 – 2026-09-27: Plass til de anbefalte rollene på storverket

**Brukeren ba om:** 1) «Utbyttet er vel kanskje litt for ekstremt? Skal vi balansere inntektene litt?» 2) Med fem skiftlag
var det ikke plass til å ansette de anbefalte rollene.

**Gjort:** 1) Undersøkt og svart med tall og anbefaling (fart i ekte tid for bygging og modernisering, trim av utbyttet,
hjemmeverket som flaggskip) – venter på brukerens valg, ingenting endret. 2) B-207: taket på storverket 220 → 240, og en
test som sjekker at fem skiftlag og alle anbefalte roller får plass på det største mulige storverket.

**Testet:** tsc, lint, `npm test` (ny test feiler med 220), balanse (exit 0), build. Publiseringen av #148–#151 er grønn.

**Gjenstår:** brukerens valg om utbyttet; UI-4a–d.

---

## Økt 143 – 2026-09-27: UI-3d – Konsern

**Brukeren ba om:** «Fortsett» (neste steg i UI-planen).

**Gjort:** PR #150 (UI-3c) merget. B-206: Konsern som hovedkontor. PC: uten anleggsbildet, nøkkeltall og neste steg
øverst, verkene som tabell med «Mer»-rad, kjøp til venstre og Skraplageret og salgsdirektøren til høyre. Mobil: samme
rekkefølge, bare verket rådet gjelder, har blå knapp. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter, tomt konsern, «Mer»-raden, 7 størrelser.

**Gjenstår:** UI-4a–d (kontrollrommet, topplista, andre ark og små skjermer, finpuss), senere logo og appikon.

---

## Økt 142 – 2026-09-27: UI-3c – Forskning

**Brukeren ba om:** «Fortsett» (neste steg i UI-planen).

**Gjort:** B-205. Forskning i to kolonner på PC: forskningen til venstre (klare kort i rutenett, fremdriftslinje mot prisen
for det som mangler fagpoeng, mesterskap), fagpoengene til høyre (stort tall, slik får du fagpoeng, samarbeidet, kommer
senere, forsket fram). Bok-ikon i stedet for emoji. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter og de 7 størrelsene.

**Gjenstår:** UI-3d (Konsern), deretter UI-4a–d.

---

## Økt 141 – 2026-09-27: UI-3b – Folk

**Brukeren ba om:** «Merge. Bare merge uten å spørre fremover. Fortsett.»

**Gjort:** PR #148 (UI-3a) merget. B-204: Folk med felles underfaner, Skift i to kolonner på PC med bemanningstabellen
alltid synlig, Ferdighet-kolonne, rollegruppene i to kolonner, 44 px knapper; tabellen ga sideveis scrolling på 320 px –
rettet. Regelen i CLAUDE.md: også UI-faser merges uten å vente. `servers.sh` i kladdemappa starter testserverne.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter og de 7 størrelsene.

**Gjenstår:** UI-3c (Forskning).

---

## Økt 140 – 2026-09-27: UI-3a – Økonomi

**Brukeren ba om:** «Fortsett» (neste steg i UI-planen).

**Gjort:** B-203. Verket → Økonomi: resultatet i går stort øverst, snitt 7 døgn og i dag hittil; stolpegraf over
resultatet per døgn (inntil 30, uteliggere kappet med bruddmerke, verktøytips); inntekter og kostnader i går per post
(`ui/Finance.tsx`, `ui/financeNames.ts`); banken og loggen i høyrekolonnen på PC. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 7 størrelser.

**Gjenstår:** eierens svar på skjermbildene. Deretter UI-3b (Folk).

---

## Økt 139 – 2026-09-27: Varsel på Marked og Folk, og hva varsellinja viser

**Brukeren ba om:** «Merge» av PR #146 (varsellinja nederst), og: varsel på Marked når skrap mangler o.l., varsel på Folk
når noe må tas tak i, og at varsellinja viser varselet, ikke bare at det finnes et.

**Gjort:** PR #145 publisert (grønt), #146 merget. B-202: rådene flyttet til `ui/hints.ts`; «!» på Marked/Folk når et råd
peker dit (ikke når planleggeren ordner det), trykk åpner riktig underfane; varsellinja viser det nyeste usette varselet.
(Underveis ble GameApp.tsx tømt av et skript som åpnet fila for skriving før den ble lest – hentet tilbake fra forrige
commit og endringene lagt inn på nytt.)

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright på 390 og 1 366 px.

**Gjenstår:** UI-3a (Økonomi).

---

## Økt 138 – 2026-09-27: Varsellinja nederst på mobil

**Brukeren ba om:** «Ja til varsellinja og merge» (PR #145 med B-199/B-200).

**Gjort:** PR #145 merget. B-201: på mobil står varsellinja med 🏆 som en fast rad rett over menyen nederst; toppfeltet
71 px på iPhone (fra 117). PC uendret. Veiledningen legger seg over raden (`--notice-h`). FORSLAG, UI.md, B-116, CLAUDE.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright på 7 størrelser (før/etter), varsellista og
topplista fra raden nederst, veiledningen over raden.

**Gjenstår:** eierens svar på skjermbildene. Deretter UI-3a (Økonomi).

---

## Økt 137 – 2026-09-27: Resepten flyttes til Verket, og tomrommet på PC

**Brukeren ba om:** «Merge» av UI-2d (PR #144), og: «Resept bør ikke ligge under marked.»

**Gjort:** PR #144 merget og publisert (grønt). B-199: Resept er en egen underfane på Verket (Oversikt · Anlegg · Resept
· Økonomi · Konsern), oransje når resepten ikke holder. Marked har Skrap, Strøm og Priser. Alle tekster og lenker som
viste til «Marked → Resept», viser til «Verket → Resept». Tettere Verket-faner på ≤ 360 px. README, UI.md, B-051.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright på 7 størrelser (fanene får plass, ingen
vannrett scrolling), oransje fane og rådet som åpner resepten.

Deretter, etter brukerens melding om tomrom på PC: B-200 – høyrekolonnen på Verket går over to rader, så Mål og de
andre kortene følger rett under anleggsbildet (Oversikt, Anlegg, Økonomi). Målt på 4 PC-bredder: største hull 12 px.

**Gjenstår:** eierens svar på skjermbildene og på prøven av varsellinja. Deretter UI-3a (Økonomi).

---

## Økt 136 – 2026-09-27: UI-2d – Salg

**Brukeren ba om:** «Merge» av UI-2c (PR #143) og en anbefaling for varsellinja på mobil; deretter «Fortsett».

**Gjort:** PR #143 merget. Anbefalt å flytte varsellinja ned over menyen (alternativ 3), som en egen prøve med
skjermbilder – venter på «Ja». B-198: forespørsler som liste + detaljer på PC, kortet med tydelig kunde/verdi og større
Signer, ordrekøen med statusmerker og ikoner, underfaner som ikke kutter navnet på 320 px. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 4 størrelser (alle fanene) og 7 for
vannrett scrolling, avkortet tekst og knappehøyde; valg og signering i lista på PC.

**Gjenstår:** eierens svar på skjermbildene og på prøven av varsellinja. Deretter UI-3a (Økonomi).

---

## Økt 135 – 2026-09-27: UI-2c – Marked

**Brukeren ba om:** «Fortsett» etter «Merge» av UI-2b (PR #142).

**Gjort:** B-197. «Kjøp skrap» som tabell på PC (fra 1 000 px) og kort på mobil med de samme delene; trend og lås med
ikoner; de andre fanene på Marked høyst 960 px brede på PC. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 4 størrelser (alle fire fanene) og
7 for vannrett scrolling.

**Gjenstår:** eierens svar på skjermbildene og varsellinja på mobil (FORSLAG). Deretter UI-2d (Salg).

---

## Økt 134 – 2026-09-27: UI-2b – Anlegg

**Brukeren ba om:** «Fortsett» etter UI-2a (tolket som klarsignal: PR #141 merget), så neste steg.

**Gjort:** B-196. Statusmerker (`StatusBadge`) på hvert sted i «Produksjonen», og produksjonsflyten over hele bredden
på PC. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 4 størrelser og 7 for vannrett
scrolling.

**Gjenstår:** eierens svar på skjermbildene og varsellinja på mobil (FORSLAG). Deretter UI-2c (Marked).

---

## Økt 133 – 2026-09-27: UI-2a – Oversikt

**Brukeren ba om:** «Fortsett» (neste steg i UI-planen).

**Gjort:** B-195. Det første rådet som rolig flate med ikon og pil, høyst to råd til og resten bak «Flere råd»;
statusspråket (`StatusLine`) i rutene i produksjonslinja; boblene etter reglene i UI.md 7 (maks 3, faste baner,
sammenslått, stille linje med redusert bevegelse); pynt-knappen med ikon. Endringsloggen, UI.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 4 størrelser (stålverk og storverk)
og 7 størrelser for vannrett scrolling; boblene på 10× og med redusert bevegelse.

**Gjenstår:** eierens svar på skjermbildene og varsellinja på mobil (FORSLAG). Deretter UI-2b (Anlegg).

---

## Økt 132 – 2026-09-27: H4WK3N5 borte fra topplista

**Brukeren spurte:** hvorfor H4WK3N5 ble borte fra topplista. Etter svaret: «Begge deler» – rett sperren og fjern flagget.

**Funnet:** juksesperren flagget kontoen kl. 12.20 for vekst i konsernverdien (+30,3 mrd. på ett døgn) da flere verk ble
kjøpt og modernisert: kjøp kan øke verdien mer enn de koster (60 døgns overskudd). Over tre døgn var veksten godt
innenfor. Ikke juks, og ingenting med dagens oppdateringer å gjøre.

**Gjort:** B-194 og migrasjon 032: vekstsperren flagger bare hvis også veksten fra minst tre døgn tilbake er for høy.
Flagget er fjernet. Endringsloggen, PLAN-NETT, CLAUDE.md.

**Testet:** DO-blokk med de ekte tallene (gammel regel flagger, ny ikke, juks flagges fortsatt), rullet tilbake. Etterpå:
ingen flaggede kontoer, H4WK3N5 nr. 1 på konsernverdi, sikkerhetsrådene uendret. `npm test`.

**Gjenstår:** Grane og Figen står ikke på sesonglista før de har lagret etter reformen (som før).

---

## Økt 131 – 2026-09-27: midlertidig sikkerhetsventil for kassa

**Brukeren ba om:** før rebalanseringen av sluttspillet: en myk grense på 100 mrd. for disponibel kasse, der
overskuddet flyttes til en bunden konsernreserve (ikke brukbar, ikke til konsernkassa, ikke i PvP/anbud/Kontroll/
Industrimakt, ikke på «mest penger på bok», lagres, kan migreres senere); grensen i config; vises først når det skjer;
og en sjekk av lagringsformat, konsernverdi, topplister, konkurs og andre beregninger først.

**Gjort:** B-193. Sjekken (se beslutningen): ingen SQL-endring trengs; reserven teller i konsernverdien så titler,
sluttmål, liga og juksesperre regner som før; banken ser reserven som sikkerhet. `game/reserve.ts`, feltet
`lockedReserve` (null i `migrate()` og nye spill), motoren og `act` flytter overskuddet, varsel første gang og én linje
per døgn, visning på Økonomi, Konsern og en lås ved kassa. Simulatoren (`--konsern`) bruker grensen. Endringslogg: nei
etter eierens beskjed.

**Testet:** `npm test` (ny reservetest), tsc, lint, balanse (exit 0), `--konsern`, Playwright med kasse 100,5 mrd.

**Gjenstår:** eieren sa «Merge» – PR #139 (UI-1b + ventilen) er merget, og publiseringen gikk grønt. Reserven skal
migreres når sluttspillet er rebalansert (FORSLAG).

---

## Økt 130 – 2026-09-27: UI-1b – app-skallet

**Brukeren ba om:** «Merge» for UI-1a (PR #138, publiseringen grønn), så «Fortsett» – neste steg i planen, UI-1b.

**Gjort:** B-192. PC-skall fra 900 px med sidemeny (Konsern som eget punkt når det er åpnet) og topplinje på én rad;
innholdet scroller i `.g-main` på alle størrelser. Underfanene i Verket øverst, styrt fra `GameApp`
(`ui/verketTabs.ts`). Mobilmenyen med ikoner; nøkkeltallene som ikon + tall (133 → 117 px). Fagbok, varsler,
toppliste og innstillinger som ark fra høyre på PC. Varsellinja står etter B-116; spørsmålet om toast er lagt i
FORSLAG. Endringsloggen, UI.md, CLAUDE.md.

**Testet:** tsc, lint, `npm test`, balanse (exit 0), build; Playwright på 7 størrelser før/etter, Konsern-navigasjon,
ark fra høyre, nytt spill med veiledningen (320 og 1 366).

**Gjenstår:** merget i PR #139 sammen med B-193. Eierens svar om varsellinja på mobil (FORSLAG). Deretter UI-2a
(Oversikt).

---

## Økt 129 – 2026-09-27: UI-1a – tokens, skrift, ikoner og ett kontokort

**Brukeren ba om:** UI-fase 1-valgene (egen liten skrift for overskrifter og tall, Lucide, ett samlet kontokort,
Konsern i sidemenyen på PC) og UI-1a: fargetokens, typografi og grunnkomponenter – ikke redesigne sidene. Skjermbilder
før merge (liten mobil, iPhone, 1 366×768, 1 920×1 080) av Verket/Anlegg og en tung side. Vente med merge til eieren
sier ifra.

**Gjort:** B-191. `ui/tokens.css` (farger med mening, 9 skriftstørrelser, radier, avstander, skygger, bevegelse,
fokus), visningsskriften i `ui/fonts/`, Lucide-utvalget i `ui/icons.tsx`, `ui/ds.tsx` (StatusBadge, Callout, Button).
Alle faste farger, skriftstørrelser og radier i game.css, control.css og index.css byttet til tokens med et skript
(76 farger → 0, 19 størrelser → 9). Toppfeltet har ikoner i stedet for emoji. De tre «krever konto»-kortene på Verket er
ett (`AccountFeaturesCard`), KONTO-regel 6 justert. UI.md, KONTO.md, CLAUDE.md, endringsloggen.

**Testet:** tsc, lint, `npm test`, balanse (exit-kode), build. Playwright før/etter på 320, 390, 1 366 og 1 920 px
(Verket, kontokortet, Anlegg, Økonomi, Marked) – ingen vannrett scrolling, ingen feil i konsollen; 412/820/2 560 for
vannrett scrolling.

**Gjenstår:** eieren så skjermbildene og sa «Merge» – PR #138 er merget. Neste er UI-1b (app-skallet: kompakt mobiltoppfelt, sidemeny på PC med
Konsern). Tegningene (anleggsbildet, kontrollrommet) får tokens i UI-2a/UI-4a.

---

## Økt 128 – 2026-09-27: felles klokke

**Brukeren ba om:** lik innskuddsgrense for alle (`treasury_log_step` = 0) i hvert fall gjennom pilotperioden; rette
tidslinjetall fra før reformen så de aldri påvirker serverberegninger; sjekke om noen hadde brukt den gamle grensen i
første anbud; «dager» i ukens utfordring i ekte aktive dager; fast regel om at Industrimakt, Kontroll, eierskap og
overtakelser aldri avgjøres av lokal kasse, egenkapital eller fart. Deretter UI-1a (se neste økt).

**Gjort:** B-190 og migrasjon 031 (i to deler). Ingen hadde flyttet penger inn eller budt, så anbudet fortsetter.
Regelen står i RETNING.md og CLAUDE.md. Appen: teksten for «dager» og visningen «N dager». Endringsloggen.

**Testet:** grensen 100 mill.; 2 384 gamle tall merket; sesonglista og ukens vekst uten dem; «dager» og delt plass i en
transaksjon som ble rullet tilbake; `npm test`.

**Gjenstår:** ingenting for fellesverdenen nå.

---

## Økt 127 – 2026-09-27: testcaser for skraplagerinntekten og fase 1B

**Brukeren ba om:** før fase 1B, automatiske testcaser som viser at lokal fart ikke kan øke serverinntekten (1×, 3×, 10×,
ulik spilletid, pause/offline, gammel lagring) og hvorfor; deretter fase 1B som planlagt (pilotkonsesjon 14 dager).

**Gjort:** B-188: produksjonsmåleren på serveren (029) og speilet i `net/scrapIncome.ts`, med `net/scrapTests.ts` i
`npm test`. Testene fant to feil i den planlagte målingen (37 % for mye på 10× med hele spilldager; 12 % ujevnt med
median og skiftdrift) – rettet til stigning over 8 tall med spillminutter. B-189: skraplageret (030) med skjult anbud,
bud fra konsernkassa, trekning ved likt bud, pilotkonsesjon 14 dager, daglig inntekt; `net/world.ts`, kortet i
`ui/Companies.tsx`, «krever konto» uten konto. Endringsloggen, KONTO, RETNING, PLAN-NETT, CLAUDE.md.

**Testet:** `npm test` (motor, nett, skraplager), tsc, lint, balanse (exit 0), build. SQL: scenariene mot de ekte
funksjonene (identiske tall), livsløpet til anbudet med fire testkontoer (rullet tilbake) – fant og rettet to feil i
migrasjonen. Playwright på Konsern-fanen 390 og 320 px, med og uten konto (overføring, bud, for høyt bud).

**Gjenstår:** følge første anbud (stenger 48 timer etter start) og første inntekt; justere gebyr og tak i `config.world`
etter testing. UI-fase 1 venter på eierens svar i `UI.md` avsnitt 12.

---

## Økt 126 – 2026-09-27: UI-fase 0 – mobil + PC og designplan

**Brukeren ba om:** en separat oppgave etter fase 1A: UI/UX, visuell identitet og en ekte PC-versjon. Stålverket skal
være både mobilspill og PC-spill (mobil = rask drift, PC = kontrollrom/hovedkontor). Først UI-fase 0: kritisk
vurdering, designsystem, PC-arkitektur, responsiv strategi, komponenter som endres, hva som beholdes, PR-rekkefølge og
problemer med retningen – og oppdatere prosjektminnet. Ingen stor implementering før planen er gjennomgått. Ikke logo
eller app-ikon ennå.

**Gjort:** B-187 og `docs/UI.md`. Målt dagens UI i Playwright på 7 størrelser (320×568 til 2 560×1 080) og lest `ui/`
og CSS-en. CLAUDE.md («Mobil og PC», les UI.md), DESIGN.md (plattformer).

**Viktigste funn:** mobiltoppfeltet er 133 px (34 % av en liten skjerm med menyen); PC er mobilversjonen låst til
1 248 px; 76 farger, 19 skriftstørrelser, 10 radier i CSS-en; 121 emoji i komponentene; underfanene i Verket ligger
under anleggsbildet; tre «krever konto»-kort fyller høyrekolonnen på PC.

**Testet:** bare målinger og skjermbilder; ingen kode endret.

**Gjenstår:** eierens svar på spørsmålene i `UI.md` avsnitt 12, så UI-1a (tokens og grunnkomponenter).

---

## Økt 125 – 2026-09-27: økonomireformen gjennomført

**Brukeren ba om:** «go» på reformen, men med et større urørt gulv eller en jevn overgang, så små spill (H4WK3N5 79 → 62
mill.) ikke får et merkbart kutt. Siste ferske dry-run, vis resultatet, ekstra sikkerhetskopi, gjennomfør hvis
kontrollen er OK. Konsernkassa godkjent som utgangspunkt; pilotkonsesjon 14 dager; testcaser for normaliseringen før
fase 1B. (I samme melding: en ny, separat oppgave om UI/UX og PC-versjon – se neste økt.)

**Gjort:** B-186. Gulv 250 mill. og k = 0,365 (samme topp som modell B). Fersk dry-run → prøvekjøring rullet tilbake →
migrasjon `028_okonomireform.sql` (sikkerhetskopi i `save_backups` og for alltid i `economy_reform_log.old_state`,
endring, kontroll i én blokk). Grane 8 286 → 11,17 mrd., Tuster 3 664 → 8,29 mrd., Figen 1 562 → 6,07 mrd.; H4WK3N5 og
Sjæfen urørt. Endringsloggen i spillet forklarer reformen.

**Testet:** kontrollen i migrasjonen gikk gjennom; spørring etterpå viser ny kasse, én kopi per spill og kopien i loggen.
H4WK3N5 lagret videre uten problemer rett etter.

**Gjenstår:** se at Tuster, Grane og Figen henter det nye spillet neste gang de åpner appen (ingen lagring med gamle tall).

---

## Økt 124 – 2026-09-27: fase 1A (konsernøkonomi, konsernkasse, Grunnleggeræraen)

**Brukeren ba om:** fase 1-valgene (B-181): modell B for reformen (først fersk dry-run, sikkerhetskopi og kontroll);
datterverkene beholder driftsresultatet, utbyttet oppover avtar og konsernkostnadene øker, stilt inn med simulator for
3, 6, 10 og 14 verk; konsernkasse på serveren med sterkt avtagende døgngrense; analyse av ekte-tids-normalisering før
skraplageret; Sesong 2 av og Grunnleggeræraen; skjult anbud og pilotkonsesjon (1B); aktiv = 2 av 14 dager; «Hall of
Fame»; Industrimakt skjult. Leveranse: fase 1A nå, 1B etterpå.

**Gjort:**
- B-181: `KONSERN_ECONOMY`, `dividends` (rekke etter resultat, 20 % blir igjen, andelen avtar 5 % per plass),
  `konsernCosts` (ledelse per verk × koordinering), netto i alle kjøp og i «Neste steg», ny kostnadspost «konsern»,
  Konsern-fanen viser utbytte per verk og drift/beholdt/kostnader, Økonomi skiller konsernet fra hjemmeverket, fagboka.
  `balance.ts --konsern` (tabell og vekst). Ny test i `game/tests.ts`.
- B-182: migrasjon 026 – bryter `auto_next_season` (av), `eras` med Grunnleggeræraen, `activity_days` fra `saves`,
  `active_players()`, `season_status()` med æra. Rettet en feil som ville krasjet `season_status()` når Sesong 1 er over.
  Sesonglinja viser æraen; «Alle tider» → «Hall of Fame».
- B-183: migrasjon 027 – `treasury`, `treasury_ledger`, `treasury_limit()`, `treasury_status()`,
  `deposit_to_treasury()`, sperre på `saves` mot å doble penger. `net/treasury.ts`, `treasuryOut` i spillet, tester med
  falsk tjeneste. Ingenting vises i spillet ennå.
- B-184: fersk dry-run og klar utføring av reformen (`supabase/utkast/okonomireform_utforing.sql`), prøvekjørt og rullet
  tilbake. **Ikke kjørt** – venter på eierens «go». Funn: kassa er tjent inn igjen på timer selv med ny konsernøkonomi.
- B-185: analysen av ekte-tids-normalisering (`RETNING.md` avsnitt 14): aktivitetsdøgn med tak per kunde, regnet av
  `produced_t`.
- RETNING (fase 1-status, fersk dry-run, avsnitt 14), FORSLAG (nye spørsmål, svarene under «Avgjort»), KONTO,
  PLAN-NETT, CLAUDE.md, endringsloggen.

**Testet:** `npx tsc -b`, `npm run lint`, `npm test` (motor og nett), `balance.ts` (exit 0), `balance.ts --konsern`.
Migrasjonene kjørt; bryteren testet ved å avslutte Sesong 1 i en transaksjon som ble rullet tilbake; kassa testet med en
midlertidig testkonto i en transaksjon som ble rullet tilbake; reformen prøvekjørt og rullet tilbake (sjekket etterpå at
ingenting var endret). Sikkerhetsråd: bare forventede funn (tabell uten regler for serverfunksjoner, funksjoner for
innloggede som sjekker `auth.uid()`). Playwright på Konsern-fanen og topplista (390 og 320 px).

**Gjenstår:** eierens «go» (eller nei) på reformen, grensen på kassa og lengden på pilotkonsesjonen (FORSLAG.md). Så
fase 1B: skraplageret med 48-timers skjult anbud, pilotkonsesjon og inntekt etter avsnitt 14.

---

## Økt 123 – 2026-09-26/27: ny hovedretning (fase 0)

**Brukeren ba om:** innarbeide en eiergodkjent ny hovedretning i designminnet og arkitekturen – fra stålverk til
industrimakt (strategiske bedrifter, Kontroll, overtakelser, verksjefer, æraer, økonomireform). Ikke kode alt; først
lese hele prosjektminnet, vurdere retningen kritisk, lage en overgangsplan, oppdatere dokumentene, planlegge
økonomireformen som dry-run, og foreslå en liten første leveranse. Før dette: «Dropp alt jeg nettopp sa» om forrige
liste (menyopprydding m.m.) – den er droppet, og ingen kode var endret for den.

**Gjort:** B-180 og `docs/RETNING.md` (retning, pilarer, kritisk vurdering, datamodeller, faser 0–6, første leveranse,
dry-run, tabell over gamle beslutninger, risiko, balansering, åpne spørsmål). Statuslinjene på B-033, B-106, B-119,
B-121, B-124, B-129, B-130, B-149, B-150 og B-167 viser hva som justeres. DESIGN (visjon, designpilarer, nivåtabell,
veikart), PLAN-NETT (merknad øverst, fase 4 og 5 på vent), FORSLAG (sju spørsmål til eieren), KONTO (regel 6 og
planlagte funksjoner), README og CLAUDE.md (nye faste regler) beskriver samme spill. Dry-run-spørringen ligger i
`supabase/utkast/`. `sjekk-endringslogg.mjs` hopper over beslutninger merket «Endringslogg: nei».

**Viktigste funn:** inntektsmotoren (12–14 stålkomplekser på trinn 5, 5–6 mrd. per spilldøgn) gjør at en ren
kassereform er tjent inn igjen på 1–5 timer på 10×; spilltid og ekte tid må skilles (konsernkasse med begrenset
innskudd); KONTO-regel 6 må tolkes med gradvis synlighet; automatisk Sesong 2 i mars bør skrus av.

**Testet:** dry-run-spørringen kjørt mot databasen (bare lesing, ingen data endret), endringslogg-sjekken begge veier,
`npm test`.

**Gjenstår:** eierens svar på de sju spørsmålene i FORSLAG.md. Så fase 1: økonomireform (etter ny dry-run og ekstra
sikkerhetskopi), inntektsmotoren i konsernet, `world_config`/`company_types`, aktiv spiller.

---

## Økt 122 – 2026-09-26: juks, skiftleder, endringslogg og landemerker

**Brukeren ba om:** dobbeltsjekk at to faner eller fartsutvidelser i nettleseren ikke kan lure spillet; skiftledere
sent i spillet som følger opp fraværet; en endringslogg i spillet (og at den huskes hver gang); landemerker skal tas
manuelt, ikke av salgsdirektøren.

**Gjort:**
- B-176: to faner ga ikke dobbel fart, men lagret over hverandre – nå spiller bare én fane om gangen. Fartsutvidelser
  kunne gi flere spilldøgn per time; migrasjon 025 legger inn fartskontroll i juksesperren (spillminutter mot serverens
  klokke), og `at` settes av serveren.
- B-177: salgsdirektøren lar landemerkene stå; Salg viser tall for dem.
- B-178: rollen Skiftleder fra stålverket.
- B-179: «Hva er nytt» etter oppdatering og under ⚙️, med sjekk i `npm test` og CI.

**Testet:** tsc, lint, tester (nye for skiftleder og landemerker), endringslogg-sjekken, balanse (exit 0), build.
Fartskontrollen i databasen (rullet tilbake). Playwright 390 og 320 px: to faner, «Hva er nytt», skiftlederen.

**Gjenstår:** brukeren kan be testeren prøve fartsutvidelsen igjen – spilleren skal da bli flagget etter ca. 10 minutter.

---

## Økt 121 – 2026-09-26: nytt kontrollrom

**Brukeren ba om:** (fra lista i økt 117) «Å kjøre ovnen manuelt syntes alle er kjedelig. Bytt ut hele greia med noe som
fungerer skikkelig bra og som er morsomt.»

**Gjort:** B-175. Kontrollrommet er et spill i fire runder under ett minutt: smelt (hold for strøm, skrapkurver), blås ut
karbonet (hold for oksygen, ikke kok over), rak ut slaggen (trykk på klumpene) og tapp (treff temperaturen, fyll øsa).
Poeng, kombo, rekord og «Ta neste charge også». Den enkle styringen på prosessmodellen er fjernet.

**Testet:** tsc, lint, tester (ny for kontrollrommet), balanse (exit 0, ny sjekk: flink ≥ 4★ under 60 s, slurvete
≤ 2★), build. Playwright 390 og 320 px: hele chargen spilt med hold og trykk, 5★, rekorden lagret, ingen horisontal
scrolling, ingen knapper under 40 px, ingen feil.

**Gjenstår:** ingenting fra lista i økt 117. Brukeren bør prøve kontrollrommet selv og si om det er for lett eller vanskelig.

---

## Økt 120 – 2026-09-26: landemerker

**Brukeren ba om:** (fra lista i økt 117) noe å gjøre hele sesongen – andre del.

**Gjort:** B-174. 27 landemerker som egne forespørsler, ett nytt per virkelig dag, med belønning og samling på Verket.
Kortet «Kobbertyver» tidligst på støperiet og mildere.

**Testet:** tsc, lint, tester (ny for landemerker), balanse (exit 0), build. Playwright 390 og 320 px: kortet med
samlingen, lenken til Salg, forespørselen på Salg, ingen horisontal scrolling, ingen feil.

**Gjenstår:** nytt kontrollrom.

---

## Økt 119 – 2026-09-26: sesongstigen og flere titler

**Brukeren ba om:** (fra lista i økt 117) noe å gjøre hele sesongen på seks måneder.

**Gjort:** B-173. Migrasjon 024: sesongstigen med poeng fra spilte dager, dagens belønning, dagens oppdrag og topp 3 på
ukelista, 50 trinn med fagpoeng og fem pyntegjenstander bare fra stigen. Kortet «Sesongstigen» på Verket. Fire nye titler
etter Stållegende med to opplåsinger.

**Testet:** tsc, lint, tester (ny for pynt og titler), balanse (exit 0), build. I databasen (rullet tilbake): poeng for
dag, belønning og oppdrag, henting av trinn 1–5 gir 130 fagpoeng og kan ikke hentes to ganger. Sikkerhetsrådene som før
(to nye tabeller uten policy, som meningen er). Playwright 390 og 320 px: kortet, «Hent» gir fagpoeng og sesongflagg,
pynten i Pynt-arket, ingen horisontal scrolling, ingen feil.

**Gjenstår:** landemerker og nytt kontrollrom.

---

## Økt 118 – 2026-09-26: varsellinja, ukelista og salgsdirektøren

**Brukeren ba om:** (fra lista i økt 117) varsellinja, ligaene og at salgsdirektøren kan oppgraderes.

**Gjort:** B-172. Varsellinja viser det nyeste, ett tall, ✕ fjerner alt. Migrasjon 023: én ukeliste for alle, målt i
prosent. Salgsdirektøren har tre oppgraderinger.

**Testet:** tsc, lint, tester (ny for oppgraderingene), balanse (exit 0), build. `weekly_scores` på de ekte spillerne.
Sikkerhetsrådene som før. Playwright 390 og 320 px: ✕ nullstiller bjella, ukelista i prosent uten ligafaner,
oppgradering av salgsdirektøren, ingen salgsmerke, ingen horisontal scrolling, ingen feil.

**Gjenstår:** innhold for hele sesongen og nytt kontrollrom (neste puljer).

---

## Økt 117 – 2026-09-26: skrapinnkjøperen, hendelser og småfeil

**Brukeren ba om:** fjerne omdømme-topplista, sjekke Sjæfen på topplista, skyen som gjør toppmenyen høyere, at
skrapinnkjøperen er ubrukelig (fra en spiller), reservepotte til alle ovner, og i neste melding en lang liste:
returskrap, varsellinja, Safari-teksten, flere hendelser, ligaer, innhold for hele sesongen, nytt kontrollrom,
topplista, salgsdirektøren, nettselskapet, Sjæfens «alle tider», «flytt til et større sted» på storverket.

**Gjort:** B-171 (første pulje): skrapinnkjøperen, skrapklasseren, planlagt bytte som avbestilles, hendelser,
topplista, reservepotte-tekster, skyen, Safari-teksten, storverk-teksten, salgsmerket. Svar om Sjæfen.

**Testet:** tsc, lint, tester (nye for innkjøper/salg, skrapklasser, avbestilt bytte, hendelser), validate, balanse
(exit 0), build. Playwright 390 og 320 px: salgsbryter og «Selg alt», topplista ved bytte av liste, ingen horisontal
scrolling, ingen feil. Sjæfens opplasting simulert i databasen (rullet tilbake).

**Gjenstår (neste puljer):** varsellinja, ligaene, salgsdirektøren kan oppgraderes, innhold for hele sesongen, nytt
kontrollrom.

---

## Økt 116 – 2026-09-26: de små tingene

**Brukeren ba om:** «Ta alle de små tingene»: råd om stålkomplekser, ansette til plassene avløserne fyller, «koblet til
på dag N» på topplista og bedre råd om rekkefølgen ovn/støping.

**Gjort:** B-170. Bytt et lite datterverk mot et stålkompleks (knapp og «Neste steg»). «Ansett til plassene (N)» på
Folk. Migrasjon 022: `linked_day` på topplista, vist som «Koblet til på dag N». Planlagt bytte av støping venter på
prisen pluss tre døgns drift; «Neste store steg» forklarer sparing, planlegging og flaskehalsen; nybegynneren følger
rådet.

**Testet:** tsc, lint, tester (nye for byttet til kompleks, «Ansett til plassene» og bufferen ved bytte), validate,
balanse (exit 0, nybegynneren 184 → 152,5 døgn), build. Playwright 390 og 320 px: byttet gir et kompleks, knappen i Folk
ansetter og er 40 px høy, topplista viser linjen uten avkorting, «Neste store steg» med og uten penger, ingen
horisontal scrolling, ingen feil i konsollen. `leaderboard()` i databasen gir `linked_day` (Grane 1019); sikkerhetsrådene
som før.

**Gjenstår:** –

---

## Økt 115 – 2026-09-26: sikkerhetskopi av spillene

**Brukeren ba om:** daglig sikkerhetskopi av spillene på nett, så man kan rulle tilbake.

**Gjort:** B-169. Migrasjon 021: `save_backups` med en kopi per spiller per dag og en ekstra før et spill erstattes av
et med mye lavere dag, 14 dager tilbake, bare lesbar for utvikleren. `restore_save(id)` ruller tilbake. Oppskrift i
CLAUDE.md.

**Testet:** i databasen med en transaksjon som rulles tilbake (kopiene tas når de skal, gjenoppretting virker, anon
kan ikke lese). Sikkerhetsrådene: bare «RLS uten policy» for den nye tabellen, som er meningen.

**Gjenstår:** –

---

## Økt 114 – 2026-09-26: Sjæfen får tilbake storverket

**Brukeren ba om:** at Sjæfen, som startet Sesong 1 på nytt før B-166, får fortsette der han var.

**Gjort:** B-168. Det gamle spillet var overskrevet. Etter valg fra brukeren ble sesongspillet hans løftet på nett:
storverket, konsernverdi 27,6 mill. som før, konkursen fjernet, forklaring i loggen. Appen henter det (versjon 487).

**Testet:** raden på nett har de nye verdiene (nivå 4, kasse 27 551 659, lån 0, ikke konkurs, versjon 487).

**Gjenstår:** at Sjæfen åpner spillet og ser at det er hentet (flyttefeiring «Storverk»).

---

## Økt 113 – 2026-09-26: neste sesong starter av seg selv

**Brukeren ba om:** at Sesong 2 starter automatisk når Sesong 1 er over, og at alle blir med over.

**Gjort:** B-167. Migrasjon 020: `season_status()` lukker sesongen som er over og starter den neste (26 uker, med lås).
Appen kobler alle spill med konto til sesongen som pågår, også videre til neste. Spørsmålet om å starte på nytt er
fjernet.

**Testet:** overgangen i databasen (rullet tilbake). tsc, lint, `npm test`, validate, balance, build. Playwright med
falsk server: et spill fra en tidligere sesong blir med i den nye uten popup og uten ekstra kasse.

**Gjenstår:** –

---

## Økt 112 – 2026-09-26: alle blir med i sesongen

**Brukeren ba om:** at alle spillere kan bli med i sesongen som pågår uten å starte på nytt.

**Gjort:** B-166. Spill uten tidligere sesong blir med med en gang spilleren er innlogget, uansett nivå, uten
sesongfordelen. Tekstene om «alle starter i garasjen» er skrevet om. Spill fra en tidligere sesong får valget som før.

**Testet:** tsc, lint, `npm test` (oppdatert test), validate, balance, build. Playwright med falsk server på 390 og
320 px: et spill på dag 144 blir med i Sesong 1, uten ekstra kasse, med melding i loggen og uten popup; et spill fra en
tidligere sesong får popupen med ny tekst.

**Gjenstår:** avgjøre før Sesong 2 om spill fra forrige sesong også skal få fortsette (FORSLAG.md).

---

## Økt 111 – 2026-09-26: Figen mot Grane, topplista på Android, mesterskap for foringen

**Brukeren spurte/ba om:** hvorfor Figen vokser fortere enn Grane; hvorfor Granes eget tall står stille på Android;
mesterskap der fagpoeng gjør at ovnspottene holder lenger.

**Funnet:** Figen og Grane tjener like mye per spilldøgn (5,2 mrd.) med 12 komplekser hver. Figen har spilt mer. Granes
lagring på nett sto stille i 21 minutter (dag 823 → 914) – et kall som hang uten tidsgrense.

**Gjort:** B-165. Tidsgrense på 30 s for alle kall til tjenesten, og topplista sier fra når ditt spill ikke er lagret.
Nytt mesterskap «Holdbare ovnspotter» (opptil 30 % mindre slitasje på foringen).

**Testet:** tsc, lint, `npm test` (to nye tester), validate, balance (exit 0, uendret), build.

**Gjenstår:** Grane bør se om tallet nå følger med. Hvis ikke, se tidslinja hans igjen (gap mellom lagringene).

---

## Økt 110 – 2026-09-26: avløsere og oppsigelser

**Brukeren meldte:** det er vanskelig å forstå hvor mange av hver ansatt man trenger; sier man opp en avløser, mangler
plutselig en støper selv med 23 avløsere.

**Gjort:** B-164. «Ledige avløsere» teller bare avløsere som ikke står fast på plasser, og sier hvilke plasser de andre
fyller. «Si opp» viser hva som skjer med skiftene før man bekrefter. Tydeligere tekst i bemanningstabellen.

**Testet:** tsc, lint, `npm test` (ny test), validate, balance (exit 0, uendret), build. Playwright på 390 og 320 px:
med én ledig avløser går skiftene som før; uten ledige sier «Si opp» at det mangler 1 støper; ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 109 – 2026-09-26: lærlinger tar fagbrev

**Brukeren ba om:** at lærlinger kan ta fagbrev, så de ikke er lærlinger for alltid.

**Gjort:** B-163. Læretid 30 døgn, så fagprøve: bestått gir fagbrev, vanlig lønn og «(lærling)» fjernes; stryk gir ny
prøve om 7 døgn. «🎓 Fagprøve om N døgn» under Folk → Ansatte, tekst i hendelseskortet og fagboka. Gamle lærlinger får
fagprøve om tre døgn. Funnet underveis: et planlagt bytte av støping ble aldri gjort mens en rammeavtale på det gamle
produktet varte – rettet.

**Testet:** tsc, lint, `npm test` (to nye tester), validate, balance (exit 0; nybegynneren 184, se B-163), build.
Playwright på 390 og 320 px: merket vises, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 108 – 2026-09-26: topplista – Grane og Figen

**Brukeren spurte:** om tallene på topplista stemmer (Grane fikk mye), og hvorfor Figen ble borte igjen.

**Funnet:**
- Grane er ærlig: spilte 610 døgn uten konto før første opplasting, og har 12 stålkomplekser (4,6 mrd. per døgn fra
  konsernet) der de andre har 8 storverk og 4 komplekser. Samme tonn hjemme.
- Figen ble flagget for «117598 tonn på 1 døgn» av en feil i appen: tallene til tidslinja ble lest etter at
  lagringen var ferdig, mens dagen ble lest før.

**Gjort:** B-162. Appen leser tallene samtidig med dagen (ny nettest). Migrasjon 019: tonnsperren ser også på snittet
fra minst tre døgn tilbake, og Figens flagg er fjernet. Figen er tilbake på topplista.

**Testet:** `npm test` (den nye testen feiler med den gamle koden), tsc, lint, validate, balance, build. Sperren
testet i databasen med en transaksjon som rulles tilbake. Sikkerhetsrådene som før.

**Gjenstår:** Supabase melder fortsatt «Leaked password protection disabled» (brukeren trodde det var skrudd på).
Forslagene om Grane: råd om å bytte storverk med komplekser, sjekk av første opplasting, «koblet til på dag N».

---

## Økt 107 – 2026-09-26: skrapvarsel, sesongquiz, «slaggen» og kundevurdering

**Brukeren ba om:** varsel for alle ovner uten skrap, quiz for sesongkapitlene, «slaggen» (ikke «slagget») og
kundevurdering. Vern mot lekkede passord er på. Glemt passord er ikke testet. Ikke begynn på fase 4 ennå.

**Gjort:** B-161.
- Alle ovner varsles når de blir stående uten skrap, samlet i ett varsel.
- Quiz for sesongkapitlet (teller ikke i «Fagekspert»).
- «Slaggen» i kontrollrommet.
- Kundevurdering 1–10 per levert kontrakt, med snitt og karakter på Salg, råd ved lav karakter, fagboktekst og
  prestasjonen «Ti av ti». `balance.ts --vurdering`.
- Sjekken av kontrollrommet i `balance.ts` tåler hendelseskort.
- Docs: FORSLAG (avgjort og ryddet), DESIGN, PLAN-NETT (status), KONTO, CLAUDE.md.

**Testet:** tsc, lint, `npm test` (nye tester for vurdering og sesongquiz), validate, balance (exit 0), build.
Simulering: to tomme ovner gir «Ovnene 1 og 2 står: skraplageret er tomt». Playwright på 390 og 320 px: rådet om lav
karakter åpner Salg → Ordrekø, snitt og karakterer vises, ingen horisontal scrolling.

**Gjenstår:** brukeren tester glemt passord. Fase 4 venter til brukeren sier fra.

---

## Økt 106 – 2026-09-26: fortsett på 10× etter popups

**Brukeren ba om:** et valg om å fortsette på 10× etter popups, i stedet for at tida alltid går ned til 1×.

**Gjort:** B-160. Hendelseskort, tips og råd har linja «Fortsett på 10× etterpå» nederst når farten var over 1×.
Valget huskes (`settings.keepSpeed`) og finnes også under ⚙️. Standard er 1× som før.

**Testet:** tsc, lint, `npm test` (ny test), validate, balance, build. Playwright på 390 og 320 px: linja er 44 px høy
og innenfor skjermen, huk av → spillet går på 10× etter kortet, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 105 – 2026-09-26: trivselen sto på 100 uten bonus

**Brukeren spurte:** hvorfor trivselen er 100 % når det er lenge siden forrige bonus.

**Funnet:** +0,5 per levert kontrakt (mange i døgnet med salgsdirektør) og +1 i døgnet fra 5 skiftlag løftet trivselen
fortere enn den drev ned mot normalen.

**Gjort:** B-159. Normalen synker opptil 15 etter 14 døgn uten bonus (fra stålverket). Løft i hverdagen når bare
normalen + 15. Kortet «Trivsel» forklarer det, og et nytt råd på Verket sender spilleren til Folk → Ansatte. Test i
`tests.ts`.

**Testet:** tsc, lint, `npm test`, validate, balance (exit 0), build. Playwright på 390 og 320 px: rådet vises, åpner
Ansatte, merknaden står på kortet, bonusknappen løfter trivselen, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 104 – 2026-09-26: Figen borte fra topplista

**Brukeren spurte:** hvorfor spilleren Figen ble borte fra topplista.

**Funnet:** Juksesperren flagget Figen for «33048 tonn på 1 døgn». Grensen på 30 000 t (B-152) var for lav for tre
likestrømsovner på 420 t med alt utstyr. Tidslinja viste ærlig spill.

**Gjort:** B-158. Migrasjon 018: tonnsperren er 100 000 t per døgn, og flagg som bare skyldtes tonn, er fjernet. Figen
er tilbake som nr. 1.

**Testet:** topplista i databasen viser Figen igjen. Sikkerhetsrådene er som før. tsc og `npm test`.

**Gjenstår:** –

---

## Økt 103 – 2026-09-26: støpingen holder følge med stormodellene

**Brukeren meldte:** ovn 3 venter ofte på støping etter at alt er oppgradert.

**Funnet:** Med trafo, conveyor, flinke folk og forskning tar en charge i 420-tonneren ca. 48 min, ikke 70. Tre ovner
smelter da ca. 1 470 t/h, mens støpingen (8 strenger × 2 maskiner) tok 920 t/h.

**Gjort:** B-157.
- 8 strenger: 460 t/h.
- Ny strengstøpemaskin nr. 3 ved Stålmagnat.
- Tips på Verket når ovnene smelter mer enn støpingen tar, med hva som hjelper.

**Testet:**
- tsc, lint, `npm test` (ny test for kapasiteten), `validate.ts`, build.
- `balance.ts` (exit 0, uendret) og `--opphold` (ingen flagget, høyst 70 %).
- Playwright på 390 og 320 px: tipset peker på maskin nr. 3.

**Gjenstår:** –

---

## Økt 102 – 2026-09-26: økonomi – hjemmeverket for seg

**Brukeren meldte:** resultatet på Økonomi gikk ikke opp etter at ovnene ble oppgradert.

**Funnet:** Brukerens spill på serveren viser at hjemmeverket gikk fra ca. 40 til ca. 130 mill. kr per døgn. Men
«Resultat i går» tok med datterverkene (1,3–2,1 mrd.) og kjøp (2,3 og 23,7 mrd.), så økningen var nesten usynlig.

**Gjort:** B-156. Økonomi viser verket i går (drift), snitt over 7 døgn, datterverkene og investeringer hver for seg.

**Testet:** tsc, lint, `npm test`, `validate.ts`, `balance.ts`, build. Playwright på 390 og 320 px: kortet med
de nye tallene, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 101 – 2026-09-26: ukekista bare til topp 3

**Brukeren ba om:** at bare topp 3 får ukekiste, siden det ikke er så mange spillere ennå.

**Gjort:** B-155. Migrasjon 017 (`finish_weeks` gir kiste bare til plass 1–3). Teksten på kortet og ukelista er
endret, og `chestFp` gir 0 utenfor topp 3.

**Testet:**
- SQL med fem testspillere i en avsluttet uke (tilbakerullet): 100, 75 og 50 fagpoeng til de tre beste, ingen til
  resten.
- tsc, lint, `npm test` (utvidet nettest), `validate.ts`, `balance.ts`, build.

**Gjenstår:** –

---

## Økt 100 – 2026-09-26: stormodeller – større ovner og støpemaskiner

**Brukeren ba om:** større ovner og støpeanlegg, som i virkeligheten (opp til en likestrømsovn på 420 t), og lengre
smeltetid jo større ovnen er.

**Gjort:** B-154.
- Lysbueovn 150 t og 250 t, likestrømsovn 420 t, strengstøpemaskin med 8 strenger og valseverk nr. 3. De åpner når
  konsernet åpner, ved sluttmålet og ved Stålmagnat.
- Tapp-til-tapp øker med størrelsen: 55 min (30 t, før 75) til 70 min (420 t).
- Markedet vokser for de største verkene.
- Fagboka forklarer ovnsstørrelse og tapp-til-tapp.
- `balance.ts --storovn N` sammenligner ovnene i samme konsernspill.

**Testet:**
- tsc, lint, `npm test` (ny test for låser, tider og marked), `validate.ts` og build.
- `balance.ts` (exit 0, uendret) og `--opphold` (ingen flagget).
- Playwright på 390 og 320 px: ovnsmenyen med 150 t til salgs og 250 t og 420 t under «Kommer senere». Ingen
  horisontal scrolling, ingen feil.

**Gjenstår:** –

---

## Økt 99 – 2026-09-26: nettselskapet og dagens oppdrag i sluttspillet

**Brukeren ba om:**
- Tilbudet fra nettselskapet er uinteressant langt ute i spillet.
- Dagens oppdrag er for lett for dem som har kommet langt.

**Gjort:** B-153.
- Nettselskapet betaler mer og gir fagpoeng.
- Dagens oppdrag skalerer med nivå. Nye oppdrag i sluttspillet: mesterskap, konsernverdi og datterverk. Bonusen gir
  flere fagpoeng.

**Testet:**
- tsc, lint, `npm test` (ny test for oppdragene i sluttspillet), `validate.ts`, build.
- `balance.ts` (exit 0) og `--daglig 15` (exit 0, alle mål OK).

**Gjenstår:** større ovner og støpemaskiner med lengre smeltetid (B-154).

---

## Økt 98 – 2026-09-26: ukens utfordring, sesonger med vri, og tre feil

**Brukeren ba om:**
- «Kjør på med alle dine forslag» (forslag 3 og 4 av 5).
- Meldte at pynt-arket ikke kan scrolles, at hen ble logget ut igjen, og at fraværsvarselet åpner Skift.

**Gjort:** B-152.
- Migrasjon 016: ukens utfordring (`weekly_*`, `claim_week_chest`), tonn i tidslinja, vri på sesongen
  (`season_twists`), topp 10-utmerkelse ved kallenavnet.
- `net/weekly.ts` og `ui/Weekly.tsx`: kortet på Verket, ukelista per liga og ukekista.
- Vrien i spillmotoren (`applySeasonTwist`, `worldFactor`).
- `ui/Portal.tsx` for ark fra Verket.
- Forklaring når økta blir borte på enheten.
- Varsler om fravær åpner Folk → Fravær.

**Testet:**
- tsc, lint, `npm test` (én ny motortest, to nye nettester).
- SQL med testbruker og tilbakerulling: ukesvekst, plass, kiste én gang, tonnsperren, vri, oppgaven på omgang.
  Sikkerhetsrådene viser bare det som er meningen.
- Playwright på 390 og 320 px med falsk server:
  - kortet, kista (+75 fagpoeng), ukelista i body uten horisontal scrolling
  - pynt-arket i body kan scrolles
  - vrien under «Nå i markedet»
  - uten konto: «krever konto»

**Gjenstår:**
- Brukerens nye ønsker: nettselskapets tilbud i sluttspillet, vanskeligere dagens oppdrag for dem som har kommet
  langt, og større ovner og støpemaskiner med lengre smeltetid.

---

## Økt 97 – 2026-09-26: prestasjoner og pynt

**Brukeren ba om:** «Kjør på med alle dine forslag» (forslag 5 av 5: pynt og prestasjoner).

**Gjort:** B-151.
- `game/achievements.ts`: 29 prestasjoner med fagpoeng, sjekket hver time og ved lasting.
- `game/cosmetics.ts`: pynt for fagpoeng, tegnet i `ui/PlantScene.tsx`.
- `ui/Achievements.tsx`: kortet på Verket og arket «Pynt verket» (🎨 på anleggsbildet).

**Testet:**
- tsc, lint, `npm test` (to nye tester), `validate.ts` og build.
- `balance.ts` (exit 0; 8/23/63/133, nybegynner 168).
- Playwright på 390 og 320 px, dag og natt, stålverk og garasje:
  - all pynt i bildet og arket
  - kjøp av flagg (fagpoeng trekkes, knappen blir «På»)
  - merkene på kortet og 13 av 29 med én gang for en gammel lagring
  - ingen horisontal scrolling, ingen konsollfeil

**Gjenstår:** B-152 (ukens utfordring og sesonger med vri).

---

## Økt 96 – 2026-09-26: sluttspillet – mesterskap og stålmilepæler

**Brukeren spurte:** Hva gjør vi så de som er «ferdige» ikke blir lei? Daglig belønning er meningsløs når alt er
forsket fram, og noen har tusenvis av fagpoeng. Svar på forslagene: «Kjør på med alle dine forslag.»

**Gjort:** B-150 (forslag 1 og 2 av 5).
- `game/mastery.ts`: mesterskap med fire prosjekter som kan tas om og om igjen (pris, strøm, skrap, datterverk).
  Kortene står på Forskning-fanen når all forskning er gjort.
- Stålmilepæler etter 10 mrd. (`LEGENDS` i `konsern.ts`): titler fra Stålbaron til Stållegende, fagpoeng, feiring med 👑,
  modernisering til trinn 5, stålkomplekser og flere datterverk. Konsernsiden viser tittelen og neste milepæl.
- Migrasjon 014: tittelen ved kallenavnet på topplista. Migrasjon 015: juksesperren tillater 50 % vekst per døgn
  etter sluttmålet.
- Verdien av datterverkene regnes uten mesterskapet, så konsernverdien ikke hopper ved kjøp av mange nivåer.
- Testspilleren bruker fagpoengene i mesterskapet i konsernet.

**Testet:**
- tsc, lint, `npm test` (tre nye tester), `validate.ts`, `balance.ts` (exit 0, uendret), build.
- `--opphold`: først 4 opphold flagget. Ved 50 mrd. kjøpte testspilleren fire stålkomplekser og moderniserte dem
  samme døgn (+37 %). Etter migrasjon 015 (50 % per døgn etter sluttmålet): høyst 70 %, ingen flagget. SQL-test av 015:
  +40 % flagges ikke, +79 % flagges.
- SQL: `title_of()` og topplista med tittel. Sikkerhetsrådene er som før.
- Playwright på 390 og 320 px: feiringen «Ny tittel: Stålmagnat!», mesterskapskortene (fagpoeng trekkes, nivået øker),
  tittelen på Konsern. Ingen horisontal scrolling.

**Gjenstår:** B-151 (pynt og prestasjoner) og B-152 (ukens utfordring og sesonger med vri).

---

## Økt 95 – 2026-09-26: hva krever konto, daglig belønning, dagens oppdrag og mens du var borte

**Brukeren ba om:**
- Noe som får folk tilbake hver dag.
- Oversikt over alt som skal kreve konto nå og senere, og automatikk for nye funksjoner.
- Dagens oppdrag og mens du var borte.
- Ingen varsel på mobilen ennå. Test med fagpoeng og timers drift.

**Gjort:** B-149.
- `docs/KONTO.md` med regler og oversikt, `net/features.ts`, `NeedsAccount` og regel i CLAUDE.md.
- `game/daily.ts` (spillreglene), `net/daily.ts`, `ui/Daily.tsx` (velkomstvindu, kort på Verket), migrasjon 013 (tabellen
  `daily`, fire funksjoner, lagring husker sist sett, juksesperren med bonusdøgn).
- `balance.ts --daglig N`.

**Testet:**
- tsc, lint, `npm test` (fire nye motortester, én nettest), `validate.ts`, build.
- `balance.ts` (exit 0, uendret), `--daglig 15` (innenfor alle mål) og `--opphold --daglig 15` (ingen flagget).
- SQL med testbruker og tilbakerulling. Sikkerhetsrådene er som før.
- Playwright på 390 og 320 px:
  - velkomstvinduet med tid borte og uka, hent dag 3
  - kortet med oppdrag, hent bonusen, kassa øker med riktig beløp
  - ingen nytt vindu etter ny innlasting
  - uten konto: kortet forklarer at det krever konto

**Gjenstår:** Varsel på mobilen (senere, krever konto). Fase 4 og 5.

---

## Økt 94 – 2026-09-26: automatisk oppdatering og innlogging etter spill uten nett

**Brukeren spurte:** Oppdateringer skal komme automatisk. Hva skjer med spill mens man er logget ut – kommer det med,
og blir man flagget? Kan man få en venns framgang ved å logge inn i vennens nettleser?

**Gjort:** B-148.
- `version.json` og automatisk omlasting, med sperre mot løkke.
- Valg når både spillet her og spillet på nett er spilt videre.
- `balance.ts --opphold` sjekker juksesperren med lange opphold.
- Test for at en venns spill ikke blir ditt.
- Rettet: kontokortet på startskjermen koblet ikke spillet til kontoen etter B-147.

**Testet:** tsc, lint, `npm test` (to nye nettester, én endret), `validate.ts`, `balance.ts` (exit 0),
`balance.ts --opphold` (ingen flagget, høyst 33 %), build. Playwright på det bygde spillet:
- koblet til kontoen på startskjermen
- ny versjon gir én omlasting med lagring først, og ingen løkke
- valget åpner seg selv på startskjermen

**Gjenstår:** Fase 4 og 5.

---

## Økt 93 – 2026-09-26: kortere startskjerm

**Brukeren ba om:** Startskjermen er for lang – gjør den kortere og mer intuitiv.

**Gjort:** B-147. Knappene øverst, med lagret spill («Ditt spill: Støperi · dag 32 …»). Sesongen på én linje.
Kontoen er én linje med knapp. «Slik spiller du» og tipset om hjemskjermen er foldet sammen.

**Testet:** tsc, lint, `npm test`, `validate.ts`, `balance.ts` (exit 0), build. Playwright på 390×844 og 320×568,
som ny spiller, med lagret spill og innlogget: ca. 500 px høy, ingen horisontal scrolling og knapper på 40–44 px.
«Logg inn» åpner skjemaet, og «Fortsett» virker.

**Gjenstår:** Fase 4 og 5.

---

## Økt 92 – 2026-09-26: sletting av konto og «Husk meg»

**Brukeren ba om:** Sjekk at sletting av egen konto ikke sletter alle. «Husk brukernavn og passord» som avhuking.

**Gjort:** B-146.
- `delete_my_account()` er kontrollert og prøvd med en testbruker i en transaksjon som ble rullet tilbake: bare den
  innloggede slettes. Ingen endring trengtes.
- Avhukingen «Husk meg på denne enheten»: husker e-posten og holder deg innlogget. Passordet huskes av mobilens
  passordlager, ikke av spillet.

**Testet:** tsc, lint, `npm test` (ny nettest), `validate.ts`, `balance.ts` (exit 0), build. Playwright 390 og
320 px: avhukingen er på fra start. Uten den: logget ut i ny fane og e-posten tom. Med den: innlogget i ny fane.
Passordet ligger ikke i lagringen.

**Gjenstår:** Fase 4 og 5.

---

## Økt 91 – 2026-09-26: logget ut om morgenen

**Brukeren spurte:** Hvorfor var jeg logget ut da jeg åpnet appen i dag?

**Funnet (innloggingsloggene):** «Logg ut» på en iPhone kl. 23:44 logget ut alle enheter, fordi det er
standarden til Supabase. Den andre appen på mobilen fikk nei da den prøvde å fornye kl. 04:55, og logget ut uten å
si fra.

**Gjort:** B-145.
- Utlogging gjelder bare denne enheten.
- Beskjed «Du er logget ut» når økta avvises.
- ☁ og lagring på nett stopper når økta dør.
- 429 og 408 logger ikke ut.
- To faner deler den fornyede økta.

**Testet:** tsc, lint, `npm test` (ny nettest), `validate.ts`, `balance.ts` (exit 0), build. Playwright med en
avvist økt på 390 og 320 px: beskjeden vises, ☁ borte, «Logg inn» åpner innloggingen, beskjeden kommer ikke igjen.
Innlogget spill (sesongresultat og toppliste) virker som før.

**Gjenstår:** Brukeren må logge inn igjen én gang på enheten som ble logget ut. Fase 4 og 5.

---

## Økt 90 – 2026-09-25: mest penger på bok, topplista oppdaterer seg, kjøpsvarsler og veiledningen

**Brukeren ba om:** «Mest penger på bok» på topplista; at topplista (og alt) oppdaterer seg mens man spiller; at
utstyr som ikke er forsket fram sier at man må forske, ikke at pengene mangler; et tall på Konsern-fanen; tallet i
varslingslinja bare én gang; sjekk av veiledningen; fjern «Ingen» under varsler i innstillingene.

**Gjort:** B-144.
- Migrasjon 012: `kind = 'kasse'` på topplista og `records.best_cash`. Ny fane «Mest penger på bok».
- Åpen toppliste henter på nytt hvert 15. sekund.
- `upgradeOptions`: pengeadvarsel bare på det som kan kjøpes nå, advarsel om produktbytte først etter forskningen.
  Kortet sier «🔬 Forsk fram «X» under Forskning først».
- `konsernReady` gir tallet på Konsern-fanen. Varslingslinja uten tall i teksten. «Ingen» fjernet (migreres til
  «Bare problemer»).
- Klokka i toppfeltet brytes i stedet for å kuttes.

**Testet:** tsc, lint, `npm test` (ny test: utstyr som mangler forskning har ingen advarsel; «ingen» → «problemer»),
`validate.ts`, `balance.ts` (exit 0), build. Migrasjon 012 kjørt; `leaderboard('kasse')` gir riktig kasse og dag;
sikkerhetsrådene uendret. Playwright: veiledningen fra start til «Ferdig» uten og med konto, 390 og 320 px; topplista
med fem faner uten avkutting, to nye hentinger på 33 s mens den er åpen og ingen etter lukking; Konsern-fanen med
tall; innstillingene uten «Ingen».

**Gjenstår:** Fase 4 og 5. Toppliste for kontrollrommet når kontrollrommet er ferdig. Lekkede passord (brukeren).

---

## Økt 89 – 2026-09-25: flere enheter samtidig og sesongresultat ved kallenavnet

**Brukeren svarte:** Nye spillere skal kunne avslutte veiledningen. Gjør det som fungerer best for flere nettlesere
i gang samtidig. Ta med «Sesong 1: 3. plass» ved kallenavnet. Toppliste for kontrollrommet venter til kontrollrommet
er ferdig. Vern mot lekkede passord skrus på etter hvert.

**Gjort:** B-143.
- Bare enheten som spilles på, lagrer (feil funnet: en enhet på pause tok over hvert 15. sekund). Den som blir
  forbigått, settes på pause med «Spill her», som tar over med én gang.
- Migrasjon 011: beste sesongplassering på topplista og `season_history()`. 🎖 under navnet, «Dine sesonger», og
  en engangsbeskjed når en sesong er over.
- Veiledningen uendret (kan avsluttes). FORSLAG.md oppdatert med svarene.

**Testet:** tsc, lint, `npm test` (nye nettester: enhet på pause laster ikke opp, handling og `leaving` gjør det;
sesonghistorikk og beskjed per konto), `validate.ts`, `balance.ts`, build. Migrasjon 011 prøvd med en oppdiktet
sesong i en transaksjon som ble rullet tilbake. Playwright: to nettlesere i gang samtidig (se B-143); beskjeden om
sesongen kommer én gang og før spørsmålet om ny sesong; 🎖 under navnet uten å presse ut nivåmerket; 390 og 320 px
uten horisontal scrolling.

**Gjenstår:** Fase 4 og 5. Toppliste for kontrollrommet når kontrollrommet er ferdig. Lekkede passord (brukeren).

---

## Økt 88 – 2026-09-25: rekorden på «Alle tider» ved ny start

**Brukeren spurte:** Blir rekorden på «Alle tider» riktig overskrevet når man starter på nytt for å bli med i en
sesong og slår den – og uten at man står dobbelt?

**Gjort:** B-142. Sjekket i databasen: aldri dobbelt, og en ny rekord ble vist riktig, men et nytt spill utenfor en
sesong slettet den gamle rekorden (feil fra B-141). Rekordene lagres nå i egen tabell (`records`, migrasjon 010),
og «Alle tider» leser derfra.

**Testet:** Migrasjon 010 prøvd i en transaksjon som ble rullet tilbake: nytt spill utenfor sesong → 28,92 mrd.
står; sesongrekord → ny verdi står; konkurs og ny start i sesongen → rekorden står, sesonglista viser det nye spillet;
to rader på lista og én rekordrad per spiller hele veien. Rekordene fra tidslinja er lagt inn for begge spillerne.
Sikkerhetsrådene uendret. Ingen endring i appen.

**Gjenstår:** Som i økt 87.

---

## Økt 87 – 2026-09-25: hyppigere lagring, nytt spill+ fjernet, og grundig gjennomgang av alt

**Brukeren ba om:** Fiks at spillet synkroniserer ofte nok. Nytt spill+ er forvirrende når det ikke er med i
sesongen – ta det bort? Se over all kode, all tekst og alle .md-filer: rett feil og skrivefeil, fjern det som ikke
passer planen, og kom med forslag.

**Gjort:** B-141.
- Lagring på nett: ca. 3 s etter hver handling, hvert 15. sekund ellers, og med én gang ved bytte av vindu. Appen
  sjekker hvert 20. sekund om en annen enhet har lagret. Feil funnet: store spill ble aldri lagret når appen ble lagt
  bort (keepalive over 64 kB).
- Nytt spill+ fjernet (knapper, motor, tekst). Seiersskjermen har bare «Spill videre»; «Nytt spill» ligger under ⚙️.
- Server (migrasjon 009): ny start i samme sesong fjerner radene fra det gamle spillet; «Alle tider» viser det beste.
- Feil: strømkrise ganget også fastprisen; startskjermen slettet spillet uten å spørre uten innlogging;
  markedsstyrken tok ikke med felles hendelser.
- Tekst: internt nummer i spillertekst, skrivefeil, «Kystverket» → «Nesverket», fagboka om sesongen, fagpoeng for
  kontrollrommet, «FP» → «fagpoeng», sesongtekster uten nytt spill+.
- Docs: README og DESIGN.md skrevet om, PLAN-NETT.md rettet, CLAUDE.md oppdatert, ny `docs/FORSLAG.md`.
- Gjennomgått: hele `game/`, `ui/` (inkl. kontrollrommet), `net/` og SQL-en. Funnene som ikke ble rettet, står i
  `docs/FORSLAG.md`.

**Testet:** tsc, lint, `npm test` (nye tester: strømkrise og fastpris, nytt spill er runde 1, eldre nytt spill+ blir
ikke med i sesongen, opplasting like etter en handling, keepalive for store spill), `validate.ts`, `balance.ts`
(exit 0, alle nivåer innenfor målene), build. Migrasjon 009 prøvd i en transaksjon som ble rullet tilbake (ny start:
6 rader → 1, ikke merket; eldre lagring: senere rader slettet, merket). Playwright med to nettlesere: et kjøp i B er
på nett innen 3,6 s uten at appen legges bort; A henter det ved fokus og av seg selv innen 20 s. Vunnet spill:
«Et stålkonsern!» med bare «Spill videre», ingen nytt spill+ under ⚙️. Startskjermen spør før et spill slettes.
Toppfeltet uten avkorting på 390 og 320 px. Sikkerhetsrådene i Supabase er uendret.

**Gjenstår:** Spørsmålene i `docs/FORSLAG.md` (avslutt veiledningen, to åpne nettlesere, merker ved sesongslutt,
toppliste for kontrollrommet). Fase 4 og 5.

---

## Økt 86 – 2026-09-25: to nettlesere på samme konto, og nytt spill+ i sesongen

**Brukeren ba om:** Spurte om nytt spill+ virkelig er borte for spill i sesongen, og om nytt spill+ blir med i
sesongen av seg selv. Meldte at handlingene ikke er oppdatert når man bytter mellom to innloggede nettlesere.

**Gjort:** B-140.
- Lagring på nett med versjonsnummer og merkelapp for nettleseren (migrasjon 008, `save_game`).
- Appen henter det nyeste når den vises igjen, og når en lagring avvises. Spilleren får en beskjed.
- Innlogging og omstart bruker versjonen i stedet for lengst spilltid.
- Nytt spill+ blir ikke med i sesongen direkte, og vises ikke under ⚙️ for spill i sesongen.
- `flush()` venter nå på en lagring som allerede er på vei.

**Testet:** tsc, lint, `npm test` (tre nye nettester for to nettlesere; to eldre tester er gjort om til å gjelde
en annen nettleser), `validate.ts`, `balance.ts` (exit 0), build. `save_game` er prøvd i databasen i en transaksjon
som ble rullet tilbake: riktig versjon lagres, utdatert avvises. Playwright med to nettlesere mot en felles falsk
server: B spiller videre og legges bort; A vises igjen, henter B sitt spill og viser beskjeden; A lagrer videre uten
avvisning. Nytt spill+ i sesongen: runde 2 blir ikke med, spørsmålet forklarer hvorfor; spill i sesongen har ingen
knapp for nytt spill+ under ⚙️. Sikkerhetsrådene i Supabase er uendret.

**Gjenstår:** Brukeren tester to ekte nettlesere. Fase 4 og 5.

---

## Økt 85 – 2026-09-25: medaljer og nivå på topplista

**Brukeren ba om:** «To brukere. Førsteplass gull og andreplass bronse? Det er feil».

**Gjort:** B-139. Medaljer for plass 1–3, og nivået (Garasje … Storverk, Konsern) ved navnet i stedet for
ligaen med metallnavn. `leaderboard()` gir nivået (migrasjon 007). Fagboka og forklaringen er skrevet om.

**Testet:** tsc, lint, `npm test`, `validate.ts`, `balance.ts` (exit 0), build. Playwright med fire falske spillere på
iPhone 13 og 320 px: 🥇🥈🥉 og «4.», merkene Konsern/Storverk/Støperi/Garasje, langt navn kortes av mens merket står,
ingen horisontal scrolling, ingen feil i konsollen. Sikkerhetsrådene i Supabase er uendret (bare de tilsiktede).

**Gjenstår:** Fase 4 og 5.

---

## Økt 84 – 2026-09-25: feil spill på sesonglista etter innlogging i ny nettleser

**Brukeren ba om:** Logget inn i en ny nettleser, og kontoen kom på sesonglista med spillet fra nettleseren, selv om
sesongen ikke var startet.

**Gjort:** B-138. Ingen opplasting eller sesongkobling før spillet er avklart mot kontoen; tidslinja skiller sesonger;
feilaktig rad slettet i databasen (spillet på nett, dag 388, var urørt).

**Testet:** tsc, lint, `npm test` (to nye nettester), build. Playwright med brukerens tilfelle: garasjespill uten
konto i ny nettleser → logg inn → mens man velger: ingen opplasting, ingen sesong; «Fra nettet» → dag 145-spillet,
ingen sesongrad. Kode-flyten og topplista-testene går fortsatt. `leaderboard('verdi', 10, 1)` er tom.

**Gjenstår:** Tre eldre Playwright-skript i /tmp er utdaterte (topplista flyttet, bare start med veiledning). Fase 4 og 5.

---

## Økt 83 – 2026-09-25: toppfelt og meny hopper ikke i Safari

**Brukeren ba om:** I Safari hopper toppfeltet og menyen når man scroller ned.

**Gjort:** B-137. Fast ramme på mobil der bare innholdet scroller.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone 13, iPhone SE, Pixel 7 og desktop: etter scrolling
står toppfeltet på 0 og menyen helt nederst, siden selv scroller ikke (bare `.g-main`), bytte av fane går til
toppen, veiledningen står over menyen, innstillinger åpnes. På desktop scroller siden som før med klistret toppfelt.
Fingersveip kan ikke simuleres i Chromium uten skjerm (virker heller ikke på en minimal testside), så selve
sveipet må brukeren sjekke på iPhone.

**Gjenstår:** Brukeren sjekker i Safari på iPhone. Fase 4 og 5.

---

## Økt 82 – 2026-09-25: alltid veiledning, Android-oppskrift

**Brukeren ba om:** Instruksjoner for Android under «Spill i fullskjerm», og at «Start uten veiledning» fjernes.

**Gjort:** B-136. Én startknapp, alle nye spill (også sesongstart) med veiledning; oppskrift for iPhone og Android
(Chrome, Samsung Internet, Firefox) alltid, riktig først.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone 13 og Pixel 7: bare «Start spillet», begge oppskriftene
i riktig rekkefølge, spillet starter med veiledningen på pause. Ingen feil, ingen horisontal scrolling.

**Gjenstår:** Fase 4 og 5.

---

## Økt 81 – 2026-09-25: sikkerhetskopi fjernet

**Brukeren ba om:** Ta bort teksten om egen lagring på iPhone og sikkerhetskopi, og ta bort sikkerhetskopi helt, da
det kan føre til juks.

**Gjort:** B-135. Knappene, koden og CSS-en for sikkerhetskopi er fjernet; tekstene er skrevet om til å peke på konto.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone 13: ingen sikkerhetskopi-knapper på startskjermen eller
i innstillingene, hjemskjerm-tipset uten iPhone-teksten, ingen feil, ingen horisontal scrolling.

**Gjenstår:** Fase 4 og 5.

---

## Økt 80 – 2026-09-25: rettet tekst på kontokortet

**Brukeren ba om:** Teksten sa «topplista når den kommer» (den har kommet) og at spillet «blir» koblet (det kan
kobles, og man velger ved konflikt).

**Gjort:** Ny tekst: konto gir lagring på nett, topplista og sesongen; spillet kan kobles, og finnes det alt et spill
på kontoen, velger man. Ingen andre steder sa «når den kommer».

**Testet:** tsc, lint, `npm test`, build.

**Gjenstår:** Fase 4 og 5.

---

## Økt 79 – 2026-09-25: 🏆 flyttet ved varsellinja

**Brukeren ba om:** Det ble ikke plass til alt i toppraden (skjermbilde: «10×» og klokka kuttet).

**Gjort:** B-134. 🏆 til høyre for varsellinja.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone SE, 13 og 14 Pro Max: ingen knapper eller tekster i
toppfeltet avkortet eller utenfor skjermen, 🏆 40 px høy, ingen horisontal scrolling.

**Gjenstår:** Fase 4 og 5.

---

## Økt 78 – 2026-09-25: garasjen blir med direkte, topplista bak 🏆

**Brukeren ba om:** Spillere som bare har gjort veiledningen, skal kunne være med i sesongen; de som har kommet
langt, må starte på nytt. Topplista skal være mer synlig enn under Økonomi.

**Gjort:** B-133. `canJoinDirectly` = garasjen. 🏆-knapp i toppfeltet med topplista som ark, fjernet fra Økonomi,
sesonglinje på startskjermen.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone 13: 🏆 åpner arket med toppliste og sesongvalg, ingen
horisontal scrolling i toppfeltet, spill i garasjen på dag 8 blir med direkte, spill på verkstedet får spørsmålet.

**Gjenstår:** Fase 4 og 5.

---

## Økt 77 – 2026-09-25: sesongvalget på topplista

**Brukeren ba om:** Krysser man ut popupen om sesongen, må man finne det igjen et annet sted.

**Gjort:** B-132. `SeasonJoin` øverst på topplista, med samme valg som popupen. Popupene henviser dit.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone 13: uten konto vises lenken til kontokortet; med konto
og eldre spill vises «Start sesongen» med bekreftelse, og etter start er spillet med i sesongen. Ingen feil, ingen
horisontal scrolling.

**Gjenstår:** Fase 4 og 5.

---

## Økt 76 – 2026-09-25: sesongbeskjed uten konto

**Brukeren ba om:** De som ikke er logget inn, må også få popupen om sesongen.

**Gjort:** B-131. Popup én gang per sesong for spillere uten konto, med knapp til kontokortet.

**Testet:** tsc, lint, `npm test`, build. Playwright på iPhone 13: popupen vises uten konto, knappen åpner
innstillingene med kontokortet, og den kommer ikke igjen. Ingen feil, ingen horisontal scrolling.

**Gjenstår:** Fase 4 og 5.

---

## Økt 75 – 2026-09-25: sesongen varer i seks måneder

**Brukeren ba om:** Sesongen må vare i 6 måneder.

**Gjort:** B-130. Sesong 1 forlenget i databasen, `start_season` med 26 uker som standard, tekster oppdatert.

**Testet:** tsc, lint, `npm test`, build. Sesongen lest tilbake fra databasen.

**Gjenstår:** Fase 4 og 5.

---

## Økt 74 – 2026-09-25: sesonger, ligaer og felles hendelser (fase 3)

**Brukeren ba om:** Bekreftelse slått av i Supabase; Claude gikk videre med fase 3.

**Gjort:** B-129.
- `supabase/004_sesonger.sql` kjørt: `seasons`, `season_results`, `events`, `league_of`, `close_season`,
  `season_status`, `start_season`, `add_event`, `active_events`, toppliste per sesong med liga. Sesong 1 startet.
- `game/world.ts` (hendelser i motoren, sesongfordel), `net/season.ts` (butikk), `ui/Season.tsx` (synk, spørsmål,
  hendelser på Marked, sesonglinje), `ui/useSeason.ts`, toppliste med sesong/alle og liga, fagbokkapittel.

**Testet:**
- tsc, lint, `npm test` (nye tester: hendelser ganger prisene og logges én gang, sesongfordel, sesong og hendelser
  fra tjenesten), validate, balanse exit 0, build.
- Playwright på iPhone 13 med falsk Supabase: eldre spill får spørsmålet og kan fortsette; hendelsen vises på Marked;
  topplista viser sesonglinje, «Denne sesongen»/«Alle tider» og liga; nytt spill kobles til sesongen med fordel.
  Ingen feil, ingen horisontal scrolling.
- Sikkerhetsrådene i Supabase: bare tilsiktede funn.

**Gjenstår:**
- Brukeren tester med ekte konto: spillet på dag 385 får spørsmålet om Sesong 1.
- Fase 4: ventetid i konsernet. Fase 5: anbud og auksjoner.

---

## Økt 73 – 2026-09-25: bekreftelse med kode

**Brukeren ba om:** Lenken fra e-posten åpnet i Safari (ikke appen på hjemskjermen) og gikk til feil adresse.
Redd for at feil spill kobles til kontoen.

**Gjort:** B-128. Kode fra e-posten skrives inn i appen (opprett konto og glemt passord). Etter en lenke spør appen om
man spiller her eller på hjemskjermen før noe kobles. `redirect_to` med riktig adresse.

**Testet:**
- tsc, lint, `npm test` (ny nettest: feil kode, så riktig), build.
- Playwright på iPhone 13 med falsk Supabase: opprett konto → kode-skjema → feil kode gir melding → riktig kode
  logger inn og laster opp spillet; glemt passord → kode → nytt passord; lenke i «Safari» med et annet spill lokalt →
  ingen stille kobling, «Jeg spiller fra hjemskjermen» logger ut. Ingen feil, ingen horisontal scrolling.

**Gjenstår:**
- Brukeren endrer e-postmalene i Supabase til kode (`{{ .Token }}`) og setter Site URL til
  `https://t-event.github.io/Simulator/` (den manglet `/Simulator/`).
- Brukeren tester på nytt fra appen på hjemskjermen.

---

## Økt 72 – 2026-09-25: toppliste (fase 2)

**Brukeren ba om:** Site URL satt og tokenet slettet. Claude gikk videre med fase 2.

**Gjort:** B-127.
- `supabase/003_toppliste.sql` kjørt som migrasjon: kallenavn, tidslinje med omdømme, juksesperre, `leaderboard`
  og `my_rank`.
- `net/leaderboard.ts`, `ui/Leaderboard.tsx` (under Verket → Økonomi), kallenavn i kontokortet.
- `balance.ts --vekst` måler veksten per nivå (grunnlaget for grensene).

**Testet:**
- tsc, lint, `npm test` (to nye nettester: tidslinja med omdømme, kallenavn og toppliste), validate, balanse
  exit 0, build.
- Playwright på iPhone 13 og desktop med falsk Supabase: topplista uten konto med oppfordring, bytte av liste,
  innlogging fra topplista, kallenavn som er tatt → feilmelding, kallenavn OK → «Endre kallenavn», egen rad uthevet,
  ingen feil, ingen horisontal scrolling, alle knapper minst 40 px.
- `leaderboard('verdi', 10)` kjørt i databasen: tom liste uten feil. Sikkerhetsrådene viser bare tilsiktede funn.

**Gjenstår:**
- Brukeren tester med ekte konto: kallenavn og at man dukker opp på lista etter et døgn i spillet.
- «Leaked password protection» kan slås på under Authentication → Settings i Supabase (anbefalt).
- Fase 3: sesonger, ligaer og felles hendelser.

---

## Økt 71 – 2026-09-25: databasen satt opp gjennom Supabase-connectoren

**Brukeren ba om:** Ordne alt i Supabase. La til Supabase som connector.

**Gjort:**
- Migrasjonen `grunnlag_konto_og_lagring` (= `supabase/001_grunnlag.sql`) er kjørt i prosjektet: `profiles`,
  `saves`, `snapshots`, `config`, triggere, `delete_my_account` og tilgangsregler.
- Sikkerhetsrådene fra Supabase rettet med migrasjonen `sikkerhet_funksjoner` (= `supabase/002_sikkerhet.sql`):
  låst `search_path` og ingen API-tilgang til trigger-funksjonene, «slett konto» bare for innloggede.
- GitHub Secrets er lagt inn av brukeren, og publiseringen med nøkler gikk grønt (kjøring 81).
- CLAUDE.md: connectoren og regelen om at `supabase/` speiler databasen.

**Testet:** tabellene og reglene lest tilbake fra databasen; sikkerhetsrådene viser bare det tilsiktede: innloggede kan kalle «slett konto».

**Gjenstår:**
- Brukeren setter Site URL (Authentication → URL Configuration) til `https://t-event.github.io/Simulator/`.
  Connectoren kan ikke endre Auth-innstillinger.
- Brukeren tester opprett konto, bekreftelse, innlogging på to enheter og glemt passord.
- Tokenet som ble limt inn i chatten, bør slettes i Supabase (Access Tokens).
- Fase 2: toppliste.

---

## Økt 70 – 2026-09-25: nøklene ut av repoet

**Brukeren ba om:** Ingen koder på GitHub, de skal i GitHub Secrets. Og: holder gratisversjonen av Supabase?

**Gjort:** B-126. URL og nøkkel leses fra miljøet, bygget får dem fra secrets, `.env.local` er ignorert. Uten
nøkler er alt på nett slått av og spillet virker som før.

**Testet:**
- tsc, lint, `npm test`, build. Bygget inneholder verken URL eller nøkkel når miljøet er tomt.
- Playwright på iPhone 13 med `.env.local` og falsk Supabase: samme løp som i økt 69, alt OK.
- Playwright uten `.env.local`: ingen kontokort, ingen feil.

**Gjenstår:** *(ordnet i økt 71 gjennom Supabase-connectoren)*
- Brukeren åpner miljøet for `api.supabase.com` (og gjerne `<prosjekt>.supabase.co`) under Network access, og
  legger inn en Supabase personal access token som miljøvariabelen `SUPABASE_ACCESS_TOKEN` (aldri i chatten).
- Neste økt med token: kjør `supabase/001_grunnlag.sql` via Management API
  (`POST https://api.supabase.com/v1/projects/<ref>/database/query`), sett `site_url` til
  `https://t-event.github.io/Simulator/` (`PATCH /v1/projects/<ref>/config/auth`), lag ny publishable-nøkkel
  (`POST /v1/projects/<ref>/api-keys`) og slett den gamle, og verifiser at tabellene og reglene finnes.
- GitHub Secrets `SUPABASE_URL` og `SUPABASE_KEY` må brukeren legge inn selv (ingen verktøy for det her).

---

## Økt 69 – 2026-09-25: konto og lagring på nett (fase 0 og 1)

**Brukeren ba om:** Konto med e-post og passord, nåværende lagring koblet til kontoen, Supabase. Svar på de åpne
spørsmålene: ingen grupper på topplista ennå, sesonger erstatter nytt spill+ med en pitteliten fordel, lett å starte
ny sesong, forslag til storkunder.

**Gjort:** B-125, svarene notert i `docs/PLAN-NETT.md`.
- `src/net/`: klient mot Supabase over fetch, økt, lagring på nett, kobling ved innlogging, funksjonsbryter.
- `ui/Account.tsx`: kontokortet på startskjermen og i innstillingene, sky i toppen.
- `supabase/001_grunnlag.sql`.
- CI kjører også nettestene.

**Testet:**
- tsc, lint, `npm test` (12 nye tester av nettlaget mot en falsk tjeneste), validate, balanse exit 0, build.
- Playwright på iPhone 13 og desktop med falsk Supabase (`page.route`):
  - opprett konto → beskjed om bekreftelse; logg inn ubekreftet → beskjed; logg inn → ingen spill ennå
  - nytt spill lastes opp med eier, sky i toppen, innstillingene viser «Lagret på nett kl.»
  - logg ut; tom nettleser + logg inn → spillet hentes og «Fortsett» vises
  - lokalt spill uten konto + spill på nett → valg, «Herfra» laster opp
  - sikkerhetskopi fra en annen konto avvises
  - lenke for nytt passord viser skjemaet og rydder adressen
  - ingen feil, ingen horisontal scrolling, alle knapper minst 40 px
- Ekte innlogging kan ikke testes fra sandkassen (den når ikke supabase.co). Brukeren tester.

**Gjenstår:**
- Brukeren limer inn `supabase/001_grunnlag.sql` og setter Site URL i Supabase.
- Brukeren tester opprett konto, bekreftelse, innlogging på to enheter og glemt passord.
- Fase 2: toppliste.

---

## Økt 68 – 2026-09-25: plan for konto, lagring på nett, toppliste og konkurranse

**Brukeren ba om:** Svar på om toppliste og lagring uten fil er mulig med GitHub Pages, uten at noen mister spillet,
og en skikkelig plan for et spill man ikke blir ferdig med – med konto (e-post og passord), Supabase, nivå 1 og 2,
og litt ventetid som varierer.

**Gjort:** B-124 og `docs/PLAN-NETT.md` med svar på spørsmålene, grunnlaget i Supabase, tabeller, reglene for å
utvikle uten at noen mister spillet, seks faser, ventetidene og juksesperren.

**Testet:** Ingen kode endret.

**Gjenstår:**
- Brukeren oppretter Supabase-prosjekt og sender URL og offentlig nøkkel.
- Brukeren svarer på de åpne spørsmålene i planen (grupper på topplista, sesongfordel, storkunder).
- Deretter fase 0 og 1.

---

## Økt 67 – 2026-09-25: kortere Konsern-side

**Brukeren ba om:** Konsern-siden er for lang og bør bli mer intuitiv.

**Gjort:** B-123. Forklaringen er foldet sammen, hvert verk har én hovedknapp, kjøp og felles funksjoner er samlet i
ett kort, salgsdirektøren er kortere, og alle knapper er minst 40 px høye.

**Testet:**
- tsc, lint, `npm test`, validate, balanse exit 0, build.
- Playwright på iPhone 13:
  - uten verk og med tre verk og salgsdirektør
  - siden er 2 393 px høy, mot 3 475 px før
  - ingen knapper under 40 px
  - utbygging, salg og innstillingene for salgsdirektøren virker
  - ingen feil og ingen horisontal scrolling
- Desktop 1280 px: ingen feil.

**Gjenstår:** Ingenting.

---

## Økt 66 – 2026-09-25: skru salgsdirektøren av og på

**Brukeren ba om:** En bryter under Forespørsler for å skru salgsdirektøren av og på. Brukeren spurte også hva
«Elveverket» er, men fant selv ut at det er navnet på et datterverk.

**Gjort:** B-122. Bryteren står under Salg → Forespørsler og på Konsern.

**Testet:**
- tsc, lint, `npm test` (direktøren signerer ingenting når den er av), balanse exit 0.
- Playwright på iPhone 13 med en gammel lagring uten det nye feltet:
  - bryteren er på fra start
  - klikk skrur den av
  - valget er lagret etter at siden er lastet på nytt
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 65 – 2026-09-25: det skal lønne seg å investere i konsernet

**Brukeren ba om:**
- Å kunne gå fra stålverk til storverk i konsernet.
- At det ikke skal lønne seg å bare spare til 10 mrd.

**Gjort:** B-121.
- Et verk er verdt 60 døgns overskudd, så et kjøp senker ikke konsernverdien.
- Høyere overskudd: stålverk 5 mill. kr og storverk 20 mill. kr per døgn.
- Man kan selge datterverk.
- «Bygg ut til storverk» er hovedknappen på hvert stålverk.
- Nytt flagg i testspilleren: `--sparer`.

**Testet:**
- tsc, lint, `npm test`.
- Balanse exit 0.
- `--vansker` med og uten `--sparer`: å investere vinner omtrent 150 døgn før (flink) og 300 døgn før (nybegynner).
- Playwright på iPhone 13:
  - to stålverk, ett bygget ut til storverk og ett solgt
  - kassa og konsernverdien stemmer
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 64 – 2026-09-25: konsernforskning

**Brukeren ba om:** Flere ting å forske på når konsernet åpnes.

**Gjort:** B-120. Ni konsernprosjekter, et nytt kapittel i fagboka med quiz, egen gruppe under Forskning og en
statuslinje på Konsern-fanen.

**Testet:**
- tsc, lint, `npm test` (ny test for konsernforskningen), og skriptet som sjekker at alle id-er finnes.
- Balanse exit 0, `--vansker`.
- Playwright på iPhone 13, låst og åpnet konsern:
  - gruppen «Kommer når konsernet åpnes» vises når konsernet er låst
  - kapitlet åpnes fra Forskning, og det går an å forske
  - statuslinja på Konsern-fanen stemmer
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 63 – 2026-09-25: fullt lager og et tydeligere konsern

**Brukeren ba om:**
- Varsel når lageret er fullt og ovnene står.
- Konsernet var rart: med bare stålverk fikk man ikke kjøpt storverk eller felles innkjøp og salgskontor. Det
  skulle bli mer intuitivt, morsomt og bedre forklart.

**Gjort:**
- B-118: varsel om fullt lager.
- B-119 for konsernet:
  - forklaring i steg og «Neste steg»
  - grunner og nedtelling på grå knapper
  - utbygging fra stålverk til storverk
  - navn på verkene, milepæler og produksjonsrekorder
- Testspilleren følger «Neste steg».

**Testet:**
- tsc, lint, `npm test` (nye tester for konsernet og varselet om fullt lager), bygg.
- Balanse og `--vansker`.
- Playwright på iPhone 13 med bare stålverk og lite penger:
  - «Neste steg» foreslår det det er råd til
  - alle 8 grå knapper forklarer hvorfor de er grå
  - «Bygg ut til storverk» vises
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 62 – 2026-09-25: salgsdirektør i konsernet

**Brukeren ba om:** Når konsernet er åpnet, skal man kunne ansette noen som tar kontraktene og avtalene automatisk.
Det skal være meget dyrt.

**Gjort:** B-117. Salgsdirektør under Verket → Konsern. `assessOffer` er felles for Salg og direktøren.

**Testet:**
- tsc, lint, `npm test` (ny test for direktøren), bygg, balanse.
- Skript: 30 døgn med og uten direktør på tre lagrede storverk.
- Playwright på iPhone 13:
  - en gammel lagring uten direktørfeltet åpner uten feil
  - ansettelse fra Konsern-fanen virker, og merknaden vises på Salg
  - ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 61 – 2026-09-25: egen plass for varslene

**Brukeren ba om:** Varslene bør ha en egen plass. De kommer i veien for å signere kontrakter og kjøpe ting, så man
må pause og krysse dem ut først.

**Gjort:** B-116. Varsellinja er en fast linje i toppfeltet med bjella. De flytende varslene er fjernet.

**Testet:**
- tsc, lint, `npm test`, bygg.
- Playwright på iPhone 13 og på desktop:
  - linja er alltid 40 px høy
  - ingen varsler ligger oppå siden
  - 13 kontrakter ble signert på 10× uten å pause
  - trykk åpner varsellista
  - nytt spill starter uten feil
  - ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 60 – 2026-09-25: tekst om overslag

**Brukeren ba om:** «Støv i hvelvet må suges bort» så ut som en skrivefeil.

**Gjort:** Teksten er skrevet om med vanlige ord: «Overslag i ovn 1: en gnist slo over i støvet på ovnstaket
(hvelvet). Taket må støvsuges.» Fagordet står i parentes, som regelen om nybegynnere sier.

**Testet:** tsc, `npm test`, balanse exit 0. Varselet havner fortsatt under «Drift og havarier».

---

## Økt 59 – 2026-09-25: varselinnstillinger

**Brukeren ba om:** Mer spesifikke varselinnstillinger med flere valg.

**Gjort:** B-115. Sju temaer som kan slås av og på, og valg av hvor lenge et varsel står.

**Testet:**
- tsc, lint, `npm test` (ny test for temaene), bygg.
- Skript: alle varseltekster fra 40 døgn i fem lagrede spill får et tema.
- Playwright på iPhone 13:
  - en gammel lagring uten de nye feltene åpner uten feil
  - med «Ferie og sykdom» slått av kom ingen ferie- eller sykdomsvarsler på 10×
  - ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 58 – 2026-09-25: varslene er i veien

**Brukeren ba om:** Varslene som kommer opp, er litt i veien. Brukeren valgte «én smal linje» blant fire forslag.

**Gjort:** B-114. Ett varsel på én linje med «+N», trykk åpner varsellista, ✕ eller sveip fjerner.

**Testet:**
- tsc, lint, `npm test`, bygg.
- Playwright på iPhone 13 på 10×:
  - varselet er 42 px høyt og viser «+1» når et til venter
  - trykk åpner varsellista og tømmer køen
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 57 – 2026-09-25: gjennomgang av hele spillkoden (runde 2)

**Brukeren ba om:** Sjekk over hele spillkoden, se etter feil og bugs, og fiks dem.

**Gjort:** B-113. Åtte feil rettet, se beslutningen. Ny test for støpingen ved fullt lager.

**Testet:**
- tsc, lint, `npm test` (15 tester), `validate.ts`, bygg.
- Balanse: exit 0.
- Skript: alle id-er i tabellene finnes; invariantsjekker på lagrede spill i 60 døgn uten funn (de eneste avvikene
  lå i håndlagde testfiler).

**Gjenstår:** Ingenting fra brukerens liste.

---

## Økt 56 – 2026-09-25: bjella, kontrollrommet, elektrodebrudd, lageret, støtteroller og utstyrsmenyer

**Brukeren ba om:**
- Ikke tall på bjella for gode nyheter.
- At man ikke må slå på oksygenet for tidlig i smeltingen.
- At rensingen starter med strømmen av.
- Færre elektrodebrudd med alt oppgradert.
- At ferdigvarelageret ikke går over maks.
- At anbefalte planleggere og skrapklassere tar høyde for fravær, og at avløsere anbefales.
- Å se pengene i utstyrsmenyen.
- At støpingen åpner menyen slik ovnen gjør.
- Kortere og mer intuitive utstyrsmenyer.

**Gjort:** B-107 til B-112.

**Testet:**
- tsc, lint, `npm test` (14 tester), `validate.ts`, bygg.
- Balanse: 8 / 25 / 67 / 141, nybegynner 144, kontrollrommet 5★ og 1★, exit 0.
- Egne skript:
  - Temperaturen i smeltingen og rensingen.
  - Lageret: før gikk det 16 t over, nå stopper det på 39 992 av 40 000 t.
- Playwright på iPhone 13: støpingen åpner menyen, kassa vises, ovnsfanene virker. Ingen feil og ingen horisontal
  scrolling.

**Gjenstår:** Ingenting fra brukerens liste.

---

## Økt 55 – 2026-09-25: konsern og nytt sluttmål

**Brukeren ba om:** Når storverket er ferdig bygget, skal man kunne utvide til et konsern med flere verk, så spillet
ikke blir så fort ferdig. Milliardmålet skal bli mye større.

**Gjort:**
- B-106: fanen Verket → Konsern med datterverk, modernisering og felles innkjøp og salg.
- Sluttmålet er 10 mrd. i konsernverdi. Storverk-kortet og sluttskjermen er oppdatert.
- Testspillerne bygger konsern.
- Underfanene på Verket krymper, så fire faner får plass på 320 px.

**Testet:**
- tsc, lint, `npm test` (12 tester, ny test for konsernet), `validate.ts`, bygg.
- Balanse: 8 / 25 / 67 / 141, nybegynner 142,5, exit 0.
- `--vansker`: flink vinner ca. dag 342, nybegynner ca. dag 380. Ingen konkurs.
- Playwright på iPhone 13 og 320 px: Konsern-fanen og kjøp av datterverk virker. Ingen feil og ingen horisontal
  scrolling.

**Gjenstår:** Ingenting fra brukerens liste.

---

## Økt 54 – 2026-09-25: strøm, fravær, kurs, varsler og mye småtteri

**Brukeren ba om:**
- Strømavtaler med mer å si.
- Nytt spill+ etter «Spill videre».
- For mange fagpoeng ved seier.
- Fravær per ansatt og advarsler.
- Å se om produksjonen holder ved utkobling.
- Skrapklasser og reseptkrav i forespørsler.
- Hjelp til å installere på hjemskjermen.
- Sjeldnere kurs.
- Varsler som forsvinner for fort, og en logg som ligger for gjemt.
- Konsern.
- Automatisk bytte blokk → emner.
- Kapasitet for rammeavtaler.

**Gjort:**
- B-098 til B-105.
- Nytt spill+ og hjemskjerm-hjelp ligger også under ⚙️.
- Fagpoengene ved seier ble håndtert i forrige runde (B-085/B-092): mer å forske på og lavere sats på storverket.

**Testet:**
- tsc, lint, `npm test` (11 tester), bygg.
- Balanse: 8 / 25 / 67 / 141, nybegynner 142,5, exit 0.
- Playwright på iPhone 13:
  - «Siste hendelser» og advarsel-hintet
  - kapasiteten for avtaler
  - «Gi advarsel» under Fravær
  - teksten om kursrunder
  - hjemskjerm-hjelp i ⚙️
  - ingen feil og ingen horisontal scrolling
- Headless: strømsammenligningen samles per døgn.

**Gjenstår:** Konsern med flere verk og et større sluttmål (neste runde).

---

## Økt 53 – 2026-09-25: storverket, slutten av spillet, kontrollrommet og tester

**Brukeren ba om:**
- For lite å forske på etter storverket.
- Å gjennomføre alle forbedringsforslagene (kontrollrom, varselliste, symboler på målere, utfordringer og nytt spill+,
  fagboka fra kontrollrommet, tester).
- Oksygenråd i smeltingen, fosfor i avslaggingen og ikke oksygen i tappingen.
- Ekstreme fagpoeng på storverket.
- Mange overslag, strenggjennombrudd og elektrodebrudd.
- Anbefalte støtteroller når skiftene er fulle.
- Ingenting skjedde ved 1 mrd.
- Tredje ovn er bortkastet fordi støpingen er for treg.

**Gjort:** B-085 til B-097 (se BESLUTNINGER).

**Underveis:** En `git checkout` av `simpleRunner.ts` tok med seg endringer som ikke var committet. De ble lagt inn
på nytt og kontrollert mot tidligere diff og balansetall. Et forsøk på en kalk-knapp ble forkastet fordi den ikke
ga målbar effekt.

**Testet:**
- tsc, lint, prettier, `npm test` (10 tester), `validate.ts`, bygg.
- Balanse: 8 / 26 / 66 / 137, nybegynner 154, exit 0. Den flinke testspilleren vinner rundt dag 200.
- Playwright på iPhone 13 og 320 px bredde:
  - toppfeltet uten kutt og uten horisontal scrolling
  - varsellista, utfordringskortet, anbefalte roller, varselvalg og det nye utstyret
  - en hel charge i kontrollrommet med oksygenråd, uten oksygen i tappingen, med «Hvorfor?» i resultatet

**Gjenstår:** Følge med på om fagpoeng og havarier føles riktige på storverket nå.

---

## Økt 52 – 2026-09-25: blokk-forespørsler, varsel før produktbytte og fravær med 4–5 skift

**Brukeren ba om:**
- Hvorfor det kom forespørsler på blokker når verket ikke kunne lage dem.
- Et varsel før man går fra blokker til emner.
- Ingen fraværsvarsler med 4–5 skift, med mindre skiftgangen går ned.

**Gjort:**
- B-082: forespørsler og avtaletilbud på produkter verket ikke lager lenger, trekkes tilbake.
- B-083: fravær som de ekstra lagene dekker, står bare i loggen. Utløpt fravær fjernes før varslene.
- B-084: engangstips når strengstøping kan kjøpes, og bekreftelse ved «Kjøp» med konsekvensene.

**Testet:**
- tsc, lint, bygg og balanse (8 / 26 / 66 / 134, nybegynner 155, exit 0). Et første forsøk med sperre på aktive
  rammeavtaler ga −17 mill. kr for frø 1 og ble forkastet.
- Headless: blokk-forespørsler trekkes tilbake en time etter byttet. Over 30 døgn med 4 lag er 14 av 58
  fraværsmeldinger varsel (bare når et skift ellers ville gått tapt), med 3 lag 53 av 53.
- Playwright på iPhone 13: tipset vises, bekreftelsen vises, og «Ja, bytt» setter strengstøpingen i drift. Ingen feil.

**Gjenstår:** –

---

## Økt 51 – 2026-09-25: antall aktive avtaler på fanen

**Brukeren ba om:** Avtaler-knappen under Salg skal vise hvor mange aktive avtaler man har.

**Gjort (B-081):** «Avtaler (1)» med antall aktive. Nye tilbud får et grønt «Ny»-merke.

**Testet:** tsc, lint, bygg, balanse (exit 0). Playwright på iPhone 13: «Avtaler (1)» og «Avtaler (1) Ny», fanen
på to linjer, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 50 – 2026-09-25: avslagging og tapping mer intuitivt

**Brukeren ba om:** Avslaggingen (8,6 t slagg, måler helt til høyre) og tappingen (1614 °C, grønt fra 1616 °C)
fungerte ikke intuitivt.

**Gjort (B-080):**
- Hovedknappene er grå til riktig tidspunkt og oransje når det er riktig. «Tapp likevel (for kaldt)» når badet er for kaldt.
- Slaggmåleren er skalert til slagget da tippingen startet.
- Avslaggingen går saktere på slutten, så det grønne feltet varer ca. 4 s.
- Hintene viser sekunder igjen og om temperaturen stiger. Ovnstegningen kuttes ikke lenger nederst når den tippes.

**Testet:** tsc, lint, bygg, balanse (exit 0, 4★ / 1★). Playwright på iPhone 13 gjennom en hel charge med skjermbilder
midt i avslagging og tapping, ingen feil, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 49 – 2026-09-25: karbonet for lavt og temperaturen stiger i rensingen

**Brukeren ba om:** I rensingen kunne ikke karbonet justeres (0,002 %), og temperaturen steg selv om alt var av.

**Gjort (B-079):** Strømmen kan nå slås helt av (nivå 0). Automatikken holder karbonet over 0,12 % under
smeltingen. Rensingen har fått en «Karbon»-knapp når karbonet er for lavt, og hintene i rensing og tapping er nye.
Testspilleren følger rådet.

**Testet:** tsc, lint, bygg, balanse (exit 0, 4★ / 1★, P 0,0201). Headless: oksygen hele smeltingen gir 0,115 % C
ved rensing. Strøm av kjøler 1650 → 1620 °C på 30 s. Karbon på: 0,01 → 0,05 % på 9 s. Playwright på iPhone 13:
blåste for lenge, strøm av, karbon inn igjen, tappet med 4★, ingen feil.

**Gjenstår:** –

---

## Økt 48 – 2026-09-25: «3 av 3 skift» med 4-skift

**Brukeren ba om:** Folk viste «3 av 3 skift» selv om verket hadde flere skiftlag.

**Gjort (B-078):** Skiftkortet skiller nå skift i døgnet og skiftlag: «døgnet rundt med 4 skiftlag · 4-skift». Det
står også når fraværet gjør at færre lag er fulle. Bemanningstabellen regner og viser per lag når det er 4–5 lag.

**Testet:** tsc, lint, bygg, balanse (exit 0). Playwright på iPhone 13 med en lagring med 4 lag og 2 borte: teksten
stemmer, tabellen viser «Trengs 4 lag», ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 47 – 2026-09-25: bare den enkle styringen i kontrollrommet

**Brukeren ba om:** Fjerne den fulle styringen og bare bruke den enkle.

**Gjort (B-077):** Knappen til det fulle kontrollrommet er borte. `ExpertControl.tsx`, HMI-komponentene i
`src/components/`, `controlroom.css`, `useMediaQuery`, `sim/commands.ts` og `recharts` er slettet. README, DESIGN og
CLAUDE.md er oppdatert (også tabellen over stegene etter B-076).

**Testet:** tsc, lint, `validate.ts`, balanse (exit 0, enkel styring 4★ / 1★), bygg, Playwright på iPhone 13
gjennom en hel charge (ingen feil, ingen horisontal scrolling).

**Gjenstår:** Ingenting fra denne økta.

---

## Økt 46 – 2026-09-25: kontrollrommet med oksygen, avslagging og øse

**Brukeren ba om:** Oksygen styrt samtidig med strømmen, ikke automatisk avslagging (for mye → stål ut
slaggdøra), rette opp ovnen når øsa er full (ellers renner den over), og vanskeligere å få perfekt charge.

**Gjort (B-076):** `simpleRunner.ts` og `SimpleControl.tsx` er skrevet om: oksygenbryter ved siden av
strømknappene, manuell tipping mot slaggdøra med slaggmåler og søl-alarm, øse-måler og «Rett opp ovnen» ved
tapping, fem deler i stjerneberegningen og strengere krav. Tapt stål trekkes fra chargen i `engine.ts`.
Testspilleren i `balance.ts` følger de nye stegene. Tappingen går litt fortere (fart 8).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 134, nybegynner 155, enkel styring 4★ / 1★, exit 0), Playwright
på iPhone 13 gjennom alle stegene (ingen feil i konsollen, ingen horisontal scrolling).

**Gjenstår:** Følge med på om spillerne synes avslaggingen og øsa er for vanskelig eller for lett.

---

## Økt 45 – 2026-09-25: flere oppgraderinger på storverket

**Brukeren ba om:** Flere oppgraderinger på storverket (en kollega hadde alle etter ti minutter).

**Gjort (B-075):** Sju nye oppgraderinger (ovn nr. 3, 6 strenger, vakuumavgassing, havnekai, skrapterminal,
varmegjenvinning, valseverk nr. 2). Mindre støping på samme nivå skjules.

**Testet:** tsc, lint, balanse (exit 0), `--vansker` (vinner rundt dag 207), headless-liste over utstyret per sted.

**Gjenstår:** kontrollrommet (oksygen samtidig med strøm, manuell avslagging, tapping som renner over,
vanskeligere 5★).

---

## Økt 44 – 2026-09-25: oppgraderinger per ovn

**Brukeren ba om:** Oppgraderinger skal kjøpes per ovn, ikke komme på begge.

**Gjort (B-074):** Egen type og eget utstyr per ovn, per-ovn-beregning av charger/strøm/slitasje (`unitView`),
utstyrsark gruppert per ovn, migrering av gamle lagringer, testspilleren kjøper per ovn.

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 134, nybegynner 155, exit 0), headless: bare ovn 1 bygges om til
lysbue med transformator, ovn 2 lager fortsatt 5 t-charger; Playwright: utstyrsarket per ovn.

**Gjenstår:** flere oppgraderinger på storverket, kontrollrommet.

---

## Økt 43 – 2026-09-25: 4- og 5-skift

**Brukeren ba om:** 4 og 5 skift, så mange ansatte gir mening.

**Gjort (B-073):** Skiftlag inntil fem, med fridager i turnusen: bedre trivsel, mindre sykdom, raskere læring og
dekning av fravær. Folk → Skift viser ordningen og har «Ansett til 4-skift/5-skift».

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 142, nybegynner 155, exit 0), headless-test på storverket med 3, 4 og
5 lag.

**Gjenstår:** oppgraderinger per ovn, flere oppgraderinger på storverket, kontrollrommet.

---

## Økt 42 – 2026-09-25: ansatte, småfikser, innstillinger og bank

**Brukeren ba om:** Sjekk om murere, selgere og alle ansatte virker; hjemskjerm-tips før start; varsel på Folk
når folk mangler; fagpoeng én gang i uka; 4 og 5 skift; flere oppgraderinger på storverket; kontrollrommet med
oksygen samtidig som strøm, manuell avslagging og tapping som kan renne over, og vanskeligere 5★; innstillinger og
bank ut av Forskning; oppgraderinger per ovn; for lite tid til å svare på 10×.

**Gjort i denne runden:** B-070 (målt alle roller, Folk viser effekten, testspiller-feil ved bytte av støping),
B-071 (fagpoeng ukentlig, «!» på Folk, svarfrist i 1×, hjemskjerm-tips), B-072 (⚙️ og bank under Økonomi).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 136, nybegynner 150, exit 0), frø 7–10, headless-målinger av
rollene, Playwright på iPhone SE og iPhone 13.

**Gjenstår:** 4 og 5 skift, oppgraderinger per ovn, flere oppgraderinger på storverket, kontrollrommet – tas i
neste runder. Spørsmålet om storverket henger sammen med flere oppgraderinger.

---

## Økt 41 – 2026-09-25: tips når farten går ned

**Brukeren ba om:** Et hint første gang farten går ned automatisk, og hvorfor.

**Gjort (B-069):** Engangstipset «Hvorfor gikk farten ned til 1×?» etter første kort som setter ned farten fra
3× eller 10×.

**Testet:** tsc, lint, balanse (exit 0), headless-test: kort på 10× → farten 1× → tipset kommer, og bare én gang.

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 40 – 2026-09-25: flytte-hintet rett over målkortet

**Brukeren ba om:** «Du kan flytte inn … Trykk her» og målkortet rett under ga ikke mening (skjermbilde).

**Gjort (B-068):** Hintet skjules på Oversikt; målkortet får grønn ramme når du kan flytte. På Anlegg og Økonomi
vises hintet fortsatt.

**Testet:** tsc, lint, Playwright på iPhone-størrelse (ingen hint på Oversikt, hint på Økonomi som åpner målkortet).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 39 – 2026-09-25: hint om skrapforskning for nye kvaliteter

**Brukeren ba om:** En spiller skjønte ikke at han måtte forske fram flere skraptyper for å lage høykarbon – det
bør være et hint.

**Gjort (B-067):** Hint på Verket, råd på Resept og på forespørsler under Salg når kvaliteten trenger skrap som
ikke er forsket fram. Beskrivelsen av «Rent nyskrap» nevner kvalitetene.

**Testet:** tsc, lint, balanse (exit 0), headless-test av hvilke kvaliteter som trenger hvilken forskning på nivå
1–3, Playwright på iPhone-størrelse (hint på Verket og Resept, ingen konsollfeil).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 38 – 2026-09-25: Oversikt som hopper, og stilling i oppsigelser

**Brukeren ba om:** Oversikt hoppet opp og ned når «Venter på» kom under ovnen; oppsigelsesvarselet skal si
hvilken stilling personen hadde.

**Gjort (B-066):** Fast høyde på teksten i produksjonslinja og ovnstilstanden under Anlegg. Oppsigelser og skader
viser stilling og peker til Folk → Ansett.

**Testet:** tsc, lint, balanse (exit 0), Playwright på iPhone SE og iPhone 13 med spillet på 10× i 18 sekunder:
knapperaden hadde samme høyde hele tida.

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 37 – 2026-09-25: tall på Ovn-knappen

**Brukeren ba om:** Varsel på Ovn-knappen i Oversikt når man kan kjøpe oppgraderinger (B-061 dekket bare Anlegg).

**Gjort (B-065):** Tall på Skrap, Ovn, Støping og Lager i produksjonslinja; et trykk åpner utstyret for stedet.

**Testet:** tsc, lint, Playwright på iPhone-størrelse (tallet på Ovn, trykk åpner Ovn-utstyret, ingen konsollfeil).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 36 – 2026-09-25: fagpoeng når man står fast, og «Flytt inn»

**Brukeren ba om:** En kollega på stålverket syntes det var for vanskelig å få fagpoeng – man må kunne tjene
fagpoeng når man står fast. «Flytt inn under Mål lenger ned» ble ikke funnet.

**Gjort (B-064):** Forskningssamarbeid (kjøp fagpoeng én gang per døgn), hint på Verket når hovedutstyret
venter på fagpoeng, «Slik får du fagpoeng» på Forskning, flytte-hintet ruller til målkortet, og målkortet står
øverst når du kan flytte. Nytt felt `fpDealDay` med standardverdi i `migrate()`.

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 133, nybegynner storverket median 165, exit 0),
Playwright på iPhone-størrelse (kjøp av samarbeid, hint, flytte-hint til målkortet, ingen konsollfeil).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 35 – 2026-09-25: skjult automatikk og skrapvarsel

**Brukeren ba om:** Sjekke om omforing skjer automatisk uten reparatør/plan, og om skrapmiksen fikser seg uten
skrapklasser. Varsel på Skrap-knappen når en skraptype mangler.

**Gjort (B-063):** Planleggeren legger ikke lenger om resepten – bare skrapklasseren. Omforing skjer ikke av seg
selv (testet), men loggen og Vedlikehold-kortet sier nå hvem som bytter foringen, og spesialisten fra rådgiveren
kalles ikke lenger «reparatøren». Skrap-knappene har «!» og «Mangler …».

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 133, nybegynner OK, exit 0), headless-test av omforing
uten automatikk, Playwright på iPhone-størrelse (varsel på Skrap og Kjøp skrap, linja på Vedlikehold).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense) fra økt 34.

---

## Økt 34 – 2026-09-25: foringsvarsel, merke på Anlegg og balanse

**Brukeren ba om:** Varselet om å bytte foring skal gå til vedlikeholdskortet; Anlegg skal vise når en
oppgradering kan kjøpes; test om spillet er for lett eller vanskelig på de forskjellige nivåene og gjør balansen bra.

**Gjort:** B-061 (varsel åpner Vedlikehold, tall på Anlegg). B-062: ny `--vansker`-rapport og nybegynnerprofil i
testspilleren (også i CI), flere fagpoeng for store charger og billigere forskning på stålverket, bytte av støping
krever at gamle kontrakter er levert, advarsel når et kjøp tømmer kassa, hint om kreditt/lån når planleggeren ikke
får kjøpt, anslaget på Salg regner med rammeavtaler og viser «Knapt», «Neste store steg» på målkortet.

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 133, nybegynner storverket dag 131–198, exit 0).
Playwright på iPhone-størrelse: varselet og hintet åpner Anlegg med Vedlikehold øverst, Anlegg-merket, målkortet,
ingen konsollfeil, ingen horisontal scrolling.

**Gjenstår:** storverket har lite å gjøre de siste ca. 90 døgnene før 1 mrd. – spør brukeren om mer innhold der
eller lavere vinnergrense.

---

## Økt 33 – 2026-09-25: nivåene forklart i teksten

**Brukeren ba om:** «Fra støperiet» er ikke selvforklarende for en ny spiller.

**Gjort (B-060):** `stageRef()` skriver nivået som «støperiet (neste nivå)» eller «stålverket (nivå 4 av 5)».
Brukt på Marked, Folk, utstyr, forskning, søkere og natt-tipset. Målkortet på Verket viser «(nivå X av 5)».

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 159, exit 0), Marked og Folk på iPhone-størrelse
(ingen konsollfeil, ingen horisontal scrolling).

**Gjenstår:** ingenting kjent.

---

## Økt 32 – 2026-09-25: tekstene i spillet

**Brukeren ba om:** Endre quiz-spørsmålet om analyse, og se over tekst i spillet så den gir mening.

**Gjort (B-059):** Gikk gjennom quiz, fagbok, forskning, beskrivelser, hendelser, tips, meldinger og skjermtekst.
Rettet utdaterte henvisninger (digel, «Foreslå billigste resept», lån under Forskning), dager/døgn, fagord uten
forklaring og desimalpunktum. Innleid planlegger virker uten automatikk-forskning.

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 159).

**Feil i publiseringen av #39:** kontrollrom-sjekken i `balance.ts` sammenlignet farten etterpå med farten
før et hendelseskort satte 1×. Rettet til å sammenligne med farten da kontrollrommet åpnet. Lærdom lagt i CLAUDE.md.

---

## Økt 31 – 2026-09-25: avbryte ordrer, flere forespørsler og reseptguide

**Brukeren ba om:** Avbryte ordrer med straff; flere ordrer å lage i garasje og verksted; gjennomgang av hvordan
man lager riktig resept når en ny kvalitet låses opp.

**Gjort:** B-056 (flere forespørsler, mest i kvaliteter man kan lage), B-057 (avbryt ordre), B-058
(reseptguide).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 159). I Node: guiden går gjennom alle stegene når spilleren gjør
dem; avbrutt ordre gir bot og omdømmetap. Playwright (iPhone 13): guide med «Vis meg», bekreftelse ved avbryt,
lenke i Resept-fanen, 390 px, ingen feil.

---

## Økt 30 – 2026-09-25: gjennomgang av koden

**Brukeren ba om:** Se over all kode og fiks feil.

**Gjort (B-055):** Fuzz-test av motoren (tilfeldige handlinger, invarianter, lagring) og klikk-gjennom av alle
sider på alle nivåer. Fire feil rettet (støpefeil solgt mot spillerens valg, ansettelse for fravær, ferdighet for
fraværende, natt-tipset).

**Testet:** tsc, lint, build, balanse (8 / 26 / 65 / 161), prosessmodellen (validate). Ingen krasj, NaN eller
konsollfeil; ingen horisontal scrolling.

---

## Økt 29 – 2026-09-25: fagpoeng, vikarer og automatikk som forskning

**Brukeren ba om:** For mange fagpoeng i støperiet; automatiske vikarer kom for sent; all automatikk skal låses
opp med fagpoeng; se over koden og fiks feil.

**Gjort:** B-052 (færre fagpoeng per charge, testspilleren tar quiz), B-053 (vikarer rett etter sykdom),
B-054 (automatikk som forskning, `AutoToggle`).

**Testet:** tsc, lint, balanse (8 / 26 / 67 / 149). I Node: gammel lagring beholder automatikken, nytt spill
starter uten; automatiske vikarer gir 0 timer med færre skift på 20 døgn. Playwright (iPhone 13): låste brytere
på Verket, Marked, Folk og Salg, forskningene vises, 390 px, ingen feil.

---

## Økt 28 – 2026-09-24: Marked og Forskning med underfaner

**Brukeren ba om:** Kortere og mer intuitive Marked- og Forskning-sider.

**Gjort (B-051):** Underfaner på begge sider, sammenfoldede beskrivelser og innstillinger, gruppert
forskningsliste, lenker fra Verket til riktig fane.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). Playwright (iPhone 13): Marked Skrap 1 118 px (før ca.
3 000), Forskning 1 304 px (før ca. 2 800), alle faner 390 px brede, tips åpner riktig fane, ingen feil.

---

## Økt 27 – 2026-09-24: vikarer når verket mangler folk

**Brukeren meldte (skjermbilde):** «Vikarene fungerer ikke. Skiftet går ned uansett?»

**Funn:** Vikarene dekket fraværet. Skiftet gikk ned fordi det manglet én støper for tre skift, og verket var
fullt (24 av 24 ansatte).

**Gjort (B-050):** Innleie av vikarer til plassene som mangler, tydelig tekst når verket er fullt, og visning
av ansatte som ikke står på skift.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: 2 → 3 skift med innleie, tilbake til 2 med varsel
etter 3 døgn. Playwright (iPhone 13) med fullt verk: knappen virker, tabellen viser «+ 1 innleid», 390 px.

---

## Økt 26 – 2026-09-24: hvilket skrap ovnen venter på

**Brukeren sendte:** Skjermbilder av ovn 1 som venter på skrap til lavkarbon (fra før B-048 var publisert).

**Gjort (B-049):** Varsel og tips sier hvilke skraptyper som mangler; Marked merker dem.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: med planlegger ingen stopp på 48 t; uten planlegger
sier varselet «Resepten trenger rent nyskrap». Playwright (iPhone 13): rent nyskrap merket under Marked, 390 px.

---

## Økt 25 – 2026-09-24: Lager-knappen og skrap til lavkarbon

**Brukeren meldte:** Lager-knappen på Verket går til Forespørsler; ovnen stopper fordi lavkarbon-skrapet ikke
kjøpes inn.

**Gjort (B-048):** Lager-knappen åpner Salg → Lager. Innkjøpet går videre når planleggeren er borte, og
grunnen vises når planleggeren ikke får kjøpt.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: planlegger på ferie gir ingen stopp; lite penger
gir riktig grunn. Playwright (iPhone 13): Lager og «Til salg» åpner Lager-fanen, vanlig Salg åpner
Forespørsler, ingen feil.

**Gjenstår:** Hvis ovnen fortsatt stopper hos brukeren, vil varselet nå si hvorfor.

---

## Økt 24 – 2026-09-24: Avløser og ryddigere Folk-side

**Brukeren ba om:** Allroundere skal ikke kunne være reparatør, skrapklasser eller murer; nytt navn «Avløser»;
Folk-siden mer intuitiv.

**Gjort (B-047):** Stedfortreder-logikken fjernet, rollen heter Avløser, Folk har fire underfaner.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). Playwright (iPhone 13): alle fire faner, 390 px bredt og
høyst ca. 860 px høyt, ingen feil.

---

## Økt 23 – 2026-09-24: sekvenser og overgangsemner i strengstøpingen

**Brukeren påpekte:** Med to kvaliteter må støpingen vente med den ene kvaliteten, ellers blir det
overgangsemner som må skrapes.

**Gjort (B-046):** Strengstøpingen støper én kvalitet om gangen, venter på slutt av sekvens (30 min stopp)
eller bytter etter 90 min med skrapede overgangsemner. Tekst på Verket og tonn i Kvalitet-kortet.

**Testet:** tsc, lint, balanse (uendret). I Node med to kvaliteter: lysbueovn 525 t mot 584 t på 48 t, 8 t
overgangsemner; induksjonsovn uten tap. Playwright (iPhone 13): teksten på Verket, 390 px, ingen feil.

---

## Økt 22 – 2026-09-24: Salg, folk, lavkarbon og ny startovn

**Brukeren ba om:** Kortere og mer intuitiv Salg-side; vikarer som dekker støpere; skrapklasser og planlegger
som fikser lavkarbon; allroundere som flytter seg dit de trengs; liten induksjonsovn i stedet for digel;
rammeavtaler skjult til de er låst opp.

**Gjort:** B-043 (resept ved kvalitetsbytte, lavkarbon, allroundere som stedfortredere, vikarer synlige i
bemanningstabellen), B-044 (Salg med underfaner), B-045 (liten induksjonsovn i garasjen).

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 136). I Node: lavkarbon-treff med riktig resept, automatisk
omlegging av resept, stedfortreder for reparatør. Playwright (iPhone 13): nytt spill med induksjonsovn, Salg-
faner (maks ca. 920 px høy i stedet for en lang rull), Folk med vikarer, 390 px, ingen feil.

---

## Økt 21 – 2026-09-24: strømavtalen og valg av forespørsler

**Brukeren ba om:** Vise hvor lenge strømavtalen varer, varsel når den går ut, avklare hvilken avtale som er
standard, og kunne sortere etter ønskede forespørselstyper.

**Gjort (B-042):** Spotpris er standard og det man går tilbake til; valg for automatisk fornyelse; nedtelling
og varsler. Salg: velg kvaliteter du vil ha forespørsler på, og sorter forespørslene.

**Testet:** tsc, lint, balanse (10 / 24 / 62 / 142). I Node: nattariff varsles 3 og 1 døgn før og går tilbake
til spotpris; med bare standard valgt kommer bare standard-forespørsler. Playwright (iPhone 13): strømkortet
og kvalitetsvalget i Salg, 390 px, ingen feil.

---

## Økt 20 – 2026-09-24: utstyr på ovn 2

**Brukeren meldte (skjermbilde):** Ovn 2 skal ha egen «utstyrsbutikk» som ovn 1.

**Gjort (B-041):** Knappen «Utstyr» vises på hver ovn. Butikken sier at ovnstype og utstyr gjelder alle ovnene.
Testet med Playwright (iPhone 13): knappen på ovn 2 åpner ovnsutstyret, 390 px, ingen feil.

---

## Økt 19 – 2026-09-24: to kvaliteter, fraværsvarsler, rammeavtaler og vikarer

**Brukeren ba om:** To kvaliteter samtidig med to linjer, varsel når noen tar ferie eller blir syk, faste
kontrakter som varer lenger senere i spillet, og meldte at skiftgangen gikk ned selv med vikarer.

**Gjort:**
- B-039: egen kvalitet og resept per ovn, bryter «To kvaliteter samtidig» og valg for ovn 2 på Verket,
  resept-faner, Salg viser hvilken ovn som lager hvilken kontrakt. Vikarer til alle er tilbake, automatisk
  innleie, varsel når vikarene går hjem. Ferie varsles som hendelse.
- B-040: rammeavtaler fra stålverket (nytt kort under Salg, `Agreements.tsx`).

**Testet:** tsc, lint, balanse (10 / 24 / 62 / 142, alle OK). I Node: automatisk innleie og varsel når vikarer
går hjem; to ovner med standard og armering samtidig. Playwright iPhone 13: Verket, Salg (signere
rammeavtale), Marked (resept-faner) og Folk (fravær), 390 px uten horisontal scrolling, ingen konsollfeil.

**Gjenstår:** Digel-spørsmålet (induksjonsovn i garasjen?) venter på svar fra brukeren.

---

## Økt 18 – 2026-09-24: «døgn siden omforing» for ny ovn

**Brukeren meldte (skjermbilde):** Ovn 2 var nylig kjøpt, men viste 62 døgn siden omforing.

**Gjort (B-038):** Ny ovn og ny ovnstype får omforingsdag = kjøpsdagen; gamle lagringer rettes med et
anslag ut fra antall charger. Testet i Node (kjøp dag 32 → «byttet dag 32»; gammel lagring → dag 22).

---

## Økt 17 – 2026-09-24: ny tilbakemeldingsrunde (pakke 1 av 5: start og varsler)

**Brukeren ba om:** Lang liste (se oppgavene i denne økta): murere på dagtid, raskere start, varsler og
tips, 1× etter popup, konkurs uten råd til omforing, omdømme i starten, reklamasjoner, kvalitetsingeniør,
Verket for lang, Marked uintuitiv, støpefeil, fagbok-kapitler, potte/porten, nattillegg, vedlikehold,
nestenulykke, søkere ved flytting, bryter for forespørsler, lang lagerliste, øseovnsoperatør, digel.
Delt i fem pakker.

**Pakke 5 (B-037):** Øseovnsoperatør i stedet for laborant, med prøver, legering, temperatur og sperret
stål. Balanse 10 / 24 / 62 / 138.

**Digel:** brukeren spurte om digelovn bare hører til aluminium. Svar i samtalen; ikke endret ennå.

**Pakke 4 (B-036):** potte, porten, nattillegg, «Les «kapittel»» fra Forskning, låst/skjult planlagt
omforing, varsel når reparatøren er borte, belønning og straff ved nestenulykke. Testet i Playwright.

**Pakke 3 (B-035):** Verket i underfaner med kompakt produksjonslinje (siden er ca. 20 % kortere, og alt
viktig står øverst), resept-editor med −/+ og forslagene Billigst og Sikrest, skrapklasser-info, pris på
kjøpsknapper, kortere lagerliste, automatisk håndtering av støpefeil. Testet i Playwright på iPhone 13.

**Pakke 2 (B-034):** Én reklamasjon per kontrakt, tålmodige små kunder, mer omdømme i garasjen,
kvalitetsingeniør måler lageret, realistiske frister og «blir ferdig ca. dag X», bryter for forespørsler,
søkere ved flytting, sjeldnere radioaktive kilder, støperiet 750 000 kr. Balanse 10 / 24 / 68 / 141.

**Pakke 1 (B-033):** Små første ordre, spoling om natta, engangstips, varsel ved tomt skraplager og
kreditt, 1× og klikksperre på kort, murere dagtid, nattillegg bare for skiftfolk, konkurs uten råd til
foring. Testet i Playwright: første tilbud 0,4–0,6 døgn, tips kl. 16:00, knappene sperret et øyeblikk,
1× etter kortet, natta på 11 s. Balanse 11 / 33 / 77 / 153.

---

## Økt 16 – 2026-09-24: «Hopp over» i veiledningen

**Brukeren meldte:** «Hopp over» hoppet over hele veiledningen, ikke bare til neste steg.

**Gjort (B-032):** «Hopp over steget» går til neste steg; «Avslutt veiledningen» fjerner den helt.

**Testet:** Playwright på iPhone 13: alle stegene kan hoppes over ett og ett til «Ferdig», og «Avslutt
veiledningen» fjerner kortet. Ingen konsollfeil.

---

## Økt 15 – 2026-09-24: fravær, influensa og vikarer

**Brukeren ba om:** Forslaget om fravær, med automatisk ferie, influensa der flere er borte, og valget
mellom å gå ned på skiftgangen eller leie vikarer.

**Gjort (B-031):** Fravær per ansatt (ferie og sykdom), allroundere som dekker, nytt influensakort,
vikarer under Folk, kort for fravær og varsel på Verket.

**Testet:** Node-test av fravær over 60 døgn (se B-031). Playwright på iPhone 13: fraværskortet viser syk
ansatt, tapt skift og ferie som kommer; vikarer i 1 døgn dekker fraværet. Balanse 12 / 31 / 73 / 150.
Ingen konsollfeil.

---

## Økt 14 – 2026-09-24: to potter per lysbueovn og murere

**Brukeren ba om:** To potter per lysbueovn, og murere som bygger opp den ene mens den andre er i bruk
(ca. fire døgn).

**Gjort (B-030):** Reservepott per lysbueovn, pottebytte på noen timer når den er klar, ny rolle Murer
(fire døgn med to murere per pott), visning i vedlikeholdskortet, varsel på Verket og nytt avsnitt i
fagboka.

**Testet:** Node-test med 0, 2 og 4 murere (se B-030). Playwright på iPhone 13: vedlikeholdskortet viser
reservepott, fremdrift og «Bytt pott nå». Balanse 12 / 36 / 74 / 144. Ingen konsollfeil.

**Gjenstår:** Brukeren vurderer forslaget om fravær (sykdom/ferie) der allroundere dekker opp.

---

## Økt 13 – 2026-09-24: bemanningstabellen var forvirrende

**Brukeren meldte (skjermbilde fra støperiet):** «Antall per skift stemmer vel ikke.» Tabellen viste
2 ovnsoperatører per skift, 1 ansatt og likevel 3 av 3 skift.

**Årsak:** Tallene var riktige, men tabellen viste ikke at allroundere fylte hullene (5 av 7 var
ovnsoperatører), og ansatte som ikke går skift (selger, planlegger, skrapklasser) var ikke med.

**Gjort:** Ny tabell: hvor mange som trengs for 3 skift (eller neste skift), hvor mange egne og hvor
mange allroundere som fyller plassene, og hva som mangler. Under står hvor mange allroundere som er i bruk,
ansatte som ikke går skift, og roller med flere enn skiftene trenger. Fordelingen regnes med samme
metode som bemanningen (`crewCoverage` i `plant.ts`).

**Testet:** Playwright på iPhone 13 med støperi på 3 og 2 skift; summene stemmer med antall ansatte.

---

## Økt 12 – 2026-09-24: «fryser» → «størkner»

**Brukeren meldte (skjermbilde av quizen):** Stål fryser ikke, det størkner.

**Gjort:** Rettet ordet i fagboka (støping), to quizalternativer og en melding i kontrollrommet.
Ingen andre forekomster.

**Lærdom:** Bruk fagordet «størkne» om stål som går fra flytende til fast.

---

## Økt 11 – 2026-09-24: skrapklasser og strengere quiz

**Brukeren ba om:** En skrapklasser som gir riktig skrapmiks til resepten. Feil svar på quiz skal gi
færre eller ingen poeng, uten ny sjanse.

**Gjort (B-029):** Ny rolle Skrapklasser. Uten en blir blandingen omtrentlig og erstattes med hva som
helst ved mangel. Med en følger chargen resepten, og dårlige lass sendes i retur. Quizen har ett forsøk
med fagpoeng etter antall riktige.

**Testet:** Playwright på iPhone 13: quiz med ett feil svar gir «1 av 2 riktige, +1 fagpoeng» og kan
ikke tas igjen; skrapklasser kan ansettes under Folk. Balanse 12 / 36 / 74 / 146. Ingen konsollfeil.

---

## Økt 10 – 2026-09-24: foringen varer for kort

**Brukeren meldte:** Foringen slites på ett døgn; ovnen bør holde minst sju døgn når alt går etter
planen. Valgene i menyen for planlagt omforing må fikses.

**Gjort (B-028):** Slitasjen per charge er satt ned så foringen holder ca. ni døgn døgnet rundt.
Omforing koster og tar mer til gjengjeld. Menyvalgene lages ut fra levetiden og viser hvor slitt
foringen er på den dagen. Planen bytter også ved 88 % slitasje.

**Testet:** Balanse 10 / 32 / 74 / 154, ingen konkurs. Playwright på iPhone 13: menyen viser «Hvert
5.–8. døgn» med slitasje, og teksten om levetid. Ingen konsollfeil.

**Gjenstår:** Følg med på lønnsomheten i storverket mot vinnergrensen.

---

## Økt 9 – 2026-09-24: vinnergrense, planleggerens grense og veiledet start

**Brukeren ba om:** Høyere vinnergrense. En grense for planleggeren, og et valg om den får handle på
kreditt. Veiledet start med mulighet for å hoppe over.

**Gjort (B-027):** Vinnergrensen er 1 mrd. kr. Planleggeren handler bare på kreditt hvis spilleren
tillater det, og kan få et tak per døgn. Veiledet start i sju steg med «Hopp over», og startskjermen har
valg med eller uten veiledning. Testspilleren er rettet for produktbytte ved ny støping og lavkarbon uten
øseovn (den gikk i bøter i stålverket), og reseptsjekken advarer om lavkarbon uten øseovn.

**Testet:** Playwright på iPhone 13: veiledningen gjennom stegene (kontrakt, skrap, første charge) og
«Hopp over», planleggervalgene i Marked. Planleggerens tak og kreditt testet i Node (taket 50 000 kr
holdt; uten kreditt holdt kassa seg rundt null). Balanse 10 / 32 / 83 / 161. Ingen konsollfeil.

**Gjenstår:** Følg med på om storverket blir for lønnsomt (testspilleren tjener ca. 10 mill. kr per
døgn der). Vurder flere spørsmål i quizene.

---

## Økt 8 – 2026-09-24: tilbakemeldingsrunde 2, tema A–G

**Brukeren ba om:** En lang liste forbedringer (se arbeidslisten i `docs/DESIGN.md`), med valg for
fagbok, strøm og planlegging (B-019).

**Gjort (tema A, B-020):** Tregere klokke, forespørsler med svarfrist og maks tre åpne, hardere
bot, nye hendelseskort uten gjentakelse, mottilbud på lønnskrav, bedre norsk i økonomikortet og
riktigere navn. Konsollfeil: ingen funnet.

**Testet:** Balansetest grønn (12 / 37 / 103 / 179), nettlesertest av forespørsler og lønnskort.

**Tema B (B-021):** Ordrekø med pilknapper, «Produseres nå», produksjonskort som følger køen,
resept per kvalitet, planlegger som sorterer køen og kjøper inn. Testet i nettleser og balansetest
(11 / 38 / 94 / 173).

**Tema C (B-022):** Foringen byttes ikke av seg selv lenger: knapp i nytt Vedlikehold-kort,
planlagt omforing via forskning, eller reparatør. Planlagt stans og havari skilles tydelig i
meldinger og straff. Testet på iPhone 13 (knappen bytter tekst, ingen horisontal scroll, ingen
konsollfeil) og balansetest (11 / 43 / 98 / 182).

**Tema D (B-023):** Gradvis opplåsing av faner, fart og skraptyper; utstyr kjøpes fra stedet i
anlegget på Verket; Bygg-fanen erstattet av Forskning; reseptsjekk med forklaring og «Foreslå billigste
resept»; nytt Kvalitet-kort. Testet på iPhone 13 (garasje og nivå 3): riktige faner, låst fart gir
forklaring, forslag setter resepten, utstyrsark åpner, ingen horisontal scroll, ingen konsollfeil.
Balanse 11 / 49 / 100 / 187.

**Tema E (B-024):** Strømavtale (spot, fastpris, nattariff med binding), effekttariff på døgnets
høyeste effekt, skiftplan med nattillegg under Folk, og hendelseskort om betalt utkobling. Testet på
iPhone 13 med et støperi på to skift: nattskift gir 15 % nattillegg og lavere strømpris, nattariff
binder avtalen i 30 døgn, ingen horisontal scroll, ingen konsollfeil. Balanse 12 / 44 / 104 / 185.

**Tema F (B-025):** Forskning krever at kapitlet er lest, quiz per kapittel med fagpoeng, oppdrag
fra fagboka med belønning, og rådgiver med spesialist ved gjentatte omdømmetap. Testet på iPhone 13:
quiz riktig gir +2 FP og åpner Forskning-fanen, feil svar viser forklaring og sperre til neste døgn,
«Les kapitlet» åpner riktig kapittel og låser opp forskningen. Rådgiveren testet i Node (spesialistene
virker). Ingen konsollfeil. Balanse 10 / 40 / 104 / 180.

**Tema G (B-026):** Trivsel med bonus og kurs per ansatt, tregere fagpoeng, testspiller med
prioritert forskning, sikkerhetskopi (last ned/hent) og mindre tegning på pause. Testet på iPhone 13:
bonus løfter trivselen 70 → 85 og låses i en uke, kurs låses etter bruk, sikkerhetskopi lastet ned og
hentet inn igjen fra startskjermen. Ingen konsollfeil. Balanse 10 / 32 / 101 / 185.

**Gjenstår:** Veiledet start de første minuttene (Claudes eget forslag). Følg med på om penger og
omdømme fortsatt føles skjevt i verkstedet, og om storverket blir for lønnsomt (flere testspillere
passerer 100 mill. kr før dag 240).

---

## Økt 7 – 2026-09-24: vanskeligere spill

**Brukeren ba om:** For mye penger i forhold til omdømme, for raske fagpoeng, spillet må være
litt vanskeligere (skjermbilde fra garasjen, dag 9).

**Gjort:** Faste kostnader per nivå, lavere pris på støpegods, dyrere nivåer, færre fagpoeng,
dyrere forskning, billigere messe (B-018). Nytt analyseflagg `--sperrer` i `balance.ts` viser når
penger og omdømme hver for seg holder til neste nivå, og hvor mye fagpoeng som ligger ubrukt.
Faste kostnader vises i «Neste nivå», i flyttefeiringen og i økonomikortet.

**Testet:** Balansetest grønn (13 / 36 / 89 / 169), 14 frø uten konkurs, typesjekk og lint rene.
Første forsøk var for hardt (konkurs i verkstedet) og ble justert.

**Gjenstår:** Følg med på om garasjen fortsatt føles for rik – der sperrer omdømmet fortsatt
litt før pengene (penger dag 6–9, omdømme dag 7–13).

---

## Økt 6 – 2026-09-24: kontrakter tar lengre tid

**Brukeren ba om:** «Det bør ta lengre tid å gjøre kontrakter. Det går altfor fort nå.»

**Gjort:** Kontrakter settes nå til 1,5–4 døgns produksjon (B-016). Kundenes største ordre er
hevet. Nytt analyseflagg `npx tsx src/game/balance.ts --kontrakter <frø>` viser snittid per kontrakt
per nivå.

**Testet:** Før → etter (min på 1×): garasje 0,6 → 5,3, verksted 0,9 → 2,5, støperi 1,1 → 5,0,
stålverk 3,7 → 5,4. Balansetesten grønn (Verksted dag 13, Støperi 27, Stålverk 77, Storverk 152),
ingen konkurs.

**Gjenstår:** Hvis hele spillet fortsatt føles for raskt, er neste grep å senke spillklokka
(`GAME_MIN_PER_REAL_S` i `data.ts`, i dag 1 døgn per minutt).

---

## Økt 5 – 2026-09-24: omdømmet ble vist avrundet opp

**Brukeren meldte (skjermbilde fra mobil):** «Omdømme 5 av 5» med rødt kryss, og knappen
«Flytt inn i verksted» var grå selv om pengene holdt.

**Årsak:** Omdømmet ble vist med `toFixed(0)`, så 4,6 så ut som 5, mens kravet sjekker den
eksakte verdien.

**Gjort:** Ny `fmtRep()` i `ui/format.ts` viser én desimal og runder alltid ned. Brukt i toppfeltet,
i «Neste nivå»-kortet og i målkortet på Verket. Kravlinja forklarer nå hva som mangler («lever
flere kontrakter i tide»). Kassa vises også rundet ned der den sammenlignes med en pris.

**Testet:** Playwright på iPhone 13 med omdømme 4,6: viser «4,6 av 5», knappen er grå, som den skal.
Typesjekk og lint rene.

**Lærdom:** Tall som sjekkes mot et krav må aldri vises avrundet opp.

---

## Økt 4 – 2026-09-24: Game Dev Tycoon-inspirasjon, mobilspill, minne, enkel styring

**Brukeren ba om:** Studere Game Dev Tycoon og hente inspirasjon. Det skal være
et mobilspill. Et system for å huske beslutninger og logge arbeid, og en
CLAUDE.md som minne mellom samtaler. Kontrollromstyringen må være så enkel at
en uten kunnskap klarer å kjøre manuelt.

**Gjort:**
- Studerte Game Dev Tycoon (søk; wiki-sidene var blokkert av nettverket) og skrev
  `docs/DESIGN.md` med hva vi tar over og hvorfor.
- Minnesystem: `CLAUDE.md`, `docs/LOGG.md`, `docs/BESLUTNINGER.md` (B-001–B-015), `docs/DESIGN.md`.
- **Enkel styring av kontrollrommet** (`src/ui/control/`): fire steg – smelt (mer/mindre strøm
  mens skrapmatingen varierer), rens (hold for oksygen), slagg av (ett trykk), tapp (i grønt
  vindu). Automatikk for resten, stjerner og forklaring etterpå, ca. 2 minutter. Full HMI som
  ekspertmodus. Dynamikken ble målt i prosessmodellen før designet ble valgt (se B-010).
- **Forskning og fagpoeng** (`src/game/research.ts`): 21 forskningsområder som låser opp utstyr,
  forbedringer og fagbokkapitler. Fagpoeng fra charger, kontrakter, egne charger og feil.
- **Hendelseskort** (`src/game/decisions.ts`): billig skrapparti, hasteordre, lønnskrav,
  avisintervju, bransjemesse, lærling, tilsyn. Spillet pauses til du velger.
- Flyttefeiring ved nytt nivå, bobler over anlegget (tonn, kroner, fagpoeng), én tydelig
  hovedhandling under anleggsbildet.
- **PWA:** manifest, ikoner (øse som heller stål), service worker (offline), stående format,
  vibrasjon på Android, ingen overscroll.
- Migrering av gamle lagringer (`migrate()` i `save.ts`).

**Testet:**
- `balance.ts`: alle nivåmål OK (Verksted dag 7, Støperi 25, Stålverk 65, Storverk 125),
  ingen konkurs; enkel styring: nybegynner 5★ på ~105 s, slurvete 1★.
- Playwright på iPhone 13: hele kontrollrommet kjørt i nettleseren («Perfekt charge!» på 99 s),
  hendelseskort, flyttefeiring, forskning, gammel lagring migrert, service worker aktiv og
  offline omstart virker.
- `validate.ts`, typesjekk, lint og bygg rene.

**Gjenstår / ideer:** se veikartet i `docs/DESIGN.md` (kundevurdering 1–10, markedstrender,
opplæring av ansatte, prestasjoner, lyd).

**Avslutning:** PR #3 til `main` opprettet etter brukerens ønske (PR #2 var allerede merget, så
de nye commitene ble flyttet over på nyeste `main` først). Lokale kopier av kildematerialet fra
tidligere økter er slettet etter brukerens ønske – det finnes ingen kopier igjen i miljøet, og alt
spillet trenger ligger som generiske tall i koden.

---

## Økt 3 – tidligere: fra simulator til tycoonspill

**Brukeren ba om:** Droppe simulatoren og lage et tycoonspill som erstatter
opplæringsverktøyet, med hele stålverket, fra en person i en garasje til et
stort verk med mange arbeidere. Økonomi, progresjon og hendelser fra tidligere forslag.

**Gjort:**
- Spillmotor i `frontend/src/game/`: skrap (7 typer), resepter, ovner (digel →
  induksjon → lysbue), støping (sand → blokk → streng), valseverk, lager,
  kontrakter med kvalitet og frist, spotsalg, strømpris over døgnet, ansatte og
  skift, omforing, hendelser, lån og kassekreditt.
- Fagbok med 16 kapitler.
- «Ta styringen» med full HMI og prosessmodellen.
- Automatisk testspiller i CI. Rettet dødsspiraler ved produktbytte, spotsalg
  som solgte emner valseverket trengte, og for skarp startresept.
- Relay, instruktørpanel og scenarioer fjernet.

**Testet:** Playwright på iPhone 13 og desktop, testspiller på 14 frø.

**Gjenstår:** PR til `main` for publisering (brukeren har ikke bedt om det ennå).

---

## Økt 2 – tidligere: kalibrering, GitHub Pages, de-identifisering, mobil

- Prosessmodellen kalibrert mot en conveyormatet lysbueovn; portet fra Python til TypeScript.
- Publisering på GitHub Pages; Python-backend fjernet; relay for flere maskiner.
- Alt identifiserende fjernet og git-historikken skrevet om (se B-002).
- Mobiltilpasning og gjennomgang av all kode.

## Økt 1 – tidligere: stålovnsimulator

- Første versjon av en simulator for lysbueovn med kontrollrom og instruktørpanel.
