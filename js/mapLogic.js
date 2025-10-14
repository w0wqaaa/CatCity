import { loadAssets } from "./mapLoader.js";
import { collisionMap } from "./collisionMap.js";
import { NPCGuard } from "./npcGuard.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 1536;
canvas.height = 1024;

const TILE_SIZE = 8;
const INTERACT_RADIUS = 110;

let assets, cat, guard;
let keys = {};
let quests = [];
let inDialog = false;
let dialogIndex = 0;
let dialogLines = [];
let currentQuestStage = "none"; // none | active | completed | delivered
let notificationTimeout = null;
let highlightPulse = 0;
let showHint = false;
let hintPulse = 0;

// === UI ===
const questsButton = document.getElementById("questsButton");
const questsPanel  = document.getElementById("questsPanel");
const questsList   = document.getElementById("questsList");
const closeQuests  = document.getElementById("closeQuests");
const dialogBox    = document.getElementById("dialogBox");
const dialogText   = document.getElementById("dialogText");
const nextDialog   = document.getElementById("nextDialog");

// === уведомление ===
const notification = document.createElement("div");
notification.id = "notification";
notification.classList.add("hidden");
document.body.appendChild(notification);

// === запуск ===
async function startGame() {
  assets = await loadAssets();

  const centerTileX = Math.floor(collisionMap[0].length / 2);
  const centerTileY = Math.floor(collisionMap.length / 2);
  const playerTile = findClosestRoad(centerTileX, centerTileY);

  cat = {
    x: playerTile.x * TILE_SIZE + TILE_SIZE / 2,
    y: playerTile.y * TILE_SIZE + TILE_SIZE / 2,
    scale: 0.1,
    direction: "down",
    frame: 0,
    speed: 2,
    tick: 0,
    moving: false,
  };

  const biggestRoad = findLargestRoadCluster();
  const mid = biggestRoad[Math.floor(biggestRoad.length / 2)];

  guard = new NPCGuard(
    mid.x * TILE_SIZE,
    mid.y * TILE_SIZE,
    "sprites/characters/guard/cat_guard.png",
    TILE_SIZE,
    collisionMap,
    biggestRoad
  );

  // обработчики
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

// === клавиши и взаимодействие ===
function handleKey(e) {
  keys[e.key] = true;
  const isE = e.code === "KeyE" || e.key === "e" || e.key === "E";
  if (isE && !inDialog) tryTalk();
}

function tryTalk() {
  const dist = Math.hypot(cat.x - guard.x, cat.y - guard.y);
  if (dist <= INTERACT_RADIUS) startDialog();
}

function startDialog() {
  inDialog = true;
  guard.isFrozen = true;
  dialogBox.classList.remove("hidden");

  // диалоги по стадиям квеста
  if (currentQuestStage === "none") {
    dialogLines = [
      "Страж: Привет, путник!",
      "Страж: Наши дозорные заметили странности на северной улице.",
      "Страж: Помоги осмотреть её. Вернись, когда закончишь.",
    ];
  } else if (currentQuestStage === "active") {
    dialogLines = ["Страж: Осмотри северную улицу и возвращайся."];
  } else if (currentQuestStage === "completed") {
    dialogLines = [
      "Страж: Рад снова тебя видеть!",
      "Страж: Отличная работа. Город в безопасности!",
      "Страж: Вот твоя награда — уважение горожан.",
    ];
  } else if (currentQuestStage === "delivered") {
    dialogLines = ["Страж: Спасибо за помощь, герой."];
  }

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
  guard.isFrozen = false;

  if (currentQuestStage === "none") startQuest();
  else if (currentQuestStage === "completed") finishQuest();
}

// === квесты ===
function startQuest() {
  currentQuestStage = "active";
  quests.push({ id: "northStreet", name: "Осмотреть северную улицу", status: "Активен" });
  updateQuestList();
  showNotification("📜 Новый квест: Осмотреть северную улицу");
}

function completeQuest() {
  currentQuestStage = "completed";
  const quest = quests.find(q => q.id === "northStreet");
  if (quest) quest.status = "Выполнен (вернуться к стражу)";
  updateQuestList();
  showNotification("✅ Квест выполнен! Вернитесь к стражу");
}

function finishQuest() {
  currentQuestStage = "delivered";
  const quest = quests.find(q => q.id === "northStreet");
  if (quest) quest.status = "Завершён ✅";
  updateQuestList();
  showNotification("🎉 Квест завершён! Город благодарен тебе.");
}

function updateQuestList() {
  questsList.innerHTML = "";
  quests.forEach(q => {
    const li = document.createElement("li");
    li.textContent = `${q.name} — ${q.status}`;
    questsList.appendChild(li);
  });
}

// === уведомления ===
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

// === квест прогресс ===
function checkQuestProgress() {
  if (currentQuestStage === "active" && cat.y < 200) {
    completeQuest();
  }
}

// === карта ===
function findClosestRoad(startX, startY) {
  let best = { x: startX, y: startY };
  let bestDist = Infinity;
  for (let y = 0; y < collisionMap.length; y++) {
    for (let x = 0; x < collisionMap[y].length; x++) {
      if (collisionMap[y][x] === 0) {
        const dx = x - startX, dy = y - startY, dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = { x, y }; }
      }
    }
  }
  return best;
}

