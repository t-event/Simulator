/**
 * Relay for flermaskin-øvelser.
 *
 * Relayen inneholder ingen prosessmodell. Den videreformidler bare meldinger
 * innenfor et rom: tilstand fra verten ut til de andre, og kommandoer fra de
 * andre inn til verten. Simuleringen kjøres i vertens nettleser, slik at
 * prosessmodellen finnes bare ett sted.
 *
 * Kjør: node relay/server.js  (valgfritt PORT=8080)
 */
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8080);

/** rom -> Set av klienter. Hver klient har .rolle satt til "vert" eller "deltaker". */
const rooms = new Map();

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket, request) => {
  const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
  const room = params.get("rom") ?? "stalovn";
  const rolle = params.get("rolle") === "vert" ? "vert" : "deltaker";

  socket.rolle = rolle;
  socket.room = room;

  if (!rooms.has(room)) rooms.set(room, new Set());
  const peers = rooms.get(room);

  if (rolle === "vert") {
    // Bare én vert per rom – en ny vert overtar
    for (const peer of peers) {
      if (peer.rolle === "vert" && peer !== socket) {
        peer.close(4000, "en annen vert overtok rommet");
      }
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

    // Tilstand går fra verten ut til deltakerne, kommandoer motsatt vei
    const toHost = msg.type === "command" || msg.type === "instructor";
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

console.log(`Stålovn-relay lytter på ws://0.0.0.0:${PORT}`);
console.log("Vert:     ?modus=vert&rom=<rom>&relay=ws://<maskin>:" + PORT);
console.log("Deltaker: ?modus=deltaker&rom=<rom>&relay=ws://<maskin>:" + PORT);
