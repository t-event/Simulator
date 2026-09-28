/**
 * Industrien rundt verket (B-189, B-227): de strategiske selskapene og konsernkassa under Konsern → Industrien.
 * Skraplageret er det første selskapet; slagghåndtering og mekanisk verksted kommer etter (RETNING.md fase 2), og
 * Kontroll og overtakelser senere (fase 3–4). Hvert selskap serveren sender, får sitt eget kort, og konsernkassa – kapitalen
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
import { BID_REFUSAL_TEXT, fetchWorldStatus, placeBid, timeLeft, type Company, type WorldStatus } from "../net/world";
import { AccountFeaturesCard } from "./Account";
import { Bar, Card } from "./common";
import { Icon } from "./icons";
import { fmtKr } from "./format";
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
              <dd>
                +{fmtKr(c.incomeYesterday ?? 0)}
                <small> i går · {fmtKr(c.incomeMine)} i alt</small>
              </dd>
            </div>
          )}
          {c.nextOwner && (
            <div>
              <dt>Neste eier</dt>
              <dd>{c.nextMine ? "Du" : c.nextOwner}</dd>
            </div>
          )}
        </dl>

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
            {/* Hvem som har bydd, uten beløp (B-210) */}
            <p className="g-small-text g-tender-bidders">
              {t.bidders.length === 0 ? (
                <span className="g-muted">Ingen har bydd ennå.</span>
              ) : (
                <>
                  <span className="g-muted">Har bydd:</span>{" "}
                  {t.bidders.map((n) => (
                    <span key={n} className="g-chip">
                      {n}
                    </span>
                  ))}
                </>
              )}
            </p>
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
                tilbake i konsernkassa.
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
              Bud betales herfra, og inntekten fra selskapene du eier, kommer hit.
            </span>
          </div>
          <h3 className="g-subhead">Flytt penger fra verket</h3>
          <Bar value={tr.limit > 0 ? (tr.limit - tr.left) / tr.limit : 0} tone="accent" label="Brukt av grensen" />
          <p className="g-small-text">
            Du kan flytte <strong>{fmtKr(tr.left)}</strong> til de neste 24 timene (grensen er {fmtKr(tr.limit)}, lik
            for alle){tr.freedAt && tr.left < tr.limit ? `. Mer blir ledig ${fmtWhen(tr.freedAt)}` : ""}.
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
          {note("kasse")}
        </Card>
      </div>
    </>
  );
}
