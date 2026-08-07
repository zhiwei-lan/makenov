<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /auth/v1/* — Supabase Auth(GoTrue) 미믹.
 * ------------------------------------------------------------
 * supabase-js 가 부르는 것만 구현한다:
 *   POST /auth/v1/signup                     signUp()
 *   POST /auth/v1/token?grant_type=password  signInWithPassword()
 *   POST /auth/v1/token?grant_type=refresh_token   (자동 갱신)
 *   GET  /auth/v1/user                       세션 검증
 *   POST /auth/v1/logout                     signOut()
 *   POST /auth/v1/resend                     확인메일 재발송 — 메일을 안 쓰므로 no-op
 *
 * 이메일 확인 절차는 없다(가입 즉시 confirmed). Supabase 콘솔에서
 * Confirm email 을 꺼둔 것과 같은 동작이고, 프론트는 그대로 돈다.
 * 비밀번호는 가이드라인 §3 대로 password_hash() 로 저장한다.
 */
class Auth extends BaseApiController
{
    public function signup(): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        $b        = $this->bodyJson() ?? [];
        $email    = strtolower(trim($b['email'] ?? ''));
        $password = (string) ($b['password'] ?? '');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 6) {
            return $this->err('Signup requires a valid email and a password of at least 6 characters', 422);
        }

        $db = db_connect();
        if ($db->table('auth_users')->where('email', $email)->countAllResults()) {
            return $this->err('User already registered', 422);
        }

        $uid = $this->uuid();
        $now = date('Y-m-d H:i:s');
        $db->table('auth_users')->insert([
            'id' => $uid, 'email' => $email,
            'password_hash'      => password_hash($password, PASSWORD_DEFAULT),
            'email_confirmed_at' => $now,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        /* 프로필 자동 생성 — Supabase 의 handle_new_user 트리거 미믹 */
        $db->table('profiles')->insert([
            'id' => $uid, 'email' => $email,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        return $this->session($uid, $email, $now);
    }

    public function token(): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        $grant = service('request')->getGet('grant_type');
        $b     = $this->bodyJson() ?? [];
        $db    = db_connect();

        if ($grant === 'password') {
            $email = strtolower(trim($b['email'] ?? ''));
            $user  = $db->table('auth_users')->where('email', $email)->get()->getRowArray();
            if (! $user || ! password_verify((string) ($b['password'] ?? ''), $user['password_hash'])) {
                return $this->err('Invalid login credentials', 400);
            }
            return $this->session($user['id'], $user['email'], $user['created_at']);
        }

        if ($grant === 'refresh_token') {
            $rt  = (string) ($b['refresh_token'] ?? '');
            $row = $db->table('auth_tokens')->where('refresh_token', $rt)->get()->getRowArray();
            if (! $row) {
                return $this->err('Invalid Refresh Token', 400);
            }
            $user = $db->table('auth_users')->where('id', $row['user_id'])->get()->getRowArray();
            $db->table('auth_tokens')->where('id', $row['id'])->delete();   // 회전
            return $this->session($user['id'], $user['email'], $user['created_at']);
        }

        return $this->err('unsupported grant type', 400);
    }

    public function user(): ResponseInterface
    {
        if (! $this->user) {
            return $this->err('invalid token', 401);
        }
        return $this->json($this->userObj($this->user['id'], $this->user['email'], $this->user['created_at']));
    }

    public function logout(): ResponseInterface
    {
        $t = $this->bearer();
        if ($t !== '') {
            db_connect()->table('auth_tokens')->where('access_token', $t)->delete();
        }
        return $this->response->setStatusCode(204)->setBody('');
    }

    /** 확인메일 재발송 — 메일 발송을 쓰지 않으므로 성공만 돌려준다 */
    public function resend(): ResponseInterface
    {
        return $this->json((object) []);
    }

    /* ---------- 내부 ---------- */

    /** 토큰 발급 + supabase-js 가 기대하는 세션 페이로드 */
    private function session(string $uid, string $email, string $createdAt): ResponseInterface
    {
        $access  = bin2hex(random_bytes(32));
        $refresh = bin2hex(random_bytes(32));
        $ttl     = $this->cfg->tokenTtl;
        $now     = date('Y-m-d H:i:s');
        db_connect()->table('auth_tokens')->insert([
            'user_id' => $uid, 'access_token' => $access, 'refresh_token' => $refresh,
            'expires_at' => date('Y-m-d H:i:s', time() + $ttl),
            'created_at' => $now, 'updated_at' => $now,
        ]);
        return $this->json([
            'access_token'  => $access,
            'token_type'    => 'bearer',
            'expires_in'    => $ttl,
            'expires_at'    => time() + $ttl,
            'refresh_token' => $refresh,
            'user'          => $this->userObj($uid, $email, $createdAt),
        ]);
    }

    private function userObj(string $uid, string $email, string $createdAt): array
    {
        return [
            'id' => $uid, 'aud' => 'authenticated', 'role' => 'authenticated',
            'email' => $email,
            'email_confirmed_at' => $createdAt,
            'app_metadata'  => ['provider' => 'email', 'providers' => ['email']],
            'user_metadata' => (object) [],
            'created_at' => $createdAt, 'updated_at' => $createdAt,
        ];
    }

    /** GoTrue 오류 모양 — supabase-js 는 msg/error_description 을 읽는다 */
    private function err(string $msg, int $status): ResponseInterface
    {
        return $this->json([
            'code' => $status, 'msg' => $msg, 'error_description' => $msg,
        ], $status);
    }
}
