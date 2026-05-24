import { loadImage, loadMobFrames, loadPlayerFrames } from "./assetLoader.js?v=login-fix-1";
import { loadGameContent } from "./dataLoader.js?v=login-fix-1";
import { CANVAS, INTERACT_RADIUS, TILE_SIZE } from "../config/gameConfig.js?v=login-fix-1";
import { NPCGuard } from "../entities/NPCGuard.js?v=login-fix-1";
import { Mob } from "../entities/Mob.js?v=login-fix-1";

const SAVE_VERSION = 1;

if (window.location.search) {
  window.history.replaceState({}, "", window.location.pathname);
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;

let playerFrames;
let mapBackground;
let content;
let collisionMap;
let cat;
let npcs = [];
let mobs = [];
let objects = [];
let activeNpc = null;
let activeInteractable = null;
let keys = {};
let questLog = [];
let questStates = {};
let inventory = {};
let inDialog = false;
let dialogIndex = 0;
let dialogLines = [];
let dialogAction = null;
let notificationTimeout = null;
let highlightPulse = 0;
let showHint = false;
let hintPulse = 0;
let isTransitioning = false;
let currentUser = null;
let currentLocationId = "city";
let loopStarted = false;
let lastAutosaveAt = 0;
let playerFramesPromise = null;

const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const loginMessage = document.getElementById("loginMessage");
const ui = document.getElementById("ui");
const playerBadge = document.getElementById("playerBadge");
const questsButton = document.getElementById("questsButton");
const questsPanel = document.getElementById("questsPanel");
const questsList = document.getElementById("questsList");
const closeQuests = document.getElementById("closeQuests");
const inventoryButton = document.getElementById("inventoryButton");
const inventoryPanel = document.getElementById("inventoryPanel");
const inventoryList = document.getElementById("inventoryList");
const closeInventory = document.getElementById("closeInventory");
const logoutButton = document.getElementById("logoutButton");
const dialogBox = document.getElementById("dialogBox");
const dialogText = document.getElementById("dialogText");
const nextDialog = document.getElementById("nextDialog");

const notification = document.createElement("div");
notification.id = "notification";
notification.classList.add("hidden");
document.body.appendChild(notification);

async function startGame() {
  setupEventListeners();
  initLogin();
  playerFramesPromise = loadPlayerFrames();
  try {
    playerFrames = await playerFramesPromise;
  } catch (error) {
    console.error(error);
    loginMessage.textContent = "Не удалось загрузить ассеты игрока. Проверьте файлы игры.";
  }
}

function setupEventListeners() {
  window.addEventListener("keydown", handleKey);
  window.addEventListener("keyup", (e) => (keys[e.key] = false));
  window.addEventListener("beforeunload", saveProgress);
  nextDialog.addEventListener("click", nextDialogLine);

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (!username) {
      loginMessage.textContent = "Введите имя игрока.";
      return;
    }
    try {
      await login(username);
    } catch (error) {
      console.error(error);
      loginScreen.classList.remove("hidden");
      ui.classList.add("hidden");
      currentUser = null;
      loginMessage.textContent = "Не удалось войти в игру. Проверьте console и файлы проекта.";
    }
  });

  questsButton.addEventListener("click", () => {
    questsPanel.classList.toggle("visible");
    inventoryPanel.classList.remove("visible");
    updateQuestList();
  });

  inventoryButton.addEventListener("click", () => {
    inventoryPanel.classList.toggle("visible");
    questsPanel.classList.remove("visible");
    updateInventoryList();
  });

  if (closeQuests) {
    closeQuests.addEventListener("click", () => {
      questsPanel.classList.remove("visible");
    });
  }

  if (closeInventory) {
    closeInventory.addEventListener("click", () => {
      inventoryPanel.classList.remove("visible");
    });
  }

  logoutButton.addEventListener("click", logout);
}

