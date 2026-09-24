import { setRecipe } from "../game/actions";
import { GRADES, PRODUCTS, SCRAP_IDS, SCRAP_TYPES } from "../game/data";
import { buyScrap, recipeEstimate, scrapPrice } from "../game/engine";
import { hasPlanner, powerPrice, productPrice, type PlantStats } from "../game/plant";
import type { GameState, ProductId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AnalysisLine, Bar, Card, GradeChips } from "./common";
import { fmtKr, fmtNum, fmtPct, fmtT } from "./format";

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

const POWER_LIMITS: (number | null)[] = [null, 0.7, 0.9, 1.1, 1.4, 2];

export function Market({ g, stats, act }: Props) {
  const est = recipeEstimate(g, g.targetGrade, stats);
  const total = SCRAP_IDS.reduce((a, id) => a + g.recipe[id], 0);
  const amounts = BUY_AMOUNTS[g.stage];
  const hourPrices = Array.from({ length: 24 }, (_, h) => powerPrice(g, Math.floor(g.minute / 1440) * 1440 + h * 60));
  const maxHour = Math.max(...hourPrices);
  const nowHour = Math.floor((g.minute % 1440) / 60);
  const electric = stats.furnace.fuel === "strøm";

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <Card
          title="Skrap"
          right={
            <span className="g-muted">
              Lager {fmtT(stats.yardUsed)} / {fmtT(stats.yardT)}
            </span>
          }
        >
          <Bar value={stats.yardUsed / stats.yardT} label="Skraplager" />
          <div className="g-scrap-list">
            {SCRAP_IDS.map((id) => {
              const type = SCRAP_TYPES[id];
              const price = scrapPrice(g, id);
              const trend = price / type.price;
              return (
                <div className="g-scrap" key={id}>
                  <div className="g-scrap-head">
                    <strong>{type.name}</strong>
                    <span className="g-scrap-stock">{fmtT(g.scrap[id].t)} på lager</span>
                  </div>
                  <p className="g-muted">{type.description}</p>
                  <div className="g-scrap-facts">
                    <span>
                      {type.buyable ? `${fmtKr(price)}/t` : "Gratis"}
                      {type.buyable && (
                        <em className={trend > 1.05 ? "up" : trend < 0.95 ? "down" : ""}>
                          {trend > 1.05 ? " ▲" : trend < 0.95 ? " ▼" : ""}
                        </em>
                      )}
                    </span>
                    <span title="Fosfor">P {fmtNum(type.p, 3)}</span>
                    <span title="Sporelementer">Spor {fmtNum(type.tramp, 2)}</span>
                    <span title="Karbon">C {fmtNum(type.c, 2)}</span>
                    <span title="Rust, jord og olje">Skitt {fmtPct(type.dirt)}</span>
                  </div>
                  <div className="g-scrap-actions">
                    {type.buyable &&
                      amounts.map((t) => (
                        <button key={t} onClick={() => act((gg) => buyScrap(gg, id, t))}>
                          +{fmtT(t)}
                        </button>
                      ))}
                  </div>
                  <label className="g-recipe">
                    <span>I resepten</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={g.recipe[id]}
                      onChange={(e) => act((gg) => setRecipe(gg, id, Number(e.target.value)))}
                    />
                    <span className="g-recipe-share">{total > 0 ? fmtPct(g.recipe[id] / total) : "0 %"}</span>
                  </label>
                </div>
              );
            })}
          </div>
          {hasPlanner(g) ? (
            <label className="g-toggle">
              <input
                type="checkbox"
                checked={g.settings.autoBuy}
                onChange={(e) => act((gg) => void (gg.settings.autoBuy = e.target.checked))}
              />
              <span>
                La planleggeren kjøpe inn etter resepten (holder ca. {fmtNum(g.settings.autoBuyDays, 1)} døgns forbruk)
              </span>
            </label>
          ) : (
            <p className="g-note">
              Du kjøper skrap selv. {g.stage >= 2 ? "Ansett en planlegger under Folk" : "Fra støperiet kan du ansette en planlegger"} som
              kjøper inn automatisk.
            </p>
          )}
        </Card>
      </div>

      <div className="g-col">
        <Card title="Resepten gir">
          <p className="g-muted">
            Anslag ut fra hva skraptypene normalt inneholder, i {stats.furnace.name.toLowerCase()} kjørt mot{" "}
            {GRADES[g.targetGrade].name.toLowerCase()}. Faktisk analyse varierer med partiet.
          </p>
          <div className="g-estimate">
            <AnalysisLine a={est.analysis} />
            <span>Holder kravet til:</span>
            <GradeChips grades={est.grades} highlight={g.targetGrade} />
          </div>
          <div className="g-stats">
            <div className="g-stat">
              <span>Skrap per tonn</span>
              <strong>{fmtKr(est.scrapCostPerT)}</strong>
            </div>
            <div className="g-stat">
              <span>Stål per tonn skrap</span>
              <strong>{fmtPct(est.metallicYield)}</strong>
            </div>
            <div className="g-stat">
              <span>Energibehov</span>
              <strong>{fmtPct(est.energyFactor)}</strong>
            </div>
          </div>
          {stats.dephos === 0 && (
            <p className="g-note">
              Denne ovnen fjerner verken fosfor eller sporelementer, og karbon kan bare legges til. Det du legger i, får
              du ut.
            </p>
          )}
        </Card>

        <Card title={electric ? "Strøm" : "Energi"}>
          {electric ? (
            <>
              <p>
                Nå: <strong>{fmtNum(powerPrice(g), 2)} kr/kWh</strong>
                {g.market.powerSpikeDays > 0 && <span className="g-badge-bad"> Pristopp</span>}
              </p>
              <div className="g-power-chart" aria-label="Strømpris gjennom døgnet">
                {hourPrices.map((p, h) => (
                  <div
                    key={h}
                    className={`g-power-bar${h === nowHour ? " is-now" : ""}${g.settings.maxPowerPrice !== null && p > g.settings.maxPowerPrice ? " is-over" : ""}`}
                    style={{ height: `${(p / maxHour) * 100}%` }}
                    title={`${h}:00 – ${fmtNum(p, 2)} kr/kWh`}
                  />
                ))}
              </div>
              <label className="g-field">
                <span>Ikke start charger over</span>
                <select
                  value={g.settings.maxPowerPrice ?? ""}
                  onChange={(e) =>
                    act(
                      (gg) => void (gg.settings.maxPowerPrice = e.target.value === "" ? null : Number(e.target.value)),
                    )
                  }
                >
                  {POWER_LIMITS.map((v) => (
                    <option key={String(v)} value={v ?? ""}>
                      {v === null ? "Ingen grense" : `${fmtNum(v, 2)} kr/kWh`}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <p className="g-muted">
              Digelen fyres med gass til fast pris. Strømprisen blir viktig når du får elektrisk ovn.
            </p>
          )}
        </Card>

        <Card title="Stålpriser">
          <table className="g-table">
            <tbody>
              {(["stopegods", "blokk", "emne", "armering"] as ProductId[]).map((p) => (
                <tr key={p} className={stats.products.includes(p) ? "" : "g-dim"}>
                  <td>{PRODUCTS[p].name}</td>
                  <td className="num">{fmtKr(productPrice(g, p, "standard"))}/t</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="g-muted">
            Markedet er {g.market.steelFactor >= 1 ? "sterkt" : "svakt"} ({fmtPct(g.market.steelFactor)} av normalt).
          </p>
        </Card>
      </div>
    </div>
  );
}
