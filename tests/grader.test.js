// Запуск: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const { grade } = require("../js/grader.js");

// levels.js пишет в window, поэтому подставляем его и читаем сюжет.
global.window = {};
require("../js/levels.js");
const levels = window.STORY.arcs.flatMap(a => a.levels);

test("пример-подсказка каждого уровня побеждает с одного удара", () => {
  for (const l of levels) {
    const { dmg, res } = grade(l.hint, l);
    assert.strictEqual(dmg, 100, `уровень ${l.id}: ${JSON.stringify(res)}`);
  }
});

test("короткий размытый промт почти не наносит урона", () => {
  const { dmg } = grade("почини кнопку", levels[0]);
  assert.ok(dmg <= 20);
});

test("без сути задачи урон не больше 20", () => {
  const { dmg } = grade("В моей игре на JavaScript нужно, чтобы всё работало. Не меняй дизайн. Покажи код.", levels[0]);
  assert.ok(dmg <= 20);
});

test("набор ключевых слов с повторами ослаблен", () => {
  const spam = "кнопка игра нужно не меняй покажи кнопка игра нужно не меняй покажи кнопка игра нужно";
  const { dmg } = grade(spam, levels[0]);
  assert.ok(dmg <= 40, `урон ${dmg}`);
});

test("«сделай хорошо» снижает урон", () => {
  const base = "В моей игре на JavaScript кнопка Старт не работает, нужно чтобы она запускала игру.";
  const a = grade(base, levels[0]).dmg;
  const b = grade(base + " Сделай хорошо.", levels[0]).dmg;
  assert.ok(b < a);
});
