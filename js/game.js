(function () {
  const $ = id => document.getElementById(id);
  const { World, Platform, Sound, I18N } = window;
  const { TS, W, H } = World;
  const t = I18N.t, name = I18N.name;

  // ch — номер главы, met — вступление главы уже показано, done — пройденные квесты всех глав,
  // stars — лучший результат за каждый квест (3 — с первой попытки), daily — серия «Промта дня»,
  // ach — открытые достижения, hintUsed — в каких главах брали подсказку,
  // look и owned — наряд и вещи, открытые за рекламу, hunt — рекорд «Найди ошибку», island — свой остров, boss — побеждённые боссы.
  let save = { v: 3, ch: 0, met: false, done: [], pos: null, stars: {}, daily: { last: -1, streak: 0, best: 0, total: 0 }, ach: [], hintUsed: {},
    look: { hat: "cap", color: "violet", bot: "mint" }, owned: [], hunt: { best: 0, games: 0 }, island: {}, boss: {} };
  // Тексты зависят от языка: CHAPTERS и остальное пересобираются при его смене.
  let CHAPTERS, DAILY, PARENTS;
  let chapter, grid, npcs, theme;
  const hero = { x: 0, y: 0, px: 0, py: 0, dir: [0, 1], moving: false };
  let busy = true, held = null, sparks = [];

  const quest = id => chapter.quests.find(q => q.id === id);
  const isDone = id => save.done.includes(id);
  // Квест считается пройденным навсегда, если за него есть звёзды: повтор главы этого не отменяет.
  const everDone = q => isDone(q.id) || save.stars[q.id] > 0;
  const currentQuest = () => chapter.quests.find(q => !isDone(q.id));
  function persist() { save.pos = { x: hero.x, y: hero.y }; Platform.save(save); }

  const maxStars = () => CHAPTERS.reduce((n, c) => n + c.quests.length * 3, 0);
  const totalStars = () => CHAPTERS.reduce((n, c) => n + chapterStars(c), 0);
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
    const ok = p && grid[p.y] && grid[p.y][p.x] && !World.SOLID.has(grid[p.y][p.x]) && !npcAt(p.x, p.y);
    hero.x = ok ? p.x : start.x; hero.y = ok ? p.y : start.y;
    hero.px = hero.x * TS; hero.py = hero.y * TS; hero.dir = [0, 1]; hero.moving = false;
    sparks = [];
    $("chap").textContent = t("chapter", { n: chapter.n });
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
  function draw(time) {
    if (islandMode) {
      World.drawScene(ctx, grid, [{ id: "S", px: cursor.x * TS, py: cursor.y * TS - 6 }], time, theme);
      ctx.strokeStyle = `rgba(255,255,255,${.6 + .3 * Math.sin(time / 200)})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.strokeRect(cursor.x * TS + 3, cursor.y * TS + 3, TS - 6, TS - 6); ctx.setLineDash([]);
      return drawSparks();
    }
    const cur = currentQuest();
    const actors = Object.values(npcs).filter(n => !n.gone).map(n => ({
      id: n.id, px: n.x * TS, py: n.y * TS, marker: save.met && cur && cur.id === n.id,
    }));
    actors.push({ id: "hero", px: hero.px, py: hero.py, flip: hero.dir[0] < 0, walk: hero.moving });
    World.drawScene(ctx, grid, actors, time, theme);
    drawSparks();
  }
  // Искры — мягкие светящиеся точки.
  function drawSparks() {
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
    if (islandMode) return busy || moveCursor(dx, dy);
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
    say([{ who: "Кодер", text }]);
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
  function loop(time) { step(); draw(time); requestAnimationFrame(loop); }

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
  // Портреты ищутся по русскому имени из quests.js, на экран выводится перевод имени.
  const sheet = $("sheet"), sheetBody = $("sheet-body");
  const FACES = { "Бабушка Ада": "A", "Рыбак Фёдор": "F", "Шахтёр Михей": "M", "Повелитель Багов": "B", "Кодер": "hero", "Кодик": "S",
    "Садовница Кира": "K", "Лягушонок Квак": "Q", "Сова Соня": "W", "Астроном Вадим": "V",
    "Робот Болт": "R", "Почтальон Пётр": "P", "Стражница Вера": "C", "Механик Дина": "D", "Искатель багов": "B",
    "Изобретательница Эля": "E", "Ученик Илья": "I", "Копирус": "Y", "Маячница Лина": "L", "Осьминог Окто": "o",
    "Ученица Аня": "a", "Библиотекарь Гоша": "g", "Понимус": "Y", "Художница Мия": "h", "Фотограф Лев": "j", "Фейкус": "v",
    "Связистка Нина": "q", "Мальчик Сеня": "s", "Фальшивый Кодик": "w", "Учёный Арсений": "t", "Журналистка Зара": "u", "Проверус": "v" };
  function say(lines, done) {
    let i = 0; busy = true; held = null;
    const render = () => {
      const face = FACES[lines[i].who];
      sheetBody.innerHTML = `<div class="talk" tabindex="0">${face ? `<canvas class="face" width="128" height="128"></canvas>` : ""}
        <div class="talk-text"><b>${name(lines[i].who)}</b><p>${lines[i].text}</p><i>${t("tapNext")}</i></div></div>`;
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
      return say([{ who: chapter.guideName, text: q ? t("remind", { goal: q.goal.charAt(0).toLowerCase() + q.goal.slice(1) }) : chapter.story.guideDone }]);
    }
    const q = quest(id);
    if (isDone(id)) return say(q.after.slice(0, 1));
    if (currentQuest() !== q) return say([{ who: q.who, text: t("helpOthers") }]);
    say(q.intro, () => openBuilder(q, {
      win: stars => complete(q, stars),
      later: () => { busy = false; },
      hinted: () => { save.hintUsed[save.ch] = true; },
    }));
  }

  // ---------- Сборка промта из карточек ----------
  // cb.win(звёзды) — промт собран верно, cb.later — игрок отложил, cb.hinted — взята подсказка.
  function openBuilder(q, cb, heading = t("build", { title: q.title })) {
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
        <h3>${heading}</h3>
        ${q.slots.map((s, i) => `<div class="slot"><small>${s.label}</small><div class="cards">
          ${shuffled[i].map((o, j) => `<button class="card ${picks[i] === j ? "on" : ""} ${hintSlot === i && o.ok ? "hint" : ""}" data-s="${i}" data-o="${j}">${o.t}</button>`).join("")}
        </div></div>`).join("")}
        <div class="preview">${t("addressee")}, ${parts.join(", ")}.</div>
        ${fail ? `<div class="result">${fail}</div>` : ""}
        <div class="row">
          <button class="grow" id="b-cast" ${ready ? "" : "disabled"}>${t("ask")}</button>
          <button class="ad" id="b-hint">${t("hint")}</button>
          <button class="ghost" id="b-later">${t("later")}</button>
        </div></div>`;
      for (const b of sheetBody.querySelectorAll(".card")) b.onclick = () => { Sound.sfx("click"); picks[+b.dataset.s] = +b.dataset.o; render(); };
      $("b-cast").onclick = () => {
        const bad = picks.map((p, i) => shuffled[i][p]).find(o => !o.ok);
        if (bad) { mistakes++; Sound.sfx("fail"); return render(bad.fail); }
        sheet.hidden = true;
        cb.win(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);
      };
      $("b-hint").onclick = () => rewarded(() => {
        cb.hinted?.();
        hintSlot = q.slots.findIndex((_, i) => picks[i] == null || !shuffled[i][picks[i]].ok);
        render();
      });
      $("b-later").onclick = () => { sheet.hidden = true; cb.later(); };
    };
    sheet.hidden = false; render();
  }

  const starsText = stars => t(stars === 3 ? "stars3" : stars === 2 ? "stars2" : "stars1");
  function complete(q, stars) {
    save.done.push(q.id);
    save.stars[q.id] = Math.max(save.stars[q.id] || 0, stars);
    if (q.final && !save.hintUsed[save.ch]) unlock("nohint");
    persist(); updateStars(); Platform.submitScore(totalStars());
    applyEffect(q.effect, true); Sound.sfx("magic");
    setTimeout(() => Sound.sfx(q.final ? "fanfare" : "win"), 700);
    setTimeout(() => modal(`<h2>${t("success")}</h2><div class="big-stars">${starRow(stars)}</div>
      <p>${starsText(stars)}</p><div class="lesson">${q.lesson}</div><button id="m-ok">${t("next")}</button>`, () => {
      checkAchievements();
      say(q.after, () => {
        updateGoal();
        if (q.final) ending(); else Platform.interstitial();
      });
    }), 900);
  }

  // ---------- Достижения ----------
  const ACH = ["first", "perfect", "nohint", "part1", "part2", "part3", "allstars", "daily1", "streak3", "streak7",
    "style", "hunt10", "builder", "boss1", "bossAll"];
  const toasts = [];
  function unlock(id) {
    if (save.ach.includes(id)) return;
    save.ach.push(id); Platform.save(save);
    toasts.push(id); if (toasts.length === 1) showToast();
  }
  function showToast() {
    const id = toasts[0], el = $("toast");
    el.innerHTML = `<small>${t("achNew")}</small><b>🏅 ${t("ach." + id)}</b>`;
    el.hidden = false; Sound.sfx("win");
    setTimeout(() => { el.hidden = true; toasts.shift(); if (toasts.length) setTimeout(showToast, 300); }, 2600);
  }
  function checkAchievements() {
    if (CHAPTERS.some(c => c.quests.some(everDone))) unlock("first");
    if (CHAPTERS.some(c => chapterStars(c) === c.quests.length * 3)) unlock("perfect");
    if (CHAPTERS.slice(0, 5).every(chDone)) unlock("part1");
    if (CHAPTERS.slice(0, 8).every(chDone)) unlock("part2");
    if (CHAPTERS.every(chDone)) unlock("part3");
    if (totalStars() === maxStars()) unlock("allstars");
    if (save.daily.total > 0) unlock("daily1");
    if (save.daily.best >= 3) unlock("streak3");
    if (save.daily.best >= 7) unlock("streak7");
  }
  function achievementsMenu() {
    $("title").hidden = true;
    modal(`<h2>${t("achievements")}</h2><p>${t("achCount", { n: save.ach.filter(a => ACH.includes(a)).length, max: ACH.length })}</p>
      <ul class="ach">${ACH.map(id => `<li class="${save.ach.includes(id) ? "on" : ""}"><span>${save.ach.includes(id) ? "🏅" : "🔒"}</span>
        <div><b>${t("ach." + id)}</b><small>${t("ach." + id + ".d")}</small></div></li>`).join("")}</ul>
      <button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
  }

  // ---------- Промт дня ----------
  // День считается по местному календарю игрока; задание выбирается по номеру дня, у всех одно и то же.
  const today = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const dailyQuest = () => DAILY[today() % DAILY.length];
  const dailyDoneToday = () => save.daily.last === today();
  function dailyMenu() {
    $("title").hidden = true;
    if (!dailyDoneToday()) return playDaily(true);
    modal(`<h2>${t("daily")}</h2><p>${t("dailyAgain")}</p><p class="streak">🔥 ${t("streak", { n: save.daily.streak })}</p>
      <button id="d-again">${t("dailyReplay")}</button><button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
    $("d-again").onclick = () => { overlay.hidden = true; playDaily(false); };
  }
  function playDaily(counts) {
    const q = dailyQuest();
    Platform.gameplay(true);
    say([{ who: "Кодик", text: q.intro }], () => openBuilder(q, {
      win: stars => {
        if (counts && !dailyDoneToday()) {
          const d = save.daily;
          d.streak = d.last === today() - 1 ? d.streak + 1 : 1;
          d.best = Math.max(d.best, d.streak); d.total++; d.last = today();
          Platform.save(save);
        }
        Sound.sfx("win");
        modal(`<h2>${t("dailyWin")}</h2><div class="big-stars">${starRow(stars)}</div><p>${starsText(stars)}</p>
          <p class="streak">🔥 ${t("streak", { n: save.daily.streak })} · ${t("streakBest", { n: save.daily.best })}</p>
          <div class="lesson">${q.lesson}</div><button id="m-ok">${t("next")}</button>`, () => { checkAchievements(); backToTitle(); Platform.interstitial(); });
      },
      later: backToTitle,
    }, t("dailyTitle", { title: q.title })));
  }

  // ---------- Окна и реклама ----------
  const overlay = $("overlay");
  function modal(html, onOk, cls = "") {
    busy = true; Platform.gameplay(false); stopTimer();
    $("modal").className = `modal ${cls}`;
    $("modal").innerHTML = html; overlay.hidden = false;
    const ok = $("m-ok");
    $("modal").scrollTop = 0;
    if (ok) { ok.focus({ preventScroll: true }); ok.onclick = () => { overlay.hidden = true; busy = false; Platform.gameplay(true); onOk?.(); }; }
  }
  // Вне Яндекса вместо ролика показываем обратный отсчёт.
  function mockAd(done) {
    let s = 3; Sound.pause("ad");
    const back = $("modal").innerHTML, wasOpen = !overlay.hidden;
    $("modal").innerHTML = `<div class="adbox">${t("adStub")}<b id="ac">${s}</b></div>`;
    overlay.hidden = false;
    const iv = setInterval(() => {
      s--; const el = $("ac"); if (el) el.textContent = s;
      if (s <= 0) {
        clearInterval(iv); Sound.resume("ad");
        if (wasOpen) $("modal").innerHTML = back; else overlay.hidden = true;
        done();
      }
    }, 1000);
  }
  const rewarded = cb => Platform.rewarded(cb, mockAd);

  // В конце главы сразу сохраняем переход дальше, чтобы после перезагрузки игрок оказался там.
  // «Дальше» — первая глава, которую игрок ещё ни разу не проходил: после повтора старой главы он возвращается к своему прогрессу.
  function ending() {
    const e = chapter.story.ending;
    const ni = CHAPTERS.findIndex(c => !c.quests.every(everDone)), next = CHAPTERS[ni];
    if (next) { save.ch = ni; save.met = next.quests.some(q => isDone(q.id)); save.pos = null; Platform.save(save); }
    checkAchievements();
    modal(`<h2>${e.title}</h2><div class="lesson">${e.lesson}</div><p>${e.next}</p>
      <button id="m-ok">${next ? `${t("chapter", { n: next.n })}: ${next.name}` : t("walkOn")}</button>`, () => {
      if (!next) return;
      loadChapter(save.ch); busy = true; startChapter();
    });
  }

  // ---------- Гардероб ----------
  // Вещи открываются звёздами или просмотром рекламы ("ad"). Рисунок берёт наряд из World.outfit.
  const WARDROBE = {
    hat: [["cap", 0], ["beanie", 6], ["headphones", 15], ["cat", "ad"], ["cowboy", 30], ["crown", 60]],
    color: [["violet", 0], ["blue", 3], ["green", 9], ["orange", "ad"], ["red", 20], ["pink", 24], ["black", 45]],
    bot: [["mint", 0], ["sky", 12], ["rose", "ad"], ["lilac", 36], ["gold", 50]],
  };
  const owns = (kind, id, need) => need === 0 || (need === "ad" ? save.owned.includes(`${kind}:${id}`) : totalStars() >= need);
  const applyLook = () => Object.assign(World.outfit, save.look);
  function wardrobeMenu(tab = "hat") {
    $("title").hidden = true;
    const swatch = (kind, id) => kind === "color" ? `<i class="sw" style="background:${World.COLORS[id][0]}"></i>`
      : kind === "bot" ? `<i class="sw" style="background:${World.BOTS[id][2]}"></i>` : "";
    modal(`<h2>${t("wardrobe")}</h2>
      <div class="wr-preview"><canvas id="wr-hero" width="120" height="120"></canvas><canvas id="wr-bot" width="120" height="120"></canvas></div>
      <div class="tabs">${Object.keys(WARDROBE).map(k => `<button data-tab="${k}" class="${k === tab ? "on" : ""}">${t("wr." + k)}</button>`).join("")}</div>
      <div class="items">${WARDROBE[tab].map(([id, need]) => {
        const have = owns(tab, id, need), on = save.look[tab] === id;
        return `<button class="item ${on ? "on" : ""} ${have ? "" : need === "ad" ? "ad-item" : "locked"}" data-id="${id}" data-need="${need}">
          ${swatch(tab, id)}<span>${t(`wr.${tab}.${id}`)}</span>${have ? "" : `<small>${need === "ad" ? t("wrAd") : `🔒 ★ ${need}`}</small>`}</button>`;
      }).join("")}</div>
      <p class="wr-hint">${t("wrHint", { n: totalStars() })}</p>
      <button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
    World.drawPortrait($("wr-hero").getContext("2d"), "hero", 120, performance.now());
    World.drawPortrait($("wr-bot").getContext("2d"), "S", 120, performance.now());
    for (const b of document.querySelectorAll(".tabs button")) b.onclick = () => { Sound.sfx("click"); wardrobeMenu(b.dataset.tab); };
    for (const b of document.querySelectorAll(".items .item")) b.onclick = () => {
      const id = b.dataset.id, need = b.dataset.need === "ad" ? "ad" : +b.dataset.need;
      const wear = () => { save.look[tab] = id; applyLook(); unlock("style"); Platform.save(save); Sound.sfx("magic"); wardrobeMenu(tab); };
      if (owns(tab, id, need)) return wear();
      if (need === "ad") return rewarded(() => { save.owned.push(`${tab}:${id}`); wear(); });
      Sound.sfx("bump");
    };
  }

  // ---------- Мини-игры: «Найди ошибку» и битвы с боссами ----------
  // Раунд — промт из пройденного задания, где одна карточка заменена неверной. Игрок нажимает на неверную.
  function makeRound(pool) {
    const q = pool[Math.floor(Math.random() * pool.length)], k = Math.floor(Math.random() * q.slots.length);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    return { q, k, parts: q.slots.map((s, i) => pick(s.opts.filter(o => i === k ? !o.ok : o.ok))) };
  }
  const roundHtml = (r, shown) => `<div class="hunt-q"><small>${r.q.title}</small>
    <p>${t("addressee")}, ${r.parts.map((o, i) => `<button class="frag ${shown != null && i === r.k ? "bad" : ""} ${shown === i && i !== r.k ? "miss" : ""}" data-i="${i}" ${shown != null ? "disabled" : ""}>${o.t}</button>`).join(", ")}.</p></div>`;
  const huntPool = () => [...CHAPTERS.flatMap(c => c.quests.filter(everDone)), ...DAILY];
  let gameTimer = null;
  const stopTimer = () => { clearInterval(gameTimer); gameTimer = null; };
  // Таймер тикает только пока вкладка видна.
  function runTimer(tick) { stopTimer(); let last = performance.now(); gameTimer = setInterval(() => { const now = performance.now(); if (!document.hidden) tick((now - last) / 1000); last = now; }, 100); }

  function huntMenu() {
    $("title").hidden = true;
    modal(`<h2>${t("hunt")}</h2><p>${t("huntIntro")}</p><p class="streak">${t("huntBest", { n: save.hunt.best })}</p>
      <button id="h-go">${t("huntStart")}</button><button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
    $("h-go").onclick = () => { Sound.unlock(); playHunt(); };
  }
  function playHunt() {
    const pool = huntPool();
    let left = 60, score = 0, round = makeRound(pool), feedback = null, extra = false;
    Sound.play("boss");
    const render = () => {
      $("modal").innerHTML = `<div class="hunt-top"><b>${t("huntScore", { n: score })}</b><span id="h-time">⏱ ${Math.ceil(left)}</span></div>
        <div class="timer"><i id="h-bar" style="width:${left / 60 * 100}%"></i></div>
        <p class="hunt-task">${t("huntTask")}</p>${roundHtml(round, feedback && feedback.i)}
        ${feedback ? `<div class="${feedback.hit ? "lesson" : "result"}">${feedback.text}</div>` : ""}
        ${feedback && !feedback.hit ? `<button id="h-next">${t("next")}</button>` : ""}`;
      for (const b of document.querySelectorAll(".frag")) b.onclick = () => answer(+b.dataset.i);
      if ($("h-next")) { $("h-next").onclick = nextRound; $("h-next").focus(); }
    };
    const nextRound = () => { feedback = null; round = makeRound(pool); render(); };
    const answer = i => {
      const hit = i === round.k, bad = round.parts[round.k];
      if (hit) { score++; Sound.sfx("win"); } else { left = Math.max(0, left - 5); Sound.sfx("fail"); }
      feedback = { i, hit, text: `${hit ? t("huntHit") : t("huntMiss", { t: bad.t })} ${bad.fail}` };
      render();
      if (hit) setTimeout(() => { if (feedback && feedback.hit) nextRound(); }, 1600);
    };
    const finish = () => {
      stopTimer();
      save.hunt.games++; save.hunt.best = Math.max(save.hunt.best, score);
      if (score >= 10) unlock("hunt10");
      Platform.save(save); Sound.sfx("fanfare");
      modal(`<h2>${t("huntOver")}</h2><div class="big-num">${score}</div><p>${t("huntResult", { n: score })}</p>
        <p class="streak">${t("huntBest", { n: save.hunt.best })}</p>
        ${extra ? "" : `<button class="ad" id="h-more">${t("huntMore")}</button>`}
        <button id="h-again">${t("again")}</button><button id="m-ok" class="ghost">${t("back")}</button>`, () => { Sound.play(save.ch); backToTitle(); Platform.interstitial(); });
      if ($("h-more")) $("h-more").onclick = () => rewarded(() => { extra = true; left = 15; save.hunt.games--; start(); });
      $("h-again").onclick = () => { overlay.hidden = true; playHunt(); };
    };
    const start = () => {
      modal(""); Platform.gameplay(true); render();
      runTimer(dt => {
        if (feedback) return;
        left -= dt;
        const tm = $("h-time"), bar = $("h-bar");
        if (tm) tm.textContent = `⏱ ${Math.max(0, Math.ceil(left))}`;
        if (bar) bar.style.width = `${Math.max(0, left / 60 * 100)}%`;
        if (left <= 0) finish();
      });
    };
    start();
  }

  // Злодей главы — тот, кто даёт её последнее задание.
  const villain = c => c.quests.find(q => q.final);
  const chDone = c => c.quests.every(everDone);
  function bossMenu() {
    $("title").hidden = true;
    modal(`<h2>${t("bosses")}</h2><p>${t("bossIntro")}</p><div class="bosses">${CHAPTERS.map((c, i) => {
      const v = villain(c), open = chDone(c);
      return `<button data-i="${i}" ${open ? "" : "disabled"}><canvas width="56" height="56" data-face="${open ? v.id : ""}"></canvas>
        <span><b>${open ? name(v.who) : t("locked")}</b><small>${t("chapter", { n: c.n })}. ${c.name}</small></span>${save.boss[i] ? "<em>🏆</em>" : ""}</button>`;
    }).join("")}</div><button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
    for (const cv2 of document.querySelectorAll(".bosses canvas")) if (cv2.dataset.face) World.drawPortrait(cv2.getContext("2d"), cv2.dataset.face, 56, 0);
    for (const b of document.querySelectorAll(".bosses button")) b.onclick = () => { Sound.unlock(); playBoss(+b.dataset.i); };
  }
  function playBoss(ci) {
    const c = CHAPTERS[ci], v = villain(c), pool = c.quests, ROUND = 12;
    let bossHp = 5, hp = 3, left = ROUND, round = makeRound(pool), feedback = null, revived = false;
    Sound.play("boss");
    const hearts = (n, max, ch) => ch.repeat(n) + `<i>${ch.repeat(max - n)}</i>`;
    const render = hitBoss => {
      $("modal").innerHTML = `<div class="boss-head"><canvas id="b-face" class="${hitBoss ? "shake" : ""}" width="96" height="96"></canvas>
        <div><b>${name(v.who)}</b><div class="hp boss-hp">${hearts(bossHp, 5, "■")}</div><div class="hp">${t("you")} ${hearts(hp, 3, "♥")}</div></div></div>
        <div class="timer"><i id="b-bar" style="width:${left / ROUND * 100}%"></i></div>
        <p class="hunt-task">${t("bossTask")}</p>${roundHtml(round, feedback && feedback.i)}
        ${feedback ? `<div class="${feedback.hit ? "lesson" : "result"}">${feedback.text}</div><button id="b-next">${t("next")}</button>` : ""}`;
      World.drawPortrait($("b-face").getContext("2d"), v.id, 96, performance.now());
      for (const b of document.querySelectorAll(".frag")) b.onclick = () => answer(+b.dataset.i);
      if ($("b-next")) { $("b-next").onclick = next; $("b-next").focus(); }
    };
    const next = () => {
      if (bossHp <= 0) return win();
      if (hp <= 0) return lose();
      feedback = null; left = ROUND; round = makeRound(pool); render();
    };
    const answer = i => {
      const hit = i === round.k, bad = round.parts[round.k];
      if (hit) { bossHp--; Sound.sfx("magic"); } else { hp--; Sound.sfx("fail"); }
      feedback = { i: i < 0 ? round.k : i, hit, text: `${hit ? t("bossHit") : i < 0 ? t("bossSlow", { t: bad.t }) : t("huntMiss", { t: bad.t })} ${bad.fail}` };
      render(hit);
    };
    const win = () => {
      stopTimer(); save.boss[ci] = true; unlock("boss1");
      if (CHAPTERS.every((_, i) => save.boss[i])) unlock("bossAll");
      Platform.save(save); Sound.sfx("fanfare");
      modal(`<h2>${t("bossWin")}</h2><div class="big-stars">🏆</div><p>${t("bossWinText", { name: name(v.who) })}</p><div class="lesson">${v.lesson}</div>
        <button id="m-ok">${t("next")}</button>`, () => { Sound.play(save.ch); bossMenu(); Platform.interstitial(); });
    };
    const lose = () => {
      stopTimer();
      modal(`<h2>${t("bossLose")}</h2><p>${t("bossLoseText")}</p>
        ${revived ? "" : `<button class="ad" id="b-life">${t("bossLife")}</button>`}
        <button id="b-again">${t("again")}</button><button id="m-ok" class="ghost">${t("back")}</button>`, () => { Sound.play(save.ch); bossMenu(); });
      if ($("b-life")) $("b-life").onclick = () => rewarded(() => { revived = true; hp = 1; start(); });
      $("b-again").onclick = () => { overlay.hidden = true; playBoss(ci); };
    };
    const start = () => {
      modal(""); Platform.gameplay(true); feedback = null; left = ROUND; round = makeRound(pool); render();
      runTimer(dt => {
        if (feedback) return;
        left -= dt;
        const bar = $("b-bar"); if (bar) bar.style.width = `${Math.max(0, left / ROUND * 100)}%`;
        if (left <= 0) answer(-1);
      });
    };
    start();
  }

  // ---------- Свой остров ----------
  // Игрок ставит предметы, выбирая карточку для Кодика. Новые предметы открываются с главами.
  const ISLAND_ITEMS = [["T", 0], ["p", 0], ["*", 0], ["H", 1], ["N", 2], ["%", 4], ["#", 5], ["c", 6]];
  let islandMode = false;
  const cursor = { x: 9, y: 7 };
  let lastCursor = 0;
  const islandOpen = ([, need]) => CHAPTERS.slice(0, need).every(chDone);
  function enterIsland() {
    $("title").hidden = true; islandMode = true; busy = false; held = null;
    grid = World.island(save.island); npcs = {}; theme = World.THEMES.forest; sparks = [];
    $("chap").textContent = t("island"); $("goal").textContent = t("islandGoal");
    $("island-exit").hidden = false; document.querySelector(".help").textContent = t("islandHelp");
    Sound.play(0); Platform.gameplay(true);
  }
  function leaveIsland() {
    islandMode = false; $("island-exit").hidden = true; sheet.hidden = true;
    document.querySelector(".help").textContent = t("help");
    loadChapter(save.ch); backToTitle();
  }
  const inIsland = (x, y) => World.island()[y]?.[x] === ".";
  function moveCursor(dx, dy) {
    if (Date.now() - lastCursor < 140) return;
    lastCursor = Date.now();
    const nx = cursor.x + dx, ny = cursor.y + dy;
    if (inIsland(nx, ny)) { cursor.x = nx; cursor.y = ny; Sound.sfx("blip"); }
  }
  function islandBuilder() {
    busy = true; held = null;
    let pick = null, note = "";
    const items = [...ISLAND_ITEMS.map(it => ({ c: it[0], open: islandOpen(it), need: it[1] })), { c: "any", open: true }, { c: "clear", open: true }];
    const label = c => t("is." + c);
    const render = () => {
      const what = pick == null ? `<span class="gap">[${t("isWhat").toLowerCase().replace("?", "")}]</span>`
        : `<em>${pick === "clear" ? t("isClearDo") : t("isPut", { item: label(pick) })}</em>`;
      sheetBody.innerHTML = `<div class="builder"><h3>${t("islandBuild")}</h3>
        <div class="slot"><small>${t("isWhat")}</small><div class="cards">${items.map(it => `<button class="card ${pick === it.c ? "on" : ""}" data-c="${it.c}" ${it.open ? "" : "disabled"}>
          ${it.open ? label(it.c) : `🔒 ${label(it.c)} · ${t("chapter", { n: it.need })}`}</button>`).join("")}</div></div>
        <div class="preview">${t("addressee")}, ${what}.</div>${note ? `<div class="lesson">${note}</div>` : ""}
        <div class="row"><button class="grow" id="i-do" ${pick == null ? "disabled" : ""}>${t("ask")}</button><button class="ghost" id="i-close">${t("close")}</button></div></div>`;
      for (const b of sheetBody.querySelectorAll(".card")) b.onclick = () => { Sound.sfx("click"); pick = b.dataset.c; note = ""; render(); };
      $("i-do").onclick = () => {
        let c = pick;
        if (c === "any") {
          const open = items.filter(it => it.open && it.c.length === 1);
          c = open[Math.floor(Math.random() * open.length)].c;
          note = t("isAnyNote", { item: label(c) });
        }
        const k = `${cursor.x},${cursor.y}`;
        if (c === "clear") delete save.island[k]; else save.island[k] = c;
        grid = World.island(save.island); burst(cursor.x, cursor.y, "#ffe7a0", 12); Sound.sfx("magic");
        if (Object.keys(save.island).length >= 10) unlock("builder");
        Platform.save(save);
        if (note) { pick = null; render(); } else { sheet.hidden = true; busy = false; }
      };
      $("i-close").onclick = () => { sheet.hidden = true; busy = false; };
    };
    sheet.hidden = false; render();
  }
  cv.addEventListener("click", e => {
    if (!islandMode || busy) return;
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
    if (!inIsland(x, y)) return;
    cursor.x = x; cursor.y = y; islandBuilder();
  });
  addEventListener("keydown", e => { if (islandMode && !busy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); islandBuilder(); } });

  // ---------- Альбом карточек ----------
  // Каждое пройденное задание — карточка с жителем и правилом. Три звезды дают золотую рамку.
  function albumMenu(open = null) {
    $("title").hidden = true;
    const all = CHAPTERS.flatMap(c => c.quests), got = all.filter(everDone);
    if (open) {
      const q = all.find(x => x.id === open), s = save.stars[q.id] || 0;
      modal(`<div class="acard big ${s === 3 ? "gold" : ""}"><canvas width="120" height="120" data-face="${FACES[q.who] || "S"}"></canvas>
        <b>${q.title}</b><small>${name(q.who)}</small><div class="big-stars">${starRow(s)}</div></div>
        <div class="lesson">${q.lesson}</div><button id="m-ok" class="ghost">${t("albumBack")}</button>`, () => albumMenu());
    } else {
      modal(`<h2>${t("albumTitle")}</h2><p>${t("albumCount", { n: got.length, max: all.length })}</p>
        <div class="album">${all.map(q => everDone(q)
          ? `<button class="acard ${save.stars[q.id] === 3 ? "gold" : ""}" data-id="${q.id}"><canvas width="64" height="64" data-face="${FACES[q.who] || "S"}"></canvas><b>${q.title}</b><small>${starRow(save.stars[q.id] || 0)}</small></button>`
          : `<div class="acard locked"><span>?</span></div>`).join("")}</div>
        ${got.length ? "" : `<p>${t("notesEmpty")}</p>`}<button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle, "wide");
      for (const b of document.querySelectorAll(".album button")) b.onclick = () => { Sound.sfx("click"); albumMenu(b.dataset.id); };
    }
    for (const c of document.querySelectorAll("#modal canvas[data-face]")) World.drawPortrait(c.getContext("2d"), c.dataset.face, c.width, 0);
  }

  // ---------- Главное меню ----------
  const unlocked = i => i === 0 || CHAPTERS[i - 1].quests.every(everDone);
  function backToTitle() { busy = true; sheet.hidden = true; Platform.gameplay(false); showTitle(); }

  function chaptersMenu() {
    $("title").hidden = true;
    modal(`<h2>${t("chapters")}</h2><div class="chapters">${CHAPTERS.map((c, i) => `
      <button data-i="${i}" class="${i === save.ch ? "cur" : ""}" ${unlocked(i) ? "" : "disabled"}>
        ${c.n}. ${unlocked(i) ? c.name : t("locked")}<span>★ ${chapterStars(c)}/${c.quests.length * 3}</span></button>`).join("")}</div>
      <p>${t("replayHint")}</p><button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
    for (const b of document.querySelectorAll(".chapters button")) b.onclick = () => {
      const i = +b.dataset.i, c = CHAPTERS[i];
      overlay.hidden = true;
      if (i !== save.ch || c.quests.every(q => isDone(q.id))) {
        // Повтор главы: её квесты снова открыты, звёзды остаются лучшими.
        if (c.quests.every(q => isDone(q.id))) {
          // У старых сохранений нет звёзд: отмечаем пройденное звездой, чтобы следующие главы не закрылись.
          for (const q of c.quests) save.stars[q.id] = save.stars[q.id] || 1;
          save.done = save.done.filter(id => !c.quests.some(q => q.id === id)); save.hintUsed[i] = false;
        }
        save.ch = i; save.met = c.quests.some(q => isDone(q.id)); save.pos = null; Platform.save(save);
        loadChapter(i);
      }
      busy = false; Platform.gameplay(true); startChapter();
    };
  }

  function parentsMenu() {
    $("title").hidden = true;
    modal(`<h2>${t("parentsTitle")}</h2><div class="parents"><p>${t("parentsIntro")}</p>
      ${CHAPTERS.map((c, i) => `<h3>${t("chapter", { n: c.n })}. ${c.name}</h3>
        <p><b>${t("teaches")}</b> ${PARENTS[i].teaches}</p><p><b>${t("discuss")}</b></p>
        <ul>${PARENTS[i].ask.map(a => `<li>${a}</li>`).join("")}</ul>`).join("")}</div>
      <button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
  }

  async function topMenu() {
    $("title").hidden = true;
    modal(`<h2>${t("top")}</h2><p>${t("loading")}</p>`);
    const top = await Platform.topScores();
    const login = !Platform.isAuthorized()
      ? `<p>${t("loginText")}</p><button id="m-login">${t("loginBtn")}</button>` : "";
    const list = top && top.rows.length
      ? `<ol class="top">${top.rows.map(r => `<li class="${r.me ? "me" : ""}"><b>${r.rank}</b><span>${r.name || t("player")}</span>★ ${r.score}</li>`).join("")}</ol>`
      : `<p>${top ? t("topEmpty") : t("topOffline")}</p>`;
    modal(`<h2>${t("top")}</h2><p>${t("yourStars", { n: totalStars(), max: maxStars() })}</p>${list}${top ? login : ""}<button id="m-ok" class="ghost">${t("back")}</button>`, backToTitle);
    const lb = $("m-login");
    if (lb) lb.onclick = async () => { if (await Platform.login()) { await Platform.submitScore(totalStars()); topMenu(); } };
  }

  function showTitle() {
    const play = $("t-play"), any = save.done.length > 0 || Object.keys(save.stars).length > 0;
    play.textContent = save.met || save.ch > 0 ? t("cont") : t("play");
    $("t-stars").hidden = !any;
    $("t-stars").textContent = t("starsOf", { n: totalStars(), max: maxStars() });
    $("t-daily").textContent = dailyDoneToday() ? t("dailyDone") : t("daily");
    $("t-daily").classList.toggle("done", dailyDoneToday());
    $("t-chapters").hidden = !any;
    $("t-notes").hidden = !any;
    $("t-boss").hidden = !CHAPTERS.some(chDone);
    $("t-top").hidden = !Platform.hasSdk() && !any;
    for (const b of document.querySelectorAll(".lang button")) b.classList.toggle("on", b.dataset.lang === I18N.lang);
    $("title").hidden = false; play.focus();
  }

  // ---------- Язык ----------
  function applyLang() {
    ({ CHAPTERS, DAILY, PARENTS } = I18N.content());
    document.title = t("game");
    for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
    for (const el of document.querySelectorAll("[data-i18n-aria]")) el.setAttribute("aria-label", t(el.dataset.i18nAria));
    for (const el of document.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
    showSnd();
  }
  const snd = $("snd");
  function showSnd() { snd.classList.toggle("off", !Sound.on); snd.setAttribute("aria-label", Sound.on ? t("sndOff") : t("sndOn")); }

  // ---------- Запуск ----------
  (async () => {
    await Platform.init();
    I18N.detect(Platform.sdkLang());
    applyLang();
    const data = await Platform.load();
    if (data && data.v === 3) save = { ...save, ...data, stars: data.stars || {}, daily: { ...save.daily, ...data.daily }, ach: data.ach || [], hintUsed: data.hintUsed || {},
      look: { ...save.look, ...data.look }, owned: data.owned || [], hunt: { ...save.hunt, ...data.hunt }, island: data.island || {}, boss: data.boss || {} };
    else if (data && data.v === 2) save = { ...save, done: data.done || [], pos: data.pos, met: !!data.metAda };
    if (!CHAPTERS[save.ch]) save.ch = 0;
    // Глава пройдена, а переход не сохранился (старые сохранения) — сразу в следующую.
    while (CHAPTERS[save.ch + 1] && CHAPTERS[save.ch].quests.every(q => save.done.includes(q.id))) { save.ch++; save.met = false; save.pos = null; }
    applyLook();
    loadChapter(save.ch);
    fit(); updateStars();
    Platform.ready();
    snd.onclick = () => { Sound.unlock(); Sound.toggle(); showSnd(); };
    requestAnimationFrame(loop);
    const play = $("t-play");
    $("t-chapters").onclick = chaptersMenu;
    $("t-notes").onclick = () => albumMenu();
    $("t-top").onclick = topMenu;
    $("t-daily").onclick = () => { Sound.unlock(); dailyMenu(); };
    $("t-ach").onclick = achievementsMenu;
    $("t-parents").onclick = parentsMenu;
    $("t-wardrobe").onclick = () => wardrobeMenu();
    $("t-hunt").onclick = huntMenu;
    $("t-boss").onclick = bossMenu;
    $("t-island").onclick = () => { Sound.unlock(); enterIsland(); };
    $("island-exit").onclick = leaveIsland;
    for (const b of document.querySelectorAll(".lang button")) b.onclick = () => {
      if (b.dataset.lang === I18N.lang) return;
      I18N.set(b.dataset.lang, true);
      persist(); applyLang(); loadChapter(save.ch); updateStars(); showTitle();
    };
    checkAchievements();
    showTitle();
    play.onclick = () => {
      Sound.unlock();
      $("title").hidden = true;
      Platform.gameplay(true);
      startChapter();
    };
  })();
})();
