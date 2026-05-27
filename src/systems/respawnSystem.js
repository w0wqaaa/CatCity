export function createMobRespawnEntry(mob, locationId, now = Date.now()) {
  const respawnTimeMs = Number(mob.data.respawnTimeMs ?? mob.data.respawnTime) || 0;
  if (respawnTimeMs <= 0) {
    return null;
  }

  return {
    locationId,
    availableAt: now + respawnTimeMs,
    data: {
      ...mob.data,
      position: { ...mob.data.position },
      hp: mob.maxHp,
    },
    pending: false,
  };
}

// Индивидуальный respawn мобов. Если игрок стоит на spawn-точке, появление откладывается.
export function processMobRespawns({
  queue,
  mobs,
  player,
  currentLocationId,
  spawnMob,
  onError,
  now = Date.now(),
}) {
  if (!queue.length || !player) {
    return { queue, mobs };
  }

  queue.forEach((entry) => {
    if (entry.pending || entry.locationId !== currentLocationId || now < entry.availableAt) {
      return;
    }

    const spawn = entry.data.position;
    if (Math.hypot(player.x - spawn.x, player.y - spawn.y) < 96) {
      entry.availableAt = now + 1500;
      return;
    }

    entry.pending = true;
    spawnMob(entry.data).then((mob) => {
      mobs.push(mob);
      const index = queue.indexOf(entry);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }).catch((error) => {
      onError?.(error);
      entry.pending = false;
      entry.availableAt = Date.now() + 2000;
    });
  });

  return { queue, mobs };
}
