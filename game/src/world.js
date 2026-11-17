// The world: the game's state machine, waves, collisions, scoring and
// upgrades. It owns every entity list and answers one question each frame:
// given the input and the time that passed, what changed?

import { CONFIG } from './config.js';
import {
  createPlayer, playerStats, createEnemy, createBullet,
  createShard, createHeart, createParticle, createFloatText,
} from './entities.js';
import { randomRange, randomPick, shuffle } from './random.js';

export const PHASE = {
  TITLE: 'title',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  PAUSED: 'paused',
  OVER: 'over',
};

export function createWorld(rng) {
  const w = CONFIG.viewWidth;
  const h = CONFIG.viewHeight;
  return {
    rng,
    phase: PHASE.TITLE,
    time: 0,
    player: createPlayer(w / 2, h / 2),
    enemies: [],
    bullets: [],
    shards: [],
    hearts: [],
    particles: [],
    texts: [],
    score: 0,
    wave: 0,
    kills: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    waveBreakTimer: 0,
    boss: null,
    shake: 0,
    upgradeChoices: [],
    best: 0,
    stats: { shots: 0, hits: 0, damageDealt: 0 },
    novaUsedAt: -99,
  };
}

function spawnEdgePosition(world, rng) {
  const w = CONFIG.viewWidth;
  const h = CONFIG.viewHeight;
  const side = Math.floor(rng() * 4);
  const margin = 30;
  if (side === 0) return { x: randomRange(rng, 0, w), y: -margin };
  if (side === 1) return { x: w + margin, y: randomRange(rng, 0, h) };
  if (side === 2) return { x: randomRange(rng, 0, w), y: h + margin };
  return { x: -margin, y: randomRange(rng, 0, h) };
}

export function startRun(world) {
  const w = CONFIG.viewWidth;
  const h = CONFIG.viewHeight;
  world.player = createPlayer(w / 2, h / 2);
  world.enemies = [];
  world.bullets = [];
  world.shards = [];
  world.hearts = [];
  world.particles = [];
  world.texts = [];
  world.score = 0;
  world.wave = 0;
  world.kills = 0;
  world.waveActive = false;
  world.spawnQueue = [];
  world.boss = null;
  world.shake = 0;
  world.stats = { shots: 0, hits: 0, damageDealt: 0 };
  world.phase = PHASE.PLAYING;
  beginWave(world);
}

export function beginWave(world) {
  const rng = world.rng;
  world.wave += 1;
  const composition = CONFIG.waves.composition(world.wave);
  if (world.wave % CONFIG.waves.bossEvery === 0) composition.push('boss');
  world.spawnQueue = shuffle(rng, composition);
  world.spawnTimer = 0.5;
  world.waveActive = true;
  world.waveBreakTimer = 0;
  return world.wave;
}

function endWave(world) {
  world.waveActive = false;
  world.waveBreakTimer = 2.2;
  const bonus = CONFIG.waves.clearBonus;
  world.player.shards = (world.player.shards || 0) + bonus;
  world.texts.push(createFloatText(
    world.player.x, world.player.y - 40,
    `Wave ${world.wave} cleared! +${bonus} shards`, '#ffd98a',
  ));
}

function offerUpgrades(world) {
  const rng = world.rng;
  const pool = CONFIG.upgrades.slice();
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  world.upgradeChoices = picks;
  world.phase = PHASE.UPGRADE;
}

export function applyUpgrade(world, upgrade) {
  const p = world.player;
  p.shards = (p.shards || 0) - upgrade.cost;
  if (upgrade.id === 'damage') p.damageLevel += 1;
  else if (upgrade.id === 'rate') p.rateLevel += 1;
  else if (upgrade.id === 'spread') p.spreadLevel += 1;
  else if (upgrade.id === 'speed') p.speedLevel += 1;
  else if (upgrade.id === 'health') { p.maxHealth += 30; p.health = Math.min(p.maxHealth, p.health + 30); }
  else if (upgrade.id === 'magnet') p.magnetLevel += 1;
  else if (upgrade.id === 'nova') p.hasNova = true;
  else if (upgrade.id === 'pierce') p.pierceLevel += 1;
  world.phase = PHASE.PLAYING;
  beginWave(world);
}

function damageEnemy(world, enemy, amount, audio) {
  enemy.hp -= amount;
  enemy.flash = 0.12;
  world.stats.damageDealt += amount;
  if (enemy.hp <= 0) killEnemy(world, enemy, audio);
}

