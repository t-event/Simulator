import { useState } from "react";
import { useReportTab, type OnTab } from "./tabMemory";
import { PRODUCTS, SCRAP_IDS, SCRAP_TYPES, stageRef } from "../game/data";
import { buyScrap, SCRAP_SELL_SHARE, scrapPrice, scrapSellPrice, sellScrap, scrapAlert } from "../game/engine";
import { energyPrice, hasPlanner, plannerOrders, productPrice, type PlantStats } from "../game/plant";
import { PowerCard } from "./Power";
import { auto, automationUnlocked, researchForScrap, scrapUnlocked } from "../game/research";
import type { GameState, ProductId, ScrapId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AnalysisLegend, Bar, Card, SubTabs } from "./common";
import { EventsNote } from "./Season";
import { worldFactor } from "../game/world";
import { AutoToggle } from "./AutoToggle";
import { fmtKr, fmtNum, fmtPct, fmtT } from "./format";
import { Icon } from "./icons";
import { Callout, StatusLine } from "./ds";
import { roadOpensInH, scrapBlocked } from "../game/calendar";
import { TrendNote } from "./Trend";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
}

const BUY_AMOUNTS = [
  [0.25, 0.5, 1],
  [2, 5, 10],
  [20, 50, 100],
  [200, 500, 1000],
  [1000, 2500, 5000],
];

type MarketTab = "skrap" | "planlegger" | "strom" | "priser";

/**
 * Renhet som ett tall fra 0 til 1 (B-414): sporelementene veier mest (de kan bare tynnes ut), så fosfor og skitt.
 * Bare for visning – resepten regner med de ekte tallene. Målt mot den verste skraptypen i spillet.
 */
const WORST = {
  tramp: Math.max(...SCRAP_IDS.map((id) => SCRAP_TYPES[id].tramp)),
  p: Math.max(...SCRAP_IDS.map((id) => SCRAP_TYPES[id].p)),
  dirt: Math.max(...SCRAP_IDS.map((id) => SCRAP_TYPES[id].dirt)),
};

function scrapPurity(id: ScrapId): number {
  const t = SCRAP_TYPES[id];
  return Math.max(0, 1 - (0.7 * t.tramp) / WORST.tramp - (0.15 * t.p) / WORST.p - (0.15 * t.dirt) / WORST.dirt);
}

function purityWord(v: number): string {
  return v >= 0.75 ? "Svært ren" : v >= 0.5 ? "Ren" : v >= 0.3 ? "Middels" : "Uren";
}

/** Renheten som stolpe på mobil; tallene står bak trykk på navnet */
function Purity({ id }: { id: ScrapId }) {
  const v = scrapPurity(id);
  return (
    <span className="g-scrap-purity">
      <span>Renhet: {purityWord(v)}</span>
      <Bar value={v} tone={v >= 0.5 ? "ok" : v >= 0.3 ? "accent" : "warning"} label={`Renhet ${purityWord(v)}`} />
    </span>
  );
}

/** Navnet på skrapet; trykk for å lese om det og selge det du har (B-051) */
function ScrapAbout({ g, act, id, stock }: Omit<Props, "stats"> & { id: ScrapId; stock?: boolean }) {
  const type = SCRAP_TYPES[id];
  return (
    <details className="g-scrap-about">
      <summary className="g-scrap-head">
        <strong>
          {type.name} <Icon name="info" className="g-scrap-info" />
        </strong>
        {stock && <span className="g-scrap-stock">{fmtT(g.scrap[id].t)} på lager</span>}
      </summary>
      <p className="g-muted">{type.description}</p>
      {stock && (
        <p className="g-scrap-facts">
          <span title="Fosfor">P {fmtNum(type.p, 3)}</span>
          <span title="Sporelementer">Spor {fmtNum(type.tramp, 2)}</span>
          <span title="Karbon">C {fmtNum(type.c, 2)}</span>
          <span title="Rust, jord og olje">Skitt {fmtPct(type.dirt)}</span>
        </p>
      )}
      {g.scrap[id].t >= 1 && (
        <button className="g-small" onClick={() => act((gg) => sellScrap(gg, id, gg.scrap[id].t))}>
          Selg alt ({fmtT(g.scrap[id].t)}) for {fmtKr(g.scrap[id].t * scrapSellPrice(g, id))}
        </button>
      )}
    </details>
  );
}

