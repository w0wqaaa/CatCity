from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


DIRECTIONS = ("down", "up", "left", "right")


def split_sheet(
    input_path: Path,
    output_root: Path,
    animation: str,
    frame_size: int,
    directions: tuple[str, ...],
) -> None:
    image = Image.open(input_path).convert("RGBA")
    frames_per_direction = image.width // frame_size

    if image.width % frame_size or image.height % frame_size:
      raise ValueError(f"{input_path} is not aligned to {frame_size}x{frame_size} frames")
    if image.height // frame_size < len(directions):
      raise ValueError(f"{input_path} does not contain enough direction rows")

    for row, direction in enumerate(directions):
        out_dir = output_root / animation / direction
        out_dir.mkdir(parents=True, exist_ok=True)
        for frame in range(frames_per_direction):
            x = frame * frame_size
            y = row * frame_size
            tile = image.crop((x, y, x + frame_size, y + frame_size))
            tile.save(out_dir / f"{animation}_{direction}_{frame + 1:02d}.png")


def split_entity(entity_dir: Path, name: str, output_root: Path, animations: tuple[str, ...], frame_size: int) -> None:
    for animation in animations:
        sheet = entity_dir / f"{name}_{animation}.png"
        if sheet.exists():
            split_sheet(sheet, output_root, animation, frame_size, DIRECTIONS)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Split 32x32 directional RPG spritesheets into PNG frames.")
    parser.add_argument("--input", type=Path, help="Single spritesheet PNG to split.")
    parser.add_argument("--entity-dir", type=Path, help="Directory with <name>_idle.png, <name>_walk.png, and <name>_attack.png.")
    parser.add_argument("--name", help="Entity spritesheet prefix, for example guard.")
    parser.add_argument("--animation", choices=("idle", "walk", "attack"), help="Animation name for --input mode.")
    parser.add_argument("--output-root", type=Path, required=True, help="Output directory, usually <entity>/split.")
    parser.add_argument("--frame-size", type=int, default=32)
    parser.add_argument("--animations", nargs="*", default=["idle", "walk", "attack"], choices=("idle", "walk", "attack"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.input:
        if not args.animation:
            raise SystemExit("--animation is required when --input is used")
        split_sheet(args.input, args.output_root, args.animation, args.frame_size, DIRECTIONS)
        return

    if not args.entity_dir or not args.name:
        raise SystemExit("Use either --input with --animation, or --entity-dir with --name")

    split_entity(args.entity_dir, args.name, args.output_root, tuple(args.animations), args.frame_size)


if __name__ == "__main__":
    main()
