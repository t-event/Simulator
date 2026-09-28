import { GRADES, PRODUCTS } from "../game/data";
import {
  acceptAgreement,
  agreementCancelCost,
  AGREEMENT_MAX_MISSED,
  AGREEMENT_STAGE,
  cancelAgreement,
  declineAgreement,
  MAX_AGREEMENTS,
  realisticDailyT,
  recipeEstimate,
} from "../game/engine";
import { gradeRecipe, type PlantStats } from "../game/plant";
import type { Agreement, GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { useState } from "react";
import { Bar, Card, GradeSpec } from "./common";
import { fmtKr, fmtPct, fmtT } from "./format";
import { Icon } from "./icons";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

/** Tilbud om rammeavtale (B-241): om det passer først, så tallene, samme mønster som forespørslene */
function AgreementOffer({ g, stats, a, act }: Props & { a: Agreement }) {
  const canMake = stats.products.includes(a.product);
  const recipeOk = recipeEstimate(g, a.grade, stats, gradeRecipe(g, a.grade)).grades.includes(a.grade);
  const perWeek = realisticDailyT(g, stats) * 7;
  const share = perWeek > 0 ? a.weeklyT / perWeek : Infinity;
  // Med avtalene du alt har (B-103)
  const usedT = g.agreements.filter((x) => x.status === "aktiv").reduce((t, x) => t + x.weeklyT, 0);
  const totalShare = perWeek > 0 ? (usedT + a.weeklyT) / perWeek : Infinity;
  const hours = Math.max(0, (a.offerExpiresMin - g.minute) / 60);
  const tone: "ok" | "warn" | "bad" =
    !canMake || !recipeOk || totalShare > 0.7 ? "bad" : totalShare > 0.5 ? "warn" : "ok";
  const reason = !canMake
    ? `Du lager ikke ${PRODUCTS[a.product].name.toLowerCase()}`
    : !recipeOk
      ? "Resepten holder ikke kravet ennå – juster den under Verket → Resept"
      : Number.isFinite(share)
        ? `Tar ca. ${fmtPct(share)} av det verket lager i en uke${usedT > 0 ? ` – med avtalene du har, ${fmtPct(totalShare)}` : ""}`
        : "Verket står – ingen produksjon nå";
  const verdict = { ok: ["ok", "Passer"], warn: ["warning", "Trangt"], bad: ["error", "Passer ikke"] } as const;
  return (
    <article className={`g-contract g-offer is-${tone}`}>
      <div className="g-contract-head">
        <strong className="g-offer-customer">{a.customer}</strong>
        <span className="g-contract-value">{fmtKr(a.weeklyT * a.weeks * a.pricePerT)}</span>
      </div>
      <p className="g-offer-what">
        {fmtT(a.weeklyT)} {PRODUCTS[a.product].name.toLowerCase()} i uka · <strong>{GRADES[a.grade].name}</strong>
      </p>
      <div className="g-offer-verdict">
        <span className={`ds-status-line ${tone === "ok" ? "is-ok" : tone === "warn" ? "is-heat" : "is-critical"}`}>
          <Icon name={verdict[tone][0]} />
          <span>{verdict[tone][1]}</span>
        </span>
        <span className="g-offer-reason">{reason}</span>
      </div>
      <dl className="g-offer-facts">
        <div>
          <dt>Varighet</dt>
          <dd>{a.weeks} uker</dd>
        </div>
        <div>
          <dt>Fast pris</dt>
          <dd>{fmtKr(a.pricePerT)}/t</dd>
        </div>
        <div className={hours <= 3 ? "is-urgent" : undefined}>
          <dt>Svar innen</dt>
          <dd>{hours < 1 ? "under en time" : hours < 2 ? "1 time" : `${Math.floor(hours)} timer`}</dd>
        </div>
      </dl>
      <p className="g-muted g-small-text">
        Alle uker i tide: bonus {fmtKr(a.bonusKr)} og omdømme +{a.bonusRep.toFixed(1).replace(".", ",")}.{" "}
        {AGREEMENT_MAX_MISSED} uker for sent: kunden sier opp, omdømme −{a.bonusRep.toFixed(1).replace(".", ",")}.
      </p>
      <details className="g-details">
        <summary>Krav til stålet</summary>
        <p>
          <GradeSpec id={a.grade} />
        </p>
      </details>
      <div className="g-row g-offer-actions">
        <button
          className={tone === "bad" ? undefined : "g-primary"}
          onClick={() => act((gg) => acceptAgreement(gg, a.id))}
        >
          {tone === "bad" ? "Signer likevel" : "Signer avtalen"}
        </button>
        <button
          className={tone === "bad" ? "g-primary" : undefined}
          onClick={() => act((gg) => declineAgreement(gg, a.id))}
        >
          Avslå
        </button>
      </div>
    </article>
  );
}

function AgreementRow({ a, act }: { a: Agreement; act: GameApi["act"] }) {
  const [confirm, setConfirm] = useState(false);
  const cost = agreementCancelCost(a);
  const status =
    a.status === "aktiv"
      ? a.weeksSent < a.weeks
        ? `Neste uke legges i køen dag ${a.nextDay}`
        : "Siste uke er i ordrekøen"
      : a.status === "fullfort"
        ? a.weeksMissed === 0
          ? `Fullført dag ${a.closedDay} med bonus`
          : `Fullført dag ${a.closedDay}, uten bonus`
        : `Sagt opp dag ${a.closedDay}`;
  return (
    <div className={`g-contract${a.status === "aktiv" ? "" : " is-closed"}`}>
      <div className="g-contract-head">
        <strong>{a.customer}</strong>
        <span className={a.weeksMissed > 0 && a.status === "aktiv" ? "g-badge-bad" : "g-muted"}>
          Uke {Math.min(a.weeksSent, a.weeks)} av {a.weeks}
        </span>
      </div>
      <p>
        {fmtT(a.weeklyT)} {GRADES[a.grade].name.toLowerCase()} i uka · {fmtKr(a.pricePerT)}/t
      </p>
      <Bar value={a.weeksDone / a.weeks} tone={a.weeksMissed > 0 ? "warning" : "ok"} label="Uker levert" />
      <p className="g-muted">
        {a.weeksDone} levert i tide
        {a.weeksMissed > 0 ? `, ${a.weeksMissed} for sent (${AGREEMENT_MAX_MISSED} betyr oppsigelse)` : ""} · {status}
        {a.status === "aktiv" && a.weeksMissed === 0 ? ` · bonus ${fmtKr(a.bonusKr)} til slutt` : ""}
      </p>
      {/* Avbryt med stor straff (B-233): 30 % av ukene som gjenstår, og dobbelt omdømme */}
      {a.status === "aktiv" &&
        cost.weeks > 0 &&
        (confirm ? (
          <div className="g-note g-warn g-agreement-cancel">
            <span>
              Avbryte avtalen med {a.customer}? Du betaler {fmtKr(cost.kr)} i bot og mister{" "}
              {cost.rep.toFixed(1).replace(".", ",")} i omdømme. Uka i ordrekøen strykes.
            </span>
            <div className="g-row">
              <button className="g-danger" onClick={() => act((gg) => void cancelAgreement(gg, a.id))}>
                Ja, avbryt ({fmtKr(cost.kr)})
              </button>
              <button onClick={() => setConfirm(false)}>Behold avtalen</button>
            </div>
          </div>
        ) : (
          <button className="g-link" onClick={() => setConfirm(true)}>
            Avbryt avtalen…
          </button>
        ))}
    </div>
  );
}

/** Hvor mye av ukeproduksjonen rammeavtalene bruker, og hvor mange man kan ha (B-103) */
function Capacity({ g, stats }: { g: GameState; stats: PlantStats }) {
  const active = g.agreements.filter((a) => a.status === "aktiv");
  const perWeek = realisticDailyT(g, stats) * 7;
  const usedT = active.reduce((t, a) => t + a.weeklyT, 0);
  const share = perWeek > 0 ? usedT / perWeek : 0;
  const max = MAX_AGREEMENTS[g.stage] ?? 0;
  return (
    <div className="g-agreement-capacity">
      <div className="g-goal">
        <span>Kapasitet</span>
        <Bar
          value={Math.min(1, share)}
          tone={share > 0.7 ? "critical" : share > 0.5 ? "warning" : "ok"}
          label="Kapasitet"
        />
        <span>{fmtPct(share)}</span>
      </div>
      <p className="g-muted g-small-text">
        {fmtT(usedT)} av ca. {fmtT(perWeek)} i uka · {active.length} av {max} avtaler
        {share > 0.5 ? " · over halve uka er bundet, og det blir trangt når noe stopper" : ""}
      </p>
    </div>
  );
}

/** Rammeavtaler (B-040): faste ukeleveranser over flere uker, fra stålverket */
export function Agreements({ g, stats, act }: Props) {
  if (g.stage < AGREEMENT_STAGE && !g.agreements.length) return null;
  const offers = g.agreements.filter((a) => a.status === "tilbud");
  const active = g.agreements.filter((a) => a.status === "aktiv");
  const closed = g.agreements.filter((a) => a.status === "fullfort" || a.status === "brutt");
  return (
    <Card title="Rammeavtaler" right={<span className="g-muted g-small-text">{active.length} aktive</span>}>
      {/* Én linje om hva en rammeavtale er, resten bak «Slik virker det» (B-241): før var det en tekstvegg øverst */}
      <p className="g-muted g-small-text">
        Fast mengde hver uke til fast pris i flere uker – bonus hvis alle ukene er i tide.
      </p>
      <details className="g-details">
        <summary>Slik virker rammeavtaler</summary>
        <p className="g-muted g-small-text">
          Kunden bestiller like mye hver uke til fast pris, uansett hva markedet gjør. Hver ukes leveranse legges i
          ordrekøen med sju døgns frist. Leverer du alle ukene i tide, får du bonus og omdømme. Kommer{" "}
          {AGREEMENT_MAX_MISSED} uker for sent, sier kunden opp.
        </p>
      </details>
      <Capacity g={g} stats={stats} />
      {offers.length > 0 && <h3 className="g-subhead">Tilbud</h3>}
      {offers.map((a) => (
        <AgreementOffer key={a.id} g={g} stats={stats} act={act} a={a} />
      ))}
      {active.length > 0 && <h3 className="g-subhead">Dine avtaler</h3>}
      {active.map((a) => (
        <AgreementRow key={a.id} a={a} act={act} />
      ))}
      {closed.length > 0 && (
        <details className="g-details">
          <summary>Avsluttet ({closed.length})</summary>
          {closed.map((a) => (
            <AgreementRow key={a.id} a={a} act={act} />
          ))}
        </details>
      )}
      {!offers.length && !active.length && (
        <p className="g-empty">
          <Icon name="calendar-check" />
          {g.settings.pauseOffers
            ? "Du tar ikke imot nye forespørsler nå, så ingen tilbyr rammeavtaler."
            : "Ingen tilbud akkurat nå. Store kunder spør av og til – du får beskjed."}
        </p>
      )}
    </Card>
  );
}
