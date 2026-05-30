/**
 * Онлайн-лобби для мини-игр.
 * Поток: join → ждём игроков → хост жмёт «Старт» (когда ≥2) → игра у всех.
 * Работает через online.js (WebSocket). Fail-safe: если оффлайн — сообщение.
 */
import { isOnline, getMyId, lobbyJoin, lobbyLeave, lobbyStart, onLobby } from "./online.js?v=mp-1";

export function openLobby(container, { mode, title, onStart, onCancel }) {
  let unsub = null;
  let lastState = null;

  container.innerHTML = `<div class="lb-root" id="lbRoot"></div>`;
  const root = container.querySelector("#lbRoot");

  if (!isOnline()) {
    root.innerHTML = `
      <div class="lb-offline">
        <div class="lb-off-icon">📡</div>
        <div class="lb-off-title">Нет соединения с сервером</div>
        <div class="lb-off-text">Онлайн-режим доступен только на сервере с поддержкой мультиплеера.<br>Попробуй обычный режим или зайди позже.</div>
        <button class="mg-btn" id="lbBack">← Назад</button>
      </div>`;
    root.querySelector("#lbBack").addEventListener("click", () => onCancel && onCancel());
    return { destroy: () => {} };
  }

  unsub = onLobby((m) => {
    if (m.mode !== mode) return;
    if (m.t === "lobby") { lastState = m; render(); }
    if (m.t === "lobby_started") {
      cleanup();
      if (onStart) onStart({ players: m.players, seed: m.seed, myId: getMyId() });
    }
  });

  lobbyJoin(mode);
  renderWaiting();

  function renderWaiting() {
    root.innerHTML = `
      <div class="lb-wait">
        <div class="lb-title">🌐 ${title} — Онлайн-лобби</div>
        <div class="lb-spinner">Подключение к лобби…</div>
      </div>`;
  }

  function render() {
    const me = getMyId();
    const isHost = lastState.hostId === me;
    const n = lastState.players.length;
    root.innerHTML = `
      <div class="lb-wait">
        <div class="lb-title">🌐 ${title} — Онлайн-лобби</div>
        <div class="lb-count">Игроков: ${n}</div>
        <div class="lb-players">
          ${lastState.players.map(p => `
            <div class="lb-player ${p.id === me ? "lb-me" : ""} ${p.id === lastState.hostId ? "lb-host" : ""}">
              ${p.id === lastState.hostId ? "👑 " : "🐱 "}${p.name}${p.id === me ? " (ты)" : ""}
            </div>`).join("")}
        </div>
        <div class="lb-hint">${n < 2 ? "Ждём ещё хотя бы одного игрока…" : (isHost ? "Можно начинать!" : "Ждём, пока хост начнёт игру…")}</div>
        <div class="lb-controls">
          ${isHost ? `<button class="mg-btn mg-btn-big" id="lbStart" ${n < 2 ? "disabled" : ""}>▶ Старт</button>` : ""}
          <button class="mg-btn" id="lbLeave">✕ Покинуть лобби</button>
        </div>
      </div>`;
    const sb = root.querySelector("#lbStart");
    if (sb) sb.addEventListener("click", () => lobbyStart());
    root.querySelector("#lbLeave").addEventListener("click", () => { cleanup(); onCancel && onCancel(); });
  }

  function cleanup() {
    if (unsub) { unsub(); unsub = null; }
  }

  return {
    destroy: () => { cleanup(); lobbyLeave(); },
  };
}
