from __future__ import annotations

import re
import shutil
import zipfile
from collections import defaultdict
import json
from pathlib import Path

from PIL import Image


SOURCE_ROOT = Path("assets/source")
EXTRACT_ROOT = SOURCE_ROOT / "_imported_archives"
ASSETS_ROOT = Path("assets")
FRAME_SIZE = 32
DIRECTIONS = ("down", "up", "left", "right")
ANIMATIONS = ("idle", "walk", "attack")
ARCHIVE_EXTENSIONS = {".zip"}

KNOWN_NPCS = {
    "guard": {"guard", "cat_guard", "npc_guard", "страж"},
    "spice_merchant": {"merchant", "spice_merchant", "trader", "shopkeeper", "торговец", "купец"},
    "mechanic": {"mechanic", "engineer", "механик"},
    "old_cat": {"old_cat", "elder", "old", "старый_кот"},
    "herbalist": {"herbalist", "травница"},
    "road_scout": {"road_scout", "scout", "следопыт"},
    "beekeeper": {"beekeeper", "пасечник"},
    "baker": {"baker", "пекарь"},
}
KNOWN_MOBS = {
    "carnivorous_plant": {"monster_plant", "plant", "carnivorous_plant", "poison_flower"},
    "fungus_monster": {"fungus", "fungus_monster", "mushroom", "mushroom_monster"},
}
MOB_HINTS = {"mob", "monster", "plant", "fungus", "slime", "enemy", "poison"}
NPC_HINTS = {"npc", "cat", "guard", "merchant", "mechanic", "old", "scout", "beekeeper", "baker"}
ARCHIVE_OVERRIDES = {
    # This archive contains one coherent guard row plus several unrelated-looking rows
    # whose filenames are direction labels. Keep the actual guard-looking row only.
    "cat_guard_renamed_sprites": [
        {
            "pattern": re.compile(r"^walk_left_(?P<index>\d+)\.png$", re.IGNORECASE),
            "entity_id": "guard",
            "entity_type": "npc",
            "animation": "walk",
            "direction": "down",
        }
    ],
}

FRAME_RE = re.compile(
    r"^(?:(?P<entity>.+?)_)?(?P<animation>idle|walk|attack|hit)_(?P<direction>down|up|left|right)_(?P<index>\d+)\.png$",
    re.IGNORECASE,
)


def log(message: str) -> None:
    print(message)


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9а-яё]+", "_", value, flags=re.IGNORECASE)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "unknown_sprite"


def find_archives() -> list[Path]:
    archives = [path for path in SOURCE_ROOT.iterdir() if path.is_file() and path.suffix.lower() in ARCHIVE_EXTENSIONS]
    archives.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    return archives


