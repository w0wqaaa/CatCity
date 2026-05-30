/**
 * Texas Hold'em UI — 3 режима:
 *   1) Против 4 ботов (ты + 4 ИИ)
 *   2) На одном устройстве (pass-and-play, 2–6 живых игроков)
 *   3) Онлайн (заглушка — будет позже)
 *
 * Онлайн-готовность: вся логика в pokerEngine (чистый стейт + applyAction).
 * Боты — отдельный модуль решений, который НЕ внутри движка; в онлайне
 * их место займут сетевые игроки, движок не меняется.
 */
import { createPokerEngine, estimateStrength, HAND_NAMES } from "./pokerEngine.js?v=poker-3";

const BOT_DELAY = 800; // мс «раздумье» бота

export function createPoker(container, { onResult } = {}) {
  let engine = null;
  let mode = null;       // "bot" | "local"
  let revealed = false;  // (local) показаны ли карты текущего игрока
  let botTimer = null;

  container.innerHTML = `<div id="pokerRoot"></div>`;
  const root = container.querySelector("#pokerRoot");

  renderModeMenu();

  // ── Меню режимов ─────────────────────────────────────────────────────────────
  function renderModeMenu() {
    clearBotTimer();
    root.innerHTML = `
      <div class="pk-setup">
        <div class="pk-setup-title">♠️ Техасский Холдем</div>
        <div class="pk-setup-text">Выбери режим игры:</div>
        <div class="pk-mode-list">
          <button class="mg-btn mg-btn-big" id="pkModeBot">🤖 Против ботов <small>(ты + 4 бота)</small></button>
          <button class="mg-btn mg-btn-big" id="pkModeLocal">👥 На одном устройстве <small>(2–6 игроков)</small></button>
          <button class="mg-btn mg-btn-big pk-mode-soon" id="pkModeOnline">🌐 Онлайн <small>(скоро)</small></button>
        </div>
        <div id="pkModeMsg" class="pk-mode-msg"></div>
      </div>`;
    root.querySelector("#pkModeBot").addEventListener("click", () => startBotGame());
    root.querySelector("#pkModeLocal").addEventListener("click", () => renderLocalSetup());
    root.querySelector("#pkModeOnline").addEventListener("click", () => {
      root.querySelector("#pkModeMsg").textContent = "Онлайн-режим будет добавлен позже.";
    });
  }

  // ── Выбор числа живых игроков (локально) ─────────────────────────────────────
  function renderLocalSetup() {
    root.innerHTML = `
      <div class="pk-setup">
        <div class="pk-setup-title">👥 На одном устройстве</div>
        <div class="pk-setup-text">Сколько игроков за столом?<br>(ходят по очереди, карты скрыты при передаче)</div>
        <div class="pk-setup-btns">
          ${[2,3,4,5,6].map(n => `<button class="pk-num" data-n="${n}">${n}</button>`).join("")}
        </div>
        <button class="pk-hide" id="pkBack" style="margin-top:14px">← Назад</button>
      </div>`;
    root.querySelectorAll(".pk-num").forEach(b =>
      b.addEventListener("click", () => startLocalGame(+b.dataset.n)));
    root.querySelector("#pkBack").addEventListener("click", renderModeMenu);
  }

  // ── Старт игр ─────────────────────────────────────────────────────────────────
  function startBotGame() {
    mode = "bot";
    const names = ["Ты", "Бот 1", "Бот 2", "Бот 3", "Бот 4"];
    engine = createPokerEngine(names);
    engine.getState().botSeats = [1, 2, 3, 4]; // пометка ботов
    engine.startHand();
    revealed = true; // в режиме ботов твои карты всегда видны
    render();
  }

  function startLocalGame(n) {
    mode = "local";
    const names = Array.from({ length: n }, (_, i) => `Игрок ${i + 1}`);
    engine = createPokerEngine(names);
    engine.startHand();
    revealed = false;
    render();
  }

  function isBot(seat) {
    return mode === "bot" && seat !== 0; // в bot-режиме человек — seat 0
  }

  // ── Роутинг экранов ──────────────────────────────────────────────────────────
  function render() {
    clearBotTimer();
    const s = engine.getState();
    if (s.stage === "gameover") return renderGameOver(s);
    if (s.stage === "handover") return renderHandOver(s);

    if (mode === "bot") {
      // Перспектива всегда у человека (seat 0)
      renderTable(s, 0);
      // Если сейчас ходит бот — авто-ход
      if (isBot(s.toAct)) scheduleBot();
      return;
    }

    // local: pass-and-play
    if (!revealed) return renderCover(s);
    renderTable(s, s.toAct);
  }

  // ── Cover (только локальный режим) ────────────────────────────────────────────
  function renderCover(s) {
    const p = s.players[s.toAct];
    root.innerHTML = `
      <div class="pk-cover">
        <div class="pk-cover-icon">🤝</div>
        <div class="pk-cover-title">Ход: ${p.name}</div>
        <div class="pk-cover-text">Передай устройство игроку <b>${p.name}</b>.<br>Остальные — не подглядывать!</div>
        <button class="mg-btn mg-btn-big" id="pkReveal">Я ${p.name} — показать карты</button>
      </div>`;
    root.querySelector("#pkReveal").addEventListener("click", () => { revealed = true; render(); });
  }

  // ── Стол (perspective = чьи карты видны) ──────────────────────────────────────
  function renderTable(s, viewer) {
    const me  = s.players[viewer];
    const others = s.players.filter(p => p.i !== viewer && !p.out);
    const myTurn = s.toAct === viewer && !isBot(s.toAct);
    const turnName = s.players[s.toAct]?.name;

    root.innerHTML = `
      <div class="pk-table">
        <div class="pk-opps">
          ${others.map(o => `
            <div class="pk-opp ${o.folded ? "pk-opp-folded" : ""} ${s.toAct === o.i ? "pk-opp-turn" : ""}">
              <span class="pk-name">${o.name}${s.button === o.i ? " 🅑" : ""}</span>
              <span class="pk-chips">💰 ${o.chips}</span>
              ${o.bet > 0 ? `<span class="pk-bet">${o.bet}</span>` : ""}
              ${o.allIn ? '<span class="pk-tag">ALL-IN</span>' : ""}
              ${o.folded ? '<span class="pk-tag pk-fold">FOLD</span>' : ""}
            </div>`).join("")}
        </div>

        <div class="pk-board">
          <div class="pk-pot">Банк: ${s.pot} 💰 · <span class="pk-stage">${stageName(s.stage)}</span></div>
          <div class="pk-community">${communityHtml(s)}</div>
        </div>

        <div class="pk-me">
          <span class="pk-name">${me.name}${s.button === me.i ? " 🅑" : ""}</span>
          <span class="pk-chips">💰 ${me.chips}</span>
          ${me.bet > 0 ? `<span class="pk-bet">ставка ${me.bet}</span>` : ""}
        </div>
        <div class="pk-cards pk-my-cards">${me.folded ? "—" : me.hole.map(cardFace).join("")}</div>

        <div class="pk-actions" id="pkActions"></div>
        ${mode === "local" ? '<button class="pk-hide" id="pkHide">🙈 Скрыть карты</button>' : ""}
      </div>`;

    if (myTurn) {
      renderActions(s, me);
    } else {
      root.querySelector("#pkActions").innerHTML =
        `<div class="pk-thinking">⏳ Ходит ${turnName}…</div>`;
    }

    if (mode === "local") {
      root.querySelector("#pkHide").addEventListener("click", () => { revealed = false; render(); });
    }
  }

  function renderActions(s, me) {
    const wrap = root.querySelector("#pkActions");
    const legal = engine.legalActions();
    wrap.innerHTML = "";
    for (const a of legal) {
      if (a.type === "fold")  addBtn(wrap, "Фолд", "pk-btn-fold", () => act({ type: "fold" }));
      else if (a.type === "check") addBtn(wrap, "Чек", "pk-btn-check", () => act({ type: "check" }));
      else if (a.type === "call")  addBtn(wrap, `Колл ${a.amount}`, "pk-btn-call", () => act({ type: "call" }));
      else if (a.type === "raise") {
        const box = document.createElement("div");
        box.className = "pk-raise-box";
        const val = document.createElement("span"); val.className = "pk-raise-val"; let cur = a.min; val.textContent = cur;
        const slider = document.createElement("input");
        slider.type = "range"; slider.min = a.min; slider.max = a.max; slider.value = a.min; slider.className = "pk-raise-slider";
        slider.addEventListener("input", () => { cur = +slider.value; val.textContent = cur; });
        const btn = document.createElement("button");
        btn.className = "pk-btn pk-btn-raise"; btn.textContent = "Рейз до";
        btn.addEventListener("click", () => act({ type: "raise", amount: cur }));
        box.append(btn, slider, val);
        wrap.appendChild(box);
      }
      else if (a.type === "allin") addBtn(wrap, `Олл-ин ${a.amount}`, "pk-btn-allin", () => act({ type: "allin", amount: a.amount }));
    }
  }

  // ── Применение хода (человек) ──────────────────────────────────────────────
  function act(action) {
    engine.applyAction(action);
    const s = engine.getState();
    if (mode === "local" && ["preflop","flop","turn","river"].includes(s.stage)) {
      revealed = false; // следующему — cover
    }
    render();
  }

  // ── Ход бота ─────────────────────────────────────────────────────────────────
  function scheduleBot() {
    clearBotTimer();
    botTimer = setTimeout(() => {
      const s = engine.getState();
      if (!isBot(s.toAct)) { render(); return; }
      const action = decideBotAction(engine);
      engine.applyAction(action);
      render();
    }, BOT_DELAY);
  }

  function clearBotTimer() { if (botTimer) { clearTimeout(botTimer); botTimer = null; } }

  // ── Итоги ──────────────────────────────────────────────────────────────────
  function renderHandOver(s) {
    revealed = false;
    root.innerHTML = `
      <div class="pk-result">
        <div class="pk-result-title">🏆 ${s.lastWinner}</div>
        <div class="pk-result-text">${s.lastResult || ""}</div>
        <div class="pk-board"><div class="pk-community">${communityHtml(s)}</div></div>
        <div class="pk-showdown">
          ${s.players.filter(p => !p.out).map(p => `
            <div class="pk-sd-row">
              <span class="pk-name">${p.name}</span>
              <span class="pk-cards-inline">${p.folded ? "—" : p.hole.map(cardFace).join("")}</span>
              <span class="pk-chips">💰 ${p.chips}</span>
            </div>`).join("")}
        </div>
        <button class="mg-btn mg-btn-big" id="pkNext">Следующая раздача →</button>
      </div>`;
    root.querySelector("#pkNext").addEventListener("click", () => {
      engine.startHand();
      revealed = (mode === "bot");
      render();
    });
  }

  function renderGameOver(s) {
    const winner = s.players.reduce((a, b) => a.chips >= b.chips ? a : b);
    root.innerHTML = `
      <div class="pk-result">
        <div class="pk-result-title">🎉 Победитель: ${winner.name}</div>
        <div class="pk-result-text">Остальные потеряли все фишки.</div>
        <button class="mg-btn mg-btn-big" id="pkRestart">🔄 В меню</button>
      </div>`;
    root.querySelector("#pkRestart").addEventListener("click", renderModeMenu);
    if (onResult) onResult({ result: "restart" });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function communityHtml(s) {
    const slots = [];
    for (let i = 0; i < 5; i++) slots.push(s.community[i] ? cardFace(s.community[i]) : cardEmpty());
    return slots.join("");
  }
  function stageName(stage) {
    return { preflop:"Префлоп", flop:"Флоп", turn:"Тёрн", river:"Ривер" }[stage] || stage;
  }
  function addBtn(wrap, label, cls, fn) {
    const b = document.createElement("button");
    b.className = "pk-btn " + cls; b.textContent = label;
    b.addEventListener("click", fn); wrap.appendChild(b);
  }

  return { destroy: () => { clearBotTimer(); } };
}

// ── ИИ бота (вне движка — в онлайне заменят сетевые игроки) ────────────────────
function decideBotAction(engine) {
  const s = engine.getState();
  const legal = engine.legalActions();
  const me = s.players[s.toAct];
  if (!legal.length) return { type: "check" };

  const strength = estimateStrength(me.hole, s.community) + (Math.random() * 0.16 - 0.06);
  const has = (t) => legal.find(a => a.type === t);
  const callA = has("call");
  const raiseA = has("raise");
  const checkA = has("check");
  const allinA = has("allin");

  // Можно чекнуть бесплатно
  if (checkA) {
    if (strength > 0.72 && raiseA && Math.random() < 0.6) {
      return { type: "raise", amount: betSize(raiseA, strength) };
    }
    return { type: "check" };
  }

  // Перед ботом ставка — нужно платить
  const toCall = callA ? callA.amount : 0;
  const potOdds = toCall / Math.max(1, s.pot + toCall);

  if (strength < 0.32) {
    // слабо: иногда колл если очень дёшево
    if (toCall <= 2 && Math.random() < 0.3 && callA) return { type: "call" };
    return { type: "fold" };
  }
  if (strength < 0.62) {
    return callA ? { type: "call" } : { type: "check" };
  }
  // сильно
  if (strength > 0.85 && allinA && Math.random() < 0.25) {
    return { type: "allin", amount: allinA.amount };
  }
  if (raiseA && Math.random() < 0.7) {
    return { type: "raise", amount: betSize(raiseA, strength) };
  }
  return callA ? { type: "call" } : { type: "check" };
}

function betSize(raiseA, strength) {
  // от min до ~середины диапазона в зависимости от силы
  const span = raiseA.max - raiseA.min;
  const frac = Math.min(1, (strength - 0.6) * 1.5);
  return Math.round(raiseA.min + span * frac * (0.3 + Math.random() * 0.4));
}

// ── Карты ─────────────────────────────────────────────────────────────────────
function isRed(suit) { return suit === "♥" || suit === "♦"; }
function cardFace(card) {
  const red = isRed(card.suit) ? " pk-red" : "";
  return `<span class="pk-card${red}"><span class="pk-card-r">${card.rank}</span><span class="pk-card-s">${card.suit}</span></span>`;
}
function cardEmpty() { return `<span class="pk-card pk-card-empty"></span>`; }
