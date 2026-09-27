# UI.md – designsystem, mobil + PC og plan for redesignet (UI-fase 0)

Retningen er besluttet i B-187: **Stålverket er både mobilspill og PC-/nettleserspill.** Mobil = rask, fokusert drift.
PC = kontrollrom og hovedkontor med mye bedre oversikt. Samme spill, samme designsystem, samme komponenter og data.
Ingen viktig funksjon er PC-only; alt kan gjøres på mobilen. Denne fila er planen fra UI-fase 0 (audit); den
oppdateres etter hvert som fasene bygges.

Innhold: 1 kritisk vurdering · 2 hva vi beholder · 3 designsystem · 4 responsiv strategi · 5 app-skall · 6 side for
side · 7 anlegget og boblene · 8 komponenter som endres · 9 tilgjengelighet og ytelse · 10 PR-rekkefølge ·
11 risiko og problemer med retningen · 12 spørsmål til eieren.

---

## 1. Kritisk vurdering av dagens UI-arkitektur

Målt 2026-09-27 på et storverk med konsern (Playwright, 7 skjermstørrelser) og ved å lese `ui/` og CSS-en.

**Struktur og kode**
- Én stor CSS-fil (`ui/game.css`, 2 878 linjer, 235 klasser) + `control.css` (609) + `index.css` (67). Stilene har
  vokst side for side: **76 ulike hex-farger**, bare 9 variabler i `:root`, **19 ulike skriftstørrelser**
  (8–56 px; 11, 12, 13, 14 og 15 px brukes om hverandre til nesten samme rolle), **10 ulike hjørneradier**
  (4/6/8/9/10/12/20/999 px …) og **42 ulike padding-verdier**. Det finnes ingen avstandsskala eller typografisk skala.
- Delte komponenter er få: `Card`, `Bar`, `Stat`, `SubTabs`, `GradeChips` i `common.tsx`. Knapper, varsler, merker,
  segmentvelgere og tabeller er skrevet på nytt per side med egne klasser (`g-speed`, `g-subtabs`, `g-board-scope` er
  tre varianter av samme segmentvelger).
- Gameplay og presentasjon er i hovedsak godt skilt: motoren (`game/`) har ingen React, og UI-et leser tilstanden.
  Det gjør et redesign mulig uten å røre spillreglene – den viktigste styrken å bevare.
- Hele app-treet tegnes på nytt hver gang spilløkka tikker (muterbar tilstand + versjonsteller i `useGame`). Det går
  fint med én mobilkolonne, men et PC-dashbord med tre kolonner og tabeller vil koste mer. Må måles og håndteres
  (se 9).

**Mobil**
- **Toppfeltet er 133 px høyt** på alle telefoner. På en liten telefon (320×568) tar toppfelt + meny (59 px) **192 px,
  34 % av skjermen**, før noe innhold. Varsellinja er en egen rad hele tida, også når det ikke er noe nytt, og
  topplisteknappen ligger i den raden.
- Underfanene i Verket (Oversikt/Anlegg/Økonomi/Konsern) ligger **under** anleggsbildet og rådene, ikke øverst. Man
  må scrolle forbi bildet for å bytte underfane.
- Nesten all tekst har samme vekt og størrelse. På Salg konkurrerer kunde, verdi, tonn, kvalitet, frist og analyse om
  oppmerksomheten; hovedhandlingen er ikke alltid den tydeligste.
- Emoji bærer hoved-UI-et: 121 forekomster i komponentene (✓ 18, 🏆 17, ✕ 11, ⚙ 10, 📖 6, 🔒 6 …). De tegnes ulikt på
  iPhone, Android og Windows, har ulik baseline og kan ikke få samme farge som teksten.

**PC**
- Fra 760 px blir siden en vanlig side med toppfelt og faner øverst, og innholdet er låst til **1 248 px bredt,
  midtstilt** – på 1 920 og 2 560 px er en tredjedel av skjermen tom. Det er mobilversjonen med større max-width.
- Bare to ekte brytepunkter (760 og 1 000 px). Mellomstørrelser (stor telefon på tvers, nettbrett) får enten
  mobiloppsettet eller et strukket PC-oppsett.