function initLogin() {
  const lastUser = localStorage.getItem("catCity.lastUser");
  if (lastUser) {
    usernameInput.value = lastUser;
    loginMessage.textContent = `Последний игрок: ${lastUser}. Нажмите "Войти в игру", чтобы продолжить.`;
  }
  usernameInput.focus();
}

async function login(username) {
  currentUser = username;
  localStorage.setItem("catCity.lastUser", username);
  loadProgress();

  if (!playerFrames) {
    playerFrames = await playerFramesPromise;
  }

  loginScreen.classList.add("hidden");
  ui.classList.remove("hidden");
  playerBadge.textContent = `Игрок: ${username}`;
  updateQuestList();
  updateInventoryList();

  await switchLocation(currentLocationId, getSavedSpawn(), { skipSave: true });
  showNotification(`Добро пожаловать, ${username}`);

  if (!loopStarted) {
    loopStarted = true;
    loop();
  }
}

function logout() {
  saveProgress();
  currentUser = null;
  questsPanel.classList.remove("visible");
  inventoryPanel.classList.remove("visible");
  dialogBox.classList.add("hidden");
  ui.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginMessage.textContent = "Прогресс сохранён. Можно войти другим именем.";
  usernameInput.focus();
}

async function switchLocation(locationId, spawnOverride = null, options = {}) {
  isTransitioning = true;
  currentLocationId = locationId;
  content = await loadGameContent(locationId);
  collisionMap = content.collisionMap;
  mapBackground = await loadImage(content.location.map);

  const centerTileX = Math.floor(collisionMap[0].length / 2);
  const centerTileY = Math.floor(collisionMap.length / 2);
  const playerTile = getSpawnPoint(centerTileX, centerTileY, spawnOverride);

  const nextCat = {
    x: playerTile.x * TILE_SIZE + TILE_SIZE / 2,
    y: playerTile.y * TILE_SIZE + TILE_SIZE / 2,
    scale: 0.1,
    direction: "down",
    frame: 0,
    speed: 2,
    tick: 0,
    moving: false,
  };

  cat = cat ? { ...cat, x: nextCat.x, y: nextCat.y, moving: false } : nextCat;
  if (spawnOverride?.direction) {
    cat.direction = spawnOverride.direction;
  }
  npcs = createNpcs();
  mobs = await createMobs();
  objects = createObjects();
  showNotification(content.location.name);
  if (!options.skipSave) {
    saveProgress();
  }
  setTimeout(() => {
    isTransitioning = false;
  }, 250);
}

function getSpawnPoint(centerTileX, centerTileY, spawnOverride) {
  const spawn = spawnOverride || content.location.spawn;
  if (spawn?.x !== undefined && spawn?.y !== undefined) {
    return {
      x: Math.floor(spawn.x / TILE_SIZE),
      y: Math.floor(spawn.y / TILE_SIZE),
    };
  }
  return findClosestRoad(centerTileX, centerTileY);
}

function getSaveKey(username = currentUser) {
  return `catCity.save.${username.toLowerCase()}`;
}

function getSavedSpawn() {
  const save = readSavedProgress();
  return save?.player?.x !== undefined && save?.player?.y !== undefined
    ? { x: save.player.x, y: save.player.y, direction: save.player.direction }
    : null;
}

