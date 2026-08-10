/* ============================================================
   MAKENOV 카피 오버라이드
   ------------------------------------------------------------
   사이트 문구를 코드 수정 없이 관리자에서 고치기 위한 층.

   원본은 그대로 두고(i18n.js · about-copy.js · data.js), 바꾼 것만
   settings 테이블의 key='copy' 한 줄에 모아 둔다. 부팅할 때 그 값을
   원본 객체에 덮어쓰므로 t() 나 L() 은 손댈 필요가 없다.

   경로 규칙
     ui.nav_directory          공통 UI (i18n.js 의 키)
     about.hero.h1             바이어 랜딩 (about-copy.js 의 AB)
     maker.hero.h1             공급사 랜딩 (data.js 의 MK_MAKER)
     site.topbar               상단 배너 (MK_SETTINGS)

   값은 항상 {vi, ko, en}. 원본에 없는 언어는 건드리지 않는다.
   ============================================================ */

const MK_COPY_LANGS = ['vi', 'ko', 'en'];

/* 편집 대상. 페이지마다 로드되는 파일이 달라서 없으면 건너뛴다
   (about-copy.js 는 about.html 과 관리자에서만 읽는다) */
function mkCopySources(){
  return [
    { id:'ui',    label:'공통 UI',        hint:'메뉴·버튼·라벨·안내문. 모든 페이지에 쓰인다',
      kind:'i18n', root:(typeof I18N !== 'undefined') ? I18N : null },
    { id:'about', label:'서비스 소개(바이어)', hint:'about.html 본문',
      kind:'tree', root:(typeof AB !== 'undefined') ? AB : null },
    /* maker.html 은 한국 공급사 대상이라 문구가 한국어 평문이다 */
    { id:'makerbody', label:'공급사 안내 본문', hint:'maker.html 전체 — 히어로·비교표·절차·FAQ·신청 폼',
      kind:'tree', strLeaf:true, root:(typeof MKC !== 'undefined') ? MKC : null },
    { id:'maker', label:'공급사 안내 수치',  hint:'통계 4칸·주요 시장·연락처',
      kind:'tree', strLeaf:true, root:(typeof MK_MAKER !== 'undefined') ? MK_MAKER : null },
    { id:'hero',  label:'홈 히어로',       hint:'홈 최상단 슬라이드 문구',
      kind:'tree', root:(typeof MK_HERO !== 'undefined') ? MK_HERO : null },
    { id:'site',  label:'상단 배너',       hint:'전 페이지 최상단 띠',
      kind:'tree', root:(typeof MK_SETTINGS !== 'undefined') ? MK_SETTINGS : null },
  ].filter(s => s.root);
}

