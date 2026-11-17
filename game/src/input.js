// Keyboard and mouse state. One place owns every input so the game logic
// never reads the DOM directly; it asks this module what the player is doing.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, inside: false };
  const pressed = new Set(); // keys pressed since the last consume

  function keyName(event) {
    const k = event.key;
    if (k === ' ') return 'space';
    return k.length === 1 ? k.toLowerCase() : k.toLowerCase();
  }

  window.addEventListener('keydown', (event) => {
    const k = keyName(event);
    if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      event.preventDefault();
    }
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.inside = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) mouse.down = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.inside = false;
  });

  return {
    // Movement vector from WASD or arrow keys, normalized.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    firing() {
      return mouse.down || keys.has('space');
    },
    mouse,
    // True once per physical press; the game consumes it.
    wasPressed(name) {
      return pressed.has(name);
    },
    consume(name) {
      pressed.delete(name);
    },
    consumeAll() {
      pressed.clear();
    },
  };
}
