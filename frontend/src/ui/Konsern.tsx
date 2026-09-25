import { useState } from "react";
import { WIN_CASH } from "../game/data";
import {
  buyShared,
  buySister,
  DIRECTOR_AGREEMENT_SHARE,
  DIRECTOR_HIRE,
  DIRECTOR_PER_DAY,
  fireDirector,
  hireDirector,
  KONSERN_SHARED,
  konsernEquity,
  konsernValue,
  MAX_SISTERS,
  MODERNIZE_GAIN,
  MODERNIZE_MAX,
  modernizeCost,
  modernizeSister,
  SISTER_TYPES,
  sisterProfit,
  type SharedId,
} from "../game/konsern";
import { day } from "../game/plant";
import type { GameState, SisterType } from "../game/types";
import type { GameApi } from "../game/useGame";
import { buzz } from "./haptics";
import { Bar, Card, Stat } from "./common";
import { fmtKr } from "./format";

/** Salgsdirektøren (B-117): signerer kontrakter og rammeavtaler selv – meget dyrt */
function DirectorCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const d = g.konsern.director;
  const [confirm, setConfirm] = useState(false);
  return (
    <Card title="Salgsdirektør">
      <p className="g-muted">
        Salgsdirektøren signerer forespørslene verket trygt rekker og som resepten holder, mest verdifulle først – og
        rammeavtaler så lenge de til sammen tar under {Math.round(DIRECTOR_AGREEMENT_SHARE * 100)} % av ukeproduksjonen.
        Resten får ligge under Salg, så du kan ta dem selv.
      </p>
      {d ? (
        <>
          <p>
            Ansatt dag {d.hiredDay}. Har signert {d.contracts} {d.contracts === 1 ? "kontrakt" : "kontrakter"} og{" "}
            {d.agreements} {d.agreements === 1 ? "rammeavtale" : "rammeavtaler"}. Lønn {fmtKr(DIRECTOR_PER_DAY)} per
            døgn.
          </p>
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={d.agreementsOn}
              onChange={(e) =>
                act((gg) => void (gg.konsern.director && (gg.konsern.director.agreementsOn = e.target.checked)))
              }
            />
            <span>Ta også rammeavtaler</span>
          </label>
          {confirm ? (
            <div className="g-row">
              <button className="g-danger g-small" onClick={() => act((gg) => fireDirector(gg))}>
                Ja, si opp
              </button>
              <button className="g-small" onClick={() => setConfirm(false)}>
                Avbryt
              </button>
            </div>
          ) : (
            <button className="g-small" onClick={() => setConfirm(true)}>
              Si opp salgsdirektøren
            </button>
          )}
        </>
      ) : (
        <>
          <p className="g-note">
            Meget dyrt: {fmtKr(DIRECTOR_HIRE)} i rekruttering og {fmtKr(DIRECTOR_PER_DAY)} i lønn per døgn.
          </p>
          <button
            className="g-primary g-small"
            disabled={g.cash < DIRECTOR_HIRE}
            onClick={() => {
              act((gg) => hireDirector(gg));
              buzz(20);
            }}
          >
            Ansett salgsdirektør
          </button>
        </>
      )}
    </Card>
  );
}