- Tabeller finnes nesten ikke (1 i Folk). Skrapmarked, ordrekø, forskning og datterverk er kort i et rutenett, som blir
  lange rader av like kort på en bred skjerm.
- Modaler (toppliste, fagbok, innstillinger) er mobilark sentrert på en stor skjerm.
- På Oversikt tar tre «krever konto»-kort (Dagens oppdrag, Ukens utfordring, Sesongstigen) hele høyrekolonnen for en
  spiller uten konto. Det følger KONTO-regelen, men er mye plass til noe man ikke kan bruke (se 11).

**Kontrollrommet** er funksjonelt klart, men visuelt det mest prototypeaktige: egne farger og mål i `control.css`, få
felles komponenter, og på PC står mobilskjermen midt i et tomt område.

## 2. Det vi beholder

- Hovednavigasjonen **Verket · Marked · Salg · Folk · Forskning** og underfanene i Verket. Fanene som låses opp
  gradvis (`views.ts`, B-023).
- Mørk base og **cyan** som farge for det interaktive/valgte – den blir en del av identiteten.
- Kort på mobil, forklaring der spilleren møter mekanikken, én handling etter en kort forklaring.
- Anleggsbildet som SVG tegnet av spilltilstanden (`PlantScene.tsx`) og boblene (`SceneBubbles.tsx`) – idéene er gode;
  de skal videreutvikles, ikke byttes.
- Rulle-modellen på mobil (bare `.g-main` scroller, B-137) og ark i `<Portal>` (B-152) – løser ekte Safari-problemer.
- Spillmotoren urørt: redesignet endrer ikke `game/` utover ren presentasjon.

## 3. Designsystem

Identitet: **nordisk industri + moderne kontrollrom + tycoon.** Mørkt, presist, oversiktlig, litt røft, profesjonelt.
Ikke SaaS-dashbord, ikke rust og metallrammer, ikke flammer på knapper. Hierarki lages med avstand, typografi, svake
bakgrunnsforskjeller og skillelinjer – **ikke kort inni kort**.

Alt samles i **`ui/tokens.css`** (CSS-variabler) og brukes av alle komponenter. Tallene under er startverdier som
justeres visuelt i UI-fase 1.

### 3.1 Farger – med mening

| Token | Rolle | Start |
| --- | --- | --- |
| `--bg` | Hovedbakgrunn (blåsvart grafitt) | #0e141c |
| `--surface-1` | Paneler | #151d28 |
| `--surface-2` | Hevet flate: aktiv rad, felt, hover | #1c2633 |
| `--surface-3` | Dialog/ark, meny | #222e3d |
| `--line` / `--line-strong` | Skillelinjer / rammer | #26313f / #38455a |
| `--text` / `--text-2` / `--text-3` | Tekst / stålgrå sekundær / metadata | #e8edf3 / #a3aebd / #748196 |
| `--accent` | Interaktivt, valgt, navigasjon (cyan – beholdes) | #4fc3f7 |
| `--ok` | Positiv drift, fortjeneste, god status | #4cc38a |
| `--heat` | Varme prosesser, vedlikehold, advarsel (gul/oransje) | #f5a524 |
| `--critical` | Faktiske feil og kritiske problemer – aldri pynt | #ff5c5c |
| `--info` | Nøytral informasjon (dempet blå) | #7aa7d6 |

Hver statusfarge har en `-bg` (svak flate) og `-fg` (tekst med nok kontrast). Rødt brukes bare når noe faktisk er galt.
Ingen status uttrykkes med farge alene: alltid ikon og/eller ord i tillegg.

### 3.2 Avstand, radius, skygge, bevegelse
- **Avstand:** 4 px-skala: 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 (`--sp-1` … `--sp-8`).
- **Radius:** tre verdier: 4 (små: merker, felt), 8 (knapper, paneler), 12 (dialoger, anleggsbildet); + fullt rundt for
  piller. Erstatter dagens ti.
