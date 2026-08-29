<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * /storage/v1/* — Supabase Storage 미믹 (버킷: product-images).
 *   POST /storage/v1/object/product-images/{path...}         업로드 (blob body)
 *   GET  /storage/v1/object/public/product-images/{path...}  공개 서빙
 *
 * supabase-js 의 getPublicUrl() 이 위 GET 주소를 만들어 내므로,
 * 프론트의 MK_SUPABASE_URL 만 이 서버로 바꾸면 이미지 주소가 그대로 이어진다.
 * 파일은 public/uploads/ 에 저장한다 (가이드라인 §1.1).
 *
 * 가이드라인 §3 업로드 규칙: 확장자 화이트리스트 · 5MB · 파일명 재생성.
 * ⚠ 파일명 재생성 편차: 경로가 곧 공개 URL 이 되는 구조라 통째로 바꾸면
 *   프론트가 만들어 둔 주소가 깨진다. 그래서 "정제"로 대신한다 —
 *   영문·숫자·._- 만 남기고 나머지는 _ 로 치환, 상위폴더 탈출(..) 차단.
 */
class Storage extends BaseApiController
{
    public function upload(...$segments): ResponseInterface
    {
        if ($fail = $this->requirePublic()) {
            return $fail;
        }
        /* 업로드는 관리자만 — 제품 이미지는 관리자 화면에서만 올린다 */
        if (! $this->isAdmin) {
            return $this->json(['message' => 'not allowed'], 403);
        }

        $path = $this->cleanPath($segments);
        if ($path === '') {
            return $this->json(['message' => 'bad path'], 400);
        }
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (! in_array($ext, $this->cfg->uploadExt, true)) {
            return $this->json(['message' => 'file type not allowed'], 415);
        }

        $raw = service('request')->getBody();
        if ($raw === null || $raw === '') {
            return $this->json(['message' => 'empty body'], 400);
        }
        if (strlen($raw) > $this->cfg->uploadMax) {
            return $this->json(['message' => 'file too large (max 5MB)'], 413);
        }

        $dest = FCPATH . $this->cfg->uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
        $dir  = dirname($dest);
        if (! is_dir($dir) && ! mkdir($dir, 0775, true)) {
            return $this->json(['message' => 'mkdir failed'], 500);
        }
        file_put_contents($dest, $raw);

        return $this->json(['Key' => 'product-images/' . $path, 'path' => $path]);
    }

    public function serve(...$segments): ResponseInterface
    {
        $path = $this->cleanPath($segments);
        $file = FCPATH . $this->cfg->uploadDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
        if ($path === '' || ! is_file($file)) {
            return $this->json(['message' => 'not found'], 404);
        }
        $ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $mime = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'webp' => 'image/webp', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf',
        ][$ext] ?? 'application/octet-stream';

        /* 관리자가 올린 원본(1.5~2MB PNG)을 그대로 내보내면 제품 페이지가 8MB 를 넘는다(2026-08-19 Lighthouse).
           브라우저가 WebP 를 받을 수 있으면 긴 변 1600px 로 줄인 WebP 를 만들어 writable/cache/img 에 두고 그걸 낸다.
           DB 의 이미지 주소는 그대로(.png) 라 데이터 수정 없이 전 이미지에 적용된다. GD 가 없거나 실패하면 원본. */
        if (in_array($ext, ['jpg', 'jpeg', 'png'], true)
            && str_contains((string) $this->request->getHeaderLine('Accept'), 'image/webp')) {
            /* 미리 만들어 둔 형제 파일(x.png → x.webp)이 있으면 그걸 먼저. 서버 PHP 에 GD 가 없어서(2026-08-19 진단)
               온더플라이 변환이 안 되는 동안은 레포에 함께 커밋한 형제 파일이 유일한 경로다 */
            $sib = preg_replace('/\.(jpe?g|png)$/i', '.webp', $file);
            $webp = ($sib !== $file && is_file($sib)) ? $sib : $this->webpVariant($file);
            if ($webp !== null) {
                return $this->sendImage($webp, 'image/webp');
            }
        }

