/**
 * Hva som krever konto (B-149). Regelen og begrunnelsen står i docs/KONTO.md; her er lista appen bruker, så teksten
 * «krever konto» er lik overalt. Ny funksjon: avgjør etter reglene i KONTO.md om den krever konto, og legg den inn her
 * hvis den gjør det.
 */
export const ACCOUNT_FEATURES = {
  sky: { name: "Lagring på nett", why: "Spillet lagres på kontoen, så du kan spille videre på en annen enhet." },
  toppliste: { name: "Topplista", why: "Du står på lista med kallenavnet ditt." },
  sesong: { name: "Sesongen", why: "Resultatet ditt regnes ut på serveren og står på sesonglista." },
  daglig: {
    name: "Daglig belønning",
    why: "Serveren teller dagene, så belønningen ikke kan hentes flere ganger ved å stille klokka.",
  },
  oppdrag: { name: "Dagens oppdrag", why: "Serveren vet hvilken dag det er og om bonusen alt er hentet." },
  borte: { name: "Mens du var borte", why: "Serveren måler hvor lenge du har vært borte." },
  ukens: {
    name: "Ukens utfordring",
    why: "Du konkurrerer mot de andre spillerne, og serveren regner ut plassen, medaljene og ukekista.",
  },
  stigen: {
    name: "Sesongstigen",
    why: "En stige du klatrer ved å spille litt hver dag, med fagpoeng og pynt. Serveren teller dagene, så den følger virkelig tid.",
  },
  skraplager: {
    name: "Skraplageret",
    why: "Anbudet, eierskapet og inntekten avgjøres på serveren i virkelig tid, i konkurranse med de andre spillerne.",
  },
  sesongpynt: {
    name: "Sesongpynt",
    why: "Pynten finnes bare mens sesongen pågår, og sesongen kommer fra serveren.",
  },
  datterverk: {
    name: "Datterverk",
    why: "Verkene kjøpes fra konsernkassa på serveren og bygges i ekte tid, så titlene og utbyttet regnes der.",
  },
  verdenskart: {
    name: "Verdenskartet",
    why: "Kartet viser verkene og selskapene til de andre spillerne, og regionene står på serveren.",
  },
  skiftrapporten: {
    name: "Skiftrapporten",
    why: "Chatten er felles for alle spillerne, og de andre ser brukernavnet ditt ved meldingene.",
  },
  profiler: {
    name: "Profiler",
    why: "Profilene viser det serveren vet om spillerne – konsernet, selskapene og sesongene – og bare for kontoer.",
  },
  konsernkasse: {
    name: "Konsernkassa",
    why: "Kassa ligger på serveren og går i virkelig tid, så overføringene og det du kjøper i verden avgjøres der.",
  },
} as const;

export type AccountFeature = keyof typeof ACCOUNT_FEATURES;
