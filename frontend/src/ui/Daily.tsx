/**
 * Daglig belønning, dagens oppdrag og «mens du var borte» (B-149). Krever konto (docs/KONTO.md): dagen og tida borte
 * kommer fra serveren. DailySync henter status og tid borte og viser velkomstvinduet; DailyCard står på Verket.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  applyAwayReward,
  applyMissionBonus,
  applyStreakReward,
  missionBonus,
  missionBonusReady,
  missionDone,
  missionProgress,
  startMissionDay,
  STREAK_REWARDS,
  streakReward,
  type Reward,
} from "../game/daily";
import type { DailyMission, GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { claimAway, claimDailyMissions, claimDailyReward, fetchDailyStatus, setDailyStatus } from "../net/daily";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { NeedsAccount } from "./Account";
import { Bar, Card } from "./common";
import { driftText, fmtKr, fmtNum, fmtT } from "./format";
import { useDailyStatus } from "./useDaily";
import { buzz } from "./haptics";

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
function useReconciled() {
  return useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
}

/** Et opphold teller først etter så lang tid med appen i bakgrunnen (samme som på serveren) */
const AWAY_CHECK_MS = 10 * 60_000;

/** Én henting om gangen: serveren gir tida borte bare én gang, så svaret må ikke kastes (f.eks. ved ny render) */
let checking = false;
/** Viser tida borte i vinduet som vises nå (settes av DailySync når den er montert) */
let showAway: ((a: { seconds: number; reward: Reward }) => void) | null = null;

function rewardText(r: Reward): string {
  return [r.cash > 0 && fmtKr(r.cash), r.fp > 0 && `${r.fp} fagpoeng`].filter(Boolean).join(" + ") || "–";
}

