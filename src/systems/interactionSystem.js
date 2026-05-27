export function expandArea(area, padding) {
  return {
    x: area.x - padding,
    y: area.y - padding,
    width: area.width + padding * 2,
    height: area.height + padding * 2,
  };
}

export function isPointInArea(point, area) {
  return (
    point.x >= area.x &&
    point.x <= area.x + area.width &&
    point.y >= area.y &&
    point.y <= area.y + area.height
  );
}

export function findNearbyExit(location, player, radius) {
  return location.exits?.find(({ area }) => isPointInArea(player, expandArea(area, radius)));
}

export function findNearestInteractable({ player, npcs, objects, radius }) {
  const candidates = [
    ...npcs.map((npc) => ({
      type: "npc",
      entity: npc,
      radius,
      distance: Math.hypot(player.x - npc.x, player.y - npc.y),
    })),
    ...objects.map((object) => ({
      type: "object",
      entity: object,
      radius: object.radius || radius,
      distance: Math.hypot(player.x - object.position.x, player.y - object.position.y),
    })),
  ];

  return candidates
    .filter((candidate) => candidate.distance <= candidate.radius)
    .sort((a, b) => a.distance - b.distance)[0];
}
