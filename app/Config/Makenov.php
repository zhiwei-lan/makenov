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

    /** 업로드 저장 폴더 (public 기준 상대경로) */
    public string $uploadDir = 'uploads';

    /** 업로드 확장자 화이트리스트 — 가이드라인 §3 */
    public array $uploadExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf'];

    /** 업로드 최대 크기(바이트) — 가이드라인 §3 (5MB) */
    public int $uploadMax = 5 * 1024 * 1024;
}