function readSavedProgress() {
  if (!currentUser) {
    return null;
  }

  try {
    const raw = localStorage.getItem(getSaveKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadProgress() {
  const save = readSavedProgress();
  currentLocationId = save?.locationId || "city";
  questStates = save?.questStates || {};
  questLog = save?.questLog || [];
  inventory = save?.inventory || {};
}

function saveProgress() {
  if (!currentUser || !cat) {
    return;
  }

  const save = {
    version: SAVE_VERSION,
    username: currentUser,
    locationId: content?.location?.id || currentLocationId,
    player: {
      x: Math.round(cat.x),
      y: Math.round(cat.y),
      direction: cat.direction,
    },
    questStates,
    questLog,
    inventory,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(getSaveKey(), JSON.stringify(save));
}

function autosaveProgress() {
  const now = Date.now();
  if (now - lastAutosaveAt < 1200) {
    return;
  }
  lastAutosaveAt = now;
  saveProgress();
}

function handleKey(e) {
  if (!currentUser || !cat) {
    return;
  }
  keys[e.key] = true;
  const isE = e.code === "KeyE" || e.key === "e" || e.key === "E";
  if (isE && !inDialog) {
    tryTalk();
  }
}

function tryTalk() {
  const interactable = findNearestInteractable();
  if (!interactable) {
    return;
  }

  if (interactable.type === "npc") {
    startDialog(interactable.entity);
    return;
  }

  startObjectDialog(interactable.entity);
}

function startDialog(npc) {
  const questId = npc.data.quests?.[0];
  const stage = questId ? questStates[questId] || "none" : "none";
  const dialog = content.dialogs[npc.data.dialog];
  const stageDialog = dialog.stages[stage] || dialog.stages.none;

  inDialog = true;
  activeNpc = npc;
  npc.isFrozen = true;
  dialogBox.classList.remove("hidden");
  dialogLines = stageDialog.lines;
  dialogAction = stageDialog.after || null;
  dialogIndex = 0;
  dialogText.textContent = dialogLines[dialogIndex];
}

function startObjectDialog(object) {
  const activeQuestIds = (object.questCompletions || []).filter(
    (questId) => questStates[questId] === "active"
  );
  const questId = activeQuestIds[0];
  const lines = questId && object.questLines?.[questId]
    ? object.questLines[questId]
    : object.lines;

  inDialog = true;
  activeNpc = null;
  activeInteractable = object;
  dialogBox.classList.remove("hidden");
  dialogLines = lines || [`${object.name}: Здесь пока ничего не происходит.`];
  dialogAction = activeQuestIds.length
    ? { collectObject: object.id, questIds: activeQuestIds }
    : null;
  dialogIndex = 0;
  dialogText.textContent = dialogLines[dialogIndex];
}

function nextDialogLine() {
  dialogIndex++;
  if (dialogIndex < dialogLines.length) {
    dialogText.textContent = dialogLines[dialogIndex];
    return;
  }

  dialogBox.classList.add("hidden");
  inDialog = false;
  if (activeNpc) {
    activeNpc.isFrozen = false;
  }
  runDialogAction(dialogAction);
  activeNpc = null;
  activeInteractable = null;
  dialogAction = null;
}

function runDialogAction(action) {
  if (!action) {
    return;
  }
  if (action.startQuest) {
    startQuest(action.startQuest);
  }
  if (action.finishQuest) {
    finishQuest(action.finishQuest);
  }
  if (action.completeQuest) {
    completeQuest(action.completeQuest);
  }
  if (action.completeQuests) {
    action.completeQuests.forEach((questId) => completeQuest(questId));
  }
  if (action.collectObject) {
    collectObjectRewards(action.collectObject, action.questIds || []);
  }
}

function startQuest(questId) {
  if (questStates[questId]) {
    return;
  }

  const quest = content.quests[questId];
  if (!quest) {
    return;
  }
  questStates[questId] = "active";
  questLog.push({
    id: quest.id,
    name: quest.name,
    status: quest.statusLabels.active,
  });
  updateQuestList();
  showNotification(quest.notifications.started);
  saveProgress();
}

function completeQuest(questId) {
  if (questStates[questId] !== "active") {
    return;
  }

  const quest = content.quests[questId];
  if (!quest) {
    return;
  }
  questStates[questId] = "completed";
  updateQuestStatus(questId, quest.statusLabels.completed);
  showNotification(quest.notifications.completed);
  saveProgress();
}

function finishQuest(questId) {
  if (questStates[questId] !== "completed") {
    return;
  }

  const quest = content.quests[questId];
  if (!quest) {
    return;
  }
  if (!hasRequiredItems(quest.turnIn?.requiresItems || [])) {
    showNotification("Не хватает предметов для сдачи квеста.");
    return;
  }

  consumeItems(quest.turnIn?.consumeItems || []);
  questStates[questId] = "delivered";
  updateQuestStatus(questId, quest.statusLabels.delivered);
  showNotification(quest.notifications.delivered);
  saveProgress();
}

function updateQuestStatus(questId, status) {
  const quest = questLog.find((item) => item.id === questId);
  if (quest) {
    quest.status = status;
  }
  updateQuestList();
}

function updateQuestList() {
  questsList.innerHTML = "";
  questLog.forEach((quest) => {
    const li = document.createElement("li");
    li.textContent = `${quest.name} - ${quest.status}`;
    questsList.appendChild(li);
  });
}

function addItem(itemId, quantity = 1) {
  const item = content.items?.[itemId] || inventory[itemId] || {
    id: itemId,
    name: itemId,
  };
  const current = inventory[itemId]?.quantity || 0;
  inventory[itemId] = {
    id: itemId,
    name: item.name,
    quantity: current + quantity,
  };
  updateInventoryList();
  showNotification(`Получено: ${item.name}`);
  saveProgress();
}

function consumeItems(items) {
  items.forEach((entry) => {
    const itemId = typeof entry === "string" ? entry : entry.id;
    const quantity = typeof entry === "string" ? 1 : entry.quantity || 1;
    if (!inventory[itemId]) {
      return;
    }
    inventory[itemId].quantity -= quantity;
    if (inventory[itemId].quantity <= 0) {
      delete inventory[itemId];
    }
  });
  updateInventoryList();
  saveProgress();
}

function hasItem(itemId, quantity = 1) {
  return (inventory[itemId]?.quantity || 0) >= quantity;
}

function hasRequiredItems(items) {
  return items.every((entry) => {
    const itemId = typeof entry === "string" ? entry : entry.id;
    const quantity = typeof entry === "string" ? 1 : entry.quantity || 1;
    return hasItem(itemId, quantity);
  });
}

function updateInventoryList() {
  inventoryList.innerHTML = "";
  const items = Object.values(inventory);
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Пусто";
    inventoryList.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.quantity > 1
      ? `${item.name} x${item.quantity}`
      : item.name;
    inventoryList.appendChild(li);
  });
}

function collectObjectRewards(objectId, questIds) {
  const object = content.objects?.[objectId];
  if (!object) {
    return;
  }

  (object.itemRewards || []).forEach((reward) => {
    if (reward.questId && !questIds.includes(reward.questId)) {
      return;
    }
    if (reward.once && hasItem(reward.itemId, reward.quantity || 1)) {
      return;
    }
    addItem(reward.itemId, reward.quantity || 1);
  });

  checkQuestProgress();
}

function showNotification(text) {
  notification.textContent = text;
  notification.classList.remove("hidden");
  notification.style.opacity = "1";

  clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    notification.style.transition = "opacity 1s";
    notification.style.opacity = "0";
    setTimeout(() => notification.classList.add("hidden"), 1000);
  }, 3500);
}