function killEnemy(world, enemy, audio) {
  const rng = world.rng;
  enemy.dead = true;
  world.kills += 1;
  world.score += enemy.score;
  world.texts.push(createFloatText(enemy.x, enemy.y - 14, `+${enemy.score}`, '#ffd98a'));
  world.particles.push(...createParticle(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 46 : 14, 260, 0.7, 4, rng));
  world.particles.push(...createParticle(enemy.x, enemy.y, '#ffb042', enemy.isBoss ? 26 : 6, 200, 0.5, 3, rng));
  if (audio) audio.enemyDie();
  world.shake = Math.max(world.shake, enemy.isBoss ? CONFIG.shake.death + 4 : CONFIG.shake.death);
  // Shards burst out of the fallen creature.
  for (let i = 0; i < enemy.shards; i++) {
    world.shards.push(createShard(enemy.x, enemy.y, CONFIG.shardValue, rng));
  }
  if (enemy.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const small = createEnemy('shade', enemy.x + (i === 0 ? -18 : 18), enemy.y, world.wave, rng);
      small.radius = 10;
      small.hp = 14;
      small.maxHp = 14;
      world.enemies.push(small);
    }
  }
  if (enemy.isBoss) {
    world.boss = null;
    world.texts.push(createFloatText(enemy.x, enemy.y - 50, 'THE MAW IS BROKEN!', '#ff8fa3'));
  }
  if (rng() < CONFIG.heartDropChance) world.hearts.push(createHeart(enemy.x, enemy.y, rng));
}

function fireNova(world, audio) {
  const p = world.player;
  if (!p.hasNova) return;
  if (world.time - world.novaUsedAt < CONFIG.nova.cooldown) return;
  world.novaUsedAt = world.time;
  const nova = CONFIG.nova;
  world.particles.push(...createParticle(p.x, p.y, '#ffb042', 60, 520, 0.8, 5, world.rng));
  world.particles.push(...createParticle(p.x, p.y, '#fff3d6', 30, 380, 0.6, 4, world.rng));
  for (const enemy of world.enemies) {
    const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (d < nova.radius + enemy.radius) damageEnemy(world, enemy, nova.damage, null);
  }
  world.shake = Math.max(world.shake, 10);
  if (audio) audio.nova();
}

function updatePlayer(world, input, dt, audio) {
  const p = world.player;
  const stats = playerStats(p);
  const move = input.moveVector();
  p.vx = move.x * stats.speed;
  p.vy = move.y * stats.speed;
  p.x = Math.max(p.radius, Math.min(CONFIG.viewWidth - p.radius, p.x + p.vx * dt));
  p.y = Math.max(p.radius, Math.min(CONFIG.viewHeight - p.radius, p.y + p.vy * dt));
  // Aim at the mouse (in view coordinates the caller maps for us).
  const mx = input.mouse.viewX ?? input.mouse.x;
  const my = input.mouse.viewY ?? input.mouse.y;
  p.angle = Math.atan2(my - p.y, mx - p.x);
  // Ember trail.
  p.trail.push({ x: p.x, y: p.y, life: 0.35 });
  if (p.trail.length > 14) p.trail.shift();
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);
  if (p.invulnerable > 0) p.invulnerable -= dt;
  if (p.novaTimer > 0) p.novaTimer -= dt;

  p.fireTimer -= dt;
  if (input.firing() && p.fireTimer <= 0) {
    p.fireTimer = stats.fireInterval;
    const count = stats.spread;
    const spreadStep = 0.14;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spreadStep;
      const b = createBullet(
        p.x + Math.cos(p.angle) * (p.radius + 6),
        p.y + Math.sin(p.angle) * (p.radius + 6),
        p.angle + offset,
        CONFIG.player.bulletSpeed,
        stats.damage,
        stats.pierce,
        true,
      );
      world.bullets.push(b);
    }
    world.stats.shots += count;
    if (audio) audio.shoot();
    world.particles.push(...createParticle(
      p.x + Math.cos(p.angle) * (p.radius + 8),
      p.y + Math.sin(p.angle) * (p.radius + 8),
      '#ffb042', 2, 120, 0.25, 3, world.rng,
    ));
  }
  if (input.wasPressed('q')) {
    fireNova(world, audio);
    input.consume('q');
  }
}

function updateEnemies(world, dt, audio) {
  const p = world.player;
  const rng = world.rng;
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    e.wobble += dt * 2;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let mx = dx / dist;
    let my = dy / dist;
    if (e.type === 'wisp') {
      // Wisps weave side to side as they close in.
      const perp = Math.sin(e.wobble * 2.2) * 0.7;
      mx += -my * perp;
      my += mx * perp;
      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;
    }
    e.x += mx * e.speed * dt;
    e.y += my * e.speed * dt;
    // Spitters keep their distance and shoot dark bolts.
    if (e.type === 'spitter') {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && dist < 520) {
        e.fireTimer = CONFIG.enemies.spitter.fireInterval;
        world.bullets.push(createBullet(
          e.x, e.y, Math.atan2(dy, dx),
          CONFIG.enemies.spitter.bulletSpeed, e.damage, 0, false,
        ));
      }
    }
    if (e.isBoss) {
      // The Maw periodically bursts a ring of dark bolts.
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = 2.8;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + e.wobble;
          world.bullets.push(createBullet(e.x, e.y, a, 150, e.damage, 0, false));
        }
        if (audio) audio.boss();
      }
    }
    // Touching the player burns them.
    if (dist < e.radius + p.radius && p.invulnerable <= 0) {
      p.health -= e.damage;
      p.invulnerable = CONFIG.player.invulnerableTime;
      world.shake = Math.max(world.shake, CONFIG.shake.hit);
      world.particles.push(...createParticle(p.x, p.y, '#ff5a5a', 16, 260, 0.5, 4, rng));
      if (audio) audio.hurt();
      // Knock the creature back so it cannot hit twice at once.
      e.x -= mx * 26;
      e.y -= my * 26;
      if (p.health <= 0) {
        p.health = 0;
        world.phase = PHASE.OVER;
        if (audio) audio.gameOver();
      }
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead);
}

