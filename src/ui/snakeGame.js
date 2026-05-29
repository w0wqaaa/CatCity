/**
 * Snake mini-game
 * WASD / Стрелки — направление, Shift — ускорение
 * Записывает рекорд по очкам и времени.
 */

const CELL   = 20;          // px одной клетки
const COLS   = 20;          // клеток по горизонтали
const ROWS   = 20;          // клеток по вертикали
const W      = CELL * COLS; // 400
const H      = CELL * ROWS; // 400

const SPEED_NORMAL = 140;   // ms на шаг
const SPEED_BOOST  = 65;    // ms при Shift

// Цвета в стиле пазла (тёмно-фиолетовая тема)
const COLOR_BG      = "#0d0820";
const COLOR_GRID    = "rgba(60, 35, 120, 0.35)";
const COLOR_HEAD    = "#cc88ff";
const COLOR_BODY    = "#7744cc";
const COLOR_BODY2   = "#5533aa";  // чередование
const COLOR_FOOD    = "#ffdd55";
const COLOR_FOOD_GL = "rgba(255,220,80,0.3)";
const COLOR_DEAD    = "#ff4466";
const COLOR_WALL    = "rgba(120, 60, 200, 0.6)";

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlay     = null;
let gameCanvas  = null;
let gameCtx     = null;
let timerEl     = null;
let scoreEl     = null;
let bestEl      = null;
let instrPanel  = null;
let shiftHint   = null;

// ─── Состояние ────────────────────────────────────────────────────────────────
let snake        = [];       // [{x,y}, ...]  голова — [0]
let dir          = { x: 1, y: 0 };
let nextDir      = { x: 1, y: 0 };
let food         = null;
let score        = 0;
let alive        = true;
let started      = false;
let startTime    = null;
let elapsed      = 0;
let timerRAF     = null;
let stepTimer    = null;
let isShift      = false;
let instrShown   = false;
let isOpen       = false;
let snakeResults = [];
let currentPlayer = "";
let onCloseCallback = null;

const keyListener = (e) => handleKey(e);

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initSnakeGame() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "snakeOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="snakePanel">

      <div id="snakeTopBar">
        <span id="snakeTitle">🐍 Змейка</span>
        <span id="snakeTimerBox">⏱ <span id="snakeTimerVal">00:00.0</span></span>
        <div id="snakeTopButtons">
          <button id="snakeHowBtn"  type="button" title="Как играть">?</button>
          <button id="snakeExitBtn" type="button">✕ Выйти</button>
        </div>
      </div>

      <div id="snakeInstr" class="hidden">
        <div id="snakeInstrContent">
          <div class="sk-instr-title">🐍 Как играть</div>
          <ul class="sk-instr-list">
            <li><b>WASD</b> или <b>стрелки</b> — управление змейкой.</li>
            <li>Собирай <b style="color:#ffdd55">★ еду</b> — хвост растёт, очки растут.</li>
            <li>Врежешься в стену или себя — <b>игра окончена</b>.</li>
            <li>Зажми <b>Shift</b> для <b>ускорения</b> — рискованно, но быстрее набираешь очки!</li>
            <li>Рекорд считается по <b>количеству еды</b> и времени выживания.</li>
          </ul>
          <button id="snakeInstrClose" type="button">Понял, играть!</button>
        </div>
      </div>

      <div id="snakeBoardWrap">
        <canvas id="snakeBoard" width="${W}" height="${H}"></canvas>
        <div id="snakeSide">
          <div class="sk-side-label">Счёт</div>
          <div id="snakeScore">0</div>
          <div class="sk-side-label" style="margin-top:10px">Shift</div>
          <div id="snakeShiftHint" class="sk-shift-off">обычная<br>скорость</div>
          <div id="snakeBest"></div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  gameCanvas = overlay.querySelector("#snakeBoard");
  gameCtx    = gameCanvas.getContext("2d");
  timerEl    = overlay.querySelector("#snakeTimerVal");
  scoreEl    = overlay.querySelector("#snakeScore");
  bestEl     = overlay.querySelector("#snakeBest");
  instrPanel = overlay.querySelector("#snakeInstr");
  shiftHint  = overlay.querySelector("#snakeShiftHint");

  overlay.querySelector("#snakeExitBtn").addEventListener("click", closeSnake);
  overlay.querySelector("#snakeHowBtn").addEventListener("click", showInstr);
  overlay.querySelector("#snakeInstrClose").addEventListener("click", hideInstr);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function isSnakeOpen() { return isOpen; }

