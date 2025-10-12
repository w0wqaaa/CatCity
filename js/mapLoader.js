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
      frames.push(await loadImage(`sprites/characters/${prefix}_${i}.png`));
    }
    return frames;
  };

  const assets = {
    // 👉 если фон в characters/
    background: await loadImage("sprites/characters/background.png"),

    // если фон в tiles/, то поменяй строку выше на:
    // background: await loadImage("sprites/tiles/background.png"),

    down: await loadFrames("cat_walk_down"),
    up: await loadFrames("cat_walk_up"),
    right: await loadFrames("cat_walk_right"),
    left: await loadFrames("cat_walk_left"),
  };

  console.log("✅ Все ассеты загружены:", Object.keys(assets));
  return assets;
}
