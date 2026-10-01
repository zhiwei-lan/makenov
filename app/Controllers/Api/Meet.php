<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /meet/v1/* — 미팅 펀딩(방문 일정) API.
 * ------------------------------------------------------------
 * 한국 공급사 담당자가 정해진 날(visit_date)에 베트남에 온다. 공급사(제품)별로
 * 인증 바이어가 goal(기본 5)곳 이상 신청하면 그 미팅은 확정된다. 마감(deadline)이 지나면 신청 종료.
 * 설계: docs/superpowers/specs/2026-09-29-meeting-funding-design.md
 * 프론트: public/assets/js/meet.js (window.MkMeet) · 관리자: assets/js/admin-meet.js (MeetAdmin)
 *
 *   공개      GET  trips · trips/{id}               (개수만, 개인정보 없음)
 *   바이어    GET  me                                (내 신청 목록)
 *             POST apply · cancel                   (apply 는 사업자 인증 완료자만)
 *   관리자    GET  admin/trips · admin/requests
 *             POST admin/trips/{id} · admin/requests/{id}
 *             DELETE admin/trips/{id}
 *
 * 스키마 가드: deploy.yml 이 `php spark migrate` 를 돌리지 않으므로 Aff 와 같은 방식으로
 * meet_trips 가 없으면 첫 요청에서 마이그레이션을 한 번 돌린다.
 */
class Meet extends BaseApiController
{
    /** 마이그레이션을 추가하면 올린다 — writable/meet_schema_ok 에 적힌 값과 다르면 latest() 를 다시 돈다 */
    private const SCHEMA_VER = '4';
    /** 마감·D-day 계산 기준 시간대 — 바이어가 베트남에 있다 */
    private const TZ = 'Asia/Ho_Chi_Minh';
    private const TRIP_JSON = ['title', 'city', 'venue', 'summary'];
    private const STATUSES_TRIP = ['open', 'confirmed', 'closed', 'cancelled'];
    private const STATUSES_REQ  = ['applied', 'cancelled', 'met', 'noshow'];

    public function handle(string ...$segs): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        if ($fail = $this->ensureSchema()) {
            return $fail;
        }
        $seg    = array_values(array_filter(explode('/', trim(implode('/', $segs), '/')), 'strlen'));
        $method = service('request')->getMethod();
        $a = $seg[0] ?? '';
        $b = $seg[1] ?? '';
        $c = $seg[2] ?? '';

