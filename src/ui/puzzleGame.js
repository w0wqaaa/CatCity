/**
 * Sliding Puzzle (15-puzzle style, 3×3)
 * 8 плиток + 1 пустой слот. Двигаем плитки кликом.
 * Источник: один спрайт торговца, масштабированный до квадрата.
 */

const COLS = 3;
const ROWS = 3;
const TILE_COUNT = COLS * ROWS;           // 9 позиций
const EMPTY = 0;                          // 0 = пустой слот
const TILE_PX = 120;                      // размер одной плитки в px
const BOARD_PX = TILE_PX * COLS;         // 360

const SPRITE_URL = "assets/npcs/merchant/merchant_idle.png";
const SHUFFLE_MOVES = 120;

// ─── DOM ─────────────────────────────────────────────────────────────────────
let overlay     = null;
let boardCanvas = null;
let boardCtx    = null;
let timerEl     = null;
let statusEl    = null;
let bestEl      = null;
let refCanvas   = null;  // маленький превью оригинала

// ─── Состояние ───────────────────────────────────────────────────────────────
let grid          = [];   // grid[i] = номер плитки (0 = пустая)
let sourceImg     = null; // загруженный спрайт
let offscreen     = null; // offscreen canvas с квадратным спрайтом
let nextExpected  = null;
let startTime     = null;
let timerRAF      = null;
let isOpen        = false;
let puzzleResults = [];
let currentPlayer = "";
let onCloseCallback = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initPuzzleGame() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "puzzleOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="puzzlePanel">
      <div id="puzzleTopBar">
        <span id="puzzleTitle">🪞 Зеркальный Пазл</span>
        <span id="puzzleTimerBox">⏱ <span id="puzzleTimerVal">00:00.0</span></span>
        <button id="puzzleExitBtn" type="button">✕ Выйти</button>
      </div>
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

  overlay.querySelector("#puzzleExitBtn").addEventListener("click", closePuzzle);
  boardCanvas.addEventListener("click", handleClick);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function isPuzzleOpen() { return isOpen; }

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
  });
}

export function getPuzzleResults() { return [...puzzleResults]; }

// ─── Core ─────────────────────────────────────────────────────────────────────
function closePuzzle() {
  stopTimer();
  isOpen = false;
  overlay.classList.add("hidden");
  if (onCloseCallback) onCloseCallback();
}

function resetPuzzle() {
  stopTimer();
  startTime = null;
  timerEl.textContent = "00:00.0";
  statusEl.textContent = "Двигай плитки рядом с пустым слотом";
  grid = buildSolvedGrid();
  shuffleGrid();
}

/** Решённое состояние: [1,2,3,4,5,6,7,8,0] — 0 в правом нижнем углу */
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
  // Убеждаемся что не перемешали в решённое состояние
  if (isSolved()) shuffleGrid();
}

function getNeighborIndices(idx) {
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  const result = [];
  if (row > 0)        result.push(idx - COLS);
  if (row < ROWS - 1) result.push(idx + COLS);
  if (col > 0)        result.push(idx - 1);
  if (col < COLS - 1) result.push(idx + 1);
  return result;
}

function isSolved() {
  for (let i = 0; i < TILE_COUNT - 1; i++) {
    if (grid[i] !== i + 1) return false;
  }
  return grid[TILE_COUNT - 1] === EMPTY;
}

// ─── Input ────────────────────────────────────────────────────────────────────
function handleClick(e) {
  if (!isOpen) return;
  const rect  = boardCanvas.getBoundingClientRect();
  const scaleX = BOARD_PX / rect.width;
  const scaleY = BOARD_PX / rect.height;
  const mx    = (e.clientX - rect.left) * scaleX;
  const my    = (e.clientY - rect.top)  * scaleY;
  const col   = Math.floor(mx / TILE_PX);
  const row   = Math.floor(my / TILE_PX);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const clickedIdx = row * COLS + col;
  const emptyIdx   = grid.indexOf(EMPTY);

  if (!getNeighborIndices(emptyIdx).includes(clickedIdx)) {
    // Плитка не рядом с пустым слотом
    statusEl.textContent = "Можно двигать только плитки рядом с пустым местом";
    return;
  }

  // Начинаем таймер при первом ходе
  if (!startTime) {
    startTime = Date.now();
    startTimer();
  }

  // Меняем местами
  [grid[emptyIdx], grid[clickedIdx]] = [grid[clickedIdx], grid[emptyIdx]];
  statusEl.textContent = "";
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

/**
 * Рисуем спрайт в offscreen-квадрат BOARD_PX×BOARD_PX.
 * Берём центральную квадратную область источника.
 */
function buildOffscreen(img) {
  offscreen = document.createElement("canvas");
  offscreen.width  = BOARD_PX;
  offscreen.height = BOARD_PX;
  const oc = offscreen.getContext("2d");

  // Центрируем по короткой стороне
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
  } else {
    rc.fillStyle = "#333";
    rc.fillRect(0, 0, 90, 90);
    rc.fillStyle = "#888";
    rc.font = "11px monospace";
    rc.fillText("...", 32, 50);
  }
}

