/**
 * Verv en venn (B-459): kortet på Mål → Uka og koblingen etter innlogging. Krever konto (KONTO.md): koden, vennene og
 * belønningen står på serveren, og belønningen går til konsernkassa i virkelig tid.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { STAGES, stageRef } from "../game/data";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { cloudConfigured } from "../net/config";
import {
  clearReferral,
  fetchReferral,
  onReferralChange,
  pendingReferral,
  referralStatus,
  registerReferral,
  setReferral,
} from "../net/referral";
import { getSession, onSessionChange, userId } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { grantReferralRewards, grantReferralStart } from "./claims";
import { Card } from "./common";
import { Button } from "./ds";
import { fmtKr } from "./format";
import { Icon } from "./icons";
import { shareGame, shareUrl, type ShareResult } from "./share";

/** Kall som er på vei: samme konto spør ikke to ganger samtidig (to kort, eller React som kjører effekten to ganger) */
const inFlight = new Map<string, Promise<void>>();
function once(key: string, fn: () => Promise<void>): Promise<void> {
  const running = inFlight.get(key);
  if (running) return running;
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

/** Henter koden og vennene; serveren betaler belønningene som er klare i samme kall, og de varsles i spillet */
function loadReferral(act: GameApi["act"], uid: string): Promise<void> {
  return once(`last:${uid}`, async () => {
    const s = await fetchReferral().catch(() => null);
    if (!s || s.uid !== uid || userId() !== uid) return;
    setReferral(s);
    grantReferralRewards(act, uid, s.friends.filter((f) => f.rewarded).length, s.paidNow, s.reward);
  });
}

/** Kobler en vervekode som venter, til kontoen – én gang, også om effekten kjøres flere ganger */
function registerPending(act: GameApi["act"], uid: string): Promise<void> {
  return once(`verv:${uid}`, async () => {
    const code = pendingReferral();
    if (!code) return;
    try {
      const r = await registerReferral(code);
      // Koden glemmes før startpakken legges inn, så den aldri gis to ganger
      if (r.ok || r.reason !== "gjest") clearReferral();
      if (r.ok) grantReferralStart(act, uid);
    } catch {
      // Nettet eller tjenesten: prøves igjen ved neste innlogging
    }
  });
}

/**
 * Etter innlogging: en vervekode som venter, kobles til kontoen (startpakken legges inn i spillet), og koden til
 * kontoen hentes, så delingsknappen kan ta den med. Venter til spillet er avklart mot kontoen (B-138).
 */
export function ReferralSync({ api }: { api: GameApi }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const reconciled = useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
  const user = session?.user.id ?? null;
  const act = api.act;
  const hasGame = !!api.game;
  useEffect(() => {
    if (!cloudConfigured() || !user || !reconciled || !hasGame) return;
    // Et nei fra serveren er endelig (egen kode, vervet før, for gammel konto …) – bortsett fra en gjest, som kan lage konto
    void registerPending(act, user).then(() => loadReferral(act, user));
  }, [user, reconciled, hasGame, act]);
  return null;
}

const SHARE_NOTE: Record<ShareResult, string> = {
  delt: "Delt.",
  kopiert: "Lenken er kopiert. Lim den inn i en melding.",
  avbrutt: "",
  feil: "Fikk ikke delt lenken. Prøv igjen.",
};

export function ReferralCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const reconciled = useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
  const status = useSyncExternalStore(onReferralChange, referralStatus, referralStatus);
  const [note, setNote] = useState("");
  const user = session?.user.id ?? null;

  // Fersk status når kortet vises: vennene kan ha kommet videre siden innloggingen
  useEffect(() => {
    if (!user || !reconciled) return;
    void loadReferral(act, user);
  }, [user, reconciled, act]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 4000);
    return () => clearTimeout(t);
  }, [note]);

  // Uten konto står vervingen i «Det går du glipp av» (B-212)
  if (!session || !status?.code) return null;
  const done = status.friends.filter((f) => f.rewarded).length;
  const full = status.used >= status.cap;
  const share = async () => {
    const r = await shareGame(
      "Bli med i Stålverket – bygg et stålverk fra garasjen. Med lenken min får du en startpakke.",
      shareUrl(status.code),
    );
    setNote(SHARE_NOTE[r]);
  };
  return (
    <Card title="Verv en venn" className="g-referral">
      <p>
        Del lenken din. Når en venn lager konto, spiller {status.minDays} ulike dager og flytter til{" "}
        {stageRef(status.minStage)}, får du {fmtKr(status.reward)} i konsernkassa
        {g.konsern?.unlocked ? "" : " – til datterverk når verket ditt blir et konsern"}. Vennen får en startpakke.
      </p>
      {full ? (
        <p className="g-muted">Du har vervet {status.cap} venner, så mange som det går an.</p>
      ) : (
        <div className="g-referral-share">
          <Button variant="primary" icon="share-2" onClick={() => void share()}>
            Del lenken
          </Button>
          <span className="g-muted">
            Koden din: <strong>{status.code}</strong>
          </span>
        </div>
      )}
      <p className="g-referral-note" role="status">
        {note}
      </p>
      {status.friends.length > 0 && (
        <>
          <p className="g-muted">
            {status.used} av {status.cap} plasser brukt, {done} har gitt belønning.
          </p>
          <ul className="g-referral-list">
            {status.friends.map((f, i) => (
              <li key={i}>
                <Icon name={f.rewarded ? "badge-check" : "clock"} />
                <span className="g-referral-nick">{f.nick ?? "Uten brukernavn"}</span>
                <span className="g-muted">
                  {f.rewarded
                    ? "Belønning gitt"
                    : `${Math.min(f.days, status.minDays)} av ${status.minDays} dager · ${STAGES[f.stage]?.name ?? "Garasje"}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
