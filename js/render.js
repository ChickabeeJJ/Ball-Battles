// Canvas drawing: arena, balls, weapons, projectiles, fx and menu icons.
// All art is procedural vector drawing so it stays crisp at any resolution.
(function () {
  const BB = window.BB;
  const TAU = Math.PI * 2;
  const OUT = '#1d1d22';
  // lighten (k > 0) or darken (k < 0) a #rrggbb colour
  function shadeHex(hex, k) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    if (!isFinite(n)) return hex;
    const f = (c) => Math.round(Math.max(0, Math.min(255, k > 0 ? c + (255 - c) * k : c * (1 + k))));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('');
  }
  const METAL = '#eef2f6', METAL_D = '#b4c0cb', WOOD = '#a0612f', WOOD_D = '#6e3d1c', GOLD = '#f6c431', GREY = '#8d969f';
  const FONT = "Anton, \"Lilita One\", Impact, sans-serif";
  const NUM_FONT = "\"Lilita One\", \"Arial Black\", sans-serif";
  BB.NUM_FONT = NUM_FONT;

  function path(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
  }
  let CUR_W = 10;
  const MATS = {};
  function material(ctx, fill) {
    const m = MATS[fill];
    if (!m) return fill;
    const g = ctx.createLinearGradient(0, -CUR_W * 0.6, 0, CUR_W * 0.6);
    m.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  function fillStroke(ctx, fill, lw) {
    ctx.fillStyle = material(ctx, fill); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
  }
  function rect(ctx, x0, x1, h, fill, lw) {
    path(ctx, [x0, -h / 2, x1, -h / 2, x1, h / 2, x0, h / 2]);
    fillStroke(ctx, fill, lw);
  }
  function circle(ctx, x, y, r, fill, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    fillStroke(ctx, fill, lw);
  }

  // Each drawer works in local space: +x points away from the ball, the weapon
  // occupies x in [s, s+L] and is roughly W thick. `team` is a team colour.
  const DRAW = {
    sword(ctx, s, L, W, lw) {
      circle(ctx, s + W * 0.1, 0, W * 0.42, GOLD, lw);
      rect(ctx, s + W * 0.2, s + L * 0.24, W * 0.55, WOOD, lw);
      rect(ctx, s + L * 0.22, s + L * 0.29, W * 2.1, GOLD, lw);
      path(ctx, [s + L * 0.29, -W / 2, s + L * 0.86, -W / 2, s + L, 0, s + L * 0.86, W / 2, s + L * 0.29, W / 2]);
      fillStroke(ctx, METAL, lw);
      ctx.beginPath(); ctx.moveTo(s + L * 0.33, 0); ctx.lineTo(s + L * 0.84, 0);
      ctx.strokeStyle = METAL_D; ctx.lineWidth = lw * 0.8; ctx.stroke();
    },
    dagger(ctx, s, L, W, lw) {
      rect(ctx, s, s + L * 0.32, W * 0.6, '#5b3a8c', lw);
      rect(ctx, s + L * 0.3, s + L * 0.38, W * 1.9, GOLD, lw);
      path(ctx, [s + L * 0.38, -W / 2, s + L * 0.8, -W / 2, s + L, 0, s + L * 0.8, W / 2, s + L * 0.38, W / 2]);
      fillStroke(ctx, METAL, lw);
    },
    spear(ctx, s, L, W, lw) {
      const head = Math.min(L * 0.3, W * 4.5);
      rect(ctx, s, s + L - head * 0.85, W * 0.5, WOOD, lw);
      rect(ctx, s + L - head * 1.05, s + L - head * 0.85, W * 0.85, '#d94141', lw);
      path(ctx, [s + L - head, 0, s + L - head * 0.75, -W * 0.85, s + L, 0, s + L - head * 0.75, W * 0.85]);
      fillStroke(ctx, METAL, lw);
    },
    axe(ctx, s, L, W, lw) {
      rect(ctx, s, s + L, W * 0.4, WOOD, lw);
      path(ctx, [s + L * 0.62, -W * 0.2, s + L * 0.5, -W * 1.05, s + L * 0.98, -W * 1.25, s + L * 0.92, -W * 0.2]);
      fillStroke(ctx, METAL, lw);
      path(ctx, [s + L * 0.7, W * 0.2, s + L * 0.76, W * 0.55, s + L * 0.88, W * 0.2]);
      fillStroke(ctx, METAL_D, lw);
    },
    hammer(ctx, s, L, W, lw) {
      rect(ctx, s, s + L * 0.72, W * 0.32, WOOD, lw);
      path(ctx, [s + L * 0.62, -W * 0.62, s + L, -W * 0.62, s + L, W * 0.62, s + L * 0.62, W * 0.62]);
      fillStroke(ctx, GREY, lw);
      rect(ctx, s + L * 0.7, s + L * 0.76, W * 1.24, '#5f666d', lw);
      rect(ctx, s + L * 0.86, s + L * 0.92, W * 1.24, '#5f666d', lw);
    },
    katana(ctx, s, L, W, lw) {
      rect(ctx, s, s + L * 0.26, W * 0.6, '#2b2b40', lw);
      ctx.strokeStyle = '#e6e1d3'; ctx.lineWidth = lw * 0.7;
      for (let i = 1; i < 4; i++) { const x = s + (L * 0.26 * i) / 4; ctx.beginPath(); ctx.moveTo(x - W * 0.2, -W * 0.3); ctx.lineTo(x + W * 0.2, W * 0.3); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(s + L * 0.28, 0, W * 0.25, W * 0.85, 0, 0, TAU); fillStroke(ctx, GOLD, lw);
      ctx.beginPath();
      ctx.moveTo(s + L * 0.3, -W * 0.4);
      ctx.quadraticCurveTo(s + L * 0.75, -W * 0.55, s + L, -W * 0.95);
      ctx.quadraticCurveTo(s + L * 0.75, W * 0.25, s + L * 0.3, W * 0.4);
      ctx.closePath(); fillStroke(ctx, METAL, lw);
    },
    scythe(ctx, s, L, W, lw) {
      rect(ctx, s, s + L, W * 0.32, '#5a3a22', lw);
      ctx.beginPath();
      ctx.moveTo(s + L * 0.97, -W * 0.1);
      ctx.quadraticCurveTo(s + L * 1.02, -W * 1.4, s + L * 0.4, -W * 1.45);
      ctx.quadraticCurveTo(s + L * 0.8, -W * 0.95, s + L * 0.86, -W * 0.1);
      ctx.closePath(); fillStroke(ctx, '#d7dde3', lw);
    },
    torch(ctx, s, L, W, lw, t) {
      path(ctx, [s, -W * 0.22, s + L * 0.66, -W * 0.34, s + L * 0.66, W * 0.34, s, W * 0.22]);
      fillStroke(ctx, WOOD, lw);
      rect(ctx, s + L * 0.58, s + L * 0.7, W * 0.8, '#4a4a52', lw);
      const f = Math.sin(t * 22) * 0.08, g = Math.cos(t * 17) * 0.1;
      ctx.beginPath();
      ctx.moveTo(s + L * 0.68, -W * 0.5);
      ctx.quadraticCurveTo(s + L * (0.9 + f), -W * (0.75 + g), s + L * (1.08 + f), W * g);
      ctx.quadraticCurveTo(s + L * (0.9 - f), W * (0.75 - g), s + L * 0.68, W * 0.5);
      ctx.closePath(); fillStroke(ctx, '#ff7a1a', lw);
      ctx.beginPath();
      ctx.moveTo(s + L * 0.7, -W * 0.25);
      ctx.quadraticCurveTo(s + L * 0.86, -W * 0.3, s + L * (0.96 + f), 0);
      ctx.quadraticCurveTo(s + L * 0.86, W * 0.3, s + L * 0.7, W * 0.25);
      ctx.closePath(); ctx.fillStyle = '#ffd23f'; ctx.fill();
    },
    flask(ctx, s, L, W, lw) {
      rect(ctx, s, s + L * 0.14, W * 0.42, '#a0612f', lw);
      rect(ctx, s + L * 0.12, s + L * 0.42, W * 0.36, '#d9f1ff', lw);
      const cx = s + L * 0.7, r = Math.min(L * 0.3, W * 0.55);
      circle(ctx, cx, 0, r, '#d9f1ff', lw);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, 0, r - lw * 0.6, 0, TAU); ctx.clip();
      ctx.fillStyle = '#9b4dff'; ctx.fillRect(cx - r * 0.2, -r, r * 2, r * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(cx + r * 0.35, -r * 0.3, r * 0.15, 0, TAU); ctx.fill();
      ctx.restore();
    },
    wrench(ctx, s, L, W, lw) {
      rect(ctx, s, s + L * 0.78, W * 0.36, '#a7b0b9', lw);
      path(ctx, [s + L * 0.72, -W * 0.5, s + L * 0.86, -W * 0.5, s + L, -W * 0.42, s + L, -W * 0.12, s + L * 0.88, -W * 0.12,
        s + L * 0.88, W * 0.12, s + L, W * 0.12, s + L, W * 0.42, s + L * 0.86, W * 0.5, s + L * 0.72, W * 0.5]);
      fillStroke(ctx, '#a7b0b9', lw);
    },
    // Curved knight's shield seen edge-on: arm strap, painted face with a gold band, steel rim
    // with rivets and a domed boss.
    shield(ctx, s, L, W, lw, t, team) {
      const h = W / 2, x0 = s, bulge = s + L * 1.7, col = team || '#3d8bf2';
      ctx.save(); ctx.lineJoin = 'round';
      // arm strap behind the plate
      ctx.beginPath(); ctx.rect(s - L * 0.55, -h * 0.16, L * 0.7, h * 0.32); ctx.fillStyle = '#6e4a2a'; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke();
      const plate = (k) => { // k < 1 insets the outline for the painted face
        const yh = h * k, xb = x0 + (bulge - x0) * (0.25 + 0.75 * k), xi = x0 + L * (1 - k) * 0.55;
        ctx.beginPath(); ctx.moveTo(xi, -yh);
        ctx.bezierCurveTo(xb, -yh * 0.95, xb + L * 0.15, -yh * 0.35, xb + L * 0.15, 0);
        ctx.bezierCurveTo(xb + L * 0.15, yh * 0.35, xb, yh * 0.95, xi, yh);
        ctx.quadraticCurveTo(xi + L * 0.45, 0, xi, -yh); ctx.closePath();
      };
      // steel rim
      plate(1);
      const rg = ctx.createLinearGradient(0, -h, 0, h);
      rg.addColorStop(0, '#f1f4f7'); rg.addColorStop(0.45, '#aeb8c2'); rg.addColorStop(0.55, '#8d98a4'); rg.addColorStop(1, '#d8dee4');
      ctx.fillStyle = rg; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
      // painted face with shading
      plate(0.8);
      const fg = ctx.createLinearGradient(0, -h, 0, h);
      fg.addColorStop(0, shadeHex(col, 0.3)); fg.addColorStop(0.5, col); fg.addColorStop(1, shadeHex(col, -0.3));
      ctx.fillStyle = fg; ctx.fill();
      // gold band across the face
      ctx.save(); plate(0.8); ctx.clip();
      ctx.fillStyle = GOLD; ctx.fillRect(x0 - L, -h * 0.13, L * 4, h * 0.26);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x0 - L, -h * 0.13, L * 4, h * 0.06);
      // specular sheen
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x0 - L, -h * 0.8, L * 4, h * 0.22);
      ctx.restore();
      plate(0.8); ctx.lineWidth = lw * 0.6; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
      // rivets along the rim
      for (const k of [-0.88, -0.5, 0.5, 0.88]) {
        const y = h * k, x = x0 + (bulge - x0) * (1 - Math.abs(k) * 0.55) + L * 0.05;
        ctx.beginPath(); ctx.arc(x, y, Math.max(1.4, L * 0.09), 0, TAU); ctx.fillStyle = '#e9edf1'; ctx.fill(); ctx.lineWidth = lw * 0.5; ctx.stroke();
      }
      // domed boss
      const bx = x0 + (bulge - x0) * 0.86, br = Math.min(h * 0.24, L * 0.62);
      const bgr = ctx.createRadialGradient(bx - br * 0.3, -br * 0.35, br * 0.1, bx, 0, br);
      bgr.addColorStop(0, '#fff3c4'); bgr.addColorStop(0.6, GOLD); bgr.addColorStop(1, '#a8740c');
      ctx.beginPath(); ctx.arc(bx, 0, br, 0, TAU); ctx.fillStyle = bgr; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.restore();
    },
    bow(ctx, s, L, W, lw) {
      const h = W * 0.95, back = s + L * 0.2;
      ctx.beginPath(); ctx.moveTo(back, -h); ctx.lineTo(back, h);
      ctx.strokeStyle = '#f4ead2'; ctx.lineWidth = lw * 0.7; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(back, -h); ctx.quadraticCurveTo(s + L * 1.05, 0, back, h);
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 3.2; ctx.stroke();
      ctx.strokeStyle = WOOD; ctx.lineWidth = lw * 1.6; ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(back - L * 0.1, 0); ctx.lineTo(s + L * 0.95, 0);
      ctx.strokeStyle = '#6e3d1c'; ctx.lineWidth = lw; ctx.stroke();
      path(ctx, [s + L * 0.95, -W * 0.18, s + L * 1.15, 0, s + L * 0.95, W * 0.18]);
      fillStroke(ctx, METAL, lw * 0.7);
    },
    shuriken(ctx, s, L, W, lw, t) {
      drawStar(ctx, s + L * 0.55, 0, W * 0.6, t * 12, lw);
    },
    boomerang(ctx, s, L, W, lw, t) {
      drawBoomerang(ctx, s + L * 0.5, 0, W * 0.75, 0, lw);
    },
    grimoire(ctx, s, L, W, lw, t) {
      const cx = s + L * 0.55, bob = Math.sin(t * 5) * W * 0.06;
      ctx.save(); ctx.translate(cx, bob);
      path(ctx, [-W * 0.45, -W * 0.55, W * 0.45, -W * 0.55, W * 0.45, W * 0.55, -W * 0.45, W * 0.55]);
      fillStroke(ctx, '#6b3fa0', lw);
      rect(ctx, W * 0.32, W * 0.45, W * 1.0, '#f3ead2', lw * 0.7);
      ctx.beginPath(); ctx.arc(0, 0, W * 0.18, 0, TAU); ctx.fillStyle = '#4de1ff'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.restore();
    },
    cannon(ctx, s, L, W, lw) {
      path(ctx, [s, -W * 0.4, s + L * 0.9, -W * 0.32, s + L * 0.9, W * 0.32, s, W * 0.4]);
      fillStroke(ctx, '#3b3f46', lw);
      rect(ctx, s + L * 0.86, s + L, W * 0.86, '#3b3f46', lw);
      rect(ctx, s + L * 0.3, s + L * 0.38, W * 0.9, GOLD, lw * 0.8);
    },
    lance(ctx, s, L, W, lw, t, team) {
      rect(ctx, s, s + L * 0.14, W * 0.42, '#3a3a44', lw);
      ctx.save();
      path(ctx, [s + L * 0.14, -W * 0.7, s + L, 0, s + L * 0.14, W * 0.7]);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.clip();
      ctx.fillStyle = team || '#f0545a';
      for (let i = 0; i < 6; i++) { const x = s + L * 0.14 + i * L * 0.15; path(ctx, [x, -W, x + L * 0.07, -W, x + L * 0.12, W, x + L * 0.05, W]); ctx.fill(); }
      ctx.restore();
      path(ctx, [s + L * 0.14, -W * 0.7, s + L, 0, s + L * 0.14, W * 0.7]);
      ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s + L * 0.15, 0, W * 0.22, W * 0.95, 0, 0, TAU); fillStroke(ctx, METAL_D, lw);
    },
  };

  function drawStar(ctx, x, y, r, rot, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8, rr = i % 2 === 0 ? r : r * 0.38;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); fillStroke(ctx, '#aeb8c2', lw);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TAU); ctx.fillStyle = OUT; ctx.fill();
    ctx.restore();
  }

  function drawBoomerang(ctx, x, y, r, rot, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r); ctx.lineTo(r * 0.5, 0); ctx.lineTo(-r * 0.6, r);
    ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.62 + lw * 2; ctx.stroke();
    ctx.strokeStyle = '#e48a2f'; ctx.lineWidth = r * 0.62; ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    ctx.restore();
  }

  MATS[METAL] = [[0, '#ffffff'], [0.45, '#e4eaf0'], [0.55, '#c3ced8'], [1, '#8d9aa6']];
  MATS[GOLD] = [[0, '#fff1a8'], [0.5, '#f6c431'], [1, '#b8860b']];
  MATS[WOOD] = [[0, '#c98a4f'], [0.5, '#a0612f'], [1, '#6e3d1c']];
  BB.DRAW = DRAW;
  BB.wpn = { path, fillStroke, rect, circle, METAL, METAL_D, WOOD, GOLD, GREY, OUT, setW: (w) => { CUR_W = w; } };
  BB.drawWeapon = function (ctx, id, s, L, W, lw, t, team) {
    CUR_W = W;
    const d = DRAW[id];
    if (d) d(ctx, s, L, W, lw, t || 0, team);
  };

  // ------------------------------------------------------------ special emblems (menu icons)
  function emblem(ctx, id, r, lw) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff';
    if (id === 'fibonacci') {
      // golden spiral built from quarter arcs
      ctx.lineWidth = r * 0.13;
      let x = r * 0.08, y = r * 0.02, s = r * 0.06, a = 0;
      ctx.beginPath();
      const seq = [1, 1, 2, 3, 5, 8];
      const offs = [[0, 1], [-1, 0], [0, -1], [1, 0]];
      let cx = x, cy = y;
      for (let i = 0; i < seq.length; i++) {
        const rr = seq[i] * s;
        ctx.arc(cx, cy, rr, a, a + Math.PI / 2);
        const nextR = (seq[i + 1] || 0) * s;
        const ea = a + Math.PI / 2;
        const ex = cx + Math.cos(ea) * rr, ey = cy + Math.sin(ea) * rr;
        cx = ex - Math.cos(ea) * nextR; cy = ey - Math.sin(ea) * nextR;
        a = ea;
      }
      ctx.stroke();
      void offs;
    } else if (id === 'speedy') {
      ctx.lineWidth = r * 0.16;
      for (const dx of [-0.28, 0.12]) { ctx.beginPath(); ctx.moveTo(dx * r - r * 0.12, -r * 0.38); ctx.lineTo(dx * r + r * 0.22, 0); ctx.lineTo(dx * r - r * 0.12, r * 0.38); ctx.stroke(); }
    } else if (id === 'grower') {
      ctx.lineWidth = r * 0.12;
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * TAU) / 4, c = Math.cos(a), si = Math.sin(a);
        ctx.beginPath(); ctx.moveTo(c * r * 0.15, si * r * 0.15); ctx.lineTo(c * r * 0.55, si * r * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c * r * 0.55 - si * r * 0.0, si * r * 0.55);
        ctx.lineTo(c * r * 0.55 - c * r * 0.2 + si * r * 0.14, si * r * 0.55 - si * r * 0.2 - c * r * 0.14);
        ctx.moveTo(c * r * 0.55, si * r * 0.55);
        ctx.lineTo(c * r * 0.55 - c * r * 0.2 - si * r * 0.14, si * r * 0.55 - si * r * 0.2 + c * r * 0.14);
        ctx.stroke();
      }
    } else if (id === 'gravitron') {
      ctx.lineWidth = r * 0.1;
      for (const rr of [0.18, 0.38, 0.58]) { ctx.beginPath(); ctx.arc(0, 0, rr * r, 0.3, TAU - 0.9); ctx.stroke(); }
    } else if (id === 'splodey') {
      ctx.lineWidth = r * 0.1; ctx.strokeStyle = '#d9a066';
      ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.6); ctx.quadraticCurveTo(r * 0.75, -r * 0.95, r * 0.95, -r * 0.8); ctx.stroke();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(r * 0.98, -r * 0.82, r * 0.16, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.16, 0, TAU); ctx.fill();
    } else if (id === 'duplicator') {
      ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.05, r * 0.32, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.26, r * 0.12, r * 0.24, 0, TAU); ctx.stroke();
    } else if (id === 'vampire') {
      ctx.fillStyle = '#ffffff';
      for (const dx of [-0.25, 0.25]) { path(ctx, [dx * r - r * 0.13, -r * 0.1, dx * r + r * 0.13, -r * 0.1, dx * r, r * 0.4]); ctx.fill(); }
    } else if (id === 'unarmed') {
      ctx.lineWidth = r * 0.1; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      for (const dy of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(-r * 0.5, dy * r); ctx.lineTo(-r * 0.05, dy * r); ctx.stroke(); }
    } else if (id === 'dummy') {
      ctx.lineWidth = r * 0.12; ctx.strokeStyle = '#d94141';
      for (const rr of [0.22, 0.5]) { ctx.beginPath(); ctx.arc(0, 0, rr * r, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }

  function spikes(ctx, x, y, r, n, len, rot, lw) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + (i * TAU) / n, a1 = a - Math.PI / n * 0.7, a2 = a + Math.PI / n * 0.7;
      ctx.moveTo(x + Math.cos(a1) * r * 0.92, y + Math.sin(a1) * r * 0.92);
      ctx.lineTo(x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len));
      ctx.lineTo(x + Math.cos(a2) * r * 0.92, y + Math.sin(a2) * r * 0.92);
    }
    ctx.fillStyle = '#d4dbe1'; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
  }

  // ------------------------------------------------------------ icons
  const iconCache = {};
  BB.icon = function (id, size) {
    size = size || 96;
    const key = id + ':' + size;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    BB.drawIcon(ctx, id, size / 2, size / 2, size);
    return (iconCache[key] = c.toDataURL());
  };

  // Draws an item icon centred at (x, y) within a box of `size`.
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    const it = BB.ITEM[id];
    if (!it) return;
    opts = opts || {};
    const lw = Math.max(1.5, size * 0.03);
    ctx.save(); ctx.translate(x, y);
    if (it.cat === 'special' || id === 'unarmed' || id === 'dummy') {
      const r = size * 0.33;
      const col = opts.color || it.color || (id === 'dummy' ? '#f1ece3' : '#35d047');
      if (id === 'spiky') spikes(ctx, 0, 0, r * 0.85, 10, r * 0.35, 0, lw);
      if (id === 'orbital') { for (let i = 0; i < 3; i++) { const a = -0.6 + (i * TAU) / 3; circle(ctx, Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, r * 0.24, '#c9ced6', lw); } }
      const br = id === 'spiky' ? r * 0.85 : id === 'orbital' ? r * 0.75 : r;
      circle(ctx, 0, 0, br, col, lw * 1.4);
      ctx.beginPath(); ctx.arc(-br * 0.3, -br * 0.35, br * 0.22, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      emblem(ctx, id, br, lw);
    } else {
      ctx.rotate(-Math.PI / 4);
      const L = size * 0.86, W = Math.max(size * 0.11, L * (it.base.width / Math.max(it.base.len, 20)) * 0.75);
      const Wc = Math.min(W, size * (it.id === 'shield' ? 0.6 : 0.3));
      if (it.id === 'shield') { ctx.rotate(Math.PI / 4); BB.drawWeapon(ctx, 'shield', -size * 0.12, size * 0.16, size * 0.62, lw, 0, opts.color || '#3d8bf2'); }
      else BB.drawWeapon(ctx, id, -L / 2, L, Wc, lw, 0.3, opts.color || '#f0545a');
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ arena renderer
  BB.Renderer = class {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.dark = false;
      this.time = 0;
    }

    resize(px) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.c.style.width = px + 'px';
      this.c.style.height = px + 'px';
      this.c.width = Math.round(px * dpr);
      this.c.height = Math.round(px * dpr);
      this.px = px;
    }

    draw(sim, opts) {
      opts = opts || {};
      const shake = opts.shake || 0;
      opts = opts || {};
      const ctx = this.ctx, Wc = this.c.width;
      const S = sim.size;
      const scale = Wc / (S + 12); // leave room for the wall stroke
      this.time = sim.t;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.dark ? '#1c1d22' : '#fbf3e6';
      ctx.fillRect(0, 0, Wc, Wc);
      const sx = shake ? (Math.random() - 0.5) * shake * 2 : 0, sy = shake ? (Math.random() - 0.5) * shake * 2 : 0;
      ctx.setTransform(scale, 0, 0, scale, Wc / 2 + sx * scale, Wc / 2 + sy * scale);
      const lw = 2.4;

      // arena floor + walls (shrinks on the Shrinking map)
      const hw = sim.W / 2, hh = sim.H / 2;
      if (sim.W < S) {
        ctx.fillStyle = this.dark ? '#141519' : '#e9dfcf';
        ctx.fillRect(-S / 2, -S / 2, S, S);
      }
      ctx.fillStyle = this.dark ? '#26272d' : '#ffffff';
      ctx.fillRect(-hw, -hh, sim.W, sim.H);
      ctx.save(); ctx.beginPath(); ctx.rect(-hw, -hh, sim.W, sim.H); ctx.clip();
      BB.drawFloor(ctx, sim, this.dark, this);
      ctx.restore();

      // meteor warnings
      for (const m of sim.meteors) {
        const k = 1 - m.t / m.max;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU);
        ctx.fillStyle = 'rgba(226,59,59,' + (0.08 + k * 0.2) + ')'; ctx.fill();
        ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(226,59,59,0.8)'; ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * k, 0, TAU); ctx.fillStyle = 'rgba(226,59,59,0.25)'; ctx.fill();
      }

      // obstacles
      if (BB.drawObstacles) BB.drawObstacles(ctx, sim, lw);
      else for (const o of sim.obstacles) {
        if (o.kind === 'pillar') {
          circle(ctx, o.x, o.y, o.r, this.dark ? '#4a4b55' : '#d8cfc2', lw * 1.4);
          circle(ctx, o.x, o.y, o.r * 0.6, this.dark ? '#3a3b44' : '#c7bdae', lw);
        } else if (o.kind === 'saw') {
          ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot || 0);
          ctx.beginPath();
          const n = 14;
          for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n, rr = i % 2 ? o.r * 0.82 : o.r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.closePath(); fillStroke(ctx, '#c3ccd5', lw);
          circle(ctx, 0, 0, o.r * 0.35, '#7b858f', lw);
          ctx.restore();
        }
      }

      // turrets
      for (const t of sim.turrets) {
        const tm = BB.TEAMS[t.team];
        ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle);
        rect(ctx, 0, t.r * 1.5, t.r * 0.55, '#5f666d', lw * 0.8);
        ctx.restore();
        path(ctx, [t.x - t.r, t.y + t.r * 0.8, t.x + t.r, t.y + t.r * 0.8, t.x + t.r * 0.6, t.y - t.r * 0.2, t.x - t.r * 0.6, t.y - t.r * 0.2]);
        fillStroke(ctx, tm.fill, lw * 0.8);
        circle(ctx, t.x, t.y - t.r * 0.1, t.r * 0.55, '#a7b0b9', lw * 0.8);
      }

      // gravitron aura, splodey fuse ring
      for (const b of sim.balls) {
        if (!b.alive) continue;
        if (b.def.id === 'gravitron') {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(sim.t * 1.5);
          ctx.setLineDash([12, 14]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(123,92,255,0.35)';
          ctx.beginPath(); ctx.arc(0, 0, 320 * b.scale * 0.55, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          ctx.restore();
        }
      }

      // balls (minis first so main balls draw on top)
      const order = sim.balls.filter((b) => b.alive).sort((a, b) => (a.main === b.main ? 0 : a.main ? 1 : -1));
      for (const b of order) this.drawBall(ctx, sim, b, lw);

      // projectiles
      for (const p of sim.proj) this.drawProj(ctx, p, lw);

      // hot potato bomb
      if (sim.potato && sim.potato.holder && sim.potato.holder.alive) {
        const h = sim.potato.holder, k = sim.potato.t;
        const pulse = k < 3 ? 1 + Math.sin(sim.t * 20) * 0.12 : 1;
        const bx = h.x, by = h.y - h.r - 22;
        ctx.save(); ctx.translate(bx, by); ctx.scale(pulse, pulse);
        circle(ctx, 0, 0, 15, '#2d2d33', lw);
        ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(12, -22, 18, -20); ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = sim.t * 8 % 1 < 0.5 ? '#ffd23f' : '#ff6a1f'; ctx.beginPath(); ctx.arc(18, -20, 4.5, 0, TAU); ctx.fill();
        ctx.font = '15px ' + NUM_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
        ctx.fillText(String(Math.ceil(k)), 0, 1);
        ctx.restore();
      }

      // fx (floating text scales up on small arenas so it stays readable on phones)
      const tsz = Math.max(1, Math.min(1.8, 560 / (this.px || 560)));
      for (const f of sim.fx) {
        const a = Math.max(0, f.life / f.max);
        if (f.k === 'p') {
          ctx.globalAlpha = Math.min(1, a * 1.5);
          ctx.fillStyle = f.c;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.s * (0.4 + a * 0.6), 0, TAU); ctx.fill();
        } else if (f.k === 'r') {
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(f.x, f.y, BB.lerp(f.r1, f.r0, a), 0, TAU);
          ctx.lineWidth = 5 * a + 1; ctx.strokeStyle = f.c; ctx.stroke();
        } else if (f.k === 'tag') {
          const k = 1 - a, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
          ctx.globalAlpha = Math.min(1, a * 2.2);
          // keep the whole tag inside the arena so names near a wall are never cut off
          ctx.font = Math.round(26 * tsz) + 'px ' + NUM_FONT;
          const half = (ctx.measureText(f.text).width + 22 * tsz) / 2 * 1.1, lim = sim.W / 2 - 4;
          const tagX = Math.max(-lim + half, Math.min(lim - half, f.x));
          ctx.save(); ctx.translate(tagX, f.y - k * 26); ctx.scale(pop, pop);
          ctx.font = Math.round(26 * tsz) + 'px ' + NUM_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
          const tw = ctx.measureText(f.text).width + 22 * tsz, th = 34 * tsz;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-tw / 2, -th / 2, tw, th, 10) : ctx.rect(-tw / 2, -th / 2, tw, th);
          ctx.fillStyle = 'rgba(20,20,26,0.88)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = f.c; ctx.stroke();
          ctx.lineWidth = 5; ctx.strokeStyle = '#111'; ctx.strokeText(f.text, 0, 2);
          ctx.fillStyle = f.c === '#ffffff' ? '#ffffff' : f.c; ctx.fillText(f.text, 0, 2);
          ctx.restore();
        } else if (f.k === 'z') {
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.moveTo(f.x, f.y);
          const segs = 7; for (let k = 1; k <= segs; k++) { const t = k / segs; ctx.lineTo(f.x + (f.x2 - f.x) * t + (k < segs ? (Math.sin(k * 12.9 + f.life * 40) * 14) : 0), f.y + (f.y2 - f.y) * t + (k < segs ? (Math.cos(k * 7.3 + f.life * 40) * 14) : 0)); }
          ctx.strokeStyle = '#7fd3ff'; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.stroke();
        } else if (f.k === 'n') {
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.font = Math.round(24 * tsz) + 'px ' + NUM_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 5; ctx.strokeStyle = this.dark ? '#1c1d22' : '#ffffff'; ctx.lineJoin = 'round';
          ctx.strokeText(f.text, f.x, f.y);
          ctx.fillStyle = f.c === '#1d1d22' && this.dark ? '#ffffff' : f.c; ctx.fillText(f.text, f.x, f.y);
        }
      }
      ctx.globalAlpha = 1;

      // walls on top
      if (BB.drawWalls) BB.drawWalls(ctx, sim, this.dark);
      else { ctx.lineWidth = 6; ctx.strokeStyle = this.dark ? '#0b0b0e' : OUT; ctx.strokeRect(-hw - 3, -hh - 3, sim.W + 6, sim.H + 6); }
      if (opts.overlay) opts.overlay(ctx, S);
      if (opts.impact && BB.impactFrame) BB.impactFrame(this, opts.impact, scale, sx, sy);
    }

    drawBall(ctx, sim, b, lw) {
      if (BB.drawBallArt) return BB.drawBallArt(ctx, sim, b, lw, this);
      const tm = BB.TEAMS[b.team];
      const w = b.w, id = b.def.id;
      // weapon under the ball's outline but over others
      if (id === 'spiky') spikes(ctx, b.x, b.y, b.r, 10 + Math.min(w.hits, 14), 9 * b.scale + Math.min(w.damage, 12), sim.t * 0.8, lw);
      if (b.def.moons) {
        for (const cap of b.caps) {
          circle(ctx, cap.ax, cap.ay, cap.hw, '#c9ced6', lw);
          ctx.beginPath(); ctx.arc(cap.ax - cap.hw * 0.3, cap.ay - cap.hw * 0.2, cap.hw * 0.28, 0, TAU); ctx.fillStyle = '#a3abb5'; ctx.fill();
        }
      }
      const flashing = b.flash > 0;
      const fill = flashing ? '#ffffff' : tm.fill;
      circle(ctx, b.x, b.y, b.r, fill, lw * (b.main ? 1.3 : 1));
      if (!flashing) {
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.36, b.r * 0.2, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
      }
      if (id === 'splodey') {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - w.timer / 3));
        ctx.strokeStyle = '#ff6a1f'; ctx.lineWidth = 4; ctx.stroke();
      }
      if (b.burnT > 0) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.strokeStyle = 'rgba(255,122,26,0.8)'; ctx.lineWidth = 3; ctx.stroke();
      }
      if (b.poison > 0) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 3, 0, TAU); ctx.strokeStyle = 'rgba(155,77,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      }
      if (b.controlled) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 9, 0, TAU);
        ctx.setLineDash([6, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = tm.fill; ctx.stroke(); ctx.setLineDash([]);
      }
      // weapon
      if (w.len && !(id === 'boomerang' && w.thrown)) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(w.angle);
        if (b.def.perp) BB.drawWeapon(ctx, id, b.r + w.gap, w.len, w.width, lw, sim.t, tm.fill);
        else BB.drawWeapon(ctx, id, b.r + w.gap, w.len, w.width, lw, sim.t, tm.fill);
        ctx.restore();
      }
      // HP
      if (b.main || b.r > 12) {
        const hp = Math.ceil(b.hp);
        const fs = b.r * (hp >= 1000 ? 0.62 : hp >= 100 ? 0.78 : 0.95);
        ctx.font = fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1d1d22';
        ctx.fillText(String(hp), b.x, b.y + fs * 0.06);
      }
    }

    drawProj(ctx, p, lw) {
      if (BB.drawProjArt && BB.drawProjArt(ctx, p, lw)) return;
      const tm = BB.TEAMS[p.team];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle || 0);
      if (p.kind === 'arrow') {
        rect(ctx, -22, 2, 3, '#6e3d1c', 1.2);
        path(ctx, [2, -5, 12, 0, 2, 5]); fillStroke(ctx, METAL, 1.5);
        path(ctx, [-22, -5, -15, 0, -22, 5, -18, 0]); fillStroke(ctx, tm.fill, 1.2);
      } else if (p.kind === 'star') {
        ctx.restore(); drawStar(ctx, p.x, p.y, p.r * 1.5, p.angle, 1.8); return;
      } else if (p.kind === 'boomerang') {
        ctx.restore(); drawBoomerang(ctx, p.x, p.y, p.r * 1.3, p.angle, 1.8); return;
      } else if (p.kind === 'orb') {
        ctx.beginPath(); ctx.arc(0, 0, p.r * 1.8, 0, TAU); ctx.fillStyle = 'rgba(77,225,255,0.25)'; ctx.fill();
        circle(ctx, 0, 0, p.r, '#4de1ff', 1.8);
      } else if (p.kind === 'cannonball') {
        circle(ctx, 0, 0, p.r, '#2d2d33', 2);
        ctx.beginPath(); ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.25, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
      } else if (p.kind === 'bolt2') {
        rect(ctx, -26, 6, 3.5, '#4a3424', 1.4); path(ctx, [6, -6, 18, 0, 6, 6]); fillStroke(ctx, METAL, 1.5);
        path(ctx, [-26, -6, -18, 0, -26, 6]); fillStroke(ctx, '#d94141', 1.2);
      } else if (p.kind === 'bolt') {
        rect(ctx, -8, 8, p.r * 1.2, tm.fill, 1.5);
      }
      ctx.restore();
    }
  };

  // Themed arena floors: each map gets its own look so maps feel distinct.
  BB.drawFloor = function (ctx, sim, dark) {
    const hw = sim.W / 2, hh = sim.H / 2, S = sim.size, id = sim.map.id, t = sim.t;
    const line = (a) => (dark ? 'rgba(255,255,255,' + a + ')' : 'rgba(29,29,34,' + a + ')');
    const grid = (step, a) => {
      ctx.beginPath();
      for (let x = -S / 2; x <= S / 2; x += step) { ctx.moveTo(x, -S / 2); ctx.lineTo(x, S / 2); }
      for (let y = -S / 2; y <= S / 2; y += step) { ctx.moveTo(-S / 2, y); ctx.lineTo(S / 2, y); }
      ctx.strokeStyle = line(a); ctx.lineWidth = 1.5; ctx.stroke();
    };
    if (id === 'classic') {
      grid(60, 0.05);
      ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.moveTo(0, -hh); ctx.lineTo(0, hh);
      ctx.strokeStyle = line(0.07); ctx.lineWidth = 4; ctx.stroke();
    } else if (id === 'large') {
      grid(45, 0.045); grid(180, 0.06);
    } else if (id === 'bouncy') {
      const g = ctx.createLinearGradient(0, -hh, 0, hh);
      g.addColorStop(0, dark ? '#1d2a44' : '#e3f2ff'); g.addColorStop(1, dark ? '#26272d' : '#ffffff');
      ctx.fillStyle = g; ctx.fillRect(-hw, -hh, sim.W, sim.H);
      for (let i = 0; i < 4; i++) { const cx = ((i * 190 + t * 12) % (S + 160)) - S / 2 - 80, cy = -hh + 70 + i * 55; ctx.fillStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.arc(cx + 28, cy - 10, 32, 0, TAU); ctx.arc(cx + 60, cy, 24, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#3d8bf2'; ctx.fillRect(-hw, hh - 14, sim.W, 14);
      ctx.fillStyle = '#ffd23f'; for (let x = -hw; x < hw; x += 40) ctx.fillRect(x, hh - 14, 20, 14);
    } else if (id === 'pillars') {
      for (let x = -S / 2, i = 0; x < S / 2; x += 50, i++) for (let y = -S / 2, j = 0; y < S / 2; y += 50, j++) if ((i + j) % 2) { ctx.fillStyle = dark ? 'rgba(255,255,255,0.03)' : 'rgba(180,160,130,0.10)'; ctx.fillRect(x, y, 50, 50); }
    } else if (id === 'saws') {
      ctx.fillStyle = dark ? '#2a2c32' : '#f2f4f6'; ctx.fillRect(-hw, -hh, sim.W, sim.H);
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(x * (hw - 18), y * (hh - 18), 5, 0, TAU); ctx.fillStyle = line(0.2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 0.3 * S, 0, TAU); ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(226,59,59,0.35)'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.strokeStyle = 'rgba(245,184,46,0.55)'; ctx.lineWidth = 12;
      for (let k = -S; k < S; k += 34) { ctx.beginPath(); ctx.moveTo(k, -hh); ctx.lineTo(k + 24, -hh + 24); ctx.moveTo(k, hh); ctx.lineTo(k + 24, hh - 24); ctx.stroke(); }
      ctx.restore();
    } else if (id === 'shrink') {
      for (let r = 40; r < S; r += 60) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.strokeStyle = line(0.05); ctx.lineWidth = 3; ctx.stroke(); }
      const k = 1 - sim.W / S;
      if (k > 0) { ctx.strokeStyle = 'rgba(226,59,59,' + (0.25 + 0.25 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 10; ctx.strokeRect(-hw + 5, -hh + 5, sim.W - 10, sim.H - 10); }
    } else if (id === 'potato') {
      for (let x = -S / 2, i = 0; x < S / 2; x += 60, i++) for (let y = -S / 2, j = 0; y < S / 2; y += 60, j++) if ((i + j) % 2) { ctx.fillStyle = dark ? 'rgba(255,140,60,0.06)' : 'rgba(255,140,60,0.10)'; ctx.fillRect(x, y, 60, 60); }
      if (sim.potato && sim.potato.t < 3) { ctx.fillStyle = 'rgba(255,60,30,' + (0.06 + 0.06 * Math.sin(t * 18)) + ')'; ctx.fillRect(-hw, -hh, sim.W, sim.H); }
    } else if (id === 'meteor') {
      ctx.fillStyle = dark ? '#2b2420' : '#f4ece4'; ctx.fillRect(-hw, -hh, sim.W, sim.H);
      const r = BB.RNG(99);
      ctx.strokeStyle = dark ? 'rgba(255,200,150,0.08)' : 'rgba(120,80,50,0.14)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) { let x = (r() - 0.5) * S, y = (r() - 0.5) * S; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; ctx.lineTo(x, y); } ctx.stroke(); }
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse((r() - 0.5) * S, (r() - 0.5) * S, 18 + r() * 20, 10 + r() * 10, 0, 0, TAU); ctx.fillStyle = dark ? 'rgba(0,0,0,0.25)' : 'rgba(120,80,50,0.08)'; ctx.fill(); }
    }
  };

  BB.FONT = FONT;
})();
