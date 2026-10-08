/* =====================================================================
   HSK 1–3 Grammar Course — content registry
   ---------------------------------------------------------------------
   Content is plain data. Each unit file calls HSK.unit({...}).

   UNIT    { id, lv (1|2|3), zh, en, vi, lessons:[LESSON] }
   LESSON  { id, zh, en, vi, goal:[en,vi] (can-do statement),
             words:[[zh, pinyin, en, vi]]   ← NEW vocabulary taught in this lesson
             points:[POINT], compare?:[CMP], dialog?:DIALOG, items:[ITEM] }
   POINT   { id, t (short name), p (pattern), en, vi (meaning),
             why:[en,vi] (short explanation), ex:[[zh,en,vi]],
             vis?:VIS, tip?:[en,vi] (note for Vietnamese speakers),
             mis?:[[wrong, right, en, vi]] (typical mistake) }
   VIS     { k:'blocks', rows:[[[chunk, role]]] }            word-order boxes
           { k:'time', marks:[[pos(0–100), zh, en, vi]], now? } simple timeline
   CMP     { title, a, b, rows:[[en, vi, a-text, b-text]], ex:[[zhA, zhB]] }
   DIALOG  { title:[en,vi], lines:[[speaker, zh, en, vi]] }
   ITEM    common: t, g (point id), et (error category), h:[[en,vi],[en,vi]] hints,
                   e:[en,vi] explanation, s:'t' (mini check), st (stage override),
                   pic?:[[emoji, zh-label?]]
     mc      q (may contain ___), o:[options], a (index), of?:{idx:[en,vi]}
     pick    choose the correct sentence: o:[sentences], a
     match   pairs:[[zh, en, vi]]
     fill    q with ___ ; a:[[accepted…]] per blank ; bank?:[words] (tap-to-fill)
     spot    tap the wrong part: seg:[segments], a (index), fix (corrected sentence)
     order   c:[chunks in correct order], alt?:[other accepted full sentences]
     dlg     d:[[speaker, zh | null]] (null = the missing line), o:[options], a
     fix | complete | vi | en | short   open answers:
             q, a:[accepted/model answers], req?:['A|B'], bad?:[[regex, [en,vi], et]]
             (short = personal answer; always compared with the model)
   ===================================================================== */
