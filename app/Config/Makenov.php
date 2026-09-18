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
}
