/* MAKENOV common — header/footer render, lang toggle, cart badge, auth modal (MST verify), inquiry modal, lock gating */

/* ---------- helpers ---------- */
/* 서비스 소개는 언어판이 갈린다 - 루트(KO/EN 텍스트 모드)에서도 새 언어판 랜딩으로 보낸다 */
function mkAboutUrl(){var l=window.MK_FORCE_LANG;try{l=l||MK_LANG}catch(e){}if(typeof MK_HOST_LANG!=='undefined'&&MK_HOST_LANG)return 'about.html';return (l&&l!=='vi')?l+'/about.html':'about.html'}

function esc(s){ return String(s??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff/36e5);
  if(h < 1) return t('just_now');
  if(h < 24) return h + ' ' + t('hours_ago');
  return Math.floor(h/24) + ' ' + t('days_ago');
}
/* 읽기 시간 추정 — HTML 제거 후 글자수 기준 (한국어 약 450자/분) */
function readTime(html){
  const txt = String(html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const min = Math.max(1, Math.round(txt.length / 450));
  return min + t('read_min');
}
/* 에셋 캐시 버전 — HTML의 ?v= 를 그대로 물려받는다.
   이미지·SVG처럼 HTML에 직접 안 적히는 파일에도 같은 버전을 붙이기 위함. */
const MK_V = (()=>{
  const s = document.querySelector('script[src*="data.js"]');
  const m = s && s.getAttribute('src').match(/[?&]v=([^&]+)/);
  return m ? m[1] : '';
})();
function mkAsset(path){ return MK_V ? path + (path.includes('?')?'&':'?') + 'v=' + MK_V : path; }

/* 영상 URL → 임베드 주소. 관리자가 유튜브 주소를 그대로 붙여넣어도 동작하게 변환한다.
   지원: youtube.com/watch?v= · youtu.be/ · /embed/ · vimeo.com/ · 그 외는 입력값 그대로 */
function ytEmbed(url){
  const u = String(url||'').trim();
  if(!u) return '';
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(m) return 'https://www.youtube.com/embed/' + m[1];
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(m) return 'https://player.vimeo.com/video/' + m[1];
  return u;
}

/* 영상 자리 마크업. 유튜브는 플레이어(≈850KB JS)를 바로 싣지 않고 썸네일+재생 버튼만 두었다가
   누를 때 iframe 으로 바꾼다(2026-08-19 Lighthouse: 제품 상세 전송량의 1/3이 유튜브 플레이어였다). */
function mkVideoEmbed(url){
  const src = ytEmbed(url);
  if(!src) return '';
  const yt = src.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if(yt){
    return `<div class="pd-video yt-lite" data-embed="${esc(src)}" style="background-image:url('https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg')" onclick="mkPlayVideo(this)"><button type="button" class="yt-play" aria-label="Play video"></button></div>`;
  }
  return `<div class="pd-video"><iframe src="${esc(src)}" allowfullscreen loading="lazy" title="video"></iframe></div>`;
}
function mkPlayVideo(el){
  const src = el.getAttribute('data-embed'); if(!src) return;
  el.classList.remove('yt-lite'); el.removeAttribute('style'); el.onclick = null;
  el.innerHTML = `<iframe src="${esc(src + (src.includes('?') ? '&' : '?') + 'autoplay=1')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="video"></iframe>`;
}
function toast(msg){
  let el = document.querySelector('.toast');
  if(!el){ el = document.createElement('div'); el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), 2600);
}

/* 헤더 아이콘 — 전부 인라인 SVG.
   이모지를 쓰면 기기마다 모양이 달라지고 사이트가 가벼워 보인다(사용자 지시로 이모지 금지). */
const MK_ICO = {
  search:  `<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  heart:   `<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5c0 5-7 9.5-7 9.5z"/></svg>`,
  user:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-3.6 4-5.6 7.5-5.6s6.6 2 7.5 5.6"/></svg>`,
  logout:  `<svg viewBox="0 0 24 24"><path d="M14 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8"/><path d="M17 15l3-3-3-3"/><path d="M20 12H10"/></svg>`,
  factory: `<svg viewBox="0 0 24 24"><path d="M3 20V11l5 3V11l5 3V6l8 5v9z"/><path d="M3 20h18"/></svg>`,
};

