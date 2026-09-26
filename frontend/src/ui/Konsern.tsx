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
  kompleksOpen,
  LEGENDS,
  titleOf,
  konsernAdvice,
  konsernEquity,
  konsernOptions,
  maxSisters,
  MODERNIZE_GAIN,
  modernizeMax,
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
import type { GameState, SisterPlant, SisterType } from "../game/types";
import type { GameApi } from "../game/useGame";
import { buzz } from "./haptics";
import { Bar, Card, Stat } from "./common";
import { fmtKr } from "./format";

type Act = GameApi["act"];

/** Etter sluttmålet (B-150): tittelen og veien mot neste stålmilepæl */
function LegendProgress({ g, equity }: { g: GameState; equity: number }) {
  const n = g.konsern.legends;
  const next = LEGENDS[n];
  const from = n > 0 ? LEGENDS[n - 1].equity : WIN_CASH;
  return (
    <>
      <p className="g-legend-title">
        👑 Tittel: <strong>{titleOf(g)}</strong>
      </p>
      {next ? (
        <>
          <Bar
            value={(Math.max(0, equity) - from) / (next.equity - from)}
            tone="ok"
            label={`Mot ${next.title}, ${fmtKr(next.equity)}`}
          />
          <p className="g-muted g-small-text">
            Neste: <strong>{next.title}</strong> ved {fmtKr(next.equity)} – {next.fp} fagpoeng. {next.unlocks}
          </p>
        </>
      ) : (
        <p className="g-muted g-small-text">Alle stålmilepælene er nådd. Konsernet kan fortsatt vokse.</p>
      )}
    </>
  );
}

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
        className={primary ? "g-primary" : undefined}
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

/** Salgsdirektøren (B-117): signerer kontrakter og rammeavtaler selv – meget dyrt. Kort, med resten foldet bort (B-123) */
function DirectorCard({ g, act }: { g: GameState; act: Act }) {
  const d = g.konsern.director;
  const [confirm, setConfirm] = useState(false);
  const days = daysToAfford(g, DIRECTOR_HIRE);
  const about = (
    <details className="g-details">
      <summary>Hva gjør salgsdirektøren?</summary>
      <p className="g-muted">
        Salgsdirektøren signerer forespørslene verket trygt rekker og som resepten holder, mest verdifulle først – og
        rammeavtaler så lenge de til sammen tar under {Math.round(DIRECTOR_AGREEMENT_SHARE * 100)} % av ukeproduksjonen.
        Resten får ligge under Salg, så du kan ta dem selv. Direktøren gir ikke mer overskudd – du slipper bare å
        signere selv.
      </p>
    </details>
  );
  return (
    <Card title="Salgsdirektør">
      {d ? (
        <>
          <p className="g-muted">
            Ansatt dag {d.hiredDay} · har signert {d.contracts} {d.contracts === 1 ? "kontrakt" : "kontrakter"} og{" "}
            {d.agreements} {d.agreements === 1 ? "rammeavtale" : "rammeavtaler"} · lønn {fmtKr(directorPerDay(g))} per
            døgn
          </p>
          <DirectorSwitch g={g} act={act} />
          <details className="g-details">
            <summary>Innstillinger og oppsigelse</summary>
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
              <div className="g-row g-konsern-buy">
                <button className="g-danger" onClick={() => act((gg) => fireDirector(gg))}>
                  Ja, si opp
                </button>
                <button onClick={() => setConfirm(false)}>Avbryt</button>
              </div>
            ) : (
              <div className="g-konsern-buy">
                <button onClick={() => setConfirm(true)}>Si opp salgsdirektøren</button>
              </div>
            )}
          </details>
        </>
      ) : (
        <>
          <p className="g-muted">
            Signerer kontraktene for deg. Meget dyrt: {fmtKr(DIRECTOR_HIRE)} + {fmtKr(directorPerDay(g))} per døgn.
          </p>
          <div className="g-konsern-buy">
            <button
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
          {about}
        </>
      )}
    </Card>
  );
}

