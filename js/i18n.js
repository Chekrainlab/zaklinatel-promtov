// Языки игры: русский (основной текст в quests.js), английский и узбекский (js/lang/*.js).
// Переводы повторяют структуру русских данных; чего нет в переводе, остаётся по-русски.
window.I18N = (function () {
  const KEY = "kodolesie-lang";
  const LANGS = ["ru", "en", "uz"];
  const RU = {
    game: "Кодолесье",
    kicker: "Приключение о вайбкодинге",
    tagline: "Повелитель Багов украл Кодика, доброго ИИ-помощника. Верните его, научившись просить точно.",
    help: "Ходите стрелками или кнопками. Чтобы поговорить, подойдите к жителю вплотную.",
    world: "Мир Кодолесья",
    starsTitle: "Звёзды за задания",
    up: "Вверх", down: "Вниз", left: "Влево", right: "Вправо",
    sndOff: "Выключить звук", sndOn: "Включить звук",
    play: "Играть", cont: "Продолжить", starsOf: "★ {n} из {max}",
    chapter: "Глава {n}",
    tapNext: "Нажмите, чтобы продолжить ▸",
    remind: "Не забывай: {goal}",
    helpOthers: "Сначала помоги другим, а потом приходи ко мне.",
    build: "Соберите промт: {title}",
    addressee: "Кодик",
    ask: "Попросить Кодика",
    hint: "Подсказка за рекламу",
    later: "Позже",
    success: "Получилось!",
    stars3: "С первой попытки!", stars2: "Почти идеально: одна ошибка.", stars1: "Получилось, хоть и не сразу.",
    next: "Дальше",
    adStub: "Здесь будет реклама Яндекса",
    walkOn: "Гулять дальше",
    chapters: "Главы", locked: "Закрыто", replayHint: "Пройденную главу можно переиграть и собрать все звёзды.", back: "Назад",
    notes: "Шпаргалка", notesTitle: "Шпаргалка вайбкодера", notesEmpty: "Здесь появятся правила, которые вы узнаете в игре.",
    top: "Рекорды", loading: "Загружаем таблицу…",
    loginText: "Войдите через Яндекс, чтобы ваши звёзды попали в таблицу, а прогресс сохранялся на всех устройствах.",
    loginBtn: "Войти через Яндекс", yourStars: "Ваши звёзды: ★ {n} из {max}",
    topEmpty: "В таблице пока никого нет. Будьте первым!",
    topOffline: "Таблица рекордов работает, когда игра открыта в Яндекс Играх.",
    player: "Игрок",
    daily: "Промт дня", dailyDone: "Промт дня ✓",
    dailyTitle: "Промт дня: {title}",
    dailyWin: "Промт дня решён!",
    streak: "Дней подряд: {n}", streakBest: "Лучшая серия: {n}",
    dailyAgain: "Сегодняшний промт уже решён. Завтра будет новое задание!",
    dailyReplay: "Решить ещё раз",
    achievements: "Достижения", achCount: "Открыто: {n} из {max}", achNew: "Новое достижение!",
    "ach.first": "Первый промт", "ach.first.d": "Выполните первое задание.",
    "ach.perfect": "Без единой ошибки", "ach.perfect.d": "Соберите все звёзды в одной главе.",
    "ach.nohint": "Сам справился", "ach.nohint.d": "Пройдите главу без подсказок.",
    "ach.part1": "Первая часть", "ach.part1.d": "Пройдите первые 5 глав.",
    "ach.part2": "Мастер вайбкодинга", "ach.part2.d": "Пройдите все 8 глав.",
    "ach.allstars": "Все звёзды", "ach.allstars.d": "Соберите все звёзды игры.",
    "ach.daily1": "Промт дня", "ach.daily1.d": "Решите первый промт дня.",
    "ach.streak3": "Три дня подряд", "ach.streak3.d": "Решайте промт дня 3 дня подряд.",
    "ach.streak7": "Целая неделя", "ach.streak7.d": "Решайте промт дня 7 дней подряд.",
    parents: "Для взрослых", parentsTitle: "Для родителей и учителей",
    parentsIntro: "«Кодолесье» учит детей работать с ИИ: просить точно, проверять ответы и помнить о безопасности. В игре нет настоящего ИИ: все ответы написаны заранее. Ниже — чему учит каждая глава и вопросы для разговора с ребёнком.",
    teaches: "Чему учит:", discuss: "Обсудите:",
    language: "Язык",
  };

  // Ключи, которые не переводятся: служебные поля и имена (имена переводятся отдельным словарём).
  const SKIP = new Set(["id", "guide", "effect", "n", "ok", "final", "who", "guideName"]);
  function merge(src, tr) {
    if (typeof src === "string") return typeof tr === "string" && tr ? tr : src;
    if (Array.isArray(src)) return src.map((x, i) => merge(x, tr && tr[i]));
    if (src && typeof src === "object") {
      const out = {};
      for (const k of Object.keys(src)) out[k] = SKIP.has(k) ? src[k] : merge(src[k], tr && tr[k]);
      return out;
    }
    return src;
  }

  let lang = "ru", cache = null;
  const pack = () => (lang !== "ru" && (window.LANG_PACKS || {})[lang]) || {};

  function set(l, remember) {
    lang = LANGS.includes(l) ? l : "ru"; cache = null;
    document.documentElement.lang = lang;
    if (remember) try { localStorage.setItem(KEY, lang); } catch {}
  }
  // Сначала выбор игрока, потом язык из Яндекс SDK (требование 2.14), потом язык браузера.
  function detect(sdkLang) {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    if (LANGS.includes(saved)) return set(saved);
    const code = String(sdkLang || navigator.language || "ru").slice(0, 2).toLowerCase();
    set(["ru", "be", "kk", "uk"].includes(code) ? "ru" : code === "uz" ? "uz" : "en");
  }

  function t(key, vars = {}) {
    const s = pack().ui?.[key] || RU[key] || key;
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }
  const name = n => pack().names?.[n] || n;
  function content() {
    if (cache) return cache;
    const { CHAPTERS, DAILY, PARENTS } = window, p = pack();
    cache = lang === "ru" ? { CHAPTERS, DAILY, PARENTS }
      : { CHAPTERS: merge(CHAPTERS, p.chapters), DAILY: merge(DAILY, p.daily), PARENTS: merge(PARENTS, p.parents) };
    return cache;
  }

  return { LANGS, RU, SKIP, merge, set, detect, t, name, content, get lang() { return lang; } };
})();
