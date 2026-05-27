from __future__ import annotations

from pathlib import Path

from PIL import Image


FRAME_SIZE = 32
DIRECTIONS = ("down", "up", "left", "right")
ANIMATION_FRAMES = {
    "idle": 2,
    "walk": 4,
    "attack": 4,
}

# source_dir uses frames produced by tools/slice_sprite_sheet.py.
# target_dir/name are the spritesheets consumed by the game loader.
ENTITIES = [
    {
        "source_dir": Path("assets/npcs/guard"),
        "target_dir": Path("assets/npcs/guard"),
        "source_name": "guard",
        "target_name": "guard",
    },
    {
        "source_dir": Path("assets/npcs/merchant"),
        "target_dir": Path("assets/npcs/spice_merchant"),
        "source_name": "merchant",
        "target_name": "spice_merchant",
    },
    {
        "source_dir": Path("assets/npcs/herbalist"),
        "target_dir": Path("assets/npcs/herbalist"),
        "source_name": "herbalist",
        "target_name": "herbalist",
    },
    {
        "source_dir": Path("assets/npcs/road_scout"),
        "target_dir": Path("assets/npcs/road_scout"),
        "source_name": "road_scout",
        "target_name": "road_scout",
    },
    {
        "source_dir": Path("assets/npcs/beekeeper"),
        "target_dir": Path("assets/npcs/beekeeper"),
        "source_name": "beekeeper",
        "target_name": "beekeeper",
    },
    {
        "source_dir": Path("assets/mobs/carnivorous_plant"),
        "target_dir": Path("assets/mobs/carnivorous_plant"),
        "source_name": "carnivorous_plant",
        "target_name": "carnivorous_plant",
    },
]


def load_direction_frames(source_dir: Path, source_name: str, animation: str, direction: str) -> list[Image.Image]:
    frame_dir = source_dir / animation / direction
    frames = []
    if not frame_dir.exists():
        return frames

    for path in sorted(frame_dir.glob(f"{source_name}_{animation}_{direction}_*.png")):
        frames.append(Image.open(path).convert("RGBA"))
    return frames


def normalize_frames(frames: list[Image.Image], target_count: int) -> list[Image.Image]:
    if not frames:
        return [Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0)) for _ in range(target_count)]

    output = []
    for index in range(target_count):
        output.append(frames[min(index, len(frames) - 1)])
    return output


def build_sheet(entity: dict, animation: str) -> int:
    target_count = ANIMATION_FRAMES[animation]
    sheet = Image.new("RGBA", (FRAME_SIZE * target_count, FRAME_SIZE * len(DIRECTIONS)), (0, 0, 0, 0))

    fallback = load_direction_frames(entity["source_dir"], entity["source_name"], animation, "down")
    used = 0

    for row, direction in enumerate(DIRECTIONS):
        frames = load_direction_frames(entity["source_dir"], entity["source_name"], animation, direction) or fallback
        if not frames and animation == "attack":
            frames = load_direction_frames(entity["source_dir"], entity["source_name"], "walk", direction) or fallback
        frames = normalize_frames(frames, target_count)
        for column, frame in enumerate(frames):
            sheet.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))
            used += 1

    entity["target_dir"].mkdir(parents=True, exist_ok=True)
    out_path = entity["target_dir"] / f"{entity['target_name']}_{animation}.png"
    sheet.save(out_path)
    print(f"saved {out_path}")
    return used


def main() -> None:
    total = 0
    for entity in ENTITIES:
        print(f"building {entity['target_name']} from {entity['source_dir']}")
        for animation in ANIMATION_FRAMES:
            total += build_sheet(entity, animation)
    print(f"spritesheet cells written: {total}")


if __name__ == "__main__":
    main()
