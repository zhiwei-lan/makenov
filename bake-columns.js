#!/usr/bin/env node
/* ============================================================
   bake-columns.js — 칼럼 정적 페이지 굽기 (운영 레포용, 칼럼 전용)
   ------------------------------------------------------------
   구 레포의 bake.js(전체 굽기)는 구 Supabase 구조·랜딩 이전 구조를 전제로 해서
   운영 레포에서 통째로 돌리면 랜딩·언어판을 덮어쓴다. 그래서 칼럼만 떼어 왔다.

   하는 일
     1) CI4 미믹 REST(config.js 의 MK_SUPABASE_URL)에서 columns_post·faqs 로드
     2) columns/<slug>.html 을 vi / ko/ / en/ 세 벌 생성
        (Article+Breadcrumb+FAQPage 스키마, 이전·다음·다른 칼럼 링크)
     3) assets/js/baked.js 의 columns 목록 갱신 → 카드 링크가 ?id= 뷰어 대신 정식 주소로
     4) sitemaps/{vn,kr,en}.xml 의 칼럼 항목 교체 + lastmod 갱신
   템플릿 머리(스크립트 목록·파비콘·CSS 버전)는 기존 구운 칼럼 페이지에서 그대로 물려받는다.

   ★서브도메인 체계(2026-08-19 전환, cfda4a1) — 페이지 URL 은 언어 호스트를 쓴다:
     vi=vn.makenov.com  ko=kr.makenov.com  en=en.makenov.com
     canonical·hreflang·og:url·JSON-LD 는 언어 호스트, 내부 링크는 언어 접두 없이
     (kr/en 서브도메인이 ko/·en/ 폴더를 루트로 서빙하므로). 자산(이미지·로고)은 makenov.com.

   실행: node bake-columns.js && node build-sites.js   → 커밋·푸시
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const SITE = 'https://makenov.com';   // 자산(이미지·로고) 전용 — 페이지 URL 은 HOST 를 쓴다
const HOST = { vi: 'https://vn.makenov.com', ko: 'https://kr.makenov.com', en: 'https://en.makenov.com' };
const LANGS = ['vi', 'ko', 'en'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const T = (v, lang) => (v && typeof v === 'object') ? (v[lang] || v.vi || v.ko || v.en || '') : String(v ?? '');
const stripHtml = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
/* 본문 안 <style> 을 .blog-body 범위로 좁힌다 — admin.js scopeCss 와 같은 알고리즘(멱등).
   조각 디자인의 body·.wrap 광역 규칙이 컨테이너까지 줄이던 사고(2026-08-26 c1) 방지 안전망 */
function scopeCss(css, scope){
  scope = scope || '.blog-body';
  css = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const already = new RegExp('^' + scope.replace(/\./g, '\\.') + '(?![\\w-])');
  let out = '', i = 0;
  while(i < css.length){
    const open = css.indexOf('{', i);
    if(open < 0){ out += css.slice(i); break; }
    const chunk = css.slice(i, open), cut = chunk.lastIndexOf(';');
    if(cut >= 0) out += chunk.slice(0, cut + 1);
    const sel = chunk.slice(cut + 1).trim();
    let depth = 1, j = open + 1;
    while(j < css.length && depth){ if(css[j] === '{') depth++; else if(css[j] === '}') depth--; j++; }
    if(/^@(media|supports|layer)/i.test(sel)){
      out += sel + '{' + scopeCss(css.slice(open + 1, j - 1), scope) + '}';
    }else if(sel.charAt(0) === '@'){
      out += sel + css.slice(open, j);
    }else{
      const scoped = sel.split(',').map(s => {
        s = s.trim(); if(!s) return '';
        if(already.test(s)) return s;
        const m = s.match(/^(html|body|:root)(?![\w-])([\s\S]*)$/i);
        if(!m) return scope + ' ' + s;
        const rest = m[2].trim();
        if(!rest) return scope;
        return /^[\s>+~]/.test(m[2]) ? scope + ' ' + rest : scope + rest;
      }).filter(Boolean).join(', ');
      out += scoped + css.slice(open, j);
    }
    i = j;
  }
  return out;
}
const scopeBody = html => String(html || '').replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
  (m, open, css, close) => open + scopeCss(css) + close);
