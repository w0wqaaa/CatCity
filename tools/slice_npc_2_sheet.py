from __future__ import annotations

from pathlib import Path

from PIL import Image

from slice_sprite_sheet import BG_THRESHOLD, FRAME_SIZE, RESAMPLE, fit_to_frame, remove_background


INPUT_FILE = "assets/source/2.png"
FALLBACK_INPUT_FILE = "assets/source/npc_2.png"
OUTPUT_ROOT = "assets"
DEBUG_ROOT = "debug_slices_npc_2"

# Manual coordinates for assets/source/npc_2.png.
# These are intentionally easy to tune by hand: adjust only the box values.
SPRITES = [
    {
        "name": "guard",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [[35, 65, 170, 230], [205, 65, 335, 230]],
                "up": [[675, 65, 805, 230], [835, 65, 970, 230]],
                "left": [[675, 255, 805, 420], [835, 255, 970, 420]],
                "right": [[365, 65, 492, 230], [520, 65, 650, 230]],
            },
            "walk": {
                "down": [[35, 65, 170, 230], [205, 65, 335, 230], [365, 65, 492, 230], [520, 65, 650, 230]],
                "up": [[675, 65, 805, 230], [835, 65, 970, 230], [675, 255, 805, 420], [835, 255, 970, 420]],
                "left": [[675, 255, 805, 420], [835, 255, 970, 420]],
                "right": [[365, 65, 492, 230], [520, 65, 650, 230]],
            },
            "attack": {
                "down": [[35, 255, 170, 420], [205, 255, 335, 420], [365, 255, 492, 420], [520, 255, 650, 420]],
                "left": [[835, 65, 970, 230], [835, 255, 970, 420]],
                "right": [[520, 65, 650, 230], [520, 255, 650, 420]],
            },
        },
    },
    {
        "name": "herbalist",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [[45, 460, 170, 625], [205, 460, 330, 625]],
            },
            "walk": {
                "down": [[45, 460, 170, 625], [205, 460, 330, 625], [45, 650, 170, 815], [205, 650, 330, 815]],
                "right": [[360, 460, 490, 625], [520, 460, 650, 625], [360, 650, 490, 815], [520, 650, 650, 815]],
            },
            "attack": {
                "down": [[45, 840, 170, 1005], [205, 840, 330, 1005], [45, 1030, 170, 1200], [205, 1030, 330, 1200]],
            },
        },
    },
    {
        "name": "road_scout",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [[360, 460, 490, 625], [520, 460, 650, 625]],
            },
            "walk": {
                "down": [[360, 460, 490, 625], [520, 460, 650, 625], [360, 650, 490, 815], [520, 650, 650, 815]],
                "right": [[360, 840, 490, 1005], [520, 840, 650, 1005], [360, 1030, 490, 1200], [520, 1030, 650, 1200]],
            },
            "attack": {
                "down": [[360, 840, 490, 1005], [520, 840, 650, 1005], [360, 1030, 490, 1200], [520, 1030, 650, 1200]],
            },
        },
    },
    {
        "name": "beekeeper",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [[675, 840, 805, 1005], [835, 840, 970, 1005]],
            },
            "walk": {
                "down": [[675, 840, 805, 1005], [835, 840, 970, 1005], [675, 1030, 805, 1200], [835, 1030, 970, 1200]],
            },
            "attack": {
                "down": [[835, 840, 970, 1005], [835, 1030, 970, 1200]],
            },
        },
    },
    {
        "name": "carnivorous_plant",
        "type": "mob",
        "animations": {
            "idle": {
                "down": [[45, 1225, 180, 1380], [205, 1225, 340, 1380]],
            },
            "walk": {
                "down": [[45, 1225, 180, 1380], [205, 1225, 340, 1380], [365, 1225, 500, 1380], [525, 1225, 660, 1380]],
                "right": [[525, 1225, 660, 1380], [690, 1225, 825, 1380], [840, 1225, 975, 1380]],
            },
            "attack": {
                "down": [[365, 1225, 500, 1380], [525, 1225, 660, 1380], [690, 1225, 825, 1380], [840, 1225, 975, 1380]],
            },
        },
    },
]


def entity_dir(sprite: dict) -> Path:
    group = "npcs" if sprite["type"] == "npc" else "mobs"
    return Path(OUTPUT_ROOT) / group / sprite["name"]


def save_frame(source: Image.Image, bg_color, sprite: dict, animation: str, direction: str, index: int, box: list[int]) -> int:
    name = sprite["name"]
    out_dir = entity_dir(sprite) / animation / direction
    debug_dir = Path(DEBUG_ROOT) / sprite["type"] / name / animation / direction
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{name}_{animation}_{direction}_{index:02d}.png"
    crop = source.crop(tuple(box))
    cleaned = remove_background(crop, bg_color, BG_THRESHOLD)
    cleaned.save(debug_dir / filename)

    frame, empty = fit_to_frame(cleaned, FRAME_SIZE)
    if empty:
        print(f"WARNING empty crop: {name} {animation}/{direction} #{index} box={box}")
    frame.save(out_dir / filename)
    print(f"saved {out_dir / filename} | box={box}")
    return 1


def main() -> None:
    source_path = Path(INPUT_FILE)
    if not source_path.exists():
        source_path = Path(FALLBACK_INPUT_FILE)
    print(f"opening {source_path}")
    source = Image.open(source_path).convert("RGBA")
    bg_color = source.getpixel((0, 0))
    print(f"source size: {source.width}x{source.height}")
    print(f"background color: {bg_color}, threshold={BG_THRESHOLD}")

    saved = 0
    for sprite in SPRITES:
        print(f"processing {sprite['type']} {sprite['name']}")
        for animation, directions in sprite["animations"].items():
            for direction, boxes in directions.items():
                for index, box in enumerate(boxes, start=1):
                    saved += save_frame(source, bg_color, sprite, animation, direction, index, box)

    print("")
    print(f"saved frames: {saved}")
    print(f"output: {Path(OUTPUT_ROOT).resolve()}")
    print(f"debug preview: {Path(DEBUG_ROOT).resolve()}")


if __name__ == "__main__":
    main()
