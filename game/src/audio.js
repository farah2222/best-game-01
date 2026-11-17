// Sound, synthesized live with the Web Audio API. No audio files, no network:
// every effect is a small oscillator/noise recipe, and the ambience is a slow
// detuned drone with a soft bass pulse that follows the wave.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicStarted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.10;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 0.3, when = 0, slide = 'exp' }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) {
      if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
      else osc.frequency.linearRampToValueAtTime(to, t0 + duration);
    }
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noise({ duration = 0.15, volume = 0.25, lowpass = 1200, when = 0 }) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  function startMusic() {
    if (!ctx || musicStarted) return;
    musicStarted = true;
    // Two detuned triangle drones a fifth apart, slowly breathing.
    const drone = (freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.22;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(musicGain);
      osc.start();
      lfo.start();
    };
    drone(55);
    drone(82.5);
    // A soft bass pulse every beat.
    const pulse = () => {
      if (muted) return;
      tone({ type: 'sine', from: 110, to: 55, duration: 0.5, volume: 0.10 });
      setTimeout(pulse, 1200);
    };
    setTimeout(pulse, 600);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ type: 'square', from: 880, to: 320, duration: 0.07, volume: 0.10 });
    },
    hit() {
      noise({ duration: 0.06, volume: 0.14, lowpass: 2400 });
    },
    enemyDie() {
      tone({ type: 'sawtooth', from: 220, to: 40, duration: 0.22, volume: 0.18 });
      noise({ duration: 0.18, volume: 0.16, lowpass: 900 });
    },
    pickup() {
      tone({ type: 'sine', from: 660, to: 990, duration: 0.09, volume: 0.16 });
      tone({ type: 'sine', from: 990, to: 1320, duration: 0.10, volume: 0.12, when: 0.07 });
    },
    hurt() {
      tone({ type: 'sawtooth', from: 160, to: 60, duration: 0.25, volume: 0.22 });
      noise({ duration: 0.2, volume: 0.18, lowpass: 700 });
    },
    waveClear() {
      [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', from: f, duration: 0.22, volume: 0.16, when: i * 0.09 }));
    },
    waveHorn() {
      tone({ type: 'sawtooth', from: 98, to: 147, duration: 0.5, volume: 0.14 });
      tone({ type: 'sawtooth', from: 147, to: 196, duration: 0.4, volume: 0.10, when: 0.3 });
    },
    boss() {
      tone({ type: 'sawtooth', from: 65, to: 32, duration: 0.9, volume: 0.25 });
      noise({ duration: 0.7, volume: 0.2, lowpass: 400 });
    },
    nova() {
      tone({ type: 'sine', from: 120, to: 900, duration: 0.35, volume: 0.22 });
      noise({ duration: 0.4, volume: 0.2, lowpass: 3000 });
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', from: f, duration: 0.4, volume: 0.16, when: i * 0.22 }));
    },
    upgrade() {
      tone({ type: 'sine', from: 587, to: 880, duration: 0.14, volume: 0.16 });
    },
  };
}
