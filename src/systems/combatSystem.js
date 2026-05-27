import { addGold } from "./inventorySystem.js";

export function canAttack(now, lastAttackAt, cooldown) {
  return now - lastAttackAt >= cooldown;
}

export function getDirectionVector(direction) {
  if (direction === "up") {
    return { x: 0, y: -1 };
  }
  if (direction === "left") {
    return { x: -1, y: 0 };
  }
  if (direction === "right") {
    return { x: 1, y: 0 };
  }
  return { x: 0, y: 1 };
}

export function getAttackBox(player, { range, width: attackWidth }) {
  const direction = getDirectionVector(player.direction);
  const horizontal = direction.x !== 0;
  const width = horizontal ? range : attackWidth;
  const height = horizontal ? attackWidth : range;
  const centerX = player.x + direction.x * (range / 2);
  const centerY = player.y + direction.y * (range / 2);

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

export function getMobBox(mob) {
  return {
    x: mob.x - mob.width / 2,
    y: mob.y - mob.height / 2,
    width: mob.width,
    height: mob.height,
  };
}

export function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isMobInAttackRange(player, mob, attackConfig) {
  return rectanglesOverlap(getAttackBox(player, attackConfig), getMobBox(mob));
}

// Точка входа удара игрока: возвращает target/defeated, а game.js решает UI и save.
export function attackFirstMob({ player, mobs, attackConfig, damage }) {
  const target = mobs.find((mob) => isMobInAttackRange(player, mob, attackConfig));
  if (!target) {
    return { target: null, defeated: false };
  }

  const defeated = target.takeDamage(damage);
  return { target, defeated };
}

export function killMob({ mobs, mob, playerStats }) {
  const rewardGold = Number(mob.data.goldReward ?? mob.data.rewardGold) || 0;
  const nextMobs = mobs.filter((item) => item !== mob);
  if (rewardGold > 0) {
    addGold(playerStats, rewardGold);
  }
  return {
    mobs: nextMobs,
    rewardGold,
  };
}

export function damagePlayer(playerStats, amount) {
  playerStats.hp = Math.max(0, playerStats.hp - amount);
  return {
    hp: playerStats.hp,
    died: playerStats.hp <= 0,
  };
}

export function restorePlayerAfterDeath(playerStats) {
  playerStats.hp = playerStats.maxHp;
  playerStats.mp = playerStats.maxMp;
  return playerStats;
}
