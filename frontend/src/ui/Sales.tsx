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
  assessOffer,
  avgRating,
  recipeEstimate,
  sellLot,
  spotPrice,
} from "../game/engine";
import { moveInQueue, toggleOfferGrade } from "../game/actions";
import { scrapResearchHint } from "../game/recipe";
import { day, gradeRecipe, hasPlanner, nearLimit, satisfiedGrades, type PlantStats } from "../game/plant";
import type { Contract, GameState, Settings } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Agreements } from "./Agreements";
import { DirectorSwitch } from "./Konsern";
import { AutoLocked, AutoToggle } from "./AutoToggle";
import { auto, automationUnlocked } from "../game/research";
import { AnalysisLine, Bar, Card, GradeChips, GradeSpec, SubTabs } from "./common";
import { StatusBadge } from "./ds";
import { Icon, type IconName } from "./icons";
import { fmtKr, fmtNum, fmtT } from "./format";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

function daysLeft(g: GameState, c: Contract): number {
  return c.deadlineDay - day(g) + 1;
}

type Tone = "ok" | "warn" | "bad";

/** Vurderingen av en forespørsel (B-117): samme som salgsdirektøren bruker – resept, ordrekø og avtaler før fristen */
function offerChecks(g: GameState, stats: PlantStats, c: Contract, committed: number) {
  const { canMake, recipeOk, failures, missingResearch, graderFix, needDays, days, tight, narrow, doneDay } =
    assessOffer(g, stats, c, committed);
  const est = recipeEstimate(g, c.grade, stats, gradeRecipe(g, c.grade));
  const hasKlasser = g.workers.some((w) => w.role === "klasser");
  const following = auto(g, "followQueue");
  const checks: { tone: Tone; text: string }[] = [];
  if (!canMake) checks.push({ tone: "bad", text: `Du lager ikke ${PRODUCTS[c.product].name.toLowerCase()}` });
  if (canMake) {
    if (recipeOk) {
      checks.push(
        nearLimit(est.analysis, c.grade) && stats.lab < 2
          ? {
              tone: "warn",
              text: "Resepten ligger nær grensen. Uten full analyse kan et dårlig skrapparti gi reklamasjon.",
            }
          : { tone: "ok", text: "Resepten holder kravet" },
      );
    } else if (missingResearch) {
      checks.push({ tone: "bad", text: scrapResearchHint(g, c.grade, missingResearch) });
    } else if (graderFix) {
      // Skrapklasseren legger om resepten når ordren skal lages (B-099)
      checks.push({
        tone: following ? "ok" : "warn",
        text: following
          ? `Resepten din gir ${failures.join(", ")} nå, men skrapklasseren legger den om når ordren skal lages, så den holder kravet.`
          : `Resepten gir ${failures.join(", ")}. Skrapklasseren kan legge den om hvis ovnen følger ordrekøen (Verket) – ellers juster den selv under Verket → Resept.`,
      });
    } else {
      checks.push({
        tone: "bad",
        text: `Resepten gir ${failures.join(", ")}. ${
          hasKlasser
            ? "Heller ikke skrapklasseren finner en blanding av skrapet du har tilgang til som holder."
            : "Juster den under Verket → Resept – eller ansett en skrapklasser som legger den om for deg."
        }`,
      });
    }
    checks.push({
      tone: tight ? "bad" : narrow ? "warn" : "ok",
      text: Number.isFinite(needDays)
        ? tight
          ? `Rekker det neppe: med ordrekøen du har, blir den ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}`
          : narrow
            ? `Knapt: blir ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}. En stans eller fravær kan gjøre den for sen.`
            : `Blir ferdig ca. dag ${doneDay} med ordrekøen du har (frist dag ${c.deadlineDay})`
        : "Verket står – ingen produksjon nå",
    });
  }
  const tone: Tone = checks.some((ch) => ch.tone === "bad")
    ? "bad"
    : checks.some((ch) => ch.tone === "warn")
      ? "warn"
      : "ok";
  return { checks, tone, days };
}