export function openSnakeGame({ playerName = "Игрок", onClose = null, savedResults = [] } = {}) {
  initSnakeGame();
  currentPlayer   = playerName;
  onCloseCallback = onClose;
  snakeResults    = Array.isArray(savedResults) ? [...savedResults] : [];
  isOpen          = true;
  overlay.classList.remove("hidden");

  resetGame();
  renderBest();
  drawGame();
  showInstr();

  window.addEventListener("keydown", keyListener, true);
  window.addEventListener("keyup",   keyUpListener, true);
}

export function getSnakeResults() { return [...snakeResults]; }

// ─── Инструкция ───────────────────────────────────────────────────────────────
function showInstr() {
  instrShown = true;
  instrPanel.classList.remove("hidden");
}
function hideInstr() {
  instrShown = false;
  instrPanel.classList.add("hidden");
}

// ─── Close ────────────────────────────────────────────────────────────────────
function closeSnake() {
  stopAll();
  isOpen     = false;
  instrShown = false;
  instrPanel.classList.add("hidden");
  overlay.classList.add("hidden");
  window.removeEventListener("keydown", keyListener, true);
  window.removeEventListener("keyup",   keyUpListener, true);
  if (onCloseCallback) onCloseCallback();
}

function stopAll() {
  if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
  if (timerRAF)  { cancelAnimationFrame(timerRAF); timerRAF = null; }
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetGame() {
  stopAll();
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  snake     = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
  dir       = { x: 1, y: 0 };
  nextDir   = { x: 1, y: 0 };
  food      = spawnFood();
  score     = 0;
  alive     = true;
  started   = false;
  startTime = null;
  elapsed   = 0;
  isShift   = false;
  timerEl.textContent = "00:00.0";
  scoreEl.textContent = "0";
  setShiftHint(false);
}

function spawnFood() {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  let fx, fy;
  do {
    fx = Math.floor(Math.random() * COLS);
    fy = Math.floor(Math.random() * ROWS);
  } while (occupied.has(`${fx},${fy}`));
  return { x: fx, y: fy };
}

// ─── Input ────────────────────────────────────────────────────────────────────
const DIR_MAP = {
  KeyW: { x: 0, y: -1 }, ArrowUp:    { x: 0, y: -1 },
  KeyS: { x: 0, y:  1 }, ArrowDown:  { x: 0, y:  1 },
  KeyA: { x: -1, y: 0 }, ArrowLeft:  { x: -1, y: 0 },
  KeyD: { x:  1, y: 0 }, ArrowRight: { x:  1, y: 0 },
};

function handleKey(e) {
  if (!isOpen) return;

  // Блокируем управление игрой пока змейка открыта
  const moveKeys = new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight"]);
  if (moveKeys.has(e.code)) {
    e.stopPropagation();
    e.preventDefault();
  }

  if (instrShown) {
    if (e.code === "Enter" || e.code === "Space") hideInstr();
    return;
  }

  // Shift — ускорение
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    isShift = true;
    setShiftHint(true);
    if (started && alive) rescheduleStep();
    return;
  }

  const d = DIR_MAP[e.code];
  if (!d) return;

  // Нельзя развернуться на 180°
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;

  // Старт при первом нажатии
  if (!started && alive) {
    started   = true;
    startTime = Date.now();
    startTimer();
    scheduleStep();
  }
}

function keyUpListener(e) {
  if (!isOpen) return;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    isShift = false;
    setShiftHint(false);
    if (started && alive) rescheduleStep();
  }
}

function setShiftHint(on) {
  if (!shiftHint) return;
  shiftHint.className = on ? "sk-shift-on" : "sk-shift-off";
  shiftHint.innerHTML = on ? "⚡ ускорение!" : "обычная<br>скорость";
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function scheduleStep() {
  if (stepTimer) clearTimeout(stepTimer);
  stepTimer = setTimeout(step, isShift ? SPEED_BOOST : SPEED_NORMAL);
}

function rescheduleStep() {
  // Отменяем текущий шаг и ставим с новой скоростью
  if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
  stepTimer = setTimeout(step, isShift ? SPEED_BOOST : SPEED_NORMAL);
}

function step() {
  stepTimer = null;
  if (!alive || !started) return;

  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Проверяем стену
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    die(); return;
  }
  // Проверяем себя
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    die(); return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    food = spawnFood();
  } else {
    snake.pop();
  }

  drawGame();
  scheduleStep();
}

