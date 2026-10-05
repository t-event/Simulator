// B-465: Web Push uten bibliotek – bare WebCrypto, som finnes likt i Deno (edge-funksjonen) og Node (testen).
// VAPID (RFC 8292): en ES256-signert JWT til push-tjenesten. Innholdet krypteres med aes128gcm (RFC 8291, RFC 8188), så
// bare nettleseren som abonnerer, kan lese det.

export interface Subscription {
  endpoint: string;
  p256dh: string; // nettleserens offentlige nøkkel (base64url, 65 byte)
  auth: string; // nettleserens hemmelighet (base64url, 16 byte)
}

export interface VapidKeys {
  publicKey: string; // base64url, 65 byte (ukomprimert punkt)
  privateJwk: JsonWebKey; // { kty: "EC", crv: "P-256", d, x, y }
  subject: string; // https-adresse eller mailto:
}

const enc = new TextEncoder();
/** Bytes med vanlig ArrayBuffer under (det WebCrypto og fetch vil ha) */
type Bytes = Uint8Array<ArrayBuffer>;

export function b64url(bytes: Bytes): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(s: string): Bytes {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** VAPID-hodet: JWT signert med serverens nøkkel, gyldig i 12 timer */
export async function vapidHeader(endpoint: string, keys: VapidKeys, now = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })),
  );
  const key = await crypto.subtle.importKey("jwk", keys.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
  // WebCrypto gir r || s (64 byte), som er akkurat formatet JWT bruker
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`)),
  );
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${keys.publicKey}`;
}

/** Krypterer innholdet for én nettleser (aes128gcm, én post) */
export async function encryptPayload(sub: Subscription, plaintext: Bytes): Promise<Bytes> {
  const uaPublic = fromB64url(sub.p256dh);
  const authSecret = fromB64url(sub.auth);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256),
  );

  // RFC 8291 avsnitt 3.4
  const prkKey = await hmac(authSecret, ecdhSecret);
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1]));
  const ikm = await hmac(prkKey, keyInfo);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);

  const aes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  // Siste (og eneste) post avsluttes med 0x02
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))),
  );
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export interface PushResult {
  status: number;
  /** Abonnementet finnes ikke lenger (404/410) og skal slås av */
  gone: boolean;
  text?: string;
}

/** Sender ett varsel. `payload` er JSON som service workeren leser (tittel, tekst, lenke) */
export async function sendPush(
  sub: Subscription,
  payload: unknown,
  keys: VapidKeys,
  opts: { ttl?: number; urgency?: "normal" | "high"; topic?: string } = {},
): Promise<PushResult> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)));
  const headers: Record<string, string> = {
    Authorization: await vapidHeader(sub.endpoint, keys),
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(opts.ttl ?? 86_400),
    Urgency: opts.urgency ?? "normal",
  };
  // Et nytt varsel med samme emne erstatter et som ikke er levert ennå (høyst 32 tegn, base64url)
  if (opts.topic) headers.Topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  const res = await fetch(sub.endpoint, { method: "POST", headers, body });
  const text = res.ok ? undefined : (await res.text().catch(() => "")).slice(0, 200);
  return { status: res.status, gone: res.status === 404 || res.status === 410, text };
}
