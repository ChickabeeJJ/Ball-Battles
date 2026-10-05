// Battle simulation: physics, weapons, projectiles, map hazards. No DOM access,
// so it also runs headless (used to pick seeds for the preview videos).
(function () {
  const BB = window.BB;
  const geo = BB.geo;
  const TAU = Math.PI * 2;
  const D2R = Math.PI / 180;
  const BALL_R = 34;
  const BASE_SPEED = 620;
  // Content numbers in data.js are authored for a smaller ball; these scale them up.
  const SEEK = 0.9;
  const LEN_K = 1.55, WIDTH_K = 1.25, PROJ_K = 1.35;

  function makeWeapon(def, ov, scale) {
    const b = def.base;
    return {
      damage: ov.damage > 0 ? ov.damage : b.damage,
      spin: ov.spin > 0 ? ov.spin : b.spin,
      len: b.len * LEN_K * scale, width: b.width * WIDTH_K * scale, gap: b.gap * scale,
      scale, hits: 0, timer: 0, dir: 1, angle: 0,
    };
  }

  const TRACK = ['damage', 'spin', 'len', 'width', 'arrows', 'n', 'orbs', 'moons', 'crit', 'burn', 'reload', 'heal', 'wave', 'zap', 'applied', 'knock'];
  const LABEL = {
    damage: (d) => (d > 0 ? '+' + BB.fmt(d) + ' DMG' : null), spin: 'SPIN UP', len: 'LONGER', width: 'BIGGER',
    arrows: '+1 ARROW', n: (d) => (Math.floor(d * 2) >= 1 || d >= 1 ? '+1 SHOT' : 'CHARGING'), orbs: '+ORB', moons: '+MOON',
    crit: 'CRIT CHANCE UP', burn: 'HOTTER FLAME', reload: 'FASTER RELOAD', heal: 'MORE HEALING', wave: 'LOUDER', zap: 'ZAP UP', applied: null, knock: 'MORE KNOCKBACK',
  };

  class Sim {
    // cfg: { seed, map, teams: [[slotCfg...]...], settings, controlSlot }
    // slotCfg: { id, hp, scale, ov: {damage, spin, speed}, slot }
    constructor(cfg) {
      this.cfg = cfg;
      this.rng = BB.RNG(cfg.seed || 1);
      this.frng = BB.RNG(((cfg.seed || 1) * 7919) ^ 0x5bd1e995);
      this.map = BB.MAP[cfg.map] || BB.MAPS[0];
      this.size = this.map.size;
      this.W = this.size; this.H = this.size;
      this.gravity = this.map.gravity || 0;
      this.settings = cfg.settings || {};
      this.t = 0; this.freeze = 0; this.dmgMul = 1;
      this.balls = []; this.proj = []; this.turrets = []; this.fx = []; this.events = [];
      this.obstacles = []; this.meteors = [];
      this.pairCd = {};
      this.nextId = 1;
      this.over = null; this.endTimer = -1;
      this.input = { x: 0, y: 0 };
      this.nTeams = cfg.teams.length;
      this.spawnAll(cfg);
      this.initMap();
    }

    emit(e) { this.events.push(e); }

    // ------------------------------------------------------------- setup
    spawnAll(cfg) {
      const S = this.size;
      const corners = [[-0.3, -0.3], [0.3, 0.3], [0.3, -0.3], [-0.3, 0.3]];
      cfg.teams.forEach((members, team) => {
        members.forEach((sc, i) => {
          let x, y;
          if (this.nTeams === 2) {
            x = (team === 0 ? -0.3 : 0.3) * S;
            y = (i - (members.length - 1) / 2) * 0.27 * S;
          } else {
            x = corners[team][0] * S; y = corners[team][1] * S;
          }
          const b = this.makeBall(BB.ITEM[sc.id] || BB.ITEM.sword, team, x, y, {
            hp: sc.hp, scale: sc.scale || 1, ov: sc.ov || {}, slot: sc.slot,
            controlled: cfg.controlSlot != null && cfg.controlSlot === sc.slot,
          });
          b.name = b.def.name;
        });
      });
    }

    makeBall(def, team, x, y, o) {
      const scale = o.scale || 1;
      const ov = o.ov || {};
      const b = {
        id: this.nextId++, team, def, x, y, vx: 0, vy: 0,
        r: BALL_R * scale, baseR: BALL_R * scale, scale,
        speed: ov.speed > 0 ? ov.speed : BASE_SPEED, speedMul: 1,
        hp: o.hp, maxHp: o.hp, alive: true, main: o.main !== false,
        flash: 0, cd: {}, burnLvl: 0, burnT: 0, burnTick: 1, poison: 0, poisonTick: 1,
        controlled: !!o.controlled, slot: o.slot, caps: [], owner: o.owner || null, kills: 0,
        slowT: 0, stunT: 0, phase: 0, sq: 0, sqA: 0,
      };
      const a = this.rng() * TAU;
      b.vx = Math.cos(a) * b.speed; b.vy = Math.sin(a) * b.speed;
      b.w = makeWeapon(def, ov, scale);
      b.w.angle = this.rng() * TAU;
      b.w.dir = team === 1 && this.settings.reverseB ? -1 : 1;
      if (def.init) def.init(b.w, b, this);
      if (ov.damage > 0) b.w.damage = ov.damage;
      this.balls.push(b);
      return b;
    }

    initMap() {
      const S = this.size, id = this.map.id;
      if (id === 'pillars') {
        for (const [px, py] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.obstacles.push({ x: px * 0.2 * S, y: py * 0.2 * S, r: 0.065 * S, kind: 'pillar' });
      }
      if (id === 'saws') {
        for (let i = 0; i < 2; i++) this.obstacles.push({ x: 0, y: 0, r: 44, kind: 'saw', idx: i, dmg: 2 });
        this.updateSaws();
      }
      if (id === 'potato') {
        this.potato = { holder: this.pickPotatoHolder(), t: 8, passCd: 0 };
      }
      if (id === 'meteor') this.meteorTimer = 1.5;
    }

    pickPotatoHolder() {
      const alive = this.balls.filter((b) => b.alive && b.main);
      return alive.length ? alive[Math.floor(this.rng() * alive.length)] : null;
    }

    updateSaws() {
      for (const o of this.obstacles) {
        if (o.kind !== 'saw') continue;
        const a = this.t * 0.9 + o.idx * Math.PI + Math.PI / 2;
        o.x = Math.cos(a) * 0.3 * this.size; o.y = Math.sin(a) * 0.3 * this.size;
        o.rot = this.t * 9;
      }
    }

    // ------------------------------------------------------------- helpers
    alive() { return this.balls.filter((b) => b.alive); }
    turretCount(b) { return this.turrets.filter((t) => t.owner === b).length; }
    miniCount(b) { return this.balls.filter((m) => m.alive && m.owner === b).length; }

    nearestEnemy(team, x, y) {
      let best = null, bd = Infinity;
      for (const e of this.balls) {
        if (!e.alive || e.team === team) continue;
        const d = (e.x - x) ** 2 + (e.y - y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    }

    spawnProj(p) {
      p.team = p.owner.team; p.hit = new Set(); p.t = 0;
      p.vx *= PROJ_K; p.vy *= PROJ_K; p.r *= WIDTH_K;
      p.bounces = p.bounces || 0; p.life = p.life || 3;
      if (p.kind === 'boomerang') p.phase = 0;
      this.proj.push(p);
    }

    addTurret(b) {
      this.turrets.push({ owner: b, team: b.team, x: b.x, y: b.y, r: 14 * b.scale, cd: 0.8, angle: b.w.angle });
      this.emit({ type: 'build', x: b.x, y: b.y });
      this.ring(b.x, b.y, 6, 26, BB.TEAMS[b.team].fill, 0.3);
    }

    spawnMini(b) {
      const m = this.makeBall(BB.MINI, b.team, b.x, b.y, { hp: 12, scale: b.scale * 0.55, main: false, owner: b });
      m.name = 'Mini';
      this.ring(b.x, b.y, 4, 30, '#ff6fb5', 0.3);
    }

    heal(b, amt) {
      if (!b.alive || amt <= 0) return;
      b.hp = Math.min(b.maxHp, b.hp + amt);
      this.fxNum(b.x, b.y - b.r, '+' + BB.fmt(amt), '#35d047');
    }

    explode(src, x, y, R, dmg) {
      this.emit({ type: 'boom', x, y });
      this.ring(x, y, 10, R, '#ffb02e', 0.35);
      this.burst(x, y, 18, ['#ffb02e', '#ff6a1f', '#ffe08a'], 260, 4);
      let hit = false;
      for (const e of this.balls) {
        if (!e.alive || e.team === src.team) continue;
        if ((e.x - x) ** 2 + (e.y - y) ** 2 <= (R + e.r) ** 2) {
          const dealt = this.damage(e, dmg, src, { x: e.x, y: e.y });
          this.knock(e, x, y, 380);
          if (dealt) hit = true;
        }
      }
      for (const t of this.turrets) if (t.team !== src.team && (t.x - x) ** 2 + (t.y - y) ** 2 < R * R) t.dead = true;
      if (hit) this.onHit(src, null, 0);
    }

    knock(target, fx, fy, power) {
      let dx = target.x - fx, dy = target.y - fy;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      const m = (BALL_R * target.scale) / target.r; // bigger balls are heavier
      // Cancel velocity heading into the hit, then add the impulse: a real bounce-off.
      const vn = target.vx * dx + target.vy * dy;
      if (vn < 0) { target.vx -= vn * dx; target.vy -= vn * dy; }
      target.vx += dx * power * m * m; target.vy += dy * power * m * m;
    }

    onHit(attacker, target, dealt) {
      const w = attacker.w;
      w.hits++;
      const hadBurn = target && target.burnT;
      const before = {};
      for (const k of TRACK) before[k] = w[k];
      const bSpeed = attacker.speedMul, bR = attacker.r;
      const tb = target ? { stun: target.stunT, slow: target.slowT, paint: target.paintT, poison: target.poison } : null;
      if (attacker.def.onHit) attacker.def.onHit(this, attacker, w, target, dealt);
      this.callouts(attacker, target, before, bSpeed, bR, tb, hadBurn);
      if (target && target.burnT && target.burnT !== hadBurn) target.burnPow = BB.BALANCE[attacker.def.id] || 1;
    }

    // Floating labels so every ability is visible without reading its description.
    callouts(a, t, before, bSpeed, bR, tb, hadBurn) {
      if (this.preview) return;
      const w = a.w, col = BB.itemColor(a.def.id), tags = [];
      for (const k of TRACK) {
        const d = (w[k] || 0) - (before[k] || 0);
        if (Math.abs(d) < 1e-6 || before[k] === undefined) continue;
        const lbl = LABEL[k];
        if (!lbl) continue;
        tags.push(typeof lbl === 'function' ? lbl(d, w) : lbl);
      }
      if (a.speedMul > bSpeed + 1e-6) tags.push('SPEED UP');
      if (a.r > bR + 1e-6) tags.push('GROWING');
      if (tags.length && !(a.tagCd > this.t)) { a.tagCd = this.t + 0.35; this.fxTag(a.x, a.y - a.r - 22, tags[0], col); }
      if (t && tb && t.alive) {
        if (t.stunT > (tb.stun || 0) + 0.01) this.fxTag(t.x, t.y + t.r + 18, 'STUNNED', '#ffd23f');
        else if (t.slowT > (tb.slow || 0) + 0.01) this.fxTag(t.x, t.y + t.r + 18, 'FROZEN', '#7fd3ff');
        else if (t.paintT > (tb.paint || 0) + 0.01) this.fxTag(t.x, t.y + t.r + 18, 'PAINTED', '#ff6b81');
        else if (t.poison > (tb.poison || 0)) this.fxTag(t.x, t.y + t.r + 18, 'POISON x' + t.poison, '#a259ff');
        else if (t.burnT && t.burnT !== hadBurn) this.fxTag(t.x, t.y + t.r + 18, 'BURNING', '#ff7a1a');
      }
    }

    fxTag(x, y, text, c) { this.fx.push({ k: 'tag', x, y, text, c, life: 0.9, max: 0.9 }); }

    // Applies damage, returns the amount actually dealt.
    damage(target, amt, src, info) {
      if (!target.alive || amt <= 0) return 0;
      if (target.phase > 0 && !(info && info.dot)) { this.fxNum(target.x, target.y - target.r - 4, 'MISS', '#8da2c0'); return 0; }
      // per-ball balance multiplier (tools/balance.js) and painted targets take extra damage
      const pow = src && src.def ? (BB.BALANCE[src.def.id] || 1) : 1;
      const a = amt * this.dmgMul * pow * (target.paintT > 0 ? 1.3 : 1);
      target.hp -= a;
      target.flash = 0.12;
      const x = info && info.x != null ? info.x : target.x;
      const y = info && info.y != null ? info.y : target.y;
      if (!info || !info.dot) {
        this.burst(x, y, Math.min(4 + a, 16), ['#ffffff', '#ffe36e', BB.TEAMS[target.team].fill], 220, 3);
        if (this.settings.hitlag !== false && info && info.lag) this.freeze = Math.max(this.freeze, Math.min(0.03 + a * 0.005, 0.15));
      }
      if (this.settings.dmgNumbers !== false) this.fxNum(target.x, target.y - target.r - 4, (info && info.crit ? 'CRIT ' : '') + BB.fmt(a), info && info.dot ? (info.color || '#ff8a1f') : '#1d1d22');
      this.emit({ type: info && info.dot ? 'dot' : 'hit', amt: a, x, y, team: target.team, crit: info && info.crit });
      if (!(info && info.dot)) this.emit({ type: 'impact', x, y, amt: a, crit: info && info.crit });
      if (src && src.def && src !== target) src.dealt = (src.dealt || 0) + a;
      if (target.def.onDamaged && !(info && info.dot)) target.def.onDamaged(this, target, a, src, info);
      if (target.hp <= 0.0001) { target.hp = 0; this.kill(target, src); this.emit({ type: 'impact', x: target.x, y: target.y, amt: 99 }); }
      return a;
    }

    kill(b, src) {
      if (b.def.revive && !b.revived) {
        b.revived = true; b.hp = b.maxHp * 0.4;
        this.ring(b.x, b.y, b.r, b.r * 4, '#ff8a1f', 0.5);
        this.burst(b.x, b.y, 30, ['#ffd23f', '#ff8a1f', '#ff3d1f'], 420, 5);
        this.fxNum(b.x, b.y - b.r - 10, 'REVIVE!', '#ff8a1f');
        this.emit({ type: 'boom', x: b.x, y: b.y });
        return;
      }
      b.alive = false;
      if (src && src.alive !== undefined) src.kills++;
      this.burst(b.x, b.y, 30, [BB.TEAMS[b.team].fill, '#ffffff', BB.TEAMS[b.team].dark], 380, 5);
      this.ring(b.x, b.y, b.r, b.r * 3, BB.TEAMS[b.team].fill, 0.4);
      this.emit({ type: 'death', x: b.x, y: b.y, team: b.team, main: b.main });
      if (this.potato && this.potato.holder === b) { this.potato.holder = this.pickPotatoHolder(); this.potato.t = Math.max(this.potato.t, 4); }
      if (b.def.splits && b.main) {
        for (let k = 0; k < 2; k++) {
          const j = this.makeBall(BB.ITEM.jellylet, b.team, b.x + (k ? 12 : -12), b.y, { hp: Math.max(5, Math.round(b.maxHp * 0.3)), scale: b.scale * 0.65 });
          j.name = 'Jellylet';
        }
      }
      if (b.main) for (const m of this.balls) if (m.owner === b && m.alive) { m.alive = false; this.burst(m.x, m.y, 8, ['#ffffff', BB.TEAMS[m.team].fill], 200, 3); }
    }

    // ------------------------------------------------------------- fx
    burst(x, y, n, colors, spd, size) {
      for (let i = 0; i < n; i++) {
        const a = this.frng() * TAU, s = spd * (0.3 + this.frng() * 0.7);
        this.fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + this.frng() * 0.3, max: 0.65, c: colors[i % colors.length], s: size * (0.6 + this.frng() * 0.8) });
      }
    }
    ring(x, y, r0, r1, c, life) { this.fx.push({ k: 'r', x, y, r0, r1, c, life, max: life }); }
    fxNum(x, y, text, c) { this.fx.push({ k: 'n', x: x + (this.frng() - 0.5) * 14, y, text, c, life: 0.8, max: 0.8 }); }

    updateFx(dt) {
      const fx = this.fx;
      for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i];
        f.life -= dt;
        if (f.life <= 0) { fx[i] = fx[fx.length - 1]; fx.pop(); continue; }
        if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 1 - 4 * dt; f.vy *= 1 - 4 * dt; }
        else if (f.k === 'n') f.y -= 40 * dt;
      }
    }

    // ------------------------------------------------------------- capsules
    computeCaps(b) {
      b.caps.length = 0;
      const w = b.w, def = b.def;
      if (def.moons) {
        const n = Math.floor(w.moons), R = b.r + 30 * b.scale, mr = 9 * b.scale;
        for (let i = 0; i < n; i++) {
          const a = w.angle + (i * TAU) / n;
          const x = b.x + Math.cos(a) * R, y = b.y + Math.sin(a) * R;
          b.caps.push({ ax: x, ay: y, bx: x, by: y, hw: mr, hit: true, block: false });
        }
        return;
      }
      if (!w.len) return;
      if (def.id === 'boomerang' && w.thrown) return;
      if (def.flail) {
        const s0 = b.r + w.gap, e = s0 + w.len, ha = w.head;
        const hx = b.x + Math.cos(ha) * e, hy = b.y + Math.sin(ha) * e;
        b.caps.push({ ax: b.x + Math.cos(w.angle) * s0, ay: b.y + Math.sin(w.angle) * s0, bx: hx, by: hy, hw: 3, hit: false, block: true });
        b.caps.push({ ax: hx, ay: hy, bx: hx, by: hy, hw: w.width / 2, hit: true, block: true });
        return;
      }
      const ca = Math.cos(w.angle), sa = Math.sin(w.angle);
      if (def.perp) {
        const c = b.r + w.gap + w.len / 2;
        const cx = b.x + ca * c, cy = b.y + sa * c, h = w.width / 2;
        b.caps.push({ ax: cx - sa * h, ay: cy + ca * h, bx: cx + sa * h, by: cy - ca * h, hw: w.len / 2, hit: !!def.melee, block: true });
      } else {
        const s = b.r + w.gap, e = s + w.len;
        b.caps.push({ ax: b.x + ca * s, ay: b.y + sa * s, bx: b.x + ca * e, by: b.y + sa * e, hw: w.width / 2, hit: !!def.melee, block: !!def.blocks });
      }
    }

    // ------------------------------------------------------------- main step
    step(dt) {
      this.updateFx(dt);
      if (this.over) return;
      if (this.freeze > 0) { this.freeze -= dt; return; }
      this.t += dt;

      if (this.endTimer >= 0) {
        this.endTimer -= dt;
        if (this.endTimer < 0) { this.over = { winner: this.winner, t: this.t }; this.emit({ type: 'over', winner: this.winner }); return; }
      }

      const otOff = this.cfg.settings && this.cfg.settings.overtime === false;
      const ot = !otOff && this.t > 55 ? 1 + Math.floor((this.t - 55) / 10) : 1;
      if (ot !== this.dmgMul) { this.dmgMul = ot; this.emit({ type: 'overtime', mul: ot }); }

      // Map dynamics
      if (this.map.id === 'shrink') {
        const k = BB.clamp(this.t / 40, 0, 1);
        this.W = this.H = BB.lerp(this.size, this.size * 0.5, k);
      }
      if (this.map.id === 'saws') this.updateSaws();

      const balls = this.balls;
      // Ball motion, statuses, weapon updates
      for (const b of balls) {
        if (!b.alive) continue;
        if (b.flash > 0) b.flash -= dt;
        for (const k in b.cd) { b.cd[k] -= dt; if (b.cd[k] <= 0) delete b.cd[k]; }

        if (b.burnT > 0) {
          b.burnT -= dt; b.burnTick -= dt;
          if (b.burnTick <= 0) { b.burnTick = 1; this.damage(b, b.burnLvl * (b.burnPow || 1), null, { dot: true, color: '#ff7a1a' }); }
          if (this.frng() < dt * 20) this.fx.push({ k: 'p', x: b.x + (this.frng() - 0.5) * b.r, y: b.y - b.r * 0.5, vx: 0, vy: -60, life: 0.4, max: 0.4, c: this.frng() < 0.5 ? '#ff7a1a' : '#ffd23f', s: 3 });
          if (b.burnT <= 0) b.burnLvl = 0;
        }
        if (b.poison > 0 && b.alive) {
          b.poisonTick -= dt;
          if (b.poisonTick <= 0) { b.poisonTick = 1; this.damage(b, b.poison * 0.35 * (BB.BALANCE.flask || 1), null, { dot: true, color: '#a259ff' }); }
        }
        if (this.t > 165 && b.alive) {
          b.stormTick = (b.stormTick || 0) - dt;
          if (b.stormTick <= 0) { b.stormTick = 0.5; this.damage(b, 1 + Math.floor((this.t - 165) / 15), null, { dot: true, color: '#e23b3b' }); }
        }
        if (!b.alive) continue;

        const w = b.w;
        if (b.slowT > 0) b.slowT -= dt;
        if (b.paintT > 0) b.paintT -= dt;
        if (b.flyT > 0) b.flyT -= dt;
        if (b.stunT > 0) b.stunT -= dt;
        if (b.sq > 0) b.sq = Math.max(0, b.sq - dt * 5);
        w.prevAngle = w.angle;
        w.angle += w.dir * w.spin * D2R * dt * (b.stunT > 0 ? 0 : b.slowT > 0 ? 0.45 : 1);
        if (b.def.flail) {
          // the head trails behind the handle like a weight on a chain
          let lag = w.angle - w.dir * 0.55 - (w.head || w.angle);
          while (lag > Math.PI) lag -= TAU; while (lag < -Math.PI) lag += TAU;
          w.head = (w.head || w.angle) + lag * Math.min(1, 9 * dt);
        }
        if (b.def.update) b.def.update(this, b, w, dt);

        const tgt = b.speed * b.speedMul * (b.slowT > 0 ? 0.55 : 1);
        // Gentle homing keeps fights busy without losing the bouncy billiard feel.
        if (false) {
          const e = this.nearestEnemy(b.team, b.x, b.y);
          if (e) {
            const want = Math.atan2(e.y - b.y, e.x - b.x), cur = Math.atan2(b.vy, b.vx);
            let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
            const na = cur + BB.clamp(da, -SEEK * dt, SEEK * dt), s = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s;
          }
        }
        if (b.controlled) {
          const ix = this.input.x, iy = this.input.y, m = Math.hypot(ix, iy);
          if (m > 0.15) {
            const k = Math.min(1, 5 * dt);
            b.vx += ((ix / m) * tgt * 1.1 * Math.min(1, m) - b.vx) * k;
            b.vy += ((iy / m) * tgt * 1.1 * Math.min(1, m) - b.vy) * k;
          }
        }
        if (this.gravity) {
          b.vy += this.gravity * dt;
          const h = this.H / 2 - b.y;
          const kin = 0.5 * tgt * tgt + this.gravity * this.H * 0.45 - this.gravity * h;
          const sd = kin > 0 ? Math.sqrt(2 * kin) : 0;
          const s = Math.hypot(b.vx, b.vy);
          if (s > 1) { const ns = s + (sd - s) * Math.min(1, 1.5 * dt); b.vx *= ns / s; b.vy *= ns / s; }
        } else {
          const s = Math.hypot(b.vx, b.vy);
          if (s < 1) { const a = this.rng() * TAU; b.vx = Math.cos(a) * tgt; b.vy = Math.sin(a) * tgt; }
          else { const ns = s + (tgt - s) * Math.min(1, 1.2 * dt); b.vx *= ns / s; b.vy *= ns / s; }
        }
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 1400) { b.vx *= 1400 / sp; b.vy *= 1400 / sp; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        this.walls(b);
        for (const o of this.obstacles) this.obstacleHit(b, o);
      }

      // Ball vs ball
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const c = balls[j];
          if (!c.alive) continue;
          let dx = c.x - a.x, dy = c.y - a.y;
          const rs = a.r + c.r, d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs) continue;
          const d = Math.sqrt(d2) || 0.01;
          const nx = dx / d, ny = dy / d, ov = rs - d;
          const m1 = a.r * a.r, m2 = c.r * c.r, mt = m1 + m2;
          a.x -= nx * ov * (m2 / mt); a.y -= ny * ov * (m2 / mt);
          c.x += nx * ov * (m1 / mt); c.y += ny * ov * (m1 / mt);
          const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (vn < 0) {
            const jj = (-2 * vn) / (1 / m1 + 1 / m2);
            a.vx -= (jj / m1) * nx; a.vy -= (jj / m1) * ny;
            c.vx += (jj / m2) * nx; c.vy += (jj / m2) * ny;
            this.squash(a, Math.atan2(ny, nx), 0.8); this.squash(c, Math.atan2(ny, nx), 0.8);
            this.emit({ type: 'bump', x: a.x + nx * a.r, y: a.y + ny * a.r });
          }
          if (a.team !== c.team) {
            this.contact(a, c, a.x + nx * a.r, a.y + ny * a.r);
            this.contact(c, a, a.x + nx * a.r, a.y + ny * a.r);
          }
          if (this.potato && this.potato.passCd <= 0) {
            const p = this.potato;
            if (p.holder === a && c.main) { p.holder = c; p.passCd = 0.5; this.emit({ type: 'pass' }); }
            else if (p.holder === c && a.main) { p.holder = a; p.passCd = 0.5; this.emit({ type: 'pass' }); }
          }
        }
      }

      for (const b of balls) if (b.alive) this.computeCaps(b);

      // Weapon vs weapon (parry), then weapon vs body (hit)
      const parried = {};
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (!a.alive || !a.caps.length) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const c = balls[j];
          if (!c.alive || !c.caps.length || a.team === c.team) continue;
          const key = a.id + ':' + c.id;
          if (this.pairCd[key] > 0) { parried[key] = true; continue; }
          let done = false;
          for (const ca of a.caps) {
            if (!ca.block || done) continue;
            for (const cc of c.caps) {
              if (!cc.block) continue;
              const r = ca.hw + cc.hw;
              if (geo.segSeg2(ca, cc) < r * r) { this.parry(a, c, ca, cc); this.pairCd[key] = 0.22; parried[key] = true; done = true; break; }
            }
          }
        }
      }
      for (const k in this.pairCd) { this.pairCd[k] -= dt; if (this.pairCd[k] <= 0) delete this.pairCd[k]; }

      for (const a of balls) {
        if (!a.alive || !a.caps.length) continue;
        for (const c of balls) {
          if (!c.alive || c.team === a.team || c.cd[a.id] > 0) continue;
          if (parried[Math.min(a.id, c.id) + ':' + Math.max(a.id, c.id)]) continue;
          let hitCap = null;
          for (const cap of a.caps) {
            if (!cap.hit) continue;
            const r = c.r + cap.hw;
            if (geo.segPoint2(cap.ax, cap.ay, cap.bx, cap.by, c.x, c.y) < r * r) { hitCap = cap; break; }
          }
          if (!hitCap) hitCap = this.sweptHit(a, c);
          if (hitCap) this.weaponHit(a, c, hitCap);
        }
        // Weapons smash enemy turrets
        for (const t of this.turrets) {
          if (t.team === a.team || t.dead) continue;
          for (const cap of a.caps) {
            const r = t.r + cap.hw;
            if (geo.segPoint2(cap.ax, cap.ay, cap.bx, cap.by, t.x, t.y) < r * r) { t.dead = true; break; }
          }
        }
      }

      this.updateProjectiles(dt);
      this.updateTurrets(dt);
      this.updateHazards(dt);

      // End check
      if (this.endTimer < 0) {
        const teams = new Set();
        for (const b of balls) if (b.alive && b.main) teams.add(b.team);
        if (teams.size <= 1) {
          this.winner = teams.size === 1 ? [...teams][0] : -1;
          this.endTimer = 1.1;
          this.emit({ type: 'ko', winner: this.winner });
        }
      }
    }

    walls(b) {
      const hw = this.W / 2, hh = this.H / 2;
      let hit = false;
      if (b.x - b.r < -hw) { b.x = -hw + b.r; if (b.vx < 0) { b.vx = -b.vx; hit = true; } }
      if (b.x + b.r > hw) { b.x = hw - b.r; if (b.vx > 0) { b.vx = -b.vx; hit = true; } }
      if (b.y - b.r < -hh) { b.y = -hh + b.r; if (b.vy < 0) { b.vy = -b.vy; hit = true; } }
      if (b.y + b.r > hh) { b.y = hh - b.r; if (b.vy > 0) { b.vy = -b.vy; hit = true; } }
      if (hit) {
        const j = (this.rng() - 0.5) * 0.06, c = Math.cos(j), s = Math.sin(j);
        const vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx;
        this.squash(b, Math.atan2(b.vy, b.vx), 0.9);
        if (b.def.onWall) b.def.onWall(this, b, b.w);
        this.emit({ type: 'wall', x: b.x, y: b.y });
      }
    }

    launch(b, x, y) {
      b.flyT = 0.5;
      this.ring(x, y, 6, 70, '#ffffff', 0.3);
      this.burst(x, y, 10, ['#ffffff', '#e8dcc6', '#cfc3ad'], 320, 4);
      if (!(b.tagCd2 > this.t)) { b.tagCd2 = this.t + 0.4; this.fxTag(b.x, b.y - b.r - 22, 'KNOCKBACK!', '#ffffff'); }
    }

    squash(b, ang, k) { b.sq = Math.max(b.sq, Math.min(1, k)); b.sqA = ang; }

    obstacleHit(b, o) {
      const dx = b.x - o.x, dy = b.y - o.y, rs = b.r + o.r, d2 = dx * dx + dy * dy;
      if (d2 >= rs * rs) return;
      const d = Math.sqrt(d2) || 0.01, nx = dx / d, ny = dy / d;
      b.x = o.x + nx * rs; b.y = o.y + ny * rs;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
      if (o.dmg && !(b.cd['saw' + o.idx] > 0)) {
        b.cd['saw' + o.idx] = 0.6;
        this.damage(b, o.dmg, null, { x: b.x - nx * b.r, y: b.y - ny * b.r, lag: true });
        b.vx += nx * 200; b.vy += ny * 200;
      } else this.emit({ type: 'wall', x: b.x, y: b.y });
    }

    contact(a, c, x, y) {
      const def = a.def;
      if (!def.contact || c.cd['c' + a.id] > 0) return;
      const dmg = def.contactDamage ? def.contactDamage(a.w) : a.w.damage;
      if (dmg <= 0) return;
      c.cd['c' + a.id] = 0.5;
      const dealt = this.damage(c, dmg, a, { x, y, lag: true });
      if (dealt && a.def.id !== 'splodey') this.onHit(a, c, dealt);
    }

    // Fast spinners can rotate past a ball between steps: test the arc they swept.
    sweptHit(a, c) {
      const w = a.w, def = a.def;
      if (!def.melee || def.perp || def.flail || def.moons || !w.len || w.prevAngle == null) return null;
      let d = w.angle - w.prevAngle;
      const reach = a.r + w.gap + w.len;
      const n = Math.ceil((Math.abs(d) * reach) / Math.max(8, c.r * 0.6));
      if (n <= 1) return null;
      const s0 = a.r + w.gap, hw = w.width / 2, rr = (c.r + hw) ** 2;
      for (let k = 1; k < n; k++) {
        const ang = w.prevAngle + (d * k) / n, ca = Math.cos(ang), sa = Math.sin(ang);
        const cap = { ax: a.x + ca * s0, ay: a.y + sa * s0, bx: a.x + ca * reach, by: a.y + sa * reach, hw, hit: true };
        if (geo.segPoint2(cap.ax, cap.ay, cap.bx, cap.by, c.x, c.y) < rr) return cap;
      }
      return null;
    }

    weaponHit(a, c, cap) {
      const def = a.def, w = a.w;
      let dmg = w.damage, crit = false;
      if (def.damageFn) [dmg, crit] = def.damageFn(this, a, w);
      const [px, py] = geo.segClosest(cap.ax, cap.ay, cap.bx, cap.by, c.x, c.y);
      c.cd[a.id] = def.hitCd || 0.25;
      const dealt = this.damage(c, dmg, a, { x: px, y: py, crit, lag: true });
      const ang = Math.atan2(py - a.y, px - a.x);
      const tx = -Math.sin(ang) * a.w.dir, ty = Math.cos(ang) * a.w.dir;
      let nx = c.x - px, ny = c.y - py; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const kx = nx + tx * 0.7, ky = ny + ty * 0.7, kl = Math.hypot(kx, ky) || 1;
      const kp = w.knock || def.knock || 220;
      this.knock(c, c.x - kx / kl, c.y - ky / kl, kp);
      this.knock(a, c.x, c.y, 60);
      if (kp >= 300) this.launch(c, px, py);
      this.squash(c, Math.atan2(ky, kx), 1);
      this.onHit(a, c, dealt);
    }

    parry(a, c, ca, cc) {
      a.w.dir *= -1; c.w.dir *= -1;
      const [px, py] = geo.segClosest(ca.ax, ca.ay, ca.bx, ca.by, (cc.ax + cc.bx) / 2, (cc.ay + cc.by) / 2);
      this.knock(a, px, py, 160); this.knock(c, px, py, 160);
      this.burst(px, py, 8, ['#ffffff', '#ffe36e', '#ffd23f'], 260, 2.5);
      this.emit({ type: 'parry', x: px, y: py });
      if (this.settings.parrylag !== false) this.freeze = Math.max(this.freeze, 0.04);
    }

    updateProjectiles(dt) {
      const hw = () => this.W / 2, hh = () => this.H / 2;
      for (const p of this.proj) {
        if (p.dead) continue;
        p.t += dt; p.life -= dt;
        if (p.life <= 0) { p.dead = true; continue; }
        if (p.homing) {
          const e = this.nearestEnemy(p.team, p.x, p.y);
          if (e) {
            const want = Math.atan2(e.y - p.y, e.x - p.x), cur = Math.atan2(p.vy, p.vx);
            let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
            const na = cur + BB.clamp(da, -p.homing * dt, p.homing * dt), s = Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(na) * s; p.vy = Math.sin(na) * s;
          }
        }
        if (p.kind === 'boomerang') {
          if (p.phase === 0 && p.t > 0.5) { p.phase = 1; p.hit.clear(); }
          if (p.phase === 1) {
            const o = p.owner;
            if (!o.alive) { p.dead = true; continue; }
            const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1;
            p.vx += ((dx / d) * 700 - p.vx) * Math.min(1, 6 * dt);
            p.vy += ((dy / d) * 700 - p.vy) * Math.min(1, 6 * dt);
            if (d < o.r + p.r) { p.dead = true; o.w.thrown = false; o.w.timer = 0.35; continue; }
          }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.angle = p.kind === 'star' || p.kind === 'boomerang' ? (p.angle || 0) + 14 * dt : Math.atan2(p.vy, p.vx);

        // walls
        let out = false;
        if (p.x - p.r < -hw()) { out = true; p.x = -hw() + p.r; p.vx = Math.abs(p.vx); }
        if (p.x + p.r > hw()) { out = true; p.x = hw() - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y - p.r < -hh()) { out = true; p.y = -hh() + p.r; p.vy = Math.abs(p.vy); }
        if (p.y + p.r > hh()) { out = true; p.y = hh() - p.r; p.vy = -Math.abs(p.vy); }
        if (out && p.kind !== 'boomerang') {
          if (p.bounces > 0) p.bounces--;
          else { p.dead = true; this.burst(p.x, p.y, 4, ['#cfd6dc', '#ffffff'], 120, 2); continue; }
        }
        for (const o of this.obstacles) {
          if ((p.x - o.x) ** 2 + (p.y - o.y) ** 2 < (o.r + p.r) ** 2) { if (p.kind !== 'boomerang') p.dead = true; }
        }
        if (p.dead) continue;

        // blocked by enemy weapons
        for (const b of this.balls) {
          if (!b.alive || b.team === p.team || !b.caps.length) continue;
          for (const cap of b.caps) {
            if (!cap.block) continue;
            const r = cap.hw + p.r;
            if (geo.segPoint2(cap.ax, cap.ay, cap.bx, cap.by, p.x, p.y) < r * r) {
              if (!b.def.reflect) { p.swat = p.swat || {}; if (p.swat[b.id] === undefined) p.swat[b.id] = this.rng() < 0.35; if (!p.swat[b.id]) continue; }
              this.burst(p.x, p.y, 6, ['#ffffff', '#ffe36e'], 200, 2.5);
              this.emit({ type: 'parry', x: p.x, y: p.y, small: true });
              if (b.def.reflect) {
                const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1, s = Math.hypot(p.vx, p.vy);
                p.vx = (dx / d) * s; p.vy = (dy / d) * s;
                p.team = b.team; p.owner = b; p.hit.clear(); p.homing = 0;
                if (p.kind === 'boomerang') p.kind = 'star';
              } else if (p.kind === 'boomerang') { p.phase = 1; }
              else p.dead = true;
              break;
            }
          }
          if (p.dead || p.team === b.team) break;
        }
        if (p.dead) continue;

        for (const e of this.balls) {
          if (!e.alive || e.team === p.team || p.hit.has(e.id)) continue;
          if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + p.r) ** 2) {
            p.hit.add(e.id);
            if (e.def.mirrorBody) {
              const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(p.vx, p.vy);
              p.vx = (dx / d) * sp; p.vy = (dy / d) * sp; p.team = e.team; p.owner = e; p.hit.clear(); p.homing = 0;
              this.burst(p.x, p.y, 6, ['#ffffff', '#bfe9ff'], 200, 2.5); this.emit({ type: 'parry', x: p.x, y: p.y, small: true });
              break;
            }
            if (p.burn) { e.burnLvl = Math.max(e.burnLvl, p.burn); e.burnT = 3; e.burnPow = BB.BALANCE[p.owner.def.id] || 1; }
            if (p.slow) e.slowT = Math.max(e.slowT, p.slow);
            const dealt = this.damage(e, p.dmg, p.owner, { x: p.x, y: p.y, lag: p.kind === 'cannonball' });
            this.knock(e, p.x - p.vx, p.y - p.vy, p.knock || 90);
            if ((p.knock || 0) >= 250) this.launch(e, p.x, p.y);
            this.onHit(p.owner, e, dealt);
            if (!p.pierce) { p.dead = true; break; }
          }
        }
        if (p.dead) continue;
        for (const t of this.turrets) {
          if (t.team === p.team || t.dead) continue;
          if ((t.x - p.x) ** 2 + (t.y - p.y) ** 2 < (t.r + p.r) ** 2) { t.dead = true; if (!p.pierce) p.dead = true; }
        }
      }
      this.proj = this.proj.filter((p) => !p.dead);
    }

    updateTurrets(dt) {
      for (const t of this.turrets) {
        if (t.dead) continue;
        if (!t.owner.alive) { t.dead = true; continue; }
        for (const e of this.balls) {
          if (!e.alive || e.team === t.team) continue;
          if ((e.x - t.x) ** 2 + (e.y - t.y) ** 2 < (e.r + t.r) ** 2) { t.dead = true; break; }
        }
        if (t.dead) continue;
        const e = this.nearestEnemy(t.team, t.x, t.y);
        if (!e) continue;
        const want = Math.atan2(e.y - t.y, e.x - t.x);
        t.angle = want;
        t.cd -= dt;
        if (t.cd <= 0) {
          t.cd = 1.1;
          const s = t.r + 6;
          this.spawnProj({ owner: t.owner, kind: 'bolt', x: t.x + Math.cos(want) * s, y: t.y + Math.sin(want) * s, vx: Math.cos(want) * 520, vy: Math.sin(want) * 520, r: 4 * t.owner.scale, dmg: 1, life: 2 });
          this.emit({ type: 'shoot', x: t.x, y: t.y, small: true });
        }
      }
      const before = this.turrets.length;
      for (const t of this.turrets) if (t.dead) { this.burst(t.x, t.y, 10, ['#9aa4ad', BB.TEAMS[t.team].fill], 200, 3); }
      this.turrets = this.turrets.filter((t) => !t.dead);
      if (this.turrets.length !== before) this.emit({ type: 'break' });
    }

    updateHazards(dt) {
      if (this.potato) {
        const p = this.potato;
        p.passCd -= dt;
        if (!p.holder || !p.holder.alive) p.holder = this.pickPotatoHolder();
        if (p.holder) {
          p.t -= dt;
          if (p.t <= 0) {
            const h = p.holder;
            this.emit({ type: 'boom', x: h.x, y: h.y });
            this.ring(h.x, h.y, 10, 90, '#ff6a1f', 0.4);
            this.burst(h.x, h.y, 24, ['#ffb02e', '#ff6a1f', '#3a3a44'], 320, 4);
            this.damage(h, Math.max(10, Math.ceil(h.maxHp * 0.25)), null, { lag: true });
            p.holder = this.pickPotatoHolder(); p.t = 8; p.passCd = 1;
          }
        }
      }
      if (this.map.id === 'meteor') {
        this.meteorTimer -= dt;
        if (this.meteorTimer <= 0) {
          this.meteorTimer = 1.3;
          const m = 0.42 * this.size;
          this.meteors.push({ x: this.rng.range(-m, m), y: this.rng.range(-m, m), t: 1.1, max: 1.1, r: 66 });
        }
        for (const m of this.meteors) {
          m.t -= dt;
          if (m.t <= 0 && !m.done) {
            m.done = true;
            this.emit({ type: 'boom', x: m.x, y: m.y });
            this.ring(m.x, m.y, 8, m.r, '#8a5a3c', 0.35);
            this.burst(m.x, m.y, 16, ['#8a5a3c', '#c98b5e', '#ffb02e'], 280, 4);
            for (const b of this.balls) {
              if (b.alive && (b.x - m.x) ** 2 + (b.y - m.y) ** 2 < (m.r + b.r) ** 2) { this.damage(b, 3, null, { lag: true }); this.knock(b, m.x, m.y, 300); }
            }
          }
        }
        this.meteors = this.meteors.filter((m) => !m.done);
      }
    }

    // Deterministic steering used to drive the joystick in the store preview videos.
    autoPilot() {
      const b = this.balls.find((x) => x.controlled && x.alive);
      if (!b) return { x: 0, y: 0 };
      const e = this.nearestEnemy(b.team, b.x, b.y);
      if (!e) return { x: 0, y: 0 };
      const a = Math.atan2(e.y - b.y, e.x - b.x) + Math.sin(this.t * 1.7) * 0.8;
      return { x: Math.cos(a) * 0.9, y: Math.sin(a) * 0.9 };
    }

    // Stat lines shown under the arena for a ball.
    stats(b) {
      return b.def.stats ? b.def.stats(b.w, b, this) : [];
    }
  }

  BB.Sim = Sim;
  BB.BALL_R = BALL_R;
})();
