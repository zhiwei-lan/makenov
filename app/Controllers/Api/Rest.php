<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /rest/v1/{table} — PostgREST 미믹.
 * ------------------------------------------------------------
 * Supabase RLS 정책(supabase/03_lockdown.sql)을 PHP 로 옮긴 것이 $POLICY 다.
 * 원칙: 열람은 자유, 거래조건은 인증 바이어만, 쓰기는 관리자만.
 *
 * jsonb 컬럼은 MySQL 에 JSON "문자열" 로 저장되므로
 * 읽을 때 decode, 쓸 때 encode 해서 프론트에는 Supabase 때와
 * 완전히 같은 모양(중첩 객체)이 오간다.
 */
class Rest extends BaseApiController
{
    /** 테이블별 컬럼·타입 정보 (json = jsonb 였던 것, bool = boolean 이었던 것) */
    private const SCHEMA = [
        'companies' => [
            'cols' => ['id','brand','cat','name','tagline','intro','location','since','staff','export','brn','ceo','tel','site','certs','moq_policy','logo','cover','sort','created_at'],
            'json' => ['name','tagline','intro','location','certs'], 'bool' => [],
        ],
        'products' => [
            'cols' => ['id','company_id','cat','brand','origin','name','tagline','brand_story','img','gallery','video','detail','inquiries','views','wish_count','featured','is_new','negotiable','published','created_at'],
            'json' => ['name','tagline','brand_story','gallery','detail'],
            'bool' => ['featured','is_new','negotiable','published'],
        ],
        'product_terms' => [
            'cols' => ['product_id','price','moq','lead','terms','updated_at'],
            'json' => ['price','moq','lead','terms'], 'bool' => [],
        ],
        'columns_post' => [
            'cols' => ['id','cat','title','excerpt','body','img','date','slug','seo_title','seo_desc','published','created_at'],
            'json' => ['cat','title','excerpt','body'], 'bool' => ['published'],
        ],
        'hero_slides' => [
            'cols' => ['id','art','link','kicker','title','sub','sort','active'],
            'json' => ['kicker','title','sub'], 'bool' => ['active'],
        ],
        'faqs' => [
            'cols' => ['id','page','q','a','sort','published','created_at'],
            'json' => ['q','a'], 'bool' => ['published'],
        ],
        'notices' => [
            'cols' => ['id','title','body','date','cat','pinned','published','created_at'],
            'json' => ['title','body'], 'bool' => ['pinned','published'],
        ],
        'settings' => [
            'cols' => ['key','value','updated_at'],
            'json' => ['value'], 'bool' => [],
        ],
        'profiles' => [
            'cols' => ['id','email','country','company','address','reg_no','verified_by','verify_note','status','tier','contact_name','position','messenger','phone','created_at'],
            'json' => [], 'bool' => [],
        ],
        'wishlist' => [
            'cols' => ['buyer_id','product_id','created_at'],
            'json' => [], 'bool' => [],
        ],
        'inquiries' => [
            'cols' => ['id','product_id','buyer_id','message','status','memo','created_at'],
            'json' => [], 'bool' => [],
        ],
        'maker_leads' => [
            'cols' => ['id','company','name','tel','email','site','cat','message','status','memo','created_at'],
            'json' => [], 'bool' => [],
        ],
        'admins' => [
            'cols' => ['user_id','created_at'],
            'json' => [], 'bool' => [],
        ],
    ];

    /**
     * 접근 정책 — RLS 미믹.
     *   read:  public | verified | own | own_or_admin | admin
     *   write: admin | own | special (메서드 안에서 개별 처리)
     */
    private const POLICY = [
        'companies'     => ['read' => 'public',       'write' => 'admin'],
        'products'      => ['read' => 'public',       'write' => 'admin', 'published_only' => true],
        'product_terms' => ['read' => 'verified',     'write' => 'admin'],
        'columns_post'  => ['read' => 'public',       'write' => 'admin', 'published_only' => true],
        'hero_slides'   => ['read' => 'public',       'write' => 'admin'],
        'faqs'          => ['read' => 'public',       'write' => 'admin', 'published_only' => true],
        'notices'       => ['read' => 'public',       'write' => 'admin', 'published_only' => true],
        'settings'      => ['read' => 'public',       'write' => 'admin'],
        'profiles'      => ['read' => 'own_or_admin', 'write' => 'special'],
        'wishlist'      => ['read' => 'own',          'write' => 'special'],
        'inquiries'     => ['read' => 'own_or_admin', 'write' => 'special'],
        'maker_leads'   => ['read' => 'admin',        'write' => 'special'],
        'admins'        => ['read' => 'own',          'write' => 'none'],
    ];