/* {vi,ko,en} 만 담긴 객체가 잎이다 */
function mkCopyIsLeaf(v){
  if(!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const ks = Object.keys(v);
  return ks.length > 0
    && ks.every(k => MK_COPY_LANGS.includes(k))
    && ks.some(k => typeof v[k] === 'string');
}

/* strLeaf = 한국어 평문 하나가 잎인 경우(MK_MAKER). {ko:'…'} 로 감싸 같은 규격으로 다룬다 */
function mkCopyWalk(node, prefix, out, strLeaf){
  if(strLeaf && typeof node === 'string'){ out.push({ path:prefix, val:{ ko:node }, str:true }); return; }
  if(mkCopyIsLeaf(node)){ out.push({ path:prefix, val:node }); return; }
  /* 최상위가 배열이면 prefix 가 비어 있다. 그대로 이으면 'hero..1.sub' 처럼 점이 겹친다 */
  if(Array.isArray(node)){ node.forEach((v,i)=>mkCopyWalk(v, prefix ? prefix+'.'+i : String(i), out, strLeaf)); return; }
  if(node && typeof node === 'object'){
    Object.keys(node).forEach(k=>mkCopyWalk(node[k], prefix ? prefix+'.'+k : k, out, strLeaf));
  }
}

/* 화면 어디에도 안 나오는 값. 목록에 두면 고쳐도 안 바뀌어 헷갈리므로 뺀다.
   hero 의 kicker 는 예전 디자인의 잔재다. 지금 슬라이드는 title 과 sub 만 그린다. */
const MK_COPY_HIDE = /^hero\.\d+\.kicker$/;

/* 편집 가능한 문구 전체 목록 [{src, path, label, val}] */
function mkCopyFields(){
  const out = [];
  mkCopySources().forEach(s => {
    if(s.kind === 'i18n'){
      const base = s.root.vi || {};
      Object.keys(base).forEach(k=>{
        const val = {};
        MK_COPY_LANGS.forEach(l=>{ if(s.root[l] && typeof s.root[l][k] === 'string') val[l] = s.root[l][k]; });
        if(Object.keys(val).length) out.push({ src:s.id, path:s.id+'.'+k, label:k, val });
      });
      return;
    }
    const found = [];
    mkCopyWalk(s.root, '', found, s.strLeaf);
    found.forEach(f => out.push({ src:s.id, path:s.id+'.'+f.path, label:f.path, val:f.val, str:f.str }));
  });
  return out.filter(f => !MK_COPY_HIDE.test(f.path));
}

/* 경로 하나에 값 쓰기 */
function mkCopyApplyOne(path, val){
  const parts = String(path).split('.');
  const src = parts.shift();
  const s = mkCopySources().find(x => x.id === src);
  if(!s || !parts.length) return false;

  if(s.kind === 'i18n'){
    const key = parts.join('.');
    MK_COPY_LANGS.forEach(l=>{
      if(val[l] != null && s.root[l]) s.root[l][key] = val[l];
    });
    return true;
  }
  let node = s.root;
  for(let i = 0; i < parts.length - 1; i++){
    node = node ? node[parts[i]] : null;
    if(!node) return false;
  }
  const last = parts[parts.length - 1];
  if(!node) return false;
  if(s.strLeaf && typeof node[last] === 'string'){
    if(val.ko != null) node[last] = val.ko;
    return true;
  }
  if(!node[last] || typeof node[last] !== 'object') return false;
  MK_COPY_LANGS.forEach(l=>{ if(val[l] != null) node[last][l] = val[l]; });
  return true;
}

/* 저장된 오버라이드를 원본 객체에 덮어쓴다. 부팅 때 한 번 */
function mkApplyCopy(map){
  if(!map) return 0;
  let n = 0;
  Object.keys(map).forEach(p=>{ if(mkCopyApplyOne(p, map[p])) n++; });
  return n;
}

/* 부팅 순서 문제 방지 — 설정이 늦게 와도 다시 적용할 수 있게 보관해 둔다 */
window.MK_COPY_OVERRIDE = window.MK_COPY_OVERRIDE || {};

/* ------------------------------------------------------------
   구역 이름
   ------------------------------------------------------------
   nav_directory 같은 키만 늘어놓으면 어디 문구인지 알 수가 없다.
   키 앞머리(또는 최상위 섹션)를 사람이 읽는 이름으로 바꿔 묶어 준다.
   ------------------------------------------------------------ */
const MK_COPY_GROUPS = {
  ui: {
    nav:'헤더 메뉴', util:'헤더 아이콘', search:'헤더 검색', ft:'푸터',
    hero:'홈 히어로', sec:'홈 섹션 제목', rail:'홈 카테고리', spot:'홈 실시간',
    dir:'제품 목록', cat:'카테고리 이름', sort:'정렬',
    col:'칼럼', co:'공급사', sp:'고객센터', nt:'공지사항', gd:'이용 가이드',
    ab:'서비스 소개', auth:'로그인 · 회원가입', my:'마이페이지',
    inq:'문의 폼', easy:'간편 문의', err:'오류 메시지',
    promo:'CTA 배너', cta:'CTA 버튼',
    locked:'가격 잠금', price:'가격 잠금', moq:'가격 잠금', lead:'가격 잠금',
    supply:'가격 잠금', negotiable:'가격 잠금',
    pd:'제품 상세', detail:'제품 상세', brand:'제품 상세', views:'제품 상세',
    catalog:'카탈로그', kr:'한국 소개', mk:'공통', webinar:'웨비나(미사용)',
    login:'로그인 · 회원가입', signup:'로그인 · 회원가입', logout:'로그인 · 회원가입',
    mypage:'마이페이지', wish:'마이페이지', inquiries:'마이페이지',
  },
  /* 랜딩은 최상위 섹션이 곧 구역이다 */
  about: {
    hero:'1 히어로', problem:'2 문제 제기', vs:'3 비교', lock:'4 가격 잠금',
    steps:'5 이용 절차', bens:'6 받는 것', verify:'7 인증', faq:'8 FAQ', last:'9 마무리',
  },
  makerbody: {
    hero:'1 히어로', problem:'2 문제 제기', compare:'3 비교표', promise:'4 약속 · 시장',
    how:'5 등록 절차', benefit:'6 받는 것', verify:'7 인증', fit:'8 적합 여부',
    faq:'9 FAQ', apply:'10 신청 폼', last:'11 마무리',
  },
  maker: { stats:'통계 4칸', markets:'주요 시장', contactEmail:'연락처', contactTel:'연락처' },
  hero:  { 0:'슬라이드 1', 1:'슬라이드 2', 2:'슬라이드 3', 3:'슬라이드 4', 4:'슬라이드 5' },
  site:  { topbar:'상단 배너' },
};

/* 경로에서 구역 이름을 뽑는다 */
function mkCopyGroup(field){
  const rest = field.path.slice(field.src.length + 1);
  const head = field.src === 'ui' ? rest.split('_')[0] : rest.split('.')[0];
  const map = MK_COPY_GROUPS[field.src] || {};
  return map[head] || '기타';
}

/* ============================================================
   한국어 → 베트남어 · 영어 자동번역
   ------------------------------------------------------------
   관리자 카피 탭과 화면 편집기가 같이 쓴다. 그래서 copy.js 에 둔다.
   (예전엔 admin.js 안에만 있어서 사이트 쪽에서는 못 썼다)

   ⚠ 기계번역이다. 채워 넣은 뒤 사람이 한 번 봐야 한다.
     특히 베트남어는 바이어가 첫 화면에서 보는 말이다.
   ============================================================ */

/* 키가 필요 없는 무료 엔드포인트. 실패하면 다른 곳으로 한 번 더 시도한다 */
async function mkTranslate(text, from, to){
  const src = String(text || '').trim();
  if(!src) return '';
  try{
    const u = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=` + encodeURIComponent(src);
    const r = await fetch(u);
    if(r.ok){ const j = await r.json(); const out = (j[0]||[]).map(s=>s[0]).join(''); if(out) return out; }
  }catch(e){}
  try{
    const u = `https://api.mymemory.translated.net/get?q=` + encodeURIComponent(src) + `&langpair=${from}|${to}`;
    const r = await fetch(u); const j = await r.json();
    if(j && j.responseData && j.responseData.translatedText) return j.responseData.translatedText;
  }catch(e){}
  return '';
}

/* 줄바꿈을 지킨다.
   히어로 제목처럼 \n 이 곧 <br> 인 문구가 있어서, 통째로 넘기면 줄이 뭉개진다.
   줄 단위로 옮기고 다시 \n 으로 잇는다. */
async function mkTranslateLines(ko, to){
  const lines = String(ko == null ? '' : ko).split('\n');
  const out = [];
  for(const l of lines) out.push(l.trim() ? await mkTranslate(l, 'ko', to) : '');
  return out.join('\n');
}

/* 한국어 하나로 두 언어를 만든다. 한쪽이라도 실패하면 그 칸은 빈 문자열이다 */
async function mkTranslateKo(ko){
  const vi = await mkTranslateLines(ko, 'vi');
  const en = await mkTranslateLines(ko, 'en');
  return { vi, en };
}
