export async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadCollisionMap(path) {
  const module = await import(`../../${path}`);
  return module.collisionMap;
}

async function loadByIds(ids, pathForId) {
  const entries = await Promise.all(
    ids.map(async (id) => [id, await loadJson(pathForId(id))])
  );
  return Object.fromEntries(entries);
}

export async function loadGameContent(locationId = "city") {
  const location = await loadJson(`data/locations/${locationId}.json`);
  const collisionMap = await loadCollisionMap(location.collisionMap);
  const characterIds = location.characters || [];
  const questIds = location.quests || [];
  const objectIds = location.objects || [];
  const itemIds = location.items || [];
  const mobSpawns = location.mobs || [];
  const mobTypeIds = [...new Set(mobSpawns.map((mob) => mob.type))];
  const characters = await loadByIds(
    characterIds,
    (id) => `data/characters/${id}.json`
  );
  const quests = await loadByIds(
    questIds,
    (id) => `data/quests/${id}.json`
  );
  const objects = await loadByIds(
    objectIds,
    (id) => `data/objects/${id}.json`
  );
  const items = await loadByIds(
    itemIds,
    (id) => `data/items/${id}.json`
  );
  const mobTypes = await loadByIds(
    mobTypeIds,
    (id) => `data/mobs/${id}.json`
  );
  const mobs = mobSpawns.map((spawn) => ({
    ...mobTypes[spawn.type],
    ...spawn,
    type: spawn.type,
  }));

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
    collisionMap,
    characters,
    quests,
    objects,
    items,
    mobs,
    dialogs,
  };
}
