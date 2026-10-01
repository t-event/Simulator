import { useState } from "react";
import { Icon } from "./icons";
import { useReportTab, type OnTab } from "./tabMemory";
import { DirectorCard, DirectorOffer } from "./Konsern";
import {
  BONUS_COOLDOWN_DAYS,
  bonusCost,
  canWarn,
  COURSE_COOLDOWN_DAYS,
  courseSession,
  courseCost,
  fire,
  giveBonus,
  hire,
  hireForMissing,
  LEADER_COURSE_DAYS,
  leaderCourseBlock,
  leaderCourseCost,
  sendOnLeaderCourse,
  hireForWildcards,
  hireTemps,
  hireTempCrew,
  hiredCrewCost,
  sendOnCourse,
  warnAbsence,
} from "../game/actions";
import { SHIFT_LEADER_SICK, sickSpells, WARNING_DAYS } from "../game/engine";
import { CREW_ROLES, ROLE_IDS, ROLES, STAGES, stageRef } from "../game/data";
import { auto } from "../game/research";
import { ageOf, pensionSoon } from "../game/pension";
import {
  bonusGap,
  crewBenefits,
  moraleNormal,
  crewCoverage,
  crewList,
  fireImpact,
  wildcardUse,
  unitType,
  day,
  MAX_CREWS,
  daysUntilAllBack,
  isAbsent,
  moraleFactor,
  nightExtra,
  plannerOrders,
  potRebuildPerDay,
  presentWorkers,
  rollingActive,
  staffing,
  supportAdvice,
  plantRestartMin,
  tempsActive,
  tempsCost,
  type PlantStats,
} from "../game/plant";
import type { GameState, RoleId, Worker } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card, Stat, SubTabs } from "./common";
import { fmtKr, fmtNum } from "./format";
import { ShiftPlan } from "./Power";
import { AutoToggle } from "./AutoToggle";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

/**
 * Hva støtterollene gjør akkurat nå, så spilleren ser at de virker – eller hvorfor de ikke gjør det (B-070).
 * Tallene er de samme som motoren regner med.
 */
function roleEffect(g: GameState, stats: PlantStats, role: RoleId): string | null {
  const present = presentWorkers(g).filter((w) => w.role === role).length;
  const total = g.workers.filter((w) => w.role === role).length;
  const away = total - present;
  const awayText = away > 0 ? ` (${away} borte nå)` : "";
  switch (role) {
    case "salg": {
      const extra = Math.min(3, present) * 0.8 * 0.6;
      const text = `${present} på jobb${awayText}: ca. ${fmtNum(extra, 1)} flere forespørsler per døgn og ${Math.min(4, present) * 2} % bedre pris.`;
      return present > 4 ? `${text} Flere enn fire selgere gir ikke mer.` : text;
    }
    case "murer": {
      if (!stats.furnace.arc)
        return "Murerne murer opp reservepotter til lysbueovnene. Før du har lysbueovn, har de ingenting å gjøre.";
      const perDay = potRebuildPerDay(g);
      // Hver lysbueovn har sin egen reservepotte (B-171)
      const arcs = g.furnaces.filter((_, i) => unitType(g, i).arc);
      const waiting = arcs.filter((f) => f.spareProgress < 1);
      const pots = waiting.length;
      const of = arcs.length > 1 ? ` (${pots} av ${arcs.length} ovner)` : "";
      if (!pots)
        return `${arcs.length > 1 ? `Reservepottene til alle ${arcs.length} lysbueovnene` : "Reservepotta"} er klare${awayText}. Murerne begynner på neste potte etter et pottebytte.`;
      return perDay > 0
        ? `${present} på jobb (07–15)${awayText}: ${pots === 1 ? "reservepotta" : "reservepottene"}${of} blir ferdig på ca. ${fmtNum((1 - Math.min(...waiting.map((f) => f.spareProgress))) / perDay, 1)} døgn.`
        : `Ingen murere på jobb${awayText} – ${pots === 1 ? "reservepotta" : "reservepottene"}${of} blir ikke murt opp.`;
    }
    case "vedlikehold": {
      const cover = Math.min(1, present / Math.max(1, g.stage));
      const auto_ = auto(g, "autoReline");
      return `${present} av ${Math.max(1, g.stage)} som trengs på dette nivået${awayText}: ${Math.round(35 * cover)} % færre uhell og ${Math.round(30 * cover)} % raskere reparasjoner. ${
        auto_
          ? "Bytter foringen automatisk."
          : "Bytter ikke foringen automatisk – slå det på under Verket → Anlegg → Vedlikehold."
      }`;
    }
    case "planlegger": {
      if (!present && !plannerOrders(g)) return "Borte nå – ingen kjøper skrap for deg.";
      const buys = auto(g, "autoBuy");
      const sorts = auto(g, "plannerSorts");
      return `${buys ? "Kjøper skrap etter resepten." : "Kjøper ikke skrap ennå – forsk fram «Innkjøpsplan» og slå på innkjøp under Marked."} ${
        sorts ? "Sorterer ordrekøen etter frist." : "Sorterer ikke ordrekøen – det krever «Ordreplanlegging»."
      }${awayText}`;
    }
    case "klasser":
      return present
        ? "På jobb: chargene får blandingen resepten sier, dårlige skrappartier sendes i retur, og resepten legges om når kvaliteten skifter."
        : "Borte nå – chargene blir omtrentlige, og resepten legges ikke om.";
    case "lab":
      return stats.furnace.arc && g.owned.includes("oseovn")
        ? `Kjører øseovnen og holder karbonet presist${awayText}.`
        : "Trengs først når du har lysbueovn og øseovn. Til da fyller de bare plasser som avløsere ikke kan ta.";
    case "valse":
      return rollingActive(g) ? `Kjører valseverket${awayText}.` : "Trengs først når valseverket går.";
    case "skiftleder": {
      const often = g.workers.filter((w) => canWarn(g, w)).length;
      return present
        ? `På jobb${awayText}: følger opp fraværet og gir advarsel til dem som misbruker egenmelding. ${Math.round((1 - SHIFT_LEADER_SICK) * 100)} % færre syke.`
        : `Borte nå – fraværet følges ikke opp${often ? ` (${often} med mye fravær)` : ""}.`;
    }
    case "allround":
      return `${present} på jobb${awayText}: fyller plasser som mangler på skiftene (ovn, støping, kran, øseovn, valseverk).`;
    default:
      return null;
  }
}

