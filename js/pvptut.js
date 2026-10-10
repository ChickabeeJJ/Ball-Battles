// PvP tutorial: shown the first time the PvP Arena opens (and from "How PvP works").
// Four short steps, each with a live demo; Skip at any time.
(function () {
  const BB = window.BB, TAU = Math.PI * 2;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const T = (BB.pvpTut = {
    open(done) {
      T.close();
      const wrap = el('div', 'pt-wrap');
      wrap.innerHTML = `<div class="pt-box"><div class="pt-top"><span class="pt-dots"></span><button class="pt-skip">Skip</button></div>
        <div class="pt-stage"></div><h3 class="pt-h"></h3><p class="pt-p"></p>
        <div class="pt-nav"><button class="btn pt-back">Back</button><button class="btn primary pt-next">Next</button></div></div>`;
      document.body.appendChild(wrap);
      T.wrap = wrap; T.done = done; T.i = 0;
      wrap.querySelector('.pt-skip').onclick = () => { BB.audio.play('click'); T.finish(); };
      wrap.querySelector('.pt-back').onclick = () => { BB.audio.play('click'); T.go(T.i - 1); };
      wrap.querySelector('.pt-next').onclick = () => { BB.audio.play('click'); if (T.i >= STEPS.length - 1) T.finish(); else T.go(T.i + 1); };
      T.keys = (e) => { if (T.demo && T.demo.key) T.demo.key(e); };
      window.addEventListener('keydown', T.keys);
      T.go(0);
    },
    go(i) {
      i = Math.max(0, Math.min(STEPS.length - 1, i));
      if (T.demo && T.demo.stop) T.demo.stop();
      T.demo = null; T.i = i;
      const w = T.wrap, s = STEPS[i], stage = w.querySelector('.pt-stage');
      stage.innerHTML = '';
      w.querySelector('.pt-h').textContent = s.title;
      w.querySelector('.pt-p').innerHTML = s.text;
      w.querySelector('.pt-dots').innerHTML = STEPS.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('');
      w.querySelector('.pt-back').style.visibility = i ? 'visible' : 'hidden';
      w.querySelector('.pt-next').textContent = i === STEPS.length - 1 ? "Let's go!" : 'Next';
      T.demo = s.demo(stage) || null;
    },
    finish() {
      const pv = BB.meta.pvpData(); pv.tutDone = true; BB.save.write();
      const d = T.done; T.close(); if (d) d();
    },
    close() {
      if (T.demo && T.demo.stop) T.demo.stop();
      T.demo = null;
      if (T.keys) window.removeEventListener('keydown', T.keys);
      document.querySelectorAll('.pt-wrap').forEach((x) => x.remove());
    },
  });

  // a tiny arena: its own sim + renderer, stepped in real time
  function arena(stage, teams, px, seed) {
    const cv = el('canvas', 'pt-cv'); stage.appendChild(cv);
    const R = new BB.Renderer(cv); R.dark = !!BB.save.data.settings.dark; R.resize(px);
    const sim = new BB.Sim({ seed: seed || 4, map: 'classic', teams, settings: { dmgNumbers: true, callouts: true, hitlag: false, parrylag: false, impact: false, finisher: false } });
    return { cv, R, sim };
  }
  const size = () => Math.max(200, Math.min(300, window.innerWidth - 80, window.innerHeight - 380));

  const STEPS = [
    {
      title: 'Aim your shot',
      text: 'Before every round you get <b>6 seconds</b> to aim. Drag back from your ball like a slingshot and let go to fire (or press <b>WASD / arrow keys</b>). Try it!',
      demo(stage) {
        const px = size(), a = arena(stage, [[{ id: 'sword', hp: 100, slot: 0 }], [{ id: 'dummy', hp: 60, slot: 1 }]], px, 9);
        const me = a.sim.balls[0], foe = a.sim.balls[1];
        me.x = -a.sim.W * 0.25; me.y = a.sim.H * 0.15; foe.x = a.sim.W * 0.22; foe.y = -a.sim.H * 0.18;
        const pill = el('div', 'shot-pill pt-pill'); stage.appendChild(pill);
        const tip = el('div', 'pt-tip'); stage.appendChild(tip);
        let t = 6, aim = null, drag = null, launched = false, raf = 0, last = performance.now(), acc = 0, keyT = 0;
        const world = (e) => { const r = a.cv.getBoundingClientRect(), S = a.sim.size; return { x: ((e.clientX - r.left) / r.width - 0.5) * S, y: ((e.clientY - r.top) / r.height - 0.5) * S }; };
        const lock = (ang, auto) => {
          if (launched) return; launched = true; aim = ang;
          const sp = Math.hypot(me.vx, me.vy) || me.speed; me.vx = Math.cos(ang) * sp; me.vy = Math.sin(ang) * sp;
          tip.textContent = auto ? 'Too slow: it launched in a random direction.' : 'Nice shot! In a real match, both players fire at once.';
          tip.classList.add('on'); BB.audio.play('start');
        };
        a.cv.addEventListener('pointerdown', (e) => { if (launched) return; drag = { x0: world(e).x, y0: world(e).y, len: 0, a: 0 }; a.cv.setPointerCapture(e.pointerId); e.preventDefault(); });
        a.cv.addEventListener('pointermove', (e) => { if (!drag) return; const p = world(e), dx = drag.x0 - p.x, dy = drag.y0 - p.y; drag.len = Math.hypot(dx, dy); if (drag.len > 4) drag.a = Math.atan2(dy, dx); });
        a.cv.addEventListener('pointerup', () => { if (drag && drag.len > 18) lock(drag.a); drag = null; });
        const overlay = (ctx) => {
          if (launched && t < -0.6) return;
          const b = me, r = b.r, now = performance.now() / 1000;
          ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, r + 10 + Math.sin(now * 6) * 3, 0, TAU);
          ctx.strokeStyle = 'rgba(255,210,63,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -now * 30; ctx.stroke(); ctx.setLineDash([]);
          const ang = aim != null ? aim : drag && drag.len > 4 ? drag.a : null;
          if (ang != null) {
            const pull = aim != null ? 1 : Math.min(1, drag.len / 120), L = r + 40 + 90 * pull, ca = Math.cos(ang), sa = Math.sin(ang);
            ctx.strokeStyle = aim != null ? '#35d047' : '#ffd23f'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 7; ctx.lineCap = 'round';
            ctx.setLineDash([2, 14]); ctx.beginPath(); ctx.moveTo(b.x + ca * (r + 8), b.y + sa * (r + 8)); ctx.lineTo(b.x + ca * L, b.y + sa * L); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(b.x + ca * (L + 22), b.y + sa * (L + 22)); ctx.lineTo(b.x + ca * L - sa * 14, b.y + sa * L + ca * 14); ctx.lineTo(b.x + ca * L + sa * 14, b.y + sa * L - ca * 14); ctx.closePath();
            ctx.lineWidth = 4; ctx.strokeStyle = '#111'; ctx.stroke(); ctx.fill();
          } else {
            // a ghost hand showing the drag gesture
            const k = (now % 1.6) / 1.6, hx = b.x - Math.min(1, k * 1.4) * 70, hy = b.y + Math.min(1, k * 1.4) * 50;
            ctx.globalAlpha = k < 0.85 ? 0.9 : (1 - k) * 6; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(hx, hy); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
          }
          ctx.restore();
        };
        const loop = (now) => {
          const dt = Math.min(0.1, (now - last) / 1000); last = now;
          if (keyT > 0) { keyT -= dt; if (keyT <= 0) { const k = T.held || {}, x = (k.d ? 1 : 0) - (k.a ? 1 : 0), y = (k.s ? 1 : 0) - (k.w ? 1 : 0); if (x || y) lock(Math.atan2(y, x)); } }
          t -= dt;
          if (!launched && t <= 0) lock(a.sim.rng() * TAU, true);
          if (launched) { acc += dt; while (acc >= 1 / 120) { a.sim.step(1 / 120); a.sim.events.length = 0; acc -= 1 / 120; } }
          if (a.sim.over || t < -9) { stop(); T.go(T.i); return; } // replay the demo
          const secs = Math.max(0, Math.ceil(t));
          pill.style.display = launched ? 'none' : '';
          pill.innerHTML = `<span>Time to shoot</span><b class="${secs <= 2 ? 'hot' : ''}">${secs}</b>`; pill.style.setProperty('--p', (Math.max(0, t) / 6).toFixed(3));
          a.R.draw(a.sim, { overlay });
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const stop = () => cancelAnimationFrame(raf);
        T.held = {};
        return {
          stop,
          key(e) {
            const m = { KeyW: 'w', ArrowUp: 'w', KeyA: 'a', ArrowLeft: 'a', KeyS: 's', ArrowDown: 's', KeyD: 'd', ArrowRight: 'd' }[e.code];
            if (!m || launched) return; e.preventDefault(); T.held[m] = true; keyT = 0.09;
            setTimeout(() => { T.held[m] = false; }, 250);
          },
        };
      },
    },
    {
      title: 'Best of 3',
      text: 'Pick a squad of <b>3 balls</b>. They fight one at a time: your first pick in round 1, your second in round 2, your third in round 3. All 3 rounds are played and the most wins takes the series.',
      demo(stage) {
        const mine = ['sword', 'axe', 'spear'], theirs = ['bow', 'hammer', 'katana'];
        const box = el('div', 'pt-rounds', [0, 1, 2].map((k) => `<div class="pt-r" style="animation-delay:${k * 0.25}s"><img src="${BB.icon(mine[k])}" alt=""><em>R${k + 1}</em><img src="${BB.icon(theirs[k])}" alt=""><b class="${k === 1 ? 'l' : 'w'}">${k === 1 ? 'LOSS' : 'WIN'}</b></div>`).join('') + '<div class="pt-score">2 - 1 <span>Victory!</span></div>');
        stage.appendChild(box);
      },
    },
    {
      title: 'Same fight, both screens',
      text: 'Once both shots are in, you and your rival watch the <b>exact same battle</b> at the same time. Every hit, every bounce, identical.',
      demo(stage) {
        const px = Math.round(Math.min(size() * 0.62, (Math.min(440, window.innerWidth - 28) - 50) / 2)), row = el('div', 'pt-two'); stage.appendChild(row);
        const L = el('div', 'pt-side', '<span>YOU</span>'), Rr = el('div', 'pt-side', '<span>RIVAL</span>'); row.append(L, Rr);
        const a = arena(L, [[{ id: 'katana', hp: 100, slot: 0 }], [{ id: 'chainsaw', hp: 100, slot: 1 }]], px, 21);
        const cv2 = el('canvas', 'pt-cv'); Rr.appendChild(cv2); const R2 = new BB.Renderer(cv2); R2.dark = a.R.dark; R2.resize(px);
        let raf = 0, last = performance.now(), acc = 0;
        const loop = (now) => {
          acc += Math.min(0.1, (now - last) / 1000); last = now;
          while (acc >= 1 / 120) { a.sim.step(1 / 120); a.sim.events.length = 0; acc -= 1 / 120; }
          if (a.sim.over || a.sim.t > 30) { cancelAnimationFrame(raf); T.go(T.i); return; }
          a.R.draw(a.sim, {}); R2.draw(a.sim, {});
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return { stop: () => cancelAnimationFrame(raf) };
      },
    },
    {
      title: 'Climb the ranks',
      text: 'Wins raise your rating, losses lower it. Beat stronger players for bigger jumps. Every series pays coins: <b>150</b> for a win, <b>80</b> for a draw, <b>50</b> for a loss.',
      demo(stage) {
        const M = BB.meta;
        stage.appendChild(el('div', 'pt-ranks', M.RANKS.map((r, k) => `<div class="pt-rk" style="--rc:${r[2]};animation-delay:${k * 0.15}s"><i></i><b>${r[1]}</b><small>${r[0]}+</small></div>`).join('')));
      },
    },
  ];
})();
