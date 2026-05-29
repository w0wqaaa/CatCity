/**
 * Tutorial Guide — обучение при первом входе и кнопка «Обучение» в меню.
 * Слайды с иллюстрациями (emoji/ASCII), навигация назад/вперёд, прогресс-точки.
 */

const STORAGE_KEY = "catCity.tutorialSeen";

const SLIDES = [
  {
    icon: "🐱",
    title: "Добро пожаловать в Cat City!",
    text: "Это небольшое приключение в пиксельном мире котов. Здесь есть город, опасные сады, таинственные порталы и мини-игры.",
    hint: "Листай слайды стрелками или кнопками ниже.",
    keys: [],
  },
  {
    icon: "🕹️",
    title: "Движение",
    text: "Управляй персонажем с клавиатуры. Используй бег чтобы двигаться быстрее.",
    hint: null,
    keys: [
      { key: "W A S D", desc: "Движение" },
      { key: "↑ ← ↓ →", desc: "Альтернативные стрелки" },
      { key: "Shift", desc: "Бег (зажать)" },
    ],
  },
  {
    icon: "💬",
    title: "Взаимодействие",
    text: "Подойди к NPC, объекту или порталу — появится подсказка. Нажми E чтобы поговорить, войти, активировать.",
    hint: "Желтая мигающая стрелка над объектом означает что можно взаимодействовать.",
    keys: [
      { key: "E", desc: "Говорить / взаимодействовать" },
      { key: "E", desc: "Войти в портал" },
      { key: "E", desc: "Следующая реплика диалога" },
    ],
  },
  {
    icon: "⚔️",
    title: "Бой",
    text: "В некоторых локациях водятся враги. Атакуй в сторону движения, следи за HP.",
    hint: "Если HP падает до 0 — персонаж возрождается в начале локации.",
    keys: [
      { key: "Space", desc: "Атака перед персонажем" },
      { key: "Shift + ↕", desc: "Быстро уйти от врага" },
    ],
  },
  {
    icon: "📋",
    title: "Меню и интерфейс",
    text: "Квесты, инвентарь и миникарта — в кнопках вверху или горячими клавишами.",
    hint: "Миникарта показывает NPC, врагов и выходы из локации.",
    keys: [
      { key: "Q", desc: "Квесты" },
      { key: "I", desc: "Инвентарь" },
      { key: "M", desc: "Миникарта вкл/выкл" },
      { key: "H", desc: "Путеводитель по локации" },
    ],
  },
  {
    icon: "🌀",
    title: "Порталы",
    text: "В Долине затерянных порталов стоят несколько порталов. Активные — светятся и реагируют на E. Заблокированные пока нельзя пройти.",
    hint: "Из долины всегда можно вернуться в город через зелёный портал.",
    keys: [
      { key: "E", desc: "Войти в активный портал" },
    ],
  },
  {
    icon: "🪞",
    title: "Мини-игра: Зеркальный Пазл",
    text: "Портал «Зеркальный Пазл» в долине открывает слайдер 3×3. Восстанови картинку кликами — плитки двигаются на пустое место.",
    hint: "Чем быстрее соберёшь — тем лучше результат в таблице рекордов.",
    keys: [
      { key: "Клик", desc: "Двинуть плитку рядом с пустым местом" },
    ],
  },
  {
    icon: "🐍",
    title: "Мини-игра: Змейка теней",
    text: "Портал «Змейка теней» запускает классическую змейку. Собирай ★ еду, не врезайся в стены и себя. Shift ускоряет движение.",
    hint: "Рекорд считается по количеству собранной еды. Удачи!",
    keys: [
      { key: "W A S D / ↕↔", desc: "Направление змейки" },
      { key: "Shift", desc: "Ускорение (зажать)" },
    ],
  },
  {
    icon: "✨",
    title: "Готово!",
    text: "Это всё что нужно знать для начала. Остальное — исследуй сам. Удачи в Cat City!",
    hint: "Открыть это обучение снова можно кнопкой «Обучение» в верхнем меню.",
    keys: [],
  },
];

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlay      = null;
let cardEl       = null;
let iconEl       = null;
let titleEl      = null;
let textEl       = null;
let hintEl       = null;
let keysEl       = null;
let dotsEl       = null;
let prevBtn      = null;
let nextBtn      = null;
let closeBtn     = null;
let pageLabel    = null;

let currentSlide = 0;
let isOpen       = false;
let onCloseCb    = null;

