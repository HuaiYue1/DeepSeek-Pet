import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Her pictures are only ever moved about, never stretched, squashed,
// turned or bent by an animation: that looks like a picture pulled out of
// shape rather than her moving (see app/style.css).
const css = fs.readFileSync(new URL('../app/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function keyframes(name) {
  const start = css.indexOf(`@keyframes ${name} {`);
  assert.ok(start >= 0, `no @keyframes ${name}`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unclosed @keyframes ${name}`);
}

test('animations on her picture only move it', () => {
  const rules = [...css.matchAll(/([^{}]*#(?:sprite|flip)\s*)\{([^}]*)\}/g)];
  const names = new Set();
  for (const [, , body] of rules) {
    const animation = body.match(/animation:\s*([^;]+)/);
    if (animation && !/^\s*none/.test(animation[1])) names.add(animation[1].trim().split(/\s+/)[0]);
  }
  assert.ok(names.size >= 5, `found ${[...names]}`);
  for (const name of names) {
    const frames = keyframes(name);
    assert.doesNotMatch(frames, /\b(transform|scale|rotate|skew|matrix)\w*\s*[:(]/, `@keyframes ${name} changes her shape`);
    assert.match(frames, /translate:/, `@keyframes ${name} should move her`);
  }
});
