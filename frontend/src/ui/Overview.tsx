import { useEffect, useState, type ReactNode } from "react";
import { requestManual, requestReline, setFurnaceGrade, setTargetGrade, upgradeOptions } from "../game/actions";
import { Maintenance } from "./Maintenance";
import { ProductionCard } from "./ProductionCard";
import { BuildCard } from "./Neighborhood";
import { showBuildCard } from "../game/building";
import { CalendarCard } from "./CalendarCard";
import { RecipeCard } from "./Recipe";
import { auto, automationUnlocked } from "../game/research";
import { GRADE_IDS, GRADES, SCRAP_TYPES, STAGES } from "../game/data";
import {
  currentOrder,
  furnaceOrder,
  nextAgreementWeek,
  queueMinutes,
  recipeEstimate,
  scrapAlert,
  SEQUENCE_WAIT_MIN,
} from "../game/engine";
import { castingType, furnaceGrade, gradeRecipe, gradesInUse, shiftStart, type PlantStats } from "../game/plant";
import type { Contract, CostCategory, DayFinance, GameState, GradeId, IncomeCategory } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AnalysisLine, Bar, Card, GradeChips, Stat } from "./common";
import { fmtClock, fmtDuration, fmtKr, fmtNum, fmtPct, fmtT } from "./format";
import { activeMissions, missionProgress } from "../game/missions";
import { PlantScene } from "./PlantScene";
import { SceneBubbles } from "./SceneBubbles";
import { StageCard, StationButton, UpgradeSheet } from "./Upgrades";
import { AutoToggle } from "./AutoToggle";
import { PyntModal } from "./Achievements";
import { BankCard } from "./Settings";
import { readyUpgrades, stationOptions, stationReady, type Station } from "./stations";
import { VERKET_TABS, type VerketTab } from "./verketTabs";
import type { View } from "./views";
import { MoneyGuideLink } from "./MoneyGuide";
import { Icon } from "./icons";
import { CASH_RESERVE, hasPaidOut, paidOutTotal } from "../game/reserve";
import { Callout, StatusLine, type Status } from "./ds";
import { hints, type Anchor, type Hint } from "./hints";
import { furnaceState, statusOf } from "./plantStatus";
import { Breakdown, ResultChart } from "./Finance";
import { COST_NAMES, dayResult, INCOME_NAMES } from "./financeNames";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  go: (view: View, sub?: string) => void;
  openBook: (chapter?: string) => void;
  /** Åpner tannhjulet (innloggingen), fra kortet med dagens oppdrag */
  onOpenSettings?: () => void;
  /** Underfanen står i GameApp (B-192) */
  tab: VerketTab;
  setTab: (t: VerketTab) => void;
}

function missingScrap(g: GameState, stats: PlantStats): string | null {
  const short = scrapAlert(g, stats);
  return short.length ? short.map((id) => SCRAP_TYPES[id].name.toLowerCase()).join(" og ") : null;
}

/** Rådene etter det første: to synlige, resten bak «Flere råd» så det ikke blir en tekstvegg (B-195) */
/**
 * Rådene under anleggsbildet (B-195, B-238): én rad med fast høyde, som alltid står der – også når det ikke er noe
 * råd. Før kom og gikk rådene med hver endring i verket, og alt under hoppet opp og ned. Teksten kortes til to linjer;
 * «+N» åpner alle rådene med hele teksten.
 */