function formatAway(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} t ${m} min` : `${m} min`;
}

/**
 * Henter status og tid borte fra serveren når spillet er koblet til kontoen, og igjen når appen vises etter en
 * stund. Viser «Velkommen tilbake» med det verket tjente mens du var borte, og dagens belønning.
 */
export function DailySync({ api, blocked }: { api: GameApi; blocked: boolean }) {
  const session = useSession();
  const reconciled = useReconciled();
  const status = useDailyStatus();
  const [away, setAway] = useState<{ seconds: number; reward: Reward } | null>(null);
  const [claimed, setClaimed] = useState<{ streak: number; reward: Reward } | null>(null);
  const [busy, setBusy] = useState(false);
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });
  const hasGame = !!api.game;
  useEffect(() => {
    showAway = setAway;
    return () => {
      if (showAway === setAway) showAway = null;
    };
  }, []);

  useEffect(() => {
    if (!session || !reconciled || !hasGame) {
      if (!session) setDailyStatus(null);
      return;
    }
    let hiddenAt = 0;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const [s, seconds] = await Promise.all([fetchDailyStatus(), claimAway()]);
        if (s) setDailyStatus(s);
        // Tida borte er hentet på serveren nå, så den legges inn i spillet selv om komponenten er byttet ut
        if (seconds > 0 && apiRef.current.game) {
          const reward = apiRef.current.act((g) => applyAwayReward(g, seconds, fmtKr));
          if (reward.cash > 0) showAway?.({ seconds, reward });
        }
      } catch {
        // Uten nett: prøv igjen neste gang appen vises
      } finally {
        checking = false;
      }
    };
    void check();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= AWAY_CHECK_MS) void check();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, reconciled, hasGame]);

  // Ny dag (eller nytt spill): dagens oppdrag. Serveren vet om bonusen alt er hentet
  const day = api.game?.daily.date;
  useEffect(() => {
    if (!status || !hasGame) return;
    if (day !== status.today || (status.missionsClaimed && !api.game?.daily.claimed))
      api.act((g) => startMissionDay(g, status.today, status.missionsClaimed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.today, status?.missionsClaimed, day, hasGame]);

  const g = api.game;
  const rewardOpen = !!status && !status.claimed && !!session;
  if (blocked || !g || (!away && !rewardOpen && !claimed)) return null;

  const claim = async () => {
    setBusy(true);
    try {
      const r = await claimDailyReward();
      const reward: Reward = r.already ? { cash: 0, fp: 0 } : api.act((gg) => applyStreakReward(gg, r.streak, fmtKr));
      buzz(30);
      setClaimed({ streak: r.streak, reward });
      const s = await fetchDailyStatus().catch(() => null);
      setDailyStatus(s ?? (status ? { ...status, claimed: true, streak: r.streak } : null));
    } catch {
      setClaimed(null);
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    setAway(null);
    setClaimed(null);
  };

  const day7 = claimed ? claimed.streak : (status?.next ?? 1);
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Velkommen tilbake">
      <div className="g-modal-card g-daily">
        <h2>{away ? "Velkommen tilbake!" : "Daglig belønning"}</h2>
        {away && (
          <p>
            Du var borte i {formatAway(away.seconds)}. Verket holdt det gående og tjente{" "}
            <strong>{fmtKr(away.reward.cash)}</strong>.
          </p>
        )}
        {(rewardOpen || claimed) && (
          <>
            {away && <h3 className="g-subhead">Daglig belønning</h3>}
            <ol className="g-streak" aria-label="Uka">
              {STREAK_REWARDS.map((r, i) => {
                const n = i + 1;
                const state = n < day7 || (claimed && n === day7) ? "is-done" : n === day7 ? "is-next" : "";
                return (
                  <li key={n} className={`${state}${n === 7 ? " is-chest" : ""}`}>
                    <span className="g-streak-day">{n === 7 ? "🎁" : `Dag ${n}`}</span>
                    <span className="g-streak-what">
                      {r.fp > 0 && `${r.fp} fp`}
                      {r.fp > 0 && r.days > 0 && " + "}
                      {r.days > 0 &&
                        (r.days < 1 ? `${Math.round(r.days * 24)} t` : `${fmtNum(r.days, r.days % 1 ? 1 : 0)} d`)}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="g-muted g-small-text">fp = fagpoeng · t og d = timer og døgn med drift (det verket tjener)</p>
            {claimed ? (
              <p>
                Dag {claimed.streak} av 7: <strong>{rewardText(claimed.reward)}</strong>.{" "}
                {claimed.streak === 7
                  ? "Uka er full! I morgen begynner en ny uke."
                  : "Kom tilbake i morgen – hopper du over en dag, starter uka på nytt."}
              </p>
            ) : (
              <p className="g-muted">
                Dag {status?.next ?? 1} av 7: {rewardText(streakReward(g, status?.next ?? 1))}. Belønningen blir større
                for hver dag på rad, og dag 7 er en ukeskiste. Hopper du over en dag, starter uka på nytt.
              </p>
            )}
          </>
        )}
        <div className="g-row">
          {rewardOpen && !claimed ? (
            <button className="g-primary" disabled={busy} onClick={() => void claim()}>
              Hent dag {status?.next ?? 1}
            </button>
          ) : (
            <button className="g-primary" onClick={close}>
              Flott!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function missionText(m: DailyMission): string {
  switch (m.id) {
    case "kontrakter":
      return m.target === 1 ? "Lever en kontrakt" : `Lever ${m.target} kontrakter`;
    case "tonn":
      return `Lag ${fmtT(m.target)} stål`;
    case "selv":
      return "Kjør en charge selv (Ta styringen)";
    case "forsk":
      return "Forsk fram noe nytt";
    case "les":
      return "Les et nytt kapittel i fagboka";
    case "quiz":
      return "Ta en quiz i fagboka";
    case "omdomme":
      return `Øk omdømmet med ${m.target}`;
  }
}

function progressText(g: GameState, m: DailyMission): string {
  const p = missionProgress(g, m);
  if (m.id === "tonn") return `${fmtT(p)} / ${fmtT(m.target)}`;
  if (m.id === "omdomme") return `${fmtNum(Math.floor(p * 10) / 10, 1)} / ${m.target}`;
  return `${Math.floor(p)} / ${m.target}`;
}

/** Dagens oppdrag og hvor langt du er i uka, på Verket → Oversikt. Uten konto: hva man får med konto. */
export function DailyCard({ g, act, onLogin }: { g: GameState; act: GameApi["act"]; onLogin?: () => void }) {
  const session = useSession();
  const status = useDailyStatus();
  const [busy, setBusy] = useState(false);
  if (!session)
    return (
      <Card title="Dagens oppdrag">
        <NeedsAccount feature="oppdrag" onLogin={onLogin} />
        <p className="g-muted g-small-text">
          Med konto får du også en daglig belønning som vokser gjennom uka, og verket tjener litt mens du er borte.
        </p>
      </Card>
    );
  if (!status || g.daily.date !== status.today) return null;
  const ready = missionBonusReady(g);
  const bonus = missionBonus(g);
  const claim = async () => {
    setBusy(true);
    try {
      const r = await claimDailyMissions();
      if (!r.already) act((gg) => void applyMissionBonus(gg, fmtKr));
      else act((gg) => void (gg.daily.claimed = true));
      buzz(30);
      setDailyStatus({ ...status, missionsClaimed: true });
    } finally {
      setBusy(false);
    }
  };
  const streakLine = status.claimed
    ? status.streak === 7
      ? "Uka er full – i morgen begynner en ny uke."
      : `Daglig belønning: dag ${status.streak} av 7 er hentet. Kom tilbake i morgen.`
    : `Daglig belønning: dag ${status.next} av 7 venter.`;
  return (
    <Card title="Dagens oppdrag" className="g-daily-card">
      {g.daily.missions.length === 0 ? (
        <p className="g-muted">Ingen oppdrag i dag.</p>
      ) : (
        <ul className="g-missions">
          {g.daily.missions.map((m) => {
            const done = missionDone(g, m);
            return (
              <li key={m.id} className={done ? "is-done" : ""}>
                <div className="g-mission-line">
                  <span>
                    {done ? "✅ " : ""}
                    {missionText(m)}
                  </span>
                  <span className="g-muted">{progressText(g, m)}</span>
                </div>
                {!done && <Bar value={missionProgress(g, m) / m.target} tone="accent" label={missionText(m)} />}
              </li>
            );
          })}
        </ul>
      )}
      {g.daily.claimed ? (
        <p className="g-muted g-small-text">Bonusen for i dag er hentet. Nye oppdrag i morgen.</p>
      ) : ready ? (
        <button className="g-primary" disabled={busy} onClick={() => void claim()}>
          Hent bonus: {rewardText(bonus)}
        </button>
      ) : (
        <p className="g-muted g-small-text">
          Gjør alle tre for en bonus: {rewardText(bonus)} ({driftText(1)} og fagpoeng).
        </p>
      )}
      <p className="g-muted g-small-text">{streakLine}</p>
    </Card>
  );
}
