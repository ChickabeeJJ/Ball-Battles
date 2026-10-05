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
    { id: 'win3', text: 'Win 3 battles', goal: 3, reward: 80, ev: 'win' },
    { id: 'play5', text: 'Play 5 battles', goal: 5, reward: 60, ev: 'play' },
    { id: 'dmg800', text: 'Deal 800 total damage', goal: 800, reward: 70, ev: 'damage' },
    { id: 'big3', text: 'Land 3 hits of 15+ damage', goal: 3, reward: 90, ev: 'bighit' },
    { id: 'maps3', text: 'Battle on 3 different maps', goal: 3, reward: 70, ev: 'map' },
    { id: 'special2', text: 'Win 2 battles with a special ball', goal: 2, reward: 90, ev: 'specialwin' },
    { id: 'team2', text: 'Win 2 team or Free For All battles', goal: 2, reward: 80, ev: 'teamwin' },
    { id: 'cup1', text: 'Play a Cup match', goal: 1, reward: 100, ev: 'cupwin' },
    { id: 'gaunt3', text: 'Reach stage 3 in the Gauntlet', goal: 3, reward: 110, ev: 'gauntlet', max: true },
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
        const pool = QUEST_POOL.slice();
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
        if (ev === 'map') { if (!q.maps.includes(val)) { q.maps.push(val); q.p = q.maps.length; } }
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
      const mine = sim.balls.filter((b) => b.main && b.team === 0 && !b.owner);
      if (w === 0) {
        M.track('win', 1);
        if (mine.some((b) => b.def.cat === 'special')) M.track('specialwin', 1);
        if (!app.pvp && !app.event && (mode.teams[0].length > 1 || mode.teams.length > 2)) M.track('teamwin', 1);
      }
      // Mastery XP goes only to the winning side (nobody on a draw). In sandbox battles and the Cup
      // both sides are yours, so whichever team wins earns it; in PvP / Gauntlet the other side is an
      // opponent, so only your own winning ball does.
      M.lastXP = [];
      const anySide = !app.event || app.event.kind === 'cup';
      const seen = {};
      for (const b of sim.balls) {
        if (w < 0 || !b.main || b.owner || b.team !== w || (!anySide && b.team !== 0)) continue;
        const id = b.def.id;
        if (!BB.ITEM[id] || BB.ITEM[id].cat === 'hidden' || !app.isOwned(id)) continue;
        const xp = 40 + Math.min(40, Math.round((b.dealt || 0) / 4)) + (b.kills || 0) * 10;
        seen[id] = (seen[id] || 0) + xp;
      }
      for (const id in seen) M.lastXP.push(M.addXP(id, seen[id]));
      BB.save.write();
    },

    // ------------------------------------------------------------- mastery (per-ball XP, 10 levels, skins)
    MXP: [0, 60, 150, 280, 450, 670, 950, 1300, 1720, 2200],
    SKINS: [
      { id: 'classic', name: 'Classic', lvl: 1 },
      { id: 'shadow', name: 'Shadow', lvl: 4 },
      { id: 'neon', name: 'Neon', lvl: 6 },
      { id: 'gold', name: 'Gold', lvl: 10 },
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
    level(id) { const x = M.xp(id); let l = 1; for (let k = 1; k < M.MXP.length; k++) if (x >= M.MXP[k]) l = k + 1; return l; },
    levelProgress(id) {
      const l = M.level(id), x = M.xp(id);
      if (l >= 10) return { l, cur: 1, need: 1, pct: 100 };
      const a = M.MXP[l - 1], b = M.MXP[l];
      return { l, cur: x - a, need: b - a, pct: Math.round(((x - a) / (b - a)) * 100) };
    },
    nextReward(id) {
      const l = M.level(id);
      const sk = M.SKINS.find((s) => s.lvl > l);
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
        const sk = M.SKINS.find((s) => s.lvl === l);
        if (sk) skins.push(sk.name);
      }
      if (coinsWon) {
        BB.save.data.coins += coinsWon;
        if (after === 10) BB.sdk.happytime();
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
      const skins = M.SKINS.map((s) => {
        const ok = p.l >= s.lvl;
        return `<button class="skin${s.id === cur ? ' on' : ''}${ok ? '' : ' locked'}" data-skin="${s.id}" ${ok ? '' : 'disabled'}><i class="sw sw-${s.id}"></i><span>${s.name}</span>${ok ? '' : `<b>Lv${s.lvl}</b>`}</button>`;
      }).join('');
      return `<div class="mastery"><div class="m-top"><span class="mlv big${p.l >= 10 ? ' max' : ''}">Lv${p.l}</span><div class="m-bar"><i style="width:${p.pct}%"></i><b>${p.l >= 10 ? 'MASTERED' : p.cur + ' / ' + p.need + ' XP'}</b></div></div>
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
        body.innerHTML += `<div class="f-s">Balls earn XP whenever they fight for you: more for winning, dealing damage and knockouts. Level up for coins and new skins.</div>
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
        body.insertAdjacentHTML('beforeend', `<div class="section-t">Level rewards</div><div class="m-track">${M.MXP.slice(1).map((_, k) => {
          const lv = k + 2, sk = M.SKINS.find((x) => x.lvl === lv), st = lv <= lvNow ? 'got' : lv === lvNow + 1 ? 'next' : '';
          return `<div class="mt ${st}"><em>Lv${lv}</em>${sk ? `<i class="sw sw-${sk.id}"></i><small>${sk.name}</small>` : '<i class="mt-coin"></i>'}<span>+${40 * lv}</span></div>`;
        }).join('')}</div>`);
      }, { width: '440px' });
    },
    drawSkinPreview(cv, id) {
      if (!cv) return;
      const sim = new BB.Sim({ seed: 1, map: 'classic', settings: { dmgNumbers: false }, teams: [[{ id, hp: 100, slot: 0 }], [{ id: 'dummy', hp: 100, slot: 1 }]] });
      const b = sim.balls[0]; b.x = 0; b.y = 0; b.w.angle = -0.8; sim.computeCaps(b);
      const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 200, 200);
      const reach = b.r + (b.w.len || 0) + 20, k = 90 / reach;
      ctx.setTransform(k, 0, 0, k, 100, 100);
      BB.drawBallArt(ctx, sim, b, 2.4, { dark: false });
    },

    refreshBadges() {
      if (!BB.save.data) return;
      const m = M.data();
      const claimable = m.quests.some((q) => !q.claimed && q.p >= QUEST_POOL.find((x) => x.id === q.id).goal);
      const qb = $('btnQuests'); if (qb) qb.classList.toggle('ready', claimable);
      const gb = $('btnGift'); if (gb) gb.classList.toggle('ready', m.gift.day !== today());
    },

    // ------------------------------------------------------------- daily gift
    // Daily rewards screen: a 7-day track; missing a day resets the streak.
    claimGift() {
      const m = M.data();
      const REWARDS = [50, 75, 100, 150, 200, 250, 500];
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yesterday = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      const claimedToday = m.gift.day === today();
      const keep = claimedToday || m.gift.day === yesterday;
      const streak = keep ? m.gift.streak : 0;          // days already claimed in this run
      const dayIdx = claimedToday ? (streak - 1) % 7 : streak % 7; // today's slot on the track
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Daily Rewards');
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: claimedToday ? 'Come back tomorrow for the next reward!' : 'Log in every day. Day 7 is a big one!' }));
        const track = document.createElement('div');
        track.className = 'daily';
        REWARDS.forEach((r, k) => {
          const done = k < dayIdx || (claimedToday && k === dayIdx);
          const now = k === dayIdx && !claimedToday;
          const d = document.createElement('div');
          d.className = 'day' + (done ? ' done' : '') + (now ? ' now' : '') + (k === 6 ? ' big' : '');
          d.innerHTML = `<div class="day-n">Day ${k + 1}</div><div class="day-ic">${done ? BB.ICON.star : '<span class="coin-ic"></span>'}</div><div class="day-r">${r}</div>`;
          track.appendChild(d);
        });
        body.appendChild(track);
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        const btn = document.createElement('button');
        btn.className = 'btn ' + (claimedToday ? '' : 'primary');
        btn.innerHTML = claimedToday ? 'Claimed today' : 'Claim ' + coin(REWARDS[dayIdx]);
        btn.disabled = claimedToday;
        btn.onclick = () => {
          const amt = REWARDS[dayIdx];
          m.gift.streak = streak + 1; m.gift.day = today();
          BB.save.data.coins += amt; BB.save.write();
          BB.app.refreshCoins(); BB.audio.play('coin');
          if (dayIdx === 6) BB.sdk.happytime();
          M.claimGift();
          BB.ui.toast('+' + amt + ' coins!');
        };
        foot.appendChild(btn); sheet.appendChild(foot);
      }, { width: '520px', onClose: () => M.refreshBadges() });
    },

    // ------------------------------------------------------------- profile (CrazyGames account)
    async openProfile() {
      const user = await BB.sdk.getUser();
      const m = M.data(), pv = M.pvpData(), st = BB.save.data.stats;
      const all = BB.ITEMS.filter((i) => i.cat !== 'hidden');
      const ownedL = all.filter((i) => BB.app.isOwned(i.id));
      const levels = ownedL.reduce((n, i) => n + M.level(i.id), 0), mastered = ownedL.filter((i) => M.level(i.id) >= 10).length;
      const winRate = st.battles ? Math.round((st.wins / st.battles) * 100) : 0;
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
            <div class="pf-id"><div class="pf-name">${name}</div>
              <div class="pf-rankrow">${M.rankHtml(pv.rating)}<b>${pv.rating}</b></div>
              <div class="pvp-rankbar"><i style="width:${rpct}%"></i></div>
              <div class="pf-next">${next ? (next[0] - pv.rating) + ' rating to ' + next[1] : 'Top rank reached'}</div></div>
          </div>
          <div class="pf-sec"><div class="pf-h">Battles</div><div class="pf-grid">${stat(st.wins, 'Wins')}${stat(st.battles, 'Played')}${stat(winRate + '%', 'Win rate')}${stat(m.trophies, 'Cups won')}</div></div>
          <div class="pf-sec"><div class="pf-h">PvP Arena</div><div class="pf-grid">${stat(pv.w, 'Won')}${stat(pv.d, 'Drawn')}${stat(pv.l, 'Lost')}${stat(pv.rating, 'Rating')}</div></div>
          <div class="pf-sec"><div class="pf-h">Collection</div>
            <div class="pf-coll"><span>${ownedL.length} / ${all.length} balls</span><div class="m-bar sm"><i style="width:${(ownedL.length / all.length) * 100}%"></i></div></div>
            <div class="pf-grid">${stat(levels, 'Mastery levels')}${stat(mastered, 'Mastered')}${stat(m.gauntletBest, 'Best Gauntlet')}${stat(m.gift.streak || 0, 'Login streak')}</div></div>
          ${top.length ? `<div class="pf-sec"><div class="pf-h">Top balls</div><div class="pf-top">${top.map((i, n) => { const lp = M.levelProgress(i.id); return `<div class="pf-tb"><em>#${n + 1}</em><img src="${BB.icon(i.id)}" alt=""><div class="m-mid"><div class="m-name">${esc(i.name)}</div><div class="m-bar sm"><i style="width:${lp.pct}%"></i></div></div><span class="mlv${lp.l >= 10 ? ' max' : ''}">Lv${lp.l}</span></div>`; }).join('')}</div></div>` : ''}`;
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
    openQuests() {
      const m = M.data();
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Daily Quests');
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
            BB.audio.play('coin'); BB.app.refreshCoins(); M.openQuests();
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
      }, { width: '480px' });
    },

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
        for (let r = 0; r < 4; r++) {
          const col = document.createElement('div');
          col.className = 'br-col';
          col.innerHTML = `<div class="br-h">${names[r]}</div>`;
          const list = c.rounds[r] || [];
          for (let k = 0; k < (8 >> r); k++) {
            const id = list[k];
            const next = r === c.round && cur.includes(id) && Math.floor(k / 2) === c.match;
            col.innerHTML += `<div class="br-e${next ? ' me' : ''}${id ? '' : ' tbd'}">${id ? `<img src="${BB.icon(id)}" alt=""><span>${esc(BB.ITEM[id].name)}</span>` : '<span>?</span>'}</div>`;
          }
          br.appendChild(col);
        }
        body.appendChild(br);
        const foot = document.createElement('div');
        foot.className = 'sh-foot';
        if (c.done) {
          const ok = document.createElement('button'); ok.className = 'btn green'; ok.textContent = 'Back to menu';
          ok.onclick = () => { M.cup = null; BB.ui.onClose = null; BB.ui.close(); BB.app.toMenu(); };
          foot.appendChild(ok);
        } else {
          const [a, b] = cur;
          const sim = document.createElement('button'); sim.className = 'btn'; sim.textContent = 'Sim round';
          sim.onclick = () => { BB.audio.play('click'); M.cupSimRound(); };
          const go = document.createElement('button'); go.className = 'btn primary';
          go.innerHTML = `${BB.ICON.play} ${esc(BB.ITEM[a].name)} vs ${esc(BB.ITEM[b].name)}`;
          go.onclick = () => { BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => M.cupFight(a, b)); };
          foot.append(sim, go);
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

    // headless sim for matches you skip
    quickDuel(a, b, seed, map) {
      const s = new BB.Sim({ seed, map, settings: { dmgNumbers: false }, teams: [[{ id: a, hp: 100, slot: 0 }], [{ id: b, hp: 100, slot: 1 }]] });
      while (!s.over && s.t < 180) { s.step(1 / 60); s.events.length = 0; s.fx.length = 0; }
      return s.over && s.over.winner === 1 ? b : a;
    },

    cupSimRound() {
      const c = M.cup;
      const list = c.rounds[c.round];
      while (c.match * 2 < list.length && !c.done && c.rounds[c.round] === list) {
        const a = list[c.match * 2], b = list[c.match * 2 + 1];
        M.cupAdvance(M.quickDuel(a, b, (c.rng() * 1e9) | 0, c.maps[c.round]), true);
      }
      M.showBracket(c.done ? M.cupChampionMsg() : 'Round simulated!');
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
    rankHtml(r) { const k = M.rankOf(r); return `<span class="pvp-badge" style="--rc:${M.RANKS[k][2]}">${M.RANKS[k][1]}</span>`; },
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

    pick3(title, sub, onDone) { M.pickN(3, title, sub, onDone); },
    pickN(N, title, sub, onDone) {
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
          t.onclick = () => { BB.audio.play('click'); const k = sel.indexOf(it.id); if (k >= 0) sel.splice(k, 1); else if (sel.length < N) sel.push(it.id); draw(); };
          grid.appendChild(t);
        }
        body.appendChild(grid);
        go.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); onDone(sel.slice()); };
        foot.appendChild(go); sheet.appendChild(foot);
        draw();
      }, { width: '600px' });
    },

    ownedCount() { return BB.ITEMS.filter((i) => i.cat !== 'hidden' && BB.app.isOwned(i.id)).length; },

    openPvp() {
      const pv = M.pvpData(), k = M.rankOf(pv.rating), next = M.RANKS[k + 1];
      const lo = M.RANKS[k][0], pct = next ? Math.max(0, Math.min(100, ((pv.rating - lo) / (next[0] - lo)) * 100)) : 100;
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'PvP Arena');
        body.innerHTML += `<div class="pvp-hero" style="--rc:${M.RANKS[k][2]}">${M.rankHtml(pv.rating)}<div class="pvp-rating">${pv.rating}</div>
            <div class="pvp-rankbar"><i style="width:${pct}%"></i></div>
            <div class="pvp-rec">${next ? (next[0] - pv.rating) + ' to ' + next[1] : 'Top rank'} · ${pv.w} W · ${pv.d} D · ${pv.l} L</div></div>
          <div class="pvp-steps"><div><b>1</b><span>Pick 3 different balls in fight order</span></div><div><b>2</b><span>Send the challenge to a friend</span></div><div><b>3</b><span>All 3 rounds play. Most wins takes it</span></div></div>`;
        const go = document.createElement('button'); go.className = 'btn primary pvp-go'; go.innerHTML = BB.ICON.swords + ' Create a challenge';
        go.onclick = () => {
          BB.audio.play('click');
          if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to play PvP'); return; }
          M.pick3('Your PvP Squad', 'Round 1 uses your first pick, round 2 your second, round 3 your third. Your rival picks without seeing your squad.', (ids) => M.pvpCreated(ids));
        };
        body.appendChild(go);
        if (pv.hist.length) {
          body.innerHTML += `<div class="section-t">Recent series</div><div class="pvp-hist">${pv.hist.map((h) => `<div class="ph ${h.r > 0 ? 'w' : h.r < 0 ? 'l' : 'd'}"><span class="ph-r">${h.r > 0 ? 'WIN' : h.r < 0 ? 'LOSS' : 'DRAW'}</span><span class="ph-n">vs ${esc(h.n)}</span><b>${esc(h.s)}</b><small>${h.d >= 0 ? '+' : ''}${h.d}</small></div>`).join('')}</div>`;
          body.querySelector('.pvp-go').onclick = go.onclick;
        }
      }, { width: '460px' });
    },

    async pvpCreated(ids) {
      const rng = BB.RNG((Math.random() * 1e9) | 0);
      const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id);
      const seed = (rng() * 2147483647) | 0;
      const pv = M.pvpData();
      pv.sent.unshift(seed); pv.sent.length = Math.min(pv.sent.length, 20); BB.save.write();
      const code = M.encode3(ids, maps, seed, await M.myName());
      const link = BB.sdk.inviteLink({ pvp3: code });
      BB.sdk.showInvite({ pvp3: code });
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Challenge Ready!');
        body.innerHTML += `<div class="squad">${ids.map((id, k) => `<div class="sq-s"><em>Round ${k + 1}</em><img src="${BB.icon(id)}" alt=""><span>${esc(BB.ITEM[id].name)}</span></div>`).join('')}</div>
          <div class="f-s">Send this to a friend with the CrazyGames invite button or the link below. Your squad stays hidden until they lock in theirs. When they finish, they can send the result back to you.</div>`;
        const out = document.createElement('input'); out.className = 'pvp-link'; out.readOnly = true; out.value = link || 'Invites only work on CrazyGames';
        body.appendChild(out);
        const cp = document.createElement('button'); cp.className = 'btn green'; cp.textContent = 'Copy link';
        cp.onclick = async () => { try { await navigator.clipboard.writeText(out.value); BB.ui.toast('Link copied!'); } catch (e) { out.select(); } };
        body.appendChild(cp);
      }, { width: '480px', onClose: () => BB.sdk.hideInvite() });
    },

    pvpReceive(ch) {
      const pv = M.pvpData();
      if (pv.sent.includes(ch.seed)) { BB.ui.toast('That is your own challenge. Send it to a friend!'); return; }
      if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to answer PvP challenges'); return; }
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
        const go = document.createElement('button'); go.className = 'btn primary vs-go'; go.innerHTML = BB.ICON.play + ' Start round 1';
        go.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); M.vsSplash(); };
        sheet.appendChild(go);
      }, { width: '560px', onClose: () => { M.series = null; } });
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
        const go = document.createElement('button'); go.className = 'btn primary vs-go'; go.innerHTML = BB.ICON.play + ' Fight!';
        go.onclick = () => { BB.audio.play('start'); BB.ui.onClose = null; BB.ui.close(); M.pvpFight(); };
        sheet.appendChild(go);
      }, { width: '560px', onClose: () => { M.series = null; BB.app.toMenu(); } });
    },

    pvpFight() {
      const sr = M.series, k = sr.round, app = BB.app;
      app.event = {
        kind: 'pvp3', spectate: !!sr.spectate, seed: (sr.seed + k * 7919) | 0, map: sr.maps[k],
        teams: [[{ id: sr.mine[k], hp: 100, scale: 1, ov: {}, slot: 0 }], [{ id: sr.theirs[k], hp: 100, scale: 1, ov: {}, slot: 1 }]],
        onOver: (w) => M.pvpRound(w),
      };
      app.startBattle();
    },

    pvpRound(w) {
      const sr = M.series, app = BB.app;
      app.event = null;
      if (!sr) { app.toMenu(); return; }
      sr.results.push(w);
      if (w === 0) sr.score[0]++; else if (w === 1) sr.score[1]++;
      sr.round++;
      // every round is played, even when the series is already decided
      if (sr.round < 3) { BB.audio.play(w === 0 ? 'win' : 'lose'); M.vsSplash(); return; }
      if (sr.spectate) { M.series = null; M.pvpResultScreen(sr.view); return; }
      const pv = M.pvpData();
      const won = sr.score[0] > sr.score[1], draw = sr.score[0] === sr.score[1];
      const delta = M.applyRating(pv, sr.foeRating, won ? 1 : draw ? 0.5 : 0);
      M.pushHist(pv, sr.foeName, sr.score[0] + '-' + sr.score[1], delta, won ? 1 : draw ? 0 : -1);
      const coinsWon = won ? 150 : draw ? 80 : 50;
      BB.save.data.coins += coinsWon; BB.save.write(); app.refreshCoins();
      BB.audio.play(won ? 'win' : 'lose');
      if (won) BB.sdk.happytime();
      M.seriesEnd(sr, { won, draw, delta, coinsWon, canReply: true });
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
            const code = M.encodeR(sr, await M.myName());
            const link = BB.sdk.inviteLink({ pvp3r: code });
            BB.sdk.showInvite({ pvp3r: code });
            if (link) { try { await navigator.clipboard.writeText(link); BB.ui.toast('Result link copied! Send it to ' + sr.foeName); } catch (e) { BB.ui.toast('Use the invite button to send the result'); } }
            else BB.ui.toast('Result links only work on CrazyGames');
          };
          foot.append(send);
        }
        if (o.watch) {
          const wb = document.createElement('button'); wb.className = 'btn blue'; wb.innerHTML = BB.ICON.play + ' Watch the series';
          wb.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); o.watch(); };
          foot.append(wb);
        }
        const re = document.createElement('button'); re.className = 'btn primary'; re.textContent = 'New challenge';
        re.onclick = () => { BB.sdk.hideInvite(); BB.ui.onClose = null; BB.ui.close(); M.series = null; BB.app.toMenu(); M.pick3('Your PvP Squad', 'Pick 3 different balls in fight order.', (ids) => M.pvpCreated(ids)); };
        const ok = document.createElement('button'); ok.className = 'btn green'; ok.textContent = 'Menu';
        ok.onclick = () => { BB.sdk.hideInvite(); M.series = null; BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => BB.app.toMenu()); };
        foot.append(re, ok); sheet.appendChild(foot);
      }, { width: '460px', onClose: () => { BB.sdk.hideInvite(); M.series = null; BB.app.toMenu(); } });
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
          <div class="r-sub">${won ? 'HP carried over: ' + Math.ceil(g.hp) + ' / 100' : 'You reached stage ' + g.stage + ' · Best: ' + m.gauntletBest}</div>
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
