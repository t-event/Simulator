import { PRODUCTS, SCRAP_IDS, SCRAP_TYPES } from "../game/data";
import { buyScrap, scrapPrice } from "../game/engine";
import { hasPlanner, productPrice, type PlantStats } from "../game/plant";
import { PowerCard } from "./Power";
import { researchForScrap, scrapUnlocked } from "../game/research";
import type { GameState, ProductId, ScrapId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { RecipeCard } from "./Recipe";
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

export function Market({ g, stats, act }: Props) {
  const amounts = BUY_AMOUNTS[g.stage];
  const electric = stats.furnace.fuel === "strøm";
  const open = SCRAP_IDS.filter((id) => scrapUnlocked(g, id));
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
  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <RecipeCard g={g} stats={stats} act={act} />

        <Card
          title="Kjøp skrap"
          right={
            <span className="g-muted">
              Lager {fmtT(stats.yardUsed)} / {fmtT(stats.yardT)}
            </span>
          }
        >
          <Bar value={stats.yardUsed / stats.yardT} label="Skraplager" />
          <div className="g-scrap-list">
            {open.map((id) => {
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
                        <button key={t} className="g-buy" onClick={() => act((gg) => buyScrap(gg, id, t))}>
                          +{fmtT(t)}
                          <small>{fmtKr(price * t)}</small>
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
          {[...locked].map(([name, ids]) => (
            <p key={name} className="g-note g-locked-scrap">
              🔒 {ids.map((id) => SCRAP_TYPES[id].name).join(" · ")} – forsk fram «{name}».
            </p>
          ))}
          {hasPlanner(g) ? (
            <div className="g-planner">
              <label className="g-toggle">
                <input
                  type="checkbox"
                  checked={g.settings.autoBuy}
                  onChange={(e) => act((gg) => void (gg.settings.autoBuy = e.target.checked))}
                />
                <span>
                  La planleggeren kjøpe inn etter resepten (holder ca. {fmtNum(g.settings.autoBuyDays, 1)} døgns
                  forbruk)
                </span>
              </label>
              {g.settings.autoBuy && (
                <>
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
                  <p className="g-muted">
                    Brukt i dag: {fmtKr(g.today.autoBuyKr ?? 0)}.{" "}
                    {g.settings.autoBuyCredit
                      ? "Kassa kan gå i minus – husk at en uke under kredittgrensen er konkurs."
                      : "Uten kreditt lar planleggeren lønn og faste kostnader for ett døgn ligge igjen i kassa."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="g-note">
              Du kjøper skrap selv.{" "}
              {g.stage >= 2 ? "Ansett en planlegger under Folk" : "Fra støperiet kan du ansette en planlegger"} som
              kjøper inn automatisk.
            </p>
          )}
        </Card>
      </div>

      <div className="g-col">
        {electric ? (
          <PowerCard g={g} stats={stats} act={act} />
        ) : (
          <Card title="Energi">
            <p className="g-muted">
              Digelen fyres med gass til fast pris. Strømprisen blir viktig når du får elektrisk ovn.
            </p>
          </Card>
        )}

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
