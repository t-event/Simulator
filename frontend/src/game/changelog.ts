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
    b: 430,
    date: "2026-10-02",
    title: "Tryggere lagring ved bytte av konto",
    items: [
      "Bytter du konto mens spillet lagres, kan spillet ikke lenger havne på feil konto.",
      "Daglig belønning og dagens oppdrag kommer fram også når du bytter konto mens appen henter dem.",
      "Går du til et annet vindu mens spillet lagres, blir det nyeste lagret rett etterpå.",
      "Ukens kontrollrom: forsøket tåler at du snur skjermen mens det startes.",
      "Spillet kan fortsatt åpnes uten nett selv om en oppdatering feiler halvveis.",
      "Rådgiveren teller alle sene kontrakter de siste ti døgnene, ikke bare de siste fem.",
      "Slettes en konto midt i et oppkjøp, får den andre parten pengene sine tilbake.",
    ],
  },
  {
    b: 428,
    date: "2026-10-02",
    title: "Flere små rettinger",
    items: [
      "Spillet kan åpnes uten nett allerede etter første besøk.",
      "Svaralternativene i fagbokas quiz står ikke lenger i samme rekkefølge hver gang.",
      "«Hent alt» på Mål viser nye kister og trinn uten at du må åpne «Uka» først.",
      "Konsernet viser ikke lenger at plassene er fulle når de ikke er det.",
      "Prikken for nye meldinger i Skiftrapporten blir ikke borte før du har sett dem.",
    ],
  },
  {
    b: 427,
    date: "2026-10-02",
    title: "Rettinger i kontrollrommet og verket",
    items: [
      "Ukens kontrollrom: et resultat blir ikke lenger borte om telefonens klokke går feil, og et forsøk tåler at du snur nettbrettet.",
      "Bytte av produksjon sperres til lageret har riktig kvalitet for kontraktene du har, ikke bare nok tonn.",
      "Forespørsler på 3× og 10× forsvinner ikke lenger før svarfristen er ute.",
      "Sommerstansen koster foring for hver ovn slik den er, ikke som om alle var den største.",
      "Rådet om motbud sier ikke lenger «går ikke» om et motbud som faktisk holder.",
    ],
  },
  {
    b: 426,
    date: "2026-10-02",
    title: "Tryggere lagring på nett",
    items: [
      "Legger du bort appen mens den lagrer, kommer det siste du gjorde likevel med til nett.",
      "En lagring som henger på dårlig nett, gir opp etter 30 sekunder og prøves igjen, i stedet for å stoppe lagringen.",
      "Bytter du konto mens noe hentes, havner ikke belønninger eller kjøp i feil spill.",
    ],
  },
  {
    b: 423,
    date: "2026-10-02",
    title: "Utbytte fra ferdige verk med én gang",
    items: [
      "Et datterverk som blir ferdig, gir utbytte fra samme kvarter – også når du ikke er i spillet. Før kom det først med når du åpnet spillet igjen.",
    ],
  },
  {
    b: 422,
    date: "2026-10-02",
    title: "Meldinger er på for alle",
    items: ["Privatmeldinger er nå på for alle. Vil du ikke ha meldinger, skrur du dem av i Min profil."],
  },
  {
    b: 421,
    date: "2026-10-02",
    title: "Privatmeldinger",
    items: [
      "Send meldinger til andre spillere: trykk på et brukernavn og «Send melding». Samtalene står under «Meldinger» i Skiftrapporten.",
      "Meldinger er av til du slår dem på i Min profil, og begge må ha dem på. Du kan blokkere spillere og rapportere meldinger.",
      "Meldinger kan rapporteres også i Skiftrapporten.",
    ],
  },
  {
    b: 420,
    date: "2026-10-02",
    title: "Min profil",
    items: [
      "Skriv en kort tekst om deg selv, velg et profilmerke blant pynten din og vis fram tre prestasjoner. Åpne din egen profil og trykk «Rediger profilen», eller «Min profil» under kontoen i innstillingene.",
    ],
  },
  {
    b: 419,
    date: "2026-10-02",
    title: "Profiler",
    items: [
      "Trykk på et brukernavn i topplista, ukelista, Skiftrapporten, på kartet eller i Industrien for å se profilen: tittel, merker, sesonger, konsernverdi og verk per region, selskaper og rekorder.",
      "Profilen viser når spilleren sist var aktiv (i dag, i går, denne uka …). Konsernkassa og kassa vises aldri.",
    ],
  },
  {
    b: 418,
    date: "2026-10-02",
    title: "Bedre forklaring på sene leveranser",
    items: [
      "Har du salgsdirektør og leveranser blir sene, forklarer rådgiveren hva som skjedde: hvor mye som manglet, og at produksjonen falt etter at kontraktene ble signert.",
      "Loggen sier om en kontrakt som gikk over fristen, var signert av salgsdirektøren eller var en ukeleveranse i en rammeavtale.",
    ],
  },
  {
    b: 417,
    date: "2026-10-02",
    title: "Riktigere Konsernverdi",
    items: [
      "Konsernverdien på topplista regner bidraget fra hovedverket med det du faktisk produserer – en som ikke spiller, står ikke lenger med fullt bidrag.",
    ],
  },
  {
    b: 416,
    date: "2026-10-02",
    title: "Riktig utbytte på Økonomi",
    items: [
      "Økonomi viser utbyttet datterverkene gir konsernkassa per ekte dag, i stedet for en rute som alltid sto på 0 kr.",
    ],
  },
  {
    b: 415,
    date: "2026-10-02",
    title: "Hent alt på Mål",
    items: [
      "Det du kan hente – dagens bonus, ukekista og trinn på sesongstigen – står øverst på Mål med én knapp: «Hent alt».",
    ],
  },
  {
    b: 414,
    date: "2026-10-02",
    title: "Enklere Folk og Marked",
    items: [
      "Søkere kan filtreres på rolle, og forklaringen av rollen står rett over lista.",
      "Hver ansatt har én «Mer»-knapp med kurs, skiftleder og oppsigelse.",
      "Skraptypene viser renhet som en stolpe på mobil – tallene står når du trykker på navnet.",
      "Planleggerens innkjøp har fått egen fane under Marked.",
    ],
  },
  {
    b: 413,
    date: "2026-10-02",
    title: "Det nye i Fagboka øverst, forskning i grupper",
    items: [
      "Fagboka viser uleste kapitler øverst under «Nytt for deg», og hvor mange du har lest i hvert tema.",
      "Forskning er sortert etter hva prosjektene gir: fart og automatikk, nytt utstyr, drift og kvalitet, skrap og strøm, salg og priser.",
    ],
  },
  {
    b: 412,
    date: "2026-10-02",
    title: "Ryddigere økonomi og resultat i kontrollrommet",
    items: [
      "Økonomi viser de tre største inntektene og kostnadene med stolper – resten finner du under «Alle poster».",
      "Resultatet i kontrollrommet ser ut som resten av spillet: poengene store, endringen mot rekorden under og tydelige knapper.",
    ],
  },
  {
    b: 411,
    date: "2026-10-02",
    title: "Kortere flyttedag og roligere skiftrapport",
    items: [
      "Flyttedagen sier det viktigste i én setning – tallene finner du på Verket.",
      "Startskjermen viser spillet ditt og Fortsett øverst når du har et spill.",
      "Hendelser i Skiftrapporten står som dempede linjer, så meldingene fra andre spillere synes bedre.",
    ],
  },
  {
    b: 410,
    date: "2026-10-02",
    title: "Konsern: plass og region",
    items: [
      "Konsernverdien viser plassen din på topplista.",
      "Under Dine verk står regionen ved trinnet.",
      "«Slik fungerer konsernet» er flyttet til Fagboka.",
    ],
  },
  {
    b: 408,
    date: "2026-10-01",
    title: "Hvor mange som spiller",
    items: ["Startskjermen viser hvor mange spillere som har vært aktive de siste 24 timene."],
  },
  {
    b: 407,
    date: "2026-10-01",
    title: "Ryddigere Salg og Konsern",
    items: [
      "Under Salg står innstillingene for forespørsler bak én rad, så forespørslene kommer rett under.",
      "Konsern-oversikten viser konsernverdien stort, og under den konsernkassa, utbyttet og antall datterverk.",
    ],
  },
  {
    b: 406,
    date: "2026-10-01",
    title: "Rådet blir oransje når noe står",
    items: [
      "Rådet under anleggsbildet blir oransje når noe står eller går tapt, og rødt ved fare for konkurs. Det viktigste står først.",
      "Pauseknappen har fått et vanlig pause-ikon.",
      "På hendelseskortene er alle valgene like – spillet sier ikke lenger hvilket svar som er «riktig».",
    ],
  },
  {
    b: 405,
    date: "2026-10-01",
    title: "Nytt verdenskart",
    items: [
      "Verdenskartet under Konsern er tegnet på nytt: kystlinjer, tydeligere merker for dine og andres verk, og verk som bygges, vises stiplet.",
      "Velg Alle, Dine eller Selskaper for å se det du leter etter.",
      "Fra en region kan du gå rett til å bygge neste verk der.",
    ],
  },
  {
    b: 404,
    date: "2026-10-01",
    title: "Tydeligere nøkkeltall",
    items: [
      "Resultatet og produksjonen i går viser om det gikk bedre eller dårligere enn døgnet før.",
      "Konsernverdien viser hvor mye som kommer inn per ekte dag.",
      "Ark og vinduer toner rolig inn, og på PC står nøkkeltallene i egne ruter.",
    ],
  },
  {
    b: 403,
    date: "2026-10-01",
    title: "Riktig tidspunkt i varslene",
    items: ["Varsler om betalinger og anbud viser riktig tidspunkt også når klokken på mobilen er feil."],
  },
  {
    b: 399,
    date: "2026-10-01",
    title: "Fagpoeng mens du er borte",
    items: [
      "«Mens du var borte» gir nå også litt fagpoeng: 10 for hver time du har vært borte, høyst 80 (åtte timer). Det krever konto, som pengene.",
      "Ukens kontrollrom: et resultat som ikke ble levert, blir ikke lenger skygget av et gammelt resultat fra en annen konto på samme enhet.",
    ],
  },
  {
    b: 397,
    date: "2026-10-01",
    title: "Feilrettinger",
    items: [
      "Ukens kontrollrom: en ny versjon av spillet laster ikke lenger siden på nytt midt i et tellende forsøk, og resultatet sendes selv om du går til en annen side eller nettleseren ikke kan lagre det.",
      "Ukens kontrollrom: de siste 15 minuttene før uka slutter kan du ikke starte et nytt tellende forsøk – det ville ikke rukket å telle.",
      "Pengene for tida du var borte går ikke lenger tapt hvis nettet svikter halvveis.",
      "Dagens oppdrag byttes ved midnatt også når du spiller uten pause.",
      "Skrapklasseren bruker ikke lenger returskrap som er skitnere enn det rene skrapet det skal erstatte.",
      "En verdenshendelse som er over (for eksempel en strømkrise), virker ikke lenger når du spiller uten nett.",
      "Etter en dødsulykke står også valseverket mens verket er stengt.",
      "Innloggingen er sikrere når du logger ut eller bytter konto, og lagringen på nett prøver igjen av seg selv etter et kort brudd.",
    ],
  },
  {
    b: 394,
    date: "2026-09-30",
    title: "Trinnet på datterverkene",
    items: [
      "Under Konsern → Dine verk står trinnet nå med ord ved hvert verk, for eksempel «Trinn 3 av 5». Grønne prikker er trinnene verket har.",
      "Er en modernisering bestilt, står det «Trinn 3 → 4», og prikken som bygges har en ring.",
      "Når verket er på høyeste trinn, står det hvilken tittel som åpner neste trinn.",
    ],
  },
  {
    b: 387,
    date: "2026-09-30",
    title: "Ukens kontrollrom",
    items: [
      "Ny ukeutfordring: tre tellende charger i kontrollrommet. Alle kjører de samme chargene i samme rekkefølge, og den beste teller. Første gang uka som starter 19. oktober.",
      "Et forsøk er brukt når du starter det. Faller nettet ut når du leverer, blir resultatet sendt av seg selv når nettet er tilbake.",
      "Du kan øve så mye du vil på ukens kvalitet. Øvingen teller ikke.",
      "Ukeutfordringene går nå på rundgang: flest aktive dager, mer stål enn før og ukens kontrollrom.",
    ],
  },
  {
    b: 384,
    date: "2026-09-30",
    title: "Ingen tak på kassa, og sesongen avgjøres i konsernet",
    items: [
      "Kassa i verket har ikke lenger tak. Alt du tjener, blir stående. Store beløp vises kort øverst, og hele beløpet står på Verket → Økonomi.",
      "Privat formue står fast som historikk. Den vokser ikke lenger, men teller fortsatt mot sluttmålet og de største ovnene.",
      "Sesongen avgjøres nå på Konsernverdi, som serveren regner i ekte tid. Topplista er delt i «Industriverden» og «Eget verk». Under Eget verk er «Mest penger på bok» tilbake, og det er en ny liste for produksjon.",
      "Ukens utfordring «Størst vekst i konsernverdi» er tatt bort fra 5. oktober. Nå veksler «Flest aktive dager» og «Mer stål enn før».",
      "Tittelen i konsernet beholder du. Nye verk, høyere trinn og stålkomplekser følger nå det verkene dine har tjent. Ingenting du har, blir tatt bort.",
    ],
  },
  {
    b: 378,
    date: "2026-09-30",
    title: "Se hvilken dag de andre er på",
    items: [
      "Topplista viser hvilken dag hver spiller er på i sitt eget verk, under navnet. Dagen teller ikke på lista.",
    ],
  },
  {
    b: 377,
    date: "2026-09-30",
    title: "Rydding av gamle spill uten konto",
    items: [
      "Spill uten konto som ikke er lagret på 60 dager, slettes fra serveren. Spillet på mobilen din blir liggende og lagres igjen neste gang du spiller. Med konto slettes ingenting.",
    ],
  },
  {
    b: 375,
    date: "2026-09-30",
    title: "Oppkjøp som gir mening",
    items: [
      "Et oppkjøpsbud må nå være minst 10 dagers inntekt fra selskapet, ikke 30. Kjøperen eier selskapet i 14 dager, så et oppkjøp kan lønne seg.",
      "Blir selskapet ditt kjøpt, får du betalt for dagene du mister og 85 % av det du har investert – aldri mer enn 85 % av budet. Resten av budet går ut av spillet.",
      "Under Konsern → Industrien ser du hva du får hvis selskapet blir kjøpt.",
    ],
  },
  {
    b: 374,
    date: "2026-09-30",
    title: "Gamle anbud i dagens penger",
    items: [
      "Anbud fra før økonomien ble delt på 10, vises nå med hva de tilsvarer i dag, for eksempel «200 mill. (gamle penger, tilsvarer 20 mill. nå)».",
    ],
  },
  {
    b: 373,
    date: "2026-09-30",
    title: "Datterverk koster en firedel, og ingenting hopper",
    items: [
      "Datterverkene koster nå en firedel: stålverk 5 mill., storverk 20 mill. og stålkompleks 60 mill. Modernisering og utbygging er like mye billigere. Et kjøp er betalt tilbake på uker, ikke hundrevis av dager.",
      "Har du kjøpt eller modernisert noe etter midnatt i natt, har du fått mellomlegget tilbake i konsernkassa.",
      "Beholder eieren et selskap etter et oppkjøpsbud, kan andre by igjen med én gang. Vernet på 3 dager gjelder bare når selskapet får ny eier.",
      "Tallene øverst flytter seg ikke lenger når ett av dem endrer seg, og tallet på bjella ligger oppå hjørnet.",
      "«Siste hendelser» på Oversikt har fast høyde, og verkene under Konsern → Oversikt åpner og lukker seg ikke av seg selv mens spillet går.",
    ],
  },
  {
    b: 372,
    date: "2026-09-30",
    title: "Oppkjøp gir 14 dager, og Utvid er enklere",
    items: [
      "Kjøper du et selskap ved oppkjøp, eier du det i 14 dager fra kjøpet – ikke bare resten av perioden til den forrige eieren. De første 3 dagene kan ingen by på det.",
      "Pausen på 14 dager gjelder nå bare når eieren beholdt selskapet etter et oppkjøpsbud.",
      "Kortet for selskapet ditt viser riktig tid for når andre kan by igjen.",
      "Konsern → Utvid: konsernkassa, antall datterverk og byggekøen står øverst, og hvert kjøp har tallene på én linje. Knappene sier hva som skjer: Kjøp, Moderniser, Bygg ut eller Bytt.",
      "Er køen eller plassene fulle, står det øverst hva du kan gjøre.",
    ],
  },
  {
    b: 371,
    date: "2026-09-30",
    title: "Oppkjøp og motbud",
    items: [
      "Selskapene bruker nå ordene fra virkeligheten: en annen spiller legger inn et oppkjøpsbud, og eieren kan svare med et motbud. «Angrep» og «forsvar» er borte.",
      "Forsvarsfondet heter nå beredskapsfondet, og politikken «Bygg forsvar» heter «Bygg beredskap». Det virker som før.",
      "Poengene «angrep mot forsvar» er byttet ut med hvem som står sterkest: oppkjøpsbudet eller eieren.",
    ],
  },
  {
    b: 370,
    date: "2026-09-30",
    title: "Selskapene er lettere å forstå",
    items: [
      "Eier du et selskap, står det nå hvor trygt det er med vanlige ord: hvor stort bud en annen spiller trenger for å ta det fra deg, om det er vernet (de første 3 dagene), og hva som gjør det tryggere.",
      "Skriver du inn et beløp å investere, ser du med én gang hva Kontrollen blir, og hvor stort bud som da trengs.",
      "Prøver noen å ta selskapet, står det om du beholder det slik det står, og hvor mye du må sette inn i forsvaret.",
      "Kontrollen heter nå sterk, god, middels eller svak. «Presset» ble lest som at noen angrep selskapet.",
      "Nytt spørsmål i «Slik henger pengene sammen»: Hva er Kontroll – og kan noen ta selskapet mitt?",
    ],
  },
  {
    b: 369,
    date: "2026-09-30",
    title: "Pengene til konsernkassa kommer ved midnatt",
    items: [
      "Utbyttet, bidraget og inntekten fra selskapene kommer nå inn i konsernkassa rett etter midnatt norsk tid, for dagen før. Før skiftet dagen kl. 02:00. Det står under Konsern → Industrien og i «Slik henger pengene sammen».",
    ],
  },
  {
    b: 367,
    date: "2026-09-29",
    title: "Hvor mange datterverk du kan ha",
    items: [
      "Konsernet har plass til 8 datterverk med forskningen «Større konsern», og to til når du blir Stålfyrste, Stålkeiser og Stålgigant – 14 i alt. Under «Dine verk» står det nå hva som gir de neste plassene, og hva som er det meste.",
    ],
  },
  {
    b: 361,
    date: "2026-09-29",
    title: "Jevnere bidrag fra hovedverket",
    items: [
      "Bidraget fra hovedverket til konsernkassa hoppet opp og ned fra minutt til minutt, fordi det fulgte de siste spilldøgnene (på 10× bare noen minutter). Nå måler serveren verket hvert kvarter og betaler snittet for hele dagen – en dårlig time, som fellesferien, avgjør ikke alt.",
    ],
  },
  {
    b: 359,
    date: "2026-09-29",
    title: "Privat formue",
    items: [
      "Det kassa tjener over taket på 10 mrd., heter nå «Privat formue» – det er du som eier verket, så pengene går til deg. Lista på topplista har samme navn. Ellers er alt som før.",
    ],
  },
  {
    b: 357,
    date: "2026-09-29",
    title: "Lærlinger, alder og pensjon",
    items: [
      "Lærlinger står ikke på skiftene før de har tatt fagbrev. De får halv lønn og lærer som før, og med fagbrevet blir de vanlige fagarbeidere.",
      "Alle ansatte har nå en alder, og den øker med ett år per spillår. Du ser den under Folk → Ansatte og på søkerne.",
      "De ansatte går av med pensjon, de fleste ved 67, noen litt tidligere. Du får beskjed en måned før, så du rekker å ansette en ny.",
    ],
  },
  {
    b: 356,
    date: "2026-09-29",
    title: "Lagring på nett etter driftsstans",
    items: [
      "Var serveren nede da du åpnet spillet, ble spillet før bare lagret på telefonen til du startet appen på nytt. Nå prøver appen igjen av seg selv, og spillet lagres på nett så snart serveren er tilbake.",
    ],
  },
  {
    b: 355,
    date: "2026-09-29",
    title: "Slik henger pengene sammen",
    items: [
      "Ny forklaring av pengene: kassa hjemme (spilltid) og konsernkassa (ekte tid, lik for alle), med svar på det mange lurer på – hvor blir pengene over 10 mrd. av, hvorfor kan jeg ikke flytte penger til konsernet, hva er utbytte, og hvorfor bygges verkene i ekte tid.",
      "Du finner den under Konsern → Oversikt, Konsern → Industrien og Verket → Økonomi.",
    ],
  },
  {
    b: 354,
    date: "2026-09-29",
    title: "Ryddigere toppliste",
    items: ["«Koblet til på dag N» står ikke lenger ved navnene på topplista – det sa lite for dem som ser på lista."],
  },
  {
    b: 353,
    date: "2026-09-29",
    title: "Raskere Industrien, kart, toppliste og Skiftrapport",
    items: [
      "Spillet lagrer mindre og sjeldnere på nett. Databasen ble overbelastet av store lagringer, og da tok Industrien, kartet, topplista og Skiftrapporten lang tid.",
      "Like partier på ferdigvarelageret slås sammen, så lageret er ryddigere. Tonn og kvaliteter er de samme.",
    ],
  },
  {
    b: 352,
    date: "2026-09-29",
    title: "Dagens oppdrag «Øk konsernverdien» går an igjen",
    items: [
      "Med kassa på 10 mrd. betales overskuddet ut til eierne, så konsernverdien sto stille, og oppdraget kunne ikke gjøres. Nå teller det som betales ut til eierne med, som i sluttmålet.",
    ],
  },
  {
    b: 351,
    date: "2026-09-29",
    title: "Kokillene i strengstøpingen",
    items: [
      "Kokillene – kobberformene stålet størkner i – slites nå av hvert tonn som støpes, ca. 20 døgn med full støping. Slitte kokiller gir flere strenggjennombrudd.",
      "Bytt dem under Verket → Anlegg → Vedlikehold. Det koster en hundredel av støpemaskinen og stopper støpingen et par timer. Reparatøren bytter dem selv, som foringen.",
      "Ny side i fagboka: «Kokillen slites».",
    ],
  },
  {
    b: 350,
    date: "2026-09-29",
    title: "Raskere Skiftrapport og vern mot konkurs i sommerstansen",
    items: [
      "Skiftrapporten viser de siste meldingene med én gang og henter bare det nye. Får den ikke kontakt, står det – ikke «Ingen har skrevet ennå».",
      "Prikken på Skiftrapporten kommer raskere, også når du åpner appen igjen.",
      "Banken venter med å telle døgn over kredittgrensen til sommerstansen er over. Da har du en uke på å rette opp.",
      "Er kassa under kredittgrensen, sier rådet på Verket hva du kan gjøre: selge skrap, ta opp lån eller selge fra lageret. Uka før sommerstansen får du et råd hvis kassa er i minus.",
      "De største ovnene sier nå begge veiene dit: tittelen Stålmagnat (tre storverk modernisert til trinn 3) eller 25 mrd. i verdi.",
    ],
  },
  {
    b: 347,
    date: "2026-09-29",
    title: "Ingen zoom når du skriver",
    items: [
      "Mobilen zoomer ikke lenger inn når du trykker i Skiftrapporten eller andre felt du skriver i, som innlogging og beløp.",
    ],
  },
  {
    b: 346,
    date: "2026-09-29",
    title: "Ingen vikarer når verket står",
    items: [
      "Skiftlederen leier ikke lenger inn vikarer mens hele verket står, for eksempel i sommerstansen. Er noen fortsatt borte når ovnene skal i gang igjen, leies vikarene inn da.",
      "I sommerstansen har alle ferie, så ingen blir sykmeldt.",
    ],
  },
  {
    b: 343,
    date: "2026-09-29",
    title: "Raskere Industrien og toppliste",
    items: ["Industrien og topplista laster raskere. Før kunne de bruke flere sekunder når mange spilte samtidig."],
  },
  {
    b: 342,
    date: "2026-09-29",
    title: "Riktig tall på Konsern",
    items: [
      "Tallet på Konsern teller ikke lenger modernisering av stålverk som kan bygges ut til storverk – den er bortkastet, fordi moderniseringen starter på nytt ved utbyggingen. Nå betyr tallet at det er noe verdt å kjøpe.",
    ],
  },
  {
    b: 341,
    date: "2026-09-29",
    title: "Kassetaket stenger ikke lenger for de største ovnene",
    items: [
      "Pengene som er betalt ut til eierne over kassetaket, teller nå med mot sluttmålet på 10 mrd. Står kassa fast på taket, når du sluttmålet neste gang du spiller.",
      "De største ovnene åpner ved 25 mrd. – og også her teller det som er betalt ut til eierne med. Tittelen Stålmagnat åpner dem som før.",
    ],
  },
  {
    b: 340,
    date: "2026-09-29",
    title: "Konsernkassa i toppfeltet",
    items: [
      "Konsernkassa står nå i toppfeltet ved siden av kassa. Trykk på den for å gå til Industrien, der den brukes.",
    ],
  },
  {
    b: 339,
    date: "2026-09-29",
    title: "Overtakelser og nytt i Skiftrapporten",
    items: [
      "Strategiske selskaper kan nå overtas. Legg inn et bud fra konsernkassa under Konsern → Industrien. Eieren har 72 timer til å forsvare seg, og Kontroll gjør det dyrere å ta selskapet – men med stort nok bud kan alle selskaper tas.",
      "En ny eier kan ikke angripes de første tre dagene, og bud må legges senest fem dager før konsesjonen går ut.",
      "Skiftrapporten forteller selv når et anbud åpner og avgjøres, når noen prøver å overta et selskap og hvordan det gikk, og når noen får en ny konserntittel.",
    ],
  },
  {
    b: 338,
    date: "2026-09-29",
    title: "Skiftrapporten",
    items: [
      "Ny felles chat for alle spillerne: trykk på snakkeboblen ved varsellinja. En prikk viser at det har kommet nye meldinger.",
      "Du skriver med brukernavnet ditt og kan slette dine egne meldinger. Lenker er ikke lov, og meldingene står i 30 dager.",
    ],
  },
  {
    b: 337,
    date: "2026-09-29",
    title: "Likt for alle i anbudet",
    items: [
      "Når konsesjonen på et selskap går ut, stiller alle likt i det nye anbudet. Eieren får ikke lenger ekstra vekt på budet sitt.",
      "Kontroll gjør det fortsatt dyrere for andre å ta selskapet ditt, og gir mer inntekt av investeringene.",
    ],
  },
  {
    b: 336,
    date: "2026-09-29",
    title: "Byggetid og nabolaget",
    items: [
      "Store kjøp (fra 50 mill.) tar nå noen døgn å bygge, ett om gangen. En ovn som bygges om, står så lenge.",
      "Nye ovner og støpemaskiner kjøres inn: 70 % fart det første døgnet, full fart etter fem døgn.",
      "På storverket kan du bygge i byen rundt verket: idrettshall, kulturhus, bro, skole, sykehus og konserthus. Hvert gir en liten fordel for alltid og står i bildet av verket.",
    ],
  },
  {
    b: 334,
    date: "2026-09-29",
    title: "Kontroll og utbyttepolitikk",
    items: [
      "Selskapene har nå Kontroll: sterk, stabil, presset eller svak. Den kommer av at du spiller, investerer, har verk i samme region og har eid selskapet lenge.",
      "Eieren kan investere i selskapet. Pengene blir i selskapet og gir mer Kontroll og inntil 25 % mer inntekt.",
      "God Kontroll gir en fordel når konsesjonen skal fornyes: budet ditt teller opptil 20 % mer.",
      "Utbyttepolitikk: velg hvor mye datterverkene holder igjen. Det som holdes igjen, bygger et forsvarsfond du kan investere fra. Kan endres én gang i uka.",
    ],
  },
  {
    b: 333,
    date: "2026-09-29",
    title: "Verdenskartet",
    items: [
      "Ny fane Konsern → Kart: en verden med seks regioner, der du ser dine og de andres datterverk og hvem som eier selskapene. Trykk på en region for å se hvem som har hva der.",
      "Verkene du har, er fordelt på regionene. Nye verk bygges der du velger under Utvid, ellers der du har færrest.",
      "Hvert verk kan flyttes én gang, gratis – åpne verket under Oversikt.",
    ],
  },
  {
    b: 330,
    date: "2026-09-29",
    title: "Se det du kjøper",
    items: [
      "Anleggsbildet viser nå mye mer av det du har kjøpt: lager, salgskontor, laboratorium, verksted, skrapsortering, strålingsportal, øseovn, kraftlinje fra transformatoren, vakuumtårn, skrapsaks og en ny valselinje for hvert valseverk.",
      "Med to ovner på nivå 2 får verket to piper. Havna og transportbåndet står i bildet når du har kjøpt dem.",
    ],
  },
  {
    b: 328,
    date: "2026-09-29",
    title: "Konsernet bygges fra konsernkassa, og titlene kommer av verkene",
    items: [
      "Datterverk kjøpes, bygges ut, moderniseres og selges nå med konsernkassa, ikke kassa hjemme. Prisene er satt ned: stålverk 20 mill., storverk 80 mill., stålkompleks 250 mill., modernisering 30 % av prisen per trinn.",
      "Byggekø: du kan bestille inntil tre prosjekter, og de bygges ett om gangen i ekte tid. Pengene trekkes når du bestiller. Det siste i køen kan avbestilles før det starter.",
      "Titlene kommer av verkene dine, ikke av pengene: Stålmagnat med 3 storverk på trinn 3, Stålfyrste med 6 på trinn 4, og så videre til Stålikon med 14 komplekser på trinn 6. Titlene du har, beholder du.",
      "Utbyttet er fullt så lenge du har spilt den siste uka. Etter det går det gradvis ned, og etter seks uker uten spilling stopper det til du spiller igjen.",
      "Mesterskapet «Konsernledelse» gir nå lavere administrasjon på storverket i stedet for mer utbytte. Nivåene du har, beholdes.",
    ],
  },
  {
    b: 322,
    date: "2026-09-29",
    title: "Samme konsernverdi overalt",
    items: [
      "Konsern → Oversikt viser nå samme konsernverdi som topplista: konsernkassa pluss 60 dagers utbytte og bidrag, minus lån. Den gamle verdien (kassa, lån og verkene) står under som «Verdi i spillet».",
    ],
  },
  {
    b: 321,
    date: "2026-09-29",
    title: "Kalender, og ferie for salgsdirektøren",
    items: [
      "Nytt kort «Kalender» på Oversikt: når fellesferien og vinteren kommer, hvor lenge det er til, og hva du har valgt for ferien – så du kan planlegge ordrene fram til sommerstans.",
      "Salgsdirektøren tar ikke ordrer i sommerstansen lenger. Forespørsler som venter, får tre uker lenger frist når stansen begynner, og en rammeavtale du signerer i stansen, starter når ovnene går igjen.",
    ],
  },
  {
    b: 320,
    date: "2026-09-29",
    title: "Ny liste på topplista: Konsernverdi",
    items: [
      "Topplista har fått en ny liste, «Konsernverdi»: konsernkassa pluss 60 dagers utbytte og bidrag, minus lån. Serveren regner den ut i ekte tid, så spillfarten og kassa i verket betyr ingenting – god drift gjør det. Den gamle lista heter nå «Verdi i spillet» og står som før.",
    ],
  },
  {
    b: 319,
    date: "2026-09-29",
    title: "Ingen innskudd i konsernkassa lenger",
    items: [
      "Du trenger ikke lenger flytte penger fra verket til konsernkassa. Hovedverket betaler et bidrag av seg selv hver dag, og kassa i verket blir i verket. Det du alt har flyttet, står.",
    ],
  },
  {
    b: 318,
    date: "2026-09-29",
    title: "Hovedverket betaler til konsernkassa",
    items: [
      "Hovedverket betaler nå et bidrag til konsernkassa hver dag, av seg selv: halvparten av det verket tjener på en vanlig spilldag. Et godt drevet verk gir mye mer enn et dårlig drevet, men spillfarten betyr ingenting. Dager uten spill gir mindre, aldri under 30 %. Du ser bidraget på kortet «Konsernkassa» under Konsern → Industrien.",
    ],
  },
  {
    b: 316,
    date: "2026-09-29",
    title: "Se når neste rammeavtale starter",
    items: [
      "«Produksjon nå» viser hvor lenge det er til neste uke fra en rammeavtale kommer i ordrekøen, hvor lenge køen varer og hvor mye ledig tid det er imellom – så du ser om du rekker en ordre til før avtalen.",
    ],
  },
  {
    b: 314,
    date: "2026-09-29",
    title: "Byggetida i konsernet går etter serverens klokke",
    items: [
      "Bygging, utbygging og modernisering i konsernet følger nå klokka på serveren, ikke på telefonen. Å stille klokka eller tidssonen fram gjør ingenting lenger – og serveren setter tilbake prosjekter som ikke kan være ferdige ennå.",
    ],
  },
  {
    b: 312,
    date: "2026-09-29",
    title: "Riktig reformmerke, og salgsdirektøren sier hvorfor han lar en forespørsel gå",
    items: [
      "Merket «Reformveteran» ble gitt ved en feil til alle som ble truffet av reform 2. Nå får bare de som var med på den første reformen det; «Reformveteran II» står som før. Fikk du det feil, forsvinner det neste gang spillet åpnes – fagpoengene beholder du.",
      "Når salgsdirektøren lar en forespørsel gå som ser grønn ut på Salg, sier loggen hvorfor: han regner med det verket faktisk har laget den siste uka og vil ha mer luft til fristen. Kortet hans under Folk → Ansatte viser tallet han regner med.",
      "Står ovnene fordi «bare én ovn smelter om gangen» er på under Strøm, sier Verket fra: verket lager da bare en halvpart eller tredel av det det kan.",
    ],
  },
  {
    b: 311,
    date: "2026-09-29",
    title: "Rettferdig kamp: verden går i menneskelig tempo, og ett byggeprosjekt om gangen",
    items: [
      "Alt som teller mellom spillere, er skalert ned til en tidel: utbyttet fra datterverkene (et fullt konsern ca. 30 mill. per ekte dag), innskuddet i konsernkassa (10 mill. per døgn), gebyret på skraplageret (50 kr per tonn) og minste bud. Konsernkassene er delt på 10.",
      "Konsernet kan bare ha ett byggeprosjekt om gangen – kjøp, utbygging eller modernisering. Et fullt konsern tar uker uansett hvor fort du spiller.",
      "Én milliard i konsernkassa tar nå det største konsernet omtrent en måned, som et ekte europeisk stålkonsern. Den som starter i dag, kan ta igjen forspranget.",
    ],
  },
  {
    b: 310,
    date: "2026-09-29",
    title: "Litt bedre pris på store volumer, og snittet siste 7 døgn i resultatgrafen",
    items: [
      "Kundene betaler 50 % av prisen for tonnene over 3 000 i døgnet (før 45 %), og 45 % over 20 000. De største verkene lander på ca. 35–40 mill. per døgn.",
      "Resultatgrafen på Verket → Økonomi viser snittet per døgn de siste 7 døgnene. Skrap kjøpes i partier og kontrakter betales ved levering, så ett døgn kan stå i minus selv om uka er i pluss – styr etter snittet.",
    ],
  },
  {
    b: 309,
    date: "2026-09-29",
    title: "Reform 2: konsernene er satt tilbake til det den nye økonomien hadde gitt",
    items: [
      "Konsernene på toppen var bygget for penger som ikke lenger finnes. Hver spiller har fått beholde de verkene han kunne tjent til med den nye økonomien over hele spillet, i kjøpsrekkefølge – resten er tatt bort, og kassa er det som var igjen.",
      "Forskning, fagpoeng, titler, mesterskap, konsernkassa, hjemmeverket og «Utbetalt til eierne» står som før. De som ble truffet, har æresmerket «Reformveteran II».",
      "Fra nå av gjelder samme regel for alle: det du kjøper, må tjenes med den økonomien som er i spillet i dag.",
      "Skraplageret er solgt (ni bud), og gebyret eieren tjener på andres skrapkjøp er 500 kr per tonn (før 1 000).",
    ],
  },
  {
    b: 308,
    date: "2026-09-29",
    title: "Reform 2: markedet tar unna 3 000 tonn i døgnet til full pris",
    items: [
      "Kundene tar unna ca. 3 000 tonn i døgnet til full pris. Det verket lager utover, selges for 45 % av prisen (40 % over 20 000 tonn). Et nytt storverk merker ingenting.",
      "Administrasjonen på storverket er doblet: 500 kr per tonn døgnkapasitet over 5 000 tonn.",
      "Det største verket går fra ca. 95 til ca. 36 mill. per døgn. Større verk lønner seg fortsatt litt, men markedet er grensen – veksten kommer fra konsernet og utbyttet i ekte tid.",
    ],
  },
  {
    b: 307,
    date: "2026-09-29",
    title: "Datterverk selges for 60 % av byggekostnaden",
    items: [
      "Selger du et datterverk, får du 60 % av det det ville kostet å bygge det på nytt – ikke lenger verdien med alle bonuser. Å kjøpe og selge igjen taper alltid penger.",
      "Verdien av verket (det det tjener) teller som før i konsernverdien og titlene.",
    ],
  },
  {
    b: 306,
    date: "2026-09-29",
    title: "Reform 2: taket for kassa er 10 mrd. – resten er betalt ut til eierne",
    items: [
      "Kassa kan ha høyst 10 mrd. (sluttmålet; det dyreste kjøpet er et kompleks til 3,6 mrd.). Det verket tjener utover, betales ut til eierne og står i Hall of Fame som «Utbetalt til eierne».",
      "Alle som hadde mer enn 10 mrd. på bok, er justert ned til 10 mrd. – resten er ført som utbetalt. Verk, forskning, fagpoeng, titler og konsernkassa er urørt. De som ble truffet, har æresmerket «Reformveteran II».",
      "Lista «Mest penger på bok» er tatt bort fra topplista: med et tak sa den ingenting. Konsernverdi og «Utbetalt til eierne» står.",
      "Det som teller mellom spillere, er konsernkassa: innskudd (100 mill. per ekte døgn) og datterverkenes utbytte i ekte tid.",
    ],
  },
  {
    b: 305,
    date: "2026-09-29",
    title: "Reform 2: toppen av verket koster mer, som i virkeligheten",
    items: [
      "Salgsbonusene (salgskontor, selgere, omdømme, eksport, grønt stål, havn, vakuum …) legges fortsatt sammen, men stopper på +25 %. Et vanlig storverk merker ingenting.",
      "De største ovnene (150, 250 og 420 t) bruker mer elektroder, ildfast og legeringer per tonn – som ekte stormodeller.",
      "Et storverk som kan lage mer enn 5 000 tonn i døgnet, betaler administrasjon for kapasiteten over det (250 kr per tonn, under Faste kostnader).",
      "Kundene tar unna 10 000 tonn i døgnet til full pris, halv pris til 20 000 tonn, og 40 % over det. Den største ovnen kjøpes for tonn og rekorder, ikke for overskuddet.",
      "Ingenting er endret fra garasjen til og med et nytt storverk. Dette er siste del av økonomireform 2.",
    ],
  },
  {
    b: 304,
    date: "2026-09-29",
    title: "Reform 2: datterverkene betaler utbytte i ekte tid, rett til konsernkassa",
    items: [
      "Datterverkene betaler ikke lenger utbytte hvert spilldøgn til kassa. I stedet betaler de én gang per ekte dag rett til konsernkassa – der anbudene og konkurransen med de andre foregår.",
      "Beløpet regnes av verkene dine slik de står: type, modernisering, felles funksjoner, konsernforskning, mesterskapet og flaggskipet. Hvor fort du spiller, betyr ingenting.",
      "Store konsern får mer, men avtagende: 3 storverk gir ca. 40 mill. per dag, 14 fullt moderniserte komplekser ca. 420 mill.",
      "Konsernkostnadene er borte. Konsern → Industrien viser utbyttet per dag, det som kom i går og i alt, og du får én linje i loggen per dag.",
    ],
  },
  {
    b: 303,
    date: "2026-09-29",
    title: "Reform 2: kassa har et tak, og overskuddet betales ut til eierne",
    items: [
      "Kassa kan ha høyst 100 mrd. – mer enn alt som kan kjøpes. Det verket tjener utover, betales ut til eierne og står i Hall of Fame som «Utbetalt til eierne».",
      "Den bundne konsernreserven er borte: det som sto der, regnes som utbetalt til eierne. Konsernverdien er nå kassa og verkene. Titlene du har, beholder du.",
      "De fire som hadde en reserve, får æresmerket «Reformveteran II».",
      "Neste del av reformen: datterverkene skal betale utbytte i ekte tid rett til konsernkassa – der konkurransen med de andre foregår.",
    ],
  },
  {
    b: 299,
    date: "2026-09-28",
    title: "Æresmerket på topplista",
    items: ["Reformveteranene får merket sitt vist under navnet på topplista."],
  },
  {
    b: 298,
    date: "2026-09-28",
    title: "Fellesferie og krig i verden",
    items: [
      "Fellesferie i juli: velg sommerstans med vedlikehold (ovnene står i tre uker, men får ny foring, og du betaler ikke lønn) eller sommervikarer (full drift, dyrere lønn og litt flere uhell).",
      "De ansatte tar egen ferie sjeldnere, og aldri i fellesferien. Ferie over jula heter juleferie.",
      "I konsernet kan det bli krig i verden, høyst én gang i året: strømmen blir dyrere, men det kommer flere forespørsler og bedre pris på stål.",
    ],
  },
  {
    b: 296,
    date: "2026-09-28",
    title: "Toppliste for kontrollrommet",
    items: [
      "Ny fane på topplista: Kontrollrom – den beste chargen hver spiller har kjørt.",
      "Fra resultatet i kontrollrommet kommer du rett til lista med «Se topplista for kontrollrommet».",
      "De som var med da økonomireformen kom, får æresmerket «Reformveteran».",
    ],
  },
  {
    b: 294,
    date: "2026-09-28",
    title: "Forskningssjef",
    items: [
      "Prestasjonen «Forskningssjef» krevde 50 forskninger, men det finnes bare 48. Nå krever den 40 – har du forsket fram alt, får du den med én gang.",
    ],
  },
  {
    b: 293,
    date: "2026-09-28",
    title: "Kontrollrommet: mål du kan nå",
    items: [
      "Poengmålene i kontrollrommet var for høye – 4 500 var umulig. Nå er utfordringen «Mesterkjører» 3 500, 3 900, 4 100 og 4 250 poeng, og prestasjonene 4 100 og 4 250.",
      "Har du alt nådd de nye målene, får du belønningen med én gang.",
    ],
  },
  {
    b: 292,
    date: "2026-09-28",
    title: "Forespørsler som gikk ut",
    items: [
      "Går to forespørsler som passet verket, ut uten svar på et døgn, får du et råd om å svare på dem under Salg.",
    ],
  },
  {
    b: 290,
    date: "2026-09-28",
    title: "Hva er sesongstigen?",
    items: [
      "Sesongstigen under Mål → Uka forklarer seg selv: du klatrer ved å spille litt hver dag, hvert trinn gir fagpoeng, og hvert tiende gir pynt som bare finnes denne sesongen.",
    ],
  },
  {
    b: 289,
    date: "2026-09-28",
    title: "Snøstorm",
    items: [
      "Ingen skraphandler dukker opp med billig skrap mens veien er stengt av snøstorm.",
      "«Hva gjør jeg nå?» sier fra når veien er stengt og når skrapbilene kommer fram igjen.",
    ],
  },
  {
    b: 288,
    date: "2026-09-28",
    title: "Konsernet enklere å forstå",
    items: [
      "Et verk som bygges, viser hvor lenge det er igjen («Klar om 1 t 20 min»).",
      "Tallene stemmer mens verket bygges, og første gang står det én linje i stedet for en lang forklaring.",
      "I Forskning står det bare én knapp for å lese kapitlet konsernprosjektene venter på.",
    ],
  },
  {
    b: 287,
    date: "2026-09-28",
    title: "Sesongpynt",
    items: [
      "Ny pynt som bare finnes i sesong 1: nordlys, kobberpipe og et eget sesongbanner. Når sesongen er over, kommer den aldri tilbake – men det du har skaffet, beholder du.",
      "Pynten på sesongstigen hører også til sesongen. Neste sesong får ny pynt.",
    ],
  },
  {
    b: 286,
    date: "2026-09-28",
    title: "Tre like knapper",
    items: ["Mål åpnes nå oppå spillet, slik som «Hva gjør jeg nå?» og topplista ved siden av."],
  },
  {
    b: 285,
    date: "2026-09-28",
    title: "Hjelpen står stille",
    items: ["«Hva gjør jeg nå?» hopper ikke lenger mens spillet går. Trykk «Oppdater» for å se hvordan det står nå."],
  },
  {
    b: 284,
    date: "2026-09-28",
    title: "Roligere på høy fart",
    items: ["Hendelseskort kommer høyst én gang hvert tredje minutt, også på 3× og 10×."],
  },
  {
    b: 283,
    date: "2026-09-28",
    title: "«Hva gjør jeg nå?»",
    items: [
      "Nytt spørsmålstegn ved Mål: viser det viktigste å gjøre akkurat nå, hva som skjer i verket og hva du skal trykke på.",
      "Der står også en kort ordliste: fagpoeng, charge, foring og mer.",
    ],
  },
  {
    b: 282,
    date: "2026-09-28",
    title: "Færre rare forkortelser",
    items: [
      "Trykk «Hva betyr C, P og Spor?» på Marked og Resept for å se hva tallene i skrapet og stålet betyr.",
      "Priser per tonn står nå som «kr/tonn», så de ikke forveksles med kroner per time.",
      "Veiledningen forklarer hva en charge er: én ovnsfylling.",
    ],
  },
  {
    b: 281,
    date: "2026-09-28",
    title: "Enklere å forstå",
    items: [
      "«fp» står nå som fagpoeng. Trykk på kolben øverst for å se hva fagpoeng er og hva du kan forske på.",
      "Ved havari står det hvor lenge ovnen er ute. Reparasjonen skjer av seg selv – du trenger ikke trykke på noe.",
    ],
  },
  {
    b: 280,
    date: "2026-09-28",
    title: "Tryggere quiz",
    items: [
      "En quiz du har begynt på, fortsetter riktig der du slapp.",
      "Går noe galt i fagboka, får du en beskjed i stedet for at spillet står fast.",
    ],
  },
  {
    b: 279,
    date: "2026-09-28",
    title: "Vinteren koster",
    items: [
      "Om vinteren er strømmen ca. 30 % dyrere. En fastpris avtalt før vinteren beskytter deg.",
      "Snøstorm kan stenge veien i noen timer, og da kommer ingen skrapbiler. Hold mer skrap på lager om vinteren.",
      "Skrapterminalen får skrap med båt og tog og merker ikke snøstormen.",
    ],
  },
  {
    b: 278,
    date: "2026-09-28",
    title: "Ryddigere liste over budgivere",
    items: ["Navnene på dem som har bydd på anbudet, går ikke lenger ut over kanten, og antallet står i overskriften."],
  },
  {
    b: 277,
    date: "2026-09-28",
    title: "Vinteren er testet",
    items: [
      "Vinteren er kjørt gjennom på alle nivåer: flere uhell og hendelser, men tak, sortering og sikkerhet hjelper godt.",
      "Frost-meldingen sier ikke lenger «i natt» midt på dagen.",
    ],
  },
  {
    b: 276,
    date: "2026-09-28",
    title: "Nytt i anleggsbildet",
    items: [
      "Taket over skraplageret, de større renseanleggene og det utbygde ferdiglageret synes nå i bildet av verket.",
      "Renseanlegget gir hvit damp når det renser, brun røyk når noe går urenset ut, og en rød lampe blinker ved havari.",
      "Om vinteren ligger det snø på bakken og takene, og det snør.",
    ],
  },
  {
    b: 275,
    date: "2026-09-28",
    title: "Små rettelser",
    items: [
      "Rådet om renseanlegget åpner nå rett fane, der de større anleggene kan kjøpes.",
      "Rådet om fullt ferdiglager viser til knappen «Selg alt ledig stål» og utbyggingen av lageret.",
    ],
  },
  {
    b: 274,
    date: "2026-09-28",
    title: "Tak over skraplageret, større ferdiglager og salgsknapp",
    items: [
      "Tak over skraplageret (Anlegg → Skraplager) holder snø og is unna skrapet og gir langt færre eksplosjoner.",
      "Ferdiglageret kan bygges ut i tre trinn under Anlegg → Lager og salg.",
      "Ny knapp «Selg alt ledig stål» på Salg → Lager og i lagerarket: selger alt ingen kontrakt venter på, med ett trykk.",
    ],
  },
  {
    b: 273,
    date: "2026-09-28",
    title: "Støpingen står ikke og venter",
    items: [
      "Strengstøpingen venter ikke lenger på en kvalitet som ingen ovn er ferdig med snart. Da står ikke ovnene stille med fulle øser, og store verk lager 10–20 % mer.",
    ],
  },
  {
    b: 272,
    date: "2026-09-28",
    title: "Lengre vinter",
    items: ["Vinteren varer nå fra midten av november til midten av mars – 120 av årets 360 døgn."],
  },
  {
    b: 271,
    date: "2026-09-28",
    title: "Autobonus og skrap på lager",
    items: [
      "Har du skiftleder, kan han gi alle bonus når det trengs (bryter under Folk → Ansatte).",
      "Har du planlegger, kan du velge hvor mange tonn skrap den skal holde på lager (Marked → Skrap).",
    ],
  },
  {
    b: 270,
    date: "2026-09-28",
    title: "Færre eksplosjoner",
    items: [
      "Eksplosjoner i ovnen skjer nå tre ganger sjeldnere, og dødsulykker er enda sjeldnere – særlig med skrap under tak, sortering og sikkerhetskultur.",
    ],
  },
  {
    b: 269,
    date: "2026-09-28",
    title: "Menyen nederst som før",
    items: ["Menyen nederst er tilbake slik den var, med navnene under ikonene og helt nede ved skjermkanten."],
  },
  {
    b: 268,
    date: "2026-09-28",
    title: "Menyen nederst på iPhone-hjemskjermen",
    items: [
      "Når spillet er lagt på hjemskjermen på iPhone, fyller det nå hele skjermen, så menyen nederst står ved kanten.",
    ],
  },
  {
    b: 267,
    date: "2026-09-28",
    title: "Menyen nederst helt nede",
    items: ["Spillet fyller nå hele skjermen på iPhone, så menyen nederst står helt nede ved kanten."],
  },
  {
    b: 266,
    date: "2026-09-28",
    title: "Færre nestenulykker",
    items: [
      "Nestenulykken kommer mye sjeldnere. Kjøper du verneutstyr og skjermer, kommer den ikke igjen før verket blir større.",
    ],
  },
  {
    b: 265,
    date: "2026-09-28",
    title: "Vinter og eksplosjoner",
    items: [
      "Spillet har årstider. Om vinteren (snøfnugg øverst) gir is og snø i skrapet flere eksplosjoner i ovnen, og havarier og uforutsette hendelser skjer oftere.",
      "Skrap under tak (skrapterminal), sortering og sikkerhetskultur gir færre eksplosjoner.",
      "Svært sjelden kan en ansatt omkomme. Da stenges verket i tre døgn, og det blir stor bot og store tap av omdømme og trivsel.",
      "Nytt kapittel i fagboka om vann i skrapet og sikkerhet. Quizspørsmålet om karbon er skrevet tydeligere.",
    ],
  },
  {
    b: 264,
    date: "2026-09-28",
    title: "Menyen nederst på plass igjen",
    items: [
      "På iPhone havnet menyen nederst et stykke over skjermkanten etter forrige oppdatering. Nå står den nederst igjen.",
    ],
  },
  {
    b: 263,
    date: "2026-09-28",
    title: "Utslipp og renseanlegg",
    items: [
      "Renseanlegget renser bare en viss mengde i døgnet. Smelter ovnene mer, går resten urenset ut, og verket får bot neste morgen.",
      "Fire nye, større renseanlegg under Anlegg → Ovn. Har du alt store ovner, har du fått anlegg som holder.",
      "Renseanlegget kan havarere. Da velger du: stoppe ovnene til det er reparert, eller kjøre videre og ta en dobbel bot.",
      "Nytt kapittel i fagboka: «Røyk, støv og renseanlegget».",
    ],
  },
  {
    b: 262,
    date: "2026-09-28",
    title: "Trykk treffer knappene på iPhone",
    items: [
      "På noen iPhoner måtte man trykke litt over en knapp for at den skulle reagere, særlig etter at tastaturet hadde vært oppe. Nå står siden alltid på plass, så trykket treffer der knappen er.",
    ],
  },
  {
    b: 260,
    date: "2026-09-28",
    title: "Veiledningen dekker ikke knappene",
    items: [
      "På små mobiler lå veiledningen over kjøpeknappene for skrap (og «Signer» på Salg), så et trykk gjorde ingenting. Nå ruller siden knappen opp over boksen, og alt kan rulles fram.",
    ],
  },
  {
    b: 259,
    date: "2026-09-28",
    title: "Et gammelt spill tar ikke over",
    items: [
      "Logger du inn på en enhet som har en eldre kopi av spillet ditt, hentes spillet fra nettet. Kopien lastes ikke lenger opp over det du har spilt andre steder.",
      "Velger du selv et spill som er eldre enn det på nett, spør spillet én gang til.",
    ],
  },
  {
    b: 258,
    date: "2026-09-28",
    title: "Når skraplageret får eier",
    items: [
      "Alle med konsern får beskjed når skraplageret har fått ny eier – også de som ikke bød.",
      "Eieren ser når første inntekt kommer, og får beskjed hver dag inntekten er kommet til konsernkassa.",
    ],
  },
  {
    b: 255,
    date: "2026-09-28",
    title: "Trender i markedet",
    items: [
      "Fra verkstedet skifter etterspørselen: i noen døgn er én kvalitet eller vare ettertraktet (flere forespørsler og bedre pris) eller lite etterspurt.",
      "Loggen forteller hvorfor, og Salg og Marked viser trenden og hvor lenge den varer. Forespørsler som betaler ekstra, er merket «Ettertraktet».",
    ],
  },
  {
    b: 254,
    date: "2026-09-28",
    title: "Riktigere tall for store konsern",
    items: [
      "Felles innkjøp og salg og mesterskapet «Konsernledelse» viser nå det du faktisk får, etter at et stort konsern er tungt å styre.",
      "Hasteordrer, store utlandsordrer og landemerker betaler over den prisen markedet gir nå, også når markedet er mettet.",
    ],
  },
  {
    b: 252,
    date: "2026-09-28",
    title: "Markedet tar ikke unna alt",
    items: [
      "Lager verket mer enn ca. 10 000 tonn i døgnet, betaler kundene mindre for det som er over. Nye forespørsler blir da billigere.",
      "Salg viser hvor mye billigere, bare når det gjelder deg. Kontrakter du alt har tatt, beholder prisen.",
    ],
  },
  {
    b: 251,
    date: "2026-09-28",
    title: "Store konsern er tunge å styre",
    items: [
      "Jo mer datterverkene gir til sammen, desto mer går bort i ekstra ledelse, kapital og koordinering. Hvert nytt verk gir fortsatt litt, men mindre enn det forrige.",
      "Konsern → Oversikt viser hvor mye som går bort, og tallet ved hvert verk er det du faktisk får.",
      "Det du har tjent og titlene du har fått, beholder du.",
    ],
  },
  {
    b: 250,
    date: "2026-09-28",
    title: "Pipene på plass",
    items: ["Pipene i app-ikonet og tittelbildet står nå på taket av smeltehallen."],
  },
  {
    b: 249,
    date: "2026-09-28",
    title: "Nytt ikon og tittelbilde",
    items: [
      "Spillet har fått nytt ikon: verket i kveldslys med glødende port.",
      "Startskjermen har fått et tittelbilde der røyken stiger fra pipene.",
      "På iPhone byttes ikonet på hjemskjermen når du legger spillet til på nytt.",
    ],
  },
  {
    b: 248,
    date: "2026-09-28",
    title: "Boblene får plass",
    items: ["Boblene med penger, tonn og fagpoeng over anleggsbildet blir ikke lenger kuttet i kanten."],
  },
  {
    b: 247,
    date: "2026-09-28",
    title: "Utstyret står stille",
    items: ["Når du åpner utstyret for ovnene eller støpingen, hopper ikke lista lenger mens spillet går."],
  },
  {
    b: 246,
    date: "2026-09-28",
    title: "Pipene står på taket",
    items: ["Pipene i anleggsbildet kommer nå ut av taket, og alle ovnenes piper står samlet på smeltehallen."],
  },
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
