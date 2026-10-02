/**
 * Fagboka: kapitler som låses opp etter hvert som verket vokser.
 *
 * Kapitlene er den delen av spillet som skal lære bort prosessen: hvert kapittel
 * forklarer hvorfor spillet oppfører seg som det gjør, med de samme
 * sammenhengene man møter i et ekte stålverk.
 *
 * B-234: hvert kapittel har «Kort fortalt» (`short`) og er delt i korte sider med en overskrift hver, så boka kan
 * leses en bit om gangen. `part` samler kapitlene i temaer i innholdet. B-236: ikon fra designsystemet, ikke emoji.
 */
import type { IconName } from "../ui/icons";

export type KnowledgePart = "grunnlag" | "ovn" | "stoping" | "drift" | "verden";

export const KNOWLEDGE_PARTS: { id: KnowledgePart; title: string }[] = [
  { id: "grunnlag", title: "Grunnlaget" },
  { id: "ovn", title: "Ovnene" },
  { id: "stoping", title: "Støping og valsing" },
  { id: "drift", title: "Folk og kunder" },
  { id: "verden", title: "Konsernet og verden" },
];

export interface KnowledgePage {
  head: string;
  text: string;
}

export interface KnowledgeCard {
  id: string;
  title: string;
  icon: IconName;
  part: KnowledgePart;
  /** Hele kapitlet i én setning eller to */
  short: string;
  pages: KnowledgePage[];
}

