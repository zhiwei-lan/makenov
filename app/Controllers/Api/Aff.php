<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /aff/v1/* — 제휴(affiliate, CTV) 프로그램 API.
 * ------------------------------------------------------------
 * 설계: docs/superpowers/specs/2026-09-09-affiliate-design.md
 * 마케터 계정은 바이어(auth_users)와 완전히 분리 — aff_marketers + aff_tokens.
 * 프론트: public/affiliate/aff-api.js (window.AffApi) · 관리자: assets/js/admin-aff.js (AffAdmin)
 *
 *   공개      GET  campaigns · campaigns/{pid} · rankings · settings
 *             POST click · signup · login · token(refresh) · logout
 *   마케터    (Authorization: Bearer <aff access_token>)
 *             GET  me · me/summary · me/leads · me/clicks · me/withdrawals
 *             PATCH me · POST me/password · POST me/withdrawals
 *   관리자    (Authorization: Bearer <admin access_token> — 기존 auth_tokens+admins)
 *             GET  admin/campaigns · admin/leads · admin/withdrawals · admin/marketers · admin/marketers/{id} · admin/settings
 *             POST admin/campaigns/{pid} · admin/leads/{id} · admin/withdrawals/{id} · admin/marketers/{id} · admin/settings
 *
 * 스키마 가드: deploy.yml 이 `php spark migrate` 를 돌리지 않으므로(2026-09-09 확인),
 * aff_marketers 테이블이 없으면 첫 요청에서 마이그레이션을 한 번 시도한다.
 * DDL 권한이 없으면 503 {"error":"schema_missing"} — 그때는 database/aff.sql 을 개발자에게.
 */
class Aff extends BaseApiController
{
    private const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    private const DEFAULT_SETTINGS = ['minWithdraw' => 500000, 'cookieDays' => 30, 'zalo' => '', 'email' => '', 'rankReward' => ''];

    private ?array $marketer = null;   // aff_tokens 로 식별된 마케터 행
    /** 마이그레이션을 추가하면 올린다 — writable/aff_schema_ok 에 적힌 값과 다르면 latest() 를 다시 돈다 */
    private const SCHEMA_VER = '4';

    /* ================= 진입점 ================= */

    /** CI4 는 (:any) 뒤 세그먼트를 인자 여러 개로 쪼개 넘긴다 — 다시 이어 붙인다 */
    public function handle(string ...$segs): ResponseInterface
    {
        $path = implode('/', $segs);
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        if ($fail = $this->ensureSchema()) {
            return $fail;
        }
        $this->resolveMarketer();

        $seg    = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
        $method = service('request')->getMethod();
        $a = $seg[0] ?? '';
        $b = $seg[1] ?? '';
        $c = $seg[2] ?? '';

        try {
            /* --- 공개 --- */
            if ($a === 'campaigns' && $method === 'GET') {
                return $b === '' ? $this->campaigns() : $this->campaign($b);
            }
            if ($a === 'rankings' && $method === 'GET') return $this->rankings();
            if ($a === 'settings' && $method === 'GET') return $this->json($this->publicSettings());
            if ($a === 'click' && $method === 'POST')   return $this->click();
            if ($a === 'signup' && $method === 'POST')  return $this->signup();
            if ($a === 'login' && $method === 'POST')   return $this->login();
            if ($a === 'token' && $method === 'POST')   return $this->refresh();
            if ($a === 'logout' && $method === 'POST')  return $this->logout();

            /* --- 마케터 --- */
            if ($a === 'me') {
                if (! $this->marketer) {
                    return $this->err('Vui lòng đăng nhập', 401);
                }
                if ($b === '' && $method === 'GET')   return $this->json($this->pub($this->marketer));
                if ($b === '' && $method === 'PATCH') return $this->updateMe();
                if ($b === 'password' && $method === 'POST') return $this->changePassword();
                if ($b === 'summary')     return $this->summary();
                if ($b === 'leads')       return $this->myLeads();
                if ($b === 'clicks')      return $this->myClicks();
                if ($b === 'withdrawals') return $method === 'POST' ? $this->requestWithdrawal() : $this->myWithdrawals();
            }

            /* --- 관리자 --- */
            if ($a === 'admin') {
                if (! $this->isAdmin) {
                    return $this->err('관리자만 사용할 수 있습니다', 403);
                }
                if ($b === 'campaigns')   return $method === 'GET' ? $this->adminCampaigns() : $this->adminSaveCampaign($c);
                if ($b === 'leads')       return $method === 'GET' ? $this->adminLeads() : $this->adminDecideLead($c);
                if ($b === 'withdrawals') return $method === 'GET' ? $this->adminWithdrawals() : $this->adminSetWithdrawal($c);
                if ($b === 'marketers') {
                    if ($method === 'GET') return $c === '' ? $this->adminMarketers() : $this->adminMarketerDetail($c);
                    return $this->adminSetMarketer($c);
                }
                if ($b === 'settings')    return $method === 'GET' ? $this->json($this->settings()) : $this->adminSaveSettings();
                if ($b === 'demo' && $method === 'DELETE') return $this->adminDeleteDemo();
                if ($b === 'demo' && $method === 'GET')    return $this->json(['count' => db_connect()->table('aff_marketers')->where('memo', 'DEMO')->countAllResults()]);
            }
        } catch (\Throwable $e) {
            log_message('error', 'aff: ' . $e->getMessage());
            return $this->err('Có lỗi xảy ra: ' . $e->getMessage(), 500);
        }
        return $this->err('not found', 404);
    }

    /* ================= 스키마 가드 ================= */

