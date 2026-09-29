/**
 * Industrien rundt verket (B-189, B-227): de strategiske selskapene og konsernkassa under Konsern → Industrien.
 * Skraplageret er det første selskapet; slagghåndtering og mekanisk verksted er bygget, men slått av (B-253, B-256).
 * Eieren ser Kontrollen og kan investere; utbyttepolitikken og forsvarsfondet står ved konsernkassa (B-334). Hvert selskap serveren sender, får sitt eget kort, og konsernkassa – kapitalen
 * til alle selskapene – har sitt eget. Vises først når konsernet er åpnet (gradvis synlighet), krever konto. Alt avgjøres
 * på serveren i ekte tid; kortene viser bare det serveren sier.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { applyTreasuryDeposit, DEPOSIT_REFUSAL_TEXT, depositToTreasury } from "../net/treasury";
import { tenderChanged } from "./openTender";
import {
  BID_REFUSAL_TEXT,
  fetchWorldStatus,
  firstPayout,
  INVEST_REFUSAL_TEXT,
  investInCompany,
  bidTakeover,
  defendTakeover,
  placeBid,
  timeLeft,
  type Company,
  type WorldStatus,
} from "../net/world";
import {
  CONTROL_PARTS,
  controlAdvice,
  controlWord,
  POLICIES,
  policyLockedUntil,
  policyOf,
  policySplit,
  TAKEOVER,
  TAKEOVER_REASON,
} from "../game/control";
import { regionName } from "../game/regions";
import type { PolicyId } from "../game/types";
import { ORDER_REFUSAL_TEXT } from "../game/konsernWorld";
import { applyKonsern, setPolicy } from "../net/konsern";
import { realNow } from "../game/clock";
import { AccountFeaturesCard } from "./Account";
import { Bar, Card } from "./common";
import { MoneyGuideLink } from "./MoneyGuide";
import { Icon } from "./icons";
import { fmtKr, fmtT, payoutClock } from "./format";
import { buzz } from "./haptics";

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
function useReconciled() {
  return useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Beløp i millioner fra et felt, til kroner */
function millions(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1_000_000) : 0;
}

/** Hva selskapet tjener på, per type. Nye typer får sin linje her når serveren slår dem på */
const COMPANY_INTRO: Record<Company["type"], string> = {
  skraplager:
    "Eieren tjener på skrapet de andre spillerne kjøper – høyst én vanlig dags bruk per spiller per dag, så farten i spillet betyr ikke noe.",
  // B-253: bygget, men slått av på serveren til skraplageret har vist at kjeden virker
  slagg:
    "Eieren tjener på slaggen de andre spillerne lager – omtrent 0,12 tonn slagg per tonn stål, høyst én vanlig dags produksjon per spiller per dag, så farten i spillet betyr ikke noe.",
  // B-256: bygget, men slått av som slagghåndteringen
  verksted:
    "Eieren får halvparten av det de andre spillerne bruker på vedlikehold og reparasjoner – regnet per tonn stål de lager, høyst én vanlig dag per spiller per dag, så farten i spillet betyr ikke noe.",
};

const INDUSTRY_INTRO =
  "Selskapene rundt verkene deles av alle spillerne. Den som eier et selskap, tjener på det de andre bruker – i ekte tid, uansett spillfart.";

type Msg = { at: string; text: string } | null;

