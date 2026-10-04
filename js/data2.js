// Expansion pack: 20 weapons + 10 special balls. Loaded after data.js.
(function () {
  const BB = window.BB;
  const fmt = BB.fmt;
  const D2R = Math.PI / 180, TAU = Math.PI * 2;
  BB.BALANCE = BB.BALANCE || {};

  function add(o) {
    o.base = Object.assign({ damage: 1, spin: 0, len: 0, width: 6, gap: 2 }, o.base || {});
    o.price = o.price != null ? o.price : BB.RARITY[o.rarity].price;
    BB.ITEMS.push(o);
    BB.ITEM[o.id] = o;
  }
  function shoot(sim, b, w, n, spreadDeg, speed, extra) {
    for (let i = 0; i < n; i++) {
      const a = w.angle + (i - (n - 1) / 2) * spreadDeg * D2R, s = b.r + w.gap + w.len;
      sim.spawnProj(Object.assign({ owner: b, x: b.x + Math.cos(a) * s, y: b.y + Math.sin(a) * s, vx: Math.cos(a) * speed + b.vx * 0.2, vy: Math.sin(a) * speed + b.vy * 0.2, angle: a }, extra));
    }
  }
  const dmgStat = (w) => ['Damage: ' + fmt(w.damage)];
  const melee = { melee: true, blocks: true };

  // ---------------------------------------------------------------- melee weapons
  add(Object.assign({ id: 'claymore', name: 'Claymore', cat: 'weapon', rarity: 'rare', color: '#2c5aa0',
    desc: 'A huge two-handed sword. Slow, but +1.5 damage every hit.',
    base: { damage: 2, spin: 125, len: 72, width: 12 }, knock: 280,
    onHit(sim, b, w) { w.damage += 1.5; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'sai', name: 'Sai', cat: 'weapon', rarity: 'common', color: '#c0392b',
    desc: 'Twin-pronged and very fast. +0.5 damage and +40°/s every hit.',
    base: { damage: 1, spin: 320, len: 34, width: 10 }, hitCd: 0.18,
    onHit(sim, b, w) { w.damage += 0.5; w.spin = Math.min(w.spin + 40, 2000); }, stats: (w) => ['Damage: ' + fmt(w.damage), 'Spin: ' + Math.round(w.spin)] }, melee));
  add(Object.assign({ id: 'halberd', name: 'Halberd', cat: 'weapon', rarity: 'epic', color: '#7f8c8d',
    desc: 'Very long polearm with an axe head. +1 damage every hit.',
    base: { damage: 2, spin: 115, len: 84, width: 14 }, knock: 300,
    onHit(sim, b, w) { w.damage += 1; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'mace', name: 'Mace', cat: 'weapon', rarity: 'rare', color: '#8e6e53',
    desc: 'Spiked head stuns the enemy weapon briefly. +0.5 damage every hit.',
    base: { damage: 2, spin: 150, len: 42, width: 18 }, knock: 300,
    onHit(sim, b, w, t) { if (t) t.stunT = 0.45; w.damage += 0.5; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'club', name: 'Club', cat: 'weapon', rarity: 'common', color: '#a0522d',
    desc: 'Simple and brutal. Massive knockback, +1 damage every hit.',
    base: { damage: 1, spin: 160, len: 44, width: 16 }, knock: 440,
    onHit(sim, b, w) { w.damage += 1; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'whip', name: 'Whip', cat: 'weapon', rarity: 'rare', color: '#9b59b6',
    desc: 'Super long reach that keeps growing. +0.5 damage every hit.',
    base: { damage: 1, spin: 300, len: 88, width: 4 }, hitCd: 0.2,
    onHit(sim, b, w) { w.damage += 0.5; w.len = Math.min(w.len + 5 * w.scale, 200 * w.scale); }, stats: (w) => ['Damage: ' + fmt(w.damage), 'Length: ' + Math.round(w.len / w.scale)] }, melee));
  add(Object.assign({ id: 'chainsaw', name: 'Chainsaw', cat: 'weapon', rarity: 'epic', color: '#e74c3c',
    desc: 'Grinds for tiny damage very rapidly. +0.25 damage every hit.',
    base: { damage: 0.5, spin: 150, len: 48, width: 15 }, hitCd: 0.08, knock: 60,
    onHit(sim, b, w) { w.damage += 0.25; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'pickaxe', name: 'Pickaxe', cat: 'weapon', rarity: 'common', color: '#5d6d7e',
    desc: 'Digs in hard. +1 damage every hit.',
    base: { damage: 1.5, spin: 170, len: 46, width: 18 },
    onHit(sim, b, w) { w.damage += 1; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'sickle', name: 'Sickle', cat: 'weapon', rarity: 'rare', color: '#16a085',
    desc: 'Quick curved blade that heals half the damage it deals. +0.5 damage every hit.',
    base: { damage: 1, spin: 260, len: 34, width: 16 },
    onHit(sim, b, w, t, dealt) { sim.heal(b, dealt * 0.5); w.damage += 0.5; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'broom', name: 'Broom', cat: 'weapon', rarity: 'common', color: '#d4ac0d',
    desc: 'Sweeps enemies across the arena. +0.5 damage and more knockback every hit.',
    base: { damage: 1, spin: 140, len: 64, width: 18 }, knock: 460,
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat }, melee));
  add({ id: 'umbrella', name: 'Umbrella', cat: 'weapon', rarity: 'epic', color: '#e84393',
    desc: 'Opens wide to reflect projectiles. Grows every hit.',
    base: { damage: 1.5, spin: 150, len: 10, width: 40, gap: 6 }, melee: true, blocks: true, perp: true, reflect: true, knock: 260,
    onHit(sim, b, w) { w.width = Math.min(w.width + 4 * w.scale, 96 * w.scale); }, stats: (w) => ['Size: ' + Math.round(w.width / w.scale)] });
  add(Object.assign({ id: 'guitar', name: 'Guitar', cat: 'weapon', rarity: 'epic', color: '#e67e22',
    desc: 'Smashes up close and plays a damaging sound wave every 3s. Waves get louder every hit.',
    base: { damage: 1, spin: 170, len: 50, width: 18 },
    init(w) { w.timer = 2; w.wave = 1; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer <= 0) { w.timer = 3; sim.explode(b, b.x, b.y, b.r * 5, w.wave); }
    },
    onHit(sim, b, w) { w.wave += 0.5; }, stats: (w) => ['Melee: ' + fmt(w.damage), 'Wave: ' + fmt(w.wave)] }, melee));
  add(Object.assign({ id: 'baguette', name: 'Baguette', cat: 'weapon', rarity: 'common', color: '#e5b770',
    desc: 'Every bonk heals you a little more. Delicious.',
    base: { damage: 1.5, spin: 180, len: 52, width: 13 },
    init(w) { w.heal = 1; },
    onHit(sim, b, w) { sim.heal(b, w.heal); w.heal += 0.5; }, stats: (w) => ['Damage: ' + fmt(w.damage), 'Heal: ' + fmt(w.heal)] }, melee));
  add(Object.assign({ id: 'fish', name: 'Fish', cat: 'weapon', rarity: 'rare', color: '#48c9b0',
    desc: 'A slippery slap with huge knockback. +0.5 damage every hit.',
    base: { damage: 1, spin: 220, len: 46, width: 18 }, knock: 520,
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat }, melee));
  add(Object.assign({ id: 'paintbrush', name: 'Paintbrush', cat: 'weapon', rarity: 'epic', color: '#ff6b81',
    desc: 'Paints enemies: painted balls take 30% more damage from everything.',
    base: { damage: 1, spin: 230, len: 44, width: 14 },
    onHit(sim, b, w, t) { if (t) t.paintT = 3; w.damage += 0.5; }, stats: (w) => ['Damage: ' + fmt(w.damage), 'Paint: 3s'] }, melee));

  // ---------------------------------------------------------------- ranged weapons
  add({ id: 'kunai', name: 'Kunai', cat: 'weapon', rarity: 'rare', color: '#2c3e50',
    desc: 'Throws a fan of kunai. Every 2 hits adds another blade.',
    base: { damage: 1, spin: 200, len: 26, width: 10 }, blocks: true,
    init(w) { w.timer = 0.6; w.n = 3; },
    update(sim, b, w, dt) { w.timer -= dt; if (w.timer <= 0) { w.timer = 0.95; shoot(sim, b, w, Math.floor(w.n), 14, 760, { kind: 'kunai', r: 4 * w.scale, dmg: w.damage, life: 1.6 }); sim.emit({ type: 'shoot', x: b.x, y: b.y }); } },
    onHit(sim, b, w) { w.n = Math.min(w.n + 0.5, 9); }, stats: (w) => ['Kunai: ' + Math.floor(w.n)] });
  add({ id: 'javelin', name: 'Javelin', cat: 'weapon', rarity: 'epic', color: '#b9770e',
    desc: 'Throws heavy javelins that pierce. +1 damage every hit.',
    base: { damage: 3, spin: 130, len: 60, width: 8 }, blocks: true,
    init(w) { w.timer = 1; },
    update(sim, b, w, dt) { w.timer -= dt; if (w.timer <= 0) { w.timer = 1.05; shoot(sim, b, w, 1, 0, 900, { kind: 'javelin', r: 6 * w.scale, dmg: w.damage, life: 1.5, pierce: true, knock: 260 }); sim.emit({ type: 'shoot', x: b.x, y: b.y }); } },
    onHit(sim, b, w) { w.damage += 1; }, stats: dmgStat });
  add({ id: 'slingshot', name: 'Slingshot', cat: 'weapon', rarity: 'common', color: '#a04000',
    desc: 'Rapid bouncing pebbles. +0.5 damage every hit.',
    base: { damage: 1, spin: 210, len: 28, width: 16 }, blocks: true,
    init(w) { w.timer = 0.4; },
    update(sim, b, w, dt) { w.timer -= dt; if (w.timer <= 0) { w.timer = 0.55; shoot(sim, b, w, 1, 0, 600, { kind: 'pebble', r: 5 * w.scale, dmg: w.damage, life: 2.5, bounces: 1 }); sim.emit({ type: 'shoot', x: b.x, y: b.y, small: true }); } },
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat });
  add({ id: 'bubblewand', name: 'Bubble Wand', cat: 'weapon', rarity: 'rare', color: '#74b9ff',
    desc: 'Blows homing bubbles that slow whatever they pop on. Every 2 hits adds a bubble.',
    base: { damage: 1, spin: 160, len: 40, width: 16 }, blocks: true,
    init(w) { w.timer = 0.8; w.n = 2; },
    update(sim, b, w, dt) { w.timer -= dt; if (w.timer <= 0) { w.timer = 1.6; shoot(sim, b, w, Math.floor(w.n), 30, 280, { kind: 'bubble', r: 9 * w.scale, dmg: w.damage, life: 4, homing: 2.5, slow: 1.2 }); sim.emit({ type: 'shoot', x: b.x, y: b.y, small: true }); } },
    onHit(sim, b, w) { w.n = Math.min(w.n + 0.5, 8); }, stats: (w) => ['Bubbles: ' + Math.floor(w.n)] });
  add({ id: 'firestaff', name: 'Fire Staff', cat: 'weapon', rarity: 'epic', color: '#d35400',
    desc: 'Launches fireballs that set enemies ablaze. Flames burn hotter every hit.',
    base: { damage: 2, spin: 170, len: 50, width: 12 }, melee: true, blocks: true,
    init(w) { w.timer = 0.9; w.burn = 1; },
    update(sim, b, w, dt) { w.timer -= dt; if (w.timer <= 0) { w.timer = 1.4; shoot(sim, b, w, 1, 0, 520, { kind: 'fireball', r: 9 * w.scale, dmg: w.damage, life: 2.5, burn: w.burn }); sim.emit({ type: 'shoot', x: b.x, y: b.y }); } },
    onHit(sim, b, w) { w.burn += 1; }, stats: (w) => ['Fireball: ' + fmt(w.damage), 'Burn: ' + w.burn + '/s'] });
  add({ id: 'thunderrod', name: 'Thunder Rod', cat: 'weapon', rarity: 'legendary', color: '#f1c40f',
    desc: 'Zaps the nearest enemy with lightning every 3s, anywhere in the arena. Zaps grow every hit.',
    base: { damage: 2, spin: 160, len: 46, width: 12 }, melee: true, blocks: true,
    init(w) { w.timer = 1.2; w.zap = 2; },
    update(sim, b, w, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      w.timer = 3;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      if (!e) return;
      const tipA = w.angle, s = b.r + w.gap + w.len;
      sim.fx.push({ k: 'z', x: b.x + Math.cos(tipA) * s, y: b.y + Math.sin(tipA) * s, x2: e.x, y2: e.y, life: 0.25, max: 0.25 });
      const dealt = sim.damage(e, w.zap, b, { x: e.x, y: e.y, lag: true });
      sim.emit({ type: 'boom', x: e.x, y: e.y, small: true });
      if (dealt) sim.onHit(b, e, dealt);
    },
    onHit(sim, b, w) { w.zap += 0.25; }, stats: (w) => ['Zap: ' + fmt(w.zap)] });

  // ---------------------------------------------------------------- special balls
  add({ id: 'magnet', name: 'Magnet', cat: 'special', rarity: 'rare', color: '#d63031',
    desc: 'Repels enemy projectiles and pulls enemies in. +1 slam damage every hit.',
    base: { damage: 1.5 }, contact: true,
    update(sim, b, w, dt) {
      for (const p of sim.proj) {
        if (p.team === b.team) continue;
        const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        if (d > 1 && d < 170) { const f = 2600 * (1 - d / 170) * dt; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      }
      for (const e of sim.balls) {
        if (!e.alive || e.team === b.team) continue;
        const dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy);
        if (d > 1 && d < 260) { const f = 280 * (1 - d / 260) * dt; e.vx += (dx / d) * f; e.vy += (dy / d) * f; }
      }
    },
    onHit(sim, b, w) { w.damage += 1; }, stats: dmgStat });
  add({ id: 'mirror', name: 'Mirror', cat: 'special', rarity: 'epic', color: '#dfe6e9',
    desc: 'Its shiny body reflects every projectile. Slams for 1.5, +0.5 every hit.',
    base: { damage: 1.5 }, contact: true, mirrorBody: true,
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat });
  add({ id: 'healer', name: 'Healer', cat: 'special', rarity: 'rare', color: '#55efc4',
    desc: 'Regenerates 1.5 HP per second. +0.5 slam damage every hit.',
    base: { damage: 1 }, contact: true,
    update(sim, b, w, dt) { if (b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 1.5 * dt); },
    onHit(sim, b, w) { w.damage += 0.5; }, stats: (w) => ['Damage: ' + fmt(w.damage), 'Regen: 1.5/s'] });
  add({ id: 'tank', name: 'Tank', cat: 'special', rarity: 'epic', color: '#4a5d23',
    desc: '60% more health but slower. Slams for 2, +0.5 every hit.',
    base: { damage: 2 }, contact: true,
    init(w, b) { b.hp = b.maxHp = Math.round(b.maxHp * 1.6); b.speed *= 0.72; b.r = b.baseR = b.baseR * 1.2; },
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat });
  add({ id: 'tiny', name: 'Tiny', cat: 'special', rarity: 'common', color: '#fd79a8',
    desc: 'Small and super fast, hard to hit. +0.5 slam damage every hit.',
    base: { damage: 1 }, contact: true,
    init(w, b) { b.r = b.baseR = b.baseR * 0.62; b.speed *= 1.45; },
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat });
  add({ id: 'phoenix', name: 'Phoenix', cat: 'special', rarity: 'legendary', color: '#ff7f11',
    desc: 'Rises from the ashes once with 40% health. Burning slams, +0.5 every hit.',
    base: { damage: 1.5 }, contact: true, revive: true,
    onHit(sim, b, w, t) { if (t) { t.burnLvl = Math.max(t.burnLvl, 1); t.burnT = 2; } w.damage += 0.5; },
    stats: (w, b) => ['Damage: ' + fmt(w.damage), b && b.revived ? 'Revived' : 'Revive ready'] });
  add({ id: 'thorns', name: 'Thorns', cat: 'special', rarity: 'rare', color: '#27ae60',
    desc: 'Hurts attackers for 35% of the damage they deal to it.',
    base: { damage: 1 }, contact: true,
    onDamaged(sim, b, amt, src) { if (src && src.alive && src !== b && src.team !== b.team) sim.damage(src, amt * 0.35, null, { dot: true, color: '#27ae60' }); },
    onHit(sim, b, w) { w.damage += 0.5; }, stats: (w) => ['Damage: ' + fmt(w.damage), 'Reflect: 35%'] });
  add({ id: 'jelly', name: 'Jelly', cat: 'special', rarity: 'epic', color: '#a29bfe',
    desc: 'Splits into two jellylets when knocked out. +0.5 slam damage every hit.',
    base: { damage: 1.5 }, contact: true, splits: true,
    onHit(sim, b, w) { w.damage += 0.5; }, stats: dmgStat });
  add({ id: 'rage', name: 'Rage', cat: 'special', rarity: 'legendary', color: '#b71540',
    desc: 'Hits harder the more hurt it is: up to 9 slam damage at low health.',
    base: { damage: 1 }, contact: true,
    contactDamage: (w) => w.rage || 1,
    update(sim, b, w) { w.rage = Math.round((1 + (1 - b.hp / b.maxHp) * 8) * 2) / 2; },
    stats: (w) => ['Damage: ' + fmt(w.rage || 1)] });
  add({ id: 'snowball', name: 'Snowball', cat: 'special', rarity: 'rare', color: '#ecf0f1',
    desc: 'Keeps growing as it rolls. Bigger means harder slams.',
    base: { damage: 1 }, contact: true,
    update(sim, b, w, dt) { b.r = Math.min(b.r * (1 + 0.03 * dt), b.baseR * 2.4); w.damage = Math.round((b.r / b.baseR) * 2 * 2) / 2; },
    stats: (w, b) => ['Size: ' + Math.round((b.r / b.baseR) * 100) + '%'] });

  // Hidden: jelly splits.
  BB.ITEM.jellylet = { id: 'jellylet', name: 'Jellylet', cat: 'hidden', rarity: 'common', color: '#a29bfe', base: { damage: 1, spin: 0, len: 0, width: 0, gap: 0 }, contact: true, stats: () => [] };
})();
