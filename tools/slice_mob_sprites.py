from pathlib import Path
import shutil

from PIL import Image, ImageChops, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_IMAGE = ROOT / "dev" / "main.png"
OUTPUT_ROOT = ROOT / "assets" / "mobs"
FRAME_SIZE = 32

# Regions for C:\CatCity\dev\main.png.
# Each region contains 5 columns x 2 rows of animation frames.
SPRITE_SHEETS = [
    {
        "mob": "carnivorous_plant",
        "state": "idle",
        "region": (40, 100, 500, 300),
        "columns": 5,
        "rows": 2,
        "threshold": 24,
    },
    {
        "mob": "carnivorous_plant",
        "state": "walk",
        "region": (40, 390, 500, 590),
        "columns": 5,
        "rows": 2,
        "threshold": 24,
    },
    {
        "mob": "fungus_monster",
        "state": "idle",
        "region": (535, 100, 985, 300),
        "columns": 5,
        "rows": 2,
        "threshold": 28,
    },
    {
        "mob": "fungus_monster",
        "state": "walk",
        "region": (535, 390, 985, 590),
        "columns": 5,
        "rows": 2,
        "threshold": 28,
    },
]


def clean_output_dir(path):
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def median_border_color(image, border=4):
    pixels = []
    width, height = image.size

    for x in range(width):
        for y in range(border):
            pixels.append(image.getpixel((x, y))[:3])
            pixels.append(image.getpixel((x, height - 1 - y))[:3])

    for y in range(height):
        for x in range(border):
            pixels.append(image.getpixel((x, y))[:3])
            pixels.append(image.getpixel((width - 1 - x, y))[:3])

    channels = list(zip(*pixels))
    return tuple(sorted(channel)[len(channel) // 2] for channel in channels)


def foreground_mask(frame, threshold):
    bg = Image.new("RGB", frame.size, median_border_color(frame))
    rgb = frame.convert("RGB")
    diff = ImageChops.difference(rgb, bg)

    # Convert RGB difference into a single-channel distance approximation.
    mask = diff.convert("L")
    mask = mask.point(lambda value: 255 if value > threshold else 0)
    mask = mask.filter(ImageFilter.MaxFilter(3))
    mask = mask.filter(ImageFilter.MinFilter(3))

    return mask


def fit_to_32(frame, threshold):
    mask = foreground_mask(frame, threshold)
    bbox = mask.getbbox()

    if not bbox:
        sprite = frame
        sprite_mask = Image.new("L", frame.size, 255)
    else:
        sprite = frame.crop(bbox)
        sprite_mask = mask.crop(bbox)

    scale = min(FRAME_SIZE / sprite.width, FRAME_SIZE / sprite.height)
    target_size = (
        max(1, int(round(sprite.width * scale))),
        max(1, int(round(sprite.height * scale))),
    )

    sprite = sprite.resize(target_size, Image.Resampling.LANCZOS).convert("RGBA")
    sprite_mask = sprite_mask.resize(target_size, Image.Resampling.LANCZOS)
    sprite.putalpha(sprite_mask)

    output = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    offset = (
        (FRAME_SIZE - target_size[0]) // 2,
        FRAME_SIZE - target_size[1],
    )
    output.alpha_composite(sprite, offset)
    return output


def crop_grid_frames(source, sheet):
    x0, y0, x1, y1 = sheet["region"]
    columns = sheet["columns"]
    rows = sheet["rows"]
    cell_width = (x1 - x0) / columns
    cell_height = (y1 - y0) / rows

    frames = []
    for row in range(rows):
        for column in range(columns):
            left = int(round(x0 + column * cell_width))
            top = int(round(y0 + row * cell_height))
            right = int(round(x0 + (column + 1) * cell_width))
            bottom = int(round(y0 + (row + 1) * cell_height))
            raw_frame = source.crop((left, top, right, bottom))
            frames.append(fit_to_32(raw_frame, sheet["threshold"]))

    return frames


def save_frames(frames, output_dir):
    clean_output_dir(output_dir)
    for index, frame in enumerate(frames):
        frame.save(output_dir / f"{index:03}.png")


def main():
    if not SOURCE_IMAGE.exists():
        raise FileNotFoundError(f"Source image not found: {SOURCE_IMAGE}")

    source = Image.open(SOURCE_IMAGE).convert("RGBA")
    total = 0

    for sheet in SPRITE_SHEETS:
        frames = crop_grid_frames(source, sheet)
        output_dir = OUTPUT_ROOT / sheet["mob"] / sheet["state"]
        save_frames(frames, output_dir)
        total += len(frames)
        print(f"{sheet['mob']}/{sheet['state']}: {len(frames)} frames -> {output_dir}")

    print(f"Done. Total frames: {total}")


if __name__ == "__main__":
    main()
