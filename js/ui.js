// Menus and dialogs. Everything is plain DOM so it stays sharp and accessible.
(function () {
  const BB = window.BB;
  const $ = (id) => document.getElementById(id);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function coinHtml(n) { return '<span class="coin-ic"></span>' + n; }

  const UI = (BB.ui = {
    onClose: null,

    toast(msg, ms) {
      const t = $('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(UI._tt);
      UI._tt = setTimeout(() => t.classList.remove('show'), ms || 1800);
    },

    banner(text, ms) {
      const b = $('banner');
      b.textContent = text;
      b.classList.add('show');
      clearTimeout(UI._bt);
      UI._bt = setTimeout(() => b.classList.remove('show'), ms || 900);
    },

    isOpen() { return !$('modal').classList.contains('hidden'); },

    open(build, opts) {
      const sheet = $('sheet');
      sheet.className = 'sheet';
      sheet.innerHTML = '';
      sheet.style.maxWidth = (opts && opts.width) || '';
      build(sheet);
      $('modal').classList.remove('hidden');
      UI.onClose = (opts && opts.onClose) || null;
    },

    close() {
      UI.closePreview();
      if (!UI.isOpen()) return;
      $('modal').classList.add('hidden');
      $('sheet').innerHTML = '';
      const cb = UI.onClose; UI.onClose = null;
      if (cb) cb();
    },

    head(sheet, title, opts) {
      const h = el('div', 'sh-head');
      h.appendChild(el('div', 'sh-title', esc(title)));
      const x = el('button', 'x-btn' + (opts && opts.ok ? ' ok-btn' : ''), opts && opts.ok ? '✓' : '✕');
      x.setAttribute('aria-label', opts && opts.ok ? 'Done' : 'Close');
      x.onclick = () => { BB.audio.play('click'); (opts && opts.onX ? opts.onX : UI.close)(); };
      h.appendChild(x);
      sheet.appendChild(h);
      const body = el('div', 'sh-body');
      sheet.appendChild(body);
      return body;
    },

    // ------------------------------------------------------------- slot editor
    editSlot(slotIdx) {
      const app = BB.app;
      const s = BB.save.data.setup.slots[slotIdx];
      const team = app.teamOfSlot(slotIdx);
      const tm = BB.TEAMS[team];
      UI.open((sheet) => {
        const body = UI.head(sheet, 'Customize · ' + tm.name, { ok: true });
        const it = BB.ITEM[s.id];
        const cur = el('div', 'detail');
        cur.innerHTML = `<img src="${BB.icon(s.id)}" alt=""><div style="flex:1;min-width:0"><div class="d-n">${esc(it.name)}</div>
          <div class="d-r" style="color:${BB.RARITY[it.rarity].color}">${BB.RARITY[it.rarity].name}</div><div class="d-d">${esc(it.desc)}</div></div>`;
        const change = el('button', 'btn primary', 'Change');
        change.onclick = () => { BB.audio.play('click'); UI.pickItem(slotIdx); };
        cur.appendChild(change);
        body.appendChild(cur);

        if (it.fixedHp) body.appendChild(el('div', 'field', `<div><div class="f-k">Health</div><div class="f-s">Locked by Divine Grace</div></div><b class="hp-lock">${it.fixedHp}</b>`));
        else body.appendChild(UI.numField('Health', '', s.hp, 1, 9999, 10, (v) => { s.hp = v; }));
        body.appendChild(UI.numField('Size', 'Ball scale', s.scale, 0.5, 2.5, 0.25, (v) => { s.scale = v; }, true));
        body.appendChild(el('div', 'section-t', 'Overrides (0 = default)'));
        body.appendChild(UI.numField('Damage', 'Starting damage', s.ov.damage, 0, 999, 1, (v) => { s.ov.damage = v; }));
        // spin is capped at 2000 for every ball (Kami turns 3x faster at the same number); speed at 9999
        const spinMax = 2000;
        if (s.ov.spin > spinMax) s.ov.spin = spinMax;
        body.appendChild(UI.numField('Spin', 'Weapon spin °/s (max ' + spinMax + ')', s.ov.spin, 0, spinMax, 30, (v) => { s.ov.spin = v; }));
        body.appendChild(UI.numField('Speed', 'Ball speed (max 9999)', s.ov.speed, 0, 9999, 50, (v) => { s.ov.speed = v; }));
        const reset = el('button', 'btn', 'Reset to defaults');
        reset.onclick = () => {
          BB.audio.play('click');
          s.hp = 100; s.scale = 1; s.ov = { damage: 0, spin: 0, speed: 0 };
          BB.save.write(); UI.editSlot(slotIdx);
        };
        body.appendChild(reset);
      }, { onClose: () => { BB.save.write(); app.refreshMenu(); } });
    },

    numField(label, sub, value, min, max, step, onChange, decimals) {
      const f = el('div', 'field');
      f.appendChild(el('div', '', `<div class="f-k">${esc(label)}</div>${sub ? `<div class="f-s">${esc(sub)}</div>` : ''}`));
      const st = el('div', 'stepper');
      const minus = el('button', '', '−'), plus = el('button', '', '+');
      minus.setAttribute('aria-label', 'Decrease ' + label); plus.setAttribute('aria-label', 'Increase ' + label);
      const inp = el('input');
      inp.type = 'number'; inp.inputMode = decimals ? 'decimal' : 'numeric'; inp.min = min; inp.max = max; inp.step = step;
      inp.value = value;
      const set = (v) => {
        v = Number(v);
        if (!isFinite(v)) v = min;
        v = BB.clamp(decimals ? Math.round(v * 100) / 100 : Math.round(v), min, max);
        inp.value = v; onChange(v);
      };
      minus.onclick = () => { BB.audio.play('click'); set(Number(inp.value) - step); };
      plus.onclick = () => { BB.audio.play('click'); set(Number(inp.value) + step); };
      inp.onchange = () => set(inp.value);
      inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); };
      st.append(minus, inp, plus);
      f.appendChild(st);
      return f;
    },

    // ------------------------------------------------------------- ball preview
    // A small looping "video" of the ball fighting a training dummy, so players can see what a
    // weapon does before picking or buying it. Opens over the current sheet; tap outside / X closes.
    preview(id, opts) {
      UI.closePreview();
      const it = BB.ITEM[id], tenshi = !!(opts && opts.tenshi);
      const wrap = el('div', 'pv-wrap');
      wrap.innerHTML = `<div class="pv-box"><div class="pv-h"><img src="${BB.icon(id)}" alt=""><b>${esc(it.name)}${tenshi ? ' <span class="pv-tag">Tenshi</span>' : ''}</b><button class="x-btn pv-x" aria-label="Close">×</button></div>
        <canvas class="pv-c"></canvas><div class="pv-d">${esc(it.desc)}</div></div>`;
      document.body.appendChild(wrap);
      const cv = wrap.querySelector('.pv-c'), R = new BB.Renderer(cv);
      R.dark = !!BB.save.data.settings.dark;
      const px = Math.min(360, window.innerWidth - 56, window.innerHeight - 220);
      R.resize(Math.max(200, px));
      let sim = null, t0 = 0, last = performance.now(), acc = 0, seed = 1, imp = null, kfin = null, awoke = false, cine = false;
      const fresh = () => {
        sim = new BB.Sim({ seed: seed++, map: 'classic', teams: [[{ id, hp: 100, slot: 0 }], [{ id: 'dummy', hp: 100, slot: 1 }]],
          settings: { dmgNumbers: true, callouts: true, hitlag: false, parrylag: false, impact: false, finisher: false, overtime: false } });
        t0 = 0; kfin = null;
        if (tenshi && !awoke) sim.balls[0].tenshi = true; // first run: base Kami falls, then the awakening plays
        else if (tenshi) { // later loops: straight into the revived (Tenshi) form
          const k = sim.balls[0];
          k.tenshi = true; k.ascended = true; k.w.regenMul = 1.3; k.w.touch = {}; k.w.servCd = 1.5; k.w.cool = { beam: 1.2, gate: 4.5, rain: 2.6 };
        }
      };
      fresh();
      const loop = (now) => {
        if (!wrap.isConnected) return;
        acc += Math.min(0.1, (now - last) / 1000); last = now;
        if (imp) { // Kami's art cut-in banner: the clip pauses while it plays, like in a real battle
          imp.t += Math.min(0.1, acc); acc = 0;
          if (imp.t >= imp.dur) imp = null;
        }
        if (cine) acc = 0; // the awakening cutscene holds the clip
        // Transformation previews force the base form through its awakening threshold once.
        if (tenshi && !awoke && !cine && t0 >= 2.2) { const k = sim.balls[0]; if (!k.ascended) { sim.burst(k.x, k.y, 30, ['#ffffff', '#e8473f', '#111'], 420, 4); sim.kill(k, sim.balls[1]); } }
        const awaken = () => { if (!awoke && sim.events.some((e) => e.type === 'kami' && e.k === 'awaken')) { awoke = true; cine = true; sim.events.length = 0; BB.audio.play('death'); BB.kamiAwaken(() => { cine = false; last = performance.now(); }); } };
        awaken();
        while (!imp && !cine && acc >= 1 / 120) {
          sim.step(1 / 120); acc -= 1 / 120; t0 += 1 / 120;
          awaken(); if (cine) break;
          for (const e of sim.events) if (e.type === 'death' && e.main && (e.kami || e.ballKill)) kfin = { asc: !!e.asc, ball: !!e.ballKill && !e.kami, done: false };
          // Kami's (or BALL's) knockout plays its finisher before the clip restarts
          if (sim.over && kfin && !kfin.done && BB.save.data.settings.finisher !== false) {
            kfin.done = true; sim.events.length = 0;
            if (kfin.ball && BB.ballFinisher) { imp = { t: 0, dur: 2.5, ballFin: true, x: 0, y: 0, seed: (Math.random() * 1e6) | 0, foe: BB.itemColor('dummy') }; BB.audio.play('kamiSlam'); setTimeout(() => BB.audio.play('boom'), 850); }
            else { imp = { t: 0, dur: kfin.asc ? 3.0 : 2.8, kamiFin: true, asc: kfin.asc, x: 0, y: 0, seed: (Math.random() * 1e6) | 0, foe: BB.itemColor('dummy') }; BB.audio.play('kamiFinisher'); }
            break;
          }
          for (const e of sim.events) if (e.type === 'kami' && !['dodge', 'beamfire', 'gateslam', 'awaken'].includes(e.k)) imp = { t: 0, dur: 0.9, kamiCut: true, forceText: true, k: e.k, asc: !!e.asc, x: e.x, y: e.y, seed: (Math.random() * 1e6) | 0 };
          sim.events.length = 0;
        }
        if ((sim.over && !imp) || t0 > 45) fresh(); // loop when the dummy is knocked out, or after 45s
        if (imp) imp.p = Math.min(0.999, imp.t / imp.dur);
        R.draw(sim, { impact: imp });
        UI.pvRaf = requestAnimationFrame(loop);
      };
      UI.pvRaf = requestAnimationFrame(loop);
      const close = () => UI.closePreview();
      wrap.querySelector('.pv-x').onclick = close;
      wrap.onclick = (e) => { if (e.target === wrap) close(); };
    },
    closePreview() { cancelAnimationFrame(UI.pvRaf); document.querySelectorAll('.pv-wrap').forEach((w) => w.remove()); },

    // ------------------------------------------------------------- themed choice menu
    // A small game-styled menu card over a dim backdrop (used for filters and titles).
    // items: [{ id, html, sub?, on?, disabled? }]
    choice(title, items, onPick) {
      document.querySelectorAll('.ch-wrap').forEach((x) => x.remove());
      const wrap = el('div', 'ch-wrap', `<div class="ch-card"><div class="ch-h"><b>${esc(title)}</b><button class="x-btn ch-x" aria-label="Close">×</button></div><div class="ch-list"></div></div>`);
      const list = wrap.querySelector('.ch-list');
      for (const it of items) {
        const b = el('button', 'ch-it' + (it.on ? ' on' : '') + (it.disabled ? ' off' : ''), `<span class="ch-main">${it.html}${it.sub ? `<small>${it.sub}</small>` : ''}</span>${it.on ? `<i class="ch-ok">${BB.ICON.check}</i>` : it.disabled ? `<i class="ch-lock">${BB.ICON.lock}</i>` : ''}`);
        if (!it.disabled) b.onclick = () => { BB.audio.play('click'); close(); onPick(it.id); };
        list.appendChild(b);
      }
      const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 150); };
      wrap.querySelector('.ch-x').onclick = () => { BB.audio.play('click'); close(); };
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
      document.body.appendChild(wrap);
    },

    // ------------------------------------------------------------- item picker / shop
    // Specials tab: only the balls you can't buy with coins (King, Kami, event balls). Every other
    // ball, coin-bought ones included, lives in the Weapons tab.
    tabOf(it) { return it.kami || it.dailyOnly || it.eventOnly || it.seasonBall ? 'special' : 'weapon'; },
    pickItem(slotIdx, tab) {
      const app = BB.app, save = BB.save.data;
      const s = save.setup.slots[slotIdx];
      const mine = true; // every slot uses only unlocked balls
      let sel = s.id;
      tab = tab === 'iridescent' ? 'special' : tab || UI.tabOf(BB.ITEM[s.id]);

      UI.open((sheet) => {
        const body = UI.head(sheet, app.teamOfSlot(slotIdx) === 0 ? 'Choose Your Ball' : 'Choose Opponent', { onX: () => UI.editSlot(slotIdx) });
        const tabs = el('div', 'tabs');
        for (const [k, n] of [['weapon', 'Weapons'], ['special', 'Specials']]) {
          const t = el('button', 'tab' + (tab === k ? ' on' : ''), n);
          t.onclick = () => { BB.audio.play('click'); UI.pickItem(slotIdx, k); };
          tabs.appendChild(t);
        }
        body.appendChild(tabs);
        const detail = el('div', 'detail');
        body.appendChild(detail);
        const inTab = (i) => i.cat !== 'hidden' && UI.tabOf(i) === tab;
        if (!inTab(BB.ITEM[sel])) { const first = BB.ITEMS.find((i) => inTab(i)); if (first) sel = first.id; }
        // search: filters this tab's grid by name as you type
        // search + rarity filter on one row
        const rars = ['common', 'rare', 'epic', 'legendary', 'iridescent'].filter((r) => BB.ITEMS.some((i) => inTab(i) && i.rarity === r));
        const fr = el('div', 'pk-filter');
        const sw = el('div', 'pk-search', `<span class="pk-s-ic">${BB.ICON.search || '&#x1F50D;'}</span><input type="search" placeholder="Search" aria-label="Search balls" autocomplete="off"><button class="pk-s-x" aria-label="Clear">&times;</button>`);
        // rarity filter: a themed menu instead of the browser's own dropdown
        const rs = el('button', 'pk-rar', '<span>All</span><i>&#9662;</i>'); rs.value = '';
        rs.setAttribute('aria-label', 'Filter by rarity');
        rs.onclick = () => {
          BB.audio.play('click');
          UI.choice('Filter by rarity', [{ id: '', html: '<span class="ch-dot" style="--rc:#9aa0a6"></span>All rarities', on: !rs.value },
            ...rars.map((r) => ({ id: r, html: `<span class="ch-dot" style="--rc:${BB.RARITY[r].color}"></span><span style="color:${BB.RARITY[r].color}">${BB.RARITY[r].name}</span>`, sub: BB.ITEMS.filter((i) => inTab(i) && i.rarity === r).length + ' balls', on: rs.value === r }))],
          (id) => { rs.value = id; rs.querySelector('span').textContent = id ? BB.RARITY[id].name : 'All'; filter(); });
        };
        fr.append(sw, rs);
        body.appendChild(fr);
        const grid = el('div', 'grid');
        body.appendChild(grid);
        const none = el('div', 'pk-none hidden', 'No balls found');
        body.appendChild(none);
        const qIn = sw.querySelector('input');
        const filter = () => {
          const q = qIn.value.trim().toLowerCase(), rr = rs.value;
          let n = 0;
          grid.querySelectorAll('.tile').forEach((t) => { const it = BB.ITEM[t.dataset.id], hit = (!q || it.name.toLowerCase().includes(q)) && (!rr || it.rarity === rr); t.classList.toggle('hidden', !hit); if (hit) n++; });
          rs.style.setProperty('--rc', rr ? BB.RARITY[rr].color : '#9aa0a6'); rs.classList.toggle('on', !!rr);
          none.classList.toggle('hidden', n > 0); sw.classList.toggle('has', !!q);
        };
        qIn.addEventListener('input', filter);
        qIn.addEventListener('keydown', (e) => e.stopPropagation()); // typing never triggers game hotkeys
        sw.querySelector('.pk-s-x').onclick = () => { qIn.value = ''; filter(); qIn.focus(); };

        const foot = el('div', 'sh-foot');
        sheet.appendChild(foot);

        const renderDetail = () => {
          const it = BB.ITEM[sel];
          const r = BB.RARITY[it.rarity];
          detail.innerHTML = `<img src="${BB.icon(sel)}" alt=""><div style="flex:1;min-width:0"><div class="d-acts"><button class="d-prev" aria-label="Preview ${esc(it.name)}">${BB.ICON.play}<span>Preview</span></button></div><div class="d-n">${esc(it.name)}</div>
            <div class="d-r" style="color:${r.color}">${r.name}</div><div class="d-d">${esc(it.desc)}</div></div>`;
          detail.querySelector('.d-prev').onclick = () => { BB.audio.play('click'); UI.preview(sel); };
          if (it.kami) { // second preview for the revived form
            const tb = el('button', 'd-prev d-prev2', BB.ICON.play + '<span>Tenshi</span>');
            tb.onclick = () => { BB.audio.play('click'); UI.preview(sel, { tenshi: true }); };
            detail.querySelector('.d-acts').appendChild(tb);
          }
          if (it.kami) detail.insertAdjacentHTML('beforeend', '<div class="k-abil">' + [['Divine Grace', 'Teleports away from any attack while charged. Refills slower as it drains and only trickles back at 20% or below. HP locked at 1.'], ['Seraph Beam', 'Angel wings unfurl, then a beam of light pierces the arena. 20 dmg · ' + BB.KAMI.AB.beam.cd + 's'], ['Golden Gates', 'Imprisons a foe in a golden cage, then slams it shut. 18 dmg · ' + BB.KAMI.AB.gate.cd + 's'], ['Heaven\'s Arsenal', 'Portals open and rain ' + BB.KAMI.AB.rain.swords + ' holy swords. 3 dmg each · ' + BB.KAMI.AB.rain.cd + 's'], ['Tenshi (Mastery Lv20 skin)', 'Refuses its first death and ascends: crimson arts that hit harder, Angelic Touch (brush-spear hits on foes restore Grace), faster Grace recharge above 60% (very fast above 90%) and Heavenly Servants. Not used in PvP.']].map(([n, d]) => `<div><b>${n}</b><span>${d}</span></div>`).join('') + '</div>');
          if (app.isOwned(sel)) { detail.insertAdjacentHTML('beforeend', '<div class="m-inline">' + BB.meta.masteryBlock(sel) + '</div>'); BB.meta.bindSkins(detail, sel, () => app.refreshMenu()); }
          foot.innerHTML = '';
          const owned = app.isOwned(sel);
          if (!mine || owned) {
            const b = el('button', 'btn green', 'Equip');
            b.onclick = () => { BB.audio.play('click'); s.id = sel; BB.save.write(); UI.editSlot(slotIdx); };
            foot.appendChild(b);
          } else if (BB.season && BB.season.seasonLocked(it)) {
            foot.appendChild(el('div', 'daily-only ev-only', '<b>Season ' + it.seasonBall + ' exclusive</b><span>Reach tier 30 on the Elite track of the Season ' + it.seasonBall + ' Pass. It goes on sale once the season ends.</span>'));
          } else if (it.eventOnly) {
            foot.appendChild(el('div', 'daily-only ev-only', '<b>Event exclusive</b><span>' + esc(it.eventOnly) + '</span>'));
          } else if (it.dailyOnly) {
            // daily-reward exclusive: no coins, no ad trial
            foot.appendChild(el('div', 'daily-only', '<b>Daily reward exclusive</b><span>Log in 7 days in a row to claim it (Daily Rewards, Day 7).</span>'));
          } else {
            const buy = el('button', 'btn primary', 'Unlock ' + coinHtml(it.price));
            if (save.coins < it.price) buy.disabled = true;
            buy.onclick = () => {
              if (save.coins < it.price) return;
              save.coins -= it.price;
              save.unlocked[sel] = true;
              BB.meta.track('unlock', 1);
              BB.save.write();
              BB.audio.play('unlock');
              BB.sdk.happytime();
              app.refreshCoins();
              UI.toast(it.name + ' unlocked!');
              s.id = sel; BB.save.write();
              UI.pickItem(slotIdx, tab);
            };
            const trial = el('button', 'btn blue', '<span class="ad-ic">' + BB.ICON.video + '</span> Try once');
            trial.onclick = async () => {
              BB.audio.play('click');
              trial.disabled = true;
              const r = await app.rewarded();
              if (r === 'finished') {
                app.trials[sel] = true;
                s.id = sel; BB.save.write();
                UI.toast(it.name + ' unlocked for your next battle!');
                UI.editSlot(slotIdx);
              } else {
                UI.toast('No ad available right now. Try again later!');
                trial.disabled = false;
              }
            };
            foot.append(buy);
            if (app.adsAvailable()) foot.append(trial);
          }
          grid.querySelectorAll('.tile').forEach((t) => t.classList.toggle('sel', t.dataset.id === sel));
        };

        const items = BB.ITEMS.filter(inTab);
        const rank = { common: 0, rare: 1, epic: 2, legendary: 3, iridescent: 4 };
        items.sort((a, b) => rank[a.rarity] - rank[b.rarity]);
        for (const it of items) {
          const owned = app.isOwned(it.id);
          const t = el('button', 'tile' + (mine && !owned ? ' locked' : '') + (it.rarity === 'iridescent' ? ' iri' : ''));
          t.dataset.id = it.id;
          t.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><span class="t-n">${esc(it.name)}</span>${BB.meta.starHtml(it.id)}<span class="rar" style="background:${BB.RARITY[it.rarity].color}"></span>`;
          if (!owned) t.innerHTML += BB.season && BB.season.seasonLocked(it) ? '<span class="price daily ev">S' + it.seasonBall + ' PASS</span>' : it.eventOnly ? '<span class="price daily ev">EVENT</span>' : it.dailyOnly ? '<span class="price daily">DAY 7</span>' : `<span class="price">${coinHtml(it.price)}</span>`;
          else if (app.trials[it.id] && !save.unlocked[it.id]) t.innerHTML += '<span class="badge">TRIAL</span>';
          t.onclick = () => { BB.audio.play('click'); sel = it.id; renderDetail(); };
          grid.appendChild(t);
        }
        const rnd = el('button', 'btn', 'Random');
        rnd.onclick = () => {
          BB.audio.play('click');
          const pool = BB.ITEMS.filter((i) => i.cat !== 'hidden' && (!mine || app.isOwned(i.id)));
          s.id = pool[Math.floor(Math.random() * pool.length)].id;
          BB.save.write(); UI.editSlot(slotIdx);
        };
        body.appendChild(rnd);
        renderDetail();
      }, { onClose: () => { BB.save.write(); app.refreshMenu(); } });
    },

    // ------------------------------------------------------------- mode / map
    pickMode() {
      const app = BB.app, setup = BB.save.data.setup;
      const colors = { '1v1': '#3d8bf2', '2v2': '#35b847', '3v3': '#f0a020', ffa: '#a259ff' };
      UI.open((sheet) => {
        const body = UI.head(sheet, 'Game Mode');
        const list = el('div', 'mode-list');
        for (const m of BB.MODES) {
          const b = el('button', 'mode-btn' + (setup.mode === m.id ? ' sel' : ''));
          b.style.background = colors[m.id];
          b.innerHTML = `<div><div class="m-n">${esc(m.name)}</div><div class="m-d">${esc(m.desc)}</div></div>`;
          b.onclick = () => { BB.audio.play('click'); setup.mode = m.id; BB.save.write(); UI.close(); };
          list.appendChild(b);
        }
        body.appendChild(list);
      }, { onClose: () => app.refreshMenu() });
    },

    pickMap() {
      const app = BB.app, setup = BB.save.data.setup;
      UI.open((sheet) => {
        const body = UI.head(sheet, 'Maps');
        const grid = el('div', 'map-grid');
        for (const m of BB.MAPS) {
          const b = el('button', 'map-tile' + (setup.map === m.id ? ' sel' : ''));
          const cv = document.createElement('canvas');
          b.appendChild(cv);
          b.appendChild(el('div', 'mp-n', esc(m.name)));
          b.appendChild(el('div', 'mp-d', esc(m.desc)));
          b.onclick = () => { BB.audio.play('click'); setup.map = m.id; BB.save.write(); UI.close(); };
          grid.appendChild(b);
          requestAnimationFrame(() => app.drawMapPreview(cv, m.id));
        }
        body.appendChild(grid);
      }, { onClose: () => app.refreshMenu(), width: '640px' });
    },

    // ------------------------------------------------------------- settings
    settings() {
      const app = BB.app, st = BB.save.data.settings;
      UI.open((sheet) => {
        const body = UI.head(sheet, 'Settings');
        const vol = el('div', 'field');
        vol.innerHTML = '<div class="f-k">Sound</div>';
        const r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = st.sound;
        r.oninput = () => { st.sound = Number(r.value); BB.audio.setVolume(st.sound); };
        r.onchange = () => { BB.save.write(); BB.audio.play('hit', { amt: 4 }); };
        vol.appendChild(r);
        body.appendChild(vol);
        const mus = el('div', 'field');
        mus.innerHTML = '<div class="f-k">Music</div>';
        const mr = el('input'); mr.type = 'range'; mr.min = 0; mr.max = 1; mr.step = 0.05; mr.value = st.music != null ? st.music : 0.5;
        mr.oninput = () => { st.music = Number(mr.value); BB.music.setVolume(st.music); BB.music.start(); };
        mr.onchange = () => BB.save.write();
        mus.appendChild(mr);
        body.appendChild(mus);
        const toggles = [
          ['dark', 'Dark Mode', ''],
          ['hitlag', 'Hit Freeze', 'Tiny pause on big hits'],
          ['parrylag', 'Parry Freeze', 'Tiny pause when weapons clash'],
          ['dmgNumbers', 'Damage Numbers', ''],
          ['callouts', 'Ability Text', 'Stunned, +DMG, Knockback, Dodge...'],
          ['impact', 'Impact Frames', 'Quick black flash on hits'],
          ['finisher', 'Finisher', 'Cinematic cut on the final knockout'],
          ['overtime', 'Overtime Bonus', 'Damage ramps up after 55s'],
          ['reverseB', 'Reverse Team Two Spin', 'Team Two spins the other way'],
          ['vibrate', 'Vibration', 'On supported phones'],
        ];
        // UI colour: presets + a custom picker; applies to menus and buttons in both light and dark mode
        const uf = el('div', 'field uic-f', '<div><div class="f-k">Button Colour</div><div class="f-s">Menus and buttons, light and dark mode</div></div>');
        const row = el('div', 'uic-row');
        const PRE = ['#2f2f33', '#5b6472', '#2d4a6b', '#3d2f5c', '#5a2a3c', '#2f5248', '#6a6158', '#7a5a48'];
        const cur = (st.uiColor || app.UI_DEFAULT).toLowerCase();
        const pick = (hex) => { st.uiColor = hex; BB.save.write(); app.applyUiColor(hex); row.querySelectorAll('.uic').forEach((x) => x.classList.toggle('on', x.dataset.c === hex)); };
        for (const h of PRE) { const s = el('button', 'uic' + (h === cur ? ' on' : '')); s.dataset.c = h; s.style.setProperty('--c', h); s.setAttribute('aria-label', 'Colour ' + h); s.onclick = () => { BB.audio.play('click'); pick(h); }; row.appendChild(s); }
        const cu = el('label', 'uic custom' + (PRE.includes(cur) ? '' : ' on'), `<input type="color" value="${cur}" aria-label="Custom colour">`); cu.dataset.c = PRE.includes(cur) ? 'custom' : cur;
        const ci = cu.querySelector('input'); ci.oninput = () => { cu.dataset.c = ci.value; app.applyUiColor(ci.value); }; ci.onchange = () => { cu.dataset.c = ci.value; pick(ci.value); };
        row.appendChild(cu); uf.appendChild(row); body.appendChild(uf);
        for (const [k, n, sub] of toggles) {
          const f = el('div', 'field');
          f.innerHTML = `<div><div class="f-k">${n}</div>${sub ? `<div class="f-s">${sub}</div>` : ''}</div>`;
          const t = el('button', 'toggle' + (st[k] ? ' on' : ''));
          t.setAttribute('aria-label', n);
          t.onclick = () => { BB.audio.play('click'); st[k] = !st[k]; t.classList.toggle('on', st[k]); BB.save.write(); app.applySettings(); };
          f.appendChild(t);
          body.appendChild(f);
        }
        const tut = el('button', 'btn', 'Show Tutorial');
        tut.onclick = () => { BB.audio.play('click'); UI.onClose = null; UI.close(); app.onSettingsClosed(); if (app.state === 'menu') UI.tutorial(); else UI.toast('Finish the battle to see the tutorial'); };
        const privacyPolicy = el('a', 'btn', 'Privacy Policy');
        const host = window.location.hostname.toLowerCase();
        const hostedOnCrazyGames = host === 'crazygames.com' || host.endsWith('.crazygames.com');
        privacyPolicy.href = hostedOnCrazyGames ? 'https://ballvsball.vercel.app/privacy/' : 'privacy-policy.html';
        if (hostedOnCrazyGames) { privacyPolicy.target = '_blank'; privacyPolicy.rel = 'noopener noreferrer'; }
        privacyPolicy.setAttribute('aria-label', 'Read the Ball Vs Ball Privacy Policy');
        privacyPolicy.style.display = 'block';
        privacyPolicy.style.textAlign = 'center';
        privacyPolicy.style.textDecoration = 'none';
        if (!app.isCrazyGames()) { // CrazyGames keeps its own cloud save; elsewhere the save lives on this device
          const del = el('button', 'btn red', 'Delete save data');
          del.onclick = () => {
            BB.audio.play('click');
            UI.choice('Delete all save data?', [
              { id: 'no', html: 'Cancel' },
              { id: 'yes', html: '<b style="color:#ff6b6b">Delete everything</b> (coins, balls, progress, settings)' },
            ], (id) => { if (id === 'yes') BB.save.wipe(); });
          };
          body.appendChild(del);
        }
        body.appendChild(privacyPolicy);
        body.appendChild(tut);
      }, { onClose: () => app.onSettingsClosed() });
    },

    // ------------------------------------------------------------- pause / results
    pause() {
      const app = BB.app, sim = app.sim, st = BB.save.data.settings;
      UI.open((sheet) => {
        sheet.classList.add('pause-sheet');
        const head = el('div', 'pz-head', '<div class="pz-title">PAUSED</div><div class="pz-sub">' + esc(BB.MAP[sim.map.id].name) + ' · ' + Math.floor(sim.t) + 's</div>');
        sheet.appendChild(head);
        const body = el('div', 'sh-body');
        sheet.appendChild(body);
        // live fighters overview
        const list = el('div', 'pz-fighters');
        for (const b of sim.balls.filter((x) => x.main)) {
          const c = BB.itemColor(b.def.id), pct = Math.max(0, (b.hp / b.maxHp) * 100);
          list.innerHTML += `<div class="pz-f${b.alive ? '' : ' out'}"><img src="${BB.icon(b.def.id)}" alt=""><div class="pz-fi"><div class="pz-fn" style="color:${c}">${esc(b.def.name)}</div>
            <span class="hpbar"><i style="width:${pct}%;background:${c}"></i><b>${Math.ceil(b.hp)}</b></span>${b.def.kami ? `<span class="grbar"><i style="width:${Math.round(b.w.grace)}%"></i></span>` : ''}<div class="pz-fs">${esc(sim.stats(b).join(' · '))}</div></div></div>`;
        }
        body.appendChild(list);
        const big = (cls, icon, label, fn) => { const b = el('button', 'btn pz-btn ' + cls, `<span class="pz-ic">${icon}</span>${label}`); b.onclick = () => { BB.audio.play('click'); fn(); }; return b; };
        const grid = el('div', 'pz-grid');
        grid.append(
          big('green pz-main', BB.ICON.play, 'Resume', () => app.resume()),
          // no Restart inside Gauntlet / Cup / PvP runs (it would reroll the fight); Settings fills the row instead
          ...(app.event ? [] : [big('primary', BB.ICON.restart, 'Restart', () => { UI.onClose = null; UI.close(); app.startBattle(); })]),
          big(app.event ? 'pz-wide' : '', BB.ICON.gear, 'Settings', () => { UI.onClose = null; UI.settings(); }),
          big('red', BB.ICON.home, 'Quit', () => { UI.onClose = null; UI.close(); app.pvp = null; app.event = null; BB.meta.cup = null; BB.meta.gaunt = null; BB.meta.series = null; BB.meta.series = null; app.toMenu(); }),
        );
        body.appendChild(grid);
      }, { onClose: () => app.resume(), width: '440px' });
    },

    // ------------------------------------------------------------- PvP (CrazyGames)
    pvpCreate() {
      const app = BB.app, setup = BB.save.data.setup, slot = setup.slots[0], it = BB.ITEM[slot.id];
      UI.open((sheet) => {
        const body = UI.head(sheet, 'PvP Challenge');
        body.appendChild(el('div', 'f-s', 'Send your ball to a friend. They pick a fighter to counter it, and the battle plays out exactly the same on both screens.'));
        const card = el('div', 'detail');
        card.innerHTML = `<img src="${BB.icon(slot.id)}" alt=""><div style="flex:1"><div class="d-n" style="color:${BB.itemColor(slot.id)}">${esc(it.name)}</div><div class="d-d">HP ${slot.hp} · Size x${slot.scale} · Map: ${esc(BB.MAP[setup.map].name)}</div></div>`;
        const ch = el('button', 'btn primary', 'Change');
        ch.onclick = () => { BB.audio.play('click'); UI.editSlot(0); };
        card.appendChild(ch);
        body.appendChild(card);
        const out = el('input', 'pvp-link'); out.readOnly = true; out.placeholder = 'Your challenge link appears here';
        const make = el('button', 'btn green', 'Create Challenge Link');
        make.onclick = async () => {
          BB.audio.play('click');
          const code = app.encodeChallenge(slot, setup.map, 'Friend');
          const link = BB.sdk.inviteLink({ pvp: code });
          BB.sdk.showInvite({ pvp: code });
          if (!link) { UI.toast('Invites only work on CrazyGames'); return; }
          out.value = link;
          try { await navigator.clipboard.writeText(link); UI.toast('Link copied! Send it to a friend'); } catch (e) { out.select(); UI.toast('Copy the link and send it to a friend'); }
        };
        body.append(make, out);
      }, { width: '460px', onClose: () => BB.sdk.hideInvite() });
    },

    pvpReceive(ch) {
      const app = BB.app;
      const foe = BB.ITEM[ch.slot.id];
      let sel = BB.save.data.setup.slots[0].id;
      UI.open((sheet) => {
        const body = UI.head(sheet, "You've Been Challenged!");
        const card = el('div', 'detail');
        card.innerHTML = `<img src="${BB.icon(ch.slot.id)}" alt=""><div style="flex:1"><div class="d-r">${esc(ch.name)} sends</div><div class="d-n" style="color:${BB.itemColor(ch.slot.id)}">${esc(foe.name)}</div><div class="d-d">HP ${ch.slot.hp} · Map: ${esc(BB.MAP[ch.map].name)}</div></div>`;
        body.appendChild(card);
        body.appendChild(el('div', 'section-t', 'Pick your counter'));
        const grid = el('div', 'grid');
        for (const it of BB.ITEMS.filter((i) => i.cat !== 'hidden' && app.isOwned(i.id))) {
          const t = el('button', 'tile' + (it.id === sel ? ' sel' : ''));
          t.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><span class="t-n">${esc(it.name)}</span><span class="rar" style="background:${BB.RARITY[it.rarity].color}"></span>`;
          t.onclick = () => { BB.audio.play('click'); sel = it.id; grid.querySelectorAll('.tile').forEach((x) => x.classList.toggle('sel', x === t)); };
          grid.appendChild(t);
        }
        body.appendChild(grid);
        const foot = el('div', 'sh-foot');
        const go = el('button', 'btn green', 'Fight!');
        go.onclick = () => { BB.audio.play('click'); UI.onClose = null; UI.close(); app.startPvp(ch, { id: sel, hp: ch.slot.hp, scale: 1, ov: { damage: 0, spin: 0, speed: 0 } }); };
        foot.appendChild(go);
        sheet.appendChild(foot);
      }, { width: '560px' });
    },

    // ------------------------------------------------------------- tutorial
    // First-launch prompt: spotlight on Start Battle, the real button stays clickable
    pressStart(onSkip) {
      const ov = el('div', 'tut ps'), spot = el('div', 'tut-spot ps-spot'), card = el('div', 'tut-card ps-card');
      ov.append(spot, card); document.body.appendChild(ov);
      $('btnStart').classList.add('ps-hl');
      card.innerHTML = `<div class="tut-step">Your first battle</div><div class="tut-t">TENSHI vs BALL</div><div class="tut-x">Two Special balls, the rarest in the game. Press <b>START BATTLE</b> to play!</div>`;
      const row = el('div', 'tut-row'), skip = el('button', 'btn', 'Skip');
      skip.onclick = () => { BB.audio.play('click'); ov.remove(); $('btnStart').classList.remove('ps-hl'); window.removeEventListener('resize', place); if (onSkip) onSkip(); };
      row.appendChild(skip); card.appendChild(row);
      const place = () => {
        if (!ov.isConnected) return window.removeEventListener('resize', place);
        const r = $('btnStart').getBoundingClientRect(), pad = 8, cw = Math.min(320, innerWidth - 24);
        Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
        card.style.width = cw + 'px';
        const ch = card.offsetHeight || 150;
        card.style.top = Math.max(10, r.top - ch - 18) + 'px';
        card.style.left = BB.clamp(r.left + r.width / 2 - cw / 2, 12, innerWidth - cw - 12) + 'px';
      };
      window.addEventListener('resize', place); place();
    },
    // Quick dip to black: mid() runs while the screen is covered, after() once it has faded back in.
    // opts.slow: a gentler version (soft vignette in, a line of text that drifts up, slow fade out).
    fadeBlack(mid, after, opts) {
      const o = opts || {}, f = document.createElement('div');
      f.className = 'fade-black' + (o.slow ? ' slow' : '');
      if (o.text) f.innerHTML = `<div class="fb-text">${o.text}</div>`;
      document.body.appendChild(f);
      const [tin, hold, tout] = o.slow ? [900, o.text ? 1900 : 500, 900] : [260, 220, 260];
      requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('on')));
      setTimeout(() => { mid && mid(); setTimeout(() => { f.classList.add('out'); f.classList.remove('on'); setTimeout(() => { f.remove(); after && after(); }, tout); }, hold); }, tin);
    },
    // After the first-ever battle: an iris closes to a starry void, the player's starter balls pop in
    // around a glowing ring, "YOUR TURN" lands with a shine, then the iris opens on the menu.
    firstOutro(mid, after) {
      const sv = BB.save.data, own = BB.ITEMS.filter((i) => sv.unlocked[i.id] && i.cat === 'weapon').slice(0, 8);
      const f = el('div', 'fo');
      // Scale the full ring-and-balls graphic against the available viewport.
      // Desktop gets a much larger presentation; short/narrow screens stay inside the viewport.
      const vw = window.innerWidth || 1024, vh = window.innerHeight || 768;
      // Make the ring and ball orbit substantially larger on desktop, and fit to the
      // limiting viewport dimension so the title remains visible on short/mobile screens.
      // Scale to both width and height. On desktop this makes the ring reveal about twice
      // as large as the original, while short screens keep enough room for the title below it.
      const scale = Math.max(0.64, Math.min(2.8, vw / 480, vh / 420));
      f.style.setProperty('--fo-scale', scale.toFixed(3));
      f.style.setProperty('--fo-title-offset', Math.round(150 * scale) + 'px');
      const stars = Array.from({ length: 36 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${(Math.random() * 2).toFixed(2)}s;--s:${(1 + Math.random() * 2).toFixed(1)}px"></i>`).join('');
      const balls = own.map((it, k) => { const a = (k / own.length) * Math.PI * 2 - Math.PI / 2; return `<img src="${BB.icon(it.id)}" alt="" style="--x:${(Math.cos(a) * 118).toFixed(0)}px;--y:${(Math.sin(a) * 118).toFixed(0)}px;animation-delay:${(0.9 + k * 0.09).toFixed(2)}s, .9s">`; }).join('');
      f.innerHTML = `<div class="fo-stars">${stars}</div><div class="fo-core"><div class="fo-ring"></div><div class="fo-ring r2"></div><div class="fo-balls">${balls}</div></div>
        <div class="fo-txt"><div class="fo-t">YOUR TURN</div><div class="fo-s">These ${own.length} balls are yours. Build your team!</div></div>`;
      document.body.appendChild(f);
      BB.audio.play('unlock');
      requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('in')));
      setTimeout(() => { mid && mid(); }, 700);
      setTimeout(() => { BB.audio.play('coin'); }, 1700);
      setTimeout(() => { f.classList.add('out'); setTimeout(() => { f.remove(); after && after(); }, 750); }, 3600);
    },
    tutorial(done) {
      const steps = [
        { sel: '#arenaWrap', title: 'Welcome to Ball Vs Ball!', text: 'Balls bounce around the arena with spinning weapons. Every hit makes a weapon stronger. Last ball standing wins!' },
        { sel: '#slots', title: 'Pick your fighters', text: 'Tap a ball card to choose its weapon and set its health and size.' },
        { sel: '.opts', title: 'Modes & maps', text: 'Switch between 1v1, team fights and Free For All, pick a map, or roll random foes.' },
        { sel: '#btnStart', title: 'Start the battle', text: 'Tap Start Battle and watch the chaos. Every battle earns coins to unlock new balls.' },
      ];
      let i = 0;
      const ov = el('div', 'tut');
      const spot = el('div', 'tut-spot');
      const card = el('div', 'tut-card');
      ov.append(spot, card);
      document.body.appendChild(ov);
      const startHit = () => { if (ov.classList.contains('pass')) finish(); };
      $('btnStart').addEventListener('click', startHit, true);
      const finish = () => { ov.remove(); window.removeEventListener('resize', show); $('btnStart').removeEventListener('click', startHit, true); BB.save.data.tutorialDone = true; BB.save.write(); if (done) done(); };
      const show = () => {
        const s = steps[i], tgt = document.querySelector(s.sel);
        const r = tgt ? tgt.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0, bottom: innerHeight / 2 };
        const pad = 8;
        Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
        card.innerHTML = `<div class="tut-step">${i + 1} / ${steps.length}</div><div class="tut-t">${esc(s.title)}</div><div class="tut-x">${esc(s.text)}</div>`;
        const row = el('div', 'tut-row');
        const skip = el('button', 'btn', 'Skip'); skip.onclick = () => { BB.audio.play('click'); finish(); };
        const last = i === steps.length - 1;
        ov.classList.toggle('pass', last); // last step: the real Start Battle button works too
        const next = el('button', 'btn primary', last ? "Let's go!" : 'Next');
        next.onclick = () => { BB.audio.unlock(); BB.audio.play('click'); i++; if (i >= steps.length) finish(); else show(); };
        row.append(skip, next);
        card.appendChild(row);
        const ch = card.offsetHeight || 170, cw = Math.min(340, innerWidth - 24);
        card.style.width = cw + 'px';
        let top = r.bottom + 16;
        if (top + ch > innerHeight - 10) top = Math.max(10, r.top - ch - 16);
        if (top < 10 || r.height > innerHeight * 0.55) top = Math.min(innerHeight - ch - 10, Math.max(10, r.top + r.height / 2 - ch / 2));
        card.style.top = top + 'px';
        card.style.left = BB.clamp(r.left + r.width / 2 - cw / 2, 12, innerWidth - cw - 12) + 'px';
      };
      window.addEventListener('resize', show);
      show();
    },

    results(res) {
      const app = BB.app;
      UI.open((sheet) => {
        const body = el('div', 'sh-body');
        sheet.appendChild(body);
        const wrap = el('div', 'result');
        const col = res.winner >= 0 ? BB.TEAMS[res.winner].fill : '#ffffff';
        wrap.innerHTML = `<div class="r-t" style="color:${col}">${esc(res.title)}</div>
          <div class="r-sub">${esc(res.sub)}</div>
          ${res.icon ? `<img src="${BB.icon(res.icon, 160)}" alt="">` : ''}
          <div class="r-coins" id="rCoins">+${coinHtml(res.coins)}</div>
          <div class="r-stats">${esc(res.stats)}</div>
          ${(BB.meta.lastXP || []).length ? '<div class="xp-list">' + BB.meta.lastXP.map((x) => `<div class="xp-row${x.to > x.from ? ' up' : ''}"><img src="${BB.icon(x.id)}" alt=""><span>${esc(BB.ITEM[x.id].name)}</span><b>+${x.xp} XP</b>${x.to > x.from ? `<em>Lv${x.to}!${x.skins.length ? ' ' + esc(x.skins.join(', ')) + ' skin' : ''} +${x.coins}</em>` : `<i class="m-bar sm"><i style="width:${BB.meta.levelProgress(x.id).pct}%"></i></i>`}</div>`).join('') + '</div>' : ''}`;
        body.appendChild(wrap);
        const foot = el('div', 'sh-foot');
        foot.style.flexDirection = 'column';
        const dbl = el('button', 'btn blue', '<span class="ad-ic">' + BB.ICON.video + '</span> Triple coins');
        dbl.onclick = async () => {
          BB.audio.play('click');
          dbl.disabled = true;
          const r = await app.rewarded();
          if (r === 'finished') {
            BB.save.data.coins += res.coins * 2;
            BB.save.write();
            app.refreshCoins();
            BB.audio.play('coin');
            $('rCoins').innerHTML = '+' + coinHtml(res.coins * 3);
            dbl.textContent = 'Coins tripled!';
          } else {
            UI.toast('No ad available right now. Try again later!');
            dbl.disabled = false;
          }
        };
        if (res.coins > 0 && app.adsAvailable()) foot.appendChild(dbl);
        if (res.pvp) {
          const back = el('button', 'btn primary', 'Send a challenge back');
          back.onclick = () => {
            BB.audio.play('click');
            const me = res.pvp.teams[0][0];
            const link = BB.sdk.inviteLink({ pvp: app.encodeChallenge(me, res.pvp.map, 'Friend') });
            if (!link) { UI.toast('Invites only work on CrazyGames'); return; }
            try { navigator.clipboard.writeText(link); } catch (e) { /* clipboard blocked */ }
            UI.toast('Challenge link copied!');
          };
          foot.appendChild(back);
        }
        const row = el('div', '');
        row.style.cssText = 'display:flex;gap:8px';
        const again = el('button', 'btn primary r-again', BB.ICON.play + ' Play again');
        again.style.flex = '1';
        again.onclick = () => { BB.audio.play('click'); UI.onClose = null; UI.close(); app.afterResults(true); };
        const cont = el('button', 'btn green', 'Continue');
        cont.style.flex = '1';
        cont.onclick = () => { BB.audio.play('click'); UI.onClose = null; UI.close(); app.afterResults(false); };
        row.append(again, cont);
        foot.appendChild(row);
        sheet.appendChild(foot);
      }, { onClose: () => app.afterResults(false), width: '400px' });
    },
  });
})();
