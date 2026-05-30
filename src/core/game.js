import { loadImage, loadMobFrames, loadNpcFrames, loadPlayerFrames } from "./assetLoader.js?v=attack-anim-1";
import { loadGameContent, loadJson } from "./dataLoader.js?v=sega16-v2";
import { GameState } from "./GameState.js";
import { CANVAS, INTERACT_RADIUS, TILE_SIZE } from "../config/gameConfig.js?v=login-fix-1";
import { NPC } from "../entities/NPC.js?v=spritesheet-combat-1";
import { NPCGuard } from "../entities/NPCGuard.js?v=spritesheet-combat-1";
import { Mob } from "../entities/Mob.js?v=spritesheet-combat-1";
import { initMinimap, isMinimapEnabled, toggleMinimap, updateMinimap } from "../ui/minimap.js?v=minigames-2";
import { initControlLegend, updateControlLegend } from "../ui/controlLegend.js?v=minigames-1";
import { closeLocationGuide, initLocationGuide, isLocationGuideOpen, openLocationGuide } from "../ui/locationGuide.js?v=location-guide-1";
import { initRunTimer, showRunResults, updateRunTimer } from "../ui/runTimer.js?v=run-timer-1";
import { renderInventoryGrid, renderEquipmentPanel, renderHotbar, renderInventoryList, renderPlayerStats, renderQuestList, getItemIcon } from "../ui/uiManager.js?v=hotbar-1";
import { attackFirstMob, canAttack, damagePlayer as applyPlayerDamage, getAttackBox as buildAttackBox, getMobBox, killMob, rectanglesOverlap, restorePlayerAfterDeath } from "../systems/combatSystem.js";
import { getNpcDialogStage, openDialogState, advanceDialog } from "../systems/dialogSystem.js";
import { addGold as addPlayerGold, addItemToInventory, consumeInventoryItems, hasItem as inventoryHasItem, hasRequiredItems as inventoryHasRequiredItems, normalizePlayerStats as normalizeStats, removeItemFromInventory } from "../systems/inventorySystem.js";
import { findNearestInteractable as findNearestInteraction, findNearbyExit as findNearbyLocationExit, isPointInArea } from "../systems/interactionSystem.js";
import { getCurrentMoveVector as getMoveVector, getMoveSpeed, isKeyDown as isAliasDown, isRunning } from "../systems/movementSystem.js";
import { abandonQuest as abandonQuestState, canTurnInQuestToNpc as canTurnInQuestToNpcSystem, checkQuestConditions, completeQuest as completeQuestState, finishQuest as finishQuestState, startQuest as startQuestState, updateQuestStatus as updateQuestStatusState } from "../systems/questSystem.js";
import { drawObjects as drawSpriteObjects, drawPlayer as drawPlayerSprite } from "../systems/renderSystem.js";
import { createMobRespawnEntry, processMobRespawns as processRespawnQueue } from "../systems/respawnSystem.js";
import { buildSaveData, getSaveKey as buildSaveKey, readSavedProgress as readSavedProgressFromStorage, writeSave } from "../systems/saveSystem.js";
import { createShopPurchase } from "../systems/shopSystem.js";
import { initPuzzleGame, isPuzzleOpen, openPuzzleGame, getPuzzleResults } from "../ui/puzzleGame.js";
import { initTetrisGame, isTetrisOpen, openTetrisGame, getTetrisResults } from "../ui/tetrisGame.js";
import { initTankGame, isTankOpen, openTankGame, getTankResults } from "../ui/tankGame.js";
import { initSnakeGame, isSnakeOpen, openSnakeGame, getSnakeResults } from "../ui/snakeGame.js";
import { initTutorialGuide, isTutorialOpen, openTutorial, maybeShowTutorial, markTutorialSeen } from "../ui/tutorialGuide.js";
import { initMiniGameManager, isMiniGameOpen, openMiniGame, closeMiniGame } from "../minigames/miniGameManager.js?v=poker-3";
import { initTouchControls, showTouchControls, hideTouchControls } from "../ui/touchControls.js?v=mobile-1";

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
const PLAYER_ATTACK_TICKS = 20;
const PLAYER_ATTACK_FRAME_TICKS = 5;
const PLAYER_RUN_MULTIPLIER = 1.7;
const ART_VERSION = "attack-anim-1";
const ECHO_MAZE_LOCATION_ID = "echo_maze";
const ECHO_MAZE_SEQUENCE = ["leaf", "stone", "moon", "flame"];
const ECHO_MAZE_REWARD_GOLD = 25;
const ECHO_SHADOW_SPAWN_OFFSET = 72;
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
  guide: ["KeyH", "h", "р"],
};

if (window.location.search) {
  window.history.replaceState({}, "", window.location.pathname);
}

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;

