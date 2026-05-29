/**
 * Texas Hold'em engine — heads-up (2 игрока).
 * Чистый стейт-машина: НИКАКОГО DOM и НИКАКИХ ботов.
 * Ходы подаются через applyAction(action). Это делает движок
 * пригодным для онлайна: локально action создаёт UI, в сети — сеть.
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
  const state = {
    players: playerNames.map((name, i) => ({
      i, name,
      chips: START_CHIPS,
      hole: [],
      bet: 0,           // ставка в текущем раунде торговли
      committed: 0,     // всего вложено в банк за раздачу
      folded: false,
      allIn: false,
      acted: false,
    })),
    deck: [],
    community: [],
    pot: 0,
    stage: "idle",      // idle|preflop|flop|turn|river|showdown|handover
    currentBet: 0,
    minRaise: BIG_BLIND,
    button: 0,          // дилерская кнопка
    toAct: 0,           // чей ход
    lastWinner: null,
    lastResult: null,   // строка-описание исхода
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
  // Проверяем что у обоих есть фишки
  const alive = state.players.filter(p => p.chips > 0);
  if (alive.length < 2) {
    state.stage = "gameover";
    return state;
  }

  state.handNumber++;
  state.deck = buildDeck();
  state.community = [];
  state.pot = 0;
  state.currentBet = 0;
  state.minRaise = BIG_BLIND;
  state.lastWinner = null;
  state.lastResult = null;
  state.button = state.handNumber === 1 ? 0 : (state.button + 1) % 2;

  state.players.forEach(p => {
    p.hole = [state.deck.pop(), state.deck.pop()];
    p.bet = 0; p.committed = 0; p.folded = false; p.allIn = false; p.acted = false;
  });

  // Heads-up: на баттоне малый блайнд и ходит первым на префлопе
  const sbIdx = state.button;
  const bbIdx = (state.button + 1) % 2;
  postBlind(state, sbIdx, SMALL_BLIND);
  postBlind(state, bbIdx, BIG_BLIND);
  state.currentBet = BIG_BLIND;
  state.minRaise = BIG_BLIND;

  state.stage = "preflop";
  state.toAct = sbIdx; // дилер/SB ходит первым на префлопе
  // блайнды не считаются "acted" — могут ещё повышать
  state.players.forEach(p => p.acted = false);
  return state;
}

function postBlind(state, idx, amount) {
  const p = state.players[idx];
  const pay = Math.min(amount, p.chips);
  p.chips -= pay;
  p.bet += pay;
  p.committed += pay;
  state.pot += pay;
  if (p.chips === 0) p.allIn = true;
}

// ─── Доступные действия для текущего игрока ──────────────────────────────────
function legalActions(state) {
  if (!["preflop","flop","turn","river"].includes(state.stage)) return [];
  const p = state.players[state.toAct];
  if (p.folded || p.allIn) return [];

  const toCall = state.currentBet - p.bet;
  const actions = [];

  actions.push({ type: "fold" });

  if (toCall === 0) {
    actions.push({ type: "check" });
  } else {
    actions.push({ type: "call", amount: Math.min(toCall, p.chips) });
  }

  // Raise возможен если есть фишки сверх колла
  if (p.chips > toCall) {
    const minRaiseTo = state.currentBet + state.minRaise;
    const maxRaiseTo = p.bet + p.chips; // all-in
    actions.push({
      type: "raise",
      min: Math.min(minRaiseTo, maxRaiseTo),
      max: maxRaiseTo,
    });
  }
  // All-in всегда доступен если есть фишки
  if (p.chips > 0) {
    actions.push({ type: "allin", amount: p.bet + p.chips });
  }

  return actions;
}

// ─── Применение действия ─────────────────────────────────────────────────────
function applyAction(state, action) {
  if (!["preflop","flop","turn","river"].includes(state.stage)) return state;
  const p = state.players[state.toAct];
  if (p.folded || p.allIn) { advanceTurn(state); return state; }

  const toCall = state.currentBet - p.bet;

  switch (action.type) {
    case "fold":
      p.folded = true;
      p.acted = true;
      break;

    case "check":
      if (toCall !== 0) return state; // нелегально
      p.acted = true;
      break;

    case "call": {
      const pay = Math.min(toCall, p.chips);
      commit(state, p, pay);
      p.acted = true;
      break;
    }

    case "raise": {
      // amount = "raise TO" (итоговая ставка игрока в раунде)
      let raiseTo = action.amount;
      const maxTo = p.bet + p.chips;
      if (raiseTo > maxTo) raiseTo = maxTo;
      const minTo = state.currentBet + state.minRaise;
      if (raiseTo < minTo && raiseTo < maxTo) return state; // мало
      const pay = raiseTo - p.bet;
      commit(state, p, pay);
      const raiseSize = raiseTo - state.currentBet;
      if (raiseSize >= state.minRaise) state.minRaise = raiseSize;
      state.currentBet = Math.max(state.currentBet, raiseTo);
      // Повышение открывает новый круг — остальные снова должны ответить
      state.players.forEach(o => { if (!o.folded && !o.allIn && o !== p) o.acted = false; });
      p.acted = true;
      break;
    }

    case "allin": {
      const pay = p.chips;
      commit(state, p, pay);
      if (p.bet > state.currentBet) {
        const raiseSize = p.bet - state.currentBet;
        if (raiseSize >= state.minRaise) state.minRaise = raiseSize;
        state.currentBet = p.bet;
        state.players.forEach(o => { if (!o.folded && !o.allIn && o !== p) o.acted = false; });
      }
      p.acted = true;
      break;
    }

    default: return state;
  }

  // Проверка: остался ли один не-сбросивший
  const live = state.players.filter(o => !o.folded);
  if (live.length === 1) {
    endHand(state, live[0]);
    return state;
  }

  if (isBettingRoundOver(state)) {
    nextStage(state);
  } else {
    advanceTurn(state);
  }
  return state;
}

function commit(state, p, pay) {
  pay = Math.min(pay, p.chips);
  p.chips -= pay;
  p.bet += pay;
  p.committed += pay;
  state.pot += pay;
  if (p.chips === 0) p.allIn = true;
}

function advanceTurn(state) {
  let next = (state.toAct + 1) % 2;
  let guard = 0;
  while ((state.players[next].folded || state.players[next].allIn) && guard < 4) {
    next = (next + 1) % 2;
    guard++;
  }
  state.toAct = next;
}

function isBettingRoundOver(state) {
  const active = state.players.filter(p => !p.folded && !p.allIn);
  // Если активных <=1 — торговля окончена (остальные all-in/fold)
  if (active.length === 0) return true;
  // Все активные сделали ход и уравняли ставку
  return active.every(p => p.acted && p.bet === state.currentBet);
}

function nextStage(state) {
  // Сброс ставок раунда
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
    showdown(state);
    return;
  }

  // Если оба all-in — досдаём борд до ривера и шоудаун
  const canAct = state.players.filter(p => !p.folded && !p.allIn);
  if (canAct.length < 2) {
    // авто-досдача
    while (state.community.length < 5) state.community.push(state.deck.pop());
    showdown(state);
    return;
  }

  // Постфлоп первым ходит НЕ баттон (big blind)
  state.toAct = (state.button + 1) % 2;
  if (state.players[state.toAct].folded || state.players[state.toAct].allIn) advanceTurn(state);
}

// ─── Вскрытие ────────────────────────────────────────────────────────────────
function showdown(state) {
  const live = state.players.filter(p => !p.folded);
  let best = null, winners = [];
  for (const p of live) {
    p.handRank = evaluate7([...p.hole, ...state.community]);
    if (!best || compareRank(p.handRank, best) > 0) {
      best = p.handRank; winners = [p];
    } else if (compareRank(p.handRank, best) === 0) {
      winners.push(p);
    }
  }
  if (winners.length === 1) {
    endHand(state, winners[0], best);
  } else {
    // дележ банка
    const share = Math.floor(state.pot / winners.length);
    winners.forEach(w => w.chips += share);
    state.lastWinner = winners.map(w => w.name).join(" и ");
    state.lastResult = `Ничья! Банк ${state.pot} разделён. ${HAND_NAMES[best[0]]}`;
    state.pot = 0;
    state.stage = "handover";
  }
}

function endHand(state, winner, rank = null) {
  winner.chips += state.pot;
  state.lastWinner = winner.name;
  if (rank) {
    state.lastResult = `${winner.name} выигрывает ${state.pot} (${HAND_NAMES[rank[0]]})`;
  } else {
    state.lastResult = `${winner.name} забирает банк ${state.pot} (соперник сбросил)`;
  }
  state.pot = 0;
  state.stage = "handover";
}

// ─── Оценка покерной руки (7 карт → лучшая 5-карточная) ─────────────────────
const HAND_NAMES = [
  "Старшая карта", "Пара", "Две пары", "Тройка", "Стрит",
  "Флеш", "Фулл-хаус", "Каре", "Стрит-флеш", "Роял-флеш",
];

function evaluate7(cards) {
  // перебор C(7,5)=21
  let best = null;
  const idx = [0,1,2,3,4,5,6];
  for (let a = 0; a < 7; a++)
    for (let b = a+1; b < 7; b++) {
      const five = idx.filter(i => i !== a && i !== b).map(i => cards[i]);
      const r = rank5(five);
      if (!best || compareRank(r, best) > 0) best = r;
    }
  return best;
}

function rank5(cards) {
  const vals = cards.map(c => RANK_VAL[c.rank]).sort((a,b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);

  // Подсчёт по достоинствам
  const counts = {};
  vals.forEach(v => counts[v] = (counts[v]||0)+1);
  const groups = Object.entries(counts)
    .map(([v,c]) => ({ v: +v, c }))
    .sort((x,y) => y.c - x.c || y.v - x.v);

  // Стрит (учёт A-2-3-4-5)
  const uniq = [...new Set(vals)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5; // wheel
  }

  if (isFlush && straightHigh) {
    return straightHigh === 14 ? [9, 14] : [8, straightHigh]; // роял / стрит-флеш
  }
  if (groups[0].c === 4) return [7, groups[0].v, groups[1].v];          // каре
  if (groups[0].c === 3 && groups[1].c === 2) return [6, groups[0].v, groups[1].v]; // фулл
  if (isFlush) return [5, ...vals];                                      // флеш
  if (straightHigh) return [4, straightHigh];                            // стрит
  if (groups[0].c === 3) return [3, groups[0].v, ...groups.slice(1).map(g=>g.v)]; // тройка
  if (groups[0].c === 2 && groups[1].c === 2)                            // две пары
    return [2, Math.max(groups[0].v,groups[1].v), Math.min(groups[0].v,groups[1].v), groups[2].v];
  if (groups[0].c === 2) return [1, groups[0].v, ...groups.slice(1).map(g=>g.v)]; // пара
  return [0, ...vals];                                                   // старшая
}

function compareRank(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export { HAND_NAMES };
