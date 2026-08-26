#!/usr/bin/env node
/* ============================================================
   bump-asset-version.js — 바뀐 자산의 ?v= 캐시버스터 올리기
   ------------------------------------------------------------
   JS·CSS 는 ?v=날짜 쿼리로 캐시를 깬다. 파일을 고치고 v 를 안 올리면
   브라우저 휴리스틱 캐시가 옛 파일을 몇 시간씩 들고 있는다
   (2026-08-26 관리자 공급사 탭이 캐시 때문에 안 보이던 것으로 확인).

   실행: node bump-asset-version.js app,admin,store-supabase,style 20260826a
   → public 아래 모든 html 의 해당 자산 ?v= 를 전부 교체 (build-sites 로 sites 전파)
   ============================================================ */
const fs = require('fs'), path = require('path');
const PUB = path.join(__dirname, 'public');
const names = (process.argv[2] || '').split(',').map(s => s.trim()).filter(Boolean);
const ver = process.argv[3];
if(!names.length || !ver){ console.error('사용법: node bump-asset-version.js <이름,이름…> <버전>  예) app,style 20260826a'); process.exit(1); }

const files = [];
(function walk(d){
  for(const e of fs.readdirSync(d, { withFileTypes: true })){
    const p = path.join(d, e.name);
    if(e.isDirectory()){ if(e.name !== 'uploads' && e.name !== 'storage') walk(p); }
    else if(e.name.endsWith('.html')) files.push(p);
  }
})(PUB);

const pat = new RegExp('((?:assets/(?:js|css)/)(?:' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\.(?:js|css))\\?v=[0-9A-Za-z]+', 'g');
let touched = 0, hits = 0;
for(const f of files){
  const src = fs.readFileSync(f, 'utf8');
  const out = src.replace(pat, (m, a) => { hits++; return a + '?v=' + ver; });
  if(out !== src){ fs.writeFileSync(f, out); touched++; }
}
console.log(`HTML ${touched}개 파일에서 ${hits}곳 → ?v=${ver}`);
