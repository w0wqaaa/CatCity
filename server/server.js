/**
 * CatCity — статический сервер для публикации (Express).
 * Отдаёт весь проект как есть: index.html, style.css, assets/, data/, src/.
 * Игровой код не меняется — это только хостинг.
 */
const express = require("express");
const path = require("path");

const app = express();
const ROOT = path.join(__dirname, "..");      // корень проекта (на уровень выше /server)
const PORT = process.env.PORT || 3000;          // Render задаёт PORT через окружение

// Раздаём статику. Express сам ставит правильные MIME:
//  .js  → text/javascript (нужно для ES-модулей)
//  .json → application/json
app.use(
  express.static(ROOT, {
    index: "index.html",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".json")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
    },
  })
);

// Фолбэк: любые неизвестные маршруты отдают index.html (на случай SPA-навигации).
// Реальные файлы отдаёт express.static выше, сюда попадают только отсутствующие пути.
app.get("*", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CatCity слушает порт ${PORT}  →  http://localhost:${PORT}`);
});
