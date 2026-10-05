// PvP matchmaking (async squad pool). Players' squads go into a shared table; "Find a match" pulls a
// real squad near your rating, the series plays exactly like code PvP, and the result is stored so the
// squad's owner gets their rating change the next time they open the game.
// Backend: Supabase (PostgREST). Fill in BB.MATCH_CONFIG in js/config.js; see tools/matchmaking.sql.
(function () {
  const BB = window.BB;
  const cfg = () => BB.MATCH_CONFIG || {};
  const MM = (BB.match = {
    ready() { const c = cfg(); return !!(c.url && c.key); },
    me() {
      const m = BB.meta.data();
      if (!m.uid) { m.uid = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); BB.save.write(); }
      return m.uid;
    },
    async api(path, opts) {
      const c = cfg();
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(c.url.replace(/\/$/, '') + '/rest/v1/' + path, Object.assign({
          signal: ctl.signal,
          headers: { apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
        }, opts || {}));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const t = await r.text();
        return t ? JSON.parse(t) : null;
      } finally { clearTimeout(tm); }
    },

    // upload my squad, then fetch an opponent's squad close to my rating (widening the window if needed)
    async find(ids) {
      const M = BB.meta, pv = M.pvpData(), me = MM.me(), name = await M.myName();
      const rng = BB.RNG((Math.random() * 1e9) | 0);
      const maps = [0, 1, 2].map(() => BB.MAPS[Math.floor(rng() * BB.MAPS.length)].id);
      const seed = (rng() * 2147483647) | 0;
      await MM.api('squads', { method: 'POST', body: JSON.stringify({ owner: me, name, ids: ids.join('.'), maps: maps.join('.'), seed, rating: pv.rating }) });
      for (const span of [100, 250, 600, 5000]) {
        const q = `squads?select=id,owner,name,ids,maps,seed,rating&owner=neq.${encodeURIComponent(me)}&rating=gte.${pv.rating - span}&rating=lte.${pv.rating + span}&order=created_at.desc&limit=25`;
        const rows = (await MM.api(q)) || [];
        const ok = rows.map((r) => ({ r, ids: String(r.ids).split('.'), maps: String(r.maps).split('.') })).filter((x) => M.validIds(x.ids) && M.validMaps(x.maps));
        if (ok.length) {
          const pick = ok[Math.floor(Math.random() * ok.length)];
          return { squadId: pick.r.id, ch: { ids: pick.ids, maps: pick.maps, seed: pick.r.seed | 0, rating: pick.r.rating | 0, name: M.cleanName(pick.r.name) } };
        }
      }
      return null;
    },

    async report(squadId, sr) {
      const M = BB.meta;
      try {
        await MM.api('results', { method: 'POST', body: JSON.stringify({ squad_id: squadId, challenger: MM.me(), challenger_name: await M.myName(), results: sr.results.join('.'), challenger_rating: M.pvpData().rating }) });
      } catch (e) { console.warn('[match] report failed', e); }
    },

    // squads of mine that other players fought while I was away
    async inbox() {
      if (!MM.ready()) return;
      const M = BB.meta, pv = M.pvpData(), me = MM.me();
      pv.inbox = pv.inbox || [];
      try {
        const rows = (await MM.api(`results?select=id,results,challenger_name,challenger_rating,squads!inner(owner)&squads.owner=eq.${encodeURIComponent(me)}&order=created_at.desc&limit=20`)) || [];
        const fresh = rows.filter((r) => !pv.inbox.includes(r.id));
        if (!fresh.length) return;
        let won = 0, lost = 0;
        for (const r of fresh.reverse()) {
          pv.inbox.unshift(r.id);
          // results are from the challenger's view: 0 = challenger won the round
          const res = String(r.results).split('.').map(Number);
          const mine = res.filter((x) => x === 1).length, theirs = res.filter((x) => x === 0).length;
          const score = mine > theirs ? 1 : mine === theirs ? 0.5 : 0;
          const d = M.applyRating(pv, r.challenger_rating | 0, score);
          M.pushHist(pv, M.cleanName(r.challenger_name), mine + '-' + theirs, d, score === 1 ? 1 : score === 0 ? -1 : 0);
          if (score === 1) won++; else if (score === 0) lost++;
        }
        pv.inbox.length = Math.min(pv.inbox.length, 100);
        BB.save.write();
        BB.ui.toast(`Your squad was played ${fresh.length} time${fresh.length > 1 ? 's' : ''} while you were away: ${won} W · ${lost} L`);
      } catch (e) { console.warn('[match] inbox failed', e); }
    },

    async start() {
      const M = BB.meta;
      if (M.ownedCount() < 3) { BB.ui.toast('Unlock at least 3 balls to play PvP'); return; }
      if (!MM.ready()) { BB.ui.toast('Matchmaking is not set up yet'); return; }
      M.pick3('Matchmaking Squad', 'Pick 3 different balls in fight order. Your squad also joins the pool so other players can fight it.', async (ids) => {
        BB.ui.open((sheet) => {
          sheet.classList.add('vs-sheet');
          sheet.innerHTML = '<div class="vs-round">FINDING A MATCH</div><div class="mm-spin"><i></i><i></i><i></i></div><div class="f-s" style="text-align:center">Looking for a squad near your rating…</div>';
        }, { width: '460px' });
        let found = null;
        try { found = await MM.find(ids); } catch (e) { console.warn('[match] find failed', e); }
        BB.ui.onClose = null; BB.ui.close();
        if (!found) { BB.ui.toast('No squads near your rating yet. Yours was added to the pool, try again soon!'); return; }
        BB.sdk.updateRoom('mm-' + found.squadId, false);
        M.series = { mine: ids, theirs: found.ch.ids, maps: found.ch.maps, seed: found.ch.seed, foeRating: found.ch.rating, foeName: found.ch.name, round: 0, score: [0, 0], results: [], squadId: found.squadId, matchmade: true };
        M.lineup();
      });
    },
  });
})();