    private function ensureSchema(): ?ResponseInterface
    {
        $flag = WRITEPATH . 'aff_schema_ok';
        if (is_file($flag) && trim((string) @file_get_contents($flag)) === self::SCHEMA_VER) {
            return null;
        }
        $db = db_connect();
        try {
            $m = service('migrations');
            $m->setNamespace('App');
            $m->latest();
            if ($db->tableExists('aff_marketers')) {
                @file_put_contents($flag, self::SCHEMA_VER);
                return null;
            }
        } catch (\Throwable $e) {
            log_message('error', 'aff schema: ' . $e->getMessage());
            return $this->json(['error' => 'schema_missing', 'message' => 'Hệ thống đang chuẩn bị. Vui lòng thử lại sau.', 'detail' => $e->getMessage()], 503);
        }
        return $this->json(['error' => 'schema_missing', 'message' => 'Hệ thống đang chuẩn bị. Vui lòng thử lại sau.'], 503);
    }

    /* ================= 마케터 인증 ================= */

    private function resolveMarketer(): void
    {
        $t = $this->bearer();
        if ($t === '' || $t === $this->cfg->publicToken || $this->user) {
            return;   // 관리자(바이어 토큰)면 여기서 끝 — 마케터 토큰이 아님
        }
        $db  = db_connect();
        $row = $db->table('aff_tokens')->where('access_token', $t)->get()->getRowArray();
        if (! $row || strtotime($row['expires_at']) < time()) {
            return;
        }
        $m = $db->table('aff_marketers')->where('id', $row['marketer_id'])->get()->getRowArray();
        if ($m && $m['status'] === 'active') {
            $this->marketer = $m;
        }
    }

    private function pub(array $m): array
    {
        unset($m['password_hash'], $m['memo']);
        $m['channels'] = self::channelsOf($m['channel'] ?? '');
        unset($m['channel']);
        return $m;
    }

    /** DB 의 channel(JSON 배열 또는 옛 평문 URL 하나) → 배열 */
    private static function channelsOf($raw): array
    {
        $raw = trim((string) $raw);
        if ($raw === '') return [];
        $d = json_decode($raw, true);
        if (is_array($d)) return array_values(array_filter(array_map('strval', $d), 'strlen'));
        return [$raw];
    }

    /** 요청의 channels[] (또는 channel 문자열) → 저장용 JSON. http(s) URL 만, 최대 6개 */
    private static function channelsJson($in): string
    {
        $arr = is_array($in) ? $in : [(string) $in];
        $out = [];
        foreach ($arr as $u) {
            $u = trim((string) $u);
            if ($u === '') continue;
            if (! preg_match('#^https?://#i', $u)) $u = 'https://' . $u;
            $out[] = substr($u, 0, 255);
            if (count($out) >= 6) break;
        }
        return json_encode(array_values(array_unique($out)), JSON_UNESCAPED_SLASHES);
    }

    private function newCode(): string
    {
        $db = db_connect();
        do {
            $s = '';
            for ($i = 0; $i < 6; $i++) {
                $s .= self::CODE_CHARS[random_int(0, strlen(self::CODE_CHARS) - 1)];
            }
        } while ($db->table('aff_marketers')->where('code', $s)->countAllResults());
        return $s;
    }

    private function session(array $m): ResponseInterface
    {
        $access  = bin2hex(random_bytes(32));
        $refresh = bin2hex(random_bytes(32));
        $ttl     = $this->cfg->tokenTtl;
        $now     = date('Y-m-d H:i:s');
        db_connect()->table('aff_tokens')->insert([
            'marketer_id' => $m['id'], 'access_token' => $access, 'refresh_token' => $refresh,
            'expires_at' => date('Y-m-d H:i:s', time() + $ttl), 'created_at' => $now, 'updated_at' => $now,
        ]);
        return $this->json([
            'access_token' => $access, 'refresh_token' => $refresh, 'expires_at' => time() + $ttl,
            'me' => $this->pub($m),
        ]);
    }

