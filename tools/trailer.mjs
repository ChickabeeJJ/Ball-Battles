// Fast-paced cinematic trailers for CrazyGames (landscape 1920x1080 + portrait 1080x1620).
// Real gameplay at 1x speed (no fast-forward), impact frames on, quick flash cuts, opens on the cover.
// Usage: npx http-server -p 8080 . &  then  node tools/trailer.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = 'marketing', TMP = path.join(OUT, '_frames', 'trailer');
const FPS = 30, SIZE = 1080;
const SETTINGS = { sound: 0, dark: false, hitlag: true, parrylag: true, reverseB: false, vibrate: false, dmgNumbers: true, impact: true, speed: 1 };
const sl = (ids, hp) => ids.map((id) => ({ id, hp, scale: 1, ov: { damage: 0, spin: 0, speed: 0 } }));

// Find a seed whose knockout lands inside the recorded window (headless, same sim code).
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['core', 'data', 'data2', 'balance', 'sim']) require('../js/' + f + '.js');
function koSeed(mode, map, ids, hp, lo, hi) {
  const BB = globalThis.BB;
  const slots = ids.map((id, i) => ({ id, hp, scale: 1, ov: {}, slot: i }));
  for (let seed = 1; seed < 5000; seed++) {
    const s = new BB.Sim({ seed, map, settings: SETTINGS, teams: BB.MODE[mode].teams.map((t) => t.map((i) => slots[i])) });
    let ko = -1;
    while (!s.over && s.t < hi + 2) { s.step(1 / 120); for (const e of s.events) if (e.type === 'ko') ko = s.t; s.events.length = 0; if (ko >= 0) break; }
    if (ko >= lo && ko <= hi) return { seed, t: ko };
  }
  throw new Error('no KO seed');
}

const CLIPS = [
  { mode: '1v1', map: 'classic', ids: ['claymore', 'chainsaw'], hp: 100, seed: 3, skip: 1.2, secs: 2.0 },
  { mode: 'ffa', map: 'saws', ids: ['firestaff', 'thunderrod', 'guitar', 'kunai'], hp: 100, seed: 8, skip: 2.5, secs: 2.0 },
  { mode: '1v1', map: 'meteor', ids: ['phoenix', 'halberd'], hp: 100, seed: 4, skip: 2.0, secs: 1.8 },
  { mode: '3v3', map: 'pillars', ids: ['sword', 'flail', 'mace', 'rapier', 'trident', 'sai'], hp: 100, seed: 6, skip: 2.0, secs: 2.0 },
  { mode: '1v1', map: 'bouncy', ids: ['fish', 'broom'], hp: 100, seed: 2, skip: 1.5, secs: 1.8 },
  { mode: '2v2', map: 'shrink', ids: ['whip', 'sickle', 'umbrella', 'pan'], hp: 100, seed: 9, skip: 5.0, secs: 1.8 },
  { mode: 'ffa', map: 'potato', ids: ['unarmed', 'tank', 'tiny', 'rage'], hp: 100, seed: 5, skip: 3.0, secs: 1.8 },
  { mode: '1v1', map: 'classic', ids: ['unarmed', 'sword'], hp: 15, ko: true, skip: 1.0, secs: 2.8 },
];
// finale: start the clip ~1.3s before the knockout so it lands mid-shot
for (const c of CLIPS) if (c.ko) { const k = koSeed(c.mode, c.map, c.ids, c.hp, 2, 12); c.seed = k.seed; c.skip = Math.max(0, k.t - 1.3); }

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 1300 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
await page.goto(`${BASE}/index.html?capture`);
await page.waitForFunction(() => window.BB && BB.app && BB.app.state === 'menu');
await page.waitForTimeout(800);
const clipFiles = [];
for (let ci = 0; ci < CLIPS.length; ci++) {
  const c = CLIPS[ci], dir = path.join(TMP, 'c' + ci);
  fs.mkdirSync(dir, { recursive: true });
  const slots = sl(c.ids, c.hp);
  while (slots.length < 6) slots.push(slots[slots.length - 1]);
  await page.evaluate(([setup, st]) => BBCapture.configure(setup, st), [{ mode: c.mode, map: c.map, control: false, slots }, SETTINGS]);
  await page.evaluate((seed) => { BBCapture.start(seed); BB.app.impact = null; }, c.seed);
  await page.evaluate(([n, fps]) => BBCapture.advance(n, fps), [Math.round(c.skip * FPS), FPS]);
  await page.evaluate((px) => BB.app.renderer.resize(px), SIZE);
  const frames = Math.round(c.secs * FPS);
  for (let f = 0; f < frames; f++) {
    const data = await page.evaluate(([fps, px]) => { BBCapture.advance(1, fps); if (BB.app.renderer.px !== px) BB.app.renderer.resize(px); BB.app.draw(); return document.getElementById('arena').toDataURL('image/jpeg', 0.93); }, [FPS, SIZE]);
    fs.writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
  }
  const mp4 = path.join(TMP, `c${ci}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', mp4]);
  clipFiles.push(mp4);
  console.log('clip', ci, c.map, c.ids.join('/'), 'seed', c.seed);
}
await browser.close();

// Stitch: punchy white-flash cuts between clips.
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const X = 0.12;
let filter = '', last = '[0:v]', offset = 0;
const inputs = [];
clipFiles.forEach((f) => inputs.push('-i', f));
for (let i = 1; i < clipFiles.length; i++) {
  offset += dur(clipFiles[i - 1]) - X;
  const outL = i === clipFiles.length - 1 ? '[g]' : `[x${i}]`;
  filter += `${last}[${i}:v]xfade=transition=fadewhite:duration=${X}:offset=${offset.toFixed(3)}${outL};`;
  last = outL;
}
const gameplay = path.join(TMP, 'gameplay.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter.replace(/;$/, ''), '-map', '[g]', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', gameplay]);

// Compose each format: blurred, darkened copy as the backdrop (no black bars), arena framed on top,
// opening on the static cover which crossfades into the action.
for (const [name, W, H, A, cover] of [
  ['preview-landscape-1920x1080.mp4', 1920, 1080, 1000, '_frame-landscape-1920x1080.png'],
  ['preview-portrait-1080x1620.mp4', 1080, 1620, 1040, '_frame-portrait-1080x1620.png'],
]) {
  const big = Math.max(W, H);
  const fc = [
    `[1:v]split[a][b]`,
    `[a]scale=${big}:${big},crop=${W}:${H},boxblur=28:2,eq=brightness=-0.22:saturation=1.3[bg]`,
    `[b]scale=${A}:${A},pad=${A + 12}:${A + 12}:6:6:color=0x0d0d12[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=${FPS},settb=1/${FPS},format=yuv420p,setsar=1[gp]`,
    `[0:v]scale=${W}:${H},fps=${FPS},settb=1/${FPS},format=yuv420p,setsar=1[cv]`,
    `[cv][gp]xfade=transition=zoomin:duration=0.35:offset=0.9[v]`,
  ].join(';');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-t', '1.25', '-framerate', String(FPS), '-i', path.join(OUT, cover), '-i', gameplay,
    '-filter_complex', fc, '-map', '[v]', '-an', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, name)]);
  console.log('wrote', name, dur(path.join(OUT, name)).toFixed(1) + 's');
}