/** Ett datterverk: hva det tjener, den viktigste knappen, og resten (modernisering, salg) foldet bort (B-123) */
function PlantRow({ g, act, p, options }: { g: GameState; act: Act; p: SisterPlant; options: KonsernOption[] }) {
  const [selling, setSelling] = useState(false);
  const down = p.downUntilDay > day(g);
  const upgrade = options.find((o) => o.key === `bygg-${p.id}`);
  const modernize = options.find((o) => o.key === `mod-${p.id}`);
  const swap = options.find((o) => o.key === `bytt-${p.id}`);
  // Stålverk: utbygging er hovedknappen. Storverk: modernisering.
  const main = upgrade ?? modernize;
  const extra = upgrade ? modernize : undefined;
  return (
    <div className="g-upgrade">
      <div className="g-contract-head">
        <strong>🏭 {p.name}</strong>
        <span className={down ? "g-badge-bad" : "g-muted"}>
          {down ? `Står til dag ${p.downUntilDay}` : `${fmtKr(sisterProfit(g, p))}/døgn`}
        </span>
      </div>
      <p className="g-muted g-small-text">
        {SISTER_TYPES[p.type].name} · modernisert {p.level} av {modernizeMax(g)} · verdt {fmtKr(sisterValue(g, p))}
      </p>
      {main && <BuyButton g={g} act={act} o={main} label={upgrade ? "Bygg ut til storverk" : "Moderniser"} />}
      <details className="g-details" onToggle={(e) => !(e.target as HTMLDetailsElement).open && setSelling(false)}>
        <summary>{extra ? "Moderniser eller selg" : "Selg verket"}</summary>
        {extra && <BuyButton g={g} act={act} o={extra} primary={false} label="Moderniser" />}
        {swap && <BuyButton g={g} act={act} o={swap} primary={false} label="Bytt til stålkompleks" />}
        {selling ? (
          <div className="g-row g-konsern-buy">
            <button
              className="g-danger"
              onClick={() => {
                act((gg) => sellSister(gg, p.id));
                setSelling(false);
              }}
            >
              Ja, selg for {fmtKr(sisterValue(g, p))}
            </button>
            <button onClick={() => setSelling(false)}>Avbryt</button>
          </div>
        ) : (
          <div className="g-konsern-buy">
            <button onClick={() => setSelling(true)}>Selg for {fmtKr(sisterValue(g, p))}…</button>
            <span className="g-muted g-small-text">Pengene går i kassa, f.eks. til et storverk.</span>
          </div>
        )}
      </details>
    </div>
  );
}

/**
 * Verket → Konsern (B-106, B-119, B-123): tallene og målet øverst, neste steg, verkene dine, så kjøp.
 * Forklaringen er foldet sammen når man har kommet i gang, så siden blir kort.
 */
