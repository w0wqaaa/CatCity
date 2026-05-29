let timerPanel;
let timerValue;
let resultsList;
let toggleButton;

export function initRunTimer() {
  if (timerPanel) {
    return timerPanel;
  }

  timerPanel = document.createElement("div");
  timerPanel.id = "runTimer";
  timerPanel.className = "hidden";
  timerPanel.innerHTML = `
    <div class="run-timer-title">Эхо-лабиринт</div>
    <div id="runTimerValue">00:00.0</div>
    <button id="toggleRunResults" type="button">Результаты</button>
    <ol id="runResultsList" class="hidden"></ol>
  `;
  document.body.appendChild(timerPanel);

  timerValue = timerPanel.querySelector("#runTimerValue");
  resultsList = timerPanel.querySelector("#runResultsList");
  toggleButton = timerPanel.querySelector("#toggleRunResults");
  toggleButton.addEventListener("click", () => {
    resultsList.classList.toggle("hidden");
  });
  return timerPanel;
}

export function updateRunTimer({ visible, elapsedMs = 0, results = [] } = {}) {
  initRunTimer();
  if (!visible) {
    timerPanel.classList.add("hidden");
    return;
  }

  timerPanel.classList.remove("hidden");
  timerValue.textContent = formatTime(elapsedMs);
  renderResults(results);
}

export function showRunResults(results = []) {
  initRunTimer();
  renderResults(results);
  timerPanel.classList.remove("hidden");
  resultsList.classList.remove("hidden");
}

export function formatTime(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function renderResults(results) {
  resultsList.innerHTML = "";
  if (!results.length) {
    const item = document.createElement("li");
    item.textContent = "Пока нет результатов";
    resultsList.appendChild(item);
    return;
  }

  results.slice(0, 10).forEach((result, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${result.player || "Игрок"} - ${formatTime(result.timeMs)} (${result.mode || "solo"})`;
    resultsList.appendChild(item);
  });
}
