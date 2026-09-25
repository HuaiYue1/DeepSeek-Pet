// Renders the 大肥鱼 art: one SVG + transparent PNG per expression, the hero
// illustration (立绘) and the character sheet.   Usage: npm run art
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { fatFishSVG, EXPRESSIONS } from './fatfish.js';
import { characterSheetHTML } from './sheet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Web fonts come from @fontsource; without them the sheet falls back to system fonts.
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

async function main() {
  const svgDir = path.join(here, 'svg');
  const pngDir = path.join(here, 'png');
  fs.mkdirSync(svgDir, { recursive: true });
  fs.mkdirSync(pngDir, { recursive: true });

  const browser = await chromium.launch();

  const sprite = await browser.newPage({ viewport: { width: 512, height: 512 } });
  for (const key of Object.keys(EXPRESSIONS)) {
    const svg = fatFishSVG({ expression: key, id: key });
    fs.writeFileSync(path.join(svgDir, `fatfish-${key}.svg`), svg + '\n');
    await sprite.setContent(`<body style="margin:0">${svg.replace('<svg ', '<svg style="display:block" ')}</body>`);
    await sprite.screenshot({ path: path.join(pngDir, `fatfish-${key}.png`), omitBackground: true });
  }

  // The sheet is loaded from a file:// URL so its @import'ed font files resolve.
  const html = path.join(os.tmpdir(), 'fatfish-sheet.html');
  fs.writeFileSync(html, characterSheetHTML({ fontCSS: fontCSS() }));
  for (const [scale, shots] of [
    [1, async (page) => page.screenshot({ path: path.join(here, 'character-sheet.png') })],
    [2, async (page) => {
      await page.evaluate(() => { Object.assign(document.getElementById('hero').style, { borderRadius: '0', boxShadow: 'none' }); });
      await page.locator('#hero').screenshot({ path: path.join(here, 'hero.png') });
    }],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: scale });
    await page.goto(pathToFileURL(html).href);
    await page.evaluate(() => document.fonts.ready);
    await shots(page);
  }

  await browser.close();
  console.log(`wrote ${Object.keys(EXPRESSIONS).length} expressions, hero.png and character-sheet.png to ${here}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