    private const PK = [
        'companies' => 'id', 'products' => 'id', 'product_terms' => 'product_id',
        'columns_post' => 'id', 'hero_slides' => 'id', 'faqs' => 'id', 'notices' => 'id',
        'settings' => 'key', 'profiles' => 'id', 'inquiries' => 'id',
        'maker_leads' => 'id', 'admins' => 'user_id', 'wishlist' => 'buyer_id',
    ];

    /** 소유자 컬럼 (own 정책에서 uid 와 대조) */
    private const OWNER = [
        'profiles' => 'id', 'wishlist' => 'buyer_id', 'inquiries' => 'buyer_id', 'admins' => 'user_id',
    ];

    /* ================= 진입점 (라우트에서 table 세그먼트로 온다) ================= */

    public function handle(string $table): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        if (! isset(self::SCHEMA[$table])) {
            return $this->json(['message' => 'relation not found'], 404);
        }
        return match (service('request')->getMethod()) {
            'GET'    => $this->read($table),
            'POST'   => $this->insert($table),
            'PATCH'  => $this->update($table),
            'DELETE' => $this->delete($table),
            default  => $this->json(['message' => 'method'], 405),
        };
    }

    /* ================= SELECT ================= */

    private function read(string $table): ResponseInterface
    {
        $pol = self::POLICY[$table];

        switch ($pol['read']) {
            case 'public':
                break;
            case 'verified':
                if (! $this->isAdmin && ! $this->isVerified()) {
                    return $this->rows([]);   // RLS 처럼 조용히 0행
                }
                break;
            case 'own':
            case 'own_or_admin':
                if ($pol['read'] === 'own_or_admin' && $this->isAdmin) {
                    break;
                }
                if (! $this->uid()) {
                    return $this->rows([]);
                }
                break;
            case 'admin':
                if (! $this->isAdmin) {
                    return $this->rows([]);
                }
                break;
        }

        $b = db_connect()->table($table);
        $this->applyQuery($b, self::SCHEMA[$table]['cols'], self::SCHEMA[$table]['bool']);

        /* own 계열이면 소유자 필터를 강제로 덧붙인다 (요청 필터와 무관하게) */
        if (in_array($pol['read'], ['own', 'own_or_admin'], true) && ! $this->isAdmin) {
            $b->where(self::OWNER[$table], $this->uid());
        }
        /* published 정책 — 비관리자에겐 게시물만 */
        if (! empty($pol['published_only']) && ! $this->isAdmin) {
            $b->where('published', 1);
        }

        $rows = array_map(
            fn ($r) => $this->decode($table, $r),
            $b->get()->getResultArray()
        );
        return $this->rows($rows);
    }

    /* ================= INSERT (+ upsert) ================= */

    private function insert(string $table): ResponseInterface
    {
        $body = $this->bodyJson();
        if (! is_array($body)) {
            return $this->json(['message' => 'bad json'], 400);
        }
        $items = array_is_list($body) ? $body : [$body];

        /* --- 쓰기 권한 --- */
        $pol = self::POLICY[$table]['write'];
        if ($pol === 'none') {
            return $this->json(['message' => 'not allowed'], 403);
        }
        if ($pol === 'admin' && ! $this->isAdmin) {
            return $this->json(['message' => 'new row violates row-level security policy for table "' . $table . '"'], 403);
        }
        if ($pol === 'special' && ! $this->isAdmin) {
            foreach ($items as $it) {
                if (! $this->specialInsertAllowed($table, $it)) {
                    return $this->json(['message' => 'new row violates row-level security policy for table "' . $table . '"'], 403);
                }
            }
        }

        $db      = db_connect();
        $upsert  = $this->prefer('merge-duplicates') || $this->prefer('resolution=merge-duplicates');
        $pk      = self::PK[$table];
        $written = [];

        foreach ($items as $it) {
            $row = $this->encode($table, $it);
            if (in_array($table, ['inquiries', 'maker_leads'], true) && empty($row['id'])) {
                $row['id'] = $this->uuid();
            }
            $row['created_at'] = $row['created_at'] ?? date('Y-m-d H:i:s');
            $row['updated_at'] = date('Y-m-d H:i:s');

            if ($table === 'wishlist') {
                /* 복합 PK — 있으면 무시, 없으면 넣고 카운터 갱신 (트리거 미믹) */
                $exists = $db->table($table)
                    ->where('buyer_id', $row['buyer_id'])
                    ->where('product_id', $row['product_id'])->countAllResults();
                if (! $exists) {
                    $db->table($table)->insert($row);
                    $db->table('products')->where('id', $row['product_id'])
                        ->set('wish_count', 'wish_count + 1', false)->update();
                }
            } elseif ($upsert && isset($row[$pk])) {
                $exists = $db->table($table)->where($pk, $row[$pk])->countAllResults();
                if ($exists) {
                    $upd = $row;
                    unset($upd[$pk], $upd['created_at']);
                    $db->table($table)->where($pk, $row[$pk])->update($upd);
                } else {
                    $db->table($table)->insert($row);
                }
            } else {
                $db->table($table)->insert($row);
            }
            $written[] = $this->decode($table, $row);
        }

        if ($this->prefer('return=representation')) {
            return $this->rows($written)->setStatusCode(201);
        }
        /* text/html 기본값을 그대로 두면 디버그바(개발)가 툴바 HTML 을 주입하고,
           postgrest-js 는 빈 본문/비 JSON 을 .json() 으로 파싱하다 실패한다. */
        return $this->json(null, 201);
    }

    private function specialInsertAllowed(string $table, array $row): bool
    {
        return match ($table) {
            'maker_leads' => true,                                       // 공개 입점문의 폼
            'profiles'    => $this->uid() && ($row['id'] ?? '') === $this->uid(),
            'wishlist'    => $this->uid() && ($row['buyer_id'] ?? '') === $this->uid(),
            'inquiries'   => $this->uid()
                             && ($row['buyer_id'] ?? '') === $this->uid()
                             && $this->isVerified(),                     // RLS: 인증 바이어만 문의
            default       => false,
        };
    }

    /* ================= UPDATE ================= */

    private function update(string $table): ResponseInterface
    {
        $body = $this->bodyJson();
        if (! is_array($body)) {
            return $this->json(['message' => 'bad json'], 400);
        }
        $pol = self::POLICY[$table]['write'];
        if ($pol === 'none') {
            return $this->json(['message' => 'not allowed'], 403);
        }

        $b = db_connect()->table($table);
        $this->applyQuery($b, self::SCHEMA[$table]['cols'], self::SCHEMA[$table]['bool']);

        if (! $this->isAdmin) {
            if ($pol === 'admin') {
                return $this->emptyWrite();      // RLS 처럼 0행 처리
            }
            /* special: 자기 것만 + profiles 는 인증 관련 컬럼을 지운다(트리거 미믹) */
            if (! $this->uid() || ! isset(self::OWNER[$table])) {
                return $this->emptyWrite();
            }
            $b->where(self::OWNER[$table], $this->uid());
            if ($table === 'profiles') {
                unset($body['status'], $body['verified_by'], $body['tier'], $body['id']);
            }
            if ($table === 'inquiries' || $table === 'maker_leads') {
                return $this->emptyWrite();      // 바이어는 문의 수정 불가 (관리자 전용)
            }
        }

        $row = $this->encode($table, $body);
        $row['updated_at'] = date('Y-m-d H:i:s');
        unset($row['created_at']);
        $b->update($row);

        if ($this->prefer('return=representation')) {
            $b2 = db_connect()->table($table);
            $this->applyQuery($b2, self::SCHEMA[$table]['cols'], self::SCHEMA[$table]['bool']);
            return $this->rows(array_map(fn ($r) => $this->decode($table, $r), $b2->get()->getResultArray()));
        }
        return $this->json(null);
    }

    /* ================= DELETE ================= */

    private function delete(string $table): ResponseInterface
    {
        $pol = self::POLICY[$table]['write'];
        if ($pol === 'none') {
            return $this->json(['message' => 'not allowed'], 403);
        }

        $b = db_connect()->table($table);
        $this->applyQuery($b, self::SCHEMA[$table]['cols'], self::SCHEMA[$table]['bool']);

        if (! $this->isAdmin) {
            if ($table === 'wishlist' && $this->uid()) {
                $b->where('buyer_id', $this->uid());
            } else {
                return $this->emptyWrite();
            }
        }

        if ($table === 'wishlist') {
            /* 카운터 감소를 위해 지우기 전에 대상을 읽는다 */
            $b2 = db_connect()->table($table);
            $this->applyQuery($b2, self::SCHEMA[$table]['cols'], self::SCHEMA[$table]['bool']);
            if (! $this->isAdmin) {
                $b2->where('buyer_id', $this->uid());
            }
            $victims = $b2->get()->getResultArray();
            foreach ($victims as $v) {
                db_connect()->table('products')->where('id', $v['product_id'])
                    ->set('wish_count', 'GREATEST(0, wish_count - 1)', false)->update();
            }
        }

        $b->delete();
        return $this->json(null);
    }

    private function emptyWrite(): ResponseInterface
    {
        return $this->json(null);
    }

    /* ================= 타입 변환 ================= */

    /** DB 행 → 프론트가 기대하는 모양 (JSON 문자열 → 객체, TINYINT → bool) */
    private function decode(string $table, array $row): array
    {
        foreach (self::SCHEMA[$table]['json'] as $c) {
            if (array_key_exists($c, $row) && is_string($row[$c])) {
                $d = json_decode($row[$c], true);
                /* product_terms 는 다국어 객체 도입 전의 평문("3,000 units")이 남아 있다.
                   "3000" 같은 평문이 숫자로 디코드되면 안 되므로 객체만 인정한다. */
                if ($table === 'product_terms') {
                    $row[$c] = is_array($d) ? $d : $row[$c];
                } else {
                    $row[$c] = $d ?? $row[$c];
                }
            }
        }
        foreach (self::SCHEMA[$table]['bool'] as $c) {
            if (array_key_exists($c, $row)) {
                $row[$c] = (bool) $row[$c];
            }
        }
        unset($row['updated_at_internal']);
        return $row;
    }

    /** 프론트 페이로드 → DB 행 (객체 → JSON 문자열, bool → 0/1, 모르는 키 제거) */
    /** 실제 DB 컬럼 목록 (요청당 테이블별 1회). 마이그레이션이 아직 안 돈 컬럼을 보내면
        '알 수 없는 컬럼' 500 으로 저장 전체가 죽으므로, 없는 컬럼은 조용히 버린다. */
    private array $fieldCache = [];
    private function dbFields(string $table): array
    {
        if (! isset($this->fieldCache[$table])) {
            try {
                $this->fieldCache[$table] = db_connect()->getFieldNames($table) ?: [];
            } catch (\Throwable $e) {
                $this->fieldCache[$table] = [];
            }
        }
        return $this->fieldCache[$table];
    }

    private function encode(string $table, array $row): array
    {
        $out = [];
        $dbf = $this->dbFields($table);
        foreach ($row as $k => $v) {
            if (! in_array($k, self::SCHEMA[$table]['cols'], true)) {
                continue;
            }
            if ($dbf && ! in_array($k, $dbf, true)) {
                continue;      // 스키마 목록엔 있지만 DB 에 아직 없는 컬럼(마이그레이션 전)
            }
            if (in_array($k, self::SCHEMA[$table]['json'], true)) {
                $out[$k] = is_string($v) ? $v : json_encode($v, JSON_UNESCAPED_UNICODE);
            } elseif (in_array($k, self::SCHEMA[$table]['bool'], true)) {
                $out[$k] = $v ? 1 : 0;
            } elseif ($k === 'created_at' || $k === 'updated_at') {
                $out[$k] = $v ? date('Y-m-d H:i:s', strtotime($v)) : null;
            } else {
                $out[$k] = $v;
            }
        }
        return $out;
    }
}
