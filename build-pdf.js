const puppeteer = require('puppeteer');
const { PDFDocument, PDFName } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PAGES = [
  { file: 'index.html',          title: '커버 — Portfolio 메인',           tag: 'COVER' },
  // career는 본문이 길어 마지막 footer 한 줄이 다음 페이지로 넘쳐 거의 빈 페이지가 생긴다.
  // 마지막 섹션과 footer를 한 덩이로 묶어(break-after/before avoid) 같은 페이지에 떨어지게 한다.
  // → 못 들어가면 둘 다 다음 장으로 이동하므로, footer만 있는 빈 페이지가 생기지 않는다.
  {
    file: 'career.html', title: '실무 경력 — 2년의 운영 오너십', tag: '01 · EXPERIENCE',
    printCss: 'section.section:last-of-type { break-after: avoid !important; page-break-after: avoid !important; } footer { break-before: avoid !important; page-break-before: avoid !important; }',
  },
  { file: 'da2joburureung.html', title: '프로젝트 #1 — 다2조부르릉',         tag: '02 · PROJECT' },
  { file: 'ants-camp.html',      title: '프로젝트 #2 — ants-camp',          tag: '03 · PROJECT' },
  { file: 'harness-engineering.html', title: 'AI 워크플로우 — 하네스 엔지니어링', tag: '04 · CAPABILITY' },
];

// 풀스택 버전 번들 — 모두 fs/ 전용 페이지 사용(추후 분화 대비). 커버는 fs/index.html,
// 상세는 fs/career.html 등 fs 사본(title·tag·printCss는 백엔드와 공유).
const PAGES_FS = [
  { file: 'fs/index.html', title: '커버 — 풀스택 Portfolio 메인', tag: 'COVER' },
  ...PAGES.slice(1).map(p => ({ ...p, file: `fs/${p.file}` })),
];

const PRINT_CSS = `
  @page { size: A4; margin: 12mm 0; }
  html, body { background: #fbfbf8 !important; }
  .wrap { padding: 0 56px !important; }

  /* === card / box / block 단위 보호 (광범위 매칭) === */
  [class*="-card"],
  [class*="-box"],
  [class*="-block"],
  [class*="-strip"],
  [class*="-row"],
  [class*="-item"],
  [class*="-grid"],
  .project-card, .skills-block, .skill-row, .highlight,
  .case-card, .contrib-card, .cycle-card, .dec-card, .feature-card,
  .retro-block, .routine-box, .role-card, .value-card, .tech-row,
  .trouble, .trouble-cell, .arch, .layer, .kpi, .item, .stack-tool,
  .screenshot-card, .etc-card, .tech-compare, .decision-comp,
  .role-strip, .kpi-strip, .value-strip, .shot,
  figure, table, blockquote, pre, img {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* === 제목은 다음 줄과 함께 유지 === */
  h1, h2, h3, h4 {
    break-after: avoid-page !important;
    page-break-after: avoid !important;
    break-inside: avoid !important;
  }

  /* === 섹션 도입부 한 덩이 묶기 ===
     체인: [section-tag/eyebrow] → h2 → [section-rule] → [lede]
     각 요소가 "내 앞/뒤로 자르지 마"를 선언해서 도입부가 통째로 다음 페이지로 밀림 */
  .section-tag, .name-tag, .toc-eyebrow, [class*="-eyebrow"], [class*="section-tag"] {
    break-after: avoid-page !important;
    page-break-after: avoid !important;
    break-inside: avoid !important;
  }
  .section-rule, [class*="-rule"] {
    break-before: avoid-page !important;
    break-after: avoid-page !important;
    page-break-before: avoid !important;
    page-break-after: avoid !important;
  }
  .lede, [class*="-lede"], .hero-sub, .main-sub {
    break-before: avoid-page !important;
    page-break-before: avoid !important;
  }
  h1, h2, h3 {
    /* 제목 자체도 "내 앞에서 자르지 마" — 이렇게 해야 section-tag와 한 덩이가 됨 */
    break-before: avoid-page !important;
    page-break-before: avoid !important;
  }

  /* === hero 블록은 통째로 보호 === */
  .hero, .hero-main, header.hero, header.hero-main {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* === 카드 내부 헤더 묶기 ===
     카드 자체는 break-inside: avoid이지만, 카드가 한 페이지보다 클 경우 강제 분할됨.
     그때라도 카드 헤더(번호·제목·서브타이틀)는 본문과 떨어지지 않도록 체인. */
  [class*="-header"], [class*="-meta-row"], [class*="-num"],
  [class*="-title"], [class*="-subtitle"], [class*="-tag"],
  [class*="-headline"] {
    break-after: avoid-page !important;
    page-break-after: avoid !important;
    break-inside: avoid !important;
  }
  [class*="-tagline"], [class*="-body"], [class*="-desc"] {
    break-before: avoid-page !important;
    page-break-before: avoid !important;
  }

  /* === 큰 컨테이너는 자르기 허용 (안 그러면 페이지 한가운데가 비어버림) === */
  .section, .wrap, body { break-inside: auto !important; }

  /* === 링크 모양 표준화 === */
  a { color: inherit !important; text-decoration: none !important; cursor: default !important; }

  /* === 접기 블록: PDF는 전부 펼친 상태 → 클릭 힌트·마커 숨기고 summary를 소제목처럼 === */
  details.fold { break-inside: auto !important; border-color: var(--rule) !important; }
  details.fold > summary { cursor: default !important; }
  details.fold > summary::before { display: none !important; }
  details.fold > summary .fold-hint { display: none !important; }
  details.fold > pre { break-inside: auto !important; }
`;

