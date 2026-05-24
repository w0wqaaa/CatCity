from pathlib import Path
import json
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CITY_MAP = ROOT / "assets" / "maps" / "city" / "background.png"
OUT_DIR = ROOT / "assets" / "maps" / "south_outskirts"
OUT_MAP = OUT_DIR / "background.png"
OUT_COLLISION = ROOT / "src" / "maps" / "southOutskirtsCollisionMap.js"

WIDTH = 1536
HEIGHT = 1024
TILE_SIZE = 8

GRASS = (77, 126, 30, 255)
PATH = (126, 128, 107, 255)
PATH_EDGE = (89, 111, 88, 255)
WOOD = (147, 77, 31, 255)
WOOD_DARK = (86, 44, 22, 255)


def make_grass():
    random.seed(11)
    img = Image.new("RGBA", (WIDTH, HEIGHT), GRASS)
    px = img.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            n = random.randrange(-9, 10)
            px[x, y] = (
                max(0, min(255, GRASS[0] + n)),
                max(0, min(255, GRASS[1] + n)),
                max(0, min(255, GRASS[2] + n // 2)),
                255,
            )
    img = img.filter(ImageFilter.GaussianBlur(0.25))
    draw = ImageDraw.Draw(img)

    for _ in range(220):
        x = random.randrange(0, WIDTH)
        y = random.randrange(130, HEIGHT)
        color = random.choice([(43, 92, 27, 95), (97, 149, 43, 85), (61, 112, 32, 75)])
        draw.rectangle((x, y, x + random.randrange(3, 11), y + random.randrange(2, 7)), fill=color)

    for _ in range(55):
        x = random.randrange(0, WIDTH)
        y = random.randrange(150, HEIGHT)
        color = random.choice([(223, 145, 15, 240), (230, 197, 29, 230)])
        draw.rectangle((x, y, x + 4, y + 4), fill=color)

    return img


def draw_path_network(draw):
    rects = [
        (704, 0, 832, 1024),      # main road from the south gate
        (330, 470, 1206, 598),    # central crossroad
        (420, 520, 548, 838),     # west branch
        (988, 520, 1116, 838),    # east branch
        (250, 720, 548, 838),     # west lower lane
        (988, 720, 1288, 838),    # east lower lane
    ]

    for x0, y0, x1, y1 in rects:
        draw.rectangle((x0 - 16, y0, x1 + 16, y1), fill=PATH_EDGE)
        draw.rectangle((x0, y0, x1, y1), fill=PATH)

    # Square off the central crossing so all lanes meet cleanly.
    draw.rectangle((704, 470, 832, 598), fill=PATH)
    draw.rectangle((420, 720, 548, 838), fill=PATH)
    draw.rectangle((988, 720, 1116, 838), fill=PATH)

    # Pixel-like rough edges.
    for x0, y0, x1, y1 in rects:
        for x in range(x0, x1, 16):
            if random.random() < 0.55:
                draw.rectangle((x, y0 - 4, x + 8, y0), fill=PATH_EDGE)
            if random.random() < 0.55:
                draw.rectangle((x, y1, x + 8, y1 + 4), fill=PATH_EDGE)
        for y in range(y0, y1, 16):
            if random.random() < 0.45:
                draw.rectangle((x0 - 4, y, x0, y + 8), fill=PATH_EDGE)
            if random.random() < 0.45:
                draw.rectangle((x1, y, x1 + 4, y + 8), fill=PATH_EDGE)

    return rects


def draw_round_tree(draw, x, y, scale=1.0):
    s = scale
    draw.rectangle((x - 10 * s, y + 42 * s, x + 12 * s, y + 86 * s), fill=(115, 64, 29, 255))
    draw.ellipse((x - 63 * s, y - 35 * s, x + 63 * s, y + 66 * s), fill=(38, 94, 32, 255))
    draw.ellipse((x - 52 * s, y - 45 * s, x + 48 * s, y + 48 * s), fill=(68, 136, 44, 255))
    draw.ellipse((x - 37 * s, y - 29 * s, x + 38 * s, y + 42 * s), fill=(85, 158, 53, 255))


def draw_pine(draw, x, y, scale=1.0):
    s = scale
    draw.rectangle((x - 9 * s, y + 82 * s, x + 10 * s, y + 122 * s), fill=(109, 61, 30, 255))
    for i, w in enumerate([76, 62, 48]):
        yy = y + i * 33 * s
        draw.polygon([(x, yy - 70 * s), (x - w * s, yy + 58 * s), (x + w * s, yy + 58 * s)],
                     fill=(27 + i * 8, 101 + i * 14, 34 + i * 5, 255))


def draw_crate(draw, x, y):
    draw.rectangle((x, y, x + 54, y + 46), fill=WOOD)
    draw.rectangle((x + 6, y + 6, x + 48, y + 40), outline=WOOD_DARK, width=4)
    draw.line((x + 8, y + 8, x + 46, y + 38), fill=WOOD_DARK, width=3)
    draw.line((x + 46, y + 8, x + 8, y + 38), fill=WOOD_DARK, width=3)


def draw_cart(draw, x, y):
    draw.rectangle((x, y + 18, x + 96, y + 62), fill=(132, 73, 35, 255))
    draw.rectangle((x + 8, y + 25, x + 88, y + 54), fill=(172, 95, 41, 255))
    draw.rectangle((x + 20, y + 4, x + 62, y + 34), fill=(43, 86, 131, 255))
    draw.rectangle((x + 26, y + 10, x + 56, y + 30), fill=(68, 122, 173, 255))
    draw.line((x - 22, y + 40, x + 7, y + 40), fill=WOOD_DARK, width=5)
    draw.line((x + 90, y + 40, x + 124, y + 32), fill=WOOD_DARK, width=5)
    draw.ellipse((x + 8, y + 50, x + 34, y + 76), fill=WOOD_DARK)
    draw.ellipse((x + 66, y + 50, x + 92, y + 76), fill=WOOD_DARK)
    draw.ellipse((x + 15, y + 57, x + 27, y + 69), fill=(212, 156, 69, 255))
    draw.ellipse((x + 73, y + 57, x + 85, y + 69), fill=(212, 156, 69, 255))


def draw_well(draw, x, y):
    draw.ellipse((x - 40, y + 26, x + 40, y + 64), fill=(67, 76, 72, 255))
    draw.ellipse((x - 32, y + 30, x + 32, y + 56), fill=(37, 45, 51, 255))
    draw.rectangle((x - 34, y + 12, x + 34, y + 42), fill=(98, 104, 94, 255))
    draw.rectangle((x - 26, y + 18, x + 26, y + 38), fill=(129, 135, 119, 255))
    draw.line((x - 48, y + 14, x + 48, y + 14), fill=WOOD_DARK, width=5)
    draw.rectangle((x - 42, y - 28, x - 34, y + 32), fill=WOOD_DARK)
    draw.rectangle((x + 34, y - 28, x + 42, y + 32), fill=WOOD_DARK)
    draw.polygon([(x - 50, y - 28), (x, y - 62), (x + 50, y - 28)], fill=(152, 75, 31, 255))


def draw_sign(draw, x, y):
    draw.rectangle((x - 6, y, x + 6, y + 58), fill=WOOD_DARK)
    draw.rectangle((x - 50, y + 5, x + 50, y + 28), fill=(164, 99, 47, 255))
    draw.rectangle((x - 45, y + 9, x + 45, y + 24), outline=WOOD_DARK, width=3)
    draw.polygon([(x + 50, y + 5), (x + 72, y + 16), (x + 50, y + 28)], fill=(164, 99, 47, 255))


def draw_gate_sign(draw, x, y, direction="left"):
    draw.rectangle((x - 7, y, x + 7, y + 70), fill=WOOD_DARK)
    draw.rectangle((x - 78, y + 7, x + 78, y + 35), fill=(176, 108, 53, 255))
    draw.rectangle((x - 70, y + 12, x + 70, y + 30), outline=WOOD_DARK, width=3)
    if direction == "left":
        draw.polygon([(x - 78, y + 7), (x - 112, y + 21), (x - 78, y + 35)], fill=(176, 108, 53, 255))
    else:
        draw.polygon([(x + 78, y + 7), (x + 112, y + 21), (x + 78, y + 35)], fill=(176, 108, 53, 255))
    draw.rectangle((x - 34, y + 18, x + 34, y + 24), fill=(91, 57, 29, 255))


def draw_beehives(draw, x, y):
    for offset in [0, 48, 96]:
        bx = x + offset
        draw.rectangle((bx, y + 20, bx + 34, y + 54), fill=(183, 132, 45, 255))
        draw.rectangle((bx + 4, y + 10, bx + 30, y + 20), fill=(220, 168, 64, 255))
        draw.rectangle((bx + 5, y + 28, bx + 29, y + 32), fill=(124, 83, 32, 255))
        draw.rectangle((bx + 5, y + 42, bx + 29, y + 46), fill=(124, 83, 32, 255))
        draw.ellipse((bx + 13, y + 34, bx + 22, y + 43), fill=(58, 44, 32, 255))
    for px, py in [(x + 6, y - 8), (x + 58, y + 1), (x + 112, y - 7), (x + 140, y + 20)]:
        draw.rectangle((px, py, px + 5, py + 4), fill=(234, 210, 59, 255))
        draw.rectangle((px + 5, py + 1, px + 8, py + 3), fill=(47, 43, 33, 255))


def draw_bench(draw, x, y):
    draw.rectangle((x, y, x + 115, y + 19), fill=WOOD)
    draw.rectangle((x, y + 20, x + 115, y + 34), fill=WOOD_DARK)
    draw.rectangle((x + 12, y + 34, x + 22, y + 58), fill=WOOD_DARK)
    draw.rectangle((x + 90, y + 34, x + 100, y + 58), fill=WOOD_DARK)


def draw_herb_patch(draw, x, y):
    draw.rectangle((x - 38, y + 34, x + 98, y + 52), fill=(83, 117, 70, 180))
    for dx, dy in [
        (-24, 18), (-6, 12), (13, 22), (32, 10), (54, 20),
        (74, 12), (-30, 38), (4, 42), (29, 36), (61, 42), (87, 35),
    ]:
        px = x + dx
        py = y + dy
        draw.rectangle((px, py + 10, px + 5, py + 25), fill=(35, 106, 39, 255))
        draw.rectangle((px - 7, py + 13, px + 3, py + 18), fill=(76, 157, 72, 255))
        draw.rectangle((px + 2, py + 9, px + 12, py + 15), fill=(95, 180, 82, 255))
        draw.rectangle((px + 2, py + 3, px + 8, py + 9), fill=(227, 209, 73, 255))


def draw_decor(draw):
    draw_round_tree(draw, 235, 675, 0.95)
    draw_round_tree(draw, 1250, 728, 0.78)
    draw_round_tree(draw, 308, 265, 0.68)
    draw_round_tree(draw, 1330, 305, 0.55)
    draw_pine(draw, 1210, 268, 0.72)
    draw_pine(draw, 1140, 802, 0.55)
    draw_cart(draw, 1138, 486)
    draw_bench(draw, 302, 366)
    draw_bench(draw, 1030, 335)
    draw_herb_patch(draw, 315, 745)
    draw_well(draw, 875, 708)
    draw_sign(draw, 640, 352)
    draw_gate_sign(draw, 890, 120, "left")
    draw_beehives(draw, 1088, 720)


def make_collision(path_rects):
    cols = WIDTH // TILE_SIZE
    rows = HEIGHT // TILE_SIZE
    collision = [[1 for _ in range(cols)] for _ in range(rows)]

    def open_rect(px0, py0, px1, py1):
        for ty in range(max(0, py0 // TILE_SIZE), min(rows, (py1 + TILE_SIZE - 1) // TILE_SIZE)):
            for tx in range(max(0, px0 // TILE_SIZE), min(cols, (px1 + TILE_SIZE - 1) // TILE_SIZE)):
                collision[ty][tx] = 0

    for rect in path_rects:
        open_rect(*rect)

    return collision


def main():
    random.seed(7)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    city = Image.open(CITY_MAP).convert("RGBA")

    img = make_grass()
    draw = ImageDraw.Draw(img)
    path_rects = draw_path_network(draw)

    # Copy the city bottom wall to the top of the new map, preserving the gate shape.
    top_fence = city.crop((0, 900, WIDTH, 1024))
    img.alpha_composite(top_fence, (0, 0))

    # Redraw the road through the opened gate so the connection reads clearly.
    draw.rectangle((704 - 16, 0, 832 + 16, 150), fill=PATH_EDGE)
    draw.rectangle((704, 0, 832, 150), fill=PATH)

    draw_decor(draw)

    img.save(OUT_MAP)
    OUT_COLLISION.write_text(
        f"export const collisionMap = {json.dumps(make_collision(path_rects))};\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
