#!/usr/bin/env node
/* ============================================================
   build-sites.js — 언어별 서브도메인 정적 사이트 생성기
   ------------------------------------------------------------
   public/ 하나로 운영하던 사이트를 호스트별 독립 폴더 3개로 나눈다.
     sites/vn.makenov.com   베트남어 = public/ 루트 파일
     sites/kr.makenov.com   한국어   = public/ko/* 를 루트로 올림
     sites/en.makenov.com   영어     = public/en/* 를 루트로 올림
   각 폴더는 그 자체로 완전한 정적 사이트다(assets·about-assets 포함,
   sitemap.xml·robots.txt 내장). 1Panel 에 정적 사이트 3개로 올리고
   루트만 이 폴더로 잡으면 된다. API(/rest/v1 …)·관리자(/admin/)·업로드
   이미지(/storage/v1 …)는 그대로 makenov.com(CI4, public/) 이 맡는다 —
   config.js 의 MK_SUPABASE_URL 이 https://makenov.com/ 이고 CORS 가 * 라
   어느 호스트에서든 그대로 동작한다.

   사용:  node build-sites.js        (public/ 을 고친 뒤 다시 돌리면 sites/ 갱신)
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const OUT = path.join(__dirname, 'sites');

const SITES = {
  'vn.makenov.com': { lang: 'vi', dir: '',    sitemap: 'vn' },
  'kr.makenov.com': { lang: 'ko', dir: 'ko',  sitemap: 'kr' },
  'en.makenov.com': { lang: 'en', dir: 'en',  sitemap: 'en' },
};
const HOSTS = { vi: 'vn.makenov.com', ko: 'kr.makenov.com', en: 'en.makenov.com' };

/* makenov.com(CI4) 에만 남는 것 — 언어 사이트에 복사하지 않는다 */
const ROOT_SKIP = new Set(['admin', 'index.php', 'uploads', 'sitemaps', 'ko', 'en',
  'google17861e0b4b6f5a98.html', 'naver6bbd9863e5f526a16ff68dfcec96b5ef.html',
  'google28ab2b08be07d6c0.html', 'naver275b123d9640d96c00f54d8f0d0da9a1.html']);

/* 검색엔진 소유확인 파일 — 원본은 public/ 에 두고(ROOT_SKIP 으로 일괄복사 제외),
   실제 등록한 속성의 호스트에만 복사한다. 새 속성을 등록하면 여기에 파일명을 추가할 것 */
const VERIFY = {
  'vn.makenov.com': ['google28ab2b08be07d6c0.html', 'naver275b123d9640d96c00f54d8f0d0da9a1.html', 'google17861e0b4b6f5a98.html'],
  'kr.makenov.com': [],   // 속성 등록 시 발급받는 확인파일명을 여기에
  'en.makenov.com': [],   // 속성 등록 시 발급받는 확인파일명을 여기에
};

/* 루트에만 있는 언어 중립 페이지(JS 가 호스트 언어로 그림). kr/en 사이트에도 복사한다 */
const NEUTRAL = ['mypage.html', 'product.html', 'company.html', 'column.html', 'sitemap.html', 'maker.html', 'about.html', 'favicon.ico'];

const NEUTRAL_META = {
  'product.html': {
    ko: { title: '제품 | MAKENOV', description: 'MAKENOV 제품 상세 정보입니다.' },
    en: { title: 'Product | MAKENOV', description: 'Product details on MAKENOV.' },
  },
  'company.html': {
    ko: { title: '공급사 | MAKENOV', description: 'MAKENOV 공급사 상세 정보입니다.' },
    en: { title: 'Supplier | MAKENOV', description: 'Supplier profile on MAKENOV.' },
  },
  'column.html': {
    ko: { title: '칼럼 | MAKENOV', description: 'MAKENOV 칼럼 상세 내용입니다.' },
    en: { title: 'Article | MAKENOV', description: 'Article details on MAKENOV.' },
  },
};

