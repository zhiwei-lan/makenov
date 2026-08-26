/* ============================================================
   MAKENOV 관리자 로직
   ============================================================ */
function esc(s){ return String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function av(id){ const el=document.getElementById(id); return el ? el.value.trim() : ''; }
function ac(id){ const el=document.getElementById(id); return el ? el.checked : false; }
/* ---------- 리치텍스트 에디터(Quill) 레지스트리 ----------
   RTE[id] 에 Quill 인스턴스가 있으면 그 HTML을, 없으면 일반 input/textarea 값을 읽고 쓴다.
   덕분에 tri()·autoTranslate() 가 에디터든 텍스트박스든 똑같이 동작한다. */
const RTE = {};
const RTESRC = {};   // id → true면 'HTML 소스' 모드 (Quill 대신 textarea를 읽고 쓴다)
const RTEHEAD = {};  // id → 에디터 전환 때 떼어둔 디자인 머리(<style>·웹폰트 <link>) — Quill 이 못 담아서 따로 보관
/* 본문에서 디자인 머리(<style> 전부 + 웹폰트 <link>)를 떼어낸다 — Quill 은 이 태그들을 버리므로
   에디터로 넘기기 전에 분리해 두고, 읽을 때(rteGet)·소스로 돌아올 때 다시 붙인다. */
function splitDesignHead(html){
  let s = String(html || ''), head = [];
  s = s.replace(/<link[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/gi, m => { head.push(m); return ''; });
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, m => { head.push(m); return ''; });
  return { head: head.join('\n'), rest: s.trim() };
}
function rteGet(id){
  if(RTESRC[id]){ const ta = document.getElementById('src-'+id); if(ta) return ta.value.trim(); }
  const q = RTE[id];
  if(q){
    const html = q.root.innerHTML;
    if(!html.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,'').trim()) return '';
    return RTEHEAD[id] ? RTEHEAD[id] + '\n' + html : html;   // 에디터 모드여도 떼어둔 디자인은 저장에 포함
  }
  const el = document.getElementById(id); return el ? el.value.trim() : '';
}
function rteSet(id, html){
  if(RTESRC[id]){ const ta = document.getElementById('src-'+id); if(ta){ ta.value = html || ''; return; } }
  const q = RTE[id];
  if(q){ q.setContents([]); q.clipboard.dangerouslyPasteHTML(html || ''); return; }
  const el = document.getElementById(id); if(el) el.value = html || '';
}

/* 위지윅 ↔ HTML 소스 전환 — 트래비티 관리자처럼 태그를 직접 붙여넣을 수 있게 */
function rteToggleSrc(id, btn){
  const q   = RTE[id];
  const ta  = document.getElementById('src-'+id);
  const box = document.getElementById('rte-'+id);
  if(!ta || !box) return;
  const tb = box.parentElement.querySelector('.ql-toolbar');
  if(!RTESRC[id]){                       // 위지윅 → 소스 (rteGet 이 떼어둔 디자인 머리까지 되붙여 준다)
    ta.value = q ? rteGet(id) : ta.value;
    delete RTEHEAD[id];                  // 머리는 다시 소스 안으로 들어갔다
    RTESRC[id] = true;
    ta.classList.remove('hidden'); box.classList.add('hidden'); if(tb) tb.classList.add('hidden');
    if(btn) btn.textContent = '에디터로';
  } else {                               // 소스 → 위지윅
    const sp = splitDesignHead(ta.value);
    if(sp.head && !confirm('이 본문에는 디자인(<style> 스타일)이 들어 있습니다.\n'
      + '에디터는 class·레이아웃 태그를 지원하지 않아 전환하면 디자인 구조가 단순해질 수 있습니다.\n'
      + '(스타일 규칙 자체는 저장할 때 자동으로 보존됩니다)\n\n그래도 에디터로 전환할까요?')) return;
    RTEHEAD[id] = sp.head;               // Quill 이 버리기 전에 떼어 보관
    RTESRC[id] = false;
    if(q){ q.setContents([]); q.clipboard.dangerouslyPasteHTML(sp.rest); }
    ta.classList.add('hidden'); box.classList.remove('hidden'); if(tb) tb.classList.remove('hidden');
    if(btn) btn.textContent = 'HTML 소스';
  }
}

/* 슬러그 생성 — 베트남어 성조 제거, 영문·숫자·하이픈만 (한글은 지워지므로 영문 제목 기준 권장) */
function slugify(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[đĐ]/g,'d').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
}
function tri(base){ return { vi:rteGet(base+'-vi'), ko:rteGet(base+'-ko'), en:rteGet(base+'-en') }; }
/* 다국어 객체·과거 평문·잠김 표식을 한 줄 표시용 텍스트로 */
function triText(v){ if(v==null) return ''; if(typeof v==='string') return v; return v.ko||v.vi||v.en||''; }

/* 에디터 이미지 버튼 → 기존 업로드 파이프라인(Supabase Storage 공개 URL / 로컬 dataUrl) */
async function rteImage(quill){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if(!f) return;
    try{
      toastA('이미지 업로드 중…');
      const r = await MkImg.save(f);
      const src = /^https?:/.test(r.ref) ? r.ref : (r.dataUrl || r.ref);
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'image', src, 'user');
      quill.setSelection(range.index + 1);
      toastA('이미지 삽입 완료');
    }catch(e){ toastA('이미지 업로드 실패: ' + (e.message || e)); }
  };
  inp.click();
}

/* 붙여넣은 문서의 CSS 셀렉터를 칼럼 본문(.blog-body) 안에서만 먹게 좁힌다.
   html·body·:root 는 .blog-body 자신으로, 나머지는 앞에 .blog-body 를 붙인다.
   @media·@supports 는 안쪽을 재귀 처리, @font-face·@keyframes·@import 는 그대로 둔다. */
function scopeCss(css, scope){
  css = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '', i = 0;
  while(i < css.length){
    const open = css.indexOf('{', i);
    if(open < 0){ out += css.slice(i); break; }
    const chunk = css.slice(i, open), cut = chunk.lastIndexOf(';');
    if(cut >= 0) out += chunk.slice(0, cut + 1);          // @import·@charset 등 중괄호 없는 문장
    const sel = chunk.slice(cut + 1).trim();
    let depth = 1, j = open + 1;
    while(j < css.length && depth){ if(css[j] === '{') depth++; else if(css[j] === '}') depth--; j++; }
    if(/^@(media|supports|layer)/i.test(sel)){
      out += sel + '{' + scopeCss(css.slice(open + 1, j - 1), scope) + '}';
    }else if(sel.charAt(0) === '@'){                       // @font-face·@keyframes 등
      out += sel + css.slice(open, j);
    }else{
      const scoped = sel.split(',').map(s => {
        s = s.trim(); if(!s) return '';
        const m = s.match(/^(html|body|:root)(?![\w-])([\s\S]*)$/i);
        if(!m) return scope + ' ' + s;
        const rest = m[2].trim();
        if(!rest) return scope;
        return /^[\s>+~]/.test(m[2]) ? scope + ' ' + rest : scope + rest;   // body .x → 자손, body.x → 자기
      }).filter(Boolean).join(', ');
      out += scoped + css.slice(open, j);
    }
    i = j;
  }
  return out;
}

/* 붙여넣은 HTML 이 완성된 문서(<!DOCTYPE>·<html>·<head> 포함)면 본문만 추출한다.
   문서 전체를 그대로 저장하면 페이지 안에 title·meta·canonical 이 중복돼 SEO 를 오염시키고,
   문서용 <style>·<script> 가 사이트 전체 스타일을 깨뜨린다. 조각(fragment)이면 손대지 않는다.
   ★디자인은 보존한다 — <style> 은 버리지 않고 .blog-body 로 스코핑해 본문 머리에 다시 붙이고,
   웹폰트 <link>(fonts.googleapis 계열)도 살린다. 나머지 title·meta·link·script 만 제거. */
function cleanBodyHtml(html){
  let s = String(html || '');
  if(!/<!DOCTYPE|<html[\s>]|<body[\s>]/i.test(s)) return s;   // 일반 조각은 원본 유지
  /* head 를 잘라내기 전에 문서 전체에서 디자인 재료(스타일·웹폰트)를 먼저 걷는다 */
  const styles = [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(x => x[1]).join('\n');
  const fontLinks = (s.match(/<link[^>]*>/gi) || []).filter(l => /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(l));
  const m = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if(m) s = m[1];
  s = s
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();
  const scoped = scopeCss(styles, '.blog-body').trim();
  const head = (fontLinks.join('\n') + (scoped ? '\n<style>\n' + scoped + '\n</style>' : '')).trim();
  return head ? head + '\n' + s : s;
}

/* 소스 모드 textarea 의 커서 위치에 텍스트 삽입 */
function insertAtCursor(ta, text){
  const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
  ta.selectionStart = ta.selectionEnd = s + text.length;
  ta.focus();
}

/* 본문 사진 넣기 — 파일을 올리고(스토리지 업로드, 대표 이미지와 같은 파이프라인)
   소스 모드면 <img> 태그를 커서 위치에, 에디터 모드면 Quill 에 삽입한다.
   HTML 소스가 기본이 되면서 Quill 툴바의 이미지 버튼을 못 쓰게 된 것의 대체 입구. */
function bodyInsertImage(id){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.onchange = async () => {
    const files = [...(inp.files || [])]; if(!files.length) return;
    for(const f of files){
      try{
        toastA('이미지 업로드 중… (' + f.name + ')');
        const r = await MkImg.save(f);
        const src = /^https?:/.test(r.ref) ? r.ref : (r.dataUrl || r.ref);
        if(RTESRC[id]){
          const ta = document.getElementById('src-' + id);
          if(ta) insertAtCursor(ta, `\n<img src="${src}" alt="" loading="lazy">\n`);
        }else if(RTE[id]){
          const q = RTE[id], range = q.getSelection(true);
          q.insertEmbed(range.index, 'image', src, 'user');
          q.setSelection(range.index + 1);
        }
        toastA('이미지 삽입 완료 — alt="" 에 사진 설명을 넣어주면 검색에 좋습니다');
      }catch(e){ toastA('이미지 업로드 실패: ' + (e.message || e)); }
    }
  };
  inp.click();
}

/* 칼럼 본문 에디터 초기화 — columnForm 렌더 직후 호출
   게시판식: 언어 구분 없이 한 벌(ko 키), HTML 소스 입력이 기본.
   위지윅이 필요하면 '에디터로' 버튼으로 전환한다.
   (Quill 은 지원하지 않는 태그를 지우므로, 붙여넣은 HTML 보존을 위해 소스 모드가 기본) */
function initColumnEditors(body){
  const html = cleanBodyHtml(body ? (body.ko || body.vi || body.en || '') : '');
  RTESRC['c-body-ko'] = true;
  delete RTEHEAD['c-body-ko'];   // 이전에 열었던 칼럼의 보관분이 넘어오지 않게
  const ta = document.getElementById('src-c-body-ko');
  if(ta) ta.value = html;
  if(typeof Quill === 'undefined') return;
  const el = document.getElementById('rte-c-body-ko');
  if(!el) return;
  const q = new Quill(el, {
    theme: 'snow',
    placeholder: '여기에 본문을 작성하세요…',
    modules: { toolbar: {
      container: [
        [{ header:[2,3,false] }],
        ['bold','italic','underline'],
        [{ list:'ordered' }, { list:'bullet' }],
        ['blockquote','link','image'],
        ['clean'],
      ],
      handlers: { image: function(){ rteImage(this.quill); } },
    } },
  });
  if(html) q.clipboard.dangerouslyPasteHTML(html);
  RTE['c-body-ko'] = q;
  /* 기본이 소스 모드 — 에디터·툴바는 숨겨두고 전환 버튼으로만 연다 */
  el.classList.add('hidden');
  const tb = el.parentElement.querySelector('.ql-toolbar');
  if(tb) tb.classList.add('hidden');
}
function today(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function toastA(msg){
  let el=document.querySelector('.toast');
  if(!el){ el=document.createElement('div'); el.className='toast'; document.body.appendChild(el); }
  el.textContent=msg; el.classList.add('show');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),2400);
}

/* ============================================================
   이미지 업로드 위젯
   값은 hidden input에 담긴다. 업로드하면 'mkimg:<id>', URL을 붙여넣으면 그 URL.
   uploader(id, value, opts) → HTML
   ============================================================ */
function uploader(id, value, opts){
  opts = opts || {};
  const v = value || '';
  /* 상대경로는 /admin/ 기준에서 깨지므로 imgSrc() 로 정규화 (../ 첨부) */
  const src = v ? imgSrc(v) : '';
  return `
  <div class="upl" id="${id}-box" ondragover="uplDrag(event,1)" ondragleave="uplDrag(event,0)" ondrop="uplDrop(event,'${id}')">
    <input type="hidden" id="${id}" value="${esc(v)}">
    <div class="upl-prev" id="${id}-prev">${src?`<img src="${esc(src)}" alt="">`:`<span class="ph">이미지 없음</span>`}</div>
    <div class="upl-side">
      <div class="upl-acts">
        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('${id}-file').click()">파일 선택</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="uplClear('${id}')">비우기</button>
      </div>
      <input type="file" id="${id}-file" accept="image/*" hidden onchange="uplPick(this,'${id}')">
      <p class="upl-hint" id="${id}-info">${opts.hint||'파일을 끌어다 놓아도 됩니다. 자동으로 1600px·JPEG로 압축됩니다.'}</p>
      <details class="upl-url"><summary>URL로 넣기</summary>
        <input class="srch" style="width:100%;margin-top:8px" placeholder="https://..."
          value="${MkImg.isRef(v)?'':esc(v)}" onchange="uplSetUrl('${id}',this.value)"></details>
    </div>
  </div>`;
}
function uplDrag(e, on){ e.preventDefault(); e.currentTarget.classList.toggle('over', !!on); }
function uplDrop(e, id){
  e.preventDefault(); e.currentTarget.classList.remove('over');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(f) uplStore(f, id);
}
function uplPick(input, id){ if(input.files[0]) uplStore(input.files[0], id); input.value=''; }
async function uplStore(file, id){
  const info = document.getElementById(id+'-info');
  if(info) info.textContent = '압축하는 중…';
  try{
    const r = await MkImg.save(file);
    document.getElementById(id).value = r.ref;
    document.getElementById(id+'-prev').innerHTML = `<img src="${r.dataUrl}" alt="">`;
    if(info) info.textContent = `${r.w}×${r.h} · ${fmtBytes(r.bytes)} 로 저장됨`;
    if(typeof uplOnChange === 'function') uplOnChange(id);
  }catch(err){
    if(info) info.textContent = err.message || '업로드에 실패했습니다';
    toastA(err.message || '업로드 실패');
  }
}
function uplClear(id){
  document.getElementById(id).value = '';
  document.getElementById(id+'-prev').innerHTML = `<span class="ph">이미지 없음</span>`;
  const info = document.getElementById(id+'-info');
  if(info) info.textContent = '파일을 끌어다 놓아도 됩니다.';
  if(typeof uplOnChange === 'function') uplOnChange(id);
}
function uplSetUrl(id, url){
  const u = String(url||'').trim();
  document.getElementById(id).value = u;
  document.getElementById(id+'-prev').innerHTML = u ? `<img src="${esc(u)}" alt="">` : `<span class="ph">이미지 없음</span>`;
  if(typeof uplOnChange === 'function') uplOnChange(id);
}

/* ---------- 갤러리 (여러 장) ---------- */
let pGallery = [];
function renderGallery(){
  const el = document.getElementById('gal-list');
  if(!el) return;
  el.innerHTML = pGallery.length ? pGallery.map((g,i)=>`
    <div class="gal-item">
      <img src="${esc(g?imgSrc(g):'')}" alt="">
      <div class="gal-acts">
        <button type="button" onclick="galMove(${i},-1)" ${i===0?'disabled':''}>←</button>
        <button type="button" onclick="galMove(${i},1)" ${i===pGallery.length-1?'disabled':''}>→</button>
        <button type="button" onclick="galDel(${i})">삭제</button>
      </div>
      ${i===0?`<span class="gal-first">대표</span>`:''}
    </div>`).join('') : `<p class="note" style="margin:0">아직 없습니다. 아래에서 여러 장을 한 번에 선택할 수 있습니다.</p>`;
}
function galDel(i){ pGallery.splice(i,1); renderGallery(); }
function galMove(i,d){
  const j=i+d; if(j<0||j>=pGallery.length) return;
  [pGallery[i],pGallery[j]]=[pGallery[j],pGallery[i]]; renderGallery();
}
async function galAdd(input){
  const files = [...input.files]; input.value='';
  const info = document.getElementById('gal-info');
  for(let n=0;n<files.length;n++){
    if(info) info.textContent = `압축하는 중… (${n+1}/${files.length})`;
    try{ const r = await MkImg.save(files[n]); pGallery.push(r.ref); }
    catch(e){ toastA(e.message||'업로드 실패'); }
  }
  if(info) info.textContent = `${pGallery.length}장 등록됨`;
  renderGallery();
}

/* ============================================================
   운영 데이터 캐시
   local 모드는 동기, Supabase 모드는 비동기라서 렌더 전에 한 번 받아 여기 담는다.
   렌더 함수들은 ADM.* 만 읽으므로 두 모드에서 코드가 같다.
   ============================================================ */
const ADM = { inqs:[], buyers:[], leads:[] };
const isSB = () => typeof MkData !== 'undefined';

/* 쓰기 작업 완료를 기다린 뒤 화면을 갱신한다.
   Supabase 모드에서 곧바로 reload 하면 요청이 취소돼 변경이 유실된다. */
async function admDo(promise, reload){
  try{
    await promise;
    if(reload === 0){ await refreshAdm(); renderAll(); }
    else location.reload();
  }catch(e){
    console.error(e);
    toastA('저장에 실패했습니다: ' + (e.message||e));
  }
}

async function refreshAdm(){
  const [i,b,l] = await Promise.all([
    Store.allInquiries(), Store.allBuyers(), Store.allMakerLeads(),
  ]);
  ADM.inqs = i || []; ADM.buyers = b || []; ADM.leads = l || [];
  if(isSB()){
    Admin.primeInq(ADM.inqs); Admin.primeLeads(ADM.leads); Admin.primeTiers(ADM.buyers);
  }
  ADM.inqs.sort((a,b2)=>String(b2.createdAt).localeCompare(String(a.createdAt)));
}

