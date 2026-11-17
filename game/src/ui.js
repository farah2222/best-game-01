// Menus and screens, drawn as a DOM overlay on top of the canvas: the title
// screen, the between-wave upgrade choice, the pause screen and the game-over
// screen. The canvas keeps the game; this module owns the words around it.

import { PHASE } from './world.js';

export function createUi(overlay, world, callbacks) {
  const bestKey = 'emberfall-best';
  let best = 0;
  try {
    best = Number(window.localStorage.getItem(bestKey) || 0) || 0;
  } catch {
    best = 0;
  }

  function saveBest(score) {
    if (score > best) {
      best = score;
      try {
        window.localStorage.setItem(bestKey, String(score));
      } catch {
        // Storage unavailable; the best score lives only for this session.
      }
    }
    return best;
  }

  function clear() {
    overlay.innerHTML = '';
  }

  function panel(html) {
    const div = document.createElement('div');
    div.className = 'panel';
    div.innerHTML = html;
    overlay.appendChild(div);
    return div;
  }

  function showTitle() {
    clear();
    const div = panel(`
      <h1>EMBERFALL</h1>
      <p class="big">The last light in the dark.</p>
      <p>Shadows pour out of the night. You are the Emberkeeper — hold the
      light, burn them back, and gather the shards they drop.</p>
      <p class="keys"><b>WASD / arrows</b> move &nbsp;•&nbsp; <b>Mouse</b> aim<br>
      <b>Hold click / Space</b> shoot embers &nbsp;•&nbsp; <b>Q</b> nova burst<br>
      <b>P / Esc</b> pause &nbsp;•&nbsp; <b>M</b> mute</p>
      <p>Between waves, spend shards on upgrades. Every 5th wave, the Umbral Maw comes.</p>
      <p class="dim">Best score: ${best}</p>
    `);
    const start = document.createElement('button');
    start.textContent = 'Light the ember';
    start.addEventListener('click', () => callbacks.onStart());
    div.appendChild(start);
    const how = document.createElement('button');
    how.textContent = 'How to play';
    how.className = 'ghost';
    how.addEventListener('click', () => {
      div.querySelectorAll('p.keys')[0].innerHTML =
        '<b>Survive.</b> Each wave brings more shadows. Kill them to score and collect shards. ' +
        'Spend shards on upgrades between waves. If your flame goes out, the dark wins.<br>' +
        'Shades chase you. Wisps dart. Splitters burst into two. Spitters shoot back. Brutes take a beating. ' +
        'The Maw every 5th wave is the real test.';
    });
    div.appendChild(how);
  }

  function showUpgrade(world) {
    clear();
    const shards = world.player.shards || 0;
    const div = panel(`
      <h2>Wave ${world.wave} cleared!</h2>
      <p class="big">Score ${world.score} &nbsp;•&nbsp; ${shards} shards to spend</p>
      <p>Choose one upgrade. The dark is already gathering again.</p>
    `);
    const cards = document.createElement('div');
    cards.className = 'cards';
    world.upgradeChoices.forEach((u, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      const afford = shards >= u.cost;
      card.innerHTML = `<div class="k">PRESS ${i + 1}</div><div class="n">${u.name}</div>
        <div class="d">${u.desc}</div><div class="c">${afford ? `◆ ${u.cost} shards` : `need ${u.cost} shards`}</div>`;
      card.style.opacity = afford ? '1' : '0.45';
      card.addEventListener('click', () => {
        if (afford) callbacks.onUpgrade(u);
      });
      cards.appendChild(card);
    });
    div.appendChild(cards);
    const skip = document.createElement('button');
    skip.textContent = 'Save shards, next wave';
    skip.className = 'ghost';
    skip.addEventListener('click', () => callbacks.onSkipUpgrade());
    div.appendChild(skip);
  }

  function showPaused() {
    clear();
    const div = panel(`
      <h2>Paused</h2>
      <p>The ember waits. The dark does not.</p>
    `);
    const resume = document.createElement('button');
    resume.textContent = 'Keep playing';
    resume.addEventListener('click', () => callbacks.onResume());
    div.appendChild(resume);
    const restart = document.createElement('button');
    restart.textContent = 'Restart run';
    restart.className = 'ghost';
    restart.addEventListener('click', () => callbacks.onRestart());
    div.appendChild(restart);
  }

  function showGameOver(world) {
    clear();
    const finalBest = saveBest(world.score);
    const isBest = world.score >= finalBest && world.score > 0;
    const div = panel(`
      <h2>The light goes out</h2>
      <p class="big">Score ${world.score}</p>
      <p>You reached wave ${world.wave} and burned ${world.kills} shadows.</p>
      <p>${isBest ? 'A new best score — the ember remembers.' : `Best score: ${finalBest}`}</p>
      <p class="dim">Accuracy: ${world.stats.shots > 0 ? Math.round((world.stats.hits / world.stats.shots) * 100) : 0}% &nbsp;•&nbsp; Damage dealt: ${Math.round(world.stats.damageDealt)}</p>
    `);
    const again = document.createElement('button');
    again.textContent = 'Burn again';
    again.addEventListener('click', () => callbacks.onRestart());
    div.appendChild(again);
    const title = document.createElement('button');
    title.textContent = 'Title screen';
    title.className = 'ghost';
    title.addEventListener('click', () => callbacks.onTitle());
    div.appendChild(title);
  }

  function sync(world) {
    // Show the panel that matches the phase; hide it while playing.
    if (world.phase === PHASE.TITLE) {
      if (!overlay.querySelector('h1')) showTitle();
    } else if (world.phase === PHASE.UPGRADE) {
      if (!overlay.querySelector('.cards')) showUpgrade(world);
    } else if (world.phase === PHASE.PAUSED) {
      if (!overlay.querySelector('h2') || !overlay.textContent.includes('Paused')) showPaused();
    } else if (world.phase === PHASE.OVER) {
      if (!overlay.textContent.includes('The light goes out')) showGameOver(world);
    } else {
      clear();
    }
  }

  return { sync, clear, showTitle, getBest: () => best };
}
