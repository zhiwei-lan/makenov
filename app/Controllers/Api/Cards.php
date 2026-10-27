<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use App\Libraries\CardStorage;
use App\Libraries\MkMail;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /functions/v1/cards — 명함.
 * ------------------------------------------------------------
 * 비전: makenov = 한국 공급사 ↔ 베트남 바이어의 리멤버. 명함은 "이 담당자가 실제로 있다"는
 * 소프트 신뢰다. 회사가 실재한다는 하드 신뢰는 기존 사업자 인증(profiles.status)이 맡는다.
 * 설계: Desktop\MAKENOV_명함기능_통합설계_v1.md (2026-10-26)
 *
 *   본인·관리자  GET    cards                       내 명함 목록 (관리자는 ?owner_type=&owner_id= 로 아무 대상)
 *               POST   cards                       업로드 — 본문은 이미지 바이트 그대로(multipart 아님, Storage 와 같은 이유)
 *                                                   헤더 X-Owner-Type / X-Owner-Id (관리자만) · Idempotency-Key
 *               GET    cards/{id}                  한 장
 *               POST   cards/{id}/confirm          사람이 확인한 값 저장 (+apply 면 프로필에 반영)
 *               DELETE cards/{id}                  삭제 (원본 파일도 지운다)
 *   관리자      POST   cards/{id}/verify           "명함 확인" 배지 부여·해제  {verified:true|false}
 *   서명 링크   GET    cards/{id}/image?e=&s=      원본 이미지 — 토큰 없이, 만료되는 HMAC 서명으로만
 *
 * 누가 누구 명함을:
 *   바이어(profiles)  본인이 마이페이지에서 올린다 → source=self
 *   공급사(companies) 계정이 없다 → 운영팀이 대신 올린다 → source=staff (2026-10-26 결정)
 *   관리자가 바이어 것을 대신 올리면 역시 staff. 출처를 섞지 않는 것이 신뢰의 근거다.
 *
 * 이미지 공개 범위: 본인·관리자만 서명 링크를 받는다. "미팅 성사 상대"는 3차(양측 발견) 때.
 * 공개 화면에는 배지(card_verified_at)만 나간다.
 *
 * 스키마 가드: deploy.yml 이 migrate 를 돌리지 않는다. Meet 과 같은 방식으로 첫 요청에서 한 번 돈다.
 */
class Cards extends BaseApiController
{
    /** 마이그레이션을 추가하면 올린다 — writable/cards_schema_ok 와 다르면 latest() 를 다시 돈다 */
    private const SCHEMA_VER = '2';   // 2: profiles.card_notified_at (안내 메일)
    private const OWNER_TYPES = ['profile', 'company'];
    /** 확인 값으로 받는 키 — 그 밖은 버린다 */
    private const FIELD_KEYS = ['name', 'position', 'company', 'phone', 'email', 'address', 'website', 'note'];
    /** 응답에 내보내는 컬럼 (image_key 는 내부 경로라 내보내지 않는다) */
    private const PUBLIC_COLS = ['id', 'owner_type', 'owner_id', 'image_mime', 'image_bytes', 'ocr_status', 'fields',
        'source', 'uploaded_by', 'verified_by', 'verified_at', 'created_at', 'updated_at'];

    protected $helpers = ['normalize'];

    private CardStorage $store;

    public function __construct()
    {
        parent::__construct();
        $this->store = new CardStorage($this->cfg);
    }

