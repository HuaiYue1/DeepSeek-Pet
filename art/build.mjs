// Renders the 深深 art: one SVG + transparent PNG per expression, the hero
// illustration (立绘) and the character sheet.   Usage: npm run art
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { characterSVG, EXPRESSIONS } from './shenshen.js';
import { characterSheetHTML } from './sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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

// Pages are loaded from file:// URLs so their @import'ed font files resolve.
async function openPage(browser, html, name, viewport, scale = 1) {
  const file = path.join(os.tmpdir(), `shenshen-${name}.html`);
  fs.writeFileSync(file, html);
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function main() {
  const svgDir = path.join(here, 'svg');
  const pngDir = path.join(here, 'png');
  fs.mkdirSync(svgDir, { recursive: true });
  fs.mkdirSync(pngDir, { recursive: true });

  const browser = await chromium.launch();

  const sprite = await openPage(browser, `<!doctype html><meta charset="utf-8"><style>${fontCSS()} body{margin:0} svg{display:block}</style><body></body>`, 'sprite', { width: 600, height: 1000 });
  for (const key of Object.keys(EXPRESSIONS)) {
    const svg = characterSVG({ expression: key, id: key });
    fs.writeFileSync(path.join(svgDir, `shenshen-${key}.svg`), svg + '\n');
    await sprite.evaluate((markup) => { document.body.innerHTML = markup; }, svg);
    await sprite.evaluate(() => document.fonts.ready);
    await sprite.screenshot({ path: path.join(pngDir, `shenshen-${key}.png`), omitBackground: true });
  }

  const html = characterSheetHTML({ fontCSS: fontCSS() });
  const sheet = await openPage(browser, html, 'sheet', { width: 1800, height: 1280 });
  await sheet.screenshot({ path: path.join(here, 'character-sheet.png') });

  const hero = await openPage(browser, html, 'hero', { width: 1800, height: 1280 }, 2);
  await hero.evaluate(() => { Object.assign(document.getElementById('hero').style, { borderRadius: '0', boxShadow: 'none' }); });
  await hero.locator('#hero').screenshot({ path: path.join(here, 'hero.png') });

  await browser.close();
  console.log(`wrote ${Object.keys(EXPRESSIONS).length} expressions, hero.png and character-sheet.png to ${here}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
