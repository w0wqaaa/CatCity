import { addItemToInventory, spendGold } from "./inventorySystem.js";

export function createShopPurchase({ playerStats, inventory, item, price }) {
  if (!spendGold(playerStats, price)) {
    return {
      ok: false,
      reason: "notEnoughGold",
    };
  }

  addItemToInventory(inventory, item, 1);
  return {
    ok: true,
    item,
  };
}
