/* =====================================================================
   Views — Learn (map + lessons), Practice, Review, My Progress, Teacher
   ===================================================================== */
(function (HSK) {
  'use strict';
  const { h, toast, speakBtn, bi, zh, pyMode, pyEl, pyToggle, renderItem, errChip } = HSK.UI;
  const St = HSK.Store, E = HSK.Engine;
  const go = (...a) => HSK.App.go(...a);
  const vi = () => St.setting('vi') !== false;
  const trOK = () => St.s.teacher.trAllow !== false;
  const V = {};
  const pct = x => Math.round(x * 100) + '%';
  const lvChip = lv => h('span', { class: 'chip lv lv' + lv }, 'HSK ' + lv);
  const tbi = (en, v) => h('span', null, en, vi() ? h('span', { class: 'vi' }, ' · ' + v) : null);
  function trans(e, v) {
    if (!trOK()) return null;
    return [e && St.setting('en') !== false ? h('div', { class: 'en' }, e) : null, v && vi() ? h('div', { class: 'vi' }, v) : null];
  }
  function statusChip(pid) { const s = E.pointStats(pid), m = E.STATUS[s.status]; return h('span', { class: 'chip ' + m.cls }, m.en, vi() ? ' · ' + m.vi : ''); }
  function ring(p, label) {
    const r = 17, c = 2 * Math.PI * r;
    return h('span', { class: 'ring', html: false },
      (() => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 40 40'); s.setAttribute('width', '44'); s.setAttribute('height', '44');
        s.innerHTML = `<circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 20 20)"/>`;
        return s; })(), h('span', { class: 'ring-l' }, label));
  }

  /* ================================================================ LEARN: home + map */
  V.learn = function (el, p) {
    const cur = E.currentLesson();
    const t = E.totals();
    const lv = p.lv || cur.lv;
    el.appendChild(h('section', { class: 'hero' },
      h('div', { class: 'hero-txt' },
        h('div', { class: 'eyebrow' }, 'Continue learning · Tiếp tục học'),
        h('h1', null, h('span', { class: 'zh' }, cur.zh)),
        h('div', { class: 'muted' }, `HSK ${cur.lv} · Lesson ${cur.no} · `, cur.en, vi() ? ' · ' + cur.vi : '')),
      h('button', { class: 'btn primary big', type: 'button', onclick: () => go('lesson', { lid: cur.id }) }, 'Continue · Tiếp tục →')));
    el.appendChild(h('div', { class: 'mini-stats' },
      h('div', null, h('b', null, t.lessonsDone), ' / ', HSK.lessons.length, h('span', null, ' lessons · bài')),
      h('div', null, h('b', null, t.answered ? pct(t.firstAcc) : '—'), h('span', null, ' first-try · lần đầu')),
      h('div', null, h('b', null, t.openMistakes), h('span', null, ' to review · cần ôn'))));
    const tabs = h('div', { class: 'lv-tabs', role: 'tablist' }, [1, 2, 3].map(n => h('button', { class: 'lv-tab lv' + n + (n === lv ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': n === lv ? 'true' : 'false', onclick: () => go('learn', { lv: n }) },
      h('b', null, 'HSK ' + n), h('span', null, HSK.lessons.filter(l => l.lv === n && (St.s.lessons[l.id] || {}).done).length + ' / ' + HSK.lessons.filter(l => l.lv === n).length))));
    el.appendChild(tabs);
    el.appendChild(h('p', { class: 'muted lv-desc' }, bi(HSK.LEVELS[lv].d)));
    const map = h('div', { class: 'map' });
    HSK.units.filter(u => u.lv === lv).forEach(u => {
      map.appendChild(h('div', { class: 'unit' },
        h('div', { class: 'unit-head' }, h('span', { class: 'unit-no' }, 'Unit ' + u.no), h('span', { class: 'zh' }, u.zh), h('span', { class: 'muted' }, u.en, vi() ? ' · ' + u.vi : '')),
        h('div', { class: 'path' }, u.lessons.map(l => {
          const pr = E.lessonProgress(l), isCur = l === cur;
          return h('button', { class: 'node' + (pr.complete ? ' done' : '') + (isCur ? ' cur' : ''), type: 'button', onclick: () => go('lesson', { lid: l.id }) },
            h('span', { class: 'dot' }, pr.complete ? '✓' : String(l.no)),
            h('span', { class: 'node-txt' }, h('span', { class: 'zh' }, l.zh), h('span', { class: 'small muted' }, l.en)),
            isCur ? h('span', { class: 'chip cur-chip' }, 'You are here · Bạn ở đây') : (pr.done && !pr.complete ? h('span', { class: 'small muted' }, pct(pr.pct)) : null));
        }),
        (() => { const r = HSK.REVIEWS.find(x => x.after === u.id); const best = St.s.reviews[r.id];
          return h('button', { class: 'node review' + (best != null ? ' done' : ''), type: 'button', onclick: () => go('reviewRun', { id: r.id }) },
            h('span', { class: 'dot' }, '★'), h('span', { class: 'node-txt' }, h('span', null, r.en), h('span', { class: 'small muted' }, r.vi)), best != null ? h('span', { class: 'chip ok' }, best + '%') : null); })())));
    });
    el.appendChild(map);
  };

  /* ================================================================ LESSON */
  V.lesson = function (el, p) {
    const l = HSK.lessonById[p.lid];
    const stage = p.stage || (St.s.last && St.s.last.lesson === l.id ? St.s.last.stage : 'learn');
    St.setLast(l.id, stage); St.markStage(l.id, stage);
    const idx = HSK.lessons.indexOf(l);
    el.appendChild(h('div', { class: 'lesson-top' },
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('learn', { lv: l.lv }) }, '← Map · Bản đồ'),
      h('div', { class: 'row' }, idx > 0 ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('lesson', { lid: HSK.lessons[idx - 1].id, stage: 'learn' }) }, '‹ Prev') : null,
        idx < HSK.lessons.length - 1 ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('lesson', { lid: HSK.lessons[idx + 1].id, stage: 'learn' }) }, 'Next ›') : null)));
    el.appendChild(h('header', { class: 'lesson-head' },
      h('div', { class: 'row' }, lvChip(l.lv), h('span', { class: 'muted small' }, `Unit ${l.unit.no} · Lesson ${l.no}`)),
      h('h1', null, h('span', { class: 'zh' }, l.zh), ' ', speakBtn(l.zh)),
      h('div', { class: 'lesson-py' }, pyEl(l.zh, pyMode(l.lv, l.id, 'learn'))),
      h('div', { class: 'sub' }, l.en, vi() ? h('span', { class: 'vi' }, ' · ' + l.vi) : null),
      h('div', { class: 'goal' }, h('span', { class: 'tag' }, '🎯 Goal · Mục tiêu'), bi(l.goal))));
    const L = St.lesson(l.id);
    el.appendChild(h('nav', { class: 'stepper', 'aria-label': 'Lesson steps' }, HSK.STAGES.map((s, i) => {
      const items = s.k === 'learn' ? [] : E.stageItems(l, s.k);
      const done = s.k === 'learn' ? !!L.st.learn : items.length && items.every(it => L.res[it.id]);
      return h('button', { class: 'step' + (s.k === stage ? ' on' : '') + (done ? ' done' : ''), type: 'button', 'aria-current': s.k === stage ? 'step' : null, onclick: () => go('lesson', { lid: l.id, stage: s.k }) },
        h('span', { class: 'n' }, done ? '✓' : String(i + 1)), h('span', { class: 'st-en' }, s.en), h('span', { class: 'st-vi' }, s.vi));
    })));
    const body = h('div', { class: 'stage-body' });
    el.appendChild(body);
    if (stage === 'learn') learnStage(body, l);
    else if (stage === 'summary') lessonSummary(body, l);
    else runner(body, {
      items: E.stageItems(l, stage), inLesson: true, lesson: l, stage,
      onFinish: box => {
        const si = HSK.PRACTICE_STAGES.indexOf(stage);
        const next = HSK.PRACTICE_STAGES[si + 1];
        if (!next) { St.completeLesson(l.id); }
        box.appendChild(h('div', { class: 'actions center' },
          next ? h('button', { class: 'btn primary big', type: 'button', onclick: () => go('lesson', { lid: l.id, stage: next }) }, 'Next: ' + HSK.STAGES.find(s => s.k === next).en + ' · ' + HSK.STAGES.find(s => s.k === next).vi + ' →')
            : h('button', { class: 'btn primary big', type: 'button', onclick: () => go('lesson', { lid: l.id, stage: 'summary' }) }, 'See lesson results · Xem kết quả →')));
      }
    });
  };

  /* ---------- Learn stage ---------- */
  function learnStage(el, l) {
    const mode = pyMode(l.lv, l.id, 'learn');
    const wrap = h('div', { class: 'learn' + (mode === 'tap' ? ' tapmode' : '') });
    if (mode === 'tap') wrap.appendChild(h('div', { class: 'tap-note' }, pyToggle(wrap), h('span', { class: 'small muted' }, 'Pinyin is hidden at this level. Try reading first. · Pinyin được ẩn ở cấp độ này. Hãy thử đọc trước.')));
    /* words */
    if (l.words.length) wrap.appendChild(h('section', { class: 'card words' },
      h('h2', null, 'New words · Từ mới'),
      h('div', { class: 'word-grid' }, l.words.map(w => h('div', { class: 'word' },
        h('div', { class: 'zhline' }, h('span', { class: 'zh' }, w[0]), speakBtn(w[0])),
        mode !== 'hide' ? h('div', { class: 'py' + (mode === 'tap' ? ' tapable' : '') }, w[1]) : null,
        trOK() ? h('div', { class: 'mean' }, St.setting('en') !== false ? w[2] : null, St.setting('en') !== false && vi() ? ' · ' : null, vi() ? h('span', { class: 'vi' }, w[3]) : null) : null)))));
    /* grammar points */
    l.points.forEach((p, i) => wrap.appendChild(pointCard(p, i + 1, l, mode)));
    /* comparisons */
    (l.compare || []).forEach(c => wrap.appendChild(compareCard(c, mode)));
    /* dialogue */
    if (l.dialog) wrap.appendChild(h('section', { class: 'card dialog-card' },
      h('h2', null, '💬 ', l.dialog.title[0], vi() ? h('span', { class: 'vi' }, ' · ' + l.dialog.title[1]) : null),
      h('div', { class: 'row' }, h('button', { class: 'btn sm', type: 'button', onclick: () => speakAll(l.dialog.lines.map(x => x[1])) }, '🔊 Play all · Nghe cả bài')),
      h('div', { class: 'dialog' }, l.dialog.lines.map(([s, t, e, v]) => h('div', { class: 'dl' }, h('span', { class: 'spk' }, s),
        h('div', null, zh(t, mode, { speak: true }), trans(e, v)))))));
    wrap.appendChild(h('div', { class: 'actions center' }, h('button', { class: 'btn primary big', type: 'button', onclick: () => go('lesson', { lid: l.id, stage: 'ctrl' }) }, 'Start practice · Bắt đầu luyện tập →')));
    el.appendChild(wrap);
  }
  function speakAll(lines) {
    if (!HSK.UI.TTS.ok) { toast('Speech is not available in this browser.'); return; }
    speechSynthesis.cancel();
    lines.forEach(t => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; u.rate = 0.85; if (HSK.UI.TTS.voice) u.voice = HSK.UI.TTS.voice; speechSynthesis.speak(u); });
  }
  function pointCard(p, n, l, mode) {
    const card = h('section', { class: 'card point', id: 'pt-' + p.id },
      h('div', { class: 'pt-head' }, h('span', { class: 'pt-n' }, n), h('h2', null, h('span', { class: 'zh' }, p.t)), statusChip(p.id)),
      h('div', { class: 'meaning' }, h('div', { class: 'tag' }, 'What does it mean? · Nghĩa là gì?'), h('div', { class: 'm-en' }, p.en), vi() ? h('div', { class: 'vi m-vi' }, p.vi) : null),
      h('div', { class: 'pattern' }, h('div', { class: 'tag' }, 'Pattern · Cấu trúc'), h('div', { class: 'pat zh' }, p.p)),
      p.vis ? visual(p.vis, mode) : null,
      h('div', { class: 'why-box' }, h('div', { class: 'tag' }, 'Why? · Vì sao?'), bi(p.why)),
      h('div', { class: 'examples' }, h('div', { class: 'tag' }, 'Examples · Ví dụ'),
        h('ol', { class: 'ex-list' }, p.ex.map(([z, e, v]) => h('li', null,
          h('div', { class: 'zhw' }, h('span', { class: 'zhline' }, h('span', { class: 'zh' }, z), speakBtn(z), speakBtn(z, true)), pyEl(z, mode)),
          trans(e, v))))),
      p.tip ? h('div', { class: 'tip' }, h('div', { class: 'tag' }, '🇻🇳 For Vietnamese speakers · Lưu ý cho người Việt'), bi(p.tip)) : null,
      p.mis && p.mis.length ? h('div', { class: 'mistake' }, h('div', { class: 'tag' }, '⚠ Common mistake · Lỗi thường gặp'),
        p.mis.map(([w, r, e, v]) => h('div', { class: 'mis-row' }, h('div', { class: 'zh wrongtxt' }, '❌ ', w), h('div', { class: 'zh righttxt' }, '✅ ', r, ' ', speakBtn(r)), bi([e, v])))) : null);
    return card;
  }
  function visual(vis, mode) {
    if (vis.k === 'blocks') return h('div', { class: 'visual' }, h('div', { class: 'tag' }, 'Sentence map · Sơ đồ câu'),
      vis.rows.map(row => h('div', { class: 'blocks' }, row.map(([c, role], i) => [i ? h('span', { class: 'arr', 'aria-hidden': 'true' }, '→') : null,
        h('div', { class: 'blk r-' + role }, h('div', { class: 'role' }, HSK.ROLES[role][0], vi() ? h('span', { class: 'vi' }, HSK.ROLES[role][1]) : null), h('div', { class: 'zh' }, c), mode === 'hide' ? null : pyEl(c, mode))]))));
    if (vis.k === 'time') return h('div', { class: 'visual' }, h('div', { class: 'tag' }, 'Timeline · Dòng thời gian'),
      h('div', { class: 'timeline' }, h('div', { class: 'tl-line' }), h('div', { class: 'tl-arrow' }, '▶'),
        vis.marks.map(([pos, z, e, v]) => h('div', { class: 'tl-mark' + (z === '现在' ? ' now' : ''), style: { left: pos + '%' } }, h('div', { class: 'tl-dot' }), h('div', { class: 'tl-lbl' }, h('div', { class: 'zh' }, z), h('div', { class: 'small' }, e), vi() ? h('div', { class: 'small vi' }, v) : null)))));
    return null;
  }
  function compareCard(c, mode) {
    return h('section', { class: 'card compare' },
      h('h2', null, '⚖️ ', h('span', { class: 'zh' }, c.title)),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'cmp' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'zh' }, c.a), h('th', { class: 'zh' }, c.b))),
        h('tbody', null, c.rows.map(([e, v, a, b]) => h('tr', null, h('th', null, e, vi() ? h('div', { class: 'vi small' }, v) : null), h('td', null, a), h('td', null, b)))))),
      c.ex ? h('div', { class: 'cmp-ex' }, c.ex.map(([a, b]) => h('div', { class: 'cmp-pair' }, zh(a, mode, { speak: true }), zh(b, mode, { speak: true })))) : null,
      c.note ? bi(c.note, 'note') : null);
  }

  /* ---------- one-exercise-at-a-time runner ---------- */
  function runner(el, cfg) {
    const items = cfg.items;
    if (!items.length) { el.appendChild(h('div', { class: 'card empty' }, 'No exercises here (your teacher may have hidden them). · Không có bài tập.')); cfg.onFinish && cfg.onFinish(el); return; }
    const L = cfg.lesson ? St.lesson(cfg.lesson.id) : null;
    const results = {};
    if (L) items.forEach(it => { if (L.res[it.id]) results[it.id] = L.res[it.id]; });
    let i = cfg.inLesson ? items.findIndex(it => !results[it.id]) : 0;
    const bar = h('div', { class: 'run-bar' });
    const slot = h('div', { class: 'run-slot' });
    el.appendChild(bar); el.appendChild(slot);
    function drawBar() {
      bar.innerHTML = '';
      bar.appendChild(h('div', { class: 'dots' }, items.map((it, k) => h('span', { class: 'rd ' + (results[it.id] || '') + (k === i ? ' cur' : ''), title: String(k + 1) }))));
      bar.appendChild(h('span', { class: 'small muted' }, (Math.min(i, items.length - 1) + 1) + ' / ' + items.length));
    }
    function show() {
      drawBar(); slot.innerHTML = '';
      if (i < 0 || i >= items.length) { summary(); return; }
      const it = items[i];
      const card = renderItem(it, { inLesson: cfg.inLesson, onDone: res => {
        results[it.id] = res; drawBar();
        const last = items.every(x => results[x.id]);
        card.appendChild(h('div', { class: 'actions center next' }, h('button', { class: 'btn primary big', type: 'button', onclick: () => { i = items.findIndex((x, k) => k > i && !results[x.id]); if (i < 0) i = items.findIndex(x => !results[x.id]); if (last) i = items.length; show(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, last ? 'Finish · Hoàn thành ✓' : 'Next · Tiếp →')));
        card.querySelector('.next button').focus({ preventScroll: true });
      } });
      slot.appendChild(card);
    }
    function summary() {
      const vals = items.map(it => results[it.id]);
      const f = vals.filter(v => v === 'first').length, r = vals.filter(v => v === 'retry').length, x = vals.filter(v => v === 'fail').length;
      slot.innerHTML = '';
      const box = h('div', { class: 'card done-box' },
        h('div', { class: 'done-emoji' }, f + r === items.length ? '🎉' : '👍'),
        h('h2', null, cfg.stage === 'test' ? 'Lesson completed! · Hoàn thành bài học!' : 'Section complete! · Xong phần này!'),
        h('div', { class: 'score-row' },
          h('div', null, h('b', null, f), h('span', null, 'First try · Lần đầu')), h('div', null, h('b', null, r), h('span', null, 'After a hint · Sau gợi ý')), h('div', null, h('b', null, x), h('span', null, 'Answer shown · Xem đáp án'))),
        h('div', { class: 'actions center' }, h('button', { class: 'btn', type: 'button', onclick: () => { if (cfg.lesson) St.clearLessonResults(cfg.lesson.id, cfg.stage); Object.keys(results).forEach(k => delete results[k]); i = 0; show(); } }, '↻ Practise again · Luyện lại')));
      slot.appendChild(box);
      if (cfg.review && !cfg.recorded) { cfg.recorded = true; St.addHistory({ review: true, id: cfg.review.id, title: cfg.review.en, score: f + r, total: items.length }); }
      cfg.onFinish && cfg.onFinish(box);
    }
    show();
  }
  V.runner = runner;

  function lessonSummary(el, l) {
    const L = St.lesson(l.id);
    const items = l.items.filter(E.visible);
    const vals = items.map(it => L.res[it.id]).filter(Boolean);
    const f = vals.filter(v => v === 'first').length, r = vals.filter(v => v === 'retry').length, x = vals.filter(v => v === 'fail').length;
    const idx = HSK.lessons.indexOf(l), next = HSK.lessons[idx + 1];
    const rv = HSK.REVIEWS.find(rr => rr.after === l.unit.id && l.unit.lessons[l.unit.lessons.length - 1] === l);
    el.appendChild(h('div', { class: 'card done-box' },
      h('div', { class: 'done-emoji' }, L.done ? '🏅' : '📘'),
      h('h2', null, L.done ? 'Lesson completed! · Hoàn thành bài học!' : 'Lesson results · Kết quả bài học'),
      h('div', { class: 'score-row' },
        h('div', null, h('b', null, vals.length + ' / ' + items.length), h('span', null, 'Answered · Đã làm')),
        h('div', null, h('b', null, vals.length ? pct(f / vals.length) : '—'), h('span', null, 'First-try accuracy · Đúng lần đầu')),
        h('div', null, h('b', null, vals.length ? pct((f + r) / vals.length) : '—'), h('span', null, 'Total accuracy · Tổng chính xác'))),
      h('h3', null, 'Grammar in this lesson · Ngữ pháp trong bài'),
      h('div', { class: 'gp-list' }, l.points.map(p => h('div', { class: 'gp' }, h('span', { class: 'zh' }, p.t), statusChip(p.id)))),
      x || r ? h('p', { class: 'small' }, `${x + r} question(s) went to your Mistake Notebook. · ${x + r} câu đã được lưu vào Sổ lỗi sai.`) : null,
      h('div', { class: 'actions center' },
        x + r ? h('button', { class: 'btn', type: 'button', onclick: () => go('mistakes', { lesson: l.id }) }, '错题本 · My mistakes') : null,
        rv ? h('button', { class: 'btn', type: 'button', onclick: () => go('reviewRun', { id: rv.id }) }, '★ ' + rv.en) : null,
        next ? h('button', { class: 'btn primary big', type: 'button', onclick: () => go('lesson', { lid: next.id, stage: 'learn' }) }, 'Next lesson · Bài tiếp →') : null)));
  }

  /* ================================================================ PRACTICE */
  V.practice = function (el) {
    el.appendChild(h('h1', null, 'Practice · Luyện tập'));
    const t = E.totals();
    el.appendChild(h('div', { class: 'grid2' },
      h('button', { class: 'card tile', type: 'button', onclick: () => { const items = E.weakItems(null, 12); if (!items.length) { toast('No weak grammar yet — keep learning! · Chưa có ngữ pháp yếu.'); return; } go('session', { title: ['Weak grammar', 'Ngữ pháp còn yếu'], items }); } },
        h('div', { class: 'tile-ic' }, '🎯'), h('b', null, 'Practise weak grammar'), h('span', { class: 'vi' }, 'Luyện ngữ pháp còn yếu'), h('span', { class: 'small muted' }, t.review + ' point(s) need review')),
      h('button', { class: 'card tile', type: 'button', onclick: () => { const items = E.mistakeItems(true); if (!items.length) { toast('No mistakes to practise. · Không có lỗi cần luyện.'); return; } go('session', { title: ['My mistakes', 'Lỗi của tôi'], items: E.shuffle(items).slice(0, 15) }); } },
        h('div', { class: 'tile-ic' }, '📕'), h('b', null, 'Practise my mistakes'), h('span', { class: 'vi' }, 'Luyện lại lỗi sai'), h('span', { class: 'small muted' }, t.openMistakes + ' open'))));
    el.appendChild(h('h2', null, 'Mixed practice · Luyện tổng hợp'));
    el.appendChild(h('div', { class: 'grid3' }, [1, 2, 3].map(lv => h('button', { class: 'card tile lv' + lv, type: 'button', onclick: () => go('session', { title: ['Mixed HSK ' + lv, 'Tổng hợp HSK ' + lv], items: E.mixedItems(lv, 12) }) },
      lvChip(lv), h('b', null, '12 mixed questions'), h('span', { class: 'vi' }, '12 câu hỗn hợp')))));
    el.appendChild(h('h2', null, 'Practise one lesson · Luyện một bài'));
    [1, 2, 3].forEach(lv => el.appendChild(h('details', { class: 'card lesson-pick', open: lv === E.currentLesson().lv },
      h('summary', null, lvChip(lv), ' ', HSK.LEVELS[lv].zh),
      h('div', { class: 'pick-list' }, HSK.lessons.filter(l => l.lv === lv).map(l => h('button', { class: 'pick-row', type: 'button', onclick: () => go('session', { title: [l.no + '. ' + l.zh, l.en], items: E.shuffle(l.items.filter(it => E.visible(it) && it.stage !== 'test')).slice(0, 12) }) },
        h('span', { class: 'pr-no' }, l.no), h('span', { class: 'zh' }, l.zh), h('span', { class: 'small muted' }, l.en)))))));
  };

  V.session = function (el, p) {
    el.appendChild(h('div', { class: 'lesson-top' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go(p.back || 'practice') }, '← Back · Quay lại')));
    el.appendChild(h('h1', null, p.title[0], vi() ? h('span', { class: 'vi h-vi' }, ' · ' + p.title[1]) : null));
    runner(el, { items: p.items, review: p.review, stage: 'session', onFinish: box => box.appendChild(h('div', { class: 'actions center' }, h('button', { class: 'btn primary', type: 'button', onclick: () => go(p.back || 'practice') }, 'Done · Xong'))) });
  };

  /* ================================================================ REVIEW */
  V.review = function (el) {
    el.appendChild(h('h1', null, 'Review · Ôn tập'));
    const open = E.mistakeItems(true).length, all = Object.keys(St.s.mistakes).length;
    el.appendChild(h('button', { class: 'card tile wide', type: 'button', onclick: () => go('mistakes') },
      h('div', { class: 'tile-ic' }, '📕'), h('div', null, h('b', null, '错题本 · My Mistakes · Sổ lỗi sai'), h('div', { class: 'small muted' }, `${open} to practise · ${all - open} mastered`))));
    el.appendChild(h('p', { class: 'muted' }, bi(['Cumulative reviews mix old and new grammar without telling you which point each question tests.', 'Các bài ôn tập tổng hợp trộn ngữ pháp cũ và mới, không cho biết mỗi câu kiểm tra điểm nào.'])));
    [1, 2, 3].forEach(lv => {
      el.appendChild(h('h2', null, lvChip(lv), ' ', HSK.LEVELS[lv].zh));
      el.appendChild(h('div', { class: 'review-list' }, HSK.REVIEWS.filter(r => r.lv === lv).map(r => {
        const best = St.s.reviews[r.id];
        const ready = r.focus.every(id => Object.keys((St.s.lessons[id] || {}).res || {}).length);
        return h('button', { class: 'card rv' + (r.final ? ' final' : ''), type: 'button', onclick: () => go('reviewRun', { id: r.id }) },
          h('span', { class: 'rv-ic' }, r.final ? '🏆' : '★'), h('span', { class: 'rv-t' }, h('b', null, r.en), h('span', { class: 'small muted' }, r.vi + ' · ' + r.n + ' questions')),
          best != null ? h('span', { class: 'chip ok' }, 'Best ' + best + '%') : (ready ? h('span', { class: 'chip mid' }, 'Ready · Sẵn sàng') : h('span', { class: 'chip' }, 'Later · Sau')));
      })));
    });
  };
  V.reviewRun = function (el, p) {
    const r = HSK.REVIEWS.find(x => x.id === p.id);
    const items = E.buildReview(r);
    V.session(el, { title: [r.en, r.vi], items, review: r, back: 'review' });
  };

  /* ================================================================ MISTAKE NOTEBOOK */
  V.mistakes = function (el, p) {
    el.appendChild(h('div', { class: 'lesson-top' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('review') }, '← Review · Ôn tập')));
    el.appendChild(h('h1', null, '错题本 ', h('span', { class: 'h-vi' }, 'My Mistakes · Sổ lỗi sai')));
    const f = p.f || 'open';
    const ids = Object.keys(St.s.mistakes).filter(id => HSK.items[id]).filter(id => !p.lesson || HSK.items[id].lesson === p.lesson)
      .filter(id => f === 'all' || (f === 'open' ? !St.s.mistakes[id].mastered : St.s.mistakes[id].mastered))
      .sort((a, b) => (St.s.mistakes[b].last || 0) - (St.s.mistakes[a].last || 0));
    el.appendChild(h('div', { class: 'row filters' },
      [['open', 'Needs practice · Cần luyện'], ['done', 'Mastered · Đã nắm vững'], ['all', 'All · Tất cả']].map(([k, lab]) => h('button', { class: 'pill' + (f === k ? ' on' : ''), type: 'button', onclick: () => go('mistakes', Object.assign({}, p, { f: k })) }, lab)),
      ids.length && f !== 'done' ? h('button', { class: 'btn primary', type: 'button', onclick: () => go('session', { title: ['Practice again', 'Luyện lại'], items: E.shuffle(ids.map(id => HSK.items[id])).slice(0, 15), back: 'mistakes' }) }, '↻ Practice again · Luyện lại') : null));
    if (!ids.length) { el.appendChild(h('div', { class: 'card empty' }, f === 'done' ? 'Nothing mastered yet. · Chưa có mục nào.' : 'No mistakes here. Great work! · Không có lỗi nào. Làm tốt lắm!')); return; }
    ids.forEach(id => {
      const it = HSK.items[id], m = St.s.mistakes[id], pt = HSK.points[it.g], mode = pyMode(it.lv, it.lesson, 'learn');
      el.appendChild(h('div', { class: 'card mk' + (m.mastered ? ' mastered' : '') },
        h('div', { class: 'row mk-head' }, lvChip(it.lv), h('span', { class: 'small muted' }, 'Lesson ' + pt.lesson.no + ' · '), h('button', { class: 'linkish zh', type: 'button', onclick: () => go('lesson', { lid: it.lesson, stage: 'learn' }) }, pt.t), errChip(m.et || it.et),
          m.mastered ? h('span', { class: 'chip ok' }, 'Mastered · Đã nắm vững') : h('span', { class: 'chip bad' }, 'Needs practice · Cần luyện')),
        h('div', { class: 'mk-q' }, h('span', { class: 'tag' }, 'Question · Câu hỏi'), ' ', qText(it)),
        m.ans ? h('div', { class: 'mk-row' }, h('span', { class: 'tag' }, 'Your answer · Bạn trả lời'), h('span', { class: 'zh strike' }, m.ans)) : null,
        h('div', { class: 'mk-row' }, h('span', { class: 'tag' }, 'Correct · Đáp án'), zh(HSK.Grader.answerText(it), mode, { speak: true })),
        h('div', { class: 'small muted' }, `Attempts · Số lần thử: ${m.att || '—'} · Wrong · Sai: ${m.wrong}× · ${new Date(m.last).toLocaleDateString()}`),
        bi(it.e, 'expl')));
    });
  };
  function qText(it) {
    if (it.t === 'order') return h('span', { class: 'zh' }, it.c.join(' | '));
    if (it.t === 'spot') return h('span', { class: 'zh' }, it.seg.join(''));
    if (it.t === 'match') return h('span', { class: 'zh' }, it.pairs.map(x => x[0]).join(' · '));
    if (it.t === 'dlg') return h('span', { class: 'zh' }, it.d.map(x => x[0] + '：' + (x[1] || '___')).join('  '));
    if (it.t === 'pick') return h('span', null, 'Which sentence is correct? · Câu nào đúng?');
    return h('span', { class: /[㐀-鿿]/.test(it.q) && !/[A-Za-z]{3,}/.test(it.q) ? 'zh' : '' }, it.q);
  }

  /* ================================================================ MY PROGRESS */
  V.progress = function (el) {
    const t = E.totals(), cur = E.currentLesson();
    el.appendChild(h('h1', null, 'My Progress · Tiến độ của tôi'));
    const tile = (v, e, vv) => h('div', { class: 'stat' }, h('div', { class: 'v' }, v), h('div', { class: 'l' }, e), vi() ? h('div', { class: 'l vi' }, vv) : null);
    el.appendChild(h('div', { class: 'stats' },
      tile(t.lessonsDone + ' / ' + HSK.lessons.length, 'Lessons completed', 'Bài đã hoàn thành'),
      tile(h('button', { class: 'linkish', type: 'button', onclick: () => go('lesson', { lid: cur.id }) }, cur.no + '. ' + cur.zh), 'Current lesson', 'Bài hiện tại'),
      tile(t.answered, 'Questions completed', 'Câu đã làm'),
      tile(t.answered ? pct(t.acc) : '—', 'Accuracy', 'Độ chính xác'),
      tile(t.answered ? pct(t.firstAcc) : '—', 'First-attempt accuracy', 'Đúng ngay lần đầu'),
      tile(t.mastered, 'Grammar mastered', 'Ngữ pháp đã nắm vững'),
      tile(t.review, 'Grammar to review', 'Ngữ pháp cần ôn'),
      tile(t.corrected, 'Mistakes corrected', 'Lỗi đã sửa')));
    el.appendChild(h('div', { class: 'card' }, [1, 2, 3].map(lv => {
      const ls = HSK.lessons.filter(l => l.lv === lv), d = ls.filter(l => (St.s.lessons[l.id] || {}).done).length;
      return h('div', { class: 'lvbar' }, lvChip(lv), h('div', { class: 'bar' }, h('span', { style: { width: pct(d / ls.length) } })), h('span', { class: 'small' }, d + ' / ' + ls.length));
    })));
    el.appendChild(h('h2', null, 'Grammar points · Điểm ngữ pháp'));
    [1, 2, 3].forEach(lv => el.appendChild(h('details', { class: 'card', open: lv === cur.lv },
      h('summary', null, lvChip(lv), ' ', HSK.LEVELS[lv].zh),
      h('div', { class: 'gp-table' }, HSK.lessons.filter(l => l.lv === lv).flatMap(l => l.points).map(pt => {
        const s = E.pointStats(pt.id);
        return h('button', { class: 'gp-row', type: 'button', onclick: () => go('lesson', { lid: pt.lesson.id, stage: 'learn' }) },
          h('span', { class: 'small muted' }, pt.lesson.no), h('span', { class: 'zh' }, pt.t), h('span', { class: 'small muted' }, s.n ? pct(s.acc) + ' · 1st ' + pct(s.firstAcc) : ''), statusChip(pt.id));
      })))));
    if (St.s.history.length) el.appendChild(h('div', { class: 'card' }, h('h3', null, 'Recent reviews · Ôn tập gần đây'),
      St.s.history.slice(0, 8).map(x => h('div', { class: 'row hist' }, h('span', null, x.title), h('span', { class: 'chip' }, x.score + ' / ' + x.total), h('span', { class: 'small muted' }, new Date(x.ts).toLocaleDateString())))));
    el.appendChild(h('div', { class: 'foot-links' },
      St.memoryOnly() ? h('p', { class: 'small muted' }, 'Progress cannot be saved in this browser (private mode?). · Không lưu được tiến độ trong trình duyệt này.') : h('p', { class: 'small muted' }, 'Progress is saved in this browser. · Tiến độ được lưu trong trình duyệt này.'),
      h('button', { class: 'linkish small', type: 'button', onclick: () => go('teacher') }, 'Teacher mode · Chế độ giáo viên')));
  };

  /* ================================================================ TEACHER */
  V.teacher = function (el, p) {
    const T = St.s.teacher;
    el.appendChild(h('div', { class: 'lesson-top' }, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('progress') }, '← My Progress')));
    el.appendChild(h('h1', null, 'Teacher mode · Chế độ giáo viên'));
    el.appendChild(h('p', { class: 'muted' }, 'These settings apply to this browser. Use them before class or before handing the device to a student. · Cài đặt áp dụng cho trình duyệt này.'));
    const sw = (k, e, v) => h('label', { class: 'switch-row' }, h('input', { type: 'checkbox', id: 't-' + k, checked: T[k] !== false, onchange: ev => { St.teacher(k, ev.target.checked); HSK.App.applySettings(); } }), h('span', null, h('b', null, e), h('span', { class: 'small muted' }, ' · ' + v)));
    el.appendChild(h('section', { class: 'card' }, h('h2', null, 'Support & feedback · Hỗ trợ & phản hồi'),
      sw('pyAllow', 'Pinyin available', 'Cho phép pinyin'), sw('trAllow', 'Translations available (English / Vietnamese)', 'Cho phép bản dịch'),
      sw('showAnswer', '"Show answer" button available', 'Cho phép nút "Xem đáp án"'), sw('retry', 'Students may retry (hints before the answer)', 'Cho phép làm lại (gợi ý trước khi xem đáp án)'),
      sw('shuffle', 'Shuffle answer options and word banks', 'Xáo trộn đáp án'),
      h('label', { class: 'switch-row' }, h('input', { type: 'checkbox', id: 't-present', checked: !!T.present, onchange: ev => { St.teacher('present', ev.target.checked); HSK.App.applySettings(); } }), h('span', null, h('b', null, 'Projector mode (extra-large text)'), h('span', { class: 'small muted' }, ' · Chế độ trình chiếu')))));
    /* per-lesson */
    const lid = p.lid || E.currentLesson().id, l = HSK.lessonById[lid];
    const sel = h('select', { id: 't-lesson', onchange: e => go('teacher', { lid: e.target.value }) }, HSK.lessons.map(x => h('option', { value: x.id, selected: x.id === lid }, `HSK ${x.lv} · ${x.no}. ${x.zh} — ${x.en}`)));
    const pySel = h('select', { id: 't-lpy', onchange: e => { T.lessonPy[lid] = e.target.value; St.save(); } }, [['default', 'Default (by level)'], ['on', 'Always show'], ['off', 'Hide']].map(([v, t]) => h('option', { value: v, selected: (T.lessonPy[lid] || 'default') === v }, t)));
    el.appendChild(h('section', { class: 'card' }, h('h2', null, 'Lesson settings · Cài đặt từng bài'),
      h('div', { class: 'form-row' }, h('label', { for: 't-lesson' }, 'Lesson'), sel),
      h('div', { class: 'form-row' }, h('label', { for: 't-lpy' }, 'Pinyin in this lesson'), pySel),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => go('lesson', { lid, stage: 'learn' }) }, 'Open lesson'), h('button', { class: 'btn', type: 'button', onclick: () => { T.present = true; St.save(); HSK.App.applySettings(); go('lesson', { lid, stage: 'learn' }); } }, 'Open in projector mode')),
      h('h3', null, 'Exercise selection · Chọn bài tập'),
      h('p', { class: 'small muted' }, 'Untick an exercise to hide it from students in this lesson, in reviews and in practice.'),
      h('div', { class: 'ex-select' }, HSK.STAGES.filter(s => s.k !== 'learn').map(s => h('div', null, h('div', { class: 'tag' }, s.en + ' · ' + s.vi),
        l.items.filter(it => it.stage === s.k).map(it => h('label', { class: 'ex-row' }, h('input', { type: 'checkbox', checked: !T.hidden[it.id], onchange: e => { if (e.target.checked) delete T.hidden[it.id]; else T.hidden[it.id] = true; St.save(); } }),
          h('span', { class: 'chip' }, HSK.TYPES[it.t][0]), h('span', { class: 'zh small' }, (it.q || (it.c || it.seg || it.o || []).join(' ') || it.pairs && it.pairs.map(x => x[0]).join(' · ') || '').slice(0, 60)))))))));
    /* vocabulary check */
    const vbox = h('div');
    el.appendChild(h('section', { class: 'card' }, h('h2', null, 'Vocabulary check · Kiểm tra từ vựng'),
      h('p', { class: 'small muted' }, 'Checks that every example and exercise uses only words taught in that lesson or earlier.'),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        const rep = HSK.Vocab.check(); vbox.innerHTML = '';
        const nStr = HSK.lessons.reduce((a, x) => a + HSK.Vocab.strings(x).length, 0);
        vbox.appendChild(rep.length ? h('div', null, h('p', { class: 'chip bad' }, rep.length + ' problem(s)'), rep.slice(0, 50).map(r => h('div', { class: 'small' }, r.lesson + ' · ' + r.where + ': ', h('span', { class: 'zh' }, r.text), ' → ', r.unknown.join(' '))))
          : h('p', null, h('span', { class: 'chip ok' }, '✓ All clear'), ` ${nStr} Chinese texts in ${HSK.lessons.length} lessons use only taught vocabulary (${Object.keys(HSK.Vocab.dict).length} words).`));
      } }, 'Run check'), vbox,
      h('details', null, h('summary', null, `Word list for lesson ${l.no}`), h('div', { class: 'small' }, HSK.Vocab.known(l.idx).filter(w => w.idx === l.idx).map(w => w.zh + ' ' + w.py).join(' · ')))));
    /* progress data */
    const ta = h('textarea', { id: 't-data', rows: 3, class: 'ans', placeholder: 'Paste progress data here to import' });
    el.appendChild(h('section', { class: 'card' }, h('h2', null, 'Progress data · Dữ liệu tiến độ'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => { ta.value = St.exportJSON(); ta.select(); try { navigator.clipboard.writeText(ta.value).then(() => toast('Copied'), () => { }); } catch (e) { } } }, 'Copy progress'),
        h('button', { class: 'btn', type: 'button', onclick: () => { try { St.importJSON(ta.value); toast('Imported'); go('progress'); } catch (e) { toast('That is not valid progress data.'); } } }, 'Import'),
        h('button', { class: 'btn danger', type: 'button', onclick: ev => { if (ev.target.dataset.sure) { St.reset(); toast('Progress reset'); go('progress'); } else { ev.target.dataset.sure = 1; ev.target.textContent = 'Click again to reset all progress'; } } }, 'Reset progress')), ta));
  };

  HSK.Views = V;
})(window.HSK);
