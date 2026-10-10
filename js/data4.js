// Expansion 2: 12 weapons + 12 special balls (the roster reaches 100). Loaded after data3.js.
// Items are appended (never reordered) because PvP short codes store items by index.
// Gameplay randomness uses sim.rng() (deterministic, PvP-safe); visuals use sim.frng().
(function () {
  const BB = window.BB;
  const fmt = BB.fmt, TAU = Math.PI * 2;
  function add(o) {
    o.base = Object.assign({ damage: 1, spin: 0, len: 0, width: 6, gap: 2 }, o.base || {});
    o.price = o.price != null ? o.price : BB.RARITY[o.rarity].price;
    BB.ITEMS.push(o); BB.ITEM[o.id] = o;
  }
  const dmgStat = (w) => ['Damage: ' + fmt(w.damage)];
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

  // ================================================================ weapons
  add({
    id: 'yoyo', name: 'Yo-Yo', cat: 'weapon', rarity: 'rare', color: '#ff6b81',
    desc: 'The string reels out and back in. Hits at full reach deal +60%. +0.4 damage every hit.',
    base: { damage: 1.5, spin: 170, len: 30, width: 15 }, melee: true, blocks: true,
    init(w) { w.len0 = w.len; w.reel = 0; },
    update(sim, b, w, dt) { w.reel += dt * 2.6; w.len = w.len0 * (1 + 1.5 * (0.5 - 0.5 * Math.cos(w.reel))); },
    damageFn(sim, b, w) { const far = w.len > w.len0 * 2.1; return [far ? w.damage * 1.6 : w.damage, far]; },
    onHit(sim, b, w) { w.damage += 0.4; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Reach: ' + Math.round((w.len / w.len0) * 100) + '%'],
  });
  add({
    id: 'drill', name: 'Drill', cat: 'weapon', rarity: 'epic', color: '#95a5a6',
    desc: 'Hits in quick succession drill deeper: each one within 0.6s adds +25% damage (up to triple). +0.25 every hit.',
    base: { damage: 1.5, spin: 240, len: 44, width: 13 }, melee: true, blocks: true, hitCd: 0.15,
    init(w) { w.combo = 1; w.lastHit = -9; },
    damageFn(sim, b, w) { w.combo = sim.t - w.lastHit < 0.6 ? Math.min(3, w.combo + 0.25) : 1; w.lastHit = sim.t; return [w.damage * w.combo, w.combo >= 2]; },
    onHit(sim, b, w, t) { w.damage += 0.25; if (w.combo >= 2 && t && sim.frng() < 0.5) sim.burst(t.x, t.y, 5, ['#dfe6e9', '#ffd23f'], 260, 2); },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Drill: x' + w.combo.toFixed(2)],
  });
  add({
    id: 'harpoon', name: 'Harpoon', cat: 'weapon', rarity: 'legendary', color: '#1e6fa8',
    desc: 'Every 3s it fires a harpoon that hooks the enemy and reels it in, stunned. +0.6 damage every hit.',
    base: { damage: 2, spin: 130, len: 40, width: 8 }, melee: true, blocks: true,
    init(w) { w.timer = 1.6; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e) return;
      w.timer = 3;
      const a = Math.atan2(e.y - b.y, e.x - b.x);
      sim.spawnProj({ owner: b, kind: 'harpoon', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, angle: a, r: 6 * b.scale, dmg: w.damage * 1.2, life: 1.4, knock: 0, homing: 1.6, // a little homing
        onHit(s, p, t) {
          if (!t.alive || !p.owner.alive) return;
          const dx = p.owner.x - t.x, dy = p.owner.y - t.y, d = Math.hypot(dx, dy) || 1;
          t.vx = (dx / d) * 760; t.vy = (dy / d) * 760; t.flyT = 0.35; t.stunT = Math.max(t.stunT, 0.3);
          s.fxTag(t.x, t.y + t.r + 18, 'HOOKED', '#7fd3ff');
        } });
      sim.emit({ type: 'shoot', x: b.x, y: b.y });
    },
    onHit(sim, b, w) { w.damage += 0.6; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Harpoon: ' + Math.max(0, Math.ceil(w.timer)) + 's'],
  });
  add({
    id: 'kusarigama', name: 'Kusarigama', cat: 'weapon', rarity: 'epic', color: '#16a085',
    desc: 'A sickle on a chain. Every hit lets out more chain (up to more than double the reach). +0.3 damage every hit.',
    base: { damage: 1.5, spin: 180, len: 36, width: 10 }, melee: true, blocks: true,
    init(w) { w.len0 = w.len; },
    onHit(sim, b, w) { w.len = Math.min(w.len0 * 2.3, w.len + 4.5 * w.scale); w.damage += 0.3; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Chain: ' + Math.round((w.len / w.len0) * 100) + '%'],
  });
  add({
    id: 'tuningfork', name: 'Tuning Fork', cat: 'weapon', rarity: 'rare', color: '#b2bec3',
    desc: 'Every hit rings out a shockwave that also hits other enemies nearby for half. Rings faster and +0.5 damage every hit.',
    base: { damage: 1.5, spin: 170, len: 42, width: 12 }, melee: true, blocks: true,
    onHit(sim, b, w, t) {
      w.damage += 0.5; w.spin = Math.min(w.spin + 15, 900);
      if (!t) return;
      const R = 95 * w.scale;
      sim.ring(t.x, t.y, t.r, R, '#dfe6e9', 0.3); sim.ring(t.x, t.y, t.r, R * 0.7, '#74b9ff', 0.25);
      for (const e of sim.balls) if (e !== t && e.alive && e.team !== b.team && dist2(e, t) < (R + e.r) ** 2) { sim.damage(e, w.damage * 0.5, b, { x: e.x, y: e.y }); sim.knock(e, t.x, t.y, 200); }
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Spin Speed: ' + Math.round(w.spin)],
  });
  add({
    id: 'plasma', name: 'Plasma Blade', cat: 'weapon', rarity: 'legendary', color: '#00e5ff',
    desc: 'A humming energy blade that sets enemies on fire. The blade grows longer and +0.5 damage every hit.',
    base: { damage: 2, spin: 200, len: 60, width: 9 }, melee: true, blocks: true,
    init(w) { w.len0 = w.len; },
    onHit(sim, b, w, t) {
      w.damage += 0.5; w.len = Math.min(w.len0 * 1.8, w.len + 3 * w.scale);
      if (t && t.alive) { t.burnLvl = Math.max(t.burnLvl, 1); t.burnT = Math.max(t.burnT, 2); }
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Blade: ' + Math.round((w.len / w.len0) * 100) + '%'],
  });
  add({
    id: 'laser', name: 'Laser Pointer', cat: 'weapon', rarity: 'rare', color: '#e84118',
    desc: 'Every 2.6s it fires an instant laser beam at the nearest enemy. Every hit makes the beam stronger.',
    base: { damage: 1, spin: 160, len: 30, width: 9 }, melee: true, blocks: true,
    init(w) { w.timer = 1.4; w.beam = 1.2; w.fx = null; },
    update(sim, b, w, dt) {
      if (w.fx) { w.fx.t -= dt; if (w.fx.t <= 0) w.fx = null; }
      w.timer -= dt;
      if (w.timer > 0) return;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e) return;
      w.timer = 2.6;
      const tip = b.r + w.gap + w.len, ta = Math.atan2(e.y - b.y, e.x - b.x);
      w.fx = { x: b.x + Math.cos(ta) * tip, y: b.y + Math.sin(ta) * tip, x2: e.x, y2: e.y, t: 0.22 };
      const d = sim.damage(e, w.beam, b, { x: e.x, y: e.y });
      sim.burst(e.x, e.y, 6, ['#ff7675', '#ffffff'], 200, 2);
      sim.emit({ type: 'shoot', x: b.x, y: b.y, small: true });
      if (d || e._dg) sim.onHit(b, e, d);
    },
    onHit(sim, b, w) { w.beam += 0.3; },
    stats: (w) => ['Beam: ' + fmt(w.beam)],
  });
  add({
    id: 'chakram', name: 'Chakram', cat: 'weapon', rarity: 'epic', color: '#f39c12',
    desc: 'Every 3s it throws a spinning ring blade that pierces and bounces off walls twice. +0.5 damage every hit.',
    base: { damage: 1.5, spin: 190, len: 30, width: 20 }, melee: true, blocks: true,
    init(w) { w.timer = 1.4; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e) return;
      w.timer = 3.2;
      const a = Math.atan2(e.y - b.y, e.x - b.x);
      sim.spawnProj({ owner: b, kind: 'chakram', x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, angle: a, r: 10 * b.scale, dmg: w.damage, life: 2.2, pierce: true, bounces: 2, knock: 160 });
      sim.emit({ type: 'shoot', x: b.x, y: b.y });
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Throw: ' + Math.max(0, Math.ceil(w.timer)) + 's'],
  });
  add({
    id: 'scissors', name: 'Scissors', cat: 'weapon', rarity: 'common', color: '#e17055',
    desc: 'Every hit snips 8% off the enemy weapon\'s damage. +0.25 damage every hit.',
    base: { damage: 1.5, spin: 190, len: 40, width: 11 }, melee: true, blocks: true,
    onHit(sim, b, w, t) {
      w.damage += 0.25;
      if (t && t.alive && t.w && t.w.damage > 0.5) { t.w.damage = Math.max(0.5, t.w.damage * 0.92); if (!(w.snipTag > sim.t)) { w.snipTag = sim.t + 1.5; sim.fxTag(t.x, t.y + t.r + 18, 'SNIPPED', '#fab1a0'); } }
    },
    stats: dmgStat,
  });
  add({
    id: 'pillow', name: 'Pillow', cat: 'weapon', rarity: 'common', color: '#dfe6e9',
    desc: 'Soft hits with a huge knockback. Every hit heals it for 2.5. +0.35 damage every hit.',
    base: { damage: 1.25, spin: 160, len: 34, width: 24 }, melee: true, blocks: true, knock: 430,
    onHit(sim, b, w, t) {
      w.damage += 0.35; sim.heal(b, 2.5);
      if (t) for (let i = 0; i < 6; i++) sim.fx.push({ k: 'p', x: t.x, y: t.y, vx: (sim.frng() - 0.5) * 220, vy: -60 - sim.frng() * 120, life: 0.8, max: 0.8, c: '#ffffff', s: 4 });
    },
    stats: dmgStat,
  });
  add({
    id: 'bat', name: 'Baseball Bat', cat: 'weapon', rarity: 'common', color: '#c8a165',
    desc: 'Every 5th hit is a HOME RUN: triple damage and the enemy goes flying. +0.5 damage every hit.',
    base: { damage: 1.5, spin: 170, len: 48, width: 13 }, melee: true, blocks: true,
    damageFn(sim, b, w) { const hr = (w.hits + 1) % 5 === 0; return [hr ? w.damage * 3 : w.damage, hr]; },
    onHit(sim, b, w, t) {
      w.damage += 0.5;
      if (w.hits % 5 === 0 && t && t.alive) { sim.knock(t, b.x, b.y, 760); sim.launch(t, b.x, b.y); sim.fxTag(t.x, t.y - t.r - 24, 'HOME RUN!', '#ffd23f'); sim.emit({ type: 'boom', x: t.x, y: t.y, small: true }); }
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Home run in: ' + (5 - (w.hits % 5))],
  });
  add({
    id: 'stormhammer', name: 'Storm Hammer', cat: 'weapon', rarity: 'legendary', color: '#6c5ce7',
    desc: 'Every hit calls down lightning on the enemy for +60% damage, which chains to another enemy nearby. +0.5 damage every hit.',
    base: { damage: 2, spin: 140, len: 44, width: 16 }, melee: true, blocks: true,
    onHit(sim, b, w, t) {
      w.damage += 0.5;
      if (!t || !t.alive) return;
      sim.fx.push({ k: 'z', x: t.x + (sim.frng() - 0.5) * 60, y: t.y - 320, x2: t.x, y2: t.y, life: 0.25, max: 0.25 });
      sim.damage(t, w.damage * 0.6, b, { x: t.x, y: t.y });
      let best = null, bd = (220 * w.scale) ** 2;
      for (const e of sim.balls) { if (e === t || !e.alive || e.team === b.team) continue; const d = dist2(e, t); if (d < bd) { bd = d; best = e; } }
      if (best) { sim.fx.push({ k: 'z', x: t.x, y: t.y, x2: best.x, y2: best.y, life: 0.25, max: 0.25 }); sim.damage(best, w.damage * 0.4, b, { x: best.x, y: best.y }); }
      sim.emit({ type: 'boom', x: t.x, y: t.y, small: true });
    },
    stats: dmgStat,
  });

  // ================================================================ special balls
  add({
    id: 'magma', name: 'Magma', cat: 'special', rarity: 'rare', color: '#e55039',
    desc: 'Leaves a trail of lava. Enemies that roll through it burn. Slams for 1.5, +0.5 every hit.',
    base: { damage: 1.5 }, contact: true,
    init(w) { w.pools = []; w.drop = 0; },
    update(sim, b, w, dt) {
      w.drop -= dt;
      if (w.drop <= 0) { w.drop = 0.3; w.pools.push({ x: b.x, y: b.y, t: 2.4, r: 17 * b.scale }); }
      for (const p of w.pools) p.t -= dt;
      if (w.pools.length && w.pools[0].t <= 0) w.pools = w.pools.filter((p) => p.t > 0);
      for (const e of sim.balls) {
        if (!e.alive || e.team === b.team || (e.cd['lava' + b.id] > 0)) continue;
        if (w.pools.some((p) => (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (p.r + e.r * 0.6) ** 2)) {
          e.cd['lava' + b.id] = 0.5; e.burnLvl = Math.max(e.burnLvl, 1); e.burnT = Math.max(e.burnT, 1.5);
          sim.damage(e, 0.5, b, { dot: true, color: '#ff7a1a' });
        }
      }
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: dmgStat,
  });
  add({
    id: 'meteor', name: 'Meteor', cat: 'special', rarity: 'legendary', color: '#e1b12c',
    desc: 'Every 3.5s it marks where the nearest enemy is heading, then a meteor crashes there. Slams deal no damage but call down a meteor on the target. Every hit makes meteors hit harder.',
    base: { damage: 1.5 }, contact: true,
    contactDamage: () => 0,
    onSlam(sim, b, w, c) {
      const lim = sim.W / 2 - 20;
      w.marks.push({ x: BB.clamp(c.x + c.vx * 0.35, -lim, lim), y: BB.clamp(c.y + c.vy * 0.35, -lim, lim), t: 0.6, max: 0.6, R: 115 * b.scale });
    },
    init(w) { w.timer = 2; w.marks = []; w.meteor = 4; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) {
        const e = sim.nearestEnemy(b.team, b.x, b.y);
        if (e) {
          w.timer = 3.5;
          const lim = sim.W / 2 - 20;
          w.marks.push({ x: BB.clamp(e.x + e.vx * 0.7, -lim, lim), y: BB.clamp(e.y + e.vy * 0.7, -lim, lim), t: 0.9, max: 0.9, R: 115 * b.scale });
        }
      }
      for (const m of w.marks) {
        m.t -= dt;
        if (m.t <= 0 && !m.done) { m.done = true; sim.explode(b, m.x, m.y, m.R, w.meteor); sim.burst(m.x, m.y, 22, ['#6d4c41', '#e1b12c', '#ffffff'], 420, 6); sim.ring(m.x, m.y, m.R * 0.3, m.R * 1.1, '#ffb347', 0.35); }
      }
      if (w.marks.length && w.marks[0].done) w.marks = w.marks.filter((m) => !m.done);
    },
    onHit(sim, b, w) { w.meteor += 1; },
    stats: (w) => ['Meteor: ' + fmt(w.meteor), 'Next: ' + Math.max(0, Math.ceil(w.timer)) + 's'],
  });
  add({
    id: 'chrono', name: 'Chrono', cat: 'special', rarity: 'epic', color: '#00cec9',
    desc: 'Every 5s it stops time: every enemy freezes for 0.9s. Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 3; w.stop = 0; },
    update(sim, b, w, dt) {
      w.timer -= dt; if (w.stop > 0) w.stop -= dt;
      if (w.timer > 0) return;
      w.timer = 5; w.stop = 0.9;
      for (const e of sim.balls) if (e.alive && e.team !== b.team) e.stunT = Math.max(e.stunT, 0.9);
      sim.ring(b.x, b.y, b.r, 420, '#81ecec', 0.5); sim.ring(b.x, b.y, b.r, 260, '#ffffff', 0.35);
      sim.fxTag(b.x, b.y - b.r - 24, 'TIME STOP', '#81ecec');
      sim.emit({ type: 'boom', x: b.x, y: b.y, small: true });
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Time stop: ' + Math.max(0, Math.ceil(w.timer)) + 's'],
  });
  add({
    id: 'balloon', name: 'Balloon', cat: 'special', rarity: 'rare', color: '#ff7675',
    desc: 'Every time it\'s hit it inflates: bigger, harder slams. At full size it POPS, blasting everything around it.',
    base: { damage: 1.5 }, contact: true,
    init(w, b) { w.inf = 0; w.r0 = b.r; },
    onDamaged(sim, b, amt) {
      const w = b.w;
      w.inf += 1; b.r = w.r0 * (1 + w.inf * 0.07);
      if (w.inf >= 9) {
        sim.explode(b, b.x, b.y, b.r * 3.2, 4 + w.damage);
        sim.fxTag(b.x, b.y - b.r - 24, 'POP!', '#ff7675');
        sim.burst(b.x, b.y, 20, ['#ff7675', '#ffffff', '#fab1a0'], 420, 4);
        w.inf = 0; b.r = w.r0;
      }
    },
    contactDamage: (w) => w.damage * (1 + w.inf * 0.15),
    onHit(sim, b, w) { w.damage += 0.4; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Air: ' + w.inf + '/9'],
  });
  add({
    id: 'disco', name: 'Disco', cat: 'special', rarity: 'epic', color: '#fd79a8',
    desc: 'Every 3s it fires a ring of light bolts in every direction. Every hit adds half a bolt to the ring.',
    base: { damage: 1.5 }, contact: true,
    init(w) { w.timer = 1.2; w.n = 8; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = 3;
      const n = Math.floor(w.n), off = sim.t * 1.3;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * TAU;
        sim.spawnProj({ owner: b, kind: 'disco', hue: i / n, x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, angle: a, r: 6 * b.scale, dmg: 1.8, life: 1.4, knock: 80, divine: true });
      }
      sim.emit({ type: 'shoot', x: b.x, y: b.y });
    },
    onHit(sim, b, w) { w.n = Math.min(16, w.n + 0.5); },
    stats: (w) => ['Bolts: ' + Math.floor(w.n)],
  });
  add({
    id: 'prism', name: 'Prism', cat: 'special', rarity: 'epic', color: '#a29bfe',
    desc: 'Every slam cycles its element: fire burns, ice slows, shock stuns. +0.5 every hit.',
    base: { damage: 1.75 }, contact: true,
    init(w) { w.el = 0; },
    onHit(sim, b, w, t) {
      w.damage += 0.5;
      if (t && t.alive) {
        if (w.el === 0) { t.burnLvl = Math.max(t.burnLvl, 1.5); t.burnT = Math.max(t.burnT, 2); }
        else if (w.el === 1) t.slowT = Math.max(t.slowT, 1.5);
        else t.stunT = Math.max(t.stunT, 0.4);
        sim.burst(t.x, t.y, 10, [['#ff7a1a', '#ffd23f'], ['#74b9ff', '#ffffff'], ['#ffeaa7', '#fdcb6e']][w.el], 260, 3);
      }
      w.el = (w.el + 1) % 3;
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Next: ' + ['Fire', 'Ice', 'Shock'][w.el]],
  });
  add({
    id: 'golem', name: 'Golem', cat: 'special', rarity: 'rare', color: '#7f8c8d',
    desc: 'A big, heavy rock ball. Every hit it takes adds stone armour (up to 35% less damage). Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w, b) { b.r *= 1.18; w.armor = 0; },
    reduce(sim, b, a, info) { if (info && info.dot) return a; const out = a * (1 - b.w.armor); b.w.armor = Math.min(0.35, b.w.armor + 0.02); return out; },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Armour: ' + Math.round(w.armor * 100) + '%'],
  });
  add({
    id: 'clover', name: 'Clover', cat: 'special', rarity: 'rare', color: '#2ecc71',
    desc: 'Lucky slams: a chance to crit for triple damage that grows with every hit (15% up to 60%).',
    base: { damage: 1.5 }, contact: true,
    init(w, b, sim) { w.luck = 0.15; w.sim = sim; },
    contactDamage(w) { const crit = w.sim.rng() < w.luck; w.lastCrit = crit; return crit ? w.damage * 3 : w.damage; },
    onHit(sim, b, w, t) {
      w.luck = Math.min(0.6, w.luck + 0.05); w.damage += 0.25;
      if (w.lastCrit && t) { sim.fxTag(t.x, t.y - t.r - 24, 'LUCKY!', '#55efc4'); sim.burst(t.x, t.y, 12, ['#2ecc71', '#ffd23f', '#ffffff'], 300, 3); }
    },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Luck: ' + Math.round(w.luck * 100) + '%'],
  });
  BB.ITEM.knight = {
    id: 'knight', name: 'Knight', cat: 'hidden', rarity: 'common', color: '#dfe6e9',
    base: { damage: 1, spin: 210, len: 34, width: 7, gap: 2 }, melee: true, blocks: true,
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat,
  };
  add({
    id: 'king', name: 'King', cat: 'special', rarity: 'legendary', color: '#f1c40f',
    desc: 'Every 7s it summons a sword-wielding knight to fight for it (up to 3). Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 2; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = 7;
      const alive = sim.balls.filter((m) => m.alive && m.owner === b).length;
      if (alive >= 3) return;
      const a = sim.rng() * TAU, k = sim.makeBall(BB.ITEM.knight, b.team, b.x + Math.cos(a) * b.r * 2, b.y + Math.sin(a) * b.r * 2, { hp: 22, scale: 0.6, main: false, owner: b });
      k.name = 'Knight';
      sim.ring(k.x, k.y, 4, 40, '#f1c40f', 0.35); sim.fxTag(b.x, b.y - b.r - 24, 'ARISE, KNIGHT', '#f1c40f');
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w, b) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'zombie', name: 'Zombie', cat: 'special', rarity: 'epic', color: '#6ab04c',
    desc: 'Refuses to stay down: rises once at 35% health, faster and with double-damage slams. +0.5 every hit.',
    base: { damage: 1.5 }, contact: true,
    beforeDeath(sim, b) {
      if (b.risen || !b.main) return false;
      b.risen = true; b.hp = b.maxHp * 0.35; b.speedMul = 1.25; b.w.riseT = 1;
      sim.ring(b.x, b.y, b.r, b.r * 4, '#badc58', 0.6);
      sim.burst(b.x, b.y, 26, ['#6ab04c', '#badc58', '#2d3436'], 360, 5);
      sim.fxTag(b.x, b.y - b.r - 26, 'IT RISES!', '#badc58');
      sim.emit({ type: 'boom', x: b.x, y: b.y });
      return true;
    },
    update(sim, b, w, dt) { if (w.riseT > 0) w.riseT -= dt; },
    contactDamage: (w) => w.damage * (w.riseT !== undefined ? 2 : 1),
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w, b) => ['Damage: ' + fmt(w.damage), b && b.risen ? 'RISEN' : 'Rise ready'],
  });
  add({
    id: 'hypno', name: 'Hypno', cat: 'special', rarity: 'epic', color: '#be2edd',
    desc: 'Slams hypnotize the enemy for 1.5s: its weapon spins backwards and it wobbles off course. +0.5 every hit.',
    base: { damage: 1.75 }, contact: true,
    update(sim, b, w, dt) {
      for (const e of sim.balls) {
        if (!e.alive || !(e.hypnoT > 0) || e.hypnoBy !== b.id) continue;
        e.hypnoT -= dt;
        const a = Math.atan2(e.vy, e.vx) + (sim.rng() - 0.5) * 6 * dt, s = Math.hypot(e.vx, e.vy);
        e.vx = Math.cos(a) * s; e.vy = Math.sin(a) * s;
        if (e.hypnoT <= 0 && e.w) e.w.dir = e.hypnoDir || e.w.dir;
      }
    },
    onHit(sim, b, w, t) {
      w.damage += 0.5;
      if (t && t.alive && t.w) {
        if (!(t.hypnoT > 0)) { t.hypnoDir = t.w.dir; t.w.dir *= -1; sim.fxTag(t.x, t.y + t.r + 18, 'HYPNOTIZED', '#e056fd'); }
        t.hypnoT = 1.5; t.hypnoBy = b.id;
      }
    },
    stats: dmgStat,
  });
  add({
    id: 'comet', name: 'Comet', cat: 'special', rarity: 'rare', color: '#0984e3',
    desc: 'Keeps speeding up until it slams something; slam damage grows with its speed. +0.25 every hit.',
    base: { damage: 1.25 }, contact: true,
    update(sim, b, w, dt) { b.speedMul = Math.min(2.3, b.speedMul + dt * 0.16); },
    contactDamage: (w) => w.damage * w.boost,
    init(w) { w.boost = 1; },
    onHit(sim, b, w) { w.damage += 0.25; b.speedMul = 1; },
    stats: (w, b) => ['Damage: ' + fmt(w.damage), 'Speed: x' + (b ? b.speedMul.toFixed(1) : '1.0')],
  });
  // comet: damage follows speed (kept in w.boost so contactDamage can read it)
  { const up = BB.ITEM.comet.update; BB.ITEM.comet.update = (sim, b, w, dt) => { up(sim, b, w, dt); w.boost = b.speedMul; }; }

  if (typeof document === 'undefined') return;
  // ================================================================ art
  const OUT = '#1d1d22';
  const fs = (ctx, fill, lw) => { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke(); };

  const baseWeapon = BB.drawWeapon;
  BB.drawWeapon = function (ctx, id, s, L, W, lw, t, team) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (id === 'yoyo') {
      ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(s + L - W * 0.5, 0); ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.1; ctx.stroke(); ctx.strokeStyle = '#f5f6fa'; ctx.lineWidth = lw * 0.5; ctx.stroke();
      const cx = s + L - W * 0.4;
      ctx.save(); ctx.translate(cx, 0); ctx.rotate(t * 14);
      ctx.beginPath(); ctx.arc(0, 0, W * 0.62, 0, TAU); fs(ctx, '#ff6b81', lw);
      ctx.beginPath(); ctx.arc(0, 0, W * 0.3, 0, TAU); fs(ctx, '#ffeaa7', lw * 0.7);
      ctx.beginPath(); ctx.moveTo(-W * 0.55, 0); ctx.lineTo(W * 0.55, 0); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
      ctx.restore();
    } else if (id === 'drill') {
      ctx.beginPath(); ctx.rect(s, -W * 0.38, L * 0.28, W * 0.76); fs(ctx, '#f39c12', lw);
      ctx.beginPath(); ctx.moveTo(s + L * 0.26, -W * 0.5); ctx.lineTo(s + L, 0); ctx.lineTo(s + L * 0.26, W * 0.5); ctx.closePath(); fs(ctx, '#b2bec3', lw);
      ctx.save(); ctx.clip();
      const ph = (t * 6) % 1;
      for (let k = -1; k < 6; k++) { const x = s + L * 0.26 + (k + ph) * L * 0.13; ctx.beginPath(); ctx.moveTo(x, -W * 0.6); ctx.lineTo(x + L * 0.08, W * 0.6); ctx.strokeStyle = '#636e72'; ctx.lineWidth = lw * 0.8; ctx.stroke(); }
      ctx.restore();
    } else if (id === 'harpoon') {
      ctx.beginPath(); ctx.rect(s, -W * 0.22, L * 0.8, W * 0.44); fs(ctx, '#5d4037', lw);
      ctx.beginPath(); ctx.moveTo(s + L * 0.78, -W * 0.5); ctx.lineTo(s + L * 1.05, 0); ctx.lineTo(s + L * 0.78, W * 0.5); ctx.lineTo(s + L * 0.86, 0); ctx.closePath(); fs(ctx, '#dfe6e9', lw);
      ctx.beginPath(); ctx.moveTo(s + L * 0.82, -W * 0.3); ctx.lineTo(s + L * 0.7, -W * 0.85); ctx.moveTo(s + L * 0.82, W * 0.3); ctx.lineTo(s + L * 0.7, W * 0.85); ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.rect(s + L * 0.1, -W * 0.35, W * 0.4, W * 0.7); fs(ctx, '#1e6fa8', lw * 0.8);
    } else if (id === 'kusarigama') {
      const n = Math.max(3, Math.floor(L / 9));
      for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.ellipse(s + (i + 0.5) * ((L - W * 1.2) / n), 0, (L / n) * 0.55, W * 0.22, 0, 0, TAU); ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = lw * 0.8; ctx.stroke(); }
      const hx = s + L - W * 1.2;
      ctx.beginPath(); ctx.rect(hx, -W * 0.25, W * 0.9, W * 0.5); fs(ctx, '#6d4c41', lw);
      ctx.beginPath(); ctx.moveTo(hx + W * 0.8, -W * 0.3); ctx.quadraticCurveTo(hx + W * 2.4, -W * 0.2, hx + W * 1.9, W * 1.4); ctx.quadraticCurveTo(hx + W * 1.6, W * 0.4, hx + W * 0.8, W * 0.3); ctx.closePath(); fs(ctx, '#dfe6e9', lw);
    } else if (id === 'tuningfork') {
      ctx.beginPath(); ctx.rect(s, -W * 0.15, L * 0.45, W * 0.3); fs(ctx, '#b2bec3', lw);
      ctx.beginPath(); ctx.moveTo(s + L * 0.45, -W * 0.5); ctx.lineTo(s + L, -W * 0.5); ctx.moveTo(s + L * 0.45, W * 0.5); ctx.lineTo(s + L, W * 0.5); ctx.arc(s + L * 0.45, 0, W * 0.5, Math.PI / 2, -Math.PI / 2);
      ctx.strokeStyle = OUT; ctx.lineWidth = W * 0.32 + lw; ctx.stroke(); ctx.strokeStyle = '#dfe6e9'; ctx.lineWidth = W * 0.32; ctx.stroke();
      const v = Math.sin(t * 40) * 2;
      ctx.beginPath(); ctx.moveTo(s + L * 1.05, -W * 0.5 + v); ctx.lineTo(s + L * 1.15, -W * 0.5 - v); ctx.moveTo(s + L * 1.05, W * 0.5 - v); ctx.lineTo(s + L * 1.15, W * 0.5 + v); ctx.strokeStyle = 'rgba(116,185,255,0.8)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
    } else if (id === 'plasma') {
      ctx.beginPath(); ctx.rect(s, -W * 0.45, L * 0.22, W * 0.9); fs(ctx, '#2d3436', lw);
      ctx.beginPath(); ctx.rect(s + L * 0.05, -W * 0.45, L * 0.04, W * 0.9); ctx.fillStyle = '#b2bec3'; ctx.fill();
      const fl = 0.85 + 0.15 * Math.sin(t * 50);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.moveTo(s + L * 0.22, -W * 0.55); ctx.lineTo(s + L, -W * 0.4); ctx.arc(s + L, 0, W * 0.4, -Math.PI / 2, Math.PI / 2); ctx.lineTo(s + L * 0.22, W * 0.55); ctx.closePath();
      ctx.fillStyle = 'rgba(0,229,255,' + (0.45 * fl) + ')'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(s + L * 0.22, -W * 0.22); ctx.lineTo(s + L * 0.98, -W * 0.14); ctx.lineTo(s + L * 0.98, W * 0.14); ctx.lineTo(s + L * 0.22, W * 0.22); ctx.closePath(); ctx.fillStyle = '#e0ffff'; ctx.fill();
    } else if (id === 'laser') {
      ctx.beginPath(); ctx.rect(s, -W * 0.35, L, W * 0.7); fs(ctx, '#2d3436', lw);
      ctx.beginPath(); ctx.rect(s + L * 0.3, -W * 0.2, L * 0.18, W * 0.4); ctx.fillStyle = '#e84118'; ctx.fill();
      ctx.beginPath(); ctx.arc(s + L, 0, W * 0.25, 0, TAU); ctx.fillStyle = '#ff7675'; ctx.fill();
    } else if (id === 'chakram') {
      const cx = s + L * 0.55;
      ctx.beginPath(); ctx.rect(s, -W * 0.12, L * 0.25, W * 0.24); fs(ctx, '#6d4c41', lw);
      ctx.save(); ctx.translate(cx, 0); ctx.rotate(t * 3);
      ctx.beginPath(); ctx.arc(0, 0, W * 0.6, 0, TAU); ctx.arc(0, 0, W * 0.36, 0, TAU, true); fs(ctx, '#f39c12', lw);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * W * 0.6, Math.sin(a) * W * 0.6); ctx.lineTo(Math.cos(a + 0.35) * W * 0.85, Math.sin(a + 0.35) * W * 0.85); ctx.lineTo(Math.cos(a + 0.5) * W * 0.6, Math.sin(a + 0.5) * W * 0.6); fs(ctx, '#ffeaa7', lw * 0.6); }
      ctx.restore();
    } else if (id === 'scissors') {
      // two crossed halves on a pivot screw: each blade is joined to the opposite finger loop,
      // so the pair opens into an X and snips shut
      const op = 0.06 + 0.2 * Math.pow(0.5 + 0.5 * Math.sin(t * 9), 2), px = s + L * 0.42, Lb = L * 0.58, Lh = L * 0.3, B = Math.max(W * 1.4, L * 0.32);
      for (const sd of [1, -1]) {
        ctx.save(); ctx.translate(px, 0); ctx.rotate(sd * op);
        // finger loop + shank (behind the blade)
        const lx = -Lh, ly = sd * B * 0.62, lr = B * 0.36;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-Lh * 0.35, sd * B * 0.08, lx + lr * 0.7, ly - sd * lr * 0.55);
        ctx.strokeStyle = OUT; ctx.lineWidth = lw * 3; ctx.stroke(); ctx.strokeStyle = '#e17055'; ctx.lineWidth = lw * 1.6; ctx.stroke();
        ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU);
        ctx.strokeStyle = OUT; ctx.lineWidth = lw * 3; ctx.stroke(); ctx.strokeStyle = '#e17055'; ctx.lineWidth = lw * 1.6; ctx.stroke();
        // blade: straight cutting edge on the centre line, curved back, sharp tip
        ctx.beginPath(); ctx.moveTo(-B * 0.12, sd * B * 0.03); ctx.lineTo(Lb, 0);
        ctx.quadraticCurveTo(Lb * 0.4, -sd * B * 0.6, -B * 0.12, -sd * B * 0.36); ctx.closePath(); fs(ctx, '#dfe6e9', lw);
        ctx.beginPath(); ctx.moveTo(Lb * 0.08, -sd * B * 0.15); ctx.lineTo(Lb * 0.68, -sd * B * 0.06); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(px, 0, B * 0.11, 0, TAU); fs(ctx, '#b2bec3', lw * 0.8);
    } else if (id === 'pillow') {
      const sq = 1 + Math.sin(t * 6) * 0.05;
      ctx.beginPath(); ctx.rect(s, -W * 0.1, L * 0.2, W * 0.2); fs(ctx, '#b2bec3', lw);
      ctx.save(); ctx.translate(s + L * 0.6, 0); ctx.scale(1, sq);
      const hw = L * 0.42, hh = W * 0.55;
      ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.quadraticCurveTo(0, -hh * 0.7, hw, -hh); ctx.quadraticCurveTo(hw * 0.8, 0, hw, hh); ctx.quadraticCurveTo(0, hh * 0.7, -hw, hh); ctx.quadraticCurveTo(-hw * 0.8, 0, -hw, -hh); fs(ctx, '#f5f6fa', lw);
      ctx.beginPath(); ctx.moveTo(-hw * 0.6, -hh * 0.2); ctx.lineTo(hw * 0.6, -hh * 0.2); ctx.strokeStyle = '#a29bfe'; ctx.lineWidth = lw * 0.6; ctx.stroke();
      ctx.restore();
    } else if (id === 'bat') {
      ctx.beginPath(); ctx.moveTo(s, -W * 0.18); ctx.lineTo(s + L * 0.45, -W * 0.22); ctx.quadraticCurveTo(s + L * 0.75, -W * 0.55, s + L, -W * 0.45); ctx.arc(s + L, 0, W * 0.45, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(s + L * 0.75, W * 0.55, s + L * 0.45, W * 0.22); ctx.lineTo(s, W * 0.18); ctx.closePath(); fs(ctx, '#d4a76a', lw);
      ctx.beginPath(); ctx.rect(s, -W * 0.22, L * 0.22, W * 0.44); fs(ctx, '#2d3436', lw * 0.8);
      ctx.beginPath(); ctx.moveTo(s + L * 0.55, -W * 0.15); ctx.lineTo(s + L * 0.9, -W * 0.25); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
    } else if (id === 'stormhammer') {
      ctx.beginPath(); ctx.rect(s, -W * 0.12, L * 0.7, W * 0.24); fs(ctx, '#6d4c41', lw);
      ctx.beginPath(); ctx.rect(s + L * 0.62, -W * 0.65, L * 0.38, W * 1.3); fs(ctx, '#636e72', lw);
      ctx.beginPath(); ctx.rect(s + L * 0.62, -W * 0.65, L * 0.38, W * 0.25); ctx.fillStyle = '#6c5ce7'; ctx.fill();
      ctx.beginPath(); ctx.rect(s + L * 0.62, W * 0.4, L * 0.38, W * 0.25); ctx.fillStyle = '#6c5ce7'; ctx.fill();
      if (Math.sin(t * 13) > 0.6) { ctx.beginPath(); ctx.moveTo(s + L * 0.7, -W * 0.8); ctx.lineTo(s + L * 0.8, -W * 1.1); ctx.lineTo(s + L * 0.75, -W * 1.1); ctx.lineTo(s + L * 0.88, -W * 1.5); ctx.strokeStyle = '#a29bfe'; ctx.lineWidth = lw * 0.8; ctx.stroke(); }
    } else { ctx.restore(); return baseWeapon(ctx, id, s, L, W, lw, t, team); }
    ctx.restore();
  };

  // menu emblems for the new specials
  const baseIcon = BB.drawIcon;
  const EM = { magma: 1, meteor: 1, chrono: 1, balloon: 1, disco: 1, prism: 1, golem: 1, clover: 1, king: 1, zombie: 1, hypno: 1, comet: 1 };
  function emblem(ctx, id, r) {
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = r * 0.13;
    if (id === 'magma') { ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.quadraticCurveTo(r * 0.55, 0, 0, r * 0.55); ctx.quadraticCurveTo(-r * 0.55, 0, 0, -r * 0.6); ctx.fill(); }
    if (id === 'meteor') { ctx.beginPath(); ctx.arc(r * 0.15, r * 0.15, r * 0.3, 0, TAU); ctx.fill(); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.1 - i * r * 0.12, -r * 0.1 + i * r * 0.18 - r * 0.2); ctx.lineTo(-r * 0.55, -r * 0.55 + i * r * 0.2); ctx.stroke(); } }
    if (id === 'chrono') { ctx.beginPath(); ctx.arc(0, 0, r * 0.52, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.35); ctx.moveTo(0, 0); ctx.lineTo(r * 0.25, r * 0.1); ctx.stroke(); }
    if (id === 'balloon') { ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.32, r * 0.4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.quadraticCurveTo(r * 0.15, r * 0.45, 0, r * 0.65); ctx.stroke(); }
    if (id === 'disco') { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); ctx.stroke(); } }
    if (id === 'prism') { ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.5, r * 0.4); ctx.lineTo(-r * 0.5, r * 0.4); ctx.closePath(); ctx.stroke(); }
    if (id === 'golem') { ctx.beginPath(); ctx.rect(-r * 0.4, -r * 0.3, r * 0.3, r * 0.2); ctx.rect(r * 0.1, -r * 0.3, r * 0.3, r * 0.2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-r * 0.35, r * 0.25); ctx.lineTo(r * 0.35, r * 0.25); ctx.stroke(); }
    if (id === 'clover') { for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22, r * 0.2, 0, TAU); ctx.fill(); } }
    if (id === 'king') { ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.3); ctx.lineTo(-r * 0.5, -r * 0.25); ctx.lineTo(-r * 0.25, 0); ctx.lineTo(0, -r * 0.4); ctx.lineTo(r * 0.25, 0); ctx.lineTo(r * 0.5, -r * 0.25); ctx.lineTo(r * 0.5, r * 0.3); ctx.closePath(); ctx.fill(); }
    if (id === 'zombie') { ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.2); ctx.lineTo(-r * 0.15, -r * 0.05); ctx.moveTo(r * 0.4, -r * 0.2); ctx.lineTo(r * 0.15, -r * 0.05); ctx.moveTo(-r * 0.35, r * 0.3); for (let i = 0; i < 4; i++) ctx.lineTo(-r * 0.35 + (i + 0.5) * r * 0.175, r * (i % 2 ? 0.3 : 0.42)); ctx.lineTo(r * 0.35, r * 0.3); ctx.stroke(); }
    if (id === 'hypno') { ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.2) { const rr = r * 0.06 + a * r * 0.045; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); }
    if (id === 'comet') { ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.2, r * 0.25, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.55, r * 0.55); ctx.moveTo(r * 0.15, r * 0.1); ctx.lineTo(-r * 0.3, r * 0.6); ctx.moveTo(-r * 0.1, -r * 0.15); ctx.lineTo(-r * 0.6, r * 0.3); ctx.stroke(); }
    ctx.restore();
  }
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    baseIcon(ctx, id, x, y, size, opts);
    if (!EM[id]) return;
    ctx.save(); ctx.translate(x, y); emblem(ctx, id, size * 0.33); ctx.restore();
  };

  // in-battle visuals: ground effects drawn under the ball, auras / emblems over it
  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    const id = b.def.id, w = b.w, t = sim.t;
    if (id === 'magma' && w.pools) for (const p of w.pools) {
      const k = Math.min(1, p.t / 0.6), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, 'rgba(255,214,90,' + 0.85 * k + ')'); g.addColorStop(0.6, 'rgba(255,90,30,' + 0.7 * k + ')'); g.addColorStop(1, 'rgba(120,20,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    if (id === 'meteor' && w.marks) for (const m of w.marks) {
      const k = 1 - m.t / m.max;
      ctx.save(); ctx.strokeStyle = 'rgba(255,80,60,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(m.x, m.y, m.R * k, 0, TAU); ctx.fillStyle = 'rgba(255,80,60,0.18)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(m.x - 10, m.y); ctx.lineTo(m.x + 10, m.y); ctx.moveTo(m.x, m.y - 10); ctx.lineTo(m.x, m.y + 10); ctx.stroke();
      // the falling rock
      const fy = m.y - (1 - k) * 360, fx = m.x - (1 - k) * 160, rr = 30 * b.scale * (0.6 + k * 0.6);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 50, fy - 110); ctx.strokeStyle = 'rgba(255,200,80,0.5)'; ctx.lineWidth = rr * 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, rr, 0, TAU); ctx.fillStyle = '#6d4c41'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.restore();
    }
    if (id === 'comet' && b.speedMul > 1.15) {
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = -b.vx / sp, uy = -b.vy / sp, L = b.r * (b.speedMul - 1) * 3.2;
      const g = ctx.createLinearGradient(b.x, b.y, b.x + ux * L, b.y + uy * L);
      g.addColorStop(0, 'rgba(116,185,255,0.8)'); g.addColorStop(1, 'rgba(116,185,255,0)');
      ctx.beginPath(); ctx.moveTo(b.x - uy * b.r, b.y + ux * b.r); ctx.lineTo(b.x + ux * L, b.y + uy * L); ctx.lineTo(b.x + uy * b.r, b.y - ux * b.r); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    }
    if (id === 'chrono' && w.stop > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, w.stop * 2) * 0.25; ctx.fillStyle = '#81ecec'; ctx.fillRect(-sim.W / 2, -sim.H / 2, sim.W, sim.H); ctx.restore();
    }
    if (id === 'laser' && w.fx) {
      const k = w.fx.t / 0.22;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,60,40,' + 0.5 * k + ')'; ctx.lineWidth = 12 * k; ctx.beginPath(); ctx.moveTo(w.fx.x, w.fx.y); ctx.lineTo(w.fx.x2, w.fx.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + k + ')'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
    if (id === 'zombie' && b.risen) {
      ctx.save(); ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5);
      const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.8, b.x, b.y, b.r * 1.6); g.addColorStop(0, 'rgba(186,220,88,0.7)'); g.addColorStop(1, 'rgba(186,220,88,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (id === 'golem' && w.armor > 0.01) {
      ctx.save(); ctx.strokeStyle = 'rgba(99,110,114,' + (0.4 + w.armor) + ')'; ctx.lineWidth = 3 + w.armor * 12;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (id === 'king') {
      // golden crown above the ball
      const cx = b.x, cy = b.y - b.r - 6, s = b.r * 0.55;
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.45); ctx.lineTo(cx - s, cy - s * 0.3); ctx.lineTo(cx - s * 0.5, cy + s * 0.1); ctx.lineTo(cx, cy - s * 0.55); ctx.lineTo(cx + s * 0.5, cy + s * 0.1); ctx.lineTo(cx + s, cy - s * 0.3); ctx.lineTo(cx + s, cy + s * 0.45); ctx.closePath();
      ctx.fillStyle = '#f9ca24'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
    }
    baseBall(ctx, sim, b, lw, R);
    // hypnotized balls get a spiral over them
    if (b.hypnoT > 0) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(-t * 8); ctx.globalAlpha = Math.min(1, b.hypnoT * 2) * 0.8;
      ctx.beginPath(); for (let a = 0; a < TAU * 2.5; a += 0.25) { const rr = 2 + a * b.r * 0.06; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.strokeStyle = '#e056fd'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    }
    // identity details around the rim (the middle stays clear for the HP number)
    const r = b.r;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (id === 'chrono') {
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * (r + 3), b.y + Math.sin(a) * (r + 3)); ctx.lineTo(b.x + Math.cos(a) * (r + (i % 3 ? 7 : 11)), b.y + Math.sin(a) * (r + (i % 3 ? 7 : 11))); ctx.strokeStyle = '#00cec9'; ctx.lineWidth = i % 3 ? 2 : 3; ctx.stroke(); }
      const ha = -Math.PI / 2 + (1 - Math.max(0, w.timer) / 5) * TAU; // the hand sweeps toward the next time stop
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(ha) * (r + 2), b.y + Math.sin(ha) * (r + 2)); ctx.lineTo(b.x + Math.cos(ha) * (r + 16), b.y + Math.sin(ha) * (r + 16)); ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (id === 'magma') {
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 7);
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * r * 0.55, b.y + Math.sin(a) * r * 0.55); ctx.lineTo(b.x + Math.cos(a + 0.25) * r * 0.8, b.y + Math.sin(a + 0.25) * r * 0.8); ctx.lineTo(b.x + Math.cos(a + 0.1) * r * 0.98, b.y + Math.sin(a + 0.1) * r * 0.98); ctx.strokeStyle = '#ffd56a'; ctx.lineWidth = 2.5; ctx.stroke(); }
      if (sim.frng() < 0.25) sim.fx.push({ k: 'p', x: b.x + (sim.frng() - 0.5) * r, y: b.y + r * 0.6, vx: 0, vy: 50, life: 0.5, max: 0.5, c: '#ff7a1a', s: 3 });
    } else if (id === 'meteor') {
      const a = t * 2.4;
      ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * (r + 12), b.y + Math.sin(a) * (r + 12) * 0.6, 5, 0, TAU); ctx.fillStyle = '#6d4c41'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
      for (const [dx, dy, rr] of [[-0.45, -0.5, 0.16], [0.5, 0.35, 0.12], [-0.3, 0.55, 0.1]]) { ctx.beginPath(); ctx.arc(b.x + dx * r, b.y + dy * r, rr * r, 0, TAU); ctx.fillStyle = 'rgba(80,50,20,0.35)'; ctx.fill(); }
    } else if (id === 'balloon') {
      const sw = Math.sin(t * 4) * 6;
      ctx.beginPath(); ctx.moveTo(b.x, b.y + r); ctx.lineTo(b.x - 4, b.y + r + 5); ctx.lineTo(b.x + 4, b.y + r + 5); ctx.closePath(); ctx.fillStyle = '#ff7675'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(b.x, b.y + r + 5); ctx.quadraticCurveTo(b.x + sw, b.y + r + 16, b.x - sw * 0.5, b.y + r + 28); ctx.strokeStyle = '#636e72'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(b.x - r * 0.4, b.y - r * 0.45, r * 0.16, r * 0.3, -0.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    } else if (id === 'clover') {
      for (let i = 0; i < 4; i++) { const a = t * 1.5 + (i / 4) * TAU, x = b.x + Math.cos(a) * (r + 9), y = b.y + Math.sin(a) * (r + 9);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.4, 0, 0, TAU); ctx.fillStyle = '#2ecc71'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore(); }
    } else if (id === 'zombie') {
      for (const a of [0.9, 2.3, 4.2]) { const x = b.x + Math.cos(a) * r * 0.75, y = b.y + Math.sin(a) * r * 0.75; ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); for (let k = -1; k <= 1; k++) { ctx.moveTo(k * 4, -3); ctx.lineTo(k * 4, 3); } ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); }
      if (b.risen) for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * (r + 7), b.y + Math.sin(a) * (r + 7), 3, 0, TAU); ctx.fillStyle = '#badc58'; ctx.fill(); }
    } else if (id === 'hypno') {
      ctx.translate(b.x, b.y); ctx.rotate(t * 3);
      for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, 1.4); ctx.strokeStyle = i % 2 ? '#e056fd' : '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
    } else if (id === 'golem') {
      for (const [a, l] of [[0.5, 0.5], [2.2, 0.4], [3.9, 0.55], [5.3, 0.35]]) { ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); ctx.lineTo(b.x + Math.cos(a + 0.2) * r * (1 - l * 0.5), b.y + Math.sin(a + 0.2) * r * (1 - l * 0.5)); ctx.lineTo(b.x + Math.cos(a - 0.1) * r * (1 - l), b.y + Math.sin(a - 0.1) * r * (1 - l)); ctx.strokeStyle = 'rgba(30,30,30,0.55)'; ctx.lineWidth = 2; ctx.stroke(); }
    } else if (id === 'comet') {
      ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(b.x, b.y, r * 0.8, b.x, b.y, r * 1.6);
      g.addColorStop(0, 'rgba(116,185,255,' + (0.1 + (b.speedMul - 1) * 0.15) + ')'); g.addColorStop(1, 'rgba(116,185,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r * 1.6, 0, TAU); ctx.fill();
    } else if (id === 'meteor' || id === 'disco') { /* drawn above */ }
    ctx.restore();
    if (id === 'prism') {
      const c = ['#ff7a1a', '#74b9ff', '#fdcb6e'][w.el];
      ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, 0, TAU); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.restore();
    }
    if (id === 'disco') {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(b.x, b.y); ctx.rotate(t * 2);
      for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.fillStyle = 'hsl(' + ((i * 60 + t * 120) % 360) + ',90%,65%)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, b.r * 1.9, -0.12, 0.12); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
  };

  // projectiles
  const baseProj = BB.drawProjArt;
  BB.drawProjArt = function (ctx, p, lw) {
    if (p.kind === 'harpoon') {
      if (p.owner && p.owner.alive) { ctx.beginPath(); ctx.moveTo(p.owner.x, p.owner.y); ctx.lineTo(p.x, p.y); ctx.strokeStyle = 'rgba(80,60,40,0.8)'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.beginPath(); ctx.rect(-26, -2, 22, 4); fs(ctx, '#5d4037', 1.2);
      ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(8, 0); ctx.lineTo(-6, 6); ctx.lineTo(-2, 0); ctx.closePath(); fs(ctx, '#dfe6e9', 1.5);
      ctx.restore(); return true;
    }
    if (p.kind === 'chakram') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 18);
      ctx.beginPath(); ctx.arc(0, 0, p.r * 1.2, 0, TAU); ctx.arc(0, 0, p.r * 0.7, 0, TAU, true); fs(ctx, '#f39c12', 1.5);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * p.r * 1.2, Math.sin(a) * p.r * 1.2); ctx.lineTo(Math.cos(a + 0.35) * p.r * 1.6, Math.sin(a + 0.35) * p.r * 1.6); ctx.lineTo(Math.cos(a + 0.5) * p.r * 1.2, Math.sin(a + 0.5) * p.r * 1.2); fs(ctx, '#ffeaa7', 1); }
      ctx.restore(); return true;
    }
    if (p.kind === 'disco') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = 'lighter';
      const c = 'hsl(' + Math.round((p.hue || 0) * 360) + ',95%,62%)';
      ctx.beginPath(); ctx.arc(0, 0, p.r * 2, 0, TAU); ctx.fillStyle = c; ctx.globalAlpha = 0.35; ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore(); return true;
    }
    return baseProj ? baseProj(ctx, p, lw) : false;
  };
})();
