// 발표용 spot 네비게이션 — 섹션 단위 이전/다음 즉시 이동 (◀ ▶ 버튼 · 키보드 ←/→)
(function () {
  // 섹션 + data-spot 마커(섹션 내부의 세부 발표 지점)를 문서 순서대로 수집
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.section, [data-spot]'));
  if (!sections.length) return;

  var style = document.createElement('style');
  style.textContent = [
    '.spot-nav { position: fixed; right: 20px; bottom: 20px; z-index: 900;',
    '  display: flex; align-items: center; gap: 2px;',
    '  background: var(--card, #fff); border: 1px solid var(--rule, #d6dfd9); border-radius: 999px;',
    '  padding: 4px 8px; box-shadow: 0 4px 16px rgba(14,20,16,0.12); }',
    '.spot-nav button { border: 0; background: none; cursor: pointer; padding: 6px 8px;',
    '  font-size: 13px; line-height: 1; color: var(--ink, #0e1410); border-radius: 999px; }',
    '.spot-nav button:hover { color: var(--accent, #0d8754); background: var(--accent-faded, rgba(13,135,84,0.08)); }',
    '.spot-nav button[disabled] { opacity: 0.25; pointer-events: none; }',
    '.spot-nav .spot-count { font-family: "JetBrains Mono", monospace; font-size: 11.5px;',
    '  color: var(--muted, #5a6b63); min-width: 44px; text-align: center; user-select: none; }'
  ].join('\n');
  document.head.appendChild(style);

  var nav = document.createElement('div');
  nav.className = 'spot-nav';
  nav.innerHTML =
    '<button type="button" data-dir="-1" aria-label="이전 spot">◀</button>' +
    '<span class="spot-count"></span>' +
    '<button type="button" data-dir="1" aria-label="다음 spot">▶</button>';
  document.body.appendChild(nav);

  var prevBtn = nav.querySelector('[data-dir="-1"]');
  var nextBtn = nav.querySelector('[data-dir="1"]');
  var countEl = nav.querySelector('.spot-count');

  // 상세 페이지의 처음/끝 spot 경계를 넘어가면 index의 해당 프로젝트 카드로 이동
  var exitUrl = {
    'career.html': 'index.html#card-career',
    'da2joburureung.html': 'index.html#card-da2jo',
    'ants-camp.html': 'index.html#card-ants',
    'harness-engineering.html': 'index.html#card-harness'
  }[location.pathname.split('/').pop()];

  // spot 목표 y좌표 목록 — 이미지 로딩 등으로 레이아웃이 변하므로 매번 재계산
  function targets() {
    // 페이지 끝 근처 섹션은 스크롤 최대치까지만 이동 가능하므로 클램프
    var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var list = sections.map(function (s) {
      var y = Math.max(0, s.getBoundingClientRect().top + window.scrollY - 24);
      return Math.min(y, maxScroll);
    });
    // 첫 섹션 위에 히어로 등 별도 영역이 있으면 페이지 최상단도 spot으로 취급
    if (list[0] > 200) list.unshift(0);
    return list;
  }

  function currentIndex(list) {
    var y = window.scrollY + 48;
    var idx = 0;
    for (var i = 0; i < list.length; i++) if (list[i] <= y) idx = i;
    return idx;
  }

  function render() {
    var list = targets();
    var idx = currentIndex(list);
    countEl.textContent = (idx + 1) + ' / ' + list.length;
    prevBtn.disabled = !exitUrl && idx <= 0;
    nextBtn.disabled = !exitUrl && idx >= list.length - 1;
  }

  function jump(dir) {
    var list = targets();
    var idx = currentIndex(list) + dir;
    if (idx < 0 || idx >= list.length) {
      if (exitUrl) location.href = exitUrl;
      return;
    }
    // 'auto'는 CSS scroll-behavior(smooth)를 따라가므로 'instant'로 즉시 점프
    window.scrollTo({ top: list[idx], behavior: 'instant' });
    render();
  }

  prevBtn.addEventListener('click', function () { jump(-1); });
  nextBtn.addEventListener('click', function () { jump(1); });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var overlay = document.querySelector('.lightbox-overlay.active');
    if (overlay) return; // 라이트박스 확대 중엔 개입하지 않음
    if (e.key === 'ArrowLeft') { e.preventDefault(); jump(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); jump(1); }
  });

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(); });
  }, { passive: true });
  window.addEventListener('resize', render);

  render();
})();
