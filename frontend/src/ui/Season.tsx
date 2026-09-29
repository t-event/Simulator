/**
 * Sesonger og felles hendelser i grensesnittet (B-129):
 * - SeasonSync holder sesong og hendelser oppdatert og legger hendelsene inn i spillet
 * - SeasonPrompt spør om man vil starte sesongen når en ny sesong er i gang
 * - EventsNote viser hendelsene som pågår, på Marked
 * - SeasonLine er tekstlinja «Æra · Sesong … pågår» på topplista (uten nedtelling, B-220)
 */
import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { useState } from "react";
import { log, unlock } from "../game/engine";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { activeWar, warPct } from "../game/war";
import { day } from "../game/plant";
import { applySeasonTwist, applyWorldEvents, canJoinDirectly, joinSeason } from "../game/world";
import { cloudConfigured } from "../net/config";
import {
  fetchSeasonHistory,
  markResultSeen,
  refreshSeason,
  resultSeen,
  seasonStatus,
  type SeasonResult,
} from "../net/season";
import { levelLabel } from "../net/leaderboard";
import { Place } from "./Place";
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
          log(gg, `${cur.name} har startet. Spillet ditt er med videre og står på den nye sesonglista.`, "good");
        else if (!fresh)
          log(gg, `Spillet ditt er nå med i ${cur.name} og står på sesonglista under Toppliste.`, "good");
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
            Alle som er med i sesongen, konkurrerer på topplista. For å være med må du opprette en konto eller logge
            inn. Da lagres spillet på nett også.
          </p>
          <p className="g-muted">
            Spillet ditt blir med i sesongen med en gang du logger inn, uansett hvor langt du har kommet. Du finner
            dette igjen under Toppliste (pokalen) øverst.
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
/** Sesongresultatet per konto og sesong, hentet én gang i denne økta (B-344); null = ingenting å vise */
const historyChecked = new Map<string, SeasonResult | null>();

export function SeasonResultNotice({ onOpen }: { onOpen: (open: boolean) => void }) {
  const session = useSession();
  const reconciled = useReconciled();
  const status = useSeasonStatus();
  // Tegnes på nytt når lista er hentet eller beskjeden er lukket; resultatet selv ligger i historyChecked
  const [, redraw] = useState(0);
  const user = session?.user.id ?? null;
  const key = user ? `${user}:${status?.current?.id ?? "-"}` : null;
  const known = key ? historyChecked.get(key) : undefined;
  const result = known && user && known.seasonId > resultSeen(user) ? known : null;
  useEffect(() => {
    // Én gang per konto og sesong (B-344): beskjeden vises bare når ingen ark er åpne, så den ble montert på nytt – og
    // hentet lista – hver gang et ark eller et hendelseskort ble lukket
    if (!key || !reconciled || historyChecked.has(key)) return;
    historyChecked.set(key, null);
    let alive = true;
    void fetchSeasonHistory()
      .then((h) => {
        historyChecked.set(key, h[0] ?? null);
        if (alive) redraw((n) => n + 1);
      })
      .catch(() => historyChecked.delete(key));
    return () => {
      alive = false;
    };
  }, [key, reconciled]);
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
    redraw((n) => n + 1);
  };
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Sesongen er over">
      <div className="g-modal-card g-celebrate">
        <div className="g-celebrate-burst" aria-hidden="true">
          {result.plass <= 3 ? <Place plass={result.plass} /> : <Icon name="flag-triangle-right" />}
        </div>
        <h2>{result.name} er over!</h2>
        <p>
          Du ble nr. {result.plass} av {result.players} med {fmtKr(result.equity)} ({level}, dag {result.day}).
        </p>
        {result.plass <= 10 && (
          <p>
            <strong>
              {result.plass === 1 ? `Du vant ${result.name}!` : `Du er blant de ti beste i ${result.name}!`}
            </strong>{" "}
            Det står ved kallenavnet ditt på topplista for alltid.
          </p>
        )}
        <p className="g-muted">
          Plasseringen står ved kallenavnet ditt på topplista, og i «Dine sesonger» under Toppliste.
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
  // Krig i verden (B-297): bare i konsernet, og bare mens den varer
  const war = activeWar(g);
  if (events.length === 0 && !twist && !war) return null;
  return (
    <div className="g-note g-events">
      <strong>Nå i markedet</strong>
      <ul>
        {twist && (
          <li>
            <strong>Sesongens vri – {twist.title}:</strong> {twist.text}
          </li>
        )}
        {war && (
          <li>
            <strong>Krig i verden:</strong> strømmen er ca. {warPct(g, "power")} % dyrere, men det kommer ca.{" "}
            {warPct(g, "demand")} % flere forespørsler og {warPct(g, "steel")} % bedre pris på stål. Varer i{" "}
            {Math.max(1, war.untilDay - day(g) + 1)} døgn til.
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
  // Ingen nedtelling (B-220): neste sesong starter ikke av seg selv, og æraen avsluttes av administrator (B-182)
  return (
    <p className="g-season-teaser">
      <Icon name="trophy" /> <strong>{cur.name}</strong> pågår
    </p>
  );
}

/** «Grunnleggeræraen · Sesong 1 pågår», eller at ingen sesong pågår */
export function SeasonLine() {
  const status = useSeasonStatus();
  if (!status) return null;
  const cur = status.current;
  // Æraen (B-182) står først; neste sesong starter ikke av seg selv
  const era = status.era?.name;
  if (!cur)
    return (
      <p className="g-muted g-small-text">
        {era ? (
          <>
            <strong>{era}</strong> · ingen sesong pågår. Hall of Fame står.
          </>
        ) : (
          "Ingen sesong pågår akkurat nå."
        )}
      </p>
    );
  // Ingen «N dager igjen» (B-220): æraen avsluttes av administrator, ikke på en dato (B-182)
  return (
    <p className="g-muted g-small-text">
      {era && <strong>{era} · </strong>}
      <strong>{cur.name}</strong> pågår
      {cur.twist && ` · Vri: ${cur.twist.title} – ${cur.twist.text}`}
    </p>
  );
}