    private function signup(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $pw    = (string) ($b['password'] ?? '');
        $name  = trim((string) ($b['name'] ?? ''));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) return $this->err('Email không hợp lệ', 422);
        if (strlen($pw) < 8) return $this->err('Mật khẩu tối thiểu 8 ký tự', 422);
        if ($name === '') return $this->err('Vui lòng nhập họ tên', 422);
        $db = db_connect();
        if ($db->table('aff_marketers')->where('email', $email)->countAllResults()) {
            return $this->err('Email này đã được đăng ký', 422);
        }
        $now = date('Y-m-d H:i:s');
        $m = [
            'id' => $this->uuid(), 'code' => $this->newCode(), 'email' => $email,
            'password_hash' => password_hash($pw, PASSWORD_DEFAULT), 'name' => $name,
            'phone' => trim((string) ($b['phone'] ?? '')), 'zalo' => trim((string) ($b['zalo'] ?? '')), 'channel' => self::channelsJson($b['channels'] ?? ($b['channel'] ?? [])),
            'bank_name' => '', 'bank_account' => '', 'bank_holder' => '', 'status' => 'active',
            'created_at' => $now, 'updated_at' => $now,
        ];
        $db->table('aff_marketers')->insert($m);
        return $this->session($m);
    }

    private function login(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $m = db_connect()->table('aff_marketers')->where('email', $email)->get()->getRowArray();
        if (! $m || ! password_verify((string) ($b['password'] ?? ''), $m['password_hash'])) {
            return $this->err('Email hoặc mật khẩu không đúng', 400);
        }
        if ($m['status'] !== 'active') {
            return $this->err('Tài khoản đang bị tạm khóa. Liên hệ hỗ trợ.', 403);
        }
        return $this->session($m);
    }

    private function refresh(): ResponseInterface
    {
        $b  = $this->bodyJson() ?? [];
        $db = db_connect();
        $row = $db->table('aff_tokens')->where('refresh_token', (string) ($b['refresh_token'] ?? ''))->get()->getRowArray();
        if (! $row) return $this->err('Phiên đăng nhập hết hạn', 401);
        $m = $db->table('aff_marketers')->where('id', $row['marketer_id'])->get()->getRowArray();
        $db->table('aff_tokens')->where('id', $row['id'])->delete();   // 회전
        if (! $m || $m['status'] !== 'active') return $this->err('Tài khoản đang bị tạm khóa', 403);
        return $this->session($m);
    }

    private function logout(): ResponseInterface
    {
        $t = $this->bearer();
        if ($t !== '') {
            db_connect()->table('aff_tokens')->where('access_token', $t)->delete();
        }
        return $this->json(['ok' => true]);
    }

    private function updateMe(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $row = [];
        foreach (['name', 'phone', 'zalo', 'bank_name', 'bank_account', 'bank_holder'] as $k) {
            if (array_key_exists($k, $b)) $row[$k] = trim((string) $b[$k]);
        }
        if (array_key_exists('channels', $b)) $row['channel'] = self::channelsJson($b['channels']);
        if (isset($row['name']) && $row['name'] === '') return $this->err('Vui lòng nhập họ tên', 422);
        $row['updated_at'] = date('Y-m-d H:i:s');
        db_connect()->table('aff_marketers')->where('id', $this->marketer['id'])->update($row);
        return $this->json($this->pub(array_merge($this->marketer, $row)));
    }

    private function changePassword(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        if (! password_verify((string) ($b['old'] ?? ''), $this->marketer['password_hash'])) return $this->err('Mật khẩu hiện tại không đúng', 400);
        if (strlen((string) ($b['new'] ?? '')) < 8) return $this->err('Mật khẩu mới tối thiểu 8 ký tự', 422);
        db_connect()->table('aff_marketers')->where('id', $this->marketer['id'])
            ->update(['password_hash' => password_hash($b['new'], PASSWORD_DEFAULT), 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->json(['ok' => true]);
    }

    /* ================= 설정 ================= */

    private function settings(): array
    {
        $row = db_connect()->table('settings')->where('key', 'aff')->get()->getRowArray();
        $v = $row ? (json_decode($row['value'], true) ?: []) : [];
        return array_merge(self::DEFAULT_SETTINGS, $v);
    }

    private function publicSettings(): array
    {
        $s = $this->settings();
        return ['minWithdraw' => (int) $s['minWithdraw'], 'cookieDays' => (int) $s['cookieDays'], 'zalo' => $s['zalo'], 'email' => $s['email']];
    }

    /* ================= 캠페인 (공개) ================= */

    /** 제품 정보(vi 이름·이미지·브랜드·카테고리)를 붙인 캠페인 목록 — 승인·대기 수, 잔여 포함 */
    private function campaignRows(bool $activeOnly, bool $publishedOnly = true): array
    {
        $db = db_connect();
        $b  = $db->table('aff_campaigns c')
            ->select('c.*, p.name AS p_name, p.img AS p_img, p.brand AS p_brand, p.cat AS p_cat, p.published AS p_published')
            ->join('products p', 'p.id = c.product_id', 'left');
        if ($activeOnly) $b->where('c.active', 1);
        if ($publishedOnly) $b->where('p.published', 1);
        $rows = $b->orderBy('c.sort', 'ASC')->get()->getResultArray();
        if (! $rows) return [];

        $stats = [];
        foreach ($db->table('aff_leads')->select('product_id, status, COUNT(*) n')->groupBy(['product_id', 'status'])->get()->getResultArray() as $s) {
            $stats[$s['product_id']][$s['status']] = (int) $s['n'];
        }
        /* 평균 승인 소요일 — 접수(created_at)부터 판정(decided_at)까지, 승인 건 기준 */
        $days = [];
        foreach ($db->table('aff_leads')->select('product_id, AVG(TIMESTAMPDIFF(HOUR, created_at, decided_at)) h')->where('status', 'approved')->where('decided_at IS NOT NULL', null, false)->groupBy('product_id')->get()->getResultArray() as $s) {
            $days[$s['product_id']] = $s['h'] === null ? null : round(max(0, (float) $s['h']) / 24, 1);
        }
        $out = [];
        foreach ($rows as $r) {
            $name = json_decode($r['p_name'] ?? '', true);
            $approved = $stats[$r['product_id']]['approved'] ?? 0;
            $pending  = $stats[$r['product_id']]['pending'] ?? 0;
            $rejected = $stats[$r['product_id']]['rejected'] ?? 0;
            $cap = $r['cap'] === null ? null : (int) $r['cap'];
            $out[] = [
                'product_id' => $r['product_id'],
                'name'  => is_array($name) ? ($name['vi'] ?? $name['ko'] ?? $name['en'] ?? '') : (string) ($r['p_name'] ?? ''),
                'name_ko' => is_array($name) ? ($name['ko'] ?? '') : '',
                'brand' => $r['p_brand'] ?? '', 'cat' => $r['p_cat'] ?? '', 'img' => self::absUrl($r['p_img'] ?? ''),
                'cpa_vnd' => (int) $r['cpa_vnd'], 'cap' => $cap,
                'headline' => $r['headline'] ?? '', 'materials' => array_map([self::class, 'absUrl'], json_decode($r['materials'] ?? '[]', true) ?: []),
                'copy_text' => $r['copy_text'] ?? '', 'keywords' => json_decode($r['keywords'] ?? '[]', true) ?: [], 'rules' => $r['rules'] ?? '',
                'featured' => (bool) $r['featured'], 'active' => (bool) $r['active'], 'sort' => (int) $r['sort'],
                'approved' => $approved, 'pending' => $pending, 'rejected' => $rejected,
                'approval_rate' => self::rate($approved, $rejected), 'decided' => $approved + $rejected, 'avg_days' => $days[$r['product_id']] ?? null,
                'remaining' => $cap === null ? null : max(0, $cap - $approved - $pending),
                'published' => (bool) ($r['p_published'] ?? 0),
            ];
        }
        return $out;
    }

    /** 제품 이미지가 상대경로(assets/img/…)면 vn 호스트 절대 URL 로 — CTV 페이지는 /affiliate/ 아래라 상대경로가 깨진다 */
    private static function absUrl(string $u): string
    {
        return preg_match('#^https?://#', $u) ? $u : ($u === '' ? '' : 'https://vn.makenov.com/' . ltrim($u, './'));
    }

    /** 승인률 = 승인 ÷ (승인+반려). 판정 3건 미만이면 null(표시 안 함) */
    private static function rate(int $ok, int $rej): ?float
    {
        return ($ok + $rej) >= 3 ? round($ok / ($ok + $rej), 3) : null;
    }

    private function campaigns(): ResponseInterface
    {
        $rows = $this->campaignRows(true);
        $g = service('request')->getGet();
        if (! empty($g['featured'])) $rows = array_values(array_filter($rows, fn ($c) => $c['featured']));
        if (! empty($g['cat']))      $rows = array_values(array_filter($rows, fn ($c) => $c['cat'] === $g['cat']));
        if (($g['sort'] ?? '') === 'new') usort($rows, fn ($x, $y) => $y['sort'] <=> $x['sort']);
        else usort($rows, fn ($x, $y) => $y['cpa_vnd'] <=> $x['cpa_vnd']);
        return $this->json($rows);
    }

    private function campaign(string $pid): ResponseInterface
    {
        foreach ($this->campaignRows(true) as $c) {
            if ($c['product_id'] === $pid) return $this->json($c);
        }
        return $this->json(null);
    }

    private function rankings(): ResponseInterface
    {
        $db = db_connect();
        $ms = date('Y-m-01 00:00:00');
        $all = $db->table('aff_leads l')->select('l.marketer_id, m.name, SUM(l.amount_vnd) vnd, COUNT(*) n')
            ->join('aff_marketers m', 'm.id = l.marketer_id', 'left')
            ->where('l.status', 'approved')->where('l.decided_at >=', $ms)
            ->groupBy('l.marketer_id')->orderBy('vnd', 'DESC')->get()->getResultArray();
        /* 전체 승인률(누적) — 랭킹 카드에 같이 보여준다 */
        $rates = [];
        foreach ($db->table('aff_leads')->select("marketer_id, SUM(status='approved') ok, SUM(status='rejected') rej")->groupBy('marketer_id')->get()->getResultArray() as $r) {
            $rates[$r['marketer_id']] = self::rate((int) $r['ok'], (int) $r['rej']);
        }
        $marketers = []; $me = null;
        foreach ($all as $i => $r) {
            $n = trim((string) $r['name']);
            $row = ['rank' => $i + 1, 'name' => mb_substr($n, 0, 2) . '***', 'vnd' => (int) $r['vnd'], 'leads' => (int) $r['n'], 'rate' => $rates[$r['marketer_id']] ?? null];
            if ($i < 10) $marketers[] = $row;
            if ($this->marketer && $r['marketer_id'] === $this->marketer['id']) {
                $me = $row + ['gap' => $i > 0 ? (int) $all[$i - 1]['vnd'] - (int) $r['vnd'] : 0, 'total' => count($all)];
            }
        }
        /* 전체 인원은 활성 마케터 수. 이달 승인이 없는 사람은 승인자 다음 순위(공동 꼴찌)로 표시 — "순위 없음"이 아니라 몇 위인지 보여준다 */
        $totalActive = (int) $db->table('aff_marketers')->where('status', 'active')->countAllResults();
        if ($me) $me['total'] = $totalActive;
        if ($this->marketer && ! $me) $me = ['rank' => count($all) + 1, 'vnd' => 0, 'leads' => 0, 'rate' => $rates[$this->marketer['id']] ?? null, 'gap' => $all ? max(1, (int) end($all)['vnd']) : 0, 'total' => $totalActive, 'unranked' => true];
        $imgs = []; foreach ($this->campaignRows(false, false) as $c) $imgs[$c['product_id']] = ['img' => $c['img'], 'cpa' => $c['cpa_vnd']];
        $daysLeft = (int) date('t') - (int) date('j');
        $reward = (string) ($this->settings()['rankReward'] ?? '');
        $names = []; $namesKo = [];
        foreach ($this->campaignRows(false, false) as $c) { $names[$c['product_id']] = $c['name']; $namesKo[$c['product_id']] = $c['name_ko']; }
        $byC = $db->table('aff_leads')->select("product_id, COUNT(*) n, SUM(status='approved') ok, SUM(status='rejected') rej")
            ->groupBy('product_id')->get()->getResultArray();
        usort($byC, fn ($x, $y) => $y['n'] <=> $x['n']);
        $campaigns = [];
        foreach (array_slice($byC, 0, 10) as $i => $r) {
            $campaigns[] = ['rank' => $i + 1, 'product_id' => $r['product_id'], 'name' => $names[$r['product_id']] ?? $r['product_id'], 'name_ko' => $namesKo[$r['product_id']] ?? '', 'leads' => (int) $r['n'], 'img' => $imgs[$r['product_id']]['img'] ?? '', 'cpa_vnd' => $imgs[$r['product_id']]['cpa'] ?? 0];
        }
        $ap = array_values(array_filter($byC, fn ($r) => ((int) $r['ok'] + (int) $r['rej']) >= 3));
        usort($ap, fn ($x, $y) => ($y['ok'] / ($y['ok'] + $y['rej'])) <=> ($x['ok'] / ($x['ok'] + $x['rej'])));
        $approval = [];
        foreach (array_slice($ap, 0, 10) as $i => $r) {
            $approval[] = ['rank' => $i + 1, 'product_id' => $r['product_id'], 'name' => $names[$r['product_id']] ?? $r['product_id'], 'name_ko' => $namesKo[$r['product_id']] ?? '', 'rate' => round($r['ok'] / ($r['ok'] + $r['rej']), 3), 'img' => $imgs[$r['product_id']]['img'] ?? '', 'cpa_vnd' => $imgs[$r['product_id']]['cpa'] ?? 0];
        }
        return $this->json(['marketers' => $marketers, 'campaigns' => $campaigns, 'approval' => $approval, 'me' => $me, 'days_left' => $daysLeft, 'reward' => $reward]);
    }

    /* ================= 클릭 ================= */

    private function click(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $code = strtoupper(trim((string) ($b['code'] ?? '')));
        if (! preg_match('/^[A-Z0-9]{4,8}$/', $code)) return $this->json(['ok' => false]);
        $db = db_connect();
        if (! $db->table('aff_marketers')->where('code', $code)->where('status', 'active')->countAllResults()) {
            return $this->json(['ok' => false]);
        }
        $req = service('request');
        $ch  = preg_replace('/[^a-z0-9_-]/', '', strtolower((string) ($b['ch'] ?? '')));
        $row = [
            'code' => $code, 'product_id' => substr((string) ($b['product_id'] ?? ''), 0, 64), 'ch' => substr($ch, 0, 16),
            'day' => date('Y-m-d'), 'ua_hash' => md5($req->getIPAddress() . '|' . $req->getUserAgent()->getAgentString()),
            'created_at' => date('Y-m-d H:i:s'),
        ];
        try {
            $db->table('aff_clicks')->ignore(true)->insert($row);
        } catch (\Throwable $e) {
            /* 유일키 충돌(같은 기기 같은 날) — 무시 */
        }
        return $this->json(['ok' => true]);
    }

    /* ================= 리드 생성 — Rest::insert(inquiries) 가 부른다 ================= */

    /**
     * 문의 행에 aff_ref 가 있으면 리드를 만든다. 조건 미달이면 조용히 null.
     * 문의 저장 자체는 절대 막지 않는다(호출 쪽이 try/catch).
     */
    public static function attachLead(array $inq): ?array
    {
        $code = strtoupper(trim((string) ($inq['aff_ref'] ?? '')));
        if ($code === '' || empty($inq['id']) || empty($inq['product_id'])) return null;
        $db = db_connect();
        if (! $db->tableExists('aff_leads')) return null;
        $m = $db->table('aff_marketers')->where('code', $code)->where('status', 'active')->get()->getRowArray();
        if (! $m) return null;
        $c = $db->table('aff_campaigns')->where('product_id', $inq['product_id'])->where('active', 1)->get()->getRowArray();
        if (! $c) return null;
        if ($db->table('aff_leads')->where('inquiry_id', $inq['id'])->countAllResults()) return null;
        /* 상한 */
        if ($c['cap'] !== null) {
            $used = $db->table('aff_leads')->where('product_id', $c['product_id'])->whereIn('status', ['pending', 'approved'])->countAllResults();
            if ($used >= (int) $c['cap']) return null;
        }
        /* 같은 바이어가 같은 제품으로 90일 안에 이미 리드가 있으면 중복 — 만들지 않는다 */
        if (! empty($inq['buyer_id'])) {
            $dup = $db->table('aff_leads')->where('buyer_id', $inq['buyer_id'])->where('product_id', $c['product_id'])
                ->whereIn('status', ['pending', 'approved'])->where('created_at >=', date('Y-m-d H:i:s', strtotime('-90 days')))->countAllResults();
            if ($dup) return null;
        }
        $now = date('Y-m-d H:i:s');
        $lead = [
            'id' => vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4)),
            'inquiry_id' => $inq['id'], 'marketer_id' => $m['id'], 'product_id' => $c['product_id'],
            'buyer_id' => $inq['buyer_id'] ?? null, 'ch' => substr((string) ($inq['aff_ch'] ?? ''), 0, 16),
            'status' => 'pending', 'amount_vnd' => (int) $c['cpa_vnd'], 'created_at' => $now, 'updated_at' => $now,
        ];
        $db->table('aff_leads')->insert($lead);
        return $lead;
    }

    /* ================= 마케터 자기 데이터 ================= */

    private function balanceOf(string $mid): array
    {
        $db = db_connect();
        $ok  = (int) ($db->table('aff_leads')->selectSum('amount_vnd', 's')->where('marketer_id', $mid)->where('status', 'approved')->get()->getRowArray()['s'] ?? 0);
        $out = (int) ($db->table('aff_withdrawals')->selectSum('amount_vnd', 's')->where('marketer_id', $mid)->whereIn('status', ['requested', 'paid'])->get()->getRowArray()['s'] ?? 0);
        return ['approved_vnd' => $ok, 'withdrawn_vnd' => $out, 'balance_vnd' => $ok - $out];
    }

    private function summary(): ResponseInterface
    {
        $db = db_connect();
        $mid = $this->marketer['id'];
        $cnt = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
        foreach ($db->table('aff_leads')->select('status, COUNT(*) n')->where('marketer_id', $mid)->groupBy('status')->get()->getResultArray() as $r) {
            $cnt[$r['status']] = (int) $r['n'];
        }
        $clicks30 = $db->table('aff_clicks')->where('code', $this->marketer['code'])->where('day >=', date('Y-m-d', strtotime('-29 days')))->countAllResults();
        $s = $this->settings();
        return $this->json(array_merge(['clicks30' => $clicks30, 'leads' => $cnt, 'approval_rate' => self::rate($cnt['approved'], $cnt['rejected']), 'min_withdraw' => (int) $s['minWithdraw']], $this->balanceOf($mid)));
    }

    private function myLeads(): ResponseInterface
    {
        $names = []; $namesKo = [];
        foreach ($this->campaignRows(false, false) as $c) { $names[$c['product_id']] = $c['name']; $namesKo[$c['product_id']] = $c['name_ko']; }
        $b = db_connect()->table('aff_leads')->where('marketer_id', $this->marketer['id']);
        $st = service('request')->getGet('status');
        if ($st) $b->where('status', $st);
        $rows = $b->orderBy('created_at', 'DESC')->limit(500)->get()->getResultArray();
        return $this->json(array_map(fn ($l) => [
            'id' => $l['id'], 'product_id' => $l['product_id'], 'product_name' => $names[$l['product_id']] ?? $l['product_id'], 'product_name_ko' => $namesKo[$l['product_id']] ?? '',
            'status' => $l['status'], 'amount_vnd' => (int) $l['amount_vnd'], 'ch' => $l['ch'],
            'created_at' => $l['created_at'], 'decided_at' => $l['decided_at'], 'reject_reason' => $l['reject_reason'],
        ], $rows));
    }

    /** 일자별 클릭 (days 일) + 채널별 합계 */
    private function clicksFor(string $code, int $days): array
    {
        $db = db_connect();
        $from = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
        $by = [];
        foreach ($db->table('aff_clicks')->select('day, COUNT(*) n')->where('code', $code)->where('day >=', $from)->groupBy('day')->get()->getResultArray() as $r) {
            $by[$r['day']] = (int) $r['n'];
        }
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-$i days"));
            $out[] = ['day' => $d, 'clicks' => $by[$d] ?? 0];
        }
        $ch = [];
        foreach ($db->table('aff_clicks')->select("ch, COUNT(*) n")->where('code', $code)->where('day >=', $from)->groupBy('ch')->get()->getResultArray() as $r) {
            $ch[$r['ch'] !== '' ? $r['ch'] : 'other'] = (int) $r['n'];
        }
        return ['days' => $out, 'channels' => $ch];
    }

    private function myClicks(): ResponseInterface
    {
        $days = max(7, min(90, (int) (service('request')->getGet('days') ?: 30)));
        return $this->json($this->clicksFor($this->marketer['code'], $days));
    }

    private function myWithdrawals(): ResponseInterface
    {
        $rows = db_connect()->table('aff_withdrawals')->where('marketer_id', $this->marketer['id'])->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->json(array_map(fn ($w) => ['id' => $w['id'], 'amount_vnd' => (int) $w['amount_vnd'], 'status' => $w['status'], 'memo' => $w['memo'], 'created_at' => $w['created_at'], 'paid_at' => $w['paid_at']], $rows));
    }

    private function requestWithdrawal(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $amount = (int) floor((float) ($b['amount'] ?? 0));
        $m = $this->marketer;
        if (! $m['bank_account'] || ! $m['bank_holder']) return $this->err('Vui lòng thêm tài khoản ngân hàng trước', 422);
        $s = $this->settings();
        if ($amount < (int) $s['minWithdraw']) return $this->err('Số tiền rút tối thiểu là ' . number_format((int) $s['minWithdraw'], 0, ',', '.') . ' ₫', 422);
        if ($amount > $this->balanceOf($m['id'])['balance_vnd']) return $this->err('Số tiền vượt quá số dư hiện có', 422);
        $now = date('Y-m-d H:i:s');
        $w = [
            'id' => $this->uuid(), 'marketer_id' => $m['id'], 'amount_vnd' => $amount,
            'bank_snapshot' => json_encode(['bank_name' => $m['bank_name'], 'bank_account' => $m['bank_account'], 'bank_holder' => $m['bank_holder']], JSON_UNESCAPED_UNICODE),
            'status' => 'requested', 'memo' => '', 'paid_at' => null, 'created_at' => $now, 'updated_at' => $now,
        ];
        db_connect()->table('aff_withdrawals')->insert($w);
        return $this->json(['id' => $w['id'], 'amount_vnd' => $amount, 'status' => 'requested', 'created_at' => $now, 'paid_at' => null]);
    }

    /* ================= 관리자 ================= */

    private function adminCampaigns(): ResponseInterface
    {
        return $this->json($this->campaignRows(false, false));
    }

    private function adminSaveCampaign(string $pid): ResponseInterface
    {
        if ($pid === '') return $this->err('product_id 필요', 422);
        $b = $this->bodyJson() ?? [];
        $db = db_connect();
        $row = [];
        foreach (['cpa_vnd', 'sort'] as $k) if (array_key_exists($k, $b)) $row[$k] = (int) $b[$k];
        if (array_key_exists('cap', $b)) $row['cap'] = ($b['cap'] === null || $b['cap'] === '') ? null : (int) $b['cap'];
        foreach (['headline', 'copy_text', 'rules'] as $k) if (array_key_exists($k, $b)) $row[$k] = (string) $b[$k];
        foreach (['materials', 'keywords'] as $k) if (array_key_exists($k, $b)) $row[$k] = json_encode(array_values((array) $b[$k]), JSON_UNESCAPED_UNICODE);
        foreach (['featured', 'active'] as $k) if (array_key_exists($k, $b)) $row[$k] = $b[$k] ? 1 : 0;
        $row['updated_at'] = date('Y-m-d H:i:s');
        if ($db->table('aff_campaigns')->where('product_id', $pid)->countAllResults()) {
            $db->table('aff_campaigns')->where('product_id', $pid)->update($row);
        } else {
            $row['product_id'] = $pid;
            $row['created_at'] = $row['updated_at'];
            $db->table('aff_campaigns')->insert($row);
        }
        foreach ($this->campaignRows(false, false) as $c) {
            if ($c['product_id'] === $pid) return $this->json($c);
        }
        return $this->json(['ok' => true]);
    }

    private function adminLeads(): ResponseInterface
    {
        $db = db_connect();
        $b = $db->table('aff_leads l')
            ->select('l.*, m.code m_code, m.name m_name, m.email m_email, i.message i_message, i.status i_status, pr.company pr_company, pr.contact_name pr_contact, pr.email pr_email, pr.phone pr_phone')
            ->join('aff_marketers m', 'm.id = l.marketer_id', 'left')
            ->join('inquiries i', 'i.id = l.inquiry_id', 'left')
            ->join('profiles pr', 'pr.id = l.buyer_id', 'left');
        $st = service('request')->getGet('status');
        if ($st) $b->where('l.status', $st);
        $rows = $b->orderBy('l.created_at', 'DESC')->limit(1000)->get()->getResultArray();
        $names = [];
        foreach ($this->campaignRows(false, false) as $c) $names[$c['product_id']] = $c['name_ko'] ?: $c['name'];
        return $this->json(array_map(fn ($l) => [
            'id' => $l['id'], 'inquiry_id' => $l['inquiry_id'], 'product_id' => $l['product_id'], 'product_name' => $names[$l['product_id']] ?? $l['product_id'],
            'marketer' => ['id' => $l['marketer_id'], 'code' => $l['m_code'], 'name' => $l['m_name'], 'email' => $l['m_email']],
            'buyer' => ['company' => $l['pr_company'], 'contact' => $l['pr_contact'], 'email' => $l['pr_email'], 'phone' => $l['pr_phone']],
            'message' => $l['i_message'], 'inquiry_status' => $l['i_status'], 'ch' => $l['ch'],
            'status' => $l['status'], 'amount_vnd' => (int) $l['amount_vnd'], 'reject_reason' => $l['reject_reason'],
            'created_at' => $l['created_at'], 'decided_at' => $l['decided_at'],
        ], $rows));
    }

    private function adminDecideLead(string $id): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $status = (string) ($b['status'] ?? '');
        if (! in_array($status, ['pending', 'approved', 'rejected'], true)) return $this->err('status 값이 잘못됨', 422);
        $db = db_connect();
        if (! $db->table('aff_leads')->where('id', $id)->countAllResults()) return $this->err('리드 없음', 404);
        $db->table('aff_leads')->where('id', $id)->update([
            'status' => $status, 'reject_reason' => $status === 'rejected' ? substr((string) ($b['reason'] ?? ''), 0, 255) : null,
            'decided_at' => $status === 'pending' ? null : date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->json(['ok' => true]);
    }

    private function adminWithdrawals(): ResponseInterface
    {
        $rows = db_connect()->table('aff_withdrawals w')->select('w.*, m.code m_code, m.name m_name, m.email m_email')
            ->join('aff_marketers m', 'm.id = w.marketer_id', 'left')->orderBy('w.created_at', 'DESC')->get()->getResultArray();
        return $this->json(array_map(fn ($w) => [
            'id' => $w['id'], 'marketer' => ['id' => $w['marketer_id'], 'code' => $w['m_code'], 'name' => $w['m_name'], 'email' => $w['m_email']],
            'amount_vnd' => (int) $w['amount_vnd'], 'bank_snapshot' => json_decode($w['bank_snapshot'] ?? '{}', true) ?: [],
            'status' => $w['status'], 'memo' => $w['memo'], 'created_at' => $w['created_at'], 'paid_at' => $w['paid_at'],
        ], $rows));
    }

    private function adminSetWithdrawal(string $id): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $status = (string) ($b['status'] ?? '');
        if (! in_array($status, ['requested', 'paid', 'rejected'], true)) return $this->err('status 값이 잘못됨', 422);
        $db = db_connect();
        $w = $db->table('aff_withdrawals')->where('id', $id)->get()->getRowArray();
        if (! $w) return $this->err('출금 없음', 404);
        if ($status === 'paid' && $w['status'] !== 'paid') {
            /* 지급 전 잔액 재검증 — 이 신청분을 뺀 나머지 잔액이 음수면 막는다 */
            $bal = $this->balanceOf($w['marketer_id'])['balance_vnd'];
            if ($bal < 0) return $this->err('잔액이 부족합니다 (' . number_format($bal) . ')', 422);
        }
        $db->table('aff_withdrawals')->where('id', $id)->update([
            'status' => $status, 'memo' => array_key_exists('memo', $b) ? substr((string) $b['memo'], 0, 255) : $w['memo'],
            'paid_at' => $status === 'paid' ? date('Y-m-d H:i:s') : null, 'updated_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->json(['ok' => true]);
    }

    private function adminMarketers(): ResponseInterface
    {
        $db = db_connect();
        $rows = $db->table('aff_marketers')->orderBy('created_at', 'DESC')->get()->getResultArray();
        $leads = [];
        foreach ($db->table('aff_leads')->select('marketer_id, status, COUNT(*) n, SUM(amount_vnd) s')->groupBy(['marketer_id', 'status'])->get()->getResultArray() as $r) {
            $leads[$r['marketer_id']][$r['status']] = ['n' => (int) $r['n'], 's' => (int) $r['s']];
        }
        $wd = [];
        foreach ($db->table('aff_withdrawals')->select('marketer_id, SUM(amount_vnd) s')->whereIn('status', ['requested', 'paid'])->groupBy('marketer_id')->get()->getResultArray() as $r) {
            $wd[$r['marketer_id']] = (int) $r['s'];
        }
        $clicks = [];
        foreach ($db->table('aff_clicks')->select('code, COUNT(*) n')->where('day >=', date('Y-m-d', strtotime('-29 days')))->groupBy('code')->get()->getResultArray() as $r) {
            $clicks[$r['code']] = (int) $r['n'];
        }
        $out = [];
        foreach ($rows as $m) {
            $L = $leads[$m['id']] ?? [];
            $ok = $L['approved']['s'] ?? 0;
            $total = array_sum(array_map(fn ($x) => $x['n'], $L));
            $out[] = array_merge($this->pub($m), [
                'memo' => $m['memo'], 'clicks30' => $clicks[$m['code']] ?? 0,
                'leads' => $total, 'pending' => $L['pending']['n'] ?? 0, 'approved' => $L['approved']['n'] ?? 0, 'rejected' => $L['rejected']['n'] ?? 0,
                'approved_vnd' => $ok, 'balance_vnd' => $ok - ($wd[$m['id']] ?? 0),
                'conv' => ($clicks[$m['code']] ?? 0) > 0 ? round($total / $clicks[$m['code']], 3) : null,
                'approval_rate' => self::rate($L['approved']['n'] ?? 0, $L['rejected']['n'] ?? 0),
            ]);
        }
        usort($out, fn ($a, $b) => $b['approved_vnd'] <=> $a['approved_vnd']);
        return $this->json($out);
    }

    private function adminMarketerDetail(string $id): ResponseInterface
    {
        $db = db_connect();
        $m = $db->table('aff_marketers')->where('id', $id)->get()->getRowArray();
        if (! $m) return $this->err('마케터 없음', 404);
        $days = max(7, min(90, (int) (service('request')->getGet('days') ?: 30)));
        $names = [];
        foreach ($this->campaignRows(false, false) as $c) $names[$c['product_id']] = $c['name_ko'] ?: $c['name'];
        $byProduct = [];
        foreach ($db->table('aff_clicks')->select('product_id, COUNT(*) n')->where('code', $m['code'])->where('day >=', date('Y-m-d', strtotime('-' . ($days - 1) . ' days')))->groupBy('product_id')->get()->getResultArray() as $r) {
            $byProduct[] = ['product_id' => $r['product_id'], 'name' => $names[$r['product_id']] ?? ($r['product_id'] ?: '홈'), 'clicks' => (int) $r['n']];
        }
        usort($byProduct, fn ($a, $b) => $b['clicks'] <=> $a['clicks']);
        $leads = $db->table('aff_leads')->where('marketer_id', $id)->orderBy('created_at', 'DESC')->limit(200)->get()->getResultArray();
        return $this->json(array_merge($this->pub($m), ['memo' => $m['memo']], $this->balanceOf($id), [
            'clicks' => $this->clicksFor($m['code'], $days), 'clicks_by_product' => $byProduct,
            'leads' => array_map(fn ($l) => ['id' => $l['id'], 'product_id' => $l['product_id'], 'product_name' => $names[$l['product_id']] ?? $l['product_id'], 'ch' => $l['ch'], 'status' => $l['status'], 'amount_vnd' => (int) $l['amount_vnd'], 'created_at' => $l['created_at'], 'reject_reason' => $l['reject_reason']], $leads),
        ]));
    }

    private function adminSetMarketer(string $id): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $row = [];
        if (isset($b['status']) && in_array($b['status'], ['active', 'blocked'], true)) $row['status'] = $b['status'];
        if (array_key_exists('memo', $b)) $row['memo'] = (string) $b['memo'];
        if (! $row) return $this->err('바꿀 값 없음', 422);
        $row['updated_at'] = date('Y-m-d H:i:s');
        $db = db_connect();
        $db->table('aff_marketers')->where('id', $id)->update($row);
        if (($row['status'] ?? '') === 'blocked') $db->table('aff_tokens')->where('marketer_id', $id)->delete();   // 즉시 로그아웃
        return $this->json(['ok' => true]);
    }

    /** 데모 데이터 삭제 — memo='DEMO' 마케터와 그 리드·클릭·출금·토큰. 캠페인은 남긴다(관리자가 고쳐 씀) */
    private function adminDeleteDemo(): ResponseInterface
    {
        $db = db_connect();
        $rows = $db->table('aff_marketers')->select('id, code')->where('memo', 'DEMO')->get()->getResultArray();
        if (! $rows) return $this->json(['ok' => true, 'deleted' => 0]);
        $ids = array_column($rows, 'id'); $codes = array_column($rows, 'code');
        $db->table('aff_leads')->whereIn('marketer_id', $ids)->delete();
        $db->table('aff_withdrawals')->whereIn('marketer_id', $ids)->delete();
        $db->table('aff_tokens')->whereIn('marketer_id', $ids)->delete();
        $db->table('aff_clicks')->whereIn('code', $codes)->delete();
        $db->table('aff_marketers')->whereIn('id', $ids)->delete();
        return $this->json(['ok' => true, 'deleted' => count($ids)]);
    }

    private function adminSaveSettings(): ResponseInterface
    {
        $b = $this->bodyJson() ?? [];
        $s = $this->settings();
        if (isset($b['minWithdraw'])) $s['minWithdraw'] = max(0, (int) $b['minWithdraw']);
        if (isset($b['cookieDays']))  $s['cookieDays']  = max(1, min(365, (int) $b['cookieDays']));
        foreach (['zalo', 'email', 'rankReward'] as $k) if (array_key_exists($k, $b)) $s[$k] = trim((string) $b[$k]);
        $db = db_connect();
        $val = json_encode($s, JSON_UNESCAPED_UNICODE);
        $now = date('Y-m-d H:i:s');
        if ($db->table('settings')->where('key', 'aff')->countAllResults()) {
            $db->table('settings')->where('key', 'aff')->update(['value' => $val, 'updated_at' => $now]);
        } else {
            $db->table('settings')->insert(['key' => 'aff', 'value' => $val, 'created_at' => $now, 'updated_at' => $now]);
        }
        return $this->json($s);
    }

    /* ================= 응답 ================= */

    private function err(string $msg, int $status): ResponseInterface
    {
        return $this->json(['error' => true, 'message' => $msg], $status);
    }
}
