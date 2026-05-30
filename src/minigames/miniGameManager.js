/**
 * Mini-Game Manager
 * Central router for all mini-games via targetMode.
 */
import { MINI_GAME_CONFIGS } from "./configs.js?v=party-4";
import { createTicTacToe }  from "./ticTacToe.js";
import { createBlackjack }  from "./blackjack.js";
import { createPoker }      from "./poker.js?v=party-2";
import { createBattleship } from "./battleship.js?v=party-3";
import { createBomberman }  from "./bomberman.js?v=party-3";
import { createQuiz }       from "./quiz.js?v=party-3";
import { createMinesweeper } from "./minesweeper.js?v=party-4";
import { createDice }        from "./dice.js?v=party-4";
import { createSokoban }     from "./sokoban.js?v=party-4";
import { createTron }        from "./tron.js?v=party-4";
import { createMafia }       from "./mafia.js?v=party-4";
import { createCTF }         from "./ctf.js?v=party-4";
import { createTanksLite }   from "./tanksLite.js?v=party-4";
import { createChess }       from "./chess.js?v=party-6";

// ── Factories ─────────────────────────────────────────────────────────────────
const GAME_FACTORIES = {
  tic_tac_toe: createTicTacToe,
  blackjack:   createBlackjack,
  poker_lite:  createPoker,
  battleship:  createBattleship,
  bomberman_lite: createBomberman,
  quiz:           createQuiz,
  minesweeper:      createMinesweeper,
  dice_combo:       createDice,
  sokoban:          createSokoban,
  tron_duel:        createTron,
  mafia:            createMafia,
  capture_the_flag: createCTF,
  tanks_lite:       createTanksLite,
  chess:            createChess,
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

  // Игры со своим внутренним меню режимов (например, покер)
  if (config.directLaunch) {
    launchGame(config, "custom");
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
  const rulesHtml = Array.isArray(config.rules) && config.rules.length
    ? `<div class="mg-rules">
         <div class="mg-rules-title">📖 Как играть</div>
         <ul class="mg-rules-list">${config.rules.map(r => `<li>${r}</li>`).join("")}</ul>
       </div>`
    : "";

  if (config.pvpOnly) {
    // Игра только для двух реальных игроков (например, покер)
    bodyEl.innerHTML = `
      <div class="mg-mode-select">
        <div class="mg-mode-desc">${config.description}</div>
        ${rulesHtml}
        <button id="mgVsPvP" class="mg-btn mg-btn-big" type="button">👥 Играть (2 игрока)</button>
      </div>`;
    bodyEl.querySelector("#mgVsPvP").addEventListener("click", () => launchGame(config, "pvp"));
    return;
  }

  bodyEl.innerHTML = `
    <div class="mg-mode-select">
      <div class="mg-mode-desc">${config.description}</div>
      ${rulesHtml}
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

  // Back to mode select (кроме игр со своим меню)
  if (!config.directLaunch) {
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
}
