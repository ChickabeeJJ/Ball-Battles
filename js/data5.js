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
    desc: 'Every 6s it summons a random ball from the whole roster to fight beside it, at half of BALL\'s current health (up to 5 at once). Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 1.5; w.summons = 0; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = 6;
      const room = 5 - sim.balls.filter((m) => m.alive && m.owner === b).length;
      if (room <= 0) return;
      // one random ball per summon
      const n = 1, P = pool(), a0 = sim.rng() * TAU, lim = sim.W / 2 - b.r;
      for (let i = 0; i < n; i++) {
        const def = P[Math.floor(sim.rng() * P.length)], a = a0 + (i / n) * TAU, d = b.r * 2.4;
        const x = BB.clamp(b.x + Math.cos(a) * d, -lim, lim), y = BB.clamp(b.y + Math.sin(a) * d, -lim, lim);
        const m = sim.makeBall(def, b.team, x, y, { hp: Math.max(5, Math.round(b.hp * 0.5)), scale: b.scale * 0.8, main: false, owner: b });
        m.name = def.name; m.summoned = true; w.summons++;
        sim.ring(x, y, 4, 46, '#ffffff', 0.35);
        sim.burst(x, y, 12, ['#ff5e7e', '#ffd23f', '#35d047', '#3d8bf2', '#a259ff'], 300, 4);
        if (n === 1) sim.fxTag(x, y - m.r - 22, def.name.toUpperCase() + '!', BB.itemColor(def.id));
      }
      if (n > 1) sim.fxTag(b.x, b.y - b.r - 26, 'SUMMON x' + n + '!', '#ffffff');
      sim.emit({ type: 'build', x: b.x, y: b.y });
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w, b, sim) => ['Damage: ' + fmt(w.damage), 'Allies: ' + (sim && b ? sim.balls.filter((m) => m.alive && m.owner === b).length : 0) + '/5'],
  });

  // ---------------------------------------------------------------- Nova (Season 1 Elite Pass, tier 30)
  // Soaks up the damage it takes into a star core; every 6s the core goes supernova and blasts
  // everything nearby for 60% of what it absorbed (at least 4).
  add({
    id: 'nova', name: 'Nova', cat: 'special', rarity: 'legendary', color: '#ffb347', price: 10000, seasonBall: 1,
    desc: 'Absorbs the damage it takes into a star core. Every 6s the core goes supernova, blasting a huge area for all of the damage it absorbed (at least 6) and hurling enemies away. Slams for 1.5, +0.5 every hit.',
    base: { damage: 1.5 }, contact: true,
    init(w, b) { w.timer = 6; w.charge = 0; w.prev = null; w.nova = 0; },
    update(sim, b, w, dt) {
      if (w.prev == null) w.prev = b.hp;
      if (b.hp < w.prev) w.charge += w.prev - b.hp;
      w.prev = b.hp;
      if (w.nova > 0) w.nova = Math.max(0, w.nova - dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = 6;
      const dmg = Math.max(6, w.charge), R = b.r * 7.5;
      w.charge = 0; w.nova = 1; w.nx = b.x; w.ny = b.y; w.nR = R;
      sim.explode(b, b.x, b.y, R, dmg);
      for (const e of sim.balls) if (e.alive && e.team !== b.team && (e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (R + e.r) ** 2) sim.knock(e, b.x, b.y, 520);
      sim.burst(b.x, b.y, 44, ['#ffffff', '#fff6c2', '#ffd23f', '#ff8a1f', '#ff4d3d'], 760, 7);
      sim.fxTag(b.x, b.y - b.r - 26, 'SUPERNOVA ' + fmt(dmg), '#ffb347');
      sim.emit({ type: 'nova', x: b.x, y: b.y });
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Core: ' + fmt(Math.max(6, w.charge || 0))],
  });

  if (typeof document === 'undefined') return;
  // ================================================================ art
  const OUT = '#1d1d22', RAINBOW = ['#ff5e7e', '#ffd23f', '#35d047', '#3d8bf2', '#a259ff'];

  // menu icon: a white ball with a rainbow rim and a cluster of four little balls ("every ball")
  const baseIcon = BB.drawIcon;
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    baseIcon(ctx, id, x, y, size, opts);
    if (id === 'nova') {
      // a bright star core with four flare points
      const r = size * 0.33;
      ctx.save(); ctx.translate(x, y);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#fff1b8'); g.addColorStop(1, 'rgba(255,241,184,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, TAU); ctx.fill();
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.2 : r * 0.62; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = Math.max(1, size * 0.015); ctx.strokeStyle = '#ff8a1f'; ctx.stroke();
      ctx.restore();
      return;
    }
    if (id !== 'ball') return;
    const r = size * 0.33, lw = Math.max(1.5, size * 0.03);
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, r - lw * 0.2, (i / 5) * TAU - Math.PI / 2, ((i + 1) / 5) * TAU - Math.PI / 2); ctx.strokeStyle = RAINBOW[i]; ctx.lineWidth = lw * 1.3; ctx.stroke(); }
    const s = r * 0.24;
    [[-1, -1, 0], [1, -1, 1], [-1, 1, 3], [1, 1, 2]].forEach(([dx, dy, c]) => { ctx.beginPath(); ctx.arc(dx * s * 1.05, dy * s * 1.05, s, 0, TAU); ctx.fillStyle = RAINBOW[c]; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke(); });
    ctx.restore();
  };

  // Supernova, ~1s: white-hot flash, a fireball that swells to the full blast radius and cools from
  // gold to crimson, a double shockwave, light spears and drifting embers.
  function drawNova(ctx, sim, w) {
    const e = 1 - w.nova, R = w.nR, x = w.nx, y = w.ny, out = 1 - Math.pow(1 - Math.min(1, e / 0.4), 3);
    ctx.save();
    // fireball: swells to the blast edge, cools from white-gold to crimson, then thins out
    const fr = R * (0.2 + 0.8 * out), fa = e < 0.45 ? 1 : Math.max(0, 1 - (e - 0.45) / 0.55);
    const fg = ctx.createRadialGradient(x, y, 0, x, y, fr);
    fg.addColorStop(0, 'rgba(255,250,225,' + 0.95 * fa + ')');
    fg.addColorStop(0.28, 'rgba(255,214,90,' + 0.85 * fa + ')');
    fg.addColorStop(0.62, 'rgba(255,110,40,' + 0.6 * fa + ')');
    fg.addColorStop(0.88, 'rgba(200,30,60,' + 0.35 * fa + ')');
    fg.addColorStop(1, 'rgba(120,10,40,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, fr, 0, TAU); ctx.fill();
    // smoke billows around the rim as it cools
    if (e > 0.3) {
      const k = (e - 0.3) / 0.7;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + i * 0.37, rr = R * (0.82 + 0.12 * Math.sin(i * 2.3)) * (0.9 + 0.15 * k); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr, pr = R * 0.15 * (0.6 + k), sg = ctx.createRadialGradient(px, py, 0, px, py, pr); sg.addColorStop(0, 'rgba(90,55,60,' + 0.28 * (1 - k) + ')'); sg.addColorStop(1, 'rgba(90,55,60,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill(); }
    }
    // light spears
    ctx.save(); ctx.translate(x, y); ctx.rotate(e * 0.7);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12); const L = R * (0.5 + 0.7 * out) * (i % 2 ? 0.65 : 1), wd = R * 0.055 * (1 - e);
      ctx.beginPath(); ctx.moveTo(0, -wd); ctx.lineTo(L, 0); ctx.lineTo(0, wd); ctx.closePath(); ctx.fillStyle = 'rgba(255,190,60,' + 0.7 * (1 - e) + ')'; ctx.fill();
    }
    ctx.restore();
    // white-hot core flash
    if (e < 0.3) { const k = 1 - e / 0.3; ctx.beginPath(); ctx.arc(x, y, R * 0.28 * (0.6 + out), 0, TAU); ctx.fillStyle = 'rgba(255,255,255,' + 0.9 * k + ')'; ctx.fill(); }
    // double shockwave
    for (const [d, c, lw] of [[0, '#ffffff', 12], [0.1, '#ff8a1f', 8], [0.2, '#d6304a', 5]]) {
      const k = Math.max(0, Math.min(1, (e - d) / 0.55)); if (k <= 0 || k >= 1) continue;
      const rr = R * (0.15 + 0.95 * (1 - Math.pow(1 - k, 2)));
      ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.lineWidth = lw * (1 - k * 0.5) + 3; ctx.strokeStyle = '#1d1d22'; ctx.stroke(); ctx.lineWidth = lw * (1 - k * 0.5); ctx.strokeStyle = c; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ================================================================ BALL's finisher (~2.5s)
  // Black void with rainbow speed lines; BALL charges in out of a rainbow portal, then IMPACT: the
  // frame inverts into a manga-style rainbow shockwave, the foe shatters, and "BALL!!" slams in letter
  // by letter, each in a different colour.
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 2.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  let ballImg = null;
  function ballFinisher(R, imp) {
    const ctx = R.ctx, W = R.c.width, H = R.c.height, T = imp.t, D = imp.dur, cx = W / 2, cy = H / 2, U = Math.min(W, H);
    if (!ballImg) { ballImg = new Image(); ballImg.src = BB.icon('ball', 256); }
    if (!imp.sh) {
      const r = BB.RNG(imp.seed); imp.sh = [];
      for (let i = 0; i < 16; i++) imp.sh.push({ a: (i / 16) * TAU + r() * 0.3, v: 0.5 + r() * 0.9, s: 0.05 + r() * 0.06, spin: (r() - 0.5) * 9, c: RAINBOW[i % 5] });
      imp.lines = Array.from({ length: 48 }, () => [r() * TAU, 0.25 + r() * 0.75, r()]);
    }
    const HIT = 0.85;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fade = T > D - 0.35 ? (T - (D - 0.35)) / 0.35 : 0;
    ctx.globalAlpha = 1 - fade;
    const hit = T >= HIT, k = hit ? ease((T - HIT) / 0.5) : 0;
    // background: void before the hit, a flashing rainbow-tinted white after
    ctx.fillStyle = hit ? (T - HIT < 0.08 ? '#ffffff' : '#0b0712') : '#05040a'; ctx.fillRect(0, 0, W, H);
    if (hit) {
      // radial rainbow burst behind everything
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 0.6);
      for (let i = 0; i < 20; i++) { ctx.rotate(TAU / 20); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(U * 1.2, -U * 0.09); ctx.lineTo(U * 1.2, U * 0.09); ctx.closePath(); ctx.fillStyle = RAINBOW[i % 5]; ctx.globalAlpha = (1 - fade) * 0.35 * k; ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1 - fade;
    }
    // speed lines rushing to the centre (rainbow)
    for (const [a, len, ph] of imp.lines) {
      const sp = ((T * 2.2 + ph) % 1), r0 = U * (0.75 - sp * 0.5), r1 = r0 + U * 0.25 * len;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.strokeStyle = RAINBOW[Math.floor(ph * 5)]; ctx.lineWidth = hit ? 2 : 3; ctx.globalAlpha = (1 - fade) * (hit ? 0.35 : 0.8); ctx.stroke();
    }
    ctx.globalAlpha = 1 - fade;
    // the foe: a coloured ball in the middle until the hit, then shards flying out
    if (!hit) {
      const fr = U * 0.13;
      ctx.beginPath(); ctx.arc(cx, cy, fr, 0, TAU); ctx.fillStyle = imp.foe || '#e8473f'; ctx.fill(); ctx.lineWidth = U * 0.012; ctx.strokeStyle = '#111'; ctx.stroke();
      // BALL charging in from the corner with a rainbow trail
      const c = ease(T / HIT), bx = cx + (1 - c) * W * 0.65, by = cy - (1 - c) * H * 0.55, br = U * (0.06 + 0.1 * c);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (W * 0.7) * (1 - c * 0.3) + i * 6, by - H * 0.6 + i * 10); ctx.strokeStyle = RAINBOW[i]; ctx.lineWidth = br * 0.35; ctx.globalAlpha = (1 - fade) * 0.55; ctx.stroke(); }
      ctx.globalAlpha = 1 - fade;
      if (ballImg.complete) ctx.drawImage(ballImg, bx - br * 1.5, by - br * 1.5, br * 3, br * 3);
    } else {
      // shards of the foe
      for (const sh of imp.sh) {
        const d = U * 0.12 + k * U * 0.55 * sh.v, x = cx + Math.cos(sh.a) * d, y = cy + Math.sin(sh.a) * d, s0 = U * sh.s;
        ctx.save(); ctx.translate(x, y); ctx.rotate(sh.spin * (T - HIT));
        ctx.beginPath(); ctx.moveTo(-s0, -s0 * 0.6); ctx.lineTo(s0, -s0 * 0.2); ctx.lineTo(s0 * 0.2, s0); ctx.closePath();
        ctx.fillStyle = imp.foe || '#e8473f'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke(); ctx.restore();
      }
      // five rainbow shockwave rings
      for (let i = 0; i < 5; i++) {
        const kk = ease((T - HIT - i * 0.06) / 0.6); if (kk <= 0 || kk >= 1) continue;
        ctx.beginPath(); ctx.arc(cx, cy, U * (0.1 + 0.75 * kk), 0, TAU); ctx.strokeStyle = RAINBOW[i]; ctx.lineWidth = U * 0.03 * (1 - kk) + 2; ctx.globalAlpha = (1 - fade) * (1 - kk); ctx.stroke();
      }
      ctx.globalAlpha = 1 - fade;
      // BALL, huge, at the centre
      const bk = back((T - HIT) / 0.35), br = U * 0.16 * bk;
      if (ballImg.complete && br > 0) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(T * 3) * 0.06); ctx.drawImage(ballImg, -br * 1.5, -br * 1.5, br * 3, br * 3); ctx.restore(); }
      // "BALL!!" stamped letter by letter
      const txt = 'BALL!!', fs = U * 0.16, y = cy + U * 0.33;
      ctx.font = `${fs}px Anton, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const ws = [...txt].map((ch) => ctx.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0) + fs * 0.06 * (txt.length - 1);
      let x = cx - tw / 2;
      [...txt].forEach((ch, i) => {
        const kk = back((T - HIT - 0.25 - i * 0.07) / 0.22);
        if (kk > 0) {
          ctx.save(); ctx.translate(x + ws[i] / 2, y); ctx.scale(kk, kk); ctx.rotate((i % 2 ? 1 : -1) * 0.06);
          ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#111'; ctx.strokeText(ch, 0, fs * 0.05);
          ctx.fillStyle = RAINBOW[i % 5]; ctx.fillText(ch, 0, 0); ctx.restore();
        }
        x += ws[i] + fs * 0.06;
      });
      // halftone dots in the corners for the comic-book frame
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let gx = 0; gx < W; gx += U * 0.04) for (let gy = 0; gy < H; gy += U * 0.04) { const dd = Math.hypot(gx - cx, gy - cy) / (U * 0.7); if (dd > 0.85) { ctx.beginPath(); ctx.arc(gx, gy, U * 0.008 * Math.min(1.6, dd), 0, TAU); ctx.fill(); } }
    }
    ctx.restore();
  }
  BB.ballFinisher = ballFinisher;
  const baseImpact = BB.impactFrame;
  BB.impactFrame = function (R, imp, scale, sx, sy) {
    if (imp.ballFin) return ballFinisher(R, imp);
    return baseImpact(R, imp, scale, sx, sy);
  };

  // in battle: a slowly turning rainbow rim on BALL; its summons wear a thin rainbow halo
  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    // the supernova sits under the ball (drawn from where it went off, even if Nova has moved since)
    if (b.def.id === 'nova' && b.w.nova > 0) drawNova(ctx, sim, b.w);
    baseBall(ctx, sim, b, lw, R);
    if (b.def.id === 'nova' && b.alive) {
      // the core brightens as it charges; the supernova flashes a white shell
      const w = b.w, k = Math.min(1, (w.charge || 0) / 30), pulse = 0.5 + 0.5 * Math.sin(sim.t * (4 + k * 8));
      ctx.save();
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 0.55);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.55 + 0.4 * k * pulse) + ')'); g.addColorStop(1, 'rgba(255,241,184,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
      const t = 1 - Math.max(0, w.timer) / 6;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, -Math.PI / 2, -Math.PI / 2 + t * TAU); ctx.strokeStyle = 'rgba(255,179,71,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }
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
