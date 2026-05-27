from __future__ import annotations

import json
import math
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "assets" / "maps" / "lost_portal_valley" / "background.png"
PORTAL_ROOT = ROOT / "assets" / "objects" / "portals"
COLLISION_PATH = ROOT / "src" / "maps" / "lostPortalValleyCollisionMap.js"

WIDTH = 1536
HEIGHT = 1024
TILE = 8
COLS = WIDTH // TILE
ROWS = HEIGHT // TILE

CENTER = (768, 512)
PADS = [
    (424, 288),
    (768, 224),
    (1112, 288),
    (424, 712),
    (1112, 712),
    (768, 760),
    (768, 900),
]


def main() -> None:
    MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
    PORTAL_ROOT.mkdir(parents=True, exist_ok=True)
    COLLISION_PATH.parent.mkdir(parents=True, exist_ok=True)

    collision = build_collision_map()
    draw_map().save(MAP_PATH)
    write_collision_map(collision)

    draw_portal_sprite("portal_blue_active.png", core=(75, 210, 255), aura=(120, 245, 255), locked=False)
    draw_portal_sprite("portal_green_active.png", core=(90, 235, 150), aura=(180, 255, 180), locked=False)
    draw_portal_sprite("portal_purple_locked.png", core=(145, 80, 225), aura=(210, 120, 255), locked=True)
    draw_portal_sprite("portal_red_locked.png", core=(225, 80, 90), aura=(255, 150, 120), locked=True)

    print(f"Map written: {MAP_PATH}")
    print(f"Collision map written: {COLLISION_PATH}")
    print(f"Portal sprites written: {PORTAL_ROOT}")


def draw_map() -> Image.Image:
    rng = Random(42)
    image = Image.new("RGB", (WIDTH, HEIGHT), (39, 75, 67))
    draw = ImageDraw.Draw(image)

    draw_grass_texture(draw, rng)
    draw_blocked_edges(draw)
    draw_roads(draw)
    draw_portal_pads(draw)
    draw_ruins(draw)
    draw_magic_stones(draw)
    draw_ground_symbols(draw)

    return image


