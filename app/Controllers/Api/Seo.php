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

    /**
     * robots.txt 본문 — build-sites.js 가 정적 사이트에 써 넣는 것과 같은 내용이어야 한다.
     * 와일드카드만으로도 AI 크롤러는 이미 허용되지만, 명시해 두면 의도가 기록으로 남고
     * 나중에 특정 봇만 막을 때 이 자리에서 끝난다(2026-08-28 GEO 진단).
     */
    public static function robotsBody(string $host): string
    {
        $bots = [
            'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
            'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
            'PerplexityBot', 'Perplexity-User',
            'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'CCBot',
        ];
        $body = "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /mypage.html\n";
        foreach ($bots as $b) {
            $body .= "\nUser-agent: {$b}\nAllow: /\nDisallow: /admin/\nDisallow: /mypage.html\n";
        }

        return $body . "\nSitemap: https://{$host}/sitemap.xml\n";
    }

    public function robots(): ResponseInterface
    {
        $lang = $this->langOfHost();
        $host = $lang ? array_search($lang, self::HOSTS, true) : 'makenov.com';
        $body = self::robotsBody($host);
        return $this->response
            ->setContentType('text/plain')
            ->setHeader('Cache-Control', 'public, max-age=3600')
            ->setBody($body);
    }

    /** 루트 `/` — 호스트 언어의 랜딩을 낸다 (Nginx 가 먼저 잡지만 이중 안전장치) */
    public function home(): ResponseInterface
    {
        $lang = $this->langOfHost();
        $dir = $lang === 'kr' ? 'ko/' : ($lang === 'en' ? 'en/' : '');
        $file = ROOTPATH . 'public/' . $dir . 'index.html';
        $html = is_file($file) ? file_get_contents($file) : file_get_contents(ROOTPATH . 'public/index.html');
        $this->response->removeHeader('Cache-Control');
        return $this->response->setHeader('Cache-Control', 'public, max-age=300')->setBody($html);
    }
}
