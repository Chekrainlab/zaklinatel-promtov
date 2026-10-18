// Обёртка над Яндекс Игры SDK. Вне Яндекса работает заглушка:
// сохранения в localStorage, реклама — экран с обратным отсчётом.
window.Platform = (function () {
  const KEY = "zaklinatel-save-v1";
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
    if (!onYandex()) return;
    try {
      await loadScript("/sdk.js");
      ysdk = await window.YaGames.init();
      player = await ysdk.getPlayer({ scopes: false });
    } catch (e) {
      console.warn("Yandex SDK недоступен, работаем без него", e);
    }
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
        onRewarded: () => { got = true; },
        onClose: () => { if (got) onReward(); },
        onError: () => {},
      } });
    } else mock(onReward);
  }

  let lastInterstitial = 0;
  // Межстраничная реклама, не чаще раза в 3 минуты.
  function interstitial() {
    if (!ysdk || Date.now() - lastInterstitial < 180000) return;
    lastInterstitial = Date.now();
    ysdk.adv.showFullscreenAdv({ callbacks: {} });
  }

  return { init, ready, load, save, rewarded, interstitial };
})();
