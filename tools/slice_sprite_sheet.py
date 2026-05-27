from __future__ import annotations

from pathlib import Path

from PIL import Image


INPUT_FILE = "assets/source/npc_mobs_sheet.png"
OUTPUT_ROOT = "assets"
DEBUG_ROOT = "debug_slices"
FRAME_SIZE = 32
BG_THRESHOLD = 35
RESAMPLE = Image.Resampling.NEAREST

# Manual crop configuration.
# Coordinates are intentionally kept here for easy hand tuning.
# The source sheet is not a clean 32x32 grid: labels, HP bars, and spacing vary.
# If a frame is off-center, adjust only the "box": [x1, y1, x2, y2] values below.
SPRITES = [
    {
        "name": "guard",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [
                    {"box": [72, 112, 228, 302]},
                    {"box": [268, 112, 424, 302]},
                ],
                "up": [
                    {"box": [704, 112, 840, 302]},
                    {"box": [866, 112, 982, 302]},
                ],
                "left": [
                    {"box": [704, 320, 842, 512]},
                    {"box": [868, 320, 986, 512]},
                ],
                "right": [
                    {"box": [270, 320, 426, 512]},
                    {"box": [510, 320, 668, 512]},
                ],
            },
            "walk": {
                "down": [
                    {"box": [72, 112, 228, 302]},
                    {"box": [268, 112, 424, 302]},
                    {"box": [510, 112, 676, 302]},
                ],
                "up": [
                    {"box": [704, 112, 840, 302]},
                    {"box": [866, 112, 982, 302]},
                    {"box": [704, 320, 842, 512]},
                ],
                "left": [
                    {"box": [704, 320, 842, 512]},
                    {"box": [868, 320, 986, 512]},
                ],
                "right": [
                    {"box": [270, 320, 426, 512]},
                    {"box": [510, 320, 668, 512]},
                ],
            },
        },
    },
    {
        "name": "merchant",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [
                    {"box": [58, 628, 184, 806]},
                    {"box": [205, 628, 334, 806]},
                ],
            },
            "walk": {
                "down": [
                    {"box": [58, 628, 184, 806]},
                    {"box": [205, 628, 334, 806]},
                    {"box": [60, 832, 184, 998]},
                    {"box": [205, 832, 334, 998]},
                ],
            },
        },
    },
    {
        "name": "old_cat",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [
                    {"box": [385, 620, 520, 806]},
                    {"box": [555, 620, 684, 806]},
                ],
            },
            "walk": {
                "down": [
                    {"box": [385, 620, 520, 806]},
                    {"box": [555, 620, 684, 806]},
                    {"box": [385, 832, 520, 998]},
                    {"box": [555, 832, 684, 998]},
                ],
            },
        },
    },
    {
        "name": "mechanic",
        "type": "npc",
        "animations": {
            "idle": {
                "down": [
                    {"box": [720, 620, 846, 806]},
                    {"box": [858, 620, 1000, 806]},
                ],
            },
            "walk": {
                "down": [
                    {"box": [720, 620, 846, 806]},
                    {"box": [858, 620, 1000, 806]},
                    {"box": [720, 832, 846, 998]},
                    {"box": [858, 832, 1000, 998]},
                ],
            },
        },
    },
    {
        "name": "carnivorous_plant",
        "type": "mob",
        "animations": {
            "idle": {
                "down": [
                    {"box": [45, 1090, 180, 1240]},
                    {"box": [205, 1090, 340, 1240]},
                ],
            },
            "walk": {
                "down": [
                    {"box": [45, 1090, 180, 1240]},
                    {"box": [205, 1090, 340, 1240]},
                    {"box": [365, 1090, 500, 1240]},
                    {"box": [555, 1090, 690, 1240]},
                ],
            },
            "attack": {
                "down": [
                    {"box": [45, 1315, 180, 1485]},
                    {"box": [205, 1315, 340, 1485]},
                    {"box": [365, 1315, 500, 1485]},
                    {"box": [555, 1315, 690, 1485]},
                    {"box": [715, 1315, 850, 1485]},
                    {"box": [870, 1315, 1005, 1485]},
                ],
            },
        },
    },
]


