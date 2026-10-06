// Friend rooms (CrazyGames): a private live lobby for two friends.
// The leader opens a room (a PeerJS id built from a short room code) and invites a friend with the
// CrazyGames invite button / link (inviteParams { room }). The friend connects straight to the host.
// Both pick a squad and ready up; the host picks the maps + seed and both screens play the same
// seeded 3-round series. After the series both players land back in the room and can play again.
// Friend-room series are unranked.
(function () {
  const BB = window.BB;
  const PREFIX = 'ballvsball-v1-p-', PROTOCOL = 1;
  const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const P = (BB.party = {
    code: null, host: false, peer: null, conn: null, me: null, foe: null, myReady: null, foeReady: null, inSeries: false, token: 0,

    available() { return !!(BB.app && BB.app.pvpAvailable()); },
    active() { return !!P.code; },
    validCode(c) { return typeof c === 'string' && /^[A-Z0-9]{5}$/.test(c); },
    room() { return 'p' + P.code; },
    invite() { return { room: P.code }; },

    // ------------------------------------------------------------- open / join
    async create() {
      P.leave(true);
      const tok = ++P.token;
      P.host = true; P.foe = null;
      try { await BB.net.loadLib(); } catch (e) { return P.fail(tok, 'Could not load multiplayer. Check your connection and try again.'); }
      for (let i = 0; i < 4 && tok === P.token; i++) {
        let c = ''; for (let k = 0; k < 5; k++) c += CODE_CH[Math.floor(Math.random() * CODE_CH.length)];
        try {
          const peer = await BB.net.openPeer(PREFIX + c);
          if (tok !== P.token) { BB.net.destroy(peer); return; }
          P.code = c; P.peer = peer;
          peer.on('connection', (conn) => P.onGuest(tok, conn));
          peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* gone */ } });
          BB.sdk.updateRoom(P.room(), true, P.invite());
          BB.sdk.showInvite(P.invite());
          P.lobby();
          return;
        } catch (err) { if (err.type !== 'unavailable-id') return P.fail(tok, "Can't reach the multiplayer server right now. Try again in a moment."); }
      }
      P.fail(tok, 'Could not open a room. Try again.');
    },

    async join(code) {
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!P.validCode(code)) { BB.ui.toast('That room code is not valid.'); return false; }
      if (P.code === code) { P.lobby(); return true; }
      P.leave(true);
      const tok = ++P.token;
      P.host = false; P.code = code;
      P.connecting();
      try { await BB.net.loadLib(); } catch (e) { return P.fail(tok, 'Could not load multiplayer. Check your connection and try again.'); }
      let peer, conn;
      try { peer = await BB.net.openPeer(null); } catch (e) { return P.fail(tok, "Can't reach the multiplayer server right now. Try again in a moment."); }
      if (tok !== P.token) { BB.net.destroy(peer); return false; }
      P.peer = peer;
      try { conn = await BB.net.connect(peer, PREFIX + code, 9000); } catch (e) { return P.fail(tok, 'That room is closed. Ask your friend to invite you again.'); }
      if (tok !== P.token) { try { conn.close(); } catch (e) { /* */ } return false; }
      conn.send({ t: 'hi', v: PROTOCOL, name: await BB.meta.myName() });
      let r;
      try { r = await BB.net.next(conn, 8000); } catch (e) { return P.fail(tok, 'That room is closed. Ask your friend to invite you again.'); }
      if (!r || r.t !== 'room' || r.v !== PROTOCOL) { try { conn.close(); } catch (e) { /* */ } return P.fail(tok, r && r.t === 'full' ? 'That room is full.' : 'That room is closed.'); }
      P.foe = { name: BB.meta.cleanName(r.name) };
      P.bind(tok, conn);
      BB.sdk.updateRoom(P.room(), false); // two players: the room is full
      BB.audio.play('unlock');
      P.lobby();
      return true;
    },

    onGuest(tok, conn) {
      conn.on('open', async () => {
        let hi;
        try { hi = await BB.net.next(conn, 8000); } catch (e) { try { conn.close(); } catch (x) { /* */ } return; }
        if (!hi || hi.t !== 'hi' || hi.v !== PROTOCOL || P.conn || tok !== P.token) {
          try { conn.send({ t: 'full' }); } catch (e) { /* */ }
          setTimeout(() => { try { conn.close(); } catch (e) { /* */ } }, 300);
          return;
        }
        P.foe = { name: BB.meta.cleanName(hi.name) };
        conn.send({ t: 'room', v: PROTOCOL, name: await BB.meta.myName() });
        P.bind(tok, conn);
        BB.sdk.updateRoom(P.room(), false);
        BB.audio.play('unlock'); BB.ui.toast(P.foe.name + ' joined your room!');
        if (!P.inSeries) P.lobby();
      });
    },

    // ------------------------------------------------------------- messages
    bind(tok, conn) {
      P.conn = conn; P.myReady = P.foeReady = null;
      conn.on('data', (d) => { if (tok === P.token) P.onData(d); });
      conn.on('close', () => { if (tok === P.token && P.conn === conn) P.foeLeft(); });
    },
    send(d) { try { if (P.conn && P.conn.open) P.conn.send(d); } catch (e) { /* closed */ } },
    onData(d) {
      if (!d || typeof d !== 'object') return;
      if (d.t === 'ready' && BB.meta.validIds(d.ids || [])) { P.foeReady = d.ids; P.refresh(); P.maybeStart(); }
      else if (d.t === 'unready') { P.foeReady = null; P.refresh(); }
      else if (d.t === 'start' && !P.host && BB.meta.validIds(d.ids || []) && BB.meta.validMaps(d.maps || []) && P.myReady) P.begin(d.ids, d.maps, d.seed | 0);
      else if (d.t === 'bye') P.foeLeft();
    },
    ready(ids) { P.myReady = ids; P.send({ t: 'ready', ids }); P.refresh(); P.maybeStart(); },
    maybeStart() {
      if (!P.host || !P.myReady || !P.foeReady || P.inSeries) return;
      const rng = BB.RNG((Math.random() * 1e9) | 0);
      const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id), seed = (rng() * 2147483647) | 0;
      P.send({ t: 'start', ids: P.myReady, maps, seed });
      P.begin(P.foeReady, maps, seed);
    },
    begin(theirs, maps, seed) {
      const M = BB.meta;
      P.inSeries = true;
      BB.sdk.hideInvite();
      BB.ui.onClose = null; BB.ui.close();
      BB.audio.play('unlock');
      M.series = { mine: P.myReady, theirs, maps, seed, foeRating: M.pvpData().rating, foeName: P.foe.name, round: 0, score: [0, 0], results: [], live: true, party: true, flip: !P.host };
      P.myReady = P.foeReady = null;
      M.lineup();
    },
    // after a friend-room series: back to the room, both players still connected
    backToRoom() {
      P.inSeries = false;
      BB.meta.series = null;
      BB.app.toMenu();
      if (!P.active()) { BB.meta.openPvp(); return; }
      if (P.host && !P.conn) { BB.sdk.updateRoom(P.room(), true, P.invite()); BB.sdk.showInvite(P.invite()); }
      P.lobby();
    },
    foeLeft() {
      const n = P.foe ? P.foe.name : 'Your friend';
      try { P.conn && P.conn.close(); } catch (e) { /* */ }
      P.conn = null; P.foe = null; P.foeReady = null;
      if (!P.host) { P.leave(true); if (!P.inSeries) { BB.ui.onClose = null; BB.ui.close(); BB.meta.openPvp(); } BB.ui.toast(n + ' closed the room.'); return; }
      BB.ui.toast(n + ' left the room.');
      if (!P.inSeries) { BB.sdk.updateRoom(P.room(), true, P.invite()); BB.sdk.showInvite(P.invite()); P.lobby(); }
    },
    leave(silent) {
      P.token++;
      if (P.conn) P.send({ t: 'bye' });
      const c = P.conn, pe = P.peer, room = P.code && P.room();
      setTimeout(() => { try { c && c.close(); } catch (e) { /* */ } BB.net && BB.net.destroy(pe); }, 150);
      P.conn = P.peer = null; P.code = null; P.foe = null; P.myReady = P.foeReady = null; P.inSeries = false;
      if (room) { BB.sdk.updateRoom(room, false); BB.sdk.hideInvite(); }
      if (!silent) { BB.ui.onClose = null; BB.ui.close(); BB.meta.openPvp(); }
    },
    fail(tok, msg) {
      if (tok !== P.token) return false;
      P.leave(true);
      BB.ui.onClose = null; BB.ui.close();
      BB.ui.toast(msg);
      BB.meta.openPvp();
      return false;
    },

    // ------------------------------------------------------------- UI
    connecting() {
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet');
        sheet.innerHTML = '<div class="vs-round">JOINING ROOM</div><div class="mm-radar"><i></i><i></i><i></i></div><div class="mm-status">Connecting to your friend…</div>';
        const x = document.createElement('button'); x.className = 'btn red vs-go'; x.textContent = 'Cancel';
        x.onclick = () => { BB.audio.play('click'); P.leave(); };
        sheet.appendChild(x);
      }, { width: '440px', onClose: () => P.leave(true) });
    },
    lobby() {
      const link = P.host ? BB.sdk.inviteLink(P.invite()) : null;
      BB.ui.open((sheet) => {
        sheet.classList.add('vs-sheet', 'party-sheet');
        sheet.innerHTML = `<div class="vs-round">FRIEND ROOM</div>
          <div class="party-code">Room <b>${P.code}</b></div>
          <div class="party-slots"></div>
          <ol class="pm-tldr party-help">${P.host ? '<li><b>Invite</b> a friend (button or code)</li><li>Both <b>pick a squad</b></li><li>The series starts when you\'re both ready</li>' : '<li>Both <b>pick a squad</b></li><li>The series starts when you\'re both ready</li>'}</ol>
          <div class="party-btns"></div>`;
        const btns = sheet.querySelector('.party-btns');
        if (P.host) {
          const inv = document.createElement('button'); inv.className = 'btn blue'; inv.innerHTML = BB.ICON.play + ' Copy invite';
          inv.onclick = async () => { BB.audio.play('click'); const t = link || P.code; try { await navigator.clipboard.writeText(t); BB.ui.toast(link ? 'Invite link copied!' : 'Room code copied!'); } catch (e) { BB.ui.toast('Room code: ' + P.code); } };
          btns.appendChild(inv);
        }
        const rd = document.createElement('button'); rd.className = 'btn primary party-ready';
        rd.onclick = () => {
          BB.audio.play('click');
          if (P.myReady) { P.myReady = null; P.send({ t: 'unready' }); P.refresh(); return; }
          if (BB.meta.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to play PvP'); return; }
          BB.meta.pick3('Room Squad', 'Pick 3 different balls in fight order.', (ids) => { P.ready(ids); P.lobby(); });
        };
        const lv = document.createElement('button'); lv.className = 'btn red'; lv.textContent = 'Leave room';
        lv.onclick = () => { BB.audio.play('click'); P.leave(); };
        btns.append(rd, lv);
        P.sheet = sheet; P.refresh();
      }, { width: '460px', onClose: () => { /* closing the sheet keeps the room open; reopen it from PvP */ } });
    },
    refresh() {
      const sh = P.sheet;
      if (!sh || !sh.isConnected || !sh.querySelector('.party-slots')) return;
      const slot = (name, ids, you) => `<div class="party-p${ids ? ' ok' : ''}"><span>${esc(name)}${you ? ' <small>(you)</small>' : ''}</span>${ids ? `<div class="party-sq">${ids.map((id) => `<img src="${BB.icon(id)}" alt="">`).join('')}</div><em>READY</em>` : `<em>${name === 'Waiting…' ? 'INVITE A FRIEND' : 'PICKING…'}</em>`}</div>`;
      // the friend's squad stays hidden until the series starts; just show that they're ready
      const foeSlot = !P.foe ? slot('Waiting…', null, false)
        : `<div class="party-p${P.foeReady ? ' ok' : ''}"><span>${esc(P.foe.name)}</span><em>${P.foeReady ? 'READY' : 'PICKING…'}</em></div>`;
      sh.querySelector('.party-slots').innerHTML = slot('You', P.myReady, true) + foeSlot;
      const rd = sh.querySelector('.party-ready');
      if (rd) rd.textContent = P.myReady ? 'Change squad' : 'Pick squad & ready';
    },
  });
})();
