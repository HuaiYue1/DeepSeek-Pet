import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app/frames.js', import.meta.url), 'utf8');

function framesWithDecoder(delays) {
  const decoded = [];
  let closed = false;
  class ImageDecoder {
    tracks = { ready: Promise.resolve(), selectedTrack: { frameCount: delays.length } };

    async decode({ frameIndex }) {
      return { image: {
        displayWidth: 454, displayHeight: 668, duration: delays[frameIndex] * 1000,
        close: () => decoded.push(frameIndex),
      } };
    }

    close() { closed = true; }
  }
  const document = { createElement: () => ({
    getContext() { return { canvas: this, drawImage() {} }; },
  }) };
  const frames = vm.runInNewContext(`${source}; Frames`, { ImageDecoder, document });
  return { frames, decoded, isClosed: () => closed };
}

test('GIF frames are decoded, timed and released', async () => {
  const { frames, decoded, isClosed } = framesWithDecoder([100, 200, 100]);
  const registered = [];
  await frames.load('walk', new Uint8Array(), (key, canvas) => {
    registered.push(key);
    assert.equal(canvas.height, 668);
  });
  assert.deepEqual(registered, ['walk-0', 'walk-1', 'walk-2']);
  assert.deepEqual(decoded, [0, 1, 2]);
  assert.equal(isClosed(), true);
  assert.equal(frames.select({ act: 'walk', gait: 0.2 }), 'walk-0');
  assert.equal(frames.select({ act: 'run', gait: 0.3 }), 'walk-1');
  assert.equal(frames.select({ act: 'run', gait: 0.8 }), 'walk-2');
  assert.equal(frames.select({ act: 'walk-stop', gait: 0.3 }), 'walk-1');
  assert.equal(frames.select({ sprite: 'idle' }), null);
});

test('jump follows physics progress, greeting loops and feeding holds its last frame', async () => {
  const { frames } = framesWithDecoder([100, 100, 200]);
  for (const name of ['jump', 'jump-in-place', 'wave', 'munch']) await frames.load(name, new Uint8Array(), () => {});
  assert.equal(frames.select({ jumpPhase: 0.4 }), 'jump-1');
  assert.equal(frames.select({ jumpPhase: 0.9 }), 'jump-2');
  assert.equal(frames.select({ jumpKind: 'hop', jumpPhase: 0.4 }), 'jump-1');
  assert.equal(frames.select({ jumpKind: 'jump', jumpPhase: 0.4 }), 'jump-in-place-1');
  assert.equal(frames.select({ sprite: 'hello', spriteT: 0.43 }), 'wave-0');
  assert.equal(frames.select({ sprite: 'hello', spriteT: 2.6 }), 'wave-2');
  assert.equal(frames.select({ sprite: 'eat', act: 'munch', actT: 0.15 }), 'munch-1');
  assert.equal(frames.select({ sprite: 'eat', act: 'munch', actT: 1 }), 'munch-2');
  assert.equal(frames.select({ sprite: 'eat' }), 'munch-2');
});

test('all packaged animation assets are GIF89a', () => {
  for (const name of ['walk', 'wave', 'munch', 'jump', 'jump-in-place']) {
    const bytes = fs.readFileSync(new URL(`../art/animation/${name}.gif`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 6), 'GIF89a');
    const width = bytes.readUInt16LE(6);
    const height = bytes.readUInt16LE(8);
    assert.ok(width > 0 && height > 0);
    assert.ok(Math.abs(width / height - 908 / 1337) < 0.005);
  }
});