const gameState = new GameState(PLAYER_DEFAULT_STATS);
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
let echoMazeState = createDefaultEchoMazeState();
let echoMazeResults = [];
let puzzleGameResults = [];
let snakeGameResults  = [];
let tankGameResults   = [];
let tetrisGameResults = [];
let equipment = { head: null, body: null, weapon: null, offhand: null, belt: null, legs: null, amulet: null };
let hotbar = { 1: null, 2: null, 3: null }; // item IDs для быстрых слотов
let miniGameStats = {};
let seenLocationGuides = {};
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
const guideButton = document.getElementById("guideButton");
const tutorialButton = document.getElementById("tutorialButton");
const inventoryPanel = document.getElementById("inventoryPanel");
const inventoryList = document.getElementById("inventoryList");
const closeInventory = document.getElementById("closeInventory");
const invGrid           = document.getElementById("invGrid");
const invGoldDisplay    = document.getElementById("invGoldDisplay");
const equipmentPanel    = document.getElementById("equipmentPanel");
const equipmentButton   = document.getElementById("equipmentButton");
const closeEquipmentBtn = document.getElementById("closeEquipment");
const equipSlots        = document.getElementById("equipSlots");
const hotbarEl          = document.getElementById("hotbar");
const logoutButton = document.getElementById("logoutButton");
const dialogBox = document.getElementById("dialogBox");
const dialogText = document.getElementById("dialogText");
const nextDialog = document.getElementById("nextDialog");

const notification = document.createElement("div");
notification.id = "notification";
notification.classList.add("hidden");
document.body.appendChild(notification);

function createDefaultEchoMazeState() {
  return {
    sequence: [...ECHO_MAZE_SEQUENCE],
    progressIndex: 0,
    solved: false,
    activatedRunes: [],
    rewardClaimed: false,
    exitPortalUnlocked: false,
    runStartedAt: null,
    completedTimeMs: null,
  };
}

function normalizeEchoMazeState(savedState = null) {
  const state = {
    ...createDefaultEchoMazeState(),
    ...(savedState || {}),
    sequence: [...ECHO_MAZE_SEQUENCE],
    activatedRunes: Array.isArray(savedState?.activatedRunes)
      ? [...savedState.activatedRunes]
      : [],
  };
  if (state.solved) {
    state.exitPortalUnlocked = true;
    state.activatedRunes = [...ECHO_MAZE_SEQUENCE];
  }
  return state;
}

function normalizeEchoMazeResults(savedResults = null) {
  return Array.isArray(savedResults)
    ? savedResults
        .filter((result) => Number.isFinite(result.timeMs))
        .sort((a, b) => a.timeMs - b.timeMs)
        .slice(0, 10)
    : [];
}

function normalizeSeenLocationGuides(savedGuides = null) {
  if (Array.isArray(savedGuides)) {
    return Object.fromEntries(savedGuides.map((locationId) => [locationId, true]));
  }
  return savedGuides && typeof savedGuides === "object" ? { ...savedGuides } : {};
}

function withArtVersion(path) {
  return path.includes("?") ? `${path}&v=${ART_VERSION}` : `${path}?v=${ART_VERSION}`;
}

async function startGame() {
  initMinimap();
  initControlLegend();
  initLocationGuide();
  initRunTimer();
  initPuzzleGame();
  initSnakeGame();
  initTankGame();
  initTetrisGame();
  initTutorialGuide();
  initMiniGameManager();
  initTouchControls();
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
  if (equipmentButton) {
    equipmentButton.addEventListener("click", toggleEquipmentPanel);
  }
  if (closeEquipmentBtn) {
    closeEquipmentBtn.addEventListener("click", () => equipmentPanel.classList.remove("visible"));
  }
  guideButton.addEventListener("click", openCurrentLocationGuide);
  tutorialButton.addEventListener("click", () => openTutorial());

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
  return readSavedProgressFromStorage(username);
}

async function login(username) {
  currentUser = username;
  gameState.currentUser = username;
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
  hotbarEl.classList.remove("hidden");
  showTouchControls();
  updatePlayerStatsUi();
  playerBadge.textContent = `Игрок: ${username}`;
  updateQuestList();
  updateInventoryList();
  updateHotbarUI();

  await switchLocation(currentLocationId, getSavedSpawn(), { skipSave: true });
  showNotification(`Добро пожаловать, ${username}`);

  // Показываем туториал при первом входе
  if (maybeShowTutorial(username)) {
    markTutorialSeen(username);
  }

  if (!loopStarted) {
    loopStarted = true;
    loop();
  }
}

function logout() {
  saveProgress();
  currentUser = null;
  gameState.currentUser = null;
  questsPanel.classList.remove("visible");
  inventoryPanel.classList.remove("visible");
  closeShop();
  dialogBox.classList.add("hidden");
  closeLocationGuide();
  ui.classList.add("hidden");
  hotbarEl.classList.add("hidden");
  hideTouchControls();
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
    attacking: false,
    attackTicks: 0,
    attackFrame: 0,
  };

  cat = cat ? {
    ...cat,
    x: nextCat.x,
    y: nextCat.y,
    moving: false,
    attacking: false,
    attackTicks: 0,
    attackFrame: 0,
  } : nextCat;
  if (spawnOverride?.direction) {
    cat.direction = spawnOverride.direction;
  }
  npcs = await createNpcs();
  mobs = await createMobs();
  mobRespawns = [];
  objects = await createObjects();
  applyEchoMazeRuntimeState();
  handleLocationRunStart();
  gameState.setLocationRuntime({ locationId, content, collisionMap, player: cat, npcs, mobs, objects });
  gameState.mobRespawns = mobRespawns;
  showNotification(content.location.name);
  if (!options.skipSave) {
    saveProgress();
  }
  setTimeout(() => {
    isTransitioning = false;
    showLocationGuideIfNeeded(content.location.id);
  }, 250);
}

