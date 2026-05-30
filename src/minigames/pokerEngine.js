/**
 * Texas Hold'em engine — N игроков (2–6).
 * Чистая стейт-машина: НИКАКОГО DOM и НИКАКИХ ботов.
 * Ходы подаются через applyAction(action) — это делает движок
 * пригодным для онлайна (локально action создаёт UI, в сети — сеть).
 *
 * action: { type: "fold"|"check"|"call"|"raise"|"allin", amount? }
 */

const SUITS  = ["♠", "♥", "♦", "♣"];
const RANKS  = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RANK_VAL = Object.fromEntries(RANKS.map((r, i) => [r, i + 2])); // 2..14

export const START_CHIPS = 100;
export const SMALL_BLIND = 1;
export const BIG_BLIND   = 2;

// ─── Колода ─────────────────────────────────────────────────────────────────
function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ─── Создание игры ─────────────────────────────────────────────────────────
export function createPokerEngine(playerNames = ["Игрок 1", "Игрок 2"]) {
  const N = playerNames.length;
  const state = {
    n: N,
    players: playerNames.map((name, i) => ({
      i, name,
      chips: START_CHIPS,
      hole: [],
      bet: 0,           // ставка в текущем раунде торговли
      committed: 0,     // всего вложено в банк за раздачу
      folded: false,
      allIn: false,
      acted: false,
      out: false,       // выбыл из игры (нет фишек)
    })),
    deck: [],
    community: [],
    pot: 0,
    pots: [],           // боковые банки (на вскрытии)
    stage: "idle",      // idle|preflop|flop|turn|river|showdown|handover|gameover
    currentBet: 0,
    minRaise: BIG_BLIND,
    button: 0,
    toAct: 0,
    lastWinner: null,
    lastResult: null,
    handNumber: 0,
  };

  return {
    getState: () => state,
    startHand: () => startHand(state),
    applyAction: (action) => applyAction(state, action),
    legalActions: () => legalActions(state),
  };
}

// ─── Новая раздача ────────────────────────────────────────────────────────
function startHand(state) {
  // Отмечаем выбывших
  state.players.forEach(p => { if (p.chips <= 0) p.out = true; });
  const alive = state.players.filter(p => !p.out);
  if (alive.length < 2) { state.stage = "gameover"; return state; }

  state.handNumber++;
  state.deck = buildDeck();
  state.community = [];
  state.pot = 0;
  state.pots = [];
  state.currentBet = 0;
  state.minRaise = BIG_BLIND;
  state.lastWinner = null;
  state.lastResult = null;

  // Перемещаем кнопку на следующего живого
  state.button = state.handNumber === 1
    ? firstAlive(state, 0)
    : nextAlive(state, state.button);

  state.players.forEach(p => {
    p.bet = 0; p.committed = 0; p.folded = false; p.allIn = false; p.acted = false;
    p.hole = p.out ? [] : [state.deck.pop(), state.deck.pop()];
  });

  const headsUp = alive.length === 2;
  let sbIdx, bbIdx, firstToAct;

  if (headsUp) {
    // Heads-up: кнопка = малый блайнд, ходит первым на префлопе
    sbIdx = state.button;
    bbIdx = nextAlive(state, state.button);
    firstToAct = sbIdx;
  } else {
    sbIdx = nextAlive(state, state.button);
    bbIdx = nextAlive(state, sbIdx);
    firstToAct = nextAlive(state, bbIdx); // UTG
  }

  postBlind(state, sbIdx, SMALL_BLIND);
  postBlind(state, bbIdx, BIG_BLIND);
  state.currentBet = BIG_BLIND;
  state.minRaise = BIG_BLIND;

  state.stage = "preflop";
  state.players.forEach(p => p.acted = false);
  state.toAct = firstToAct;
  if (notActable(state.players[state.toAct])) advanceTurn(state);
  return state;
}

function postBlind(state, idx, amount) {
  const p = state.players[idx];
  const pay = Math.min(amount, p.chips);
  p.chips -= pay; p.bet += pay; p.committed += pay; state.pot += pay;
  if (p.chips === 0) p.allIn = true;
}

// ─── Навигация по кругу ───────────────────────────────────────────────────
function firstAlive(state, from) {
  for (let k = 0; k < state.n; k++) {
    const i = (from + k) % state.n;
    if (!state.players[i].out) return i;
  }
  return from;
}
function nextAlive(state, from) {
  for (let k = 1; k <= state.n; k++) {
    const i = (from + k) % state.n;
    if (!state.players[i].out) return i;
  }
  return from;
}
function notActable(p) { return p.out || p.folded || p.allIn; }

function advanceTurn(state) {
  let guard = 0, i = state.toAct;
  do {
    i = (i + 1) % state.n;
    guard++;
  } while (notActable(state.players[i]) && guard <= state.n);
  state.toAct = i;
}

