#!/usr/bin/env node
/* ============================================================
   bake-seo.js — 관리자 SEO 탭 저장분을 정적 head 에 굽는다
   ------------------------------------------------------------
   관리자 > SEO 탭은 settings 테이블 key='seo' 한 줄에 저장만 하고,
   소비자(구 레포 build.js)가 운영 레포에 없어 실제 HTML 에는 반영되지
   않았다(2026-08-19 점검). 이 도구가 그 소비자다.

   하는 일: REST 에서 settings.seo 를 읽어
     { pages: { 'index.html': { ko:{title,desc}, vi:{...}, en:{...} }, ... } }
   각 페이지의 언어판 파일에서 <title> 과 <meta name="description"> 만 교체.
   (og:title/og:description/twitter 도 같은 문구로 맞춘다. 값이 비어 있으면 그 칸은 건드리지 않는다)

   실행: node bake-seo.js  → 바뀐 파일 확인 후 커밋·푸시
        (서브도메인 운영 중이면 node build-sites.js 도 함께)
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const read = f => fs.readFileSync(path.join(PUB, f), 'utf8');
const esc = s => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const langFile = (rel, lang) => lang === 'vi' ? rel : `${lang === 'ko' ? 'ko' : 'en'}/${rel}`;

(async () => {
  const conf = read('assets/js/config.js');
  const url = (conf.match(/MK_SUPABASE_URL\s*=\s*'([^']*)'/) || [])[1];
  const anon = (conf.match(/MK_SUPABASE_ANON\s*=\s*'([^']*)'/) || [])[1];
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/settings?key=eq.seo&select=value',
    { headers: { apikey: anon, Authorization: 'Bearer ' + anon } });
  if (!r.ok) throw new Error('settings.seo → HTTP ' + r.status);
  const rows = await r.json();
  let seo = rows[0] && rows[0].value;
  if (typeof seo === 'string') { try { seo = JSON.parse(seo); } catch (e) { seo = null; } }
  const pages = (seo && seo.pages) || {};
  if (!Object.keys(pages).length) { console.log('settings.seo 에 저장된 페이지 문구가 없다 — 할 일 없음'); return; }

  let touched = 0;
  for (const [file, byLang] of Object.entries(pages)) {
    for (const [lang, v] of Object.entries(byLang || {})) {
      if (!v || (!v.title && !v.desc)) continue;
      const rel = (lang === 'vi' || file === 'maker.html') ? file : langFile(file, lang);
      const fp = path.join(PUB, rel);
      if (!fs.existsSync(fp)) { console.log('  ⚠ 파일 없음:', rel); continue; }
      let s = fs.readFileSync(fp, 'utf8'), before = s;
      if (v.title) {
        s = s.replace(/<title>[^<]*<\/title>/, '<title>' + esc(v.title) + '</title>');
        s = s.replace(/(<meta property="og:title" content=")[^"]*(")/, '$1' + esc(v.title) + '$2');
        s = s.replace(/(<meta name="twitter:title" content=")[^"]*(")/, '$1' + esc(v.title) + '$2');
      }
      if (v.desc) {
        s = s.replace(/(<meta name="description" content=")[^"]*(")/, '$1' + esc(v.desc) + '$2');
        s = s.replace(/(<meta property="og:description" content=")[^"]*(")/, '$1' + esc(v.desc) + '$2');
        s = s.replace(/(<meta name="twitter:description" content=")[^"]*(")/, '$1' + esc(v.desc) + '$2');
      }
      if (s !== before) { fs.writeFileSync(fp, s); touched++; console.log('  구움:', rel); }
    }
  }
  console.log('완료 —', touched, '개 파일. 커밋·푸시해야 반영된다.');
})().catch(e => { console.error(e); process.exit(1); });
