/**
 * Tron Duel — световые мотоциклы. Ты (синий) против бота (красный).
 * WASD/стрелки — поворот. Оставляешь след; кто врежется — проиграл. +8💰.
 */
const CELL = 12, COLS = 40, ROWS = 30;
const W = CELL*COLS, H = CELL*ROWS, STEP = 70;

export function createTron(container, { onResult } = {}) {
  let grid, me, bot, over, win, raf, acc, last, started, destroyed=false;
  const keys = {};

  container.innerHTML = `
    <div class="tr-root">
      <div class="tr-status" id="trStatus">Нажми стрелку, чтобы начать</div>
      <canvas id="trCanvas" width="${W}" height="${H}"></canvas>
      <div class="tr-hint">WASD / стрелки — поворот</div>
      <button class="mg-btn" id="trRestart" style="margin-top:6px">🔄 Заново</button>
    </div>`;
  const canvas = container.querySelector("#trCanvas");
  const ctx = canvas.getContext("2d");
  const statusEl = container.querySelector("#trStatus");
  container.querySelector("#trRestart").addEventListener("click", start);

  const kd = (e) => onKey(e);
  window.addEventListener("keydown", kd, true);
  start();

  function start() {
    grid = Array.from({length:ROWS},()=>Array(COLS).fill(0));
    me  = { x:8,  y:15, dx:1, dy:0, alive:true };
    bot = { x:31, y:15, dx:-1, dy:0, alive:true };
    grid[me.y][me.x]=1; grid[bot.y][bot.x]=2;
    over=false; win=false; started=false; acc=0; last=performance.now();
    statusEl.textContent = "Нажми стрелку, чтобы начать";
    if (raf) cancelAnimationFrame(raf);
    loop(last);
  }

  function onKey(e) {
    const turns = { KeyW:[0,-1],ArrowUp:[0,-1], KeyS:[0,1],ArrowDown:[0,1], KeyA:[-1,0],ArrowLeft:[-1,0], KeyD:[1,0],ArrowRight:[1,0] };
    const t = turns[e.code];
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (over) return;
    if (t[0] === -me.dx && t[1] === -me.dy) return; // нельзя назад
    me.dx = t[0]; me.dy = t[1];
    started = true;
  }

  function loop(t) {
    if (destroyed) return;
    const dt = t - last; last = t;
    if (started && !over) { acc += dt; if (acc >= STEP) { acc = 0; step(); } }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function botThink() {
    // едет прямо, поворачивает если впереди препятствие
    const ahead = blocked(bot.x+bot.dx, bot.y+bot.dy);
    if (ahead) {
      const opts = [[bot.dy,-bot.dx],[-bot.dy,bot.dx]].filter(([dx,dy])=>!blocked(bot.x+dx,bot.y+dy));
      if (opts.length) { const [dx,dy]=opts[Math.floor(Math.random()*opts.length)]; bot.dx=dx; bot.dy=dy; }
    } else if (Math.random()<0.1) {
      const opts = [[bot.dy,-bot.dx],[-bot.dy,bot.dx]].filter(([dx,dy])=>!blocked(bot.x+dx,bot.y+dy));
      if (opts.length && Math.random()<0.5) { const [dx,dy]=opts[Math.floor(Math.random()*opts.length)]; bot.dx=dx; bot.dy=dy; }
    }
  }

  function blocked(x,y){ return x<0||y<0||x>=COLS||y>=ROWS||grid[y][x]!==0; }

  function step() {
    botThink();
    const m = { x:me.x+me.dx, y:me.y+me.dy };
    const b = { x:bot.x+bot.dx, y:bot.y+bot.dy };
    const mDead = blocked(m.x,m.y) || (m.x===b.x && m.y===b.y);
    const bDead = blocked(b.x,b.y) || (m.x===b.x && m.y===b.y);
    if (mDead || bDead) return finish(!mDead && bDead ? true : (mDead && bDead ? null : false));
    me.x=m.x; me.y=m.y; grid[m.y][m.x]=1;
    bot.x=b.x; bot.y=b.y; grid[b.y][b.x]=2;
  }

  function finish(playerWon) {
    over = true; win = playerWon === true;
    statusEl.textContent = playerWon===true ? "🏆 Победа! +8💰" : playerWon===null ? "🤝 Ничья!" : "💀 Поражение";
    if (onResult) onResult({ result: win ? "win" : "lose" });
  }

  function draw() {
    ctx.fillStyle = "#08060f"; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = "rgba(80,120,200,0.4)"; ctx.lineWidth=2; ctx.strokeRect(1,1,W-2,H-2);
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      if (grid[y][x]===1) ctx.fillStyle="#22aaff";
      else if (grid[y][x]===2) ctx.fillStyle="#ff4455";
      else continue;
      ctx.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2);
    }
    // головы
    ctx.fillStyle="#aaddff"; ctx.fillRect(me.x*CELL,me.y*CELL,CELL,CELL);
    ctx.fillStyle="#ffaabb"; ctx.fillRect(bot.x*CELL,bot.y*CELL,CELL,CELL);
  }

  return { destroy: () => { destroyed=true; if(raf)cancelAnimationFrame(raf); window.removeEventListener("keydown", kd, true); } };
}
