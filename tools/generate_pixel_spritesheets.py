from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DIRECTIONS = ("down", "up", "left", "right")
FRAME = 32

NPCS = {
    "guard": {"role": "guard", "coat": (72, 88, 116), "trim": (198, 214, 229), "accent": (221, 180, 70)},
    "baker": {"role": "baker", "coat": (222, 178, 116), "trim": (255, 244, 218), "accent": (176, 104, 62)},
    "beekeeper": {"role": "beekeeper", "coat": (205, 166, 68), "trim": (246, 235, 166), "accent": (84, 82, 62)},
    "herbalist": {"role": "herbalist", "coat": (74, 134, 84), "trim": (177, 218, 135), "accent": (112, 80, 54)},
    "road_scout": {"role": "scout", "coat": (92, 106, 103), "trim": (195, 184, 140), "accent": (92, 70, 52)},
    "spice_merchant": {"role": "merchant", "coat": (145, 82, 62), "trim": (225, 179, 84), "accent": (73, 91, 142)},
}

MOBS = {
    "carnivorous_plant": {"body": (73, 146, 76), "shade": (38, 92, 55), "accent": (195, 61, 70)},
    "fungus_monster": {"body": (156, 84, 128), "shade": (88, 54, 91), "accent": (232, 205, 158)},
}


def rect(draw: ImageDraw.ImageDraw, box, fill, outline=(28, 33, 34)):
    draw.rectangle(box, fill=outline)
    x1, y1, x2, y2 = box
    draw.rectangle((x1 + 1, y1 + 1, x2 - 1, y2 - 1), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=(28, 33, 34)):
    draw.ellipse(box, fill=outline)
    x1, y1, x2, y2 = box
    draw.ellipse((x1 + 1, y1 + 1, x2 - 1, y2 - 1), fill=fill)


def draw_cat_base(draw: ImageDraw.ImageDraw, palette, direction: str, frame_index: int, state: str):
    attack = state == "attack"
    bob = 1 if state == "walk" and frame_index % 2 else 0
    lunge = 2 if attack and frame_index in (1, 2) else 0
    step = (-2, 2, 1, -1)[frame_index % 4] if state == "walk" else 0
    coat = palette["coat"]
    trim = palette["trim"]
    accent = palette["accent"]
    role = palette["role"]

    dx = 0
    dy = 0
    if attack:
        dx = {"left": -lunge, "right": lunge}.get(direction, 0)
        dy = {"up": -lunge, "down": lunge}.get(direction, 0)

    fur = (213, 157, 99)
    dark = (37, 42, 42)

    # Tail, readable even at 2x scale.
    tail_swing = (-1, 1, 0, -1)[frame_index % 4] if state != "idle" else frame_index % 2
    if direction in ("left", "right"):
        tail_x = 23 if direction == "left" else 6
        draw.line((tail_x, 21 + bob, tail_x - tail_swing * (1 if direction == "left" else -1), 28 + bob), fill=dark, width=3)
        draw.line((tail_x, 21 + bob, tail_x - tail_swing * (1 if direction == "left" else -1), 28 + bob), fill=fur, width=1)
    else:
        draw.line((24 + tail_swing, 20 + bob, 27 + tail_swing, 27 + bob), fill=dark, width=3)
        draw.line((24 + tail_swing, 20 + bob, 27 + tail_swing, 27 + bob), fill=fur, width=1)

    # Head and ears.
    draw.polygon(((11 + dx, 6 + dy + bob), (8 + dx, 2 + dy + bob), (9 + dx, 11 + dy + bob)), fill=dark)
    draw.polygon(((21 + dx, 6 + dy + bob), (24 + dx, 2 + dy + bob), (23 + dx, 11 + dy + bob)), fill=dark)
    draw.polygon(((12 + dx, 6 + dy + bob), (9 + dx, 3 + dy + bob), (10 + dx, 10 + dy + bob)), fill=coat)
    draw.polygon(((20 + dx, 6 + dy + bob), (23 + dx, 3 + dy + bob), (22 + dx, 10 + dy + bob)), fill=coat)
    ellipse(draw, (10 + dx, 5 + dy + bob, 22 + dx, 16 + dy + bob), fur)

    if direction == "down":
        draw.rectangle((12 + dx, 10 + dy + bob, 14 + dx, 12 + dy + bob), fill=dark)
        draw.rectangle((18 + dx, 10 + dy + bob, 20 + dx, 12 + dy + bob), fill=dark)
        draw.rectangle((15 + dx, 13 + dy + bob, 17 + dx, 14 + dy + bob), fill=(103, 68, 52))
    elif direction == "up":
        draw.rectangle((12 + dx, 7 + dy + bob, 20 + dx, 10 + dy + bob), fill=coat)
    else:
        eye_x = 19 if direction == "right" else 12
        draw.rectangle((eye_x + dx, 10 + dy + bob, eye_x + 2 + dx, 12 + dy + bob), fill=dark)

    # Body and clothing.
    rect(draw, (10 + dx, 15 + dy + bob, 22 + dx, 26 + dy + bob), coat)
    draw.rectangle((12 + dx, 16 + dy + bob, 20 + dx, 18 + dy + bob), fill=trim)
    draw.rectangle((15 + dx, 18 + dy + bob, 17 + dx, 25 + dy + bob), fill=accent)
    draw.rectangle((8 + dx, 18 + dy + bob, 11 + dx, 24 + dy + bob), fill=coat)
    draw.rectangle((21 + dx, 18 + dy + bob, 24 + dx, 24 + dy + bob), fill=coat)

    if attack:
        arm_shift = 5 if direction == "right" else -5 if direction == "left" else 0
        arm_y = -4 if direction == "up" else 4 if direction == "down" else 0
        draw.line((16 + dx, 20 + dy, 16 + dx + arm_shift, 20 + dy + arm_y), fill=dark, width=3)
        draw.line((16 + dx, 20 + dy, 16 + dx + arm_shift, 20 + dy + arm_y), fill=trim, width=1)

    draw.rectangle((11 + dx + min(step, 0), 26 + dy + bob, 14 + dx + min(step, 0), 29 + dy + bob), fill=dark)
    draw.rectangle((18 + dx + max(step, 0), 26 + dy + bob, 21 + dx + max(step, 0), 29 + dy + bob), fill=dark)

    draw_profession_detail(draw, role, direction, frame_index, dx, dy, bob, accent, trim, dark)


