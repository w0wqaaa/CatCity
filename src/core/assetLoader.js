import { ASSET_PATHS } from "../config/gameConfig.js?v=login-fix-1";

const imageCache = new Map();

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

export async function loadPlayerFrames() {
  const loadFrames = async (prefix) => {
    const frames = [];
    for (let i = 1; i <= 3; i++) {
      frames.push(await loadImage(`${prefix}_${i}.png`));
    }
    return frames;
  };

  return {
    down: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_down`),
    up: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_up`),
    right: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_right`),
    left: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_left`),
  };
}

export async function loadMobFrames(basePath, frameCount = 10) {
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
