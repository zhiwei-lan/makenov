<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /functions/v1/verify-business — 사업자 인증.
 * supabase/functions/verify-business/index.ts 를 그대로 옮긴 것.
 *
 * body: { method: 'brn'|'mst'|'domain', regNo, company, email, country }
 * 응답: { ok, company, address, status, checked, profileWritten? , err? }
 *
 * 로그인 토큰(Bearer)이 실려 왔고 인증을 통과했으면 profiles 에 확정 기록한다.
 * 클라이언트는 status='verified' 를 직접 못 쓰므로(Rest.php 가 지움)
 * 여기가 인증 확정의 유일한 경로다 — 엣지함수 때와 동일한 구조.
 */
class Verify extends BaseApiController
{
    public function handle(): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        $b = $this->bodyJson();
        if (! is_array($b)) {
            return $this->json(['ok' => false, 'err' => 'bad_json'], 400);
        }
        $method  = $b['method'] ?? '';
        $regNo   = (string) ($b['regNo'] ?? '');
        $company = (string) ($b['company'] ?? '');
        $email   = (string) ($b['email'] ?? '');
        $country = (string) ($b['country'] ?? '');

        $res = match ($method) {
            'brn'    => $this->verifyKR($regNo, $company),
            'mst'    => $this->verifyVN($regNo),
            'domain' => $this->verifyDomain($email, $company),
            default  => null,
        };
        if ($res === null) {
            return $this->json(['ok' => false, 'err' => 'unknown_method'], 400);
        }

        /* 로그인 사용자의 요청이고 통과했으면 프로필 확정 */
        if (! empty($res['ok']) && $this->uid()) {
            $w = $this->markVerified($res, $regNo, $country);
            $res['profileWritten'] = $w;
            if (! $w) {
                $res['profileError'] = 'db_write_failed';
            }
        }
        return $this->json($res);
    }

    /* ---------- 한국: 사업자등록번호 ---------- */

    /** 국세청 공식 체크섬 — 가중치 [1,3,7,1,3,7,1,3,5] + 9번째×5의 십의 자리 */
    private function validKoreanBRN(string $input): bool
    {
        $d = preg_replace('/\D/', '', $input);
        if (strlen($d) !== 10) {
            return false;
        }
        $w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += (int) $d[$i] * $w[$i];
        }
        $sum += intdiv((int) $d[8] * 5, 10);
        return ((10 - ($sum % 10)) % 10) === (int) $d[9];
    }

    private function verifyKR(string $regNo, string $company): array
    {
        $d = preg_replace('/\D/', '', $regNo);
        if (! $this->validKoreanBRN($d)) {
            return ['ok' => false, 'err' => 'invalid_brn'];
        }
        $key = $this->cfg->ntsKey;
        if ($key === '') {
            return ['ok' => true, 'company' => $company, 'address' => '',
                    'status' => '체크섬 검증 통과 (국세청 키 미설정)', 'checked' => 'checksum'];
        }
        try {
            $r = $this->httpJson(
                'https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=' . rawurlencode($key),
                ['b_no' => [$d]]
            );
            $item = $r['data'][0] ?? null;
            if (! $item) {
                return ['ok' => false, 'err' => 'nts_down'];
            }
            $st = $item['b_stt'] ?? '';
            if ($st === '') {
                return ['ok' => false, 'err' => 'not_registered'];
            }
            if (str_contains($st, '폐업')) {
                return ['ok' => false, 'err' => 'closed'];
            }
            return ['ok' => true, 'company' => $company, 'address' => '',
                    'status' => $st . (! empty($item['tax_type']) ? ' · ' . $item['tax_type'] : ''),
                    'taxType' => $item['tax_type'] ?? '', 'checked' => 'nts'];
        } catch (\Throwable $e) {
            return ['ok' => true, 'company' => $company, 'address' => '',
                    'status' => '체크섬 검증 통과 (국세청 응답 없음)', 'checked' => 'checksum'];
        }
    }

    /* ---------- 베트남: 세금코드(MST) ---------- */

    private function verifyVN(string $regNo): array
    {
        $d = preg_replace('/\D/', '', $regNo);
        if (strlen($d) < 10) {
            return ['ok' => false, 'err' => 'invalid_mst'];
        }
        try {
            $r = $this->httpJson('https://api.vietqr.io/v2/business/' . $d, null);
            if (empty($r['data']['name'])) {
                return ['ok' => false, 'err' => 'not_found'];
            }
            return ['ok' => true, 'company' => $r['data']['name'],
                    'address' => $r['data']['address'] ?? '',
                    'status' => $r['data']['status'] ?? '', 'checked' => 'gov'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'err' => 'not_found'];
        }
    }

    /* ---------- 그 외 국가: 회사 도메인 ---------- */

    private const FREE_MAIL = [
        'gmail.com', 'googlemail.com', 'naver.com', 'daum.net', 'hanmail.net', 'nate.com', 'kakao.com',
        'yahoo.com', 'yahoo.co.jp', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com',
        'me.com', 'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'gmx.com', 'mail.com',
        'yandex.com', 'qq.com', '163.com', '126.com', 'sina.com', 'foxmail.com',
    ];

    private function verifyDomain(string $email, string $company): array
    {
        if (! preg_match('/^[^\s@]+@([^\s@]+\.[^\s@]+)$/', strtolower($email), $m)) {
            return ['ok' => false, 'err' => 'invalid_email'];
        }
        $domain = $m[1];
        if (in_array($domain, self::FREE_MAIL, true)) {
            return ['ok' => false, 'err' => 'free_mail'];
        }
        if ($company === '') {
            return ['ok' => false, 'err' => 'missing'];
        }
        /* dns.google 대신 PHP 내장 조회 — 실패는 통과시키고 관리자 검수 (원본과 동일한 태도) */
        if (function_exists('checkdnsrr') && ! checkdnsrr($domain, 'A') && ! checkdnsrr($domain, 'MX')) {
            return ['ok' => false, 'err' => 'domain_dead'];
        }
        return ['ok' => true, 'company' => $company, 'address' => '',
                'status' => '회사 도메인 확인 (' . $domain . ')',
                'checked' => 'domain', 'accountEmail' => strtolower(trim($email))];
    }

    /* ---------- 확정 기록 ---------- */

    private function markVerified(array $res, string $regNo, string $country): bool
    {
        $patch = [
            'status'      => 'verified',
            'verified_by' => $res['checked'] ?? 'manual',
            'verify_note' => $res['status'] ?? '',
            'reg_no'      => $regNo,
            'company'     => $res['company'] ?? '',
            'address'     => $res['address'] ?? '',
            'updated_at'  => date('Y-m-d H:i:s'),
        ];
        if ($country !== '') {
            $patch['country'] = $country;
        }
        return (bool) db_connect()->table('profiles')
            ->where('id', $this->uid())->update($patch);
    }

    /* ---------- HTTP ---------- */

    private function httpJson(string $url, ?array $post): array
    {
        $client   = \Config\Services::curlrequest(['timeout' => 8]);
        $response = $post === null
            ? $client->get($url)
            : $client->post($url, ['json' => $post]);
        return json_decode($response->getBody(), true) ?? [];
    }
}
