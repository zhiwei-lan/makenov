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
        $mime = [
            'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
            'webp' => 'image/webp', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf',
        ][strtolower(pathinfo($file, PATHINFO_EXTENSION))] ?? 'application/octet-stream';

        return $this->response
            ->setHeader('Content-Type', $mime)
            ->setHeader('Cache-Control', 'public, max-age=31536000')
            ->setBody(file_get_contents($file));
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
