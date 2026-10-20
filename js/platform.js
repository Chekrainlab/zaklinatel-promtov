// Обёртка над Яндекс Игры SDK. Вне Яндекса работает заглушка:
// сохранения в localStorage, реклама — экран с обратным отсчётом.
// Пока идёт реклама, звук игры на паузе (требование Яндекса).
window.Platform = (function () {
  const KEY = "zaklinatel-save-v1";
  // Таблица лидеров по звёздам. Её нужно создать в консоли разработчика с этим техническим именем.
  const LEADERBOARD = "stars";
  let ysdk = null, player = null;

  function onYandex() {
    return /yandex\.(net|ru|com)$|playhop\.com$/.test(location.hostname);
  }

  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  async function init() {
    // В архиве для Яндекса загрузчик /sdk.js уже подключён в index.html (см. tools/build.py).
    if (!window.YaGames && !onYandex()) return;
    try {
      if (!window.YaGames) await loadScript("/sdk.js");
      ysdk = await window.YaGames.init();
      player = await ysdk.getPlayer({ scopes: false });
      // Яндекс сам сообщает о паузе: реклама, окно покупки, свёрнутая вкладка.
      ysdk.on?.("game_api_pause", () => window.Sound?.pause("sdk"));
      ysdk.on?.("game_api_resume", () => window.Sound?.resume("sdk"));
    } catch (e) {
      console.warn("Yandex SDK недоступен, работаем без него", e);
    }
  }

  // Разметка геймплея: start — игрок управляет героем, stop — меню, окна, реклама.
  let playing = false;
  function gameplay(on) {
    if (on === playing) return;
    playing = on;
    const api = ysdk?.features?.GameplayAPI;
    on ? api?.start() : api?.stop();
  }

  const isAuthorized = () => !!player && (player.isAuthorized ? player.isAuthorized() : player.getMode?.() !== "lite");

  // Вход через Яндекс только по кнопке игрока (требование 1.2). После входа отправляем рекорд.
  async function login() {
    if (!ysdk) return false;
    try {
      await ysdk.auth.openAuthDialog();
      player = await ysdk.getPlayer({ scopes: false });
    } catch { return false; }
    return isAuthorized();
  }

  let lastScore = -1;
  async function submitScore(score) {
    if (!ysdk || !isAuthorized() || score <= lastScore) return;
    try {
      if (!(await ysdk.isAvailableMethod("leaderboards.setScore"))) return;
      await ysdk.leaderboards.setScore(LEADERBOARD, score);
      lastScore = score;
    } catch (e) { console.warn("Рекорд не отправлен", e); }
  }

  // null — таблицы нет (игра открыта не в Яндекс Играх или таблица не создана).
  async function topScores() {
    if (!ysdk) return null;
    try {
      const res = await ysdk.leaderboards.getEntries(LEADERBOARD, { quantityTop: 10, includeUser: isAuthorized(), quantityAround: 1 });
      return {
        me: res.userRank || 0,
        rows: res.entries.map(e => ({ rank: e.rank, score: e.score, name: e.player.publicName || "", me: e.rank === res.userRank })),
      };
    } catch (e) { console.warn("Таблица лидеров недоступна", e); return null; }
  }

  function ready() {
    ysdk?.features?.LoadingAPI?.ready();
  }

  async function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch {}
    if (player) {
      try {
        const cloud = await player.getData();
        if (cloud && cloud.v) data = cloud;
      } catch {}
    }
    return data;
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    player?.setData(data).catch(() => {});
  }

  // Реклама за награду. onReward вызывается, только если ролик досмотрен.
  function rewarded(onReward, mock) {
    if (ysdk) {
      let got = false;
      ysdk.adv.showRewardedVideo({ callbacks: {
        onOpen: () => window.Sound?.pause("ad"),
        onRewarded: () => { got = true; },
        onClose: () => { window.Sound?.resume("ad"); if (got) onReward(); },
        onError: () => window.Sound?.resume("ad"),
      } });
    } else mock(onReward);
  }

  let lastInterstitial = 0;
  // Межстраничная реклама, не чаще раза в 3 минуты.
  function interstitial() {
    if (!ysdk || Date.now() - lastInterstitial < 180000) return;
    lastInterstitial = Date.now();
    ysdk.adv.showFullscreenAdv({ callbacks: {
      onOpen: () => window.Sound?.pause("ad"),
      onClose: () => window.Sound?.resume("ad"),
      onError: () => window.Sound?.resume("ad"),
    } });
  }

  const hasSdk = () => !!ysdk;
  // Язык Яндекса (ru, en, uz…) для автоматического выбора языка игры.
  const sdkLang = () => ysdk?.environment?.i18n?.lang || null;
  return { sdkLang, init, ready, load, save, rewarded, interstitial, gameplay, hasSdk, isAuthorized, login, submitScore, topScores };
})();
