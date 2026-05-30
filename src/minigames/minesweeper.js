/**
 * Сапёр (Minesweeper) — 9×9, 10 мин. Клик — открыть, ПКМ — флаг.
 * Победа: открыты все безопасные клетки. Награда +10💰.
 */
const N = 9, MINES = 10;

export function createMinesweeper(container, { onResult } = {}) {
  let grid, revealed, flagged, over, win, firstClick, safeLeft;

  container.innerHTML = `
    <div class="ms-root">
      <div class="ms-status" id="msStatus"></div>
      <div class="ms-grid" id="msGrid"></div>
      <button class="mg-btn" id="msRestart" style="margin-top:8px">🔄 Заново</button>
    </div>`;
  const statusEl = container.querySelector("#msStatus");
  const gridEl = container.querySelector("#msGrid");
  container.querySelector("#msRestart").addEventListener("click", start);
  start();

  function start() {
    grid = Array.from({length:N},()=>Array(N).fill(0));
    revealed = Array.from({length:N},()=>Array(N).fill(false));
    flagged = Array.from({length:N},()=>Array(N).fill(false));
    over = false; win = false; firstClick = true; safeLeft = N*N - MINES;
    render();
  }

  function placeMines(sx, sy) {
    let placed = 0;
    while (placed < MINES) {
      const x = Math.floor(Math.random()*N), y = Math.floor(Math.random()*N);
      if (grid[y][x] === -1 || (Math.abs(x-sx)<=1 && Math.abs(y-sy)<=1)) continue;
      grid[y][x] = -1; placed++;
    }
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      if (grid[y][x] === -1) continue;
      let c = 0;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
        const nx=x+dx, ny=y+dy;
        if (nx>=0&&ny>=0&&nx<N&&ny<N&&grid[ny][nx]===-1) c++;
      }
      grid[y][x] = c;
    }
  }

  function reveal(x, y) {
    if (over || revealed[y][x] || flagged[y][x]) return;
    if (firstClick) { placeMines(x, y); firstClick = false; }
    revealed[y][x] = true;
    if (grid[y][x] === -1) { over = true; win = false; return finish(); }
    safeLeft--;
    if (grid[y][x] === 0) {
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
        const nx=x+dx, ny=y+dy;
        if (nx>=0&&ny>=0&&nx<N&&ny<N) reveal(nx, ny);
      }
    }
    if (safeLeft <= 0) { over = true; win = true; return finish(); }
  }

  function finish() {
    if (win && onResult) onResult({ result: "win" });
    else if (onResult) onResult({ result: "lose" });
    render();
  }

  function render() {
    const flags = flagged.flat().filter(Boolean).length;
    statusEl.textContent = over
      ? (win ? "🏆 Победа! +10💰" : "💥 Подорвался!")
      : `💣 Мин: ${MINES}  ·  🚩 ${flags}`;
    gridEl.innerHTML = "";
    for (let y=0;y<N;y++) for (let x=0;x<N;x++) {
      const c = document.createElement("div");
      c.className = "ms-cell";
      if (revealed[y][x]) {
        c.classList.add("ms-open");
        if (grid[y][x] === -1) { c.textContent = "💣"; c.classList.add("ms-mine"); }
        else if (grid[y][x] > 0) { c.textContent = grid[y][x]; c.dataset.n = grid[y][x]; }
      } else if (flagged[y][x]) {
        c.textContent = "🚩";
      } else if (over && grid[y][x] === -1) {
        c.textContent = "💣"; c.classList.add("ms-open");
      }
      c.addEventListener("click", () => { reveal(x,y); render(); });
      c.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!revealed[y][x] && !over) { flagged[y][x] = !flagged[y][x]; render(); }
      });
      gridEl.appendChild(c);
    }
  }

  return { destroy: () => {} };
}
