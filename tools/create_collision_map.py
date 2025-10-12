from PIL import Image
import json

input_file = "sprites/tiles/background.png"
output_file = "collision_map.json"
road_color = (124, 115, 89)  # цвет дороги (#7C7359)

TILE_SIZE = 32

def is_road(pixel):
    r, g, b = pixel[:3]
    return abs(r - road_color[0]) < 15 and abs(g - road_color[1]) < 15 and abs(b - road_color[2]) < 15

def generate_collision_map():
    img = Image.open(input_file).convert("RGB")
    width, height = img.size
    tiles_x = width // TILE_SIZE
    tiles_y = height // TILE_SIZE

    collision = [[0 for _ in range(tiles_x)] for _ in range(tiles_y)]

    for y in range(tiles_y):
        for x in range(tiles_x):
            pixels = [
                img.getpixel((x * TILE_SIZE + dx, y * TILE_SIZE + dy))
                for dy in range(TILE_SIZE)
                for dx in range(TILE_SIZE)
            ]
            if sum(is_road(p) for p in pixels) > (TILE_SIZE * TILE_SIZE * 0.3):
                collision[y][x] = 1  # можно ходить
            else:
                collision[y][x] = 0  # стена / трава / туман

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(collision, f)

    print(f"✅ Карта коллизий сохранена: {output_file}")

if __name__ == "__main__":
    generate_collision_map()
