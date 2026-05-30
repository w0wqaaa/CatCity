/**
 * CatCity — статический хостинг + WebSocket-сервер мультиплеера.
 *
 * HTTP: раздаёт весь проект (index.html, assets/, data/, src/).
 * WS:   присутствие игроков на общей карте (комнаты по локациям)
 *       и онлайн-лобби для мини-игр (ждём игроков → старт).
 *
 * Протокол (JSON):
 *   client→server:
 *     {t:"hello", name, character, location, x, y, dir}
 *     {t:"move", x, y, dir}
 *     {t:"loc", location, x, y, dir}            // сменил локацию
 *     {t:"lobby_join", mode}
 *     {t:"lobby_leave"}
 *     {t:"lobby_start"}                         // только хост
 *     {t:"game", mode, data}                    // ретрансляция игрового действия
 *   server→client:
 *     {t:"welcome", id}
 *     {t:"snapshot", players:[...]}             // все в моей локации
 *     {t:"join", player}
 *     {t:"leave", id}
 *     {t:"move", id, x, y, dir}
 *     {t:"lobby", mode, players:[{id,name}], hostId, started}
 *     {t:"lobby_started", mode, players:[{id,name}], seed}
 *     {t:"game", mode, fromId, data}
 */
const express = require("express");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const app = express();
const ROOT = path.join(__dirname, "..");
const PORT = process.env.PORT || 3000;

app.use(
  express.static(ROOT, {
    index: "index.html",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
    },
  })
);
app.get("*", (req, res) => res.sendFile(path.join(ROOT, "index.html")));

// ─── HTTP + WS на одном порту ───────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const players = new Map(); // id -> { ws, name, character, location, x, y, dir, lobby }
const lobbies = new Map(); // mode -> { hostId, started, members:Set<id> }

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function toLocation(location, obj, exceptId) {
  for (const [id, p] of players) {
    if (p.location === location && id !== exceptId) send(p.ws, obj);
  }
}
function publicPlayer(id) {
  const p = players.get(id);
  return p && { id, name: p.name, character: p.character, x: p.x, y: p.y, dir: p.dir };
}

// ─── Лобби ───────────────────────────────────────────────────────────────────
function lobbyState(mode) {
  const lb = lobbies.get(mode);
  if (!lb) return { t: "lobby", mode, players: [], hostId: null, started: false };
  return {
    t: "lobby",
    mode,
    hostId: lb.hostId,
    started: lb.started,
    players: [...lb.members].map((id) => ({ id, name: players.get(id)?.name || "?" })),
  };
}
function broadcastLobby(mode) {
  const lb = lobbies.get(mode);
  if (!lb) return;
  const st = lobbyState(mode);
  for (const id of lb.members) send(players.get(id)?.ws, st);
}
function leaveLobby(id) {
  const p = players.get(id);
  if (!p || !p.lobby) return;
  const mode = p.lobby;
  p.lobby = null;
  const lb = lobbies.get(mode);
  if (!lb) return;
  lb.members.delete(id);
  if (lb.members.size === 0) { lobbies.delete(mode); return; }
  if (lb.hostId === id) lb.hostId = [...lb.members][0]; // передаём хоста
  broadcastLobby(mode);
}

// ─── Соединение ──────────────────────────────────────────────────────────────
wss.on("connection", (ws) => {
  const id = crypto.randomUUID();
  send(ws, { t: "welcome", id });

  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const p = players.get(id);

    switch (m.t) {
      case "hello": {
        players.set(id, {
          ws, name: (m.name || "Игрок").slice(0, 24),
          character: m.character || "boy",
          location: m.location || "city",
          x: m.x || 0, y: m.y || 0, dir: m.dir || "down", lobby: null,
        });
        // отдаём снапшот всех в этой локации
        const list = [];
        for (const [oid, op] of players)
          if (oid !== id && op.location === m.location) list.push(publicPlayer(oid));
        send(ws, { t: "snapshot", players: list });
        toLocation(m.location, { t: "join", player: publicPlayer(id) }, id);
        break;
      }
      case "move": {
        if (!p) break;
        p.x = m.x; p.y = m.y; p.dir = m.dir;
        toLocation(p.location, { t: "move", id, x: m.x, y: m.y, dir: m.dir }, id);
        break;
      }
      case "loc": {
        if (!p) break;
        toLocation(p.location, { t: "leave", id }, id); // ушёл из старой
        p.location = m.location; p.x = m.x; p.y = m.y; p.dir = m.dir;
        const list = [];
        for (const [oid, op] of players)
          if (oid !== id && op.location === m.location) list.push(publicPlayer(oid));
        send(ws, { t: "snapshot", players: list });
        toLocation(m.location, { t: "join", player: publicPlayer(id) }, id);
        break;
      }
      case "lobby_join": {
        if (!p) break;
        leaveLobby(id);
        const mode = m.mode;
        let lb = lobbies.get(mode);
        if (!lb) { lb = { hostId: id, started: false, members: new Set() }; lobbies.set(mode, lb); }
        lb.members.add(id);
        p.lobby = mode;
        broadcastLobby(mode);
        break;
      }
      case "lobby_leave":
        leaveLobby(id);
        break;
      case "lobby_start": {
        if (!p || !p.lobby) break;
        const lb = lobbies.get(p.lobby);
        if (!lb || lb.hostId !== id || lb.members.size < 2) break;
        lb.started = true;
        const seed = Math.floor(Math.random() * 1e9);
        const list = [...lb.members].map((mid) => ({ id: mid, name: players.get(mid)?.name || "?" }));
        const msg = { t: "lobby_started", mode: p.lobby, players: list, seed };
        for (const mid of lb.members) send(players.get(mid)?.ws, msg);
        break;
      }
      case "game": {
        // ретрансляция игрового действия всем в том же лобби
        if (!p || !p.lobby) break;
        const lb = lobbies.get(p.lobby);
        if (!lb) break;
        for (const mid of lb.members)
          if (mid !== id) send(players.get(mid)?.ws, { t: "game", mode: p.lobby, fromId: id, data: m.data });
        break;
      }
    }
  });

  ws.on("close", () => {
    const p = players.get(id);
    if (p) {
      leaveLobby(id);
      toLocation(p.location, { t: "leave", id }, id);
      players.delete(id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`CatCity (HTTP+WS) слушает порт ${PORT}  →  http://localhost:${PORT}`);
});
