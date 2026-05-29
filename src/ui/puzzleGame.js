/**
 * Sliding Puzzle (15-puzzle style, 3×3)
 * 8 плиток + 1 пустой слот. Двигаем плитки кликом.
 * Источник: один спрайт торговца, масштабированный до квадрата.
 */

const COLS = 3;
const ROWS = 3;
const TILE_COUNT = COLS * ROWS;
const EMPTY = 0;
const TILE_PX = 120;
const BOARD_PX = TILE_PX * COLS; // 360

const SPRITE_URL = "assets/npcs/merchant/merchant_idle.png";
const SHUFFLE_MOVES = 120;

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlay      = null;
let boardCanvas  = null;
let boardCtx     = null;
let timerEl      = null;
let statusEl     = null;
let bestEl       = null;
let refCanvas    = null;
let instrPanel   = null; // панель с инструкцией

// ─── Состояние ────────────────────────────────────────────────────────────────
let grid            = [];
let sourceImg       = null;
let offscreen       = null;
let startTime       = null;
let timerRAF        = null;
let isOpen          = false;
let instrShown      = false; // показана ли инструкция прямо сейчас
let puzzleResults   = [];
let currentPlayer   = "";
let onCloseCallback = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initPuzzleGame() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "puzzleOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="puzzlePanel">

      <!-- Шапка -->
      <div id="puzzleTopBar">
        <span id="puzzleTitle">🪞 Зеркальный Пазл</span>
        <span id="puzzleTimerBox">⏱ <span id="puzzleTimerVal">00:00.0</span></span>
        <div id="puzzleTopButtons">
          <button id="puzzleHowBtn"  type="button" title="Как играть">?</button>
          <button id="puzzleExitBtn" type="button">✕ Выйти</button>
        </div>
      </div>

      <!-- Инструкция (скрыта по умолчанию) -->
      <div id="puzzleInstr" class="hidden">
        <div id="puzzleInstrContent">
          <div class="pz-instr-title">🪞 Как играть</div>
          <ul class="pz-instr-list">
            <li>Пазл разбит на <b>8 плиток</b> и один <b>пустой слот</b>.</li>
            <li>Кликай на плитку, которая стоит <b>рядом с пустым местом</b> — она туда сдвинется.</li>
            <li>Цель: <b>восстановить оригинальную картинку</b> (смотри превью справа).</li>
            <li>Таймер стартует с первого хода — старайся решить <b>быстрее</b>!</li>
            <li>Нажми <b>✕ Выйти</b> чтобы выйти в любой момент.</li>
          </ul>
          <button id="puzzleInstrClose" type="button">Понял, играть!</button>
        </div>
      </div>

      <!-- Основная зона -->
      <div id="puzzleBoardWrap">
        <canvas id="puzzleBoard" width="${BOARD_PX}" height="${BOARD_PX}"></canvas>
        <div id="puzzleSide">
          <div class="puzzle-side-label">Оригинал</div>
          <canvas id="puzzleRef" width="90" height="90"></canvas>
          <div id="puzzleStatus"></div>
          <div id="puzzleBest"></div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  boardCanvas = overlay.querySelector("#puzzleBoard");
  boardCtx    = boardCanvas.getContext("2d");
  timerEl     = overlay.querySelector("#puzzleTimerVal");
  statusEl    = overlay.querySelector("#puzzleStatus");
  bestEl      = overlay.querySelector("#puzzleBest");
  refCanvas   = overlay.querySelector("#puzzleRef");
  instrPanel  = overlay.querySelector("#puzzleInstr");

  overlay.querySelector("#puzzleExitBtn").addEventListener("click", closePuzzle);
  overlay.querySelector("#puzzleHowBtn").addEventListener("click", showInstr);
  overlay.querySelector("#puzzleInstrClose").addEventListener("click", hideInstr);
  boardCanvas.addEventListener("click", handleClick);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function isPuzzleOpen()  { return isOpen; }

export function openPuzzleGame({ playerName = "Игрок", onClose = null, savedResults = [] } = {}) {
  initPuzzleGame();
  currentPlayer   = playerName;
  onCloseCallback = onClose;
  puzzleResults   = Array.isArray(savedResults) ? [...savedResults] : [];
  isOpen          = true;
  overlay.classList.remove("hidden");

  resetPuzzle();
  renderBest();

  loadSprite().then((img) => {
    if (img) buildOffscreen(img);
    drawRef();
    drawBoard();
    // Показываем инструкцию при первом открытии
    showInstr();
  });
}

export function getPuzzleResults() { return [...puzzleResults]; }

// ─── Инструкция ───────────────────────────────────────────────────────────────
function showInstr() {
  instrShown = true;
  instrPanel.classList.remove("hidden");
}

function hideInstr() {
  instrShown = false;
  instrPanel.classList.add("hidden");
}

// ─── Core ─────────────────────────────────────────────────────────────────────
function closePuzzle() {
  stopTimer();
  isOpen = false;
  instrShown = false;
  instrPanel.classList.add("hidden");
  overlay.classList.add("hidden");
  if (onCloseCallback) onCloseCallback();
}

