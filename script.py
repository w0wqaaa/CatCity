import os
import shutil
import json
from pathlib import Path

BASE = Path(__file__).parent.resolve()

# === пути ===
JS_DIR = BASE / "js"
ENGINE_DIR = JS_DIR / "engine"
DATA_DIR = JS_DIR / "data"
LOCATIONS_DIR = DATA_DIR / "locations"
NPCS_DIR = DATA_DIR / "npcs"
QUESTS_DIR = DATA_DIR / "quests"
DIALOGS_DIR = DATA_DIR / "dialogs"

# === вспомогательные ===
def safe_move(src, dest):
    if src.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            print(f"⚠️ {dest.name} уже существует, пропускаю.")
        else:
            shutil.move(str(src), str(dest))
            print(f"📦 Перемещено: {src.name} → {dest}")

def write_file(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip(), encoding="utf-8")
    print(f"🧩 Создан: {path.relative_to(BASE)}")

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"🗂 JSON создан: {path.relative_to(BASE)}")

# === создаем новую структуру ===
def setup_structure():
    for d in [ENGINE_DIR, LOCATIONS_DIR, NPCS_DIR, QUESTS_DIR, DIALOGS_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    print("📁 Структура каталогов создана.")

# === переносим существующие файлы ===
def move_existing_files():
    # основные
    safe_move(BASE / "mapLogic.js", JS_DIR / "engine" / "mapLogic.js")
    safe_move(BASE / "mapLoader.js", JS_DIR / "engine" / "mapLoader.js")
    safe_move(BASE / "collisionMap.js", JS_DIR / "engine" / "collisionMap.js")

    # index и style оставляем на месте
    print("✅ Основные файлы перенесены.")

# === создаем недостающие движковые файлы ===
def create_engine_files():
    files = {
        ENGINE_DIR / "questManager.js": """// questManager.js
let activeQuest = null;
export function startQuest(q){activeQuest=q;console.log("Start quest:",q.name);}
export function getActiveQuest(){return activeQuest;}
""",
        ENGINE_DIR / "dialogManager.js": """// dialogManager.js
import { startQuest } from "./questManager.js";
export async function showDialog(id){
  const res=await fetch(`js/data/dialogs/${id}.json`);
  const d=await res.json();
  for(const line of d.lines){console.log(line);}
  if(d.after?.startQuest){startQuest(d.after.startQuest);}
}
""",
        ENGINE_DIR / "mapManager.js": """// mapManager.js
import { loadLocation } from "../engine/utils.js";
export async function initMap(id){return await loadLocation(id);}
""",
        ENGINE_DIR / "utils.js": """// utils.js
export function distance(a,b){const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(dx*dx+dy*dy);}
export async function loadLocation(id){
  const res=await fetch(`js/data/locations/${id}.json`);
  return await res.json();
}
""",
        JS_DIR / "main.js": """// main.js
import { initMap } from "./engine/mapManager.js";
import { showDialog } from "./engine/dialogManager.js";
import { startQuest } from "./engine/questManager.js";

(async ()=>{
  console.log("🐾 Cat City Engine запускается...");
  const map=await initMap("city");
  console.log("Локация загружена:", map.name);
})();
"""
    }
    for path, content in files.items():
        if not path.exists():
            write_file(path, content)

# === создаем тестовые JSON для структуры ===
def create_data_files():
    if not (LOCATIONS_DIR / "city.json").exists():
        write_json(LOCATIONS_DIR / "city.json", {
            "id": "city",
            "name": "Cat City — Центральная площадь",
            "background": "sprites/tiles/background.png",
            "collisionMap": "city_collision.js",
            "npcs": ["guard"],
            "entryPoints": {"north": "forest"}
        })
    if not (NPCS_DIR / "guard.json").exists():
        write_json(NPCS_DIR / "guard.json", {
            "id": "guard",
            "sprite": "sprites/characters/guard/cat_guard.png",
            "position": {"x": 500, "y": 900},
            "dialog": "guard_intro",
            "quests": ["north_street"]
        })
    if not (QUESTS_DIR / "north_street.json").exists():
        write_json(QUESTS_DIR / "north_street.json", {
            "id": "north_street",
            "name": "Осмотреть северную улицу",
            "giver": "guard",
            "targetArea": {"x": 700, "y": 150, "radius": 100}
        })
    if not (DIALOGS_DIR / "guard_intro.json").exists():
        write_json(DIALOGS_DIR / "guard_intro.json", {
            "lines": [
                "Страж: Привет, путник!",
                "Страж: У нас проблемы на северной улице.",
                "Страж: Помоги разобраться, если сможешь."
            ],
            "after": {"startQuest": "north_street"}
        })

# === копируем ассеты, если есть ===
def ensure_sprites():
    (BASE / "sprites" / "characters" / "guard").mkdir(parents=True, exist_ok=True)
    print("🎨 Проверены каталоги спрайтов.")

# === запуск ===
def main():
    print("🐾 Инициализация Cat City Engine 2.0 ...")
    setup_structure()
    move_existing_files()
    create_engine_files()
    create_data_files()
    ensure_sprites()
    print("\n✅ Всё готово! Проект Cat City успешно реорганизован.\n"
          "Можно открыть index.html и протестировать игру.")

if __name__ == "__main__":
    main()
