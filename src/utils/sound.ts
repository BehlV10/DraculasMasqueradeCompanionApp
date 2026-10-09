// Web Audio API sound synthesizer - zero external files needed, 100% offline capable

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleSound(enabled?: boolean): boolean {
  if (enabled !== undefined) {
    soundEnabled = enabled;
  } else {
    soundEnabled = !soundEnabled;
  }
  return soundEnabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function playTick() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

export function playBell() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [220, 440, 659.25, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const initialGain = 0.2 / (i + 1);
    gain.gain.setValueAtTime(initialGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.8);
  });
}

export function playPassSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, now); // C5
  osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
  osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.45);
}

export function playFailSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(65, now + 0.4);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}

export function playVictorySound(isGood: boolean) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqs = isGood 
    ? [261.63, 329.63, 392.00, 523.25, 659.25, 783.99] // C Major
    : [220.00, 261.63, 311.13, 392.00, 440.00, 311.13]; // Diminished / minor evil chord

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + idx * 0.12;

    osc.type = isGood ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 1.2);
  });
}
