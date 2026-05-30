/**
 * Bomberman Lite — против ботов.
 * WASD/стрелки — движение (по клеткам), Space — поставить бомбу.
 * Разрушай кирпичи и уничтожай врагов взрывами. Не попади под свой взрыв.
 * Графика — Canvas (без PNG).
 */

const CELL = 32;
const COLS = 13;
const ROWS = 11;
const W = CELL * COLS; // 416
const H = CELL * ROWS; // 352

const EMPTY = 0, BRICK = 1, STEEL = 2;
const BOMB_FUSE = 2000;   // мс до взрыва
const BLAST_TIME = 480;   // мс «горения»
const BLAST_RANGE = 2;
const ENEMY_MOVE = 520;   // мс между ходами врага
const ENEMY_COUNT = 3;

const C = {
  bg: "#0a0a12", grid: "rgba(60,60,90,0.18)",
  steel: "#5a5a7a", steelHi: "#8888aa",
  brick: "#8b4a2a", brickHi: "#b06a3a",
  player: "#44ccff", playerDark: "#1a88bb",
  enemy: "#ff5566", enemyDark: "#aa2233",
  bomb: "#222", bombHi: "#ff5544",
  blast: "#ffaa22", blastHot: "#ffee66",
};

export function createBomberman(container, { onGoldChange, onResult } = {}) {
  let grid, player, enemies, bombs, blasts;
  let over, win, message;
  let raf = null, last = 0, destroyed = false;
  const keys = {};

  container.innerHTML = `
    <div class="bm-root">
      <div class="bm-status" id="bmStatus"></div>
      <canvas id="bmCanvas" width="${W}" height="${H}"></canvas>
      <div class="bm-hint">WASD / стрелки — движение · Space — бомба</div>
      <div class="bm-controls"><button class="mg-btn" id="bmRestart">🔄 Заново</button></div>
    </div>`;

  const statusEl = container.querySelector("#bmStatus");
  const canvas = container.querySelector("#bmCanvas");
  const ctx = canvas.getContext("2d");
  container.querySelector("#bmRestart").addEventListener("click", restart);

  const keyDown = (e) => onKey(e, true);
  const keyUp   = (e) => onKey(e, false);
  window.addEventListener("keydown", keyDown, true);
  window.addEventListener("keyup", keyUp, true);

  restart();

  function restart() {
    grid = buildMap();
    player = { cx: 1, cy: 1, alive: true, bombReady: true };
    enemies = spawnEnemies();
    bombs = []; blasts = [];
    over = false; win = false;
    message = "Уничтожь всех врагов! Береги себя.";
    last = performance.now();
    loop(last);
  }

  // ── Карта ────────────────────────────────────────────────────────────────────
  function buildMap() {
    const g = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) g[y][x] = STEEL;
        else if (x % 2 === 0 && y % 2 === 0) g[y][x] = STEEL;
      }
    // Кирпичи случайно
    const safe = new Set(["1,1","1,2","2,1", `${COLS-2},${ROWS-2}`,`${COLS-3},${ROWS-2}`,`${COLS-2},${ROWS-3}`,
                          `${COLS-2},1`,`${COLS-3},1`,`${COLS-2},2`, `1,${ROWS-2}`,`1,${ROWS-3}`,`2,${ROWS-2}`]);
    for (let y = 1; y < ROWS - 1; y++)
      for (let x = 1; x < COLS - 1; x++)
        if (g[y][x] === EMPTY && !safe.has(`${x},${y}`) && Math.random() < 0.62) g[y][x] = BRICK;
    return g;
  }

  function spawnEnemies() {
    const corners = [[COLS-2, ROWS-2], [COLS-2, 1], [1, ROWS-2]];
    return corners.slice(0, ENEMY_COUNT).map(([cx, cy]) => ({ cx, cy, alive: true, acc: 0 }));
  }

  // ── Ввод ─────────────────────────────────────────────────────────────────────
  function onKey(e, down) {
    const codes = ["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"];
    if (!codes.includes(e.code)) return;
    e.stopPropagation(); e.preventDefault();
    if (!down) { keys[e.code] = false; return; }
    if (over || !player.alive) return;

    if (e.code === "Space") { placeBomb(); return; }
    if (e.repeat) return; // шаг на нажатие
    let dx = 0, dy = 0;
    if (e.code === "KeyW" || e.code === "ArrowUp") dy = -1;
    else if (e.code === "KeyS" || e.code === "ArrowDown") dy = 1;
    else if (e.code === "KeyA" || e.code === "ArrowLeft") dx = -1;
    else if (e.code === "KeyD" || e.code === "ArrowRight") dx = 1;
    tryMove(dx, dy);
  }

  function tryMove(dx, dy) {
    const nx = player.cx + dx, ny = player.cy + dy;
    if (walkable(nx, ny)) { player.cx = nx; player.cy = ny; }
  }

  function walkable(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    if (grid[y][x] !== EMPTY) return false;
    if (bombs.some(b => b.cx === x && b.cy === y)) return false;
    return true;
  }

  function placeBomb() {
    if (!player.bombReady) return;
    if (bombs.some(b => b.cx === player.cx && b.cy === player.cy)) return;
    bombs.push({ cx: player.cx, cy: player.cy, fuse: BOMB_FUSE });
    player.bombReady = false;
  }

  // ── Игровой цикл ─────────────────────────────────────────────────────────────
  function loop(t) {
    if (destroyed) return;
    const dt = Math.min(t - last, 60);
    last = t;
    if (!over) update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    // Бомбы
    for (const b of bombs) b.fuse -= dt;
    const exploding = bombs.filter(b => b.fuse <= 0);
    for (const b of exploding) explode(b);
    bombs = bombs.filter(b => b.fuse > 0);

    // Взрывы
    for (const bl of blasts) bl.life -= dt;
    blasts = blasts.filter(bl => bl.life > 0);

    // Урон от взрывов
    const blastSet = new Set(blasts.map(bl => `${bl.cx},${bl.cy}`));
    if (blastSet.has(`${player.cx},${player.cy}`)) player.alive = false;
    enemies.forEach(en => { if (blastSet.has(`${en.cx},${en.cy}`)) en.alive = false; });
    enemies = enemies.filter(en => en.alive);

    // Движение врагов
    for (const en of enemies) {
      en.acc += dt;
      if (en.acc >= ENEMY_MOVE) {
        en.acc = 0;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy]) => walkable(en.cx+dx, en.cy+dy));
        if (dirs.length) {
          const [dx,dy] = dirs[Math.floor(Math.random()*dirs.length)];
          en.cx += dx; en.cy += dy;
        }
      }
      if (en.cx === player.cx && en.cy === player.cy) player.alive = false;
    }

    // Исходы
    if (!player.alive) finish(false);
    else if (enemies.length === 0) finish(true);
  }

  function explode(bomb) {
    player.bombReady = true; // у игрока 1 бомба
    addBlast(bomb.cx, bomb.cy);
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      for (let r = 1; r <= BLAST_RANGE; r++) {
        const x = bomb.cx + dx * r, y = bomb.cy + dy * r;
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) break;
        if (grid[y][x] === STEEL) break;
        if (grid[y][x] === BRICK) { grid[y][x] = EMPTY; addBlast(x, y); break; }
        addBlast(x, y);
        // цепная детонация
        const chain = bombs.find(b => b.cx === x && b.cy === y && b.fuse > 0);
        if (chain) chain.fuse = 0;
      }
    }
  }

  function addBlast(x, y) { blasts.push({ cx: x, cy: y, life: BLAST_TIME }); }

  function finish(won) {
    if (over) return;
    over = true; win = won;
    if (won) {
      message = "🏆 ПОБЕДА! Все враги уничтожены. +8 💰";
      if (onResult) onResult({ result: "win" }); // золото начислит manager (rewards.win)
    } else {
      message = "💀 ПОРАЖЕНИЕ. Попробуй снова.";
      if (onResult) onResult({ result: "lose" });
    }
  }

  // ── Отрисовка ────────────────────────────────────────────────────────────────
  function draw() {
    statusEl.textContent = message + (over ? "" : `  · Врагов: ${enemies.length}`);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const px = x*CELL, py = y*CELL;
        if (grid[y][x] === STEEL) {
          ctx.fillStyle = C.steel; ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
          ctx.fillStyle = C.steelHi; ctx.fillRect(px+3,py+3,4,4);
        } else if (grid[y][x] === BRICK) {
          ctx.fillStyle = C.brick; ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
          ctx.fillStyle = C.brickHi; ctx.fillRect(px+2,py+2,CELL-4,4);
        } else {
          ctx.strokeStyle = C.grid; ctx.lineWidth=1; ctx.strokeRect(px+0.5,py+0.5,CELL-1,CELL-1);
        }
      }

    // Бомбы
    for (const b of bombs) {
      const px = b.cx*CELL+CELL/2, py = b.cy*CELL+CELL/2;
      const pulse = 1 + Math.sin(performance.now()/120)*0.12;
      ctx.fillStyle = C.bomb;
      ctx.beginPath(); ctx.arc(px, py, (CELL/2-5)*pulse, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = C.bombHi; ctx.fillRect(px-2, py-CELL/2+3, 4, 6);
    }

    // Взрывы
    for (const bl of blasts) {
      const a = bl.life / BLAST_TIME;
      ctx.fillStyle = a > 0.5 ? C.blastHot : C.blast;
      ctx.globalAlpha = Math.min(1, a + 0.3);
      ctx.fillRect(bl.cx*CELL+2, bl.cy*CELL+2, CELL-4, CELL-4);
      ctx.globalAlpha = 1;
    }

    // Враги
    for (const en of enemies) drawUnit(en.cx, en.cy, C.enemy, C.enemyDark, "👾");
    // Игрок
    if (player.alive) drawUnit(player.cx, player.cy, C.player, C.playerDark, "🐱");

    if (over) {
      ctx.fillStyle = win ? "rgba(0,60,20,0.7)" : "rgba(60,0,0,0.7)";
      ctx.fillRect(0, H/2-30, W, 60);
      ctx.fillStyle = "#fff"; ctx.font = "bold 22px monospace"; ctx.textAlign = "center";
      ctx.fillText(win ? "🏆 ПОБЕДА!" : "💀 ПОРАЖЕНИЕ", W/2, H/2+8);
      ctx.textAlign = "left";
    }
  }

  function drawUnit(cx, cy, col, dark, emoji) {
    const px = cx*CELL, py = cy*CELL;
    ctx.fillStyle = dark; ctx.fillRect(px+4, py+4, CELL-8, CELL-8);
    ctx.fillStyle = col;  ctx.fillRect(px+6, py+6, CELL-12, CELL-12);
    ctx.font = `${CELL-10}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(emoji, px+CELL/2, py+CELL/2+1);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  return {
    destroy: () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("keydown", keyDown, true);
      window.removeEventListener("keyup", keyUp, true);
    }
  };
}
