<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /functions/v1/admin-users — 관리자 계정 관리 (엣지함수 자리).
 * ------------------------------------------------------------
 * 관리자 판정은 admins 테이블 대조다(BaseApiController::resolveUser).
 * 그래서 admins 는 Rest 의 POLICY 에서 write='none' 으로 잠겨 있다 —
 * PostgREST 문법으로 임의 INSERT 가 되면 로그인한 누구나 스스로를
 * 관리자로 만들 수 있기 때문이다. 계정 추가·해제는 이 창구만 지난다.
 *
 * 동작 (body.action):
 *   list      관리자 목록
 *   add       이메일로 관리자 지정 — 없는 계정이면 새로 만든다
 *   remove    관리자 해제 — 본인·마지막 관리자는 막는다 (잠금 방지)
 *   password  비밀번호 변경 — 본인은 현재 비밀번호 확인, 다른 관리자는 재설정
 *
 * 응답은 프론트가 쓰는 {ok, ...} 모양이다 (verify-business 와 같은 규약).
 */
class AdminUsers extends BaseApiController
{
    /** 관리자 비밀번호 최소 길이 — 일반 가입(6자)보다 길게 잡는다 */
    private const PW_MIN = 8;

    public function handle(): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        /* 모든 동작이 관리자 전용 — 여기서 한 번만 막는다 */
        if (! $this->isAdmin) {
            return $this->json(['ok' => false, 'err' => 'not_admin'], 403);
        }

        $body = $this->bodyJson() ?? [];

        return match ($body['action'] ?? '') {
            'list'     => $this->listAdmins(),
            'add'      => $this->addAdmin($body),
            'remove'   => $this->removeAdmin($body),
            'password' => $this->changePassword($body),
            default    => $this->fail('unknown_action', 400),
        };
    }

    /* ================= list ================= */

    private function listAdmins(): ResponseInterface
    {
        $rows = db_connect()->table('admins')
            ->select('admins.user_id, admins.created_at, auth_users.email')
            ->join('auth_users', 'auth_users.id = admins.user_id')
            ->orderBy('admins.created_at', 'ASC')
            ->get()->getResultArray();

        $me = $this->uid();

        return $this->json([
            'ok'   => true,
            'list' => array_map(static fn ($r) => [
                'user_id'    => $r['user_id'],
                'email'      => $r['email'],
                'created_at' => $r['created_at'],
                'self'       => $r['user_id'] === $me,
            ], $rows),
        ]);
    }

    /* ================= add ================= */

    private function addAdmin(array $body): ResponseInterface
    {
        $email = strtolower(trim($body['email'] ?? ''));
        $pw    = (string) ($body['password'] ?? '');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->fail('bad_email', 422);
        }

        $db   = db_connect();
        $user = $db->table('auth_users')->where('email', $email)->get()->getRowArray();
        $now  = date('Y-m-d H:i:s');

        if ($user) {
            /* 이미 있는 계정을 관리자로 승격 — 기존 회원(바이어)도 대상이 된다 */
            if ($db->table('admins')->where('user_id', $user['id'])->countAllResults()) {
                return $this->fail('already_admin', 409);
            }
            $db->table('admins')->insert([
                'user_id' => $user['id'], 'created_at' => $now, 'updated_at' => $now,
            ]);

            return $this->json(['ok' => true, 'mode' => 'promoted', 'email' => $email]);
        }

        /* 없는 계정이면 새로 만든다 — Auth::signup 과 같은 절차(계정 + 프로필) */
        if (strlen($pw) < self::PW_MIN) {
            return $this->fail('weak_password', 422);
        }
        $uid = $this->uuid();
        $db->table('auth_users')->insert([
            'id' => $uid, 'email' => $email,
            'password_hash'      => password_hash($pw, PASSWORD_DEFAULT),
            'email_confirmed_at' => $now,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $db->table('profiles')->insert([
            'id' => $uid, 'email' => $email,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $db->table('admins')->insert([
            'user_id' => $uid, 'created_at' => $now, 'updated_at' => $now,
        ]);

        return $this->json(['ok' => true, 'mode' => 'created', 'email' => $email]);
    }

    /* ================= remove ================= */

    private function removeAdmin(array $body): ResponseInterface
    {
        $target = (string) ($body['user_id'] ?? '');
        if ($target === '') {
            return $this->fail('no_user', 422);
        }
        /* 본인 해제는 막는다 — 마지막 창구를 스스로 닫으면 SQL 없이 복구할 수 없다 */
        if ($target === $this->uid()) {
            return $this->fail('cannot_remove_self', 409);
        }

        $db = db_connect();
        if (! $db->table('admins')->where('user_id', $target)->countAllResults()) {
            return $this->fail('not_found', 404);
        }
        if ($db->table('admins')->countAllResults() <= 1) {
            return $this->fail('last_admin', 409);
        }

        /* admins 행만 지운다 — 계정 자체는 남겨 문의·관심제품 이력을 보존한다.
           isAdmin 은 요청마다 다시 계산되므로 상대의 세션은 즉시 권한을 잃는다. */
        $db->table('admins')->where('user_id', $target)->delete();

        return $this->json(['ok' => true]);
    }

    /* ================= password ================= */

    private function changePassword(array $body): ResponseInterface
    {
        $target = (string) ($body['user_id'] ?? '') ?: (string) $this->uid();
        $pw     = (string) ($body['password'] ?? '');
        $is_self = $target === $this->uid();

        if (strlen($pw) < self::PW_MIN) {
            return $this->fail('weak_password', 422);
        }

        $db   = db_connect();
        /* 대상은 관리자여야 한다 — 이 창구로 일반 회원 비밀번호까지 바꾸지 못하게 */
        if (! $db->table('admins')->where('user_id', $target)->countAllResults()) {
            return $this->fail('not_admin_target', 403);
        }
        $user = $db->table('auth_users')->where('id', $target)->get()->getRowArray();
        if (! $user) {
            return $this->fail('not_found', 404);
        }

        /* 본인 변경은 현재 비밀번호를 확인한다 — 열린 화면을 남의 손이 만졌을 때의 방어 */
        if ($is_self && ! password_verify((string) ($body['current'] ?? ''), $user['password_hash'])) {
            return $this->fail('wrong_current', 403);
        }

        $db->table('auth_users')->where('id', $target)->update([
            'password_hash' => password_hash($pw, PASSWORD_DEFAULT),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);

        /* 비밀번호가 바뀌면 기존 세션은 끊는다. 본인 변경일 때 지금 쓰는 토큰만
           남겨 화면이 그대로 이어지게 한다 (다른 기기·브라우저는 재로그인). */
        $kill = $db->table('auth_tokens')->where('user_id', $target);
        if ($is_self && ($t = $this->bearer()) !== '') {
            $kill->where('access_token !=', $t);
        }
        $kill->delete();

        return $this->json(['ok' => true, 'email' => $user['email'], 'self' => $is_self]);
    }

    private function fail(string $err, int $status): ResponseInterface
    {
        return $this->json(['ok' => false, 'err' => $err], $status);
    }
}
