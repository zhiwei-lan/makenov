/* ------------------------------------------------------------
   MAKENOV 사전 렌더 (운영 레포판) — 실행: node prerender.js && node build-sites.js
   ------------------------------------------------------------
   구 레포 prerender.js 를 이식. 페이지 루트가 public/ 인 것과,
   크롬 151에서 없어진 --headless=old 대신 새 헤드리스를 쓰는 것만 다르다.

   왜 필요한가
     index/directory/companies/guide/columns 는 화면을 전부 JS로 그린다.
     JS 없는 크롤러(GPTBot 등)가 받을 본문을 <main> 안 <div id="mk-prerender"> 사본으로
     심어 둔다. app.js 부팅 첫 줄이 사본을 지우고 평소대로 다시 그린다.

   ★이 사본이 낡으면 페이지 진입 때 "옛 내용 → 새 내용" 깜빡임이 보인다
     (2026-08-26 문의 — columns.html 옛 칼럼 2편·한글 칩이 먼저 보였다 바뀜).
     관리자에서 콘텐츠를 고치면 bake-* 와 함께 이것도 다시 돌려야 한다.

   ⚠ 새 헤드리스는 Supabase 연결이 열려 있으면 --dump-dom 뒤에도 안 끝날 수 있다.
     execFileSync timeout 으로 강제 종료하고, 그때까지 받은 stdout(DOM)을 쓴다.
   ------------------------------------------------------------ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, 'public');
const PORT = 5799;

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

/* 정적 서버는 반드시 별도 프로세스 — execFileSync(크롬)가 이벤트 루프를 막는다 */
if (process.argv[2] === '--serve') {
  http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME_MAP[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  }).listen(PORT, () => console.log('READY'));
  return;
}

/* 사전 렌더 대상 — 로그인 상태 타는 mypage/admin 제외 */
const HUBS = ['index.html', 'directory.html', 'companies.html', 'about.html', 'guide.html', 'columns.html'];
const LANGS = ['', 'ko/', 'en/'];
const withLangs = f => LANGS.map(pre => pre + f);

const PAGES = [
  ...HUBS.flatMap(withLangs),
  'maker.html',
  'products.html',
  ...withLangs('support.html').map(page => ({ page, extraHashes: ['#faq', '#ask'] })),
].filter(e => fs.existsSync(path.join(ROOT, typeof e === 'string' ? e : e.page)));

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });

if (!CHROME) {
  console.error('크롬을 찾지 못했습니다. 설치 경로를 CHROME 목록에 추가하세요.');
  process.exit(1);
}

const PROFILE = path.join(require('os').tmpdir(), 'makenov-prerender-profile');

/* ★랜딩(index.html 3벌)은 본문이 이미 정적 HTML 이라 사본을 뜨면 페이지가 통째로
   중복된다(2026-08-26 사고 — 105KB 사본이 박혀 카피 깜빡임까지 유발).
   구 레포 규칙대로 헤더·푸터 사본만, display:none 으로 심는다. */
const isLanding = p => /^(?:ko\/|en\/)?index\.html$/.test(p);

/* ---------- 1. 헤드리스 렌더 ---------- */
function renderMain(page, hash, chromeOnly) {
  let dom;
  try {
    dom = execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
      `--user-data-dir=${PROFILE}`,
      '--timeout=15000', '--virtual-time-budget=9000', '--dump-dom',
      `http://localhost:${PORT}/${page}${hash || ''}`,
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    dom = e.stdout || '';                 /* 강제 종료돼도 받아둔 DOM 은 쓴다 */
    if (!dom) throw e;
  }

  const m = dom.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!m && !chromeOnly) return null;

  /* 헤더·푸터 사본도 넣는다 — 크롤러가 받는 HTML 에 내비게이션이 있어야 한다 */
  const chrome = ['mk-header', 'mk-footer']
    .map(id => {
      const b = extractBlock(dom, null, id);
      return b ? `<nav class="mk-static-${id}">${b}</nav>` : '';
    }).join('\n');

  return (chromeOnly ? chrome : m[1] + '\n' + chrome)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\sid="[^"]*"/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    /* 홈 히어로 슬라이드는 항상 1번만 켠다 — JS 첫 렌더와 맞춰 문구 깜빡임 방지 */
    .replace(/<div class="slide ?(?:on)?"/g, '<div class="slide"')
    .replace(/<div class="slide"/, '<div class="slide on"')
    .replace(/(<div class="dots">)([\s\S]*?)(<\/div>)/,
      (m2, a, mid, z) => a + mid.replace(/ class="on"/g, ' class=""')
                                 .replace(/<i class=""/, '<i class="on"') + z)
    .trim();
}

