(function () {
  const $ = id => document.getElementById(id);
  const { STORY, PROMPT_CHIPS, Grader, Platform } = window;

  let save = { v: 1, introSeen: false, stars: {} };
  let level = null, hp = 100, hearts = 3, busy = false;

  // ---------- Экраны ----------
  function show(name) {
    for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== "screen-" + name;
    scrollTo(0, 0);
  }

  // ---------- Прогресс ----------
  function allLevels() { return STORY.arcs.flatMap(a => a.levels.map(l => ({ ...l, arc: a.id }))); }
  function isDone(id) { return (save.stars[id] || 0) > 0; }
  function isOpen(id) {
    const list = allLevels();
    const i = list.findIndex(l => l.id === id);
    return i === 0 || isDone(list[i - 1].id);
  }
  function persist() { Platform.save(save); }

  // ---------- Диалоги ----------
  function dialog(lines, done) {
    if (!lines || !lines.length) return done();
    let i = 0;
    show("dialog");
    const box = $("dialog");
    const render = () => { $("dialog-who").textContent = lines[i].who; $("dialog-text").textContent = lines[i].text; };
    const next = () => {
      i++;
      if (i < lines.length) render();
      else { box.onclick = box.onkeydown = null; done(); }
    };
    box.onclick = next;
    box.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); } };
    render(); box.focus();
  }

  // ---------- Карта ----------
  function renderMap() {
    const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
    $("stars-total").textContent = `★ ${total}`;
    const map = $("map"); map.innerHTML = "";
    STORY.arcs.forEach((arc, ai) => {
      const prevArc = STORY.arcs[ai - 1];
      const arcOpen = arc.levels.length && (!prevArc || prevArc.levels.every(l => isDone(l.id)));
      const el = document.createElement("div");
      el.className = "arc" + (arcOpen ? "" : " locked");
      el.innerHTML = `<h3>Арка ${arc.id}. ${arc.name}</h3><p>Навык: ${arc.skill}</p>`;
      const nodes = document.createElement("div"); nodes.className = "nodes";
      if (!arc.levels.length) nodes.innerHTML = `<p>Скоро в обновлении</p>`;
      arc.levels.forEach((l, li) => {
        if (li) nodes.insertAdjacentHTML("beforeend", `<span class="node-line"></span>`);
        const b = document.createElement("button");
        const st = save.stars[l.id] || 0;
        const open = arcOpen && isOpen(l.id);
        b.className = "node" + (st ? " done" : open ? " open" : "") + (l.boss ? " boss" : "");
        b.disabled = !open;
        b.innerHTML = `${l.boss ? "БОСС" : l.id}<small>${st ? "★".repeat(st) : ""}</small>`;
        b.setAttribute("aria-label", `Уровень ${l.id}: ${l.enemy}`);
        b.onclick = () => startLevel(l);
        nodes.appendChild(b);
      });
      el.appendChild(nodes);
      map.appendChild(el);
    });
    show("map");
  }

  // ---------- Бой ----------
  const MONSTER = c => `
    <rect x="3" y="6" width="10" height="8" fill="${c}"/><rect x="2" y="9" width="12" height="5" fill="${c}"/>
    <rect x="5" y="4" width="6" height="2" fill="${c}"/><rect x="5" y="8" width="2" height="2" fill="#fff"/>
    <rect x="9" y="8" width="2" height="2" fill="#fff"/><rect x="6" y="9" width="1" height="1" fill="#140f24"/>
    <rect x="10" y="9" width="1" height="1" fill="#140f24"/><rect x="6" y="12" width="4" height="1" fill="#140f24"/>
    <rect x="2" y="14" width="2" height="2" fill="${c}"/><rect x="7" y="14" width="2" height="2" fill="${c}"/><rect x="12" y="14" width="2" height="2" fill="${c}"/>`;
  const CROWN = `<rect x="4" y="1" width="1" height="3" fill="#ffcf4a"/><rect x="7" y="0" width="2" height="4" fill="#ffcf4a"/><rect x="11" y="1" width="1" height="3" fill="#ffcf4a"/>`;

  function startLevel(l) {
    level = l;
    dialog(l.intro, () => {
      hp = 100; hearts = 3; busy = false;
      $("lvl-label").textContent = `Уровень ${l.id}`;
      $("enemy-name").textContent = l.enemy;
      $("enemy-svg").innerHTML = MONSTER(l.color) + (l.boss ? CROWN : "");
      $("enemy").classList.remove("dead");
      $("quest-title").textContent = l.boss ? "БОСС" : "ЗАДАНИЕ";
      $("quest-text").textContent = l.quest;
      $("prompt").value = ""; $("log").innerHTML = "";
      renderBattle();
      show("battle");
    });
  }

  function renderBattle() {
    $("hp").style.width = hp + "%";
    $("hearts").textContent = "♥".repeat(hearts) + "♡".repeat(3 - hearts);
    $("btn-cast").disabled = busy;
  }

  function fx(cls, ms, cb) {
    const el = document.createElement("div"); el.className = cls;
    $("arena").appendChild(el);
    requestAnimationFrame(() => el.classList.add("fly"));
    setTimeout(() => { el.remove(); cb(); }, ms);
  }
  function shake(id) { $(id).classList.add("shake"); setTimeout(() => $(id).classList.remove("shake"), 400); }

  function cast(e) {
    e.preventDefault();
    const text = $("prompt").value;
    if (busy || !text.trim()) return;
    busy = true; renderBattle();
    const { res, dmg, notes } = Grader.grade(text, level);
    fx("bolt" + (dmg < 60 ? " weak" : ""), 560, () => {
      hp = Math.max(0, hp - dmg);
      const pop = document.createElement("div"); pop.className = "dmg"; pop.textContent = dmg ? `−${dmg}` : "мимо";
      $("arena").appendChild(pop); setTimeout(() => pop.remove(), 1000);
      shake("enemy");
      const r = level.replies;
      showFeedback(res, dmg, notes, dmg >= 100 ? r.good : dmg >= 60 ? r.mid : r.bad);
      renderBattle();
      if (hp <= 0) { $("enemy").classList.add("dead"); setTimeout(win, 700); }
      else setTimeout(enemyTurn, 500);
    });
  }

  function enemyTurn() {
    fx("slime", 520, () => {
      hearts--; shake("hero");
      busy = false; renderBattle();
      if (hearts <= 0) lose();
    });
  }

  function showFeedback(res, dmg, notes, aiText) {
    $("log").innerHTML = `
      <div class="reply"><b>ОТВЕТ ИИ · урон ${dmg}</b>${aiText}</div>
      ${notes.map(n => `<p class="note">${n}</p>`).join("")}
      <div class="checks">${Grader.CRITERIA.map(c => `
        <div class="chk ${res[c.key] ? "ok" : "no"}"><strong>${res[c.key] ? "✓" : "✗"} ${c.name}</strong>
        ${res[c.key] ? "" : `<span>${c.tip}</span>`}</div>`).join("")}</div>`;
  }

  // ---------- Окна и реклама ----------
  function modal(html) { $("modal").innerHTML = html; $("overlay").hidden = false; }
  function closeModal() { $("overlay").hidden = true; }

  function mockAd(onReward) {
    let s = 3;
    modal(`<div class="adbox">Здесь будет реклама Яндекса<b id="ac">${s}</b></div>`);
    const iv = setInterval(() => {
      s--; const el = $("ac"); if (el) el.textContent = s;
      if (s <= 0) { clearInterval(iv); closeModal(); onReward(); }
    }, 1000);
  }
  const rewarded = cb => Platform.rewarded(cb, mockAd);

  function win() {
    const stars = Math.max(1, hearts);
    save.stars[level.id] = Math.max(save.stars[level.id] || 0, stars);
    persist();
    const finish = () => {
      modal(`<h2>${level.enemy} побеждён!</h2>
        <div class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div>
        <div class="lesson">${level.lesson}</div>
        <button id="m-next">На карту</button>`);
      $("m-next").onclick = () => { closeModal(); Platform.interstitial(); renderMap(); };
    };
    dialog(level.outro, finish);
  }

  function lose() {
    modal(`<h2>Кодомаг устал</h2><p>Посмотрите, каких частей не хватило промту, и попробуйте снова.</p>
      <button class="ad" id="m-retry">Ещё 3 жизни</button>
      <button class="ghost" id="m-restart">Начать уровень заново</button>`);
    $("m-retry").onclick = () => { closeModal(); rewarded(() => { hearts = 3; busy = false; renderBattle(); }); };
    $("m-restart").onclick = () => { closeModal(); startLevel({ ...level, intro: [] }); };
  }

  // ---------- Запуск ----------
  $("form").addEventListener("submit", cast);
  $("prompt").addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) cast(e); });
  $("btn-back").onclick = renderMap;
  $("btn-hint").onclick = () => rewarded(() => {
    modal(`<h2>Пример сильного промта</h2><div class="lesson">${level.hint}</div>
      <p>Попробуйте написать свой, своими словами.</p><button id="m-ok">Понятно</button>`);
    $("m-ok").onclick = closeModal;
  });
  for (const c of PROMPT_CHIPS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = c.trim();
    b.onclick = () => {
      const t = $("prompt");
      t.value += (t.value && !/\s$/.test(t.value) ? " " : "") + c;
      t.focus();
    };
    $("chips").appendChild(b);
  }
  $("btn-play").onclick = () => {
    if (save.introSeen) return renderMap();
    dialog(STORY.intro, () => { save.introSeen = true; persist(); renderMap(); });
  };

  (async () => {
    await Platform.init();
    const data = await Platform.load();
    if (data && data.v === 1) save = data;
    Platform.ready();
  })();
})();