/* ---------- header / footer ---------- */
function renderChrome(active){
  /* 부팅 전 첫 렌더는 세션 힌트로 그린다 — 안 그러면 페이지를 옮길 때마다
     비로그인 → 로그인으로 헤더가 두 번 그려져 로그인이 풀렸다 붙었다 하는 것처럼 보인다.
     boot 완료 후 다시 renderChrome이 돌면서 실제 상태로 확정된다. */
  const s = Store.session() || (Store.sessionHint ? Store.sessionHint() : null);

  /* 상단 띠배너 (헤더 바깥 · 스티키 아님)
     문구·노출여부·링크는 관리자 설정(MK_SETTINGS)에서 온다.
     설정이 비어 있으면 i18n 기본 문구로 되돌아간다. */
  const hdr = document.getElementById('mk-header');
  const cfg = (typeof MK_SETTINGS !== 'undefined') ? MK_SETTINGS : {};
  const tbMsg = L(cfg.topbar) || t('topbar_msg');
  const tbOn  = cfg.topbarOn !== false && !!tbMsg;

  const old = document.getElementById('mk-topbar');
  if(old && !tbOn) old.remove();                       // 관리자에서 껐다가 언어 전환 시 반영
  if(tbOn && !old && !sessionStorage.getItem('mk_topbar_off')){
    const tb = document.createElement('div');
    tb.id = 'mk-topbar'; tb.className = 'topbar';
    const body = cfg.topbarLink
      ? `<a href="${esc(cfg.topbarLink)}">${esc(tbMsg)}</a>`
      : `<span>${esc(tbMsg)}</span>`;
    tb.innerHTML = `<div class="wrap">${body}<button class="x" onclick="sessionStorage.setItem('mk_topbar_off','1');this.closest('.topbar').remove()">✕</button></div>`;
    hdr.parentNode.insertBefore(tb, hdr);
  }else if(old && (!tbOn || sessionStorage.getItem('mk_topbar_off'))){
    old.remove();                                      // 정적 자리표시자(CLS 방지용)였는데 꺼진 상태면 제거
  }else if(tbOn && old){
    const slot = old.querySelector('.wrap > a, .wrap > span');
    if(slot) slot.textContent = tbMsg;                 // 언어 전환 시 문구만 교체
  }

  /* 헤더 = 상단행(로고 · 알약 검색 · 유틸 아이콘) + 메뉴행. addwel.co.kr 구조를 따랐다. */
  const doSearch = `if(this.value===undefined){var el=document.getElementById('mk-search-input')}else{var el=this}
      if(el.value.trim()){mkTrack('Search',{search_string:el.value.trim()});location.href='directory.html?q='+encodeURIComponent(el.value.trim())}`;

  hdr.innerHTML = `
  <div class="wrap"><div class="mk-head-top"><a class="mk-logo" href="index.html"><img src="${mkAsset('assets/img/logo.png')}" alt="MAKENOV"
        onerror="this.parentNode.classList.add(&quot;txt&quot;);this.remove()"><span>MAKE<b>NOV</b></span></a><div class="mk-search"><input id="mk-search-input" type="search" data-i18n-ph="search_ph"
        onkeydown="if(event.key==='Enter'){${doSearch}}"><span class="ico" role="button" tabindex="0" onclick="${doSearch}">${MK_ICO.search}</span></div><div class="mk-head-right"><div class="mk-lang"><button data-lang="vi" onclick="setLang('vi')">VI</button><button data-lang="ko" onclick="setLang('ko')">KO</button><button data-lang="en" onclick="setLang('en')">EN</button></div><a class="mk-util" href="mypage.html">${MK_ICO.heart}<span class="badge" id="cart-badge">0</span><span class="lb" data-i18n="util_wish"></span></a>
      ${s
        ? `<a class="mk-util" href="mypage.html">${MK_ICO.user}<span class="lb">${esc(s.contactName||s.email.split('@')[0])}</span></a><a class="mk-util" onclick="Store.logout();location.reload()" style="cursor:pointer">${MK_ICO.logout}<span class="lb" data-i18n="logout"></span></a>`
        : `<a class="mk-util" href="mypage.html" onclick="event.preventDefault();openAuth('login')">${MK_ICO.user}<span class="lb" data-i18n="login"></span></a><button class="btn btn-primary btn-sm" style="margin-left:6px;height:40px;padding:0 18px" onclick="openAuth('signup')" data-i18n="signup"></button>`}
    </div></div><nav class="mk-nav mk-head-nav"><a href="${mkUrl('products.html')}" data-i18n="nav_directory"></a><a href="${mkUrl('companies.html')}" data-i18n="nav_companies"></a><a href="${mkUrl('columns.html')}" data-i18n="nav_columns"></a><span class="gnb"><a href="${mkUrl('guide.html')}" data-i18n="nav_guide"></a><span class="drop"><a href="${mkUrl('support.html')}" data-i18n="nav_support"></a><span class="menu"><a href="${mkUrl('support.html#notice')}" data-i18n="nav_sp_notice"></a><a href="${mkUrl('support.html#faq')}" data-i18n="nav_sp_faq"></a><a href="${mkUrl('support.html#ask')}" data-i18n="nav_sp_ask"></a></span></span></span></nav></div>`;
  document.getElementById('mk-footer').innerHTML = `
  <div class="wrap"><div class="brand"><div class="logo"><img src="${mkAsset('assets/img/logo.png')}" alt="MAKENOV"
      onerror="this.parentNode.classList.add(&quot;txt&quot;);this.remove()"><span>MAKE<b>NOV</b></span></div><p class="desc" data-i18n="ft_desc"></p><a class="mail" href="mailto:contact@makenov.com">contact@makenov.com</a></div><div><h4 data-i18n="ft_platform"></h4><a href="${mkUrl('products.html')}" data-i18n="nav_directory"></a><a href="${mkUrl('companies.html')}" data-i18n="nav_companies"></a><a href="${mkUrl('columns.html')}" data-i18n="nav_columns"></a></div><div><h4 data-i18n="ft_partner"></h4><a href="mypage.html" onclick="return mkFtJoin(event)" data-i18n="ft_join"></a><a href="mypage.html" data-i18n="ft_verify"></a><a href="maker.html" data-i18n="util_maker"></a></div><div><h4 data-i18n="ft_support"></h4><a href="${mkUrl('support.html')}" data-i18n="nav_support"></a><a href="${mkUrl('guide.html')}" data-i18n="nav_guide"></a><a href="${mkUrl('support.html#ask')}" data-i18n="ft_contact"></a><a href="sitemap.html" data-i18n="ft_sitemap"></a></div></div><div class="base"><span>© 2026 MAKENOV. All rights reserved.</span><span class="ft-lang"><button data-lang="vi" onclick="setLang('vi')">Tiếng Việt</button><button data-lang="ko" onclick="setLang('ko')">한국어</button><button data-lang="en" onclick="setLang('en')">English</button></span></div>`;
  updateCartBadge();
  applyI18n();
}
/* 푸터 '유통 파트너 가입': 비로그인은 가입 모달, 로그인 상태면 마이페이지로 */
function mkFtJoin(ev){
  let on = false; try{ on = !!(Store.session() || (Store.sessionHint && Store.sessionHint())); }catch(e){}
  if(on) return true;
  if(ev) ev.preventDefault();
  openAuth('signup');
  return false;
}
function updateCartBadge(){
  const b = document.getElementById('cart-badge');
  if(b) b.textContent = Store.cart().length;
}

