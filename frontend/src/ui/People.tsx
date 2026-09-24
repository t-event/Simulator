import { useState } from "react";
import { fire, hire, hireForMissing } from "../game/actions";
import { CREW_ROLES, ROLE_IDS, ROLES, STAGES } from "../game/data";
import type { PlantStats } from "../game/plant";
import type { GameState, RoleId, Worker } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card, Stat } from "./common";
import { fmtKr, fmtNum } from "./format";

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

function WorkerRow({ w, action }: { w: Worker; action: React.ReactNode }) {
  return (
    <li className="g-worker">
      <div>
        <strong>{w.name}</strong>
        <span className="g-muted"> · {ROLES[w.role].name}</span>
      </div>
      <Stars skill={w.skill} />
      <span className="g-muted">{fmtKr(w.salary)}/dag</span>
      {action}
    </li>
  );
}

export function People({ g, stats, act }: Props) {
  const [confirmFire, setConfirmFire] = useState<number | null>(null);
  const cap = STAGES[g.stage].staffCap;
  const counts = Object.fromEntries(ROLE_IDS.map((r) => [r, g.workers.filter((w) => w.role === r).length])) as Record<
    RoleId,
    number
  >;
  const neededRoles = CREW_ROLES.filter((r) => (stats.crew[r] ?? 0) > 0);

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <Card title="Bemanning">
          <div className="g-stats">
            <Stat label="Skift" value={`${stats.shifts} av 3`} tone={stats.shifts === 0 ? "critical" : undefined} />
            <Stat label="Drift per døgn" value={`${stats.hours} t`} />
            <Stat label="Ansatte" value={`${g.workers.length} / ${cap}`} />
            <Stat label="Lønn per døgn" value={fmtKr(stats.salaryPerDay)} />
          </div>
          {stats.ownerWorks && (
            <p className="g-note">
              Du står selv i produksjonen {g.stage === 0 ? "og gjør alt" : "og fyller to plasser"} på dagskiftet (10
              timer). Fra støperiet og oppover er du daglig leder, og da må alle plassene fylles av ansatte.
            </p>
          )}
          <table className="g-table">
            <thead>
              <tr>
                <th>Plass</th>
                <th className="num">Per skift</th>
                <th className="num">Ansatt</th>
                <th className="num">Mangler for neste skift</th>
              </tr>
            </thead>
            <tbody>
              {neededRoles.map((r) => (
                <tr key={r}>
                  <td>{ROLES[r].plural}</td>
                  <td className="num">{stats.crew[r]}</td>
                  <td className="num">{counts[r]}</td>
                  <td className={`num${stats.missing[r] ? " bad" : ""}`}>{stats.missing[r] ?? "–"}</td>
                </tr>
              ))}
              <tr>
                <td>{ROLES.allround.plural}</td>
                <td className="num">–</td>
                <td className="num">{counts.allround}</td>
                <td className="num g-muted">fyller hull</td>
              </tr>
            </tbody>
          </table>
          <p className="g-muted">
            Mannskapets ferdighet: {fmtNum(stats.crewSkill, 1)} av 5. Flinke folk gir kortere charger og færre feil, og
            alle blir flinkere av å jobbe.
          </p>
        </Card>

        <Card title={`Ansatte (${g.workers.length})`}>
          {g.workers.length === 0 && (
            <p className="g-muted">{cap === 0 ? "Det er bare deg i garasjen." : "Ingen ansatte ennå."}</p>
          )}
          {ROLE_IDS.filter((r) => counts[r] > 0).map((r) => (
            <details key={r} className="g-role-group" open={g.workers.length <= 12}>
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
                          <button className="g-small" onClick={() => setConfirmFire(w.id)}>
                            Si opp
                          </button>
                        )
                      }
                    />
                  ))}
              </ul>
            </details>
          ))}
        </Card>
      </div>

      <div className="g-col">
        <Card
          title="Søkere"
          right={
            cap > 0 &&
            Object.values(stats.missing).some((n) => (n ?? 0) > 0) && (
              <button className="g-primary g-small" onClick={() => act((gg) => hireForMissing(gg))}>
                Ansett til manglende plasser
              </button>
            )
          }
        >
          {cap === 0 ? (
            <p className="g-muted">Det er ikke plass til ansatte i garasjen. Flytt inn i et verksted først.</p>
          ) : g.candidates.length === 0 ? (
            <p className="g-muted">Ingen søkere i dag. Nye kommer hver morgen.</p>
          ) : (
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
          )}
        </Card>
        <Card title="Rollene">
          <dl className="g-roles">
            {ROLE_IDS.map((r) => (
              <div key={r}>
                <dt>{ROLES[r].name}</dt>
                <dd>{ROLES[r].description}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}
