<?php

namespace App\Controllers\Api;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * 호스트별 sitemap.xml / robots.txt
 * ------------------------------------------------------------
 * 서브도메인(vn/kr/en.makenov.com)은 같은 public/ 디렉터리를 쓰고
 * Nginx 가 호스트에 따라 언어 폴더를 먼저 찾아 준다. 정적 sitemap.xml
 * 하나로는 호스트마다 다른 URL 목록을 줄 수 없어 라우트로 낸다.
 *  - vn/kr/en 호스트  → public/sitemaps/{vn|kr|en}.xml
 *  - 그 밖(makenov.com) → 세 사이트맵을 가리키는 인덱스
 */
class Seo extends Controller
{
    private const HOSTS = [
        'vn.makenov.com' => 'vn',
        'kr.makenov.com' => 'kr',
        'en.makenov.com' => 'en',
    ];

    private function langOfHost(): ?string
    {
        $host = strtolower((string) $this->request->getServer('HTTP_HOST'));
        $host = preg_replace('/:\d+$/', '', $host);
        return self::HOSTS[$host] ?? null;
    }

    public function sitemap(): ResponseInterface
    {
        $lang = $this->langOfHost();
        $file = ROOTPATH . 'public/sitemaps/' . ($lang ?: 'index') . '.xml';
        $body = is_file($file) ? file_get_contents($file) : '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
        return $this->response
            ->setContentType('application/xml')
            ->setHeader('Cache-Control', 'public, max-age=3600')
            ->setBody($body);
    }

    public function robots(): ResponseInterface
    {
        $lang = $this->langOfHost();
        $host = $lang ? array_search($lang, self::HOSTS, true) : 'makenov.com';
        $body = "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /mypage.html\n\nSitemap: https://{$host}/sitemap.xml\n";
        return $this->response
            ->setContentType('text/plain')
            ->setHeader('Cache-Control', 'public, max-age=3600')
            ->setBody($body);
    }

    /** 루트 `/` — 호스트 언어의 랜딩을 낸다 (Nginx 가 먼저 잡지만 이중 안전장치) */
    public function home(): string
    {
        $lang = $this->langOfHost();
        $dir = $lang === 'kr' ? 'ko/' : ($lang === 'en' ? 'en/' : '');
        $file = ROOTPATH . 'public/' . $dir . 'index.html';
        return is_file($file) ? file_get_contents($file) : file_get_contents(ROOTPATH . 'public/index.html');
    }
}