def safe_extract(archive: Path, target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(archive) as zf:
        for member in zf.infolist():
            member_path = Path(member.filename)
            if member.is_dir() or member_path.is_absolute() or ".." in member_path.parts:
                continue

            destination = target / member_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, destination.open("wb") as dst:
                shutil.copyfileobj(src, dst)


def alias_to_entity_id(raw: str) -> str | None:
    raw_slug = slugify(raw)
    tokens = {token for token in raw_slug.split("_") if token}
    candidates = {raw_slug}
    candidates.update(tokens)

    for entity_id, aliases in KNOWN_NPCS.items():
        if raw_slug == entity_id or candidates.intersection(aliases):
            return entity_id
    for entity_id, aliases in KNOWN_MOBS.items():
        if raw_slug == entity_id or candidates.intersection(aliases):
            return entity_id
    return None


def infer_entity_type(entity_id: str, source_hint: str) -> str:
    if entity_id in KNOWN_MOBS:
        return "mob"
    if entity_id in KNOWN_NPCS:
        return "npc"

    hint = slugify(f"{entity_id}_{source_hint}")
    tokens = set(hint.split("_"))
    if tokens.intersection(MOB_HINTS):
        return "mob"
    if tokens.intersection(NPC_HINTS):
        return "npc"
    return "npc"


def infer_entity_from_context(archive: Path, image_path: Path, match_entity: str | None, extracted_root: Path) -> str:
    if match_entity:
        resolved = alias_to_entity_id(match_entity)
        if resolved:
            return resolved
        return slugify(match_entity)

    relative_parts = image_path.relative_to(extracted_root).parts[:-1]
    for part in reversed(relative_parts):
        resolved = alias_to_entity_id(part)
        if resolved:
            return resolved

    archive_hint = archive.stem
    resolved = alias_to_entity_id(archive_hint)
    if resolved:
        return resolved

    cleaned = archive_hint
    cleaned = re.sub(r"(sprites?|sheet|renamed|archive|pack|png|cat)", "", cleaned, flags=re.IGNORECASE)
    cleaned = slugify(cleaned)
    return alias_to_entity_id(cleaned) or cleaned


def normalize_frame(src: Path) -> Image.Image:
    image = Image.open(src).convert("RGBA")
    if image.size == (FRAME_SIZE, FRAME_SIZE):
        return image

    bbox = image.getbbox()
    if not bbox:
        return Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))

    trimmed = image.crop(bbox)
    scale = min(FRAME_SIZE / trimmed.width, FRAME_SIZE / trimmed.height, 1)
    resized = trimmed.resize(
        (max(1, round(trimmed.width * scale)), max(1, round(trimmed.height * scale))),
        Image.Resampling.NEAREST,
    )
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    frame.alpha_composite(resized, ((FRAME_SIZE - resized.width) // 2, FRAME_SIZE - resized.height))
    return frame


def output_dir(entity_type: str, entity_id: str) -> Path:
    group = "npcs" if entity_type == "npc" else "mobs"
    return ASSETS_ROOT / group / entity_id


def copy_frame(entity_type: str, entity_id: str, animation: str, direction: str, index: int, src: Path) -> Path:
    target_dir = output_dir(entity_type, entity_id) / animation / direction
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{entity_id}_{animation}_{direction}_{index:02d}.png"
    normalize_frame(src).save(target)
    return target


def reset_frame_dirs(entity_type: str, entity_id: str) -> None:
    root = output_dir(entity_type, entity_id)
    for animation in ANIMATIONS:
        path = root / animation
        if path.exists():
            shutil.rmtree(path)


def collect_frames(entity_type: str, entity_id: str) -> dict[str, dict[str, list[Image.Image]]]:
    root = output_dir(entity_type, entity_id)
    frames: dict[str, dict[str, list[Image.Image]]] = defaultdict(lambda: defaultdict(list))
    for animation in ANIMATIONS:
        for direction in DIRECTIONS:
            folder = root / animation / direction
            if not folder.exists():
                continue
            pattern = f"{entity_id}_{animation}_{direction}_*.png"
            frames[animation][direction] = [
                Image.open(path).convert("RGBA")
                for path in sorted(folder.glob(pattern))
            ]
    return frames


def max_frame_count(frames: dict[str, list[Image.Image]], fallback: int) -> int:
    count = max((len(items) for items in frames.values()), default=0)
    return count or fallback


def normalize_frames(frames: list[Image.Image], target_count: int) -> list[Image.Image]:
    if not frames:
        return [Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0)) for _ in range(target_count)]
    return [frames[min(index, len(frames) - 1)] for index in range(target_count)]


def build_spritesheets(entity_type: str, entity_id: str) -> dict[str, int]:
    root = output_dir(entity_type, entity_id)
    frames = collect_frames(entity_type, entity_id)
    counts: dict[str, int] = {}

    for animation in ANIMATIONS:
        source_frames = frames.get(animation) or {}
        if not source_frames and animation in {"idle", "attack"}:
            source_frames = frames.get("walk") or frames.get("idle") or {}

        fallback = source_frames.get("down") or next((items for items in source_frames.values() if items), [])
        target_count = max_frame_count(source_frames, len(fallback) or 1)
        counts[animation] = target_count

        sheet = Image.new("RGBA", (FRAME_SIZE * target_count, FRAME_SIZE * len(DIRECTIONS)), (0, 0, 0, 0))
        for row, direction in enumerate(DIRECTIONS):
            direction_frames = source_frames.get(direction) or fallback
            for column, frame in enumerate(normalize_frames(direction_frames, target_count)):
                sheet.alpha_composite(frame, (column * FRAME_SIZE, row * FRAME_SIZE))

        out_path = root / f"{entity_id}_{animation}.png"
        sheet.save(out_path)
        log(f"  spritesheet: {out_path} ({target_count} frames)")

    return counts


