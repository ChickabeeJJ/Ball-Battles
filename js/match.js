// PvP live matchmaking (CrazyGames only), same approach as Nexo TD: the free public PeerJS server
// introduces two online players through 10 shared "quick match" waiting slots, then they talk
// peer to peer (WebRTC). Because every fight is seeded and deterministic, the two players only swap
// names, ratings and squads (the host also picks the maps and seed); both screens then play the
// exact same 3-round series. Set window.BVB_MP_CONFIG = { server: { host, port, path, secure } }
// before the game scripts load to use your own PeerJS server.
(function () {
  const BB = window.BB;
  const PROTOCOL = 1, PREFIX = 'ballvsball-v1-q', SLOTS = 10;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const opts = () => Object.assign({ debug: 0 }, (window.BVB_MP_CONFIG || {}).server || {});

  const Net = {
    lib: null,
    loadLib() {
      if (window.Peer) return Promise.resolve();
      if (this.lib) return this.lib;
      this.lib = new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = 'lib/peerjs.min.js';
        s.onload = () => (window.Peer ? res() : rej(new Error('lib')));
        s.onerror = () => { this.lib = null; rej(new Error('lib')); };
        document.head.appendChild(s);
      });
      return this.lib;
    },
    openPeer(id, ms = 9000) {
      return new Promise((resolve, reject) => {
        let peer;
        try { peer = id ? new Peer(id, opts()) : new Peer(opts()); } catch (e) { reject({ type: 'init' }); return; }
        const tm = setTimeout(() => fail('timeout'), ms);
        const clean = () => { clearTimeout(tm); peer.off('open', onOpen); peer.off('error', onErr); };
        const fail = (type) => { clean(); try { peer.destroy(); } catch (e) { /* gone */ } reject({ type }); };
        const onOpen = () => { clean(); resolve(peer); };
        const onErr = (e) => fail((e && e.type) || 'error');
        peer.on('open', onOpen); peer.on('error', onErr);
      });
    },
    connect(peer, target, ms = 7000) {
      return new Promise((resolve, reject) => {
        let conn;
        try { conn = peer.connect(target, { reliable: true, serialization: 'json' }); } catch (e) { reject({ type: 'connect' }); return; }
        if (!conn) { reject({ type: 'connect' }); return; }
        const tm = setTimeout(() => fail('timeout'), ms);
        const done = () => { clearTimeout(tm); peer.off('error', onPeerErr); conn.off('open', onOpen); conn.off('error', onErr); };
        const fail = (type) => { done(); try { conn.close(); } catch (e) { /* none */ } reject({ type }); };
        const onPeerErr = (e) => { if (e && e.type === 'peer-unavailable' && String(e.message || '').endsWith(target)) fail('peer-unavailable'); };
        const onOpen = () => { done(); resolve(conn); };
        const onErr = () => fail('conn-error');
        peer.on('error', onPeerErr); conn.on('open', onOpen); conn.on('error', onErr);
      });
    },
    next(conn, ms = 6000) {
      return new Promise((resolve, reject) => {
        const tm = setTimeout(() => { done(); reject({ type: 'timeout' }); }, ms);
        const done = () => { clearTimeout(tm); conn.off('data', onData); conn.off('close', onClose); };
        const onData = (d) => { done(); resolve(d); };
        const onClose = () => { done(); reject({ type: 'closed' }); };
        conn.on('data', onData); conn.on('close', onClose);
      });
    },
    destroy(p) { if (p) try { p.destroy(); } catch (e) { /* gone */ } },
  };

  BB.net = Net; // shared with the friend rooms (js/party.js)
  const MM = (BB.match = {
    token: 0, searching: false, matched: false, host: null, client: null, probe: null, ids: null, t0: 0,

    available() { return !!(BB.app && BB.app.pvpAvailable()); },

    async me() {
      const M = BB.meta;
      return { name: await M.myName(), rating: M.pvpData().rating, ids: MM.ids };
    },
    validSquad(d) { return d && Array.isArray(d.ids) && BB.meta.validIds(d.ids); },

    // One tap: reuse the last squad (if you still own it) and search straight away.
    start(pick) {
      const M = BB.meta, pv = M.pvpData();
      const ban = M.banLeft();
      if (ban) { BB.ui.toast(`PvP is disabled for leaving matches. It unlocks in ${Math.floor(ban / 60)}:${String(ban % 60).padStart(2, '0')}.`, 3500); M.openPvp(); return; }
      if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to play PvP'); return; }
      const last = pv.squad;
      if (!pick && Array.isArray(last) && M.validIds(last) && last.every((id) => BB.app.isOwned(id))) { MM.ids = last.slice(); MM.search(); return; }
      M.pick3('Your Squad', 'Pick 3 different balls in fight order. It is saved for your next match.', (ids) => { pv.squad = ids.slice(); BB.save.write(); MM.ids = ids; MM.search(); });
    },

    stop() {
      MM.token++; MM.searching = false; clearTimeout(MM.botTimer);
      clearInterval(MM.probe); MM.probe = null; clearInterval(MM.uiTimer);
      Net.destroy(MM.host); Net.destroy(MM.client); MM.host = MM.client = null;
    },

    // searching screen with a timer and a cancel button
    showSearch() {
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet');
        sheet.innerHTML = `<div class="vs-round">FINDING A MATCH</div>
          <div class="mm-radar"><i></i><i></i><i></i><div class="mm-squad">${MM.ids.map((id) => `<img src="${BB.icon(id)}" alt="">`).join('')}</div></div>
          <div class="mm-status">Searching for a player… <b class="mm-time">0:00</b></div>
          <div class="f-s" style="text-align:center">Both players need to be online. You can keep this open: as soon as someone searches, you're matched.</div>`;
        const row = document.createElement('div'); row.className = 'mm-btns';
        const ch = document.createElement('button'); ch.className = 'btn blue'; ch.textContent = 'Change squad';
        ch.onclick = () => { BB.audio.play('click'); MM.stop(); BB.ui.onClose = null; BB.ui.close(); MM.start(true); };
        const x = document.createElement('button'); x.className = 'btn red'; x.textContent = 'Cancel';
        x.onclick = () => { BB.audio.play('click'); MM.stop(); BB.ui.onClose = null; BB.ui.close(); BB.meta.openPvp(); };
        row.append(ch, x); sheet.appendChild(row);
        MM.t0 = performance.now();
        MM.uiTimer = setInterval(() => { const s = Math.floor((performance.now() - MM.t0) / 1000), el = sheet.querySelector('.mm-time'); if (el) el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 500);
      }, { width: '480px', onClose: () => MM.stop() });
    },

    live(tok) { return MM.token === tok && MM.searching && !MM.matched; },

    async search() {
      MM.stop();
      const tok = ++MM.token;
      MM.searching = true; MM.matched = false;
      MM.showSearch();
      // nobody around: after 24-35s pair up with a stand-in opponent instead of waiting forever
      MM.botTimer = setTimeout(() => { if (MM.live(tok)) MM.botMatch(); }, 24000 + Math.random() * 11000);
      try { await Net.loadLib(); } catch (e) { return MM.fail(tok, 'Could not load multiplayer. Check your connection and try again.'); }
      let failures = 0;
      while (MM.live(tok)) {
        for (let slot = 0; slot < SLOTS && MM.live(tok); slot++) {
          const id = PREFIX + slot;
          try {
            const peer = await Net.openPeer(id);
            if (!MM.live(tok)) { Net.destroy(peer); return; }
            MM.waitAsHost(tok, peer, slot);
            return;
          } catch (err) {
            if (err.type !== 'unavailable-id') {
              if (++failures >= 3) return MM.fail(tok, "Can't reach the matchmaking server right now. Try again in a moment.");
              await wait(700); continue;
            }
          }
          if (await MM.tryJoin(tok, id)) return;
        }
        await wait(1500);
      }
    },

    waitAsHost(tok, peer, slot) {
      MM.host = peer;
      peer.on('connection', (conn) => MM.onIncoming(tok, conn));
      peer.on('error', (e) => {
        if (!MM.live(tok)) return;
        if (e && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) { Net.destroy(MM.host); MM.host = null; MM.search(); }
      });
      // waiting in a higher slot: keep checking the lower ones so two waiting players always meet
      if (slot > 0) {
        let busy = false;
        MM.probe = setInterval(async () => {
          if (!MM.live(tok) || busy) return;
          busy = true;
          for (let s = 0; s < slot && MM.live(tok); s++) if (await MM.tryJoin(tok, PREFIX + s)) break;
          busy = false;
        }, 4000);
      }
    },

    onIncoming(tok, conn) {
      conn.on('open', async () => {
        let hello;
        try { hello = await Net.next(conn); } catch (e) { try { conn.close(); } catch (x) { /* */ } return; }
        if (!hello || hello.t !== 'hello' || hello.v !== PROTOCOL || !MM.validSquad(hello) || !MM.live(tok)) {
          try { conn.send({ t: 'full' }); } catch (e) { /* */ }
          setTimeout(() => { try { conn.close(); } catch (e) { /* */ } }, 300);
          return;
        }
        MM.matched = true;
        const rng = BB.RNG((Math.random() * 1e9) | 0);
        const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id), seed = (rng() * 2147483647) | 0;
        conn.send(Object.assign({ t: 'welcome', v: PROTOCOL, maps, seed }, await MM.me()));
        MM.begin(hello, maps, seed, true, conn); // the link stays open: aims are exchanged every round
      });
    },

    async tryJoin(tok, target) {
      let peer;
      try { if (!MM.client || MM.client.destroyed || MM.client.disconnected) { Net.destroy(MM.client); MM.client = await Net.openPeer(null); } peer = MM.client; } catch (e) { return false; }
      if (!MM.live(tok)) return false;
      let conn;
      try { conn = await Net.connect(peer, target); } catch (e) { return false; }
      if (!MM.live(tok)) { try { conn.close(); } catch (e) { /* */ } return false; }
      conn.send(Object.assign({ t: 'hello', v: PROTOCOL }, await MM.me()));
      let reply;
      try { reply = await Net.next(conn); } catch (e) { try { conn.close(); } catch (x) { /* */ } return false; }
      if (!reply || reply.t !== 'welcome' || reply.v !== PROTOCOL || !MM.validSquad(reply) || !BB.meta.validMaps(reply.maps || [])) { try { conn.close(); } catch (e) { /* */ } return false; }
      if (!MM.live(tok)) return false;
      MM.matched = true;
      MM.begin(reply, reply.maps, reply.seed | 0, false, conn);
      return true;
    },

    // matched: both sides now hold the same squads, maps and seed
    begin(opp, maps, seed, iAmHost, conn) {
      const M = BB.meta;
      const name = M.cleanName(opp.name), rating = Math.max(0, Math.min(4000, Math.round(Number(opp.rating) || 1000)));
      const ids = MM.ids;
      // keep the peer that owns the live link; everything else is torn down
      const keep = iAmHost ? MM.host : MM.client;
      if (iAmHost) MM.host = null; else MM.client = null;
      MM.stop();
      BB.ui.onClose = null; BB.ui.close();
      BB.audio.play('unlock'); BB.sdk.happytime();
      M.series = { mine: ids, theirs: opp.ids, maps, seed, foeRating: rating, foeName: name, round: 0, score: [0, 0], results: [], live: true, flip: !iAmHost };
      M.markLive(M.series); // leaving before the end counts as a loss (see M.checkAbandon)
      if (conn) BB.shoot.link(M.series, conn, keep);
      else Net.destroy(keep); // stand-in opponent: close the slot we were waiting in
      if (conn) BB.sdk.updateRoom('m' + seed, false); // in a live 1v1 room (full)
      M.lineup();
    },

    // A stand-in opponent: realistic name, rating near yours, a sensible squad. It aims like a
    // person (see BB.shoot.botAim) and the series plays exactly like a live one.
    botMatch() {
      const M = BB.meta, pv = M.pvpData(), rng = Math.random;
      MM.matched = true;
      const pool = BB.ITEMS.filter((i) => i.cat !== 'hidden' && i.id !== 'kami' && i.id !== 'dummy' && !i.dailyOnly);
      const tier = { common: 0, rare: 1, epic: 2, legendary: 3 };
      const myTier = MM.ids.reduce((n, id) => n + (tier[BB.ITEM[id].rarity] || 0), 0) / 3;
      const pick = [];
      while (pick.length < 3) {
        const it = pool[Math.floor(rng() * pool.length)];
        if (pick.includes(it.id) || Math.abs((tier[it.rarity] || 0) - myTier) > 1.5) continue;
        pick.push(it.id);
      }
      const opp = { name: MM.botName(), rating: Math.max(0, Math.round(pv.rating + (rng() - 0.5) * 140)), ids: pick };
      const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id), seed = (rng() * 2147483647) | 0;
      MM.begin(opp, maps, seed, true, null);
      M.series.bot = true;
      M.series.send = () => {};
      BB.shoot.reset();
    },
    botName() {
      const r = (a) => a[Math.floor(Math.random() * a.length)];
      const A = ['Shadow', 'Pixel', 'Turbo', 'Mega', 'Night', 'Blaze', 'Frost', 'Lucky', 'Crazy', 'Dark', 'Epic', 'Silent', 'Rapid', 'Cosmic', 'Golden', 'Iron', 'Neon', 'Royal', 'Wild', 'Sly'];
      const B = ['Wolf', 'Ninja', 'Gamer', 'Ball', 'Knight', 'Fox', 'Tiger', 'Dragon', 'Slayer', 'Sniper', 'King', 'Panda', 'Hawk', 'Storm', 'Ace', 'Viper', 'Rider', 'Bandit', 'Spark', 'Bolt'];
      const F = ['alex', 'sam', 'leo', 'mia', 'noah', 'zoe', 'max', 'kai', 'liam', 'emma', 'jay', 'nina', 'theo', 'ruby', 'finn', 'ella', 'omar', 'lucas', 'ivy', 'ben'];
      const n = () => String(Math.floor(Math.random() * (Math.random() < 0.5 ? 100 : 10000)));
      const forms = [() => r(A) + r(B), () => r(A) + r(B) + n(), () => r(F) + n(), () => r(F) + '_' + r(B).toLowerCase(), () => 'xX' + r(B) + 'Xx', () => r(F).charAt(0).toUpperCase() + r(F).slice(1) + r(['YT', 'TV', 'GG', 'Pro', '']), () => r(B).toLowerCase() + r(['_', '.', '']) + n()];
      return BB.meta.cleanName(r(forms)());
    },

    fail(tok, msg) {
      if (MM.token !== tok) return;
      MM.stop();
      BB.ui.onClose = null; BB.ui.close();
      BB.ui.toast(msg);
      BB.meta.openPvp();
    },
  });
})();
