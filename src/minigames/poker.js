/**
 * Texas Hold'em UI — N игроков (2–6), hot-seat (pass-and-play).
 * Каждый ход делает РЕАЛЬНЫЙ человек (без ботов).
 * Между ходами — экран «передай устройство», карты скрыты.
 *
 * Онлайн-готовность: вся логика в pokerEngine (чистый стейт + applyAction).
 * Чтобы сделать онлайн — заменить локальный ввод (кнопки/cover) на сетевые
 * сообщения в тот же движок; каждый игрок видит только свои карты.
 */
import { createPokerEngine, HAND_NAMES } from "./pokerEngine.js?v=poker-2";

export function createPoker(container, { onResult } = {}) {
  let engine = null;
  let revealed = false;

  container.innerHTML = `<div id="pokerRoot"></div>`;
  const root = container.querySelector("#pokerRoot");

  renderSetup();

  // ── Выбор количества игроков ────────────────────────────────────────────────
  function renderSetup() {
    root.innerHTML = `
      <div class="pk-setup">
        <div class="pk-setup-title">♠️ Техасский Холдем</div>
        <div class="pk-setup-text">Сколько игроков за столом?<br>(играют по очереди за одним устройством)</div>
        <div class="pk-setup-btns">
          ${[2,3,4,5,6].map(n => `<button class="pk-num" data-n="${n}">${n}</button>`).join("")}
        </div>
      </div>`;
    root.querySelectorAll(".pk-num").forEach(b => {
      b.addEventListener("click", () => startGame(+b.dataset.n));
    });
  }

  function startGame(n) {
    const names = Array.from({ length: n }, (_, i) => `Игрок ${i + 1}`);
    engine = createPokerEngine(names);
    engine.startHand();
    revealed = false;
    render();
  }

  // ── Роутинг экранов ──────────────────────────────────────────────────────────
  function render() {
    const s = engine.getState();
    if (s.stage === "gameover") return renderGameOver(s);
    if (s.stage === "handover" || s.stage === "showdown") return renderHandOver(s);
    if (!revealed) return renderCover(s);
    renderTable(s);
  }

  // ── Cover (передача устройства) ──────────────────────────────────────────────
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

  // ── Игровой стол ────────────────────────────────────────────────────────────
  function renderTable(s) {
    const me = s.players[s.toAct];
    const toCall = s.currentBet - me.bet;

    // Соперники (все кроме текущего и выбывших)
    const others = s.players.filter(p => p.i !== me.i && !p.out);

    root.innerHTML = `
      <div class="pk-table">
        <div class="pk-opps">
          ${others.map(o => `
            <div class="pk-opp ${o.folded ? "pk-opp-folded" : ""}">
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
        <div class="pk-cards pk-my-cards">${me.hole.map(cardFace).join("")}</div>

        <div class="pk-actions" id="pkActions"></div>
        <button class="pk-hide" id="pkHide">🙈 Скрыть карты</button>
      </div>`;

    renderActions(s, me, toCall);
    root.querySelector("#pkHide").addEventListener("click", () => { revealed = false; render(); });
  }

  function renderActions(s, me, toCall) {
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

  function act(action) {
    engine.applyAction(action);
    const s = engine.getState();
    if (["preflop","flop","turn","river"].includes(s.stage)) revealed = false;
    render();
  }

  // ── Итог раздачи ──────────────────────────────────────────────────────────
  function renderHandOver(s) {
    revealed = false;
    root.innerHTML = `
      <div class="pk-result">
        <div class="pk-result-title">🏆 ${s.lastWinner}</div>
        <div class="pk-result-text">${s.lastResult || ""}</div>
        <div class="pk-board"><div class="pk-community">${communityHtml(s, true)}</div></div>
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
    root.querySelector("#pkNext").addEventListener("click", () => { engine.startHand(); revealed = false; render(); });
  }

  function renderGameOver(s) {
    const winner = s.players.reduce((a, b) => a.chips >= b.chips ? a : b);
    root.innerHTML = `
      <div class="pk-result">
        <div class="pk-result-title">🎉 Победитель: ${winner.name}</div>
        <div class="pk-result-text">Остальные потеряли все фишки.</div>
        <button class="mg-btn mg-btn-big" id="pkRestart">🔄 Новая игра</button>
      </div>`;
    root.querySelector("#pkRestart").addEventListener("click", renderSetup);
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

  return { destroy: () => {} };
}

// ── Карты ─────────────────────────────────────────────────────────────────────
function isRed(suit) { return suit === "♥" || suit === "♦"; }
function cardFace(card) {
  const red = isRed(card.suit) ? " pk-red" : "";
  return `<span class="pk-card${red}"><span class="pk-card-r">${card.rank}</span><span class="pk-card-s">${card.suit}</span></span>`;
}
function cardEmpty() { return `<span class="pk-card pk-card-empty"></span>`; }
