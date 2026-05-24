import { NPC } from "./NPC.js";

export class NPCGuard extends NPC {
  constructor(x, y, spritePath, tileSize, collisionMap, roadCluster) {
    super(x, y, spritePath, tileSize);

    this.collisionMap = collisionMap;
    this.roadCluster = roadCluster;

    this.state = "walk";        // walk | wait
    this.stateStart = Date.now();
    this.walkDuration = 10000;  // 10 секунд идёт
    this.waitDuration = 10000;  // 10 секунд стоит
  }

  update() {
    const now = Date.now();
    const elapsed = now - this.stateStart;

    if (this.state === "wait") {
      if (elapsed >= this.waitDuration) {
        this.state = "walk";
        this.stateStart = now;
        this.pickNewDirection();
      }
      return;
    }

    if (this.state === "walk") {
      if (elapsed >= this.walkDuration) {
        this.state = "wait";
        this.stateStart = now;
        return;
      }

      const nextTileX = this.tileX + this.direction.x;
      const nextTileY = this.tileY + this.direction.y;

      const nextIsRoad =
        this.collisionMap[nextTileY]?.[nextTileX] === 0 &&
        this.roadCluster.some((t) => t.x === nextTileX && t.y === nextTileY);

      if (nextIsRoad) {
        const targetX = nextTileX * this.tileSize + this.tileSize / 2;
        const targetY = nextTileY * this.tileSize + this.tileSize / 2;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.speed) {
          this.x = targetX;
          this.y = targetY;
          this.tileX = nextTileX;
          this.tileY = nextTileY;
        } else {
          this.x += (dx / dist) * this.speed;
          this.y += (dy / dist) * this.speed;
        }
      } else {
        this.pickNewDirection();
      }
    }
  }

  pickNewDirection() {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const available = dirs.filter(
      (d) =>
        this.collisionMap[this.tileY + d.y]?.[this.tileX + d.x] === 0 &&
        this.roadCluster.some(
          (t) => t.x === this.tileX + d.x && t.y === this.tileY + d.y
        )
    );
    if (available.length > 0) {
      this.direction = available[Math.floor(Math.random() * available.length)];
    } else {
      this.state = "wait";
      this.stateStart = Date.now();
    }
  }
}
