/**
 * Sesonger og felles hendelser i grensesnittet (B-129):
 * - SeasonSync holder sesong og hendelser oppdatert og legger hendelsene inn i spillet
 * - SeasonPrompt spør om man vil starte sesongen når en ny sesong er i gang
 * - EventsNote viser hendelsene som pågår, på Marked
 * - SeasonLine er tekstlinja «Sesong … · N dager igjen» på topplista
 */
import { useEffect, useSyncExternalStore } from "react";
import { useState } from "react";
import { log, unlock } from "../game/engine";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { applySeasonTwist, applyWorldEvents, canJoinDirectly, joinSeason } from "../game/world";
import { cloudConfigured } from "../net/config";
import {
  daysLeft,
  fetchSeasonHistory,
  markResultSeen,
  refreshSeason,
  resultSeen,
  seasonStatus,
  type SeasonResult,
} from "../net/season";
import { levelLabel, placeLabel } from "../net/leaderboard";
import { fmtKr } from "./format";
import { useSeasonStatus, useWorldEvents } from "./useSeason";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
/** Er spillet her avklart mot kontoen (B-138)? Til da kobles det ikke til sesongen og spørres ikke om noe */
function useReconciled() {
  return useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
}

/** Usynlig: henter status ved start og hvert tiende minutt, og legger hendelsene inn i spillet */
export function SeasonSync({ api }: { api: GameApi }) {
  const session = useSession();
  const status = useSeasonStatus();
  const events = useWorldEvents();
  const reconciled = useReconciled();
  const g = api.game;

  useEffect(() => {
    if (!cloudConfigured()) return;
    // Første gang med én gang; ved bytte av økt bare hvis det er lenge siden
    void refreshSeason(seasonStatus() === null);
    const t = setInterval(() => void refreshSeason(), 60_000);
    return () => clearInterval(t);
  }, [session]);

  // Hendelsene inn i spillet når de endrer seg
  const ids = events.map((e) => e.id).join(",");
  useEffect(() => {
    if (!g) return;
    const current = (g.world?.events ?? []).map((e) => e.id).join(",");
    if (current !== ids) api.act((gg) => applyWorldEvents(gg, events));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, g]);

  // Et ferskt spill kobles rett til sesongen
  const cur = status?.current ?? null;

  // Sesongens vri (B-152) inn i spillet når det er med i sesongen, ut ellers
  const twistKey = `${cur?.id ?? ""}:${cur?.twist?.id ?? ""}:${g?.season ?? ""}`;
  useEffect(() => {
    if (!g || !status) return;
    const want = cur?.twist && g.season === cur.id ? cur.twist.id : null;
    if ((g.world?.twist?.id ?? null) !== want)
      api.act((gg) => applySeasonTwist(gg, cur?.id ?? null, cur?.twist ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twistKey, !!g, !!status]);
  useEffect(() => {
    // Bare et spill som er avklart mot kontoen, kan kobles til sesongen (B-138)
    if (!g || !session || !cur || !reconciled) return;
    if (canJoinDirectly(g, cur.id) && (g.owner === null || g.owner === session.user.id))
      api.act((gg) => {
        // Fordelen fra forrige sesong gjelder bare et nytt spill i garasjen, ikke et spill som har kommet langt (B-166)
        const fresh = gg.stage === 0;
        const carried = gg.season !== null;
        joinSeason(gg, cur.id, !!status?.played_previous && fresh);
        unlock(gg, "sesong");
        // En ny sesong har startet, og spillet blir med videre (B-167)
        if (carried)
          log(gg, `🏆 ${cur.name} har startet. Spillet ditt er med videre og står på den nye sesonglista.`, "good");
        else if (!fresh) log(gg, `🏆 Spillet ditt er nå med i ${cur.name} og står på sesonglista under 🏆.`, "good");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, session, cur?.id, reconciled, g?.owner]);

  return null;
}

/** Uten konto: én beskjed per sesong om at man må logge inn for å være med (B-131) */
export function SeasonPrompt({ api, g, onOpenSettings }: { api: GameApi; g: GameState; onOpenSettings: () => void }) {
  const session = useSession();
  const status = useSeasonStatus();
  const cur = status?.current ?? null;
  if (!cur) return null;
  // Uten konto: én beskjed per sesong om at man må logge inn for å være med (B-131). Ikke midt i veiledningen.
  if (!session) {
    if (g.seasonLoginPromptSeen === cur.id || g.tutorial !== null) return null;
    const seen = () => api.act((gg) => void (gg.seasonLoginPromptSeen = cur.id));
    return (
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Ny sesong">
        <div className="g-modal-card">
          <h2>{cur.name} er i gang – bli med!</h2>
          <p>
            Alle som er med i sesongen, konkurrerer på topplista fram til den slutter om {daysLeft(cur)} dager. For å
            være med må du opprette en konto eller logge inn. Da lagres spillet på nett også.
          </p>
          <p className="g-muted">
            Spillet ditt blir med i sesongen med en gang du logger inn, uansett hvor langt du har kommet. Du finner
            dette igjen under 🏆 Toppliste øverst.
          </p>
          <div className="g-row">
            <button
              className="g-primary"
              onClick={() => {
                seen();
                onOpenSettings();
              }}
            >
              Opprett konto eller logg inn
            </button>
            <button onClick={seen}>Ikke nå</button>
          </div>
        </div>
      </div>
    );
  }
  // Med konto blir spillet med i sesongen av seg selv (B-166, B-167), så det er ingenting å spørre om
  return null;
}

/**
 * Sesonglinja øverst på topplista (B-132): uten konto hvordan man blir med, ellers om spillet er med. Med konto blir
 * spillet med av seg selv (B-166, B-167).
 */
export function SeasonJoin({ g, onOpenSettings }: { api?: GameApi; g: GameState; onOpenSettings?: () => void }) {
  const session = useSession();
  const reconciled = useReconciled();
  const status = useSeasonStatus();
  const cur = status?.current ?? null;
  if (!cur) return null;
  if (!session)
    return (
      <div className="g-note g-season-join">
        <strong>Bli med i {cur.name}:</strong> opprett konto eller logg inn, så er du med på sesonglista.{" "}
        {onOpenSettings && (
          <button className="g-link" onClick={onOpenSettings}>
            Opprett konto eller logg inn
          </button>
        )}
      </div>
    );
  if (!reconciled || (g.owner && g.owner !== session.user.id)) return null;
  if (g.season === cur.id) return <p className="g-muted g-small-text">Spillet ditt er med i {cur.name}.</p>;
  // Spillet kobles til sesongen av seg selv (SeasonSync); dette står bare et øyeblikk
  return <p className="g-muted g-small-text">Spillet ditt blir med i {cur.name} …</p>;
}

/**
 * Beskjed når en sesong spilleren var med i, er over (B-143): plassen, antall spillere og resultatet. Vises én gang
 * per sesong og konto i denne nettleseren. `onOpen` sier fra, så spørsmålet om neste sesong venter til den er lukket.
 */
export function SeasonResultNotice({ onOpen }: { onOpen: (open: boolean) => void }) {
  const session = useSession();
  const reconciled = useReconciled();
  const status = useSeasonStatus();
  const [result, setResult] = useState<SeasonResult | null>(null);
  const user = session?.user.id ?? null;
  useEffect(() => {
    if (!user || !reconciled) return;
    let alive = true;
    void fetchSeasonHistory()
      .then((h) => {
        const newest = h[0];
        if (alive && newest && newest.seasonId > resultSeen(user)) setResult(newest);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, reconciled, status?.current?.id]);
  useEffect(() => {
    onOpen(!!result);
  }, [result, onOpen]);
  if (!result || !user) return null;
  const cur = status?.current ?? null;
  const level = levelLabel({
    stage: result.stage,
    league: result.stage >= 4 && result.equity >= 1_000_000_000 ? "gull" : "",
  });
  const close = () => {
    markResultSeen(user, result.seasonId);
    setResult(null);
  };
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Sesongen er over">
      <div className="g-modal-card g-celebrate">
        <div className="g-celebrate-burst" aria-hidden="true">
          {result.plass <= 3 ? placeLabel(result.plass) : "🏁"}
        </div>
        <h2>{result.name} er over!</h2>
        <p>
          Du ble nr. {result.plass} av {result.players} med {fmtKr(result.equity)} ({level}, dag {result.day}).
        </p>
        {result.plass <= 10 && (
          <p>
            <strong>
              {result.plass === 1 ? `🏆 Du vant ${result.name}!` : `🎖 Du er blant de ti beste i ${result.name}!`}
            </strong>{" "}
            Det står ved kallenavnet ditt på topplista for alltid.
          </p>
        )}
        <p className="g-muted">
          Plasseringen står ved kallenavnet ditt på topplista, og i «Dine sesonger» bak 🏆.
          {cur ? ` ${cur.name} er i gang – der starter alle i garasjen igjen.` : ""}
        </p>
        <button className="g-primary" onClick={close}>
          Flott!
        </button>
      </div>
    </div>
  );
}

/** Hendelsene som pågår, på Marked */
export function EventsNote({ g }: { g: GameState }) {
  const events = g.world?.events ?? [];
  const twist = g.world?.twist ?? null;
  if (events.length === 0 && !twist) return null;
  return (
    <div className="g-note g-events">
      <strong>Nå i markedet</strong>
      <ul>
        {twist && (
          <li>
            <strong>Sesongens vri – {twist.title}:</strong> {twist.text}
          </li>
        )}
        {events.map((e) => (
          <li key={e.id}>
            <strong>{e.title}:</strong> {e.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** På startskjermen: at en sesong pågår, og at man må logge inn for å være med (B-133) */
export function SeasonTeaser() {
  const status = useSeasonStatus();
  const cur = status?.current ?? null;
  if (!cur) return null;
  const left = daysLeft(cur);
  return (
    <p className="g-season-teaser">
      🏆 <strong>{cur.name}</strong> pågår – {left} {left === 1 ? "dag" : "dager"} igjen
    </p>
  );
}

/** «Sesong 1 · 18 dager igjen», eller at ingen sesong pågår */
export function SeasonLine() {
  const status = useSeasonStatus();
  if (!status) return null;
  const cur = status.current;
  if (!cur) return <p className="g-muted g-small-text">Ingen sesong pågår akkurat nå.</p>;
  const left = daysLeft(cur);
  return (
    <p className="g-muted g-small-text">
      <strong>{cur.name}</strong> · {left === 0 ? "siste dag" : `${left} ${left === 1 ? "dag" : "dager"} igjen`}
      {cur.twist && ` · Vri: ${cur.twist.title} – ${cur.twist.text}`}
    </p>
  );
}
