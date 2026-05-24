from pathlib import Path
import json
import random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "maps" / "overgrown_garden"
OUT_MAP = OUT_DIR / "background.png"
OUT_COLLISION = ROOT / "src" / "maps" / "overgrownGardenCollisionMap.js"

WIDTH = 1536
HEIGHT = 1024
TILE_SIZE = 8

GRASS = (69, 120, 37, 255)
GRASS_DARK = (42, 86, 31, 255)
GRASS_LIGHT = (94, 148, 52, 255)
PATH = (123, 119, 93, 255)
PATH_EDGE = (78, 105, 74, 255)
STONE = (113, 113, 101, 255)
STONE_LIGHT = (151, 150, 133, 255)
STONE_DARK = (64, 71, 67, 255)
WOOD = (135, 82, 43, 255)
WOOD_DARK = (82, 49, 30, 255)
WATER = (61, 112, 131, 255)
WATER_DARK = (34, 75, 91, 255)

CLEARINGS = [
    (420, 330, 190, 138),
    (1040, 335, 210, 150),
    (760, 555, 230, 165),
    (405, 742, 220, 155),
    (1125, 760, 230, 155),
]

PATHS = [
    [(768, 0), (768, 135), (675, 245), (585, 360), (640, 505), (760, 555), (850, 670), (770, 890)],
    [(640, 505), (505, 545), (405, 742)],
    [(760, 555), (925, 500), (1040, 335), (1208, 470), (1125, 760)],
    [(585, 360), (420, 330), (320, 470), (360, 610), (405, 742)],
]


def clamp(value):
    return max(0, min(255, value))


