import { useEffect, useState, type ReactNode } from "react";
import {
  BONUS_COOLDOWN_DAYS,
  fpDeal,
  keyUpgrade,
  requestManual,
  requestReline,
  setFurnaceGrade,
  setTargetGrade,
  upgradeOptions,
} from "../game/actions";
import { Maintenance } from "./Maintenance";
import { auto, missingResearchFor, researchOptions } from "../game/research";
import { scrapResearchFor, scrapResearchHint } from "../game/recipe";
import { GRADE_IDS, GRADES, PRODUCTS, ROLES, SCRAP_TYPES, STAGES } from "../game/data";
import {
  currentOrder,
  furnaceOrder,
  recipeEstimate,
  scrapShort,
  scrapStopHelp,
  SEQUENCE_WAIT_MIN,
} from "../game/engine";
import {
  bonusGap,
  castingType,
  day,
  furnaceGrade,
  gradeRecipe,
  gradesInUse,
  hasGrader,
  isAbsent,
  rollingActive,
  shiftStart,
  staffing,
  tempsActive,
  unitType,
  fixedPriceAdvice,
  type PlantStats,
} from "../game/plant";
import type { DayFinance, GameState, GradeId, RoleId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AnalysisLine, Bar, Card, GradeChips, Stat } from "./common";
import { fmtClock, fmtKr, fmtNum, fmtPct, fmtT } from "./format";
import { activeMissions, missionProgress } from "../game/missions";
import { canWarn } from "../game/actions";
import { sickSpells } from "../game/engine";
import { CHALLENGE_STAGE, CHALLENGES, challengeProgress, challengeShare, challengesDone } from "../game/challenges";
import { PlantScene } from "./PlantScene";
import { SceneBubbles } from "./SceneBubbles";
import { StageCard, StationButton, UpgradeSheet } from "./Upgrades";
import { AutoToggle } from "./AutoToggle";
import { konsernReady } from "../game/konsern";
import { DailyCard } from "./Daily";
import { AchievementsCard, PyntModal } from "./Achievements";
import { WeeklyCard } from "./Weekly";
import { BankCard } from "./Settings";
import { KonsernTab } from "./Konsern";
import { readyUpgrades, stationOptions, stationReady, type Station } from "./stations";
import type { View } from "./views";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  go: (view: View, sub?: string) => void;
  openBook: (chapter?: string) => void;
  /** Åpner ⚙️ (innloggingen), fra kortet med dagens oppdrag */
  onOpenSettings?: () => void;
}

type Anchor = "vedlikehold" | "mal";

interface Hint {
  text: string;
  view?: View;
  /** Underfane i visningen, f.eks. lageret under Salg */
  sub?: string;
  /** Kort her på Verket som hintet ruller til: vedlikehold (under Anlegg) eller målkortet (B-064) */
  anchor?: Anchor;
}

