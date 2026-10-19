// Музыка и звуки, синтезированные прямо в браузере (Web Audio): без файлов и без лицензий.
// У каждой главы своя мелодия. Звук стартует только после первого нажатия игрока
// и замирает, пока вкладка скрыта или идёт реклама (требование Яндекс Игр).
window.Sound = (function () {
  const KEY = "kodolesie-sound";
  let on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch {}
  let ac = null, master, music, sfxOut, wet;
  let song = 0, step = 0, nextT = 0, timer = null;
  const paused = new Set();
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // Песни: аккорды по такту, арпеджио восьмыми (номер ноты аккорда или null — пауза)
  // и мелодия четвертями на 8 тактов. Мелодия звучит через раз, чтобы музыка не надоедала.
  const SONGS = [
    { // Кодолесье: светлый до мажор.
      bpm: 92, pluck: 2600,
      chords: [
        { root: 48, tones: [60, 64, 67, 71] },
        { root: 43, tones: [59, 62, 67, 71] },
        { root: 45, tones: [60, 64, 67, 69] },
        { root: 41, tones: [60, 65, 69, 72] },
      ],
      arp: [0, 1, 2, 3, 2, 1, 2, 1],
      melody: [
        [76, null, 74, 72], [74, null, 71, null], [72, 74, 76, null], [77, 76, 72, null],
        [76, null, 79, 76], [74, null, 71, 74], [72, null, 69, 72], [72, null, null, null],
      ],
    },
    { // Болото тормозов: медленный, таинственный ре минор.
      bpm: 72, pluck: 1500,
      chords: [
        { root: 38, tones: [62, 65, 69, 72] },
        { root: 46, tones: [62, 65, 69, 70] },
        { root: 41, tones: [60, 65, 69, 72] },
        { root: 36, tones: [60, 64, 67, 72] },
      ],
      arp: [0, null, 2, 1, null, 3, 2, null],
      melody: [
        [74, null, 72, 69], [70, null, 69, null], [72, null, 69, 65], [67, null, null, null],
        [69, 72, 74, null], [77, null, 74, null], [72, null, 69, null], [72, null, null, null],
      ],
    },
    { // Башня галлюцинаций: мечтательный ми минор со звёздным арпеджио.
      bpm: 80, pluck: 3200,
      chords: [
        { root: 40, tones: [64, 67, 71, 74] },
        { root: 36, tones: [60, 64, 67, 71] },
        { root: 43, tones: [62, 67, 71, 74] },
        { root: 38, tones: [62, 66, 69, 74] },
      ],
      arp: [0, 2, 1, 3, 2, 0, 3, 1],
      melody: [
        [79, null, 78, 76], [76, null, 74, null], [74, 76, 79, null], [78, null, null, null],
        [83, null, 81, 79], [79, null, 76, null], [74, null, 76, 78], [76, null, null, null],
      ],
    },
    { // Кодоград: бодрый фа мажор, город мастеров.
      bpm: 104, pluck: 2800,
      chords: [
        { root: 41, tones: [65, 69, 72, 76] },
        { root: 38, tones: [62, 65, 69, 72] },
        { root: 46, tones: [62, 65, 70, 74] },
        { root: 36, tones: [64, 67, 72, 76] },
      ],
      arp: [0, 1, 2, 1, 3, 1, 2, 1],
      melody: [
        [81, null, 79, 77], [77, null, 74, null], [74, 77, 79, null], [79, null, 76, null],
        [81, 79, 81, 84], [82, null, 81, null], [79, 77, 76, 79], [77, null, null, null],
      ],
    },
    { // Цитадель: героический ля минор для финала.
      bpm: 96, pluck: 2200,
      chords: [
        { root: 45, tones: [64, 69, 72, 76] },
        { root: 41, tones: [65, 69, 72, 77] },
        { root: 48, tones: [64, 67, 72, 76] },
        { root: 43, tones: [62, 67, 71, 74] },
      ],
      arp: [0, 1, 2, 3, 0, 1, 2, 3],
      melody: [
        [76, null, 72, 76], [77, null, 76, 72], [79, null, 76, 72], [74, null, null, null],
        [76, 79, 81, null], [81, null, 79, 77], [76, null, 74, 72], [71, null, null, null],
      ],
    },
    { // Снежная мастерская: звонкий ре мажор, как колокольчики.
      bpm: 84, pluck: 3800,
      chords: [
        { root: 50, tones: [62, 66, 69, 73] },
        { root: 47, tones: [59, 62, 66, 69] },
        { root: 43, tones: [59, 62, 67, 71] },
        { root: 45, tones: [61, 64, 69, 73] },
      ],
      arp: [0, 2, 1, 3, 2, 1, 3, 2],
      melody: [
        [78, null, 76, 74], [73, null, 71, null], [74, 76, 78, null], [76, null, null, null],
        [81, null, 78, 76], [74, null, 73, 71], [71, null, 74, 71], [73, null, null, null],
      ],
    },
    { // Остров маяков: лёгкий соль мажор, как морской ветер.
      bpm: 100, pluck: 2600,
      chords: [
        { root: 43, tones: [62, 67, 71, 74] },
        { root: 40, tones: [64, 67, 71, 76] },
        { root: 48, tones: [60, 64, 67, 72] },
        { root: 50, tones: [62, 66, 69, 74] },
      ],
      arp: [0, null, 1, 2, null, 1, 3, 2],
      melody: [
        [79, null, 74, 76], [79, null, 83, null], [84, null, 79, 76], [78, null, 74, null],
        [79, 81, 83, null], [83, null, 79, 76], [76, null, 72, 76], [74, null, null, null],
      ],
    },
    { // Академия: торжественный ми-бемоль мажор для финала второй части.
      bpm: 92, pluck: 2400,
      chords: [
        { root: 39, tones: [63, 67, 70, 74] },
        { root: 36, tones: [60, 63, 67, 70] },
        { root: 44, tones: [60, 63, 68, 72] },
        { root: 46, tones: [62, 65, 70, 74] },
      ],
      arp: [0, 1, 2, 3, 2, 1, 2, 3],
      melody: [
        [79, null, 75, 79], [77, 75, 72, null], [75, null, 72, 68], [70, null, 74, null],
        [75, 77, 79, null], [82, null, 79, 75], [77, null, 75, 72], [74, null, null, null],
      ],
    },
  ];

  function impulse(sec) {
    const len = ac.sampleRate * sec, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  function setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(comp);
    music = ac.createGain(); music.gain.value = .5; music.connect(master);
    sfxOut = ac.createGain(); sfxOut.gain.value = .55; sfxOut.connect(master);
    // Эхо и реверберация делают звук мягким и «воздушным».
    wet = ac.createGain();
    const delay = ac.createDelay(1), fb = ac.createGain(), tone = ac.createBiquadFilter();
    delay.delayTime.value = .36; fb.gain.value = .3; tone.type = "lowpass"; tone.frequency.value = 2000;
    wet.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(music);
    const rev = ac.createConvolver(), revOut = ac.createGain();
    rev.buffer = impulse(2.4); revOut.gain.value = .5;
    wet.connect(rev); rev.connect(revOut); revOut.connect(music);
  }

  // Одна нота. pad — плавный аккорд-подложка, иначе щипок с затуханием.
  function note(out, m, t, dur, o = {}) {
    const osc = ac.createOscillator(), g = ac.createGain(), vol = o.vol || .2;
    osc.type = o.type || "sine"; osc.frequency.value = hz(m);
    if (o.detune) osc.detune.value = o.detune;
    g.gain.setValueAtTime(0, t);
    if (o.pad) {
      g.gain.linearRampToValueAtTime(vol, t + dur * .3);
      g.gain.linearRampToValueAtTime(vol * .6, t + dur * .75);
      g.gain.linearRampToValueAtTime(0, t + dur);
    } else {
      g.gain.linearRampToValueAtTime(vol, t + (o.a || .006));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    }
    let src = osc;
    if (o.cut) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.cut; osc.connect(f); src = f; }
    src.connect(g); g.connect(out);
    if (o.send) { const s = ac.createGain(); s.gain.value = o.send; g.connect(s); s.connect(wet); }
    osc.start(t); osc.stop(t + dur + .05);
  }

  function playStep(S, i, t, eighth) {
    const bar = Math.floor(i / 8), pos = i % 8;
    const ch = S.chords[bar % S.chords.length];
    if (pos === 0) for (const m of ch.tones.slice(0, 3)) {
      for (const d of [-6, 6]) note(music, m - 12, t, eighth * 8 + .6, { pad: true, type: "triangle", vol: .05, cut: 900, detune: d, send: .5 });
    }
    if (pos === 0 || pos === 4) note(music, ch.root, t, eighth * 3.5, { vol: .22, cut: 400, a: .02 });
    const a = S.arp[pos];
    if (a != null) note(music, ch.tones[a] + 12, t, .5, { vol: .07, type: "triangle", cut: S.pluck, send: .4 });
    const melodyOn = Math.floor(bar / S.melody.length) % 2 === 0;
    if (melodyOn && pos % 2 === 0) {
      const m = S.melody[bar % S.melody.length][pos / 2];
      if (m != null) {
        note(music, m, t, 1.1, { vol: .13, send: .5 });
        note(music, m + 12, t, .4, { vol: .025, type: "triangle", send: .3 });
      }
    }
  }

  function tick() {
    if (!ac || ac.state !== "running") return;
    const S = SONGS[song], eighth = 60 / S.bpm / 2;
    if (nextT < ac.currentTime) nextT = ac.currentTime + .05;
    while (nextT < ac.currentTime + .25) { playStep(S, step, nextT, eighth); step++; nextT += eighth; }
  }

  // Вызывать из обработчика нажатия: браузеры разрешают звук только после действия игрока.
  function unlock() {
    if (!ac) setup();
    if (!ac) return;
    if (!paused.size) ac.resume();
    if (!timer) timer = setInterval(tick, 50);
  }

  function play(n) {
    if (!SONGS[n] || (n === song && step > 0)) return;
    song = n; step = 0; nextT = 0;
  }

  function pause(why) { paused.add(why); ac?.suspend(); }
  function resume(why) { paused.delete(why); if (ac && !paused.size) ac.resume(); }
  // Требование Яндекса: звук замолкает, когда игра теряет фокус или вкладка скрыта.
  document.addEventListener("visibilitychange", () => document.hidden ? pause("hidden") : resume("hidden"));
  addEventListener("blur", () => pause("blur"));
  addEventListener("focus", () => resume("blur"));

  function toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
    if (ac) master.gain.setTargetAtTime(on ? 1 : 0, ac.currentTime, .05);
    return on;
  }

  const SFX = {
    click: t => { note(sfxOut, 84, t, .14, { vol: .22 }); note(sfxOut, 96, t, .08, { vol: .05 }); },
    blip: t => note(sfxOut, 79, t, .09, { vol: .1, type: "triangle", cut: 3000 }),
    bump: t => note(sfxOut, 40, t, .22, { vol: .35, cut: 300 }),
    fail: t => { note(sfxOut, 64, t, .3, { vol: .18, type: "triangle", cut: 1200 }); note(sfxOut, 59, t + .16, .45, { vol: .18, type: "triangle", cut: 1000 }); },
    win: t => [72, 76, 79, 84, 88].forEach((m, i) => note(sfxOut, m, t + i * .07, .6, { vol: .18, send: .5 })),
    magic: t => [84, 88, 91, 93, 96, 100].forEach((m, i) => note(sfxOut, m, t + i * .09 + Math.random() * .03, .5, { vol: .07, send: .8 })),
    fanfare: t => {
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => note(sfxOut, m, t + i * .1, 1.4, { vol: .14, send: .6 }));
      [48, 55, 64].forEach(m => note(sfxOut, m, t + .7, 2.2, { pad: true, type: "triangle", vol: .08, cut: 1200, send: .5 }));
    },
  };
  function sfx(name) { if (ac && ac.state === "running" && SFX[name]) SFX[name](ac.currentTime + .01); }

  return { unlock, play, pause, resume, toggle, sfx, get on() { return on; } };
})();
