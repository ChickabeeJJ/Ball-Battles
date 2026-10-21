import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const OUT = process.env.OUT || 'playstore-screenshots';
const VIEWPORT = { width: 540, height: 960 }; // 9:16; DPR 2 produces 1080 × 1920 PNGs.
const DPR = 2;
const FPS = 30;
const SETTINGS = {
  sound: 0, music: 0, dark: false, hitlag: true, parrylag: true,
  reverseB: false, vibrate: false, dmgNumbers: true, callouts: true,
  impact: true, finisher: true, overtime: false,
};
const slots = (ids, hp = 100) => {
  const arr = ids.map((id, slot) => ({ id, hp, scale: 1, ov: { damage: 0, spin: 0, speed: 0 }, slot }));
  while (arr.length < 6) arr.push({ ...arr[arr.length - 1], slot: arr.length });
  return arr;
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
async function newGame(label) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(label + ': ' + error.message));
  // The hosted game's ad SDK is not required for local screenshots.
  await page.route('https://sdk.crazygames.com/**', route => route.abort());
  await page.goto(BASE + '/index.html?playstore-capture=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.BB && window.BBCapture && window.BB.app && window.BB.app.state === 'menu', { timeout: 60000 });
  await page.evaluate(() => {
    document.querySelectorAll('.tut').forEach(node => node.remove());
    document.getElementById('btnStart')?.classList.remove('ps-hl');
    if (BB.save && BB.save.data) {
      BB.save.data.firstFight = 'done';
      BB.save.data.tutorialDone = true;
      BB.save.write();
    }
  });
  await page.addStyleTag({ content: '#banner{display:none!important} .tut{display:none!important} #btnStart.ps-hl{position:static!important;z-index:auto!important;animation:none!important;transform:none!important} *{-webkit-tap-highlight-color:transparent!important}' });
  await page.waitForTimeout(500);
  return { context, page };
}
async function configure(page, mode, map, ids, hp = 100) {
  await page.evaluate(([setup, settings]) => {
    BBCapture.configure(setup, settings);
    BB.app.refreshMenu();
  }, [{ mode, map, control: false, slots: slots(ids, hp) }, SETTINGS]);
  await page.waitForTimeout(300);
}
async function snap(page, name) {
  await page.evaluate(() => {
    document.fonts && document.fonts.ready;
    if (BB && BB.app && typeof BB.app.draw === 'function') BB.app.draw();
  });
  await page.waitForTimeout(350);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: 'png', animations: 'disabled' });
  console.log('CAPTURED', file);
}
async function closeGame(g) { await g.context.close(); }

// 1. Main menu with character/weapon selection.
{
  const g = await newGame('menu');
  await configure(g.page, '1v1', 'classic', ['phoenix', 'chainsaw', 'fibonacci', 'sword', 'dagger', 'spear']);
  await snap(g.page, '01-main-menu.png');
  await closeGame(g);
}

// 2. A real rendered 1v1 battle, advanced at a deterministic simulation seed.
{
  const g = await newGame('battle-classic');
  await configure(g.page, '1v1', 'classic', ['claymore', 'chainsaw', 'sword', 'dagger', 'axe', 'unarmed'], 100);
  await g.page.evaluate(seed => { BBCapture.start(seed); BB.app.impact = null; }, 3);
  await g.page.evaluate(([frames, fps]) => BBCapture.advance(frames, fps, true), [60, FPS]);
  await snap(g.page, '02-live-battle.png');
  await closeGame(g);
}

// 3. A six-ball free-for-all on a hazard map to show the game's variety.
{
  const g = await newGame('battle-ffa');
  await configure(g.page, 'ffa', 'saws', ['firestaff', 'thunderrod', 'guitar', 'kunai', 'axe', 'unarmed'], 100);
  await g.page.evaluate(seed => { BBCapture.start(seed); BB.app.impact = null; }, 8);
  await g.page.evaluate(([frames, fps]) => BBCapture.advance(frames, fps, true), [93, FPS]);
  await snap(g.page, '03-free-for-all.png');
  await closeGame(g);
}

// 4. Ball/weapon selection screen.
{
  const g = await newGame('collection');
  await configure(g.page, '1v1', 'classic', ['sword', 'phoenix', 'chainsaw', 'dagger', 'axe', 'unarmed']);
  await g.page.locator('#slots .slot').first().click();
  await g.page.getByRole('button', { name: 'Change' }).click();
  await g.page.waitForTimeout(500);
  await snap(g.page, '04-ball-collection.png');
  await closeGame(g);
}

// 5. Season Pass screen.
{
  const g = await newGame('season-pass');
  await configure(g.page, '1v1', 'classic', ['sword', 'phoenix', 'chainsaw', 'dagger', 'axe', 'unarmed']);
  await g.page.locator('#btnPass').click();
  await g.page.waitForSelector('#modal:not(.hidden) .sheet', { timeout: 10000 });
  await snap(g.page, '05-season-pass.png');
  await closeGame(g);
}

// 6. Quests screen.
{
  const g = await newGame('quests');
  await configure(g.page, '1v1', 'classic', ['sword', 'phoenix', 'chainsaw', 'dagger', 'axe', 'unarmed']);
  await g.page.locator('#btnQuests').click();
  await g.page.waitForSelector('#modal:not(.hidden) .sheet', { timeout: 10000 });
  await snap(g.page, '06-quests.png');
  await closeGame(g);
}

await browser.close();
if (errors.length) {
  console.error('Browser errors:', errors.join('\n'));
  // Do not fail only for non-fatal page errors; screenshots are still reviewed as artifacts.
}
console.log('Completed six 1080x1920 screenshots.');
