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
    inviteLink: (p) => { L('inviteLink'); return 'https://www.crazygames.com/game/ball-battles?' + Object.keys(p).map((k) => k + '=' + encodeURIComponent(p[k])).join('&'); },
    getInviteParam: (k) => (k === 'pvp' ? window.__invite || null : null),
    showInviteButton: () => L('showInviteButton'), hideInviteButton: () => L('hideInviteButton'),
    updateRoom: (o) => { window.__room = o; L('updateRoom'); }, addJoinRoomListener: (fn) => { window.__join = fn; L('addJoinRoomListener'); },
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
await page.waitForSelector('.tut', { timeout: 5000 });
await page.click('.tut-row .btn:has-text("Skip")');
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) process.exitCode = 1; };
let log = await page.evaluate(() => __log.slice());
check('init -> loadingStart -> loadingStop', log.join(',').startsWith('init,loadingStart') && log.includes('loadingStop'));
check('no gameplayStart on menu', !log.includes('gameplayStart'));
check('room join listener registered', log.includes('addJoinRoomListener'));
// creating a challenge opens a joinable room with invite params
await page.evaluate(() => BB.meta.pvpCreated(['sword', 'axe', 'spear']));
await page.waitForFunction(() => window.__room);
check('updateRoom on challenge', await page.evaluate(() => __room.isJoinable === true && !!__room.roomId && !!(__room.inviteParams && __room.inviteParams.pvp3)));
// joining a friend's room from the listener opens their challenge
const p3 = await page.evaluate(() => __room.inviteParams);
await page.evaluate(() => { BB.ui.onClose = null; BB.ui.close(); BB.save.data.meta.pvp.sent = []; });
await page.evaluate((p) => __join(p), p3);
await page.waitForTimeout(400);
check('join listener opens the challenge', await page.evaluate(() => !!document.querySelector('.vs-sheet')));
await page.evaluate(() => { BB.ui.onClose = null; BB.ui.close(); });

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

// rewarded ad: audio muted while the ad plays, coins tripled after
const coins0 = await page.evaluate(() => BB.save.data.coins);
await page.click('text=Triple coins');
await page.waitForFunction(() => __log.includes('adStarted'));
check('audio muted during ad', await page.evaluate(() => BB.audio.blocked === true));
await page.waitForFunction(() => __log.includes('adFinished'));
await page.waitForTimeout(100);
check('audio restored after ad', await page.evaluate(() => BB.audio.blocked === false));
check('rewarded triples coins', (await page.evaluate(() => BB.save.data.coins)) === coins0 * 3);

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

// PvP: the PvP Arena replaces the Gauntlet on CrazyGames; a squad link round-trips into a series
check('PvP button visible on CrazyGames', await page.isVisible('#btnPvp'));
await page.click('#btnPvp');
// first visit opens the PvP tutorial; it can be skipped
await page.waitForSelector('.pt-wrap');
check('PvP tutorial on first visit', await page.isVisible('.pt-skip'));
await page.click('.pt-skip');
await page.click('.pvx-fb .btn.primary');
for (let i = 0; i < 3; i++) await page.click(`.grid .tile >> nth=${i}`);
await page.click('text=Confirm squad');
await page.waitForTimeout(200);
const link = await page.inputValue('.pvp-link');
check('PvP invite link created', /pvp3=/.test(link));
const short = await page.textContent('.pvp-code b');
check('PvP short code decodes back to the challenge', await page.evaluate((c) => { const d = BB.meta.readCode(c); return !!d && d.kind === 'challenge'; }, short));
check('CrazyGames invite button shown', (await page.evaluate(() => __log.slice())).includes('showInviteButton'));
const code = decodeURIComponent(link.split('pvp3=')[1]);
await page.click('.x-btn');
const pv = await browser.newPage({ viewport: { width: 1000, height: 560 } });
pv.on('pageerror', (e) => errs.push('pvp: ' + e.message));
await pv.route('**/crazygames-sdk-v3.js', (r) => r.fulfill({ contentType: 'text/javascript', body: MOCK.replace("getInviteParam: (k) => (k === 'pvp' ? window.__invite || null : null),", "getInviteParam: (k) => (k === 'pvp3' ? " + JSON.stringify(code) + " : null),") }));
await pv.goto(BASE + '/index.html');
await pv.waitForSelector('text=CHALLENGE RECEIVED', { timeout: 8000 });
await pv.click('text=Pick your squad');
for (let i = 3; i < 6; i++) await pv.click(`.grid .tile >> nth=${i}`);
await pv.click('text=Confirm squad');
check('PvP lineup revealed after locking in', await pv.isVisible('.lu-row'));
await pv.click('text=Start round 1');
await pv.click('.vs-go');
await pv.waitForTimeout(300);
check('challenge link opens a PvP series battle', await pv.evaluate(() => BB.app.state === 'battle' && BB.app.event && BB.app.event.kind === 'pvp3'));
check('PvP round uses the challenge seed', (await pv.evaluate(() => BB.app.sim.cfg.seed)) === (Number(code.split('~')[2]) | 0));
// play the whole series headlessly fast: all 3 rounds must run even if one side already has 2 wins
const rounds = await pv.evaluate(async () => {
  let n = 0;
  for (let guard = 0; guard < 3; guard++) {
    while (!BB.app.sim.over) BB.app.sim.step(1 / 120);
    n++;
    BB.app.onOver();
    await new Promise((r) => setTimeout(r, 50));
    const go = document.querySelector('.vs-go');
    if (!go) break;
    go.click();
    await new Promise((r) => setTimeout(r, 50));
  }
  return { n, final: !!document.querySelector('.pvp-foot'), res: BB.meta.data().pvp.hist.length };
});
check('PvP series plays all 3 rounds', rounds.n === 3 && rounds.final && rounds.res === 1);

// Standalone (SDK missing) still works
const p2 = await browser.newPage();
await p2.route('**/crazygames-sdk-v3.js', (r) => r.fulfill({ status: 404, body: '' }));
await p2.goto(BASE + '/index.html');
await p2.waitForFunction(() => BB.app.state === 'menu', null, { timeout: 10000 });
check('runs without the SDK', true);
check('PvP hidden off CrazyGames', !(await p2.isVisible('#optPvp')));
check('no page errors', errs.length === 0);
if (errs.length) console.log(errs);
await browser.close();