def update_entity_data(entity_type: str, entity_id: str, counts: dict[str, int]) -> bool:
    if entity_type == "npc":
        data_path = Path("data/characters") / f"{entity_id}.json"
        if data_path.exists():
            data = json.loads(data_path.read_text(encoding="utf-8"))
        else:
            data = {
                "id": entity_id,
                "name": entity_id.replace("_", " ").title(),
                "type": "npc",
                "position": {"x": 768, "y": 520},
                "movement": "static",
            }
        data["spriteSheetBase"] = f"assets/npcs/{entity_id}"
        data["spriteSheetName"] = entity_id
    else:
        data_path = Path("data/mobs") / f"{entity_id}.json"
        if data_path.exists():
            data = json.loads(data_path.read_text(encoding="utf-8"))
        else:
            data = {
                "id": entity_id,
                "name": entity_id.replace("_", " ").title(),
                "spriteBase": f"assets/mobs/{entity_id}",
                "width": 64,
                "height": 64,
                "speed": 0.5,
                "roamRadius": 100,
                "aggroRadius": 150,
            }
        data["spriteBase"] = f"assets/mobs/{entity_id}"
        data["spriteSheetName"] = entity_id

    data["idleFrameCount"] = counts.get("idle", 1)
    data["walkFrameCount"] = counts.get("walk", 1)
    data["attackFrameCount"] = counts.get("attack", counts.get("walk", 1))
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log(f"  data: {data_path}")
    return True


def process_archive(archive: Path) -> dict[str, object]:
    extract_dir = EXTRACT_ROOT / archive.stem
    log(f"archive: {archive}")
    safe_extract(archive, extract_dir)
    log(f"extracted to: {extract_dir}")

    imported: dict[tuple[str, str], set[tuple[str, str]]] = defaultdict(set)
    skipped: list[str] = []
    prepared: set[tuple[str, str]] = set()
    frame_total = 0
    overrides = ARCHIVE_OVERRIDES.get(archive.stem)

    for src in sorted(extract_dir.rglob("*.png")):
        override_match = None
        override = None
        if overrides:
            for item in overrides:
                override_match = item["pattern"].match(src.name)
                if override_match:
                    override = item
                    break
            if not override:
                skipped.append(str(src.relative_to(extract_dir)))
                continue

            animation = override["animation"]
            direction = override["direction"]
            index = int(override_match.group("index"))
            entity_id = override["entity_id"]
            entity_type = override["entity_type"]
        else:
            match = FRAME_RE.match(src.name)
            if not match:
                skipped.append(str(src.relative_to(extract_dir)))
                continue

            animation = match.group("animation").lower()
            if animation == "hit":
                animation = "attack"
            direction = match.group("direction").lower()
            index = int(match.group("index"))
            entity_id = infer_entity_from_context(archive, src, match.group("entity"), extract_dir)
            entity_type = infer_entity_type(entity_id, f"{archive.stem} {' '.join(src.parts)}")

        if animation not in ANIMATIONS or direction not in DIRECTIONS:
            skipped.append(str(src.relative_to(extract_dir)))
            continue
        entity_key = (entity_type, entity_id)

        if entity_key not in prepared:
            reset_frame_dirs(entity_type, entity_id)
            prepared.add(entity_key)

        target = copy_frame(entity_type, entity_id, animation, direction, index, src)
        imported[entity_key].add((animation, direction))
        frame_total += 1
        log(f"  frame: {src.relative_to(extract_dir)} -> {target}")

    sheet_counts = {}
    for entity_type, entity_id in sorted(imported):
        log(f"building {entity_type}: {entity_id}")
        counts = build_spritesheets(entity_type, entity_id)
        update_entity_data(entity_type, entity_id, counts)
        sheet_counts[f"{entity_type}:{entity_id}"] = counts

    if skipped:
        log("skipped files:")
        for item in skipped:
            log(f"  {item}")

    return {
        "archive": str(archive),
        "entities": sorted(imported.keys()),
        "skipped": skipped,
        "frames": frame_total,
        "counts": sheet_counts,
    }


def main() -> None:
    archives = find_archives()
    if not archives:
        log(f"No archives found in {SOURCE_ROOT}")
        return

    log(f"archives found: {len(archives)}")
    results = [process_archive(archive) for archive in archives]

    log("")
    log("summary:")
    for result in results:
        log(f"- {result['archive']}: {result['frames']} frames")
        for entity_type, entity_id in result["entities"]:
            counts = result["counts"].get(f"{entity_type}:{entity_id}", {})
            animations = ", ".join(f"{name}={count}" for name, count in counts.items())
            log(f"  {entity_type} {entity_id}: {animations}")
        if result["skipped"]:
            log(f"  skipped: {len(result['skipped'])}")


if __name__ == "__main__":
    main()