// 실행 OS에 맞는 Chrome 실행 파일 경로를 찾는다.
// CHROME_PATH 환경변수가 있으면 최우선, 없으면 플랫폼별 표준 설치 경로를 탐색.
function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = {
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
  }[process.platform] || [];
  const found = candidates.find(p => fs.existsSync(p));
  if (found) return found;
  // 못 찾으면 undefined 반환 → puppeteer 번들 Chromium으로 폴백
  return undefined;
}

function buildTOCHTML(pages, opts = {}) {
  const role = opts.role || 'BACKEND';
  const roleKo = opts.roleKo || '백엔드 개발자';
  const rows = pages.map((p, i) => `
    <li class="toc-row">
      <div class="toc-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="toc-meta">
        <div class="toc-tag">${p.tag}</div>
        <div class="toc-title">${p.title}</div>
      </div>
      <div class="toc-dots"></div>
    </li>`).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>목차</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --accent:#0d8754; --accent-soft:#e8f5ee; --ink:#0e1410; --ink-soft:#2a3530; --muted:#5a6b63; --rule:#d6dfd9; --bg:#fbfbf8; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter Tight',-apple-system,sans-serif; color:var(--ink); background:var(--bg); -webkit-font-smoothing:antialiased; }
  .toc-wrap { max-width: 960px; margin: 0 auto; padding: 56px 56px 40px; }
  .toc-eyebrow { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.18em; color:var(--accent); text-transform:uppercase; margin-bottom: 24px; }
  .toc-h { font-family:'Fraunces',serif; font-weight:600; font-size:60px; line-height:1.05; letter-spacing:-.025em; color:var(--ink); margin-bottom: 16px; }
  .toc-sub { font-size: 15px; color: var(--muted); margin-bottom: 36px; font-family:'JetBrains Mono',monospace; }
  .toc-rule { height: 2px; background: var(--accent); width: 100%; margin: 0 0 32px; }
  ol { list-style: none; }
  .toc-row { display: grid; grid-template-columns: 80px 1fr; gap: 24px; padding: 18px 0; border-bottom: 1px solid var(--rule); align-items: baseline; }
  .toc-num { font-family:'Fraunces',serif; font-weight:600; font-size:36px; color: var(--accent); letter-spacing:-.02em; }
  .toc-tag { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.14em; color: var(--accent); text-transform: uppercase; margin-bottom: 6px; }
  .toc-title { font-family:'Fraunces',serif; font-size: 22px; font-weight: 600; color: var(--ink); letter-spacing:-.01em; line-height: 1.3; }
  .toc-footer { margin-top: 30px; font-family:'JetBrains Mono',monospace; font-size: 12px; color: var(--muted); text-align:center; }
</style>
</head>
<body>
<div class="toc-wrap">
  <div class="toc-eyebrow">TABLE OF CONTENTS</div>
  <h1 class="toc-h">목차</h1>
  <div class="toc-sub">PORTFOLIO · 김단비 · ${role}</div>
  <div class="toc-rule"></div>
  <ol>${rows}</ol>
  <div class="toc-footer">김단비 · ${roleKo} — Portfolio v2026.05</div>
</div>
</body>
</html>`;
}

// pdf-lib 문자열 객체(PDFString/PDFHexString)에서 실제 문자열 값을 뽑는다.
function pdfStringValue(obj) {
  if (!obj) return null;
  if (typeof obj.decodeText === 'function') return obj.decodeText();
  if (typeof obj.asString === 'function') return obj.asString();
  return String(obj);
}

// 병합본의 링크 주석을 1패스로 정규화한다(원본 HTML은 렌더 시 링크를 그대로 두고, 여기서 처리).
//  - 외부 링크(http/https/mailto/tel)는 그대로 유지 → 기존 배포본에서 작동하던 링크를 깨지 않음.
//  - HTML 페이지 간 상대 이동 링크는 Chrome이 file:// URI 링크로 내보내는데,
//    이를 병합본의 해당 페이지로 점프하는 내부 GoTo 링크로 재작성(= "pdf 한정 슬라이드 이동").
//  - 번들에 없는 file:// 링크는 끊어진 로컬 경로가 노출되지 않도록 주석을 제거.
function rewriteInternalLinks(merged, pageIndexByName) {
  const pageCount = merged.getPageCount();
  for (let pi = 0; pi < pageCount; pi++) {
    const pg = merged.getPage(pi);
    const annots = pg.node.Annots();
    if (!annots) continue;
    const kept = [];
    for (const item of annots.asArray()) {
      const annot = merged.context.lookup(item);
      if (!annot || typeof annot.get !== 'function' || String(annot.get(PDFName.of('Subtype'))) !== '/Link') {
        kept.push(item); continue;
      }
      const action = merged.context.lookup(annot.get(PDFName.of('A')));
      const isUri = action && typeof action.get === 'function' && String(action.get(PDFName.of('S'))) === '/URI';
      const uri = isUri ? pdfStringValue(action.get(PDFName.of('URI'))) : null;
      if (uri == null) { kept.push(item); continue; }                        // #앵커(GoTo) 등 → 유지
      if (/^(https?|mailto|tel):/i.test(uri.trim())) { kept.push(item); continue; } // 외부 링크 → 유지
      const name = (uri.match(/([^/\\]+\.html)(?:[#?].*)?$/i) || [])[1];      // file:// 상대 이동 링크
      const targetIdx = name ? pageIndexByName[name] : undefined;
      if (targetIdx == null) continue;                                       // 번들 밖 → 제거
      const target = merged.getPage(targetIdx);
      annot.delete(PDFName.of('A'));
      annot.set(PDFName.of('Dest'), merged.context.obj([
        target.ref, PDFName.of('XYZ'), 0, target.getHeight(), null,         // 대상 페이지 최상단으로
      ]));
      kept.push(item);
    }
    pg.node.set(PDFName.of('Annots'), merged.context.obj(kept));
  }
}

// pages(번들 순서)와 startIndices로 "파일명 → 병합본 페이지 인덱스" 맵을 만든다.
// buffers[0]=TOC, buffers[i+1]=pages[i] 이므로 pages[i] ↔ startIndices[i+1].
function buildPageIndexByName(pages, startIndices) {
  const map = {};
  pages.forEach((p, i) => { map[path.basename(p.file)] = startIndices[i + 1]; });
  return map;
}

async function renderA4(page, fileUrl, scale = 0.78, extraCss = '') {
  await page.setViewport({ width: 1024, height: 800, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); // PDF는 접힘 무시하고 전부 펼쳐 출력
  await page.addStyleTag({ content: PRINT_CSS });
  if (extraCss) await page.addStyleTag({ content: extraCss });
  await page.emulateMediaType('print');
  return await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', right: '0', bottom: '12mm', left: '0' },
    scale,
    preferCSSPageSize: false,
  });
}

async function renderLong(page, fileUrl) {
  await page.setViewport({ width: 1024, height: 800, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; })); // PDF는 접힘 무시하고 전부 펼쳐 출력
  const dims = await page.evaluate(() => {
    const h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    return { h, w: 1024 };
  });
  return await page.pdf({
    width: `${dims.w}px`,
    height: `${dims.h + 8}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
}

