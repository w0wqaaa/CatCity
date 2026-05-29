export function renderPlayerStats(element, playerStats) {
  if (!element) return;
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
    li.textContent = item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name;
    listElement.appendChild(li);
  });
}

// ─── Иконки предметов ─────────────────────────────────────────────────────────
const ITEM_ICONS = {
  small_hp_potion: "🧪", small_mp_potion: "💧",
  herb: "🌿", meadow_herbs: "🌺",
  echo_shard: "💎", wild_honeycomb: "🍯",
  spice_crate_seal: "📦",
};
export function getItemIcon(item) {
  if (!item) return "📦";
  return ITEM_ICONS[item.id] || (item.type === "consumable" ? "⚗️" : "📦");
}

// ─── Инвентарь (сетка) ────────────────────────────────────────────────────────
export function renderInventoryGrid(gridEl, goldEl, inventory, playerStats, { onUseItem, onAssignItem } = {}) {
  if (!gridEl) return;
  if (goldEl) goldEl.textContent = `💰 ${playerStats?.gold ?? 0}`;

  gridEl.innerHTML = "";
  const items = Object.values(inventory);
  const SLOTS = 20;

  for (let i = 0; i < SLOTS; i++) {
    const item = items[i];
    const slot = document.createElement("div");
    slot.className = "inv-slot" + (item ? " inv-slot-filled" : "");

    if (item) {
      // Иконка
      const icon = document.createElement("span");
      icon.className = "inv-slot-icon";
      icon.textContent = getItemIcon(item);

      // Количество
      const qty = document.createElement("span");
      qty.className = "inv-slot-qty";
      qty.textContent = item.quantity > 1 ? `×${item.quantity}` : "";

      // Тултип с описанием
      const tooltip = document.createElement("div");
      tooltip.className = "inv-slot-tooltip";
      tooltip.innerHTML = `<b>${item.name}</b>${item.description ? `<br><span>${item.description}</span>` : ""}${item.type === "consumable" ? "<br><em>Клик — использовать</em>" : ""}`;

      slot.appendChild(icon);
      slot.appendChild(qty);
      slot.appendChild(tooltip);

      // Для расходников — кнопки назначения [1][2][3]
      if (item.type === "consumable") {
        const assignRow = document.createElement("div");
        assignRow.className = "inv-assign-row";

        for (const slotNum of [1, 2, 3]) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "inv-assign-btn";
          btn.textContent = slotNum;
          btn.title = `Назначить на слот ${slotNum}`;
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (onAssignItem) onAssignItem(item.id, slotNum);
          });
          assignRow.appendChild(btn);
        }
        slot.appendChild(assignRow);

        if (onUseItem) {
          slot.classList.add("inv-slot-usable");
          slot.addEventListener("click", () => onUseItem(item.id));
        }
      }
    }

    gridEl.appendChild(slot);
  }
}

// ─── Снаряжение ───────────────────────────────────────────────────────────────
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

// ─── Хотбар (3 быстрых слота) ─────────────────────────────────────────────────
export function renderHotbar(hotbarEl, hotbar, inventory) {
  if (!hotbarEl) return;
  [1, 2, 3].forEach((n) => {
    const slotEl = hotbarEl.querySelector(`[data-slot="${n}"]`);
    if (!slotEl) return;

    const itemId = hotbar[n];
    const item   = itemId ? inventory[itemId] : null;

    const iconEl = slotEl.querySelector(".hb-icon");
    const qtyEl  = slotEl.querySelector(".hb-qty");
    const nameEl = slotEl.querySelector(".hb-name");

    if (item) {
      slotEl.classList.add("hb-filled");
      iconEl.textContent = getItemIcon(item);
      qtyEl.textContent  = item.quantity > 1 ? `×${item.quantity}` : "";
      if (nameEl) nameEl.textContent = item.name;
    } else {
      slotEl.classList.remove("hb-filled");
      iconEl.textContent = "";
      qtyEl.textContent  = "";
      if (nameEl) nameEl.textContent = "пусто";
    }
  });
}
