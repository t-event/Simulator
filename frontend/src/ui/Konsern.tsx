import { hasPaidOut, paidOutTotal } from "../game/reserve";
import { Fragment, useState } from "react";
import { useReportTab, type OnTab } from "./tabMemory";
import { WIN_CASH } from "../game/data";
import {
  daysToAfford,
  dividends,
  KONSERN_ECONOMY,
  DIRECTOR_AGREEMENT_SHARE,
  BUILD_HOURS,
  flagshipBonus,
  FLAGSHIP_MAX,
  MODERNIZE_HOURS,
  projectLabel,
  projectProgress,
  realNow,
  underConstruction,
  DIRECTOR_HIRE,
  DIRECTOR_UPGRADES,
  directorLevel,
  directorPerDay,
  nextDirectorUpgrade,
  upgradeDirector,
  fireDirector,
  hireDirector,
  KONSERN_MILESTONES,
  KONSERN_SHARED,
  kompleksOpen,
  LEGENDS,
  titleOf,
  konsernAdvice,
  konsernReady,
  konsernEquity,
  konsernOptions,
  maxSisters,
  MODERNIZE_GAIN,
  modernizeMax,
  SISTER_TYPES,
  sisterProfit,
  sellSister,
  sisterSalePrice,
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
import { Bar, Card, SubTabs } from "./common";
import { Button, Callout } from "./ds";
import type { OpenTender } from "./openTender";
import { EARNS_FROM } from "../net/world";
import { IndustryPanel } from "./Companies";
import { fmtKr } from "./format";
import { Icon } from "./icons";

type Act = GameApi["act"];

/** Etter sluttmålet (B-150): tittelen og veien mot neste stålmilepæl */
function LegendProgress({ g, equity }: { g: GameState; equity: number }) {
  const n = g.konsern.legends;
  const next = LEGENDS[n];
  const from = n > 0 ? LEGENDS[n - 1].equity : WIN_CASH;
  return (
    <>
      <p className="g-legend-title">
        <Icon name="trophy" /> Tittel: <strong>{titleOf(g)}</strong>
      </p>
      {next ? (
        <>
          <Bar
            value={(Math.max(0, equity) - from) / (next.equity - from)}
            tone="ok"
            label={`Mot ${next.title}, ${fmtKr(next.equity)}`}
          />
          <p className="g-muted g-small-text">
            Neste: <strong>{next.title}</strong> ved {fmtKr(next.equity)}, omtrent som {next.like}. Gir {next.fp}{" "}
            fagpoeng. {next.unlocks}
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
        {o.gain > 0 &&
          `+${fmtKr(o.gain)} per ekte dag til konsernkassa · betaler seg på ca. ${Math.ceil(o.payback)} dager`}
        {o.hours > 0 && ` · tar ${o.hours} t å bygge`}
        {reason && <span className="g-konsern-why">{reason}</span>}
      </span>
    </div>
  );
}

/** Hvor godt et kjøp lønner seg, i ord (B-235): færre døgn før det har betalt seg er bedre */
function payRating(days: number): { tone: "ok" | "info" | "heat"; label: string } {
  if (!Number.isFinite(days)) return { tone: "heat", label: "Gir lite nå" };
  if (days <= 150) return { tone: "ok", label: "Lønner seg godt" };
  if (days <= 500) return { tone: "info", label: "Lønner seg" };
  return { tone: "heat", label: "Lønner seg dårlig" };
}

/**
 * Ett kjøp i konsernet (B-235): navn og vurdering øverst, tre tall (gir per døgn, betaler seg, byggetid) og én knapp.
 * Før sto alt i en liten grå linje, og et kjøp som betalte seg på 5 000 døgn så like bra ut som ett på 90.
 */
function OptionCard({
  g,
  act,
  o,
  name,
  desc,
  best = false,
  label = "Kjøp",
}: {
  g: GameState;
  act: Act;
  o: KonsernOption;
  name: string;
  desc?: string;
  best?: boolean;
  label?: string;
}) {
  const reason = whyNot(g, o);
  const rating = payRating(o.payback);
  return (
    <div className={`g-buy-opt${best ? " is-best" : ""}`}>
      <div className="g-buy-opt-head">
        <strong>{name}</strong>
        {best ? (
          <span className="ds-status is-ok">Anbefalt</span>
        ) : (
          o.gain > 0 && <span className={`ds-status is-${rating.tone}`}>{rating.label}</span>
        )}
      </div>
      {desc && <p className="g-muted g-small-text">{desc}</p>}
      <dl className="g-buy-opt-stats">
        {o.gain > 0 && (
          <div>
            <dt>Gir konsernkassa</dt>
            <dd>
              +{fmtKr(o.gain)}
              <small> /ekte dag</small>
            </dd>
          </div>
        )}
        {o.gain > 0 && (
          <div>
            <dt>Betaler seg</dt>
            <dd>{Math.ceil(o.payback).toLocaleString("nb-NO")} ekte dager</dd>
          </div>
        )}
        {o.hours > 0 && (
          <div>
            <dt>Bygges</dt>
            <dd>{o.hours} t</dd>
          </div>
        )}
      </dl>
      <button
        className={best ? "g-primary" : undefined}
        disabled={!!reason}
        onClick={() => {
          act((gg) => o.run(gg));
          buzz(20);
        }}
      >
        {label} · {fmtKr(o.price)}
      </button>
      {reason && <p className="g-konsern-why g-small-text">{reason}</p>}
    </div>
  );
}

/** Bryter for å skru salgsdirektøren av og på (B-122). Vises under Folk → Ansatte og under Forespørsler på Salg */
export function DirectorSwitch({ g, act, compact }: { g: GameState; act: Act; compact?: boolean }) {
  const d = g.konsern?.director;
  if (!d) return null;
  // Kort variant på Salg (B-241): forklaringen som én linje under bryteren, ikke en egen boks
  if (compact)
    return (
      <label className="g-toggle">
        <input
          type="checkbox"
          checked={d.active}
          onChange={(e) => act((gg) => void (gg.konsern.director && (gg.konsern.director.active = e.target.checked)))}
        />
        <span>
          Salgsdirektøren signerer for meg
          <small className="g-muted g-toggle-hint">
            {d.active
              ? "Tar det verket trygt rekker. Resten står her, så du kan ta dem selv"
              : "Av: du signerer alt selv"}
          </small>
        </span>
      </label>
    );
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

/**
 * Tilbud om salgsdirektør der man signerer forespørsler (B-210): før fantes den bare under Konsern, og mange fant den
 * ikke. Vises når konsernet er åpnet og ingen salgsdirektør er ansatt.
 */
export function DirectorOffer({ g, act }: { g: GameState; act: Act }) {
  if (!g.konsern?.unlocked || g.konsern.director) return null;
  const missing = DIRECTOR_HIRE - Math.max(0, g.cash);
  return (
    <div className="g-note g-director-offer">
      <span>
        <strong>Slipp å signere selv:</strong> en salgsdirektør signerer forespørslene verket trygt rekker.{" "}
        {fmtKr(DIRECTOR_HIRE)} + {fmtKr(directorPerDay(g))} per døgn.
      </span>
      <button
        className="g-small"
        disabled={missing > 0}
        onClick={() => {
          act((gg) => hireDirector(gg));
          buzz(20);
        }}
      >
        Ansett salgsdirektør
      </button>
      {missing > 0 && <span className="g-konsern-why g-small-text">Du mangler {fmtKr(Math.ceil(missing))}.</span>}
    </div>
  );
}

/** Oppgradering av salgsdirektøren (B-172): hva den har, og neste steg med pris */
function DirectorUpgrade({ g, act }: { g: GameState; act: Act }) {
  const level = directorLevel(g);
  const next = nextDirectorUpgrade(g);
  const have = DIRECTOR_UPGRADES.slice(0, level).map((u) => u.name);
  return (
    <div className="g-upgrade">
      {have.length > 0 && <p className="g-muted g-small-text">✓ Har: {have.join(", ")}.</p>}
      {next ? (
        <>
          <strong>Oppgrader: {next.name}</strong>
          <span className="g-muted g-small-text">{next.text}</span>
          <div className="g-konsern-buy">
            <button
              disabled={g.cash < next.price}
              onClick={() => {
                act((gg) => upgradeDirector(gg));
                buzz(20);
              }}
            >
              Kjøp ({fmtKr(next.price)})
            </button>
            {g.cash < next.price && (
              <span className="g-konsern-why g-small-text">
                Du mangler {fmtKr(Math.ceil(next.price - Math.max(0, g.cash)))}.
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="g-muted g-small-text">Salgsdirektøren er fullt oppgradert.</p>
      )}
    </div>
  );
}

/** Salgsdirektøren (B-117): signerer kontrakter og rammeavtaler selv – meget dyrt. Kort, med resten foldet bort (B-123) */
export function DirectorCard({ g, act }: { g: GameState; act: Act }) {
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
          <DirectorUpgrade g={g} act={act} />
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

/** Tid som gjenstår, med vanlige ord: «3 t 20 min», «12 min» */
function fmtLeft(ms: number): string {
  const min = Math.ceil(ms / 60_000);
  if (min <= 1) return "under ett minutt";
  const h = Math.floor(min / 60);
  return h > 0 ? (min % 60 ? `${h} t ${min % 60} min` : `${h} t`) : `${min} min`;
}

/** Et byggeprosjekt som pågår (B-209): hva som skjer, når det er ferdig, og hvor langt det er kommet */
function ProjectStatus({ p }: { p: SisterPlant }) {
  if (!p.project) return null;
  const left = Math.max(0, p.project.readyAt - realNow());
  return (
    <div className="g-project">
      <span className="g-small-text">
        <Icon name="clock" /> {projectLabel(p)} · ferdig om {fmtLeft(left)}
      </span>
      <Bar value={projectProgress(p)} tone="accent" />
    </div>
  );
}

/** Knappene for et verk som ikke er hovedknappen: modernisere (for stålverk), bytte til kompleks og selge (B-123) */
function PlantMore({ g, act, p, options }: { g: GameState; act: Act; p: SisterPlant; options: KonsernOption[] }) {
  const [selling, setSelling] = useState(false);
  const upgrade = options.find((o) => o.key === `bygg-${p.id}`);
  const extra = upgrade ? options.find((o) => o.key === `mod-${p.id}`) : undefined;
  const swap = options.find((o) => o.key === `bytt-${p.id}`);
  return (
    <>
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
            Ja, selg for {fmtKr(sisterSalePrice(g, p))}
          </button>
          <button onClick={() => setSelling(false)}>Avbryt</button>
        </div>
      ) : (
        <div className="g-konsern-buy">
          <button onClick={() => setSelling(true)}>Selg for {fmtKr(sisterSalePrice(g, p))}…</button>
          <span className="g-muted g-small-text">
            60 % av byggekostnaden. Pengene går i kassa, f.eks. til et storverk.
          </span>
        </div>
      )}
    </>
  );
}

/** Hovedknappen for et verk: utbygging for stålverk, ellers modernisering */
function mainOption(p: SisterPlant, options: KonsernOption[]) {
  const upgrade = options.find((o) => o.key === `bygg-${p.id}`);
  return { main: upgrade ?? options.find((o) => o.key === `mod-${p.id}`), isUpgrade: !!upgrade };
}

/**
 * Ett datterverk som rad (mobil, B-233): navn, type, moderniseringsprikker og utbyttet på én linje. Trykk for å åpne
 * knappene. Verket «Neste steg» gjelder, står åpent. Før var hvert verk et helt kort, og tolv verk ble en lang side.
 */
function PlantRow({
  g,
  act,
  p,
  dividend,
  options,
  advised,
}: {
  g: GameState;
  act: Act;
  p: SisterPlant;
  /** Utbyttet verket gir konsernet per døgn (B-181) */
  dividend: number;
  options: KonsernOption[];
  /** Rådet under «Neste steg» gjelder dette verket: bare da er knappen blå (B-206) */
  advised: boolean;
}) {
  const [open, setOpen] = useState(0);
  const down = p.downUntilDay > day(g);
  const { main, isUpgrade } = mainOption(p, options);
  const max = modernizeMax(g);
  return (
    <details className={`g-plant-row${advised ? " is-advised" : ""}`} open={advised || undefined}>
      <summary>
        <span className="g-plant-row-name">
          <strong>{p.name}</strong>
          <span className="g-muted g-small-text">
            {SISTER_TYPES[p.type].name}{" "}
            <span className="g-tier-dots" aria-label={`Modernisert ${p.level} av ${max}`}>
              {Array.from({ length: max }, (_, i) => (
                <i key={i} className={i < p.level ? "is-done" : ""} />
              ))}
            </span>
          </span>
        </span>
        <span className={`g-plant-row-value${down ? " g-badge-bad" : ""}`}>
          {p.project
            ? `Klar om ${fmtLeft(Math.max(0, p.project.readyAt - realNow()))}`
            : down
              ? `Står til dag ${p.downUntilDay}`
              : `+${fmtKr(dividend)}`}
        </span>
      </summary>
      <div className="g-plant-row-body">
        <p className="g-muted g-small-text">
          Modernisert {p.level} av {max}
          {underConstruction(p)
            ? ""
            : ` · tjener ${fmtKr(sisterProfit(g, p))}/døgn · gir ${fmtKr(dividend)} per ekte dag til konsernkassa`}{" "}
          · verdt {fmtKr(sisterValue(g, p))}
        </p>
        <ProjectStatus p={p} />
        {main && (
          <BuyButton
            g={g}
            act={act}
            o={main}
            primary={advised}
            label={isUpgrade ? "Bygg ut til storverk" : "Moderniser"}
          />
        )}
        {/* Nøkkelen nullstiller salgsbekreftelsen når feltet lukkes */}
        <details
          className="g-details"
          onToggle={(e) => !(e.target as HTMLDetailsElement).open && setOpen((n) => n + 1)}
        >
          <summary>{isUpgrade && !p.project ? "Moderniser eller selg" : "Selg verket"}</summary>
          <PlantMore key={open} g={g} act={act} p={p} options={options} />
        </details>
      </div>
    </details>
  );
}

/**
 * Verkene som tabell (PC, UI-3d, B-206): alle tallene side om side, så verkene kan sammenlignes. Hovedknappen står i
 * raden; «Mer» åpner en rad under med modernisering, bytte og salg. Verket rådet gjelder, er merket.
 */
function PlantTable({
  g,
  act,
  div,
  options,
  adviceKey,
}: {
  g: GameState;
  act: Act;
  div: number[];
  options: KonsernOption[];
  adviceKey?: string;
}) {
  const [more, setMore] = useState<number | null>(null);
  const today = day(g);
  const max = modernizeMax(g);
  return (
    <table className="g-plant-table">
      <thead>
        <tr>
          <th>Verk</th>
          <th>Modernisert</th>
          <th className="num">Driftsresultat</th>
          <th className="num">Utbytte per ekte dag</th>
          <th className="num">Verdi</th>
          <th>Neste steg for verket</th>
          <th aria-label="Flere valg" />
        </tr>
      </thead>
      <tbody>
        {g.konsern.plants.map((p, i) => {
          const down = p.downUntilDay > today;
          const { main, isUpgrade } = mainOption(p, options);
          const advised = !!adviceKey && adviceKey.endsWith(`-${p.id}`);
          const open = more === p.id;
          return (
            <Fragment key={p.id}>
              <tr className={advised ? "is-advice" : undefined}>
                <td>
                  <strong className="g-plant-name">
                    <Icon name="factory" /> {p.name}
                  </strong>
                  <span className="g-muted g-small-text">{SISTER_TYPES[p.type].name}</span>
                </td>
                <td>
                  <span className="g-plant-level" aria-label={`${p.level} av ${max}`}>
                    {Array.from({ length: max }, (_, n) => (
                      <i key={n} className={n < p.level ? "is-on" : undefined} />
                    ))}
                  </span>
                  <span className="g-muted g-small-text">
                    {p.level} av {max}
                  </span>
                </td>
                <td className="num">{underConstruction(p) ? "–" : `${fmtKr(sisterProfit(g, p))}/døgn`}</td>
                <td className="num">
                  {underConstruction(p) ? (
                    <span className="g-muted">Klar om {fmtLeft(Math.max(0, p.project!.readyAt - realNow()))}</span>
                  ) : down ? (
                    <span className="g-badge-bad">Står til dag {p.downUntilDay}</span>
                  ) : (
                    <strong>+{fmtKr(div[i])}/dag</strong>
                  )}
                </td>
                <td className="num">{fmtKr(sisterValue(g, p))}</td>
                <td>
                  {p.project ? (
                    <ProjectStatus p={p} />
                  ) : main ? (
                    <BuyButton
                      g={g}
                      act={act}
                      o={main}
                      primary={advised}
                      label={isUpgrade ? "Bygg ut til storverk" : "Moderniser"}
                    />
                  ) : (
                    <span className="g-muted g-small-text">Fullt modernisert</span>
                  )}
                </td>
                <td>
                  <button
                    className="g-plant-more"
                    aria-expanded={open}
                    aria-label={`Flere valg for ${p.name}`}
                    onClick={() => setMore(open ? null : p.id)}
                  >
                    Mer <Icon name={open ? "chevron-up" : "chevron-down"} />
                  </button>
                </td>
              </tr>
              {open && (
                <tr className="g-plant-more-row">
                  <td colSpan={7}>
                    <PlantMore g={g} act={act} p={p} options={options} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

/** Underfanene i Konsern (B-226) */
export type KonsernTabId = "oversikt" | "utvid" | "industri";
const KONSERN_TAB_IDS: KonsernTabId[] = ["oversikt", "utvid", "industri"];

/**
 * Konsernet som egen hovedside (B-226), med underfaner som Verket: Oversikt (tallene, neste steg og verkene), Utvid
 * (kjøp og felles tjenester) og Industrien (selskapene rundt verket og konsernkassa, B-227). Salgsdirektøren er under
 * Folk (B-229).
 */
export function KonsernPage({
  g,
  act,
  openTab,
  onTab,
  tender,
}: {
  g: GameState;
  act: Act;
  openTab?: string;
  onTab?: OnTab;
  tender: OpenTender | null;
}) {
  const [tab, setTab] = useState<KonsernTabId>(
    KONSERN_TAB_IDS.includes(openTab as KonsernTabId) ? (openTab as KonsernTabId) : "oversikt",
  );
  useReportTab(tab, onTab);
  const canBuy = konsernReady(g);
  const tabs: { id: KonsernTabId; label: string; count?: number; badge?: string; alert?: boolean }[] = [
    { id: "oversikt", label: "Oversikt" },
    { id: "utvid", label: "Utvid", count: canBuy },
    // Industrien rundt verket (B-227): skraplageret nå, flere selskaper, Kontroll og overtakelser senere (RETNING.md)
    { id: "industri", label: "Industrien", badge: tender ? "Anbud" : undefined },
  ];
  return (
    <div className={`g-grid g-konsern-page is-konsern is-${tab}`}>
      <div className="g-col-wide g-konsern-tabs-col">
        <SubTabs tabs={tabs} value={tab} onChange={setTab} label="Konsern" />
      </div>
      {tab === "oversikt" && tender && (
        <div className="g-col-wide g-konsern-tender-col">
          <Callout tone="heat">
            <strong>Anbud på {tender.name.toLowerCase()} er åpent</strong> til {fmtWhen(tender.closesAt)}. Eieren tjener
            på {EARNS_FROM[tender.type]}.{" "}
            <button className="g-link" onClick={() => setTab("industri")}>
              Se anbudet
            </button>
          </Callout>
        </div>
      )}
      {tab === "oversikt" && <KonsernOverview g={g} act={act} onBuy={() => setTab("utvid")} />}
      {tab === "utvid" && <KonsernBuy g={g} act={act} />}
      {tab === "industri" && <IndustryPanel g={g} act={act} />}
    </div>
  );
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("nb-NO", {
    weekday: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Neste steg: kjøpet som betaler seg raskest (B-119, B-235) */
function NextStep({ g, act }: { g: GameState; act: Act }) {
  const advice = konsernAdvice(g);
  if (!advice) return null;
  return (
    <div className="g-col g-konsern-next-col">
      <Card title="Neste steg" className="g-konsern-next">
        <p className="g-muted g-small-text">Det som betaler seg raskest nå:</p>
        <OptionCard
          g={g}
          act={act}
          o={advice}
          name={advice.title}
          best
          label="Gjør det"
          desc={
            advice.key.startsWith("bytt-")
              ? "Et stålkompleks tjener omtrent like mye som tre storverk, men tar bare én plass. Verket selges for det det er verdt, og pengene går til komplekset."
              : undefined
          }
        />
      </Card>
    </div>
  );
}

/**
 * Konsern → Oversikt (B-106, B-119, B-123, B-226): tallene og målet øverst, neste steg og verkene dine.
 * Forklaringen er foldet sammen når man har kommet i gang, så siden blir kort.
 */
function KonsernOverview({ g, act, onBuy }: { g: GameState; act: Act; onBuy: () => void }) {
  const k = g.konsern;
  const today = day(g);
  // Driftsresultatet i verkene og utbyttet til konsernkassa per ekte dag (B-181, B-304)
  // Et verk som bygges, tjener ingenting ennå (B-288): før sto det at det tjente, men beholdt alt selv
  const running = (p: SisterPlant) => p.downUntilDay <= today && !underConstruction(p);
  const building = k.plants.filter(underConstruction);
  // Per verk etter imperiebelastningen, så tallene per verk stemmer med summen
  const shown = dividends(g, k.plants);
  const drift = k.plants.filter(running).reduce((a, p) => a + sisterProfit(g, p), 0);
  const dividend = shown.reduce((a, b) => a + b, 0);
  const equity = konsernEquity(g);
  const options = konsernOptions(g);
  const advice = konsernAdvice(g);
  const next = KONSERN_MILESTONES[k.milestones];
  const konsernResearch = {
    total: RESEARCH.filter((r) => r.konsern).length,
    done: RESEARCH.filter((r) => r.konsern && g.researched.includes(r.id)).length,
  };
  return (
    <>
      {/* UI-3d (B-206): hovedkontoret. PC: nøkkeltallene og neste steg side om side, verkene som tabell over hele
          bredden, så kjøp til venstre og selskapene og salgsdirektøren til høyre. Mobil: samme rekkefølge, én kolonne */}
      <div className="g-col-wide g-konsern-head-col">
        <Card title="Konsernet">
          <div className="g-finance-head">
            <div className="g-finance-result">
              <span>Konsernverdi</span>
              <strong>{fmtKr(Math.floor(equity))}</strong>
            </div>
            <div className="g-finance-side">
              <span title="Betales av serveren én gang per ekte dag rett til konsernkassa – spillfarten betyr ingenting">
                Utbytte til konsernkassa <strong>{fmtKr(dividend)} per ekte dag</strong>
              </span>
              {k.plants.length > 0 && (
                <span title="Utbyttet øker når hjemmeverket har godt omdømme og lager stål som holder kvaliteten">
                  Flaggskipet <strong>+{Math.round(flagshipBonus(g) * 100)} %</strong> utbytte
                </span>
              )}
              <span>
                Datterverk{" "}
                <strong>
                  {k.plants.length} av {maxSisters(g)}
                </strong>
              </span>
              {hasPaidOut(g) && (
                <span title="Det kassa har tjent over taket. Teller ikke i konsernverdien">
                  Utbetalt til eierne <strong>{fmtKr(Math.floor(paidOutTotal(g)))}</strong>
                </span>
              )}
            </div>
          </div>
          {building.length > 0 && drift === 0 && (
            <p className="g-muted g-small-text">
              {building.length === 1 ? `${building[0].name} bygges` : `${building.length} verk bygges`} – ferdig om{" "}
              {fmtLeft(Math.max(0, Math.min(...building.map((p) => p.project!.readyAt)) - realNow()))}. Så begynner det
              å tjene penger til deg.
            </p>
          )}
          {drift > 0 && (
            <p className="g-muted g-small-text">
              Verkene tjener {fmtKr(drift)} per døgn. Det som kan løftes opp som utbytte, betales hver ekte dag rett til
              konsernkassa – der konkurransen med de andre spillerne foregår – uansett hvor fort du spiller. Jo flere
              verk, jo mindre gir hvert nytt verk: et stort konsern er tungt å styre.
            </p>
          )}
          {!g.won && (
            <>
              <Bar value={Math.max(0, equity) / WIN_CASH} tone="ok" label={`Mot sluttmålet ${fmtKr(WIN_CASH)}`} />
              {next && <p className="g-muted g-small-text">Neste milepæl: {fmtKr(next)} (gir fagpoeng).</p>}
            </>
          )}
          {g.won && <LegendProgress g={g} equity={equity} />}
          {/* Én linje i stedet for sju punkter åpne (B-288): resten står bak «Slik fungerer konsernet» */}
          {k.plants.length === 0 && (
            <p className="g-small-text">
              Et konsern er flere verk som tjener penger av seg selv. Start med ett stålverk – knappen står under «Neste
              steg».
            </p>
          )}
          <details className="g-details">
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
                <strong>Utbytte:</strong> hvert verk beholder {Math.round(KONSERN_ECONOMY.keepShare * 100)} % til
                vedlikehold og reserve. Resten betales som utbytte{" "}
                <strong>én gang per ekte dag rett til konsernkassa</strong> (Industrien), ikke til kassa hjemme – og
                spillfarten betyr ingenting. Jo flere verk, jo mindre gir hvert nytt verk: flere verk gir fortsatt mer,
                men ikke dobbelt så mye.
              </li>
              <li>
                <strong>Bygging tar tid – ekte tid,</strong> uansett spillfart: et stålverk {BUILD_HOURS.stalverk}{" "}
                timer, et storverk {BUILD_HOURS.storverk}, et stålkompleks {BUILD_HOURS.kompleks}, og hvert trinn
                modernisering {MODERNIZE_HOURS}. Verket går som før mens det moderniseres. Ett prosjekt om gangen per
                verk.
              </li>
              <li>
                <strong>Hjemmeverket er flaggskipet:</strong> godt omdømme og stål som holder kvaliteten gir inntil +
                {Math.round(FLAGSHIP_MAX * 100)} % utbytte fra alle datterverkene.
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
      </div>
      <NextStep g={g} act={act} />
      {k.plants.length > 0 && (
        <div className="g-col-wide g-konsern-plants">
          <Card title={`Dine verk (${k.plants.length} av ${maxSisters(g)} datterverk)`}>
            <div className="g-plant-cards">
              <p className="g-muted g-small-text g-plant-rows-hint">
                Tallet til høyre er utbyttet fra verket til konsernkassa per ekte dag. Trykk på et verk for å
                modernisere eller selge.
              </p>
              {k.plants.map((p, i) => (
                <PlantRow
                  key={p.id}
                  g={g}
                  act={act}
                  p={p}
                  dividend={shown[i]}
                  options={options}
                  advised={!!advice && advice.key.endsWith(`-${p.id}`)}
                />
              ))}
            </div>
            <PlantTable g={g} act={act} div={shown} options={options} adviceKey={advice?.key} />
          </Card>
        </div>
      )}
      {k.plants.length === 0 && (
        <div className="g-col-wide g-konsern-single">
          <Button variant="primary" icon="chevron-right" onClick={onBuy}>
            Kjøp det første verket under Utvid
          </Button>
        </div>
      )}
    </>
  );
}

/** Utvid (B-226): neste steg, nye verk og felles tjenester */
function KonsernBuy({ g, act }: { g: GameState; act: Act }) {
  const options = konsernOptions(g);
  const advice = konsernAdvice(g);
  const byKey = (key: string) => options.find((o) => o.key === key);
  const sharedIds = Object.keys(KONSERN_SHARED) as SharedId[];
  const owned = sharedIds.filter((id) => !byKey(`felles-${id}`));
  const hasStalverk = g.konsern.plants.some((p) => p.type === "stalverk");
  // Utbygging av verkene du har: de tre som betaler seg raskest (alle står under Oversikt → Dine verk)
  const grow = options
    .filter((o) => /^(mod|bygg|bytt)-/.test(o.key) && !o.blocked && o.key !== advice?.key)
    .sort((x, y) => x.payback - y.payback)
    .slice(0, 3);
  const types = (Object.keys(SISTER_TYPES) as SisterType[]).filter((t) => t !== "kompleks" || kompleksOpen(g));
  const shared = sharedIds.filter((id) => !owned.includes(id));
  return (
    <>
      <NextStep g={g} act={act} />
      <div className="g-col-wide g-konsern-buy-col">
        <Card title="Kjøp og utvid">
          <p className="g-muted g-small-text">
            Jo færre døgn før et kjøp har betalt seg, jo bedre. Verkene teller med i konsernverdien, så du taper ikke på
            å kjøpe.
          </p>
          <h3 className="g-subhead">Nye verk</h3>
          <div className="g-buy-opts">
            {types.map((t) => {
              const spec = SISTER_TYPES[t];
              return (
                <OptionCard
                  key={t}
                  g={g}
                  act={act}
                  o={byKey(`kjop-${t}`)!}
                  name={`Nytt ${spec.name.toLowerCase()}`}
                  desc={`${spec.description}${t === "storverk" && hasStalverk ? " Billigere: bygg ut et av stålverkene dine." : ""}`}
                />
              );
            })}
          </div>
          {grow.length > 0 && (
            <>
              <h3 className="g-subhead">Bygg ut verkene dine</h3>
              <div className="g-buy-opts">
                {grow.map((o) => (
                  <OptionCard key={o.key} g={g} act={act} o={o} name={o.title} label="Gjør det" />
                ))}
              </div>
              <p className="g-muted g-small-text">Alle verkene dine står under Oversikt.</p>
            </>
          )}
          {shared.length > 0 && (
            <>
              <h3 className="g-subhead">Felles for konsernet</h3>
              <div className="g-buy-opts">
                {shared.map((id) => (
                  <OptionCard
                    key={id}
                    g={g}
                    act={act}
                    o={byKey(`felles-${id}`)!}
                    name={KONSERN_SHARED[id].name}
                    desc={KONSERN_SHARED[id].description}
                  />
                ))}
              </div>
            </>
          )}
          {owned.length > 0 && (
            <p className="g-muted g-small-text">
              <Icon name="check" /> I drift: {owned.map((id) => KONSERN_SHARED[id].name).join(", ")}.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
