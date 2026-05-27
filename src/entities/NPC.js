export class NPC {
  constructor(x, y, spritePath, tileSize, frames = null) {
    this.sprite = new Image();
    this.sprite.src = spritePath;
    this.frames = frames;

    this.tileSize = tileSize;
    this.tileX = Math.round(x / tileSize);
    this.tileY = Math.round(y / tileSize);
    this.x = this.tileX * tileSize + tileSize / 2;
    this.y = this.tileY * tileSize + tileSize / 2;

    this.width = 64;
    this.height = 64;
    this.speed = 1;
    this.direction = { x: 1, y: 0 };
    this.currentDirection = "right";
    this.animationState = "idle";
    this.currentFrame = 0;
    this.animationTimer = 0;
    this.animationSpeed = 14;
    this.attackTicks = 0;
  }

  draw(ctx) {
    this.updateAnimation();
    const frame = this.getFrame();
    if (frame) {
      ctx.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
      return;
    }

    const movingRight = this.currentDirection === "right";
    ctx.save();
    if (movingRight) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.sprite,
        -this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    } else {
      ctx.drawImage(
        this.sprite,
        this.x - this.width / 2,
        this.y - this.height / 2,
        this.width,
        this.height
      );
    }
    ctx.restore();
  }

  setAnimationState(state) {
    if (this.animationState === state) {
      return;
    }
    this.animationState = state;
    this.currentFrame = 0;
    this.animationTimer = 0;
  }

  playAttack(direction = this.currentDirection) {
    this.currentDirection = direction;
    this.attackTicks = 24;
    this.setAnimationState("attack");
  }

  updateDirectionName() {
    if (Math.abs(this.direction.x) > Math.abs(this.direction.y)) {
      this.currentDirection = this.direction.x >= 0 ? "right" : "left";
      return;
    }
    if (this.direction.y !== 0) {
      this.currentDirection = this.direction.y > 0 ? "down" : "up";
    }
  }

  updateAnimation() {
    if (this.attackTicks > 0) {
      this.attackTicks--;
      if (this.attackTicks === 0) {
        this.setAnimationState("idle");
      }
    }
    this.updateDirectionName();
    const frames = this.frames?.[this.animationState]?.[this.currentDirection];
    if (!frames?.length) {
      return;
    }

    this.animationTimer++;
    if (this.animationTimer >= this.animationSpeed) {
      this.animationTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % frames.length;
    }
  }

  getFrame() {
    const frames = this.frames?.[this.animationState]?.[this.currentDirection];
    return frames?.[this.currentFrame % frames.length] || null;
  }
}
