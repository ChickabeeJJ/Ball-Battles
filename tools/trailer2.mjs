// Trailers for CrazyGames (landscape 1920x1080 + portrait 1080x1620).
// Real gameplay at 1x (frame-stepped, so no dropped frames): a spread of balls, maps and modes,
// ending on a knockout finisher. Opens on the cover (tools/art3.html), short punchy captions on top.
// Usage: npx http-server -p 8080 . &  then  node tools/trailer2.mjs   (needs ffmpeg + a TTF at FONT)
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8080';
const OUT = process.env.OUT || 'marketing', TMP = path.join(OUT, '_frames', 'trailer2');
const FONT = process.env.FONT || path.join(TMP, 'anton.ttf');
const FPS = 30, SIZE = 1080;
const SETTINGS = { sound: 0, dark: false, hitlag: true, parrylag: true, reverseB: false, vibrate: false, dmgNumbers: true, impact: false, callouts: true, kamiCine: true, finisher: true, speed: 1 };
const sl = (ids, hp) => ids.map((id) => ({ id, hp, scale: 1, ov: { damage: 0, spin: 0, speed: 0 } }));

// asc: start the Kami already ascended (Tenshi). kill: force the knockout `kill` seconds into the shot.
const CLIPS = [
  { mode: '1v1', map: 'classic', ids: ['claymore', 'chainsaw'], hp: 100, seed: 3, skip: 1.2, secs: 2.2, cap: 'PICK A WEAPON' },
  { mode: 'ffa', map: 'saws', ids: ['harpoon', 'meteor', 'disco', 'stormhammer'], hp: 100, seed: 8, skip: 3.0, secs: 2.2, cap: 'MANY BALLS' },
  { mode: '3v3', map: 'meteor', ids: ['sword', 'flail', 'mace', 'rapier', 'trident', 'sai'], hp: 100, seed: 6, skip: 2.0, secs: 2.2, cap: 'TEAM BATTLES' },
  { mode: '1v1', map: 'pillars', ids: ['phoenix', 'halberd'], hp: 100, seed: 4, skip: 2.0, secs: 1.8 },
  { mode: 'ffa', map: 'potato', ids: ['phoenix', 'king', 'magma', 'chakram'], hp: 100, seed: 5, skip: 3.0, secs: 2.0, cap: 'FREE FOR ALL' },
  { mode: '1v1', map: 'classic', ids: ['kami', 'claymore'], hp: 100, seed: 11, skip: 3.0, secs: 2.0 },
  { mode: '2v2', map: 'shrink', ids: ['whip', 'sickle', 'umbrella', 'pan'], hp: 100, seed: 9, skip: 5.0, secs: 1.8 },
  { mode: '1v1', map: 'bouncy', ids: ['axe', 'katana'], hp: 100, seed: 2, skip: 2.0, secs: 2.6, kill: 0.5, cap: 'K.O.!' },
];

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
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const slots = sl(c.ids, c.hp);
  while (slots.length < 6) slots.push(slots[slots.length - 1]);
  await page.evaluate(([setup, st]) => BBCapture.configure(setup, st), [{ mode: c.mode, map: c.map, control: false, slots }, SETTINGS]);
  await page.evaluate(([seed, asc]) => {
    BBCapture.start(seed); BB.app.impact = null;
    const k = BB.app.sim.balls.find((b) => b.def.id === 'kami');
    if (k && asc) { k.tenshi = true; k.ascended = true; k.w.regenMul = 1.3; k.w.touch = {}; k.w.servCd = 0.4; k.w.cool = { beam: 1.4, gate: 5, rain: 3.2 }; }
  }, [c.seed, !!c.asc]);
  await page.evaluate(([n, fps]) => BBCapture.advance(n, fps), [Math.round(c.skip * FPS), FPS]);
  await page.evaluate((px) => BB.app.renderer.resize(px), SIZE);
  const frames = Math.round(c.secs * FPS);
  for (let f = 0; f < frames; f++) {
    if (c.kill != null && f === Math.round(c.kill * FPS)) {
      await page.evaluate(() => { const s = BB.app.sim, k = s.balls.find((b) => b.main && b.team === 0), e = s.balls.find((b) => b.main && b.team !== 0); e.phase = 0; s.damage(e, 9999, k, { x: e.x, y: e.y }); });
    }
    const data = await page.evaluate(([fps, px]) => {
      BBCapture.advance(1, fps); if (BB.app.renderer.px !== px) BB.app.renderer.resize(px); BB.app.draw();
      // the ascended finisher draws on its own full-screen canvas: record that instead
      const fs = document.querySelector('.kami-fs'), o = document.createElement('canvas'); o.width = o.height = px;
      const octx = o.getContext('2d'); octx.drawImage(document.getElementById('arena'), 0, 0, px, px);
      if (fs) octx.drawImage(fs, 0, 0, px, px);
      return o.toDataURL('image/jpeg', 0.93);
    }, [FPS, SIZE]);
    fs.writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.jpg'), Buffer.from(data.split(',')[1], 'base64'));
  }
  const mp4 = path.join(TMP, `c${ci}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', mp4]);
  clipFiles.push(mp4);
  console.log('clip', ci, c.map, c.ids.join('/'));
}
await browser.close();

// Stitch with quick white-flash cuts; remember where each clip starts for its caption.
const dur = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const X = 0.12;
let filter = '', last = '[0:v]', offset = 0;
const starts = [0], inputs = [];
clipFiles.forEach((f) => inputs.push('-i', f));
for (let i = 1; i < clipFiles.length; i++) {
  offset += dur(clipFiles[i - 1]) - X; starts.push(offset);
  const outL = i === clipFiles.length - 1 ? '[g]' : `[x${i}]`;
  filter += `${last}[${i}:v]xfade=transition=fadewhite:duration=${X}:offset=${offset.toFixed(3)}${outL};`;
  last = outL;
}
const gameplay = path.join(TMP, 'gameplay.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter.replace(/;$/, ''), '-map', '[g]', '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', gameplay]);

// Compose: blurred backdrop, arena framed on top, opening on the cover, captions slamming in.
const INTRO = 1.25, XF = 0.35, shift = INTRO - XF; // gameplay starts this many seconds into the final video
for (const [name, W, H, A, cover] of [
  ['preview-landscape-1920x1080.mp4', 1920, 1080, 1000, '_cover-frame-1920x1080.png'],
  ['preview-portrait-1080x1620.mp4', 1080, 1620, 1040, '_cover-frame-1080x1620.png'],
]) {
  const big = Math.max(W, H), fsz = Math.round(Math.min(W, H) * 0.11);
  const capY = H > W ? `(h-${A})/4-th/2` : `h*0.14-th/2`;
  const caps = CLIPS.map((c, i) => [c.cap, Math.max(INTRO + 0.05, starts[i] + shift)]).filter(([t]) => t).map(([t, s]) => {
    const e = s + 1.3, k = `if(lt(t\\,${(s + 0.12).toFixed(2)})\\,(t-${s.toFixed(2)})/0.12\\,1)`; // commas escaped for the filtergraph
    return `drawtext=fontfile='${FONT}':text='${t}':fontsize=${fsz}*(2-${k}):fontcolor=white:borderw=${Math.round(fsz * 0.09)}:bordercolor=black:shadowx=0:shadowy=${Math.round(fsz * 0.07)}:shadowcolor=black:x=(w-tw)/2:y=${capY}:enable='between(t\\,${s.toFixed(2)}\\,${e.toFixed(2)})'`;
  });
  const fc = [
    `[1:v]split[a][b]`,
    `[a]scale=${big}:${big},crop=${W}:${H},boxblur=28:2,eq=brightness=-0.25:saturation=1.4[bg]`,
    `[b]scale=${A}:${A},pad=${A + 12}:${A + 12}:6:6:color=0x0d0d12[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=${FPS},settb=1/${FPS},format=yuv420p,setsar=1[gp]`,
    `[0:v]scale=${W}:${H},fps=${FPS},settb=1/${FPS},format=yuv420p,setsar=1[cv]`,
    `[cv][gp]xfade=transition=zoomin:duration=${XF}:offset=${shift}[v0]`,
    `[v0]${caps.join(',')}[v]`,
  ].join(';');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-t', String(INTRO), '-framerate', String(FPS), '-i', path.join(OUT, cover), '-i', gameplay,
    '-filter_complex', fc, '-map', '[v]', '-an', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, name)]);
  console.log('wrote', name, dur(path.join(OUT, name)).toFixed(1) + 's');
}
