// Оценка промта игрока: пять частей хорошего промта, без настоящего ИИ.
// Работает и в браузере (window.Grader), и в Node (для тестов).
(function (root) {
  const CRITERIA = [
    { key: "task", name: "Суть задачи", tip: "Назовите, что именно сломано или что нужно сделать." },
    { key: "ctx", name: "Контекст", tip: "Скажите, где это: игра, сайт, на каком языке (HTML, JavaScript…)." },
    { key: "goal", name: "Желаемый результат", tip: "Опишите, как должно работать: «чтобы…», «должна…»." },
    { key: "limit", name: "Ограничения", tip: "Скажите, что нельзя трогать: «не меняй дизайн», «только этот файл»." },
    { key: "format", name: "Формат ответа", tip: "Попросите, как ответить: «покажи код», «объясни по шагам»." },
  ];

  const COMMON = {
    ctx: /игр|сайт|страниц|html|javascript|\bjs\b|css|код|проект|приложен|браузер/i,
    goal: /чтобы|должн|нужно|надо|хочу|ожида/i,
    limit: /не меня|не трог|только|без |не лом|сохрани|остав/i,
    format: /покажи|напиши код|код цел|шаг|объясн|коммент|по пунктам|списком|пример/i,
  };
  const VAGUE = /сделай (хорошо|красиво|нормально)|как-нибудь|почини вс[её]|исправь вс[её]|сам разберись/i;

  function words(text) {
    return text.toLowerCase().match(/[а-яёa-z0-9]+/g) || [];
  }

  // level: { task: RegExp, extra?: RegExp }
  function grade(text, level) {
    const res = {
      task: level.task.test(text) && (!level.extra || level.extra.test(text)),
      ctx: COMMON.ctx.test(text),
      goal: COMMON.goal.test(text),
      limit: COMMON.limit.test(text),
      format: COMMON.format.test(text),
    };
    const w = words(text);
    const unique = new Set(w).size;
    const notes = [];

    let dmg = Object.values(res).filter(Boolean).length * 20;
    if (w.length < 8) { dmg = Math.min(dmg, 20); notes.push("Слишком коротко: ИИ придётся гадать."); }
    // Набор ключевых слов без связного текста: много повторов или почти нет «связок».
    if (w.length >= 8 && unique / w.length < 0.5) { dmg = Math.min(dmg, 40); notes.push("Много повторов. Пишите связно, как человеку."); }
    if (VAGUE.test(text)) { dmg = Math.max(0, dmg - 20); notes.push("Размытые слова вроде «сделай хорошо» ослабляют промт."); }
    if (!res.task) dmg = Math.min(dmg, 20);

    return { res, dmg, notes };
  }

  const api = { CRITERIA, grade };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Grader = api;
})(typeof window !== "undefined" ? window : globalThis);
