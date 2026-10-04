// CrazyGames HTML5 SDK v3 wrapper. Every call is guarded so the game runs
// unchanged when the SDK is missing (local file, other hosts, ad blockers).
(function () {
  const BB = window.BB;
  const listeners = {};

  const S = (BB.sdk = {
    sdk: null,
    env: 'none',
    ready: false,
    playing: false,
    adPlaying: false,
    lastMidgame: Date.now(),

    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    emit(evt, a) { (listeners[evt] || []).forEach((fn) => { try { fn(a); } catch (e) { console.error(e); } }); },

    async init() {
      const C = window.CrazyGames && window.CrazyGames.SDK;
      if (!C) { console.info('[sdk] CrazyGames SDK not present, running standalone'); return; }
      try {
        await Promise.race([C.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('init timeout')), 6000))]);
        S.sdk = C;
        S.env = C.environment;
        S.ready = S.env === 'crazygames' || S.env === 'local';
        if (S.ready) {
          C.game.addSettingsChangeListener(() => S.emit('settings'));
        }
        console.info('[sdk] environment:', S.env);
      } catch (e) {
        console.warn('[sdk] init failed, running standalone', e);
      }
    },

    call(fn) {
      if (!S.ready) return;
      try { fn(S.sdk); } catch (e) { console.warn('[sdk]', e); }
    },

    loadingStart() { S.call((c) => c.game.loadingStart()); },
    loadingStop() { S.call((c) => c.game.loadingStop()); },
    gameplayStart() {
      if (S.playing) return;
      S.playing = true;
      S.call((c) => c.game.gameplayStart());
    },
    gameplayStop() {
      if (!S.playing) return;
      S.playing = false;
      S.call((c) => c.game.gameplayStop());
    },
    happytime() { S.call((c) => c.game.happytime()); },

    get muteAudio() {
      if (!S.ready) return false;
      try { return !!(S.sdk.game.settings && S.sdk.game.settings.muteAudio); } catch (e) { return false; }
    },

    // Data module for progress saves (synced to the player's CrazyGames account).
    getItem(key) {
      if (S.ready && S.sdk.data) { try { return S.sdk.data.getItem(key); } catch (e) { /* fall through */ } }
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    setItem(key, val) {
      if (S.ready && S.sdk.data) { try { S.sdk.data.setItem(key, val); return; } catch (e) { /* fall through */ } }
      try { window.localStorage.setItem(key, val); } catch (e) { /* storage unavailable */ }
    },

    // Resolves 'finished' | 'error' | 'unavailable'. Audio is muted and the
    // game paused only once the ad actually starts.
    requestAd(type) {
      return new Promise((resolve) => {
        if (!S.ready || !S.sdk.ad) { resolve('unavailable'); return; }
        let done = false;
        const finish = (r) => {
          if (done) return;
          done = true;
          if (S.adPlaying) { S.adPlaying = false; S.emit('adEnd'); }
          resolve(r);
        };
        try {
          S.sdk.ad.requestAd(type, {
            adStarted: () => { S.adPlaying = true; S.emit('adStart'); },
            adFinished: () => finish('finished'),
            adError: (err) => { console.info('[sdk] ad error', err); finish('error'); },
          });
        } catch (e) {
          console.warn('[sdk] requestAd threw', e);
          finish('error');
        }
      });
    },

    // Midgame ads only at natural breaks and at most every 3 minutes.
    async maybeMidgame() {
      if (!S.ready) return;
      if (Date.now() - S.lastMidgame < 180000) return;
      S.lastMidgame = Date.now();
      await S.requestAd('midgame');
    },

    rewarded() { return S.requestAd('rewarded'); },
  });
})();
