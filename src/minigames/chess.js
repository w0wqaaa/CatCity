/**
 * Шахматы (casual) — ты (белые) против бота.
 * Полные ходы фигур, авто-превращение в ферзя. Без рокировки/взятия на проходе.
 * Партия завершается взятием короля. Победа над ботом +15💰.
 */
const START = [
  "rnbqkbnr",
  "pppppppp",
  "........",
  "........",
  "........",
  "........",
  "PPPPPPPP",
  "RNBQKBNR",
];
const VAL = { p:1, n:3, b:3, r:5, q:9, k:100 };
const GLYPH = { K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙", k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟" };

export function createChess(container, { onResult } = {}) {
  let board, sel, turn, over, msg;

  container.innerHTML = `
    <div class="ch-root">
      <div class="ch-status" id="chStatus"></div>
      <div class="ch-board" id="chBoard"></div>
      <button class="mg-btn" id="chRestart" style="margin-top:8px">🔄 Новая партия</button>
    </div>`;
  const statusEl = container.querySelector("#chStatus");
  const boardEl = container.querySelector("#chBoard");
  container.querySelector("#chRestart").addEventListener("click", start);

  function start() {
    board = START.map(r => r.split(""));
    sel = null; turn = "w"; over = false; msg = "Твой ход (белые)";
    render();
  }

  const isWhite = (p) => p !== "." && p === p.toUpperCase();
  const isBlack = (p) => p !== "." && p === p.toLowerCase();
  const mine = (p) => turn === "w" ? isWhite(p) : isBlack(p);
  const enemy = (p) => turn === "w" ? isBlack(p) : isWhite(p);

  function moves(x, y, b = board, side = turn) {
    const p = b[y][x]; if (p === ".") return [];
    const white = isWhite(p); const t = p.toLowerCase();
    if ((side === "w") !== white) return [];
    const res = [];
    const own = (xx,yy) => b[yy][xx] !== "." && (isWhite(b[yy][xx]) === white);
    const inB = (xx,yy) => xx>=0&&yy>=0&&xx<8&&yy<8;
    const add = (xx,yy) => { if (inB(xx,yy) && !own(xx,yy)) res.push([xx,yy]); };
    const slide = (dirs) => { for (const [dx,dy] of dirs) { let nx=x+dx,ny=y+dy; while(inB(nx,ny)){ if(own(nx,ny))break; res.push([nx,ny]); if(b[ny][nx]!==".")break; nx+=dx;ny+=dy; } } };

    if (t === "p") {
      const dir = white ? -1 : 1, startRow = white ? 6 : 1;
      if (inB(x,y+dir) && b[y+dir][x] === ".") { res.push([x,y+dir]);
        if (y===startRow && b[y+2*dir][x]===".") res.push([x,y+2*dir]); }
      for (const dx of [-1,1]) { const nx=x+dx, ny=y+dir;
        if (inB(nx,ny) && b[ny][nx]!=="." && (isWhite(b[ny][nx])!==white)) res.push([nx,ny]); }
    } else if (t === "n") {
      for (const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]]) add(x+dx,y+dy);
    } else if (t === "b") slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
    else if (t === "r") slide([[1,0],[-1,0],[0,1],[0,-1]]);
    else if (t === "q") slide([[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]);
    else if (t === "k") for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) add(x+dx,y+dy);
    return res;
  }

  function doMove(fx, fy, tx, ty) {
    let p = board[fy][fx];
    board[ty][tx] = p;
    board[fy][fx] = ".";
    // превращение
    if (p === "P" && ty === 0) board[ty][tx] = "Q";
    if (p === "p" && ty === 7) board[ty][tx] = "q";
  }

  function kingAlive(side) {
    const k = side === "w" ? "K" : "k";
    return board.some(row => row.includes(k));
  }

  function onCell(x, y) {
    if (over || turn !== "w") return;
    const p = board[y][x];
    if (sel) {
      const legal = moves(sel[0], sel[1]).some(([mx,my]) => mx===x && my===y);
      if (legal) {
        doMove(sel[0], sel[1], x, y); sel = null;
        if (!kingAlive("b")) return endGame(true);
        turn = "b"; render();
        setTimeout(botMove, 450);
        return;
      }
      sel = (mine(p)) ? [x,y] : null;
    } else if (mine(p)) {
      sel = [x,y];
    }
    render();
  }

  function botMove() {
    if (over) return;
    // собрать все ходы чёрных, выбрать лучший по жадности (взятие старшей фигуры)
    const all = [];
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
      if (isBlack(board[y][x])) for (const [mx,my] of moves(x,y,board,"b")) {
        const cap = board[my][mx]; const gain = cap==="." ? 0 : VAL[cap.toLowerCase()];
        all.push({ fx:x, fy:y, tx:mx, ty:my, gain });
      }
    }
    if (!all.length) return endGame(true); // боту нечем ходить
    const best = Math.max(...all.map(m=>m.gain));
    const pool = all.filter(m=>m.gain===best);
    const mv = pool[Math.floor(Math.random()*pool.length)];
    doMove(mv.fx, mv.fy, mv.tx, mv.ty);
    if (!kingAlive("w")) return endGame(false);
    turn = "w"; msg = "Твой ход (белые)"; render();
  }

  function endGame(win) {
    over = true;
    msg = win ? "🏆 Победа! Король врага пал. +15💰" : "💀 Поражение — твой король взят.";
    if (onResult) onResult({ result: win ? "win" : "lose" });
    render();
  }

  function render() {
    statusEl.textContent = msg;
    const legalSet = sel ? new Set(moves(sel[0],sel[1]).map(([x,y])=>x+","+y)) : new Set();
    boardEl.innerHTML = "";
    for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
      const c = document.createElement("div");
      c.className = "ch-sq " + ((x+y)%2 ? "ch-dark" : "ch-light");
      if (sel && sel[0]===x && sel[1]===y) c.classList.add("ch-sel");
      if (legalSet.has(x+","+y)) c.classList.add("ch-move");
      const p = board[y][x];
      if (p !== ".") { c.textContent = GLYPH[p]; c.classList.add(isWhite(p)?"ch-w":"ch-b"); }
      c.addEventListener("click", () => onCell(x,y));
      boardEl.appendChild(c);
    }
  }

  start();
  return { destroy: () => {} };
}
