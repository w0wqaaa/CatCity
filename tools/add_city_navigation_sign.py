from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CITY_MAP = ROOT / "assets" / "maps" / "city" / "background.png"

WOOD = (176, 108, 53, 255)
WOOD_DARK = (91, 57, 29, 255)


def draw_gate_sign(draw, x, y):
    draw.rectangle((x - 7, y, x + 7, y + 70), fill=WOOD_DARK)
    draw.rectangle((x - 78, y + 7, x + 78, y + 35), fill=WOOD)
    draw.rectangle((x - 70, y + 12, x + 70, y + 30), outline=WOOD_DARK, width=3)
    draw.polygon([(x + 78, y + 7), (x + 112, y + 21), (x + 78, y + 35)], fill=WOOD)
    draw.rectangle((x - 46, y + 18, x + 46, y + 24), fill=WOOD_DARK)


def main():
    img = Image.open(CITY_MAP).convert("RGBA")
    draw = ImageDraw.Draw(img)
    draw_gate_sign(draw, 870, 875)
    img.save(CITY_MAP)


if __name__ == "__main__":
    main()