function hints(g: GameState, stats: PlantStats): Hint[] {
  const out: Hint[] = [];
  const active = g.contracts.filter((c) => c.status === "aktiv");
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  const waits = g.furnaces.map((f) => f.waitReason);
  if (!active.length && offers.length)
    out.push({ text: "Du har ingen kontrakter. Se på tilbudene under Salg.", view: "salg" });
  if (waits.includes("Mangler skrap til resepten"))
    out.push({
      text: `Skrapklasseren venter på skrap som passer resepten. ${scrapStopHelp(g)}`,
      view: "marked",
      sub: "skrap",
    });
  if (waits.includes("Tomt for skrap"))
    out.push({ text: `Ovnen står fordi skraplageret er tomt. ${scrapStopHelp(g)}`, view: "marked", sub: "skrap" });
  if (waits.includes("Mangler folk")) {
    const missing = Object.entries(stats.missing)
      .map(
        ([r, n]) => `${n} ${n === 1 ? ROLES[r as RoleId].name.toLowerCase() : ROLES[r as RoleId].plural.toLowerCase()}`,
      )
      .join(", ");
    out.push({ text: `Verket mangler folk for å gå: ${missing}.`, view: "folk" });
  }
  // Ovnene smelter mer enn støpingen tar unna (B-157): si hva som gir mer støpekapasitet
  if (g.stage >= 4 && stats.casting.continuous && stats.hours > 0 && stats.meltTph > stats.castTph * 1.15) {
    const more = upgradeOptions(g).find(
      (o) => !o.owned && (o.kind === "casting" || o.baseId === "streng2" || o.baseId === "streng3"),
    );
    out.push({
      text: `Ovnene smelter ca. ${fmtT(stats.meltTph)} i timen, men støpingen tar bare ${fmtT(stats.castTph)}, så ovnene venter på støping.${more ? ` Mer støpekapasitet: ${more.name}${more.reason && more.reason !== "For lite penger" ? ` (${more.reason.toLowerCase()})` : " under Anlegg → Støping og valsing"}.` : ""}`,
    });
  }
  if (g.castWait === "Ferdigvarelageret er fullt")
    out.push({ text: "Ferdigvarelageret er fullt. Selg partier på spot under Salg.", view: "salg", sub: "lager" });
  if (stats.furnace.arc && g.furnaces.some((f) => f.spareProgress < 1) && !g.workers.some((w) => w.role === "murer"))
    out.push({
      text: "Reservepotta til lysbueovnen blir ikke murt opp. Ansett murere, ellers må foringen mures om inne i ovnen.",
      view: "folk",
    });
  if (g.furnaces.some((f) => f.wear > 0.8 && !f.relineRequested))
    out.push({
      text: "Foringen er nesten slitt gjennom. Trykk her og bytt den under Vedlikehold før den brenner gjennom.",
      anchor: "vedlikehold",
    });
  // Uten ordreplanlegging bytter ikke ovnen kvalitet selv (B-054)
  const first = currentOrder(g);
  if (
    first &&
    !auto(g, "followQueue") &&
    first.grade !== g.targetGrade &&
    g.furnaces.every((_, i) => furnaceGrade(g, i) !== first.grade)
  )
    out.push({
      text: `${first.customer} vil ha ${GRADES[first.grade].name.toLowerCase()}, men ovnen lager ${GRADES[g.targetGrade].name.toLowerCase()}. Bytt kvalitet under «Produksjon nå» lenger ned.`,
    });
  // Kvaliteter ovnen lager eller har kontrakter på. Trengs det skrap som ikke er forsket fram, sies det (B-067)
  const inUse = gradesInUse(g);
  const needed = [...new Set([...inUse, ...g.contracts.filter((c) => c.status === "aktiv").map((c) => c.grade)])];
  for (const grade of needed) {
    const est = recipeEstimate(g, grade, stats, gradeRecipe(g, grade));
    if (est.grades.includes(grade)) continue;
    const missing = scrapResearchFor(g, grade, stats);
    if (missing) out.push({ text: scrapResearchHint(g, grade, missing), view: "forskning" });
    else if (inUse.includes(grade))
      out.push({
        text: `Resepten din holder ikke kravet til ${GRADES[grade].name.toLowerCase()}. Juster resepten under Marked.`,
        view: "marked",
        sub: "resept",
      });
  }
  const research = researchOptions(g).filter((r) => r.available);
  if (research.length)
    out.push({ text: `Du har fagpoeng nok til å forske på ${research[0].name.toLowerCase()}.`, view: "forskning" });
  const next = upgradeOptions(g).find((o) => o.kind === "stage");
  if (next?.available) out.push({ text: `Du kan flytte inn i ${next.name.toLowerCase()}! Trykk her.`, anchor: "mal" });
  // Står ny ovn eller støping fast på forskning, og fagpoengene mangler: vis veien videre (B-064)
  const key = keyUpgrade(g);
  const needs = key?.reason?.startsWith("Forsk fram") ? missingResearchFor(g, key.baseId) : undefined;
  if (needs && g.researchPoints < needs.cost) {
    const deal = fpDeal(g);
    const ways = [
      !deal.reason && "kjøp et forskningssamarbeid under Forskning",
      stats.furnace.arc && "kjør charger selv («Ta styringen»)",
      "lever kontrakter og ta quizene i fagboka",
    ].filter(Boolean);
    out.push({
      text: `Du mangler ${Math.ceil(needs.cost - g.researchPoints)} fagpoeng til «${needs.name}». Få flere: ${ways.join(", ")}.`,
      view: "forskning",
    });
  }
  {
    const away = g.workers.filter((w) => isAbsent(g, w)).length;
    const full = staffing(g, true).shifts;
    if (away && !tempsActive(g) && stats.shifts < full)
      out.push({
        text: `${away} ${away === 1 ? "ansatt er" : "ansatte er"} borte, og verket går ${stats.shifts} skift i stedet for ${full}. Lei inn vikarer under Folk, eller vent til de er tilbake.`,
        view: "folk",
        sub: "fravaer",
      });
  }
  // Lenge siden bonus (B-159): trivselen synker, si fra før folk begynner å slutte
  if (
    g.workers.length &&
    g.morale >= 40 &&
    g.morale < 70 &&
    bonusGap(g) >= 10 &&
    day(g) - g.lastBonusDay >= BONUS_COOLDOWN_DAYS
  )
    out.push({
      text: "Det er lenge siden de ansatte fikk bonus, og trivselen synker. Gi alle bonus under Folk.",
      view: "folk",
      sub: "ansatte",
    });
  if (g.workers.length && g.morale < 40)
    out.push({ text: "Trivselen blant de ansatte er lav, og noen kan si opp. Se Folk.", view: "folk", sub: "ansatte" });
  {
    // Høy strømpris: råd om fastpris (B-105)
    const advice = fixedPriceAdvice(g, stats.hours);
    if (advice)
      out.push({
        text: `Strømprisen er høy (${fmtNum(advice.spot, 2)} kr/kWh på spot). Fastpris nå: ${fmtNum(advice.fixed, 2)} kr/kWh i 30 døgn. Trykk her for å se strømavtalene.`,
        view: "marked",
        sub: "strom",
      });
  }
  {
    // Ofte borte: råd om advarsel (B-101)
    const often = g.workers.find((w) => canWarn(g, w));
    if (often)
      out.push({
        text: `${often.name} har vært syk ${sickSpells(g, often)} ganger på 60 døgn. Vurder en advarsel under Folk → Fravær.`,
        view: "folk",
        sub: "fravaer",
      });
  }
  if (g.stage >= 1 && stats.staffCount === 0)
    out.push({ text: "Nå har du plass til ansatte. Med flere folk kan verket gå flere skift.", view: "folk" });
  return out.slice(0, 3);
}