/* ---------- lock gating: CTA requires verified session ---------- */
function requireAuth(fn){
  if(Store.session()) { fn(); return; }
  toast(t('auth_need'));
  openAuth('signup');
}
function unlockIfAuthed(){
  if(Store.session()) document.querySelectorAll('.lockval').forEach(el=>el.classList.add('open'));
}

/* ---------- cart ---------- */
function toggleCart(pid, btn){
  requireAuth(()=>{
    const added = Store.cartToggle(pid);
    if(added) mkTrack('AddToWishlist', mkProductParams(mkProduct(pid)));
    toast(added ? t('added_cart') : t('removed_cart'));
    updateCartBadge();
    if(btn){ btn.classList.toggle('on', added); }
    document.dispatchEvent(new CustomEvent('mk:cart'));
  });
}

/* ---------- modals ---------- */
function mkModal(html){
  let back = document.getElementById('mk-modal-back');
  if(!back){
    back = document.createElement('div'); back.id='mk-modal-back'; back.className='modal-back';
    back.addEventListener('click', e=>{ if(e.target===back) closeModal(); });
    document.body.appendChild(back);
  }
  back.innerHTML = `<div class="modal">${html}<button class="x" onclick="closeModal()">✕</button></div>`;
  back.classList.add('open');
  applyI18n(back);
}
function closeModal(){ const b=document.getElementById('mk-modal-back'); if(b) b.classList.remove('open'); }

/* ---------- auth modal — 단일 화면 가입 ----------
   이전에는 3단계로 나눠 받았는데, 단계마다 이탈이 생겼다.
   지금은 한 화면에 전부 보여주고, 사업자 인증만 그 자리에서 인라인으로 처리한다.
   인증에 실패하거나 번호가 없는 유통 파트너도 '간편 문의'로 빠져나가지 않게 한다. */
let _verified = null;          // 인증 통과 결과
let _suCountry = 'VN';         // 선택된 국가

function openAuth(mode){
  if(mode==='login'){
    mkModal(`
      <h2 data-i18n="auth_login_title"></h2>
      <p class="sub" data-i18n="auth_signup_sub"></p>
      <div class="f-row"><label data-i18n="auth_email"></label>
        <input id="li-email" type="email" autocomplete="email"
               onkeydown="if(event.key==='Enter')doLogin()"></div>
      <div class="f-row"><label data-i18n="auth_password"></label>
        <input id="li-pw" type="password" autocomplete="current-password"
               onkeydown="if(event.key==='Enter')doLogin()"></div>
      <div class="mst-result err" id="li-err" style="display:none"></div>
      <button class="btn btn-primary btn-block" onclick="doLogin()" data-i18n="login"></button>
      <p class="switch-auth"><span data-i18n="auth_none"></span> <a onclick="openAuth('signup')" data-i18n="signup"></a></p>`);
    return;
  }
  _verified = null;
  _suCountry = MK_LANG === 'ko' ? 'KR' : (MK_LANG === 'en' ? 'US' : 'VN');

  mkModal(`
    <h2 data-i18n="auth_signup_title"></h2>
    <p class="sub" data-i18n="auth_signup_sub"></p>

    <div class="fs">
      <div class="fs-t" data-i18n="auth_grp_company"></div>
      <div class="f-row"><label data-i18n="auth_country"></label>
        <select id="su-country" onchange="suCountryChange(this.value)">
          ${MK_COUNTRIES.map(c=>`<option value="${c.code}">${c.flag} ${esc(L(c.name))}</option>`).join('')}
        </select></div>
      <div id="su-verify"></div>
      <div class="mst-result" id="v-result" style="display:none"></div>

      <!-- 왜 받는지 설명 : 이게 없으면 세금코드 입력에서 멈춘다 -->
      <div class="why-box">
        <b data-i18n="auth_why_title"></b>
        <ul>
          <li data-i18n="auth_why_1"></li>
          <li data-i18n="auth_why_2"></li>
          <li data-i18n="auth_why_3"></li>
        </ul>
      </div>
    </div>

    <div class="fs">
      <div class="fs-t" data-i18n="auth_grp_contact"></div>
      <div class="f-2col">
        <div class="f-row"><label data-i18n="auth_contact_name"></label><input id="su-name" autocomplete="name"></div>
        <div class="f-row"><label data-i18n="auth_position"></label><input id="su-position"></div>
      </div>
      <div class="f-row"><label data-i18n="auth_phone"></label>
        <div class="mst-row">
          <input id="su-dial" readonly style="max-width:78px;text-align:center">
          <input id="su-phone" inputmode="tel">
        </div></div>
    </div>

    <div class="fs">
      <div class="fs-t" data-i18n="auth_grp_account"></div>
      <div class="f-row"><label data-i18n="auth_email"></label>
        <input id="su-email" type="email" autocomplete="email" placeholder="name@company.com">
        <p class="f-hint" data-i18n="auth_id_hint"></p></div>
      <div class="f-2col">
        <div class="f-row"><label data-i18n="auth_password"></label>
          <input id="su-pw" type="password" autocomplete="new-password" oninput="pwCheck()"></div>
        <div class="f-row"><label data-i18n="auth_password2"></label>
          <input id="su-pw2" type="password" autocomplete="new-password" oninput="pwCheck()"></div>
      </div>
      <p class="pw-msg" id="pw-msg"></p>
    </div>

    <button class="btn btn-primary btn-block" onclick="suDone()" data-i18n="auth_done"></button>

    <!-- 인증이 막혔을 때 빠져나갈 문 -->
    <div class="easy-out">
      <span data-i18n="auth_hard"></span>
      <a onclick="openEasyLead()" data-i18n="auth_easy_cta"></a>
    </div>

    <p class="switch-auth"><span data-i18n="auth_have"></span> <a onclick="openAuth('login')" data-i18n="login"></a></p>`);

  const sel = document.getElementById('su-country');
  if(sel) sel.value = _suCountry;
  suCountryChange(_suCountry);
}

