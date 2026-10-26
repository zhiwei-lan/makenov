<?php

/**
 * 검색·중복 비교용 정규화. 표시는 늘 원문으로 하고, 비교에만 이 값을 쓴다.
 */

if (! function_exists('mk_normalize_text')) {
    /**
     * "Công ty TNHH Á Châu" → "cong ty tnhh a chau"
     * 성조(결합 문자)를 분해해 제거한 뒤 소문자. đ/Đ 는 결합 문자가 아니라 따로 바꾼다.
     */
    function mk_normalize_text(?string $s): string
    {
        $s = trim((string) $s);
        if ($s === '') {
            return '';
        }
        $s = str_replace(['đ', 'Đ'], ['d', 'D'], $s);
        if (class_exists('Normalizer')) {
            $s = Normalizer::normalize($s, Normalizer::FORM_D) ?: $s;
            $s = preg_replace('/\p{Mn}+/u', '', $s) ?? $s;
        }
        $s = mb_strtolower($s, 'UTF-8');
        $s = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $s) ?? $s;

        return trim(preg_replace('/\s+/u', ' ', $s) ?? $s);
    }
}

if (! function_exists('mk_normalize_phone')) {
    /**
     * 전화번호 비교 키 — 끝 9자리.
     * "+84 (0)28-1234-5678" · "028 1234 5678" → "812345678".
     * 국가를 추측하지 않는다 — 0 으로 시작하면 84 를 붙이는 식은 한국 010 번호를
     * 베트남 번호로 둔갑시킨다. 앞자리만 다른 표기를 같게 보려고 뒤에서 자른다.
     */
    function mk_normalize_phone(?string $s): string
    {
        $d = preg_replace('/\D+/', '', (string) $s) ?? '';
        if ($d === '') {
            return '';
        }

        return strlen($d) <= 9 ? $d : substr($d, -9);
    }
}
