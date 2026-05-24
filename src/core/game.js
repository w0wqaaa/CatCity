import { loadImage, loadPlayerFrames } from "./assetLoader.js";
import { loadGameContent } from "./dataLoader.js";
import { CANVAS, INTERACT_RADIUS, TILE_SIZE } from "../config/gameConfig.js";
import { NPCGuard } from "../entities/NPCGuard.js";

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
let activeNpc = null;
let keys = {};
let questLog = [];
let questStates = {};
let inDialog = false;
let dialogIndex = 0;
let dialogLines = [];
let dialogAction = null;
let notificationTimeout = null;
let highlightPulse = 0;
let showHint = false;
let hintPulse = 0;
let isTransitioning = false;

const questsButton = document.getElementById("questsButton");
const questsPanel = document.getElementById("questsPanel");
const questsList = document.getElementById("questsList");
const closeQuests = document.getElementById("closeQuests");
const dialogBox = document.getElementById("dialogBox");
const dialogText = document.getElementById("dialogText");
const nextDialog = document.getElementById("nextDialog");

const notification = document.createElement("div");
notification.id = "notification";
notification.classList.add("hidden");
document.body.appendChild(notification);

async function startGame() {
  playerFrames = await loadPlayerFrames();
  await switchLocation("city");

  window.addEventListener("keydown", handleKey);
  window.addEventListener("keyup", (e) => (keys[e.key] = false));
  nextDialog.addEventListener("click", nextDialogLine);

  questsButton.addEventListener("click", () => {
    questsPanel.classList.toggle("visible");
    updateQuestList();
  });

  if (closeQuests) {
    closeQuests.addEventListener("click", () => {
      questsPanel.classList.remove("visible");
    });
  }

  loop();
}

async function switchLocation(locationId, spawnOverride = null) {
  isTransitioning = true;
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
  npcs = createNpcs();
  showNotification(content.location.name);
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

function handleKey(e) {
  keys[e.key] = true;
  const isE = e.code === "KeyE" || e.key === "e" || e.key === "E";
  if (isE && !inDialog) {
    tryTalk();
  }
}

function tryTalk() {
  const npc = findNearestInteractableNpc();
  if (npc) {
    startDialog(npc);
  }
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
}

function startQuest(questId) {
  if (questStates[questId]) {
    return;
  }

  const quest = content.quests[questId];
  questStates[questId] = "active";
  questLog.push({
    id: quest.id,
    name: quest.name,
    status: quest.statusLabels.active,
  });
  updateQuestList();
  showNotification(quest.notifications.started);
}

function completeQuest(questId) {
  if (questStates[questId] !== "active") {
    return;
  }

  const quest = content.quests[questId];
  questStates[questId] = "completed";
  updateQuestStatus(questId, quest.statusLabels.completed);
  showNotification(quest.notifications.completed);
}

function finishQuest(questId) {
  if (questStates[questId] !== "completed") {
    return;
  }

  const quest = content.quests[questId];
  questStates[questId] = "delivered";
  updateQuestStatus(questId, quest.statusLabels.delivered);
  showNotification(quest.notifications.delivered);
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
  return content.location.characters.map((characterId) => {
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
    return npc;
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

function findNearestInteractableNpc() {
  return npcs.find((npc) => {
    const dist = Math.hypot(cat.x - npc.x, cat.y - npc.y);
    return dist <= INTERACT_RADIUS;
  });
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
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
  } else {
    cat.frame = 0;
  }

  npcs.forEach((npc) => {
    if (!npc.isFrozen) {
      npc.update();
    }
  });

  showHint = Boolean(findNearestInteractableNpc()) && !inDialog;

  checkQuestProgress();
  checkLocationExits();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(mapBackground, 0, 0);
  npcs.forEach((npc) => npc.draw(ctx));

  const frameImg = playerFrames[cat.direction][cat.frame];
  const w = frameImg.width * cat.scale;
  const h = frameImg.height * cat.scale;
  ctx.drawImage(frameImg, cat.x - w / 2, cat.y - h / 2, w, h);

  const activeQuest = Object.values(content.quests).find(
    (quest) => questStates[quest.id] === "active"
  );
  if (activeQuest) {
    drawPulsingHighlight(activeQuest);
  }

  if (showHint) {
    drawHintAboveGuard();
  }
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

function drawHintAboveGuard() {
  hintPulse += 0.08;
  const opacity = 0.5 + Math.sin(hintPulse) * 0.5;

  ctx.save();
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.lineWidth = 3;

  const npc = findNearestInteractableNpc();
  if (!npc) {
    ctx.restore();
    return;
  }

  const textX = npc.x + npc.width / 2;
  const textY = npc.y - 15;
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
