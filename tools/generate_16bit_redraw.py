from __future__ import annotations

import json
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MAP_SIZE = (1536, 1024)
TILE = 8
DIRECTIONS = ["down", "up", "left", "right"]

PAL = {
    "outline": (36, 31, 38, 255),
    "shadow": (44, 52, 41, 120),
    "grass": (78, 145, 56, 255),
    "grass_dark": (54, 105, 49, 255),
    "grass_light": (105, 170, 72, 255),
    "path": (166, 145, 101, 255),
    "path_dark": (126, 107, 82, 255),
    "stone": (111, 114, 103, 255),
    "stone_light": (150, 153, 139, 255),
    "wood": (119, 69, 39, 255),
    "wood_dark": (76, 44, 33, 255),
    "roof": (174, 60, 30, 255),
    "roof_light": (222, 91, 34, 255),
    "wall": (215, 158, 92, 255),
    "wall_shadow": (146, 89, 58, 255),
    "water": (58, 126, 160, 255),
    "water_light": (91, 179, 196, 255),
    "flower": (238, 203, 69, 255),
}


def read_collision(path: str) -> list[list[int]]:
    text = (ROOT / path).read_text(encoding="utf-8")
    match = re.search(r"=\s*(\[.*\])\s*;", text, re.S)
    if not match:
        raise ValueError(f"Cannot parse collision map: {path}")
    return json.loads(match.group(1))


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def draw_tile(draw: ImageDraw.ImageDraw, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    draw.rectangle((x, y, x + TILE - 1, y + TILE - 1), fill=color)


def draw_map(location_id: str, collision_path: str, theme: str) -> None:
    collision = read_collision(collision_path)
    rng = random.Random(f"catcity-{location_id}-sega16")
    image = Image.new("RGBA", MAP_SIZE, PAL["grass"])
    draw = ImageDraw.Draw(image)

    rows = len(collision)
    cols = len(collision[0])
    for ty in range(rows):
        for tx in range(cols):
            x = tx * TILE
            y = ty * TILE
            walkable = collision[ty][tx] == 0
            if theme in {"merchant_shop", "healer_house"}:
                if walkable:
                    base = (143, 93, 57, 255) if (tx + ty) % 2 else (157, 106, 65, 255)
                    draw_tile(draw, x, y, base)
                    if tx % 4 == 0:
                        draw.line((x, y, x, y + TILE - 1), fill=(103, 66, 48, 255))
                    if ty % 4 == 0:
                        draw.line((x, y, x + TILE - 1, y), fill=(103, 66, 48, 255))
                else:
                    draw_tile(draw, x, y, (62, 48, 54, 255))
                    if rng.random() < 0.18:
                        draw.rectangle((x + 1, y + 1, x + 5, y + 2), fill=(91, 74, 72, 255))
                continue

            if walkable:
                if theme == "city":
                    color = PAL["stone"] if (tx + ty) % 3 else PAL["stone_light"]
                    draw_tile(draw, x, y, color)
                    draw.point((x + 2, y + 2), fill=PAL["path_dark"])
                    draw.point((x + 6, y + 6), fill=(91, 94, 86, 255))
                elif theme == "garden":
                    color = (124, 112, 75, 255) if (tx + ty) % 2 else (145, 128, 82, 255)
                    draw_tile(draw, x, y, color)
                    if rng.random() < 0.15:
                        draw.point((x + 3, y + 3), fill=(82, 83, 55, 255))
                else:
                    color = PAL["path"] if (tx + ty) % 2 else (181, 158, 111, 255)
                    draw_tile(draw, x, y, color)
                    if rng.random() < 0.12:
                        draw.point((x + 2, y + 5), fill=PAL["path_dark"])
            else:
                if theme == "garden":
                    color = PAL["grass_dark"] if rng.random() < 0.4 else (47, 116, 59, 255)
                elif theme == "south":
                    color = (86, 153, 67, 255) if rng.random() < 0.6 else (108, 165, 72, 255)
                else:
                    color = PAL["grass"] if rng.random() < 0.7 else PAL["grass_light"]
                draw_tile(draw, x, y, color)
                if rng.random() < 0.03:
                    draw.rectangle((x + 2, y + 3, x + 5, y + 5), fill=PAL["grass_dark"])
                if rng.random() < 0.012:
                    draw.point((x + 3, y + 4), fill=PAL["flower"])

    if theme == "city":
        draw_city_frame(draw)
    elif theme == "garden":
        draw_garden_frame(draw)
    elif theme == "south":
        draw_meadow_edges(draw)
    else:
        draw_interior_details(draw, theme)

    out = ROOT / "assets" / "maps" / location_id / "background.png"
    ensure_parent(out)
    image.save(out)
    print(f"map: {out.relative_to(ROOT)}")


def draw_city_frame(draw: ImageDraw.ImageDraw) -> None:
    for y in range(32, MAP_SIZE[1] - 32, 16):
        draw.rectangle((24, y, 47, y + 11), fill=(103, 69, 57, 255), outline=PAL["outline"])
        draw.rectangle((MAP_SIZE[0] - 48, y, MAP_SIZE[0] - 25, y + 11), fill=(103, 69, 57, 255), outline=PAL["outline"])
    for x in range(32, MAP_SIZE[0] - 32, 16):
        draw.rectangle((x, 24, x + 11, 47), fill=(103, 69, 57, 255), outline=PAL["outline"])
    for x in list(range(32, 680, 16)) + list(range(880, MAP_SIZE[0] - 32, 16)):
        draw.rectangle((x, MAP_SIZE[1] - 48, x + 11, MAP_SIZE[1] - 25), fill=(103, 69, 57, 255), outline=PAL["outline"])


def draw_garden_frame(draw: ImageDraw.ImageDraw) -> None:
    for x in range(16, MAP_SIZE[0] - 16, 32):
        draw.rectangle((x, 16, x + 24, 31), fill=(93, 92, 82, 255), outline=PAL["outline"])
        draw.rectangle((x, MAP_SIZE[1] - 32, x + 24, MAP_SIZE[1] - 17), fill=(93, 92, 82, 255), outline=PAL["outline"])
    for y in range(16, MAP_SIZE[1] - 16, 32):
        draw.rectangle((16, y, 31, y + 24), fill=(93, 92, 82, 255), outline=PAL["outline"])
        draw.rectangle((MAP_SIZE[0] - 32, y, MAP_SIZE[0] - 17, y + 24), fill=(93, 92, 82, 255), outline=PAL["outline"])


def draw_meadow_edges(draw: ImageDraw.ImageDraw) -> None:
    for x in range(0, MAP_SIZE[0], 64):
        draw.rectangle((x, 0, x + 38, 18), fill=(53, 108, 54, 255))
        draw.rectangle((x + 21, MAP_SIZE[1] - 18, x + 60, MAP_SIZE[1]), fill=(53, 108, 54, 255))


def draw_interior_details(draw: ImageDraw.ImageDraw, theme: str) -> None:
    draw.rectangle((0, 0, MAP_SIZE[0], 170), fill=(74, 52, 58, 255))
    draw.rectangle((0, 162, MAP_SIZE[0], 180), fill=PAL["outline"])
    if theme == "merchant_shop":
        draw.rectangle((450, 220, 1086, 276), fill=(99, 60, 42, 255), outline=PAL["outline"], width=4)
        for x in range(490, 1040, 90):
            draw.rectangle((x, 196, x + 54, 242), fill=(179, 109, 50, 255), outline=PAL["outline"], width=3)
    else:
        draw.rectangle((552, 220, 984, 286), fill=(96, 67, 71, 255), outline=PAL["outline"], width=4)
        draw.rectangle((652, 350, 884, 520), fill=(170, 80, 78, 255), outline=PAL["outline"], width=4)


def rect(draw: ImageDraw.ImageDraw, xy, fill, outline=PAL["outline"], width=2):
    draw.rectangle(xy, fill=fill, outline=outline, width=width)


def make_object_sprite(kind: str, size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = size

    def shadow():
        d.ellipse((w * 0.12, h - 18, w * 0.88, h - 2), fill=PAL["shadow"])

    shadow()
    if kind in {"merchant_shop_house", "healer_house", "town_house"}:
        roof = PAL["roof"] if kind != "healer_house" else (82, 126, 164, 255)
        wall = PAL["wall"] if kind != "town_house" else (199, 146, 95, 255)
        rect(d, (16, 58, w - 16, h - 18), wall, width=4)
        d.polygon([(8, 64), (w // 2, 8), (w - 8, 64)], fill=roof, outline=PAL["outline"])
        for x in range(28, w - 34, 28):
            d.line((x, 42, x + 18, 60), fill=PAL["roof_light"], width=3)
        rect(d, (w // 2 - 18, h - 68, w // 2 + 18, h - 18), PAL["wood"], width=4)
        rect(d, (35, h - 68, 67, h - 39), (76, 124, 161, 255), width=3)
        rect(d, (w - 68, h - 68, w - 36, h - 39), (76, 124, 161, 255), width=3)
        if kind == "merchant_shop_house":
            rect(d, (w // 2 - 42, 60, w // 2 + 42, 82), (94, 55, 38, 255), width=3)
            d.rectangle((w // 2 - 32, 66, w // 2 + 32, 73), fill=(235, 197, 88, 255))
        if kind == "healer_house":
            rect(d, (w // 2 - 10, 34, w // 2 + 10, 54), (239, 229, 210, 255), width=2)
            d.rectangle((w // 2 - 3, 24, w // 2 + 3, 64), fill=(176, 51, 70, 255))
            d.rectangle((w // 2 - 20, 41, w // 2 + 20, 47), fill=(176, 51, 70, 255))
    elif kind == "sign":
        rect(d, (22, 18, w - 22, 54), (150, 89, 46, 255), width=3)
        d.rectangle((w // 2 - 5, 54, w // 2 + 5, h - 8), fill=PAL["wood_dark"])
        d.rectangle((w // 2 - 9, h - 14, w // 2 + 9, h - 8), fill=PAL["outline"])
        d.line((32, 30, w - 32, 30), fill=(231, 176, 89, 255), width=3)
    elif kind == "well":
        d.ellipse((18, 50, w - 18, h - 8), fill=(74, 82, 82, 255), outline=PAL["outline"], width=4)
        rect(d, (24, 40, w - 24, h - 28), PAL["stone"], width=3)
        d.arc((26, 2, w - 26, 64), 190, 350, fill=PAL["outline"], width=5)
        d.arc((30, 6, w - 30, 66), 190, 350, fill=PAL["wood"], width=4)
    elif kind == "cart":
        rect(d, (18, 36, w - 18, h - 24), (141, 77, 42, 255), width=4)
        rect(d, (34, 24, w - 34, 48), (58, 86, 147, 255), width=3)
        for cx in (36, w - 36):
            d.ellipse((cx - 13, h - 35, cx + 13, h - 9), fill=(53, 39, 34, 255), outline=PAL["outline"], width=3)
    elif kind == "beehives":
        for i, x in enumerate((22, 58, 94)):
            d.ellipse((x, 36 - i * 4, x + 34, h - 12), fill=(216, 151, 56, 255), outline=PAL["outline"], width=3)
            d.line((x + 6, 56 - i * 4, x + 29, 56 - i * 4), fill=(125, 77, 39, 255), width=3)
    elif kind == "herb_patch":
        for x in range(14, w - 14, 14):
            y = h - 18 - (x % 28)
            d.polygon([(x, y), (x + 8, y - 18), (x + 15, y)], fill=(54, 132, 70, 255), outline=PAL["outline"])
            d.point((x + 8, y - 16), fill=(230, 217, 84, 255))
    elif kind == "pond":
        d.ellipse((8, 16, w - 8, h - 10), fill=PAL["water"], outline=PAL["outline"], width=4)
        d.arc((22, 26, w - 28, h - 18), 20, 160, fill=PAL["water_light"], width=4)
    elif kind == "ruins":
        for x, top in ((18, 18), (58, 4), (102, 26)):
            rect(d, (x, top, x + 24, h - 16), PAL["stone"], width=3)
            d.rectangle((x + 5, top + 8, x + 19, top + 16), fill=PAL["stone_light"])
        rect(d, (8, h - 24, w - 8, h - 10), (82, 85, 78, 255), width=3)
    elif kind == "broken_fence":
        for x in range(8, w - 8, 28):
            rect(d, (x, 32 + (x % 2) * 10, x + 10, h - 12), PAL["wood"], width=2)
        d.line((8, 50, w - 20, 38), fill=PAL["wood_dark"], width=8)
        d.line((24, 76, w - 8, 64), fill=PAL["wood_dark"], width=8)
    elif kind == "monster_plant":
        d.ellipse((w // 2 - 24, 28, w // 2 + 24, 76), fill=(92, 160, 63, 255), outline=PAL["outline"], width=4)
        d.pieslice((w // 2 - 30, 12, w // 2 + 30, 68), 15, 345, fill=(142, 42, 65, 255), outline=PAL["outline"], width=4)
        d.polygon([(w // 2 - 12, 34), (w // 2 - 2, 50), (w // 2 - 22, 48)], fill=(244, 230, 166, 255))
        d.polygon([(w // 2 + 12, 34), (w // 2 + 2, 50), (w // 2 + 22, 48)], fill=(244, 230, 166, 255))
    elif kind == "shop_counter":
        rect(d, (8, 28, w - 8, h - 16), (125, 70, 42, 255), width=4)
        d.rectangle((16, 38, w - 16, 52), fill=(177, 100, 52, 255))
    elif kind == "shelf":
        rect(d, (10, 10, w - 10, h - 10), (98, 58, 41, 255), width=4)
        for y in (34, 58, 82):
            d.line((16, y, w - 16, y), fill=(169, 95, 49, 255), width=4)
            for x in range(24, w - 20, 26):
                d.rectangle((x, y - 16, x + 12, y - 3), fill=(207, 160, 67, 255), outline=PAL["outline"])
    elif kind == "bed":
        rect(d, (14, 18, w - 14, h - 14), (82, 116, 158, 255), width=4)
        rect(d, (22, 26, w - 22, 50), (229, 219, 190, 255), width=3)
    return img


def save_object(kind: str, size: tuple[int, int], filename: str | None = None) -> None:
    out = ROOT / "assets" / "objects" / (filename or f"{kind}.png")
    ensure_parent(out)
    make_object_sprite(kind, size).save(out)
    print(f"object: {out.relative_to(ROOT)}")


def draw_character_frame(role: str, direction: str, frame: int, state: str) -> Image.Image:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    colors = {
        "player": ((215, 123, 62, 255), (56, 91, 156, 255)),
        "player_girl": ((232, 142, 92, 255), (157, 70, 126, 255)),
        "guard": ((186, 190, 174, 255), (68, 93, 134, 255)),
        "spice_merchant": ((218, 168, 82, 255), (118, 71, 133, 255)),
        "merchant": ((218, 168, 82, 255), (91, 130, 91, 255)),
        "baker": ((236, 196, 145, 255), (173, 83, 72, 255)),
        "herbalist": ((188, 151, 91, 255), (64, 132, 83, 255)),
        "road_scout": ((199, 146, 95, 255), (72, 99, 123, 255)),
        "beekeeper": ((233, 199, 91, 255), (116, 87, 51, 255)),
        "mechanic": ((199, 146, 95, 255), (72, 117, 137, 255)),
        "old_cat": ((183, 174, 151, 255), (87, 79, 106, 255)),
    }
    fur, outfit = colors.get(role, colors["player"])
    bob = [0, 1, 0, -1][frame % 4] if state == "walk" else [0, 1][frame % 2]
    attack_shift = 2 if state == "attack" and frame in (1, 2) else 0
    cx = 16 + (attack_shift if direction == "right" else -attack_shift if direction == "left" else 0)
    cy = 16 + (attack_shift if direction == "down" else -attack_shift if direction == "up" else 0)
    d.ellipse((8, 23, 24, 30), fill=PAL["shadow"])
    # Tail behind body.
    if direction in {"left", "right"}:
        tx = cx - 11 if direction == "right" else cx + 7
        d.rectangle((tx, cy + 4, tx + 8, cy + 7), fill=PAL["outline"])
        d.rectangle((tx + 1, cy + 4, tx + 7, cy + 6), fill=fur)
    elif direction == "down":
        d.rectangle((cx + 6, cy + 4, cx + 10, cy + 12), fill=PAL["outline"])
        d.rectangle((cx + 7, cy + 5, cx + 9, cy + 11), fill=fur)

    d.rectangle((cx - 7, cy - 1 + bob, cx + 7, cy + 13 + bob), fill=PAL["outline"])
    d.rectangle((cx - 5, cy + 1 + bob, cx + 5, cy + 12 + bob), fill=outfit)
    d.rectangle((cx - 8, cy - 12 + bob, cx + 8, cy + 2 + bob), fill=PAL["outline"])
    d.rectangle((cx - 6, cy - 10 + bob, cx + 6, cy + 1 + bob), fill=fur)
    d.polygon([(cx - 7, cy - 10 + bob), (cx - 3, cy - 16 + bob), (cx, cy - 9 + bob)], fill=PAL["outline"])
    d.polygon([(cx + 7, cy - 10 + bob), (cx + 3, cy - 16 + bob), (cx, cy - 9 + bob)], fill=PAL["outline"])
    d.polygon([(cx - 6, cy - 10 + bob), (cx - 3, cy - 14 + bob), (cx - 1, cy - 9 + bob)], fill=fur)
    d.polygon([(cx + 6, cy - 10 + bob), (cx + 3, cy - 14 + bob), (cx + 1, cy - 9 + bob)], fill=fur)

    if direction != "up":
        d.rectangle((cx - 4, cy - 5 + bob, cx - 3, cy - 3 + bob), fill=PAL["outline"])
        d.rectangle((cx + 3, cy - 5 + bob, cx + 4, cy - 3 + bob), fill=PAL["outline"])
        d.rectangle((cx - 2, cy - 1 + bob, cx + 2, cy + 0 + bob), fill=(116, 60, 49, 255))
    else:
        d.rectangle((cx - 6, cy - 7 + bob, cx + 6, cy - 5 + bob), fill=(149, 89, 60, 255))

    leg = 2 if state == "walk" and frame % 2 else -1
    d.rectangle((cx - 6, cy + 13 + bob, cx - 2, cy + 18 + bob + max(0, leg)), fill=PAL["outline"])
    d.rectangle((cx + 2, cy + 13 + bob, cx + 6, cy + 18 + bob + max(0, -leg)), fill=PAL["outline"])

    if role == "guard":
        d.rectangle((cx + 8, cy - 6 + bob, cx + 10, cy + 15 + bob), fill=(205, 209, 188, 255))
    elif role in {"merchant", "spice_merchant"}:
        d.rectangle((cx - 11, cy + 3 + bob, cx - 8, cy + 9 + bob), fill=(198, 116, 51, 255))
    elif role == "baker":
        d.rectangle((cx - 7, cy - 15 + bob, cx + 7, cy - 12 + bob), fill=(244, 232, 200, 255))
    elif role == "beekeeper":
        d.rectangle((cx - 7, cy - 11 + bob, cx + 7, cy - 8 + bob), fill=(239, 219, 125, 255))
    elif role == "mechanic":
        d.rectangle((cx - 7, cy - 7 + bob, cx + 7, cy - 5 + bob), fill=(93, 172, 184, 255))

    if state == "attack":
        slash = (244, 225, 157, 255)
        if direction == "right":
            d.arc((cx + 4, cy - 11 + bob, cx + 20, cy + 8 + bob), 295, 65, fill=slash, width=2)
            d.line((cx + 8, cy + 2 + bob, cx + 15, cy - 5 + bob), fill=PAL["outline"], width=2)
        elif direction == "left":
            d.arc((cx - 20, cy - 11 + bob, cx - 4, cy + 8 + bob), 115, 245, fill=slash, width=2)
            d.line((cx - 8, cy + 2 + bob, cx - 15, cy - 5 + bob), fill=PAL["outline"], width=2)
        elif direction == "up":
            d.arc((cx - 10, cy - 22 + bob, cx + 10, cy - 5 + bob), 200, 340, fill=slash, width=2)
            d.line((cx, cy - 8 + bob, cx, cy - 17 + bob), fill=PAL["outline"], width=2)
        else:
            d.arc((cx - 11, cy + 4 + bob, cx + 11, cy + 21 + bob), 20, 160, fill=slash, width=2)
            d.line((cx, cy + 7 + bob, cx, cy + 17 + bob), fill=PAL["outline"], width=2)

    return img


def save_player_frames(role: str, out_dir: Path, walk_prefix: str, attack_prefix: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for direction in DIRECTIONS:
        for frame in range(3):
            draw_character_frame(role, direction, frame, "walk").save(out_dir / f"{walk_prefix}_{direction}_{frame + 1}.png")
        for frame in range(4):
            draw_character_frame(role, direction, frame, "attack").save(out_dir / f"{attack_prefix}_{direction}_{frame + 1}.png")


def save_character_sheets(role: str, folder: Path, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    configs = {"idle": 2, "walk": 4, "attack": 4}
    for state, count in configs.items():
        sheet = Image.new("RGBA", (32 * count, 32 * 4), (0, 0, 0, 0))
        for row, direction in enumerate(DIRECTIONS):
            for frame in range(count):
                sheet.alpha_composite(draw_character_frame(role, direction, frame, state), (frame * 32, row * 32))
        sheet.save(folder / f"{name}_{state}.png")


def draw_mob_frame(kind: str, direction: str, frame: int, state: str) -> Image.Image:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pulse = [0, 1, 0, -1][frame % 4]
    d.ellipse((7, 24, 25, 30), fill=PAL["shadow"])
    if kind == "fungus_monster":
        d.ellipse((7, 5 + pulse, 25, 19 + pulse), fill=(156, 62, 84, 255), outline=PAL["outline"], width=2)
        d.rectangle((11, 16 + pulse, 21, 27 + pulse), fill=(214, 184, 132, 255), outline=PAL["outline"])
        d.rectangle((12, 9 + pulse, 15, 11 + pulse), fill=(236, 205, 172, 255))
        d.rectangle((20, 10 + pulse, 22, 12 + pulse), fill=(236, 205, 172, 255))
    else:
        d.rectangle((14, 16 + pulse, 18, 28 + pulse), fill=(63, 126, 62, 255), outline=PAL["outline"])
        d.ellipse((5, 5 + pulse, 27, 23 + pulse), fill=(70, 158, 71, 255), outline=PAL["outline"], width=2)
        if state == "attack":
            d.pieslice((4, 3 + pulse, 28, 25 + pulse), 15, 345, fill=(151, 45, 74, 255), outline=PAL["outline"], width=2)
            d.polygon([(12, 12 + pulse), (16, 18 + pulse), (9, 17 + pulse)], fill=(241, 226, 169, 255))
            d.polygon([(20, 12 + pulse), (16, 18 + pulse), (23, 17 + pulse)], fill=(241, 226, 169, 255))
        else:
            d.rectangle((11, 12 + pulse, 13, 14 + pulse), fill=PAL["outline"])
            d.rectangle((19, 12 + pulse, 21, 14 + pulse), fill=PAL["outline"])
    return img


def save_mob_sheets(kind: str, folder: Path, name: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    for state, count in {"idle": 2, "walk": 4, "attack": 4}.items():
        sheet = Image.new("RGBA", (32 * count, 32 * 4), (0, 0, 0, 0))
        for row, direction in enumerate(DIRECTIONS):
            for frame in range(count):
                sheet.alpha_composite(draw_mob_frame(kind, direction, frame, state), (frame * 32, row * 32))
        sheet.save(folder / f"{name}_{state}.png")


def main() -> None:
    locations = {
        "city": ("src/maps/cityCollisionMap.js", "city"),
        "south_outskirts": ("src/maps/southOutskirtsCollisionMap.js", "south"),
        "overgrown_garden": ("src/maps/overgrownGardenCollisionMap.js", "garden"),
        "merchant_shop": ("src/maps/merchantShopCollisionMap.js", "merchant_shop"),
        "healer_house": ("src/maps/merchantShopCollisionMap.js", "healer_house"),
    }
    for location_id, (collision, theme) in locations.items():
        draw_map(location_id, collision, theme)

    objects = {
        "merchant_shop_house": ((192, 168), "merchant_shop_house.png"),
        "healer_house": ((176, 156), "healer_house.png"),
        "town_house": ((160, 140), "town_house.png"),
        "sign": ((80, 88), "sign.png"),
        "well": ((96, 96), "well.png"),
        "cart": ((128, 88), "cart.png"),
        "beehives": ((144, 96), "beehives.png"),
        "herb_patch": ((128, 80), "herb_patch.png"),
        "pond": ((184, 112), "pond.png"),
        "ruins": ((152, 130), "ruins.png"),
        "broken_fence": ((184, 96), "broken_fence.png"),
        "monster_plant": ((96, 104), "monster_plant.png"),
        "shop_counter": ((220, 96), "shop_counter.png"),
        "shelf": ((128, 116), "shelf.png"),
        "bed": ((132, 112), "bed.png"),
    }
    for kind, (size, filename) in objects.items():
        save_object(kind, size, filename)

    save_player_frames("player", ROOT / "assets" / "characters" / "player", "cat_walk", "cat_attack")
    save_player_frames("player_girl", ROOT / "assets" / "characters" / "player_girl", "cat_girl_walk", "cat_girl_attack")

    for role in ["guard", "spice_merchant", "baker", "merchant", "herbalist", "road_scout", "beekeeper", "mechanic", "old_cat"]:
        save_character_sheets(role, ROOT / "assets" / "npcs" / role, role)

    save_mob_sheets("carnivorous_plant", ROOT / "assets" / "mobs" / "carnivorous_plant", "carnivorous_plant")
    save_mob_sheets("fungus_monster", ROOT / "assets" / "mobs" / "fungus_monster", "fungus_monster")
    print("16-bit redraw assets generated")


if __name__ == "__main__":
    main()
