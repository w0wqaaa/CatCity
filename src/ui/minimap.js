const MINIMAP_SIZE = 180;
const MINIMAP_PADDING = 8;

let canvas;
let ctx;
let enabled = true;

export function initMinimap() {
  if (canvas) {
    return canvas;
  }

  canvas = document.createElement("canvas");
  canvas.id = "minimap";
  canvas.width = MINIMAP_SIZE;
  canvas.height = MINIMAP_SIZE;
  canvas.style.position = "fixed";
  canvas.style.right = "16px";
  canvas.style.top = "16px";
  canvas.style.width = `${MINIMAP_SIZE}px`;
  canvas.style.height = `${MINIMAP_SIZE}px`;
  canvas.style.zIndex = "11";
  canvas.style.pointerEvents = "none";
  canvas.style.imageRendering = "pixelated";
  canvas.style.display = "none";
  document.body.appendChild(canvas);

  ctx = canvas.getContext("2d");
  return canvas;
}

export function updateMinimap(state = null) {
  if (!canvas || !ctx) {
    initMinimap();
  }

  if (!enabled || !state?.player) {
    canvas.style.display = "none";
    return;
  }

  canvas.style.display = "block";
  const {
    collisionMap,
    tileSize = 32,
    player,
    npcs = [],
    mobs = [],
    objects = [],
    exits = [],
  } = state;

  const rows = collisionMap?.length || 0;
  const cols = collisionMap?.[0]?.length || 0;
  const mapWidth = cols ? cols * tileSize : MINIMAP_SIZE;
  const mapHeight = rows ? rows * tileSize : MINIMAP_SIZE;
  const viewSize = MINIMAP_SIZE - MINIMAP_PADDING * 2;
  const scale = Math.min(viewSize / mapWidth, viewSize / mapHeight);
  const offsetX = MINIMAP_PADDING + (viewSize - mapWidth * scale) / 2;
  const offsetY = MINIMAP_PADDING + (viewSize - mapHeight * scale) / 2;

  clearMinimap();
  drawMapBounds(offsetX, offsetY, mapWidth, mapHeight, scale);
  drawCollisionMap(collisionMap, tileSize, offsetX, offsetY, scale);
  exits.forEach((exit) => drawArea(exit.area, offsetX, offsetY, scale, "#54d66a"));
  objects
    .filter((object) => object.type === "portal")
    .forEach((portal) => {
      const color = portal.locked ? "#b86cff" : "#65f4d0";
      drawPoint(portal.position.x, portal.position.y, offsetX, offsetY, scale, color, 3.2);
    });
  mobs.forEach((mob) => drawPoint(mob.x, mob.y, offsetX, offsetY, scale, "#ff5858", 2.6));
  npcs.forEach((npc) => drawPoint(npc.x, npc.y, offsetX, offsetY, scale, "#ffd85a", 2.8));
  drawPoint(player.x, player.y, offsetX, offsetY, scale, "#79c6ff", 4);
}

export function toggleMinimap() {
  enabled = !enabled;
  if (!enabled && canvas) {
    canvas.style.display = "none";
  }
  return enabled;
}

export function isMinimapEnabled() {
  return enabled;
}

function clearMinimap() {
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.fillStyle = "rgba(8, 10, 12, 0.82)";
  ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, MINIMAP_SIZE - 2, MINIMAP_SIZE - 2);
}

function drawMapBounds(offsetX, offsetY, mapWidth, mapHeight, scale) {
  ctx.fillStyle = "rgba(69, 117, 48, 0.7)";
  ctx.fillRect(offsetX, offsetY, mapWidth * scale, mapHeight * scale);
}

function drawCollisionMap(collisionMap, tileSize, offsetX, offsetY, scale) {
  if (!collisionMap?.length) {
    return;
  }

  ctx.fillStyle = "rgba(120, 126, 128, 0.72)";
  collisionMap.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 0) {
        return;
      }

      ctx.fillRect(
        offsetX + x * tileSize * scale,
        offsetY + y * tileSize * scale,
        Math.max(1, tileSize * scale),
        Math.max(1, tileSize * scale)
      );
    });
  });
}

function drawArea(area, offsetX, offsetY, scale, color) {
  if (!area) {
    return;
  }

  ctx.fillStyle = color;
  ctx.fillRect(
    offsetX + area.x * scale,
    offsetY + area.y * scale,
    Math.max(3, area.width * scale),
    Math.max(3, area.height * scale)
  );
}

function drawPoint(x, y, offsetX, offsetY, scale, color, radius) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(offsetX + x * scale, offsetY + y * scale, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.65)";
  ctx.lineWidth = 1;
  ctx.stroke();
}
