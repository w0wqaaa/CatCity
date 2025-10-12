from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import json
import os
import re
from tools.create_collision_map import generate_collision_map

# -----------------------------
# Конфигурация
# -----------------------------
tile_size = 32
collision_path = os.path.join("js", "collisionMap.js")
background_path = os.path.join("sprites", "tiles", "background.png")

# -----------------------------
# Проверка и генерация карты
# -----------------------------
if not os.path.exists(collision_path):
    print("⚙️  Карта коллизий не найдена, создаю новую...")
    generate_collision_map(background_path, collision_path)

# -----------------------------
# Загрузка и очистка collisionMap.js
# -----------------------------
def load_collision_map(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    match = re.search(r"export const collisionMap\s*=\s*(\[.*\]);", content, re.S)
    if not match:
        raise ValueError("⚠️ Не удалось найти массив collisionMap в JS-файле.")

    json_like = match.group(1)
    json_like = re.sub(r",\s*]", "]", json_like)
    json_like = re.sub(r",\s*\]", "]", json_like)
    json_like = re.sub(r",\s*\n\s*\]", "]", json_like)

    try:
        return np.array(json.loads(json_like))
    except json.JSONDecodeError:
        print("❌ Ошибка парсинга карты, пересоздаю...")
        generate_collision_map(background_path, collision_path)
        return load_collision_map(path)

collisionMap = load_collision_map(collision_path)
rows, cols = collisionMap.shape
print(f"✅ Загружена карта коллизий: {cols}x{rows} тайлов")

# -----------------------------
# Определяем точку спауна кота
# -----------------------------
def find_spawn_point_center():
    """Находит дорогу, ближайшую к центру карты."""
    road_positions = [(c, r) for r in range(rows) for c in range(cols) if collisionMap[r, c] == 0]
    if not road_positions:
        print("⚠️ Не найдено проходимых зон! Кот останется на (0,0).")
        return {"x": 0, "y": 0, "dir": "front", "speed": 3}

    center_x, center_y = cols // 2, rows // 2
    closest = min(road_positions, key=lambda pos: (pos[0]-center_x)**2 + (pos[1]-center_y)**2)
    c, r = closest
    x = c * tile_size + tile_size // 2
    y = r * tile_size + tile_size // 2
    print(f"🐾 Кот стартует на ({x}, {y}) — центр дороги.")
    return {"x": x, "y": y, "dir": "front", "speed": 3}

cat = find_spawn_point_center()

# -----------------------------
# Flask-сервер
# -----------------------------
app = Flask(__name__)
CORS(app)

def can_move(new_x, new_y):
    """Проверка столкновений по тайлам."""
    col = int(new_x // tile_size)
    row = int(new_y // tile_size)
    if row < 0 or row >= rows or col < 0 or col >= cols:
        return False
    return collisionMap[row, col] == 0

@app.route("/state")
def state():
    """Возвращает текущее состояние кота."""
    return jsonify(cat)

@app.route("/update", methods=["POST"])
def update():
    """Обрабатывает клавиши от клиента и двигает кота."""
    keys = request.json.get("keys", {})
    dx = dy = 0

    if keys.get("ArrowUp"):    dy -= cat["speed"]; cat["dir"] = "back"
    if keys.get("ArrowDown"):  dy += cat["speed"]; cat["dir"] = "front"
    if keys.get("ArrowLeft"):  dx -= cat["speed"]; cat["dir"] = "left"
    if keys.get("ArrowRight"): dx += cat["speed"]; cat["dir"] = "right"

    new_x = cat["x"] + dx
    new_y = cat["y"] + dy

    if can_move(new_x, cat["y"]): cat["x"] = new_x
    if can_move(cat["x"], new_y): cat["y"] = new_y

    return jsonify(cat)

# -----------------------------
# Запуск сервера
# -----------------------------
if __name__ == "__main__":
    print("🐾 CatCity сервер запущен на http://localhost:5001")
    app.run(host="0.0.0.0", port=5001)
