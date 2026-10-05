// Tiny WebAudio synth: every sound is generated, so there are no audio files to load.
(function () {
  const BB = window.BB;
  let ctx = null, master = null, noiseBuf = null;
  const A = (BB.audio = { volume: 0.8, blocked: false, lastPlay: {} });

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.apply();
    return ctx;
  }

  // Must be called from a user gesture to satisfy autoplay policies.
  A.unlock = function () {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  };

  // `blocked` covers SDK mute, ads playing and hidden tabs.
  A.apply = function () {
    if (!master) return;
    const v = A.blocked ? 0 : A.volume * 0.6;
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
  };
  A.setVolume = function (v) { A.volume = v; A.apply(); };
  A.setBlocked = function (b) { A.blocked = b; A.apply(); };

  function ok(name, gap) {
    if (!ctx || A.blocked || A.volume <= 0 || ctx.state !== 'running') return false;
    const now = ctx.currentTime;
    if (A.lastPlay[name] && now - A.lastPlay[name] < gap) return false;
    A.lastPlay[name] = now;
    return true;
  }

  function tone(type, f0, f1, dur, vol, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq, q, delay) {
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  A.play = function (name, p) {
    p = p || {};
    switch (name) {
      case 'hit': {
        if (!ok('hit', 0.03)) return;
        const k = Math.min(1, (p.amt || 1) / 20);
        noise(0.12 + k * 0.1, 0.5 + k * 0.3, 900 - k * 500, 0.9);
        tone('square', 260 - k * 140, 70, 0.12 + k * 0.08, 0.25);
        if (p.crit) tone('triangle', 1400, 700, 0.15, 0.2);
        break;
      }
      case 'dot': if (ok('dot', 0.12)) noise(0.06, 0.18, 1800, 2); break;
      case 'parry':
        if (!ok('parry', 0.05)) return;
        tone('triangle', p.small ? 2400 : 1800, p.small ? 1800 : 1200, 0.18, 0.25);
        tone('sine', p.small ? 3600 : 2700, 2400, 0.12, 0.12);
        break;
      case 'wall': if (ok('wall', 0.07)) tone('sine', 180, 120, 0.05, 0.08); break;
      case 'bump': if (ok('bump', 0.06)) tone('sine', 140, 80, 0.08, 0.2); break;
      case 'shoot': if (ok('shoot', 0.05)) noise(0.08, p.small ? 0.12 : 0.2, 2600, 1.5); break;
      case 'boom':
        if (!ok('boom', 0.06)) return;
        noise(p.small ? 0.2 : 0.45, p.small ? 0.35 : 0.7, 300, 0.7);
        tone('sine', 120, 40, p.small ? 0.2 : 0.4, 0.4);
        break;
      case 'death':
        if (!ok('death', 0.05)) return;
        tone('square', 520, 60, 0.35, 0.2);
        noise(0.3, 0.5, 600, 0.8);
        break;
      case 'build': if (ok('build', 0.05)) { tone('square', 400, 0, 0.06, 0.12); tone('square', 600, 0, 0.06, 0.12, 0.07); } break;
      case 'break': if (ok('break', 0.05)) noise(0.12, 0.25, 1400, 1.2); break;
      case 'pass': if (ok('pass', 0.1)) tone('triangle', 700, 1100, 0.1, 0.15); break;
      case 'click': if (ok('click', 0.03)) tone('triangle', 900, 700, 0.05, 0.15); break;
      case 'coin': if (ok('coin', 0.05)) { tone('square', 988, 0, 0.08, 0.12); tone('square', 1319, 0, 0.18, 0.12, 0.08); } break;
      case 'start': if (ok('start', 0.2)) { tone('square', 392, 0, 0.1, 0.14); tone('square', 523, 0, 0.1, 0.14, 0.1); tone('square', 784, 0, 0.22, 0.14, 0.2); } break;
      case 'win':
        if (!ok('win', 0.5)) return;
        [523, 659, 784, 1047].forEach((f, i) => tone('square', f, 0, 0.16, 0.13, i * 0.11));
        tone('triangle', 1047, 0, 0.5, 0.12, 0.44);
        break;
      case 'lose':
        if (!ok('lose', 0.5)) return;
        [392, 330, 262].forEach((f, i) => tone('triangle', f, 0, 0.22, 0.16, i * 0.16));
        break;
      case 'unlock':
        if (!ok('unlock', 0.3)) return;
        [523, 784, 1047, 1568].forEach((f, i) => tone('triangle', f, 0, 0.2, 0.14, i * 0.07));
        break;
      case 'kamiCast':
        if (!ok('kamiCast', 0.4)) return;
        [523, 659, 784, 1047].forEach((f, i) => { tone('sine', f, 0, 0.9, 0.07, i * 0.03); tone('triangle', f * 2, 0, 0.5, 0.025, i * 0.03); });
        noise(0.6, 0.12, 6000, 0.8);
        break;
      case 'kamiGate':
        if (!ok('kamiGate', 0.4)) return;
        tone('square', 196, 98, 0.35, 0.12); tone('triangle', 784, 740, 0.6, 0.14);
        noise(0.12, 0.3, 2400, 3, 0.05); noise(0.12, 0.3, 2000, 3, 0.25);
        [392, 494, 587].forEach((f, i) => tone('sine', f, 0, 0.7, 0.06, 0.1 + i * 0.04));
        break;
      case 'kamiBeam':
        if (!ok('kamiBeam', 0.3)) return;
        noise(0.7, 0.45, 2600, 0.6); tone('sawtooth', 140, 55, 0.7, 0.16); tone('sine', 880, 1760, 0.5, 0.1);
        break;
      case 'kamiSlam':
        if (!ok('kamiSlam', 0.3)) return;
        noise(0.4, 0.6, 500, 0.8); tone('sine', 110, 40, 0.5, 0.4); tone('triangle', 1319, 988, 0.4, 0.1);
        break;
      case 'kamiDodge':
        if (!ok('kamiDodge', 0.08)) return;
        noise(0.16, 0.22, 1900, 2); tone('sine', 1200, 2600, 0.12, 0.05);
        break;
      case 'kamiFinisher':
        if (!ok('kamiFinisher', 1)) return;
        noise(0.3, 0.5, 4000, 0.5);
        tone('sine', 98, 82, 2.4, 0.35); tone('triangle', 196, 0, 1.6, 0.12, 0.25);
        [523, 659, 784, 988, 1175].forEach((f, i) => tone('sine', f, 0, 1.4, 0.05, 0.3 + i * 0.08));
        noise(0.5, 0.6, 700, 0.7, 2.05); tone('sine', 140, 35, 0.6, 0.4, 2.05);
        break;
      case 'overtime': if (ok('overtime', 0.5)) { tone('sawtooth', 220, 440, 0.3, 0.1); } break;
    }
  };
})();
