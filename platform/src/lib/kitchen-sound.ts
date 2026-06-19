let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  volume: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/** Campanilla al recibir un pedido nuevo en cocina */
export function playKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    playTone(ctx, 880, t, 0.35, 0.35);
    playTone(ctx, 1174.66, t + 0.18, 0.35, 0.3);
    playTone(ctx, 1318.51, t + 0.36, 0.5, 0.25);
  } catch (e) {
    console.warn('No se pudo reproducir el sonido de cocina', e);
  }
}