function resetPuzzle() {
  stopTimer();
  startTime = null;
  timerEl.textContent = "00:00.0";
  setStatus("Двигай плитки рядом с пустым слотом");
  grid = buildSolvedGrid();
  shuffleGrid();
}

function buildSolvedGrid() {
  const g = [];
  for (let i = 0; i < TILE_COUNT - 1; i++) g.push(i + 1);
  g.push(EMPTY);
  return g;
}

function shuffleGrid() {
  let emptyIdx = grid.indexOf(EMPTY);
  for (let i = 0; i < SHUFFLE_MOVES; i++) {
    const neighbors = getNeighborIndices(emptyIdx);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [grid[emptyIdx], grid[pick]] = [grid[pick], grid[emptyIdx]];
    emptyIdx = pick;
  }
  if (isSolved()) shuffleGrid();
}

function getNeighborIndices(idx) {
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  const r = [];
  if (row > 0)        r.push(idx - COLS);
  if (row < ROWS - 1) r.push(idx + COLS);
  if (col > 0)        r.push(idx - 1);
  if (col < COLS - 1) r.push(idx + 1);
  return r;
}

function isSolved() {
  for (let i = 0; i < TILE_COUNT - 1; i++) {
    if (grid[i] !== i + 1) return false;
  }
  return grid[TILE_COUNT - 1] === EMPTY;
}

// ─── Статус (без изменения размера) ──────────────────────────────────────────
let statusTimer = null;
function setStatus(text, temporary = false) {
  statusEl.textContent = text;
  if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
  if (temporary) {
    statusTimer = setTimeout(() => {
      statusEl.textContent = "Двигай плитки рядом с пустым слотом";
    }, 1500);
  }
}

// ─── Input ────────────────────────────────────────────────────────────────────
function handleClick(e) {
  if (!isOpen || instrShown) return;

  // Берём координаты ДО возможного reflow — через e.offsetX/offsetY
  // которые уже относительно canvas и не зависят от положения панели
  const scaleX = BOARD_PX / boardCanvas.offsetWidth;
  const scaleY = BOARD_PX / boardCanvas.offsetHeight;
  const mx = e.offsetX * scaleX;
  const my = e.offsetY * scaleY;

  const col = Math.floor(mx / TILE_PX);
  const row = Math.floor(my / TILE_PX);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

  const clickedIdx = row * COLS + col;
  const emptyIdx   = grid.indexOf(EMPTY);

  if (!getNeighborIndices(emptyIdx).includes(clickedIdx)) {
    setStatus("❌ Эту плитку нельзя двигать — она не рядом с пустым местом", true);
    return;
  }

  if (!startTime) {
    startTime = Date.now();
    startTimer();
  }

  [grid[emptyIdx], grid[clickedIdx]] = [grid[clickedIdx], grid[emptyIdx]];
  setStatus(""); // очищаем без временного сброса
  drawBoard();

  if (isSolved()) finish();
}

// ─── Render ───────────────────────────────────────────────────────────────────
async function loadSprite() {
  if (sourceImg) return sourceImg;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { sourceImg = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = SPRITE_URL;
  });
}

function buildOffscreen(img) {
  offscreen = document.createElement("canvas");
  offscreen.width  = BOARD_PX;
  offscreen.height = BOARD_PX;
  const oc = offscreen.getContext("2d");
  const side = Math.min(img.width, img.height);
  const sx   = Math.floor((img.width  - side) / 2);
  const sy   = Math.floor((img.height - side) / 2);
  oc.drawImage(img, sx, sy, side, side, 0, 0, BOARD_PX, BOARD_PX);
}

function drawRef() {
  if (!refCanvas) return;
  const rc = refCanvas.getContext("2d");
  rc.clearRect(0, 0, 90, 90);
  if (offscreen) {
    rc.drawImage(offscreen, 0, 0, 90, 90);
    // Лёгкая сетка на превью
    rc.strokeStyle = "rgba(120,80,200,0.4)";
    rc.lineWidth = 0.5;
    for (let i = 1; i < COLS; i++) {
      const x = i * 30;
      rc.beginPath(); rc.moveTo(x, 0); rc.lineTo(x, 90); rc.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      const y = i * 30;
      rc.beginPath(); rc.moveTo(0, y); rc.lineTo(90, y); rc.stroke();
    }
  } else {
    rc.fillStyle = "#1a0f3a";
    rc.fillRect(0, 0, 90, 90);
  }
}

