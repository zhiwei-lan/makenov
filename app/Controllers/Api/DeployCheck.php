<?php

namespace App\Controllers\Api;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * GET /deploy-check — 배포가 실제로 서버에 반영됐는지 확인하는 창구.
 * ------------------------------------------------------------
 * deploy.yml 이 초록불이어도 서버에서 git pull 이 abort 되면 코드가
 * 안 올라간다(2026-08-13 사고). Actions 결과만으로는 구분이 안 돼서,
 * 배포될 때마다 MARKER 를 올리고 이 응답으로 대조한다.
 *
 * 민감한 정보는 담지 않는다 — 마커 문자열 하나뿐이다.
 */
class DeployCheck extends Controller
{
    /** 배포 확인용 마커. 배포를 검증할 때마다 숫자를 올린다. */
    private const MARKER = 'deploy-check-90';

    public function index(): ResponseInterface
    {
        $body = self::MARKER;
        /* ?diag=1 — 이미지 WebP 변환 경로 진단 (GD·webp 지원·캐시 디렉터리 쓰기). 민감정보 없음 */
        if ($this->request->getGet('diag') === '1') {
            $gd = function_exists('gd_info') ? gd_info() : [];
            $dir = WRITEPATH . 'cache' . DIRECTORY_SEPARATOR . 'img';
            @mkdir($dir, 0775, true);
            $body .= "
" . json_encode([
                'php'        => PHP_VERSION,
                'gd'         => function_exists('gd_info'),
                'imagewebp'  => function_exists('imagewebp'),
                'webp'       => (bool) ($gd['WebP Support'] ?? false),
                'cache_dir'  => is_dir($dir),
                'cache_writable' => is_writable($dir),
                'env'        => ENVIRONMENT,
            ]);
        }
        return $this->response
            ->setContentType('text/plain')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody($body);
    }
}
