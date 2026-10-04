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
    grip(ctx, s, s + Math.min(L * 0.18, 18), W * 1.6, '#4a235a', lw);
    ctx.beginPath(); ctx.moveTo(s + Math.min(L * 0.18, 18), 0);
    const n = 10;
    for (let i = 1; i <= n; i++) { const k = i / n; ctx.lineTo(s + 18 + (L - 18) * k, Math.sin(k * 6 + t * 12) * W * 1.2 * k); }
    ctx.strokeStyle = OUT; ctx.lineWidth = W * 0.9 + lw * 1.5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = '#8e5a3c'; ctx.lineWidth = W * 0.9; ctx.stroke(); ctx.lineCap = 'butt';
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
