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

/* ── 루트 / sitemap / robots — 호스트(vn·kr·en 서브도메인)별로 다르게 낸다. GET+HEAD ── */
$routes->match(['GET', 'HEAD'], '/', '\App\Controllers\Api\Seo::home');
$routes->match(['GET', 'HEAD'], 'sitemap.xml', '\App\Controllers\Api\Seo::sitemap');
$routes->match(['GET', 'HEAD'], 'robots.txt', '\App\Controllers\Api\Seo::robots');

/* ── 칼럼 RSS 피드 ─────────────────────────────────────────
   정적 파일이 아니라 라우트다 — 서버 public/ 소유권 때문에 git pull 이
   새 파일을 못 만들고, 라우트면 칼럼 발행 시 피드도 자동 갱신된다 */
$routes->match(['GET', 'HEAD'], 'rss.xml', '\App\Controllers\Api\Rss::feed');

/* ── 배포 확인 ─────────────────────────────────────────────
   Actions 초록불 ≠ 서버 반영. 이 응답의 마커로 실제 반영을 대조한다 */
$routes->match(['GET', 'HEAD'], 'deploy-check', '\App\Controllers\Api\DeployCheck::index');

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

/* ── 사업자 인증 (엣지함수 미믹) ───────────────────────────
   ⚠ 맨 앞의 \ 를 빼면 CI4 가 기본 네임스페이스를 덧붙여
     App\Controllers\App\Controllers\Api\... 가 되고 404 가 된다 (rss.xml 과 같은 함정) */
$routes->post('functions/v1/verify-business', '\App\Controllers\Api\Verify::handle');

/* ── 관리자 계정 관리 ──────────────────────────────────────
   admins 는 Rest 에서 write='none' 으로 잠겨 있다. 추가·해제·비밀번호는
   관리자 본인 토큰을 확인하는 이 창구만 지난다 */
$routes->post('functions/v1/admin-users', '\App\Controllers\Api\AdminUsers::handle');

/* ── Storage (버킷 product-images) ───────────────────────── */
$routes->group('storage/v1', ['namespace' => 'App\Controllers\Api'], static function ($routes) {
    $routes->post('object/product-images/(:any)', 'Storage::upload/$1');
    $routes->get('object/public/product-images/(:any)', 'Storage::serve/$1');
});

/* ── CORS OPTIONS 프리플라이트 ─────────────────────────────
   CI4 는 라우트 매칭이 필터보다 먼저라 미등록 경로의 OPTIONS 는
   필터가 안 돌고 그냥 404 가 된다. 프리플라이트가 오는 경로를
   전부 OPTIONS 라우트로 등록해 전역 cors 필터가 204 로 처리하게 한다 */
foreach (['rest/v1', 'auth/v1', 'functions/v1', 'storage/v1'] as $prefix) {
    $routes->options("$prefix/(:any)", static fn () => '');
}
