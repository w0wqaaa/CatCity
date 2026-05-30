/**
 * Sokoban — толкай ящики на цели. WASD/стрелки — движение, R — рестарт уровня.
 * Несколько уровней. Награда +5💰 за прохождение всех.
 * Легенда: # стена, . цель, $ ящик, * ящик на цели, @ игрок, + игрок на цели
 */
const LEVELS = [
  [ // толкни ящик вправо на цель
    "#####",
    "#@$.#",
    "#####",
  ],
  [ // толкни ящик вверх дважды
    "#####",
    "#  .#",
    "#  $#",
    "#  @#",
    "#####",
  ],
  [ // поворот: вверх, затем вправо
    "######",
    "#   .#",
    "# $  #",
    "# @  #",
    "######",
  ],
];

export function createSokoban(container, { onResult } = {}) {
  let level, map, px, py, won, finishedAll;

  container.innerHTML = `
    <div class="sk2-root">
      <div class="sk2-status" id="sk2Status"></div>
      <div class="sk2-grid" id="sk2Grid"></div>
      <div class="sk2-hint">WASD / стрелки — двигать · R — сброс уровня</div>
      <button class="mg-btn" id="sk2Reset" style="margin-top:6px">🔄 Сброс уровня</button>
    </div>`;
  const statusEl = container.querySelector("#sk2Status");
  const gridEl = container.querySelector("#sk2Grid");
  container.querySelector("#sk2Reset").addEventListener("click", () => loadLevel(level));

  const keyDown = (e) => onKey(e);
  window.addEventListener("keydown", keyDown, true);

  level = 0; finishedAll = false;
  loadLevel(0);

  function loadLevel(n) {
    level = n; won = false;
    map = LEVELS[n].map(row => row.split(""));
    for (let y=0;y<map.length;y++) for (let x=0;x<map[y].length;x++) {
      if (map[y][x] === "@" || map[y][x] === "+") { px = x; py = y; }
    }
    render();
  }

  function cellAt(x,y){ return (map[y] && map[y][x] !== undefined) ? map[y][x] : "#"; }
  function isWall(c){ return c === "#"; }
  function isGoal(c){ return c === "." || c === "*" || c === "+"; }
  function hasBox(c){ return c === "$" || c === "*"; }

  function onKey(e) {
    const map2 = { KeyW:[0,-1],ArrowUp:[0,-1], KeyS:[0,1],ArrowDown:[0,1], KeyA:[-1,0],ArrowLeft:[-1,0], KeyD:[1,0],ArrowRight:[1,0] };
    if (e.code === "KeyR") { e.preventDefault(); e.stopPropagation(); loadLevel(level); return; }
    const d = map2[e.code];
    if (!d || won) return;
    e.preventDefault(); e.stopPropagation();
    move(d[0], d[1]);
  }

  function move(dx, dy) {
    const nx = px+dx, ny = py+dy;
    const dest = cellAt(nx, ny);
    if (isWall(dest)) return;
    if (hasBox(dest)) {
      const bx = nx+dx, by = ny+dy;
      const beyond = cellAt(bx, by);
      if (isWall(beyond) || hasBox(beyond)) return;
      // двигаем ящик
      setCell(bx, by, isGoal(beyond) ? "*" : "$");
      setCell(nx, ny, isGoal(dest) ? "." : " ");
    }
    // двигаем игрока
    setCell(px, py, (cellAt(px,py) === "+") ? "." : " ");
    setCell(nx, ny, isGoal(cellAt(nx,ny)) ? "+" : "@");
    px = nx; py = ny;
    checkWin();
    render();
  }

  function setCell(x,y,c){ map[y][x] = c; }

  function checkWin() {
    const boxesLeft = map.some(row => row.includes("$"));
    if (!boxesLeft) {
      won = true;
      if (level + 1 < LEVELS.length) {
        setTimeout(() => loadLevel(level + 1), 600);
      } else if (!finishedAll) {
        finishedAll = true;
        if (onResult) onResult({ result: "win" });
      }
    }
  }

  function render() {
    statusEl.textContent = won
      ? (finishedAll ? "🏆 Все уровни пройдены! +5💰" : "✓ Уровень пройден!")
      : `📦 Уровень ${level+1} / ${LEVELS.length}`;
    const w = Math.max(...map.map(r => r.length));
    gridEl.style.gridTemplateColumns = `repeat(${w}, 26px)`;
    gridEl.innerHTML = "";
    for (let y=0;y<map.length;y++) for (let x=0;x<w;x++) {
      const c = cellAt(x,y);
      const cell = document.createElement("div");
      cell.className = "sk2-cell";
      if (c === "#") { cell.classList.add("sk2-wall"); }
      else if (c === "$") { cell.classList.add("sk2-box"); cell.textContent = "📦"; }
      else if (c === "*") { cell.classList.add("sk2-box-ok"); cell.textContent = "📦"; }
      else if (c === "@" || c === "+") { cell.classList.add("sk2-player"); cell.textContent = "🐱"; if(c==="+")cell.classList.add("sk2-on-goal"); }
      else if (c === ".") { cell.classList.add("sk2-goal"); cell.textContent = "◎"; }
      gridEl.appendChild(cell);
    }
  }

  return { destroy: () => { window.removeEventListener("keydown", keyDown, true); } };
}
