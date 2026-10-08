/* =====================================================================
   Progress storage — localStorage with an in-memory fallback.
   Holds learner progress, learner settings and (separately) teacher settings.
   ===================================================================== */
(function (HSK) {
  'use strict';
  const KEY = 'hsk13-grammar-v1';
  const MASTER_STREAK = 2;   // correct first-try answers in a row that mark a mistake as mastered

  function blank() {
    return {
      v: 1,
      settings: { theme: 'auto', fs: 1, py: 'auto', en: true, vi: true },
      teacher: { pyAllow: true, trAllow: true, showAnswer: true, retry: true, shuffle: true, present: false, hidden: {}, lessonPy: {} },
      lessons: {},   // lid → { st:{stage:1}, done, res:{itemId:'first'|'retry'|'fail'} }
      items: {},     // itemId → { n, first, retry, fail, streak, last }
      mistakes: {},  // itemId → { ans, att, et, wrong, first, last, streak, mastered, fixed }
      tot: { att: 0, attOk: 0, pres: 0, first: 0, retry: 0, fail: 0 },
      reviews: {},   // reviewId → best %
      history: [],
      last: null     // { lesson, stage }
    };
  }
  let S = blank(), mem = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw), b = blank();
      S = Object.assign(b, d);
      S.settings = Object.assign(b.settings, d.settings || {});
      S.teacher = Object.assign(blank().teacher, d.teacher || {});
      S.tot = Object.assign(blank().tot, d.tot || {});
    }
  } catch (e) { mem = true; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { mem = true; } }

  const Store = {
    get s() { return S; }, save, MASTER_STREAK,
    memoryOnly() { return mem; },
    setting(k, v) { if (v === undefined) return S.settings[k]; S.settings[k] = v; save(); },
    teacher(k, v) { if (v === undefined) return S.teacher[k]; S.teacher[k] = v; save(); },
    lesson(lid) { return S.lessons[lid] || (S.lessons[lid] = { st: {}, done: false, res: {} }); },
    markStage(lid, st) { const L = Store.lesson(lid); if (!L.st[st]) { L.st[st] = 1; save(); } },
    setLast(lid, stage) { S.last = { lesson: lid, stage }; save(); },
    completeLesson(lid) { Store.lesson(lid).done = true; save(); },
    attempt(ok) { S.tot.att++; if (ok) S.tot.attOk++; save(); },

    /* result: 'first' | 'retry' | 'fail'; info: { inLesson, att, ans, et } */
    resolve(item, result, info = {}) {
      const r = S.items[item.id] || (S.items[item.id] = { n: 0, first: 0, retry: 0, fail: 0, streak: 0, last: 0 });
      r.n++; r[result]++; r.last = Date.now();
      S.tot.pres++; S.tot[result]++;
      if (info.inLesson) Store.lesson(item.lesson).res[item.id] = result;
      const m = S.mistakes[item.id];
      if (result === 'first') {
        r.streak++;
        if (m && !m.mastered) { m.streak++; m.fixed = true; if (m.streak >= MASTER_STREAK) { m.mastered = true; m.masteredAt = Date.now(); } }
      } else {
        r.streak = 0;
        const mm = m || (S.mistakes[item.id] = { wrong: 0, streak: 0, mastered: false, first: Date.now() });
        mm.wrong++; mm.att = info.att || mm.att; mm.et = info.et || item.et; mm.last = Date.now(); mm.streak = 0; mm.mastered = false;
        if (info.ans) mm.ans = info.ans;
        if (result === 'retry') mm.fixed = true;
      }
      if (m && result !== 'fail') m.fixed = true;
      save();
    },
    clearLessonResults(lid, stage) {
      const L = Store.lesson(lid);
      Object.keys(L.res).forEach(id => { if (!stage || (HSK.items[id] && HSK.items[id].stage === stage)) delete L.res[id]; });
      save();
    },
    addHistory(h) {
      S.history.unshift(Object.assign({ ts: Date.now() }, h)); S.history = S.history.slice(0, 100);
      if (h.review) S.reviews[h.id] = Math.max(S.reviews[h.id] || 0, Math.round(100 * h.score / Math.max(1, h.total)));
      save();
    },
    exportJSON() { return JSON.stringify(S); },
    importJSON(t) { const d = JSON.parse(t); if (!d || !d.tot) throw new Error('bad'); S = Object.assign(blank(), d); save(); },
    reset() { const keepS = S.settings, keepT = S.teacher; S = blank(); S.settings = keepS; S.teacher = keepT; save(); }
  };
  HSK.Store = Store;
})(window.HSK);