function updateBullets(world, dt, audio) {
  const p = world.player;
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (b.x < -20 || b.x > CONFIG.viewWidth + 20 || b.y < -20 || b.y > CONFIG.viewHeight + 20) {
      b.dead = true;
      continue;
    }
    if (b.friendly) {
      for (const e of world.enemies) {
        if (e.dead || b.hitSet.has(e)) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < e.radius + b.radius) {
          b.hitSet.add(e);
          world.stats.hits += 1;
          damageEnemy(world, e, b.damage, audio);
          world.particles.push(...createParticle(b.x, b.y, '#ffd98a', 4, 160, 0.3, 3, world.rng));
          if (b.pierce > 0 && b.hitSet.size <= b.pierce) {
            // Piercing ember keeps flying.
          } else {
            b.dead = true;
          }
          break;
        }
      }
    } else if (p.invulnerable <= 0) {
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < p.radius + b.radius) {
        b.dead = true;
        p.health -= b.damage;
        p.invulnerable = CONFIG.player.invulnerableTime;
        world.shake = Math.max(world.shake, CONFIG.shake.hit);
        if (audio) audio.hurt();
        if (p.health <= 0) {
          p.health = 0;
          world.phase = PHASE.OVER;
          if (audio) audio.gameOver();
        }
      }
    }
  }
  world.bullets = world.bullets.filter((b) => !b.dead);
}

function updatePickups(world, dt, audio) {
  const p = world.player;
  const stats = playerStats(p);
  for (const s of world.shards) {
    s.life -= dt;
    s.bob += dt * 4;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy);
    if (d < stats.magnet) {
      const pull = 520 * (1 - d / stats.magnet) + 120;
      s.vx += (dx / (d || 1)) * pull * dt;
      s.vy += (dy / (d || 1)) * pull * dt;
    }
    s.vx *= 0.94;
    s.vy *= 0.94;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d < p.radius + s.radius + 4) {
      s.dead = true;
      p.shards = (p.shards || 0) + s.value;
      if (audio) audio.pickup();
    }
    if (s.life <= 0) s.dead = true;
  }
  world.shards = world.shards.filter((s) => !s.dead);
  for (const heart of world.hearts) {
    heart.life -= dt;
    heart.bob += dt * 3;
    heart.x += heart.vx * dt;
    heart.y += heart.vy * dt;
    heart.vx *= 0.94;
    heart.vy *= 0.94;
    const d = Math.hypot(p.x - heart.x, p.y - heart.y);
    if (d < p.radius + heart.radius + 4) {
      heart.dead = true;
      p.health = Math.min(p.maxHealth, p.health + CONFIG.heartHeal);
      world.texts.push(createFloatText(p.x, p.y - 30, `+${CONFIG.heartHeal} health`, '#7ee081'));
      if (audio) audio.pickup();
    }
    if (heart.life <= 0) heart.dead = true;
  }
  world.hearts = world.hearts.filter((h) => !h.dead);
}

function updateParticles(world, dt) {
  for (const pt of world.particles) {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const t of world.texts) {
    t.life -= dt;
    t.y -= 34 * dt;
  }
  world.texts = world.texts.filter((t) => t.life > 0);
}

export function updateWorld(world, input, dt, audio) {
  world.time += dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.phase !== PHASE.PLAYING) {
    updateParticles(world, dt);
    return;
  }
  // Spawning.
  if (world.waveActive) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.spawnQueue.length > 0) {
      const interval = Math.max(
        CONFIG.waves.spawnIntervalMin,
        CONFIG.waves.spawnInterval - (world.wave - 1) * 0.06,
      );
      world.spawnTimer = interval;
      const type = world.spawnQueue.shift();
      const pos = spawnEdgePosition(world, world.rng);
      const enemy = createEnemy(type, pos.x, pos.y, world.wave, world.rng);
      world.enemies.push(enemy);
      if (type === 'boss') {
        world.boss = enemy;
        if (audio) audio.boss();
      }
    }
    if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
      endWave(world);
      if (audio) audio.waveClear();
    }
  } else {
    // Between waves: a short breather, then the upgrade choice.
    world.waveBreakTimer -= dt;
    if (world.waveBreakTimer <= 0 && world.phase === PHASE.PLAYING) {
      offerUpgrades(world);
    }
  }
  updatePlayer(world, input, dt, audio);
  if (world.phase !== PHASE.PLAYING) return;
  updateEnemies(world, dt, audio);
  updateBullets(world, dt, audio);
  updatePickups(world, dt, audio);
  updateParticles(world, dt);
}
