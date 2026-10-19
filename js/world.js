// Карты глав и векторная отрисовка: мягкие формы, градиенты и свет вместо пикселей.
// Буквы карты: . трава, p тропа, T дерево, ~ вода, b место для моста, # скала,
// d тёмная пещера, G ворота, H дом, f туман, n фонарь (N — горящий), k кочка или ступень,
// m мираж, c ящики. Вода по теме главы может быть звёздной пропастью или лавой.
// Жители: A F M B (глава 1), S K Q Z (2), W V X (3), R P U (4), C D J (5),
// E I Y (6), L o y (7), a g z (8); на их месте трава или то, что указано в under.
window.World = (function () {
  const MAPS = [
    { theme: "forest", start: { x: 4, y: 11 }, under: { B: "d" }, rows: [
      "TTTTTTTTT~~TTTT#G#TT",
      "TH....T..~~.TTT#B#TT",
      "T.p......~~...##d##T",
      "T.p..T...~~...#ddd#T",
      "T.ppppp..~~...#d#d#T",
      "T.....p..~~...#ddd#T",
      "T..T..p..~~...##d##T",
      "T.....pppbbppppp.M.T",
      "T..T....F~~.......TT",
      "T........~~..T.....T",
      "T..A.....~~....T...T",
      "T........~~........T",
      "T..T.....~~...T....T",
      "T........~~........T",
      "TTTTTTTTT~~TTTTTTTTT",
    ] },
    { theme: "swamp", start: { x: 4, y: 12 }, under: {}, rows: [
      "TTTTTTTTTTTTTTTTTTTT",
      "TT~~~~~~~~~~~#G#~~TT",
      "T~~~~~~~~~~~~#Z#~~~T",
      "T~~~~~~~~~~~~...~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T.~~~~~~~~~~~~~~~~.T",
      "T.....n...ppppp.Q..T",
      "T..T....ppp...n..T.T",
      "TTTTTTffffTTTTTTTTTT",
      "T....npppp.N.T.....T",
      "T..S..p...K....T...T",
      "T....pp.......T....T",
      "T..T......T........T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
    { theme: "stars", start: { x: 4, y: 12 }, under: {}, rows: [
      "TTTTTTT#####TTTTTTTT",
      "TTTTTTT##G##TTTTTTTT",
      "T~~~~~~##X##~~~~~~~T",
      "T~~~~~~~...~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T.N....pppp....V..NT",
      "T..T..pp...T.......T",
      "TTTTTmmmTTTTTTTTTTTT",
      "T....ppp....T......T",
      "T..S.p...W.....T...T",
      "T....p.........N...T",
      "T..T......T........T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
    { theme: "city", start: { x: 4, y: 12 }, under: {}, rows: [
      "TTTTTTTTT#G#TTTTTTTT",
      "T.......N#U#N......T",
      "T..N.....ppp....N..T",
      "T.........p........T",
      "THHHHHHHHcccHHHHHHHT",
      "T....N...ppp...N...T",
      "T....P....p........T",
      "T~~~~~~~~~b~~~~~~~~T",
      "T.........p...R....T",
      "T..H..N..pp.....H..T",
      "T.H......p....N....T",
      "T..S..pppp.........T",
      "T....pp....H....H..T",
      "T.H.......N.....H..T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
    { theme: "lava", start: { x: 4, y: 12 }, under: {}, rows: [
      "TTTTTTTT##G##TTTTTTT",
      "T~~~~~~~#.J.#~~~~~~T",
      "T~~~~~~~#...#~~~~~~T",
      "T~~~~~~~##d##~~~~~~T",
      "T~~~~~~~~#d#~~~~~~~T",
      "T#.....D..p....#...T",
      "T~~~~~~~~~b~~~~~~~~T",
      "T~~~~~~~~~b~~~~~~~~T",
      "T.....N...p..C.....T",
      "T..#......p.....#..T",
      "T.....ppppp....N...T",
      "T..S..p.......#....T",
      "T....pp.....#......T",
      "T..#.......N....#..T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
    { theme: "snow", start: { x: 4, y: 12 }, under: {}, rows: [
      "TTTTTTTTT#G#TTTTTTTT",
      "T..T....##Y##...T..T",
      "T.......#...#......T",
      "T..N.....ppp.....N.T",
      "T~~~~~~~~~b~~~~~~~~T",
      "T~~~~~~~~~b~~~~~~~~T",
      "T....N....p....I...T",
      "T..T.....pp.....T..T",
      "T#########ccc######T",
      "T.......ppp........T",
      "T..H...pp...E...H..T",
      "T..S..pp...........T",
      "T....pp.....T......T",
      "T.T......N......T..T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
    { theme: "beach", start: { x: 4, y: 12 }, under: {}, rows: [
      "TT#G#TTTTTTTTTTTTTTT",
      "T~#y#~~~~~~~~~~~~~~T",
      "T~...~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~~~~~T",
      "T....o.pppppp..n...T",
      "T.n.......p.....T..T",
      "TTTTTTTTTffffTTTTTTT",
      "T....n...pp..N.....T",
      "T..H....pp...L...H.T",
      "T..S..ppp..........T",
      "T....pp.....T......T",
      "T.T......n.....T...T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
    { theme: "academy", start: { x: 4, y: 11 }, under: {}, rows: [
      "TTTT#####G#####TTTTT",
      "TTTT#H...z...H#TTTTT",
      "TTTT#....p....#TTTTT",
      "T~~~~~~~~b~~~~~~~~~T",
      "T..N.....p.....g.N.T",
      "T..T....pp.......T.T",
      "T.......p..........T",
      "THHHHHHccHHHHHHHHHHT",
      "T......pp.........NT",
      "T..N...p....a......T",
      "T..S..pp......H....T",
      "T....pp.....T......T",
      "T..T.......N....T..T",
      "T.....T.........H..T",
      "TTTTTTTTTTTTTTTTTTTT",
    ] },
  ];
  const THEMES = {
    forest: { grass: ["#9bd86f", "#6cbd58"], tuft: "rgba(40,110,45,.45)", water: ["#5ab8f0", "#3d9be0"], bank: "#ecd9a4",
      leaf: ["#2e8b47", "#3fa956", "#4bb862"], flowers: ["#ffffff", "#ffd54f", "#ff9ec4"] },
    swamp: { grass: ["#8fbf7c", "#4f8a63"], tuft: "rgba(30,80,50,.5)", water: ["#6aa58a", "#3f7a66"], bank: "#a9b97c",
      leaf: ["#245e4f", "#327a64", "#3f8f74"], flowers: ["#e8f5a0", "#c9b6ff", "#ffffff"], lily: true, fireflies: true },
    stars: { grass: ["#5b5aa8", "#36357a"], tuft: "rgba(180,170,255,.35)", water: ["#1c1946", "#0e0c2a"], bank: "#8c86d6",
      leaf: ["#7a3fa8", "#a457c9", "#d27fe6"], trunk: "#4b3566", flowers: ["#bfe9ff", "#ffd1f3", "#fff6b0"],
      void: true, kStyle: "star", lampGlass: "#e6d8ff", lamp: "rgba(190,160,255,.55)", path: ["#8f86d9", "#b8b0f0"], rock: ["#8a7fd0", "#5a4f9c", "#3a3270"], fireflies: true },
    city: { grass: ["#cfd6dd", "#aeb8c4"], stone: true, lampGlass: "#ffe7a0", water: ["#5fc3d6", "#3a9fbf"], bank: "#8b97a6",
      leaf: ["#3f9c5a", "#55b56d", "#7ccb86"], roofs: [["#ff7a5c", "#d9483a"], ["#5c8dff", "#3a63d6"], ["#ffc04d", "#e08a1f"], ["#6fcf97", "#3c9d68"]],
      path: ["#c9a876", "#e3c899"], lamp: "rgba(255,220,140,.5)" },
    lava: { grass: ["#5a4a52", "#2f262c"], stone: true, lampGlass: "#ffb070", water: ["#ff8a2a", "#d8461a"], bank: "#3a2d30", lavaGlow: true,
      leaf: ["#3c2f34", "#55424a", "#6e5560"], trunk: "#2a2024", path: ["#7d6a5c", "#a08a77"], bridge: "stone",
      rock: ["#6e6370", "#4a4050", "#2c2530"], lamp: "rgba(255,150,80,.5)", embers: true },
    snow: { grass: ["#eef6ff", "#cddff0"], tuft: "rgba(110,150,200,.3)", water: ["#a6e1f5", "#6cc0e6"], bank: "#ffffff",
      leaf: ["#2f6b5a", "#3b7d69", "#4a9079"], trunk: "#6b4a33", flowers: ["#ffffff", "#dff1ff", "#c7e6ff"], snow: true,
      path: ["#c3d4e8", "#dbe7f4"], lamp: "rgba(200,230,255,.5)", lampGlass: "#e0f4ff", rock: ["#d5e2f0", "#a7b9cf", "#7d90a8"] },
    beach: { grass: ["#f6e3a8", "#e8c983"], tuft: "rgba(160,130,60,.3)", water: ["#47c4ea", "#2186cc"], bank: "#fff4d2",
      leaf: ["#2f9a5a", "#3fb46a", "#6fd08a"], flowers: ["#ffb3c7", "#ffffff", "#ffd27a"], kStyle: "stone",
      path: ["#d4ae72", "#e6c891"], lamp: "rgba(255,230,150,.55)", lampGlass: "#fff1b0", rock: ["#c9b79a", "#9c8a70", "#6e6050"],
      roofs: [["#4fb3e8", "#2a86c4"], ["#ffffff", "#d8e4ee"]] },
    academy: { grass: ["#c5d67a", "#93b257"], tuft: "rgba(90,110,40,.35)", water: ["#5ab8f0", "#3d9be0"], bank: "#d9cfb8",
      leaf: ["#d9622b", "#ee8f3a", "#f6c453"], flowers: ["#ffffff", "#ff9ec4", "#ffd54f"], books: true, leaves: true, bridge: "stone",
      rock: ["#e0cfb4", "#b59e80", "#7d6a58"], roofs: [["#8a5cd6", "#6a3fb8"], ["#d9483a", "#b3352a"]], lampGlass: "#ffe7a0", lamp: "rgba(255,220,140,.5)" },
  };
  const TS = 48, W = 20, H = 15, CHAPTERS = MAPS.length;
  const NPC = "AFMBSKQZWVXRPUCDJEIYLoyagz";
  const SOLID = new Set(["T", "~", "#", "H", "b", "d", "G", "f", "n", "N", "m", "c"]);
  const WATER = new Set(["~", "b", "=", "k"]);
  const PATHS = new Set(["p", "="]);
  const CAVE = new Set(["#", "d", "l", "G", "O"]);

  function build(ch = 0) {
    const m = MAPS[ch];
    const grid = m.rows.map(r => r.split(""));
    const npcs = {};
    grid.forEach((row, y) => row.forEach((c, x) => {
      if (NPC.includes(c)) { npcs[c] = { x, y, id: c }; row[x] = m.under[c] || "."; }
    }));
    return { grid, npcs, start: { ...m.start }, theme: THEMES[m.theme] };
  }

  const rnd = (x, y, k) => ((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) >>> 0;
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function ellipse(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function radial(ctx, x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }

  // ---------- Земля: трава, тропы, вода, камень ----------
  function drawGround(ctx, grid, t, th) {
    const at = (x, y) => (grid[y] && grid[y][x]) || "T";
    const wet = (x, y) => x < 0 || y < 0 || x >= W || y >= H || WATER.has(grid[y][x]);
    const g = ctx.createLinearGradient(0, 0, W * TS, H * TS);
    g.addColorStop(0, th.grass[0]); g.addColorStop(1, th.grass[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * TS, H * TS);

    // Пятна света и тени на траве, кустики и цветы.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (WATER.has(c) || CAVE.has(c)) continue;
      const X = x * TS, Y = y * TS, r = rnd(x, y, 1);
      if (th.stone) {
        // Мощёная площадь: плиты чуть разного оттенка.
        rr(ctx, X + 2, Y + 2, TS - 4, TS - 4, 8);
        ctx.fillStyle = r % 3 === 0 ? "rgba(255,255,255,.10)" : r % 3 === 1 ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.04)"; ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1.5; ctx.stroke();
        continue;
      }
      ellipse(ctx, X + r % TS, Y + (r >> 7) % TS, 22, 12, r % 2 ? "rgba(255,255,230,.10)" : "rgba(30,90,40,.08)");
      if (c !== "." && c !== "T") continue;
      ctx.strokeStyle = th.tuft; ctx.lineWidth = 2; ctx.lineCap = "round";
      const tx = X + 8 + rnd(x, y, 2) % 30, ty = Y + 14 + rnd(x, y, 3) % 26;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 2, ty - 6, tx - 4, ty - 9);
      ctx.moveTo(tx + 3, ty); ctx.quadraticCurveTo(tx + 4, ty - 7, tx + 7, ty - 10); ctx.stroke();
      const f = rnd(x, y, 4) % 7;
      if (f < 2 && c === ".") {
        const fx = X + 10 + rnd(x, y, 5) % 28, fy = Y + 10 + rnd(x, y, 6) % 28, col = th.flowers[rnd(x, y, 7) % 3];
        for (let i = 0; i < 5; i++) circle(ctx, fx + Math.cos(i * 1.26) * 3.5, fy + Math.sin(i * 1.26) * 3.5, 3, col);
        circle(ctx, fx, fy, 2.4, "#f4a62a");
      }
    }

    // Вода с берегами, бликами и кувшинками.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!WATER.has(grid[y][x])) continue;
      const X = x * TS, Y = y * TS;
      const wg = ctx.createLinearGradient(X, 0, X + TS, 0);
      const left = !wet(x - 1, y), right = !wet(x + 1, y), top = !wet(x, y - 1), bottom = !wet(x, y + 1);
      wg.addColorStop(0, left ? th.water[0] : th.water[1]); wg.addColorStop(1, right ? th.water[0] : th.water[1]);
      ctx.fillStyle = wg; ctx.fillRect(X, Y, TS, TS);
      if (th.void) {
        // Звёздная пропасть: мерцающие звёзды вместо волн.
        for (let k = 0; k < 3; k++) {
          const a = .3 + .7 * Math.abs(Math.sin(t / 700 + rnd(x, y, k + 40)));
          circle(ctx, X + rnd(x, y, k + 41) % TS, Y + rnd(x, y, k + 44) % TS, 1 + (k === 0) * 1.2, `rgba(255,255,255,${a})`);
        }
      } else {
        ctx.strokeStyle = th.lavaGlow ? "rgba(255,230,120,.75)" : "rgba(255,255,255,.4)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
        for (let k = 0; k < 2; k++) {
          const wy = Y + ((t / (th.lavaGlow ? 90 : 30) + rnd(x, y, k + 8) % TS + k * 24) % TS);
          const wx = X + 8 + rnd(x, y, k + 10) % 24;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 5, wy + 3, wx + 10, wy); ctx.stroke();
        }
        if (th.lavaGlow && rnd(x, y, 50) % 3 === 0) {
          const ph = (t / 1500 + rnd(x, y, 51) % 100 / 100) % 1;
          circle(ctx, X + 10 + rnd(x, y, 52) % 28, Y + 10 + rnd(x, y, 53) % 28, 2 + ph * 5, `rgba(255,220,120,${.8 * (1 - ph)})`);
        }
      }
      if (th.lily && grid[y][x] === "~" && rnd(x, y, 14) % 4 === 0) {
        const lx = X + 12 + rnd(x, y, 15) % 24, ly = Y + 12 + rnd(x, y, 16) % 24, a = rnd(x, y, 17) % 6;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, 8, a + .5, a + Math.PI * 2 - .2); ctx.closePath();
        ctx.fillStyle = "#5fae5a"; ctx.fill();
        if (rnd(x, y, 18) % 3 === 0) circle(ctx, lx + 2, ly - 1, 3, "#ffb3d1");
      }
      const foam = th.void || th.lavaGlow ? 0 : .55 + Math.sin(t / 500 + y) * .2;
      if (left) { ctx.fillStyle = th.bank; ctx.fillRect(X - 4, Y, 8, TS); ctx.fillStyle = `rgba(255,255,255,${foam})`; ctx.fillRect(X + 4, Y, 3, TS); }
      if (right) { ctx.fillStyle = th.bank; ctx.fillRect(X + TS - 4, Y, 8, TS); ctx.fillStyle = `rgba(255,255,255,${foam})`; ctx.fillRect(X + TS - 7, Y, 3, TS); }
      if (top) { ctx.fillStyle = th.bank; ctx.fillRect(X, Y - 4, TS, 8); ctx.fillStyle = `rgba(255,255,255,${foam})`; ctx.fillRect(X, Y + 4, TS, 3); }
      if (bottom) { ctx.fillStyle = th.bank; ctx.fillRect(X, Y + TS - 4, TS, 8); ctx.fillStyle = `rgba(255,255,255,${foam})`; ctx.fillRect(X, Y + TS - 7, TS, 3); }
      // Кочка: мшистый островок, по которому можно пройти.
      if (grid[y][x] === "k" && th.kStyle === "star") {
        // Звёздная ступень: парящая светящаяся платформа.
        const fy = Math.sin(t / 400 + y) * 2;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = radial(ctx, X + 24, Y + 24 + fy, 34, [[0, "rgba(255,230,140,.5)"], [1, "rgba(255,230,140,0)"]]);
        ctx.fillRect(X - 10, Y - 10, 68, 68); ctx.restore();
        ellipse(ctx, X + 24, Y + 26 + fy, 19, 10, "#ffd76a");
        ellipse(ctx, X + 24, Y + 23 + fy, 16, 7, "#fff2b8");
        ctx.save(); ctx.translate(X + 24, Y + 23 + fy); ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? 2.5 : 6; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2 * .6); }
        ctx.closePath(); ctx.fillStyle = "#ffb92e"; ctx.fill(); ctx.restore();
      } else if (grid[y][x] === "k" && th.kStyle === "stone") {
        // Камень в море: по таким перебираются на скалу.
        ellipse(ctx, X + 24, Y + 31, 20, 9, "rgba(0,40,80,.3)");
        ellipse(ctx, X + 24, Y + 26, 19, 12, "#9c8f84");
        ellipse(ctx, X + 24, Y + 23, 16, 9, "#bfb3a6");
        ellipse(ctx, X + 18, Y + 20, 5, 2.5, "rgba(255,255,255,.35)");
      } else if (grid[y][x] === "k") {
        ellipse(ctx, X + 24, Y + 30, 20, 11, "rgba(20,50,40,.3)");
        ellipse(ctx, X + 24, Y + 26, 19, 12, "#6b8a3e");
        ellipse(ctx, X + 24, Y + 23, 16, 9, "#8fb556");
        ellipse(ctx, X + 18, Y + 20, 5, 2.5, "rgba(255,255,255,.25)");
      }
    }

    // Тропы: круги и перемычки к соседям дают плавную извилистую дорожку.
    const pathPass = (col, pad) => {
      ctx.fillStyle = col;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (grid[y][x] !== "p") continue;
        const cx = x * TS + TS / 2, cy = y * TS + TS / 2, r = TS / 2 - pad;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        if (PATHS.has(at(x + 1, y)) || CAVE.has(at(x + 1, y))) ctx.fillRect(cx, cy - r, TS, r * 2);
        if (PATHS.has(at(x, y + 1)) || at(x, y + 1) === "d" || at(x, y + 1) === "l") ctx.fillRect(cx - r, cy, r * 2, TS);
        if (CAVE.has(at(x, y - 1))) ctx.fillRect(cx - r, cy - TS, r * 2, TS);
        // Широкая тропа: заполняем середину квадрата из четырёх клеток.
        if (at(x + 1, y) === "p" && at(x, y + 1) === "p" && at(x + 1, y + 1) === "p") ctx.fillRect(cx, cy, TS, TS);
      }
    };
    const pc = th.path || ["#d9b878", "#efd8a4"];
    pathPass(pc[0], 4); pathPass(pc[1], 8);

    // Мост.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x] !== "=") continue;
      // Мост поворачивается поперёк воды: если вода слева и справа, по нему идут вертикально.
      const vertical = wet(x - 1, y) && wet(x + 1, y);
      const stone = th.bridge === "stone", c1 = stone ? "#8a7f86" : "#c48b4f", c2 = stone ? "#766b73" : "#b47c42", rail = stone ? "#5a5058" : "#8a5a2b";
      ctx.save(); ctx.translate(x * TS + TS / 2, y * TS + TS / 2); if (vertical) ctx.rotate(Math.PI / 2); ctx.translate(-TS / 2, -TS / 2);
      ctx.fillStyle = "rgba(0,40,80,.25)"; ctx.fillRect(0, 12, TS, 30);
      for (let i = 0; i < 6; i++) { rr(ctx, i * 8 + .5, 8, 7, 32, 2); ctx.fillStyle = i % 2 ? c1 : c2; ctx.fill(); }
      rr(ctx, -2, 4, TS + 4, 6, 3); ctx.fillStyle = rail; ctx.fill();
      rr(ctx, -2, 38, TS + 4, 6, 3); ctx.fill();
      ctx.restore();
    }

    // Каменная пещера, тьма и освещённый пол.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x], X = x * TS, Y = y * TS;
      if (c === "d" || c === "l" || c === "G" || c === "O") {
        ctx.fillStyle = c === "l" ? radial(ctx, X + 24, Y + 24, 40, [[0, "#a58aa8"], [1, "#7d6488"]]) : "#14101f";
        ctx.fillRect(X, Y, TS, TS);
        if (c === "d" && rnd(x, y, 11) % 3 === 0 && Math.sin(t / 700 + x * 3) > -.6) {
          const ex = X + 12 + rnd(x, y, 12) % 18, ey = Y + 14 + rnd(x, y, 13) % 18;
          circle(ctx, ex, ey, 2.5, "#c77dff"); circle(ctx, ex + 8, ey, 2.5, "#c77dff");
        }
      }
      if (c === "#") {
        const rk = th.rock || ["#a49cb8", "#6e6684", "#4a4258"];
        ctx.fillStyle = rk[2]; ctx.fillRect(X, Y, TS, TS);
        rr(ctx, X + 2, Y + 2, TS - 4, TS - 4, 12);
        const sg = ctx.createLinearGradient(X, Y, X, Y + TS); sg.addColorStop(0, rk[0]); sg.addColorStop(1, rk[1]);
        ctx.fillStyle = sg; ctx.fill();
        ellipse(ctx, X + 16, Y + 12, 9, 4, "rgba(255,255,255,.22)");
      }
    }
  }

  // ---------- Объекты с глубиной: деревья, дом, ворота, факелы ----------
  function drawTree(ctx, x, y, t, th) {
    const cx = x * TS + TS / 2, by = y * TS + TS - 2, sway = Math.sin(t / 1200 + x * .7 + y) * 1.5;
    ellipse(ctx, cx + 4, by - 2, 20, 7, "rgba(20,60,30,.28)");
    rr(ctx, cx - 5, by - 22, 10, 20, 4); ctx.fillStyle = th.trunk || "#8a5a33"; ctx.fill();
    const big = 0.9 + (rnd(x, y, 20) % 30) / 100;
    const blob = (dx, dy, r, c) => circle(ctx, cx + dx * big + sway, by + dy * big, r * big, c);
    const [l0, l1, l2] = th.leaf;
    blob(-13, -26, 15, l0); blob(13, -26, 15, l0); blob(0, -38, 20, l0);
    blob(-10, -30, 12, l1); blob(8, -32, 13, l1); blob(-2, -42, 14, l2);
    blob(-6, -46, 6, "rgba(255,255,255,.22)");
    if (th.snow) { blob(-1, -48, 12, "#f4faff"); blob(-12, -34, 7, "#eaf4ff"); blob(11, -35, 7, "#eaf4ff"); }
  }
  function drawHouse(ctx, x, y, th) {
    const roof = th.roofs ? th.roofs[rnd(x, y, 60) % th.roofs.length] : ["#ff7a5c", "#d9483a"];
    const X = x * TS, Y = y * TS;
    ellipse(ctx, X + 26, Y + 44, 26, 6, "rgba(20,60,30,.25)");
    rr(ctx, X + 4, Y + 18, 40, 26, 4); ctx.fillStyle = "#fbefd8"; ctx.fill();
    rr(ctx, X + 30, Y - 2, 8, 14, 2); ctx.fillStyle = "#b9634b"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(X - 2, Y + 22); ctx.quadraticCurveTo(X + 24, Y - 14, X + 50, Y + 22); ctx.closePath();
    const rg = ctx.createLinearGradient(X, Y, X, Y + 22); rg.addColorStop(0, roof[0]); rg.addColorStop(1, roof[1]);
    ctx.fillStyle = rg; ctx.fill();
    rr(ctx, X + 20, Y + 28, 10, 16, [5, 5, 0, 0]); ctx.fillStyle = "#8a5a33"; ctx.fill();
    rr(ctx, X + 8, Y + 26, 9, 9, 3); ctx.fillStyle = "#ffe08a"; ctx.fill();
  }
  function drawGate(ctx, x, y, open, t) {
    const X = x * TS, Y = y * TS;
    rr(ctx, X + 4, Y + 4, 40, 44, [20, 20, 0, 0]); ctx.fillStyle = "#3a3448"; ctx.fill();
    if (open) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = radial(ctx, X + 24, Y + 28, 40 + Math.sin(t / 300) * 4, [[0, "rgba(255,250,220,1)"], [.5, "rgba(255,220,120,.6)"], [1, "rgba(255,200,80,0)"]]);
      ctx.fillRect(X - 20, Y - 20, 88, 88); ctx.restore();
    } else {
      ctx.strokeStyle = "#b8b0cc"; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + 12 + i * 8, Y + 10); ctx.lineTo(X + 12 + i * 8, Y + 48); ctx.stroke(); }
      circle(ctx, X + 24, Y + 30, 4, "#ffc94a");
    }
  }
  function drawTorch(ctx, x, y, t) {
    const X = x * TS + 10, Y = y * TS + 14, f = Math.sin(t / 90 + x * 5) * 1.5;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = radial(ctx, X, Y, 46 + f * 2, [[0, "rgba(255,200,100,.55)"], [1, "rgba(255,160,60,0)"]]);
    ctx.fillRect(X - 50, Y - 50, 100, 100); ctx.restore();
    rr(ctx, X - 2, Y + 2, 4, 16, 2); ctx.fillStyle = "#6b4423"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(X, Y - 10 - f); ctx.quadraticCurveTo(X + 7, Y, X, Y + 4); ctx.quadraticCurveTo(X - 7, Y, X, Y - 10 - f);
    ctx.fillStyle = "#ff9a3c"; ctx.fill();
    ellipse(ctx, X, Y - 1, 2.5, 4, "#fff3b0");
  }

  // Туман: клубы, которые медленно дышат.
  function drawFog(ctx, x, y, t) {
    const X = x * TS + TS / 2, Y = y * TS + TS / 2;
    for (let i = 0; i < 4; i++) {
      const a = t / 1400 + i * 1.7 + x, r = 22 + (i % 2) * 6;
      ctx.fillStyle = radial(ctx, X + Math.cos(a) * 12, Y + Math.sin(a) * 8 - 6, r * 1.4, [[0, "rgba(240,248,245,.85)"], [1, "rgba(240,248,245,0)"]]);
      ctx.fillRect(X - 60, Y - 60, 120, 120);
    }
  }
  function drawLantern(ctx, x, y, lit, t, th) {
    const X = x * TS + TS / 2, Y = y * TS + 14;
    ellipse(ctx, X + 3, Y + 30, 10, 4, "rgba(20,50,40,.3)");
    if (lit) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = radial(ctx, X, Y, 60 + Math.sin(t / 400 + x) * 4, [[0, th.lamp || "rgba(180,255,160,.55)"], [1, "rgba(0,0,0,0)"]]);
      ctx.fillRect(X - 64, Y - 64, 128, 128); ctx.restore();
    }
    rr(ctx, X - 2, Y + 4, 4, 28, 2); ctx.fillStyle = "#4b4038"; ctx.fill();
    rr(ctx, X - 9, Y - 10, 18, 18, 7); ctx.fillStyle = lit ? th.lampGlass || "#c9ff9e" : "#7d8f86"; ctx.fill();
    ctx.strokeStyle = "#3a332d"; ctx.lineWidth = 2; ctx.stroke();
    ellipse(ctx, X, Y - 12, 10, 3.5, "#3a332d");
    if (lit) ellipse(ctx, X, Y - 1, 3.5, 5, "#fffbe0");
  }
  // Мираж: дорога, которая дрожит и переливается, но её на самом деле нет.
  function drawMirage(ctx, x, y, t) {
    const X = x * TS, Y = y * TS;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const dx = Math.sin(t / 300 + i * 2 + x) * 4, hue = (t / 20 + x * 40 + i * 60) % 360;
      ctx.globalAlpha = .35;
      rr(ctx, X + 4 + dx, Y + 6 + i * 12, TS - 8, 10, 5); ctx.fillStyle = `hsl(${hue},90%,75%)`; ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const sx = X + rnd(x, y, 70 + i) % TS, sy = Y + rnd(x, y, 75 + i) % TS, a = Math.max(0, Math.sin(t / 250 + i * 1.7 + x));
      circle(ctx, sx, sy, 2.2, `rgba(255,255,255,${a})`);
    }
    ctx.restore();
  }
  function drawCrates(ctx, x, y, th) {
    const X = x * TS, Y = y * TS;
    ellipse(ctx, X + 26, Y + 44, 22, 5, "rgba(0,0,0,.2)");
    if (th.snow) {
      // Сугроб: мягкие белые бугры с голубой тенью.
      for (const [dx, dy, r] of [[12, 34, 14], [34, 34, 14], [23, 22, 16]]) {
        circle(ctx, X + dx, Y + dy + 2, r, "#bcd3ea"); circle(ctx, X + dx, Y + dy, r, "#ffffff");
      }
      ellipse(ctx, X + 18, Y + 14, 6, 3, "rgba(200,225,255,.8)");
      return;
    }
    if (th.books) {
      // Стопки книг разных цветов.
      const cols = ["#d9483a", "#3f6fd8", "#3c9d68", "#f0a830", "#8a5cd6"];
      [[4, 6], [26, 4]].forEach(([bx, n], s) => {
        for (let i = 0; i < n; i++) {
          const w = 18 + rnd(x, y, 80 + i + s * 9) % 6;
          rr(ctx, X + bx + (i % 2) * 2, Y + 40 - (i + 1) * 6, w, 6, 2); ctx.fillStyle = cols[(i + s * 2 + x) % cols.length]; ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(X + bx + (i % 2) * 2 + 3, Y + 42 - (i + 1) * 6, w - 6, 1.5);
        }
      });
      return;
    }
    const box = (bx, by, w, h) => {
      rr(ctx, bx, by, w, h, 4); ctx.fillStyle = "#c98d4f"; ctx.fill();
      ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + 3, by + 3); ctx.lineTo(bx + w - 3, by + h - 3); ctx.stroke();
      rr(ctx, bx + w / 2 - 5, by + 4, 10, 4, 2); ctx.fillStyle = "#fff3d6"; ctx.fill();
    };
    box(X + 4, Y + 20, 24, 24); box(X + 24, Y + 24, 20, 20); box(X + 12, Y + 2, 22, 20);
  }
  function drawFireflies(ctx, t, th) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 16; i++) {
      let fx = (rnd(i, 1, 30) % (W * TS)) + Math.sin(t / 1700 + i) * 40, fy = (rnd(i, 2, 31) % (H * TS)) + Math.cos(t / 1300 + i * 2) * 30;
      // Искры над лавой поднимаются вверх и гаснут.
      if (th.embers) fy = H * TS - ((t / 25 + rnd(i, 3, 32)) % (H * TS));
      const a = .4 + .4 * Math.sin(t / 300 + i * 3), col = th.embers ? "255,170,80" : th.void ? "220,200,255" : "230,255,150";
      ctx.fillStyle = radial(ctx, fx, fy, 9, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]);
      ctx.fillRect(fx - 9, fy - 9, 18, 18);
    }
    ctx.restore();
  }
  // Снегопад или листопад: хлопья и листья медленно падают и кружатся.
  function drawWeather(ctx, t, th) {
    for (let i = 0; i < 22; i++) {
      const fy = (t / (th.snow ? 28 : 40) + rnd(i, 4, 33)) % (H * TS + 40) - 20;
      const fx = rnd(i, 5, 34) % (W * TS) + Math.sin(t / 900 + i) * 24;
      if (th.snow) { circle(ctx, fx, fy, 1.8 + i % 3, "rgba(255,255,255,.85)"); continue; }
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(t / 600 + i);
      ellipse(ctx, 0, 0, 6, 3, th.leaf[i % 3]); ctx.restore();
    }
  }

  // ---------- Персонажи в стиле «чиби» ----------
  const LOOKS = {
    hero: { skin: "#ffd8b8", body: "#6c4ff5", body2: "#5136d6" },
    A: { skin: "#ffd8b8", body: "#4fae6d", body2: "#3d9058" },
    F: { skin: "#f2c39b", body: "#3f86e8", body2: "#2f6cc4" },
    M: { skin: "#f2c39b", body: "#8a8fa3", body2: "#6d7286" },
    B: { skin: "#4a2a5e", body: "#5b1f4a", body2: "#3d1233" },
    S: { skin: "#9ff7d6", body: "#7cf5c8", body2: "#4fd4a8" },
    K: { skin: "#d9f0c9", body: "#3d8a78", body2: "#2a6657" },
    Q: { skin: "#7fd36b", body: "#7fd36b", body2: "#5cb04c" },
    W: { skin: "#b98a5e", body: "#a0724a", body2: "#7d5536" },
    V: { skin: "#ffd8b8", body: "#3b3f9e", body2: "#272a78" },
    R: { skin: "#cfd8e3", body: "#aab6c6", body2: "#8593a8" },
    P: { skin: "#f2c39b", body: "#3f6fd8", body2: "#2c55b0" },
    C: { skin: "#ffd8b8", body: "#9aa3b5", body2: "#737c90" },
    D: { skin: "#f2c39b", body: "#e07a3a", body2: "#b85d26" },
    E: { skin: "#ffd8b8", body: "#2fb5a8", body2: "#21918a" },
    I: { skin: "#f2c39b", body: "#ff9a3c", body2: "#e07a1f" },
    L: { skin: "#f2c39b", body: "#2c4f9e", body2: "#1d3a7a" },
    o: { skin: "#c58af0", body: "#b072e8", body2: "#8a4fcf" },
    a: { skin: "#ffd8b8", body: "#e2475b", body2: "#c03045" },
    g: { skin: "#f2c39b", body: "#8a5a33", body2: "#6b4423" },
    Y: { skin: "#e9e6f5", body: "#e9e6f5", body2: "#c9c2e6" },
  };
  const ALIAS = { Z: "B", X: "B", U: "B", J: "B", y: "Y", z: "Y" };
  function drawCharacter(ctx, id, cx, by, t, o = {}) {
    id = ALIAS[id] || id;
    const s = (o.scale || 1) * (id === "B" ? 1.2 : id === "Y" ? 1.1 : 1), L = LOOKS[id];
    const b = o.walk ? Math.abs(Math.sin(t / 85)) * 4 : Math.sin(t / 500 + cx) * 1.2;
    const look = o.flip ? -1 : 1;
    ctx.save(); ctx.translate(cx, by); ctx.scale(s, s);
    if (!o.portrait) ellipse(ctx, 0, -2, 14, 5, "rgba(20,40,30,.28)");

    if (id === "B") {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = radial(ctx, 0, -30, 40 + Math.sin(t / 250) * 4, [[0, "rgba(180,60,200,.35)"], [1, "rgba(120,20,140,0)"]]);
      ctx.fillRect(-50, -80, 100, 90); ctx.restore();
    }
    if (id === "S") {
      const fy = Math.sin(t / 300) * 4;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = radial(ctx, 0, -28 + fy, 34, [[0, "rgba(124,245,200,.6)"], [1, "rgba(124,245,200,0)"]]);
      ctx.fillRect(-40, -70, 80, 80); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-16, -10 + fy); ctx.quadraticCurveTo(-18, -46 + fy, 0, -48 + fy); ctx.quadraticCurveTo(18, -46 + fy, 16, -10 + fy);
      ctx.quadraticCurveTo(10, -4 + fy, 6, -10 + fy); ctx.quadraticCurveTo(0, -4 + fy, -6, -10 + fy); ctx.quadraticCurveTo(-10, -4 + fy, -16, -10 + fy);
      ctx.fillStyle = "#b8ffe6"; ctx.fill();
      ellipse(ctx, -5, -30 + fy, 2.6, 3.6, "#1d4d45"); ellipse(ctx, 5, -30 + fy, 2.6, 3.6, "#1d4d45");
      ctx.restore(); return;
    }

    if (id === "W") {
      // Сова: круглое пёрышко-тело, большие глаза и очки библиотекаря.
      const g = ctx.createLinearGradient(0, -48 - b, 0, -2); g.addColorStop(0, L.body); g.addColorStop(1, L.body2);
      if (!o.portrait) { ellipse(ctx, -6, -3, 5, 3, "#f0a830"); ellipse(ctx, 6, -3, 5, 3, "#f0a830"); }
      ellipse(ctx, 0, -24 - b, 17, 21, g);
      ellipse(ctx, 0, -16 - b, 10, 11, "#e8d2b0");
      ctx.beginPath(); ctx.moveTo(-14, -38 - b); ctx.lineTo(-11, -50 - b); ctx.lineTo(-5, -41 - b); ctx.fillStyle = L.body2; ctx.fill();
      ctx.beginPath(); ctx.moveTo(14, -38 - b); ctx.lineTo(11, -50 - b); ctx.lineTo(5, -41 - b); ctx.fill();
      for (const sx of [-7, 7]) {
        circle(ctx, sx, -32 - b, 7, "#fff8e6");
        circle(ctx, sx + look, -32 - b, 3.6, "#2a1d1a"); circle(ctx, sx + look + 1.2, -33.4 - b, 1.1, "#fff");
      }
      ctx.strokeStyle = "#5a4030"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-7, -32 - b, 8, 0, 7); ctx.moveTo(15, -32 - b); ctx.arc(7, -32 - b, 8, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -26 - b); ctx.lineTo(3, -26 - b); ctx.lineTo(0, -21 - b); ctx.closePath(); ctx.fillStyle = "#f0a830"; ctx.fill();
      ctx.restore(); return;
    }
    if (id === "R") {
      // Робот: корпус-коробка, экран с глазами и антенна с огоньком.
      if (!o.portrait) { rr(ctx, -10, -8, 7, 6, 2); ctx.fillStyle = "#5d6878"; ctx.fill(); rr(ctx, 3, -8, 7, 6, 2); ctx.fill(); }
      const g = ctx.createLinearGradient(0, -30 - b, 0, -4 - b); g.addColorStop(0, L.body); g.addColorStop(1, L.body2);
      rr(ctx, -13, -30 - b, 26, 24, 6); ctx.fillStyle = g; ctx.fill();
      circle(ctx, -5, -20 - b, 2.5, "#ff6b6b"); circle(ctx, 2, -20 - b, 2.5, "#ffd54f"); circle(ctx, 9 - 9, -13 - b, 2.5, "#4fd1c5");
      rr(ctx, -15, -56 - b, 30, 24, 8); ctx.fillStyle = L.skin; ctx.fill();
      rr(ctx, -11, -52 - b, 22, 15, 5); ctx.fillStyle = "#1d2a3a"; ctx.fill();
      const blink = Math.sin(t / 900 + cx) > .97 ? 1 : 4;
      rr(ctx, -7 + look * 1.5, -47 - b, 4, blink, 2); ctx.fillStyle = "#7cf5c8"; ctx.fill();
      rr(ctx, 3 + look * 1.5, -47 - b, 4, blink, 2); ctx.fill();
      ctx.strokeStyle = "#8593a8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -56 - b); ctx.lineTo(0, -63 - b); ctx.stroke();
      circle(ctx, 0, -65 - b, 3.2, Math.sin(t / 300) > 0 ? "#ff6b6b" : "#ffb3b3");
      ctx.restore(); return;
    }
    if (id === "Y") {
      // Копирус: живой листок бумаги, за которым всегда тянется его бледная копия.
      const fy = Math.sin(t / 350) * 3;
      for (const [dx, a] of [[9, .35], [0, 1]]) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(dx * look, -dx * .5);
        ctx.beginPath(); ctx.moveTo(-15, -8 + fy); ctx.lineTo(-15, -52 + fy); ctx.lineTo(7, -52 + fy); ctx.lineTo(15, -44 + fy); ctx.lineTo(15, -8 + fy);
        ctx.quadraticCurveTo(10, -2 + fy, 5, -8 + fy); ctx.quadraticCurveTo(0, -2 + fy, -5, -8 + fy); ctx.quadraticCurveTo(-10, -2 + fy, -15, -8 + fy);
        ctx.closePath(); ctx.fillStyle = L.body; ctx.fill(); ctx.strokeStyle = "#9a92c0"; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, -52 + fy); ctx.lineTo(7, -44 + fy); ctx.lineTo(15, -44 + fy); ctx.closePath(); ctx.fillStyle = L.body2; ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = "#b8b0dc"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (const ly of [-22, -16]) { ctx.beginPath(); ctx.moveTo(-9, ly + fy); ctx.lineTo(9, ly + fy); ctx.stroke(); }
      ellipse(ctx, -5 + look, -36 + fy, 2.8, 3.8, "#3a2f6a"); ellipse(ctx, 5 + look, -36 + fy, 2.8, 3.8, "#3a2f6a");
      circle(ctx, -4 + look, -37.4 + fy, 1, "#fff"); circle(ctx, 6 + look, -37.4 + fy, 1, "#fff");
      circle(ctx, look, -28 + fy, 2.4, "#6a5aa8");
      ellipse(ctx, -10, -30 + fy, 3, 2, "rgba(255,120,160,.35)"); ellipse(ctx, 10, -30 + fy, 3, 2, "rgba(255,120,160,.35)");
      ctx.restore(); return;
    }
    if (id === "o") {
      // Осьминог: круглая голова, щупальца шевелятся.
      if (!o.portrait) {
        ctx.strokeStyle = L.body2; ctx.lineWidth = 5; ctx.lineCap = "round";
        for (let i = 0; i < 5; i++) {
          const ax = -12 + i * 6;
          ctx.beginPath(); ctx.moveTo(ax, -14 - b); ctx.quadraticCurveTo(ax + Math.sin(t / 300 + i) * 6, -6, ax + (i - 2) * 3, -3); ctx.stroke();
        }
      }
      const g = ctx.createLinearGradient(0, -50 - b, 0, -12 - b); g.addColorStop(0, L.body); g.addColorStop(1, L.body2);
      ellipse(ctx, 0, -30 - b, 17, 19, g);
      ellipse(ctx, -6, -42 - b, 5, 3, "rgba(255,255,255,.25)");
      for (const sx of [-6, 6]) {
        circle(ctx, sx, -30 - b, 5, "#fff");
        circle(ctx, sx + look * 1.2, -30 - b, 2.6, "#2a1d3a"); circle(ctx, sx + look * 1.2 + 1, -31 - b, .9, "#fff");
      }
      ctx.strokeStyle = "#5a2f8a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(look, -23 - b, 4, 0.3, Math.PI - 0.3); ctx.stroke();
      ellipse(ctx, -11, -24 - b, 3, 2, "rgba(255,120,160,.4)"); ellipse(ctx, 11, -24 - b, 3, 2, "rgba(255,120,160,.4)");
      ctx.restore(); return;
    }
    if (id === "Q") {
      const g = ctx.createLinearGradient(0, -40 - b, 0, -2); g.addColorStop(0, L.body); g.addColorStop(1, L.body2);
      if (!o.portrait) { ellipse(ctx, -11, -4, 7, 4, L.body2); ellipse(ctx, 11, -4, 7, 4, L.body2); }
      ellipse(ctx, 0, -20 - b, 18, 17, g);
      ellipse(ctx, 0, -14 - b, 11, 9, "#d8f5b8");
      for (const sx of [-8, 8]) {
        circle(ctx, sx, -36 - b, 7.5, L.body); circle(ctx, sx, -36 - b, 5, "#fff");
        circle(ctx, sx + look * 1.2, -36 - b, 2.8, "#1d2a1a"); circle(ctx, sx + look * 1.2 + 1, -37.2 - b, 1, "#fff");
      }
      ctx.strokeStyle = "#2d5a24"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(look, -27 - b, 7, 0.25, Math.PI - 0.25); ctx.stroke();
      ellipse(ctx, -12, -25 - b, 3, 2, "rgba(255,120,120,.35)"); ellipse(ctx, 12, -25 - b, 3, 2, "rgba(255,120,120,.35)");
      ctx.restore(); return;
    }

    // Ножки и тело.
    if (!o.portrait) {
      const step = o.walk ? Math.sin(t / 85) * 3 : 0;
      ellipse(ctx, -6, -4 + step * .3, 5, 3.5, "#3a2a2a"); ellipse(ctx, 6, -4 - step * .3, 5, 3.5, "#3a2a2a");
    }
    const bg = ctx.createLinearGradient(0, -30 - b, 0, -4 - b); bg.addColorStop(0, L.body); bg.addColorStop(1, L.body2);
    rr(ctx, -13, -30 - b, 26, 26, [12, 12, 9, 9]); ctx.fillStyle = bg; ctx.fill();
    if (id === "A") { rr(ctx, -7, -24 - b, 14, 16, 4); ctx.fillStyle = "#fffaf0"; ctx.fill(); }
    if (id === "F") { ctx.fillStyle = "#cfe0ff"; ctx.fillRect(-8, -30 - b, 3, 12); ctx.fillRect(5, -30 - b, 3, 12); }
    if (id === "P") { ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-11, -28 - b); ctx.lineTo(9, -10 - b); ctx.stroke(); rr(ctx, 4, -14 - b, 12, 10, 3); ctx.fillStyle = "#b47c42"; ctx.fill(); }
    if (id === "D") { ctx.fillStyle = "#3f6fd8"; ctx.fillRect(-9, -22 - b, 18, 18); ctx.fillRect(-8, -30 - b, 3, 9); ctx.fillRect(5, -30 - b, 3, 9); }
    if (id === "C") { rr(ctx, -9, -26 - b, 18, 14, 4); ctx.fillStyle = "#c0c8d8"; ctx.fill(); circle(ctx, 0, -19 - b, 3, "#e24b5b"); }
    if (id === "V") { for (let i = 0; i < 3; i++) circle(ctx, -6 + i * 6, -12 - b - (i % 2) * 6, 1.6, "#ffe066"); }
    if (id === "E") { rr(ctx, -13, -14 - b, 26, 4, 2); ctx.fillStyle = "#5a4030"; ctx.fill(); rr(ctx, 5, -17 - b, 4, 9, 1); ctx.fillStyle = "#c0c8d8"; ctx.fill(); }
    if (id === "I") { rr(ctx, -6, -24 - b, 12, 10, 3); ctx.fillStyle = "#fff3d6"; ctx.fill(); ctx.fillStyle = "#ff9a3c"; ctx.font = "900 8px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.fillText("</>", 0, -16 - b); }
    if (id === "L") { ctx.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 3; i++) ctx.fillRect(-12, -25 - b + i * 7, 24, 2.5); }
    if (id === "a") { ctx.fillStyle = "#7a4a2a"; ctx.fillRect(-10, -30 - b, 3, 20); ctx.fillRect(7, -30 - b, 3, 20); }
    if (id === "g") { rr(ctx, 2, -22 - b, 13, 15, 2); ctx.fillStyle = "#c0392b"; ctx.fill(); ctx.fillStyle = "#fff3d6"; ctx.fillRect(4, -20 - b, 9, 11); }
    if (id === "hero") { rr(ctx, -13, -16 - b, 26, 4, 2); ctx.fillStyle = "#ffcf4a"; ctx.fill(); }
    if (id === "B") { ctx.beginPath(); ctx.moveTo(-18, -4 - b); ctx.lineTo(-13, -30 - b); ctx.lineTo(13, -30 - b); ctx.lineTo(18, -4 - b); ctx.closePath(); ctx.fillStyle = "#3d1233"; ctx.fill(); }

    // Посох героя.
    if (id === "hero" && !o.portrait) {
      ctx.strokeStyle = "#9a6a3a"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(16 * look, -6 - b); ctx.lineTo(18 * look, -44 - b); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = radial(ctx, 18 * look, -47 - b, 12, [[0, "rgba(124,245,200,.9)"], [1, "rgba(124,245,200,0)"]]);
      ctx.fillRect(18 * look - 12, -59 - b, 24, 24); ctx.restore();
      circle(ctx, 18 * look, -47 - b, 4, "#d8fff0");
    }

    // Голова.
    const hy = -42 - b;
    circle(ctx, 0, hy, 14, L.skin);
    if (id === "F") { ctx.beginPath(); ctx.arc(0, hy + 4, 11, 0.15, Math.PI - 0.15); ctx.fillStyle = "#9a6a3a"; ctx.fill(); }
    const eyeC = id === "B" ? "#ff4d6d" : "#2a1d1a";
    ellipse(ctx, -5 + look * 1.2, hy - 1, 2.6, 3.4, eyeC); ellipse(ctx, 5 + look * 1.2, hy - 1, 2.6, 3.4, eyeC);
    if (id !== "B") {
      circle(ctx, -4.2 + look * 1.2, hy - 2.2, 1, "#fff"); circle(ctx, 5.8 + look * 1.2, hy - 2.2, 1, "#fff");
      ellipse(ctx, -9, hy + 4, 3, 2, "rgba(255,120,120,.35)"); ellipse(ctx, 9, hy + 4, 3, 2, "rgba(255,120,120,.35)");
      if (id !== "F" && id !== "g") { ctx.strokeStyle = "#8a4a3a"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(look, hy + 4, 2.6, 0.3, Math.PI - 0.3); ctx.stroke(); }
    } else {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      circle(ctx, -5 + look, hy - 1, 6, "rgba(255,60,100,.35)"); circle(ctx, 5 + look, hy - 1, 6, "rgba(255,60,100,.35)"); ctx.restore();
    }

    // Головные уборы.
    if (id === "hero") {
      ellipse(ctx, 0, hy - 9, 19, 5, "#5136d6");
      ctx.beginPath(); ctx.moveTo(-13, hy - 10); ctx.quadraticCurveTo(-4, hy - 30, 9 * look, hy - 40); ctx.quadraticCurveTo(6, hy - 22, 13, hy - 10); ctx.closePath();
      ctx.fillStyle = "#6c4ff5"; ctx.fill();
      circle(ctx, 3, hy - 20, 3, "#ffcf4a");
    }
    if (id === "A") {
      ctx.beginPath(); ctx.arc(0, hy - 2, 15, Math.PI, 0); ctx.fillStyle = "#eeeaf6"; ctx.fill();
      circle(ctx, 0, hy - 17, 7, "#eeeaf6");
      ctx.strokeStyle = "#6a5a7a"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(-5 + look * 1.2, hy - 1, 4.4, 0, 7); ctx.moveTo(9.4 + look * 1.2, hy - 1); ctx.arc(5 + look * 1.2, hy - 1, 4.4, 0, 7); ctx.stroke();
    }
    if (id === "V") {
      // Звездочёт: синий колпак со звёздами.
      ctx.beginPath(); ctx.moveTo(-14, hy - 8); ctx.quadraticCurveTo(-2, hy - 34, -10 * look, hy - 44); ctx.quadraticCurveTo(4, hy - 24, 14, hy - 8); ctx.closePath();
      ctx.fillStyle = "#2c2f8a"; ctx.fill();
      ellipse(ctx, 0, hy - 8, 17, 4.5, "#3b3f9e");
      circle(ctx, -3, hy - 20, 2.2, "#ffe066"); circle(ctx, 3, hy - 13, 1.6, "#ffe066"); circle(ctx, -6 * look, hy - 31, 1.8, "#ffe066");
      ctx.beginPath(); ctx.moveTo(-7, hy + 6); ctx.quadraticCurveTo(0, hy + 22, 7, hy + 6); ctx.fillStyle = "#eef0ff"; ctx.fill();
    }
    if (id === "P") {
      // Почтальон: фуражка и сумка через плечо.
      ctx.beginPath(); ctx.arc(0, hy - 5, 14, Math.PI, 0); ctx.fillStyle = "#2c55b0"; ctx.fill();
      rr(ctx, -4 + look * 6, hy - 8, 16, 4, 2); ctx.fillStyle = "#1d3b80"; ctx.fill();
      circle(ctx, 0, hy - 12, 2.5, "#ffd54f");
    }
    if (id === "C") {
      // Стражница: шлем с гребнем.
      ctx.beginPath(); ctx.arc(0, hy - 2, 15, Math.PI, 0); ctx.fillStyle = "#c0c8d8"; ctx.fill();
      rr(ctx, -2, hy - 24, 4, 10, 2); ctx.fillStyle = "#e24b5b"; ctx.fill();
      ellipse(ctx, 0, hy - 24, 6, 3, "#e24b5b");
      ctx.strokeStyle = "#8a93a6"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, hy - 2, 15, Math.PI, 0); ctx.stroke();
    }
    if (id === "D") {
      // Механик: кудри и очки-гогглы на лбу.
      for (let i = 0; i < 6; i++) circle(ctx, -12 + i * 4.8, hy - 11 + (i % 2) * 2, 5, "#7a3e1d");
      rr(ctx, -13, hy - 10, 26, 4, 2); ctx.fillStyle = "#4a4a55"; ctx.fill();
      circle(ctx, -5, hy - 8, 4, "#9fe3ff"); circle(ctx, 5, hy - 8, 4, "#9fe3ff");
    }
    if (id === "E") {
      // Изобретательница: тёмные волосы с пучком и карандаш за ухом.
      ctx.beginPath(); ctx.arc(0, hy - 3, 15, Math.PI, 0); ctx.fillStyle = "#6b3a1e"; ctx.fill();
      circle(ctx, 0, hy - 17, 7, "#6b3a1e");
      rr(ctx, 11, hy - 10, 3, 12, 1); ctx.fillStyle = "#ffcf4a"; ctx.fill();
    }
    if (id === "I") {
      // Ученик: кепка и круглые очки.
      ctx.beginPath(); ctx.arc(0, hy - 5, 14, Math.PI, 0); ctx.fillStyle = "#2f6cc4"; ctx.fill();
      rr(ctx, -4 + look * 6, hy - 8, 16, 4, 2); ctx.fillStyle = "#1d4d9a"; ctx.fill();
      ctx.strokeStyle = "#3a2f2a"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(-5 + look * 1.2, hy - 1, 4.2, 0, 7); ctx.moveTo(9.2 + look * 1.2, hy - 1); ctx.arc(5 + look * 1.2, hy - 1, 4.2, 0, 7); ctx.stroke();
    }
    if (id === "L") {
      // Маячница: белая морская шапочка с синей лентой.
      ellipse(ctx, 0, hy - 10, 15, 5, "#ffffff");
      rr(ctx, -10, hy - 21, 20, 11, 5); ctx.fillStyle = "#ffffff"; ctx.fill();
      rr(ctx, -10, hy - 14, 20, 3, 1); ctx.fillStyle = "#2c55b0"; ctx.fill();
    }
    if (id === "a") {
      // Ученица: косички с бантами.
      ctx.beginPath(); ctx.arc(0, hy - 3, 15, Math.PI, 0); ctx.fillStyle = "#3a2418"; ctx.fill();
      circle(ctx, -15, hy + 2, 5, "#3a2418"); circle(ctx, 15, hy + 2, 5, "#3a2418");
      circle(ctx, -14, hy - 4, 3, "#ff6b8a"); circle(ctx, 14, hy - 4, 3, "#ff6b8a");
    }
    if (id === "g") {
      // Библиотекарь: седая борода, очки и залысина.
      ellipse(ctx, -13, hy - 4, 4, 6, "#d8d8e0"); ellipse(ctx, 13, hy - 4, 4, 6, "#d8d8e0");
      ctx.beginPath(); ctx.arc(0, hy + 3, 11, 0.1, Math.PI - 0.1); ctx.fillStyle = "#f0f0f4"; ctx.fill();
      ctx.strokeStyle = "#5a4030"; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(-5 + look * 1.2, hy - 1, 4.4, 0, 7); ctx.moveTo(9.4 + look * 1.2, hy - 1); ctx.arc(5 + look * 1.2, hy - 1, 4.4, 0, 7); ctx.stroke();
    }
    if (id === "K") {
      ctx.fillStyle = "#5c9e4a";
      ctx.beginPath(); ctx.arc(0, hy - 3, 15, Math.PI * 1.05, -0.05); ctx.fill();
      rr(ctx, -16, hy - 6, 6, 24, 3); ctx.fill(); rr(ctx, 10, hy - 6, 6, 24, 3); ctx.fill();
      for (let i = 0; i < 5; i++) circle(ctx, -10 + i * 5, hy - 13 + (i % 2) * 2, 4, "#6fb85a");
      circle(ctx, 9, hy - 14, 3.5, "#ffb3d1"); circle(ctx, 9, hy - 14, 1.5, "#ffe08a");
    }
    if (id === "F") {
      ellipse(ctx, 0, hy - 9, 22, 6, "#f0c75a");
      ctx.beginPath(); ctx.arc(0, hy - 10, 11, Math.PI, 0); ctx.fillStyle = "#f6d675"; ctx.fill();
      ctx.fillStyle = "#d9534f"; ctx.fillRect(-11, hy - 13, 22, 3);
    }
    if (id === "M") {
      ctx.beginPath(); ctx.arc(0, hy - 4, 15, Math.PI, 0); ctx.fillStyle = "#ff8a3d"; ctx.fill();
      rr(ctx, -16, hy - 6, 32, 4, 2); ctx.fillStyle = "#e0702a"; ctx.fill();
      circle(ctx, 0, hy - 12, 4.5, "#fff3b0");
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = radial(ctx, 0, hy - 12, 14, [[0, "rgba(255,240,170,.7)"], [1, "rgba(255,240,170,0)"]]);
      ctx.fillRect(-14, hy - 26, 28, 28); ctx.restore();
    }
    if (id === "B") {
      ctx.beginPath(); ctx.moveTo(-12, hy - 10);
      [-12, -8, -4, 0, 4, 8, 12].forEach((px, i) => ctx.lineTo(px, hy - (i % 2 ? 14 : 22)));
      ctx.lineTo(12, hy - 10); ctx.closePath(); ctx.fillStyle = "#ffcf4a"; ctx.fill();
    }
    ctx.restore();
  }

  // Пузырь «!» над жителем, которому нужна помощь.
  function drawMarker(ctx, cx, by, t) {
    const y = by - 78 + Math.sin(t / 250) * 3;
    circle(ctx, cx, y, 11, "#ffffff");
    ctx.beginPath(); ctx.moveTo(cx - 4, y + 9); ctx.lineTo(cx, y + 16); ctx.lineTo(cx + 4, y + 9); ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.fillStyle = "#ff8a3d"; ctx.font = "900 16px Nunito, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("!", cx, y + 1);
  }

  // actors: [{ id, px, py, flip, walk, marker }], px/py — левый верхний угол клетки.
  function drawScene(ctx, grid, actors, t, th = THEMES.forest) {
    drawGround(ctx, grid, t, th);
    const items = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (c === "T") items.push({ z: y * TS + TS, d: () => drawTree(ctx, x, y, t, th) });
      else if (c === "f") items.push({ z: y * TS + TS + 2, d: () => drawFog(ctx, x, y, t) });
      else if (c === "n" || c === "N") items.push({ z: y * TS + TS - 2, d: () => drawLantern(ctx, x, y, c === "N", t, th) });
      else if (c === "m") items.push({ z: y * TS + TS + 2, d: () => drawMirage(ctx, x, y, t) });
      else if (c === "c") items.push({ z: y * TS + TS - 1, d: () => drawCrates(ctx, x, y, th) });
      else if (c === "H") items.push({ z: y * TS + TS, d: () => drawHouse(ctx, x, y, th) });
      else if (c === "G" || c === "O") items.push({ z: y * TS, d: () => drawGate(ctx, x, y, c === "O", t) });
      else if (c === "l" && (x + y) % 2 === 0) items.push({ z: y * TS + 20, d: () => drawTorch(ctx, x, y, t) });
    }
    for (const a of actors) items.push({ z: a.py + TS - 1, d: () => {
      drawCharacter(ctx, a.id, a.px + TS / 2, a.py + TS - 4, t, a);
      if (a.marker) drawMarker(ctx, a.px + TS / 2, a.py + TS - 4, t);
    } });
    items.sort((a, b) => a.z - b.z).forEach(i => i.d());
    if (th.fireflies || th.embers) drawFireflies(ctx, t, th);
    if (th.snow || th.leaves) drawWeather(ctx, t, th);
  }

  function drawPortrait(ctx, id, size, t = 0) {
    ctx.clearRect(0, 0, size, size);
    const s = size / 34;
    drawCharacter(ctx, id, size / 2, size * .5 + 42 * s, t, { scale: s, portrait: true });
  }

  return { TS, W, H, CHAPTERS, SOLID, build, drawScene, drawPortrait, radial };
})();
