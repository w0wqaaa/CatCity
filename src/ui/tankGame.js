/**
 * Tank Battle Mini-Game — стиль Battle City (Денди/Сега)
 * Игрок защищает базу от ботов. WASD/стрелки — движение, Space — выстрел.
 * Будущий мультиплеер: 2 игрока на одной клавиатуре.
 */

// ─── Константы ───────────────────────────────────────────────────────────────
const CELL  = 16;
const COLS  = 26;
const ROWS  = 26;
const W     = CELL * COLS; // 416
const H     = CELL * ROWS; // 416

const EMPTY = 0;
const BRICK = 1;
const STEEL = 2;
const HQ    = 3;

const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const DX  = [0, 1, 0, -1];
const DY  = [-1, 0, 1, 0];

const PLAYER_SPEED  = 120; // ms на клетку
const BOT_SPEED     = 260;
const BULLET_SPEED  = 40;
const BOT_SHOOT_INTERVAL = 1600;
const BOT_THINK_INTERVAL = 700;
const MAX_LIVES     = 3;
const BOT_COUNT     = 3;
const BOT_MAX_ALIVE = 2; // одновременно на поле

// ─── Палитра (тёмно-фиолетовая тема) ─────────────────────────────────────────
const C = {
  bg:          "#0a0618",
  grid:        "rgba(50,25,100,0.25)",
  brick:       "#8b3a1a",
  brickShade:  "#5a2210",
  steel:       "#5a5a8a",
  steelShine:  "#8888bb",
  hq:          "#ffd700",
  hqShade:     "#aa8800",
  playerBody:  "#44ccaa",
  playerLight: "#88ffdd",
  playerDark:  "#228866",
  botBody:     "#cc4444",
  botLight:    "#ff8888",
  botDark:     "#882222",
  bullet:      "#ffff88",
  bulletGlow:  "rgba(255,255,100,0.4)",
  explosion:   ["#ff8800","#ffcc00","#ff4400","#ffffff"],
  dead:        "#ff4466",
};

// ─── Дефолтная карта (Battle City стиль) ─────────────────────────────────────
function buildMap() {
  const M = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

  // Стальные стены по краям
  for (let c = 0; c < COLS; c++) { M[0][c] = STEEL; M[ROWS-1][c] = STEEL; }
  for (let r = 0; r < ROWS; r++) { M[r][0] = STEEL; M[r][COLS-1] = STEEL; }

  // Паттерн кирпичей в стиле Battle City
  const bricks = [
    [2,2],[2,3],[3,2],[3,3],   [2,11],[3,11],  [2,22],[2,23],[3,22],[3,23],
    [2,6],[2,7],[3,6],[3,7],   [2,16],[2,17],[3,16],[3,17],
    [6,2],[6,3],[7,2],[7,3],   [6,6],[6,7],[7,6],[7,7],   [6,11],[7,11],   [6,16],[6,17],[7,16],[7,17],   [6,22],[6,23],[7,22],[7,23],
    [10,2],[10,3],[11,2],[11,3], [10,6],[10,7],[11,6],[11,7], [10,11],[11,11], [10,16],[10,17],[11,16],[11,17], [10,22],[10,23],[11,22],[11,23],
    [14,2],[14,3],[15,2],[15,3], [14,6],[14,7],[15,6],[15,7], [14,11],[15,11], [14,16],[14,17],[15,16],[15,17], [14,22],[14,23],[15,22],[15,23],
    [18,2],[18,3],[19,2],[19,3], [18,6],[18,7],[19,6],[19,7], [18,11],[19,11], [18,16],[18,17],[19,16],[19,17], [18,22],[18,23],[19,22],[19,23],
    // Защита базы
    [22,11],[22,12],[22,13],[22,14],[23,11],[23,14],
  ];
  for (const [r,c] of bricks) {
    if (r > 0 && r < ROWS-1 && c > 0 && c < COLS-1) M[r][c] = BRICK;
  }

  // Стальные острова
  const steels = [
    [5,11],[5,12],[5,13],
    [11,5],[12,5],[11,6],[12,6],
    [11,19],[12,19],[11,20],[12,20],
  ];
  for (const [r,c] of steels) {
    if (r > 0 && r < ROWS-1 && c > 0 && c < COLS-1) M[r][c] = STEEL;
  }

  // База (HQ) внизу по центру
  M[ROWS-2][COLS/2 - 1] = HQ;

  return M;
}

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlay    = null;
let canvas     = null;
let ctx        = null;
let timerEl    = null;
let scoreEl    = null;
let livesEl    = null;
let botsLeftEl = null;
let bestEl     = null;
let instrPanel = null;