/* 국가를 바꾸면 인증란만 그 자리에서 교체된다 (화면 이동 없음) */
function suCountryChange(code){
  _suCountry = code;
  _verified = null;
  const c = mkCountry(code);
  const box = document.getElementById('v-result');
  if(box) box.style.display = 'none';

  let inner = '';
  if(c.method === 'mst'){
    inner = `
      <div class="f-row"><label data-i18n="auth_mst"></label>
        <div class="mst-row">
          <input id="v-regno" inputmode="numeric" maxlength="14" placeholder="0100109106">
          <button class="btn btn-soft" id="v-btn" onclick="runVerify()" data-i18n="auth_mst_check"></button>
        </div>
        <p class="f-hint" data-i18n="auth_mst_hint"></p></div>`;
  } else if(c.method === 'brn'){
    inner = `
      <div class="f-row"><label data-i18n="auth_company"></label><input id="v-company" placeholder="(주)메이크노브"></div>
      <div class="f-row"><label data-i18n="auth_brn"></label>
        <div class="mst-row">
          <input id="v-regno" inputmode="numeric" maxlength="12" placeholder="123-45-67890"
                 oninput="this.value=formatBRN(this.value)">
          <button class="btn btn-soft" id="v-btn" onclick="runVerify()" data-i18n="auth_mst_check"></button>
        </div>
        <p class="f-hint" data-i18n="auth_brn_hint2"></p></div>`;
  } else {
    inner = `
      <div class="f-row"><label data-i18n="auth_company"></label><input id="v-company"></div>
      <div class="f-row"><label data-i18n="auth_biz_email"></label>
        <div class="mst-row">
          <input id="v-email" type="email" placeholder="name@company.com">
          <button class="btn btn-soft" id="v-btn" onclick="runVerify()" data-i18n="auth_mst_check"></button>
        </div>
        <p class="f-hint" data-i18n="auth_domain_hint"></p></div>`;
  }
  const wrap = document.getElementById('su-verify');
  wrap.innerHTML = inner;
  applyI18n(wrap);

  document.getElementById('su-dial').value = c.dial;
  document.getElementById('su-phone').placeholder = c.phEx;
}

/* 비밀번호 확인 — 오타로 가입해서 못 들어오는 일이 없게 그 자리에서 알려준다 */
function pwCheck(){
  const a = document.getElementById('su-pw').value;
  const b = document.getElementById('su-pw2').value;
  const el = document.getElementById('pw-msg');
  if(!el) return true;
  if(!a && !b){ el.textContent=''; el.className='pw-msg'; return false; }
  if(a.length < 6){ el.textContent = t('auth_pw_short'); el.className='pw-msg bad'; return false; }
  if(!b){ el.textContent=''; el.className='pw-msg'; return false; }
  if(a !== b){ el.textContent = t('auth_pw_diff'); el.className='pw-msg bad'; return false; }
  el.textContent = t('auth_pw_ok'); el.className='pw-msg ok';
  return true;
}

/* 국가별 인증 실행 — 화면 이동 없이 결과만 표시 */
async function runVerify(){
  const box = document.getElementById('v-result');
  const btn = document.getElementById('v-btn');
  const val = id => { const el=document.getElementById(id); return el ? el.value.trim() : ''; };

  /* 재인증 시작 시 직전 결과를 반드시 폐기 — 실패 후 이전 통과분으로 가입되는 것을 차단 */
  _verified = null;

  btn.disabled = true; btn.textContent = t('auth_verifying');
  box.style.display = 'none';

  const res = await verifyBusiness(_suCountry, {
    regNo: val('v-regno'), company: val('v-company'),
    email: val('v-email') || val('su-email'),
  });

  btn.disabled = false; btn.textContent = t('auth_mst_check');
  box.style.display = 'block';

  if(!res.ok){
    const key = 'err_' + res.err;
    const dict = I18N[MK_LANG] || I18N.vi;
    box.className = 'mst-result err';
    box.innerHTML = (dict[key] || I18N.vi[key] || t('auth_mst_fail'))
      + `<div class="retry"><a onclick="openEasyLead()" data-i18n="auth_easy_cta"></a></div>`;
    applyI18n(box);
    return;
  }

  _verified = { ...res, country:_suCountry, regNo: val('v-regno') };
  box.className = 'mst-result';
  box.innerHTML = `✓ <b>${t('auth_mst_ok')}</b><br>${esc(res.company)}`
    + (res.address ? `<br><span style="color:var(--mk-muted)">${esc(res.address)}</span>` : '')
    + (res.status  ? `<br><span style="color:var(--mk-muted);font-size:12px">${esc(res.status)}</span>` : '');

  /* 회사명이 비어 있으면 인증으로 받아온 상호를 채워준다 */
  const cf = document.getElementById('v-company');
  if(cf && !cf.value) cf.value = res.company || '';
}

