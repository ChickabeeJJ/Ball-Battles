// Finds seeds whose battle ends inside a time window, for the preview videos.
// node tools/seeds.js
global.window = globalThis;
for (const f of ['core', 'data', 'data2', 'balance', 'sim']) require('../js/' + f + '.js');
const BB = globalThis.BB;
const SETTINGS = { sound: 0.8, dark: false, hitlag: true, parrylag: true, reverseB: false, vibrate: true, dmgNumbers: true };
function teamsFor(mode, ids, hp) {
  const slots = ids.map((id, i) => ({ id, hp, scale: 1, ov: { damage: 0, spin: 0, speed: 0 }, slot: i }));
  return BB.MODE[mode].teams.map((t) => t.map((i) => slots[i]));
}
// Mirrors BBCapture.advance: input refreshed once per 30fps frame, 4 sim steps per frame.
function find(mode, map, ids, hp, lo, hi, n = 3) {
  const out = [];
  for (let seed = 1; seed < 6000 && out.length < n; seed++) {
    const s = new BB.Sim({ seed, map, teams: teamsFor(mode, ids, hp), settings: SETTINGS, controlSlot: 0 });
    while (!s.over && s.t < hi + 1) { s.input = s.autoPilot(); for (let k = 0; k < 4; k++) s.step(1 / 120); }
    if (s.over && s.t >= lo && s.t <= hi) out.push([seed, +s.t.toFixed(2), s.over.winner]);
  }
  return out;
}
module.exports = { find };
if (require.main === module) {
  console.log('L-A fib/sword', JSON.stringify(find('1v1', 'classic', ['fibonacci', 'sword'], 45, 8.4, 9.4)));
  console.log('P-B torch/scythe', JSON.stringify(find('1v1', 'pillars', ['torch', 'scythe'], 30, 8.2, 9.2)));
}