    public function handle(string ...$segs): ResponseInterface
    {
        $seg    = array_values(array_filter(explode('/', trim(implode('/', $segs), '/')), 'strlen'));
        $method = service('request')->getMethod();
        $a = $seg[0] ?? '';
        $b = $seg[1] ?? '';

        /* 이미지는 <img src> 로 불려 apikey 헤더가 없다 — 공개 토큰 대신 서명으로 지킨다 */
        if ($a !== '' && $b === 'image' && in_array($method, ['GET', 'HEAD'], true)) {
            if ($fail = $this->ensureSchema()) {
                return $fail;
            }
            return $this->image((int) $a);
        }

        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        if ($fail = $this->ensureSchema()) {
            return $fail;
        }
        if (! $this->uid()) {
            return $this->err('auth', '로그인이 필요합니다', 401);
        }

        try {
            if ($a === '') {
                if ($method === 'GET')  return $this->index();
                if ($method === 'POST') return $this->create();
            } elseif ($a === 'notify' && $method === 'POST') {
                return $this->notify();
            } elseif (ctype_digit($a)) {
                $id = (int) $a;
                if ($b === '' && $method === 'GET')          return $this->show($id);
                if ($b === '' && $method === 'DELETE')       return $this->destroy($id);
                if ($b === 'confirm' && $method === 'POST')  return $this->confirm($id);
                if ($b === 'verify' && $method === 'POST')   return $this->verify($id);
            }
        } catch (\Throwable $e) {
            log_message('error', 'cards: ' . $e->getMessage());
            return $this->err('server', '처리 중 오류가 났습니다. 다시 시도해 주세요.', 500);
        }
        return $this->err('not_found', 'not found', 404);
    }

    /* ================= 목록 · 한 장 ================= */

    private function index(): ResponseInterface
    {
        $req  = service('request');
        $type = (string) ($req->getGet('owner_type') ?? '');
        $oid  = (string) ($req->getGet('owner_id') ?? '');

        if ($type === '' && $oid === '') {
            $type = 'profile';
            $oid  = $this->uid();
        }
        if (! $this->canAccess($type, $oid)) {
            return $this->err('forbidden', '권한이 없습니다', 403);
        }
        $rows = db_connect()->table('business_cards')
            ->where('owner_type', $type)->where('owner_id', $oid)
            ->where('deleted_at', null)
            ->orderBy('created_at', 'DESC')->get()->getResultArray();

        return $this->json(['ok' => true, 'cards' => array_map([$this, 'present'], $rows)]);
    }

    private function show(int $id): ResponseInterface
    {
        $card = $this->find($id);
        if (! $card || ! $this->canAccess($card['owner_type'], $card['owner_id'])) {
            return $this->err('not_found', '명함이 없습니다', 404);
        }
        return $this->json(['ok' => true, 'card' => $this->present($card)]);
    }

    /* ================= 업로드 ================= */

    /**
     * 본문 = 이미지 바이트 그대로. supabase storage-js 가 보내는 multipart 를 이 서버가 못 읽어
     * 제품 이미지도 같은 방식이다(store-supabase.js _store 주석). 형식은 내용으로 판정한다.
     */
    private function create(): ResponseInterface
    {
        $req  = service('request');
        $type = strtolower(trim((string) $req->getHeaderLine('X-Owner-Type'))) ?: 'profile';
        $oid  = trim((string) $req->getHeaderLine('X-Owner-Id'));
        if ($oid === '') {
            $oid = $this->uid();
        }
        if (! in_array($type, self::OWNER_TYPES, true)) {
            return $this->err('bad_owner', 'owner_type 은 profile 또는 company', 400);
        }
        if (! $this->canAccess($type, $oid)) {
            return $this->err('forbidden', '권한이 없습니다', 403);
        }
        if (! $this->ownerExists($type, $oid)) {
            return $this->err('owner_missing', '대상 회원·공급사가 없습니다', 404);
        }

        /* 같은 요청이 두 번 오면(네트워크 재시도) 첫 결과를 그대로 돌려준다 */
        $idem = substr(trim((string) $req->getHeaderLine('Idempotency-Key')), 0, 64);
        if ($idem !== '') {
            $dup = db_connect()->table('business_cards')->where('idempotency_key', $idem)->get()->getRowArray();
            if ($dup) {
                return $this->json(['ok' => true, 'card' => $this->present($dup), 'replayed' => true]);
            }
        }

        $raw = $req->getBody();
        if ($raw === null || $raw === '') {
            return $this->err('empty', '이미지가 비어 있습니다', 400);
        }
        if (strlen($raw) > $this->cfg->cardMaxBytes) {
            return $this->err('too_large', '명함 이미지는 ' . (int) ($this->cfg->cardMaxBytes / 1048576) . 'MB 이하', 413);
        }
        $mime = $this->sniff($raw);
        if ($mime === null || ! in_array($mime, $this->cfg->cardMimes, true)) {
            return $this->err('bad_type', 'JPEG·PNG·WebP 이미지만 올릴 수 있습니다', 415);
        }
        $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime];
        $key = $this->store->save($type, $raw, $ext);

