import { hasPaidOut, paidOutTotal } from "../game/reserve";
import { Fragment, useState } from "react";
import { useReportTab, type OnTab } from "./tabMemory";
import { WIN_CASH } from "../game/data";
import { loanFor, plannedPlants, WORLD_KONSERN } from "../game/konsernWorld";
import {
  daysToAfford,
  dividends,
  DIRECTOR_AGREEMENT_SHARE,
  flagshipBonus,
  projectLabel,
  projectProgress,
  realNow,
  underConstruction,
  DIRECTOR_HIRE,
  DIRECTOR_UPGRADES,
  directorDailyT,
  directorLevel,
  directorPerDay,
  nextDirectorUpgrade,
  upgradeDirector,
  fireDirector,
  hireDirector,
  KONSERN_MILESTONES,
  KONSERN_SHARED,
  kompleksOpen,
  earnedOf,
  titleAboveEarned,
  LEGENDS,
  moneyFor,
  nextLevelProgress,
  orderLabel,
  titleOf,
  konsernAdvice,
  konsernGrowOptions,
  konsernReady,
  konsernEquity,
  valueCreated,
  konsernOptions,
  maxSisters,
  moreSlotsText,
  MODERNIZE_GAIN,
  modernizeMax,
  nextTierTitle,
  plannedLevel,
  SISTER_TYPES,
  sisterProfit,
  sisterSalePrice,
  sisterValue,
  type KonsernOption,
  type SharedId,
} from "../game/konsern";
import { computePlantStats, day } from "../game/plant";
import { defaultRegion, isRegion, REGIONS, regionName } from "../game/regions";
import type { GameState, RegionId, SisterPlant, SisterType } from "../game/types";
import type { GameApi } from "../game/useGame";
import { buzz } from "./haptics";
import { Bar, Card, SubTabs } from "./common";
import { Button, Callout, Metric, type Delta } from "./ds";
import { useLastWorld, type OpenTender } from "./openTender";
import { EARNS_FROM, konsernValueOf } from "../net/world";
import { useKonsernRank } from "./konsernRank";
import { IndustryPanel } from "./Companies";
import { WorldMapPanel } from "./WorldMap";
import { NeedsAccount } from "./Account";
import { cancelOrderUi, getBuildRegion, movePlantUi, runOption, sellPlantUi, setBuildRegion } from "./konsernRun";
import { fmtKr, fmtT } from "./format";
import { MoneyGuideLink } from "./MoneyGuide";
import { Icon } from "./icons";

type Act = GameApi["act"];

/** Konsernnivået (B-150, B-325): tittelen og hvor langt verkene er kommet mot neste */
function LegendProgress({ g }: { g: GameState }) {
  const n = g.konsern.legends;
  const next = LEGENDS[n];
  const progress = nextLevelProgress(g);
  const earned = earnedOf(g);
  const earnedNext = LEGENDS[earned];
  const earnedProgress = nextLevelProgress(g, earned);
  return (
    <>
      {titleOf(g) && (
        <p className="g-legend-title">
          <Icon name="trophy" /> Tittel: <strong>{titleOf(g)}</strong>
        </p>
      )}
      {next && progress ? (
        <>
          <Bar
            value={progress.have / progress.need}
            tone="ok"
            label={`Mot ${next.title}: ${progress.have} av ${progress.need}`}
          />
          <p className="g-muted g-small-text">
            Neste: <strong>{next.title}</strong> når konsernet har {next.need}. Gir {next.fp} fagpoeng. {next.unlocks}
          </p>
        </>
      ) : (
        <p className="g-muted g-small-text">Alle titlene er nådd. Konsernet kan fortsatt vokse.</p>
      )}
      {/* Tittel fra før byttet, høyere enn det verkene har gitt (B-383): nye kjøp følger det opptjente nivået */}
      {titleAboveEarned(g) && earnedNext && earnedProgress && (
        <p className="g-muted g-small-text g-earned-note">
          Tittelen har du fra før, og den beholder du. Nye verk, trinn og stålkomplekser følger det verkene dine har
          gitt: {earned > 0 ? <strong>{LEGENDS[earned - 1].title}</strong> : "ingen tittel ennå"}. Neste:{" "}
          <strong>{earnedNext.title}</strong> ({earnedProgress.have} av {earnedProgress.need}).
        </p>
      )}
    </>
  );
}

