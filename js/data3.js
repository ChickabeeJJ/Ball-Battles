// Expansion: 4 weapons + 4 special balls, each with its own ability. Loaded after abilities.js.
// Items are appended (never reordered) because PvP short codes store items by index.
(function () {
  const BB = window.BB;
  const fmt = BB.fmt, TAU = Math.PI * 2;
  function add(o) {
    o.base = Object.assign({ damage: 1, spin: 0, len: 0, width: 6, gap: 2 }, o.base || {});
    o.price = o.price != null ? o.price : BB.RARITY[o.rarity].price;
    BB.ITEMS.push(o); BB.ITEM[o.id] = o;
  }

  // ---------------------------------------------------------------- weapons
  add({
    id: 'glaive', name: 'Glaive', cat: 'weapon', rarity: 'rare', color: '#2e86de',
    desc: 'A long sweeping polearm. Every 4th hit is a heavy sweep for triple damage. +0.5 damage every hit.',
    base: { damage: 1.5, spin: 150, len: 70, width: 9 }, melee: true, blocks: true,
    damageFn(sim, b, w) { const heavy = (w.hits + 1) % 4 === 0; return [heavy ? w.damage * 3 : w.damage, heavy]; },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Sweep in: ' + (4 - (w.hits % 4))],
  });
  add({
    id: 'cleaver', name: 'Cleaver', cat: 'weapon', rarity: 'common', color: '#c0392b',
    desc: 'Heavy chops that make enemies bleed for 3 seconds. Bleeding gets worse every hit.',
    base: { damage: 2.5, spin: 110, len: 42, width: 16 }, melee: true, blocks: true,
    init(w) { w.bleed = 0.5; },
    update(sim, b, w, dt) {
      for (const e of sim.balls) {
        if (!e.alive || e.bleedBy !== b.id || !(e.bleedT > 0)) continue;
        e.bleedT -= dt; e.bleedTick = (e.bleedTick || 0.5) - dt;
        if (e.bleedTick <= 0) {
          e.bleedTick = 0.5; sim.damage(e, w.bleed, b, { dot: true, color: '#c0392b' });
          sim.fx.push({ k: 'p', x: e.x, y: e.y + e.r * 0.5, vx: (sim.frng() - 0.5) * 40, vy: 60, life: 0.4, max: 0.4, c: '#c0392b', s: 3 });
        }
      }
    },
    onHit(sim, b, w, t) {
      w.bleed = Math.min(w.bleed + 0.25, 3);
      if (t && t.alive) { const fresh = !(t.bleedT > 0); t.bleedBy = b.id; t.bleedT = 3; if (fresh) sim.fxTag(t.x, t.y + t.r + 18, 'BLEEDING', '#ff6b6b'); }
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Bleed: ' + fmt(w.bleed) + '/0.5s'],
  });
  add({
    id: 'fan', name: 'War Fan', cat: 'weapon', rarity: 'epic', color: '#16a085',
    desc: 'Every hit blows the enemy away. Every 3rd hit also throws a wind blade. +0.5 damage every hit.',
    base: { damage: 1.5, spin: 190, len: 34, width: 26 }, melee: true, blocks: true, knock: 340,
    onHit(sim, b, w, t) {
      w.damage += 0.5;
      if (w.hits % 3 === 0 && t) {
        const a = Math.atan2(t.y - b.y, t.x - b.x);
        sim.spawnProj({ owner: b, kind: 'wind', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, angle: a, r: 12 * b.scale, dmg: w.damage, life: 1.2, pierce: true, knock: 260 });
        sim.emit({ type: 'shoot', x: b.x, y: b.y });
      }
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Blade in: ' + (3 - (w.hits % 3))],
  });
  add({
    id: 'nunchaku', name: 'Nunchaku', cat: 'weapon', rarity: 'rare', color: '#8e5a2b',
    desc: 'Lightning-fast double strikes (can hit again almost instantly). Spins faster and +0.25 damage every hit.',
    base: { damage: 1, spin: 320, len: 46, width: 8 }, melee: true, blocks: true, hitCd: 0.12,
    onHit(sim, b, w) { w.spin = Math.min(w.spin + 50, 1800); w.damage += 0.25; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Spin Speed: ' + Math.round(w.spin)],
  });

  // ---------------------------------------------------------------- special balls
  add({
    id: 'frost', name: 'Frostbite', cat: 'special', rarity: 'rare', color: '#74b9ff',
    desc: 'A freezing aura slows every enemy close to it. Slams for 1.5, +0.5 every hit.',
    base: { damage: 1.5 }, contact: true,
    update(sim, b) {
      const R = b.r * 4;
      for (const e of sim.balls) if (e.alive && e.team !== b.team && (e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (R + e.r) ** 2) e.slowT = Math.max(e.slowT, 0.25);
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'shocker', name: 'Shocker', cat: 'special', rarity: 'epic', color: '#f1c40f',
    desc: 'Every 2.5 seconds it zaps the nearest enemy in range with lightning. Every hit makes zaps stronger.',
    base: { damage: 1 }, contact: true,
    init(w) { w.timer = 1.5; w.zap = 1.5; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (300 * b.scale) ** 2) { w.timer = 0.3; return; }
      w.timer = 2.5;
      sim.fx.push({ k: 'z', x: b.x, y: b.y, x2: e.x, y2: e.y, life: 0.25, max: 0.25 });
      const d = sim.damage(e, w.zap, b, { x: e.x, y: e.y });
      sim.emit({ type: 'shoot', x: b.x, y: b.y, small: true });
      if (d) sim.onHit(b, e, d);
    },
    onHit(sim, b, w) { w.zap += 0.25; },
    stats: (w) => ['Zap: ' + fmt(w.zap)],
  });
  add({
    id: 'blinker', name: 'Blinker', cat: 'special', rarity: 'epic', color: '#9b59b6',
    desc: 'Every 3 seconds it teleports right behind the nearest enemy; slams within a moment of a blink deal double. +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 2; w.blink = 0; },
    update(sim, b, w, dt) {
      w.timer -= dt; if (w.blink > 0) w.blink -= dt;
      if (w.timer > 0) return;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e) return;
      w.timer = 3; w.blink = 0.7;
      sim.ring(b.x, b.y, b.r, b.r * 2.4, '#9b59b6', 0.3);
      const sp = Math.hypot(e.vx, e.vy) || 1, d = e.r + b.r + 4, lim = sim.W / 2 - b.r;
      b.x = Math.max(-lim, Math.min(lim, e.x - (e.vx / sp) * d)); b.y = Math.max(-lim, Math.min(lim, e.y - (e.vy / sp) * d));
      const a = Math.atan2(e.y - b.y, e.x - b.x); b.vx = Math.cos(a) * b.speed; b.vy = Math.sin(a) * b.speed;
      sim.ring(b.x, b.y, b.r * 2.4, b.r, '#d6a8ff', 0.3);
      sim.fxTag(b.x, b.y - b.r - 22, 'BLINK', '#d6a8ff');
    },
    contactDamage: (w) => (w.blink > 0 ? w.damage * 2 : w.damage),
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'pinball', name: 'Pinball', cat: 'special', rarity: 'common', color: '#e84393',
    desc: 'Every wall bounce charges it up: faster and harder slams (up to 8 charges). A hit spends the charge.',
    base: { damage: 1 }, contact: true,
    init(w) { w.charge = 0; },
    onWall(sim, b, w) { w.charge = Math.min(8, w.charge + 1); b.speedMul = 1 + w.charge * 0.12; },
    contactDamage: (w) => 1 + w.charge * 0.75,
    onHit(sim, b, w) { w.charge = 0; b.speedMul = 1; },
    stats: (w) => ['Charge: ' + w.charge + '/8', 'Slam: ' + fmt(1 + w.charge * 0.75)],
  });

  if (typeof document === 'undefined') return;
  const OUT = '#1d1d22';

  // weapon art
  const baseWeapon = BB.drawWeapon;
  BB.drawWeapon = function (ctx, id, s, L, W, lw, t, team) {
    const fs = (fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke(); };
    ctx.save(); ctx.lineJoin = 'round';
    if (id === 'glaive') {
      ctx.beginPath(); ctx.rect(s, -W * 0.22, L * 0.7, W * 0.44); fs('#8a5a2b');
      ctx.beginPath(); ctx.moveTo(s + L * 0.62, -W * 0.3); ctx.quadraticCurveTo(s + L * 0.95, -W * 1.4, s + L * 1.02, 0); ctx.lineTo(s + L * 0.62, W * 0.35); ctx.closePath(); fs('#dfe6ec');
      ctx.beginPath(); ctx.moveTo(s + L * 0.7, -W * 0.2); ctx.quadraticCurveTo(s + L * 0.9, -W * 0.9, s + L * 0.97, -W * 0.05); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
      ctx.beginPath(); ctx.rect(s + L * 0.58, -W * 0.45, W * 0.35, W * 0.9); fs('#2e86de');
    } else if (id === 'cleaver') {
      ctx.beginPath(); ctx.rect(s, -W * 0.15, L * 0.35, W * 0.3); fs('#5b3a1e');
      ctx.beginPath(); ctx.moveTo(s + L * 0.32, -W * 0.25); ctx.lineTo(s + L, -W * 0.45); ctx.lineTo(s + L, W * 0.55); ctx.lineTo(s + L * 0.32, W * 0.55); ctx.closePath(); fs('#cfd6dc');
      ctx.beginPath(); ctx.moveTo(s + L * 0.34, W * 0.5); ctx.lineTo(s + L * 0.98, W * 0.5); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = lw * 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(s + L * 0.85, -W * 0.15, W * 0.1, 0, TAU); ctx.fillStyle = OUT; ctx.fill();
    } else if (id === 'fan') {
      const cxp = s + L * 0.1;
      ctx.beginPath(); ctx.moveTo(cxp, 0); ctx.arc(cxp, 0, L, -0.75, 0.75); ctx.closePath(); fs('#f4ede1');
      for (let i = -3; i <= 3; i++) { const a = i * 0.21; ctx.beginPath(); ctx.moveTo(cxp, 0); ctx.lineTo(cxp + Math.cos(a) * L, Math.sin(a) * L); ctx.strokeStyle = '#16a085'; ctx.lineWidth = lw * 0.7; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cxp, 0, L, -0.75, 0.75); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = lw * 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(cxp, 0, W * 0.15, 0, TAU); fs('#f6c431');
    } else if (id === 'nunchaku') {
      const a = Math.sin(t * 10) * 0.35;
      ctx.beginPath(); ctx.rect(s, -W * 0.3, L * 0.42, W * 0.6); fs('#8e5a2b');
      const jx = s + L * 0.46, ex = jx + Math.cos(a) * L * 0.08, ey = Math.sin(a) * L * 0.08;
      ctx.beginPath(); ctx.moveTo(s + L * 0.42, 0); ctx.lineTo(ex, ey); ctx.strokeStyle = '#7b858f'; ctx.lineWidth = lw; ctx.stroke();
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.beginPath(); ctx.rect(0, -W * 0.3, L * 0.46, W * 0.6); fs('#8e5a2b'); ctx.restore();
    } else { ctx.restore(); return baseWeapon(ctx, id, s, L, W, lw, t, team); }
    ctx.restore();
  };

  // menu icon emblems for the new special balls
  const baseIcon = BB.drawIcon;
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    baseIcon(ctx, id, x, y, size, opts);
    const em = { frost: 1, shocker: 1, blinker: 1, pinball: 1 };
    if (!em[id]) return;
    const r = size * 0.33;
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.13;
    if (id === 'frost') for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * r * 0.6, -Math.sin(a) * r * 0.6); ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); ctx.stroke(); }
    if (id === 'shocker') { ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.65); ctx.lineTo(-r * 0.3, r * 0.08); ctx.lineTo(r * 0.08, r * 0.08); ctx.lineTo(-r * 0.15, r * 0.65); ctx.lineTo(r * 0.35, -r * 0.12); ctx.lineTo(-r * 0.02, -r * 0.12); ctx.closePath(); ctx.fill(); }
    if (id === 'blinker') { ctx.beginPath(); ctx.ellipse(0, 0, r * 0.6, r * 0.32, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TAU); ctx.fill(); }
    if (id === 'pinball') { ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(-r * 0.12, -r * 0.14, r * 0.12, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  // wind blade projectile
  const baseProj = BB.drawProjArt;
  BB.drawProjArt = function (ctx, p, lw) {
    if (p.kind !== 'wind') return baseProj ? baseProj(ctx, p, lw) : false;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.beginPath(); ctx.arc(0, 0, p.r * 1.6, -1.1, 1.1); ctx.arc(-p.r * 0.6, 0, p.r * 1.3, 1.0, -1.0, true); ctx.closePath();
    ctx.fillStyle = 'rgba(190,255,235,0.85)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#16a085'; ctx.stroke();
    ctx.restore();
    return true;
  };
})();
