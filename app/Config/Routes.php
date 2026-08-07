<?php

/**
 * MAKENOV API 라우트 (CodeIgniter 4)
 * ---------------------------------------------------------------------
 * Supabase 의 REST·Auth·Storage·Functions 경로를 그대로 흉내낸다.
 * 프론트(assets/js/config.js)는 두 값만 바꾸면 그대로 동작한다:
 *   MK_SUPABASE_URL  → 이 서버 주소
 *   MK_SUPABASE_ANON → .env 의 makenov.publicToken 값
 *
 * ▶ 기존 CI4 프로젝트에 얹는 경우: 아래 그룹들을 app/Config/Routes.php 에 붙여넣는다.
 *   (새 프로젝트면 이 파일을 그대로 쓰면 된다)
 */

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

$routes->get('/', static fn () => 'MAKENOV API');

/* ── REST (PostgREST 미믹) ─────────────────────────────────
   GET/POST/PATCH/DELETE /rest/v1/{table}
   권한은 Api\Rest 의 POLICY 맵이 RLS 를 그대로 옮겨 시행한다 */
$routes->group('rest/v1', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->get('(:segment)', 'Rest::handle/$1');
    $routes->post('(:segment)', 'Rest::handle/$1');
    $routes->patch('(:segment)', 'Rest::handle/$1');
    $routes->delete('(:segment)', 'Rest::handle/$1');
});

/* ── Auth (GoTrue 미믹) ──────────────────────────────────── */
$routes->group('auth/v1', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->post('signup', 'Auth::signup');
    $routes->post('token', 'Auth::token');
    $routes->get('user', 'Auth::user');
    $routes->post('logout', 'Auth::logout');
    $routes->post('resend', 'Auth::resend');
});

/* ── 사업자 인증 (엣지함수 미믹) ─────────────────────────── */
$routes->post('functions/v1/verify-business', 'App\Controllers\Api\Verify::handle');

/* ── Storage (버킷 product-images) ───────────────────────── */
$routes->group('storage/v1', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->post('object/product-images/(:any)', 'Storage::upload/$1');
    $routes->get('object/public/product-images/(:any)', 'Storage::serve/$1');
});
