#!/usr/bin/env node
/* ============================================================
   purge-landing-css.js — 랜딩(rinda 클론) CSS 정리
   ------------------------------------------------------------
   about-assets/scoped.full.css(원본, 534KB·규칙 6,300개)는 rinda 사이트 전체의
   Tailwind 를 .rnd 접두로 감싼 것이라, 랜딩 두 장이 실제로 쓰는 규칙은 6%뿐이다.
   스타일 재계산 비용이 커서(Lighthouse 'Style & Layout' 1.5초) 쓰는 규칙만 남긴다.

     입력: public/about-assets/scoped.full.css + public/index.html, public/ko/index.html
     출력: public/about-assets/scoped.css (≈40KB)

   규칙 유지 기준: 클래스가 없는 셀렉터(.rnd 요소 리셋 등)는 전부, 클래스가 있으면
   두 HTML 의 class 토큰에 모두 들어 있을 때만. @keyframes·@font-face 유지.
   ⚠ 랜딩 HTML 을 고친 뒤에는 다시 돌려야 새 클래스의 스타일이 살아난다.
   실행: npm i -D postcss (처음 한 번) → node purge-landing-css.js
   검증(했던 방법): 원본/정리본으로 랜딩 4장(vi·ko × 데스크톱·모바일) 전체 스크린샷 픽셀 비교 → 차이 0.01% 이하
   ============================================================ */
const postcss = require('postcss'); const fs = require('fs'); const path = require('path');
const PUB = path.join(__dirname, 'public');
const html = ['index.html', 'ko/index.html', 'en/index.html'].map(f => fs.readFileSync(path.join(PUB, f), 'utf8')).join('\n')
  .replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"');
const used = new Set((html.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []));
for (const m of html.matchAll(/class="([^"]*)"/g)) m[1].split(/\s+/).forEach(c => c && used.add(c));
const css = fs.readFileSync(path.join(PUB, 'about-assets/scoped.full.css'), 'utf8');
const root = postcss.parse(css);
let kept = 0, dropped = 0;
function classesOf(sel){
  const out = []; const re = /\.((?:\\.|[A-Za-z0-9_-])+)/g; let m;
  while ((m = re.exec(sel))) out.push(m[1].replace(/\\(.)/g, '$1'));
  return out;
}
const SAFE = [/^rnd$/, /^group$/, /^ico$/, /^x$/, /^mk/, /^rnd-/, /radix/];
root.walkRules(rule => {
  if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
  const sels = rule.selectors.filter(sel => {
    const cls = classesOf(sel);
    if (!cls.length) return true;
    return cls.every(c => used.has(c) || SAFE.some(r => r.test(c)));
  });
  if (!sels.length) { rule.remove(); dropped++; return; }
  if (sels.length !== rule.selectors.length) rule.selectors = sels;
  kept++;
});
root.walkAtRules(at => { if (/^(media|supports|layer)$/.test(at.name) && at.nodes && at.nodes.length === 0) at.remove(); });
const out = root.toString();
fs.writeFileSync(path.join(PUB, 'about-assets/scoped.css'), out);
console.log('kept', kept, 'dropped', dropped, 'size', css.length, '->', out.length);
