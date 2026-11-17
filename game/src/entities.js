// Entities: the player, the shadow creatures, embers, shards and particles.
// Each factory builds a plain object; the world moves them and the renderer
// draws them. Nothing here touches the canvas or the DOM.

import { CONFIG } from './config.js';

export function createPlayer(x, y) {
  const p = CONFIG.player;
  return {
    kind: 'player',
    x, y,
    vx: 0, vy: 0,
    radius: p.radius,
    angle: 0,
    health: p.maxHealth,
    maxHealth: p.maxHealth,
    fireTimer: 0,
    invulnerable: 0,
    // Upgrade levels the player has bought.
    damageLevel: 0,
    rateLevel: 0,
    spreadLevel: 0,
    speedLevel: 0,
    magnetLevel: 0,
    pierceLevel: 0,
    hasNova: false,
    novaTimer: 0,
    trail: [],
  };
}

export function playerStats(player) {
  const p = CONFIG.player;
  return {
    damage: p.bulletDamage * (1 + 0.35 * player.damageLevel),
    fireInterval: p.fireInterval / (1 + 0.25 * player.rateLevel),
    spread: 1 + player.spreadLevel,
    speed: p.speed * (1 + 0.12 * player.speedLevel),
    magnet: p.magnetRadius * (1 + 0.6 * player.magnetLevel),
    pierce: player.pierceLevel,
  };
}

export function createEnemy(type, x, y, wave, rng) {
  const base = CONFIG.enemies[type];
  const hpScale = 1 + 0.09 * (wave - 1);
  const speedScale = 1 + Math.min(0.35, 0.03 * (wave - 1));
  const enemy = {
    kind: 'enemy',
    type,
    x, y,
    vx: 0, vy: 0,
    radius: base.radius,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    speed: base.speed * speedScale * (0.9 + rng() * 0.2),
    damage: base.damage,
    score: base.score,
    shards: base.shards,
    color: base.color,
    fireTimer: 1 + rng() * 1.5,
    wobble: rng() * Math.PI * 2,
    flash: 0,
    isBoss: type === 'boss',
  };
  return enemy;
}

export function createBullet(x, y, angle, speed, damage, pierce, friendly) {
  return {
    kind: 'bullet',
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: friendly ? CONFIG.player.bulletRadius : 6,
    damage,
    pierce,
    friendly,
    life: 1.6,
    hitSet: new Set(),
  };
}

export function createShard(x, y, value, rng) {
  const angle = rng() * Math.PI * 2;
  const speed = 60 + rng() * 90;
  return {
    kind: 'shard',
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6,
    value,
    life: 14,
    bob: rng() * Math.PI * 2,
  };
}

export function createHeart(x, y, rng) {
  const angle = rng() * Math.PI * 2;
  return {
    kind: 'heart',
    x, y,
    vx: Math.cos(angle) * 50,
    vy: Math.sin(angle) * 50,
    radius: 10,
    life: 12,
    bob: 0,
  };
}

export function createParticle(x, y, color, count, speed, life, size, rng) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const v = speed * (0.3 + rng() * 0.7);
    list.push({
      kind: 'particle',
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      radius: size * (0.5 + rng() * 0.8),
      color,
      life: life * (0.5 + rng() * 0.7),
      maxLife: life,
    });
  }
  return list;
}

export function createFloatText(x, y, text, color) {
  return { kind: 'floatText', x, y, text, color, life: 0.9, maxLife: 0.9 };
}