function showLocationGuideIfNeeded(locationId) {
  if (!currentUser || seenLocationGuides[locationId]) {
    return;
  }

  clearInputState();
  openLocationGuide(locationId, {
    onClose: () => {
      seenLocationGuides[locationId] = true;
      gameState.seenLocationGuides = seenLocationGuides;
      saveProgress();
    },
  });
}

function openCurrentLocationGuide() {
  if (!currentUser || !content?.location?.id) {
    return;
  }

  closeMenus();
  clearInputState();
  openLocationGuide(content.location.id);
}

function handleLocationRunStart() {
  if (content.location.id !== ECHO_MAZE_LOCATION_ID) {
    updateRunTimer({ visible: false });
    return;
  }

  if (!echoMazeState.solved && !echoMazeState.runStartedAt) {
    echoMazeState.runStartedAt = Date.now();
    echoMazeState.completedTimeMs = null;
    saveProgress();
  }
  updateEchoMazeTimerUi();
}

function updateEchoMazeTimerUi() {
  if (content?.location?.id !== ECHO_MAZE_LOCATION_ID) {
    updateRunTimer({ visible: false });
    return;
  }

  const elapsedMs = echoMazeState.solved
    ? echoMazeState.completedTimeMs || 0
    : Date.now() - (echoMazeState.runStartedAt || Date.now());
  updateRunTimer({
    visible: true,
    elapsedMs,
    results: echoMazeResults,
  });
}

function recordEchoMazeResult(timeMs) {
  if (!Number.isFinite(timeMs) || timeMs <= 0) {
    return;
  }

  echoMazeResults.push({
    player: currentUser,
    timeMs: Math.round(timeMs),
    mode: "solo",
    completedAt: new Date().toISOString(),
  });
  echoMazeResults = echoMazeResults
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, 10);
  gameState.echoMazeResults = echoMazeResults;
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
  return buildSaveKey(username);
}

function getSavedSpawn() {
  const save = readSavedProgress();
  return save?.player?.x !== undefined && save?.player?.y !== undefined
    ? { x: save.player.x, y: save.player.y, direction: save.player.direction }
    : null;
}

function readSavedProgress() {
  return readSavedProgressFromStorage(currentUser);
}

function loadProgress() {
  const save = readSavedProgress();
  playerCharacter = getSelectedPlayerCharacter() || save?.playerCharacter || "boy";
  currentLocationId = save?.locationId || "city";
  questStates = save?.questStates || {};
  questLog = save?.questLog || [];
  inventory = save?.inventory || {};
  playerStats = normalizePlayerStats(save?.playerStats);
  echoMazeState = normalizeEchoMazeState(save?.echoMazeState);
  echoMazeResults = normalizeEchoMazeResults(save?.echoMazeResults);
  seenLocationGuides = normalizeSeenLocationGuides(save?.seenLocationGuides);
  equipment = save?.equipment || { head: null, body: null, weapon: null, offhand: null, belt: null, legs: null, amulet: null };
  hotbar    = save?.hotbar    || { 1: null, 2: null, 3: null };
  miniGameStats = save?.miniGameStats || {};
  gameState.setProgress({ playerCharacter, currentLocationId, questStates, questLog, inventory, playerStats, echoMazeState, echoMazeResults, seenLocationGuides });
  gameState.echoMazeState = echoMazeState;
  gameState.echoMazeResults = echoMazeResults;
  gameState.seenLocationGuides = seenLocationGuides;
  gameState.saveData = save;
}

function saveProgress() {
  if (!currentUser || !cat) {
    return;
  }

  const save = buildSaveData({
    version: SAVE_VERSION,
    username: currentUser,
    locationId: content?.location?.id || currentLocationId,
    player: {
      ...cat,
      x: Math.round(cat.x),
      y: Math.round(cat.y),
    },
    playerCharacter,
    playerStats,
    questStates,
    questLog,
    inventory,
    equipment,
    hotbar,
    miniGameStats,
    echoMazeState,
    echoMazeResults,
    seenLocationGuides,
  });
  gameState.saveData = writeSave(currentUser, save);
}

function autosaveProgress() {
  const now = Date.now();
  if (now - lastAutosaveAt < 1200) {
    return;
  }
  lastAutosaveAt = now;
  saveProgress();
}