def draw_profession_detail(draw, role, direction, frame_index, dx, dy, bob, accent, trim, dark):
    if role == "guard":
        draw.line((25 + dx, 11 + dy, 25 + dx, 29 + dy), fill=dark, width=2)
        draw.line((25 + dx, 11 + dy, 25 + dx, 29 + dy), fill=(207, 211, 204), width=1)
        draw.polygon(((25 + dx, 8 + dy), (22 + dx, 13 + dy), (28 + dx, 13 + dy)), fill=(207, 211, 204))
        draw.rectangle((7 + dx, 17 + dy + bob, 10 + dx, 23 + dy + bob), fill=accent)
    elif role == "baker":
        ellipse(draw, (9 + dx, 1 + dy + bob, 23 + dx, 8 + dy + bob), trim)
        draw.rectangle((6 + dx, 20 + dy + bob, 10 + dx, 25 + dy + bob), fill=(193, 123, 57))
    elif role == "beekeeper":
        draw.rectangle((10 + dx, 7 + dy + bob, 22 + dx, 16 + dy + bob), outline=dark, fill=(238, 224, 155))
        for x in (13, 16, 19):
            draw.line((x + dx, 7 + dy + bob, x + dx, 16 + dy + bob), fill=(111, 99, 62), width=1)
    elif role == "herbalist":
        draw.line((8 + dx, 22 + dy + bob, 5 + dx, 17 + dy + bob), fill=(93, 67, 45), width=2)
        draw.ellipse((3 + dx, 14 + dy + bob, 8 + dx, 18 + dy + bob), fill=(112, 185, 96))
        draw.rectangle((19 + dx, 20 + dy + bob, 23 + dx, 23 + dy + bob), fill=(112, 185, 96))
    elif role == "scout":
        draw.line((7 + dx, 12 + dy, 7 + dx, 29 + dy), fill=(104, 76, 52), width=2)
        draw.rectangle((18 + dx, 4 + dy + bob, 22 + dx, 7 + dy + bob), fill=trim)
    elif role == "merchant":
        draw.rectangle((6 + dx, 20 + dy + bob, 10 + dx, 27 + dy + bob), fill=accent)
        draw.rectangle((22 + dx, 19 + dy + bob, 27 + dx, 25 + dy + bob), fill=(167, 107, 55))