/* robots.txt 본문 — app/Controllers/Api/Seo.php 의 robotsBody() 와 같은 내용을 유지한다.
   와일드카드만으로도 AI 크롤러는 허용되지만, 명시해 두면 의도가 기록으로 남는다. */
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'CCBot'];
const robotsBody = host =>
  ['*', ...AI_BOTS].map(ua => `User-agent: ${ua}\nAllow: /\nDisallow: /admin/\nDisallow: /mypage.html\n`).join('\n')
  + `\nSitemap: https://${host}/sitemap.xml\n`;

function rmrf(p){ fs.rmSync(p, { recursive: true, force: true }); }
function cp(src, dst){
  const st = fs.statSync(src);
  if(st.isDirectory()){
    fs.mkdirSync(dst, { recursive: true });
    for(const e of fs.readdirSync(src)) cp(path.join(src, e), path.join(dst, e));
  }else{
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}
function walk(d){
  return fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
}

/* 언어 중립 페이지를 다른 호스트에 둘 때 canonical/og:url 만 그 호스트로 */
function rehost(html, host){
  return html
    .replace(/(<link rel="canonical" href=")https:\/\/vn\.makenov\.com\//g, `$1https://${host}/`)
    .replace(/(<meta property="og:url" content=")https:\/\/vn\.makenov\.com\//g, `$1https://${host}/`);
}

function localizeNeutral(html, file, lang, host){
  html = rehost(html, host)
    .replace(/<html lang="[^"]+">/, `<html lang="${lang}">`);
  const meta = NEUTRAL_META[file]?.[lang];
  if(!meta) return html;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, `$1${meta.description}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${meta.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${meta.description}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${meta.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${meta.description}$2`);
}

function repairMissingDetailLinks(html, dst){
  return html.replace(/href="(products|companies)\/([^"/?]+)\.html"/g, (match, kind, id) => {
    if(fs.existsSync(path.join(dst, kind, `${id}.html`))) return match;
    const page = kind === 'products' ? 'product' : 'company';
    return `href="${page}.html?id=${id}"`;
  });
}

/* 언어 사이트(kr/en)는 해당 언어 폴더를 루트로 올리므로, 본문에 남은
   href="ko/..." / href="en/..." 접두는 그대로 두면 /ko/... 404 가 된다 */
function stripLangPrefix(html, dir){
  if(!dir) return html;
  return html.replace(new RegExp('href="' + dir + '/', 'g'), 'href="');
}

/* 언어 전환 링크는 makenov.com 의 /ko /en 경로 기준이라 서브도메인에서 전부 깨진다.
   각 언어의 호스트 절대주소로 바꾼다 */
function absolutizeLangSwitch(html){
  return html.replace(/(<a data-lang=")(vi|ko|en)(" href=")\/(?:ko\/|en\/)?([^"]*)"/g,
    (m, a, lang, b, rest) => a + lang + b + 'https://' + HOSTS[lang] + '/' + rest + '"');
}