const PX_TO_PT = 0.75; // 96 CSS px/inch → 72 pt/inch (Puppeteer scale 1 기준)

// TOC 각 행의 위치를 CSS px 단위로 수집.
// 반드시 PDF로 내보낼 때와 "동일한 뷰포트·미디어"에서 측정해야 좌표가 어긋나지 않음.
async function getTocBoxes(page) {
  return await page.evaluate(() =>
    [...document.querySelectorAll('.toc-row')].map(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    })
  );
}

async function mergePdfs(buffers) {
  const merged = await PDFDocument.create();
  const startIndices = []; // 각 버퍼의 첫 페이지가 병합본에서 갖는 페이지 인덱스
  for (const buf of buffers) {
    startIndices.push(merged.getPageCount());
    const src = await PDFDocument.load(buf);
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach(p => merged.addPage(p));
  }
  return { merged, startIndices };
}

// 목차(0번 페이지)의 각 행 위에 클릭 영역(Link annotation)을 만들고
// 해당 섹션이 시작되는 페이지로 점프시킨다.
function addTocLinks(merged, rowBoxes, startIndices) {
  const tocPage = merged.getPage(0);
  const ph = tocPage.getHeight();
  let annots = tocPage.node.Annots();
  if (!annots) {
    annots = merged.context.obj([]);
    tocPage.node.set(PDFName.of('Annots'), annots);
  }
  rowBoxes.forEach((box, i) => {
    const targetIdx = startIndices[i + 1]; // rowBoxes[i] ↔ PAGES[i] ↔ buffers[i+1]
    if (targetIdx == null) return;
    const target = merged.getPage(targetIdx);
    // CSS(좌상단 원점) → PDF(좌하단 원점) 좌표 변환
    const x0 = box.x * PX_TO_PT;
    const x1 = (box.x + box.w) * PX_TO_PT;
    const y1 = ph - box.y * PX_TO_PT;            // 행 상단
    const y0 = ph - (box.y + box.h) * PX_TO_PT;  // 행 하단
    const link = merged.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x0, y0, x1, y1],
      Border: [0, 0, 0], // 클릭 영역 테두리 숨김
      Dest: [target.ref, PDFName.of('XYZ'), 0, target.getHeight(), null], // 대상 페이지 최상단으로
    });
    annots.push(merged.context.register(link));
  });
}

