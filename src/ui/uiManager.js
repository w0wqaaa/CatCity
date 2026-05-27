export function renderPlayerStats(element, playerStats) {
  if (!element) {
    return;
  }
  element.textContent = `HP ${playerStats.hp}/${playerStats.maxHp} MP ${playerStats.mp}/${playerStats.maxMp} Gold ${playerStats.gold}`;
}

export function renderQuestList(listElement, questLog) {
  listElement.innerHTML = "";
  questLog.forEach((quest) => {
    const li = document.createElement("li");
    li.textContent = `${quest.name} - ${quest.status}`;
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
