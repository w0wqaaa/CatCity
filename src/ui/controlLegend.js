let legend;

export function initControlLegend() {
  if (legend) {
    return legend;
  }

  legend = document.createElement("div");
  legend.id = "controlLegend";
  legend.style.position = "fixed";
  legend.style.left = "16px";
  legend.style.bottom = "16px";
  legend.style.zIndex = "11";
  legend.style.pointerEvents = "none";
  legend.style.display = "none";
  legend.style.padding = "10px 12px";
  legend.style.minWidth = "180px";
  legend.style.background = "rgba(8, 10, 12, 0.78)";
  legend.style.border = "1px solid rgba(255, 255, 255, 0.28)";
  legend.style.borderRadius = "6px";
  legend.style.color = "#f5f5f5";
  legend.style.font = "13px monospace";
  legend.style.lineHeight = "1.45";
  legend.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.35)";
  document.body.appendChild(legend);
  return legend;
}

export function updateControlLegend(context = null) {
  if (!legend) {
    initControlLegend();
  }

  if (!context?.isGameActive) {
    legend.style.display = "none";
    return;
  }

  const lines = [
    "WASD / стрелки — движение",
    "Q — квесты",
    "I — инвентарь",
    context.minimapEnabled ? "M — скрыть миникарту" : "M — показать миникарту",
  ];

  if (context.isMenuOpen) {
    lines.push("Esc — закрыть меню");
  }

  if (context.isDialogOpen) {
    lines.push("Enter — дальше");
  } else {
    if (context.nearbyNPC) {
      lines.push("E — говорить");
    } else if (context.nearbyExit) {
      lines.push("E — перейти");
    } else if (context.nearbyInteractable) {
      lines.push("E — взаимодействие");
    }

    if (context.playerCanAttack && context.nearbyMob) {
      lines.push("Space — атака");
    }
  }

  legend.innerHTML = lines.map((line) => `<div>${line}</div>`).join("");
  legend.style.display = "block";
}
