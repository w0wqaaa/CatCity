/**
 * Морской бой (Battleship) — против бота.
 * Поле 10×10, авто-расстановка кораблей.
 * Графика — DOM-сетка (без PNG).
 *
 * Корабли: 1×4, 2×3, 3×2, 4×1.
 * Ход: попал — стреляешь снова, промах — ход бота.
 */

const SIZE = 10;
const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]; // 10 кораблей, 20 клеток

export function createBattleship(container, { mode, onGoldChange, onResult } = {}) {
  let player, enemy, turn, over, message;

  container.innerHTML = `
    <div class="bs-root">
      <div class="bs-status" id="bsStatus"></div>
      <div class="bs-boards">
        <div class="bs-side">
          <div class="bs-label">Поле врага (стреляй сюда)</div>
          <div class="bs-grid" id="bsEnemy"></div>
        </div>
        <div class="bs-side">
          <div class="bs-label">Твоё поле</div>
          <div class="bs-grid bs-own" id="bsPlayer"></div>
        </div>
      </div>
      <div class="bs-controls">
        <button class="mg-btn" id="bsRestart">🔄 Заново</button>
      </div>
    </div>`;

  const statusEl = container.querySelector("#bsStatus");
  const enemyEl  = container.querySelector("#bsEnemy");
  const playerEl = container.querySelector("#bsPlayer");
  container.querySelector("#bsRestart").addEventListener("click", restart);

  restart();

  function restart() {
    player = makeBoard();
    enemy  = makeBoard();
    placeFleet(player);
    placeFleet(enemy);
    turn  = "player";
    over  = false;
    message = "Твой ход — стреляй по полю врага!";
    render();
  }

  // ── Игровая логика ────────────────────────────────────────────────────────
  function playerShoot(x, y) {
    if (over || turn !== "player") return;
    const cell = enemy.grid[y][x];
    if (cell.shot) return; // уже стреляли

    const res = shoot(enemy, x, y);
    if (res.result === "sunk") {
      message = "💥 Корабль уничтожен!";
      if (enemy.alive === 0) return finish(true);
    } else if (res.result === "hit") {
      message = "🎯 Попал! Стреляй ещё.";
    } else {
      message = "🌊 Мимо. Ход врага…";
      turn = "enemy";
    }
    render();
    if (turn === "enemy") setTimeout(enemyTurn, 700);
  }

  function enemyTurn() {
    if (over) return;
    let res;
    do {
      const { x, y } = enemy_pickTarget();
      res = shoot(player, x, y);
      if (res.result === "sunk") {
        message = "💥 Враг потопил твой корабль!";
        if (player.alive === 0) { render(); return finish(false); }
      } else if (res.result === "hit") {
        message = "🔥 Враг попал! Он стреляет ещё…";
      } else {
        message = "✅ Враг промахнулся. Твой ход!";
        turn = "player";
      }
      render();
    } while (!over && turn === "enemy" && res.result !== "miss");
    if (!over && turn === "enemy") setTimeout(enemyTurn, 700);
  }

  // Бот: случайная неоткрытая клетка (+лёгкий добор после попадания)
  function enemy_pickTarget() {
    // если есть «раненый» корабль — добиваем соседние клетки
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const c = player.grid[y][x];
        if (c.shot && c.ship != null && !shipSunk(player, c.ship)) {
          const nb = neighbors(x, y).filter(([nx, ny]) => !player.grid[ny][nx].shot);
          if (nb.length) { const [nx, ny] = nb[Math.floor(Math.random() * nb.length)]; return { x: nx, y: ny }; }
        }
      }
    // иначе случайная неоткрытая
    const free = [];
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        if (!player.grid[y][x].shot) free.push({ x, y });
    return free[Math.floor(Math.random() * free.length)];
  }

  function finish(win) {
    over = true;
    if (win) {
      message = "🏆 ПОБЕДА! Весь флот врага потоплен. +10 💰";
      if (onGoldChange) onGoldChange(10);
      if (onResult) onResult({ result: "win" });
    } else {
      message = "☠️ ПОРАЖЕНИЕ. Твой флот уничтожен.";
      if (onResult) onResult({ result: "lose" });
    }
    render();
  }

  // ── Рендер ────────────────────────────────────────────────────────────────
  function render() {
    statusEl.textContent = message;
    renderGrid(enemyEl, enemy, true);
    renderGrid(playerEl, player, false);
  }

  function renderGrid(el, board, isEnemy) {
    el.innerHTML = "";
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const c = board.grid[y][x];
        const cell = document.createElement("div");
        cell.className = "bs-cell";
        if (c.shot && c.ship != null) {
          cell.classList.add(shipSunk(board, c.ship) ? "bs-sunk" : "bs-hit");
          cell.textContent = shipSunk(board, c.ship) ? "✖" : "✕";
        } else if (c.shot) {
          cell.classList.add("bs-miss");
          cell.textContent = "•";
        } else if (!isEnemy && c.ship != null) {
          cell.classList.add("bs-ship"); // свои корабли видны
        }
        if (isEnemy && !over && turn === "player" && !c.shot) {
          cell.classList.add("bs-target");
          cell.addEventListener("click", () => playerShoot(x, y));
        }
        el.appendChild(cell);
      }
    }
  }

  return { destroy: () => {} };
}

// ── Доска и корабли ───────────────────────────────────────────────────────────
function makeBoard() {
  const grid = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) row.push({ ship: null, shot: false });
    grid.push(row);
  }
  return { grid, ships: [], alive: 0 };
}

function placeFleet(board) {
  let id = 0;
  for (const size of FLEET) {
    let placed = false, guard = 0;
    while (!placed && guard++ < 500) {
      const horiz = Math.random() < 0.5;
      const x = Math.floor(Math.random() * (horiz ? SIZE - size + 1 : SIZE));
      const y = Math.floor(Math.random() * (horiz ? SIZE : SIZE - size + 1));
      const cells = [];
      for (let i = 0; i < size; i++) cells.push([horiz ? x + i : x, horiz ? y : y + i]);
      if (cells.every(([cx, cy]) => freeArea(board, cx, cy))) {
        cells.forEach(([cx, cy]) => { board.grid[cy][cx].ship = id; });
        board.ships.push({ id, size, hits: 0, cells });
        id++;
        placed = true;
      }
    }
  }
  board.alive = board.ships.length;
}

// клетка и соседи свободны (корабли не касаются)
function freeArea(board, x, y) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
      if (board.grid[ny][nx].ship != null) return false;
    }
  return true;
}

function shoot(board, x, y) {
  const cell = board.grid[y][x];
  if (cell.shot) return { result: "repeat" };
  cell.shot = true;
  if (cell.ship == null) return { result: "miss" };
  const ship = board.ships[cell.ship];
  ship.hits++;
  if (ship.hits >= ship.size) {
    board.alive--;
    return { result: "sunk", ship };
  }
  return { result: "hit", ship };
}

function shipSunk(board, shipId) {
  const ship = board.ships[shipId];
  return ship && ship.hits >= ship.size;
}

function neighbors(x, y) {
  return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE);
}