/* ---------- 로그인 ---------- */
async function doAdminLogin(){
  const err = document.getElementById('gate-err');
  const pw  = document.getElementById('gate-pw').value;

  if(isSB()){
    /* Supabase 모드: 일반 로그인 후 admins 테이블에 있는지로 판별 */
    const email = av('gate-email');
    if(!email){ err.textContent='관리자 이메일을 입력하세요'; err.style.display='block'; return; }
    const r = await Store.login(email, pw);
    if(!r.ok){
      /* 실패 원인을 그대로 보여준다 — 뭉뚱그리면 설정 문제(이메일 미확인 등)를 비밀번호 탓으로 오해한다 */
      const MSG = {
        unconfirmed:  '이메일 확인이 안 된 계정입니다. Supabase 대시보드 → Authentication → Users에서 이 계정을 Confirm 하거나, Sign In/Providers에서 "Confirm email"을 끄세요.',
        provider_off: 'Supabase에서 이메일 로그인이 꺼져 있습니다. 대시보드 → Authentication → Providers → Email을 켜세요.',
        rate:         '시도가 너무 잦아 잠시 차단됐습니다. 1~2분 뒤 다시 시도하세요.',
        invalid:      '이메일 또는 비밀번호가 올바르지 않습니다.',
      };
      err.textContent = MSG[r.err] || ('로그인 실패: ' + (r.raw || r.err || '알 수 없는 오류'));
      err.style.display='block'; return;
    }
    if(!MkData.admin){
      await Store.logout();
      err.textContent='이 계정은 관리자로 등록돼 있지 않습니다 (admins 테이블 확인)';
      err.style.display='block'; return;
    }
    boot(); return;
  }

  if(Admin.login(pw)){ boot(); }
  else { err.textContent='비밀번호가 올바르지 않습니다'; err.style.display='block'; }
}
async function boot(){
  document.getElementById('gate').classList.add('hidden');
  const w = document.getElementById('boot-wait');
  if(w) w.classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  /* 관리자는 데이터의 mkimg: 참조를 그대로 두고(내보내기 때문에) 캐시만 채운 뒤 표시할 때 해석한다 */
  try{ await MkImg.loadCache(); }catch(e){}
  try{ await refreshAdm(); }catch(e){ console.error('운영 데이터 로드 실패', e); }
  renderAll();
}
/* 화면 표시용 이미지 주소
   ⚠️ 저장된 경로는 사이트 루트 기준 상대경로(assets/img/...)다.
      공개 페이지는 루트에 있어 그대로 열리지만, 관리자는 /admin/ 한 칸 아래라
      그대로 쓰면 /admin/assets/... 를 찾아 전부 깨진다. 여기서만 ../ 를 붙인다.
      (루트 절대경로 '/assets/...' 로 바꾸는 방법도 있지만, 배포처가
       github.io/makenov/ 처럼 하위 경로면 그쪽이 깨지므로 상대경로를 유지한다.) */
function imgSrc(v){
  if(MkImg.isRef(v)) return MkImg.resolve(v) || '';
  const s = v || '';
  return /^(https?:|data:|blob:|\/)/.test(s) ? s : '../' + s;
}

/* ---------- 사이드바 · 탭 ---------- */
/* ⚠ 탭을 새로 만들면 NAV 와 여기 둘 다에 넣어야 한다.
   여기 빠지면 메뉴는 보이는데 눌러도 화면이 hidden 인 채로 남는다 (SEO 탭에서 실제로 겪음) */
const TABS = ['dash','inq','leads','buyers','products','columns','faq','notices','copy','seo','admins','settings'];
const NAV = [
  { id:'dash',     label:'대시보드', title:'대시보드',      desc:'플랫폼 현황 한눈에 보기' },
  { id:'inq',      label:'문의함',   title:'문의함',        desc:'유통 파트너가 보낸 견적 문의' },
  { id:'leads',    label:'입점문의', title:'입점 문의',      desc:'제품 등록 랜딩(maker.html)으로 들어온 공급사' },
  { id:'buyers',   label:'유통 파트너',   title:'유통 파트너 관리',    desc:'사업자 인증을 통과한 회원' },
  { id:'products', label:'제품',     title:'제품 관리',      desc:'등록·수정 시 사이트에 즉시 반영' },
  { id:'columns',  label:'칼럼',     title:'칼럼 관리',      desc:'인사이트 글 작성 및 발행' },
  { id:'faq',      label:'FAQ',      title:'FAQ 관리',       desc:'고객센터·제품 홈의 FAQ. 랜딩(홈) FAQ 는 카피 탭 > 홈(랜딩)' },
  { id:'notices',  label:'공지사항', title:'공지사항 관리',   desc:'고객센터 공지 게시판 (신제품·업데이트 소식)' },
  { id:'copy',     label:'카피',     title:'카피 수정',      desc:'사이트 문구를 코드 수정 없이 고칩니다' },
  { id:'seo',      label:'SEO',      title:'SEO 설정',       desc:'검색결과 제목·설명, 공유 이미지, 파비콘. 저장 후 서버에서 node bake-seo.js 를 돌려야 실제 HTML 에 반영됩니다' },
  { id:'admins',   label:'관리자',   title:'관리자 계정',     desc:'콘솔에 로그인할 수 있는 계정을 관리합니다' },
  { id:'settings', label:'설정',     title:'설정 · 내보내기', desc:'배포용 데이터와 계정 관리' },
];
let curTab = 'dash';

function renderNav(){
  const inqs = ADM.inqs;
  const newCnt = inqs.filter(i=>Admin.inqMeta(i.id).status==='new').length;
  const newLeads = ADM.leads.filter(l=>Admin.leadMeta(l.id).status==='new').length;
  const counts = { inq:newCnt||'', leads:newLeads||'', buyers:ADM.buyers.length||'',
                   products:MK_PRODUCTS.length, columns:MK_COLUMNS.length,
                   faq:(typeof MK_FAQ!=='undefined'?MK_FAQ.length:''),
                   notices:(typeof MK_NOTICES!=='undefined'?MK_NOTICES.length:''), dash:'', settings:'' };
  document.getElementById('sb-nav').innerHTML =
    `<div class="grp">운영</div>` +
    NAV.slice(0,4).map(n=>navBtn(n,counts)).join('') +
    `<div class="grp">콘텐츠</div>` +
    NAV.slice(4,8).map(n=>navBtn(n,counts)).join('') +
    `<div class="grp">시스템</div>` +
    NAV.slice(8).map(n=>navBtn(n,counts)).join('');
}
function navBtn(n, counts){
  const c = counts[n.id];
  return `<button class="${curTab===n.id?'on':''}" onclick="showTab('${n.id}')"><span>${n.label}</span>
    ${c!=='' && c!==undefined ? `<span class="cnt">${c}</span>` : ''}</button>`;
}

function showTab(name){
  curTab = name;
  TABS.forEach(x=>document.getElementById('tab-'+x).classList.toggle('hidden', x!==name));
  const n = NAV.find(x=>x.id===name) || NAV[0];
  document.getElementById('pg-title').textContent = n.title;
  document.getElementById('pg-desc').textContent = n.desc;
  renderNav();
  toggleSb(false);
  window.scrollTo(0,0);
}
function toggleSb(open){
  document.getElementById('sb').classList.toggle('open', !!open);
  document.getElementById('sb-backdrop').classList.toggle('open', !!open);
}

function renderAll(){
  renderNav(); renderDash();
  renderInq(); renderLeads(); renderBuyers(); renderProducts(); renderColumns(); renderFaqTab(); renderNotices(); renderCopy(); renderSeo(); renderAdmins(); renderSettings();
  showTab(curTab);
}

/* ============================================================
   1-B. 입점 문의 (maker.html 랜딩 접수분)
   ============================================================ */
const LEAD_ST = { new:'신규', contacted:'연락함', onboarding:'등록 진행', done:'입점 완료', drop:'보류' };

