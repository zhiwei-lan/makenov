<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * CORS 전역 필터.
 * 프론트(정적 사이트)가 다른 도메인에서 이 API 를 부르므로 필요하다.
 * 운영에서 프론트 도메인이 확정되면 * 대신 그 도메인만 허용할 것.
 */
class Cors implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return service('response')
                ->setStatusCode(204)
                ->setHeader('Access-Control-Allow-Origin', '*')
                /* ⚠ content-profile 은 supabase-js 가 쓰기(POST/PATCH/DELETE)에만 붙이는 헤더.
                   목록에 없으면 프리플라이트가 거부돼 서브도메인에서 조회는 되는데 쓰기만
                   TypeError: Failed to fetch 로 죽는다 (2026-08-26 문의 제출 실패 원인). */
                ->setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, content-profile, x-client-info, x-supabase-api-version, prefer, accept-profile, accept, range, x-retry-count')
                ->setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
                ->setHeader('Access-Control-Max-Age', '86400');
        }
        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response->setHeader('Access-Control-Allow-Origin', '*');
    }
}