// ─── Состояние игры ───────────────────────────────────────────────────────────
let map        = [];
let player     = null;
let bots       = [];
let bullets    = [];
let explosions = [];
let botsLeft   = 0;    // сколько ботов ещё придёт
let lives      = MAX_LIVES;
let score      = 0;
let gameOver   = false;
let victory    = false;
let started    = false;
let startTime  = null;
let elapsed    = 0;
let timerRAF   = null;
let isOpen     = false;
let instrShown = false;
let tankResults = [];
let currentPlayer = "";
let onCloseCb  = null;

// Ввод
const keys       = {};
const keyListen  = e => onKey(e, true);
const keyUListen = e => onKey(e, false);

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initTankGame() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "tankOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="tankPanel">
      <div id="tankTopBar">
        <span id="tankTitle">🎯 Танки</span>
        <span id="tankTimerBox">⏱ <span id="tankTimerVal">00:00</span></span>
        <div id="tankTopBtns">
          <button id="tankHowBtn" type="button" title="Как играть">?</button>
          <button id="tankExitBtn" type="button">✕ Выйти</button>
        </div>
      </div>

      <div id="tankInstr" class="hidden">
        <div id="tankInstrContent">
          <div class="tk-instr-title">🎯 Танки — Как играть</div>
          <ul class="tk-instr-list">
            <li><b>WASD</b> или <b>стрелки</b> — движение танка.</li>
            <li><b>Space</b> — выстрел. Один снаряд за раз.</li>
            <li>Уничтожь <b>всех ботов</b> — и победишь.</li>
            <li>Кирпичные стены <b style="color:#e06030">■</b> разрушаемы, стальные <b style="color:#8888bb">■</b> — нет.</li>
            <li>Защищай <b style="color:#ffd700">★ Базу</b> — если бот её уничтожит, игра окончена!</li>
            <li>У тебя <b>${MAX_LIVES} жизни</b>. При гибели — возрождаешься.</li>
            <li><b>Shift</b> — пауза.</li>
          </ul>
          <button id="tankInstrClose" type="button">Понял, в бой!</button>
        </div>
      </div>

      <div id="tankBoardWrap">
        <canvas id="tankBoard" width="${W}" height="${H}"></canvas>
        <div id="tankSide">
          <div class="tk-side-label">Жизни</div>
          <div id="tankLives">♥ ♥ ♥</div>
          <div class="tk-side-label" style="margin-top:8px">Счёт</div>
          <div id="tankScore">0</div>
          <div class="tk-side-label" style="margin-top:8px">Ботов</div>
          <div id="tankBotsLeft">0</div>
          <div id="tankBest"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  canvas     = overlay.querySelector("#tankBoard");
  ctx        = canvas.getContext("2d");
  timerEl    = overlay.querySelector("#tankTimerVal");
  scoreEl    = overlay.querySelector("#tankScore");
  livesEl    = overlay.querySelector("#tankLives");
  botsLeftEl = overlay.querySelector("#tankBotsLeft");
  bestEl     = overlay.querySelector("#tankBest");
  instrPanel = overlay.querySelector("#tankInstr");

  overlay.querySelector("#tankExitBtn").addEventListener("click", closeTank);
  overlay.querySelector("#tankHowBtn").addEventListener("click", showInstr);
  overlay.querySelector("#tankInstrClose").addEventListener("click", hideInstr);
}

