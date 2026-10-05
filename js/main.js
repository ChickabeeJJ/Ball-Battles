// App controller: boot, layout, game loop, input and CrazyGames lifecycle events.
(function () {
  const BB = window.BB;
  const $ = (id) => document.getElementById(id);
  const STEP = 1 / 120;
  const D2R = Math.PI / 180;

  const App = (BB.app = {
    state: 'boot',
    sim: null,
    preview: null,
    paused: false,
    trials: {},
    keys: {},
    joy: { x: 0, y: 0, active: false },
    aim: null,
    acc: 0,
    last: 0,
    capture: /[?&]capture\b/.test(location.search),

    // Loader: five segments, one per real boot stage. Inside the current stage the bar keeps
    // creeping toward the segment's end so it never sits still, and a time floor (~1.1s, just past the final clash of the
    // length of the intro fight) keeps it from snapping straight to 100%. Tap or key skips.
    loader: {
      STAGES: ['Contacting the arena', 'Loading your save', 'Sharpening blades', 'Building the arena', 'Polishing balls'],
      t0: performance.now(), stage: 0, sub: 0, stageT: performance.now(), shown: 0, raf: 0, lastDone: -1,
      tick() {
        const L = App.loader, now = performance.now(), N = L.STAGES.length;
        const tk = Math.min(1, (now - L.t0) / 1100);
        const timeCap = App.capture ? 1 : 1 - Math.pow(1 - tk, 2);
        const creep = L.stage >= N ? 0 : Math.max(L.sub, 0.88 * (1 - Math.exp(-(now - L.stageT) / 600)));
        const realCap = Math.min(1, (L.stage + creep) / N);
        const cap = Math.min(timeCap, realCap);
        if (cap > L.shown) { L.shown += (cap - L.shown) * 0.24; if (cap - L.shown < 0.002) L.shown = cap; }
        const cells = document.querySelectorAll('#ldBar > i');
        const done = Math.min(N, Math.floor(L.shown * N + 1e-6));
        cells.forEach((c, j) => { c.firstChild.style.transform = 'scaleX(' + Math.max(0, Math.min(1, L.shown * N - j)).toFixed(3) + ')'; });
        for (let j = L.lastDone + 1; j < done; j++) if (cells[j]) cells[j].classList.add('done');
        L.lastDone = Math.max(L.lastDone, done - 1);
        const idx = Math.min(N - 1, done);
        const p = document.getElementById('ldPct'), tip = document.getElementById('ldTip'), st = document.getElementById('ldStep');
        if (p) p.textContent = Math.round(L.shown * 100) + '%';
        if (tip) tip.textContent = L.shown >= 1 ? 'Ready!' : L.STAGES[idx] + '...';
        if (st) st.textContent = Math.min(N, idx + 1) + '/' + N;
        L.raf = L.shown < 1 ? requestAnimationFrame(L.tick) : 0;
      },
      // stage k finished (sub = progress inside the next stage, 0..1)
      set(k, sub) {
        if (k > this.stage) { this.stage = k; this.stageT = performance.now(); this.sub = 0; }
        if (sub != null) this.sub = Math.max(this.sub, Math.min(0.99, sub));
        if (!this.raf) this.raf = requestAnimationFrame(this.tick);
      },
      async done() {
        const el = document.getElementById('loader');
        if (!el) return;
        this.set(this.STAGES.length);
        await new Promise((r) => {
          const skip = () => { this.shown = 1; this.tick(); r(); };
          const chk = () => (this.shown >= 1 ? setTimeout(r, 80) : requestAnimationFrame(chk));
          if (App.capture) { skip(); return; }
          chk(); el.addEventListener('pointerdown', skip, { once: true }); window.addEventListener('keydown', skip, { once: true });
        });
        el.classList.add('out');
        setTimeout(() => el.remove(), 300);
      },
    },

    async boot() {
      const ld = document.getElementById('loader');
      App.loader.set(0);
      await BB.sdk.init();
      App.loader.set(1);
      BB.sdk.loadingStart();
      BB.save.load();
      // music starts as soon as the game loads (or on the first touch if the browser blocks autoplay)
      App.applyAudio();
      BB.music.start();
      App.loader.set(2);

      try {
        await Promise.race([Promise.all([document.fonts.load('20px Anton'), document.fonts.load('20px "Pixelify Sans"')]), new Promise((r) => setTimeout(r, 300))]);
      } catch (e) { /* fall back to system font */ }
      App.loader.set(3);

      App.renderer = new BB.Renderer($('arena'));
      App.applySettings();
      App.bindUI();
      App.bindInput();
      App.layout();
      App.toMenu();
      App.loader.set(4);

      BB.sdk.on('adStart', () => { App.applyAudio(); });
      BB.sdk.on('adEnd', () => { App.applyAudio(); App.last = performance.now(); });
      BB.sdk.on('settings', () => App.applyAudio());

      BB.sdk.loadingStop();
      if (!App.capture) requestAnimationFrame(App.frame);
      await App.loader.done();
      // warm the icon cache in idle time after the menu is up, so loading isn't held up by it
      const ids = BB.ITEMS.filter((i) => i.cat !== 'hidden').map((i) => i.id);
      const warm = () => { const t0 = performance.now(); while (ids.length && performance.now() - t0 < 8) BB.icon(ids.shift()); if (ids.length) setTimeout(warm, 30); };
      setTimeout(warm, 200);
      BB.meta.refreshBadges();
      $('btnProfile').classList.toggle('hidden', !App.pvpAvailable());
      document.documentElement.classList.toggle('touch', matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
      document.querySelectorAll('[data-ico]').forEach((e) => { e.innerHTML = BB.ICON[e.dataset.ico]; });
      // CrazyGames players get the PvP Arena in place of the Gauntlet
      $('optPvp').classList.add('hidden');
      if (App.pvpAvailable()) {
        const g = $('btnGauntlet');
        g.id = 'btnPvp'; g.classList.add('feat-pvp');
        g.innerHTML = '<span class="feat-ic">' + BB.ICON.swords + '</span><span>PvP</span>';
        g.onclick = () => { BB.audio.unlock(); BB.audio.play('click'); BB.meta.openPvp(); };
      }
      // A friend's challenge link takes priority; otherwise first-time players get the tutorial.
      const res3 = App.pvpAvailable() ? BB.meta.decodeR(BB.sdk.getInviteParam('pvp3r')) : null;
      const ch3 = App.pvpAvailable() && !res3 ? BB.meta.decode3(BB.sdk.getInviteParam('pvp3')) : null;
      const ch = !ch3 && App.pvpAvailable() ? App.decodeChallenge(BB.sdk.getInviteParam('pvp')) : null;
      if (res3) BB.meta.pvpResult(res3);
      else if (ch3) BB.meta.pvpReceive(ch3);
      else if (ch) BB.ui.pvpReceive(ch);
      else if (!BB.save.data.tutorialDone && !App.capture) setTimeout(() => BB.ui.tutorial(), 400);
    },

    // ------------------------------------------------------------- helpers
    mode() { return BB.MODE[BB.save.data.setup.mode]; },
    teamOfSlot(i) { return App.mode().teams.findIndex((t) => t.includes(i)); },
    isOwned(id) { return !!(BB.save.data.unlocked[id] || App.trials[id]); },

    applySettings() {
      const st = BB.save.data.settings;
      document.body.classList.toggle('dark', !!st.dark);
      if (App.renderer) App.renderer.dark = !!st.dark;
      App.applyAudio();
    },
    applyAudio() {
      BB.audio.volume = BB.save.data.settings.sound;
      BB.music.volume = BB.save.data.settings.music != null ? BB.save.data.settings.music : 0.5;
      BB.audio.setBlocked(BB.sdk.muteAudio || BB.sdk.adPlaying || document.hidden);
    },
    refreshCoins() { $('coinCount').textContent = BB.save.data.coins; if (BB.meta) BB.meta.refreshBadges(); },
    refreshSpeed() { $('btnSpeed').textContent = (BB.save.data.settings.speed || 1) + 'x'; },

    vibrate(ms) {
      if (!BB.save.data.settings.vibrate || !navigator.vibrate) return;
      try { navigator.vibrate(ms); } catch (e) { /* ignore */ }
    },

    rewarded() {
      BB.sdk.gameplayStop();
      return BB.sdk.rewarded();
    },

    // ------------------------------------------------------------- layout
    layout() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const land = vw / vh >= 1.2;
      // UI scale so menus are not phone-sized on big screens (CSS zoom on the chrome around the arena).
      const ui = land ? BB.clamp(Math.min(vh / 760, vw / 1350), 1, 1.7) : BB.clamp(Math.min(vw / 440, vh / 900), 1, 2);
      document.documentElement.style.setProperty('--ui', ui);
      const teamMode = App.mode().teams[0].length > 1 || App.mode().teams.length > 2;
      // Phone landscape: the top bar moves over the side panel so the arena gets the full height.
      const cland = land && vh <= 500;
      document.documentElement.classList.toggle('cland', cland);
      document.documentElement.classList.toggle('cport', !land && vw <= 430);
      const top = cland ? 0 : (land && vh <= 520 ? 44 : 52) * ui;
      const header = (cland ? 30 : 46) * ui, stats = (cland ? (teamMode ? 50 : 34) : (teamMode ? 70 : 58)) * ui;
      let S;
      const inBattle = App.state === 'battle';
      if (inBattle) {
        // nothing to show beside the arena mid-fight: give it the whole screen
        const t2 = cland ? 0 : top;
        S = Math.min(vh - t2 - header - stats - 16, vw - 24);
      } else if (cland) {
        S = Math.min(vh - header - stats - 14, vw * 0.52);
        const pw = Math.max(240, Math.min(420, vw - S - 44));
        document.documentElement.style.setProperty('--panelw', pw + 'px');
      } else if (land) {
        const pw = BB.clamp(Math.round(vw * 0.32 / ui), 250, 400);
        document.documentElement.style.setProperty('--panelw', pw + 'px');
        S = Math.min(vh - top - header - stats - 14, vw - pw * ui - 28 - 40);
      } else {
        const panel = (teamMode ? 300 : 270) * ui;
        S = Math.min(vw - 24, vh - top - header - stats - 12 - panel);
      }
      S = Math.max(150, Math.floor(S));
      document.documentElement.style.setProperty('--arena', S + 'px');
      App.renderer.resize(S);
      if (App.preview || App.sim) App.fitMatchup();
      App.draw();
    },

    // ------------------------------------------------------------- menu
    buildTeams() {
      const setup = BB.save.data.setup;
      return App.mode().teams.map((t) => t.map((i) => Object.assign({}, setup.slots[i], { ov: Object.assign({}, setup.slots[i].ov), slot: i })));
    },

    refreshMenu() {
      const setup = BB.save.data.setup;
      // Slots on your team must be owned; trials expire after a battle.
      for (const t of App.mode().teams) for (const i of t) if (!App.isOwned(setup.slots[i].id)) setup.slots[i].id = i % 2 ? 'sword' : 'unarmed';
      App.preview = new BB.Sim({ seed: 7, map: setup.map, teams: App.buildTeams(), settings: BB.save.data.settings });
      App.preview.preview = true;
      for (const b of App.preview.balls) { b.w.angle = [-2.3, -0.85, -0.85, -2.3][b.team] + (b.slot % 3) * 0.25; App.preview.computeCaps(b); }
      App.renderSlots();
      App.renderMatchup(App.preview);
      App.renderStats(App.preview, true);
      $('optModeV').textContent = App.mode().name;
      $('optMapV').textContent = BB.MAP[setup.map].name;
      $('optControlV').textContent = setup.control ? 'On' : 'Off';
      $('optControl').classList.toggle('on', !!setup.control);
      App.refreshCoins();
      App.layout();
    },

    renderSlots() {
      const wrap = $('slots');
      const mode = App.mode(), setup = BB.save.data.setup;
      wrap.innerHTML = '';
      wrap.classList.toggle('compact', mode.teams[0].length > 1 || mode.teams.length > 2);
      const slotBtn = (i, team) => {
        const s = setup.slots[i], it = BB.ITEM[s.id];
        const b = document.createElement('button');
        b.className = 'slot';
        b.style.borderLeftColor = BB.itemColor(s.id);
        b.setAttribute('aria-label', 'Edit ' + BB.TEAMS[team].name + ' ' + it.name);
        b.innerHTML = `<img src="${BB.icon(s.id)}" alt=""><span class="sl-t"><span class="sl-n">${it.name}${BB.meta.starHtml(s.id)}</span><span class="sl-s">HP ${it.fixedHp || s.hp}${s.scale !== 1 ? ' · x' + s.scale : ''} · Edit</span></span><span class="dot" style="background:${BB.TEAMS[team].fill}"></span>`;
        b.onclick = () => { BB.audio.unlock(); BB.audio.play('click'); BB.ui.editSlot(i); };
        return b;
      };
      if (mode.teams.length === 2) {
        mode.teams.forEach((t, ti) => {
          const col = document.createElement('div');
          col.className = 'team-col';
          t.forEach((i) => col.appendChild(slotBtn(i, ti)));
          wrap.appendChild(col);
          if (ti === 0) { const vs = document.createElement('div'); vs.className = 'vs-mid'; vs.textContent = 'VS'; wrap.appendChild(vs); }
        });
      } else {
        const a = document.createElement('div'), b = document.createElement('div');
        a.className = b.className = 'team-col';
        mode.teams.forEach((t, ti) => (ti % 2 ? b : a).appendChild(slotBtn(t[0], ti)));
        wrap.append(a, b);
      }
    },

    renderMatchup(sim) {
      const m = $('matchup');
      const mode = App.mode();
      const name = (b) => `<img src="${BB.icon(b.def.id)}" alt=""><span class="nm" style="color:${BB.itemColor(b.def.id)}">${b.def.name}</span>`;
      const mains = sim.balls.filter((b) => b.main);
      // the two sides get equal columns so "VS" always sits dead centre
      const side = (cls, html) => `<span class="mu-side ${cls}">${html}</span>`;
      if (mode.id === '1v1' || mains.length === 2) m.innerHTML = side('l', name(mains[0])) + '<span class="vs">VS</span>' + side('r', name(mains[1]));
      else if (mode.id === 'ffa') m.innerHTML = '<span class="nm" style="color:#fff">Free For All</span>';
      else m.innerHTML = side('l', `<span class="nm" style="color:${BB.TEAMS[0].fill}">Green Team</span>`) + '<span class="vs">VS</span>' + side('r', `<span class="nm" style="color:${BB.TEAMS[1].fill}">Red Team</span>`);
      App.fitMatchup();
    },

    // Shrink the header font until "A VS B" fits the arena width (long names on phones).
    fitMatchup() {
      const m = $('matchup');
      m.style.fontSize = '';
      const max = parseFloat(getComputedStyle(m).fontSize);
      let fs = max;
      // Fit against the space actually available (arena width + a little), not the header's own box.
      const ui = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
      const avail = Math.min(window.innerWidth - 16, (App.renderer ? App.renderer.px : 400) + 40) / ui;
      const need = () => { const l = m.querySelector('.mu-side.l'), r = m.querySelector('.mu-side.r'), v = m.querySelector('.vs');
        return l && r && v ? 2 * Math.max(l.scrollWidth, r.scrollWidth) + v.offsetWidth + 24 : m.scrollWidth; };
      while (need() > avail && fs > 11) { fs -= 1; m.style.fontSize = fs + 'px'; }
      m.querySelectorAll('img').forEach((i) => { i.style.width = i.style.height = Math.round(fs * 1.1) + 'px'; });
    },

    renderStats(sim, force) {
      const row = $('statRow');
      const mains = sim.balls.filter((b) => b.main);
      const one = mains.length === 2;
      let html = '';
      if (!one) {
        // team modes: a compact roster, one column per team, one slim line per ball
        const teams = [...new Set(mains.map((b) => b.team))].sort();
        html = teams.map((t) => `<div class="tcol" style="--tc:${BB.TEAMS[t].fill}">` + mains.filter((b) => b.team === t).map((b) => {
          const pct = Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100)).toFixed(1), key = (sim.stats(b)[0] || '').replace(/^[^:]+: /, '');
          const grace = b.def.kami ? `<i class="tgr" style="width:${Math.round(b.w.grace)}%"></i>` : '';
          return `<div class="tr${b.alive ? '' : ' out'}" title="${b.def.name}"><img src="${BB.icon(b.def.id)}" alt=""><span class="hpbar"><i style="width:${pct}%;background:${BB.TEAMS[t].fill}"></i><b>${Math.ceil(b.hp)}</b>${grace}</span><em>${key}</em></div>`;
        }).join('') + '</div>').join('');
        if (force || html !== App._lastStats) { App._lastStats = html; row.innerHTML = html; row.classList.add('team'); row.dataset.n = teams.length; }
        return;
      }
      for (const b of mains) {
        const lines = sim.stats(b);
        const txt = (one ? '' : b.def.name + ': ') + (lines.join(' · ') || '');
        const pct = Math.max(0, Math.min(100, (b.hp / b.maxHp) * 100)).toFixed(1);
        const c = one ? BB.itemColor(b.def.id) : BB.TEAMS[b.team].fill;
        const grace = b.def.kami ? `<span class="grbar${b.w.grace < BB.KAMI.GRACE.cost ? ' low' : ''}"><i style="width:${Math.round(b.w.grace)}%"></i></span>` : '';
        html += `<span class="st" style="color:${c};${b.alive ? '' : 'opacity:.35'}"><span class="hpbar"><i style="width:${pct}%;background:${c}"></i><b>${Math.ceil(b.hp)}</b></span>${grace}${txt}</span>`;
      }
      if (force || html !== App._lastStats) {
        App._lastStats = html;
        row.innerHTML = html;
        row.classList.toggle('team', !one);
      }
    },

    toMenu() {
      App.state = 'menu';
      App.sim = null;
      App.paused = false;
      BB.sdk.gameplayStop();
      $('app').className = 'is-menu';
      App.refreshMenu();
    },

    drawMapPreview(cv, mapId) {
      const px = cv.clientWidth || 120;
      const r = new BB.Renderer(cv);
      r.dark = App.renderer.dark;
      r.resize(px);
      cv.style.width = ''; cv.style.height = '';
      const s = new BB.Sim({ seed: 3, map: mapId, teams: [[{ id: 'sword', hp: 100, slot: 0 }], [{ id: 'dagger', hp: 100, slot: 1 }]], settings: { dmgNumbers: false } });
      for (let i = 0; i < 120; i++) s.step(STEP);
      if (mapId === 'meteor') { s.meteors.push({ x: 60, y: -80, t: 0.5, max: 1.1, r: 66 }); }
      s.fx.length = 0;
      r.draw(s);
    },

    // ------------------------------------------------------------- battle
    // ------------------------------------------------------------- PvP (CrazyGames invite links)
    // Battles are deterministic from (seed, map, loadouts), so a challenge link carries the
    // challenger's ball; the friend picks a counter and both see the exact same fight.
    pvpAvailable() { return BB.sdk.env === 'crazygames'; },
    adsAvailable() { return BB.sdk.env === 'crazygames'; },
    encodeChallenge(slot, map, name) {
      const ov = slot.ov || {};
      return [slot.id, slot.hp, slot.scale, ov.damage || 0, ov.spin || 0, ov.speed || 0, map, (Math.random() * 2147483647) | 0, (name || 'Friend').replace(/[^\w ]/g, '').slice(0, 14)].join('~');
    },
    decodeChallenge(code) {
      const p = String(code || '').split('~');
      if (p.length < 9 || !BB.ITEM[p[0]] || BB.ITEM[p[0]].cat === 'hidden' || !BB.MAP[p[6]]) return null;
      const n = (v, a, b, d) => { v = Number(v); return isFinite(v) ? BB.clamp(v, a, b) : d; };
      return {
        slot: { id: p[0], hp: n(p[1], 1, 9999, 100), scale: n(p[2], 0.5, 2.5, 1), ov: { damage: n(p[3], 0, 999, 0), spin: n(p[4], 0, 3000, 0), speed: n(p[5], 0, 2000, 0) } },
        map: p[6], seed: n(p[7], 0, 2147483647, 1) | 0, name: p[8] || 'Friend',
      };
    },
    startPvp(ch, mySlot) {
      App.pvp = {
        seed: ch.seed, map: ch.map, foeName: ch.name,
        teams: [[Object.assign({}, mySlot, { ov: Object.assign({}, mySlot.ov), slot: 0 })], [Object.assign({}, ch.slot, { slot: 1 })]],
      };
      App.startBattle();
    },

    startBattle() {
      App.slowmo = 0; App.shake = 0; App.impact = null; App.lastKO = null;
      BB.audio.unlock();
      const setup = BB.save.data.setup;
      const mode = App.mode();
      const cu = App.pvp || App.event;
      App.seed = cu ? cu.seed : (Math.random() * 2147483647) | 0;
      App.sim = new BB.Sim({
        seed: App.seed, map: cu ? cu.map : setup.map, teams: cu ? cu.teams : App.buildTeams(),
        // seeded PvP/event rounds always use overtime so both players see the same fight
        settings: cu ? Object.assign({}, BB.save.data.settings, { overtime: true, reverseB: false }) : BB.save.data.settings, controlSlot: null,
      });
      void mode;
      App.maxHit = 0;
      App.state = 'battle';
      App.paused = false;
      App.acc = 0;
      App.resultsShown = false;
      $('app').className = 'is-battle';
      $('app').classList.toggle('no-pause', !!(App.event && App.event.kind === 'pvp3'));
      BB.sdk.hideInvite();
      App.layout();
      App.renderMatchup(App.sim);
      App.renderStats(App.sim, true);
      App.refreshSpeed();
      BB.audio.play('start');
      BB.ui.banner('FIGHT!', 700);
      BB.sdk.gameplayStart();
    },

    pause() {
      if (App.state !== 'battle' || App.paused || App.resultsShown) return;
      if (App.event && App.event.kind === 'pvp3') return; // PvP rounds can't be paused
      App.paused = true;
      BB.sdk.gameplayStop();
      BB.ui.pause();
    },

    resume() {
      BB.ui.onClose = null;
      BB.ui.close();
      if (App.state !== 'battle') return;
      App.paused = false;
      App.last = performance.now();
      BB.sdk.gameplayStart();
    },

    onSettingsClosed() {
      App.applySettings();
      App.pausedSettings = false;
      if (App.state === 'battle' && App.paused && !App.resultsShown) App.resume();
    },

    onOver() {
      App.resultsShown = true;
      BB.sdk.gameplayStop();
      const sim = App.sim, save = BB.save.data, mode = App.mode();
      const w = sim.over.winner;
      save.stats.battles++;
      BB.meta.afterBattle(sim, w);
      if (App.event) { App.event.onOver(w, sim); BB.save.write(); return; }
      let title, sub, icon = null, coins;
      if (w < 0) {
        title = 'Draw!'; sub = 'Everyone got knocked out!'; coins = 50;
        BB.audio.play('lose');
      } else {
        const winners = sim.balls.filter((b) => b.main && b.team === w);
        if (App.pvp || App.event || mode.teams[0].length === 1) { title = winners[0].def.name + ' Wins!'; icon = winners[0].def.id; }
        else { title = BB.TEAMS[w].name + ' Team Wins!'; icon = winners[0].def.id; }
        if (w === 0) {
          coins = 50;
          sub = 'What a fight!';
          save.stats.wins++;
          BB.audio.play('win');
        } else {
          coins = 50;
          sub = 'What a fight!';
          BB.audio.play('lose');
        }
      }
      save.coins += coins;
      App.trials = {};
      BB.save.write();
      App.refreshCoins();
      let pvp = null;
      if (App.pvp) {
        pvp = App.pvp;
        sub = w === 0 ? 'You beat ' + pvp.foeName + '\'s challenge!' : w < 0 ? 'A perfect tie!' : pvp.foeName + '\'s ball won this time.';
        if (w === 0) BB.sdk.happytime();
      }
      const stats = 'Battle time ' + Math.round(sim.t) + 's · Biggest hit ' + BB.fmt(App.maxHit);
      setTimeout(() => BB.ui.results({ winner: w, title, sub, icon, coins, stats, pvp }), 300);
    },

    async afterResults(rematch) {
      await BB.sdk.maybeMidgame();
      if (App.pvp && !rematch) App.pvp = null;
      if (rematch) { App.refreshMenu(); App.startBattle(); }
      else App.toMenu();
    },

    handleEvents(sim) {
      for (const e of sim.events) {
        switch (e.type) {
          case 'hit':
            BB.meta.track('damage', e.amt);
            if (e.amt >= 15) BB.meta.track('bighit', 1);
            App.shake = Math.min(14, (App.shake || 0) + Math.min(10, 1.5 + e.amt * 0.5));
            BB.audio.play('hit', e);
            if (e.amt > App.maxHit) App.maxHit = e.amt;
            if (BB.save.data.setup.control && e.team === 0) App.vibrate(25);
            break;
          case 'dot': BB.audio.play('dot'); break;
          case 'parry': BB.audio.play('parry', e); break;
          case 'wall': BB.audio.play('wall'); break;
          case 'bump': BB.audio.play('bump'); break;
          case 'shoot': BB.audio.play('shoot', e); break;
          case 'boom': BB.audio.play('boom', e); App.vibrate(30); break;
          case 'death': BB.audio.play('death'); if (e.main) App.vibrate(60); if (e.main && e.kami) App.kamiKill = true; break;
          case 'kami': {
            const cine = BB.save.data.settings.kamiCine !== false;
            if (e.k === 'dodge') { BB.audio.play('kamiDodge'); break; }
            if (e.k === 'beamfire') { BB.audio.play('kamiBeam'); App.shake = 16; App.vibrate(40); break; }
            if (e.k === 'gateslam') { BB.audio.play('kamiSlam'); App.shake = 12; App.vibrate(30); break; }
            BB.audio.play(e.k === 'gate' ? 'kamiGate' : 'kamiCast');
            // anime cut-in for each divine art (sim pauses while it plays)
            if (cine && !App.impact) App.impact = { t: 0, dur: 0.9, kamiCut: true, k: e.k, x: e.x, y: e.y, seed: (Math.random() * 1e6) | 0 };
            break;
          }
          case 'build': BB.audio.play('build'); break;
          case 'break': BB.audio.play('break'); break;
          case 'pass': BB.audio.play('pass'); break;
          case 'overtime': BB.audio.play('overtime'); BB.ui.banner('OVERTIME x' + e.mul, 1000); break;
          case 'impact':
            // Hits (any damage, even 100+) only ever get the short black cut (Impact Frames setting).
            // The full finisher is never started here: it plays on the 'ko' event, i.e. only when
            // the match is actually over, so a big hit, a revive or a dead mini can't trigger it.
            {
              if (e.ko) { App.lastKO = { x: e.x, y: e.y }; break; }
              const st = BB.save.data.settings;
              if (st.impact && !App.impact && !(App.impactCd > 0) && Math.random() < 0.8) {
                App.impact = { t: 0, dur: 0.18, x: e.x, y: e.y, seed: (Math.random() * 1e6) | 0, ko: false };
                App.impactCd = 0.45;
              }
            }
            break;
          case 'ko':
            App.slowmo = 1.1; App.shake = 14;
            // Kami's own finisher replaces the regular one
            if (App.kamiKill && e.winner >= 0 && BB.save.data.settings.finisher) {
              const foe = sim.balls.find((b) => b.main && !b.alive && b.team !== e.winner);
              App.impact = { t: 0, dur: 2.8, kamiFin: true, x: 0, y: 0, seed: (Math.random() * 1e6) | 0, foe: foe ? BB.itemColor(foe.def.id) : '#e8473f' };
              BB.audio.play('kamiFinisher');
              setTimeout(() => BB.ui.banner('K.O.!', 900), 2700);
            } else if (e.timeup) {
              BB.ui.banner(e.winner < 0 ? 'DRAW!' : 'TIME UP!', 1000);
            } else {
              BB.ui.banner(e.winner < 0 ? 'DRAW!' : 'K.O.!', 1000);
              const at = App.lastKO || { x: 0, y: 0 };
              if (BB.save.data.settings.finisher) App.impact = { t: 0, dur: 1.0, x: at.x, y: at.y, seed: (Math.random() * 1e6) | 0, ko: true };
            }
            break;
        }
      }
      sim.events.length = 0;
      App.kamiKill = false;
    },

    // ------------------------------------------------------------- loop
    frame(ts) {
      const dt = Math.min(0.05, Math.max(0, (ts - (App.last || ts)) / 1000));
      App.last = ts;
      App.tick(dt);
      requestAnimationFrame(App.frame);
    },

    tick(dt) {
      if (App.state === 'battle' && App.sim) {
        const running = !App.paused && !BB.sdk.adPlaying && !document.hidden;
        if (App.impactCd > 0) App.impactCd -= dt;
        if (running && App.impact) {
          App.impact.t += dt;
          if (App.impact.t >= App.impact.dur) App.impact = null;
          App.handleEvents(App.sim);
        } else if (running) {
          App.sim.input = App.readInput();
          App.acc += dt * (BB.save.data.settings.speed || 1);
          let n = 0;
          if (App.slowmo > 0) { App.slowmo -= dt; App.acc -= dt * 0.65; } // slow-motion knockout
          while (App.acc >= STEP - 1e-9 && n < 12) { App.sim.step(STEP); App.acc -= STEP; n++; }
          if (n >= 12) App.acc = 0;
          App.handleEvents(App.sim);
          App._statT = (App._statT || 0) - dt;
          if (App._statT <= 0) { App._statT = 0.15; App.renderStats(App.sim); }
          if (App.sim.over && !App.resultsShown) { App.renderStats(App.sim, true); App.onOver(); }
        }
      } else if (App.state === 'menu' && App.preview) {
        const p = App.preview;
        p.t += dt;
        for (const b of p.balls) { b.w.angle += b.w.dir * b.w.spin * D2R * dt * 0.5; p.computeCaps(b); }
        if (p.map.id === 'saws') p.updateSaws();
      }
      App.draw();
    },

    draw() {
      const s = App.state === 'battle' ? App.sim : App.preview;
      if (App.shake > 0) App.shake = Math.max(0, App.shake - 0.8);
      let imp = null;
      if (App.impact && App.state === 'battle') { imp = App.impact; imp.p = Math.min(0.999, imp.t / imp.dur); }
      if (s && App.renderer) App.renderer.draw(s, { shake: App.state === 'battle' && !App.paused ? App.shake : 0, impact: imp });
    },

    readInput() {
      if (App.joy.active) return { x: App.joy.x, y: App.joy.y };
      if (App.aim && App.sim) {
        const b = App.sim.balls.find((x) => x.controlled && x.alive);
        if (b) {
          const dx = App.aim.x - b.x, dy = App.aim.y - b.y, d = Math.hypot(dx, dy);
          if (d > b.r * 0.5) return { x: dx / d, y: dy / d };
        }
        return { x: 0, y: 0 };
      }
      const k = App.keys;
      const x = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
      const y = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
      const m = Math.hypot(x, y) || 1;
      return { x: x / m, y: y / m };
    },

    // ------------------------------------------------------------- binding
    bindUI() {
      const click = (id, fn) => $(id).addEventListener('click', () => { BB.audio.unlock(); BB.audio.play('click'); fn(); });
      click('btnStart', () => App.startBattle());
      click('btnSettings', () => {
        if (App.state === 'battle' && !App.resultsShown) { if (!App.paused) { App.paused = true; BB.sdk.gameplayStop(); } BB.ui.onClose = null; BB.ui.settings(); }
        else BB.ui.settings();
      });
      click('btnPause', () => App.pause());
      click('optMode', () => BB.ui.pickMode());
      click('optPvp', () => BB.ui.pvpCreate());
      click('btnCup', () => BB.meta.openCup());
      $('btnGauntlet').addEventListener('click', () => { if (!App.pvpAvailable()) { BB.audio.unlock(); BB.audio.play('click'); BB.meta.openGauntlet(); } });
      click('btnQuests', () => BB.meta.openQuests());
      click('btnGift', () => BB.meta.claimGift());
      click('btnProfile', () => BB.meta.openProfile());
      click('btnSpeed', () => {
        const st = BB.save.data.settings;
        st.speed = st.speed === 1 || !st.speed ? 2 : st.speed === 2 ? 3 : 1;
        BB.save.write(); App.refreshSpeed();
      });
      click('optMap', () => BB.ui.pickMap());
      click('optControl', () => {
        const s = BB.save.data.setup;
        s.control = !s.control;
        BB.save.write();
        App.refreshMenu();
        BB.ui.toast(s.control ? 'You steer the Green ball! Wins pay x1.5' : 'Spectator mode');
      });
      click('optRandom', () => {
        const pool = BB.ITEMS.filter((i) => i.cat !== 'hidden' && i.id !== 'dummy' && App.isOwned(i.id));
        const mode = App.mode();
        for (let t = 1; t < mode.teams.length; t++) for (const i of mode.teams[t]) BB.save.data.setup.slots[i].id = pool[Math.floor(Math.random() * pool.length)].id;
        BB.save.write();
        App.refreshMenu();
      });
      $('modal').addEventListener('pointerdown', (e) => {
        if (e.target === $('modal') && !App.resultsShown) {
          if (App.paused && App.state === 'battle') App.resume();
          else BB.ui.close();
        }
      });
      window.addEventListener('resize', () => App.layout());
    },

    bindInput() {
      const blockKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'Home', 'End']);
      window.addEventListener('keydown', (e) => {
        const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
        if (blockKeys.has(e.code) && !typing) e.preventDefault();
        if (typing) return;
        App.keys[e.code] = true;
        if ((e.code === 'Escape' || e.code === 'KeyP') && App.state === 'battle' && !App.resultsShown) {
          if (App.paused) App.resume(); else App.pause();
        }
        if ((e.code === 'Enter' || e.code === 'Space') && App.state === 'menu' && !BB.ui.isOpen()) { BB.audio.unlock(); App.startBattle(); }
      });
      window.addEventListener('keyup', (e) => { App.keys[e.code] = false; });
      window.addEventListener('blur', () => { App.keys = {}; });
      window.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('pointerdown', () => BB.audio.unlock(), { capture: true });
      document.addEventListener('visibilitychange', () => {
        // no auto-pause: switching tabs just mutes, and the battle resumes where it was
        App.applyAudio();
        App.last = performance.now();
      });
      window.addEventListener('wheel', (e) => { if (!e.target.closest || !e.target.closest('.sh-body')) e.preventDefault(); }, { passive: false });

      // Joystick
      const joy = $('joystick'), knob = joy.querySelector('.knob');
      let pid = null;
      const move = (e) => {
        const r = joy.getBoundingClientRect();
        const R = r.width * 0.33;
        let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        App.joy.x = dx / R; App.joy.y = dy / R;
      };
      joy.addEventListener('pointerdown', (e) => { pid = e.pointerId; joy.setPointerCapture(pid); App.joy.active = true; move(e); e.preventDefault(); });
      joy.addEventListener('pointermove', (e) => { if (e.pointerId === pid) move(e); });
      const end = (e) => { if (e.pointerId !== pid) return; pid = null; App.joy.active = false; App.joy.x = App.joy.y = 0; knob.style.transform = ''; };
      joy.addEventListener('pointerup', end);
      joy.addEventListener('pointercancel', end);

      // Hold on the arena to steer toward the pointer
      const cv = $('arena');
      let apid = null;
      const toWorld = (e) => {
        const r = cv.getBoundingClientRect();
        const S = App.sim ? App.sim.size : 600;
        return { x: ((e.clientX - r.left) / r.width - 0.5) * S, y: ((e.clientY - r.top) / r.height - 0.5) * S };
      };
      cv.addEventListener('pointerdown', (e) => {
        if (App.state !== 'battle' || !BB.save.data.setup.control) return;
        apid = e.pointerId; cv.setPointerCapture(apid); App.aim = toWorld(e); e.preventDefault();
      });
      cv.addEventListener('pointermove', (e) => { if (e.pointerId === apid) App.aim = toWorld(e); });
      const aend = (e) => { if (e.pointerId === apid) { apid = null; App.aim = null; } };
      cv.addEventListener('pointerup', aend);
      cv.addEventListener('pointercancel', aend);
    },
  });

  // Hooks used by tools/capture.mjs to record the store videos deterministically.
  window.BBCapture = {
    configure(setup, settings) {
      for (const it of BB.ITEMS) BB.save.data.unlocked[it.id] = true;
      Object.assign(BB.save.data.setup, setup);
      Object.assign(BB.save.data.settings, settings || {});
      App.applySettings();
      App.refreshMenu();
    },
    start(seed) {
      App.startBattle();
      if (seed != null) {
        const setup = BB.save.data.setup;
        App.seed = seed;
        App.sim = new BB.Sim({ seed, map: setup.map, teams: App.buildTeams(), settings: BB.save.data.settings, controlSlot: setup.control ? App.mode().teams[0][0] : null });
        App.renderMatchup(App.sim);
        App.renderStats(App.sim, true);
      }
      App.resultsShown = true; // keep the results dialog out of recorded footage
    },
    // Steps one video frame; when autopilot is on, the joystick knob moves with the input.
    advance(frames, fps, autopilot) {
      const knob = document.querySelector('#joystick .knob');
      for (let i = 0; i < frames; i++) {
        if (autopilot && App.sim) {
          const inp = App.sim.autoPilot();
          App.joy.active = true; App.joy.x = inp.x; App.joy.y = inp.y;
          const R = document.getElementById('joystick').clientWidth * 0.33;
          knob.style.transform = `translate(${inp.x * R}px, ${inp.y * R}px)`;
        }
        App.tick(1 / fps);
      }
      return { over: !!(App.sim && App.sim.over), t: App.sim ? App.sim.t : 0 };
    },
    hideBanner() { document.getElementById('banner').classList.remove('show'); },
  };

  window.addEventListener('DOMContentLoaded', () => App.boot());
})();
