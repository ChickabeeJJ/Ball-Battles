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
      sheet.innerHTML = '';
      sheet.style.maxWidth = (opts && opts.width) || '';
      build(sheet);
      $('modal').classList.remove('hidden');
      UI.onClose = (opts && opts.onClose) || null;
    },

    close() {
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

        body.appendChild(UI.numField('Health', '', s.hp, 1, 9999, 10, (v) => { s.hp = v; }));
        body.appendChild(UI.numField('Size', 'Ball scale', s.scale, 0.5, 2.5, 0.25, (v) => { s.scale = v; }, true));
        body.appendChild(el('div', 'section-t', 'Overrides (0 = default)'));
        body.appendChild(UI.numField('Damage', 'Starting damage', s.ov.damage, 0, 999, 1, (v) => { s.ov.damage = v; }));
        body.appendChild(UI.numField('Spin', 'Weapon spin °/s', s.ov.spin, 0, 3000, 30, (v) => { s.ov.spin = v; }));
        body.appendChild(UI.numField('Speed', 'Ball speed', s.ov.speed, 0, 2000, 50, (v) => { s.ov.speed = v; }));
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

    // ------------------------------------------------------------- item picker / shop
    pickItem(slotIdx, tab) {
      const app = BB.app, save = BB.save.data;
      const s = save.setup.slots[slotIdx];
      const mine = app.teamOfSlot(slotIdx) === 0;
      let sel = s.id;
      tab = tab || (BB.ITEM[s.id].cat === 'special' ? 'special' : 'weapon');

      UI.open((sheet) => {
        const body = UI.head(sheet, mine ? 'Choose Your Ball' : 'Choose Opponent', { onX: () => UI.editSlot(slotIdx) });
        const tabs = el('div', 'tabs');
        for (const [k, n] of [['weapon', 'Weapons'], ['special', 'Specials']]) {
          const t = el('button', 'tab' + (tab === k ? ' on' : ''), n);
          t.onclick = () => { BB.audio.play('click'); UI.pickItem(slotIdx, k); };
          tabs.appendChild(t);
        }
        body.appendChild(tabs);
        const detail = el('div', 'detail');
        body.appendChild(detail);
        if (!mine) body.appendChild(el('div', 'f-s', 'Opponents can use any ball, even ones you have not unlocked yet.'));
        const grid = el('div', 'grid');
        body.appendChild(grid);

        const foot = el('div', 'sh-foot');
        sheet.appendChild(foot);

        const renderDetail = () => {
          const it = BB.ITEM[sel];
          const r = BB.RARITY[it.rarity];
          detail.innerHTML = `<img src="${BB.icon(sel)}" alt=""><div style="flex:1;min-width:0"><div class="d-n">${esc(it.name)}</div>
            <div class="d-r" style="color:${r.color}">${r.name}</div><div class="d-d">${esc(it.desc)}</div></div>`;
          foot.innerHTML = '';
          const owned = app.isOwned(sel);
          if (!mine || owned) {
            const b = el('button', 'btn green', 'Equip');
            b.onclick = () => { BB.audio.play('click'); s.id = sel; BB.save.write(); UI.editSlot(slotIdx); };
            foot.appendChild(b);
          } else {
            const buy = el('button', 'btn primary', 'Unlock ' + coinHtml(it.price));
            if (save.coins < it.price) buy.disabled = true;
            buy.onclick = () => {
              if (save.coins < it.price) return;
              save.coins -= it.price;
              save.unlocked[sel] = true;
              BB.save.write();
              BB.audio.play('unlock');
              BB.sdk.happytime();
              app.refreshCoins();
              UI.toast(it.name + ' unlocked!');
              s.id = sel; BB.save.write();
              UI.pickItem(slotIdx, tab);
            };
            const trial = el('button', 'btn blue', '<span class="ad-ic">AD</span> Try once');
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
            foot.append(buy, trial);
          }
          grid.querySelectorAll('.tile').forEach((t) => t.classList.toggle('sel', t.dataset.id === sel));
        };

        const items = BB.ITEMS.filter((i) => i.cat === tab);
        const rank = { common: 0, rare: 1, epic: 2, legendary: 3 };
        items.sort((a, b) => rank[a.rarity] - rank[b.rarity]);
        for (const it of items) {
          const owned = app.isOwned(it.id);
          const t = el('button', 'tile' + (mine && !owned ? ' locked' : ''));
          t.dataset.id = it.id;
          t.innerHTML = `<img src="${BB.icon(it.id)}" alt=""><span class="t-n">${esc(it.name)}</span><span class="rar" style="background:${BB.RARITY[it.rarity].color}"></span>`;
          if (!owned) t.innerHTML += `<span class="price">${coinHtml(it.price)}</span>`;
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
        const toggles = [
          ['dark', 'Dark Mode', ''],
          ['hitlag', 'Hit Freeze', 'Tiny pause on big hits'],
          ['parrylag', 'Parry Freeze', 'Tiny pause when weapons clash'],
          ['dmgNumbers', 'Damage Numbers', ''],
          ['reverseB', 'Reverse Team 2 Spin', 'Red team spins the other way'],
          ['vibrate', 'Vibration', 'On supported phones'],
        ];
        for (const [k, n, sub] of toggles) {
          const f = el('div', 'field');
          f.innerHTML = `<div><div class="f-k">${n}</div>${sub ? `<div class="f-s">${sub}</div>` : ''}</div>`;
          const t = el('button', 'toggle' + (st[k] ? ' on' : ''));
          t.setAttribute('aria-label', n);
          t.onclick = () => { BB.audio.play('click'); st[k] = !st[k]; t.classList.toggle('on', st[k]); BB.save.write(); app.applySettings(); };
          f.appendChild(t);
          body.appendChild(f);
        }
        const credits = el('div', 'f-s', 'Font: Lilita One (SIL Open Font License). Battles won: ' + BB.save.data.stats.wins + ' / ' + BB.save.data.stats.battles);
        credits.style.textAlign = 'center';
        body.appendChild(credits);
      }, { onClose: () => app.onSettingsClosed() });
    },

    // ------------------------------------------------------------- pause / results
    pause() {
      const app = BB.app;
      UI.open((sheet) => {
        const body = UI.head(sheet, 'Paused', { onX: () => app.resume() });
        const resume = el('button', 'btn green', 'Resume');
        resume.onclick = () => { BB.audio.play('click'); app.resume(); };
        const restart = el('button', 'btn primary', 'Restart');
        restart.onclick = () => { BB.audio.play('click'); UI.onClose = null; UI.close(); app.startBattle(); };
        const quit = el('button', 'btn red', 'Quit to Menu');
        quit.onclick = () => { BB.audio.play('click'); UI.onClose = null; UI.close(); app.toMenu(); };
        const opts = el('button', 'btn', 'Settings');
        opts.onclick = () => { BB.audio.play('click'); UI.onClose = null; app.pausedSettings = true; UI.settings(); };
        body.append(resume, restart, opts, quit);
      }, { onClose: () => app.resume(), width: '360px' });
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
          <div class="r-stats">${esc(res.stats)}</div>`;
        body.appendChild(wrap);
        const foot = el('div', 'sh-foot');
        foot.style.flexDirection = 'column';
        const dbl = el('button', 'btn blue', '<span class="ad-ic">AD</span> Double coins');
        dbl.onclick = async () => {
          BB.audio.play('click');
          dbl.disabled = true;
          const r = await app.rewarded();
          if (r === 'finished') {
            BB.save.data.coins += res.coins;
            BB.save.write();
            app.refreshCoins();
            BB.audio.play('coin');
            $('rCoins').innerHTML = '+' + coinHtml(res.coins * 2);
            dbl.textContent = 'Coins doubled!';
          } else {
            UI.toast('No ad available right now. Try again later!');
            dbl.disabled = false;
          }
        };
        if (res.coins > 0) foot.appendChild(dbl);
        const row = el('div', '');
        row.style.cssText = 'display:flex;gap:8px';
        const again = el('button', 'btn primary', 'Rematch');
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
