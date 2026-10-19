(function () {
  const $ = id => document.getElementById(id);
  const { World, CHAPTERS, Platform, Sound } = window;
  const { TS, W, H } = World;

  // ch — номер главы, met — вступление главы уже показано, done — пройденные квесты всех глав,
  // stars — лучший результат за каждый квест (3 — с первой попытки).
  let save = { v: 3, ch: 0, met: false, done: [], pos: null, stars: {} };
  let chapter, grid, npcs, theme;
  const hero = { x: 0, y: 0, px: 0, py: 0, dir: [0, 1], moving: false };
  let busy = true, held = null, sparks = [];

  const quest = id => chapter.quests.find(q => q.id === id);
  const isDone = id => save.done.includes(id);
  const currentQuest = () => chapter.quests.find(q => !isDone(q.id));
  function persist() { save.pos = { x: hero.x, y: hero.y }; Platform.save(save); }

  const MAX_STARS = CHAPTERS.reduce((n, c) => n + c.quests.length * 3, 0);
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
  const chapterStars = c => c.quests.reduce((n, q) => n + (save.stars[q.id] || 0), 0);
  const starRow = (n, max = 3) => "★".repeat(n) + `<i>${"★".repeat(max - n)}</i>`;
  function updateStars() { $("stars").textContent = `★ ${totalStars()}`; }

  // Холст целиком помещается в окно с сохранением пропорций 4:3 — без прокрутки страницы.
  function fit() {
    const r = $("stage").getBoundingClientRect();
    const k = Math.max(1, Math.min(r.width / 4, r.height / 3));
    cv.style.width = `${Math.floor(k * 4)}px`; cv.style.height = `${Math.floor(k * 3)}px`;
    document.querySelector(".goal").style.maxWidth = `${Math.max(300, Math.floor(k * 4))}px`;
  }
  // Следим за самой областью сцены: её размер меняется и при повороте, и когда догружаются шрифты.
  if (window.ResizeObserver) new ResizeObserver(fit).observe($("stage"));
  addEventListener("resize", fit);
  addEventListener("orientationchange", () => setTimeout(fit, 200));
  addEventListener("contextmenu", e => e.preventDefault());

  function loadChapter(ch) {
    chapter = CHAPTERS[ch];
    const built = World.build(ch), start = built.start;
    ({ grid, npcs, theme } = built);
    for (const q of chapter.quests) if (isDone(q.id)) applyEffect(q.effect, false);
    const p = save.pos;
    const ok = p && !World.SOLID.has(grid[p.y][p.x]) && !npcAt(p.x, p.y);
    hero.x = ok ? p.x : start.x; hero.y = ok ? p.y : start.y;
    hero.px = hero.x * TS; hero.py = hero.y * TS; hero.dir = [0, 1]; hero.moving = false;
    sparks = [];
    $("chap").textContent = `Глава ${chapter.n}`;
    Sound.play(ch);
    updateGoal();
  }
  function startChapter() {
    if (save.met) { busy = false; return; }
    say(chapter.story.intro, () => { save.met = true; persist(); updateGoal(); });
  }

  // ---------- Отрисовка ----------
  const cv = $("cv"), ctx = cv.getContext("2d");
  // Лёгкое затемнение по краям, чтобы мир смотрелся как сцена.
  const SW = W * TS, SH = H * TS;
  const vignette = ctx.createRadialGradient(SW / 2, SH / 2, SH * .4, SW / 2, SH / 2, SH * .95);
  vignette.addColorStop(0, "rgba(10,6,30,0)"); vignette.addColorStop(1, "rgba(10,6,30,.4)");
  function draw(t) {
    const cur = currentQuest();
    const actors = Object.values(npcs).filter(n => !n.gone).map(n => ({
      id: n.id, px: n.x * TS, py: n.y * TS, marker: save.met && cur && cur.id === n.id,
    }));
    actors.push({ id: "hero", px: hero.px, py: hero.py, flip: hero.dir[0] < 0, walk: hero.moving });
    World.drawScene(ctx, grid, actors, t, theme);
    // Искры — мягкие светящиеся точки.
    sparks = sparks.filter(s => (s.life -= 1 / 60) > 0);
    ctx.globalCompositeOperation = "lighter";
    for (const s of sparks) {
      s.x += s.vx; s.y += s.vy; s.vy += .04;
      ctx.globalAlpha = Math.min(1, s.life * 2);
      ctx.fillStyle = World.radial(ctx, s.x, s.y, 7, [[0, "#fff"], [.35, s.c], [1, s.c + "00"]]);
      ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, SW, SH);
  }
  function burst(x, y, c, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.3, v = 1 + Math.random() * 3;
      sparks.push({ x: x * TS + TS / 2, y: y * TS + TS / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: .6 + Math.random() * .5, c });
    }
  }

  // ---------- Изменения мира после квеста ----------
  function applyEffect(effect, animate) { [].concat(effect).forEach(e => applyOne(e, animate)); }
  function applyOne(e, animate) {
    const cells = e.set ? [...e.set] : [];
    if (e.replace) grid.forEach((r, y) => r.forEach((c, x) => { if (c === e.replace) cells.push([x, y]); }));
    cells.sort((a, b) => b[1] - a[1]);
    cells.forEach(([x, y], i) => {
      const put = () => { grid[y][x] = e.to; if (animate) burst(x, y, e.spark, 8); };
      animate ? setTimeout(put, i * 120) : put();
    });
    if (e.hideNpc) { npcs[e.hideNpc].gone = true; if (animate) burst(npcs[e.hideNpc].x, npcs[e.hideNpc].y, "#d63b5a", 30); }
  }

  // ---------- Движение ----------
  const npcAt = (x, y) => Object.values(npcs).find(n => !n.gone && n.x === x && n.y === y);
  function tryMove(dx, dy) {
    if (busy || hero.moving) return;
    hero.dir = [dx, dy];
    const nx = hero.x + dx, ny = hero.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const n = npcAt(nx, ny);
    if (n) return talkTo(n.id);
    if (World.SOLID.has(grid[ny][nx])) return bump(grid[ny][nx]);
    hero.x = nx; hero.y = ny; hero.moving = true;
  }
  let lastBump = 0;
  function bump(c) {
    const text = chapter.story.bump[c];
    if (!text || Date.now() - lastBump < 1500) return;
    lastBump = Date.now(); held = null; Sound.sfx("bump");
    say([{ who: "Кодомаг", text }]);
  }
  let lastSave = 0;
  function step() {
    if (hero.moving) {
      const tx = hero.x * TS, ty = hero.y * TS;
      hero.px += Math.sign(tx - hero.px) * Math.min(6, Math.abs(tx - hero.px));
      hero.py += Math.sign(ty - hero.py) * Math.min(6, Math.abs(ty - hero.py));
      if (hero.px === tx && hero.py === ty) {
        hero.moving = false;
        if (Date.now() - lastSave > 3000) { lastSave = Date.now(); persist(); }
      }
    }
    if (!hero.moving && held) tryMove(...held);
  }
  function loop(t) { step(); draw(t); requestAnimationFrame(loop); }

  // e.code не зависит от раскладки: WASD работает и на русской клавиатуре.
  const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
  addEventListener("keydown", e => { const k = KEYS[e.code]; if (k && !busy) { e.preventDefault(); held = k; } });
  addEventListener("keyup", e => { if (KEYS[e.code]) held = null; });
  for (const b of document.querySelectorAll("#pad button")) {
    const d = b.dataset.d.split(",").map(Number);
    b.addEventListener("pointerdown", e => { e.preventDefault(); held = d; });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => { held = null; });
  }

  // ---------- Диалоги ----------
  const sheet = $("sheet"), sheetBody = $("sheet-body");
  const FACES = { "Бабушка Ада": "A", "Рыбак Фёдор": "F", "Шахтёр Михей": "M", "Повелитель Багов": "B", "Кодомаг": "hero", "Дух Кода": "S",
    "Кикимора Кира": "K", "Лягушонок Квак": "Q", "Сова Соня": "W", "Звездочёт Вадим": "V",
    "Робот Болт": "R", "Почтальон Пётр": "P", "Стражница Вера": "C", "Механик Дина": "D", "Искатель багов": "B",
    "Изобретательница Эля": "E", "Ученик Илья": "I", "Копирус": "Y", "Маячница Лина": "L", "Осьминог Окто": "o",
    "Ученица Аня": "a", "Библиотекарь Гоша": "g" };
  function say(lines, done) {
    let i = 0; busy = true; held = null;
    const render = () => {
      const face = FACES[lines[i].who];
      sheetBody.innerHTML = `<div class="talk" tabindex="0">${face ? `<canvas class="face" width="128" height="128"></canvas>` : ""}
        <div class="talk-text"><b>${lines[i].who}</b><p>${lines[i].text}</p><i>Нажмите, чтобы продолжить ▸</i></div></div>`;
      const el = sheetBody.firstChild;
      if (face) World.drawPortrait(el.querySelector(".face").getContext("2d"), face, 128, performance.now());
      el.onclick = next;
      el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } };
      el.focus();
    };
    const next = () => { Sound.sfx("blip"); i++; if (i < lines.length) render(); else { sheet.hidden = true; busy = false; done?.(); } };
    sheet.hidden = false; render();
  }

  function updateGoal() {
    const q = currentQuest();
    $("goal").textContent = !save.met ? chapter.story.find : q ? q.goal : chapter.story.freed;
  }

  function talkTo(id) {
    if (id === chapter.guide) {
      const q = currentQuest();
      return say([{ who: chapter.guideName, text: q ? `Не забывай: ${q.goal.charAt(0).toLowerCase() + q.goal.slice(1)}` : chapter.story.guideDone }]);
    }
    const q = quest(id);
    if (isDone(id)) return say(q.after.slice(0, 1));
    if (currentQuest() !== q) return say([{ who: q.who, text: "Сначала помоги другим, а потом приходи ко мне." }]);
    say(q.intro, () => openBuilder(q));
  }

  // ---------- Сборка промта из карточек ----------
  function openBuilder(q) {
    busy = true; held = null;
    const picks = [];
    let hintSlot = -1, mistakes = 0;
    const shuffled = q.slots.map(s => [...s.opts].sort(() => Math.random() - .5));
    const render = fail => {
      const parts = q.slots.map((s, i) => picks[i] != null
        ? `<em>${shuffled[i][picks[i]].t}</em>`
        : `<span class="gap">[${s.label.toLowerCase().replace("?", "")}]</span>`);
      const ready = q.slots.every((_, i) => picks[i] != null);
      sheetBody.innerHTML = `<div class="builder">
        <h3>Соберите промт: ${q.title}</h3>
        ${q.slots.map((s, i) => `<div class="slot"><small>${s.label}</small><div class="cards">
          ${shuffled[i].map((o, j) => `<button class="card ${picks[i] === j ? "on" : ""} ${hintSlot === i && o.ok ? "hint" : ""}" data-s="${i}" data-o="${j}">${o.t}</button>`).join("")}
        </div></div>`).join("")}
        <div class="preview">Дух Кода, ${parts.join(", ")}.</div>
        ${fail ? `<div class="result">${fail}</div>` : ""}
        <div class="row">
          <button class="grow" id="b-cast" ${ready ? "" : "disabled"}>Попросить Духа</button>
          <button class="ad" id="b-hint">Подсказка за рекламу</button>
          <button class="ghost" id="b-later">Позже</button>
        </div></div>`;
      for (const b of sheetBody.querySelectorAll(".card")) b.onclick = () => { Sound.sfx("click"); picks[+b.dataset.s] = +b.dataset.o; render(); };
      $("b-cast").onclick = () => {
        const bad = picks.map((p, i) => shuffled[i][p]).find(o => !o.ok);
        if (bad) { mistakes++; Sound.sfx("fail"); return render(bad.fail); }
        sheet.hidden = true;
        complete(q, mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);
      };
      $("b-hint").onclick = () => rewarded(() => {
        hintSlot = q.slots.findIndex((_, i) => picks[i] == null || !shuffled[i][picks[i]].ok);
        render();
      });
      $("b-later").onclick = () => { sheet.hidden = true; busy = false; };
    };
    sheet.hidden = false; render();
  }

  function complete(q, stars) {
    save.done.push(q.id);
    save.stars[q.id] = Math.max(save.stars[q.id] || 0, stars);
    persist(); updateStars(); Platform.submitScore(totalStars());
    applyEffect(q.effect, true); Sound.sfx("magic");
    setTimeout(() => Sound.sfx(q.final ? "fanfare" : "win"), 700);
    setTimeout(() => modal(`<h2>Получилось!</h2><div class="big-stars">${starRow(stars)}</div>
      <p>${stars === 3 ? "С первой попытки!" : stars === 2 ? "Почти идеально: одна ошибка." : "Получилось, хоть и не сразу."}</p><div class="lesson">${q.lesson}</div><button id="m-ok">Дальше</button>`, () => {
      say(q.after, () => {
        updateGoal();
        if (q.final) ending(); else Platform.interstitial();
      });
    }), 900);
  }

  // ---------- Окна и реклама ----------
  const overlay = $("overlay");
  function modal(html, onOk) {
    busy = true; Platform.gameplay(false);
    $("modal").innerHTML = html; overlay.hidden = false;
    const ok = $("m-ok");
    if (ok) { ok.focus(); ok.onclick = () => { overlay.hidden = true; busy = false; Platform.gameplay(true); onOk?.(); }; }
  }
  // Вне Яндекса вместо ролика показываем обратный отсчёт.
  function mockAd(done) {
    let s = 3; Sound.pause("ad");
    $("modal").innerHTML = `<div class="adbox">Здесь будет реклама Яндекса<b id="ac">${s}</b></div>`;
    overlay.hidden = false;
    const iv = setInterval(() => {
      s--; const el = $("ac"); if (el) el.textContent = s;
      if (s <= 0) { clearInterval(iv); overlay.hidden = true; Sound.resume("ad"); done(); }
    }, 1000);
  }
  const rewarded = cb => Platform.rewarded(cb, mockAd);

  // В конце главы сразу сохраняем переход дальше, чтобы после перезагрузки игрок оказался там.
  // «Дальше» — первая непройденная глава: после повтора старой главы игрок возвращается к своему прогрессу.
  function ending() {
    const e = chapter.story.ending;
    const ni = CHAPTERS.findIndex(c => c.quests.some(q => !isDone(q.id))), next = CHAPTERS[ni];
    if (next) { save.ch = ni; save.met = next.quests.some(q => isDone(q.id)); save.pos = null; Platform.save(save); }
    modal(`<h2>${e.title}</h2><div class="lesson">${e.lesson}</div><p>${e.next}</p>
      <button id="m-ok">${next ? `Глава ${next.n}: ${next.name}` : "Гулять дальше"}</button>`, () => {
      if (!next) return;
      loadChapter(save.ch); busy = true; startChapter();
    });
  }

  // ---------- Главное меню: главы, шпаргалка, рекорды ----------
  const unlocked = i => i === 0 || CHAPTERS[i - 1].quests.every(q => isDone(q.id));
  function backToTitle() { busy = true; Platform.gameplay(false); showTitle(); }

  function chaptersMenu() {
    $("title").hidden = true;
    modal(`<h2>Главы</h2><div class="chapters">${CHAPTERS.map((c, i) => `
      <button data-i="${i}" class="${i === save.ch ? "cur" : ""}" ${unlocked(i) ? "" : "disabled"}>
        ${c.n}. ${unlocked(i) ? c.name : "Закрыто"}<span>★ ${chapterStars(c)}/${c.quests.length * 3}</span></button>`).join("")}</div>
      <p>Пройденную главу можно переиграть и собрать все звёзды.</p><button id="m-ok" class="ghost">Назад</button>`, backToTitle);
    for (const b of document.querySelectorAll(".chapters button")) b.onclick = () => {
      const i = +b.dataset.i, c = CHAPTERS[i];
      overlay.hidden = true;
      if (i !== save.ch) {
        // Повтор главы: её квесты снова открыты, звёзды остаются лучшими.
        if (c.quests.every(q => isDone(q.id))) save.done = save.done.filter(id => !c.quests.some(q => q.id === id));
        save.ch = i; save.met = c.quests.some(q => isDone(q.id)); save.pos = null; Platform.save(save);
        loadChapter(i);
      }
      Platform.gameplay(true); startChapter();
    };
  }

  function notesMenu() {
    const items = CHAPTERS.flatMap(c => c.quests.filter(q => isDone(q.id) || save.stars[q.id]).map(q => `<li><b>${q.title}.</b> ${q.lesson}</li>`));
    $("title").hidden = true;
    modal(`<h2>Шпаргалка вайбкодера</h2><ol class="notes">${items.join("")}</ol><button id="m-ok">Назад</button>`, backToTitle);
  }

  async function topMenu() {
    $("title").hidden = true;
    modal(`<h2>Рекорды</h2><p>Загружаем таблицу…</p>`);
    const top = await Platform.topScores();
    const login = !Platform.isAuthorized()
      ? `<p>Войдите через Яндекс, чтобы ваши звёзды попали в таблицу, а прогресс сохранялся на всех устройствах.</p><button id="m-login">Войти через Яндекс</button>` : "";
    const list = top && top.rows.length
      ? `<ol class="top">${top.rows.map(r => `<li class="${r.me ? "me" : ""}"><b>${r.rank}</b><span>${r.name}</span>★ ${r.score}</li>`).join("")}</ol>`
      : `<p>${top ? "В таблице пока никого нет. Будьте первым!" : "Таблица рекордов работает, когда игра открыта в Яндекс Играх."}</p>`;
    modal(`<h2>Рекорды</h2><p>Ваши звёзды: ★ ${totalStars()} из ${MAX_STARS}</p>${list}${top ? login : ""}<button id="m-ok" class="ghost">Назад</button>`, backToTitle);
    const lb = $("m-login");
    if (lb) lb.onclick = async () => { if (await Platform.login()) { await Platform.submitScore(totalStars()); topMenu(); } };
  }

  function showTitle() {
    const play = $("t-play"), any = save.done.length > 0 || Object.keys(save.stars).length > 0;
    play.textContent = save.met || save.ch > 0 ? "Продолжить" : "Играть";
    $("t-stars").hidden = !any;
    $("t-stars").textContent = `★ ${totalStars()} из ${MAX_STARS}`;
    $("t-chapters").hidden = !any;
    $("t-notes").hidden = !any;
    $("t-top").hidden = !Platform.hasSdk() && !any;
    $("title").hidden = false; play.focus();
  }

  // ---------- Запуск ----------
  (async () => {
    await Platform.init();
    const data = await Platform.load();
    if (data && data.v === 3) save = { ...save, ...data, stars: data.stars || {} };
    else if (data && data.v === 2) save = { ...save, done: data.done || [], pos: data.pos, met: !!data.metAda };
    if (!CHAPTERS[save.ch]) save.ch = 0;
    // Глава пройдена, а переход не сохранился (старые сохранения) — сразу в следующую.
    while (CHAPTERS[save.ch + 1] && CHAPTERS[save.ch].quests.every(q => save.done.includes(q.id))) { save.ch++; save.met = false; save.pos = null; }
    loadChapter(save.ch);
    fit(); updateStars();
    Platform.ready();
    const snd = $("snd"), showSnd = () => { snd.classList.toggle("off", !Sound.on); snd.setAttribute("aria-label", Sound.on ? "Выключить звук" : "Включить звук"); };
    snd.onclick = () => { Sound.unlock(); Sound.toggle(); showSnd(); };
    showSnd();
    requestAnimationFrame(loop);
    const play = $("t-play");
    $("t-chapters").onclick = chaptersMenu;
    $("t-notes").onclick = notesMenu;
    $("t-top").onclick = topMenu;
    showTitle();
    play.onclick = () => {
      Sound.unlock();
      $("title").hidden = true;
      Platform.gameplay(true);
      startChapter();
    };
  })();
})();
