// Emberfall bootstrap: wires the canvas, input, audio, world, renderer and
// menus together and runs the game loop. The game scales a fixed 1280x720
// view to the window, so it plays the same on any desktop screen.

import { CONFIG } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { PHASE, createWorld, startRun, updateWorld, applyUpgrade } from './world.js';
import { renderWorld } from './render.js';
import { createUi } from './ui.js';
import { applyShot } from './shots.js';
import { makeRandom } from './random.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number(params.get('seed') || 0) || (Date.now() % 2147483647);

const rng = makeRandom(shot ? 1234 + shot.length * 77 : seedParam);
const world = createWorld(rng);
const input = createInput(canvas);
const audio = createAudio();
const ui = createUi(overlay, world, {
  onStart: () => {
    audio.unlock();
    startRun(world);
  },
  onUpgrade: (upgrade) => {
    audio.upgrade();
    applyUpgrade(world, upgrade);
  },
  onSkipUpgrade: () => {
    applyUpgrade(world, { id: 'none', cost: 0 });
  },
  onResume: () => {
    world.phase = PHASE.PLAYING;
  },
  onRestart: () => {
    audio.unlock();
    startRun(world);
  },
  onTitle: () => {
    world.phase = PHASE.TITLE;
  },
});

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}
window.addEventListener('resize', resize);
resize();

// Map mouse coordinates from the scaled canvas into the game's view space.
function mapMouse() {
  const scale = Math.min(canvas.width / CONFIG.viewWidth, canvas.height / CONFIG.viewHeight);
  const offsetX = (canvas.width - CONFIG.viewWidth * scale) / 2;
  const offsetY = (canvas.height - CONFIG.viewHeight * scale) / 2;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssX = input.mouse.x;
  const cssY = input.mouse.y;
  input.mouse.viewX = (cssX * dpr - offsetX) / scale;
  input.mouse.viewY = (cssY * dpr - offsetY) / scale;
}

function draw() {
  const scale = Math.min(canvas.width / CONFIG.viewWidth, canvas.height / CONFIG.viewHeight);
  const offsetX = (canvas.width - CONFIG.viewWidth * scale) / 2;
  const offsetY = (canvas.height - CONFIG.viewHeight * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#070712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  renderWorld(ctx, world);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// Debug handle for automated playtesting (harmless in production).
window.__emberfall = world;

let last = performance.now();
let shotReady = false;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  mapMouse();

  // Global keys, whatever the phase.
  if (input.wasPressed('m')) {
    const muted = audio.toggleMute();
    statusLine.textContent = muted ? 'Sound muted' : 'Sound on';
    input.consume('m');
  }
  if (input.wasPressed('p') || input.wasPressed('escape')) {
    if (world.phase === PHASE.PLAYING) world.phase = PHASE.PAUSED;
    else if (world.phase === PHASE.PAUSED) world.phase = PHASE.PLAYING;
    input.consume('p');
    input.consume('escape');
  }
  if (world.phase === PHASE.UPGRADE) {
    if (input.wasPressed('1') || input.wasPressed('2') || input.wasPressed('3')) {
      const index = Number(input.wasPressed('1') ? 1 : input.wasPressed('2') ? 2 : 3) - 1;
      const choice = world.upgradeChoices[index];
      if (choice && (world.player.shards || 0) >= choice.cost) {
        audio.upgrade();
        applyUpgrade(world, choice);
      }
      input.consume('1');
      input.consume('2');
      input.consume('3');
    }
  }
  if (world.phase === PHASE.OVER && input.wasPressed('r')) {
    audio.unlock();
    startRun(world);
    input.consume('r');
  }
  if (world.phase === PHASE.TITLE && input.wasPressed('enter')) {
    audio.unlock();
    startRun(world);
    input.consume('enter');
  }
  // A click anywhere unlocks audio (browsers require a gesture for sound).
  if (input.mouse.down) audio.unlock();

  updateWorld(world, input, dt, audio);
  ui.sync(world);
  draw();

  if (shot && !shotReady) {
    shotReady = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

// Screenshot mode: stage the requested scene, then let the loop render it.
if (shot) {
  applyShot(world, shot, audio);
  ui.sync(world);
}
requestAnimationFrame(frame);
