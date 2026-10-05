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
  const regenRate = (g) => (g <= GRACE.floor ? 0 : GRACE.regen * (g / GRACE.max));
  const AB = {
    beam: { name: 'Seraph Beam', cd: 10, first: 3.5, wind: 1.0, end: 1.85, dmg: 20 },
    gate: { name: 'Golden Gates', cd: 14, first: 7, jail: 2.8, end: 3.1, tick: 2, slam: 10 },
    rain: { name: "Heaven's Arsenal", cd: 12, first: 11, open: 0.5, gap: 0.12, swords: 10, dmg: 3 },
  };
  BB.KAMI = { GRACE, AB };

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
    const A = AB[k];
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
    sim.emit({ type: 'kami', k, x: b.x, y: b.y, team: b.team });
    if (!sim.preview) sim.fxTag(b.x, b.y - b.r - 30, A.name.toUpperCase(), '#ffe9a8');
  }

  function fireBeam(sim, b, c) {
    const A = AB.beam, ca = Math.cos(c.aim), sa = Math.sin(c.aim);
    const L = sim.size * 1.6, hw = 30 * b.scale;
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
    sim.ring(ax, ay, 10, 130, '#fff6c8', 0.45);
    sim.burst(ax, ay, 24, ['#ffffff', '#fff1b8', '#ffd23f'], 520, 4);
    sim.emit({ type: 'kami', k: 'beamfire', x: ax, y: ay });
  }

  function runCast(sim, b, w, dt) {
    const c = w.cast, A = AB[c.k];
    c.t += dt;
    const tgt = byId(sim, c.tgt);
    if (c.k === 'beam') {
      if (c.t < A.wind - 0.15 && tgt && tgt.alive) c.aim = turnTo(c.aim, Math.atan2(tgt.y - b.y, tgt.x - b.x), Math.min(1, 8 * dt));
      if (!c.fired && c.t >= A.wind) { c.fired = true; fireBeam(sim, b, c); }
      if (c.t >= A.end) { w.cast = null; b.hold = false; }
    } else if (c.k === 'gate') {
      const ticks = [0.9, 1.4, 1.9, 2.4];
      while (c.n < ticks.length && c.t >= ticks[c.n]) {
        c.n++;
        if (tgt && tgt.alive) { sim.damage(tgt, A.tick, b, { x: tgt.x, y: tgt.y - tgt.r }); sim.ring(tgt.x, tgt.y, tgt.r, tgt.r * 2.2, '#ffd23f', 0.3); }
      }
      if (!c.fired && c.t >= A.jail) {
        c.fired = true;
        if (tgt && tgt.alive) {
          sim.damage(tgt, A.slam, b, { x: tgt.x, y: tgt.y, lag: true });
          sim.ring(c.x, c.y, 10, 150, '#ffe9a8', 0.45);
          sim.burst(c.x, c.y, 26, ['#ffffff', '#ffd23f', '#e0a400'], 460, 4);
        }
        sim.emit({ type: 'kami', k: 'gateslam', x: c.x, y: c.y });
      }
      if (c.t >= A.end) w.cast = null;
    } else if (c.k === 'rain') {
      while (c.n < c.portals.length && c.t >= A.open + c.n * A.gap) {
        const p = c.portals[c.n++], e = pickTarget(sim, b);
        const a = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.a + Math.PI;
        sim.spawnProj({ owner: b, kind: 'holysword', divine: true, x: p.x, y: p.y, vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, angle: a, r: 7 * b.scale, dmg: A.dmg, life: 2.2, homing: 3, knock: 160 });
        sim.emit({ type: 'shoot', x: p.x, y: p.y, small: true });
      }
      if (c.t >= A.open + c.portals.length * A.gap + 0.45) w.cast = null;
    }
  }

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
      w.grace = Math.min(GRACE.max, w.grace + regenRate(w.grace) * dt);
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
    stats: (w) => ['Grace: ' + Math.floor(w.grace || 0) + '%', 'Damage: ' + fmt(w.damage)],
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

  function halo(ctx, x, y, r, t, front) {
    ctx.save();
    ctx.translate(x, y - r * 1.22);
    ctx.scale(1, 0.28);
    const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : TAU;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, a0, a1);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,214,90,0.35)'; ctx.lineWidth = r * 0.55; ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = r * 0.22; ctx.stroke();
    ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = r * 0.08; ctx.stroke();
    ctx.restore();
    if (front) {
      const s = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = 'rgba(255,255,240,' + (0.5 + 0.5 * s) + ')';
      ctx.beginPath(); ctx.arc(x + Math.cos(t * 2) * r * 0.7, y - r * 1.22 + Math.sin(t * 2) * r * 0.15, r * 0.07, 0, TAU); ctx.fill();
    }
  }

  // A fan of feathers: three tiers per side, spread k (0..1)
  function wings(ctx, x, y, r, k, t) {
    if (k <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, -r * 0.4, r * 0.3, 0, -r * 0.4, r * 4.2 * k);
    glow.addColorStop(0, 'rgba(255,248,220,' + 0.55 * k + ')'); glow.addColorStop(1, 'rgba(255,230,160,0)');
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
          g.addColorStop(0, '#fff6d8'); g.addColorStop(0.7, '#ffffff'); g.addColorStop(1, tier === 0 ? '#ffe08a' : '#fff3c4');
          ctx.fillStyle = g; ctx.fill();
          ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(184,134,11,0.85)'; ctx.stroke();
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  // Kami's weapon: Ama-no-Nuhoko, the heavenly jewelled spear
  const baseWeapon = BB.drawWeapon;
  BB.drawWeapon = function (ctx, id, s, L, W, lw, t, team) {
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

  // Ball: aura, afterimages, wings, halo, kanji, Grace ring
  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    if (!b.def.kami) return baseBall(ctx, sim, b, lw, R);
    const w = b.w, r = b.r, t = sim.t, c = w.cast;
    // vanishing afterimage: squeezes into a vertical slit of light
    for (const g of b.ghosts || []) {
      const k = 1 - clamp(g.t / 0.45, 0, 1), sx = Math.max(0.02, 1 - k * 1.6), sy = 1 + k * 1.4;
      ctx.save(); ctx.translate(g.x, g.y); ctx.scale(sx, sy); ctx.globalAlpha = 1 - k * 0.6;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
      const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, r); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, '#bfefff');
      ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 2 / sx; ctx.strokeStyle = '#9fe8ff'; ctx.stroke();
      ctx.restore();
    }
    // aura
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    const au = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, r * (2 + pulse * 0.3));
    au.addColorStop(0, 'rgba(255,236,170,0.55)'); au.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = au; ctx.beginPath(); ctx.arc(b.x, b.y, r * (2 + pulse * 0.3), 0, TAU); ctx.fill();
    // wings while channelling the beam
    if (c && c.k === 'beam') {
      const A = AB.beam, k = c.t < 0.45 ? 1 - Math.pow(1 - c.t / 0.45, 3) : c.t > A.end - 0.3 ? clamp((A.end - c.t) / 0.3, 0, 1) : 1;
      wings(ctx, b.x, b.y, r, k, t);
    }
    halo(ctx, b.x, b.y, r, t, false);
    baseBall(ctx, sim, b, lw, R);
    // iridescent sheen + kanji on the body
    ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, r - lw, 0, TAU); ctx.clip();
    iridescent(ctx, b.x, b.y, r, t, 0.26);
    ctx.restore();
    BB.drawKamiKanji(ctx, b.x, b.y + r * 0.02, r * 1.28, 1, '#2a1c05', 'rgba(255,240,200,0.9)', 0.12);
    halo(ctx, b.x, b.y, r, t, true);
    // Divine Grace ring: 4 charges
    const gk = (w.grace || 0) / GRACE.max, RR = r + 8;
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(b.x, b.y, RR, 0, TAU); ctx.strokeStyle = 'rgba(30,40,60,0.35)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, RR, -Math.PI / 2, -Math.PI / 2 + TAU * gk);
    ctx.strokeStyle = w.grace >= GRACE.cost ? '#9fe8ff' : w.grace <= GRACE.floor ? '#8a8f99' : '#ff8a8a'; ctx.lineWidth = 4; ctx.stroke();
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
      const ox = b.x + ca * (r + 18), oy = b.y + sa * (r + 18);
      ctx.save();
      ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 120;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(b.x + ca * sim.size * 1.6, b.y + sa * sim.size * 1.6);
      ctx.strokeStyle = 'rgba(255,214,90,' + (0.25 + 0.5 * k) + ')'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, r * 1.1 * k + 2);
      og.addColorStop(0, '#ffffff'); og.addColorStop(0.4, 'rgba(255,240,180,0.9)'); og.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ox, oy, r * 1.1 * k + 2, 0, TAU); ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + t * 2, d = r * 2.2 * (1 - ((t * 1.7 + i * 0.13) % 1));
        ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d, 2.5, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  };

  // Holy swords from Heaven's Arsenal
  const baseProj = BB.drawProjArt;
  BB.drawProjArt = function (ctx, p, lw) {
    if (p.kind !== 'holysword') return baseProj ? baseProj(ctx, p, lw) : false;
    const L = p.r * 4.2, W = p.r * 0.9;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
    const tr = ctx.createLinearGradient(-L * 3, 0, 0, 0); tr.addColorStop(0, 'rgba(255,214,90,0)'); tr.addColorStop(1, 'rgba(255,240,190,0.75)');
    ctx.fillStyle = tr; ctx.beginPath(); ctx.moveTo(-L * 3, 0); ctx.lineTo(-L * 0.4, -W * 0.8); ctx.lineTo(-L * 0.4, W * 0.8); ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(L * 0.7, 0); ctx.lineTo(-L * 0.1, -W * 0.55); ctx.lineTo(-L * 0.1, W * 0.55); ctx.closePath();
    const g = ctx.createLinearGradient(0, -W, 0, W); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffd96a');
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
        const end = clamp((j.t - (j.dur - 0.25)) / 0.25, 0, 1);
        ctx.save(); ctx.translate(j.x, j.y);
        // sigil on the floor
        ctx.save(); ctx.rotate(t * 0.8); ctx.globalAlpha = 0.85 * e;
        ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, TAU); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 1.05, 0, TAU); ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 1.05, Math.sin(a) * R * 1.05); ctx.lineTo(Math.cos(a) * R * 1.25, Math.sin(a) * R * 1.25); ctx.stroke(); }
        ctx.restore();
        const drop = (1 - e) * -160, H = R * 1.25, gold = end > 0 ? '#ffffff' : '#ffd23f';
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
          const pg = ctx.createLinearGradient(s * R - 7, 0, s * R + 7, 0); pg.addColorStop(0, '#fff1b8'); pg.addColorStop(1, '#c8961e');
          ctx.fillStyle = end > 0 ? '#ffffff' : pg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        }
        // kasagi (curved top beam) + nuki (cross tie)
        ctx.beginPath(); ctx.moveTo(-R * 1.35, -H - 10 + drop); ctx.quadraticCurveTo(0, -H + 2 + drop, R * 1.35, -H - 10 + drop);
        ctx.lineTo(R * 1.3, -H + 2 + drop); ctx.quadraticCurveTo(0, -H + 12 + drop, -R * 1.3, -H + 2 + drop); ctx.closePath();
        ctx.fillStyle = end > 0 ? '#ffffff' : '#ffd23f'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.beginPath(); ctx.rect(-R * 1.12, -H + 18 + drop, R * 2.24, 8); ctx.fillStyle = end > 0 ? '#ffffff' : '#e0a400'; ctx.fill(); ctx.stroke();
        // chains of light pulsing on each tick
        const tick = (j.t - 0.9) % 0.5;
        if (j.t > 0.85 && tick < 0.15) { ctx.globalAlpha = 1 - tick / 0.15; ctx.beginPath(); ctx.arc(0, 0, b.r + 6, 0, TAU); ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 6; ctx.stroke(); }
        if (end > 0) { ctx.globalAlpha = end * 0.7; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
      if (!b.alive || !b.def.kami || !b.w.cast) continue;
      const c = b.w.cast;
      // Seraph Beam
      if (c.k === 'beam' && c.beam && c.t < AB.beam.end) {
        const k = 1 - clamp((c.t - AB.beam.wind) / (AB.beam.end - AB.beam.wind), 0, 1);
        const bm = c.beam, ang = Math.atan2(bm.by - bm.ay, bm.bx - bm.ax), len = Math.hypot(bm.bx - bm.ax, bm.by - bm.ay);
        const hw = bm.hw * (0.6 + 0.4 * k) * (1 + 0.12 * Math.sin(t * 70));
        ctx.save();
        ctx.beginPath(); ctx.rect(-sim.W / 2, -sim.H / 2, sim.W, sim.H); ctx.clip();
        ctx.translate(bm.ax, bm.ay); ctx.rotate(ang);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        const layer = (wd, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -wd * 0.6); ctx.lineTo(len, -wd); ctx.lineTo(len, wd); ctx.lineTo(0, wd * 0.6); ctx.closePath(); ctx.fill(); };
        layer(hw * 2.3, 'rgba(255,200,80,0.28)');
        layer(hw * 1.35, 'rgba(255,233,168,0.85)');
        layer(hw * 0.6, '#ffffff');
        // sacred rings sliding down the beam
        ctx.strokeStyle = 'rgba(255,214,90,0.9)'; ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          const x = ((t * 900 + i * 180) % len);
          ctx.beginPath(); ctx.ellipse(x, 0, hw * 0.35, hw * 1.5, 0, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      }
      // Heaven's Arsenal portals
      if (c.k === 'rain' && c.portals) {
        const A = AB.rain;
        c.portals.forEach((p, i) => {
          const open = clamp((c.t - i * 0.035) / 0.3, 0, 1), fired = c.t - (A.open + i * A.gap);
          const close = fired > 0.15 ? clamp(1 - (fired - 0.15) / 0.25, 0, 1) : 1, k = open * close;
          if (k <= 0) return;
          const R = 20 * b.scale * k;
          ctx.save(); ctx.translate(p.x, p.y);
          const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.6);
          pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.45, 'rgba(255,233,168,0.95)'); pg.addColorStop(1, 'rgba(255,200,80,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, TAU); ctx.fill();
          ctx.rotate(t * 3 + i);
          ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.strokeStyle = '#c8961e'; ctx.lineWidth = 3; ctx.stroke();
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
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

  function bigKami(ctx, x, y, r, t, prog) {
    const gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
    gl.addColorStop(0, 'rgba(255,245,210,0.9)'); gl.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
    halo(ctx, x, y, r, t, false);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f6e7b0'); g.addColorStop(1, '#b8902f');
    ctx.fillStyle = g; ctx.fill();
    iridescent(ctx, x, y, r, t, 0.3);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = Math.max(3, r * 0.07); ctx.strokeStyle = OUT; ctx.stroke();
    BB.drawKamiKanji(ctx, x, y, r * 1.3, prog, '#2a1c05', '#fff3c4', 0.12);
    halo(ctx, x, y, r, t, true);
  }

  function cutIn(R, imp) {
    const ctx = R.ctx, W = R.c.width, p = imp.p, T = imp.t, def = CUT[imp.k] || CUT.beam;
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
    if (imp.k === 'beam') {
      for (let i = 0; i < 9; i++) { const x = -W * 0.9 + i * W * 0.24 + ((T * 260) % (W * 0.24)), y = (rng() - 0.5) * H; ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6 + rng() * 0.4); ctx.beginPath(); ctx.ellipse(0, 0, H * 0.32, H * 0.07, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else if (imp.k === 'gate') {
      ctx.lineWidth = W * 0.018;
      for (let i = -12; i <= 12; i++) { const x = i * W * 0.07 + ((T * 120) % (W * 0.07)); ctx.beginPath(); ctx.moveTo(x, -H / 2); ctx.lineTo(x, H / 2); ctx.stroke(); }
    } else {
      for (let i = 0; i < 12; i++) { const x = -W + i * W * 0.18 + ((T * 520) % (W * 0.18)), y = (rng() - 0.5) * H * 0.8; ctx.save(); ctx.translate(x, y); ctx.rotate(0.5); ctx.beginPath(); ctx.moveTo(H * 0.3, 0); ctx.lineTo(-H * 0.2, -H * 0.04); ctx.lineTo(-H * 0.2, H * 0.04); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    // speed lines
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff';
    for (let i = 0; i < 26; i++) {
      const y = (rng() - 0.5) * H, len = W * (0.15 + rng() * 0.4), x = ((rng() * 2 * W + T * W * 3.2) % (2.6 * W)) - 1.3 * W;
      ctx.lineWidth = 1 + rng() * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // portrait, pushing in
    const pr = H * 0.36 * (1 + p * 0.1);
    bigKami(ctx, -W * 0.25, H * 0.02, pr, T * 2, 1);
    // title
    ctx.font = Math.round(H * 0.24) + 'px ' + (BB.FONT || 'Anton, Impact, sans-serif');
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const tx = -W * 0.02 + (1 - ease((p - 0.08) / 0.2)) * W * 0.5;
    ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
    // the ability name follows the Ability Text setting
    if (BB.save && BB.save.data.settings.callouts === false) ctx.globalAlpha = 0;
    ctx.lineWidth = H * 0.06; ctx.strokeStyle = '#1d1d22'; ctx.strokeText(def.title, tx, -H * 0.04);
    const tg = ctx.createLinearGradient(0, -H * 0.16, 0, H * 0.08); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(1, '#ffc93a');
    ctx.fillStyle = tg; ctx.fillText(def.title, tx, -H * 0.04);
    ctx.font = Math.round(H * 0.08) + 'px ' + (BB.NUM_FONT || 'sans-serif');
    ctx.lineWidth = H * 0.025; ctx.strokeText('DIVINE JUDGEMENT', tx + H * 0.04, H * 0.16);
    ctx.fillStyle = '#ffffff'; ctx.fillText('DIVINE JUDGEMENT', tx + H * 0.04, H * 0.16);
    ctx.restore();
    ctx.restore();
    // band edges
    ctx.fillStyle = '#1d1d22'; ctx.fillRect(-W, -H / 2 - W * 0.012, W * 2, W * 0.014); ctx.fillRect(-W, H / 2 - W * 0.002, W * 2, W * 0.014);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-W, -H / 2 - W * 0.022, W * 2, W * 0.006); ctx.fillRect(-W, H / 2 + W * 0.016, W * 2, W * 0.006);
    ctx.restore();
    // flash in / out
    const fl = p < 0.07 ? 1 - p / 0.07 : p > 0.9 ? (p - 0.9) / 0.1 * 0.6 : 0;
    if (fl > 0) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(255,250,235,' + fl + ')'; ctx.fillRect(0, 0, W, W); ctx.restore(); }
  }

  // The finisher: judgement of the gods
  function finisher(R, imp) {
    const ctx = R.ctx, W = R.c.width, T = imp.t, D = imp.dur;
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
        ctx.fillStyle = 'rgba(255,214,110,' + (0.09 + (i % 2) * 0.06) * rays + ')'; ctx.fill();
      }
      ctx.restore();
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
      cg.addColorStop(0, 'rgba(255,236,170,' + 0.35 * rays + ')'); cg.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, W);
    }
    // embers rising
    for (const e of imp.embers) {
      const y = W * (1.05 - ((e.o + T * e.s * 0.5) % 1.1)), x = W * e.x + Math.sin(T * 2 + e.o * 9) * W * 0.02;
      ctx.fillStyle = 'rgba(255,200,90,' + 0.8 * rays + ')'; ctx.beginPath(); ctx.arc(x, y, e.r * W / 600, 0, TAU); ctx.fill();
    }
    // the kanji, brushed stroke by stroke
    const kp = clamp((T - 0.25) / 0.95, 0, 1);
    const back = clamp((T - 1.45) / 0.35, 0, 1);
    if (kp > 0) {
      const pulse = T > 1.25 && T < 1.5 ? 1 + 0.08 * Math.sin(((T - 1.25) / 0.25) * Math.PI) : 1;
      const size = W * 0.66 * pulse * (1 + back * 0.25);
      ctx.save(); ctx.globalAlpha *= 1 - back * 0.72;
      const kg = ctx.createLinearGradient(cx, cy - size / 2, cx, cy + size / 2);
      kg.addColorStop(0, '#fffbe0'); kg.addColorStop(0.5, '#ffd23f'); kg.addColorStop(1, '#c8761e');
      BB.drawKamiKanji(ctx, cx, cy, size, kp, 'rgba(255,214,90,0.16)', null, 0.15);
      BB.drawKamiKanji(ctx, cx, cy, size, kp, kg, '#3a1400', 0.105);
      ctx.restore();
      if (T > 1.25 && T < 1.75) {
        const rk = (T - 1.25) / 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, W * (0.1 + rk * 0.7), 0, TAU);
        ctx.strokeStyle = 'rgba(255,240,190,' + (1 - rk) + ')'; ctx.lineWidth = W * 0.02 * (1 - rk) + 1; ctx.stroke();
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
        pg.addColorStop(0, 'rgba(255,240,190,0)'); pg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); pg.addColorStop(1, 'rgba(255,240,190,0)');
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
})();