export function isTankOpen() { return isOpen; }

export function openTankGame({ playerName = "Игрок", onClose = null, savedResults = [] } = {}) {
  initTankGame();
  currentPlayer = playerName;
  onCloseCb     = onClose;
  tankResults   = Array.isArray(savedResults) ? [...savedResults] : [];
  isOpen        = true;
  overlay.classList.remove("hidden");

  resetGame();
  renderBest();
  showInstr();
  drawFrame();

  window.addEventListener("keydown", keyListen,  true);
  window.addEventListener("keyup",   keyUListen, true);
}

export function getTankResults() { return [...tankResults]; }

// ─── Инструкция ───────────────────────────────────────────────────────────────
function showInstr() { instrShown = true; instrPanel.classList.remove("hidden"); }
function hideInstr() {
  instrShown = false;
  instrPanel.classList.add("hidden");
  if (!started && !gameOver) startRound();
}

// ─── Close / reset ────────────────────────────────────────────────────────────
function closeTank() {
  stopTimers();
  isOpen = false;
  instrShown = false;
  instrPanel.classList.add("hidden");
  overlay.classList.add("hidden");
  window.removeEventListener("keydown", keyListen,  true);
  window.removeEventListener("keyup",   keyUListen, true);
  if (onCloseCb) onCloseCb();
}

function stopTimers() {
  if (timerRAF) { cancelAnimationFrame(timerRAF); timerRAF = null; }
}

let paused = false;
let loopRAF = null;

function resetGame() {
  stopTimers();
  if (loopRAF) { cancelAnimationFrame(loopRAF); loopRAF = null; }
  map        = buildMap();
  bullets    = [];
  explosions = [];
  bots       = [];
  botsLeft   = BOT_COUNT;
  lives      = MAX_LIVES;
  score      = 0;
  gameOver   = false;
  victory    = false;
  started    = false;
  startTime  = null;
  elapsed    = 0;
  paused     = false;
  timerEl.textContent  = "00:00";
  scoreEl.textContent  = "0";
  botsLeftEl.textContent = String(BOT_COUNT);
  updateLivesUI();
  spawnPlayer();
  spawnInitialBots();
}

function startRound() {
  if (started) return;
  started   = true;
  startTime = Date.now();
  startTimer();
  gameLoop();
}

// ─── Spawn ────────────────────────────────────────────────────────────────────
function spawnPlayer() {
  player = makeTank(COLS / 2 - 1, ROWS - 3, DIR.UP, "player");
}

function spawnInitialBots() {
  const positions = [[1,1], [1, COLS-2], [1, Math.floor(COLS/2)-1]];
  const count = Math.min(BOT_MAX_ALIVE, botsLeft);
  for (let i = 0; i < count; i++) {
    const [r, c] = positions[i % positions.length];
    spawnBot(r, c);
  }
}

function spawnBot(row, col) {
  if (botsLeft <= 0) return;
  bots.push(makeTank(col, row, DIR.DOWN, "bot"));
  botsLeft--;
  botsLeftEl.textContent = String(botsLeft + bots.length);
}

