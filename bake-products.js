#!/usr/bin/env node
/* ============================================================
   bake-products.js — 제품 상세 정적 페이지 굽기 (운영 레포용, 제품 전용)
   ------------------------------------------------------------
   배경: 제품 정적 페이지(products/*.html)는 구 레포 bake.js 산출물이 8/24 에
   멈춰 있었고, 운영 레포에는 제품 굽기 도구가 없었다. 관리자에서 제품을 고치면
   DB 만 바뀌고 정적 페이지는 옛 내용이라, 페이지 진입 때 "옛 내용 → 새 내용"
   교체가 눈에 보였다(2026-08-26 깜빡임 문의). bake-columns.js 와 같은 방식.

   하는 일
     1) CI4 미믹 REST 에서 products(published)·companies 로드
     2) products/<id>.html 을 vi / ko/ / en/ 세 벌 생성
        (Product+Breadcrumb 스키마, 상세 블록·브랜드·관련제품 — page-product.js
         렌더와 최대한 같은 내용으로 구워 하이드레이션 교체가 안 보이게)
     3) assets/js/baked.js 의 products 목록 갱신
     4) sitemaps/{vn,kr,en}.xml 의 제품 항목 교체 + directory lastmod 갱신
   템플릿 머리(스크립트 목록·파비콘·CSS 버전)는 기존 구운 제품 페이지에서 물려받는다.
   가격·MOQ 등 잠금 정보는 정적에 굽지 않는다(인증 파트너 전용 — RLS 원칙).

   실행: node bake-products.js && node build-sites.js   → 커밋·푸시
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const SITE = 'https://makenov.com';   // 자산(이미지) 전용 — 페이지 URL 은 HOST
const HOST = { vi: 'https://vn.makenov.com', ko: 'https://kr.makenov.com', en: 'https://en.makenov.com' };
const LANGS = ['vi', 'ko', 'en'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const T = (v, lang) => (v && typeof v === 'object') ? (v[lang] || v.vi || v.ko || v.en || '') : String(v ?? '');
const absUrl = u => /^https?:\/\//.test(u || '') ? u : SITE + '/' + String(u || '').replace(/^\.?\//, '');
const read = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(PUB, f)), { recursive: true }); fs.writeFileSync(path.join(PUB, f), s); };
const today = new Date().toISOString().slice(0, 10);
const langFile = (rel, lang) => lang === 'vi' ? rel : `${lang}/${rel}`;
const pageUrl = (rel, lang) => `${HOST[lang]}/${rel}`;
const baseTag = rel => { const d = (rel.match(/\//g) || []).length; return d ? `<base href="${'../'.repeat(d)}">` : ''; };
const altTags = relVi => [...LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(relVi, l)}">`),
  `<link rel="alternate" hreflang="x-default" href="${pageUrl(relVi, 'vi')}">`].join('\n');

/* 기존 구운 제품 페이지에서 머리·꼬리 조각을 물려받는다 */
const TPL = read('products/p9.html');
const CSS_LINK = (TPL.match(/<link rel="stylesheet" href="[^"]*style\.css[^"]*">/) || [''])[0];
const FAVICON = (TPL.match(/<link rel="icon"[^>]*>/) || [''])[0];
const TAIL = (() => {   // </footer> 다음부터 MK_PID 직전까지 = 스크립트 목록
  const a = TPL.indexOf('</footer>') + '</footer>'.length, b = TPL.indexOf('<script>window.MK_PID');
  return TPL.slice(a, b).replace(/<script>window\.MK_FORCE_LANG=[^<]*<\/script>\n?/, '');
})();
const PAGE_PROD = (TPL.match(/<script src="[^"]*page-product\.js[^"]*"><\/script>/) || ['<script src="assets/js/page-product.js"></script>'])[0];
const forceLang = lang => lang === 'vi' ? '' : `<script>window.MK_FORCE_LANG=${JSON.stringify(lang)};</script>\n`;

/* 라벨은 기존 구운 페이지(vi/ko/en)의 것을 그대로 잇는다 */
const LB = {
  vi: { detail:'Chi tiết sản phẩm', brand:'Về thương hiệu', related:'Sản phẩm cùng danh mục',
        dir:'Danh mục sản phẩm', cos:'Danh bạ nhà cung cấp', cols:'Bài viết & hướng dẫn' },
  ko: { detail:'제품 상세', brand:'브랜드 소개', related:'같은 카테고리 제품',
        dir:'제품 목록', cos:'공급사 목록', cols:'칼럼과 가이드' },
  en: { detail:'Product details', brand:'About the brand', related:'More in this category',
        dir:'Product directory', cos:'Supplier directory', cols:'Articles & guides' },
};

/* 카테고리 이름 — data.js 의 MK_CATEGORIES 정의를 그대로 읽어 쓴다 (이중 정의 방지) */
const CATS = (() => {
  const src = read('assets/js/data.js');
  const m = src.match(/const MK_CATEGORIES = (\[[\s\S]*?\]);/);
  return m ? Function('return ' + m[1])() : [];
})();
const catName = (id, lang) => { const c = CATS.find(x => x.id === id); return c ? T(c.name, lang) : id; };