export function IndustryPanel({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const session = useSession();
  const reconciled = useReconciled();
  const [world, setWorld] = useState<WorldStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  // Budfeltet per selskap, så flere anbud samtidig ikke deler tall
  const [bids, setBids] = useState<Record<number, string>>({});
  const [deposit, setDeposit] = useState("");
  // Investering per selskap (B-334): beløp og kilde
  const [invest, setInvest] = useState<Record<number, string>>({});
  const [source, setSource] = useState<"kasse" | "fond">("kasse");
  const user = session?.user.id ?? null;

  const load = useCallback(() => fetchWorldStatus().then(setWorld, () => {}), []);
  useEffect(() => {
    if (!user || !reconciled) return;
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [user, reconciled, load]);

  const intro = (
    <div className="g-col-wide g-industry-intro">
      <h2>Industrien rundt verket</h2>
      <p className="g-muted g-small-text">{INDUSTRY_INTRO}</p>
    </div>
  );
  if (!session)
    return (
      <>
        {intro}
        <div className="g-col-wide g-industry-col">
          <AccountFeaturesCard features={["skraplager", "konsernkasse"]} />
        </div>
      </>
    );
  if (!world) return intro;
  const tr = world.treasury;

  const run = async (at: string, fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ at, text: await fn() });
      buzz();
    } catch {
      setMsg({ at, text: "Fikk ikke kontakt med serveren. Prøv igjen." });
    } finally {
      setBusy(false);
      void load();
    }
  };

  const doDeposit = () =>
    run("kasse", async () => {
      const amount = Math.min(millions(deposit), tr.left, Math.max(0, Math.floor(g.cash - g.loan)));
      if (amount <= 0) return "Velg et beløp over null.";
      const r = await depositToTreasury(g, amount, (a) => act((gg) => applyTreasuryDeposit(gg, a)));
      if (!r.ok) return DEPOSIT_REFUSAL_TEXT[r.reason];
      setDeposit("");
      return `${fmtKr(r.amount)} er flyttet til konsernkassa.`;
    });

  const doBid = (c: Company, amount: number) =>
    run(`selskap-${c.id}`, async () => {
      const t = c.tender;
      if (!t) return BID_REFUSAL_TEXT.stengt;
      const r = await placeBid(t.id, amount);
      if (!r.ok) return BID_REFUSAL_TEXT[r.reason];
      tenderChanged();
      setBids((b) => ({ ...b, [c.id]: "" }));
      return amount === 0
        ? "Budet er trukket, og pengene er tilbake i konsernkassa."
        : `Budet ditt er ${fmtKr(r.bid)}.`;
    });

  const fund = g.konsern.policy?.fund ?? 0;

  const doInvest = (c: Company, amount: number) =>
    run(`selskap-${c.id}`, async () => {
      const r = await investInCompany(c.id, amount, source);
      if (!r.ok) return INVEST_REFUSAL_TEXT[r.reason];
      setInvest((b) => ({ ...b, [c.id]: "" }));
      return `${fmtKr(amount)} er investert i ${c.name.toLowerCase()}. Kontrollen er nå ${controlWord(r.control?.score ?? 0).word.toLowerCase()}.`;
    });

  const doPolicy = (kind: PolicyId) =>
    run("politikk", async () => {
      const r = await setPolicy(kind);
      if (!r.ok) return ORDER_REFUSAL_TEXT[r.reason] ?? ORDER_REFUSAL_TEXT.nett;
      const w = r.konsern;
      act((gg) => {
        if (w) applyKonsern(gg, w, gg.konsern.treasury?.perDay ?? 0);
        return { ok: true, message: "" };
      });
      return `Utbyttepolitikken er nå «${policyOf(kind).name}».`;
    });

  const doTakeoverBid = (c: Company, amount: number) =>
    run(`selskap-${c.id}`, async () => {
      const r = await bidTakeover(c.id, amount);
      if (!r.ok) return TAKEOVER_REASON[r.reason] ?? TAKEOVER_REASON.nett;
      tenderChanged();
      return `Budet på ${fmtKr(amount)} er lagt inn. Alle kan se det, og eieren har ${TAKEOVER.defenseHours} timer på seg.`;
    });

  const doDefend = (c: Company, amount: number, from: "kasse" | "fond") =>
    run(`selskap-${c.id}`, async () => {
      if (!c.takeover) return TAKEOVER_REASON.eier;
      const r = await defendTakeover(c.takeover.id, amount, from);
      if (!r.ok) return TAKEOVER_REASON[r.reason] ?? TAKEOVER_REASON.nett;
      tenderChanged();
      return `${fmtKr(amount)} er satt inn i forsvaret. Du får 95 % tilbake når forsøket er avgjort.`;
    });

  const note = (at: string) =>
    msg?.at === at && (
      <p className="g-note" role="status">
        {msg.text}
      </p>
    );

  const maxDeposit = Math.max(0, Math.min(tr.left, Math.floor(g.cash - g.loan)));

  const companyCard = (c: Company) => {
    const t = c.tender;
    const last = c.lastResult;
    const bid = bids[c.id] ?? "";
    const until = c.concessionUntil ? fmtWhen(c.concessionUntil) : "–";
    // Hva som gjelder nå, i ett ord øverst (B-235)
    const state = c.mine
      ? { tone: "ok", text: "Du eier det" }
      : t
        ? { tone: "heat", text: "Anbud åpent" }
        : { tone: "neutral", text: c.owner ? "Eid av en annen" : "Ingen eier" };
    // Et bud kan ikke være større enn det som står i konsernkassa (pluss budet du alt har lagt inn)
    const canBid = t ? Math.min(t.maxBid, tr.balance + (t.myBid ?? 0)) : 0;
    return (
      <Card
        key={c.id}
        title={c.name}
        className="g-company"
        right={<span className={`ds-status is-${state.tone}`}>{state.text}</span>}
      >
        <p className="g-muted g-small-text">{COMPANY_INTRO[c.type] ?? ""}</p>
        <dl className="g-company-facts">
          <div>
            <dt>Eier</dt>
            <dd>
              {c.mine ? "Du" : (c.owner ?? "Ingen")}
              {c.owner && <small> til {until}</small>}
            </dd>
          </div>
          <div>
            <dt>Tjener nå</dt>
            <dd>
              ca. {fmtKr(c.estimatePerDay)}
              <small> /døgn</small>
            </dd>
          </div>
          {c.mine && (
            <div>
              <dt>Du har fått</dt>
              {/* Før første utbetaling: når den kommer, ikke «+0 kr i går» (B-258) */}
              {c.incomeMine > 0 || (c.incomeYesterday ?? 0) > 0 ? (
                <dd>
                  +{fmtKr(c.incomeYesterday ?? 0)}
                  <small> i går · {fmtKr(c.incomeMine)} i alt</small>
                </dd>
              ) : (
                <dd>
                  Ingenting ennå
                  <small> · første inntekt {firstPayout()}</small>
                </dd>
              )}
            </div>
          )}
          {c.nextOwner && (
            <div>
              <dt>Neste eier</dt>
              <dd>{c.nextMine ? "Du" : c.nextOwner}</dd>
            </div>
          )}
        </dl>

        {c.control && <ControlSection c={c} />}
        {world.takeoversOn && (
          <TakeoverSection
            c={c}
            busy={busy}
            fund={fund}
            balance={tr.balance}
            onBid={(a) => void doTakeoverBid(c, a)}
            onDefend={(a, from) => void doDefend(c, a, from)}
          />
        )}
        {c.mine && c.control && (
          <div className="g-invest">
            <div className="g-row g-amount-row">
              <label className="g-amount">
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  placeholder="100"
                  value={invest[c.id] ?? ""}
                  onChange={(e) => setInvest((b) => ({ ...b, [c.id]: e.target.value }))}
                  aria-label="Investering i millioner kroner"
                />
                <span>mill. kr</span>
              </label>
              <button
                className="g-primary"
                disabled={busy || millions(invest[c.id] ?? "") <= 0}
                onClick={() => void doInvest(c, millions(invest[c.id] ?? ""))}
              >
                Invester
              </button>
            </div>
            {fund > 0 && (
              <label className="g-field">
                <span className="g-small-text">Betal fra</span>
                <select value={source} onChange={(e) => setSource(e.target.value === "fond" ? "fond" : "kasse")}>
                  <option value="kasse">Konsernkassa ({fmtKr(tr.balance)})</option>
                  <option value="fond">Forsvarsfondet ({fmtKr(fund)})</option>
                </select>
              </label>
            )}
            <p className="g-muted g-small-text">
              Pengene blir i selskapet: de gir mer Kontroll og inntil 25 % mer inntekt, og følger selskapet til neste
              eier. Halve effekten ved ca. {fmtKr(Math.round((c.control.value * 0.7) / 1e6) * 1e6)}.
            </p>
          </div>
        )}

        {t && (
          <section className="g-tender">
            <header className="g-tender-head">
              <h3>Anbud</h3>
              <span className="ds-status is-heat">
                <Icon name="clock" /> stenger om {timeLeft(t.closesAt)}
              </span>
            </header>
            <p className="g-tender-mine">
              {t.myBid ? (
                <>
                  Ditt bud: <strong>{fmtKr(t.myBid)}</strong>
                </>
              ) : (
                "Du har ikke bydd."
              )}
            </p>
            {/* Hvem som har bydd, uten beløp (B-210). Navnene brytes til nye linjer (B-278) */}
            {t.bidders.length === 0 ? (
              <p className="g-small-text g-muted">Ingen har bydd ennå.</p>
            ) : (
              <div className="g-tender-bidders">
                <span className="g-small-text g-muted">Har bydd ({t.bidders.length}):</span>
                <ul>
                  {t.bidders.map((n) => (
                    <li key={n} className="g-chip">
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="g-row g-amount-row">
              <label className="g-amount">
                <input
                  type="number"
                  inputMode="decimal"
                  min={t.minBid / 1e6}
                  max={canBid / 1e6}
                  placeholder={t.myBid ? String(Math.round(t.myBid / 1e6)) : String(Math.round(t.minBid / 1e6))}
                  value={bid}
                  onChange={(e) => setBids((b) => ({ ...b, [c.id]: e.target.value }))}
                  aria-label="Bud i millioner kroner"
                />
                <span>mill. kr</span>
              </label>
              <button
                className="g-primary"
                disabled={busy || millions(bid) <= 0}
                onClick={() => void doBid(c, millions(bid))}
              >
                {t.myBid ? "Endre bud" : "Legg inn bud"}
              </button>
            </div>
            <p className="g-muted g-small-text">
              Fra {fmtKr(t.minBid)} til {fmtKr(t.maxBid)}. Budet betales fra konsernkassa ({fmtKr(tr.balance)} nå
              {t.myBid ? ", pluss budet ditt" : ""}), så du kan by opptil {fmtKr(canBid)}.
            </p>
            {t.myBid && (
              <button className="g-link g-tender-withdraw" disabled={busy} onClick={() => void doBid(c, 0)}>
                Trekk budet
              </button>
            )}
            <details className="g-details">
              <summary>Slik virker anbudet</summary>
              <p className="g-small-text">
                Alle ser hvem som har bydd, men ingen ser beløpene før anbudet stenger ({fmtWhen(t.closesAt)}). Høyeste
                bud vinner og driver lageret i 14 dager. Likt bud avgjøres ved trekning. De som ikke vinner, får budet
                tilbake i konsernkassa. Alle stiller likt, også den som eier selskapet nå.
              </p>
            </details>
          </section>
        )}

        {last && (
          <p className="g-muted g-small-text">
            Forrige anbud:{" "}
            {last.status === "ingen bud"
              ? "ingen bud."
              : `${last.won ? "du vant" : `vunnet av ${last.winner ?? "–"}`} med ${fmtKr(last.winningBid ?? 0)}${last.tie ? " (likt bud – avgjort ved trekning)" : ""}.`}
            {!last.won && last.myBid ? ` Budet ditt (${fmtKr(last.myBid)}) er tilbake i konsernkassa.` : ""}
          </p>
        )}
        {note(`selskap-${c.id}`)}
      </Card>
    );
  };

  return (
    <>
      {intro}
      <div className="g-col g-industry-col">{world.companies.map(companyCard)}</div>
      <div className="g-col g-industry-side">
        <Card title="Konsernkassa" className="g-company g-treasury">
          <div className="g-treasury-balance">
            <span className="g-treasury-sum">{fmtKr(tr.balance)}</span>
            <span className="g-muted g-small-text">
              Bud betales herfra. Bidraget fra hovedverket, utbyttet fra datterverkene og inntekten fra selskapene du
              eier, kommer hit.
            </span>
          </div>
          <MoneyGuideLink g={g} />
          {/* Utbyttepolitikken og forsvarsfondet (B-334): vises når fondet betyr noe – du eier et selskap, eller har et fond */}
          {g.konsern.policy && (world.companies.some((c) => c.mine) || fund > 0 || g.konsern.policy.kind !== "ut") && (
            <PolicySection g={g} full={world.dividend.fullPerDay} busy={busy} onPick={(k) => void doPolicy(k)} />
          )}
          {note("politikk")}
          {/* Utbyttet fra datterverkene i ekte tid (B-304): regnes av serveren én gang per dag */}
          {(world.dividend.perDay > 0 || world.dividend.total > 0) && (
            <p className="g-small-text g-treasury-dividend">
              Utbytte fra datterverkene: <strong>ca. {fmtKr(world.dividend.perDay)} per dag</strong>
              {world.dividend.yesterday !== null && world.dividend.yesterday > 0
                ? ` · ${fmtKr(world.dividend.yesterday)} i går`
                : ""}
              {world.dividend.total > 0 ? ` · ${fmtKr(world.dividend.total)} i alt` : ""}. Betales hver natt ca. kl.{" "}
              {payoutClock(realNow())} for dagen før, uansett spillfart.
            </p>
          )}
          {/* Hovedverkets konsernbidrag (B-318): halvparten av driftsresultatet i én normal spilldag per ekte dag, snittet over dagen (B-361) */}
          {(world.contribution.perDay > 0 || world.contribution.total > 0) && (
            <p className="g-small-text g-treasury-dividend">
              Bidrag fra hovedverket: <strong>ca. {fmtKr(world.contribution.perDay)} per dag</strong>
              {world.contribution.yesterday !== null && world.contribution.yesterday > 0
                ? ` · ${fmtKr(world.contribution.yesterday)} i går`
                : ""}
              {world.contribution.total > 0 ? ` · ${fmtKr(world.contribution.total)} i alt` : ""}. Halvparten av det
              verket tjener på en vanlig spilldag{" "}
              {`(${fmtT(world.contribution.normalT)} à ${fmtKr(world.contribution.margin)} per tonn)`}, uansett
              spillfart. Serveren måler verket hvert kvarter og betaler snittet for dagen, så en dårlig eller god time
              ikke avgjør alt. Dager uten spill gir mindre, aldri under 30 %. Betales hver natt ca. kl.{" "}
              {payoutClock(realNow())} for dagen før.
            </p>
          )}
          {/* Innskuddet fra verket (B-311) forsvinner når serveren setter grensen til 0 (B-319): bidraget gjør jobben */}
          {tr.limit > 0 ? (
            <>
              <h3 className="g-subhead">Flytt penger fra verket</h3>
              <Bar value={tr.limit > 0 ? (tr.limit - tr.left) / tr.limit : 0} tone="accent" label="Brukt av grensen" />
              <p className="g-small-text">
                Du kan flytte <strong>{fmtKr(tr.left)}</strong> til de neste 24 timene (grensen er {fmtKr(tr.limit)},
                lik for alle){tr.freedAt && tr.left < tr.limit ? `. Mer blir ledig ${fmtWhen(tr.freedAt)}` : ""}.
              </p>
              <div className="g-row g-amount-row">
                <label className="g-amount">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder={String(Math.floor(maxDeposit / 1e6))}
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    aria-label="Beløp i millioner kroner"
                  />
                  <span>mill. kr</span>
                </label>
                <button
                  className="g-primary"
                  disabled={busy || tr.left <= 0 || millions(deposit) <= 0}
                  onClick={() => void doDeposit()}
                >
                  Flytt
                </button>
              </div>
              {maxDeposit > 0 && (
                <button
                  className="g-link g-treasury-max"
                  disabled={busy}
                  onClick={() => setDeposit(String(Math.floor(maxDeposit / 1e6)))}
                >
                  Fyll inn det meste ({fmtKr(Math.floor(maxDeposit / 1e6) * 1e6)})
                </button>
              )}
            </>
          ) : (
            <p className="g-muted g-small-text">Kassa i verket er driftskapital og blir i verket.</p>
          )}
          {note("kasse")}
        </Card>
      </div>
    </>
  );
}

/** Kontrollen over et selskap (B-334): ordet for alle, delene og rådet for eieren */
function ControlSection({ c }: { c: Company }) {
  const ctl = c.control!;
  const w = controlWord(ctl.score);
  const advice = c.mine ? controlAdvice(ctl.parts) : null;
  return (
    <section className="g-control">
      <p className="g-control-head">
        <span>Kontroll</span>
        <span className={`ds-status is-${w.tone === "bad" ? "critical" : w.tone}`}>{w.word}</span>
        {c.region && <span className="g-muted g-small-text">{regionName(c.region)}</span>}
      </p>
      {c.mine && (
        <>
          {advice && <p className="g-small-text">{advice}</p>}
          <details className="g-details">
            <summary>Hva Kontrollen består av ({ctl.score} av 100)</summary>
            <ul className="g-control-parts">
              {CONTROL_PARTS.filter((p) => p.key !== "belastning" || (ctl.parts.belastning ?? 0) < 0).map((p) => (
                <li key={p.key}>
                  <span>{p.name}</span>
                  <span>
                    {Math.round(ctl.parts[p.key] ?? 0)}
                    {p.max > 0 ? ` av ${p.max}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className="g-muted g-small-text">
              God Kontroll gjør det dyrere for andre å overta selskapet fra deg. Når konsesjonen går ut, stiller alle
              likt i det nye anbudet.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

/** Utbyttepolitikken (B-334): tre valg, hva de gir per dag, fondet og når valget kan endres igjen */
function PolicySection({
  g,
  full,
  busy,
  onPick,
}: {
  g: GameState;
  full: number;
  busy: boolean;
  onPick: (k: PolicyId) => void;
}) {
  const p = g.konsern.policy!;
  const locked = policyLockedUntil(p.changedAt, realNow());
  return (
    <section className="g-policy">
      <h3 className="g-subhead">Utbyttepolitikk</h3>
      <p className="g-small-text">
        Forsvarsfondet: <strong>{fmtKr(p.fund)}</strong>. Det som holdes igjen i datterverkene, går hit. Fondet kan
        brukes til investeringer i selskapene dine og gir mer Kontroll – ikke til nye verk.
      </p>
      <div className="g-policy-opts" role="radiogroup" aria-label="Utbyttepolitikk">
        {POLICIES.map((o) => {
          const split = policySplit(full, o.id);
          const on = p.kind === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={on}
              className={on ? "is-on" : undefined}
              disabled={busy || (!on && locked !== null)}
              onClick={() => !on && onPick(o.id)}
            >
              <strong>{o.name}</strong>
              <span className="g-small-text">{o.about}</span>
              <span className="g-small-text g-muted">
                {fmtKr(split.kasse)} til kassa{split.fond > 0 ? ` · ${fmtKr(split.fond)} til fondet` : ""} per dag
              </span>
            </button>
          );
        })}
      </div>
      <p className="g-muted g-small-text">
        {locked
          ? `Kan endres igjen ${new Date(locked).toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "short" })}.`
          : "Kan endres én gang per uke."}
      </p>
    </section>
  );
}

/** Overtakelser (B-335): forsøk som pågår, forsvaret for eieren, bud for de andre og forrige utfall */
function TakeoverSection({
  c,
  busy,
  fund,
  balance,
  onBid,
  onDefend,
}: {
  c: Company;
  busy: boolean;
  fund: number;
  balance: number;
  onBid: (amount: number) => void;
  onDefend: (amount: number, from: "kasse" | "fond") => void;
}) {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState<"kasse" | "fond">("kasse");
  const t = c.takeover;
  const w = c.takeoverWindow;
  const last = c.takeoverLast;
  const score = (a: number, d: number) => `angrep ${Math.round(a)} mot forsvar ${Math.round(d)}`;
  const amountRow = (label: string, onGo: () => void, placeholder: number) => (
    <div className="g-row g-amount-row">
      <label className="g-amount">
        <input
          type="number"
          inputMode="decimal"
          min={1}
          placeholder={String(Math.ceil(placeholder / 1e6))}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Beløp i millioner kroner"
        />
        <span>mill. kr</span>
      </label>
      <button className="g-primary" disabled={busy || millions(amount) <= 0} onClick={onGo}>
        {label}
      </button>
    </div>
  );
  return (
    <section className="g-takeover">
      {t ? (
        <div className={`g-takeover-box${c.mine ? " is-mine" : ""}`}>
          <p className="g-small-text">
            <strong>{t.mineAttack ? "Du prøver å overta selskapet" : `${t.attacker} prøver å overta selskapet`}</strong>{" "}
            med {fmtKr(t.bid)}. Avgjøres {timeLeft(t.closesAt)} fra nå. Nå: {score(t.attack, t.defenseScore)}.
          </p>
          {c.mine && (
            <>
              {amountRow(
                "Forsvar",
                () => {
                  onDefend(millions(amount), from);
                  setAmount("");
                },
                c.control?.value ?? 1e8,
              )}
              {fund > 0 && (
                <label className="g-field">
                  <span className="g-small-text">Betal fra</span>
                  <select value={from} onChange={(e) => setFrom(e.target.value === "fond" ? "fond" : "kasse")}>
                    <option value="kasse">Konsernkassa ({fmtKr(balance)})</option>
                    <option value="fond">Forsvarsfondet ({fmtKr(fund)})</option>
                  </select>
                </label>
              )}
              <p className="g-muted g-small-text">
                Kapitalen du setter inn, styrker forsvaret{t.defense ? ` (${fmtKr(t.defense)} nå)` : ""}. Du får 95 %
                tilbake når forsøket er avgjort. Forsvarsfondet teller av seg selv.
              </p>
            </>
          )}
          {t.mineAttack && (
            <>
              {amountRow(
                "Øk budet",
                () => {
                  onBid(millions(amount));
                  setAmount("");
                },
                t.bid * 1.2,
              )}
              <p className="g-muted g-small-text">
                Skriv hele det nye budet. Vinner du, får eieren 85 %. Taper du, får du 90 % tilbake.
              </p>
            </>
          )}
        </div>
      ) : (
        w &&
        (w.open ? (
          <details className="g-details">
            <summary>Overta selskapet</summary>
            <p className="g-small-text">
              Budet må være minst verdien, {fmtKr(w.minBid)}, og betales fra konsernkassa med én gang. Alle ser budet,
              og eieren har {TAKEOVER.defenseHours} timer på seg til å forsvare seg. Med minstebudet:{" "}
              {score(w.attackMin, w.defenseNow)} før eieren gjør noe. Større bud, aktivitet og egne verk i regionen gir
              sterkere angrep – med stort nok bud kan alle selskaper tas.
            </p>
            {amountRow(
              "Legg inn bud",
              () => {
                onBid(millions(amount));
                setAmount("");
              },
              w.minBid,
            )}
            <p className="g-muted g-small-text">
              Vinner du, får eieren 85 % av budet og du overtar resten av konsesjonen. Taper du, får du 90 % tilbake.
            </p>
          </details>
        ) : (
          w.reason &&
          w.reason !== "pagar" && <p className="g-muted g-small-text">Overtakelse: {TAKEOVER_REASON[w.reason] ?? ""}</p>
        ))
      )}
      {last && (
        <p className="g-muted g-small-text">
          Forrige forsøk: {last.attacker} {last.status === "overtatt" ? "overtok" : "ble avverget"} (
          {score(last.attack, last.defense)}).
        </p>
      )}
    </section>
  );
}
