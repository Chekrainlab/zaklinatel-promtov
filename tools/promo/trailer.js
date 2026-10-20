// Ролик для карточки Яндекса (16:9, до 28 с): титул → разговор → сборка промта с ошибкой → мост → другие миры.
const fs = require('fs');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const REPO = '/home/claude/zaklinatel-promtov', LANG = process.argv[2] || 'ru', DIR = __dirname + '/vid-' + LANG;
global.window = {};
require(REPO + '/js/world.js');
const { build, W, H, SOLID } = window.World;
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
function route(grid, npcs, from, target) {
  const key = (x, y) => x + ',' + y, prev = new Map([[key(from.x, from.y), null]]), q = [[from.x, from.y]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(k)) continue;
      if (nx === target.x && ny === target.y) { let path = d, cur = key(x, y); while (prev.get(cur)) { const [pd, pk] = prev.get(cur); path = pd + path; cur = pk; } return { path, end: { x, y } }; }
      if (SOLID.has(grid[ny][nx]) || Object.values(npcs).some(n => !n.hidden && n.x === nx && n.y === ny)) continue;
      prev.set(k, [d, key(x, y)]); q.push([nx, ny]);
    }
  }
  throw new Error('нет пути');
}
const ACH = ['first', 'perfect', 'nohint', 'part1', 'part2', 'allstars', 'daily1', 'streak3', 'streak7'];
(async () => {
  fs.rmSync(DIR, { recursive: true, force: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: DIR, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  await p.addInitScript(lang => { if (!sessionStorage.seeded) { localStorage.clear(); localStorage.setItem('kodolesie-lang', lang); localStorage.setItem('kodolesie-sound', 'off'); sessionStorage.seeded = 1; } }, LANG);
  await p.goto('file://' + REPO + '/index.html');
  await p.evaluate(a => localStorage.setItem('zaklinatel-save-v1', JSON.stringify({ v: 3, ch: 0, met: false, done: [], pos: null, stars: {}, ach: a })), ACH);
  await p.reload(); await p.waitForTimeout(1800);
  const C = await p.evaluate(() => I18N.content());
  const K = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
  const walk = async s => { for (const c of s) { await p.keyboard.down(K[c]); await p.waitForTimeout(60); await p.keyboard.up(K[c]); await p.waitForTimeout(170); } };
  const talk = async ms => { while (await p.$('#sheet:not([hidden]) .talk')) { await p.waitForTimeout(ms); await p.click('.talk'); } };
  const clickCard = async t => { for (const e of await p.$$('.card')) if ((await e.textContent()) === t) return e.click(); };
  await p.click('#t-play'); await p.waitForTimeout(300);
  // Вступление: два первых экрана медленно, остальные быстро.
  let n = 0; while (await p.$('#sheet:not([hidden]) .talk')) { await p.waitForTimeout(n++ < 2 ? 1000 : 60); await p.click('.talk'); }
  const { grid, npcs, start } = build(0), q = C.CHAPTERS[0].quests[0];
  await walk(route(grid, npcs, start, npcs[q.id]).path);
  await talk(650);
  await p.waitForTimeout(500);
  await clickCard(q.slots[0].opts.find(o => !o.ok).t); await p.waitForTimeout(300);
  for (const s of q.slots.slice(1)) { await clickCard(s.opts.find(o => o.ok).t); await p.waitForTimeout(300); }
  await p.click('#b-cast'); await p.waitForTimeout(2000);
  await clickCard(q.slots[0].opts.find(o => o.ok).t); await p.waitForTimeout(500);
  await p.click('#b-cast'); await p.waitForTimeout(2000);
  await p.click('#m-ok'); await p.waitForTimeout(200); await talk(700); await p.waitForTimeout(1500);
  // Другие миры: Кодоград и Снежная мастерская.
  for (const [ch, x, y] of [[3, 10, 6], [5, 12, 9], [6, 6, 8]]) {
    await p.evaluate(([ch, x, y, a]) => { localStorage.setItem('zaklinatel-save-v1', JSON.stringify({ v: 3, ch, met: true, done: [], pos: { x, y }, stars: {}, ach: a })); }, [ch, x, y, ACH]);
    await p.reload(); await p.waitForTimeout(300); await p.click('#t-play'); await p.waitForTimeout(1500);
  }
  await ctx.close(); await b.close();
  console.log(fs.readdirSync(DIR));
})();
