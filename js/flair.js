// Flair: signature gimmicks and animations for the paid balls, so buying one feels special.
// Phoenix gets a real rebirth; the legendaries/epics get visual identity in battle.
// Loaded after data4.js. Gameplay randomness uses sim.rng(); visuals use sim.frng().
(function () {
  const BB = window.BB, I = BB.ITEM, TAU = Math.PI * 2;

  // ---------------------------------------------------------------- Phoenix: rebirth in fire
  // Instead of silently popping back: it hovers untouchable in a pillar of flame for 0.9s,
  // then erupts in a fire nova that burns and blasts back every enemy nearby.
  const ph = I.phoenix;
  ph.revive = false;
  ph.desc = 'Rises from the ashes once: a pillar of fire, then a burning nova blasts enemies away and it returns with 50% health. Burning slams, +0.5 every hit.';
  ph.beforeDeath = function (sim, b) {
    if (b.reborn || !b.main) return false;
    b.reborn = true; b.hp = 1; b.w.rebirth = 0.9; b.hold = true;
    sim.fxTag(b.x, b.y - b.r - 28, 'REBIRTH', '#ffb142');
    sim.ring(b.x, b.y, b.r, b.r * 2.2, '#ffd23f', 0.4);
    sim.emit({ type: 'boom', x: b.x, y: b.y, small: true });
    return true;
  };
  ph.reduce = (sim, b, a) => (b.w.rebirth > 0 ? 0 : a); // untouchable while reforming
  const phUp = ph.update;
  ph.update = function (sim, b, w, dt) {
    if (phUp) phUp(sim, b, w, dt);
    if (!(w.rebirth > 0)) return;
    w.rebirth -= dt;
    b.hp = Math.min(b.maxHp * 0.5, b.hp + b.maxHp * 0.5 * (dt / 0.9));
    for (let i = 0; i < 3; i++) sim.fx.push({ k: 'p', x: b.x + (sim.frng() - 0.5) * b.r * 1.6, y: b.y + b.r, vx: (sim.frng() - 0.5) * 40, vy: -220 - sim.frng() * 160, life: 0.6, max: 0.6, c: sim.frng() < 0.5 ? '#ff7a1a' : '#ffd23f', s: 4 });
    if (w.rebirth > 0) return;
    b.hold = false; b.hp = b.maxHp * 0.5;
    const R = b.r * 5.5;
    sim.ring(b.x, b.y, b.r, R, '#ff7a1a', 0.5); sim.ring(b.x, b.y, b.r, R * 0.7, '#ffd23f', 0.4);
    sim.burst(b.x, b.y, 40, ['#ffd23f', '#ff7a1a', '#ff3d1f', '#ffffff'], 520, 6);
    for (const e of sim.balls) {
      if (!e.alive || e.team === b.team || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (R + e.r) ** 2) continue;
      sim.damage(e, 3, b, { x: e.x, y: e.y, lag: true });
      if (e._dg) continue;
      e.burnLvl = Math.max(e.burnLvl, 2); e.burnT = Math.max(e.burnT, 3);
      sim.knock(e, b.x, b.y, 560); sim.launch(e, b.x, b.y);
    }
    sim.fxTag(b.x, b.y - b.r - 28, 'REBORN!', '#ff7a1a');
    sim.emit({ type: 'boom', x: b.x, y: b.y });
  };
  ph.stats = (w, b) => ['Damage: ' + BB.fmt(w.damage), b && b.reborn ? 'Reborn' : 'Rebirth ready'];

  // ---------------------------------------------------------------- Rage: it visibly boils over
  const rageUp = I.rage.update;
  I.rage.update = function (sim, b, w, dt) {
    rageUp(sim, b, w, dt);
    const k = b.hp / b.maxHp;
    if (k < 0.5 && !w.tag1) { w.tag1 = true; sim.fxTag(b.x, b.y - b.r - 24, 'ENRAGED', '#ff4757'); }
    if (k < 0.2 && !w.tag2) { w.tag2 = true; sim.fxTag(b.x, b.y - b.r - 24, 'BERSERK!', '#ff4757'); sim.ring(b.x, b.y, b.r, b.r * 3, '#ff4757', 0.4); }
  };

  // ---------------------------------------------------------------- shooters aim before they fire
  // Crossbow and Javelin used to fire wherever the spinning weapon happened to point. Now the
  // weapon snaps onto the nearest enemy for the shot.
  for (const id of ['crossbow', 'javelin']) {
    const it = I[id], up = it.update;
    it.update = function (sim, b, w, dt) {
      if (w.timer - dt <= 0) { const e = sim.nearestEnemy(b.team, b.x, b.y); if (e) w.angle = Math.atan2(e.y - b.y, e.x - b.x); }
      up(sim, b, w, dt);
    };
  }
  // aimed shots are much deadlier: slower reload and gentler scaling to compensate
  for (const [id, gap] of [['crossbow', 1.7], ['javelin', 1.6]]) {
    const it = I[id], up = it.update;
    it.update = function (sim, b, w, dt) { const before = w.timer; up(sim, b, w, dt); if (w.timer > before) w.timer = gap; };
    it.onHit = (sim, b, w) => { w.damage += 0.5; };
  }
  I.crossbow.desc = 'Takes aim and fires heavy bolts that pierce through everything. +0.5 damage every hit.';
  I.javelin.desc = 'Takes aim and throws heavy javelins that pierce. +0.5 damage every hit.';

  // ---------------------------------------------------------------- Duplicator: a real army
  // Clones are tougher and grow with every hit the Duplicator lands (up to 8 at once).
  I.duplicator.desc = 'Every hit spawns a mini clone that fights too (up to 8). Clones get stronger the more it hits.';
  I.duplicator.onHit = function (sim, b, w) {
    if (sim.miniCount(b) >= 8) return;
    sim.spawnMini(b);
    const m = sim.balls[sim.balls.length - 1];
    m.hp = m.maxHp = 20; m.w.damage = 1 + w.hits * 0.25;
    sim.burst(m.x, m.y, 8, ['#ff6fb5', '#ffffff'], 220, 3);
  };

  // ---------------------------------------------------------------- Lance: lines up, then charges
  const lance = I.lance;
  lance.desc = 'Charges at an enemy whenever the lance lines up with it. Damage depends on speed; each hit makes it 6% faster.';
  lance.update = function (sim, b, w, dt) {
    w.dashCd = (w.dashCd || 0.8) - dt;
    if (w.dashCd > 0 || b.stunT > 0) return;
    const e = sim.nearestEnemy(b.team, b.x, b.y);
    if (!e || (e.x - b.x) ** 2 + (e.y - b.y) ** 2 > 420 * 420) return;
    let da = Math.atan2(e.y - b.y, e.x - b.x) - w.angle;
    while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    if (Math.abs(da) > 0.16) return;
    w.dashCd = 2.2;
    const a = Math.atan2(e.y - b.y, e.x - b.x), sp = b.speed * b.speedMul * 2.4;
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.flyT = 0.4;
    sim.fxTag(b.x, b.y - b.r - 22, 'CHARGE!', '#ff6b6b');
    sim.emit({ type: 'shoot', x: b.x, y: b.y, small: true });
  };

  // ---------------------------------------------------------------- King: daily-reward exclusive, a real court
  const king = I.king;
  king.dailyOnly = true; // Day 7 of the daily rewards, can't be bought
  king.desc = 'Daily-reward exclusive. Summons a knight every 5s (up to 3) that grows with the King. Every 9s a Royal Decree sends all knights charging while the King is guarded. Once per battle a knight takes a killing blow for it. Slams for 2, +0.5 every hit.';
  king.init = (w) => { w.timer = 1.5; w.decree = 6; w.guard = 0; };
  king.update = function (sim, b, w, dt) {
    w.timer -= dt; w.decree -= dt; if (w.guard > 0) w.guard -= dt;
    const court = sim.balls.filter((m) => m.alive && m.owner === b);
    for (const k of court) k.w.damage = Math.max(k.w.damage, 1 + w.hits * 0.3);
    if (w.timer <= 0) {
      w.timer = 5;
      if (court.length < 3) {
        const a = sim.rng() * TAU, k = sim.makeBall(BB.ITEM.knight, b.team, b.x + Math.cos(a) * b.r * 2, b.y + Math.sin(a) * b.r * 2, { hp: 30, scale: 0.62, main: false, owner: b });
        k.name = 'Knight'; k.w.damage = 1 + w.hits * 0.3;
        sim.ring(k.x, k.y, 4, 40, '#f1c40f', 0.35); sim.fxTag(b.x, b.y - b.r - 24, 'ARISE, KNIGHT', '#f1c40f');
      }
    }
    if (w.decree <= 0 && court.length) {
      w.decree = 9; w.guard = 1.5;
      const e = sim.nearestEnemy(b.team, b.x, b.y);
      for (const k of court) if (e) { const a = Math.atan2(e.y - k.y, e.x - k.x), sp = k.speed * 2.8; k.vx = Math.cos(a) * sp; k.vy = Math.sin(a) * sp; k.flyT = 0.4; }
      sim.ring(b.x, b.y, b.r, b.r * 4, '#ffd23f', 0.45);
      sim.fxTag(b.x, b.y - b.r - 24, 'ROYAL DECREE', '#ffd23f');
      sim.emit({ type: 'boom', x: b.x, y: b.y, small: true });
    }
  };
  king.reduce = (sim, b, a) => (b.w.guard > 0 ? a * 0.5 : a);
  // Long live the King: once per battle a knight takes the killing blow
  king.beforeDeath = function (sim, b) {
    if (b.w.saved || !b.main) return false;
    const k = sim.balls.find((m) => m.alive && m.owner === b);
    if (!k) return false;
    b.w.saved = true; b.hp = b.maxHp * 0.35;
    k.alive = false; sim.burst(k.x, k.y, 16, ['#f1c40f', '#ffffff'], 300, 4);
    sim.ring(b.x, b.y, b.r, b.r * 4, '#f1c40f', 0.5);
    sim.fxTag(b.x, b.y - b.r - 26, 'LONG LIVE THE KING!', '#ffd23f');
    sim.emit({ type: 'boom', x: b.x, y: b.y });
    return true;
  };
  king.stats = (w) => ['Damage: ' + BB.fmt(w.damage), 'Decree: ' + Math.max(0, Math.ceil(w.decree)) + 's'];

  if (typeof document === 'undefined') return;
  // ================================================================ art
  const OUT = '#1d1d22';
  const RARE_FX = { epic: ['#c56cf0', '#ffffff'], legendary: ['#ffd23f', '#fff6d6'] };

  function wing(ctx, x, y, r, side, flap, fill, edge) {
    ctx.save(); ctx.translate(x, y); ctx.scale(side, 1); ctx.rotate(-0.35 - flap * 0.45);
    ctx.beginPath(); ctx.moveTo(r * 0.5, 0);
    ctx.quadraticCurveTo(r * 1.6, -r * 1.3, r * 2.3, -r * 0.6);
    ctx.quadraticCurveTo(r * 1.9, -r * 0.35, r * 2.05, -r * 0.05);
    ctx.quadraticCurveTo(r * 1.6, -r * 0.1, r * 1.65, r * 0.3);
    ctx.quadraticCurveTo(r * 1.1, r * 0.1, r * 0.5, r * 0.35); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = edge; ctx.stroke();
    ctx.restore();
  }

  const baseBall = BB.drawBallArt;
  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    const id = b.def.id, w = b.w, t = sim.t, r = b.r;
    // ---- under the ball
    if (id === 'phoenix') {
      const flap = 0.5 + 0.5 * Math.sin(t * (b.reborn ? 9 : 6));
      const g = ctx.createLinearGradient(b.x, b.y - r, b.x, b.y + r);
      g.addColorStop(0, '#ffd23f'); g.addColorStop(1, '#ff3d1f');
      ctx.save(); ctx.globalAlpha = b.reborn ? 0.95 : 0.8;
      wing(ctx, b.x, b.y, r, 1, flap, g, '#b33939'); wing(ctx, b.x, b.y, r, -1, flap, g, '#b33939');
      ctx.restore();
      if (w.rebirth > 0) {
        // pillar of fire while it reforms
        const k = w.rebirth / 0.9, H = r * 7;
        const pg = ctx.createLinearGradient(b.x, b.y + r, b.x, b.y - H);
        pg.addColorStop(0, 'rgba(255,190,40,0.85)'); pg.addColorStop(0.5, 'rgba(255,110,20,0.6)'); pg.addColorStop(1, 'rgba(255,61,31,0)');
        ctx.save(); ctx.fillStyle = pg;
        const wdt = r * (1.1 + 0.25 * Math.sin(t * 30));
        ctx.beginPath(); ctx.moveTo(b.x - wdt, b.y + r); ctx.quadraticCurveTo(b.x - wdt * 0.6, b.y - H * 0.5, b.x, b.y - H); ctx.quadraticCurveTo(b.x + wdt * 0.6, b.y - H * 0.5, b.x + wdt, b.y + r); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(b.x, b.y, r * (1.2 + (1 - k) * 0.8), 0, TAU); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.stroke();
        ctx.restore();
      }
    }
    if (id === 'vampire') {
      const flap = 0.5 + 0.5 * Math.sin(t * 8);
      for (const sd of [1, -1]) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(sd, 1); ctx.rotate(-0.2 - flap * 0.5);
        ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 2.1, -r * 0.9); ctx.quadraticCurveTo(r * 1.9, -r * 0.3, r * 2.2, r * 0.1);
        ctx.quadraticCurveTo(r * 1.7, -r * 0.05, r * 1.6, r * 0.4); ctx.quadraticCurveTo(r * 1.2, r * 0.1, r * 0.9, r * 0.45); ctx.closePath();
        ctx.fillStyle = '#2d0a14'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#b3122e'; ctx.stroke(); ctx.restore();
      }
    }
    if (id === 'lance' && b.speedMul > 1.2) {
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = -b.vx / sp, uy = -b.vy / sp, k = Math.min(1, (b.speedMul - 1.2) / 1.5);
      ctx.save(); ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const ox = -uy * i * r * 0.35, oy = ux * i * r * 0.35, L = r * (1.5 + (2 - Math.abs(i)) * 0.7) * (0.5 + k);
        ctx.beginPath(); ctx.moveTo(b.x + ux * r + ox, b.y + uy * r + oy); ctx.lineTo(b.x + ux * (r + L) + ox, b.y + uy * (r + L) + oy); ctx.strokeStyle = 'rgba(255,255,255,' + 0.7 * (0.4 + k) + ')'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.restore();
    }
    if (id === 'rage') {
      const k = 1 - b.hp / b.maxHp, pulse = 0.5 + 0.5 * Math.sin(t * (4 + k * 10));
      const g = ctx.createRadialGradient(b.x, b.y, r * 0.9, b.x, b.y, r * (1.25 + k * 0.5));
      g.addColorStop(0, 'rgba(255,40,60,' + (0.08 + k * 0.22) * (0.6 + pulse * 0.4) + ')'); g.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r * (1.25 + k * 0.5), 0, TAU); ctx.fill();
      // eruption: every so often (more often the angrier it gets) a little mushroom cloud
      // puffs up out of the top of the ball. Drawn purely from time, nothing touches the battle.
      const every = 2.6 - k * 1.6, n = Math.floor(t / every);
      if (b.alive && n !== b._erN) { b._erN = n; if (n > 0) b._erT = t; }
      const e = b._erT != null && b.alive ? (t - b._erT) / 0.9 : 1;
      if (e >= 0 && e < 1) {
        const ease = 1 - Math.pow(1 - e, 3), fade = e < 0.7 ? 1 : 1 - (e - 0.7) / 0.3;
        const top = b.y - r * 0.9, H = r * (0.6 + 1.3 * ease), cy = top - H, cw = r * (0.4 + 0.65 * ease);
        ctx.save(); ctx.globalAlpha = 0.9 * fade;
        // stem: a short column that narrows toward the cap
        ctx.beginPath(); ctx.moveTo(b.x - r * 0.28, top + r * 0.1); ctx.quadraticCurveTo(b.x - r * 0.12, top - H * 0.5, b.x - r * 0.16, cy + cw * 0.3);
        ctx.lineTo(b.x + r * 0.16, cy + cw * 0.3); ctx.quadraticCurveTo(b.x + r * 0.12, top - H * 0.5, b.x + r * 0.28, top + r * 0.1); ctx.closePath();
        ctx.fillStyle = e < 0.35 ? '#ff9a3c' : '#c9bdb4'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(17,17,17,0.6)'; ctx.stroke();
        // cap: a puffy dome of overlapping billows, glowing orange underneath, cooling to smoke
        const puffs = [[-0.95, 0.2, 0.4], [0.95, 0.2, 0.4], [-0.5, -0.15, 0.55], [0.5, -0.15, 0.55], [0, -0.35, 0.62], [0, 0.15, 0.55]];
        const hot = Math.max(0, 1 - e * 1.6);
        for (const pass of [0, 1]) for (const [px, py, pr] of puffs) {
          ctx.beginPath(); ctx.arc(b.x + px * cw, cy + py * cw, pr * cw + (pass ? 0 : 2), 0, TAU);
          ctx.fillStyle = pass ? `rgb(${Math.round(190 + 65 * hot)},${Math.round(180 - 10 * hot)},${Math.round(172 - 112 * hot)})` : 'rgba(17,17,17,0.6)'; ctx.fill();
        }
        // a skirt ring at the base of the cap
        ctx.beginPath(); ctx.ellipse(b.x, cy + cw * 0.45, cw * 1.05, cw * 0.22, 0, 0, TAU); ctx.fillStyle = 'rgba(255,140,60,' + 0.5 * hot + ')'; ctx.fill();
        ctx.restore();
      }
    }
    if (id === 'duplicator') {
      const wob = Math.sin(t * 5) * 0.08;
      ctx.save(); ctx.globalAlpha = 0.45; ctx.beginPath();
      ctx.ellipse(b.x - r * 0.25, b.y, r * (1.12 + wob), r * (1.05 - wob), 0, 0, TAU); ctx.ellipse(b.x + r * 0.25, b.y, r * (1.12 - wob), r * (1.05 + wob), 0, 0, TAU);
      ctx.fillStyle = BB.itemColor('duplicator'); ctx.fill(); ctx.restore();
    }
    if (id === 'king' && w.guard > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, w.guard * 2) * 0.7; ctx.beginPath(); ctx.arc(b.x, b.y, r + 9, 0, TAU);
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 40; ctx.stroke(); ctx.restore();
    }
    baseBall(ctx, sim, b, lw, R);
    if (id === 'knight') { // a little helmet plume so knights read as the King's court
      ctx.save(); ctx.beginPath(); ctx.moveTo(b.x - r * 0.2, b.y - r * 0.9); ctx.quadraticCurveTo(b.x + r * 0.2, b.y - r * 1.9, b.x + r * 0.9, b.y - r * 1.4);
      ctx.quadraticCurveTo(b.x + r * 0.3, b.y - r * 1.3, b.x + r * 0.2, b.y - r * 0.85); ctx.closePath(); ctx.fillStyle = '#e74c3c'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
    }
    // ---- over the ball (rim details; the middle stays clear for the HP number)
    if (id === 'grimoire') {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.2 + (i / 3) * TAU, x = b.x + Math.cos(a) * (r + 14), y = b.y + Math.sin(a) * (r + 14) * 0.7 - 4;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3 + i) * 0.3);
        ctx.beginPath(); ctx.rect(-6, -4, 12, 8); ctx.fillStyle = '#f5ecd7'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#8e44ad'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.moveTo(-4, -1); ctx.lineTo(-1, -1); ctx.moveTo(1, 1); ctx.lineTo(4, 1); ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
    }
    if (id === 'thunderrod' && Math.sin(t * 17) > 0.2) {
      ctx.save(); ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (let i = 0; i < 2; i++) { const a = t * 7 + i * Math.PI, x0 = b.x + Math.cos(a) * r, y0 = b.y + Math.sin(a) * r;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a + 0.6) * 7, y0 + Math.sin(a + 0.6) * 7); ctx.lineTo(x0 + Math.cos(a - 0.3) * 12, y0 + Math.sin(a - 0.3) * 12); ctx.stroke(); }
      ctx.restore();
    }
    if (id === 'vampire') {
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(b.x + sd * r * 0.22, b.y + r * 0.62); ctx.lineTo(b.x + sd * r * 0.14, b.y + r * 0.85); ctx.lineTo(b.x + sd * r * 0.06, b.y + r * 0.62); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    }
    // rarity glow: epic and legendary balls get a soft pulsing halo (no particles)
    const fx = b.main && b.alive && RARE_FX[b.def.rarity];
    if (fx) {
      const k = 0.5 + 0.5 * Math.sin(t * 3 + b.x * 0.01), R2 = r * (1.28 + 0.08 * k);
      const g = ctx.createRadialGradient(b.x, b.y, r, b.x, b.y, R2);
      g.addColorStop(0, fx[0]); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha = 0.16 + 0.14 * k;
      ctx.beginPath(); ctx.arc(b.x, b.y, R2, 0, TAU); ctx.arc(b.x, b.y, r, 0, TAU, true); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    }
  };
})();
