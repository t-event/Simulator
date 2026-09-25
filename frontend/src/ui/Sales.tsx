import { useState } from "react";
import { GRADE_IDS, GRADES, PRODUCTS } from "../game/data";
import {
  acceptContract,
  cancelContract,
  cancelPenalty,
  AGREEMENT_STAGE,
  furnaceOrder,
  declineContract,
  orderQueue,
  agreementLoadUntil,
  CONTRACT_MARGIN,
  realisticDailyT,
  recipeEstimate,
  sellLot,
  spotPrice,
} from "../game/engine";
import { moveInQueue, toggleOfferGrade } from "../game/actions";
import {
  day,
  gradeFailures,
  gradeRecipe,
  hasPlanner,
  nearLimit,
  satisfiedGrades,
  type PlantStats,
} from "../game/plant";
import type { Contract, GameState, Settings } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Agreements } from "./Agreements";
import { AutoLocked, AutoToggle } from "./AutoToggle";
import { auto, automationUnlocked } from "../game/research";
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
  // Ukeleveranser fra rammeavtalene som kommer før fristen, tar også plass i køen (B-062)
  const needDays = perDay > 0 ? (committed + agreementLoadUntil(g, c.deadlineDay) + c.tonnes) / perDay : Infinity;
  const days = daysLeft(g, c);
  const tight = needDays > days;
  // Lite slingringsmonn: en omforing, fravær eller støpefeil kan gjøre den for sen (B-062)
  const narrow = !tight && needDays > days * CONTRACT_MARGIN;
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
          <li className={tight ? "bad" : narrow ? "warn" : "ok"}>
            {Number.isFinite(needDays)
              ? tight
                ? `Rekker det neppe: med ordrekøen du har, blir den ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}`
                : narrow
                  ? `Knapt: blir ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}. En stans eller fravær kan gjøre den for sen.`
                  : `Blir ferdig ca. dag ${doneDay} med ordrekøen du har (frist dag ${c.deadlineDay})`
              : "Verket står – ingen produksjon nå"}
          </li>
        )}
      </ul>
      <details className="g-details">
        <summary>Krav til stålet, omdømme og bot</summary>
        <p>
          <GradeSpec id={c.grade} />
        </p>
        <p className="g-muted">
          Omdømme +{fmtNum(c.repGain, 1)} ved levering, −{fmtNum(c.repLoss, 1)} og bot {fmtKr(c.penaltyPerT)}/t hvis for
          sent.
        </p>
      </details>
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

type SalesTab = "tilbud" | "ko" | "lager" | "avtaler";

