import { useState } from "react";
import { WIN_CASH } from "../game/data";
import {
  daysToAfford,
  DIRECTOR_AGREEMENT_SHARE,
  DIRECTOR_HIRE,
  directorPerDay,
  fireDirector,
  hireDirector,
  KONSERN_MILESTONES,
  KONSERN_SHARED,
  konsernAdvice,
  konsernEquity,
  konsernOptions,
  maxSisters,
  MODERNIZE_GAIN,
  MODERNIZE_MAX,
  SISTER_TYPES,
  sisterProfit,
  sellSister,
  sisterValue,
  upgradeCost,
  VALUE_DAYS,
  type KonsernOption,
  type SharedId,
} from "../game/konsern";
import { day } from "../game/plant";
import { RESEARCH } from "../game/research";
import type { GameState, SisterType } from "../game/types";
import type { GameApi } from "../game/useGame";
import { buzz } from "./haptics";
import { Bar, Card, Stat } from "./common";
import { fmtKr } from "./format";

type Act = GameApi["act"];

/** Hvorfor en knapp ikke kan trykkes: sperret, eller hvor mye som mangler og omtrent når det er råd (B-119) */
function whyNot(g: GameState, o: KonsernOption): string | null {
  if (o.blocked) return o.blocked;
  if (g.cash >= o.price) return null;
  const missing = fmtKr(Math.ceil(o.price - Math.max(0, g.cash)));
  const days = daysToAfford(g, o.price);
  return `Du mangler ${missing}${days ? ` – ca. ${days} døgn med dagens overskudd` : ""}.`;
}

/** Kjøpsknapp med pris, hva det gir og hvorfor den eventuelt er grå */
function BuyButton({
  g,
  act,
  o,
  primary = true,
  label,
}: {
  g: GameState;
  act: Act;
  o: KonsernOption;
  primary?: boolean;
  label?: string;
}) {
  const reason = whyNot(g, o);
  return (
    <div className="g-konsern-buy">
      <button
        className={`${primary ? "g-primary " : ""}g-small`}
        disabled={!!reason}
        onClick={() => {
          act((gg) => o.run(gg));
          buzz(20);
        }}
      >
        {label ?? "Kjøp"} ({fmtKr(o.price)})
      </button>
      <span className="g-muted g-small-text">
        {o.gain > 0 && `+${fmtKr(o.gain)} per døgn · betaler seg på ca. ${Math.ceil(o.payback)} døgn`}
        {reason && <span className="g-konsern-why">{reason}</span>}
      </span>
    </div>
  );
}

/** Bryter for å skru salgsdirektøren av og på (B-122). Vises på Konsern og under Forespørsler på Salg */
export function DirectorSwitch({ g, act }: { g: GameState; act: Act }) {
  const d = g.konsern?.director;
  if (!d) return null;
  return (
    <>
      <label className="g-toggle">
        <input
          type="checkbox"
          checked={d.active}
          onChange={(e) => act((gg) => void (gg.konsern.director && (gg.konsern.director.active = e.target.checked)))}
        />
        <span>Salgsdirektøren signerer for meg</span>
      </label>
      <p className="g-note">
        {d.active
          ? `Salgsdirektøren signerer forespørsler verket trygt rekker og som resepten holder${d.agreementsOn ? ", og rammeavtaler det er plass til" : ""}. Resten ligger under Salg, så du kan ta dem selv.`
          : "Salgsdirektøren er skrudd av: du signerer alt selv. Lønna går likevel, så lenge direktøren er ansatt."}
      </p>
    </>
  );
}

