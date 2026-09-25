/**
 * Tester av nettlaget (B-125) uten nett: `fetch` byttes ut med en falsk tjeneste i minnet.
 * Kjøres med `npx tsx src/net/tests.ts` og i `npm test`.
 */
import { newGame } from "../game/engine";
import { setCloudConfig } from "./config";
import { setSaveListener } from "../game/save";
import {
  consumeAuthHash,
  getSession,
  getToken,
  NetError,
  setFetch,
  setSession,
  signIn,
  signUp,
  translateError,
  verifyCode,
} from "./supabase";
import { fetchLeaderboard, fetchMyRank, fetchProfile, setNickname } from "./leaderboard";
import { daysLeft, fetchActiveEvents, fetchSeasonStatus } from "./season";
import {
  cloudStatus,
  flush,
  keepLocal,
  linkOnLogin,
  onLocalSave,
  resetCloud,
  setClock,
  UPLOAD_INTERVAL_MS,
} from "./sync";

declare const process: { exitCode?: number };

// localStorage finnes ikke i Node: en enkel erstatning
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
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
  saves: Map<string, { state: unknown; minute: number; day: number }>;
  snapshots: Map<
    string,
    { day: number; equity: number; stage: number; reputation: number; season_id?: number | null }[]
  >;
  nicknames: Map<string, string>;
  calls: string[];
  offline: boolean;
}
function makeFake(): Fake {
  const f: Fake = {
    users: new Map(),
    saves: new Map(),
    snapshots: new Map(),
    nicknames: new Map(),
    calls: [],
    offline: false,
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
    if (f.offline) throw new TypeError("Failed to fetch");
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
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
      if (body.refresh_token !== "r1") return json(400, { error_description: "Invalid Refresh Token" });
      return json(200, {
        access_token: token("u-a@test"),
        refresh_token: "r2",
        expires_in: 3600,
        user: { id: "u-a@test" },
      });
    }
    const id = who(init);
    if (!id) return json(401, { message: "JWT" });
    if (path.startsWith("/rest/v1/saves")) {
      if (init?.method === "POST") {
        f.saves.set(id, { state: body.state, minute: Number(body.minute), day: Number(body.day) });
        return new Response(null, { status: 201 });
      }
      const s = f.saves.get(id);
      return json(200, s ? [{ state: s.state, minute: s.minute, day: s.day, updated_at: "now" }] : []);
    }
    if (path.startsWith("/rest/v1/snapshots")) {
      const list = f.snapshots.get(id) ?? [];
      list.push({
        day: Number(body.day),
        equity: Number(body.equity),
        stage: Number(body.stage),
        reputation: Number(body.reputation),
        season_id: body.season_id as number | null,
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
          return last ? { nickname: nick, value: String(last.equity), day: last.day, is_me: u === id } : null;
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .sort((a, b) => Number(b.value) - Number(a.value))
        .map((r, i) => ({ plass: i + 1, ...r }));
      return json(200, rows);
    }
    if (path.startsWith("/rest/v1/rpc/my_rank")) return json(200, 1);
    if (path.startsWith("/rest/v1/rpc/season_status"))
      return json(200, {
        current: { id: 1, name: "Sesong 1", starts_at: "2026-09-25T00:00:00Z", ends_at: "2026-10-23T00:00:00Z" },
        played_previous: id === "u-a@test",
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
    if (path.startsWith("/rest/v1/config")) return json(200, [{ value: { cloud: true } }]);
    return json(404, { message: "ukjent" });
  });
  return f;
}

function fresh(): Fake {
  setSession(null);
  resetCloud();
  store.clear();
  return makeFake();
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

  await test("Kobling: begge på samme konto → det som har kommet lengst vinner", async () => {
    const f = fresh();
    await login(f);
    const older = newGame(3);
    older.minute = 1440 * 10;
    await linkOnLogin(older);
    const newer = newGame(3);
    newer.minute = 1440 * 20;
    newer.owner = "u-a@test";
    let d = await linkOnLogin(newer);
    assert(d.kind === "uploaded" && f.saves.get("u-a@test")?.minute === 1440 * 20, "det nyeste lokale skulle opp");
    const behind = newGame(3);
    behind.minute = 1440 * 5;
    behind.owner = "u-a@test";
    d = await linkOnLogin(behind);
    assert(d.kind === "cloud" && d.cloud.minute === 1440 * 20, "det nyeste på nett skulle ned");
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
    const before = f.calls.filter((c) => c.startsWith("POST /rest/v1/saves")).length;
    g.minute += 60;
    onLocalSave(g);
    await new Promise((r) => setTimeout(r, 0));
    assert(f.calls.filter((c) => c.startsWith("POST /rest/v1/saves")).length === before, "lastet opp for tidlig");
    now += UPLOAD_INTERVAL_MS;
    onLocalSave(g);
    await new Promise((r) => setTimeout(r, 0));
    await flush();
    assert(f.calls.filter((c) => c.startsWith("POST /rest/v1/saves")).length === before + 1, "lastet ikke opp");
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
  });

  await test("Sesong og hendelser hentes, og tidslinja får sesongen (B-129)", async () => {
    const f = fresh();
    await login(f);
    const s = await fetchSeasonStatus();
    assert(s.current?.id === 1 && s.played_previous, `status ${JSON.stringify(s)}`);
    assert(daysLeft(s.current!, Date.parse("2026-10-20T12:00:00Z")) === 3, "dager igjen");
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
  });

  await test("Ikke logget inn: ingenting sendes", async () => {
    const f = fresh();
    const g = newGame(9);
    onLocalSave(g);
    await flush();
    assert(f.calls.length === 0, "sendte noe uten innlogging");
    assert(cloudStatus().kind === "off", "status skulle være av");
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

  setSaveListener(null);
  if (failed) {
    console.log(`\n${failed} test(er) feilet`);
    process.exitCode = 1;
  } else console.log("\nAlle nettester OK");
};

void main();