export const KNOWLEDGE: KnowledgeCard[] = [
  {
    id: "start",
    title: "Fra skrap til stål",
    icon: "recycle",
    part: "grunnlag",
    short: "Skrap smeltes og støpes til nytt stål. Den tregeste delen av kjeden bestemmer hvor mye du får levert.",
    pages: [
      {
        head: "Gammelt stål blir nytt",
        text: "Et skrapbasert stålverk gjør gammelt stål om til nytt. Skrapet smeltes, analysen justeres, og det flytende stålet støpes til noe kunden kan bruke.",
      },
      {
        head: "Kjeden fra skrap til kunde",
        text: "Hver charge går gjennom samme kjede: skraplager → ovn → øse → støping → lager → kunde. Den tregeste delen av kjeden bestemmer hvor mye du får levert.",
      },
      {
        head: "Riktig kvalitet i tide",
        text: "Du tjener penger på å levere riktig kvalitet til riktig tid. Stål som ikke holder kravene, koster deg både penger og omdømme.",
      },
    ],
  },
  {
    id: "skrap",
    title: "Skrapvalg og sporelementer",
    icon: "magnet",
    part: "grunnlag",
    short: "Kobber og tinn går ikke ut av stålet i ovnen. Du får dem bare ned ved å blande inn renere skrap.",
    pages: [
      {
        head: "Sporelementer blir i stålet",
        text: "Kobber, tinn, nikkel, krom og molybden kalles sporelementer. De er mindre villige til å gå i slaggen enn jern er, så de blir i stålet uansett hva du gjør i ovnen.",
      },
      {
        head: "Tynn ut med rent skrap",
        text: "Den eneste måten å få dem ned på er å tynne ut: bland inn rent skrap eller råjern. Resepten din bestemmer derfor hvilke kvaliteter du i det hele tatt kan lage.",
      },
      {
        head: "Billig skrap er ikke billig stål",
        text: "Billig skrap har mer rust, jord og olje. Det gir mindre stål per tonn, mer slagg og høyere energiforbruk. Det billigste skrapet er ikke alltid det billigste stålet.",
      },
      {
        head: "Skrapklasseren",
        text: "En skrapklasser kontrollerer skrapet som kommer inn, og sørger for at hver skrapkasse får den blandingen resepten sier. Uten klassering blir blandingen omtrentlig, og mangler en skraptype, tar kranføreren det som ligger nærmest – da varierer analysen mye mer.",
      },
    ],
  },
  {
    id: "karbon",
    title: "Karbon: lett å legge til, vanskelig å ta ut",
    icon: "atom",
    part: "grunnlag",
    short: "Karbon gjør stålet hardere. Det er lett å legge til, men bare en ovn med oksygen kan ta det ut igjen.",
    pages: [
      {
        head: "Hardere, men vanskeligere å sveise",
        text: "Karbon er det viktigste legeringselementet i stål: mer karbon gir hardere og sterkere stål, men dårligere sveisbarhet og formbarhet.",
      },
      {
        head: "Lett å legge til – ikke å ta ut",
        text: "Karbon kan alltid legges til med karburiseringsmiddel. Men i en induksjonsovn finnes det ingen måte å fjerne det på – det som er i skrapet, blir i stålet.",
      },
      {
        head: "Råjern: rent, men mye karbon",
        text: "Råjern har rundt 4 % karbon. Det er gull for å tynne ut sporelementer, men da trengs en ovn med oksygen som kan brenne karbonet ned igjen.",
      },
    ],
  },
  {
    id: "induksjon",
    title: "Induksjonsovnen",
    icon: "zap",
    part: "ovn",
    short: "Induksjonsovnen smelter raskt og rent, men renser nesten ikke stålet: du får ut det du putter inn.",
    pages: [
      {
        head: "Strøm i en spole",
        text: "En induksjonsovn varmer stålet med vekselstrøm i en vannkjølt spole rundt digelen. Den er rask, ren og taper lite stål.",
      },
      {
        head: "Ingen rensing",
        text: "Til gjengjeld raffinerer den nesten ikke: fosfor og sporelementer blir der de er, og karbon kan bare legges til. Du får ut det du putter inn.",
      },
    ],
  },
  {
    id: "analyse",
    title: "Analyse: vet du hva du selger?",
    icon: "microscope",
    part: "grunnlag",
    short: "Uten analyse gjetter du. Med spektrometer vet du at partiet holder kravet før kunden får det.",
    pages: [
      {
        head: "Gjetting gir reklamasjoner",
        text: "Uten analyseutstyr gjetter du analysen ut fra resepten. Skrap varierer, og et dårlig parti merkes først når kunden reklamerer.",
      },
      {
        head: "Røntgenpistolen (XRF)",
        text: "En håndholdt røntgenanalysator (XRF) måler tunge elementer som kobber, nikkel og krom, men ikke lette elementer som karbon. Fosfor kan den heller ikke stole på i stål.",
      },
      {
        head: "Spektrometeret (OES)",
        text: "Et gnistspektrometer (OES) måler alt, også karbon og fosfor. Da leverer du bare partier du vet holder kravet, og resten kan selges som enklere kvalitet.",
      },
    ],
  },
  {
    id: "stoping",
    title: "Støping og temperatur",
    icon: "thermometer",
    part: "stoping",
    short: "Stålet må være passe varmt når det støpes. Det som blir til overs, går tilbake som gratis returskrap.",
    pages: [
      {
        head: "Passe varmt",
        text: "Stålet må ha riktig overheting når det støpes: for kaldt, og det størkner i innløpet før formen er fylt; for varmt, og du får porer, sprekker og slitasje på ildfast.",
      },
      {
        head: "Returskrap",
        text: "Innløp, matere og kapp blir ikke produkt. Det går tilbake til skraplageret som returskrap – gratis og med kjent analyse.",
      },
    ],
  },
  {
    id: "folk",
    title: "Folk og skift",
    icon: "hard-hat",
    part: "drift",
    short: "Hvert skift trenger fullt mannskap. Flere skift gir mer stål, men lønna går hver dag.",
    pages: [
      {
        head: "Ett til tre skift",
        text: "Hvert anlegg trenger et fast mannskap per skift. Med ett skift går verket 8 timer i døgnet; med tre skift går det døgnet rundt.",
      },
      {
        head: "Erfaring og avløsere",
        text: "Erfarne folk jobber raskere og gjør færre feil, og alle blir flinkere av å jobbe. Avløsere kan ta hvilken plass som helst på skiftet.",
      },
      {
        head: "Lønn hver dag",
        text: "Lønn betales hver dag, også når verket står. Et ekstra skift lønner seg bare hvis du får solgt det du lager.",
      },
      {
        head: "Lærlinger",
        text: "En lærling lærer faget på jobben og har lavere lønn mens læretida varer. Til slutt tar lærlingen fagprøven. Består lærlingen, får den fagbrev og er fagarbeider med vanlig lønn. I spillet varer læretida 30 døgn.",
      },
    ],
  },
  {
    // Arbeidsmiljø, likestilling og varsling (B-436): låses opp av det første arbeidsmiljøkortet
    id: "arbeidsmiljo",
    title: "Arbeidsmiljø og varsling",
    icon: "people",
    part: "drift",
    short: "Alle skal kunne gå trygt på jobb. Trakassering og rasisme stoppes, og den som sier fra, skal tas på alvor.",
    pages: [
      {
        head: "Trygt for alle",
        text: "Ingen skal trakasseres, holdes utenfor eller behandles dårligere på grunn av kjønn, hudfarge, opprinnelse, religion, funksjonsevne eller legning. Det er forbudt, og lederen har plikt til å forebygge det og stoppe det.",
      },
      {
        head: "Like muligheter",
        text: "Et stålverk har ingen kvote for hvor mange av hvert kjønn det må ha. Det loven krever, er at alle får de samme mulighetene når noen ansettes, får lønn eller blir forfremmet.",
      },
      {
        head: "Å si fra – varsling",
        text: "Å varsle betyr å si fra om noe som er galt på jobben, som trakassering eller farlige forhold. Den som varsler, skal ikke straffes for det. Med fem ansatte eller flere skal verket ha en skriftlig rutine for hvordan man sier fra, og hvem som følger opp.",
      },
      {
        head: "Slik følger du opp",
        text: "Lytt, undersøk saken, snakk med dem det gjelder, gi en klar beskjed og sjekk etterpå at det har stoppet. Et godt arbeidsmiljø gir folk som trives, blir og gjør færre feil.",
      },
    ],
  },
  {
    id: "ildfast",
    title: "Ildfast foring",
    icon: "brick-wall",
    part: "ovn",
    short: "Foringen i ovnen slites for hver charge. Bytt den i tide – et gjennombrudd koster mange ganger mer.",
    pages: [
      {
        head: "Foringen slites",
        text: "Ovnen er foret med ildfast stein eller masse som slites litt for hver charge – mest når stålet er for varmt eller slaggen er feil.",
      },
      {
        head: "Bytt før det er for sent",
        text: "Foringen må byttes før den er slitt gjennom. Går flytende stål gjennom foringen, er det en alvorlig hendelse: ovnen står lenge, og reparasjonen koster mange ganger en planlagt omforing.",
      },
      {
        head: "To potter",
        text: "En lysbueovn har gjerne to potter – den nedre delen av ovnen med foringen. Mens den ene er i bruk, river murerne ut den slitte steinen i den andre og murer opp ny. Når foringen er slitt, løftes potta ut og den ferdige settes inn. Det tar noen timer i stedet for flere døgn.",
      },
    ],
  },
  {
    id: "radioaktivitet",
    title: "Radioaktive kilder i skrap",
    icon: "radiation",
    part: "grunnlag",
    short: "Radioaktive kilder kan gjemme seg i skrapet. En strålingsportal finner dem før de havner i ovnen.",
    pages: [
      {
        head: "Farlig i ovnen",
        text: "Gamle måleinstrumenter og medisinsk utstyr kan inneholde radioaktive kilder. Havner en slik kilde i ovnen, forurenses stålet, støvet og anlegget.",
      },
      {
        head: "Mål alt skrap",
        text: "Derfor måles alt skrap når det kommer inn på verket. En strålingsportal koster lite sammenlignet med en opprydding.",
      },
    ],
  },
  {
    id: "vannskrap",
    title: "Vann i skrapet og sikkerhet",
    icon: "hard-hat",
    part: "grunnlag",
    short: "Vann og is i skrapet blir til damp i flytende stål og kan eksplodere. Tørt skrap og orden redder liv.",
    pages: [
      {
        head: "Damp som eksploderer",
        text: "Vann som kommer ned i flytende stål, blir til damp på et øyeblikk. Dampen tar over tusen ganger så stor plass som vannet, og kan kaste flytende stål og slagg ut av ovnen.",
      },
      {
        head: "Farligst om vinteren",
        text: "Om vinteren kommer skrapet inn med is og snø, og lukkede beholdere kan være fulle av vann. Tak over skraplageret, sortering som tar ut lukkede beholdere, og faste rutiner gir færre eksplosjoner.",
      },
      {
        head: "Ingen jobb er verdt et liv",
        text: "Et stålverk er en farlig arbeidsplass. En dødsulykke stenger verket mens politiet og Arbeidstilsynet gransker, og den preger alle som jobber der i lang tid. God sikkerhetskultur betyr at alle kan si stopp.",
      },
    ],
  },
  {
    id: "strom",
    title: "Strømpris og effekt",
    icon: "power",
    part: "ovn",
    short: "Strømprisen svinger over døgnet. En prisgrense sparer penger, men koster produksjon.",
    pages: [
      {
        head: "En av de største strømkundene",
        text: "Et smelteverk er en av de største strømkundene som finnes. Prisen varierer over døgnet og fra dag til dag, med topper morgen og ettermiddag.",
      },
      {
        head: "Prisgrensen",
        text: "Du kan sette en grense for strømpris der nye charger ikke startes. Det sparer penger, men koster produksjon – regn på om det lønner seg.",
      },
    ],
  },
  {
    id: "lysbue",
    title: "Lysbueovnen",
    icon: "flame",
    part: "ovn",
    short: "Lysbuer smelter skrapet, og skummende slagg holder på varmen. En større ovn lager flere tonn i timen.",
    pages: [
      {
        head: "Elektroder og lysbuer",
        text: "I lysbueovnen går strømmen gjennom grafittelektroder og lager lysbuer ned mot skrapet. Oksygen og karbon blåses inn gjennom lanser.",
      },
      {
        head: "Skummende slagg",
        text: "Oksygen brenner karbon til CO, og karbon reduserer FeO i slaggen. Gassen skummer opp slaggen, som legger seg rundt lysbuen og holder varmen i badet.",
      },
      {
        head: "Riktig slagg: B2 rundt 1,8",
        text: "Kalk og dolomitt gir en basisk slagg. Basisiteten B2 = CaO/SiO₂ må ligge rundt 1,8 for at slaggen skal skumme og ta opp fosfor.",
      },
      {
        head: "Fra små ovner til 420 tonn",
        text: "Ovnene finnes fra noen titalls tonn opp til rundt 420 tonn. De største er likestrømsovner med to skall, bygd for omtrent 360 tonn stål i timen. En større ovn trenger lengre tid per charge – mer skrap skal smeltes, og effekten vokser ikke like fort som størrelsen – men den lager likevel mange flere tonn i timen. Tida fra én tapping til neste kalles tapp-til-tapp.",
      },
    ],
  },
  {
    id: "miljo",
    title: "Røyk, støv og renseanlegget",
    icon: "wind",
    part: "ovn",
    short: "Ovnene gir røyk og støv. Renseanlegget må rekke like mye som ovnene smelter, ellers blir det bot.",
    pages: [
      {
        head: "Røyk og støv fra ovnen",
        text: "Når skrap smeltes, kommer det røyk og støv med metaller som sink og bly. Røyken suges ut over ovnen og blåses gjennom et filteranlegg med tusenvis av filterposer, som holder støvet igjen.",
      },
      {
        head: "Rensingen må følge ovnene",
        text: "Renseanlegget klarer en viss mengde i døgnet. Bygger du flere eller større ovner, må rensingen bli større også. Det som ikke blir renset, måles og rapporteres, og myndighetene gir bot per tonn.",
      },
      {
        head: "Når renseanlegget stopper",
        text: "Viften eller filteret kan havarere. Da må du velge: stoppe ovnene og tape produksjon, eller kjøre videre og slippe ut røyken – det gir dobbel bot og dårlig omdømme. Et anlegg med to linjer renser halvparten når den ene står.",
      },
    ],
  },
  {
    id: "fosfor",
    title: "Fosfor og avslagging",
    icon: "research",
    part: "ovn",
    short: "Fosfor gjør stålet sprøtt. Det går i slaggen ved lav temperatur – så slagg av før du varmer opp.",
    pages: [
      {
        head: "Fosfor gjør stålet sprøtt",
        text: "Fosfor gjør stålet sprøtt. Det kan bare fjernes i en oksiderende, basisk slagg – det vil si i lysbueovnen, med nok FeO (jernoksid) og kalk i slaggen.",
      },
      {
        head: "Lav temperatur hjelper",
        text: "Avfosforeringen går best ved lav temperatur. Kjøres temperaturen opp mens fosforrik slagg ligger i ovnen, går fosforet tilbake i stålet.",
      },
      {
        head: "Slagg av først",
        text: "Derfor slagges det av før temperaturen kjøres opp mot tapping. Ta styringen på en charge for å prøve selv.",
      },
    ],
  },
  {
    id: "oseovn",
    title: "Øseovnen",
    icon: "cooking-pot",
    part: "ovn",
    short: "Øseovnen finjusterer temperatur og analyse, så stålovnen kan smelte og støpingen får riktig stål.",
    pages: [
      {
        head: "Varme, legere og spyle",
        text: "Etter tapping fraktes stålet i øsa til øseovnen. Der varmes det med egne elektroder, legeres til riktig analyse og spyles med argon for å bli homogent.",
      },
      {
        head: "Hver sin jobb",
        text: "Øseovnen gjør at stålovnen kan konsentrere seg om å smelte og raffinere, og at støpemaskinen får stål med riktig temperatur.",
      },
      {
        head: "Øseovnsoperatøren",
        text: "Øseovnsoperatøren tar prøver, sjekker analysen på spektrometeret og legerer øsa til stålet holder kravet. Karbon kan justeres, men fosfor og kobber kan ikke tas ut her – kommer det for dårlig stål fra stålovnen, må det sperres. For kaldt stål kan få strengen til å gro igjen i støpemaskinen.",
      },
    ],
  },
  {
    id: "streng",
    title: "Strengstøping",
    icon: "stretch-horizontal",
    part: "stoping",
    short: "Stålet størkner i en kald kobberform og trekkes ut som en lang streng. Nesten alt blir produkt.",
    pages: [
      {
        head: "Kokillen",
        text: "Stålet renner fra øsa ned i en fordeler og videre ned i en vannkjølt kobberkokille. Et tynt skall størkner mot veggen og trekkes ut nedover mens kjernen fortsatt er flytende.",
      },
      {
        head: "Kokillen slites",
        text: "Kobberet i kokillen slites av stålet som glir forbi. En slitt kokille kjøler ujevnt, skallet blir tynt noen steder, og strengen bryter lettere gjennom. Kokillene byttes derfor jevnlig – det tar et par timer, men er billig mot et gjennombrudd.",
      },
      {
        head: "Kjøling og kapping",
        text: "Strengen kjøles med vannspray til den er gjennomstørknet, og kappes til emner. Går skallet i stykker, renner stålet ut – et strenggjennombrudd.",
      },
      {
        head: "Bedre utbytte",
        text: "Strengstøping gir langt bedre utbytte enn blokkstøping, fordi det blir lite topp og bunn å kappe bort.",
      },
    ],
  },
  {
    id: "valsing",
    title: "Valsing",
    icon: "refresh",
    part: "stoping",
    short: "Emnene varmes opp og presses tynnere i mange stikk, til ferdig armeringsstål.",
    pages: [
      {
        head: "Mange stikk",
        text: "Emnene varmes opp igjen og valses i mange stikk til ferdig dimensjon. Armeringsstål får ribber i siste stikk.",
      },
      { head: "Ingenting kastes", text: "Glødeskall og kapp fra valseverket går tilbake til smelteverket." },
    ],
  },
  {
    id: "omdomme",
    title: "Kunder og omdømme",
    icon: "star",
    part: "drift",
    short: "Lever riktig stål i tide, så stiger omdømmet og større kunder kommer. Reklamasjoner koster mest.",
    pages: [
      {
        head: "Mengde, kvalitet og frist",
        text: "Hver kontrakt har mengde, kvalitet og frist. Leverer du i tide, stiger omdømmet, og større kunder begynner å spørre.",
      },
      {
        head: "Sent er dårlig, feil er verre",
        text: "For sen levering gir bot og dårligere omdømme. En reklamasjon er verre: kunden sender stålet tilbake og forteller det til andre.",
      },
      {
        head: "Karakter fra 1 til 10",
        text: "Etter hver levering gir kunden en karakter fra 1 til 10. Den blir høy når stålet kommer i god tid før fristen, og når analysen ligger godt innenfor kravene – ikke bare så vidt. Kunder med høy karakter snakker varmt om verket, og da stiger omdømmet mer. En reklamasjon gir høyst 3.",
      },
    ],
  },
  {
    id: "konsern",
    title: "Konsern og datterselskap",
    icon: "konsern",
    part: "verden",
    short: "Flere verk gir mer utbytte og mindre risiko, men hvert nytt verk gir litt mindre enn det forrige.",
    pages: [
      {
        head: "Mor og datter",
        text: "Et konsern er flere selskap med samme eier. Selskapet på toppen kalles morselskapet – her er det hjemmeverket ditt. Verkene det eier, kalles datterselskap.",
      },
      {
        head: "Utbytte",
        text: "Datterverkene har egen ledelse og egne ansatte. Morselskapet bestemmer hvor pengene skal investeres, og får utbytte: det verket har igjen etter vedlikehold, lokal ledelse og en reserve til dårlige tider. Utbyttet betales én gang per ekte dag rett til konsernkassa – der konkurransen med de andre spillerne foregår – uansett hvor fort du spiller.",
      },
      {
        head: "Stordriftsfordeler",
        text: "Når flere verk gjør ting sammen, blir det billigere: den som kjøper skrap eller strøm for alle verkene samtidig, får bedre pris. Det kalles stordriftsfordeler.",
      },
      {
        head: "Stordriftsulemper",
        text: "Et stort konsern har også stordriftsulemper. Ledelsen må følge med på flere verk, og det blir mer koordinering, flere reiser og dyrere finansiering. Derfor gir hvert nytt verk litt mindre enn det forrige – men flere verk gir fortsatt mer.",
      },
      {
        head: "Risikoen spres",
        text: "Flere verk sprer også risikoen. Står ett verk etter et havari, går de andre videre, og konsernet tjener fortsatt penger.",
      },
      {
        head: "Verkene er verdt noe",
        text: "Verdien av konsernet er mer enn pengene i banken: verkene er også verdt noe. Et datterverk er verdt omtrent det det tjener på 60 døgn, og den verdien teller med i konsernverdien. Derfor taper du ikke på å kjøpe et verk: pengene blir til et verk som er verdt like mye.",
      },
    ],
  },
  // Reglene for konsernet i spillet, flyttet hit fra «Slik fungerer konsernet» på Konsern-siden (B-410). Åpnes derfra;
  // tallene står der du kjøper
  {
    id: "konsernregler",
    title: "Slik fungerer konsernet",
    icon: "konsern",
    part: "verden",
    short:
      "Verkene kjøpes for konsernkassa, bygges i ekte tid og gir utbytte hver ekte dag. Flaggskipet og titlene gir mer.",
    pages: [
      {
        head: "Slik bygger du konsernet",
        text: "Du kjøper verk for konsernkassa – pengene fra hovedverkets bidrag og utbyttet – ikke for kassa hjemme. Start med et stålverk, bygg det ut til storverk, og senere til stålkompleks. Felles innkjøp og salg gjør alle verkene bedre, også hjemmeverket, og hvert trinn modernisering gir verket mer.",
      },
      {
        head: "Ekte tid",
        text: "Bygging og modernisering tar ekte timer, uansett hvor fort du spiller. Ett prosjekt bygges om gangen, og du kan ha noen i kø. Verket går som før mens det moderniseres. Utbyttet betales én gang per ekte dag.",
      },
      {
        head: "Flaggskipet og titlene",
        text: "Hjemmeverket er flaggskipet: godt omdømme og stål som holder kvaliteten gir mer utbytte fra alle datterverkene. Titlene – Stålmagnat, Stålfyrste og videre – kommer av verkene du har bygget, og hver tittel åpner mer: høyere trinn, stålkomplekser og flere plasser. Under Forskning finnes egne prosjekter for konsernet.",
      },
    ],
  },
];

