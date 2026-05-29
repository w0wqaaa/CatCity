/**
 * Classic Tetris mini-game
 * WASD/стрелки — движение, W/↑ — поворот, Space — падение, Shift — hold, P — пауза
 */

// ─── Константы ────────────────────────────────────────────────────────────────
const COLS      = 10;
const ROWS      = 20;
const CELL      = 26;           // px на клетку
const W         = COLS * CELL;  // 260
const H         = ROWS * CELL;  // 520
const PREVIEW_CELL = 18;

// Скорость падения по уровням (ms)
const LEVEL_SPEED = [800,720,630,550,470,380,300,220,160,120,100,90,80,70,60,50,50,50,50,50];

// Цвета тетромино (тёмно-фиолетовая тема)
const COLORS = {
  I: { fill: "#22d4f5", dark: "#0d8faa", shine: "#88eeff" },
  O: { fill: "#f5c542", dark: "#aa8a10", shine: "#ffe590" },
  T: { fill: "#b044f5", dark: "#6a22aa", shine: "#d888ff" },
  S: { fill: "#44f578", dark: "#1a9940", shine: "#88ffaa" },
  Z: { fill: "#f54444", dark: "#aa1a1a", shine: "#ff8888" },
  J: { fill: "#4488f5", dark: "#1a44aa", shine: "#88aaff" },
  L: { fill: "#f58c44", dark: "#aa5010", shine: "#ffbb88" },
};
const BG_COLOR    = "#08041a";
const GRID_COLOR  = "rgba(50,25,100,0.3)";
const GHOST_ALPHA = 0.18;

