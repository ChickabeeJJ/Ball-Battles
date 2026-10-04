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
    claimGift() {
      const m = M.data();
      if (m.gift.day === today()) {
        BB.ui.toast('Next gift tomorrow · streak ' + m.gift.streak + ' day' + (m.gift.streak === 1 ? '' : 's'));
        return;
      }
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yesterday = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      m.gift.streak = m.gift.day === yesterday ? m.gift.streak + 1 : 1;
      m.gift.day = today();
      const amt = Math.min(40 + m.gift.streak * 20, 200);
      BB.save.data.coins += amt;
      BB.save.write();
      BB.app.refreshCoins();
      BB.audio.play('coin');
      BB.ui.toast('Daily gift: +' + amt + ' coins · day ' + m.gift.streak + ' streak!', 2400);
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
        const body = BB.ui.head(sheet, '🏆 Ball Cup', { onX: () => { M.cup = null; BB.ui.close(); } });
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
          M.showBracket('<b>CHAMPION!</b> +' + coin(400) + ' and a trophy 🏆');
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
