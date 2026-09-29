/**
 * Tester av nettlaget (B-125) uten nett: `fetch` byttes ut med en falsk tjeneste i minnet.
 * Kjøres med `npx tsx src/net/tests.ts` og i `npm test`.
 */
import type { GameState } from "../game/types";
import { addCost, newGame } from "../game/engine";
import { setCloudConfig } from "./config";
import { migrate, setSaveListener } from "../game/save";
import {
  consumeAuthHash,
  getSession,
  getToken,
  KEEPALIVE_MAX,
  NetError,
  loggedOutByServer,
  logoutReason,
  clearLoggedOut,
  rememberPrefs,
  setFetch,
  setRequestTimeout,
  setRememberPrefs,
  setSession,
  signIn,
  signOut,
  signUp,
  translateError,
  verifyCode,
} from "./supabase";
import {
  fetchLeaderboard,
  fetchMyRank,
  fetchProfile,
  nicknameAvailable,
  nicknameProblem,
  setNickname,
} from "./leaderboard";
import { claimAway, fetchDailyStatus } from "./daily";
import { chestFp, claimWeekChest, fetchWeeklyBoard, fetchWeeklyStatus, weekDaysLeft } from "./weekly";
import { fetchActiveEvents, fetchSeasonHistory, fetchSeasonStatus, markResultSeen, resultSeen } from "./season";
import {
  cloudStatus,
  flush,
  isReconciled,
  keepLocal,
  leaving,
  linkOnLogin,
  markReconciled,
  onLocalSave,
  pullIfNewer,
  resetCloud,
  SaveConflictError,
  setClock,
  SOON_MS,
  staleCopy,
  UPLOAD_INTERVAL_MS,
  uploadSave,
} from "./sync";
import { forgetGuest, isGuest, onGuestSave, setGuestClock } from "./guest";
import { DEPOSIT_REFUSAL_TEXT, depositToTreasury, fetchTreasury } from "./treasury";
import { resetServerClock, serverClockOffset, syncServerClock } from "./clock";
import { realNow } from "../game/clock";
import {
  applyCompanyIncome,
  applyDividendNews,
  konsernValueOf,
  applyTenderResult,
  applyTenderResults,
  BID_REFUSAL_TEXT,
  companyType,
  EARNS_FROM,
  fetchWorldStatus,
  firstPayout,
  nextPayout,
  placeBid,
  timeLeft,
  worldNews,
  yesterdayUtc,
} from "./world";

declare const process: { exitCode?: number };

// localStorage finnes ikke i Node: en enkel erstatning
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
// sessionStorage: for «Husk meg» av (B-146)
const tabStore = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (k: string) => tabStore.get(k) ?? null,
  setItem: (k: string, v: string) => void tabStore.set(k, v),
  removeItem: (k: string) => void tabStore.delete(k),
};

setCloudConfig("https://test.local", "test-nokkel");

