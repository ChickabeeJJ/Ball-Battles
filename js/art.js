// Visual layer: ball and weapon art, themed map floors/walls/obstacles and impact frames.
// Loaded after render.js and plugs into its hooks.
(function () {
  const BB = window.BB;
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const W_ = BB.wpn;
  const { path, fillStroke, rect, circle, METAL, WOOD, GOLD, OUT } = W_;
  const FONT = BB.FONT;

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  }
  BB.shade = shade;
  BB.rgba = rgba;

  // ------------------------------------------------------------ new weapon drawings
  const D = BB.DRAW;
  D.rapier = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.15, W * 0.9, '#3b2a4a', lw);
    ctx.beginPath(); ctx.arc(s + L * 0.17, 0, W * 1.25, -Math.PI / 2, Math.PI / 2); ctx.closePath();
    fillStroke(ctx, GOLD, lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.02, -W * 0.5); ctx.quadraticCurveTo(s + L * 0.08, -W * 1.9, s + L * 0.17, -W * 1.2);
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * 1.8; ctx.stroke(); ctx.strokeStyle = '#f6c431'; ctx.lineWidth = lw * 0.8; ctx.stroke();
    path(ctx, [s + L * 0.18, -W * 0.45, s + L * 0.95, -W * 0.2, s + L, 0, s + L * 0.95, W * 0.2, s + L * 0.18, W * 0.45]);
    fillStroke(ctx, METAL, lw * 0.9);
  };
  D.pan = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.22, W * 0.3, WOOD, lw);
    rect(ctx, s + L * 0.2, s + L * 0.46, W * 0.24, '#2e3036', lw);
    const r = Math.min(L * 0.28, W * 0.55), cx = s + L - r;
    circle(ctx, cx, 0, r, '#2b2d33', lw * 1.2);
    circle(ctx, cx, 0, r * 0.78, '#3a3d45', lw * 0.6);
    ctx.beginPath(); ctx.arc(cx - r * 0.2, -r * 0.25, r * 0.45, Math.PI * 1.1, Math.PI * 1.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  };
  D.trident = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.72, W * 0.22, '#2a6f63', lw);
    rect(ctx, s + L * 0.66, s + L * 0.74, W * 1.7, GOLD, lw);
    const prong = (y, len) => {
      path(ctx, [s + L * 0.72, y - W * 0.1, s + L * len - W * 0.35, y - W * 0.1, s + L * len, y, s + L * len - W * 0.35, y + W * 0.1, s + L * 0.72, y + W * 0.1]);
      fillStroke(ctx, GOLD, lw * 0.8);
    };
    prong(-W * 0.72, 0.92); prong(W * 0.72, 0.92); prong(0, 1);
  };
  D.flail = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.28, W * 0.32, WOOD, lw);
    const hr = W * 0.48, end = s + L - hr;
    for (let x = s + L * 0.3; x < end - hr * 0.6; x += W * 0.28) { ctx.beginPath(); ctx.ellipse(x, 0, W * 0.14, W * 0.09, 0, 0, TAU); ctx.strokeStyle = '#5f666d'; ctx.lineWidth = lw * 0.9; ctx.stroke(); }
    spikedBall(ctx, end, 0, hr, lw);
  };
  function spikedBall(ctx, x, y, r, lw) {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16, rr = i % 2 ? r * 0.95 : r * 1.38; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = '#9aa4ad'; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#9aa1aa'); g.addColorStop(1, '#3d4248');
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
  }
  D.icestaff = function (ctx, s, L, W, lw, t) {
    rect(ctx, s, s + L * 0.7, W * 0.28, '#4d6a8a', lw);
    for (let k = 0; k < 3; k++) rect(ctx, s + L * (0.15 + k * 0.18), s + L * (0.19 + k * 0.18), W * 0.42, '#bfe9ff', lw * 0.6);
    const cx = s + L * 0.84;
    ctx.beginPath(); ctx.arc(cx, 0, W * 0.9, 0, TAU); ctx.fillStyle = 'rgba(127,211,255,' + (0.18 + 0.08 * Math.sin(t * 6)) + ')'; ctx.fill();
    path(ctx, [s + L * 0.68, 0, cx, -W * 0.6, s + L, 0, cx, W * 0.6]);
    const g = ctx.createLinearGradient(0, -W * 0.6, 0, W * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#9fe3ff'); g.addColorStop(1, '#3fa9e0');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
  };
  D.crossbow = function (ctx, s, L, W, lw) {
    path(ctx, [s, -W * 0.2, s + L * 0.85, -W * 0.16, s + L * 0.85, W * 0.16, s, W * 0.2]);
    fillStroke(ctx, WOOD, lw);
    const lx = s + L * 0.72;
    ctx.beginPath(); ctx.moveTo(lx - L * 0.12, -W * 0.95); ctx.quadraticCurveTo(lx + L * 0.12, 0, lx - L * 0.12, W * 0.95);
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = lw * 3; ctx.stroke(); ctx.strokeStyle = '#5d6d7e'; ctx.lineWidth = lw * 1.5; ctx.stroke(); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(lx - L * 0.12, -W * 0.95); ctx.lineTo(s + L * 0.45, 0); ctx.lineTo(lx - L * 0.12, W * 0.95);
    ctx.strokeStyle = '#efe6cf'; ctx.lineWidth = lw * 0.6; ctx.stroke();
    path(ctx, [s + L * 0.85, -W * 0.16, s + L, 0, s + L * 0.85, W * 0.16]); fillStroke(ctx, METAL, lw * 0.8);
  };

  // ------------------------------------------------------------ icons for new specials
  const baseIcon = BB.drawIcon;
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    baseIcon(ctx, id, x, y, size, opts);
    const r = size * 0.33;
    ctx.save(); ctx.translate(x, y);
    if (id === 'ghost') {
      ctx.fillStyle = '#2d3a55';
      for (const dx of [-0.32, 0.32]) { ctx.beginPath(); ctx.ellipse(dx * r, -r * 0.1, r * 0.14, r * 0.22, 0, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.13, 0, TAU); ctx.fill();
    } else if (id === 'bouncer') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.13; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.4);
      for (let i = 0; i < 5; i++) ctx.lineTo((i % 2 ? 0.45 : -0.45) * r, r * (0.25 - i * 0.17));
      ctx.stroke();
    } else if (id === 'fibonacci' || id === 'speedy' || id === 'unarmed') {
      // emblems already drawn by the base icon
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ balls
  function ballColor(b) {
    const def = b.main ? b.def : (b.owner ? b.owner.def : b.def);
    return BB.itemColor(def.id);
  }

  function weaponTrail(ctx, b, w, col) {
    if (!b.def.melee || b.def.perp || !w.len || b.stunT > 0) return;
    const span = Math.min(w.spin * D2R * 0.08, 1.3);
    if (span < 0.15) return;
    const r0 = b.r + w.gap + w.len * 0.3, r1 = b.r + w.gap + w.len + (b.def.flail ? w.width * 0.3 : 0);
    const a1 = b.def.flail ? w.head : w.angle, a0 = a1 - w.dir * span;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r1, a0, a1, w.dir < 0);
    ctx.arc(b.x, b.y, r0, a1, a0, w.dir > 0);
    ctx.closePath();
    const g = ctx.createRadialGradient(b.x, b.y, r0, b.x, b.y, r1);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.28));
    ctx.fillStyle = g; ctx.fill();
  }

  BB.drawBallArt = function (ctx, sim, b, lw, R) {
    const w = b.w, id = b.def.id, col = ballColor(b);
    const tm = BB.TEAMS[b.team];
    const mainBalls = sim.balls.filter((x) => x.main);
    const showTeam = sim.nTeams > 2 || mainBalls.length > 2 || (mainBalls.length === 2 && mainBalls[0].def.id === mainBalls[1].def.id);

    // soft contact shadow
    ctx.beginPath(); ctx.ellipse(b.x + b.r * 0.1, b.y + b.r * 0.22, b.r * 0.95, b.r * 0.8, 0, 0, TAU);
    ctx.fillStyle = R.dark ? 'rgba(0,0,0,0.35)' : 'rgba(40,30,20,0.16)'; ctx.fill();

    if (id === 'gravitron') {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(sim.t * 1.5);
      ctx.setLineDash([12, 14]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(123,92,255,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, 176 * b.scale, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
    if (id === 'spiky') {
      const n = 10 + Math.min(w.hits, 14), len = 9 * b.scale + Math.min(w.damage, 12);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = sim.t * 0.8 + (i * TAU) / n, a1 = a - (Math.PI / n) * 0.7, a2 = a + (Math.PI / n) * 0.7;
        ctx.moveTo(b.x + Math.cos(a1) * b.r * 0.92, b.y + Math.sin(a1) * b.r * 0.92);
        ctx.lineTo(b.x + Math.cos(a) * (b.r + len), b.y + Math.sin(a) * (b.r + len));
        ctx.lineTo(b.x + Math.cos(a2) * b.r * 0.92, b.y + Math.sin(a2) * b.r * 0.92);
      }
      ctx.fillStyle = '#e3e8ec'; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    }
    if (b.def.moons) for (const cap of b.caps) {
      const g = ctx.createRadialGradient(cap.ax - cap.hw * 0.4, cap.ay - cap.hw * 0.4, 1, cap.ax, cap.ay, cap.hw);
      g.addColorStop(0, '#f2f4f7'); g.addColorStop(1, '#8e97a3');
      ctx.beginPath(); ctx.arc(cap.ax, cap.ay, cap.hw, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    }

    // knockback launch: speed streaks + dust puffs trailing the flying ball
    if (b.flyT > 0) {
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = -b.vx / sp, uy = -b.vy / sp, k = b.flyT / 0.5;
      ctx.save(); ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const ox = -uy * i * b.r * 0.38, oy = ux * i * b.r * 0.38, L = b.r * (2.2 + (2 - Math.abs(i)) * 0.8) * k;
        ctx.beginPath(); ctx.moveTo(b.x + ux * b.r + ox, b.y + uy * b.r + oy); ctx.lineTo(b.x + ux * (b.r + L) + ox, b.y + uy * (b.r + L) + oy);
        ctx.strokeStyle = 'rgba(255,255,255,' + 0.85 * k + ')'; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = 'rgba(30,30,40,' + 0.35 * k + ')'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(b.x + ux * b.r * (1.2 + i * 0.9), b.y + uy * b.r * (1.2 + i * 0.9), b.r * (0.25 + i * 0.08) * k, 0, TAU); ctx.fillStyle = 'rgba(225,215,195,' + 0.5 * k / i + ')'; ctx.fill(); }
      ctx.restore();
    }
    weaponTrail(ctx, b, w, col);

    ctx.save();
    if (b.phase > 0) ctx.globalAlpha = 0.45 + 0.15 * Math.sin(sim.t * 20);
    // squash & stretch along the last impact direction
    ctx.translate(b.x, b.y);
    if (b.sq > 0) { const k = b.sq * 0.16; ctx.rotate(b.sqA); ctx.scale(1 - k, 1 + k * 0.7); ctx.rotate(-b.sqA); }
    const r = b.r;
    if (showTeam) { ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = tm.fill; ctx.stroke(); }
    // body
    // mastery skins (Classic / Shadow / Neon / Gold)
    const skin = b.main && BB.meta && BB.meta.skinOf ? BB.meta.skinOf(id) : 'classic';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    if (skin === 'shadow') { g.addColorStop(0, shade(col, -0.25)); g.addColorStop(0.6, shade(col, -0.62)); g.addColorStop(1, '#0b0b10'); }
    else if (skin === 'gold') { g.addColorStop(0, '#fff6c2'); g.addColorStop(0.45, '#f2c230'); g.addColorStop(1, '#8a5a00'); }
    else { g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.28)); }
    if (skin === 'neon') { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = r * 0.9; ctx.fillStyle = g; ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = g; ctx.fill(); }
    ctx.save(); ctx.clip();
    // soft specular highlight + bounce light along the lower rim (no outline)
    const hl = ctx.createRadialGradient(-r * 0.34, -r * 0.42, 0, -r * 0.34, -r * 0.42, r * 0.5);
    hl.addColorStop(0, 'rgba(255,255,255,0.75)'); hl.addColorStop(0.45, 'rgba(255,255,255,0.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.5, r * 0.36, -0.6, 0, TAU); ctx.fill();
    const rim = ctx.createRadialGradient(r * 0.2, r * 0.25, r * 0.55, 0, 0, r);
    rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(0.75, 'rgba(0,0,0,0.12)'); rim.addColorStop(1, 'rgba(255,255,255,0.18)');
    ctx.fillStyle = rim; ctx.fillRect(-r, -r, r * 2, r * 2);
    if (b.slowT > 0) { ctx.fillStyle = 'rgba(191,233,255,0.55)'; ctx.fillRect(-r, -r, r * 2, r * 2); }
    if (b.paintT > 0) { ctx.fillStyle = 'rgba(255,60,120,0.7)'; for (const [px, py, pr] of [[-0.3, 0.2, 0.45], [0.35, -0.1, 0.35], [0.05, 0.5, 0.28]]) { ctx.beginPath(); ctx.arc(px * r, py * r, pr * r, 0, TAU); ctx.fill(); } }
    if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, b.flash * 9) + ')'; ctx.fillRect(-r, -r, r * 2, r * 2); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.lineWidth = lw * (b.main ? 1.5 : 1.1); ctx.strokeStyle = OUT; ctx.stroke();
    if (skin === 'shadow') { ctx.beginPath(); ctx.arc(0, 0, r - lw, Math.PI * 1.05, Math.PI * 1.7); ctx.strokeStyle = shade(col, 0.2); ctx.lineWidth = 3; ctx.stroke(); }
    else if (skin === 'neon') { ctx.beginPath(); ctx.arc(0, 0, r + 1, 0, TAU); ctx.strokeStyle = shade(col, 0.55); ctx.lineWidth = 3; ctx.stroke(); }
    else if (skin === 'gold') {
      ctx.fillStyle = '#fffbe0';
      for (let k = 0; k < 3; k++) { const a = sim.t * 1.6 + k * 2.1, d = r * 0.75, x = Math.cos(a) * d, y = Math.sin(a) * d, s2 = r * (0.1 + 0.05 * Math.sin(sim.t * 7 + k)); ctx.beginPath(); ctx.moveTo(x, y - s2 * 2); ctx.lineTo(x + s2 * 0.5, y); ctx.lineTo(x, y + s2 * 2); ctx.lineTo(x - s2 * 0.5, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - s2 * 2, y); ctx.lineTo(x, y + s2 * 0.5); ctx.lineTo(x + s2 * 2, y); ctx.lineTo(x, y - s2 * 0.5); ctx.closePath(); ctx.fill(); }
    }
    // status rings
    if (b.burnT > 0) { ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, TAU); ctx.strokeStyle = 'rgba(255,122,26,0.85)'; ctx.lineWidth = 3; ctx.stroke(); }
    if (b.poison > 0) { ctx.beginPath(); ctx.arc(0, 0, r - 4, 0, TAU); ctx.strokeStyle = 'rgba(155,77,255,0.9)'; ctx.lineWidth = 3; ctx.stroke(); }
    if (b.main && b.hp / b.maxHp < 0.25) { ctx.beginPath(); ctx.arc(0, 0, r + 9, 0, TAU); ctx.strokeStyle = 'rgba(226,59,59,' + (0.35 + 0.35 * Math.sin(sim.t * 10)) + ')'; ctx.lineWidth = 3; ctx.stroke(); }
    if (id === 'splodey') { ctx.beginPath(); ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - w.timer / 3)); ctx.strokeStyle = '#ff6a1f'; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.restore();

    // stun stars
    if (b.stunT > 0) for (let i = 0; i < 3; i++) {
      const a = sim.t * 6 + (i * TAU) / 3;
      ctx.font = '16px ' + FONT; ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center';
      ctx.fillText('★', b.x + Math.cos(a) * r * 0.8, b.y - r - 8 + Math.sin(a) * 5);
    }

    // weapon
    if (w.len && !(id === 'boomerang' && w.thrown)) {
      ctx.save(); ctx.translate(b.x, b.y);
      if (b.def.flail) {
        const s0 = r + w.gap, e = s0 + w.len;
        ctx.save(); ctx.rotate(w.angle); rect(ctx, s0, s0 + w.len * 0.25, w.width * 0.32, WOOD, lw); ctx.restore();
        const hx = Math.cos(w.head) * e, hy = Math.sin(w.head) * e;
        const ax = Math.cos(w.angle) * (s0 + w.len * 0.25), ay = Math.sin(w.angle) * (s0 + w.len * 0.25);
        const n = 7;
        for (let i = 1; i < n; i++) {
          const k = i / n, mx = ax + (hx - ax) * k, my = ay + (hy - ay) * k;
          ctx.beginPath(); ctx.arc(mx, my, w.width * 0.12, 0, TAU); ctx.strokeStyle = '#5f666d'; ctx.lineWidth = lw; ctx.stroke();
        }
        spikedBall(ctx, hx, hy, w.width / 2, lw);
      } else {
        ctx.rotate(w.angle);
        BB.drawWeapon(ctx, id, r + w.gap, w.len, w.width, lw, sim.t, tm.fill);
      }
      ctx.restore();
    }

    // HP number
    if ((b.main || b.r > 12) && !b.def.kami) {
      const hp = Math.ceil(b.hp);
      const fs = r * (hp >= 1000 ? 0.66 : hp >= 100 ? 0.82 : 1.0);
      ctx.font = fs + 'px ' + BB.NUM_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.2; ctx.strokeStyle = OUT;
      ctx.strokeText(String(hp), b.x, b.y + fs * 0.05);
      ctx.fillStyle = '#ffffff'; ctx.fillText(String(hp), b.x, b.y + fs * 0.05);
    }
  };

  // ------------------------------------------------------------ maps
  const THEME = {
    classic: { wall: '#1d1d22', wallW: 8 },
    large: { wall: '#8a6a45', wallW: 12, brick: '#a98458' },
    bouncy: { wall: '#3d8bf2', wallW: 14, pad: true },
    pillars: { wall: '#c9b88f', wallW: 12, trim: '#f2c230' },
    saws: { wall: '#1d1d22', wallW: 12, hazard: true },
    shrink: { wall: '#ff3fd0', wallW: 6, neon: true },
    potato: { wall: '#8b5a2b', wallW: 14, wood: true },
    meteor: { wall: '#2a201c', wallW: 12, lava: true },
  };

  function tiles(ctx, S, step, a, b) {
    for (let x = -S / 2, i = 0; x < S / 2; x += step, i++) for (let y = -S / 2, j = 0; y < S / 2; y += step, j++) { ctx.fillStyle = (i + j) % 2 ? a : b; ctx.fillRect(x, y, step + 0.5, step + 0.5); }
  }

  BB.drawFloor = function (ctx, sim, dark) {
    const hw = sim.W / 2, hh = sim.H / 2, S = sim.size, id = sim.map.id, t = sim.t;
    const r = BB.RNG(1234);
    if (id === 'classic') {
      ctx.fillStyle = dark ? '#26272d' : '#ffffff'; ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(29,29,34,0.045)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let k = -S / 2; k <= S / 2; k += 50) { ctx.moveTo(k, -S / 2); ctx.lineTo(k, S / 2); ctx.moveTo(-S / 2, k); ctx.lineTo(S / 2, k); } ctx.stroke();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(29,29,34,0.08)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 80, 0, TAU); ctx.moveTo(0, -S / 2); ctx.lineTo(0, S / 2); ctx.stroke();
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(x * (hw - 50), y * (hh - 14)); ctx.lineTo(x * (hw - 14), y * (hh - 14)); ctx.lineTo(x * (hw - 14), y * (hh - 50)); ctx.stroke(); }
    } else if (id === 'large') {
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, S * 0.7);
      g.addColorStop(0, '#f3dfb5'); g.addColorStop(1, '#d9b77e'); ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.strokeStyle = 'rgba(140,100,50,0.13)'; ctx.lineWidth = 3;
      for (let rr = 60; rr < S * 0.75; rr += 38) { ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke(); }
      for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * S, (r() - 0.5) * S, 1.5 + r() * 3, 0, TAU); ctx.fillStyle = 'rgba(120,85,40,0.18)'; ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 110, 0, TAU); ctx.strokeStyle = 'rgba(180,40,40,0.35)'; ctx.lineWidth = 8; ctx.stroke();
    } else if (id === 'bouncy') {
      BB.paintedFloor(ctx, sim, 'bouncy');
    } else if (id === 'pillars') {
      tiles(ctx, S, 75, '#f1ece2', '#e6dece');
      ctx.strokeStyle = 'rgba(160,140,110,0.25)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { let x = (r() - 0.5) * S, y = (r() - 0.5) * S; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.3) * 40; y += (r() - 0.5) * 30; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(242,194,48,0.55)'; ctx.lineWidth = 6; ctx.strokeRect(-hw + 26, -hh + 26, sim.W - 52, sim.H - 52);
      ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.stroke();
    } else if (id === 'saws') {
      ctx.fillStyle = '#c3cad1'; ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let x = -S / 2, i = 0; x < S / 2; x += 26, i++) for (let y = -S / 2, j = 0; y < S / 2; y += 26, j++) {
        ctx.save(); ctx.translate(x + 13, y + 13); ctx.rotate((i + j) % 2 ? 0.8 : -0.8); ctx.fillRect(-7, -2, 14, 4); ctx.restore();
      }
      ctx.fillStyle = '#7e8892';
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x * (hw - 24), y * (hh - 24), 6, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 0.3 * S, 0, TAU); ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,40,' + (0.45 + 0.2 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 4; ctx.stroke();
    } else if (id === 'shrink') {
      ctx.fillStyle = '#120b2a'; ctx.fillRect(-S / 2, -S / 2, S, S);
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, S * 0.7); g.addColorStop(0, 'rgba(120,60,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.strokeStyle = 'rgba(80,200,255,0.25)'; ctx.lineWidth = 2;
      const off = (t * 30) % 40;
      ctx.beginPath(); for (let k = -S / 2 - 40; k <= S / 2 + 40; k += 40) { ctx.moveTo(k + off, -S / 2); ctx.lineTo(k + off, S / 2); ctx.moveTo(-S / 2, k + off); ctx.lineTo(S / 2, k + off); } ctx.stroke();
    } else if (id === 'potato') {
      tiles(ctx, S, 60, '#fff6e6', '#f6dcc0');
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = x * (hw - 70), cy = y * (hh - 70);
        ctx.beginPath(); ctx.arc(cx, cy, 44, 0, TAU); ctx.fillStyle = '#3a3a40'; ctx.fill();
        for (const rr of [34, 22]) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.strokeStyle = 'rgba(255,90,40,' + (0.5 + 0.3 * Math.sin(t * 4 + x + y)) + ')'; ctx.lineWidth = 4; ctx.stroke(); }
      }
      if (sim.potato && sim.potato.t < 3) { ctx.fillStyle = 'rgba(255,60,30,' + (0.08 + 0.08 * Math.sin(t * 18)) + ')'; ctx.fillRect(-S / 2, -S / 2, S, S); }
    } else if (id === 'meteor') {
      BB.paintedFloor(ctx, sim, 'meteor');
    }
  };

  // Lighting + ambient life drawn over the arena (under the walls).
  BB.drawAmbient = function (ctx, sim) {
    const hw = sim.W / 2, hh = sim.H / 2, S = sim.size, id = sim.map.id, t = sim.t;
    if (id === 'bouncy' || id === 'meteor') return;
    const r = BB.RNG(77);
    ctx.save(); ctx.beginPath(); ctx.rect(-hw, -hh, sim.W, sim.H); ctx.clip();
    const tint = { classic: 'rgba(40,30,20,', large: 'rgba(90,50,10,', bouncy: 'rgba(20,60,140,', pillars: 'rgba(90,70,20,', saws: 'rgba(20,20,30,', shrink: 'rgba(40,0,80,', potato: 'rgba(120,40,0,', meteor: 'rgba(60,0,0,' }[id] || 'rgba(0,0,0,';
    const vg = ctx.createRadialGradient(0, 0, S * 0.25, 0, 0, S * 0.78);
    vg.addColorStop(0, tint + '0)'); vg.addColorStop(1, tint + (id === 'classic' ? '0.10)' : '0.32)'));
    ctx.fillStyle = vg; ctx.fillRect(-S / 2, -S / 2, S, S);
    if (id === 'large') {
      // drifting dust motes in shafts of sunlight
      ctx.fillStyle = 'rgba(255,240,200,0.10)';
      for (let k = 0; k < 3; k++) { const x = -S / 2 + ((k * 260 + t * 8) % (S + 300)) - 150; ctx.beginPath(); ctx.moveTo(x, -S / 2); ctx.lineTo(x + 120, -S / 2); ctx.lineTo(x + 320, S / 2); ctx.lineTo(x + 200, S / 2); ctx.fill(); }
      for (let k = 0; k < 30; k++) { ctx.beginPath(); ctx.arc((r() - 0.5) * S + Math.sin(t * 0.7 + k) * 20, ((r() * S + t * 12) % S) - S / 2, 2, 0, TAU); ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.fill(); }
    } else if (id === 'bouncy') {
      for (let k = 0; k < 4; k++) {
        const bx = ((k * 230 + t * (40 + k * 9)) % (S + 120)) - S / 2 - 60, by = -hh + 60 + k * 45 + Math.sin(t * 6 + k) * 6;
        ctx.strokeStyle = 'rgba(30,40,60,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        const f = Math.sin(t * 12 + k) * 5;
        ctx.beginPath(); ctx.moveTo(bx - 9, by - f); ctx.quadraticCurveTo(bx - 4, by - 5, bx, by); ctx.quadraticCurveTo(bx + 4, by - 5, bx + 9, by - f); ctx.stroke();
      }
    } else if (id === 'pillars') {
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const fx = x * (hw - 28), fy = y * (hh - 28), fl = 0.8 + 0.2 * Math.sin(t * 13 + x * 3 + y);
        const g = ctx.createRadialGradient(fx, fy, 2, fx, fy, 110 * fl); g.addColorStop(0, 'rgba(255,190,80,0.45)'); g.addColorStop(1, 'rgba(255,190,80,0)');
        ctx.fillStyle = g; ctx.fillRect(fx - 120, fy - 120, 240, 240);
        ctx.beginPath(); ctx.moveTo(fx - 6, fy + 4); ctx.quadraticCurveTo(fx, fy - 16 * fl, fx + 6, fy + 4); ctx.fillStyle = '#ffb43a'; ctx.fill();
      }
    } else if (id === 'saws') {
      for (const o of sim.obstacles) {
        if (o.kind !== 'saw') continue;
        for (let k = 0; k < 5; k++) { const a = r() * TAU + t * 20, d = o.r + r() * 26; ctx.fillStyle = r() < 0.5 ? '#ffd23f' : '#ff8a1f'; ctx.fillRect(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, 3, 3); }
      }
    } else if (id === 'shrink') {
      const pr = ((t * 120) % (S * 0.8));
      ctx.beginPath(); ctx.arc(0, 0, pr, 0, TAU); ctx.strokeStyle = 'rgba(255,63,208,' + (0.35 * (1 - pr / (S * 0.8))) + ')'; ctx.lineWidth = 3; ctx.stroke();
      for (let k = 0; k < 24; k++) { ctx.fillStyle = 'rgba(120,220,255,' + (0.3 + 0.3 * Math.sin(t * 3 + k)) + ')'; ctx.fillRect((r() - 0.5) * S, (r() - 0.5) * S, 2, 2); }
    } else if (id === 'potato') {
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k < 3; k++) {
        const ph = (t * 0.6 + k / 3 + (x + y) * 0.1) % 1;
        ctx.beginPath(); ctx.arc(x * (hw - 70) + Math.sin(ph * 6 + k) * 8, y * (hh - 70) - ph * 70, 10 + ph * 16, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,' + 0.28 * (1 - ph) + ')'; ctx.fill();
      }
    } else if (id === 'meteor') {
      const fl = 0.08 + 0.05 * Math.sin(t * 2.3);
      ctx.fillStyle = 'rgba(255,90,20,' + fl + ')'; ctx.fillRect(-S / 2, -S / 2, S, S);
    }
    ctx.restore();
  };


  // ------------------------------------------------------------ painted backgrounds (Meteor, Bouncy)
  // Painted once into a cached texture (fractal noise + cel-shaded forms), then a light live layer.
  function noiseField(n, seed, oct) {
    const r = BB.RNG(seed), g = [];
    const grids = [];
    for (let o = 0; o < oct; o++) { const m = 4 << o, a = new Float32Array((m + 1) * (m + 1)); for (let k = 0; k < a.length; k++) a[k] = r(); grids.push([m, a]); }
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let v = 0, amp = 1, tot = 0;
      for (const [m, a] of grids) {
        const fx = (x / n) * m, fy = (y / n) * m, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), w = m + 1;
        const a0 = a[iy * w + ix], a1 = a[iy * w + ix + 1], a2 = a[(iy + 1) * w + ix], a3 = a[(iy + 1) * w + ix + 1];
        v += amp * ((a0 + (a1 - a0) * sx) + ((a2 + (a3 - a2) * sx) - (a0 + (a1 - a0) * sx)) * sy); tot += amp; amp *= 0.5;
      }
      out[y * n + x] = v / tot;
    }
    void g;
    return out;
  }
  function textureCanvas(n, seed, oct, colorFn) {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), img = x.createImageData(n, n), f = noiseField(n, seed, oct);
    for (let k = 0; k < n * n; k++) { const col = colorFn(f[k], k % n / n, ((k / n) | 0) / n); img.data[k * 4] = col[0]; img.data[k * 4 + 1] = col[1]; img.data[k * 4 + 2] = col[2]; img.data[k * 4 + 3] = col[3] == null ? 255 : col[3]; }
    x.putImageData(img, 0, 0);
    return c;
  }
  function celCloud(g, x, y, w, sh, lit) {
    // puffy cumulus: shadow underside, lit body, rim highlight
    const puffs = [[0, 0, 0.42], [-0.32, 0.08, 0.3], [0.33, 0.06, 0.32], [-0.12, -0.18, 0.3], [0.16, -0.2, 0.26], [-0.5, 0.18, 0.2], [0.52, 0.17, 0.2]];
    g.save();
    g.fillStyle = sh;
    for (const [px, py, pr] of puffs) { g.beginPath(); g.arc(x + px * w, y + py * w + w * 0.05, pr * w, 0, TAU); g.fill(); }
    g.fillStyle = lit;
    for (const [px, py, pr] of puffs) { g.beginPath(); g.arc(x + px * w - w * 0.02, y + py * w - w * 0.03, pr * w * 0.9, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [px, py, pr] of puffs) { g.beginPath(); g.arc(x + px * w - pr * w * 0.25, y + py * w - pr * w * 0.3, pr * w * 0.45, 0, TAU); g.fill(); }
    g.restore();
  }
  const painted = {};
  function paint(id, S) {
    const key = id + S;
    if (painted[key]) return painted[key];
    const PX = Math.min(1600, S * 2), c = document.createElement('canvas'); c.width = c.height = PX;
    const g = c.getContext('2d'); g.scale(PX / S, PX / S);
    const r = BB.RNG(id === 'meteor' ? 4242 : 1717);
    const data = { canvas: c, cracks: [] };
    if (id === 'meteor') {
      // scorched volcanic ground
      const base = g.createRadialGradient(S * 0.5, S * 0.55, S * 0.05, S * 0.5, S * 0.5, S * 0.75);
      base.addColorStop(0, '#4a2e22'); base.addColorStop(0.6, '#2a1914'); base.addColorStop(1, '#120a08');
      g.fillStyle = base; g.fillRect(0, 0, S, S);
      g.globalAlpha = 0.55; g.globalCompositeOperation = 'overlay';
      g.drawImage(textureCanvas(256, 11, 5, (v) => { const k = 60 + v * 160; return [k, k * 0.8, k * 0.7]; }), 0, 0, S, S);
      g.globalAlpha = 0.35; g.globalCompositeOperation = 'multiply';
      g.drawImage(textureCanvas(128, 29, 3, (v) => { const k = 120 + v * 135; return [k, k * 0.92, k * 0.88]; }), 0, 0, S, S);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // glowing fissures (geometry kept for the live pulse)
      for (let i = 0; i < 4; i++) {
        let x = r() * S, y = r() * S, a = r() * TAU; const pts = [[x, y]];
        for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 1.1; const l = 22 + r() * 30; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
        data.cracks.push(pts);
      }
      const strokeCrack = (pts, w, col, blur) => { g.save(); g.shadowColor = col; g.shadowBlur = blur; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.restore(); };
      for (const pts of data.cracks) { strokeCrack(pts, 14, 'rgba(255,70,10,0.35)', 30); strokeCrack(pts, 6, '#ff6a14', 12); strokeCrack(pts, 2.2, '#ffd36a', 4); }
      // scorch craters with lit rims
      for (let i = 0; i < 5; i++) {
        const x = r() * S, y = r() * S, rr = 24 + r() * 34;
        const cg = g.createRadialGradient(x, y, rr * 0.1, x, y, rr);
        cg.addColorStop(0, 'rgba(8,4,3,0.85)'); cg.addColorStop(0.7, 'rgba(20,10,8,0.6)'); cg.addColorStop(1, 'rgba(20,10,8,0)');
        g.fillStyle = cg; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
        g.beginPath(); g.arc(x, y, rr * 0.82, Math.PI * 1.05, Math.PI * 1.75); g.strokeStyle = 'rgba(255,160,90,0.35)'; g.lineWidth = 3; g.stroke();
        g.beginPath(); g.arc(x, y, rr * 0.82, Math.PI * 0.1, Math.PI * 0.8); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 4; g.stroke();
      }
      // cel-shaded boulders: shadow side, body, warm rim light from the lava
      for (let i = 0; i < 16; i++) {
        const x = r() * S, y = r() * S, rr = 10 + r() * 26, pts = [];
        for (let v = 0; v < 7; v++) { const a = v * TAU / 7 + r() * 0.5; pts.push([x + Math.cos(a) * rr * (0.7 + r() * 0.4), y + Math.sin(a) * rr * (0.6 + r() * 0.4)]); }
        const poly = (dx, dy, k) => { g.beginPath(); pts.forEach(([px, py], n) => { const qx = x + (px - x) * k + dx, qy = y + (py - y) * k + dy; n ? g.lineTo(qx, qy) : g.moveTo(qx, qy); }); g.closePath(); };
        poly(rr * 0.15, rr * 0.25, 1.05); g.fillStyle = 'rgba(0,0,0,0.45)'; g.fill();
        poly(0, 0, 1); const bg = g.createLinearGradient(x - rr, y - rr, x + rr, y + rr); bg.addColorStop(0, '#6b4636'); bg.addColorStop(0.5, '#3a2620'); bg.addColorStop(1, '#1c110d');
        g.fillStyle = bg; g.fill(); g.lineWidth = 2; g.strokeStyle = '#0d0706'; g.stroke();
        poly(-rr * 0.12, -rr * 0.14, 0.55); g.fillStyle = 'rgba(255,170,110,0.18)'; g.fill();
      }
      // ash speckle
      for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.7 ? 'rgba(200,180,170,0.18)' : 'rgba(0,0,0,0.35)'; g.fillRect(r() * S, r() * S, 1.2 + r() * 1.6, 1.2 + r() * 1.6); }
      const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = vg; g.fillRect(0, 0, S, S);
    } else {
      // sky playground: atmosphere, sun bloom, cel-shaded cumulus banks, quilted bounce mat
      const sky = g.createLinearGradient(0, 0, 0, S);
      sky.addColorStop(0, '#2f7fd8'); sky.addColorStop(0.45, '#6fb7f2'); sky.addColorStop(0.8, '#bfe4fb'); sky.addColorStop(1, '#eef9ff');
      g.fillStyle = sky; g.fillRect(0, 0, S, S);
      const sx = S * 0.8, sy = S * 0.16;
      for (const [rr, a] of [[S * 0.55, 0.18], [S * 0.28, 0.3], [S * 0.12, 0.6]]) { const sg = g.createRadialGradient(sx, sy, 0, sx, sy, rr); sg.addColorStop(0, 'rgba(255,250,215,' + a + ')'); sg.addColorStop(1, 'rgba(255,250,215,0)'); g.fillStyle = sg; g.fillRect(0, 0, S, S); }
      g.beginPath(); g.arc(sx, sy, S * 0.055, 0, TAU); g.fillStyle = '#fffbe6'; g.fill();
      g.globalAlpha = 0.18; g.globalCompositeOperation = 'soft-light';
      g.drawImage(textureCanvas(192, 7, 4, (v) => { const k = 90 + v * 165; return [k, k, k]; }), 0, 0, S, S);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // far cloud bank, hazy
      g.globalAlpha = 0.55;
      for (let i = 0; i < 7; i++) celCloud(g, -S * 0.05 + i * S * 0.18, S * 0.66 + (i % 2) * 14, S * 0.22, '#a9c3e6', '#e3eefb');
      g.globalAlpha = 1;
      // near clouds
      for (const [x, y, w] of [[S * 0.2, S * 0.3, S * 0.26], [S * 0.62, S * 0.48, S * 0.2], [S * 0.12, S * 0.62, S * 0.16]]) celCloud(g, x, y, w, '#9fb6dd', '#f4f8ff');
      // quilted bounce mat
      const mh = S * 0.075, my = S - mh;
      const mg = g.createLinearGradient(0, my, 0, S); mg.addColorStop(0, '#5aa8ff'); mg.addColorStop(0.5, '#2f6fd0'); mg.addColorStop(1, '#1d4796');
      g.fillStyle = mg; g.fillRect(0, my, S, mh);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      for (let x = -mh; x < S + mh; x += mh * 0.9) { g.beginPath(); g.moveTo(x, my); g.lineTo(x + mh, S); g.moveTo(x + mh, my); g.lineTo(x, S); g.stroke(); }
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, my, S, 3);
      g.fillStyle = '#ffd23f'; g.fillRect(0, my - 6, S, 6); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, my - 1, S, 2);
      const vg = g.createRadialGradient(S / 2, S * 0.45, S * 0.35, S / 2, S * 0.45, S * 0.8);
      vg.addColorStop(0, 'rgba(10,40,90,0)'); vg.addColorStop(1, 'rgba(10,40,90,0.25)');
      g.fillStyle = vg; g.fillRect(0, 0, S, S);
    }
    painted[key] = data;
    return data;
  }
  BB.paintedFloor = function (ctx, sim, id) {
    const S = sim.size, t = sim.t, data = paint(id, S);
    ctx.drawImage(data.canvas, -S / 2, -S / 2, S, S);
    if (id === 'meteor') {
      // breathing glow along the fissures + rising embers
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const a = 0.12 + 0.1 * Math.sin(t * 2.4);
      for (const pts of data.cracks) { ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px - S / 2, py - S / 2) : ctx.moveTo(px - S / 2, py - S / 2))); ctx.strokeStyle = 'rgba(255,120,30,' + a + ')'; ctx.lineWidth = 18; ctx.stroke(); }
      const r = BB.RNG(9);
      for (let i = 0; i < 22; i++) { const ex = (r() - 0.5) * S + Math.sin(t * 1.3 + i) * 8, ey = ((r() * S - t * (25 + r() * 35)) % S + S) % S - S / 2; ctx.beginPath(); ctx.arc(ex, ey, 1.6 + r() * 1.4, 0, TAU); ctx.fillStyle = 'rgba(255,160,70,' + (0.4 + 0.4 * r()) + ')'; ctx.fill(); }
      ctx.restore();
    } else {
      // slow drifting foreground clouds
      ctx.save(); ctx.globalAlpha = 0.9;
      for (let i = 0; i < 2; i++) { const w = S * (0.14 + i * 0.05); celCloud(ctx, ((i * S * 0.6 + t * (6 + i * 4)) % (S + w * 2)) - S / 2 - w, -S * 0.3 + i * S * 0.22, w, '#a7bde2', '#ffffff'); }
      ctx.restore();
    }
  };

  BB.drawWalls = function (ctx, sim, dark) {
    BB.drawAmbient(ctx, sim);
    const th = THEME[sim.map.id] || THEME.classic;
    const hw = sim.W / 2, hh = sim.H / 2, w = th.wallW, t = sim.t;
    const x = -hw - w / 2, y = -hh - w / 2, W = sim.W + w, H = sim.H + w;
    if (th.neon) {
      const a = 0.6 + 0.4 * Math.sin(t * 8);
      ctx.strokeStyle = 'rgba(255,63,208,' + a * 0.35 + ')'; ctx.lineWidth = 18; ctx.strokeRect(x, y, W, H);
      ctx.strokeStyle = '#ff7ae0'; ctx.lineWidth = 5; ctx.strokeRect(x, y, W, H);
      return;
    }
    ctx.lineWidth = w; ctx.strokeStyle = dark && sim.map.id === 'classic' ? '#0b0b0e' : th.wall; ctx.strokeRect(x, y, W, H);
    if (th.hazard) {
      ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - w / 2, W + w, H + w); ctx.rect(x + w / 2, y + w / 2, W - w, H - w); ctx.clip('evenodd');
      ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 9;
      for (let k = -sim.size * 1.5; k < sim.size * 1.5; k += 26) { ctx.beginPath(); ctx.moveTo(k, -sim.size); ctx.lineTo(k + sim.size * 2, sim.size); ctx.stroke(); }
      ctx.restore();
    }
    if (th.pad) {
      ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.strokeRect(x, y, W, H); ctx.setLineDash([]);
    }
    if (th.wood) { ctx.lineWidth = 3; ctx.strokeStyle = '#5e3a17'; ctx.strokeRect(x + w / 2 - 1, y + w / 2 - 1, W - w + 2, H - w + 2); }
    if (th.trim) { ctx.lineWidth = 3; ctx.strokeStyle = th.trim; ctx.strokeRect(x + w / 2 + 2, y + w / 2 + 2, W - w - 4, H - w - 4); }
    if (th.lava) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,120,30,' + (0.6 + 0.3 * Math.sin(t * 3)) + ')'; ctx.strokeRect(x + w / 2 + 1, y + w / 2 + 1, W - w - 2, H - w - 2); }
    if (th.brick) {
      ctx.strokeStyle = th.brick; ctx.lineWidth = 2;
      for (let k = x; k < x + W; k += 28) { ctx.beginPath(); ctx.moveTo(k, y - w / 2); ctx.lineTo(k, y + w / 2); ctx.moveTo(k + 14, y + H - w / 2); ctx.lineTo(k + 14, y + H + w / 2); ctx.stroke(); }
    }
    ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.strokeRect(x - w / 2, y - w / 2, W + w, H + w);
  };

  BB.drawObstacles = function (ctx, sim, lw) {
    for (const o of sim.obstacles) {
      if (o.kind === 'pillar') {
        ctx.beginPath(); ctx.ellipse(o.x + 8, o.y + 12, o.r * 1.05, o.r, 0, 0, TAU); ctx.fillStyle = 'rgba(60,40,20,0.22)'; ctx.fill();
        circle(ctx, o.x, o.y, o.r * 1.1, '#d8ccb0', lw * 1.4);
        const g = ctx.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.35, 2, o.x, o.y, o.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfc3a8');
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.86, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
        ctx.strokeStyle = 'rgba(120,100,70,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(o.x + Math.cos(a) * o.r * 0.3, o.y + Math.sin(a) * o.r * 0.3); ctx.lineTo(o.x + Math.cos(a) * o.r * 0.82, o.y + Math.sin(a) * o.r * 0.82); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.25, 0, TAU); ctx.fillStyle = '#f2c230'; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke();
      } else if (o.kind === 'saw') {
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.25, 0, TAU); ctx.fillStyle = 'rgba(255,90,40,0.15)'; ctx.fill();
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0);
        ctx.beginPath();
        const n = 16;
        for (let i = 0; i < n; i++) { const a = (i * TAU) / n; ctx.lineTo(Math.cos(a) * o.r * 0.78, Math.sin(a) * o.r * 0.78); ctx.lineTo(Math.cos(a + 0.12) * o.r, Math.sin(a + 0.12) * o.r); }
        ctx.closePath();
        const g = ctx.createRadialGradient(-o.r * 0.3, -o.r * 0.3, 2, 0, 0, o.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#9aa5b0');
        ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * TAU / 4) * o.r * 0.5, Math.sin(i * TAU / 4) * o.r * 0.5, o.r * 0.1, 0, TAU); ctx.fillStyle = '#6b7580'; ctx.fill(); }
        circle(ctx, 0, 0, o.r * 0.26, '#d94141', lw);
        ctx.restore();
      }
    }
  };

  // ------------------------------------------------------------ impact frames
  // Anime-style impact: the action freezes and the arena becomes a stark two-tone
  // silhouette that punches in toward the hit, flips negative, then flashes red,
  // with radial speed lines throughout. imp.p goes 0 -> 1 over the hold.
  // Anime impact cut, procedurally drawn from the live arena. Sequence (imp.p 0 -> 1):
  //  A blue line-art sketch -> B crosshatched ink -> C white flash with spike burst ->
  //  D colour shards + sweeping crescent slashes + cyan glints -> E black with teal swirls ->
  //  F magenta fire burst. Small hits play a quick B + crescent flash.
  let tmp = null;
  function snapshot(c, Wc) {
    if (!tmp) tmp = document.createElement('canvas');
    if (tmp.width !== Wc) { tmp.width = Wc; tmp.height = Wc; }
    const t = tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.drawImage(c, 0, 0);
    return tmp;
  }
  function tone(ctx, Wc, fn) {
    const img = ctx.getImageData(0, 0, Wc, Wc), d = img.data;
    for (let k = 0; k < d.length; k += 4) { const l = d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11; const c = fn(l); d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; }
    ctx.putImageData(img, 0, 0);
  }
  function hatch(ctx, Wc, cx, cy, rng, n, col, len, wmax) {
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const a = rng() * TAU, d0 = Wc * (0.08 + rng() * 0.7), l = Wc * len * (0.4 + rng());
      const x = cx + Math.cos(a) * d0, y = cy + Math.sin(a) * d0, ta = a + (rng() - 0.5) * 0.25;
      ctx.lineWidth = 0.6 + rng() * wmax;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ta) * l, y + Math.sin(ta) * l); ctx.stroke();
    }
  }
  function burst(ctx, Wc, cx, cy, rng, n, col, r0, inward) {
    ctx.fillStyle = col;
    for (let k = 0; k < n; k++) {
      const a = rng() * TAU, w = 0.01 + rng() * 0.05, far = Wc * 1.6, near = Wc * (r0 + rng() * 0.25);
      ctx.beginPath();
      if (inward) { ctx.moveTo(cx + Math.cos(a - w) * far, cy + Math.sin(a - w) * far); ctx.lineTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near); ctx.lineTo(cx + Math.cos(a + w) * far, cy + Math.sin(a + w) * far); }
      else { ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - w * 0.4) * near * 2.4, cy + Math.sin(a - w * 0.4) * near * 2.4); ctx.lineTo(cx + Math.cos(a + w * 0.4) * near * 2.4, cy + Math.sin(a + w * 0.4) * near * 2.4); }
      ctx.fill();
    }
  }
  function crescent(ctx, cx, cy, R, a0, sweep, thick, col) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a0 + sweep);
    ctx.arc(cx + Math.cos(a0 + sweep / 2) * thick, cy + Math.sin(a0 + sweep / 2) * thick, R - thick * 0.2, a0 + sweep, a0, true);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function glint(ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x - r * 1.6, y - 1.5, r * 3.2, 3);
  }

  BB.impactFrame = function (R, imp, scale, sx, sy) {
    const ctx = R.ctx, c = R.c, Wc = c.width;
    const cx = Wc / 2 + (imp.x + sx) * scale, cy = Wc / 2 + (imp.y + sy) * scale;
    const p = imp.p, rng = BB.RNG(imp.seed + Math.floor(p * 12) * 17);
    const snap = snapshot(c, Wc);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    // camera: punch toward the hit with a slight dutch angle
    const zoom = (k, tilt) => { ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(k, k); ctx.translate(-cx, -cy); };
    const phase = !imp.ko ? 'E' : p < 0.14 ? 'A' : p < 0.3 ? 'B' : p < 0.4 ? 'C' : p < 0.62 ? 'D' : p < 0.78 ? 'E' : 'F';
    const tilt = (imp.seed % 2 ? 1 : -1) * 0.05;

    if (phase === 'A') {
      // pale blue line-art sketch
      ctx.save(); zoom(1.06 + p * 0.3, tilt); ctx.drawImage(snap, 0, 0); ctx.restore();
      tone(ctx, Wc, (l) => (l < 90 ? [30, 70, 150] : l < 170 ? [120, 165, 220] : [222, 236, 250]));
      hatch(ctx, Wc, cx, cy, rng, 120, 'rgba(40,80,160,0.55)', 0.05, 1.2);
    } else if (phase === 'B' || phase === 'S') {
      // heavy black-and-white crosshatch ink with a white blow-out at the hit
      ctx.save(); zoom(1.14 + p * 0.1, -tilt); ctx.drawImage(snap, 0, 0); ctx.restore();
      tone(ctx, Wc, (l) => (l < 130 ? [10, 10, 12] : [250, 250, 246]));
      hatch(ctx, Wc, cx, cy, rng, imp.mini ? 160 : 360, '#0a0a0c', 0.09, 2.4);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Wc * 0.32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wc, Wc);
      if (phase === 'S') crescent(ctx, cx, cy, Wc * 0.3, (imp.seed % 6), 2.2, Wc * 0.08, '#ffffff');
    } else if (phase === 'C') {
      // white-out flash: black spikes stabbing in from the frame edges
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, Wc, Wc);
      burst(ctx, Wc, cx, cy, rng, 40, '#0a0a0c', 0.3, true);
      glint(ctx, cx, cy, Wc * 0.12, 'rgba(160,230,255,0.9)');
    } else if (phase === 'D') {
      // muted scene shattered into pink/red shards, white crescent slashes, cyan glints
      ctx.save(); zoom(1.25, tilt * 1.5); ctx.drawImage(snap, 0, 0); ctx.restore();
      tone(ctx, Wc, (l) => { const v = 120 + l * 0.45; return [v + 8, v + 4, v - 6]; });
      for (let k = 0; k < 46; k++) {
        const x = rng() * Wc, y = rng() * Wc, s = Wc * (0.02 + rng() * 0.07), a = rng() * TAU;
        ctx.beginPath(); for (let v = 0; v < 4; v++) { const aa = a + v * (TAU / 4) + (rng() - 0.5) * 0.9, rr = s * (0.4 + rng()); ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr * 1.6); }
        ctx.closePath(); ctx.fillStyle = rng() < 0.65 ? 'rgba(232,40,90,0.9)' : rng() < 0.5 ? 'rgba(60,50,60,0.75)' : 'rgba(250,236,200,0.9)'; ctx.fill();
      }
      const k = (p - 0.4) / 0.22;
      for (let n = 0; n < 4; n++) crescent(ctx, cx + (rng() - 0.5) * Wc * 0.3, cy + (rng() - 0.5) * Wc * 0.3, Wc * (0.25 + n * 0.12), rng() * TAU + k * 2.5, 1.6 + rng(), Wc * 0.03, 'rgba(255,255,255,' + (0.85 - n * 0.15) + ')');
      ctx.globalCompositeOperation = 'lighter';
      glint(ctx, cx + Wc * 0.12, cy - Wc * 0.04, Wc * 0.06, 'rgba(70,230,255,0.8)');
      glint(ctx, cx - Wc * 0.18, cy + Wc * 0.06, Wc * 0.045, 'rgba(70,230,255,0.7)');
      const fl = ctx.createLinearGradient(0, 0, Wc, Wc); fl.addColorStop(0, 'rgba(255,120,200,0.0)'); fl.addColorStop(0.5, 'rgba(255,170,230,0.25)'); fl.addColorStop(1, 'rgba(255,120,200,0)');
      ctx.fillStyle = fl; ctx.fillRect(0, 0, Wc, Wc);
      ctx.globalCompositeOperation = 'source-over';
    } else if (phase === 'E') {
      // black frame with swirling teal energy and a white burst
      ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, Wc, Wc);
      ctx.lineCap = 'round';
      for (let n = 0; n < 9; n++) {
        const R0 = Wc * (0.15 + rng() * 0.5), a0 = rng() * TAU + p * 6;
        ctx.beginPath(); ctx.ellipse(cx, cy, R0, R0 * (0.5 + rng() * 0.5), rng() * TAU, a0, a0 + 1.5 + rng() * 2);
        ctx.strokeStyle = rng() < 0.4 ? '#ffffff' : 'rgba(110,210,210,0.9)'; ctx.lineWidth = Wc * (0.004 + rng() * 0.012); ctx.stroke();
      }
      burst(ctx, Wc, cx, cy, rng, 22, '#ffffff', 0.12, false);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Wc * 0.12); g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wc, Wc);
    } else {
      // magenta field with a cream fire burst and red glowing ring
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Wc);
      bg.addColorStop(0, '#ff4fa0'); bg.addColorStop(0.5, '#d61f5a'); bg.addColorStop(1, '#5a0820');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, Wc, Wc);
      const k = (p - 0.78) / 0.22;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.5); ctx.scale(1, 0.62);
      ctx.beginPath(); ctx.arc(0, 0, Wc * (0.22 + k * 0.1), 0, TAU); ctx.lineWidth = Wc * 0.08; ctx.strokeStyle = '#ff7a3a'; ctx.stroke();
      ctx.lineWidth = Wc * 0.012; ctx.strokeStyle = '#ffe2b0';
      for (let n = 0; n < 14; n++) { const a = (n / 14) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * Wc * 0.18, Math.sin(a) * Wc * 0.18); ctx.lineTo(Math.cos(a) * Wc * 0.28, Math.sin(a) * Wc * 0.28); ctx.stroke(); }
      ctx.restore();
      // shards of light flying outward, plus a few four-point sparkles
      for (let n = 0; n < 26; n++) {
        const a = rng() * TAU, d = Wc * (0.12 + rng() * 0.36) * (0.7 + k * 0.6), L = Wc * (0.04 + rng() * 0.07), w = L * 0.16;
        const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(0, -w); ctx.lineTo(-L * 0.6, 0); ctx.lineTo(0, w); ctx.closePath();
        ctx.fillStyle = rng() < 0.7 ? '#fff1d6' : '#ffb3d1'; ctx.fill();
        ctx.restore();
      }
      for (let n = 0; n < 7; n++) {
        const a = rng() * TAU, d = Wc * (0.08 + rng() * 0.3), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
        const S = Wc * (0.02 + rng() * 0.03) * (0.8 + 0.4 * Math.sin(k * 9 + n)), t = S * 0.18;
        ctx.beginPath();
        ctx.moveTo(x, y - S); ctx.quadraticCurveTo(x + t, y - t, x + S, y); ctx.quadraticCurveTo(x + t, y + t, x, y + S);
        ctx.quadraticCurveTo(x - t, y + t, x - S, y); ctx.quadraticCurveTo(x - t, y - t, x, y - S);
        ctx.fillStyle = '#ffffff'; ctx.fill();
      }
    }
    // thin letterbox for a cinematic cut
    if (!imp.mini) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Wc, Wc * 0.06); ctx.fillRect(0, Wc * 0.94, Wc, Wc * 0.06); }
    ctx.restore();
  };
})();
