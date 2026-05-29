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

const ITEM_ICONS = {
  small_hp_potion: "🧪", small_mp_potion: "💧",
  herb: "🌿", meadow_herbs: "🌺",
  echo_shard: "💎", wild_honeycomb: "🍯",
  spice_crate_seal: "📦",
};
function getItemIcon(item) {
  return ITEM_ICONS[item.id] || (item.type === "consumable" ? "⚗️" : "📦");
}

export function renderInventoryGrid(gridEl, goldEl, inventory, playerStats, { onUseItem } = {}) {
  if (!gridEl) return;
  // Update gold
  if (goldEl) goldEl.textContent = `💰 ${playerStats?.gold ?? 0}`;

  gridEl.innerHTML = "";
  const items = Object.values(inventory);
  const SLOTS = 20;

  for (let i = 0; i < SLOTS; i++) {
    const item = items[i];
    const slot = document.createElement("div");
    slot.className = "inv-slot" + (item ? " inv-slot-filled" : "");

    if (item) {
      const icon = document.createElement("span");
      icon.className = "inv-slot-icon";
      icon.textContent = getItemIcon(item);

      const qty = document.createElement("span");
      qty.className = "inv-slot-qty";
      qty.textContent = item.quantity > 1 ? `×${item.quantity}` : "";

      const tooltip = document.createElement("div");
      tooltip.className = "inv-slot-tooltip";
      tooltip.innerHTML = `<b>${item.name}</b>${item.description ? `<br><span>${item.description}</span>` : ""}${item.type === "consumable" ? "<br><em>Нажми — использовать</em>" : ""}`;

      slot.appendChild(icon);
      slot.appendChild(qty);
      slot.appendChild(tooltip);

      if (item.type === "consumable" && onUseItem) {
        slot.classList.add("inv-slot-usable");
        slot.addEventListener("click", () => onUseItem(item.id));
      }
    }

    gridEl.appendChild(slot);
  }
}

const EQUIP_SLOTS = [
  { id: "head",    label: "Голова",   icon: "🪖" },
  { id: "body",    label: "Тело",     icon: "🛡️" },
  { id: "weapon",  label: "Оружие",   icon: "⚔️" },
  { id: "offhand", label: "Реликвия", icon: "🔮" },
  { id: "belt",    label: "Пояс",     icon: "🔗" },
  { id: "legs",    label: "Ноги",     icon: "👢" },
  { id: "amulet",  label: "Оберег",   icon: "💍" },
];

export function renderEquipmentPanel(slotsEl, equipment = {}) {
  if (!slotsEl) return;
  slotsEl.innerHTML = "";
  EQUIP_SLOTS.forEach(({ id, label, icon }) => {
    const slot = document.createElement("div");
    slot.className = "equip-slot";
    const equipped = equipment[id];
    slot.innerHTML = `
      <span class="equip-slot-icon">${icon}</span>
      <div class="equip-slot-info">
        <span class="equip-slot-label">${label}</span>
        <span class="equip-slot-item">${equipped ? equipped.name : "— пусто —"}</span>
      </div>`;
    slotsEl.appendChild(slot);
  });
}
