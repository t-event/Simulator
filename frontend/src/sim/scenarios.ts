/**
 * Treningsscenarioer for instruktørpanelet.
 *
 * Scenarioene er bygget rundt situasjoner kompendiet beskriver som typiske
 * utfordringer på stålovnen: fosforbom ved ufullstendig avslagging, overslag
 * fra elektrodene, kjølevannslekkasje, falskluft gjennom static seal og
 * balansen mellom conveyorhastighet og tilført effekt.
 */
export interface Scenario {
  id: string;
  name: string;
  briefing: string;
  grade: string;
  initialFaults: { fault: string; [key: string]: unknown }[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "normal_charge",
    name: "Normal charge",
    briefing:
      "Kjør en komplett charge på TP26: mat inn 92 tonn skrap med conveyor, bygg slagg med kalk og dolomitt mot B2 rundt 1,8, hold skumslagg med karbon og oksygen, slagg av og tapp innenfor temperaturvinduet.",
    grade: "TP26",
    initialFaults: [],
  },
  {
    id: "fosforbom",
    name: "Fosforbom",
    briefing:
      "Skrapet har uvanlig høyt fosforinnhold. Avfosforer med oksiderende, basisk slagg ved moderat temperatur, og husk å slagge av FØR du kjører opp temperaturen. Kjører du opp varmen med fosforrik slagg i ovnen, går fosforet tilbake i stålet.",
    grade: "TP26",
    initialFaults: [{ fault: "high_phosphorus_scrap", value: 0.085 }],
  },
  {
    id: "overslag",
    name: "Overslag og vannlekkasje",
    briefing:
      "Hvelvet er fullt av støv etter lang drift, og elektrodekjølingen står høyt. Begge deler øker faren for overslag. Vurder tiltak før du kjører på full effekt – et overslag i et vannkjølt element kan kreve akutt stans.",
    grade: "TP26",
    initialFaults: [{ fault: "dusty_hvelv" }],
  },
  {
    id: "vannlekkasje",
    name: "Kjølevannslekkasje i hvelv",
    briefing:
      "Det oppstår en lekkasje i hvelvets kjølekrets under innsmelting. Overvåk delta-T og reager før panelet tar skade.",
    grade: "TP26",
    initialFaults: [{ fault: "water_leak", circuit: "hvelv", severity: 0.6 }],
  },
  {
    id: "static_seal",
    name: "Falskluft i static seal",
    briefing:
      "Static seal er utett, og falskluft trekkes inn i forvarmingsdelen. Skrapet blir kaldere inn i ovnen og energiforbruket stiger. Tilpass conveyorhastighet og effekt så badet ikke blir kaldt.",
    grade: "TP26",
    initialFaults: [{ fault: "static_seal" }],
  },
  {
    id: "lavkarbon",
    name: "Lavkarbon TP28",
    briefing:
      "Kjør lavkarbonkvaliteten TP28. Det krever mer oksygen, og du vil se at FeO i slaggen stiger. Høy FeO gir god avfosforering, men dårligere stålutbytte og mer løst oksygen videre til øseovnen.",
    grade: "TP28",
    initialFaults: [],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