function HintSlot({ tips, run }: { tips: Hint[]; run: (t: Hint) => void }) {
  const [open, setOpen] = useState(false);
  const first = tips[0];
  const more = tips.length - 1;
  const text = (t: string) => (
    <span className="g-cta-text" title={t}>
      {t}
    </span>
  );
  return (
    <div className="g-cta-wrap">
      <div className="g-cta-row">
        {!first ? (
          <div className="g-cta is-calm">
            <Icon name="ok" />
            {text("Ingen råd akkurat nå. Verket går av seg selv.")}
          </div>
        ) : first.view || first.anchor ? (
          <button className="g-cta" onClick={() => run(first)}>
            <Icon name="info" />
            {text(first.text)}
            <Icon name="chevron-right" className="g-cta-go" />
          </button>
        ) : (
          <div className="g-cta">
            <Icon name="info" />
            {text(first.text)}
          </div>
        )}
        {more > 0 && (
          <button
            className="g-cta-more"
            aria-expanded={open}
            aria-label={open ? "Skjul rådene" : `Vis alle råd (${more} til)`}
            onClick={() => setOpen(!open)}
          >
            {open ? <Icon name="chevron-up" /> : `+${more}`}
          </button>
        )}
      </div>
      {open && more > 0 && (
        <ul className="g-more-hints">
          {tips.map((t) => (
            <li key={t.text}>
              {t.view || t.anchor ? (
                <button className="g-link" onClick={() => run(t)}>
                  {t.text}
                </button>
              ) : (
                t.text
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Kvalitet de siste sju døgnene: holdt stålet kvaliteten det ble laget for? */
function Quality({
  g,
  stats,
  go,
  right,
}: {
  g: GameState;
  stats: PlantStats;
  go: (v: View, sub?: string) => void;
  right: ReactNode;
}) {
  const days = [...g.history.slice(-6), g.today];
  const on = days.reduce((a, d) => a + (d.onGradeT ?? 0), 0);
  const off = days.reduce((a, d) => a + (d.offGradeT ?? 0), 0);
  const second = days.reduce((a, d) => a + (d.secondT ?? 0), 0);
  const transition = days.reduce((a, d) => a + (d.transitionT ?? 0), 0);
  const total = on + off + second;
  const lab = [
    "Ingen måling – du vet ikke sikkert hva som er i stålet",
    "Håndholdt analysator",
    "Spektrometer (hele analysen)",
  ][stats.lab];
  return (
    <Card title="Kvalitet" right={right}>
      {total <= 0 ? (
        <p className="g-muted">Ikke noe stål støpt ennå denne uka.</p>
      ) : (
        <>
          <div className="g-goal">
            <span>Riktig</span>
            <Bar
              value={on / total}
              tone={on / total >= 0.9 ? "ok" : on / total >= 0.75 ? "warning" : "critical"}
              label="Riktig kvalitet"
            />
            <span>{fmtPct(on / total)}</span>
          </div>
          <p className="g-muted">
            Siste sju døgn: {fmtPct(on / total)} holdt kvaliteten, {fmtPct(off / total)} bommet på analysen og{" "}
            {fmtPct(second / total)} fikk støpefeil. Stål som bommer, kan ikke leveres på kontrakten og selges billig.
          </p>
          {off / total > 0.05 && (
            <button className="g-small" onClick={() => go("verket", "resept")}>
              Se på resepten
            </button>
          )}
          {second / total > 0.08 && (
            <p className="g-muted">Støpefeil kommer oftest av feil temperatur. Erfarne folk gir færre feil.</p>
          )}
          {transition > 0 && (
            <p className="g-muted">
              {fmtT(transition)} overgangsemner ble skrapet ved kvalitetsbytte i strengstøpingen. Færre bytter gir
              mindre tap.
            </p>
          )}
        </>
      )}
      <p className="g-muted">Måling: {lab}.</p>
    </Card>
  );
}

type SubTab = VerketTab;

/** Hele produksjonslinja på én rad, med varsel og knapp når foringen må byttes (B-035) */
function CompactChain({
  g,
  stats,
  act,
  onOpen,
  onMaintenance,
  onStation,
  go,
}: {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  onOpen: () => void;
  onMaintenance: () => void;
  /** Åpner utstyret for et sted, når det er noe der du kan kjøpe (B-065) */
  onStation: (s: Station) => void;
  go: (v: View, sub?: string) => void;
}) {
  const castHead = g.castQueue[0];
  const missing = missingScrap(g, stats);
  const worn = g.furnaces.map((f, i) => ({ f, i })).filter((x) => x.f.wear >= 0.6 && !x.f.relineRequested);
  // Tall på knappen: utstyr der du kan kjøpe og har råd til. Et trykk åpner da utstyret direkte (B-065)
  const ready = (s: Station) => stationReady(g, s);
  // Ovn og støping åpner alltid utstyret når det finnes noe der, også når du ikke har råd (B-112)
  const has = (s: Station) => stationOptions(g, s).some((o) => !o.locked);
  const badge = (n: number) =>
    n > 0 ? (
      <span className="g-badge" aria-label={`${n} utstyr du har råd til`}>
        {n}
      </span>
    ) : null;
  return (
    <section className="g-card g-mini-chain" aria-label="Produksjonslinja">
      <div className="g-mini-row">
        <button
          className={`g-mini${missing ? " is-alert" : ""}`}
          onClick={() => (!missing && ready("skrap") ? onStation("skrap") : go("marked", "skrap"))}
          aria-label={missing ? `Skrap: mangler ${missing}` : undefined}
        >
          <span>Skrap{missing ? <span className="g-badge">!</span> : badge(ready("skrap"))}</span>
          <Bar
            value={stats.yardUsed / stats.yardT}
            tone={stats.yardUsed < stats.sizeT || missing ? "critical" : "accent"}
            label="Skraplager"
          />
          <small>{missing ? <StatusLine status="tomt" label="Mangler skrap" /> : fmtT(stats.yardUsed)}</small>
        </button>
        <FurnacesTile g={g} badge={badge(ready("ovn"))} onClick={() => (has("ovn") ? onStation("ovn") : onOpen())} />
        <button className="g-mini" onClick={() => (has("stoping") ? onStation("stoping") : onOpen())}>
          <span>Støping{badge(ready("stoping"))}</span>
          <Bar value={castHead ? g.castProgressT / castHead.t : 0} tone="ok" label="Støping" />
          <small>
            <StatusLine
              status={g.castWait ? statusOf(g.castWait) : castHead ? "kjorer" : "venter"}
              label={g.castWait ?? (castHead ? "Støper" : "Venter")}
            />
          </small>
        </button>
        <button className="g-mini" onClick={() => (ready("lager") ? onStation("lager") : go("salg", "lager"))}>
          <span>Lager{badge(ready("lager"))}</span>
          <Bar
            value={stats.storeUsed / stats.storeT}
            tone={stats.storeUsed > stats.storeT * 0.9 ? "critical" : "accent"}
            label="Ferdigvarelager"
          />
          <small>
            {stats.storeUsed >= stats.storeT * 0.999 ? (
              <StatusLine status="fullt" label={`Fullt · ${fmtT(stats.storeUsed)}`} />
            ) : (
              fmtT(stats.storeUsed)
            )}
          </small>
        </button>
      </div>
      {worn.map(({ f, i }) => (
        <div key={i} className="g-note g-warn g-mini-alert">
          <button className="g-link" onClick={onMaintenance}>
            Foringen{g.furnaces.length > 1 ? ` i ovn ${i + 1}` : ""} er {fmtPct(f.wear)} slitt. Se vedlikehold →
          </button>
          <button className="g-small" onClick={() => act((gg) => requestReline(gg, i))}>
            Bytt foring
          </button>
        </div>
      ))}
      <button className="g-link" onClick={onOpen}>
        Hele anlegget: utstyr, vedlikehold og kvalitet →
      </button>
    </section>
  );
}

/**
 * Ovnene som én rute i produksjonslinja (B-231): en stripe per ovn som viser hvor langt smeltingen har kommet, og én
 * status – «3 smelter», eller hva som stopper. Før fikk hver ovn sin rute, og linja ble to rader på mobil.
 */
function FurnacesTile({ g, badge, onClick }: { g: GameState; badge: ReactNode; onClick: () => void }) {
  const n = g.furnaces.length;
  const states = g.furnaces.map((_, i) => furnaceState(g, i));
  const running = g.furnaces.filter((f) => f.heat).length;
  const stopped = states.find((_, i) => !g.furnaces[i].heat);
  const status: Status = stopped ? statusOf(stopped.text) : "kjorer";
  const label = !stopped ? (n > 1 ? `${n} smelter` : "Smelter") : n > 1 ? `${running} av ${n} smelter` : stopped.text;
  const detail = states.map((st, i) => (n > 1 ? `Ovn ${i + 1}: ${st.text}` : st.text)).join("\n");
  return (
    <button className="g-mini" onClick={onClick} title={detail} aria-label={`${n > 1 ? "Ovnene" : "Ovnen"}: ${detail}`}>
      <span>
        {n > 1 ? "Ovner" : "Ovn"}
        {badge}
      </span>
      <div className="g-mini-bars">
        {states.map((st, i) => (
          <Bar key={i} value={st.progress ?? 0} tone="warning" label={n > 1 ? `Ovn ${i + 1}` : "Smelting"} />
        ))}
      </div>
      <small>
        <StatusLine status={status} label={label} />
      </small>
    </button>
  );
}

/** Fagboka på Verket: nye kapitler og oppdrag i gang (B-025) */
function BookCard({ g, openBook }: { g: GameState; openBook: (chapter?: string) => void }) {
  const active = activeMissions(g);
  const unread = g.knowledge.filter((k) => !g.readChapters.includes(k)).length;
  if (!active.length && !unread) return null;
  return (
    <Card
      title="Fagboka"
      right={
        <button className="g-small" onClick={() => openBook()}>
          <Icon name="book" /> Åpne
        </button>
      }
    >
      {unread > 0 && (
        <p className="g-note">
          {unread === 1 ? "Ett nytt kapittel" : `${unread} nye kapitler`}. Les for å kunne forske – og ta quizen for
          fagpoeng.
        </p>
      )}
      {active.slice(0, 3).map((m) => (
        <button key={m.id} className="g-mission g-mission-btn" onClick={() => openBook(m.chapter)}>
          <strong>Oppdrag: {m.title}</strong>
          <Bar value={missionProgress(g, m) / m.goal} tone="ok" label="Fremdrift" />
          <span className="g-muted">
            {fmtNum(missionProgress(g, m), m.unit === "stjerner" ? 1 : 0)} av {m.goal} {m.unit ?? ""} · {m.fp} fagpoeng
            {m.cash > 0 ? ` og ${fmtKr(m.cash)}` : ""}
          </span>
        </button>
      ))}
    </Card>
  );
}

/** Det hjemmeverket tjente et døgn: uten datterverkene, konsernkostnadene (B-181) og investeringer (B-156) */
function plantResult(d: DayFinance): number {
  const income = Object.entries(d.income).reduce((a, [k, v]) => a + (k === "konsern" ? 0 : (v ?? 0)), 0);
  const costs = Object.entries(d.costs).reduce(
    (a, [k, v]) => a + (k === "investering" || k === "konsern" ? 0 : (v ?? 0)),
    0,
  );
  return income - costs;
}

/** Snittet av hele resultatet (med datterverk og kjøp) de siste sju døgnene */
function avgResult(g: GameState): number {
  const days = g.history.slice(-7);
  return days.length ? days.reduce((a, d) => a + dayResult(d), 0) / days.length : 0;
}

function avgPlantResult(g: GameState): number {
  const days = g.history.slice(-7);
  return days.length ? days.reduce((a, d) => a + plantResult(d), 0) / days.length : 0;
}

export function Overview({ g, stats, act, go, openBook, tab: chosenTab, setTab }: Props) {
  const [sheet, setSheet] = useState<Station | null>(null);
  const [pynt, setPynt] = useState(false);
  const tab: SubTab = chosenTab;
  const y = g.history[g.history.length - 1];
  const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
  // På Oversikt står målkortet øverst når du kan flytte, så hintet om det trengs bare på de andre underfanene (B-068)
  const tips = hints(g, stats).filter((t) => !(t.anchor === "mal" && tab === "oversikt"));
  const upgradesReady = readyUpgrades(g);
  // Resept-fanen blir oransje når resepten ikke holder kravet til en kvalitet som lages nå (B-051, B-199)
  const recipeBad = gradesInUse(g).some(
    (grade) => !recipeEstimate(g, grade, stats, gradeRecipe(g, grade)).grades.includes(grade),
  );
  const missingNow = missingScrap(g, stats);
  // Varsel om foringen åpner Anlegg og ruller ned til vedlikeholdskortet
  // …og «Du kan flytte inn» åpner Oversikt og ruller til målkortet (B-064)
  const [scrollTo, setScrollTo] = useState<{ id: Anchor; n: number } | null>(null);
  useEffect(() => {
    if (scrollTo) document.getElementById(scrollTo.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTo]);
  const openAnchor = (id: Anchor) => {
    // Renseanlegget (B-263): åpner arket for ovnene på Anlegg, der rensingen står øverst
    if (id === "rensing") {
      setTab("anlegg");
      setSheet("ovn");
      return;
    }
    setTab(id === "vedlikehold" ? "anlegg" : "oversikt");
    setScrollTo((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
  };
  const openMaintenance = () => openAnchor("vedlikehold");
  const runHint = (t: Hint) => (t.anchor ? openAnchor(t.anchor) : t.view && go(t.view, t.sub));
  // Kan du flytte, står målkortet øverst i stedet for nederst (B-064)
  const canMove = !!upgradeOptions(g).find((o) => o.kind === "stage")?.available;
  const recent = g.log.slice(-8).reverse();

  return (
    <div className={`g-grid is-${tab}`}>
      {pynt && <PyntModal g={g} stats={stats} act={act} onClose={() => setPynt(false)} />}
      {/* Underfanene står øverst (B-192), over bildet og rådene, og over begge kolonnene på PC */}
      <div className="g-subtabs g-verket-tabs" role="tablist" aria-label="Verket">
        {VERKET_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`${tab === t.id ? "is-active" : ""}${t.id === "resept" && recipeBad ? " is-alert" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === "anlegg" && upgradesReady > 0 && (
              <span className="g-badge" aria-label={`${upgradesReady} utstyr du har råd til`}>
                {upgradesReady}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="g-col-wide g-verket-top">
        <div className="g-scene-wrap">
          {/* Stedene i bildet åpner utstyret der, eller Anlegg når det ikke er noe å kjøpe (B-242) */}
          <PlantScene
            g={g}
            stats={stats}
            onStation={(s) => (stationOptions(g, s).some((o) => !o.locked) ? setSheet(s) : setTab("anlegg"))}
          />
          <SceneBubbles g={g} />
          <button className="g-scene-pynt" onClick={() => setPynt(true)} aria-label="Pynt verket">
            <Icon name="palette" />
          </button>
          <div className="g-scene-caption">
            <strong>{stats.stage.name}</strong>
            <span>
              {stats.hours > 0
                ? stats.hours >= 24
                  ? "Døgnkontinuerlig drift"
                  : `Drift ${fmtClock(shiftStart(g) * 60)}–${fmtClock(((shiftStart(g) + stats.hours) % 24) * 60)}`
                : "Står – mangler folk"}
            </span>
          </div>
        </div>

        {/* Det viktigste akkurat nå (UI.md 6.1, B-195): én rad med fast høyde, så innholdet under står stille (B-238) */}
        <HintSlot tips={tips} run={runHint} />
      </div>

      {tab === "oversikt" && (
        <>
          <div className="g-col-wide g-side">
            {canMove && <StageCard g={g} act={act} />}
            <CompactChain
              g={g}
              stats={stats}
              act={act}
              onOpen={() => setTab("anlegg")}
              onMaintenance={openMaintenance}
              onStation={setSheet}
              go={go}
            />
            {/* Daglig belønning, oppdrag, ukens utfordring, sesongstigen og prestasjoner ligger under Mål (B-211) */}
            {g.tutorial === null && (
              <button className="g-goals-link" onClick={() => go("mal")}>
                <Icon name="trophy" />
                <span>
                  <strong>Mål</strong> – daglig belønning, dagens oppdrag, ukens utfordring og prestasjoner
                </span>
                <Icon name="chevron-right" />
              </button>
            )}
            <ProductionNow g={g} stats={stats} act={act} onRecipe={() => setTab("resept")} />
          </div>
          <div className="g-col">
            {!canMove && <StageCard g={g} act={act} />}
            {/* Fellesferien og vinteren fram i tid, så ordrene kan planlegges (B-321) */}
            <CalendarCard g={g} />

            <BookCard g={g} openBook={openBook} />
            {/* Loggen på Oversikt (B-098); ikke lenger også under Økonomi (B-233) */}
            <Card title="Siste hendelser">
              <ul className="g-log">
                {recent.slice(0, 5).map((e) => (
                  <li key={e.id} className={`log-${e.kind}`}>
                    <span className="g-log-time">
                      Dag {Math.floor(e.min / 1440) + 1} {fmtClock(e.min)}
                    </span>
                    {e.text}
                  </li>
                ))}
              </ul>
              <p className="g-muted">Alle viktige hendelser ligger i varsellista bak bjella øverst.</p>
            </Card>
          </div>
        </>
      )}

      {tab === "anlegg" && (
        <>
          {/* Produksjonsflyten (B-196): over begge kolonnene på PC, med status for hvert sted */}
          <div className="g-col-wide g-anlegg-flow">
            <ProductionCard g={g} stats={stats} missingNow={missingNow} go={go} onStation={setSheet} />
          </div>
          <div className="g-col-wide g-side">
            <Maintenance
              id="vedlikehold"
              g={g}
              stats={stats}
              act={act}
              right={<StationButton g={g} station="vedlikehold" onOpen={setSheet} />}
            />
          </div>
          <div className="g-col">
            <Quality g={g} stats={stats} go={go} right={<StationButton g={g} station="kvalitet" onOpen={setSheet} />} />
          </div>
          {/* Byggetid og nabolaget (B-336) */}
          {showBuildCard(g) && (
            <div className="g-col">
              <BuildCard g={g} act={act} />
            </div>
          )}
        </>
      )}

      {tab === "resept" && (
        <div className="g-col-wide g-recipe-col">
          <RecipeCard g={g} stats={stats} act={act} />
        </div>
      )}

      {tab === "okonomi" && (
        <>
          {/* UI-3a (B-203): resultatet øverst, så utviklingen, så hvor pengene kom fra og gikk til */}
          <div className="g-col-wide g-finance">
            <Card title="Økonomi">
              {y && (
                <div className="g-finance-head">
                  <div className={`g-finance-result ${dayResult(y) >= 0 ? "is-plus" : "is-minus"}`}>
                    <span>Resultat i går</span>
                    <strong>
                      {dayResult(y) >= 0 ? "+" : ""}
                      {fmtKr(dayResult(y))}
                    </strong>
                  </div>
                  <div className="g-finance-side">
                    <span>
                      Snitt 7 døgn, alt med <strong>{fmtKr(avgResult(g))}</strong>
                    </span>
                    <span>
                      I dag hittil{" "}
                      <strong>
                        {fmtKr(sum(g.today.income))} inn · {fmtKr(sum(g.today.costs))} ut
                      </strong>
                    </span>
                  </div>
                </div>
              )}
              {!y && (
                <div className="g-stats">
                  <Stat label="Inntekter i dag" value={fmtKr(sum(g.today.income))} />
                  <Stat label="Utgifter i dag" value={fmtKr(sum(g.today.costs))} />
                </div>
              )}
              <ResultChart days={g.history.slice(-30)} />
              <div className="g-stats">
                {/* Hjemmeverket for seg (B-156): uten datterverkene og uten kjøp, så man ser hva utstyret gir */}
                {y && (g.konsern.unlocked || (y.costs.investering ?? 0) > 0) && (
                  <>
                    {/* B-215: snittet først – ett døgn i minus er ofte bare at skrapet er betalt før ordren er levert */}
                    <Stat
                      label="Verket, snitt 7 døgn"
                      value={fmtKr(avgPlantResult(g))}
                      tone={avgPlantResult(g) >= 0 ? "ok" : "critical"}
                    />
                    <Stat
                      label="Verket i går (drift)"
                      value={fmtKr(plantResult(y))}
                      tone={plantResult(y) >= 0 ? "ok" : avgPlantResult(g) >= 0 ? "warning" : "critical"}
                    />
                    {g.konsern.unlocked && (
                      <Stat
                        label="Datterverkene i går"
                        value={fmtKr((y.income.konsern ?? 0) - (y.costs.konsern ?? 0))}
                      />
                    )}
                    {(y.costs.investering ?? 0) > 0 && (
                      <Stat label="Investert i går" value={fmtKr(y.costs.investering ?? 0)} tone="warning" />
                    )}
                  </>
                )}
                {y && <Stat label="Produsert i går" value={fmtT(y.producedT)} />}
                {stats.salaryPerDay > 0 && <Stat label="Lønn per døgn" value={fmtKr(stats.salaryPerDay)} />}
                <Stat label="Faste kostnader per døgn" value={fmtKr(STAGES[g.stage].fixedPerDay)} />
                {g.loan > 0 && <Stat label="Lån" value={fmtKr(g.loan)} tone="warning" />}
                {hasPaidOut(g) && <Stat label="Privat formue" value={fmtKr(Math.floor(paidOutTotal(g)))} />}
              </div>
              {y && (
                <div className="g-breakdowns">
                  <Breakdown
                    title="Inntekter i går"
                    rows={Object.entries(y.income).map(([k, v]) => ({
                      label: INCOME_NAMES[k as IncomeCategory] ?? k,
                      value: v ?? 0,
                    }))}
                  />
                  <Breakdown
                    title="Kostnader i går"
                    rows={Object.entries(y.costs).map(([k, v]) => ({
                      label: COST_NAMES[k as CostCategory] ?? k,
                      value: v ?? 0,
                    }))}
                  />
                </div>
              )}
              {/* Den private formuen (B-303, B-359) vises først når kassa har nådd taket */}
              {hasPaidOut(g) && (
                <p className="g-muted g-small-text g-reserve-note">
                  <Icon name="lock" /> Kassa kan ha høyst {fmtKr(CASH_RESERVE.softCap ?? 0)} – mer enn alt som kan
                  kjøpes. Det du tjener utover, flyttes til din private formue. Den kan ikke brukes i spillet, men
                  teller med i verdien (sluttmålet, de største ovnene, dagens oppdrag). Konkurransen med de andre
                  foregår i konsernkassa, i ekte tid. <MoneyGuideLink g={g} label="Slik henger pengene sammen" />
                </p>
              )}
              {y && plantResult(y) < 0 && avgPlantResult(g) >= 0 && (
                <p className="g-small-text">
                  Verket gikk i minus i går, men tjener {fmtKr(avgPlantResult(g))} i snitt per døgn. Skrapet betales når
                  det kjøpes, mens kontraktene betales når de leveres – derfor svinger enkeltdøgnene.
                </p>
              )}
              {y && (g.konsern.unlocked || (y.costs.investering ?? 0) > 0) && (
                <p className="g-muted g-small-text">
                  «Resultat i går» tar med alt:{" "}
                  {g.konsern.unlocked ? "utbyttet fra datterverkene, konsernkostnadene og " : ""}
                  det du kjøpte. «Verket (drift)» viser bare det hjemmeverket tjener på stålet, så du ser hva nytt
                  utstyr gir. Kontraktene betales når de er levert, så snittet over 7 døgn er mest rettferdig.
                </p>
              )}
            </Card>
          </div>
          <div className="g-col g-side">
            <BankCard g={g} act={act} />
            {/* Loggen står bare på Oversikt og i varsellista (B-233): den har ingenting med økonomien å gjøre */}
          </div>
        </>
      )}
      {sheet && <UpgradeSheet g={g} station={sheet} act={act} onClose={() => setSheet(null)} />}
    </div>
  );
}

/**
 * «Produksjon nå» (B-230): kort og tydelig. Øverst hva hver ovn lager og til hvem, så én handling (velg kvalitet, eller
 * «Velg selv» når ordrekøen styrer), og kontrollrommet. Bryterne og forklaringene ligger bak «Innstillinger og
 * forklaring» – før sto alt åpent, og kortet ble svært langt på storverket.
 */
function ProductionNow({
  g,
  stats,
  act,
  onRecipe,
}: {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  onRecipe: () => void;
}) {
  const est = recipeEstimate(g, g.targetGrade, stats);
  const order = currentOrder(g);
  const split = gradesInUse(g).length > 1;
  const casting = castingType(g);
  const many = g.furnaces.length > 1;
  const queueRules = auto(g, "followQueue") && !!order;
  // Én linje per ovn når ovnene kan lage hver sin kvalitet (B-238). Før ble like ovner slått sammen («Ovn 2–3»), men
  // da endret antallet linjer seg hver gang køen skiftet, og kortet hoppet opp og ned
  const rows: { who: string; grade: GradeId; o: Contract | null }[] =
    split || (many && auto(g, "splitGrades"))
      ? g.furnaces.map((_, i) => ({ who: `Ovn ${i + 1}`, grade: furnaceGrade(g, i), o: furnaceOrder(g, i) }))
      : [{ who: many ? "Alle ovner" : "Ovnen", grade: g.targetGrade, o: order }];
  // Neste ukeleveranse fra en rammeavtale og hvor lenge køen varer (B-316): så spilleren ser om det er tid til en
  // ordre imellom. Vises bare når en avtale har uker igjen (gradvis synlighet)
  const nextWeek = nextAgreementWeek(g);
  const queueMin = nextWeek ? queueMinutes(g, stats) : 0;
  const gradeOptions = (current: GradeId | null, skip?: GradeId) =>
    GRADE_IDS.filter((id) => id !== skip && (GRADES[id].minStage <= g.stage || id === current)).map((id) => (
      <option key={id} value={id}>
        {GRADES[id].name}
      </option>
    ));
  return (
    <Card title="Produksjon nå" className="g-prod-now">
      <ul className="g-prod-rows">
        {rows.map((r) => (
          <li key={r.who}>
            <span className="g-prod-who">{r.who}</span>
            <strong className="g-prod-grade">{GRADES[r.grade].name}</strong>
            {/* Alltid én linje (B-238): kundenavnet kortes heller enn at raden brytes */}
            <span className="g-prod-to" title={r.o ? r.o.customer : undefined}>
              {r.o ? `→ ${r.o.customer} · ${fmtT(r.o.tonnes - r.o.delivered)} igjen` : "→ lager og spot"}
            </span>
          </li>
        ))}
        {nextWeek && (
          <li
            title={`${nextWeek.agreement.customer}: ${fmtT(nextWeek.agreement.weeklyT)} ${GRADES[nextWeek.agreement.grade].name.toLowerCase()}`}
          >
            <span className="g-prod-who">Avtale</span>
            <strong className="g-prod-grade">
              {nextWeek.inMin > 0 ? `om ${fmtDuration(nextWeek.inMin)}` : "venter på oppstart"}
            </strong>
            {/* Ledig tid først: kortes linja, er det køen som forsvinner (B-238) */}
            <span className="g-prod-to">
              {!Number.isFinite(queueMin)
                ? "verket står"
                : nextWeek.inMin > queueMin
                  ? `${fmtDuration(nextWeek.inMin - queueMin)} ledig · køen ${fmtDuration(queueMin)}`
                  : `ingen ledig tid · køen ${fmtDuration(queueMin)}`}
            </span>
          </li>
        )}
      </ul>
      {queueRules ? (
        <div className="g-queue-lock">
          <span className="g-muted g-small-text">Ordrekøen velger kvaliteten.</span>
          <button className="g-small" onClick={() => act((gg) => void (gg.settings.followQueue = false))}>
            Velg selv
          </button>
        </div>
      ) : (
        <div className="g-prod-pick">
          <label className="g-field">
            <span>{many ? "Ovn 1" : "Kvalitet"}</span>
            <select value={g.targetGrade} onChange={(e) => act((gg) => setTargetGrade(gg, e.target.value as GradeId))}>
              {gradeOptions(g.targetGrade)}
            </select>
          </label>
          {g.furnaces.slice(1).map((f, j) => (
            <label className="g-field" key={j}>
              <span>Ovn {j + 2}</span>
              <select
                value={f.grade ?? ""}
                onChange={(e) =>
                  act((gg) => setFurnaceGrade(gg, j + 1, e.target.value === "" ? null : (e.target.value as GradeId)))
                }
              >
                <option value="">Samme som ovn 1</option>
                {gradeOptions(f.grade, g.targetGrade)}
              </select>
            </label>
          ))}
          {automationUnlocked(g, "followQueue") && !g.settings.followQueue && !!order && (
            <button className="g-link g-prod-back" onClick={() => act((gg) => void (gg.settings.followQueue = true))}>
              La ordrekøen velge igjen
            </button>
          )}
        </div>
      )}
      {stats.furnace.arc && (
        <div className="g-manual">
          <button
            className={g.settings.manualNext ? "g-primary is-on" : "g-primary"}
            onClick={() => act((gg) => requestManual(gg, !gg.settings.manualNext))}
          >
            {g.settings.manualNext ? "Du tar neste charge ✓" : "Ta styringen på neste charge"}
          </button>
          <span className="g-muted g-small-text">
            Fire korte runder – gir fagpoeng og bedre betalt stål
            {(g.controlBest ?? 0) > 0 && ` · rekord ${fmtNum(g.controlBest ?? 0)}`}
          </span>
        </div>
      )}
      {/* Resepten som ikke holder, er det eneste som må ordnes her; ellers står analysen bak «Innstillinger». Nederst, så
          linjene over ikke flytter seg når varselet kommer og går (B-238) */}
      {!est.grades.includes(g.targetGrade) && (
        <Callout tone="critical">
          Resepten holder ikke kravet til {GRADES[g.targetGrade].name.toLowerCase()}.{" "}
          <button className="g-link" onClick={onRecipe}>
            Juster resepten
          </button>
        </Callout>
      )}
      <details className="g-details">
        <summary>Innstillinger og forklaring</summary>
        {(g.stage >= 1 || g.contracts.filter((c) => c.status === "aktiv").length > 1) && (
          <AutoToggle
            g={g}
            act={act}
            k="followQueue"
            label="Følg ordrekøen (kvalitet og resept skifter etter kontrakten som står først)"
          />
        )}
        {many && auto(g, "followQueue") && (
          <AutoToggle
            g={g}
            act={act}
            k="splitGrades"
            label="To kvaliteter samtidig: ovn 2 lager neste kvalitet i køen når den er en annen enn ovn 1 sin"
          />
        )}
        <p className="g-muted">{GRADES[g.targetGrade].description}</p>
        <div className="g-estimate">
          <span>Anslag med resepten:</span>
          <AnalysisLine a={est.analysis} />
          <span>Holder:</span>
          <GradeChips grades={est.grades.filter((id) => GRADES[id].minStage <= g.stage)} highlight={g.targetGrade} />
        </div>
        {split && (
          <p className="g-muted g-small-text">
            Hver ovn bruker resepten for sin kvalitet. Stålet går til samme støpemaskin, én øse av gangen.
            {casting.continuous &&
              ` Strengstøpingen støper én kvalitet om gangen. Kommer det snart mer av samme kvalitet, venter øsa med den andre kvaliteten litt (høyst ${fmtNum(SEQUENCE_WAIT_MIN / 60, 1)} timer). Ellers byttes kvaliteten med én gang, og overgangsemnene blir skrap (ca. ${fmtT(casting.tph * 0.05)}) – det koster mindre enn at ovnene står og venter.`}
          </p>
        )}
        {!stats.furnace.arc && g.stage >= 2 && (
          <p className="g-muted g-small-text">Med en lysbueovn kan du ta styringen og kjøre chargene selv.</p>
        )}
      </details>
    </Card>
  );
}
