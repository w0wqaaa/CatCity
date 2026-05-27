export function drawSpriteObject(ctx, object) {
  const width = object.width || object.image.width;
  const height = object.height || object.image.height;
  const x = object.position.x - width / 2;
  const y = object.position.y - height;
  ctx.drawImage(object.image, x, y, width, height);
}

// Слой объектов отделён от карты: дома/декор можно добавлять без перерисовки background.
export function drawObjects(ctx, objects) {
  objects
    .filter((object) => object.image)
    .slice()
    .sort((a, b) => (a.drawOrder ?? a.position.y) - (b.drawOrder ?? b.position.y))
    .forEach((object) => drawSpriteObject(ctx, object));
}

export function drawPlayer(ctx, player, playerFrames) {
  const frameImg = getPlayerFrame(player, playerFrames);
  const w = frameImg.width * player.scale;
  const h = frameImg.height * player.scale;
  ctx.drawImage(frameImg, player.x - w / 2, player.y - h / 2, w, h);
}

export function getPlayerFrame(player, playerFrames) {
  if (player.attacking) {
    const attackFrames = playerFrames.attack?.[player.direction];
    if (attackFrames?.length) {
      return attackFrames[player.attackFrame % attackFrames.length];
    }
  }

  return playerFrames.walk?.[player.direction]?.[player.frame] || playerFrames[player.direction][player.frame];
}