function seoBlock({ title, desc, canonical, ogImage, jsonld, alt }){
  const L = [`<title>${esc(title)}</title>`];
  if(desc) L.push(`<meta name="description" content="${esc(desc)}">`);
  L.push(`<link rel="canonical" href="${canonical}">`, altTags(alt));
  L.push(`<meta property="og:type" content="product">`, `<meta property="og:site_name" content="MAKENOV">`, `<meta property="og:title" content="${esc(title)}">`);
  if(desc) L.push(`<meta property="og:description" content="${esc(desc)}">`);
  L.push(`<meta property="og:url" content="${canonical}">`, `<meta property="og:image" content="${absUrl(ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(title)}">`);
  if(desc) L.push(`<meta name="twitter:description" content="${esc(desc)}">`);
  L.push(`<meta name="twitter:image" content="${absUrl(ogImage)}">`);
  jsonld.forEach(j => L.push(`<script type="application/ld+json">${JSON.stringify(j)}</script>`));
  return `<!-- mk:seo (bake-products.js가 관리 — 직접 수정 금지) -->\n${L.join('\n')}\n<!-- /mk:seo -->`;
}

/* 상세 블록 → HTML — page-product.js 의 렌더와 같은 규칙 (seq 이미지는 pd-strip 으로 묶음).
   video 블록은 정적에서 생략(하이드레이션이 붙인다 — 플레이어 마크업은 JS 전용). */
function detailHtml(p, lang){
  const name = T(p.name, lang);
  const blocks = p.detail || [];
  let out = '', i = 0;
  while(i < blocks.length){
    const b = blocks[i];
    if(b.type === 'img' && b.seq){
      const group = [];
      while(i < blocks.length && blocks[i].type === 'img' && blocks[i].seq){ group.push(blocks[i]); i++; }
      out += `<div class="pd-strip">${group.map((g, n) =>
        `<img src="${g.src}" alt="${esc(name)} 상세 ${n + 1}"${g.w ? ` width="${g.w}" height="${g.h}"` : ''} loading="${n < 2 ? 'eager' : 'lazy'}">`).join('')}</div>`;
      continue;
    }
    if(b.type === 'p')        out += `<p>${esc(T(b.text, lang))}</p>`;
    else if(b.type === 'img') out += `<img src="${b.src}" alt="${esc(name)}" loading="lazy">`;
    i++;
  }
  return out || `<p>${esc(T(p.tagline, lang))}</p>`;
}

function card(o, lang){
  return `<a class="p-card" href="products/${o.id}.html"><div class="thumb"><img src="${o.img}" alt="${esc(T(o.name, lang))}" loading="lazy"></div><div class="body"><span class="brand">${esc(o.brand)}</span><h3>${esc(T(o.name, lang))}</h3><div class="meta"><span class="left">${esc(o.origin || '')}</span></div></div></a>`;
}

function productPage(p, co, related, lang){
  const L = LB[lang];
  const name = T(p.name, lang), tagline = T(p.tagline, lang);
  const relVi = `products/${p.id}.html`, canonical = pageUrl(relVi, lang);
  const title = `${name} — ${p.brand} | MAKENOV`;
  const jsonld = [{ '@context':'https://schema.org', '@type':'Product', name,
      alternativeHeadline: undefined,
      alternateName: LANGS.filter(l => l !== lang).map(l => T(p.name, l)).filter(x => x && x !== name),
      description: tagline, image: [absUrl(p.img)], url: canonical,
      brand: { '@type':'Brand', name: p.brand },
      ...(co ? { manufacturer: { '@type':'Organization', name: T(co.name, lang) },
                 countryOfOrigin: T(co.location, lang) } : {}) },
    { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'MAKENOV', item:HOST.vi + '/' },
      { '@type':'ListItem', position:2, name:L.dir, item:pageUrl('directory.html', lang) },
      { '@type':'ListItem', position:3, name, item:canonical } ] }];
  delete jsonld[0].alternativeHeadline;
  const coLine = co ? `${T(co.name, lang)} · ${T(co.location, lang)}${(co.certs || []).length ? ' · ' + co.certs.slice(0, 3).join(' · ') : ''}` : '';
  const coLink = co && fs.existsSync(path.join(PUB, 'companies', co.id + '.html'))
    ? `\n    <a href="companies/${co.id}.html">${esc(T(co.name, lang))}</a>` : '';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
${baseTag(langFile(relVi, lang))}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${seoBlock({ title, desc: tagline, canonical, ogImage: p.img, jsonld, alt: relVi })}
${CSS_LINK}
${FAVICON}
</head>
<body>
<div id="mk-topbar" class="topbar"><div class="wrap"><span></span><button class="x" onclick="sessionStorage.setItem('mk_topbar_off','1');this.closest('.topbar').remove()">✕</button></div></div><header class="mk-header" id="mk-header"></header>

