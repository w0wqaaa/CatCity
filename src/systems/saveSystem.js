export function getSaveKey(username) {
  return `catCity.save.${username.toLowerCase()}`;
}

export function readSavedProgress(username, storage = localStorage) {
  if (!username) {
    return null;
  }

  try {
    const raw = storage.getItem(getSaveKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function buildSaveData({ version, username, locationId, player, playerCharacter, playerStats, questStates, questLog, inventory, equipment, echoMazeState, echoMazeResults, seenLocationGuides }) {
  return {
    version,
    username,
    locationId,
    player: {
      x: player.x,
      y: player.y,
      direction: player.direction,
    },
    playerCharacter,
    playerStats,
    questStates,
    questLog,
    inventory,
    equipment: equipment || {},
    echoMazeState,
    echoMazeResults,
    seenLocationGuides,
    // TODO: при устойчивой системе mob-id сохранить индивидуальные dead/respawn состояния.
    savedAt: new Date().toISOString(),
  };
}

export function writeSave(username, save, storage = localStorage) {
  storage.setItem(getSaveKey(username), JSON.stringify(save));
  return save;
}