function makeTank(cx, cy, dir, type) {
  return {
    cx, cy,             // позиция центра в клетках (float для плавного движения)
    tx: cx, ty: cy,     // целевая клетка
    px: cx * CELL, py: cy * CELL, // пиксели (для рендера)
    dir,
    type,
    moving: false,
    moveProgress: 0,
    lastMove: 0,
    lastShot: 0,
    lastThink: 0,
    dead: false,
  };
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
let lastTime = 0;

function gameLoop(ts = 0) {
  if (!isOpen || gameOver || victory) return;
  if (paused || instrShown) {
    loopRAF = requestAnimationFrame(gameLoop);
    return;
  }

  const dt = Math.min(ts - lastTime, 80);
  lastTime = ts;

  updatePlayer(ts, dt);
  updateBots(ts, dt);
  updateBullets(ts, dt);
  updateExplosions(dt);
  checkBotSpawn(ts);

  drawFrame();
  loopRAF = requestAnimationFrame(gameLoop);
}

// ─── Input ────────────────────────────────────────────────────────────────────
function onKey(e, down) {
  if (!isOpen) return;
  const blocked = new Set(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","ShiftLeft","ShiftRight"]);
  if (blocked.has(e.code)) { e.stopPropagation(); e.preventDefault(); }

  if (down && instrShown && (e.code === "Enter" || e.code === "Space")) { hideInstr(); return; }
  if (down && e.code === "ShiftLeft") { paused = !paused; return; }

  keys[e.code] = down;
}

// ─── Update Player ────────────────────────────────────────────────────────────
function updatePlayer(ts, dt) {
  if (!player || player.dead) return;

  // Движение
  if (!player.moving) {
    let wantDir = -1;
    if (keys["KeyW"] || keys["ArrowUp"])    wantDir = DIR.UP;
    else if (keys["KeyS"] || keys["ArrowDown"]) wantDir = DIR.DOWN;
    else if (keys["KeyA"] || keys["ArrowLeft"]) wantDir = DIR.LEFT;
    else if (keys["KeyD"] || keys["ArrowRight"]) wantDir = DIR.RIGHT;

    if (wantDir >= 0) {
      player.dir = wantDir;
      const nx = player.cx + DX[wantDir];
      const ny = player.cy + DY[wantDir];
      if (canMove(nx, ny)) {
        player.tx = nx; player.ty = ny;
        player.moving = true;
        player.moveProgress = 0;
        player.lastMove = ts;
      }
    }
  } else {
    player.moveProgress += dt / PLAYER_SPEED;
    if (player.moveProgress >= 1) {
      player.cx = player.tx; player.cy = player.ty;
      player.moving = false;
      player.moveProgress = 1;
    }
    player.px = lerp(player.cx * CELL, player.tx * CELL, player.moveProgress);
    player.py = lerp(player.cy * CELL, player.ty * CELL, player.moveProgress);
  }
  if (!player.moving) { player.px = player.cx * CELL; player.py = player.cy * CELL; }

  // Выстрел
  if (keys["Space"] && ts - player.lastShot > 350) {
    if (!bullets.some(b => b.owner === "player")) {
      shootTank(player);
      player.lastShot = ts;
    }
  }
}

// ─── Update Bots ─────────────────────────────────────────────────────────────
function updateBots(ts) {
  for (const bot of bots) {
    if (bot.dead) continue;

    // ИИ: периодически меняет направление
    if (ts - bot.lastThink > BOT_THINK_INTERVAL + Math.random() * 400) {
      bot.lastThink = ts;
      // Иногда целится в игрока или базу
      const target = Math.random() < 0.4 && player && !player.dead ? player : getHQTile();
      const aimed = aimToward(bot, target);
      if (!aimed) bot.dir = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT][Math.floor(Math.random() * 4)];
    }

    // Движение
    if (!bot.moving && ts - bot.lastMove > BOT_SPEED) {
      const nx = bot.cx + DX[bot.dir];
      const ny = bot.cy + DY[bot.dir];
      if (canMove(nx, ny) && !tankAt(nx, ny, bot)) {
        bot.tx = nx; bot.ty = ny;
        bot.moving = true;
        bot.moveProgress = 0;
      } else {
        // Разворачиваемся
        bot.dir = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT][Math.floor(Math.random() * 4)];
      }
      bot.lastMove = ts;
    }

    if (bot.moving) {
      bot.moveProgress += 1 / (BOT_SPEED / 16);
      if (bot.moveProgress >= 1) {
        bot.cx = bot.tx; bot.cy = bot.ty;
        bot.moving = false;
        bot.moveProgress = 1;
      }
      bot.px = lerp(bot.cx * CELL, bot.tx * CELL, bot.moveProgress);
      bot.py = lerp(bot.cy * CELL, bot.ty * CELL, bot.moveProgress);
    }
    if (!bot.moving) { bot.px = bot.cx * CELL; bot.py = bot.cy * CELL; }

    // Выстрел
    if (ts - bot.lastShot > BOT_SHOOT_INTERVAL + Math.random() * 600) {
      if (!bullets.some(b => b.owner === bot)) {
        shootTank(bot);
        bot.lastShot = ts;
      }
    }
  }
}