        return $this->sendImage($file, $mime);
    }

    /**
     * 이미지 응답 한 곳 — 캐시 헤더·조건부 요청·HEAD 를 여기서 통일한다.
     *
     * ⚠ CI4 Response 는 생성자에서 noCache() 로 `no-store, max-age=0, no-cache` 를 먼저 넣는다.
     *   removeHeader 없이 setHeader 만 하면 두 값이 합쳐져 `no-store … public, max-age=31536000`
     *   이 되고 no-store 가 이겨 캐시가 통째로 죽는다(2026-08-28 진단: 칼럼 이미지 6.3MB 매 방문 재다운로드).
     *   Seo::home 이 같은 이유로 removeHeader 를 먼저 부른다.
     */
    private function sendImage(string $file, string $mime): ResponseInterface
    {
        $mtime = (int) @filemtime($file);
        $size  = (int) @filesize($file);
        $etag  = '"' . md5($file . '-' . $mtime . '-' . $size) . '"';
        $last  = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';

        $this->response->removeHeader('Cache-Control');
        $this->response
            ->setHeader('Content-Type', $mime)
            ->setHeader('Vary', 'Accept')
            ->setHeader('Cache-Control', 'public, max-age=31536000, immutable')
            ->setHeader('ETag', $etag)
            ->setHeader('Last-Modified', $last)
            /* 브라우저 RUM(PerformanceResourceTiming)이 교차 출처 이미지의 크기·구간을
               읽을 수 있게 — 언어 서브도메인에서 makenov.com 이미지를 부른다 */
            ->setHeader('Timing-Allow-Origin', '*');

        /* 조건부 요청 — 바뀐 게 없으면 본문 없이 304 */
        $inm = trim((string) $this->request->getHeaderLine('If-None-Match'));
        $ims = strtotime((string) $this->request->getHeaderLine('If-Modified-Since')) ?: 0;
        if (($inm !== '' && $inm === $etag) || ($ims && $mtime && $ims >= $mtime)) {
            return $this->response->setStatusCode(304)->setBody('');
        }

        $this->response->setHeader('Content-Length', (string) $size);

        /* HEAD 는 헤더만 — 본문을 실어 보내면 안 된다 */
        if (strtoupper($this->request->getMethod()) === 'HEAD') {
            return $this->response->setBody('');
        }

        return $this->response->setBody(file_get_contents($file));
    }

    /** 원본 → 최대 1600px WebP(q80). 캐시 파일 경로를 돌려주고, 못 만들면 null */
    private function webpVariant(string $file): ?string
    {
        if (! function_exists('imagewebp') || ! function_exists('imagecreatefromstring')) {
            return null;
        }
        $dir = WRITEPATH . 'cache' . DIRECTORY_SEPARATOR . 'img';
        $out = $dir . DIRECTORY_SEPARATOR . md5($file) . '-' . filemtime($file) . '.webp';
        if (is_file($out)) {
            return $out;
        }
        try {
            if (! is_dir($dir) && ! @mkdir($dir, 0775, true)) {
                return null;
            }
            $src = @imagecreatefromstring((string) file_get_contents($file));
            if (! $src) {
                return null;
            }
            $w = imagesx($src); $h = imagesy($src);
            $max = 1600;
            if ($w > $max || $h > $max) {
                $r  = min($max / $w, $max / $h);
                $nw = (int) round($w * $r); $nh = (int) round($h * $r);
                $dst = imagecreatetruecolor($nw, $nh);
                imagealphablending($dst, false); imagesavealpha($dst, true);
                imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
                imagedestroy($src); $src = $dst;
            }
            $ok = @imagewebp($src, $out, 80);
            imagedestroy($src);
            return ($ok && is_file($out)) ? $out : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** 세그먼트들을 안전한 경로로 — 탈출 차단 + 문자 정제 */
    private function cleanPath(array $segments): string
    {
        $parts = [];
        foreach ($segments as $seg) {
            $seg = preg_replace('/[^A-Za-z0-9._-]/', '_', (string) $seg);
            if ($seg === '' || $seg === '.' || $seg === '..') {
                continue;
            }
            $parts[] = $seg;
        }
        return implode('/', $parts);
    }
}
