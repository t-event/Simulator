/**
 * Strategiske selskaper (B-189): kortet «Skraplageret» på Konsern-fanen. Vises først når konsernet er åpnet
 * (gradvis synlighet), krever konto. Alt – anbud, eierskap, inntekt og konsernkassa – avgjøres på serveren i ekte tid;
 * kortet viser bare det serveren sier.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { applyTreasuryDeposit, DEPOSIT_REFUSAL_TEXT, depositToTreasury } from "../net/treasury";
import { BID_REFUSAL_TEXT, fetchWorldStatus, placeBid, timeLeft, type Company, type WorldStatus } from "../net/world";
import { NeedsAccount } from "./Account";
import { Card } from "./common";
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

const INTRO =
  "Det første selskapet i verden rundt verkene. Eieren tjener på skrapet de andre spillerne bruker – høyst én vanlig dags bruk per spiller per dag, så farten i spillet betyr ikke noe.";

export function StrategicCompanies({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const session = useSession();
  const reconciled = useReconciled();
  const [world, setWorld] = useState<WorldStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [bid, setBid] = useState("");
  const [deposit, setDeposit] = useState("");
  const user = session?.user.id ?? null;

  const load = useCallback(() => fetchWorldStatus().then(setWorld, () => {}), []);
  useEffect(() => {
    if (!user || !reconciled) return;
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [user, reconciled, load]);

  if (!session)
    return (
      <Card title="Skraplageret" className="g-company">
        <p className="g-muted g-small-text">{INTRO}</p>
        <NeedsAccount feature="skraplager" />
      </Card>
    );
  if (!world) return null;
  const c: Company | undefined = world.companies[0];
  if (!c) return null;
  const t = c.tender;
  const tr = world.treasury;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn());
      buzz();
    } catch {
      setMsg("Fikk ikke kontakt med serveren. Prøv igjen.");
    } finally {
      setBusy(false);
      void load();
    }
  };

  const doDeposit = () =>
    run(async () => {
      const amount = Math.min(millions(deposit), tr.left, Math.max(0, Math.floor(g.cash - g.loan)));
      if (amount <= 0) return "Velg et beløp over null.";
      const r = await depositToTreasury(g, amount, (a) => act((gg) => applyTreasuryDeposit(gg, a)));
      if (!r.ok) return DEPOSIT_REFUSAL_TEXT[r.reason];
      setDeposit("");
      return `${fmtKr(r.amount)} er flyttet til konsernkassa.`;
    });

  const doBid = (amount: number) =>
    run(async () => {
      if (!t) return BID_REFUSAL_TEXT.stengt;
      const r = await placeBid(t.id, amount);
      if (!r.ok) return BID_REFUSAL_TEXT[r.reason];
      setBid("");
      return amount === 0
        ? "Budet er trukket, og pengene er tilbake i konsernkassa."
        : `Budet ditt er ${fmtKr(r.bid)}.`;
    });

  const last = c.lastResult;
  return (
    <Card title={c.name} className="g-company">
      <p className="g-muted g-small-text">{INTRO}</p>
      <p>
        {c.mine ? (
          <>
            <strong>Du eier skraplageret</strong> til {c.concessionUntil ? fmtWhen(c.concessionUntil) : "–"}.
          </>
        ) : c.owner ? (
          <>
            Eier: <strong>{c.owner}</strong> til {c.concessionUntil ? fmtWhen(c.concessionUntil) : "–"}.
          </>
        ) : (
          "Ingen eier ennå – den som vinner anbudet, får det."
        )}
        {c.nextOwner && (
          <>
            {" "}
            Neste eier: <strong>{c.nextMine ? "deg" : c.nextOwner}</strong>.
          </>
        )}
      </p>
      {c.mine && (
        <p className="g-small-text">
          I går: <strong>+{fmtKr(c.incomeYesterday ?? 0)}</strong> til konsernkassa · i alt {fmtKr(c.incomeMine)}
        </p>
      )}
      <p className="g-muted g-small-text">Anslått inntekt nå: ca. {fmtKr(c.estimatePerDay)} per døgn.</p>

      {t && (
        <div className="g-company-tender">
          <h3>
            Anbud – stenger om {timeLeft(t.closesAt)} <span className="g-muted">({fmtWhen(t.closesAt)})</span>
          </h3>
          <p className="g-small-text">
            Skjulte bud: ingen ser budene før anbudet stenger. Høyeste bud vinner og driver lageret i 14 dager. Likt bud
            avgjøres ved trekning. De som ikke vinner, får budet tilbake.
          </p>
          <p className="g-small-text">
            Bud mellom {fmtKr(t.minBid)} og {fmtKr(t.maxBid)}.{" "}
            {t.myBid ? (
              <>
                Ditt bud: <strong>{fmtKr(t.myBid)}</strong>
              </>
            ) : (
              "Du har ikke budt."
            )}
          </p>
          <div className="g-row g-amount-row">
            <label className="g-amount">
              <input
                type="number"
                inputMode="decimal"
                min={t.minBid / 1e6}
                max={t.maxBid / 1e6}
                placeholder={String(Math.round(t.minBid / 1e6))}
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                aria-label="Bud i millioner kroner"
              />
              <span>mill. kr</span>
            </label>
            <button
              className="g-primary"
              disabled={busy || millions(bid) <= 0}
              onClick={() => void doBid(millions(bid))}
            >
              {t.myBid ? "Endre bud" : "Legg inn bud"}
            </button>
          </div>
          {t.myBid && (
            <button className="g-link" disabled={busy} onClick={() => void doBid(0)}>
              Trekk budet
            </button>
          )}
        </div>
      )}

      <div className="g-company-treasury">
        <h3>Konsernkassa: {fmtKr(tr.balance)}</h3>
        <p className="g-small-text g-muted">
          Bud betales fra konsernkassa. Du kan flytte {fmtKr(tr.left)} til fra kassa i spillet de neste 24 timene
          {tr.freedAt && tr.left < tr.limit ? ` (mer blir ledig ${fmtWhen(tr.freedAt)})` : ""}.
        </p>
        <div className="g-row g-amount-row">
          <label className="g-amount">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder={String(Math.floor(Math.min(tr.left, Math.max(0, g.cash - g.loan)) / 1e6))}
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              aria-label="Beløp i millioner kroner"
            />
            <span>mill. kr</span>
          </label>
          <button disabled={busy || tr.left <= 0 || millions(deposit) <= 0} onClick={() => void doDeposit()}>
            Flytt fra kassa
          </button>
        </div>
      </div>

      {last && (
        <p className="g-muted g-small-text">
          Forrige anbud:{" "}
          {last.status === "ingen bud"
            ? "ingen bud."
            : `${last.won ? "du vant" : `vunnet av ${last.winner ?? "–"}`} med ${fmtKr(last.winningBid ?? 0)}${last.tie ? " (likt bud – avgjort ved trekning)" : ""}.`}
          {!last.won && last.myBid ? ` Budet ditt (${fmtKr(last.myBid)}) er tilbake i konsernkassa.` : ""}
        </p>
      )}
      {msg && (
        <p className="g-note" role="status">
          {msg}
        </p>
      )}
    </Card>
  );
}