// ─── Доступные действия ──────────────────────────────────────────────────────
function legalActions(state) {
  if (!["preflop","flop","turn","river"].includes(state.stage)) return [];
  const p = state.players[state.toAct];
  if (notActable(p)) return [];

  const toCall = state.currentBet - p.bet;
  const actions = [{ type: "fold" }];

  if (toCall === 0) actions.push({ type: "check" });
  else actions.push({ type: "call", amount: Math.min(toCall, p.chips) });

  if (p.chips > toCall) {
    const minRaiseTo = state.currentBet + state.minRaise;
    const maxRaiseTo = p.bet + p.chips;
    actions.push({ type: "raise", min: Math.min(minRaiseTo, maxRaiseTo), max: maxRaiseTo });
  }
  if (p.chips > 0) actions.push({ type: "allin", amount: p.bet + p.chips });

  return actions;
}

// ─── Применение действия ─────────────────────────────────────────────────────
function applyAction(state, action) {
  if (!["preflop","flop","turn","river"].includes(state.stage)) return state;
  const p = state.players[state.toAct];
  if (notActable(p)) { advanceTurn(state); return state; }

  const toCall = state.currentBet - p.bet;

  switch (action.type) {
    case "fold":
      p.folded = true; p.acted = true;
      break;
    case "check":
      if (toCall !== 0) return state;
      p.acted = true;
      break;
    case "call":
      commit(state, p, Math.min(toCall, p.chips));
      p.acted = true;
      break;
    case "raise": {
      let raiseTo = action.amount;
      const maxTo = p.bet + p.chips;
      if (raiseTo > maxTo) raiseTo = maxTo;
      const minTo = state.currentBet + state.minRaise;
      if (raiseTo < minTo && raiseTo < maxTo) return state;
      commit(state, p, raiseTo - p.bet);
      const raiseSize = raiseTo - state.currentBet;
      if (raiseSize >= state.minRaise) state.minRaise = raiseSize;
      state.currentBet = Math.max(state.currentBet, raiseTo);
      reopenAction(state, p);
      p.acted = true;
      break;
    }
    case "allin": {
      commit(state, p, p.chips);
      if (p.bet > state.currentBet) {
        const raiseSize = p.bet - state.currentBet;
        if (raiseSize >= state.minRaise) state.minRaise = raiseSize;
        state.currentBet = p.bet;
        reopenAction(state, p);
      }
      p.acted = true;
      break;
    }
    default: return state;
  }

  const live = state.players.filter(o => !o.folded && !o.out);
  if (live.length === 1) { endHandUncontested(state, live[0]); return state; }

  if (isBettingRoundOver(state)) nextStage(state);
  else advanceTurn(state);
  return state;
}

function commit(state, p, pay) {
  pay = Math.min(pay, p.chips);
  p.chips -= pay; p.bet += pay; p.committed += pay; state.pot += pay;
  if (p.chips === 0) p.allIn = true;
}

function reopenAction(state, raiser) {
  state.players.forEach(o => {
    if (!o.folded && !o.allIn && !o.out && o !== raiser) o.acted = false;
  });
}

function isBettingRoundOver(state) {
  const active = state.players.filter(p => !p.folded && !p.allIn && !p.out);
  if (active.length === 0) return true;
  return active.every(p => p.acted && p.bet === state.currentBet);
}

function nextStage(state) {
  state.players.forEach(p => { p.bet = 0; p.acted = false; });
  state.currentBet = 0;
  state.minRaise = BIG_BLIND;

  if (state.stage === "preflop") {
    state.community.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
    state.stage = "flop";
  } else if (state.stage === "flop") {
    state.community.push(state.deck.pop());
    state.stage = "turn";
  } else if (state.stage === "turn") {
    state.community.push(state.deck.pop());
    state.stage = "river";
  } else if (state.stage === "river") {
    showdown(state); return;
  }

  // Если ≤1 может действовать — досдаём борд и вскрытие
  const canAct = state.players.filter(p => !p.folded && !p.allIn && !p.out);
  if (canAct.length < 2) {
    while (state.community.length < 5) state.community.push(state.deck.pop());
    showdown(state); return;
  }

  // Постфлоп первым ходит первый живой слева от кнопки
  state.toAct = nextAlive(state, state.button);
  if (notActable(state.players[state.toAct])) advanceTurn(state);
}

// ─── Вскрытие с боковыми банками ────────────────────────────────────────────
function showdown(state) {
  // Оцениваем руки не сбросивших
  state.players.forEach(p => {
    p.handRank = (!p.folded && !p.out)
      ? evaluate7([...p.hole, ...state.community])
      : null;
  });

  const pots = buildSidePots(state);
  const summary = [];

  pots.forEach((pot, idx) => {
    const contenders = pot.eligible
      .map(i => state.players[i])
      .filter(p => p.handRank);
    if (contenders.length === 0) return;

    let best = null, winners = [];
    for (const p of contenders) {
      if (!best || compareRank(p.handRank, best) > 0) { best = p.handRank; winners = [p]; }
      else if (compareRank(p.handRank, best) === 0) winners.push(p);
    }
    const share = Math.floor(pot.amount / winners.length);
    let rem = pot.amount - share * winners.length;
    winners.forEach(w => { w.chips += share; });
    if (rem > 0) winners[0].chips += rem; // нечётный остаток — первому
    const potLabel = pots.length > 1 ? (idx === 0 ? "Основной банк" : `Сайд-банк ${idx}`) : "Банк";
    summary.push(`${potLabel} ${pot.amount}: ${winners.map(w => w.name).join(", ")} (${HAND_NAMES[best[0]]})`);
  });

  state.lastWinner = summary.length ? summary[0].split(":")[1]?.trim() || "—" : "—";
  state.lastResult = summary.join(" · ");
  state.pot = 0;
  state.stage = "handover";
}