function checkQuestProgress() {
  Object.values(content.quests).forEach((quest) => {
    if (questStates[quest.id] !== "active") {
      return;
    }
    if (quest.completion?.type === "playerYLessThan" && cat.y < quest.completion.value) {
      completeQuest(quest.id);
    }
    if (quest.completion?.type === "playerInArea" && isPointInArea(cat, quest.completion.area)) {
      completeQuest(quest.id);
    }
    if (quest.completion?.type === "hasItem" && hasItem(quest.completion.itemId, quest.completion.quantity || 1)) {
      completeQuest(quest.id);
    }
  });
}

function checkLocationExits() {
  if (isTransitioning) {
    return;
  }

  const exit = content.location.exits?.find(({ area }) => isPointInArea(cat, area));

  if (exit) {
    switchLocation(exit.to, exit.spawn);
  }
}

function isPointInArea(point, area) {
  return (
    point.x >= area.x &&
    point.x <= area.x + area.width &&
    point.y >= area.y &&
    point.y <= area.y + area.height
  );
}

function findClosestRoad(startX, startY) {
  let best = { x: startX, y: startY };
  let bestDist = Infinity;
  for (let y = 0; y < collisionMap.length; y++) {
    for (let x = 0; x < collisionMap[y].length; x++) {
      if (collisionMap[y][x] === 0) {
        const dx = x - startX;
        const dy = y - startY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = { x, y };
        }
      }
    }
  }
  return best;
}