/** Skraptypene resepten mangler til neste charge, som tekst (B-063) */
function missingScrap(g: GameState, stats: PlantStats): string | null {
  const short = scrapShort(g, stats);
  return short.length ? short.map((id) => SCRAP_TYPES[id].name.toLowerCase()).join(" og ") : null;
}

function furnaceState(g: GameState, index: number): { text: string; progress: number | null } {
  const f = g.furnaces[index];
  if (f.heat) {
    const p = (g.minute - f.heat.startMin) / (f.heat.endMin - f.heat.startMin);
    const who = f.heat.manual ? " (kjørt av deg)" : "";
    return { text: `Smelter ${fmtT(f.heat.sizeT)} ${GRADES[f.heat.grade].name.toLowerCase()}${who}`, progress: p };
  }
  if (g.pendingManual?.furnace === index) return { text: "Venter på deg i kontrollrommet", progress: null };
  return { text: f.waitReason ?? "Klar", progress: null };
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
            <button className="g-small" onClick={() => go("marked", "resept")}>
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

type SubTab = "oversikt" | "anlegg" | "okonomi" | "konsern";
const SUBTABS: { id: SubTab; label: string }[] = [
  { id: "oversikt", label: "Oversikt" },
  { id: "anlegg", label: "Anlegg" },
  { id: "okonomi", label: "Økonomi" },
  { id: "konsern", label: "Konsern" },
];

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
          <small className={missing ? "is-waiting" : ""}>{missing ? "Mangler skrap" : fmtT(stats.yardUsed)}</small>
        </button>
        {g.furnaces.map((f, i) => {
          const st = furnaceState(g, i);
          return (
            <button className="g-mini" key={i} onClick={() => (has("ovn") ? onStation("ovn") : onOpen())}>
              <span>
                {g.furnaces.length > 1 ? `Ovn ${i + 1}` : "Ovn"}
                {badge(ready("ovn"))}
              </span>
              <Bar value={st.progress ?? 0} tone="warning" label="Smelting" />
              <small className={f.heat ? "" : "is-waiting"}>{f.heat ? `Smelter` : st.text}</small>
            </button>
          );
        })}
        <button className="g-mini" onClick={() => (has("stoping") ? onStation("stoping") : onOpen())}>
          <span>Støping{badge(ready("stoping"))}</span>
          <Bar value={castHead ? g.castProgressT / castHead.t : 0} tone="ok" label="Støping" />
          <small className={g.castWait ? "is-waiting" : ""}>{g.castWait ?? (castHead ? "Støper" : "Venter")}</small>
        </button>
        <button className="g-mini" onClick={() => (ready("lager") ? onStation("lager") : go("salg", "lager"))}>
          <span>Lager{badge(ready("lager"))}</span>
          <Bar
            value={stats.storeUsed / stats.storeT}
            tone={stats.storeUsed > stats.storeT * 0.9 ? "critical" : "accent"}
            label="Ferdigvarelager"
          />
          <small>{fmtT(stats.storeUsed)}</small>
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
        Se hele anlegget, utstyr, vedlikehold og kvalitet →
      </button>
    </section>
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
          📖 Åpne
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

/** Utfordringer på storverket (B-090): noe å strekke seg etter når alt er kjøpt */
function ChallengesCard({ g }: { g: GameState }) {
  if (g.stage < CHALLENGE_STAGE) return null;
  return (
    <Card title={`Utfordringer (${challengesDone(g)} av ${CHALLENGES.length})`}>
      {CHALLENGES.map((c) => {
        const done = !!g.missions[c.id]?.done;
        const p = challengeProgress(g, c);
        return (
          <div key={c.id} className={`g-mission${done ? " is-done" : ""}`}>
            <strong>
              {done ? "✓ " : ""}
              {c.title}
            </strong>
            {!done && <Bar value={challengeShare(g, c)} tone="ok" label="Fremdrift" />}
            <span className="g-muted">
              {done
                ? "Klart!"
                : c.lower
                  ? p > 0
                    ? `Beste døgn: ${fmtNum(p, 0)} ${c.unit}. ${c.how}`
                    : c.how
                  : `${fmtNum(Math.floor(p), 0)} av ${fmtNum(c.goal, 0)} ${c.unit ?? ""}. ${c.how}`}
              {!done &&
                ` · ${[c.fp ? `${c.fp} fagpoeng` : "", c.cash ? fmtKr(c.cash) : "", c.rep ? `omdømme +${c.rep}` : ""].filter(Boolean).join(" og ")}`}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

/** Det hjemmeverket tjente et døgn: uten datterverkene og uten investeringer (B-156) */
function plantResult(d: DayFinance): number {
  const income = Object.entries(d.income).reduce((a, [k, v]) => a + (k === "konsern" ? 0 : (v ?? 0)), 0);
  const costs = Object.entries(d.costs).reduce((a, [k, v]) => a + (k === "investering" ? 0 : (v ?? 0)), 0);
  return income - costs;
}

function avgPlantResult(g: GameState): number {
  const days = g.history.slice(-7);
  return days.length ? days.reduce((a, d) => a + plantResult(d), 0) / days.length : 0;
}

export function Overview({ g, stats, act, go, openBook, onOpenSettings }: Props) {
  const [sheet, setSheet] = useState<Station | null>(null);
  const [chosenTab, setTab] = useState<SubTab>("oversikt");
  const [pynt, setPynt] = useState(false);
  // Konsern-fanen finnes bare når konsernet er åpnet; lastes et annet spill, faller valget tilbake til Oversikt
  const tab: SubTab = chosenTab === "konsern" && !g.konsern.unlocked ? "oversikt" : chosenTab;
  const est = recipeEstimate(g, g.targetGrade, stats);
  const order = currentOrder(g);
  const split = gradesInUse(g).length > 1;
  const casting = castingType(g);
  const castHead = g.castQueue[0];
  const y = g.history[g.history.length - 1];
  const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
  // På Oversikt står målkortet øverst når du kan flytte, så hintet om det trengs bare på de andre underfanene (B-068)
  const tips = hints(g, stats).filter((t) => !(t.anchor === "mal" && tab === "oversikt"));
  const upgradesReady = readyUpgrades(g);
  const konsernCanBuy = konsernReady(g);
  const missingNow = missingScrap(g, stats);
  // Varsel om foringen åpner Anlegg og ruller ned til vedlikeholdskortet
  // …og «Du kan flytte inn» åpner Oversikt og ruller til målkortet (B-064)
  const [scrollTo, setScrollTo] = useState<{ id: Anchor; n: number } | null>(null);
  useEffect(() => {
    if (scrollTo) document.getElementById(scrollTo.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTo]);
  const openAnchor = (id: Anchor) => {
    setTab(id === "vedlikehold" ? "anlegg" : "oversikt");
    setScrollTo((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
  };
  const openMaintenance = () => openAnchor("vedlikehold");
  const runHint = (t: Hint) => (t.anchor ? openAnchor(t.anchor) : t.view && go(t.view, t.sub));
  // Kan du flytte, står målkortet øverst i stedet for nederst (B-064)
  const canMove = !!upgradeOptions(g).find((o) => o.kind === "stage")?.available;
  const recent = g.log.slice(-8).reverse();

  return (
    <div className="g-grid">
      {pynt && <PyntModal g={g} stats={stats} act={act} onClose={() => setPynt(false)} />}
      <div className="g-col-wide">
        <div className="g-scene-wrap">
          <PlantScene g={g} stats={stats} />
          <SceneBubbles g={g} />
          <button className="g-scene-pynt" onClick={() => setPynt(true)} aria-label="Pynt verket">
            🎨
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

        {tips.length > 0 && (
          <div className="g-cta-wrap">
            {tips[0].view || tips[0].anchor ? (
              <button className="g-primary g-cta" onClick={() => runHint(tips[0])}>
                {tips[0].text}
              </button>
            ) : (
              <p className="g-note">{tips[0].text}</p>
            )}
            {tips.length > 1 && (
              <ul className="g-more-hints">
                {tips.slice(1).map((t) => (
                  <li key={t.text}>
                    {t.view || t.anchor ? (
                      <button className="g-link" onClick={() => runHint(t)}>
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
        )}

        <div className="g-subtabs" role="tablist" aria-label="Verket">
          {SUBTABS.filter((t) => t.id !== "konsern" || g.konsern.unlocked).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-active" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === "anlegg" && upgradesReady > 0 && (
                <span className="g-badge" aria-label={`${upgradesReady} utstyr du har råd til`}>
                  {upgradesReady}
                </span>
              )}
              {t.id === "konsern" && konsernCanBuy > 0 && (
                <span className="g-badge" aria-label={`${konsernCanBuy} kjøp du har råd til`}>
                  {konsernCanBuy}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "oversikt" && (
        <>
          <div className="g-col-wide">
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
            {/* Dagens oppdrag og uka med daglig belønning (B-149); ikke mens veiledningen pågår */}
            {g.tutorial === null && <DailyCard g={g} act={act} onLogin={onOpenSettings} />}
            {/* Ukens utfordring (B-152) */}
            {g.tutorial === null && <WeeklyCard g={g} act={act} onLogin={onOpenSettings} />}
            <Card title="Produksjon nå">
              {split ? (
                <ul className="g-furnace-grades">
                  {g.furnaces.map((_, i) => {
                    const o = furnaceOrder(g, i);
                    return (
                      <li key={i}>
                        Ovn {i + 1}: <strong>{GRADES[furnaceGrade(g, i)].name}</strong>
                        {o ? ` til ${o.customer} (${fmtT(o.tonnes - o.delivered)} igjen)` : " for lager og spot"}
                      </li>
                    );
                  })}
                </ul>
              ) : order ? (
                <p>
                  Produserer <strong>{GRADES[order.grade].name}</strong> til {order.customer} (
                  {fmtT(order.tonnes - order.delivered)} igjen).
                </p>
              ) : (
                <p className="g-muted">
                  Ingen kontrakt venter på produksjon. Verket lager {GRADES[g.targetGrade].name.toLowerCase()} for lager
                  og spot.
                </p>
              )}
              {(g.stage >= 1 || g.contracts.filter((c) => c.status === "aktiv").length > 1) && (
                <AutoToggle
                  g={g}
                  act={act}
                  k="followQueue"
                  label="Følg ordrekøen (kvalitet og resept skifter etter kontrakten som står først)"
                />
              )}
              {g.furnaces.length > 1 && auto(g, "followQueue") && (
                <AutoToggle
                  g={g}
                  act={act}
                  k="splitGrades"
                  label="To kvaliteter samtidig: ovn 2 lager neste kvalitet i køen når den er en annen enn ovn 1 sin"
                />
              )}
              <label className="g-field">
                <span>{g.furnaces.length > 1 ? "Ovn 1 kjører mot" : "Kjør mot kvalitet"}</span>
                <select
                  value={g.targetGrade}
                  disabled={auto(g, "followQueue") && !!order}
                  onChange={(e) => act((gg) => setTargetGrade(gg, e.target.value as GradeId))}
                >
                  {GRADE_IDS.filter((id) => GRADES[id].minStage <= g.stage || id === g.targetGrade).map((id) => (
                    <option key={id} value={id}>
                      {GRADES[id].name}
                    </option>
                  ))}
                </select>
              </label>
              {g.furnaces.slice(1).map((f, j) => (
                <label className="g-field" key={j}>
                  <span>Ovn {j + 2} kjører mot</span>
                  <select
                    value={f.grade ?? ""}
                    disabled={auto(g, "followQueue") && !!order}
                    onChange={(e) =>
                      act((gg) =>
                        setFurnaceGrade(gg, j + 1, e.target.value === "" ? null : (e.target.value as GradeId)),
                      )
                    }
                  >
                    <option value="">Samme som ovn 1</option>
                    {GRADE_IDS.filter(
                      (id) => id !== g.targetGrade && (GRADES[id].minStage <= g.stage || id === f.grade),
                    ).map((id) => (
                      <option key={id} value={id}>
                        {GRADES[id].name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {split && (
                <p className="g-muted">
                  Hver ovn bruker resepten for sin kvalitet. Stålet går til samme støpemaskin, én øse av gangen.
                  {casting.continuous &&
                    ` Strengstøpingen støper én kvalitet om gangen. Øsa med den andre kvaliteten venter til støpingen har stått en halvtime (sekvensen er slutt), men høyst ${fmtNum(SEQUENCE_WAIT_MIN / 60, 1)} timer. Byttes kvaliteten midt i en sekvens, blir overgangsemnene skrap (ca. ${fmtT(casting.tph * 0.05)}).`}
                </p>
              )}
              <p className="g-muted">{GRADES[g.targetGrade].description}</p>
              <div className="g-estimate">
                <span>Anslag med resepten:</span>
                <AnalysisLine a={est.analysis} />
                <span>Holder:</span>
                <GradeChips
                  grades={est.grades.filter((id) => GRADES[id].minStage <= g.stage)}
                  highlight={g.targetGrade}
                />
              </div>
              {stats.furnace.arc ? (
                <div className="g-manual">
                  <button
                    className={g.settings.manualNext ? "g-primary is-on" : "g-primary"}
                    onClick={() => act((gg) => requestManual(gg, !gg.settings.manualNext))}
                  >
                    {g.settings.manualNext ? "Du tar neste charge ✓" : "Ta styringen på neste charge"}
                  </button>
                  <p className="g-muted">
                    Kjør chargen selv i kontrollrommet. God kjøring gir mindre strøm, lavere fosfor og bedre omdømme.
                  </p>
                </div>
              ) : (
                g.stage >= 2 && <p className="g-muted">Med en lysbueovn kan du ta styringen og kjøre chargene selv.</p>
              )}
            </Card>
          </div>
          <div className="g-col">
            {!canMove && <StageCard g={g} act={act} />}

            <BookCard g={g} openBook={openBook} />
            <ChallengesCard g={g} />
            <AchievementsCard g={g} onOpenPynt={() => setPynt(true)} />
            {/* Loggen synlig på Oversikt, ikke bare under Økonomi (B-098) */}
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
              <p className="g-muted">Alle viktige hendelser ligger i varsellista bak 🔔 øverst.</p>
            </Card>
          </div>
        </>
      )}

      {tab === "anlegg" && (
        <>
          <div className="g-col-wide">
            <Card title="Produksjonen">
              <div className="g-chain">
                <div className="g-chain-step">
                  <h3>Skraplager</h3>
                  <Bar
                    value={stats.yardUsed / stats.yardT}
                    tone={stats.yardUsed < stats.sizeT ? "critical" : "accent"}
                    label="Skraplager"
                  />
                  <p>
                    {fmtT(stats.yardUsed)} av {fmtT(stats.yardT)}
                  </p>
                  {missingNow && (
                    <p className="g-note g-warn">
                      Resepten mangler {missingNow} til neste charge.{" "}
                      {hasGrader(g)
                        ? "Skrapklasseren venter til det kommer, så ovnen står."
                        : "Uten skrapklasser fylles chargen opp med annet skrap, og analysen kan bomme."}
                    </p>
                  )}
                  <div className="g-row">
                    <button
                      className={missingNow ? "g-small g-primary" : "g-small"}
                      onClick={() => go("marked", "skrap")}
                    >
                      Kjøp skrap{missingNow && <span className="g-badge">!</span>}
                    </button>
                    <StationButton g={g} station="skrap" onOpen={setSheet} />
                  </div>
                </div>

                {g.furnaces.map((f, i) => {
                  const st = furnaceState(g, i);
                  return (
                    <div className="g-chain-step" key={i}>
                      <h3>
                        {unitType(g, i).name}
                        {g.furnaces.length > 1 ? ` nr. ${i + 1}` : ""}
                      </h3>
                      {st.progress !== null ? (
                        <Bar value={st.progress} tone="warning" label="Smelting" />
                      ) : (
                        <Bar value={0} />
                      )}
                      <p className="g-chain-state">{st.text}</p>
                      <p className="g-muted">Foring {fmtPct(f.wear)} slitt</p>
                      <StationButton g={g} station="ovn" onOpen={setSheet} />
                    </div>
                  );
                })}

                <div className="g-chain-step">
                  <h3>{casting.name}</h3>
                  {castHead ? (
                    <Bar value={g.castProgressT / castHead.t} tone="ok" label="Støping" />
                  ) : (
                    <Bar value={0} />
                  )}
                  <p>
                    {g.castWait ??
                      (castHead
                        ? `Støper ${fmtT(castHead.t)}${g.castQueue.length > 1 ? ` (+${g.castQueue.length - 1} i kø)` : ""}`
                        : "Venter på stål")}
                  </p>
                  <p className="g-muted">
                    {PRODUCTS[casting.product].name} · utbytte {fmtPct(casting.yield)}
                  </p>
                  <StationButton g={g} station="stoping" onOpen={setSheet} />
                </div>

                {rollingActive(g) && (
                  <div className="g-chain-step">
                    <h3>Valseverk</h3>
                    <p>Valser emner til armeringsstål</p>
                  </div>
                )}

                <div className="g-chain-step">
                  <h3>Ferdigvarelager</h3>
                  <Bar
                    value={stats.storeUsed / stats.storeT}
                    tone={stats.storeUsed > stats.storeT * 0.9 ? "critical" : "accent"}
                    label="Ferdigvarelager"
                  />
                  <p>
                    {fmtT(stats.storeUsed)} av {fmtT(stats.storeT)}
                  </p>
                  <div className="g-row">
                    <button className="g-small" onClick={() => go("salg", "lager")}>
                      Til salg
                    </button>
                    <StationButton g={g} station="lager" onOpen={setSheet} />
                  </div>
                </div>
              </div>
            </Card>
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
        </>
      )}

      {tab === "okonomi" && (
        <>
          <div className="g-col-wide">
            <Card title="Økonomi">
              <div className="g-stats">
                <Stat label="Inntekter i dag" value={fmtKr(sum(g.today.income))} />
                <Stat label="Utgifter i dag" value={fmtKr(sum(g.today.costs))} />
                {y && (
                  <Stat
                    label="Resultat i går"
                    value={fmtKr(sum(y.income) - sum(y.costs))}
                    tone={sum(y.income) - sum(y.costs) >= 0 ? "ok" : "critical"}
                  />
                )}
                {/* Hjemmeverket for seg (B-156): uten datterverkene og uten kjøp, så man ser hva utstyret gir */}
                {y && (g.konsern.unlocked || (y.costs.investering ?? 0) > 0) && (
                  <>
                    <Stat
                      label="Verket i går (drift)"
                      value={fmtKr(plantResult(y))}
                      tone={plantResult(y) >= 0 ? "ok" : "critical"}
                    />
                    <Stat label="Verket, snitt 7 døgn" value={fmtKr(avgPlantResult(g))} />
                    {g.konsern.unlocked && <Stat label="Datterverkene i går" value={fmtKr(y.income.konsern ?? 0)} />}
                    {(y.costs.investering ?? 0) > 0 && (
                      <Stat label="Investert i går" value={fmtKr(y.costs.investering ?? 0)} tone="warning" />
                    )}
                  </>
                )}
                {y && <Stat label="Produsert i går" value={fmtT(y.producedT)} />}
                {y && stats.furnaceMW > 0 && (
                  <Stat label="Strøm og effekt i går" value={fmtKr((y.costs.energi ?? 0) + (y.costs.nett ?? 0))} />
                )}
                {stats.salaryPerDay > 0 && <Stat label="Lønn per døgn" value={fmtKr(stats.salaryPerDay)} />}
                <Stat label="Faste kostnader per døgn" value={fmtKr(STAGES[g.stage].fixedPerDay)} />
                {g.loan > 0 && <Stat label="Lån" value={fmtKr(g.loan)} tone="warning" />}
              </div>
              {y && (g.konsern.unlocked || (y.costs.investering ?? 0) > 0) && (
                <p className="g-muted g-small-text">
                  «Resultat i går» tar med alt: {g.konsern.unlocked ? "overskuddet fra datterverkene og " : ""}det du
                  kjøpte. «Verket (drift)» viser bare det hjemmeverket tjener på stålet, så du ser hva nytt utstyr gir.
                  Kontraktene betales når de er levert, så snittet over 7 døgn er mest rettferdig.
                </p>
              )}
            </Card>
          </div>
          <div className="g-col">
            <BankCard g={g} act={act} />
            <Card title="Logg">
              <ul className="g-log">
                {recent.map((e) => (
                  <li key={e.id} className={`log-${e.kind}`}>
                    <span className="g-log-time">
                      Dag {Math.floor(e.min / 1440) + 1} {fmtClock(e.min)}
                    </span>
                    {e.text}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
      {tab === "konsern" && g.konsern.unlocked && <KonsernTab g={g} act={act} />}
      {sheet && <UpgradeSheet g={g} station={sheet} act={act} onClose={() => setSheet(null)} />}
    </div>
  );
}