/** Salgsdirektøren (B-117): signerer kontrakter og rammeavtaler selv – meget dyrt */
function DirectorCard({ g, act }: { g: GameState; act: Act }) {
  const d = g.konsern.director;
  const [confirm, setConfirm] = useState(false);
  const days = daysToAfford(g, DIRECTOR_HIRE);
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
            {d.agreements} {d.agreements === 1 ? "rammeavtale" : "rammeavtaler"}. Lønn {fmtKr(directorPerDay(g))} per
            døgn.
          </p>
          <DirectorSwitch g={g} act={act} />
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
            Meget dyrt: {fmtKr(DIRECTOR_HIRE)} i rekruttering og {fmtKr(directorPerDay(g))} i lønn per døgn. Gir ikke
            mer overskudd – du slipper bare å signere selv.
          </p>
          <div className="g-konsern-buy">
            <button
              className="g-small"
              disabled={g.cash < DIRECTOR_HIRE}
              onClick={() => {
                act((gg) => hireDirector(gg));
                buzz(20);
              }}
            >
              Ansett salgsdirektør
            </button>
            {g.cash < DIRECTOR_HIRE && (
              <span className="g-konsern-why g-small-text">
                Du mangler {fmtKr(Math.ceil(DIRECTOR_HIRE - Math.max(0, g.cash)))}
                {days ? ` – ca. ${days} døgn med dagens overskudd` : ""}.
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

/** Verket → Konsern (B-106, B-119): forklaring, neste steg, datterverk, kjøp og felles funksjoner */
export function KonsernTab({ g, act }: { g: GameState; act: Act }) {
  const k = g.konsern;
  const today = day(g);
  const perDay = k.plants.filter((p) => p.downUntilDay <= today).reduce((a, p) => a + sisterProfit(g, p), 0);
  const equity = konsernEquity(g);
  const options = konsernOptions(g);
  const byKey = (key: string) => options.find((o) => o.key === key);
  const advice = konsernAdvice(g);
  const next = KONSERN_MILESTONES[k.milestones];
  const [selling, setSelling] = useState<number | null>(null);
  const konsernResearch = {
    total: RESEARCH.filter((r) => r.konsern).length,
    done: RESEARCH.filter((r) => r.konsern && g.researched.includes(r.id)).length,
  };
  return (
    <>
      <div className="g-col-wide">
        <Card title="Konsernet">
          <p className="g-muted">
            Hjemmeverket er morselskapet. Nå bygger du et konsern: du kjøper flere verk, og de tjener penger hver dag av
            seg selv – de har egen ledelse og egne folk.
          </p>
          <ol className="g-konsern-steps">
            <li>
              <strong>Kjøp et stålverk</strong> ({fmtKr(SISTER_TYPES.stalverk.price)}). Det gir ca.{" "}
              {fmtKr(SISTER_TYPES.stalverk.profitPerDay)} per døgn.
            </li>
            <li>
              <strong>Felles innkjøp og salg</strong> gjør alle verkene litt bedre – også hjemmeverket.
            </li>
            <li>
              <strong>Storverk</strong> ({fmtKr(SISTER_TYPES.storverk.price)}) gir fire ganger så mye. Har du et
              stålverk, bygger du det ut for {fmtKr(upgradeCost(g))} – knappen står ved verket under «Datterverk». Du
              kan også selge et verk for å få råd.
            </li>
            <li>
              <strong>Moderniser</strong> verkene for {Math.round(MODERNIZE_GAIN * 100)} % mer overskudd per trinn.
            </li>
          </ol>
          <p className="g-note">
            <strong>Det lønner seg å investere:</strong> et verk er verdt omtrent {VALUE_DAYS} døgns overskudd, så
            konsernverdien går ikke ned når du kjøper. Alt verket tjener etterpå, er gevinst. Å bare spare pengene er
            den tregeste veien til målet.
          </p>
          <p className="g-note">
            Under Forskning finnes egne prosjekter for konsernet: {konsernResearch.done} av {konsernResearch.total} er
            forsket fram. De gir mer overskudd, billigere verk og plass til flere.
          </p>
          <div className="g-stats">
            <Stat label="Verk i konsernet" value={`${k.plants.length + 1} av ${maxSisters(g) + 1}`} />
            <Stat label="Datterverkene tjener per døgn" value={fmtKr(perDay)} />
            <Stat label="Konsernverdi" value={fmtKr(Math.floor(equity))} />
          </div>
          {!g.won && (
            <>
              <Bar value={Math.max(0, equity) / WIN_CASH} tone="ok" label="Mot sluttmålet" />
              <p className="g-muted">
                Sluttmålet er en konsernverdi på {fmtKr(WIN_CASH)}: kassa minus lån, pluss det datterverkene er verdt
                (ca. {VALUE_DAYS} døgns overskudd hver).
                {next ? ` Neste milepæl: ${fmtKr(next)} (gir fagpoeng).` : ""}
              </p>
            </>
          )}
        </Card>
        {advice && (
          <Card title="Neste steg" className="g-konsern-next">
            <p>
              <strong>{advice.title}</strong> – det som betaler seg raskest nå.
            </p>
            <BuyButton g={g} act={act} o={advice} label="Gjør det" />
          </Card>
        )}
        <Card title={`Datterverk (${k.plants.length} av ${maxSisters(g)})`}>
          {k.plants.length === 0 && (
            <p className="g-muted">Ingen datterverk ennå. Start med et stålverk – se «Kjøp datterverk».</p>
          )}
          {k.plants.map((p) => {
            const down = p.downUntilDay > today;
            const upgrade = byKey(`bygg-${p.id}`);
            const modernize = byKey(`mod-${p.id}`);
            return (
              <div key={p.id} className="g-upgrade">
                <div className="g-contract-head">
                  <strong>
                    🏭 {p.name} · {SISTER_TYPES[p.type].name}
                  </strong>
                  <span className={down ? "g-badge-bad" : "g-muted"}>
                    {down ? `Står til dag ${p.downUntilDay}` : `${fmtKr(sisterProfit(g, p))}/døgn`}
                  </span>
                </div>
                <p className="g-muted">
                  Modernisert {p.level} av {MODERNIZE_MAX} trinn. Kjøpt dag {p.boughtDay}. Verdi{" "}
                  {fmtKr(sisterValue(g, p))}.
                </p>
                {upgrade && <BuyButton g={g} act={act} o={upgrade} label="Bygg ut til storverk" />}
                {modernize && <BuyButton g={g} act={act} o={modernize} primary={false} label="Moderniser" />}
                {selling === p.id ? (
                  <div className="g-row">
                    <button
                      className="g-danger g-small"
                      onClick={() => {
                        act((gg) => sellSister(gg, p.id));
                        setSelling(null);
                      }}
                    >
                      Ja, selg for {fmtKr(sisterValue(g, p))}
                    </button>
                    <button className="g-small" onClick={() => setSelling(null)}>
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button className="g-link" onClick={() => setSelling(p.id)}>
                    Selg verket…
                  </button>
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
            const o = byKey(`kjop-${t}`)!;
            return (
              <div key={t} className="g-upgrade">
                <div className="g-contract-head">
                  <strong>{spec.name}</strong>
                </div>
                <p className="g-muted">{spec.description}</p>
                <BuyButton g={g} act={act} o={o} />
                {t === "storverk" && k.plants.some((p) => p.type === "stalverk") && (
                  <p className="g-muted g-small-text">
                    Billigere: bygg ut et stålverk du har, for {fmtKr(upgradeCost(g))} (under «Datterverk»).
                  </p>
                )}
              </div>
            );
          })}
        </Card>
        <Card title="Felles for konsernet">
          {(Object.keys(KONSERN_SHARED) as SharedId[]).map((id) => {
            const spec = KONSERN_SHARED[id];
            const o = byKey(`felles-${id}`);
            return (
              <div key={id} className={`g-upgrade${o ? "" : " is-owned"}`}>
                <div className="g-contract-head">
                  <strong>{spec.name}</strong>
                </div>
                <p className="g-muted">{spec.description}</p>
                {o ? <BuyButton g={g} act={act} o={o} /> : <span className="g-badge-ok">I drift</span>}
              </div>
            );
          })}
          <p className="g-muted g-small-text">
            Felles funksjoner lønner seg mer jo flere verk du har. Tallet per døgn er regnet ut fra verkene du har nå.
          </p>
        </Card>
        <DirectorCard g={g} act={act} />
      </div>
    </>
  );
}
