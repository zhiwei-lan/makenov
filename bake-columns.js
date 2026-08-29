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
/* ── 언어 판별 ────────────────────────────────────────────────────────────
   T() 는 값이 없으면 다른 언어로 폴백한다. 화면에서는 빈 페이지보다 낫지만,
   굽기에서는 그 폴백이 "번역된 페이지"로 둔갑해 hreflang·사이트맵까지 올라간다.
   2026-08-28 진단: c1~c4 본문이 베트남어인데 관리자에서 ko 칸에 저장돼 있어
   vn·kr·en 세 호스트가 같은 베트남어를 내보내고 hreflang 클러스터가 무효였다.
   그래서 키를 믿지 않고 실제 글자로 언어를 본다.
   ───────────────────────────────────────────────────────────────────────── */
const RE_HANGUL = /[가-힣]/;
const RE_VIET = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const stripHtml = s => String(s ?? '')
  .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')   /* 태그 안 내용까지. 닫는 태그 쪽 정규식에 제어문자가 섞여 실제로는 하나도 안 지워지고 있었다
     — 요약이 CSS 로 새고, 2분짜리 글의 읽는 시간이 54분으로 나왔다 (2026-08-28 수리) */
  .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
/** 글자로 언어를 알아본다 (한글 → ko, 베트남어 성조 부호 → vi, 나머지 → en) */
function detectLang(html){
  const s = stripHtml(html).slice(0, 4000);
  if(!s) return null;
  if(RE_HANGUL.test(s)) return 'ko';
  if(RE_VIET.test(s)) return 'vi';
  return 'en';
}
/** 이 칼럼이 해당 언어로 "진짜" 번역돼 있는가 — 값이 있고, 그 값의 언어가 실제로 맞는가 */
function hasLang(c, lang){
  const t = (c.title && typeof c.title === 'object') ? String(c.title[lang] || '').trim() : '';
  const b = (c.body  && typeof c.body  === 'object') ? String(c.body[lang]  || '').trim() : '';
  if(!t || !b) return false;
  return detectLang(t + ' ' + b) === lang;
}
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

/* ── 본문 살균 ────────────────────────────────────────────────────────────
   원고를 "완결 HTML 문서" 째로 붙여넣으면 <head> 가 통째로 본문에 딸려 들어온다.
   2026-08-28 c1·c3 사고: title·canonical·JSON-LD 가 각각 2벌, body 쪽 canonical 은
   존재하지 않는 URL(404), 본문 첫 요소가 <style> 이라 meta description 이 CSS 로 구워짐.
   여기서는 "굽기가 어차피 다시 만드는 것"만 걷어낸다. 지운 항목은 마지막에 로그로 뿌린다.
   ───────────────────────────────────────────────────────────────────────── */
const CLEANED = new Map();   /* 칼럼 id → Set(지운 항목) — 언어 3벌 중복 로그 방지 */
const note = (cid, msg) => { if(!cid) return; if(!CLEANED.has(cid)) CLEANED.set(cid, new Set()); CLEANED.get(cid).add(msg); };

