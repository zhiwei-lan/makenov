<?php

/**
 * ▶ 이 파일은 그대로 쓰는 파일이 아니라 "붙여넣기용" 입니다.
 *
 * appstarter 의 app/Config/Filters.php 에 아래 두 가지를 반영하세요.
 *
 * 1) $aliases 배열에 추가:
 *
 *     'cors'      => \App\Filters\Cors::class,
 *     'adminAuth' => \App\Filters\AdminAuth::class,
 *
 * 2) CORS 를 전역으로 (OPTIONS 프리플라이트 포함):
 *
 *     public array $globals = [
 *         'before' => ['cors'],
 *         'after'  => ['cors'],
 *     ];
 *
 * adminAuth 는 지금은 매지 않습니다 — 관리자 화면이 정적 SPA 라
 * API 토큰 검사(BaseApiController)로 보호되고, 서버 렌더링 관리자
 * 페이지를 만들 때 라우트 그룹에 ['filter' => 'adminAuth'] 로 겁니다.
 */
