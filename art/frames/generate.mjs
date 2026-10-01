// Draws the animation frames listed in frames.json with OpenAI's image
// editing: each frame is one original picture with only its masked part
// redrawn. The results go to out/<frame>.png.
//
//   OPENAI_API_KEY=sk-... node art/frames/generate.mjs              every frame not drawn yet
//   OPENAI_API_KEY=sk-... node art/frames/generate.mjs walk-a walk-b  just these, again
//
// OPENAI_IMAGE_MODEL picks another model (default gpt-image-1). TRIES=3
// draws three tries of each frame, out/<frame>-1.png and so on, to pick from.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(here, 'frames.json'), 'utf8'));
const key = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const tries = Math.max(1, Number(process.env.TRIES) || 1);
const wanted = process.argv.slice(2);

const png = (file) => new Blob([fs.readFileSync(path.join(here, file))], { type: 'image/png' });

async function edit(frame, settings) {
  const form = new FormData();
  form.append('model', model);
  form.append('image', png(frame.image), 'image.png');
  form.append('mask', png(frame.mask), 'mask.png');
  form.append('prompt', frame.prompt);
  form.append('size', spec.size);
  form.append('n', String(tries));
  for (const [name, value] of Object.entries(settings)) form.append(name, value);
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error?.message || `${res.status} ${res.statusText}`), { status: res.status });
  return body.data.map((d) => Buffer.from(d.b64_json, 'base64'));
}

async function main() {
  if (!key) {
    console.error('Set OPENAI_API_KEY first, e.g. OPENAI_API_KEY=sk-... node art/frames/generate.mjs');
    process.exit(1);
  }
  const unknown = wanted.filter((name) => !spec.frames.some((f) => f.name === name));
  if (unknown.length) throw new Error(`no such frame: ${unknown.join(', ')}`);
  fs.mkdirSync(path.join(here, 'out'), { recursive: true });
  for (const frame of spec.frames) {
    if (wanted.length ? !wanted.includes(frame.name) : fs.existsSync(path.join(here, frame.out))) continue;
    process.stdout.write(`${frame.name}: ${frame.zh} ... `);
    let images;
    try {
      // the settings that keep the picture most like the original; a model
      // that doesn't take them gets asked again without
      images = await edit(frame, { quality: 'high', background: 'transparent', input_fidelity: 'high' });
    } catch (e) {
      if (e.status !== 400) throw e;
      images = await edit(frame, {});
    }
    images.forEach((image, i) => {
      const file = tries > 1 ? frame.out.replace(/\.png$/, `-${i + 1}.png`) : frame.out;
      fs.writeFileSync(path.join(here, file), image);
    });
    console.log('done');
  }
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
