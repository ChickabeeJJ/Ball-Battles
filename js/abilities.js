// Signature abilities for the plain slamming balls (loaded after data2.js; also used by tools/).
(function () {
  const BB = window.BB;
  const fmt = BB.fmt, TAU = Math.PI * 2;
  const I = BB.ITEM;
  const byId = (sim, id) => sim.balls.find((e) => e.id === id);
  const nearestFoe = (sim, b) => sim.nearestEnemy(b.team, b.x, b.y);

  // ------------------------------------------------------------- Vampire: latch + drain
  Object.assign(I.vampire, {
    desc: 'Bites an enemy and latches on for 1.5s, draining 1 HP every 0.25s and healing all of it (5s cooldown). Slams heal too. +0.5 damage every hit.',
    init(w) { w.latch = null; w.lcd = 1; },
    update(sim, b, w, dt) {
      w.lcd -= dt;
      const L = w.latch;
      if (!L) return;
      const t = byId(sim, L.id);
      L.t -= dt;
      if (!t || !t.alive || L.t <= 0) { w.latch = null; w.lcd = 5; return; }
      // ride on the victim's surface
      const d = t.r + b.r * 0.8;
      b.x = t.x + Math.cos(L.a) * d; b.y = t.y + Math.sin(L.a) * d; b.vx = t.vx; b.vy = t.vy;
      L.tick -= dt;
      if (L.tick <= 0) {
        L.tick = 0.25;
        const got = sim.damage(t, 1, b, { dot: true, color: '#b3122e' });
        if (got) {
          sim.heal(b, got);
          for (let k = 0; k < 4; k++) sim.fx.push({ k: 'p', x: t.x, y: t.y, vx: (b.x - t.x) * 3 + (sim.frng() - 0.5) * 60, vy: (b.y - t.y) * 3 + (sim.frng() - 0.5) * 60, life: 0.3, max: 0.3, c: '#d0102e', s: 3 });
        }
      }
    },
    onHit(sim, b, w, t, dealt) {
      sim.heal(b, dealt); w.damage += 0.5;
      if (t && t.alive && t.main !== undefined && !w.latch && w.lcd <= 0) {
        w.latch = { id: t.id, t: 1.5, tick: 0.1, a: Math.atan2(b.y - t.y, b.x - t.x) };
        sim.fxTag(t.x, t.y + t.r + 18, 'LATCHED', '#ff4d6d');
      }
    },
    // no extra slams while latched: the bite is the damage
    contactDamage: (w) => (w.latch ? 0 : w.damage),
    stats: (w) => ['Damage: ' + fmt(w.damage), w.latch ? 'Draining!' : 'Bite: ' + (w.lcd > 0 ? Math.ceil(w.lcd) + 's' : 'ready')],
  });

  // ------------------------------------------------------------- Tank: ground pound
  const tankInit = I.tank.init;
  Object.assign(I.tank, {
    desc: '60% more health but slower. Every 4s it ground-pounds, hitting and shoving every enemy nearby. Slams for 2, +0.5 every hit.',
    init(w, b, sim) { tankInit(w, b, sim); w.pound = 2.5; },
    update(sim, b, w, dt) {
      w.pound -= dt;
      if (w.pound > 0) return;
      w.pound = 4;
      const R = b.r * 3.4;
      sim.ring(b.x, b.y, b.r, R, '#8fa35a', 0.45); sim.ring(b.x, b.y, b.r, R * 0.7, '#ffffff', 0.3);
      sim.burst(b.x, b.y, 16, ['#c9b88f', '#8a6a45', '#ffffff'], 300, 4);
      sim.emit({ type: 'boom', x: b.x, y: b.y, small: true });
      let hit = false;
      for (const e of sim.balls) {
        if (!e.alive || e.team === b.team || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (R + e.r) ** 2) continue;
        sim.damage(e, w.damage, b, { x: e.x, y: e.y, lag: true });
        if (e._dg) continue;
        sim.knock(e, b.x, b.y, 460); sim.launch(e, e.x, e.y); hit = true;
      }
      if (hit) sim.fxTag(b.x, b.y - b.r - 24, 'GROUND POUND', '#c9e17a');
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Pound: ' + Math.max(0, Math.ceil(w.pound)) + 's'],
  });

  // ------------------------------------------------------------- Speedy: homing dash
  Object.assign(I.speedy, {
    desc: 'Every 2s it dashes at the nearest enemy; dash slams deal double. Gets 15% faster and hits a bit harder every hit.',
    init(w) { w.dashCd = 1.2; w.dash = 0; },
    update(sim, b, w, dt) {
      w.dashCd -= dt; if (w.dash > 0) w.dash -= dt;
      if (w.dashCd > 0) return;
      const e = nearestFoe(sim, b);
      if (!e) return;
      w.dashCd = 2; w.dash = 0.45;
      const a = Math.atan2(e.y - b.y, e.x - b.x), s = b.speed * b.speedMul * 2.4;
      b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; b.flyT = 0.45;
      sim.emit({ type: 'shoot', x: b.x, y: b.y, small: true });
    },
    contactDamage: (w) => (w.dash > 0 ? w.damage * 2 : w.damage),
    stats: (w, b) => ['Damage: ' + fmt(w.damage), 'Speed: ' + Math.round(b.speedMul * 100) + '%'],
  });

  // ------------------------------------------------------------- Spiky: spike volley
  Object.assign(I.spiky, {
    desc: 'Covered in spikes for 2 slam damage. Every 3s it fires its spikes in all directions. +0.5 damage every hit.',
    init(w) { w.volley = 2; },
    update(sim, b, w, dt) {
      w.volley -= dt;
      if (w.volley > 0) return;
      w.volley = 3;
      const n = 8, a0 = sim.t * 0.8;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i * TAU) / n;
        sim.spawnProj({ owner: b, kind: 'arrow', x: b.x + Math.cos(a) * (b.r + 6), y: b.y + Math.sin(a) * (b.r + 6), vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, angle: a, r: 4 * b.scale, dmg: Math.max(1, w.damage * 0.5), life: 0.9 });
      }
      sim.emit({ type: 'shoot', x: b.x, y: b.y });
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Spikes: ' + fmt(Math.max(1, w.damage * 0.5))],
  });

  // ------------------------------------------------------------- Tiny: nimble dodge
  Object.assign(I.tiny, {
    desc: 'Small and super fast. 30% of attacks miss it completely. +0.5 slam damage every hit.',
    dodge(sim, b, amt, src, info) {
      if (info && info.dot) return false;
      if (sim.rng() >= 0.3) return false;
      sim.fxNum(b.x, b.y - b.r - 4, 'MISS', '#fd79a8');
      return true;
    },
  });

  // ------------------------------------------------------------- Jelly / Snowball: slowing slams
  Object.assign(I.jelly, {
    desc: 'Sticky slams slow enemies for 1.2s. Splits into two jellylets when knocked out. +0.5 slam damage every hit.',
    onHit(sim, b, w, t) { w.damage += 0.5; if (t && t.alive) t.slowT = Math.max(t.slowT, 1.2); },
  });
  Object.assign(I.snowball, {
    desc: 'Keeps growing as it rolls; bigger means harder slams. Its icy slams freeze enemies for 1s.',
    onHit(sim, b, w, t) { if (t && t.alive) t.slowT = Math.max(t.slowT, 1); },
  });

  if (typeof document === 'undefined') return;

  // vampire latch visual: fangs biting in + a pulsing blood ring on the victim
  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    baseBall(ctx, sim, b, lw, R);
    if (b.def.id !== 'vampire' || !b.w.latch) return;
    const t = byId(sim, b.w.latch.id);
    if (!t || !t.alive) return;
    const p = 0.5 + 0.5 * Math.sin(sim.t * 18);
    ctx.save();
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 4 + p * 3, 0, TAU); ctx.strokeStyle = 'rgba(208,16,46,' + (0.5 + 0.4 * p) + ')'; ctx.lineWidth = 4; ctx.stroke();
    const a = Math.atan2(b.y - t.y, b.x - t.x);
    ctx.translate(t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r); ctx.rotate(a + Math.PI / 2);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7, -2); ctx.lineTo(s * 4, 10); ctx.lineTo(s * 1, -2); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1d1d22'; ctx.stroke(); }
    ctx.restore();
  };
})();