/** Samlet vurdering med ikon + ord (UI.md 6.2), brukt i lista over forespørsler på PC */
const VERDICT: Record<Tone, { label: string; icon: IconName; cls: string }> = {
  ok: { label: "Rekker det", icon: "ok", cls: "is-ok" },
  warn: { label: "Usikkert", icon: "warning", cls: "is-heat" },
  bad: { label: "Rekker det ikke", icon: "error", cls: "is-critical" },
};

function Verdict({ tone }: { tone: Tone }) {
  const v = VERDICT[tone];
  return (
    <span className={`ds-status-line ${v.cls}`}>
      <Icon name={v.icon} />
      <span>{v.label}</span>
    </span>
  );
}

function answerHours(g: GameState, c: Contract) {
  return Math.max(0, (c.offerExpiresMin - g.minute) / 60);
}

function answerText(hours: number) {
  return hours < 1 ? "under en time" : `${Math.floor(hours)} timer`;
}

function OfferCard({ g, stats, c, act, committed }: Props & { c: Contract; committed: number }) {
  const { checks, days } = offerChecks(g, stats, c, committed);
  const hours = answerHours(g, c);
  return (
    <div className="g-contract g-offer">
      <div className="g-contract-head">
        <strong className="g-offer-customer">{c.customer}</strong>
        <span className="g-contract-value">{fmtKr(c.tonnes * c.pricePerT)}</span>
      </div>
      <p className="g-offer-meta">
        {fmtT(c.tonnes)} {PRODUCTS[c.product].name.toLowerCase()} i kvalitet <strong>{GRADES[c.grade].name}</strong> ·{" "}
        {fmtKr(c.pricePerT)}/t · leveres innen {days} døgn
      </p>
      <p className={`g-answer-by${hours <= 3 ? " is-urgent" : ""}`}>
        <Icon name="clock" />
        Svar innen {answerText(hours)} – ellers går kunden videre
      </p>
      <ul className="g-checks">
        {checks.map((ch) => (
          <li key={ch.text} className={ch.tone}>
            {ch.text}
          </li>
        ))}
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
      <div className="g-row g-offer-actions">
        <button className="g-primary" onClick={() => act((gg) => acceptContract(gg, c.id))}>
          Signer
        </button>
        <button onClick={() => act((gg) => declineContract(gg, c.id))}>Avslå</button>
      </div>
    </div>
  );
}

