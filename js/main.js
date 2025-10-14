// main.js
import { initMap } from "./engine/mapManager.js";
import { showDialog } from "./engine/dialogManager.js";
import { startQuest } from "./engine/questManager.js";

(async ()=>{
  console.log("🐾 Cat City Engine запускается...");
  const map=await initMap("city");
  console.log("Локация загружена:", map.name);
})();