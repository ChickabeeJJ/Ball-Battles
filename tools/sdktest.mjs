// Exercises the CrazyGames SDK v3 integration against a mock SDK and checks the call order
// QA looks for. Usage: npx http-server -p 8080 . &  then  node tools/sdktest.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8080';
const MOCK = `
window.__log = [];
const L = (m) => window.__log.push(m);
window.__settingsCbs = [];
window.__data = {};
window.CrazyGames = { SDK: {
  environment: 'crazygames',
  init: async () => L('init'),
  game: {
    settings: { muteAudio: false, disableChat: false },
    addSettingsChangeListener: (cb) => window.__settingsCbs.push(cb),
    loadingStart: () => L('loadingStart'), loadingStop: () => L('loadingStop'),
    gameplayStart: () => L('gameplayStart'), gameplayStop: () => L('gameplayStop'),
    happytime: () => L('happytime'),
  },
  ad: { requestAd: (type, cb) => { L('requestAd:' + type); setTimeout(() => { cb.adStarted(); L('adStarted'); setTimeout(() => { L('adFinished'); cb.adFinished(); }, 300); }, 100); } },
  data: { getItem: (k) => (k in window.__data ? window.__data[k] : null), setItem: (k, v) => { window.__data[k] = v; L('data.setItem'); }, removeItem: () => {}, clear: () => {} },
}};`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 560 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.route('**/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: MOCK }));
await page.goto(BASE + '/index.html');
await page.waitForFunction(() => BB.app.state === 'menu');
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) process.exitCode = 1; };
let log = await page.evaluate(() => __log.slice());
check('init -> loadingStart -> loadingStop', log.join(',').startsWith('init,loadingStart') && log.includes('loadingStop'));
check('no gameplayStart on menu', !log.includes('gameplayStart'));

await page.click('#btnStart');
await page.waitForTimeout(300);
log = await page.evaluate(() => __log.slice());
check('gameplayStart on battle start', log[log.length - 1] === 'gameplayStart');

await page.click('#btnPause');
log = await page.evaluate(() => __log.slice());
check('gameplayStop on pause', log[log.length - 1] === 'gameplayStop');
const tPaused = await page.evaluate(() => BB.app.sim.t);
await page.waitForTimeout(400);
check('sim frozen while paused', (await page.evaluate(() => BB.app.sim.t)) === tPaused);
await page.click('text=Resume');
log = await page.evaluate(() => __log.slice());
check('gameplayStart on resume', log[log.length - 1] === 'gameplayStart');

// muteAudio from the platform wins over in-game volume
await page.evaluate(() => { CrazyGames.SDK.game.settings.muteAudio = true; __settingsCbs.forEach((f) => f({ muteAudio: true })); });
check('platform muteAudio blocks audio', await page.evaluate(() => BB.audio.blocked === true));
await page.evaluate(() => { CrazyGames.SDK.game.settings.muteAudio = false; __settingsCbs.forEach((f) => f({ muteAudio: false })); });
check('audio restored after unmute', await page.evaluate(() => BB.audio.blocked === false));

// finish the battle quickly
await page.evaluate(() => BB.app.sim.balls.filter((b) => b.team === 1).forEach((b) => (b.hp = 0.5)));
await page.waitForSelector('.result', { timeout: 30000 });
log = await page.evaluate(() => __log.slice());
check('gameplayStop on results', log[log.length - 1] === 'gameplayStop' || log.slice(-3).includes('gameplayStop'));
check('progress saved via SDK data module', log.includes('data.setItem') && (await page.evaluate(() => !!__data.ballbattles_save_v1)));

// rewarded ad: audio muted while the ad plays, coins doubled after
const coins0 = await page.evaluate(() => BB.save.data.coins);
await page.click('text=Double coins');
await page.waitForFunction(() => __log.includes('adStarted'));
check('audio muted during ad', await page.evaluate(() => BB.audio.blocked === true));
await page.waitForFunction(() => __log.includes('adFinished'));
await page.waitForTimeout(100);
check('audio restored after ad', await page.evaluate(() => BB.audio.blocked === false));
check('rewarded doubles coins', (await page.evaluate(() => BB.save.data.coins)) === coins0 * 2);

// midgame: skipped before 3 minutes, shown after
await page.click('text=Continue');
await page.waitForTimeout(300);
log = await page.evaluate(() => __log.slice());
check('no midgame within 3 minutes of start', !log.includes('requestAd:midgame'));
await page.click('#btnStart');
await page.evaluate(() => { BB.sdk.lastMidgame = Date.now() - 200000; BB.app.sim.balls.filter((b) => b.team === 1).forEach((b) => (b.hp = 0.5)); });
await page.waitForSelector('.result', { timeout: 30000 });
await page.click('text=Continue');
await page.waitForTimeout(800);
log = await page.evaluate(() => __log.slice());
check('midgame ad at the break after 3 minutes', log.includes('requestAd:midgame'));
check('back on menu, gameplay stopped', (await page.evaluate(() => BB.app.state)) === 'menu' && log.lastIndexOf('gameplayStop') > log.lastIndexOf('gameplayStart'));

// keyboard must not scroll the host page
const prevented = await page.evaluate(() => { const e = new KeyboardEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown', cancelable: true, bubbles: true }); window.dispatchEvent(e); return e.defaultPrevented; });
check('arrow keys do not scroll the page', prevented);

// Standalone (SDK missing) still works
const p2 = await browser.newPage();
await p2.route('**/crazygames-sdk-v3.js', (r) => r.fulfill({ status: 404, body: '' }));
await p2.goto(BASE + '/index.html');
await p2.waitForFunction(() => BB.app.state === 'menu', null, { timeout: 10000 });
check('runs without the SDK', true);
check('no page errors', errs.length === 0);
if (errs.length) console.log(errs);
await browser.close();
