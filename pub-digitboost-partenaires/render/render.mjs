// Rendu image par image de la page avec Playwright (Chromium).
// Usage :
//   node render/render.mjs --v=30 --out=/chemin/frames            (toutes les images, 60 i/s)
//   node render/render.mjs --v=30 --stills=0.5,3.2,12 --out=dir   (images fixes de contrôle)
//   node render/render.mjs --v=30 --cues=cues.json                (exporte les repères sonores)
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.join('=') || true];
}));
const here = path.dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(path.join(here, '..', 'src', 'index.html')).href;
const version = args.v || '30';
const fps = +(args.fps || 60);
const workers = +(args.workers || 4);
const out = args.out || path.join(here, '..', 'build', 'frames');
fs.mkdirSync(out, { recursive: true });

const dsf = +(args.dsf || 1);
const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none'] });

async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: dsf });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('PAGE ERROR', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await p.goto(page);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return p;
}

if (args.cues) {
  const p = await openPage();
  const cues = await p.evaluate(() => ({ duration: getDuration(), scenes: getScenes(), cues: getCues() }));
  fs.writeFileSync(args.cues, JSON.stringify(cues, null, 1));
  console.log('cues:', cues.cues.length, 'scenes:', JSON.stringify(cues.scenes));
  await browser.close();
  process.exit(0);
}

if (args.stills) {
  const p = await openPage();
  for (const t of String(args.stills).split(',').map(Number)) {
    await p.evaluate((tt) => renderAt(tt), t);
    await p.screenshot({ path: path.join(out, `still_${t.toFixed(2)}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const p0 = await openPage();
const duration = await p0.evaluate(() => getDuration());
const N = Math.round(duration * fps);
const from = +(args.from || 0), to = Math.min(N, +(args.to || N));
const chunk = Math.ceil((to - from) / workers);
const t0 = Date.now();
let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const p = w === 0 ? p0 : await openPage();
  const a = from + w * chunk, b = Math.min(to, a + chunk);
  for (let i = a; i < b; i++) {
    await p.evaluate((tt) => renderAt(tt), i / fps);
    await p.screenshot({ path: path.join(out, `f_${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
    if (++done % 100 === 0) console.log(`${done}/${to - from} images — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}));
console.log(`terminé : ${to - from} images en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