async function handleKey(e) {
  // Пока мини-игра открыта — основное управление заблокировано
  // (Esc обрабатывается внутри miniGameManager)
  if (isMiniGameOpen()) {
    return;
  }

  if (isLocationGuideOpen()) {
    e.preventDefault();
    if (e.code === "Escape" || e.code === "Enter") {
      closeLocationGuide();
    }
    return;
  }

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

  if (matchesKey(e, KEY_ALIASES.guide)) {
    e.preventDefault();
    openCurrentLocationGuide();
    return;
  }

  if (e.code === "Space") {
    e.preventDefault();
    if (!e.repeat) {
      attackMobs();
    }
    return;
  }

  // Быстрые слоты 1/2/3
  if (e.code === "Digit1" || e.key === "1") { e.preventDefault(); useHotbarSlot(1); return; }
  if (e.code === "Digit2" || e.key === "2") { e.preventDefault(); useHotbarSlot(2); return; }
  if (e.code === "Digit3" || e.key === "3") { e.preventDefault(); useHotbarSlot(3); return; }

  if (matchesKey(e, KEY_ALIASES.interact)) {
    e.preventDefault();
    if (!(await tryTalk())) {
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
  return isAliasDown(keys, aliases);
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
  if (equipmentPanel) equipmentPanel.classList.remove("visible");
  updateInventoryGrid();
}

function toggleEquipmentPanel() {
  if (equipmentPanel) equipmentPanel.classList.toggle("visible");
  inventoryPanel.classList.remove("visible");
  questsPanel.classList.remove("visible");
  closeShop();
  renderEquipmentPanel(equipSlots, equipment);
}

function closeMenus() {
  const hadOpenMenu = questsPanel.classList.contains("visible") ||
    inventoryPanel.classList.contains("visible") ||
    Boolean(equipmentPanel?.classList.contains("visible")) ||
    Boolean(shopPanel?.classList.contains("visible"));
  questsPanel.classList.remove("visible");
  inventoryPanel.classList.remove("visible");
  if (equipmentPanel) equipmentPanel.classList.remove("visible");
  closeShop();
  return hadOpenMenu;
}

function normalizePlayerStats(stats = {}) {
  return normalizeStats(stats, PLAYER_DEFAULT_STATS);
}

function updatePlayerStatsUi() {
  renderPlayerStats(playerStatsBadge, playerStats);
}

function damagePlayer(amount) {
  if (isRespawning) {
    return;
  }

  const result = applyPlayerDamage(playerStats, amount);
  updatePlayerStatsUi();
  saveProgress();

  if (result.died) {
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
  restorePlayerAfterDeath(playerStats);
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
  if (!canAttack(now, lastAttackAt, PLAYER_ATTACK_COOLDOWN)) {
    return;
  }
  lastAttackAt = now;
  startPlayerAttackAnimation();

  const { target, defeated } = attackFirstMob({
    player: cat,
    mobs,
    attackConfig: {
      range: PLAYER_ATTACK_RANGE,
      width: PLAYER_ATTACK_WIDTH,
    },
    damage: PLAYER_ATTACK_DAMAGE,
  });
  if (!target) {
    return;
  }

  if (defeated) {
    defeatMob(target);
    return;
  } else {
    showNotification(`Попадание: ${target.hp}/${target.maxHp}`);
  }
}

function startPlayerAttackAnimation() {
  cat.attacking = true;
  cat.attackTicks = PLAYER_ATTACK_TICKS;
  cat.attackFrame = 0;
}

function defeatMob(mob) {
  const result = killMob({ mobs, mob, playerStats });
  mobs = result.mobs;
  gameState.mobs = mobs;
  const reward = result.rewardGold;
  if (reward > 0) {
    updatePlayerStatsUi();
    showNotification(`Mob defeated: +${reward} Gold`);
  } else {
    showNotification("Mob defeated");
  }

  queueMobRespawn(mob);
  saveProgress();
}

function queueMobRespawn(mob) {
  const entry = createMobRespawnEntry(mob, currentLocationId);
  if (!entry) {
    return;
  }

  mobRespawns.push(entry);
  gameState.mobRespawns = mobRespawns;
}

function isMobInAttackRange(mob) {
  return rectanglesOverlap(getAttackBox(), getMobBox(mob));
}

function getAttackBox() {
  return buildAttackBox(cat, {
    range: PLAYER_ATTACK_RANGE,
    width: PLAYER_ATTACK_WIDTH,
  });
}

async function tryTalk() {
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

  if (isRuneObject(interactable.entity)) {
    await handleRuneInteraction(interactable.entity);
    return true;
  }

  if (interactable.entity.actionType === "heal") {
    handleHealInteraction(interactable.entity);
    return true;
  }

  if (isPuzzlePortal(interactable.entity)) {
    handlePuzzlePortal(interactable.entity);
    return true;
  }

  if (isSnakePortal(interactable.entity)) {
    handleSnakePortal(interactable.entity);
    return true;
  }

  if (isTankPortal(interactable.entity)) {
    handleTankPortal(interactable.entity);
    return true;
  }

  if (isTetrisPortal(interactable.entity)) {
    handleTetrisPortal(interactable.entity);
    return true;
  }

  if (isPortalObject(interactable.entity)) {
    handlePortalInteraction(interactable.entity);
    return true;
  }

  if (interactable.entity.actionType === "enterLocation" && interactable.entity.to) {
    switchLocation(interactable.entity.to, interactable.entity.spawn);
    return true;
  }

  startObjectDialog(interactable.entity);
  return true;
}

function isPortalObject(object) {
  return object?.type === "portal" || object?.actionType === "portal" || object?.actionType === "puzzle" || object?.actionType === "snake" || object?.actionType === "tank" || object?.actionType === "tetris";
}

function isTetrisPortal(object) { return object?.actionType === "tetris"; }

function handleTetrisPortal(portal) {
  if (portal.locked) { showNotification(portal.lockedMessage || "Портал заблокирован."); return; }
  openTetrisGame({
    playerName: currentUser || "Игрок",
    savedResults: tetrisGameResults,
    onClose: () => { tetrisGameResults = getTetrisResults(); saveProgress(); },
  });
}

function isTankPortal(object) { return object?.actionType === "tank"; }

function handleTankPortal(portal) {
  if (portal.locked) { showNotification(portal.lockedMessage || "Портал заблокирован."); return; }
  openTankGame({
    playerName: currentUser || "Игрок",
    savedResults: tankGameResults,
    onClose: () => { tankGameResults = getTankResults(); saveProgress(); },
  });
}

function isSnakePortal(object) {
  return object?.actionType === "snake";
}

function handleSnakePortal(portal) {
  if (portal.locked) {
    showNotification(portal.lockedMessage || "Портал заблокирован.");
    return;
  }
  openSnakeGame({
    playerName: currentUser || "Игрок",
    savedResults: snakeGameResults,
    onClose: () => {
      snakeGameResults = getSnakeResults();
      saveProgress();
    },
  });
}

function isPuzzlePortal(object) {
  return object?.actionType === "puzzle";
}

function handlePuzzlePortal(portal) {
  if (portal.locked) {
    showNotification(portal.lockedMessage || "Портал заблокирован.");
    return;
  }
  openPuzzleGame({
    playerName: currentUser || "Игрок",
    savedResults: puzzleGameResults,
    onClose: () => {
      puzzleGameResults = getPuzzleResults();
      saveProgress();
    },
  });
}

function isRuneObject(object) {
  return object?.type === "rune";
}

function handlePortalInteraction(portal) {
  if (portal.locked) {
    showNotification(portal.lockedMessage || "Портал пока нестабилен.");
    return;
  }

  // Мини-игра через targetMode
  if (portal.targetMode) {
    openMiniGame(portal.targetMode, {
      playerStats,
      onGoldChange: (delta) => {
        addPlayerGold(playerStats, delta);
        updatePlayerStatsUi();
        saveProgress();
      },
      onStatsUpdate: (modeId, result) => {
        recordMiniGameResult(modeId, result);
        saveProgress();
      },
      onClose: () => { updatePlayerStatsUi(); saveProgress(); },
    });
    return;
  }

  const targetLocationId = portal.targetLocationId || portal.to;
  if (!targetLocationId) {
    showNotification("Портал пока нестабилен.");
    return;
  }

  switchLocation(targetLocationId, portal.spawn);
}

function recordMiniGameResult(modeId, result) {
  if (!miniGameStats[modeId]) {
    miniGameStats[modeId] = { wins: 0, losses: 0, draws: 0 };
  }
  const s = miniGameStats[modeId];
  if (result === "win")  s.wins   = (s.wins   || 0) + 1;
  if (result === "lose") s.losses = (s.losses || 0) + 1;
  if (result === "draw") s.draws  = (s.draws  || 0) + 1;
}

async function handleRuneInteraction(rune) {
  if (content.location.id !== ECHO_MAZE_LOCATION_ID) {
    return;
  }

  if (echoMazeState.solved) {
    showNotification("Руна уже светится.");
    return;
  }

  if (echoMazeState.activatedRunes.includes(rune.orderKey)) {
    showNotification("Эта руна уже откликнулась.");
    return;
  }

  const expectedKey = echoMazeState.sequence[echoMazeState.progressIndex];
  if (rune.orderKey === expectedKey) {
    echoMazeState.activatedRunes.push(rune.orderKey);
    echoMazeState.progressIndex += 1;
    showNotification("Руна откликнулась.");

    if (echoMazeState.progressIndex >= echoMazeState.sequence.length) {
      await solveEchoMaze();
    }
  } else {
    echoMazeState.progressIndex = 0;
    echoMazeState.activatedRunes = [];
    showNotification("Лабиринт исказился.");
    damagePlayer(1);
    if (playerStats.hp > 0) {
      await spawnEchoShadowNearPlayer();
    }
  }

  applyEchoMazeRuntimeState();
  saveProgress();
}

async function solveEchoMaze() {
  if (!echoMazeState.completedTimeMs) {
    echoMazeState.completedTimeMs = Date.now() - (echoMazeState.runStartedAt || Date.now());
    recordEchoMazeResult(echoMazeState.completedTimeMs);
  }
  echoMazeState.solved = true;
  echoMazeState.exitPortalUnlocked = true;

  if (!echoMazeState.rewardClaimed) {
    addPlayerGold(playerStats, ECHO_MAZE_REWARD_GOLD);
    const item = await getItemData("echo_shard");
    addItemToInventory(inventory, item, 1);
    updatePlayerStatsUi();
    updateInventoryList();
    echoMazeState.rewardClaimed = true;
    showNotification("Эхо-лабиринт затих. Вы получили 25 золота и Осколок эха.");
  }
  updateEchoMazeTimerUi();
  showRunResults(echoMazeResults);
}

async function spawnEchoShadowNearPlayer() {
  const mobType = await loadJson("data/mobs/echo_shadow.json");
  const spawn = findClosestOpenPoint(cat.x + ECHO_SHADOW_SPAWN_OFFSET, cat.y);
  const shadow = await spawnMob({
    ...mobType,
    type: "echo_shadow",
    position: spawn,
  });
  mobs.push(shadow);
  gameState.mobs = mobs;
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
  const stageDialog = getNpcDialogStage({
    npc,
    dialogs: content.dialogs,
    questStates,
  });

  inDialog = true;
  activeNpc = npc;
  npc.isFrozen = true;
  dialogBox.classList.remove("hidden");
  openDialogState(gameState.dialog, {
    lines: stageDialog.lines,
    action: stageDialog.after || null,
    activeNpc: npc,
  });
  dialogLines = gameState.dialog.lines;
  dialogAction = gameState.dialog.action;
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
  openDialogState(gameState.dialog, {
    lines: lines || [`${object.name}: Здесь пока ничего не происходит.`],
    action: activeQuestIds.length
      ? { collectObject: object.id, questIds: activeQuestIds }
      : null,
    activeInteractable: object,
  });
  dialogLines = gameState.dialog.lines;
  dialogAction = gameState.dialog.action;
  dialogIndex = 0;
  dialogText.textContent = dialogLines[dialogIndex];
}

function nextDialogLine() {
  const result = advanceDialog(gameState.dialog);
  dialogIndex = gameState.dialog.index;
  if (!result.done) {
    dialogText.textContent = result.line;
    return;
  }

  dialogBox.classList.add("hidden");
  inDialog = false;
  if (activeNpc) {
    activeNpc.isFrozen = false;
  }
  runDialogAction(result.action);
  activeNpc = null;
  activeInteractable = null;
  dialogLines = [];
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
  const quest = startQuestState({
    questId,
    quests: content.quests,
    questStates,
    questLog,
  });
  if (!quest) {
    return;
  }
  updateQuestList();
  showNotification(quest.notifications.started);
  saveProgress();
}

function completeQuest(questId) {
  const quest = completeQuestState({
    questId,
    quests: content.quests,
    questStates,
    questLog,
  });
  if (!quest) {
    return;
  }
  updateQuestList();
  showNotification(quest.notifications.completed);
  saveProgress();
}

function finishQuest(questId) {
  const { quest, reason } = finishQuestState({
    questId,
    quests: content.quests,
    questStates,
    questLog,
    inventory,
  });
  if (!quest) {
    return;
  }
  if (reason === "missingItems") {
    showNotification("Не хватает предметов для сдачи квеста.");
    return;
  }

  updateInventoryList();
  updateQuestList();
  showNotification(quest.notifications.delivered);
  saveProgress();
}
function updateQuestStatus(questId, status) {
  updateQuestStatusState(questLog, questId, status);
  updateQuestList();
}

function updateQuestList() {
  const visibleQuestLog = questLog.map((quest) => ({
    ...quest,
    canAbandon: questStates[quest.id] !== "delivered",
  }));
  renderQuestList(questsList, visibleQuestLog, abandonQuest);
}

function abandonQuest(questId) {
  const abandoned = abandonQuestState({
    questId,
    questStates,
    questLog,
  });
  if (!abandoned) {
    return;
  }

  updateQuestList();
  showNotification("Квест покинут.");
  saveProgress();
}

function addItem(itemId, quantity = 1) {
  const item = content.items?.[itemId] || inventory[itemId] || {
    id: itemId,
    name: itemId,
  };
  addItemToInventory(inventory, item, quantity);
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
  const item = await getItemData(itemId);
  const purchase = createShopPurchase({
    playerStats,
    inventory,
    item,
    price,
  });
  if (!purchase.ok) {
    showNotification("Not enough Gold");
    return;
  }

  updatePlayerStatsUi();
  updateInventoryList();
  showNotification(`Получено: ${item.name}`);
  saveProgress();
  await renderShop();
}

function consumeItems(items) {
  consumeInventoryItems(inventory, items);
  updateInventoryList();
  saveProgress();
}

function hasItem(itemId, quantity = 1) {
  return inventoryHasItem(inventory, itemId, quantity);
}

function hasRequiredItems(items) {
  return inventoryHasRequiredItems(inventory, items);
}

function updateInventoryGrid() {
  renderInventoryGrid(invGrid, invGoldDisplay, inventory, playerStats, {
    onUseItem: useItem,
    onAssignItem: assignToHotbar,
  });
  updateHotbarUI();
}
// keep old name as alias:
function updateInventoryList() { updateInventoryGrid(); }

function assignToHotbar(itemId, slot) {
  hotbar[slot] = itemId || null;
  updateHotbarUI();
  showNotification(`${getItemIcon(inventory[itemId])} назначено на [${slot}]`);
  saveProgress();
}

function updateHotbarUI() {
  renderHotbar(hotbarEl, hotbar, inventory);
}

function useHotbarSlot(slot) {
  const itemId = hotbar[slot];
  if (!itemId) { showNotification(`Слот ${slot} пуст`); return; }
  if (!inventory[itemId]) {
    // Предмет закончился — очищаем слот
    hotbar[slot] = null;
    updateHotbarUI();
    showNotification(`Слот ${slot}: предмет закончился`);
    return;
  }
  useItem(itemId);
}

function useItem(itemId) {
  const item = inventory[itemId];
  if (!item) return;
  if (item.effect === "restoreHp") {
    const amount = item.value === -1 ? playerStats.maxHp : item.value;
    const healed = Math.min(amount, playerStats.maxHp - playerStats.hp);
    if (healed <= 0) { showNotification("HP уже максимальный."); return; }
    playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + amount);
    removeItemFromInventory(inventory, itemId, 1);
    updatePlayerStatsUi();
    updateInventoryGrid();
    showNotification(`+${healed} HP`);
    saveProgress();
  } else if (item.effect === "restoreMp") {
    const amount = item.value === -1 ? playerStats.maxMp : item.value;
    const restored = Math.min(amount, playerStats.maxMp - playerStats.mp);
    if (restored <= 0) { showNotification("MP уже максимальный."); return; }
    playerStats.mp = Math.min(playerStats.maxMp, playerStats.mp + amount);
    removeItemFromInventory(inventory, itemId, 1);
    updatePlayerStatsUi();
    updateInventoryGrid();
    showNotification(`+${restored} MP`);
    saveProgress();
  }
}

function handleHealInteraction(obj) {
  const amount = obj.healAmount === -1 ? playerStats.maxHp : (obj.healAmount || playerStats.maxHp);
  if (playerStats.hp >= playerStats.maxHp) {
    showNotification("Ты полностью здоров.");
    return;
  }
  playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + amount);
  updatePlayerStatsUi();
  saveProgress();
  showNotification("❤️ Здоровье восстановлено!");
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
  checkQuestConditions({
    quests: content.quests,
    questStates,
    player: cat,
    inventory,
    isPointInArea,
  }).forEach((questId) => completeQuest(questId));
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
  return findNearbyLocationExit(content.location, cat, INTERACT_RADIUS);
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

function findClosestOpenPoint(startX, startY) {
  const tile = findClosestRoad(
    Math.max(1, Math.floor(startX / TILE_SIZE)),
    Math.max(1, Math.floor(startY / TILE_SIZE))
  );
  return {
    x: tile.x * TILE_SIZE + TILE_SIZE / 2,
    y: tile.y * TILE_SIZE + TILE_SIZE / 2,
  };
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
      object.baseImage = object.image;
      if (object.activeSprite) {
        object.activeImage = await loadImage(withArtVersion(object.activeSprite));
      }
      if (object.lockedSprite) {
        object.lockedImage = await loadImage(withArtVersion(object.lockedSprite));
      }
    } catch (error) {
      console.warn(`Failed to load object sprite: ${object.sprite}`, error);
    }
  }));

  return locationObjects;
}

