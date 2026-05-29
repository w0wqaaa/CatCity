/**
 * Tic-Tac-Toe mini-game
 * Player = X, Bot = O
 * Supports vs Bot and Local PvP
 */

const CELL_SIZE = 100;
const W = 300;
const H = 300;
const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export function createTicTacToe(container, { mode, onResult }) {
  // mode: "bot" | "pvp"
  let board  = Array(9).fill(null); // null | "X" | "O"
  let current = "X";
  let over   = false;
  let botSymbol = mode === "bot" ? "O" : null;

  // ── DOM ────────────────────────────────────────────────────────────────────
  container.innerHTML = "";

  const statusEl = document.createElement("div");
  statusEl.className = "mg-status";
  statusEl.textContent = mode === "bot" ? "Ты ходишь первым (X)" : "Ход: X";

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  canvas.style.cssText = `display:block;cursor:pointer;margin:0 auto;image-rendering:pixelated;border-radius:6px;width:${W}px;height:${H}px`;

  const ctx = canvas.getContext("2d");

  const restartBtn = document.createElement("button");
  restartBtn.className = "mg-btn";
  restartBtn.textContent = "🔄 Ещё раз";
  restartBtn.style.display = "none";
  restartBtn.addEventListener("click", restart);

  container.appendChild(statusEl);
  container.appendChild(canvas);
  container.appendChild(restartBtn);

  // ── Events ─────────────────────────────────────────────────────────────────
  canvas.addEventListener("click", (e) => {
    if (over) return;
    if (mode === "bot" && current === botSymbol) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top)  * (H / rect.height);
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    const idx = row * 3 + col;
    if (col < 0 || col > 2 || row < 0 || row > 2 || board[idx]) return;
    makeMove(idx, current);
  });

  // ── Logic ──────────────────────────────────────────────────────────────────
  function makeMove(idx, symbol) {
    board[idx] = symbol;
    draw();
    const winner = checkWinner();
    if (winner) {
      finalize(winner);
      return;
    }
    if (board.every(Boolean)) {
      finalize(null); // draw
      return;
    }
    current = current === "X" ? "O" : "X";
    if (mode === "pvp") {
      statusEl.textContent = `Ход: ${current}`;
    } else {
      statusEl.textContent = current === botSymbol ? "Бот думает..." : "Твой ход (X)";
      if (current === botSymbol) {
        setTimeout(botMove, 400);
      }
    }
  }

  function botMove() {
    if (over) return;
    const idx = getBotMove();
    makeMove(idx, botSymbol);
  }

  function getBotMove() {
    const empty = board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
    // 1. Win
    for (const i of empty) {
      board[i] = "O";
      if (checkWinner() === "O") { board[i] = null; return i; }
      board[i] = null;
    }
    // 2. Block
    for (const i of empty) {
      board[i] = "X";
      if (checkWinner() === "X") { board[i] = null; return i; }
      board[i] = null;
    }
    // 3. Center
    if (!board[4]) return 4;
    // 4. Corner
    for (const i of [0, 2, 6, 8]) if (!board[i]) return i;
    // 5. Any
    return empty[0];
  }

  function checkWinner() {
    for (const [a,b,c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
  }

  function finalize(winner) {
    over = true;
    restartBtn.style.display = "inline-block";
    let result, msg;
    if (!winner) {
      result = "draw";
      msg = "Ничья!";
    } else if (mode === "pvp") {
      result = "win";
      msg = `Победил ${winner}!`;
    } else if (winner === "X") {
      result = "win";
      msg = "🏆 Ты выиграл!";
    } else {
      result = "lose";
      msg = "💀 Бот выиграл.";
    }
    statusEl.textContent = msg;
    draw(winner);
    onResult({ result, winner });
  }

  function restart() {
    board   = Array(9).fill(null);
    current = "X";
    over    = false;
    restartBtn.style.display = "none";
    statusEl.textContent = mode === "bot" ? "Ты ходишь первым (X)" : "Ход: X";
    draw();
    onResult({ result: "restart" });
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  function draw(winner = null) {
    ctx.fillStyle = "#0d0820";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "rgba(130,80,220,0.8)";
    ctx.lineWidth = 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 10); ctx.lineTo(i * CELL_SIZE, H - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, i * CELL_SIZE); ctx.lineTo(W - 10, i * CELL_SIZE); ctx.stroke();
    }

    // Symbols
    for (let i = 0; i < 9; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx  = col * CELL_SIZE + CELL_SIZE / 2;
      const cy  = row * CELL_SIZE + CELL_SIZE / 2;
      if (board[i] === "X") drawX(cx, cy);
      if (board[i] === "O") drawO(cx, cy);
    }

    // Winning line
    if (winner) {
      for (const [a,b,c] of WIN_LINES) {
        if (board[a] === winner && board[a] === board[b] && board[a] === board[c]) {
          const ax = (a % 3) * CELL_SIZE + CELL_SIZE / 2;
          const ay = Math.floor(a / 3) * CELL_SIZE + CELL_SIZE / 2;
          const cx2 = (c % 3) * CELL_SIZE + CELL_SIZE / 2;
          const cy2 = Math.floor(c / 3) * CELL_SIZE + CELL_SIZE / 2;
          ctx.strokeStyle = winner === "X" ? "#ff6688" : "#66aaff";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(cx2, cy2);
          ctx.stroke();
          break;
        }
      }
    }
  }

  function drawX(cx, cy) {
    const r = 32;
    ctx.save();
    ctx.strokeStyle = "#ff6688";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ff6688"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
    ctx.restore();
  }

  function drawO(cx, cy) {
    ctx.save();
    ctx.strokeStyle = "#66aaff";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#66aaff"; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  draw();
  return { destroy: () => {} };
}
