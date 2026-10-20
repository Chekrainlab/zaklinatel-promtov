const fs = require('fs');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const LANG = process.argv[2] || 'ru';
const OUT = '/home/claude/zaklinatel-promtov/promo/' + (LANG === 'ru' ? '' : LANG + '/');
fs.mkdirSync(OUT, { recursive: true });
const GAME = 'file:///home/claude/zaklinatel-promtov/index.html';
const talkAll = async p => { while (await p.$('#sheet:not([hidden]) .talk')) { await p.click('.talk'); await p.waitForTimeout(60); } };
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const m of LANG === 'ru' ? ['icon', 'cover'] : ['cover']) {
    const p = await b.newPage({ viewport: { width: m === 'icon' ? 512 : 800, height: m === 'icon' ? 512 : 470 } });
    await p.goto('file:///home/claude/zaklinatel-promtov/promo/_art.html#' + m + '-' + LANG); await p.waitForTimeout(300); await p.waitForFunction(() => document.title === 'done');
    await (await p.$('#c')).screenshot({ path: OUT + m + '.png' }); await p.close();
  }
  const shoot = async (name, viewport, scale, save, act) => {
    save = { ...save, ach: ['first', 'perfect', 'nohint', 'part1', 'part2', 'allstars', 'daily1', 'streak3', 'streak7'] }; // без всплывающих достижений на скриншотах
    const ctx = await b.newContext({ viewport, deviceScaleFactor: scale, hasTouch: viewport.width < viewport.height, isMobile: viewport.width < viewport.height });
    const p = await ctx.newPage();
    await p.goto(GAME);
    await p.evaluate(s => { localStorage.setItem('zaklinatel-save-v1', s[0]); localStorage.setItem('kodolesie-sound', 'off'); localStorage.setItem('kodolesie-lang', s[1]); }, [JSON.stringify(save), LANG]);
    await p.reload(); await p.waitForTimeout(800);
    await act(p); await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + name + '.png' }); await ctx.close();
  };
  const all = ['F','M','B','K','Q','Z','W','V','X','R','P','U','C','D','J'];
  const st = n => Object.fromEntries(all.slice(0, n).map((id, i) => [id, i % 4 ? 3 : 2]));
  const start = async p => { await p.click('#t-play'); await p.waitForTimeout(300); };
  const desk = { width: 1280, height: 720 }, phone = { width: 360, height: 640 };
  const sets = [
    ['desktop-1-forest', { v:3,ch:0,met:true,done:[],pos:{x:8,y:7},stars:{} }, async p => { await start(p); await p.keyboard.down('ArrowDown'); await p.waitForTimeout(80); await p.keyboard.up('ArrowDown'); await p.waitForTimeout(600); await talkAll(p); await p.waitForTimeout(200); await p.click('.card >> nth=0'); await p.click('.slot:nth-of-type(2) .card >> nth=1'); }],
    ['desktop-2-swamp', { v:3,ch:1,met:true,done:['F','M','B','K'],pos:{x:15,y:7},stars:st(4) }, async p => { await start(p); }],
    ['desktop-3-tower', { v:3,ch:2,met:true,done:['F','M','B','K','Q','Z','W','V'],pos:{x:9,y:3},stars:st(8) }, async p => { await start(p); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(80); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(400); }],
    ['desktop-4-lava', { v:3,ch:4,met:true,done:all.slice(0,13),pos:{x:9,y:5},stars:st(13) }, async p => { await start(p); }],
    ['desktop-5-snow', { v:3,ch:5,met:true,done:[...all,'E'],pos:{x:12,y:9},stars:st(15) }, async p => { await start(p); }],
    ['mobile-1-forest', { v:3,ch:0,met:true,done:[],pos:{x:8,y:7},stars:{} }, async p => { await start(p); const d = p.locator('#pad .d'); await d.dispatchEvent('pointerdown'); await p.waitForTimeout(150); await d.dispatchEvent('pointerup'); await p.waitForTimeout(600); }],
    ['mobile-2-city', { v:3,ch:3,met:true,done:all.slice(0,10),pos:{x:10,y:6},stars:st(10) }, async p => { await start(p); }],
    ['mobile-3-title', { v:3,ch:2,met:true,done:all.slice(0,6),pos:null,stars:st(6) }, async p => {}],
  ];
  for (const [name, save, act] of sets) await shoot(name, name.startsWith('desk') ? desk : phone, name.startsWith('desk') ? 1.5 : 3, save, act);
  await b.close();
})();
