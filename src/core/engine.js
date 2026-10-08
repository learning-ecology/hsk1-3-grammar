/* =====================================================================
   Learning engine — selection of exercises, mastery, reviews, statistics.
   No DOM here.
   ===================================================================== */
(function (HSK) {
  'use strict';
  const St = HSK.Store;
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const visible = it => !St.s.teacher.hidden[it.id];

  function stageItems(l, stage) {
    const list = l.items.filter(it => it.stage === stage && visible(it));
    return list;
  }
  /* mastery of one grammar point, from every presentation of its items */
  function pointStats(pid) {
    let n = 0, first = 0, retry = 0, fail = 0;
    Object.values(HSK.items).forEach(it => {
      if (it.g !== pid) return;
      const r = St.s.items[it.id]; if (!r) return;
      n += r.n; first += r.first; retry += r.retry; fail += r.fail;
    });
    const acc = n ? (first + retry) / n : 0, firstAcc = n ? first / n : 0;
    let status = 'new';
    if (n) status = (acc >= 0.8 && firstAcc >= 0.6 && n >= 3) ? 'mastered' : (acc < 0.6 || firstAcc < 0.4) ? 'review' : 'learning';
    return { n, first, retry, fail, acc, firstAcc, status };
  }
  const STATUS = {
    new: { en: 'Not started', vi: 'Chưa học', cls: '' },
    learning: { en: 'Learning', vi: 'Đang học', cls: 'mid' },
    mastered: { en: 'Mastered', vi: 'Đã nắm vững', cls: 'ok' },
    review: { en: 'Needs review', vi: 'Cần ôn lại', cls: 'bad' }
  };
  function lessonProgress(l) {
    const L = St.s.lessons[l.id] || { st: {}, res: {} };
    const items = l.items.filter(visible);
    const done = items.filter(it => L.res[it.id]).length;
    return { done, total: items.length, pct: items.length ? done / items.length : 0, complete: !!L.done, stages: L.st || {} };
  }
  function currentLesson() {
    const last = St.s.last && HSK.lessonById[St.s.last.lesson];
    if (last && !(St.s.lessons[last.id] || {}).done) return last;
    return HSK.lessons.find(l => !(St.s.lessons[l.id] || {}).done) || HSK.lessons[HSK.lessons.length - 1];
  }
  /* review session: unlabelled mix, weighted toward the unit just finished, with recycling */
  function buildReview(r) {
    const pool = id => HSK.lessonById[id].items.filter(it => visible(it) && it.t !== 'short');
    const focus = shuffle(r.focus.flatMap(pool));
    const range = shuffle(r.lessons.filter(id => !r.focus.includes(id)).flatMap(pool));
    const old = shuffle((r.recycle || []).flatMap(pool));
    const nF = Math.round(r.n * (r.final ? 0.35 : 0.55)), nO = Math.round(r.n * (r.recycle.length ? 0.2 : 0));
    let out = focus.slice(0, nF).concat(old.slice(0, nO));
    out = out.concat(range.filter(x => !out.includes(x)).slice(0, r.n - out.length));
    if (out.length < r.n) out = out.concat(focus.filter(x => !out.includes(x)).slice(0, r.n - out.length));
    // spread item types: avoid long runs of the same type
    return shuffle(out).sort((a, b) => ['mc', 'pick', 'match', 'fill', 'dlg', 'spot', 'order', 'fix', 'complete', 'vi', 'en'].indexOf(a.t) - ['mc', 'pick', 'match', 'fill', 'dlg', 'spot', 'order', 'fix', 'complete', 'vi', 'en'].indexOf(b.t) + (Math.random() - 0.5) * 6);
  }
  function mistakeItems(onlyOpen) {
    return Object.entries(St.s.mistakes).filter(([id, m]) => HSK.items[id] && (!onlyOpen || !m.mastered))
      .sort((a, b) => (b[1].last || 0) - (a[1].last || 0)).map(([id]) => HSK.items[id]);
  }
  function weakItems(lv, n = 12) {
    const weak = Object.keys(HSK.points).filter(pid => { const s = pointStats(pid); return s.status === 'review' || s.status === 'learning'; })
      .filter(pid => !lv || HSK.points[pid].lesson.lv === lv);
    const items = Object.values(HSK.items).filter(it => weak.includes(it.g) && visible(it) && it.t !== 'short');
    return shuffle(items).slice(0, n);
  }
  function mixedItems(lv, n = 12) {
    const done = HSK.lessons.filter(l => l.lv === lv && Object.keys((St.s.lessons[l.id] || {}).res || {}).length);
    const src = (done.length ? done : HSK.lessons.filter(l => l.lv === lv).slice(0, 2)).flatMap(l => l.items.filter(it => visible(it) && it.t !== 'short'));
    return shuffle(src).slice(0, n);
  }
  function totals() {
    const t = St.s.tot;
    const pts = Object.keys(HSK.points).map(pointStats);
    const ms = Object.values(St.s.mistakes);
    return {
      lessonsDone: HSK.lessons.filter(l => (St.s.lessons[l.id] || {}).done).length,
      answered: t.pres, acc: t.pres ? (t.first + t.retry) / t.pres : 0, firstAcc: t.pres ? t.first / t.pres : 0,
      mastered: pts.filter(p => p.status === 'mastered').length, review: pts.filter(p => p.status === 'review').length,
      corrected: ms.filter(m => m.fixed).length, openMistakes: ms.filter(m => !m.mastered).length
    };
  }
  HSK.Engine = { shuffle, stageItems, pointStats, STATUS, lessonProgress, currentLesson, buildReview, mistakeItems, weakItems, mixedItems, totals, visible };
})(window.HSK);
