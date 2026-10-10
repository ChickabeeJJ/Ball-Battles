// Progression & engagement: Cup tournaments, Gauntlet runs, daily quests, daily gift, ball mastery.
// Everything here is opt-in from the menu; nothing pops up on its own.
(function () {
  const BB = window.BB;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const coin = (n) => '<span class="coin-ic"></span>' + n;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const STAR_AT = [3, 10, 25];
  const STAR_REWARD = [50, 120, 250];

  const QUEST_POOL = [
    { id: 'win3', text: 'Finish 3 battles', goal: 3, reward: 80, ev: 'done' },
    { id: 'play5', text: 'Play 5 battles', goal: 5, reward: 60, ev: 'play' },
    { id: 'dmg800', text: 'Deal 800 total damage', goal: 800, reward: 70, ev: 'damage' },
    { id: 'big3', text: 'Land 3 hits of 15+ damage', goal: 3, reward: 90, ev: 'bighit' },
    { id: 'maps3', text: 'Battle on 3 different maps', goal: 3, reward: 70, ev: 'map' },
    { id: 'special2', text: 'Have a special ball win 2 battles', goal: 2, reward: 90, ev: 'specialwin' },
    { id: 'team2', text: 'Complete 2 team or Free For All battles', goal: 2, reward: 80, ev: 'teamwin' },
    { id: 'cup1', text: 'Play a Cup match', goal: 1, reward: 100, ev: 'cupwin' },
    { id: 'gaunt3', text: 'Reach stage 3 in the Gauntlet', goal: 3, reward: 110, ev: 'gauntlet', max: true },
    { id: 'gaunt6', text: 'Reach stage 6 in the Gauntlet', goal: 6, reward: 200, ev: 'gauntlet', max: true },
    { id: 'ko5', text: 'Knock out 5 balls', goal: 5, reward: 80, ev: 'ko' },
    { id: 'flawless', text: 'Finish a 1v1 where the winner has 75%+ HP left', goal: 1, reward: 120, ev: 'flawless' },
    { id: 'clutch', text: 'Finish a 1v1 where the winner has under 15% HP left', goal: 1, reward: 130, ev: 'clutch' },
    { id: 'blitz', text: 'Finish a battle in under 20 seconds', goal: 1, reward: 100, ev: 'blitz' },
    { id: 'epic', text: 'Play a battle that lasts 90+ seconds', goal: 1, reward: 90, ev: 'epic' },
    { id: 'variety3', text: 'Have 3 different balls win a battle', goal: 3, reward: 110, ev: 'winball', uniq: true },
    { id: 'parry10', text: 'Clash weapons 10 times', goal: 10, reward: 70, ev: 'parry' },
    { id: 'ffa1', text: 'Complete a Free For All', goal: 1, reward: 100, ev: 'ffawin' },
    { id: 'level1', text: 'Level up any ball\'s mastery', goal: 1, reward: 90, ev: 'levelup' },
    { id: 'dodge5', text: 'Make Kami dodge 5 attacks', goal: 5, reward: 90, ev: 'kamidodge' },
    { id: 'pvp1', text: 'Play a PvP series', goal: 1, reward: 120, ev: 'pvpplay', pvp: true },
    { id: 'pvpwin', text: 'Win a PvP series', goal: 1, reward: 180, ev: 'pvpwin', pvp: true },
  ];

  const M = (BB.meta = {
    data() {
      const s = BB.save.data;
      s.meta = s.meta || {};
      const m = s.meta;
      m.mastery = m.mastery || {};
      m.trophies = m.trophies || 0;
      m.gauntletBest = m.gauntletBest || 0;
      m.gift = m.gift || { day: '', streak: 0 };
      if (m.questDay !== today() || !Array.isArray(m.quests)) {
        m.questDay = today();
        const pvpOk = !!(BB.app && BB.app.pvpAvailable && BB.app.pvpAvailable());
        const pool = QUEST_POOL.filter((q) => !q.pvp || pvpOk);
        const r = BB.RNG(Date.now() & 0xffff);
        m.quests = [];
        while (m.quests.length < 3) { const q = pool.splice(Math.floor(r() * pool.length), 1)[0]; m.quests.push({ id: q.id, p: 0, claimed: false, maps: [] }); }
      }
      return m;
    },

    // ------------------------------------------------------------- tracking
    track(ev, val) {
      const m = M.data();
      for (const q of m.quests) {
        const def = QUEST_POOL.find((x) => x.id === q.id);
        if (!def || q.claimed || def.ev !== ev) continue;
        if (ev === 'map' || def.uniq) { q.maps = q.maps || []; if (!q.maps.includes(val)) { q.maps.push(val); q.p = q.maps.length; } }
        else if (def.max) q.p = Math.max(q.p, val);
        else q.p += val || 1;
        q.p = Math.min(q.p, def.goal);
      }
      M.refreshBadges();
    },

    afterBattle(sim, w) {
      const app = BB.app, mode = app.mode();
      if (app.event && app.event.spectate) return;
      M.track('play', 1);
      M.track('map', sim.map.id);
      const side = (app.event && app.event.mySide) || 0;
      const mine = sim.balls.filter((b) => b.main && b.team === side && !b.owner);
      // Quests are about finishing battles, not beating someone: in sandbox modes and the Cup
      // whichever ball wins counts (both sides are yours); in Gauntlet / PvP only your own does.
      const anyW = !app.event || app.event.kind === 'cup';
      const sandbox = !app.pvp && !app.event;
      if (w >= 0 || sandbox) M.track('done', 1);
      if (sandbox && (mode.teams[0].length > 1 || mode.teams.length > 2)) M.track('teamwin', 1);
      if (sandbox && mode.teams.length > 2) M.track('ffawin', 1);
      if (w >= 0 && (anyW || w === side)) {
        if (w === side) M.track('win', 1);
        const winners = sim.balls.filter((b) => b.main && !b.owner && b.team === w);
        if (winners.some((b) => b.def.cat === 'special')) M.track('specialwin', 1);
        if (sim.t < 20) M.track('blitz', 1);
        for (const b of winners) M.track('winball', b.def.id);
        if (winners.length === 1 && sim.balls.filter((b) => b.main && !b.owner).length === 2 && !winners[0].def.fixedHp && winners[0].alive) {
          const k = winners[0].hp / winners[0].maxHp;
          if (k >= 0.75) M.track('flawless', 1);
          if (k < 0.15) M.track('clutch', 1);
        }
      }
      if (sim.t >= 90) M.track('epic', 1);
      const kos = sim.balls.filter((b) => b.main && !b.owner && !b.alive && (anyW || b.team !== side)).length;
      if (kos) M.track('ko', kos);
      // Mastery XP goes only to the winning side (nobody on a draw). In sandbox battles and the Cup
      // both sides are yours, so whichever team wins earns it; in PvP / Gauntlet the other side is an
      // opponent, so only your own winning ball does.
      M.lastXP = [];
      const anySide = !app.event || app.event.kind === 'cup', mySide = (app.event && app.event.mySide) || 0;
      const seen = {};
      for (const b of sim.balls) {
        if (w < 0 || !b.main || b.owner || b.team !== w || (!anySide && b.team !== mySide)) continue;
        const id = b.def.id;
        if (!BB.ITEM[id] || BB.ITEM[id].cat === 'hidden' || !app.isOwned(id)) continue;
        const xp = M.matchReward(sim, 150);
        seen[id] = (seen[id] || 0) + xp;
      }
      for (const id in seen) M.lastXP.push(M.addXP(id, seen[id]));
      BB.save.write();
    },

    // Coins and XP both scale linearly with match length: the full amount at REWARD_T seconds or longer.
    REWARD_T: 100,
    matchReward(sim, max) { return Math.max(1, Math.round(max * Math.min(1, sim.t / M.REWARD_T))); },

    // ------------------------------------------------------------- mastery (per-ball XP, 10 levels, skins)
    MXP: [0, 60, 150, 280, 450, 670, 950, 1300, 1720, 2200],
    // Kami alone has 20 levels: 1-10 as usual, 11-20 are a long grind (coins each level, Tenshi at 20)
    MXP_KAMI: [0, 60, 150, 280, 450, 670, 950, 1300, 1720, 2200, 3500, 5500, 8000, 11500, 16000, 22000, 30000, 40000, 52000, 66000],
    table(id) { return id === 'kami' ? M.MXP_KAMI : M.MXP; },
    maxL(id) { return M.table(id).length; },
    skinsFor(id) { return M.SKINS.filter((s) => !s.only || s.only === id); },
    SKINS: [
      { id: 'classic', name: 'Classic', lvl: 1 },
      { id: 'shadow', name: 'Shadow', lvl: 4 },
      { id: 'neon', name: 'Neon', lvl: 6 },
      { id: 'gold', name: 'Gold', lvl: 10 },
      { id: 'tenshi', name: 'Tenshi', lvl: 20, only: 'kami' },
    ],
    xpData() {
      const m = M.data();
      if (!m.mxp) {
        // migrate the old win-count mastery into XP
        m.mxp = {};
        for (const id in m.mastery) m.mxp[id] = (m.mastery[id] || 0) * 40;
      }
      m.skin = m.skin || {};
      return m;
    },
    xp(id) { return M.xpData().mxp[id] || 0; },
    level(id) { const x = M.xp(id), t = M.table(id); let l = 1; for (let k = 1; k < t.length; k++) if (x >= t[k]) l = k + 1; return l; },
    levelProgress(id) {
      const l = M.level(id), x = M.xp(id);
      if (l >= M.maxL(id)) return { l, cur: 1, need: 1, pct: 100 };
      const t = M.table(id), a = t[l - 1], b = t[l];
      return { l, cur: x - a, need: b - a, pct: Math.round(((x - a) / (b - a)) * 100) };
    },
    nextReward(id) {
      const l = M.level(id);
      const sk = M.skinsFor(id).find((s) => s.lvl > l);
      return sk ? sk.name + ' skin at Lv ' + sk.lvl : 'Fully mastered!';
    },
    addXP(id, amount) {
      const m = M.xpData();
      const before = M.level(id);
      m.mxp[id] = (m.mxp[id] || 0) + amount;
      const after = M.level(id);
      let coinsWon = 0;
      const skins = [];
      for (let l = before + 1; l <= after; l++) {
        coinsWon += 40 * l;
        const sk = M.skinsFor(id).find((s) => s.lvl === l);
        if (sk) skins.push(sk.name);
      }
      if (after > before) M.track('levelup', 1);
      if (coinsWon) {
        BB.save.data.coins += coinsWon;
        if (after === M.maxL(id) || after === 10) BB.sdk.happytime();
      }
      return { id, xp: amount, from: before, to: after, coins: coinsWon, skins };
    },
    // legacy hooks (Cup champion, star counts)
    addMastery(id) { M.addXP(id, 40); },
    stars(id) { const l = M.level(id); return l >= 10 ? 3 : l >= 6 ? 2 : l >= 3 ? 1 : 0; },
    // levels only show in the ball's detail panel (mastery block), never on tiles or slot names
    starHtml() { return ''; },
    skinOf(id) { const m = M.xpData(); const s = m.skin[id]; return s && M.level(id) >= (M.SKINS.find((k) => k.id === s) || { lvl: 99 }).lvl ? s : 'classic'; },
    setSkin(id, sk) { M.xpData().skin[id] = sk; BB.save.write(); },

    masteryBlock(id) {
      const p = M.levelProgress(id), cur = M.skinOf(id);
      const skins = M.skinsFor(id).map((s) => {
        const ok = p.l >= s.lvl;
        return `<button class="skin${s.id === cur ? ' on' : ''}${ok ? '' : ' locked'}" data-skin="${s.id}" ${ok ? '' : 'disabled'}><i class="sw sw-${s.id}"></i><span>${s.name}</span>${ok ? '' : `<b>Lv${s.lvl}</b>`}</button>`;
      }).join('');
      return `<div class="mastery"><div class="m-top"><span class="mlv big${p.l >= M.maxL(id) ? ' max' : ''}">Lv${p.l}</span><div class="m-bar"><i style="width:${p.pct}%"></i><b>${p.l >= M.maxL(id) ? 'MASTERED' : p.cur + ' / ' + p.need + ' XP'}</b></div></div>
        <div class="m-next">${esc(M.nextReward(id))}</div><div class="skins">${skins}</div></div>`;
    },
    bindSkins(root, id, onChange) {
      root.querySelectorAll('.skin').forEach((b) => b.onclick = () => {
        if (b.disabled) return;
        BB.audio.play('click'); M.setSkin(id, b.dataset.skin);
        root.querySelectorAll('.skin').forEach((x) => x.classList.toggle('on', x === b));
        if (onChange) onChange();
      });
    },

    openMastery() {
      const owned = BB.ITEMS.filter((i) => i.cat !== 'hidden' && BB.save.data.unlocked[i.id]);
      owned.sort((a, b) => M.xp(b.id) - M.xp(a.id));
      const total = owned.reduce((n, i) => n + M.level(i.id), 0);
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Ball Mastery');
        body.innerHTML += `<div class="f-s">Balls earn XP when they win for you: the longer the battle, the more XP (up to 150 at 100s+). Level up for coins and new skins.</div>
          <div class="q-stats"><div><b>${total}</b><span>Total levels</span></div><div><b>${owned.filter((i) => M.level(i.id) >= 10).length}</b><span>Mastered</span></div><div><b>${owned.filter((i) => M.level(i.id) >= 4).length}</b><span>Skins unlocked</span></div><div><b>${owned.length}</b><span>Balls owned</span></div></div>`;
        const list = document.createElement('div'); list.className = 'm-list';
        for (const it of owned) {
          const p = M.levelProgress(it.id);
          const row = document.createElement('button'); row.className = 'm-row';
          row.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><div class="m-mid"><div class="m-name">${esc(it.name)}</div><div class="m-bar sm"><i style="width:${p.pct}%"></i></div></div><span class="mlv${p.l >= 10 ? ' max' : ''}">Lv${p.l}</span>`;
          row.onclick = () => { BB.audio.play('click'); M.openBallMastery(it.id); };
          list.appendChild(row);
        }
        body.appendChild(list);
      }, { width: '520px' });
    },
    openBallMastery(id) {
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, BB.ITEM[id].name + ' Mastery', { onX: () => M.openMastery() });
        body.innerHTML += `<div class="m-hero"><canvas class="m-prev" width="200" height="200"></canvas></div>` + M.masteryBlock(id);
        const draw = () => M.drawSkinPreview(body.querySelector('.m-prev'), id);
        M.bindSkins(body, id, draw);
        requestAnimationFrame(draw);
        // reward track: one card per level, coins + any skin it unlocks
        const lvNow = M.level(id);
        body.insertAdjacentHTML('beforeend', `<div class="section-t">Level rewards</div><div class="m-track${M.maxL(id) > 10 ? ' long' : ''}">${M.table(id).slice(1).map((_, k) => {
          const lv = k + 2, sk = M.skinsFor(id).find((x) => x.lvl === lv), st = lv <= lvNow ? 'got' : lv === lvNow + 1 ? 'next' : '';
          return `<div class="mt ${st}${lv > 10 ? ' hard' : ''}${sk && sk.only ? ' legend' : ''}"><em>Lv${lv}</em>${sk ? `<i class="sw sw-${sk.id}"></i><small>${sk.name}</small>` : '<i class="mt-coin"></i>'}<span>+${40 * lv}</span></div>`;
        }).join('')}</div>`);
      }, { width: '440px' });
    },
    drawSkinPreview(cv, id) {
      if (!cv) return;
      const sim = new BB.Sim({ seed: 1, map: 'classic', settings: { dmgNumbers: false }, teams: [[{ id, hp: 100, slot: 0 }], [{ id: 'dummy', hp: 100, slot: 1 }]] });
      const b = sim.balls[0]; b.x = 0; b.y = 0; b.w.angle = -0.8; sim.computeCaps(b);
      if (id === 'kami' && M.skinOf(id) === 'tenshi') { b.tenshi = true; b.ascended = true; sim.t = 1.2; }
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 200, 200);
      const reach = b.r + (b.w.len || 0) + 20, k = 90 / reach;
      ctx.setTransform(k, 0, 0, k, 100, 100);
      BB.drawBallArt(ctx, sim, b, 2.4, { dark: false });
    },

    refreshBadges() {
      if (!BB.save.data) return;
      const m = M.data();
      const claimable = m.quests.some((q) => !q.claimed && q.p >= QUEST_POOL.find((x) => x.id === q.id).goal);
      const ev = BB.season && BB.season.event();
      const qb = $('btnQuests'); if (qb) { qb.classList.toggle('ready', claimable || !!(BB.season && BB.season.eventReady())); qb.classList.toggle('has-ev', !!ev); }
      if (BB.season) BB.season.refreshStrip();
      const gb = $('btnGift'); if (gb) gb.classList.toggle('ready', m.gift.day !== today() || M.playReady().length > 0);
    },

    // ------------------------------------------------------------- playtime rewards
    // Time spent in the game today (tab visible) unlocks coin milestones, up to 30 minutes.
    PLAYTIME: [[1, 50], [3, 75], [5, 100], [10, 500], [15, 250], [20, 350], [30, 3000]],
    playData() {
      const m = M.data();
      if (!m.play || m.play.day !== today()) m.play = { day: today(), secs: 0, got: [] };
      return m.play;
    },
    playReady() { const p = M.playData(); return M.PLAYTIME.map((x, i) => i).filter((i) => !p.got.includes(i) && p.secs >= M.PLAYTIME[i][0] * 60); },
    playTick() {
      if (!BB.save.data || document.hidden) return;
      const p = M.playData(), before = M.playReady().length;
      p.secs = Math.min(86400, p.secs + 1);
      if (p.secs % 15 === 0) BB.save.write();
      if (M.playReady().length !== before) M.refreshBadges();
    },
    fmtTime(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); },

    // ------------------------------------------------------------- rewards (daily + playtime)
    // Rewards screen, two tabs. Daily: a 7-day track; missing a day resets the streak.
    claimGift(tab) {
      tab = tab || (M.data().gift.day === today() && M.playReady().length ? 'play' : 'daily');
      if (tab === 'play') return M.openPlaytime();
      const m = M.data();
      const REWARDS = [50, 75, 100, 150, 200, 250, 500];
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yesterday = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      const claimedToday = m.gift.day === today();
      const keep = claimedToday || m.gift.day === yesterday;
      const streak = keep ? m.gift.streak : 0;          // days already claimed in this run
      const dayIdx = claimedToday ? (streak - 1) % 7 : streak % 7; // today's slot on the track
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Rewards');
        M.rewardTabs(body, 'daily');
        const hasKing = BB.app.isOwned('king') && !BB.app.trials.king;
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: claimedToday ? 'Come back tomorrow for the next reward!' : hasKing ? 'Log in every day. Day 7 is a big one!' : 'Log in 7 days in a row to unlock the legendary King!' }));
        const btn = document.createElement('button'); // declared first: the highlighted day also claims
        const track = document.createElement('div');
        track.className = 'daily';
        REWARDS.forEach((r, k) => {
          const done = k < dayIdx || (claimedToday && k === dayIdx);
          const now = k === dayIdx && !claimedToday;
          const d = document.createElement('div');
          d.className = 'day' + (done ? ' done' : '') + (now ? ' now' : '') + (k === 6 ? ' big' : '');
          // Day 7 gives the King (daily-reward exclusive) until you own it, then 500 coins
          const king = k === 6 && !hasKing;
          d.innerHTML = king
            ? `<div class="day-n">Day 7</div><div class="day-ic king">${done ? BB.ICON.star : `<img src="${BB.icon('king', 64)}" alt="">`}</div><div class="day-r">KING</div>`
            : `<div class="day-n">Day ${k + 1}</div><div class="day-ic">${done ? BB.ICON.star : '<span class="coin-ic"></span>'}</div><div class="day-r">${r}</div>`;
          if (now) { d.style.cursor = 'pointer'; d.onclick = () => btn.click(); }
          track.appendChild(d);
        });
        body.appendChild(track);
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        btn.className = 'btn ' + (claimedToday ? '' : 'primary');
        const kingDay = dayIdx === 6 && !hasKing;
        btn.innerHTML = claimedToday ? 'Claimed today' : kingDay ? 'Claim the King!' : 'Claim ' + coin(REWARDS[dayIdx]);
        btn.disabled = claimedToday;
        btn.onclick = () => {
          const amt = REWARDS[dayIdx];
          m.gift.streak = streak + 1; m.gift.day = today();
          if (kingDay) { if (BB.season) BB.season.addXP(BB.season.XP.gift, 'Daily reward'); BB.save.data.unlocked.king = true; BB.save.write(); BB.audio.play('unlock'); BB.sdk.happytime(); M.claimGift('daily'); BB.ui.toast('The King is yours!'); BB.app.refreshMenu(); return; }
          BB.save.data.coins += amt; BB.save.write();
          BB.app.refreshCoins(); BB.audio.play('coin');
          if (BB.season) BB.season.addXP(BB.season.XP.gift, 'Daily reward');
          if (dayIdx === 6) BB.sdk.happytime();
          M.claimGift('daily');
          BB.ui.toast('+' + amt + ' coins!');
        };
        foot.appendChild(btn); M.playFoot(foot); sheet.appendChild(foot);
      }, { width: '520px', onClose: () => M.refreshBadges() });
    },
    rewardTabs(body, on) {
      const tabs = document.createElement('div'); tabs.className = 'tabs rw-tabs';
      for (const [k, n] of [['daily', 'Daily Rewards'], ['play', 'Playtime Rewards']]) {
        const t = document.createElement('button'); t.className = 'tab' + (k === on ? ' on' : '');
        const dot = k === 'play' ? M.playReady().length : M.data().gift.day !== today();
        t.innerHTML = n + (dot && k !== on ? '<i class="rw-dot"></i>' : '');
        t.onclick = () => { if (k === on) return; BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); M.claimGift(k); };
        tabs.appendChild(t);
      }
      body.appendChild(tabs);
    },
    // small live "Playtime: m:ss" line at the bottom of the rewards screen
    playFoot(foot) {
      const pt = document.createElement('div'); pt.className = 'rw-time';
      const upd = () => { pt.innerHTML = 'Playtime today: <b>' + M.fmtTime(M.playData().secs) + '</b>'; };
      upd();
      const iv = setInterval(() => (pt.isConnected ? upd() : clearInterval(iv)), 1000);
      foot.classList.add('rw-foot'); foot.appendChild(pt);
    },
    openPlaytime() {
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Rewards');
        M.rewardTabs(body, 'play');
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: 'Play today to unlock coins. Resets every day.' }));
        const list = document.createElement('div'); list.className = 'daily pt-track'; body.appendChild(list);
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        const btn = document.createElement('button'); btn.className = 'btn';
        const claim = () => {
          const ready = M.playReady(); if (!ready.length) return;
          const p = M.playData(); let amt = 0;
          for (const i of ready) { p.got.push(i); amt += M.PLAYTIME[i][1]; }
          if (BB.season) BB.season.addXP(BB.season.XP.play * ready.length, 'Playtime reward');
          BB.save.data.coins += amt; BB.save.write(); BB.app.refreshCoins();
          BB.audio.play('coin'); if (ready.includes(M.PLAYTIME.length - 1)) BB.sdk.happytime();
          BB.ui.toast('+' + amt + ' coins!'); render(); M.refreshBadges();
        };
        btn.onclick = claim;
        let sig = '';
        const render = () => {
          const p = M.playData(), ready = M.playReady(), s = JSON.stringify([ready, p.got, Math.floor(p.secs / 10)]);
          if (s === sig) return; sig = s;
          list.innerHTML = '';
          M.PLAYTIME.forEach(([min, c], i) => {
            const got = p.got.includes(i), now = ready.includes(i), big = i === M.PLAYTIME.length - 1;
            const d = document.createElement('div');
            d.className = 'day' + (got ? ' done' : '') + (now ? ' now' : '') + (big ? ' big' : '') + (min === 10 ? ' pt-hot' : '');
            const pct = Math.min(100, (p.secs / (min * 60)) * 100);
            d.innerHTML = `<div class="day-n">${min} min</div><div class="day-ic">${got ? BB.ICON.star : '<span class="coin-ic"></span>'}</div><div class="day-r">${c}</div>${!got && !now ? `<div class="pt-bar"><i style="width:${pct}%"></i></div>` : ''}`;
            if (now) { d.style.cursor = 'pointer'; d.onclick = claim; }
            list.appendChild(d);
          });
          const amt = ready.reduce((n, i) => n + M.PLAYTIME[i][1], 0);
          btn.className = 'btn' + (amt ? ' primary' : '');
          btn.disabled = !amt;
          const next = M.PLAYTIME.find(([min], i) => !p.got.includes(i) && p.secs < min * 60);
          btn.innerHTML = amt ? 'Claim ' + coin(amt) : next ? 'Next reward in ' + M.fmtTime(next[0] * 60 - p.secs) : 'All claimed today!';
        };
        render();
        const iv = setInterval(() => {
          if (!list.isConnected) { clearInterval(iv); return; }
          render();
          const p = M.playData(), next = M.PLAYTIME.find(([min], i) => !p.got.includes(i) && p.secs < min * 60);
          if (btn.disabled && next) btn.innerHTML = 'Next reward in ' + M.fmtTime(next[0] * 60 - p.secs);
        }, 1000);
        foot.appendChild(btn); M.playFoot(foot); sheet.appendChild(foot);
      }, { width: '520px', onClose: () => M.refreshBadges() });
    },

    // ------------------------------------------------------------- profile (CrazyGames account)
    async openProfile() {
      const user = await BB.sdk.getUser();
      const m = M.data(), pv = M.pvpData(), st = BB.save.data.stats;
      const all = BB.ITEMS.filter((i) => i.cat !== 'hidden');
      const ownedL = all.filter((i) => BB.app.isOwned(i.id));
      const levels = ownedL.reduce((n, i) => n + M.level(i.id), 0), mastered = ownedL.filter((i) => M.level(i.id) >= 10).length;
      // Battles: non-competitive totals only (lots of players just test builds); PvP keeps its own record
      const skinsN = ownedL.reduce((n, i) => n + M.skinsFor(i.id).filter((sk) => sk.lvl > 1 && M.level(i.id) >= sk.lvl).length, 0);
      const pvpN = pv.w + pv.d + pv.l, winRate = pvpN ? Math.round((pv.w / pvpN) * 100) : 0; // PvP series only
      const top = ownedL.filter((i) => M.xp(i.id) > 0).sort((a, b) => M.xp(b.id) - M.xp(a.id)).slice(0, 3);
      const k = M.rankOf(pv.rating), next = M.RANKS[k + 1], lo = M.RANKS[k][0];
      const rpct = next ? Math.max(0, Math.min(100, ((pv.rating - lo) / (next[0] - lo)) * 100)) : 100;
      const fav = top[0] ? top[0].id : (BB.save.data.setup.slots[0] || {}).id || 'sword';
      BB.ui.open((sheet) => {
        sheet.classList.add('pf-sheet');
        const body = BB.ui.head(sheet, 'Profile');
        const name = user ? esc(user.username) : 'Guest';
        const pic = user && user.profilePictureUrl ? `<img class="pf-pic" src="${esc(user.profilePictureUrl)}" alt="">` : `<img class="pf-pic pf-ball" src="${BB.icon(fav, 128)}" alt="">`;
        const stat = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;
        body.innerHTML += `<div class="pf-hero" style="--rc:${M.RANKS[k][2]}">
            ${pic}
            <div class="pf-id"><div class="pf-name">${name}</div>${BB.season ? BB.season.titleHtml() : ''}
              <div class="pf-rankrow">${M.rankHtml(pv.rating)}<b>${pv.rating}</b></div>
              <div class="pvp-rankbar"><i style="width:${rpct}%"></i></div>
              <div class="pf-next">${next ? (next[0] - pv.rating) + ' rating to ' + next[1] : 'Top rank reached'}</div></div>
          </div>
          <div class="pf-sec"><div class="pf-h">Battles</div><div class="pf-grid">${stat(st.battles, 'Played')}${stat(m.cupsPlayed || 0, 'Tournaments played')}${stat(m.gauntletsPlayed || 0, 'Gauntlets played')}${stat(skinsN, 'Skins unlocked')}</div></div>
          <div class="pf-sec"><div class="pf-h">PvP Arena</div><div class="pf-grid">${stat(pv.w, 'Won')}${stat(pv.d, 'Drawn')}${stat(pv.l, 'Lost')}${stat(pvpN ? winRate + '%' : '-', 'Win rate')}</div></div>
          <div class="pf-sec"><div class="pf-h">Collection</div>
            <div class="pf-coll"><span>${ownedL.length} / ${all.length} balls</span><div class="m-bar sm"><i style="width:${(ownedL.length / all.length) * 100}%"></i></div></div>
            <div class="pf-grid">${stat(levels, 'Mastery levels')}${stat(mastered, 'Mastered')}${stat(m.gauntletBest, 'Best Gauntlet')}${stat(m.gift.streak || 0, 'Login streak')}</div></div>
          ${top.length ? `<div class="pf-sec"><div class="pf-h">Top balls</div><div class="pf-top">${top.map((i, n) => { const lp = M.levelProgress(i.id); return `<div class="pf-tb"><em>#${n + 1}</em><img src="${BB.icon(i.id)}" alt=""><div class="m-mid"><div class="m-name">${esc(i.name)}</div><div class="m-bar sm"><i style="width:${lp.pct}%"></i></div></div><span class="mlv${lp.l >= 10 ? ' max' : ''}">Lv${lp.l}</span></div>`; }).join('')}</div></div>` : ''}`;
        if (BB.season) BB.season.bindTitle(body);
        const row = document.createElement('div'); row.className = 'pf-btns';
        const mb = document.createElement('button'); mb.className = 'btn primary'; mb.innerHTML = BB.ICON.star + ' Ball Mastery';
        mb.onclick = () => { BB.audio.play('click'); M.openMastery(); };
        row.appendChild(mb);
        if (BB.app.pvpAvailable()) {
          const pb = document.createElement('button'); pb.className = 'btn blue'; pb.innerHTML = BB.ICON.swords + ' PvP Arena';
          pb.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); M.openPvp(); };
          row.appendChild(pb);
        }
        body.appendChild(row);
        if (!user) {
          const li = document.createElement('button'); li.className = 'btn green pf-login'; li.textContent = 'Log in to CrazyGames to keep your progress';
          li.onclick = async () => { const u = await BB.sdk.login(); if (u) { BB.ui.onClose = null; BB.ui.close(); M.openProfile(); } };
          body.appendChild(li);
        }
      }, { width: '500px' });
    },

    // ------------------------------------------------------------- quests
    // Quests screen, two tabs: Daily (3 new quests a day) and Event (limited-time event quests).
    openQuests(tab) {
      const m = M.data(), S = BB.season;
      // first visit during an event: the intro cinematic plays, then the Event tab opens
      if (S && S.needsIntro()) { S.playIntro(() => M.openQuests('event')); return; }
      tab = tab || 'daily';
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Quests');
        const tabs = document.createElement('div'); tabs.className = 'tabs rw-tabs';
        for (const [k, n] of [['daily', 'Daily'], ['event', 'Event']]) {
          const t = document.createElement('button'); t.className = 'tab' + (k === tab ? ' on' : '') + (k === 'event' && S && S.event() ? ' ev-tab' : '');
          const dot = k === 'event' ? S && S.eventReady() : M.dailyReady();
          t.innerHTML = n + (k === 'event' && S && S.event() ? ' <i class="ev-live">LIVE</i>' : '') + (dot && k !== tab ? '<i class="rw-dot"></i>' : '');
          t.onclick = () => { if (k === tab) return; BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); M.openQuests(k); };
          tabs.appendChild(t);
        }
        body.appendChild(tabs);
        if (tab === 'event') { S.renderEvent(body, sheet); return; }
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: 'New quests every day. Progress counts in every mode.' }));
        for (const q of m.quests) {
          const def = QUEST_POOL.find((x) => x.id === q.id);
          const done = q.p >= def.goal;
          const row = document.createElement('div');
          row.className = 'quest' + (q.claimed ? ' claimed' : '');
          row.innerHTML = `<div class="q-main"><div class="q-t">${esc(def.text)}</div>
            <div class="q-bar"><i style="width:${(q.p / def.goal) * 100}%"></i><b>${Math.floor(q.p)} / ${def.goal}</b></div></div>`;
          const btn = document.createElement('button');
          btn.className = 'btn ' + (q.claimed ? '' : done ? 'green' : '');
          btn.innerHTML = q.claimed ? 'Done' : coin(def.reward);
          btn.disabled = q.claimed || !done;
          btn.onclick = () => {
            q.claimed = true; BB.save.data.coins += def.reward; BB.save.write();
            BB.audio.play('coin'); BB.app.refreshCoins();
            M.track('dailyq', 1); if (S) S.addXP(S.XP.daily, 'Daily quest');
            BB.ui.onClose = null; BB.ui.close(); M.openQuests('daily');
          };
          row.appendChild(btn);
          body.appendChild(row);
        }
        const st = document.createElement('div');
        st.className = 'q-stats';
        const owned = BB.ITEMS.filter((i) => BB.save.data.unlocked[i.id]).length;
        st.innerHTML = `<div><b>${owned}/${BB.ITEMS.length}</b><span>Balls</span></div><div><b>${m.trophies}</b><span>Cup trophies</span></div><div><b>${m.gauntletBest}</b><span>Best Gauntlet</span></div><div><b>${BB.save.data.stats.wins}</b><span>Wins</span></div>`;
        body.appendChild(st);
        const mb = document.createElement('button'); mb.className = 'btn primary'; mb.innerHTML = BB.ICON.star + ' Ball Mastery';
        mb.onclick = () => { BB.audio.play('click'); M.openMastery(); };
        body.appendChild(mb);
      }, { width: '520px', onClose: () => M.refreshBadges() });
    },
    dailyReady() { return M.data().quests.some((q) => !q.claimed && q.p >= (QUEST_POOL.find((x) => x.id === q.id) || { goal: 1e9 }).goal); },

    // ------------------------------------------------------------- ball picker for events
    pickBall(title, sub, onPick) {
      let sel = BB.save.data.setup.slots[0].id;
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, title);
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: sub }));
        const grid = document.createElement('div');
        grid.className = 'grid';
        for (const it of BB.ITEMS.filter((i) => i.cat !== 'hidden' && BB.app.isOwned(i.id))) {
          const t = document.createElement('button');
          t.className = 'tile' + (it.id === sel ? ' sel' : '');
          t.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><span class="t-n">${esc(it.name)}</span>${M.starHtml(it.id)}<span class="rar" style="background:${BB.RARITY[it.rarity].color}"></span>`;
          t.onclick = () => { BB.audio.play('click'); sel = it.id; grid.querySelectorAll('.tile').forEach((x) => x.classList.toggle('sel', x === t)); };
          grid.appendChild(t);
        }
        body.appendChild(grid);
        const foot = document.createElement('div');
        foot.className = 'sh-foot';
        const go = document.createElement('button');
        go.className = 'btn green'; go.textContent = 'Enter';
        go.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); onPick(sel); };
        foot.appendChild(go);
        sheet.appendChild(foot);
      }, { width: '560px' });
    },

    randomFoes(n, exclude, rng) {
      const pool = BB.ITEMS.filter((i) => i.cat !== 'hidden' && i.id !== 'dummy' && i.rarity !== 'iridescent' && i.id !== exclude);
      const out = [];
      while (out.length < n) { const it = pool[Math.floor(rng() * pool.length)]; if (!out.includes(it.id)) out.push(it.id); }
      return out;
    },

    // ------------------------------------------------------------- Cup (8-ball bracket of your picks)
    // Pick 8 of your balls; they fight a knockout bracket. Watch each match or sim the rest.
    openCup() {
      M.pickN(8, 'Ball Cup', 'Pick 8 of your balls. They fight a knockout bracket until one champion is left!', (ids) => {
        const rng = BB.RNG((Math.random() * 1e9) | 0);
        for (let k = ids.length - 1; k > 0; k--) { const r = Math.floor(rng() * (k + 1)); [ids[k], ids[r]] = [ids[r], ids[k]]; }
        M.data().cupsPlayed = (M.data().cupsPlayed || 0) + 1; BB.save.write();
        M.cup = { rounds: [ids], round: 0, match: 0, rng, maps: ['classic', 'pillars', BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id] };
        M.showBracket();
      });
    },

    showBracket(msg) {
      const c = M.cup;
      const names = ['Quarterfinal', 'Semifinal', 'Final', 'Champion'];
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Ball Cup', { onX: () => { M.cup = null; BB.ui.close(); } });
        if (msg) body.appendChild(Object.assign(document.createElement('div'), { className: 'cup-msg', innerHTML: msg }));
        const br = document.createElement('div');
        br.className = 'bracket';
        const cur = c.done ? [] : c.rounds[c.round].slice(c.match * 2, c.match * 2 + 2);
        // one grid: a header row, then 8 rows; a round-r box spans 2^r rows and sits centred
        // between the two boxes that feed it
        let html = '';
        for (let r = 0; r < 4; r++) {
          html += `<div class="br-h" style="grid-column:${r + 1};grid-row:1">${names[r]}</div>`;
          const list = c.rounds[r] || [], span = 1 << r;
          for (let k = 0; k < (8 >> r); k++) {
            const id = list[k];
            const next = r === c.round && cur.includes(id) && Math.floor(k / 2) === c.match;
            html += `<div class="br-e${next ? ' me' : ''}${id ? '' : ' tbd'}" style="grid-column:${r + 1};grid-row:${2 + k * span} / span ${span}">${id ? `<img src="${BB.icon(id)}" alt=""><span>${esc(BB.ITEM[id].name)}</span>` : '<span>?</span>'}</div>`;
          }
        }
        br.innerHTML = html;
        body.appendChild(br);
        const foot = document.createElement('div');
        foot.className = 'sh-foot';
        if (c.done) {
          const ok = document.createElement('button'); ok.className = 'btn green'; ok.textContent = 'Back to menu';
          ok.onclick = () => { M.cup = null; BB.ui.onClose = null; BB.ui.close(); BB.app.toMenu(); };
          foot.appendChild(ok);
        } else {
          const [a, b] = cur;
          const go = document.createElement('button'); go.className = 'btn primary';
          go.innerHTML = `${BB.ICON.play} ${esc(BB.ITEM[a].name)} vs ${esc(BB.ITEM[b].name)}`;
          go.onclick = () => { BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => M.cupFight(a, b)); };
          foot.append(go); // every Cup match is played out (no skipping: it paid out free coins)
        }
        sheet.appendChild(foot);
      }, { width: '640px', onClose: () => { if (!M.cup || M.cup.done) BB.app.toMenu(); } });
    },

    cupFight(a, b) {
      const c = M.cup, app = BB.app;
      app.event = {
        kind: 'cup', seed: (c.rng() * 2147483647) | 0, map: c.maps[c.round],
        teams: [[{ id: a, hp: 100, scale: 1, ov: {}, slot: 0 }], [{ id: b, hp: 100, scale: 1, ov: {}, slot: 1 }]],
        onOver: (w) => M.cupAdvance(w === 1 ? b : a),
      };
      app.startBattle();
    },

    cupChampionMsg() { const id = M.cup.rounds[3][0]; return `<b>${esc(BB.ITEM[id].name)}</b> is the champion! +${coin(100)}`; },

    cupAdvance(winner, silent) {
      const c = M.cup, app = BB.app;
      app.event = null;
      c.next = c.next || [];
      c.next.push(winner);
      c.match++;
      M.track('cupwin', 1);
      if (c.match * 2 >= c.rounds[c.round].length) {
        c.rounds.push(c.next); c.next = []; c.round++; c.match = 0;
        if (c.round === 3) {
          c.done = true;
          const m = M.data(); m.trophies++;
          M.addMastery(winner);
          BB.save.data.coins += 100; BB.save.write(); app.refreshCoins();
          BB.audio.play('win'); BB.sdk.happytime();
        }
      }
      if (!silent) M.showBracket(c.done ? M.cupChampionMsg() : `<b>${esc(BB.ITEM[winner].name)}</b> advances!`);
    },

    // ------------------------------------------------------------- PvP 3v3 series (CrazyGames only)
    // Beyblade-style async series: each side brings 3 different balls in a fixed order and all
    // three rounds are played (ball 1 vs ball 1, 2 vs 2, 3 vs 3); most round wins takes the series.
    // The challenge link (CrazyGames invite API) carries the squad, maps, seed, rating and name.
    // The receiver picks blind, the lineups are revealed, and every fight is seeded so it plays
    // out identically on both screens. A result link sends the outcome back to the challenger.
    pvpData() {
      const m = M.data();
      m.pvp = m.pvp || { rating: 1000, w: 0, l: 0 };
      m.pvp.d = m.pvp.d || 0; m.pvp.hist = m.pvp.hist || []; m.pvp.sent = m.pvp.sent || []; m.pvp.seen = m.pvp.seen || [];
      return m.pvp;
    },
    RANKS: [[0, 'Bronze', '#d08a4a'], [1000, 'Silver', '#c9d1db'], [1125, 'Gold', '#ffd23f'], [1250, 'Diamond', '#7fe3ff'], [1400, 'Legend', '#ff6fd8']],
    rankOf(r) { let k = 0; M.RANKS.forEach((x, i) => { if (r >= x[0]) k = i; }); return k; },
    rankName(r) { return M.RANKS[M.rankOf(r)][1]; },
    rankHtml(r) { const k = M.rankOf(r); return `<span class="pvp-badge" style="--rc:${M.RANKS[k][2]}">${M.rankIcon(k)}${M.RANKS[k][1]}</span>`; },
    // A distinct emblem per rank: Bronze shield, Silver winged shield, Gold crowned shield, Diamond gem, Legend flaming crown.
    rankIcon(k) {
      const g = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
      const S = 'stroke="#111" stroke-width="3" stroke-linejoin="round"';
      const shield = 'M32 8l20 7v15c0 13-9 22-20 27-11-5-20-14-20-27V15z';
      const uid = 'rk' + k + '_' + Math.random().toString(36).slice(2, 7);
      const parts = [
        // Bronze
        `<defs>${g(uid, '#f0b27a', '#9c5b23')}</defs><path d="${shield}" fill="url(#${uid})" ${S}/><path d="M22 30l10 7 10-7" fill="none" stroke="#fff3e0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 30l10 7 10-7" fill="none" stroke="#111" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".35"/>`,
        // Silver: wings + double chevron
        `<defs>${g(uid, '#ffffff', '#8e9aa6')}</defs><path d="M12 22c-7 1-10 7-9 13 4-3 7-4 10-4M52 22c7 1 10 7 9 13-4-3-7-4-10-4" fill="#dfe6ec" ${S}/><path d="${shield}" fill="url(#${uid})" ${S}/><path d="M22 25l10 7 10-7M22 34l10 7 10-7" fill="none" stroke="#5f6b77" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
        // Gold: crown + star
        `<defs>${g(uid, '#fff1a8', '#d39a0b')}</defs><path d="M20 12l4-8 8 6 8-6 4 8z" fill="#ffd23f" ${S}/><path d="${shield}" fill="url(#${uid})" ${S}/><path d="M32 20l3.6 7.4 8 1.2-5.8 5.6 1.4 8L32 38.4l-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="#fff" ${S.replace('3', '2')}/>`,
        // Diamond: faceted gem
        `<defs>${g(uid, '#e6fbff', '#2bb7e6')}</defs><path d="M14 22l9-12h18l9 12-18 32z" fill="url(#${uid})" ${S}/><path d="M14 22h36M23 10l9 12 9-12M32 22v32M23 10l-1 12 10 32M41 10l1 12-10 32" fill="none" stroke="#111" stroke-width="1.6" opacity=".55"/><path d="M20 18l4-5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
        // Legend: flaming crown with a gem
        `<defs>${g(uid, '#ffd1f4', '#c2185b')}<linearGradient id="${uid}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff6fd8"/><stop offset="1" stop-color="#ffe066"/></linearGradient></defs><path d="M14 30c-2-8 4-12 4-20 5 4 6 8 6 12 2-6 6-10 8-16 2 6 6 10 8 16 0-4 1-8 6-12 0 8 6 12 4 20z" fill="url(#${uid}f)" ${S}/><path d="M12 30l6 22h28l6-22-10 8-10-12-10 12z" fill="url(#${uid})" ${S}/><circle cx="32" cy="42" r="5" fill="#7fe3ff" ${S.replace('3', '2.5')}/><path d="M18 52h28" stroke="#111" stroke-width="3"/>`,
      ];
      return `<svg class="rank-ic" viewBox="0 0 64 64">${parts[Math.max(0, Math.min(4, k))]}</svg>`;
    },
    cleanName(n) { return String(n || '').replace(/[^\w .-]/g, '').trim().slice(0, 16) || 'Rival'; },
    async myName() {
      if (M._name) return M._name;
      const u = await BB.sdk.getUser();
      M._name = M.cleanName(u && u.username ? u.username : 'Player');
      return M._name;
    },
    validIds(ids) { return ids.length === 3 && new Set(ids).size === 3 && ids.every((id) => BB.ITEM[id] && BB.ITEM[id].cat !== 'hidden'); },
    validMaps(maps) { return maps.length === 3 && maps.every((m) => BB.MAP[m]); },

    encode3(ids, maps, seed, name) { return [ids.join('.'), maps.join('.'), seed, M.pvpData().rating, M.cleanName(name)].join('~'); },
    decode3(code) {
      const p = String(code || '').split('~');
      if (p.length < 4) return null;
      const ids = p[0].split('.'), maps = p[1].split('.');
      if (!M.validIds(ids) || !M.validMaps(maps)) return null;
      return { ids, maps, seed: (Number(p[2]) || 1) | 0, rating: Math.round(Number(p[3]) || 1000), name: M.cleanName(p[4]) };
    },
    // result link: challenger squad, receiver squad, maps, seed, round results (receiver's view), receiver rating + name
    encodeR(sr, name) { return [sr.theirs.join('.'), sr.mine.join('.'), sr.maps.join('.'), sr.seed, sr.results.join('.'), M.pvpData().rating, M.cleanName(name)].join('~'); },
    decodeR(code) {
      const p = String(code || '').split('~');
      if (p.length < 7) return null;
      const a = p[0].split('.'), b = p[1].split('.'), maps = p[2].split('.'), res = p[4].split('.').map(Number);
      if (!M.validIds(a) || !M.validIds(b) || !M.validMaps(maps) || res.length !== 3 || !res.every((r) => r === 0 || r === 1 || r === -1)) return null;
      return { mine: a, theirs: b, maps, seed: (Number(p[3]) || 1) | 0, results: res.map((r) => (r === 0 ? 1 : r === 1 ? 0 : -1)), rating: Math.round(Number(p[5]) || 1000), name: M.cleanName(p[6]) };
    },

    pick3(title, sub, onDone) { M.pickN(3, title, sub, onDone, { pvp: true }); },
    pickN(N, title, sub, onDone, opts) {
      opts = opts || {};
      const sel = [];
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, title);
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: sub }));
        const squad = document.createElement('div'); squad.className = 'squad'; squad.style.gridTemplateColumns = 'repeat(' + Math.min(N, 4) + ', 1fr)';
        body.appendChild(squad);
        const grid = document.createElement('div'); grid.className = 'grid';
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        const go = document.createElement('button'); go.className = 'btn green'; go.textContent = N === 3 ? 'Confirm squad' : 'Start the cup'; go.disabled = true;
        const draw = () => {
          squad.innerHTML = [...Array(N).keys()].map((k) => sel[k]
            ? `<button class="sq-s" data-k="${k}">${N === 3 ? `<em>Round ${k + 1}</em>` : ''}<img src="${BB.icon(sel[k])}" alt=""><span>${esc(BB.ITEM[sel[k]].name)}</span></button>`
            : `<div class="sq-s empty">${N === 3 ? `<em>Round ${k + 1}</em>` : ''}<span>${k + 1}</span></div>`).join('');
          squad.querySelectorAll('button.sq-s').forEach((b) => { b.onclick = () => { BB.audio.play('click'); sel.splice(Number(b.dataset.k), 1); draw(); }; });
          grid.querySelectorAll('.tile').forEach((t) => { const k = sel.indexOf(t.dataset.id); t.classList.toggle('sel', k >= 0); t.dataset.order = k >= 0 ? k + 1 : ''; t.classList.toggle('full', k < 0 && sel.length >= N); });
          go.disabled = sel.length !== N;
          go.textContent = sel.length === N ? (N === 3 ? 'Confirm squad' : 'Start the cup') : 'Pick ' + (N - sel.length) + ' more';
        };
        for (const it of BB.ITEMS.filter((i) => i.cat !== 'hidden' && BB.app.isOwned(i.id))) {
          const t = document.createElement('button');
          t.className = 'tile'; t.dataset.id = it.id;
          t.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><span class="t-n">${esc(it.name)}</span>${M.starHtml(it.id)}<span class="rar" style="background:${BB.RARITY[it.rarity].color}"></span>`;
          // tapping a picked ball removes it; the same ball can never be picked twice
          t.onclick = () => {
            BB.audio.play('click'); const k = sel.indexOf(it.id);
            if (k >= 0) sel.splice(k, 1); else if (sel.length < N) {
              sel.push(it.id);
              // PvP must play the same fight on both screens, so Kami always fights in its base form
              if (opts.pvp && it.id === 'kami' && M.skinOf('kami') === 'tenshi') BB.ui.toast('The Tenshi skin can\'t be used in PvP. Kami will fight in its base form.');
            }
            draw();
          };
          grid.appendChild(t);
        }
        body.appendChild(grid);
        go.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); onDone(sel.slice()); };
        foot.appendChild(go); sheet.appendChild(foot);
        draw();
      }, { width: '600px' });
    },

    ownedCount() { return BB.ITEMS.filter((i) => i.cat !== 'hidden' && BB.app.isOwned(i.id)).length; },

    // ---- short codes: everything a challenge / result needs, packed into ~17-23 typeable characters
    // (Crockford base32, no server needed). Items/maps are stored by index, so new items must be appended.
    B32: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
    pack(fields) {
      let v = 0n, bits = 0;
      for (const [val, n] of fields) { v = (v << BigInt(n)) | BigInt(val & ((1 << n) - 1 >>> 0) >>> 0); bits += n; }
      let sum = 0; for (let t = v; t > 0n; t >>= 5n) sum = (sum + Number(t & 31n)) % 32;
      v = (v << 5n) | BigInt(sum); bits += 5;
      let out = '';
      for (let i = 0; i < Math.ceil(bits / 5); i++) { out = M.B32[Number(v & 31n)] + out; v >>= 5n; }
      return out.match(/.{1,4}/g).join('-');
    },
    unpack(str, sizes) {
      const clean = String(str || '').toUpperCase().replace(/[IL]/g, '1').replace(/O/g, '0').replace(/[^0-9A-Z]/g, '');
      const total = sizes.reduce((a, b) => a + b, 0) + 5;
      if (clean.length !== Math.ceil(total / 5)) return null;
      let v = 0n;
      for (const ch of clean) { const d = M.B32.indexOf(ch); if (d < 0) return null; v = (v << 5n) | BigInt(d); }
      const sum = Number(v & 31n); v >>= 5n;
      let chk = 0; for (let t = v; t > 0n; t >>= 5n) chk = (chk + Number(t & 31n)) % 32;
      if (chk !== sum) return null;
      const out = [];
      for (let i = sizes.length - 1; i >= 0; i--) { out[i] = Number(v & ((1n << BigInt(sizes[i])) - 1n)); v >>= BigInt(sizes[i]); }
      return out;
    },
    // seed goes first so codes look random instead of starting with zeros
    CH_SIZES: [31, 1, 8, 8, 8, 4, 4, 4, 12],
    RS_SIZES: [31, 1, 8, 8, 8, 8, 8, 8, 4, 4, 4, 2, 2, 2, 12],
    shortChallenge(ids, maps, seed) {
      const ix = (id) => BB.ITEMS.findIndex((i) => i.id === id), mx = (m) => BB.MAPS.findIndex((x) => x.id === m);
      return M.pack([[seed, 31], [0, 1], ...ids.map((id) => [ix(id), 8]), ...maps.map((m) => [mx(m), 4]), [Math.min(4095, M.pvpData().rating), 12]]);
    },
    shortResult(sr) {
      const ix = (id) => BB.ITEMS.findIndex((i) => i.id === id), mx = (m) => BB.MAPS.findIndex((x) => x.id === m);
      return M.pack([[sr.seed, 31], [1, 1], ...sr.theirs.map((id) => [ix(id), 8]), ...sr.mine.map((id) => [ix(id), 8]), ...sr.maps.map((m) => [mx(m), 4]), ...sr.results.map((r) => [r + 1, 2]), [Math.min(4095, M.pvpData().rating), 12]]);
    },
    // returns { kind: 'challenge', ch } | { kind: 'result', r } | null
    readCode(str) {
      const it = (k) => (BB.ITEMS[k] ? BB.ITEMS[k].id : null), mp = (k) => (BB.MAPS[k] ? BB.MAPS[k].id : null);
      const c = M.unpack(str, M.CH_SIZES);
      if (c && c[1] === 0) {
        const ids = c.slice(2, 5).map(it), maps = c.slice(5, 8).map(mp);
        if (M.validIds(ids) && M.validMaps(maps)) return { kind: 'challenge', ch: { ids, maps, seed: c[0] | 0, rating: c[8] || 1000, name: 'Code Rival' } };
      }
      const r = M.unpack(str, M.RS_SIZES);
      if (r && r[1] === 1) {
        const a = r.slice(2, 5).map(it), b = r.slice(5, 8).map(it), maps = r.slice(8, 11).map(mp), res = r.slice(11, 14).map((x) => x - 1);
        if (M.validIds(a) && M.validIds(b) && M.validMaps(maps) && res.every((x) => x >= -1 && x <= 1))
          return { kind: 'result', r: { mine: a, theirs: b, maps, seed: r[0] | 0, results: res.map((x) => (x === 0 ? 1 : x === 1 ? 0 : -1)), rating: r[14] || 1000, name: 'Code Rival' } };
      }
      return null;
    },
    enterCode() {
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Enter a Code', { onX: () => M.openPvp() });
        body.innerHTML += `<div class="f-s">Type a friend's room code, the challenge code they sent you, or the result code from a challenge you created.</div>`;
        const inp = document.createElement('input'); inp.className = 'pvp-code-in'; inp.placeholder = 'XXXX-XXXX-XXXX-XXXX'; inp.autocapitalize = 'characters'; inp.spellcheck = false; inp.maxLength = 32;
        inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') go.click(); };
        inp.oninput = () => { const v = inp.value.toUpperCase().replace(/[^0-9A-Z]/g, ''); inp.value = (v.match(/.{1,4}/g) || []).join('-'); };
        body.appendChild(inp);
        const go = document.createElement('button'); go.className = 'btn primary pvp-go'; go.innerHTML = BB.ICON.swords + ' Go';
        go.onclick = () => {
          const rc = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (BB.party && BB.party.validCode(rc)) { BB.ui.onClose = null; BB.ui.close(); BB.party.join(rc); return; } // a friend's room code
          const got = M.readCode(inp.value);
          if (!got) { BB.audio.play('lose'); BB.ui.toast('That code is not valid. Check it and try again.'); inp.classList.add('bad'); return; }
          BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close();
          if (got.kind === 'challenge') M.pvpReceive(got.ch); else M.pvpResult(got.r);
        };
        body.appendChild(go);
        setTimeout(() => inp.focus(), 50);
      }, { width: '440px' });
    },
    codeBox(code, label) {
      return `<div class="pvp-code"><small>${label}</small><b>${code}</b></div>`;
    },

    openPvp() {
      const pv = M.pvpData(), k = M.rankOf(pv.rating), next = M.RANKS[k + 1];
      // first visit: a short, skippable tutorial with demos, then the arena
      if (!pv.tutDone && BB.pvpTut) { BB.ui.onClose = null; BB.ui.close(); BB.pvpTut.open(() => M.openPvp()); return; }
      const lo = M.RANKS[k][0], pct = next ? Math.max(0, Math.min(100, ((pv.rating - lo) / (next[0] - lo)) * 100)) : 100;
      const games = pv.w + pv.d + pv.l, wr = games ? Math.round((pv.w / games) * 100) + '%' : '-';
      const squad = Array.isArray(pv.squad) && pv.squad.length === 3 ? pv.squad : null;
      BB.ui.open((sheet) => {
        sheet.classList.add('pvx-sheet');
        const body = BB.ui.head(sheet, 'PvP Arena');
        body.innerHTML += `
          <div class="pvx-hero" style="--rc:${M.RANKS[k][2]}">
            <div class="pvx-hon">Honour: <b>${M.honour()}</b> <span>(PvP will be disabled when below 25)</span></div>
            <div class="pvx-emblem">${M.rankIcon(k)}</div>
            <div class="pvx-info">
              <div class="pvx-rankname">${M.RANKS[k][1]}</div>
              <div class="pvx-rating">${pv.rating}<small>rating</small></div>
              <div class="pvx-bar"><i style="width:${pct}%"></i></div>
              <div class="pvx-next">${next ? `<b>${next[0] - pv.rating}</b> to ${next[1]}` : 'Top rank reached'}</div>
            </div>
          </div>
          <div class="pvx-rec"><div class="w"><b>${pv.w}</b><span>Won</span></div><div class="d"><b>${pv.d}</b><span>Drawn</span></div><div class="l"><b>${pv.l}</b><span>Lost</span></div><div><b>${wr}</b><span>Win rate</span></div></div>
          ${M.banLeft() ? `<div class="pvx-ban">PvP disabled for <b>${Math.ceil(M.banLeft() / 60)} min</b> for leaving matches early.</div>` : ''}
          <div class="pvx-quick">
            <div class="pvx-qh"><b>Quick Match</b><span class="pvx-live"><i></i>Play online now</span></div>
            <div class="pvx-squad">${[0, 1, 2].map((i) => `<div class="pvx-slot">${squad ? `<img src="${BB.icon(squad[i])}" alt="">` : '<span>?</span>'}<em>R${i + 1}</em></div>`).join('')}
              <button class="pvx-change">${squad ? 'Change' : 'Pick squad'}</button></div>
            <button class="pvx-find">${BB.ICON.swords}<span>Find a match</span></button>
          </div>
          <div class="pvx-friend"><div class="pvx-ft"><b>Play a Friend</b><span>Send a code, they answer it. 3 rounds, most wins takes it.</span></div><div class="pvx-fb"></div></div>
          ${pv.hist.length ? `<div class="section-t">Recent matches</div><div class="pvp-hist">${pv.hist.map((h) => `<div class="ph ${h.r > 0 ? 'w' : h.r < 0 ? 'l' : 'd'}"><span class="ph-r">${h.r > 0 ? 'WIN' : h.r < 0 ? 'LOSS' : 'DRAW'}</span><span class="ph-n">vs ${esc(h.n)}</span><b>${esc(h.s)}</b><small>${h.d >= 0 ? '+' : ''}${h.d}</small></div>`).join('')}</div>` : ''}
          <button class="pvx-help">? How PvP works</button>`;
        const go = document.createElement('button'); go.className = 'btn primary'; go.innerHTML = BB.ICON.swords + ' Create';
        go.onclick = () => {
          BB.audio.play('click');
          if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to play PvP'); return; }
          M.pick3('Your PvP Squad', 'Round 1 uses your first pick, round 2 your second, round 3 your third. Your rival picks without seeing your squad.', (ids) => M.pvpCreated(ids));
        };
        const enter = document.createElement('button'); enter.className = 'btn blue'; enter.innerHTML = BB.ICON.play + ' Enter code';
        enter.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); M.enterCode(); };
        body.querySelector('.pvx-fb').append(go, enter);
        const away = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); };
        body.querySelector('.pvx-find').onclick = () => { away(); BB.match.start(); };
        body.querySelector('.pvx-change').onclick = () => { away(); BB.match.start(true); };
        body.querySelector('.pvx-help').onclick = () => { away(); BB.pvpTut.open(() => M.openPvp()); };
      }, { width: '460px' });
    },

    async pvpCreated(ids) {
      const rng = BB.RNG((Math.random() * 1e9) | 0);
      const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id);
      const seed = (rng() * 2147483647) | 0;
      const pv = M.pvpData();
      pv.sent.unshift(seed); pv.sent.length = Math.min(pv.sent.length, 20); BB.save.write();
      const code = M.encode3(ids, maps, seed, await M.myName());
      const short = M.shortChallenge(ids, maps, seed);
      const link = BB.sdk.inviteLink({ pvp3: code });
      BB.sdk.showInvite({ pvp3: code });
      BB.sdk.updateRoom('c' + seed, true, { pvp3: code }); // open room: friends can join from CrazyGames
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Challenge Ready!');
        body.innerHTML += `<div class="squad">${ids.map((id, k) => `<div class="sq-s"><em>Round ${k + 1}</em><img src="${BB.icon(id)}" alt=""><span>${esc(BB.ITEM[id].name)}</span></div>`).join('')}</div>
          ${M.codeBox(short, 'Challenge code')}
          <ol class="pm-tldr"><li><b>Copy</b> the code</li><li><b>Send</b> it to a friend</li><li>They tap <b>PvP → Enter code</b></li></ol>`;
        const cc = document.createElement('button'); cc.className = 'btn primary'; cc.textContent = 'Copy code';
        cc.onclick = async () => { try { await navigator.clipboard.writeText(short); BB.ui.toast('Code copied!'); } catch (e) { BB.ui.toast(short); } };
        body.appendChild(cc);
        const out = document.createElement('input'); out.className = 'pvp-link'; out.readOnly = true; out.value = link || 'Invites only work on CrazyGames';
        body.appendChild(out);
        const cp = document.createElement('button'); cp.className = 'btn green'; cp.textContent = 'Copy link';
        cp.onclick = async () => { try { await navigator.clipboard.writeText(out.value); BB.ui.toast('Link copied!'); } catch (e) { out.select(); } };
        body.appendChild(cp);
      }, { width: '480px', onClose: () => { BB.sdk.hideInvite(); BB.sdk.updateRoom('c' + seed, false); } });
    },

    pvpReceive(ch) {
      const pv = M.pvpData();
      if (pv.sent.includes(ch.seed)) { BB.ui.toast('That is your own challenge. Send it to a friend!'); return; }
      if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to answer PvP challenges'); return; }
      BB.sdk.updateRoom('c' + ch.seed, false); // joined the challenger's room; a 1v1 is now full
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet');
        sheet.innerHTML = `<div class="vs-round">CHALLENGE RECEIVED</div>
          <div class="ch-from"><b>${esc(ch.name)}</b>${M.rankHtml(ch.rating)}<span>${ch.rating}</span></div>
          <div class="lineup hidden-l">${[0, 1, 2].map((k) => `<div class="card-back"><em>Round ${k + 1}</em><b>?</b></div>`).join('')}</div>
          <div class="f-s" style="text-align:center">Their squad stays hidden until you lock in yours. 3 rounds, in order. Most wins takes the series.</div>`;
        const go = document.createElement('button'); go.className = 'btn primary vs-go'; go.innerHTML = BB.ICON.swords + ' Pick your squad';
        go.onclick = () => {
          BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close();
          M.pick3('Answer ' + ch.name, 'Pick 3 different balls in fight order. Round 1 uses your first pick.', (mine) => {
            M.series = { mine, theirs: ch.ids, maps: ch.maps, seed: ch.seed, foeRating: ch.rating, foeName: ch.name, round: 0, score: [0, 0], results: [] };
            M.lineup();
          });
        };
        sheet.appendChild(go);
      }, { width: '560px' });
    },

    // both squads revealed side by side, round by round
    lineup() {
      const sr = M.series;
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet');
        sheet.innerHTML = `<div class="vs-round">LINEUP</div>
          <div class="lu-head"><span>${sr.spectate ? esc(sr.meName) : 'YOU'}</span><span></span><span>${esc(sr.foeName)}</span></div>
          <div class="lineup">${[0, 1, 2].map((k) => `<div class="lu-row" style="animation-delay:${k * 0.18}s">
            <div class="lu-b me"><img src="${BB.icon(sr.mine[k])}" alt=""><b style="color:${BB.itemColor(sr.mine[k])}">${esc(BB.ITEM[sr.mine[k]].name)}</b></div>
            <div class="lu-mid"><em>R${k + 1}</em><small>${esc(BB.MAP[sr.maps[k]].name)}</small></div>
            <div class="lu-b foe"><b style="color:${BB.itemColor(sr.theirs[k])}">${esc(BB.ITEM[sr.theirs[k]].name)}</b><img src="${BB.icon(sr.theirs[k])}" alt=""></div></div>`).join('')}</div>`;
        const next = () => { clearTimeout(M._auto); if (M.series !== sr) return; BB.ui.onClose = null; BB.ui.close(); M.vsSplash(); };
        if (sr.live) { M._auto = setTimeout(next, 2600); sheet.insertAdjacentHTML('beforeend', '<div class="vs-auto"><i></i></div>'); return; } // live: no clicks
        const go = document.createElement('button'); go.className = 'btn primary vs-go'; go.innerHTML = BB.ICON.play + ' Start round 1';
        go.onclick = () => { BB.audio.play('click'); next(); };
        sheet.appendChild(go);
      }, { width: '560px', onClose: () => { if (!sr.live) M.series = null; } });
    },

    pips(sr, side) {
      return `<span class="pips">${[0, 1, 2].map((k) => { const r = sr.results[k]; const c = r === undefined ? '' : r === -1 ? 'd' : r === side ? 'w' : 'l'; return `<i class="${c}"></i>`; }).join('')}</span>`;
    },

    vsSplash() {
      const sr = M.series, k = sr.round;
      const a = sr.mine[k], b = sr.theirs[k], last = sr.results[k - 1];
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet');
        sheet.innerHTML = `${k > 0 ? `<div class="vs-last ${last === 0 ? 'w' : last === 1 ? 'l' : 'd'}">Round ${k}: ${last === 0 ? (sr.spectate ? esc(sr.meName) + ' wins' : 'You win') : last === 1 ? esc(sr.foeName) + ' wins' : 'Draw'}</div>` : ''}
          <div class="vs-round">ROUND ${k + 1} <small>of 3</small></div>
          <div class="vs-score">${M.pips(sr, 0)}<b>${sr.score[0]} - ${sr.score[1]}</b>${M.pips(sr, 1)}</div>
          <div class="vs-row"><div class="vs-side me"><img src="${BB.icon(a, 160)}" alt=""><b style="color:${BB.itemColor(a)}">${esc(BB.ITEM[a].name)}</b><i>${sr.spectate ? esc(sr.meName) : 'YOU'}</i></div>
          <div class="vs-x">VS</div>
          <div class="vs-side foe"><img src="${BB.icon(b, 160)}" alt=""><b style="color:${BB.itemColor(b)}">${esc(BB.ITEM[b].name)}</b><i>${esc(sr.foeName)}</i></div></div>
          <div class="vs-map">${esc(BB.MAP[sr.maps[k]].name)}</div>`;
        const fight = () => { clearTimeout(M._auto); if (M.series !== sr) return; BB.ui.onClose = null; BB.ui.close(); M.pvpFight(); };
        if (sr.live) { M._auto = setTimeout(fight, k > 0 ? 2400 : 1700); sheet.insertAdjacentHTML('beforeend', '<div class="vs-auto"><i></i></div>'); return; } // live: no clicks
        const go = document.createElement('button'); go.className = 'btn primary vs-go'; go.innerHTML = BB.ICON.play + ' Fight!';
        go.onclick = () => { BB.audio.play('start'); fight(); };
        sheet.appendChild(go);
      }, { width: '560px', onClose: () => { if (sr.live) return; M.series = null; BB.app.toMenu(); } });
    },

    pvpFight() {
      const sr = M.series, k = sr.round, app = BB.app;
      // live matches: the host's ball is always team 0 on both screens so the fights are identical
      const a = { id: sr.mine[k], hp: 100, scale: 1, ov: {} }, b = { id: sr.theirs[k], hp: 100, scale: 1, ov: {} };
      app.event = {
        kind: 'pvp3', spectate: !!sr.spectate, mySide: sr.flip ? 1 : 0, seed: (sr.seed + k * 7919) | 0, map: sr.maps[k],
        teams: sr.flip ? [[Object.assign(b, { slot: 0 })], [Object.assign(a, { slot: 1 })]] : [[Object.assign(a, { slot: 0 })], [Object.assign(b, { slot: 1 })]],
        onOver: (w) => M.pvpRound(w),
      };
      app.pvpLiveAim = !!(sr.live && !sr.spectate);
      app.startBattle();
      if (app.pvpLiveAim) BB.shoot.begin(sr); // both players aim, then the fight launches
    },

    pvpRound(w) {
      const sr = M.series, app = BB.app;
      app.event = null;
      if (!sr) { app.toMenu(); return; }
      if (sr.flip && w >= 0) w = 1 - w; // back to 'my' point of view
      sr.results.push(w);
      if (w === 0) sr.score[0]++; else if (w === 1) sr.score[1]++;
      sr.round++;
      // every round is played, even when the series is already decided
      if (sr.round < 3) { BB.audio.play(w === 0 ? 'win' : 'lose'); M.vsSplash(); return; }
      if (sr.spectate) { M.series = null; M.pvpResultScreen(sr.view); return; }
      if (sr.live && !sr.party) BB.shoot.unlink(); // matchmaking link no longer needed
      M.clearLive();
      const pv = M.pvpData();
      const won = sr.score[0] > sr.score[1], draw = sr.score[0] === sr.score[1];
      const delta = sr.party ? 0 : M.applyRating(pv, sr.foeRating, won ? 1 : draw ? 0.5 : 0); // friend rooms are unranked
      M.track('pvpplay', 1); if (won) M.track('pvpwin', 1);
      if (sr.live && !sr.party) M.honourUp(5); // finishing a match earns honour back
      M.pushHist(pv, sr.foeName, sr.score[0] + '-' + sr.score[1], delta, won ? 1 : draw ? 0 : -1);
      const coinsWon = won ? 150 : draw ? 80 : 50;
      BB.save.data.coins += coinsWon; BB.save.write(); app.refreshCoins();
      BB.audio.play(won ? 'win' : 'lose');
      if (won) BB.sdk.happytime();
      M.seriesEnd(sr, { won, draw, delta, coinsWon, canReply: !sr.live, title: sr.live ? 'Live match vs ' + esc(sr.foeName) : null });
    },

    // ------------------------------------------------------------- leaving live matches
    // A live series is recorded when it starts and cleared when it ends. If the game closes in
    // between, the next start counts it as a loss and costs 25 honour (starts at 100). Below 25,
    // PvP is disabled for 1 hour, after which honour comes back at 50. Finished matches add 5.
    markLive(sr) { const pv = M.pvpData(); pv.live = { foe: sr.foeRating, name: sr.foeName, t: Date.now() }; BB.save.write(); },
    clearLive() { const pv = M.pvpData(); if (pv.live) { delete pv.live; BB.save.write(); } },
    honour() { const pv = M.pvpData(); M.banLeft(); return pv.honour == null ? 100 : pv.honour; },
    honourUp(n) { const pv = M.pvpData(); pv.honour = Math.min(100, M.honour() + n); BB.save.write(); },
    checkAbandon() {
      const pv = M.pvpData();
      if (!pv.live) return;
      const L = pv.live; delete pv.live;
      M.pushHist(pv, L.name, 'left', M.applyRating(pv, L.foe, 0), -1);
      const prev = M.honour(), cur = Math.max(0, prev - 25);
      pv.honour = cur;
      if (cur < 25) pv.banUntil = Date.now() + 3600e3;
      BB.save.write();
      setTimeout(() => BB.ui.toast(`Honour dropped from ${prev} to ${cur}` + (cur < 25 ? '. PvP is disabled for 1 hour.' : ''), 4500), 1200);
    },
    banLeft() {
      const pv = M.pvpData(), left = Math.max(0, Math.ceil(((pv.banUntil || 0) - Date.now()) / 1000));
      if (!left && pv.banUntil) { delete pv.banUntil; if ((pv.honour == null ? 100 : pv.honour) < 50) pv.honour = 50; BB.save.write(); }
      return left;
    },

    applyRating(pv, foe, score) {
      const exp = 1 / (1 + Math.pow(10, (foe - pv.rating) / 400));
      const delta = Math.round(40 * (score - exp));
      pv.rating = Math.max(0, pv.rating + delta);
      if (score === 1) pv.w++; else if (score === 0) pv.l++; else pv.d++;
      return delta;
    },
    pushHist(pv, n, s, d, r) { pv.hist.unshift({ n, s, d, r }); pv.hist.length = Math.min(pv.hist.length, 5); },

    seriesEnd(sr, o) {
      const pv = M.pvpData();
      BB.ui.open((sheet) => {
        const body = document.createElement('div'); body.className = 'sh-body';
        body.innerHTML = `<div class="result"><div class="r-t" style="color:${o.won ? '#35d047' : o.draw ? '#ffd23f' : '#f0545a'}">${o.won ? 'Victory!' : o.draw ? 'Draw!' : 'Defeat'}</div>
          <div class="r-sub">${o.title || 'vs ' + esc(sr.foeName)} · <b>${sr.score[0]} - ${sr.score[1]}</b></div>
          <div class="series">${sr.results.map((r, i) => `<div class="se ${r === 0 ? 'w' : r === 1 ? 'l' : 'd'}"><img src="${BB.icon(sr.mine[i])}" alt=""><span>R${i + 1} · ${r === 0 ? 'WIN' : r === 1 ? 'LOSS' : 'DRAW'}<small>${esc(BB.MAP[sr.maps[i]].name)}</small></span><img src="${BB.icon(sr.theirs[i])}" alt=""></div>`).join('')}</div>
          <div class="pvp-rating">${pv.rating} <small class="${o.delta >= 0 ? 'up' : 'down'}">${o.delta >= 0 ? '+' : ''}${o.delta}</small></div>
          <div class="r-sub">${M.rankHtml(pv.rating)} · ${pv.w} W ${pv.d} D ${pv.l} L</div>
          ${o.coinsWon ? `<div class="r-coins">+${coin(o.coinsWon)}</div>` : ''}</div>`;
        sheet.appendChild(body);
        const foot = document.createElement('div'); foot.className = 'sh-foot pvp-foot';
        if (o.canReply) {
          const send = document.createElement('button'); send.className = 'btn blue'; send.textContent = 'Send result to ' + sr.foeName;
          send.onclick = async () => {
            BB.audio.play('click');
            const code = M.encodeR(sr, await M.myName()), short = M.shortResult(sr);
            BB.sdk.showInvite({ pvp3r: code });
            const link = BB.sdk.inviteLink({ pvp3r: code });
            if (!foot.parentNode.querySelector('.pvp-code')) body.querySelector('.result').insertAdjacentHTML('beforeend', M.codeBox(short, 'Result code: send it back to ' + esc(sr.foeName)));
            try { await navigator.clipboard.writeText(short); BB.ui.toast('Result code copied!'); } catch (e) { BB.ui.toast(link ? 'Use the invite button or the code' : 'Send them the result code'); }
          };
          foot.append(send);
        }
        if (o.watch) {
          const wb = document.createElement('button'); wb.className = 'btn blue'; wb.innerHTML = BB.ICON.play + ' Watch the series';
          wb.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); o.watch(); };
          foot.append(wb);
        }
        if (sr.party) {
          // friend room: both players go back to the room together
          const back = document.createElement('button'); back.className = 'btn primary'; back.textContent = BB.party.active() ? 'Back to room' : 'PvP';
          back.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); BB.party.backToRoom(); };
          foot.append(back); sheet.appendChild(foot);
          return;
        }
        const re = document.createElement('button'); re.className = 'btn primary'; re.textContent = sr.live ? 'Find another' : 'New challenge';
        re.onclick = () => { BB.sdk.hideInvite(); BB.ui.onClose = null; BB.ui.close(); M.series = null; BB.app.toMenu(); if (sr.live) BB.match.start(); else M.pick3('Your PvP Squad', 'Pick 3 different balls in fight order.', (ids) => M.pvpCreated(ids)); };
        const ok = document.createElement('button'); ok.className = 'btn green'; ok.textContent = 'Menu';
        ok.onclick = () => { BB.sdk.hideInvite(); M.series = null; BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => BB.app.toMenu()); };
        foot.append(re, ok); sheet.appendChild(foot);
      }, { width: '460px', onClose: () => { if (sr.party) { BB.party.backToRoom(); return; } BB.sdk.hideInvite(); M.series = null; BB.app.toMenu(); } });
    },

    // The challenger opens the result link: apply the rating once, show the series, offer a replay.
    pvpResult(r) {
      const pv = M.pvpData();
      const score = [r.results.filter((x) => x === 0).length, r.results.filter((x) => x === 1).length];
      const won = score[0] > score[1], draw = score[0] === score[1];
      const view = { mine: r.mine, theirs: r.theirs, maps: r.maps, seed: r.seed, foeName: r.name, foeRating: r.rating, results: r.results, score, won, draw, delta: 0, coinsWon: 0 };
      if (!pv.seen.includes(r.seed)) {
        pv.seen.unshift(r.seed); pv.seen.length = Math.min(pv.seen.length, 30);
        view.delta = M.applyRating(pv, r.rating, won ? 1 : draw ? 0.5 : 0);
        view.coinsWon = won ? 150 : draw ? 80 : 50;
        BB.save.data.coins += view.coinsWon;
        M.pushHist(pv, r.name, score[0] + '-' + score[1], view.delta, won ? 1 : draw ? 0 : -1);
        BB.save.write(); BB.app.refreshCoins();
        if (won) BB.sdk.happytime();
      }
      M.pvpResultScreen(view);
    },
    pvpResultScreen(v) {
      BB.app.toMenu();
      M.seriesEnd(v, {
        won: v.won, draw: v.draw, delta: v.delta, coinsWon: v.coinsWon, title: esc(v.foeName) + ' answered your challenge',
        // replay: the receiver was team 0 in every fight, so keep that order for identical results
        watch: () => {
          M.series = { spectate: true, view: Object.assign({}, v, { delta: 0, coinsWon: 0 }), meName: v.foeName, foeName: 'You',
            mine: v.theirs, theirs: v.mine, maps: v.maps, seed: v.seed, round: 0, score: [0, 0], results: [] };
          M.lineup();
        },
      });
    },

    // ------------------------------------------------------------- Gauntlet
    openGauntlet() {
      const best = M.data().gauntletBest;
      M.pickBall('Gauntlet', 'Fight wave after wave. Your HP carries over (you heal 25% between fights) and foes get tougher. Best: stage ' + best, (id) => {
        M.data().gauntletsPlayed = (M.data().gauntletsPlayed || 0) + 1; BB.save.write();
        M.gaunt = { me: id, hp: 100, stage: 1, rng: BB.RNG((Math.random() * 1e9) | 0), coins: 0 };
        M.gauntletNext();
      });
    },

    gauntletNext() {
      const g = M.gaunt, app = BB.app;
      const foe = M.randomFoes(1, g.me, g.rng)[0];
      const map = BB.MAPS[Math.floor(g.rng() * BB.MAPS.length)].id;
      g.foe = foe;
      app.event = {
        kind: 'gauntlet', seed: (g.rng() * 2147483647) | 0, map,
        teams: [[{ id: g.me, hp: 100, scale: 1, ov: {}, slot: 0 }], [{ id: foe, hp: 70 + g.stage * 15, scale: 1, ov: {}, slot: 1 }]],
        onOver: (w, sim) => M.gauntletResult(w, sim),
      };
      app.startBattle();
      // carry HP into the new fight
      const meBall = app.sim.balls.find((b) => b.team === 0 && b.main);
      if (!meBall.def.fixedHp) meBall.hp = Math.max(1, Math.round(g.hp));
      app.renderStats(app.sim, true);
      BB.ui.banner('STAGE ' + g.stage, 900);
    },

    gauntletResult(w, sim) {
      const g = M.gaunt, app = BB.app, m = M.data();
      app.event = null;
      const meBall = sim.balls.find((b) => b.team === 0 && b.main && b.def.id === g.me);
      if (w === 0) {
        const reward = 15 + g.stage * 10;
        g.coins += reward;
        BB.save.data.coins += reward;
        m.gauntletBest = Math.max(m.gauntletBest, g.stage);
        M.track('gauntlet', g.stage);
        g.hp = Math.min(100, (meBall ? meBall.hp : 1) + 25);
        g.stage++;
        BB.save.write(); app.refreshCoins(); BB.audio.play('win');
        M.gauntletCard(true, reward);
      } else {
        BB.save.write(); BB.audio.play('lose');
        M.gauntletCard(false, 0);
      }
    },

    gauntletCard(won, reward) {
      const g = M.gaunt, m = M.data();
      BB.ui.open((sheet) => {
        const body = document.createElement('div'); body.className = 'sh-body';
        body.innerHTML = `<div class="result"><div class="r-t" style="color:${won ? '#35d047' : '#f0545a'}">${won ? 'Stage ' + (g.stage - 1) + ' Cleared!' : 'Run Over'}</div>
          <img src="${BB.icon(g.me, 160)}" alt="">
          <div class="r-sub">${won ? 'HP carried over: ' + (BB.ITEM[g.me].fixedHp ? BB.ITEM[g.me].fixedHp + ' / ' + BB.ITEM[g.me].fixedHp : Math.ceil(g.hp) + ' / 100') : 'You reached stage ' + g.stage + ' · Best: ' + m.gauntletBest}</div>
          <div class="r-coins">+${coin(won ? reward : g.coins)}</div><div class="r-stats">${won ? 'Total this run: ' + g.coins + ' coins' : 'Coins this run'}</div></div>`;
        sheet.appendChild(body);
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        if (won) {
          const next = document.createElement('button'); next.className = 'btn primary'; next.textContent = 'Next stage ▶';
          next.onclick = () => { BB.ui.onClose = null; BB.ui.close(); M.gauntletNext(); };
          const stop = document.createElement('button'); stop.className = 'btn'; stop.textContent = 'Cash out';
          stop.onclick = () => { M.gaunt = null; BB.ui.onClose = null; BB.ui.close(); BB.app.toMenu(); };
          foot.append(stop, next);
        } else {
          const ok = document.createElement('button'); ok.className = 'btn green'; ok.textContent = 'Back to menu';
          ok.onclick = () => { M.gaunt = null; BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => BB.app.toMenu()); };
          foot.appendChild(ok);
        }
        sheet.appendChild(foot);
      }, { width: '400px', onClose: () => { M.gaunt = null; BB.app.toMenu(); } });
    },
  });
})();