function drawBoard() {
  boardCtx.clearRect(0, 0, BOARD_PX, BOARD_PX);
  boardCtx.fillStyle = "#0d0820";
  boardCtx.fillRect(0, 0, BOARD_PX, BOARD_PX);

  for (let i = 0; i < TILE_COUNT; i++) {
    const tileNum = grid[i];
    const drawCol = i % COLS;
    const drawRow = Math.floor(i / COLS);
    const dx = drawCol * TILE_PX;
    const dy = drawRow * TILE_PX;

    if (tileNum === EMPTY) {
      boardCtx.fillStyle = "#130a28";
      boardCtx.fillRect(dx + 1, dy + 1, TILE_PX - 2, TILE_PX - 2);
      boardCtx.strokeStyle = "rgba(100,60,180,0.25)";
      boardCtx.lineWidth = 1;
      boardCtx.setLineDash([6, 4]);
      boardCtx.strokeRect(dx + 3, dy + 3, TILE_PX - 6, TILE_PX - 6);
      boardCtx.setLineDash([]);
      continue;
    }

    const srcNum = tileNum - 1;
    const srcCol = srcNum % COLS;
    const srcRow = Math.floor(srcNum / COLS);

    if (offscreen) {
      boardCtx.drawImage(
        offscreen,
        srcCol * TILE_PX, srcRow * TILE_PX, TILE_PX, TILE_PX,
        dx, dy, TILE_PX, TILE_PX
      );
    } else {
      boardCtx.fillStyle = "#2a1a5a";
      boardCtx.fillRect(dx, dy, TILE_PX, TILE_PX);
    }

    // Рамка плитки
    boardCtx.strokeStyle = "rgba(160,110,255,0.5)";
    boardCtx.lineWidth = 1.5;
    boardCtx.setLineDash([]);
    boardCtx.strokeRect(dx + 0.75, dy + 0.75, TILE_PX - 1.5, TILE_PX - 1.5);
  }

  // Линии сетки поверх
  boardCtx.strokeStyle = "rgba(80,45,160,0.8)";
  boardCtx.lineWidth = 2;
  for (let c = 1; c < COLS; c++) {
    boardCtx.beginPath();
    boardCtx.moveTo(c * TILE_PX, 0);
    boardCtx.lineTo(c * TILE_PX, BOARD_PX);
    boardCtx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    boardCtx.beginPath();
    boardCtx.moveTo(0, r * TILE_PX);
    boardCtx.lineTo(BOARD_PX, r * TILE_PX);
    boardCtx.stroke();
  }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  (function tick() {
    if (!startTime) return;
    timerEl.textContent = formatTime(Date.now() - startTime);
    timerRAF = requestAnimationFrame(tick);
  })();
}

function stopTimer() {
  if (timerRAF) { cancelAnimationFrame(timerRAF); timerRAF = null; }
}

// ─── Finish ───────────────────────────────────────────────────────────────────
function finish() {
  stopTimer();
  const timeMs = startTime ? Date.now() - startTime : 0;
  timerEl.textContent = formatTime(timeMs);

  puzzleResults.push({ player: currentPlayer, timeMs });
  puzzleResults.sort((a, b) => a.timeMs - b.timeMs);
  puzzleResults = puzzleResults.slice(0, 10);

  // Целая картинка поверх доски
  boardCtx.clearRect(0, 0, BOARD_PX, BOARD_PX);
  if (offscreen) boardCtx.drawImage(offscreen, 0, 0);

  // Зелёная рамка
  boardCtx.strokeStyle = "#44ff88";
  boardCtx.lineWidth = 6;
  boardCtx.strokeRect(3, 3, BOARD_PX - 6, BOARD_PX - 6);

  // Полупрозрачная полоса с текстом
  boardCtx.fillStyle = "rgba(0,0,0,0.6)";
  boardCtx.fillRect(0, BOARD_PX / 2 - 40, BOARD_PX, 80);
  boardCtx.fillStyle = "#ffdd55";
  boardCtx.font = "bold 30px monospace";
  boardCtx.textAlign = "center";
  boardCtx.fillText("✨ Собрано!", BOARD_PX / 2, BOARD_PX / 2 - 6);
  boardCtx.font = "19px monospace";
  boardCtx.fillStyle = "#aaffcc";
  boardCtx.fillText(formatTime(timeMs), BOARD_PX / 2, BOARD_PX / 2 + 28);
  boardCtx.textAlign = "left";

  setStatus(`🎉 Пазл решён за ${formatTime(timeMs)}!`);
  renderBest();

  const old = overlay.querySelector("#puzzleRetryBtn");
  if (old) old.remove();
  const btn = document.createElement("button");
  btn.id   = "puzzleRetryBtn";
  btn.type = "button";
  btn.textContent = "🔄 Ещё раз";
  btn.addEventListener("click", () => {
    btn.remove();
    resetPuzzle();
    drawRef();
    drawBoard();
  });
  overlay.querySelector("#puzzleSide").appendChild(btn);
}

// ─── Best times ───────────────────────────────────────────────────────────────
function renderBest() {
  if (!bestEl) return;
  if (!puzzleResults.length) {
    bestEl.innerHTML = "<span class='pz-no-results'>Нет результатов</span>";
    return;
  }
  bestEl.innerHTML = "<b>Лучшие:</b>" +
    puzzleResults.slice(0, 5).map((r, i) =>
      `<span class='pz-row'>${i + 1}. ${r.player} — ${formatTime(r.timeMs)}</span>`
    ).join("");
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatTime(ms) {
  const s = Math.max(0, ms || 0);
  const m = Math.floor(s / 60000);
  const sec = Math.floor((s % 60000) / 1000);
  const t = Math.floor((s % 1000) / 100);
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${t}`;
}
