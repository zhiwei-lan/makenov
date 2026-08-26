#!/usr/bin/env node
/* ============================================================
   bake-copy.js — 관리자 카피 수정분 굽기 (MK_COPY_BAKED 갱신)
   ------------------------------------------------------------
   배경: 관리자 카피탭 수정분은 settings(key='copy') 한 줄에 쌓이고,
   app.js 는 부팅 때 baked.js 의 MK_COPY_BAKED 를 먼저 그린 뒤 DB 응답으로
   다시 덮는다. 구운 값이 낡으면 새로고침마다 "옛 문구 → 새 문구" 깜빡임이
   보인다(2026-08-26 문의 — DB 96키 vs 구움 67키, 히어로 문구 19개 불일치).

   하는 일: settings 의 copy 맵을 그대로 받아 public/assets/js/baked.js 의
   window.MK_COPY_BAKED 블록(파일 마지막 블록)을 통째로 교체한다.

   실행: node bake-copy.js && node build-sites.js   → 커밋·푸시
   (카피를 고친 뒤에는 prerender.js 도 다시 돌려야 사전렌더 사본의 문구도 맞는다)
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const FILE = path.join(PUB, 'assets', 'js', 'baked.js');

(async () => {
  const conf = fs.readFileSync(path.join(PUB, 'assets', 'js', 'config.js'), 'utf8');
  const url = (conf.match(/MK_SUPABASE_URL\s*=\s*'([^']*)'/) || [])[1];
  const anon = (conf.match(/MK_SUPABASE_ANON\s*=\s*'([^']*)'/) || [])[1];
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/settings?key=eq.copy',
    { headers: { apikey: anon, Authorization: 'Bearer ' + anon } });
  if(!r.ok) throw new Error('settings copy → HTTP ' + r.status);
  const rows = await r.json();
  const map = (rows[0] && rows[0].value) || {};
  if(!Object.keys(map).length) throw new Error('DB copy 맵이 비어 있음 — 실수로 비우지 않게 중단');

  let src = fs.readFileSync(FILE, 'utf8');
  const i = src.indexOf('window.MK_COPY_BAKED');
  if(i < 0) throw new Error('baked.js 에서 MK_COPY_BAKED 블록을 못 찾음');
  /* MK_COPY_BAKED 는 baked.js 의 마지막 블록 — 거기서부터 끝까지 교체한다 */
  src = src.slice(0, i) + `window.MK_COPY_BAKED = ${JSON.stringify(map, null, 2)};\n`;
  fs.writeFileSync(FILE, src);
  console.log('MK_COPY_BAKED 갱신:', Object.keys(map).length, '키 (REST', url + ')');
})().catch(e => { console.error(e); process.exit(1); });
