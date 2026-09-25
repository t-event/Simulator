import { POWER_DEAL_NAMES, setPowerDeal, setShiftStart, SHIFT_STARTS } from "../game/actions";
import {
  avgDealPrice,
  day,
  dealPrice,
  fixedPowerOffer,
  isOpen,
  nightExtra,
  PEAK_RATE_PER_MW,
  POWER_BINDING_DAYS,
  powerPrice,
  shiftStart,
  type PlantStats,
} from "../game/plant";
import type { GameState, PowerDeal } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card } from "./common";
import { AutoToggle } from "./AutoToggle";
import { auto } from "../game/research";
import { fmtClock, fmtKr, fmtNum, fmtPct } from "./format";

const POWER_LIMITS: (number | null)[] = [null, 0.7, 0.9, 1.1, 1.4, 2];
const DEALS: PowerDeal[] = ["spot", "fast", "natt"];
const kr = (v: number) => `${fmtNum(v, 2)} kr/kWh`;

function dealText(g: GameState, deal: PowerDeal): string {
  const start = Math.floor(g.minute / 1440) * 1440;
  if (deal === "spot")
    return "Børsprisen time for time. Billig om natta, dyr morgen og ettermiddag – og svært dyr når det er kaldt og vindstille.";
  if (deal === "fast")
    return `Samme pris hele døgnet i ${POWER_BINDING_DAYS} døgn: ${kr(g.settings.powerDeal === "fast" ? g.settings.powerFixedPrice : fixedPowerOffer(g))}. Trygt når prisene stiger, dyrt når de faller.`;
  return `${kr(dealPrice(g, "natt", start + 60))} kl. 22–06, ellers ${kr(dealPrice(g, "natt", start + 12 * 60))}. Lønner seg når verket går om natta. Bindingstid ${POWER_BINDING_DAYS} døgn.`;
}

/** Hva strømmen de siste sju døgnene ville kostet med hver avtale (B-105) */
function DealComparison({ g }: { g: GameState }) {
  const days = [...g.history.slice(-6), g.today];
  const sum = (deal: PowerDeal) => days.reduce((a, d) => a + (d.altEnergy?.[deal] ?? 0), 0);
  const totals = DEALS.map((d) => ({ deal: d, cost: sum(d) }));
  if (totals.every((t) => t.cost <= 0)) return null;
  const best = totals.reduce((a, b) => (b.cost < a.cost ? b : a));
  const mine = totals.find((t) => t.deal === g.settings.powerDeal)!;
  return (
    <>
      <h3 className="g-subhead">Hva hadde strømmen til ovnene kostet? (siste 7 døgn)</h3>
      <ul className="g-deal-compare">
        {totals.map((t) => (
          <li key={t.deal} className={t.deal === best.deal ? "is-best" : ""}>
            <span>
              {t.deal === best.deal ? "✓ " : ""}
              {POWER_DEAL_NAMES[t.deal]}
              {t.deal === g.settings.powerDeal ? " (din)" : ""}
            </span>
            <strong>{fmtKr(t.cost)}</strong>
          </li>
        ))}
      </ul>
      <p className="g-muted">
        {best.deal === mine.deal
          ? "Du har den billigste avtalen for måten verket har gått på."
          : `${POWER_DEAL_NAMES[best.deal]} hadde spart ca. ${fmtKr(mine.cost - best.cost)} de siste sju døgnene. Fastprisen er tallet du får tilbud om nå.`}
      </p>
    </>
  );
}