async function suDone(){
  if(!_verified){ toast(t('auth_need_verify'));
    const b=document.getElementById('v-result'); if(b) b.scrollIntoView({block:'center'});
    return; }
  const c = mkCountry(_suCountry);
  const v = id => { const el=document.getElementById(id); return el ? el.value.trim() : ''; };
  const email = (_verified.accountEmail || v('su-email')).toLowerCase();
  const pw = document.getElementById('su-pw').value;

  if(!v('su-name') || !v('su-phone')){ toast(t('auth_need_basic')); return; }
  if(!/^\S+@\S+\.\S+$/.test(email)){ toast(t('err_invalid_email')); return; }
  if(pw.length < 6){ toast(t('auth_pw_short')); document.getElementById('su-pw').focus(); return; }
  if(pw !== document.getElementById('su-pw2').value){
    toast(t('auth_pw_diff'));
    const el = document.getElementById('su-pw2'); el.focus(); el.select();
    return;
  }

  const res = await Store.signup({
    email, password: pw,
    country: _suCountry, countryName: L(c.name),
    regNo: _verified.regNo, mst: _verified.regNo,        // mst = 하위호환 필드
    company: _verified.company, address: _verified.address, status: _verified.status,
    verifiedBy: _verified.checked,                        // gov | nts | checksum | domain
    contactName: v('su-name'), position: v('su-position'),
    phone: c.dial + ' ' + v('su-phone'),
    zalo: c.dial + ' ' + v('su-phone'),                   // zalo = 하위호환 필드
    /* 서버가 같은 값으로 다시 검증해 인증 상태를 확정한다 (자가 승격 차단) */
    verifyPayload: { method:c.method, country:_suCountry,
                     regNo:_verified.regNo, company:_verified.company,
                     email:(_verified.accountEmail || v('su-email')) },
  });
  if(!res.ok){ toast(res.err==='exists' ? t('err_exists') : t('auth_mst_fail')); return; }

  /* ★ 가입 = 사업자 인증 통과까지 끝난 상태. 광고 최적화의 핵심 전환. */
  mkTrack('CompleteRegistration', {
    status: true,                       // 인증까지 완료됨
    content_name: _verified.checked,    // gov | nts | checksum | domain
    content_category: _suCountry,
  });

  closeModal(); toast(t('auth_welcome'));
  setTimeout(()=>location.reload(), 700);
}

/* ---------- 간편 문의 ----------
   사업자 인증이 안 되거나 번호가 없는 유통 파트너를 그냥 놓치지 않기 위한 경로.
   가입 없이 연락처만 받아 관리자가 직접 인증을 도와준다. */
function openEasyLead(){
  const c = mkCountry(_suCountry);
  mkModal(`
    <h2 data-i18n="easy_title"></h2>
    <p class="sub" data-i18n="easy_sub"></p>
    <div class="lp-err" id="easy-err"></div>
    <div class="f-2col">
      <div class="f-row"><label data-i18n="auth_company"></label><input id="ez-company"></div>
      <div class="f-row"><label data-i18n="auth_contact_name"></label><input id="ez-name"></div>
    </div>
    <div class="f-2col">
      <div class="f-row"><label data-i18n="auth_email"></label><input id="ez-email" type="email"></div>
      <div class="f-row"><label data-i18n="auth_phone"></label><input id="ez-tel" inputmode="tel" placeholder="${esc(c.dial)} ${esc(c.phEx)}"></div>
    </div>
    <div class="f-row"><label data-i18n="easy_need"></label>
      <textarea id="ez-msg" rows="3" data-i18n-ph="easy_need_ph"></textarea></div>
    <button class="btn btn-primary btn-block" onclick="sendEasyLead()" data-i18n="easy_send"></button>
    <div class="easy-out"><span data-i18n="easy_back"></span>
      <a onclick="openAuth('signup')" data-i18n="signup"></a></div>`);
}

async function sendEasyLead(){
  const v = id => document.getElementById(id).value.trim();
  const err = document.getElementById('easy-err');
  const show = m => { err.textContent = m; err.style.display = 'block'; };
  if(!v('ez-company') || !v('ez-name')) return show(t('auth_need_basic'));
  if(!v('ez-email') && !v('ez-tel'))    return show(t('easy_need_contact'));

  await Store.addMakerLead({
    company: v('ez-company'), name: v('ez-name'),
    tel: v('ez-tel') || '-', email: v('ez-email') || '-',
    site: '', cat: 'buyer',                    // cat=buyer → 관리자에서 유통 파트너 문의로 구분
    message: '[유통 파트너 간편문의 · ' + _suCountry + '] ' + v('ez-msg'),
  });
  mkTrack('Lead', { content_category:'easy_lead', country:_suCountry });
  closeModal();
  toast(t('easy_ok'));
}

async function doLogin(){
  const email = document.getElementById('li-email').value.trim();
  const res = await Store.login(email, document.getElementById('li-pw').value);
  if(res && res.ok){ closeModal(); setTimeout(()=>location.reload(), 400); return; }

  const box = document.getElementById('li-err');
  const err = (res && res.err) || 'invalid';

  /* 이메일 미확인이면 재발송 버튼까지 같이 준다 — 이게 로그인 실패의 가장 흔한 원인 */
  if(err === 'unconfirmed'){
    box.innerHTML = `${t('err_unconfirmed')}
      <div class="retry"><a onclick="resendConfirm('${esc(email)}')" data-i18n="auth_resend"></a></div>`;
    applyI18n(box);
  }else if(err === 'provider_off'){
    box.textContent = t('err_provider_off');
  }else{
    box.textContent = err === 'rate' ? t('err_rate') : t('err_login');
  }
  box.style.display = 'block';
  if(res && res.raw) console.warn('로그인 실패 원인:', res.raw);
}

