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
} as const;

export type AccountFeature = keyof typeof ACCOUNT_FEATURES;
