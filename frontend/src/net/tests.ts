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
  KEEPALIVE_MAX,
  NetError,
  loggedOutByServer,
  rememberPrefs,
  setFetch,
  setRememberPrefs,
  setSession,
  signIn,
  signOut,
  signUp,
  translateError,
  verifyCode,
} from "./supabase";
import { fetchLeaderboard, fetchMyRank, fetchProfile, setNickname } from "./leaderboard";
import { claimAway, fetchDailyStatus } from "./daily";
import {
  daysLeft,
  fetchActiveEvents,
  fetchSeasonHistory,
  fetchSeasonStatus,
  markResultSeen,
  resultSeen,
} from "./season";
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
  setClock,
  SOON_MS,
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
  snapshots: Map<
    string,
    { day: number; equity: number; stage: number; reputation: number; season_id?: number | null }[]
  >;
  nicknames: Map<string, string>;
  calls: string[];
  /** keepalive per kall, samme rekkefølge som `calls` */
  keepalive: boolean[];
  offline: boolean;
  /** Kalles når appen fornyer økta – en annen fane kan fornye samtidig */
  onRefresh: (() => void) | null;
}
function makeFake(): Fake {
  const f: Fake = {
    users: new Map(),
    saves: new Map(),
    snapshots: new Map(),
    nicknames: new Map(),
    calls: [],
    keepalive: [],
    offline: false,
    onRefresh: null,
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
    const id = who(init);
    if (!id) return json(401, { message: "JWT" });
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
    if (path.startsWith("/rest/v1/rpc/season_history"))
      return json(
        200,
        id === "u-a@test"
          ? [{ season_id: 1, name: "Sesong 1", plass: 3, players: 12, equity: "1200000000", day: 180, stage: 4 }]
          : [],
      );
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
