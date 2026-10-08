/* =====================================================================
   Vocabulary control
   ---------------------------------------------------------------------
   Every lesson declares the NEW words it teaches (lesson.words).
   A lesson may use: words of this lesson + words of all earlier lessons.
   segment() splits Chinese text into known words (dynamic programming,
   fewest words wins). Characters that cannot be covered are reported,
   so any example or exercise that uses an untaught word is caught.
   Used by: the build-time validator (Node) and the Teacher → Vocabulary check.
   ===================================================================== */
(function (HSK) {
  'use strict';
  const HAN = /[㐀-鿿]/;
  let dict = null, maxLen = 1;

  function build() {
    dict = {}; maxLen = 1;
    HSK.lessons.forEach(l => (l.words || []).forEach(w => {
      if (!dict[w[0]]) dict[w[0]] = { zh: w[0], py: w[1], en: w[2], vi: w[3], lesson: l.id, idx: l.idx, lv: l.lv };
      maxLen = Math.max(maxLen, w[0].length);
    }));
    return dict;
  }
  function D() { return dict || build(); }

  /* words allowed at a lesson (by index): everything introduced up to and including it */
  const allowedCache = {};
  function allowed(idx) {
    if (allowedCache[idx]) return allowedCache[idx];
    const s = new Set();
    Object.values(D()).forEach(e => { if (e.idx <= idx) s.add(e.zh); });
    return (allowedCache[idx] = s);
  }

  /* DP segmentation. Unknown Chinese characters cost a lot, so they only
     appear when no known word covers them. Returns tokens with flags. */
  function segment(text, set) {
    set = set || new Set(Object.keys(D()));
    const s = String(text), n = s.length;
    const cost = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(-1), kind = new Array(n + 1);
    cost[0] = 0;
    for (let i = 0; i < n; i++) {
      if (cost[i] === Infinity) continue;
      const ch = s[i];
      if (!HAN.test(ch)) { // pass-through run of non-Chinese characters
        let j = i; while (j < n && !HAN.test(s[j])) j++;
        if (cost[i] < cost[j]) { cost[j] = cost[i]; prev[j] = i; kind[j] = 'x'; }
        continue;
      }
      for (let L = Math.min(maxLen, n - i); L >= 1; L--) {
        const w = s.substr(i, L);
        if (set.has(w) && cost[i] + 1 < cost[i + L]) { cost[i + L] = cost[i] + 1; prev[i + L] = i; kind[i + L] = 'w'; }
      }
      if (cost[i] + 1000 < cost[i + 1]) { cost[i + 1] = cost[i] + 1000; prev[i + 1] = i; kind[i + 1] = 'u'; }
    }
    const out = []; let j = n;
    while (j > 0) { const i = prev[j]; out.unshift({ t: s.slice(i, j), k: kind[j] }); j = i; }
    return out;
  }
  function unknownIn(text, idx) {
    return segment(text, allowed(idx)).filter(t => t.k === 'u').map(t => t.t);
  }

  /* All Chinese strings a lesson shows to learners (examples, exercises, answers) */
  function strings(l) {
    const out = [];
    const add = (where, s) => { if (s && HAN.test(String(s))) out.push([where, String(s)]); };
    l.points.forEach(p => {
      (p.ex || []).forEach(e => add(p.id + ' example', e[0]));
      (p.mis || []).forEach(m => { add(p.id + ' mistake', m[0]); add(p.id + ' mistake', m[1]); });
      if (p.vis && p.vis.rows) p.vis.rows.forEach(r => add(p.id + ' visual', r.map(c => c[0]).join('')));
      if (p.vis && p.vis.marks) p.vis.marks.forEach(m => add(p.id + ' timeline', m[1]));
    });
    (l.compare || []).forEach(c => { (c.ex || []).forEach(e => e.forEach(x => add('compare', x))); c.rows.forEach(r => { add('compare', r[2]); add('compare', r[3]); }); });
    if (l.dialog) l.dialog.lines.forEach(x => add('dialogue', x[1]));
    l.items.forEach(it => {
      const w = it.id;
      add(w, it.q); (it.o || []).forEach(o => add(w, o)); (it.c || []).forEach(c => add(w, c));
      (it.seg || []).forEach(x => add(w, x));
      add(w, it.fix); (it.alt || []).forEach(a => add(w, a));
      (it.bank || []).forEach(b => add(w, b));
      (it.pairs || []).forEach(p => add(w, p[0]));
      (it.d || []).forEach(x => add(w, x[1]));
      (it.pic || []).forEach(x => add(w, x[1]));
      if (Array.isArray(it.a)) it.a.forEach(a => Array.isArray(a) ? a.forEach(x => add(w + ' answer', x)) : add(w + ' answer', a));
    });
    return out;
  }

  /* Report: [{lesson, where, text, unknown}] */
  function check(lessons) {
    const rep = [];
    (lessons || HSK.lessons).forEach(l => strings(l).forEach(([where, s]) => {
      const u = unknownIn(s, l.idx);
      if (u.length) rep.push({ lesson: l.id, where, text: s, unknown: [...new Set(u)] });
    }));
    return rep;
  }

  function lookup(w) { return D()[w] || null; }
  function known(idx) { return Object.values(D()).filter(e => e.idx <= idx); }

  HSK.Vocab = { build, segment, allowed, unknownIn, strings, check, lookup, known, get dict() { return D(); } };
})(window.HSK);
