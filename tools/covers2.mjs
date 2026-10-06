// Renders the Kami CrazyGames covers (and the trailer title frames) from tools/art3.html.
// Usage: npx http-server -p 8080 . &  then  node tools/covers2.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch();
for (const [n, w, h] of [['cover-landscape-1920x1080', 1920, 1080], ['cover-portrait-800x1200', 800, 1200], ['cover-square-800x800', 800, 800], ['_kami-frame-1920x1080', 1920, 1080], ['_kami-frame-1080x1620', 1080, 1620]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${process.env.BASE || 'http://localhost:8080'}/tools/art3.html?w=${w}&h=${h}`);
  await p.waitForFunction(() => window.ARTDONE, null, { timeout: 15000 }).catch(() => {});
  if (errs.length) console.log(n, errs);
  const d = await p.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync((process.env.OUT || 'marketing') + '/' + n + '.png', Buffer.from(d.split(',')[1], 'base64'));
}
await b.close();
