/* ============================================================
   MAKENOV — Meta(Facebook) Pixel 배선
   ------------------------------------------------------------
   픽셀 ID는 config.js의 MK_PIXEL_ID 한 곳에서만 관리한다.
   ID가 비어 있으면 외부 스크립트를 아예 안 부르고, 이벤트는
   콘솔에만 찍힌다 → ID 없이도 어떤 이벤트가 언제 터지는지 확인 가능.

   사이트에는 흐름이 셋이다. 픽셀은 하나지만 이벤트 이름으로 갈라 둔다 —
   표준 이벤트는 유통 파트너(buyer) 흐름에만 쓰고, 공급사·CTV 는 맞춤 이벤트.
   (CTV 가입을 CompleteRegistration 으로 쏘면 유통 파트너 가입 광고가 CTV 를 찾아간다)

   ① 유통 파트너(buyer)                 ② 공급사(maker)           ③ CTV(affiliate)
     PageView          모든 페이지          MakerStartApplication     CtvViewCampaign
     ViewCategory      디렉토리 카테고리    SubmitApplication         CtvSignup
     Search            헤더 검색                                      CtvLogin
     ViewContent       제품·공급사·칼럼                               CtvShareLink
     AddToWishlist     관심제품                                       CtvWithdraw
     StartRegistration 가입 창 열기
     VerifyBusiness    사업자 인증 통과
     CompleteRegistration 가입 완료
     InitiateCheckout  견적 문의 창 열기
     RequestCatalog    카탈로그 요청
     Lead              문의 발송 / 간편문의
     Contact           고객센터 문의 / mailto·tel·zalo 클릭

   모든 이벤트에 자동으로 붙는 파라미터
     funnel     buyer | maker | ctv
     site_lang  vi | ko | en
     page_type  home | product | company | column | directory | affiliate …
     aff_ref / aff_ch  CTV 코드·공유 채널 (링크 타고 들어온 사람)

   내부 방문 제외:  ?mk_internal=1 로 한 번 열면 그 브라우저는 픽셀이 꺼진다.
                    ?mk_internal=0 으로 다시 켠다. (우리 팀 방문이 학습을 오염시키지 않게)
   고급 매칭:       mkPixelIdentify({em, ph, fn, country}) — 가입·문의·로그인 때 호출.
                    Meta 스크립트가 브라우저에서 해시해 보낸다. 원문은 안 나간다.
   서버 전송(CAPI): 전환 이벤트는 같은 eventID 로 서버(/functions/v1/pixel-event)에도
                    보낸다. 서버 토큰이 없으면 서버가 그냥 무시한다 → 중복 집계 없음.

   ★ 초기에는 Lead 전환이 주 50건에 못 미쳐 학습을 못 빠져나온다.
     ViewContent / InitiateCheckout / CompleteRegistration 로 시작해서 위로 올려야 한다.
   ============================================================ */
(function(){
  /* 내부 방문 제외 스위치 */
  try{
    const q = new URLSearchParams(location.search);
    if(q.get('mk_internal') === '1') localStorage.setItem('mk_px_off', '1');
    if(q.get('mk_internal') === '0') localStorage.removeItem('mk_px_off');
  }catch(e){}
  window.MK_PIXEL_INTERNAL = false;
  try{ window.MK_PIXEL_INTERNAL = localStorage.getItem('mk_px_off') === '1'; }catch(e){}

  const ID = (typeof MK_PIXEL_ID !== 'undefined' && MK_PIXEL_ID) ? String(MK_PIXEL_ID).trim() : '';
  window.MK_PIXEL_ON = !!ID && !window.MK_PIXEL_INTERNAL;
  if(!window.MK_PIXEL_ON) return;      // 미설정·내부 — base code 주입 안 함

  /* Meta 공식 base code */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return; n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
    if(!f._fbq)f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
    t=b.createElement(e); t.async=!0; t.src=v;
    s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  /* 고급 매칭 — 이전에 가입·문의한 브라우저면 저장해 둔 값을 init 에 같이 넘긴다 */
  const ud = mkPixelUserData();
  if(ud) fbq('init', ID, ud); else fbq('init', ID);
  fbq('track', 'PageView', mkCommonParams(), { eventID: mkEventId() });
})();

