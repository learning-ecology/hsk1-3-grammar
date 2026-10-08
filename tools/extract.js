/* Export the vocabulary dictionary and every Chinese string shown to learners → tools/strings.json */
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = path.join(__dirname, '..', 'src');
global.window = global;
const run = f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
run(path.join(src, 'core/registry.js'));
fs.readdirSync(path.join(src, 'data')).filter(f => /^u\d+\.js$/.test(f)).sort().forEach(f => run(path.join(src, 'data', f)));
run(path.join(src, 'core/vocab.js'));
HSK.index();
const dict = {}; Object.values(HSK.Vocab.dict).forEach(e => dict[e.zh] = e.py);
const S = new Set();
const HAN = /[㐀-鿿]/;
HSK.lessons.forEach(l => {
  HSK.Vocab.strings(l).forEach(([, s]) => S.add(s));
  l.points.forEach(p => { if (p.vis && p.vis.rows) p.vis.rows.forEach(r => r.forEach(c => S.add(c[0]))); (p.ex || []).forEach(e => S.add(e[0])); });
  (l.compare || []).forEach(c => c.rows.forEach(r => { S.add(r[2]); S.add(r[3]); }));
  l.words.forEach(w => S.add(w[0]));
  l.items.forEach(it => { (it.c || []).forEach(c => S.add(c)); (it.seg || []).forEach(c => S.add(c)); (it.bank || []).forEach(c => S.add(c)); });
});
const strings = [...S].filter(s => HAN.test(s));
fs.writeFileSync(path.join(__dirname, 'strings.json'), JSON.stringify({ dict, strings }, null, 0));
console.log('dict', Object.keys(dict).length, 'strings', strings.length);
