import { useState } from "react";
import { useReportTab, type OnTab } from "./tabMemory";
import { GRADE_IDS, GRADES, PRODUCTS } from "../game/data";
import {
  acceptContract,
  cancelContract,
  cancelPenalty,
  AGREEMENT_STAGE,
  furnaceOrder,
  declineContract,
  lateContracts,
  plantStopped,
  lotReservations,
  orderQueue,
  assessOffer,
  avgRating,
  plannerSortsQueue,
  realisticDailyT,
  recipeEstimate,
  sellLot,
  sellAllFree,
  freeStockT,
  spotPrice,
} from "../game/engine";
import { moveInQueue, toggleOfferGrade } from "../game/actions";
import { scrapResearchHint } from "../game/recipe";
import {
  day,
  gradeRecipe,
  MARKET_SATURATION,
  marketSaturation,
  nearLimit,
  satisfiedGrades,
  type PlantStats,
} from "../game/plant";
import type { Contract, GameState, Settings } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Agreements } from "./Agreements";
import { TrendNote } from "./Trend";
import { DirectorOffer, DirectorSwitch } from "./Konsern";
import { AutoLocked, AutoToggle } from "./AutoToggle";
import { auto, automationUnlocked } from "../game/research";
import { ANALYSIS_KEY, AnalysisLine, Bar, Card, GradeChips, GradeSpec, SubTabs } from "./common";
import { Callout, StatusBadge } from "./ds";
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
  const {
    canMake,
    recipeOk,
    failures,
    missingResearch,
    graderFix,
    needDays,
    days,
    tight,
    narrow,
    doneDay,
    pushesLate,
  } = assessOffer(g, stats, c, committed);
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
        ? c.landmark
          ? `Ingen frist – landemerket står først i ordrekøen og blir ferdig ca. dag ${doneDay}`
          : tight && pushesLate && needDays <= days
            ? `Rekker det neppe: den har kortere frist og går foran ${pushesLate} i ordrekøen, som da blir for sen`
            : tight
              ? `Rekker det neppe: med ordrekøen du har, blir den ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}`
              : narrow
                ? `Knapt: blir ferdig ca. dag ${doneDay}, fristen er dag ${c.deadlineDay}. En stans eller fravær kan gjøre den for sen.`
                : `Blir ferdig ca. dag ${doneDay} med ordrekøen du har (frist dag ${c.deadlineDay})`
        : plantStopped(g)
          ? `Verket står: ${plantStopped(g)}. Det lager ingenting før det er ordnet.`
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
  return hours < 1 ? "under en time" : hours < 2 ? "1 time" : `${Math.floor(hours)} timer`;
}