def make_grass():
    random.seed(31)
    img = Image.new("RGBA", (WIDTH, HEIGHT), GRASS)
    px = img.load()

    for y in range(HEIGHT):
        for x in range(WIDTH):
            n = random.randrange(-10, 11)
            px[x, y] = (
                clamp(GRASS[0] + n),
                clamp(GRASS[1] + n),
                clamp(GRASS[2] + n // 2),
                255,
            )

    draw = ImageDraw.Draw(img)
    for _ in range(340):
        x = random.randrange(40, WIDTH - 40)
        y = random.randrange(60, HEIGHT - 40)
        color = random.choice([
            (34, 83, 31, 105),
            (54, 104, 38, 100),
            (100, 150, 56, 90),
        ])
        draw.rectangle((x, y, x + random.randrange(4, 14), y + random.randrange(2, 8)), fill=color)

    for _ in range(85):
        x = random.randrange(55, WIDTH - 55)
        y = random.randrange(90, HEIGHT - 60)
        color = random.choice([(224, 147, 29, 235), (229, 205, 60, 225), (184, 116, 190, 220)])
        draw.rectangle((x, y, x + 4, y + 4), fill=color)

    return img


def rough_rect(draw, rect, fill, jitter_color=None, count=30):
    draw.rectangle(rect, fill=fill)
    x0, y0, x1, y1 = rect
    for _ in range(count):
        x = random.randrange(x0, max(x0 + 1, x1))
        y = random.randrange(y0, max(y0 + 1, y1))
        color = jitter_color or fill
        draw.rectangle((x, y, x + random.randrange(5, 14), y + random.randrange(3, 9)), fill=color)


def draw_stone_block(draw, x, y, w=48, h=40):
    draw.rectangle((x + 4, y + 8, x + w + 4, y + h + 8), fill=(43, 49, 45, 95))
    draw.rectangle((x, y, x + w, y + h), fill=STONE)
    draw.rectangle((x + 4, y + 4, x + w - 4, y + h - 6), fill=STONE_LIGHT)
    draw.rectangle((x + 4, y + h - 12, x + w - 4, y + h - 4), fill=STONE_DARK)
    draw.line((x + w // 2, y + 5, x + w // 2, y + h - 8), fill=(96, 96, 87, 255), width=2)


def draw_walls(draw):
    gate_left = 704
    gate_right = 832

    for x in range(64, WIDTH - 96, 48):
        if not (gate_left - 24 <= x <= gate_right):
            draw_stone_block(draw, x, 38)
    for x in range(64, WIDTH - 96, 48):
        draw_stone_block(draw, x, HEIGHT - 82)
    for y in range(74, HEIGHT - 112, 40):
        draw_stone_block(draw, 46, y, 40, 42)
        draw_stone_block(draw, WIDTH - 88, y, 40, 42)

    draw.rectangle((gate_left - 24, 46, gate_right + 24, 92), fill=(55, 95, 37, 255))
    draw.rectangle((gate_left, 0, gate_right, 108), fill=PATH)


def draw_path(draw, nodes, width=74):
    for a, b in zip(nodes, nodes[1:]):
        draw.line((a[0], a[1], b[0], b[1]), fill=PATH_EDGE, width=width + 28)
        draw.line((a[0], a[1], b[0], b[1]), fill=PATH, width=width)
    for x, y in nodes:
        r = width // 2
        draw.ellipse((x - r - 14, y - r - 14, x + r + 14, y + r + 14), fill=PATH_EDGE)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=PATH)


def draw_clearings(draw):
    for x, y, w, h in CLEARINGS:
        draw.ellipse((x - w // 2 - 20, y - h // 2 - 18, x + w // 2 + 20, y + h // 2 + 18), fill=PATH_EDGE)
        draw.ellipse((x - w // 2, y - h // 2, x + w // 2, y + h // 2), fill=PATH)
        for _ in range(18):
            px = random.randrange(x - w // 2 + 10, x + w // 2 - 10)
            py = random.randrange(y - h // 2 + 10, y + h // 2 - 10)
            draw.rectangle((px, py, px + 8, py + 5), fill=(108, 111, 88, 255))


def draw_path_network(draw):
    draw_clearings(draw)
    for nodes in PATHS:
        draw_path(draw, nodes)

    for _ in range(140):
        x = random.randrange(170, WIDTH - 170)
        y = random.randrange(105, HEIGHT - 130)
        if random.random() < 0.6:
            draw.rectangle((x, y, x + 8, y + 4), fill=(96, 102, 82, 255))


def draw_bush(draw, x, y, scale=1.0):
    s = scale
    draw.ellipse((x - 34 * s, y - 14 * s, x + 30 * s, y + 34 * s), fill=(29, 85, 36, 255))
    draw.ellipse((x - 24 * s, y - 24 * s, x + 22 * s, y + 18 * s), fill=(58, 123, 48, 255))
    draw.ellipse((x - 10 * s, y - 16 * s, x + 34 * s, y + 24 * s), fill=(77, 145, 56, 255))


def draw_tree(draw, x, y, scale=1.0):
    s = scale
    draw.rectangle((x - 10 * s, y + 34 * s, x + 11 * s, y + 76 * s), fill=(105, 66, 34, 255))
    draw.ellipse((x - 58 * s, y - 42 * s, x + 58 * s, y + 54 * s), fill=(28, 88, 35, 255))
    draw.ellipse((x - 47 * s, y - 50 * s, x + 45 * s, y + 38 * s), fill=(54, 123, 48, 255))
    draw.ellipse((x - 30 * s, y - 31 * s, x + 36 * s, y + 35 * s), fill=(78, 151, 57, 255))


def draw_stump(draw, x, y):
    draw.ellipse((x - 24, y - 12, x + 24, y + 14), fill=(89, 52, 27, 255))
    draw.ellipse((x - 18, y - 16, x + 18, y + 8), fill=(151, 92, 43, 255))
    draw.ellipse((x - 10, y - 10, x + 10, y + 4), outline=(92, 55, 29, 255), width=3)
    draw.rectangle((x - 22, y + 2, x + 22, y + 28), fill=(110, 64, 31, 255))


def draw_pond(draw, x, y, w, h):
    draw.ellipse((x - w // 2 - 12, y - h // 2 - 10, x + w // 2 + 12, y + h // 2 + 10), fill=(37, 84, 70, 255))
    draw.ellipse((x - w // 2, y - h // 2, x + w // 2, y + h // 2), fill=WATER_DARK)
    draw.ellipse((x - w // 2 + 10, y - h // 2 + 8, x + w // 2 - 12, y + h // 2 - 10), fill=WATER)
    for dx, dy in [(-30, 4), (18, -10), (45, 15)]:
        draw.ellipse((x + dx - 8, y + dy - 4, x + dx + 10, y + dy + 5), fill=(76, 138, 67, 255))


def draw_broken_fence(draw, x, y, pieces=4, horizontal=True):
    for i in range(pieces):
        if random.random() < 0.25:
            continue
        ox = i * 34 if horizontal else 0
        oy = 0 if horizontal else i * 34
        draw.rectangle((x + ox, y + oy, x + ox + 8, y + oy + 42), fill=WOOD_DARK)
        if horizontal:
            draw.rectangle((x + ox - 6, y + 12, x + ox + 35, y + 19), fill=WOOD)
            draw.rectangle((x + ox - 4, y + 28, x + ox + 30, y + 34), fill=WOOD)
        else:
            draw.rectangle((x + ox - 11, y + oy + 8, x + ox + 27, y + oy + 15), fill=WOOD)
            draw.rectangle((x + ox - 8, y + oy + 25, x + ox + 24, y + oy + 31), fill=WOOD)


def draw_column(draw, x, y, broken=False):
    draw.ellipse((x - 26, y + 48, x + 26, y + 70), fill=(47, 52, 50, 105))
    h = 92 if not broken else 58
    draw.rectangle((x - 18, y, x + 18, y + h), fill=STONE)
    draw.rectangle((x - 11, y + 4, x + 11, y + h - 6), fill=STONE_LIGHT)
    draw.rectangle((x - 25, y - 8, x + 25, y + 8), fill=STONE_DARK)
    draw.rectangle((x - 25, y + h - 6, x + 25, y + h + 10), fill=STONE_DARK)
    if broken:
        draw.polygon([(x - 18, y), (x + 18, y), (x + 8, y - 16), (x - 8, y - 9)], fill=STONE_DARK)


def draw_mushrooms(draw, x, y):
    for dx, dy, color in [(-10, 8, (195, 65, 48, 255)), (12, 0, (227, 82, 58, 255)), (28, 13, (151, 63, 154, 255))]:
        draw.rectangle((x + dx - 3, y + dy + 7, x + dx + 3, y + dy + 20), fill=(215, 193, 144, 255))
        draw.ellipse((x + dx - 14, y + dy - 2, x + dx + 14, y + dy + 12), fill=color)
        draw.rectangle((x + dx - 5, y + dy + 3, x + dx, y + dy + 7), fill=(242, 218, 156, 255))


def draw_flower_patch(draw, x, y, color=(184, 116, 190, 255)):
    for dx, dy in [(-18, 4), (0, -6), (16, 8), (30, -2), (-8, 18)]:
        draw.rectangle((x + dx, y + dy + 8, x + dx + 4, y + dy + 18), fill=(35, 103, 39, 255))
        draw.ellipse((x + dx - 5, y + dy - 3, x + dx + 9, y + dy + 9), fill=color)
        draw.rectangle((x + dx + 1, y + dy + 1, x + dx + 5, y + dy + 5), fill=(226, 197, 47, 255))


def draw_monster_plant(draw, x, y, scale=1.0):
    s = scale
    draw.rectangle((x - 7 * s, y + 24 * s, x + 8 * s, y + 62 * s), fill=(35, 112, 35, 255))
    draw.ellipse((x - 54 * s, y - 8 * s, x + 18 * s, y + 70 * s), fill=(41, 126, 42, 255))
    draw.ellipse((x - 48 * s, y - 20 * s, x + 42 * s, y + 42 * s), fill=(94, 170, 43, 255))
    draw.ellipse((x - 35 * s, y - 6 * s, x + 33 * s, y + 33 * s), fill=(42, 32, 25, 255))
    for i in range(5):
        tx = x - 25 * s + i * 12 * s
        draw.polygon([(tx, y - 3 * s), (tx + 7 * s, y + 13 * s), (tx + 14 * s, y - 3 * s)], fill=(239, 209, 107, 255))
    draw.ellipse((x - 62 * s, y + 45 * s, x - 6 * s, y + 86 * s), fill=(47, 129, 45, 255))
    draw.ellipse((x + 8 * s, y + 45 * s, x + 66 * s, y + 84 * s), fill=(51, 137, 47, 255))


def draw_poison_flower(draw, x, y, scale=1.0):
    s = scale
    draw.rectangle((x - 5 * s, y + 26 * s, x + 5 * s, y + 70 * s), fill=(41, 112, 39, 255))
    for angle in range(8):
        dx = random.choice([-1, 1]) * (24 + angle % 2 * 6) * s
        dy = random.choice([-1, 1]) * (16 + angle % 3 * 5) * s
        draw.ellipse((x + dx - 20 * s, y + dy - 16 * s, x + dx + 20 * s, y + dy + 16 * s), fill=(145, 73, 181, 255))
    draw.ellipse((x - 22 * s, y - 20 * s, x + 22 * s, y + 24 * s), fill=(210, 180, 38, 255))
    draw.ellipse((x - 45 * s, y + 52 * s, x - 4 * s, y + 82 * s), fill=(48, 132, 47, 255))
    draw.ellipse((x + 4 * s, y + 52 * s, x + 47 * s, y + 82 * s), fill=(48, 132, 47, 255))


def draw_overgrowth(draw):
    dense_zones = [
        (140, 155, 320, 265),
        (1220, 140, 1380, 285),
        (175, 835, 340, 940),
        (1220, 845, 1390, 940),
        (122, 430, 245, 610),
        (1320, 500, 1430, 690),
    ]
    for rect in dense_zones:
        rough_rect(draw, rect, (49, 104, 36, 185), (32, 82, 30, 160), 55)
        x0, y0, x1, y1 = rect
        for _ in range(12):
            draw_bush(draw, random.randrange(x0, x1), random.randrange(y0, y1), random.uniform(0.65, 1.0))


def draw_decor(draw):
    draw_overgrowth(draw)

    for args in [(220, 250, 0.9), (1280, 260, 0.78), (190, 780, 0.72), (1330, 780, 0.82), (148, 548, 0.62)]:
        draw_tree(draw, *args)

    for x, y in [(330, 450), (940, 255), (1210, 610), (585, 745), (700, 395), (265, 900)]:
        draw_stump(draw, x, y)

    draw_pond(draw, 305, 560, 140, 82)
    draw_pond(draw, 1190, 265, 154, 92)
    draw_pond(draw, 935, 835, 126, 72)

    draw_broken_fence(draw, 235, 690, 5, True)
    draw_broken_fence(draw, 1030, 575, 5, True)
    draw_broken_fence(draw, 1280, 350, 4, False)
    draw_broken_fence(draw, 500, 210, 4, True)

    for x, y, broken in [(665, 430, False), (710, 418, True), (860, 432, False), (900, 425, True), (1060, 615, True), (1105, 612, False)]:
        draw_column(draw, x, y, broken)

    for x, y in [(270, 325), (1150, 410), (1015, 800), (430, 875), (1345, 230), (575, 610)]:
        draw_mushrooms(draw, x, y)

    for x, y, color in [
        (500, 315, (187, 114, 203, 255)),
        (1088, 312, (221, 145, 44, 255)),
        (405, 665, (230, 206, 61, 255)),
        (790, 735, (180, 110, 190, 255)),
        (1225, 830, (224, 145, 41, 255)),
    ]:
        draw_flower_patch(draw, x, y, color)

    draw_monster_plant(draw, 230, 395, 0.7)
    draw_monster_plant(draw, 1310, 620, 0.62)
    draw_poison_flower(draw, 1140, 895, 0.55)


def point_segment_distance(px, py, ax, ay, bx, by):
    dx = bx - ax
    dy = by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5

    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx = ax + t * dx
    cy = ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def make_collision():
    cols = WIDTH // TILE_SIZE
    rows = HEIGHT // TILE_SIZE
    collision = [[1 for _ in range(cols)] for _ in range(rows)]

    def open_tile(tx, ty):
        if 0 <= tx < cols and 0 <= ty < rows:
            collision[ty][tx] = 0

    def open_rect(x0, y0, x1, y1):
        for ty in range(max(0, y0 // TILE_SIZE), min(rows, (y1 + TILE_SIZE - 1) // TILE_SIZE)):
            for tx in range(max(0, x0 // TILE_SIZE), min(cols, (x1 + TILE_SIZE - 1) // TILE_SIZE)):
                open_tile(tx, ty)

    def open_ellipse(cx, cy, w, h):
        rx = w / 2
        ry = h / 2
        for ty in range(max(0, int((cy - ry) // TILE_SIZE)), min(rows, int((cy + ry) // TILE_SIZE) + 1)):
            for tx in range(max(0, int((cx - rx) // TILE_SIZE)), min(cols, int((cx + rx) // TILE_SIZE) + 1)):
                px = tx * TILE_SIZE + TILE_SIZE / 2
                py = ty * TILE_SIZE + TILE_SIZE / 2
                if ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1:
                    open_tile(tx, ty)

    def open_path(nodes, radius=44):
        for ax, ay in nodes:
            open_ellipse(ax, ay, radius * 2, radius * 2)
        for (ax, ay), (bx, by) in zip(nodes, nodes[1:]):
            x0 = max(0, min(ax, bx) - radius)
            x1 = min(WIDTH, max(ax, bx) + radius)
            y0 = max(0, min(ay, by) - radius)
            y1 = min(HEIGHT, max(ay, by) + radius)
            for ty in range(y0 // TILE_SIZE, min(rows, y1 // TILE_SIZE + 1)):
                for tx in range(x0 // TILE_SIZE, min(cols, x1 // TILE_SIZE + 1)):
                    px = tx * TILE_SIZE + TILE_SIZE / 2
                    py = ty * TILE_SIZE + TILE_SIZE / 2
                    if point_segment_distance(px, py, ax, ay, bx, by) <= radius:
                        open_tile(tx, ty)

    open_rect(704, 0, 832, 135)
    for clearing in CLEARINGS:
        open_ellipse(*clearing)
    for path in PATHS:
        open_path(path)

    return collision


def main():
    random.seed(19)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img = make_grass()
    draw = ImageDraw.Draw(img)
    draw_path_network(draw)
    draw_decor(draw)
    draw_walls(draw)

    img.save(OUT_MAP)
    OUT_COLLISION.write_text(
        f"export const collisionMap = {json.dumps(make_collision())};\n",
        encoding="utf-8",
    )
    print(OUT_MAP)


if __name__ == "__main__":
    main()
