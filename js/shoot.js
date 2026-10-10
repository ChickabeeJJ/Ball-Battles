// Live PvP launch: before every round of a live series both players aim their own ball.
// Drag back from your ball like a slingshot and let go to fire (or press WASD / arrow keys).
// You have 6 seconds; a player who doesn't aim launches in a random direction. Aims are swapped
// over the live link and the fight starts as soon as both are known, so both screens run the
// exact same seeded battle at the same time.
(function () {
  const BB = window.BB;
  const AIM_TIME = 6, PEER_WAIT = 9, TAU = Math.PI * 2;
  const q = (a) => Math.round(a * 1e4) / 1e4; // aims cross the network: keep them exact on both sides

  const S = (BB.shoot = {
    active: false, st: null, inbox: {}, sr: null, conn: null, peer: null,

    // live link for a matchmaking series (friend rooms route messages themselves)
    link(sr, conn, peer) {
      S.reset();
      S.sr = sr; S.conn = conn; S.peer = peer;
      sr.send = (d) => { try { if (conn.open) conn.send(d); } catch (e) { /* closed */ } };
      conn.on('data', (d) => { if (d && d.t === 'aim') S.onPeer(d); });
      conn.on('close', () => S.peerGone());
    },
    reset() { S.inbox = {}; S.gone = false; },
    // series over: close a matchmaking link
    unlink() {
      const c = S.conn, p = S.peer;
      S.conn = S.peer = null; S.sr = null;
      setTimeout(() => { try { c && c.close(); } catch (e) { /* */ } if (p && BB.net) BB.net.destroy(p); }, 400);
    },
    onPeer(d) {
      const r = d.r | 0, a = Number(d.a);
      if (!isFinite(a)) return;
      S.inbox[r] = q(a);
      if (S.st && S.st.round === r) S.check();
    },
    peerGone() { S.gone = true; if (S.st) S.check(); },

    // a random direction both screens agree on (used when a player doesn't aim)
    fallback(seed, round, side) { const r = BB.RNG(((seed | 0) ^ (round * 7919) ^ (side * 104729)) >>> 0); r(); return q(r() * TAU); },

    // called right after the round's battle is created (sim frozen until both aims are in)
    begin(sr) {
      const app = BB.app, sim = app.sim;
      const mySide = sr.flip ? 1 : 0, foeSide = 1 - mySide;
      const me = sim.balls.find((b) => b.main && b.team === mySide), foe = sim.balls.find((b) => b.main && b.team === foeSide);
      S.st = { round: sr.round, sr, sim, me, foe, mySide, foeSide, t: AIM_TIME, wait: 0, my: null, drag: null, touched: false, aim: me && foe ? Math.atan2(foe.y - me.y, foe.x - me.x) : 0 };
      S.active = true;
      S.pill(true);
      if (sr.bot) S.botAim(S.st);
      BB.audio.play('click');
    },
    // stand-in opponent: thinks for a moment, then fires roughly at you (sometimes rushed or off)
    botAim(st) {
      const round = st.round, delay = 1200 + Math.random() * 3800;
      setTimeout(() => {
        if (!S.st || S.st.round !== round || S.inbox[round] != null) return;
        const b = st.foe, me = st.me, off = Math.random() < 0.2 ? (Math.random() - 0.5) * 2.4 : (Math.random() - 0.5) * 0.7;
        S.onPeer({ r: round, a: Math.atan2(me.y - b.y, me.x - b.x) + off });
      }, delay);
    },
    lock(a) {
      const st = S.st;
      if (!st || st.my != null) return;
      st.my = q(a); st.drag = null;
      if (st.sr.send) st.sr.send({ t: 'aim', r: st.round, a: st.my });
      BB.audio.play('dot');
      S.check();
    },
    check() {
      const st = S.st;
      if (!st || st.my == null) return;
      let pa = S.inbox[st.round];
      if (pa == null && S.gone) pa = S.fallback(st.sr.seed, st.round, st.foeSide);
      if (pa == null) return;
      S.launch(st.my, pa);
    },
    launch(myA, foeA) {
      const st = S.st;
      for (const [b, a] of [[st.me, myA], [st.foe, foeA]]) {
        if (!b) continue;
        const sp = Math.hypot(b.vx, b.vy) || b.speed || 300;
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      }
      S.active = false; S.st = null;
      S.pill(false);
      BB.app.acc = 0;
      BB.audio.play('start');
      BB.ui.banner('FIGHT!', 700);
    },

    // per frame (real time) while aiming
    tick(dt) {
      const st = S.st;
      if (!st) return;
      if (st.my == null) {
        // A / Left turns the arrow counterclockwise, D / Right clockwise (hold to keep turning)
        const k = BB.app.keys, turn = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
        if (turn) { st.aim += turn * 2.4 * dt; st.touched = true; }
        st.t -= dt;
        if (st.t <= 0) S.lock(st.drag && st.drag.len > 12 ? st.drag.a : st.touched ? st.aim : S.fallback(st.sr.seed, st.round, st.mySide));
      } else {
        st.wait += dt;
        if (st.wait > PEER_WAIT && S.inbox[st.round] == null) { S.gone = true; S.check(); }
      }
      S.pill(true);
    },

    // ------------------------------------------------------------- input
    down(p) { const st = S.st; if (!st || st.my != null) return false; st.drag = { x0: p.x, y0: p.y, a: st.aim, len: 0 }; return true; },
    move(p) {
      const st = S.st;
      if (!st || !st.drag || st.my != null) return;
      // slingshot: pull away from where you want to go; the arrow follows live
      const dx = st.drag.x0 - p.x, dy = st.drag.y0 - p.y, len = Math.hypot(dx, dy);
      st.drag.len = len; if (len > 6) { st.drag.a = Math.atan2(dy, dx); st.aim = st.drag.a; st.touched = true; }
    },
    up() { const st = S.st; if (!st || !st.drag || st.my != null) return; if (st.drag.len > 22) S.lock(st.drag.a); st.drag = null; },
    // keyboard: A/D (or Left/Right) turn, W / Up / Space / Enter fires
    key(code) { const st = S.st; if (!st || st.my != null) return; if (/^(KeyW|ArrowUp|Space|Enter)$/.test(code)) S.lock(st.aim); else st.touched = true; },

    // ------------------------------------------------------------- drawing (world space, over the arena)
    overlay(ctx) {
      const st = S.st;
      if (!st || !st.me) return;
      const b = st.me, t = performance.now() / 1000, r = b.r;
      // pulsing ring on your ball
      ctx.save();
      ctx.beginPath(); ctx.arc(b.x, b.y, r + 10 + Math.sin(t * 6) * 3, 0, TAU);
      ctx.strokeStyle = 'rgba(255,210,63,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([]);
      const a = st.my != null ? st.my : st.aim;
      if (st.my == null) { // dotted path with one wall bounce, so you can see where the shot goes
        const hw = st.sim.W / 2 - r, hh = st.sim.H / 2 - r; let x = b.x, y = b.y, vx = Math.cos(a), vy = Math.sin(a), bounced = 0;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(17,17,17,0.8)'; ctx.lineWidth = 2;
        for (let i = 1; i <= 46; i++) {
          x += vx * 14; y += vy * 14;
          if (x < -hw || x > hw) { vx = -vx; x = Math.max(-hw, Math.min(hw, x)); bounced++; }
          if (y < -hh || y > hh) { vy = -vy; y = Math.max(-hh, Math.min(hh, y)); bounced++; }
          if (bounced > 1) break;
          if (i % 2 && i > 9) { ctx.globalAlpha = 0.9 * (1 - i / 50); ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }
      if (a != null) {
        const pull = st.my != null ? 1 : st.drag ? Math.min(1, st.drag.len / 120) : 0.5;
        const L = r + 60 + 70 * pull, ca = Math.cos(a), sa = Math.sin(a), col = st.my != null ? '#35d047' : '#ffd23f';
        // a bold arrow: outlined shaft + big head
        const x0 = b.x + ca * (r + 10), y0 = b.y + sa * (r + 10), x1 = b.x + ca * L, y1 = b.y + sa * L;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = '#111'; ctx.lineWidth = 15; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x + ca * (L + 34), b.y + sa * (L + 34)); ctx.lineTo(x1 - sa * 22, y1 + ca * 22); ctx.lineTo(x1 + sa * 22, y1 - ca * 22); ctx.closePath();
        ctx.fillStyle = col; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#111'; ctx.fill(); ctx.stroke();
        // the elastic band while pulling
        if (st.drag && st.my == null) {
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - ca * (r + 30 * pull), b.y - sa * (r + 30 * pull));
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
        }
      } else {
        // hint: a soft arrow cycling around the ball
        const ha = t * 1.6, hx = b.x + Math.cos(ha) * (r + 34), hy = b.y + Math.sin(ha) * (r + 34);
        ctx.beginPath(); ctx.arc(hx, hy, 6, 0, TAU); ctx.fillStyle = 'rgba(255,210,63,0.75)'; ctx.fill();
      }
      ctx.restore();
    },

    // countdown pill under the arena
    pill(on) {
      let el = document.getElementById('shotPill');
      if (!on) { if (el) el.remove(); return; }
      if (!el) {
        el = document.createElement('div'); el.id = 'shotPill'; el.className = 'shot-pill';
        (document.getElementById('arenaWrap') || document.body).appendChild(el);
      }
      const st = S.st;
      if (!st) return;
      const secs = Math.max(0, Math.ceil(st.t));
      const html = st.my == null
        ? `<span>Time to shoot</span><b class="${secs <= 2 ? 'hot' : ''}">${secs}</b>`
        : `<span>Locked in</span><i>waiting for ${BB.meta.cleanName(st.sr.foeName)}…</i>`;
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
      el.style.setProperty('--p', (Math.max(0, st.t) / AIM_TIME).toFixed(3));
    },
  });
})();