/** Hvorfor en knapp ikke kan trykkes: sperret, eller hvor mye som mangler og omtrent når det er råd (B-119, B-326) */
function whyNot(g: GameState, o: KonsernOption): string | null {
  if (o.blocked) return o.blocked;
  const have = moneyFor(g, o);
  if (have >= o.price) return null;
  const missing = fmtKr(Math.ceil(o.price - Math.max(0, have)));
  const days = daysToAfford(g, o.price, o.pay);
  return o.pay === "kasse"
    ? `Du mangler ${missing}${days ? ` – ca. ${days} døgn med dagens overskudd` : ""}.`
    : `Konsernkassa mangler ${missing}${days ? ` – ca. ${days} ekte ${days === 1 ? "dag" : "dager"}` : ""}.`;
}

/**
 * Hvor mye et kjøp av verk kan låne i konsernbanken (B-437): det konsernkassa mangler, når det er innenfor rammen.
 * Bare for bestillinger (verk, utbygging, modernisering, bytte) – aldri for de felles funksjonene eller anbud.
 */
function optionLoan(g: GameState, o: KonsernOption): number {
  if (o.blocked || o.pay !== "konsernkasse" || !o.request) return 0;
  return loanFor(moneyFor(g, o), o.price, g.konsern.bank);
}

/**
 * Lån-knappen under et kjøp kassa ikke rekker til (B-437): sier hva som lånes, renten og hvordan det betales ned. Bare
 * på kjøpskortene (Utvid og «Neste steg»), ikke i tabellen over verkene, så den ikke står mange steder samtidig
 */
function LoanButton({
  g,
  o,
  loan,
  busy,
  onRun,
}: {
  g: GameState;
  o: KonsernOption;
  loan: number;
  busy: boolean;
  onRun: () => void;
}) {
  const bank = g.konsern.bank;
  if (loan <= 0 || !bank) return null;
  return (
    <div className="g-konsern-loan">
      <button disabled={busy} onClick={onRun}>
        Lån {fmtKr(loan)} og {optionVerb(o).toLowerCase()}
      </button>
      <p className="g-muted g-small-text">
        Rente {Math.round(bank.rate * 1000) / 10} % per dag. {Math.round(bank.share * 100)} % av utbyttet og bidraget
        betaler ned lånet hver natt.
      </p>
    </div>
  );
}

/** Knappen som kjøper: venter på serveren for verkene, så den ikke trykkes to ganger */
function useRunner(act: Act) {
  const [busy, setBusy] = useState(false);
  const run = (o: KonsernOption, loan = 0) => {
    if (busy) return;
    setBusy(true);
    buzz(20);
    void runOption(act, o, loan).finally(() => setBusy(false));
  };
  return { busy, run };
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
  const { busy, run } = useRunner(act);
  return (
    <div className="g-konsern-buy">
      <button className={primary ? "g-primary" : undefined} disabled={!!reason || busy} onClick={() => run(o)}>
        {label ?? "Kjøp"} ({fmtKr(o.price)})
      </button>
      <span className="g-muted g-small-text">
        {o.gain > 0 &&
          (o.pay === "kasse"
            ? `+${fmtKr(o.gain)} per døgn · betaler seg på ca. ${Math.ceil(o.payback)} døgn`
            : `+${fmtKr(o.gain)} per ekte dag til konsernkassa · betaler seg på ca. ${Math.ceil(o.payback)} dager`)}
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
  label,
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
  const loan = optionLoan(g, o);
  const rating = payRating(o.payback);
  const { busy, run } = useRunner(act);
  const perDay = o.pay === "kasse" ? "per døgn" : "per dag";
  const days = o.pay === "kasse" ? "døgn" : "dager";
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
      {/* Tallene på én linje (B-372): før tok de tre bokser og halve skjermen på mobil */}
      {(o.gain > 0 || o.hours > 0) && (
        <p className="g-buy-opt-line">
          {o.gain > 0 && (
            <>
              <strong>+{fmtKr(o.gain)}</strong> {perDay} · betalt tilbake på{" "}
              <strong>
                {Math.ceil(o.payback).toLocaleString("nb-NO")} {days}
              </strong>
            </>
          )}
          {o.gain > 0 && o.hours > 0 && " · "}
          {o.hours > 0 && (
            <>
              bygges på <strong>{o.hours} t</strong>
            </>
          )}
        </p>
      )}
      <button className={best ? "g-primary" : undefined} disabled={!!reason || busy} onClick={() => run(o)}>
        {label ?? optionVerb(o)} · {fmtKr(o.price)}
        {o.pay === "kasse" ? " fra kassa hjemme" : ""}
      </button>
      {reason && <p className="g-konsern-why g-small-text">{reason}</p>}
      <LoanButton g={g} o={o} loan={loan} busy={busy} onRun={() => run(o, loan)} />
    </div>
  );
}