// 긴 한 페이지(통짜 세로) 버전을 만든다: TOC → 각 페이지를 자기 높이만큼의 단일 페이지로 렌더 → 병합.
// tocOpts(role/roleKo)로 백엔드/풀스택 등 버전별 TOC 문구를 바꾼다. outName으로 결과 파일명을 지정.
async function buildLongVersion(browser, pages, tocOpts, outName) {
  const tocPath = path.join(ROOT, `_toc_${outName.replace(/\.pdf$/, '')}.html`);
  fs.writeFileSync(tocPath, buildTOCHTML(pages, tocOpts));
  try {
    const longBuffers = [];

    const tocPage = await browser.newPage();
    await tocPage.setViewport({ width: 1024, height: 800, deviceScaleFactor: 2 });
    await tocPage.goto(`file://${tocPath}`, { waitUntil: 'networkidle0' });
    const tocH = await tocPage.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    const tocBoxes = await getTocBoxes(tocPage);
    longBuffers.push(await tocPage.pdf({
      width: '1024px',
      height: `${tocH + 8}px`,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    }));
    await tocPage.close();

    for (const p of pages) {
      console.log(`  · ${p.file}`);
      const pg = await browser.newPage();
      longBuffers.push(await renderLong(pg, `file://${path.join(ROOT, p.file)}`));
      await pg.close();
    }

    const long = await mergePdfs(longBuffers);
    addTocLinks(long.merged, tocBoxes, long.startIndices);
    rewriteInternalLinks(long.merged, buildPageIndexByName(pages, long.startIndices));
    fs.writeFileSync(path.join(ROOT, outName), await long.merged.save());
    console.log(`✓ ${outName}`);
  } finally {
    fs.unlinkSync(tocPath);
  }
}