- **Skygge:** nesten ingen. Paneler skilles med flate og linje; skygge bare på ting som ligger over (dialog, meny,
  varsel).
- **Bevegelse:** 120 ms (hover/trykk), 200 ms (panel/ark), 400 ms+ bare for belønning. Bare `transform`/`opacity`.
  `prefers-reduced-motion` respekteres overalt.

### 3.3 Typografi

Systemskrift beholdes for brødtekst (rask, offline, ingen nedlasting). Alle tall med `tabular-nums`.
**Valgt (B-191):** overskrifter og store tall bruker visningsskriften «Stal Display» = Barlow Semi Condensed 600
(OFL, 23 kB, `ui/fonts/`), klassen `.ds-display` eller `var(--font-display)`. Den er smal og står ett trinn større.
Tokenene i `ui/tokens.css`: `--fs-badge` 11, `--fs-caption` 12, `--fs-meta` 13, `--fs-body` 14, `--fs-title` 15,
`--fs-section` 17, `--fs-page` 20, `--fs-hero` 28, `--fs-display` 48 (9 trinn; tabellen under er målbildet per rolle).
Skala:

| Rolle | Mobil | PC | Bruk |
| --- | --- | --- | --- |
| Nøkkeltall (hero) | 28/32 | 32/36 | Kasse, verdien på en ordre, konsernverdi |
| Sideoverskrift | 20 | 22 | Sjelden på mobil (fanen sier det) |
| Seksjon | 16 semibold | 16 | «Forespørsler», «Ovner» |
| Korttittel | 15 semibold | 15 | Kundenavn, utstyr |
| Brødtekst | 15 | 14 | Forklaringer |
| Metadata | 13 | 13 | Tonn, frist, analyse |
| Bildetekst | 12 | 12 | Enheter, små hint |

Fra 19 størrelser til 7. Eksempel Salg: **Offshoreleverandør** (korttittel) og **39,7 mill. kr** (nøkkeltall) dominerer;
tonn/kvalitet/frist som metadata under; analyse og levering foldet eller i detaljpanelet; **Signer** som eneste
primærknapp. Visningsskriften er valgt (B-191, se over).

### 3.4 Ikoner
Én ikonfamilie: **inline SVG, 24-rute, 1,75 px strek, runde ender** (samme uttrykk som Lucide, ISC-lisens – et utvalg
på ca. 40 ikoner kopieres inn i `ui/icons.tsx` med lisensmerknad, ingen ny avhengighet). `<Icon name="book" />` arver
tekstfargen og står på grunnlinja. Emoji blir igjen i spilltekster, hendelser, titler og prestasjoner der de gir
personlighet – ikke i navigasjon, knapper og statuser. **Valgt (B-191):** Lucide, kopiert inn; toppfeltet er byttet i
UI-1a, resten byttes etter hvert som sidene tas.

### 3.5 Komponentene i systemet
Hver komponent får én fil (eller én gruppe) i `ui/ds/` og én stilblokk:

- **Button**: `primary` (cyan, én per område), `secondary` (flate + linje), `ghost` (bare tekst/ikon), `danger`
  (rød kant, rød fyll bare ved bekreftelse). Størrelser `md` 44 px (mobil standard) og `sm` 36 px (bare PC/tette
  tabeller). Alltid synlig fokusring.
- **Tabs** (seksjoner på en side) og **SegmentedControl** (valg: fart, sesong/Hall of Fame, liste) – én
  implementasjon erstatter `g-subtabs`, `g-speed`, `g-board-scope`.
- **Field**: input, select, bryter (`AutoToggle`), avkryssing – samme høyde og fokus.
- **ProgressBar** (dagens `Bar`) med tone og valgfri verdi/etikett; **Meter** for målere med målområde
  (kontrollrom, lager).
- **Stat**: `hero` / `normal` / `compact`, med valgfri endring (▲ grønn / ▼ rød + tekst).
- **StatusBadge**: ett statusspråk for utstyr og ordre (se 6.2): ikon + ord + farge.
- **Callout** (info/ok/advarsel/kritisk) erstatter dagens ulike hint- og varselbokser; **Toast** for flyktige varsler
  med kø og sammenslåing.