def draw_grass_texture(draw: ImageDraw.ImageDraw, rng: Random) -> None:
    colors = [(35, 70, 61), (43, 83, 69), (49, 91, 72), (54, 82, 74)]
    for y in range(0, HEIGHT, 16):
        for x in range(0, WIDTH, 16):
            base = colors[(x // 16 + y // 16) % len(colors)]
            draw.rectangle((x, y, x + 15, y + 15), fill=base)

    for _ in range(1550):
        x = rng.randrange(24, WIDTH - 24, 4)
        y = rng.randrange(24, HEIGHT - 24, 4)
        color = rng.choice([(28, 58, 53), (63, 103, 72), (72, 113, 72), (59, 86, 82)])
        draw.rectangle((x, y, x + rng.choice([2, 3, 4]), y + rng.choice([2, 3, 4])), fill=color)


def draw_blocked_edges(draw: ImageDraw.ImageDraw) -> None:
    outer = (43, 39, 57)
    inner = (73, 66, 87)
    top = (103, 95, 116)
    draw.rectangle((0, 0, WIDTH, HEIGHT), outline=outer, width=34)
    draw.rectangle((28, 28, WIDTH - 29, HEIGHT - 29), outline=inner, width=18)
    for x in range(40, WIDTH - 40, 32):
        draw.rectangle((x, 18, x + 20, 42), fill=top)
        draw.rectangle((x, HEIGHT - 43, x + 20, HEIGHT - 19), fill=top)
    for y in range(48, HEIGHT - 48, 32):
        draw.rectangle((18, y, 42, y + 20), fill=top)
        draw.rectangle((WIDTH - 43, y, WIDTH - 19, y + 20), fill=top)


def draw_roads(draw: ImageDraw.ImageDraw) -> None:
    outline = (52, 49, 63)
    road = (98, 92, 83)
    light = (125, 117, 100)

    for pad in PADS:
        draw.line((CENTER[0], CENTER[1], pad[0], pad[1]), fill=outline, width=88)
        draw.line((CENTER[0], CENTER[1], pad[0], pad[1]), fill=road, width=72)

    draw.ellipse((CENTER[0] - 158, CENTER[1] - 138, CENTER[0] + 158, CENTER[1] + 138), fill=outline)
    draw.ellipse((CENTER[0] - 138, CENTER[1] - 118, CENTER[0] + 138, CENTER[1] + 118), fill=road)

    for pad in PADS:
        x, y = pad
        draw.ellipse((x - 82, y - 58, x + 82, y + 58), fill=outline)
        draw.ellipse((x - 66, y - 44, x + 66, y + 44), fill=road)

    for x in range(96, WIDTH - 96, 32):
        for y in range(96, HEIGHT - 96, 32):
            if math.hypot(x - CENTER[0], y - CENTER[1]) < 180 or any(math.hypot(x - px, y - py) < 92 for px, py in PADS):
                draw.rectangle((x, y, x + 14, y + 5), fill=light)


def draw_portal_pads(draw: ImageDraw.ImageDraw) -> None:
    for x, y in PADS:
        draw.ellipse((x - 48, y - 30, x + 48, y + 30), outline=(151, 140, 155), width=4)
        draw.ellipse((x - 28, y - 16, x + 28, y + 16), outline=(72, 180, 172), width=2)


def draw_ruins(draw: ImageDraw.ImageDraw) -> None:
    stone = (92, 84, 97)
    light = (129, 120, 138)
    shadow = (43, 38, 52)
    columns = [
        (260, 210), (318, 820), (598, 174), (945, 174), (1210, 212),
        (247, 552), (1288, 536), (1004, 875), (560, 864), (1232, 838),
    ]
    for x, y in columns:
        draw.rectangle((x - 12, y - 34, x + 12, y + 36), fill=shadow)
        draw.rectangle((x - 10, y - 40, x + 10, y + 28), fill=stone)
        draw.rectangle((x - 14, y - 44, x + 14, y - 34), fill=light)
        draw.rectangle((x - 16, y + 26, x + 16, y + 38), fill=light)

    rubble = [(332, 446), (1190, 442), (574, 654), (960, 654), (684, 348), (852, 348)]
    for x, y in rubble:
        draw.rectangle((x - 34, y - 10, x + 28, y + 12), fill=shadow)
        draw.rectangle((x - 32, y - 16, x + 32, y + 8), fill=stone)
        draw.rectangle((x - 8, y - 28, x + 18, y + 8), fill=light)


def draw_magic_stones(draw: ImageDraw.ImageDraw) -> None:
    stones = [
        (284, 344, (77, 210, 255)), (1260, 342, (209, 117, 255)),
        (290, 690, (118, 247, 179)), (1252, 704, (255, 99, 109)),
        (672, 248, (77, 210, 255)), (864, 248, (209, 117, 255)),
        (670, 790, (118, 247, 179)), (866, 790, (255, 99, 109)),
    ]
    for x, y, color in stones:
        draw.polygon([(x, y - 16), (x + 12, y), (x + 4, y + 18), (x - 12, y + 12), (x - 8, y - 4)], fill=(29, 28, 40))
        draw.polygon([(x, y - 12), (x + 8, y), (x + 2, y + 12), (x - 8, y + 8), (x - 5, y - 2)], fill=color)


def draw_ground_symbols(draw: ImageDraw.ImageDraw) -> None:
    for x, y in [(768, 512), (424, 288), (768, 224), (1112, 288), (424, 712), (1112, 712), (768, 760)]:
        draw.arc((x - 28, y - 20, x + 28, y + 20), 20, 330, fill=(88, 202, 195), width=2)
        draw.line((x - 18, y, x + 18, y), fill=(88, 202, 195), width=2)
        draw.line((x, y - 14, x, y + 14), fill=(88, 202, 195), width=2)


def draw_portal_sprite(filename: str, core: tuple[int, int, int], aura: tuple[int, int, int], locked: bool) -> None:
    image = Image.new("RGBA", (64, 72), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.ellipse((10, 57, 54, 69), fill=(20, 18, 30, 145))
    draw.ellipse((12, 8, 52, 64), fill=(22, 20, 34, 255))
    draw.ellipse((16, 11, 48, 60), fill=(*core, 210))
    draw.ellipse((21, 17, 43, 53), fill=(*aura, 220))
    draw.rectangle((14, 51, 50, 63), fill=(70, 64, 86, 255))
    draw.rectangle((18, 47, 46, 55), fill=(115, 105, 132, 255))

    for x, y in [(8, 32), (56, 33), (17, 8), (47, 9)]:
        draw.rectangle((x - 2, y - 2, x + 2, y + 2), fill=(*aura, 230))

    if locked:
        draw.line((21, 21, 43, 50), fill=(255, 226, 135, 255), width=4)
        draw.line((43, 21, 21, 50), fill=(255, 226, 135, 255), width=4)

    image.save(PORTAL_ROOT / filename)


def build_collision_map() -> list[list[int]]:
    collision = [[1 for _ in range(COLS)] for _ in range(ROWS)]

    open_circle(collision, CENTER, 150, 128)
    for pad in PADS:
        open_circle(collision, pad, 88, 64)
        open_line(collision, CENTER, pad, 42)

    for x in range(COLS):
        collision[0][x] = 1
        collision[ROWS - 1][x] = 1
    for y in range(ROWS):
        collision[y][0] = 1
        collision[y][COLS - 1] = 1

    return collision


def open_circle(collision: list[list[int]], center: tuple[int, int], radius_x: int, radius_y: int) -> None:
    cx, cy = center
    for row in range(ROWS):
        for col in range(COLS):
            px = col * TILE + TILE / 2
            py = row * TILE + TILE / 2
            if ((px - cx) / radius_x) ** 2 + ((py - cy) / radius_y) ** 2 <= 1:
                collision[row][col] = 0


def open_line(collision: list[list[int]], start: tuple[int, int], end: tuple[int, int], radius: int) -> None:
    sx, sy = start
    ex, ey = end
    dx = ex - sx
    dy = ey - sy
    length_sq = dx * dx + dy * dy

    for row in range(ROWS):
        for col in range(COLS):
            px = col * TILE + TILE / 2
            py = row * TILE + TILE / 2
            if length_sq == 0:
                distance = math.hypot(px - sx, py - sy)
            else:
                t = max(0, min(1, ((px - sx) * dx + (py - sy) * dy) / length_sq))
                nearest_x = sx + t * dx
                nearest_y = sy + t * dy
                distance = math.hypot(px - nearest_x, py - nearest_y)
            if distance <= radius:
                collision[row][col] = 0


def write_collision_map(collision: list[list[int]]) -> None:
    text = "export const collisionMap = "
    text += json.dumps(collision, separators=(", ", ": "))
    text += ";\n"
    COLLISION_PATH.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
