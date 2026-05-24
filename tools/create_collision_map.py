from pathlib import Path
import json

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "assets" / "maps" / "city" / "background.png"
DEFAULT_OUTPUT = ROOT / "src" / "maps" / "cityCollisionMap.js"

ROAD_COLOR = (124, 115, 89)
TILE_SIZE = 32


def is_road(pixel):
    r, g, b = pixel[:3]
    return (
        abs(r - ROAD_COLOR[0]) < 15
        and abs(g - ROAD_COLOR[1]) < 15
        and abs(b - ROAD_COLOR[2]) < 15
    )


def generate_collision_map(input_file=DEFAULT_INPUT, output_file=DEFAULT_OUTPUT):
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
            collision[y][x] = 1
            if sum(is_road(p) for p in pixels) > (TILE_SIZE * TILE_SIZE * 0.3):
                collision[y][x] = 0

    output_file = Path(output_file)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(
        f"export const collisionMap = {json.dumps(collision)};\n",
        encoding="utf-8",
    )

    print(f"Collision map saved: {output_file}")


if __name__ == "__main__":
    generate_collision_map()