function findLargestRoadCluster() {
  const visited = new Set();
  const clusters = [];
  const rows = collisionMap.length;
  const cols = collisionMap[0].length;
  const key = (x, y) => `${x},${y}`;

  function floodFill(sx, sy) {
    const queue = [{ x: sx, y: sy }];
    const cluster = [];
    visited.add(key(sx, sy));

    while (queue.length) {
      const { x, y } = queue.shift();
      cluster.push({ x, y });
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const nx = x + d.x;
        const ny = y + d.y;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && collisionMap[ny][nx] === 0 && !visited.has(key(nx, ny))) {
          visited.add(key(nx, ny));
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return cluster;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (collisionMap[y][x] === 0 && !visited.has(key(x, y))) {
        clusters.push(floodFill(x, y));
      }
    }
  }
  clusters.sort((a, b) => b.length - a.length);
  return clusters[0];
}

function createNpcs() {
  const biggestRoad = findLargestRoadCluster();
  return (content.location.characters || []).map((characterId) => {
    const character = content.characters[characterId];
    const position = resolveNpcPosition(character, biggestRoad);
    const npc = new NPCGuard(
      position.x,
      position.y,
      character.sprite,
      TILE_SIZE,
      collisionMap,
      biggestRoad
    );
    npc.data = character;
    npc.isStatic = character.movement === "static";
    return npc;
  });
}

function createObjects() {
  return (content.location.objects || [])
    .map((objectId) => content.objects[objectId])
    .filter(Boolean);
}

async function createMobs() {
  const mobsByType = new Map();
  return Promise.all((content.mobs || []).map(async (mobData) => {
    if (!mobsByType.has(mobData.type)) {
      mobsByType.set(
        mobData.type,
        loadMobFrames(mobData.spriteBase, mobData.frameCount || 10)
      );
    }
    const frames = await mobsByType.get(mobData.type);
    return new Mob(mobData, frames, TILE_SIZE, collisionMap);
  }));
}

function resolveNpcPosition(character, roadCluster) {
  if (character.positionStrategy === "largestRoadCenter") {
    const mid = roadCluster[Math.floor(roadCluster.length / 2)];
    return {
      x: mid.x * TILE_SIZE,
      y: mid.y * TILE_SIZE,
    };
  }

  if (character.position) {
    return character.position;
  }

  const fallback = roadCluster[0];
  return {
    x: fallback.x * TILE_SIZE,
    y: fallback.y * TILE_SIZE,
  };
}

