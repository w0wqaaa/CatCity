import { ASSET_PATHS } from "../config/gameConfig.js";

export async function loadAssets() {
  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  const loadFrames = async (prefix) => {
    const frames = [];
    for (let i = 1; i <= 3; i++) {
      frames.push(await loadImage(`${prefix}_${i}.png`));
    }
    return frames;
  };

  const assets = {
    // 👉 если фон в characters/
    background: await loadImage(ASSET_PATHS.maps.city.background),

    // если фон в tiles/, то поменяй строку выше на:
    // background: await loadImage("sprites/tiles/background.png"),

    down: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_down`),
    up: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_up`),
    right: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_right`),
    left: await loadFrames(`${ASSET_PATHS.characters.player.framePrefix}_left`),
  };

  console.log("✅ Все ассеты загружены:", Object.keys(assets));
  return assets;
}