(function (g) {
  'use strict';
  const HSK = g.HSK = g.HSK || {};
  HSK.units = [];
  HSK.PY = HSK.PY || {};
  HSK.unit = function (u) { HSK.units.push(u); };

  HSK.LEVELS = {
    1: { zh: '一级', en: 'HSK 1', vi: 'HSK 1', d: ['Foundations: word order, questions, numbers, time and simple sentences.', 'Nền tảng: trật tự từ, câu hỏi, số đếm, thời gian và câu đơn.'] },
    2: { zh: '二级', en: 'HSK 2', vi: 'HSK 2', d: ['Actions in time, comparison, linking words and complements.', 'Hành động theo thời gian, so sánh, từ nối và bổ ngữ.'] },
    3: { zh: '三级', en: 'HSK 3', vi: 'HSK 3', d: ['Longer sentences, aspect, complements, 把 and 被, and connected speech.', 'Câu dài hơn, thể, bổ ngữ, câu 把 và 被, và nói/viết liền mạch.'] }
  };

  /* Simple mistake labels shown to learners */
  HSK.ERR = {
    wo:    { en: 'Word order', vi: 'Trật tự từ' },
    word:  { en: 'Wrong word', vi: 'Dùng sai từ' },
    miss:  { en: 'Missing word', vi: 'Thiếu từ' },
    extra: { en: 'Extra word', vi: 'Thừa từ' },
    q:     { en: 'Question structure', vi: 'Cấu trúc câu hỏi' },
    neg:   { en: 'Negation', vi: 'Phủ định' },
    mw:    { en: 'Measure word', vi: 'Lượng từ' },
    time:  { en: 'Time expression', vi: 'Biểu đạt thời gian' },
    cmp:   { en: 'Comparison', vi: 'So sánh' },
    asp:   { en: 'Aspect (了 / 过 / 在)', vi: 'Thể (了 / 过 / 在)' },
    comp:  { en: 'Complement', vi: 'Bổ ngữ' }
  };

  /* Word-order roles used in the visual blocks */
  HSK.ROLES = {
    who:   ['Who', 'Ai'], when: ['When', 'Khi nào'], time: ['What time', 'Mấy giờ'], where: ['Where', 'Ở đâu'],
    how:   ['How', 'Thế nào'], act: ['Action', 'Hành động'], what: ['What', 'Cái gì'], desc: ['Description', 'Miêu tả'],
    neg:   ['Not', 'Phủ định'], q: ['Question', 'Câu hỏi'], adv: ['Adverb', 'Phó từ'], link: ['Link word', 'Từ nối'],
    mw:    ['Number + measure', 'Số + lượng từ'], res: ['Result', 'Kết quả'], mark: ['Marker', 'Trợ từ'], cond: ['Condition', 'Điều kiện']
  };

  HSK.TYPES = {
    mc:       ['Multiple choice', 'Chọn đáp án'],
    pick:     ['Choose the correct sentence', 'Chọn câu đúng'],
    match:    ['Match', 'Nối'],
    fill:     ['Fill in the blank', 'Điền vào chỗ trống'],
    spot:     ['Find the mistake', 'Tìm lỗi sai'],
    order:    ['Arrange the sentence', 'Sắp xếp câu'],
    dlg:      ['Mini dialogue', 'Hội thoại ngắn'],
    fix:      ['Correct the mistake', 'Sửa câu sai'],
    complete: ['Complete the sentence', 'Hoàn thành câu'],
    vi:       ['Vietnamese → Chinese', 'Dịch Việt → Trung'],
    en:       ['English → Chinese', 'Dịch Anh → Trung'],
    short:    ['Your answer', 'Câu trả lời của bạn']
  };
  HSK.OPEN = ['fix', 'complete', 'vi', 'en', 'short'];

  /* Lesson steps: Learn → Controlled practice → Guided production → Independent production → Check */
  HSK.STAGES = [
    { k: 'learn', en: 'Learn', vi: 'Học', zh: '学' },
    { k: 'ctrl',  en: 'Practice', vi: 'Luyện tập', zh: '练' },
    { k: 'build', en: 'Build', vi: 'Xây câu', zh: '造句' },
    { k: 'use',   en: 'Use it', vi: 'Vận dụng', zh: '用' },
    { k: 'test',  en: 'Check', vi: 'Kiểm tra', zh: '测' }
  ];
  HSK.PRACTICE_STAGES = ['ctrl', 'build', 'use', 'test'];
  HSK.stageOf = function (it) {
    if (it.st) return it.st;
    if (it.s === 't') return 'test';
    if (['mc', 'pick', 'match', 'fill'].includes(it.t)) return 'ctrl';
    if (['order', 'spot', 'fix', 'complete', 'dlg'].includes(it.t)) return 'build';
    return 'use';
  };

  /* Build look-up tables once all unit files have loaded */
  HSK.index = function () {
    HSK.lessons = []; HSK.points = {}; HSK.lessonById = {}; HSK.items = {}; HSK.unitById = {};
    let n = 0;
    HSK.units.forEach((u, ui) => {
      u.no = ui + 1; HSK.unitById[u.id] = u;
      u.lessons.forEach((l, li) => {
        n++;
        l.no = n; l.unit = u; l.lv = u.lv; l.idx = HSK.lessons.length;
        HSK.lessons.push(l); HSK.lessonById[l.id] = l;
        l.words = l.words || [];
        l.points.forEach(p => { p.lesson = l; HSK.points[p.id] = p; });
        l.items.forEach((it, k) => {
          it.id = it.id || `${l.id}.${k + 1}`;
          it.lesson = l.id; it.unit = u.id; it.lv = u.lv;
          if (!it.g) it.g = l.points[0].id;
          it.stage = HSK.stageOf(it);
          HSK.items[it.id] = it;
        });
      });
    });
    /* Cumulative reviews: after every unit, plus a final review for each level */
    HSK.REVIEWS = [];
    HSK.units.forEach((u, ui) => {
      const lvUnits = HSK.units.filter(x => x.lv === u.lv);
      const last = lvUnits[lvUnits.length - 1] === u;
      const upto = HSK.lessons.filter(l => l.idx <= u.lessons[u.lessons.length - 1].idx);
      const levelStart = HSK.lessons.find(l => l.lv === u.lv);
      const from = last ? levelStart : (ui > 0 && HSK.units[ui - 1].lv === u.lv ? levelStart : u.lessons[0]);
      const range = upto.filter(l => l.idx >= from.idx);
      const first = range[0].no, lastNo = range[range.length - 1].no;
      HSK.REVIEWS.push({
        id: 'r-' + u.id, after: u.id, lv: u.lv, final: last,
        focus: u.lessons.map(l => l.id), lessons: range.map(l => l.id), recycle: upto.filter(l => l.idx < from.idx).map(l => l.id),
        en: last ? `HSK ${u.lv} Final Review` : `Review: Lessons ${first}–${lastNo}`,
        vi: last ? `Ôn tập tổng hợp HSK ${u.lv}` : `Ôn tập: Bài ${first}–${lastNo}`,
        zh: last ? `HSK ${u.lv} 总复习` : `复习 第${first}–${lastNo}课`,
        n: last ? 24 : 15
      });
    });
  };
})(window);