function findNearestInteractable() {
  const candidates = [
    ...npcs.map((npc) => ({
      type: "npc",
      entity: npc,
      radius: INTERACT_RADIUS,
      distance: Math.hypot(cat.x - npc.x, cat.y - npc.y),
    })),
    ...objects.map((object) => ({
      type: "object",
      entity: object,
      radius: object.radius || INTERACT_RADIUS,
      distance: Math.hypot(cat.x - object.position.x, cat.y - object.position.y),
    })),
  ];

  return candidates
    .filter((candidate) => candidate.distance <= candidate.radius)
    .sort((a, b) => a.distance - b.distance)[0];
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  if (!cat || !currentUser) {
    return;
  }

  if (inDialog) {
    return;
  }

  const prevX = cat.x;
  const prevY = cat.y;
  cat.moving = false;

  if (keys.ArrowUp) {
    cat.y -= cat.speed;
    cat.direction = "up";
    cat.moving = true;
  } else if (keys.ArrowDown) {
    cat.y += cat.speed;
    cat.direction = "down";
    cat.moving = true;
  } else if (keys.ArrowLeft) {
    cat.x -= cat.speed;
    cat.direction = "left";
    cat.moving = true;
  } else if (keys.ArrowRight) {
    cat.x += cat.speed;
    cat.direction = "right";
    cat.moving = true;
  }

  if (checkCollision(cat.x, cat.y)) {
    cat.x = prevX;
    cat.y = prevY;
  }

  if (cat.moving) {
    cat.tick++;
    if (cat.tick % 10 === 0) {
      cat.frame = (cat.frame + 1) % 3;
    }
    autosaveProgress();
  } else {
    cat.frame = 0;
  }

  npcs.forEach((npc) => {
    if (!npc.isFrozen && !npc.isStatic) {
      npc.update();
    }
  });
  mobs.forEach((mob) => mob.update(cat));

  showHint = Boolean(findNearestInteractable()) && !inDialog;

  checkQuestProgress();
  checkLocationExits();
}

function draw() {
  if (!cat || !mapBackground) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(mapBackground, 0, 0);
  drawObjectMarkers();
  mobs.forEach((mob) => mob.draw(ctx));
  npcs.forEach((npc) => npc.draw(ctx));

  const frameImg = playerFrames[cat.direction][cat.frame];
  const w = frameImg.width * cat.scale;
  const h = frameImg.height * cat.scale;
  ctx.drawImage(frameImg, cat.x - w / 2, cat.y - h / 2, w, h);

  const activeQuest = Object.values(content.quests).find(
    (quest) => questStates[quest.id] === "active" &&
      (!quest.targetLocation || quest.targetLocation === content.location.id)
  );
  if (activeQuest) {
    drawPulsingHighlight(activeQuest);
  }

  if (showHint) {
    drawInteractionHint();
  }
}

function drawObjectMarkers() {
  highlightPulse += 0.01;
  objects.forEach((object) => {
    const marker = object.marker || object.position;
    const size = 7 + Math.sin(highlightPulse * 2) * 2;

    ctx.save();
    ctx.translate(marker.x, marker.y - 36);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "rgba(255, 232, 112, 0.85)";
    ctx.strokeStyle = "rgba(59, 43, 20, 0.85)";
    ctx.lineWidth = 2;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  });
}

function drawPulsingHighlight(quest) {
  highlightPulse += 0.03;
  const alpha = 0.4 + Math.sin(highlightPulse) * 0.25;
  const x = quest.highlight?.x ?? canvas.width / 2;
  const y = quest.highlight?.y ?? 120;
  const radius = quest.highlight?.radius ?? 300;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255,255,180,${alpha})`);
  gradient.addColorStop(1, "rgba(255,255,180,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawInteractionHint() {
  hintPulse += 0.08;
  const opacity = 0.5 + Math.sin(hintPulse) * 0.5;
  const interactable = findNearestInteractable();

  if (!interactable) {
    return;
  }

  ctx.save();
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.lineWidth = 3;

  const textX = interactable.type === "npc"
    ? interactable.entity.x
    : interactable.entity.position.x;
  const textY = interactable.type === "npc"
    ? interactable.entity.y - interactable.entity.height / 2 - 10
    : interactable.entity.position.y - 42;

  ctx.strokeText("E", textX, textY);
  ctx.fillText("E", textX, textY);
  ctx.restore();
}

function checkCollision(x, y) {
  const offsetY = 10;
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor((y + offsetY) / TILE_SIZE);
  return collisionMap[tileY]?.[tileX] !== 0;
}

startGame();
