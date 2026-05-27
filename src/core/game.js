import { loadImage, loadMobFrames, loadNpcFrames, loadPlayerFrames } from "./assetLoader.js?v=sega16-v2";
import { loadGameContent, loadJson } from "./dataLoader.js?v=sega16-v2";
import { CANVAS, INTERACT_RADIUS, TILE_SIZE } from "../config/gameConfig.js?v=login-fix-1";
import { NPC } from "../entities/NPC.js?v=spritesheet-combat-1";
import { NPCGuard } from "../entities/NPCGuard.js?v=spritesheet-combat-1";
import { Mob } from "../entities/Mob.js?v=spritesheet-combat-1";
import { initMinimap, isMinimapEnabled, toggleMinimap, updateMinimap } from "../ui/minimap.js?v=menu-hotkeys-1";
import { initControlLegend, updateControlLegend } from "../ui/controlLegend.js?v=run-controls-1";

const SAVE_VERSION = 1;
const PLAYER_DEFAULT_STATS = {
  hp: 10,
  maxHp: 10,
  mp: 5,
  maxMp: 5,
  gold: 0,
};
const PLAYER_ATTACK_DAMAGE = 1;
const PLAYER_ATTACK_RANGE = 48;
const PLAYER_ATTACK_WIDTH = 48;
const PLAYER_ATTACK_COOLDOWN = 350;
const PLAYER_RUN_MULTIPLIER = 1.7;
const ART_VERSION = "sega16-v2";
const MOVEMENT_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const RUN_KEYS = new Set(["ShiftLeft", "ShiftRight"]);
const KEY_ALIASES = {
  up: ["KeyW", "ArrowUp", "w", "ц"],
  down: ["KeyS", "ArrowDown", "s", "ы"],
  left: ["KeyA", "ArrowLeft", "a", "ф"],
  right: ["KeyD", "ArrowRight", "d", "в"],
  interact: ["KeyE", "e", "у"],
  quests: ["KeyQ", "q", "й"],
  inventory: ["KeyI", "i", "ш"],
  minimap: ["KeyM", "m", "ь"],
};

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
let mobRespawns = [];
let activeNpc = null;
let activeInteractable = null;
let keys = {};
let pressedDirections = [];
let questLog = [];
let questStates = {};
let inventory = {};
let playerStats = { ...PLAYER_DEFAULT_STATS };
let playerCharacter = "boy";
let loadedPlayerCharacter = null;
let inDialog = false;
let dialogIndex = 0;
let dialogLines = [];
let dialogAction = null;
let notificationTimeout = null;
let highlightPulse = 0;
let showHint = false;
let hintPulse = 0;
let isTransitioning = false;
let isRespawning = false;
let currentUser = null;
let currentLocationId = "city";
let loopStarted = false;
let lastAutosaveAt = 0;
let lastAttackAt = 0;
let lastPlayerHitNoticeAt = 0;
let playerFramesPromise = null;
let shopPanel = null;
let shopItemsList = null;
let activeShop = null;
const itemCache = new Map();

const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const characterInputs = document.querySelectorAll("input[name='playerCharacter']");
const loginMessage = document.getElementById("loginMessage");
const ui = document.getElementById("ui");
const playerBadge = document.getElementById("playerBadge");
const playerStatsBadge = document.getElementById("playerStats");
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

function withArtVersion(path) {
  return path.includes("?") ? `${path}&v=${ART_VERSION}` : `${path}?v=${ART_VERSION}`;
}

async function startGame() {
  initMinimap();
  initControlLegend();
  initShopUi();
  setupEventListeners();
  initLogin();
  playerFramesPromise = loadPlayerFrames();
  try {
    playerFrames = await playerFramesPromise;
    loadedPlayerCharacter = "boy";
  } catch (error) {
    console.error(error);
    loginMessage.textContent = "Не удалось загрузить ассеты игрока. Проверьте файлы игры.";
  }
}

function setupEventListeners() {
  window.addEventListener("keydown", handleKey, true);
  window.addEventListener("keyup", (e) => {
    setKeyState(e, false);
  }, true);
  window.addEventListener("blur", clearInputState);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInputState();
    }
  });
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

  questsButton.addEventListener("click", toggleQuestPanel);

  inventoryButton.addEventListener("click", toggleInventoryPanel);

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
  setSelectedPlayerCharacter(getLastSelectedPlayerCharacter(lastUser));
  usernameInput.focus();
}