function getHQTile() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (map[r][c] === HQ) return { cx: c, cy: r };
  return null;
}

function aimToward(tank, target) {
  if (!target) return false;
  const dx = target.cx - tank.cx;
  const dy = target.cy - tank.cy;
  if (Math.abs(dx) > Math.abs(dy)) {
    tank.dir = dx > 0 ? DIR.RIGHT : DIR.LEFT;
  } else {
    tank.dir = dy > 0 ? DIR.DOWN : DIR.UP;
  }
  return true;
}

function tankAt(cx, cy, exclude) {
  if (player && !player.dead && player !== exclude && player.cx === cx && player.cy === cy) return true;
  return bots.some(b => b !== exclude && !b.dead && b.cx === cx && b.cy === cy);
}

// ─── Bullets ─────────────────────────────────────────────────────────────────
function shootTank(tank) {
  const bx = tank.px + CELL / 2;
  const by = tank.py + CELL / 2;
  bullets.push({
    x: bx, y: by,
    dir: tank.dir,
    owner: tank.type === "player" ? "player" : tank,
    speed: BULLET_SPEED,
    dead: false,
  });
}

function updateBullets(ts, dt) {
  for (const b of bullets) {
    if (b.dead) continue;
    const spd = b.speed * (dt / 16);
    b.x += DX[b.dir] * spd;
    b.y += DY[b.dir] * spd;

    const col = Math.floor(b.x / CELL);
    const row = Math.floor(b.y / CELL);

    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) { b.dead = true; explode(b.x, b.y, "small"); continue; }

    const tile = map[row]?.[col];
    if (tile === BRICK) { map[row][col] = EMPTY; b.dead = true; explode(b.x, b.y, "small"); continue; }
    if (tile === STEEL) { b.dead = true; explode(b.x, b.y, "small"); continue; }
    if (tile === HQ)    { map[row][col] = EMPTY; b.dead = true; explode(b.x, b.y, "big"); endGame(false); continue; }

    // Попадание в танки
    const checkTank = (tank, friendlyOwner) => {
      if (!tank || tank.dead) return false;
      if (b.owner === friendlyOwner) return false; // не самоубийство игрока
      const tx = tank.px + CELL / 2;
      const ty = tank.py + CELL / 2;
      if (Math.abs(b.x - tx) < CELL * 0.75 && Math.abs(b.y - ty) < CELL * 0.75) {
        b.dead = true;
        explode(b.x, b.y, "big");
        killTank(tank);
        return true;
      }
      return false;
    };

    if (b.owner !== "player" && checkTank(player, null)) continue;
    for (const bot of bots) if (b.owner === "player" && checkTank(bot, null)) break;

    // Bullet vs bullet
    for (const ob of bullets) {
      if (ob === b || ob.dead) continue;
      if (Math.abs(b.x - ob.x) < 4 && Math.abs(b.y - ob.y) < 4) { b.dead = true; ob.dead = true; }
    }
  }
  // Чистим мёртвые пули
  for (let i = bullets.length - 1; i >= 0; i--) { if (bullets[i].dead) bullets.splice(i, 1); }
}

