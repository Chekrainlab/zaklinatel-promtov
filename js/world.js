// Карта мира, тайлы и пиксельные спрайты.
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
  const TS = 16, W = 20, H = 15;
  const START = { x: 4, y: 11 };
  const SOLID = new Set(["T", "~", "#", "H", "b", "d", "G"]);

  function build() {
    const grid = MAP.map(r => r.split(""));
    const npcs = {};
    grid.forEach((row, y) => row.forEach((c, x) => {
      if ("AFMB".includes(c)) { npcs[c] = { x, y, id: c }; row[x] = c === "B" ? "d" : "."; }
    }));
    return { grid, npcs };
  }

  // Спрайты 16x16. Строки короче 16 дополняются прозрачностью.
  const SPR = {
    hero: { pal: { p: "#7b5cff", P: "#5a3fd6", y: "#ffd84a", s: "#f2c9a0", e: "#2a1a10", r: "#4a35b8", g: "#ffd84a", k: "#2a1f47", w: "#7cf5c8", b: "#8a5a2b" },
      px: ["......pp", ".....pppp", "....ppyppp", "...pppppppp", "..pppppppppp", ".PPPPPPPPPPPP", "...ssssss....w", "...sesses...www",
           "...ssssss....w", "..rrrrrrrr...b", ".rrrrggrrrr..b", ".rrrrrrrrrrrrb", "..rrrrrrrrr..b", "..rrrrrrrrr..b", "...kk...kk...b", "...kk...kk"] },
    A: { pal: { h: "#e9e6f2", H: "#c9c4d8", s: "#f2c9a0", e: "#2a1a10", m: "#d46a7a", d: "#4f9d69", D: "#3c7d52", w: "#fff6e0", k: "#5a3a1a" },
      px: [".....hhhh", "....hhhhhh", "...hhhhhhhh", "...HssssssH", "....ssssss", "....sesses", "....ssmmss", ".....ssss",
           "...dddddddd", "..dddwwwwddd", "..DddwwwwddD", "..DddwwwwddD", "...dddddddd", "...dddddddd", "....kk..kk", "....kk..kk"] },
    F: { pal: { y: "#f3cf5a", Y: "#c9a640", s: "#e8b98a", e: "#2a1a10", c: "#8a5a2b", b: "#3b6fd8", u: "#c9d8ff", k: "#4a2e17", r: "#b08a5a" },
      px: ["....yyyyyy.....r", "...yyyyyyyy...r", ".YYYYYYYYYYYY.r", "...ssssssss..r", "...sesssses..r", "...ssssssss.r", "...cccccccc.r", "....cccccc..r",
           "..bbbbbbbbbbr", "..bbbuubbbbb", "..bbbbbbbbbb", "..bbbbbbbbbb", "...bbbbbbbb", "...bb...bb", "...kk...kk", "...kk...kk"] },
    M: { pal: { o: "#ff8a3d", O: "#d96a22", L: "#fff3a0", s: "#e8b98a", e: "#2a1a10", g: "#7a7a8a", G: "#5c5c6c", t: "#8a5a2b", i: "#c9c9d6", k: "#3a2a1a" },
      px: ["....oooooo", "...oooLLooo", "...oooooooo", "..OOOOOOOOOO", "....ssssss", "....sesses", "....ssssss", ".....ssss...ii",
           "..gggggggg..ti", ".ggggggggggtt", ".GggggggggGt", "..gggggggg.t", "..gggggggg", "..GggggggG", "...kk..kk", "...kk..kk"] },
    B: { pal: { k: "#ffcf4a", x: "#2a1530", r: "#ff3b5c", m: "#8a1a3a", c: "#7a1a3a", C: "#5a1028", v: "#b04aff" },
      px: ["..k..k..k..k", "..kkkkkkkkkk", "..kkkkkkkkkk", "...xxxxxxxx", "..xxxxxxxxxx", "..xxrxxxxrxx", "..xxxxxxxxxx", "...xxmmmmxx",
           "..cccccccccc", ".cccccccccccc", "Ccccccvvvvccccc", "Ccccccvvvvccccc", ".cccccccccccc", ".CccccccccccC", "..cc..cc..cc", "..cc..cc..cc"] },
    S: { pal: { w: "#7cf5c8", W: "#4fd4a8", g: "#e8fff6", e: "#1a3a3a" },
      px: ["", ".....wwwww", "...wwwwwwwww", "..wwgwwwwwwww", "..wggwwwwwwww", ".wwwweewweewww", ".wwwweewweewww", ".wwwwwwwwwwwww",
           ".wwwwwweewwwww", "..wwwwwwwwwww", "..WwwwwwwwwwW", "...WwwWwwWww", "....W..W..W", "", "", ""] },
  };
  function drawSprite(ctx, s, x, y, flip, scale = 1) {
    const d = SPR[s];
    // Мягкая тень под персонажем.
    if (scale === 1) { ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x + 8, y + 15.5, 6, 2, 0, 0, 7); ctx.fill(); }
    d.px.forEach((row, j) => [...row.padEnd(16, ".")].forEach((c, i) => {
      if (c === ".") return;
      ctx.fillStyle = d.pal[c];
      ctx.fillRect(x + (flip ? 15 - i : i) * scale, y + j * scale, scale, scale);
    }));
  }

  function rnd(x, y, k) { return ((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) >>> 0; }
  const WATER = new Set(["~", "b", "="]);
  const GREEN = new Set([".", "T", "H"]);

  // at(x, y) — буква соседнего тайла, нужна для берегов и краёв тропы.
  function drawTile(ctx, c, x, y, t, at) {
    const X = x * TS, Y = y * TS;
    const px = (col, dx, dy, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(X + dx, Y + dy, w, h); };
    const grass = () => {
      px("#63b553", 0, 0, TS, TS);
      for (let k = 0; k < 4; k++) { const r = rnd(x, y, k); px("#53a245", r % 15, (r >> 5) % 14, 1, 2); }
      px("#74c562", rnd(x, y, 9) % 14, rnd(x, y, 8) % 14, 2, 1);
      const f = rnd(x, y, 7) % 11;
      if (f < 3) { const fx = 3 + rnd(x, y, 6) % 10, fy = 3 + rnd(x, y, 5) % 10; px(["#fff6e0", "#ffd84a", "#ff9ac0"][f], fx, fy, 2, 2); px("#e8a33a", fx, fy, 1, 1); }
    };
    switch (c) {
      case ".": return grass();
      case "p": {
        px("#e2c68a", 0, 0, TS, TS);
        px("#d1b274", rnd(x, y, 1) % 12, rnd(x, y, 2) % 12, 3, 2); px("#f0dcaa", rnd(x, y, 3) % 13, rnd(x, y, 4) % 13, 2, 1);
        // Травяная кромка там, где тропа граничит с травой.
        if (GREEN.has(at(x, y - 1))) px("#4f9d43", 0, 0, TS, 2);
        if (GREEN.has(at(x, y + 1))) px("#4f9d43", 0, 14, TS, 2);
        if (GREEN.has(at(x - 1, y))) px("#4f9d43", 0, 0, 2, TS);
        if (GREEN.has(at(x + 1, y))) px("#4f9d43", 14, 0, 2, TS);
        return;
      }
      case "T":
        grass();
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(X + 8, Y + 14, 7, 2.5, 0, 0, 7); ctx.fill();
        px("#6b4423", 6, 9, 4, 6); px("#4a2e17", 6, 9, 1, 6);
        ctx.fillStyle = "#2c6b34"; ctx.beginPath(); ctx.arc(X + 8, Y + 7, 7, 0, 7); ctx.fill();
        ctx.fillStyle = "#3a8a42"; ctx.beginPath(); ctx.arc(X + 7, Y + 6, 5.5, 0, 7); ctx.fill();
        ctx.fillStyle = "#56aa52"; ctx.beginPath(); ctx.arc(X + 6, Y + 4, 3, 0, 7); ctx.fill();
        return;
      case "~": case "b": case "=": {
        px("#3a78d0", 0, 0, TS, TS);
        px("#2f68bd", 0, 6 + (y % 2) * 4, TS, 3);
        const o = (Math.floor(t / 280) + x * 3 + y) % 6;
        px("#8cc0ff", o * 2, 3 + (y % 2) * 7, 4, 1); px("#8cc0ff", ((o + 3) % 6) * 2, 12, 3, 1);
        // Пена у берега.
        const foam = (Math.floor(t / 400) + y) % 2 ? "#d8ecff" : "#b8d8ff";
        if (!WATER.has(at(x - 1, y))) { px("#c9a46a", 0, 0, 2, TS); px(foam, 2, 0, 1, TS); }
        if (!WATER.has(at(x + 1, y))) { px("#c9a46a", 14, 0, 2, TS); px(foam, 13, 0, 1, TS); }
        if (c === "=") {
          px("#a8743c", 0, 2, TS, 12);
          for (let i = 0; i < 4; i++) { px("#8a5a2b", i * 4, 2, 1, 12); px("#c08a50", i * 4 + 1, 3, 2, 1); }
          px("#5a3a1a", 0, 1, TS, 2); px("#5a3a1a", 0, 13, TS, 2);
          px("#3a2412", 0, 0, 2, 3); px("#3a2412", 14, 0, 2, 3);
        }
        return;
      }
      case "#":
        px("#5a526c", 0, 0, TS, TS);
        px("#746c88", 1, 1, 7, 6); px("#746c88", 9, 8, 6, 7); px("#8a82a0", 1, 1, 7, 1); px("#8a82a0", 9, 8, 6, 1);
        px("#443d56", 0, 7, TS, 1); px("#443d56", 8, 0, 1, 7);
        return;
      case "d": {
        px("#0a0814", 0, 0, TS, TS);
        px("#161130", rnd(x, y, 3) % 12, rnd(x, y, 4) % 12, 2, 2);
        // Где-то в темноте моргают глаза летучей мыши.
        if (rnd(x, y, 11) % 4 === 0 && Math.floor(t / 900 + x) % 5) { const ex = 3 + rnd(x, y, 12) % 9, ey = 3 + rnd(x, y, 13) % 9; px("#b04aff", ex, ey); px("#b04aff", ex + 3, ey); }
        return;
      }
      case "l":
        px("#5a4a68", 0, 0, TS, TS);
        px("#6d5c7e", 2, 2, 5, 3); px("#6d5c7e", 9, 9, 4, 3);
        if ((x + y) % 2 === 0) {
          const g = ctx.createRadialGradient(X + 2, Y + 5, 0, X + 2, Y + 5, 12);
          g.addColorStop(0, "rgba(255,190,90,.45)"); g.addColorStop(1, "rgba(255,190,90,0)");
          ctx.fillStyle = g; ctx.fillRect(X, Y, TS, TS);
          px("#6b4423", 1, 6, 2, 6);
          px((Math.floor(t / 150) % 2) ? "#ffd84a" : "#ff8a3d", 0, 3, 4, 3); px("#fff3a0", 1, 4, 2, 1);
        }
        return;
      case "G": case "O":
        px("#5a526c", 0, 0, TS, TS);
        if (c === "G") {
          px("#1e1830", 2, 2, 12, 14);
          for (let i = 0; i < 4; i++) px("#a8a0c0", 3 + i * 3, 2, 1, 14);
          px("#ffcf4a", 7, 8, 2, 2);
        } else {
          const g = ctx.createRadialGradient(X + 8, Y + 9, 0, X + 8, Y + 9, 10);
          g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#ffe9a0");
          ctx.fillStyle = g; ctx.fillRect(X + 2, Y + 2, 12, 14);
        }
        return;
      case "H":
        grass();
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(X + 2, Y + 14, 13, 2);
        px("#efe0c0", 2, 7, 12, 8); px("#d8c6a0", 2, 13, 12, 2);
        ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(X, Y + 8); ctx.lineTo(X + 8, Y + 1); ctx.lineTo(X + 16, Y + 8); ctx.fill();
        px("#e05a48", 4, 5, 8, 1);
        px("#6b4423", 7, 10, 3, 5); px("#7cc4ff", 3, 9, 3, 3);
        return;
    }
  }

  return { TS, W, H, START, SOLID, build, drawSprite, drawTile };
})();
