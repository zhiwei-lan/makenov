/* 00============================================================
   MAKENOV 백엔드 설정
   ------------------------------------------------------------
   아래 두 값을 채우면 자동으로 Supabase 모드로 전환됩니다.
   비워두면 지금까지처럼 브라우저 저장(localStorage) 모드로 동작합니다.

   값 찾는 곳: Supabase 대시보드 → Project Settings → API
     MK_SUPABASE_URL  = Project URL
     MK_SUPABASE_ANON = anon / public 키

   ⚠️ anon 키는 브라우저에 노출되는 게 정상입니다. 보안은 RLS가 담당합니다.
      service_role 키는 절대 여기 넣지 마세요.
   ============================================================ */
const MK_SUPABASE_URL  = 'http://makenov.vigo.co.kr/';
const MK_SUPABASE_ANON = 'c588966176574f36d29d4dc71fed1485bb1626adc5f794ff5e1409da69815080';

/* 국세청 사업자 조회를 Edge Function으로 넘길지 여부.
   true 면 verify.js 가 키를 들고 있지 않고 서버 함수를 호출합니다. */
const MK_USE_EDGE_VERIFY = true;

/* ============================================================
   Meta(Facebook) Pixel
   ------------------------------------------------------------
   여기에 픽셀 ID(숫자 15~16자리)만 채우면 광고 추적이 켜집니다.
   찾는 곳: Meta 이벤트 관리자 → 데이터 소스 → 픽셀 → 세부정보

   비워두면 픽셀 스크립트를 아예 불러오지 않고,
   이벤트는 콘솔에만 찍힙니다(배선 확인용). 사이트 동작에는 영향 없음.

   ⚠️ 광고 집행 전 준비물
     1) 배포 후 Meta 비즈니스 관리자에서 makenov.com 도메인 인증
     2) 이벤트 관리자에서 우선순위 8개 이벤트(AEM) 설정
        권장 순서: Lead > CompleteRegistration > InitiateCheckout
                   > AddToWishlist > ViewContent > Search > PageView
   ============================================================ */
const MK_PIXEL_ID = '';           // 예: '1234567890123456'
const MK_PIXEL_DEBUG = false;     // true 면 발생 이벤트를 콘솔에 전부 출력

const MK_BACKEND = (MK_SUPABASE_URL && MK_SUPABASE_ANON) ? 'supabase' : 'local';