/* 요소 하나를 통째로 떼어낸다 — 여는/닫는 태그를 세면서 짝을 맞춘다 */
function extractBlock(html, cls, id) {
  const open = id
    ? new RegExp(`<(div|header|footer|nav|section)[^>]*\\bid="${id}"[^>]*>`)
    : new RegExp(`<div class="${cls}"[^>]*>`);
  const m = html.match(open);
  if (!m) return null;
  const tagName = id ? m[0].match(/^<(\w+)/)[1] : 'div';
  let i = m.index + m[0].length, depth = 1;
  const tag = new RegExp(`</?${tagName}\\b[^>]*>`, 'g');
  tag.lastIndex = i;
  let t;
  while ((t = tag.exec(html))) {
    depth += t[0][1] === '/' ? -1 : 1;
    if (depth === 0) return html.slice(i, t.index);
  }
  return null;
}

/* ---------- 2. 주입 ---------- */
const OPEN = '<!-- mk:pre (prerender.js가 관리 — 직접 수정 금지) -->';
const CLOSE = '<!-- /mk:pre -->';

function inject(page, html, hidden) {
  const file = path.join(ROOT, page);
  let src = fs.readFileSync(file, 'utf8');
  const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const old = new RegExp('\\n*' + rx(OPEN) + '[\\s\\S]*?' + rx(CLOSE) + '\\n*', 'g');
  src = src.replace(old, '\n');
  const block = `${OPEN}\n<div id="mk-prerender"${hidden ? ' style="display:none"' : ''}>${html}</div>\n${CLOSE}`;
  const mainOpen = src.match(/<main[^>]*>/);
  if (!mainOpen) throw new Error(`${page}: <main> 을 찾지 못했습니다`);
  const at = src.indexOf(mainOpen[0]) + mainOpen[0].length;
  src = src.slice(0, at) + '\n' + block + src.slice(at).replace(/^\n*/, '\n');
  fs.writeFileSync(file, src, 'utf8');
}

const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim().length;

/* ---------- 3. 실행 ---------- */
const child = spawn(process.execPath, [__filename, '--serve'], { stdio: ['ignore', 'pipe', 'inherit'] });

child.stdout.once('data', () => {
  console.log(`임시 서버 :${PORT} (별도 프로세스)\n크롬: ${CHROME}\n`);
  const report = [];
  let failed = 0;
  for (const entry of PAGES) {
    const page = typeof entry === 'string' ? entry : entry.page;
    const extras = (typeof entry === 'string' ? [] : entry.extraHashes) || [];
    process.stdout.write(`  ${page} … `);
    try {
      const landing = isLanding(page);
      let html = renderMain(page, undefined, landing);
      for (const h of extras) {
        const alt = renderMain(page, h);
        const pane = alt && extractBlock(alt, 'nb-body');
        if (pane) html += `\n<div class="nb-body">${pane}</div>`;
      }
      if (!html || text(html) < 200) {
        console.log(`건너뜀 (렌더 결과 ${html ? text(html) : 0}자)`);
        failed++;
        continue;
      }
      inject(page, html, landing);
      console.log(`${text(html)}자`);
      report.push({ 페이지: page, 텍스트: text(html), HTML: html.length });
    } catch (e) {
      console.log('실패:', e.message);
      failed++;
    }
  }
  console.log('');
  console.table(report);
  if (failed) console.log(`⚠ ${failed}개 페이지가 렌더되지 않았습니다.`);
  child.kill();
});
