// Records the two CrazyGames preview videos (landscape 1920x1080, portrait 1080x1620)
// from real gameplay at 1x speed, opening on the static cover frame. No audio.
// Usage: npx http-server -p 8080 . &  then  node tools/capture.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = process.env.OUT || 'marketing';
const TMP = process.env.TMP_DIR || path.join(OUT, '_frames');
const FPS = 30;
const SETTINGS = { sound: 0, dark: false, hitlag: true, parrylag: true, reverseB: false, vibrate: false, dmgNumbers: true };
const slots = (ids, hp) => ids.map((id) => ({ id, hp, scale: 1, ov: { damage: 0, spin: 0, speed: 0 } }));

// Seeds come from `node tools/seeds.js`; KO clips stop shortly after the knockout.
const VIDEOS = [
  {
    name: 'preview-landscape-1920x1080.mp4', w: 1920, h: 1080, cover: '_frame-landscape-1920x1080.png',
    clips: [
      { setup: { mode: '1v1', map: 'classic', control: true, slots: slots(['fibonacci', 'sword', 'dagger', 'spear', 'axe', 'unarmed'], 45) }, seed: 43, secs: 9.6 },
      { setup: { mode: 'ffa', map: 'saws', control: true, slots: slots(['bow', 'wrench', 'grimoire', 'spiky', 'axe', 'unarmed'], 60) }, seed: 7, secs: 7.6 },
    ],
  },
  {
    name: 'preview-portrait-1080x1620.mp4', w: 1080, h: 1620, cover: '_frame-portrait-1080x1620.png',
    clips: [
      { setup: { mode: '2v2', map: 'meteor', control: true, slots: slots(['katana', 'hammer', 'orbital', 'cannon', 'axe', 'unarmed'], 50) }, seed: 11, secs: 7.6 },
      { setup: { mode: '1v1', map: 'pillars', control: true, slots: slots(['torch', 'scythe', 'dagger', 'spear', 'axe', 'unarmed'], 30) }, seed: 52, secs: 9.0 },
    ],
  },
];

const only = process.argv[2];
const browser = await chromium.launch();
for (const v of VIDEOS) {
  if (only && !v.name.includes(only)) continue;
  const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`${BASE}/index.html?capture`);
  await page.waitForFunction(() => window.BB && BB.app && BB.app.state === 'menu');
  await page.addStyleTag({ content: '#banner, #btnPause, #controlHint { visibility: hidden !important; }' });
  const clipFiles = [];
  for (let ci = 0; ci < v.clips.length; ci++) {
    const c = v.clips[ci];
    const dir = path.join(TMP, v.name.replace('.mp4', ''), 'clip' + ci);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    await page.evaluate(([s, st]) => BBCapture.configure(s, st), [c.setup, SETTINGS]);
    await page.evaluate((seed) => BBCapture.start(seed), c.seed);
    const frames = Math.round(c.secs * FPS);
    let res;
    for (let f = 0; f < frames; f++) {
      await page.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.png') });
      res = await page.evaluate((fps) => BBCapture.advance(1, fps, true), FPS);
    }
    console.log(v.name, 'clip', ci, 'frames', frames, 'sim t', res.t.toFixed(2), 'over', res.over);
    const mp4 = path.join(dir, '..', `clip${ci}.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'), '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', mp4]);
    clipFiles.push(mp4);
  }
  await page.close();

  // cover (1.0s) -> crossfade 0.4s -> clip0 -> crossfade 0.25s -> clip1
  const cover = path.join(OUT, v.cover);
  const durs = clipFiles.map((f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()));
  const coverLen = 1.4, x1 = 0.4, x2 = 0.25;
  const filter = [
    `[0:v]scale=${v.w}:${v.h},fps=${FPS},format=yuv420p,setsar=1[c]`,
    `[1:v]fps=${FPS},format=yuv420p,setsar=1[a]`,
    `[2:v]fps=${FPS},format=yuv420p,setsar=1[b]`,
    `[c][a]xfade=transition=fade:duration=${x1}:offset=${coverLen - x1}[ca]`,
    `[ca][b]xfade=transition=fade:duration=${x2}:offset=${(coverLen - x1 + durs[0] - x2).toFixed(3)}[v]`,
  ].join(';');
  const out = path.join(OUT, v.name);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-t', String(coverLen), '-framerate', String(FPS), '-i', cover,
    '-i', clipFiles[0], '-i', clipFiles[1], '-filter_complex', filter, '-map', '[v]', '-an',
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log('wrote', out);
}
await browser.close();