def draw_npc_frame(draw: ImageDraw.ImageDraw, palette, direction: str, frame_index: int, state: str) -> None:
    draw_cat_base(draw, palette, direction, frame_index, state)


def draw_plant_frame(draw: ImageDraw.ImageDraw, palette, direction: str, frame_index: int, state: str) -> None:
    attack = state == "attack"
    sway = ((frame_index % 4) - 1) if state == "walk" else frame_index % 2
    snap = 3 if attack and frame_index in (1, 2) else 0
    body = palette["body"]
    shade = palette["shade"]
    accent = palette["accent"]

    draw.rectangle((14, 20, 18, 29), fill=shade)
    ellipse(draw, (8 + sway, 6 - snap, 24 + sway, 22 - snap), body)
    draw.polygon(((10 + sway, 14 - snap), (5 + sway, 18 - snap), (13 + sway, 19 - snap)), fill=shade)
    draw.polygon(((22 + sway, 14 - snap), (27 + sway, 18 - snap), (19 + sway, 19 - snap)), fill=shade)
    draw.ellipse((12 + sway, 10 - snap, 20 + sway, 18 - snap), fill=accent)
    jaw = 3 if attack and frame_index == 2 else 0
    draw.rectangle((13 + sway, 14 - snap, 19 + sway, 16 + jaw - snap), fill=(248, 230, 168))


def draw_fungus_frame(draw: ImageDraw.ImageDraw, palette, direction: str, frame_index: int, state: str) -> None:
    attack = state == "attack"
    bob = 1 if state == "walk" and frame_index % 2 else 0
    lean = -1 if direction == "left" else 1 if direction == "right" else 0
    punch = 3 if attack and frame_index in (1, 2) else 0
    body = palette["body"]
    shade = palette["shade"]
    accent = palette["accent"]

    ellipse(draw, (8 + lean, 6 + bob, 24 + lean, 18 + bob), body)
    rect(draw, (12 + lean, 15 + bob, 20 + lean, 27 + bob), shade)
    draw.rectangle((11 + lean, 22 + bob, 14 + lean, 29 + bob), fill=shade)
    draw.rectangle((18 + lean, 22 + bob, 21 + lean, 29 + bob), fill=shade)
    arm_x = punch if direction == "right" else -punch if direction == "left" else 0
    draw.line((12 + lean, 20 + bob, 7 + lean + arm_x, 23 + bob), fill=(49, 38, 59), width=3)
    draw.line((20 + lean, 20 + bob, 25 + lean + arm_x, 23 + bob), fill=(49, 38, 59), width=3)
    draw.rectangle((12 + lean, 10 + bob, 14 + lean, 12 + bob), fill=accent)
    draw.rectangle((18 + lean, 9 + bob, 20 + lean, 11 + bob), fill=accent)
    draw.rectangle((15 + lean, 20 + bob, 17 + lean, 22 + bob), fill=accent)


def make_sheet(path: Path, state: str, frames: int, draw_func, palette) -> None:
    sheet = Image.new("RGBA", (FRAME * frames, FRAME * len(DIRECTIONS)), (0, 0, 0, 0))
    for row, direction in enumerate(DIRECTIONS):
        for frame in range(frames):
            tile = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
            draw_func(ImageDraw.Draw(tile), palette, direction, frame, state)
            sheet.alpha_composite(tile, (frame * FRAME, row * FRAME))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def main() -> None:
    for npc, palette in NPCS.items():
        out_dir = ROOT / "assets" / "npcs" / npc
        make_sheet(out_dir / f"{npc}_idle.png", "idle", 2, draw_npc_frame, palette)
        make_sheet(out_dir / f"{npc}_walk.png", "walk", 4, draw_npc_frame, palette)
        make_sheet(out_dir / f"{npc}_attack.png", "attack", 4, draw_npc_frame, palette)

    for mob, palette in MOBS.items():
        out_dir = ROOT / "assets" / "mobs" / mob
        draw_func = draw_plant_frame if mob == "carnivorous_plant" else draw_fungus_frame
        make_sheet(out_dir / f"{mob}_idle.png", "idle", 2, draw_func, palette)
        make_sheet(out_dir / f"{mob}_walk.png", "walk", 4, draw_func, palette)
        make_sheet(out_dir / f"{mob}_attack.png", "attack", 4, draw_func, palette)


if __name__ == "__main__":
    main()