/** Ordet på knappen etter hva kjøpet er (B-372): «Gjør det» sa ikke hva som skjer */
function optionVerb(o: KonsernOption): string {
  if (o.key.startsWith("mod-")) return "Moderniser";
  if (o.key.startsWith("bygg-")) return "Bygg ut";
  if (o.key.startsWith("bytt-")) return "Bytt";
  return "Kjøp";
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
  // Hva direktøren regner med (B-312): det verket faktisk har laget, ikke det det kan lage – så det er forståelig
  // hvorfor forespørsler blir liggende når ovnene står
  const stats = computePlantStats(g);
  const perDay = d ? directorDailyT(g, stats) : 0;
  const farBelow = d && stats.dailyProductT > 0 && perDay < stats.dailyProductT * 0.6;
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
          {d.active && (
            <p className={farBelow ? "g-note" : "g-muted"}>
              Regner med {fmtT(perDay)} per døgn – det verket har laget den siste uka
              {farBelow
                ? `. Verket kan lage ${fmtT(stats.dailyProductT)}; se hva ovnene venter på under Verket → Anlegg.`
                : "."}
            </p>
          )}
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
  const [busy, setBusy] = useState(false);
  // Et verk med et prosjekt eller noe i køen kan ikke selges før det er ferdig (serveren sier det samme)
  const locked = !!p.project || g.konsern.orders.some((o) => o.status === "kø" && o.plantId === p.id);
  const upgrade = options.find((o) => o.key === `bygg-${p.id}`);
  const extra = upgrade ? options.find((o) => o.key === `mod-${p.id}`) : undefined;
  const swap = options.find((o) => o.key === `bytt-${p.id}`);
  return (
    <>
      {extra && <BuyButton g={g} act={act} o={extra} primary={false} label="Moderniser" />}
      {swap && <BuyButton g={g} act={act} o={swap} primary={false} label="Bytt til stålkompleks" />}
      <MovePlant g={g} act={act} p={p} />
      {locked ? (
        <p className="g-muted g-small-text">Verket kan selges når prosjektet og køen for det er ferdig.</p>
      ) : selling ? (
        <div className="g-row g-konsern-buy">
          <button
            className="g-danger"
            disabled={busy || !g.konsern.treasury}
            onClick={() => {
              setBusy(true);
              void sellPlantUi(act, p.id, p.name).finally(() => {
                setBusy(false);
                setSelling(false);
              });
            }}
          >
            Ja, selg for {fmtKr(sisterSalePrice(g, p))}
          </button>
          <button onClick={() => setSelling(false)}>Avbryt</button>
        </div>
      ) : (
        <div className="g-konsern-buy">
          <button disabled={!g.konsern.treasury} onClick={() => setSelling(true)}>
            Selg for {fmtKr(sisterSalePrice(g, p))}…
          </button>
          <span className="g-muted g-small-text">
            {Math.round(WORLD_KONSERN.sellShare * 100)} % av byggekostnaden. Pengene går i konsernkassa, f.eks. til et
            storverk.
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
 * Trinnet til et datterverk (B-394), likt på mobil og PC: prikker og «Trinn 3 av 5» med ord. Grønn prikk = trinn verket
 * har; ring = trinn som bygges eller står i køen («Trinn 3 → 4»); grå = trinn som kan kjøpes. Før viste raden bare små
 * prikker uten ord, og spillerne fant ikke trinnet.
 */
function PlantTier({ g, p, max, short = false }: { g: GameState; p: SisterPlant; max: number; short?: boolean }) {
  const planned = Math.min(plannedLevel(g, p), Math.max(max, p.level));
  const dots = Math.max(max, p.level);
  const label = `Trinn ${p.level} av ${max}${planned > p.level ? `, trinn ${planned} bygges` : ""}`;
  return (
    <span className="g-plant-tier" aria-label={label} title={label}>
      <span className="g-tier-dots g-tier-dots-plant" aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => (
          <i key={i} className={i < p.level ? "is-done" : i < planned ? "is-now" : ""} />
        ))}
      </span>
      <span className="g-plant-tier-text" aria-hidden="true">
        {short ? "" : "Trinn "}
        {p.level}
        {planned > p.level && <span className="g-plant-tier-next"> → {planned}</span>}
        <span className="g-plant-tier-of"> av {max}</span>
      </span>
    </span>
  );
}

/** Hva trinnet betyr, i den åpne raden (B-394): hva neste trinn gir, eller hvorfor det ikke finnes flere */
function tierText(g: GameState, p: SisterPlant, max: number): string {
  if (p.level < max) return `Hvert trinn gir verket ${Math.round(MODERNIZE_GAIN * 100)}\u00a0% mer overskudd.`;
  const next = nextTierTitle(g);
  return next ? `Høyeste trinn nå – tittelen ${next} åpner trinn ${max + 1}.` : "Fullt modernisert.";
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
  // Åpen fra start hvis rådet gjelder verket – men bare når siden åpnes (B-373). Før åpnet og lukket radene seg mens
  // spillet gikk, hver gang rådet byttet verk, og hele lista hoppet
  const [startOpen] = useState(advised);
  const down = p.downUntilDay > day(g);
  const { main, isUpgrade } = mainOption(p, options);
  const max = modernizeMax(g);
  return (
    <details className={`g-plant-row${advised ? " is-advised" : ""}`} open={startOpen || undefined}>
      <summary>
        <span className="g-plant-row-name">
          <strong>{p.name}</strong>
          <span className="g-plant-row-meta g-small-text">
            <PlantTier g={g} p={p} max={max} />
            {/* Regionen ved trinnet (B-410), så raden sier hvor verket står uten å åpnes */}
            {p.region && <span className="g-plant-row-region"> · {regionName(p.region)}</span>}
          </span>
        </span>
        <span className="g-plant-row-side">
          <span className={`g-plant-row-value${down ? " g-badge-bad" : ""}`}>
            {p.project
              ? `Klar om ${fmtLeft(Math.max(0, p.project.readyAt - realNow()))}`
              : down
                ? `Står til dag ${p.downUntilDay}`
                : `+${fmtKr(dividend)}`}
          </span>
          <span className="g-plant-row-type g-muted g-small-text">{SISTER_TYPES[p.type].name}</span>
        </span>
      </summary>
      <div className="g-plant-row-body">
        <p className="g-small-text g-plant-tier-about">
          <strong>
            Trinn {p.level} av {max}.
          </strong>{" "}
          {tierText(g, p, max)}
        </p>
        <p className="g-muted g-small-text">
          {SISTER_TYPES[p.type].name}
          {underConstruction(p)
            ? ""
            : ` · tjener ${fmtKr(sisterProfit(g, p))}/døgn · gir ${fmtKr(dividend)} per ekte dag til konsernkassa`}{" "}
          · verdt {fmtKr(sisterValue(g, p))}
          {p.region && ` · står i ${regionName(p.region)}`}
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
          <summary>{isUpgrade && !p.project ? "Moderniser, flytt eller selg" : "Flytt eller selg"}</summary>
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
          <th>Trinn</th>
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
                  <PlantTier g={g} p={p} max={max} short />
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
                    <span className="g-muted g-small-text">{p.level >= max ? tierText(g, p, max) : ""}</span>
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

/**
 * Køen på serveren (B-326): prosjektene som er betalt og venter, i rekkefølge. Pengene er alt trukket fra
 * konsernkassa, så de kan ikke brukes til bud. Det siste kan avbestilles før det starter.
 */
function KonsernQueue({ g, act }: { g: GameState; act: Act }) {
  const [busy, setBusy] = useState(false);
  const orders = g.konsern.orders ?? [];
  if (!orders.length) return null;
  const now = realNow();
  const bound = orders.reduce((a, o) => a + o.cost, 0);
  const last = orders.filter((o) => o.status === "kø").at(-1);
  return (
    <div className="g-col-wide g-konsern-queue-col">
      <Card title={`Byggekøen (${orders.length} av ${WORLD_KONSERN.queueMax})`}>
        <p className="g-muted g-small-text">
          Betalt fra konsernkassa: {fmtKr(bound)} er bundet i prosjektene. Ett bygges om gangen, i ekte tid.
        </p>
        <ol className="g-konsern-queue">
          {orders.map((o) => (
            <li key={o.id}>
              <span>
                <strong>{orderLabel(g, o)}</strong>
                <span className="g-muted g-small-text">
                  {o.startsAt > now
                    ? ` · starter om ${fmtLeft(o.startsAt - now)}`
                    : ` · ferdig om ${fmtLeft(Math.max(0, o.readyAt - now))}`}{" "}
                  · {fmtKr(o.cost)}
                </span>
              </span>
              {o === last && o.startsAt > now && (
                <button
                  className="g-small"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void cancelOrderUi(act, o.id).finally(() => setBusy(false));
                  }}
                >
                  Avbestill
                </button>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/** Underfanene i Konsern (B-226) */
export type KonsernTabId = "oversikt" | "utvid" | "kart" | "industri";
const KONSERN_TAB_IDS: KonsernTabId[] = ["oversikt", "utvid", "kart", "industri"];

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
  openBook,
}: {
  g: GameState;
  act: Act;
  openTab?: string;
  onTab?: OnTab;
  tender: OpenTender | null;
  /** Åpner Fagboka på et kapittel (B-410) */
  openBook?: (chapter?: string) => void;
}) {
  const [tab, setTab] = useState<KonsernTabId>(
    KONSERN_TAB_IDS.includes(openTab as KonsernTabId) ? (openTab as KonsernTabId) : "oversikt",
  );
  useReportTab(tab, onTab);
  const canBuy = konsernReady(g);
  const tabs: { id: KonsernTabId; label: string; count?: number; badge?: string; alert?: boolean }[] = [
    { id: "oversikt", label: "Oversikt" },
    { id: "utvid", label: "Utvid", count: canBuy },
    // Verdenskartet (B-333): alle konsernene i en oppdiktet verden
    { id: "kart", label: "Kart" },
    // Industrien rundt verket (B-227): skraplageret nå, flere selskaper, Kontroll og overtakelser senere (RETNING.md)
    { id: "industri", label: "Industrien", badge: tender ? (tender.attacker ? "Oppkjøp" : "Anbud") : undefined },
  ];
  return (
    <div className={`g-grid g-konsern-page is-konsern is-${tab}`}>
      <div className="g-col-wide g-konsern-tabs-col">
        <SubTabs tabs={tabs} value={tab} onChange={setTab} label="Konsern" />
      </div>
      {tab === "oversikt" && tender && (
        <div className="g-col-wide g-konsern-tender-col">
          {tender.attacker ? (
            <Callout tone="heat">
              <strong>
                {tender.attacker} har lagt inn et oppkjøpsbud på {tender.name.toLowerCase()}
              </strong>{" "}
              – avgjøres {fmtWhen(tender.closesAt)}. Du kan legge inn et motbud fra kassa eller beredskapsfondet.{" "}
              <button className="g-link" onClick={() => setTab("industri")}>
                Legg inn motbud
              </button>
            </Callout>
          ) : (
            <Callout tone="heat">
              <strong>Anbud på {tender.name.toLowerCase()} er åpent</strong> til {fmtWhen(tender.closesAt)}. Eieren
              tjener på {EARNS_FROM[tender.type]}.{" "}
              <button className="g-link" onClick={() => setTab("industri")}>
                Se anbudet
              </button>
            </Callout>
          )}
        </div>
      )}
      {tab === "oversikt" && <KonsernOverview g={g} act={act} onBuy={() => setTab("utvid")} openBook={openBook} />}
      {tab === "utvid" && <KonsernBuy g={g} act={act} onShowPlants={() => setTab("oversikt")} />}
      {tab === "kart" && <WorldMapPanel g={g} onBuild={() => setTab("utvid")} />}
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
/** Det som kommer inn i konsernkassa per ekte dag (utbytte etter politikken og bidrag), som linje under konsernverdien */
function inflowDelta(perDay: number): Delta {
  return perDay > 0
    ? { text: `+${fmtKr(perDay)} inn per ekte dag`, dir: "up", good: true }
    : { text: "Ingenting inn ennå", dir: "flat" };
}

function KonsernOverview({
  g,
  act,
  onBuy,
  openBook,
}: {
  g: GameState;
  act: Act;
  onBuy: () => void;
  openBook?: (chapter?: string) => void;
}) {
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
  const world = useLastWorld();
  const rank = useKonsernRank(!!world);
  const options = konsernOptions(g);
  const advice = konsernAdvice(g);
  const next = KONSERN_MILESTONES[k.milestones];
  return (
    <>
      {/* UI-3d (B-206): hovedkontoret. PC: nøkkeltallene og neste steg side om side, verkene som tabell over hele
          bredden, så kjøp til venstre og selskapene og salgsdirektøren til høyre. Mobil: samme rekkefølge, én kolonne */}
      <div className="g-col-wide g-konsern-head-col">
        <Card title="Konsernet">
          <div className="g-finance-head">
            {/* Konsernverdien er den samme som på topplista (B-320, B-322): regnet av serverens tall. Uten dem (uten
                konto) vises verdien i spillet */}
            {world ? (
              /* Under tallet: det som kommer inn i konsernkassa per ekte dag, så tallet vokser med det (B-404) */
              <Metric
                label={rank ? `Konsernverdi · nr. ${rank} på topplista` : "Konsernverdi"}
                title="Samme tall som på topplista: konsernkassa pluss 60 dagers utbytte og bidrag, minus lån"
                value={fmtKr(Math.floor(konsernValueOf(world, g.loan)))}
                delta={inflowDelta(world.dividend.perDay + world.contribution.perDay)}
              />
            ) : (
              <Metric label="Verdi i spillet" value={fmtKr(Math.floor(equity))} />
            )}
            {/* Tre tall ved siden av (B-407): det som kan brukes, det som kommer inn, og plassene. Resten står som én
                linje under, så konsernverdien er det man ser først */}
            <div className="g-finance-side">
              {k.treasury && (
                <span title="Pengene du kan kjøpe og bygge for – fylles av utbyttet og hovedverkets bidrag">
                  Konsernkassa <strong>{fmtKr(Math.floor(k.treasury.balance))}</strong>
                </span>
              )}
              <span title="Betales av serveren rett etter midnatt (norsk tid) til konsernkassa – spillfarten betyr ingenting">
                Utbytte til konsernkassa <strong>{fmtKr(dividend)} per ekte dag</strong>
              </span>
              <span>
                Datterverk{" "}
                <strong>
                  {k.plants.length} av {maxSisters(g)}
                </strong>
              </span>
            </div>
          </div>
          {(k.plants.length > 0 || world || hasPaidOut(g)) && (
            <p className="g-muted g-small-text g-konsern-meta">
              {[
                k.plants.length > 0 && (
                  <span
                    key="f"
                    title="Utbyttet øker når hjemmeverket har godt omdømme og lager stål som holder kvaliteten"
                  >
                    Flaggskipet +{Math.round(flagshipBonus(g) * 100)} % utbytte
                  </span>
                ),
                world && (
                  <span
                    key="v"
                    title="Kassa minus lån, pluss det verkene er verdt – sluttmålet på 10 mrd. og lista «Verdi i spillet»"
                  >
                    Verdi i spillet {fmtKr(Math.floor(equity))}
                  </span>
                ),
                hasPaidOut(g) && (
                  <span
                    key="p"
                    title="Fryst historikk fra da kassa hadde et tak (B-381). Teller med i sluttmålet og for de største ovnene, ikke i konsernverdien på topplista"
                  >
                    Privat formue {fmtKr(Math.floor(paidOutTotal(g)))}
                  </span>
                ),
              ]
                .filter(Boolean)
                .flatMap((el, i) => (i ? [" · ", el] : [el]))}
            </p>
          )}
          {building.length > 0 && drift === 0 && (
            <p className="g-muted g-small-text">
              {building.length === 1 ? `${building[0].name} bygges` : `${building.length} verk bygges`} – ferdig om{" "}
              {fmtLeft(Math.max(0, Math.min(...building.map((p) => p.project!.readyAt)) - realNow()))}. Så begynner det
              å tjene penger til deg.
            </p>
          )}
          {drift > 0 && (
            <p className="g-muted g-small-text">
              Verkene tjener {fmtKr(drift)} per døgn. Utbyttet betales hver ekte dag til konsernkassa, uansett hvor fort
              du spiller.
            </p>
          )}
          {!g.won && (
            <>
              <Bar
                value={Math.max(0, valueCreated(g)) / WIN_CASH}
                tone="ok"
                label={`Mot sluttmålet ${fmtKr(WIN_CASH)}`}
              />
              {next && <p className="g-muted g-small-text">Neste milepæl: {fmtKr(next)} (gir fagpoeng).</p>}
            </>
          )}
          <LegendProgress g={g} />
          {/* Én linje i stedet for sju punkter åpne (B-288): resten står bak «Slik fungerer konsernet» */}
          {k.plants.length === 0 && (
            <p className="g-small-text">
              Et konsern er flere verk som tjener penger av seg selv. Start med ett stålverk – knappen står under «Neste
              steg».
            </p>
          )}
          <MoneyGuideLink g={g} />
          {/* Reglene står i Fagboka (B-410): ett trykk dit i stedet for åtte punkter her */}
          {openBook && (
            <button className="g-link g-konsern-howto" onClick={() => openBook("konsernregler")}>
              <Icon name="book" /> Slik fungerer konsernet
            </button>
          )}
        </Card>
      </div>
      <NextStep g={g} act={act} />
      <KonsernQueue g={g} act={act} />
      {k.plants.length > 0 && (
        <div className="g-col-wide g-konsern-plants">
          <Card title={`Dine verk (${k.plants.length} av ${maxSisters(g)} datterverk)`}>
            <div className="g-plant-cards">
              <p className="g-muted g-small-text g-plant-rows-hint">
                Tallet til høyre er utbyttet per ekte dag. Trykk på et verk for å modernisere eller selge.
              </p>
              {k.plants.length >= maxSisters(g) - 1 && (
                <p className="g-muted g-small-text g-plant-rows-hint">{moreSlotsText(g)}</p>
              )}
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
/** Hvor nye verk bygges (B-333): valgt region, eller der du har færrest verk */
function BuildRegionPicker({ g }: { g: GameState }) {
  const [region, setRegion] = useState<RegionId | "">(getBuildRegion() ?? "");
  const auto = defaultRegion(g.konsern.plants, g.konsern.orders ?? []);
  return (
    <label className="g-field g-region-pick">
      <span className="g-small-text">Hvor skal nye verk bygges?</span>
      <select
        value={region}
        onChange={(e) => {
          const v = isRegion(e.target.value) ? e.target.value : "";
          setRegion(v);
          setBuildRegion(v || null);
        }}
      >
        <option value="">Der du har færrest verk ({regionName(auto)})</option>
        {REGIONS.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <small className="g-muted">Verk i samme region som et selskap du eier, gir mer Kontroll over det.</small>
    </label>
  );
}

/** Flytt et verk til en annen region, én gang (B-333) */
function MovePlant({ g, act, p }: { g: GameState; act: Act; p: SisterPlant }) {
  const [to, setTo] = useState<RegionId | "">("");
  const [busy, setBusy] = useState(false);
  if (!g.konsern.treasury) return null;
  if (p.moved)
    return (
      <p className="g-muted g-small-text">Står i {regionName(p.region)} (flyttet én gang, kan ikke flyttes igjen).</p>
    );
  return (
    <div className="g-konsern-buy g-region-move">
      <label className="g-field">
        <span className="g-small-text">Står i {regionName(p.region)}. Kan flyttes én gang, gratis:</span>
        <select value={to} onChange={(e) => setTo(isRegion(e.target.value) ? e.target.value : "")}>
          <option value="">Velg region</option>
          {REGIONS.filter((r) => r.id !== p.region).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <button
        disabled={!to || busy}
        onClick={() => {
          if (!to) return;
          setBusy(true);
          void movePlantUi(act, p.id, p.name, to).finally(() => {
            setBusy(false);
            setTo("");
          });
        }}
      >
        Flytt
      </button>
    </div>
  );
}

function KonsernBuy({ g, act, onShowPlants }: { g: GameState; act: Act; onShowPlants: () => void }) {
  const options = konsernOptions(g);
  const byKey = (key: string) => options.find((o) => o.key === key);
  const sharedIds = Object.keys(KONSERN_SHARED) as SharedId[];
  const owned = sharedIds.filter((id) => !byKey(`felles-${id}`));
  const hasStalverk = g.konsern.plants.some((p) => p.type === "stalverk");
  // Utbygging av verkene du har: det du har råd til først, så det som betaler seg raskest (B-432; alle står under
  // Oversikt → Dine verk)
  const grow = konsernGrowOptions(g, options);
  const types = (Object.keys(SISTER_TYPES) as SisterType[]).filter((t) => t !== "kompleks" || kompleksOpen(g));
  const shared = sharedIds.filter((id) => !owned.includes(id));
  const treasury = g.konsern.treasury;
  const bank = g.konsern.bank;
  const orders = g.konsern.orders ?? [];
  const pending = orders.filter((o) => o.status === "kø" || o.status === "i gang").length;
  // Verkene slik de blir når køen er ferdig (B-428), som serveren teller plassene: før ble bygg som er i gang
  // (allerede i lista) og ferdige bestillinger telt en gang til, og konsernet kunne se fullt ut
  const planned = plannedPlants({ plants: g.konsern.plants, orders }).length;
  const slots = maxSisters(g);
  const queueFull = pending >= WORLD_KONSERN.queueMax;
  const plantsFull = planned >= slots;
  return (
    <>
      {/* Status øverst (B-372): det som avgjør hva du kan kjøpe nå, før valgene */}
      <div className="g-col-wide g-utvid-status-col">
        <Card className="g-utvid-status">
          <dl className="g-utvid-facts">
            <div>
              <dt>Konsernkassa</dt>
              <dd>{treasury ? fmtKr(Math.floor(treasury.balance)) : "–"}</dd>
            </div>
            <div>
              <dt>Datterverk</dt>
              <dd>
                {planned} av {slots}
              </dd>
            </div>
            <div>
              <dt>Byggekøen</dt>
              <dd>
                {pending} av {WORLD_KONSERN.queueMax}
              </dd>
            </div>
            {/* Lånet vises først når det finnes (B-437); lån-knappen står ved kjøpene kassa ikke rekker til */}
            {bank && bank.loan > 0 && (
              <div>
                <dt>Lån</dt>
                <dd>{fmtKr(Math.ceil(bank.loan))}</dd>
              </div>
            )}
          </dl>
          <p className="g-muted g-small-text">
            Alt betales fra konsernkassa med én gang og bygges i ekte tid, ett prosjekt om gangen. Verkene tjener mens
            de moderniseres.
          </p>
          {bank && bank.loan > 0 && (
            <p className="g-muted g-small-text">
              Lånet betales ned med {Math.round(bank.share * 100)} % av utbyttet og bidraget hver natt. Renten er{" "}
              {Math.round(bank.rate * 1000) / 10} % per dag. Selger du et verk, går pengene først til lånet.
            </p>
          )}
          {queueFull && (
            <Callout tone="heat">Byggekøen er full. Du kan bestille igjen når det neste prosjektet er ferdig.</Callout>
          )}
          {!queueFull && plantsFull && (
            <Callout tone="info">
              Alle plassene for datterverk er i bruk. {moreSlotsText(g)} Til da kan du modernisere verkene du har.
            </Callout>
          )}
        </Card>
      </div>
      <NextStep g={g} act={act} />
      <KonsernQueue g={g} act={act} />
      <div className="g-col-wide g-konsern-buy-col">
        <Card title="Kjøp og utvid">
          {!treasury && <NeedsAccount feature="datterverk" />}
          <h3 className="g-subhead">Nye verk</h3>
          <p className="g-muted g-small-text">
            Stålverket er billigst, storverket tjener mer, og stålkomplekset tjener mest per plass. Jo færre dager før
            et kjøp er betalt tilbake, jo bedre.
          </p>
          {treasury && <BuildRegionPicker g={g} />}
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
              <h3 className="g-subhead">Gjør verkene dine bedre</h3>
              <p className="g-muted g-small-text">
                Hvert trinn modernisering gir verket 25 % mer overskudd. Det du har råd til nå, står først.
              </p>
              <div className="g-buy-opts">
                {grow.map((o) => (
                  <OptionCard key={o.key} g={g} act={act} o={o} name={o.title} />
                ))}
              </div>
              <button className="g-link g-utvid-all" onClick={onShowPlants}>
                Se alle verkene dine
              </button>
            </>
          )}
          {shared.length > 0 && (
            <>
              <h3 className="g-subhead">Felles for konsernet</h3>
              <p className="g-muted g-small-text">Kjøpes én gang og gjelder alle verkene.</p>
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
