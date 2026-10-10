// Event balls. Appended after data4.js: items are never reordered (PvP short codes store items by index).
// Gameplay randomness uses sim.rng() (deterministic, PvP-safe); visuals use sim.frng().
(function () {
  const BB = window.BB;
  const fmt = BB.fmt, TAU = Math.PI * 2;
  function add(o) {
    o.base = Object.assign({ damage: 1, spin: 0, len: 0, width: 6, gap: 2 }, o.base || {});
    o.price = o.price != null ? o.price : BB.RARITY[o.rarity].price;
    BB.ITEMS.push(o); BB.ITEM[o.id] = o;
  }

  // ---------------------------------------------------------------- BALL (Ball VS Ball Release! event)
  // Calls in any ball from the roster to fight beside it, at half of BALL's current health.
  let POOL = null;
  const pool = () => POOL || (POOL = BB.ITEMS.filter((i) => i.cat !== 'hidden' && !i.kami && !i.eventOnly && i.id !== 'dummy'));
  add({
    id: 'ball', name: 'BALL', cat: 'special', rarity: 'legendary', color: '#f5f6fa',
    eventOnly: 'Reward for finishing every quest in the Ball VS Ball Release! event. It will never return.',
    desc: 'Every 6s it summons a random ball from the whole roster to fight beside it, at half of BALL\'s current health (up to 2 at once). Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 1.5; w.summons = 0; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = 6;
      if (sim.balls.filter((m) => m.alive && m.owner === b).length >= 2) return;
      const P = pool(), def = P[Math.floor(sim.rng() * P.length)];
      const a = sim.rng() * TAU, d = b.r * 2.2, lim = sim.W / 2 - b.r;
      const x = BB.clamp(b.x + Math.cos(a) * d, -lim, lim), y = BB.clamp(b.y + Math.sin(a) * d, -lim, lim);
      const m = sim.makeBall(def, b.team, x, y, { hp: Math.max(5, Math.round(b.hp * 0.5)), scale: b.scale * 0.8, main: false, owner: b });
      m.name = def.name; m.summoned = true; w.summons++;
      sim.ring(x, y, 4, 46, '#ffffff', 0.35);
      sim.burst(x, y, 16, ['#ff5e7e', '#ffd23f', '#35d047', '#3d8bf2', '#a259ff'], 300, 4);
      sim.fxTag(x, y - m.r - 22, def.name.toUpperCase() + '!', BB.itemColor(def.id));
      sim.emit({ type: 'build', x, y });
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w, b, sim) => ['Damage: ' + fmt(w.damage), 'Allies: ' + (sim && b ? sim.balls.filter((m) => m.alive && m.owner === b).length : 0) + '/2'],
  });

  if (typeof document === 'undefined') return;
  // ================================================================ art
  const OUT = '#1d1d22', RAINBOW = ['#ff5e7e', '#ffd23f', '#35d047', '#3d8bf2', '#a259ff'];

  // menu icon: a white ball with a rainbow rim and a cluster of four little balls ("every ball")
  const baseIcon = BB.drawIcon;
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    baseIcon(ctx, id, x, y, size, opts);
    if (id !== 'ball') return;
    const r = size * 0.33, lw = Math.max(1.5, size * 0.03);
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, r - lw * 0.2, (i / 5) * TAU - Math.PI / 2, ((i + 1) / 5) * TAU - Math.PI / 2); ctx.strokeStyle = RAINBOW[i]; ctx.lineWidth = lw * 1.3; ctx.stroke(); }
    const s = r * 0.24;
    [[-1, -1, 0], [1, -1, 1], [-1, 1, 3], [1, 1, 2]].forEach(([dx, dy, c]) => { ctx.beginPath(); ctx.arc(dx * s * 1.05, dy * s * 1.05, s, 0, TAU); ctx.fillStyle = RAINBOW[c]; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke(); });
    ctx.restore();
  };

  // in battle: a slowly turning rainbow rim on BALL; its summons wear a thin rainbow halo
  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    baseBall(ctx, sim, b, lw, R);
    const isBall = b.def.id === 'ball', isAlly = b.owner && b.owner.def && b.owner.def.id === 'ball';
    if (!b.alive || (!isBall && !isAlly)) return;
    const r = b.r, t = sim.t;
    ctx.save();
    if (isBall) {
      const rot = t * 1.4;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(b.x, b.y, r + 4, rot + (i / 5) * TAU, rot + ((i + 1) / 5) * TAU - 0.12); ctx.strokeStyle = RAINBOW[i]; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); }
      // charge pips: how close the next summon is
      const k = 1 - Math.max(0, b.w.timer) / 6;
      ctx.beginPath(); ctx.arc(b.x, b.y, r + 9, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.arc(b.x, b.y, r + 4, 0, TAU); ctx.strokeStyle = RAINBOW[Math.floor(t * 3 + b.id) % 5]; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  };
})();
