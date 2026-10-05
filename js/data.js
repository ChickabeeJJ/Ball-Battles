// Content definitions: weapons, special balls, maps and game modes.
// Behaviour hooks receive (sim, ball, w) where w is the ball's weapon state.
(function () {
  const BB = window.BB;
  const fmt = BB.fmt;
  const D2R = Math.PI / 180;

  BB.RARITY = {
    common: { name: 'Common', color: '#9aa3ad', price: 0 },
    rare: { name: 'Rare', color: '#3d8bf2', price: 250 },
    epic: { name: 'Epic', color: '#a259ff', price: 600 },
    legendary: { name: 'Legendary', color: '#ff8a1f', price: 1200 },
  };

  const ITEMS = (BB.ITEMS = []);
  function add(o) {
    o.base = Object.assign({ damage: 1, spin: 0, len: 0, width: 6, gap: 2 }, o.base || {});
    o.price = o.price != null ? o.price : BB.RARITY[o.rarity].price;
    ITEMS.push(o);
  }

  function aimSpread(sim, b, w, n, spreadDeg, speed, extra) {
    for (let i = 0; i < n; i++) {
      const a = w.angle + (i - (n - 1) / 2) * spreadDeg * D2R;
      const s = b.r + w.gap + w.len;
      sim.spawnProj(Object.assign({
        owner: b, x: b.x + Math.cos(a) * s, y: b.y + Math.sin(a) * s,
        vx: Math.cos(a) * speed + b.vx * 0.2, vy: Math.sin(a) * speed + b.vy * 0.2, angle: a,
      }, extra));
    }
  }

  // ---------------------------------------------------------------- weapons
  add({
    id: 'sword', name: 'Sword', cat: 'weapon', rarity: 'common', color: '#e8473f',
    desc: 'Every hit makes the blade deal +1 damage.',
    base: { damage: 1, spin: 200, len: 50, width: 8 }, melee: true, blocks: true,
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'dagger', name: 'Dagger', cat: 'weapon', rarity: 'common', color: '#3fbf4f',
    desc: 'Quick little blade. Spins +90°/s faster every hit.',
    base: { damage: 1.5, spin: 380, len: 30, width: 7 }, melee: true, blocks: true, hitCd: 0.15,
    onHit(sim, b, w) { w.spin = Math.min(w.spin + 90, 2400); },
    stats: (w) => ['Spin Speed: ' + Math.round(w.spin)],
  });
  add({
    id: 'spear', name: 'Spear', cat: 'weapon', rarity: 'common', color: '#3b7fe0',
    desc: 'Grows longer and +0.5 damage every hit.',
    base: { damage: 1, spin: 150, len: 58, width: 7 }, melee: true, blocks: true,
    onHit(sim, b, w) { w.damage += 0.5; w.len = Math.min(w.len + 6 * w.scale, 220 * w.scale); },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Length: ' + Math.round(w.len / w.scale)],
  });
  add({
    id: 'axe', name: 'Axe', cat: 'weapon', rarity: 'common', color: '#c4702b',
    desc: 'Heavy chops for 2 damage. Swings +30°/s faster every hit.',
    base: { damage: 2, spin: 140, len: 44, width: 12 }, melee: true, blocks: true, 
    onHit(sim, b, w) { w.spin = Math.min(w.spin + 30, 1400); },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Spin Speed: ' + Math.round(w.spin)],
  });
  add({
    id: 'unarmed', name: 'Unarmed', cat: 'weapon', rarity: 'common', color: '#9aa0a6',
    desc: 'No weapon. Body slams get +0.5 damage and 8% more speed every hit.',
    base: { damage: 1 }, contact: true,
    onHit(sim, b, w) { w.damage += 0.5; b.speedMul = Math.min(b.speedMul + 0.08, 2.6); },
    stats: (w, b) => ['Damage: ' + fmt(w.damage), 'Speed: ' + Math.round(b.speedMul * 100) + '%'],
  });
  add({
    id: 'bow', name: 'Bow', cat: 'weapon', rarity: 'rare', color: '#e7b928',
    desc: 'Fires arrows. Every arrow hit adds +1 arrow per volley.',
    base: { damage: 1, spin: 170, len: 26, width: 12 }, blocks: true,
    init(w) { w.arrows = 1; w.timer = 0.6; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = 1.15;
        aimSpread(sim, b, w, w.arrows, 9, 640, { kind: 'arrow', r: 4 * w.scale, dmg: w.damage, life: 2 });
        sim.emit({ type: 'shoot', x: b.x, y: b.y });
      }
    },
    onHit(sim, b, w) { w.arrows = Math.min(w.arrows + 1, 14); },
    stats: (w) => ['Arrows: ' + w.arrows],
  });
  add({
    id: 'shuriken', name: 'Shuriken', cat: 'weapon', rarity: 'rare', color: '#33415c',
    desc: 'Throws ricocheting stars. +1 damage every hit.',
    base: { damage: 1, spin: 220, len: 22, width: 16 }, blocks: true,
    init(w) { w.timer = 0.5; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = 1.3;
        aimSpread(sim, b, w, 1, 0, 470, { kind: 'star', r: 8 * w.scale, dmg: w.damage, life: 3.5, bounces: 2 });
        sim.emit({ type: 'shoot', x: b.x, y: b.y });
      }
    },
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'katana', name: 'Katana', cat: 'weapon', rarity: 'rare', color: '#d63a7a',
    desc: 'Fast and sharp. Every hit adds +10% chance to crit for triple damage.',
    base: { damage: 1, spin: 280, len: 54, width: 7 }, melee: true, blocks: true,
    init(w) { w.crit = 0.15; },
    damageFn(sim, b, w) { return sim.rng() < w.crit ? [w.damage * 3, true] : [w.damage, false]; },
    onHit(sim, b, w) { w.crit = Math.min(w.crit + 0.1, 0.9); },
    stats: (w) => ['Crit: ' + Math.round(w.crit * 100) + '%'],
  });
  add({
    id: 'hammer', name: 'Hammer', cat: 'weapon', rarity: 'rare', color: '#ff8a1f',
    desc: 'Slow, huge knockback, 3 damage. +0.5 damage every hit.',
    base: { damage: 3, spin: 110, len: 46, width: 16 }, melee: true, blocks: true, knock: 380,
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'torch', name: 'Torch', cat: 'weapon', rarity: 'rare', color: '#ff5a1f',
    desc: 'Sets enemies on fire. The flame burns hotter every hit.',
    base: { damage: 1, spin: 220, len: 42, width: 10 }, melee: true, blocks: true,
    init(w) { w.burn = 1; },
    onHit(sim, b, w, t) { t.burnLvl = Math.max(t.burnLvl, w.burn); t.burnT = 3; w.burn += 1; },
    stats: (w) => ['Burn: ' + w.burn + '/s'],
  });
  add({
    id: 'scythe', name: 'Scythe', cat: 'weapon', rarity: 'epic', color: '#7b3fbf',
    desc: 'Heals for all damage dealt. +0.5 damage every hit.',
    base: { damage: 1, spin: 180, len: 52, width: 14 }, melee: true, blocks: true,
    onHit(sim, b, w, t, dealt) { sim.heal(b, dealt); w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Lifesteal: 100%'],
  });
  add({
    id: 'flask', name: 'Poison Flask', cat: 'weapon', rarity: 'epic', color: '#5fd35a',
    desc: 'Every hit adds a poison stack that never wears off.',
    base: { damage: 1, spin: 240, len: 34, width: 16 }, melee: true, blocks: true,
    init(w) { w.applied = 0; },
    onHit(sim, b, w, t) { t.poison += 1; w.applied += 1; },
    stats: (w) => ['Stacks: ' + w.applied],
  });
  add({
    id: 'wrench', name: 'Wrench', cat: 'weapon', rarity: 'epic', color: '#d9a12b',
    desc: 'Builds turrets. Every 2 hits allows one more turret.',
    base: { damage: 1, spin: 200, len: 38, width: 12 }, melee: true, blocks: true,
    init(w) { w.timer = 1.2; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      const max = Math.min(1 + Math.floor(w.hits / 2), 6);
      if (w.timer <= 0) {
        w.timer = 2.2;
        if (sim.turretCount(b) < max) sim.addTurret(b);
      }
    },
    stats: (w, b, sim) => ['Turrets: ' + (sim ? sim.turretCount(b) : 0) + '/' + Math.min(1 + Math.floor(w.hits / 2), 6)],
  });
  add({
    id: 'boomerang', name: 'Boomerang', cat: 'weapon', rarity: 'epic', color: '#2bb5a8',
    desc: 'Thrown out and back for 2 damage. +1 damage every hit.',
    base: { damage: 2, spin: 200, len: 26, width: 16 }, blocks: true,
    init(w) { w.timer = 0.5; w.thrown = false; },
    update(sim, b, w, dt) {
      if (w.thrown) return;
      w.timer -= dt;
      if (w.timer <= 0) {
        w.thrown = true;
        aimSpread(sim, b, w, 1, 0, 620, { kind: 'boomerang', r: 10 * w.scale, dmg: w.damage, life: 4, pierce: true });
        sim.emit({ type: 'shoot', x: b.x, y: b.y });
      }
    },
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'shield', name: 'Shield', cat: 'weapon', rarity: 'epic', color: '#4a6fa5',
    desc: 'Reflects projectiles back. Grows wider every hit.',
    base: { damage: 2, spin: 160, len: 12, width: 34, gap: 4 }, melee: true, blocks: true, perp: true, reflect: true, 
    onHit(sim, b, w) { w.width = Math.min(w.width + 4 * w.scale, 90 * w.scale); },
    stats: (w) => ['Size: ' + Math.round(w.width / w.scale)],
  });
  add({
    id: 'grimoire', name: 'Grimoire', cat: 'weapon', rarity: 'legendary', color: '#8e44ad',
    desc: 'Casts homing orbs. Every 2 hits adds one more orb.',
    base: { damage: 1, spin: 140, len: 24, width: 20 }, blocks: true,
    init(w) { w.timer = 1; w.orbs = 1; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = 2.3;
        aimSpread(sim, b, w, Math.floor(w.orbs), 360 / Math.max(1, Math.floor(w.orbs)), 300, { kind: 'orb', r: 7 * w.scale, dmg: w.damage, life: 4, homing: 4.5 });
        sim.emit({ type: 'shoot', x: b.x, y: b.y });
      }
    },
    onHit(sim, b, w) { w.orbs = Math.min(w.orbs + 0.5, 12); },
    stats: (w) => ['Orbs: ' + Math.floor(w.orbs)],
  });
  add({
    id: 'cannon', name: 'Cannon', cat: 'weapon', rarity: 'legendary', color: '#4b4f57',
    desc: 'Big 5 damage cannonballs that blast enemies back. Reloads 12% faster every hit.',
    base: { damage: 5, spin: 120, len: 32, width: 16 }, blocks: true,
    init(w) { w.reload = 1.5; w.timer = 0.6; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = w.reload;
        aimSpread(sim, b, w, 1, 0, 540, { kind: 'cannonball', r: 10 * w.scale, dmg: w.damage, life: 3, knock: 420 });
        sim.emit({ type: 'boom', x: b.x, y: b.y, small: true });
      }
    },
    onHit(sim, b, w) { w.reload = Math.max(0.7, w.reload * 0.88); },
    stats: (w) => ['Reload: ' + w.reload.toFixed(1) + 's'],
  });
  add({
    id: 'lance', name: 'Lance', cat: 'weapon', rarity: 'legendary', color: '#b8323b',
    desc: 'Damage depends on speed. Each hit makes you 6% faster.',
    base: { damage: 1, spin: 90, len: 78, width: 10 }, melee: true, blocks: true, 
    damageFn(sim, b, w) { return [Math.round((w.damage + Math.hypot(b.vx, b.vy) / 160) * 2) / 2, false]; },
    onHit(sim, b) { b.speedMul = Math.min(b.speedMul + 0.06, 2.6); },
    stats: (w, b) => ['Damage: ' + fmt(Math.round((w.damage + Math.hypot(b.vx, b.vy) / 160) * 2) / 2), 'Speed: ' + Math.round(b.speedMul * 100) + '%'],
  });
  add({
    id: 'dummy', name: 'Dummy', cat: 'weapon', rarity: 'common', color: '#d9c7a7',
    desc: 'Does absolutely nothing. Great for testing.',
    base: {},
    stats: () => ['Just vibing'],
  });

  // ---------------------------------------------------------------- special balls
  add({
    id: 'fibonacci', name: 'Fibonacci', cat: 'special', rarity: 'common', color: '#f2c230',
    desc: 'Every 2 slams, damage climbs the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13…',
    base: { damage: 1 }, contact: true,
    init(w) { w.fa = 1; w.fb = 1; w.damage = 1; },
    onHit(sim, b, w) { w.step = (w.step || 0) + 1; if (w.step % 2) return; const n = w.fa + w.fb; w.fa = w.fb; w.fb = n; w.damage = w.fa; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'speedy', name: 'Speedy', cat: 'special', rarity: 'rare', color: '#ff8a3d',
    desc: 'Body slams. Gets 15% faster and hits a bit harder every hit.',
    base: { damage: 1 }, contact: true,
    onHit(sim, b, w) { b.speedMul = Math.min(b.speedMul + 0.15, 3); w.damage += 0.25; },
    stats: (w, b) => ['Speed: ' + Math.round(b.speedMul * 100) + '%'],
  });
  add({
    id: 'grower', name: 'Grower', cat: 'special', rarity: 'rare', color: '#4cc9f0',
    desc: 'Grows bigger every hit. Bigger means harder slams.',
    base: { damage: 1 }, contact: true,
    onHit(sim, b, w) { b.r = Math.min(b.r * 1.1, b.baseR * 3); w.damage = Math.round((b.r / b.baseR) * 10) / 10 * 1.5; },
    stats: (w, b) => ['Size: ' + Math.round((b.r / b.baseR) * 100) + '%'],
  });
  add({
    id: 'spiky', name: 'Spiky', cat: 'special', rarity: 'rare', color: '#7d8792',
    desc: 'Covered in spikes for 2 slam damage. +0.5 damage every hit.',
    base: { damage: 2 }, contact: true,
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'gravitron', name: 'Gravitron', cat: 'special', rarity: 'epic', color: '#7b5cff',
    desc: 'Pulls enemies in close. +1 slam damage every hit.',
    base: { damage: 1 }, contact: true,
    update(sim, b, w, dt) {
      const R = 320 * w.scale;
      for (const e of sim.balls) {
        if (!e.alive || e.team === b.team) continue;
        const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy);
        if (d > 1 && d < R) { const f = 500 * (1 - d / R) * dt; e.vx += (dx / d) * f; e.vy += (dy / d) * f; }
      }
    },
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'splodey', name: 'Splodey', cat: 'special', rarity: 'epic', color: '#3a3a44',
    desc: 'Explodes every 3 seconds. Blasts get +1 damage every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 3; },
    contactDamage: () => 1,
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) { w.timer = 3; sim.explode(b, b.x, b.y, b.r * 4.2, w.damage); }
    },
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Blast: ' + fmt(w.damage)],
  });
  add({
    id: 'orbital', name: 'Orbital', cat: 'special', rarity: 'epic', color: '#3d8bf2',
    desc: 'Moons orbit and smack enemies. Every 2 hits adds a moon.',
    base: { damage: 1, spin: 170 }, moons: true,
    init(w) { w.moons = 2; },
    onHit(sim, b, w) { w.moons = Math.min(w.moons + 0.5, 10); },
    stats: (w) => ['Moons: ' + Math.floor(w.moons)],
  });
  add({
    id: 'duplicator', name: 'Duplicator', cat: 'special', rarity: 'legendary', color: '#ff6fb5',
    desc: 'Every hit spawns a mini clone that fights too (max 6).',
    base: { damage: 1 }, contact: true,
    onHit(sim, b) { if (sim.miniCount(b) < 6) sim.spawnMini(b); },
    stats: (w, b, sim) => ['Minis: ' + (sim ? sim.miniCount(b) : 0)],
  });
  add({
    id: 'vampire', name: 'Vampire', cat: 'special', rarity: 'legendary', color: '#b3122e',
    desc: 'Slams for 1.5 and heals all damage dealt. +0.5 damage every hit.',
    base: { damage: 1.5 }, contact: true,
    onHit(sim, b, w, t, dealt) { sim.heal(b, dealt); w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });

  // ---------------------------------------------------------------- newer balls
  add({
    id: 'rapier', name: 'Rapier', cat: 'weapon', rarity: 'rare', color: '#3ec1e8',
    desc: 'Long, thin and quick. +0.5 damage and +25°/s spin every hit.',
    base: { damage: 1, spin: 250, len: 64, width: 5 }, melee: true, blocks: true, hitCd: 0.2,
    onHit(sim, b, w) { w.damage += 0.5; w.spin = Math.min(w.spin + 25, 1600); },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Spin Speed: ' + Math.round(w.spin)],
  });
  add({
    id: 'pan', name: 'Frying Pan', cat: 'weapon', rarity: 'rare', color: '#e67e22',
    desc: 'BONK! Stuns the enemy weapon for a moment. +0.5 damage every hit.',
    base: { damage: 1.5, spin: 170, len: 40, width: 22 }, melee: true, blocks: true, 
    onHit(sim, b, w, t) { if (t) t.stunT = 0.7; w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Stun: 0.7s'],
  });
  add({
    id: 'trident', name: 'Trident', cat: 'weapon', rarity: 'epic', color: '#1abc9c',
    desc: 'Three prongs, 2 damage. Prongs widen and +0.5 damage every hit.',
    base: { damage: 2, spin: 150, len: 60, width: 14 }, melee: true, blocks: true,
    onHit(sim, b, w) { w.damage += 0.5; w.width = Math.min(w.width + 1.5 * w.scale, 40 * w.scale); },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'flail', name: 'Flail', cat: 'weapon', rarity: 'epic', color: '#6d4c41',
    desc: 'A spiked ball on a chain that swings behind the spin. +1 damage every hit.',
    base: { damage: 2, spin: 190, len: 56, width: 20 }, melee: true, blocks: true, flail: true,
    init(w) { w.head = 0; },
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'icestaff', name: 'Ice Staff', cat: 'weapon', rarity: 'epic', color: '#7fd3ff',
    desc: 'Freezes enemies: they move and spin at half speed. +0.5 damage every hit.',
    base: { damage: 1, spin: 200, len: 50, width: 12 }, melee: true, blocks: true,
    onHit(sim, b, w, t) { if (t) t.slowT = 1.6; w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage), 'Freeze: 1.6s'],
  });
  add({
    id: 'crossbow', name: 'Crossbow', cat: 'weapon', rarity: 'legendary', color: '#5d6d7e',
    desc: 'Fires heavy bolts that pierce through everything. +1 damage every hit.',
    base: { damage: 3, spin: 140, len: 30, width: 18 }, blocks: true,
    init(w) { w.timer = 0.7; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) {
        w.timer = 1.1;
        aimSpread(sim, b, w, 1, 0, 760, { kind: 'bolt2', r: 5 * w.scale, dmg: w.damage, life: 2, pierce: true, knock: 200 });
        sim.emit({ type: 'shoot', x: b.x, y: b.y });
      }
    },
    onHit(sim, b, w) { w.damage += 1; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'ghost', name: 'Ghost', cat: 'special', rarity: 'epic', color: '#c9d6ea',
    desc: 'Turns intangible for 1s every 3s (immune to damage). Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w) { w.timer = 2; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      b.phase = Math.max(0, (b.phase || 0) - dt);
      if (w.timer <= 0) { w.timer = 3; b.phase = 1; sim.ring(b.x, b.y, b.r, b.r * 1.8, '#c9d6ea', 0.3); }
    },
    onHit(sim, b, w) { w.damage += 0.5; },
    stats: (w) => ['Damage: ' + fmt(w.damage)],
  });
  add({
    id: 'bouncer', name: 'Bouncer', cat: 'special', rarity: 'rare', color: '#ff4fa3',
    desc: 'Every wall bounce charges +1 slam damage. A hit spends the charge.',
    base: { damage: 1 }, contact: true,
    init(w) { w.charge = 0; },
    onWall(sim, b, w) { w.charge = Math.min(w.charge + 1, 30); w.damage = 1 + w.charge; },
    onHit(sim, b, w) { w.charge = 0; w.damage = 1; },
    stats: (w) => ['Charge: +' + w.charge],
  });

  // Hidden: duplicator minis.
  BB.MINI = { id: 'mini', name: 'Mini', cat: 'hidden', rarity: 'common', base: { damage: 1, spin: 0, len: 0, width: 0, gap: 0 }, contact: true, stats: () => [] };

  BB.itemColor = (id) => (BB.ITEM[id] && BB.ITEM[id].color) || '#9aa0a6';
  BB.ITEM = {};
  for (const it of ITEMS) BB.ITEM[it.id] = it;
  BB.ITEM.mini = BB.MINI;

  // ---------------------------------------------------------------- maps
  BB.MAPS = [
    { id: 'classic', name: 'Classic', desc: 'The original square.', size: 600 },
    { id: 'large', name: 'Large', desc: 'A much bigger arena.', size: 900 },
    { id: 'bouncy', name: 'Bouncy', desc: 'Gravity is on. Boing!', size: 600, gravity: 650 },
    { id: 'pillars', name: 'Pillars', desc: 'Four pillars to bounce off.', size: 600 },
    { id: 'saws', name: 'Saws', desc: 'Spinning saws hurt everyone.', size: 600 },
    { id: 'shrink', name: 'Shrinking', desc: 'The walls close in.', size: 600 },
    { id: 'potato', name: 'Hot Potato', desc: 'Pass the bomb before it blows!', size: 600 },
    { id: 'meteor', name: 'Meteors', desc: 'Rocks fall from the sky.', size: 600 },
  ];
  BB.MAP = {};
  for (const m of BB.MAPS) BB.MAP[m.id] = m;

  // ---------------------------------------------------------------- modes
  BB.MODES = [
    { id: '1v1', name: '1 vs 1', desc: 'The classic duel.', teams: [[0], [1]] },
    { id: '2v2', name: '2 vs 2', desc: 'Team up in pairs.', teams: [[0, 1], [2, 3]] },
    { id: '3v3', name: '3 vs 3', desc: 'Full squad chaos.', teams: [[0, 1, 2], [3, 4, 5]] },
    { id: 'ffa', name: 'Free For All', desc: 'Four balls, one winner.', teams: [[0], [1], [2], [3]] },
  ];
  BB.MODE = {};
  for (const m of BB.MODES) BB.MODE[m.id] = m;

  BB.DEFAULT_SLOTS = ['unarmed', 'sword', 'dagger', 'spear', 'axe', 'unarmed'];
})();