- **Dialog** (sentrert, spørsmål og bekreftelser) og **Sheet** (ark nedenfra på mobil, fra høyre på PC: toppliste,
  fagbok, innstillinger, detaljer).
- **Section/Panel**: flate med tittel og valgfri handling til høyre. Erstatter `Card` der kort ligger i kort.
- **DataTable**: rader og kolonner på PC, blir kort/liste under en bredde (samme data, samme handlinger).
- **MasterDetail** og **SidePanel**: liste til venstre, detaljer til høyre på PC; på mobil åpner valget detaljene som
  en egen visning/ark.
- **Tooltip** bare på PC og aldri eneste bærer av informasjon. **Skeleton** for data fra nett (toppliste, konto).
  **EmptyState** med én setning og én handling.

## 4. Responsiv strategi

Brytepunktene settes etter innholdet, ikke etter én iPhone. Ramme (skall) styres av skjermbredde; komponenter
(kort ↔ tabellrad) styres av **container queries** – de vet hvor mye plass de får, uavhengig av skjermen (støttet i
Safari 16+, Chrome 105+).

| Nivå | Bredde | Skall | Innhold |
| --- | --- | --- | --- |
| XS liten telefon | < 360 | Mobil: kompakt toppfelt, meny nederst | Én kolonne, forkortede etiketter |
| S telefon | 360–599 | Mobil | Én kolonne |
| M stor telefon på tvers / lite nettbrett | 600–899 | Mobil med bredere innhold | To kolonner der det gir mening (kort i rutenett) |
| L nettbrett på tvers / liten laptop | 900–1 279 | PC-skall: toppfelt + smal sidemeny (ikoner + korte navn) | Hovedområde + evt. sidepanel under |
| XL PC | 1 280–1 679 | PC-skall: full sidemeny | Hovedområde + sidepanel (320–400 px) |
| XXL stor skjerm | ≥ 1 680 | Som XL | Tre soner der siden har innhold til det; ellers maks bredde ~1 600 px |

Høyde teller også: 1 366×768 har lite høyde, så PC-toppfeltet er én rad (≤ 56 px) og viktige paneler scroller hver for
seg. Touch og mus skilles med `(hover: hover)` og `(pointer: coarse)`, ikke med bredde (nettbrett med tastatur finnes).

## 5. App-skall

Ett `AppShell` med CSS grid-områder: `header`, `nav`, `main`, `aside`. Samme React-tre; bare plasseringen endres. Ingen
`MobileApp.tsx`/`DesktopApp.tsx`.

### 5.1 Mobil
- **Toppfelt i to rader, mål ≤ 88 px** (fra 133):
  1. Nivå/dag/klokke (kompakt) · fartsvelger · varsel-ikon med tall · meny-ikon.
  2. Nøkkeltallstripe: **Kasse** (størst) · Omdømme · Fagpoeng · Strøm – med små ikoner, forkortes på XS.
- Varsellinja er fortsatt en fast rad (B-116), men står **over menyen nederst** på mobil (B-201, eierens valg i stedet
  for toast). Toppfeltet er da 71 px på iPhone (fra 117). 🏆 står ved varsellinja som før.
- Menyen nederst som i dag. Underfanene i Verket flyttes **øverst** i Verket.

### 5.2 PC
- **Toppfelt (én rad):** spilldag og klokke · fart · kasse · strøm · omdømme · fagpoeng · varsler · fagbok · profil ·
  innstillinger.
- **Sidemeny til venstre:** bare områder som er låst opp – Verket, Marked, Salg, Folk, Forskning, og **Konsern** når
  det er åpnet (senere Industri). Ingen hengelåser: nye områder dukker opp og markeres som nye. Underfaner kan vises
  som undermeny.
- **Hovedområde** med sidens egen PC-layout (6) og et valgfritt **sidepanel** til høyre for detaljer/valgt objekt.
- Ark (toppliste, fagbok, innstillinger) åpnes fra høyre, så spillet synes bak.

## 6. Side for side

