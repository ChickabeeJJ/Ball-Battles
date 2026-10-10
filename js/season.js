// Live ops: limited-time events (event quests + an exclusive ball) and the seasonal Battle Pass.
//   Events  - a fixed calendar of events; each runs until its end date at local midnight.
//   Seasons - 30 days each, counted from Season 1's start; Season XP fills 30 tiers on two tracks
//             (Free, and Elite which is unlocked with coins). Unclaimed rewards expire with the season.
// Everything is stored under save.meta.ev / save.meta.pass / save.meta.cosm.
(function () {
  const BB = window.BB;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const coin = (n) => '<span class="coin-ic"></span>' + n;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const DAY = 864e5;
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const left = (ms) => { ms = Math.max(0, ms); const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 36e5), m = Math.floor((ms % 36e5) / 6e4); return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : Math.max(1, m) + 'm'; };

  // ================================================================ events
  // end = local midnight at the end of the last day (new Date(y, monthIndex, day + 1)).
  const EVENTS = [
    {
      id: 'release26', name: 'Ball VS Ball Release!', short: 'Release', start: new Date(2026, 9, 1), end: new Date(2026, 10, 16),
      endLabel: '15 Nov 2026', ball: 'ball',
      quests: [
        { id: 'login3', text: 'Log in on 3 different days', goal: 3, reward: 150, ev: 'login', uniq: true },
        { id: 'battles50', text: 'Finish 50 battles', goal: 50, reward: 400, ev: 'done' },
        { id: 'ko100', text: 'Knock out 100 balls', goal: 100, reward: 300, ev: 'ko' },
        { id: 'daily10', text: 'Complete 10 daily quests', goal: 10, reward: 350, ev: 'dailyq' },
        // PvP is only on CrazyGames: everywhere else this quest asks for Cup matches instead
        { id: 'pvp5', text: 'Win 5 PvP matches', goal: 5, reward: 500, ev: 'pvpwin', pvp: true, alt: { text: 'Play 5 Cup matches', ev: 'cupwin' } },
      ],
    },
  ];

  // ================================================================ seasons
  // The season calendar: only listed seasons run. Between seasons (or after the last one listed) there
  // is no pass at all: the menu button hides and no Season XP is earned. Each season lasts 30 days.
  const SEASON_DAYS = 30;
  const SEASONS = [{ n: 1, name: 'Origins', start: new Date(2026, 9, 10) }].map((s) => Object.assign(s, { end: new Date(+s.start + SEASON_DAYS * DAY) }));
  const TIERS = 50, PER_TIER = 200, BONUS_XP = 500, BONUS_COINS = 150, ELITE_COST = 7500;
  const RANK = { common: 0, rare: 1, epic: 2, legendary: 3, iridescent: 4 };
  const TITLES = { s1v: { name: 'Season 1 Veteran', cls: 'v' }, s1e: { name: 'Season 1 Elite', cls: 'e' } };
  // one reward per cell: every 10th tier is a ball, everything else is coins (Elite pays a bit more).
  // Elite tier 30 is the season's own exclusive ball (Season 1: Nova).
  const SEASON_BALL = { 1: 'nova' };
  function rewards(season) {
    const out = [];
    for (let k = 1; k <= TIERS; k++) {
      const base = Math.round((40 + k * 4) / 5) * 5;
      // profile titles: Free tier 50 and Elite tier 40 (Season 1)
      const free = k === 50 && season === 1 ? { t: 'title', id: 's1v' } : k % 10 === 0 ? { t: 'ball', min: 'rare' } : { t: 'coins', n: base };
      const elite = k === 30 && SEASON_BALL[season] ? { t: 'item', id: SEASON_BALL[season] } : k === 40 && season === 1 ? { t: 'title', id: 's1e' } : k % 10 === 0 ? { t: 'ball', min: 'rare' } : { t: 'coins', n: Math.round((base * 1.35) / 5) * 5 };
      out.push({ free, elite });
    }
    return out;
  }
  // Rare+ ball drop odds: 90% Rare, 9% Epic, 1% Legendary. Never limited balls (Kami, King, event or season exclusives).
  const ODDS = [['rare', 0.9], ['epic', 0.09], ['legendary', 0.01]];
  const limited = (i) => i.kami || i.dailyOnly || i.eventOnly || i.seasonBall || i.rarity === 'iridescent';

  const S = (BB.season = {
    now: () => Date.now(),
    XP: { battle: 15, battleMax: 15, mode: 10, pvp: 40, pvpWin: 40, daily: 100, event: 150, gift: 50, play: 20 },
    EVENTS, TIERS, PER_TIER, ELITE_COST,

    // ------------------------------------------------------------- event state
    event() { const t = S.now(); return EVENTS.find((e) => t >= +e.start && t < +e.end) || null; },
    evData(e) {
      const m = BB.meta.data();
      m.ev = m.ev || {};
      const d = (m.ev[e.id] = m.ev[e.id] || { q: {}, ball: false, intro: false });
      for (const q of e.quests) d.q[q.id] = d.q[q.id] || { p: 0, c: false, u: [] };
      return d;
    },
    qdef(q) { return q.pvp && !(BB.app && BB.app.pvpAvailable && BB.app.pvpAvailable()) ? Object.assign({}, q, q.alt) : q; },
    eventReady() {
      const e = S.event(); if (!e) return false;
      const d = S.evData(e);
      return e.quests.some((q) => !d.q[q.id].c && d.q[q.id].p >= q.goal) || (!d.ball && S.allDone(e));
    },
    allDone(e) { const d = S.evData(e); return e.quests.every((q) => d.q[q.id].p >= q.goal); },
    track(ev, val) {
      const e = S.event();
      if (e) {
        const d = S.evData(e);
        for (const q0 of e.quests) {
          const q = S.qdef(q0), st = d.q[q.id];
          if (q.ev !== ev || st.p >= q.goal) continue;
          if (q.uniq) { if (!st.u.includes(val)) { st.u.push(val); st.p = st.u.length; } }
          else st.p = Math.min(q.goal, st.p + (val || 1));
        }
      }
      // PvP feeds the pass directly
      if (ev === 'pvpplay') S.addXP(S.XP.pvp, 'PvP match');
      if (ev === 'pvpwin') S.addXP(S.XP.pvpWin, 'PvP win');
    },
    needsIntro() { const e = S.event(); return !!e && !S.evData(e).intro && !BB.app.capture; },

    // ------------------------------------------------------------- event tab
    renderEvent(body) {
      const e = S.event();
      if (!e) {
        body.appendChild(el('div', 'ev-empty', `<div class="ev-e-ic">${BB.ICON.clock}</div><b>No events now</b><span>Limited-time events show up here. Check back soon!</span>`));
        return;
      }
      const d = S.evData(e), ball = BB.ITEM[e.ball], owned = !!BB.save.data.unlocked[e.ball];
      const done = e.quests.filter((q) => d.q[q.id].p >= q.goal).length;
      const hero = el('div', 'ev-hero', `
        <div class="ev-h-txt"><div class="ev-kick"><i></i>LIMITED EVENT</div><div class="ev-title">${esc(e.name)}</div>
          <div class="ev-time">${BB.ICON.clock}<span>Ends in <b class="ev-left">${left(+e.end - S.now())}</b></span></div></div>
        <div class="ev-ball"><div class="ev-ring"></div><img src="${BB.icon(e.ball, 128)}" alt=""></div>`);
      body.appendChild(hero);
      const prize = el('div', 'ev-prize' + (owned ? ' got' : ''), `
        <div class="ev-p-l"><span class="ev-p-k">Exclusive reward</span><b>${esc(ball.name)}</b><span class="ev-p-r">Legendary · Summons a random ball to fight beside it</span>
          <span class="ev-never">${owned ? 'Yours forever.' : 'Event exclusive. It will NEVER return.'}</span></div>`);
      const pv = el('button', 'btn blue ev-pv', BB.ICON.play + ' Preview');
      pv.onclick = () => { BB.audio.play('click'); BB.ui.preview(e.ball); };
      prize.appendChild(pv);
      body.appendChild(prize);
      body.appendChild(el('div', 'ev-prog', `<div class="ev-pg-t"><span>Event progress</span><b>${done} / ${e.quests.length}</b></div><div class="ev-segs">${e.quests.map((q) => `<i class="${d.q[q.id].p >= q.goal ? 'on' : ''}"></i>`).join('')}</div>`));
      e.quests.forEach((q0, i) => {
        const q = S.qdef(q0), st = d.q[q.id], ok = st.p >= q.goal;
        const row = el('div', 'quest ev-q' + (st.c ? ' claimed' : ok ? ' ready' : ''), `<em class="ev-n">${st.c ? BB.ICON.check : i + 1}</em><div class="q-main"><div class="q-t">${esc(q.text)}</div>
          <div class="q-bar"><i style="width:${(st.p / q.goal) * 100}%"></i><b>${Math.floor(st.p)} / ${q.goal}</b></div></div>`);
        const btn = el('button', 'btn ' + (st.c ? '' : ok ? 'green' : ''), st.c ? 'Done' : coin(q.reward));
        btn.disabled = st.c || !ok;
        btn.onclick = () => {
          st.c = true; BB.save.data.coins += q.reward; BB.save.write();
          BB.audio.play('coin'); BB.app.refreshCoins(); S.addXP(S.XP.event, 'Event quest');
          BB.ui.onClose = null; BB.ui.close(); BB.meta.openQuests('event');
        };
        row.appendChild(btn);
        body.appendChild(row);
      });
      const fin = el('div', 'ev-final' + (owned ? ' got' : S.allDone(e) ? ' ready' : ''), `<img src="${BB.icon(e.ball)}" alt=""><div class="q-main"><div class="q-t">${owned ? esc(ball.name) + ' unlocked!' : 'Finish every quest to claim ' + esc(ball.name)}</div><div class="ev-f-s">${owned ? 'Find it in the Specials tab.' : 'Grand prize · ' + done + ' / ' + e.quests.length + ' quests done'}</div></div>`);
      const fb = el('button', 'btn ' + (owned ? '' : S.allDone(e) ? 'primary ev-claim' : ''), owned ? 'Owned' : 'Claim ' + esc(ball.name));
      fb.disabled = owned || !S.allDone(e);
      fb.onclick = () => {
        BB.save.data.unlocked[e.ball] = true; d.ball = true; BB.save.write();
        BB.audio.play('unlock'); BB.sdk.happytime();
        S.reveal([{ t: 'ball', id: e.ball, label: 'EVENT EXCLUSIVE' }], 'You got ' + ball.name + '!');
        BB.ui.onClose = null; BB.ui.close(); BB.meta.openQuests('event');
      };
      fin.appendChild(fb);
      body.appendChild(fin);
      const again = el('button', 'ev-again', BB.ICON.play + ' Watch the event intro');
      again.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); S.playIntro(() => BB.meta.openQuests('event')); };
      body.appendChild(again);
      const tick = setInterval(() => { const l = body.querySelector('.ev-left'); if (!l) return clearInterval(tick); if (!S.event()) { clearInterval(tick); BB.ui.onClose = null; BB.ui.close(); BB.meta.openQuests('event'); return; } l.textContent = left(+e.end - S.now()); }, 30000);
    },

    // ------------------------------------------------------------- event intro (full-screen cinematic)
    // BALL / VS / BALL slam in, "RELEASE" ignites underneath, then the exclusive ball rises out of a
    // rainbow portal with its "never returns" warning. Tap to skip. Canvas-drawn, ~7s.
    playIntro(done) {
      const e = S.event();
      if (e) { S.evData(e).intro = true; BB.save.write(); }
      const wrap = el('div', 'evi');
      const cv = el('canvas', 'evi-c');
      wrap.appendChild(cv);
      wrap.appendChild(el('div', 'evi-skip', 'Tap to skip'));
      document.body.appendChild(wrap);
      const ctx = cv.getContext('2d'), A = BB.audio;
      const ballImg = new Image(); ballImg.src = BB.icon(e ? e.ball : 'ball', 256);
      const DUR = 7.4;
      let t0 = performance.now(), raf = 0, ended = false, cues = {};
      const cue = (name, at, fn) => { if (!cues[name] && T >= at) { cues[name] = 1; fn(); } };
      let T = 0;
      BB.music && BB.music.fade && BB.music.fade(0.15, 300);
      const finish = () => {
        if (ended) return; ended = true; cancelAnimationFrame(raf);
        wrap.classList.add('out'); BB.music && BB.music.fade && BB.music.fade(1, 600);
        setTimeout(() => { wrap.remove(); if (done) done(); }, 380);
      };
      setTimeout(() => wrap.addEventListener('pointerdown', finish), 500);
      const onKey = (k) => { if (k.code === 'Space' || k.code === 'Escape' || k.code === 'Enter') { window.removeEventListener('keydown', onKey); finish(); } };
      window.addEventListener('keydown', onKey);
      const rng = BB.RNG(7), stars = Array.from({ length: 90 }, () => [rng(), rng(), 0.3 + rng() * 1.6, rng()]);
      const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
      const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
      const RB = ['#ff5e7e', '#ffd23f', '#35d047', '#3d8bf2', '#a259ff'];
      const frame = (now) => {
        T = (now - t0) / 1000;
        const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const S0 = Math.min(W, H * 1.25), cx = W / 2, cy = H / 2;
        // sound cues
        cue('a', 0.55, () => A.play('kamiSlam'));
        cue('b', 0.95, () => A.play('slash'));
        cue('c', 1.35, () => A.play('kamiSlam'));
        cue('d', 2.0, () => A.play('boom'));
        cue('e', 3.6, () => A.play('awaken'));
        cue('f', 4.4, () => A.play('unlock'));
        // shake on the slams
        let sh = 0;
        for (const [at, k] of [[0.55, 12], [1.35, 12], [2.0, 18]]) if (T > at && T < at + 0.3) sh = Math.max(sh, k * (1 - (T - at) / 0.3));
        ctx.save(); ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
        // background: deep space with a magenta / violet bloom that grows when RELEASE ignites
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
        const heat = ease((T - 1.9) / 0.6);
        bg.addColorStop(0, `rgb(${40 + 60 * heat},${12 + 8 * heat},${60 + 40 * heat})`); bg.addColorStop(1, '#05040a');
        ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
        // star field streaking toward the camera
        for (const [sx, sy, sz, ph] of stars) {
          const k = ((T * 0.18 + ph) % 1), x = cx + (sx - 0.5) * W * (0.4 + k * 1.6), y = cy + (sy - 0.5) * H * (0.4 + k * 1.6);
          ctx.globalAlpha = Math.min(1, k * 2) * 0.8; ctx.fillStyle = '#fff'; ctx.fillRect(x, y, sz * (0.5 + k), sz * (0.5 + k));
        }
        ctx.globalAlpha = 1;
        // sunburst rays after the third slam
        if (T > 2.0) {
          ctx.save(); ctx.translate(cx, cy * 0.78); ctx.rotate(T * 0.15);
          const ra = ease((T - 2.0) / 0.5) * 0.16;
          for (let i = 0; i < 18; i++) { ctx.rotate(Math.PI * 2 / 18); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.max(W, H), -60); ctx.lineTo(Math.max(W, H), 60); ctx.closePath(); ctx.fillStyle = `rgba(255,${i % 2 ? 210 : 120},${i % 2 ? 63 : 200},${ra})`; ctx.fill(); }
          ctx.restore();
        }
        // title: BALL (from left), VS (stamp), BALL (from right). Moves up once the reward appears.
        const up = ease((T - 3.4) / 0.7), ty = cy * (0.78 - 0.42 * up), sc = 1 - 0.38 * up;
        const fs = S0 * 0.16 * sc;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        const word = (txt, x, y, size, fill, stroke, rot) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.font = `${size}px Anton, Impact, sans-serif`;
          ctx.lineWidth = size * 0.16; ctx.strokeStyle = '#111'; ctx.strokeText(txt, 0, size * 0.06);
          ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); if (stroke) { ctx.lineWidth = size * 0.04; ctx.strokeStyle = stroke; ctx.strokeText(txt, 0, 0); }
          ctx.restore();
        };
        if (T > 0.4) { const k = back((T - 0.4) / 0.3); word('BALL', cx - fs * 1.45 - (1 - k) * W * 0.7, ty, fs, '#ffffff'); }
        if (T > 1.2) { const k = back((T - 1.2) / 0.3); word('BALL', cx + fs * 1.45 + (1 - k) * W * 0.7, ty, fs, '#ffd23f'); }
        if (T > 0.85) {
          const k = Math.min(1, (T - 0.85) / 0.18), s2 = fs * 0.62 * (2.4 - 1.4 * k);
          ctx.save(); ctx.translate(cx, ty); ctx.rotate(-0.12); ctx.globalAlpha = k;
          ctx.fillStyle = '#e8473f'; ctx.strokeStyle = '#111'; ctx.lineWidth = s2 * 0.12;
          const bw = s2 * 1.3, bh = s2 * 1.05; ctx.beginPath(); ctx.rect(-bw / 2, -bh / 2, bw, bh); ctx.fill(); ctx.stroke();
          ctx.restore(); ctx.globalAlpha = k; word('VS', cx, ty, s2 * 0.85, '#ffffff', null, -0.12); ctx.globalAlpha = 1;
        }
        // impact flash on the third slam
        if (T > 2.0 && T < 2.35) { ctx.fillStyle = `rgba(255,250,235,${0.85 * (1 - (T - 2.0) / 0.35)})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
        // RELEASE: letters ignite one by one with a gold gradient and a hot glow
        if (T > 2.0) {
          const rs = fs * 0.62, ry = ty + fs * 0.95, txt = 'RELEASE';
          ctx.font = `${rs}px Anton, Impact, sans-serif`;
          const gap = rs * 0.08, widths = [...txt].map((c) => ctx.measureText(c).width), tw = widths.reduce((a, b) => a + b, 0) + gap * (txt.length - 1);
          let x = cx - tw / 2;
          [...txt].forEach((c, i) => {
            const k = ease((T - 2.05 - i * 0.07) / 0.25);
            if (k > 0) {
              const gx = x + widths[i] / 2;
              ctx.save(); ctx.translate(gx, ry + (1 - k) * rs * 0.6); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.globalAlpha = k;
              ctx.font = `${rs}px Anton, Impact, sans-serif`;
              ctx.shadowColor = 'rgba(255,170,40,0.9)'; ctx.shadowBlur = rs * 0.35 * (0.6 + 0.4 * Math.sin(T * 6 + i));
              const g = ctx.createLinearGradient(0, -rs / 2, 0, rs / 2); g.addColorStop(0, '#fff6c2'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#ff8a1f');
              ctx.lineWidth = rs * 0.14; ctx.strokeStyle = '#111'; ctx.strokeText(c, 0, 0); ctx.shadowBlur = 0;
              ctx.fillStyle = g; ctx.fillText(c, 0, 0); ctx.restore();
            }
            x += widths[i] + gap;
          });
          // a kicker line under it
          if (T > 2.7) { ctx.globalAlpha = ease((T - 2.7) / 0.4); ctx.font = `600 ${Math.max(12, S0 * 0.026)}px system-ui, sans-serif`; ctx.fillStyle = '#e9ddff'; ctx.fillText('LIMITED-TIME EVENT  ·  ENDS ' + (e ? e.endLabel.toUpperCase() : ''), cx, ry + rs * 0.85); ctx.globalAlpha = 1; }
        }
        // the exclusive ball rises out of a rainbow portal
        if (T > 3.6) {
          const k = ease((T - 3.6) / 0.8), br = Math.min(S0 * 0.13, H * 0.1), by = H * 0.58 + (1 - k) * H * 0.2, gapY = Math.min(S0 * 0.06, H * 0.045);
          ctx.save(); ctx.translate(cx, by);
          for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(0, 0, br * 1.35, T * 1.6 + (i / 5) * Math.PI * 2, T * 1.6 + ((i + 1) / 5) * Math.PI * 2 - 0.1); ctx.strokeStyle = RB[i]; ctx.lineWidth = br * 0.12; ctx.lineCap = 'round'; ctx.globalAlpha = k; ctx.stroke(); }
          const gl = ctx.createRadialGradient(0, 0, br * 0.6, 0, 0, br * 2.1); gl.addColorStop(0, `rgba(255,255,255,${0.35 * k})`); gl.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, br * 2.1, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = k; ctx.rotate(Math.sin(T * 2) * 0.06);
          if (ballImg.complete) ctx.drawImage(ballImg, -br * 1.5, -br * 1.5, br * 3, br * 3);
          ctx.restore(); ctx.globalAlpha = 1;
          if (T > 4.3) {
            const k2 = ease((T - 4.3) / 0.4), ly = by + br * 1.75;
            ctx.globalAlpha = k2;
            word('EXCLUSIVE REWARD: BALL', cx, ly, Math.max(18, S0 * 0.05), '#ffffff');
            ctx.font = `800 ${Math.max(13, S0 * 0.03)}px system-ui, sans-serif`;
            const warn = 'Once this event ends, it will NEVER return.';
            const pulse = 0.75 + 0.25 * Math.sin(T * 5);
            ctx.fillStyle = `rgba(255,${Math.round(90 + 60 * pulse)},${Math.round(110 + 40 * pulse)},1)`; ctx.fillText(warn, cx, ly + gapY);
            ctx.globalAlpha = 1;
          }
          if (T > 5.4) { ctx.globalAlpha = ease((T - 5.4) / 0.5) * 0.85; ctx.font = `600 ${Math.max(12, S0 * 0.025)}px system-ui, sans-serif`; ctx.fillStyle = '#cfc6e6'; ctx.fillText('Complete the event quests to claim it.', cx, by + br * 1.75 + gapY * 1.9); ctx.globalAlpha = 1; }
        }
        ctx.restore();
        // letterbox bars + fade in/out
        const lb = H * 0.07 * ease(T / 0.4) * (1 - ease((T - DUR + 0.4) / 0.4));
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, lb); ctx.fillRect(0, H - lb, W, lb);
        const fin = Math.max(T < 0.3 ? 1 - T / 0.3 : 0, T > DUR - 0.35 ? (T - DUR + 0.35) / 0.35 : 0);
        if (fin > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fin)})`; ctx.fillRect(0, 0, W, H); }
        if (T >= DUR) { finish(); return; }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    },

    // ================================================================ battle pass
    // the running season, or null when there isn't one
    season() {
      const t = S.now(), s = SEASONS.find((x) => t >= +x.start && t < +x.end);
      return s ? Object.assign({ rewards: rewards(s.n) }, s) : null;
    },
    pass() {
      const m = BB.meta.data(), se = S.season(), n = se ? se.n : 0;
      if (!m.pass || m.pass.season !== n) m.pass = { season: n, xp: 0, elite: false, cf: [], ce: [], bonus: 0 };
      m.cosm = m.cosm || {};
      return m.pass;
    },
    tier(xp) { return Math.min(TIERS, Math.floor(xp / PER_TIER)); },
    bonusAvail(p) { return Math.max(0, Math.floor((p.xp - TIERS * PER_TIER) / BONUS_XP)) - p.bonus; },
    claimable(p) {
      p = p || S.pass(); const t = S.tier(p.xp), out = [];
      for (let k = 1; k <= t; k++) { if (!p.cf.includes(k)) out.push(['free', k]); if (p.elite && !p.ce.includes(k)) out.push(['elite', k]); }
      return out;
    },
    addXP(n, why, noWrite) {
      if (!(n > 0) || !BB.save.data || !S.season()) return;
      const p = S.pass(), before = S.tier(p.xp);
      p.xp += Math.round(n); if (!noWrite) BB.save.write();
      const after = S.tier(p.xp);
      S.popXP(Math.round(n), after > before ? after : 0);
      if (after > before) BB.audio.play('unlock');
      S.refreshStrip();
    },
    battleXP(sim) {
      const app = BB.app;
      if (app.event && app.event.spectate) return;
      let xp = S.XP.battle + Math.round(S.XP.battleMax * Math.min(1, sim.t / 100));
      if (app.event && (app.event.kind === 'cup' || app.event.kind === 'gauntlet')) xp += S.XP.mode;
      S.addXP(xp, 'Battle', true); // saved by afterBattle right after
    },
    // ---------------------------------------------------------------- rewards
    grant(r) {
      const sv = BB.save.data, m = BB.meta.data();
      if (r.t === 'coins') { sv.coins += r.n; return { t: 'coins', n: r.n }; }
      if (r.t === 'skin' || r.t === 'title') { m.cosm[r.t + ':' + r.id] = true; return { t: r.t, id: r.id }; }
      if (r.t === 'item') { sv.unlocked[r.id] = true; return { t: 'ball', id: r.id, label: 'SEASON EXCLUSIVE' }; }
      if (r.t === 'ball') {
        // roll the rarity (90 / 9 / 1), then a random ball of it you don't own. If you own every ball of
        // that rarity, the nearest rarity that still has one is used; own them all = coins instead.
        const own = (i) => i.cat !== 'hidden' && i.id !== 'dummy' && !limited(i) && !sv.unlocked[i.id];
        let x = Math.random(), want = 'legendary';
        for (const [rar, p] of ODDS) { if (x < p) { want = rar; break; } x -= p; }
        const order = [want, ...['rare', 'epic', 'legendary'].filter((q) => q !== want).sort((a, b) => Math.abs(RANK[a] - RANK[want]) - Math.abs(RANK[b] - RANK[want]))];
        for (const rar of order) {
          const pool = BB.ITEMS.filter((i) => own(i) && i.rarity === rar);
          if (!pool.length) continue;
          const it = pool[Math.floor(Math.random() * pool.length)];
          sv.unlocked[it.id] = true;
          return { t: 'ball', id: it.id };
        }
        const n = BB.RARITY.rare.price + 200; sv.coins += n; return { t: 'coins', n, note: 'Duplicate converted' };
      }
      return null;
    },
    claim(list) {
      if (!S.season()) return [];
      const p = S.pass(), R = S.season().rewards, got = [];
      for (const [track, k] of list) {
        if (track === 'free' ? p.cf.includes(k) : (!p.elite || p.ce.includes(k))) continue;
        if (k > S.tier(p.xp)) continue;
        (track === 'free' ? p.cf : p.ce).push(k);
        const g = S.grant(R[k - 1][track]); if (g) got.push(g);
      }
      BB.save.write(); BB.app.refreshCoins();
      if (got.length) { BB.audio.play(got.some((g) => g.t !== 'coins') ? 'unlock' : 'coin'); S.reveal(got); }
      BB.meta.refreshBadges();
      return got;
    },
    claimBonus() {
      const p = S.pass(), n = S.bonusAvail(p); if (n <= 0) return;
      p.bonus += n; BB.save.data.coins += n * BONUS_COINS; BB.save.write(); BB.app.refreshCoins(); BB.audio.play('coin');
      S.reveal([{ t: 'coins', n: n * BONUS_COINS }], 'Bonus rewards');
    },
    // a season ball can't be bought while its season runs; afterwards it's in the shop like any other
    seasonLocked(it) { const sd = it && it.seasonBall && SEASONS.find((x) => x.n === it.seasonBall); return !!sd && S.now() < +sd.end; },
    owns(key) { return !!(BB.meta.data().cosm || {})[key]; },
    titleHtml() {
      const m = BB.meta.data(); m.cosm = m.cosm || {};
      const best = m.cosm['title:s1e'] ? 's1e' : m.cosm['title:s1v'] ? 's1v' : null;
      return best ? `<div class="bp-title ${TITLES[best].cls}">${BB.ICON.star}${TITLES[best].name}</div>` : '';
    },

    // ---------------------------------------------------------------- reward visuals
    rewardHtml(r, big) {
      if (r.t === 'coins') return `<div class="rw-ic rw-coins${r.n >= 1000 ? ' lots' : ''}"><span class="coin-ic"></span><span class="coin-ic"></span><span class="coin-ic"></span></div><b>${r.n}</b>`;
      if (r.t === 'ball') return `<div class="rw-ic rw-orb r-${r.min}"><span>?</span></div><b>${BB.RARITY[r.min].name}+ Ball</b>`;
      if (r.t === 'item') return `<div class="rw-ic rw-item"><img src="${BB.icon(r.id)}" alt=""></div><b>${esc(BB.ITEM[r.id].name)}</b>`;
      if (r.t === 'skin') return `<div class="rw-ic rw-skin"><i class="sw sw-aurora"></i></div><b>Aurora Skin</b>`;
      if (r.t === 'title') return `<div class="rw-ic rw-title ${TITLES[r.id].cls}">${BB.ICON.star}</div><b>${big ? TITLES[r.id].name : 'Title'}</b>`;
      return '';
    },
    // full-screen "you got" card for anything claimed
    reveal(got, head) {
      document.querySelectorAll('.bp-reveal').forEach((x) => x.remove());
      const coins = got.filter((g) => g.t === 'coins').reduce((n, g) => n + g.n, 0), items = got.filter((g) => g.t !== 'coins');
      const card = (g) => {
        if (g.t === 'ball') { const it = BB.ITEM[g.id]; return `<div class="bpr-it r-${it.rarity}"><span class="bpr-tag">${g.label || 'NEW BALL'}</span><img src="${BB.icon(g.id, 128)}" alt=""><b>${esc(it.name)}</b><em style="color:${BB.RARITY[it.rarity].color}">${BB.RARITY[it.rarity].name}</em></div>`; }
        if (g.t === 'skin') return `<div class="bpr-it r-legendary"><span class="bpr-tag">SKIN</span><i class="sw sw-aurora bpr-sw"></i><b>Aurora</b><em>Usable on every ball</em></div>`;
        if (g.t === 'title') return `<div class="bpr-it r-epic"><span class="bpr-tag">TITLE</span><div class="bp-title ${TITLES[g.id].cls} bpr-ti">${BB.ICON.star}${TITLES[g.id].name}</div><em>Shown on your profile</em></div>`;
        return '';
      };
      const ov = el('div', 'bp-reveal', `<div class="bpr-rays"></div><div class="bpr-box"><div class="bpr-h">${esc(head || (items.length ? 'Rewards claimed!' : 'Coins claimed!'))}</div>
        <div class="bpr-items">${items.map(card).join('')}</div>${coins ? `<div class="bpr-coins">+${coins} ${'<span class="coin-ic"></span>'}</div>` : ''}<div class="bpr-tap">Tap to continue</div></div>`);
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('on'));
      const close = () => { ov.classList.remove('on'); setTimeout(() => ov.remove(), 250); };
      setTimeout(() => ov.addEventListener('pointerdown', close), 350);
    },
    // "+28 Season XP" pill after battles; a bigger flourish on tier up
    popXP(n, tierUp) {
      if (!document.body) return;
      let p = document.querySelector('.bp-pop');
      if (!p) { p = el('div', 'bp-pop'); document.body.appendChild(p); }
      const P = S.pass(), t = S.tier(P.xp), inT = t >= TIERS ? 1 : (P.xp - t * PER_TIER) / PER_TIER;
      p.className = 'bp-pop' + (tierUp ? ' up' : '');
      if (!S.season()) return;
      p.innerHTML = `<span class="bp-pop-h">S${S.season().n}</span><span>${tierUp ? 'TIER ' + tierUp + ' REACHED!' : '+' + n + ' Season XP'}</span><i><b style="width:${Math.round(inT * 100)}%"></b></i>`;
      void p.offsetWidth; p.classList.add('on');
      clearTimeout(S._popT); S._popT = setTimeout(() => p.classList.remove('on'), tierUp ? 3000 : 2200);
    },

    // ---------------------------------------------------------------- menu strip
    mountStrip() {
      if ($('bpStrip')) return;
      const s = el('button', 'bp-strip'); s.id = 'bpStrip';
      s.onclick = () => { BB.audio.unlock && BB.audio.unlock(); BB.audio.play('click'); S.openPass(); };
      const row = document.querySelector('.feat-row');
      if (row) row.after(s);
      S.refreshStrip();
      // portrait phones get a compact top-bar button instead (the strip would cost the arena its height)
      const pb = $('btnPass'); if (pb) pb.onclick = s.onclick;
      setInterval(S.refreshStrip, 60000);
    },
    refreshStrip() {
      const s = $('bpStrip'); if (!s || !BB.save.data) return;
      const se = S.season();
      document.documentElement.classList.toggle('no-season', !se);
      if (!se) return;
      const p = S.pass(), t = S.tier(p.xp), inT = t >= TIERS ? 100 : Math.round(((p.xp - t * PER_TIER) / PER_TIER) * 100);
      const ready = S.claimable(p).length + S.bonusAvail(p) > 0;
      // yellow "look here" dot: something to claim, or the pass not opened yet this season
      const hot = ready || BB.meta.data().passSeen !== se.n;
      const pb = $('btnPass'); if (pb) { pb.classList.toggle('hot', hot); pb.classList.toggle('elite', p.elite); pb.querySelector('b').textContent = t; pb.style.setProperty('--p', inT + '%'); }
      s.classList.toggle('ready', ready); s.classList.toggle('hot', hot); s.classList.toggle('elite', p.elite);
      s.innerHTML = `<span class="bps-hex"><b>${t}</b></span><span class="bps-txt"><b>Season ${se.n} Pass</b><em>${t >= TIERS ? 'Max tier' : 'Tier ' + t + ' · ' + inT + '%'}</em></span><span class="bps-bar"><i style="width:${t >= TIERS ? 100 : inT}%"></i></span><span class="bps-time">${BB.ICON.clock}${left(+se.end - S.now())}</span><span class="bp-hot"></span>`;
    },

    // ---------------------------------------------------------------- pass screen
    openPass() {
      if (!S.season()) { BB.ui.toast('No season is running right now. Check back soon!'); S.refreshStrip(); return; }
      const se = S.season(), p = S.pass(), R = se.rewards, t = S.tier(p.xp);
      if (BB.meta.data().passSeen !== se.n) { BB.meta.data().passSeen = se.n; BB.save.write(); S.refreshStrip(); }
      const inT = t >= TIERS ? PER_TIER : p.xp - t * PER_TIER;
      BB.ui.open((sheet) => {
        sheet.classList.add('bp-sheet');
        const body = BB.ui.head(sheet, 'Season Pass');
        body.appendChild(el('div', 'bp-hero' + (p.elite ? ' elite' : ''), `
          <div class="bp-badge"><svg viewBox="0 0 100 110"><path d="M50 4 94 29v52L50 106 6 81V29z"/></svg><b>${t}</b><span>TIER</span></div>
          <div class="bp-h-mid"><div class="bp-kick">SEASON ${se.n}</div><div class="bp-name">${esc(se.name.toUpperCase())}</div>
            <div class="bp-xp"><i style="width:${(inT / PER_TIER) * 100}%"></i><b>${t >= TIERS ? 'MAX TIER · ' + (p.xp - TIERS * PER_TIER) % BONUS_XP + ' / ' + BONUS_XP + ' to bonus' : inT + ' / ' + PER_TIER + ' XP'}</b></div>
            <div class="bp-meta"><span>${BB.ICON.clock}Ends in <b>${left(+se.end - S.now())}</b></span><span>${p.xp} XP total</span></div></div>`));
        // Elite card
        if (!p.elite) {
          const ec = el('div', 'bp-elite', `<div class="bpe-l"><div class="bpe-k">${BB.ICON.gem}ELITE PASS</div><div class="bpe-t">The premium track: more on every tier</div>
            <ul>${SEASON_BALL[se.n] ? `<li>Exclusive Legendary ball <b>${esc(BB.ITEM[SEASON_BALL[se.n]].name)}</b> at tier 30</li>` : ''}<li>Rare+ balls every 10 tiers + the <b>Season ${se.n} Elite</b> profile title</li><li><b>35% more coins</b> on every other tier</li><li>Unlocks every tier you've already reached</li></ul></div>`);
          const buy = el('button', 'btn primary bpe-buy', 'Unlock ' + coin(ELITE_COST));
          buy.disabled = BB.save.data.coins < ELITE_COST;
          if (buy.disabled) buy.title = 'Not enough coins';
          buy.onclick = () => {
            if (BB.save.data.coins < ELITE_COST || p.elite) return;
            BB.save.data.coins -= ELITE_COST; p.elite = true; BB.save.write(); BB.app.refreshCoins();
            BB.audio.play('unlock'); BB.sdk.happytime();
            BB.ui.onClose = null; BB.ui.close(); S.openPass(); BB.ui.toast('Elite Pass unlocked!');
          };
          const r = el('div', 'bpe-r'); r.appendChild(buy);
          if (buy.disabled) r.appendChild(el('span', 'bpe-need', 'You need ' + (ELITE_COST - BB.save.data.coins) + ' more coins'));
          ec.appendChild(r);
          body.appendChild(ec);
        }
        // the track: tier columns with Free (top) and Elite (bottom) rewards
        const wrap = el('div', 'bp-trackwrap');
        const labels = el('div', 'bp-labels', `<span class="bpl-t"></span><span class="bpl free">FREE</span><span class="bpl elite">${p.elite ? '' : BB.ICON.lock}ELITE</span>`);
        const track = el('div', 'bp-track');
        let html = '';
        for (let k = 1; k <= TIERS; k++) {
          const reached = k <= t, cur = k === t + 1, ms = k % 10 === 0;
          const cell = (track) => {
            const got = (track === 'free' ? p.cf : p.ce).includes(k);
            const lockedE = track === 'elite' && !p.elite;
            const can = reached && !got && !lockedE;
            const r = R[k - 1][track];
            return `<button class="bp-cell ${track}${got ? ' got' : ''}${can ? ' can' : ''}${!reached ? ' future' : ''}${lockedE ? ' elock' : ''}${ms ? ' ms' : ''}${r.t !== 'coins' ? ' rare' : ''}" data-k="${k}" data-tr="${track}" ${can ? '' : 'tabindex="-1"'}>
              ${S.rewardHtml(r)}${got ? `<span class="bpc-ok">${BB.ICON.check}</span>` : ''}${lockedE ? `<span class="bpc-lock">${BB.ICON.lock}</span>` : ''}${can ? '<span class="bpc-claim">CLAIM</span>' : ''}</button>`;
          };
          html += `<div class="bp-col${reached ? ' reached' : ''}${cur ? ' cur' : ''}${ms ? ' ms' : ''}" data-k="${k}"><div class="bp-tn"><span>${k}</span></div>${cell('free')}${cell('elite')}</div>`;
        }
        html += `<div class="bp-col bonus${t >= TIERS ? ' reached' : ''}"><div class="bp-tn"><span>+</span></div><button class="bp-cell free bonusc${S.bonusAvail(p) > 0 ? ' can' : ''}"><div class="rw-ic rw-coins"><span class="coin-ic"></span><span class="coin-ic"></span><span class="coin-ic"></span></div><b>${BONUS_COINS}</b>${S.bonusAvail(p) > 0 ? '<span class="bpc-claim">CLAIM ×' + S.bonusAvail(p) + '</span>' : ''}</button><div class="bp-cell elite bonus-note"><b>Bonus</b><small>every ${BONUS_XP} XP after tier ${TIERS}</small></div></div>`;
        const fill = Math.max(0, Math.min(TIERS, t + (t < TIERS ? inT / PER_TIER : 0)) - 1); // tier 1 sits at the rail's start
        track.innerHTML = `<div class="bp-rail"><i style="width:calc(${fill.toFixed(3)} * var(--col))"></i></div>` + html;
        wrap.append(labels, track);
        body.appendChild(wrap);
        track.querySelectorAll('.bp-cell.can').forEach((c) => c.onclick = () => {
          if (c.classList.contains('bonusc')) S.claimBonus(); else S.claim([[c.dataset.tr, +c.dataset.k]]);
          const x = track.scrollLeft; BB.ui.onClose = null; BB.ui.close(); S.openPass(); const nt = document.querySelector('.bp-track'); if (nt) nt.scrollLeft = x;
        });
        // tooltips for non-claimable cells: say what's inside and when
        track.querySelectorAll('.bp-cell:not(.can):not(.bonus-note)').forEach((c) => c.onclick = () => {
          const k = +c.dataset.k, tr = c.dataset.tr; if (!k) return;
          const r = R[k - 1][tr], what = r.t === 'coins' ? r.n + ' coins' : r.t === 'ball' ? 'a random ball you don\'t own (90% Rare, 9% Epic, 1% Legendary)' : r.t === 'item' ? BB.ITEM[r.id].name + ', a season-exclusive Legendary ball' : r.t === 'skin' ? 'the Aurora skin, usable on every ball' : TITLES[r.id].name + ' title';
          BB.ui.toast(c.classList.contains('got') ? 'Claimed: ' + what : c.classList.contains('elock') ? 'Elite reward: ' + what : 'Tier ' + k + ': ' + what, 2600);
        });
        // how to earn
        body.appendChild(el('div', 'bp-earn', `<div class="bp-earn-h">Earn Season XP</div><div class="bp-chips">
          <span><b>+${S.XP.battle}-${S.XP.battle + S.XP.battleMax}</b>Finish a battle</span><span><b>+${S.XP.mode}</b>Cup / Gauntlet bonus</span>
          ${BB.app.pvpAvailable() ? `<span><b>+${S.XP.pvp}</b>PvP match (+${S.XP.pvpWin} win)</span>` : ''}<span><b>+${S.XP.daily}</b>Daily quest</span>
          <span><b>+${S.XP.event}</b>Event quest</span><span><b>+${S.XP.gift}</b>Daily reward</span><span><b>+${S.XP.play}</b>Playtime reward</span></div>
          <div class="bp-fine">Season ${se.n} ends ${se.end.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}. Unclaimed rewards expire with the season.</div>`));
        // footer: claim all
        const foot = el('div', 'sh-foot bp-foot');
        const n = S.claimable(p).length + (S.bonusAvail(p) > 0 ? 1 : 0);
        const all = el('button', 'btn ' + (n ? 'primary' : ''), n ? 'Claim all (' + n + ')' : 'Nothing to claim yet');
        all.disabled = !n;
        all.onclick = () => { S.claim(S.claimable(p)); if (S.bonusAvail(p) > 0) S.claimBonus(); BB.ui.onClose = null; BB.ui.close(); S.openPass(); };
        foot.appendChild(all);
        sheet.appendChild(foot);
        // centre the track on the next tier to earn
        requestAnimationFrame(() => {
          const c = track.querySelector('.bp-col.cur') || track.querySelector('.bp-col.reached:last-of-type') || track.querySelector('.bp-col');
          if (c) track.scrollLeft = Math.max(0, c.offsetLeft - track.clientWidth / 2 + c.offsetWidth / 2);
        });
      }, { width: '760px', onClose: () => BB.meta.refreshBadges() });
    },

    // ---------------------------------------------------------------- wiring
    boot() {
      const M = BB.meta;
      // quests + events see every tracked stat
      const track = M.track;
      M.track = function (ev, val) { track.call(M, ev, val); S.track(ev, val); };
      // every finished battle feeds the pass
      const after = M.afterBattle;
      M.afterBattle = function (sim, w) { S.battleXP(sim, w); after.call(M, sim, w); };
      // aurora skin: owned through the pass, usable on every ball
      if (!M.SKINS.some((s) => s.id === 'aurora')) M.SKINS.push({ id: 'aurora', name: 'Aurora', lvl: 1, pass: 'skin:aurora' });
      const skinsFor = M.skinsFor;
      M.skinsFor = function (id) { return skinsFor.call(M, id).filter((s) => !s.pass || S.owns(s.pass)); };
      const skinOf = M.skinOf;
      M.skinOf = function (id) { const s = M.xpData().skin[id]; if (s === 'aurora') return S.owns('skin:aurora') ? 'aurora' : 'classic'; return skinOf.call(M, id); };
      // a login day counts toward "log in on 3 days"
      S.track('login', dayKey(new Date(S.now())));
      BB.save.write();
      S.mountStrip();
      M.refreshBadges();
      setInterval(() => M.refreshBadges(), 60000); // event start / end and season rollover show up without a reload
    },
  });
})();
