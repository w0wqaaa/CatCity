import { ASSET_PATHS } from "../config/gameConfig.js";

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