/** Det viktigste med en forespørsel først (B-241): hvem, hvor mye og om verket rekker det – så tallene og kravene */
function OfferCard({ g, stats, c, act, committed }: Props & { c: Contract; committed: number }) {
  const { checks, days, tone } = offerChecks(g, stats, c, committed);
  // «Signer likevel» spør først (B-461): nye spillere signerte mange kontrakter verket ikke rakk, og bøtene tok kassa
  const [confirmSign, setConfirmSign] = useState(false);
  const hours = answerHours(g, c);
  // Grunnen står rett under dommen: det som er galt eller usikkert, ellers når den blir ferdig
  const reason = tone === "ok" ? checks[checks.length - 1] : (checks.find((ch) => ch.tone === tone) ?? checks[0]);
  const others = checks.filter((ch) => ch !== reason);
  // «Rekker det neppe:» og «Knapt:» står alt i dommen over
  const reasonText = reason?.text.replace(/^(Rekker det neppe|Knapt): (.)/, (_, _p, first: string) =>
    first.toUpperCase(),
  );
  return (
    <article className={`g-contract g-offer is-${tone}`}>
      <div className="g-contract-head">
        <strong className="g-offer-customer">{c.customer}</strong>
        <span className="g-contract-value">{fmtKr(c.tonnes * c.pricePerT)}</span>
      </div>
      <p className="g-offer-what">
        {fmtT(c.tonnes)} {PRODUCTS[c.product].name.toLowerCase()} · <strong>{GRADES[c.grade].name}</strong>
        {c.trend && (
          <span className="g-offer-hot">
            <Icon name="trending-up" /> Ettertraktet
          </span>
        )}
      </p>
      <div className="g-offer-verdict">
        <Verdict tone={tone} />
        {reasonText && <span className="g-offer-reason">{reasonText}</span>}
      </div>
      <dl className="g-offer-facts">
        <div>
          <dt>Frist</dt>
          <dd>{c.landmark ? "Ingen" : `${days} døgn`}</dd>
        </div>
        <div>
          <dt>Pris</dt>
          <dd>{fmtKr(c.pricePerT)}/tonn</dd>
        </div>
        <div className={!c.landmark && hours <= 3 ? "is-urgent" : undefined}>
          <dt>Svar innen</dt>
          <dd>{c.landmark ? "Venter" : answerText(hours)}</dd>
        </div>
      </dl>
      {others.length > 0 && (
        <ul className="g-checks">
          {others.map((ch) => (
            <li key={ch.text} className={ch.tone}>
              {ch.text}
            </li>
          ))}
        </ul>
      )}
      <details className="g-details">
        <summary>{c.landmark ? "Krav til stålet og omdømme" : "Krav til stålet, omdømme og bot"}</summary>
        <p>
          <GradeSpec id={c.grade} />
        </p>
        <p className="g-muted g-small-text">{ANALYSIS_KEY}</p>
        <p className="g-muted">
          {c.landmark
            ? `Omdømme +${fmtNum(c.repGain, 1)} ved levering. Ingen frist og ingen bot.`
            : `Omdømme +${fmtNum(c.repGain, 1)} ved levering, −${fmtNum(c.repLoss, 1)} og bot ${fmtKr(c.penaltyPerT)}/tonn hvis for sent.`}
        </p>
      </details>
      {confirmSign && tone === "bad" && (
        <div className="g-note g-warn g-offer-confirm" role="alert">
          {c.landmark
            ? "Verket kan ikke lage dette nå. Signere likevel?"
            : `Blir den for sen, koster den opptil ${fmtKr(c.penaltyPerT * c.tonnes)} i bot og ${fmtNum(c.repLoss, 1)} i omdømme. Signere likevel?`}
          <div className="g-row">
            <button
              className="g-danger g-small"
              onClick={() => {
                act((gg) => acceptContract(gg, c.id));
                setConfirmSign(false);
              }}
            >
              Ja, signer
            </button>
            <button className="g-small" onClick={() => setConfirmSign(false)}>
              Nei
            </button>
          </div>
        </div>
      )}
      {/* Rekker verket det ikke, er avslag det foreslåtte valget (B-241) */}
      <div className="g-row g-offer-actions">
        <button
          className={tone === "bad" ? undefined : "g-primary"}
          onClick={() => (tone === "bad" ? setConfirmSign(true) : act((gg) => acceptContract(gg, c.id)))}
        >
          {tone === "bad" ? "Signer likevel…" : "Signer"}
        </button>
        <button
          className={tone === "bad" ? "g-primary" : undefined}
          onClick={() => act((gg) => declineContract(gg, c.id))}
        >
          Avslå
        </button>
      </div>
    </article>
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
                  {fmtT(c.tonnes)} · {GRADES[c.grade].name} · {c.landmark ? "ingen frist" : `${days} døgn`}
                </span>
                <span className="g-offer-row-foot">
                  <Verdict tone={tone} />
                  <span className={`g-answer-by${!c.landmark && hours <= 3 ? " is-urgent" : ""}`}>
                    <Icon name="clock" />
                    {c.landmark ? "venter" : answerText(hours)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <OfferCard key={selected.id} g={g} stats={stats} act={act} c={selected} committed={committed} />
    </div>
  );
}

/** Så mange partier vises før «Vis alle» (lista kan bli svært lang i et stort verk) */
const LOTS_SHOWN = 6;

type SalesTab = "tilbud" | "ko" | "lager" | "avtaler";

/** Forespørslene (B-241): innstillingene samlet øverst i én linje hver, så kortene */
/** Rekkefølgen på forespørslene, som ord (valget og oppsummeringen under «Innstillinger») */
const SORT_LABEL: Record<Settings["offerSort"], string> = {
  frist: "kortest svarfrist først",
  verdi: "mest verdt først",
  pris: "best pris per tonn først",
  kvalitet: "etter kvalitet",
};

function OffersTab({ g, stats, act }: Props) {
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
  const committed = orderQueue(g).reduce((a, c) => a + c.tonnes - c.delivered, 0);
  const verdicts = offers.map((c) => offerChecks(g, stats, c, committed).tone);
  const good = verdicts.filter((t) => t === "ok").length;
  return (
    <Card
      title="Forespørsler"
      right={
        offers.length > 0 ? (
          <span className="g-muted g-small-text">
            {good} av {offers.length} rekker du
          </span>
        ) : undefined
      }
    >
      {/* Én rad innstillinger i stedet for fem over første forespørsel (B-407): det som gjelder nå (direktøren, trend,
          metning) står synlig; ta imot, kvaliteter og rekkefølge bak «Innstillinger» */}
      <div className="g-sales-controls">
        <DirectorSwitch g={g} act={act} compact />
        <TrendNote g={g} />
        {/* Markedet metter seg (B-252): vises bare når verket lager mer enn kundene tar unna til full pris */}
        {marketSaturation(stats.dailyProductT) < 1 && (
          <p className="g-muted g-small-text">
            Verket lager {fmtT(stats.dailyProductT)} i døgnet, mer enn kundene tar unna til full pris (
            {fmtT(MARKET_SATURATION.fromT)}). Nye forespørsler er derfor{" "}
            {Math.round((1 - marketSaturation(stats.dailyProductT)) * 100)} % billigere.
          </p>
        )}
        <details className="g-details g-sales-settings">
          <summary>
            Innstillinger
            <span className={g.settings.pauseOffers ? "g-sales-paused" : "g-muted"}>
              {" "}
              ·{" "}
              {g.settings.pauseOffers
                ? "tar ikke imot nye"
                : wanted.length
                  ? `${wanted.length} av ${openGrades.length} kvaliteter`
                  : "alle kvaliteter"}
              {offers.length > 1 && ` · ${SORT_LABEL[sort]}`}
            </span>
          </summary>
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={!g.settings.pauseOffers}
              onChange={(e) => act((gg) => void (gg.settings.pauseOffers = !e.target.checked))}
            />
            <span>
              Ta imot nye forespørsler
              <small className="g-muted g-toggle-hint">Nye kommer i løpet av døgnet og står noen timer</small>
            </span>
          </label>
          {!g.settings.pauseOffers && openGrades.length > 1 && (
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
                      {on && <Icon name="check" />}
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
                onChange={(e) => act((gg) => void (gg.settings.offerSort = e.target.value as Settings["offerSort"]))}
              >
                {(Object.keys(SORT_LABEL) as Settings["offerSort"][]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABEL[k][0].toUpperCase() + SORT_LABEL[k].slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </details>
      </div>
      <DirectorOffer g={g} act={act} />
      {offers.length === 0 && (
        <p className="g-empty">
          <Icon name="clock" />
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
  );
}

/**
 * Ordrekøen (B-241): øverst om alt rekker fristen, så én kompakt rad per kontrakt. Pilene vises bare når du styrer
 * køen selv – planleggeren sorterer den etter frist hver time, så de gjorde ingenting. Avbryt ligger bak «Mer».
 */
function QueueTab({ g, stats, act }: Props) {
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const active = orderQueue(g);
  const late = new Set(lateContracts(g, stats).map((c) => c.id));
  const sorting = plannerSortsQueue(g);
  const left = active.reduce((a, c) => a + c.tonnes - c.delivered, 0);
  const perDay = realisticDailyT(g, stats);
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
  return (
    <Card title="Ordrekø" right={<span className="g-muted g-small-text">{active.length} kontrakter</span>}>
      {active.length === 0 ? (
        <p className="g-empty">
          <Icon name="package" />
          Ingen kontrakter i køen. Signer en forespørsel, så begynner verket å lage den.
        </p>
      ) : (
        <div className={`g-queue-summary${late.size ? " is-late" : ""}`}>
          {late.size ? (
            <StatusBadge
              status="feil"
              label={`${late.size} ${late.size === 1 ? "kontrakt rekker" : "kontrakter rekker"} ikke fristen`}
            />
          ) : (
            <span className="ds-status is-ok">
              <Icon name="ok" />
              Alt rekker fristen
            </span>
          )}
          <span className="g-muted g-small-text">
            {fmtT(left)} igjen{perDay > 0 ? ` · ca. ${fmtNum(Math.max(0.1, left / perDay), 1)} døgns produksjon` : ""}
            {" · "}
            {sorting ? "planleggeren sorterer etter frist" : "øverst lages først"}
          </span>
        </div>
      )}
      <ol className="g-queue">
        {active.map((c, i) => {
          const days = daysLeft(g, c);
          const ovens = producing.get(c.id);
          const isLate = late.has(c.id);
          return (
            <li key={c.id} className={`g-queue-item${ovens ? " is-producing" : ""}${isLate ? " is-late" : ""}`}>
              <span className="g-queue-pos" aria-hidden="true">
                {i + 1}
              </span>
              <div className="g-queue-main">
                <div className="g-contract-head">
                  <strong>{c.customer}</strong>
                  {c.landmark ? (
                    <span className="g-muted g-small-text">Ingen frist</span>
                  ) : isLate ? (
                    <StatusBadge status="feil" label={days <= 0 ? "Frist i dag – rekker ikke" : "Rekker ikke"} />
                  ) : days <= 1 ? (
                    <StatusBadge status="venter" label={days <= 0 ? "Frist i dag" : "1 døgn igjen"} />
                  ) : (
                    <span className="g-muted g-small-text">{days} døgn igjen</span>
                  )}
                </div>
                <span className="g-queue-what">
                  {PRODUCTS[c.product].name} · {GRADES[c.grade].name}
                  {c.agreementId ? " · rammeavtale" : ""}
                  {ovens &&
                    ` · lages nå${g.furnaces.length > 1 && ovens.length < g.furnaces.length ? ` i ovn ${ovens.join(" og ")}` : ""}`}
                </span>
                <Bar value={c.delivered / c.tonnes} tone={isLate ? "critical" : "ok"} label="Levert" />
                <div className="g-contract-head g-queue-foot">
                  <span className="g-muted g-small-text">
                    {c.delivered > 0.5
                      ? `Levert ${fmtT(c.delivered)} av ${fmtT(c.tonnes)}`
                      : `${fmtT(c.tonnes)} – ikke levert ennå`}
                  </span>
                  {!sorting && active.length > 1 && (
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
                <details className="g-details g-queue-more">
                  <summary>Mer</summary>
                  <p className="g-muted g-small-text">
                    {fmtKr(c.pricePerT)}/tonn · verdi {fmtKr(c.tonnes * c.pricePerT)}
                    {c.landmark ? "" : ` · frist dag ${c.deadlineDay}`}
                  </p>
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
                    <button className="g-small" onClick={() => setConfirmCancel(c.id)}>
                      Avbryt ordren…
                    </button>
                  )}
                </details>
              </div>
            </li>
          );
        })}
      </ol>
      {closed.length > 0 && (
        <details className="g-details">
          <summary>
            Nylig avsluttet ({closed.length})
            {avgRating(g) !== null && (
              <span className="g-muted"> · kundene gir {fmtNum(Math.floor((avgRating(g) ?? 0) * 10) / 10, 1)}/10</span>
            )}
          </summary>
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
        </details>
      )}
    </Card>
  );
}

/** Selg alt stål ingen kontrakt venter på, med ett trykk (B-274) */
export function SellAllButton({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const free = freeStockT(g);
  if (free <= 0.05) return null;
  return (
    <button className="g-primary g-sell-all" onClick={() => act((gg) => sellAllFree(gg))}>
      Selg alt ledig stål ({fmtT(free)}) på spot
    </button>
  );
}

/** Ferdigvarelageret (B-241): hvor fullt, hva som er holdt av til kontraktene, og partiene med det du kan selge */
function StockTab({ g, stats, act }: Props) {
  const [showAll, setShowAll] = useState(false);
  const reserved = lotReservations(g);
  const total = g.lots.reduce((a, l) => a + l.t, 0);
  const held = g.lots.reduce((a, l) => a + Math.min(l.t, reserved.get(l.id) ?? 0), 0);
  const seconds = g.lots.filter((l) => l.second).reduce((a, l) => a + l.t, 0);
  const shown = showAll ? g.lots : [...g.lots].sort((a, b) => b.t - a.t).slice(0, LOTS_SHOWN);
  return (
    <Card
      title="Ferdigvarelager"
      right={
        <span className="g-muted g-small-text">
          {fmtT(stats.storeUsed)} av {fmtT(stats.storeT)}
        </span>
      }
    >
      <Bar
        value={stats.storeUsed / stats.storeT}
        tone={stats.storeUsed > stats.storeT * 0.9 ? "critical" : "accent"}
        label="Ferdigvarelager"
      />
      <SellAllButton g={g} act={act} />
      {g.lots.length === 0 ? (
        <p className="g-empty">
          <Icon name="package" />
          Lageret er tomt – alt verket lager, går rett til kontraktene. Stål som ingen kontrakt trenger, havner her.
        </p>
      ) : (
        <dl className="g-offer-facts g-stock-facts">
          <div>
            <dt>Til kontrakter</dt>
            <dd>{fmtT(held)}</dd>
          </div>
          <div>
            <dt>Ledig</dt>
            <dd>{fmtT(Math.max(0, total - held - seconds))}</dd>
          </div>
          <div>
            <dt>Støpefeil</dt>
            <dd>{fmtT(seconds)}</dd>
          </div>
        </dl>
      )}
      {g.lots.length > 0 && (
        <p className="g-muted g-small-text">
          {stats.lab === 2
            ? "Spektrometeret måler hele analysen."
            : stats.lab === 1
              ? "Analysatoren måler sporelementer. Karbon og fosfor (≈) er anslått ut fra resepten."
              : "Uten analyse er alt (≈) anslått ut fra resepten. Avvik oppdages først hos kunden."}
        </p>
      )}
      <ul className="g-lots">
        {shown.map((l) => {
          const forContract = Math.min(l.t, reserved.get(l.id) ?? 0);
          const free = l.t - forContract;
          return (
            <li key={l.id} className={l.second ? "is-second" : ""}>
              <div className="g-contract-head">
                <strong>
                  {fmtT(l.t)} {PRODUCTS[l.product].name.toLowerCase()}
                </strong>
                {l.second ? (
                  <span className="g-badge-bad">Støpefeil</span>
                ) : forContract > 1e-6 ? (
                  <span className="ds-status is-info">
                    <Icon name="package" />
                    {free > 1e-6 ? `${fmtT(forContract)} til kontrakt` : "Til kontrakt"}
                  </span>
                ) : null}
              </div>
              <AnalysisLine a={l.known} measured={l.measured} />
              <div>
                {l.second ? (
                  <span className="g-muted">2. sortering</span>
                ) : (
                  <GradeChips grades={satisfiedGrades(l.known)} />
                )}
              </div>
              {free > 1e-6 && (
                <button className="g-small" onClick={() => act((gg) => sellLot(gg, l.id, free))}>
                  Selg {forContract > 1e-6 ? `${fmtT(free)} ` : ""}på spot ({fmtKr(spotPrice(g, l.product, l.second))}
                  /t)
                </button>
              )}
            </li>
          );
        })}
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
                act((gg) => void (gg.settings.secondsAction = e.target.value as GameState["settings"]["secondsAction"]))
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
          Støpefeil kan ikke leveres på kontrakt. Omsmelting gir returskrap med kjent analyse – gratis skrap til neste
          charge, men det koster strøm og tar plass på skraplageret.
        </p>
        <AutoToggle
          g={g}
          act={act}
          k="autoSpot"
          label="Selg automatisk på spot partier ingen kontrakt venter på, etter ett døgn"
        />
      </details>
    </Card>
  );
}

export function Sales({
  g,
  stats,
  act,
  openTab,
  onTab,
  paused,
}: Props & { openTab?: string; onTab?: OnTab; paused?: boolean }) {
  const [tab, setTab] = useState<SalesTab>(() =>
    openTab && ["tilbud", "ko", "lager", "avtaler"].includes(openTab)
      ? (openTab as SalesTab)
      : g.contracts.some((c) => c.status === "tilbud") || !g.contracts.some((c) => c.status === "aktiv")
        ? "tilbud"
        : "ko",
  );
  useReportTab(tab, onTab);
  const offers = g.contracts.filter((c) => c.status === "tilbud").length;
  const active = orderQueue(g);
  const late = active.length ? lateContracts(g, stats).length : 0;
  // Underfaner, så siden ikke blir en lang rull (B-044). Rammeavtaler vises først når de er låst opp.
  const showAgreements = g.stage >= AGREEMENT_STAGE || g.agreements.length > 0;
  const agreementOffers = g.agreements.filter((a) => a.status === "tilbud").length;
  // Fanen viser antall aktive avtaler; nye tilbud får et eget merke (B-081)
  const agreementsActive = g.agreements.filter((a) => a.status === "aktiv").length;
  const tabs: { id: SalesTab; label: string; count?: number; badge?: string }[] = [
    { id: "tilbud", label: "Forespørsler", count: offers },
    // Rekker ikke alt fristen, får Ordrekø et merke (B-241)
    { id: "ko", label: "Ordrekø", count: active.length, badge: late ? "!" : undefined },
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
        {/* Spillet står stille mens Salg er åpen (B-222) */}
        {paused && (
          <Callout>
            Spillet står på pause mens du er på Salg. Det går videre når du går ut – eller start tida selv øverst.
          </Callout>
        )}
        {tab === "tilbud" && <OffersTab g={g} stats={stats} act={act} />}
        {tab === "avtaler" && <Agreements g={g} stats={stats} act={act} />}
        {tab === "ko" && <QueueTab g={g} stats={stats} act={act} />}
        {tab === "lager" && <StockTab g={g} stats={stats} act={act} />}
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
