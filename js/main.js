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

    async boot() {
      await BB.sdk.init();
      BB.sdk.loadingStart();
      BB.save.load();

      try {
        await Promise.race([Promise.all([document.fonts.load('20px Anton'), document.fonts.load('20px "Pixelify Sans"')]), new Promise((r) => setTimeout(r, 2500))]);
      } catch (e) { /* fall back to system font */ }

      App.renderer = new BB.Renderer($('arena'));
      App.applySettings();
      App.bindUI();
      App.bindInput();
      App.layout();
      for (const it of BB.ITEMS) BB.icon(it.id);
      App.toMenu();

      BB.sdk.on('adStart', () => { App.applyAudio(); });
      BB.sdk.on('adEnd', () => { App.applyAudio(); App.last = performance.now(); });
      BB.sdk.on('settings', () => App.applyAudio());

      BB.sdk.loadingStop();
      if (!App.capture) requestAnimationFrame(App.frame);
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
      BB.audio.setBlocked(BB.sdk.muteAudio || BB.sdk.adPlaying || document.hidden);
    },
    refreshCoins() { $('coinCount').textContent = BB.save.data.coins; },

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
      const top = (land && vh <= 520 ? 44 : 52) * ui;
      const header = 46 * ui, stats = 32 * ui;
      let S;
      const teamMode = App.mode().teams[0].length > 1;
      if (land) {
        const pw = BB.clamp(Math.round(vw * 0.32 / ui), 250, 400);
        document.documentElement.style.setProperty('--panelw', pw + 'px');
        S = Math.min(vh - top - header - stats - 14, vw - pw * ui - 28 - 40);
      } else {
        const panel = (teamMode ? 300 : 236) * ui;
        S = Math.min(vw - 24, vh - top - header - stats - 12 - panel);
      }
      S = Math.max(150, Math.floor(S));
      document.documentElement.style.setProperty('--arena', S + 'px');
      App.renderer.resize(S);
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
      for (const i of App.mode().teams[0]) if (!App.isOwned(setup.slots[i].id)) setup.slots[i].id = 'sword';
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
        b.setAttribute('aria-label', 'Edit ' + BB.TEAMS[team].name + ' ' + it.name);
        b.innerHTML = `<img src="${BB.icon(s.id)}" alt=""><span class="sl-t"><span class="sl-n">${it.name}</span><span class="sl-s">HP ${s.hp}${s.scale !== 1 ? ' · x' + s.scale : ''} · Edit</span></span><span class="dot" style="background:${BB.TEAMS[team].fill}"></span>`;
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
      const name = (b) => `<img src="${BB.icon(b.def.id)}" alt=""><span class="nm" style="color:${BB.TEAMS[b.team].fill}">${b.def.name}</span>`;
      const mains = sim.balls.filter((b) => b.main);
      if (mode.id === '1v1') m.innerHTML = name(mains[0]) + '<span class="vs">VS</span>' + name(mains[1]);
      else if (mode.id === 'ffa') m.innerHTML = '<span class="nm" style="color:#fff">Free For All</span>';
      else m.innerHTML = `<span class="nm" style="color:${BB.TEAMS[0].fill}">Green Team</span><span class="vs">VS</span><span class="nm" style="color:${BB.TEAMS[1].fill}">Red Team</span>`;
    },

    renderStats(sim, force) {
      const row = $('statRow');
      const mains = sim.balls.filter((b) => b.main);
      const one = mains.length === 2;
      let html = '';
      for (const b of mains) {
        const lines = sim.stats(b);
        const txt = (one ? '' : b.def.name + ': ') + (lines.join(' · ') || '');
        html += `<span class="st" style="color:${BB.TEAMS[b.team].fill};${b.alive ? '' : 'opacity:.35'}">${txt}</span>`;
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
    startBattle() {
      BB.audio.unlock();
      const setup = BB.save.data.setup;
      const mode = App.mode();
      App.seed = (Math.random() * 2147483647) | 0;
      App.sim = new BB.Sim({
        seed: App.seed, map: setup.map, teams: App.buildTeams(), settings: BB.save.data.settings,
        controlSlot: setup.control ? mode.teams[0][0] : null,
      });
      App.maxHit = 0;
      App.state = 'battle';
      App.paused = false;
      App.acc = 0;
      App.resultsShown = false;
      $('app').className = 'is-battle' + (setup.control ? ' controlled' : '');
      App.layout();
      App.renderMatchup(App.sim);
      App.renderStats(App.sim, true);
      BB.audio.play('start');
      BB.ui.banner('FIGHT!', 700);
      BB.sdk.gameplayStart();
    },

    pause() {
      if (App.state !== 'battle' || App.paused || App.resultsShown) return;
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
      if (App.pausedSettings) { App.pausedSettings = false; BB.ui.pause(); }
    },

    onOver() {
      App.resultsShown = true;
      BB.sdk.gameplayStop();
      const sim = App.sim, save = BB.save.data, mode = App.mode();
      const w = sim.over.winner;
      save.stats.battles++;
      let title, sub, icon = null, coins;
      if (w < 0) {
        title = 'Draw!'; sub = 'Everyone got knocked out'; coins = 20;
        BB.audio.play('lose');
      } else {
        const winners = sim.balls.filter((b) => b.main && b.team === w);
        if (mode.teams[0].length === 1) { title = winners[0].def.name + ' Wins!'; icon = winners[0].def.id; }
        else { title = BB.TEAMS[w].name + ' Team Wins!'; icon = winners[0].def.id; }
        if (w === 0) {
          coins = Math.round(50 * (save.setup.control ? 1.5 : 1));
          sub = save.setup.control ? 'You won! Control bonus x1.5' : 'Your team won!';
          save.stats.wins++;
          BB.audio.play('win');
        } else {
          coins = 15;
          sub = 'Your team lost. Try another weapon!';
          BB.audio.play('lose');
        }
      }
      save.coins += coins;
      App.trials = {};
      BB.save.write();
      App.refreshCoins();
      const stats = 'Battle time ' + Math.round(sim.t) + 's · Biggest hit ' + BB.fmt(App.maxHit);
      setTimeout(() => BB.ui.results({ winner: w, title, sub, icon, coins, stats }), 300);
    },

    async afterResults(rematch) {
      await BB.sdk.maybeMidgame();
      if (rematch) { App.refreshMenu(); App.startBattle(); }
      else App.toMenu();
    },

    handleEvents(sim) {
      for (const e of sim.events) {
        switch (e.type) {
          case 'hit':
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
          case 'death': BB.audio.play('death'); if (e.main) App.vibrate(60); break;
          case 'build': BB.audio.play('build'); break;
          case 'break': BB.audio.play('break'); break;
          case 'pass': BB.audio.play('pass'); break;
          case 'overtime': BB.audio.play('overtime'); BB.ui.banner('OVERTIME x' + e.mul, 1000); break;
          case 'ko': BB.ui.banner(e.winner < 0 ? 'DRAW!' : 'K.O.!', 1000); break;
        }
      }
      sim.events.length = 0;
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
        if (running) {
          App.sim.input = App.readInput();
          App.acc += dt;
          let n = 0;
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
      if (s && App.renderer) App.renderer.draw(s);
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
      click('btnSettings', () => { if (App.state === 'battle' && !App.paused) { App.pausedSettings = true; App.paused = true; BB.sdk.gameplayStop(); } BB.ui.settings(); });
      click('btnPause', () => App.pause());
      click('optMode', () => BB.ui.pickMode());
      click('optMap', () => BB.ui.pickMap());
      click('optControl', () => {
        const s = BB.save.data.setup;
        s.control = !s.control;
        BB.save.write();
        App.refreshMenu();
        BB.ui.toast(s.control ? 'You steer the Green ball! Wins pay x1.5' : 'Spectator mode');
      });
      click('optRandom', () => {
        const pool = BB.ITEMS.filter((i) => i.cat !== 'hidden' && i.id !== 'dummy');
        const mode = App.mode();
        for (let t = 1; t < mode.teams.length; t++) for (const i of mode.teams[t]) BB.save.data.setup.slots[i].id = pool[Math.floor(Math.random() * pool.length)].id;
        BB.save.write();
        App.refreshMenu();
      });
      $('modal').addEventListener('pointerdown', (e) => {
        if (e.target === $('modal') && !App.resultsShown) {
          if (App.paused && App.state === 'battle' && !App.pausedSettings) App.resume();
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
          if (App.paused && !App.pausedSettings) App.resume(); else App.pause();
        }
        if ((e.code === 'Enter' || e.code === 'Space') && App.state === 'menu' && !BB.ui.isOpen()) { BB.audio.unlock(); App.startBattle(); }
      });
      window.addEventListener('keyup', (e) => { App.keys[e.code] = false; });
      window.addEventListener('blur', () => { App.keys = {}; });
      window.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('pointerdown', () => BB.audio.unlock(), { capture: true });
      document.addEventListener('visibilitychange', () => {
        App.applyAudio();
        if (document.hidden) App.pause();
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
