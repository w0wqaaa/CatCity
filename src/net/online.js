/**
 * Клиентский сетевой слой (WebSocket).
 * Опционален и fail-safe: если сервер недоступен — игра работает в одиночку.
 *
 * Экспортирует presence-API (другие игроки на карте) и lobby-API.
 */

let ws = null;
let myId = null;
let connected = false;
let connecting = false;

const remotePlayers = new Map(); // id -> {id, name, character, x, y, dir}
let onPresenceChange = null;     // колбэк перерисовки
const lobbyListeners = new Set();// колбэки лобби
const gameListeners = new Set(); // колбэки игровых сообщений

let selfState = { name: "", character: "boy", location: "city", x: 0, y: 0, dir: "down" };

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws`;
}

export function isOnline() { return connected; }
export function getMyId() { return myId; }
export function getRemotePlayers() { return [...remotePlayers.values()]; }
export function setPresenceHandler(fn) { onPresenceChange = fn; }
export function onLobby(fn) { lobbyListeners.add(fn); return () => lobbyListeners.delete(fn); }
export function onGameMessage(fn) { gameListeners.add(fn); return () => gameListeners.delete(fn); }

/** Подключение. Безопасно вызывать повторно. */
export function connectOnline(selfInfo) {
  Object.assign(selfState, selfInfo || {});
  if (connected || connecting) return;
  connecting = true;
  try {
    ws = new WebSocket(wsUrl());
  } catch {
    connecting = false; return;
  }

  ws.addEventListener("open", () => {
    connected = true; connecting = false;
    sendRaw({ t: "hello", ...selfState });
  });

  ws.addEventListener("message", (e) => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    handle(m);
  });

  ws.addEventListener("close", () => {
    connected = false; connecting = false; myId = null;
    remotePlayers.clear();
    if (onPresenceChange) onPresenceChange();
  });

  ws.addEventListener("error", () => { /* тихо: остаёмся в одиночном режиме */ });
}

function handle(m) {
  switch (m.t) {
    case "welcome": myId = m.id; break;
    case "snapshot":
      remotePlayers.clear();
      for (const p of m.players) remotePlayers.set(p.id, p);
      if (onPresenceChange) onPresenceChange();
      break;
    case "join":
      remotePlayers.set(m.player.id, m.player);
      if (onPresenceChange) onPresenceChange();
      break;
    case "leave":
      remotePlayers.delete(m.id);
      if (onPresenceChange) onPresenceChange();
      break;
    case "move": {
      const p = remotePlayers.get(m.id);
      if (p) { p.x = m.x; p.y = m.y; p.dir = m.dir; if (onPresenceChange) onPresenceChange(); }
      break;
    }
    case "lobby":
    case "lobby_started":
      for (const fn of lobbyListeners) fn(m);
      break;
    case "game":
      for (const fn of gameListeners) fn(m);
      break;
  }
}

function sendRaw(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

// ─── Presence (карта) ─────────────────────────────────────────────────────────
export function sendMove(x, y, dir) {
  selfState.x = x; selfState.y = y; selfState.dir = dir;
  sendRaw({ t: "move", x, y, dir });
}
export function sendLocation(location, x, y, dir) {
  selfState.location = location; selfState.x = x; selfState.y = y; selfState.dir = dir;
  remotePlayers.clear();
  if (onPresenceChange) onPresenceChange();
  sendRaw({ t: "loc", location, x, y, dir });
}

// ─── Лобби ────────────────────────────────────────────────────────────────────
export function lobbyJoin(mode) { sendRaw({ t: "lobby_join", mode }); }
export function lobbyLeave() { sendRaw({ t: "lobby_leave" }); }
export function lobbyStart() { sendRaw({ t: "lobby_start" }); }
export function sendGame(data) { sendRaw({ t: "game", data }); }
