import { useState } from "react";
import { GRADES, PRODUCTS } from "../game/data";
import {
  acceptContract,
  furnaceOrder,
  declineContract,
  orderQueue,
  realisticDailyT,
  recipeEstimate,
  sellLot,
  spotPrice,
} from "../game/engine";
import { moveInQueue } from "../game/actions";
import { day, gradeFailures, gradeRecipe, hasPlanner, nearLimit, satisfiedGrades, type PlantStats } from "../game/plant";
import type { Contract, GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Agreements } from "./Agreements";
import { AnalysisLine, Bar, Card, GradeChips, GradeSpec } from "./common";
import { fmtKr, fmtNum, fmtT } from "./format";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

function daysLeft(g: GameState, c: Contract): number {
  return c.deadlineDay - day(g) + 1;
}

function OfferCard({ g, stats, c, act, committed }: Props & { c: Contract; committed: number }) {
  const canMake = stats.products.includes(c.product);
  const est = recipeEstimate(g, c.grade, stats, gradeRecipe(g, c.grade));
  const recipeOk = est.grades.includes(c.grade);
  const failures = recipeOk ? [] : gradeFailures(est.analysis, c.grade);
  // Anslaget bygger på det verket faktisk har laget de siste døgnene, med ordrekøen du alt har (B-034)
  const perDay = stats.dailyProductT > 0 ? realisticDailyT(g, stats) : 0;
  const needDays = perDay > 0 ? (committed + c.tonnes) / perDay : Infinity;
  const days = daysLeft(g, c);
  const tight = needDays > days;
  const doneDay = day(g) + Math.ceil(needDays) - 1;
  const answerHours = Math.max(0, (c.offerExpiresMin - g.minute) / 60);
  return (
    <div className="g-contract">
      <div className="g-contract-head">
        <strong>{c.customer}</strong>
        <span className="g-contract-value">{fmtKr(c.tonnes * c.pricePerT)}</span>
      </div>
      <p className={`g-answer-by${answerHours <= 3 ? " is-urgent" : ""}`}>
        Svar innen {answerHours < 1 ? "under en time" : `${Math.floor(answerHours)} timer`} – ellers går kunden videre
      </p>
      <p>
        {fmtT(c.tonnes)} {PRODUCTS[c.product].name.toLowerCase()} i kvalitet <strong>{GRADES[c.grade].name}</strong> ·{" "}
        {fmtKr(c.pricePerT)}/t · leveres innen {days} døgn
      </p>
      <p>
        <GradeSpec id={c.grade} />
      </p>
      <ul className="g-checks">
        {!canMake && <li className="bad">Du lager ikke {PRODUCTS[c.product].name.toLowerCase()}</li>}
        {canMake &&
          (recipeOk ? (
            nearLimit(est.analysis, c.grade) && stats.lab < 2 ? (
              <li className="warn">
                Resepten ligger nær grensen. Uten full analyse kan et dårlig skrapparti gi reklamasjon.
              </li>
            ) : (
              <li className="ok">Resepten holder kravet</li>
            )
          ) : (
            <li className="bad">Resepten gir {failures.join(", ")}</li>
          ))}
        {canMake && (
          <li className={tight ? "bad" : "ok"}>
            {Number.isFinite(needDays)
              ? tight
                ? `Rekker det neppe: med ordrekøen du har, blir den ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}`
                : `Blir ferdig ca. dag ${doneDay} med ordrekøen du har (frist dag ${c.deadlineDay})`
              : "Verket står – ingen produksjon nå"}
          </li>
        )}
        <li className="g-muted">
          Omdømme +{fmtNum(c.repGain, 1)} ved levering, −{fmtNum(c.repLoss, 1)} og bot {fmtKr(c.penaltyPerT)}/t hvis for
          sent
        </li>
      </ul>
      <div className="g-row">
        <button className="g-primary" onClick={() => act((gg) => acceptContract(gg, c.id))}>
          Signer
        </button>
        <button onClick={() => act((gg) => declineContract(gg, c.id))}>Avslå</button>
      </div>
    </div>
  );
}

/** Så mange partier vises før «Vis alle» (lista kan bli svært lang i et stort verk) */
const LOTS_SHOWN = 6;

