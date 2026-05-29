from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGETS = sorted((ROOT / "src" / "maps").glob("*CollisionMap.js"))


def main() -> None:
    for path in TARGETS:
        collision = read_collision_map(path)
        smoothed = smooth_collision(collision)
        write_collision_map(path, smoothed)
        print(f"Smoothed: {path}")


def read_collision_map(path: Path) -> list[list[int]]:
    text = path.read_text(encoding="utf-8").strip()
    prefix = "export const collisionMap = "
    if not text.startswith(prefix) or not text.endswith(";"):
        raise ValueError(f"Unsupported collision map format: {path}")
    return json.loads(text[len(prefix):-1])


def smooth_collision(collision: list[list[int]]) -> list[list[int]]:
    result = [row[:] for row in collision]
    for _ in range(2):
        result = smooth_by_neighbors(result)
        result = fill_short_horizontal_gaps(result)
        result = fill_short_vertical_gaps(result)
        result = keep_borders_blocked(result)
    return result


def smooth_by_neighbors(collision: list[list[int]]) -> list[list[int]]:
    rows = len(collision)
    cols = len(collision[0])
    result = [row[:] for row in collision]

    for y in range(1, rows - 1):
        for x in range(1, cols - 1):
            neighbors = [
                collision[ny][nx]
                for ny in range(y - 1, y + 2)
                for nx in range(x - 1, x + 2)
                if nx != x or ny != y
            ]
            blocked = neighbors.count(1)
            open_tiles = neighbors.count(0)

            if collision[y][x] == 1 and open_tiles >= 6:
                result[y][x] = 0
            elif collision[y][x] == 0 and blocked >= 6:
                result[y][x] = 1

    return result


def fill_short_horizontal_gaps(collision: list[list[int]]) -> list[list[int]]:
    result = [row[:] for row in collision]
    for y, row in enumerate(collision):
        x = 1
        while x < len(row) - 1:
            value = row[x]
            start = x
            while x < len(row) - 1 and row[x] == value:
                x += 1
            end = x
            length = end - start
            if length <= 2 and row[start - 1] == row[end] and row[start - 1] != value:
                for fill_x in range(start, end):
                    result[y][fill_x] = row[start - 1]
    return result


def fill_short_vertical_gaps(collision: list[list[int]]) -> list[list[int]]:
    rows = len(collision)
    cols = len(collision[0])
    result = [row[:] for row in collision]

    for x in range(1, cols - 1):
        y = 1
        while y < rows - 1:
            value = collision[y][x]
            start = y
            while y < rows - 1 and collision[y][x] == value:
                y += 1
            end = y
            length = end - start
            if length <= 2 and collision[start - 1][x] == collision[end][x] and collision[start - 1][x] != value:
                for fill_y in range(start, end):
                    result[fill_y][x] = collision[start - 1][x]
    return result


def keep_borders_blocked(collision: list[list[int]]) -> list[list[int]]:
    rows = len(collision)
    cols = len(collision[0])
    for x in range(cols):
        collision[0][x] = 1
        collision[rows - 1][x] = 1
    for y in range(rows):
        collision[y][0] = 1
        collision[y][cols - 1] = 1
    return collision


def write_collision_map(path: Path, collision: list[list[int]]) -> None:
    path.write_text(
        "export const collisionMap = " + json.dumps(collision, separators=(", ", ": ")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
