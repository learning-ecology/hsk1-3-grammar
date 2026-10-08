/* Validate course data: structure, answers, stages and VOCABULARY CONTROL. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = path.join(__dirname, '..', 'src');
global.window = global;
const run = f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
run(path.join(src, 'core/registry.js'));
fs.readdirSync(path.join(src, 'data')).filter(f => /^u\d+\.js$/.test(f)).sort().forEach(f => run(path.join(src, 'data', f)));
run(path.join(src, 'core/vocab.js'));
run(path.join(src, 'core/grader.js'));
HSK.index();
const G = HSK.Grader;
const E = [], W = [];
const err = (w, m) => E.push(`${w}: ${m}`), warn = (w, m) => W.push(`${w}: ${m}`);
const pair = x => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'string' && x[0] && x[1];
const seenWords = {};
HSK.lessons.forEach(l => {
  if (!l.words.length) warn(l.id, 'no new words');
  l.words.forEach(w => {
    if (w.length !== 4 || w.some(x => !x)) err(l.id, 'bad word entry ' + JSON.stringify(w));
    if (seenWords[w[0]]) warn(l.id, `word ${w[0]} already taught in ${seenWords[w[0]]}`); else seenWords[w[0]] = l.id;
  });
  if (!pair(l.goal)) err(l.id, 'goal missing');
  l.points.forEach(p => {
    ['id', 't', 'p', 'en', 'vi'].forEach(k => { if (!p[k]) err(p.id || l.id, 'point missing ' + k); });
    if (!pair(p.why)) err(p.id, 'why must be [en,vi]');
    if (!p.ex || p.ex.length < 2) err(p.id, 'needs ≥2 examples');
    (p.ex || []).forEach(e => { if (e.length < 3 || e.some(x => !x)) err(p.id, 'bad example ' + e[0]); });
    if (p.tip && !pair(p.tip)) err(p.id, 'tip must be [en,vi]');
    (p.mis || []).forEach(m => { if (m.length !== 4) err(p.id, 'mis needs [wrong,right,en,vi]'); });
    if (p.vis && p.vis.k === 'blocks') p.vis.rows.forEach(r => r.forEach(c => { if (!HSK.ROLES[c[1]]) err(p.id, 'unknown role ' + c[1]); }));
  });
  (l.compare || []).forEach(c => { if (!c.title || !c.rows || !c.rows.length) err(l.id, 'bad compare'); });
  if (l.dialog) l.dialog.lines.forEach(x => { if (x.length !== 4) err(l.id, 'dialog line needs [spk,zh,en,vi]'); });
  const stages = {};
  const qs = {};
  l.items.forEach(it => {
    const w = it.id;
    stages[it.stage] = (stages[it.stage] || 0) + 1;
    if (!HSK.TYPES[it.t]) err(w, 'unknown type ' + it.t);
    if (!HSK.points[it.g]) err(w, 'unknown point ' + it.g);
    if (!HSK.ERR[it.et]) err(w, 'unknown et ' + it.et);
    if (!it.h || it.h.length < 2 || !it.h.every(pair)) err(w, 'needs 2 hints [en,vi]');
    if (!pair(it.e)) err(w, 'explanation e must be [en,vi]');
    const key = it.t + '|' + (it.q || '') + '|' + JSON.stringify(it.o || it.c || it.d || it.pairs || it.seg);
    if (qs[key]) warn(w, 'duplicate of ' + qs[key]); qs[key] = w;
    switch (it.t) {
      case 'mc': case 'pick': case 'dlg':
        if (!it.o || it.a == null || it.a < 0 || it.a >= it.o.length) err(w, 'bad options/answer');
        if (it.o && new Set(it.o).size !== it.o.length) err(w, 'duplicate options');
        if (it.t === 'dlg' && (!it.d || it.d.filter(x => x[1] === null).length !== 1)) err(w, 'dialogue needs exactly one missing line');
        if (it.t === 'mc' && it.q && !/___/.test(it.q) && !it.ins) warn(w, 'mc without blank or instruction');
        if (it.of) Object.values(it.of).forEach(x => { if (!pair(x)) err(w, 'of must be [en,vi]'); });
        break;
      case 'match':
        if (!it.pairs || it.pairs.length < 3) err(w, 'match needs ≥3 pairs');
        break;
      case 'fill': {
        const n = (it.q.match(/_{3,}/g) || []).length;
        if (n !== it.a.length) err(w, `blanks ${n} ≠ answers ${it.a.length}`);
        if (it.bank) it.a.forEach(acc => { if (!it.bank.includes(acc[0])) err(w, 'bank lacks answer ' + acc[0]); });
        break; }
      case 'spot':
        if (!it.seg || it.a == null || !it.seg[it.a] || !it.fix) err(w, 'spot needs seg/a/fix');
        break;
      case 'order':
        if (!it.c || it.c.length < 2) err(w, 'order needs chunks');
        if (it.c && new Set(it.c).size !== it.c.length) warn(w, 'duplicate chunks');
        break;
      default:
        if (!it.a || !it.a.length) { err(w, 'open item needs answers'); break; }
        it.a.forEach(ans => {
          const r = G.grade(it, ans);
          if (r.ok !== true && !(it.t === 'short' && r.ok === null)) err(w, `accepted answer "${ans}" not accepted`);
          (it.bad || []).forEach(b => { if (new RegExp(b[0]).test(G.compact(ans))) err(w, `answer "${ans}" matches bad ${b[0]}`); });
          (it.req || []).forEach(spec => { if (!spec.split('|').some(x => G.norm(ans).includes(G.norm(x)))) err(w, `answer "${ans}" lacks req ${spec}`); });
        });
        (it.bad || []).forEach(b => { if (!pair(b[1])) err(w, 'bad feedback must be [en,vi]'); });
        if (it.t === 'fix' && it.a.some(a => G.norm(a) === G.norm(it.q))) err(w, 'fix answer equals the faulty sentence');
    }
  });
  HSK.PRACTICE_STAGES.forEach(s => { if (!stages[s]) err(l.id, 'no items in stage ' + s); });
});
/* Vocabulary control */
const V = HSK.Vocab.check();
V.forEach(r => err(`${r.lesson} [${r.where}]`, `untaught word(s) ${r.unknown.join(' ')} in “${r.text}”`));
const nItems = Object.keys(HSK.items).length;
console.log(`units ${HSK.units.length} lessons ${HSK.lessons.length} points ${Object.keys(HSK.points).length} items ${nItems} words ${Object.keys(HSK.Vocab.dict).length}`);
const types = {}; Object.values(HSK.items).forEach(i => types[i.t] = (types[i.t] || 0) + 1); console.log('types', JSON.stringify(types));
HSK.lessons.forEach(l => { if (process.argv.includes('-v')) console.log(l.id, 'words', l.words.length, 'items', l.items.length); });
console.log('ERRORS', E.length); E.slice(0, 80).forEach(x => console.log('  ' + x));
console.log('WARN', W.length); W.slice(0, 40).forEach(x => console.log('  ' + x));
process.exitCode = E.length ? 1 : 0;