function drawBoard() {
  boardCtx.clearRect(0, 0, BOARD_PX, BOARD_PX);

  // Тёмный фон
  boardCtx.fillStyle = "#0d0820";
  boardCtx.fillRect(0, 0, BOARD_PX, BOARD_PX);

  for (let i = 0; i < TILE_COUNT; i++) {
    const tileNum = grid[i];
    const drawCol = i % COLS;
    const drawRow = Math.floor(i / COLS);
    const dx = drawCol * TILE_PX;
    const dy = drawRow * TILE_PX;

    if (tileNum === EMPTY) {
      // Пустой слот
      boardCtx.fillStyle = "#1a0f3a";
      boardCtx.fillRect(dx + 1, dy + 1, TILE_PX - 2, TILE_PX - 2);
      // Пунктирная граница
      boardCtx.strokeStyle = "rgba(120,80,200,0.3)";
      boardCtx.lineWidth = 1;
      boardCtx.setLineDash([6, 4]);
      boardCtx.strokeRect(dx + 2, dy + 2, TILE_PX - 4, TILE_PX - 4);
      boardCtx.setLineDash([]);
      continue;
    }

    // Какой фрагмент изображения показывает эта плитка
    const srcNum  = tileNum - 1; // 0-based
    const srcCol  = srcNum % COLS;
    const srcRow  = Math.floor(srcNum / COLS);

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

    // Граница плитки
    boardCtx.strokeStyle = "rgba(180,130,255,0.55)";
    boardCtx.lineWidth = 1.5;
    boardCtx.strokeRect(dx + 0.75, dy + 0.75, TILE_PX - 1.5, TILE_PX - 1.5);

    // Маленький номер (помогает при отладке, можно убрать)
    // boardCtx.fillStyle = "rgba(255,255,255,0.25)";
    // boardCtx.font = "11px monospace";
    // boardCtx.fillText(tileNum, dx + 4, dy + 14);
  }

  // Линии сетки поверх
  boardCtx.strokeStyle = "rgba(100,60,180,0.7)";
  boardCtx.lineWidth = 2;
  boardCtx.setLineDash([]);
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

  // Рисуем цельную картинку поверх доски
  boardCtx.clearRect(0, 0, BOARD_PX, BOARD_PX);
  if (offscreen) boardCtx.drawImage(offscreen, 0, 0);

  // Зелёная рамка победы
  boardCtx.strokeStyle = "#44ff88";
  boardCtx.lineWidth = 5;
  boardCtx.strokeRect(3, 3, BOARD_PX - 6, BOARD_PX - 6);

  // Надпись поверх
  boardCtx.fillStyle = "rgba(0,0,0,0.55)";
  boardCtx.fillRect(0, BOARD_PX / 2 - 36, BOARD_PX, 72);
  boardCtx.fillStyle = "#ffdd55";
  boardCtx.font = "bold 28px monospace";
  boardCtx.textAlign = "center";
  boardCtx.fillText("✨ Собрано!", BOARD_PX / 2, BOARD_PX / 2 - 4);
  boardCtx.font = "18px monospace";
  boardCtx.fillStyle = "#aaffcc";
  boardCtx.fillText(formatTime(timeMs), BOARD_PX / 2, BOARD_PX / 2 + 28);
  boardCtx.textAlign = "left";

  statusEl.textContent = `🎉 Пазл решён за ${formatTime(timeMs)}!`;
  renderBest();

  // Кнопка «Ещё раз»
  const old = overlay.querySelector("#puzzleRetryBtn");
  if (old) old.remove();
  const btn = document.createElement("button");
  btn.id = "puzzleRetryBtn";
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
