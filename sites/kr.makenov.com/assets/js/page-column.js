/* 칼럼 상세 페이지 렌더 — column.html(동적)과 columns/*.html(정적 굽기) 공용.
   구운 페이지는 window.MK_CID 로 칼럼을 지정하고, 동적 페이지는 ?id= 를 읽는다. */

/* 본문 안 <style> 을 .blog-body 범위로 좁힌다 — admin.js scopeCss 와 같은 알고리즘.
   조각으로 붙여넣은 디자인의 body·.wrap 광역 규칙이 페이지 컨테이너까지 줄이던
   사고(2026-08-26, c1) 방지. 이미 스코핑된 규칙은 그대로 둔다(멱등). */
function colScopeCss(css, scope){
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
      out += sel + '{' + colScopeCss(css.slice(open + 1, j - 1), scope) + '}';
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
/* ── 본문 살균 (bake-columns.js sanitizeBody 와 같은 규칙) ───────────────────
   원고를 완결 HTML 문서째 붙여넣으면 <head> 가 통째로 본문에 딸려 온다.
   2026-08-28 c1·c3: title·canonical·JSON-LD 가 2벌, canonical 은 404 URL.
   굽기에서만 걷어내면 반쪽이다 — 이 파일이 런타임에 DB 원본을 다시 주입하므로
   실제 방문자와 JS 를 실행하는 크롤러는 그대로 중복을 보게 된다.
   여기서는 "이 렌더러가 어차피 다시 만드는 것"만 지운다.
   ───────────────────────────────────────────────────────────────────────── */
function colFindEl(html, openRe){
  openRe.lastIndex = 0;
  const m = openRe.exec(html);
  if(!m) return null;
  const tag = m[1].toLowerCase(), from = m.index + m[0].length;
  if(/\/>$/.test(m[0])) return { start:m.index, innerStart:from, innerEnd:from, end:from };
  const open = new RegExp('<' + tag + '(?=[\s/>])', 'gi'), close = new RegExp('</' + tag + '\s*>', 'gi');
  let depth = 1, i = from;
  while(depth){
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(html), c = close.exec(html);
    if(!c) return { start:m.index, innerStart:from, innerEnd:html.length, end:html.length };
    if(o && o.index < c.index){ depth++; i = o.index + o[0].length; continue; }
    depth--; i = c.index + c[0].length;
    if(!depth) return { start:m.index, innerStart:from, innerEnd:c.index, end:i };
  }
}
const colHasEl  = (h, re) => !!colFindEl(h, re);
const colDropEl = (h, re) => { const e = colFindEl(h, re); return e ? h.slice(0, e.start) + h.slice(e.end) : h; };
const colUnwrap = (h, re) => { const e = colFindEl(h, re); return e ? h.slice(0, e.start) + h.slice(e.innerStart, e.innerEnd) + h.slice(e.end) : h; };
const COL_RE = {
  h1:      () => /<(h1)(?=[\s>])[^>]*>/i,
  wrap:    () => /<(div|article|section|main)[^>]*class="[^"]*\bwrap\b[^"]*"[^>]*>/i,
  crumb:   () => /<(nav|div|p)[^>]*class="[^"]*\bbreadcrumb\b[^"]*"[^>]*>/i,
  eyebrow: () => /<(span|div|p)[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>/i,
  byline:  () => /<(p|div|span)[^>]*class="[^"]*\bbyline\b[^"]*"[^>]*>/i,
};
function colSanitizeBody(html, hasCat){
  let s = String(html || '');
  s = s.replace(/<!DOCTYPE[^>]*>/gi, '')
       .replace(/<\/?(?:html|head|body)(?=[\s>])[^>]*>/gi, '')
       .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
       .replace(/<meta(?=[\s/>])[^>]*>/gi, '')
       .replace(/<base(?=[\s/>])[^>]*>/gi, '')
       .replace(/<link(?=[\s/>])[^>]*>/gi, '')
       .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
  if(colHasEl(s, COL_RE.crumb()))            s = colDropEl(s, COL_RE.crumb());
  if(hasCat && colHasEl(s, COL_RE.eyebrow())) s = colDropEl(s, COL_RE.eyebrow());
  if(colHasEl(s, COL_RE.byline()))           s = colDropEl(s, COL_RE.byline());
  while(colHasEl(s, COL_RE.h1()))            s = colDropEl(s, COL_RE.h1());
  if(colHasEl(s, COL_RE.wrap()))             s = colUnwrap(s, COL_RE.wrap());
  return s.replace(/^\s+/, '');
}
function colScopeBody(html, hasCat){
  return colSanitizeBody(html, hasCat).replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (m, open, css, close) => open + colScopeCss(css) + close);
}
/* 칼럼별 FAQ — 관리자 FAQ 탭에서 '위치'를 이 칼럼으로 지정한 항목만 모은다.
   faqs 테이블의 page 컬럼을 그대로 쓴다(홈은 'home', 칼럼은 칼럼 id).
   검색·AI가 읽는 FAQPage 스키마는 bake.js가 같은 데이터로 넣는다. */
function colFaqList(cid){
  const all = (typeof MK_FAQ !== 'undefined' ? MK_FAQ : []);
  return all.filter(f => f.published !== false && f.page === cid)
            .sort((a,b) => (a.sort||0) - (b.sort||0));
}
function colFaq(cid){
  const list = colFaqList(cid);
  if(!list.length) return '';        // 등록된 게 없으면 섹션 자체를 만들지 않는다
  return `<section class="col-faq"><h2 data-i18n="sec_faq"></h2><div class="faq-list">${list.map(f=>`
      <details class="faq-item"><summary>${esc(L(f.q))}</summary><div class="a">${esc(L(f.a))}</div></details>`).join('')}</div></section>`;
}

function pageInit(){
  const id = window.MK_CID || new URLSearchParams(location.search).get('id');
  if(!MK_COLUMNS.length) return;       // 데이터가 없으면 정적 내용을 그대로 둔다

  /* ★구운 페이지는 다시 그리지 않는다 (2026-08-28).
     굽기가 고쳐 둔 것 — 목차 앵커, 안 닫힌 도입 상자, 본문 내부 링크, 이미지 width/height,
     짧게 다듬은 <title> — 을 이 렌더러가 DB 원본으로 통째로 되돌리고 있었다.
     결과적으로 정적 HTML(=AI 크롤러가 보는 것)과 실제 화면이 서로 다른 페이지였다.
     다시 그리는 경우는 둘뿐이다: 동적 ?id= 뷰어로 들어왔거나, 보는 언어가 구운 언어와 다를 때. */
  const root = document.getElementById('col-root');
  const bakedLang = (document.documentElement.getAttribute('lang') || 'vi').toLowerCase();
  if(window.MK_CID && root && root.querySelector('.blog-body') && bakedLang === MK_LANG) return;

  const idx = Math.max(0, MK_COLUMNS.findIndex(x=>x.id===id));
  const c = MK_COLUMNS[idx];
  const prev = MK_COLUMNS[idx-1], next = MK_COLUMNS[idx+1];
  document.title = L(c.title) + ' | MAKENOV';

  document.getElementById('col-root').innerHTML = `
    <nav class="blog-breadcrumb"><a href="index.html" data-i18n="col_home"></a> -
      <a href="columns.html" data-i18n="nav_columns"></a> -
      <span>${esc(L(c.title))}</span></nav><span class="blog-single-cat">${esc(L(c.cat))}</span><h1>${esc(L(c.title))}</h1><div class="blog-single-meta"><span>${esc(c.date)}</span><i></i><span>${readTime(L(c.body))}</span></div><div class="blog-cover"><img src="${c.img}" alt="${esc(L(c.title))}" fetchpriority="high" decoding="async"></div><div class="blog-body">${colScopeBody(L(c.body), !!L(c.cat))}</div><div class="blog-nav">
      ${prev ? `<a href="${mkDocUrl('column',prev.id)}"><div class="dir" data-i18n="col_prev"></div><b>${esc(L(prev.title))}</b></a>` : '<span></span>'}
      ${next ? `<a class="next" href="${mkDocUrl('column',next.id)}"><div class="dir" data-i18n="col_next"></div><b>${esc(L(next.title))}</b></a>` : '<span></span>'}
    </div>${colFaq(c.id)}<div class="blog-cta"><h3 data-i18n="promo_title"></h3><p data-i18n="promo_desc"></p><button class="btn btn-primary btn-lg" onclick="openAuth('signup')" data-i18n="promo_btn"></button></div>`;

  /* 다른 칼럼 */
  const others = MK_COLUMNS.filter(x=>x.id!==c.id).slice(0,2);
  const old = document.getElementById('col-others');
  if(old) old.remove();
  if(others.length){
    const el = document.createElement('section');
    el.className = 'blog-main';
    el.id = 'col-others';
    el.style.marginTop = '56px';
    el.innerHTML = `<div class="sec-head"><h2 data-i18n="col_related"></h2><a class="more" href="columns.html" data-i18n="view_more"></a></div><div class="blog-list">${others.map(o=>`
        <div class="blog-item"><a class="blog-item-link" href="${mkDocUrl('column',o.id)}"><div class="blog-item-thumb"><img src="${o.img}" alt="${esc(L(o.title))}" loading="lazy" decoding="async"></div><div class="blog-item-info"><div class="blog-item-cat">${esc(L(o.cat))}</div><h3 class="blog-item-tit">${esc(L(o.title))}</h3><div class="blog-item-meta"><span>${esc(o.date)}</span><i></i><span>${readTime(L(o.body))}</span></div></div></a></div>`).join('')}</div>`;
    document.querySelector('main').appendChild(el);
    applyI18n(el);
  }
}

/* 스크롤 진행바 */
window.addEventListener('scroll', ()=>{
  const el = document.getElementById('progress-bar');
  if(!el) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  el.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
}, {passive:true});
