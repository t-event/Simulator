import { GRADES, PRODUCTS } from "../game/data";
import {
  acceptAgreement,
  AGREEMENT_MAX_MISSED,
  AGREEMENT_STAGE,
  declineAgreement,
  MAX_AGREEMENTS,
  realisticDailyT,
  recipeEstimate,
} from "../game/engine";
import { gradeRecipe, type PlantStats } from "../game/plant";
import type { Agreement, GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card, GradeSpec } from "./common";
import { fmtKr, fmtPct, fmtT } from "./format";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

function AgreementOffer({ g, stats, a, act }: Props & { a: Agreement }) {
  const canMake = stats.products.includes(a.product);
  const recipeOk = recipeEstimate(g, a.grade, stats, gradeRecipe(g, a.grade)).grades.includes(a.grade);
  const perWeek = realisticDailyT(g, stats) * 7;
  const share = perWeek > 0 ? a.weeklyT / perWeek : Infinity;
  // Med avtalene du alt har (B-103)
  const usedT = g.agreements.filter((x) => x.status === "aktiv").reduce((t, x) => t + x.weeklyT, 0);
  const totalShare = perWeek > 0 ? (usedT + a.weeklyT) / perWeek : Infinity;
  const hours = Math.max(0, (a.offerExpiresMin - g.minute) / 60);
  return (
    <div className="g-contract">
      <div className="g-contract-head">
        <strong>{a.customer}</strong>
        <span className="g-contract-value">{fmtKr(a.weeklyT * a.weeks * a.pricePerT)}</span>
      </div>
      <p className="g-answer-by">Svar innen {Math.floor(hours)} timer</p>
      <p>
        {fmtT(a.weeklyT)} {PRODUCTS[a.product].name.toLowerCase()} i uka i <strong>{a.weeks} uker</strong>, kvalitet{" "}
        <strong>{GRADES[a.grade].name}</strong> · fast pris {fmtKr(a.pricePerT)}/t
      </p>
      <p>
        <GradeSpec id={a.grade} />
      </p>
      <ul className="g-checks">
        {!canMake && <li className="bad">Du lager ikke {PRODUCTS[a.product].name.toLowerCase()}</li>}
        {canMake && (
          <li className={recipeOk ? "ok" : "bad"}>
            {recipeOk ? "Resepten holder kravet" : "Resepten holder ikke kravet ennå – juster den under Marked"}
          </li>
        )}
        {canMake && (
          <li className={totalShare > 0.7 ? "bad" : totalShare > 0.5 ? "warn" : "ok"}>
            {Number.isFinite(share)
              ? `Tar ca. ${fmtPct(share)} av det verket lager i en uke${
                  usedT > 0 ? ` – sammen med avtalene du har, ${fmtPct(totalShare)}` : ""
                }`
              : "Verket står – ingen produksjon nå"}
          </li>
        )}
        <li className="g-muted">
          Alle uker i tide: bonus {fmtKr(a.bonusKr)} og omdømme +{a.bonusRep.toFixed(1).replace(".", ",")}.{" "}
          {AGREEMENT_MAX_MISSED} uker for sent: kunden sier opp, omdømme −{a.bonusRep.toFixed(1).replace(".", ",")}.
        </li>
      </ul>
      <div className="g-row">
        <button className="g-primary" onClick={() => act((gg) => acceptAgreement(gg, a.id))}>
          Signer avtalen
        </button>
        <button onClick={() => act((gg) => declineAgreement(gg, a.id))}>Avslå</button>
      </div>
    </div>
  );
}

function AgreementRow({ a }: { a: Agreement }) {
  const status =
    a.status === "aktiv"
      ? a.weeksSent < a.weeks
        ? `Neste uke legges i køen dag ${a.nextDay}`
        : "Siste uke er i ordrekøen"
      : a.status === "fullfort"
        ? a.weeksMissed === 0
          ? `Fullført dag ${a.closedDay} med bonus ✓`
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
      <p className="g-muted">
        Avtalene tar {fmtT(usedT)} av ca. {fmtT(perWeek)} verket lager i uka. Ledig til vanlige kontrakter:{" "}
        {fmtT(Math.max(0, perWeek - usedT))} i uka. Du kan ha {max} avtaler samtidig ({active.length} nå). Over ca. 50 %
        blir det trangt når noe stopper.
      </p>
    </div>
  );
}

/** Rammeavtaler (B-040): faste ukeleveranser over flere uker, fra stålverket */
export function Agreements({ g, stats, act }: Props) {
  if (g.stage < AGREEMENT_STAGE && !g.agreements.length) return null;
  const offers = g.agreements.filter((a) => a.status === "tilbud");
  const others = g.agreements.filter((a) => a.status !== "tilbud");
  return (
    <Card title={`Rammeavtaler (${g.agreements.filter((a) => a.status === "aktiv").length})`}>
      <p className="g-muted">
        En rammeavtale er en fast avtale over flere uker: kunden bestiller like mye hver uke til fast pris, uansett hva
        markedet gjør. Hver ukes leveranse legges i ordrekøen med sju døgns frist. Leverer du alle ukene i tide, får du
        bonus.
      </p>
      <Capacity g={g} stats={stats} />
      {offers.map((a) => (
        <AgreementOffer key={a.id} g={g} stats={stats} act={act} a={a} />
      ))}
      {others.map((a) => (
        <AgreementRow key={a.id} a={a} />
      ))}
      {!offers.length && !others.length && (
        <p className="g-muted">
          {g.settings.pauseOffers
            ? "Du tar ikke imot nye forespørsler nå, så ingen tilbyr rammeavtaler."
            : "Ingen tilbud akkurat nå. Store kunder spør av og til – du får beskjed."}
        </p>
      )}
    </Card>
  );
}
