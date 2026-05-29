/**
 * Touch controls for mobile devices.
 * Dispatches synthetic KeyboardEvents so the existing input pipeline
 * (handleKey/setKeyState + mini-game listeners) works unchanged.
 */

let root = null;
let enabled = false;

// Какие физические клавиши эмулируем
const BTN_KEYS = {
  up:      { code: "KeyW",      key: "w" },
  down:    { code: "KeyS",      key: "s" },
  left:    { code: "KeyA",      key: "a" },
  right:   { code: "KeyD",      key: "d" },
  action:  { code: "KeyE",      key: "e" },
  attack:  { code: "Space",     key: " " },
  run:     { code: "ShiftLeft", key: "Shift" },
};

function isTouchDevice() {
  return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
}

function fireKey(name, isDown) {
  const k = BTN_KEYS[name];
  if (!k) return;
  const type = isDown ? "keydown" : "keyup";
  const ev = new KeyboardEvent(type, { code: k.code, key: k.key, bubbles: true });
  window.dispatchEvent(ev);
}

function bindButton(el, name, { hold = true } = {}) {
  if (!el) return;
  let active = false;

  const press = (e) => {
    e.preventDefault();
    if (active) return;
    active = true;
    el.classList.add("tc-active");
    fireKey(name, true);
    if (!hold) {
      // Разовое нажатие (атака/действие): сразу отпускаем
      fireKey(name, false);
    }
  };
  const release = (e) => {
    if (e) e.preventDefault();
    if (!active) return;
    active = false;
    el.classList.remove("tc-active");
    if (hold) fireKey(name, false);
  };

  el.addEventListener("touchstart", press, { passive: false });
  el.addEventListener("touchend", release, { passive: false });
  el.addEventListener("touchcancel", release, { passive: false });
  // Поддержка мыши для теста на десктопе
  el.addEventListener("mousedown", press);
  el.addEventListener("mouseup", release);
  el.addEventListener("mouseleave", release);
}

export function initTouchControls() {
  if (root || !isTouchDevice()) return;
  enabled = true;

  root = document.createElement("div");
  root.id = "touchControls";
  root.className = "hidden";
  root.innerHTML = `
    <div id="tcDpad">
      <button class="tc-btn tc-up"    data-dir="up"    aria-label="Вверх">▲</button>
      <button class="tc-btn tc-left"  data-dir="left"  aria-label="Влево">◀</button>
      <button class="tc-btn tc-right" data-dir="right" aria-label="Вправо">▶</button>
      <button class="tc-btn tc-down"  data-dir="down"  aria-label="Вниз">▼</button>
      <button class="tc-btn tc-run"   data-dir="run"   aria-label="Бег">🏃</button>
    </div>
    <div id="tcActions">
      <button class="tc-action tc-attack" data-act="attack" aria-label="Атака">⚔️</button>
      <button class="tc-action tc-use"    data-act="action" aria-label="Действие">E</button>
    </div>
  `;
  document.body.appendChild(root);

  bindButton(root.querySelector(".tc-up"),     "up");
  bindButton(root.querySelector(".tc-down"),   "down");
  bindButton(root.querySelector(".tc-left"),   "left");
  bindButton(root.querySelector(".tc-right"),  "right");
  bindButton(root.querySelector(".tc-run"),    "run");
  bindButton(root.querySelector(".tc-attack"), "attack", { hold: false });
  bindButton(root.querySelector(".tc-use"),    "action", { hold: false });
}

export function showTouchControls() {
  if (root) root.classList.remove("hidden");
}

export function hideTouchControls() {
  if (root) root.classList.add("hidden");
}

export function isTouchControlsEnabled() {
  return enabled;
}
