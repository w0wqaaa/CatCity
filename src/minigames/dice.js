/**
 * Кости (Dice) — против бота. 5 кубиков, 3 броска (как в покере на костях).
 * Выбираешь, какие оставить. У кого комбинация сильнее — выиграл. +6💰.
 */
const FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];

export function createDice(container, { onResult } = {}) {
  let mine, hold, rollsLeft, phase, msg, botDice;

  container.innerHTML = `<div class="dc-root" id="dcRoot"></div>`;
  const root = container.querySelector("#dcRoot");
  start();

  function start() {
    mine = roll5();
    hold = [false,false,false,false,false];
    rollsLeft = 2; phase = "play"; msg = "Бросок 1 из 3. Кликай кубики, чтобы оставить.";
    botDice = null;
    render();
  }

  function roll5() { return Array.from({length:5}, () => 1 + Math.floor(Math.random()*6)); }

  function reroll() {
    if (rollsLeft <= 0) return;
    mine = mine.map((d,i) => hold[i] ? d : 1 + Math.floor(Math.random()*6));
    rollsLeft--;
    msg = rollsLeft > 0 ? `Бросок ${3-rollsLeft} из 3.` : "Последний бросок сделан — жми «Готово».";
    render();
  }

  function finish() {
    // бот: жадно оставляет частые значения, 2 переброса
    let bot = roll5();
    for (let r=0;r<2;r++){
      const counts = {}; bot.forEach(d=>counts[d]=(counts[d]||0)+1);
      const keep = +Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
      bot = bot.map(d => d===keep ? d : 1+Math.floor(Math.random()*6));
    }
    botDice = bot;
    const ms = score(mine), bs = score(bot);
    let result;
    if (ms[0] > bs[0] || (ms[0]===bs[0] && ms[1]>bs[1])) { result="win"; msg = `🏆 Ты выиграл! ${comboName(ms[0])} vs ${comboName(bs[0])}. +6💰`; }
    else if (ms[0] < bs[0] || (ms[0]===bs[0] && ms[1]<bs[1])) { result="lose"; msg = `💀 Бот выиграл. ${comboName(ms[0])} vs ${comboName(bs[0])}.`; }
    else { result="draw"; msg = `🤝 Ничья! ${comboName(ms[0])}.`; }
    phase = "done";
    if (onResult) onResult({ result });
    render();
  }

  // [category, tiebreak]
  function score(dice) {
    const counts = {}; dice.forEach(d=>counts[d]=(counts[d]||0)+1);
    const cv = Object.values(counts).sort((a,b)=>b-a);
    const sum = dice.reduce((a,b)=>a+b,0);
    const uniq = new Set(dice).size;
    if (cv[0]===5) return [6,sum];                 // покер
    if (cv[0]===4) return [5,sum];                 // каре
    if (cv[0]===3 && cv[1]===2) return [4,sum];    // фулл
    if (uniq===5 && (Math.max(...dice)-Math.min(...dice)===4)) return [3,sum]; // стрит
    if (cv[0]===3) return [2,sum];                 // тройка
    if (cv[0]===2 && cv[1]===2) return [1,sum];    // две пары
    return [0,sum];                                // мусор/пара
  }
  function comboName(c){ return ["Слабая рука","Две пары","Тройка","Стрит","Фулл","Каре","Покер!"][c]; }

  function render() {
    root.innerHTML = `
      <div class="dc-status">${msg}</div>
      <div class="dc-label">Твои кубики ${phase==="play"?"(клик — оставить)":""}</div>
      <div class="dc-row">${mine.map((d,i)=>`<button class="dc-die ${hold[i]?"dc-held":""}" data-i="${i}">${FACES[d-1]}</button>`).join("")}</div>
      ${botDice ? `<div class="dc-label" style="margin-top:8px">Кубики бота</div>
        <div class="dc-row">${botDice.map(d=>`<span class="dc-die dc-bot">${FACES[d-1]}</span>`).join("")}</div>` : ""}
      <div class="dc-controls">
        ${phase==="play" && rollsLeft>0 ? `<button class="mg-btn" id="dcRoll">🎲 Перебросить (${rollsLeft})</button>` : ""}
        ${phase==="play" ? `<button class="mg-btn" id="dcDone">✓ Готово</button>` : `<button class="mg-btn mg-btn-big" id="dcAgain">🔄 Ещё раз</button>`}
      </div>`;
    if (phase==="play") {
      root.querySelectorAll(".dc-die[data-i]").forEach(b=>b.addEventListener("click",()=>{ hold[+b.dataset.i]=!hold[+b.dataset.i]; render(); }));
      const rb = root.querySelector("#dcRoll"); if (rb) rb.addEventListener("click", reroll);
      root.querySelector("#dcDone").addEventListener("click", finish);
    } else {
      root.querySelector("#dcAgain").addEventListener("click", start);
    }
  }

  return { destroy: () => {} };
}
