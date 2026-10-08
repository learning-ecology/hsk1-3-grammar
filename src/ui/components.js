/* =====================================================================
   UI components — DOM helper, speech, pinyin/translation display,
   and the exercise card with the corrective feedback cycle:
   Attempt → Hint → Retry → Stronger hint → Retry → Answer + explanation
   ===================================================================== */
(function (HSK) {
  'use strict';
  const G = HSK.Grader, St = HSK.Store;
  const MAX_WRONG = 3;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  function toast(msg) { const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  const T = St.s.teacher;
  const trOK = () => St.s.teacher.trAllow !== false;
  const showEn = () => trOK() && St.setting('en') !== false;
  const showVi = () => trOK() && St.setting('vi') !== false;
  /* bilingual line: English, then Vietnamese (each can be hidden by the learner) */
  function bi(pair, cls) {
    if (!pair) return null;
    const [e, v] = Array.isArray(pair) ? pair : [pair, null];
    return h('div', { class: 'bi ' + (cls || '') }, e && St.setting('en') !== false ? h('div', { class: 'en' }, e) : null, v && St.setting('vi') !== false ? h('div', { class: 'vi' }, v) : null,
      (St.setting('en') === false && St.setting('vi') === false && e) ? h('div', { class: 'en' }, e) : null);
  }
  /* instructions are always shown (in both languages unless the learner hid one) */
  const inst = (e, v) => h('div', { class: 'inst' }, h('span', null, e), St.setting('vi') !== false ? h('span', { class: 'vi' }, ' · ' + v) : null);

  /* ---------- speech ---------- */
  const TTS = {
    ok: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined', voice: null,
    pick() { if (!TTS.ok) return; const vs = speechSynthesis.getVoices(); TTS.voice = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null; },
    speak(text, slow) {
      if (!TTS.ok) { toast('Speech is not available in this browser.'); return; }
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text).replace(/_{3,}/g, '什么').replace(/[—–❌✅]/g, ' '));
        u.lang = 'zh-CN'; u.rate = slow ? 0.55 : 0.85; if (TTS.voice) u.voice = TTS.voice;
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    }
  };
  if (TTS.ok) { TTS.pick(); try { speechSynthesis.onvoiceschanged = TTS.pick; } catch (e) { } }
  function speakBtn(text, slow) {
    if (!text) return null;
    return h('button', { class: 'speak' + (slow ? ' slow' : ''), type: 'button', 'aria-label': slow ? 'Listen slowly' : 'Listen', title: slow ? 'Slow · Chậm' : 'Listen · Nghe',
      onclick: e => { e.stopPropagation(); TTS.speak(text, slow); } }, slow ? '🐢' : '🔊');
  }

  /* ---------- pinyin policy ---------- */
  /* ctx: 'learn' (explanations/examples) | 'ex' (exercises). Returns 'show' | 'tap' | 'hide' */
  function pyMode(lv, lid, ctx) {
    const t = St.s.teacher;
    if (!t.pyAllow) return 'hide';
    const o = lid && t.lessonPy[lid];
    if (o === 'off') return 'hide';
    if (o === 'on') return 'show';
    const s = St.setting('py');
    if (s === 'on') return 'show';
    if (s === 'off') return 'hide';
    if (lv <= 1) return 'show';
    if (lv === 2) return ctx === 'learn' ? 'show' : 'tap';
    return 'tap';
  }
  function pyEl(zh, mode) {
    if (mode === 'hide') return null;
    const p = HSK.PY[zh]; if (!p) return null;
    return h('span', { class: 'py' + (mode === 'tap' ? ' tapable' : '') }, p);
  }
  /* Chinese text with pinyin under it (and optional 🔊) */
  function zh(text, mode, opts = {}) {
    return h(opts.tag || 'div', { class: 'zhw' + (opts.big ? ' big' : '') + (opts.cls ? ' ' + opts.cls : '') },
      h('span', { class: 'zhline' }, h('span', { class: 'zh' }, text), opts.speak ? speakBtn(text) : null, opts.slow ? speakBtn(text, true) : null),
      pyEl(text, mode));
  }
  /* a toggle that reveals tap-mode pinyin inside a container */
  function pyToggle(container) {
    const b = h('button', { class: 'pill py-toggle', type: 'button', 'aria-pressed': 'false', onclick: () => {
      const on = container.classList.toggle('reveal-py'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '拼音 ✓' : '拼音';
    } }, '拼音');
    return b;
  }

  function pointOf(item) { return HSK.points[item.g]; }
  function errChip(et) { const e = HSK.ERR[et]; return e ? h('span', { class: 'chip err' }, e.en, St.setting('vi') !== false ? ' · ' + e.vi : '') : null; }
  function picStrip(pic, mode, hideZh) {
    if (!pic) return null;
    if (hideZh) pic = pic.map(([e, l]) => [e, l && /[\u3400-\u9fff]/.test(l) ? '' : l]);
    return h('div', { class: 'pics', 'aria-hidden': 'true' }, pic.map(([e, l], i) => [i ? h('span', { class: 'pic-arrow' }, '→') : null,
      h('div', { class: 'pic' }, h('div', { class: 'emo' }, e), l ? (/[㐀-鿿]/.test(l) ? zh(l, mode === 'hide' ? 'hide' : 'show', { cls: 'small' }) : h('div', { class: 'lbl' }, l)) : null)]));
  }

  const PRAISE = [['Correct!', 'Đúng rồi!'], ['Great work!', 'Làm tốt lắm!'], ['Excellent!', 'Tuyệt vời!'], ['Well done!', 'Giỏi lắm!']];
  const INST = {
    mc: ['Choose the best answer.', 'Chọn đáp án đúng.'], pick: ['Which sentence is correct?', 'Câu nào đúng?'], match: ['Tap a Chinese phrase, then its meaning.', 'Chạm vào cụm tiếng Trung, rồi chạm nghĩa của nó.'],
    fill: ['Fill in the blank.', 'Điền vào chỗ trống.'], spot: ['Tap the part that is wrong.', 'Chạm vào phần bị sai.'], order: ['Put the blocks in the right order.', 'Sắp xếp các khối theo đúng thứ tự.'],
    dlg: ['Choose the best reply.', 'Chọn câu đáp phù hợp nhất.'], fix: ['Correct the sentence (edit it directly).', 'Sửa câu sai (sửa trực tiếp).'], complete: ['Complete the sentence.', 'Hoàn thành câu.'],
    vi: ['Translate into Chinese.', 'Dịch sang tiếng Trung.'], en: ['Translate into Chinese.', 'Dịch sang tiếng Trung.'], short: ['Answer about yourself in Chinese.', 'Trả lời về bản thân bằng tiếng Trung.']
  };

  /* ---------- exercise card ---------- */
  /* opts: { num, total, inLesson, onDone(result), review } */
  function renderItem(item, opts = {}) {
    const lid = item.lesson, lv = item.lv;
    const mode = pyMode(lv, lid, 'ex');
    const card = h('div', { class: 'item t-' + item.t, 'data-id': item.id });
    const resChip = h('span', { class: 'res' });
    const type = HSK.TYPES[item.t];
    card.appendChild(h('div', { class: 'item-head' },
      h('span', { class: 'type' }, type[0], St.setting('vi') !== false ? h('span', { class: 'vi' }, ' · ' + type[1]) : null),
      mode === 'tap' ? pyToggle(card) : null, resChip));
    const ins = item.ins ? (Array.isArray(item.ins) ? item.ins : [item.ins, INST[item.t][1]]) : INST[item.t];
    card.appendChild(inst(ins[0], ins[1]));
    if (item.pic) card.appendChild(picStrip(item.pic, mode, item.t === 'order'));

    let wrongs = 0, done = false, lastAns = '', lastEt = null;
    const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    const actions = h('div', { class: 'actions' });
    const retryAllowed = () => St.s.teacher.retry !== false;
    const maxWrong = () => retryAllowed() ? MAX_WRONG : 1;

    function finish(result) {
      done = true;
      card.classList.add(result === 'fail' ? 'st-fail' : 'st-ok');
      const map = { first: ['ok', '✓ First try'], retry: ['mid', `✓ Try ${wrongs + 1}`], fail: ['bad', 'Answer shown'] };
      resChip.innerHTML = ''; resChip.appendChild(h('span', { class: 'chip ' + map[result][0] }, map[result][1]));
      St.resolve(item, result, { inLesson: !!opts.inLesson, att: wrongs + (result === 'fail' ? 0 : 1), ans: lastAns, et: lastEt || item.et });
      body.lock && body.lock();
      actions.innerHTML = '';
      opts.onDone && opts.onDone(result, item);
    }
    function answerBlock(label) {
      const txt = G.answerText(item);
      return h('div', { class: 'ans-line' }, h('div', { class: 'tag' }, label), zh(txt, mode === 'hide' ? 'hide' : 'show', { speak: true, big: true }));
    }
    function why() { return h('div', { class: 'why' }, h('div', { class: 'tag' }, 'Why? · Vì sao?'), bi(item.e)); }
    function showCorrect() {
      const p = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      fb.innerHTML = '';
      fb.appendChild(h('div', { class: 'fb-box ok' },
        h('div', { class: 'fb-title' }, '✅ ', wrongs ? 'Correct! · Đúng rồi!' : p[0] + (St.setting('vi') !== false ? ' · ' + p[1] : '')),
        item.t !== 'match' ? answerBlock('Answer · Đáp án') : null, why()));
      finish(wrongs === 0 ? 'first' : 'retry');
    }
    function reveal() {
      fb.innerHTML = '';
      fb.appendChild(h('div', { class: 'fb-box reveal' },
        h('div', { class: 'fb-title' }, 'Here is the answer · Đáp án đây'),
        lastAns && item.t !== 'match' ? h('div', { class: 'your' }, h('span', { class: 'tag' }, 'You wrote · Bạn trả lời'), ' ', h('span', { class: 'zh strike' }, lastAns)) : null,
        (lastEt || item.et) ? h('div', { class: 'cat' }, h('span', { class: 'tag' }, 'Mistake type · Loại lỗi'), ' ', errChip(lastEt || item.et)) : null,
        answerBlock(item.t === 'fix' || item.t === 'spot' ? 'Correct sentence · Câu đúng' : 'Answer · Đáp án'), why()));
      body.showAnswer && body.showAnswer();
      finish('fail');
    }
    function wrong(res, ansText) {
      wrongs++; lastAns = ansText; lastEt = res.et || item.et; St.attempt(false);
      if (wrongs >= maxWrong()) { reveal(); return; }
      const hints = item.h;
      const lines = [];
      if (res.fb) lines.push(bi(res.fb, 'spec'));
      if (res.missing) lines.push(h('div', { class: 'spec' }, wrongs >= 2 ? 'Your answer should use: ' + res.missing.join(', ') : 'Use the grammar from this lesson.', St.setting('vi') !== false ? h('div', { class: 'vi' }, wrongs >= 2 ? 'Câu trả lời cần dùng: ' + res.missing.join(', ') : 'Hãy dùng ngữ pháp của bài này.') : null));
      if (res.misplaced && res.misplaced.length) lines.push(h('div', { class: 'spec' }, `${res.misplaced.length} block(s) are in the wrong place (marked).`, St.setting('vi') !== false ? h('div', { class: 'vi' }, `${res.misplaced.length} khối đang sai vị trí (đã đánh dấu).`) : null));
      if (res.wrongIdx && item.t === 'match') lines.push(h('div', { class: 'spec' }, `${res.wrongIdx.length} pair(s) are not right yet.`, St.setting('vi') !== false ? h('div', { class: 'vi' }, `${res.wrongIdx.length} cặp chưa đúng.`) : null));
      fb.innerHTML = '';
      fb.appendChild(h('div', { class: 'fb-box bad' },
        h('div', { class: 'fb-title' }, wrongs === 1 ? '❌ Not quite. · Chưa đúng.' : '🤏 Almost! · Gần đúng rồi!'),
        lines,
        h('div', { class: 'hint' + (wrongs >= 2 ? ' strong' : '') }, h('div', { class: 'tag' }, wrongs >= 2 ? 'Stronger hint · Gợi ý thêm' : 'Hint · Gợi ý'), bi(hints[Math.min(wrongs - 1, hints.length - 1)])),
        h('div', { class: 'small muted' }, wrongs >= 2 ? 'Last try. · Lần thử cuối.' : 'Try again. · Thử lại nhé.')));
      actions.innerHTML = '';
      actions.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: () => { fb.innerHTML = ''; body.retry(); } }, 'Try again · Thử lại'));
      if (St.s.teacher.showAnswer !== false) actions.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: reveal }, 'Show answer · Xem đáp án'));
      body.afterWrong && body.afterWrong(res);
    }
    function compare(ansText, same) {
      lastAns = ansText;
      fb.innerHTML = '';
      const box = h('div', { class: 'fb-box compare' },
        h('div', { class: 'fb-title' }, item.t === 'short' ? '✍️ Compare with the model · So sánh với đáp án mẫu' : '⚖️ Compare with the model · So sánh với đáp án mẫu'),
        h('div', { class: 'small' }, item.t === 'short'
          ? ['Personal answers can be different. Check that your sentence uses the grammar correctly.', 'Câu trả lời cá nhân có thể khác nhau. Hãy kiểm tra xem bạn dùng ngữ pháp đúng chưa.'][St.setting('vi') !== false && St.setting('en') === false ? 1 : 0]
          : ['Your answer is different from the stored answers. It may still be correct — compare carefully.', 'Câu của bạn khác đáp án lưu sẵn. Có thể vẫn đúng — hãy so sánh kỹ.'][St.setting('vi') !== false && St.setting('en') === false ? 1 : 0]),
        h('div', { class: 'cmp-row' }, h('div', { class: 'tag' }, 'Your answer · 你的回答'), h('div', { class: 'zh' }, ansText)),
        h('div', { class: 'cmp-row model' }, h('div', { class: 'tag' }, 'Model answer · 参考答案'), item.a.slice(0, 3).map(a => zh(a, mode === 'hide' ? 'hide' : 'show', { speak: true }))),
        why());
      fb.appendChild(box);
      actions.innerHTML = '';
      actions.appendChild(h('button', { class: 'btn primary', type: 'button', onclick: () => { St.attempt(true); finish(wrongs === 0 ? 'first' : 'retry'); box.appendChild(h('div', { class: 'chip ok' }, '✓ Checked · Đã kiểm tra')); } }, 'Mine is correct · Câu của tôi đúng'));
      actions.appendChild(h('button', { class: 'btn', type: 'button', onclick: () => wrong({ et: item.et }, ansText) }, 'Mine has a mistake · Câu của tôi có lỗi'));
    }
    const api = {
      submit(answer, display) {
        if (done) return;
        const res = G.grade(item, answer);
        if (res.empty) { toast('Write an answer first. · Hãy viết câu trả lời.'); return; }
        if (res.ok === true) { St.attempt(true); showCorrect(); }
        else if (res.ok === null) compare(display, res.same);
        else wrong(res, display);
      }
    };
    const body = buildBody(item, api, mode);
    card.appendChild(body.el);
    card.appendChild(actions);
    card.appendChild(fb);
    if (body.checkBtn) actions.appendChild(body.checkBtn);
    const origRetry = body.retry;
    body.retry = () => { actions.innerHTML = ''; if (body.checkBtn) actions.appendChild(body.checkBtn); origRetry && origRetry(); };
    return card;
  }

  function buildBody(item, api, mode) {
    switch (item.t) {
      case 'mc': case 'pick': case 'dlg': return choiceBody(item, api, mode);
      case 'match': return matchBody(item, api, mode);
      case 'fill': return fillBody(item, api, mode);
      case 'spot': return spotBody(item, api, mode);
      case 'order': return orderBody(item, api, mode);
      default: return openBody(item, api, mode);
    }
  }
  function qLine(q, mode) {
    if (!q) return null;
    const parts = q.split(/(_{3,})/);
    const line = h('div', { class: 'q zh' }, parts.map(p => /_{3,}/.test(p) ? h('span', { class: 'gap' }, ' ') : p), ' ', speakBtn(q));
    return h('div', { class: 'qwrap' }, line, pyEl(q, mode));
  }

  function choiceBody(item, api, mode) {
    const el = h('div');
    if (item.t === 'dlg') {
      el.appendChild(h('div', { class: 'dialog' }, item.d.map(([s, t]) => h('div', { class: 'dl' + (t === null ? ' missing' : '') },
        h('span', { class: 'spk' }, s), t === null ? h('span', { class: 'dots' }, '？…') : zh(t, mode, { speak: true })))));
    } else if (item.q) el.appendChild(qLine(item.q, mode));
    const order = St.s.teacher.shuffle !== false ? HSK.Engine.shuffle(item.o.map((_, i) => i)) : item.o.map((_, i) => i);
    const opts = h('div', { class: 'opts' + (item.t === 'pick' || item.t === 'dlg' ? ' col' : '') });
    let locked = false;
    const btns = order.map((oi, k) => {
      const b = h('button', { class: 'opt', type: 'button', onclick: () => { if (locked) return; if (oi !== item.a) { b.classList.add('wrong'); b.disabled = true; } api.submit(oi, item.o[oi]); } },
        h('span', { class: 'l' }, 'ABCD'[k]), zh(item.o[oi], mode));
      b.dataset.i = oi; opts.appendChild(b); return b;
    });
    el.appendChild(opts);
    return { el, retry() { }, lock() { locked = true; btns.forEach(b => { b.disabled = true; if (+b.dataset.i === item.a) b.classList.add('right'); }); }, showAnswer() { btns.forEach(b => { if (+b.dataset.i === item.a) b.classList.add('right'); }); } };
  }

  function matchBody(item, api, mode) {
    const n = item.pairs.length;
    const right = HSK.Engine.shuffle([...Array(n).keys()]);
    const ans = new Array(n).fill(null);
    let sel = null, locked = false;
    const colors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
    const L = item.pairs.map((p, i) => h('button', { class: 'm-l', type: 'button', onclick: () => { if (locked) return; sel = i; draw(); } }, zh(p[0], mode, { speak: false })));
    const R = right.map(ri => h('button', { class: 'm-r', type: 'button', onclick: () => {
      if (locked || sel === null) { if (sel === null) toast('Tap a Chinese phrase first. · Chạm vào cụm tiếng Trung trước.'); return; }
      for (let k = 0; k < n; k++) if (ans[k] === ri) ans[k] = null;
      ans[sel] = ri; sel = ans.findIndex(x => x === null); if (sel < 0) sel = null; draw();
    } }, item.pairs[ri][1] && St.setting('en') !== false ? h('div', { class: 'en' }, item.pairs[ri][1]) : null, item.pairs[ri][2] && (St.setting('vi') !== false || St.setting('en') === false) ? h('div', { class: 'vi' }, item.pairs[ri][2]) : null));
    R.forEach((b, k) => b.dataset.ri = right[k]);
    function draw() {
      L.forEach((b, i) => { b.className = 'm-l' + (sel === i ? ' sel' : '') + (ans[i] !== null ? ' ' + colors[i] : ''); });
      R.forEach(b => { const ri = +b.dataset.ri; const li = ans.indexOf(ri); b.className = 'm-r' + (li >= 0 ? ' ' + colors[li] : ''); });
    }
    sel = 0; draw();
    const el = h('div', { class: 'match' }, h('div', { class: 'm-col' }, L), h('div', { class: 'm-col' }, R));
    return {
      el, checkBtn: h('button', { class: 'btn primary', type: 'button', onclick: () => { if (ans.some(x => x === null)) { toast('Match every phrase first. · Hãy nối hết các cặp.'); return; } api.submit(ans.slice(), ''); } }, 'Check · Kiểm tra'),
      retry() { sel = ans.findIndex(x => x === null); if (sel < 0) sel = null; draw(); },
      afterWrong(res) { (res.wrongIdx || []).forEach(i => { ans[i] = null; }); sel = ans.findIndex(x => x === null); draw(); },
      lock() { locked = true; for (let i = 0; i < n; i++) ans[i] = i; sel = null; draw(); L.concat(R).forEach(b => b.disabled = true); },
      showAnswer() { }
    };
  }

  function fillBody(item, api, mode) {
    const parts = item.q.split(/_{3,}/);
    const n = parts.length - 1;
    const vals = new Array(n).fill('');
    const bank = item.bank ? (St.s.teacher.shuffle !== false ? HSK.Engine.shuffle(item.bank) : item.bank) : null;
    const slots = [], inputs = [];
    const line = h('div', { class: 'q zh' });
    parts.forEach((p, i) => {
      line.appendChild(document.createTextNode(p));
      if (i < n) {
        if (bank) { const s = h('button', { class: 'slot', type: 'button', 'aria-label': 'Blank ' + (i + 1), onclick: () => { vals[i] = ''; draw(); } }, ' '); slots.push(s); line.appendChild(s); }
        else {
          const inp = h('input', { class: 'blank', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Blank ' + (i + 1), onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); check(); } }, oninput: () => inp.classList.remove('bad') });
          inputs.push(inp); line.appendChild(inp);
        }
      }
    });
    line.appendChild(document.createTextNode(' ')); line.appendChild(speakBtn(G.fillSentence(item, item.a.map(() => '什么'))));
    const chips = bank ? h('div', { class: 'bank' }, bank.map(w => h('button', { class: 'chipbtn', type: 'button', onclick: () => { const k = vals.indexOf(''); if (k < 0) return; vals[k] = w; draw(); } }, zh(w, mode)))) : null;
    function draw() { slots.forEach((s, i) => { s.textContent = vals[i] || ' '; s.classList.toggle('filled', !!vals[i]); s.classList.remove('bad'); }); }
    function check() {
      const v = bank ? vals.slice() : inputs.map(i => i.value.trim());
      if (v.some(x => !x)) { toast('Fill every blank. · Hãy điền hết chỗ trống.'); return; }
      api.submit(v, G.fillSentence(item, v));
    }
    return {
      el: h('div', null, h('div', { class: 'qwrap' }, line, pyEl(item.q, mode)), chips),
      checkBtn: h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Check · Kiểm tra'),
      retry() { if (!bank && inputs[0]) (inputs.find(i => i.classList.contains('bad')) || inputs[0]).focus(); },
      afterWrong(res) { (res.wrongIdx || []).forEach(i => { if (bank) { vals[i] = ''; draw(); slots[i].classList.add('bad'); } else inputs[i].classList.add('bad'); }); },
      lock() { if (bank) { item.a.forEach((a, i) => vals[i] = a[0]); draw(); slots.forEach(s => { s.disabled = true; s.classList.add('good'); }); chips && chips.querySelectorAll('button').forEach(b => b.disabled = true); } else inputs.forEach((inp, i) => { inp.value = item.a[i][0]; inp.disabled = true; inp.classList.add('good'); }); }
    };
  }

  function spotBody(item, api, mode) {
    const segs = h('div', { class: 'segs' });
    const btns = item.seg.map((s, i) => {
      if (/^[。？！，]$/.test(s)) { segs.appendChild(h('span', { class: 'zh punct' }, s)); return null; }
      const b = h('button', { class: 'seg', type: 'button', onclick: () => { if (i !== item.a) { b.classList.add('wrong'); b.disabled = true; } api.submit(i, s); } }, zh(s, mode));
      segs.appendChild(b); return b;
    });
    return { el: h('div', null, segs, h('div', { class: 'small muted' }, speakBtn(item.seg.join('')), ' ', 'Listen to the sentence · Nghe câu')), retry() { },
      lock() { btns.forEach((b, i) => { if (!b) return; b.disabled = true; if (i === item.a) b.classList.add('right'); }); }, showAnswer() { btns[item.a] && btns[item.a].classList.add('right'); } };
  }

  const OPEN_SRC = { vi: 'Tiếng Việt', en: 'English' };
  function openBody(item, api, mode) {
    const el = h('div');
    if (item.t === 'vi' || item.t === 'en') el.appendChild(h('div', { class: 'src' }, h('div', { class: 'tag' }, OPEN_SRC[item.t]), h('div', { class: 'src-text' }, item.q)));
    else if (item.t === 'fix') el.appendChild(h('div', { class: 'src wrong' }, h('div', { class: 'tag' }, '❌ Wrong sentence · Câu sai'), zh(item.q, mode, { speak: false })));
    else if (item.t === 'complete') el.appendChild(qLine(item.q, mode));
    else if (item.t === 'short') el.appendChild(h('div', { class: 'src' }, /[㐀-鿿]/.test(item.q) && !/[A-Za-z]{3,}/.test(item.q) ? zh(item.q, mode, { speak: true }) : h('div', { class: 'src-text' }, item.q)));
    const ta = h('textarea', { class: 'ans', rows: 2, 'aria-label': 'Your answer', placeholder: item.t === 'complete' ? '写出空白部分… · Viết phần còn thiếu…' : '在这里写中文… · Viết tiếng Trung ở đây…', spellcheck: 'false',
      onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); } } });
    if (item.t === 'fix') ta.value = item.q;
    el.appendChild(ta);
    el.appendChild(h('div', { class: 'small muted' }, 'Punctuation is ignored. Press Enter to check. · Không tính dấu câu. Nhấn Enter để kiểm tra.'));
    function check() { api.submit(ta.value, ta.value.trim()); }
    return { el, checkBtn: h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Check · Kiểm tra'), retry() { ta.focus(); }, lock() { ta.readOnly = true; } };
  }

  /* ---------- sentence arrangement: tap, drag (mouse & touch) and keyboard ---------- */
  function orderBody(item, api, mode) {
    const n = item.c.length;
    const fresh = () => { let b = HSK.Engine.shuffle([...Array(n).keys()]); if (b.every((v, i) => v === i) && n > 1) b.push(b.shift()); return b; };
    let bank = fresh(), placed = [], locked = false, marks = [];
    const zone = h('div', { class: 'zone', 'aria-label': 'Your sentence' });
    const bankEl = h('div', { class: 'zone bank', 'aria-label': 'Blocks' });
    const el = h('div', null, zone, bankEl, h('div', { class: 'small muted' }, 'Tap or drag the blocks. Keyboard: Enter to move, ←/→ to reorder. · Chạm hoặc kéo các khối.'));
    function chunkEl(ci, where, pos) {
      const cls = ['chunk']; if (where === 'z' && marks.includes(pos)) cls.push('mis');
      const b = h('button', { class: cls.join(' '), type: 'button', 'data-ci': ci }, zh(item.c[ci], mode));
      b.addEventListener('keydown', e => {
        if (locked || where !== 'z') return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault(); const i = placed.indexOf(ci), j = i + (e.key === 'ArrowLeft' ? -1 : 1);
          if (j >= 0 && j < placed.length) { placed.splice(i, 1); placed.splice(j, 0, ci); marks = []; draw(); focusChunk(ci); }
        }
      });
      attachDrag(b, ci, where);
      return b;
    }
    function focusChunk(ci) { const b = el.querySelector(`.chunk[data-ci="${ci}"]`); b && b.focus(); }
    function draw() {
      zone.innerHTML = ''; bankEl.innerHTML = '';
      if (!placed.length) zone.appendChild(h('span', { class: 'ph' }, 'Your sentence · Câu của bạn'));
      placed.forEach((ci, pos) => zone.appendChild(chunkEl(ci, 'z', pos)));
      if (!bank.length && !locked) bankEl.appendChild(h('span', { class: 'ph' }, 'Done? Press Check · Xong? Nhấn Kiểm tra'));
      bank.forEach(ci => bankEl.appendChild(chunkEl(ci, 'b')));
      if (locked) el.querySelectorAll('.chunk').forEach(c => { c.disabled = true; c.classList.add('good'); });
    }
    function tap(ci, where) {
      if (locked) return;
      if (where === 'b') { bank = bank.filter(x => x !== ci); placed.push(ci); } else { placed = placed.filter(x => x !== ci); bank.push(ci); }
      marks = []; draw();
    }
    function attachDrag(b, ci, where) {
      let sx, sy, dragging = false, ghost = null, mark = null, pid = null;
      b.addEventListener('pointerdown', e => { if (locked || (e.button !== undefined && e.button !== 0)) return; sx = e.clientX; sy = e.clientY; dragging = false; pid = e.pointerId; try { b.setPointerCapture(pid); } catch (err) { } });
      b.addEventListener('pointermove', e => {
        if (pid === null || e.pointerId !== pid) return;
        if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
          dragging = true; b.classList.add('dragging');
          ghost = b.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('dragging'); document.body.appendChild(ghost);
          mark = h('span', { class: 'drop-mark' });
        }
        if (dragging) {
          ghost.style.left = (e.clientX - ghost.offsetWidth / 2) + 'px'; ghost.style.top = (e.clientY - ghost.offsetHeight / 2) + 'px';
          const t = dropTarget(e.clientX, e.clientY); mark.remove();
          if (t) { if (t.before) t.zoneEl.insertBefore(mark, t.before); else t.zoneEl.appendChild(mark); }
        }
      });
      const end = e => {
        if (pid === null) return;
        const was = dragging; pid = null;
        if (!was) { if (e.type === 'pointerup') tap(ci, where); return; }
        dragging = false; b.classList.remove('dragging'); ghost && ghost.remove(); mark && mark.remove();
        const t = dropTarget(e.clientX, e.clientY); if (!t) return;
        placed = placed.filter(x => x !== ci); bank = bank.filter(x => x !== ci);
        const list = t.zoneEl === zone ? placed : bank;
        let idx = t.before ? list.indexOf(+t.before.dataset.ci) : list.length; if (idx < 0) idx = list.length;
        list.splice(idx, 0, ci); marks = []; draw();
      };
      b.addEventListener('pointerup', end);
      b.addEventListener('pointercancel', () => { if (dragging) { ghost && ghost.remove(); mark && mark.remove(); b.classList.remove('dragging'); } dragging = false; pid = null; });
      b.addEventListener('click', e => { if (e.detail === 0) tap(ci, where); });
    }
    function dropTarget(x, y) {
      for (const zoneEl of [zone, bankEl]) {
        const r = zoneEl.getBoundingClientRect();
        if (x < r.left - 10 || x > r.right + 10 || y < r.top - 16 || y > r.bottom + 16) continue;
        let best = null;
        for (const k of zoneEl.querySelectorAll('.chunk:not(.dragging)')) {
          const kr = k.getBoundingClientRect();
          if (y >= kr.top - 6 && y <= kr.bottom + 6 && x < kr.left + kr.width / 2) { best = k; break; }
          if (y < kr.top - 6) { best = k; break; }
        }
        return { zoneEl, before: best };
      }
      return null;
    }
    function check() { if (bank.length) { toast('Use all the blocks first. · Hãy dùng hết các khối.'); return; } api.submit(placed.slice(), placed.map(i => item.c[i]).join('')); }
    draw();
    return {
      el,
      checkBtn: h('span', { class: 'row' }, h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Check · Kiểm tra'),
        h('button', { class: 'btn', type: 'button', onclick: () => { if (locked) return; bank = fresh(); placed = []; marks = []; draw(); } }, '↺ Reset')),
      retry() { draw(); },
      afterWrong(res) { marks = res.misplaced || []; draw(); },
      lock() { locked = true; placed = [...Array(n).keys()]; bank = []; marks = []; draw(); }
    };
  }

  HSK.UI = { h, toast, TTS, speakBtn, bi, inst, pyMode, pyEl, zh, pyToggle, renderItem, errChip, pointOf, showEn, showVi };
})(window.HSK);