def log(message: str) -> None:
    print(message)


def is_close_to_bg(pixel: tuple[int, int, int, int], bg: tuple[int, int, int, int], threshold: int) -> bool:
    return (
        abs(pixel[0] - bg[0]) <= threshold
        and abs(pixel[1] - bg[1]) <= threshold
        and abs(pixel[2] - bg[2]) <= threshold
    )


def remove_background(image: Image.Image, bg_color: tuple[int, int, int, int], threshold: int) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            pixel = pixels[x, y]
            if is_close_to_bg(pixel, bg_color, threshold):
                pixels[x, y] = (pixel[0], pixel[1], pixel[2], 0)
    return rgba


def fit_to_frame(crop: Image.Image, frame_size: int) -> tuple[Image.Image, bool]:
    bbox = crop.getbbox()
    if not bbox:
        return Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0)), True

    trimmed = crop.crop(bbox)
    scale = min(frame_size / trimmed.width, frame_size / trimmed.height, 1)
    new_size = (
        max(1, round(trimmed.width * scale)),
        max(1, round(trimmed.height * scale)),
    )
    resized = trimmed.resize(new_size, RESAMPLE)

    frame = Image.new("RGBA", (frame_size, frame_size), (0, 0, 0, 0))
    x = (frame_size - resized.width) // 2
    y = frame_size - resized.height - 1
    frame.alpha_composite(resized, (x, y))
    return frame, False


def entity_output_dir(sprite_type: str, name: str) -> Path:
    group = "npcs" if sprite_type == "npc" else "mobs"
    return Path(OUTPUT_ROOT) / group / name


def save_frame(
    source: Image.Image,
    bg_color: tuple[int, int, int, int],
    sprite: dict,
    animation: str,
    direction: str,
    frame_index: int,
    box: list[int],
) -> int:
    name = sprite["name"]
    out_dir = entity_output_dir(sprite["type"], name) / animation / direction
    debug_dir = Path(DEBUG_ROOT) / sprite["type"] / name / animation / direction
    out_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{name}_{animation}_{direction}_{frame_index:02d}.png"
    crop = source.crop(tuple(box))
    cleaned = remove_background(crop, bg_color, BG_THRESHOLD)
    cleaned.save(debug_dir / filename)

    frame, empty = fit_to_frame(cleaned, FRAME_SIZE)
    if empty:
        log(f"WARNING empty crop: {name} {animation}/{direction} #{frame_index} box={box}")
    frame.save(out_dir / filename)

    log(f"saved {out_dir / filename} | box={box}")
    return 1


def main() -> None:
    input_path = Path(INPUT_FILE)
    output_root = Path(OUTPUT_ROOT)
    debug_root = Path(DEBUG_ROOT)
    log(f"opening {input_path}")
    log(f"output root: {output_root}")
    log(f"debug root: {debug_root}")

    source = Image.open(input_path).convert("RGBA")
    bg_color = source.getpixel((0, 0))
    log(f"source size: {source.width}x{source.height}")
    log(f"background color from top-left: {bg_color}, threshold={BG_THRESHOLD}")

    saved = 0
    for sprite in SPRITES:
        log(f"processing {sprite['type']} {sprite['name']}")
        for animation, directions in sprite["animations"].items():
            for direction, frames in directions.items():
                out_dir = entity_output_dir(sprite["type"], sprite["name"]) / animation / direction
                out_dir.mkdir(parents=True, exist_ok=True)
                log(f"created/using folder {out_dir}")
                for index, frame_config in enumerate(frames, start=1):
                    saved += save_frame(
                        source,
                        bg_color,
                        sprite,
                        animation,
                        direction,
                        index,
                        frame_config["box"],
                    )

    log("")
    log(f"saved frames: {saved}")
    log(f"output: {output_root.resolve()}")
    log(f"debug preview: {debug_root.resolve()}")


if __name__ == "__main__":
    main()
