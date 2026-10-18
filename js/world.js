// Карта мира и векторная отрисовка: мягкие формы, градиенты и свет вместо пикселей.
// Буквы карты: . трава, p тропа, T дерево, ~ река, b место для моста, # скала,
// d тёмная пещера, G ворота, H дом. A F M B — жители (на их месте трава/пещера).
window.World = (function () {
  const MAP = [
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
  ];
  const TS = 48, W = 20, H = 15;
  const START = { x: 4, y: 11 };
  const SOLID = new Set(["T", "~", "#", "H", "b", "d", "G"]);
  const WATER = new Set(["~", "b", "="]);
  const PATHS = new Set(["p", "="]);
  const CAVE = new Set(["#", "d", "l", "G", "O"]);

  function build() {
    const grid = MAP.map(r => r.split(""));
    const npcs = {};
    grid.forEach((row, y) => row.forEach((c, x) => {
      if ("AFMB".includes(c)) { npcs[c] = { x, y, id: c }; row[x] = c === "B" ? "d" : "."; }
    }));
    return { grid, npcs };
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
  function drawGround(ctx, grid, t) {
    const at = (x, y) => (grid[y] && grid[y][x]) || "T";
    const g = ctx.createLinearGradient(0, 0, W * TS, H * TS);
    g.addColorStop(0, "#9bd86f"); g.addColorStop(1, "#6cbd58");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * TS, H * TS);

    // Пятна света и тени на траве, кустики и цветы.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (WATER.has(c) || CAVE.has(c)) continue;
      const X = x * TS, Y = y * TS, r = rnd(x, y, 1);
      ellipse(ctx, X + r % TS, Y + (r >> 7) % TS, 22, 12, r % 2 ? "rgba(255,255,230,.10)" : "rgba(30,90,40,.08)");
      if (c !== "." && c !== "T") continue;
      ctx.strokeStyle = "rgba(40,110,45,.45)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      const tx = X + 8 + rnd(x, y, 2) % 30, ty = Y + 14 + rnd(x, y, 3) % 26;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 2, ty - 6, tx - 4, ty - 9);
      ctx.moveTo(tx + 3, ty); ctx.quadraticCurveTo(tx + 4, ty - 7, tx + 7, ty - 10); ctx.stroke();
      const f = rnd(x, y, 4) % 7;
      if (f < 2 && c === ".") {
        const fx = X + 10 + rnd(x, y, 5) % 28, fy = Y + 10 + rnd(x, y, 6) % 28, col = ["#ffffff", "#ffd54f", "#ff9ec4"][rnd(x, y, 7) % 3];
        for (let i = 0; i < 5; i++) circle(ctx, fx + Math.cos(i * 1.26) * 3.5, fy + Math.sin(i * 1.26) * 3.5, 3, col);
        circle(ctx, fx, fy, 2.4, "#f4a62a");
      }
    }

    // Река с берегами и бликами.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!WATER.has(grid[y][x])) continue;
      const X = x * TS, Y = y * TS;
      const wg = ctx.createLinearGradient(X, 0, X + TS, 0);
      const left = !WATER.has(at(x - 1, y)), right = !WATER.has(at(x + 1, y));
      wg.addColorStop(0, left ? "#5ab8f0" : "#3d9be0"); wg.addColorStop(1, right ? "#5ab8f0" : "#3d9be0");
      ctx.fillStyle = wg; ctx.fillRect(X, Y, TS, TS);
      ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      for (let k = 0; k < 2; k++) {
        const wy = Y + ((t / 30 + rnd(x, y, k + 8) % TS + k * 24) % TS);
        const wx = X + 8 + rnd(x, y, k + 10) % 24;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 5, wy + 3, wx + 10, wy); ctx.stroke();
      }
      const foam = .55 + Math.sin(t / 500 + y) * .2;
      if (left) { ctx.fillStyle = "#ecd9a4"; ctx.fillRect(X - 4, Y, 8, TS); ctx.fillStyle = `rgba(255,255,255,${foam})`; ctx.fillRect(X + 4, Y, 3, TS); }
      if (right) { ctx.fillStyle = "#ecd9a4"; ctx.fillRect(X + TS - 4, Y, 8, TS); ctx.fillStyle = `rgba(255,255,255,${foam})`; ctx.fillRect(X + TS - 7, Y, 3, TS); }
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
      }
    };
    pathPass("#d9b878", 4); pathPass("#efd8a4", 8);

    // Мост.
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (grid[y][x] !== "=") continue;
      const X = x * TS, Y = y * TS;
      ctx.fillStyle = "rgba(0,40,80,.25)"; ctx.fillRect(X, Y + 12, TS, 30);
      for (let i = 0; i < 6; i++) { rr(ctx, X + i * 8 + .5, Y + 8, 7, 32, 2); ctx.fillStyle = i % 2 ? "#c48b4f" : "#b47c42"; ctx.fill(); }
      rr(ctx, X - 2, Y + 4, TS + 4, 6, 3); ctx.fillStyle = "#8a5a2b"; ctx.fill();
      rr(ctx, X - 2, Y + 38, TS + 4, 6, 3); ctx.fill();
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
        ctx.fillStyle = "#4a4258"; ctx.fillRect(X, Y, TS, TS);
        rr(ctx, X + 2, Y + 2, TS - 4, TS - 4, 12);
        const sg = ctx.createLinearGradient(X, Y, X, Y + TS); sg.addColorStop(0, "#a49cb8"); sg.addColorStop(1, "#6e6684");
        ctx.fillStyle = sg; ctx.fill();
        ellipse(ctx, X + 16, Y + 12, 9, 4, "rgba(255,255,255,.22)");
      }
    }
  }

  // ---------- Объекты с глубиной: деревья, дом, ворота, факелы ----------
  function drawTree(ctx, x, y, t) {
    const cx = x * TS + TS / 2, by = y * TS + TS - 2, sway = Math.sin(t / 1200 + x * .7 + y) * 1.5;
    ellipse(ctx, cx + 4, by - 2, 20, 7, "rgba(20,60,30,.28)");
    rr(ctx, cx - 5, by - 22, 10, 20, 4); ctx.fillStyle = "#8a5a33"; ctx.fill();
    const big = 0.9 + (rnd(x, y, 20) % 30) / 100;
    const blob = (dx, dy, r, c) => circle(ctx, cx + dx * big + sway, by + dy * big, r * big, c);
    blob(-13, -26, 15, "#2e8b47"); blob(13, -26, 15, "#2e8b47"); blob(0, -38, 20, "#2e8b47");
    blob(-10, -30, 12, "#3fa956"); blob(8, -32, 13, "#3fa956"); blob(-2, -42, 14, "#4bb862");
    blob(-6, -46, 6, "rgba(255,255,255,.22)");
  }
  function drawHouse(ctx, x, y) {
    const X = x * TS, Y = y * TS;
    ellipse(ctx, X + 26, Y + 44, 26, 6, "rgba(20,60,30,.25)");
    rr(ctx, X + 4, Y + 18, 40, 26, 4); ctx.fillStyle = "#fbefd8"; ctx.fill();
    rr(ctx, X + 30, Y - 2, 8, 14, 2); ctx.fillStyle = "#b9634b"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(X - 2, Y + 22); ctx.quadraticCurveTo(X + 24, Y - 14, X + 50, Y + 22); ctx.closePath();
    const rg = ctx.createLinearGradient(X, Y, X, Y + 22); rg.addColorStop(0, "#ff7a5c"); rg.addColorStop(1, "#d9483a");
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

  // ---------- Персонажи в стиле «чиби» ----------
  const LOOKS = {
    hero: { skin: "#ffd8b8", body: "#6c4ff5", body2: "#5136d6" },
    A: { skin: "#ffd8b8", body: "#4fae6d", body2: "#3d9058" },
    F: { skin: "#f2c39b", body: "#3f86e8", body2: "#2f6cc4" },
    M: { skin: "#f2c39b", body: "#8a8fa3", body2: "#6d7286" },
    B: { skin: "#4a2a5e", body: "#5b1f4a", body2: "#3d1233" },
    S: { skin: "#9ff7d6", body: "#7cf5c8", body2: "#4fd4a8" },
  };
  function drawCharacter(ctx, id, cx, by, t, o = {}) {
    const s = (o.scale || 1) * (id === "B" ? 1.2 : 1), L = LOOKS[id];
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

    // Ножки и тело.
    if (!o.portrait) {
      const step = o.walk ? Math.sin(t / 85) * 3 : 0;
      ellipse(ctx, -6, -4 + step * .3, 5, 3.5, "#3a2a2a"); ellipse(ctx, 6, -4 - step * .3, 5, 3.5, "#3a2a2a");
    }
    const bg = ctx.createLinearGradient(0, -30 - b, 0, -4 - b); bg.addColorStop(0, L.body); bg.addColorStop(1, L.body2);
    rr(ctx, -13, -30 - b, 26, 26, [12, 12, 9, 9]); ctx.fillStyle = bg; ctx.fill();
    if (id === "A") { rr(ctx, -7, -24 - b, 14, 16, 4); ctx.fillStyle = "#fffaf0"; ctx.fill(); }
    if (id === "F") { ctx.fillStyle = "#cfe0ff"; ctx.fillRect(-8, -30 - b, 3, 12); ctx.fillRect(5, -30 - b, 3, 12); }
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
      if (id !== "F") { ctx.strokeStyle = "#8a4a3a"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(look, hy + 4, 2.6, 0.3, Math.PI - 0.3); ctx.stroke(); }
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
  function drawScene(ctx, grid, actors, t) {
    drawGround(ctx, grid, t);
    const items = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (c === "T") items.push({ z: y * TS + TS, d: () => drawTree(ctx, x, y, t) });
      else if (c === "H") items.push({ z: y * TS + TS, d: () => drawHouse(ctx, x, y) });
      else if (c === "G" || c === "O") items.push({ z: y * TS, d: () => drawGate(ctx, x, y, c === "O", t) });
      else if (c === "l" && (x + y) % 2 === 0) items.push({ z: y * TS + 20, d: () => drawTorch(ctx, x, y, t) });
    }
    for (const a of actors) items.push({ z: a.py + TS - 1, d: () => {
      drawCharacter(ctx, a.id, a.px + TS / 2, a.py + TS - 4, t, a);
      if (a.marker) drawMarker(ctx, a.px + TS / 2, a.py + TS - 4, t);
    } });
    items.sort((a, b) => a.z - b.z).forEach(i => i.d());
  }

  function drawPortrait(ctx, id, size, t = 0) {
    ctx.clearRect(0, 0, size, size);
    const s = size / 34;
    drawCharacter(ctx, id, size / 2, size * .5 + 42 * s, t, { scale: s, portrait: true });
  }

  return { TS, W, H, START, SOLID, build, drawScene, drawPortrait, radial };
})();
