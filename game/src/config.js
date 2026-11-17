// Emberfall tuning: every number that shapes how the game feels lives here,
// so the game can be balanced without touching the systems that use it.

export const CONFIG = {
  // Logical playfield. The canvas scales to the window; the game always
  // thinks in this space so screenshots and play stay identical.
  viewWidth: 1280,
  viewHeight: 720,

  player: {
    radius: 16,
    speed: 265,
    maxHealth: 100,
    fireInterval: 0.16, // seconds between ember shots
    bulletSpeed: 640,
    bulletDamage: 22,
    bulletRadius: 6,
    magnetRadius: 90, // shards drift toward the player inside this radius
    invulnerableTime: 0.8, // seconds of grace after taking a hit
  },

  // Enemy types. Each has one clear job in the arena.
  enemies: {
    shade:    { hp: 30,  speed: 78,  radius: 15, damage: 10, score: 10, shards: 1, color: '#8b7fd4' },
    wisp:     { hp: 16,  speed: 168, radius: 11, damage: 8,  score: 15, shards: 1, color: '#c77dff' },
    splitter: { hp: 44,  speed: 62,  radius: 19, damage: 12, score: 20, shards: 2, color: '#5ec8e5' },
    spitter:  { hp: 34,  speed: 58,  radius: 15, damage: 9,  score: 25, shards: 2, color: '#7ee081', fireInterval: 2.4, bulletSpeed: 190 },
    brute:    { hp: 150, speed: 42,  radius: 26, damage: 20, score: 50, shards: 4, color: '#e05e7a' },
    boss:     { hp: 900, speed: 52,  radius: 44, damage: 26, score: 500, shards: 25, color: '#ff4d6d' },
  },

  // Waves: how many of each type spawn, and how fast they arrive.
  // Wave n scales enemy hp by 1 + 0.09 * (n - 1) and speed slightly.
  waves: {
    spawnInterval: 0.85, // seconds between spawns at wave 1; shrinks per wave
    spawnIntervalMin: 0.28,
    composition(wave) {
      const list = [];
      const add = (type, count) => { for (let i = 0; i < count; i++) list.push(type); };
      add('shade', 4 + wave * 2);
      add('wisp', wave >= 2 ? 2 + wave : 0);
      add('splitter', wave >= 3 ? 1 + Math.floor(wave / 2) : 0);
      add('spitter', wave >= 4 ? Math.floor(wave / 2) : 0);
      add('brute', wave >= 3 ? Math.floor((wave - 1) / 2) : 0);
      return list;
    },
    bossEvery: 5, // a boss joins the wave every 5th wave
    clearBonus: 25, // shards awarded for clearing a wave
  },

  // Upgrades offered between waves. Each costs shards; the player picks one.
  upgrades: [
    { id: 'damage',  name: 'Bright Ember',  desc: '+35% ember damage',          cost: 12 },
    { id: 'rate',    name: 'Rapid Flame',   desc: '+25% fire rate',             cost: 12 },
    { id: 'spread',  name: 'Twin Flame',    desc: '+1 ember per shot',          cost: 18 },
    { id: 'speed',   name: 'Swift Wisp',    desc: '+12% move speed',            cost: 10 },
    { id: 'health',  name: 'Warm Hearth',   desc: '+30 max health, heal 30',    cost: 14 },
    { id: 'magnet',  name: 'Shard Pull',    desc: '+60% shard magnet radius',   cost: 8 },
    { id: 'nova',    name: 'Nova Burst',    desc: 'Press Q: a ring of fire',    cost: 20 },
    { id: 'pierce',  name: 'Piercing Light',desc: 'Embers pierce +1 enemy',     cost: 16 },
  ],

  nova: { cooldown: 6, damage: 90, radius: 210, shardsCost: 0 },
  shardValue: 1,
  heartHeal: 25,
  heartDropChance: 0.06,
  powerDropChance: 0.05, // a random instant power-up on kill
  shake: { hit: 5, death: 8, bossHit: 3 },
  colors: {
    background: '#0a0a18',
    ember: '#ffb042',
    emberCore: '#fff3d6',
    text: '#f5e9d0',
    dimText: '#a99e86',
  },
};