/** Verket → Konsern (B-106): datterverk, modernisering og felles funksjoner */
export function KonsernTab({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const k = g.konsern;
  const today = day(g);
  const perDay = k.plants.filter((p) => p.downUntilDay <= today).reduce((a, p) => a + sisterProfit(g, p), 0);
  const equity = konsernEquity(g);
  const run = (fn: (gg: GameState) => { ok: boolean; message: string }) => {
    act(fn);
    buzz(20);
  };
  return (
    <>
      <div className="g-col-wide">
        <Card title="Konsernet">
          <p className="g-muted">
            Hjemmeverket er morselskapet. Datterverkene har egen ledelse og egne folk – du bestemmer bare hvor mye som
            skal investeres. De gir overskudd hver dag, som følger stålprisen, og kan av og til stå etter et havari.
          </p>
          <div className="g-stats">
            <Stat label="Verk i konsernet" value={`${k.plants.length + 1}`} />
            <Stat label="Overskudd fra datterverk per døgn" value={fmtKr(perDay)} />
            <Stat label="Verdi av datterverkene" value={fmtKr(konsernValue(g))} />
            <Stat label="Konsernverdi" value={fmtKr(Math.floor(equity))} />
          </div>
          {!g.won && (
            <>
              <Bar value={Math.max(0, equity) / WIN_CASH} tone="ok" label="Mot sluttmålet" />
              <p className="g-muted">
                Sluttmålet er en konsernverdi på {fmtKr(WIN_CASH)}: kassa minus lån, pluss 80 % av det som er investert
                i datterverkene.
              </p>
            </>
          )}
        </Card>
        <Card title={`Datterverk (${k.plants.length} av ${MAX_SISTERS})`}>
          {k.plants.length === 0 && <p className="g-muted">Ingen datterverk ennå. Kjøp det første nedenfor.</p>}
          {k.plants.map((p) => {
            const down = p.downUntilDay > today;
            const cost = modernizeCost(p);
            return (
              <div key={p.id} className="g-upgrade">
                <div className="g-contract-head">
                  <strong>
                    {p.name} · {SISTER_TYPES[p.type].name}
                  </strong>
                  <span className={down ? "g-badge-bad" : "g-muted"}>
                    {down ? `Står til dag ${p.downUntilDay}` : `${fmtKr(sisterProfit(g, p))}/døgn`}
                  </span>
                </div>
                <p className="g-muted">
                  Modernisert {p.level} av {MODERNIZE_MAX} trinn. Kjøpt dag {p.boughtDay}.
                </p>
                {p.level < MODERNIZE_MAX && (
                  <div className="g-row">
                    <button
                      className="g-small"
                      disabled={g.cash < cost}
                      onClick={() => run((gg) => modernizeSister(gg, p.id))}
                    >
                      Moderniser ({fmtKr(cost)})
                    </button>
                    <span className="g-muted">+{Math.round(MODERNIZE_GAIN * 100)} % overskudd</span>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </div>
      <div className="g-col">
        <Card title="Kjøp datterverk">
          {(Object.keys(SISTER_TYPES) as SisterType[]).map((t) => {
            const spec = SISTER_TYPES[t];
            const needsFirst = t === "storverk" && !k.plants.some((p) => p.type === "stalverk");
            const full = k.plants.length >= MAX_SISTERS;
            return (
              <div key={t} className="g-upgrade">
                <div className="g-contract-head">
                  <strong>{spec.name}</strong>
                  <span>{fmtKr(spec.price)}</span>
                </div>
                <p className="g-muted">
                  {spec.description} Ca. {fmtKr(spec.profitPerDay)} i overskudd per døgn ved normal stålpris – betaler
                  seg på ca. {Math.round(spec.price / spec.profitPerDay)} døgn.
                </p>
                <div className="g-row">
                  <button
                    className="g-primary g-small"
                    disabled={needsFirst || full || g.cash < spec.price}
                    onClick={() => run((gg) => buySister(gg, t))}
                  >
                    Kjøp
                  </button>
                  {needsFirst && <span className="g-muted">Kjøp et stålverk først</span>}
                  {full && <span className="g-muted">Konsernet er fullt</span>}
                </div>
              </div>
            );
          })}
        </Card>
        <DirectorCard g={g} act={act} />
        <Card title="Felles for konsernet">
          {(Object.keys(KONSERN_SHARED) as SharedId[]).map((id) => {
            const spec = KONSERN_SHARED[id];
            const owned = k.shared.includes(id);
            return (
              <div key={id} className={`g-upgrade${owned ? " is-owned" : ""}`}>
                <div className="g-contract-head">
                  <strong>{spec.name}</strong>
                  {!owned && <span>{fmtKr(spec.price)}</span>}
                </div>
                <p className="g-muted">{spec.description}</p>
                {owned ? (
                  <span className="g-badge-ok">I drift</span>
                ) : (
                  <button
                    className="g-primary g-small"
                    disabled={g.cash < spec.price}
                    onClick={() => run((gg) => buyShared(gg, id))}
                  >
                    Kjøp
                  </button>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </>
  );
}
