/* ============================================================
   MAKENOV 화면 편집 모드
   ------------------------------------------------------------
   사이트를 보면서 글자를 눌러 그 자리에서 고친다.
   관리자로 로그인한 사람에게만 보인다.

   켜는 법
     주소 끝에 ?edit=1 을 붙이거나, 관리자로 로그인하면 우하단에 뜨는
     '문구 수정' 버튼을 누른다.

   글자를 경로에 되짚는 방법 (두 단계)
     1) data-i18n="nav_directory"  → ui.nav_directory   (정확. 헷갈릴 일 없음)
     2) 그 외 요소는 화면 글자를 copy.js 의 문구 목록과 대조해 찾는다.
        같은 문구가 여러 곳에 쓰이면 어디를 고칠지 고르게 한다.
        (about-copy·maker-copy 처럼 마크업에 표시가 없는 본문을 위한 길)

   저장하면 settings 의 copy 한 줄에 들어가고 전 페이지에 반영된다.
   ⚠ 정적 페이지(크롤러가 보는 사본)에는 `node build.js` 를 돌려야 들어간다.
   ============================================================ */
(function(){
  const LANGS = ['ko', 'vi', 'en'];
  let on = false, pop = null;

  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  /* 이 요소가 어느 문구인지 찾는다. 후보를 배열로 돌려준다 */
  function resolve(el){
    const key = el.getAttribute && el.getAttribute('data-i18n');
    const all = (typeof mkCopyFields === 'function') ? mkCopyFields() : [];
    if(key){
      const f = all.find(x => x.path === 'ui.' + key);
      if(f) return [f];
    }
    const txt = norm(el.textContent);
    if(!txt || txt.length > 400) return [];
    const lang = (typeof MK_LANG !== 'undefined') ? MK_LANG : 'vi';
    /* 원본의 \n 은 화면에서 <br> 이 되는데 textContent 에는 공백이 남지 않는다.
       그래서 공백을 전부 지운 형태로도 한 번 더 대조한다. */
    const squash = s => norm(s).replace(/\s+/g, '');
    const flat = squash(txt);
    return all.filter(f => {
      const v = f.val[lang] != null ? f.val[lang] : f.val.ko;
      return norm(v) === txt || squash(v) === flat;
    });
  }

  /* 편집 가능한 가장 안쪽 요소만 고른다 (부모까지 잡히면 통째로 바뀐다) */
  function target(node){
    let el = node;
    while(el && el !== document.body){
      if(el.nodeType === 1 && !el.closest('.mkedit-pop') && resolve(el).length) return el;
      el = el.parentElement;
    }
    return null;
  }

  function closePop(){ if(pop){ pop.remove(); pop = null; } }

  /* 홈 히어로는 5초마다 저절로 넘어간다.
     고칠 문구를 눌러 둔 사이에 슬라이드가 바뀌면 팝업이 사라진 글자를 가리키게 되므로
     편집 중에는 멈춰 둔다. 점·화살표를 눌러 원하는 슬라이드로는 그대로 넘길 수 있다.
     (heroTimer·setHero 는 index.html 의 전역이다. 다른 페이지엔 없으므로 있는지 먼저 본다) */
  function heroAuto(run){
    if(typeof heroTimer === 'undefined' || typeof setHero !== 'function') return;
    clearInterval(heroTimer);
    if(run) heroTimer = setInterval(() => setHero(heroIdx + 1), 5000);
  }

  function openPop(el, fields){
    if(!isAdmin()) return;
    heroAuto(false);   /* 부팅 순서에 따라 편집 모드보다 늦게 켜질 수 있어 여기서 한 번 더 */
    closePop();
    const saved = window.MK_COPY_OVERRIDE || {};
    let field = fields[0];

    pop = document.createElement('div');
    pop.className = 'mkedit-pop';
    const draw = () => {
      const cur = { ...field.val, ...(saved[field.path] || {}) };
      pop.innerHTML = `
        <div class="hd">
          <b>${esc(mkCopyGroup(field))}</b>
          <span class="pt">${esc(field.label)}</span>
          <button class="x" type="button">&times;</button>
        </div>
        ${fields.length > 1 ? `<div class="pick">이 문구가 ${fields.length}군데에 쓰입니다
          <select>${fields.map((f,i)=>`<option value="${i}" ${f===field?'selected':''}>${esc(mkCopyGroup(f))} · ${esc(f.label)}</option>`).join('')}</select></div>` : ''}
        ${LANGS.filter(l => cur[l] !== undefined).map(l => `
          <label><span>${l.toUpperCase()}</span>
            <textarea data-l="${l}" rows="${String(cur[l]||'').length > 60 ? 3 : 2}">${esc(cur[l]||'')}</textarea>
          </label>`).join('')}
        <div class="ft">
          <span class="msg"></span>
          ${hasOther(cur) ? `<button class="btn btn-ghost btn-sm tr" type="button"
            title="한국어를 베트남어·영어로 다시 번역합니다">🌐 번역</button>` : ''}
          <button class="btn btn-ghost btn-sm cancel" type="button">취소</button>
          <button class="btn btn-primary btn-sm save" type="button">저장</button>
        </div>`;

      pop.querySelector('.x').onclick = closePop;
      pop.querySelector('.cancel').onclick = closePop;
      const sel = pop.querySelector('.pick select');
      if(sel) sel.onchange = () => { field = fields[+sel.value]; draw(); };
      pop.querySelector('.save').onclick = save;
      const tr = pop.querySelector('.tr');
      if(tr) tr.onclick = () => translate(tr);
    };

    /* 베트남어·영어 칸이 있는 문구인지. 공급사 안내처럼 한국어만 쓰는 문구도 있다 */
    function hasOther(v){ return v.vi !== undefined || v.en !== undefined; }

    function taOf(l){ return pop.querySelector(`textarea[data-l="${l}"]`); }

    /* 한국어 칸을 읽어 나머지 두 칸을 채운다.
       ⚠ 들어 있던 값을 덮어쓴다. 한국어를 고쳤으면 옛 번역은 이미 틀린 말이다. */
    async function translate(btn){
      const msg = pop.querySelector('.msg');
      const ko = taOf('ko') ? taOf('ko').value.trim() : '';
      if(!ko){ msg.textContent = '한국어 칸이 비어 있습니다'; return false; }
      const orig = btn ? btn.textContent : '';
      if(btn){ btn.disabled = true; btn.textContent = '번역 중…'; }
      msg.textContent = '번역 중…';
      try{
        const { vi, en } = await mkTranslateKo(ko);
        if(!vi && !en) throw new Error('번역을 받지 못했습니다');
        if(taOf('vi') && vi) taOf('vi').value = vi;
        if(taOf('en') && en) taOf('en').value = en;
        msg.textContent = '번역했습니다 — 확인 후 저장하세요';
      }catch(e){
        msg.textContent = '번역 실패: ' + (e.message || e);
        if(btn){ btn.disabled = false; btn.textContent = orig; }
        return false;
      }
      if(btn){ btn.disabled = false; btn.textContent = orig; }
      return true;
    }

    async function save(){
      const msg = pop.querySelector('.msg');
      const was = { ...field.val, ...(saved[field.path] || {}) };

      /* 한국어만 고치고 저장하면 베트남어·영어는 옛 문구로 남는다.
         언어마다 다른 말을 하게 되므로 저장 전에 물어본다. */
      const koChanged = taOf('ko') && taOf('ko').value !== (was.ko || '');
      const otherSame = ['vi','en'].every(l => !taOf(l) || taOf(l).value === (was[l] || ''));
      if(hasOther(was) && koChanged && otherSame){
        const ok = confirm(
          '한국어만 고치셨습니다.\n이대로 저장하면 베트남어·영어는 옛 문구로 남습니다.\n\n' +
          '확인 = 두 언어를 지금 번역해서 함께 저장\n취소 = 한국어만 저장');
        if(ok && !(await translate(pop.querySelector('.tr')))) return;
      }

      const val = { ...was };
      pop.querySelectorAll('textarea').forEach(t => { val[t.dataset.l] = t.value; });
      msg.textContent = '저장 중…';
      try{
        const map = { ...(window.MK_COPY_OVERRIDE || {}) };
        map[field.path] = val;
        await Admin.saveCopy(map);
        /* 화면에 바로 반영 */
        const lang = (typeof MK_LANG !== 'undefined') ? MK_LANG : 'vi';
        if(val[lang] != null) el.textContent = val[lang];
        if(typeof applyI18n === 'function') applyI18n();
        closePop();
      }catch(e){ msg.textContent = e.message; }
    }

    draw();
    document.body.appendChild(pop);
    const r = el.getBoundingClientRect();
    const top = Math.max(8, Math.min(window.innerHeight - pop.offsetHeight - 8, r.bottom + 8));
    pop.style.top = (top + window.scrollY) + 'px';
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left)) + 'px';
    const ta = pop.querySelector('textarea');
    if(ta){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function onClick(e){
    if(!on) return;
    if(e.target.closest('.mkedit-pop') || e.target.closest('.mkedit-bar')) return;
    const el = target(e.target);
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    openPop(el, resolve(el));
  }

  function onOver(e){
    if(!on) return;
    document.querySelectorAll('.mkedit-hot').forEach(x=>x.classList.remove('mkedit-hot'));
    if(e.target.closest('.mkedit-pop') || e.target.closest('.mkedit-bar')) return;
    const el = target(e.target);
    if(el) el.classList.add('mkedit-hot');
  }

  /* 관리자인지 매번 확인한다.
     저장은 RLS(is_admin())가 막아 주지만, 편집 UI 자체가 일반 방문자에게
     열리면 안 된다. 아래 함수들은 이 검사를 통과해야만 동작한다. */
  function isAdmin(){
    return typeof MkData !== 'undefined' && !!MkData.admin;
  }

  function setMode(v){
    if(v && !isAdmin()) return;
    on = v;
    document.body.classList.toggle('mkedit-on', on);
    heroAuto(!on);
    if(!on){
      closePop();
      document.querySelectorAll('.mkedit-hot').forEach(x=>x.classList.remove('mkedit-hot'));
    }
    const b = document.querySelector('.mkedit-bar');
    if(b) b.innerHTML = on
      ? `<b>문구 수정 중</b> <span>고칠 글자를 누르세요</span><button type="button">끝내기</button>`
      : `<button type="button">문구 수정</button>`;
    if(b) b.querySelector('button').onclick = () => setMode(!on);
  }

  function mount(){
    if(!isAdmin()) return;
    if(document.querySelector('.mkedit-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mkedit-bar';
    document.body.appendChild(bar);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onOver, true);
    setMode(new URLSearchParams(location.search).get('edit') === '1');
  }

  /* 관리자에게만 — 부팅이 끝난 뒤 판단한다.
     ⚠ window.MkEdit 는 관리자로 확인된 뒤에만 붙인다.
        예전엔 무조건 붙여 놔서, 일반 방문자도 콘솔에서 MkEdit.mount() 를 부르면
        편집 UI 가 열렸다(저장은 RLS 가 막았지만 화면이 열리는 것 자체가 잘못이다). */
  document.addEventListener('DOMContentLoaded', () => {
    const tick = setInterval(() => {
      if(typeof MkData === 'undefined') return clearInterval(tick);
      if(MkData.admin){
        clearInterval(tick);
        window.MkEdit = { mount, setMode, resolve, target, isOn: () => on };
        mount();
      }
    }, 400);
    setTimeout(() => clearInterval(tick), 12000);
  });
})();