let failed = 0;
async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`OK    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FEIL  ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
function assert(ok: unknown, msg: string): void {
  if (!ok) throw new Error(msg);
}

/** En falsk Supabase: brukere, ett spill per konto, og en logg over kallene */
interface Fake {
  users: Map<string, { id: string; password: string; confirmed: boolean }>;
  saves: Map<string, { state: unknown; minute: number; day: number; rev: number; device: string | null }>;
  /** Fagpoeng i ukekista som venter (B-152) */
  chestFp: number;
  snapshots: Map<
    string,
    {
      day: number;
      equity: number;
      stage: number;
      reputation: number;
      season_id?: number | null;
      produced_t?: number;
      maint_kr?: number;
    }[]
  >;
  nicknames: Map<string, string>;
  calls: string[];
  /** keepalive per kall, samme rekkefølge som `calls` */
  keepalive: boolean[];
  offline: boolean;
  /** Kalles når appen fornyer økta – en annen fane kan fornye samtidig */
  onRefresh: (() => void) | null;
  /** Kalles mens save_game behandles, som om spillet går videre mens klienten venter på svar (B-162) */
  onSaveGame: (() => void) | null;
  /** Kall til save_game som aldri svarer, som på et mobilnett som henger (B-165) */
  hangSave: boolean;
  /** Konsernkassa (B-183): saldo og det som er flyttet inn siste døgn; grensen er fast 100 mill. her */
  treasury: Map<string, { balance: number; used: number }>;
  /** Bud i anbudet (B-189) */
  bids: Map<string, number>;
  /** Gjestekontoer (B-212) og om anonyme kontoer er slått av i Supabase */
  guests: Set<string>;
  guestsOff: boolean;
}
function makeFake(): Fake {
  const f: Fake = {
    users: new Map(),
    saves: new Map(),
    chestFp: 0,
    snapshots: new Map(),
    nicknames: new Map(),
    calls: [],
    keepalive: [],
    offline: false,
    onRefresh: null,
    onSaveGame: null,
    hangSave: false,
    treasury: new Map(),
    bids: new Map(),
    guests: new Set(),
    guestsOff: false,
  };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const token = (id: string) => {
    const payload = btoa(JSON.stringify({ sub: id, email: `${id}@test` }));
    return `h.${payload}.s`;
  };
  const who = (init?: RequestInit) => {
    const auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
    const m = /^Bearer h\.(.+)\.s$/.exec(auth);
    return m ? (JSON.parse(atob(m[1])) as { sub: string }).sub : null;
  };
  setFetch(async (input, init) => {
    const url = String(input);
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    f.calls.push(`${init?.method ?? "GET"} ${path}`);
    f.keepalive.push(!!init?.keepalive);
    if (f.offline) throw new TypeError("Failed to fetch");
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    // Gjest (B-212): anonym innlogging uten e-post
    if (path.startsWith("/auth/v1/signup") && body.email === undefined) {
      if (f.guestsOff)
        return json(422, { code: "anonymous_provider_disabled", msg: "Anonymous sign-ins are disabled" });
      const gid = `g-${f.guests.size + 1}`;
      f.guests.add(gid);
      return json(200, { access_token: token(gid), refresh_token: "rg", expires_in: 3600, user: { id: gid } });
    }
    if (path.startsWith("/auth/v1/signup")) {
      const email = String(body.email);
      if (f.users.has(email)) return json(200, { id: "x", identities: [] });
      f.users.set(email, { id: `u-${email}`, password: String(body.password), confirmed: false });
      return json(200, { id: `u-${email}`, identities: [{}] });
    }
    if (path.startsWith("/auth/v1/verify")) {
      const u = f.users.get(String(body.email));
      if (!u || body.token !== "123456")
        return json(403, { error_code: "otp_expired", msg: "Token has expired or is invalid" });
      if (body.type === "signup") u.confirmed = true;
      return json(200, {
        access_token: token(u.id),
        refresh_token: "r1",
        expires_in: 3600,
        user: { id: u.id, email: body.email },
      });
    }
    if (path.startsWith("/auth/v1/token?grant_type=password")) {
      const u = f.users.get(String(body.email));
      if (!u || u.password !== body.password) return json(400, { error_description: "Invalid login credentials" });
      if (!u.confirmed) return json(400, { error_description: "Email not confirmed" });
      return json(200, {
        access_token: token(u.id),
        refresh_token: "r1",
        expires_in: 3600,
        user: { id: u.id, email: String(body.email) },
      });
    }
    if (path.startsWith("/auth/v1/token?grant_type=refresh_token")) {
      f.onRefresh?.();
      if (body.refresh_token !== "r1") return json(400, { error_description: "Invalid Refresh Token" });
      return json(200, {
        access_token: token("u-a@test"),
        refresh_token: "r2",
        expires_in: 3600,
        user: { id: "u-a@test" },
      });
    }
    // Som nickname_available i 037 (B-214): uten innlogging
    if (path.startsWith("/rest/v1/rpc/nickname_available")) {
      const n = String(body.name).trim().toLowerCase();
      return json(
        200,
        n.length >= 3 && n.length <= 20 && ![...f.nicknames.values()].some((x) => x.toLowerCase() === n),
      );
    }
    const id = who(init);
    if (!id) return json(401, { message: "JWT" });
    // Som guest_gate i 035: en gjest får bare lagre spillet og overlevere seg selv
    if (f.guests.has(id)) {
      if (path.startsWith("/rest/v1/rpc/guest_handover")) return json(200, `kode-${id}`);
      if (!/^\/rest\/v1\/(rpc\/save_game|saves|snapshots|config)/.test(path))
        return json(403, { code: "GJEST", message: "Dette krever en konto." });
    }
    if (path.startsWith("/rest/v1/rpc/adopt_guest")) {
      const gid = String(body.p_code).replace(/^kode-/, "");
      if (!f.guests.has(gid)) return json(200, { ok: false, moved: 0 });
      f.guests.delete(gid);
      f.saves.delete(gid);
      return json(200, { ok: true, moved: 0 });
    }
    if (path.startsWith("/rest/v1/saves")) {
      if (init?.method === "POST") {
        // Eldre utgave av appen: skriver rett i tabellen, versjonen øker likevel (triggeren i 008)
        const old = f.saves.get(id);
        f.saves.set(id, {
          state: body.state,
          minute: Number(body.minute),
          day: Number(body.day),
          rev: (old?.rev ?? 0) + 1,
          device: old?.device ?? null,
        });
        return new Response(null, { status: 201 });
      }
      const s = f.saves.get(id);
      return json(
        200,
        s ? [{ state: s.state, minute: s.minute, day: s.day, updated_at: "now", rev: s.rev, device: s.device }] : [],
      );
    }
    if (path.startsWith("/rest/v1/rpc/save_game")) {
      // Som save_game i 008: lagrer bare over versjonen klienten kjenner
      const old = f.saves.get(id);
      if (old && old.rev !== Number(body.p_base_rev)) return json(200, null);
      // Som save_game i 034 (B-211): et spill serveren har endret, kan ikke overskrives av et eldre spill
      const edit = (st: unknown) => Number((st as { serverEdit?: number } | null)?.serverEdit ?? 0);
      if (old && edit(body.p_state) < edit(old.state)) return json(200, null);
      if (f.hangSave) return new Promise<Response>(() => {});
      f.onSaveGame?.();
      const rev = (old?.rev ?? 0) + 1;
      f.saves.set(id, {
        state: body.p_state,
        minute: Number(body.p_minute),
        day: Number(body.p_day),
        rev,
        device: (body.p_device as string) ?? null,
      });
      return json(200, rev);
    }
    // Som deposit_to_treasury i 027: versjonen må stemme, bare egne penger, grense per døgn, og serveren endrer spillet
    if (path.startsWith("/rest/v1/rpc/deposit_to_treasury")) {
      const save = f.saves.get(id);
      if (!save || save.rev !== Number(body.p_base_rev)) return json(200, { ok: false, reason: "lagre_forst" });
      const st = save.state as {
        stage: number;
        cash: number;
        loan: number;
        treasuryOut?: number;
        konsern: { unlocked: boolean };
      };
      if (st.stage < 4 || !st.konsern.unlocked) return json(200, { ok: false, reason: "konsern" });
      const amt = Math.floor(Number(body.p_amount));
      if (amt > st.cash - st.loan) return json(200, { ok: false, reason: "kasse" });
      const t = f.treasury.get(id) ?? { balance: 0, used: 0 };
      if (t.used + amt > 100_000_000) return json(200, { ok: false, reason: "grense", left: 100_000_000 - t.used });
      save.state = { ...st, cash: st.cash - amt, treasuryOut: (st.treasuryOut ?? 0) + amt };
      save.rev++;
      save.device = "server";
      f.treasury.set(id, { balance: t.balance + amt, used: t.used + amt });
      return json(200, {
        ok: true,
        rev: save.rev,
        amount: amt,
        balance: t.balance + amt,
        left: 100_000_000 - t.used - amt,
      });
    }
    // Som world_status/place_bid i 030: skjulte bud, penger holdes av i konsernkassa
    if (path.startsWith("/rest/v1/rpc/world_status")) {
      const t = f.treasury.get(id) ?? { balance: 0, used: 0 };
      return json(200, {
        // Utbyttet fra datterverkene i ekte tid (B-304)
        dividend: { per_day: "41465454.55", yesterday: "41465455", total: "82930910" },
        // Hovedverkets konsernbidrag (B-318)
        contribution: {
          per_day: "38441575",
          margin: "3000",
          normal_t: "32839",
          activity: "1.0000",
          yesterday: "38441575",
          total: "67996669",
        },
        companies: [
          {
            id: 1,
            type: "skraplager",
            name: "Skraplageret",
            owner: null,
            mine: false,
            concession_until: null,
            next_owner: null,
            next_mine: false,
            income_yesterday: null,
            income_mine: "0",
            estimate_per_day: "65902630",
            tender: {
              id: 7,
              opens_at: "2026-09-27T01:00:00Z",
              closes_at: "2026-09-29T01:00:00Z",
              min_bid: "1000000",
              max_bid: "923000000",
              my_bid: f.bids.get(id) ?? null,
              // Bare kallenavnene, sortert, uten beløp (B-210)
              bidders: f.bids.get(id) ? ["Grane", "Testspiller"] : ["Grane"],
            },
            last_result: null,
          },
        ],
        treasury: {
          balance: String(t.balance),
          limit: "100000000",
          used: String(t.used),
          left: String(100_000_000 - t.used),
          freed_at: null,
        },
      });
    }
    if (path.startsWith("/rest/v1/rpc/place_bid")) {
      const t = f.treasury.get(id) ?? { balance: 0, used: 0 };
      const amt = Math.floor(Number(body.p_amount));
      if (amt !== 0 && (amt < 1_000_000 || amt > 923_000_000)) return json(200, { ok: false, reason: "utenfor" });
      const diff = amt - (f.bids.get(id) ?? 0);
      if (diff > t.balance) return json(200, { ok: false, reason: "kasse", balance: t.balance });
      t.balance -= diff;
      f.treasury.set(id, t);
      if (amt === 0) f.bids.delete(id);
      else f.bids.set(id, amt);
      return json(200, { ok: true, bid: amt, balance: t.balance });
    }
    if (path.startsWith("/rest/v1/rpc/treasury_status")) {
      const t = f.treasury.get(id) ?? { balance: 0, used: 0 };
      return json(200, {
        balance: String(t.balance),
        limit: "100000000",
        used: String(t.used),
        left: String(100_000_000 - t.used),
        freed_at: t.used ? "2026-09-28T00:00:00Z" : null,
      });
    }
    if (path.startsWith("/rest/v1/snapshots")) {
      const list = f.snapshots.get(id) ?? [];
      list.push({
        day: Number(body.day),
        equity: Number(body.equity),
        stage: Number(body.stage),
        reputation: Number(body.reputation),
        season_id: body.season_id as number | null,
        produced_t: body.produced_t as number | undefined,
        maint_kr: body.maint_kr as number | undefined,
      });
      f.snapshots.set(id, list);
      return new Response(null, { status: 201 });
    }
    if (path.startsWith("/rest/v1/profiles")) {
      return json(200, [{ nickname: f.nicknames.get(id) ?? null, flagged_at: null, flag_reason: null, banned: false }]);
    }
    if (path.startsWith("/rest/v1/rpc/set_nickname")) {
      const n = String(body.name).trim();
      if (n.length < 3 || n.length > 20) return json(400, { message: "Kallenavnet må ha 3–20 tegn." });
      if ([...f.nicknames.entries()].some(([u, x]) => u !== id && x.toLowerCase() === n.toLowerCase()))
        return json(400, { message: "Kallenavnet er tatt. Velg et annet." });
      f.nicknames.set(id, n);
      return json(200, n);
    }
    if (path.startsWith("/rest/v1/rpc/leaderboard")) {
      const rows = [...f.nicknames.entries()]
        .map(([u, nick]) => {
          const snaps = f.snapshots.get(u) ?? [];
          const last = snaps[snaps.length - 1];
          // Æresmerker (B-299): ett kjent og ett ukjent for å vise at appen bare viser dem den kjenner
          const badges = nick === "Stålkongen" ? ["reform", "ukjent"] : null;
          return last ? { nickname: nick, value: String(last.equity), day: last.day, is_me: u === id, badges } : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => Number(b.value) - Number(a.value))
        .map((r, i) => ({ plass: i + 1, ...r }));
      return json(200, rows);
    }
    if (path.startsWith("/rest/v1/rpc/my_rank")) return json(200, 1);
    if (path.startsWith("/rest/v1/rpc/season_history"))
      return json(
        200,
        id === "u-a@test"
          ? [{ season_id: 1, name: "Sesong 1", plass: 3, players: 12, equity: "1200000000", day: 180, stage: 4 }]
          : [],
      );
    if (path.startsWith("/rest/v1/rpc/season_status"))
      return json(200, {
        current: {
          id: 1,
          name: "Sesong 1",
          starts_at: "2026-09-25T00:00:00Z",
          ends_at: null,
          twist: {
            id: "skrapmangel",
            title: "Skrapmangel",
            text: "Dyrt skrap.",
            scrap: "1.15",
            steel: "1",
            power: "1",
          },
        },
        played_previous: id === "u-a@test",
        era: { id: 1, name: "Grunnleggeræraen", starts_at: "2026-09-25T00:00:00Z" },
      });
    if (path.startsWith("/rest/v1/rpc/active_events"))
      return json(200, [
        {
          id: 3,
          kind: "stromkrise",
          title: "Strømkrise",
          text: "Dyr strøm.",
          scrap: "1",
          steel: "1",
          power: "1.5",
          starts_at: "x",
          ends_at: "2026-10-01T00:00:00Z",
        },
      ]);
    if (path.startsWith("/rest/v1/rpc/weekly_status"))
      return json(200, {
        week_start: "2026-09-21",
        ends_at: "2026-09-27T22:00:00+00:00",
        kind: "tonn",
        league: "solv",
        plass: 2,
        value: "12345",
        players: 7,
        chest: f.chestFp > 0 ? { fp: f.chestFp, count: 1, best: 2, week: "2026-09-14" } : null,
        gold: 1,
        silver: 2,
        bronze: 0,
      });
    if (path.startsWith("/rest/v1/rpc/claim_week_chest")) {
      const fp = f.chestFp;
      f.chestFp = 0;
      return json(200, fp);
    }
    if (path.startsWith("/rest/v1/rpc/weekly_board"))
      return json(200, [{ plass: 1, nickname: "Tuster", value: "5000", is_me: false, gold: 3 }]);
    if (path.startsWith("/rest/v1/config")) return json(200, [{ value: { cloud: true } }]);
    return json(404, { message: "ukjent" });
  });
  return f;
}

function fresh(): Fake {
  setSession(null);
  resetCloud();
  store.clear();
  forgetGuest();
  return makeFake();
}

/** En annen nettleser: ny merkelapp, og ingen husket versjon (økta beholdes) */
function otherBrowser(name: string): void {
  resetCloud();
  store.set("stalverk-enhet-v1", name);
  store.delete("stalverk-sky-v1");
}
/** Bytter til en nettleser med merkelapp og husket versjon fra før (som etter omstart av appen) */
function switchTo(browser: { device: string; rev: string | undefined }): void {
  resetCloud();
  store.set("stalverk-enhet-v1", browser.device);
  if (browser.rev === undefined) store.delete("stalverk-sky-v1");
  else store.set("stalverk-sky-v1", browser.rev);
}
function snapshotBrowser(): { device: string; rev: string | undefined } {
  return { device: store.get("stalverk-enhet-v1")!, rev: store.get("stalverk-sky-v1") };
}

const main = async () => {
  await test("Feilmeldingene fra tjenesten blir norske", () => {
    assert(translateError(400, "Invalid login credentials").includes("Feil e-post"), "innlogging");
    assert(translateError(400, "Email not confirmed").includes("bekreftet"), "bekreftelse");
    assert(translateError(422, "User already registered").includes("alt en konto"), "finnes");
    assert(translateError(429, "").includes("For mange"), "rate limit");
    assert(translateError(503, "").includes("svarer ikke"), "500");
  });

  await test("Opprett konto: må bekreftes på e-post, og e-post som finnes gir tydelig beskjed", async () => {
    fresh();
    const r = await signUp("a@test", "hemmelig");
    assert(r.needsConfirm, "skulle kreve bekreftelse");
    assert(getSession() === null, "skulle ikke være logget inn før bekreftelse");
    let msg = "";
    try {
      await signUp("a@test", "hemmelig");
    } catch (e) {
      msg = (e as Error).message;
    }
    assert(msg.includes("alt en konto"), `fikk «${msg}»`);
  });

  await test("Koden fra e-posten bekrefter kontoen i appen (B-128): feil kode, så riktig", async () => {
    const f = fresh();
    await signUp("k@test", "hemmelig");
    let msg = "";
    try {
      await verifyCode("k@test", "000000", "signup");
    } catch (e) {
      msg = (e as Error).message;
    }
    assert(msg.includes("feil eller utløpt"), `feil kode: «${msg}»`);
    assert(getSession() === null, "skulle ikke være logget inn etter feil kode");
    const s = await verifyCode("k@test", "123 456", "signup");
    assert(s.user.id === "u-k@test" && f.users.get("k@test")!.confirmed, "koden bekreftet ikke kontoen");
    assert(getSession()?.user.id === "u-k@test", "økta ble ikke satt");
    assert(
      f.calls.some((c) => c.includes("/auth/v1/signup?redirect_to=")) === false,
      "i Node finnes ingen adresse å sende med",
    );
  });

  await test("Logg inn: feil passord, ubekreftet e-post, og så riktig", async () => {
    const f = fresh();
    await signUp("a@test", "hemmelig");
    let msg = "";
    try {
      await signIn("a@test", "feil");
    } catch (e) {
      msg = (e as Error).message;
    }
    assert(msg.includes("Feil e-post"), `feil passord: «${msg}»`);
    try {
      await signIn("a@test", "hemmelig");
    } catch (e) {
      msg = (e as Error).message;
    }
    assert(msg.includes("bekreftet"), `ubekreftet: «${msg}»`);
    f.users.get("a@test")!.confirmed = true;
    const s = await signIn("a@test", "hemmelig");
    assert(s.user.id === "u-a@test" && getSession()?.user.id === "u-a@test", "økta ble ikke lagret");
    assert(store.has("stalverk-konto-v1"), "økta ligger ikke i localStorage");
  });

  await test("Økta fornyes av seg selv når den er i ferd med å gå ut", async () => {
    const f = fresh();
    setSession({
      access_token: "gammel",
      refresh_token: "r1",
      expires_at: Date.now() / 1000 + 10,
      user: { id: "u-a@test", email: "" },
    });
    const t = await getToken();
    assert(t && t !== "gammel", "ble ikke fornyet");
    assert(getSession()?.refresh_token === "r2", "ny refresh token mangler");
    assert(
      f.calls.some((c) => c.includes("grant_type=refresh_token")),
      "kalte ikke refresh",
    );
    // Uten nett beholdes økta
    f.offline = true;
    setSession({
      access_token: "gammel",
      refresh_token: "r2",
      expires_at: Date.now() / 1000 + 10,
      user: { id: "u-a@test", email: "" },
    });
    assert((await getToken()) === null && getSession() !== null, "økta skulle beholdes uten nett");
  });

  await test("Utlogging gjelder bare denne enheten, og avvist økt gir beskjed (B-145)", async () => {
    const f = fresh();
    const soon = (refresh: string, access = "gammel") => ({
      access_token: access,
      refresh_token: refresh,
      expires_at: Date.now() / 1000 + 10,
      user: { id: "u-a@test", email: "" },
    });
    // Logg ut: bare denne enheten (scope=local), ellers logges mobilen ut når man logger ut i en annen nettleser
    setSession(soon("r1"));
    await signOut();
    assert(
      f.calls.some((c) => c.includes("/auth/v1/logout?scope=local")),
      `logget ut alle enheter: ${f.calls.filter((c) => c.includes("logout")).join(", ")}`,
    );
    assert(!loggedOutByServer(), "egen utlogging skal ikke gi beskjed om avvist økt");
    // Tjenesten avviser økta: logget ut, og beskjeden huskes til man logger inn igjen
    setSession(soon("ukjent"));
    assert((await getToken()) === null && getSession() === null, "avvist økt ble ikke logget ut");
    assert(loggedOutByServer(), "mangler beskjed om at økta ble avvist");
    setSession(soon("r1"));
    assert(!loggedOutByServer(), "beskjeden ble ikke fjernet ved innlogging");
    // En annen fane har fornyet økta: den nye brukes, uten ny fornyelse og uten utlogging
    setSession(soon("r1"));
    store.set(
      "stalverk-konto-v1",
      JSON.stringify({ ...soon("r9", "fra-annen-fane"), expires_at: Date.now() / 1000 + 3600 }),
    );
    const before = f.calls.length;
    assert((await getToken()) === "fra-annen-fane", "brukte ikke økta fra den andre fanen");
    assert(!f.calls.slice(before).some((c) => c.includes("grant_type=refresh_token")), "fornyet unødvendig");
    // Fornyet den andre fanen mens denne ventet på svar, er den nye økta gyldig
    setSession(soon("brukt"));
    f.onRefresh = () =>
      store.set(
        "stalverk-konto-v1",
        JSON.stringify({ ...soon("r9", "ny-fra-fanen"), expires_at: Date.now() / 1000 + 3600 }),
      );
    assert((await getToken()) === "ny-fra-fanen" && getSession() !== null, "logget ut selv om fanen hadde fornyet");
    f.onRefresh = null;
  });

  await test("«Husk meg»: e-posten huskes, og uten avhuking lever økta bare til appen lukkes (B-146)", async () => {
    const f = fresh();
    f.users.set("a@test", { id: "u-a@test", password: "hemmelig", confirmed: true });
    assert(rememberPrefs().remember, "«Husk meg» skal være på som standard");
    await signIn("a@test", "hemmelig");
    setRememberPrefs({ remember: true, email: "a@test" });
    assert(rememberPrefs().email === "a@test" && store.has("stalverk-konto-v1"), "e-post eller økt ble ikke husket");
    assert(![...store.values()].some((v) => v.includes("hemmelig")), "passordet ble lagret");
    setRememberPrefs({ remember: false, email: "a@test" });
    assert(rememberPrefs().email === "", "e-posten skulle glemmes");
    assert(!store.has("stalverk-konto-v1") && tabStore.has("stalverk-konto-v1"), "økta skulle bare ligge i fanen");
    assert(getSession()?.user.id === "u-a@test", "fortsatt innlogget i denne økta");
    setRememberPrefs({ remember: true, email: "a@test" });
    assert(store.has("stalverk-konto-v1") && !tabStore.has("stalverk-konto-v1"), "økta ble ikke flyttet tilbake");
  });

  await test("Økta som blir borte på enheten gir en forklaring, egen utlogging gjør ikke (B-152)", async () => {
    const f = fresh();
    f.users.set("a@test", { id: "u-a@test", password: "hemmelig", confirmed: true });
    assert(logoutReason() === null, "grunn uten at noen har vært inne");
    await signIn("a@test", "hemmelig");
    assert(logoutReason() === null, "grunn mens man er inne");
    // Som når appen lukkes uten «Husk meg» eller nettleserdata slettes: økta forsvinner uten utlogging
    setSession(null);
    assert(logoutReason() === "lost", `grunn ${logoutReason()}`);
    clearLoggedOut();
    assert(logoutReason() === null, "beskjeden kom igjen etter at den var sett");
    await signIn("a@test", "hemmelig");
    await signOut();
    assert(logoutReason() === null, "egen utlogging ga beskjed");
  });

  await test("Daglig (B-149): uten konto hentes ingenting fra serveren", async () => {
    const f = fresh();
    setSession(null);
    const before = f.calls.length;
    assert((await fetchDailyStatus()) === null && (await claimAway()) === 0, "skulle gi tomt uten konto");
    assert(f.calls.length === before, "sendte kall uten konto");
  });

  await test("Lenken fra e-posten logger inn og rydder adressen", () => {
    fresh();
    const payload = btoa(JSON.stringify({ sub: "u-x", email: "x@test" }));
    const type = consumeAuthHash(`#access_token=h.${payload}.s&refresh_token=r&type=recovery&expires_in=3600`);
    assert(type === "recovery", `type ${type}`);
    assert(getSession()?.user.id === "u-x" && getSession()?.user.email === "x@test", "økta ble ikke satt");
    assert(consumeAuthHash("#foo=1") === null, "skulle ikke lese uten token");
  });

  const login = async (f: Fake, email = "a@test") => {
    if (!f.users.has(email)) await signUp(email, "hemmelig");
    f.users.get(email)!.confirmed = true;
    await signIn(email, "hemmelig");
  };

  await test("Kobling: ingen spill på nett + lokalt spill → lastes opp og merkes med kontoen", async () => {
    const f = fresh();
    await login(f);
    const local = newGame(1);
    const d = await linkOnLogin(local);
    assert(d.kind === "uploaded", `fikk ${d.kind}`);
    assert(local.owner === "u-a@test", "eier ble ikke satt");
    assert(f.saves.has("u-a@test"), "ikke lastet opp");
    assert(f.snapshots.get("u-a@test")?.length === 1, "ingen snapshot");
    assert(cloudStatus().kind === "saved", "status skulle være lagret");
  });

  await test("Kobling: spill på nett + ikke noe lokalt → spillet fra nettet", async () => {
    const f = fresh();
    await login(f);
    const cloud = newGame(2);
    cloud.minute = 1440 * 40;
    await linkOnLogin(cloud);
    const d = await linkOnLogin(null);
    assert(d.kind === "cloud" && d.cloud.minute === 1440 * 40, `fikk ${d.kind}`);
  });

  await test("Kobling uten husket versjon (eldre app): begge på samme konto → det som har kommet lengst vinner", async () => {
    const f = fresh();
    await login(f);
    const older = newGame(3);
    older.minute = 1440 * 10;
    await linkOnLogin(older);
    store.delete("stalverk-sky-v1");
    const newer = newGame(3);
    newer.minute = 1440 * 20;
    newer.owner = "u-a@test";
    let d = await linkOnLogin(newer);
    assert(d.kind === "uploaded" && f.saves.get("u-a@test")?.minute === 1440 * 20, "det nyeste lokale skulle opp");
    store.delete("stalverk-sky-v1");
    const behind = newGame(3);
    behind.minute = 1440 * 5;
    behind.owner = "u-a@test";
    d = await linkOnLogin(behind);
    assert(d.kind === "cloud" && d.cloud.minute === 1440 * 20, "det nyeste på nett skulle ned");
  });

  await test("To nettlesere (B-140): den som åpnes igjen, får det som ble gjort i den andre", async () => {
    const f = fresh();
    await login(f);
    let now = 5_000_000;
    setClock(() => now);
    // Nettleser A lagrer dag 10
    store.set("stalverk-enhet-v1", "A");
    const a = newGame(30);
    a.minute = 1440 * 10;
    await linkOnLogin(a);
    const browserA = snapshotBrowser();
    // Nettleser B åpnes: henter dag 10, gjør noe og lagrer
    otherBrowser("B");
    const d = await linkOnLogin(null);
    assert(d.kind === "cloud", `B skulle hente, fikk ${d.kind}`);
    const b = d.kind === "cloud" ? d.cloud : newGame();
    b.cash = 777_777;
    b.minute += 60;
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(b);
    await flush();
    assert(f.saves.get("u-a@test")!.device === "B", "B lagret ikke");
    // Tilbake til A etter omstart: B lagret sist og har kommet lengst → nettet vinner. (Har A kommet lengst, får
    // spilleren velge, se testen for spill mens man var logget ut, B-148)
    switchTo(browserA);
    a.minute = 1440 * 10 + 30;
    const d2 = await linkOnLogin(a);
    assert(d2.kind === "cloud" && d2.cloud.cash === 777_777, `A skulle hente B sitt spill, fikk ${d2.kind}`);
    setClock(() => Date.now());
  });

  await test("Spilt videre mens man var logget ut (B-148): framgangen blir med, eller spilleren velger", async () => {
    const f = fresh();
    await login(f);
    store.set("stalverk-enhet-v1", "A");
    const a = newGame(40);
    a.minute = 1440 * 10;
    await linkOnLogin(a);
    const browserA = snapshotBrowser();
    // Logget ut på A, spiller videre til dag 20, logger inn igjen: ingen andre har lagret → dag 20 lastes opp
    a.minute = 1440 * 20;
    let d = await linkOnLogin(a);
    assert(d.kind === "uploaded" && f.saves.get("u-a@test")?.minute === 1440 * 20, `framgangen ble borte: ${d.kind}`);
    // Nå lagrer B dag 22, mens A (logget ut) kommer til dag 30: begge har spilt videre, A lengst → spilleren velger
    otherBrowser("B");
    const fromCloud = await linkOnLogin(null);
    const b = fromCloud.kind === "cloud" ? fromCloud.cloud : newGame();
    b.minute = 1440 * 22;
    await keepLocal(b);
    switchTo(browserA);
    a.minute = 1440 * 30;
    d = await linkOnLogin(a);
    assert(d.kind === "choose", `skulle få velge, fikk ${d.kind}`);
    // Har B kommet lengst, hentes B sitt spill som før
    a.minute = 1440 * 21;
    d = await linkOnLogin(a);
    assert(d.kind === "cloud" && d.cloud.minute === 1440 * 22, `skulle hente B, fikk ${d.kind}`);
  });

  await test("En venns spill i nettleseren blir ikke ditt når du logger inn der (B-148)", async () => {
    const f = fresh();
    await login(f);
    // Vennen har kommet langt og logget ut; spillet i nettleseren tilhører vennens konto
    const friend = newGame(41);
    friend.minute = 1440 * 300;
    friend.cash = 9_000_000_000;
    friend.owner = "u-venn";
    const d = await linkOnLogin(friend);
    assert(d.kind === "none", `vennens spill skulle ikke kobles, fikk ${d.kind}`);
    friend.minute += 60;
    onLocalSave(friend, true);
    await flush();
    assert(
      !f.saves.has("u-a@test") && !f.snapshots.get("u-a@test")?.length,
      "vennens spill ble lastet opp på din konto",
    );
  });

  await test("To nettlesere åpne samtidig (B-140): den eldre får ikke lagre over, og henter det nyeste", async () => {
    const f = fresh();
    await login(f);
    let now = 6_000_000;
    setClock(() => now);
    store.set("stalverk-enhet-v1", "A");
    const a = newGame(32);
    a.minute = 1440 * 10;
    await linkOnLogin(a);
    // Den andre nettleseren (B) lagrer mens A står åpen
    const other = (cash: number, device: string) => {
      const cur = f.saves.get("u-a@test")!;
      f.saves.set("u-a@test", {
        ...cur,
        state: { ...(cur.state as object), cash },
        rev: cur.rev + 1,
        device,
      });
    };
    other(222_222, "B");
    // A prøver å lagre: avvises, spillet på nett er urørt
    a.cash = 1;
    a.minute += 60;
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(a);
    await flush();
    assert(cloudStatus().kind === "conflict", `status ${cloudStatus().kind}`);
    assert((f.saves.get("u-a@test")!.state as { cash: number }).cash === 222_222, "A skrev over B");
    // A henter det nyeste
    const pulled = await pullIfNewer();
    assert(pulled?.cash === 222_222 && cloudStatus().kind === "saved", "A hentet ikke det nyeste");
    // Etter hentingen kan A lagre igjen
    pulled!.cash = 333_333;
    pulled!.minute += 60;
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(pulled!);
    await flush();
    assert((f.saves.get("u-a@test")!.state as { cash: number }).cash === 333_333, "A fikk ikke lagre etter hentingen");
    // Egen lagring hentes ikke på nytt, heller ikke når svaret ikke kom fram (appen lagt bort)
    assert((await pullIfNewer()) === null, "hentet sitt eget spill");
    other(333_333, "A");
    assert((await pullIfNewer()) === null, "hentet sin egen lagring uten svar");
    pulled!.minute += 60;
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(pulled!);
    await flush();
    assert(cloudStatus().kind === "saved", `kunne ikke lagre etter egen lagring uten svar: ${cloudStatus().kind}`);
    setClock(() => Date.now());
  });

  await test("Kobling: begge på samme konto, samme nettleser og ingen andre har lagret → spillet her vinner", async () => {
    const f = fresh();
    await login(f);
    const old = newGame(33);
    old.minute = 1440 * 50;
    await linkOnLogin(old);
    // Et nytt spill (f.eks. sesongen) i samme nettleser: lastes opp selv om det har kortere spilltid
    const season = newGame(34);
    season.owner = "u-a@test";
    season.season = 1;
    const d = await linkOnLogin(season);
    assert(
      d.kind === "uploaded" && f.saves.get("u-a@test")!.minute === Math.floor(season.minute),
      `fikk ${d.kind}, minutt ${f.saves.get("u-a@test")!.minute}`,
    );
  });

  await test("Gammel kopi (B-259): et spill fra dag 471 lastes ikke opp over dag 2 169 ved ny innlogging", async () => {
    const f = fresh();
    await login(f);
    store.set("stalverk-enhet-v1", "mobil");
    const g = newGame(259);
    g.minute = 1440 * 470;
    await linkOnLogin(g);
    // En kopi av spillet blir liggende (en annen fane eller en gammel utgave i minnet)
    const old = JSON.parse(JSON.stringify(g)) as GameState;
    // Spilleren spiller videre til dag 2 169 på samme enhet
    g.minute = 1440 * 2168;
    await uploadSave(g);
    const saved = f.saves.get("u-a@test")!;
    assert(saved.minute === 1440 * 2168 && saved.device === "mobil", "dag 2 169 ble ikke lagret");
    // Logget ut og inn igjen der den gamle kopien står: samme enhet og samme husket versjon som spillet på nett
    resetCloud();
    const d = await linkOnLogin(old);
    assert(d.kind === "cloud" && d.cloud.minute === 1440 * 2168, `skulle hente dag 2 169, fikk ${d.kind}`);
    assert(f.saves.get("u-a@test")!.minute === 1440 * 2168, "den gamle kopien ble lastet opp");
    // Heller ikke en vanlig lagring slipper den gamle kopien gjennom
    let refused = false;
    try {
      await uploadSave(old);
    } catch (e) {
      refused = e instanceof SaveConflictError;
    }
    assert(refused && f.saves.get("u-a@test")!.minute === 1440 * 2168, "vanlig lagring av gammel kopi");
    // Et nytt spill (ny id) kan fortsatt erstatte spillet på nett, som før
    const fresh2 = newGame(260);
    fresh2.owner = "u-a@test";
    assert(!staleCopy(fresh2, g), "et nytt spill regnet som gammel kopi");
    // Eldre spill uten id: samme sesong = samme spill
    const a = { minute: 1440 * 10, season: 1 } as GameState;
    const b = { minute: 1440 * 100, season: 1 } as GameState;
    assert(staleCopy(a, b) && !staleCopy(a, { ...b, season: 2 }), "eldre spill uten id");
    // Spilleren kan likevel velge den gamle kopien selv
    await keepLocal(old);
    assert(f.saves.get("u-a@test")!.minute === 1440 * 470, "valget «herfra» ble stoppet");
  });

  await test("Serveren har endret spillet (B-211): det gamle spillet på enheten kan ikke velges eller lastes opp", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(35);
    g.minute = 1440 * 40;
    await linkOnLogin(g);
    // Serveren endrer spillet på nett (som økonomireformen): mindre penger og serverEdit 1
    const row = f.saves.get("u-a@test")!;
    row.state = { ...(row.state as object), cash: 11, serverEdit: 1 };
    row.rev += 1;
    row.device = "server";
    // Enheten har spilt videre på det gamle spillet
    g.minute += 1440;
    g.cash = 8_000_000_000_000;
    const d = await linkOnLogin(g);
    assert(d.kind === "cloud", `skulle ta spillet fra nett, fikk ${d.kind}`);
    // Et gammelt spill slipper heller ikke gjennom en vanlig lagring
    const stale = { ...g, serverEdit: 0 } as GameState;
    let refused = false;
    try {
      await uploadSave(stale);
    } catch {
      refused = true;
    }
    assert(refused && (f.saves.get("u-a@test")!.state as { cash: number }).cash === 11, "det gamle spillet ble lagret");
  });

  await test("Kobling: spill på nett + lokalt uten konto → spilleren velger; en annen kontos spill overses", async () => {
    const f = fresh();
    await login(f);
    const cloud = newGame(4);
    cloud.minute = 1440 * 30;
    await linkOnLogin(cloud);
    const local = newGame(5);
    local.minute = 1440 * 3;
    const d = await linkOnLogin(local);
    assert(d.kind === "choose", `fikk ${d.kind}`);
    await keepLocal(local);
    assert(
      f.saves.get("u-a@test")?.minute === 1440 * 3 && local.owner === "u-a@test",
      "valget «herfra» lastet ikke opp",
    );
    const foreign = newGame(6);
    foreign.owner = "u-annen";
    const d2 = await linkOnLogin(foreign);
    assert(d2.kind === "cloud", `en annen kontos spill skulle overses, fikk ${d2.kind}`);
    assert(foreign.owner === "u-annen", "eieren skulle ikke endres");
  });

  await test("Lagring følger etter den lokale, høyst én gang i minuttet, og venter uten nett", async () => {
    const f = fresh();
    await login(f);
    let now = 1_000_000;
    setClock(() => now);
    const g = newGame(7);
    await linkOnLogin(g);
    const before = f.calls.filter((c) => c.startsWith("POST /rest/v1/rpc/save_game")).length;
    g.minute += 60;
    onLocalSave(g);
    await new Promise((r) => setTimeout(r, 0));
    assert(
      f.calls.filter((c) => c.startsWith("POST /rest/v1/rpc/save_game")).length === before,
      "lastet opp for tidlig",
    );
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(g);
    await new Promise((r) => setTimeout(r, 0));
    await flush();
    assert(f.calls.filter((c) => c.startsWith("POST /rest/v1/rpc/save_game")).length === before + 1, "lastet ikke opp");
    // Uten nett: status «offline», og det prøves igjen senere
    f.offline = true;
    now += UPLOAD_INTERVAL_MS;
    g.minute += 60;
    onLocalSave(g);
    await new Promise((r) => setTimeout(r, 0));
    await flush();
    assert(cloudStatus().kind === "offline", `status ${cloudStatus().kind}`);
    f.offline = false;
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(g);
    await new Promise((r) => setTimeout(r, 0));
    await flush();
    assert(cloudStatus().kind === "saved", `status etter nett tilbake: ${cloudStatus().kind}`);
    // Et spill som tilhører en annen konto, lastes aldri opp
    const foreign = newGame(8);
    foreign.owner = "u-annen";
    now += UPLOAD_INTERVAL_MS;
    const n = f.calls.length;
    onLocalSave(foreign);
    await flush();
    assert(f.calls.length === n, "en annen kontos spill ble lastet opp");
    setClock(() => Date.now());
  });

  await test("Tidslinja får dag, kasse, konsernverdi, nivå og omdømme", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(10);
    g.reputation = 42.34;
    await linkOnLogin(g);
    const s = f.snapshots.get("u-a@test")?.[0];
    assert(s && s.day === 1 && s.stage === 0 && s.reputation === 42.3 && s.equity > 0, `snapshot ${JSON.stringify(s)}`);
  });

  await test("Tidslinja (B-162): tallene er fra samme øyeblikk som dagen, selv om spillet går videre under lagringen", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(11);
    g.totals.producedT = 1000;
    // Spillet går tre døgn og 99 000 t videre mens lagringen venter på svar
    f.onSaveGame = () => {
      g.minute += 3 * 1440;
      g.totals.producedT += 99_000;
      g.cash += 1e9;
    };
    await linkOnLogin(g);
    const s = f.snapshots.get("u-a@test")?.[0];
    assert(s && s.day === 1 && s.produced_t === 1000, `snapshot ${JSON.stringify(s)}`);
  });

  await test("Lagring som henger (B-165): gir opp etter tidsgrensen, og neste lagring går", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(12);
    await linkOnLogin(g);
    setRequestTimeout(50);
    try {
      f.hangSave = true;
      g.minute += 60;
      onLocalSave(g, true);
      await flush();
      assert(cloudStatus().kind === "offline", `status ${cloudStatus().kind}`);
      f.hangSave = false;
      g.minute += 60;
      await flush();
      assert(cloudStatus().kind === "saved", `status etter ny lagring ${cloudStatus().kind}`);
    } finally {
      setRequestTimeout(30_000);
    }
  });

  await test("Kallenavn: for kort, tatt, og så OK; topplista viser meg", async () => {
    const f = fresh();
    await login(f);
    f.nicknames.set("u-annen", "Smelteren");
    let msg = "";
    try {
      await setNickname("ab");
    } catch (e) {
      msg = (e as Error).message;
    }
    assert(msg.includes("3–20"), `for kort: «${msg}»`);
    try {
      await setNickname("smelteren");
    } catch (e) {
      msg = (e as Error).message;
    }
    assert(msg.includes("tatt"), `tatt: «${msg}»`);
    assert((await setNickname("  Stålkongen ")) === "Stålkongen", "kallenavnet ble ikke trimmet og lagret");
    assert((await fetchProfile())?.nickname === "Stålkongen", "profilen har ikke kallenavnet");
    const g = newGame(11);
    g.cash = 500_000;
    await linkOnLogin(g);
    const rows = await fetchLeaderboard("verdi");
    assert(rows.length === 1 && rows[0].is_me && rows[0].nickname === "Stålkongen", `rader ${JSON.stringify(rows)}`);
    assert(typeof rows[0].value === "number" && rows[0].value >= 500_000, "verdien er ikke et tall");
    assert((await fetchMyRank("verdi")) === 1, "min plass");
    assert(rows[0].badges.join() === "reform", `merkene på topplista (B-299): ${JSON.stringify(rows[0].badges)}`);
  });

  await test("Sesong og hendelser hentes, og tidslinja får sesongen (B-129)", async () => {
    const f = fresh();
    await login(f);
    const s = await fetchSeasonStatus();
    assert(s.current?.id === 1 && s.played_previous, `status ${JSON.stringify(s)}`);
    assert(s.era?.name === "Grunnleggeræraen", `æraen mangler (B-182): ${JSON.stringify(s.era)}`);
    const ev = await fetchActiveEvents();
    assert(
      ev.length === 1 && ev[0].power === 1.5 && ev[0].until === "2026-10-01T00:00:00Z",
      `hendelser ${JSON.stringify(ev)}`,
    );
    const g = newGame(12);
    g.season = 1;
    await linkOnLogin(g);
    const snap = f.snapshots.get("u-a@test")?.[0] as { season_id?: number } | undefined;
    assert(snap?.season_id === 1, "tidslinja mangler sesongen");
    // Sesongens vri (B-152) og tonn i tidslinja
    assert(s.current?.twist?.scrap === 1.15, `vrien ${JSON.stringify(s.current?.twist)}`);
    assert(typeof f.snapshots.get("u-a@test")?.[0]?.produced_t === "number", "tidslinja mangler tonn");
  });

  await test("Ukens utfordring: status, lista og kista som bare kan åpnes én gang (B-152)", async () => {
    const f = fresh();
    assert((await fetchWeeklyStatus()) === null, "status uten innlogging");
    await login(f);
    f.chestFp = 75;
    const s = await fetchWeeklyStatus();
    assert(
      s?.kind === "tonn" && s.league === "solv" && s.plass === 2 && s.value === 12345 && s.medals.silver === 2,
      `status ${JSON.stringify(s)}`,
    );
    assert(s?.chest?.fp === 75 && weekDaysLeft(s, Date.parse("2026-09-26T12:00:00Z")) === 2, "kiste eller dager");
    const rows = await fetchWeeklyBoard("solv");
    assert(rows[0].value === 5000 && rows[0].gold === 3 && !rows[0].isMe, `lista ${JSON.stringify(rows)}`);
    assert((await claimWeekChest()) === 75 && (await claimWeekChest()) === 0, "kista ga fagpoeng to ganger");
    // Bare topp 3 får kiste (B-155)
    assert(chestFp(1) === 100 && chestFp(3) === 50 && chestFp(4) === 0, "kiste utenfor topp 3");
  });

  await test("Ingenting lastes opp før spillet er avklart mot kontoen, heller ikke mens man velger (B-138)", async () => {
    const f = fresh();
    await login(f);
    const cloud = newGame(20);
    cloud.minute = 1440 * 300;
    await linkOnLogin(cloud);
    const cloudMinute = f.saves.get("u-a@test")!.minute;
    // Ny nettleser: et lokalt spill uten konto, og økta finnes før koblingen er ferdig
    resetCloud();
    const local = newGame(21);
    local.season = 1;
    onLocalSave(local);
    await flush();
    assert(f.saves.get("u-a@test")!.minute === cloudMinute, "lastet opp før koblingen");
    const d = await linkOnLogin(local);
    assert(d.kind === "choose" && !isReconciled(), "skulle vente på valget");
    onLocalSave(local);
    await flush();
    assert(f.saves.get("u-a@test")!.minute === cloudMinute, "lastet opp mens spilleren velger");
    assert(!(f.snapshots.get("u-a@test") ?? []).some((s) => s.season_id === 1), "sesongrad fra spillet som venter");
    // «Fra nettet»: avklart, og spillet fra nettet lastes opp videre
    markReconciled();
    assert(isReconciled(), "skulle være avklart");
  });

  await test("Samme konto, eldre kopi her: lastes ikke opp over et spill som har kommet lenger (B-138)", async () => {
    const f = fresh();
    await login(f);
    const ahead = newGame(22);
    ahead.minute = 1440 * 300;
    await linkOnLogin(ahead);
    otherBrowser("eldre");
    const old = newGame(22);
    old.minute = 1440 * 100;
    old.owner = "u-a@test";
    onLocalSave(old);
    await flush();
    assert(f.saves.get("u-a@test")!.minute === 1440 * 300, "den eldre kopien overskrev før koblingen");
    const d = await linkOnLogin(old);
    assert(d.kind === "cloud" && isReconciled(), `fikk ${d.kind}`);
  });

  await test("Etter en handling lastes spillet opp om litt, selv om det er kort tid siden sist (B-141)", async () => {
    const f = fresh();
    await login(f);
    let now = 9_000_000;
    setClock(() => now);
    const g = newGame(40);
    await linkOnLogin(g);
    const count = () => f.calls.filter((c) => c.startsWith("POST /rest/v1/rpc/save_game")).length;
    const before = count();
    g.cash = 42;
    onLocalSave(g, true);
    onLocalSave(g, true);
    assert(count() === before, "skulle vente litt, så flere handlinger samles");
    await new Promise((r) => setTimeout(r, SOON_MS + 50));
    await flush();
    assert(count() === before + 1, `lastet opp ${count() - before} ganger`);
    assert((f.saves.get("u-a@test")!.state as { cash: number }).cash === 42, "handlingen kom ikke med");
    setClock(() => Date.now());
  });

  await test("Stort spill sendes uten keepalive når appen legges bort (grensen er 64 kB, B-141)", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(41);
    await linkOnLogin(g);
    const small = f.calls.length;
    g.minute += 60;
    onLocalSave(g);
    await flush(true);
    const i1 = f.calls.findIndex((c, i) => i >= small && c.includes("save_game"));
    // Stort: fyll loggen til spillet er over grensen
    for (let i = 0; i < 400; i++) g.log.push({ id: 10_000 + i, min: 0, text: "x".repeat(200), kind: "info" });
    assert(JSON.stringify(g).length > KEEPALIVE_MAX, "testspillet er ikke stort nok");
    const big = f.calls.length;
    g.minute += 60;
    onLocalSave(g);
    setClock(() => Date.now() + UPLOAD_INTERVAL_MS * 2);
    onLocalSave(g);
    await flush(true);
    const i2 = f.calls.findIndex((c, i) => i >= big && c.includes("save_game"));
    assert(i1 >= 0 && f.keepalive[i1], "lite spill skulle sendes med keepalive");
    assert(i2 >= 0 && !f.keepalive[i2], "stort spill skulle sendes uten keepalive");
    setClock(() => Date.now());
  });

  await test("En enhet som bare står åpen, laster ikke opp og tar ikke over (B-143)", async () => {
    const f = fresh();
    await login(f);
    let now = 12_000_000;
    setClock(() => now);
    const g = newGame(42);
    await linkOnLogin(g);
    const count = () => f.calls.filter((c) => c.startsWith("POST /rest/v1/rpc/save_game")).length;
    const before = count();
    // På pause: samme spillminutt, ingen handling – ingenting lastes opp, selv om det er lenge siden
    now += UPLOAD_INTERVAL_MS * 4;
    onLocalSave(g);
    await flush();
    assert(count() === before, "en enhet på pause lastet opp");
    // Tida går (spillet spilles her): lastes opp
    g.minute += 30;
    onLocalSave(g);
    await flush();
    assert(count() === before + 1, "spill som går, ble ikke lastet opp");
    // En handling på pause (samme minutt) lastes opp
    g.cash += 1;
    onLocalSave(g, true);
    await new Promise((r) => setTimeout(r, SOON_MS + 50));
    await flush();
    assert(count() === before + 2, "en handling ble ikke lastet opp");
    // Legges appen bort uten endring: ingenting sendes; med endring: sendes med én gang
    await leaving(g);
    assert(count() === before + 2, "sendte uten endring da appen ble lagt bort");
    g.minute += 5;
    await leaving(g);
    assert(count() === before + 3, "det som var spilt, ble ikke sendt da appen ble lagt bort");
    setClock(() => Date.now());
  });

  await test("Sesongresultater: egen historikk, og beskjeden om resultatet huskes per konto (B-143)", async () => {
    const f = fresh();
    assert((await fetchSeasonHistory()).length === 0, "uten innlogging skal historikken være tom");
    await login(f);
    const h = await fetchSeasonHistory();
    assert(
      h.length === 1 &&
        h[0].plass === 3 &&
        h[0].players === 12 &&
        h[0].equity === 1_200_000_000 &&
        h[0].name === "Sesong 1",
      `historikk ${JSON.stringify(h)}`,
    );
    assert(resultSeen("u-a@test") === 0, "ingen beskjed sett ennå");
    markResultSeen("u-a@test", 1);
    assert(resultSeen("u-a@test") === 1 && resultSeen("u-b@test") === 0, "beskjeden skal huskes per konto");
    const rows = await fetchLeaderboard("verdi");
    assert(
      rows.every((r) => r.honor === null),
      "honor skal være null når serveren ikke sender den",
    );
  });

  await test("Ikke logget inn: ingenting sendes", async () => {
    const f = fresh();
    const g = newGame(9);
    onLocalSave(g);
    await flush();
    assert(f.calls.length === 0, "sendte noe uten innlogging");
    assert(cloudStatus().kind === "off", "status skulle være av");
  });

  await test("Konsernkassa (B-183): serveren trekker kassa, appen gjør det samme, og døgngrensen holder", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(13);
    g.stage = 4;
    g.konsern.unlocked = true;
    g.cash = 5_000_000_000;
    await linkOnLogin(g);
    const r = await depositToTreasury(g, 60_000_000);
    assert(r.ok && r.amount === 60_000_000 && r.balance === 60_000_000, `svar ${JSON.stringify(r)}`);
    assert(g.cash === 4_940_000_000 && g.treasuryOut === 60_000_000, `spillet: ${g.cash} / ${g.treasuryOut}`);
    const server = f.saves.get("u-a@test")!;
    assert((server.state as { cash: number }).cash === 4_940_000_000, "kassa på nett er ikke trukket");
    // Neste lagring bygger på versjonen serveren laget, så den avvises ikke
    await uploadSave(g);
    assert(f.saves.get("u-a@test")!.device !== "server", "lagringen etter overføringen ble avvist");
    const again = await depositToTreasury(g, 60_000_000);
    assert(!again.ok && again.reason === "grense" && again.left === 40_000_000, `grensen: ${JSON.stringify(again)}`);
    assert(g.cash === 4_940_000_000, "kassa endret seg selv om overføringen ble avvist");
    assert(DEPOSIT_REFUSAL_TEXT.grense.length > 0, "ingen forklaring");
    const st = await fetchTreasury();
    assert(
      st.balance === 60_000_000 && st.left === 40_000_000 && st.limit === 100_000_000,
      `status ${JSON.stringify(st)}`,
    );
    // Uten konsern sier serveren nei
    const h = newGame(14);
    await uploadSave(h);
    const no = await depositToTreasury(h, 1_000);
    assert(!no.ok && no.reason === "konsern", `uten konsern: ${JSON.stringify(no)}`);
  });

  await test("Skraplageret (B-189): status, bud fra konsernkassa, endre og trekke budet", async () => {
    const f = fresh();
    await login(f);
    const g = newGame(15);
    g.stage = 4;
    g.konsern.unlocked = true;
    g.cash = 5_000_000_000;
    await linkOnLogin(g);
    let applied = 0;
    const d = await depositToTreasury(g, 50_000_000, (a) => (applied += a));
    assert(d.ok && applied === 50_000_000, `innskudd ${JSON.stringify(d)}, brukt ${applied}`);
    const w = await fetchWorldStatus();
    const c = w.companies[0];
    assert(c.name === "Skraplageret" && c.tender?.id === 7 && c.tender.maxBid === 923_000_000, JSON.stringify(c));
    assert(c.tender?.bidders.length === 1 && c.tender.bidders[0] === "Grane", "budgiverne før eget bud");
    assert(w.treasury.balance === 50_000_000 && c.estimatePerDay === 65_902_630, JSON.stringify(w.treasury));
    // Konsernverdien som på topplista (B-320, B-322): kassa + 60 × (utbytte + bidrag) − lån
    assert(
      Math.abs(konsernValueOf(w, 1e8) - (50_000_000 + 60 * (41_465_454.55 + 38_441_575) - 1e8)) < 1,
      `konsernverdi ${konsernValueOf(w, 1e8)}`,
    );
    // Konsernbidraget følger med i world_status (B-318)
    assert(
      w.contribution.perDay === 38_441_575 &&
        w.contribution.margin === 3000 &&
        w.contribution.normalT === 32_839 &&
        w.contribution.activity === 1 &&
        w.contribution.yesterday === 38_441_575,
      JSON.stringify(w.contribution),
    );
    // Utbyttet fra datterverkene følger med i world_status (B-304)
    assert(
      Math.abs(w.dividend.perDay - 41_465_454.55) < 1 &&
        w.dividend.yesterday === 41_465_455 &&
        w.dividend.total === 82_930_910,
      "utbyttet leses ikke fra world_status",
    );
    assert((await placeBid(7, 500)).ok === false, "bud under minste ble godtatt");
    const over = await placeBid(7, 60_000_000);
    assert(
      !over.ok && over.reason === "kasse" && BID_REFUSAL_TEXT.kasse.length > 0,
      `mer enn saldo: ${JSON.stringify(over)}`,
    );
    const b = await placeBid(7, 30_000_000);
    assert(b.ok && b.balance === 20_000_000, `bud ${JSON.stringify(b)}`);
    assert((await fetchWorldStatus()).companies[0].tender?.myBid === 30_000_000, "eget bud vises ikke");
    assert(
      (await fetchWorldStatus()).companies[0].tender?.bidders.join(",") === "Grane,Testspiller",
      "ser ikke hvem som har bydd",
    );
    const up = await placeBid(7, 45_000_000);
    assert(up.ok && up.balance === 5_000_000, `høyere bud trekker bare forskjellen: ${JSON.stringify(up)}`);
    const off = await placeBid(7, 0);
    assert(off.ok && off.balance === 50_000_000, `trukket bud gir pengene tilbake: ${JSON.stringify(off)}`);
    assert(timeLeft("2026-09-29T01:00:00Z", Date.parse("2026-09-27T18:00:00Z")) === "31 t", "tid igjen");
    assert(timeLeft("2026-09-29T01:00:00Z", Date.parse("2026-09-29T00:15:00Z")) === "45 min", "minutter igjen");
  });

  await test("Gjestekonto (B-212): lagres som gjest fra dag 2, får ikke noe mer, og kontoen tar over", async () => {
    const f = fresh();
    let now = 1_000_000;
    setGuestClock(() => now);
    const g = newGame(41);
    g.minute = 1440 * 1;
    await onGuestSave(g);
    assert(!f.calls.some((c) => c.includes("/auth/v1/signup")), "gjesten skal ikke lages før dag 2");
    g.minute = 1440 * 3;
    onLocalSave(g);
    await onGuestSave(g);
    assert(isGuest() && f.saves.get("g-1")?.minute === 1440 * 3, "gjesten lagret ikke spillet");
    assert(g.owner === null && getSession() === null, "gjesten skal ikke være innlogging eller eier");
    // Høyst én gang i minuttet
    g.minute += 60;
    await onGuestSave(g);
    assert(f.saves.get("g-1")?.minute === 1440 * 3, "gjesten lagret for ofte");
    now += 61_000;
    await onGuestSave(g);
    assert(f.saves.get("g-1")?.minute === 1440 * 3 + 60, "gjesten lagret ikke etter et minutt");
    // Gjesten får ikke hente daglig belønning
    let refused = false;
    try {
      const { restAs } = await import("./supabase");
      await restAs(JSON.parse(store.get("stalverk-gjest-v1")!).session.access_token, "rpc/daily_status", {
        method: "POST",
        body: {},
      });
    } catch (e) {
      refused = e instanceof NetError && e.status === 403;
    }
    assert(refused, "gjesten skulle nektes");
    // Oppretter konto: kontoen tar over gjesten, og spillet kobles til kontoen
    await signUp("ny@test", "hemmelig");
    await verifyCode("ny@test", "123456", "signup");
    const d = await linkOnLogin(g);
    assert(d.kind === "uploaded", `fikk ${d.kind}`);
    assert(
      f.calls.some((c) => c.includes("rpc/adopt_guest")),
      "kontoen tok ikke over gjesten",
    );
    assert(!f.guests.has("g-1") && !f.saves.has("g-1") && !isGuest(), "gjesten skulle være borte");
    assert(f.saves.get("u-ny@test")?.minute === g.minute && g.owner === "u-ny@test", "spillet ble ikke koblet til");
    setGuestClock(() => Date.now());
  });

  await test("Gjestekonto (B-212): avslått i Supabase prøves ikke igjen før et døgn; et kontospill blir aldri gjest", async () => {
    const f = fresh();
    f.guestsOff = true;
    const g = newGame(42);
    g.minute = 1440 * 5;
    await onGuestSave(g, true);
    await onGuestSave(g, true);
    const tries = f.calls.filter((c) => c.includes("/auth/v1/signup")).length;
    assert(tries === 1 && !isGuest(), `skulle prøve én gang, prøvde ${tries}`);
    const f2 = fresh();
    const owned = newGame(43);
    owned.minute = 1440 * 5;
    owned.owner = "u-a@test";
    await onGuestSave(owned, true);
    assert(!f2.calls.length, "et spill som tilhører en konto, skal ikke bli gjest");
  });

  await test("Brukernavn ved ny konto (B-214): regelen i appen og ledig-sjekken uten innlogging", async () => {
    const f = fresh();
    assert(nicknameProblem("ab") !== null && nicknameProblem("a".repeat(21)) !== null, "lengden skulle sjekkes");
    assert(nicknameProblem("Ola<script>") !== null, "ulovlige tegn skulle avvises");
    assert(nicknameProblem(" Stålmester 2 ") === null, "et vanlig navn skulle godtas");
    f.nicknames.set("u-annen", "Grane");
    assert(!(await nicknameAvailable("grane")) && (await nicknameAvailable("Nyspiller")), "ledig-sjekken");
    assert(getSession() === null, "sjekken skal gå uten innlogging");
  });

  await test("NetError uten nett merkes som offline", async () => {
    const f = fresh();
    f.offline = true;
    let err: unknown;
    try {
      await signIn("a@test", "x");
    } catch (e) {
      err = e;
    }
    assert(err instanceof NetError && err.offline, "skulle være offline-feil");
  });

  await test("Varsel om avgjort anbud (B-237): til den som bydde, én gang per anbud", async () => {
    const g = newGame(237);
    const now = Date.parse("2026-10-01T12:00:00Z");
    const base = {
      closedAt: "2026-09-30T09:00:00Z",
      status: "avgjort" as const,
      winningBid: 400e6,
      bidders: 3,
      tie: false,
    };
    const lost = { ...base, id: 5, winner: "Grane", won: false, myBid: 120e6 };
    const before = g.log.length;
    assert(applyTenderResult(g, "Skraplageret", lost, now), "ga ikke varsel til den som tapte");
    assert(g.log.length === before + 1 && /Grane vant/.test(g.log.at(-1)!.text), "feil tekst til den som tapte");
    assert(/tilbake i konsernkassa/.test(g.log.at(-1)!.text), "sa ikke at budet er tilbake");
    assert(!applyTenderResult(g, "Skraplageret", lost, now), "ga samme varsel to ganger");
    const won = { ...base, id: 6, winner: "Tuster", won: true, myBid: 400e6 };
    assert(
      applyTenderResult(g, "Skraplageret", won, now) && /Du vant/.test(g.log.at(-1)!.text),
      "vinneren fikk ikke varsel",
    );
    // Den som ikke bydde, får vite hvem som eier selskapet nå – uten beløp (B-258)
    const notMine = { ...base, id: 7, winner: "Grane", won: false, myBid: null };
    assert(applyTenderResult(g, "Skraplageret", notMine, now) && g.tenderSeen === 7, "ingen nyhet uten bud");
    assert(/Skraplageret har fått ny eier: Grane/.test(g.log.at(-1)!.text), `nyheten: ${g.log.at(-1)!.text}`);
    assert(!/\bkr\b|mill\.|mrd\./.test(g.log.at(-1)!.text), "beløp i nyheten til dem som ikke bød");
    // Et anbud uten bud gir ingen nyhet
    const none = {
      ...base,
      id: 9,
      status: "ingen bud" as const,
      winner: null,
      won: false,
      winningBid: null,
      myBid: null,
    };
    assert(!applyTenderResult(g, "Skraplageret", none, now) && g.tenderSeen === 9, "nyhet om anbud uten bud");
    g.tenderSeen = 7;
    // Et gammelt anbud (over 14 dager) gir ikke varsel
    const old = { ...lost, id: 8, closedAt: "2026-09-01T09:00:00Z" };
    assert(!applyTenderResult(g, "Skraplageret", old, now), "varsel om gammelt anbud");
  });

  await test("Inntekt fra selskapet (B-258): beskjed til eieren én gang per dag, og når første inntekt kommer", async () => {
    const g = newGame(258);
    const now = Date.parse("2026-09-30T08:00:00Z");
    assert(yesterdayUtc(now) === "2026-09-29", `i går: ${yesterdayUtc(now)}`);
    assert(nextPayout(Date.parse("2026-09-29T01:40:00Z")) === Date.parse("2026-09-30T00:00:00Z"), "neste utbetaling");
    const mine = { id: 4, name: "Skraplageret", mine: true, incomeYesterday: 42e6 };
    assert(applyCompanyIncome(g, [mine], now) === 1 && /tjente 42 mill/.test(g.log.at(-1)!.text), g.log.at(-1)!.text);
    assert(applyCompanyIncome(g, [mine], now) === 0, "samme beskjed to ganger");
    assert(applyCompanyIncome(g, [mine], now + 86_400_000) === 1, "ny dag ga ikke beskjed");
    // Ikke eier, eller ingen inntekt: ingen beskjed
    assert(
      applyCompanyIncome(
        g,
        [
          { ...mine, mine: false },
          { ...mine, id: 6, incomeYesterday: 0 },
        ],
        now,
      ) === 0,
      "feil",
    );
    // Gamle lagringer får et tomt minne
    const old = JSON.parse(JSON.stringify(g));
    delete old.companyIncomeSeen;
    assert(JSON.stringify(migrate(old).companyIncomeSeen) === "{}", "migrate");
    // Utbyttet fra datterverkene (B-304): én beskjed per ekte dag, og worldNews sier fra
    const h = newGame(304);
    assert(!worldNews(h, [], now, 0) && worldNews(h, [], now, 5e6), "worldNews ser ikke utbyttet");
    assert(
      applyDividendNews(h, 41_465_455, now) === 1 && /utbytte til konsernkassa/.test(h.log.at(-1)!.text),
      h.log.at(-1)!.text,
    );
    assert(applyDividendNews(h, 41_465_455, now) === 0 && !worldNews(h, [], now, 5e6), "samme beskjed to ganger");
    assert(applyDividendNews(h, 41_465_455, now + 86_400_000) === 1, "ny dag ga ikke beskjed");
    assert(applyDividendNews(h, 0, now + 2 * 86_400_000) === 0, "beskjed uten utbytte");
    // Konsernbidraget (B-318): alene eller sammen med utbyttet, fortsatt én beskjed per dag
    assert(
      applyDividendNews(h, 0, now + 3 * 86_400_000, 38_441_575) === 1 &&
        /^Hovedverket betalte .* i konsernbidrag til konsernkassa i går\.$/.test(h.log.at(-1)!.text),
      h.log.at(-1)!.text,
    );
    assert(
      applyDividendNews(h, 5e6, now + 4 * 86_400_000, 1e7) === 1 &&
        /konsernbidrag og datterverkene .* i utbytte/.test(h.log.at(-1)!.text),
      h.log.at(-1)!.text,
    );
    assert(applyDividendNews(h, 5e6, now + 4 * 86_400_000, 1e7) === 0, "bidraget ga to beskjeder samme dag");
    delete (old as Record<string, unknown>).dividendSeen;
    assert(migrate(old).dividendSeen === null, "migrate dividendSeen");
    // Første utbetaling vises i spillerens egen tid, uten «+0 kr i går»
    assert(/kl\. \d\d:\d\d$/.test(firstPayout(now)), firstPayout(now));
  });

  await test("To selskaper (B-253): slagghåndteringen tolkes, og begge anbudene gir varsel uansett rekkefølge", async () => {
    const g = newGame(253);
    const now = Date.parse("2026-10-20T12:00:00Z");
    const base = { closedAt: "2026-10-19T09:00:00Z", status: "avgjort" as const, bidders: 2, tie: false };
    // Slagghåndteringen har det nyeste anbudet (id 12), men står først i lista
    const companies = [
      {
        name: "Slagghåndteringen",
        lastResult: { ...base, id: 12, winner: "Grane", won: false, winningBid: 90e6, myBid: 50e6 },
      },
      {
        name: "Skraplageret",
        lastResult: { ...base, id: 11, winner: "Tuster", won: true, winningBid: 200e6, myBid: 200e6 },
      },
    ];
    assert(applyTenderResults(g, companies, now) === 2, "fikk ikke varsel om begge anbudene");
    assert(g.tenderSeen === 12, `sist sett ${g.tenderSeen}`);
    assert(/slagghåndteringen/.test(g.log.at(-1)!.text), "feil selskap i varselet");
    assert(applyTenderResults(g, companies, now) === 0, "samme varsler to ganger");
  });

  await test("Mekanisk verksted (B-256): typen tolkes, og spillet sender vedlikeholdet til tidslinja", async () => {
    assert(companyType("verksted") === "verksted" && companyType("slagg") === "slagg", "kjente typer");
    assert(companyType("noe nytt") === "skraplager", "ukjent type");
    assert(/vedlikeholdet/.test(EARNS_FROM.verksted), "hva verkstedet tjener på");
    const f = fresh();
    await login(f);
    const g = newGame(256);
    addCost(g, "vedlikehold", 12_345.4);
    addCost(g, "lonn", 50_000);
    await linkOnLogin(g);
    const s = f.snapshots.get("u-a@test")?.[0];
    assert(s?.maint_kr === 12_345, `vedlikehold i tidslinja ${JSON.stringify(s)}`);
  });

  await test("Serverens klokke styrer byggetida (B-314): Date-headeren gir realNow, telefonens klokke teller ikke", () => {
    resetServerClock();
    const local = Date.now();
    // Telefonen står fem timer foran serveren
    const server = new Date(local - 5 * 3_600_000).toUTCString();
    assert(syncServerClock(server, local), "gyldig Date-header ble avvist");
    assert(Math.abs(serverClockOffset() + 5 * 3_600_000) < 2000, `forskyvningen ble ${serverClockOffset()}`);
    assert(Math.abs(realNow() - (Date.now() - 5 * 3_600_000)) < 2000, "realNow følger ikke serveren");
    assert(!syncServerClock("tull", local) && !syncServerClock(null, local), "ugyldig header skulle ikke telle");
    assert(Math.abs(serverClockOffset() + 5 * 3_600_000) < 2000, "ugyldig header endret forskyvningen");
    resetServerClock();
    assert(Math.abs(realNow() - Date.now()) < 1000, "klokka ble ikke satt tilbake");
  });

  setSaveListener(null);
  if (failed) {
    console.log(`\n${failed} test(er) feilet`);
    process.exitCode = 1;
  } else console.log("\nAlle nettester OK");
};

void main();