function die() {
  alive = false;
  stopAll();
  elapsed = startTime ? Date.now() - startTime : 0;

  // Сохраняем результат
  snakeResults.push({ player: currentPlayer, score, timeMs: elapsed });
  snakeResults.sort((a, b) => b.score - a.score || a.timeMs - b.timeMs);
  snakeResults = snakeResults.slice(0, 10);

  drawGame(true);
  renderBest();

  // Кнопка «Ещё раз»
  const old = overlay.querySelector("#snakeRetryBtn");
  if (old) old.remove();
  const btn = document.createElement("button");
  btn.id   = "snakeRetryBtn";
  btn.type = "button";
  btn.textContent = "🔄 Ещё раз";
  btn.addEventListener("click", () => {
    btn.remove();
    resetGame();
    drawGame();
  });
  overlay.querySelector("#snakeSide").appendChild(btn);
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  if (timerRAF) cancelAnimationFrame(timerRAF);
  (function tick() {
    if (!startTime) return;
    const ms = alive ? Date.now() - startTime : elapsed;
    timerEl.textContent = formatTime(ms);
    if (alive) timerRAF = requestAnimationFrame(tick);
  })();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawGame(isDead = false) {
  const ctx = gameCtx;
  ctx.clearRect(0, 0, W, H);

  // Фон
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  // Сетка
  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
  }

  // Граница поля
  ctx.strokeStyle = COLOR_WALL;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // Еда
  if (food) {
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    // Свечение
    const grd = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL * 0.8);
    grd.addColorStop(0, COLOR_FOOD_GL);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(food.x * CELL - CELL, food.y * CELL - CELL, CELL * 3, CELL * 3);
    // Звезда-еда
    ctx.fillStyle = COLOR_FOOD;
    ctx.font = `${CELL - 2}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", fx, fy + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  // Змейка
  snake.forEach((seg, i) => {
    const x = seg.x * CELL;
    const y = seg.y * CELL;
    const pad = 1;

    if (i === 0) {
      // Голова
      ctx.fillStyle = isDead ? COLOR_DEAD : COLOR_HEAD;
      ctx.shadowColor = isDead ? COLOR_DEAD : COLOR_HEAD;
      ctx.shadowBlur  = 8;
      roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Глаза
      const eyeColor = isDead ? "#220011" : "#1a0a2e";
      ctx.fillStyle = eyeColor;
      const ex = dir.x === -1 ? x + 3 : dir.x === 1 ? x + CELL - 7 : x + 4;
      const ey = dir.y === -1 ? y + 3 : dir.y === 1 ? y + CELL - 7 : y + 4;
      const ex2 = dir.x === 0 ? x + CELL - 7 : ex;
      const ey2 = dir.y === 0 ? y + CELL - 7 : ey;
      ctx.fillRect(ex, ey, 3, 3);
      ctx.fillRect(ex2, ey2, 3, 3);
    } else {
      // Тело (чередование цвета)
      ctx.fillStyle = isDead ? "rgba(180,50,80,0.7)" : (i % 2 === 0 ? COLOR_BODY : COLOR_BODY2);
      ctx.shadowBlur = 0;
      roundRect(ctx, x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 3);
      ctx.fill();
    }
  });

  // Если не начали — подсказка
  if (!started && alive) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, H / 2 - 28, W, 56);
    ctx.fillStyle = "#cc99ff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Нажми WASD или стрелки", W / 2, H / 2 - 6);
    ctx.font = "13px monospace";
    ctx.fillStyle = "#9977cc";
    ctx.fillText("чтобы начать", W / 2, H / 2 + 16);
    ctx.textAlign = "left";
  }

  // Смерть — надпись поверх
  if (isDead) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, H / 2 - 48, W, 96);
    ctx.fillStyle = COLOR_DEAD;
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("💀 Игра окончена", W / 2, H / 2 - 10);
    ctx.font = "17px monospace";
    ctx.fillStyle = "#ffdd55";
    ctx.fillText(`Счёт: ${score}  •  ${formatTime(elapsed)}`, W / 2, H / 2 + 22);
    ctx.textAlign = "left";
  }
}

// ─── Best ─────────────────────────────────────────────────────────────────────
function renderBest() {
  if (!bestEl) return;
  if (!snakeResults.length) {
    bestEl.innerHTML = "<span class='sk-no-results'>Нет результатов</span>";
    return;
  }
  bestEl.innerHTML = "<b>Рекорды:</b>" +
    snakeResults.slice(0, 5).map((r, i) =>
      `<span class='sk-row'>${i + 1}. ${r.player} — ${r.score}★ / ${formatTime(r.timeMs)}</span>`
    ).join("");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatTime(ms) {
  const s = Math.max(0, ms || 0);
  const m = Math.floor(s / 60000);
  const sec = Math.floor((s % 60000) / 1000);
  const t = Math.floor((s % 1000) / 100);
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}.${t}`;
}