Prinsipp: **samme data og handlinger, forskjellig mengde synlig samtidig.** Gradvis synlighet gjelder like mye på PC.

| Side | Mobil | PC | Egen PC-layout? |
| --- | --- | --- | --- |
| Verket → Oversikt | Bilde, status, neste steg | Stort anleggsbilde + høyrekolonne (status, neste steg, produksjon nå) | Ja |
| Verket → Anlegg | Vertikal liste per sted, tydelig status | Driftsdashbord: produksjonsflyt i midten, sidepanel med skraplager, ovner, støping, valsing, lager, vedlikehold, hendelser | Ja |
| Verket → Økonomi | Resultat øverst, så inntekt/kostnad | Dashbord med hierarki: resultat → inntekt/kostnad → hovedverk/datterverk → produksjon/strøm/lønn; små grafer bare der de forteller noe (resultat 7/30 døgn) | Ja |
| Verket → Konsern | Verdi, netto, neste steg, verk | Hovedkontor: nøkkeltall øverst, verkene som tabell/kart, beslutninger og varsler fra verk i egen sone (plass til verksjefer og strategiske bedrifter senere, uten tomme plassholdere) | Ja |
| Marked | Kort per skraptype, strøm (resepten er flyttet til Verket, B-199) | Skraptabell (Type · Pris · P · Spor · C · Skitt · Eget lager · Handling) + detaljpanel; resept og strøm ved siden av | Ja |
| Salg | Kort per forespørsel | Master/detail: forespørsler · ordrekø · lager · avtaler til venstre, valgt ordre til høyre (kunde, verdi, tonn, kvalitet, frist, forventet levering, reseptstatus, kapasitet, mulig bot, handling) | Ja |
| Folk | Enkel liste og anbefaling | Bemanningstabell (Område · Behov · Bemannet · Ferdighet · Fravær), utvidbar med verksjefer/ledelse | Ja |
| Forskning | Kort, gruppert | Kategoriliste · oversikt · detaljpanel. Ikke et stort tech tree | Ja |
| Kontrollrommet | Én skjerm, fire faser | Ovnen i midten, instrumenter og fase/fremdrift rundt; resultatskjerm med poeng | Ja (UI-fase 4) |
| Toppliste / Hall of Fame | Ark | Egen side/ark med aktiv konkurranse og Hall of Fame; ikke låst til seksmåneders sesonger | Delvis |

### 6.1 Oversikt og anlegg – «hva er viktigst nå?»
Øverst alltid én linje med det viktigste akkurat nå (flaskehals, kritisk hendelse eller neste store steg), deretter
detaljer. På PC er det kontrollrommet: stort bilde + det som krever handling.

### 6.2 Statusspråk for utstyr (Anlegg, Oversikt, senere datterverk)
| Status | Ikon | Farge | Betyr |
| --- | --- | --- | --- |
| Kjører | play/puls | ok | Produserer |
| Venter | klokke | info | Venter på noe oppstrøms/nedstrøms (støping, skrap) |
| Stopp | pause | tekst-3 | Står planlagt/utenfor skift |
| Vedlikehold | skiftenøkkel | heat | Planlagt stans / foring |
| Feil | varseltrekant | critical | Havari, brudd |
| Fullt | lager fullt | heat | Lager fullt, stopper produksjon |
| Tomt | lager tomt | heat | Mangler råvare |

Alltid ikon + ord; fargen er tillegg. `StatusBadge` brukes overalt.

## 7. Anlegget og boblene

**Anleggsbildet** skal bli signaturen: garasje → verksted → støperi → stålverk → storverk → stor industri, i én
konsekvent spillgrafisk stil (flat, lagdelt SVG, begrenset palett fra tokens, lys og varme som eneste «effekter»).
Ikke fotorealistisk AI-kunst, ikke 3D. Tilstander som leser spillet: ovn gløder ved drift, røyk/damp, støping aktiv,
lys i vinduer etter skift, mørke områder ved stans, små kjøretøy (skraptruck, kran) med enkle CSS-animasjoner. På PC
blir bildet større og stedene kan trykkes (åpner stedet i sidepanelet). Bygges stegvis, nivå for nivå.

