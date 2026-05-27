export function isRunning(keys) {
  return Boolean(keys.ShiftLeft || keys.ShiftRight || keys.Shift);
}

export function getMoveSpeed(baseSpeed, keys, runMultiplier) {
  return baseSpeed * (isRunning(keys) ? runMultiplier : 1);
}

export function isKeyDown(keys, aliases) {
  return aliases.some((alias) => keys[alias]);
}

export function getCurrentMoveVector({ keys, aliases, pressedDirections, fallbackDirection }) {
  const x = (isKeyDown(keys, aliases.right) ? 1 : 0) - (isKeyDown(keys, aliases.left) ? 1 : 0);
  const y = (isKeyDown(keys, aliases.down) ? 1 : 0) - (isKeyDown(keys, aliases.up) ? 1 : 0);

  if (!x && !y) {
    pressedDirections.length = 0;
    return { x: 0, y: 0, direction: fallbackDirection };
  }

  const length = Math.hypot(x, y) || 1;
  return {
    x: x / length,
    y: y / length,
    direction: getFacingDirectionFromPressedKeys({ x, y, keys, aliases, pressedDirections }),
  };
}

function getFacingDirectionFromPressedKeys({ x, y, keys, aliases, pressedDirections }) {
  while (pressedDirections.length) {
    const direction = pressedDirections[pressedDirections.length - 1];
    if (isKeyDown(keys, aliases[direction])) {
      return direction;
    }
    pressedDirections.pop();
  }

  if (Math.abs(x) >= Math.abs(y)) {
    return x > 0 ? "right" : "left";
  }
  return y > 0 ? "down" : "up";
}
