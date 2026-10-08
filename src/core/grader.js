/* =====================================================================
   Answer checking — pure functions, no DOM.
   grade(item, answer) → { ok: true | false | null, fb?:[en,vi], et?, … }
     true  = correct      false = incorrect (with feedback / category)
     null  = cannot be marked automatically → learner compares with the model
   ===================================================================== */
(function (HSK) {
  'use strict';
  const PUNCT = /[\s，。、；：？！“”‘’"'（）()《》…—\-–,.;:?!·~～]/g;
  function toHalf(s) { return s.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' '); }
  function norm(s) { return toHalf(String(s || '')).replace(PUNCT, '').toLowerCase(); }
  function compact(s) { return String(s || '').replace(/\s+/g, '').replace(/,/g, '，').replace(/\?/g, '？').replace(/\./g, '。'); }
  const alts = spec => String(spec).split('|');
  const matchAny = (n, list) => (list || []).some(a => norm(a) === n);

  function gradeChoice(item, idx) {
    if (idx === item.a) return { ok: true };
    return { ok: false, et: item.et, fb: item.of && item.of[idx] };
  }
  /* match: answer = array; answer[i] = index of the meaning chosen for pair i */
  function gradeMatch(item, ans) {
    const wrong = []; item.pairs.forEach((_, i) => { if (ans[i] !== i) wrong.push(i); });
    return wrong.length ? { ok: false, et: item.et, wrongIdx: wrong } : { ok: true };
  }
  function gradeFill(item, values) {
    const wrong = [];
    item.a.forEach((acc, i) => { if (!matchAny(norm(values[i]), acc)) wrong.push(i); });
    if (!wrong.length) return { ok: true };
    const r = { ok: false, et: item.et, wrongIdx: wrong };
    if (item.of) { const v = String(values[wrong[0]] || '').trim(); if (item.of[v]) r.fb = item.of[v]; }
    return r;
  }
  function gradeOrder(item, order) {
    const joined = norm(order.map(i => item.c[i]).join(''));
    if (matchAny(joined, [item.c.join('')].concat(item.alt || []))) return { ok: true };
    const mis = []; order.forEach((ci, pos) => { if (ci !== pos) mis.push(pos); });
    let firstOk = 0; while (firstOk < order.length && order[firstOk] === firstOk) firstOk++;
    return { ok: false, et: item.et || 'wo', misplaced: mis, firstOk };
  }
  function gradeOpen(item, text) {
    const n = norm(text);
    if (!n) return { ok: false, empty: true };
    if (item.t !== 'short' && matchAny(n, item.a)) return { ok: true };
    if (item.t === 'fix' && n === norm(item.q)) return { ok: false, et: item.et, fb: ["You haven't changed the sentence yet.", 'Bạn chưa sửa câu.'] };
    const c = compact(text);
    for (const b of item.bad || []) {
      try { if (new RegExp(b[0]).test(c)) return { ok: false, fb: b[1], et: b[2] || item.et }; } catch (e) { /* ignore */ }
    }
    const missing = (item.req || []).filter(spec => !alts(spec).some(a => n.includes(norm(a))));
    if (missing.length) return { ok: false, et: item.et, missing: missing.map(m => alts(m).join(' / ')) };
    if (item.t === 'short' && !/[㐀-鿿]/.test(text)) return { ok: false, fb: ['Please answer in Chinese characters.', 'Hãy trả lời bằng chữ Hán.'] };
    if (item.t === 'short' && matchAny(n, item.a)) return { ok: null, same: true };
    return { ok: null };
  }
  function grade(item, answer) {
    switch (item.t) {
      case 'mc': case 'pick': case 'dlg': case 'spot': return gradeChoice(item, answer);
      case 'match': return gradeMatch(item, answer);
      case 'fill': return gradeFill(item, answer);
      case 'order': return gradeOrder(item, answer);
      default: return gradeOpen(item, answer);
    }
  }
  function fillSentence(item, vals) { let i = 0; return item.q.replace(/_{3,}/g, () => vals[i++] || '___'); }
  function answerText(item) {
    switch (item.t) {
      case 'mc': return /_{3,}/.test(item.q || '') ? item.q.replace(/_{3,}/, item.o[item.a]) : item.o[item.a];
      case 'pick': return item.o[item.a];
      case 'dlg': return item.o[item.a];
      case 'spot': return item.fix;
      case 'match': return item.pairs.map(p => p[0]).join(' · ');
      case 'fill': return fillSentence(item, item.a.map(x => x[0]));
      case 'order': return item.c.join('');
      case 'complete': return /_{3,}/.test(item.q) ? item.q.replace(/_{3,}/, item.a[0]) : item.a[0];
      default: return item.a[0];
    }
  }
  HSK.Grader = { norm, compact, grade, answerText, fillSentence };
})(window.HSK);
