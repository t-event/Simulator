/**
 * Endringsloggen i spillet (B-179): «Hva er nytt» vises én gang etter en oppdatering, og hele lista ligger under Innstillinger.
 *
 * Nyeste først. Hver oppføring har det høyeste beslutningsnummeret (B-xxx) den dekker. `npm test` sjekker at den
 * nyeste oppføringen dekker den nyeste beslutningen i docs/BESLUTNINGER.md, så den ikke blir glemt.
 * Skriv for spillerne: kort, med vanlige ord, det de merker i spillet.
 */
export interface ChangelogEntry {
  /** Høyeste beslutningsnummer oppføringen dekker */
  b: number;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    b: 245,
    date: "2026-09-28",
    title: "Trucken holder seg på land",
    items: ["På storverket kjører skraptrucken ikke lenger utfor kaia. Den stopper, snur og kjører tilbake."],
  },
  {
    b: 244,
    date: "2026-09-28",
    title: "Anleggsbildet viser mer",
    items: [
      "Storverket har fått en høyere smeltehall, så det ser annerledes ut enn stålverket.",
      "Et transportbånd fører skrapet opp til ovnene, og hver støpemaskin har sin egen glødende streng.",
      "Når verket står, blir bildet mørkere.",
    ],
  },
  {
    b: 243,
    date: "2026-09-28",
    title: "Nye ikoner",
    items: ["Skraplageret har fått en kranmagnet som ikon, og støpingen to emner."],
  },
  {
    b: 242,
    date: "2026-09-28",
    title: "Levende anleggsbilde",
    items: [
      "Trykk på skrapgården, ovnen, støpingen eller lageret i bildet for å åpne utstyret der.",
      "Skraptrucken kjører, kranen går over skrapgården, og det glødende stålet løper gjennom valseverket.",
      "Hver ovn har sin egen pipe, som bare ryker når den ovnen smelter.",
    ],
  },
  {
    b: 241,
    date: "2026-09-28",
    title: "Ryddigere Salg",
    items: [
      "Forespørsler: om verket rekker det står først, med grunnen rett under. Rekker det ikke, foreslås Avslå.",
      "Ordrekøen sier øverst om alt rekker fristen, og viser hvilke kontrakter som ikke gjør det.",
      "Lageret viser hva som er holdt av til kontraktene, og rammeavtalene har mindre tekst.",
      "Fagboka: tallene øverst heter nå Lest, Quiz og Oppdrag, og hvert kapittel viser hvor langt du har kommet.",
    ],
  },
  {
    b: 240,
    date: "2026-09-28",
    title: "Færre sene leveranser",
    items: [
      "Salgsdirektøren tar ikke lenger en kontrakt med kort frist som skyver andre kontrakter i køen for sent.",
      "Valseverket får emner hele tida, så armeringen ikke venter til alle emneordrene er ferdige.",
      "Ovnene lager det som haster: trengs det, lager alle ovnene samme kvalitet til fristen er nådd.",
      "Salg sier fra når en forespørsel går foran en annen kontrakt i køen og gjør den for sen.",
    ],
  },
  {
    b: 239,
    date: "2026-09-28",
    title: "Sidene starter like høyt",
    items: ["Alle sider begynner like langt under toppen – Forskning sto før litt høyere enn resten."],
  },
  {
    b: 238,
    date: "2026-09-28",
    title: "Realistiske titler og roligere skjermer",
    items: [
      "Titlene følger ekte stålselskaper: Stållegende ved 400 mrd. – like mye som det mest verdifulle stålselskapet i verden – og Stålikon ved 5 000 mrd., omtrent hele stålindustrien.",
      "Produksjonen, rådene under verket og «Produksjon nå» står stille mens tallene endrer seg.",
      "Innstillingene er delt i grupper, med korte valg som knapper.",
      "«Hva er nytt» er samlet per dag, med de eldste oppdateringene lukket.",
    ],
  },
  {
    b: 237,
    date: "2026-09-28",
    title: "Anbudsvarsel, mesterskap og ikoner",
    items: [
      "Har du bydd på skraplageret, får du beskjed når anbudet er avgjort – hvem som vant, og at budet ditt er tilbake.",
      "Mesterskapet: prosjektene koster etter hvor mye de er verdt, og viser hva neste nivå gir i kroner per døgn.",
      "Alle emojier er byttet med ikoner i samme stil, også medaljene på topplistene og stjernene.",
    ],
  },
  {
    b: 236,
    date: "2026-09-28",
    title: "Roligere fagbok",
    items: ["Fagboka bruker egne ikoner i stedet for emoji, i samme stil som resten av spillet."],
  },
  {
    b: 235,
    date: "2026-09-28",
    title: "Ryddigere produksjon, konsern og merker",
    items: [
      "Ukens «Mer stål enn før» måles nå mot hva du laget uka før, ikke mot hele spillet.",
      "Produksjonen på Anlegg: én kort rad per sted. Trykk på raden for utstyret.",
      "Utvid i konsernet viser hvor godt hvert kjøp lønner seg, og de beste utbyggingene av verkene dine.",
      "Skraplageret viser tydelig om anbudet er åpent, ditt bud og hvor mye du kan by. Konsernkassa er lettere å fylle.",
      "Utfordringer og merker har fått egne ikoner.",
    ],
  },
  {
    b: 234,
    date: "2026-09-28",
    title: "Ny fagbok",
    items: [
      "Fagboka viser hvor langt du har kommet, og en «Neste»-knapp med det lureste å lese eller gjøre.",
      "Hvert kapittel starter med «Kort fortalt», og resten leses én kort side om gangen.",
      "Quizen tar ett spørsmål om gangen, og du ser med én gang om du svarte riktig – og hvorfor.",
    ],
  },
  {
    b: 233,
    date: "2026-09-28",
    title: "Vikarer, vedlikehold og lik navigasjon",
    items: [
      "Skiftlederen leier vikarer for alle som er borte – også når noen blir syke mens vikarene alt er leid.",
      "Alle hovedmenyene husker underfanen du var på. Trykk på menyen igjen for å komme til første underfane.",
      "Nytt vedlikeholdskort: én rad per ovn med slitasje og én knapp. Utstyrsarkene viser hva som skjer på stedet nå.",
      "Du kan avbryte en rammeavtale under Salg → Avtaler – men det koster en stor bot og omdømme.",
      "Verkene i konsernet står som korte rader på mobil; trykk på et verk for knappene. Mål-knappen viser når den er valgt.",
    ],
  },
  {
    b: 232,
    date: "2026-09-28",
    title: "Mange flere utfordringer og merker",
    items: [
      "74 utfordringer i 19 serier (før 8). Hver serie har flere trinn – klarer du ett, starter neste med et høyere mål.",
      "99 merker i 25 serier (før 30), og de øverste er langt unna. Du beholder merkene du alt har.",
      "Kortene viser først det du er nærmest, med fremdrift og belønning. Trykk på en serie for å se alle trinnene.",
    ],
  },
  {
    b: 231,
    date: "2026-09-28",
    title: "Produksjonslinja i én rad",
    items: [
      "På Oversikt står produksjonen i én rad: Skrap › Ovner › Støping › Lager.",
      "Ovnene er samlet i én rute med en stripe for hver ovn, og viser hvor mange som smelter – eller hva som stopper.",
    ],
  },
  {
    b: 230,
    date: "2026-09-28",
    title: "Kortere «Produksjon nå»",
    items: [
      "«Produksjon nå» viser én linje per ovn: hva den lager, til hvem og hvor mye som er igjen.",
      "Vil du velge kvalitet selv, trykker du «Velg selv». Bryterne og forklaringene ligger under «Innstillinger og forklaring».",
    ],
  },
  {
    b: 229,
    date: "2026-09-28",
    title: "Salgsdirektøren er under Folk",
    items: [
      "Salgsdirektøren er en av de ansatte: du ansetter den under Folk → Ansett og styrer den under Folk → Ansatte.",
      "Konsern har nå fanene Oversikt, Utvid og Industrien.",
    ],
  },
  {
    b: 228,
    date: "2026-09-28",
    title: "Færre sene leveranser",
    items: [
      "Valseverket valser bare stålet armeringsordrene trenger, og tar ikke lenger emnene emneordrene venter på.",
      "Ovnene lager emner til valseverket jevnt, så armeringen ikke hoper seg opp mot fristen.",
      "Salgsdirektøren lar det være litt mer luft til fristene.",
    ],
  },
  {
    b: 227,
    date: "2026-09-28",
    title: "Industrien rundt verket",
    items: [
      "Fanene i Konsern heter nå Oversikt, Utvid, Industrien og Ledelse.",
      "Under Industrien finner du skraplageret og konsernkassa. Flere selskaper kommer der etter hvert.",
      "Salgsdirektøren ligger under Ledelse.",
    ],
  },
  {
    b: 226,
    date: "2026-09-28",
    title: "Konsernet får sin egen side",
    items: [
      "Konsern er nå en egen knapp i menyen, ikke en fane under Verket.",
      "Konsernet har egne faner: Oversikt, Utvid (kjøp nye verk), Skraplager og Direktør.",
      "Er anbudet på skraplageret åpent og du ikke har bydd, får Konsern et utropstegn i menyen – trykk, så kommer du rett til anbudet.",
    ],
  },
  {
    b: 225,
    date: "2026-09-28",
    title: "Ryddigere ark",
    items: [
      "Alle ark (innstillinger, fagboka, varsler, utstyr og flere) har samme topp, og den blir stående når du ruller – så lukk-knappen alltid er der.",
      "På de minste telefonene går fanene i varsellista i to rader i stedet for å kuttes.",
    ],
  },
  {
    b: 224,
    date: "2026-09-27",
    title: "Ny toppliste",
    items: [
      "Topplista har fått ny form: din plass står øverst, du velger sesongen eller Hall of Fame, og en linje sier hva lista viser.",
      "Forklaringen av lista ligger bak «Slik virker lista», så lista kommer først.",
    ],
  },
  {
    b: 223,
    date: "2026-09-27",
    title: "Armeringen kommer i tide igjen",
    items: [
      "Valseverket sto av og til stille fordi alle emnene var holdt av til emneordrer lenger nede i køen, så armeringsordrene ble for sene. Nå får armeringsordrene øverst i køen emnene de trenger.",
      "Rådgiveren tilbyr ikke lenger en innleid planlegger når du alt har planleggere.",
    ],
  },
  {
    b: 222,
    date: "2026-09-27",
    title: "Pause på Salg",
    items: [
      "Spillet står på pause mens du er på Salg, så du rekker å lese forespørslene. Når du går ut, fortsetter det i samme fart – eller start tida selv mens du er der.",
      "Vil du ikke ha det slik, kan du slå det av under Innstillinger.",
    ],
  },
  {
    b: 220,
    date: "2026-09-27",
    title: "Ryddigere Verket og topplista",
    items: [
      "På Verket er kortet om storverket og sluttmålet borte når konsernet er åpnet – sluttmålet står på Konsern. Før det viser kortet neste steg: konsernet.",
      "Topplista viser ikke lenger hvor mange dager som er igjen av sesongen.",
    ],
  },
  {
    b: 219,
    date: "2026-09-27",
    title: "Roligere skrapvarsel og holdeknapp uten kopiering",
    items: [
      "Når du holder knappen i kontrollrommet, prøver ikke mobilen lenger å markere eller kopiere teksten.",
      "«Mangler skrap» vises bare når ovnen faktisk ikke kan starte neste charge. Mangler én skraptype, fyller ovnen opp med de andre – og med planlegger kjøper den inn det som trengs.",
    ],
  },
  {
    b: 218,
    date: "2026-09-27",
    title: "Landemerker på Mål, uten frist",
    items: [
      "Landemerkene står nå på Mål, sammen med dagens oppdrag.",
      "Et landemerke går aldri ut: forespørselen venter til du svarer, og når du har signert, står det først i køen til det er levert – uten frist og uten bot.",
    ],
  },
  {
    b: 217,
    date: "2026-09-27",
    title: "Salgsdirektøren tar avtaler igjen",
    items: [
      "Salgsdirektøren regnet bare med det valseverket rekker, ikke emnene verket lager i tillegg, og sa derfor nei til nye rammeavtaler. Nå regner den med alt verket lager – og armering bare med det valseverket rekker.",
      "På PC åpner Verket i sidemenyen Oversikt, ikke Konsern, når du kommer fra en annen side.",
    ],
  },
  {
    b: 216,
    date: "2026-09-27",
    title: "Nytt kontrollrom",
    items: [
      "Kontrollrommet har fått ikoner i stedet for emojier, og knappen du holder inne, står nederst der tommelen er.",
      "På PC står ovnen til venstre og målerne og knappene til høyre, og resultatet vises i to kolonner.",
    ],
  },
  {
    b: 215,
    date: "2026-09-27",
    title: "Tydeligere økonomi",
    items: [
      "På Verket → Økonomi står verkets snitt for sju døgn først. Går verket i minus et enkelt døgn fordi skrapet er betalt før ordrene er levert, står det forklart – og tallet er gult, ikke rødt, når snittet er i pluss.",
    ],
  },
  {
    b: 214,
    date: "2026-09-27",
    title: "Topplista og brukernavn",
    items: [
      "Pokalen viser bare topplista igjen. Mål (dagens oppdrag, uka og merker) har fått sin egen knapp ved siden av, med en prikk når noe kan hentes.",
      "Når du lager konto, velger du et brukernavn – og da er du med på topplista med én gang.",
    ],
  },
  {
    b: 212,
    date: "2026-09-27",
    title: "Gjest og Mål",
    items: [
      "Spiller du uten konto, lagres spillet på nett i bakgrunnen som gjest. Oppretter du konto, følger spillet med.",
      "På Mål ser du hva en konto gir deg: plassen du ville hatt på topplista, den daglige belønningen og bonusen for dagens oppdrag.",
      "Mål har fått ikoner i stedet for emojier, og kortere navn på fanene: I dag, Uka, Merker og Toppliste.",
      "En spiller som ble lenge på stålverket og sparte, ble tatt for juks ved en feil. Det er rettet.",
    ],
  },
  {
    b: 211,
    date: "2026-09-27",
    title: "Landemerker, egen Mål-side og vikarer",
    items: [
      "Tar du et landemerke, går det først i ordrekøen – også når salgsdirektøren har fylt opp køen. Direktøren holder av plass til landemerker som venter på svar.",
      "Daglig belønning, dagens oppdrag, ukens utfordring, sesongstigen, utfordringer og prestasjoner har fått sin egen side: Mål. Trykk på pokalen ved varslene.",
      "Ny bryter på Folk → Fravær: skiftlederen kan leie inn vikarer for alle som er borte, ikke bare når et skift ellers faller bort.",
      "Et spill som serveren har rettet, kan ikke lenger bli overskrevet av en gammel kopi fra en annen enhet.",
    ],
  },
  {
    b: 210,
    date: "2026-09-27",
    title: "Tilbakemeldinger fra spillerne",
    items: [
      "Anbudet på skraplageret viser hvem som har bydd – men ikke hvor mye.",
      "En flink operatør kan bli skiftleder: send hen på lederutvikling under Folk → Ansatte. Kurset er dyrt og tar 60 døgn.",
      "Salgsdirektøren kan ansettes rett fra Salg og fra Folk → Ansett.",
      "Er kvalitetsvalget grått fordi ordrekøen styrer, står det nå hvorfor – med en knapp for å velge selv.",
      "Det finnes alltid søkere til de anbefalte rollene, og du kan ansette rett fra anbefalingen.",
      "Samme hendelse kommer ikke igjen og igjen på 10×, og etter kameraene holder kobbertyvene seg unna verket.",
    ],
  },
  {
    b: 209,
    date: "2026-09-27",
    title: "Konsernet bygger i ekte tid",
    items: [
      "Å bygge, bygge ut og modernisere datterverk tar nå ekte timer, uansett spillfart: et stålverk 2 timer, et storverk 6, et stålkompleks 12 og hvert trinn modernisering 4. Du ser nedtellingen under Dine verk.",
      "Utbyttet fra datterverkene er trimmet. Et stålkompleks tjener mindre, men koster også mindre. Et fullt konsern gir omtrent en tredjedel av det det ga før, og konsernverdien er lavere. Titlene du har nådd, beholder du.",
      "Hjemmeverket er flaggskipet: godt omdømme og stål som holder kvaliteten gir inntil 20 % mer utbytte fra alle datterverkene.",
    ],
  },
  {
    b: 208,
    date: "2026-09-27",
    title: "Returskrapet brukes opp",
    items: [
      "Skrapklasseren smelter om verkets eget returskrap (kapp fra støping og valsing) i stedet for kjøpt skrap, inntil en fjerdedel av chargen. Returen hoper seg ikke lenger opp på lageret.",
      "Planleggeren holder av plass på skraplageret: blir det over 90 % fullt, selger den det ingen resept trenger. Da rekker innkjøpet, og ovnene står ikke og venter på skrap.",
    ],
  },
  {
    b: 207,
    date: "2026-09-27",
    title: "Plass til flere på storverket",
    items: [
      "Storverket har plass til 240 ansatte i stedet for 220. Da får du plass til fem skiftlag og alle de anbefalte rollene, som murere og reparatører.",
    ],
  },
  {
    b: 206,
    date: "2026-09-27",
    title: "Konsernet som hovedkontor",
    items: [
      "På PC har Konsern fått en egen side: konsernverdien og neste steg øverst, og verkene i en tabell du kan sammenligne.",
      "Bare verket rådet gjelder, har blå knapp, så du ser hva som lønner seg mest.",
      "Salg og bytte av et verk ligger under «Mer» i tabellen.",
    ],
  },
  {
    b: 205,
    date: "2026-09-27",
    title: "Ryddigere forskning",
    items: [
      "Forskning du ikke har råd til ennå, har en linje som viser hvor nær du er og hvor mange fagpoeng som mangler.",
      "Fagpoengene, hvordan du får flere og forskningssamarbeidet står samlet i ett kort.",
      "På PC står forskningen i to kolonner, med fagpoengene til høyre.",
    ],
  },
  {
    b: 204,
    date: "2026-09-27",
    title: "Ryddigere Folk",
    items: [
      "Bemanningstabellen viser hvor flinke folkene er i hver rolle, så du ser hvor kurs gir mest.",
      "På PC står bemanningen alltid synlig ved siden av skiftene, og de ansatte står i to kolonner.",
      "Knappene for å ansette, leie inn vikarer og gi bonus er større på mobil.",
    ],
  },
  {
    b: 203,
    date: "2026-09-27",
    title: "Tydeligere økonomi",
    items: [
      "Verket → Økonomi viser gårsdagens resultat stort øverst, og en graf over resultatet de siste 30 døgnene.",
      "Du ser hva pengene kom fra og gikk til i går, post for post: skrap, strøm, lønn og resten.",
    ],
  },
  {
    b: 202,
    date: "2026-09-27",
    title: "Tydeligere varsler",
    items: [
      "Marked og Folk får et utropstegn i menyen når noe der trenger deg – for eksempel når skrapet er tomt eller trivselen er lav. Trykk, så kommer du rett dit.",
      "Varsellinja viser det nyeste varselet du ikke har sett, ikke bare at det finnes et.",
    ],
  },
  {
    b: 201,
    date: "2026-09-27",
    title: "Varslene nederst på mobil",
    items: [
      "På mobil står varsellinja og topplista nå rett over menyen nederst, der tommelen er.",
      "Toppfeltet er mye lavere, så verket og rådene kommer høyere opp på skjermen.",
    ],
  },
  {
    b: 200,
    date: "2026-09-27",
    title: "Ikke lenger tomrom på Verket på PC",
    items: ["På PC følger målet og de andre kortene rett under bildet av verket, uten et stort tomt felt imellom."],
  },
  {
    b: 199,
    date: "2026-09-27",
    title: "Resepten har flyttet til Verket",
    items: [
      "Resepten ligger nå under Verket → Resept, sammen med resten av produksjonen. Marked handler om innkjøp og priser.",
      "Fanen blir oransje når resepten ikke holder kravet, som før.",
    ],
  },
  {
    b: 198,
    date: "2026-09-27",
    title: "Ryddigere Salg",
    items: [
      "På PC står forespørslene i en liste med kunde, verdi og om du rekker det – trykk på en for å se den og signere.",
      "Kunde og verdi står tydeligst på hver forespørsel, og Signer-knappen er større.",
      "Underfanene viser hele navnet også på små telefoner.",
    ],
  },
  {
    b: 197,
    date: "2026-09-27",
    title: "Skrapmarkedet som tabell på PC",
    items: [
      "På PC står alle skraptypene i én tabell med pris, innhold, lager og kjøpsknapper på samme rad.",
      "Pristrenden vises med en pil: oransje når prisen stiger, grønn når den faller.",
    ],
  },
  {
    b: 196,
    date: "2026-09-27",
    title: "Tydeligere Anlegg",
    items: [
      "Hvert sted i produksjonen viser status med et merke: smelter, venter, støper, mangler skrap, lager fullt.",
      "På PC står hele produksjonslinja på én rad øverst på Anlegg.",
    ],
  },
  {
    b: 195,
    date: "2026-09-27",
    title: "Roligere oversikt",
    items: [
      "Rådet under anleggsbildet er roligere, og flere råd samles under «Flere råd».",
      "Rutene i produksjonslinja viser status med ikon og farge: kjører, venter, står, mangler skrap, lager fullt.",
      "Boblene over verket samles til én om gangen, så det ikke blir kaos på 10×.",
    ],
  },
  {
    b: 194,
    date: "2026-09-27",
    title: "Topplista tåler store kjøp",
    items: ["Kjøper du mange verk eller moderniseringer på én gang, blir du ikke lenger tatt ut av topplista for det."],
  },
  {
    b: 192,
    date: "2026-09-27",
    title: "Ny meny på PC og mer plass på mobilen",
    items: [
      "På PC står menyen til venstre, og Konsern har fått sitt eget punkt der når konsernet er åpnet.",
      "Toppen på PC er én smal rad med tall, varsler og knapper – mer plass til selve verket.",
      "Oversikt, Anlegg og Økonomi står nå øverst på Verket, så du slipper å scrolle forbi bildet.",
      "Menyen nederst på mobilen har fått ikoner, og tallene øverst tar mindre plass.",
      "Fagboka, varslene, topplista og innstillingene åpnes fra høyre på PC, så du ser spillet bak.",
    ],
  },
  {
    b: 191,
    date: "2026-09-27",
    title: "Et ryddigere utseende – første steg",
    items: [
      "Faste farger og skriftstørrelser overalt: grønt betyr god drift, gult og oransje varme og advarsel, rødt bare feil.",
      "Overskrifter og store tall har fått en egen, tydelig skrift der sifrene står rett under hverandre.",
      "Nye, rolige ikoner i toppfeltet i stedet for emoji.",
      "Uten konto: ett kort som viser hva du får med konto, i stedet for tre.",
    ],
  },
  {
    b: 190,
    date: "2026-09-27",
    title: "Samme klokke for alle",
    items: [
      "Alle kan flytte like mye inn i konsernkassa: 100 mill. kr per døgn, uansett hvor stor kassa hjemme er.",
      "Ukens utfordring «dager» teller nå ekte dager du har spilt, ikke døgn i spillet. Likt antall gir delt plass.",
      "Spill så mye og så fort du vil hjemme – i verden mellom spillerne går alle på samme klokke.",
    ],
  },
  {
    b: 189,
    date: "2026-09-27",
    title: "Skraplageret – det første selskapet i verden",
    items: [
      "Har du et konsern, finner du Skraplageret på Konsern-fanen. Eieren tjener på skrapet de andre spillerne bruker.",
      "Det deles ut ved anbud i 48 timer. Budene er skjulte, høyeste bud vinner, og likt bud avgjøres ved trekning. Vinneren driver lageret i 14 dager.",
      "Bud betales fra konsernkassa. Du flytter penger dit fra kassa i spillet – et visst beløp per døgn.",
      "Farten i spillet gir ingen fordel: hver spiller teller høyst én vanlig dags skrapbruk per dag.",
    ],
  },
  {
    b: 186,
    date: "2026-09-27",
    title: "Økonomireformen",
    items: [
      "De aller største kassene er gjort mindre, så topplista kan sammenlignes igjen. Kasser under 250 mill. er ikke rørt.",
      "Verkene, forskningen, fagpoengene og rekordene i Hall of Fame står som før. Rekkefølgen mellom spillerne er den samme.",
    ],
  },
  {
    b: 182,
    date: "2026-09-27",
    title: "Konsernet gir utbytte, og Grunnleggeræraen",
    items: [
      "Datterverkene tjener like godt som før, men beholder en del til vedlikehold og reserve. Resten går til deg som utbytte.",
      "Et stort konsern koster: ledelse, reiser og koordinering. Flere verk gir fortsatt mer, men hvert nytt verk gir litt mindre enn det forrige.",
      "Konsern-fanen viser hva verkene tjener, hva de beholder, og hva konsernledelsen koster.",
      "Vi er i Grunnleggeræraen. «Alle tider» på topplista heter nå Hall of Fame.",
    ],
  },
  {
    b: 179,
    date: "2026-09-26",
    title: "Skiftledere, rettferdig spill og «Hva er nytt»",
    items: [
      "Nytt: skiftledere fra stålverket. De følger opp fraværet for deg – advarsel til dem som misbruker egenmelding, aldri til dem som faktisk var syke – og færre blir syke.",
      "Landemerkene tar du selv. Salgsdirektøren lar dem stå, og Salg viser dem med tall selv når direktøren er på.",
      "Bare én fane eller ett vindu spiller om gangen. Åpner du spillet et annet sted, lagrer det gamle vinduet og står stille.",
      "Topplistene sjekker at spilldøgnene går i vanlig fart. Utvidelser som får tida til å gå fortere, gir ingen fordel.",
      "Denne lista: etter en oppdatering ser du hva som er nytt. Hele lista ligger under Innstillinger.",
    ],
  },
  {
    b: 175,
    date: "2026-09-26",
    title: "Nytt kontrollrom",
    items: [
      "«Ta styringen» er et kort spill i fire runder, under ett minutt: smelt, blås ut karbonet, rak ut slaggen og tapp.",
      "Poeng, kombo og rekord – og «Ta neste charge også».",
    ],
  },
  {
    b: 174,
    date: "2026-09-26",
    title: "Landemerker",
    items: [
      "Ett nytt landemerke per dag: bruer, stadioner, vindparker og mer. Lever dem og fyll samlingen på Verket.",
      "Kortet «Kobbertyver» kommer først fra støperiet og koster mindre.",
    ],
  },
  {
    b: 173,
    date: "2026-09-26",
    title: "Sesongstigen",
    items: [
      "Sesongstigen på Verket: poeng for spilte dager, dagens belønning, dagens oppdrag og topp 3 på ukelista. 50 trinn med fagpoeng og pynt.",
      "Fire nye titler etter Stållegende.",
    ],
  },
  {
    b: 172,
    date: "2026-09-26",
    title: "Varsler, ukeliste og salgsdirektør",
    items: [
      "Varsellinja viser det nyeste først, og ✕ fjerner alle varsler.",
      "Én ukeliste for alle, målt i prosent, så små verk kan slå store.",
      "Salgsdirektøren kan oppgraderes: salgsteam, kundenettverk og eksportkontor.",
    ],
  },
  {
    b: 171,
    date: "2026-09-26",
    title: "Skrap, reservepotter og flere hendelser",
    items: [
      "Planleggeren kjøper skrap til ordrene som kommer, og kan selge skrap du ikke trenger.",
      "Skrapklasseren bytter til annet skrap når returskrapet ikke rekker.",
      "Flere og mer varierte hendelser. Færre messer når omdømmet er høyt, og naboklager og nettselskapet sjeldnere.",
    ],
  },
];

const SEEN_KEY = "stalverk-nytt-sett";

/** Høyeste beslutningsnummer spilleren har sett i endringsloggen på denne enheten, eller null hvis aldri */
export function seenChangelog(): number | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function markChangelogSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, String(CHANGELOG[0].b));
  } catch {
    // Uten lagring vises lista igjen neste gang; det er ikke farlig
  }
}

/** Så mange oppføringer vises første gang for en spiller som har spilt før endringsloggen kom */
const FIRST_TIME_ENTRIES = 3;

/**
 * Oppføringene som er nye for spilleren. En ny spiller (uten lagret spill) skal ikke få lista: da merkes alt som sett.
 */
export function unseenChangelog(hadSave: boolean, seen = seenChangelog()): ChangelogEntry[] {
  if (seen === null) {
    if (!hadSave) {
      markChangelogSeen();
      return [];
    }
    return CHANGELOG.slice(0, FIRST_TIME_ENTRIES);
  }
  return CHANGELOG.filter((e) => e.b > seen);
}