/** Pil når prisen er over eller under det normale; ordet står for skjermlesere */
function Trend({ g, id }: { g: GameState; id: ScrapId }) {
  const type = SCRAP_TYPES[id];
  if (!type.buyable) return null;
  const trend = scrapPrice(g, id) / type.price;
  if (trend > 1.05) return <Icon name="trend-up" className="g-trend up" label="dyrere enn vanlig" />;
  if (trend < 0.95) return <Icon name="trend-down" className="g-trend down" label="billigere enn vanlig" />;
  return null;
}

function BuyButtons({ g, act, id, amounts }: Omit<Props, "stats"> & { id: ScrapId; amounts: number[] }) {
  const type = SCRAP_TYPES[id];
  if (!type.buyable) return <div className="g-scrap-actions" />;
  const price = scrapPrice(g, id);
  return (
    <div className="g-scrap-actions">
      {amounts.map((t) => (
        <button key={t} className="g-buy" onClick={() => act((gg) => buyScrap(gg, id, t))}>
          +{fmtT(t)}
          <small>{fmtKr(price * t)}</small>
        </button>
      ))}
    </div>
  );
}

export function Market({ g, stats, act, openTab, onTab }: Props & { openTab?: string; onTab?: OnTab }) {
  const [chosen, setTab] = useState<MarketTab>(() =>
    openTab && ["skrap", "planlegger", "strom", "priser"].includes(openTab) ? (openTab as MarketTab) : "skrap",
  );
  // Planleggerens innkjøp har egen fane når det finnes en planlegger (B-414); ellers står fanen ikke der
  const planner = plannerOrders(g);
  const tab: MarketTab = chosen === "planlegger" && !planner ? "skrap" : chosen;
  useReportTab(tab, onTab);
  const amounts = BUY_AMOUNTS[g.stage];
  // Stålprisen mot normalt, med felles hendelser som eksportboom og importpress (B-129)
  const steelNow = g.market.steelFactor * worldFactor(g, "steel");
  // Strømavtaler og effekttariff vises fra verkstedet; i garasjen holder det med prisen (B-045)
  const electric = stats.furnace.fuel === "strøm" && g.stage >= 1;
  const open = SCRAP_IDS.filter((id) => scrapUnlocked(g, id));
  // Det resepten trenger til neste charge, men som mangler på lageret (B-049)
  const short = scrapAlert(g, stats);
  // Låste skraptyper gruppert etter forskningen som låser dem opp
  const locked = new Map<string, ScrapId[]>();
  for (const id of SCRAP_IDS.filter((x) => !scrapUnlocked(g, x))) {
    const r = researchForScrap(id);
    // Bare det som kan forskes fram på dette nivået; resten er for langt fram
    if (r && r.stage <= g.stage) locked.set(r.name, [...(locked.get(r.name) ?? []), id]);
  }
  // Valg for planleggerens døgngrense, tilpasset størrelsen på verket
  const capBase = [5_000, 10_000, 100_000, 500_000, 2_500_000][g.stage];
  const capOptions = [...new Set([1, 2, 5, 10].map((m) => m * capBase).concat(g.settings.autoBuyMaxPerDay ?? []))].sort(
    (a, b) => a - b,
  );
  // Valg for hvor mye skrap planleggeren holder på lager (B-271): andeler av skraplageret, avrundet
  const roundT = (t: number) => {
    const step = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, t))) - 1);
    return Math.max(1, Math.round(t / step) * step);
  };
  const stockOptions = [
    ...new Set([0.1, 0.25, 0.5, 0.75, 1].map((f) => roundT(stats.yardT * f)).concat(g.settings.autoBuyTargetT ?? [])),
  ].sort((a, b) => a - b);
  const tabs: { id: MarketTab; label: string; alert?: boolean }[] = [
    { id: "skrap", label: "Skrap", alert: short.length > 0 },
    ...(planner ? [{ id: "planlegger" as const, label: "Planlegger", alert: !!g.autoBuyNote }] : []),
    { id: "strom", label: stats.furnace.fuel === "strøm" ? "Strøm" : "Energi" },
    { id: "priser", label: "Priser" },
  ];
  return (
    <div className={`g-grid g-market is-${tab}`}>
      <div className="g-col-wide">
        <SubTabs tabs={tabs} value={tab} onChange={setTab} label="Marked" />
        <EventsNote g={g} />

        {tab === "skrap" && (
          <Card
            title="Kjøp skrap"
            right={
              <span className="g-muted">
                Lager {fmtT(stats.yardUsed)} / {fmtT(stats.yardT)}
              </span>
            }
          >
            <Bar value={stats.yardUsed / stats.yardT} label="Skraplager" />
            {/* Snøstorm (B-279): ingen skrapbiler kommer fram */}
            {scrapBlocked(g) && (
              <Callout tone="heat">
                Snøstorm: veien er stengt, og skrapbilene kommer fram om ca. {roadOpensInH(g)} timer. Ovnene bruker
                skrapet på lageret.
              </Callout>
            )}
            {/* Mobil: ett kort per skraptype. PC: samme data som tabell (B-197) */}
            <div className="g-scrap-list">
              {open.map((id) => {
                const type = SCRAP_TYPES[id];
                const price = scrapPrice(g, id);
                return (
                  <div className={`g-scrap${short.includes(id) ? " is-short" : ""}`} key={id}>
                    <ScrapAbout g={g} act={act} id={id} stock />
                    {short.includes(id) && (
                      <p className="g-note g-warn">
                        Resepten trenger mer {type.name.toLowerCase()} – ovnen venter på det.
                      </p>
                    )}
                    <div className="g-scrap-facts">
                      <span>
                        {type.buyable ? `${fmtKr(price)}/tonn` : "Gratis"}
                        <Trend g={g} id={id} />
                      </span>
                      <Purity id={id} />
                    </div>
                    <BuyButtons g={g} act={act} id={id} amounts={amounts} />
                  </div>
                );
              })}
            </div>
            <table className="g-scrap-table">
              <thead>
                <tr>
                  <th scope="col">Skraptype</th>
                  <th scope="col" className="num">
                    Pris per tonn
                  </th>
                  <th scope="col" className="num" title="Fosfor">
                    P
                  </th>
                  <th scope="col" className="num" title="Sporelementer">
                    Spor
                  </th>
                  <th scope="col" className="num" title="Karbon">
                    C
                  </th>
                  <th scope="col" className="num" title="Rust, jord og olje">
                    Skitt
                  </th>
                  <th scope="col" className="num">
                    På lager
                  </th>
                  <th scope="col">Kjøp</th>
                </tr>
              </thead>
              <tbody>
                {open.map((id) => {
                  const type = SCRAP_TYPES[id];
                  return (
                    <tr key={id} className={short.includes(id) ? "is-short" : ""}>
                      <td>
                        <ScrapAbout g={g} act={act} id={id} />
                        {short.includes(id) && <StatusLine status="tomt" label="Resepten venter på dette" />}
                      </td>
                      <td className="num">
                        {type.buyable ? fmtKr(scrapPrice(g, id)) : "Gratis"}
                        <Trend g={g} id={id} />
                      </td>
                      <td className="num">{fmtNum(type.p, 3)}</td>
                      <td className="num">{fmtNum(type.tramp, 2)}</td>
                      <td className="num">{fmtNum(type.c, 2)}</td>
                      <td className="num">{fmtPct(type.dirt)}</td>
                      <td className="num">{fmtT(g.scrap[id].t)}</td>
                      <td>
                        <BuyButtons g={g} act={act} id={id} amounts={amounts} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <AnalysisLegend dirt />
            {[...locked].map(([name, ids]) => (
              <p key={name} className="g-note g-locked-scrap">
                <Icon name="lock" /> {ids.map((id) => SCRAP_TYPES[id].name).join(" · ")} – forsk fram «{name}».
              </p>
            ))}
            {planner ? (
              <p className="g-note g-planner-line">
                Planleggerens innkjøp: {auto(g, "autoBuy") ? "på" : automationUnlocked(g, "autoBuy") ? "av" : "låst"}
                {g.autoBuyNote ? ` – får ikke kjøpt ${g.autoBuyNote}` : ""}.{" "}
                <button className="g-link" onClick={() => setTab("planlegger")}>
                  Innstillinger
                </button>
              </p>
            ) : (
              <p className="g-note">
                Du kjøper skrap selv.{" "}
                {g.stage >= 2
                  ? "Ansett en planlegger under Folk"
                  : `Når du har flyttet til ${stageRef(2, g.stage)}, kan du ansette en planlegger`}{" "}
                som kjøper inn automatisk.
              </p>
            )}
          </Card>
        )}

        {tab === "planlegger" && (
          <Card title="Planleggerens innkjøp">
            <AutoToggle
              g={g}
              act={act}
              k="autoBuy"
              label={`La planleggeren kjøpe inn etter resepten (holder ca. ${fmtNum(g.settings.autoBuyDays, 1)} døgns forbruk)`}
            />
            {auto(g, "autoBuy") && (
              <>
                {/* Hvor mye skrap planleggeren holder på lager (B-271) */}
                <label className="g-field">
                  <span>Planleggeren holder på lager</span>
                  <select
                    value={g.settings.autoBuyTargetT ?? ""}
                    onChange={(e) =>
                      act(
                        (gg) =>
                          void (gg.settings.autoBuyTargetT = e.target.value === "" ? null : Number(e.target.value)),
                      )
                    }
                  >
                    <option value="">Automatisk (ca. {fmtNum(g.settings.autoBuyDays, 1)} døgns forbruk)</option>
                    {stockOptions.map((t) => (
                      <option key={t} value={t}>
                        {fmtT(t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="g-field">
                  <span>Planleggeren kan bruke per døgn</span>
                  <select
                    value={g.settings.autoBuyMaxPerDay ?? ""}
                    onChange={(e) =>
                      act(
                        (gg) =>
                          void (gg.settings.autoBuyMaxPerDay = e.target.value === "" ? null : Number(e.target.value)),
                      )
                    }
                  >
                    <option value="">Ingen grense</option>
                    {capOptions.map((v) => (
                      <option key={v} value={v}>
                        Maks {fmtKr(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="g-toggle">
                  <input
                    type="checkbox"
                    checked={g.settings.autoBuyCredit}
                    onChange={(e) => act((gg) => void (gg.settings.autoBuyCredit = e.target.checked))}
                  />
                  <span>Planleggeren kan handle på kassekreditten når kassa er tom</span>
                </label>
                <label className="g-toggle">
                  <input
                    type="checkbox"
                    checked={g.settings.plannerSells !== false}
                    onChange={(e) => act((gg) => void (gg.settings.plannerSells = e.target.checked))}
                  />
                  <span>
                    Planleggeren kan selge skrap ingen resept i ordrekøen trenger, når lageret er fullt (
                    {Math.round(SCRAP_SELL_SHARE * 100)} % av prisen)
                  </span>
                </label>
                {g.autoBuyNote && <p className="g-note g-warn">Planleggeren får ikke kjøpt {g.autoBuyNote}.</p>}
                {!hasPlanner(g) && (
                  <p className="g-muted">Planleggeren er borte, men de faste bestillingene går som vanlig.</p>
                )}
                <p className="g-muted">
                  Brukt i dag: {fmtKr(g.today.autoBuyKr ?? 0)}.{" "}
                  {g.settings.autoBuyCredit
                    ? "Kassa kan gå i minus – husk at en uke over kredittgrensen er konkurs."
                    : "Uten kreditt lar planleggeren lønn og faste kostnader for ett døgn ligge igjen i kassa."}
                </p>
              </>
            )}
          </Card>
        )}

        {tab === "strom" &&
          (electric ? (
            <PowerCard g={g} stats={stats} act={act} />
          ) : (
            <Card title={stats.furnace.fuel === "strøm" ? "Strøm" : "Energi"}>
              <p className="g-muted">
                {stats.furnace.fuel === "strøm"
                  ? `Induksjonsovnen går på strøm. Nå: ${fmtNum(energyPrice(g), 2)} kr/kWh. Strømmen er billigst om natta. Strømavtaler kan du velge når du har flyttet til ${stageRef(1, g.stage)}.`
                  : "Ovnen fyres med gass til fast pris."}
              </p>
            </Card>
          ))}

        {tab === "priser" && (
          <Card title="Stålpriser">
            <TrendNote g={g} />
            <table className="g-table">
              <tbody>
                {(["stopegods", "blokk", "emne", "armering"] as ProductId[]).map((p) => (
                  <tr key={p} className={stats.products.includes(p) ? "" : "g-dim"}>
                    <td>{PRODUCTS[p].name}</td>
                    <td className="num">{fmtKr(productPrice(g, p, "standard"))}/tonn</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="g-muted">
              Markedet er {steelNow >= 1 ? "sterkt" : "svakt"} ({fmtPct(steelNow)} av normalt
              {worldFactor(g, "steel") !== 1 ? ", med hendelsen øverst" : ""}).
            </p>
            <h3 className="g-subhead">Skrappriser nå</h3>
            <table className="g-table">
              <tbody>
                {open
                  .filter((id) => SCRAP_TYPES[id].buyable)
                  .map((id) => (
                    <tr key={id}>
                      <td>{SCRAP_TYPES[id].name}</td>
                      <td className="num">{fmtKr(scrapPrice(g, id))}/tonn</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
