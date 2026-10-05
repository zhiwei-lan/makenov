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
  /* 본문 안 <style> 의 CSS 까지 글자수로 세고 있었다 — 2분짜리 글이 43분으로 나오던 원인.
     bake-columns.js stripHtml 과 같은 규칙(2026-08-28). */
  const txt = String(html||'').replace(/<(style|script)[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const min = Math.max(1, Math.round(txt.length / 450));
  return min + t('read_min');
}
/* 칼럼 읽기 시간 — 본문이 있으면 직접 세고, 없으면(목록은 본문을 안 받는다) 서버가 센 read_min */
function colRead(c){
  if(c && c.body) return readTime(L(c.body));
  const m = c && c.readMin ? Number(L(c.readMin)) : 0;
  return m ? m + t('read_min') : '';
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
  const langUi = {
    vi: { flag:'🇻🇳', code:'VI', name:'Tiếng Việt' },
    ko: { flag:'🇰🇷', code:'KO', name:'한국어' },
    en: { flag:'🇺🇸', code:'EN', name:'English' },
  };
  const currentLangUi = langUi[MK_LANG] || langUi.vi;
  const mobileLangMenu = `<details class="mk-lang-mobile"><summary><span class="flag">${currentLangUi.flag}</span><b>${currentLangUi.code}</b></summary><div class="menu">${Object.entries(langUi).map(([lang,item]) => `<a class="${lang===MK_LANG?'on':''}" href="${esc(mkLangHref(lang) || location.href)}" onclick="localStorage.setItem('mk_lang','${lang}')"><span class="flag">${item.flag}</span><span>${item.name}</span></a>`).join('')}</div></details>`;
  const tbMsg = L(cfg.topbar) || t('topbar_msg');
  const tbOn  = cfg.topbarOn !== false && !!tbMsg;
  /* 탑바 몸통 — 관리자가 링크를 지정했으면 그 주소로, 없으면 문구 클릭 = 가입 모달
     (로그인 상태면 마이페이지 인증 절차로). "인증하면 가격·MOQ 열림" 문구의 목적지. */
  const tbBody = () => cfg.topbarLink
    ? `<a href="${esc(cfg.topbarLink)}">${esc(tbMsg)}</a>`
    : `<a href="mypage.html" onclick="return mkTopbarGo(event)">${esc(tbMsg)}</a>`;

  const old = document.getElementById('mk-topbar');
  if(old && !tbOn) old.remove();                       // 관리자에서 껐다가 언어 전환 시 반영
  if(tbOn && !old && !sessionStorage.getItem('mk_topbar_off')){
    const tb = document.createElement('div');
    tb.id = 'mk-topbar'; tb.className = 'topbar';
    tb.innerHTML = `<div class="wrap">${tbBody()}<button class="x" onclick="sessionStorage.setItem('mk_topbar_off','1');this.closest('.topbar').remove()">✕</button></div>`;
    hdr.parentNode.insertBefore(tb, hdr);
  }else if(old && (!tbOn || sessionStorage.getItem('mk_topbar_off'))){
    old.remove();                                      // 정적 자리표시자(CLS 방지용)였는데 꺼진 상태면 제거
  }else if(tbOn && old){
    const slot = old.querySelector('.wrap > a, .wrap > span');
    if(slot) slot.outerHTML = tbBody();                // 언어 전환·정적 자리표시자 → 클릭 가능한 몸통으로
  }
  /* 탑바 문구 클릭 — 비로그인은 가입 모달, 로그인은 href(마이페이지 인증 절차) 그대로 */
  window.mkTopbarGo = function(e){
    if(Store.session()) return true;
    e.preventDefault(); openAuth('signup'); return false;
  };

  /* 헤더 = 상단행(로고 · 알약 검색 · 유틸 아이콘) + 메뉴행. addwel.co.kr 구조를 따랐다. */
  const doSearch = `if(this.value===undefined){var el=document.getElementById('mk-search-input')}else{var el=this}
      if(el.value.trim()){mkTrack('Search',{search_string:el.value.trim()});location.href='directory.html?q='+encodeURIComponent(el.value.trim())}`;

  hdr.innerHTML = `
  <div class="wrap"><div class="mk-head-top"><a class="mk-logo" href="index.html"><img src="${mkAsset('assets/img/logo.png')}" alt="MAKENOV"
        onerror="this.parentNode.classList.add(&quot;txt&quot;);this.remove()"><span>MAKE<b>NOV</b></span></a><div class="mk-search"><input id="mk-search-input" type="search" data-i18n-ph="search_ph"
        onkeydown="if(event.key==='Enter'){${doSearch}}"><span class="ico" role="button" tabindex="0" onclick="${doSearch}">${MK_ICO.search}</span></div><div class="mk-head-right"><div class="mk-lang"><a data-lang="vi" href="${esc(mkLangHref('vi') || location.href)}" onclick="localStorage.setItem('mk_lang','vi')">VI</a><a data-lang="ko" href="${esc(mkLangHref('ko') || location.href)}" onclick="localStorage.setItem('mk_lang','ko')">KO</a><a data-lang="en" href="${esc(mkLangHref('en') || location.href)}" onclick="localStorage.setItem('mk_lang','en')">EN</a></div>${mobileLangMenu}<a class="mk-util" href="mypage.html">${MK_ICO.heart}<span class="badge" id="cart-badge">0</span><span class="lb" data-i18n="util_wish"></span></a>
      ${s
        ? `<a class="mk-util" href="mypage.html">${MK_ICO.user}<span class="lb">${esc(s.contactName||s.email.split('@')[0])}</span></a><a class="mk-util" onclick="Store.logout();location.reload()" style="cursor:pointer">${MK_ICO.logout}<span class="lb" data-i18n="logout"></span></a>`
        : `<a class="mk-util" href="mypage.html" onclick="event.preventDefault();openAuth('login')">${MK_ICO.user}<span class="lb" data-i18n="login"></span></a><button class="btn btn-primary btn-sm" style="margin-left:6px;height:40px;padding:0 18px" onclick="openAuth('signup')" data-i18n="signup"></button>`}
    </div></div><nav class="mk-nav mk-head-nav"><a href="${mkUrl('products.html')}" data-i18n="nav_directory"></a><a href="${mkUrl('companies.html')}" data-i18n="nav_companies"></a><a href="${mkUrl('meetings.html')}" data-i18n="nav_meetings"></a><a href="${mkUrl('columns.html')}" data-i18n="nav_columns"></a><span class="gnb"><a href="${mkUrl('guide.html')}" data-i18n="nav_guide"></a><span class="drop"><a href="${mkUrl('support.html')}" data-i18n="nav_support"></a><span class="menu"><a href="${mkUrl('support.html#notice')}" data-i18n="nav_sp_notice"></a><a href="${mkUrl('support.html#faq')}" data-i18n="nav_sp_faq"></a><a href="${mkUrl('support.html#ask')}" data-i18n="nav_sp_ask"></a></span></span></span></nav></div>`;
  document.getElementById('mk-footer').innerHTML = `
  <div class="wrap"><div class="brand"><div class="logo"><img src="${mkAsset('assets/img/logo.png')}" alt="MAKENOV"
      onerror="this.parentNode.classList.add(&quot;txt&quot;);this.remove()"><span>MAKE<b>NOV</b></span></div><p class="desc" data-i18n="ft_desc"></p><a class="mail" href="mailto:notice@makenov.com">notice@makenov.com</a></div><div><h4 data-i18n="ft_platform"></h4><a href="${mkUrl('products.html')}" data-i18n="nav_directory"></a><a href="${mkUrl('companies.html')}" data-i18n="nav_companies"></a><a href="${mkUrl('meetings.html')}" data-i18n="nav_meetings"></a><a href="${mkUrl('columns.html')}" data-i18n="nav_columns"></a></div><div><h4 data-i18n="ft_partner"></h4><a href="mypage.html" onclick="return mkFtJoin(event)" data-i18n="ft_join"></a><a href="mypage.html" data-i18n="ft_verify"></a><a href="maker.html" data-i18n="util_maker"></a></div><div><h4 data-i18n="ft_support"></h4><a href="${mkUrl('support.html')}" data-i18n="nav_support"></a><a href="${mkUrl('guide.html')}" data-i18n="nav_guide"></a><a href="${mkUrl('support.html#ask')}" data-i18n="ft_contact"></a><a href="sitemap.html" data-i18n="ft_sitemap"></a></div></div><div class="base"><span>© 2026 MAKENOV. All rights reserved.</span><span class="ft-lang"><a data-lang="vi" href="${esc(mkLangHref('vi') || location.href)}" onclick="localStorage.setItem('mk_lang','vi')">Tiếng Việt</a><a data-lang="ko" href="${esc(mkLangHref('ko') || location.href)}" onclick="localStorage.setItem('mk_lang','ko')">한국어</a><a data-lang="en" href="${esc(mkLangHref('en') || location.href)}" onclick="localStorage.setItem('mk_lang','en')">English</a></span></div>`;
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
  /* 가입 창을 연 시점 — 가입 완료(CompleteRegistration)보다 볼륨이 많아
     "창은 열었는데 끝내지 않은 사람" 리타겟팅에 쓴다 */
  mkTrack('StartRegistration', { content_category: _suCountry });

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
  /* 사업자 인증 통과 = 진짜 사업자. 가입을 안 끝내도 이 사람은 광고 가치가 있다 */
  mkTrack('VerifyBusiness', { content_name: res.checked || '', content_category: _suCountry });
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

  /* ★ 가입 = 사업자 인증 통과까지 끝난 상태. 광고 최적화의 핵심 전환.
     고급 매칭용 연락처를 먼저 등록하고 쏜다 (Meta 가 브라우저에서 해시) */
  mkPixelIdentify({ em: email, ph: v('su-phone'), dial: c.dial, fn: v('su-name'), country: _suCountry });
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
  mkPixelIdentify({ em: v('ez-email'), ph: v('ez-tel'), dial: mkCountry(_suCountry).dial, fn: v('ez-name'), country: _suCountry });
  mkTrack('Lead', { content_category:'easy_lead', country:_suCountry });
  closeModal();
  toast(t('easy_ok'));
}

async function doLogin(){
  const email = document.getElementById('li-email').value.trim();
  const res = await Store.login(email, document.getElementById('li-pw').value);
  if(res && res.ok){ mkPixelIdentify({ em: email }); closeModal(); setTimeout(()=>location.reload(), 400); return; }

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
/* 카탈로그 숨김 — 관리자 '숨기기' 체크 시 catalog 값 앞에 'hide:' 가 붙는다(DB 스키마 변경 없이).
   뒤의 PDF 주소는 보존해서, 체크를 풀면 그대로 다시 나온다. */
function mkCatalogHidden(p){ return /^hide:/.test(String((p && p.catalog) || '')); }
function mkCatalogUrl(p){ return String((p && p.catalog) || '').replace(/^hide:/, ''); }
function openCatalog(pid){
  requireAuth(()=>{
    const p = mkProduct(pid);
    mkTrack('RequestCatalog', mkProductParams(p));
    /* 관리자가 PDF 를 등록한 제품은 바로 연다. 없으면 종전대로 '이메일로 보내드립니다' 안내 */
    if(p && mkCatalogUrl(p)){ window.open(mkCatalogUrl(p), '_blank', 'noopener'); return; }
    toast(t('catalog_ok'));
  });
}

/* ---------- shared renderers ---------- */
/* 로고 여백 잘라내기 — 올린 로고 파일이 '큰 흰 정사각형 가운데 작은 로고'면 상자 안에서 글자가 깨알처럼 보인다.
   로드된 뒤 내용이 있는 영역만 잘라 다시 그린다(<img onload="window.mkLogoTrim&&mkLogoTrim(this)">). 여백이 적거나 실패(CORS 등)하면 원본 그대로. */
const MK_LOGO_TRIM = {};
function mkLogoTrim(img){
  if(!img || img.dataset.trim || /HeadlessChrome/.test(navigator.userAgent)) return;
  img.dataset.trim = '1';
  const src = img.currentSrc || img.src;
  if(!/^https?:/.test(src)) return;
  if(!MK_LOGO_TRIM[src]) MK_LOGO_TRIM[src] = new Promise(res => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onerror = () => res('');
    im.onload = () => { try{
      const W = im.naturalWidth, H = im.naturalHeight, k = Math.min(1, 256 / Math.max(W, H));
      const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      const clear = d[3] < 20, b0 = d[0], b1 = d[1], b2 = d[2];
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
        const i = (y * w + x) * 4;
        if(d[i+3] < 20) continue;
        if(!clear && Math.abs(d[i]-b0) < 20 && Math.abs(d[i+1]-b1) < 20 && Math.abs(d[i+2]-b2) < 20) continue;
        if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y;
      }
      if(x1 < 0) return res('');
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if(bw > w * .84 && bh > h * .84) return res('');           // 여백이 거의 없으면 손대지 않는다
      const pad = Math.max(bw, bh) * .05;
      const sx = Math.max(0, (x0 - pad) / k), sy = Math.max(0, (y0 - pad) / k);
      const sw = Math.min(W - sx, (bw + pad * 2) / k), sh = Math.min(H - sy, (bh + pad * 2) / k);
      const o = Math.min(1, 480 / Math.max(sw, sh));
      const out = document.createElement('canvas'); out.width = Math.round(sw * o); out.height = Math.round(sh * o);
      const og = out.getContext('2d');
      if(!clear){ og.fillStyle = `rgb(${b0},${b1},${b2})`; og.fillRect(0, 0, out.width, out.height); }
      og.drawImage(im, sx, sy, sw, sh, 0, 0, out.width, out.height);
      res(out.toDataURL('image/png'));
    }catch(e){ res(''); } };
    im.src = src + (src.includes('?') ? '&' : '?') + 'cors=1';   // 일반 요청 캐시(ACAO 없음)와 섞이지 않게
  });
  MK_LOGO_TRIM[src].then(u => { if(u && img.isConnected){ img.classList.add('lg-trim'); img.src = u; } });
}
function companyCard(c){
  const n = mkCompanyProducts(c.id).length;
  return `
  <a class="co-card" href="${mkDocUrl('company',c.id)}" data-cat="${esc(c.cat||'')}"><div class="cv"><img src="${c.cover}" alt="" loading="lazy"></div><div class="bd"><img class="lg" src="${c.logo}" alt="${esc(L(c.name))}" loading="lazy" onload="window.mkLogoTrim&&mkLogoTrim(this)"><h3>${esc(L(c.name))}</h3><p class="tag">${esc(L(c.tagline))}</p><div class="meta"><span>${esc(L(c.location))}</span><i></i><span><b>${n}</b> <span data-i18n="co_prod_unit"></span></span>${String(c.since||'').replace(/[\s\-—–]/g,'') ? `<i></i><span>since ${esc(c.since)}</span>` : ''}</div></div></a>`;
}
/* 카드 지표 — ★2026-09-29 문의수는 뺀다(사용자 지시). 미팅 펀딩 달성률(mtCardLine)과 숫자가 겹쳐
   '43건 문의 · 0% 달성'처럼 헷갈렸다. 관심(wish)만 남기고, 0이면 생략. */