const clip = (s, n) => { s = String(s ?? '').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
const absUrl = u => /^https?:\/\//.test(u || '') ? u : SITE + '/' + String(u || '').replace(/^\.?\//, '');
const read = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(PUB, f)), { recursive: true }); fs.writeFileSync(path.join(PUB, f), s); };
const today = new Date().toISOString().slice(0, 10);
const langFile = (rel, lang) => lang === 'vi' ? rel : `${lang}/${rel}`;   // 파일이 놓이는 위치 (public/ 안)
const pageUrl = (rel, lang) => `${HOST[lang]}/${rel}`;                     // 페이지의 공개 URL (언어 호스트, 접두 없음)
const baseTag = rel => { const d = (rel.match(/\//g) || []).length; return d ? `<base href="${'../'.repeat(d)}">` : ''; };
const altTags = relVi => [...LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(relVi, l)}">`),
  `<link rel="alternate" hreflang="x-default" href="${pageUrl(relVi, 'vi')}">`].join('\n');
/* 초기 칼럼 2편은 DB slug 가 비어 있다 — Rss.php 의 SLUG_FALLBACK 과 같은 값 (구운 파일명 유지) */
const SLUG_FALLBACK = { 'c-quote': 'quote-request-checklist', 'c-sample': 'sample-request-checklist' };
const colFile = c => c.slug || SLUG_FALLBACK[c.id] || c.id;

/* 기존 구운 칼럼 페이지에서 머리·꼬리 조각을 물려받는다 */
const TPL = read('ko/columns/quote-request-checklist.html');
const CSS_LINK = (TPL.match(/<link rel="stylesheet" href="[^"]*style\.css[^"]*">/) || [''])[0];
const FAVICON = (TPL.match(/<link rel="icon"[^>]*>/) || [''])[0];
const TAIL = (() => {   // </footer> 다음부터 MK_CID 직전까지 = 스크립트 목록 (forceLang 은 제거하고 다시 붙인다)
  const a = TPL.indexOf('</footer>') + '</footer>'.length, b = TPL.indexOf('<script>window.MK_CID');
  return TPL.slice(a, b).replace(/<script>window\.MK_FORCE_LANG=[^<]*<\/script>\n?/, '');
})();
const PAGE_COL = (TPL.match(/<script src="[^"]*page-column\.js[^"]*"><\/script>/) || ['<script src="assets/js/page-column.js"></script>'])[0];
const forceLang = lang => lang === 'vi' ? '' : `<script>window.MK_FORCE_LANG=${JSON.stringify(lang)};</script>\n`;

const LB = {
  vi: { home:'Trang chủ', post:'Bài viết', faq:'Câu hỏi thường gặp', prev:'Bài trước', next:'Bài sau', others:'Bài viết khác', more:'Xem thêm' },
  ko: { home:'홈', post:'칼럼', faq:'자주 묻는 질문', prev:'이전 글', next:'다음 글', others:'다른 칼럼', more:'더 보기' },
  en: { home:'Home', post:'Article', faq:'Frequently asked', prev:'Previous', next:'Next', others:'Other articles', more:'See more' },
};

function seoBlock({ title, desc, canonical, ogImage, jsonld, alt }){
  const L = [`<title>${esc(title)}</title>`];
  if(desc) L.push(`<meta name="description" content="${esc(desc)}">`);
  L.push(`<link rel="canonical" href="${canonical}">`, altTags(alt));
  L.push(`<meta property="og:type" content="article">`, `<meta property="og:site_name" content="MAKENOV">`, `<meta property="og:title" content="${esc(title)}">`);
  if(desc) L.push(`<meta property="og:description" content="${esc(desc)}">`);
  L.push(`<meta property="og:url" content="${canonical}">`, `<meta property="og:image" content="${absUrl(ogImage || '/assets/img/og.png')}">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(title)}">`);
  if(desc) L.push(`<meta name="twitter:description" content="${esc(desc)}">`);
  L.push(`<meta name="twitter:image" content="${absUrl(ogImage || '/assets/img/og.png')}">`);
  jsonld.forEach(j => L.push(`<script type="application/ld+json">${JSON.stringify(j)}</script>`));
  return `<!-- mk:seo (bake-columns.js가 관리 — 직접 수정 금지) -->\n${L.join('\n')}\n<!-- /mk:seo -->`;
}
function staticColFaq(faqs, lang){
  if(!faqs.length) return '';
  return `\n  <section class="blog-faq">\n    <h2>${esc(LB[lang].faq)}</h2>\n    ${faqs.map(f => `<details><summary>${esc(T(f.q, lang))}</summary><div>${esc(T(f.a, lang))}</div></details>`).join('\n    ')}\n  </section>`;
}
/* 내부 링크는 언어 접두 없이 — kr/en 서브도메인이 언어 폴더를 루트로 서빙한다 */
function staticColNav(prev, next, lang){
  if(!prev && !next) return '';
  const f = c => `columns/${colFile(c)}.html`;
  return `\n  <div class="blog-nav">\n    ${prev ? `<a href="${f(prev)}"><div class="dir">${esc(LB[lang].prev)}</div><b>${esc(T(prev.title, lang))}</b></a>` : '<span></span>'}\n    ${next ? `<a class="next" href="${f(next)}"><div class="dir">${esc(LB[lang].next)}</div><b>${esc(T(next.title, lang))}</b></a>` : '<span></span>'}\n  </div>`;
}
function staticColOthers(others, lang){
  if(!others.length) return '';
  const L = LB[lang];
  return `\n<section class="blog-main" id="col-others" style="margin-top:56px">\n  <div class="sec-head"><h2>${esc(L.others)}</h2><a class="more" href="columns.html">${esc(L.more)}</a></div>\n  <div class="blog-list">\n    ${others.map(o => `<div class="blog-item"><a class="blog-item-link" href="columns/${colFile(o)}.html"><div class="blog-item-thumb"><img src="${esc(o.img)}" alt="${esc(T(o.title, lang))}" loading="lazy"></div><div class="blog-item-info"><div class="blog-item-cat">${esc(T(o.cat, lang))}</div><h3 class="blog-item-tit">${esc(T(o.title, lang))}</h3><div class="blog-item-meta"><span>${esc(o.date)}</span></div></div></a></div>`).join('\n    ')}\n  </div>\n</section>`;
}
function columnPage(c, colFaqs, prev, next, others, lang){
  const L = LB[lang];
  const title = T(c.title, lang), cat = T(c.cat, lang);
  const relVi = `columns/${colFile(c)}.html`, canonical = pageUrl(relVi, lang);
  const useSeo = lang === 'ko' && typeof c.seoDesc === 'string';
  const desc = clip((useSeo && c.seoDesc) || T(c.excerpt, lang) || stripHtml(T(c.body, lang)), 155);
  const jsonld = [{ '@context':'https://schema.org', '@type':'Article', headline:title,
      alternativeHeadline: LANGS.map(l => T(c.title, l)).find(x => x && x !== title), description:desc, image:absUrl(c.img),
      datePublished:c.date, dateModified:c.date, inLanguage:lang, mainEntityOfPage:canonical,
      author:{ '@type':'Organization', name:'MAKENOV', url:HOST.vi + '/' },
      publisher:{ '@type':'Organization', name:'MAKENOV', url:HOST.vi + '/', logo:{ '@type':'ImageObject', url:SITE + '/assets/img/logo.png' } },
      isAccessibleForFree:true, articleSection:cat },
    { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'MAKENOV', item:HOST.vi + '/' },
      { '@type':'ListItem', position:2, name:L.post, item:pageUrl('columns.html', lang) },
      { '@type':'ListItem', position:3, name:title, item:canonical } ] }];
  if(colFaqs.length) jsonld.push({ '@context':'https://schema.org', '@type':'FAQPage',
    mainEntity: colFaqs.map(q => ({ '@type':'Question', name:T(q.q, lang), acceptedAnswer:{ '@type':'Answer', text:T(q.a, lang) } })) });
  const headTitle = (useSeo && c.seoTitle && typeof c.seoTitle === 'string') ? `${c.seoTitle} | MAKENOV` : `${title} | MAKENOV`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
${baseTag(langFile(relVi, lang))}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${seoBlock({ title: headTitle, desc, canonical, ogImage: c.img, jsonld, alt: relVi })}
${CSS_LINK}
${FAVICON}
</head>
<body>
<div class="blog-progress"><div class="blog-progress-bar" id="progress-bar"></div></div>
<div id="mk-topbar" class="topbar"><div class="wrap"><span></span><button class="x" onclick="sessionStorage.setItem('mk_topbar_off','1');this.closest('.topbar').remove()">✕</button></div></div><header class="mk-header" id="mk-header"></header>
<main class="wrap">
<article class="blog-single" id="col-root">
  <nav class="blog-breadcrumb"><a href="index.html">${esc(L.home)}</a> - <a href="columns.html">${esc(L.post)}</a> - <span>${esc(title)}</span></nav>
  <span class="blog-single-cat">${esc(cat)}</span>
  <h1>${esc(title)}</h1>
  <div class="blog-single-meta"><span>${esc(c.date)}</span></div>
  <div class="blog-cover"><img src="${esc(c.img)}" alt="${esc(title)}"></div>
  <div class="blog-body">${scopeBody(T(c.body, lang))}</div>
${colFaqs.fromBody ? '' : staticColFaq(colFaqs, lang)}${staticColNav(prev, next, lang)}
</article>
${staticColOthers(others, lang)}
</main>
<footer class="mk-footer" id="mk-footer"></footer>
${forceLang(lang)}${TAIL.trim()}
<script>window.MK_CID=${JSON.stringify(c.id)};</script>
${PAGE_COL}
</body>
</html>
`;
}

(async () => {
  const conf = read('assets/js/config.js');
  const url = (conf.match(/MK_SUPABASE_URL\s*=\s*'([^']*)'/) || [])[1], anon = (conf.match(/MK_SUPABASE_ANON\s*=\s*'([^']*)'/) || [])[1];
  const H = { apikey: anon, Authorization: 'Bearer ' + anon };
  const get = async q => { const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + q, { headers: H }); if(!r.ok) throw new Error(q + ' → HTTP ' + r.status); return r.json(); };
  const cl = await get('columns_post?select=*&published=eq.true&order=date.desc');
  let fq = []; try { fq = await get('faqs?select=*&published=eq.true&order=sort'); } catch (e) {}
  const columns = cl.map(c => ({ id:c.id, cat:c.cat, title:c.title, excerpt:c.excerpt, body:c.body, img:c.img,
    date:String(c.date || '').slice(0, 10), slug:c.slug || '', seoTitle:c.seo_title || '', seoDesc:c.seo_desc || '' }));
  /* 칼럼 FAQ 출처 3단: ① DB faqs(page=칼럼 id) ② data/column-faqs.json(이관 때 유실된 초기 2편 복구본)
     ③ 본문 안의 <h2>FAQ</h2> 뒤 <p><b>질문</b><br>답</p> 묶음(새 칼럼 5편 형식) */
  let localFaqs = []; try { localFaqs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'column-faqs.json'), 'utf8')); } catch (e) {}
  const bodyFaqs = c => {
    const out = [];
    LANGS.forEach(l => {
      const b = T(c.body, l); const m = b.match(/<h2>\s*(?:FAQ|자주 묻는 질문|Câu hỏi thường gặp)\s*<\/h2>([\s\S]*?)(?=<h2>|$)/i);
      if(!m) return;
      [...m[1].matchAll(/<p><b>(.*?)<\/b><br\s*\/?>(.*?)<\/p>/g)].forEach((x, i) => {
        out[i] = out[i] || { q:{}, a:{} }; out[i].q[l] = stripHtml(x[1]); out[i].a[l] = stripHtml(x[2]);
      });
    });
    return out;
  };
  const faqsFor = (page, c) => {
    const db = (fq || []).filter(f => (f.page || 'home') === page);
    if(db.length) return db.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const loc = localFaqs.filter(f => f.page === page);
    if(loc.length) return loc.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    return c ? bodyFaqs(c) : [];
  };
  console.log(`칼럼 ${columns.length}편 (REST ${url})`);

  let n = 0;
  columns.forEach((c, i) => {
    const others = columns.filter(x => x.id !== c.id).slice(0, 2);
    const cf = faqsFor(c.id, c);
    cf.fromBody = !((fq || []).some(f => (f.page || 'home') === c.id) || localFaqs.some(f => f.page === c.id));
    LANGS.forEach(l => { write(langFile(`columns/${colFile(c)}.html`, l), columnPage(c, cf, columns[i - 1], columns[i + 1], others, l)); n++; });
  });
  console.log(`columns/*.html ${n}개 생성`);

  /* baked.js — columns 맵만 교체 */
  const bj = read('assets/js/baked.js');
  const map = Object.fromEntries(columns.map(c => [c.id, colFile(c)]));
  const bj2 = bj.replace(/("columns":\s*)\{[^}]*\}/, `$1${JSON.stringify(map, null, 4).replace(/\n/g, '\n  ')}`);
  if(!/"columns":\s*\{/.test(bj)) console.log('⚠ baked.js columns 블록을 못 찾음'); else { write('assets/js/baked.js', bj2); console.log('baked.js columns 갱신:', Object.keys(map).length); }

  /* sitemaps/{vn,kr,en}.xml — 호스트별로 칼럼 <url> 전부 교체, 칼럼 목록 lastmod 갱신
     (구 public/sitemap.xml 은 서브도메인 전환 때 없어졌다 — Seo.php 가 호스트별 파일을 서빙,
      build-sites.js 가 각 사이트 루트에 sitemap.xml 로 복사) */
  const SMFILE = { vi: 'vn', ko: 'kr', en: 'en' };
  const entry = (relVi, lang, lastmod) => `  <url>\n    <loc>${pageUrl(relVi, lang)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${LANGS.map(l => `      <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(relVi, l)}"/>`).join('\n')}\n      <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(relVi, 'vi')}"/>\n  </url>`;
  LANGS.forEach(lang => {
    const file = `sitemaps/${SMFILE[lang]}.xml`;
    let sm = read(file);
    sm = sm.replace(/\s*<url>\s*<loc>https:\/\/(?:vn|kr|en)\.makenov\.com\/columns\/[^<]+<\/loc>[\s\S]*?<\/url>/g, '');
    const add = columns.map(c => entry(`columns/${colFile(c)}.html`, lang, c.date || today)).join('\n');
    sm = sm.replace(/<\/urlset>\s*$/, add + '\n</urlset>\n');
    sm = sm.replace(/(<loc>https:\/\/(?:vn|kr|en)\.makenov\.com\/columns\.html<\/loc>\s*<lastmod>)[^<]+/, `$1${today}`);
    write(file, sm);
  });
  console.log('sitemaps/{vn,kr,en}.xml 갱신: 칼럼 각', columns.length, '건');
})().catch(e => { console.error(e); process.exit(1); });
