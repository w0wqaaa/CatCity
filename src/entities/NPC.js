export class NPC {
  constructor(x, y, spritePath, tileSize) {
    this.sprite = new Image();
    this.sprite.src = spritePath;

    this.tileSize = tileSize;
    this.tileX = Math.round(x / tileSize);
    this.tileY = Math.round(y / tileSize);
    this.x = this.tileX * tileSize + tileSize / 2;
    this.y = this.tileY * tileSize + tileSize / 2;

    this.width = 64;
    this.height = 64;
    this.speed = 1;
    this.direction = { x: 1, y: 0 };
  }

  draw(ctx) {
    const movingRight = this.direction.x > 0;
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
}