function cardMeta(p){
  const wish = Number(p.wish) || 0;
  return wish ? `<span class="amt">${t('wish_count').replace('{n}', wish)}</span>` : '';
}

/* 상세 페이지 후킹 제목(p.hook.title) — 있으면 카드에서도 제목으로 쓰고, 제품명은 그 위에 작게(2026-10-05 사용자 지시) */
function mkHook(p){ const h = p && p.hook && p.hook.title; return h ? String(L(h) || '').trim() : ''; }
function productCard(p){
  const inCart = Store.cartHas(p.id);
  const hook = mkHook(p);
  const flag = '';   // 2026-09-30 '신제품 등록'·FEATURED 배지 삭제(사용자 요청) — 카드 사진 위 표시 없음
  return `
  <a class="p-card" href="${mkDocUrl('product',p.id)}" data-cat="${esc(p.cat||'')}"><div class="thumb"><img src="${p.img}" alt="${esc(L(p.name))}" loading="lazy">${flag}
      <button class="heart ${inCart?'on':''}" onclick="event.preventDefault();event.stopPropagation();toggleCart('${p.id}',this)">${inCart?'♥':'♡'}</button></div><div class="body"><span class="brand">${esc(p.brand)}</span>${hook ? `<span class="pname">${esc(L(p.name))}</span>` : ''}<h3 class="${hook ? 'hooked' : ''}">${esc(hook || L(p.name))}</h3><div class="meta">${cardMeta(p)}<span class="left">${esc(p.origin)}</span></div>${mtCardLine(p.id)}</div></a>`;
}

/* ============================================================
   미팅 펀딩(방문 일정) — /meet/v1  (백엔드: app/Controllers/Api/Meet.php)
   ------------------------------------------------------------
   한국 공급사 담당자가 정해진 날 베트남에 온다. 공급사(제품)별로 인증 바이어가
   goal(기본 5)곳 모이면 그 미팅은 확정. 화면 곳곳에 진행률을 보여 준다.
     · meetings.html         방문 일정 전체 (pageInit → mtRenderPage)
     · [data-mt-home]        홈·제품 페이지의 '곧 오는 공급사' 섹션 (mtFillSlots 가 채운다)
     · [data-mt-product=ID]  제품 상세의 신청 박스 (mtFillSlots)
     · productCard           카드 하단 한 줄 (mtCardLine)
   데이터는 부팅 때 MkData.boot() 와 나란히 한 번 받는다(MkMeet.load).
   이모지 금지(사용자 지시) — 아이콘은 인라인 SVG.
   로컬 개발: localhost 에서만 localStorage mk_meet_api(백엔드 주소)·mk_meet_tok(토큰)을 읽는다.
   ============================================================ */
const MT_ICO = {
  cal:   `<svg class="mt-ico" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`,
  pin:   `<svg class="mt-ico" viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>`,
  clock: `<svg class="mt-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  users: `<svg class="mt-ico" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.7-3 3-4.7 5.5-4.7s4.8 1.7 5.5 4.7"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.5.6 2.6 2 3 4.4"/></svg>`,
  check: `<svg class="mt-ico" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  heart: `<svg class="mt-ico" viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5c0 5-7 9.5-7 9.5z"/></svg>`,
  doc:   `<svg class="mt-ico" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>`,
  share: `<svg class="mt-ico" viewBox="0 0 24 24"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/></svg>`,
};

