// Headless sim runner: node tools/simtest.js  — runs every item vs every item and reports durations.
global.window = globalThis;
for (const f of ['core', 'data', 'data2', 'abilities', 'balance', 'sim', 'kami']) require('../js/' + f + '.js');
const BB = globalThis.BB;
function run(a, b, seed, map = 'classic', hp = 100, teams) {
  const s = new BB.Sim({ seed, map, settings: {}, teams: teams || [[{ id: a, hp, slot: 0 }], [{ id: b, hp, slot: 1 }]] });
  const dt = 1 / 120;
  let steps = 0;
  while (!s.over && steps < 120 * 240) { s.step(dt); s.events.length = 0; steps++; }
  return { winner: s.over ? s.over.winner : 'timeout', t: s.t, real: steps / 120 };
}
module.exports = { run, BB };
if (require.main === module) {
  const ids = BB.ITEMS.map((i) => i.id);
  const wins = {}; const times = [];
  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    const r = run(a, b, (a + b).length * 97 + 13);
    if (r.winner === 'timeout') console.log('TIMEOUT', a, b);
    if (r.winner === 0) wins[a] = (wins[a] || 0) + 1;
    if (r.winner === 1) wins[b] = (wins[b] || 0) + 1;
    times.push(r.t);
  }
  times.sort((x, y) => x - y);
  console.log('median battle time', times[times.length >> 1].toFixed(1), 'p10', times[Math.floor(times.length * 0.1)].toFixed(1), 'p90', times[Math.floor(times.length * 0.9)].toFixed(1));
  console.log(Object.entries(wins).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ':' + v).join('  '));
  for (const m of BB.MAPS) console.log(m.id, JSON.stringify(run('sword', 'dagger', 5, m.id)));
  for (const mode of BB.MODES) {
    const slots = BB.DEFAULT_SLOTS.map((id, i) => ({ id, hp: 100, slot: i }));
    const teams = mode.teams.map((t) => t.map((i) => slots[i]));
    console.log(mode.id, JSON.stringify(run(null, null, 9, 'classic', 100, teams)));
  }
}