/** Strøm: pris gjennom døgnet, strømavtale og effekttariff (B-024) */
export function PowerCard({ g, stats, act }: { g: GameState; stats: PlantStats; act: GameApi["act"] }) {
  const start = Math.floor(g.minute / 1440) * 1440;
  const hourPrices = Array.from({ length: 24 }, (_, h) => powerPrice(g, start + h * 60));
  const maxHour = Math.max(...hourPrices);
  const nowHour = Math.floor((g.minute % 1440) / 60);
  const s = g.settings;
  const bound = s.powerDeal !== "spot" && day(g) < s.powerDealUntilDay;
  const daysLeft = s.powerDealUntilDay - day(g);
  const peak = g.today.peakMW ?? 0;
  const yesterdayPeak = g.history[g.history.length - 1]?.peakMW ?? 0;

  return (
    <Card
      title="Strøm"
      right={
        <span className={bound && daysLeft <= 3 ? "g-badge-bad" : "g-muted"}>
          {POWER_DEAL_NAMES[s.powerDeal]}
          {bound ? ` · ${daysLeft} døgn igjen` : ""}
        </span>
      }
    >
      <p>
        Nå: <strong>{kr(powerPrice(g))}</strong>
        {g.market.powerSpikeDays > 0 && <span className="g-badge-bad"> Pristopp</span>}
      </p>
      <div className="g-power-chart" aria-label="Strømprisen du betaler gjennom døgnet">
        {hourPrices.map((p, h) => (
          <div
            key={h}
            className={`g-power-bar${h === nowHour ? " is-now" : ""}${isOpen(g, stats.hours, start + h * 60 + 30) ? "" : " is-closed"}${s.maxPowerPrice !== null && p > s.maxPowerPrice ? " is-over" : ""}`}
            style={{ height: `${(p / maxHour) * 100}%` }}
            title={`${h}:00 – ${kr(p)}`}
          />
        ))}
      </div>
      <p className="g-muted">
        Høye søyler er dyre timer. Svake søyler: verket står. Skiftene kan flyttes til kveld og natt under Folk.
      </p>

      <h3 className="g-subhead">Strømavtale</h3>
      <div className="g-deals">
        {DEALS.map((d) => (
          <button
            key={d}
            className={`g-deal${s.powerDeal === d ? " is-on" : ""}`}
            disabled={bound && s.powerDeal !== d}
            aria-pressed={s.powerDeal === d}
            onClick={() => act((gg) => setPowerDeal(gg, d))}
          >
            <span className="g-deal-head">
              <strong>{POWER_DEAL_NAMES[d]}</strong>
              {stats.hours > 0 && <span>snitt {kr(avgDealPrice(g, d, stats.hours))}</span>}
            </span>
            <span className="g-deal-text">{dealText(g, d)}</span>
          </button>
        ))}
      </div>
      {bound ? (
        <p className={daysLeft <= 3 ? "g-note g-warn" : "g-note"}>
          {POWER_DEAL_NAMES[s.powerDeal]} gjelder til dag {s.powerDealUntilDay} – {daysLeft} døgn igjen. Du kan ikke
          bytte før da.{" "}
          {auto(g, "powerAutoRenew")
            ? "Så fornyes avtalen av seg selv."
            : "Så går du tilbake til spotpris, hvis du ikke velger en ny avtale."}
        </p>
      ) : (
        <p className="g-muted">
          Spotpris er standard: den gjelder når du ikke har valgt noe annet, og når en avtale går ut uten å fornyes.
        </p>
      )}
      <AutoToggle
        g={g}
        act={act}
        k="powerAutoRenew"
        label="Forny fastpris og nattariff av seg selv når bindingstida er ute"
      />
      <p className="g-muted">«Snitt» er prisen i timene verket går i dag.</p>
      <DealComparison g={g} />

      <h3 className="g-subhead">Effekttariff</h3>
      <p className="g-muted">
        Nettselskapet tar {fmtKr(PEAK_RATE_PER_MW)} per MW for den høyeste effekten verket trekker i løpet av døgnet. Én
        ovn trekker {fmtNum(stats.furnaceMW, 1)} MW mens den smelter.
      </p>
      <p>
        Effekttopp i dag: <strong>{fmtNum(peak, 1)} MW</strong> ({fmtKr(peak * PEAK_RATE_PER_MW)})
        {yesterdayPeak > 0 && <span className="g-muted"> · i går {fmtKr(yesterdayPeak * PEAK_RATE_PER_MW)}</span>}
      </p>
      {stats.furnaceCount > 1 && (
        <label className="g-toggle">
          <input
            type="checkbox"
            checked={s.onePeak}
            onChange={(e) => act((gg) => void (gg.settings.onePeak = e.target.checked))}
          />
          <span>Bare én ovn smelter om gangen (halv effekttopp, men færre charger)</span>
        </label>
      )}

      <label className="g-field">
        <span>Ikke start charger over</span>
        <select
          value={s.maxPowerPrice ?? ""}
          onChange={(e) =>
            act((gg) => void (gg.settings.maxPowerPrice = e.target.value === "" ? null : Number(e.target.value)))
          }
        >
          {POWER_LIMITS.map((v) => (
            <option key={String(v)} value={v ?? ""}>
              {v === null ? "Ingen grense" : kr(v)}
            </option>
          ))}
        </select>
      </label>
    </Card>
  );
}

const SHIFT_NAMES: Record<number, string> = { 6: "Dag", 14: "Kveld", 22: "Natt" };

/** Skiftplan: når på døgnet verket går, når det ikke går døgnet rundt */
export function ShiftPlan({ g, stats, act }: { g: GameState; stats: PlantStats; act: GameApi["act"] }) {
  if (stats.hours <= 0 || stats.hours >= 24) return null;
  const electric = stats.furnace.fuel === "strøm";
  const baseSalary = g.workers.reduce((a, w) => a + w.salary, 0);
  return (
    <Card title="Skiftplan">
      <p className="g-muted">
        Verket går {stats.hours} timer i døgnet. Du velger når. Nattarbeid (22–06) gir 30 % nattillegg i lønn
        {electric ? ", men strømmen er billigere om natta." : "."}
      </p>
      <div className="g-row g-shift-row">
        {SHIFT_STARTS.map((h) => {
          const on = shiftStart(g) === h;
          return (
            <button
              key={h}
              className={on ? "g-primary is-on" : ""}
              aria-pressed={on}
              onClick={() => act((gg) => setShiftStart(gg, h))}
            >
              {SHIFT_NAMES[h]} {fmtClock(h * 60)}–{fmtClock(((h + stats.hours) % 24) * 60)}
            </button>
          );
        })}
      </div>
      <p className="g-muted">
        {nightExtra(g, stats.hours) > 0
          ? `Nattillegg: ${fmtPct(nightExtra(g, stats.hours))} ekstra lønn (${fmtKr(baseSalary * nightExtra(g, stats.hours))} per døgn)`
          : "Ingen nattillegg med dette skiftet"}
        {electric && ` · strøm i driftstida: ${kr(avgDealPrice(g, g.settings.powerDeal, stats.hours))}`}
      </p>
    </Card>
  );
}
