/**
 * «Slik henger pengene sammen» (B-355): de to kassene – hjemme i spilltid og konsernkassa i ekte tid – og svar på det
 * spillerne spør om i Skiftrapporten: hvor blir pengene over taket av, hvorfor kan jeg ikke flytte penger til
 * konsernet, hva er utbytte, og hvorfor bygges verkene saktere enn før. Åpnes fra Konsern (Oversikt og Industrien) og
 * fra Verket → Økonomi. Gradvis synlighet: konsernet forklares først når det er åpent, taket først når kassa har nådd det.
 */
import { useState } from "react";
import { STORMODEL_EQUITY } from "../game/actions";
import { hasPaidOut, paidOutTotal, CASH_RESERVE } from "../game/reserve";
import { POLICIES } from "../game/control";
import type { GameState } from "../game/types";
import { SheetHead } from "./ds";
import { fmtKr } from "./format";
import { Icon } from "./icons";
import { Portal } from "./Portal";

/** Har spilleren noe å lure på her? (konsernet er åpent, eller kassa har nådd taket) */
function moneyGuideRelevant(g: GameState): boolean {
  return !!g.konsern?.unlocked || hasPaidOut(g);
}

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="g-details g-money-q">
      <summary>{q}</summary>
      <div className="g-small-text">{children}</div>
    </details>
  );
}

export function MoneyGuide({ g, onClose }: { g: GameState; onClose: () => void }) {
  const konsern = !!g.konsern?.unlocked;
  const cap = CASH_RESERVE.softCap ?? 0;
  const perDay = g.konsern?.treasury?.perDay ?? 0;
  return (
    <Portal>
      <div
        className="g-modal g-side-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Slik henger pengene sammen"
        onClick={onClose}
      >
        <div className="g-modal-card g-money-sheet" onClick={(e) => e.stopPropagation()}>
          <SheetHead title="Slik henger pengene sammen" icon="coins" onClose={onClose} />
          <div className="g-money-flow">
            <div className="g-money-box">
              <h3>
                <Icon name="factory" /> Kassa hjemme
              </h3>
              <p className="g-small-text">
                <strong>Spilltid</strong> – går fortere på 3× og 10×. Det hjemmeverket tjener på stålet, kommer hit.
                Brukes til utstyr, folk, skrap og forskning hjemme.
              </p>
              {cap > 0 && (
                <p className="g-small-text g-muted">
                  Tak: {fmtKr(cap)}. Det du tjener over, flyttes til din private formue.
                </p>
              )}
            </div>
            {konsern && (
              <>
                <p className="g-money-arrow g-small-text">
                  <Icon name="chevron-down" /> Bidrag hver ekte dag – ikke fra kassa, men etter hvor godt verket går
                </p>
                <div className="g-money-box is-konsern">
                  <h3>
                    <Icon name="konsern" /> Konsernkassa
                  </h3>
                  <p className="g-small-text">
                    <strong>Ekte tid</strong> – like fort for alle, uansett spillfart. Får bidraget fra hovedverket og
                    utbyttet fra datterverkene. Brukes til å kjøpe og modernisere datterverk, anbud og overtakelser.
                  </p>
                  {perDay > 0 && <p className="g-small-text g-muted">Nå ca. {fmtKr(perDay)} per ekte dag.</p>}
                </div>
              </>
            )}
          </div>

          <h3 className="g-subhead">Det mange lurer på</h3>
          {hasPaidOut(g) && (
            <Question q={`Kassa står på ${fmtKr(cap)} – hvor blir resten av?`}>
              <p>
                Det flyttes til din private formue ({fmtKr(Math.floor(paidOutTotal(g)))} så langt). Den kan ikke brukes
                i spillet – alt som kan kjøpes hjemme, koster mindre – men den er ikke borte: den teller med i verdien
                din, altså sluttmålet, de største ovnene ({fmtKr(STORMODEL_EQUITY)}) og dagens oppdrag, og står i Hall
                of Fame som «Privat formue».
              </p>
            </Question>
          )}
          {konsern && (
            <>
              <Question q="Hvorfor kan jeg ikke sette penger fra verket inn i konsernet?">
                <p>
                  Konsernet er felles for alle og går i ekte tid. Kunne man flytte penger fra kassa hjemme, ville den
                  som lar spillet gå på 10× hele natta, kjøpe opp alt. I stedet betaler hovedverket et{" "}
                  <strong>bidrag</strong> hver ekte dag: halvparten av det verket tjener på en vanlig spilldag. Spiller
                  du, får du fullt bidrag; dager uten spill gir mindre, aldri under 30 %.
                </p>
              </Question>
              <Question q="Hva er utbytte – og utbyttepolitikken?">
                <p>
                  Datterverkene tjener penger hver ekte dag og sender utbytte til konsernkassa. Politikken (Konsern →
                  Industrien) bestemmer hvor mye verkene holder igjen:{" "}
                  {POLICIES.map((p) => `${p.name} (${Math.round(p.keep * 100)} %)`).join(", ")}. Det som holdes igjen
                  utover 30 %, går til forsvarsfondet, som beskytter selskapene dine mot overtakelser. Utbyttet er fullt
                  i 7 dager etter at du sist spilte, så synker det.
                </p>
              </Question>
              <Question q="Hvorfor tar det lengre tid å bygge og modernisere enn før?">
                <p>
                  Før ble datterverkene kjøpt med kassa hjemme, og den vokser ti ganger så fort på 10×. Nå kjøpes de fra
                  konsernkassa, og bygging og modernisering tar ekte timer. Da bygger alle i samme tempo, og spillfarten
                  avgjør ikke hvem som vinner mot de andre. Hjemmeverket kan du fortsatt kjøre så fort du vil.
                </p>
              </Question>
              <Question q="Hva teller på topplista?">
                <p>
                  <strong>Konsernverdi:</strong> konsernkassa pluss 60 dagers utbytte og bidrag, minus lån – regnet av
                  serveren i ekte tid. <strong>Verdi i spillet:</strong> kassa hjemme minus lån, pluss det verkene er
                  verdt. <strong>Privat formue</strong> har sin egen liste.
                </p>
              </Question>
            </>
          )}
          <p className="g-muted g-small-text">
            Kort sagt: hjemme gir spillfarten fart. Alt som konkurrerer med de andre spillerne, går i ekte tid.
          </p>
        </div>
      </div>
    </Portal>
  );
}

/** Lenke som åpner forklaringen (Konsern, Økonomi) */
export function MoneyGuideLink({ g, label = "Slik henger pengene sammen" }: { g: GameState; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!moneyGuideRelevant(g)) return null;
  return (
    <>
      <button className="g-link g-money-link" onClick={() => setOpen(true)}>
        <Icon name="coins" /> {label}
      </button>
      {open && <MoneyGuide g={g} onClose={() => setOpen(false)} />}
    </>
  );
}
