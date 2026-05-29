/**
 * Mini-Game Manager
 * Central router for all mini-games via targetMode.
 */
import { MINI_GAME_CONFIGS } from "./configs.js";
import { createTicTacToe }  from "./ticTacToe.js";
import { createBlackjack }  from "./blackjack.js";

// ── Factories ─────────────────────────────────────────────────────────────────
const GAME_FACTORIES = {
  tic_tac_toe: createTicTacToe,
  blackjack:   createBlackjack,
};

// ── State ─────────────────────────────────────────────────────────────────────
let overlay     = null;
let bodyEl      = null;
let titleEl     = null;
let msgEl       = null;
let currentGame = null;
let currentCtx  = null;
let isOpen      = false;

export function isMiniGameOpen() { return isOpen; }

// ── Public API ────────────────────────────────────────────────────────────────
export function initMiniGameManager() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "miniGameOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="mgPanel">
      <div id="mgTopBar">
        <span id="mgTitle">Мини-игра</span>
        <button id="mgExitBtn" type="button">✕ Выйти</button>
      </div>
      <div id="mgBody"></div>
      <div id="mgMsg"></div>
    </div>`;
  document.body.appendChild(overlay);

  titleEl = overlay.querySelector("#mgTitle");
  bodyEl  = overlay.querySelector("#mgBody");
  msgEl   = overlay.querySelector("#mgMsg");

  overlay.querySelector("#mgExitBtn").addEventListener("click", closeMiniGame);
  window.addEventListener("keydown", (e) => {
    if (isOpen && e.code === "Escape") { e.stopPropagation(); e.preventDefault(); closeMiniGame(); }
  }, true);
}

export function openMiniGame(modeId, context = {}) {
  initMiniGameManager();
  currentCtx = context;

  const config = MINI_GAME_CONFIGS[modeId];
  if (!config) {
    showPlaceholder({ name: modeId, description: "Неизвестный режим." });
    return;
  }

  isOpen = true;
  overlay.classList.remove("hidden");
  titleEl.textContent = `${config.emoji || "🎮"} ${config.name}`;
  msgEl.textContent   = "";

  if (config.status === "placeholder") {
    showPlaceholder(config);
    return;
  }

  showModeSelect(config);
}

export function closeMiniGame() {
  if (currentGame?.destroy) currentGame.destroy();
  currentGame = null;
  if (overlay) overlay.classList.add("hidden");
  isOpen = false;
  const cb = currentCtx?.onClose;
  currentCtx = null;
  if (cb) cb();
}

// ── Screens ───────────────────────────────────────────────────────────────────
function showPlaceholder(config) {
  bodyEl.innerHTML = `
    <div class="mg-placeholder">
      <div class="mg-placeholder-icon">${config.emoji || "🌀"}</div>
      <div class="mg-placeholder-title">${config.name}</div>
      <div class="mg-placeholder-text">Это измерение пока нестабильно.<br>${config.description || ""}</div>
    </div>`;
}

function showModeSelect(config) {
  bodyEl.innerHTML = `
    <div class="mg-mode-select">
      <div class="mg-mode-desc">${config.description}</div>
      <button id="mgVsBot" class="mg-btn mg-btn-big" type="button">🤖 Против бота</button>
      <button id="mgVsPvP" class="mg-btn mg-btn-big ${config.supportsPvP ? "" : "mg-btn-disabled"}" type="button">
        👥 Два игрока${config.supportsPvP ? "" : " <small>(скоро)</small>"}
      </button>
    </div>`;

  bodyEl.querySelector("#mgVsBot").addEventListener("click", () => launchGame(config, "bot"));

  const pvpBtn = bodyEl.querySelector("#mgVsPvP");
  if (config.supportsPvP) {
    pvpBtn.addEventListener("click", () => launchGame(config, "pvp"));
  } else {
    pvpBtn.addEventListener("click", () => { msgEl.textContent = "Локальный режим будет добавлен позже."; });
  }
}

function launchGame(config, mode) {
  const factory = GAME_FACTORIES[config.id];
  if (!factory) {
    bodyEl.innerHTML = `<div class="mg-placeholder-text">Игра не реализована.</div>`;
    return;
  }

  const gameArea = document.createElement("div");
  gameArea.className = "mg-game-area";
  bodyEl.innerHTML = "";
  bodyEl.appendChild(gameArea);

  msgEl.textContent = "";

  const handleResult = ({ result, winner }) => {
    if (result === "restart") { msgEl.textContent = ""; return; }

    const cfg = config;
    if (cfg.rewards !== "dynamic") {
      const goldMap = cfg.rewards || {};
      const gold = goldMap[result] || 0;
      if (gold > 0) {
        if (currentCtx?.onGoldChange) currentCtx.onGoldChange(gold);
        msgEl.textContent = `+${gold} 💰 золото!`;
      } else if (result === "lose") {
        msgEl.textContent = "Не повезло. Попробуй ещё раз!";
      }
    }

    if (currentCtx?.onStatsUpdate) {
      currentCtx.onStatsUpdate(cfg.id, result);
    }
  };

  currentGame = factory(gameArea, {
    mode,
    playerStats: currentCtx?.playerStats,
    onGoldChange: (delta) => {
      if (currentCtx?.onGoldChange) currentCtx.onGoldChange(delta);
      if (delta > 0) msgEl.textContent = `+${delta} 💰`;
      else if (delta < 0) msgEl.textContent = `${delta} 💰`;
    },
    onResult: handleResult,
  });

  // Back to mode select
  const backBtn = document.createElement("button");
  backBtn.className = "mg-btn";
  backBtn.textContent = "← Назад";
  backBtn.style.marginTop = "8px";
  backBtn.addEventListener("click", () => {
    if (currentGame?.destroy) currentGame.destroy();
    currentGame = null;
    msgEl.textContent = "";
    showModeSelect(config);
  });
  bodyEl.appendChild(backBtn);
}
