/**
 * Танчики Lite — ты против 2 ботов на сетке с укрытиями.
 * WASD/стрелки — движение, Space — выстрел. Уничтожь всех. +8💰.
 */
const CELL = 30, COLS = 13, ROWS = 11, W = CELL*COLS, H = CELL*ROWS;
const BULLET_SPEED = 6, BOT_MOVE = 500, BOT_SHOOT = 1300;
const DIRS = [[0,-1],[1,0],[0,1],[-1,0]]; // up right down left

export function createTanksLite(container, { onResult } = {}) {
  let grid, me, enemies, bullets, over, win, raf, last, destroyed=false;
  const keys = {};

  container.innerHTML = `
    <div class="tl-root">
      <div class="tl-status" id="tlStatus"></div>
      <canvas id="tlCanvas" width="${W}" height="${H}"></canvas>
      <div class="tl-hint">WASD / стрелки — движение · Space — выстрел</div>
      <button class="mg-btn" id="tlRestart" style="margin-top:6px">🔄 Заново</button>
    </div>`;
  const canvas = container.querySelector("#tlCanvas");
  const ctx = canvas.getContext("2d");
  const statusEl = container.querySelector("#tlStatus");
  container.querySelector("#tlRestart").addEventListener("click", start);

  const kd = (e)=>onKey(e,true), ku=(e)=>onKey(e,false);
  window.addEventListener("keydown", kd, true);
  window.addEventListener("keyup", ku, true);
  start();

  function start() {
    grid = buildMap();
    me = { px:CELL, py:(ROWS-2)*CELL, dir:0, alive:true, cd:0 };
    enemies = [
      { px:CELL, py:CELL, dir:2, alive:true, mAcc:0, sAcc:0 },
      { px:(COLS-2)*CELL, py:CELL, dir:2, alive:true, mAcc:0, sAcc:0 },
    ];
    bullets = []; over=false; win=false; last=performance.now();
    if (raf) cancelAnimationFrame(raf);
    loop(last);
  }

  function buildMap() {
    const g = Array.from({length:ROWS},()=>Array(COLS).fill(0));
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++)
      if (x===0||y===0||x===COLS-1||y===ROWS-1) g[y][x]=2; // сталь по краям
    // кирпичные укрытия
    for (let y=2;y<ROWS-2;y+=2) for (let x=2;x<COLS-2;x+=2)
      if (Math.random()<0.7) g[y][x]=1;
    return g;
  }

  function onKey(e, down) {
    const codes=["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"];
    if (!codes.includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    keys[e.code]=down;
    if (down && e.code==="Space" && !e.repeat) shoot(me);
  }

  function dirFromKeys() {
    if (keys.KeyW||keys.ArrowUp) return 0;
    if (keys.KeyD||keys.ArrowRight) return 1;
    if (keys.KeyS||keys.ArrowDown) return 2;
    if (keys.KeyA||keys.ArrowLeft) return 3;
    return -1;
  }

  function cellBlocked(px, py) {
    // проверяем углы танка (размер ~CELL-6)
    const s = 3, e = CELL-3;
    for (const [ox,oy] of [[s,s],[e,s],[s,e],[e,e]]) {
      const cx = Math.floor((px+ox)/CELL), cy = Math.floor((py+oy)/CELL);
      if (cx<0||cy<0||cx>=COLS||cy>=ROWS||grid[cy][cx]!==0) return true;
    }
    return false;
  }

  function shoot(tank) {
    if (!tank.alive) return;
    if (tank===me) { if (me.cd>0) return; me.cd = 350; }
    const [dx,dy]=DIRS[tank.dir];
    bullets.push({ x:tank.px+CELL/2, y:tank.py+CELL/2, dx, dy, mine: tank===me });
  }

  function loop(t) {
    if (destroyed) return;
    const dt = Math.min(t-last,50); last=t;
    if (!over) update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (me.cd>0) me.cd-=dt;
    // игрок
    const wd = dirFromKeys();
    if (wd>=0) {
      me.dir = wd;
      const [dx,dy]=DIRS[wd];
      const nx=me.px+dx*2, ny=me.py+dy*2;
      if (!cellBlocked(nx,ny)) { me.px=nx; me.py=ny; }
    }
    // боты
    for (const en of enemies) {
      if (!en.alive) continue;
      en.mAcc+=dt; en.sAcc+=dt;
      if (en.mAcc>=BOT_MOVE) { en.mAcc=0; botMove(en); }
      const [dx,dy]=DIRS[en.dir];
      const nx=en.px+dx*1.4, ny=en.py+dy*1.4;
      if (!cellBlocked(nx,ny)) { en.px=nx; en.py=ny; } else if (Math.random()<0.5) en.dir=Math.floor(Math.random()*4);
      if (en.sAcc>=BOT_SHOOT) { en.sAcc=0; shoot(en); }
    }
    // пули
    for (const b of bullets) { b.x+=b.dx*BULLET_SPEED; b.y+=b.dy*BULLET_SPEED; }
    bullets = bullets.filter(b => {
      const cx=Math.floor(b.x/CELL), cy=Math.floor(b.y/CELL);
      if (cx<0||cy<0||cx>=COLS||cy>=ROWS) return false;
      if (grid[cy][cx]===2) return false;
      if (grid[cy][cx]===1) { grid[cy][cx]=0; return false; }
      // попадание в танк
      if (b.mine) {
        for (const en of enemies) if (en.alive && hit(b,en)) { en.alive=false; return false; }
      } else {
        if (me.alive && hit(b,me)) { me.alive=false; return false; }
      }
      return true;
    });
    if (!me.alive) return finish(false);
    if (enemies.every(e=>!e.alive)) return finish(true);
  }

  function hit(b, tank) {
    return b.x>tank.px && b.x<tank.px+CELL && b.y>tank.py && b.y<tank.py+CELL;
  }

  function botMove(en) {
    en.dir = Math.floor(Math.random()*4);
  }

  function finish(w) {
    over=true; win=w;
    statusEl.textContent = w ? "🏆 Победа! +8💰" : "💀 Поражение";
    if (onResult) onResult({ result: w?"win":"lose" });
  }

  function draw() {
    if (!over) statusEl.textContent = `🎯 Врагов: ${enemies.filter(e=>e.alive).length}`;
    ctx.fillStyle="#0a0a14"; ctx.fillRect(0,0,W,H);
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      if (grid[y][x]===2){ ctx.fillStyle="#667"; ctx.fillRect(x*CELL+1,y*CELL+1,CELL-2,CELL-2); }
      else if (grid[y][x]===1){ ctx.fillStyle="#8b4a2a"; ctx.fillRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4); }
    }
    if (me.alive) drawTank(me, "#44cc88");
    for (const en of enemies) if (en.alive) drawTank(en, "#cc4455");
    ctx.fillStyle="#ffdd55";
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill(); }
    if (over) {
      ctx.fillStyle = win?"rgba(0,60,20,0.7)":"rgba(60,0,0,0.7)"; ctx.fillRect(0,H/2-26,W,52);
      ctx.fillStyle="#fff"; ctx.font="bold 20px monospace"; ctx.textAlign="center";
      ctx.fillText(win?"🏆 ПОБЕДА!":"💀 ПОРАЖЕНИЕ", W/2, H/2+7); ctx.textAlign="left";
    }
  }

  function drawTank(tank, color) {
    const x=tank.px, y=tank.py;
    ctx.fillStyle=color; ctx.fillRect(x+3,y+3,CELL-6,CELL-6);
    ctx.fillStyle="#fff";
    const [dx,dy]=DIRS[tank.dir], cx=x+CELL/2, cy=y+CELL/2;
    ctx.fillRect(cx-2+dx*8, cy-2+dy*8, 4, 4);
  }

  return { destroy: () => { destroyed=true; if(raf)cancelAnimationFrame(raf); window.removeEventListener("keydown",kd,true); window.removeEventListener("keyup",ku,true); } };
}