function killTank(tank) {
  tank.dead = true;
  explode(tank.px + CELL/2, tank.py + CELL/2, "big");

  if (tank.type === "player") {
    lives--;
    updateLivesUI();
    if (lives <= 0) { endGame(false); return; }
    // Возрождение через 1.5с
    setTimeout(() => {
      if (!gameOver && !victory && isOpen) {
        player.dead   = false;
        player.cx     = COLS / 2 - 1;
        player.cy     = ROWS - 3;
        player.tx     = player.cx; player.ty = player.cy;
        player.px     = player.cx * CELL; player.py = player.cy * CELL;
        player.moving = false;
        player.dir    = DIR.UP;
      }
    }, 1500);
  } else {
    // Бот уничтожен
    score += 100;
    scoreEl.textContent = score;
    bots.splice(bots.indexOf(tank), 1);
    botsLeftEl.textContent = String(botsLeft + bots.length);
    if (bots.length === 0 && botsLeft === 0) endGame(true);
  }
}

function checkBotSpawn(ts) {
  if (botsLeft > 0 && bots.length < BOT_MAX_ALIVE) {
    // Спавним ещё одного бота
    const positions = [[1,1], [1, COLS-2], [1, Math.floor(COLS/2)-1]];
    for (const [r, c] of positions) {
      if (!tankAt(c, r, null)) { spawnBot(r, c); break; }
    }
  }
}

// ─── Explosions ───────────────────────────────────────────────────────────────
function explode(x, y, size) {
  explosions.push({ x, y, size, life: size === "big" ? 400 : 180, maxLife: size === "big" ? 400 : 180 });
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= dt;
    if (explosions[i].life <= 0) explosions.splice(i, 1);
  }
}

// ─── End Game ─────────────────────────────────────────────────────────────────
function endGame(win) {
  if (gameOver || victory) return;
  if (win) victory = true; else gameOver = true;

  stopTimers();
  elapsed = startTime ? Date.now() - startTime : 0;

  if (win) {
    const bonus = Math.max(0, 3000 - Math.floor(elapsed / 1000) * 50);
    score += bonus;
    scoreEl.textContent = score;
  }

  tankResults.push({ player: currentPlayer, score, win, timeMs: elapsed });
  tankResults.sort((a, b) => b.score - a.score);
  tankResults = tankResults.slice(0, 10);

  drawFrame();
  renderBest();
  showRetryButton();
}

