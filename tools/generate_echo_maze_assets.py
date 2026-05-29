from __future__ import annotations

import json
import math
from pathlib import Path
from random import Random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "assets" / "maps" / "echo_maze" / "background.png"
COLLISION_PATH = ROOT / "src" / "maps" / "echoMazeCollisionMap.js"
RUNE_ROOT = ROOT / "assets" / "objects" / "runes"
PORTAL_ROOT = ROOT / "assets" / "objects" / "portals"
MOB_ROOT = ROOT / "assets" / "mobs" / "echo_shadow"
ITEM_ROOT = ROOT / "assets" / "items"

WIDTH = 1536
HEIGHT = 1024
TILE = 8
COLS = WIDTH // TILE
ROWS = HEIGHT // TILE

CENTER = (768, 512)
ENTRANCE = (768, 900)
EXIT = (768, 140)
RUNES = {
    "leaf": (416, 360),
    "stone": (1120, 360),
    "moon": (416, 680),
    "flame": (1120, 680),
}


def main() -> None:
    for path in [MAP_PATH.parent, COLLISION_PATH.parent, RUNE_ROOT, PORTAL_ROOT, MOB_ROOT, ITEM_ROOT]:
        path.mkdir(parents=True, exist_ok=True)

    collision = build_collision_map()
    draw_map().save(MAP_PATH)
    write_collision_map(collision)
    draw_runes()
    draw_echo_portal("portal_echo_active.png", locked=False)
    draw_echo_portal("portal_echo_locked.png", locked=True)
    draw_echo_shadow_sheets()
    draw_echo_shard_icon()

    print(f"Map written: {MAP_PATH}")
    print(f"Collision map written: {COLLISION_PATH}")
    print(f"Runes written: {RUNE_ROOT}")
    print(f"Echo portal sprites written: {PORTAL_ROOT}")
    print(f"Echo shadow spritesheets written: {MOB_ROOT}")


def draw_map() -> Image.Image:
    rng = Random(77)
    image = Image.new("RGB", (WIDTH, HEIGHT), (17, 18, 32))
    draw = ImageDraw.Draw(image)
    draw_floor(draw, rng)
    draw_walls(draw)
    draw_paths(draw)
    draw_ruins(draw)
    draw_rune_pads(draw)
    draw_echo_marks(draw)
    return image


