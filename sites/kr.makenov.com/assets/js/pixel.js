/* ============================================================
   MAKENOV — Meta(Facebook) Pixel 배선
   ------------------------------------------------------------
   픽셀 ID는 config.js의 MK_PIXEL_ID 한 곳에서만 관리한다.
   ID가 비어 있으면 외부 스크립트를 아예 안 부르고, 이벤트는
   콘솔에만 찍힌다 → ID 없이도 어떤 이벤트가 언제 터지는지 확인 가능.

   퍼널 대응
     PageView             모든 페이지
     Search               헤더 검색
     ViewContent          제품 상세 (광고 목적지)
     AddToWishlist        관심제품 담기
     InitiateCheckout     견적 문의 모달 열기
     Lead                 견적 문의 발송 / 유통 파트너 간편문의
     CompleteRegistration 가입 + 사업자 인증 완료
     SubmitApplication    공급사 입점 문의 (maker.html — 공급자 퍼널)

   ★ 초기에는 Lead 전환이 주 50건에 못 미쳐 학습을 못 빠져나온다.
     ViewContent / AddToWishlist 로 시작해서 위로 올려야 한다.
   ============================================================ */
(function(){
  const ID = (typeof MK_PIXEL_ID !== 'undefined' && MK_PIXEL_ID) ? String(MK_PIXEL_ID).trim() : '';
  window.MK_PIXEL_ON = !!ID;
  if(!ID) return;                       // 미설정 — base code 주입 안 함

  /* Meta 공식 base code */
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return; n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments) };
    if(!f._fbq)f._fbq=n; n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
    t=b.createElement(e); t.async=!0; t.src=v;
    s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', ID);
  fbq('track', 'PageView');
})();

/* 이벤트 ID — 나중에 서버측(Conversions API)을 붙일 때 중복 제거에 쓴다.
   지금은 브라우저에서만 쏘지만, 이 값을 같이 넘겨두면 CAPI 추가 시 코드 수정이 없다. */
function mkEventId(){
  return 'mk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/* 모든 전환 이벤트는 이 함수 하나를 통과한다.
   픽셀이 꺼져 있어도 mk:track 커스텀 이벤트는 항상 발생하므로,
   나중에 GA4·틱톡 픽셀을 붙일 때 여기만 구독하면 된다. */
function mkTrack(ev, params){
  const p = params || {};
  const eventID = mkEventId();

  if(window.MK_PIXEL_ON && typeof fbq === 'function'){
    try{ fbq('track', ev, p, { eventID }); }
    catch(e){ console.warn('MAKENOV pixel 전송 실패', ev, e); }
  }
  if(!window.MK_PIXEL_ON || (typeof MK_PIXEL_DEBUG !== 'undefined' && MK_PIXEL_DEBUG)){
    console.log('%c[MAKENOV pixel]', 'color:#27CAA1;font-weight:600',
                ev, p, window.MK_PIXEL_ON ? eventID : '(픽셀 미설정 — 전송 안 함)');
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