function applyEchoMazeRuntimeState() {
  if (content?.location?.id !== ECHO_MAZE_LOCATION_ID) {
    return;
  }

  objects.forEach((object) => {
    if (object.type === "rune") {
      object.isActive = echoMazeState.solved || echoMazeState.activatedRunes.includes(object.orderKey);
      if (object.isActive && object.activeImage) {
        object.image = object.activeImage;
      } else if (!object.isActive && object.baseImage) {
        object.image = object.baseImage;
      }
    }

    if (object.id === "portal_echo_maze_exit") {
      object.locked = !echoMazeState.exitPortalUnlocked;
      if (object.locked && object.lockedImage) {
        object.image = object.lockedImage;
      } else if (!object.locked && object.activeImage) {
        object.image = object.activeImage;
      }
    }
  });
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

  const result = processRespawnQueue({
    queue: mobRespawns,
    mobs,
    player: cat,
    currentLocationId,
    spawnMob,
    onError: (error) => {
      console.error(error);
    },
  });
  mobRespawns = result.queue;
  mobs = result.mobs;
  gameState.mobRespawns = mobRespawns;
  gameState.mobs = mobs;
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
  return findNearestInteraction({
    player: cat,
    npcs,
    objects,
    radius: INTERACT_RADIUS,
  });
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

  updateEchoMazeTimerUi();

  if (inDialog || isPuzzleOpen() || isSnakeOpen() || isTankOpen() || isTetrisOpen() || isTutorialOpen() || isMiniGameOpen()) {
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

  updatePlayerAttackAnimation();

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

  drawPlayerSprite(ctx, cat, playerFrames);

  const activeQuest = Object.values(content.quests).find(
    (quest) => questStates[quest.id] === "active" &&
      (!quest.targetLocation || quest.targetLocation === content.location.id)
  );
  if (activeQuest) {
    drawPulsingHighlight(activeQuest);
  }

  drawExitMarkers();
  drawObjectMarkers();
  drawPortalLabels();
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
    objects,
    exits: content.location.exits || [],
  });
  updateControlLegend(getControlLegendContext());
}

