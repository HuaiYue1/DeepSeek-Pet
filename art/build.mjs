// Builds the final sprites and the character sheet from the cut-outs.
//
//   python art/cutout.py ...   -> art/cut/<state>.png   aligned, no text
//   npm run art                -> art/png/<state>.png   with the meme text
//                                 art/character-sheet.png
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { STATES, OVERLAYS } from './states.mjs';
import { characterSheetHTML } from './sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const INK = '#1B2266';

// Web fonts come from @fontsource; without them the pages fall back to system fonts.
function fontCSS() {
  return ['@fontsource/zcool-kuaile/index.css', '@fontsource/noto-sans-sc/400.css', '@fontsource/noto-sans-sc/700.css']
    .map((pkg) => {
      try {
        return `@import url('${pathToFileURL(require.resolve(pkg)).href}');`;
      } catch {
        console.warn(`font ${pkg} not installed, using system fonts`);
        return '';
      }
    })
    .join('\n');
}

// Pages are loaded from file:// URLs so fonts and images resolve.
async function openPage(browser, html, name, viewport) {
  const file = path.join(os.tmpdir(), `deepseek-pet-${name}.html`);
  fs.writeFileSync(file, html);
  const page = await browser.newPage({ viewport });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

function spriteHTML(src, size, overlay) {
  const text = overlay
    ? (() => {
        const [x, y, w, h] = overlay.box;
        const lines = overlay.lines.map(([t, s], i) => `<div style="font-size:${s}px;${i ? 'color:#4A5288' : ''}">${t}</div>`).join('');
        return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2;color:${INK};font-family:'ZCOOL KuaiLe','Noto Sans SC',sans-serif;white-space:nowrap">${lines}</div>`;
      })()
    : '';
  return `<!doctype html><meta charset="utf-8"><style>${fontCSS()} body{margin:0;position:relative;width:${size[0]}px;height:${size[1]}px}</style>
    <body><img src="${src}" style="position:absolute;left:0;top:0">${text}</body>`;
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

async function main() {
  const cutDir = path.join(here, 'cut');
  const pngDir = path.join(here, 'png');
  fs.mkdirSync(pngDir, { recursive: true });
  const states = Object.keys(STATES).filter((k) => fs.existsSync(path.join(cutDir, `${k}.png`)));
  if (!states.length) throw new Error('no cut-outs in art/cut — run art/cutout.py first');

  const browser = await chromium.launch();
  for (const key of states) {
    const src = path.join(cutDir, `${key}.png`);
    const size = pngSize(src);
    const page = await openPage(browser, spriteHTML(pathToFileURL(src).href, size, OVERLAYS[key]), `sprite-${key}`, { width: size[0], height: size[1] });
    await page.screenshot({ path: path.join(pngDir, `${key}.png`), omitBackground: true });
    await page.close();
  }

  const html = characterSheetHTML({ fontCSS: fontCSS(), sprite: (key) => pathToFileURL(path.join(pngDir, `${key}.png`)).href });
  const sheet = await openPage(browser, html, 'sheet', { width: 1800, height: 1200 });
  await sheet.screenshot({ path: path.join(here, 'character-sheet.png') });

  await browser.close();
  console.log(`wrote ${states.length} sprites to ${pngDir} and character-sheet.png`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
