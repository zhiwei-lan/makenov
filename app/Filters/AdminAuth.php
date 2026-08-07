<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * AdminAuth 필터 — 가이드라인 §5.
 * 세션에 admin_id 가 없으면 /admin/login 으로 보낸다.
 *
 * ⚠ 지금 MAKENOV 관리자 화면은 서버 렌더링이 아니라 정적 SPA(admin/index.html)이고,
 *   API 는 로그인 토큰 + admins 테이블 대조(BaseApiController)로 보호된다.
 *   이 필터는 나중에 서버 렌더링 관리자 페이지를 만들 때 쓰라고 표준대로 준비해 둔 것.
 */
class AdminAuth implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (! session()->get('admin_id')) {
            return redirect()->to('/admin/login');
        }
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
