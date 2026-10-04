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

    weaponTrail(ctx, b, w, col);

    ctx.save();
    if (b.phase > 0) ctx.globalAlpha = 0.45 + 0.15 * Math.sin(sim.t * 20);
    // squash & stretch along the last impact direction
    ctx.translate(b.x, b.y);
    if (b.sq > 0) { const k = b.sq * 0.16; ctx.rotate(b.sqA); ctx.scale(1 - k, 1 + k * 0.7); ctx.rotate(-b.sqA); }
    const r = b.r;
    if (showTeam) { ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = tm.fill; ctx.stroke(); }
    // body
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, shade(col, 0.28)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.28));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.38, r * 0.2, -0.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    if (b.slowT > 0) { ctx.fillStyle = 'rgba(191,233,255,0.55)'; ctx.fillRect(-r, -r, r * 2, r * 2); }
    if (b.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, b.flash * 9) + ')'; ctx.fillRect(-r, -r, r * 2, r * 2); }
    ctx.restore();
    ctx.lineWidth = lw * (b.main ? 1.5 : 1.1); ctx.strokeStyle = OUT; ctx.stroke();
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
    if (b.main || b.r > 12) {
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
      const g = ctx.createLinearGradient(0, -hh, 0, hh);
      g.addColorStop(0, '#6ec3ff'); g.addColorStop(0.7, '#c9ecff'); g.addColorStop(1, '#eaf8ff');
      ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.beginPath(); ctx.arc(hw - 90, -hh + 90, 46, 0, TAU); ctx.fillStyle = '#fff3a6'; ctx.fill();
      ctx.beginPath(); ctx.arc(hw - 90, -hh + 90, 62, 0, TAU); ctx.fillStyle = 'rgba(255,243,166,0.35)'; ctx.fill();
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 170 + t * (10 + i * 3)) % (S + 200)) - S / 2 - 100, cy = -hh + 80 + i * 70;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath(); ctx.arc(cx, cy, 24, 0, TAU); ctx.arc(cx + 30, cy - 12, 32, 0, TAU); ctx.arc(cx + 64, cy, 24, 0, TAU); ctx.rect(cx, cy, 64, 24); ctx.fill();
      }
      ctx.fillStyle = '#2f7bdc'; ctx.fillRect(-S / 2, hh - 22, S, 22);
      ctx.fillStyle = '#ffd23f'; for (let x = -S / 2; x < S / 2; x += 44) ctx.fillRect(x, hh - 22, 22, 22);
      ctx.fillStyle = '#1d1d22'; ctx.fillRect(-S / 2, hh - 24, S, 3);
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
      ctx.fillStyle = '#2b2422'; ctx.fillRect(-S / 2, -S / 2, S, S);
      for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((r() - 0.5) * S, (r() - 0.5) * S, 8 + r() * 30, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill(); }
      const glow = 0.55 + 0.25 * Math.sin(t * 3);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) {
        let x = (r() - 0.5) * S, y = (r() - 0.5) * S; const pts = [[x, y]];
        for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 110; y += (r() - 0.5) * 110; pts.push([x, y]); }
        for (const [wd, c] of [[12, 'rgba(255,90,20,' + glow * 0.35 + ')'], [4, 'rgba(255,170,60,' + glow + ')']]) {
          ctx.beginPath(); pts.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.stroke();
        }
      }
      for (let i = 0; i < 18; i++) { const ex = (r() - 0.5) * S, ey = ((r() * S - t * (30 + r() * 40)) % S + S) % S - S / 2; ctx.beginPath(); ctx.arc(ex, ey, 2, 0, TAU); ctx.fillStyle = 'rgba(255,170,60,0.8)'; ctx.fill(); }
    }
  };

  // Lighting + ambient life drawn over the arena (under the walls).
  BB.drawAmbient = function (ctx, sim) {
    const hw = sim.W / 2, hh = sim.H / 2, S = sim.size, id = sim.map.id, t = sim.t;
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
  let tmp = null, dots = null;
  const SFX = ['BAM!', 'WHAM!', 'CRACK!', 'POW!', 'SMASH!', 'THWACK!'];
  function halftone(px) {
    // cached dot pattern tile for comic-book shading
    if (dots && dots.px === px) return dots.pat;
    const c = document.createElement('canvas'), n = Math.max(6, Math.round(px));
    c.width = c.height = n;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.beginPath(); g.arc(n / 2, n / 2, n * 0.28, 0, TAU); g.fill();
    dots = { px, pat: c };
    return c;
  }
  BB.impactFrame = function (R, imp, scale, sx, sy) {
    const ctx = R.ctx, c = R.c, Wc = c.width;
    const cx = Wc / 2 + (imp.x + sx) * scale, cy = Wc / 2 + (imp.y + sy) * scale;
    const p = imp.p, big = !imp.mini;
    if (!tmp) tmp = document.createElement('canvas');
    if (tmp.width !== Wc) { tmp.width = Wc; tmp.height = Wc; }
    const tctx = tmp.getContext('2d');
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.drawImage(c, 0, 0);
    // punch-in zoom + dutch tilt toward the hit
    const ease = Math.sin(Math.min(1, p * 2.4) * Math.PI * 0.5);
    const z = 1 + (big ? 0.16 : 0.07) * ease + (imp.ko ? 0.08 : 0);
    const tilt = (imp.seed % 2 ? 1 : -1) * (big ? 0.06 : 0.025) * ease;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, Wc, Wc);
    ctx.translate(cx, cy); ctx.rotate(tilt); ctx.scale(z, z); ctx.translate(-cx, -cy);
    ctx.drawImage(tmp, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // two-tone ink: paper -> negative -> blood red (mini frames stay on paper)
    const phase = !big ? 0 : p < 0.36 ? 0 : p < 0.7 ? 1 : 2;
    const img = ctx.getImageData(0, 0, Wc, Wc), d = img.data;
    const ink = phase === 1 ? [248, 246, 238] : phase === 2 ? [18, 0, 6] : [10, 10, 14];
    const paper = phase === 1 ? [8, 8, 12] : phase === 2 ? [214, 28, 44] : [248, 245, 236];
    const mid = phase === 2 ? [120, 10, 24] : phase === 1 ? [70, 70, 78] : [170, 168, 160];
    for (let k = 0; k < d.length; k += 4) {
      const l = d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
      const col = l < 105 ? ink : l < 175 ? mid : paper;
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2];
    }
    ctx.putImageData(img, 0, 0);
    // halftone shading that thickens toward the frame edges
    ctx.save();
    const pat = ctx.createPattern(halftone(Wc / 70), 'repeat');
    const vg = ctx.createRadialGradient(cx, cy, Wc * 0.15, cx, cy, Wc * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalAlpha = phase === 1 ? 0.25 : 0.4;
    ctx.globalCompositeOperation = phase === 1 ? 'lighter' : 'multiply';
    ctx.fillStyle = pat; ctx.fillRect(0, 0, Wc, Wc);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.restore();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // brush-stroke speed lines converging on the hit
    const rng = BB.RNG(imp.seed + phase * 31);
    const lineCol = phase === 1 ? '#ffffff' : '#0a0a0e';
    ctx.fillStyle = lineCol;
    const n = imp.ko ? 60 : big ? 44 : 26;
    for (let k = 0; k < n; k++) {
      const a = rng() * TAU, w = 0.004 + rng() * (big ? 0.03 : 0.018);
      const r0 = Wc * (0.12 + rng() * 0.24) * (1 - p * 0.25);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - w) * Wc * 1.6, cy + Math.sin(a - w) * Wc * 1.6);
      ctx.quadraticCurveTo(cx + Math.cos(a + w * 0.3) * r0 * 1.6, cy + Math.sin(a + w * 0.3) * r0 * 1.6, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a + w) * Wc * 1.6, cy + Math.sin(a + w) * Wc * 1.6);
      ctx.fill();
    }
    // jagged impact star with chromatic split
    const star = (ox, oy, col, sc) => {
      ctx.beginPath();
      const sp = 16, R0 = Wc * 0.045 * (1 + p) * sc, R1 = Wc * (big ? 0.15 : 0.09) * (1 + p * 0.8) * sc;
      const r2 = BB.RNG(imp.seed);
      for (let k = 0; k < sp * 2; k++) { const a = (k * Math.PI) / sp + imp.seed, rr = k % 2 ? R0 : R1 * (0.6 + r2() * 0.6); ctx.lineTo(cx + ox + Math.cos(a) * rr, cy + oy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    const off = Wc * 0.006;
    if (big) { star(-off, 0, 'rgba(255,40,80,0.85)', 1.04); star(off, 0, 'rgba(40,200,255,0.85)', 1.04); }
    star(0, 0, phase === 1 ? '#0a0a0e' : '#ffffff', 1);
    ctx.lineWidth = Wc * 0.006; ctx.strokeStyle = lineCol; ctx.stroke();
    // comic SFX lettering on big hits
    if (big) {
      const word = imp.ko ? 'K.O.!' : SFX[imp.seed % SFX.length];
      const fs = Wc * (imp.ko ? 0.2 : 0.13) * (0.85 + ease * 0.25);
      const tx = BB.clamp(cx + (cx < Wc / 2 ? 1 : -1) * Wc * 0.2, fs * 1.4, Wc - fs * 1.4);
      const ty = BB.clamp(cy - Wc * 0.18, fs, Wc - fs * 0.3);
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(-0.12 + tilt * 2);
      ctx.font = fs + 'px Anton, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = fs * 0.22; ctx.strokeStyle = phase === 1 ? '#ffffff' : '#0a0a0e'; ctx.strokeText(word, fs * 0.05, fs * 0.08);
      ctx.strokeText(word, 0, 0);
      ctx.fillStyle = phase === 2 ? '#ffffff' : '#ffd23f'; ctx.fillText(word, 0, 0);
      ctx.restore();
    }
    // manga panel border
    ctx.lineWidth = Wc * 0.02; ctx.strokeStyle = '#000'; ctx.strokeRect(0, 0, Wc, Wc);
    ctx.restore();
  };
})();
