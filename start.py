import os, json

# === создаём структуру ===
folders = [
    "CatCity/js",
    "CatCity/sprites/characters",
    "CatCity/sprites/tiles"
]
for f in folders:
    os.makedirs(f, exist_ok=True)

# === HTML ===
index_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cat City</title>
  <style>
    html, body { margin:0; padding:0; overflow:hidden; background:#000; }
    canvas { display:block; margin:0 auto; image-rendering:pixelated; }
    #loading {
      color:#fff; font-family:monospace; text-align:center;
      position:absolute; top:50%; left:0; right:0;
      transform:translateY(-50%); font-size:18px;
    }
  </style>
</head>
<body>
  <div id="loading">Loading Cat City...</div>
  <canvas id="gameCanvas" width="1280" height="720"></canvas>
  <script type="module">
    import { loadScene } from './js/mapLoader.js';
    import { startGame } from './js/mapLogic.js';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    loadScene(ctx).then(scene => {
      document.getElementById('loading').remove();
      startGame(scene, canvas, ctx);
    }).catch(err => {
      document.getElementById('loading').innerText = 'Error: ' + err;
      console.error(err);
    });
  </script>
</body>
</html>
"""

# === JS: mapLoader.js ===
map_loader_js = """export async function loadScene(ctx) {
  const assets = {
    background: 'sprites/tiles/background.png',
    front: 'sprites/characters/cat_front.png',
    back: 'sprites/characters/cat_back.png',
    right: 'sprites/characters/cat_right.png',
    left: 'sprites/characters/cat_left.png'
  };

  const images = {};
  for (let [key, path] of Object.entries(assets)) {
    const img = new Image();
    img.src = path;
    await new Promise(resolve => {
      img.onload = resolve;
      img.onerror = () => { console.warn('⚠️ Could not load:', path); resolve(); };
    });
    images[key] = img;
  }

  console.log('✅ Assets loaded');
  return { images };
}
"""

# === JS: mapLogic.js ===
map_logic_js = """export function startGame(scene, canvas, ctx) {
  const { images } = scene;
  const cat = { x: 640, y: 360, speed: 3, dir: 'front' };
  const keys = {};
  const camera = { x: 0, y: 0 };

  window.addEventListener('keydown', e => keys[e.key] = true);
  window.addEventListener('keyup', e => keys[e.key] = false);

  function update() {
    if (keys['ArrowUp']) { cat.y -= cat.speed; cat.dir = 'back'; }
    if (keys['ArrowDown']) { cat.y += cat.speed; cat.dir = 'front'; }
    if (keys['ArrowLeft']) { cat.x -= cat.speed; cat.dir = 'left'; }
    if (keys['ArrowRight']) { cat.x += cat.speed; cat.dir = 'right'; }

    camera.x = cat.x - canvas.width / 2;
    camera.y = cat.y - canvas.height / 2;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images.background, -camera.x, -camera.y);
    const sprite = images[cat.dir];
    if (sprite)
      ctx.drawImage(sprite, cat.x - camera.x, cat.y - camera.y);
  }

  function loop() {
    update(); draw();
    requestAnimationFrame(loop);
  }

  loop();
}
"""

# === JSON: project.json ===
project_json = {
    "name": "Cat City Prototype",
    "version": "0.2",
    "entry": "index.html",
    "sprites": {
        "characters": ["cat_front.png", "cat_back.png", "cat_right.png", "cat_left.png"],
        "tiles": ["background.png"]
    }
}

# === создаём файлы ===
with open("CatCity/index.html", "w", encoding="utf-8") as f: f.write(index_html)
with open("CatCity/js/mapLoader.js", "w", encoding="utf-8") as f: f.write(map_loader_js)
with open("CatCity/js/mapLogic.js", "w", encoding="utf-8") as f: f.write(map_logic_js)
with open("CatCity/js/project.json", "w", encoding="utf-8") as f: json.dump(project_json, f, indent=2)

# === создаём заглушки для картинок ===
open("CatCity/sprites/tiles/background.png", "wb").close()
for name in ["front", "back", "right", "left"]:
    open(f"CatCity/sprites/characters/cat_{name}.png", "wb").close()

print("✅ CatCity base created!")
print("📂 Добавь свои PNG сюда:")
print("   CatCity/sprites/tiles/background.png")
print("   CatCity/sprites/characters/cat_front.png / cat_back.png / cat_right.png / cat_left.png")
print("💡 Потом запусти:")
print("   py -m http.server 8000")
print("   и открой http://localhost:8000/")
