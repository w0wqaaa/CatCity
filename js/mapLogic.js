import { loadAssets } from "./mapLoader.js";
import { collisionMap } from "./collisionMap.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = 1536;
canvas.height = 1024;

const TILE_SIZE = 8;
let assets, cat;
let keys = {};

// === Инициализация ===
async function startGame() {
  assets = await loadAssets();

  const centerTileX = Math.floor(collisionMap[0].length / 2);
  const centerTileY = Math.floor(collisionMap.length / 2);

  let startX = centerTileX;
  let startY = centerTileY;
  let bestDist = Infinity;

  for (let y = 0; y < collisionMap.length; y++) {
    for (let x = 0; x < collisionMap[y].length; x++) {
      if (collisionMap[y][x] === 0) {
        const dx = x - centerTileX;
        const dy = y - centerTileY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          startX = x;
          startY = y;
        }
      }
    }
  }

  cat = {
    x: startX * TILE_SIZE + TILE_SIZE / 2,
    y: startY * TILE_SIZE + TILE_SIZE / 2,
    scale: 0.1,
    direction: "down",
    frame: 0,
    speed: 2,
    tick: 0,
    moving: false,
  };

  window.addEventListener("keydown", (e) => (keys[e.key] = true));
  window.addEventListener("keyup", (e) => (keys[e.key] = false));

  console.log(`🐈 Котик появился на (${startX}, ${startY}) — центр дороги`);
  loop();
}

// === Игровой цикл ===
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// === Обновление ===
function update() {
  const prevX = cat.x;
  const prevY = cat.y;
  cat.moving = false;

  if (keys["ArrowUp"]) {
    cat.y -= cat.speed;
    cat.direction = "up";
    cat.moving = true;
  } else if (keys["ArrowDown"]) {
    cat.y += cat.speed;
    cat.direction = "down";
    cat.moving = true;
  } else if (keys["ArrowLeft"]) {
    cat.x -= cat.speed;
    cat.direction = "left";
    cat.moving = true;
  } else if (keys["ArrowRight"]) {
    cat.x += cat.speed;
    cat.direction = "right";
    cat.moving = true;
  }

  // Проверка коллизий
  if (checkCollision(cat.x, cat.y)) {
    cat.x = prevX;
    cat.y = prevY;
  }

  // Анимация
  if (cat.moving) {
    cat.tick++;
    if (cat.tick % 10 === 0) {
      cat.frame = (cat.frame + 1) % 3;
    }
  } else {
    cat.frame = 0;
  }
}

// === Проверка коллизии ===
function checkCollision(x, y) {
  const offsetY = 10;
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor((y + offsetY) / TILE_SIZE);
  return collisionMap[tileY]?.[tileX] !== 0;
}

// === Отрисовка ===
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(assets.background, 0, 0);

  const frameImg = assets[cat.direction][cat.frame];

  // Немного меняем масштаб при движении вниз
  let scale = cat.scale;
  if (cat.direction === "down") scale *= 0.9; // уменьшить на 10%

  const w = frameImg.width * scale;
  const h = frameImg.height * scale;
  ctx.drawImage(frameImg, cat.x - w / 2, cat.y - h / 2, w, h);
}

startGame();
