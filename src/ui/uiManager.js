export function renderPlayerStats(element, playerStats) {
  if (!element) {
    return;
  }
  element.textContent = `HP ${playerStats.hp}/${playerStats.maxHp} MP ${playerStats.mp}/${playerStats.maxMp} Gold ${playerStats.gold}`;
}

export function renderQuestList(listElement, questLog, onAbandonQuest = null) {
  listElement.innerHTML = "";
  if (!questLog.length) {
    const li = document.createElement("li");
    li.textContent = "Активных квестов нет";
    listElement.appendChild(li);
    return;
  }

  questLog.forEach((quest) => {
    const li = document.createElement("li");
    li.className = "quest-row";

    const text = document.createElement("span");
    text.textContent = `${quest.name} - ${quest.status}`;
    li.appendChild(text);

    if (onAbandonQuest && quest.canAbandon !== false) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Покинуть";
      button.addEventListener("click", () => onAbandonQuest(quest.id));
      li.appendChild(button);
    }

    listElement.appendChild(li);
  });
}

export function renderInventoryList(listElement, inventory) {
  listElement.innerHTML = "";
  const items = Object.values(inventory);
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Пусто";
    listElement.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.quantity > 1
      ? `${item.name} x${item.quantity}`
      : item.name;
    listElement.appendChild(li);
  });
}