/** PC (B-198): forespørslene som liste til venstre, den valgte med vurdering og knapper til høyre */
function OfferMasterDetail({ g, stats, act, offers, committed }: Props & { offers: Contract[]; committed: number }) {
  const [sel, setSel] = useState<number | null>(null);
  const selected = offers.find((c) => c.id === sel) ?? offers[0];
  if (!selected) return null;
  return (
    <div className="g-offers-md">
      <ul className="g-offer-list" aria-label="Forespørsler">
        {offers.map((c) => {
          const { tone, days } = offerChecks(g, stats, c, committed);
          const hours = answerHours(g, c);
          return (
            <li key={c.id}>
              <button
                className={`g-offer-row${c.id === selected.id ? " is-selected" : ""}`}
                aria-pressed={c.id === selected.id}
                onClick={() => setSel(c.id)}
              >
                <span className="g-offer-row-head">
                  <strong>{c.customer}</strong>
                  <span className="g-contract-value">{fmtKr(c.tonnes * c.pricePerT)}</span>
                </span>
                <span className="g-offer-row-meta">
                  {fmtT(c.tonnes)} · {GRADES[c.grade].name} · {days} døgn
                </span>
                <span className="g-offer-row-foot">
                  <Verdict tone={tone} />
                  <span className={`g-answer-by${hours <= 3 ? " is-urgent" : ""}`}>
                    <Icon name="clock" />
                    {answerText(hours)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <OfferCard g={g} stats={stats} act={act} c={selected} committed={committed} />
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
  // Fanen viser antall aktive avtaler; nye tilbud får et eget merke (B-081)
  const agreementsActive = g.agreements.filter((a) => a.status === "aktiv").length;
  const tabs: { id: SalesTab; label: string; count?: number; badge?: string }[] = [
    { id: "tilbud", label: "Forespørsler", count: offers.length },
    { id: "ko", label: "Ordrekø", count: active.length },
    { id: "lager", label: "Lager" },
    ...(showAgreements
      ? [
          {
            id: "avtaler" as const,
            label: "Avtaler",
            count: agreementsActive,
            badge: agreementOffers ? (agreementOffers === 1 ? "Ny" : `${agreementOffers} nye`) : undefined,
          },
        ]
      : []),
  ];

  return (
    <div className={`g-grid g-sales is-${tab}`}>
      <div className="g-col-wide">
        <SubTabs tabs={tabs} value={tab} onChange={setTab} label="Salg" />

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
            <DirectorSwitch g={g} act={act} />
            {offers.length === 0 && (
              <p className="g-muted">
                {g.settings.pauseOffers
                  ? "Du tar ikke imot nye forespørsler nå."
                  : "Ingen forespørsler akkurat nå. Nye kommer i løpet av døgnet."}
              </p>
            )}
            <div className="g-offers-cards">
              {offers.map((c) => (
                <OfferCard key={c.id} g={g} stats={stats} act={act} c={c} committed={committed} />
              ))}
            </div>
            <OfferMasterDetail g={g} stats={stats} act={act} offers={offers} committed={committed} />
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
                    {left <= 1 ? (
                      <span className="ds-status is-heat">
                        <Icon name="clock" />
                        {left <= 0 ? "Frist i dag" : "1 døgn igjen"}
                      </span>
                    ) : (
                      <span className="g-muted">{left} døgn igjen</span>
                    )}
                  </div>
                  {ovens && (
                    <StatusBadge
                      status="kjorer"
                      label={`Produseres nå${
                        g.furnaces.length > 1 && ovens.length < g.furnaces.length ? ` i ovn ${ovens.join(" og ")}` : ""
                      }`}
                    />
                  )}
                  <p>
                    {PRODUCTS[c.product].name}, {GRADES[c.grade].name} · {fmtKr(c.pricePerT)}/t
                    {c.agreementId ? " · rammeavtale" : ""}
                  </p>
                  <Bar value={c.delivered / c.tonnes} tone="ok" label="Levert" />
                  <div className="g-contract-head g-queue-foot">
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
                          <Icon name="chevron-up" />
                        </button>
                        <button
                          className="g-small"
                          aria-label={`Flytt ${c.customer} ned`}
                          disabled={i === active.length - 1}
                          onClick={() => act((gg) => moveInQueue(gg, c.id, 1))}
                        >
                          <Icon name="chevron-down" />
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
                <RatingSummary g={g} />
                <ul className="g-closed">
                  {closed.map((c) => (
                    <li key={c.id} className={c.status === "fullfort" && (c.rating ?? 10) >= 5 ? "ok" : "bad"}>
                      {c.customer}: {fmtT(c.tonnes)} {GRADES[c.grade].name.toLowerCase()} –{" "}
                      {c.status === "fullfort" ? "levert" : "ikke levert i tide"}
                      {c.rating !== undefined && (
                        <>
                          {" "}
                          · <strong>{c.rating}/10</strong>
                          {c.ratingNote && <span className="g-muted"> ({c.ratingNote})</span>}
                        </>
                      )}
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

/** Kundevurderingen (B-161): snittet av de siste leveransene og hva som gir høyere karakter */
function RatingSummary({ g }: { g: GameState }) {
  const avg = avgRating(g);
  if (avg === null) return null;
  return (
    <p className="g-rating">
      Kundene gir deg <strong>{fmtNum(Math.floor(avg * 10) / 10, 1)} av 10</strong> i snitt ({g.ratings.length}{" "}
      {g.ratings.length === 1 ? "leveranse" : "siste leveranser"}).{" "}
      <span className="g-muted">
        Karakteren blir høyere når du leverer i god tid før fristen, og når stålet har god margin til kravene. Høy
        karakter gir mer omdømme.
      </span>
    </p>
  );
}