/** Боковые банки на основе committed каждого игрока */
function buildSidePots(state) {
  const remaining = state.players.map(p => p.committed);
  const pots = [];
  let guard = 0;
  while (guard++ < 20) {
    const positive = state.players
      .map((p, i) => ({ i, r: remaining[i] }))
      .filter(x => x.r > 0);
    if (positive.length === 0) break;
    const minc = Math.min(...positive.map(x => x.r));
    let amount = 0;
    const contributors = [];
    for (const { i } of positive) {
      remaining[i] -= minc;
      amount += minc;
      contributors.push(i);
    }
    const eligible = contributors.filter(i => !state.players[i].folded && !state.players[i].out);
    pots.push({ amount, eligible });
  }
  // Склеиваем подряд идущие банки с одинаковым набором eligible
  return pots;
}

function endHandUncontested(state, winner) {
  winner.chips += state.pot;
  state.lastWinner = winner.name;
  state.lastResult = `${winner.name} забирает банк ${state.pot} (остальные сбросили)`;
  state.pot = 0;
  state.stage = "handover";
}

// ─── Оценка руки (7 → лучшая 5) ─────────────────────────────────────────────
const HAND_NAMES = [
  "Старшая карта", "Пара", "Две пары", "Тройка", "Стрит",
  "Флеш", "Фулл-хаус", "Каре", "Стрит-флеш", "Роял-флеш",
];

function evaluate7(cards) {
  let best = null;
  for (let a = 0; a < 7; a++)
    for (let b = a + 1; b < 7; b++) {
      const five = [];
      for (let i = 0; i < 7; i++) if (i !== a && i !== b) five.push(cards[i]);
      const r = rank5(five);
      if (!best || compareRank(r, best) > 0) best = r;
    }
  return best;
}

function rank5(cards) {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a,b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const counts = {};
  vals.forEach(v => counts[v] = (counts[v]||0)+1);
  const groups = Object.entries(counts).map(([v,c]) => ({ v:+v, c }))
    .sort((x,y) => y.c - x.c || y.v - x.v);
  const uniq = [...new Set(vals)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5;
  }
  if (isFlush && straightHigh) return straightHigh === 14 ? [9,14] : [8, straightHigh];
  if (groups[0].c === 4) return [7, groups[0].v, groups[1].v];
  if (groups[0].c === 3 && groups[1].c === 2) return [6, groups[0].v, groups[1].v];
  if (isFlush) return [5, ...vals];
  if (straightHigh) return [4, straightHigh];
  if (groups[0].c === 3) return [3, groups[0].v, ...groups.slice(1).map(g=>g.v)];
  if (groups[0].c === 2 && groups[1].c === 2)
    return [2, Math.max(groups[0].v,groups[1].v), Math.min(groups[0].v,groups[1].v), groups[2].v];
  if (groups[0].c === 2) return [1, groups[0].v, ...groups.slice(1).map(g=>g.v)];
  return [0, ...vals];
}

function compareRank(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// ─── Оценка силы руки для ботов (0..1) ──────────────────────────────────────
/** Лучшая комбинация из 5/6/7 карт */
function bestRank(cards) {
  if (cards.length === 5) return rank5(cards);
  if (cards.length === 6) {
    let best = null;
    for (let skip = 0; skip < 6; skip++) {
      const five = cards.filter((_, i) => i !== skip);
      const r = rank5(five);
      if (!best || compareRank(r, best) > 0) best = r;
    }
    return best;
  }
  return evaluate7(cards); // 7
}

export function estimateStrength(hole, community) {
  if (community.length >= 3) {
    const r = bestRank([...hole, ...community]);
    // категория 0..9 → 0..1, плюс лёгкий вклад старшинства
    return Math.min(1, r[0] / 8 + ((r[1] || 0) / 14) * 0.08);
  }
  // Префлоп: эвристика по двум картам
  const v1 = RANK_VAL[hole[0].rank], v2 = RANK_VAL[hole[1].rank];
  const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
  let s = (hi + lo) / 32;                 // база
  if (v1 === v2) s += 0.30;               // пара
  if (hole[0].suit === hole[1].suit) s += 0.06; // одномастные
  if (hi - lo === 1) s += 0.04;           // коннекторы
  if (hi >= 13) s += 0.06;                // туз/король
  return Math.min(1, s);
}

export { HAND_NAMES };
