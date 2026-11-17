// Rendering: everything the player sees on the canvas. The arena, the ember
// player, the shadow creatures, the light and the HUD. One module owns every
// pixel so the game logic never draws.

import { CONFIG } from './config.js';
import { PHASE } from './world.js';

function drawBackground(ctx, world, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, '#171733');
  g.addColorStop(0.55, '#0e0e22');
  g.addColorStop(1, '#070712');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Faint ember dust drifting upward, for depth.
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) {
    const seed = i * 137.5;
    const x = (seed * 7.3 + world.time * 12) % w;
    const y = h - ((seed * 3.1 + world.time * 22) % (h + 40)) + 20;
    ctx.fillStyle = i % 3 === 0 ? '#ffb042' : '#5a5a8a';
    ctx.globalAlpha = 0.16 + (i % 4) * 0.05;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The arena's edge: a soft glowing ring the creatures crawl in from.
  ctx.save();
  ctx.strokeStyle = 'rgba(139, 127, 212, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  // Ember trail.
  for (const t of player.trail) {
    const a = Math.max(0, t.life / 0.35) * 0.35;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ff9a1f';
    ctx.beginPath();
    ctx.arc(t.x, t.y, player.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const flicker = 1 + Math.sin(time * 9) * 0.06 + Math.sin(time * 23) * 0.04;
  const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  if (blink) return;
  // Glow.
  const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, player.radius * 3.4);
  glow.addColorStop(0, 'rgba(255, 190, 80, 0.55)');
  glow.addColorStop(0.5, 'rgba(255, 140, 20, 0.18)');
  glow.addColorStop(1, 'rgba(255, 140, 20, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 3.4, 0, Math.PI * 2);
  ctx.fill();
  // Body: a bright ember core with a warm shell.
  ctx.fillStyle = '#ff8c1a';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 0.55 * flicker, 0, Math.PI * 2);
  ctx.fill();
  // Eyes that look where the player aims.
  const ex = Math.cos(player.angle) * 5;
  const ey = Math.sin(player.angle) * 5;
  ctx.fillStyle = '#1a0e00';
  ctx.beginPath();
  ctx.arc(player.x + ex - 4, player.y + ey - 2, 2.2, 0, Math.PI * 2);
  ctx.arc(player.x + ex + 4, player.y + ey - 2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  if (player.hasNova) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 176, 66, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemy(ctx, enemy, time) {
  const flash = enemy.flash > 0;
  ctx.save();
  if (flash) ctx.globalAlpha = 0.9;
  // Shadow aura.
  const aura = ctx.createRadialGradient(enemy.x, enemy.y, 2, enemy.x, enemy.y, enemy.radius * 2.2);
  aura.addColorStop(0, 'rgba(120, 90, 220, 0.35)');
  aura.addColorStop(1, 'rgba(120, 90, 220, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : enemy.color;
  ctx.beginPath();
  if (enemy.type === 'brute' || enemy.isBoss) {
    // Horned silhouette for the heavy ones.
    ctx.moveTo(enemy.x - enemy.radius, enemy.y + enemy.radius * 0.7);
    ctx.lineTo(enemy.x - enemy.radius * 0.9, enemy.y - enemy.radius * 0.9);
    ctx.lineTo(enemy.x - enemy.radius * 0.3, enemy.y - enemy.radius * 0.4);
    ctx.lineTo(enemy.x, enemy.y - enemy.radius * 1.15);
    ctx.lineTo(enemy.x + enemy.radius * 0.3, enemy.y - enemy.radius * 0.4);
    ctx.lineTo(enemy.x + enemy.radius * 0.9, enemy.y - enemy.radius * 0.9);
    ctx.lineTo(enemy.x + enemy.radius, enemy.y + enemy.radius * 0.7);
    ctx.closePath();
  } else if (enemy.type === 'wisp') {
    // A darting wisp: a small diamond.
    ctx.moveTo(enemy.x, enemy.y - enemy.radius);
    ctx.lineTo(enemy.x + enemy.radius, enemy.y);
    ctx.lineTo(enemy.x, enemy.y + enemy.radius);
    ctx.lineTo(enemy.x - enemy.radius, enemy.y);
    ctx.closePath();
  } else {
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  }
  ctx.fill();
  // Glowing eyes.
  const lookX = Math.cos(enemy.wobble) * 2;
  ctx.fillStyle = '#ff5a5a';
  ctx.beginPath();
  ctx.arc(enemy.x - enemy.radius * 0.35 + lookX, enemy.y - enemy.radius * 0.2, 2.4, 0, Math.PI * 2);
  ctx.arc(enemy.x + enemy.radius * 0.35 + lookX, enemy.y - enemy.radius * 0.2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Health bar for tough creatures.
  if ((enemy.maxHp >= 100 || enemy.isBoss) && enemy.hp < enemy.maxHp) {
    const bw = enemy.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(enemy.x - bw / 2, enemy.y - enemy.radius - 12, bw, 5);
    ctx.fillStyle = '#ff5a6e';
    ctx.fillRect(enemy.x - bw / 2, enemy.y - enemy.radius - 12, bw * (enemy.hp / enemy.maxHp), 5);
  }
  ctx.restore();
}

function drawHud(ctx, world) {
  const w = CONFIG.viewWidth;
  const p = world.player;
  ctx.save();
  ctx.textBaseline = 'top';
  // Score, big and top-left.
  ctx.fillStyle = '#f5e9d0';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`Score ${world.score}`, 22, 16);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = '#a99e86';
  ctx.fillText(`Wave ${world.wave}  •  Kills ${world.kills}`, 22, 52);
  // Health as a flame bar, top-left under the score.
  const barW = 210;
  const barH = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(22, 78, barW, barH);
  const healthFrac = Math.max(0, p.health / p.maxHealth);
  const hg = ctx.createLinearGradient(22, 0, 22 + barW, 0);
  hg.addColorStop(0, '#ff5a3c');
  hg.addColorStop(1, '#ffb042');
  ctx.fillStyle = hg;
  ctx.fillRect(22, 78, barW * healthFrac, barH);
  ctx.strokeStyle = 'rgba(255, 176, 66, 0.6)';
  ctx.strokeRect(22, 78, barW, barH);
  ctx.fillStyle = '#f5e9d0';
  ctx.font = '13px Georgia, serif';
  ctx.fillText(`Health ${Math.ceil(p.health)} / ${p.maxHealth}`, 22, 98);
  // Shards and nova, top-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(`◆ ${p.shards || 0} shards`, w - 22, 16);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = '#a99e86';
  if (p.hasNova) {
    const cd = Math.max(0, CONFIG.nova.cooldown - (world.time - world.novaUsedAt));
    ctx.fillText(cd <= 0 ? 'Nova ready — press Q' : `Nova in ${cd.toFixed(1)}s`, w - 22, 48);
  }
  ctx.textAlign = 'left';
  // Boss bar.
  if (world.boss) {
    const bw = 420;
    const bx = (w - bw) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, 16, bw, 16);
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(bx, 16, bw * Math.max(0, world.boss.hp / world.boss.maxHp), 16);
    ctx.strokeStyle = '#ff8fa3';
    ctx.strokeRect(bx, 16, bw, 16);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('UMBRAL MAW', w / 2, 36);
    ctx.textAlign = 'left';
  }
  // Wave banner (first seconds of a wave).
  if (world.waveActive && world.time < 3) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 176, 66, 0.9)';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(`Wave ${world.wave}`, w / 2, 120);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

export function renderWorld(ctx, world) {
  const w = CONFIG.viewWidth;
  const h = CONFIG.viewHeight;
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world, w, h);
  // Shards and hearts.
  for (const s of world.shards) {
    const bob = Math.sin(s.bob) * 2;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + bob - 7);
    ctx.lineTo(s.x + 5, s.y + bob);
    ctx.lineTo(s.x, s.y + bob + 7);
    ctx.lineTo(s.x - 5, s.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (const heart of world.hearts) {
    const bob = Math.sin(heart.bob) * 2;
    ctx.save();
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.arc(heart.x - 4, heart.y + bob - 2, 5, 0, Math.PI * 2);
    ctx.arc(heart.x + 4, heart.y + bob - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(heart.x - 9, heart.y + bob);
    ctx.lineTo(heart.x + 9, heart.y + bob);
    ctx.lineTo(heart.x, heart.y + bob + 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Bullets.
  for (const b of world.bullets) {
    ctx.save();
    if (b.friendly) {
      const g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.radius * 2.4);
      g.addColorStop(0, '#fff3d6');
      g.addColorStop(0.5, '#ffb042');
      g.addColorStop(1, 'rgba(255, 140, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#b26bff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // Enemies, then the player on top.
  for (const e of world.enemies) drawEnemy(ctx, e, world.time);
  if (world.phase !== PHASE.OVER) drawPlayer(ctx, world.player, world.time);
  // Particles.
  for (const pt of world.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Floating score text.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px Georgia, serif';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
  if (world.phase === PHASE.PLAYING || world.phase === PHASE.UPGRADE || world.phase === PHASE.PAUSED) {
    drawHud(ctx, world);
  }
  ctx.restore();
}