def draw_floor(draw: ImageDraw.ImageDraw, rng: Random) -> None:
    colors = [(18, 20, 35), (22, 24, 42), (25, 27, 48), (18, 26, 38)]
    for y in range(0, HEIGHT, 16):
        for x in range(0, WIDTH, 16):
            draw.rectangle((x, y, x + 15, y + 15), fill=colors[(x // 16 + y // 16) % len(colors)])

    for _ in range(1100):
        x = rng.randrange(28, WIDTH - 28, 4)
        y = rng.randrange(28, HEIGHT - 28, 4)
        color = rng.choice([(31, 35, 55), (38, 43, 66), (24, 47, 54), (50, 45, 72)])
        draw.rectangle((x, y, x + rng.choice([2, 3, 4]), y + rng.choice([2, 3, 4])), fill=color)


def draw_walls(draw: ImageDraw.ImageDraw) -> None:
    outline = (10, 9, 17)
    stone = (52, 49, 72)
    top = (82, 77, 101)
    draw.rectangle((0, 0, WIDTH, HEIGHT), outline=outline, width=44)
    draw.rectangle((38, 38, WIDTH - 39, HEIGHT - 39), outline=stone, width=24)
    for x in range(56, WIDTH - 56, 32):
        draw.rectangle((x, 28, x + 20, 56), fill=top)
        draw.rectangle((x, HEIGHT - 57, x + 20, HEIGHT - 29), fill=top)
    for y in range(64, HEIGHT - 64, 32):
        draw.rectangle((28, y, 56, y + 20), fill=top)
        draw.rectangle((WIDTH - 57, y, WIDTH - 29, y + 20), fill=top)

    blocks = [
        (192, 160, 250, 720), (1286, 160, 1344, 720),
        (520, 210, 590, 430), (946, 210, 1016, 430),
        (520, 594, 590, 820), (946, 594, 1016, 820),
        (660, 300, 876, 356), (660, 668, 876, 724),
    ]
    for box in blocks:
        draw.rectangle(box, fill=(28, 26, 42))
        draw.rectangle((box[0] + 8, box[1] + 8, box[2] - 8, box[3] - 8), fill=stone)
        draw.rectangle((box[0] + 16, box[1] + 16, box[2] - 16, box[1] + 30), fill=top)


def draw_paths(draw: ImageDraw.ImageDraw) -> None:
    outline = (13, 13, 22)
    path = (68, 62, 76)
    light = (96, 88, 104)
    targets = [ENTRANCE, EXIT, *RUNES.values()]

    for point in targets:
        draw.line((CENTER[0], CENTER[1], point[0], point[1]), fill=outline, width=92)
        draw.line((CENTER[0], CENTER[1], point[0], point[1]), fill=path, width=70)

    draw.ellipse((CENTER[0] - 132, CENTER[1] - 108, CENTER[0] + 132, CENTER[1] + 108), fill=outline)
    draw.ellipse((CENTER[0] - 112, CENTER[1] - 88, CENTER[0] + 112, CENTER[1] + 88), fill=path)

    for point in targets:
        x, y = point
        draw.ellipse((x - 72, y - 48, x + 72, y + 48), fill=outline)
        draw.ellipse((x - 56, y - 34, x + 56, y + 34), fill=path)

    for x in range(220, WIDTH - 220, 40):
        for y in range(150, HEIGHT - 120, 40):
            if math.hypot(x - CENTER[0], y - CENTER[1]) < 145 or any(math.hypot(x - px, y - py) < 82 for px, py in targets):
                draw.rectangle((x, y, x + 16, y + 5), fill=light)


def draw_ruins(draw: ImageDraw.ImageDraw) -> None:
    stone = (70, 65, 88)
    light = (105, 97, 125)
    shadow = (24, 22, 36)
    for x, y in [(318, 192), (1218, 192), (318, 832), (1218, 832), (650, 170), (886, 170), (650, 854), (886, 854)]:
        draw.rectangle((x - 13, y - 34, x + 13, y + 34), fill=shadow)
        draw.rectangle((x - 10, y - 40, x + 10, y + 28), fill=stone)
        draw.rectangle((x - 15, y - 44, x + 15, y - 34), fill=light)
        draw.rectangle((x - 16, y + 28, x + 16, y + 38), fill=light)


def draw_rune_pads(draw: ImageDraw.ImageDraw) -> None:
    for key, (x, y) in RUNES.items():
        color = rune_color(key, active=True)
        draw.ellipse((x - 46, y - 28, x + 46, y + 28), outline=(124, 115, 136), width=4)
        draw.ellipse((x - 26, y - 14, x + 26, y + 14), outline=color, width=2)


def draw_echo_marks(draw: ImageDraw.ImageDraw) -> None:
    for x, y in [CENTER, ENTRANCE, EXIT, *RUNES.values()]:
        draw.arc((x - 26, y - 18, x + 26, y + 18), 25, 320, fill=(92, 232, 221), width=2)
        draw.line((x - 16, y, x + 16, y), fill=(92, 232, 221), width=2)


def draw_runes() -> None:
    for key in RUNES:
        for active in [False, True]:
            image = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
            draw = ImageDraw.Draw(image)
            color = rune_color(key, active)
            base = (67, 62, 84, 255)
            draw.ellipse((3, 12, 37, 34), fill=(18, 16, 26, 130))
            draw.polygon([(20, 2), (35, 13), (31, 32), (20, 38), (8, 32), (5, 13)], fill=base)
            draw.line((20, 9, 20, 31), fill=color, width=3)
            if key == "leaf":
                draw.arc((11, 10, 29, 28), 230, 65, fill=color, width=3)
            elif key == "stone":
                draw.rectangle((12, 15, 28, 27), outline=color, width=3)
            elif key == "moon":
                draw.arc((10, 9, 30, 31), 75, 285, fill=color, width=4)
            else:
                draw.polygon([(20, 9), (28, 23), (20, 32), (12, 23)], outline=color)
                draw.line((20, 9, 20, 32), fill=color, width=2)
            filename = f"rune_{key}_{'active' if active else 'inactive'}.png"
            image.save(RUNE_ROOT / filename)


def rune_color(key: str, active: bool) -> tuple[int, int, int]:
    palette = {
        "leaf": ((58, 133, 82), (112, 245, 151)),
        "stone": ((121, 116, 126), (218, 210, 224)),
        "moon": ((95, 113, 181), (158, 214, 255)),
        "flame": ((170, 82, 45), (255, 174, 74)),
    }
    return palette[key][1 if active else 0]


def draw_echo_portal(filename: str, locked: bool) -> None:
    image = Image.new("RGBA", (64, 72), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    core = (91, 232, 221)
    aura = (150, 130, 255) if locked else (170, 255, 245)
    draw.ellipse((10, 57, 54, 69), fill=(10, 8, 18, 150))
    draw.ellipse((12, 8, 52, 64), fill=(21, 19, 35, 255))
    draw.ellipse((16, 11, 48, 60), fill=(*core, 205))
    draw.ellipse((22, 18, 42, 52), fill=(*aura, 225))
    draw.rectangle((14, 51, 50, 63), fill=(62, 56, 84, 255))
    draw.rectangle((18, 47, 46, 55), fill=(112, 102, 142, 255))
    if locked:
        draw.line((21, 20, 43, 50), fill=(255, 226, 135, 255), width=4)
        draw.line((43, 20, 21, 50), fill=(255, 226, 135, 255), width=4)
    image.save(PORTAL_ROOT / filename)


def draw_echo_shadow_sheets() -> None:
    specs = {"idle": 2, "walk": 4, "attack": 4}
    directions = ["down", "up", "left", "right"]
    for state, frames in specs.items():
        sheet = Image.new("RGBA", (frames * 32, 4 * 32), (0, 0, 0, 0))
        for row, direction in enumerate(directions):
            for frame in range(frames):
                sprite = draw_echo_shadow_frame(state, direction, frame)
                sheet.alpha_composite(sprite, (frame * 32, row * 32))
        sheet.save(MOB_ROOT / f"echo_shadow_{state}.png")


def draw_echo_shadow_frame(state: str, direction: str, frame: int) -> Image.Image:
    image = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    bob = (frame % 2) * 1
    lean = 0
    if state == "walk":
        lean = [-1, 0, 1, 0][frame % 4]
    if state == "attack":
        lean = [-1, 1, 2, 0][frame % 4]
    if direction == "left":
        lean -= 1
    elif direction == "right":
        lean += 1
    elif direction == "up":
        bob -= 1

    body = (38, 35, 65, 235)
    edge = (9, 8, 18, 255)
    glow = (104, 234, 226, 230)
    draw.ellipse((7 + lean, 22, 25 + lean, 30), fill=(0, 0, 0, 80))
    draw.polygon([(16 + lean, 5 + bob), (25 + lean, 18 + bob), (21 + lean, 28), (11 + lean, 28), (7 + lean, 18 + bob)], fill=edge)
    draw.polygon([(16 + lean, 7 + bob), (23 + lean, 18 + bob), (20 + lean, 26), (12 + lean, 26), (9 + lean, 18 + bob)], fill=body)
    if direction != "up":
        draw.rectangle((12 + lean, 15 + bob, 14 + lean, 17 + bob), fill=glow)
        draw.rectangle((18 + lean, 15 + bob, 20 + lean, 17 + bob), fill=glow)
    if state == "attack":
        draw.arc((7 + lean, 8 + bob, 25 + lean, 25 + bob), 20, 170, fill=glow, width=2)
    return image


def draw_echo_shard_icon() -> None:
    image = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.polygon([(16, 3), (25, 13), (21, 28), (10, 25), (7, 12)], fill=(16, 15, 29, 255))
    draw.polygon([(16, 5), (23, 14), (20, 25), (11, 23), (9, 13)], fill=(98, 234, 224, 255))
    draw.line((16, 6, 16, 24), fill=(202, 255, 250, 255), width=2)
    image.save(ITEM_ROOT / "echo_shard.png")


def build_collision_map() -> list[list[int]]:
    collision = [[1 for _ in range(COLS)] for _ in range(ROWS)]
    targets = [ENTRANCE, EXIT, *RUNES.values()]

    open_ellipse(collision, CENTER, 126, 102)
    for target in targets:
        open_ellipse(collision, target, 86, 58)
        open_line(collision, CENTER, target, 42)

    for x in range(COLS):
        collision[0][x] = 1
        collision[ROWS - 1][x] = 1
    for y in range(ROWS):
        collision[y][0] = 1
        collision[y][COLS - 1] = 1
    return collision


def open_ellipse(collision: list[list[int]], center: tuple[int, int], radius_x: int, radius_y: int) -> None:
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
    COLLISION_PATH.write_text(
        "export const collisionMap = " + json.dumps(collision, separators=(", ", ": ")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
