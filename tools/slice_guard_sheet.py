from __future__ import annotations

from pathlib import Path

from PIL import Image

from slice_sprite_sheet import BG_THRESHOLD, FRAME_SIZE, fit_to_frame, remove_background


INPUT_FILE = "assets/source/npc_guard.png"
OUTPUT_ROOT = "assets/npcs/guard"
DEBUG_ROOT = "debug_slices_guard"

# Manual coordinates for assets/source/npc_guard.png.
# The source is a 4-column / 6-row sheet with large painted frames, not a 32x32 grid.
# Adjust only these boxes if a frame needs tighter centering.
CELLS = {
    "r1c1": [55, 70, 225, 300],
    "r1c2": [292, 70, 462, 300],
    "r1c3": [550, 70, 720, 300],
    "r1c4": [782, 70, 960, 300],
    "r2c1": [55, 310, 225, 535],
    "r2c2": [292, 310, 462, 535],
    "r2c3": [550, 310, 720, 535],
    "r2c4": [782, 310, 960, 535],
    "r3c1": [55, 545, 225, 770],
    "r3c2": [292, 545, 462, 770],
    "r3c3": [550, 545, 720, 770],
    "r3c4": [782, 545, 960, 770],
    "r4c1": [55, 785, 225, 1010],
    "r4c2": [292, 785, 462, 1010],
    "r4c3": [550, 785, 720, 1010],
    "r4c4": [782, 785, 960, 1010],
    "r5c1": [55, 1020, 225, 1250],
    "r5c2": [292, 1020, 462, 1250],
    "r5c3": [550, 1020, 740, 1250],
    "r5c4": [782, 1020, 970, 1250],
    "r6c1": [55, 1260, 225, 1490],
    "r6c2": [292, 1260, 462, 1490],
    "r6c3": [550, 1260, 740, 1490],
    "r6c4": [782, 1260, 970, 1490],
}

SPRITES = {
    "idle": {
        "down": ["r1c1", "r1c2"],
        "up": ["r1c3", "r2c3"],
        "left": ["r5c3", "r6c3"],
        "right": ["r1c4", "r2c4"],
    },
    "walk": {
        "down": ["r1c1", "r2c1", "r3c1", "r4c1"],
        "up": ["r1c3", "r2c3", "r3c3", "r4c3"],
        "left": ["r3c3", "r4c3", "r5c3", "r6c3"],
        "right": ["r3c4", "r4c4", "r5c4", "r6c4"],
    },
    "attack": {
        "down": ["r3c1", "r3c2", "r4c1", "r4c2"],
        "up": ["r3c3", "r4c3", "r5c3", "r6c3"],
        "left": ["r3c3", "r4c3", "r5c3", "r6c3"],
        "right": ["r3c4", "r4c4", "r5c4", "r6c4"],
    },
}


def save_frame(source: Image.Image, bg_color: tuple[int, int, int, int], animation: str, direction: str, index: int, cell: str) -> int:
    out_dir = Path(OUTPUT_ROOT) / animation / direction
    debug_dir = Path(DEBUG_ROOT) / animation / direction
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    box = CELLS[cell]
    filename = f"guard_{animation}_{direction}_{index:02d}.png"
    crop = source.crop(tuple(box))
    cleaned = remove_background(crop, bg_color, BG_THRESHOLD)
    cleaned.save(debug_dir / filename)

    frame, empty = fit_to_frame(cleaned, FRAME_SIZE)
    if empty:
        print(f"WARNING empty crop: {animation}/{direction} #{index} cell={cell} box={box}")
    frame.save(out_dir / filename)
    print(f"saved {out_dir / filename} | cell={cell} box={box}")
    return 1


def main() -> None:
    source_path = Path(INPUT_FILE)
    print(f"opening {source_path}")
    source = Image.open(source_path).convert("RGBA")
    bg_color = source.getpixel((0, 0))
    print(f"source size: {source.width}x{source.height}")
    print(f"background color: {bg_color}, threshold={BG_THRESHOLD}")

    saved = 0
    for animation, directions in SPRITES.items():
        for direction, cells in directions.items():
            for index, cell in enumerate(cells, start=1):
                saved += save_frame(source, bg_color, animation, direction, index, cell)

    print("")
    print(f"saved frames: {saved}")
    print(f"output: {Path(OUTPUT_ROOT).resolve()}")
    print(f"debug preview: {Path(DEBUG_ROOT).resolve()}")


if __name__ == "__main__":
    main()
