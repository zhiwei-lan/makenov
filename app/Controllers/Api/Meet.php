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
    private const SCHEMA_VER = '18';
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
                if ($b === 'config') {
                    if ($method === 'GET')    return $this->adminConfig();
                    if ($method === 'POST')   return $c === 'test' ? $this->adminNotifyTest() : $this->adminSaveConfig();
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
        /* 행사 상세 페이지의 부가 정보(부제 · 주최 로고 · 주관/운영 · 세부 장소 · 지도 · FAQ …) — 관리자 › 방문 일정에서 넣는다 */
        $r['extra']     = $this->jdec($r['extra'] ?? null, (object) []);
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
        /* 2026-10-03 '간편 신청'이 기본이다(사용자 결정) — 계정·로그인 없이 회사명·업종·담당자·연락처·이메일만으로 신청한다.
           로그인한 회원은 종전대로 자기 계정으로 신청된다. 사업자 인증은 신청 조건이 아니다(관리자 목록에 구분 표시).
           간편 신청의 buyer_id = 'lead-' + md5(전화번호 숫자) → 같은 번호는 한 공급사에 한 번만 센다. */
        $uid  = $this->uid();
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

        $prof = $uid ? ($db->table('profiles')->where('id', $uid)->get()->getRowArray() ?: []) : [];
        $now  = date('Y-m-d H:i:s');
        /* 신청 창에서 받은 회사 정보 — 프로필에 비어 있는 칸만 채운다(인증으로 확정된 값은 덮지 않는다) */
        $company = trim((string) ($in['company'] ?? '')) ?: (string) ($prof['company'] ?? '');
        $contact = trim((string) ($in['contact_name'] ?? '')) ?: (string) ($prof['contact_name'] ?? '');
        $phone   = trim((string) ($in['phone'] ?? '')) ?: (string) ($prof['phone'] ?? '');
        if ($company === '' || $contact === '' || $phone === '') {
            return $this->err('info_required', 'Vui lòng nhập tên công ty, người liên hệ và số điện thoại.', 422);
        }
        $email    = strtolower(trim((string) ($in['email'] ?? ''))) ?: (string) ($prof['email'] ?? ($this->user['email'] ?? ''));
        $industry = $this->cut($in['channel'] ?? '', 200);
        $homepage = $this->cut($in['homepage'] ?? '', 300);
        $position = $this->cut($in['position'] ?? '', 120) ?: $this->cut($prof['position'] ?? '', 120);
        $ip       = (string) service('request')->getIPAddress();
        if ($uid) {
            $buyer = $uid;
        } else {
            /* 봇이 채우는 숨은 칸 — 사람은 못 본다. 채워져 있으면 저장하지 않고 성공처럼 답한다 */
            if (trim((string) ($in['hp'] ?? '')) !== '') {
                return $this->json(['ok' => true, 'count' => $item['count'], 'goal' => $item['goal'], 'confirmed' => $item['confirmed']], 201);
            }
            if ($industry === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->err('info_required', 'Vui lòng nhập ngành nghề và email hợp lệ.', 422);
            }
            $digits = preg_replace('/\D/', '', $phone);
            if (strlen($digits) < 8) {
                return $this->err('bad_phone', 'Số điện thoại chưa đúng.', 422);
            }
            /* '+84 90…' · '090…' · '8490…' 를 같은 번호로 본다 — 앞의 0 과 국가번호(84·82)를 뗀다 */
            $norm  = ltrim((string) preg_replace('/^(84|82)/', '', ltrim($digits, '0')), '0');
            $buyer = 'lead-' . md5($norm !== '' ? $norm : $digits);
            /* 남용 방지 — 한 IP 에서 한 시간에 간편 신청 20건까지 */
            if ($ip !== '' && in_array('ip', $db->getFieldNames('meet_requests'), true)) {
                $recent = $db->table('meet_requests')->where('ip', $ip)->like('buyer_id', 'lead-', 'after')
                    ->where('created_at >=', date('Y-m-d H:i:s', time() - 3600))->countAllResults();
                if ($recent >= 20) {
                    return $this->err('rate', 'Bạn đã gửi quá nhiều đăng ký. Vui lòng thử lại sau.', 429);
                }
            }
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
        if ($uid && $fill) {
            $db->table('profiles')->where('id', $uid)->update($fill + ['updated_at' => $now]);
        }
        $row  = [
            'company'      => $this->cut($company, 200),
            'contact_name' => $this->cut($contact, 120),
            'phone'        => $this->cut($phone, 60),
            'email'        => $this->cut($email, 200),
            'channel'      => $industry,
            'volume'       => $this->cut($in['volume'] ?? '', 200),
            'message'      => $this->cut($in['message'] ?? '', 2000),
            'aff_ref'      => $this->cut($in['aff_ref'] ?? '', 40) ?: null,
            'status'       => 'applied',
            'updated_at'   => $now,
        ];
        /* 새 칸은 마이그레이션(000039)이 돈 뒤에만 쓴다 */
        $cols = $db->getFieldNames('meet_requests');
        foreach (['homepage' => $homepage, 'position' => $position, 'ip' => $ip] as $k => $v) {
            if (in_array($k, $cols, true)) {
                $row[$k] = $v !== '' ? $v : null;
            }
        }
        $prev = $db->table('meet_requests')->where('trip_id', $tid)->where('product_id', $pid)
            ->where('buyer_id', $buyer)->get()->getRowArray();
        if ($prev && $prev['status'] !== 'cancelled') {
            return $this->err('already', 'Bạn đã đăng ký gặp nhà cung cấp này.', 409);
        }
        if ($prev) {
            $db->table('meet_requests')->where('id', $prev['id'])->update($row);   // 취소했다가 다시 신청
        } else {
            $db->table('meet_requests')->insert($row + [
                'id' => $this->uuid(), 'trip_id' => $tid, 'product_id' => $pid,
                'buyer_id' => $buyer, 'created_at' => $now,
            ]);
        }
        $this->notifyNew($tid, $pid, $row);
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
        if (array_key_exists('extra', $in) && in_array('extra', $db->getFieldNames('meet_trips'), true)) {
            $row['extra'] = json_encode($this->cleanExtra((array) $in['extra']), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $exists = (bool) $db->table('meet_trips')->where('id', $id)->countAllResults();
        /* 일정 ID 변경(new_id) — 신청 내역의 trip_id 도 같이 옮긴다. 사이트 주소(#trip-아이디)가 바뀐다 */
        $newId = trim((string) ($in['new_id'] ?? ''));
        if ($exists && $newId !== '' && $newId !== $id) {
            if (! preg_match('/^[a-z0-9][a-z0-9-]{2,39}$/', $newId)) {
                return $this->err('bad_id', '새 ID 는 영문 소문자·숫자·하이픈 3~40자', 400);
            }
            if ($db->table('meet_trips')->where('id', $newId)->countAllResults()) {
                return $this->err('id_taken', "이미 있는 일정 ID 입니다: {$newId}", 409);
            }
            $db->transStart();
            $db->table('meet_trips')->where('id', $id)->update($row + ['id' => $newId]);
            $db->table('meet_requests')->where('trip_id', $id)->update(['trip_id' => $newId]);
            $db->transComplete();
            if (! $db->transStatus()) {
                return $this->err('server', 'ID 변경에 실패했습니다', 500);
            }
            return $this->trip($newId);
        }
        if ($exists) {
            $db->table('meet_trips')->where('id', $id)->update($row);
        } else {
            $db->table('meet_trips')->insert($row + ['id' => $id, 'created_at' => date('Y-m-d H:i:s')]);
        }
        return $this->trip($id);
    }

    /** 행사 부가 정보 정리 — 정해진 칸만, 길이 제한. 3개 언어 칸은 {vi,ko,en} 문자열만 남긴다 */
    private function cleanExtra(array $in): array
    {
        $tri = function ($v, int $max): array {
            $o = [];
            foreach (['vi', 'ko', 'en'] as $l) {
                $t = is_array($v) ? ($v[$l] ?? '') : '';
                if (is_string($t) && trim($t) !== '') {
                    $o[$l] = $this->cut($t, $max);
                }
            }
            return $o;
        };
        $url = fn ($v) => (is_string($v) && preg_match('#^(https?://|/)#', trim($v))) ? $this->cut($v, 500) : '';
        $out = [];
        foreach (['sub' => 200, 'lead' => 300, 'name' => 300, 'venue_detail' => 300, 'host' => 200, 'org' => 200, 'map_addr' => 300] as $k => $max) {
            $t = $tri($in[$k] ?? null, $max);
            if ($t) {
                $out[$k] = $t;
            }
        }
        $logos = [];
        foreach (array_slice((array) ($in['logos'] ?? []), 0, 4) as $u) {
            if (($u = $url($u)) !== '') {
                $logos[] = $u;
            }
        }
        if ($logos) {
            $out['logos'] = $logos;
        }
        if (($ph = $url($in['photo'] ?? '')) !== '') {
            $out['photo'] = $ph;
        }
        if (is_string($in['map_q'] ?? null) && trim($in['map_q']) !== '') {
            $out['map_q'] = $this->cut($in['map_q'], 300);
        }
        foreach (['booth', 'growing', 'fixed'] as $k) {
            if (! empty($in[$k])) {
                $out[$k] = true;
            }
        }
        $faq = [];
        foreach (array_slice((array) ($in['faq'] ?? []), 0, 20) as $f) {
            $f = (array) $f;
            $q = $tri($f['q'] ?? null, 300);
            $a = $tri($f['a'] ?? null, 1500);
            if ($q && $a) {
                $faq[] = ['q' => $q, 'a' => $a];
            }
        }
        if ($faq) {
            $out['faq'] = $faq;
        }
        $perks = [];
        foreach (array_slice((array) ($in['perks'] ?? []), 0, 12) as $pk) {
            $t = $tri($pk, 300);
            if ($t) {
                $perks[] = $t;
            }
        }
        if ($perks) {
            $out['perks'] = $perks;
        }
        return $out;
    }

    /* ================= 관리자: 알림 설정 (meet_config — REST 로 공개되지 않는 테이블) ================= */

    private function cfgGet(string $k): string
    {
        $db = db_connect();
        if (! $db->tableExists('meet_config')) {
            return '';
        }
        $r = $db->table('meet_config')->where('k', $k)->get()->getRowArray();
        return $r ? (string) ($r['v'] ?? '') : '';
    }

    private function cfgSet(string $k, string $v): void
    {
        $db  = db_connect();
        $now = date('Y-m-d H:i:s');
        if ($db->table('meet_config')->where('k', $k)->countAllResults()) {
            $db->table('meet_config')->where('k', $k)->update(['v' => $v, 'updated_at' => $now]);
        } else {
            $db->table('meet_config')->insert(['k' => $k, 'v' => $v, 'updated_at' => $now]);
        }
    }

    /* ---- 메일 서버(SMTP) — 2026-10-06: 서버 .env 를 고치지 않고 관리자 화면에서 넣는다(구글 · 네이버웍스 등).
       meet_config 는 REST 로 노출되지 않는 테이블이고, 비밀번호는 암호화해서 저장한다(화면에는 다시 내려보내지 않는다). */
    private function secretKey(): string
    {
        $d = config('Database')->default ?? [];
        return hash('sha256', 'mk-mail|' . ($d['password'] ?? '') . '|' . ($d['database'] ?? ''), true);
    }

    private function enc(string $plain): string
    {
        $iv = random_bytes(16);
        return 'enc:' . base64_encode($iv . openssl_encrypt($plain, 'aes-256-cbc', $this->secretKey(), OPENSSL_RAW_DATA, $iv));
    }

    private function dec(string $stored): string
    {
        if (strncmp($stored, 'enc:', 4) !== 0) {
            return $stored;
        }
        $raw = base64_decode(substr($stored, 4), true);
        if ($raw === false || strlen($raw) < 17) {
            return '';
        }
        $out = openssl_decrypt(substr($raw, 16), 'aes-256-cbc', $this->secretKey(), OPENSSL_RAW_DATA, substr($raw, 0, 16));
        return $out === false ? '' : $out;
    }

    /** @return array{host:string,port:int,user:string,pass:string,crypto:string,from:string,from_name:string} */
    private function smtpConf(): array
    {
        return [
            'host'      => $this->cfgGet('smtp_host'),
            'port'      => (int) ($this->cfgGet('smtp_port') ?: 587),
            'user'      => $this->cfgGet('smtp_user'),
            'pass'      => $this->dec($this->cfgGet('smtp_pass')),
            'crypto'    => $this->cfgGet('smtp_crypto'),
            'from'      => $this->cfgGet('mail_from'),
            'from_name' => $this->cfgGet('mail_from_name'),
        ];
    }

    private function adminConfig(): ResponseInterface
    {
        $cfg = config('Email');
        $m   = $this->smtpConf();
        $on  = $m['host'] !== '';
        return $this->json([
            'notify_email'   => $this->cfgGet('notify_email'),
            'mail_via'       => $on ? 'smtp(관리자 설정)' : (string) ($cfg->protocol ?? 'mail'),   // mail | sendmail | smtp
            'mail_from'      => $on ? ($m['from'] ?: $m['user']) : (string) ($cfg->fromEmail ?: 'no-reply@makenov.com'),
            'smtp_host'      => $m['host'],
            'smtp_port'      => $m['port'],
            'smtp_user'      => $m['user'],
            'smtp_crypto'    => $m['crypto'],
            'has_password'   => $m['pass'] !== '',
            'from_email'     => $m['from'],
            'from_name'      => $m['from_name'],
        ]);
    }

    private function adminSaveConfig(): ResponseInterface
    {
        $in = $this->input();
        if ($in === null) {
            return $this->err('bad_json', 'bad json', 400);
        }
        $db = db_connect();
        if (! $db->tableExists('meet_config')) {
            return $this->err('schema_missing', '설정 테이블을 만드는 중입니다. 잠시 뒤 다시 시도해 주세요.', 503);
        }
        $out = ['ok' => true];
        if (array_key_exists('notify_email', $in)) {
            $v = implode(', ', $this->emails((string) $in['notify_email']));
            $this->cfgSet('notify_email', $v);
            $out['notify_email'] = $v;
        }
        /* 메일 서버 — 보낸 칸만 바꾼다. 비밀번호는 값이 있을 때만 바꾸고, 빈 값이면 그대로 둔다 */
        if (array_key_exists('smtp_host', $in)) {
            $host = strtolower(trim((string) $in['smtp_host']));
            if ($host !== '' && ! preg_match('/^[a-z0-9.-]{3,120}$/', $host)) {
                return $this->err('bad_host', '메일 서버 주소를 확인하세요 (예: smtp.gmail.com)', 422);
            }
            $port   = (int) ($in['smtp_port'] ?? 587);
            $crypto = (string) ($in['smtp_crypto'] ?? 'tls');
            $from   = strtolower(trim((string) ($in['from_email'] ?? '')));
            if ($from !== '' && ! filter_var($from, FILTER_VALIDATE_EMAIL)) {
                return $this->err('bad_from', '보내는 주소를 확인하세요', 422);
            }
            $this->cfgSet('smtp_host', $host);
            $this->cfgSet('smtp_port', (string) ($port >= 1 && $port <= 65535 ? $port : 587));
            $this->cfgSet('smtp_user', $this->cut($in['smtp_user'] ?? '', 200));
            $this->cfgSet('smtp_crypto', in_array($crypto, ['tls', 'ssl'], true) ? $crypto : '');
            $this->cfgSet('mail_from', $from);
            $this->cfgSet('mail_from_name', $this->cut($in['from_name'] ?? '', 60));
            $pass = (string) ($in['smtp_pass'] ?? '');
            if ($pass !== '') {
                /* 구글 앱 비밀번호는 'abcd efgh ijkl mnop' 처럼 띄어 보여 준다 — 그대로 붙여 넣어도 되게 공백을 뗀다 */
                $this->cfgSet('smtp_pass', $this->enc($host === 'smtp.gmail.com' ? (string) preg_replace('/\s+/', '', $pass) : $pass));
            }
            if ($host === '') {
                $this->cfgSet('smtp_pass', '');
            }
        }
        return $this->json($out);
    }

    private function adminNotifyTest(): ResponseInterface
    {
        $to = $this->emails($this->cfgGet('notify_email'));
        if (! $to) {
            return $this->err('no_rcpt', '알림 받을 메일 주소를 먼저 저장하세요', 400);
        }
        [$ok, $dbg] = $this->sendMail($to, '[MAKENOV] 미팅 신청 알림 테스트', "미팅 신청 알림 테스트 메일입니다.\n이 메일이 보이면 새 신청이 들어올 때 같은 주소로 알림이 갑니다.\n\n" . date('Y-m-d H:i:s'));
        if ($ok) {
            return $this->json(['ok' => true, 'to' => $to]);
        }
        /* 실패 이유를 사람이 읽을 말로 — 관리자 화면은 message 를 그대로 보여 준다 */
        $why = '메일 서버가 발송을 거부했습니다.';
        if (preg_match('/535|not accepted|authentication failed|auth.*fail/i', $dbg)) {
            $why = '아이디 또는 비밀번호가 맞지 않습니다. 구글은 계정 비밀번호가 아니라 앱 비밀번호를 넣어야 합니다.';
        } elseif (preg_match('/unable to connect|connection (refused|timed out)|fsockopen|getaddrinfo/i', $dbg)) {
            $why = '메일 서버에 연결하지 못했습니다. 서버 주소 · 포트 · 보안 연결을 확인하세요.';
        } elseif ($this->cfgGet('smtp_host') === '') {
            $why = '메일 서버가 설정되지 않았습니다. 아래 메일 서버 칸을 채우고 저장하세요.';
        }
        return $this->json(['ok' => false, 'error' => 'send_failed', 'message' => $why, 'to' => $to, 'detail' => $this->cut($dbg, 600)], 502);
    }

    /** 쉼표·공백으로 나눈 메일 주소 중 형식이 맞는 것만 (최대 5개) */
    private function emails(string $raw): array
    {
        $out = [];
        foreach (preg_split('/[,;\s]+/', $raw) ?: [] as $e) {
            $e = strtolower(trim($e));
            if ($e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL) && ! in_array($e, $out, true)) {
                $out[] = $e;
            }
        }
        return array_slice($out, 0, 5);
    }

    /** @return array{0:bool,1:string} [성공 여부, 실패 시 디버그 문자열]
     *  보내는 방법: 관리자 화면에서 넣은 메일 서버(meet_config 의 smtp_*)가 있으면 그것으로, 없으면 app/Config/Email.php(.env 의 email.*) */
    private function sendMail(array $to, string $subject, string $body): array
    {
        try {
            $cfg   = config('Email');
            $email = \Config\Services::email();
            $m     = $this->smtpConf();
            if ($m['host'] !== '') {
                $email->initialize([
                    'protocol'    => 'smtp',
                    'SMTPHost'    => $m['host'],
                    'SMTPPort'    => $m['port'],
                    'SMTPUser'    => $m['user'],
                    'SMTPPass'    => $m['pass'],
                    'SMTPCrypto'  => $m['crypto'],
                    'SMTPTimeout' => 12,
                    'mailType'    => 'text',
                    'charset'     => 'UTF-8',
                    'newline'     => "\r\n",
                    'CRLF'        => "\r\n",
                    'wordWrap'    => false,
                ]);
            }
            $email->clear(true);
            if ($m['host'] !== '') {
                $email->setFrom($m['from'] ?: $m['user'], $m['from_name'] ?: 'MAKENOV');
            } else {
                $email->setFrom($cfg->fromEmail ?: 'no-reply@makenov.com', $cfg->fromName ?: 'MAKENOV');
            }
            $email->setTo($to);
            $email->setSubject($subject);
            $email->setMessage($body);
            $ok = (bool) $email->send(false);
            return [$ok, $ok ? '' : trim(strip_tags((string) $email->printDebugger(['headers'])))];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }

    /** 새 미팅 신청 알림 — 실패해도 신청 접수에는 영향을 주지 않는다 */
    private function notifyNew(string $tid, string $pid, array $row): void
    {
        try {
            $to = $this->emails($this->cfgGet('notify_email'));
            if (! $to) {
                return;
            }
            $db   = db_connect();
            $trip = $db->table('meet_trips')->where('id', $tid)->get()->getRowArray() ?: [];
            $tt   = (array) json_decode((string) ($trip['title'] ?? '{}'), true);
            $prod = $db->tableExists('products') ? ($db->table('products')->select('brand, name')->where('id', $pid)->get()->getRowArray() ?: []) : [];
            $pn   = (array) json_decode((string) ($prod['name'] ?? '{}'), true);
            $lines = [
                '새 미팅 신청이 들어왔습니다.',
                '',
                '행사: ' . (($tt['ko'] ?? '') ?: ($tt['vi'] ?? $tid)) . (! empty($trip['visit_date']) ? ' (' . $trip['visit_date'] . ')' : ''),
                '제품: ' . trim(($prod['brand'] ?? '') . ' · ' . (($pn['ko'] ?? '') ?: ($pn['vi'] ?? $pid)), ' ·'),
                '',
                '회사: ' . ($row['company'] ?? ''),
                '담당자: ' . ($row['contact_name'] ?? '') . (! empty($row['position']) ? ' (' . $row['position'] . ')' : ''),
                '연락처: ' . ($row['phone'] ?? ''),
                '이메일: ' . ($row['email'] ?? ''),
                '홈페이지: ' . ($row['homepage'] ?? ''),
                '업종: ' . ($row['channel'] ?? ''),
                '문의 내용: ' . (trim((string) ($row['message'] ?? '')) !== '' ? $row['message'] : '(없음)'),
                '',
                '관리자 › 행사 일정에서 확인: https://makenov.com/admin/',
            ];
            $this->sendMail($to, '[MAKENOV] 새 미팅 신청 — ' . ($row['company'] ?? ''), implode("\n", $lines));
        } catch (\Throwable $e) {
            log_message('error', 'meet notify: ' . $e->getMessage());
        }
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