// A4(인쇄용) 버전: TOC + 각 페이지를 A4 한 장씩 렌더 → 병합. PAGES(백엔드)만 대상.
async function buildA4Version(browser, tocPath) {
  console.log('▶ A4 버전 생성 중…');
  const a4Buffers = [];

  const tocPage = await browser.newPage();
  // A4 인쇄 레이아웃과 동일한 조건(프린트 미디어 + A4 픽셀폭)에서 측정해야 링크 좌표가 맞음
  await tocPage.emulateMediaType('print');
  await tocPage.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await tocPage.goto(`file://${tocPath}`, { waitUntil: 'networkidle0' });
  const a4TocBoxes = await getTocBoxes(tocPage);
  a4Buffers.push(await tocPage.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  }));
  await tocPage.close();

  for (const p of PAGES) {
    console.log(`  · ${p.file}`);
    const pg = await browser.newPage();
    a4Buffers.push(await renderA4(pg, `file://${path.join(ROOT, p.file)}`, p.scale, p.printCss));
    await pg.close();
  }

  const a4 = await mergePdfs(a4Buffers);
  addTocLinks(a4.merged, a4TocBoxes, a4.startIndices);
  rewriteInternalLinks(a4.merged, buildPageIndexByName(PAGES, a4.startIndices));
  fs.writeFileSync(path.join(ROOT, 'portfolio-a4.pdf'), await a4.merged.save());
  console.log('✓ portfolio-a4.pdf');
}

async function main() {
  // Write TOC HTML to temp file so it loads with file:// (so Google Fonts work)
  const tocPath = path.join(ROOT, '_toc.html');
  fs.writeFileSync(tocPath, buildTOCHTML(PAGES));

  const browser = await puppeteer.launch({
    executablePath: resolveChromePath(),
    headless: 'new',
    args: ['--no-sandbox'],
  });

  // ONLY=fs|backend 면 해당 버전만 생성(미지정=전체). LONG_ONLY=1 또는 ONLY 지정 시 A4는 건너뜀.
  const ONLY = process.env.ONLY;

  try {
    // ===== A4 VERSION ===== (LONG_ONLY=1 / ONLY 지정 시 건너뜀 — long 버전만 갱신)
    if (process.env.LONG_ONLY || ONLY) {
      console.log('▶ A4 버전 건너뜀 (long만 갱신)');
    } else {
      await buildA4Version(browser, tocPath);
    }

    // ===== LONG VERSION (백엔드) =====
    if (ONLY !== 'fs') {
      console.log('▶ 긴 한 페이지 버전 생성 중…');
      await buildLongVersion(browser, PAGES, {}, 'portfolio-long.pdf');
    }

    // ===== LONG VERSION (풀스택 — /fs) =====
    if (ONLY !== 'backend') {
      console.log('▶ 풀스택(/fs) 긴 한 페이지 버전 생성 중…');
      await buildLongVersion(browser, PAGES_FS, { role: 'FULLSTACK', roleKo: '풀스택 개발자' }, 'portfolio-fs-long.pdf');
    }
  } finally {
    await browser.close();
    fs.unlinkSync(tocPath);
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { buildTOCHTML, PAGES, PAGES_FS };