function getSelectedPlayerCharacter() {
  const selected = [...characterInputs].find((input) => input.checked)?.value;
  return selected === "girl" ? "girl" : "boy";
}

function setSelectedPlayerCharacter(character) {
  const value = character === "girl" ? "girl" : "boy";
  characterInputs.forEach((input) => {
    input.checked = input.value === value;
  });
}

function getLastSelectedPlayerCharacter(lastUser) {
  const savedCharacter = lastUser
    ? readSavedProgressForUser(lastUser)?.playerCharacter
    : null;
  return savedCharacter || localStorage.getItem("catCity.lastCharacter") || "boy";
}

function readSavedProgressForUser(username) {
  try {
    const raw = localStorage.getItem(getSaveKey(username));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function login(username) {
  currentUser = username;
  playerCharacter = getSelectedPlayerCharacter();
  localStorage.setItem("catCity.lastUser", username);
  localStorage.setItem("catCity.lastCharacter", playerCharacter);
  loadProgress();

  if (loadedPlayerCharacter !== playerCharacter) {
    if (playerCharacter === "boy" && playerFramesPromise) {
      playerFrames = await playerFramesPromise;
    } else {
      playerFrames = await loadPlayerFrames(playerCharacter);
    }
    loadedPlayerCharacter = playerCharacter;
  }

  loginScreen.classList.add("hidden");
  ui.classList.remove("hidden");
  updatePlayerStatsUi();
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
  closeShop();
  dialogBox.classList.add("hidden");
  ui.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  updateMinimap();
  updateControlLegend();
  loginMessage.textContent = "Прогресс сохранён. Можно войти другим именем.";
  usernameInput.focus();
}

async function switchLocation(locationId, spawnOverride = null, options = {}) {
  isTransitioning = true;
  currentLocationId = locationId;
  content = await loadGameContent(locationId);
  collisionMap = content.collisionMap;
  mapBackground = await loadImage(withArtVersion(content.location.map));

  const centerTileX = Math.floor(collisionMap[0].length / 2);
  const centerTileY = Math.floor(collisionMap.length / 2);
  const playerTile = getSpawnPoint(centerTileX, centerTileY, spawnOverride);

  const nextCat = {
    x: playerTile.x * TILE_SIZE + TILE_SIZE / 2,
    y: playerTile.y * TILE_SIZE + TILE_SIZE / 2,
    scale: 2,
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
  npcs = await createNpcs();
  mobs = await createMobs();
  mobRespawns = [];
  objects = await createObjects();
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
  playerCharacter = getSelectedPlayerCharacter() || save?.playerCharacter || "boy";
  currentLocationId = save?.locationId || "city";
  questStates = save?.questStates || {};
  questLog = save?.questLog || [];
  inventory = save?.inventory || {};
  playerStats = normalizePlayerStats(save?.playerStats);
}

function saveProgress() {
  if (!currentUser || !cat) {
    return;
  }

  const save = {
    version: SAVE_VERSION,
    username: currentUser,
    locationId: content?.location?.id || currentLocationId,
    playerCharacter,
    player: {
      x: Math.round(cat.x),
      y: Math.round(cat.y),
      direction: cat.direction,
    },
    questStates,
    questLog,
    inventory,
    playerStats,
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
  setKeyState(e, true);
  if (isMovementKey(e) || isRunKey(e)) {
    e.preventDefault();
  }

  if (!currentUser || !cat) {
    return;
  }

  if (e.code === "Escape") {
    if (closeMenus()) {
      e.preventDefault();
    }
    return;
  }

  if (e.code === "Enter" && inDialog) {
    e.preventDefault();
    nextDialogLine();
    return;
  }

  if (inDialog) {
    return;
  }

  if (matchesKey(e, KEY_ALIASES.quests)) {
    e.preventDefault();
    toggleQuestPanel();
    return;
  }

  if (matchesKey(e, KEY_ALIASES.inventory)) {
    e.preventDefault();
    toggleInventoryPanel();
    return;
  }

  if (matchesKey(e, KEY_ALIASES.minimap)) {
    e.preventDefault();
    toggleMinimap();
    return;
  }

  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) {
      attackMobs();
    }
    return;
  }

  if (matchesKey(e, KEY_ALIASES.interact)) {
    e.preventDefault();
    if (!tryTalk()) {
      tryLocationExit();
    }
  }
}

function setKeyState(e, isPressed) {
  if (e.key) {
    keys[e.key] = isPressed;
    keys[e.key.toLowerCase()] = isPressed;
  }
  if (e.code) {
    keys[e.code] = isPressed;
  }

  const direction = getMovementDirectionFromEvent(e);
  if (!direction) {
    return;
  }

  if (isPressed) {
    pressedDirections = pressedDirections.filter((item) => item !== direction);
    pressedDirections.push(direction);
  } else {
    pressedDirections = pressedDirections.filter((item) => item !== direction);
  }
}

function isMovementKey(e) {
  return (
    MOVEMENT_KEYS.has(e.code) ||
    matchesKey(e, KEY_ALIASES.up) ||
    matchesKey(e, KEY_ALIASES.down) ||
    matchesKey(e, KEY_ALIASES.left) ||
    matchesKey(e, KEY_ALIASES.right)
  );
}

function isRunKey(e) {
  return RUN_KEYS.has(e.code) || e.key === "Shift";
}

function matchesKey(e, aliases) {
  const key = e.key?.toLowerCase();
  return aliases.includes(e.code) || aliases.includes(key);
}

function isKeyDown(aliases) {
  return aliases.some((alias) => keys[alias]);
}

function getMovementDirectionFromEvent(e) {
  if (matchesKey(e, KEY_ALIASES.up)) {
    return "up";
  }
  if (matchesKey(e, KEY_ALIASES.down)) {
    return "down";
  }
  if (matchesKey(e, KEY_ALIASES.left)) {
    return "left";
  }
  if (matchesKey(e, KEY_ALIASES.right)) {
    return "right";
  }
  return null;
}

function clearInputState() {
  keys = {};
  pressedDirections = [];
}

function toggleQuestPanel() {
  questsPanel.classList.toggle("visible");
  inventoryPanel.classList.remove("visible");
  updateQuestList();
}

function toggleInventoryPanel() {
  inventoryPanel.classList.toggle("visible");
  questsPanel.classList.remove("visible");
  updateInventoryList();
}

function closeMenus() {
  const hadOpenMenu = questsPanel.classList.contains("visible") ||
    inventoryPanel.classList.contains("visible") ||
    Boolean(shopPanel?.classList.contains("visible"));
  questsPanel.classList.remove("visible");
  inventoryPanel.classList.remove("visible");
  closeShop();
  return hadOpenMenu;
}

function normalizePlayerStats(stats = {}) {
  const savedStats = stats || {};
  return {
    hp: Number.isFinite(savedStats.hp) ? savedStats.hp : PLAYER_DEFAULT_STATS.hp,
    maxHp: Number.isFinite(savedStats.maxHp) ? savedStats.maxHp : PLAYER_DEFAULT_STATS.maxHp,
    mp: Number.isFinite(savedStats.mp) ? savedStats.mp : PLAYER_DEFAULT_STATS.mp,
    maxMp: Number.isFinite(savedStats.maxMp) ? savedStats.maxMp : PLAYER_DEFAULT_STATS.maxMp,
    gold: Number.isFinite(savedStats.gold) ? savedStats.gold : PLAYER_DEFAULT_STATS.gold,
  };
}

function updatePlayerStatsUi() {
  if (!playerStatsBadge) {
    return;
  }
  playerStatsBadge.textContent = `HP ${playerStats.hp}/${playerStats.maxHp} MP ${playerStats.mp}/${playerStats.maxMp} Gold ${playerStats.gold}`;
}

function damagePlayer(amount) {
  if (isRespawning) {
    return;
  }

  playerStats.hp = Math.max(0, playerStats.hp - amount);
  updatePlayerStatsUi();
  saveProgress();

  if (playerStats.hp <= 0) {
    handlePlayerDeath();
  }

  const now = Date.now();
  if (now - lastPlayerHitNoticeAt > 900) {
    lastPlayerHitNoticeAt = now;
    showNotification(playerStats.hp > 0 ? `Урон: -${amount} HP` : "HP закончились");
  }
}

async function handlePlayerDeath() {
  if (isRespawning) {
    return;
  }

  isRespawning = true;
  clearInputState();
  playerStats.hp = playerStats.maxHp;
  playerStats.mp = playerStats.maxMp;
  updatePlayerStatsUi();
  showNotification("You fainted. Respawning in Cat City.");

  try {
    await switchLocation("city", null, { skipSave: true });
    saveProgress();
  } finally {
    isRespawning = false;
  }
}

function attackMobs() {
  const now = Date.now();
  if (now - lastAttackAt < PLAYER_ATTACK_COOLDOWN) {
    return;
  }
  lastAttackAt = now;

  const target = mobs.find(isMobInAttackRange);
  if (!target) {
    return;
  }

  const defeated = target.takeDamage(PLAYER_ATTACK_DAMAGE);
  if (defeated) {
    defeatMob(target);
    return;
  } else {
    showNotification(`Попадание: ${target.hp}/${target.maxHp}`);
  }
}

function defeatMob(mob) {
  mobs = mobs.filter((item) => item !== mob);
  const reward = Number(mob.data.goldReward) || 0;
  if (reward > 0) {
    playerStats.gold += reward;
    updatePlayerStatsUi();
    showNotification(`Mob defeated: +${reward} Gold`);
  } else {
    showNotification("Mob defeated");
  }

  queueMobRespawn(mob);
  saveProgress();
}

function queueMobRespawn(mob) {
  const respawnTimeMs = Number(mob.data.respawnTimeMs) || 0;
  if (respawnTimeMs <= 0) {
    return;
  }

  mobRespawns.push({
    locationId: currentLocationId,
    availableAt: Date.now() + respawnTimeMs,
    data: {
      ...mob.data,
      position: { ...mob.data.position },
      hp: mob.maxHp,
    },
    pending: false,
  });
}

function isMobInAttackRange(mob) {
  return rectanglesOverlap(getAttackBox(), getMobBox(mob));
}

function getAttackBox() {
  const direction = getDirectionVector(cat.direction);
  const horizontal = direction.x !== 0;
  const width = horizontal ? PLAYER_ATTACK_RANGE : PLAYER_ATTACK_WIDTH;
  const height = horizontal ? PLAYER_ATTACK_WIDTH : PLAYER_ATTACK_RANGE;
  const centerX = cat.x + direction.x * (PLAYER_ATTACK_RANGE / 2);
  const centerY = cat.y + direction.y * (PLAYER_ATTACK_RANGE / 2);

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

function getMobBox(mob) {
  return {
    x: mob.x - mob.width / 2,
    y: mob.y - mob.height / 2,
    width: mob.width,
    height: mob.height,
  };
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getDirectionVector(direction) {
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

function tryTalk() {
  const interactable = findNearestInteractable();
  if (!interactable) {
    return false;
  }

  if (interactable.type === "npc") {
    if (interactable.entity.data.shop) {
      openShop(interactable.entity.data.shop);
      return true;
    }
    startDialog(interactable.entity);
    return true;
  }

  if (interactable.entity.actionType === "enterLocation" && interactable.entity.to) {
    switchLocation(interactable.entity.to, interactable.entity.spawn);
    return true;
  }

  startObjectDialog(interactable.entity);
  return true;
}

function tryLocationExit() {
  const exit = findNearbyExit();
  if (!exit || isTransitioning) {
    return false;
  }

  switchLocation(exit.to, exit.spawn);
  return true;
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

function initShopUi() {
  shopPanel = document.getElementById("shopPanel");
  if (shopPanel) {
    shopItemsList = document.getElementById("shopItemsList");
    return;
  }

  shopPanel = document.createElement("div");
  shopPanel.id = "shopPanel";
  shopPanel.className = "hidden";
  shopPanel.innerHTML = `
    <h3 id="shopTitle">Shop</h3>
    <div id="shopItemsList"></div>
    <button id="closeShop">Close</button>
  `;
  document.body.appendChild(shopPanel);
  shopItemsList = document.getElementById("shopItemsList");
  document.getElementById("closeShop").addEventListener("click", closeShop);
}

async function openShop(shopId) {
  if (!shopPanel || !shopItemsList) {
    initShopUi();
  }

  closeMenus();
  try {
    activeShop = await loadJson(`data/shops/${shopId}.json`);
    shopPanel.classList.remove("hidden");
    shopPanel.classList.add("visible");
    await renderShop();
  } catch (error) {
    console.error(error);
    showNotification("Shop is unavailable");
  }
}

function closeShop() {
  if (!shopPanel) {
    return;
  }
  shopPanel.classList.add("hidden");
  shopPanel.classList.remove("visible");
  activeShop = null;
}

async function getItemData(itemId) {
  if (content.items?.[itemId]) {
    return content.items[itemId];
  }
  if (!itemCache.has(itemId)) {
    itemCache.set(itemId, loadJson(`data/items/${itemId}.json`).catch(() => ({
      id: itemId,
      name: itemId,
    })));
  }
  return itemCache.get(itemId);
}

async function renderShop() {
  shopItemsList.innerHTML = "";
  const items = activeShop?.items || [];
  for (const entry of items) {
    const item = await getItemData(entry.itemId);
    const row = document.createElement("div");
    row.className = "shop-row";

    const label = document.createElement("span");
    label.textContent = `${item.name} - ${entry.price} Gold`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Buy";
    button.addEventListener("click", () => buyShopItem(entry.itemId, entry.price));

    row.append(label, button);
    shopItemsList.appendChild(row);
  }
}

async function buyShopItem(itemId, price) {
  if (playerStats.gold < price) {
    showNotification("Not enough Gold");
    return;
  }

  const item = await getItemData(itemId);
  playerStats.gold -= price;
  updatePlayerStatsUi();
  addItem(item.id, 1);
  saveProgress();
  await renderShop();
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

function findNearbyExit() {
  return content.location.exits?.find(({ area }) => isPointInArea(cat, expandArea(area, INTERACT_RADIUS)));
}

function expandArea(area, padding) {
  return {
    x: area.x - padding,
    y: area.y - padding,
    width: area.width + padding * 2,
    height: area.height + padding * 2,
  };
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

async function createNpcs() {
  const biggestRoad = findLargestRoadCluster();
  return Promise.all((content.location.characters || []).map(async (characterId) => {
    const character = content.characters[characterId];
    const position = resolveNpcPosition(character, biggestRoad);
    let frames = null;
    try {
      frames = await loadNpcFrames(character);
    } catch {
      frames = null;
    }
    const npc = character.type === "guard"
      ? new NPCGuard(
        position.x,
        position.y,
        character.sprite,
        TILE_SIZE,
        collisionMap,
        biggestRoad,
        frames
      )
      : new NPC(
        position.x,
        position.y,
        character.sprite,
        TILE_SIZE,
        frames
      );
    npc.data = character;
    npc.isStatic = character.type !== "guard" || character.movement === "static";
    return npc;
  }));
}

async function createObjects() {
  const locationObjects = (content.location.objects || [])
    .map((objectId) => content.objects[objectId])
    .filter(Boolean);

  await Promise.all(locationObjects.map(async (object) => {
    if (!object.sprite) {
      return;
    }
    try {
      object.image = await loadImage(withArtVersion(object.sprite));
    } catch (error) {
      console.warn(`Failed to load object sprite: ${object.sprite}`, error);
    }
  }));

  return locationObjects;
}

async function createMobs() {
  const mobsByType = new Map();
  return Promise.all((content.mobs || []).map(async (mobData) => {
    if (!mobsByType.has(mobData.type)) {
      mobsByType.set(
        mobData.type,
        loadMobFrames(mobData, mobData.frameCount || 10)
      );
    }
    const frames = await mobsByType.get(mobData.type);
    return new Mob(mobData, frames, TILE_SIZE, collisionMap);
  }));
}

async function spawnMob(mobData) {
  const frames = await loadMobFrames(mobData, mobData.frameCount || 10);
  return new Mob(mobData, frames, TILE_SIZE, collisionMap);
}

function processMobRespawns() {
  if (!mobRespawns.length || isTransitioning || !cat) {
    return;
  }

  const now = Date.now();
  mobRespawns.forEach((entry) => {
    if (entry.pending || entry.locationId !== currentLocationId || now < entry.availableAt) {
      return;
    }

    const spawn = entry.data.position;
    if (Math.hypot(cat.x - spawn.x, cat.y - spawn.y) < 96) {
      entry.availableAt = now + 1500;
      return;
    }

    entry.pending = true;
    spawnMob(entry.data).then((mob) => {
      mobs.push(mob);
      mobRespawns = mobRespawns.filter((item) => item !== entry);
    }).catch((error) => {
      console.error(error);
      entry.pending = false;
      entry.availableAt = Date.now() + 2000;
    });
  });
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
  const moveSpeed = getPlayerMoveSpeed();
  const moveVector = getCurrentMoveVector();
  cat.moving = false;

  if (moveVector.x || moveVector.y) {
    cat.x += moveVector.x * moveSpeed;
    cat.y += moveVector.y * moveSpeed;
    cat.direction = moveVector.direction;
    cat.moving = true;
  }

  if (checkCollision(cat.x, cat.y)) {
    cat.x = prevX;
    cat.y = prevY;
  }

  if (cat.moving) {
    cat.tick++;
    if (cat.tick % (isPlayerRunning() ? 6 : 10) === 0) {
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
  mobs.forEach((mob) => {
    if (isRespawning) {
      return;
    }
    const event = mob.update(cat);
    if (event?.type === "attack") {
      damagePlayer(event.damage);
    }
  });
  processMobRespawns();

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
  drawObjects();
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

  drawExitMarkers();
  drawObjectMarkers();
  drawQuestTurnInMarkers();
  drawNpcNameLabels();

  if (showHint) {
    drawInteractionHint();
  }

  updateMinimap({
    collisionMap,
    tileSize: TILE_SIZE,
    player: currentUser ? cat : null,
    npcs,
    mobs,
    exits: content.location.exits || [],
  });
  updateControlLegend(getControlLegendContext());
}

function isPlayerRunning() {
  return Boolean(keys.ShiftLeft || keys.ShiftRight || keys.Shift);
}

function getPlayerMoveSpeed() {
  return cat.speed * (isPlayerRunning() ? PLAYER_RUN_MULTIPLIER : 1);
}

function getCurrentMoveVector() {
  const x = (isKeyDown(KEY_ALIASES.right) ? 1 : 0) - (isKeyDown(KEY_ALIASES.left) ? 1 : 0);
  const y = (isKeyDown(KEY_ALIASES.down) ? 1 : 0) - (isKeyDown(KEY_ALIASES.up) ? 1 : 0);

  if (!x && !y) {
    pressedDirections = [];
    return { x: 0, y: 0, direction: cat.direction };
  }

  const length = Math.hypot(x, y) || 1;
  const direction = getFacingDirectionFromPressedKeys(x, y);
  return {
    x: x / length,
    y: y / length,
    direction,
  };
}

function getFacingDirectionFromPressedKeys(x, y) {
  while (pressedDirections.length) {
    const direction = pressedDirections[pressedDirections.length - 1];
    if (isKeyDown(KEY_ALIASES[direction])) {
      return direction;
    }
    pressedDirections.pop();
  }

  if (Math.abs(x) >= Math.abs(y)) {
    return x > 0 ? "right" : "left";
  }
  return y > 0 ? "down" : "up";
}

function getControlLegendContext() {
  const interactable = !inDialog ? findNearestInteractable() : null;
  return {
    isGameActive: Boolean(currentUser && cat),
    isDialogOpen: inDialog,
    nearbyNPC: interactable?.type === "npc",
    nearbyInteractable: Boolean(interactable),
    nearbyExit: !inDialog && Boolean(findNearbyExit()),
    nearbyMob: !inDialog && mobs.some(isMobInAttackRange),
    minimapEnabled: isMinimapEnabled(),
    isMenuOpen: questsPanel.classList.contains("visible") ||
      inventoryPanel.classList.contains("visible") ||
      Boolean(shopPanel?.classList.contains("visible")),
    playerCanAttack: !inDialog,
  };
}

function drawExitMarkers() {
  const exits = content.location.exits || [];
  if (!exits.length) {
    return;
  }

  const pulse = 0.45 + Math.sin(highlightPulse * 3) * 0.25;
  const nearbyExit = findNearbyExit();

  exits.forEach((exit) => {
    const { area } = exit;
    const isNearby = nearbyExit?.id === exit.id;
    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height / 2;

    ctx.save();
    ctx.fillStyle = isNearby
      ? `rgba(90, 245, 120, ${0.24 + pulse * 0.15})`
      : `rgba(70, 210, 105, ${0.14 + pulse * 0.08})`;
    ctx.strokeStyle = isNearby
      ? `rgba(196, 255, 165, ${0.75 + pulse * 0.2})`
      : `rgba(105, 230, 120, ${0.55 + pulse * 0.2})`;
    ctx.lineWidth = isNearby ? 4 : 3;
    ctx.setLineDash([12, 8]);
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.strokeRect(area.x + 2, area.y + 2, area.width - 4, area.height - 4);
    ctx.setLineDash([]);

    drawExitArrow(centerX, centerY, area, isNearby);

    if (isNearby) {
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 4;
      ctx.strokeText("E", centerX, centerY - 24);
      ctx.fillText("E", centerX, centerY - 24);
    }

    ctx.restore();
  });
}

function drawExitArrow(centerX, centerY, area, isNearby) {
  const size = isNearby ? 18 : 14;
  const direction = getExitDirection(area);

  ctx.save();
  ctx.translate(centerX, centerY);
  if (direction === "down") {
    ctx.rotate(Math.PI);
  } else if (direction === "left") {
    ctx.rotate(-Math.PI / 2);
  } else if (direction === "right") {
    ctx.rotate(Math.PI / 2);
  }

  ctx.fillStyle = isNearby ? "rgba(221, 255, 160, 0.95)" : "rgba(165, 245, 140, 0.82)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.8, size * 0.5);
  ctx.lineTo(-size * 0.8, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function getExitDirection(area) {
  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;
  const distTop = centerY;
  const distBottom = canvas.height - centerY;
  const distLeft = centerX;
  const distRight = canvas.width - centerX;
  const min = Math.min(distTop, distBottom, distLeft, distRight);

  if (min === distBottom) {
    return "down";
  }
  if (min === distLeft) {
    return "left";
  }
  if (min === distRight) {
    return "right";
  }
  return "up";
}

function drawQuestTurnInMarkers() {
  const readyNpcs = npcs.filter(canTurnInQuestToNpc);
  if (!readyNpcs.length) {
    return;
  }

  const pulse = 0.55 + Math.sin(highlightPulse * 4) * 0.35;
  readyNpcs.forEach((npc) => {
    const markerY = npc.y - npc.height / 2 - 30;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 232, 90, ${0.65 + pulse * 0.25})`;
    ctx.fillStyle = `rgba(255, 226, 95, ${0.16 + pulse * 0.16})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(npc.x, npc.y + npc.height * 0.22, npc.width * 0.38, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe45d";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 5;
    ctx.strokeText("!", npc.x, markerY);
    ctx.fillText("!", npc.x, markerY);
    ctx.restore();
  });
}

function drawNpcNameLabels() {
  npcs.forEach((npc) => {
    const label = getNpcLabel(npc);
    const x = npc.x;
    const y = npc.y - npc.height / 2 - 8;

    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(245, 240, 216, 0.96)";
    ctx.strokeStyle = "rgba(22, 24, 24, 0.9)";
    ctx.lineWidth = 4;
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
    ctx.restore();
  });
}

function getNpcLabel(npc) {
  const labels = {
    baker: "Пекарь",
    beekeeper: "Пасечник",
    guard: "Страж",
    herbalist: "Травница",
    road_scout: "Следопыт",
    spice_merchant: "Торговец",
  };
  return labels[npc.data.id] || npc.data.name || "NPC";
}

function canTurnInQuestToNpc(npc) {
  return (npc.data.quests || []).some((questId) => {
    const quest = content.quests[questId];
    return (
      quest &&
      questStates[questId] === "completed" &&
      hasRequiredItems(quest.turnIn?.requiresItems || [])
    );
  });
}

function drawObjects() {
  objects
    .filter((object) => object.image)
    .slice()
    .sort((a, b) => (a.drawOrder ?? a.position.y) - (b.drawOrder ?? b.position.y))
    .forEach((object) => {
      const width = object.width || object.image.width;
      const height = object.height || object.image.height;
      const x = object.position.x - width / 2;
      const y = object.position.y - height;
      ctx.drawImage(object.image, x, y, width, height);
    });
}

function drawObjectMarkers() {
  highlightPulse += 0.01;
  objects.filter((object) => object.interactable !== false).forEach((object) => {
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
  return collisionMap[tileY]?.[tileX] !== 0 || isBlockedByObject(x, y + offsetY);
}

function isBlockedByObject(x, y) {
  return objects.some((object) => {
    if (!object.collision) {
      return false;
    }
    const box = getObjectCollisionBox(object);
    return (
      x >= box.x &&
      x <= box.x + box.width &&
      y >= box.y &&
      y <= box.y + box.height
    );
  });
}

function getObjectCollisionBox(object) {
  if (object.collisionBox) {
    return object.collisionBox;
  }

  const width = object.collisionWidth || object.width || 0;
  const height = object.collisionHeight || Math.min(object.height || 0, 64);
  return {
    x: object.position.x - width / 2,
    y: object.position.y - height,
    width,
    height,
  };
}

startGame();
