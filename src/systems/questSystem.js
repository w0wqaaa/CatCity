import { consumeInventoryItems, hasRequiredItems } from "./inventorySystem.js";

export function startQuest({ questId, quests, questStates, questLog }) {
  if (questStates[questId]) {
    return null;
  }

  const quest = quests[questId];
  if (!quest) {
    return null;
  }

  questStates[questId] = "active";
  questLog.push({
    id: quest.id,
    name: quest.name,
    status: quest.statusLabels.active,
  });
  return quest;
}

export function completeQuest({ questId, quests, questStates, questLog }) {
  if (questStates[questId] !== "active") {
    return null;
  }

  const quest = quests[questId];
  if (!quest) {
    return null;
  }

  questStates[questId] = "completed";
  updateQuestStatus(questLog, questId, quest.statusLabels.completed);
  return quest;
}

export function finishQuest({ questId, quests, questStates, questLog, inventory }) {
  if (questStates[questId] !== "completed") {
    return { quest: null, reason: "notCompleted" };
  }

  const quest = quests[questId];
  if (!quest) {
    return { quest: null, reason: "missingQuest" };
  }

  if (!hasRequiredItems(inventory, quest.turnIn?.requiresItems || [])) {
    return { quest, reason: "missingItems" };
  }

  consumeInventoryItems(inventory, quest.turnIn?.consumeItems || []);
  questStates[questId] = "delivered";
  updateQuestStatus(questLog, questId, quest.statusLabels.delivered);
  return { quest, reason: null };
}

export function updateQuestStatus(questLog, questId, status) {
  const quest = questLog.find((item) => item.id === questId);
  if (quest) {
    quest.status = status;
  }
}

export function isQuestStarted(questStates, questId) {
  return Boolean(questStates[questId]);
}

export function isQuestCompleted(questStates, questId) {
  return questStates[questId] === "completed" || questStates[questId] === "delivered";
}

export function checkQuestConditions({ quests, questStates, player, inventory, isPointInArea }) {
  const completed = [];
  Object.values(quests).forEach((quest) => {
    if (questStates[quest.id] !== "active") {
      return;
    }
    if (quest.completion?.type === "playerYLessThan" && player.y < quest.completion.value) {
      completed.push(quest.id);
    }
    if (quest.completion?.type === "playerInArea" && isPointInArea(player, quest.completion.area)) {
      completed.push(quest.id);
    }
    if (quest.completion?.type === "hasItem" && hasRequiredItems(inventory, [{ id: quest.completion.itemId, quantity: quest.completion.quantity || 1 }])) {
      completed.push(quest.id);
    }
  });
  return completed;
}

export function canTurnInQuestToNpc({ npc, quests, questStates, inventory }) {
  return (npc.data.quests || []).some((questId) => {
    const quest = quests[questId];
    return (
      quest &&
      questStates[questId] === "completed" &&
      hasRequiredItems(inventory, quest.turnIn?.requiresItems || [])
    );
  });
}
