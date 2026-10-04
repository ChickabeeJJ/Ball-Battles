// Shared namespace, seeded RNG and geometry helpers.
(function () {
  const BB = (window.BB = window.BB || {});

  // xorshift32 — deterministic so battles (and preview videos) can be replayed from a seed.
  BB.RNG = function (seed) {
    let s = seed >>> 0 || 0x9e3779b9;
    const r = function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  };

  BB.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  BB.lerp = (a, b, t) => a + (b - a) * t;
  BB.fmt = (n) => (Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(1));

  const geo = (BB.geo = {});

  // Squared distance from point P to segment AB.
  geo.segPoint2 = function (ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + dx * t - px, cy = ay + dy * t - py;
    return cx * cx + cy * cy;
  };

  // Closest point on segment AB to P.
  geo.segClosest = function (ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [ax + dx * t, ay + dy * t];
  };

  function orient(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }

  // Squared distance between segments (capsule cores). 0 when they cross.
  geo.segSeg2 = function (a, b) {
    const o1 = orient(a.ax, a.ay, a.bx, a.by, b.ax, b.ay);
    const o2 = orient(a.ax, a.ay, a.bx, a.by, b.bx, b.by);
    const o3 = orient(b.ax, b.ay, b.bx, b.by, a.ax, a.ay);
    const o4 = orient(b.ax, b.ay, b.bx, b.by, a.bx, a.by);
    if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return 0;
    return Math.min(
      geo.segPoint2(a.ax, a.ay, a.bx, a.by, b.ax, b.ay),
      geo.segPoint2(a.ax, a.ay, a.bx, a.by, b.bx, b.by),
      geo.segPoint2(b.ax, b.ay, b.bx, b.by, a.ax, a.ay),
      geo.segPoint2(b.ax, b.ay, b.bx, b.by, a.bx, a.by)
    );
  };

  BB.TEAMS = [
    { name: 'Green', fill: '#35d047', dark: '#1d8a2b', text: '#35d047' },
    { name: 'Red', fill: '#f0545a', dark: '#a8262c', text: '#f0545a' },
    { name: 'Blue', fill: '#3d8bf2', dark: '#1d4fa0', text: '#3d8bf2' },
    { name: 'Gold', fill: '#f5b82e', dark: '#a87310', text: '#f5b82e' },
  ];
})();
