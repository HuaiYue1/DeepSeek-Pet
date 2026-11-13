// Decode the GIFs into canvases so the app can pick the displayed frame
// from the pet's movement and use that same frame for click-through.
'use strict';

const Frames = (() => {
  const clips = new Map();

  function select(motion) {
    let name;
    let time;
    let phase;
    if (motion.act === 'walk' || motion.act === 'run') {
      name = 'walk';
      phase = motion.gait;
    } else if (motion.jumpPhase != null) {
      name = 'jump';
      phase = motion.jumpPhase;
    } else if (motion.sprite === 'hello') {
      name = 'wave';
      time = motion.act === 'wave' ? motion.actT : motion.spriteT;
    } else if (motion.sprite === 'eat') {
      name = 'munch';
      time = motion.act === 'munch' ? motion.actT : Infinity;
    }

    const clip = clips.get(name);
    if (!clip) return null;
    if (phase != null) time = phase * clip.duration;
    if (name === 'wave') time = time < 2.5 ? time % clip.duration : Infinity;
    const frame = clip.ends.findIndex((end) => time < end);
    return `${name}-${frame < 0 ? clip.ends.length - 1 : frame}`;
  }

  async function load(key, bytes, add) {
    let decoder;
    try {
      decoder = new ImageDecoder({ data: bytes, type: 'image/gif' });
      await decoder.tracks.ready;
      const count = decoder.tracks.selectedTrack?.frameCount;
      if (!count) return;

      let duration = 0;
      const ends = [];
      const frames = [];
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        try {
          const frame = document.createElement('canvas');
          frame.width = image.displayWidth;
          frame.height = image.displayHeight;
          const ctx = frame.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, 0, 0);
          frames.push(ctx);
          duration += (image.duration || 100000) / 1e6;
          ends.push(duration);
        } finally {
          image.close();
        }
      }
      frames.forEach((ctx, i) => add(`${key}-${i}`, ctx.canvas, ctx));
      clips.set(key, { duration, ends });
    } catch (error) {
      console.warn(`Could not decode the ${key} animation`, error);
    } finally {
      decoder?.close();
    }
  }

  return { select, load };
})();