function renderLeads(){
  const leads = ADM.leads;
  const cnt = k => leads.filter(l=>Admin.leadMeta(l.id).status===k).length;

  document.getElementById('tab-leads').innerHTML = `
    <div class="card"><p class="note">제품 등록 랜딩 <code>maker.html</code>으로 들어온 공급사 문의입니다.
      상태와 메모는 관리자에만 저장됩니다.</p><div class="kpi" style="margin-bottom:18px"><div class="kpi-card"><div class="lbl">전체</div><div class="num">${leads.length}</div><div class="sub">누적 접수</div></div><div class="kpi-card"><div class="lbl">신규</div><div class="num">${cnt('new')}</div><div class="sub">연락 대기</div></div><div class="kpi-card"><div class="lbl">진행 중</div><div class="num">${cnt('contacted')+cnt('onboarding')}</div><div class="sub">연락함 · 등록 진행</div></div><div class="kpi-card"><div class="lbl">입점 완료</div><div class="num">${cnt('done')}</div><div class="sub">제품 등록됨</div></div></div><div class="bar"><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="exportLeadsCsv()">CSV 내려받기</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:150px">접수일</th><th>회사 · 담당자</th><th>연락처</th><th>카테고리</th><th>제품 소개</th><th style="width:130px">상태</th><th style="width:80px"></th></tr></thead><tbody>${leads.length ? leads.map(l=>{
      const m = Admin.leadMeta(l.id);
      return `<tr class="row-hover"><td>${esc(String(l.createdAt).slice(0,10))}<div class="sub">${esc(String(l.createdAt).slice(11,16))}</div></td><td><b>${esc(l.company)}</b><div class="sub">${esc(l.name)}</div>${l.site?`<div class="sub"><a href="${esc(l.site)}" target="_blank" rel="noopener">${esc(l.site)}</a></div>`:''}</td><td>${esc(l.tel)}<div class="sub">${esc(l.email)}</div></td><td>${esc(catLabel(l.cat))}</td><td style="max-width:320px"><div style="white-space:pre-wrap;line-height:1.6">${esc(l.message)}</div><input class="srch" style="margin-top:8px;width:100%" placeholder="메모" value="${esc(m.memo)}"
                 onchange="Admin.setLeadMeta('${l.id}',{memo:this.value});toastA('메모 저장됨')"></td><td><select onchange="admDo(Admin.setLeadMeta('${l.id}',{status:this.value}),0)">${Object.entries(LEAD_ST).map(([k,v])=>`<option value="${k}" ${m.status===k?'selected':''}>${v}</option>`).join('')}</select></td><td><button class="btn btn-ghost btn-sm" onclick="if(confirm('${esc(l.company)}\\n삭제할까요?')){admDo(Admin.deleteLead('${l.id}'),0);}">삭제</button></td></tr>`;
    }).join('') : `<tr class="empty-row"><td colspan="7">아직 입점 문의가 없습니다</td></tr>`}
      </tbody></table></div></div>`;
}
function catLabel(id){
  if(id==='etc') return '기타';
  const c = mkCat(id);
  return c ? c.name.ko : (id||'-');
}
function exportLeadsCsv(){
  const rows = [['접수일','회사명','담당자','연락처','이메일','홈페이지','카테고리','제품소개','상태','메모']];
  ADM.leads.forEach(l=>{
    const m = Admin.leadMeta(l.id);
    rows.push([l.createdAt, l.company, l.name, l.tel, l.email, l.site||'', catLabel(l.cat),
               String(l.message).replace(/\r?\n/g,' '), LEAD_ST[m.status]||m.status, m.memo||'']);
  });
  downloadFile('makenov-입점문의_'+today()+'.csv',
    '﻿' + rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n'), 'text/csv');
}

/* ============================================================
   0. 대시보드
   ============================================================ */
function renderDash(){
  const inqs   = ADM.inqs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const buyers = ADM.buyers.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const newCnt = inqs.filter(i=>Admin.inqMeta(i.id).status==='new').length;
  const vipCnt = buyers.filter(b=>Admin.tier(b.email)==='vip').length;
  const ntsCnt = buyers.filter(b=>['gov','nts'].includes(b.verifiedBy)).length;

  /* 최근 7일 문의 추이 */
  const days = [...Array(7)].map((_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-(6-i));
    const key = d.toISOString().slice(0,10);
    return { label:(d.getMonth()+1)+'/'+d.getDate(),
             n: inqs.filter(x=>String(x.createdAt).slice(0,10)===key).length };
  });
  const peak = Math.max(1, ...days.map(d=>d.n));

  document.getElementById('tab-dash').innerHTML = `
    <div class="kpi"><div class="kpi-card"><div class="lbl">누적 문의</div><div class="num">${inqs.length}</div><div class="sub">미처리 <b>${newCnt}</b>건</div></div><div class="kpi-card"><div class="lbl">인증 유통 파트너</div><div class="num">${buyers.length}</div><div class="sub">VIP <b>${vipCnt}</b> · 정부DB인증 <b>${ntsCnt}</b></div></div><div class="kpi-card"><div class="lbl">등록 제품</div><div class="num">${MK_PRODUCTS.length}</div><div class="sub">추천 <b>${MK_PRODUCTS.filter(p=>p.featured).length}</b>건</div></div><div class="kpi-card"><div class="lbl">칼럼</div><div class="num">${MK_COLUMNS.length}</div><div class="sub">발행됨</div></div></div><div class="card"><div class="card-head"><h3>최근 7일 문의 추이</h3><span class="sp"></span><span class="note" style="margin:0">최대 ${peak}건</span></div><div style="display:flex;align-items:flex-end;gap:10px;height:130px;padding-top:6px">
        ${days.map(d=>`
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;height:100%"><div style="flex:1;width:100%;display:flex;align-items:flex-end"><div title="${d.n}건" style="width:100%;height:${Math.round((d.n/peak)*100)}%;min-height:3px;
                background:${d.n?'var(--mk-primary)':'#E9ECEF'};border-radius:5px 5px 0 0"></div></div><span style="font-size:11px;color:var(--adm-sub)">${d.label}</span></div>`).join('')}
      </div></div><div class="card"><div class="card-head"><h3>최근 문의</h3><span class="sp"></span><button class="btn btn-ghost btn-sm" onclick="showTab('inq')">전체 보기</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:96px">일시</th><th>제품</th><th>회사</th><th>담당자</th><th style="width:76px">상태</th></tr></thead><tbody>${inqs.length ? inqs.slice(0,5).map(i=>{
          const p=mkProduct(i.pid), m=Admin.inqMeta(i.id), lb=ST_LABEL[m.status]||ST_LABEL.new;
          return `<tr><td>${new Date(i.createdAt).toLocaleDateString('ko-KR')}</td><td>${p?esc(p.name.ko||p.name.vi):esc(i.pid)}</td><td>${esc(i.company||'-')}</td><td>${esc(i.contactName||'-')}</td><td><span class="pill-st ${lb[1]}">${lb[0]}</span></td></tr>`;
        }).join('') : `<tr class="empty-row"><td colspan="5">아직 접수된 문의가 없습니다</td></tr>`}</tbody></table></div></div><div class="card"><div class="card-head"><h3>최근 가입 유통 파트너</h3><span class="sp"></span><button class="btn btn-ghost btn-sm" onclick="showTab('buyers')">전체 보기</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:96px">가입일</th><th>국가</th><th>회사</th><th>인증</th><th style="width:76px">등급</th></tr></thead><tbody>${buyers.length ? buyers.slice(0,5).map(b=>{
          const c=b.country?mkCountry(b.country):null, tier=Admin.tier(b.email);
          return `<tr><td>${b.createdAt?new Date(b.createdAt).toLocaleDateString('ko-KR'):'-'}</td><td>${c?c.flag:''} ${esc(b.countryName||'')}</td><td>${esc(b.company)}</td><td>${esc(VERIFY_LABEL[b.verifiedBy]||'-')}</td><td>${tier==='vip'?'<span class="pill-st st-vip">VIP</span>':'<span class="pill-st st-done">인증</span>'}</td></tr>`;
        }).join('') : `<tr class="empty-row"><td colspan="5">아직 가입한 유통 파트너가 없습니다</td></tr>`}</tbody></table></div></div><div class="card"><div class="card-head"><h3>바로가기</h3></div><div class="bar" style="margin:0"><button class="btn btn-primary btn-sm" onclick="showTab('products');pEditing='';pBlocks=[];renderProducts()">+ 제품 등록</button><button class="btn btn-ghost btn-sm" onclick="showTab('columns');cEditing='';renderColumns()">+ 칼럼 작성</button><button class="btn btn-ghost btn-sm" onclick="showTab('settings')">data.js 내보내기</button></div></div>`;
}

/* ============================================================
   1. 문의함
   ============================================================ */
const ST_LABEL = { new:['신규','st-new'], doing:['처리중','st-doing'], done:['완료','st-done'] };
let inqFilter = 'all', inqSearch = '', inqProd = 'all', inqSort = 'new';

/* 제품 표시명 — 목록·모달·CSV 공용 */
function inqProdName(pid){
  const p = mkProduct(pid);
  return p ? (p.name.ko || p.name.vi || pid) : pid;
}

/* 검색·제품·상태를 모두 적용한 문의 목록 (테이블·CSV 공용) */
function filteredInqs(){
  const q = inqSearch.trim().toLowerCase();
  let list = (ADM.inqs||[]).filter(i=>{
    if(inqFilter !== 'all' && Admin.inqMeta(i.id).status !== inqFilter) return false;
    if(inqProd !== 'all' && i.pid !== inqProd) return false;
    if(q){
      const hay = [i.company, i.contactName, i.buyerEmail, i.mst, i.message,
                   i.zalo, i.phone, inqProdName(i.pid), Admin.inqMeta(i.id).memo]
        .map(x=>String(x||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const ord = { new:0, doing:1, done:2 };
  const S = {
    new:     (a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)),
    old:     (a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)),
    product: (a,b)=>inqProdName(a.pid).localeCompare(inqProdName(b.pid),'ko'),
    company: (a,b)=>String(a.company||'').localeCompare(String(b.company||''),'ko'),
    status:  (a,b)=>(ord[Admin.inqMeta(a.id).status]??0)-(ord[Admin.inqMeta(b.id).status]??0),
  };
  return list.slice().sort(S[inqSort] || S.new);
}

function renderInq(){
  const all = (ADM.inqs||[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const list = filteredInqs();
  const cnt = s => all.filter(i=>Admin.inqMeta(i.id).status===s).length;

  /* 제품별 문의 수 — 많은 순으로 골라 담는다 */
  const byP = {}; all.forEach(i=>{ byP[i.pid] = (byP[i.pid]||0)+1; });
  const prodOpts = Object.keys(byP).sort((a,b)=>byP[b]-byP[a]);
  const opt = (v,cur,label)=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(label)}</option>`;
  const filtered = (inqSearch || inqProd!=='all' || inqFilter!=='all' || inqSort!=='new');

  document.getElementById('tab-inq').innerHTML = `
    <div class="card"><p class="note">유통 파트너가 보낸 견적 문의입니다. <b>행을 누르면 문의 전문과 유통 파트너 정보</b>가 열립니다.</p>
    <div class="bar"><button class="btn btn-sm ${inqFilter==='all'?'btn-primary':'btn-ghost'}" onclick="inqFilter='all';renderInq()">전체 ${all.length}</button><button class="btn btn-sm ${inqFilter==='new'?'btn-primary':'btn-ghost'}" onclick="inqFilter='new';renderInq()">신규 ${cnt('new')}</button><button class="btn btn-sm ${inqFilter==='doing'?'btn-primary':'btn-ghost'}" onclick="inqFilter='doing';renderInq()">처리중 ${cnt('doing')}</button><button class="btn btn-sm ${inqFilter==='done'?'btn-primary':'btn-ghost'}" onclick="inqFilter='done';renderInq()">완료 ${cnt('done')}</button></div>
    <div class="bar">
      <input class="srch" style="min-width:220px" placeholder="회사·담당자·제품·내용·메모 검색" value="${esc(inqSearch)}" oninput="inqSearch=this.value;renderInq()">
      <select class="srch" style="min-width:190px" onchange="inqProd=this.value;renderInq()">${opt('all',inqProd,`제품 전체 (${all.length})`)}${prodOpts.map(pid=>opt(pid,inqProd,`${inqProdName(pid)} (${byP[pid]})`)).join('')}</select>
      <select class="srch" style="min-width:118px" onchange="inqSort=this.value;renderInq()">${opt('new',inqSort,'최신순')}${opt('old',inqSort,'오래된순')}${opt('product',inqSort,'제품순')}${opt('company',inqSort,'회사순')}${opt('status',inqSort,'상태순')}</select>
      <span class="grow"></span>
      <span class="note" style="margin:0">${list.length}건${filtered?` / ${all.length}`:''}</span>
      ${filtered?`<button class="btn btn-ghost btn-sm" onclick="inqSearch='';inqProd='all';inqFilter='all';inqSort='new';renderInq()">초기화</button>`:''}
      <button class="btn btn-ghost btn-sm" onclick="exportInquiries()">CSV 내보내기</button>
    </div>
    <div class="tbl-wrap"><table><thead><tr><th style="width:96px">일시</th><th>제품</th><th>회사</th><th>담당자 / 연락처</th><th>내용 · 메모</th><th style="width:150px">상태</th></tr></thead><tbody>${list.length ? list.map(i=>{
        const p = mkProduct(i.pid), m = Admin.inqMeta(i.id), lb = ST_LABEL[m.status]||ST_LABEL.new;
        const msg = String(i.message||'').trim();
        return `<tr class="row-hover" style="cursor:pointer" onclick="if(!event.target.closest('input,select,button'))openInq('${i.id}')"><td>${new Date(i.createdAt).toLocaleDateString('ko-KR')}<div class="sub">${new Date(i.createdAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</div></td><td>${esc(inqProdName(i.pid))}<div class="sub">${p?esc(p.brand):''}</div></td><td>${esc(i.company||'-')}<div class="sub">${esc(i.mst||'')}</div></td><td>${esc(i.contactName||'-')}<div class="sub">${esc(i.zalo||'')}<br>${esc(i.buyerEmail||'')}</div></td><td>${msg ? esc(msg.length>60?msg.slice(0,60)+'…':msg) : '<span class="sub">내용 없음</span>'}
            <div style="margin-top:6px"><input class="srch" style="width:100%;min-width:0;font-size:12px;padding:5px 8px"
              placeholder="메모" value="${esc(m.memo)}"
              onchange="Admin.setInqMeta('${i.id}',{memo:this.value});toastA('메모 저장됨')"></div></td><td><span class="pill-st ${lb[1]}">${lb[0]}</span><div style="margin-top:6px"><select class="srch" style="width:100%;min-width:0;font-size:12px;padding:5px 8px"
                onchange="admDo(Admin.setInqMeta('${i.id}',{status:this.value}),0)"><option value="new"${m.status==='new'?'selected':''}>신규</option><option value="doing" ${m.status==='doing'?'selected':''}>처리중</option><option value="done"${m.status==='done'?'selected':''}>완료</option></select></div><button class="btn btn-ghost btn-sm" style="margin-top:5px;width:100%"
              onclick="if(confirm('이 문의를 삭제할까요?')){admDo(Admin.deleteInquiry('${i.id}'),0);}">삭제</button></td></tr>`;
      }).join('') : `<tr class="empty-row"><td colspan="6">${all.length?'조건에 맞는 문의가 없습니다':'아직 들어온 문의가 없습니다'}</td></tr>`}
      </tbody></table></div></div>`;
}

/* ============================================================
   상세 보기 모달 — 문의 · 유통 파트너
   ============================================================ */
function openAdmModal(title, html){
  document.getElementById('adm-modal-title').textContent = title;
  document.getElementById('adm-modal-body').innerHTML = html;
  document.getElementById('adm-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeAdmModal(){
  document.getElementById('adm-modal').hidden = true;
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeAdmModal(); });

const dl = rows => `<dl class="dl">${rows.filter(r=>r[1]).map(r=>`<dt>${esc(r[0])}</dt><dd>${r[2]==='raw'?r[1]:esc(r[1])}</dd>`).join('')}</dl>`;
const fmtDT = s => s ? new Date(s).toLocaleString('ko-KR') : '-';

/* 한 유통 파트너의 문의 목록 (모달 안에서 서로 오갈 수 있게) */
function inqsOfBuyer(email, exceptId){
  return (ADM.inqs||[]).filter(i=>i.buyerEmail===email && i.id!==exceptId);
}
function miniInqList(items){
  if(!items.length) return '<p class="note" style="margin:0">다른 문의가 없습니다.</p>';
  return `<ul class="minilist">${items.map(i=>{
    const m = Admin.inqMeta(i.id), lb = ST_LABEL[m.status]||ST_LABEL.new;
    return `<li onclick="openInq('${i.id}')"><b>${esc(inqProdName(i.pid))}</b> <span class="pill-st ${lb[1]}" style="margin-left:6px">${lb[0]}</span><div class="sub">${fmtDT(i.createdAt)}${i.message?' · '+esc(String(i.message).slice(0,40)):''}</div></li>`;
  }).join('')}</ul>`;
}

function openInq(id){
  const i = (ADM.inqs||[]).find(x=>x.id===id);
  if(!i) return;
  const m = Admin.inqMeta(i.id), lb = ST_LABEL[m.status]||ST_LABEL.new;
  const p = mkProduct(i.pid);
  const c = i.country ? mkCountry(i.country) : null;
  const buyer = (ADM.buyers||[]).find(b=>b.email===i.buyerEmail);

  openAdmModal('문의 상세', `
    ${dl([
      ['접수 일시', fmtDT(i.createdAt)],
      ['상태', `<span class="pill-st ${lb[1]}">${lb[0]}</span>`, 'raw'],
      ['제품', p ? `${esc(inqProdName(i.pid))} <span class="sub">${esc(p.brand)}</span>` : esc(i.pid), 'raw'],
    ])}
    <div class="mbox"><h4>문의 내용</h4>
      <div class="msg">${String(i.message||'').trim() ? esc(i.message) : '<span class="sub">내용 없이 문의만 눌렀습니다.</span>'}</div>
    </div>
    <div class="mbox"><h4>보낸 유통 파트너</h4>
      ${dl([
        ['회사', i.company],
        ['등록번호', i.mst],
        ['국가', c ? `${c.flag} ${c.name.ko}` : i.country],
        ['주소', i.address],
        ['담당자', [i.contactName, i.position].filter(Boolean).join(' · ')],
        ['이메일', i.buyerEmail],
        ['전화', i.phone],
        ['메신저', i.zalo],
        ['인증', VERIFY_LABEL[i.verifiedBy] || i.verifiedBy],
        ['등급', i.tier === 'vip' ? 'VIP' : '인증 유통 파트너'],
      ])}
      ${buyer ? `<button class="btn btn-ghost btn-sm" onclick="openBuyer('${esc(buyer.email)}')">이 유통 파트너 전체 보기</button>` : ''}
    </div>
    <div class="mbox"><h4>같은 유통 파트너의 다른 문의</h4>${miniInqList(inqsOfBuyer(i.buyerEmail, i.id))}</div>
    <div class="mbox"><h4>처리</h4>
      <div class="bar" style="margin:0">
        <select class="srch" style="min-width:120px" onchange="admDo(Admin.setInqMeta('${i.id}',{status:this.value}),0)">
          <option value="new" ${m.status==='new'?'selected':''}>신규</option>
          <option value="doing" ${m.status==='doing'?'selected':''}>처리중</option>
          <option value="done" ${m.status==='done'?'selected':''}>완료</option></select>
        <input class="srch grow" placeholder="메모" value="${esc(m.memo)}"
          onchange="Admin.setInqMeta('${i.id}',{memo:this.value});toastA('메모 저장됨')">
      </div>
    </div>`);
}

function openBuyer(email){
  const b = (ADM.buyers||[]).find(x=>x.email===email);
  if(!b) return;
  const c = b.country ? mkCountry(b.country) : null;
  const tier = Admin.tier(b.email);
  const mine = (ADM.inqs||[]).filter(i=>i.buyerEmail===email);

  openAdmModal(b.company || email, `
    ${dl([
      ['가입일', b.createdAt ? new Date(b.createdAt).toLocaleDateString('ko-KR') : ''],
      ['국가', c ? `${c.flag} ${c.name.ko}` : b.country],
      ['회사', b.company],
      ['등록번호', b.regNo || b.mst],
      ['주소', b.address],
      ['담당자', [b.contactName, b.position].filter(Boolean).join(' · ')],
      ['이메일', b.email],
      ['전화', b.phone],
      ['메신저', b.messenger || b.zalo],
      ['인증 방식', VERIFY_LABEL[b.verifiedBy] || b.verifiedBy],
      ['인증 상태', b.status],
      ['등급', tier === 'vip' ? 'VIP' : '인증 유통 파트너'],
    ])}
    <div class="mbox"><h4>문의 ${mine.length}건</h4>${miniInqList(mine)}</div>
    <div class="mbox"><h4>등급</h4>
      <select class="srch" style="min-width:150px"
        onchange="admDo(Admin.setTier('${esc(b.email)}',this.value),0);toastA('등급 변경됨')">
        <option value="verified" ${tier!=='vip'?'selected':''}>인증 유통 파트너</option>
        <option value="vip" ${tier==='vip'?'selected':''}>VIP</option></select>
      <p class="note" style="margin:8px 0 0">VIP로 올리면 한국 기업 직통 연락처를 열어줍니다.</p>
    </div>`);
}

/* 화면에서 걸어 둔 검색·제품·상태·정렬을 그대로 내보낸다 */
function exportInquiries(){
  const rows = [['일시','제품','브랜드','회사','등록번호','국가','담당자','직함','전화','메신저','이메일','내용','상태','메모']];
  filteredInqs().forEach(i=>{
    const p = mkProduct(i.pid), m = Admin.inqMeta(i.id);
    const c = i.country ? mkCountry(i.country) : null;
    rows.push([new Date(i.createdAt).toLocaleString('ko-KR'), inqProdName(i.pid), p?p.brand:'',
      i.company||'', i.mst||'', (c&&c.name.ko)||i.country||'',
      i.contactName||'', i.position||'', i.phone||'', i.zalo||'', i.buyerEmail||'',
      (i.message||'').replace(/\n/g,' '), (ST_LABEL[m.status]||ST_LABEL.new)[0], m.memo||'']);
  });
  downloadFile('makenov-문의_'+today()+'.csv',
    '﻿'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'), 'text/csv');
}

/* ============================================================
   2. 유통 파트너
   ============================================================ */
const VERIFY_LABEL = { gov:'국세청', nts:'국세청', checksum:'체크섬', domain:'도메인' };

/* ---------- 유통 파트너(회원) 필터 상태 ---------- */
let bSearch='', bCountry='all', bVerify='all', bTier='all', bSort='new';
function bVerifyGroup(vb){ if(vb==='gov'||vb==='nts') return 'gov'; if(vb==='checksum') return 'checksum'; if(vb==='domain') return 'domain'; return 'other'; }
function bInqCount(b){ return (ADM.inqs||[]).filter(i=>i.buyerEmail===b.email).length; }

/* 검색·필터·정렬을 모두 적용한 유통 파트너 목록 (테이블·CSV 공용) */
function filteredBuyers(){
  const q = bSearch.trim().toLowerCase();
  let list = (ADM.buyers||[]).filter(b=>{
    if(bCountry!=='all' && String(b.country||'')!==bCountry) return false;
    if(bVerify!=='all'  && bVerifyGroup(b.verifiedBy)!==bVerify) return false;
    if(bTier!=='all'){ const vip = Admin.tier(b.email)==='vip'; if(bTier==='vip'&&!vip) return false; if(bTier==='verified'&&vip) return false; }
    if(q){
      const hay = [b.company,b.email,b.contactName,b.regNo,b.mst,b.address,b.phone,b.countryName,b.position]
        .map(x=>String(x||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const S = {
    new:     (a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)),
    old:     (a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)),
    company: (a,b)=>String(a.company||'').localeCompare(String(b.company||''),'ko'),
    country: (a,b)=>String(a.countryName||a.country||'').localeCompare(String(b.countryName||b.country||''),'ko'),
    inq:     (a,b)=>bInqCount(b)-bInqCount(a),
  };
  return list.slice().sort(S[bSort]||S.new);
}

function renderBuyers(){
  const all  = ADM.buyers||[];
  const list = filteredBuyers();
  const vipCnt = all.filter(b=>Admin.tier(b.email)==='vip').length;
  const govCnt = all.filter(b=>bVerifyGroup(b.verifiedBy)==='gov').length;

  /* 국가별 분포 → 클릭형 필터 칩 */
  const byC = {}; all.forEach(b=>{ const k=b.country||'??'; byC[k]=(byC[k]||0)+1; });
  const countries = Object.keys(byC).sort((a,b)=>byC[b]-byC[a]);
  const chip = (code)=>{ const c = code==='all'?null:mkCountry(code); const on = bCountry===code;
    const label = code==='all' ? '전체' : ((c&&c.name.ko)||code);
    const cnt = code==='all' ? all.length : byC[code];
    return `<button class="bchip${on?' on':''}" onclick="bCountry='${code}';renderBuyers()">${c?c.flag+' ':''}${esc(label)} <b>${cnt}</b></button>`; };
  const opt = (v,cur,label)=>`<option value="${v}" ${cur===v?'selected':''}>${label}</option>`;
  const filtered = (bSearch||bCountry!=='all'||bVerify!=='all'||bTier!=='all');

  document.getElementById('tab-buyers').innerHTML = `
    <div class="kpi" style="margin-bottom:16px">
      <div class="kpi-card"><div class="lbl">전체 회원</div><div class="num">${all.length}</div><div class="sub">인증 유통 파트너</div></div>
      <div class="kpi-card"><div class="lbl">VIP</div><div class="num">${vipCnt}</div><div class="sub">직통 연락처 열림</div></div>
      <div class="kpi-card"><div class="lbl">국세청 인증</div><div class="num">${govCnt}</div><div class="sub">정부 DB 대조 통과</div></div>
      <div class="kpi-card"><div class="lbl">진출 국가</div><div class="num">${countries.filter(k=>k!=='??').length}</div><div class="sub">국가 수</div></div>
    </div>
    <div class="card">
      <p class="note" style="margin-bottom:14px">사업자 인증을 통과한 회원 명단입니다. <b>인증</b> = <code>국세청</code> 정부 DB 실시간 조회 · <code>체크섬</code> 번호 유효성만 · <code>도메인</code> 회사 이메일. 메신저 컨택 후 <b>VIP</b>로 승격하면 한국 기업 직통 연락처를 열어줄 수 있습니다.</p>
      <div class="bchips" style="margin-bottom:14px">${['all',...countries.filter(k=>k!=='??')].map(chip).join('')}</div>
      <div class="bar">
        <input class="srch" placeholder="회사·이메일·담당자·등록번호·주소 검색" value="${esc(bSearch)}" oninput="bSearch=this.value;renderBuyers()">
        <select class="srch" style="min-width:128px" onchange="bVerify=this.value;renderBuyers()">${opt('all',bVerify,'인증방식 전체')}${opt('gov',bVerify,'국세청')}${opt('checksum',bVerify,'체크섬')}${opt('domain',bVerify,'도메인')}</select>
        <select class="srch" style="min-width:108px" onchange="bTier=this.value;renderBuyers()">${opt('all',bTier,'등급 전체')}${opt('vip',bTier,'VIP')}${opt('verified',bTier,'인증')}</select>
        <select class="srch" style="min-width:128px" onchange="bSort=this.value;renderBuyers()">${opt('new',bSort,'최신 가입순')}${opt('old',bSort,'오래된 순')}${opt('company',bSort,'회사명순')}${opt('country',bSort,'국가순')}${opt('inq',bSort,'문의 많은순')}</select>
        <span class="grow"></span>
        <span class="note" style="margin:0">${list.length}명${filtered?` / ${all.length}`:''}</span>
        ${filtered?`<button class="btn btn-ghost btn-sm" onclick="bSearch='';bCountry='all';bVerify='all';bTier='all';bSort='new';renderBuyers()">초기화</button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="exportBuyers()">CSV</button>
      </div>
      <div class="tbl-wrap"><table><thead><tr><th style="width:88px">가입일</th><th>국가</th><th>회사</th><th>등록번호</th><th>인증</th><th>담당자</th><th>연락처</th><th>문의</th><th style="width:118px">등급</th></tr></thead><tbody>${list.length ? list.map(b=>{
        const c = b.country ? mkCountry(b.country) : null;
        const tier = Admin.tier(b.email);
        const n = bInqCount(b);
        return `<tr class="row-hover" style="cursor:pointer" onclick="if(!event.target.closest('input,select,button'))openBuyer('${esc(b.email)}')"><td>${b.createdAt?new Date(b.createdAt).toLocaleDateString('ko-KR'):'-'}</td><td>${c?c.flag:''} ${esc(b.countryName||b.country||'')}</td><td>${esc(b.company)}<div class="sub">${esc(b.address||'')}</div></td><td>${esc(b.regNo||b.mst||'-')}</td><td>${esc(VERIFY_LABEL[b.verifiedBy]||'-')}<div class="sub">${esc(b.status||'')}</div></td><td>${esc(b.contactName||'')}<div class="sub">${esc(b.position||'')}</div></td><td>${esc(b.phone||b.zalo||'')}<div class="sub">${esc(b.messenger||'')} ${esc(b.messengerId||'')}<br>${esc(b.email)}</div></td><td><b>${n}</b></td><td>${tier==='vip'?'<span class="pill-st st-vip">VIP</span>':'<span class="pill-st st-done">인증</span>'}
            <div style="margin-top:6px"><select class="srch" style="width:100%;min-width:0;font-size:12px;padding:5px 8px"
                onchange="admDo(Admin.setTier('${esc(b.email)}',this.value),0);toastA('등급 변경됨')"><option value="verified" ${tier!=='vip'?'selected':''}>인증 유통 파트너</option><option value="vip"${tier==='vip'?'selected':''}>VIP</option></select></div></td></tr>`;
      }).join('') : `<tr class="empty-row"><td colspan="9">${all.length?'조건에 맞는 유통 파트너가 없습니다':'아직 가입한 유통 파트너가 없습니다'}</td></tr>`}
      </tbody></table></div>
    </div>`;
}

function exportBuyers(){
  const list = filteredBuyers();
  const rows = [['가입일','국가','회사','주소','등록번호','인증방식','상태','담당자','직함','전화','메신저','메신저ID','이메일','등급']];
  list.forEach(b=>{
    rows.push([b.createdAt?new Date(b.createdAt).toLocaleDateString('ko-KR'):'', b.countryName||b.country||'',
      b.company||'', b.address||'', b.regNo||b.mst||'', VERIFY_LABEL[b.verifiedBy]||'', b.status||'',
      b.contactName||'', b.position||'', b.phone||b.zalo||'', b.messenger||'', b.messengerId||'',
      b.email||'', Admin.tier(b.email)==='vip'?'VIP':'인증']);
  });
  downloadFile('makenov-유통 파트너_'+today()+'.csv',
    '﻿'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'), 'text/csv');
}

/* ============================================================
   3. 제품 CRUD
   ============================================================ */
let pEditing = null;      // 편집 중인 제품 id (null = 목록)
let pBlocks  = [];        // 상세 블록 임시 저장
let pSearch  = '';

function renderProducts(){
  const el = document.getElementById('tab-products');
  if(pEditing !== null){ el.innerHTML = productForm(pEditing); return; }

  const q = pSearch.toLowerCase();
  const list = MK_PRODUCTS.filter(p=> !q ||
    Object.values(p.name).join(' ').toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));

  el.innerHTML = `
    <div class="card"><p class="note">제품을 등록·수정·삭제하면 사이트에 즉시 반영됩니다. 저장 위치는 이 브라우저이며,
    배포 전에 <b>설정 · 내보내기</b> 탭에서 <code>data.js</code>로 구워야 다른 기기에도 반영됩니다.</p><div class="bar"><input class="srch" placeholder="제품명 · 브랜드 검색" value="${esc(pSearch)}" oninput="pSearch=this.value;renderProducts()"><span class="grow"></span><button class="btn btn-primary btn-sm" onclick="pEditing='';pBlocks=[];pGallery=[];renderProducts()">+ 새 제품 등록</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:60px">이미지</th><th>제품명</th><th>브랜드</th><th>카테고리</th><th>가격(잠금)</th><th>문의</th><th>관심</th><th>표시</th><th style="width:120px"></th></tr></thead><tbody>${list.length ? list.map(p=>`
        <tr class="row-hover"><td><img class="thumb-sm" src="${esc(imgSrc(p.img))}" alt=""></td><td><b>${esc(p.name.ko||p.name.vi)}</b><div class="sub">${esc(p.id)} · ${esc(p.createdAt)}</div></td><td>${esc(p.brand)}<div class="sub">${esc(p.origin)}</div></td><td>${esc(mkCat(p.cat)?mkCat(p.cat).name.ko:p.cat)}</td><td>${esc(triText(p.price))}</td><td><b>${p.inquiries}</b></td><td>${p.views}</td><td>${p.featured?'<span class="pill-st st-vip">추천</span> ':''}${p.isNew?'<span class="pill-st st-new">신규</span>':''}</td><td><button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">수정</button><button class="btn btn-ghost btn-sm" onclick="if(confirm('${esc(p.name.ko||p.name.vi)}\\n삭제할까요?')){admDo(Admin.deleteProduct('${p.id}'));}">삭제</button></td></tr>`).join('') : `<tr class="empty-row"><td colspan="9">제품이 없습니다</td></tr>`}
      </tbody></table></div></div>`;
}

function editProduct(id){
  const p = mkProduct(id);
  pBlocks  = p ? JSON.parse(JSON.stringify(p.detail||[])) : [];
  pGallery = p ? [...(p.gallery||[])] : [];
  pEditing = id; renderProducts();
}

/* ============================================================
   한국어 자동번역
   mkTranslate · mkTranslateLines · mkTranslateKo 는 copy.js 에 있다.
   화면 편집기(copy-edit.js)도 같은 함수를 써야 해서 그쪽으로 옮겼다.
   ============================================================ */

/* 폼의 한국어 필드를 읽어 비어있는 베트남어·영어 칸을 자동으로 채운다.
   prefixes: ['f-name','f-tag',...] → <prefix>-ko/-vi/-en 3칸 세트.
   includeBlocks=true 면 제품 상세 문단블록(pBlocks[i].text)도 번역한다. */
async function autoTranslate(btn, prefixes, includeBlocks){
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = '번역 중…';
  let n = 0;
  try{
    for(const pre of prefixes){
      const ko = rteGet(pre + '-ko');                 // 일반 필드는 텍스트, 에디터는 HTML(태그 보존)
      if(!ko) continue;
      for(const to of ['vi','en']){
        const tid = pre + '-' + to;
        if(!(RTE[tid] || document.getElementById(tid))) continue;
        if(rteGet(tid)) continue;                     // 이미 채워진 칸은 건드리지 않음
        const tr = await mkTranslate(ko, 'ko', to);
        if(tr){ rteSet(tid, tr); n++; }
      }
    }
    if(includeBlocks && typeof pBlocks !== 'undefined'){
      for(const b of pBlocks){
        if(b.type !== 'p' || !b.text || !String(b.text.ko||'').trim()) continue;
        if(!String(b.text.vi||'').trim()){ const t = await mkTranslate(b.text.ko,'ko','vi'); if(t){ b.text.vi = t; n++; } }
        if(!String(b.text.en||'').trim()){ const t = await mkTranslate(b.text.ko,'ko','en'); if(t){ b.text.en = t; n++; } }
      }
      if(typeof renderBlocks === 'function') renderBlocks();
    }
    toastA(n ? (n + '개 칸 자동번역 완료 — 저장 전에 확인하세요') : '번역할 한국어 내용이 없거나 이미 다 채워져 있습니다');
  }catch(e){
    toastA('번역 실패: ' + (e.message||e));
  }
  btn.disabled = false; btn.textContent = orig;
}

function productForm(id){
  const p = id ? mkProduct(id) : null;
  const g = (o,k)=> (o && o[k]) ? o[k] : '';
  const nm = p?p.name:{}, tg = p?p.tagline:{}, bs = p?p.brandStory:{};
  /* 거래조건: 과거 평문은 KO 칸으로, 잠김 표식(mk-locked)은 빈 칸으로 */
  const t3 = v => isLocked(v) ? {} : (typeof v==='string' ? {ko:v} : (v||{}));
  const pr = t3(p&&p.price), mq = t3(p&&p.moq), ld = t3(p&&p.lead), tm = t3(p&&p.terms);
  return `
    <div class="card"><div class="bar"><h3 style="margin:0">${p?'제품 수정':'새 제품 등록'}</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="autoTranslate(this,['f-name','f-tag','f-story','f-price','f-moq','f-lead','f-terms'],true)" title="한국어를 베트남어·영어로 자동 번역 (빈 칸만 채움)">🌐 한국어 자동번역</button><button class="btn btn-ghost btn-sm" onclick="pEditing=null;renderProducts()">취소</button><button class="btn btn-primary btn-sm" onclick="saveProduct('${id}')">저장</button></div><div class="fgrid two"><div class="fld"><label>브랜드 / 공급사</label><input id="f-brand" value="${esc(p?p.brand:'')}" placeholder="DAON COSMETIC"></div><div class="fld"><label>소재지</label><input id="f-origin" value="${esc(p?p.origin:'')}" placeholder="Daegu, Korea"></div></div><div class="fld"><label>카테고리</label><select id="f-cat">${MK_CATEGORIES.map(c=>`<option value="${c.id}" ${p&&p.cat===c.id?'selected':''}>${esc(c.name.ko)}</option>`).join('')}</select></div><div class="sect"><h4>제품명 (3개 국어)</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><input id="f-name-ko" value="${esc(g(nm,'ko'))}"></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><input id="f-name-vi" value="${esc(g(nm,'vi'))}"></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><input id="f-name-en" value="${esc(g(nm,'en'))}"></div></div></div><div class="sect"><h4>한 줄 소개 (3개 국어)</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><textarea id="f-tag-ko">${esc(g(tg,'ko'))}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><textarea id="f-tag-vi">${esc(g(tg,'vi'))}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><textarea id="f-tag-en">${esc(g(tg,'en'))}</textarea></div></div></div><div class="sect"><h4>대표 이미지</h4>${uploader('f-img', p?p.img:'', {hint:'목록·카드에 쓰이는 사진입니다. 끌어다 놓거나 파일을 선택하세요.'})}</div><div class="sect"><h4>갤러리 <span style="color:var(--adm-sub);font-size:11px"> 상세페이지 상단 슬라이드</span></h4><div class="gal-grid" id="gal-list"></div><div class="bar" style="margin:12px 0 0"><button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('gal-file').click()">사진 추가 (여러 장 선택 가능)</button><input type="file" id="gal-file" accept="image/*" multiple hidden onchange="galAdd(this)"><span class="hint" id="gal-info" style="margin:0">비워두면 대표 이미지만 사용됩니다.</span></div></div><div class="sect"><h4>대표 영상 <span style="color:var(--mk-muted);font-size:11px"> 선택 · 없으면 비워두세요</span></h4><div class="fld"><label>영상 URL</label><input id="f-video" value="${esc(p&&p.video?p.video:'')}" placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."><p class="hint">유튜브·Vimeo 주소를 그대로 붙여넣으면 됩니다. 비워두면 상세페이지에 영상 영역이 아예 표시되지 않습니다.</p></div></div><div class="sect"><h4>거래 조건 (3개 국어) <span style="color:var(--mk-lock);font-size:11px"> 인증 유통 파트너만 열람</span></h4><div style="margin:4px 0 6px;font-weight:600;font-size:13px">가격 / 공급가 <span style="color:var(--mk-accent);font-size:11px">USD 표기 권장</span></div><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><input id="f-price-ko" value="${esc(g(pr,'ko'))}" placeholder="US$ 4.20 / unit (FOB Busan)"></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><input id="f-price-vi" value="${esc(g(pr,'vi'))}"></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><input id="f-price-en" value="${esc(g(pr,'en'))}"></div></div><div style="margin:14px 0 6px;font-weight:600;font-size:13px">최소주문수량 MOQ</div><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><input id="f-moq-ko" value="${esc(g(mq,'ko'))}" placeholder="3,000 units"></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><input id="f-moq-vi" value="${esc(g(mq,'vi'))}"></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><input id="f-moq-en" value="${esc(g(mq,'en'))}"></div></div><div style="margin:14px 0 6px;font-weight:600;font-size:13px">납기</div><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><input id="f-lead-ko" value="${esc(g(ld,'ko'))}" placeholder="30 days"></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><input id="f-lead-vi" value="${esc(g(ld,'vi'))}"></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><input id="f-lead-en" value="${esc(g(ld,'en'))}"></div></div><div style="margin:14px 0 6px;font-weight:600;font-size:13px">공급 조건</div><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><input id="f-terms-ko" value="${esc(g(tm,'ko'))}" placeholder="OEM/ODM available"></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><input id="f-terms-vi" value="${esc(g(tm,'vi'))}"></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><input id="f-terms-en" value="${esc(g(tm,'en'))}"></div></div><label class="chk" style="margin-top:12px;display:inline-flex;gap:8px;align-items:center"><input type="checkbox" id="f-nego" ${p&&p.negotiable?'checked':''}> 가격 협의 가능 — 상세페이지 가격 옆에 <b>협의 가능</b> 배지 표시</label></div><div class="sect"><h4>브랜드 소개 (3개 국어)</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span>한국어</label><textarea id="f-story-ko">${esc(g(bs,'ko'))}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span>베트남어</label><textarea id="f-story-vi">${esc(g(bs,'vi'))}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span>영어</label><textarea id="f-story-en">${esc(g(bs,'en'))}</textarea></div></div></div><div class="sect"><h4>상세 페이지 구성</h4><div id="blk-list"></div><div class="bar" style="margin:12px 0 0"><button class="btn btn-primary btn-sm" onclick="document.getElementById('detail-file').click()">상세페이지 통이미지 올리기 (여러 장 선택 가능)</button><input type="file" id="detail-file" accept="image/*" multiple hidden onchange="detailUpload(this)"><button class="btn btn-ghost btn-sm" onclick="addBlock('p')">+ 문단</button><button class="btn btn-ghost btn-sm" onclick="addBlock('img')">+ 이미지</button><button class="btn btn-ghost btn-sm" onclick="addBlock('video')">+ 영상</button></div><p class="hint" id="detail-info" style="margin:8px 0 0">세로로 긴 상세페이지 이미지를 그대로 올리세요. 가로 해상도는 유지하고 세로만 자동으로 나눠 담습니다.<br>상세페이지가 <b>여러 장으로 나뉘어 있으면 한 번에 모두 선택</b>하세요 — 파일명 순서(1, 2, 3 …)대로 이어 붙입니다.</p></div><div class="sect"><h4>노출 설정</h4><div class="fgrid"><div class="fld"><label>문의 수</label><input id="f-inq" type="number" value="${p?p.inquiries:0}"></div><div class="fld"><label>관심 수</label><input id="f-views" type="number" value="${p?p.views:0}"></div><div class="fld"><label>등록일</label><input id="f-date" value="${esc(p?p.createdAt:today())}"></div></div><div style="display:flex;gap:22px;margin-top:4px"><label class="chk"><input type="checkbox" id="f-featured" ${p&&p.featured?'checked':''}> 추천 제품 (홈 상단 노출)</label><label class="chk"><input type="checkbox" id="f-new" ${p&&p.isNew?'checked':''}> 신규 배지 표시</label></div></div><div class="bar" style="margin-top:22px"><span class="grow"></span><button class="btn btn-ghost" onclick="pEditing=null;renderProducts()">취소</button><button class="btn btn-primary" onclick="saveProduct('${id}')">저장</button></div></div>`;
}

/* 상세 블록 편집기 */
function renderBlocks(){
  const el = document.getElementById('blk-list');
  if(!el) return;
  el.innerHTML = pBlocks.length ? pBlocks.map((b,i)=>{
    const head = `<div class="blk-head"><b>${b.type==='p'?'문단':b.type==='img'?(b.seq?'상세페이지 조각':'이미지'):'영상'}</b><div class="acts"><button onclick="moveBlock(${i},-1)" ${i===0?'disabled':''}>↑</button><button onclick="moveBlock(${i},1)" ${i===pBlocks.length-1?'disabled':''}>↓</button><button onclick="delBlock(${i})">삭제</button></div></div>`;
    if(b.type==='p'){
      const tx = b.text||{};
      return `<div class="blk">${head}<div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span></label><textarea oninput="pBlocks[${i}].text.ko=this.value">${esc(tx.ko||'')}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span></label><textarea oninput="pBlocks[${i}].text.vi=this.value">${esc(tx.vi||'')}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span></label><textarea oninput="pBlocks[${i}].text.en=this.value">${esc(tx.en||'')}</textarea></div></div></div>`;
    }
    if(b.type==='img'){
      return `<div class="blk">${head}${uploader('blk-'+i, b.src||'', {hint:'상세페이지 본문에 들어갈 이미지입니다.'})}</div>`;
    }
    return `<div class="blk">${head}
      <div class="fld"><label>영상 URL (유튜브 · Vimeo)</label><input value="${esc(b.src||'')}" oninput="pBlocks[${i}].src=this.value"
        placeholder="https://www.youtube.com/watch?v=..."></div></div>`;
  }).join('') : `<p class="note" style="margin:0">아직 블록이 없습니다. 아래 버튼으로 문단·이미지·영상을 추가하세요.</p>`;
}
/* 업로드 위젯이 값을 바꾸면 해당 상태에 반영한다 (상세 블록의 이미지) */
function uplOnChange(id){
  const m = String(id).match(/^blk-(\d+)$/);
  if(m && pBlocks[+m[1]]) pBlocks[+m[1]].src = document.getElementById(id).value;
}

/* ---------- 상세페이지 통이미지 업로드 ----------
   한국식 상세페이지(가로 850 · 세로 17000 같은 것)를 그대로 올리면
   가로는 유지한 채 세로만 잘라 여러 이미지 블록으로 넣는다.
   화면에서는 이어 붙어 보이므로 사용자에겐 한 장이다. */
async function detailUpload(input){
  /* 상세페이지가 1장으로 안 끝나는 경우가 많다(가로 848 × 세로 1만 이상이 3장 등).
     여러 장을 한 번에 받아 파일명 순서대로 이어 붙인다. */
  const files = [...input.files];
  input.value = '';
  if(!files.length) return;

  /* 파일명 자연 정렬 — 1, 2, 10 이 1, 10, 2 로 가지 않게 숫자 비교를 켠다 */
  files.sort((a,b)=>a.name.localeCompare(b.name, 'ko', {numeric:true, sensitivity:'base'}));

  const info = document.getElementById('detail-info');
  const say  = m => { if(info) info.innerHTML = m; };
  const many = files.length > 1;

  let added = 0, bytes = 0;
  const done = [];

  for(let f = 0; f < files.length; f++){
    const file = files[f];
    const label = many ? `[${f+1}/${files.length}] ${esc(file.name)} · ` : '';
    say(`${label}이미지를 읽는 중…`);
    try{
      const r = await MkImg.saveDetail(file, (i,n)=>say(`${label}분할 처리 중… ${i}/${n}`));
      /* seq = 분할된 조각. 상세페이지에서 틈 없이 이어 붙인다.
         w/h 를 같이 저장해 지연 로딩 중 화면이 밀리지 않게 한다.
         파일이 여러 장이어도 전부 seq 라 화면에서는 한 장으로 이어진다. */
      r.refs.forEach((ref,i) => pBlocks.push(
        r.sliced ? { type:'img', src:ref, seq:true, w:r.sizes[i].w, h:r.sizes[i].h }
                 : { type:'img', src:ref }));
      added += r.count; bytes += r.bytes;
      done.push(`${esc(file.name)} ${r.originW}×${r.originH} → ${r.count}조각`);
      renderBlocks();                       // 한 장 끝날 때마다 목록에 바로 반영
    }catch(e){
      /* 한 장이 실패해도 나머지는 계속 올린다 — 처음부터 다시 하게 만들지 않는다 */
      done.push(`<span style="color:var(--mk-danger)">${esc(file.name)} 실패 — ${esc(e.message||'')}</span>`);
    }
  }

  say(`총 <b>${added}조각</b>을 넣었습니다 (${fmtBytes(bytes)})<br>` + done.join('<br>')
      + '<br><span style="color:var(--adm-sub)">순서가 다르면 블록의 ↑ ↓ 로 옮기세요.</span>');
  toastA(`상세페이지 ${added}장 추가됨`);
}
function addBlock(type){
  pBlocks.push(type==='p' ? {type:'p', text:{vi:'',ko:'',en:''}} : {type, src:''});
  renderBlocks();
}
function delBlock(i){ pBlocks.splice(i,1); renderBlocks(); }
function moveBlock(i,d){
  const j=i+d; if(j<0||j>=pBlocks.length) return;
  [pBlocks[i],pBlocks[j]]=[pBlocks[j],pBlocks[i]]; renderBlocks();
}

function saveProduct(id){
  const name = tri('f-name');
  if(!name.ko && !name.vi && !name.en){ toastA('제품명을 입력하세요'); return; }
  if(!av('f-img') && !pGallery.length){ toastA('대표 이미지를 올려주세요'); return; }
  const gallery = pGallery.filter(Boolean);
  const p = {
    id: id || Admin.newProductId(),
    cat: av('f-cat'),
    featured: ac('f-featured'), isNew: ac('f-new'),
    createdAt: av('f-date') || today(),
    brand: av('f-brand'), origin: av('f-origin'),
    name, tagline: tri('f-tag'),
    img: av('f-img') || gallery[0],
    gallery: gallery.length ? gallery : [av('f-img')],
    video: av('f-video'),
    inquiries: Number(av('f-inq'))||0, views: Number(av('f-views'))||0,
    price: tri('f-price'), moq: tri('f-moq'), lead: tri('f-lead'), terms: tri('f-terms'), negotiable: ac('f-nego'),
    brandStory: tri('f-story'),
    detail: pBlocks.filter(b=> b.type==='p' ? (b.text.ko||b.text.vi||b.text.en) : b.src ),
  };
  toastA(id ? '제품을 저장하는 중…' : '제품을 등록하는 중…');
  admDo(Admin.upsertProduct(p));
}

/* ============================================================
   4. 칼럼 CRUD
   ============================================================ */
let cEditing = null;

function renderColumns(){
  const el = document.getElementById('tab-columns');
  if(cEditing !== null){
    /* 이 칼럼에 달린 FAQ를 작업 사본으로 뜬다 — 저장 버튼을 누르기 전엔 원본을 건드리지 않는다 */
    cFaqs = (typeof MK_FAQ !== 'undefined' ? MK_FAQ : [])
      .filter(f => f.page === cEditing)
      .sort((a,b)=>(a.sort||0)-(b.sort||0))
      .map(f => ({ id:f.id, q:{...(f.q||{})}, a:{...(f.a||{})} }));
    cFaqsDeleted = [];
    el.innerHTML = columnForm(cEditing);
    const col = cEditing ? MK_COLUMNS.find(c=>c.id===cEditing) : null;
    initColumnEditors(col ? col.body : {});
    renderColFaqs();
    return;
  }
  el.innerHTML = `
    <div class="card"><p class="note">홈과 칼럼 페이지에 노출되는 글입니다. 본문은 HTML을 그대로 쓸 수 있습니다 (<code>&lt;p&gt;</code>, <code>&lt;b&gt;</code> 등).</p><div class="bar"><span class="grow"></span><button class="btn btn-primary btn-sm" onclick="cEditing='';renderColumns()">+ 새 칼럼 작성</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:76px">이미지</th><th>제목</th><th>분류</th><th>발행일</th><th style="width:120px"></th></tr></thead><tbody>${MK_COLUMNS.length ? MK_COLUMNS.map(c=>`
        <tr class="row-hover"><td><img class="thumb-sm" src="${esc(imgSrc(c.img))}" alt=""></td><td><b>${esc(c.title.ko||c.title.vi)}</b><div class="sub">${esc(c.id)}</div></td><td>${esc(c.cat.ko||c.cat.vi)}</td><td>${esc(c.date)}</td><td><button class="btn btn-ghost btn-sm" onclick="cEditing='${c.id}';renderColumns()">수정</button><button class="btn btn-ghost btn-sm" onclick="if(confirm('삭제할까요?')){admDo(Admin.deleteColumn('${c.id}'));}">삭제</button></td></tr>`).join('') : `<tr class="empty-row"><td colspan="5">칼럼이 없습니다</td></tr>`}
      </tbody></table></div></div>`;
}

function columnForm(id){
  const c = id ? mkColumn(id) : null;
  /* 언어 구분 없이 한 벌만 쓴다 — ko 키에 저장하고, 프런트·굽기의 언어 폴백이 모든 페이지에 그대로 내보낸다.
     기존 번역본이 있는 칼럼은 ko 우선으로 보여준다. */
  const g = o => (o && (o.ko || o.vi || o.en)) || '';
  const ti=c?c.title:{}, ca=c?c.cat:{}, ex=c?c.excerpt:{};
  return `
    <div class="card"><div class="bar"><h3 style="margin:0">${c?'칼럼 수정':'새 칼럼 작성'}</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="cEditing=null;renderColumns()">취소</button><button class="btn btn-primary btn-sm" onclick="saveColumn('${id}')">저장</button></div><div class="sect" style="border-top:0;margin-top:0;padding-top:0"><h4>대표 이미지</h4>${uploader('c-img', c?c.img:'', {hint:'칼럼 카드와 상세 상단에 쓰입니다. 16:9 비율을 권장합니다.'})}</div><div class="fgrid two"><div class="fld"><label>발행일</label><input id="c-date" value="${esc(c?c.date:today())}"></div><div class="fld"><label>분류</label><input id="c-cat-ko" value="${esc(g(ca))}" placeholder="트렌드"></div></div><div class="fld"><label>제목</label><input id="c-title-ko" value="${esc(g(ti))}" placeholder="글 제목"></div><div class="fld"><label>요약 (목록 카드에 표시)</label><textarea id="c-ex-ko" rows="3">${esc(g(ex))}</textarea></div><div class="sect"><h4>SEO · 주소</h4><div class="fld"><label>주소 슬러그 (영문) — <code>columns/슬러그.html</code> 로 구워집니다</label><input id="c-slug" value="${esc(c&&c.slug?c.slug:'')}" placeholder="vietnam-import-guide"><p class="hint">영문 소문자·숫자·하이픈만. 비워두면 <code>${esc(id||'c#')}</code> 같은 번호 주소가 됩니다. 발행 후에는 바꾸지 않는 것이 좋습니다(주소가 바뀌면 기존 링크가 깨짐).</p></div><div class="fgrid two"><div class="fld"><label>SEO 제목 (검색결과·공유 카드용, 비우면 제목 사용)</label><input id="c-seo-title" value="${esc(c&&c.seoTitle?c.seoTitle:'')}" placeholder="예: 베트남 첫 수입 가이드 — MOQ·결제조건 총정리"></div><div class="fld"><label>SEO 설명 (비우면 요약 사용, 100~155자 권장)</label><input id="c-seo-desc" value="${esc(c&&c.seoDesc?c.seoDesc:'')}" placeholder="검색결과에 표시될 설명"></div></div></div><div class="sect"><h4>본문 (HTML)<button type="button" class="btn btn-primary btn-sm" style="margin-left:10px" onclick="bodyInsertImage('c-body-ko')">📷 사진 넣기</button><button type="button" class="btn btn-ghost btn-sm" style="margin-left:6px" onclick="rteToggleSrc('c-body-ko',this)">에디터로</button></h4><div class="fld"><div class="rte hidden" id="rte-c-body-ko"></div><textarea id="src-c-body-ko" rows="22" style="width:100%;font-family:monospace;font-size:13px" placeholder="<p>HTML을 직접 붙여넣으세요</p>"></textarea><p class="hint">게시판처럼 HTML을 그대로 붙여넣으면 됩니다 (<code>&lt;p&gt;</code>, <code>&lt;h2&gt;</code>, <code>&lt;table&gt;</code> 등 원본 유지). 언어 구분 없이 한 벌만 쓰면 모든 언어 페이지에 그대로 나갑니다. 사진은 <b>📷 사진 넣기</b>로 올리면 커서 위치에 <code>&lt;img&gt;</code> 태그가 들어갑니다 — 본문에 <code>images/…</code> 같은 컴퓨터 경로를 직접 쓰면 사이트에 파일이 없어 깨집니다. 서식 툴바가 필요하면 <b>에디터로</b> 버튼으로 전환하세요 — 단, 표 등 에디터가 지원하지 않는 태그는 지워질 수 있습니다.</p></div></div><div class="sect"><h4>이 칼럼의 FAQ <span style="color:var(--adm-sub);font-size:11px"> 본문 아래에 붙고, 검색·AI용 FAQPage 스키마로도 나갑니다</span></h4><div id="cfaq-list"></div><div class="bar" style="margin:12px 0 0"><button type="button" class="btn btn-ghost btn-sm" onclick="addColFaq()">+ 질문 추가</button><span class="hint" style="margin:0">칼럼과 함께 저장됩니다. 메인페이지 FAQ는 FAQ 탭에서 관리하세요.</span></div></div><div class="bar" style="margin-top:22px"><span class="grow"></span><button class="btn btn-ghost" onclick="cEditing=null;renderColumns()">취소</button><button class="btn btn-primary" onclick="saveColumn('${id}')">저장</button></div></div>`;
}

/* ---------- 칼럼 안 FAQ 편집기 ----------
   FAQ 탭의 '위치 선택'은 어느 칼럼인지 찾기 번거로워서(사용자 지시로 폐기),
   칼럼을 쓰는 화면에서 바로 붙이게 했다. 저장은 saveColumn 이 칼럼과 함께 처리한다. */
let cFaqs = [], cFaqsDeleted = [];

function renderColFaqs(){
  const el = document.getElementById('cfaq-list');
  if(!el) return;
  el.innerHTML = cFaqs.length ? cFaqs.map((f,i)=>`
    <div class="cfaq" data-i="${i}"><div class="bar" style="margin-bottom:10px"><b style="font-size:13px">Q${i+1}</b><span class="grow"></span><button type="button" class="btn btn-ghost btn-sm" onclick="delColFaq(${i})">삭제</button></div><div class="fld"><label>질문</label><input id="cf${i}-q-ko" value="${esc(f.q.ko||f.q.vi||f.q.en||'')}"></div><div class="fld" style="margin-bottom:0"><label>답변</label><textarea id="cf${i}-a-ko" rows="3">${esc(f.a.ko||f.a.vi||f.a.en||'')}</textarea></div></div>`).join('')
    : `<p class="hint" style="margin:0">아직 질문이 없습니다. 유통 파트너가 이 글을 읽고 물어볼 만한 것을 넣어주세요.</p>`;
}
/* 화면의 입력값을 작업 사본으로 되읽는다 — 추가·삭제로 다시 그리기 전에 호출
   언어 구분 없이 ko 키 하나만 쓴다 (표시할 때 옛 vi/en 번역을 폴백으로 보여줬으므로 그 값이 ko 로 이어진다) */
function syncColFaqs(){
  cFaqs.forEach((f,i)=>{
    const q=document.getElementById(`cf${i}-q-ko`), a=document.getElementById(`cf${i}-a-ko`);
    if(q) f.q={ ko:q.value.trim() };
    if(a) f.a={ ko:a.value.trim() };
  });
}
function addColFaq(){ syncColFaqs(); cFaqs.push({ id:null, q:{}, a:{} }); renderColFaqs(); }
function delColFaq(i){
  syncColFaqs();
  const [rm] = cFaqs.splice(i,1);
  if(rm && rm.id) cFaqsDeleted.push(rm.id);
  renderColFaqs();
}

function saveColumn(id){
  /* 언어 구분 없이 ko 키 한 벌로 저장 — 프런트·굽기의 언어 폴백이 전 언어 페이지에 내보낸다 */
  const title = { ko: av('c-title-ko') };
  if(!title.ko){ toastA('제목을 입력하세요'); return; }
  const slug = slugify(av('c-slug'));
  if(slug && MK_COLUMNS.some(c=>c.slug===slug && c.id!==id)){ toastA('이미 다른 칼럼이 쓰는 슬러그입니다'); return; }
  toastA(id ? '칼럼을 저장하는 중…' : '칼럼을 발행하는 중…');

  const colId = id || Admin.newColumnId();

  /* 칼럼 + 이 칼럼의 FAQ를 한 흐름으로 저장한다.
     새 칼럼이면 FAQ의 page 에 방금 딴 colId 가 들어간다. */
  syncColFaqs();
  const faqJobs = async () => {
    for(const fid of cFaqsDeleted) await Admin.deleteFaq(fid);
    for(let i=0;i<cFaqs.length;i++){
      const f = cFaqs[i];
      if(!f.q.ko && !f.q.vi && !f.q.en) continue;          // 빈 질문은 버린다
      await Admin.upsertFaq({ id: f.id || Admin.newFaqId(), page: colId,
        q: f.q, a: f.a, sort: i+1, published: true });
    }
  };

  admDo((async ()=>{
    await Admin.upsertColumn({
      id: colId,
      cat: { ko: av('c-cat-ko') }, date: av('c-date')||today(), img: av('c-img'),
      title, excerpt: { ko: av('c-ex-ko') }, body: { ko: cleanBodyHtml(rteGet('c-body-ko')) },
      slug, seoTitle: av('c-seo-title'), seoDesc: av('c-seo-desc'),
    });
    await faqJobs();
  })());
}

/* ============================================================
   4-B. FAQ 관리 (메인페이지 자주 묻는 질문)
   ============================================================ */
let fEditing = null;

function renderFaqTab(){
  const el = document.getElementById('tab-faq');
  if(!el) return;
  if(fEditing !== null){ el.innerHTML = faqForm(fEditing); return; }
  /* 이 탭은 메인페이지 FAQ 전용 — 칼럼 FAQ는 그 칼럼을 쓰는 화면에서 함께 편집한다 */
  const list = (typeof MK_FAQ !== 'undefined' ? [...MK_FAQ] : [])
    .filter(f => (f.page || 'home') === 'home')
    .sort((a,b)=>(a.sort||0)-(b.sort||0));
  const colCnt = (typeof MK_FAQ !== 'undefined' ? MK_FAQ : []).filter(f => (f.page||'home') !== 'home').length;
  el.innerHTML = `
    <div class="card"><p class="note">메인페이지 하단 <b>자주 묻는 질문</b>입니다.
      검색엔진과 AI(FAQPage 스키마)에도 전달되므로 유통 파트너가 실제로 묻는 질문 위주로 관리하세요.
      ${colCnt?`칼럼에 달린 FAQ ${colCnt}개는 <b>칼럼 탭 → 해당 칼럼 수정</b> 화면에서 편집합니다.`:'칼럼별 FAQ는 <b>칼럼 수정 화면</b>에서 함께 작성합니다.'}
      수정 후 배포 전에는 <code>node bake.js</code>를 다시 실행해야 스키마에 반영됩니다.</p><div class="bar"><span class="grow"></span><button class="btn btn-primary btn-sm" onclick="fEditing='';renderFaqTab()">+ 새 질문</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:64px">순서</th><th>질문</th><th style="width:80px">노출</th><th style="width:120px"></th></tr></thead><tbody>${list.length ? list.map(f=>`
        <tr class="row-hover"><td>${f.sort||0}</td><td><b>${esc((f.q&&(f.q.ko||f.q.vi))||'')}</b><div class="sub">${esc((f.q&&f.q.vi)||'')}</div></td><td>${f.published!==false?'노출':'<span style="color:#B02A37">숨김</span>'}</td><td><button class="btn btn-ghost btn-sm" onclick="fEditing='${f.id}';renderFaqTab()">수정</button><button class="btn btn-ghost btn-sm" onclick="if(confirm('삭제할까요?')){admDo(Admin.deleteFaq('${f.id}'));}">삭제</button></td></tr>`).join('') : `<tr class="empty-row"><td colspan="4">FAQ가 없습니다</td></tr>`}
      </tbody></table></div></div>`;
}

/* FAQ가 붙을 위치 — 'home' 이거나 칼럼 id */
function faqPageOptions(sel){
  const cur = sel || 'home';
  const cols = (typeof MK_COLUMNS !== 'undefined' ? MK_COLUMNS : []);
  return `<option value="home" ${cur==='home'?'selected':''}>메인페이지</option>` +
    cols.map(c=>`<option value="${c.id}" ${cur===c.id?'selected':''}>칼럼 · ${esc(L(c.title)||c.id)}</option>`).join('');
}
function faqPageLabel(page){
  const p = page || 'home';
  if(p === 'home') return '<b>메인페이지</b>';
  const c = (typeof MK_COLUMNS !== 'undefined' ? MK_COLUMNS : []).find(x=>x.id===p);
  return c ? `칼럼 · <span class="sub" style="display:inline">${esc(L(c.title))}</span>`
           : `<span style="color:#B02A37">없는 칼럼 (${esc(p)})</span>`;
}

function faqForm(id){
  const f = id ? (MK_FAQ||[]).find(x=>x.id===id) : null;
  const g = (o,k)=> (o && o[k]) ? o[k] : '';
  const q = f?f.q:{}, a = f?f.a:{};
  return `
    <div class="card"><div class="bar"><h3 style="margin:0">${f?'질문 수정':'새 질문'}</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="autoTranslate(this,['q-q','q-a'],false)" title="한국어를 베트남어·영어로 자동 번역 (빈 칸만 채움)">🌐 한국어 자동번역</button><button class="btn btn-ghost btn-sm" onclick="fEditing=null;renderFaqTab()">취소</button><button class="btn btn-primary btn-sm" onclick="saveFaq('${id}')">저장</button></div><div class="fgrid two"><div class="fld"><label>순서 (작을수록 위)</label><input id="q-sort" type="number" value="${f?(f.sort||0):((typeof MK_FAQ!=='undefined'?MK_FAQ.length:0)+1)}"></div><div class="fld"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="q-pub" ${!f||f.published!==false?'checked':''} style="width:auto"> 사이트에 노출</label></div></div><div class="sect"><h4>질문</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span></label><textarea id="q-q-ko">${esc(g(q,'ko'))}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span></label><textarea id="q-q-vi">${esc(g(q,'vi'))}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span></label><textarea id="q-q-en">${esc(g(q,'en'))}</textarea></div></div></div><div class="sect"><h4>답변</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span></label><textarea id="q-a-ko" rows="4">${esc(g(a,'ko'))}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span></label><textarea id="q-a-vi" rows="4">${esc(g(a,'vi'))}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span></label><textarea id="q-a-en" rows="4">${esc(g(a,'en'))}</textarea></div></div></div><div class="bar" style="margin-top:22px"><span class="grow"></span><button class="btn btn-ghost" onclick="fEditing=null;renderFaqTab()">취소</button><button class="btn btn-primary" onclick="saveFaq('${id}')">저장</button></div></div>`;
}

function saveFaq(id){
  const q = tri('q-q'), a = tri('q-a');
  if(!q.ko && !q.vi && !q.en){ toastA('질문을 입력하세요'); return; }
  toastA('저장하는 중…');
  admDo(Admin.upsertFaq({
    id: id || Admin.newFaqId(), page:'home',
    q, a, sort:+av('q-sort')||0, published:ac('q-pub'),
  }));
}

/* ============================================================
   4-C. 공지사항 (고객센터 게시판)
   신제품 등록·업데이트 소식. 제품 등록 시 자동 발행은 아직 안 붙임(수동 작성).
   ============================================================ */
let nEditing = null;

function renderNotices(){
  const el = document.getElementById('tab-notices');
  if(!el) return;
  if(nEditing !== null){ el.innerHTML = noticeForm(nEditing); return; }
  const list = (typeof MK_NOTICES !== 'undefined' ? [...MK_NOTICES] : [])
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  el.innerHTML = `
    <div class="card"><p class="note">고객센터 <b>공지사항</b> 게시판입니다.
      신제품 등록, 기능 업데이트 소식을 여기에 올리세요. 3개 국어로 노출됩니다.</p><div class="bar"><span class="grow"></span><button class="btn btn-primary btn-sm" onclick="nEditing='';renderNotices()">+ 새 공지</button></div><div class="tbl-wrap"><table><thead><tr><th style="width:110px">날짜</th><th>제목</th><th style="width:80px">노출</th><th style="width:120px"></th></tr></thead><tbody>${list.length ? list.map(n=>`
        <tr class="row-hover"><td>${esc(n.date)}</td><td><b>${esc((n.title&&(n.title.ko||n.title.vi))||'')}</b><div class="sub">${esc((n.title&&n.title.vi)||'')}</div></td><td>${n.published!==false?'노출':'<span style="color:#B02A37">숨김</span>'}</td><td><button class="btn btn-ghost btn-sm" onclick="nEditing='${n.id}';renderNotices()">수정</button><button class="btn btn-ghost btn-sm" onclick="if(confirm('삭제할까요?')){admDo(Admin.deleteNotice('${n.id}'));}">삭제</button></td></tr>`).join('') : `<tr class="empty-row"><td colspan="4">공지가 없습니다</td></tr>`}
      </tbody></table></div></div>`;
}

function noticeForm(id){
  const n = id ? (MK_NOTICES||[]).find(x=>x.id===id) : null;
  const g = (o,k)=> (o && o[k]) ? o[k] : '';
  const ti = n?n.title:{}, bo = n?n.body:{};
  return `
    <div class="card"><div class="bar"><h3 style="margin:0">${n?'공지 수정':'새 공지'}</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="autoTranslate(this,['n-t','n-b'],false)" title="한국어를 베트남어·영어로 자동 번역 (빈 칸만 채움)">🌐 한국어 자동번역</button><button class="btn btn-ghost btn-sm" onclick="nEditing=null;renderNotices()">취소</button><button class="btn btn-primary btn-sm" onclick="saveNotice('${id}')">저장</button></div><div class="fgrid"><div class="fld"><label>날짜</label><input id="n-date" value="${esc(n?n.date:today())}"></div><div class="fld"><label>구분</label><select id="n-cat">${[['notice','안내'],['new','신제품'],['update','업데이트'],['event','이벤트']].map(([v,l])=>`<option value="${v}" ${n&&n.cat===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="fld"><label style="display:flex;align-items:center;gap:8px;margin-top:28px"><input type="checkbox" id="n-pin" ${n&&n.pinned?'checked':''} style="width:auto"> 상단 고정 (TOP)</label><label style="display:flex;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="n-pub" ${!n||n.published!==false?'checked':''} style="width:auto"> 사이트에 노출</label></div></div><div class="sect"><h4>제목</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span></label><input id="n-t-ko" value="${esc(g(ti,'ko'))}"></div><div class="fld"><label><span class="lang-tag">VI</span></label><input id="n-t-vi" value="${esc(g(ti,'vi'))}"></div><div class="fld"><label><span class="lang-tag">EN</span></label><input id="n-t-en" value="${esc(g(ti,'en'))}"></div></div></div><div class="sect"><h4>본문 (HTML 가능)</h4><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span></label><textarea id="n-b-ko" rows="6">${esc(g(bo,'ko'))}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span></label><textarea id="n-b-vi" rows="6">${esc(g(bo,'vi'))}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span></label><textarea id="n-b-en" rows="6">${esc(g(bo,'en'))}</textarea></div></div><p class="hint">&lt;p&gt;문단&lt;/p&gt; 태그로 감싸면 됩니다. 한국어만 쓰고 자동번역을 눌러도 됩니다.</p></div><div class="bar" style="margin-top:22px"><span class="grow"></span><button class="btn btn-ghost" onclick="nEditing=null;renderNotices()">취소</button><button class="btn btn-primary" onclick="saveNotice('${id}')">저장</button></div></div>`;
}

function saveNotice(id){
  const title = tri('n-t');
  if(!title.ko && !title.vi && !title.en){ toastA('제목을 입력하세요'); return; }
  toastA('저장하는 중…');
  admDo(Admin.upsertNotice({
    id: id || Admin.newNoticeId(),
    title, body: tri('n-b'),
    date: av('n-date') || today(), published: ac('n-pub'),
    cat: av('n-cat') || 'notice', pinned: ac('n-pin'),
  }));
}

/* ============================================================
   5. 설정 · 내보내기
   ============================================================ */
/* ============================================================
   카피 수정 — 사이트 문구를 코드 없이 고친다
   ============================================================ */
let cpSrc = 'ui', cpSearch = '', cpOnlyEdited = false, cpGroup = 'all';
let cpDraft = {};          // 저장 전 편집분 { path: {vi,ko,en} }
let cpOpen = {};           // 펼쳐 놓은 항목
let cpTouched = {};        // 어느 언어 칸을 손댔는지 { path: {ko:true,…} } — 저장 때 번역 누락 경고에 쓴다

/* 지금 화면에서 쓰는 값 = 저장분 + 편집분 */
function cpValue(f){
  const saved = (window.MK_COPY_OVERRIDE || {})[f.path] || {};
  const draft = cpDraft[f.path] || {};
  return { ...f.val, ...saved, ...draft };
}
function cpIsEdited(f){
  const o = (window.MK_COPY_OVERRIDE || {})[f.path], d = cpDraft[f.path];
  return !!(o || d);
}

function cpEdit(path, lang, v){
  const f = mkCopyFields().find(x=>x.path===path);
  if(!f) return;
  cpDraft[path] = { ...cpValue(f), [lang]: v };
  (cpTouched[path] = cpTouched[path] || {})[lang] = true;
  document.getElementById('cp-dirty').textContent = Object.keys(cpDraft).length + '건 편집됨';
  document.getElementById('cp-save').disabled = false;
}

/* 한국어를 베트남어·영어로 옮겨 두 칸을 채운다.
   ⚠ 이미 들어 있는 값을 덮어쓴다. 한국어를 고쳤으면 옛 번역은 더 이상 맞지 않으니까.
     (제품 폼의 자동번역 버튼은 빈 칸만 채우는데, 여기서는 그러면 아무것도 안 바뀐다) */
async function cpTranslate(path, btn, quiet){
  const f = mkCopyFields().find(x=>x.path===path);
  if(!f) return;
  const v = cpValue(f);
  const ko = String(v.ko || '').trim();
  if(!ko) return toastA('한국어 칸이 비어 있습니다');
  if(v.vi === undefined && v.en === undefined) return toastA('이 문구는 한국어만 씁니다');

  const orig = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = '번역 중…'; }
  try{
    const { vi, en } = await mkTranslateKo(ko);
    if(!vi && !en) throw new Error('번역을 받지 못했습니다');
    const next = { ...v };
    if(v.vi !== undefined && vi) next.vi = vi;
    if(v.en !== undefined && en) next.en = en;
    cpDraft[path] = next;
    cpTouched[path] = { ...(cpTouched[path]||{}), vi:true, en:true };
    document.getElementById('cp-dirty').textContent = Object.keys(cpDraft).length + '건 편집됨';
    document.getElementById('cp-save').disabled = false;
    if(!quiet){ cpRefreshList(); toastA('번역했습니다 — 저장 전에 확인하세요'); }
  }catch(e){
    toastA('번역 실패: ' + (e.message || e));
  }
  if(btn){ btn.disabled = false; btn.textContent = orig; }
}

/* 한국어만 고치고 저장하면 베트남어·영어는 옛 문구로 남는다.
   그러면 언어마다 다른 말을 하게 되는데, 유통 파트너 대부분이 베트남 사람이라 이게 제일 나쁘다.
   저장 직전에 그런 항목을 찾아 번역할지 물어본다. */
function cpKoOnlyEdits(){
  const all = mkCopyFields();
  return Object.keys(cpDraft).filter(p=>{
    const t = cpTouched[p] || {};
    if(!t.ko || t.vi || t.en) return false;
    const f = all.find(x=>x.path===p);
    return f && (f.val.vi !== undefined || f.val.en !== undefined);
  });
}

async function cpSave(){
  const koOnly = cpKoOnlyEdits();
  if(koOnly.length){
    const ok = confirm(
      `한국어만 고친 문구가 ${koOnly.length}건 있습니다.\n` +
      `이대로 저장하면 베트남어·영어는 옛 문구로 남습니다.\n\n` +
      `확인 = 두 언어를 지금 번역해서 함께 저장\n취소 = 한국어만 저장`);
    if(ok){
      const btn = document.getElementById('cp-save');
      const orig = btn ? btn.textContent : '';
      if(btn){ btn.disabled = true; btn.textContent = `번역 중… 0/${koOnly.length}`; }
      for(let i = 0; i < koOnly.length; i++){
        await cpTranslate(koOnly[i], null, true);
        if(btn) btn.textContent = `번역 중… ${i+1}/${koOnly.length}`;
      }
      if(btn){ btn.disabled = false; btn.textContent = orig; }
    }
  }

  const map = { ...(window.MK_COPY_OVERRIDE || {}) };
  Object.keys(cpDraft).forEach(p=>{ map[p] = cpDraft[p]; });
  try{
    await Admin.saveCopy(map);
    cpDraft = {}; cpTouched = {};
    toastA('사이트에 반영되었습니다');
    renderCopy();
    if(typeof applyI18n === 'function') applyI18n();
  }catch(e){ alert(e.message); }
}

/* 한 항목만 원래 문구로 되돌린다 */
async function cpReset(path){
  delete cpDraft[path];
  const map = { ...(window.MK_COPY_OVERRIDE || {}) };
  if(map[path]){
    delete map[path];
    if(!confirm('이 문구를 원래대로 되돌릴까요?\n(저장된 수정이 지워지고 화면을 새로 고쳐야 원문이 보입니다)')) return;
    try{ await Admin.saveCopy(map); }catch(e){ return alert(e.message); }
    toastA('되돌렸습니다 — 새로고침하면 원문이 보입니다');
  }
  renderCopy();
}

function cpToggle(path){
  cpOpen[path] = !cpOpen[path];
  cpRefreshList();
}

/* 검색어가 바뀔 때 목록만 갈아 끼운다.
   ⚠ 예전엔 여기서 renderCopy() 로 화면 전체를 다시 그렸는데,
     그러면 입력창 DOM 자체가 새로 만들어져 한 글자 칠 때마다 포커스가 날아갔다.
     검색창은 절대 건드리지 않는다. */
function cpFind(v){
  cpSearch = v;
  const browse = document.getElementById('cp-browse');
  if(browse) browse.hidden = cpSearch.trim().length > 0;
  const clr = document.getElementById('cp-clear');
  if(clr) clr.hidden = cpSearch.trim().length === 0;
  cpRefreshList();
}

function cpClearSearch(){
  cpSearch = '';
  const inp = document.querySelector('.cp-find');
  if(inp){ inp.value = ''; inp.focus(); }
  cpFind('');
}

/* 목록과 개수 표시만 다시 그린다 */
function cpRefreshList(){
  const box = document.getElementById('cp-list');
  if(!box) return renderCopy();
  const { body, count, editedCnt } = cpBuildList();
  box.innerHTML = body;
  const cnt = document.getElementById('cp-count');
  if(cnt) cnt.innerHTML = `${count}개${editedCnt?` · 수정 <b>${editedCnt}</b>건`:''}`;
  const found = document.getElementById('cp-found');
  if(found){
    found.hidden = !cpSearch.trim();
    found.innerHTML = `전체에서 <b>${count}개</b> 찾았습니다.`;
  }
}

function cpBuildList(){
  const all = mkCopyFields();
  const q = cpSearch.trim().toLowerCase();
  const searching = q.length > 0;

  /* 검색 중이면 구역·소스 상관없이 전체에서 찾는다.
     사람은 "사이트에서 본 그 문구"로 찾지, 어느 페이지 소속인지 모른다. */
  const list = all.filter(f=>{
    if(cpOnlyEdited && !cpIsEdited(f)) return false;
    if(searching){
      const v = cpValue(f);
      return [f.label, v.ko, v.vi, v.en].map(x=>String(x||'').toLowerCase()).join(' ').includes(q);
    }
    if(f.src !== cpSrc) return false;
    if(cpGroup !== 'all' && mkCopyGroup(f) !== cpGroup) return false;
    return true;
  });
  const editedCnt = all.filter(cpIsEdited).length;

  const one = f => {
    const v = cpValue(f);
    const on = cpIsEdited(f);
    const open = cpOpen[f.path] || searching;
    const ko = String(v.ko || v.vi || v.en || '').replace(/\n/g,' ');
    if(!open){
      return `<div class="cp-item${on?' on':''}" onclick="cpToggle('${esc(f.path)}')">
        <span class="tx">${esc(ko.length>78?ko.slice(0,78)+'…':ko)}</span>
        <span class="wh">${esc(searching ? mkCopyGroup(f) : f.label)}</span>
        ${on?'<span class="dot">수정됨</span>':''}
      </div>`;
    }
    const box = (l, label) => v[l] === undefined ? '' : `
      <div class="fld" style="margin:0">
        <label><span class="lang-tag">${label}</span></label>
        <textarea rows="${String(v[l]||'').length > 70 ? 3 : 1}"
          oninput="cpEdit('${esc(f.path)}','${l}',this.value)">${esc(v[l]||'')}</textarea>
      </div>`;
    return `<div class="cp-item open${on?' on':''}">
      <div class="cp-head" onclick="cpToggle('${esc(f.path)}')">
        <span class="wh">${esc(mkCopyGroup(f))} · ${esc(f.label)}</span>
        <span class="grow"></span>
        ${(v.vi !== undefined || v.en !== undefined)
          ? `<button class="btn btn-ghost btn-sm" title="한국어를 베트남어·영어로 다시 번역합니다 (들어 있던 값을 덮어씁니다)"
              onclick="event.stopPropagation();cpTranslate('${esc(f.path)}',this)">🌐 번역</button>` : ''}
        ${on?`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();cpReset('${esc(f.path)}')">되돌리기</button>`:''}
        <span class="fold">접기</span>
      </div>
      <div class="fgrid">${box('ko','KO')}${box('vi','VI')}${box('en','EN')}</div>
    </div>`;
  };

  /* 구역 제목을 끼워 넣어 어디 문구인지 보이게 한다 */
  let body = '';
  if(!list.length){
    body = `<p class="note" style="text-align:center;padding:44px 0">찾는 문구가 없습니다. 사이트에 보이는 그대로 입력해 보세요.</p>`;
  } else if(searching){
    body = list.map(one).join('');
  } else {
    const byG = {};
    list.forEach(f=>{ const g=mkCopyGroup(f); (byG[g]=byG[g]||[]).push(f); });
    body = Object.keys(byG).sort((a,b)=>a.localeCompare(b,'ko')).map(g=>
      `<div class="cp-group">${esc(g)} <b>${byG[g].length}</b></div>` + byG[g].map(one).join('')).join('');
  }

  return { body, count:list.length, editedCnt };
}

function renderCopy(){
  const el = document.getElementById('tab-copy');
  if(!el) return;
  const sources = mkCopySources();
  if(!sources.length){ el.innerHTML = `<div class="card"><p class="note">문구 원본을 찾지 못했습니다.</p></div>`; return; }

  const all = mkCopyFields();
  const searching = cpSearch.trim().length > 0;
  const cur = sources.find(s=>s.id===cpSrc) || sources[0];

  /* 현재 소스의 구역 칩 */
  const gCount = {};
  all.filter(f=>f.src===cpSrc).forEach(f=>{ const g=mkCopyGroup(f); gCount[g]=(gCount[g]||0)+1; });
  const groups = Object.keys(gCount).sort((a,b)=>a.localeCompare(b,'ko'));

  const { body, count, editedCnt } = cpBuildList();

  el.innerHTML = `
    <div class="card">
      <p class="note" style="margin-bottom:12px">사이트에 나가는 문구를 고칩니다. <b>바꾸고 싶은 문구를 그대로 검색창에 넣는 것이 가장 빠릅니다.</b>
      저장하면 바로 반영되고, 원본은 그대로 있어서 언제든 되돌릴 수 있습니다.</p>
      <div class="bar">
        <input class="srch cp-find" placeholder="예: 관심제품 — 사이트에서 본 문구를 그대로" value="${esc(cpSearch)}"
          oninput="cpFind(this.value)">
        <button class="btn btn-ghost btn-sm" id="cp-clear" ${searching?'':'hidden'} onclick="cpClearSearch()">지우기</button>
        <span class="grow"></span>
        <label class="chk"><input type="checkbox" ${cpOnlyEdited?'checked':''} onchange="cpOnlyEdited=this.checked;cpRefreshList()"> 수정한 것만</label>
        <span class="note" style="margin:0" id="cp-count">${count}개${editedCnt?` · 수정 <b>${editedCnt}</b>건`:''}</span>
        <span class="note" style="margin:0" id="cp-dirty">${Object.keys(cpDraft).length?Object.keys(cpDraft).length+'건 편집됨':''}</span>
        <button class="btn btn-primary btn-sm" id="cp-save" ${Object.keys(cpDraft).length?'':'disabled'} onclick="cpSave()">저장</button>
      </div>
      <p class="note" style="margin:0 0 10px" id="cp-found" ${searching?'':'hidden'}>전체에서 <b>${count}개</b> 찾았습니다.</p>
      <div id="cp-browse" ${searching?'hidden':''}>
        <div class="bar" style="margin-bottom:8px">
          ${sources.map(s=>`<button class="btn btn-sm ${cpSrc===s.id?'btn-primary':'btn-ghost'}" onclick="cpSrc='${s.id}';cpGroup='all';renderCopy()">${esc(s.label)}</button>`).join('')}
        </div>
        <div class="bchips" style="margin-bottom:14px">
          <button class="bchip${cpGroup==='all'?' on':''}" onclick="cpGroup='all';renderCopy()">전체 <b>${all.filter(f=>f.src===cpSrc).length}</b></button>
          ${groups.map(g=>`<button class="bchip${cpGroup===g?' on':''}" onclick="cpGroup='${esc(g).replace(/'/g,"\\'")}';renderCopy()">${esc(g)} <b>${gCount[g]}</b></button>`).join('')}
        </div>
        <p class="note" style="margin:0 0 10px">${esc(cur.hint)}</p>
      </div>
      <div id="cp-list">${body}</div>
    </div>`;
}

/* ============================================================
   SEO 설정 — 검색결과에 나가는 제목·설명, 공유 이미지, 파비콘
   ------------------------------------------------------------
   settings 의 key='seo' 한 줄에 모은다. 저장해도 화면은 그대로다.
   검색엔진이 읽는 HTML 은 굽기(node build.js)를 돌려야 바뀐다.

   빈 칸으로 두면 코드(bake.js)의 기본값이 그대로 나간다.
   그래서 "지우기"가 곧 "기본값으로 되돌리기"다.
   ============================================================ */

/* 언어판이 있는 허브 페이지 + 단독 페이지.
   ⚠ bake.js 의 HUB · PAGES 와 파일명이 같아야 한다. 여기 없는 페이지는 코드 기본값만 쓴다. */
const SEO_PAGES = [
  { file:'index.html',      label:'홈(랜딩)',       langs:['ko','vi','en'] },
  { file:'directory.html',  label:'제품 목록',      langs:['ko','vi','en'] },
  { file:'companies.html',  label:'공급사 목록',    langs:['ko','vi','en'] },
  { file:'columns.html',    label:'칼럼 목록',      langs:['ko','vi','en'] },
  { file:'products.html',   label:'제품 홈',        langs:['ko','vi','en'] },
  { file:'guide.html',      label:'이용 가이드',    langs:['ko','vi','en'] },
  { file:'support.html',    label:'고객센터',       langs:['ko','vi','en'] },
  { file:'maker.html',      label:'공급사 입점',    langs:['ko'], note:'한국 공급사 대상이라 한국어만 있습니다' },
];

/* 권장 길이 — 검색결과에서 잘리지 않는 범위 */
const SEO_LEN = { title:[20, 60], desc:[70, 155] };

let seoDraft = {};   // 저장 전 편집분 { 'index.html': { ko:{title,desc} } }

function seoStore(){ return (typeof MK_SEO !== 'undefined' && MK_SEO) ? MK_SEO : {}; }
function seoVal(file, lang, k){
  const d = ((seoDraft[file] || {})[lang] || {})[k];
  if(d !== undefined) return d;
  return (((seoStore().pages || {})[file] || {})[lang] || {})[k] || '';
}
function seoSiteVal(k){
  if(seoDraft.__site && seoDraft.__site[k] !== undefined) return seoDraft.__site[k];
  return (seoStore().site || {})[k] || '';
}

function seoEdit(file, lang, k, v){
  const p = seoDraft[file] = seoDraft[file] || {};
  const l = p[lang] = p[lang] || {};
  l[k] = v;
  seoMarkDirty();
  seoCount(file, lang, k, v);
}
function seoEditSite(k, v){
  seoDraft.__site = seoDraft.__site || {};
  seoDraft.__site[k] = v;
  seoMarkDirty();
}
function seoMarkDirty(){
  const n = Object.keys(seoDraft).length;
  const d = document.getElementById('seo-dirty');
  if(d) d.textContent = n ? n + '개 항목 편집됨' : '';
  const b = document.getElementById('seo-save');
  if(b) b.disabled = !n;
}

/* 글자 수를 그 자리에서만 갱신한다. 전체를 다시 그리면 입력 중 포커스가 날아간다 */
function seoCount(file, lang, k, v){
  const el = document.getElementById(`seolen-${cssId(file)}-${lang}-${k}`);
  if(!el) return;
  const [min, max] = SEO_LEN[k];
  const n = String(v || '').length;
  el.textContent = n + '자';
  el.className = 'seolen' + (n === 0 ? '' : n < min ? ' warn' : n > max ? ' over' : ' ok');
}
const cssId = f => String(f).replace(/[^a-z0-9]/gi, '_');

async function seoSave(){
  const cur = seoStore();
  const next = { site: { ...(cur.site || {}) }, pages: JSON.parse(JSON.stringify(cur.pages || {})) };
  Object.keys(seoDraft).forEach(file => {
    if(file === '__site'){ Object.assign(next.site, seoDraft.__site); return; }
    next.pages[file] = next.pages[file] || {};
    Object.keys(seoDraft[file]).forEach(lang => {
      next.pages[file][lang] = { ...(next.pages[file][lang] || {}), ...seoDraft[file][lang] };
    });
  });
  /* 빈 값은 아예 지운다. 남겨두면 "빈 제목"으로 덮어써서 페이지 제목이 사라진다 */
  Object.keys(next.pages).forEach(f => {
    Object.keys(next.pages[f]).forEach(l => {
      Object.keys(next.pages[f][l]).forEach(k => {
        if(!String(next.pages[f][l][k] || '').trim()) delete next.pages[f][l][k];
      });
      if(!Object.keys(next.pages[f][l]).length) delete next.pages[f][l];
    });
    if(!Object.keys(next.pages[f]).length) delete next.pages[f];
  });
  Object.keys(next.site).forEach(k => { if(!String(next.site[k] || '').trim()) delete next.site[k]; });

  try{
    await Admin.saveSeo(next);
    seoDraft = {};
    toastA('저장했습니다 — 검색엔진에 반영하려면 굽기가 필요합니다');
    renderSeo();
  }catch(e){ alert(e.message); }
}

function renderSeo(){
  const el = document.getElementById('tab-seo');
  if(!el) return;
  const LN = { ko:'한국어', vi:'베트남어', en:'영어' };

  const field = (p, lang, k, ph) => {
    const v = seoVal(p.file, lang, k);
    const [min, max] = SEO_LEN[k];
    const n = v.length;
    const cls = n === 0 ? '' : n < min ? ' warn' : n > max ? ' over' : ' ok';
    return `
      <div class="fld" style="margin:0">
        <label>${k === 'title' ? '제목' : '설명'}
          <span class="seolen${cls}" id="seolen-${cssId(p.file)}-${lang}-${k}">${n}자</span>
        </label>
        ${k === 'title'
          ? `<input value="${esc(v)}" placeholder="${esc(ph)}" data-seo-ph="${cssId(p.file)}-${lang}-title"
               onfocus="seoPrefill(this,'${p.file}','${lang}','title')"
               oninput="seoEdit('${p.file}','${lang}','title',this.value)">`
          : `<textarea rows="2" placeholder="${esc(ph)}" data-seo-ph="${cssId(p.file)}-${lang}-desc"
               onfocus="seoPrefill(this,'${p.file}','${lang}','desc')"
               oninput="seoEdit('${p.file}','${lang}','desc',this.value)">${esc(v)}</textarea>`}
      </div>`;
  };

  const page = p => `
    <div class="cp-item open">
      <div class="cp-head"><span class="wh">${esc(p.label)}</span>
        <span class="grow"></span><code>${esc(p.file)}</code></div>
      ${p.note ? `<p class="note" style="margin:0 0 10px">${esc(p.note)}</p>` : ''}
      ${p.langs.map(l => `
        <div class="sect" style="border-top:0;margin:0;padding:6px 0">
          <h4><span class="lang-tag">${l.toUpperCase()}</span> ${LN[l]}</h4>
          <div class="fgrid two">${field(p, l, 'title', '검색결과에 뜰 제목')}${field(p, l, 'desc', '검색결과에 뜰 설명')}</div>
        </div>`).join('')}
    </div>`;

  el.innerHTML = `
    <div class="card">
      <div class="bar">
        <p class="note" style="margin:0;flex:1">검색결과와 공유 카드에 나가는 값입니다.
          <b>비워두면 지금 쓰고 있는 기본 문구가 그대로 나갑니다.</b></p>
        <span class="note" style="margin:0" id="seo-dirty"></span>
        <button class="btn btn-primary btn-sm" id="seo-save" disabled onclick="seoSave()">저장</button>
      </div>
      <p class="note" style="margin:10px 0 0;color:var(--adm-warn,#b45309)">
        ⚠ 저장해도 검색엔진이 읽는 HTML 은 바로 바뀌지 않습니다. 담당자에게 <b>굽기</b>를 요청하세요.</p>
    </div>

    <div class="card">
      <h3>공용</h3>
      <p class="note">모든 페이지에 함께 적용됩니다.</p>
      <div class="sect" style="border-top:0;margin-top:0;padding-top:0">
        <h4>공유 이미지 (OG)</h4>
        <p class="note">카카오톡·페이스북 등에 링크를 붙였을 때 뜨는 그림입니다. 1200×630 권장.</p>
        ${seoSiteVal('ogImage') ? '' : `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--adm-sub);margin-bottom:6px">지금 적용 중 (기본 파일)</div>
          <img src="../assets/img/og.png?t=${Date.now()}" style="max-width:340px;border:1px solid var(--adm-line);border-radius:8px">
        </div>`}
        ${uploader('seo-og', seoSiteVal('ogImage'), { hint:'비워두면 위의 기본 이미지가 그대로 나갑니다. 다른 걸 쓰고 싶을 때만 올리세요.' })}
        <button class="btn btn-ghost btn-sm" style="margin-top:8px"
          onclick="seoEditSite('ogImage', document.getElementById('seo-og').value)">이 이미지로 지정</button>
      </div>
      <div class="sect">
        <h4>파비콘</h4>
        <p class="note">브라우저 탭에 뜨는 작은 아이콘입니다. SVG 또는 PNG.</p>
        ${seoSiteVal('favicon') ? '' : `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;font-weight:600;color:var(--adm-sub);margin-bottom:6px">지금 적용 중 (기본 파일)</div>
          <img src="../assets/img/favicon.svg?t=${Date.now()}" width="48" height="48" style="border:1px solid var(--adm-line);border-radius:10px">
        </div>`}
        ${uploader('seo-fav', seoSiteVal('favicon'), { hint:'비워두면 위의 기본 파비콘이 그대로 나갑니다. 다른 걸 쓰고 싶을 때만 올리세요.' })}
        <button class="btn btn-ghost btn-sm" style="margin-top:8px"
          onclick="seoEditSite('favicon', document.getElementById('seo-fav').value)">이 아이콘으로 지정</button>
      </div>
    </div>

    <div class="card">
      <h3>페이지별</h3>
      <p class="note">제목은 ${SEO_LEN.title[0]}~${SEO_LEN.title[1]}자, 설명은 ${SEO_LEN.desc[0]}~${SEO_LEN.desc[1]}자를 권장합니다.
        길면 검색결과에서 뒤가 잘립니다.</p>
      <div style="margin-top:14px">${SEO_PAGES.map(page).join('')}</div>
    </div>

    <div class="card">
      <h3>여기서 못 고치는 것</h3>
      <table class="tbl"><tbody>
        <tr><th style="width:180px">칼럼별 SEO</th><td>관리자 &gt; 칼럼 &gt; 해당 글 &gt; <b>SEO · 주소</b></td></tr>
        <tr><th>제품·공급사 페이지</th><td>제품명과 소개 문구로 자동 생성됩니다.</td></tr>
        <tr><th>주소·다국어 태그</th><td>canonical, hreflang, sitemap, robots — 굽기가 자동으로 만듭니다.</td></tr>
        <tr><th>구조화 데이터</th><td>조직·FAQ·제품 정보 — 등록한 내용에서 자동 생성됩니다.</td></tr>
      </tbody></table>
    </div>`;

  seoFillCurrent();
}

/* 빈 칸에 "지금 나가는 문구"를 흐리게 채운다.
   OG 미리보기와 같은 문제 — 비어 있으면 아무것도 없는 것처럼 보였다.
   구워진 각 페이지의 HTML 에서 title 과 description 을 읽어 placeholder 로 넣는다.
   그게 곧 지금 검색엔진이 보는 값이다. 한 번 읽으면 세션 동안 기억한다. */
const _seoCur = {};

/* 빈 칸을 누르면 지금 나가는 문구를 채워 준다 — 처음부터 다시 쓰지 않고 고치면 되게.
   채우기만 하고 편집분(seoDraft)에는 넣지 않는다. 손대지 않고 나가면 저장되지 않는다. */
function seoPrefill(el, file, lang, k){
  if(el.value) return;
  const cur = _seoCur[cssId(file) + '-' + lang];
  if(!cur || !cur[k]) return;
  el.value = cur[k];
  seoCount(file, lang, k, cur[k]);
}

async function seoFillCurrent(){
  for(const p of SEO_PAGES){
    for(const lang of p.langs){
      const rel = lang === 'vi' || p.file === 'maker.html' ? p.file : lang + '/' + p.file;
      const key = cssId(p.file) + '-' + lang;
      if(!_seoCur[key]){
        try{
          /* ?raw=1 : 서브도메인 운영 후 /ko/·/en/ 는 언어 호스트로 301 되는데, 관리자는 같은 origin 에서 원문만 읽으면 되므로 Nginx 가 이 인자를 보고 리다이렉트를 건너뛴다 */
          const html = await (await fetch('../' + rel + '?raw=1', { cache:'no-store' })).text();
          _seoCur[key] = {
            title: (html.match(/<title>([^<]*)/) || [])[1] || '',
            desc:  (html.match(/name="description" content="([^"]*)/) || [])[1] || '',
          };
        }catch(e){ continue; }
      }
      ['title','desc'].forEach(k => {
        const inp = document.querySelector(`[data-seo-ph="${key}-${k}"]`);
        if(inp && !inp.value && _seoCur[key][k])
          inp.placeholder = '지금 나가는 문구: ' + _seoCur[key][k];
      });
    }
  }
}

/* ============================================================
   9. 관리자 계정 — admins 테이블 (서버 모드 전용)
   ------------------------------------------------------------
   REST 로는 admins 에 쓸 수 없다(누구나 스스로를 관리자로 만들 수 있으므로).
   모든 동작은 /functions/v1/admin-users 창구를 지난다 — MkAdminApi 참고.
   ============================================================ */
let admUsers = [];

/* 서버가 돌려주는 err 코드를 사람 말로 */
const ADM_ERR = {
  not_admin:          '관리자 권한이 없습니다. 다시 로그인해 보세요.',
  no_session:         '로그인이 만료됐습니다. 새로고침 후 다시 로그인하세요.',
  bad_email:          '이메일 형식이 올바르지 않습니다.',
  weak_password:      '비밀번호는 8자 이상이어야 합니다.',
  already_admin:      '이미 관리자로 등록된 계정입니다.',
  cannot_remove_self: '본인 권한은 해제할 수 없습니다. 다른 관리자에게 요청하세요.',
  last_admin:         '마지막 관리자는 해제할 수 없습니다. 먼저 다른 관리자를 추가하세요.',
  not_admin_target:   '관리자 계정만 비밀번호를 변경할 수 있습니다.',
  wrong_current:      '현재 비밀번호가 올바르지 않습니다.',
  not_found:          '대상을 찾을 수 없습니다.',
  unreachable:        '서버에 연결할 수 없습니다.',
};
const admErr = r => ADM_ERR[r && r.err] || ('처리에 실패했습니다 (' + ((r && r.err) || '알 수 없는 오류') + ')');

function renderAdmins(){
  const el = document.getElementById('tab-admins');
  if(!el) return;

  /* 로컬 모드(localStorage 게이트)에는 계정 개념이 없다 */
  if(!isSB() || typeof MkAdminApi === 'undefined'){
    el.innerHTML = `<div class="card"><h3>관리자 계정</h3><p class="note" style="margin:0">
      이 기능은 서버 모드에서만 동작합니다. <code>assets/js/config.js</code> 의
      <code>MK_SUPABASE_URL</code> · <code>MK_SUPABASE_ANON</code> 이 채워져 있어야 합니다.</p></div>`;
    return;
  }

  el.innerHTML = `
    <div class="card"><div class="bar"><h3 style="margin:0">관리자 목록</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="loadAdminUsers()">새로고침</button></div><p class="note">이 목록에 있는 계정만 관리자 콘솔에 들어올 수 있습니다. 권한을 해제해도 계정과 문의·관심제품 이력은 남습니다.</p><div class="tbl-wrap"><table><thead><tr><th>이메일</th><th>관리자 등록일</th><th style="width:120px"></th></tr></thead><tbody id="adm-users-rows"><tr class="empty-row"><td colspan="3">불러오는 중…</td></tr></tbody></table></div></div>

    <div class="card"><h3>관리자 추가</h3><p class="note">이미 회원가입된 이메일이면 그 계정에 관리자 권한을 줍니다. 처음 보는 이메일이면 <b>새 계정을 만들어</b> 관리자로 등록합니다 (이때 비밀번호가 필요합니다).</p><div class="fgrid two"><div class="fld"><label>이메일</label><input id="adm-new-email" type="email" placeholder="admin@makenov.com" autocomplete="off"></div><div class="fld"><label>비밀번호 <span style="color:var(--adm-sub);font-size:11px">새 계정일 때만 · 8자 이상</span></label><input id="adm-new-pw" type="password" autocomplete="new-password"></div></div><button class="btn btn-primary btn-sm" onclick="addAdminUser()">추가</button></div>

    <div class="card"><h3>내 비밀번호 변경</h3><p class="note">변경하면 다른 기기·브라우저의 로그인은 모두 끊기고, 지금 이 화면만 그대로 유지됩니다.</p><div class="fgrid"><div class="fld"><label>현재 비밀번호</label><input id="adm-pw-cur" type="password" autocomplete="current-password"></div><div class="fld"><label>새 비밀번호 <span style="color:var(--adm-sub);font-size:11px">8자 이상</span></label><input id="adm-pw-new" type="password" autocomplete="new-password"></div><div class="fld"><label>새 비밀번호 확인</label><input id="adm-pw-new2" type="password" autocomplete="new-password"></div></div><button class="btn btn-primary btn-sm" onclick="changeMyPassword()">변경</button></div>

    <div class="card"><h3>다른 관리자 비밀번호 재설정</h3><p class="note">비밀번호를 잊은 관리자를 위해 새 비밀번호를 지정합니다. 그 계정의 모든 로그인이 끊기므로, 새 비밀번호를 당사자에게 직접 전달하세요.</p><div class="fgrid"><div class="fld"><label>대상 관리자</label><select id="adm-reset-target"></select></div><div class="fld"><label>새 비밀번호 <span style="color:var(--adm-sub);font-size:11px">8자 이상</span></label><input id="adm-reset-pw" type="password" autocomplete="new-password"></div><div class="fld"><label>새 비밀번호 확인</label><input id="adm-reset-pw2" type="password" autocomplete="new-password"></div></div><button class="btn btn-ghost btn-sm" onclick="resetAdminPassword()">재설정</button></div>`;

  loadAdminUsers();
}

async function loadAdminUsers(){
  const rows = document.getElementById('adm-users-rows');
  if(!rows) return;
  const r = await MkAdminApi.call('list');
  if(!r.ok){
    rows.innerHTML = `<tr class="empty-row"><td colspan="3">${esc(admErr(r))}</td></tr>`;
    return;
  }
  admUsers = r.list || [];

  rows.innerHTML = admUsers.length ? admUsers.map(u => `
    <tr class="row-hover"><td><b>${esc(u.email)}</b>${u.self?' <span class="pill-st st-vip">나</span>':''}<div class="sub">${esc(u.user_id)}</div></td><td>${esc(String(u.created_at||'').slice(0,10))}</td><td>${u.self?'<span class="sub">본인</span>':`<button class="btn btn-ghost btn-sm" onclick="removeAdminUser('${esc(u.user_id)}','${esc(u.email)}')">권한 해제</button>`}</td></tr>`).join('')
    : `<tr class="empty-row"><td colspan="3">관리자가 없습니다</td></tr>`;

  /* 비밀번호 재설정 대상 — 본인은 위쪽 카드에서 바꾼다 */
  const sel = document.getElementById('adm-reset-target');
  if(sel){
    const others = admUsers.filter(u => !u.self);
    sel.innerHTML = others.length
      ? others.map(u=>`<option value="${esc(u.user_id)}">${esc(u.email)}</option>`).join('')
      : `<option value="">다른 관리자가 없습니다</option>`;
  }
}

async function addAdminUser(){
  const email = av('adm-new-email');
  const pw    = av('adm-new-pw');
  if(!email){ toastA('이메일을 입력하세요'); return; }

  toastA('추가하는 중…');
  const r = await MkAdminApi.call('add', { email, password: pw });
  if(!r.ok){ toastA(admErr(r)); return; }

  toastA(r.mode === 'created' ? `새 계정 ${r.email} 을 관리자로 등록했습니다` : `${r.email} 에게 관리자 권한을 부여했습니다`);
  document.getElementById('adm-new-email').value = '';
  document.getElementById('adm-new-pw').value = '';
  loadAdminUsers();
}

async function removeAdminUser(user_id, email){
  if(!confirm(email + '\n\n이 계정의 관리자 권한을 해제할까요?\n계정 자체는 삭제되지 않습니다.')) return;

  toastA('해제하는 중…');
  const r = await MkAdminApi.call('remove', { user_id });
  if(!r.ok){ toastA(admErr(r)); return; }
  toastA('관리자 권한을 해제했습니다');
  loadAdminUsers();
}

async function changeMyPassword(){
  const cur = av('adm-pw-cur'), a = av('adm-pw-new'), b = av('adm-pw-new2');
  if(a.length < 8){ toastA('새 비밀번호는 8자 이상이어야 합니다'); return; }
  if(a !== b){ toastA('두 비밀번호가 다릅니다'); return; }
  if(!cur){ toastA('현재 비밀번호를 입력하세요'); return; }

  toastA('변경하는 중…');
  const r = await MkAdminApi.call('password', { current: cur, password: a });
  if(!r.ok){ toastA(admErr(r)); return; }
  toastA('비밀번호를 변경했습니다');
  ['adm-pw-cur','adm-pw-new','adm-pw-new2'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}

async function resetAdminPassword(){
  const user_id = av('adm-reset-target');
  const a = av('adm-reset-pw'), b = av('adm-reset-pw2');
  if(!user_id){ toastA('대상 관리자를 선택하세요'); return; }
  if(a.length < 8){ toastA('새 비밀번호는 8자 이상이어야 합니다'); return; }
  if(a !== b){ toastA('두 비밀번호가 다릅니다'); return; }

  const who = (admUsers.find(u=>u.user_id===user_id)||{}).email || '';
  if(!confirm(who + '\n\n이 관리자의 비밀번호를 재설정할까요?\n해당 계정의 모든 로그인이 끊깁니다.')) return;

  toastA('재설정하는 중…');
  const r = await MkAdminApi.call('password', { user_id, password: a });
  if(!r.ok){ toastA(admErr(r)); return; }
  toastA(`${r.email||who} 의 비밀번호를 재설정했습니다`);
  document.getElementById('adm-reset-pw').value = '';
  document.getElementById('adm-reset-pw2').value = '';
}

function renderSettings(){
  const S = (typeof MK_SETTINGS !== 'undefined') ? MK_SETTINGS : { topbar:{} };
  const tb = S.topbar || {};
  const g = k => esc(tb[k] || '');

  document.getElementById('tab-settings').innerHTML = `
    <div class="card"><div class="bar"><h3 style="margin:0">상단 띠배너</h3><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="autoTranslate(this,['set-tb'],false)" title="한국어를 베트남어·영어로 자동 번역 (빈 칸만 채움)">🌐 한국어 자동번역</button><button class="btn btn-primary btn-sm" onclick="saveTopbar()">저장</button></div><p class="note">모든 페이지 맨 위에 뜨는 파란 띠입니다. 방문자가 ✕로 닫으면 그 세션 동안만 숨겨집니다.</p><div class="fgrid"><div class="fld"><label><span class="lang-tag">KO</span></label><textarea id="set-tb-ko" rows="2">${g('ko')}</textarea></div><div class="fld"><label><span class="lang-tag">VI</span></label><textarea id="set-tb-vi" rows="2">${g('vi')}</textarea></div><div class="fld"><label><span class="lang-tag">EN</span></label><textarea id="set-tb-en" rows="2">${g('en')}</textarea></div></div><div class="fgrid two" style="margin-top:14px"><div class="fld"><label>클릭 시 이동할 주소 (비우면 링크 없음)</label><input id="set-tb-link" value="${esc(S.topbarLink||'')}" placeholder="maker.html"></div><div class="fld"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="set-tb-on" ${S.topbarOn!==false?'checked':''} style="width:auto"> 띠배너 노출</label></div></div></div><div class="card"><h3>배포용 데이터 내보내기</h3><p class="note">지금 편집한 제품·칼럼은 <b>이 브라우저에만</b> 저장돼 있습니다.
      아래에서 <code>data.js</code>를 내려받아 <code>makenov/assets/js/data.js</code>를 교체하면
      다른 기기와 배포 사이트에도 반영됩니다.</p><div class="bar"><button class="btn btn-primary btn-sm" onclick="exportDataJs()">data.js 내려받기</button><button class="btn btn-ghost btn-sm" onclick="exportJson()">전체 백업 (JSON)</button><label class="btn btn-ghost btn-sm" style="cursor:pointer;margin:0">
          백업 복원<input type="file" accept=".json" style="display:none" onchange="importJson(this)"></label></div></div>${isSB() ? `<div class="card"><h3>비밀번호 변경</h3><p class="note" style="margin:0">서버 모드에서는 관리자마다 계정과 비밀번호가 따로 있습니다.
      왼쪽 메뉴 <b>관리자</b> 탭에서 변경하세요 — 아래 게이트 비밀번호는 이 모드에서 쓰이지 않습니다.</p></div>` : `<div class="card"><h3>비밀번호 변경</h3><div class="fgrid two"><div class="fld"><label>새 비밀번호</label><input id="set-pw" type="password"></div><div class="fld"><label>새 비밀번호 확인</label><input id="set-pw2" type="password"></div></div><button class="btn btn-primary btn-sm" onclick="changePw()">변경</button><p class="note" style="margin:12px 0 0"> 이 관리자는 브라우저에서 동작하는 임시 게이트입니다.
      실제 서비스에서는 2단계 Supabase 인증으로 교체해야 합니다.</p></div>`}<div class="card"><h3>편집 내용 초기화</h3><p class="note">관리자에서 편집한 제품·칼럼을 모두 버리고 최초 시드 데이터로 되돌립니다. 문의·유통 파트너 데이터는 유지됩니다.</p><button class="btn btn-ghost btn-sm"
        onclick="if(confirm('편집한 제품·칼럼을 모두 버리고 초기 상태로 되돌립니다.\\n계속할까요?')){Admin.resetContent();location.reload();}">초기 데이터로 되돌리기</button></div><div class="card"><h3>업로드 이미지 저장공간</h3><p class="note">올린 사진은 <b>이 브라우저 안에</b> 저장됩니다(IndexedDB).
      업로드 시 자동으로 긴 변 1600px · JPEG 품질 82%로 압축합니다.
      다른 기기나 실제 서버에 반영하려면 위의 <b>JSON 백업</b>을 받아 옮기세요.
      2단계에서 Supabase Storage로 이전할 예정입니다.</p><div id="img-usage"><p class="note" style="margin:0">불러오는 중…</p></div><div class="bar" style="margin:14px 0 0"><button class="btn btn-ghost btn-sm" onclick="runGc()">사용하지 않는 이미지 정리</button><button class="btn btn-ghost btn-sm" onclick="renderStorage()">새로고침</button></div></div>`;
  renderStorage();
}

/* 상단 띠배너 저장 — 3개 국어 문구 + 링크 + 노출여부 */
function saveTopbar(){
  const topbar = tri('set-tb');
  if(!topbar.ko && !topbar.vi && !topbar.en){ toastA('띠배너 문구를 입력하세요'); return; }
  toastA('저장하는 중…');
  admDo(Promise.resolve(Admin.saveSettings({
    topbar,
    topbarLink: av('set-tb-link'),
    topbarOn: ac('set-tb-on'),
  })));
}

/* 업로드 이미지 저장공간 현황 — 설정 탭 하단에 비동기로 채운다 */
async function renderStorage(){
  const el = document.getElementById('img-usage');
  if(!el) return;
  const u = await MkImg.usage();
  /* IndexedDB 할당량은 보통 수 GB지만 브라우저·기기마다 다르다. 실제 값을 그대로 보여준다. */
  const pct = u.quota ? Math.min(100, (u.used / u.quota) * 100) : 0;
  el.innerHTML = `
    <div class="bar-gauge"><i class="${pct>80?'warn':''}" style="width:${Math.max(pct,1.2)}%"></i></div>
    <p class="note" style="margin:0">업로드 이미지 <b>${u.count}장</b> · ${fmtBytes(u.used)}
      ${u.quota?` / 이 브라우저 여유 ${fmtBytes(u.quota)} (${pct.toFixed(1)}%)`:''}</p>`;
}
async function runGc(){
  const n = await MkImg.gc();
  toastA(n ? `사용하지 않는 이미지 ${n}장을 정리했습니다` : '정리할 이미지가 없습니다');
  renderStorage();
}

function changePw(){
  const a=av('set-pw'), b=av('set-pw2');
  if(a.length<4){ toastA('4자 이상 입력하세요'); return; }
  if(a!==b){ toastA('두 비밀번호가 다릅니다'); return; }
  Admin.changePassword(a); toastA('비밀번호가 변경되었습니다');
  document.getElementById('set-pw').value=''; document.getElementById('set-pw2').value='';
}

function downloadFile(name, content, mime){
  const blob = new Blob([content], {type:(mime||'text/plain')+';charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

/* data.js 전체를 다시 구워서 내려받기 */
function exportDataJs(){
  const J = o => JSON.stringify(o, null, 2);
  const src = `/* MAKENOV seed data — 관리자에서 내보냄 ${new Date().toLocaleString('ko-KR')} */

const MK_CATEGORIES = ${J(MK_CATEGORIES)};

const MK_COUNTRIES = ${J(MK_COUNTRIES)};
function mkCountry(code){ return MK_COUNTRIES.find(c=>c.code===code) || MK_COUNTRIES[0]; }

const MK_COMPANIES = ${J(inlineImages(MK_COMPANIES))};
function mkCompany(id){ return MK_COMPANIES.find(c=>c.id===id); }
function mkCompanyOf(product){
  if(!product) return null;
  return MK_COMPANIES.find(c=>c.id===product.companyId)
      || MK_COMPANIES.find(c=>c.brand===product.brand) || null;
}
function mkCompanyProducts(id){
  const c = mkCompany(id); if(!c) return [];
  return MK_PRODUCTS.filter(p => p.companyId===id || p.brand===c.brand);
}

const MK_FREE_MAIL = new Set(${J(Array.from(MK_FREE_MAIL))});

const MK_PRODUCTS = ${J(inlineImages(MK_PRODUCTS))};

const MK_COLUMNS = ${J(inlineImages(MK_COLUMNS))};

const MK_SPOTLIGHT = ${J(MK_SPOTLIGHT)};

const MK_HERO = ${J(typeof MK_HERO !== 'undefined' ? MK_HERO : [])};

const MK_MAKER = ${J(typeof MK_MAKER !== 'undefined' ? MK_MAKER : {})};

const MK_FAQ = ${J(typeof MK_FAQ !== 'undefined' ? MK_FAQ : [])};

const MK_SETTINGS = ${J(typeof MK_SETTINGS !== 'undefined' ? MK_SETTINGS : {})};

/* ---------- 관리자 오버라이드 ---------- */
(function(){
  try{
    const p = JSON.parse(localStorage.getItem('mk_products_override')||'null');
    if(Array.isArray(p)) { MK_PRODUCTS.length = 0; p.forEach(x=>MK_PRODUCTS.push(x)); }
  }catch(e){}
  try{
    const c = JSON.parse(localStorage.getItem('mk_columns_override')||'null');
    if(Array.isArray(c)) { MK_COLUMNS.length = 0; c.forEach(x=>MK_COLUMNS.push(x)); }
  }catch(e){}
  try{
    const s = JSON.parse(localStorage.getItem('mk_spotlight_override')||'null');
    if(Array.isArray(s)) { MK_SPOTLIGHT.length = 0; s.forEach(x=>MK_SPOTLIGHT.push(x)); }
  }catch(e){}
  try{
    const h = JSON.parse(localStorage.getItem('mk_hero_override')||'null');
    if(Array.isArray(h)) { MK_HERO.length = 0; h.forEach(x=>MK_HERO.push(x)); }
  }catch(e){}
  try{
    const f = JSON.parse(localStorage.getItem('mk_faqs_override')||'null');
    if(Array.isArray(f)) { MK_FAQ.length = 0; f.forEach(x=>MK_FAQ.push(x)); }
  }catch(e){}
  try{
    const st = JSON.parse(localStorage.getItem('mk_settings_override')||'null');
    if(st && typeof st === 'object') Object.assign(MK_SETTINGS, st);
  }catch(e){}
})();

const MK_STATS = { products: MK_PRODUCTS.length, inquiries: MK_PRODUCTS.reduce((s,p)=>s+p.inquiries,0), buyers: 87 };

function mkProduct(id){ return MK_PRODUCTS.find(p=>p.id===id); }
function mkCat(id){ return MK_CATEGORIES.find(c=>c.id===id); }
function mkColumn(id){ return MK_COLUMNS.find(c=>c.id===id); }
`;
  downloadFile('data.js', src, 'application/javascript');
  toastA('data.js를 내려받았습니다');
}

function exportJson(){
  downloadFile('makenov-backup_'+today()+'.json', JSON.stringify({
    exportedAt: new Date().toISOString(),
    products: MK_PRODUCTS, columns: MK_COLUMNS, spotlight: MK_SPOTLIGHT,
    inquiries: ADM.inqs, buyers: ADM.buyers,
    inqMeta: JSON.parse(localStorage.getItem('mk_inq_meta')||'{}'),
    tiers: JSON.parse(localStorage.getItem('mk_buyer_tier')||'{}'),
  }, null, 2), 'application/json');
}

function importJson(input){
  const f = input.files && input.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const d = JSON.parse(r.result);
      if(Array.isArray(d.products))  Admin.saveProducts(d.products);
      if(Array.isArray(d.columns))   Admin.saveColumns(d.columns);
      if(Array.isArray(d.spotlight)) Admin.saveSpotlight(d.spotlight);
      if(d.inqMeta) localStorage.setItem('mk_inq_meta', JSON.stringify(d.inqMeta));
      if(d.tiers)   localStorage.setItem('mk_buyer_tier', JSON.stringify(d.tiers));
      toastA('복원되었습니다'); setTimeout(()=>location.reload(), 700);
    }catch(e){ toastA('파일을 읽을 수 없습니다'); }
  };
  r.readAsText(f);
}

/* ---------- 부팅 ----------
   ⚠ 순서가 중요하다.
     예전엔 이메일 칸 추가와 로그인 판정을 전부 `await MkData.boot()` 뒤에 뒀다.
     그런데 boot() 는 콘텐츠까지 다 받느라 1초 넘게 걸린다(세션 확인 자체는 0ms).
     그 사이 화면에는 백엔드가 없을 때 쓰는 로컬 모드 폼
     ("비밀번호 / 초기 비밀번호 makenov2026")이 떠 있었다.
     이미 로그인한 사람도 들어올 때마다 로그인 창을 보게 되니 계속 뜨는 것처럼 보인다.
     그래서 기다리지 않아도 되는 일은 전부 먼저 한다. */

/* Supabase 세션이 저장돼 있는지 — 네트워크 없이 즉시 판단 */
function hasSbSession(){
  try{ return Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k)); }
  catch(e){ return false; }
}

/* 게이트를 계정 로그인 폼으로 바꾼다 (동기) */
function setupSbGate(){
  const pw = document.getElementById('gate-pw');
  if(!pw || document.getElementById('gate-email')) return;
  const wrap = document.createElement('div');
  wrap.className = 'fld';
  wrap.innerHTML = `<label>관리자 이메일</label><input id="gate-email" type="email" autocomplete="username" placeholder="admin@makenov.com" onkeydown="if(event.key==='Enter')doAdminLogin()">`;
  pw.closest('.fld').parentNode.insertBefore(wrap, pw.closest('.fld'));
  /* 로컬용 안내문(초기 비밀번호 makenov2026)은 Supabase 모드에선 틀린 말이라 교체 */
  const hint = pw.closest('.fld').querySelector('.hint');
  if(hint) hint.innerHTML = '가입된 <b>관리자 계정</b>의 이메일·비밀번호로 로그인하세요.';
  pw.setAttribute('autocomplete','current-password');
}

function showBootWait(on){
  const g = document.getElementById('gate');
  const w = document.getElementById('boot-wait');
  if(g) g.classList.toggle('hidden', !!on);
  if(w) w.classList.toggle('hidden', !on);
}

document.addEventListener('DOMContentLoaded', async ()=>{
  if(isSB()){
    setupSbGate();                       /* 1) 폼부터 제 모습으로 (기다리지 않는다) */
    const maybeIn = hasSbSession();
    if(maybeIn) showBootWait(true);      /* 2) 세션이 있으면 로그인 창 대신 대기 화면 */
    else { const el = document.getElementById('gate-email'); if(el) el.focus(); }

    try{ await MkData.boot(); }catch(e){ console.error('백엔드 연결 실패', e); }

    if(MkData.admin){ showBootWait(false); boot(); return; }
    if(maybeIn){                         /* 세션은 있는데 관리자가 아니거나 만료됐다 */
      showBootWait(false);
      const err = document.getElementById('gate-err');
      if(err && MkData.session){
        err.textContent = '이 계정은 관리자로 등록돼 있지 않습니다 (admins 테이블 확인)';
        err.style.display = 'block';
      }
      const el = document.getElementById('gate-email'); if(el) el.focus();
    }
    return;
  }
  if(Admin.isIn()) boot();
});
/* 제품 편집 폼이 그려진 뒤 갤러리·블록 편집기 채우기 */
const _origRenderProducts = renderProducts;
renderProducts = function(){ _origRenderProducts(); if(pEditing !== null){ renderGallery(); renderBlocks(); } };