/** Sesonger og felles hendelser (B-129); låses opp når spillet kobles til en sesong */
export const SEASON_CHAPTER: KnowledgeCard = {
  id: "sesong",
  title: "Konjunkturer og sesonger",
  icon: "trend-up",
  part: "verden",
  short: "Prisene på stål, skrap og strøm svinger. Felles hendelser treffer alle spillerne samtidig – tilpass deg.",
  pages: [
    {
      head: "Stålprisen svinger",
      text: "Stålprisen svinger med konjunkturene: når det bygges mye, øker etterspørselen og prisen stiger. Når verden bygger mindre, eller billig import strømmer inn, faller den. Skrapprisen følger stålprisen, for skrap er råstoffet.",
    },
    {
      head: "Strømprisen svinger",
      text: "Strømprisen svinger av andre grunner: tørre år gir lite vann i magasinene, og kalde vintre gir høyt forbruk. Et stålverk bruker enormt med strøm, så en strømkrise merkes med én gang.",
    },
    {
      head: "Felles hendelser",
      text: "I spillet dukker slike perioder opp som felles hendelser som treffer alle spillerne samtidig: skrapmangel, strømkrise, eksportboom, importpress og streik. Se etter dem øverst på Marked, og tilpass deg: kjøp skrap før prisen stiger, selg når stålprisen er høy.",
    },
    {
      head: "Sesongene",
      text: "Du trenger en konto for å være med i sesongen. Spillet du har, blir med som det er – også videre til neste sesong. Var du med i forrige sesong, får du en liten fordel når du starter et nytt spill.",
    },
    {
      head: "Merket på topplista",
      text: "Merket ved navnet på topplista viser hvor langt spilleren har kommet: Garasje, Verksted, Støperi, Stålverk eller Storverk, og Konsern når konsernverdien passerer én milliard. Medaljene viser de tre beste plassene.",
    },
    {
      head: "Sesongstigen",
      text: "Sesongstigen på Mål varer hele sesongen: hver dag du spiller, henter dagens belønning og fullfører dagens oppdrag, gir poeng, og det samme gjør topp 3 på ukelista. Hvert trinn gir fagpoeng, og trinn 10, 20, 30, 40 og 50 gir pynt som bare finnes der – og bare denne sesongen. Den som spiller litt hver dag, kommer lengst.",
    },
  ],
};
KNOWLEDGE.push(SEASON_CHAPTER);

export function knowledgeCard(id: string): KnowledgeCard | undefined {
  return KNOWLEDGE.find((k) => k.id === id);
}

/** Omtrent hvor lang tid kapitlet tar å lese, i sekunder (ca. 200 ord i minuttet), rundet opp til 10 s */
export function readSeconds(card: KnowledgeCard): number {
  const words = [card.short, ...card.pages.map((p) => `${p.head} ${p.text}`)].join(" ").split(/\s+/).length;
  return Math.max(10, Math.ceil((words * 60) / 200 / 10) * 10);
}
