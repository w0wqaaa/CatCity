/**
 * Арена флагов (Capture the Flag). WASD/стрелки — движение.
 * Забери флаг врага (справа) и принеси на свою базу (слева).
 * Бот-преследователь ловит тебя — теряешь флаг. Доставь 3 флага. +8💰.
 */
const CELL = 28, COLS = 15, ROWS = 11;
const W = CELL*COLS, H = CELL*ROWS, BOT_STEP = 230, NEED = 3;

export function createCTF(container, { onResult } = {}) {
  let me, bot, enemyFlag, carrying, score, over, raf, acc, last, destroyed=false;
  const keys = {};

  container.innerHTML = `
    <div class="cf-root">
      <div class="cf-status" id="cfStatus"></div>
      <canvas id="cfCanvas" width="${W}" height="${H}"></canvas>
      <div class="cf-hint">WASD / стрелки — движение · Забери 🚩 справа → неси на 🏠 слева</div>
      <button class="mg-btn" id="cfRestart" style="margin-top:6px">🔄 Заново</button>
    </div>`;
  const canvas = container.querySelector("#cfCanvas");
  const ctx = canvas.getContext("2d");
  const statusEl = container.querySelector("#cfStatus");
  container.querySelector("#cfRestart").addEventListener("click", start);

  const kd = (e) => onKey(e);
  window.addEventListener("keydown", kd, true);
  start();

  function start() {
    me = { x:1, y:5 };
    bot = { x:10, y:5 };
    enemyFlag = { x:COLS-2, y:5, taken:false };
    carrying = false; score = 0; over = false; acc = 0; last = performance.now();
    if (raf) cancelAnimationFrame(raf);
    loop(last);
  }

  function onKey(e) {
    const m = { KeyW:[0,-1],ArrowUp:[0,-1], KeyS:[0,1],ArrowDown:[0,1], KeyA:[-1,0],ArrowLeft:[-1,0], KeyD:[1,0],ArrowRight:[1,0] };
    const d = m[e.code]; if (!d) return;
    e.preventDefault(); e.stopPropagation();
    if (over) return;
    const nx = me.x+d[0], ny = me.y+d[1];
    if (nx>=0&&ny>=0&&nx<COLS&&ny<ROWS) { me.x=nx; me.y=ny; checkState(); }
  }

  function checkState() {
    // взять флаг
    if (!carrying && !enemyFlag.taken && me.x===enemyFlag.x && me.y===enemyFlag.y) {
      carrying = true; enemyFlag.taken = true;
    }
    // доставить на базу (левая колонка)
    if (carrying && me.x === 0) {
      carrying = false; score++;
      enemyFlag = { x:COLS-2, y:1+Math.floor(Math.random()*(ROWS-2)), taken:false };
      if (score >= NEED) return finish(true);
    }
    // пойман ботом
    if (me.x===bot.x && me.y===bot.y) caught();
  }

  function caught() {
    if (carrying) { carrying = false; enemyFlag.taken = false; }
    me = { x:1, y:5 }; // респавн на базе
  }

  function loop(t) {
    if (destroyed) return;
    const dt = t-last; last = t;
    if (!over) { acc += dt; if (acc >= BOT_STEP) { acc = 0; botMove(); } }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function botMove() {
    // преследует игрока
    const dx = Math.sign(me.x - bot.x), dy = Math.sign(me.y - bot.y);
    if (Math.abs(me.x-bot.x) > Math.abs(me.y-bot.y)) bot.x += dx;
    else if (dy) bot.y += dy;
    else bot.x += dx;
    if (me.x===bot.x && me.y===bot.y) caught();
  }

  function finish(win) {
    over = true;
    statusEl.textContent = win ? "🏆 Победа! Все флаги доставлены. +8💰" : "Игра окончена";
    if (onResult) onResult({ result: win ? "win" : "lose" });
  }

  function draw() {
    if (!over) statusEl.textContent = `🚩 Доставлено: ${score} / ${NEED}${carrying ? "  ·  несёшь флаг!" : ""}`;
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0,0,W,H);
    // зоны баз
    ctx.fillStyle = "rgba(60,120,220,0.18)"; ctx.fillRect(0,0,CELL,H);
    ctx.fillStyle = "rgba(220,60,60,0.15)"; ctx.fillRect(W-CELL,0,CELL,H);
    // сетка
    ctx.strokeStyle = "rgba(80,90,140,0.15)"; ctx.lineWidth=1;
    for (let x=1;x<COLS;x++){ ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,H);ctx.stroke(); }
    for (let y=1;y<ROWS;y++){ ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(W,y*CELL);ctx.stroke(); }
    // твоя база
    glyph(0, 5, "🏠");
    // флаг врага
    if (!enemyFlag.taken) glyph(enemyFlag.x, enemyFlag.y, "🚩");
    // бот
    glyph(bot.x, bot.y, "👹");
    // игрок (+флаг если несёт)
    glyph(me.x, me.y, carrying ? "🏃" : "🐱");
    if (carrying) glyph(me.x, me.y, "🚩", 0.6);
  }

  function glyph(cx, cy, emoji, scale=1) {
    ctx.save();
    ctx.globalAlpha = scale<1?0.85:1;
    ctx.font = `${Math.floor(CELL*0.8*scale)}px serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(emoji, cx*CELL+CELL/2, cy*CELL+CELL/2+1);
    ctx.restore();
  }

  return { destroy: () => { destroyed=true; if(raf)cancelAnimationFrame(raf); window.removeEventListener("keydown", kd, true); } };
}