**Boblene** beholdes, med regler:
- Høyst **3 synlige** samtidig, i faste baner (ikke tilfeldig plassering), levetid ca. 1,6 s.
- Hendelser innen samme vindu (ca. 1 s, lengre på 3×/10×) **slås sammen** til én boble: «+18,7 mill. · +1 539 t · +3 FP».
- Kø med tak; det som ikke rekker å vises, summeres inn i neste boble (ingen tapte tall, ingen kaos på 10×).
- Store hendelser (rekord, milepæl) får egen, tydeligere boble. Med redusert bevegelse: en stille linje i stedet.

## 8. Komponenter som endres

| Nå | Blir |
| --- | --- |
| `index.css` + 9 variabler, 76 hex-farger | `ui/tokens.css` med semantiske tokens; alle farger via tokens |
| `Card` brukt også inni kort | `Section`/`Panel` + skillelinjer; `Card` bare for selvstendige objekter (en ordre, et verk) |
| `SubTabs`, `g-speed`, `g-board-scope` | `Tabs` og `SegmentedControl` |
| Knapper med `g-primary`, `g-danger`, `g-link`, `g-book`, globale `button`-stiler | `Button` med varianter og størrelser |
| Hint/varsel/note-bokser (`g-note`, `g-hint`, …) | `Callout` |
| `g-modal` + `g-modal-card` overalt | `Dialog` og `Sheet` (fortsatt i `<Portal>`) |
| Emoji i toppfelt, knapper, statuser | `Icon` |
| Toppfelt i `GameApp.tsx` (3 rader) | `AppHeader` (mobil 2 rader) + `TopBar` (PC) + `SideNav` |
| `SceneBubbles` (maks 8, tilfeldig plass) | Regler i 7 |
| Kort-rutenett for skrap/ordre/forskning på PC | `DataTable` og `MasterDetail` |

## 9. Tilgjengelighet og ytelse

- Trykkflater minst 44 px på touch (36 px bare i tette PC-tabeller med mus). Kontrast minst 4,5:1 for tekst.
- Synlig fokus (`:focus-visible`) overalt, logisk tabulatorrekkefølge, tastatur i tabeller og faner (piltaster),
  `Esc` lukker ark. Semantiske knapper, `role="tablist"`, `aria-live` for varsler. Ingen status bare i farge.
- **Budsjett:** ingen nye kjøretidsbiblioteker (ikke animasjons- eller komponentbibliotek); ikoner som inline SVG;
  ingen store bilder (anlegget er SVG); animasjoner bare `transform`/`opacity`; CSS totalt ikke større enn i dag
  etter opprydding.
- **Tegning:** hele treet tegnes på nytt hvert tikk i dag. Før PC-dashbordene: mål med React Profiler; del opp i
  komponenter som bare leser det de trenger (`memo` med små nøkler, f.eks. dag/time/kasse avrundet), og la tabeller
  tegne bare synlige rader hvis de blir lange.

## 10. PR-rekkefølge

Hver PR er liten, går gjennom alle sjekker, Playwright på **7 størrelser** (320×568, 390×844, 412×915, 820×1180,
1 366×768, 1 920×1 080, 2 560×1 080) og har skjermbilder før/etter. Gameplay holdes urørt.

