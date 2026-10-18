// Запуск: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const { QUESTS, STORY } = require("../js/quests.js");

global.window = {};
require("../js/world.js");
const { build, W, H, SOLID, START } = window.World;

test("в каждом слоте ровно одна верная карточка, у неверных есть объяснение", () => {
  for (const q of QUESTS) for (const s of q.slots) {
    assert.strictEqual(s.opts.filter(o => o.ok).length, 1, `${q.id} / ${s.label}`);
    for (const o of s.opts) if (!o.ok) assert.ok(o.fail, `${q.id} / ${o.t}: нет текста ошибки`);
  }
});

test("у каждого квеста есть житель на карте", () => {
  const { npcs } = build();
  for (const q of QUESTS) assert.ok(npcs[q.id], `нет жителя ${q.id}`);
  assert.ok(npcs.A, "нет бабушки Ады");
});

// Проходит игру «по-честному»: после каждого квеста до следующего жителя можно дойти пешком.
test("после каждого квеста до следующего жителя можно дойти", () => {
  const { grid, npcs } = build();
  const reach = () => {
    const seen = new Set([`${START.x},${START.y}`]), queue = [[START.x, START.y]];
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
  for (const q of QUESTS) {
    assert.ok(nextTo(reach(), npcs[q.id]), `не дойти до ${q.who}`);
    const e = q.effect;
    for (const [x, y] of e.set || []) grid[y][x] = e.to;
    if (e.replace) grid.forEach(r => r.forEach((c, x) => { if (c === e.replace) r[x] = e.to; }));
  }
});

test("у всех препятствий на пути есть подсказка", () => {
  for (const c of ["~", "d", "G"]) assert.ok(STORY.bump[c]);
});
