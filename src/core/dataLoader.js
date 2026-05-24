async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadByIds(ids, pathForId) {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await loadJson(pathForId(id))])
  );
  return Object.fromEntries(entries);
}

export async function loadGameContent(locationId = "city") {
  const location = await loadJson(`data/locations/${locationId}.json`);
  const characters = await loadByIds(
    location.characters,
    (id) => `data/characters/${id}.json`
  );
  const quests = await loadByIds(
    location.quests,
    (id) => `data/quests/${id}.json`
  );

  const dialogIds = new Set();
  Object.values(characters).forEach((character) => {
    if (character.dialog) {
      dialogIds.add(character.dialog);
    }
  });

  const dialogs = await loadByIds(
    [...dialogIds],
    (id) => `data/dialogs/${id}.json`
  );

  return {
    location,
    characters,
    quests,
    dialogs,
  };
}
