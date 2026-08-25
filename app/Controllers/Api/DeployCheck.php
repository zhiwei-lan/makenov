<?php

namespace App\Controllers\Api;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * GET /deploy-check ??諛고룷媛 ?ㅼ젣濡??쒕쾭??諛섏쁺?먮뒗吏 ?뺤씤?섎뒗 李쎄뎄.
 * ------------------------------------------------------------
 * deploy.yml ??珥덈줉遺덉씠?대룄 ?쒕쾭?먯꽌 git pull ??abort ?섎㈃ 肄붾뱶媛
 * ???щ씪媛꾨떎(2026-08-13 ?ш퀬). Actions 寃곌낵留뚯쑝濡쒕뒗 援щ텇?????쇱꽌,
 * 諛고룷???뚮쭏??MARKER 瑜??щ━怨????묐떟?쇰줈 ?議고븳??
 *
 * 誘쇨컧???뺣낫???댁? ?딅뒗????留덉빱 臾몄옄???섎굹肉먯씠??
 */
class DeployCheck extends Controller
{
    /** 諛고룷 ?뺤씤??留덉빱. 諛고룷瑜?寃利앺븷 ?뚮쭏???レ옄瑜??щ┛?? */
    private const MARKER = 'deploy-check-82';

    public function index(): ResponseInterface
    {
        $body = self::MARKER;
        /* ?diag=1 ???대?吏 WebP 蹂??寃쎈줈 吏꾨떒 (GD쨌webp 吏?먃룹틦???붾젆?곕━ ?곌린). 誘쇨컧?뺣낫 ?놁쓬 */
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