        try {
            if ($a === 'trips' && $method === 'GET') {
                return $b === '' ? $this->trips(false) : $this->trip($b);
            }
            if ($a === 'me' && $method === 'GET')        return $this->me();
            if ($a === 'apply' && $method === 'POST')    return $this->apply();
            if ($a === 'cancel' && $method === 'POST')   return $this->cancel();

            if ($a === 'admin') {
                if (! $this->isAdmin) {
                    return $this->err('admin_only', '관리자만 사용할 수 있습니다', 403);
                }
                if ($b === 'trips') {
                    if ($method === 'GET')    return $this->trips(true);
                    if ($method === 'POST')   return $this->adminSaveTrip($c);
                    if ($method === 'DELETE') return $this->adminDeleteTrip($c);
                }
                if ($b === 'requests') {
                    if ($method === 'GET')    return $this->adminRequests();
                    if ($method === 'POST')   return $c === '' ? $this->adminAddRequests() : $this->adminSetRequest($c);
                    if ($method === 'DELETE' && $c === 'seed') return $this->adminClearSeed();
                }
            }
        } catch (\Throwable $e) {
            log_message('error', 'meet: ' . $e->getMessage());
            return $this->err('server', 'Có lỗi xảy ra. Vui lòng thử lại.', 500);
        }
        return $this->err('not_found', 'not found', 404);
    }

    /* ================= 스키마 가드 ================= */

    private function ensureSchema(): ?ResponseInterface
    {
        $flag = WRITEPATH . 'meet_schema_ok';
        if (is_file($flag) && trim((string) @file_get_contents($flag)) === self::SCHEMA_VER) {
            return null;
        }
        $db = db_connect();
        try {
            // 버전이 바뀌면(새 마이그레이션) 무조건 latest() — 이미 적용된 것은 건너뛴다
            $m = service('migrations');
            $m->setNamespace('App');
            $m->latest();
            // 같은 요청 안에서 새 컬럼이 보이도록 필드 목록 캐시를 비운다
            if (method_exists($db, 'resetDataCache')) {
                $db->resetDataCache();
            }
            if ($db->tableExists('meet_trips') && $db->tableExists('meet_requests')
                && in_array('time_start', $db->getFieldNames('meet_trips'), true)) {
                @file_put_contents($flag, self::SCHEMA_VER);
                return null;
            }
        } catch (\Throwable $e) {
            log_message('error', 'meet schema: ' . $e->getMessage());
        }
        return $this->json(['error' => 'schema_missing', 'message' => 'Hệ thống đang chuẩn bị. Vui lòng thử lại sau.'], 503);
    }

    /* ================= 공개: 방문 일정 ================= */

    private function trips(bool $admin): ResponseInterface
    {
        $b = db_connect()->table('meet_trips');
        if (! $admin) {
            $b->where('published', 1);
        }
        $rows   = $b->orderBy('visit_date', 'ASC')->orderBy('sort', 'ASC')->get()->getResultArray();
        /* 방문일 미정(visit_date NULL) 일정은 날짜가 정해진 일정 뒤로 — MySQL 은 NULL 을 앞에 세운다 */
        usort($rows, static function ($x, $y) {
            $ex = empty($x['visit_date']); $ey = empty($y['visit_date']);
            if ($ex !== $ey) {
                return $ex ? 1 : -1;
            }
            return [$x['visit_date'] ?? '', (int) ($x['sort'] ?? 99)] <=> [$y['visit_date'] ?? '', (int) ($y['sort'] ?? 99)];
        });
        $counts = $this->counts();
        $mine   = $this->mineKeys();
        return $this->json(array_map(fn ($r) => $this->tripOut($r, $counts, $mine), $rows));
    }

    private function trip(string $id): ResponseInterface
    {
        $b = db_connect()->table('meet_trips')->where('id', $id);
        if (! $this->isAdmin) {
            $b->where('published', 1);
        }
        $r = $b->get()->getRowArray();
        if (! $r) {
            return $this->err('not_found', 'not found', 404);
        }
        return $this->json($this->tripOut($r, $this->counts(), $this->mineKeys()));
    }

    /** trip_id|product_id => 신청 수 (취소 제외) */
    private function counts(): array
    {
        $out  = [];
        $rows = db_connect()->table('meet_requests')
            ->select('trip_id, product_id, COUNT(*) AS n')
            ->where('status !=', 'cancelled')
            ->groupBy(['trip_id', 'product_id'])
            ->get()->getResultArray();
        foreach ($rows as $r) {
            $out[$r['trip_id'] . '|' . $r['product_id']] = (int) $r['n'];
        }
        return $out;
    }

    /** 로그인 바이어가 이미 신청한 trip_id|product_id 집합 */
    private function mineKeys(): array
    {
        if (! $this->uid()) {
            return [];
        }
        $out  = [];
        $rows = db_connect()->table('meet_requests')->select('trip_id, product_id')
            ->where('buyer_id', $this->uid())->where('status !=', 'cancelled')
            ->get()->getResultArray();
        foreach ($rows as $r) {
            $out[$r['trip_id'] . '|' . $r['product_id']] = true;
        }
        return $out;
    }

    private function tripOut(array $r, array $counts, array $mine): array
    {
        foreach (self::TRIP_JSON as $k) {
            $r[$k] = $this->jdec($r[$k] ?? null, (object) []);
        }
        $today    = $this->today();
        $deadline = (string) ($r['deadline'] ?? '');
        $open     = ($r['status'] ?? '') === 'open' && ($deadline === '' || $deadline >= $today);

        $items = [];
        foreach ((array) $this->jdec($r['items'] ?? null, []) as $it) {
            $it   = (array) $it;
            $pid  = (string) ($it['product_id'] ?? '');
            if ($pid === '') {
                continue;
            }
            $goal = max(1, (int) ($it['goal'] ?? 5));
            $n    = $counts[$r['id'] . '|' . $pid] ?? 0;
            $items[] = [
                'product_id' => $pid,
                'goal'       => $goal,
                'count'      => $n,
                'confirmed'  => $n >= $goal,
                'mine'       => isset($mine[$r['id'] . '|' . $pid]),
            ];
        }
        $r['items']     = $items;
        $r['published'] = (bool) (int) ($r['published'] ?? 0);
        $r['sort']      = (int) ($r['sort'] ?? 99);
        $r['open']      = $open;
        $r['today']     = $today;
        $r['days_left'] = $deadline !== '' ? $this->daysBetween($today, $deadline) : null;
        $r['days_to_visit'] = ! empty($r['visit_date']) ? $this->daysBetween($today, $r['visit_date']) : null;
        return $r;
    }

    /* ================= 바이어 ================= */

    private function me(): ResponseInterface
    {
        if (! $this->uid()) {
            return $this->json([]);
        }
        $rows = db_connect()->table('meet_requests')
            ->select('id, trip_id, product_id, channel, volume, message, status, created_at')
            ->where('buyer_id', $this->uid())->orderBy('created_at', 'DESC')
            ->get()->getResultArray();
        return $this->json($rows);
    }

    private function apply(): ResponseInterface
    {
        if (! $this->uid()) {
            return $this->err('login_required', 'Vui lòng đăng nhập để đăng ký gặp mặt.', 401);
        }
        /* 2026-09-30 사업자 인증은 신청 조건에서 뺐다 — 가입과 동시에 신청할 수 있게(사용자 결정).
           대신 회사명·담당자·연락처는 필수로 받는다. 인증 여부는 관리자 신청자 목록에 표시된다. */
        $in   = $this->input();
        if ($in === null) {
            return $this->err('bad_json', 'bad json', 400);
        }
        $tid  = trim((string) ($in['trip_id'] ?? ''));
        $pid  = trim((string) ($in['product_id'] ?? ''));
        $db   = db_connect();
        $trip = $db->table('meet_trips')->where('id', $tid)->where('published', 1)->get()->getRowArray();
        if (! $trip) {
            return $this->err('not_found', 'Không tìm thấy lịch gặp mặt.', 404);
        }
        $out = $this->tripOut($trip, $this->counts(), []);
        if (! $out['open']) {
            return $this->err('closed', 'Lịch này đã hết hạn đăng ký.', 409);
        }
        $item = null;
        foreach ($out['items'] as $it) {
            if ($it['product_id'] === $pid) {
                $item = $it;
            }
        }
        if (! $item) {
            return $this->err('not_found', 'Sản phẩm này không có trong lịch gặp mặt.', 404);
        }

        $prof = $db->table('profiles')->where('id', $this->uid())->get()->getRowArray() ?: [];
        $now  = date('Y-m-d H:i:s');
        /* 신청 창에서 받은 회사 정보 — 프로필에 비어 있는 칸만 채운다(인증으로 확정된 값은 덮지 않는다) */
        $company = trim((string) ($in['company'] ?? '')) ?: (string) ($prof['company'] ?? '');
        $contact = trim((string) ($in['contact_name'] ?? '')) ?: (string) ($prof['contact_name'] ?? '');
        $phone   = trim((string) ($in['phone'] ?? '')) ?: (string) ($prof['phone'] ?? '');
        if ($company === '' || $contact === '' || $phone === '') {
            return $this->err('info_required', 'Vui lòng nhập tên công ty, người liên hệ và số điện thoại.', 422);
        }
        $fill = [];
        $country = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', (string) ($in['country'] ?? '')), 0, 2));
        foreach (['company' => [$company, 200], 'contact_name' => [$contact, 120], 'phone' => [$phone, 60], 'country' => [$country, 2]] as $k => [$v, $max]) {
            if ($v === '') {
                continue;
            }
            if (trim((string) ($prof[$k] ?? '')) === '') {
                $fill[$k] = $this->cut($v, $max);
            }
        }
        if ($fill) {
            $db->table('profiles')->where('id', $this->uid())->update($fill + ['updated_at' => $now]);
        }
        $row  = [
            'company'      => $this->cut($company, 200),
            'contact_name' => $this->cut($contact, 120),
            'phone'        => $this->cut($phone, 60),
            'email'        => $this->cut($prof['email'] ?? ($this->user['email'] ?? ''), 200),
            'channel'      => $this->cut($in['channel'] ?? '', 200),
            'volume'       => $this->cut($in['volume'] ?? '', 200),
            'message'      => $this->cut($in['message'] ?? '', 2000),
            'aff_ref'      => $this->cut($in['aff_ref'] ?? '', 40) ?: null,
            'status'       => 'applied',
            'updated_at'   => $now,
        ];
        $prev = $db->table('meet_requests')->where('trip_id', $tid)->where('product_id', $pid)
            ->where('buyer_id', $this->uid())->get()->getRowArray();
        if ($prev && $prev['status'] !== 'cancelled') {
            return $this->err('already', 'Bạn đã đăng ký gặp nhà cung cấp này.', 409);
        }
        if ($prev) {
            $db->table('meet_requests')->where('id', $prev['id'])->update($row);   // 취소했다가 다시 신청
        } else {
            $db->table('meet_requests')->insert($row + [
                'id' => $this->uuid(), 'trip_id' => $tid, 'product_id' => $pid,
                'buyer_id' => $this->uid(), 'created_at' => $now,
            ]);
        }
        $n = $this->counts()[$tid . '|' . $pid] ?? 0;
        return $this->json(['ok' => true, 'count' => $n, 'goal' => $item['goal'], 'confirmed' => $n >= $item['goal']], 201);
    }

    private function cancel(): ResponseInterface
    {
        if (! $this->uid()) {
            return $this->err('login_required', 'Vui lòng đăng nhập.', 401);
        }
        $in  = $this->input();
        if ($in === null) {
            return $this->err('bad_json', 'bad json', 400);
        }
        $tid = (string) ($in['trip_id'] ?? '');
        $pid = (string) ($in['product_id'] ?? '');
        $db  = db_connect();
        $trip = $db->table('meet_trips')->where('id', $tid)->get()->getRowArray();
        if ($trip && ! empty($trip['deadline']) && $trip['deadline'] < $this->today()) {
            return $this->err('closed', 'Đã hết hạn, không thể hủy trên web. Vui lòng liên hệ MAKENOV.', 409);
        }
        $db->table('meet_requests')->where('trip_id', $tid)->where('product_id', $pid)
            ->where('buyer_id', $this->uid())->where('status', 'applied')
            ->update(['status' => 'cancelled', 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->json(['ok' => true, 'count' => $this->counts()[$tid . '|' . $pid] ?? 0]);
    }

    /* ================= 관리자 ================= */

    private function adminSaveTrip(string $id): ResponseInterface
    {
        $in = $this->input();
        if ($in === null) {
            return $this->err('bad_json', 'bad json', 400);
        }
        $id = $id !== '' ? $id : (string) ($in['id'] ?? '');
        if (! preg_match('/^[a-z0-9][a-z0-9-]{2,39}$/', $id)) {
            return $this->err('bad_id', 'id 는 영문 소문자·숫자·하이픈 3~40자 (예: visit-20261203)', 400);
        }
        foreach (['visit_date', 'visit_end', 'deadline'] as $d) {
            if (! empty($in[$d]) && ! preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $in[$d])) {
                return $this->err('bad_date', "$d 는 YYYY-MM-DD", 400);
            }
        }
        foreach (['time_start', 'time_end'] as $tk) {
            if (! empty($in[$tk]) && ! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) $in[$tk])) {
                return $this->err('bad_time', "$tk 는 HH:MM", 400);
            }
        }
        /* 2026-10-01 방문일은 비워 둘 수 있다 = '미정'. 사이트에는 '방문일 미정'으로 나온다 */
        $status = (string) ($in['status'] ?? 'open');
        if (! in_array($status, self::STATUSES_TRIP, true)) {
            return $this->err('bad_status', 'status: ' . implode('|', self::STATUSES_TRIP), 400);
        }
        $items = [];
        $seen  = [];
        foreach ((array) ($in['items'] ?? []) as $it) {
            $it  = (array) $it;
            $pid = trim((string) ($it['product_id'] ?? ''));
            if ($pid === '' || isset($seen[$pid])) {
                continue;
            }
            $seen[$pid] = true;
            $items[] = ['product_id' => $pid, 'goal' => min(50, max(1, (int) ($it['goal'] ?? 5)))];
        }
        $row = [
            'visit_date' => ($in['visit_date'] ?? '') ?: null,
            'visit_end'  => ($in['visit_end'] ?? '') ?: null,
            'time_start' => ($in['time_start'] ?? '') ?: null,
            'time_end'   => ($in['time_end'] ?? '') ?: null,
            'deadline'   => ($in['deadline'] ?? '') ?: null,
            'items'      => json_encode($items, JSON_UNESCAPED_UNICODE),
            'status'     => $status,
            'published'  => ! empty($in['published']) ? 1 : 0,
            'sort'       => (int) ($in['sort'] ?? 99),
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        foreach (self::TRIP_JSON as $k) {
            $row[$k] = json_encode((object) array_filter((array) ($in[$k] ?? []), fn ($v) => is_string($v)), JSON_UNESCAPED_UNICODE);
        }
        $db = db_connect();
        if ($db->table('meet_trips')->where('id', $id)->countAllResults()) {
            $db->table('meet_trips')->where('id', $id)->update($row);
        } else {
            $db->table('meet_trips')->insert($row + ['id' => $id, 'created_at' => date('Y-m-d H:i:s')]);
        }
        return $this->trip($id);
    }

    private function adminDeleteTrip(string $id): ResponseInterface
    {
        $db = db_connect();
        $n  = $db->table('meet_requests')->where('trip_id', $id)->where('status !=', 'cancelled')->countAllResults();
        if ($n > 0) {
            return $this->err('has_requests', "신청 {$n}건이 있어 삭제할 수 없습니다. 비공개로 바꾸거나 상태를 '취소'로 두세요.", 409);
        }
        $db->table('meet_requests')->where('trip_id', $id)->delete();
        $db->table('meet_trips')->where('id', $id)->delete();
        return $this->json(['ok' => true]);
    }

    private function adminRequests(): ResponseInterface
    {
        $b   = db_connect()->table('meet_requests');
        $tid = (string) (service('request')->getGet('trip_id') ?? '');
        if ($tid !== '') {
            $b->where('trip_id', $tid);
        }
        $rows = $b->orderBy('created_at', 'DESC')->get()->getResultArray();
        /* 사업자 인증 여부 — 인증 없이도 신청할 수 있게 바꿔서(2026-09-30) 관리자가 구분해 볼 수 있게 */
        $ids = array_values(array_unique(array_column($rows, 'buyer_id')));
        $ver = [];
        if ($ids) {
            foreach (db_connect()->table('profiles')->select('id, status')->whereIn('id', $ids)->get()->getResultArray() as $p) {
                $ver[$p['id']] = ($p['status'] ?? '') === 'verified';
            }
        }
        foreach ($rows as &$r) {
            $r['verified'] = $ver[$r['buyer_id']] ?? false;
        }
        unset($r);
        return $this->json($rows);
    }

    private function adminSetRequest(string $id): ResponseInterface
    {
        $in  = $this->input();
        if ($in === null) {
            return $this->err('bad_json', 'bad json', 400);
        }
        $upd = ['updated_at' => date('Y-m-d H:i:s')];
        if (isset($in['status'])) {
            if (! in_array($in['status'], self::STATUSES_REQ, true)) {
                return $this->err('bad_status', 'status: ' . implode('|', self::STATUSES_REQ), 400);
            }
            $upd['status'] = $in['status'];
        }
        if (array_key_exists('memo', $in)) {
            $upd['memo'] = $this->cut($in['memo'], 2000);
        }
        db_connect()->table('meet_requests')->where('id', $id)->update($upd);
        return $this->json(['ok' => true]);
    }

    /* ---- 임시(시드) 신청 — 2026-09-30 사용자 요청: 실제 신청이 들어오기 전 카드가 전부 0으로 보이지 않게
       관리자가 공급사별로 몇 곳씩 채워 둔다. buyer_id 가 'seed-' 로 시작하는 행이 임시 신청이고,
       DELETE admin/requests/seed 로 한 번에 지운다. 개수 집계(counts)에는 실제 신청과 같이 들어간다. */
    private const SEED_PREFIX = 'seed-';

    private function adminAddRequests(): ResponseInterface
    {
        $in = $this->input();
        if ($in === null) {
            return $this->err('bad_json', 'bad json', 400);
        }
        $tid = trim((string) ($in['trip_id'] ?? ''));
        $pid = trim((string) ($in['product_id'] ?? ''));
        $n   = min(10, max(1, (int) ($in['count'] ?? 1)));
        $db  = db_connect();
        $trip = $db->table('meet_trips')->where('id', $tid)->get()->getRowArray();
        if (! $trip) {
            return $this->err('not_found', '일정이 없습니다', 404);
        }
        $ok = false;
        foreach ((array) $this->jdec($trip['items'] ?? null, []) as $it) {
            if ((string) (((array) $it)['product_id'] ?? '') === $pid) {
                $ok = true;
            }
        }
        if (! $ok) {
            return $this->err('not_found', '이 일정에 없는 제품입니다', 404);
        }
        $now  = date('Y-m-d H:i:s');
        $have = $db->table('meet_requests')->where('trip_id', $tid)->where('product_id', $pid)
            ->like('buyer_id', self::SEED_PREFIX, 'after')->countAllResults();
        for ($i = 1; $i <= $n; $i++) {
            $k = $have + $i;
            $db->table('meet_requests')->insert([
                'id'           => $this->uuid(),
                'trip_id'      => $tid,
                'product_id'   => $pid,
                'buyer_id'     => self::SEED_PREFIX . $this->uuid(),
                'company'      => $this->cut(($in['company'] ?? '') ?: "임시 신청 {$k}", 200),
                'contact_name' => $this->cut($in['contact_name'] ?? '', 120),
                'phone'        => $this->cut($in['phone'] ?? '', 60),
                'email'        => '',
                'channel'      => $this->cut(($in['channel'] ?? '') ?: 'other', 200),
                'volume'       => '',
                'message'      => '',
                'memo'         => $this->cut(($in['memo'] ?? '') ?: '임시(시드) — 실제 신청 아님', 500),
                'status'       => 'applied',
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }
        return $this->json(['ok' => true, 'added' => $n, 'count' => $this->counts()[$tid . '|' . $pid] ?? 0], 201);
    }

    private function adminClearSeed(): ResponseInterface
    {
        $tid = (string) (service('request')->getGet('trip_id') ?? '');
        $b   = db_connect()->table('meet_requests')->like('buyer_id', self::SEED_PREFIX, 'after');
        if ($tid !== '') {
            $b->where('trip_id', $tid);
        }
        $n = (clone $b)->countAllResults();
        $b->delete();
        return $this->json(['ok' => true, 'deleted' => $n]);
    }

    /* ================= 도우미 ================= */

    /** 요청 본문 JSON — 비어 있으면 [], 깨졌으면 null (호출부에서 400) */
    private function input(): ?array
    {
        $raw = (string) (service('request')->getBody() ?? '');
        if (trim($raw) === '') {
            return [];
        }
        $d = json_decode($raw, true);
        return is_array($d) ? $d : null;
    }

    private function today(): string
    {
        return (new \DateTime('now', new \DateTimeZone(self::TZ)))->format('Y-m-d');
    }

    private function daysBetween(string $from, string $to): int
    {
        $a = \DateTime::createFromFormat('!Y-m-d', $from);
        $b = \DateTime::createFromFormat('!Y-m-d', substr($to, 0, 10));
        if (! $a || ! $b) {
            return 0;
        }
        return (int) $a->diff($b)->format('%r%a');
    }

    private function jdec($raw, $fallback)
    {
        if ($raw === null || $raw === '') {
            return $fallback;
        }
        $d = json_decode((string) $raw);
        return $d === null ? $fallback : $d;
    }

    private function cut($v, int $max): string
    {
        return mb_substr(trim((string) $v), 0, $max);
    }

    private function err(string $code, string $msg, int $status): ResponseInterface
    {
        return $this->json(['error' => $code, 'message' => $msg], $status);
    }
}
