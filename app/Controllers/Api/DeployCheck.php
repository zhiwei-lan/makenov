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
    private const MARKER = 'deploy-check-24';

    public function index(): ResponseInterface
    {
        return $this->response
            ->setContentType('text/plain')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody(self::MARKER);
    }
}
