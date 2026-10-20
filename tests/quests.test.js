// Запуск: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const { CHAPTERS } = require("../js/quests.js");

global.window = {};
require("../js/world.js");
const { build, W, H, SOLID, CHAPTERS: MAPS } = window.World;

test("у каждой главы есть карта нужного размера", () => {
  assert.strictEqual(MAPS, CHAPTERS.length);
  CHAPTERS.forEach((_, ch) => {
    const { grid } = build(ch);
    assert.strictEqual(grid.length, H, `глава ${ch + 1}`);
    grid.forEach((r, y) => assert.strictEqual(r.length, W, `глава ${ch + 1}, строка ${y}`));
  });
});

test("id квестов не повторяются между главами", () => {
  const ids = CHAPTERS.flatMap(c => c.quests.map(q => q.id));
  assert.strictEqual(new Set(ids).size, ids.length);
});

for (const [ch, chapter] of CHAPTERS.entries()) {
  const name = `глава ${chapter.n}`;

  test(`${name}: в каждом слоте ровно одна верная карточка, у неверных есть объяснение`, () => {
    for (const q of chapter.quests) for (const s of q.slots) {
      assert.strictEqual(s.opts.filter(o => o.ok).length, 1, `${q.id} / ${s.label}`);
      for (const o of s.opts) if (!o.ok) assert.ok(o.fail, `${q.id} / ${o.t}: нет текста ошибки`);
    }
  });

  test(`${name}: у каждого квеста и проводника есть житель на карте`, () => {
    const { npcs } = build(ch);
    for (const q of chapter.quests) assert.ok(npcs[q.id], `нет жителя ${q.id}`);
    assert.ok(npcs[chapter.guide], "нет проводника");
  });

  // Проходит главу «по-честному»: после каждого квеста до следующего жителя можно дойти пешком.
  test(`${name}: после каждого квеста до следующего жителя можно дойти`, () => {
    const { grid, npcs, start } = build(ch);
    const reach = () => {
      const seen = new Set([`${start.x},${start.y}`]), queue = [[start.x, start.y]];
      while (queue.length) {
        const [x, y] = queue.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(k)) continue;
          if (SOLID.has(grid[ny][nx]) || Object.values(npcs).some(n => n.x === nx && n.y === ny)) continue;
          seen.add(k); queue.push([nx, ny]);
        }
      }
      return seen;
    };
    const nextTo = (seen, n) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${n.x + dx},${n.y + dy}`));
    assert.ok(nextTo(reach(), npcs[chapter.guide]), "не дойти до проводника");
    for (const q of chapter.quests) {
      assert.ok(nextTo(reach(), npcs[q.id]), `не дойти до ${q.who}`);
      for (const e of [].concat(q.effect)) {
        for (const [x, y] of e.set || []) grid[y][x] = e.to;
        if (e.replace) grid.forEach(r => r.forEach((c, x) => { if (c === e.replace) r[x] = e.to; }));
      }
    }
  });

  test(`${name}: у препятствий на пути есть подсказка`, () => {
    const { grid } = build(ch);
    const blockers = new Set(grid.flat().filter(c => ["~", "d", "G", "f", "m", "c"].includes(c)));
    for (const c of blockers) assert.ok(chapter.story.bump[c], `нет подсказки для «${c}»`);
  });
}

// ---------- Промт дня и переводы ----------
const { DAILY, PARENTS } = require("../js/quests.js");

test("промт дня: в каждом слоте ровно одна верная карточка", () => {
  assert.ok(DAILY.length >= 7);
  for (const q of DAILY) for (const s of q.slots) {
    assert.strictEqual(s.opts.filter(o => o.ok).length, 1, `${q.title} / ${s.label}`);
    for (const o of s.opts) if (!o.ok) assert.ok(o.fail, `${q.title} / ${o.t}`);
  }
  assert.strictEqual(PARENTS.length, CHAPTERS.length, "у каждой главы есть пояснение для взрослых");
});

global.document = { documentElement: {} };
global.navigator = { language: "ru" };
global.localStorage = { getItem: () => null, setItem() {} };
require("../js/i18n.js");
const { I18N } = window;
for (const lang of ["en", "uz"]) {
  require(`../js/lang/${lang}.js`);
  test(`перевод ${lang}: повторяет структуру русского текста и ничего не теряет`, () => {
    const pack = window.LANG_PACKS[lang];
    assert.ok(pack, "нет пакета");
    // Каждая строка оригинала должна иметь перевод на том же месте.
    const same = (src, tr, path) => {
      if (typeof src === "string") {
        assert.strictEqual(typeof tr, "string", `${path}: нет перевода`);
        assert.ok(tr.trim(), `${path}: пустой перевод`);
        assert.ok(!/[а-яё]/i.test(tr), `${path}: остался русский текст`);
        for (const ph of src.match(/\{\w+\}/g) || []) assert.ok(tr.includes(ph), `${path}: нет ${ph}`);
        assert.strictEqual((tr.match(/<br>/g) || []).length, (src.match(/<br>/g) || []).length, `${path}: <br>`);
        return;
      }
      if (Array.isArray(src)) { assert.strictEqual(tr?.length, src.length, `${path}: длина`); return src.forEach((x, i) => same(x, tr[i], `${path}[${i}]`)); }
      if (src && typeof src === "object") for (const k of Object.keys(src)) if (!I18N.SKIP.has(k)) same(src[k], tr?.[k], `${path}.${k}`);
    };
    same(CHAPTERS, pack.chapters, "chapters");
    same(DAILY, pack.daily, "daily");
    same(PARENTS, pack.parents, "parents");
    same(I18N.RU, pack.ui, "ui");
    const names = new Set();
    JSON.stringify(CHAPTERS, (k, v) => { if ((k === "who" || k === "guideName") && typeof v === "string") names.add(v); return v; });
    for (const n of names) assert.ok(pack.names[n] && !/[а-яё]/i.test(pack.names[n]), `нет имени ${n}`);
  });
}