export function KonsernTab({ g, act }: { g: GameState; act: Act }) {
  const k = g.konsern;
  const today = day(g);
  const perDay = k.plants.filter((p) => p.downUntilDay <= today).reduce((a, p) => a + sisterProfit(g, p), 0);
  const equity = konsernEquity(g);
  const options = konsernOptions(g);
  const byKey = (key: string) => options.find((o) => o.key === key);
  const advice = konsernAdvice(g);
  const next = KONSERN_MILESTONES[k.milestones];
  const konsernResearch = {
    total: RESEARCH.filter((r) => r.konsern).length,
    done: RESEARCH.filter((r) => r.konsern && g.researched.includes(r.id)).length,
  };
  const sharedIds = Object.keys(KONSERN_SHARED) as SharedId[];
  const owned = sharedIds.filter((id) => !byKey(`felles-${id}`));
  const hasStalverk = k.plants.some((p) => p.type === "stalverk");
  return (
    <>
      <div className="g-col-wide">
        <Card title="Konsernet">
          <div className="g-stats">
            <Stat label="Konsernverdi" value={fmtKr(Math.floor(equity))} />
            <Stat label="Datterverkene tjener" value={`${fmtKr(perDay)}/døgn`} />
          </div>
          {!g.won && (
            <>
              <Bar value={Math.max(0, equity) / WIN_CASH} tone="ok" label={`Mot sluttmålet ${fmtKr(WIN_CASH)}`} />
              {next && <p className="g-muted g-small-text">Neste milepæl: {fmtKr(next)} (gir fagpoeng).</p>}
            </>
          )}
          {g.won && <LegendProgress g={g} equity={equity} />}
          <details className="g-details" open={k.plants.length === 0}>
            <summary>Slik fungerer konsernet</summary>
            <ol className="g-konsern-steps">
              <li>
                <strong>Kjøp et stålverk</strong> ({fmtKr(SISTER_TYPES.stalverk.price)}). Det har egne folk og tjener
                ca. {fmtKr(SISTER_TYPES.stalverk.profitPerDay)} per døgn av seg selv.
              </li>
              <li>
                <strong>Bygg det ut til storverk</strong> ({fmtKr(upgradeCost(g))}). Da tjener det fire ganger så mye.
              </li>
              <li>
                <strong>Felles innkjøp og salg</strong> gjør alle verkene bedre, også hjemmeverket.{" "}
                <strong>Modernisering</strong> gir {Math.round(MODERNIZE_GAIN * 100)} % mer per trinn.
              </li>
              <li>
                <strong>Du taper ikke på å kjøpe:</strong> et verk er verdt ca. {VALUE_DAYS} døgns overskudd og teller
                med i konsernverdien. Å bare spare er den tregeste veien til målet.
              </li>
            </ol>
            <p className="g-muted g-small-text">
              Konsernverdi = kassa minus lån, pluss det verkene er verdt. Under Forskning finnes egne prosjekter for
              konsernet ({konsernResearch.done} av {konsernResearch.total} forsket fram).
            </p>
          </details>
        </Card>
        {advice && (
          <Card title="Neste steg" className="g-konsern-next">
            <p>
              <strong>{advice.title}</strong> – det som betaler seg raskest nå.
            </p>
            {advice.key.startsWith("bytt-") && (
              <p className="g-muted g-small-text">
                Et stålkompleks tjener omtrent like mye som fem storverk, men tar bare én plass. Verket selges for det
                det er verdt, og pengene går til komplekset.
              </p>
            )}
            <BuyButton g={g} act={act} o={advice} label="Gjør det" />
          </Card>
        )}
        {k.plants.length > 0 && (
          <Card title={`Dine verk (${k.plants.length} av ${maxSisters(g)} datterverk)`}>
            {k.plants.map((p) => (
              <PlantRow key={p.id} g={g} act={act} p={p} options={options} />
            ))}
          </Card>
        )}
      </div>
      <div className="g-col">
        <Card title="Kjøp og utvid">
          {(Object.keys(SISTER_TYPES) as SisterType[])
            .filter((t) => t !== "kompleks" || kompleksOpen(g))
            .map((t) => {
              const spec = SISTER_TYPES[t];
              return (
                <div key={t} className="g-upgrade">
                  <strong>Nytt {spec.name.toLowerCase()}</strong>
                  <span className="g-muted g-small-text">
                    {spec.description}
                    {t === "storverk" && hasStalverk ? ` Billigere: bygg ut et av stålverkene dine.` : ""}
                  </span>
                  <BuyButton g={g} act={act} o={byKey(`kjop-${t}`)!} primary={false} />
                </div>
              );
            })}
          {sharedIds
            .filter((id) => !owned.includes(id))
            .map((id) => {
              const spec = KONSERN_SHARED[id];
              return (
                <div key={id} className="g-upgrade">
                  <strong>{spec.name}</strong>
                  <span className="g-muted g-small-text">{spec.description}</span>
                  <BuyButton g={g} act={act} o={byKey(`felles-${id}`)!} primary={false} />
                </div>
              );
            })}
          {owned.length > 0 && (
            <p className="g-muted g-small-text">✓ I drift: {owned.map((id) => KONSERN_SHARED[id].name).join(", ")}.</p>
          )}
        </Card>
        <DirectorCard g={g} act={act} />
      </div>
    </>
  );
}
