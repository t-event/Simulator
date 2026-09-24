import { applyRecipe, setRecipe } from "../game/actions";
import { GRADES, PRODUCTS, SCRAP_IDS, SCRAP_TYPES } from "../game/data";
import { buyScrap, recipeEstimate, scrapPrice } from "../game/engine";
import { hasPlanner, productPrice, type PlantStats } from "../game/plant";
import { PowerCard } from "./Power";
import { gradeChecks, suggestRecipe } from "../game/recipe";
import { researchForScrap, scrapUnlocked } from "../game/research";
import type { GameState, ProductId, ScrapId } from "../game/types";
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


export function Market({ g, stats, act }: Props) {
  const est = recipeEstimate(g, g.targetGrade, stats);
  const total = SCRAP_IDS.reduce((a, id) => a + g.recipe[id], 0);
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
  const checks = gradeChecks(g, g.targetGrade, est.analysis, stats);
  const suggest = () =>
    act((gg) => {
      const s = suggestRecipe(gg, gg.targetGrade, stats);
      if (!s)
        return {
          ok: false,
          message: `Ingen blanding av skrapet du har tilgang til, holder kravet til ${GRADES[gg.targetGrade].name.toLowerCase()}.`,
        };
      applyRecipe(gg, s.recipe);
      return { ok: true, message: "Resepten er satt." };
    });

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
            <GradeChips grades={est.grades.filter((id) => GRADES[id].minStage <= g.stage)} highlight={g.targetGrade} />
          </div>
          <ul className="g-checks g-recipe-checks">
            {checks.map((c) => (
              <li key={c.key} className={c.ok ? (c.close ? "warn" : "ok") : "bad"}>
                {c.label}: {fmtNum(c.value, c.key === "p" ? 3 : 2)} (krav {c.limit})
                {c.fix && <span className="g-fix">{c.fix}</span>}
                {c.close && <span className="g-fix">Nær grensen – skrapet varierer, så legg inn litt margin.</span>}
              </li>
            ))}
          </ul>
          <button className="g-primary" onClick={suggest}>
            Foreslå billigste resept for {GRADES[g.targetGrade].name.toLowerCase()}
          </button>
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