export function Sales({ g, stats, act, openTab }: Props & { openTab?: string }) {
  const [showAll, setShowAll] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [tab, setTab] = useState<SalesTab>(() =>
    openTab && ["tilbud", "ko", "lager", "avtaler"].includes(openTab)
      ? (openTab as SalesTab)
      : g.contracts.some((c) => c.status === "tilbud") || !g.contracts.some((c) => c.status === "aktiv")
        ? "tilbud"
        : "ko",
  );
  const sort = g.settings.offerSort;
  const offers = g.contracts
    .filter((c) => c.status === "tilbud")
    .sort((a, b) =>
      sort === "verdi"
        ? b.tonnes * b.pricePerT - a.tonnes * a.pricePerT
        : sort === "pris"
          ? b.pricePerT - a.pricePerT
          : sort === "kvalitet"
            ? GRADE_IDS.indexOf(a.grade) - GRADE_IDS.indexOf(b.grade) || a.offerExpiresMin - b.offerExpiresMin
            : a.offerExpiresMin - b.offerExpiresMin,
    );
  // Kvalitetene som finnes på dette nivået; bare disse kan velges (B-042)
  const openGrades = GRADE_IDS.filter((id) => GRADES[id].minStage <= g.stage);
  const wanted = g.settings.offerGrades;
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
  // Underfaner, så siden ikke blir en lang rull (B-044). Rammeavtaler vises først når de er låst opp.
  const showAgreements = g.stage >= AGREEMENT_STAGE || g.agreements.length > 0;
  const agreementOffers = g.agreements.filter((a) => a.status === "tilbud").length;
  const tabs: { id: SalesTab; label: string }[] = [
    { id: "tilbud", label: `Forespørsler${offers.length ? ` (${offers.length})` : ""}` },
    { id: "ko", label: `Ordrekø${active.length ? ` (${active.length})` : ""}` },
    { id: "lager", label: "Lager" },
    ...(showAgreements
      ? [{ id: "avtaler" as const, label: `Avtaler${agreementOffers ? ` (${agreementOffers} nye)` : ""}` }]
      : []),
  ];

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <div className="g-subtabs" role="tablist" aria-label="Salg">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "tilbud" && (
          <Card title={`Forespørsler (${offers.length})`}>
            <label className="g-toggle">
              <input
                type="checkbox"
                checked={!g.settings.pauseOffers}
                onChange={(e) => act((gg) => void (gg.settings.pauseOffers = !e.target.checked))}
              />
              <span>Ta imot nye forespørsler</span>
            </label>
            {!g.settings.pauseOffers && (openGrades.length > 1 || offers.length > 1) && (
              <details className="g-details">
                <summary>Velg kvaliteter og rekkefølge</summary>
                {openGrades.length > 1 && !g.settings.pauseOffers && (
                  <div className="g-offer-filter">
                    <span className="g-muted">Kvaliteter du vil ha forespørsler på:</span>
                    <div className="g-chip-row">
                      {openGrades.map((id) => {
                        const on = !wanted.length || wanted.includes(id);
                        return (
                          <button
                            key={id}
                            className={`g-chip-btn${on ? " is-on" : ""}`}
                            aria-pressed={on}
                            onClick={() => act((gg) => toggleOfferGrade(gg, id, openGrades))}
                          >
                            {on ? "✓ " : ""}
                            {GRADES[id].name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {offers.length > 1 && (
                  <label className="g-field">
                    <span>Sorter forespørslene</span>
                    <select
                      value={sort}
                      onChange={(e) =>
                        act((gg) => void (gg.settings.offerSort = e.target.value as Settings["offerSort"]))
                      }
                    >
                      <option value="frist">Kortest svarfrist først</option>
                      <option value="verdi">Mest verdt først</option>
                      <option value="pris">Best pris per tonn først</option>
                      <option value="kvalitet">Etter kvalitet</option>
                    </select>
                  </label>
                )}
              </details>
            )}
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
        )}

        {tab === "avtaler" && <Agreements g={g} stats={stats} act={act} />}

        {tab === "ko" && (
          <Card title={`Ordrekø (${active.length})`}>
            {active.length === 0 && <p className="g-muted">Ingen aktive kontrakter.</p>}
            {active.length > 1 && (
              <p className="g-muted">
                Øverste kontrakt leveres og produseres først. Flytt med pilene.
                {hasPlanner(g) && auto(g, "plannerSorts") && " Planleggeren sorterer køen etter frist."}
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
                  {confirmCancel === c.id ? (
                    <div className="g-note g-warn">
                      Avbryte ordren? Det koster {fmtKr(cancelPenalty(c).bot)} i bot og{" "}
                      {fmtNum(cancelPenalty(c).rep, 1)} i omdømme. Det er billigere enn å bomme på fristen, men kunden
                      blir skuffet.
                      <div className="g-row">
                        <button
                          className="g-danger g-small"
                          onClick={() => {
                            act((gg) => cancelContract(gg, c.id));
                            setConfirmCancel(null);
                          }}
                        >
                          Ja, avbryt ordren
                        </button>
                        <button className="g-small" onClick={() => setConfirmCancel(null)}>
                          Nei
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="g-link g-cancel-order" onClick={() => setConfirmCancel(c.id)}>
                      Avbryt ordren…
                    </button>
                  )}
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
        )}

        {tab === "lager" && (
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
            <details className="g-details">
              <summary>Støpefeil og automatisk salg</summary>
              {automationUnlocked(g, "secondsAction") ? (
                <label className="g-field">
                  <span>Støpefeil (2. sortering)</span>
                  <select
                    value={g.settings.secondsAction}
                    onChange={(e) =>
                      act(
                        (gg) =>
                          void (gg.settings.secondsAction = e.target.value as GameState["settings"]["secondsAction"]),
                      )
                    }
                  >
                    <option value="spot">Selg automatisk på spot</option>
                    <option value="retur">Smelt om som returskrap</option>
                    <option value="behold">Behold på lager</option>
                  </select>
                </label>
              ) : (
                <AutoLocked k="secondsAction" label="Automatisk salg eller omsmelting av støpefeil" />
              )}
              <p className="g-muted g-small-text">
                Støpefeil kan ikke leveres på kontrakt. Omsmelting gir returskrap med kjent analyse – gratis skrap til
                neste charge, men det koster strøm og tar plass på skraplageret.
              </p>
              <AutoToggle
                g={g}
                act={act}
                k="autoSpot"
                label="Selg automatisk på spot partier ingen kontrakt venter på, etter ett døgn"
              />
            </details>
          </Card>
        )}
      </div>
    </div>
  );
}
