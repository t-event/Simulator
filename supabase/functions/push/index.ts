// B-465: varsel på mobilen. Vekkes av jobben `push-varsler` (push_kick i 134_varsel_pa_mobilen.sql) når noe venter i
// push_outbox, og svarer bare på kall med vekkenøkkelen (`x-push-key`, i Vault). Henter varslene med push_claim, sender
// dem kryptert til hver enhet (webpush.ts) og melder resultatet tilbake med push_done. VAPID-nøkkelen lages her første
// gang og lagres bare i Vault – den står aldri i repoet eller i loggen. service_role settes av Supabase i miljøet.
import { createClient } from "npm:@supabase/supabase-js@2";
import { b64url, sendPush, type Subscription, type VapidKeys } from "./webpush.ts";

interface Claimed {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  ref: string;
  subs: Subscription[];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Lager VAPID-nøkkelen første gang (P-256) */
async function makeKeys(): Promise<{ publicKey: string; privateJwk: JsonWebKey }> {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { publicKey: b64url(raw), privateJwk: { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y } };
}

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: cfg, error: cfgError } = await db.rpc("push_vapid");
  if (cfgError) return json({ ok: false, error: cfgError.message }, 500);
  const kickKey = (cfg as { kickKey?: string } | null)?.kickKey;
  if (!kickKey || req.headers.get("x-push-key") !== kickKey) return json({ ok: false }, 401);

  let vapid = (cfg as { vapid?: VapidKeys | null }).vapid ?? null;
  if (!vapid) {
    const made = await makeKeys();
    const { error } = await db.rpc("push_vapid_store", {
      p_public: made.publicKey,
      p_private: JSON.stringify(made.privateJwk),
    });
    if (error) return json({ ok: false, error: error.message }, 500);
    // Les fra Vault igjen: lagde to kall nøkkelen samtidig, er det den som ble lagret som gjelder
    const again = await db.rpc("push_vapid");
    vapid = (again.data as { vapid?: VapidKeys | null } | null)?.vapid ?? null;
    if (!vapid) return json({ ok: false, error: "fant ikke nøkkelen etter lagring" }, 500);
  }

  let sent = 0;
  let failed = 0;
  // Høyst fem runder per kall; resten tas ved neste vekking
  for (let round = 0; round < 5; round++) {
    const { data, error } = await db.rpc("push_claim", { p_limit: 100 });
    if (error) return json({ ok: false, error: error.message, sent, failed }, 500);
    const items = (data ?? []) as Claimed[];
    if (items.length === 0) break;
    const results: Record<string, unknown>[] = [];
    await Promise.all(
      items.map(async (it) => {
        const payload = { title: it.title, body: it.body, link: it.link, tag: it.ref.split(":").slice(0, 2).join(":") };
        let ok = 0;
        let lastError: string | undefined;
        for (const sub of it.subs) {
          try {
            const r = await sendPush(sub, payload, vapid!, { urgency: it.kind === "oppkjop" ? "high" : "normal" });
            results.push({ endpoint: sub.endpoint, status: r.status, gone: r.gone });
            if (r.status >= 200 && r.status < 300) ok++;
            else lastError = `${r.status} ${r.text ?? ""}`.trim();
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            results.push({ endpoint: sub.endpoint, status: 0 });
          }
        }
        sent += ok;
        if (ok === 0) failed++;
        results.push({ id: it.id, status: ok > 0 ? 201 : 0, error: ok > 0 ? null : (lastError ?? "ingen enheter") });
        // Én rad per varsel som teller sendte enheter
        for (let i = 1; i < ok; i++) results.push({ id: it.id, status: 201 });
      }),
    );
    const { error: doneError } = await db.rpc("push_done", { p_results: results });
    if (doneError) return json({ ok: false, error: doneError.message, sent, failed }, 500);
    if (items.length < 100) break;
  }
  return json({ ok: true, sent, failed });
});
