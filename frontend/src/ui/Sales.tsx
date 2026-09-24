import { GRADES, PRODUCTS } from "../game/data";
import { acceptContract, currentOrder, declineContract, orderQueue, recipeEstimate, sellLot, spotPrice } from "../game/engine";
import { moveInQueue } from "../game/actions";
import { day, gradeFailures, hasPlanner, nearLimit, satisfiedGrades, type PlantStats } from "../game/plant";
import type { Contract, GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
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
  const est = recipeEstimate(g, c.grade, stats);
  const recipeOk = est.grades.includes(c.grade);
  const failures = recipeOk ? [] : gradeFailures(est.analysis, c.grade);
  const needDays = stats.dailyProductT > 0 ? (committed + c.tonnes) / stats.dailyProductT : Infinity;
  const days = daysLeft(g, c);
  const tight = needDays > days;
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
              ? `Ca. ${fmtNum(Math.max(0.1, needDays), 1)} døgns produksjon med det du har fra før`
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

export function Sales({ g, stats, act }: Props) {
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  const active = orderQueue(g);
  const current = currentOrder(g);
  const closed = g.contracts
    .filter((c) => c.status === "fullfort" || c.status === "misligholdt")
    .slice(-6)
    .reverse();
  const committed = active.reduce((a, c) => a + c.tonnes - c.delivered, 0);

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <Card title={`Forespørsler (${offers.length})`}>
          {offers.length === 0 && <p className="g-muted">Ingen forespørsler akkurat nå. Nye kommer i løpet av døgnet.</p>}
          {offers.map((c) => (
            <OfferCard key={c.id} g={g} stats={stats} act={act} c={c} committed={committed} />
          ))}
        </Card>

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
            const producing = current?.id === c.id;
            return (
              <div className={`g-contract${producing ? " is-producing" : ""}`} key={c.id}>
                <div className="g-contract-head">
                  <strong>
                    {i + 1}. {c.customer}
                  </strong>
                  <span className={left <= 1 ? "g-badge-bad" : "g-muted"}>
                    {left <= 0 ? "Frist i dag" : `${left} døgn igjen`}
                  </span>
                </div>
                {producing && <span className="g-badge-ok">Produseres nå</span>}
                <p>
                  {PRODUCTS[c.product].name}, {GRADES[c.grade].name} · {fmtKr(c.pricePerT)}/t
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
            {g.lots.map((l) => (
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
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.autoSpot}
              onChange={(e) => act((gg) => void (gg.settings.autoSpot = e.target.checked))}
            />
            <span>Selg automatisk på spot: 2. sortering straks, og partier ingen kontrakt venter på etter ett døgn</span>
          </label>
        </Card>
      </div>
    </div>
  );
}
