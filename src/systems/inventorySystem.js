export function normalizePlayerStats(stats = {}, defaults) {
  const savedStats = stats || {};
  return {
    hp: Number.isFinite(savedStats.hp) ? savedStats.hp : defaults.hp,
    maxHp: Number.isFinite(savedStats.maxHp) ? savedStats.maxHp : defaults.maxHp,
    mp: Number.isFinite(savedStats.mp) ? savedStats.mp : defaults.mp,
    maxMp: Number.isFinite(savedStats.maxMp) ? savedStats.maxMp : defaults.maxMp,
    gold: Number.isFinite(savedStats.gold) ? savedStats.gold : defaults.gold,
  };
}

// Инвентарь не знает про DOM: он только меняет данные в GameState.
export function addItemToInventory(inventory, itemData, quantity = 1) {
  const item = itemData || { id: "unknown", name: "unknown" };
  const current = inventory[item.id]?.quantity || 0;
  inventory[item.id] = {
    id: item.id,
    name: item.name || item.id,
    quantity: current + quantity,
  };
  return inventory[item.id];
}

export function removeItemFromInventory(inventory, itemId, quantity = 1) {
  if (!inventory[itemId]) {
    return false;
  }

  inventory[itemId].quantity -= quantity;
  if (inventory[itemId].quantity <= 0) {
    delete inventory[itemId];
  }
  return true;
}

export function consumeInventoryItems(inventory, items) {
  items.forEach((entry) => {
    const itemId = typeof entry === "string" ? entry : entry.id;
    const quantity = typeof entry === "string" ? 1 : entry.quantity || 1;
    removeItemFromInventory(inventory, itemId, quantity);
  });
}

export function hasItem(inventory, itemId, quantity = 1) {
  return (inventory[itemId]?.quantity || 0) >= quantity;
}

export function getItemCount(inventory, itemId) {
  return inventory[itemId]?.quantity || 0;
}

export function hasRequiredItems(inventory, items) {
  return items.every((entry) => {
    const itemId = typeof entry === "string" ? entry : entry.id;
    const quantity = typeof entry === "string" ? 1 : entry.quantity || 1;
    return hasItem(inventory, itemId, quantity);
  });
}

export function addGold(playerStats, amount) {
  playerStats.gold = Math.max(0, (playerStats.gold || 0) + amount);
  return playerStats.gold;
}

export function canAfford(playerStats, price) {
  return (playerStats.gold || 0) >= price;
}

export function spendGold(playerStats, price) {
  if (!canAfford(playerStats, price)) {
    return false;
  }
  playerStats.gold -= price;
  return true;
}
