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
  'google17861e0b4b6f5a98.html', 'naver6bbd9863e5f526a16ff68dfcec96b5ef.html']);

/* 루트에만 있는 언어 중립 페이지(JS 가 호스트 언어로 그림). kr/en 사이트에도 복사한다 */
const NEUTRAL = ['mypage.html', 'product.html', 'company.html', 'column.html', 'sitemap.html', 'maker.html', 'about.html', 'favicon.ico'];

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
      if(f.endsWith('.html')) fs.writeFileSync(path.join(dst, f), rehost(fs.readFileSync(s, 'utf8'), host));
      else cp(s, path.join(dst, f));
    }
  }

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

  /* 3) sitemap.xml / robots.txt — 호스트별 정적 파일 */
  const sm = path.join(PUB, 'sitemaps', cfg.sitemap + '.xml');
  if(fs.existsSync(sm)) fs.copyFileSync(sm, path.join(dst, 'sitemap.xml'));
  fs.writeFileSync(path.join(dst, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /mypage.html\n\nSitemap: https://${host}/sitemap.xml\n`);

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
