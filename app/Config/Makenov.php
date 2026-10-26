<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * MAKENOV API 설정.
 * 실제 값은 .env 로 덮는다 (makenov.publicToken = ... 형식).
 */
class Makenov extends BaseConfig
{
    /**
     * 공개 토큰 — Supabase 의 anon key 자리.
     * 프론트 config.js 의 MK_SUPABASE_ANON 을 이 값으로 바꾼다.
     * 아무 값이나 길게 만들어 쓰면 된다 (예: openssl rand -hex 32).
     */
    public string $publicToken = 'CHANGE_ME_PUBLIC_TOKEN';

    /** 로그인 토큰 유효시간(초). 만료되면 refresh_token 으로 재발급된다 */
    public int $tokenTtl = 60 * 60 * 24 * 7;

    /**
     * 국세청 사업자 상태조회 API 키 (공공데이터포털).
     * 비워두면 체크섬 검증만으로 통과시킨다 (엣지함수와 동일한 동작).
     */
    public string $ntsKey = '';

    /**
     * Meta 픽셀 — 전환 API(서버 전송) 설정. Api\Pixel 이 쓴다.
     *   metaPixelId    프론트 config.js 의 MK_PIXEL_ID 와 같은 값
     *   metaCapiToken  이벤트 관리자 → 설정 → 전환 API → 액세스 토큰 생성. 비우면 서버 전송 안 함
     *   metaTestCode   테스트 이벤트 탭의 TEST#### 코드. 확인 끝나면 반드시 비울 것 (실집계 안 됨)
     * .env 에서 덮는다:  makenov.metaCapiToken = EAAB…
     */
    public string $metaPixelId   = '1411974053770702';
    public string $metaCapiToken = '';
    public string $metaTestCode  = '';

    /** 업로드 저장 폴더 (public 기준 상대경로) */
    public string $uploadDir = 'uploads';

    /** 업로드 확장자 화이트리스트 — 가이드라인 §3 */
    public array $uploadExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf'];

    /** 업로드 최대 크기(바이트) — 가이드라인 §3 (5MB) */
    public int $uploadMax = 5 * 1024 * 1024;

    /** GIF 만 예외 — 애니메이션은 압축·분할이 안 되므로 20MB 까지 (2026-09-18 지시). 서버 본문 한도는 20MB 통과 확인됨 */
    public int $uploadMaxGif = 20 * 1024 * 1024;

    /** PDF(제품 카탈로그)도 20MB 까지 */
    public int $uploadMaxPdf = 20 * 1024 * 1024;

    /* ---------- 명함 (Api\Cards · Libraries\CardStorage) ----------
       ⚠ 제품 이미지(uploads, 공개)와 다른 길이다. 명함에는 실명·전화가 있어 웹 루트 밖에 둔다. */

    /** 명함 원본 저장 폴더(절대경로). 비우면 writable/cards. 서버에서 따로 두려면 .env: makenov.cardStoragePath */
    public string $cardStoragePath = '';

    /** 명함으로 받는 형식 — 내용(매직바이트)으로 판정한다. 확장자·헤더는 믿지 않는다 */
    public array $cardMimes = ['image/jpeg', 'image/png', 'image/webp'];

    /** 명함 한 장 최대 크기 — 프론트가 1600px JPEG 로 줄여 보내므로 넉넉하다 */
    public int $cardMaxBytes = 8 * 1024 * 1024;

    /** 명함 이미지 서명 링크 키. 비우면 writable/card_secret 에 자동 생성. 서버 여러 대면 .env 로 같은 값을 */
    public string $imageUrlSecret = '';

    /** 서명 링크 유효 시간(초) — 화면에 떠 있는 동안만 */
    public int $imageUrlTtl = 600;
}
