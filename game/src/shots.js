// Deterministic screenshot states. `?shot=title|play|boss|end` puts the game
// into a fixed, readable state and raises window.__shotReady once it has
// rendered, so screenshots are real renders of the game's own code, taken
// the same way every time. Live play never reads this module's states.

import { CONFIG } from './config.js';
import { PHASE, createWorld, startRun, beginWave } from './world.js';
import { createEnemy, createBullet, createShard, createParticle } from './entities.js';
import { makeRandom } from './random.js';

function seedArena(world, seed, wave) {
  const rng = makeRandom(seed);
  world.rng = rng;
  startRun(world);
  // Fast-forward: place the player mid-arena and stage the wave by hand so
  // the frame reads as a game in progress, not an empty field.
  world.wave = wave;
  world.waveActive = true;
  world.time = 12 + wave * 4;
  world.score = 1240 + wave * 640;
  world.kills = 18 + wave * 9;
  world.player.shards = 14 + wave * 6;
  world.player.health = 78;
  world.player.x = CONFIG.viewWidth / 2;
  world.player.y = CONFIG.viewHeight / 2 + 40;
  world.player.angle = -0.6;
  return rng;
}

function scatterEnemies(world, rng, types, centerX, centerY, radius) {
  for (const type of types) {
    const angle = rng() * Math.PI * 2;
    const dist = radius * (0.55 + rng() * 0.6);
    const x = Math.max(30, Math.min(CONFIG.viewWidth - 30, centerX + Math.cos(angle) * dist));
    const y = Math.max(30, Math.min(CONFIG.viewHeight - 30, centerY + Math.sin(angle) * dist));
    const enemy = createEnemy(type, x, y, world.wave, rng);
    if (type === 'boss') {
      enemy.hp = enemy.maxHp * 0.62;
      world.boss = enemy;
    }
    world.enemies.push(enemy);
  }
}

function scatterBullets(world, rng, count) {
  const p = world.player;
  for (let i = 0; i < count; i++) {
    const angle = -0.9 + rng() * 1.1;
    world.bullets.push(createBullet(
      p.x + Math.cos(angle) * (p.radius + 10 + rng() * 160),
      p.y + Math.sin(angle) * (p.radius + 10 + rng() * 140),
      angle,
      CONFIG.player.bulletSpeed,
      CONFIG.player.bulletDamage,
      0,
      true,
    ));
  }
}

function scatterShards(world, rng, count) {
  for (let i = 0; i < count; i++) {
    const x = 200 + rng() * (CONFIG.viewWidth - 400);
    const y = 160 + rng() * (CONFIG.viewHeight - 320);
    world.shards.push(createShard(x, y, 1, rng));
  }
}

export function applyShot(world, shot, audio) {
  const p = world.player;
  if (shot === 'title') {
    world.phase = PHASE.TITLE;
    // A few drifting shadows behind the title, for atmosphere.
    const rng = makeRandom(7);
    for (let i = 0; i < 5; i++) {
      const e = createEnemy(i % 2 === 0 ? 'shade' : 'wisp', 150 + rng() * 980, 420 + rng() * 220, 1, rng);
      world.enemies.push(e);
    }
    world.particles.push(...createParticle(640, 500, '#ffb042', 24, 120, 1.5, 3, rng));
    return;
  }
  if (shot === 'play') {
    const rng = seedArena(world, 41, 3);
    scatterEnemies(world, rng,
      ['shade', 'shade', 'shade', 'shade', 'wisp', 'wisp', 'wisp', 'splitter', 'spitter', 'brute', 'shade', 'wisp'],
      p.x, p.y, 300);
    scatterBullets(world, rng, 7);
    scatterShards(world, rng, 8);
    world.particles.push(...createParticle(p.x + 120, p.y - 60, '#ffb042', 18, 200, 0.8, 3, rng));
    world.particles.push(...createParticle(p.x - 200, p.y + 90, '#8b7fd4', 14, 180, 0.8, 4, rng));
    return;
  }
  if (shot === 'boss') {
    const rng = seedArena(world, 99, 5);
    world.score = 4860;
    world.kills = 63;
    scatterEnemies(world, rng,
      ['boss', 'shade', 'shade', 'wisp', 'spitter'],
      p.x, p.y, 340);
    scatterBullets(world, rng, 9);
    scatterShards(world, rng, 6);
    world.particles.push(...createParticle(p.x, p.y, '#ff4d6d', 20, 220, 0.8, 4, rng));
    return;
  }
  if (shot === 'end') {
    const rng = seedArena(world, 13, 4);
    world.score = 3420;
    world.kills = 47;
    world.stats.shots = 214;
    world.stats.hits = 149;
    world.stats.damageDealt = 3280;
    world.player.health = 0;
    world.phase = PHASE.OVER;
    world.enemies = [];
    world.bullets = [];
    return;
  }
  return;
}
