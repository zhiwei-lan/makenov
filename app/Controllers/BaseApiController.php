<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * MAKENOV API 공통 베이스.
 * ------------------------------------------------------------
 * 프론트(store-supabase.js)는 supabase-js 로 PostgREST 를 부른다.
 * 이 베이스는 그 요청 문법의 "실제로 쓰이는 부분만" 해석한다:
 *   ?select=* & col=eq.값 & col=in.(a,b) & order=col.desc & limit=N
 *   Prefer: return=representation | resolution=merge-duplicates
 *   Accept: application/vnd.pgrst.object+json  (maybeSingle)
 *
 * 인증은 두 층이다:
 *   공개 토큰(publicToken)  — Supabase anon key 자리. 모든 요청의 apikey
 *   로그인 토큰(auth_tokens) — Authorization: Bearer 로 온다. 유저를 식별
 */
abstract class BaseApiController extends Controller
{
    protected $cfg;
    protected ?array $user  = null;   // auth_users 행 (로그인 시)
    protected bool $isAdmin = false;

    public function __construct()
    {
        $this->cfg = config('Makenov');
        $this->resolveUser();
    }

    /* ---------- 토큰 ---------- */

    protected function bearer(): string
    {
        $auth = service('request')->getHeaderLine('Authorization');
        return stripos($auth, 'Bearer ') === 0 ? trim(substr($auth, 7)) : '';
    }

    protected function apikey(): string
    {
        $k = service('request')->getHeaderLine('apikey');
        return $k !== '' ? trim($k) : $this->bearer();
    }

    /** 공개 토큰 검증 — 모든 API 의 최소 관문 */
    protected function requirePublic(): ?ResponseInterface
    {
        $sent = $this->apikey();
        if ($sent !== $this->cfg->publicToken && $this->user === null) {
            return $this->json(['message' => 'invalid api key'], 401);
        }
        return null;
    }

    /** Bearer 가 로그인 토큰이면 유저·관리자 여부를 채운다 */
    private function resolveUser(): void
    {
        $t = $this->bearer();
        if ($t === '' || $t === $this->cfg->publicToken) {
            return;
        }
        $db  = db_connect();
        $row = $db->table('auth_tokens')
            ->select('auth_tokens.user_id, auth_tokens.expires_at, auth_users.email, auth_users.email_confirmed_at, auth_users.created_at')
            ->join('auth_users', 'auth_users.id = auth_tokens.user_id')
            ->where('auth_tokens.access_token', $t)
            ->get()->getRowArray();
        if (! $row || strtotime($row['expires_at']) < time()) {
            return;
        }
        $this->user = [
            'id'    => $row['user_id'],
            'email' => $row['email'],
            'email_confirmed_at' => $row['email_confirmed_at'],
            'created_at'         => $row['created_at'],
        ];
        $this->isAdmin = (bool) $db->table('admins')
            ->where('user_id', $row['user_id'])->countAllResults();
    }

    protected function uid(): ?string
    {
        return $this->user['id'] ?? null;
    }

    /** 사업자 인증 완료 바이어인지 — RLS is_verified() 미믹 */
    protected function isVerified(): bool
    {
        if (! $this->uid()) {
            return false;
        }
        return (bool) db_connect()->table('profiles')
            ->where('id', $this->uid())->where('status', 'verified')
            ->countAllResults();
    }

    /* ---------- PostgREST 쿼리 해석 ---------- */

    /** ?col=eq.값 필터들을 [ [col, op, val], ... ] 로 */
    protected function filters(): array
    {
        $out = [];
        foreach (service('request')->getGet() as $k => $v) {
            if (in_array($k, ['select', 'order', 'limit', 'offset'], true)) {
                continue;
            }
            if (preg_match('/^eq\.(.*)$/s', $v, $m)) {
                $out[] = [$k, 'eq', $m[1]];
            } elseif (preg_match('/^in\.\((.*)\)$/s', $v, $m)) {
                $vals = array_map(
                    static fn ($s) => trim(trim($s), '"'),
                    explode(',', $m[1])
                );
                $out[] = [$k, 'in', $vals];
            }
        }
        return $out;
    }

    /** 빌더에 필터·정렬·개수 적용 */
    protected function applyQuery($builder, array $allowedCols, array $boolCols = [])
    {
        foreach ($this->filters() as [$col, $op, $val]) {
            if (! in_array($col, $allowedCols, true)) {
                continue;   // 모르는 컬럼은 조용히 무시 (PostgREST 는 400 이지만, 실사용 호출엔 없다)
            }
            if ($op === 'eq') {
                /* bool 컬럼은 PostgREST 처럼 'true'/'false' 문자열을 1/0 으로 */
                if (in_array($col, $boolCols, true)) {
                    $val = $val === 'true' ? 1 : 0;
                }
                $builder->where($col, $val);
            } else {
                $builder->whereIn($col, $val);
            }
        }
        $order = service('request')->getGet('order');
        if ($order) {
            foreach (explode(',', $order) as $part) {
                $bits = explode('.', $part);
                $col  = $bits[0];
                $dir  = in_array('desc', $bits, true) ? 'DESC' : 'ASC';
                if (in_array($col, $allowedCols, true)) {
                    $builder->orderBy($col, $dir);
                }
            }
        }
        $limit = (int) (service('request')->getGet('limit') ?? 0);
        if ($limit > 0) {
            $builder->limit($limit);
        }
        return $builder;
    }

    /** maybeSingle()/single() 호출인지 — Accept 헤더로 판단 */
    protected function wantsSingle(): bool
    {
        return str_contains(service('request')->getHeaderLine('Accept'), 'vnd.pgrst.object');
    }

    protected function prefer(string $needle): bool
    {
        return str_contains(service('request')->getHeaderLine('Prefer'), $needle);
    }

    /* ---------- 응답 ---------- */

    protected function json($data, int $status = 200): ResponseInterface
    {
        return $this->response->setStatusCode($status)
            ->setContentType('application/json')
            ->setBody(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /** 조회 결과를 supabase-js 가 기대하는 모양으로.
     *  single 요청에 0행이면 PGRST116 — supabase-js maybeSingle 이 null 로 바꿔 준다 */
    protected function rows(array $rows): ResponseInterface
    {
        if ($this->wantsSingle()) {
            if (count($rows) === 1) {
                return $this->json($rows[0]);
            }
            return $this->json([
                'code'    => 'PGRST116',
                'message' => 'JSON object requested, multiple (or no) rows returned',
                'details' => 'Results contain ' . count($rows) . ' rows',
            ], 406);
        }
        return $this->json($rows);
    }

    protected function bodyJson()
    {
        return json_decode(service('request')->getBody() ?? '', true);
    }

    protected function uuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0F) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3F) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }
}
