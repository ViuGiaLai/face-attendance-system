let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.value = volume;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export function playBeep() {
  playTone(880, 0.12, 'sine', 0.15);
}

export function playSuccess() {
  playTone(523, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 100);
  setTimeout(() => playTone(784, 0.2, 'sine', 0.12), 200);
}

export function playError() {
  playTone(200, 0.15, 'sawtooth', 0.1);
  setTimeout(() => playTone(180, 0.25, 'sawtooth', 0.1), 150);
}

export function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