async function resendConfirm(email){
  if(!Store.resendConfirm){ toast(t('err_login')); return; }
  const r = await Store.resendConfirm(email);
  toast(r.ok ? t('auth_resend_ok') : (r.err || t('err_login')));
}

/* ---------- inquiry modal ---------- */
function openInquiry(pids){    // pids: array of product ids
  requireAuth(()=>{
    const items = pids.map(id=>mkProduct(id)).filter(Boolean);
    inqMode = 'quick';          // 열 때마다 간단 문의로 시작 (문턱을 낮게)
    /* 문의 모달을 연 시점 = 퍼널 중간. 발송(Lead)보다 볼륨이 많아
       초기 광고 최적화 이벤트로 쓸 수 있다. */
    mkTrack('InitiateCheckout', {
      content_ids: items.map(p=>p.id), content_type:'product',
      contents: items.map(p=>({ id:p.id, quantity:1 })), num_items: items.length,
    });
    /* 문의는 두 갈래다.
       ① 간단히 물어보기 — 아직 수량이 없는 사람. 질문 한 칸이면 충분하고,
          여기서 구조화된 폼을 들이대면 그냥 나가버린다.
       ② 견적 요청 — 살 마음이 선 사람. 공급사가 단가를 내려면
          수량·시기·채널이 반드시 있어야 한다.
       (DB는 message 한 칸이라, 아래 값들을 라벨 붙여 조립해 넣는다) */
    const opt = (v,k)=>`<option value="${v}">${esc(t(k))}</option>`;
    mkModal(`
      <h2 data-i18n="inq_title"></h2>
      <p class="sub">${items.map(p=>esc(L(p.name))).join(' · ')}</p>

      <div class="inq-modes three">
        <button type="button" class="on" data-mode="quick" onclick="setInqMode('quick')">
          <b data-i18n="inq_mode_quick"></b><span data-i18n="inq_mode_quick_d"></span></button>
        <button type="button" data-mode="quote" onclick="setInqMode('quote')">
          <b data-i18n="inq_mode_quote"></b><span data-i18n="inq_mode_quote_d"></span></button>
        <button type="button" data-mode="meet" onclick="setInqMode('meet')">
          <b data-i18n="inq_mode_meet"></b><span data-i18n="inq_mode_meet_d"></span></button>
      </div>

      <!-- ① 간단히 물어보기 -->
      <div id="inq-quick">
        <div class="f-row"><label data-i18n="inq_q_msg"></label>
          <textarea id="inq-qmsg" rows="5" data-i18n-ph="inq_q_ph"></textarea></div>
      </div>

      <!-- ③ 미팅 요청 -->
      <div id="inq-meet" hidden>
        <div class="f-row"><label data-i18n="inq_meet_when"></label>
          <select id="inq-mwhen">${opt('morning','inq_w_morning')}${opt('afternoon','inq_w_afternoon')}${opt('any','inq_w_any')}</select></div>
        <div class="f-row"><label data-i18n="inq_meet_msg"></label>
          <textarea id="inq-mmsg" rows="4" data-i18n-ph="inq_meet_ph"></textarea></div>
        <p class="inq-auto" data-i18n="inq_meet_note"></p>
      </div>

      <!-- ② 견적 요청 -->
      <div id="inq-quote" hidden>
      <div class="f-3col">
        <div class="f-row"><label data-i18n="inq_qty"></label>
          <input id="inq-qty" inputmode="numeric" data-i18n-ph="inq_qty_ph"></div>
        <div class="f-row"><label data-i18n="inq_unit"></label>
          <select id="inq-unit">${opt('ea','inq_u_ea')}${opt('box','inq_u_box')}${opt('set','inq_u_set')}${opt('kg','inq_u_kg')}</select></div>
        <div class="f-row"><label data-i18n="inq_when"></label>
          <select id="inq-when">${opt('asap','inq_w_asap')}${opt('1m','inq_w_1m')}${opt('3m','inq_w_3m')}${opt('plan','inq_w_plan')}</select></div>
      </div>

      <div class="f-2col">
        <div class="f-row"><label data-i18n="inq_channel"></label>
          <select id="inq-ch">${opt('pharmacy','inq_c_pharmacy')}${opt('cosmetic','inq_c_cosmetic')}${opt('mart','inq_c_mart')}${opt('online','inq_c_online')}${opt('whole','inq_c_whole')}${opt('etc','inq_c_etc')}</select></div>
        <div class="f-row"><label data-i18n="inq_dest"></label>
          <input id="inq-dest" data-i18n-ph="inq_dest_ph"></div>
      </div>

      <div class="f-row"><label data-i18n="inq_docs"></label>
        <div class="chk-row">
          <label><input type="checkbox" id="inq-d1"><span data-i18n="inq_d_ingr"></span></label>
          <label><input type="checkbox" id="inq-d2"><span data-i18n="inq_d_co"></span></label>
          <label><input type="checkbox" id="inq-d3"><span data-i18n="inq_d_test"></span></label>
          <label><input type="checkbox" id="inq-d4"><span data-i18n="inq_d_cat"></span></label>
        </div></div>

      <label class="chk-one"><input type="checkbox" id="inq-sample"><span data-i18n="inq_sample"></span></label>

      <div class="f-row"><label data-i18n="inq_more"></label>
        <textarea id="inq-msg" rows="3" data-i18n-ph="inq_more_ph"></textarea></div>
      </div>

      <p class="inq-auto" data-i18n="inq_auto"></p>
      <button class="btn btn-primary btn-block" onclick="sendInquiry('${pids.join(',')}')" data-i18n="inq_send"></button>`);
  });
}

