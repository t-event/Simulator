/*
 * Service worker for Stålverket: gjør at spillet starter uten nett.
 *
 * Sidene hentes fra nettet først (så nye versjoner kommer fram), med lagret
 * kopi som reserve. Filer med hash i navnet (assets/) endres aldri og tas fra
 * lageret først. Øk VERSION for å rydde bort gamle lagre.
 */
const VERSION = "stalverket-v2";

/**
 * Lagrer siden og filene den laster (JS og CSS i assets/), så spillet kan åpnes uten nett fra første gang (B-428).
 * Alt hentes først, og lageret skrives først når alt er hentet (B-433): før ble den nye siden lagret over den gamle før
 * JS/CSS var hentet, og svarte én fil 503, sto lageret med en side som trengte en fil som manglet. Feiler noe,
 * feiler installasjonen, og den gamle service workeren og kopien gjelder til neste forsøk (B-429).
 */
async function fetchOk(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fikk ikke hentet ${url} (${res.status})`);
  return res;
}

/**
 * Lagrer en side som den nye kopien, men først når filene den trenger (JS og CSS i assets/, og `extra`) ligger i
 * lageret. Det som alt ligger der, hentes ikke på nytt (filene har hash i navnet og endres aldri). Feiler én fil,
 * står den gamle kopien urørt (B-433, B-434).
 */
async function storePage(page, extra = []) {
  const html = await page.clone().text();
  // Stiene i siden er absolutte (/Simulator/assets/…): de løses mot adressen til service workeren
  const found = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)];
  const assets = [...new Set(found.map((m) => new URL(m[1], self.location.href).href))];
  const cache = await caches.open(VERSION);
  const missing = [];
  for (const f of assets) if (!(await cache.match(f))) missing.push(f);
  const files = [...extra, ...missing];
  const fetched = await Promise.all(files.map((f) => fetchOk(f)));
  await Promise.all(fetched.map((res, i) => cache.put(files[i], res)));
  // Siden sist, når filene den trenger, ligger i lageret
  await cache.put("./", page);
}

async function precache() {
  await storePage(await fetchOk("./"), ["manifest.webmanifest", "icon.svg", "icon-192.png"]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Versjonsfila skal alltid hentes fra nettet, ellers ser ikke appen at en ny versjon er publisert (B-148)
  if (new URL(request.url).pathname.endsWith("/version.json")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Bare et svar som virker, erstatter kopien (B-428): før kunne en feilside (f.eks. 503) bli den lagrede siden.
          // Og bare når filene siden trenger, er lagret (B-434): før ble ny side lagret med én gang, og svarte en ny
          // JS-fil 503, startet ikke spillet uten nett
          if (!response.ok) return caches.match("./").then((cached) => cached || response);
          event.waitUntil(storePage(response.clone()).catch(() => {}));
          return response;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