<main class="pd-wrap" id="pd-root">
  <div class="pd-row">
    <div class="pd-main">
      <div class="pd-gallery"><div class="main"><img src="${p.img}" alt="${esc(name)}"></div></div>
      <div class="pd-sec">
        <h2>${esc(L.detail)}</h2>
        <div class="pd-body">${detailHtml(p, lang)}</div>
      </div>
      <div class="pd-sec">
        <h2>${esc(L.brand)}</h2>
        <div class="pd-body"><p>${esc(T(p.brandStory, lang))}</p></div>
        ${coLine ? `<p class="pd-co-static">${esc(coLine)}</p>` : ''}
      </div>
    </div>
    <aside class="pd-side">
      <div class="box">
        <div class="brand">${esc(p.brand)}</div>
        <h1>${esc(name)}</h1>
        <p class="tagline">${esc(tagline)}</p>
      </div>
    </aside>
  </div>

  <nav class="pd-links">
    <a href="directory.html">${esc(L.dir)}</a>
    <a href="directory.html?category=${p.cat}">${esc(catName(p.cat, lang))}</a>${coLink}
    <a href="companies.html">${esc(L.cos)}</a>
    <a href="columns.html">${esc(L.cols)}</a>
  </nav>
${related.length ? `  <section class="pd-sec">
    <h2>${esc(L.related)}</h2>
    <div class="grid">
      ${related.map(o => card(o, lang)).join('\n      ')}
    </div>
  </section>` : ''}
</main>

<footer class="mk-footer" id="mk-footer"></footer>
${forceLang(lang)}${TAIL.trim()}
<script>window.MK_PID=${JSON.stringify(p.id)};</script>
${PAGE_PROD}
</body>
</html>
`;
}

(async () => {
  const conf = read('assets/js/config.js');
  const url = (conf.match(/MK_SUPABASE_URL\s*=\s*'([^']*)'/) || [])[1], anon = (conf.match(/MK_SUPABASE_ANON\s*=\s*'([^']*)'/) || [])[1];
  const H = { apikey: anon, Authorization: 'Bearer ' + anon };
  const get = async q => { const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + q, { headers: H }); if(!r.ok) throw new Error(q + ' → HTTP ' + r.status); return r.json(); };
  /* 정렬은 런타임 loadContent 와 동일(created_at desc) — 관련제품 순서까지 맞춘다 */
  const pr = await get('products?select=*&published=eq.true&order=created_at.desc');
  const co = await get('companies?select=*&order=sort');
  const products = pr.map(p => ({ id:p.id, companyId:p.company_id, cat:p.cat, brand:p.brand, origin:p.origin,
    name:p.name, tagline:p.tagline, brandStory:p.brand_story, img:p.img, gallery:p.gallery || [],
    video:p.video || '', detail:p.detail || [] }));
  const companies = Object.fromEntries(co.map(c => [c.id, c]));
  console.log(`제품 ${products.length}건 · 회사 ${co.length}곳 (REST ${url})`);

  let n = 0;
  products.forEach(p => {
    /* 관련제품 = 런타임과 동일: 같은 카테고리, 자기 제외, 2개 */
    const related = products.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 2);
    LANGS.forEach(l => { write(langFile(`products/${p.id}.html`, l), productPage(p, companies[p.companyId], related, l)); n++; });
  });
  console.log(`products/*.html ${n}개 생성`);

  /* baked.js — products 배열만 교체 */
  const bj = read('assets/js/baked.js');
  const bj2 = bj.replace(/("products":\s*)\[[^\]]*\]/, `$1${JSON.stringify(products.map(p => p.id), null, 4).replace(/\n/g, '\n  ')}`);
  if(!/"products":\s*\[/.test(bj)) console.log('⚠ baked.js products 블록을 못 찾음');
  else { write('assets/js/baked.js', bj2); console.log('baked.js products 갱신:', products.length); }

  /* sitemaps/{vn,kr,en}.xml — 제품 <url> 전부 교체 + 제품목록(directory) lastmod 갱신 */
  const SMFILE = { vi: 'vn', ko: 'kr', en: 'en' };
  const entry = (relVi, lang, lastmod) => `  <url>\n    <loc>${pageUrl(relVi, lang)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${LANGS.map(l => `      <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(relVi, l)}"/>`).join('\n')}\n      <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(relVi, 'vi')}"/>\n  </url>`;
  LANGS.forEach(lang => {
    const file = `sitemaps/${SMFILE[lang]}.xml`;
    let sm = read(file);
    sm = sm.replace(/\s*<url>\s*<loc>https:\/\/(?:vn|kr|en)\.makenov\.com\/products\/[^<]+<\/loc>[\s\S]*?<\/url>/g, '');
    const add = products.map(p => entry(`products/${p.id}.html`, lang, today)).join('\n');
    sm = sm.replace(/<\/urlset>\s*$/, add + '\n</urlset>\n');
    sm = sm.replace(/(<loc>https:\/\/(?:vn|kr|en)\.makenov\.com\/directory\.html<\/loc>\s*<lastmod>)[^<]+/, `$1${today}`);
    write(file, sm);
  });
  console.log('sitemaps/{vn,kr,en}.xml 갱신: 제품 각', products.length, '건');
})().catch(e => { console.error(e); process.exit(1); });
