/**
 * Relay for flermaskin-øvelser.
 *
 * Serverer appen over http på lokalnettet og formidler meldinger over
 * WebSocket på /relay. Appen og relayen må ligge på samme adresse: en side
 * lastet over https (som GitHub Pages) får ikke lov av nettleseren til å åpne
 * en ukryptert ws://-forbindelse mot en maskin på lokalnettet.
 *
 * Relayen inneholder ingen prosessmodell. Simuleringen kjøres i vertens
 * nettleser; relayen sender tilstand fra verten ut til deltakerne, og
 * kommandoer fra deltakerne inn til verten.
 *
 * Kjør: npm run bygg && npm start   (valgfritt PORT=8080)
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8080);
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend", "dist");
const HOST_CLOSED_BY_TAKEOVER = 4000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function serveStatic(req, res) {
  if (!existsSync(DIST)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Appen er ikke bygget. Kjør `npm run bygg` i relay/ først.\n");
    return;
  }
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const target = normalize(join(DIST, urlPath));
  // Hindrer at ../ i URL-en leser filer utenfor dist/
  if (target !== DIST && !target.startsWith(DIST + sep)) {
    res.writeHead(403).end();
    return;
  }
  const file =
    existsSync(target) && statSync(target).isFile() ? target : join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}

const server = createServer(serveStatic);
const wss = new WebSocketServer({ server, path: "/relay" });

/** rom -> Set av klienter. Hver klient har .rolle satt til "vert" eller "deltaker". */
const rooms = new Map();

wss.on("connection", (socket, request) => {
  const params = new URL(request.url, "http://x").searchParams;
  const room = params.get("rom") ?? "stalovn";
  const rolle = params.get("rolle") === "vert" ? "vert" : "deltaker";

  socket.rolle = rolle;

  if (!rooms.has(room)) rooms.set(room, new Set());
  const peers = rooms.get(room);

  if (rolle === "vert") {
    // Bare én vert per rom – en ny vert overtar, og den gamle kobler ikke til igjen
    for (const peer of peers) {
      if (peer.rolle === "vert") peer.close(HOST_CLOSED_BY_TAKEOVER, "en annen vert overtok rommet");
    }
  }
  peers.add(socket);
  console.log(`[${room}] ${rolle} koblet til (${peers.size} i rommet)`);

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const toHost = msg.type === "command" || msg.type === "instructor";
    // Bare verten kjører ovnen, så bare verten kan publisere tilstand
    if (!toHost && socket.rolle !== "vert") return;

    for (const peer of peers) {
      if (peer === socket || peer.readyState !== peer.OPEN) continue;
      if (toHost ? peer.rolle === "vert" : peer.rolle === "deltaker") {
        peer.send(raw.toString());
      }
    }
  });

  socket.on("close", () => {
    peers.delete(socket);
    if (peers.size === 0) rooms.delete(room);
    console.log(`[${room}] ${rolle} koblet fra (${peers.size} igjen)`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && !a.internal)
    .map((a) => a.address);
  const hosts = addresses.length > 0 ? addresses : ["localhost"];

  console.log(`Stålovn-relay kjører på port ${PORT}\n`);
  if (!existsSync(DIST)) console.log("OBS: appen er ikke bygget – kjør `npm run bygg` først.\n");
  for (const host of hosts) {
    console.log(`  Vert (operatør):       http://${host}:${PORT}/?modus=vert&rom=kurs1`);
    console.log(`  Deltaker (instruktør): http://${host}:${PORT}/?modus=deltaker&rom=kurs1\n`);
  }
});
