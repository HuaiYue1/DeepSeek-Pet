// Each atlas contains complete drawings on the same canvas and floor line.
'use strict';

const Frames = (() => {
  const SHEETS = { walk: [4, 2], wave: [2, 2], munch: [2, 2], jump: [2, 2] };
  const GREETING = [3, 0, 1, 2, 2, 1, 3];
  const BITE = [[0.30, 0], [0.56, 1], [0.82, 2], [1.26, 3], [1.49, 2], [1.88, 3], [2.12, 2]];
  const FRAME_WIDTH = 454;
  const FRAME_HEIGHT = 668;

  function select(motion) {
    if (motion.act === 'walk' || motion.act === 'run') return `walk-${Math.floor(motion.gait * 8)}`;
    if (motion.jumpPhase != null) {
      const phase = motion.jumpPhase;
      if (phase > 0.08 && phase < 0.96) {
        const frame = phase < 0.23 ? 0 : phase < 0.35 || (phase > 0.68 && phase < 0.81) ? 1 : phase < 0.81 ? 2 : 3;
        return `jump-${frame}`;
      }
    }
    if (motion.sprite === 'hello') {
      const time = motion.act === 'wave' ? motion.actT : motion.spriteT;
      return `wave-${time < 2.5 ? GREETING[Math.floor(time / 0.10) % GREETING.length] : 3}`;
    }
    if (motion.sprite === 'eat') {
      const frame = motion.act === 'munch' ? (BITE.find(([end]) => motion.actT < end)?.[1] ?? 3) : 3;
      return `munch-${frame}`;
    }
    return null;
  }

  async function load(key, url, add) {
    const [cols, rows] = SHEETS[key];
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      return; // the state still has its regular illustration
    }
    if (image.naturalWidth !== cols * FRAME_WIDTH || image.naturalHeight !== rows * FRAME_HEIGHT) return;
    for (let i = 0; i < cols * rows; i++) {
      const frame = document.createElement('canvas');
      frame.width = FRAME_WIDTH;
      frame.height = FRAME_HEIGHT;
      const ctx = frame.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, -(i % cols) * FRAME_WIDTH, -Math.floor(i / cols) * FRAME_HEIGHT);
      add(`${key}-${i}`, frame, ctx);
    }
  }

  return { select, load };
})();