const keyNavListener = (e) => {
  if (!isOpen) return;
  if (e.code === "ArrowRight" || e.code === "KeyD") { e.stopPropagation(); nextSlide(); }
  if (e.code === "ArrowLeft"  || e.code === "KeyA") { e.stopPropagation(); prevSlide(); }
  if (e.code === "Escape" || e.code === "Enter")    { e.stopPropagation(); closeTutorial(); }
};

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initTutorialGuide() {
  if (overlay) return;

  overlay = document.createElement("div");
  overlay.id = "tutorialOverlay";
  overlay.className = "hidden";
  overlay.innerHTML = `
    <div id="tutorialCard">
      <div id="tutorialIcon"></div>
      <div id="tutorialTitle"></div>
      <div id="tutorialText"></div>
      <div id="tutorialHint"></div>
      <ul id="tutorialKeys"></ul>
      <div id="tutorialDots"></div>
      <div id="tutorialNav">
        <button id="tutorialPrev" type="button">← Назад</button>
        <span id="tutorialPage"></span>
        <button id="tutorialNext" type="button">Далее →</button>
      </div>
      <button id="tutorialClose" type="button">✕ Закрыть обучение</button>
    </div>
  `;
  document.body.appendChild(overlay);

  iconEl    = overlay.querySelector("#tutorialIcon");
  titleEl   = overlay.querySelector("#tutorialTitle");
  textEl    = overlay.querySelector("#tutorialText");
  hintEl    = overlay.querySelector("#tutorialHint");
  keysEl    = overlay.querySelector("#tutorialKeys");
  dotsEl    = overlay.querySelector("#tutorialDots");
  prevBtn   = overlay.querySelector("#tutorialPrev");
  nextBtn   = overlay.querySelector("#tutorialNext");
  closeBtn  = overlay.querySelector("#tutorialClose");
  pageLabel = overlay.querySelector("#tutorialPage");
  cardEl    = overlay.querySelector("#tutorialCard");

  prevBtn.addEventListener("click", prevSlide);
  nextBtn.addEventListener("click", nextSlide);
  closeBtn.addEventListener("click", closeTutorial);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeTutorial();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function isTutorialOpen() { return isOpen; }

export function openTutorial({ slide = 0, onClose = null } = {}) {
  initTutorialGuide();
  onCloseCb    = onClose;
  currentSlide = Math.max(0, Math.min(slide, SLIDES.length - 1));
  isOpen       = true;
  overlay.classList.remove("hidden");
  renderSlide();
  window.addEventListener("keydown", keyNavListener, true);
}

/** Показать туториал при первом входе (если ещё не видел) */
export function maybeShowTutorial(username) {
  const key = `${STORAGE_KEY}.${(username || "").toLowerCase()}`;
  if (localStorage.getItem(key)) return false;
  openTutorial({ slide: 0 });
  return true;
}

export function markTutorialSeen(username) {
  const key = `${STORAGE_KEY}.${(username || "").toLowerCase()}`;
  localStorage.setItem(key, "1");
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function nextSlide() {
  if (currentSlide < SLIDES.length - 1) {
    currentSlide++;
    renderSlide();
  } else {
    closeTutorial();
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    currentSlide--;
    renderSlide();
  }
}

function closeTutorial() {
  isOpen = false;
  overlay.classList.add("hidden");
  window.removeEventListener("keydown", keyNavListener, true);
  const cb = onCloseCb;
  onCloseCb = null;
  if (cb) cb();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderSlide() {
  const s = SLIDES[currentSlide];
  const total = SLIDES.length;

  iconEl.textContent  = s.icon;
  titleEl.textContent = s.title;
  textEl.textContent  = s.text;

  if (s.hint) {
    hintEl.textContent = `💡 ${s.hint}`;
    hintEl.classList.remove("hidden");
  } else {
    hintEl.classList.add("hidden");
  }

  keysEl.innerHTML = s.keys.map(k => `
    <li class="tut-key-row">
      <span class="tut-key">${escHtml(k.key)}</span>
      <span class="tut-key-desc">${escHtml(k.desc)}</span>
    </li>
  `).join("") || "";

  // Прогресс-точки
  dotsEl.innerHTML = SLIDES.map((_, i) =>
    `<span class="tut-dot${i === currentSlide ? " tut-dot-active" : ""}"></span>`
  ).join("");

  pageLabel.textContent = `${currentSlide + 1} / ${total}`;
  prevBtn.disabled = currentSlide === 0;
  nextBtn.textContent = currentSlide === total - 1 ? "Начать игру ✓" : "Далее →";

  // Анимация появления
  cardEl.classList.remove("tut-slide-in");
  void cardEl.offsetWidth;
  cardEl.classList.add("tut-slide-in");
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
