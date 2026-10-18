(function () {
  const $ = id => document.getElementById(id);
  const { World, STORY, QUESTS, Platform } = window;
  const { TS, W, H } = World;

  const { grid, npcs } = World.build();
  const hero = { x: World.START.x, y: World.START.y, px: 0, py: 0, dir: [0, 1], moving: false };
  let save = { v: 2, metAda: false, done: [], pos: null };
  let busy = true, held = null, sparks = [];

  const quest = id => QUESTS.find(q => q.id === id);
  const isDone = id => save.done.includes(id);
  const currentQuest = () => QUESTS.find(q => !isDone(q.id));
  function persist() { save.pos = { x: hero.x, y: hero.y }; Platform.save(save); }

  // ---------- Отрисовка ----------
  const cv = $("cv"), ctx = cv.getContext("2d");
  const at = (x, y) => (grid[y] && grid[y][x]) || "T";
  // Лёгкое затемнение по краям, чтобы мир смотрелся как сцена.
  const vignette = ctx.createRadialGradient(160, 120, 90, 160, 120, 230);
  vignette.addColorStop(0, "rgba(10,6,30,0)"); vignette.addColorStop(1, "rgba(10,6,30,.45)");
  function draw(t) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) World.drawTile(ctx, grid[y][x], x, y, t, at);
    const cur = currentQuest();
    for (const n of Object.values(npcs)) {
      if (n.gone) continue;
      const bob = Math.floor(t / 400 + n.x) % 2;
      World.drawSprite(ctx, n.id, n.x * TS, n.y * TS - bob, false);
      // Восклицательный знак над тем, кто ждёт помощи сейчас.
      if (save.metAda && cur && cur.id === n.id) {
        ctx.fillStyle = "#ffcf4a"; ctx.fillRect(n.x * TS + 7, n.y * TS - 6 - bob, 2, 4); ctx.fillRect(n.x * TS + 7, n.y * TS - 1 - bob, 2, 1);
      }
    }
    World.drawSprite(ctx, "hero", hero.px, hero.py - (hero.moving ? Math.floor(t / 120) % 2 : 0), hero.dir[0] < 0);
    sparks = sparks.filter(s => (s.life -= 1 / 60) > 0);
    for (const s of sparks) { s.x += s.vx; s.y += s.vy; ctx.globalAlpha = Math.min(1, s.life * 2); ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, 2, 2); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, 320, 240);
  }
  function burst(x, y, c, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.3, v = .3 + Math.random() * 1.2;
      sparks.push({ x: x * TS + 8, y: y * TS + 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .6 + Math.random() * .5, c });
    }
  }

  // ---------- Изменения мира после квеста ----------
  function applyEffect(e, animate) {
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
    if (!STORY.bump[c] || Date.now() - lastBump < 1500) return;
    lastBump = Date.now(); held = null;
    say([{ who: "Кодомаг", text: STORY.bump[c] }]);
  }
  let lastSave = 0;
  function step() {
    if (hero.moving) {
      const tx = hero.x * TS, ty = hero.y * TS;
      hero.px += Math.sign(tx - hero.px) * Math.min(2, Math.abs(tx - hero.px));
      hero.py += Math.sign(ty - hero.py) * Math.min(2, Math.abs(ty - hero.py));
      if (hero.px === tx && hero.py === ty) {
        hero.moving = false;
        if (Date.now() - lastSave > 3000) { lastSave = Date.now(); persist(); }
      }
    }
    if (!hero.moving && held) tryMove(...held);
  }
  function loop(t) { step(); draw(t); requestAnimationFrame(loop); }

  const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  addEventListener("keydown", e => { const k = KEYS[e.key]; if (k && !busy) { e.preventDefault(); held = k; } });
  addEventListener("keyup", e => { if (KEYS[e.key]) held = null; });
  for (const b of document.querySelectorAll("#pad button")) {
    const d = b.dataset.d.split(",").map(Number);
    b.addEventListener("pointerdown", e => { e.preventDefault(); held = d; });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => { held = null; });
  }

  // ---------- Диалоги ----------
  const sheet = $("sheet"), sheetBody = $("sheet-body");
  const FACES = { "Бабушка Ада": "A", "Рыбак Фёдор": "F", "Шахтёр Михей": "M", "Повелитель Багов": "B", "Кодомаг": "hero", "Дух Кода": "S" };
  function say(lines, done) {
    let i = 0; busy = true; held = null;
    const render = () => {
      const face = FACES[lines[i].who];
      sheetBody.innerHTML = `<div class="talk" tabindex="0">${face ? `<canvas class="face" width="32" height="32"></canvas>` : ""}
        <div class="talk-text"><b>${lines[i].who}</b><p>${lines[i].text}</p><i>Нажмите, чтобы продолжить ▸</i></div></div>`;
      const el = sheetBody.firstChild;
      if (face) World.drawSprite(el.querySelector(".face").getContext("2d"), face, 0, 0, false, 2);
      el.onclick = next;
      el.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } };
      el.focus();
    };
    const next = () => { i++; if (i < lines.length) render(); else { sheet.hidden = true; busy = false; done?.(); } };
    sheet.hidden = false; render();
  }

  function updateGoal() {
    const q = currentQuest();
    $("goal").textContent = !save.metAda ? STORY.findAda : q ? q.goal : STORY.freed;
  }

  function talkTo(id) {
    if (id === "A") {
      const q = currentQuest();
      return say([{ who: "Бабушка Ада", text: q ? `Не забывай: ${q.goal.charAt(0).toLowerCase() + q.goal.slice(1)}` : "Ты справился, внучек! Я горжусь тобой." }]);
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
    let hintSlot = -1;
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
          <button class="ad" id="b-hint">Подсказка</button>
          <button class="ghost" id="b-later">Позже</button>
        </div></div>`;
      for (const b of sheetBody.querySelectorAll(".card")) b.onclick = () => { picks[+b.dataset.s] = +b.dataset.o; render(); };
      $("b-cast").onclick = () => {
        const bad = picks.map((p, i) => shuffled[i][p]).find(o => !o.ok);
        if (bad) return render(bad.fail);
        sheet.hidden = true;
        complete(q);
      };
      $("b-hint").onclick = () => rewarded(() => {
        hintSlot = q.slots.findIndex((_, i) => picks[i] == null || !shuffled[i][picks[i]].ok);
        render();
      });
      $("b-later").onclick = () => { sheet.hidden = true; busy = false; };
    };
    sheet.hidden = false; render();
  }

  function complete(q) {
    save.done.push(q.id); persist();
    applyEffect(q.effect, true);
    setTimeout(() => modal(`<h2>Получилось!</h2><div class="lesson">${q.lesson}</div><button id="m-ok">Дальше</button>`, () => {
      say(q.after, () => {
        updateGoal();
        if (q.final) ending(); else Platform.interstitial();
      });
    }), 900);
  }

  // ---------- Окна и реклама ----------
  const overlay = $("overlay");
  function modal(html, onOk) {
    busy = true;
    $("modal").innerHTML = html; overlay.hidden = false;
    const ok = $("m-ok");
    if (ok) { ok.focus(); ok.onclick = () => { overlay.hidden = true; busy = false; onOk?.(); }; }
  }
  // Вне Яндекса вместо ролика показываем обратный отсчёт.
  function mockAd(done) {
    let s = 3;
    $("modal").innerHTML = `<div class="adbox">Здесь будет реклама Яндекса<b id="ac">${s}</b></div>`;
    overlay.hidden = false;
    const iv = setInterval(() => {
      s--; const el = $("ac"); if (el) el.textContent = s;
      if (s <= 0) { clearInterval(iv); overlay.hidden = true; done(); }
    }, 1000);
  }
  const rewarded = cb => Platform.rewarded(cb, mockAd);

  function ending() {
    const e = STORY.ending;
    modal(`<h2>${e.title}</h2><div class="lesson">${e.lesson}</div><p>${e.next}</p><button id="m-ok">Гулять дальше</button>`);
  }

  // ---------- Запуск ----------
  (async () => {
    await Platform.init();
    const data = await Platform.load();
    if (data && data.v === 2) save = { ...save, ...data };
    for (const id of save.done) applyEffect(quest(id).effect, false);
    if (save.pos && !World.SOLID.has(grid[save.pos.y][save.pos.x]) && !npcAt(save.pos.x, save.pos.y)) { hero.x = save.pos.x; hero.y = save.pos.y; }
    hero.px = hero.x * TS; hero.py = hero.y * TS;
    updateGoal();
    Platform.ready();
    requestAnimationFrame(loop);
    const play = $("t-play");
    play.textContent = save.metAda ? "Продолжить" : "Играть";
    $("title").hidden = false; play.focus();
    play.onclick = () => {
      $("title").hidden = true;
      if (!save.metAda) say(STORY.intro, () => { save.metAda = true; persist(); updateGoal(); });
      else busy = false;
    };
  })();
})();
