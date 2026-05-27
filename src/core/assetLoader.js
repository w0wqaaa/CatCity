import { ASSET_PATHS } from "../config/gameConfig.js?v=login-fix-1";

const imageCache = new Map();
const DIRECTIONS = ["down", "up", "left", "right"];
const FRAME_SIZE = 32;
const SPRITESHEET_VERSION = "attack-anim-1";

export async function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

  imageCache.set(src, image);
  return image;
}

export async function loadPlayerFrames(character = "boy") {
  const walkPrefix = character === "girl"
    ? "assets/characters/player_girl/cat_girl_walk"
    : ASSET_PATHS.characters.player.framePrefix;
  const attackPrefix = character === "girl"
    ? "assets/characters/player_girl/cat_girl_attack"
    : "assets/characters/player/cat_attack";
  const loadFrames = async (prefix, count) => {
    const frames = [];
    for (let i = 1; i <= count; i++) {
      frames.push(await loadImage(`${prefix}_${i}.png?v=${SPRITESHEET_VERSION}`));
    }
    return frames;
  };

  const walk = {
    down: await loadFrames(`${walkPrefix}_down`, 3),
    up: await loadFrames(`${walkPrefix}_up`, 3),
    right: await loadFrames(`${walkPrefix}_right`, 3),
    left: await loadFrames(`${walkPrefix}_left`, 3),
  };
  const attack = {
    down: await loadFrames(`${attackPrefix}_down`, 4),
    up: await loadFrames(`${attackPrefix}_up`, 4),
    right: await loadFrames(`${attackPrefix}_right`, 4),
    left: await loadFrames(`${attackPrefix}_left`, 4),
  };

  return {
    walk,
    attack,
    ...walk,
  };
}

async function loadDirectionalSpritesheet(src, frameCount) {
  const image = await loadImage(`${src}?v=${SPRITESHEET_VERSION}`);
  const frames = {};

  DIRECTIONS.forEach((direction, row) => {
    frames[direction] = [];
    for (let frame = 0; frame < frameCount; frame++) {
      frames[direction].push({
        image,
        sx: frame * FRAME_SIZE,
        sy: row * FRAME_SIZE,
        sw: FRAME_SIZE,
        sh: FRAME_SIZE,
      });
    }
  });

  return frames;
}

export async function loadNpcFrames(character) {
  const basePath = character.spriteSheetBase || `assets/npcs/${character.id}`;
  const name = character.spriteSheetName || character.id;

  return {
    idle: await loadDirectionalSpritesheet(`${basePath}/${name}_idle.png`, character.idleFrameCount || 2),
    walk: await loadDirectionalSpritesheet(`${basePath}/${name}_walk.png`, character.walkFrameCount || 4),
    attack: await loadDirectionalSpritesheet(`${basePath}/${name}_attack.png`, character.attackFrameCount || 4),
  };
}

async function loadLegacyMobFrames(basePath, frameCount = 10) {
  const loadFrames = async (state) => {
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
      frames.push(await loadImage(`${basePath}/${state}/${String(i).padStart(3, "0")}.png`));
    }
    return frames;
  };

  return {
    idle: await loadFrames("idle"),
    walk: await loadFrames("walk"),
  };
}

export async function loadMobFrames(mobData, frameCount = 10) {
  const basePath = typeof mobData === "string" ? mobData : mobData.spriteBase;
  const name = typeof mobData === "string" ? basePath.split("/").pop() : mobData.spriteSheetName || mobData.type || mobData.id;
  const count = typeof mobData === "string" ? frameCount : mobData.frameCount || frameCount;

  try {
    return {
      idle: await loadDirectionalSpritesheet(`${basePath}/${name}_idle.png`, mobData.idleFrameCount || 2),
      walk: await loadDirectionalSpritesheet(`${basePath}/${name}_walk.png`, mobData.walkFrameCount || 4),
      attack: await loadDirectionalSpritesheet(`${basePath}/${name}_attack.png`, mobData.attackFrameCount || 4),
    };
  } catch {
    return loadLegacyMobFrames(basePath, count);
  }
}
