// Renders the three CrazyGames covers (plus video-sized title frames) from tools/art.html.
// Usage: npx http-server -p 8080 . &  then  node tools/covers.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = process.env.OUT || 'marketing';
const sizes = [
  ['cover-landscape-1920x1080.png', 1920, 1080],
  ['cover-portrait-800x1200.png', 800, 1200],
  ['cover-square-800x800.png', 800, 800],
  ['_frame-landscape-1920x1080.png', 1920, 1080],
  ['_frame-portrait-1080x1620.png', 1080, 1620],
];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [name, w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${BASE}/tools/art.html?w=${w}&h=${h}`);
  await page.waitForFunction(() => window.ARTDONE);
  const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(`${OUT}/${name}`, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', name);
  await page.close();
}
await browser.close();
