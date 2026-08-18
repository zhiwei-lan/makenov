<?php

namespace App\Controllers\Api;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /rss.xml — 칼럼 RSS 2.0 피드 (네이버 서치어드바이저 제출용).
 * ------------------------------------------------------------
 * columns_post 에서 published 만 최신순으로 뽑아 XML 로 만든다.
 * 정적 파일이 아니라 라우트인 이유: 서버 public/ 이 1panel 소유라
 * git pull 이 새 파일을 못 만든다(Permission denied). 코드로 서빙하면
 * 그 문제가 없고, 칼럼을 새로 발행해도 피드가 자동으로 따라온다.
 *
 * 공개 피드라 토큰 관문(requirePublic)을 두지 않는다 — 네이버 봇이
 * 헤더 없이 그냥 가져간다.
 */
class Rss extends Controller
{
    private const ORIGIN = 'https://makenov.com';

    /** 초기 칼럼은 DB slug 가 비어 있다. 구운 정적 페이지의 경로로 잇는다.
        c-reply(공급사 첫 회신)는 2026-08-17 개편에서 삭제했다. 읽는 사람이
        유통 파트너인데 답하는 쪽 관점으로 쓰인 글이라 자리가 맞지 않았다. */
    private const SLUG_FALLBACK = [
        'c-quote'  => 'quote-request-checklist',
        'c-sample' => 'sample-request-checklist',
    ];

    public function feed(): ResponseInterface
    {
        $rows = db_connect()->table('columns_post')
            ->where('published', 1)
            ->orderBy('date', 'DESC')
            ->get()->getResultArray();

        $items = '';
        foreach ($rows as $row) {
            $slug = $row['slug'] ?: (self::SLUG_FALLBACK[$row['id']] ?? '');
            if ($slug === '') {
                continue;   // 경로를 모르는 글은 피드에 싣지 않는다
            }
            $title   = $this->ko($row['title']);
            $excerpt = $this->ko($row['excerpt']);
            $link    = self::ORIGIN . '/ko/columns/' . $slug . '.html';
            $pubDate = date('D, d M Y', strtotime($row['date'])) . ' 09:00:00 +0900';

            $items .= "  <item>\n"
                . '    <title>' . $this->esc($title) . "</title>\n"
                . '    <link>' . $this->esc($link) . "</link>\n"
                . '    <guid isPermaLink="true">' . $this->esc($link) . "</guid>\n"
                . '    <description>' . $this->esc($excerpt) . "</description>\n"
                . '    <pubDate>' . $pubDate . "</pubDate>\n"
                . "  </item>\n";
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">' . "\n"
            . "<channel>\n"
            . "  <title>메이크노브 MAKENOV 칼럼</title>\n"
            . '  <link>' . self::ORIGIN . "/ko/columns.html</link>\n"
            . "  <description>글로벌 소싱과 수출 실무 가이드 — 견적 요청, 샘플 확인, 바이어 회신 등 B2B 무역 실무 칼럼</description>\n"
            . "  <language>ko</language>\n"
            . '  <atom:link href="' . self::ORIGIN . '/rss.xml" rel="self" type="application/rss+xml"/>' . "\n"
            . $items
            . "</channel>\n"
            . "</rss>\n";

        return $this->response
            ->setContentType('application/rss+xml', 'UTF-8')
            ->setHeader('Cache-Control', 'public, max-age=3600')
            ->setBody($xml);
    }

    /** jsonb 문자열 컬럼에서 한국어 값을 꺼낸다 */
    private function ko(?string $json): string
    {
        $v = json_decode($json ?? '', true);
        return is_array($v) ? ($v['ko'] ?? reset($v) ?: '') : (string) $json;
    }

    private function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