/* 간단히 물어보기 ↔ 견적 요청 전환 */
let inqMode = 'quick';
function setInqMode(m){
  inqMode = m;
  document.querySelectorAll('.inq-modes button').forEach(b=>b.classList.toggle('on', b.dataset.mode===m));
  ['quick','quote','meet'].forEach(k=>{
    const el = document.getElementById('inq-'+k);
    if(el) el.hidden = m !== k;
  });
}

/* 폼 값을 공급사가 그대로 읽을 수 있는 형태로 조립한다.
   맨 앞의 [간단 문의] / [견적 요청] 표시로 공급사가 답변 무게를 바로 안다. */
function buildInquiryMessage(){
  const v  = id => { const el=document.getElementById(id); return el ? el.value.trim() : ''; };
  const ck = id => { const el=document.getElementById(id); return el && el.checked; };
  const sel = id => { const el=document.getElementById(id); return el ? el.options[el.selectedIndex].text : ''; };

  if(inqMode === 'quick') return `[${t('inq_mode_quick')}]\n${v('inq-qmsg')}`;
  if(inqMode === 'meet')  return `[${t('inq_mode_meet')}]\n${t('inq_meet_when')}: ${sel('inq-mwhen')}\n${v('inq-mmsg')}`;

  const docs = [ck('inq-d1')&&t('inq_d_ingr'), ck('inq-d2')&&t('inq_d_co'),
                 ck('inq-d3')&&t('inq_d_test'), ck('inq-d4')&&t('inq_d_cat')].filter(Boolean);

  const lines = [
    `[${t('inq_mode_quote')}]`,
    `${t('inq_qty')}: ${v('inq-qty')} ${sel('inq-unit')}`,
    `${t('inq_when')}: ${sel('inq-when')}`,
    `${t('inq_channel')}: ${sel('inq-ch')}`,
  ];
  if(v('inq-dest'))   lines.push(`${t('inq_dest')}: ${v('inq-dest')}`);
  if(ck('inq-sample'))lines.push(`${t('inq_sample')}`);
  if(docs.length)     lines.push(`${t('inq_docs')}: ${docs.join(', ')}`);
  if(v('inq-msg'))    lines.push('', v('inq-msg'));
  return lines.join('\n');
}
async function sendInquiry(pidCsv){
  const btn = document.querySelector('#mk-modal-back .btn-primary');
  const pids = pidCsv.split(',');

  /* 모드별 필수값 — 간단 문의는 질문, 견적 요청은 수량(없으면 단가를 못 낸다) */
  if(inqMode === 'quick'){
    const q = document.getElementById('inq-qmsg');
    if(q && !q.value.trim()){ toast(t('inq_need_msg')); q.focus(); return; }
  }else if(inqMode === 'meet'){
    const m = document.getElementById('inq-mmsg');
    if(m && !m.value.trim()){ toast(t('inq_need_msg')); m.focus(); return; }
  }else{
    const qty = document.getElementById('inq-qty');
    if(qty && !qty.value.trim()){ toast(t('inq_need_qty')); qty.focus(); return; }
  }

  const msg = buildInquiryMessage();

  if(btn){ btn.disabled = true; btn.textContent = t('inq_sending'); }

  /* ★ 예전에는 결과를 확인하지 않고 무조건 '접수 완료'를 띄웠다.
     저장이 실패해도 성공으로 보여서 문의가 조용히 사라졌다. */
  const results = await Promise.all(pids.map(pid => Store.addInquiry(pid, msg)));
  const failed  = results.filter(r => !r || !r.ok);

  if(btn){ btn.disabled = false; btn.textContent = t('inq_send'); }

  if(failed.length){
    const err = failed[0].err || '';
    /* RLS가 막은 경우 = 아직 인증 상태가 아님 */
    const msgKey = /row-level security|permission/i.test(err) ? 'inq_err_verify'
                 : err === 'auth' ? 'auth_need' : 'inq_err';
    toast(t(msgKey));
    console.error('문의 저장 실패:', err);
    return;
  }

  /* ★ 주 전환 — 저장 성공을 확인한 뒤에만 쏜다.
     간단 문의와 견적 요청은 의도 온도가 달라 카테고리를 나눈다(광고 최적화 분리용). */
  const items = pids.map(id=>mkProduct(id)).filter(Boolean);
  mkTrack('Lead', {
    content_ids: items.map(p=>p.id), content_type:'product',
    contents: items.map(p=>({ id:p.id, quantity:1 })),
    num_items: items.length,
    content_category: 'inquiry_' + inqMode,   // quick | quote | meet
  });

  closeModal(); toast(t('inq_ok'));
  document.dispatchEvent(new CustomEvent('mk:inquiry'));
}
function openCatalog(pid){
  requireAuth(()=>{ toast(t('catalog_ok')); });
}

/* ---------- shared renderers ---------- */
function companyCard(c){
  const n = mkCompanyProducts(c.id).length;
  return `
  <a class="co-card" href="${mkDocUrl('company',c.id)}"><div class="cv"><img src="${c.cover}" alt="" loading="lazy"></div><div class="bd"><img class="lg" src="${c.logo}" alt="${esc(L(c.name))}" loading="lazy"><h3>${esc(L(c.name))}</h3><p class="tag">${esc(L(c.tagline))}</p><div class="meta"><span>${esc(L(c.location))}</span><i></i><span><b>${n}</b> <span data-i18n="co_prod_unit"></span></span><i></i><span>since ${esc(c.since)}</span></div></div></a>`;
}
/* 카드 지표 — 문의수는 0이어도 항상 표시한다(사용자 지시).
   관심(wish)은 0이면 생략. */
function cardMeta(p){
  const inq  = Number(p.inquiries) || 0;
  const wish = Number(p.wish) || 0;
  let html = `<span class="rate">${inq}<span data-i18n="inquiries_count"></span></span>`;
  if(wish) html += `<span class="amt">${t('wish_count').replace('{n}', wish)}</span>`;
  return html;
}