1. **UI-1a Tokens og grunnkomponenter** (ferdig, B-191, PR #138): `tokens.css`, typografi, `Button`, `Icon`, `Tabs`/`SegmentedControl`,
   `Callout`, `StatusBadge`, `Stat`, `ProgressBar`, `Section`. Eksisterende klasser kobles til tokens (små synlige
   endringer).
2. **UI-1b App-skall** (ferdig, B-192, PR #139 – varsellinja står etter B-116, se FORSLAG): kompakt mobiltoppfelt, underfaner øverst i Verket, PC-toppfelt, sidemeny, `Sheet` for
   toppliste/fagbok/innstillinger, brytepunktene.
3. **UI-2a Oversikt** (bygget, B-195) (inkl. boblereglene og første runde av anleggsbildet) · **UI-2b Anlegg** (bygget, B-196; statusspråk,
   driftsdashbord) · **UI-2c Marked** (bygget, B-197; skraptabell på PC, kort på mobil) · **UI-2d Salg** (bygget, B-198; liste + detaljer for forespørsler på PC, kort på mobil).
4. **UI-3a Økonomi** (bygget, B-203; resultat øverst, graf per døgn, poster) · **UI-3b Folk** · **UI-3c Forskning** · **UI-3d Konsern** (hovedkontoret).
5. **UI-4a Kontrollrommet** · **UI-4b Toppliste/Hall of Fame** · **UI-4c øvrige ark og små skjermer** ·
   **UI-4d polering og animasjon** (inkl. anleggsbildet per nivå).
6. Etterpå: logo, app-ikon og tittelbilde (bevisst sist, B-187).

Fase 1B (skraplager, anbud) bygges parallelt med samme komponenter så snart UI-1a er inne, så nye sider ikke må
bygges om.

## 11. Risiko og problemer med retningen

- **Regresjoner i veiledningen:** veiledningen og rådene peker på steder (`Overview.tsx` scroller til id-er, tester og
  Playwright-skript bruker klassenavn og knappetekster). Tiltak: behold id-er og knappetekster, oppdater skriptene i
  samme PR, kjør hele veiledningen i Playwright etter UI-1b.
- **To oppsett = dobbelt testarbeid.** Tiltak: responsivitet i komponentene (container queries) i stedet for egne
  sider; faste 7 størrelser i skriptene.
- **PC frister til å vise mer.** Gradvis synlighet er absolutt: sidemenyen viser bare det som er låst opp, og
  PC-layoutene viser flere detaljer om det spilleren har – ikke nye systemer.
- **KONTO-regel 6 mot «vis ikke det spilleren ikke trenger»:** i dag får en spiller uten konto tre store «krever
  konto»-kort. Forslag: ett lite, samlet «Med konto får du …»-kort (fortsatt synlig, som regelen krever), ikke tre.
  Krever en justering av regel 6 – eierens valg (12.3). **Avgjort (B-191):** ett samlet kort, regel 6 er justert.
- **Konsern på mobil vs PC:** eieren vil ha Konsern i sidemenyen på PC; på mobil er det en underfane i Verket (fem
  faner i menyen er det som får plass). Forslag: samme visning, ulik plassering – sidemeny på PC, underfane på mobil.
- **Safari-fellene** (bare `.g-main` scroller, ark i Portal, bredere skrift, B-134/B-137/B-152) gjelder fortsatt; nytt
  skall må testes i WebKit, ikke bare Chromium.
- **Parallelt med 1B** blir det konflikter i de samme filene. Tiltak: UI-1a først (liten), så 1B med nye komponenter.
- **Emoji som personlighet:** prestasjoner, titler og hendelser mister noe hvis alt blir strektegninger – derfor
  beholdes de der.
- **Ytelse** på eldre telefoner hvis anleggsbildet får mer bevegelse: bare transform/opacity, pause når fanen er skjult,
  redusert bevegelse respekteres.

## 12. Spørsmål til eieren

**Besvart 2026-09-27 (B-191):** 1 egen visningsskrift for overskrifter og tall, systemskrift ellers · 2 Lucide ja ·
3 ett samlet kontokort · 4 Konsern i sidemenyen på PC, underfane på mobil · 5 UI-1a ja, uten å redesigne sidene.

1. **Skrift:** systemskrift overalt (raskest, ingen nedlasting) – eller en egen, selvhostet skrift for overskrifter og
   store tall (ca. 20–40 kB, gir mer identitet)?
2. **Ikoner:** greit med et utvalg fra Lucide (åpen lisens, samme strek overalt, kopiert inn uten ny avhengighet)?
3. **«Krever konto»-kortene:** samle dem i ett lite kort (justerer KONTO-regel 6)?
4. **Konsern:** sidemeny på PC og underfane på mobil, som foreslått?
5. Klar for **UI-1a** (tokens og grunnkomponenter) som første PR?