// ─── Тетромино (вращение по часовой) ─────────────────────────────────────────
const PIECES = {
  I: [
    [[0,0],[1,0],[2,0],[3,0]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: [
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
  ],
  T: [
    [[0,1],[1,1],[2,1],[1,0]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[1,1],[1,2],[0,1]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
};
const PIECE_KEYS = Object.keys(PIECES);

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlay    = null;
let boardCanvas = null;
let boardCtx   = null;
let nextCanvas = null;
let nextCtx    = null;
let holdCanvas = null;
let holdCtx    = null;
let timerEl    = null;
let scoreEl    = null;
let linesEl    = null;
let levelEl    = null;
let bestEl     = null;
let instrPanel = null;

// ─── Состояние ────────────────────────────────────────────────────────────────
let board      = [];   // ROWS×COLS, null или цвет
let current    = null; // { type, rot, x, y }
let nextPiece  = null;
let holdPiece  = null;
let holdUsed   = false;
let score      = 0;
let lines      = 0;
let level      = 0;
let gameOver   = false;
let paused     = false;
let started    = false;
let startTime  = null;
let elapsed    = 0;
let dropTimer  = null;
let timerRAF   = null;
let isOpen     = false;
let instrShown = false;
let tetrisResults = [];
let currentPlayer = "";
let onCloseCb  = null;

const keyDn = e => onKey(e, true);
const keyUp = e => onKey(e, false);

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initTetrisGame() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "tetrisOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="tetrisPanel">

      <div id="tetrisTopBar">
        <span id="tetrisTitle">🧩 Тетрис</span>
        <span id="tetrisTimerBox">⏱ <span id="tetrisTimerVal">00:00</span></span>
        <div id="tetrisTopBtns">
          <button id="tetrisHowBtn" type="button" title="Как играть">?</button>
          <button id="tetrisExitBtn" type="button">✕ Выйти</button>
        </div>
      </div>

      <div id="tetrisInstr" class="hidden">
        <div id="tetrisInstrContent">
          <div class="tet-instr-title">🧩 Тетрис — Управление</div>
          <ul class="tet-instr-list">
            <li><b>A / ←</b> — влево,&nbsp; <b>D / →</b> — вправо</li>
            <li><b>W / ↑</b> — повернуть фигуру</li>
            <li><b>S / ↓</b> — мягкое падение (быстрее)</li>
            <li><b>Space</b> — мгновенный сброс вниз</li>
            <li><b>Shift</b> — отложить фигуру (hold)</li>
            <li><b>P</b> — пауза</li>
            <li>Собирай полные горизонтальные линии!</li>
            <li>Tetris (4 линии сразу) = максимум очков.</li>
          </ul>
          <button id="tetrisInstrClose" type="button">Играть!</button>
        </div>
      </div>

      <div id="tetrisBoardWrap">
        <canvas id="tetrisBoard" width="${W}" height="${H}"></canvas>
        <div id="tetrisSide">
          <div class="tet-side-label">Следующая</div>
          <canvas id="tetrisNext" width="${PREVIEW_CELL*4}" height="${PREVIEW_CELL*4}"></canvas>
          <div class="tet-side-label" style="margin-top:8px">Hold</div>
          <canvas id="tetrisHold" width="${PREVIEW_CELL*4}" height="${PREVIEW_CELL*4}"></canvas>
          <div class="tet-side-label" style="margin-top:8px">Счёт</div>
          <div id="tetrisScore">0</div>
          <div class="tet-side-label" style="margin-top:6px">Линий</div>
          <div id="tetrisLines">0</div>
          <div class="tet-side-label" style="margin-top:6px">Уровень</div>
          <div id="tetrisLevel">1</div>
          <div id="tetrisBest"></div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  boardCanvas = overlay.querySelector("#tetrisBoard");
  boardCtx    = boardCanvas.getContext("2d");
  nextCanvas  = overlay.querySelector("#tetrisNext");
  nextCtx     = nextCanvas.getContext("2d");
  holdCanvas  = overlay.querySelector("#tetrisHold");
  holdCtx     = holdCanvas.getContext("2d");
  timerEl     = overlay.querySelector("#tetrisTimerVal");
  scoreEl     = overlay.querySelector("#tetrisScore");
  linesEl     = overlay.querySelector("#tetrisLines");
  levelEl     = overlay.querySelector("#tetrisLevel");
  bestEl      = overlay.querySelector("#tetrisBest");
  instrPanel  = overlay.querySelector("#tetrisInstr");

  overlay.querySelector("#tetrisExitBtn").addEventListener("click", closeTetris);
  overlay.querySelector("#tetrisHowBtn").addEventListener("click", showInstr);
  overlay.querySelector("#tetrisInstrClose").addEventListener("click", hideInstr);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function isTetrisOpen() { return isOpen; }

export function openTetrisGame({ playerName = "Игрок", onClose = null, savedResults = [] } = {}) {
  initTetrisGame();
  currentPlayer = playerName;
  onCloseCb     = onClose;
  tetrisResults = Array.isArray(savedResults) ? [...savedResults] : [];
  isOpen        = true;
  overlay.classList.remove("hidden");
  resetGame();
  renderBest();
  showInstr();
  drawAll();
  window.addEventListener("keydown", keyDn, true);
  window.addEventListener("keyup",   keyUp, true);
}

export function getTetrisResults() { return [...tetrisResults]; }

// ─── Инструкция ───────────────────────────────────────────────────────────────
function showInstr() { instrShown = true; instrPanel.classList.remove("hidden"); }
function hideInstr() {
  instrShown = false;
  instrPanel.classList.add("hidden");
  if (!started && !gameOver) startGame();
}

// ─── Close ────────────────────────────────────────────────────────────────────
function closeTetris() {
  stopAll();
  isOpen = false;
  instrPanel.classList.add("hidden");
  overlay.classList.add("hidden");
  window.removeEventListener("keydown", keyDn, true);
  window.removeEventListener("keyup",   keyUp, true);
  if (onCloseCb) onCloseCb();
}

function stopAll() {
  if (dropTimer) { clearTimeout(dropTimer); dropTimer = null; }
  if (timerRAF)  { cancelAnimationFrame(timerRAF); timerRAF = null; }
}

// ─── Reset / Start ────────────────────────────────────────────────────────────
function resetGame() {
  stopAll();
  board     = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  current   = null;
  nextPiece = randomPiece();
  holdPiece = null;
  holdUsed  = false;
  score     = 0; lines = 0; level = 0;
  gameOver  = false; paused = false; started = false;
  startTime = null; elapsed = 0;
  timerEl.textContent = "00:00";
  scoreEl.textContent = "0";
  linesEl.textContent = "0";
  levelEl.textContent = "1";
}

function startGame() {
  if (started) return;
  started   = true;
  startTime = Date.now();
  spawnPiece();
  scheduleDrop();
  startTimer();
}

// ─── Pieces ───────────────────────────────────────────────────────────────────
function randomPiece() {
  return PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
}

function spawnPiece() {
  const type = nextPiece;
  nextPiece  = randomPiece();
  current    = { type, rot: 0, x: Math.floor(COLS / 2) - 2, y: 0 };
  holdUsed   = false;

  if (collides(current)) {
    gameOver = true;
    stopAll();
    saveResult();
    drawAll();
    renderBest();
    showRetryButton();
  } else {
    drawAll();
  }
}

function cells(piece) {
  return PIECES[piece.type][piece.rot].map(([cx, cy]) => ({
    x: piece.x + cx,
    y: piece.y + cy,
  }));
}

function collides(piece) {
  return cells(piece).some(({ x, y }) =>
    x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y]?.[x] !== null)
  );
}

// ─── Movement ─────────────────────────────────────────────────────────────────
function moveLeft()  { tryMove(-1, 0, current.rot); }
function moveRight() { tryMove(1, 0, current.rot); }
function softDrop()  {
  if (!tryMove(0, 1, current.rot)) lockPiece();
  else { score += 1; scoreEl.textContent = score; }
}

function tryMove(dx, dy, rot) {
  if (!current || gameOver || paused) return false;
  const next = { ...current, x: current.x + dx, y: current.y + dy, rot };
  if (!collides(next)) { current = next; drawAll(); return true; }
  return false;
}

function rotate() {
  if (!current || gameOver || paused) return;
  const newRot = (current.rot + 1) % 4;
  // Wall kick: try normal, then ±1x, then ±2x
  for (const dx of [0, -1, 1, -2, 2]) {
    const next = { ...current, rot: newRot, x: current.x + dx };
    if (!collides(next)) { current = next; drawAll(); return; }
  }
}

function hardDrop() {
  if (!current || gameOver || paused) return;
  let dropped = 0;
  while (!collides({ ...current, y: current.y + 1 })) {
    current.y++;
    dropped++;
  }
  score += dropped * 2;
  scoreEl.textContent = score;
  lockPiece();
}

function holdSwap() {
  if (!current || gameOver || paused || holdUsed) return;
  const prev = holdPiece;
  holdPiece = current.type;
  holdUsed  = true;
  if (prev) {
    current = { type: prev, rot: 0, x: Math.floor(COLS / 2) - 2, y: 0 };
    if (collides(current)) { gameOver = true; stopAll(); saveResult(); }
  } else {
    spawnPiece();
  }
  drawAll();
}

// ─── Lock & Line clear ────────────────────────────────────────────────────────
function lockPiece() {
  if (!current) return;
  cells(current).forEach(({ x, y }) => {
    if (y >= 0) board[y][x] = current.type;
  });
  clearLines();
  spawnPiece();
  scheduleDrop();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; ) {
    if (board[r].every(c => c !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
    } else {
      r--;
    }
  }
  if (!cleared) return;

  const points = [0, 40, 100, 300, 1200][cleared] * (level + 1);
  score += points;
  lines += cleared;
  level  = Math.min(19, Math.floor(lines / 10));
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level + 1;
}

// ─── Drop scheduler ───────────────────────────────────────────────────────────
function scheduleDrop() {
  if (dropTimer) clearTimeout(dropTimer);
  if (gameOver || paused || !started) return;
  dropTimer = setTimeout(() => {
    if (!current || gameOver || paused) return;
    if (!tryMove(0, 1, current.rot)) lockPiece();
    else scheduleDrop();
  }, LEVEL_SPEED[level] || 50);
}

// ─── Input ────────────────────────────────────────────────────────────────────
const pressedKeys = {};
let moveRepeat = null;

function onKey(e, down) {
  if (!isOpen) return;
  const blocked = new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","ShiftLeft","ShiftRight","KeyP","KeyX","KeyZ"]);
  if (blocked.has(e.code)) { e.stopPropagation(); e.preventDefault(); }

  pressedKeys[e.code] = down;

  if (!down) { if (moveRepeat && !pressedKeys["KeyA"] && !pressedKeys["ArrowLeft"] && !pressedKeys["KeyD"] && !pressedKeys["ArrowRight"]) { clearInterval(moveRepeat); moveRepeat = null; } return; }

  if (instrShown) { if (e.code === "Enter" || e.code === "Space") hideInstr(); return; }
  if (!started) { if (!instrShown) startGame(); return; }

  switch (e.code) {
    case "KeyA": case "ArrowLeft":
      moveLeft();
      if (!moveRepeat) moveRepeat = setInterval(moveLeft, 80);
      break;
    case "KeyD": case "ArrowRight":
      moveRight();
      if (!moveRepeat) moveRepeat = setInterval(moveRight, 80);
      break;
    case "KeyS": case "ArrowDown": softDrop(); break;
    case "KeyW": case "ArrowUp":   rotate();   break;
    case "Space":                   hardDrop(); break;
    case "ShiftLeft": case "ShiftRight": holdSwap(); break;
    case "KeyP":
      paused = !paused;
      if (paused) stopAll();
      else { scheduleDrop(); startTimer(); }
      drawAll();
      break;
  }
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  if (timerRAF) cancelAnimationFrame(timerRAF);
  (function tick() {
    if (!startTime || gameOver || paused) return;
    elapsed = Date.now() - startTime;
    const s = Math.floor(elapsed / 1000);
    timerEl.textContent = `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
    timerRAF = requestAnimationFrame(tick);
  })();
}

// ─── Save result ──────────────────────────────────────────────────────────────
function saveResult() {
  tetrisResults.push({ player: currentPlayer, score, lines, timeMs: elapsed });
  tetrisResults.sort((a, b) => b.score - a.score);
  tetrisResults = tetrisResults.slice(0, 10);
}

function showRetryButton() {
  const old = overlay.querySelector("#tetrisRetryBtn");
  if (old) old.remove();
  const btn = document.createElement("button");
  btn.id = "tetrisRetryBtn"; btn.type = "button"; btn.textContent = "🔄 Ещё раз";
  btn.addEventListener("click", () => { btn.remove(); resetGame(); showInstr(); drawAll(); });
  overlay.querySelector("#tetrisSide").appendChild(btn);
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawAll() {
  drawBoard();
  drawPreview(nextCtx, nextPiece);
  drawPreview(holdCtx, holdPiece, holdUsed);
}

function drawBoard() {
  const ctx = boardCtx;
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  // Сетка
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,H); ctx.stroke(); }
  for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(W,r*CELL); ctx.stroke(); }

  // Зафиксированные блоки
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r, board[r][c], CELL);
    }
  }

  // Призрак (ghost)
  if (current && !gameOver && !paused) {
    let ghost = { ...current };
    while (!collides({ ...ghost, y: ghost.y + 1 })) ghost.y++;
    ctx.save();
    ctx.globalAlpha = GHOST_ALPHA;
    cells(ghost).forEach(({ x, y }) => { if (y >= 0) drawCell(ctx, x, y, ghost.type, CELL); });
    ctx.restore();
  }

  // Текущая фигура
  if (current && !gameOver) {
    cells(current).forEach(({ x, y }) => { if (y >= 0) drawCell(ctx, x, y, current.type, CELL); });
  }

  // Оверлей пауза / конец
  if (paused) drawBoardOverlay("⏸ ПАУЗА", "P — продолжить", "rgba(20,10,50,0.75)");
  if (gameOver) drawBoardOverlay("ИГРА ОКОНЧЕНА", `Счёт: ${score}`, "rgba(60,0,0,0.8)");
}

function drawCell(ctx, col, row, type, size) {
  const x = col * size;
  const y = row * size;
  const c = COLORS[type] || { fill:"#888", dark:"#444", shine:"#ccc" };
  const p = 1;
  ctx.fillStyle = c.dark;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = c.fill;
  ctx.fillRect(x+p, y+p, size-p*2, size-p*2);
  // Блик сверху-слева
  ctx.fillStyle = c.shine;
  ctx.fillRect(x+p, y+p, size-p*2, p*2);
  ctx.fillRect(x+p, y+p, p*2, size-p*2);
}

function drawPreview(ctx, type, dimmed = false) {
  const size = PREVIEW_CELL * 4;
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);
  if (!type) return;
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.4;
  const shape = PIECES[type][0];
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([,y]) => y));
  const maxX = Math.max(...shape.map(([x]) => x));
  const maxY = Math.max(...shape.map(([,y]) => y));
  const offX = Math.floor((4 - (maxX - minX + 1)) / 2) - minX;
  const offY = Math.floor((4 - (maxY - minY + 1)) / 2) - minY;
  shape.forEach(([cx, cy]) => drawCell(ctx, cx + offX, cy + offY, type, PREVIEW_CELL));
  ctx.restore();
}

function drawBoardOverlay(title, sub, bg) {
  const ctx = boardCtx;
  ctx.fillStyle = bg;
  ctx.fillRect(0, H/2 - 44, W, 88);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, W/2, H/2 - 10);
  ctx.font = "13px monospace";
  ctx.fillStyle = "#ccc";
  ctx.fillText(sub, W/2, H/2 + 16);
  ctx.textAlign = "left";
}

// ─── Best ─────────────────────────────────────────────────────────────────────
function renderBest() {
  if (!bestEl) return;
  if (!tetrisResults.length) { bestEl.innerHTML = "<span class='tet-no-results'>Нет результатов</span>"; return; }
  bestEl.innerHTML = "<b>Рекорды:</b>" +
    tetrisResults.slice(0, 5).map((r, i) =>
      `<span class='tet-row'>${i+1}. ${r.player} — ${r.score}</span>`
    ).join("");
}
