// Art for the expansion pack (data2.js): weapons, projectiles and special-ball emblems.
(function () {
  const BB = window.BB;
  const TAU = Math.PI * 2;
  const { path, fillStroke, rect, circle, METAL, WOOD, GOLD, OUT } = BB.wpn;
  const D = BB.DRAW;

  function blade(ctx, x0, x1, w0, w1, tip, lw) {
    path(ctx, [x0, -w0 / 2, x1 - tip, -w1 / 2, x1, 0, x1 - tip, w1 / 2, x0, w0 / 2]);
    fillStroke(ctx, METAL, lw);
  }
  function grip(ctx, x0, x1, h, color, lw) {
    rect(ctx, x0, x1, h, color || '#3b2a2a', lw);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = lw * 0.6;
    for (let x = x0 + (x1 - x0) / 5; x < x1; x += (x1 - x0) / 5) { ctx.beginPath(); ctx.moveTo(x - h * 0.2, -h / 2); ctx.lineTo(x + h * 0.2, h / 2); ctx.stroke(); }
  }

  D.claymore = function (ctx, s, L, W, lw) {
    grip(ctx, s, s + L * 0.22, W * 0.5, '#2c3e50', lw);
    circle(ctx, s, 0, W * 0.38, GOLD, lw);
    rect(ctx, s + L * 0.2, s + L * 0.26, W * 2.4, GOLD, lw);
    circle(ctx, s + L * 0.23, 0, W * 0.28, '#3d8bf2', lw * 0.7);
    blade(ctx, s + L * 0.26, s + L, W * 1.05, W * 0.9, W * 1.1, lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.3, 0); ctx.lineTo(s + L * 0.9, 0); ctx.strokeStyle = '#9aa7b3'; ctx.lineWidth = lw; ctx.stroke();
  };
  D.sai = function (ctx, s, L, W, lw) {
    grip(ctx, s, s + L * 0.3, W * 0.5, '#7b241c', lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.3, -W * 0.9); ctx.quadraticCurveTo(s + L * 0.32, 0, s + L * 0.55, -W * 0.15);
    ctx.moveTo(s + L * 0.3, W * 0.9); ctx.quadraticCurveTo(s + L * 0.32, 0, s + L * 0.55, W * 0.15);
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * 3; ctx.stroke(); ctx.strokeStyle = '#dfe6ec'; ctx.lineWidth = lw * 1.4; ctx.stroke();
    blade(ctx, s + L * 0.3, s + L, W * 0.3, W * 0.25, W * 0.6, lw);
  };
  D.halberd = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.9, W * 0.28, WOOD, lw);
    path(ctx, [s + L * 0.7, -W * 0.15, s + L * 0.68, -W * 1.1, s + L * 0.9, -W * 1.2, s + L * 0.86, -W * 0.15]); fillStroke(ctx, METAL, lw);
    path(ctx, [s + L * 0.74, W * 0.15, s + L * 0.78, W * 0.6, s + L * 0.84, W * 0.15]); fillStroke(ctx, METAL, lw);
    blade(ctx, s + L * 0.86, s + L, W * 0.35, W * 0.35, W * 0.4, lw);
  };
  D.mace = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.62, W * 0.3, WOOD, lw);
    const cx = s + L - W * 0.42, r = W * 0.42;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i * TAU) / 16, rr = i % 2 ? r : r * 1.4; ctx.lineTo(cx + Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); fillStroke(ctx, METAL, lw);
    circle(ctx, cx, 0, r * 0.75, '#8d969f', lw * 0.8);
  };
  D.club = function (ctx, s, L, W, lw) {
    path(ctx, [s, -W * 0.18, s + L * 0.6, -W * 0.45, s + L, -W * 0.5, s + L, W * 0.5, s + L * 0.6, W * 0.45, s, W * 0.18]);
    fillStroke(ctx, WOOD, lw);
    ctx.fillStyle = 'rgba(80,40,10,0.45)';
    for (const [x, y] of [[0.7, -0.2], [0.85, 0.2], [0.55, 0.1]]) { ctx.beginPath(); ctx.arc(s + L * x, W * y, W * 0.07, 0, TAU); ctx.fill(); }
  };
  D.whip = function (ctx, s, L, W, lw, t) {
    // a supple lash: it trails behind the spin (more toward the tip), a wave rolls down it,
    // it tapers to a thin cracker at the end
    const dir = BB._wdir || 1, g1 = s + Math.min(L * 0.18, 18), len = L - (g1 - s);
    grip(ctx, s, g1, W * 1.6, '#4a235a', lw);
    const n = 18, pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = g1 + len * k * (1 - 0.08 * k * k);
      const y = -dir * len * 0.26 * k * k + Math.sin(k * 7.5 - t * 15) * W * 1.7 * k * (0.6 + 0.4 * Math.sin(t * 3));
      pts.push([x, y]);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) for (let i = 1; i <= n; i++) {
      const k = i / n, wd = W * 1.15 * (1 - 0.7 * k);
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = pass ? (i % 4 < 2 ? '#8e5a3c' : '#7a4a30') : OUT; ctx.lineWidth = pass ? wd : wd + lw * 1.4; ctx.stroke();
    }
    // the cracker
    const [tx, ty] = pts[n], [px, py] = pts[n - 1], a = Math.atan2(ty - py, tx - px);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a + 0.5) * W * 1.6, ty + Math.sin(a + 0.5) * W * 1.6); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(a - 0.4) * W * 1.9, ty + Math.sin(a - 0.4) * W * 1.9);
    ctx.strokeStyle = '#e8d3b0'; ctx.lineWidth = Math.max(1, W * 0.35); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  };
  D.chainsaw = function (ctx, s, L, W, lw, t) {
    path(ctx, [s, -W * 0.55, s + L * 0.32, -W * 0.55, s + L * 0.32, W * 0.55, s, W * 0.55]); fillStroke(ctx, '#e74c3c', lw);
    rect(ctx, s + L * 0.05, s + L * 0.25, W * 0.25, '#2d2d33', lw * 0.6);
    path(ctx, [s + L * 0.32, -W * 0.38, s + L * 0.94, -W * 0.38, s + L, 0, s + L * 0.94, W * 0.38, s + L * 0.32, W * 0.38]); fillStroke(ctx, '#bdc3c7', lw);
    ctx.fillStyle = OUT;
    const off = (t * 300) % 8;
    for (let x = s + L * 0.33 + off; x < s + L * 0.95; x += 8) { ctx.fillRect(x, -W * 0.5, 3, W * 0.14); ctx.fillRect(x, W * 0.36, 3, W * 0.14); }
  };
  D.pickaxe = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.92, W * 0.3, WOOD, lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.86, -W * 1.05); ctx.quadraticCurveTo(s + L * 1.05, 0, s + L * 0.86, W * 1.05);
    ctx.lineTo(s + L * 0.8, W * 0.9); ctx.quadraticCurveTo(s + L * 0.95, 0, s + L * 0.8, -W * 0.9); ctx.closePath();
    fillStroke(ctx, METAL, lw);
  };
  D.sickle = function (ctx, s, L, W, lw) {
    grip(ctx, s, s + L * 0.42, W * 0.36, '#6e3d1c', lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.4, -W * 0.15);
    ctx.bezierCurveTo(s + L * 0.95, -W * 0.9, s + L * 1.1, W * 0.6, s + L * 0.62, W * 0.75);
    ctx.bezierCurveTo(s + L * 0.85, W * 0.2, s + L * 0.7, -W * 0.25, s + L * 0.4, W * 0.15); ctx.closePath();
    fillStroke(ctx, METAL, lw);
  };
  D.broom = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.7, W * 0.2, WOOD, lw);
    rect(ctx, s + L * 0.66, s + L * 0.72, W * 0.7, '#c0392b', lw * 0.8);
    path(ctx, [s + L * 0.72, -W * 0.35, s + L, -W * 0.6, s + L, W * 0.6, s + L * 0.72, W * 0.35]); fillStroke(ctx, '#e1b955', lw);
    ctx.strokeStyle = 'rgba(120,80,20,0.6)'; ctx.lineWidth = lw * 0.6;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(s + L * 0.74, k * W * 0.12); ctx.lineTo(s + L * 0.99, k * W * 0.22); ctx.stroke(); }
  };
  D.umbrella = function (ctx, s, L, W, lw, t, team) {
    const h = W / 2, x0 = s;
    ctx.beginPath(); ctx.moveTo(x0, -h);
    ctx.quadraticCurveTo(x0 + L * 3.2, 0, x0, h);
    for (let i = 4; i >= 0; i--) { const y = -h + (i * 2 * h) / 4; ctx.quadraticCurveTo(x0 + L * 0.6, y + h / 4, x0, y); }
    ctx.closePath(); fillStroke(ctx, '#e84393', lw);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = lw * 0.8;
    for (let i = 1; i < 4; i++) { const y = -h + (i * 2 * h) / 4; ctx.beginPath(); ctx.moveTo(x0 + L * 0.3, y); ctx.lineTo(x0 + L * 1.4, y * 0.3); ctx.stroke(); }
    circle(ctx, x0 + L * 1.55, 0, Math.max(2, L * 0.25), GOLD, lw * 0.7);
  };
  D.guitar = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.55, W * 0.24, '#5d4037', lw);
    for (let k = 1; k < 6; k++) rect(ctx, s + L * 0.08 * k, s + L * 0.08 * k + 1.5, W * 0.24, '#d7ccc8', 0.01);
    const bx = s + L * 0.78;
    ctx.beginPath(); ctx.ellipse(bx - W * 0.25, 0, W * 0.38, W * 0.42, 0, 0, TAU); ctx.ellipse(bx + W * 0.3, 0, W * 0.48, W * 0.52, 0, 0, TAU);
    fillStroke(ctx, '#e67e22', lw);
    circle(ctx, bx - W * 0.05, 0, W * 0.16, '#3e2723', lw * 0.6);
    rect(ctx, s - W * 0.05, s + L * 0.05, W * 0.42, '#3e2723', lw);
  };
  D.baguette = function (ctx, s, L, W, lw) {
    ctx.beginPath(); ctx.ellipse(s + L / 2, 0, L / 2, W * 0.42, 0, 0, TAU);
    fillStroke(ctx, '#d9a35b', lw);
    ctx.strokeStyle = '#f5d9a8'; ctx.lineWidth = lw * 1.2; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const x = s + L * (0.22 + k * 0.18); ctx.beginPath(); ctx.moveTo(x - W * 0.12, -W * 0.18); ctx.lineTo(x + W * 0.12, W * 0.18); ctx.stroke(); }
    ctx.lineCap = 'butt';
  };
  D.fish = function (ctx, s, L, W, lw) {
    path(ctx, [s, -W * 0.45, s + L * 0.2, 0, s, W * 0.45]); fillStroke(ctx, '#1abc9c', lw);
    ctx.beginPath(); ctx.ellipse(s + L * 0.58, 0, L * 0.4, W * 0.42, 0, 0, TAU); fillStroke(ctx, '#48c9b0', lw);
    ctx.beginPath(); ctx.arc(s + L * 0.86, -W * 0.1, W * 0.08, 0, TAU); ctx.fillStyle = OUT; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = lw * 0.7;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(s + L * (0.4 + k * 0.12), 0, W * 0.2, -0.9, 0.9); ctx.stroke(); }
  };
  D.paintbrush = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.6, W * 0.26, '#f5cba7', lw);
    rect(ctx, s + L * 0.58, s + L * 0.7, W * 0.42, '#bdc3c7', lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.7, -W * 0.3); ctx.quadraticCurveTo(s + L * 1.02, -W * 0.3, s + L, 0); ctx.quadraticCurveTo(s + L * 1.02, W * 0.3, s + L * 0.7, W * 0.3); ctx.closePath();
    fillStroke(ctx, '#ff6b81', lw);
  };
  D.kunai = function (ctx, s, L, W, lw) {
    circle(ctx, s + W * 0.2, 0, W * 0.3, '#2c3e50', lw);
    grip(ctx, s + W * 0.4, s + L * 0.45, W * 0.32, '#2c3e50', lw);
    path(ctx, [s + L * 0.45, -W * 0.45, s + L, 0, s + L * 0.45, W * 0.45]); fillStroke(ctx, METAL, lw);
  };
  D.javelin = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.85, W * 0.32, '#b9770e', lw);
    rect(ctx, s + L * 0.08, s + L * 0.2, W * 0.45, '#2d2d33', lw * 0.6);
    path(ctx, [s + L * 0.82, -W * 0.5, s + L, 0, s + L * 0.82, W * 0.5]); fillStroke(ctx, METAL, lw);
  };
  D.slingshot = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.5, W * 0.26, WOOD, lw);
    ctx.beginPath(); ctx.moveTo(s + L * 0.5, 0); ctx.lineTo(s + L, -W * 0.6); ctx.moveTo(s + L * 0.5, 0); ctx.lineTo(s + L, W * 0.6);
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = W * 0.3; ctx.stroke(); ctx.strokeStyle = '#a0612f'; ctx.lineWidth = W * 0.18; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s + L, -W * 0.6); ctx.lineTo(s + L * 0.78, 0); ctx.lineTo(s + L, W * 0.6); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = lw; ctx.stroke(); ctx.lineCap = 'butt';
    circle(ctx, s + L * 0.78, 0, W * 0.14, '#7f8c8d', lw * 0.6);
  };
  D.bubblewand = function (ctx, s, L, W, lw, t) {
    rect(ctx, s, s + L * 0.62, W * 0.2, '#74b9ff', lw);
    ctx.beginPath(); ctx.arc(s + L * 0.8, 0, W * 0.4, 0, TAU); ctx.strokeStyle = OUT; ctx.lineWidth = lw * 2.6; ctx.stroke(); ctx.strokeStyle = '#ff9ff3'; ctx.lineWidth = lw * 1.3; ctx.stroke();
    ctx.beginPath(); ctx.arc(s + L * 0.8, 0, W * 0.32, 0, TAU); ctx.fillStyle = 'rgba(200,240,255,' + (0.35 + 0.15 * Math.sin(t * 8)) + ')'; ctx.fill();
  };
  D.firestaff = function (ctx, s, L, W, lw, t) {
    rect(ctx, s, s + L * 0.72, W * 0.26, '#6e2c00', lw);
    rect(ctx, s + L * 0.66, s + L * 0.74, W * 0.6, GOLD, lw * 0.8);
    const cx = s + L * 0.86, f = Math.sin(t * 20) * 0.1;
    ctx.beginPath(); ctx.arc(cx, 0, W * 0.75, 0, TAU); ctx.fillStyle = 'rgba(255,120,30,0.25)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - W * 0.4, -W * 0.35); ctx.quadraticCurveTo(cx + W * (0.7 + f), -W * 0.5, cx + W * (0.9 + f), 0); ctx.quadraticCurveTo(cx + W * 0.7, W * 0.5, cx - W * 0.4, W * 0.35); ctx.closePath();
    fillStroke(ctx, '#ff7a1a', lw);
    circle(ctx, cx, 0, W * 0.22, '#ffd23f', lw * 0.5);
  };
  D.thunderrod = function (ctx, s, L, W, lw, t) {
    rect(ctx, s, s + L * 0.7, W * 0.24, '#34495e', lw);
    for (let k = 0; k < 3; k++) rect(ctx, s + L * (0.2 + k * 0.16), s + L * (0.24 + k * 0.16), W * 0.4, GOLD, lw * 0.6);
    path(ctx, [s + L * 0.7, -W * 0.15, s + L * 0.86, -W * 0.55, s + L * 0.82, -W * 0.1, s + L, -W * 0.25, s + L * 0.84, W * 0.55, s + L * 0.88, W * 0.1]);
    fillStroke(ctx, '#f1c40f', lw);
    if (Math.sin(t * 25) > 0.6) { ctx.beginPath(); ctx.arc(s + L * 0.86, 0, W * 0.8, 0, TAU); ctx.fillStyle = 'rgba(127,211,255,0.25)'; ctx.fill(); }
  };

  // ------------------------------------------------------------ detailed redraws (v2)
  const lg = (ctx, x0, y0, x1, y1, stops) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const shine = (ctx, x0, x1, y, w) => { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt'; };

  D.baguette = function (ctx, s, L, W, lw) {
    const h = W * 0.44;
    ctx.beginPath(); ctx.moveTo(s + h * 0.8, -h);
    ctx.quadraticCurveTo(s + L * 0.5, -h * 1.15, s + L - h * 0.8, -h); ctx.quadraticCurveTo(s + L + h * 0.3, 0, s + L - h * 0.8, h);
    ctx.quadraticCurveTo(s + L * 0.5, h * 1.1, s + h * 0.8, h); ctx.quadraticCurveTo(s - h * 0.3, 0, s + h * 0.8, -h); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -h, 0, h, [[0, '#f2c27a'], [0.45, '#d08a3c'], [1, '#8a4f1c']]); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    // diagonal scoring with pale crumb showing through
    for (let k = 0; k < 5; k++) {
      const x = s + L * (0.16 + k * 0.17);
      ctx.beginPath(); ctx.moveTo(x - h * 0.55, -h * 0.55); ctx.quadraticCurveTo(x, -h * 0.75, x + h * 0.55, h * 0.1);
      ctx.quadraticCurveTo(x, -h * 0.2, x - h * 0.55, -h * 0.55); ctx.fillStyle = '#fbe7c0'; ctx.fill();
      ctx.lineWidth = lw * 0.6; ctx.strokeStyle = '#7a4416'; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(s + L * (0.1 + k * 0.1), -h * 0.15 + ((k * 37) % 7 - 3) * h * 0.08, Math.max(0.8, lw * 0.35), 0, TAU); ctx.fill(); }
  };
  D.fish = function (ctx, s, L, W, lw) {
    const h = W * 0.46;
    ctx.beginPath(); ctx.moveTo(s, -h * 0.95); ctx.quadraticCurveTo(s + L * 0.12, 0, s, h * 0.95); ctx.lineTo(s + L * 0.24, 0); ctx.closePath();
    ctx.fillStyle = lg(ctx, s, 0, s + L * 0.24, 0, [[0, '#0e8f7c'], [1, '#2ec4a6']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s + L * 0.45, -h * 0.85); ctx.quadraticCurveTo(s + L * 0.55, -h * 1.6, s + L * 0.7, -h * 0.85); ctx.closePath();
    ctx.fillStyle = '#1aa58c'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s + L * 0.6, 0, L * 0.38, h, 0, 0, TAU);
    ctx.fillStyle = lg(ctx, 0, -h, 0, h, [[0, '#7fe8d4'], [0.5, '#2fbfa3'], [1, '#d9fff6']]); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(10,90,80,0.45)'; ctx.lineWidth = lw * 0.6;
    for (let x = s + L * 0.32; x < s + L * 0.85; x += h * 0.55) for (let y = -h; y < h; y += h * 0.55) { ctx.beginPath(); ctx.arc(x + ((y / h) % 2 ? h * 0.27 : 0), y, h * 0.3, -1.1, 1.1); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(s + L * 0.86, -h * 0.2, h * 0.22, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
    ctx.beginPath(); ctx.arc(s + L * 0.87, -h * 0.2, h * 0.11, 0, TAU); ctx.fillStyle = OUT; ctx.fill();
    ctx.beginPath(); ctx.moveTo(s + L * 0.78, h * 0.45); ctx.quadraticCurveTo(s + L * 0.72, h * 1.2, s + L * 0.64, h * 0.55); ctx.fillStyle = '#1aa58c'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
  };
  D.club = function (ctx, s, L, W, lw) {
    ctx.beginPath(); ctx.moveTo(s, -W * 0.16); ctx.bezierCurveTo(s + L * 0.5, -W * 0.25, s + L * 0.7, -W * 0.62, s + L, -W * 0.48);
    ctx.quadraticCurveTo(s + L * 1.06, 0, s + L, W * 0.5); ctx.bezierCurveTo(s + L * 0.7, W * 0.6, s + L * 0.5, W * 0.25, s, W * 0.16); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.6, 0, W * 0.6, [[0, '#c98a4f'], [0.5, '#9c5a2a'], [1, '#5e3215']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,30,10,0.5)'; ctx.lineWidth = lw * 0.7;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(s + L * (0.3 + k * 0.2), -W * (0.08 + k * 0.08)); ctx.quadraticCurveTo(s + L * (0.4 + k * 0.2), 0, s + L * (0.3 + k * 0.2), W * (0.08 + k * 0.08)); ctx.stroke(); }
    for (const [x, y] of [[0.72, -0.3], [0.86, 0.22], [0.62, 0.18], [0.92, -0.1]]) { ctx.beginPath(); ctx.moveTo(s + L * x, W * y - W * 0.1); ctx.lineTo(s + L * x + W * 0.16, W * y); ctx.lineTo(s + L * x, W * y + W * 0.1); ctx.fillStyle = '#d7dde3'; ctx.fill(); ctx.lineWidth = lw * 0.6; ctx.strokeStyle = OUT; ctx.stroke(); }
    rect(ctx, s, s + L * 0.18, W * 0.36, '#3b2a2a', lw);
  };
  D.guitar = function (ctx, s, L, W, lw) {
    rect(ctx, s - W * 0.05, s + L * 0.08, W * 0.46, '#2b1b14', lw);
    for (let k = 0; k < 3; k++) { circle(ctx, s + L * 0.02 + k * L * 0.03, -W * 0.3, W * 0.06, '#d9d9d9', lw * 0.4); circle(ctx, s + L * 0.02 + k * L * 0.03, W * 0.3, W * 0.06, '#d9d9d9', lw * 0.4); }
    rect(ctx, s + L * 0.08, s + L * 0.56, W * 0.24, '#4e342e', lw);
    for (let k = 1; k < 7; k++) rect(ctx, s + L * (0.08 + k * 0.065), s + L * (0.08 + k * 0.065) + 1.4, W * 0.24, '#e0d6c8', 0.01);
    const bx = s + L * 0.78;
    ctx.beginPath(); ctx.ellipse(bx - W * 0.22, 0, W * 0.36, W * 0.42, 0, 0, TAU); ctx.ellipse(bx + W * 0.32, 0, W * 0.48, W * 0.54, 0, 0, TAU);
    ctx.fillStyle = lg(ctx, bx - W, -W * 0.5, bx + W, W * 0.5, [[0, '#ffb347'], [0.5, '#e67e22'], [1, '#8e3c08']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    circle(ctx, bx - W * 0.02, 0, W * 0.17, '#1b120e', lw * 0.6);
    rect(ctx, bx + W * 0.42, bx + W * 0.5, W * 0.5, '#2b1b14', lw * 0.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.6;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(s + L * 0.06, k * W * 0.06); ctx.lineTo(bx + W * 0.46, k * W * 0.06); ctx.stroke(); }
  };
  D.broom = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.66, W * 0.2, WOOD, lw);
    rect(ctx, s + L * 0.62, s + L * 0.7, W * 0.62, '#c0392b', lw * 0.8);
    rect(ctx, s + L * 0.69, s + L * 0.72, W * 0.56, '#7b241c', lw * 0.6);
    ctx.beginPath(); ctx.moveTo(s + L * 0.72, -W * 0.3); ctx.quadraticCurveTo(s + L * 0.9, -W * 0.5, s + L * 1.02, -W * 0.68);
    ctx.lineTo(s + L * 1.02, W * 0.68); ctx.quadraticCurveTo(s + L * 0.9, W * 0.5, s + L * 0.72, W * 0.3); ctx.closePath();
    ctx.fillStyle = lg(ctx, s + L * 0.72, 0, s + L, 0, [[0, '#c9952f'], [1, '#f3d27a']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = 'rgba(110,70,10,0.6)'; ctx.lineWidth = lw * 0.5;
    for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(s + L * 0.74, k * W * 0.04); ctx.lineTo(s + L * 1.01, k * W * 0.105); ctx.stroke(); }
  };
  D.pan = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.24, W * 0.3, WOOD, lw);
    circle(ctx, s + W * 0.08, 0, W * 0.07, '#1d1d22', lw * 0.4);
    rect(ctx, s + L * 0.22, s + L * 0.46, W * 0.22, '#3a3d45', lw);
    const r = Math.min(L * 0.29, W * 0.56), cx = s + L - r;
    ctx.beginPath(); ctx.arc(cx, 0, r, 0, TAU); ctx.fillStyle = lg(ctx, cx - r, -r, cx + r, r, [[0, '#5b616b'], [1, '#1f2126']]); ctx.fill(); ctx.lineWidth = lw * 1.2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, 0, r * 0.8, 0, TAU); ctx.fillStyle = lg(ctx, cx - r, -r, cx + r, r, [[0, '#2c2f35'], [1, '#43474f']]); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.15, -r * 0.2, r * 0.5, Math.PI * 1.05, Math.PI * 1.55); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  };
  D.paintbrush = function (ctx, s, L, W, lw) {
    ctx.beginPath(); ctx.moveTo(s, -W * 0.12); ctx.quadraticCurveTo(s + L * 0.3, -W * 0.22, s + L * 0.58, -W * 0.2); ctx.lineTo(s + L * 0.58, W * 0.2); ctx.quadraticCurveTo(s + L * 0.3, W * 0.22, s, W * 0.12); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.2, 0, W * 0.2, [[0, '#ffd6a5'], [1, '#c98a4f']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s + L * 0.56, -W * 0.24); ctx.lineTo(s + L * 0.7, -W * 0.3); ctx.lineTo(s + L * 0.7, W * 0.3); ctx.lineTo(s + L * 0.56, W * 0.24); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.3, 0, W * 0.3, [[0, '#f5f7fa'], [1, '#8d969f']]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s + L * 0.7, -W * 0.3); ctx.bezierCurveTo(s + L * 0.9, -W * 0.36, s + L * 1.04, -W * 0.12, s + L * 1.02, 0);
    ctx.bezierCurveTo(s + L * 1.04, W * 0.12, s + L * 0.9, W * 0.36, s + L * 0.7, W * 0.3); ctx.closePath();
    ctx.fillStyle = lg(ctx, s + L * 0.7, 0, s + L, 0, [[0, '#3b2a2a'], [0.35, '#ff6b81'], [1, '#ff2e63']]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(s + L * 1.03, W * 0.18, W * 0.07, 0, TAU); ctx.fillStyle = '#ff2e63'; ctx.fill();
  };
  D.slingshot = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.48, W * 0.26, WOOD, lw);
    for (let k = 0; k < 3; k++) rect(ctx, s + L * (0.08 + k * 0.12), s + L * (0.12 + k * 0.12), W * 0.32, '#5e3215', lw * 0.5);
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s + L * 0.48, 0); ctx.quadraticCurveTo(s + L * 0.74, sgn * W * 0.1, s + L * 0.98, sgn * W * 0.62);
      ctx.strokeStyle = OUT; ctx.lineWidth = W * 0.3; ctx.stroke(); ctx.strokeStyle = '#b06a32'; ctx.lineWidth = W * 0.18; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(s + L * 0.98, -W * 0.62); ctx.lineTo(s + L * 0.72, 0); ctx.lineTo(s + L * 0.98, W * 0.62); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = lw * 1.1; ctx.stroke(); ctx.lineCap = 'butt';
    rect(ctx, s + L * 0.68, s + L * 0.76, W * 0.3, '#7b4a2a', lw * 0.6);
    circle(ctx, s + L * 0.72, 0, W * 0.12, '#95a5a6', lw * 0.6);
  };
  D.chainsaw = function (ctx, s, L, W, lw, t) {
    ctx.beginPath(); ctx.moveTo(s, -W * 0.5); ctx.lineTo(s + L * 0.34, -W * 0.58); ctx.lineTo(s + L * 0.34, W * 0.58); ctx.lineTo(s, W * 0.5); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.6, 0, W * 0.6, [[0, '#ff7a6a'], [0.5, '#e74c3c'], [1, '#922b21']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    rect(ctx, s + L * 0.04, s + L * 0.26, W * 0.22, '#2d2d33', lw * 0.6);
    ctx.fillStyle = '#f5c518'; ctx.fillRect(s + L * 0.08, -W * 0.45, L * 0.14, W * 0.12);
    const x0 = s + L * 0.34;
    ctx.beginPath(); ctx.moveTo(x0, -W * 0.38); ctx.lineTo(s + L * 0.93, -W * 0.38); ctx.arc(s + L * 0.93, 0, W * 0.38, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x0, W * 0.38); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.4, 0, W * 0.4, [[0, '#ecf0f1'], [1, '#95a5a6']]); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUT; const off = (t * 320) % 9;
    for (let x = x0 + off; x < s + L * 0.93; x += 9) { ctx.beginPath(); ctx.moveTo(x, -W * 0.38); ctx.lineTo(x + 4, -W * 0.52); ctx.lineTo(x + 7, -W * 0.38); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, W * 0.38); ctx.lineTo(x + 4, W * 0.52); ctx.lineTo(x + 7, W * 0.38); ctx.fill(); }
    shine(ctx, x0 + 4, s + L * 0.85, -W * 0.18, lw * 0.8);
  };
  D.mace = function (ctx, s, L, W, lw) {
    rect(ctx, s, s + L * 0.62, W * 0.3, '#5e3215', lw);
    for (let k = 0; k < 4; k++) rect(ctx, s + L * (0.05 + k * 0.07), s + L * (0.08 + k * 0.07), W * 0.36, '#2b1b14', lw * 0.4);
    rect(ctx, s + L * 0.58, s + L * 0.66, W * 0.5, GOLD, lw * 0.8);
    const cx = s + L - W * 0.42, r = W * 0.42;
    for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a - 0.3) * r * 0.9, Math.sin(a - 0.3) * r * 0.9); ctx.lineTo(cx + Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55); ctx.lineTo(cx + Math.cos(a + 0.3) * r * 0.9, Math.sin(a + 0.3) * r * 0.9); ctx.closePath(); ctx.fillStyle = '#dfe6ec'; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.strokeStyle = OUT; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx, 0, r, 0, TAU); ctx.fillStyle = ctx.createRadialGradient(cx - r * 0.4, -r * 0.4, 1, cx, 0, r); ctx.fillStyle.addColorStop(0, '#f2f4f7'); ctx.fillStyle.addColorStop(1, '#6b7580'); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
  };
  D.kunai = function (ctx, s, L, W, lw) {
    ctx.beginPath(); ctx.arc(s + W * 0.22, 0, W * 0.3, 0, TAU); ctx.lineWidth = lw * 2.4; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = lw * 1.2; ctx.strokeStyle = '#8d969f'; ctx.stroke();
    rect(ctx, s + W * 0.5, s + L * 0.42, W * 0.34, '#1f2a36', lw);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = lw * 0.8;
    for (let x = s + W * 0.6; x < s + L * 0.4; x += W * 0.28) { ctx.beginPath(); ctx.moveTo(x, -W * 0.17); ctx.lineTo(x + W * 0.14, W * 0.17); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(s + L * 0.42, -W * 0.5); ctx.quadraticCurveTo(s + L * 0.75, -W * 0.42, s + L, 0); ctx.quadraticCurveTo(s + L * 0.75, W * 0.42, s + L * 0.42, W * 0.5); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.5, 0, W * 0.5, [[0, '#ffffff'], [0.5, '#c3ced8'], [1, '#6b7a88']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s + L * 0.45, 0); ctx.lineTo(s + L * 0.95, 0); ctx.strokeStyle = 'rgba(80,90,100,0.6)'; ctx.lineWidth = lw * 0.6; ctx.stroke();
  };
  D.javelin = function (ctx, s, L, W, lw) {
    ctx.beginPath(); ctx.moveTo(s, -W * 0.16); ctx.lineTo(s + L * 0.84, -W * 0.13); ctx.lineTo(s + L * 0.84, W * 0.13); ctx.lineTo(s, W * 0.16); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.16, 0, W * 0.16, [[0, '#e3b26a'], [1, '#8a5a1c']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    for (const x of [0.1, 0.16, 0.42, 0.48]) rect(ctx, s + L * x, s + L * (x + 0.03), W * 0.4, '#c0392b', lw * 0.5);
    ctx.beginPath(); ctx.moveTo(s + L * 0.8, -W * 0.5); ctx.lineTo(s + L, 0); ctx.lineTo(s + L * 0.8, W * 0.5); ctx.lineTo(s + L * 0.84, 0); ctx.closePath();
    ctx.fillStyle = lg(ctx, 0, -W * 0.5, 0, W * 0.5, [[0, '#ffffff'], [1, '#7f8c99']]); ctx.fill(); ctx.stroke();
  };
  D.bubblewand = function (ctx, s, L, W, lw, t) {
    ctx.beginPath(); ctx.moveTo(s, -W * 0.1); ctx.lineTo(s + L * 0.6, -W * 0.08); ctx.lineTo(s + L * 0.6, W * 0.08); ctx.lineTo(s, W * 0.1); ctx.closePath();
    ctx.fillStyle = lg(ctx, s, 0, s + L * 0.6, 0, [[0, '#ff9ff3'], [0.5, '#74b9ff'], [1, '#55efc4']]); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.stroke();
    const cx = s + L * 0.8, r = W * 0.42;
    ctx.beginPath(); ctx.arc(cx, 0, r, 0, TAU); ctx.lineWidth = lw * 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = lw * 1.6; ctx.strokeStyle = '#ff9ff3'; ctx.stroke();
    const bg = ctx.createRadialGradient(cx - r * 0.3, -r * 0.3, 1, cx, 0, r);
    bg.addColorStop(0, 'rgba(255,255,255,0.8)'); bg.addColorStop(0.6, 'rgba(160,220,255,' + (0.3 + 0.15 * Math.sin(t * 8)) + ')'); bg.addColorStop(1, 'rgba(255,160,240,0.45)');
    ctx.beginPath(); ctx.arc(cx, 0, r * 0.85, 0, TAU); ctx.fillStyle = bg; ctx.fill();
    circle(ctx, cx + r * 1.1, -r * 0.9 + Math.sin(t * 4) * 2, r * 0.22, 'rgba(200,240,255,0.6)', lw * 0.5);
  };

  // ------------------------------------------------------------ projectiles
  BB.drawProjArt = function (ctx, p, lw) {
    const k = p.kind;
    if (!['kunai', 'javelin', 'pebble', 'bubble', 'fireball'].includes(k)) return false;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
    if (k === 'kunai') { BB.wpn.setW(8); D.kunai(ctx, -14, 26, 8, 1.4); }
    else if (k === 'javelin') { BB.wpn.setW(8); D.javelin(ctx, -40, 56, 8, 1.6); }
    else if (k === 'pebble') { circle(ctx, 0, 0, p.r, '#95a5a6', 1.5); }
    else if (k === 'bubble') {
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fillStyle = 'rgba(190,235,255,0.45)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#74b9ff'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.22, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill();
    } else if (k === 'fireball') {
      ctx.beginPath(); ctx.moveTo(-p.r * 3, 0); ctx.quadraticCurveTo(-p.r, -p.r * 1.3, p.r, 0); ctx.quadraticCurveTo(-p.r, p.r * 1.3, -p.r * 3, 0);
      ctx.fillStyle = 'rgba(255,122,26,0.6)'; ctx.fill();
      circle(ctx, 0, 0, p.r, '#ff7a1a', 1.8);
      ctx.beginPath(); ctx.arc(0, 0, p.r * 0.5, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill();
    }
    ctx.restore();
    return true;
  };

  // ------------------------------------------------------------ special emblems for icons
  const prevIcon = BB.drawIcon;
  BB.drawIcon = function (ctx, id, x, y, size, opts) {
    prevIcon(ctx, id, x, y, size, opts);
    const r = size * 0.33;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (id) {
      case 'magnet':
        ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.38, Math.PI, 0); ctx.lineTo(r * 0.38, r * 0.35); ctx.moveTo(-r * 0.38, -r * 0.05); ctx.lineTo(-r * 0.38, r * 0.35);
        ctx.lineWidth = r * 0.2; ctx.stroke(); break;
      case 'mirror':
        ctx.strokeStyle = 'rgba(120,140,160,0.9)';
        for (const o of [-0.25, 0.05]) { ctx.beginPath(); ctx.moveTo(o * r - r * 0.15, r * 0.3); ctx.lineTo(o * r + r * 0.3, -r * 0.3); ctx.stroke(); }
        break;
      case 'healer':
        ctx.fillRect(-r * 0.12, -r * 0.4, r * 0.24, r * 0.8); ctx.fillRect(-r * 0.4, -r * 0.12, r * 0.8, r * 0.24); break;
      case 'tank':
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.35); ctx.lineTo(r * 0.4, -r * 0.35); ctx.lineTo(r * 0.4, 0); ctx.quadraticCurveTo(r * 0.3, r * 0.4, 0, r * 0.5); ctx.quadraticCurveTo(-r * 0.3, r * 0.4, -r * 0.4, 0); ctx.closePath(); ctx.stroke(); break;
      case 'tiny':
        ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill(); break;
      case 'phoenix':
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.quadraticCurveTo(r * 0.45, -r * 0.1, r * 0.2, r * 0.45); ctx.quadraticCurveTo(0, r * 0.1, -r * 0.2, r * 0.45); ctx.quadraticCurveTo(-r * 0.45, -r * 0.1, 0, -r * 0.5); ctx.fill(); break;
      case 'thorns':
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15); ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.stroke(); }
        break;
      case 'jelly':
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (const [dx, dy] of [[-0.18, 0.1], [0.2, 0.12], [0, -0.22]]) { ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.16, 0, TAU); ctx.fill(); }
        break;
      case 'rage':
        ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.lineTo(-r * 0.08, -r * 0.12); ctx.moveTo(r * 0.4, -r * 0.3); ctx.lineTo(r * 0.08, -r * 0.12);
        ctx.moveTo(-r * 0.25, r * 0.3); ctx.quadraticCurveTo(0, r * 0.1, r * 0.25, r * 0.3); ctx.stroke(); break;
      case 'snowball':
        ctx.strokeStyle = '#74b9ff';
        for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45); ctx.lineTo(-Math.cos(a) * r * 0.45, -Math.sin(a) * r * 0.45); ctx.stroke(); }
        break;
    }
    ctx.restore();
  };
})();
