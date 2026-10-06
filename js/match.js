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

  const MM = (BB.match = {
    token: 0, searching: false, matched: false, host: null, client: null, probe: null, ids: null, t0: 0,

    available() { return !!(BB.app && BB.app.pvpAvailable()); },

    async me() {
      const M = BB.meta;
      return { name: await M.myName(), rating: M.pvpData().rating, ids: MM.ids };
    },
    validSquad(d) { return d && Array.isArray(d.ids) && BB.meta.validIds(d.ids); },

    start() {
      const M = BB.meta;
      if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to play PvP'); return; }
      M.pick3('Matchmaking Squad', 'Pick 3 different balls in fight order. You will be matched with another player online right now.', (ids) => { MM.ids = ids; MM.search(); });
    },

    stop() {
      MM.token++; MM.searching = false;
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
        const x = document.createElement('button'); x.className = 'btn red vs-go'; x.textContent = 'Cancel';
        x.onclick = () => { BB.audio.play('click'); MM.stop(); BB.ui.onClose = null; BB.ui.close(); BB.meta.openPvp(); };
        sheet.appendChild(x);
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
        setTimeout(() => { try { conn.close(); } catch (e) { /* */ } }, 1500);
        MM.begin(hello, maps, seed, true);
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
      setTimeout(() => { try { conn.close(); } catch (e) { /* */ } }, 1500);
      MM.begin(reply, reply.maps, reply.seed | 0, false);
      return true;
    },

    // matched: both sides now hold the same squads, maps and seed
    begin(opp, maps, seed, iAmHost) {
      const M = BB.meta;
      const name = M.cleanName(opp.name), rating = Math.max(0, Math.min(4000, Math.round(Number(opp.rating) || 1000)));
      const ids = MM.ids;
      MM.stop();
      BB.ui.onClose = null; BB.ui.close();
      BB.audio.play('unlock'); BB.sdk.happytime();
      M.series = { mine: ids, theirs: opp.ids, maps, seed, foeRating: rating, foeName: name, round: 0, score: [0, 0], results: [], live: true, flip: !iAmHost };
      BB.sdk.updateRoom('m' + seed, false); // in a live 1v1 room (full)
      M.lineup();
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
