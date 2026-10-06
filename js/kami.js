// Kami (神): the Iridescent god ball.
// Part 1 is pure simulation (also runs headless in tools/), part 2 is art and cinematics (browser only).
(function () {
  const BB = window.BB;
  const TAU = Math.PI * 2;
  const fmt = BB.fmt;

  BB.RARITY.iridescent = { name: 'Iridescent', color: '#d7b8ff', price: 25000 };

  // Divine Grace: every attack is dodged while the bar holds at least one charge.
  // Recharge scales with how full the bar is and stops completely at 20% or below.
  const GRACE = { max: 100, cost: 25, dotCost: 12, regen: 14, floor: 20, iframe: 0.3 };
  const regenRate = (g, mul) => (g <= GRACE.floor ? 0 : GRACE.regen * (g / GRACE.max) * (mul || 1));
  const AB = {
    beam: { name: 'Seraph Beam', cd: 10, first: 3.5, wind: 1.0, end: 1.85, dmg: 20 },
    gate: { name: 'Golden Gates', cd: 14, first: 7, jail: 2.8, end: 3.1, tick: 2, slam: 10 },
    rain: { name: "Heaven's Arsenal", cd: 12, first: 11, open: 0.5, gap: 0.12, swords: 10, dmg: 3 },
  };
  // Ascended (Tenshi revival) versions: stronger, faster, and two extra arts
  const ASC = {
    beam: { name: 'Seraph Judgement', cd: 8, dmg: 30, hw: 1.5 },
    gate: { name: 'Crimson Gates', cd: 11, jail: 3.3, end: 3.6, tick: 3, slam: 16 },
    rain: { name: 'Arsenal of Heaven', cd: 9.5, swords: 14, dmg: 4, gap: 0.08 },
    serv: { name: 'Heavenly Servants', cd: 13, first: 2.5, n: 2, max: 4, hp: 50 },
  };
  const ab = (b, k) => (b.ascended && ASC[k] ? Object.assign({}, AB[k], ASC[k]) : AB[k]);
  BB.KAMI = { GRACE, AB, ASC };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function segPoint2(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    const x = ax + dx * t - px, y = ay + dy * t - py;
    return x * x + y * y;
  }
  function turnTo(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    return a + d * k;
  }
  // enemy main balls first, then the nearest
  function pickTarget(sim, b) {
    let best = null, bd = Infinity;
    for (const e of sim.balls) {
      if (!e.alive || e.team === b.team) continue;
      const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2 + (e.main ? 0 : 1e8);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  const byId = (sim, id) => sim.balls.find((e) => e.id === id);

  function startCast(sim, b, w, k, tgt) {
    const A = ab(b, k);
    w.cool[k] = A.cd; w.gcd = 2.5;
    const c = (w.cast = { k, t: 0, n: 0, tgt: tgt.id, aim: Math.atan2(tgt.y - b.y, tgt.x - b.x), fired: false });
    if (k === 'beam') b.hold = true;
    if (k === 'gate') {
      tgt.jail = { t: 0, dur: A.jail, by: b.id, x: tgt.x, y: tgt.y };
      tgt.stunT = Math.max(tgt.stunT, A.jail);
      c.x = tgt.x; c.y = tgt.y;
    }
    if (k === 'rain') {
      // a crescent of golden portals opens behind Kami
      c.portals = [];
      const back = Math.atan2(b.y - tgt.y, b.x - tgt.x), R = b.r * 3.3, lim = sim.W / 2 - 24;
      for (let i = 0; i < A.swords; i++) {
        const a = back + (i - (A.swords - 1) / 2) * 0.3;
        c.portals.push({ x: clamp(b.x + Math.cos(a) * R, -lim, lim), y: clamp(b.y + Math.sin(a) * R, -lim, lim), a });
      }
    }
    sim.emit({ type: 'kami', k, x: b.x, y: b.y, team: b.team, asc: !!b.ascended });
    if (!sim.preview) sim.fxTag(b.x, b.y - b.r - 30, A.name.toUpperCase(), b.ascended ? '#ff8aa0' : '#ffe9a8');
  }

  function fireBeam(sim, b, c) {
    const A = ab(b, 'beam'), ca = Math.cos(c.aim), sa = Math.sin(c.aim);
    const L = sim.size * 1.6, hw = 30 * b.scale * (A.hw || 1);
    const ax = b.x + ca * b.r, ay = b.y + sa * b.r, bx = b.x + ca * L, by = b.y + sa * L;
    c.beam = { ax, ay, bx, by, hw };
    for (const e of sim.balls) {
      if (!e.alive || e.team === b.team) continue;
      if (segPoint2(ax, ay, bx, by, e.x, e.y) < (hw + e.r) ** 2) {
        sim.damage(e, A.dmg, b, { x: e.x, y: e.y, lag: true });
        if (e._dg || !e.alive) continue;
        sim.knock(e, e.x - ca * 10, e.y - sa * 10, 720);
        sim.launch(e, e.x, e.y);
      }
    }
    for (const t of sim.turrets) if (t.team !== b.team && segPoint2(ax, ay, bx, by, t.x, t.y) < (hw + t.r) ** 2) t.dead = true;
    const red = b.ascended;
    sim.ring(ax, ay, 10, red ? 180 : 130, red ? '#ff4d6d' : '#fff6c8', 0.45);
    sim.burst(ax, ay, red ? 36 : 24, red ? ['#ffffff', '#ff8aa0', '#ff2d55', '#ffd23f'] : ['#ffffff', '#fff1b8', '#ffd23f'], 520, 4);
    sim.emit({ type: 'kami', k: 'beamfire', x: ax, y: ay });
  }

  function runCast(sim, b, w, dt) {
    const c = w.cast, A = ab(b, c.k);
    c.t += dt;
    const tgt = byId(sim, c.tgt);
    if (c.k === 'beam') {
      if (c.t < A.wind - 0.15 && tgt && tgt.alive) c.aim = turnTo(c.aim, Math.atan2(tgt.y - b.y, tgt.x - b.x), Math.min(1, 8 * dt));
      if (!c.fired && c.t >= A.wind) { c.fired = true; fireBeam(sim, b, c); }
      if (c.t >= A.end) { w.cast = null; b.hold = false; }
    } else if (c.k === 'gate') {
      const ticks = []; for (let t = 0.9; t < A.jail - 0.2; t += 0.5) ticks.push(t);
      while (c.n < ticks.length && c.t >= ticks[c.n]) {
        c.n++;
        if (tgt && tgt.alive) { sim.damage(tgt, A.tick, b, { x: tgt.x, y: tgt.y - tgt.r }); sim.ring(tgt.x, tgt.y, tgt.r, tgt.r * 2.2, b.ascended ? '#ff4d6d' : '#ffd23f', 0.3); }
      }
      if (!c.fired && c.t >= A.jail) {
        c.fired = true;
        if (tgt && tgt.alive) {
          sim.damage(tgt, A.slam, b, { x: tgt.x, y: tgt.y, lag: true });
          sim.ring(c.x, c.y, 10, b.ascended ? 200 : 150, b.ascended ? '#ff4d6d' : '#ffe9a8', 0.45);
          sim.burst(c.x, c.y, 26, b.ascended ? ['#ffffff', '#ff2d55', '#ffd23f'] : ['#ffffff', '#ffd23f', '#e0a400'], 460, 4);
        }
        sim.emit({ type: 'kami', k: 'gateslam', x: c.x, y: c.y });
      }
      if (c.t >= A.end) w.cast = null;
    } else if (c.k === 'rain') {
      while (c.n < c.portals.length && c.t >= A.open + c.n * A.gap) {
        const p = c.portals[c.n++], e = pickTarget(sim, b);
        const a = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.a + Math.PI;
        sim.spawnProj({ owner: b, kind: 'holysword', red: !!b.ascended, divine: true, x: p.x, y: p.y, vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, angle: a, r: 7 * b.scale, dmg: A.dmg, life: 2.2, homing: 3, knock: 160 });
        sim.emit({ type: 'shoot', x: p.x, y: p.y, small: true });
      }
      if (c.t >= A.open + c.portals.length * A.gap + 0.45) w.cast = null;
    }
  }

  // ---- Tenshi ascension -------------------------------------------------------
  function ascend(sim, b) {
    const w = b.w;
    b.ascended = true; b.hp = b.maxHp; b.alive = true;
    w.grace = GRACE.max; w.regenMul = 1.3; w.iframe = 1.2;
    w.cast = null; b.hold = false; b.jail = null;
    b.stunT = 0; b.slowT = 0; b.paintT = 0; b.poison = 0; b.burnT = 0; b.burnLvl = 0;
    w.cool = { beam: 2, gate: 5, rain: 7 }; w.gcd = 1; w.servCd = ASC.serv.first; w.touch = {};
    w.damage += 2;
    // free anyone this Kami had caged, and clear its own leftovers
    for (const e of sim.balls) if (e.jail && e.jail.by === b.id) e.jail = null;
    sim.ring(b.x, b.y, b.r, b.r * 6, '#ff4d6d', 0.6); sim.ring(b.x, b.y, b.r, b.r * 4, '#ffffff', 0.4);
    sim.burst(b.x, b.y, 40, ['#ffffff', '#ff8aa0', '#ff2d55', '#ffd23f'], 520, 5);
    // the shockwave of the revival shoves every enemy away
    for (const e of sim.balls) if (e.alive && e.team !== b.team) { sim.knock(e, b.x, b.y, 520); }
    sim.emit({ type: 'kami', k: 'awaken', x: b.x, y: b.y, id: b.id, team: b.team });
  }

  function ascendedUpdate(sim, b, w, dt) {
    // Angelic Touch (passive): slamming into a ball deals no damage. Allies are healed, and
    // touching an enemy restores Grace.
    for (const o of sim.balls) {
      if (o === b || !o.alive) continue;
      const rr = o.r + b.r + 2;
      if ((o.x - b.x) ** 2 + (o.y - b.y) ** 2 > rr * rr || (w.touch[o.id] || 0) > sim.t) continue;
      w.touch[o.id] = sim.t + 0.8;
      const mx = (o.x + b.x) / 2, my = (o.y + b.y) / 2;
      sim.burst(mx, my, 10, ['#ffffff', '#ffd0d8', '#ffd23f'], 220, 3);
      if (o.team === b.team) { if (o.hp < o.maxHp) sim.heal(o, 8); }
      else { w.grace = Math.min(GRACE.max, w.grace + 10); sim.fxNum(b.x, b.y - b.r - 8, '+10 GRACE', '#ff8aa0'); }
      if (!(w.touchTag > sim.t)) { w.touchTag = sim.t + 6; sim.fxTag(b.x, b.y - b.r - 30, 'ANGELIC TOUCH', '#ffd0d8'); }
    }
    // Heavenly Servants
    w.servCd -= dt;
    const S = ASC.serv, alive = sim.balls.filter((m) => m.alive && m.owner === b && m.def.id === 'servant').length;
    if (w.servCd <= 0 && alive < S.max && !w.cast) {
      w.servCd = S.cd;
      for (let i = 0; i < Math.min(S.n, S.max - alive); i++) {
        const a = sim.rng() * TAU, m = sim.makeBall(BB.ITEM.servant, b.team, b.x + Math.cos(a) * b.r * 2, b.y + Math.sin(a) * b.r * 2, { hp: S.hp, scale: 0.55, main: false, owner: b });
        m.name = 'Servant';
        sim.ring(m.x, m.y, 4, 40, '#ffd23f', 0.35);
      }
      sim.emit({ type: 'kami', k: 'serv', x: b.x, y: b.y, team: b.team, asc: true });
      if (!sim.preview) sim.fxTag(b.x, b.y - b.r - 30, S.name.toUpperCase(), '#ff8aa0');
    }
  }

  // Heavenly Servant: a tiny angel with a golden staff (+1 damage every hit, like the sword)
  // that keeps dashing at the nearest enemy.
  BB.ITEM.servant = {
    id: 'servant', name: 'Servant', cat: 'hidden', rarity: 'common', color: '#fff1c1',
    base: { damage: 1, spin: 230, len: 40, width: 7, gap: 2 }, melee: true, blocks: true,
    init(w) { w.dashCd = 0.8; },
    update(sim, b, w, dt) {
      w.dashCd -= dt;
      if (w.dashCd > 0) return;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e) return;
      w.dashCd = 1.7;
      const a = Math.atan2(e.y - b.y, e.x - b.x), sp = b.speed * 2.6;
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.flyT = 0.35;
    },
    onHit(sim, b, w) { w.damage += 1; },
    stats: () => [],
  };

  const kami = {
    id: 'kami', name: 'Kami', cat: 'special', rarity: 'iridescent', color: '#f6e7b0', price: 25000,
    desc: 'A god in ball form. Locked at 1 HP, but Divine Grace teleports it away from every attack while charged; the bar refills slower as it drains and stops at 20%. Casts Seraph Beam, Golden Gates and Heaven\'s Arsenal.',
    base: { damage: 2, spin: 160, len: 52, width: 10, gap: 4 },
    melee: true, blocks: true, kami: true, fixedHp: 1, knock: 240,
    init(w, b) {
      w.grace = GRACE.max; w.iframe = 0; w.gcd = 0; w.cast = null;
      w.cool = { beam: AB.beam.first, gate: AB.gate.first, rain: AB.rain.first };
      b.ghosts = []; b.tps = [];
    },
    update(sim, b, w, dt) {
      w.grace = Math.min(GRACE.max, w.grace + regenRate(w.grace, w.regenMul) * dt);
      for (const tp of b.tps) tp.t -= dt;
      if (b.tps.length && b.tps[0].t <= 0) b.tps = b.tps.filter((tp) => tp.t > 0);
      if (w.iframe > 0) w.iframe -= dt;
      // while Grace holds a charge, no status effect sticks
      if (w.grace >= GRACE.cost) { b.stunT = 0; b.slowT = 0; b.paintT = 0; b.poison = 0; b.burnT = 0; b.burnLvl = 0; }
      for (const g of b.ghosts) g.t -= dt;
      if (b.ghosts.length && b.ghosts[0].t <= 0) b.ghosts = b.ghosts.filter((g) => g.t > 0);
      for (const k in w.cool) w.cool[k] -= dt;
      w.gcd -= dt;
      if (!w.cast && w.gcd <= 0 && !sim.preview) {
        const tgt = pickTarget(sim, b);
        const k = w.cool.gate <= 0 ? 'gate' : w.cool.beam <= 0 ? 'beam' : w.cool.rain <= 0 ? 'rain' : null;
        if (tgt && k) startCast(sim, b, w, k, tgt);
      }
      if (w.cast) runCast(sim, b, w, dt);
      if (b.ascended) ascendedUpdate(sim, b, w, dt);
    },
    // Tenshi skin: the first death is refused. Kami ascends instead (see ascend()).
    beforeDeath(sim, b) {
      if (!b.tenshi || b.ascended) return false;
      ascend(sim, b);
      return true;
    },
    dodge(sim, b, amt, src, info) {
      const w = b.w;
      if (!w || w.grace === undefined) return false;
      if (w.iframe > 0) return true;
      const dot = info && info.dot, cost = dot ? GRACE.dotCost : GRACE.cost;
      if (w.grace < cost) return false;
      w.grace -= cost; w.iframe = GRACE.iframe;
      if (dot) { sim.fxNum(b.x, b.y - b.r - 4, 'MISS', '#bfefff'); return true; }
      // teleport: try a handful of spots and vanish to the one farthest from every enemy
      const lim = sim.W / 2 - b.r - 6, foes = sim.balls.filter((e) => e.alive && e.team !== b.team);
      let bx = b.x, by = b.y, best = -1;
      for (let i = 0; i < 10; i++) {
        const x = (sim.rng() * 2 - 1) * lim, y = (sim.rng() * 2 - 1) * lim;
        if (sim.obstacles.some((o) => (x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + b.r + 8) ** 2)) continue;
        let near = Infinity;
        for (const e of foes) near = Math.min(near, (x - e.x) ** 2 + (y - e.y) ** 2);
        if (near > best) { best = near; bx = x; by = y; }
      }
      b.ghosts.push({ x: b.x, y: b.y, t: 0.45 });
      b.tps.push({ fx: b.x, fy: b.y, tx: bx, ty: by, t: 0.45 });
      b.x = bx; b.y = by;
      if (b.jail) { b.jail.x = b.x; b.jail.y = b.y; }
      if (!sim.preview) sim.fxTag(b.x, b.y - b.r - 22, 'DODGE', '#bfefff');
      sim.emit({ type: 'kami', k: 'dodge', x: b.x, y: b.y });
      return true;
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w, b) => [(b && b.ascended ? 'ASCENDED · ' : '') + 'Grace: ' + Math.floor(w.grace || 0) + '%', 'Damage: ' + fmt(w.damage)],
  };
  kami.base = Object.assign({ damage: 1, spin: 0, len: 0, width: 6, gap: 2 }, kami.base);
  BB.ITEMS.push(kami);
  BB.ITEM.kami = kami;

  if (typeof document === 'undefined') return;

  // =====================================================================
  // Art
  // =====================================================================
  const OUT = '#1d1d22';

  // 神 as hand-placed brush strokes (100x100 box) so it renders identically everywhere,
  // even on devices without a CJK font, and can be drawn stroke by stroke.
  const KANJI = [
    [[20, 9], [28, 18]],
    [[8, 31], [36, 31], [12, 63]],
    [[25, 47], [25, 95]],
    [[30, 55], [39, 65]],
    [[48, 27], [48, 74]],
    [[48, 27], [90, 27], [90, 74]],
    [[48, 50], [90, 50]],
    [[48, 74], [90, 74]],
    [[69, 6], [69, 97]],
  ];
  function kanjiPath(ctx, cx, cy, size, prog) {
    const k = size / 100, n = KANJI.length;
    ctx.beginPath();
    KANJI.forEach((st, i) => {
      const p = clamp(prog * n - i, 0, 1);
      if (p <= 0) return;
      let total = 0;
      for (let j = 1; j < st.length; j++) total += Math.hypot(st[j][0] - st[j - 1][0], st[j][1] - st[j - 1][1]);
      let left = total * p;
      ctx.moveTo(cx + (st[0][0] - 50) * k, cy + (st[0][1] - 50) * k);
      for (let j = 1; j < st.length && left > 0; j++) {
        const [x0, y0] = st[j - 1], [x1, y1] = st[j], L = Math.hypot(x1 - x0, y1 - y0), f = Math.min(1, left / L);
        ctx.lineTo(cx + (x0 + (x1 - x0) * f - 50) * k, cy + (y0 + (y1 - y0) * f - 50) * k);
        left -= L;
      }
    });
  }
  // fill: stroke colour (string or gradient), edge: outline colour
  BB.drawKamiKanji = function (ctx, cx, cy, size, prog, fill, edge, weight) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    kanjiPath(ctx, cx, cy, size, prog == null ? 1 : prog);
    const wgt = size * (weight || 0.105);
    if (edge) { ctx.lineWidth = wgt + size * 0.06; ctx.strokeStyle = edge; ctx.stroke(); }
    ctx.lineWidth = wgt; ctx.strokeStyle = fill; ctx.stroke();
    ctx.restore();
  };

  function iridescent(ctx, cx, cy, r, t, alpha) {
    let g;
    if (ctx.createConicGradient) {
      g = ctx.createConicGradient(t * 0.8, cx, cy);
      ['#ff9ad5', '#ffe59a', '#9affc8', '#9ad8ff', '#c79aff', '#ff9ad5'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    } else {
      g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ['#ff9ad5', '#ffe59a', '#9affc8', '#9ad8ff', '#c79aff'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.restore();
  }

  // colour themes: gold (normal), pearl (Tenshi skin, before death), red (ascended)
  const TH = {
    gold: { halo: ['rgba(255,214,90,0.35)', '#ffd23f', '#fffbe0'], fea: ['#fff6d8', '#ffffff', '#ffe08a', '#fff3c4'], edge: 'rgba(184,134,11,0.85)', glow: '255,236,170', ring: '#9fe8ff', aim: '255,214,90' },
    pearl: { halo: ['rgba(255,190,210,0.4)', '#ffd0dc', '#ffffff'], fea: ['#ffffff', '#fff5f8', '#ffc2d1', '#ffe8ef'], edge: 'rgba(200,110,145,0.85)', glow: '255,215,228', ring: '#ffc2d1', aim: '255,180,200' },
    red: { halo: ['rgba(255,45,85,0.45)', '#ff2d55', '#ffe9a8'], fea: ['#ffe3e8', '#ffffff', '#ff4d6d', '#ffb3c1'], edge: 'rgba(130,0,25,0.9)', glow: '255,60,95', ring: '#ff8aa0', aim: '255,60,95' },
  };
  const themeOf = (b) => (b.ascended ? TH.red : b.tenshi ? TH.pearl : TH.gold);

  function halo(ctx, x, y, r, t, front, th) {
    th = th || TH.gold;
    ctx.save();
    ctx.translate(x, y - r * 1.22);
    ctx.scale(1, 0.28);
    const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : TAU;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, a0, a1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = th.halo[0]; ctx.lineWidth = r * 0.55; ctx.stroke();
    ctx.strokeStyle = th.halo[1]; ctx.lineWidth = r * 0.22; ctx.stroke();
    ctx.strokeStyle = th.halo[2]; ctx.lineWidth = r * 0.08; ctx.stroke();
    ctx.restore();
    if (front) {
      const s = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = 'rgba(255,255,240,' + (0.5 + 0.5 * s) + ')';
      ctx.beginPath(); ctx.arc(x + Math.cos(t * 2) * r * 0.7, y - r * 1.22 + Math.sin(t * 2) * r * 0.15, r * 0.07, 0, TAU); ctx.fill();
    }
  }
  // ascended crown: a second, spiked ring floating above the halo
  function crown(ctx, x, y, r, t) {
    ctx.save(); ctx.translate(x, y - r * 1.55); ctx.scale(1, 0.32); ctx.rotate(t * 0.8);
    ctx.beginPath();
    const n = 12;
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * TAU, rr = i % 2 ? r * 1.0 : r * 1.22; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.lineWidth = r * 0.07; ctx.strokeStyle = '#ff2d55'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,233,168,0.9)'; ctx.lineWidth = r * 0.03; ctx.stroke();
    ctx.restore();
  }

  // A fan of feathers: three tiers per side, spread k (0..1)
  function wings(ctx, x, y, r, k, t, th) {
    if (k <= 0) return;
    th = th || TH.gold;
    ctx.save();
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, -r * 0.4, r * 0.3, 0, -r * 0.4, r * 4.2 * k);
    glow.addColorStop(0, 'rgba(' + th.glow + ',' + 0.5 * k + ')'); glow.addColorStop(1, 'rgba(' + th.glow + ',0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -r * 0.4, r * 4.2 * k, 0, TAU); ctx.fill();
    for (const side of [-1, 1]) {
      for (let tier = 0; tier < 3; tier++) {
        const n = 7 - tier, len0 = r * (2.5 - tier * 0.55) * k;
        for (let i = n - 1; i >= 0; i--) {
          const u = i / (n - 1);
          const a = -Math.PI / 2 + side * (0.55 + u * 1.2 + tier * 0.12) + side * Math.sin(t * 6 + tier) * 0.05;
          const L = len0 * (0.75 + 0.45 * Math.sin(u * Math.PI * 0.9 + 0.25));
          const d = r * 0.55 + L * 0.5;
          ctx.save();
          ctx.translate(Math.cos(a) * d, Math.sin(a) * d - r * 0.25);
          ctx.rotate(a);
          ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, r * (0.2 - tier * 0.03), 0, 0, TAU);
          const g = ctx.createLinearGradient(-L * 0.5, 0, L * 0.5, 0);
          g.addColorStop(0, th.fea[0]); g.addColorStop(0.7, th.fea[1]); g.addColorStop(1, tier === 0 ? th.fea[2] : th.fea[3]);
          ctx.fillStyle = g; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = th.edge; ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  // Kami's weapon: Ama-no-Nuhoko, the heavenly jewelled spear
  const baseWeapon = BB.drawWeapon;
  BB.drawWeapon = function (ctx, id, s, L, W, lw, t, team) {
    if (id === 'servant') {
      // golden staff with a winged orb
      ctx.save(); ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.rect(s, -W * 0.18, L * 0.8, W * 0.36); ctx.fillStyle = '#e8b84a'; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s + L * 0.8, sd * W * 0.55, W * 0.5, W * 0.22, sd * 0.6, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = lw * 0.6; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(s + L * 0.88, 0, W * 0.48, 0, TAU);
      const og = ctx.createRadialGradient(s + L * 0.86, -W * 0.15, 0, s + L * 0.88, 0, W * 0.48); og.addColorStop(0, '#fffbe0'); og.addColorStop(1, '#f6c431');
      ctx.fillStyle = og; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.restore();
      return;
    }
    if (id !== 'kami') return baseWeapon(ctx, id, s, L, W, lw, t, team);
    const sh = W * 0.32, headS = s + L * 0.6;
    ctx.save();
    ctx.lineJoin = 'round';
    // shaft
    ctx.beginPath(); ctx.rect(s, -sh / 2, headS - s, sh);
    const g = ctx.createLinearGradient(0, -sh / 2, 0, sh / 2); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, '#c8961e');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    // jewelled collar
    ctx.beginPath(); ctx.ellipse(headS, 0, W * 0.32, W * 0.62, 0, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(headS, 0, W * 0.2, 0, TAU); ctx.fillStyle = '#7fe3ff'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
    // leaf blade
    ctx.beginPath();
    ctx.moveTo(headS + W * 0.2, 0);
    ctx.quadraticCurveTo(headS + L * 0.12, -W * 0.85, s + L * 0.86, -W * 0.38);
    ctx.lineTo(s + L, 0);
    ctx.lineTo(s + L * 0.86, W * 0.38);
    ctx.quadraticCurveTo(headS + L * 0.12, W * 0.85, headS + W * 0.2, 0);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, -W, 0, W); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, '#fff6d0'); bg.addColorStop(1, '#e8c25a');
    ctx.fillStyle = bg; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(headS + W * 0.5, 0); ctx.lineTo(s + L * 0.95, 0); ctx.strokeStyle = 'rgba(200,150,30,0.8)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
    ctx.restore();
  };

  // Shop / menu icon
  const baseIcon = BB.drawIcon;
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    if (id !== 'kami') return baseIcon(ctx, id, x, y, size, opts);
    const r = size * 0.3, lw = Math.max(1.5, size * 0.03), t = 1.2;
    ctx.save(); ctx.translate(x, y + size * 0.06);
    const gl = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.7);
    gl.addColorStop(0, 'rgba(255,240,190,0.9)'); gl.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, TAU); ctx.fill();
    halo(ctx, 0, 0, r, t, false);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f6e7b0'); g.addColorStop(1, '#c9a24a');
    ctx.fillStyle = g; ctx.fill();
    iridescent(ctx, 0, 0, r, t, 0.3);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.lineWidth = lw * 1.4; ctx.strokeStyle = OUT; ctx.stroke();
    BB.drawKamiKanji(ctx, 0, r * 0.02, r * 1.3, 1, '#2a1c05', '#ffe9a8', 0.12);
    halo(ctx, 0, 0, r, t, true);
    ctx.restore();
  };

  // Ball: aura, afterimages, wings, halo, kanji, Grace ring (themed: gold / Tenshi pearl / ascended red)
  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    if (b.def.id === 'servant') {
      const th = b.owner && b.owner.ascended ? TH.red : TH.gold;
      wings(ctx, b.x, b.y, b.r * 0.8, 0.45, sim.t + b.id, th);
      baseBall(ctx, sim, b, lw, R);
      halo(ctx, b.x, b.y, b.r, sim.t + b.id, true, th);
      return;
    }
    if (!b.def.kami) return baseBall(ctx, sim, b, lw, R);
    const w = b.w, r = b.r, t = sim.t, c = w.cast, asc = !!b.ascended, th = themeOf(b);
    // vanishing afterimage: squeezes into a vertical slit of light
    for (const g of b.ghosts || []) {
      const k = 1 - clamp(g.t / 0.45, 0, 1), sx = Math.max(0.02, 1 - k * 1.6), sy = 1 + k * 1.4;
      ctx.save(); ctx.translate(g.x, g.y); ctx.scale(sx, sy); ctx.globalAlpha = 1 - k * 0.6;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, asc ? '#ffb3c1' : '#bfefff');
      ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 2 / sx; ctx.strokeStyle = asc ? '#ff4d6d' : '#9fe8ff'; ctx.stroke();
      ctx.restore();
    }
    // aura (ascended: wider, breathing red glow with rising embers)
    const pulse = 0.5 + 0.5 * Math.sin(t * 3), AR = r * (asc ? 2.7 + pulse * 0.5 : 2 + pulse * 0.3);
    const au = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, AR);
    au.addColorStop(0, 'rgba(' + th.glow + ',' + (asc ? 0.65 : 0.55) + ')'); au.addColorStop(1, 'rgba(' + th.glow + ',0)');
    ctx.fillStyle = au; ctx.beginPath(); ctx.arc(b.x, b.y, AR, 0, TAU); ctx.fill();
    if (asc) for (let i = 0; i < 10; i++) {
      const ph = (t * 0.7 + i * 0.1) % 1, a = i * 2.4;
      ctx.fillStyle = 'rgba(255,' + (120 + i * 10) + ',140,' + (1 - ph) + ')';
      ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * r * (0.6 + ph * 0.9), b.y - ph * r * 2.6 + Math.sin(a) * r * 0.4, 1.6 + (1 - ph) * 1.8, 0, TAU); ctx.fill();
    }
    // wings: spread while channelling the beam; always spread when ascended; folded on the Tenshi skin
    let wk = 0;
    if (c && c.k === 'beam') { const A = AB.beam; wk = c.t < 0.45 ? 1 - Math.pow(1 - c.t / 0.45, 3) : c.t > A.end - 0.3 ? clamp((A.end - c.t) / 0.3, 0, 1) : 1; }
    if (asc) wk = Math.max(wk, 0.82 + 0.06 * Math.sin(t * 2.5)); else if (b.tenshi) wk = Math.max(wk, 0.42);
    wings(ctx, b.x, b.y, r, wk, t, th);
    if (asc) crown(ctx, b.x, b.y, r, t);
    halo(ctx, b.x, b.y, r, t, false, th);
    baseBall(ctx, sim, b, lw, R);
    // body finish
    ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, r - lw, 0, TAU); ctx.clip();
    if (asc) {
      const bg = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.4, r * 0.1, b.x, b.y, r * 1.1);
      bg.addColorStop(0, 'rgba(255,255,255,0.85)'); bg.addColorStop(0.45, 'rgba(255,90,120,0.55)'); bg.addColorStop(1, 'rgba(120,0,25,0.85)');
      ctx.fillStyle = bg; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);
      ctx.strokeStyle = 'rgba(255,233,168,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.78, 0, TAU); ctx.stroke();
    } else if (b.tenshi) {
      const bg = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.4, r * 0.1, b.x, b.y, r * 1.1);
      bg.addColorStop(0, 'rgba(255,255,255,0.95)'); bg.addColorStop(0.6, 'rgba(255,236,242,0.75)'); bg.addColorStop(1, 'rgba(255,170,195,0.8)');
      ctx.fillStyle = bg; ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);
    } else iridescent(ctx, b.x, b.y, r, t, 0.26);
    ctx.restore();
    if (asc) BB.drawKamiKanji(ctx, b.x, b.y + r * 0.02, r * 1.28, 1, '#fff6e0', '#7a0018', 0.12);
    else if (b.tenshi) BB.drawKamiKanji(ctx, b.x, b.y + r * 0.02, r * 1.28, 1, '#6a1a30', 'rgba(255,255,255,0.95)', 0.12);
    else BB.drawKamiKanji(ctx, b.x, b.y + r * 0.02, r * 1.28, 1, '#2a1c05', 'rgba(255,240,200,0.9)', 0.12);
    halo(ctx, b.x, b.y, r, t, true, th);
    // Divine Grace ring: 4 charges
    const gk = (w.grace || 0) / GRACE.max, RR = r + 8;
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(b.x, b.y, RR, 0, TAU); ctx.strokeStyle = 'rgba(30,40,60,0.35)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, RR, -Math.PI / 2, -Math.PI / 2 + TAU * gk);
    ctx.strokeStyle = w.grace >= GRACE.cost ? th.ring : w.grace <= GRACE.floor ? '#8a8f99' : '#ff8a8a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 4;
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * (RR - 4), b.y + Math.sin(a) * (RR - 4)); ctx.lineTo(b.x + Math.cos(a) * (RR + 4), b.y + Math.sin(a) * (RR + 4));
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    // beam charge orb + aim telegraph
    if (c && c.k === 'beam' && !c.fired) {
      const k = clamp(c.t / AB.beam.wind, 0, 1), ca = Math.cos(c.aim), sa = Math.sin(c.aim);
      const ox = b.x + ca * (r + 18), oy = b.y + sa * (r + 18), orb = r * (asc ? 1.5 : 1.1) * k + 2;
      ctx.save();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 120;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(b.x + ca * sim.size * 1.6, b.y + sa * sim.size * 1.6);
      ctx.strokeStyle = 'rgba(' + th.aim + ',' + (0.25 + 0.5 * k) + ')'; ctx.lineWidth = asc ? 5 : 3; ctx.stroke(); ctx.setLineDash([]);
      const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb);
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, asc ? 'rgba(255,140,160,0.95)' : 'rgba(255,240,180,0.9)'); og.addColorStop(1, 'rgba(' + th.aim + ',0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, orb, 0, TAU); ctx.fill();
      for (let i = 0; i < (asc ? 14 : 8); i++) {
        const a = i * (asc ? 0.449 : 0.785) + t * 2, d = r * 2.2 * (1 - ((t * 1.7 + i * 0.13) % 1));
        ctx.fillStyle = asc ? '#ffd0d8' : '#fff6c8'; ctx.beginPath(); ctx.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, 2.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  };

  // Holy swords from Heaven's Arsenal
  const baseProj = BB.drawProjArt;
  BB.drawProjArt = function (ctx, p, lw) {
    if (p.kind !== 'holysword') return baseProj ? baseProj(ctx, p, lw) : false;
    const L = p.r * 4.2, W = p.r * 0.9, red = !!p.red;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
    const tr = ctx.createLinearGradient(-L * 3, 0, 0, 0); tr.addColorStop(0, red ? 'rgba(255,45,85,0)' : 'rgba(255,214,90,0)'); tr.addColorStop(1, red ? 'rgba(255,140,160,0.8)' : 'rgba(255,240,190,0.75)');
    ctx.fillStyle = tr; ctx.beginPath(); ctx.moveTo(-L * 3, 0); ctx.lineTo(-L * 0.4, -W * 0.8); ctx.lineTo(-L * 0.4, W * 0.8); ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(L * 0.7, 0); ctx.lineTo(-L * 0.1, -W * 0.55); ctx.lineTo(-L * 0.1, W * 0.55); ctx.closePath();
    const g = ctx.createLinearGradient(0, -W, 0, W); g.addColorStop(0, '#ffffff'); g.addColorStop(1, red ? '#ff4d6d' : '#ffd96a');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.rect(-L * 0.16, -W * 1.2, W * 0.5, W * 2.4); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(-L * 0.5, -W * 0.25, L * 0.34, W * 0.5); ctx.fillStyle = '#c8961e'; ctx.fill(); ctx.stroke();
    ctx.restore();
    return true;
  };

  // World-space effects drawn above the balls: beams, gates, portals
  function worldFx(ctx, sim) {
    const t = sim.t;
    for (const b of sim.balls) {
      // teleport dodge: light pillar where it was, streak, and an arrival burst
      for (const tp of b.tps || []) {
        const k = 1 - clamp(tp.t / 0.45, 0, 1), r = b.r;
        ctx.save();
        const pa = Math.max(0, 1 - k * 1.8);
        if (pa > 0) {
          const pg = ctx.createLinearGradient(tp.fx - r, 0, tp.fx + r, 0);
          pg.addColorStop(0, 'rgba(159,232,255,0)'); pg.addColorStop(0.5, 'rgba(255,255,255,' + 0.9 * pa + ')'); pg.addColorStop(1, 'rgba(159,232,255,0)');
          ctx.fillStyle = pg; ctx.fillRect(tp.fx - r * 0.6, tp.fy - r * 4, r * 1.2, r * 8);
        }
        if (k < 0.35) {
          ctx.globalAlpha = 1 - k / 0.35; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tp.fx, tp.fy); ctx.lineTo(tp.tx, tp.ty);
          ctx.strokeStyle = 'rgba(159,232,255,0.6)'; ctx.lineWidth = r * 0.5; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.15; ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.beginPath(); ctx.arc(tp.tx, tp.ty, r * (1 + k * 2.4), 0, TAU);
        ctx.strokeStyle = 'rgba(159,232,255,' + (1 - k) + ')'; ctx.lineWidth = 6 * (1 - k) + 1; ctx.stroke();
        if (k < 0.3) { ctx.globalAlpha = 1 - k / 0.3; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(tp.tx, tp.ty, r * 1.25, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 2, d = r * (2.2 - k * 1.4); ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.arc(tp.tx + Math.cos(a) * d, tp.ty + Math.sin(a) * d, 3, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      // Golden Gates around an imprisoned ball
      if (b.alive && b.jail) {
        const j = b.jail, k = clamp(j.t / 0.6, 0, 1), e = 1 - Math.pow(1 - k, 3), R = Math.max(b.r * 1.9, 46);
        const cst = sim.balls.find((x) => x.id === j.by), red = !!(cst && cst.ascended), GC = red ? '#ff2d55' : '#ffd23f';
        const end = clamp((j.t - (j.dur - 0.25)) / 0.25, 0, 1);
        ctx.save(); ctx.translate(j.x, j.y);
        // sigil on the floor
        ctx.save(); ctx.rotate(t * 0.8); ctx.globalAlpha = 0.85 * e;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.strokeStyle = GC; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, TAU); ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05); ctx.lineTo(Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25); ctx.stroke(); }
        ctx.restore();
        const drop = (1 - e) * -160, H = R * 1.25, gold = end > 0 ? '#ffffff' : GC;
        ctx.globalAlpha = Math.min(1, e * 1.4);
        ctx.lineJoin = 'round';
        // cage bars
        for (let i = 0; i < 5; i++) {
          const x = -R * 0.66 + (i * R * 1.32) / 4;
          ctx.beginPath(); ctx.moveTo(x, -H + drop); ctx.lineTo(x, H * 0.85 + drop * 0.4);
          ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = gold; ctx.lineWidth = 4; ctx.stroke();
        }
        // pillars
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.rect(s * R - 7, -H + drop, 14, H * 2);
          const pg = ctx.createLinearGradient(s * R - 7, 0, s * R + 7, 0); pg.addColorStop(0, red ? '#ff8aa0' : '#fff1b8'); pg.addColorStop(1, red ? '#5a0010' : '#c8961e');
          ctx.fillStyle = end > 0 ? '#ffffff' : pg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        }
        // kasagi (curved top beam) + nuki (cross tie)
        ctx.beginPath(); ctx.moveTo(-R * 1.35, -H - 10 + drop); ctx.quadraticCurveTo(0, -H + 2 + drop, R * 1.35, -H - 10 + drop);
        ctx.lineTo(R * 1.3, -H + 2 + drop); ctx.quadraticCurveTo(0, -H + 12 + drop, -R * 1.3, -H + 2 + drop); ctx.closePath();
        ctx.fillStyle = end > 0 ? '#ffffff' : GC; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.rect(-R * 1.12, -H + 18 + drop, R * 2.24, 8); ctx.fillStyle = end > 0 ? '#ffffff' : red ? '#1a0008' : '#e0a400'; ctx.fill(); ctx.stroke();
        // chains of light pulsing on each tick
        const tick = (j.t - 0.9) % 0.5;
        if (j.t > 0.85 && tick < 0.15) { ctx.globalAlpha = 1 - tick / 0.15; ctx.beginPath(); ctx.arc(0, 0, b.r + 6, 0, TAU); ctx.strokeStyle = red ? '#ff8aa0' : '#fff6c8'; ctx.lineWidth = 6; ctx.stroke(); }
        if (end > 0) { ctx.globalAlpha = end * 0.7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      if (!b.alive || !b.def.kami || !b.w.cast) continue;
      const c = b.w.cast, red = !!b.ascended;
      // Seraph Beam
      if (c.k === 'beam' && c.beam && c.t < ab(b, 'beam').end) {
        const k = 1 - clamp((c.t - AB.beam.wind) / (AB.beam.end - AB.beam.wind), 0, 1);
        const bm = c.beam, ang = Math.atan2(bm.by - bm.ay, bm.bx - bm.ax), len = Math.hypot(bm.bx - bm.ax, bm.by - bm.ay);
        const hw = bm.hw * (0.6 + 0.4 * k) * (1 + 0.12 * Math.sin(t * 70));
        ctx.save();
        ctx.beginPath(); ctx.rect(-sim.W / 2, -sim.H / 2, sim.W, sim.H); ctx.clip();
        ctx.translate(bm.ax, bm.ay); ctx.rotate(ang);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        const layer = (wd, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -wd * 0.6); ctx.lineTo(len, -wd); ctx.lineTo(len, wd); ctx.lineTo(0, wd * 0.6); ctx.closePath(); ctx.fill(); };
        layer(hw * 2.3, red ? 'rgba(255,30,70,0.32)' : 'rgba(255,200,80,0.28)');
        layer(hw * 1.35, red ? 'rgba(255,120,145,0.85)' : 'rgba(255,233,168,0.85)');
        layer(hw * 0.6, '#ffffff');
        // sacred rings sliding down the beam
        ctx.strokeStyle = red ? 'rgba(255,233,168,0.95)' : 'rgba(255,214,90,0.9)'; ctx.lineWidth = red ? 4 : 3;
        for (let i = 0; i < 5; i++) {
          const x = ((t * 900 + i * 180) % len);
          ctx.beginPath(); ctx.ellipse(x, 0, hw * 0.35, hw * 1.5, 0, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
      // Heaven's Arsenal portals
      if (c.k === 'rain' && c.portals) {
        const A = ab(b, 'rain');
        c.portals.forEach((p, i) => {
          const open = clamp((c.t - i * 0.035) / 0.3, 0, 1), fired = c.t - (A.open + i * A.gap);
          const close = fired > 0.15 ? clamp(1 - (fired - 0.15) / 0.25, 0, 1) : 1, k = open * close;
          if (k <= 0) return;
          const R = 20 * b.scale * k;
          ctx.save(); ctx.translate(p.x, p.y);
          const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.6);
          pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.45, red ? 'rgba(255,110,135,0.95)' : 'rgba(255,233,168,0.95)'); pg.addColorStop(1, red ? 'rgba(255,30,70,0)' : 'rgba(255,200,80,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, TAU); ctx.fill();
          ctx.rotate(t * 3 + i);
          ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.strokeStyle = red ? '#7a0018' : '#c8961e'; ctx.lineWidth = 3; ctx.stroke();
          for (let q = 0; q < 6; q++) { const a = (q * TAU) / 6; ctx.beginPath(); ctx.arc(Math.cos(a) * R, Math.sin(a) * R, 2.2, 0, TAU); ctx.fillStyle = '#fff6c8'; ctx.fill(); }
          ctx.restore();
        });
      }
    }
  }

  const baseDraw = BB.Renderer.prototype.draw;
  BB.Renderer.prototype.draw = function (sim, opts) {
    opts = opts || {};
    if (sim.balls.some((b) => b.def.kami || b.jail)) {
      const prev = opts.overlay;
      opts = Object.assign({}, opts, { overlay: (ctx, S) => { worldFx(ctx, sim); if (prev) prev(ctx, S); } });
    }
    return baseDraw.call(this, sim, opts);
  };

  // =====================================================================
  // Cinematics (screen space, drawn while the sim is paused)
  // =====================================================================
  const CUT = {
    beam: { title: 'SERAPH BEAM', band: ['#ffffff', '#fff1c1'], ink: '#b8860b' },
    gate: { title: 'GOLDEN GATES', band: ['#ffe27a', '#d9a520'], ink: '#6b4400' },
    rain: { title: "HEAVEN'S ARSENAL", band: ['#fff6d8', '#ebc565'], ink: '#8a5a00' },
  };
  // ascended (red) cut-ins
  const CUTR = {
    beam: { title: 'SERAPH JUDGEMENT', band: ['#2a0008', '#c8102e'], ink: '#ffd23f' },
    gate: { title: 'CRIMSON GATES', band: ['#1a0006', '#9c0a24'], ink: '#ffd23f' },
    rain: { title: 'ARSENAL OF HEAVEN', band: ['#3a000c', '#e0193f'], ink: '#ffe9a8' },
    serv: { title: 'HEAVENLY SERVANTS', band: ['#2a0610', '#b3122e'], ink: '#fff1c1' },
  };
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

  function bigKami(ctx, x, y, r, t, prog, red) {
    const th = red ? TH.red : TH.gold;
    const gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
    gl.addColorStop(0, red ? 'rgba(255,70,100,0.9)' : 'rgba(255,245,210,0.9)'); gl.addColorStop(1, red ? 'rgba(255,70,100,0)' : 'rgba(255,245,210,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
    if (red) { wings(ctx, x, y, r, 0.9, t, th); crown(ctx, x, y, r, t); }
    halo(ctx, x, y, r, t, false, th);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    if (red) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ff6b85'); g.addColorStop(1, '#6a0016'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f6e7b0'); g.addColorStop(1, '#b8902f'); }
    ctx.fillStyle = g; ctx.fill();
    if (!red) iridescent(ctx, x, y, r, t, 0.3);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = Math.max(3, r * 0.07); ctx.strokeStyle = OUT; ctx.stroke();
    if (red) BB.drawKamiKanji(ctx, x, y, r * 1.3, prog, '#fff6e0', '#5a0010', 0.12);
    else BB.drawKamiKanji(ctx, x, y, r * 1.3, prog, '#2a1c05', '#fff3c4', 0.12);
    halo(ctx, x, y, r, t, true, th);
  }

  function cutIn(R, imp) {
    const ctx = R.ctx, W = R.c.width, p = imp.p, T = imp.t, red = !!imp.asc, def = (red ? CUTR[imp.k] : CUT[imp.k]) || CUT.beam;
    const rng = BB.RNG(imp.seed);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const inK = ease(p / 0.16), outK = p > 0.8 ? Math.pow((p - 0.8) / 0.2, 2) : 0;
    ctx.fillStyle = 'rgba(8,6,14,' + 0.62 * inK * (1 - outK) + ')'; ctx.fillRect(0, 0, W, W);
    const H = W * 0.38, slide = (1 - inK) * -W * 1.5 + outK * W * 1.5;
    ctx.translate(W / 2 + slide, W / 2); ctx.rotate(-0.18);
    // band
    const bg = ctx.createLinearGradient(0, -H / 2, 0, H / 2); bg.addColorStop(0, def.band[0]); bg.addColorStop(1, def.band[1]);
    ctx.fillStyle = bg; ctx.fillRect(-W, -H / 2, W * 2, H);
    ctx.save(); ctx.beginPath(); ctx.rect(-W, -H / 2, W * 2, H); ctx.clip();
    // motif
    ctx.globalAlpha = 0.22; ctx.fillStyle = def.ink; ctx.strokeStyle = def.ink;
    if (imp.k === 'beam' || imp.k === 'serv') {
      for (let i = 0; i < 9; i++) { const x = -W * 0.9 + i * W * 0.24 + ((T * 260) % (W * 0.24)), y = (rng() - 0.5) * H; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6 + rng() * 0.4); ctx.beginPath(); ctx.ellipse(0, 0, H * 0.32, H * 0.07, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else if (imp.k === 'gate') {
      ctx.lineWidth = W * 0.018;
      for (let i = -12; i <= 12; i++) { const x = i * W * 0.07 + ((T * 120) % (W * 0.07)); ctx.beginPath(); ctx.moveTo(x, -H / 2); ctx.lineTo(x, H / 2); ctx.stroke(); }
    } else {
      for (let i = 0; i < 12; i++) { const x = -W + i * W * 0.18 + ((T * 520) % (W * 0.18)), y = (rng() - 0.5) * H * 0.8; ctx.save(); ctx.translate(x, y); ctx.rotate(0.5); ctx.beginPath(); ctx.moveTo(H * 0.3, 0); ctx.lineTo(-H * 0.2, -H * 0.04); ctx.lineTo(-H * 0.2, H * 0.04); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    // speed lines
    ctx.globalAlpha = 0.5; ctx.strokeStyle = red ? '#ff8aa0' : '#ffffff';
    for (let i = 0; i < 26; i++) {
      const y = (rng() - 0.5) * H, len = W * (0.15 + rng() * 0.4), x = ((rng() * 2 * W + T * W * 3.2) % (2.6 * W)) - 1.3 * W;
      ctx.lineWidth = 1 + rng() * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // portrait, pushing in
    const pr = H * 0.36 * (1 + p * 0.1);
    bigKami(ctx, -W * 0.25, H * 0.02, pr, T * 2, 1, red);
    // title
    ctx.font = Math.round(H * 0.24) + 'px ' + (BB.FONT || 'Anton, Impact, sans-serif');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const tx = -W * 0.02 + (1 - ease((p - 0.08) / 0.2)) * W * 0.5;
    ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
    // the ability name follows the Ability Text setting
    if (BB.save && BB.save.data.settings.callouts === false) ctx.globalAlpha = 0;
    ctx.lineWidth = H * 0.06; ctx.strokeStyle = '#1d1d22'; ctx.strokeText(def.title, tx, -H * 0.04);
    const tg = ctx.createLinearGradient(0, -H * 0.16, 0, H * 0.08); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(1, red ? '#ffd23f' : '#ffc93a');
    ctx.fillStyle = tg; ctx.fillText(def.title, tx, -H * 0.04);
    ctx.font = Math.round(H * 0.08) + 'px ' + (BB.NUM_FONT || 'sans-serif');
    const sub = red ? 'ASCENDED · DIVINE JUDGEMENT' : 'DIVINE JUDGEMENT';
    ctx.lineWidth = H * 0.025; ctx.strokeText(sub, tx + H * 0.04, H * 0.16);
    ctx.fillStyle = red ? '#ffd0d8' : '#ffffff'; ctx.fillText(sub, tx + H * 0.04, H * 0.16);
    ctx.restore();
    ctx.restore();
    // band edges
    ctx.fillStyle = '#1d1d22'; ctx.fillRect(-W, -H / 2 - W * 0.012, W * 2, W * 0.014); ctx.fillRect(-W, H / 2 - W * 0.002, W * 2, W * 0.014);
    ctx.fillStyle = red ? '#ff2d55' : '#ffd23f'; ctx.fillRect(-W, -H / 2 - W * 0.022, W * 2, W * 0.006); ctx.fillRect(-W, H / 2 + W * 0.016, W * 2, W * 0.006);
    ctx.restore();
    // flash in / out
    const fl = p < 0.07 ? 1 - p / 0.07 : p > 0.9 ? (p - 0.9) / 0.1 * 0.6 : 0;
    if (fl > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = (red ? 'rgba(255,200,210,' : 'rgba(255,250,235,') + fl + ')'; ctx.fillRect(0, 0, W, W); ctx.restore(); }
  }

  // The finisher: judgement of the gods
  function finisher(R, imp) {
    const ctx = R.ctx, W = R.c.width, T = imp.t, D = imp.dur, red = !!imp.asc;
    const cx = W / 2, cy = W / 2;
    if (!imp.shards) {
      const rng = BB.RNG(imp.seed), n = 14;
      imp.shards = [];
      for (let i = 0; i < n; i++) { const a0 = (i / n) * TAU + rng() * 0.2, a1 = ((i + 1) / n) * TAU; imp.shards.push({ a0, a1, v: 0.6 + rng() * 0.8, spin: (rng() - 0.5) * 8 }); }
      imp.cracks = [];
      for (let i = 0; i < 9; i++) { const a = rng() * TAU, pts = [[0, 0]]; let x = 0, y = 0; for (let k = 0; k < 4; k++) { x += Math.cos(a + (rng() - 0.5) * 0.9) * 0.28; y += Math.sin(a + (rng() - 0.5) * 0.9) * 0.28; pts.push([x, y]); } imp.cracks.push(pts); }
      imp.embers = [];
      for (let i = 0; i < 60; i++) imp.embers.push({ x: rng(), s: 0.2 + rng() * 0.8, o: rng(), r: 1 + rng() * 3 });
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fadeOut = T > D - 0.35 ? (T - (D - 0.35)) / 0.35 : 0;
    ctx.globalAlpha = 1 - fadeOut;
    // black void
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, W, W);
    // god rays
    const rays = ease((T - 0.1) / 0.6);
    if (rays > 0) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 0.35);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TAU, wdt = 0.06 + (i % 3) * 0.025;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, W, a - wdt, a + wdt); ctx.closePath();
        ctx.fillStyle = (red ? 'rgba(255,40,80,' : 'rgba(255,214,110,') + (0.09 + (i % 2) * 0.07) * rays + ')'; ctx.fill();
      }
      ctx.restore();
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
      cg.addColorStop(0, (red ? 'rgba(255,70,100,' : 'rgba(255,236,170,') + 0.4 * rays + ')'); cg.addColorStop(1, red ? 'rgba(255,70,100,0)' : 'rgba(255,236,170,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, W);
    }
    // embers rising
    for (const e of imp.embers) {
      const y = W * (1.05 - ((e.o + T * e.s * 0.5) % 1.1)), x = W * e.x + Math.sin(T * 2 + e.o * 9) * W * 0.02;
      ctx.fillStyle = (red ? 'rgba(255,120,140,' : 'rgba(255,200,90,') + 0.8 * rays + ')'; ctx.beginPath(); ctx.arc(x, y, e.r * W / 600, 0, TAU); ctx.fill();
    }
    // ascended: colossal crimson wings unfold behind the judgement
    if (red) { const wk = ease((T - 0.2) / 0.9) * (1 - clamp((T - 1.9) / 0.4, 0, 1)); if (wk > 0) wings(ctx, cx, cy + W * 0.05, W * 0.14, wk, T, TH.red); }
    // the kanji, brushed stroke by stroke
    const kp = clamp((T - 0.25) / 0.95, 0, 1);
    const back = clamp((T - 1.45) / 0.35, 0, 1);
    if (kp > 0) {
      const pulse = T > 1.25 && T < 1.5 ? 1 + 0.08 * Math.sin(((T - 1.25) / 0.25) * Math.PI) : 1;
      const size = W * 0.66 * pulse * (1 + back * 0.25);
      ctx.save(); ctx.globalAlpha *= 1 - back * 0.72;
      const kg = ctx.createLinearGradient(cx, cy - size / 2, cx, cy + size / 2);
      if (red) { kg.addColorStop(0, '#ffffff'); kg.addColorStop(0.5, '#ff4d6d'); kg.addColorStop(1, '#7a0018'); }
      else { kg.addColorStop(0, '#fffbe0'); kg.addColorStop(0.5, '#ffd23f'); kg.addColorStop(1, '#c8761e'); }
      BB.drawKamiKanji(ctx, cx, cy, size, kp, red ? 'rgba(255,60,90,0.2)' : 'rgba(255,214,90,0.16)', null, 0.15);
      BB.drawKamiKanji(ctx, cx, cy, size, kp, kg, red ? '#1a0006' : '#3a1400', 0.105);
      ctx.restore();
      if (T > 1.25 && T < 1.75) {
        const rk = (T - 1.25) / 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, W * (0.1 + rk * 0.7), 0, TAU);
        ctx.strokeStyle = (red ? 'rgba(255,90,120,' : 'rgba(255,240,190,') + (1 - rk) + ')'; ctx.lineWidth = W * 0.02 * (1 - rk) + 1; ctx.stroke();
      }
    }
    // the condemned: silhouette, pillar of light, cracks, shatter
    const sil = clamp((T - 1.45) / 0.2, 0, 1), shatter = clamp((T - 2.05) / 0.45, 0, 1);
    const sr = W * 0.13;
    if (sil > 0) {
      const pil = ease((T - 1.55) / 0.3);
      if (pil > 0 && shatter < 1) {
        const pw = W * 0.2 * pil * (1 - shatter);
        const pg = ctx.createLinearGradient(cx - pw, 0, cx + pw, 0);
        pg.addColorStop(0, red ? 'rgba(255,40,80,0)' : 'rgba(255,240,190,0)'); pg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); pg.addColorStop(1, red ? 'rgba(255,40,80,0)' : 'rgba(255,240,190,0)');
        ctx.fillStyle = pg; ctx.fillRect(cx - pw, 0, pw * 2, cy + sr * 0.2);
      }
      ctx.save(); ctx.translate(cx, cy + W * 0.04);
      if (shatter <= 0) {
        ctx.globalAlpha *= sil;
        ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.fillStyle = '#0b0b10'; ctx.fill();
        ctx.lineWidth = W * 0.008; ctx.strokeStyle = imp.foe || '#e8473f'; ctx.stroke();
        const ck = clamp((T - 1.7) / 0.35, 0, 1);
        ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = W * 0.005; ctx.lineCap = 'round';
        for (const cr of imp.cracks) {
          ctx.beginPath(); ctx.moveTo(0, 0);
          const m = Math.max(1, Math.round(ck * (cr.length - 1)));
          for (let i = 1; i <= m; i++) ctx.lineTo(cr[i][0] * sr, cr[i][1] * sr);
          ctx.stroke();
        }
      } else {
        for (const s of imp.shards) {
          const mid = (s.a0 + s.a1) / 2, d = ease(shatter) * W * 0.55 * s.v;
          ctx.save(); ctx.translate(Math.cos(mid) * d, Math.sin(mid) * d); ctx.rotate(s.spin * shatter);
          ctx.globalAlpha = (1 - fadeOut) * (1 - shatter);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, sr, s.a0 - mid, s.a1 - mid); ctx.closePath();
          ctx.fillStyle = imp.foe || '#e8473f'; ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,' + (0.55 - shatter * 0.3) + ')'; ctx.fill();
          ctx.lineWidth = W * 0.005; ctx.strokeStyle = '#fff6c8'; ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
    ctx.restore();
    // ascended: a crimson cross-slash cuts the condemned apart
    if (red && T > 1.9 && T < 2.5) {
      const k = clamp((T - 1.9) / 0.18, 0, 1), fade = 1 - clamp((T - 2.2) / 0.3, 0, 1);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.lineCap = 'round'; ctx.globalAlpha = fade;
      for (const [x0, y0, x1, y1] of [[0.15, 0.2, 0.85, 0.8], [0.85, 0.2, 0.15, 0.8]]) {
        const ex = x0 + (x1 - x0) * k, ey = y0 + (y1 - y0) * k;
        ctx.beginPath(); ctx.moveTo(W * x0, W * y0); ctx.lineTo(W * ex, W * ey);
        ctx.strokeStyle = 'rgba(255,40,80,0.9)'; ctx.lineWidth = W * 0.035; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = W * 0.01; ctx.stroke();
      }
      ctx.restore();
    }
    // white flashes: the opening cut and the shatter
    const fl = Math.max(T < 0.25 ? 1 - T / 0.25 : 0, T > 2.0 && T < 2.3 ? 1 - Math.abs(T - 2.07) / 0.23 : 0);
    if (fl > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,252,240,' + clamp(fl, 0, 1) + ')'; ctx.fillRect(0, 0, W, W); ctx.restore(); }
  }

  const baseImpact = BB.impactFrame;
  BB.impactFrame = function (R, imp, scale, sx, sy) {
    if (imp.kamiCut) return cutIn(R, imp);
    if (imp.kamiFin) return finisher(R, imp);
    return baseImpact(R, imp, scale, sx, sy);
  };

  // =====================================================================
  // Tenshi awakening: the whole screen goes black, a line types out word by word,
  // shatters away, and 「まだだ」 ("Not yet.") slams in before Kami ascends.
  // =====================================================================
  BB.kamiAwaken = function (done) {
    const el = document.createElement('div');
    el.className = 'awk';
    el.innerHTML = '<div class="awk-rays"></div><div class="awk-line"></div><div class="awk-slash"></div><div class="awk-no"><span>ま</span><span>だ</span><span>だ</span></div><div class="awk-flash"></div>';
    document.body.appendChild(el);
    const line = el.querySelector('.awk-line'), A = BB.audio;
    const at = (ms, fn) => setTimeout(fn, ms);
    const word = (txt, ms) => at(ms, () => {
      const w = document.createElement('span'); w.className = 'awk-w'; line.appendChild(w);
      [...txt].forEach((ch, i) => at(i * 85, () => { const c = document.createElement('i'); c.textContent = ch; w.appendChild(c); A.play('type'); }));
    });
    try { document.fonts.load('48px "Yuji Syuku"', '私が？死んだ'); document.fonts.load('900 48px "Noto Serif JP Black"', 'まだ'); } catch (e) { /* system font fallback */ }
    requestAnimationFrame(() => el.classList.add('on'));
    at(250, () => A.play('heartbeat'));
    word('私が？', 650);
    at(1250, () => A.play('heartbeat'));
    word('死んだ？', 1700);
    // the line is torn apart: every character flies off on its own
    at(3000, () => {
      el.classList.add('cut'); A.play('slash');
      const chars = [...line.querySelectorAll('i')];
      chars.forEach((c) => { c.style.animation = 'none'; c.style.opacity = '1'; });
      void line.offsetWidth; // commit the reset before the flight starts
      chars.forEach((c, k) => {
        const dx = (Math.random() - 0.5) * 520, dy = (Math.random() - 0.5) * 320, rot = (Math.random() - 0.5) * 140;
        c.style.transition = 'transform .55s cubic-bezier(.2,.7,.3,1), opacity .55s, filter .55s';
        c.style.transitionDelay = (k * 0.02) + 's';
        c.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${0.4 + Math.random() * 0.6})`;
        c.style.opacity = '0'; c.style.filter = 'blur(6px)';
      });
    });
    at(3900, () => { el.classList.add('no'); A.play('awaken'); BB.app && (BB.app.shake = 18); if (navigator.vibrate) try { navigator.vibrate([60, 40, 120]); } catch (e) { /* */ } });
    at(5300, () => el.classList.add('flash'));
    at(5650, () => { el.classList.add('out'); done && done(); });
    at(6200, () => el.remove());
  };
})();
