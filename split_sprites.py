from PIL import Image
import numpy as np
import os

# ==== ПАРАМЕТРЫ ====
INPUT_FILE = "A_sprite_sheet_features_eleven_pixel_art_frames_of.png"  # имя твоего спрайт-листа
OUTPUT_DIR  = "cat_walk_down_smart"
BG_SAMPLE_POINTS = [(2,2), (-3,2), (2,-3), (-3,-3)]  # точки для авто-замера фона (углы)
BG_TOL = 40          # чувствительность отличия от фона (0..255)
MIN_FRAME_WIDTH = 30 # отбрасываем слишком узкие шумовые сегменты (px)
PAD = 2              # отступ вокруг вырезки (px)
MAKE_ALPHA = True    # удалять фон до альфы

def color_dist_rgb(a, b):
    a = np.asarray(a, dtype=np.int16)
    b = np.asarray(b, dtype=np.int16)
    return np.abs(a - b)

def auto_bg_color(img):
    """Оцениваем цвет фона по углам."""
    w, h = img.size
    px = img.load()
    samples = []
    for x, y in BG_SAMPLE_POINTS:
        sx = 0 if x >= 0 else w + x
        sy = 0 if y >= 0 else h + y
        samples.append(px[sx, sy][:3])
    # медиана по каналам — устойчиво к шуму
    return tuple(int(np.median(np.array(samples)[:,i])) for i in range(3))

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    im = Image.open(INPUT_FILE).convert("RGBA")
    w, h = im.size
    arr = np.array(im)  # HxWx4
    rgb = arr[..., :3]

    bg = auto_bg_color(im)
    print(f"📏 image: {w}x{h} | 🎯 bg≈ {bg} tol={BG_TOL}")

    # Маска «не фон»
    diff = color_dist_rgb(rgb, np.array(bg, dtype=np.uint8))
    mask = (diff > BG_TOL).any(axis=-1)  # HxW, True где не фон

    # Столбцы, где есть хоть один нефоновый пиксель
    col_has = mask.any(axis=0)  # W
    # Группируем непрерывные отрезки столбцов
    frames_x = []
    in_run = False
    start = 0
    for x in range(w):
        if col_has[x] and not in_run:
            in_run = True
            start = x
        if (not col_has[x] and in_run) or (in_run and x == w-1):
            end = x if not col_has[x] else x  # последний включительно
            if end == w-1 and col_has[x]:
                end = x
            # отфильтровываем мелкие крошки
            if end - start + 1 >= MIN_FRAME_WIDTH:
                frames_x.append((start, end))
            in_run = False

    if not frames_x:
        print("❌ Кадры не найдены: попробуй уменьшить BG_TOL или проверь INPUT_FILE.")
        return

    print(f"🧩 найдено сегментов: {len(frames_x)}")

    saved = 0
    for i, (x0, x1) in enumerate(frames_x, start=1):
        sub_mask = mask[:, x0:x1+1]
        # по маске считаем вертикальные границы
        rows_nonempty = np.where(sub_mask.any(axis=1))[0]
        if rows_nonempty.size == 0:
            continue
        y0 = max(int(rows_nonempty[0]) - PAD, 0)
        y1 = min(int(rows_nonempty[-1]) + PAD, h-1)

        # добавляем паддинги по X
        cx0 = max(x0 - PAD, 0)
        cx1 = min(x1 + PAD, w-1)

        crop = im.crop((cx0, y0, cx1+1, y1+1))  # (left, top, right, bottom) — right/bottom не включительно

        if MAKE_ALPHA:
            # удаляем фон по толерансу
            c_arr = np.array(crop)
            c_rgb = c_arr[..., :3]
            c_diff = color_dist_rgb(c_rgb, np.array(bg, dtype=np.uint8))
            c_mask_bg = (c_diff <= BG_TOL).all(axis=-1)
            c_arr[c_mask_bg, 3] = 0  # альфа=0 там, где фон
            crop = Image.fromarray(c_arr, mode="RGBA")

        out = os.path.join(OUTPUT_DIR, f"cat_down_{i:02d}.png")
        crop.save(out)
        saved += 1
        print(f"✅ saved {out}  [{cx0}:{cx1} x {y0}:{y1}]")

    print(f"\n✨ Готово! Сохранено кадров: {saved} → {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
