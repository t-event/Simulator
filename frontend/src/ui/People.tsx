import { useState } from "react";
import {
  BONUS_COOLDOWN_DAYS,
  bonusCost,
  COURSE_COOLDOWN_DAYS,
  courseCost,
  fire,
  giveBonus,
  hire,
  hireForMissing,
  hireTemps,
  sendOnCourse,
} from "../game/actions";
import { ROLE_IDS, ROLES, STAGES } from "../game/data";
import {
  crewCoverage,
  day,
  daysUntilAllBack,
  isAbsent,
  moraleFactor,
  nightExtra,
  staffing,
  tempsActive,
  tempsCost,
  type PlantStats,
} from "../game/plant";
import type { GameState, RoleId, Worker } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card, Stat } from "./common";
import { fmtKr, fmtNum } from "./format";
import { ShiftPlan } from "./Power";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

function Stars({ skill }: { skill: number }) {
  const full = Math.round(skill);
  return (
    <span
      className="g-stars"
      title={`Ferdighet ${fmtNum(skill, 1)} av 5`}
      aria-label={`Ferdighet ${fmtNum(skill, 1)} av 5`}
    >
      {"★".repeat(full)}
      <span className="g-stars-off">{"★".repeat(5 - full)}</span>
    </span>
  );
}

function WorkerRow({ w, action, away }: { w: Worker; action: React.ReactNode; away?: string }) {
  return (
    <li className="g-worker">
      <div>
        <strong>{w.name}</strong>
        <span className="g-muted"> · {ROLES[w.role].name}</span>
        {away && <span className="g-badge-bad g-worker-away"> {away}</span>}
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
      <p className="g-muted">
        Trivselen stiger med bonus, kurs, lønnstillegg og leveranser i tide. Den synker med havarier, reklamasjoner,
        avslåtte lønnskrav{nightExtra(g, stats.hours) > 0 ? " og nattskift (som du har nå)" : " og nattskift"}.
      </p>
      <button className="g-primary" disabled={day(g) < nextBonus} onClick={() => act((gg) => giveBonus(gg))}>
        {day(g) < nextBonus ? `Bonus igjen dag ${nextBonus}` : `Gi alle bonus (${fmtKr(bonusCost(g))})`}
      </button>
    </Card>
  );
}

