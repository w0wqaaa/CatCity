/**
 * Blackjack mini-game
 * Player vs Dealer (bot draws until 17+)
 */

const SUITS   = ["♠", "♥", "♦", "♣"];
const VALUES  = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const CARD_W  = 60;
const CARD_H  = 88;

function buildDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const value of VALUES)
      deck.push({ suit, value });
  return shuffle(deck);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardNumeric(value) {
  if (["J","Q","K"].includes(value)) return 10;
  if (value === "A") return 11;
  return parseInt(value, 10);
}

function handTotal(hand) {
  let total = hand.reduce((s, c) => s + cardNumeric(c.value), 0);
  let aces  = hand.filter(c => c.value === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isSuitRed(suit) { return suit === "♥" || suit === "♦"; }

export function createBlackjack(container, { playerStats, onGoldChange, onResult }) {
  let deck   = buildDeck();
  let playerHand = [];
  let dealerHand = [];
  let bet    = 1;
  let phase  = "bet"; // "bet" | "play" | "done"

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = "";

  const dealerArea = document.createElement("div");
  dealerArea.className = "bj-area";

  const dealerLabel = document.createElement("div");
  dealerLabel.className = "bj-label";
  dealerLabel.textContent = "Дилер";

  const dealerCanvas = document.createElement("canvas");
  dealerCanvas.className = "bj-canvas";

  const playerLabel = document.createElement("div");
  playerLabel.className = "bj-label";
  playerLabel.style.marginTop = "10px";
  playerLabel.textContent = "Ты";

  const playerCanvas = document.createElement("canvas");
  playerCanvas.className = "bj-canvas";

  const statusEl = document.createElement("div");
  statusEl.className = "mg-status";

  const controlsEl = document.createElement("div");
  controlsEl.className = "bj-controls";

  container.appendChild(dealerLabel);
  container.appendChild(dealerCanvas);
  container.appendChild(playerLabel);
  container.appendChild(playerCanvas);
  container.appendChild(statusEl);
  container.appendChild(controlsEl);

  function setCanvasSize(canvas, count) {
    canvas.width  = Math.max(3, count) * (CARD_W + 8) + 8;
    canvas.height = CARD_H + 16;
    canvas.style.width  = canvas.width  + "px";
    canvas.style.height = canvas.height + "px";
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  function drawHand(canvas, hand, hideSecond = false) {
    setCanvasSize(canvas, hand.length);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hand.forEach((card, i) => {
      const x = 8 + i * (CARD_W + 8);
      const y = 8;
      if (hideSecond && i === 1) {
        drawCardBack(ctx, x, y);
      } else {
        drawCard(ctx, x, y, card);
      }
    });
  }

  function drawCard(ctx, x, y, card) {
    const red = isSuitRed(card.suit);
    ctx.fillStyle = "#f5f0ff";
    ctx.strokeStyle = "#7744cc";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, CARD_W, CARD_H, 5);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = red ? "#cc2244" : "#221144";
    ctx.font = "bold 14px monospace";
    ctx.fillText(card.value, x + 4, y + 16);
    ctx.font = "16px serif";
    ctx.fillText(card.suit, x + 4, y + 32);
    // Center
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.fillText(card.suit, x + CARD_W / 2, y + CARD_H / 2 + 8);
    ctx.textAlign = "left";
    // Bottom (flipped)
    ctx.save();
    ctx.translate(x + CARD_W, y + CARD_H);
    ctx.rotate(Math.PI);
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = red ? "#cc2244" : "#221144";
    ctx.fillText(card.value, 4, 16);
    ctx.font = "16px serif";
    ctx.fillText(card.suit, 4, 32);
    ctx.restore();
  }

  function drawCardBack(ctx, x, y) {
    ctx.fillStyle = "#2a1060";
    ctx.strokeStyle = "#7744cc";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, CARD_W, CARD_H, 5);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(120,70,220,0.3)";
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++)
        ctx.fillRect(x + 6 + c*18, y + 8 + r*20, 14, 16);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  // ── Bet phase ─────────────────────────────────────────────────────────────
  function showBetUI() {
    phase = "bet";
    statusEl.textContent = `Твоё золото: ${playerStats.gold} 💰`;
    controlsEl.innerHTML = "";

    const betRow = document.createElement("div");
    betRow.className = "bj-bet-row";

    const label = document.createElement("span");
    label.className = "bj-bet-label";
    label.textContent = "Ставка:";

    const dec = document.createElement("button");
    dec.className = "mg-btn-small";
    dec.textContent = "−";
    dec.addEventListener("click", () => { bet = Math.max(1, bet - 1); betInput.textContent = bet; });

    const betInput = document.createElement("span");
    betInput.className = "bj-bet-val";
    betInput.textContent = bet;

    const inc = document.createElement("button");
    inc.className = "mg-btn-small";
    inc.textContent = "+";
    inc.addEventListener("click", () => { bet = Math.min(10, Math.min(playerStats.gold, bet + 1)); betInput.textContent = bet; });

    const dealBtn = document.createElement("button");
    dealBtn.className = "mg-btn";
    dealBtn.textContent = "🃏 Раздать";
    dealBtn.addEventListener("click", startRound);

    betRow.append(label, dec, betInput, inc);
    controlsEl.append(betRow, dealBtn);

    // Reset canvases
    setCanvasSize(dealerCanvas, 2);
    setCanvasSize(playerCanvas, 2);
    dealerCanvas.getContext("2d").clearRect(0, 0, dealerCanvas.width, dealerCanvas.height);
    playerCanvas.getContext("2d").clearRect(0, 0, playerCanvas.width, playerCanvas.height);
  }

  // ── Round ─────────────────────────────────────────────────────────────────
  function startRound() {
    if (playerStats.gold < bet) {
      statusEl.textContent = "Недостаточно золота!";
      return;
    }
    if (deck.length < 10) deck = buildDeck();

    playerHand = [deck.pop(), deck.pop()];
    dealerHand = [deck.pop(), deck.pop()];
    phase = "play";

    drawHand(dealerCanvas, dealerHand, true);
    drawHand(playerCanvas, playerHand);

    const pTotal = handTotal(playerHand);
    statusEl.textContent = `Сумма: ${pTotal}`;
    playerLabel.textContent = `Ты (${pTotal})`;
    dealerLabel.textContent = `Дилер (?)`;

    controlsEl.innerHTML = "";

    if (pTotal === 21) {
      dealerLabel.textContent = "Дилер";
      drawHand(dealerCanvas, dealerHand, false);
      endRound();
      return;
    }

    const hitBtn = document.createElement("button");
    hitBtn.className = "mg-btn";
    hitBtn.textContent = "👆 Ещё";
    hitBtn.addEventListener("click", hit);

    const standBtn = document.createElement("button");
    standBtn.className = "mg-btn";
    standBtn.textContent = "✋ Хватит";
    standBtn.addEventListener("click", stand);

    controlsEl.append(hitBtn, standBtn);
  }

  function hit() {
    playerHand.push(deck.pop());
    const t = handTotal(playerHand);
    playerLabel.textContent = `Ты (${t})`;
    drawHand(playerCanvas, playerHand);
    statusEl.textContent = `Сумма: ${t}`;
    if (t > 21) {
      controlsEl.innerHTML = "";
      drawHand(dealerCanvas, dealerHand, false);
      dealerLabel.textContent = `Дилер (${handTotal(dealerHand)})`;
      endRound();
    }
  }

  function stand() {
    controlsEl.innerHTML = "";
    // Dealer draws until 17+
    while (handTotal(dealerHand) < 17) {
      dealerHand.push(deck.pop());
    }
    drawHand(dealerCanvas, dealerHand, false);
    dealerLabel.textContent = `Дилер (${handTotal(dealerHand)})`;
    endRound();
  }

  function endRound() {
    phase = "done";
    const p = handTotal(playerHand);
    const d = handTotal(dealerHand);
    let result, msg, goldDelta;

    if (p > 21) {
      result = "lose"; msg = `Перебор! (${p}) Ты проиграл.`; goldDelta = -bet;
    } else if (d > 21) {
      result = "win";  msg = `Дилер перебор (${d})! Ты выиграл +${bet}💰`; goldDelta = bet;
    } else if (p > d) {
      result = "win";  msg = `${p} > ${d}. Ты выиграл +${bet}💰`; goldDelta = bet;
    } else if (p < d) {
      result = "lose"; msg = `${p} < ${d}. Ты проиграл -${bet}💰`; goldDelta = -bet;
    } else {
      result = "draw"; msg = `Ничья (${p}). Ставка возвращена.`; goldDelta = 0;
    }

    statusEl.textContent = msg;
    if (goldDelta !== 0) onGoldChange(goldDelta);
    onResult({ result });

    const playAgainBtn = document.createElement("button");
    playAgainBtn.className = "mg-btn";
    playAgainBtn.textContent = "🔄 Ещё раз";
    playAgainBtn.addEventListener("click", showBetUI);
    controlsEl.appendChild(playAgainBtn);
  }

  showBetUI();
  return { destroy: () => {} };
}