function showRetryButton() {
  const old = overlay.querySelector("#tankRetryBtn");
  if (old) old.remove();
  const btn = document.createElement("button");
  btn.id = "tankRetryBtn"; btn.type = "button";
  btn.textContent = "🔄 Ещё раз";
  btn.addEventListener("click", () => { btn.remove(); resetGame(); showInstr(); drawFrame(); });
  overlay.querySelector("#tankSide").appendChild(btn);
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  (function tick() {
    if (!startTime || gameOver || victory) return;
    const ms = Date.now() - startTime;
    const s  = Math.floor(ms / 1000);
    timerEl.textContent = `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
    timerRAF = requestAnimationFrame(tick);
  })();
}

function updateLivesUI() {
  livesEl.textContent = "♥ ".repeat(Math.max(0, lives)).trim() || "✗";
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawFrame() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Сетка
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c*CELL,0); ctx.lineTo(c*CELL,H); ctx.stroke(); }
  for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*CELL); ctx.lineTo(W,r*CELL); ctx.stroke(); }

  // Тайлы
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = map[r][c];
      const x = c * CELL; const y = r * CELL;
      if (t === BRICK) {
        ctx.fillStyle = C.brick;
        ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
        ctx.fillStyle = C.brickShade;
        ctx.fillRect(x+CELL/2, y+1, CELL/2-1, CELL/2-1);
        ctx.fillRect(x+1, y+CELL/2, CELL/2-1, CELL/2-1);
      } else if (t === STEEL) {
        ctx.fillStyle = C.steel;
        ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
        ctx.fillStyle = C.steelShine;
        ctx.fillRect(x+2, y+2, 3, 3);
        ctx.fillRect(x+CELL-5, y+CELL-5, 3, 3);
      } else if (t === HQ) {
        ctx.fillStyle = C.hqShade;
        ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
        ctx.fillStyle = C.hq;
        ctx.font = `bold ${CELL-2}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", x + CELL/2, y + CELL/2 + 1);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      }
    }
  }

  // Танки
  if (bots) for (const bot of bots) if (!bot.dead) drawTank(bot);
  if (player && !player.dead) drawTank(player);

  // Пули
  for (const b of bullets) {
    ctx.save();
    ctx.shadowColor = C.bullet; ctx.shadowBlur = 6;
    ctx.fillStyle = C.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // Взрывы
  for (const ex of explosions) {
    const t = 1 - ex.life / ex.maxLife;
    const r = ex.size === "big" ? 20 * t : 10 * t;
    const alpha = (1 - t) * 0.9;
    const color = C.explosion[Math.floor(t * C.explosion.length)] || C.explosion[0];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Оверлей паузы / старта / конца
  if (paused && started && !gameOver && !victory) drawOverlayText("⏸ Пауза", "Shift — продолжить", "rgba(80,50,120,0.7)");
  if (!started && !instrShown) drawOverlayText("Готов к бою!", "Нажми любую клавишу", "rgba(0,0,0,0.5)");
  if (gameOver) drawOverlayText("💥 ИГРА ОКОНЧЕНА", `Счёт: ${score}`, "rgba(80,0,0,0.75)");
  if (victory)  drawOverlayText("🏆 ПОБЕДА!", `Счёт: ${score}  •  ${timerEl.textContent}`, "rgba(0,60,20,0.75)");
}

function drawTank(tank) {
  const x = Math.round(tank.px);
  const y = Math.round(tank.py);
  const isPlayer = tank.type === "player";
  const body  = isPlayer ? C.playerBody  : C.botBody;
  const light = isPlayer ? C.playerLight : C.botLight;
  const dark  = isPlayer ? C.playerDark  : C.botDark;

  ctx.save();
  ctx.shadowColor = body; ctx.shadowBlur = 6;

  // Корпус
  ctx.fillStyle = dark;
  ctx.fillRect(x+1, y+1, CELL-2, CELL-2);
  ctx.fillStyle = body;
  ctx.fillRect(x+3, y+3, CELL-6, CELL-6);

  // Дуло (зависит от направления)
  ctx.fillStyle = light;
  const half = CELL / 2 - 1;
  if (tank.dir === DIR.UP)    ctx.fillRect(x+half-1, y,        3, CELL/2);
  if (tank.dir === DIR.DOWN)  ctx.fillRect(x+half-1, y+CELL/2, 3, CELL/2);
  if (tank.dir === DIR.LEFT)  ctx.fillRect(x,        y+half-1, CELL/2, 3);
  if (tank.dir === DIR.RIGHT) ctx.fillRect(x+CELL/2, y+half-1, CELL/2, 3);

  ctx.restore();
}

function drawOverlayText(title, sub, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, H/2 - 44, W, 88);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, W/2, H/2 - 8);
  ctx.font = "14px monospace";
  ctx.fillStyle = "#cccccc";
  ctx.fillText(sub, W/2, H/2 + 20);
  ctx.textAlign = "left";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function canMove(cx, cy) {
  if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return false;
  const t = map[cy]?.[cx];
  return t === EMPTY;
}

function lerp(a, b, t) { return a + (b - a) * Math.min(1, t); }

// ─── Best times ───────────────────────────────────────────────────────────────
function renderBest() {
  if (!bestEl) return;
  const wins = tankResults.filter(r => r.win);
  if (!wins.length) { bestEl.innerHTML = "<span class='tk-no-results'>Нет побед</span>"; return; }
  bestEl.innerHTML = "<b>Рекорды:</b>" +
    wins.slice(0, 5).map((r, i) =>
      `<span class='tk-row'>${i+1}. ${r.player} — ${r.score}</span>`
    ).join("");
}