function findLargestRoadCluster() {
  const visited = new Set(), clusters = [];
  const rows = collisionMap.length, cols = collisionMap[0].length;
  const key = (x, y) => `${x},${y}`;
  function floodFill(sx, sy) {
    const queue = [{ x: sx, y: sy }], cluster = [];
    visited.add(key(sx, sy));
    while (queue.length) {
      const { x, y } = queue.shift();
      cluster.push({ x, y });
      for (const d of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]) {
        const nx = x + d.x, ny = y + d.y;
        if (nx>=0&&ny>=0&&nx<cols&&ny<rows&&collisionMap[ny][nx]===0&&!visited.has(key(nx,ny))) {
          visited.add(key(nx,ny));
          queue.push({ x:nx, y:ny });
        }
      }
    }
    return cluster;
  }
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++)
    if (collisionMap[y][x]===0&&!visited.has(key(x,y))) clusters.push(floodFill(x,y));
  clusters.sort((a,b)=>b.length-a.length);
  return clusters[0];
}

// === игровой цикл ===
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  if (inDialog) return;

  const prevX = cat.x, prevY = cat.y;
  cat.moving = false;

  if (keys["ArrowUp"]) { cat.y -= cat.speed; cat.direction = "up"; cat.moving = true; }
  else if (keys["ArrowDown"]) { cat.y += cat.speed; cat.direction = "down"; cat.moving = true; }
  else if (keys["ArrowLeft"]) { cat.x -= cat.speed; cat.direction = "left"; cat.moving = true; }
  else if (keys["ArrowRight"]) { cat.x += cat.speed; cat.direction = "right"; cat.moving = true; }

  if (checkCollision(cat.x, cat.y)) { cat.x = prevX; cat.y = prevY; }

  if (cat.moving) {
    cat.tick++;
    if (cat.tick % 10 === 0) cat.frame = (cat.frame + 1) % 3;
  } else cat.frame = 0;

  if (!guard.isFrozen) guard.update();

  // показать подсказку, если игрок рядом
  const dist = Math.hypot(cat.x - guard.x, cat.y - guard.y);
  showHint = dist <= INTERACT_RADIUS && !inDialog;

  checkQuestProgress();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(assets.background, 0, 0);
  guard.draw(ctx);

  const frameImg = assets[cat.direction][cat.frame];
  const w = frameImg.width * cat.scale, h = frameImg.height * cat.scale;
  ctx.drawImage(frameImg, cat.x - w / 2, cat.y - h / 2, w, h);

  // пульсирующая цель
  if (currentQuestStage === "active") drawPulsingHighlight();

  // подсказка E над стражем
  if (showHint) drawHintAboveGuard();
}

// === подсветка цели ===
function drawPulsingHighlight() {
  highlightPulse += 0.03;
  const alpha = 0.4 + Math.sin(highlightPulse) * 0.25;
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, 120, 0,
    canvas.width / 2, 120, 300
  );
  gradient.addColorStop(0, `rgba(255,255,180,${alpha})`);
  gradient.addColorStop(1, "rgba(255,255,180,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// === подсказка над NPC ===
function drawHintAboveGuard() {
  hintPulse += 0.08;
  const opacity = 0.5 + Math.sin(hintPulse) * 0.5;

  const text = "E";
  ctx.save();
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.lineWidth = 3;

  const textX = guard.x + guard.width / 2;
  const textY = guard.y - 15; // немного выше головы
  ctx.strokeText(text, textX, textY);
  ctx.fillText(text, textX, textY);
  ctx.restore();
}

// === столкновения ===
function checkCollision(x, y) {
  const offsetY = 10;
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor((y + offsetY) / TILE_SIZE);
  return collisionMap[tileY]?.[tileX] !== 0;
}

startGame();