export function Sales({ g, stats, act }: Props) {
  const [showAll, setShowAll] = useState(false);
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  const active = orderQueue(g);
  // Hvilken ovn som lager hvilken kontrakt; med to kvaliteter kan to kontrakter produseres samtidig (B-039)
  const producing = new Map<number, number[]>();
  g.furnaces.forEach((_, i) => {
    const c = furnaceOrder(g, i);
    if (c) producing.set(c.id, [...(producing.get(c.id) ?? []), i + 1]);
  });
  const closed = g.contracts
    .filter((c) => c.status === "fullfort" || c.status === "misligholdt")
    .slice(-6)
    .reverse();
  const committed = active.reduce((a, c) => a + c.tonnes - c.delivered, 0);

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <Card title={`Forespørsler (${offers.length})`}>
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={!g.settings.pauseOffers}
              onChange={(e) => act((gg) => void (gg.settings.pauseOffers = !e.target.checked))}
            />
            <span>Ta imot nye forespørsler</span>
          </label>
          {offers.length === 0 && (
            <p className="g-muted">
              {g.settings.pauseOffers
                ? "Du tar ikke imot nye forespørsler nå."
                : "Ingen forespørsler akkurat nå. Nye kommer i løpet av døgnet."}
            </p>
          )}
          {offers.map((c) => (
            <OfferCard key={c.id} g={g} stats={stats} act={act} c={c} committed={committed} />
          ))}
        </Card>

        <Agreements g={g} stats={stats} act={act} />

        <Card title={`Ordrekø (${active.length})`}>
          {active.length === 0 && <p className="g-muted">Ingen aktive kontrakter.</p>}
          {active.length > 1 && (
            <p className="g-muted">
              Øverste kontrakt leveres og produseres først. Flytt med pilene.
              {hasPlanner(g) && g.settings.plannerSorts && " Planleggeren sorterer køen etter frist."}
            </p>
          )}
          {active.map((c, i) => {
            const left = daysLeft(g, c);
            const ovens = producing.get(c.id);
            return (
              <div className={`g-contract${ovens ? " is-producing" : ""}`} key={c.id}>
                <div className="g-contract-head">
                  <strong>
                    {i + 1}. {c.customer}
                  </strong>
                  <span className={left <= 1 ? "g-badge-bad" : "g-muted"}>
                    {left <= 0 ? "Frist i dag" : `${left} døgn igjen`}
                  </span>
                </div>
                {ovens && (
                  <span className="g-badge-ok">
                    Produseres nå
                    {g.furnaces.length > 1 && ovens.length < g.furnaces.length ? ` i ovn ${ovens.join(" og ")}` : ""}
                  </span>
                )}
                <p>
                  {PRODUCTS[c.product].name}, {GRADES[c.grade].name} · {fmtKr(c.pricePerT)}/t
                  {c.agreementId ? " · rammeavtale" : ""}
                </p>
                <Bar value={c.delivered / c.tonnes} tone="ok" label="Levert" />
                <div className="g-contract-head">
                  <span className="g-muted">
                    Levert {fmtT(c.delivered)} av {fmtT(c.tonnes)}
                  </span>
                  {active.length > 1 && (
                    <span className="g-row g-queue-btns">
                      <button
                        className="g-small"
                        aria-label={`Flytt ${c.customer} opp`}
                        disabled={i === 0}
                        onClick={() => act((gg) => moveInQueue(gg, c.id, -1))}
                      >
                        ▲
                      </button>
                      <button
                        className="g-small"
                        aria-label={`Flytt ${c.customer} ned`}
                        disabled={i === active.length - 1}
                        onClick={() => act((gg) => moveInQueue(gg, c.id, 1))}
                      >
                        ▼
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {closed.length > 0 && (
            <>
              <h3 className="g-subhead">Nylig avsluttet</h3>
              <ul className="g-closed">
                {closed.map((c) => (
                  <li key={c.id} className={c.status === "fullfort" ? "ok" : "bad"}>
                    {c.customer}: {fmtT(c.tonnes)} {GRADES[c.grade].name.toLowerCase()} –{" "}
                    {c.status === "fullfort" ? "levert" : "ikke levert i tide"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="g-col">
        <Card
          title="Ferdigvarelager"
          right={
            <span className="g-muted">
              {fmtT(stats.storeUsed)} / {fmtT(stats.storeT)}
            </span>
          }
        >
          <Bar
            value={stats.storeUsed / stats.storeT}
            tone={stats.storeUsed > stats.storeT * 0.9 ? "critical" : "accent"}
            label="Ferdigvarelager"
          />
          <p className="g-muted">
            {stats.lab === 2
              ? "Spektrometeret måler hele analysen."
              : stats.lab === 1
                ? "Analysatoren måler sporelementer. Karbon og fosfor (≈) er anslått ut fra resepten."
                : "Uten analyse er alt (≈) anslått ut fra resepten. Avvik oppdages først hos kunden."}{" "}
            Partier som holder kravet, leveres automatisk til aktive kontrakter.
          </p>
          {g.lots.length === 0 && <p className="g-muted">Lageret er tomt.</p>}
          <ul className="g-lots">
            {(showAll ? g.lots : [...g.lots].sort((a, b) => b.t - a.t).slice(0, LOTS_SHOWN)).map((l) => (
              <li key={l.id} className={l.second ? "is-second" : ""}>
                <div className="g-contract-head">
                  <strong>
                    {fmtT(l.t)} {PRODUCTS[l.product].name.toLowerCase()}
                  </strong>
                  {l.second && <span className="g-badge-bad">Støpefeil</span>}
                </div>
                <AnalysisLine a={l.known} measured={l.measured} />
                <div>
                  {l.second ? (
                    <span className="g-muted">2. sortering</span>
                  ) : (
                    <GradeChips grades={satisfiedGrades(l.known)} />
                  )}
                </div>
                <button className="g-small" onClick={() => act((gg) => sellLot(gg, l.id))}>
                  Selg på spot ({fmtKr(spotPrice(g, l.product, l.second))}/t)
                </button>
              </li>
            ))}
          </ul>
          {g.lots.length > LOTS_SHOWN && (
            <button className="g-link" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Vis bare de største partiene" : `Vis alle ${g.lots.length} partiene`}
            </button>
          )}
          <label className="g-field">
            <span>Støpefeil (2. sortering)</span>
            <select
              value={g.settings.secondsAction}
              onChange={(e) =>
                act((gg) => void (gg.settings.secondsAction = e.target.value as GameState["settings"]["secondsAction"]))
              }
            >
              <option value="spot">Selg automatisk på spot</option>
              <option value="retur">Smelt om som returskrap</option>
              <option value="behold">Behold på lager</option>
            </select>
          </label>
          <p className="g-muted g-small-text">
            Støpefeil kan ikke leveres på kontrakt. Omsmelting gir returskrap med kjent analyse – gratis skrap til neste
            charge, men det koster strøm og tar plass på skraplageret.
          </p>
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.autoSpot}
              onChange={(e) => act((gg) => void (gg.settings.autoSpot = e.target.checked))}
            />
            <span>Selg automatisk på spot partier ingen kontrakt venter på, etter ett døgn</span>
          </label>
        </Card>
      </div>
    </div>
  );
}
