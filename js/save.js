// Player progress: coins, unlocks, settings and the last battle setup.
(function () {
  const BB = window.BB;
  const KEY = 'ballbattles_save_v1';

  function defaults() {
    const unlocked = {};
    for (const it of BB.ITEMS) if (it.price === 0) unlocked[it.id] = true;
    return {
      v: 1,
      coins: 0,
      unlocked,
      settings: { sound: 0.8, dark: false, hitlag: true, parrylag: true, reverseB: false, vibrate: true, dmgNumbers: true, impact: false },
      tutorialDone: false,
      setup: {
        mode: '1v1', map: 'classic', control: false,
        slots: BB.DEFAULT_SLOTS.map((id) => ({ id, hp: 100, scale: 1, ov: { damage: 0, spin: 0, speed: 0 } })),
      },
      stats: { battles: 0, wins: 0 },
    };
  }

  const Save = (BB.save = {
    data: null,
    load() {
      const d = defaults();
      let raw = null;
      try { raw = BB.sdk.getItem(KEY); } catch (e) { raw = null; }
      if (raw) {
        try {
          const s = JSON.parse(raw);
          d.coins = Math.max(0, Number(s.coins) || 0);
          Object.assign(d.unlocked, s.unlocked || {});
          Object.assign(d.settings, s.settings || {});
          if (s.setup) {
            if (BB.MODE[s.setup.mode]) d.setup.mode = s.setup.mode;
            if (BB.MAP[s.setup.map]) d.setup.map = s.setup.map;
            d.setup.control = false;
            (s.setup.slots || []).forEach((sl, i) => {
              if (i < d.setup.slots.length && sl && BB.ITEM[sl.id] && BB.ITEM[sl.id].cat !== 'hidden') {
                d.setup.slots[i] = {
                  id: sl.id,
                  hp: BB.clamp(Math.round(sl.hp) || 100, 1, 9999),
                  scale: BB.clamp(Number(sl.scale) || 1, 0.5, 2.5),
                  ov: { damage: Math.max(0, +(sl.ov && sl.ov.damage) || 0), spin: Math.max(0, +(sl.ov && sl.ov.spin) || 0), speed: Math.max(0, +(sl.ov && sl.ov.speed) || 0) },
                };
              }
            });
          }
          Object.assign(d.stats, s.stats || {});
          d.tutorialDone = !!s.tutorialDone;
        } catch (e) {
          console.warn('save corrupt, starting fresh', e);
        }
      }
      Save.data = d;
      return d;
    },
    write() {
      try { BB.sdk.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { console.warn('save failed', e); }
    },
  });
})();