/** Hvorfor den ansatte er borte, med vanlige ord */
function absenceName(w: Worker): string {
  return w.absentReason === "syk" ? "Syk" : w.absentReason === "lederkurs" ? "Lederutvikling" : "Ferie";
}

/** Anbefalte støtteroller når skiftene er fulle (B-096) */
function SupportCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const advice = supportAdvice(g);
  // Søkere som kan ta plassene avløserne står fast på (B-170)
  const wild = wildcardUse(g);
  const fits = Object.entries(wild.byRole).reduce(
    (a, [r, n]) => a + Math.min(n ?? 0, g.candidates.filter((c) => c.role === r).length),
    0,
  );
  const room = STAGES[g.stage].staffCap - g.workers.length;
  if (!advice.length) return null;
  const short = advice.filter((a) => a.have < a.want);
  return (
    <Card title="Anbefalt i tillegg til skiftene">
      <p className="g-muted">
        {short.length
          ? "Skiftene er fulle. Disse rollene står ikke på skift, men gjør verket bedre:"
          : "Skiftene er fulle, og du har det som anbefales av støtteroller."}
      </p>
      <ul className="g-support">
        {advice.map((a) => (
          <li key={a.role} className={a.have < a.want ? "is-short" : ""}>
            <strong>
              {a.have >= a.want ? "✓ " : ""}
              {a.role === "allround" ? "Ledige avløsere" : ROLES[a.role].plural}:{" "}
              {a.want === 0 ? `${a.have} – trengs ikke nå` : `${a.have} av ${a.want}`}
            </strong>
            <span className="g-muted">{a.why}</span>
            {a.note && <span className="g-muted g-support-note">{a.note}</span>}
            {/* Ansett rett fra anbefalingen (B-210): den flinkeste søkeren i rollen */}
            {a.role !== "allround" && a.have < a.want && (
              <span className="g-support-action">
                {(() => {
                  const best = g.candidates.filter((c) => c.role === a.role).sort((x, y) => y.skill - x.skill)[0];
                  if (room <= 0) return <span className="g-muted">Det er ikke plass til flere ansatte.</span>;
                  if (!best)
                    return <span className="g-muted">Ingen søkere i rollen i dag. Nye kommer hver morgen.</span>;
                  return (
                    <button onClick={() => act((gg) => hire(gg, best.id))}>
                      Ansett {ROLES[a.role].name.toLowerCase()} ({fmtNum(best.skill, 1)} av 5)
                    </button>
                  );
                })()}
              </span>
            )}
            {a.role === "allround" && wild.tied > 0 && (
              <span className="g-support-action">
                {fits > 0 && room > 0 ? (
                  <button onClick={() => act((gg) => hireForWildcards(gg))}>
                    Ansett til plassene ({Math.min(wild.tied, fits, room)})
                  </button>
                ) : (
                  <span className="g-muted">
                    {room <= 0
                      ? "Det er ikke plass til flere ansatte."
                      : "Ingen søkere med de rollene i dag. Nye kommer hver morgen."}
                  </span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
      {short.length > 0 && <p className="g-muted">Ansett under «Ansett». Søkerne har rollen sin oppgitt.</p>}
    </Card>
  );
}

function Stars({ skill }: { skill: number }) {
  const full = Math.round(skill);
  return (
    <span
      className="g-stars"
      title={`Ferdighet ${fmtNum(skill, 1)} av 5`}
      aria-label={`Ferdighet ${fmtNum(skill, 1)} av 5`}
    >
      {/* Stjerneikoner (B-237), fylte for ferdigheten den ansatte har */}
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" className={i < full ? "is-on" : ""} />
      ))}
    </span>
  );
}

/** Hva skjer med skiftene hvis den ansatte slutter (B-164) – vises før man bekrefter */
function FireImpact({ g, id }: { g: GameState; id: number }) {
  const { before, after, missing } = fireImpact(g, id);
  if (after >= before) return <span className="g-muted g-small-text">Skiftene går som før.</span>;
  return (
    <span className="g-bad-text g-small-text">
      Da går verket {after > 3 ? `${after} lag` : `${after} skift`} i stedet for{" "}
      {before > 3 ? `${before} lag` : `${before} skift`}: det mangler {crewList(missing)}.
    </span>
  );
}

/** Når lærlingen tar fagprøven (B-163). Til da står lærlingen ikke på skiftene (B-357) */
function ApprenticeBadge({ left }: { left: number }) {
  return (
    <span className="g-muted g-worker-exam">
      {" "}
      · <Icon name="graduation-cap" /> {left <= 0 ? "Fagprøve i dag" : `Fagprøve om ${left} døgn`}, ikke på skift ennå
    </span>
  );
}

/** Pensjon innen en måned (B-357) */
function PensionBadge({ left }: { left: number }) {
  return (
    <span className="g-muted g-worker-exam">
      {" "}
      · {left <= 0 ? "Går av med pensjon i dag" : `Pensjon om ${left} døgn`}
    </span>
  );
}

function WorkerRow({
  w,
  action,
  away,
  sick,
  today,
  candidate,
}: {
  w: Worker;
  action: React.ReactNode;
  away?: string;
  sick?: number;
  today?: number;
  /** Søker, ikke ansatt: ingen pensjonsmerke */
  candidate?: boolean;
}) {
  const hiredWorker = !candidate;
  return (
    <li className="g-worker">
      <div>
        <strong>{w.name}</strong>
        <span className="g-muted">
          {" "}
          · {ROLES[w.role].name}
          {today !== undefined && w.born !== undefined && ` · ${ageOf(w, today)} år`}
        </span>
        {away && <span className="g-badge-bad g-worker-away"> {away}</span>}
        {!!sick && sick >= 3 && <span className="g-badge-bad g-worker-away"> Syk {sick}× på 60 døgn</span>}
        {w.apprenticeUntil !== undefined && today !== undefined && <ApprenticeBadge left={w.apprenticeUntil - today} />}
        {hiredWorker && today !== undefined && pensionSoon(w, today) !== null && (
          <PensionBadge left={pensionSoon(w, today) ?? 0} />
        )}
      </div>
      <Stars skill={w.skill} />
      <span className="g-muted">{fmtKr(w.salary)}/dag</span>
      {action}
    </li>
  );
}

/** Trivsel: gjør folk bedre eller dårligere, og lav trivsel får dem til å slutte (B-026) */
function Morale({ g, stats, act }: Props) {
  if (!g.workers.length) return null;
  const m = g.morale;
  const tone = m >= 60 ? "ok" : m >= 35 ? "warning" : "critical";
  const nextBonus = g.lastBonusDay + BONUS_COOLDOWN_DAYS;
  const effect = Math.round((moraleFactor(g) - 1) * 100);
  return (
    <Card title="Trivsel">
      <div className="g-goal">
        <span>Trivsel</span>
        <Bar value={m / 100} tone={tone} label="Trivsel" />
        <span>{Math.round(m)} av 100</span>
      </div>
      <p className="g-muted">
        {m >= 60
          ? "Folk trives og lærer raskt."
          : m >= 35
            ? "Stemningen er så som så."
            : "Folk mistrives, og noen kan si opp."}{" "}
        Innsatsen er {effect >= 0 ? `${effect} % bedre` : `${-effect} % dårligere`} enn ferdigheten tilsier.
      </p>
      {bonusGap(g) > 0 && (
        <p className="g-note g-warn">
          Det er {day(g) - g.lastBonusDay > 900 ? "lenge" : `${day(g) - g.lastBonusDay} døgn`} siden forrige bonus, så
          trivselen synker mot {Math.round(moraleNormal(g))} i stedet for {Math.round(moraleNormal(g) + bonusGap(g))}.
          En bonus løfter den med én gang.
        </p>
      )}
      <p className="g-muted">
        Trivselen stiger med bonus, kurs, lønnstillegg og leveranser i tide. Den synker med havarier, reklamasjoner,
        avslåtte lønnskrav
        {nightExtra(g, stats.hours) > 0 ? " og nattskift (som du har nå)" : " og nattskift"}.
      </p>
      <button className="g-primary" disabled={day(g) < nextBonus} onClick={() => act((gg) => giveBonus(gg))}>
        {day(g) < nextBonus ? `Bonus igjen dag ${nextBonus}` : `Gi alle bonus (${fmtKr(bonusCost(g))})`}
      </button>
      {/* Skiftlederen gir bonus (B-271): valget vises når du har en skiftleder */}
      {g.workers.some((w) => w.role === "skiftleder") && (
        <label className="g-toggle">
          <input
            type="checkbox"
            checked={!!g.settings.leaderBonus}
            onChange={(e) => act((gg) => void (gg.settings.leaderBonus = e.target.checked))}
          />
          <span>
            Skiftlederen gir alle bonus når det trengs
            <span className="g-toggle-hint g-muted">
              Når det er lenge siden forrige bonus og trivselen synker, eller trivselen er lav – og bare når kassa har
              god råd.
            </span>
          </span>
        </label>
      )}
    </Card>
  );
}

/** Fravær: hvem som er borte nå og hvem som skal ha ferie, og vikarer (B-031) */
/** Ansatte som ofte er syke, med mulighet for advarsel (B-101) */
function FrequentAbsence({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const often = g.workers.filter((w) => sickSpells(g, w) >= 2).sort((a, b) => sickSpells(g, b) - sickSpells(g, a));
  return (
    <>
      <h3 className="g-subhead">Fravær per ansatt (siste 60 døgn)</h3>
      {often.length === 0 ? (
        <p className="g-muted">Ingen har vært syke mer enn én gang de siste 60 døgnene.</p>
      ) : (
        <ul className="g-absence">
          {often.slice(0, 12).map((w) => {
            const n = sickSpells(g, w);
            const warned = w.warnedDay !== undefined && day(g) - w.warnedDay < WARNING_DAYS;
            return (
              <li key={w.id}>
                <strong>{w.name}</strong> <span className="g-muted">· {ROLES[w.role].name}</span>
                <span className={n >= 3 ? "g-badge-bad" : "g-muted"}>Syk {n} ganger</span>
                {warned ? (
                  <span className="g-muted">Advart dag {w.warnedDay}</span>
                ) : (
                  canWarn(g, w) && (
                    <button className="g-small" onClick={() => act((gg) => warnAbsence(gg, w.id))}>
                      Gi advarsel
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="g-muted">
        Noen misbruker egenmelding. En advarsel til den som er borte tre ganger eller mer, gjør fraværet sjeldnere – men
        var personen faktisk syk, synes kollegene det er urettferdig, og trivselen går ned.
      </p>
    </>
  );
}

function Absence({ g, stats, act }: Props) {
  if (!g.workers.length) return null;
  const now = g.workers.filter((w) => isAbsent(g, w));
  const upcoming = g.workers
    .filter((w) => w.absentReason === "ferie" && (w.absentFrom ?? 0) > g.minute)
    .sort((a, b) => (a.absentFrom ?? 0) - (b.absentFrom ?? 0));
  const full = staffing(g, true).shifts;
  const temps = tempsActive(g);
  const backDays = daysUntilAllBack(g);
  // Går vikarene hjem før alle er tilbake? (B-039)
  const lastBack = Math.max(0, ...now.map((w) => w.absentUntil ?? 0));
  const tempsShort = temps && g.tempsUntilMin < lastBack;
  // Står hele verket, trengs ingen vikarer før ovnene starter igjen (B-346)
  const restart = plantRestartMin(g);
  const leader = !!g.settings.leaderTemps && g.workers.some((w) => w.role === "skiftleder");
  return (
    <Card title="Fravær">
      {now.length === 0 && upcoming.length === 0 && (
        <p className="g-muted">
          Ingen er borte. Ferie kommer av seg selv og varsles tre døgn før. Folk blir oftere syke når trivselen er lav
          eller verket går nattskift.
        </p>
      )}
      {now.length > 0 && (
        <ul className="g-absence">
          {now.map((w) => (
            <li key={w.id}>
              <strong>{w.name}</strong> <span className="g-muted">· {ROLES[w.role].name}</span>
              <span className={w.absentReason === "syk" ? "g-badge-bad" : "g-badge-ok"}>
                {absenceName(w)} til dag {day(g, (w.absentUntil ?? 0) - 1)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {now.length > 0 &&
        (restart !== null && !temps ? (
          <p className="g-note">
            Verket står til dag {day(g, restart)}, så ingen vikarer trengs nå.{" "}
            {leader || auto(g, "autoTemps")
              ? "Er noen fortsatt borte når ovnene skal i gang, leies vikarer inn da."
              : "Er noen fortsatt borte når ovnene skal i gang, kan du leie inn vikarer da."}
          </p>
        ) : temps ? (
          <p className={tempsShort ? "g-note g-warn" : "g-note"}>
            Vikarer dekker fraværet til dag {day(g, g.tempsUntilMin - 1)}.
            {tempsShort &&
              ` Noen er borte til dag ${day(g, lastBack - 1)} – når vikarene går hjem, går verket færre skift igjen.`}
          </p>
        ) : stats.shifts < full ? (
          <p className="g-note g-warn">
            Fraværet koster skift: verket går {stats.shifts} skift i stedet for {full}. Lei inn vikarer, eller vent til
            folk er tilbake.
          </p>
        ) : (
          <p className="g-muted">Avløsere dekker plassene til dem som er borte, så verket går som normalt.</p>
        ))}
      {now.length > 0 && (!temps || tempsShort) && restart === null && (
        <div className="g-row">
          <button className="g-primary" onClick={() => act((gg) => hireTemps(gg, null))}>
            Vikarer til alle er tilbake ({backDays} døgn, {fmtKr(tempsCost(g, backDays))})
          </button>
          {!temps && backDays > 1 && (
            <button onClick={() => act((gg) => hireTemps(gg, 1))}>Vikarer i 1 døgn ({fmtKr(tempsCost(g, 1))})</button>
          )}
        </div>
      )}
      <AutoToggle
        g={g}
        act={act}
        k="autoTemps"
        label="Lei inn vikarer av seg selv når fravær ellers ville kostet skift"
      />
      {/* Skiftlederen og vikarene (B-211): valget vises når du har en skiftleder */}
      {g.workers.some((w) => w.role === "skiftleder") && (
        <label className="g-toggle">
          <input
            type="checkbox"
            checked={!!g.settings.leaderTemps}
            onChange={(e) => act((gg) => void (gg.settings.leaderTemps = e.target.checked))}
          />
          <span>
            Skiftlederen leier inn vikarer for alle som er borte
            <span className="g-toggle-hint g-muted">
              Også når skiftene går likevel, men ikke mens hele verket står. Vikarer koster halvannen gang lønna, men
              verket mister verken folk eller ferdighet.
            </span>
          </span>
        </label>
      )}
      {upcoming.length > 0 && (
        <>
          <h3 className="g-subhead">Ferie som kommer</h3>
          <ul className="g-absence">
            {upcoming.slice(0, 5).map((w) => (
              <li key={w.id}>
                <strong>{w.name}</strong> <span className="g-muted">· {ROLES[w.role].name}</span>
                <span className="g-muted">
                  dag {day(g, w.absentFrom ?? 0)}–{day(g, (w.absentUntil ?? 0) - 1)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <FrequentAbsence g={g} act={act} />
    </Card>
  );
}

type PeopleTab = "skift" | "ansett" | "ansatte" | "fravaer";

/** Bemanningstabellen: hvem som står hvor på skiftene, med avløsere og vikarer */
function CrewTable({ g, stats, shifts }: { g: GameState; stats: PlantStats; shifts: number }) {
  const coverage = crewCoverage(g, stats.crew, shifts);
  const count = (r: RoleId) => g.workers.filter((w) => w.role === r).length;
  const label = (r: RoleId, n: number) => `${n} ${(n === 1 ? ROLES[r].name : ROLES[r].plural).toLowerCase()}`;
  const inTable = new Set(coverage.rows.map((row) => row.role));
  // Roller som ikke står på skiftene, og skiftroller verket ikke bruker nå (f.eks. øseovnsoperatør uten øseovn)
  const others = ROLE_IDS.filter((r) => !CREW_ROLES.includes(r) && r !== "allround" && count(r) > 0).map((r) =>
    label(r, count(r)),
  );
  const idle = CREW_ROLES.filter((r) => !inTable.has(r) && count(r) > 0).map((r) => label(r, count(r)));
  // Snittferdigheten til egne folk i rollen (B-204): viser hvor et kurs eller en flink søker gir mest
  const skillOf = (r: RoleId) => {
    const ws = g.workers.filter((w) => w.role === r);
    return ws.length ? ws.reduce((a, w) => a + w.skill, 0) / ws.length : null;
  };
  const fmtSkill = (v: number | null) => (v === null ? "–" : fmtNum(Math.floor(v * 10) / 10, 1));
  return (
    <>
      <table className="g-table g-crew-table">
        <thead>
          <tr>
            <th>Plass</th>
            <th className="num">
              Trengs
              <br />
              <span className="g-muted">{shifts > 3 ? `${shifts} lag` : `${shifts} skift`}</span>
            </th>
            <th className="num">Fylt av</th>
            <th className="num g-col-skill">Ferdighet</th>
            <th className="num">Mangler</th>
          </tr>
        </thead>
        <tbody>
          {coverage.rows.map((row) => (
            <tr key={row.role}>
              <td>{ROLES[row.role].plural}</td>
              <td className="num">
                {row.need}
                <span className="g-muted g-sub">
                  {row.perShift} per {shifts > 3 ? "lag" : "skift"}
                </span>
              </td>
              <td className="num">
                {row.own - row.hired} {row.own - row.hired === 1 ? "egen" : "egne"}
                {row.hired > 0 && <span className="g-muted g-sub">+ {row.hired} innleid</span>}
                {row.temps > 0 && (
                  <span className="g-muted g-sub">
                    {row.temps} borte, vikar{row.temps === 1 ? "" : "er"} dekker
                  </span>
                )}
                {row.away > row.temps && <span className="g-muted g-sub">{row.away - row.temps} borte</span>}
                {row.filled > 0 && (
                  <span className="g-muted g-sub">
                    + {row.filled} {row.filled === 1 ? "avløser" : "avløsere"}
                  </span>
                )}
              </td>
              <td className="num g-col-skill">{fmtSkill(skillOf(row.role))}</td>
              <td className={`num${row.missing ? " bad" : ""}`}>{row.missing || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="g-muted">
        {coverage.wildcards > 0
          ? coverage.ownerSlots
            ? `Avløsere (og du selv på dagskiftet) går dit det mangler folk: ${coverage.wildUsed} av ${coverage.wildcards} er i bruk.`
            : `Avløsere går dit det mangler folk: ${coverage.wildUsed} av ${coverage.wildcards} står på en plass nå, ${coverage.wildcards - coverage.wildUsed} ${coverage.wildcards - coverage.wildUsed === 1 ? "er ledig" : "er ledige"} til fravær. Sier du opp en avløser som står på en plass, mangler den plassen.`
          : "Avløsere kan ta plassen til den som mangler på skiftet."}
        {others.length > 0 && ` Andre jobber (ikke på skift): ${others.join(", ")}.`}
        {idle.length > 0 && ` Trengs ikke nå, men tar plass blant de ansatte: ${idle.join(", ")}.`}
      </p>
    </>
  );
}

export function People({ g, stats, act, openTab, onTab }: Props & { openTab?: string; onTab?: OnTab }) {
  // Et varsel kan åpne en bestemt fane, f.eks. Fravær (B-152)
  const [tab, setTab] = useState<PeopleTab>(() =>
    openTab === "ansett" || openTab === "ansatte" || openTab === "fravaer" ? openTab : "skift",
  );
  useReportTab(tab, onTab);
  const [confirmFire, setConfirmFire] = useState<number | null>(null);
  const [confirmLeader, setConfirmLeader] = useState<number | null>(null);
  // Søkere filtrert på rolle, og én «Mer» per ansatt i stedet for tre knapper (B-414)
  const [roleFilter, setRoleFilter] = useState<RoleId | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const cap = STAGES[g.stage].staffCap;
  // På storverket finnes det ikke noe større sted å flytte til (B-171)
  const topStage = g.stage >= STAGES.length - 1;
  const candidateRoles = ROLE_IDS.filter((r) => g.candidates.some((c) => c.role === r));
  // Filteret slippes når den siste søkeren med rollen er ansatt eller borte
  const activeFilter = roleFilter && candidateRoles.includes(roleFilter) ? roleFilter : null;
  const session = courseSession(g);
  const counts = Object.fromEntries(ROLE_IDS.map((r) => [r, g.workers.filter((w) => w.role === r).length])) as Record<
    RoleId,
    number
  >;
  // Plasser som mangler uten å regne med fravær: det er dem man ansetter til (fravær dekkes av vikarer)
  const permanent = staffing(g, true);
  // Tabellen viser neste skift hvis verket ikke går alle tre, ellers alle skiftlagene (3–5) uten å regne med fravær
  const planShifts = stats.shifts < 3 ? stats.shifts + 1 : Math.max(3, permanent.crews);
  // Skiftlagene verket er bemannet for (fravær trekker ikke fra; det vises for seg)
  const crews = Math.max(stats.crews, permanent.crews);
  const missing = Object.entries(permanent.missing).filter(([, n]) => (n ?? 0) > 0) as [RoleId, number][];
  const away = g.workers.filter((w) => isAbsent(g, w));
  const fullShifts = staffing(g, true).shifts;
  const absenceCosts = away.length > 0 && !tempsActive(g) && stats.shifts < fullShifts && plantRestartMin(g) === null;
  const full = cap > 0 && g.workers.length >= cap;
  const hiredActive = !!g.tempCrew && g.tempCrew.untilMin > g.minute;
  const tabs: { id: PeopleTab; label: string; count?: number; alert?: boolean }[] = [
    { id: "skift", label: "Skift" },
    { id: "ansett", label: "Ansett", count: cap > 0 ? g.candidates.length : 0 },
    { id: "ansatte", label: "Ansatte", count: g.workers.length },
    { id: "fravaer", label: "Fravær", count: away.length, alert: absenceCosts },
  ];
  const shown: PeopleTab = cap === 0 && !g.workers.length ? "skift" : tab;

  const crewTable = stats.crew && Object.keys(stats.crew).length > 0;
  return (
    <div className={`g-grid g-folk is-${shown}`}>
      <div className="g-col-wide">
        {(cap > 0 || g.workers.length > 0) && <SubTabs tabs={tabs} value={shown} onChange={setTab} label="Folk" />}

        {shown === "skift" && (
          <div className="g-folk-cols">
            <div className="g-folk-main">
              <Card title="Skiftene">
                <p className="g-big-status">
                  {stats.hours >= 24 ? (
                    <>
                      Verket går <strong>døgnet rundt</strong> med <strong>{crews} skiftlag</strong>
                      <span className="g-muted">
                        {" "}
                        · {crews}‑skift
                        {stats.crews < crews ? ` · fraværet gjør at bare ${stats.crews} lag er fulle nå` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      Verket går <strong>{stats.shifts} av 3 skift</strong>
                      <span className="g-muted"> · {stats.hours} timer i døgnet</span>
                    </>
                  )}
                </p>
                {stats.crews > 3 && stats.hours >= 24 && (
                  <p className="g-note">
                    <strong>{stats.crews}-skift:</strong> døgnet har tre skift à 8 timer, men med {stats.crews} skiftlag
                    som bytter på, får turnusen fridager. Trivselen blir bedre, færre blir syke (
                    {Math.round((1 - crewBenefits(stats.crews, stats.hours).sick) * 100)} % færre), folk lærer{" "}
                    {Math.round((crewBenefits(stats.crews, stats.hours).learn - 1) * 100)} % fortere, og de ekstra
                    lagene dekker fravær, så verket ikke mister skift.
                  </p>
                )}
                {stats.ownerWorks && (
                  <p className="g-muted">
                    Du står selv i produksjonen på dagskiftet
                    {g.stage === 0 ? " og gjør alt." : " og fyller to plasser."}
                    {g.stage === 0
                      ? ` Ansatte kan du ha når du har flyttet til ${stageRef(1, g.stage)}.`
                      : ` Når du flytter til ${stageRef(2, g.stage)}, blir du daglig leder, og da må alle plassene fylles av ansatte.`}
                  </p>
                )}
                {absenceCosts && (
                  <p className="g-note g-warn">
                    {away.length === 1 ? "Én ansatt" : `${away.length} ansatte`} er borte, så verket går {stats.shifts}{" "}
                    skift i stedet for {fullShifts}.{" "}
                    <button className="g-link" onClick={() => setTab("fravaer")}>
                      Se fravær og vikarer
                    </button>
                  </p>
                )}
                {permanent.shifts < 3 && cap > 0 && missing.length > 0 && (
                  <div className="g-note">
                    For {permanent.shifts + 1} skift mangler:{" "}
                    {missing
                      .map(([r, n]) => `${n} ${(n === 1 ? ROLES[r].name : ROLES[r].plural).toLowerCase()}`)
                      .join(", ")}
                    .
                    {full ? (
                      <p className="g-small-text">
                        Verket er fullt: {cap} av {cap} ansatte. Lei inn vikarer til plassene
                        {topStage
                          ? " eller si opp noen som ikke trengs på skiftene."
                          : ", si opp noen som ikke trengs på skiftene, eller flytt til et større verk."}
                      </p>
                    ) : (
                      <p className="g-small-text">
                        Vikarer for fravær dekker bare folk som er borte. Plasser ingen har, må du ansette til – eller
                        leie inn.
                      </p>
                    )}
                    <div className="g-row">
                      {!full && (
                        <button className="g-primary" onClick={() => act((gg) => hireForMissing(gg))}>
                          Ansett til manglende plasser
                        </button>
                      )}
                      <button className={full ? "g-primary" : ""} onClick={() => act((gg) => hireTempCrew(gg, 3))}>
                        Lei inn vikarer i 3 døgn ({fmtKr(hiredCrewCost(g, 3))})
                      </button>
                    </div>
                  </div>
                )}
                {permanent.shifts >= 3 && !stats.ownerWorks && permanent.crews < MAX_CREWS && cap > 0 && (
                  <div className="g-note">
                    <strong>{permanent.crews + 1}-skift:</strong> med {permanent.crews + 1} skiftlag i stedet for{" "}
                    {permanent.crews} får turnusen fridager: bedre trivsel, mindre sykdom, raskere læring, og fravær
                    dekkes uten vikarer. Koster lønn til ett lag til.
                    {missing.length > 0 && (
                      <p className="g-small-text">
                        {wildcardUse(g).spare > 0 ? "De ledige avløserne er regnet med. Mangler: " : "Mangler: "}
                        {missing
                          .map(([r, n]) => `${n} ${(n === 1 ? ROLES[r].name : ROLES[r].plural).toLowerCase()}`)
                          .join(", ")}
                        .
                      </p>
                    )}
                    {full || g.workers.length + missing.reduce((a, [, n]) => a + n, 0) > cap ? (
                      <p className="g-small-text">
                        Det er ikke plass til et lag til ({g.workers.length} av {cap} ansatte).{" "}
                        {topStage
                          ? "Si opp folk som ikke trengs."
                          : "Flytt til et større verk, eller si opp folk som ikke trengs."}
                      </p>
                    ) : (
                      <div className="g-row">
                        <button onClick={() => act((gg) => hireForMissing(gg, permanent.crews + 1))}>
                          Ansett til {permanent.crews + 1}-skift
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {hiredActive && (
                  <p className="g-note">
                    Innleide vikarer:{" "}
                    {Object.entries(g.tempCrew!.crew)
                      .filter(([, n]) => (n ?? 0) > 0)
                      .map(
                        ([r, n]) =>
                          `${n} ${(n === 1 ? ROLES[r as RoleId].name : ROLES[r as RoleId].plural).toLowerCase()}`,
                      )
                      .join(", ")}{" "}
                    til dag {day(g, g.tempCrew!.untilMin - 1)}. De koster halvannen gang lønna og teller ikke som
                    ansatte.
                  </p>
                )}
                <div className="g-stats">
                  <Stat label="Ansatte" value={`${g.workers.length} / ${cap}`} />
                  <Stat label="Lønn per døgn" value={fmtKr(stats.salaryPerDay)} />
                  <Stat label="Ferdighet" value={`${fmtNum(stats.crewSkill, 1)} av 5`} />
                </div>
                {/* Mobil: tabellen bak et trykk. PC: alltid synlig i høyre kolonne (B-204) */}
                {crewTable && (
                  <details className="g-details g-mobile-only">
                    <summary>Se hvem som står hvor</summary>
                    <CrewTable g={g} stats={stats} shifts={planShifts} />
                  </details>
                )}
              </Card>
              {permanent.shifts >= 3 && <SupportCard g={g} act={act} />}
              <ShiftPlan g={g} stats={stats} act={act} />
            </div>
            {crewTable && (
              <div className="g-folk-side g-pc-only">
                <Card title="Bemanning">
                  <CrewTable g={g} stats={stats} shifts={planShifts} />
                </Card>
              </div>
            )}
          </div>
        )}

        {shown === "ansett" && (
          <Card title="Søkere">
            {cap === 0 ? (
              <p className="g-muted">
                Det er ikke plass til ansatte i garasjen. Du kan ansette når du har flyttet til {stageRef(1, g.stage)}–
                se «Mål» på Verket.
              </p>
            ) : g.candidates.length === 0 ? (
              <p className="g-muted">Ingen søkere i dag. Nye kommer hver morgen.</p>
            ) : (
              <>
                {g.workers.length >= cap && (
                  <p className="g-note g-warn">
                    {/* På storverket finnes det ikke noe større sted (B-171) */}
                    {topStage
                      ? `Verket er fullt (${cap} ansatte). Vil du ansette noen av søkerne, må du si opp noen først – f.eks. ledige avløsere eller støtteroller det er flere av enn anbefalt.`
                      : `Verket er fullt (${cap} ansatte). Flytt til et større sted for flere.`}
                  </p>
                )}
                {candidateRoles.length > 1 && (
                  <div className="g-chip-row g-candidate-filter" role="group" aria-label="Vis søkere">
                    <button
                      className={`g-chip-btn${!activeFilter ? " is-on" : ""}`}
                      aria-pressed={!activeFilter}
                      onClick={() => setRoleFilter(null)}
                    >
                      Alle ({g.candidates.length})
                    </button>
                    {candidateRoles.map((r) => (
                      <button
                        key={r}
                        className={`g-chip-btn${activeFilter === r ? " is-on" : ""}`}
                        aria-pressed={activeFilter === r}
                        onClick={() => setRoleFilter(activeFilter === r ? null : r)}
                      >
                        {ROLES[r].name} ({g.candidates.filter((c) => c.role === r).length})
                      </button>
                    ))}
                  </div>
                )}
                {activeFilter && <p className="g-muted g-small-text">{ROLES[activeFilter].description}</p>}
                <ul className="g-workers">
                  {g.candidates
                    .filter((w) => !activeFilter || w.role === activeFilter)
                    .map((w) => (
                      <WorkerRow
                        key={w.id}
                        w={w}
                        today={day(g)}
                        candidate
                        action={
                          <button
                            className="g-primary g-small"
                            disabled={g.workers.length >= cap}
                            onClick={() => act((gg) => hire(gg, w.id))}
                          >
                            Ansett
                          </button>
                        }
                      />
                    ))}
                </ul>
              </>
            )}
            {/* Salgsdirektøren ansettes også her (B-210), der man ansetter folk */}
            {g.konsern?.unlocked && (
              <div className="g-hire-director">
                <h3 className="g-subhead">Ledelse</h3>
                <DirectorOffer g={g} act={act} />
                {g.konsern.director && (
                  <p className="g-muted g-small-text">
                    Salgsdirektøren er ansatt. Oppgraderinger og oppsigelse finner du under Ansatte.
                  </p>
                )}
              </div>
            )}
            {!activeFilter && (
              <details className="g-details">
                <summary>Hva gjør de ulike rollene?</summary>
                <dl className="g-roles">
                  {ROLE_IDS.map((r) => (
                    <div key={r}>
                      <dt>{ROLES[r].name}</dt>
                      <dd>{ROLES[r].description}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </Card>
        )}

        {shown === "ansatte" && (
          <>
            <Morale g={g} stats={stats} act={act} />
            {/* Salgsdirektøren er en ansatt i verket, ikke en del av konsernet (B-229): styres her sammen med de andre */}
            {g.konsern?.director && <DirectorCard g={g} act={act} />}
            <Card title={`Ansatte (${g.workers.length})`}>
              {g.workers.length === 0 && <p className="g-muted">Ingen ansatte ennå.</p>}
              {g.workers.length > 0 && (
                <p className="g-muted">
                  Alle blir flinkere av å jobbe. Kurs gir et raskt løft ({fmtKr(courseCost(g))}).{" "}
                  {session.open
                    ? `Bedriftshelsetjenesten og sikkerhetssenteret har kurs nå: ${session.left} av ${session.seats} plasser ledige, påmelding til og med dag ${session.end}.`
                    : `Neste kursrunde hos bedriftshelsetjenesten og sikkerhetssenteret starter dag ${session.start} (${session.seats} plasser, hver 14. dag).`}
                </p>
              )}
              <div className="g-role-groups">
                {ROLE_IDS.filter((r) => counts[r] > 0).map((r) => (
                  <details key={r} className="g-role-group" open={g.workers.length <= 8}>
                    <summary>
                      {ROLES[r].plural} ({counts[r]})
                    </summary>
                    {roleEffect(g, stats, r) && <p className="g-muted g-small-text">{roleEffect(g, stats, r)}</p>}
                    <ul className="g-workers">
                      {g.workers
                        .filter((w) => w.role === r)
                        .map((w) => (
                          <WorkerRow
                            key={w.id}
                            w={w}
                            today={day(g)}
                            sick={sickSpells(g, w)}
                            away={
                              isAbsent(g, w)
                                ? `${absenceName(w)} til dag ${day(g, (w.absentUntil ?? 0) - 1)}`
                                : undefined
                            }
                            action={
                              confirmFire === w.id ? (
                                <span className="g-row g-fire-confirm">
                                  <FireImpact g={g} id={w.id} />
                                  <button
                                    className="g-danger g-small"
                                    onClick={() => {
                                      act((gg) => fire(gg, w.id));
                                      setConfirmFire(null);
                                    }}
                                  >
                                    Si opp ({fmtKr(w.salary * 5)})
                                  </button>
                                  <button className="g-small" onClick={() => setConfirmFire(null)}>
                                    Avbryt
                                  </button>
                                </span>
                              ) : confirmLeader === w.id ? (
                                <span className="g-row g-fire-confirm">
                                  <span className="g-muted g-small-text">
                                    Lederutvikling: {w.name} er borte fra skiftet i {LEADER_COURSE_DAYS} døgn med full
                                    lønn, og blir skiftleder etterpå.
                                  </span>
                                  <button
                                    className="g-primary g-small"
                                    disabled={g.cash < leaderCourseCost(g)}
                                    onClick={() => {
                                      act((gg) => sendOnLeaderCourse(gg, w.id));
                                      setConfirmLeader(null);
                                    }}
                                  >
                                    Send på kurs ({fmtKr(leaderCourseCost(g))})
                                  </button>
                                  <button className="g-small" onClick={() => setConfirmLeader(null)}>
                                    Avbryt
                                  </button>
                                </span>
                              ) : menuFor !== w.id ? (
                                <button
                                  className="g-small g-worker-more"
                                  aria-expanded={false}
                                  aria-label={`Mer for ${w.name}`}
                                  onClick={() => setMenuFor(w.id)}
                                >
                                  Mer
                                </button>
                              ) : (
                                <span className="g-row g-worker-actions">
                                  {/* En flink operatør kan bli skiftleder (B-210) */}
                                  {!leaderCourseBlock(g, w) && (
                                    <button
                                      className="g-small"
                                      title="Lederutvikling: blir skiftleder"
                                      onClick={() => setConfirmLeader(w.id)}
                                    >
                                      Gjør til skiftleder
                                    </button>
                                  )}
                                  <button
                                    className="g-small"
                                    disabled={
                                      w.skill >= 5 ||
                                      !session.open ||
                                      session.left <= 0 ||
                                      (w.courseDay !== undefined && day(g) - w.courseDay < COURSE_COOLDOWN_DAYS)
                                    }
                                    title="Ferdighet +0,6"
                                    onClick={() => act((gg) => sendOnCourse(gg, w.id))}
                                  >
                                    Kurs
                                  </button>
                                  <button className="g-small" onClick={() => setConfirmFire(w.id)}>
                                    Si opp
                                  </button>
                                  <button
                                    className="g-small g-worker-more"
                                    aria-expanded={true}
                                    aria-label="Lukk"
                                    onClick={() => setMenuFor(null)}
                                  >
                                    <Icon name="close" />
                                  </button>
                                </span>
                              )
                            }
                          />
                        ))}
                    </ul>
                  </details>
                ))}
              </div>
            </Card>
          </>
        )}

        {shown === "fravaer" && <Absence g={g} stats={stats} act={act} />}
      </div>
    </div>
  );
}
