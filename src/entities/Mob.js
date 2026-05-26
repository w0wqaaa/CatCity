export class Mob {
  constructor(data, frames, tileSize, collisionMap) {
    this.data = data;
    this.frames = frames;
    this.tileSize = tileSize;
    this.collisionMap = collisionMap;

    this.x = data.position.x;
    this.y = data.position.y;
    this.originX = this.x;
    this.originY = this.y;
    this.width = data.width || 64;
    this.height = data.height || 64;
    this.speed = data.speed || 0.6;
    this.roamRadius = data.roamRadius || 120;
    this.aggroRadius = data.aggroRadius || 160;
    this.maxHp = data.maxHp || data.hp || 3;
    this.hp = data.hp || this.maxHp;

    this.state = "idle";
    this.frame = 0;
    this.tick = 0;
    this.waitTicks = 0;
    this.target = null;
    this.facing = 1;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  update(player) {
    const distanceToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (distanceToPlayer <= this.aggroRadius) {
      this.moveToward(player.x, player.y, this.speed);
      this.animate("walk");
      return;
    }

    if (this.waitTicks > 0) {
      this.waitTicks--;
      this.state = "idle";
      this.animate("idle");
      return;
    }

    if (!this.target || Math.hypot(this.target.x - this.x, this.target.y - this.y) < 4) {
      this.pickTarget();
    }

    if (this.target) {
      const moved = this.moveToward(this.target.x, this.target.y, this.speed * 0.75);
      this.animate(moved ? "walk" : "idle");
      if (!moved) {
        this.target = null;
        this.waitTicks = 45;
      }
    }
  }

  draw(ctx) {
    const frames = this.frames[this.state] || this.frames.idle;
    const image = frames[this.frame % frames.length];

    ctx.save();
    if (this.facing < 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(image, -this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    } else {
      ctx.drawImage(image, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
    ctx.restore();
  }

  moveToward(targetX, targetY, speed) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) {
      return false;
    }

    const nextX = this.x + (dx / distance) * speed;
    const nextY = this.y + (dy / distance) * speed;
    if (this.isBlocked(nextX, nextY)) {
      return false;
    }

    if (Math.hypot(nextX - this.originX, nextY - this.originY) > this.roamRadius) {
      return false;
    }

    this.facing = dx < 0 ? -1 : 1;
    this.x = nextX;
    this.y = nextY;
    return true;
  }

  pickTarget() {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 32 + Math.random() * this.roamRadius;
      const x = this.originX + Math.cos(angle) * distance;
      const y = this.originY + Math.sin(angle) * distance;
      if (!this.isBlocked(x, y)) {
        this.target = { x, y };
        return;
      }
    }

    this.waitTicks = 60;
  }

  animate(state) {
    if (this.state !== state) {
      this.state = state;
      this.frame = 0;
      this.tick = 0;
    }

    this.tick++;
    if (this.tick % 8 === 0) {
      this.frame = (this.frame + 1) % this.frames[this.state].length;
    }
  }

  isBlocked(x, y) {
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor((y + 10) / this.tileSize);
    return this.collisionMap[tileY]?.[tileX] !== 0;
  }
}
