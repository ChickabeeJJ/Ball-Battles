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
    { id: 'cup1', text: 'Win a Cup match', goal: 1, reward: 100, ev: 'cupwin' },
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
      M.track('play', 1);
      M.track('map', sim.map.id);
      if (w === 0) {
        M.track('win', 1);
        const mine = sim.balls.filter((b) => b.main && b.team === 0 && !b.owner);
        if (mine.some((b) => b.def.cat === 'special')) M.track('specialwin', 1);
        if (!app.pvp && !app.event && (mode.teams[0].length > 1 || mode.teams.length > 2)) M.track('teamwin', 1);
        // mastery: every ball on the winning (your) side earns a win
        const seen = new Set();
        for (const b of mine) {
          if (seen.has(b.def.id) || BB.ITEM[b.def.id].cat === 'hidden') continue;
          seen.add(b.def.id);
          M.addMastery(b.def.id);
        }
      }
      BB.save.write();
    },

    stars(id) { const n = M.data().mastery[id] || 0; return STAR_AT.filter((x) => n >= x).length; },
    addMastery(id) {
      const m = M.data();
      const before = M.stars(id);
      m.mastery[id] = (m.mastery[id] || 0) + 1;
      const after = M.stars(id);
      if (after > before) {
        const r = STAR_REWARD[after - 1];
        BB.save.data.coins += r;
        setTimeout(() => BB.ui.toast(BB.ITEM[id].name + ' mastery ' + '★'.repeat(after) + '  +' + r + ' coins!', 2600), 900);
      }
    },
    starHtml(id) { const n = M.stars(id); return n ? '<span class="stars">' + '★'.repeat(n) + '</span>' : ''; },

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
      const pool = BB.ITEMS.filter((i) => i.cat !== 'hidden' && i.id !== 'dummy' && i.id !== exclude);
      const out = [];
      while (out.length < n) { const it = pool[Math.floor(rng() * pool.length)]; if (!out.includes(it.id)) out.push(it.id); }
      return out;
    },

    // ------------------------------------------------------------- Cup (8-ball bracket)
    openCup() {
      M.pickBall('Ball Cup', 'Pick your champion. Win 3 knockout rounds against 7 rivals to lift the trophy!', (id) => {
        const rng = BB.RNG((Math.random() * 1e9) | 0);
        const entrants = [id].concat(M.randomFoes(7, id, rng));
        M.cup = { rounds: [entrants], round: 0, me: id, rng, maps: ['classic', 'pillars', BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id] };
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
        for (let r = 0; r < 4; r++) {
          const col = document.createElement('div');
          col.className = 'br-col';
          col.innerHTML = `<div class="br-h">${names[r]}</div>`;
          const list = c.rounds[r] || new Array(8 >> r).fill(null);
          list.forEach((id) => {
            const me = id === c.me && c.alive !== false;
            col.innerHTML += `<div class="br-e${me ? ' me' : ''}${id ? '' : ' tbd'}">${id ? `<img src="${BB.icon(id)}" alt=""><span>${esc(BB.ITEM[id].name)}</span>` : '<span>?</span>'}</div>`;
          });
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
          const list = c.rounds[c.round], i = list.indexOf(c.me), foe = list[i ^ 1];
          const go = document.createElement('button'); go.className = 'btn primary';
          go.innerHTML = `Fight ${esc(BB.ITEM[foe].name)} · ${esc(BB.MAP[c.maps[c.round]].name)}`;
          go.onclick = () => { BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => M.cupFight(foe)); };
          foot.appendChild(go);
        }
        sheet.appendChild(foot);
      }, { width: '640px', onClose: () => { if (!M.cup || M.cup.done) BB.app.toMenu(); } });
    },

    cupFight(foe) {
      const c = M.cup;
      const app = BB.app;
      app.event = {
        kind: 'cup', seed: (c.rng() * 2147483647) | 0, map: c.maps[c.round],
        teams: [[{ id: c.me, hp: 100, scale: 1, ov: {}, slot: 0 }], [{ id: foe, hp: 100, scale: 1, ov: {}, slot: 1 }]],
        onOver: (w) => M.cupResult(w),
      };
      app.startBattle();
    },

    // headless sim for the other bracket matches
    quickDuel(a, b, seed, map) {
      const s = new BB.Sim({ seed, map, settings: { dmgNumbers: false }, teams: [[{ id: a, hp: 100, slot: 0 }], [{ id: b, hp: 100, slot: 1 }]] });
      while (!s.over && s.t < 150) { s.step(1 / 60); s.events.length = 0; s.fx.length = 0; }
      return s.over && s.over.winner === 1 ? b : a;
    },

    cupResult(w) {
      const c = M.cup, app = BB.app;
      app.event = null;
      const list = c.rounds[c.round];
      const won = w === 0;
      const prize = [25, 60, 0][c.round];
      if (won) {
        M.track('cupwin', 1);
        const next = [];
        for (let i = 0; i < list.length; i += 2) {
          if (list[i] === c.me || list[i + 1] === c.me) next.push(c.me);
          else next.push(M.quickDuel(list[i], list[i + 1], (c.rng() * 1e9) | 0, c.maps[c.round]));
        }
        c.rounds.push(next);
        c.round++;
        if (c.round === 3) {
          c.done = true;
          const m = M.data(); m.trophies++;
          BB.save.data.coins += 400; BB.save.write(); app.refreshCoins();
          BB.audio.play('win'); BB.sdk.happytime();
          M.showBracket('<b>CHAMPION!</b> +' + coin(400) + ' and a trophy!');
          return;
        }
        BB.save.data.coins += prize; BB.save.write(); app.refreshCoins(); BB.audio.play('win');
        M.showBracket('Round won! +' + coin(prize) + ' · Next up: the ' + ['Quarterfinal', 'Semifinal', 'Final'][c.round]);
      } else {
        c.done = true; c.alive = false;
        const consolation = [10, 30, 120][c.round];
        BB.save.data.coins += consolation; BB.save.write(); app.refreshCoins(); BB.audio.play('lose');
        M.showBracket('Knocked out in the ' + ['Quarterfinal', 'Semifinal', 'Final'][c.round] + '. +' + coin(consolation));
      }
    },

    // ------------------------------------------------------------- PvP 3v3 series (CrazyGames only)
    // Async head-to-head: a challenge link carries your 3 balls (+ maps and seed) via the
    // CrazyGames invite API. The friend picks 3 owned balls; a best-of-3 duel series plays out
    // deterministically, so both sides see identical fights.
    pvpData() { const m = M.data(); m.pvp = m.pvp || { rating: 1000, w: 0, l: 0 }; return m.pvp; },
    rankName(r) { return r >= 1400 ? 'Legend' : r >= 1250 ? 'Diamond' : r >= 1125 ? 'Gold' : r >= 1000 ? 'Silver' : 'Bronze'; },

    encode3(ids, maps, seed) { return [ids.join('.'), maps.join('.'), seed, M.pvpData().rating].join('~'); },
    decode3(code) {
      const p = String(code || '').split('~');
      if (p.length < 4) return null;
      const ids = p[0].split('.'), maps = p[1].split('.');
      if (ids.length !== 3 || maps.length !== 3) return null;
      if (!ids.every((id) => BB.ITEM[id] && BB.ITEM[id].cat !== 'hidden') || !maps.every((m) => BB.MAP[m])) return null;
      return { ids, maps, seed: (Number(p[2]) || 1) | 0, rating: Math.round(Number(p[3]) || 1000) };
    },

    pick3(title, sub, onDone) {
      const sel = [];
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, title);
        body.appendChild(Object.assign(document.createElement('div'), { className: 'f-s', textContent: sub }));
        const squad = document.createElement('div'); squad.className = 'squad';
        body.appendChild(squad);
        const grid = document.createElement('div'); grid.className = 'grid';
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        const go = document.createElement('button'); go.className = 'btn green'; go.textContent = 'Confirm squad'; go.disabled = true;
        const draw = () => {
          squad.innerHTML = [0, 1, 2].map((k) => sel[k] ? `<div class="sq-s"><img src="${BB.icon(sel[k])}" alt=""><span>${esc(BB.ITEM[sel[k]].name)}</span></div>` : `<div class="sq-s empty"><span>${k + 1}</span></div>`).join('');
          grid.querySelectorAll('.tile').forEach((t) => { const k = sel.indexOf(t.dataset.id); t.classList.toggle('sel', k >= 0); t.dataset.order = k >= 0 ? k + 1 : ''; });
          go.disabled = sel.length !== 3;
        };
        for (const it of BB.ITEMS.filter((i) => i.cat !== 'hidden' && BB.app.isOwned(i.id))) {
          const t = document.createElement('button');
          t.className = 'tile'; t.dataset.id = it.id;
          t.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><span class="t-n">${esc(it.name)}</span>${M.starHtml(it.id)}<span class="rar" style="background:${BB.RARITY[it.rarity].color}"></span>`;
          t.onclick = () => { BB.audio.play('click'); const k = sel.indexOf(it.id); if (k >= 0) sel.splice(k, 1); else if (sel.length < 3) sel.push(it.id); draw(); };
          grid.appendChild(t);
        }
        body.appendChild(grid);
        go.onclick = () => { BB.audio.play('click'); BB.ui.onClose = null; BB.ui.close(); onDone(sel.slice()); };
        foot.appendChild(go); sheet.appendChild(foot);
        draw();
      }, { width: '600px' });
    },

    openPvp() {
      const pv = M.pvpData();
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'PvP Arena');
        body.innerHTML += `<div class="pvp-hero"><div class="pvp-rank">${M.rankName(pv.rating)}</div><div class="pvp-rating">${pv.rating}</div>
          <div class="pvp-rec">${pv.w} W · ${pv.l} L</div></div>
          <div class="f-s">Pick 3 of your balls and challenge a friend. They answer with 3 of theirs and the best-of-3 decides it. Same fights on both screens.</div>`;
        const go = document.createElement('button'); go.className = 'btn primary pvp-go'; go.innerHTML = BB.ICON.swords + ' Create a challenge';
        go.onclick = () => { BB.audio.play('click'); M.pick3('Your PvP Squad', 'Choose 3 balls, in fight order.', (ids) => M.pvpCreated(ids)); };
        body.appendChild(go);
      }, { width: '440px' });
    },

    pvpCreated(ids) {
      const rng = BB.RNG((Math.random() * 1e9) | 0);
      const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id);
      const code = M.encode3(ids, maps, (rng() * 2147483647) | 0);
      const link = BB.sdk.inviteLink({ pvp3: code });
      BB.sdk.showInvite({ pvp3: code });
      BB.ui.open((sheet) => {
        const body = BB.ui.head(sheet, 'Challenge Ready!');
        body.innerHTML += `<div class="squad">${ids.map((id) => `<div class="sq-s"><img src="${BB.icon(id)}" alt=""><span>${esc(BB.ITEM[id].name)}</span></div>`).join('')}</div>
          <div class="f-s">Send this link to a friend. When they accept, the series starts on their screen, and their result link lets you watch it too.</div>`;
        const out = document.createElement('input'); out.className = 'pvp-link'; out.readOnly = true; out.value = link || 'Invites only work on CrazyGames';
        body.appendChild(out);
        const cp = document.createElement('button'); cp.className = 'btn green'; cp.textContent = 'Copy link';
        cp.onclick = async () => { try { await navigator.clipboard.writeText(out.value); BB.ui.toast('Link copied!'); } catch (e) { out.select(); } };
        body.appendChild(cp);
      }, { width: '480px', onClose: () => BB.sdk.hideInvite() });
    },

    pvpReceive(ch) {
      M.pick3('Challenge Received!', 'Your rival (' + M.rankName(ch.rating) + ' ' + ch.rating + ') sends: ' + ch.ids.map((i) => BB.ITEM[i].name).join(', ') + '. Pick your 3 to answer.', (mine) => {
        M.series = { mine, theirs: ch.ids, maps: ch.maps, seed: ch.seed, foeRating: ch.rating, round: 0, score: [0, 0], results: [] };
        M.vsSplash();
      });
    },

    vsSplash() {
      const sr = M.series, k = sr.round;
      const a = sr.mine[k], b = sr.theirs[k];
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet');
        sheet.innerHTML = `<div class="vs-round">ROUND ${k + 1} <span>${sr.score[0]} - ${sr.score[1]}</span></div>
          <div class="vs-row"><div class="vs-side me"><img src="${BB.icon(a, 160)}" alt=""><b style="color:${BB.itemColor(a)}">${esc(BB.ITEM[a].name)}</b><i>YOU</i></div>
          <div class="vs-x">VS</div>
          <div class="vs-side foe"><img src="${BB.icon(b, 160)}" alt=""><b style="color:${BB.itemColor(b)}">${esc(BB.ITEM[b].name)}</b><i>RIVAL</i></div></div>
          <div class="vs-map">${esc(BB.MAP[sr.maps[k]].name)}</div>`;
        const go = document.createElement('button'); go.className = 'btn primary vs-go'; go.innerHTML = BB.ICON.play + ' Fight!';
        go.onclick = () => { BB.audio.play('start'); BB.ui.onClose = null; BB.ui.close(); M.pvpFight(); };
        sheet.appendChild(go);
      }, { width: '560px' });
    },

    pvpFight() {
      const sr = M.series, k = sr.round, app = BB.app;
      app.event = {
        kind: 'pvp3', seed: (sr.seed + k * 7919) | 0, map: sr.maps[k],
        teams: [[{ id: sr.mine[k], hp: 100, scale: 1, ov: {}, slot: 0 }], [{ id: sr.theirs[k], hp: 100, scale: 1, ov: {}, slot: 1 }]],
        onOver: (w) => M.pvpRound(w),
      };
      app.startBattle();
    },

    pvpRound(w) {
      const sr = M.series, app = BB.app;
      app.event = null;
      sr.results.push(w);
      if (w === 0) sr.score[0]++; else if (w === 1) sr.score[1]++;
      sr.round++;
      const done = sr.score[0] >= 2 || sr.score[1] >= 2 || sr.round >= 3;
      if (!done) { BB.audio.play(w === 0 ? 'win' : 'lose'); M.vsSplash(); return; }
      const pv = M.pvpData();
      const won = sr.score[0] > sr.score[1], draw = sr.score[0] === sr.score[1];
      const exp = 1 / (1 + Math.pow(10, (sr.foeRating - pv.rating) / 400));
      const delta = draw ? 0 : Math.round(40 * ((won ? 1 : 0) - exp));
      pv.rating = Math.max(0, pv.rating + delta);
      if (won) pv.w++; else if (!draw) pv.l++;
      const coinsWon = won ? 150 : draw ? 60 : 40;
      BB.save.data.coins += coinsWon; BB.save.write(); app.refreshCoins();
      BB.audio.play(won ? 'win' : 'lose');
      if (won) BB.sdk.happytime();
      BB.ui.open((sheet) => {
        const body = document.createElement('div'); body.className = 'sh-body';
        body.innerHTML = `<div class="result"><div class="r-t" style="color:${won ? '#35d047' : draw ? '#ffd23f' : '#f0545a'}">${won ? 'Victory!' : draw ? 'Draw!' : 'Defeat'}</div>
          <div class="series">${sr.results.map((r, i) => `<div class="se ${r === 0 ? 'w' : r === 1 ? 'l' : 'd'}"><img src="${BB.icon(sr.mine[i])}" alt=""><span>${r === 0 ? 'W' : r === 1 ? 'L' : 'D'}</span><img src="${BB.icon(sr.theirs[i])}" alt=""></div>`).join('')}</div>
          <div class="pvp-rating">${pv.rating} <small class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</small></div>
          <div class="r-sub">${M.rankName(pv.rating)} · ${pv.w} W ${pv.l} L</div>
          <div class="r-coins">+${coin(coinsWon)}</div></div>`;
        sheet.appendChild(body);
        const foot = document.createElement('div'); foot.className = 'sh-foot';
        const re = document.createElement('button'); re.className = 'btn primary'; re.textContent = 'Send a rematch';
        re.onclick = () => { BB.ui.onClose = null; BB.ui.close(); M.pvpCreated(sr.mine); };
        const ok = document.createElement('button'); ok.className = 'btn green'; ok.textContent = 'Menu';
        ok.onclick = () => { M.series = null; BB.ui.onClose = null; BB.ui.close(); BB.sdk.maybeMidgame().then(() => BB.app.toMenu()); };
        foot.append(re, ok); sheet.appendChild(foot);
      }, { width: '440px', onClose: () => { M.series = null; BB.app.toMenu(); } });
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
      meBall.hp = Math.max(1, Math.round(g.hp));
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
