![make.fun](https://make.fun/badge/best-game-01.svg)
![rank](https://make.fun/badge/best-game-01/farah2222/best-game-01/rank.svg)
![reward](https://make.fun/badge/best-game-01/farah2222/best-game-01/reward.svg)

# Emberfall — the last light

[Play the bounty on make.fun](https://make.fun/bounty/best-game-01)

Shadows pour out of the night. You are the Emberkeeper — hold the light, burn them back, and gather the shards they drop.

A complete arena survival game that runs offline in a desktop browser from static files: move with **WASD / arrows**, aim with the **mouse**, hold **click / Space** to shoot embers of light. Survive escalating waves of shadow creatures — chasers, darting wisps, splitters, spitters, brutes, and the Umbral Maw every 5th wave. Collect shards and spend them on upgrades between waves (damage, fire rate, spread shot, nova burst and more). Synthesized WebAudio sound, particles, screen shake, pause, and a best score that persists.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/index.html` — the page and canvas
- `game/src/main.js` — bootstrap and game loop
- `game/src/config.js` — all tuning in one place
- `game/src/world.js` — state machine, waves, collisions, upgrades
- `game/src/entities.js` — player, enemies, bullets, shards, particles
- `game/src/render.js` — everything drawn on the canvas
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized sound, no audio files
- `game/src/ui.js` — title, upgrade, pause and game-over screens
- `game/src/shots.js` — deterministic screenshot states
- `game/src/random.js` — seeded random numbers
- `main.ts` — hands the game in (copies game/ + screenshots/, writes the dossier)

## License

MIT — see [LICENSE](LICENSE).
