#!/usr/bin/env node
/* ============================================================
   bake-landing.js — 관리자 카피탭의 랜딩(landing.*) 수정분을
   랜딩 정적 HTML 과 landing-copy.js(LND 기본값)에 직접 굽는다
   ------------------------------------------------------------
   랜딩 본문은 정적 HTML 이라, 관리자에서 고친 landing.* 카피는
   JS 가 뜬 뒤에야 덮인다 → 새로고침마다 "옛 문구 → 새 문구" 깜빡임
   (2026-08-26 문의: đổi mới → tiên phong). 정적 원문 자체를 DB 값으로
   맞추면 첫 페인트부터 최종 문구라 깜빡일 게 없다.

   하는 일
     1) settings(key='copy') 에서 landing.* 만 추림
     2) index.html(vi) · ko/index.html · en/index.html 의
        data-mkl="landing.…" 요소 본문을 해당 언어 값으로 교체
        (개행은 <br> — _br 원문 규칙과 동일)
     3) landing-copy.js 의 LND 기본값에도 병합 → 기본값=DB 라
        런타임 오버라이드가 다시 그려도 화면 변화 없음(멱등)

   실행: node bake-landing.js && node prerender.js && node build-sites.js
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const FILES = { vi: 'index.html', ko: 'ko/index.html', en: 'en/index.html' };

(async () => {
  const conf = fs.readFileSync(path.join(PUB, 'assets', 'js', 'config.js'), 'utf8');
  const url = (conf.match(/MK_SUPABASE_URL\s*=\s*'([^']*)'/) || [])[1];
  const anon = (conf.match(/MK_SUPABASE_ANON\s*=\s*'([^']*)'/) || [])[1];
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/settings?key=eq.copy',
    { headers: { apikey: anon, Authorization: 'Bearer ' + anon } });
  if(!r.ok) throw new Error('settings copy → HTTP ' + r.status);
  const rows = await r.json();
  const all = (rows[0] && rows[0].value) || {};
  const map = {};
  Object.keys(all).forEach(k => { if(k.startsWith('landing.')) map[k] = all[k]; });
  console.log('landing.* 카피', Object.keys(map).length, '건');
  if(!Object.keys(map).length){ console.log('구울 것이 없습니다'); return; }

  /* 1) 랜딩 HTML 세 벌의 data-mkl 요소 본문 교체 */
  Object.entries(FILES).forEach(([lang, rel]) => {
    const file = path.join(PUB, rel);
    if(!fs.existsSync(file)) return;
    let src = fs.readFileSync(file, 'utf8'), n = 0;
    Object.entries(map).forEach(([key, v]) => {
      const val = (v && typeof v === 'object') ? (v[lang] || v.vi || v.ko || v.en || '') : String(v ?? '');
      if(!val) return;
      const html = esc(val).replace(/\n/g, '<br>');
      const rx = new RegExp('(<([a-z0-9]+)\\b[^>]*data-mkl="' + key.replace(/\./g, '\\.') + '"[^>]*>)[\\s\\S]*?(</\\2>)', 'g');
      src = src.replace(rx, (m, open, tag, close) => { n++; return open + html + close; });
    });
    fs.writeFileSync(file, src);
    console.log(rel + ':', n, '곳 교체');
  });

  /* 2) landing-copy.js 의 LND 기본값 병합 (기본값=DB → 멱등) */
  const lcFile = path.join(PUB, 'assets', 'js', 'landing-copy.js');
  let lc = fs.readFileSync(lcFile, 'utf8');
  const m = lc.match(/const LND = (\{[\s\S]*?\n\});/);
  if(!m){ console.log('⚠ landing-copy.js 에서 LND 를 못 찾음 — HTML 만 구웠습니다'); return; }
  const LND = Function('return ' + m[1])();
  let merged = 0;
  Object.entries(map).forEach(([key, v]) => {
    const p = key.split('.');           // landing.a.b
    if(p.length !== 3 || !v || typeof v !== 'object') return;
    LND[p[1]] = LND[p[1]] || {};
    const node = LND[p[1]][p[2]] = LND[p[1]][p[2]] || {};
    ['vi','ko','en'].forEach(l => { if(v[l]) node[l] = v[l]; });
    /* 값에 개행이 있으면 <br> 로 그려야 한다 — 원문 _br 규칙 유지·승격 */
    if(['vi','ko','en'].some(l => /\n/.test(node[l] || ''))) node._br = 1;
    merged++;
  });
  lc = lc.replace(m[0], 'const LND = ' + JSON.stringify(LND, null, 1) + ';');
  fs.writeFileSync(lcFile, lc);
  console.log('landing-copy.js LND 병합:', merged, '건');
})().catch(e => { console.error(e); process.exit(1); });