/** Fravær: hvem som er borte nå og hvem som skal ha ferie, og vikarer (B-031) */
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
                {w.absentReason === "syk" ? "Syk" : "Ferie"} til dag {day(g, (w.absentUntil ?? 0) - 1)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {now.length > 0 &&
        (temps ? (
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
      {now.length > 0 && (!temps || tempsShort) && (
        <div className="g-row">
          <button className="g-primary" onClick={() => act((gg) => hireTemps(gg, null))}>
            Vikarer til alle er tilbake ({backDays} døgn, {fmtKr(tempsCost(g, backDays))})
          </button>
          {!temps && backDays > 1 && (
            <button onClick={() => act((gg) => hireTemps(gg, 1))}>Vikarer i 1 døgn ({fmtKr(tempsCost(g, 1))})</button>
          )}
        </div>
      )}
      <label className="g-toggle">
        <input
          type="checkbox"
          checked={g.settings.autoTemps}
          onChange={(e) => act((gg) => void (gg.settings.autoTemps = e.target.checked))}
        />
        <span>Lei inn vikarer av seg selv når fravær ellers ville kostet skift</span>
      </label>
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
    </Card>
  );
}

type PeopleTab = "skift" | "ansett" | "ansatte" | "fravaer";

/** Bemanningstabellen: hvem som står hvor på skiftene, med avløsere og vikarer */
function CrewTable({ g, stats, shifts }: { g: GameState; stats: PlantStats; shifts: number }) {
  const coverage = crewCoverage(g, stats.crew, shifts);
  return (
    <>
      <table className="g-table g-crew-table">
        <thead>
          <tr>
            <th>Plass</th>
            <th className="num">
              Trengs
              <br />
              <span className="g-muted">{shifts} skift</span>
            </th>
            <th className="num">Fylt av</th>
            <th className="num">Mangler</th>
          </tr>
        </thead>
        <tbody>
          {coverage.rows.map((row) => (
            <tr key={row.role}>
              <td>{ROLES[row.role].plural}</td>
              <td className="num">
                {row.need}
                <span className="g-muted g-sub">{row.perShift} per skift</span>
              </td>
              <td className="num">
                {row.own} {row.own === 1 ? "egen" : "egne"}
                {row.temps > 0 && (
                  <span className="g-muted g-sub">
                    herav {row.temps} vikar{row.temps === 1 ? "" : "er"}
                  </span>
                )}
                {row.away > row.temps && <span className="g-muted g-sub">{row.away - row.temps} borte</span>}
                {row.filled > 0 && (
                  <span className="g-muted g-sub">
                    + {row.filled} {row.filled === 1 ? "avløser" : "avløsere"}
                  </span>
                )}
              </td>
              <td className={`num${row.missing ? " bad" : ""}`}>{row.missing || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="g-muted">
        {coverage.wildcards > 0
          ? `Avløsere${coverage.ownerSlots ? " (og du selv på dagskiftet)" : ""} går dit det mangler folk: ${coverage.wildUsed} av ${coverage.wildcards} er i bruk.`
          : "Avløsere kan ta plassen til den som mangler på skiftet."}
      </p>
    </>
  );
}

export function People({ g, stats, act }: Props) {
  const [tab, setTab] = useState<PeopleTab>("skift");
  const [confirmFire, setConfirmFire] = useState<number | null>(null);
  const cap = STAGES[g.stage].staffCap;
  const counts = Object.fromEntries(ROLE_IDS.map((r) => [r, g.workers.filter((w) => w.role === r).length])) as Record<
    RoleId,
    number
  >;
  // Tabellen viser neste skift hvis verket ikke går alle tre, ellers de tre som går
  const planShifts = Math.min(3, stats.shifts + (stats.shifts < 3 ? 1 : 0));
  const missing = Object.entries(stats.missing).filter(([, n]) => (n ?? 0) > 0) as [RoleId, number][];
  const away = g.workers.filter((w) => isAbsent(g, w));
  const full = staffing(g, true).shifts;
  const absenceCosts = away.length > 0 && !tempsActive(g) && stats.shifts < full;
  const tabs: { id: PeopleTab; label: string }[] = [
    { id: "skift", label: "Skift" },
    { id: "ansett", label: `Ansett${g.candidates.length && cap > 0 ? ` (${g.candidates.length})` : ""}` },
    { id: "ansatte", label: `Ansatte (${g.workers.length})` },
    { id: "fravaer", label: `Fravær${away.length ? ` (${away.length})` : ""}` },
  ];
  const shown: PeopleTab = cap === 0 && !g.workers.length ? "skift" : tab;

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        {(cap > 0 || g.workers.length > 0) && (
          <div className="g-subtabs" role="tablist" aria-label="Folk">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={shown === t.id}
                className={`${shown === t.id ? "is-active" : ""}${t.id === "fravaer" && absenceCosts ? " is-alert" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {shown === "skift" && (
          <>
            <Card title="Skiftene">
              <p className="g-big-status">
                Verket går <strong>{stats.shifts} av 3 skift</strong>
                <span className="g-muted"> · {stats.hours} timer i døgnet</span>
              </p>
              {stats.ownerWorks && (
                <p className="g-muted">
                  Du står selv i produksjonen på dagskiftet{g.stage === 0 ? " og gjør alt." : " og fyller to plasser."}
                  {g.stage === 0
                    ? " Ansatte kan du ha fra verkstedet."
                    : " Fra støperiet må alle plassene fylles av ansatte."}
                </p>
              )}
              {absenceCosts && (
                <p className="g-note g-warn">
                  {away.length === 1 ? "Én ansatt" : `${away.length} ansatte`} er borte, så verket går {stats.shifts}{" "}
                  skift i stedet for {full}.{" "}
                  <button className="g-link" onClick={() => setTab("fravaer")}>
                    Se fravær og vikarer
                  </button>
                </p>
              )}
              {stats.shifts < 3 && cap > 0 && missing.length > 0 && (
                <div className="g-note">
                  For {stats.shifts + 1} skift mangler:{" "}
                  {missing
                    .map(([r, n]) => `${n} ${(n === 1 ? ROLES[r].name : ROLES[r].plural).toLowerCase()}`)
                    .join(", ")}
                  .
                  <div className="g-row">
                    <button className="g-primary" onClick={() => act((gg) => hireForMissing(gg))}>
                      Ansett til manglende plasser
                    </button>
                    <button onClick={() => setTab("ansett")}>Velg selv</button>
                  </div>
                </div>
              )}
              <div className="g-stats">
                <Stat label="Ansatte" value={`${g.workers.length} / ${cap}`} />
                <Stat label="Lønn per døgn" value={fmtKr(stats.salaryPerDay)} />
                <Stat label="Ferdighet" value={`${fmtNum(stats.crewSkill, 1)} av 5`} />
              </div>
              {stats.crew && Object.keys(stats.crew).length > 0 && (
                <details className="g-details">
                  <summary>Se hvem som står hvor</summary>
                  <CrewTable g={g} stats={stats} shifts={planShifts} />
                </details>
              )}
            </Card>
            <ShiftPlan g={g} stats={stats} act={act} />
          </>
        )}

        {shown === "ansett" && (
          <Card title="Søkere">
            {cap === 0 ? (
              <p className="g-muted">Det er ikke plass til ansatte i garasjen. Flytt inn i et verksted først.</p>
            ) : g.candidates.length === 0 ? (
              <p className="g-muted">Ingen søkere i dag. Nye kommer hver morgen.</p>
            ) : (
              <>
                {g.workers.length >= cap && (
                  <p className="g-note g-warn">Verket er fullt ({cap} ansatte). Flytt til et større sted for flere.</p>
                )}
                <ul className="g-workers">
                  {g.candidates.map((w) => (
                    <WorkerRow
                      key={w.id}
                      w={w}
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
          </Card>
        )}

        {shown === "ansatte" && (
          <>
            <Morale g={g} stats={stats} act={act} />
            <Card title={`Ansatte (${g.workers.length})`}>
              {g.workers.length === 0 && <p className="g-muted">Ingen ansatte ennå.</p>}
              {g.workers.length > 0 && (
                <p className="g-muted">
                  Alle blir flinkere av å jobbe. Kurs gir et raskt løft ({fmtKr(courseCost(g))}).
                </p>
              )}
              {ROLE_IDS.filter((r) => counts[r] > 0).map((r) => (
                <details key={r} className="g-role-group" open={g.workers.length <= 8}>
                  <summary>
                    {ROLES[r].plural} ({counts[r]})
                  </summary>
                  <ul className="g-workers">
                    {g.workers
                      .filter((w) => w.role === r)
                      .map((w) => (
                        <WorkerRow
                          key={w.id}
                          w={w}
                          away={
                            isAbsent(g, w)
                              ? `${w.absentReason === "syk" ? "Syk" : "Ferie"} til dag ${day(g, (w.absentUntil ?? 0) - 1)}`
                              : undefined
                          }
                          action={
                            confirmFire === w.id ? (
                              <span className="g-row">
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
                            ) : (
                              <span className="g-row">
                                <button
                                  className="g-small"
                                  disabled={
                                    w.skill >= 5 ||
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
                              </span>
                            )
                          }
                        />
                      ))}
                  </ul>
                </details>
              ))}
            </Card>
          </>
        )}

        {shown === "fravaer" && <Absence g={g} stats={stats} act={act} />}
      </div>
    </div>
  );
}
