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
import { getSession, onSessionChange, userId } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { applyTreasuryDeposit, DEPOSIT_REFUSAL_TEXT, depositToTreasury } from "../net/treasury";
import { tenderChanged } from "./openTender";
import {
  BID_REFUSAL_TEXT,
  fetchWorldStatus,
  firstPayout,
  fmtBid,
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
  bidToTake,
  buyoutPay,
  CONTROL_PARTS,
  controlAfterInvest,
  controlSteps,
  controlWord,
  defenseNeeded,
  POLICIES,
  policyLockedUntil,
  policyOf,
  policySplit,
  protectedUntil,
  bidBack,
  defenseBack,
  TAKEOVER,
  TAKEOVER_REASON,
  TAKEOVER_V2,
  takeoverPayoff,
  type TakeoverRules,
} from "../game/control";
import { regionName } from "../game/regions";
import { Button } from "./ds";
import type { PolicyId } from "../game/types";
import { ORDER_REFUSAL_TEXT } from "../game/konsernWorld";
import { applyKonsern, setPolicy } from "../net/konsern";
import { realNow } from "../game/clock";
import { AccountFeaturesCard } from "./Account";
import { Bar, Card } from "./common";
import { MoneyGuideLink } from "./MoneyGuide";
import { Icon } from "./icons";
import { fmtKr, fmtT } from "./format";
import { buzz } from "./haptics";
import { PlayerName } from "./Profile";

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

/** Beløp i millioner fra et felt, til kroner. Godtar komma og punktum og mellomrom («0,1», «1 000») */
function millions(v: string): number {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1_000_000) : 0;
}

/** Kroner som millioner til et felt eller et eksempel («0,1», «324») – aldri rundet til 0 */
function millText(kr: number): string {
  return (kr / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 2, useGrouping: false });
}

/**
 * Felt for et beløp i millioner. Vanlig tekstfelt med desimaltastatur: på iPhone gir tastaturet komma, og et tallfelt
 * (`type="number"`) leser ikke «0,1» – da kunne ingen by under 1 mill.
 */
function MillInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: number;
  label: string;
}) {
  return (
    <label className="g-amount">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={millText(placeholder)}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d\s,.]/g, ""))}
        aria-label={label}
      />
      <span>mill. kr</span>
    </label>
  );
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
      const r = await bidTakeover(c.id, amount, { bid: c.takeover?.bid ?? 0, mine: c.takeover?.mineAttack ?? false });
      if (!r.ok) return TAKEOVER_REASON[r.reason] ?? TAKEOVER_REASON.nett;
      tenderChanged();
      const t = c.takeover;
      if (t && !t.mineAttack)
        return `Du har bydd over ${t.attacker} med ${fmtKr(amount)}. Budet ditt gjelder nå, og ${t.attacker} får pengene sine tilbake.`;
      if (t) return `Budet er økt til ${fmtKr(amount)}.`;
      return `Budet på ${fmtKr(amount)} er lagt inn. Alle kan se det, og eieren har ${TAKEOVER.defenseHours} timer på seg.`;
    });

  const doDefend = (c: Company, amount: number, from: "kasse" | "fond") =>
    run(`selskap-${c.id}`, async () => {
      if (!c.takeover) return TAKEOVER_REASON.eier;
      const r = await defendTakeover(c.takeover.id, amount, from);
      if (!r.ok) return TAKEOVER_REASON[r.reason] ?? TAKEOVER_REASON.nett;
      tenderChanged();
      return c.takeover.rules === 1
        ? `Motbudet ditt er økt med ${fmtKr(amount)}. Du får 95 % tilbake når oppkjøpet er avgjort.`
        : `Motbudet ditt er økt med ${fmtKr(amount)}. Holder det, er pengene brukt opp; blir selskapet kjøpt, får du 75 % tilbake.`;
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
    // Budet i kroner og hva som er galt med det, før det sendes (feltet er i millioner: 0,1 = 100 000 kr)
    const bidKr = millions(bid);
    const bidProblem =
      !t || bidKr <= 0
        ? null
        : bidKr < t.minBid
          ? `Minste bud er ${fmtKr(t.minBid)} – skriv ${millText(t.minBid)}.`
          : bidKr > t.maxBid
            ? `Høyeste bud er ${fmtKr(t.maxBid)} – skriv høyst ${millText(t.maxBid)}.`
            : bidKr > canBid
              ? `Du kan by opptil ${fmtKr(canBid)}.`
              : null;
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
              {c.mine ? "Du" : c.owner ? <PlayerName nick={c.owner} /> : "Ingen"}
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
          {/* Verdien (B-435): det et oppkjøpsbud minst må være – før sto bare inntekten per døgn */}
          {c.owner && companyValue(c) > 0 && (
            <div>
              <dt>Verdi</dt>
              <dd>
                {fmtKr(companyValue(c))}
                <small> 10 dagers inntekt</small>
              </dd>
            </div>
          )}
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

        {c.control && (
          <ControlSection c={c} fund={fund} policy={g.konsern.policy?.kind ?? "ut"} takeoversOn={world.takeoversOn} />
        )}
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
              <MillInput
                value={invest[c.id] ?? ""}
                onChange={(v) => setInvest((b) => ({ ...b, [c.id]: v }))}
                placeholder={100e6}
                label="Investering i millioner kroner"
              />
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
                  <option value="fond">Beredskapsfondet ({fmtKr(fund)})</option>
                </select>
              </label>
            )}
            <InvestPreview c={c} fund={fund} amount={millions(invest[c.id] ?? "")} />
            <p className="g-muted g-small-text">
              Pengene blir i selskapet og kommer ikke tilbake. De gir mer Kontroll og inntil 25 % mer inntekt. Mister du
              selskapet, følger de med til den nye eieren.
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
                      <PlayerName nick={n} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="g-row g-amount-row">
              <MillInput
                value={bid}
                onChange={(v) => setBids((b) => ({ ...b, [c.id]: v }))}
                placeholder={t.myBid || t.minBid}
                label="Bud i millioner kroner"
              />
              <button
                className="g-primary"
                disabled={busy || bidKr <= 0 || bidProblem !== null}
                onClick={() => void doBid(c, bidKr)}
              >
                {t.myBid ? "Endre bud" : "Legg inn bud"}
              </button>
            </div>
            <p
              className={bidProblem ? "g-small-text g-bid-preview is-bad" : "g-small-text g-bid-preview"}
              role="status"
            >
              {bidKr <= 0
                ? `Skriv beløpet i millioner: ${millText(t.minBid)} = ${fmtKr(t.minBid)}.`
                : (bidProblem ?? `Du byr ${fmtKr(bidKr)}.`)}
            </p>
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
              : `${last.won ? "du vant" : `vunnet av ${last.winner ?? "–"}`} med ${fmtBid(last.winningBid ?? 0, last.closedAt)}${last.tie ? " (likt bud – avgjort ved trekning)" : ""}.`}
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
            <PolicySection
              g={g}
              full={world.dividend.fullPerDay}
              busy={busy}
              ownsCompany={world.companies.some((c) => c.mine)}
              onPick={(k) => void doPolicy(k)}
            />
          )}
          {note("politikk")}
          {/* Utbyttet fra datterverkene i ekte tid (B-304): regnes av serveren én gang per dag */}
          {(world.dividend.perDay > 0 || world.dividend.total > 0) && (
            <p className="g-small-text g-treasury-dividend">
              Utbytte fra datterverkene: <strong>ca. {fmtKr(world.dividend.perDay)} per dag</strong>
              {world.dividend.yesterday !== null && world.dividend.yesterday > 0
                ? ` · ${fmtKr(world.dividend.yesterday)} i går`
                : ""}
              {world.dividend.total > 0 ? ` · ${fmtKr(world.dividend.total)} i alt` : ""}. Betales rett etter midnatt
              (norsk tid) for dagen før, uansett spillfart.
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
              ikke avgjør alt. Dager uten spill gir mindre, aldri under 30 %. Betales rett etter midnatt (norsk tid) for
              dagen før.
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
                <MillInput
                  value={deposit}
                  onChange={setDeposit}
                  placeholder={Math.floor(maxDeposit / 1e6) * 1e6}
                  label="Beløp i millioner kroner"
                />
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

/** Kontrollen over et selskap (B-334), med vanlige ord for eieren (B-370): hvor trygt det er, og hva som gjør det tryggere */
function ControlSection({
  c,
  fund,
  policy,
  takeoversOn,
}: {
  c: Company;
  fund: number;
  policy: PolicyId;
  takeoversOn: boolean;
}) {
  const ctl = c.control!;
  const w = controlWord(ctl.score);
  const tone = w.tone === "bad" ? "critical" : w.tone;
  if (!c.mine)
    return (
      <section className="g-control">
        <p className="g-control-head">
          <span>Kontroll</span>
          <span className={`ds-status is-${tone}`}>{w.word}</span>
          {c.region && <span className="g-muted g-small-text">{regionName(c.region)}</span>}
        </p>
      </section>
    );
  const steps = controlSteps(ctl.parts, policy).slice(0, 3);
  // Serveren vet best (vern, pause og slutten av perioden, B-372); eldre svar har bare `since`
  const vern = ctl.protectedUntil
    ? Date.parse(ctl.protectedUntil) > realNow()
      ? Date.parse(ctl.protectedUntil)
      : null
    : protectedUntil(ctl.since, realNow());
  const take = bidToTake(ctl.score, fund, ctl.value, 2);
  const endsAt = c.concessionUntil ? Date.parse(c.concessionUntil) : null;
  return (
    <section className="g-control">
      <p className="g-control-head">
        <span>Kontroll</span>
        <span className={`ds-status is-${tone}`}>{w.word}</span>
        {c.region && <span className="g-muted g-small-text">{regionName(c.region)}</span>}
      </p>
      <p className="g-muted g-small-text">Hvor vanskelig det er for andre spillere å ta selskapet fra deg.</p>
      <Bar
        value={ctl.score / 100}
        tone={tone === "critical" ? "critical" : tone === "heat" ? "warning" : "ok"}
        label={`Kontroll ${ctl.score} av 100`}
      />
      {takeoversOn && !c.takeover && (
        <p className="g-small-text g-control-now">
          {vern && endsAt && vern >= endsAt ? (
            <>
              <Icon name="shield-check" /> Ingen kan legge inn oppkjøpsbud før perioden din er over (
              {fmtWhen(new Date(endsAt).toISOString())}). Da kommer et nytt anbud.
            </>
          ) : (
            <>
              {vern ? (
                <>
                  <Icon name="shield-check" /> Ingen kan legge inn oppkjøpsbud før{" "}
                  {fmtWhen(new Date(vern).toISOString())}.{" "}
                </>
              ) : (
                <>Ingen har lagt inn oppkjøpsbud nå. </>
              )}
              {vern ? "Etter det kan" : "Slik det står, kan"} en aktiv spiller kjøpe det med et bud på ca.{" "}
              <strong>{fmtKr(take)}</strong> hvis du ikke legger inn et motbud.
            </>
          )}
        </p>
      )}
      {takeoversOn && !c.takeover && ctl.buyout && !(vern && endsAt && vern >= endsAt) && (
        <p className="g-muted g-small-text g-buyout">
          Blir selskapet kjøpt med det budet, får du ca. {fmtKr(buyoutPay(take, ctl.buyout).kasse)} i konsernkassa:
          inntekten for dagene som er igjen og 85 % av det du har investert (aldri mer enn 85 % av budet).
        </p>
      )}
      {steps.length > 0 && (
        <>
          <h4 className="g-control-sub">Slik blir det tryggere</h4>
          <ul className="g-control-steps">
            {steps.map((p) => (
              <li key={p.key}>
                <span>{p.how}</span>
                <span className="g-muted">+{Math.round(p.gap)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
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
          Beredskapsfondet gir lite Kontroll før det er stort i forhold til selskapet ({fmtKr(ctl.value)}), men får du
          et oppkjøpsbud, kan du bruke det til motbud.
        </p>
      </details>
      {takeoversOn && (
        <details className="g-details">
          <summary>Hvis noen vil kjøpe selskapet</summary>
          <ol className="g-small-text g-control-how">
            <li>
              En annen spiller legger inn et oppkjøpsbud på minst verdien av selskapet. Du får beskjed, og har{" "}
              {TAKEOVER.defenseHours} timer på deg.
            </li>
            <li>
              Du kan legge inn et motbud med penger fra konsernkassa eller beredskapsfondet. Samme beløp teller like mye
              som i oppkjøpsbudet, og Kontrollen din gir et lite forsprang.
            </li>
            <li>
              Den som står sterkest når tida er ute, vinner og betaler: holder motbudet, beholder du selskapet, og
              motbudet er brukt opp. Er oppkjøpsbudet sterkest, kjøper den andre selskapet, du får betalt for dagene du
              mister og 85 % av det du har investert (aldri mer enn 85 % av budet), og 75 % av motbudet tilbake.
            </li>
            <li>
              Holder ikke oppkjøpsbudet, får den som bød 75 % tilbake, og ingen kan by på selskapet de neste{" "}
              {TAKEOVER_V2.pauseDays} dagene.
            </li>
          </ol>
          <p className="g-muted g-small-text">
            Et motbud lønner seg bare når det koster mindre enn det du taper på å miste selskapet. Når konsesjonen går
            ut, kommer et nytt anbud, og da stiller alle likt – også du.
          </p>
        </details>
      )}
    </section>
  );
}

/** Hva en investering gir, før den gjøres (B-370): ny Kontroll og budet som trengs for å ta selskapet */
function InvestPreview({ c, fund, amount }: { c: Company; fund: number; amount: number }) {
  const ctl = c.control!;
  if (amount <= 0) return null;
  const after = controlAfterInvest(ctl, amount);
  return (
    <p className="g-small-text g-invest-preview">
      Med {fmtKr(amount)} til: Kontroll <strong>{after}</strong> ({controlWord(after).word.toLowerCase()}), og et bud må
      være ca. <strong>{fmtKr(bidToTake(after, fund, ctl.value, 2))}</strong> for å ta selskapet.
    </p>
  );
}

/** Utbyttepolitikken (B-334): tre valg, hva de gir per dag, fondet og når valget kan endres igjen */
function PolicySection({
  g,
  full,
  busy,
  ownsCompany,
  onPick,
}: {
  g: GameState;
  full: number;
  busy: boolean;
  ownsCompany: boolean;
  onPick: (k: PolicyId) => void;
}) {
  const p = g.konsern.policy!;
  const locked = policyLockedUntil(p.changedAt, realNow());
  return (
    <section className="g-policy">
      <h3 className="g-subhead">Utbyttepolitikk</h3>
      <p className="g-small-text">
        Du bestemmer hvor mye av utbyttet fra datterverkene som går til konsernkassa, og hvor mye som settes av i
        beredskapsfondet. Fondet kan bare brukes til å gjøre selskapene dine tryggere: investere i dem, eller legge inn
        motbud hvis noen vil kjøpe dem. Ikke til nye verk.
      </p>
      <p className="g-small-text">
        Beredskapsfondet nå: <strong>{fmtKr(p.fund)}</strong>.{" "}
        {ownsCompany
          ? "Får et selskap et oppkjøpsbud, kan du bruke fondet til motbud."
          : "Du eier ikke noe selskap nå, så «Ta ut» gir mest."}
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
/** Selskapets verdi (10 dagers inntekt): minstebudet ved oppkjøp (B-335) */
function companyValue(c: Company): number {
  return c.control?.value ?? c.takeoverWindow?.value ?? 0;
}

/** Lønner budet seg (B-435): hva kjøperen tjener i dagene hen eier selskapet, mot budet, og hva som kommer tilbake */
function PayoffNote({
  c,
  bid,
  decidedAt,
  rules,
}: {
  c: Company;
  bid: number;
  decidedAt: number;
  rules: TakeoverRules;
}) {
  // Inntekten avhenger av eierens produksjon (B-443): kjøperen regnes med sin egen
  const perDay = c.estimateMine ?? c.estimatePerDay;
  if (bid <= 0 || perDay <= 0) return null;
  const p = takeoverPayoff({
    bid,
    perDay,
    decidedAt,
    concessionUntil: c.concessionUntil ? Date.parse(c.concessionUntil) : null,
    renewalOpen: !!c.tender || !!c.nextOwner,
    rules,
  });
  const days = Math.round(p.days);
  return (
    <p className={`g-small-text g-payoff ${p.net >= 0 ? "is-ok" : "is-bad"}`}>
      <strong>Lønner det seg?</strong> Med {fmtKr(bid)}: står budet sterkest, eier du selskapet i ca. {days}{" "}
      {days === 1 ? "dag" : "dager"} og tjener ca. {fmtKr(p.income)} ({fmtKr(perDay)} per dag
      {c.estimateMine !== null ? " med din produksjon" : ""}) –{" "}
      {p.net >= 0 ? `${fmtKr(p.net)} mer enn budet.` : `${fmtKr(-p.net)} mindre enn budet.`}
      {p.net < 0 && " Vil du tjene på det, må du også vinne anbudet om neste periode."} Holder ikke budet, får du{" "}
      {fmtKr(p.back)} tilbake.
    </p>
  );
}

/**
 * Et bud eller motbud som venter på bekreftelse (B-442): hva det koster, og hva som kommer tilbake. `snap` er det
 * bekreftelsen bygger på (konto, budet som står, betalingskilden, B-443) – endres noe av det, forsvinner bekreftelsen
 */
type PendingBid = { snap: string } & (
  | { kind: "bud"; amount: number; add: number }
  | { kind: "motbud"; amount: number; from: "kasse" | "fond" }
);

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
  const [pending, setPending] = useState<PendingBid | null>(null);
  const t = c.takeover;
  const w = c.takeoverWindow;
  const last = c.takeoverLast;
  const uid = useSyncExternalStore(onSessionChange, userId, userId);
  const snap = `${uid}|${t?.id ?? 0}|${t?.bid ?? 0}|${t?.mineAttack ? 1 : 0}|${from}`;
  // En bekreftelse som bygger på noe som har endret seg, vises ikke (og kan derfor ikke sendes)
  const live = pending && pending.snap === snap ? pending : null;
  const rules: TakeoverRules = t?.rules ?? w?.rules ?? 2;
  // Hvem som står sterkest, uten poeng (B-371)
  const lead = (a: number, d: number) => (a > d ? "oppkjøpsbudet står sterkest" : "eieren står sterkest");
  // Et bud er hele budet; `add` er det som trekkes fra kassa nå (ved økning bare forskjellen)
  const askBid = (total: number, add: number) => total > 0 && setPending({ snap, kind: "bud", amount: total, add });
  const amountRow = (label: string, onGo: () => void, placeholder: number) => (
    <div className="g-row g-amount-row">
      <MillInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setPending(null);
        }}
        placeholder={Math.ceil(placeholder / 1e6) * 1e6}
        label="Beløp i millioner kroner"
      />
      <button className="g-primary" disabled={busy || millions(amount) <= 0} onClick={onGo}>
        {label}
      </button>
    </div>
  );
  const confirmBox = live && (
    <div className="g-confirm" role="alertdialog" aria-label="Bekreft">
      <p className="g-small-text">
        {live.kind === "bud" ? (
          <>
            Du byr <strong>{fmtKr(live.amount)}</strong>
            {live.add < live.amount ? ` (${fmtKr(live.add)} mer fra konsernkassa)` : " fra konsernkassa"}. Står budet
            sterkest når tida er ute, kjøper du selskapet for det. Holder det ikke, får du{" "}
            {fmtKr(live.amount * bidBack(rules))} tilbake og mister{" "}
            <strong>{fmtKr(live.amount * (1 - bidBack(rules)))}</strong>.
            {rules === 2 && " Byr noen over deg, får du hele budet tilbake."}
          </>
        ) : rules === 1 ? (
          <>
            Du legger {fmtKr(live.amount)} fra {live.from === "fond" ? "beredskapsfondet" : "konsernkassa"} inn i
            motbudet. Du får 95 % tilbake når oppkjøpet er avgjort.
          </>
        ) : (
          <>
            Du legger <strong>{fmtKr(live.amount)}</strong> fra{" "}
            {live.from === "fond" ? "beredskapsfondet" : "konsernkassa"} inn i motbudet. Holder det, er pengene brukt
            opp. Blir selskapet kjøpt likevel, får du {fmtKr(live.amount * defenseBack(2, true))} tilbake.
          </>
        )}
      </p>
      <div className="g-row g-confirm-actions">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => {
            // Konto, bud og kilde er de samme som da bekreftelsen ble vist (`live`), ellers står den ikke her
            if (userId() !== uid) return;
            if (live.kind === "bud") onBid(live.amount);
            else onDefend(live.amount, live.from);
            setPending(null);
            setAmount("");
          }}
        >
          {live.kind === "bud" ? "Bekreft bud" : "Bekreft motbud"}
        </Button>
        <Button onClick={() => setPending(null)}>Avbryt</Button>
      </div>
    </div>
  );
  return (
    <section className="g-takeover">
      {t ? (
        <div className={`g-takeover-box${c.mine ? " is-mine" : ""}`}>
          <p className="g-small-text">
            <strong>
              {t.mineAttack ? "Du har lagt inn et oppkjøpsbud" : `${t.attacker} har lagt inn et oppkjøpsbud`}
            </strong>{" "}
            på {fmtKr(t.bid)}. Avgjøres {timeLeft(t.closesAt)} fra nå.
            {c.mine ? "" : ` Slik det står nå: ${lead(t.attack, t.defenseScore)}.`}
          </p>
          {t.outbidMe && (
            <p className="g-small-text">
              <Icon name="info" /> Budet ditt ble overbudt, og pengene er tilbake i konsernkassa. Du kan by igjen.
            </p>
          )}
          {c.mine && <DefenseVerdict c={c} fund={fund} />}
          {c.mine && (
            <>
              {amountRow(
                "Legg inn motbud",
                () => setPending({ snap, kind: "motbud", amount: millions(amount), from }),
                c.control?.value ?? 1e8,
              )}
              {fund > 0 && (
                <label className="g-field">
                  <span className="g-small-text">Betal fra</span>
                  <select value={from} onChange={(e) => setFrom(e.target.value === "fond" ? "fond" : "kasse")}>
                    <option value="kasse">Konsernkassa ({fmtKr(balance)})</option>
                    <option value="fond">Beredskapsfondet ({fmtKr(fund)})</option>
                  </select>
                </label>
              )}
              {confirmBox}
              <p className="g-muted g-small-text">
                Pengene du legger inn, gjør motbudet sterkere{t.defense ? ` (${fmtKr(t.defense)} nå)` : ""}.{" "}
                {t.rules === 1
                  ? "Du får 95 % tilbake når oppkjøpet er avgjort. Beredskapsfondet teller med av seg selv."
                  : "Holder motbudet, er pengene brukt opp. Blir selskapet kjøpt likevel, får du 75 % tilbake. Fondet teller bare når du legger det inn her."}
              </p>
            </>
          )}
          {t.mineAttack && (
            <>
              {amountRow("Øk budet", () => askBid(millions(amount), millions(amount) - t.bid), t.bid * 1.2)}
              {confirmBox}
              <p className="g-muted g-small-text">
                Skriv hele det nye budet. Står budet sterkest til slutt, får eieren betalt for dagene hen mister, og
                resten av budet er brukt. Ellers får du {Math.round(bidBack(t.rules) * 100)} % tilbake.
              </p>
              <PayoffNote
                c={c}
                bid={Math.max(t.bid, millions(amount))}
                decidedAt={Date.parse(t.closesAt)}
                rules={t.rules}
              />
            </>
          )}
          {!c.mine && !t.mineAttack && t.compete?.open && (
            <details className="g-details">
              <summary>By over</summary>
              <p className="g-small-text">
                Du kan by over {t.attacker}: minst {fmtKr(t.compete.minBid)}. Overbudet må også gi et sterkere bud enn
                det som står – hvor sterkt det blir, avhenger av hvor aktiv du er og verkene dine i regionen. Da tar
                budet ditt over runden, og {t.attacker} får pengene sine tilbake.
              </p>
              {amountRow("By over", () => askBid(millions(amount), millions(amount)), t.compete.minBid)}
              {confirmBox}
              <PayoffNote
                c={c}
                bid={millions(amount) || t.compete.minBid}
                decidedAt={Math.max(Date.parse(t.closesAt), realNow() + TAKEOVER_V2.extendHours * 3_600_000)}
                rules={t.rules}
              />
            </details>
          )}
          {!c.mine && !t.mineAttack && t.compete && !t.compete.open && t.compete.reason && (
            <p className="g-muted g-small-text">{TAKEOVER_REASON[t.compete.reason] ?? ""}</p>
          )}
          {t.rules === 2 && (
            <p className="g-muted g-small-text">
              Kommer et nytt bud de siste {TAKEOVER_V2.extendHours} timene, flyttes fristen til{" "}
              {TAKEOVER_V2.extendHours} timer etter budet, så eieren rekker å svare.
            </p>
          )}
        </div>
      ) : (
        w &&
        (w.open ? (
          <details className="g-details">
            <summary>Kjøp selskapet</summary>
            <p className="g-small-text">
              Et oppkjøpsbud må være minst verdien (10 dagers inntekt), {fmtKr(w.minBid)}, og betales fra konsernkassa
              med én gang. Alle ser budet, og eieren har {TAKEOVER.defenseHours} timer på seg til å legge inn et motbud.
              Med minstebudet: {lead(w.attackMin, w.defenseNow)} før eieren gjør noe. Større bud, at du spiller hver uke
              og egne verk i regionen gjør budet sterkere – med stort nok bud kan alle selskaper kjøpes. Eieren kan
              svare med et motbud; samme beløp teller like mye for begge, men motbudet er brukt opp hvis det holder.
              Andre spillere kan by over deg i samme runde – da får du hele budet tilbake.
            </p>
            {amountRow("Legg inn oppkjøpsbud", () => askBid(millions(amount), millions(amount)), w.minBid)}
            {confirmBox}
            <p className="g-muted g-small-text">
              Står budet sterkest, eier du selskapet i 14 dager fra kjøpet. Eieren får betalt for dagene hen mister og
              det hen har investert; resten av budet går ut av spillet. Ellers får du{" "}
              {Math.round(bidBack(w.rules) * 100)} % tilbake, og ingen kan by på selskapet de neste{" "}
              {TAKEOVER_V2.pauseDays} dagene.
            </p>
            <PayoffNote
              c={c}
              bid={millions(amount) || w.minBid}
              decidedAt={realNow() + TAKEOVER.defenseHours * 3_600_000}
              rules={w.rules}
            />
          </details>
        ) : (
          w.reason &&
          w.reason !== "pagar" && (
            <p className="g-muted g-small-text">
              Oppkjøp: {TAKEOVER_REASON[w.reason] ?? ""}
              {w.reason === "pause" && w.from ? ` Nye bud fra ${fmtWhen(w.from)}.` : ""}
            </p>
          )
        ))
      )}
      {last && (
        <p className="g-muted g-small-text">
          Forrige oppkjøpsforsøk:{" "}
          {last.status === "overtatt" ? `${last.attacker} kjøpte selskapet.` : `budet fra ${last.attacker} holdt ikke.`}
        </p>
      )}
    </section>
  );
}

/** Eieren med et oppkjøpsbud (B-370, ord fra B-371): beholder eller mister du selskapet slik det står, og hva som trengs */
function DefenseVerdict({ c, fund }: { c: Company; fund: number }) {
  const t = c.takeover!;
  const ctl = c.control;
  if (!ctl) return null;
  const need = defenseNeeded(t.attack, ctl.score, t.defense ?? 0, fund, ctl.value, t.rules);
  if (need === 0)
    return (
      <p className="g-small-text g-defense-verdict is-ok">
        <Icon name="shield-check" /> Slik det står nå, beholder du selskapet. Oppkjøpsbudet kan økes, så følg med.
      </p>
    );
  return (
    <p className="g-small-text g-defense-verdict is-bad">
      <Icon name="warning" /> Slik det står nå, mister du selskapet.{" "}
      {need === null
        ? "Budet er så stort at et motbud ikke kan stå imot. Du får betalt for dagene du mister og det du har investert."
        : t.rules === 1
          ? `Legg inn et motbud på ca. ${fmtKr(need)}${t.defense ? " til" : ""} for å beholde det – du får 95 % tilbake etterpå.`
          : `Et motbud på ca. ${fmtKr(need)}${t.defense ? " til" : ""} holder det – men da er pengene brukt opp.`}
      {need !== null && t.rules === 2 && ctl.buyout && (
        <>
          {" "}
          Blir selskapet kjøpt, får du ca. {fmtKr(buyoutPay(t.bid, ctl.buyout).kasse)} for dagene du mister og det du
          har investert.
        </>
      )}
    </p>
  );
}
