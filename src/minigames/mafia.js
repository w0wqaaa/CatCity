/**
 * Измерение подозрений (Мафия-дедукция).
 * 5 подозреваемых, один — мафия. Каждый делает заявление о другом.
 * Невиновные говорят правду, мафия лжёт. Вычисли мафию по заявлениям. +10💰.
 */
const NAMES = ["Рыжик", "Барсик", "Мурзик", "Снежок", "Тишка"];

export function createMafia(container, { onResult } = {}) {
  let mafia, statements, solved;

  container.innerHTML = `<div class="mf-root" id="mfRoot"></div>`;
  const root = container.querySelector("#mfRoot");
  start();

  function start() {
    solved = false;
    mafia = Math.floor(Math.random() * 5);
    statements = buildStatements();
    render();
  }

  // Генерируем показания так, чтобы решение было ЕДИНСТВЕННЫМ
  function buildStatements() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const st = [];
      for (let i = 0; i < 5; i++) {
        let target;
        do { target = Math.floor(Math.random() * 5); } while (target === i);
        const truth = (target === mafia) ? "mafia" : "innocent";
        // невиновный говорит правду, мафия — ложь (обратное)
        const claim = (i === mafia) ? (truth === "mafia" ? "innocent" : "mafia") : truth;
        st.push({ from: i, target, claim });
      }
      if (countConsistent(st) === 1) return st;
    }
    return buildStatements.lastFallback || (buildStatements.lastFallback = []);
  }

  // Сколько кандидатов в мафию согласуются со всеми показаниями
  function countConsistent(st) {
    let count = 0;
    for (let c = 0; c < 5; c++) {
      const ok = st.every(s => {
        const actual = (s.target === c) ? "mafia" : "innocent";
        return (s.from === c) ? (s.claim !== actual) : (s.claim === actual);
      });
      if (ok) count++;
    }
    return count;
  }

  function accuse(i) {
    if (solved) return;
    solved = true;
    const correct = i === mafia;
    root.innerHTML = `
      <div class="mf-result">
        <div class="mf-result-icon">${correct ? "🏆" : "💀"}</div>
        <div class="mf-result-title">${correct ? "Верно! Мафия поймана!" : "Ошибка!"}</div>
        <div class="mf-result-text">Мафией был <b>${NAMES[mafia]}</b>.<br>${correct ? "+10 💰" : "В следующий раз будь внимательнее."}</div>
        <button class="mg-btn mg-btn-big" id="mfAgain">🔄 Ещё раз</button>
      </div>`;
    root.querySelector("#mfAgain").addEventListener("click", start);
    if (onResult) onResult({ result: correct ? "win" : "lose" });
  }

  function render() {
    root.innerHTML = `
      <div class="mf-intro">🕵️ Один из котов — мафия. Невиновные говорят правду, мафия лжёт.<br>Изучи показания и вычисли мафию!</div>
      <div class="mf-statements">
        ${statements.map(s => `
          <div class="mf-stmt">
            <b>${NAMES[s.from]}</b>: «${NAMES[s.target]} — ${s.claim === "mafia" ? "мафия! 🔪" : "невиновен 🕊️"}»
          </div>`).join("")}
      </div>
      <div class="mf-vote-label">Кого обвиняешь?</div>
      <div class="mf-suspects">
        ${NAMES.map((n,i) => `<button class="mg-btn mf-suspect" data-i="${i}">${n}</button>`).join("")}
      </div>`;
    root.querySelectorAll(".mf-suspect").forEach(b => b.addEventListener("click", () => accuse(+b.dataset.i)));
  }

  return { destroy: () => {} };
}
