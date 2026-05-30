/**
 * Викторина — общие вопросы, 4 варианта ответа.
 * 10 случайных вопросов за игру. Награда — золото за правильные ответы.
 * Графика — DOM (без PNG).
 */

const QUESTIONS = [
  { q: "Какая планета самая большая в Солнечной системе?", a: ["Юпитер", "Сатурн", "Земля", "Марс"], c: 0 },
  { q: "Сколько континентов на Земле?", a: ["5", "6", "7", "8"], c: 2 },
  { q: "Какой газ преобладает в атмосфере Земли?", a: ["Кислород", "Азот", "Углекислый газ", "Водород"], c: 1 },
  { q: "Столица Японии?", a: ["Сеул", "Пекин", "Токио", "Бангкок"], c: 2 },
  { q: "Кто написал «Войну и мир»?", a: ["Достоевский", "Толстой", "Чехов", "Пушкин"], c: 1 },
  { q: "Сколько струн у классической гитары?", a: ["4", "5", "6", "7"], c: 2 },
  { q: "Какое самое большое млекопитающее?", a: ["Слон", "Синий кит", "Жираф", "Бегемот"], c: 1 },
  { q: "Химический символ золота?", a: ["Gd", "Go", "Au", "Ag"], c: 2 },
  { q: "В каком году человек впервые полетел в космос?", a: ["1957", "1961", "1969", "1965"], c: 1 },
  { q: "Сколько сторон у шестиугольника?", a: ["5", "6", "7", "8"], c: 1 },
  { q: "Какая страна самая большая по площади?", a: ["Канада", "Китай", "США", "Россия"], c: 3 },
  { q: "Сколько цветов в радуге?", a: ["5", "6", "7", "8"], c: 2 },
  { q: "Какой орган качает кровь?", a: ["Печень", "Сердце", "Лёгкие", "Почки"], c: 1 },
  { q: "Самый быстрый наземный зверь?", a: ["Лев", "Гепард", "Лошадь", "Антилопа"], c: 1 },
  { q: "Какая валюта в Великобритании?", a: ["Евро", "Доллар", "Фунт", "Франк"], c: 2 },
  { q: "Сколько минут в сутках?", a: ["1440", "1200", "960", "1600"], c: 0 },
  { q: "Кто нарисовал «Мону Лизу»?", a: ["Микеланджело", "Рафаэль", "Да Винчи", "Ван Гог"], c: 2 },
  { q: "Какая самая длинная река в мире?", a: ["Амазонка", "Нил", "Янцзы", "Миссисипи"], c: 1 },
  { q: "Сколько планет в Солнечной системе?", a: ["7", "8", "9", "10"], c: 1 },
  { q: "Какой металл жидкий при комнатной температуре?", a: ["Свинец", "Ртуть", "Олово", "Цинк"], c: 1 },
];

const ROUND = 10;
const GOLD_PER_CORRECT = 1;

export function createQuiz(container, { onGoldChange, onResult } = {}) {
  let pool, idx, score, answered;

  container.innerHTML = `<div class="qz-root" id="qzRoot"></div>`;
  const root = container.querySelector("#qzRoot");

  start();

  function start() {
    pool = shuffle([...QUESTIONS]).slice(0, ROUND);
    idx = 0; score = 0; answered = false;
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const item = pool[idx];
    root.innerHTML = `
      <div class="qz-head">
        <span class="qz-progress">Вопрос ${idx + 1} / ${ROUND}</span>
        <span class="qz-score">✓ ${score}</span>
      </div>
      <div class="qz-question">${item.q}</div>
      <div class="qz-options" id="qzOptions">
        ${item.a.map((opt, i) => `<button class="qz-opt" data-i="${i}">${opt}</button>`).join("")}
      </div>
      <div class="qz-feedback" id="qzFeedback"></div>`;

    root.querySelectorAll(".qz-opt").forEach(btn =>
      btn.addEventListener("click", () => choose(+btn.dataset.i)));
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    const item = pool[idx];
    const opts = root.querySelectorAll(".qz-opt");
    opts.forEach((b, k) => {
      b.disabled = true;
      if (k === item.c) b.classList.add("qz-correct");
      else if (k === i) b.classList.add("qz-wrong");
    });

    const fb = root.querySelector("#qzFeedback");
    if (i === item.c) {
      score++;
      fb.innerHTML = `<span class="qz-ok">✓ Верно!</span>`;
    } else {
      fb.innerHTML = `<span class="qz-no">✗ Неверно. Правильный ответ выделен.</span>`;
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "mg-btn";
    nextBtn.style.marginTop = "10px";
    nextBtn.textContent = (idx + 1 < ROUND) ? "Дальше →" : "Результат";
    nextBtn.addEventListener("click", next);
    fb.appendChild(document.createElement("br"));
    fb.appendChild(nextBtn);
  }

  function next() {
    if (idx + 1 < ROUND) { idx++; renderQuestion(); }
    else finish();
  }

  function finish() {
    const gold = score * GOLD_PER_CORRECT;
    const perfect = score === ROUND;
    root.innerHTML = `
      <div class="qz-result">
        <div class="qz-result-icon">${perfect ? "🏆" : score >= 6 ? "🎉" : "📚"}</div>
        <div class="qz-result-title">Результат: ${score} / ${ROUND}</div>
        <div class="qz-result-gold">+${gold} 💰 золота</div>
        <button class="mg-btn mg-btn-big" id="qzAgain">🔄 Ещё раз</button>
      </div>`;
    root.querySelector("#qzAgain").addEventListener("click", start);

    if (gold > 0 && onGoldChange) onGoldChange(gold);
    if (onResult) onResult({ result: score >= 6 ? "win" : "lose" });
  }

  return { destroy: () => {} };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