/* 여는 태그를 찾아 같은 태그의 중첩을 세며 닫는 태그까지의 범위를 돌려준다 */
function findEl(html, openRe){
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
const hasEl    = (html, re) => !!findEl(html, re);
const dropEl   = (html, re) => { const e = findEl(html, re); return e ? html.slice(0, e.start) + html.slice(e.end) : html; };
const unwrapEl = (html, re) => { const e = findEl(html, re); return e ? html.slice(0, e.start) + html.slice(e.innerStart, e.innerEnd) + html.slice(e.end) : html; };
/* 굽기가 이미 만드는 본문 요소들 (한 번 쓰고 버리는 정규식 — lastIndex 오염 방지) */
const RE = {
  h1:      () => /<(h1)(?=[\s>])[^>]*>/i,
  wrap:    () => /<(div|article|section|main)[^>]*class="[^"]*\bwrap\b[^"]*"[^>]*>/i,
  crumb:   () => /<(nav|div|p)[^>]*class="[^"]*\bbreadcrumb\b[^"]*"[^>]*>/i,
  eyebrow: () => /<(span|div|p)[^>]*class="[^"]*\beyebrow\b[^"]*"[^>]*>/i,
  byline:  () => /<(p|div|span)[^>]*class="[^"]*\bbyline\b[^"]*"[^>]*>/i,
};

function sanitizeBody(html, cid, opt){
  opt = opt || {};
  let s = String(html || '');
  /* 지우기 전에 원고가 써 둔 설명문을 건져 둔다 — excerpt 가 비었을 때 요약 후보로 쓴다 */
  const m = s.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const desc = m ? m[1] : '';

  const cut = (re, msg) => { const b = s; s = s.replace(re, ''); if(s !== b) note(cid, msg); };
  cut(/<!DOCTYPE[^>]*>/gi,                                'DOCTYPE');
  cut(/<\/?(?:html|head|body)(?=[\s>])[^>]*>/gi,          'html/head/body 태그');
  cut(/<title[^>]*>[\s\S]*?<\/title>/gi,                  '<title>');
  cut(/<meta(?=[\s/>])[^>]*>/gi,                          '<meta> (description·og·twitter·charset·viewport)');
  cut(/<base(?=[\s/>])[^>]*>/gi,                          '<base>');
  cut(/<link(?=[\s/>])[^>]*>/gi,                          '<link> (canonical·hreflang)');
  cut(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, 'JSON-LD (Article·Breadcrumb·FAQPage)');

  if(hasEl(s, RE.crumb()))   { s = dropEl(s, RE.crumb());   note(cid, '브레드크럼'); }
  /* 카테고리 칩은 DB cat 이 채워졌을 때만 중복이다. 비어 있으면 원고 칩이 유일한 라벨이라 남긴다. */
  if(hasEl(s, RE.eyebrow())){
    if(opt.hasCat){ s = dropEl(s, RE.eyebrow()); note(cid, '카테고리 칩(eyebrow)'); }
    else note(cid, '⚠ eyebrow 남겨 둠 — 관리자 카테고리가 비어 있다');
  }
  if(hasEl(s, RE.byline()))  { s = dropEl(s, RE.byline());  note(cid, 'byline(작성자·수정일·읽는시간)'); }
  while(hasEl(s, RE.h1()))   { s = dropEl(s, RE.h1());      note(cid, '<h1> (제목은 굽기가 출력)'); }
  if(hasEl(s, RE.wrap()))    { s = unwrapEl(s, RE.wrap());  note(cid, '.wrap 이중 래퍼'); }

  return { html: s.replace(/^\s+/, ''), desc };
}
/* ── 본문 수리 ────────────────────────────────────────────────────────────
   살균이 "굽기가 다시 만드는 것"을 걷어낸다면, 여기서는 원고가 깨진 채로 들어온 것을
   고친다. 원고(DB)를 고치는 게 정석이지만, 고쳐지기 전까지 구운 페이지가 망가지지
   않도록 굽기 쪽에도 안전망을 둔다. 고친 항목은 살균과 같이 로그로 뿌린다.
   ───────────────────────────────────────────────────────────────────────── */

/** 속성 자리에 낀 쓰레기 제거 — 에디터가 남긴 `"=""` 같은 것 (2026-08-28 c2 img) */
function dropStrayAttrs(html, cid){
  const s = String(html || '').replace(/\s+"\s*=\s*""(?=[\s/>])/g, '');
  if(s !== html) note(cid, '태그 속성에 낀 쓰레기(`"=""`)');
  return s;
}

/* 도입부·콜아웃 상자가 닫히지 않아 그 뒤 본문을 통째로 삼키는 사고 방지.
   2026-08-28 c2: <div class="intro-notes"> 가 안 닫혀 목차·h2·표·FAQ 전부가
   도입 상자 안에 들어가 있었다(자식 52개). 상자 안에서 제목·목차·표가 나오면
   그 앞에서 닫아 준다. */
const BOX_CLASSES = ['intro-notes', 'lead', 'sum', 'box', 'cite', 'disclaimer'];
const RE_SWALLOWED = /<(?:h2|h3|nav|section|table)(?=[\s>])/i;
function closeStrayBoxes(html, cid){
  let s = String(html || '');
  for(const cls of BOX_CLASSES){
    let from = 0;
    for(let guard = 0; guard < 30; guard++){
      const re = new RegExp('<(div|p|section|aside)(?=[\\s>])[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*>', 'i');
      const head = s.slice(from);
      const el = findEl(head, re);
      if(!el) break;
      const inner = head.slice(el.innerStart, el.innerEnd);
      const m = inner.match(RE_SWALLOWED);
      if(m && m.index > 0){
        const closeTag = head.slice(el.innerEnd, el.end);          // </div> 등
        s = s.slice(0, from)
          + head.slice(0, el.innerStart)
          + inner.slice(0, m.index) + closeTag                      // 닫는 태그를 앞으로 당긴다
          + inner.slice(m.index)
          + head.slice(el.end);                                     // 원래 자리의 닫는 태그는 빠진다
        note(cid, `.${cls} 미닫힘 — 제목·목차를 삼키기 전에서 닫았다`);
        from += el.innerStart + m.index + closeTag.length;
        continue;
      }
      from += el.end;
    }
  }
  return s;
}

/* 목차·FAQ 바로가기 복구. 문서에 <base href="../"> 가 있으면 순수 프래그먼트(#h1)는
   현재 문서가 아니라 base 기준으로 풀려 홈으로 튄다(2026-08-28 c2: 목차 7개 전부).
   굽기가 파일명을 아니까 여기서 절대화한다 — 같은 문서면 브라우저는 그대로 앵커 이동. */
function fixFragments(html, rel, cid){
  const s = String(html || '').replace(/href="#([^"]+)"/g, (m, f) => `href="${rel}#${f}"`);
  if(s !== html) note(cid, '본문 앵커 링크(#) 를 파일명 포함 주소로 — <base> 때문에 홈으로 튀던 것');
  return s;
}

/* ── 이미지 크기 ──────────────────────────────────────────────────────────
   width/height 가 없으면 브라우저가 자리를 못 잡아 이미지가 뜰 때마다 글이 밀린다(CLS).
   원본은 makenov.com 에 있으니 굽기 때 앞부분만 받아 크기를 읽고 data/image-sizes.json
   에 적어 둔다 — 한 번 읽은 이미지는 다시 받지 않는다.
   ───────────────────────────────────────────────────────────────────────── */
const SIZE_FILE = path.join(__dirname, 'data', 'image-sizes.json');
let IMG_SIZE = {};
try { IMG_SIZE = JSON.parse(fs.readFileSync(SIZE_FILE, 'utf8')); } catch (e) {}
let SIZE_DIRTY = false;

/** 앞부분 바이트에서 JPEG·PNG·WebP·GIF 의 가로세로를 읽는다. 못 읽으면 null */
function parseSize(buf){
  const b = Buffer.from(buf);
  if(b.length < 24) return null;
  if(b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG')
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if(b.toString('latin1', 0, 3) === 'GIF')
    return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if(b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP'){
    const fmt = b.toString('latin1', 12, 16);
    if(fmt === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if(fmt === 'VP8L'){ const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
    if(fmt === 'VP8X') return { w: (b[24] | b[25] << 8 | b[26] << 16) + 1, h: (b[27] | b[28] << 8 | b[29] << 16) + 1 };
    return null;
  }
  if(b[0] === 0xFF && b[1] === 0xD8){                       // JPEG — SOF 마커까지 훑는다
    let i = 2;
    while(i + 9 < b.length){
      if(b[i] !== 0xFF){ i++; continue; }
      const m = b[i + 1];
      if(m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)){ i += 2; continue; }
      if(m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC)
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
async function probeSizes(urls){
  for(const u of urls){
    if(!u || IMG_SIZE[u] !== undefined) continue;
    try {
      const r = await fetch(u, { headers: { Range: 'bytes=0-131071' } });
      if(!r.ok && r.status !== 206){ IMG_SIZE[u] = null; SIZE_DIRTY = true; continue; }
      IMG_SIZE[u] = parseSize(await r.arrayBuffer());
    } catch (e) { IMG_SIZE[u] = null; }
    SIZE_DIRTY = true;
  }
  if(SIZE_DIRTY){
    fs.mkdirSync(path.dirname(SIZE_FILE), { recursive: true });
    fs.writeFileSync(SIZE_FILE, JSON.stringify(IMG_SIZE, null, 2) + '\n');
  }
}
const dimAttr = url => { const s = IMG_SIZE[url]; return (s && s.w && s.h) ? ` width="${s.w}" height="${s.h}"` : ''; };

/** 본문 이미지에 크기·지연 로딩·비동기 디코딩 보강 (표지는 굽기가 따로 낸다) */
function tuneImages(html){
  return String(html || '').replace(/<img\s[^>]*>/gi, tag => {
    let t = tag;
    if(!/\sloading\s*=/i.test(t)) t = t.replace(/<img/i, '<img loading="lazy"');
    if(!/\sdecoding\s*=/i.test(t)) t = t.replace(/<img/i, '<img decoding="async"');
    if(!/\swidth\s*=/i.test(t) && !/\sheight\s*=/i.test(t)){
      const src = (t.match(/\ssrc\s*=\s*"([^"]*)"/i) || [])[1];
      const d = dimAttr(src);
      if(d) t = t.replace(/<img/i, '<img' + d);
    }
    return t;
  });
}
/** 본문에 쓰인 이미지 주소 모으기 — 크기 미리 읽어 두려고 */
const imgUrls = html => [...String(html || '').matchAll(/<img\s[^>]*src\s*=\s*"([^"]+)"/gi)].map(m => m[1]);

/* ── 본문 내부 링크 ───────────────────────────────────────────────────────
   2026-08-28 진단: c2 는 3,161 단어인데 본문 안 자사 링크가 0개였다. FAQ 다섯 개 중
   셋은 이미 있는 형제 글의 주제 그대로인데도 링크가 없어 토픽 클러스터가 안 섰다.
   data/column-links.json 의 표현을 본문 <p> 안 첫 등장 한 번만 링크로 바꾼다.
   - 자기 자신·이미 <a> 가 있는 문단은 건너뛴다 (제목·요약·FAQ 질문은 <p> 가 아니라 자연히 제외)
   - 긴 표현부터 잡는다 ("독점 판매권" 이 "독점" 보다 먼저)
   - 한 글에 최대 MAX_LINKS 개
   ───────────────────────────────────────────────────────────────────────── */
const MAX_LINKS = 8;
let LINK_MAP = {};
try { LINK_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'column-links.json'), 'utf8')); } catch (e) {}
const rxEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function autoLink(html, { lang, selfHref, fileOf, cid }){
  const targets = [];
  for(const [id, byLang] of Object.entries(LINK_MAP)){
    if(id.startsWith('_')) continue;
    const href = fileOf(id);
    if(!href || href === selfHref) continue;               // 자기 자신으로는 링크하지 않는다
    for(const p of (byLang && byLang[lang]) || []) targets.push({ id, href, phrase: p });
  }
  targets.sort((a, b) => b.phrase.length - a.phrase.length);

  const used = new Set();
  let added = 0;
  const out = String(html || '').replace(/<p(?![\w-])[^>]*>[\s\S]*?<\/p>/gi, block => {
    if(added >= MAX_LINKS || /<a[\s>]/i.test(block)) return block;
    for(const t of targets){
      if(used.has(t.id) || added >= MAX_LINKS) continue;
      const re = new RegExp('(^|[^\\w\\u00C0-\\u1EF9])(' + rxEsc(t.phrase) + ')(?![\\w\\u00C0-\\u1EF9])', 'i');
      if(!re.test(block)) continue;
      let done = false;
      block = block.replace(re, (m, pre, hit) => {
        if(done) return m;
        done = true;
        return `${pre}<a href="${t.href}">${hit}</a>`;
      });
      if(done){ used.add(t.id); added++; }
    }
    return block;
  });
  if(added) note(cid, `본문 내부 링크(${lang}) ${added}개 → ${[...used].join(', ')}`);
  return out;
}

/* 살균 → 수리 → CSS 스코핑 순서. 요약 후보(desc)도 같이 돌려준다. */
const prepBody = (html, cid, opt) => {
  opt = opt || {};
  const r = sanitizeBody(html, cid, opt);
  let s = dropStrayAttrs(r.html, cid);
  s = closeStrayBoxes(s, cid);
  if(opt.rel) s = fixFragments(s, opt.rel, cid);
  s = tuneImages(s);
  if(opt.lang && opt.fileOf) s = autoLink(s, { lang: opt.lang, selfHref: opt.rel, fileOf: opt.fileOf, cid });
  return { html: scopeBody(s), desc: r.desc };
};
const clip = (s, n) => { s = String(s ?? '').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
const absUrl = u => /^https?:\/\//.test(u || '') ? u : SITE + '/' + String(u || '').replace(/^\.?\//, '');
const read = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(PUB, f)), { recursive: true }); fs.writeFileSync(path.join(PUB, f), s); };
const today = new Date().toISOString().slice(0, 10);
const langFile = (rel, lang) => lang === 'vi' ? rel : `${lang}/${rel}`;   // 파일이 놓이는 위치 (public/ 안)
const pageUrl = (rel, lang) => `${HOST[lang]}/${rel}`;                     // 페이지의 공개 URL (언어 호스트, 접두 없음)
const baseTag = rel => { const d = (rel.match(/\//g) || []).length; return d ? `<base href="${'../'.repeat(d)}">` : ''; };
/* hreflang 은 "그 언어로 정말 번역된" 판만 넣는다. 번역 안 된 판까지 넣으면
   구글이 클러스터 전체를 무시한다(2026-08-28 진단). x-default 는 남은 것 중 vi 우선. */
const altTags = (relVi, langs) => {
  const ok = (langs && langs.length) ? langs : ['vi'];
  const def = ok.includes('vi') ? 'vi' : ok[0];
  return [...ok.map(l => `<link rel="alternate" hreflang="${l}" href="${pageUrl(relVi, l)}">`),
    `<link rel="alternate" hreflang="x-default" href="${pageUrl(relVi, def)}">`].join('\n');
};
const OG_LOCALE = { vi: 'vi_VN', ko: 'ko_KR', en: 'en_US' };
/* 제목이 길면 SERP 에서 잘린다(권장 60자 안팎). 자르는 건 <title> 뿐 —
   h1·og:title·JSON-LD headline 은 원래 제목을 그대로 쓴다.
   순서: seo_title → 전체 제목 → 첫 물음/문장 + 브랜드 → 첫 물음/문장 단독 → 단어 경계로 자르기 */
const TLEN = 60;
const len = s => [...String(s)].length;
const cutWords = (s, n) => {
  if(len(s) <= n) return s;
  const a = [...String(s)].slice(0, n).join('');
  const sp = a.lastIndexOf(' ');
  return (sp > n * 0.6 ? a.slice(0, sp) : a).replace(/[\s,;:·-]+$/, '');
};
function headTitleOf(title, seoTitle){
  if(seoTitle && typeof seoTitle === 'string' && seoTitle.trim()) return `${seoTitle.trim()} | MAKENOV`;
  const full = String(title).trim();
  if(len(full) + 10 <= TLEN) return `${full} | MAKENOV`;
  const m = full.match(/^[\s\S]*?[?？!。.]/);               // 첫 물음표·마침표까지
  const short = (m ? m[0] : full).trim();
  if(len(short) + 10 <= TLEN) return `${short} | MAKENOV`;
  if(len(short) <= TLEN) return short;                      // 브랜드를 붙이면 넘친다 — 제목만
  /* 한 문장이 통째로 긴 제목은 절 경계(쉼표·콜론)에서 끊는다. 단어 단위로 자르면
     "…cần ghi rõ những" 처럼 말이 끊긴 채 SERP 에 걸린다 (2026-08-28 c5). */
  const clause = [...short.matchAll(/[,，:：]/g)].map(x => short.slice(0, x.index).trim())
    .filter(x => len(x) >= 8 && len(x) <= TLEN).pop();
  if(clause) return len(clause) + 10 <= TLEN ? `${clause} | MAKENOV` : clause;
  return cutWords(short, TLEN);
}
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

/* ── 정적 푸터(크롤러용) ──────────────────────────────────────────────────
   헤더·푸터는 app.js 의 renderChrome() 이 JS 로 그린다. 구글은 렌더링하지만
   GPTBot·ClaudeBot·PerplexityBot 은 대부분 JS 를 돌리지 않아, 원본 HTML 에는
   사이트 링크도 회사 설명도 하나 없었다(2026-08-28 GEO 진단).
   그래서 같은 내용을 정적으로 미리 찍어 둔다. 부팅하면 renderChrome 이
   innerHTML 로 덮어쓰므로 사용자 화면·동작은 그대로다.
   문구는 i18n.js 에서 그대로 읽어 온다 — 두 벌 관리하지 않기 위해. */
const I18N = (() => {
  try {
    const src = read('assets/js/i18n.js');
    const at = src.indexOf('const I18N');
    const open = src.indexOf('{', at);
    let depth = 0, i = open;
    for(; i < src.length; i++){
      if(src[i] === '{') depth++;
      else if(src[i] === '}' && !--depth){ i++; break; }
    }
    return new Function('return ' + src.slice(open, i))();
  } catch (e) { console.log('⚠ i18n.js 를 못 읽어 정적 푸터 문구가 빈다:', e.message); return {}; }
})();
const t = (lang, key) => String(((I18N[lang] || I18N.vi || {})[key]) || '');

/* 읽는 시간 — app.js readTime() 과 같은 계산 */
const readTimeOf = (html, lang) => Math.max(1, Math.round(stripHtml(html).length / 450)) + t(lang, 'read_min');

/* 가입 유도 블록 — 예전에는 page-column.js 가 런타임에 붙였다. 구운 페이지를 다시
   그리지 않게 바꾸면서(2026-08-28) 굽기 쪽으로 옮겼다. 문구는 i18n.js 에서 읽는다. */
function staticColCta(lang){
  if(!t(lang, 'promo_title')) return '';
  return `\n  <div class="blog-cta"><h3>${esc(t(lang, 'promo_title'))}</h3><p>${esc(t(lang, 'promo_desc'))}</p>` +
    `<button class="btn btn-primary btn-lg" onclick="openAuth('signup')">${esc(t(lang, 'promo_btn'))}</button></div>`;
}

function staticFooter(lang){
  const a = (href, key) => `<a href="${href}">${esc(t(lang, key))}</a>`;
  return `
  <div class="wrap"><div class="brand"><div class="logo"><span>MAKE<b>NOV</b></span></div><p class="desc">${esc(t(lang, 'ft_desc'))}</p><a class="mail" href="mailto:notice@makenov.com">notice@makenov.com</a></div>` +
  `<div><h4>${esc(t(lang, 'ft_platform'))}</h4>${a('products.html', 'nav_directory')}${a('companies.html', 'nav_companies')}${a('columns.html', 'nav_columns')}</div>` +
  `<div><h4>${esc(t(lang, 'ft_partner'))}</h4>${a('mypage.html', 'ft_join')}${a('mypage.html', 'ft_verify')}${a('maker.html', 'util_maker')}</div>` +
  `<div><h4>${esc(t(lang, 'ft_support'))}</h4>${a('support.html', 'nav_support')}${a('guide.html', 'nav_guide')}${a('support.html#ask', 'ft_contact')}${a('sitemap.html', 'ft_sitemap')}</div></div>` +
  `<div class="base"><span>© 2026 MAKENOV. All rights reserved.</span></div>`;
}

function seoBlock({ title, ogTitle, desc, canonical, ogImage, jsonld, alt, altLangs, lang, date, modified }){
  const social = ogTitle || title;
  const L = [`<title>${esc(title)}</title>`];
  if(desc) L.push(`<meta name="description" content="${esc(desc)}">`);
  /* 이미지 미리보기 제한 해제 — 없으면 구글이 썸네일을 작게만 쓴다 */
  L.push(`<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`);
  L.push(`<link rel="canonical" href="${canonical}">`, altTags(alt, altLangs));
  L.push(`<meta property="og:type" content="article">`, `<meta property="og:site_name" content="MAKENOV">`, `<meta property="og:title" content="${esc(social)}">`);
  if(desc) L.push(`<meta property="og:description" content="${esc(desc)}">`);
  L.push(`<meta property="og:url" content="${canonical}">`, `<meta property="og:image" content="${absUrl(ogImage || '/assets/img/og.png')}">`);
  if(OG_LOCALE[lang]) L.push(`<meta property="og:locale" content="${OG_LOCALE[lang]}">`);
  if(date) L.push(`<meta property="article:published_time" content="${date}">`);
  if(modified) L.push(`<meta property="article:modified_time" content="${modified}">`);
  L.push(`<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(social)}">`);
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
  return `\n<section class="blog-main" id="col-others" style="margin-top:56px">\n  <div class="sec-head"><h2>${esc(L.others)}</h2><a class="more" href="columns.html">${esc(L.more)}</a></div>\n  <div class="blog-list">\n    ${others.map(o => `<div class="blog-item"><a class="blog-item-link" href="columns/${colFile(o)}.html"><div class="blog-item-thumb"><img src="${esc(o.img)}" alt="${esc(T(o.title, lang))}"${dimAttr(o.img)} loading="lazy" decoding="async"></div><div class="blog-item-info"><div class="blog-item-cat">${esc(T(o.cat, lang))}</div><h3 class="blog-item-tit">${esc(T(o.title, lang))}</h3><div class="blog-item-meta"><span>${esc(o.date)}</span></div></div></a></div>`).join('\n    ')}\n  </div>\n</section>`;
}
function columnPage(c, colFaqs, prev, next, others, lang, ctx){
  const L = LB[lang];
  const title = T(c.title, lang), cat = T(c.cat, lang);
  const relVi = `columns/${colFile(c)}.html`;
  /* 번역이 없는 언어판은 원문 언어의 주소를 canonical 로 가리켜 중복을 한쪽으로 모은다.
     hreflang·사이트맵에서도 빠진다(main 루프). 페이지 자체는 남겨 둔다 —
     kr/en 의 칼럼 목록이 이미 링크하고 있어서 지우면 404 가 된다. */
  const ok = ctx.langsOk, src = ctx.srcLang;
  const translated = ok.includes(lang);
  const canonical = pageUrl(relVi, translated ? lang : src);
  const docLang = translated ? lang : src;
  const useSeo = lang === 'ko' && typeof c.seoDesc === 'string';
  const body = prepBody(T(c.body, lang), c.id, {
    hasCat: !!cat, rel: relVi, lang: docLang, fileOf: ctx.fileOf,
  });
  /* 요약 우선순위: seo_desc → excerpt → 원고가 써 둔 meta description → 본문 앞부분 */
  const desc = clip((useSeo && c.seoDesc) || T(c.excerpt, lang) || body.desc || stripHtml(body.html), 155);
  const artId = canonical + '#article';
  const article = { '@context':'https://schema.org', '@type':'Article', '@id':artId, headline:title,
      description:desc, image:absUrl(c.img),
      datePublished:c.date, dateModified:c.modified || c.date, inLanguage:docLang, mainEntityOfPage:canonical,
      author:{ '@type':'Organization', name:'MAKENOV', url:HOST.vi + '/' },
      publisher:{ '@type':'Organization', name:'MAKENOV', url:HOST.vi + '/', logo:{ '@type':'ImageObject', url:SITE + '/assets/img/logo.png' } },
      isAccessibleForFree:true };
  const alt = LANGS.map(l => T(c.title, l)).find(x => x && x !== title);
  if(alt) article.alternativeHeadline = alt;
  if(cat) article.articleSection = cat;   /* 빈 문자열을 넣으면 카테고리가 비어 있다고 선언하는 꼴이 된다 */
  const jsonld = [article,
    { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'MAKENOV', item:HOST.vi + '/' },
      { '@type':'ListItem', position:2, name:L.post, item:pageUrl('columns.html', docLang) },
      { '@type':'ListItem', position:3, name:title, item:canonical } ] }];
  if(colFaqs.length) jsonld.push({ '@context':'https://schema.org', '@type':'FAQPage',
    '@id': canonical + '#faq', isPartOf: { '@id': artId },   /* Article 과 끊긴 별개 노드로 두지 않는다 */
    mainEntity: colFaqs.map(q => ({ '@type':'Question', name:T(q.q, lang), acceptedAnswer:{ '@type':'Answer', text:T(q.a, lang) } })) });
  const headTitle = headTitleOf(title, useSeo ? c.seoTitle : '');
  return `<!DOCTYPE html>
<html lang="${docLang}">
<head>
<meta charset="UTF-8">
${baseTag(langFile(relVi, lang))}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${seoBlock({ title: headTitle, ogTitle: `${title} | MAKENOV`, desc, canonical, ogImage: c.img, jsonld, alt: relVi, altLangs: ok, lang: docLang, date: c.date, modified: c.modified || c.date })}
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
  <div class="blog-single-meta"><span>${esc(c.date)}</span><i></i><span>${esc(readTimeOf(T(c.body, lang), docLang))}</span></div>
  <div class="blog-cover"><img src="${esc(c.img)}" alt="${esc(title)}"${dimAttr(c.img)} fetchpriority="high" decoding="async"></div>
  <div class="blog-body">${body.html}</div>
${colFaqs.fromBody ? '' : staticColFaq(colFaqs, lang)}${staticColNav(prev, next, lang)}${staticColCta(docLang)}
</article>
${staticColOthers(others, lang)}
</main>
<footer class="mk-footer" id="mk-footer">${staticFooter(docLang)}</footer>
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
    date:String(c.date || '').slice(0, 10), modified:String(c.updated_at || '').slice(0, 10),
    slug:c.slug || '', seoTitle:c.seo_title || '', seoDesc:c.seo_desc || '' }));
  /* 칼럼 FAQ 출처 3단: ① DB faqs(page=칼럼 id) ② data/column-faqs.json(이관 때 유실된 초기 2편 복구본)
     ③ 본문 안 FAQ 절 — 제목 <h2>(id·수식어가 붙어도 된다) 뒤부터 다음 <h2> 앞까지에서
        <details><summary>질문</summary>답</details> 또는 <p><b>질문</b><br>답</p> 묶음을 읽는다.
        (2026-08-28: c1~c4 가 <h2 id="faq"> + <details> 형식이라 옛 규칙에 안 걸려 FAQPage 가 통째로 빠져 있었다) */
  let localFaqs = []; try { localFaqs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'column-faqs.json'), 'utf8')); } catch (e) {}
  const FAQ_SEC = /<h2[^>]*>[^<]*(?:FAQ|자주 묻는 질문|Câu hỏi thường gặp|Frequently asked)[^<]*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/i;
  const bodyFaqs = c => {
    const out = [];
    LANGS.forEach(l => {
      const m = T(c.body, l).match(FAQ_SEC);
      if(!m) return;
      /* 묶음 정규식은 /g 라 한 번 쓰고 버린다 (lastIndex 오염 방지) */
      let pairs = [...m[1].matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)];
      if(!pairs.length) pairs = [...m[1].matchAll(/<p><b>(.*?)<\/b><br\s*\/?>(.*?)<\/p>/g)];
      pairs.forEach((x, i) => {
        const q = stripHtml(x[1]), a = stripHtml(x[2]);
        if(!q || !a) return;
        out[i] = out[i] || { q:{}, a:{} }; out[i].q[l] = q; out[i].a[l] = a;
      });
    });
    return out.filter(Boolean);
  };
  const faqsFor = (page, c) => {
    const db = (fq || []).filter(f => (f.page || 'home') === page);
    if(db.length) return db.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const loc = localFaqs.filter(f => f.page === page);
    if(loc.length) return loc.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    return c ? bodyFaqs(c) : [];
  };
  console.log(`칼럼 ${columns.length}편 (REST ${url})`);

  /* 언어별 번역 여부를 먼저 확정한다 — hreflang·canonical·사이트맵이 전부 여기에 달렸다.
     값이 있는지가 아니라 "그 언어로 쓰여 있는지"를 본다(hasLang). */
  const LANG_OK = new Map();
  const untranslated = [];
  columns.forEach(c => {
    let ok = LANGS.filter(l => hasLang(c, l));
    if(!ok.length){                                   // 언어 칸이 통째로 어긋난 원고 — 글자로 판별해 한 판만 살린다
      const d = detectLang(T(c.title, 'vi') + ' ' + T(c.body, 'vi'));
      ok = d ? [d] : ['vi'];
    }
    LANG_OK.set(c.id, ok);
    const miss = LANGS.filter(l => !ok.includes(l));
    if(miss.length) untranslated.push(`  ${colFile(c)}: ${ok.join('/')} 만 번역됨 → ${miss.join('/')} 판은 ${ok[0]} 로 canonical, hreflang·사이트맵 제외`);
  });
  if(untranslated.length){
    console.log('번역 없는 언어판 — 원고(관리자)에 해당 언어 본문을 채우면 자동으로 풀린다:');
    untranslated.forEach(s => console.log(s));
  }

  /* 이미지 크기 미리 읽기 (표지 + 본문) — width/height 를 박아 CLS 를 없앤다 */
  const allImgs = new Set();
  columns.forEach(c => {
    if(c.img) allImgs.add(c.img);
    LANGS.forEach(l => imgUrls(T(c.body, l)).forEach(u => allImgs.add(u)));
  });
  const before = Object.keys(IMG_SIZE).length;
  await probeSizes([...allImgs]);
  console.log(`이미지 크기: ${Object.keys(IMG_SIZE).length}건 확보 (새로 읽은 것 ${Object.keys(IMG_SIZE).length - before}건)`);

  /* 링크 맵의 키는 id 로도 slug 로도 쓸 수 있게 — 초기 칼럼은 id(c-moq)와 파일명(moq-negotiation)이 다르다 */
  const byKey = {};
  columns.forEach(c => { byKey[c.id] = c; if(c.slug) byKey[c.slug] = c; const f = colFile(c); if(f) byKey[f] = c; });
  const fileOf = key => byKey[key] ? `columns/${colFile(byKey[key])}.html` : '';

  let n = 0;
  columns.forEach((c, i) => {
    const others = columns.filter(x => x.id !== c.id).slice(0, 2);
    const cf = faqsFor(c.id, c);
    cf.fromBody = !((fq || []).some(f => (f.page || 'home') === c.id) || localFaqs.some(f => f.page === c.id));
    const ctx = { langsOk: LANG_OK.get(c.id), srcLang: LANG_OK.get(c.id)[0], fileOf };
    LANGS.forEach(l => { write(langFile(`columns/${colFile(c)}.html`, l), columnPage(c, cf, columns[i - 1], columns[i + 1], others, l, ctx)); n++; });
  });
  console.log(`columns/*.html ${n}개 생성`);
  if(CLEANED.size){
    console.log('본문 살균 — 원고에 들어오면 안 되는 요소를 걷어냈다 (원고 쪽도 고쳐 두면 좋다):');
    CLEANED.forEach((set, id) => console.log(`  ${id}: ${[...set].join(', ')}`));
  }

  /* baked.js — columns 맵만 교체 */
  const bj = read('assets/js/baked.js');
  const map = Object.fromEntries(columns.map(c => [c.id, colFile(c)]));
  const bj2 = bj.replace(/("columns":\s*)\{[^}]*\}/, `$1${JSON.stringify(map, null, 4).replace(/\n/g, '\n  ')}`);
  if(!/"columns":\s*\{/.test(bj)) console.log('⚠ baked.js columns 블록을 못 찾음'); else { write('assets/js/baked.js', bj2); console.log('baked.js columns 갱신:', Object.keys(map).length); }

  /* sitemaps/{vn,kr,en}.xml — 호스트별로 칼럼 <url> 전부 교체, 칼럼 목록 lastmod 갱신
     (구 public/sitemap.xml 은 서브도메인 전환 때 없어졌다 — Seo.php 가 호스트별 파일을 서빙,
      build-sites.js 가 각 사이트 루트에 sitemap.xml 로 복사) */
  const SMFILE = { vi: 'vn', ko: 'kr', en: 'en' };
  const entry = (relVi, lang, lastmod, ok) => {
    const def = ok.includes('vi') ? 'vi' : ok[0];
    return `  <url>\n    <loc>${pageUrl(relVi, lang)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${ok.map(l => `      <xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(relVi, l)}"/>`).join('\n')}\n      <xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl(relVi, def)}"/>\n  </url>`;
  };
  LANGS.forEach(lang => {
    const file = `sitemaps/${SMFILE[lang]}.xml`;
    let sm = read(file);
    sm = sm.replace(/\s*<url>\s*<loc>https:\/\/(?:vn|kr|en)\.makenov\.com\/columns\/[^<]+<\/loc>[\s\S]*?<\/url>/g, '');
    /* 번역 안 된 언어판은 사이트맵에 올리지 않는다 — 그 판은 원문으로 canonical 이 걸려 있다 */
    const mine = columns.filter(c => LANG_OK.get(c.id).includes(lang));
    const add = mine.map(c => entry(`columns/${colFile(c)}.html`, lang, c.modified || c.date || today, LANG_OK.get(c.id))).join('\n');
    sm = sm.replace(/<\/urlset>\s*$/, (add ? add + '\n' : '') + '</urlset>\n');
    sm = sm.replace(/(<loc>https:\/\/(?:vn|kr|en)\.makenov\.com\/columns\.html<\/loc>\s*<lastmod>)[^<]+/, `$1${today}`);
    write(file, sm);
    console.log(`sitemaps/${SMFILE[lang]}.xml — 칼럼 ${mine.length}건 (전체 ${columns.length})`);
  });

  /* llms.txt — 칼럼 목록을 실제 글 단위로 유지한다. 예전에는 목록 페이지 한 줄뿐이라
     AI 크롤러가 어떤 글이 있는지 몰랐다(2026-08-28 GEO 진단). 제목은 원문 언어 그대로. */
  try {
    const lines = columns.map(c => {
      const ok = LANG_OK.get(c.id), src = ok[0];
      const langs = ok.length > 1 ? ` (${ok.join(', ')})` : ` (${src})`;
      return `- ${T(c.title, src)}${langs}: ${pageUrl(`columns/${colFile(c)}.html`, src)}`;
    });
    const block = `Articles\nGuides for distributors sourcing from Korea — importing, contracts, MOQ, exclusivity, samples, quotations.\n${lines.join('\n')}`;
    /* '## Articles' 절만 통째로 갈아 끼운다. 정규식으로 잘라내면 빈 줄에서 멈춰
       옛 목록이 남고 구울 때마다 쌓인다(2026-08-28) — 그래서 절 단위로 나눠 다시 조립한다. */
    const lt = read('llms.txt');
    const parts = lt.split(/^## /m);
    const head = parts[0].replace(/\s*$/, '\n\n');
    const secs = parts.slice(1).map(x => x.replace(/\s*$/, '')).filter(x => !/^Articles\b/.test(x));
    const at = secs.findIndex(x => /^Frequently asked\b/.test(x));
    secs.splice(at < 0 ? secs.length : at, 0, block);
    write('llms.txt', head + secs.map(x => '## ' + x + '\n\n').join('').replace(/\n+$/, '\n'));
    console.log(`llms.txt — 칼럼 ${columns.length}건 목록 갱신`);
  } catch (e) { console.log('⚠ llms.txt 갱신 실패:', e.message); }
})().catch(e => { console.error(e); process.exit(1); });
