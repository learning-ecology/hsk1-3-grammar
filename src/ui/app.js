/* =====================================================================
   App shell — navigation (Learn | Practice | Review | My Progress),
   learner settings panel, routing.
   ===================================================================== */
(function (HSK) {
  'use strict';
  HSK.index();
  HSK.Vocab.build();
  const { h } = HSK.UI;
  const St = HSK.Store;
  const NAV = [['learn', '📖', 'Learn', 'Học'], ['practice', '✏️', 'Practice', 'Luyện'], ['review', '🔁', 'Review', 'Ôn'], ['progress', '📈', 'My Progress', 'Tiến độ']];
  const SECTION = { learn: 'learn', lesson: 'learn', practice: 'practice', session: 'practice', review: 'review', reviewRun: 'review', mistakes: 'review', progress: 'progress', teacher: 'progress' };
  let route = { view: 'learn', p: {} };

  function applySettings() {
    const s = St.s.settings, root = document.documentElement;
    if (s.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', s.theme);
    root.style.setProperty('--fs', St.s.teacher.present ? 1.35 : s.fs);
    document.body.classList.toggle('present', !!St.s.teacher.present);
  }

  const app = document.getElementById('app');
  const main = h('main', { id: 'main', tabindex: '-1' });
  const topNav = h('nav', { class: 'top-nav', 'aria-label': 'Main' });
  const botNav = h('nav', { class: 'bot-nav', 'aria-label': 'Main' });
  const panel = h('div', { class: 'settings', hidden: true, role: 'dialog', 'aria-label': 'Settings' });
  const header = h('header', { class: 'topbar' },
    h('button', { class: 'brand', type: 'button', onclick: () => go('learn') }, h('span', { class: 'logo zh' }, '语法'), h('span', { class: 'brand-t' }, h('b', null, 'Grammar Steps'), h('span', null, 'HSK 1–3'))),
    topNav,
    h('div', { class: 'top-right' },
      St.s.teacher.present ? h('button', { class: 'pill', type: 'button', onclick: () => { St.teacher('present', false); applySettings(); render(); } }, 'Exit projector') : null,
      h('button', { class: 'aa', type: 'button', 'aria-label': 'Display settings', title: 'Pinyin, translations, text size', onclick: () => { panel.hidden = !panel.hidden; if (!panel.hidden) drawPanel(); } }, 'Aa')));
  app.appendChild(header); app.appendChild(panel); app.appendChild(main); app.appendChild(botNav);

  function drawNav() {
    const sec = SECTION[route.view];
    [topNav, botNav].forEach(n => {
      n.innerHTML = '';
      NAV.forEach(([k, ic, en, vi]) => n.appendChild(h('button', { class: 'nav-b' + (sec === k ? ' on' : ''), type: 'button', 'aria-current': sec === k ? 'page' : null, onclick: () => go(k) },
        h('span', { class: 'ic', 'aria-hidden': 'true' }, ic), h('span', { class: 'nl' }, en), St.setting('vi') !== false ? h('span', { class: 'nl vi' }, vi) : null,
        k === 'review' && Object.values(St.s.mistakes).filter(m => !m.mastered).length ? h('span', { class: 'badge' }, Object.values(St.s.mistakes).filter(m => !m.mastered).length) : null)));
    });
  }
  function seg(label, key, opts, disabled, note) {
    return h('div', { class: 'set-row' }, h('div', { class: 'set-l' }, label),
      h('div', { class: 'seg-ctl' + (disabled ? ' dis' : '') }, opts.map(([v, t]) => h('button', { type: 'button', class: St.setting(key) === v ? 'on' : '', disabled: !!disabled, onclick: () => { St.setting(key, v); applySettings(); drawPanel(); render(); } }, t))),
      note ? h('div', { class: 'small muted' }, note) : null);
  }
  function drawPanel() {
    const T = St.s.teacher;
    panel.innerHTML = '';
    panel.appendChild(h('div', { class: 'set-head' }, h('b', null, 'Display · Hiển thị'), h('button', { class: 'x', type: 'button', 'aria-label': 'Close', onclick: () => { panel.hidden = true; } }, '✕')));
    panel.appendChild(seg('Pinyin', 'py', [['auto', 'Auto'], ['on', 'Show'], ['off', 'Hide']], !T.pyAllow, !T.pyAllow ? 'Turned off by your teacher · Giáo viên đã tắt' : 'Auto: shown in HSK 1, fading in HSK 2–3 · Tự động: hiện ở HSK 1, dần ẩn ở HSK 2–3'));
    panel.appendChild(seg('English', 'en', [[true, 'On'], [false, 'Off']], !T.trAllow));
    panel.appendChild(seg('Tiếng Việt', 'vi', [[true, 'Bật'], [false, 'Tắt']], !T.trAllow, !T.trAllow ? 'Translations turned off by your teacher · Giáo viên đã tắt bản dịch' : null));
    panel.appendChild(seg('Text size · Cỡ chữ', 'fs', [[0.9, 'S'], [1, 'M'], [1.15, 'L'], [1.3, 'XL']]));
    panel.appendChild(seg('Theme · Giao diện', 'theme', [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]));
    panel.appendChild(h('p', { class: 'small muted' }, 'Tip: as you progress, try hiding pinyin and translations. · Mẹo: khi tiến bộ hơn, hãy thử ẩn pinyin và bản dịch.'));
  }
  function render() {
    main.innerHTML = '';
    drawNav();
    const fn = HSK.Views[route.view] || HSK.Views.learn;
    try { fn(main, route.p); }
    catch (e) { console.error(e); main.appendChild(h('div', { class: 'card empty' }, 'Something went wrong on this page. · Có lỗi khi mở trang.')); }
  }
  function go(view, p) {
    route = { view, p: p || {} };
    panel.hidden = true;
    render();
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) panel.hidden = true; });
  HSK.App = { go, render, applySettings, get route() { return route; } };
  applySettings();
  const last = St.s.last;
  go('learn');
})(window.HSK);
