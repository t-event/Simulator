/**
 * Fagkort som låses opp etter hvert som verket vokser.
 *
 * Kortene er den delen av spillet som skal lære bort prosessen: hvert kort
 * forklarer hvorfor spillet oppfører seg som det gjør, med de samme
 * sammenhengene man møter i et ekte stålverk.
 */
export interface KnowledgeCard {
  id: string;
  title: string;
  paragraphs: string[];
}

export const KNOWLEDGE: KnowledgeCard[] = [
  {
    id: "start",
    title: "Fra skrap til stål",
    paragraphs: [
      "Et skrapbasert stålverk gjør gammelt stål om til nytt. Skrapet smeltes, analysen justeres, og det flytende stålet støpes til noe kunden kan bruke.",
      "Hver charge går gjennom samme kjede: skraplager → ovn → øse → støping → lager → kunde. Den tregeste delen av kjeden bestemmer hvor mye du får levert.",
      "Du tjener penger på å levere riktig kvalitet til riktig tid. Stål som ikke holder kravene, koster deg både penger og omdømme.",
    ],
  },
  {
    id: "skrap",
    title: "Skrapvalg og sporelementer",
    paragraphs: [
      "Kobber, tinn, nikkel, krom og molybden kalles sporelementer. De er mindre villige til å gå i slaggen enn jern er, så de blir i stålet uansett hva du gjør i ovnen.",
      "Den eneste måten å få dem ned på er å tynne ut: bland inn rent skrap eller råjern. Resepten din bestemmer derfor hvilke kvaliteter du i det hele tatt kan lage.",
      "Billig skrap har mer rust, jord og olje. Det gir mindre stål per tonn, mer slagg og høyere energiforbruk. Det billigste skrapet er ikke alltid det billigste stålet.",
    ],
  },
  {
    id: "karbon",
    title: "Karbon: lett å legge til, vanskelig å ta ut",
    paragraphs: [
      "Karbon er det viktigste legeringselementet i stål: mer karbon gir hardere og sterkere stål, men dårligere sveisbarhet og formbarhet.",
      "Karbon kan alltid legges til med karburiseringsmiddel. Men i en digel- eller induksjonsovn finnes det ingen måte å fjerne det på – det som er i skrapet, blir i stålet.",
      "Råjern har rundt 4 % karbon. Det er gull for å tynne ut sporelementer, men det må ha en ovn med oksygen for å brenne karbonet ned igjen.",
    ],
  },
  {
    id: "induksjon",
    title: "Induksjonsovnen",
    paragraphs: [
      "En induksjonsovn varmer stålet med vekselstrøm i en vannkjølt spole rundt digelen. Den er rask, ren og taper lite stål.",
      "Til gjengjeld raffinerer den nesten ikke: fosfor og sporelementer blir der de er, og karbon kan bare legges til. Du får ut det du putter inn.",
    ],
  },
  {
    id: "analyse",
    title: "Analyse: vet du hva du selger?",
    paragraphs: [
      "Uten laboratorium gjetter du analysen ut fra resepten. Skrap varierer, og et dårlig parti merkes først når kunden reklamerer.",
      "En håndholdt røntgenanalysator (XRF) måler tunge elementer som kobber, nikkel og krom, men ikke lette elementer som karbon. Fosfor kan den heller ikke stole på i stål.",
      "Et gnistspektrometer (OES) måler alt, også karbon og fosfor. Da leverer du bare partier du vet holder kravet, og resten kan selges som enklere kvalitet.",
    ],
  },
  {
    id: "stoping",
    title: "Støping og temperatur",
    paragraphs: [
      "Stålet må ha riktig overheting når det støpes: for kaldt, og det fryser i innløpet; for varmt, og du får porer, sprekker og slitasje på ildfast.",
      "Innløp, matere og kapp blir ikke produkt. Det går tilbake til skraplageret som returskrap – gratis og med kjent analyse.",
    ],
  },
  {
    id: "folk",
    title: "Folk og skift",
    paragraphs: [
      "Hvert anlegg trenger et fast mannskap per skift. Med ett skift går verket 8 timer i døgnet; med tre skift går det døgnet rundt.",
      "Erfarne folk jobber raskere og gjør færre feil, og alle blir flinkere av å jobbe. Allroundere kan fylle hvilken plass som helst.",
      "Lønn betales hver dag, også når verket står. Et ekstra skift lønner seg bare hvis du får solgt det du lager.",
    ],
  },
  {
    id: "ildfast",
    title: "Ildfast foring",
    paragraphs: [
      "Ovnen er foret med ildfast stein eller masse som slites litt for hver charge – mest når stålet er for varmt eller slaggen er feil.",
      "Foringen må byttes før den er slitt gjennom. Går flytende stål gjennom foringen, er det en alvorlig hendelse: ovnen står lenge, og reparasjonen koster mange ganger en planlagt omforing.",
    ],
  },
  {
    id: "radioaktivitet",
    title: "Radioaktive kilder i skrap",
    paragraphs: [
      "Gamle måleinstrumenter og medisinsk utstyr kan inneholde radioaktive kilder. Havner en slik kilde i ovnen, forurenses stålet, støvet og anlegget.",
      "Derfor måles alt skrap ved porten. En strålingsportal koster lite sammenlignet med en opprydding.",
    ],
  },
  {
    id: "strom",
    title: "Strømpris og effekt",
    paragraphs: [
      "Et smelteverk er en av de største strømkundene som finnes. Prisen varierer over døgnet og fra dag til dag, med topper morgen og ettermiddag.",
      "Du kan sette en grense for strømpris der nye charger ikke startes. Det sparer penger, men koster produksjon – regn på om det lønner seg.",
    ],
  },
  {
    id: "lysbue",
    title: "Lysbueovnen",
    paragraphs: [
      "I lysbueovnen går strømmen gjennom grafittelektroder og lager lysbuer ned mot skrapet. Oksygen og karbon blåses inn gjennom lanser.",
      "Oksygen brenner karbon til CO, og karbon reduserer FeO i slaggen. Gassen skummer opp slaggen, som legger seg rundt lysbuen og holder varmen i badet.",
      "Kalk og dolomitt gir en basisk slagg. Basisiteten B2 = CaO/SiO₂ må ligge rundt 1,8 for at slaggen skal skumme og ta opp fosfor.",
    ],
  },
  {
    id: "fosfor",
    title: "Fosfor og avslagging",
    paragraphs: [
      "Fosfor gjør stålet sprøtt. Det kan bare fjernes i en oksiderende, basisk slagg – det vil si i lysbueovnen, med nok FeO og kalk.",
      "Avfosforeringen går best ved lav temperatur. Kjøres temperaturen opp mens fosforrik slagg ligger i ovnen, går fosforet tilbake i stålet.",
      "Derfor slagges det av før temperaturen kjøres opp mot tapping. Ta styringen på en charge for å prøve selv.",
    ],
  },
  {
    id: "oseovn",
    title: "Øseovnen",
    paragraphs: [
      "Etter tapping fraktes stålet i øsa til øseovnen. Der varmes det med egne elektroder, legeres til riktig analyse og spyles med argon for å bli homogent.",
      "Øseovnen gjør at stålovnen kan konsentrere seg om å smelte og raffinere, og at støpemaskinen får stål med riktig temperatur.",
    ],
  },
  {
    id: "streng",
    title: "Strengstøping",
    paragraphs: [
      "Stålet renner fra øsa ned i en fordeler og videre ned i en vannkjølt kobberkokille. Et tynt skall størkner mot veggen og trekkes ut nedover mens kjernen fortsatt er flytende.",
      "Strengen kjøles med vannspray til den er gjennomstørknet, og kappes til emner. Går skallet i stykker, renner stålet ut – et strenggjennombrudd.",
      "Strengstøping gir langt bedre utbytte enn blokkstøping, fordi det blir lite topp og bunn å kappe bort.",
    ],
  },
  {
    id: "valsing",
    title: "Valsing",
    paragraphs: [
      "Emnene varmes opp igjen og valses i mange stikk til ferdig dimensjon. Armeringsstål får ribber i siste stikk.",
      "Glødeskall og kapp fra valseverket går tilbake til smelteverket.",
    ],
  },
  {
    id: "omdomme",
    title: "Kunder og omdømme",
    paragraphs: [
      "Hver kontrakt har mengde, kvalitet og frist. Leverer du i tide, stiger omdømmet, og større kunder begynner å spørre.",
      "For sen levering gir bot og dårligere omdømme. En reklamasjon er verre: kunden sender stålet tilbake og forteller det til andre.",
    ],
  },
];

export function knowledgeCard(id: string): KnowledgeCard | undefined {
  return KNOWLEDGE.find((k) => k.id === id);
}
