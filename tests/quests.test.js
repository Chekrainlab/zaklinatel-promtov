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