const MkMeet = {
  trips: [], loaded: false, _p: null,
  _dev(k){
    try{
      if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return null;
      /* ★ 사전 렌더(prerender.js — 헤드리스 크롬이 localhost 로 연다)에서는 절대 로컬 테스트 백엔드를 쓰지 않는다.
           한 번 테스트 일정이 사본에 구워져 운영에서 '가짜 펀딩 줄 → 실제 화면'으로 바뀌어 보였다(2026-09-29). */
      if(/HeadlessChrome/.test(navigator.userAgent)) return null;
      /* 로컬(localhost·127.0.0.1)에서는 기본으로 같은 호스트의 로컬 테스트 백엔드(:8099)에 붙는다.
         localhost 와 127.0.0.1 은 저장소가 따로라 설정을 저장해 두는 방식은 한쪽에서만 보였다.
         ?meetdemo=0 → 운영 API 사용(기억), ?meetdemo=1 → 다시 로컬 테스트 백엔드 */
      const d = new URLSearchParams(location.search).get('meetdemo');
      if(d === '0'){ localStorage.setItem('mk_meet_api', 'off'); localStorage.removeItem('mk_meet_tok'); }
      if(d === '1') localStorage.removeItem('mk_meet_api');
      const v = localStorage.getItem(k);
      if(k === 'mk_meet_api'){
        if(v === 'off') return null;
        return v || 'http://127.0.0.1:8099/';
      }
      return v;
    }catch(e){ return null; }
  },
  base(){
    const root = this._dev('mk_meet_api') || (typeof MK_SUPABASE_URL !== 'undefined' && MK_SUPABASE_URL) || 'https://makenov.com/';
    return root.replace(/\/$/, '') + '/meet/v1/';
  },
  async token(){
    const dev = this._dev('mk_meet_tok'); if(dev) return dev;
    /* 부팅이 잡아 둔 세션이 있으면 그걸 쓴다 — 인증 잠금을 한 번 더 잡지 않도록 */
    if(typeof MkData !== 'undefined' && MkData.session && MkData.session.access_token) return MkData.session.access_token;
    try{
      if(typeof SB !== 'undefined' && SB && SB.auth){
        const { data } = await SB.auth.getSession();
        return data && data.session ? data.session.access_token : '';
      }
    }catch(e){}
    return '';
  },
  async call(method, path, body){
    const tok = await this.token();
    const h = { apikey: (typeof MK_SUPABASE_ANON !== 'undefined' ? MK_SUPABASE_ANON : ''), Accept: 'application/json' };
    if(tok) h.Authorization = 'Bearer ' + tok;
    if(body !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(this.base() + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    let d = null; try{ d = await r.json(); }catch(e){}
    return { ok: r.ok, status: r.status, data: d };
  },
  load(){
    if(!this._p) this._p = this.call('GET', 'trips')
      .then(r => { if(r.ok && Array.isArray(r.data)) this.trips = r.data; })
      .catch(() => {})
      .then(() => { this.loaded = true; });
    return this._p;
  },
  reload(){ this._p = null; return this.load(); },
  trip(id){ return this.trips.find(x => x.id === id) || null; },
  /* 방문일이 오늘 이후(또는 미정)인 일정 — 취소 제외, 방문일 순 */
  upcoming(){
    return this.trips.filter(x => x.status !== 'cancelled' && (x.days_to_visit == null || x.days_to_visit >= 0))
      .sort((a, b) => (a.visit_date ? 0 : 1) - (b.visit_date ? 0 : 1));    // 방문일 미정은 뒤로(나머지는 서버 순서 유지)
  },
  past(){ return this.trips.filter(x => x.status !== 'cancelled' && x.days_to_visit != null && x.days_to_visit < 0).reverse(); },
  /* 공개 제품만 — 비공개·삭제된 제품은 일정에서 조용히 뺀다 */
  itemsOf(tr){ return (tr.items || []).filter(it => mkProduct(it.product_id)); },
  forProduct(pid){
    for(const tr of this.upcoming()){
      const it = (tr.items || []).find(i => i.product_id === pid);
      if(it) return { trip: tr, item: it };
    }
    return null;
  },
};

function mtLocale(){ return ({ vi:'vi-VN', ko:'ko-KR', en:'en-US' })[MK_LANG] || 'vi-VN'; }
function mtDate(iso){ const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number); return y ? new Date(y, m - 1, d, 12) : null; }
function mtFmt(iso, opt){ const d = mtDate(iso); if(!d) return ''; try{ return d.toLocaleDateString(mtLocale(), opt); }catch(e){ return String(iso); } }
function mtLong(iso){ return mtFmt(iso, { year:'numeric', month:'long', day:'numeric', weekday:'short' }); }
function mtShort(iso){ return MK_LANG === 'ko' ? mtFmt(iso, { month:'long', day:'numeric' }) : mtFmt(iso, { day:'numeric', month:'numeric' }); }
function mtRep(key, map){ let s = t(key); for(const k in map) s = s.split('{' + k + '}').join(map[k]); return s; }
/* 행사 기본 정보 — 일자 · 시간 · 장소. 비어 있으면 '추후 안내' (관리자 › 미팅 펀딩에서 입력) */
function mtWhen(tr){
  if(!tr.visit_date) return '';                       // 방문일 미정
  const end = tr.visit_end && tr.visit_end !== tr.visit_date ? ' – ' + mtLong(tr.visit_end) : '';
  return mtLong(tr.visit_date) + end;
}
function mtTime(tr){
  const a = tr.time_start || '', b = tr.time_end || '';
  return a && b ? a + ' – ' + b : a ? a + (MK_LANG === 'ko' ? ' 시작' : ' ~') : '';
}
function mtWhere(tr){ return [L(tr.venue), L(tr.city)].filter(x => String(x || '').trim()).join(' · '); }
function mtFacts(tr, cls){
  const row = (ico, k, v, none) => `<li><span class="k">${ico}${esc(t(k))}</span><b class="${v ? '' : 'tba'}">${esc(v || t(none || 'mt_tba'))}</b></li>`;
  return `<ul class="mt-facts ${cls || ''}">${row(MT_ICO.cal, 'mt_f_date', mtWhen(tr), 'mt_tbd')}${row(MT_ICO.clock, 'mt_f_time', mtTime(tr))}${row(MT_ICO.pin, 'mt_f_venue', mtWhere(tr))}</ul>`;
}

function mtDateBadge(iso){
  const d = mtDate(iso);
  if(!d) return `<div class="mt-date tbd"><span class="d">${esc(t('mt_tbd'))}</span></div>`;   // 방문일 미정
  return `<div class="mt-date"><span class="mo">${esc(mtFmt(iso, { month:'short' }))}</span><span class="d">${d ? d.getDate() : ''}</span><span class="dw">${esc(mtFmt(iso, { weekday:'short' }))}</span></div>`;
}
function mtTripState(tr){
  if(tr.status === 'cancelled') return 'cancelled';
  if(tr.open) return 'open';
  return tr.status === 'confirmed' ? 'confirmed' : 'closed';
}
function mtChip(st){ return `<span class="mt-chip ${st}">${st === 'confirmed' ? MT_ICO.check : ''}${esc(t('mt_st_' + st))}</span>`; }
function mtDdayChip(tr){
  if(!tr.open || tr.days_left == null) return '';
  const txt = tr.days_left <= 0 ? t('mt_dday_today') : mtRep('mt_dday', { n: tr.days_left });
  return `<span class="mt-chip dday">${MT_ICO.clock}${esc(txt)}</span>`;
}
/* 달성률 — 2026-09-30 사용자 결정: 신청 1곳당 20% 고정(목표 인원과 무관). 100% 넘게 쌓일 수 있고 막대는 100%에서 멈춘다.
   공급사별 항목(product_id 있음)에만 적용. 일정 전체 합계 막대(mtMini)는 종전대로 합계/목표 비율. */
const MT_PCT_PER = 20;
function mtBar(it){
  const pct = Math.min(100, it.product_id ? mtPct(it) : Math.round((it.count || 0) / Math.max(1, it.goal) * 100));
  return `<div class="mt-bar ${it.confirmed ? 'done' : ''}"><i style="width:${pct}%"></i></div>`;
}
function mtNeedTxt(it){ return it.confirmed ? t('mt_st_confirmed') : mtRep('mt_need_more', { n: Math.max(0, it.goal - it.count) }); }
function mtProg(it, right){
  return `<div class="mt-prog"><b>${it.count}</b>${right != null ? right : `<span class="need ${it.confirmed ? 'done' : ''}">${esc(mtNeedTxt(it))}</span>`}</div>`;
}
/* 신청 버튼 — 확정된 뒤에도 마감 전이면 더 받는다(공급사 입장에선 미팅이 늘수록 좋다) */
function mtAction(tr, it){
  const a = `'${esc(tr.id)}','${esc(it.product_id)}'`;
  /* 회원 신청(it.mine)은 취소 링크까지, 간편 신청(이 기기에 기록)은 '신청 완료' 표시만 — 취소는 메이크노브에 연락 */
  if(it.mine || mtIsMine(tr.id, it.product_id)) return `<div class="mt-mine"><button class="btn btn-ghost" disabled>${MT_ICO.check} ${esc(t('mt_btn_applied'))}</button>`
    + (it.mine && tr.open ? `<a href="#" class="mt-cancel" onclick="event.preventDefault();mtCancel(${a})">${esc(t('mt_btn_cancel'))}</a>` : '') + `</div>`;
  if(tr.open) return `<button class="btn btn-primary" onclick="event.preventDefault();openMeetApply(${a})">${esc(t('mt_btn_apply'))}</button>`;
  return `<button class="btn btn-ghost" disabled>${esc(t('mt_st_' + mtTripState(tr)))}</button>`;
}
/* '2곳 신청' — 신청 수(2)만 크게(2026-09-30 목표 '/5' 표기는 뺐다), 나머지는 작게. 문구 틀(mt_joined)은 언어별로 그대로 쓴다 */
function mtJoinedHtml(it){
  const parts = mtRep('mt_joined', { n: '\u0000', g: it.goal }).split('\u0000');
  return `<span class="mt-jn">${esc(parts[0] || '')}<b>${it.count}</b><small>${esc(parts[1] || '')}</small></span>`;
}
function mtPct(it){ return (it.count || 0) * MT_PCT_PER; }
function mtDdayTxt(tr){
  if(!tr.open) return t('mt_st_' + mtTripState(tr));
  if(tr.days_left == null) return t('mt_st_open');
  return tr.days_left <= 0 ? t('mt_dday_today') : mtRep('mt_dday', { n: tr.days_left });
}

/* 일정 안의 공급사 카드 — 텀블벅 프로젝트 카드처럼: 큰 사진 · 달성률 · 남은 기간.
   눌러서 제품 상세(= 펀딩 페이지)의 #meet 로 간다. 신청은 거기서 한다. */
function mtItemCard(tr, it){
  const p = mkProduct(it.product_id);
  const tag = it.confirmed ? `<span class="mt-chip confirmed">${MT_ICO.check}${esc(t('mt_st_confirmed'))}</span>`
    : it.mine ? `<span class="mt-chip open">${MT_ICO.check}${esc(t('mt_btn_applied'))}</span>` : '';
  return `<a class="mt-pcard ${it.confirmed ? 'done' : ''}" href="${mkDocUrl('product', p.id)}#meet">
    <div class="th"><img src="${esc(p.img)}" alt="${esc(L(p.name))}" loading="lazy">${tag}</div>
    <div class="br">${esc(p.brand)}</div><h3>${esc(L(p.name))}</h3>
    <div class="mt-pcard-foot">${mtJoinedHtml(it)}<em class="mt-pc">${mtPct(it)}%</em></div>
    ${mtBar(it)}
    <div class="mt-pcard-dd">${esc(mtDdayTxt(tr))}</div>
  </a>`;
}
/* 방문 일정 페이지의 주인공 — 행사는 보통 하나뿐이라 그 하나를 히어로로 크게 보여 준다.
   왼쪽: 날짜·제목·장소·마감·설명·버튼 / 오른쪽: 신청 마감까지 남은 일수 + 공급사·신청·확정 수 */
function mtEventHero(tr){
  const items = MkMeet.itemsOf(tr);
  const joined = items.reduce((a, i) => a + i.count, 0);
  const done = items.filter(i => i.confirmed).length;
  const end = tr.visit_end && tr.visit_end !== tr.visit_date ? ' – ' + esc(mtFmt(tr.visit_end, { month:'long', day:'numeric' })) : '';
  const left = !tr.open ? `<b class="sm">${esc(t('mt_st_' + mtTripState(tr)))}</b>`
    : tr.days_left == null ? `<b class="sm">${esc(t('mt_st_open'))}</b>`
    : tr.days_left <= 0 ? `<b class="sm">${esc(t('mt_dday_today'))}</b>`
    : `<b>D-${tr.days_left}</b>`;
  return `<div class="mt-ev" id="trip-${esc(tr.id)}">
    <div class="mt-ev-l">
      <div class="kick">${esc(t('mt_next_kick'))}</div>
      <div class="mt-ev-date">${tr.visit_date ? `<b>${esc(mtFmt(tr.visit_date, { month:'long', day:'numeric' }))}${end}</b><span>${esc(mtFmt(tr.visit_date, { weekday:'long' }))}</span>` : `<b>${esc(t('mt_date_tbd'))}</b>`}</div>
      <h1>${esc(L(tr.title) || t('mt_page_kick'))}</h1>
      <div class="mt-ev-meta">
        ${mtTime(tr) ? `<span>${MT_ICO.clock}${esc(mtTime(tr))}</span>` : ''}
        <span>${MT_ICO.pin}${esc(mtWhere(tr) || t('mt_tba'))}</span>
      </div>
      <p class="mt-ev-sub">${esc(L(tr.summary) || t('mt_page_sub'))}</p>
      ${items.length ? `<a class="btn btn-primary btn-lg" href="#mt-sup-sec" onclick="event.preventDefault();document.getElementById('mt-sup-sec').scrollIntoView({behavior:'smooth'})">${esc(t('mt_ev_cta'))}</a>` : ''}
    </div>
    <div class="mt-ev-r">
      <div class="mt-ev-dd"><span>${esc(t('mt_ev_until'))}</span><div class="v">${left}</div>${tr.deadline ? `<p class="dl">${esc(t('mt_deadline'))} ${esc(mtLong(tr.deadline))}</p>` : ''}</div>
      <div class="mt-ev-nums">
        <div><b>${items.length}</b><span>${esc(t('mt_ev_sup'))}</span></div>
        <div><b>${joined}</b><span>${esc(t('mt_ev_joined'))}</span></div>
        <div><b>${done}</b><span>${esc(t('mt_ev_confirmed'))}</span></div>
      </div>
      <p class="mt-ev-rule">${esc(t('mt_ev_rule'))}</p>
    </div>
  </div>`;
}
/* 제품 페이지 히어로의 첫 슬라이드 — 다가오는 방문 일정으로 만든 '행사 포스터'(2026-09-30).
   다른 슬라이드(어두운 SVG 일러스트 + 흰 글씨)와 일부러 다르게: 밝은 바탕 · 큰 날짜 · 실제 공급사 제품 사진.
   DB 슬라이드(hero_slides)에 넣지 않은 이유: 관리자 '문구 수정'이 슬라이드를 순번(hero.0.title …)으로
   덮어쓰고 있어 맨 앞에 끼우면 기존 문구가 한 칸씩 밀린다. 행사명·날짜·장소가 바뀌면 자동으로 따라간다.
   products.html renderHero 가 s.html 이 있으면 그대로 그리고, cls 의 light 로 점·화살표 색을 바꾼다. */
/* ===== 제품 페이지 히어로 배너(3차, 2026-10-05) — 왼쪽 글 칸 + 오른쪽은 실제 사진을 칸에 꽉 채운 타일 =====
   2차(연한 그라데이션 바탕 · 알약 라벨 · 떠 있는 카드)는 장식이 많아 보인다는 피드백으로 교체.
   알약·그림자 카드·그라데이션 없이 사이트 톤(평평한 면, 4~8px 모서리)으로. products.html renderHero 가 그린다. */
function mkHbShell(cls, href, kick, title, line, cta, tiles){
  return `<a class="hb ${cls || ''}" href="${href}">
    <div class="hb-tx"><span class="hb-k">${esc(kick)}</span><h2>${esc(title)}</h2><p>${esc(line)}</p><span class="hb-cta">${esc(cta)} →</span></div>
    <div class="hb-ph n${Math.min(4, Math.max(1, tiles.length))}">${tiles.slice(0, 4).join('')}</div>
  </a>`;
}
function mkHbTile(img, cap, extra){
  return `<span class="pi" style="background-image:url('${esc(img)}')">${cap ? `<em>${esc(cap)}</em>` : ''}${extra || ''}</span>`;
}
function mtHeroSlides(){
  if(typeof MkMeet === 'undefined') return [];
  const tr = MkMeet.upcoming().find(x => x.open && x.visit_date && MkMeet.itemsOf(x).length);   // 날짜가 정해진 일정만
  if(!tr) return [];
  const items = MkMeet.itemsOf(tr);
  const href = mkUrl('meetings.html') + '#trip-' + tr.id;
  const kick = [mtFmt(tr.visit_date, { month:'long', day:'numeric', weekday:'short' }), L(tr.city)].filter(Boolean).join(' · ');
  const line = t('mt_hero_line') + (tr.deadline ? ' · ' + t('mt_deadline') + ' ' + mtFmt(tr.deadline, { month:'long', day:'numeric' }) : '');
  const tiles = items.map((it, i) => { const p = mkProduct(it.product_id); return mkHbTile(p.img, p.brand, i === 3 && items.length > 4 ? `<b>+${items.length - 4}</b>` : ''); });
  return [{ cls: 'light', link: href, html: mkHbShell('ev', href, kick, L(tr.title) || t('mt_page_kick'), line, t('mt_evc_detail'), tiles) }];
}
function mkHeroSlides(){
  const out = [];
  const prods = (typeof MK_PRODUCTS !== 'undefined' ? MK_PRODUCTS : []).filter(p => p && p.img);

  /* 1) 미팅이 어떻게 확정되나 — 실제 신청 현황이 붙은 제품 사진 한 장 */
  const hit = typeof MkMeet !== 'undefined' ? MkMeet.upcoming().find(x => x.open && MkMeet.itemsOf(x).length) : null;
  if(hit){
    const it = MkMeet.itemsOf(hit)[0], p = mkProduct(it.product_id);
    const bar = `<span class="hb-bar"><span class="t"><b>${esc(p.brand)}</b>${mtJoinedHtml(it)}<i>${mtPct(it)}%</i></span>${mtBar(it)}</span>`;
    out.push({ cls: 'light', html: mkHbShell('', `${mkUrl('meetings.html')}#trip-${esc(hit.id)}`,
      t('hs_how_kick'), t('hs_how_t'), t('hs_how_p'), t('hs_how_cta'), [mkHbTile(p.img, '', bar)]) });
  }

  /* 2) 제품 — 실제 제품 사진 */
  if(prods.length){
    out.push({ cls: 'light', html: mkHbShell('', mkUrl('products.html'),
      t('hs_prod_kick'), t('hs_prod_t'), t('hs_prod_p'), t('hs_prod_cta'), prods.slice(0, 3).map(p => mkHbTile(p.img, p.brand))) });
  }

  /* 3) 공급사 — 공급사 대표 사진 + 로고 */
  const cos = (typeof MK_COMPANIES !== 'undefined' ? MK_COMPANIES : []).filter(c => c && c.cover).slice(0, 3);
  if(cos.length){
    out.push({ cls: 'light', html: mkHbShell('', mkUrl('companies.html'),
      t('hs_co_kick'), t('hs_co_t'), t('hs_co_p'), t('hs_co_cta'),
      cos.map(c => mkHbTile(c.cover, '', c.logo ? `<span class="lgc"><img src="${esc(c.logo)}" alt="${esc(c.brand || '')}" onload="window.mkLogoTrim&&mkLogoTrim(this)"></span>` : `<em>${esc(c.brand || L(c.name))}</em>`))) });
  }
  return out;
}
/* 주목할 제품 순서 — 다가오는 방문 일정(items)의 공급사 순서를 따른다. 일정에 없는 제품은 원래 순서대로 뒤에 */
function mkFeaturedOrder(list){
  /* 일정이 여럿이면 일정 순서대로 이어 붙인다(날짜 정해진 일정 → 미정 일정) */
  const order = typeof MkMeet !== 'undefined' ? MkMeet.upcoming().flatMap(x => MkMeet.itemsOf(x).map(i => i.product_id)) : [];
  if(!order.length) return list;
  const rank = p => { const i = order.indexOf(p.id); return i < 0 ? 999 : i; };
  return list.slice().sort((a, b) => rank(a) - rank(b));
}
/* 일정 하나를 한 줄 요약 — 홈 섹션용. 막대는 공급사 전체 합계 */
function mtMini(tr){
  const items = MkMeet.itemsOf(tr);
  const n = items.reduce((a, i) => a + i.count, 0), g = items.reduce((a, i) => a + i.goal, 0);
  const done = items.length > 0 && items.every(i => i.confirmed);
  return `<a class="mt-mini" href="${mkUrl('meetings.html')}#trip-${esc(tr.id)}">${mtDateBadge(tr.visit_date)}<div class="bd">
    <h3>${esc(L(tr.title) || t('mt_page_kick'))}</h3>
    <div class="mt-meta">${L(tr.city) ? `<span>${MT_ICO.pin}${esc(L(tr.city))}</span>` : ''}${mtDdayChip(tr)}</div>
    <div style="margin-top:10px">${mtBar({ count: n, goal: Math.max(1, g), confirmed: done })}${mtProg({ count: n, goal: g }, `<span>${esc(mtRep('mt_suppliers', { n: items.length }))}</span>`)}</div>
  </div></a>`;
}
/* ===== 방문 일정 페이지(meetings.html)의 행사별 부가 정보 =====
   주최 로고 · 주관 · 운영 · 세부 장소 · 지도 · 사진은 일정 데이터에 칸이 없어 일정 ID 로 여기 적는다(내용은 kfesta.vn 행사 안내문 기준).
   표에 없는 일정은 로고·주관 줄 없이 같은 틀로 나온다. 화면은 아래 mtEventPage. */
const MT_EVENT_X = {
  'hcm-20261203': {
    photo: 'https://images.unsplash.com/photo-1663670889635-0aabebf112ba?auto=format&fit=crop&w=1600&q=80',   // 대구 시내 전경(Unsplash 무료 라이선스, HFNY4) — 다른 행사(Beauty KFESTA) 현장 사진 대신
    logos: [
      { src: 'https://kfesta.vn/assets/img/daegu-ci.webp', alt: 'Daegu Metropolitan City' },   // KFESTA 로고는 뺐다(2026-10-05 사용자 지시) — 대구시 로고만
    ],
    sub:  { ko: '한국–베트남 비즈니스 상담회', vi: 'Hội nghị kết nối giao thương Hàn – Việt', en: 'Korea–Vietnam Business Matching' },   // 바이어가 보는 페이지라 '수출상담회' 대신
    band: { ko: '한국 대구의 혁신기업을 {y}호치민에서 직접{/y} 만나보세요', vi: 'Gặp {y}trực tiếp tại TP.HCM{/y} các doanh nghiệp đổi mới đến từ Daegu, Hàn Quốc', en: 'Meet innovative companies from Daegu, Korea {y}in person in Ho Chi Minh City{/y}' },
    name: { ko: '2026 대구메이드 K-Festa 베트남 수출상담회', vi: '2026 DAEGU MADE K-FESTA – Hội nghị kết nối giao thương Hàn – Việt', en: '2026 Daegu Made K-Festa – Korea–Vietnam Business Matching' },
    venue:{ ko: '베트남 호치민시 1군, 호텔 니코 사이공 4층 컨퍼런스룸', vi: 'Phòng hội nghị tầng 4, Khách sạn Nikko Saigon, Quận 1, TP. Hồ Chí Minh', en: 'Conference room, 4F, Hotel Nikko Saigon, District 1, Ho Chi Minh City' },
    host: { ko: '대구광역시 호치민사무소', vi: 'Văn phòng đại diện TP. Daegu tại TP. Hồ Chí Minh', en: 'Daegu Metropolitan City Ho Chi Minh Office' },
    org:  { ko: '주식회사 퍼스트마케팅컴퍼니 (KFESTA 베트남 사무국)', vi: 'First Marketing Company (Ban thư ký KFESTA Việt Nam)', en: 'First Marketing Company (KFESTA Vietnam Secretariat)' },
    map:  { q: 'Hotel Nikko Saigon, 235 Nguyen Van Cu, District 1, Ho Chi Minh City',
            addr: { ko: '235 Nguyễn Văn Cừ, 1군, 호치민 (Hotel Nikko Saigon)', vi: '235 Nguyễn Văn Cừ, Phường Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh', en: '235 Nguyen Van Cu, District 1, Ho Chi Minh City' } },
    booth: true,       // 공급사별 상담 부스 · 한–베 통역 배치(행사 안내문 기준)
    growing: true,     // 참가 공급사가 계속 추가되는 행사
    fixed: true,       // 날짜·장소가 정해져 그대로 열리는 행사 — '5곳이 모이면 확정 / 안 모이면 화상 미팅' 안내 대신 행사 진행 순서·행사용 FAQ 를 쓴다
  },
};
/* 행사 카드·일정 페이지가 같이 쓰는 공급사 카드(사진 · 달성 막대 · 미팅 신청) */
function mtSupCard(tr, it){
  const p = mkProduct(it.product_id);
  const mine = it.mine || mtIsMine(tr.id, p.id);
  const hook = mkHook(p);
  return `<a class="mt-evd-sup ${it.confirmed ? 'done' : ''}" href="${mkDocUrl('product', p.id)}#meet">
      <div class="im"><img src="${esc(p.img)}" alt="${esc(L(p.name))}" loading="lazy"></div>
      <div class="tx"><span class="br">${esc(p.brand)}</span>${hook ? `<span class="pn">${esc(L(p.name))}</span>` : ''}<span class="nm">${esc(hook || L(p.name))}</span>${mtBar(it)}
        <div class="pr">${mtJoinedHtml(it)}<em>${mtPct(it)}%</em></div>
        <span class="act ${mine ? 'on' : ''}">${mine ? MT_ICO.check + esc(t('mt_btn_applied')) : esc(t('mt_btn_apply')) + ' →'}</span></div></a>`;
}
/* 일정 상세 맨 위 사진 — 참가 제품 사진 슬라이드(제품 상세 갤러리와 같은 모양: 큰 사진 + 아래 썸네일, 4초마다 넘어감).
   2026-10-05: 행사 사진(도시 전경) 대신 '무엇을 만나는지'가 보이게. 제품이 없을 때만 행사 사진 · 날짜로 대신한다 */
function mtEvGallery(tr, items, x, title, when){
  const gal = items.map(it => mkProduct(it.product_id)).filter(p => p && p.img)
    .map(p => ({ img: p.img, brand: p.brand || '', name: L(p.name), href: mkDocUrl('product', p.id) + '#meet' }));
  window._mtEvGal = gal; window._mtEvCur = 0;
  clearInterval(window._mtEvTimer);
  if(!gal.length) return `<div class="pd-gallery ${x.photo ? '' : 'ev-nophoto'}"><div class="main">${x.photo ? `<img src="${esc(x.photo)}" alt="${esc(title)}">` : `<span>${esc(when)}</span>`}</div></div>`;
  if(gal.length > 1 && !/HeadlessChrome/.test(navigator.userAgent)) window._mtEvTimer = setInterval(() => {
    if(!document.getElementById('ev-shot')) return clearInterval(window._mtEvTimer);
    mtEvShot((window._mtEvCur + 1) % window._mtEvGal.length, true);
  }, 4000);
  const g = gal[0];
  return `<div class="pd-gallery ev-gal"><a class="main" id="ev-shot-a" href="${esc(g.href)}"><img id="ev-shot" src="${esc(g.img)}" alt="${esc(g.name)}"></a>
      <div class="ev-cap"><b id="ev-cap-b">${esc(g.brand)}</b><span id="ev-cap-n">${esc(g.name)}</span></div>
      ${gal.length > 1 ? `<span class="cnt" id="ev-cnt">1 / ${gal.length}</span>` : ''}</div>
    ${gal.length > 1 ? `<div class="pd-thumbs ev-thumbs">${gal.map((p, i) => `<img src="${esc(p.img)}" alt="" class="${i ? '' : 'on'}" onclick="mtEvShot(${i})">`).join('')}</div>` : ''}`;
}
function mtEvShot(i, auto){
  const gal = window._mtEvGal || [], g = gal[i], img = document.getElementById('ev-shot');
  if(!g || !img) return;
  window._mtEvCur = i;
  img.src = g.img; img.alt = g.name;
  document.getElementById('ev-shot-a').href = g.href;
  document.getElementById('ev-cap-b').textContent = g.brand;
  document.getElementById('ev-cap-n').textContent = g.name;
  const cnt = document.getElementById('ev-cnt'); if(cnt) cnt.textContent = (i + 1) + ' / ' + gal.length;
  document.querySelectorAll('.ev-thumbs img').forEach((el, n) => el.classList.toggle('on', n === i));
  if(!auto) clearInterval(window._mtEvTimer);     // 직접 고르면 자동 넘김을 멈춘다
}
function mtKfGo(){ const el = document.getElementById('mt-kf-sups'); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
/* 일정 페이지 본문 — 제품 상세(page-product.js)와 같은 틀을 그대로 쓴다: 왼쪽 사진 + 본문 구역(.pd-main/.pd-sec), 오른쪽 신청 상자(.pd-side .box).
   2026-10-05: 따로 만든 히어로(그라데이션 · 알약 배지 · 떠 있는 날짜 배지)는 'AI 티가 난다'는 피드백으로 버리고 사이트 기존 컴포넌트로 통일.
   구역 순서(바이어 시점): 참가 공급사 → 행사 개요 → 무엇이 다른가 → 진행 방식 → 지원 내용 → 오시는 길 → FAQ */
function mtEventPage(tr){
  const x = MT_EVENT_X[tr.id] || {};
  const items = MkMeet.itemsOf(tr);
  const title = L(tr.title) || t('mt_page_kick');
  const long = { year:'numeric', month:'long', day:'numeric', weekday:'short' };
  const when = tr.visit_date ? mtFmt(tr.visit_date, long) : t('mt_date_tbd');
  const dlLong = tr.deadline ? mtFmt(tr.deadline, long) : '';
  const time = mtTime(tr);
  const state = mtTripState(tr);
  const lead = (x.band ? L(x.band) : t('mt_kf_band_h')).split('{y}').join('').split('{/y}').join('');
  const left = !tr.open ? `<b class="sm">${esc(t('mt_st_' + state))}</b>`
    : tr.days_left == null ? `<b class="sm">${esc(t('mt_st_open'))}</b>`
    : tr.days_left <= 0 ? `<b class="sm">${esc(t('mt_dday_today'))}</b>`
    : `<b>D-${tr.days_left}</b>`;
  const note = [t('mt_kf_free'), x.booth ? t('mt_kf_interp') : ''].filter(Boolean).join(' · ');
  const row = (k, v) => v ? `<tr><th>${esc(t(k))}</th><td>${v}</td></tr>` : '';
  const info = (k, v) => v ? `<li><span>${esc(t(k))}</span><b>${esc(v)}</b></li>` : '';
  const step = (n, h, p) => `<li><span class="n">${n}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`;
  const steps = x.fixed
    ? [1, 2, 3].map(n => step(n, t('mt_kf_s' + n + '_h'), t('mt_kf_s' + n + '_p'))).join('')
      + step(4, t('mt_kf_s4_h'), mtRep('mt_kf_s4_p', { d: tr.visit_date ? mtFmt(tr.visit_date, { month:'long', day:'numeric' }) : t('mt_date_tbd'), v: L(tr.venue) || L(tr.city) || '' }) + (x.booth ? ' ' + t('mt_kf_s4_interp') : ''))
    : [1, 2, 3].map(n => step(n, t('mt_step' + n + '_h'), t('mt_step' + n + '_p'))).join('');
  const perks = ['mt_kf_b1', x.booth ? 'mt_kf_b2' : '', x.booth ? 'mt_kf_b3' : '', 'mt_kf_b4', 'mt_kf_b5'].filter(Boolean)
    .map(k => `<li><span class="ck">✓</span><span>${esc(t(k))}</span></li>`).join('');
  /* 오시는 길 — 구글 지도(키 없이 되는 embed). 행사 표에 map 이 없으면 행사장·도시 이름으로 찾는다 */
  const mapQ = (x.map && x.map.q) || [tr.venue && (tr.venue.en || L(tr.venue)), tr.city && (tr.city.en || L(tr.city))].filter(Boolean).join(', ');
  const mapSec = mapQ && (x.map || String(L(tr.venue) || '').trim()) ? `<section class="pd-sec">
      <h2>${esc(t('mt_kf_map_h'))}</h2>
      <div class="kf-map"><iframe src="https://www.google.com/maps?q=${encodeURIComponent(mapQ)}&hl=${MK_LANG}&z=16&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${esc(L(tr.venue) || 'Map')}" allowfullscreen></iframe></div>
      <div class="kf-map-info"><div><b>${esc(L(tr.venue) || '')}</b>${x.map && x.map.addr ? `<span>${esc(L(x.map.addr))}</span>` : ''}</div>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ)}" target="_blank" rel="noopener">${esc(t('mt_kf_map_open'))} →</a></div>
    </section>` : '';
  /* 행사용 FAQ(바이어 시점) — 비용 · 대상 · 신청 방법 · 신청 후 · 마감 · 통역 · 여러 공급사 · 준비물. 첫 질문은 펼쳐 둔다 */
  const faq = x.fixed ? `<section class="pd-sec">
      <h2>${esc(t('mt_faq_h'))}</h2>
      <div class="kf-faq">${[1, 2, 3, 4, dlLong ? 5 : 0, x.booth ? 6 : 0, 7, 8].filter(Boolean).map((n, i) => `<details${i ? '' : ' open'}><summary><span>${esc(t('mt_kf_q' + n))}</span></summary><p>${esc(mtRep('mt_kf_a' + n, { d: dlLong }))}</p></details>`).join('')}</div>
    </section>` : '';
  return `<div class="wrap"><div class="pd-row mt-on ev-row" id="trip-${esc(tr.id)}">
    <div class="pd-main">
      ${mtEvGallery(tr, items, x, title, when)}
      <section class="pd-sec" id="mt-kf-sups">
        <h2>${esc(t('mt_kf_sup_h'))}</h2>
        <div class="mt-evd-sups kf-sups">${items.map(it => mtSupCard(tr, it)).join('')}</div>
        ${x.growing && tr.open ? `<p class="kf-note">${esc(t('mt_kf_sup_note'))}</p>` : ''}
      </section>
      <section class="pd-sec">
        <h2>${esc(t('mt_kf_over_h'))}</h2>
        <table class="kf-table">
          ${row('mt_kf_o_name', esc(x.name ? L(x.name) : title))}
          ${row('mt_kf_o_date', esc(when + (time ? ' · ' + time : '')))}
          ${row('mt_kf_o_venue', esc(x.venue ? L(x.venue) : (mtWhere(tr) || t('mt_tba'))))}
          ${row('mt_kf_o_host', x.host ? esc(L(x.host)) : '')}
          ${row('mt_kf_o_org', x.org ? esc(L(x.org)) : '')}
          ${row('mt_kf_o_who', esc(t('mt_kf_o_who_v')))}
          ${row('mt_kf_o_fee', esc(t('mt_kf_o_fee_v')))}
          ${row('mt_deadline', esc(dlLong))}
        </table>
      </section>
      <section class="pd-sec">
        <h2>${esc(t('mt_kf_diff_h'))}</h2>
        <div class="ev-text"><p>${esc(t('mt_kf_diff_p1'))}</p><p><b>${esc(t('mt_kf_diff_b'))}</b> ${esc(t('mt_kf_diff_p2'))}</p></div>
      </section>
      <section class="pd-sec">
        <h2>${esc(t('mt_how_h'))}</h2>
        <ol class="kf-steps">${steps}</ol>
      </section>
      <section class="pd-sec pd-dist">
        <h2>${esc(t('mt_kf_ben_h'))}</h2>
        <ul class="pd-checks">${perks}</ul>
      </section>
      ${mapSec}
      ${faq}
    </div>
    <aside class="pd-side"><div class="box mt-box-on">
      ${x.logos && x.logos.length ? `<div class="ev-logos">${x.logos.map(l => `<img src="${esc(l.src)}" alt="${esc(l.alt)}">`).join('<i></i>')}</div>` : ''}
      ${x.sub ? `<div class="brand">${esc(L(x.sub))}</div>` : ''}
      <h1>${esc(title)}</h1>
      <p class="tagline">${esc(lead)}</p>
      <div class="mt-fund">
        <div class="mt-fund-kick">${MT_ICO.cal}<span>${esc(t('mt_ev_until'))}</span></div>
        <div class="mt-fund-stats ev-stats"><div class="st"><div class="v">${left}</div></div></div>
        <ul class="mt-fund-info">
          ${info('mt_f_date', when)}
          ${info('mt_f_time', time)}
          ${info('mt_f_venue', mtWhere(tr) || t('mt_tba'))}
          ${info('mt_deadline', dlLong)}
          <li class="rule">${esc(note)}</li>
        </ul>
        ${items.length && tr.open ? `<div class="mt-fund-cta"><button type="button" class="btn btn-primary" onclick="mtKfGo()">${esc(t('mt_kf_cta'))}</button></div>` : ''}
      </div>
    </div></aside>
  </div></div>`;
}
/* 예전 문서형의 맨 아래 마무리 띠 — 오른쪽 신청 상자가 따라다니므로 지금은 내지 않는다(meetings.html 이 부르므로 함수는 둔다) */
function mtEventEnd(tr){ return ''; }
/* ===== 방문 일정 목록(meetings.html, 주소에 #trip-아이디 가 없을 때) — 행사가 여러 개일 때를 위한 목록 + 상태 탭 =====
   상태: open(모집 중) · closed(모집 마감, 행사는 아직) · past(종료). 방문일 미정·공개 제품 없는 일정은 내지 않는다.
   줄을 누르면 같은 페이지의 #trip-아이디 로 가서 상세(mtEventPage)가 열린다. */
function mtEventKind(tr){ return tr.days_to_visit != null && tr.days_to_visit < 0 ? 'past' : tr.open ? 'open' : 'closed'; }
function mtEventsAll(){
  const ok = tr => tr.visit_date && MkMeet.itemsOf(tr).length;
  const up = MkMeet.upcoming().filter(ok), past = MkMeet.past().filter(ok);
  return up.filter(tr => tr.open).concat(up.filter(tr => !tr.open), past);
}
/* 목록의 한 줄(2차, 2026-10-05) — 사진(날짜 배지) | 상태·행사명·일시·장소·마감·참가 제품 | 남은 기간 + 버튼.
   1차(얇은 한 줄)는 가운데가 텅 비어 보인다는 피드백으로 교체. 사진은 행사 사진, 없으면 첫 참가 제품 사진 */
function mtEventRow(tr){
  const kind = mtEventKind(tr), d = mtDate(tr.visit_date);
  const items = MkMeet.itemsOf(tr);
  const x = MT_EVENT_X[tr.id] || {};
  /* 왼쪽 칸: 참가 제품 사진 모음(최대 4칸, 더 있으면 마지막 칸에 +n) — 행사 사진보다 무엇을 만나는지가 먼저 보이게(2026-10-05) */
  const pics = items.slice(0, 4).map((it, i) => `<span class="pi" style="background-image:url('${esc(mkProduct(it.product_id).img)}')">${i === 3 && items.length > 4 ? `<em>+${items.length - 4}</em>` : ''}</span>`).join('');
  const st = kind === 'past' ? t('mt_tab_past') : kind === 'open' ? t('mt_st_open') : t('mt_st_' + mtTripState(tr));
  const side = kind === 'open'
    ? `<span class="lb">${esc(t('mt_ev_until'))}</span><b>${tr.days_left != null && tr.days_left > 0 ? 'D-' + tr.days_left : esc(t('mt_dday_today'))}</b><span class="btn btn-primary">${esc(t('mt_list_go'))}</span>`
    : `<b class="off">${esc(st)}</b><span class="btn btn-ghost">${esc(t('mt_list_go'))}</span>`;
  return `<a class="mt-evl ${kind}" href="${mkUrl('meetings.html')}#trip-${esc(tr.id)}">
    <div class="ph n${Math.min(items.length, 4)}">${pics}
      <div class="mt-evd-date"><span class="mo">${esc(mtFmt(tr.visit_date, { month:'long' }))}</span><b>${d ? String(d.getDate()).padStart(2, '0') : ''}</b><span class="dw">${esc(mtFmt(tr.visit_date, { weekday:'long' }))}</span></div></div>
    <div class="mt-evl-main">
      <span class="mt-evl-st">${esc(st)}</span>
      <h3>${esc(L(tr.title) || t('mt_page_kick'))}${x.sub ? `<small>${esc(L(x.sub))}</small>` : ''}</h3>
      <ul class="meta">
        <li>${MT_ICO.cal}<span>${esc(mtFmt(tr.visit_date, { year:'numeric', month:'long', day:'numeric', weekday:'short' }))}${mtTime(tr) ? ' · ' + esc(mtTime(tr)) : ''}</span></li>
        <li>${MT_ICO.pin}<span>${esc(mtWhere(tr) || t('mt_tba'))}</span></li>
        ${tr.deadline && kind !== 'past' ? `<li>${MT_ICO.clock}<span>${esc(t('mt_deadline'))} ${esc(mtFmt(tr.deadline, { month:'long', day:'numeric', weekday:'short' }))}</span></li>` : ''}
      </ul>
    </div>
    <div class="mt-evl-side">${side}</div>
  </a>`;
}
let _mtListTab = 'all';
function mtListTab(k){ _mtListTab = k; const el = document.getElementById('mt-kf'); if(el){ el.innerHTML = mtEventList(); } }
function mtEventList(){
  const all = mtEventsAll();
  const n = k => all.filter(tr => mtEventKind(tr) === k).length;
  const tabs = [['all', t('mt_tab_all'), all.length], ['open', t('mt_st_open'), n('open')], ['closed', t('mt_st_closed'), n('closed')], ['past', t('mt_tab_past'), n('past')]];
  const rows = all.filter(tr => _mtListTab === 'all' || mtEventKind(tr) === _mtListTab);
  return `<div class="wrap">
    <div class="dir-top"><h1>${esc(t('mt_list_h'))}</h1><p>${esc(t('mt_list_p'))}</p></div>
    <div class="filterbar mt-evl-tabs">${tabs.map(([k, lb, c]) => `<a class="chip ${_mtListTab === k ? 'on' : ''}" href="#" onclick="mtListTab('${k}');return false">${esc(lb)} <em>${c}</em></a>`).join('')}</div>
    <div class="mt-evl-list">${rows.length ? rows.map(mtEventRow).join('') : `<div class="mt-evl-empty">${esc(t(all.length ? 'mt_list_empty' : 'mt_empty_h'))}</div>`}</div>
  </div>`;
}
/* 홈 '예정된 행사 일정' 카드(10차, 2026-10-03) — 위아래 2단.
   위: 날짜 배지 · 행사명 · 시간/장소/마감/공급사·신청 수 한 줄 · '행사 일정 자세히' 버튼
   아래: 참가 공급사(사진 크게, 달성 막대, '미팅 신청') — 공급사 수만큼 칸을 나눠 폭을 채운다(최대 4칸).
   카드 안은 선·상자로 나누지 않는다(사용자 요청: 구분하지 말고 한 섹션으로) — 여백으로만 구분.
   9차(날짜 | 정보 | 공급사 목록 3칸)는 가운데가 비고 사진이 작다는 피드백으로 교체. */
function mtFeatured(tr){
  const items = MkMeet.itemsOf(tr);
  const joined = items.reduce((a, i) => a + i.count, 0);
  const d = mtDate(tr.visit_date);
  const href = `${mkUrl('meetings.html')}#trip-${esc(tr.id)}`;
  /* 공급사가 4곳 이상이면 좌우 슬라이드(모두 표시), 3곳 이하는 폭을 나눠 채운다 */
  const slide = items.length >= 4;
  const cards = items.map(it => mtSupCard(tr, it)).join('');
  const nav = d => `<button type="button" class="mt-evd-nav ${d < 0 ? 'prev' : 'next'}" aria-label="${d < 0 ? 'Previous' : 'Next'}" onclick="mtEvdGo(this,${d})"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${d < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}"/></svg></button>`;
  const sups = slide
    ? `<div class="mt-evd-rail at-start">${nav(-1)}<div class="mt-evd-sups slide" onscroll="mtEvdSync(this)">${cards}</div>${nav(1)}</div>`
    : `<div class="mt-evd-sups ${items.length === 3 ? 'many' : ''}" style="--n:${Math.max(1, items.length)}">${cards}</div>`;
  return `<div class="mt-evd">
    <div class="mt-evd-top">
      <a class="mt-evd-date" href="${href}"><span class="mo">${esc(mtFmt(tr.visit_date, { month:'long' }))}</span><b>${d ? String(d.getDate()).padStart(2, '0') : ''}</b><span class="dw">${esc(mtFmt(tr.visit_date, { weekday:'long' }))}</span></a>
      <div class="mt-evd-main">
        <h3><a href="${href}">${esc(L(tr.title) || t('mt_page_kick'))}</a></h3>
        <ul class="meta">
          <li>${MT_ICO.clock}<span>${esc(mtTime(tr) || t('mt_tba'))}</span></li>
          <li>${MT_ICO.pin}<span>${esc(mtWhere(tr) || t('mt_tba'))}</span></li>
          ${tr.deadline ? `<li>${MT_ICO.cal}<span>${esc(t('mt_deadline'))} · ${esc(mtFmt(tr.deadline, { month:'long', day:'numeric', weekday:'short' }))}</span></li>` : ''}
          <li>${MT_ICO.users}<span>${esc(mtRep('mt_evc_sups', { n: items.length }))} · ${esc(mtRep('mt_evc_joined', { n: joined }))}</span></li>
        </ul>
      </div>
      <a class="btn btn-ghost mt-evd-go" href="${href}">${esc(t('mt_evc_detail'))} →</a>
    </div>
    ${sups}
  </div>`;
}
function mtEvdGo(btn, dir){
  const sc = btn.parentNode.querySelector('.mt-evd-sups');
  if(sc) sc.scrollBy({ left: dir * Math.max(240, sc.clientWidth * .8), behavior: 'smooth' });
}
function mtEvdSync(sc){
  const r = sc.parentNode;
  r.classList.toggle('at-start', sc.scrollLeft < 8);
  r.classList.toggle('at-end', sc.scrollLeft + sc.clientWidth > sc.scrollWidth - 8);
}
function mtHomeHtml(){
  /* 방문일이 정해진 일정만 — '방문일 미정' 일정은 이 섹션에 안 나온다(제품 카드·상세에서만 '방문일 미정'으로 신청받는다) */
  const list = MkMeet.upcoming().filter(tr => tr.visit_date && MkMeet.itemsOf(tr).length).slice(0, 4);
  if(!list.length) return '';
  return `<div class="sec-head"><h2>${esc(t('mt_home_h'))}</h2><a class="more" href="${mkUrl('meetings.html')}">${esc(t('mt_home_more'))}</a></div>`
    + list.map(mtFeatured).join('');
}
/* 제품 상세 = 펀딩 페이지. 텀블벅 프로젝트 오른쪽처럼
   '신청한 기업 n곳 · 달성률' / '남은 기간' / '목표' 를 크게, 그 아래 방문일·마감·규칙, 맨 아래 큰 신청 버튼.
   page-product.js 가 이 제품이 일정에 걸려 있으면 가격 박스 위에 넣는다. */
function mtFundingPanel(pid){
  const hit = MkMeet.forProduct(pid);
  const p = mkProduct(pid);
  if(!hit || !p) return '';
  const { trip: tr, item: it } = hit;
  const inCart = typeof Store !== 'undefined' && Store.cartHas ? Store.cartHas(pid) : false;
  const left = !tr.open ? `<b class="sm">${esc(t('mt_st_' + mtTripState(tr)))}</b>`
    : tr.days_left == null ? `<b class="sm">—</b>`
    : tr.days_left <= 0 ? `<b class="sm">${esc(t('mt_dday_today'))}</b>`
    : `<b>D-${tr.days_left}</b>`;
  return `<div class="mt-fund ${it.confirmed ? 'done' : ''}" id="meet">
    <div class="mt-fund-kick">${MT_ICO.cal}<span>${esc(t('mt_box_kick'))}</span></div>
    <div class="mt-fund-stats">
      <div class="st"><span class="lb">${esc(t('mt_pd_joined'))}</span><div class="v"><b>${it.count}</b><small>${esc(t('mt_pd_unit'))}</small><em>${mtPct(it)}%</em></div></div>
      <div class="st"><span class="lb">${esc(t('mt_pd_left'))}</span><div class="v">${left}</div></div>
      <div class="st"><span class="lb">${esc(t('mt_pd_goal'))}</span><div class="v"><b>${it.goal}</b><small>${esc(t('mt_pd_unit'))}</small></div></div>
    </div>
    ${mtBar(it)}
    <ul class="mt-fund-info">
      <li><span>${esc(t('mt_f_date'))}</span><b class="${mtWhen(tr) ? '' : 'tba'}">${esc(mtWhen(tr) || t('mt_tbd'))}</b></li>
      <li><span>${esc(t('mt_f_time'))}</span><b class="${mtTime(tr) ? '' : 'tba'}">${esc(mtTime(tr) || t('mt_tba'))}</b></li>
      <li><span>${esc(t('mt_f_venue'))}</span><b class="${mtWhere(tr) ? '' : 'tba'}">${esc(mtWhere(tr) || t('mt_tba'))}</b></li>
      ${tr.deadline ? `<li><span>${esc(t('mt_deadline'))}</span><b>${esc(mtLong(tr.deadline))}</b></li>` : ''}
      <li class="rule">${esc(it.confirmed ? mtRep('mt_apply_ok_confirmed', { g: it.goal }) : mtRep('mt_pd_rule', { g: it.goal }))}</li>
    </ul>
    <!-- 행동은 두 층: 주 행동(미팅 신청) 하나만 크게, 나머지는 아래 조용한 아이콘 줄 -->
    <div class="mt-fund-cta">${mtAction(tr, it)}</div>
    <div class="mt-tools">
      <button type="button" class="mt-tool mt-heart ${inCart ? 'on' : ''}" onclick="toggleCart('${esc(pid)}',this)">${MT_ICO.heart}<span>${esc(t('mt_tool_wish'))}</span></button>
      <button type="button" class="mt-tool" onclick="mtCopy(location.href.split('#')[0])">${MT_ICO.share}<span>${esc(t('mt_tool_share'))}</span></button>
      <a class="mt-tool" href="${mkUrl('meetings.html')}#trip-${esc(tr.id)}">${MT_ICO.cal}<span>${esc(t('mt_tool_schedule'))}</span></a>
      ${!mkCatalogHidden(p) ? `<button type="button" class="mt-tool" onclick="openCatalog('${esc(pid)}')">${MT_ICO.doc}<span>${esc(t('mt_tool_catalog'))}</span></button>` : ''}
    </div>
  </div>`;
}
/* 제품 카드 하단 — 텀블벅 카드처럼 달성률을 크게 */
function mtCardLine(pid){
  const hit = MkMeet.forProduct(pid);
  if(!hit) return '';
  const { trip: tr, item: it } = hit;
  return `<div class="mt-cardline ${it.confirmed ? 'done' : ''}">${mtJoinedHtml(it)}<em class="mt-pc">${mtPct(it)}%</em>${mtBar(it)}<span class="dd">${MT_ICO.cal}${esc(tr.visit_date ? mtRep('mt_card_line', { d: mtShort(tr.visit_date) }) : t('mt_date_tbd'))}</span></div>`;
}

/* 페이지 안의 미팅 자리들을 채운다. pageInit 뒤마다 부른다(언어 전환·신청 후 포함) */
function mtFillSlots(){
  document.querySelectorAll('[data-mt-home]').forEach(el => {
    const h = mtHomeHtml();
    el.innerHTML = h ? `<div class="wrap">${h}</div>` : '';
    el.hidden = !h;
  });
  document.querySelectorAll('[data-mt-product]').forEach(el => { el.innerHTML = mtFundingPanel(el.dataset.mtProduct); });
}
function mtRerender(){
  try{ if(typeof pageInit === 'function') pageInit(); mtFillSlots(); applyI18n(); unlockIfAuthed(); }catch(e){ console.warn('mt rerender', e); }
}

/* ---------- 신청 ---------- */
function mtNeedVerify(){
  mkModal(`<h2>${esc(t('mt_need_verify_h'))}</h2><p class="sub">${esc(t('mt_need_verify_p'))}</p>
    <a class="btn btn-primary btn-block btn-lg" href="${mkUrl('mypage.html')}">${esc(t('mt_need_verify_btn'))}</a>`);
}
const MT_CHANNELS = ['pharmacy', 'cosmetic', 'mart', 'online', 'dist', 'other'];
/* 미팅 신청 = 간편 신청 — 2026-10-03 계정·로그인 없이 신청한다(사용자 결정: 가입은 보조, 간편 신청이 메인).
   받는 것: 회사명 / 홈페이지(선택) · 업종 · 담당자 이름 / 직함(선택) · 연락처 / 이메일
   로그인한 회원이면 프로필 값으로 미리 채운다. 신청하면 그 자리에서 신청 수가 올라간다.
   이 기기에서 신청한 것은 localStorage(mk_meet_mine)에 적어 두고 버튼을 '신청 완료'로 바꾼다. */
function mtMineLocal(){
  try{ return JSON.parse(localStorage.getItem('mk_meet_mine') || '[]'); }catch(e){ return []; }
}
function mtIsMine(tripId, pid){ return mtMineLocal().includes(tripId + '|' + pid); }
function mtMarkMine(tripId, pid){
  try{ const a = mtMineLocal(); const k = tripId + '|' + pid; if(!a.includes(k)){ a.push(k); localStorage.setItem('mk_meet_mine', JSON.stringify(a.slice(-200))); } }catch(e){}
}
function openMeetApply(tripId, pid){
  const tr = MkMeet.trip(tripId), p = mkProduct(pid);
  if(!tr || !p) return;
  const s = (typeof Store !== 'undefined' && Store.session) ? Store.session() : null;
  try{ mkTrack('InitiateCheckout', { content_ids:[pid], content_type:'product', content_category:'meeting' }); }catch(e){}
  const row = (id, key, attrs, val, opt) => `<div class="f-row"><label>${esc(t(key))}${opt ? ` <span class="f-opt">${esc(t('mt_q_opt'))}</span>` : ''}</label><input id="${id}" ${attrs || ''} value="${esc(val || '')}"></div>`;
  mkModal(`<h2>${esc(t('mt_apply_h'))}</h2>
    <p class="sub">${esc(p.brand)} · ${esc(L(p.name))}<br>${esc([mtWhen(tr) || t('mt_date_tbd'), mtWhere(tr)].filter(Boolean).join(' · '))}</p>
    <div class="fs"><div class="fs-t">${esc(t('mt_q_info_h'))}</div>
      <div class="f-2col">${row('mq-company', 'mt_q_company', 'autocomplete="organization" maxlength="200"', s && s.company)}${row('mq-site', 'mt_q_site', 'inputmode="url" autocomplete="url" maxlength="300" placeholder="company.vn"', '', true)}</div>
      ${row('mq-industry', 'mt_q_industry', `maxlength="200" placeholder="${esc(t('mt_q_industry_ph'))}"`, '')}</div>
    <div class="fs"><div class="fs-t">${esc(t('mt_q_person_h'))}</div>
      <div class="f-2col">${row('mq-name', 'mt_q_name', 'autocomplete="name" maxlength="120"', s && s.contactName)}${row('mq-position', 'mt_q_position', 'autocomplete="organization-title" maxlength="120"', s && s.position, true)}</div>
      <div class="f-2col">${row('mq-phone', 'mt_q_phone', 'inputmode="tel" autocomplete="tel" maxlength="60"', s && s.phone)}${row('mq-email', 'mt_q_email', 'type="email" autocomplete="email" maxlength="200" placeholder="name@company.com"', s && s.email)}</div></div>
    <input id="mq-hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
    <div class="mst-result err" id="mq-err" style="display:none"></div>
    <p class="inq-auto">${esc(t('mt_q_note'))}</p>
    <button class="btn btn-primary btn-block btn-lg" id="mt-send" onclick="sendMeetApply('${esc(tr.id)}','${esc(pid)}')">${esc(t('mt_q_send'))}</button>`);
}
async function sendMeetApply(tripId, pid){
  const btn = document.getElementById('mt-send');
  if(btn){ if(btn.disabled) return; btn.disabled = true; }
  const done = () => { if(btn) btn.disabled = false; };
  const v = id => ((document.getElementById(id) || {}).value || '').trim();
  { const e0 = document.getElementById('mq-err'); if(e0) e0.style.display = 'none'; }   // 이전 오류 문구는 지우고 시작
  const errBox = (msg, focusId) => {
    const e = document.getElementById('mq-err'); if(e){ e.textContent = msg; e.style.display = 'block'; } else toast(msg);
    const f = focusId && document.getElementById(focusId); if(f) f.focus();
    done();
  };
  const body = { trip_id: tripId, product_id: pid,
    company: v('mq-company'), homepage: v('mq-site'), channel: v('mq-industry'),
    contact_name: v('mq-name'), position: v('mq-position'), phone: v('mq-phone'), email: v('mq-email'), hp: v('mq-hp'),
    country: MK_LANG === 'ko' ? 'KR' : MK_LANG === 'en' ? '' : 'VN' };
  for(const [id, val] of [['mq-company', body.company], ['mq-industry', body.channel], ['mq-name', body.contact_name], ['mq-phone', body.phone], ['mq-email', body.email]]){
    if(!val) return errBox(t('mt_q_err_fill'), id);
  }
  if(body.phone.replace(/\D/g, '').length < 8) return errBox(t('mt_q_err_phone'), 'mq-phone');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return errBox(t('mt_q_err_email'), 'mq-email');
  try{ const a = mkAffRef(); if(a && a.code) body.aff_ref = a.code; }catch(e){}

  let r;
  try{ r = await MkMeet.call('POST', 'apply', body); }catch(e){ r = { ok: false, data: null }; }
  done();
  if(!r.ok){
    const code = r.data && r.data.error;
    if(code === 'already'){ mtMarkMine(tripId, pid); }
    return errBox(t(code === 'already' ? 'mt_err_already' : code === 'closed' ? 'mt_err_closed' : code === 'info_required' ? 'mt_q_err_fill'
      : code === 'bad_phone' ? 'mt_q_err_phone' : code === 'rate' ? 'mt_err_rate' : 'mt_err'));
  }
  mtMarkMine(tripId, pid);
  try{ mkPixelIdentify({ em: body.email, ph: body.phone, fn: body.contact_name }); mkTrack('Lead', { content_ids:[pid], content_type:'product', content_category:'meeting' }); }catch(e){}
  const d = r.data || {};
  let url = '';
  try{ url = new URL(mkUrl('meetings.html'), document.baseURI).href.split('#')[0] + '#trip-' + tripId; }catch(e){}
  const msg = d.confirmed ? mtRep('mt_apply_ok_confirmed', { g: d.goal }) : mtRep('mt_apply_ok_p', { n: d.count, g: d.goal });
  mkModal(`<div class="mt-ok"><div class="ic">${MT_ICO.check}</div><h2>${esc(t('mt_apply_ok_h'))}</h2><p class="sub">${esc(msg)}</p><p class="sub">${esc(t('mt_apply_ok_next'))}</p></div>
    ${url ? `<div class="mt-share"><p>${esc(t('mt_share'))}</p><button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="mtCopy('${esc(url)}')">${esc(t('mt_share_btn'))}</button></div>` : ''}`);
  await MkMeet.reload();
  mtRerender();
}
async function mtCancel(tripId, pid){
  if(!confirm(t('mt_cancel_confirm'))) return;
  let r;
  try{ r = await MkMeet.call('POST', 'cancel', { trip_id: tripId, product_id: pid }); }catch(e){ r = { ok: false }; }
  toast(r.ok ? t('mt_cancel_ok') : t(r.data && r.data.error === 'closed' ? 'mt_err_closed' : 'mt_err'));
  await MkMeet.reload();
  mtRerender();
}
function mtCopy(url){
  const done = () => toast(t('mt_share_copied'));
  try{ navigator.clipboard.writeText(url).then(done, () => window.prompt('', url)); }catch(e){ window.prompt('', url); }
}

/* 사전 렌더(크롤러용 정적 사본) → 실제 렌더 교체. 한 번만 */
function mkSwapPrerender(){
  const pre = document.getElementById('mk-prerender');
  if(pre) pre.remove();
  document.documentElement.classList.remove('mk-pre');
}

/* ---------- 제휴(CTV) 추적 ----------
   마케터 링크 ?ref=코드[&ch=채널] 로 들어오면 일정 시간 기억하고 클릭 1건을 보낸다.
   문의를 보낼 때 store-supabase.addInquiry 가 mkAffRef() 를 읽어 aff_ref 를 붙인다. */
/* 저장은 두 곳: localStorage(이 호스트) + .makenov.com 공통 쿠키(vn/kr/en/makenov.com 어디로 갔다 와도 유지).
   만료는 마지막 클릭부터 다시 센다(마지막 클릭 우선).
   ★2026-09-22: 30일 고정 → 관리자 제휴 설정의 '링크 유효시간'(기본 36시간).
     관리자 값은 ?ref= 로 들어온 순간에만 한 번 물어본다(평소 페이지에는 요청을 더하지 않는다).
   ★2026-09-28: 주소창에 ?ref= 를 다시 붙이던 것을 없앴다. 붙여 둔 ?ref= 를 다음 페이지에서
     '새 클릭'으로 읽어 기한이 무한정 연장되고(36시간이 지나도 안 사라짐) 클릭 수도 페이지마다
     1건씩 올라갔다. 이제 코드는 저장소에만 남고, 들어온 주소의 ref·ch 는 읽은 뒤 지운다.
     옛 기록의 days(30일)는 더 이상 보지 않는다 — 남아 있던 30일짜리도 이 규칙으로 만료된다. */
const MK_AFF_HOURS = 36;
function mkAffHours(a){ const h = Number(a && a.hours); return h > 0 ? h : MK_AFF_HOURS; }
async function mkAffSettingHours(){
  try{
    const r = await fetch(MK_SUPABASE_URL.replace(/\/$/, '') + '/aff/v1/settings', { headers:{ apikey: MK_SUPABASE_ANON } });
    const s = await r.json();
    const h = Number(s && (s.cookieHours || 0));
    return h > 0 ? h : MK_AFF_HOURS;
  }catch(e){ return MK_AFF_HOURS; }
}
function mkAffCookie(){
  const m = document.cookie.match(/(?:^|;\s*)mk_aff=([^;]*)/);
  if(!m) return null;
  try{ return JSON.parse(decodeURIComponent(m[1])); }catch(e){ return null; }
}
function mkAffStore(a){
  try{ localStorage.setItem('mk_aff', JSON.stringify(a)); }catch(e){}
  try{
    const host = location.hostname, dom = /makenov\.com$/.test(host) ? ';domain=.makenov.com' : '';
    document.cookie = 'mk_aff=' + encodeURIComponent(JSON.stringify(a)) + ';max-age=' + Math.round(mkAffHours(a) * 3600) + ';path=/' + dom + ';SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : '');
  }catch(e){}
}
function mkAffRef(){
  let a = null;
  try{ a = JSON.parse(localStorage.getItem('mk_aff') || 'null'); }catch(e){}
  const c = mkAffCookie();
  if(c && c.code && (!a || (c.ts || 0) > (a.ts || 0))) a = c;     // 다른 서브도메인에서 더 최근에 눌렀으면 그쪽
  if(!a || !a.code) return null;
  if(Date.now() - (a.ts || 0) > mkAffHours(a) * 3600000){ mkAffForget(); return null; }
  return a;
}
/* 읽고 난 ref·ch 는 주소창에서 지운다 — 코드는 저장소에 있으므로 추적은 그대로다.
   새로고침 없이 주소만 바꾼다(replaceState). */
function mkAffCleanUrl(){
  try{
    const u = new URL(location.href);
    if(!u.searchParams.has('ref') && !u.searchParams.has('ch')) return;
    u.searchParams.delete('ref');
    u.searchParams.delete('ch');
    history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash);
  }catch(e){}
}
/* 만료된 코드는 두 저장소에서 같이 지운다 — 쿠키만 남으면 다음 페이지에서 되살아난다 */
function mkAffForget(){
  try{ localStorage.removeItem('mk_aff'); }catch(e){}
  try{
    const host = location.hostname, dom = /makenov\.com$/.test(host) ? ';domain=.makenov.com' : '';
    document.cookie = 'mk_aff=;max-age=0;path=/' + dom;
  }catch(e){}
}
function mkAffCapture(){
  const q = new URLSearchParams(location.search);
  const code = (q.get('ref') || '').toUpperCase();
  if(!/^[A-Z0-9]{4,8}$/.test(code)){
    /* ref 없이 왔어도 쿠키에 있으면 localStorage 로 옮겨 둔다(서브도메인 이동) */
    const c = mkAffCookie(); if(c && c.code){ try{ if(!localStorage.getItem('mk_aff')) localStorage.setItem('mk_aff', JSON.stringify(c)); }catch(e){} }
    mkAffRef();                                   // 기한이 지났으면 여기서 지워진다
    mkAffCleanUrl();                              // 옛 버전이 붙여 둔 ?ref= 도 걷어낸다
    return;
  }
  const ch = (q.get('ch') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16);
  mkAffStore({ code, ch, ts: Date.now(), hours: MK_AFF_HOURS });
  mkAffSettingHours().then(h => { const a = mkAffRef(); if(a && a.code === code && mkAffHours(a) !== h) mkAffStore({ ...a, hours: h }); });
  const pid = window.MK_PID || q.get('id') || '';
  try{
    fetch(MK_SUPABASE_URL.replace(/\/$/, '') + '/aff/v1/click', { method:'POST', keepalive:true,
      headers:{ 'Content-Type':'application/json', apikey: MK_SUPABASE_ANON },
      body: JSON.stringify({ code, ch, product_id: pid }) }).catch(()=>{});
  }catch(e){}
  mkAffCleanUrl();
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  document.documentElement.lang = MK_LANG;
  mkAffCapture();
  /* 로그인 상태면 고급 매칭 갱신 — 다른 기기·브라우저 삭제 뒤에도 매칭이 이어진다 */
  try{ const s = Store.session(); if(s && s.email && typeof mkPixelIdentify === 'function')
    mkPixelIdentify({ em: s.email, ph: s.phone, fn: s.contactName, country: s.country }); }catch(e){}

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

  /* 0-A) ★2026-09-29 사본은 '필터 없음' 상태로 구워져 있다. ?category= 로 들어오면 DB 부팅(1~3초)이
        끝날 때까지 '전체' 탭·전체 목록이 그대로 보여 카테고리 탭이 고장난 것처럼 보였다(업체·제품 디렉터리).
        시드(data.js)로 즉시 그리는 방법은 시드가 DB보다 낡아(삭제·비공개 제품이 남음) 쓸 수 없다.
        → DB 로 구운 사본을 그대로 쓰되, 카테고리는 사본 안에서 바로 걸러 준다(탭 on + 다른 분류 카드 숨김).
          검색어(q)·정렬(sort≠new)은 사본으로 표현할 수 없으니 그때만 사본을 바로 걷어낸다. */
  if(pre && pre.style.display !== 'none'){
    const qs = new URLSearchParams(location.search);
    const cat = qs.get('category') || '', q = qs.get('q') || '', sort = qs.get('sort') || 'new';
    if(q || sort !== 'new'){ mkSwapPrerender(); }
    else if(cat){
      pre.querySelectorAll('.chip').forEach(a=>{
        const h = a.getAttribute('href') || '';
        a.classList.toggle('on', h.includes('category=' + cat + '&') || h.endsWith('category=' + cat));
      });
      pre.querySelectorAll('[data-cat]').forEach(el=>{ if(el.dataset.cat !== cat) el.style.display = 'none'; });
    }
  }

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
  /* ★ 2026-09-29: early render 가 끝나면 사전 렌더 사본도 그 자리에서 걷어낸다.
       사본은 '필터 없음' 상태로 구워져 있어서, ?category= 로 들어오거나 사본 위의 탭·카테고리를
       눌러도 DB 부팅(1~3초)이 끝날 때까지 화면이 '전체' 그대로였다 — 탭이 고장난 것처럼 보였다
       (companies·directory·columns). 시드로 완성된 실제 렌더가 있으니 바로 보여 준다. */
  if(window.MK_EARLY_RENDER && typeof pageInit === 'function'){
    try{ pageInit(); applyI18n(); mkSwapPrerender(); }catch(e){ console.warn('early render 실패', e); }
  }

  /* 2) 그다음 데이터.
        미팅 일정(MkMeet)은 제품 데이터와 나란히 받는다. 늦으면(2.5초) 기다리지 않고
        먼저 그린 뒤, 도착하면 한 번 더 그린다 — 미팅 API 가 느려도 페이지는 안 멈춘다. */
  const meetP = MkMeet.load();
  if(typeof MkData !== 'undefined'){
    try{
      await MkData.boot();
      /* 이메일 확인 후 첫 진입이면 보관해 둔 인증 결과를 프로필에 반영한다 */
      if(Store._flushPendingProfile) await Store._flushPendingProfile();
      /* 관심제품 목록이 늦거나 멈춰도 페이지 그리기는 막지 않는다(최대 5초) */
      await Promise.race([Store.loadCart(), new Promise(r => setTimeout(r, 5000))]);
    }
    catch(e){ console.error('MAKENOV 백엔드 연결 실패 — 시드 데이터로 표시합니다', e); }
  }
  if(typeof MkImg !== 'undefined'){ try{ await MkImg.hydrate(); }catch(e){} }

  /* 3) 부팅이 끝나면 헤더를 실제 세션 상태로 확정한다.
        힌트가 로그인이라고 그렸는데 토큰이 만료된 경우까지 바로잡아야 하므로
        세션 유무와 무관하게 항상 다시 그린다. */
  if(typeof MkData !== 'undefined') renderChrome();
  let meetLate = false;
  await Promise.race([meetP, new Promise(r => setTimeout(() => { meetLate = true; r(); }, 2500))]);
  if(typeof pageInit === 'function') pageInit();
  mtFillSlots();
  applyI18n();
  mkSwapPrerender();
  if(meetLate) meetP.then(() => { if(MkMeet.trips.length) mtRerender(); });
  unlockIfAuthed();
  document.addEventListener('mk:lang', ()=>{ renderChrome(); if(typeof pageInit==='function') pageInit(); mtFillSlots(); applyI18n(); unlockIfAuthed(); });

  /* 4) ★2026-09-29 카테고리 칩(.chip)은 같은 페이지의 ?category= 링크다. 예전엔 페이지를 통째로
        다시 불러와서 탭을 누를 때마다 '사전 렌더 사본 → 실제 렌더' 순으로 화면이 깜빡였다.
        같은 페이지로 가는 칩이면 주소만 바꾸고(pushState) pageInit 으로 그 자리에서 다시 그린다.
        부팅 전(사본이 아직 보일 때)·다른 페이지로 가는 칩·새 탭 클릭은 평소대로 이동한다. */
  if(typeof pageInit === 'function'){
    const here = location.pathname.split('/').pop() || 'index.html';
    document.addEventListener('click', e=>{
      const a = e.target.closest('a.chip'); if(!a) return;
      if(document.getElementById('mk-prerender')) return;
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const href = a.getAttribute('href') || '';
      const file = href.split('?')[0].split('#')[0];
      if(file && file !== here) return;
      e.preventDefault();
      history.pushState(null, '', href);
      pageInit(); mtFillSlots(); applyI18n();
    });
    addEventListener('popstate', ()=>{ pageInit(); mtFillSlots(); applyI18n(); });
  }
});