function updatePlayerAttackAnimation() {
  if (!cat.attacking) {
    return;
  }

  cat.attackTicks = Math.max(0, cat.attackTicks - 1);
  const elapsed = PLAYER_ATTACK_TICKS - cat.attackTicks;
  const attackFrames = playerFrames.attack?.[cat.direction] || [];
  cat.attackFrame = Math.max(0, Math.min(
    Math.max(0, attackFrames.length - 1),
    Math.floor(elapsed / PLAYER_ATTACK_FRAME_TICKS)
  ));

  if (cat.attackTicks === 0) {
    cat.attacking = false;
    cat.attackFrame = 0;
  }
}

function isPlayerRunning() {
  return isRunning(keys);
}

function getPlayerMoveSpeed() {
  return getMoveSpeed(cat.speed, keys, PLAYER_RUN_MULTIPLIER);
}

function getCurrentMoveVector() {
  return getMoveVector({
    keys,
    aliases: KEY_ALIASES,
    pressedDirections,
    fallbackDirection: cat.direction,
  });
}

function getControlLegendContext() {
  const interactable = !inDialog ? findNearestInteractable() : null;
  const nearbyPortal = interactable?.type === "object" && isPortalObject(interactable.entity);
  const nearbyRune = interactable?.type === "object" && isRuneObject(interactable.entity);
  return {
    isGameActive: Boolean(currentUser && cat),
    isDialogOpen: inDialog,
    nearbyNPC: interactable?.type === "npc",
    nearbyPortal,
    nearbyLockedPortal: nearbyPortal && Boolean(interactable.entity.locked),
    nearbyMiniGame: nearbyPortal && Boolean(interactable.entity.targetMode) && !interactable.entity.locked,
    nearbyRune,
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
  return canTurnInQuestToNpcSystem({
    npc,
    quests: content.quests,
    questStates,
    inventory,
  });
}

const PORTAL_LABELS = {
  puzzle:  "🪞 Пазл",
  snake:   "🐍 Змейка",
  tank:    "🎯 Танки",
  tetris:  "🧩 Тетрис",
};
const PORTAL_ID_LABELS = {
  portal_echo_maze:          "🔮 Эхо-лабиринт",
  portal_battle_arena:       "🌀 Долина II",
  portal_back_to_city:       "🏙️ В город",
  portal_w2_back:            "⬅️ Долина I",
  portal_echo_maze_entrance: "🚪 Выйти",
};

const MODE_LABELS = {
  tic_tac_toe: "✖️ Логика",
  blackjack:   "🃏 Блэкджек",
  poker_lite:  "♠️ Покер",
  chess:       "♟️ Стратегия",
  minesweeper: "💣 Сапёр",
  sokoban:     "📦 Головоломки",
  tron_duel:   "⚡ Кибер",
  dice_combo:  "🎲 Удача",
};

function getPortalLabel(object) {
  if (object.targetMode && MODE_LABELS[object.targetMode]) return MODE_LABELS[object.targetMode];
  return PORTAL_LABELS[object.actionType] || PORTAL_ID_LABELS[object.id] || null;
}

function drawPortalLabels() {
  objects.forEach((object) => {
    const label = getPortalLabel(object);
    if (!label) return;

    const marker = object.marker || object.position;
    const x = marker.x;
    const y = marker.y - 58; // над ромбиком

    ctx.save();
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";

    // Фон-pill (без roundRect — совместимость)
    const tw = ctx.measureText(label).width;
    const pw = tw + 10;
    const ph = 16;
    const px = x - pw / 2;
    const py = y - ph + 3;
    const r  = 4;

    ctx.fillStyle = "rgba(14, 6, 32, 0.85)";
    ctx.strokeStyle = "rgba(160, 100, 255, 0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + pw - r, py);
    ctx.arcTo(px + pw, py, px + pw, py + r, r);
    ctx.lineTo(px + pw, py + ph - r);
    ctx.arcTo(px + pw, py + ph, px + pw - r, py + ph, r);
    ctx.lineTo(px + r, py + ph);
    ctx.arcTo(px, py + ph, px, py + ph - r, r);
    ctx.lineTo(px, py + r);
    ctx.arcTo(px, py, px + r, py, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ddc8ff";
    ctx.fillText(label, x, y);
    ctx.restore();
  });
}

function drawObjects() {
  drawSpriteObjects(ctx, objects);
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