        /* 본인이 자기 프로필에 올리면 self, 그 밖(운영팀 대리)은 staff */
        $source = ($type === 'profile' && $oid === $this->uid()) ? 'self' : 'staff';
        $now    = date('Y-m-d H:i:s');
        $row    = [
            'owner_type'      => $type,
            'owner_id'        => $oid,
            'image_key'       => $key,
            'image_mime'      => $mime,
            'image_bytes'     => strlen($raw),
            'ocr_status'      => 'skipped',          // OCR 제공자 미정 — KFESTA(2026-12-11) 실물 명함으로 비교 후 결정
            'fields'          => null,
            'source'          => $source,
            'uploaded_by'     => $this->uid(),
            'idempotency_key' => $idem !== '' ? $idem : null,
            'created_at'      => $now,
            'updated_at'      => $now,
        ];
        $db = db_connect();
        $db->table('business_cards')->insert($row);
        $id = (int) $db->insertID();

        return $this->json(['ok' => true, 'card' => $this->present($this->find($id))], 201);
    }

    /* ================= 확인한 값 저장 ================= */

    /**
     * body: { fields:{name,position,company,phone,email,...}, apply:true }
     * apply 면 프로필 담당자 정보(contact_name·position·phone)에 반영한다.
     * 회사명·사업자번호·주소는 사업자 인증이 채운 값이라 건드리지 않는다(Rest 의 special 과 같은 원칙).
     * 공급사(company)는 관리자 화면의 공급사 폼이 정본이라 반영하지 않는다 — fields 만 보관.
     */
    private function confirm(int $id): ResponseInterface
    {
        $card = $this->find($id);
        if (! $card || ! $this->canAccess($card['owner_type'], $card['owner_id'])) {
            return $this->err('not_found', '명함이 없습니다', 404);
        }
        $body   = $this->bodyJson() ?? [];
        $in     = is_array($body['fields'] ?? null) ? $body['fields'] : [];
        $fields = [];
        foreach (self::FIELD_KEYS as $k) {
            if (isset($in[$k]) && is_scalar($in[$k])) {
                $v = trim((string) $in[$k]);
                if ($v !== '') {
                    $fields[$k] = mb_substr($v, 0, 200);
                }
            }
        }
        $db = db_connect();
        /* 회사명은 화면에서 받지 않는다 — 바이어는 사업자 인증이 확정한 profiles.company,
           공급사는 companies.name(3개 국어 JSON). 중복 후보 비교에 쓰도록 소유자 값으로 채운다 */
        if (empty($fields['company'])) {
            $owner = $this->ownerCompanyName($card['owner_type'], $card['owner_id']);
            if ($owner !== '') {
                $fields['company'] = $owner;
            }
        }
        $db->table('business_cards')->where('id', $id)->update([
            'fields'     => $fields === [] ? null : json_encode($fields, JSON_UNESCAPED_UNICODE),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $applied = [];
        if (! empty($body['apply']) && $card['owner_type'] === 'profile') {
            $patch = [];
            if (isset($fields['name']))     $patch['contact_name'] = $fields['name'];
            if (isset($fields['position'])) $patch['position']     = $fields['position'];
            if (isset($fields['phone']))    $patch['phone']        = $fields['phone'];
            if ($patch !== []) {
                $patch['updated_at'] = date('Y-m-d H:i:s');
                $db->table('profiles')->where('id', $card['owner_id'])->update($patch);
                unset($patch['updated_at']);
                $applied = array_keys($patch);
            }
        }

        $out = ['ok' => true, 'card' => $this->present($this->find($id)), 'applied' => $applied];
        /* 운영팀에게는 "같은 회사·같은 사람 아닌가" 후보를 같이 준다. 자동 병합은 하지 않는다 */
        if ($this->isAdmin) {
            $out['candidates'] = $this->duplicateCandidates($fields, $card['owner_type'], $card['owner_id']);
        }
        return $this->json($out);
    }

    /* ================= 관리자 확인(배지) ================= */

    private function verify(int $id): ResponseInterface
    {
        if (! $this->isAdmin) {
            return $this->err('admin_only', '관리자만 할 수 있습니다', 403);
        }
        $card = $this->find($id);
        if (! $card) {
            return $this->err('not_found', '명함이 없습니다', 404);
        }
        $body = $this->bodyJson() ?? [];
        $on   = ! array_key_exists('verified', $body) || (bool) $body['verified'];
        $now  = date('Y-m-d H:i:s');
        $db   = db_connect();

        $db->table('business_cards')->where('id', $id)->update([
            'verified_by' => $on ? $this->uid() : null,
            'verified_at' => $on ? $now : null,
            'updated_at'  => $now,
        ]);
        $this->refreshBadge($card['owner_type'], $card['owner_id']);

        return $this->json(['ok' => true, 'card' => $this->present($this->find($id))]);
    }

    /* ================= 관리자: 명함 등록 안내 메일 ================= */

    /**
     * body: { dry:true }            대상 수만
     *       { test:"me@x.com" }     샘플 한 통(베트남어)
     *       { limit:100 }           명함이 없는 인증 바이어에게 발송 — 보낸 사람은 card_notified_at 을 찍어 다시 안 보낸다
     * SMTP 는 관리자 › 행사 일정 › 알림 설정에 넣은 것을 쓴다(MkMail). 없으면 대량 발송은 막는다.
     */
    private function notify(): ResponseInterface
    {
        if (! $this->isAdmin) {
            return $this->err('admin_only', '관리자만 할 수 있습니다', 403);
        }
        $body = $this->bodyJson() ?? [];
        $db   = db_connect();

        if (! empty($body['test'])) {
            $to = strtolower(trim((string) $body['test']));
            if (! filter_var($to, FILTER_VALIDATE_EMAIL)) {
                return $this->err('bad_email', '이메일 형식이 아닙니다', 422);
            }
            [$subject, $text] = $this->inviteText('vi', 'Nguyễn Văn A');
            [$ok, $why]       = MkMail::send([$to], '[TEST] ' . $subject, $text);
            return $this->json(['ok' => $ok, 'sent' => $ok ? 1 : 0, 'message' => $why]);
        }

        $q = $db->table('profiles')->select('id, email, country, contact_name')
            ->where('status', 'verified')
            ->where('card_notified_at', null)
            ->where('email IS NOT NULL', null, false)
            ->where("id NOT IN (SELECT owner_id FROM business_cards WHERE owner_type = 'profile' AND deleted_at IS NULL)", null, false)
            ->orderBy('created_at', 'ASC');
        $total = $q->countAllResults(false);

        if (! empty($body['dry'])) {
            return $this->json(['ok' => true, 'total' => $total, 'smtp' => MkMail::configured()]);
        }
        if (! MkMail::configured()) {
            return $this->err('no_smtp', '관리자 › 행사 일정 › 알림 설정에서 메일 서버(SMTP)를 먼저 넣어 주세요', 409);
        }
        $limit = max(1, min(100, (int) ($body['limit'] ?? 50)));
        $rows  = $q->limit($limit)->get()->getResultArray();
        $sent  = 0;
        $failed = [];
        foreach ($rows as $p) {
            $lang = match (strtoupper((string) $p['country'])) { 'VN' => 'vi', 'KR' => 'ko', default => 'en' };
            [$subject, $text] = $this->inviteText($lang, (string) ($p['contact_name'] ?? ''));
            [$ok, $why]       = MkMail::send([$p['email']], $subject, $text);
            if ($ok) {
                $db->table('profiles')->where('id', $p['id'])->update(['card_notified_at' => date('Y-m-d H:i:s')]);
                $sent++;
            } else {
                $failed[] = $p['email'];
                log_message('error', 'cards notify ' . $p['email'] . ': ' . $why);
            }
        }
        return $this->json(['ok' => true, 'total' => $total, 'sent' => $sent, 'failed' => $failed,
            'remaining' => max(0, $total - $sent - count($failed))]);
    }

    /** 안내 메일 본문 — 텍스트. 바이어 언어(국가)별 */
    private function inviteText(string $lang, string $name): array
    {
        $name = trim($name);
        $url  = 'https://makenov.com/mypage.html';
        if ($lang === 'ko') {
            return ['[MAKENOV] 명함을 올리면 \'명함 확인\' 표시가 붙습니다', implode("\n", [
                ($name !== '' ? $name . ' 님, ' : '') . '안녕하세요. MAKENOV 입니다.',
                '',
                'MAKENOV 에 명함 기능이 생겼습니다. 명함 사진을 올리고 운영팀이 확인하면',
                '프로필에 \'명함 확인\' 표시가 붙습니다. 공급사는 담당자가 확인된 바이어를 먼저 찾습니다.',
                '',
                '방법 (1분):',
                '1. 로그인: ' . $url,
                '2. \'프로필\' 탭 → \'명함\' → \'명함 올리기\'',
                '3. 이름·직책·전화번호를 확인하고 저장',
                '',
                '명함 사진은 본인과 MAKENOV 운영팀에게만 보이고 공개되지 않습니다.',
                '',
                'MAKENOV — 한국 공급사와 베트남 유통 파트너를 잇습니다',
                'notice@makenov.com',
            ])];
        }
        if ($lang === 'en') {
            return ['[MAKENOV] Upload your business card to get the \'Card verified\' mark', implode("\n", [
                'Hello' . ($name !== '' ? ' ' . $name : '') . ',',
                '',
                'MAKENOV now supports business cards. Upload a photo of your card and, once the MAKENOV team',
                'confirms it, your profile shows a \'Card verified\' mark. Suppliers reach out to verified contacts first.',
                '',
                'How (1 minute):',
                '1. Sign in: ' . $url,
                '2. \'Profile\' tab → \'Business card\' → \'Upload card\'',
                '3. Check your name, title and phone, then save',
                '',
                'Your card photo is visible only to you and the MAKENOV team. It is never public.',
                '',
                'MAKENOV — Connecting Korean suppliers and Vietnamese distributors',
                'notice@makenov.com',
            ])];
        }
        return ['[MAKENOV] Tải danh thiếp lên để nhận dấu \'Đã xác nhận danh thiếp\'', implode("\n", [
            'Xin chào' . ($name !== '' ? ' ' . $name : '') . ',',
            '',
            'MAKENOV vừa có tính năng danh thiếp. Khi bạn tải ảnh danh thiếp lên và đội ngũ MAKENOV xác nhận,',
            'hồ sơ của bạn sẽ có dấu \'Đã xác nhận danh thiếp\'. Nhà cung cấp Hàn Quốc sẽ ưu tiên liên hệ người phụ trách đã được xác nhận.',
            '',
            'Cách làm (1 phút):',
            '1. Đăng nhập: ' . $url,
            '2. Thẻ \'Hồ sơ\' → \'Danh thiếp\' → \'Tải danh thiếp lên\'',
            '3. Kiểm tra tên, chức vụ, số điện thoại rồi lưu',
            '',
            'Ảnh danh thiếp chỉ hiển thị cho bạn và đội ngũ MAKENOV, không công khai.',
            '',
            'MAKENOV — Kết nối nhà cung cấp Hàn Quốc và nhà phân phối Việt Nam',
            'notice@makenov.com',
        ])];
    }

    /* ================= 삭제 ================= */

    private function destroy(int $id): ResponseInterface
    {
        $card = $this->find($id);
        if (! $card || ! $this->canAccess($card['owner_type'], $card['owner_id'])) {
            return $this->err('not_found', '명함이 없습니다', 404);
        }
        $now = date('Y-m-d H:i:s');
        db_connect()->table('business_cards')->where('id', $id)->update([
            'deleted_at' => $now, 'updated_at' => $now, 'image_key' => null,
        ]);
        if (! empty($card['image_key'])) {
            $this->store->delete($card['image_key']);      // 개인정보 — 행만 지우고 파일을 남기지 않는다
        }
        $this->refreshBadge($card['owner_type'], $card['owner_id']);

        return $this->json(['ok' => true]);
    }

    /* ================= 이미지 (서명 링크) ================= */

    private function image(int $id): ResponseInterface
    {
        $req = service('request');
        $exp = (int) ($req->getGet('e') ?? 0);
        $sig = (string) ($req->getGet('s') ?? '');
        if ($exp <= 0 || $sig === '' || ! $this->store->verify($id, $exp, $sig)) {
            return $this->err('expired', '링크가 만료됐습니다. 화면을 새로 고쳐 주세요.', 403);
        }
        $card = $this->find($id);
        if (! $card || empty($card['image_key'])) {
            return $this->err('not_found', '명함이 없습니다', 404);
        }
        $bytes = $this->store->read($card['image_key']);
        if ($bytes === null) {
            return $this->err('not_found', '파일이 없습니다', 404);
        }
        /* ⚠ 캐시 금지 — 서명이 만료돼도 브라우저·프록시에 남으면 의미가 없다 */
        $this->response->removeHeader('Cache-Control');
        $this->response
            ->setHeader('Content-Type', $card['image_mime'] ?: 'application/octet-stream')
            ->setHeader('Content-Length', (string) strlen($bytes))
            ->setHeader('Cache-Control', 'private, no-store')
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setHeader('Content-Disposition', 'inline');
        if ($req->getMethod() === 'HEAD') {
            return $this->response->setBody('');
        }
        return $this->response->setBody($bytes);
    }

    /* ================= 내부 ================= */

    private function find(int $id): ?array
    {
        return db_connect()->table('business_cards')->where('id', $id)->where('deleted_at', null)
            ->get()->getRowArray() ?: null;
    }

    /** 관리자는 전부, 바이어는 자기 프로필만. 공급사 명함은 관리자만 (공급사 계정이 없다) */
    private function canAccess(string $type, string $oid): bool
    {
        if ($this->isAdmin) {
            return in_array($type, self::OWNER_TYPES, true) && $oid !== '';
        }
        return $type === 'profile' && $oid !== '' && $oid === $this->uid();
    }

    private function ownerExists(string $type, string $oid): bool
    {
        $table = $type === 'company' ? 'companies' : 'profiles';
        return (bool) db_connect()->table($table)->where('id', $oid)->countAllResults();
    }

    /** 소유자의 회사명 — profiles.company 또는 companies.name(JSON {ko,vi,en} 중 첫 값) */
    private function ownerCompanyName(string $type, string $oid): string
    {
        $db = db_connect();
        if ($type === 'company') {
            $row = $db->table('companies')->select('name')->where('id', $oid)->get()->getRowArray();
            $n   = $row['name'] ?? '';
            $j   = is_string($n) ? json_decode($n, true) : null;
            if (is_array($j)) {
                $n = $j['ko'] ?? $j['vi'] ?? $j['en'] ?? '';
            }
            return trim((string) $n);
        }
        $row = $db->table('profiles')->select('company')->where('id', $oid)->get()->getRowArray();
        return trim((string) ($row['company'] ?? ''));
    }

    /** 확인된 명함이 한 장이라도 있으면 배지, 없으면 해제 — verify/destroy 뒤에 다시 계산 */
    private function refreshBadge(string $type, string $oid): void
    {
        $db   = db_connect();
        $last = $db->table('business_cards')->select('verified_at')
            ->where('owner_type', $type)->where('owner_id', $oid)
            ->where('deleted_at', null)->where('verified_at IS NOT NULL', null, false)
            ->orderBy('verified_at', 'DESC')->get()->getRowArray();
        $table = $type === 'company' ? 'companies' : 'profiles';
        $db->table($table)->where('id', $oid)->update(['card_verified_at' => $last['verified_at'] ?? null]);
    }

    /** 응답 모양 — 본인·관리자에게만 오는 경로이므로 서명 링크를 같이 준다 */
    private function present(array $r): array
    {
        $out = [];
        foreach (self::PUBLIC_COLS as $c) {
            $out[$c] = $r[$c] ?? null;
        }
        $out['id']          = (int) $r['id'];
        $out['image_bytes'] = isset($r['image_bytes']) ? (int) $r['image_bytes'] : null;
        $out['fields']      = ! empty($r['fields']) ? (json_decode($r['fields'], true) ?: null) : null;
        $out['verified']    = ! empty($r['verified_at']);
        $out['image_url']   = ! empty($r['image_key']) ? $this->store->signedUrl((int) $r['id']) : null;
        $out['image_ttl']   = $this->store->ttl();
        return $out;
    }

    /** 내용으로 형식 판정 — 확장자·Content-Type 은 보내는 쪽이 정하므로 믿지 않는다 */
    private function sniff(string $raw): ?string
    {
        $h = substr($raw, 0, 12);
        if (str_starts_with($h, "\xFF\xD8\xFF"))                             return 'image/jpeg';
        if (str_starts_with($h, "\x89PNG\r\n\x1A\n"))                        return 'image/png';
        if (str_starts_with($h, 'RIFF') && substr($h, 8, 4) === 'WEBP')      return 'image/webp';
        return null;
    }

    /**
     * 같은 사람·회사 후보 — 이름·전화·이메일·회사명으로 profiles 를 찾는다.
     * 베트남어 성조·전화 표기 차이를 normalize_helper 로 지운다. 근거(matched_on)를 함께 준다.
     */
    private function duplicateCandidates(array $f, string $type, string $oid): array
    {
        $email = strtolower(trim((string) ($f['email'] ?? '')));
        $phone = mk_normalize_phone($f['phone'] ?? '');
        $comp  = mk_normalize_text($f['company'] ?? '');
        $name  = mk_normalize_text($f['name'] ?? '');
        if ($email === '' && $phone === '' && $comp === '' && $name === '') {
            return [];
        }
        $rows = db_connect()->table('profiles')
            ->select('id, email, company, contact_name, phone, country, card_verified_at')
            ->orderBy('created_at', 'DESC')->limit(2000)->get()->getResultArray();
        $out = [];
        foreach ($rows as $p) {
            if ($type === 'profile' && $p['id'] === $oid) {
                continue;
            }
            $on = [];
            if ($email !== '' && strtolower((string) $p['email']) === $email)                       $on[] = 'email';
            if ($phone !== '' && mk_normalize_phone($p['phone']) === $phone)                         $on[] = 'phone';
            if ($comp !== '' && mk_normalize_text($p['company']) === $comp)                          $on[] = 'company';
            /* 이름만 같은 건 흔하다 — 전화·회사·이메일 중 하나라도 같이 맞을 때만 근거로 센다 */
            if ($name !== '' && $on !== [] && mk_normalize_text($p['contact_name']) === $name)   $on[] = 'name';
            if ($on !== []) {
                $out[] = ['id' => $p['id'], 'email' => $p['email'], 'company' => $p['company'],
                    'contact_name' => $p['contact_name'], 'country' => $p['country'], 'matched_on' => $on];
            }
            if (count($out) >= 10) {
                break;
            }
        }
        return $out;
    }

    private function err(string $code, string $msg, int $status): ResponseInterface
    {
        return $this->json(['ok' => false, 'error' => $code, 'err' => $code, 'message' => $msg], $status);
    }

    /** Meet 과 같은 가드 — 테이블·컬럼이 없으면 마이그레이션을 한 번 돌린다 */
    private function ensureSchema(): ?ResponseInterface
    {
        $flag = WRITEPATH . 'cards_schema_ok';
        if (is_file($flag) && trim((string) @file_get_contents($flag)) === self::SCHEMA_VER) {
            return null;
        }
        $db = db_connect();
        try {
            $m = service('migrations');
            $m->setNamespace('App');
            $m->latest();
            if (method_exists($db, 'resetDataCache')) {
                $db->resetDataCache();
            }
            $pf = $db->getFieldNames('profiles');
            if ($db->tableExists('business_cards')
                && in_array('card_verified_at', $pf, true)
                && in_array('card_notified_at', $pf, true)
                && in_array('card_verified_at', $db->getFieldNames('companies'), true)) {
                @file_put_contents($flag, self::SCHEMA_VER);
                return null;
            }
        } catch (\Throwable $e) {
            log_message('error', 'cards schema: ' . $e->getMessage());
        }
        return $this->err('schema_missing', '시스템을 준비하는 중입니다. 잠시 후 다시 시도해 주세요.', 503);
    }
}