function writeLegacyHomeRedirects(dst){
  const LEGACY = { ko: { host: HOSTS.ko, lang: 'ko' }, en: { host: HOSTS.en, lang: 'en' },
                   vi: { host: HOSTS.vi, lang: 'vi' }, vn: { host: HOSTS.vi, lang: 'vi' } };  // vn 은 옛 경로, 문서 언어는 vi
  for(const [prefix, { host, lang }] of Object.entries(LEGACY)){
    const dir = path.join(dst, prefix);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=https://${host}/">
<link rel="canonical" href="https://${host}/">
<title>MAKENOV</title></head><body>
<script>location.replace('https://${host}/'+location.search+location.hash)</script>
<a href="https://${host}/">Continue</a></body></html>\n`);
  }
}

rmrf(OUT);
for(const [host, cfg] of Object.entries(SITES)){
  const dst = path.join(OUT, host);
  fs.mkdirSync(dst, { recursive: true });

  /* 1) 언어 파일 */
  if(cfg.dir === ''){
    for(const e of fs.readdirSync(PUB)){
      if(ROOT_SKIP.has(e)) continue;
      if(e === 'about-assets') continue;         // 아래에서 참조된 것만
      cp(path.join(PUB, e), path.join(dst, e));
    }
  }else{
    cp(path.join(PUB, cfg.dir), dst);            // ko/* → 루트
    cp(path.join(PUB, 'assets'), path.join(dst, 'assets'));
    for(const f of NEUTRAL){
      const s = path.join(PUB, f);
      if(!fs.existsSync(s)) continue;
      if(fs.existsSync(path.join(dst, f))) continue;   // 언어판이 있으면 그걸 쓴다
      if(f.endsWith('.html')) fs.writeFileSync(path.join(dst, f), localizeNeutral(fs.readFileSync(s, 'utf8'), f, cfg.lang, host));
      else cp(s, path.join(dst, f));
    }

    /* /ko 또는 /en 아래에서 두 단계 올라가던 상세 페이지를 호스트 루트 기준으로 보정 */
    for(const f of walk(dst).filter(f => f.endsWith('.html'))){
      const html = fs.readFileSync(f, 'utf8').replace('<base href="../../">', '<base href="../">');
      fs.writeFileSync(f, html);
    }
  }

  /* 공통 페이지도 각 호스트의 문서 언어와 canonical을 사용 */
  for(const file of NEUTRAL.filter(f => f.endsWith('.html'))){
    const f = path.join(dst, file);
    if(fs.existsSync(f)) fs.writeFileSync(f, localizeNeutral(fs.readFileSync(f, 'utf8'), file, cfg.lang, host));
  }

  for(const f of walk(dst).filter(f => f.endsWith('.html'))){
    let h = repairMissingDetailLinks(fs.readFileSync(f, 'utf8'), dst);
    h = stripLangPrefix(h, cfg.dir);
    h = absolutizeLangSwitch(h);
    fs.writeFileSync(f, h);
  }

  writeLegacyHomeRedirects(dst);

  /* 2) about-assets — 이 사이트의 HTML 이 실제로 참조하는 파일만 */
  const htmls = walk(dst).filter(f => f.endsWith('.html'));
  const used = new Set();
  for(const f of htmls){
    const s = fs.readFileSync(f, 'utf8');
    for(const m of s.matchAll(/(?:\.\.\/)*about-assets\/([^"'\s)?]+)/g)) used.add(m[1]);
  }
  for(const name of used){
    const s = path.join(PUB, 'about-assets', name);
    if(fs.existsSync(s)) cp(s, path.join(dst, 'about-assets', name));
  }
  /* 랜딩이 about-assets 를 쓰면 CSS 와 폰트(f/, unicode-range 서브셋이라 어떤 파일이 필요할지 정적으로 모름)는 통째로 */
  if(used.size){
    for(const e of fs.readdirSync(path.join(PUB, 'about-assets'))){
      if(e === 'f' || e.endsWith('.css')) cp(path.join(PUB, 'about-assets', e), path.join(dst, 'about-assets', e));
    }
  }

  /* 2-b) 검색엔진 소유확인 파일 */
  for(const f of (VERIFY[host] || [])){
    const s = path.join(PUB, f);
    if(fs.existsSync(s)) fs.copyFileSync(s, path.join(dst, f));
  }

  /* 3) sitemap.xml / robots.txt — 호스트별 정적 파일 */
  const sm = path.join(PUB, 'sitemaps', cfg.sitemap + '.xml');
  if(fs.existsSync(sm)) fs.copyFileSync(sm, path.join(dst, 'sitemap.xml'));
  fs.writeFileSync(path.join(dst, 'robots.txt'), robotsBody(host));

  /* 4) 점검: 언어 폴더 접두가 남은 링크가 없어야 한다 */
  let bad = 0;
  for(const f of htmls){
    const s = fs.readFileSync(f, 'utf8');
    bad += (s.match(/href="(ko|en)\//g) || []).length;
  }
  const n = walk(dst).length;
  console.log(`${host}: ${n} files, ${htmls.length} html, about-assets ${used.size}, stale lang links ${bad}`);
}
console.log('done → sites/');
