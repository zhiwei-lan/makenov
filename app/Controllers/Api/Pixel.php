<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * POST /functions/v1/pixel-event — Meta 전환 API(Conversions API) 서버 전송.
 * ------------------------------------------------------------
 * 브라우저 픽셀(assets/js/pixel.js)이 전환 이벤트를 쏠 때 같은 event_id 로
 * 여기에도 보낸다. 광고 차단·iOS 설정으로 브라우저 픽셀이 놓치는 전환을
 * 서버가 메운다. Meta 는 event_id 가 같으면 하나로 합친다(중복 집계 없음).
 *
 * body: { event, event_id, params, url, user:{em,ph,fn,ln,ct,country}, fbp, fbc }
 * 응답: { ok, skipped? , err? }
 *
 * 토큰(makenov.metaCapiToken)이 비어 있으면 아무 것도 안 하고 skipped 를 돌려준다
 * → 토큰 없이 배포해도 사이트 동작에 영향 없음.
 * 개인정보(이메일·전화)는 SHA-256 으로 해시해서만 보낸다. 원문은 저장하지 않는다.
 */
class Pixel extends BaseApiController
{
    /** 서버 전송을 받는 이벤트 — pixel.js 의 MK_CAPI_EVENTS 와 같게 유지 */
    private const ALLOWED = [
        'Lead', 'CompleteRegistration', 'InitiateCheckout', 'SubmitApplication', 'Contact',
        'VerifyBusiness', 'StartRegistration', 'RequestCatalog', 'CtvSignup', 'CtvWithdraw',
    ];

    public function handle(): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        $pixel = trim((string) ($this->cfg->metaPixelId ?? ''));
        $token = trim((string) ($this->cfg->metaCapiToken ?? ''));
        if ($pixel === '' || $token === '') {
            return $this->json(['ok' => false, 'skipped' => 'no_token']);
        }

        $b = $this->bodyJson();
        if (! is_array($b)) {
            return $this->json(['ok' => false, 'err' => 'bad_json'], 400);
        }
        $event = (string) ($b['event'] ?? '');
        if (! in_array($event, self::ALLOWED, true)) {
            return $this->json(['ok' => false, 'skipped' => 'event_not_allowed']);
        }
        $eventId = preg_replace('/[^A-Za-z0-9_\-]/', '', (string) ($b['event_id'] ?? ''));
        if ($eventId === '') {
            $eventId = 'srv_' . bin2hex(random_bytes(6));
        }

        $req  = service('request');
        $user = $this->userData(is_array($b['user'] ?? null) ? $b['user'] : []);
        $user['client_ip_address'] = $req->getIPAddress();
        $user['client_user_agent'] = (string) $req->getUserAgent();
        foreach (['fbp', 'fbc'] as $k) {
            $v = trim((string) ($b[$k] ?? ''));
            if ($v !== '' && strlen($v) < 200) {
                $user[$k] = $v;
            }
        }

        /* 커스텀 파라미터 — 문자열·숫자·짧은 배열만 통과 (Meta 가 받는 형태) */
        $custom = [];
        foreach ((is_array($b['params'] ?? null) ? $b['params'] : []) as $k => $v) {
            if (! preg_match('/^[a-z_][a-z0-9_]{0,40}$/i', (string) $k)) {
                continue;
            }
            if (is_string($v)) {
                $custom[$k] = mb_substr($v, 0, 200);
            } elseif (is_int($v) || is_float($v) || is_bool($v)) {
                $custom[$k] = $v;
            } elseif (is_array($v) && count($v) <= 20) {
                $custom[$k] = $v;
            }
        }

        $url = (string) ($b['url'] ?? '');
        if (! preg_match('#^https?://[a-z0-9.-]*makenov\.com/#i', $url)) {
            $url = 'https://vn.makenov.com/';
        }
        /* 주소의 ?ref= 는 남기되 개인정보가 섞일 수 있는 나머지 쿼리는 버린다 */
        $url = preg_replace('/[?#].*$/', '', $url);

        $payload = [
            'data' => [[
                'event_name'       => $event,
                'event_time'       => time(),
                'event_id'         => $eventId,
                'event_source_url' => $url,
                'action_source'    => 'website',
                'user_data'        => $user,
                'custom_data'      => (object) $custom,
            ]],
        ];
        $test = trim((string) ($this->cfg->metaTestCode ?? ''));
        if ($test !== '') {
            $payload['test_event_code'] = $test;   // 이벤트 관리자 → 테스트 이벤트 탭에서 보인다
        }

        try {
            $client = \Config\Services::curlrequest(['timeout' => 5]);
            $res    = $client->post(
                'https://graph.facebook.com/v21.0/' . rawurlencode($pixel) . '/events',
                ['json' => $payload + ['access_token' => $token], 'http_errors' => false]
            );
            $body = json_decode((string) $res->getBody(), true) ?? [];
            if ($res->getStatusCode() >= 300 || isset($body['error'])) {
                log_message('warning', 'Meta CAPI 실패 {ev}: {msg}', [
                    'ev' => $event, 'msg' => $body['error']['message'] ?? ('http ' . $res->getStatusCode()),
                ]);
                return $this->json(['ok' => false, 'err' => 'meta_rejected']);
            }
            return $this->json(['ok' => true, 'received' => (int) ($body['events_received'] ?? 0)]);
        } catch (\Throwable $e) {
            log_message('warning', 'Meta CAPI 예외: ' . $e->getMessage());
            return $this->json(['ok' => false, 'err' => 'send_failed']);
        }
    }

    /**
     * 브라우저가 보낸 평문 연락처 → Meta 규격 정규화 + SHA-256.
     * pixel.js mkPixelNormalize 와 같은 규칙: 소문자·공백 제거, 전화는 숫자만(국가번호 포함).
     */
    private function userData(array $u): array
    {
        $out  = [];
        $norm = static fn ($v) => mb_strtolower(trim((string) $v));
        $map  = [
            'em'      => fn ($v) => str_contains($v, '@') ? $norm($v) : '',
            'ph'      => fn ($v) => (strlen($d = preg_replace('/\D/', '', (string) $v)) >= 8) ? $d : '',
            'fn'      => fn ($v) => $norm($v),
            'ln'      => fn ($v) => $norm($v),
            'ct'      => fn ($v) => preg_replace('/\s+/', '', $norm($v)),
            'country' => fn ($v) => substr($norm($v), 0, 2),
        ];
        foreach ($map as $k => $f) {
            if (! isset($u[$k]) || ! is_scalar($u[$k])) {
                continue;
            }
            $v = $f($u[$k]);
            if ($v !== '') {
                $out[$k] = [hash('sha256', $v)];
            }
        }
        return $out;
    }
}