function productCard(p){
  const inCart = Store.cartHas(p.id);
  const flag = p.isNew ? `<span class="flag" data-i18n="spot_new"></span>` : (p.featured?`<span class="flag">FEATURED</span>`:'');
  return `
  <a class="p-card" href="${mkDocUrl('product',p.id)}"><div class="thumb"><img src="${p.img}" alt="${esc(L(p.name))}" loading="lazy">${flag}
      <button class="heart ${inCart?'on':''}" onclick="event.preventDefault();event.stopPropagation();toggleCart('${p.id}',this)">${inCart?'♥':'♡'}</button></div><div class="body"><span class="brand">${esc(p.brand)}</span><h3>${esc(L(p.name))}</h3><div class="meta">${cardMeta(p)}<span class="left">${esc(p.origin)}</span></div></div></a>`;
}

/* 사전 렌더(크롤러용 정적 사본) → 실제 렌더 교체. 한 번만 */
function mkSwapPrerender(){
  const pre = document.getElementById('mk-prerender');
  if(pre) pre.remove();
  document.documentElement.classList.remove('mk-pre');
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  document.documentElement.lang = MK_LANG;

  /* 0) 사전 렌더 블록 제거.
        prerender.js 가 크롤러용으로 구워 넣은 정적 사본이다. JS가 도는 브라우저에서는
        아래에서 실제 렌더가 일어나므로 부팅 첫 줄에서 걷어낸다.
        (원본 컨테이너는 그대로 남아 있어서 pageInit 이 평소대로 채운다) */
  /* ★ 2026-08-19: 부팅 첫 줄에서 바로 지우면 데이터가 올 때까지(≈1초) 페이지가 빈 껍데기로
        주저앉았다가 다시 펴진다(Lighthouse CLS 0.999). 그래서 실제 렌더가 끝날 때까지는
        사전 렌더를 그대로 보여 주고(헤더·푸터 정적 사본만 숨김), 런타임 컨테이너는 숨겨 둔다.
        교체는 아래 mkSwapPrerender() — 첫 pageInit 직후 한 번. */
  const pre = document.getElementById('mk-prerender');
  /* 랜딩처럼 사전 렌더가 display:none(정적 헤더·푸터 사본뿐)인 페이지는 교체할 화면이 없으므로 제외 */
  if(pre && pre.style.display !== 'none') document.documentElement.classList.add('mk-pre');

  /* 0-B) 구워둔 카피를 먼저 덮는다.
     관리자에서 고친 문구는 DB에 있는데, 그걸 받아오는 데 1초쯤 걸린다.
     그동안 화면은 data.js·i18n.js 의 옛 문구로 그려졌다가 나중에 새 문구로 바뀌었다.
     새로고침할 때마다 옛 문구가 번쩍이던 이유다.
     bake.js 가 굽는 시점의 수정분을 baked.js 에 함께 넣어 두므로, 첫 렌더 전에 씌운다.
     ⚠ 여기여야 한다. about-copy.js · maker-copy.js 는 app.js 뒤에 실려서
       copy.js 안에서 덮으면 그 두 파일은 아직 없다. */
  if(window.MK_COPY_BAKED && typeof mkApplyCopy === 'function'){
    window.MK_COPY_OVERRIDE = window.MK_COPY_BAKED;
    mkApplyCopy(window.MK_COPY_BAKED);
  }

  /* 1) 헤더·푸터·번역을 먼저 그린다.
        Supabase 응답을 기다렸다가 그리면, 그동안 정적 HTML(제목만)이 홀로 떠 있다가
        데이터가 도착하는 순간 전체가 다시 그려져 화면이 깜빡인다. */
  renderChrome();
  applyI18n();

  /* 1-B) DB가 필요 없는 페이지는 여기서 바로 그린다.
     예전엔 모든 페이지가 MkData.boot()(제품·회사·칼럼 전부 로드)를 기다린 뒤에야
     pageInit()이 돌아서, 공지·FAQ만 쓰는 고객센터까지 몇 초씩 빈 화면이었다.
     시드(data.js)만으로 완성되는 화면을 먼저 띄우고, 부팅 후 한 번 더 그려 확정한다. */
  if(window.MK_EARLY_RENDER && typeof pageInit === 'function'){
    try{ pageInit(); applyI18n(); }catch(e){ console.warn('early render 실패', e); }
  }

  /* 2) 그다음 데이터 */
  if(typeof MkData !== 'undefined'){
    try{
      await MkData.boot();
      /* 이메일 확인 후 첫 진입이면 보관해 둔 인증 결과를 프로필에 반영한다 */
      if(Store._flushPendingProfile) await Store._flushPendingProfile();
      await Store.loadCart();
    }
    catch(e){ console.error('MAKENOV 백엔드 연결 실패 — 시드 데이터로 표시합니다', e); }
  }
  if(typeof MkImg !== 'undefined'){ try{ await MkImg.hydrate(); }catch(e){} }

  /* 3) 부팅이 끝나면 헤더를 실제 세션 상태로 확정한다.
        힌트가 로그인이라고 그렸는데 토큰이 만료된 경우까지 바로잡아야 하므로
        세션 유무와 무관하게 항상 다시 그린다. */
  if(typeof MkData !== 'undefined') renderChrome();
  if(typeof pageInit === 'function') pageInit();
  applyI18n();
  mkSwapPrerender();
  unlockIfAuthed();
  document.addEventListener('mk:lang', ()=>{ renderChrome(); if(typeof pageInit==='function') pageInit(); applyI18n(); unlockIfAuthed(); });
});