/* 이벤트 ID — 브라우저·서버가 같은 ID 를 쓰면 Meta 가 하나로 합친다(중복 제거). */
function mkEventId(){
  return 'mk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/* Meta 표준 이벤트 목록. 여기 없는 이름은 trackCustom 으로 나간다. */
const MK_STD_EVENTS = ['PageView','ViewContent','Search','AddToWishlist','AddToCart','InitiateCheckout',
  'Lead','CompleteRegistration','Contact','SubmitApplication','Purchase','Subscribe','Schedule',
  'FindLocation','CustomizeProduct','Donate','StartTrial','AddPaymentInfo'];

/* 서버(전환 API)로도 보내는 이벤트 — 광고 최적화에 쓰는 전환만. 조회류는 브라우저만으로 충분 */
const MK_CAPI_EVENTS = ['Lead','CompleteRegistration','InitiateCheckout','SubmitApplication','Contact',
  'VerifyBusiness','StartRegistration','RequestCatalog','CtvSignup','CtvWithdraw'];

/* ---------- 공통 파라미터 ---------- */
function mkPageType(){
  const p = location.pathname.toLowerCase();
  if(/\/affiliate\//.test(p)) return 'affiliate';
  if(/\/admin\//.test(p)) return 'admin';
  if(/\/products\/|\/product\.html/.test(p)) return 'product';
  if(/\/companies\/|\/company\.html/.test(p)) return 'company';
  if(/\/columns\/|\/column\.html/.test(p)) return 'column';
  const m = p.match(/([a-z0-9_-]+)\.html$/);
  if(!m || m[1] === 'index') return 'home';
  return m[1];                         // directory | products | companies | columns | maker | support | guide | mypage | sitemap | about
}
function mkFunnel(){
  const t = mkPageType();
  if(t === 'affiliate') return 'ctv';
  if(t === 'maker') return 'maker';
  return 'buyer';
}
function mkSiteLang(){
  try{ if(typeof MK_LANG !== 'undefined' && MK_LANG) return MK_LANG; }catch(e){}
  try{ if(typeof AFF_LANG !== 'undefined' && AFF_LANG) return AFF_LANG; }catch(e){}
  return (document.documentElement.getAttribute('lang') || 'vi').slice(0, 2);
}
function mkAffParams(){
  let a = null;
  try{ a = JSON.parse(localStorage.getItem('mk_aff') || 'null'); }catch(e){}
  if(!a || !a.code){
    try{ const m = document.cookie.match(/(?:^|;\s*)mk_aff=([^;]+)/); if(m) a = JSON.parse(decodeURIComponent(m[1])); }catch(e){}
  }
  if(!a || !a.code) return {};
  const o = { aff_ref: a.code };
  if(a.ch) o.aff_ch = a.ch;
  return o;
}
function mkCommonParams(){
  return Object.assign({ funnel: mkFunnel(), site_lang: mkSiteLang(), page_type: mkPageType() }, mkAffParams());
}

/* ---------- 고급 매칭 ---------- */
/* 저장 형식: { em, ph, fn, ln, ct, country } — Meta 규격으로 정규화한 평문.
   브라우저에서는 Meta 스크립트가, 서버에서는 Pixel.php 가 SHA-256 해시한다. */
function mkPixelNormalize(u){
  const o = {};
  const s = v => String(v || '').trim().toLowerCase();
  if(u.em && /@/.test(u.em)) o.em = s(u.em);
  if(u.ph){
    let d = String(u.ph).replace(/\D/g, '');
    const dial = String(u.dial || '').replace(/\D/g, '');
    if(dial && d.startsWith('0')) d = dial + d.slice(1);        // 0901… → 84901…
    else if(dial && !d.startsWith(dial)) d = dial + d;
    if(d.length >= 8) o.ph = d;
  }
  if(u.fn) o.fn = s(u.fn);
  if(u.ln) o.ln = s(u.ln);
  if(u.ct) o.ct = s(u.ct).replace(/\s+/g, '');
  if(u.country) o.country = s(u.country).slice(0, 2);
  return o;
}
function mkPixelUserData(){
  try{ const u = JSON.parse(localStorage.getItem('mk_px_user') || 'null'); return (u && Object.keys(u).length) ? u : null; }catch(e){ return null; }
}
function mkPixelIdentify(u){
  const n = mkPixelNormalize(u || {});
  if(!Object.keys(n).length) return;
  const merged = Object.assign({}, mkPixelUserData() || {}, n);
  try{ localStorage.setItem('mk_px_user', JSON.stringify(merged)); }catch(e){}
  /* 지금 페이지에서도 바로 반영 — Meta 는 같은 ID 로 init 을 다시 부르면 userData 를 갱신한다 */
  if(window.MK_PIXEL_ON && typeof fbq === 'function' && typeof MK_PIXEL_ID !== 'undefined'){
    try{ fbq('init', String(MK_PIXEL_ID).trim(), merged); }catch(e){}
  }
}

/* ---------- 서버 전송(전환 API) ---------- */
function mkPixelCookie(name){
  try{ const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : ''; }catch(e){ return ''; }
}
function mkCapi(ev, params, eventID){
  if(window.MK_PIXEL_INTERNAL) return;
  if(typeof MK_SUPABASE_URL === 'undefined' || !MK_SUPABASE_URL) return;
  if(MK_CAPI_EVENTS.indexOf(ev) < 0) return;
  const body = {
    event: ev, event_id: eventID, params: params,
    url: location.href, user: mkPixelUserData() || {},
    fbp: mkPixelCookie('_fbp'), fbc: mkPixelCookie('_fbc'),
  };
  try{
    fetch(MK_SUPABASE_URL.replace(/\/$/, '') + '/functions/v1/pixel-event', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: (typeof MK_SUPABASE_ANON !== 'undefined' ? MK_SUPABASE_ANON : '') },
      body: JSON.stringify(body),
    }).catch(()=>{});
  }catch(e){}
}

/* ---------- 모든 전환 이벤트는 이 함수 하나를 통과한다 ----------
   픽셀이 꺼져 있어도 mk:track 커스텀 이벤트는 항상 발생하므로,
   나중에 GA4·틱톡 픽셀을 붙일 때 여기만 구독하면 된다. */
function mkTrack(ev, params){
  const p = Object.assign(mkCommonParams(), params || {});
  const eventID = mkEventId();
  const std = MK_STD_EVENTS.indexOf(ev) >= 0;

  if(window.MK_PIXEL_ON && typeof fbq === 'function'){
    try{ fbq(std ? 'track' : 'trackCustom', ev, p, { eventID }); }
    catch(e){ console.warn('MAKENOV pixel 전송 실패', ev, e); }
  }
  mkCapi(ev, p, eventID);

  if(!window.MK_PIXEL_ON || (typeof MK_PIXEL_DEBUG !== 'undefined' && MK_PIXEL_DEBUG)){
    console.log('%c[MAKENOV pixel]', 'color:#27CAA1;font-weight:600',
                ev, p, window.MK_PIXEL_ON ? eventID : (window.MK_PIXEL_INTERNAL ? '(내부 방문 — 전송 안 함)' : '(픽셀 미설정 — 전송 안 함)'));
  }

  document.dispatchEvent(new CustomEvent('mk:track', { detail:{ ev, params:p, eventID } }));
  return eventID;
}

/* 제품 → Meta 표준 파라미터.
   B2B라 가격이 잠겨 있으므로 value/currency는 넣지 않는다
   (숫자를 넣으려면 실제 거래액이어야 하고, 지금은 알 수 없다). */
function mkProductParams(p){
  if(!p) return {};
  return {
    content_ids: [p.id],
    content_type: 'product',
    content_name: (typeof L === 'function' ? L(p.name) : p.id),
    content_category: p.cat || '',
    contents: [{ id: p.id, quantity: 1 }],
  };
}

/* ---------- 연락 링크 클릭(mailto·tel·zalo) — 페이지 어디서든 Contact ----------
   문의 폼을 안 거치고 바로 메일·전화·잘로로 가는 사람도 전환으로 센다. */
document.addEventListener('click', function(ev){
  const a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
  if(!a) return;
  const h = (a.getAttribute('href') || '').trim();
  let kind = '';
  if(/^mailto:/i.test(h)) kind = 'mailto';
  else if(/^tel:/i.test(h)) kind = 'tel';
  else if(/^https?:\/\/(zalo\.me|m\.me|wa\.me|t\.me|pf\.kakao\.com)\//i.test(h)) kind = RegExp.$1.split('.')[0];
  if(!kind) return;
  if(/\/admin\//.test(location.pathname)) return;
  mkTrack('Contact', { content_category: kind, content_name: h.replace(/^(mailto|tel):/i, '').slice(0, 80) });
}, true);
