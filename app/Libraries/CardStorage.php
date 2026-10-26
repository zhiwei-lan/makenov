<?php

namespace App\Libraries;

use Config\Makenov;

/**
 * 명함 원본 보관 — 공개 디렉토리 바깥 + 만료되는 서명 링크.
 * ------------------------------------------------------------
 * ⚠ Api\Storage(제품 이미지)와 다르다. 그쪽은 public/uploads 에 두고 공개 서빙하며
 *   그게 맞다. 명함은 실명·전화·이메일이 적혀 있어 같은 길로 보내면 유출된다.
 *
 * 파일명은 완전히 새로 만든다. 업로드된 이름을 쓰면 그 자체가 개인정보이고
 * (대개 사람 이름이 들어간다), 경로 탈출의 통로가 되기도 한다.
 *
 * 서명 키: .env 의 makenov.imageUrlSecret 이 있으면 쓰고, 없으면 writable/ 에
 * 한 번 만들어 둔다. 배포가 .env 를 건드리지 않는 구조라(2026-09-15 장애 이후)
 * 설정 없이도 동작해야 하기 때문이다. 키가 바뀌면 기존 링크만 무효가 된다.
 */
class CardStorage
{
    public function __construct(private ?Makenov $cfg = null)
    {
        $this->cfg ??= config('Makenov');
    }

    public function root(): string
    {
        $p = trim((string) ($this->cfg->cardStoragePath ?? ''));
        if ($p === '') {
            $p = rtrim(WRITEPATH, '/\\') . DIRECTORY_SEPARATOR . 'cards';
        }

        return rtrim($p, '/\\');
    }

    /** 저장하고 보관 키를 돌려준다 — {owner_type}/{YYYY}/{MM}/{32자 난수}.{ext} */
    public function save(string $ownerType, string $bytes, string $ext): string
    {
        $key  = sprintf('%s/%s/%s/%s.%s', $ownerType, date('Y'), date('m'), bin2hex(random_bytes(16)), $ext);
        $path = $this->pathOf($key);
        $dir  = dirname($path);
        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new \RuntimeException('명함 저장 폴더를 만들 수 없습니다: ' . $dir);
        }
        if (file_put_contents($path, $bytes) === false) {
            throw new \RuntimeException('명함 파일을 저장하지 못했습니다.');
        }

        return $key;
    }

    public function read(string $key): ?string
    {
        $path = $this->pathOf($key);

        return is_file($path) ? (file_get_contents($path) ?: null) : null;
    }

    public function delete(string $key): void
    {
        $path = $this->pathOf($key);
        if (is_file($path)) {
            @unlink($path);
        }
    }

    /* ---------- 서명 링크 ---------- */

    /** 카드 id 와 만료 시각을 함께 서명 — 어느 하나를 바꾸면 깨진다 */
    public function signature(int $cardId, int $expires): string
    {
        return hash_hmac('sha256', $cardId . '|' . $expires, $this->secret());
    }

    public function verify(int $cardId, int $expires, string $sig): bool
    {
        if ($expires < time()) {
            return false;
        }

        return hash_equals($this->signature($cardId, $expires), $sig);
    }

    public function ttl(): int
    {
        return max(30, (int) ($this->cfg->imageUrlTtl ?? 300));
    }

    /**
     * 응답에 실어 보낼 서명 URL — 프로토콜 상대(//호스트/경로).
     * site_url() 을 쓰지 않는 이유: 서버 .env 의 app.baseURL 은 옛 도메인(vigo)이고 실제로는
     * makenov.com·vn.makenov.com 여러 호스트로 뜬다(Seo 가 HTTP_HOST 를 쓰는 것과 같은 사정).
     * 요청이 들어온 호스트로 돌려주면 화면이 어느 도메인에 떠 있든 같은 곳을 가리킨다.
     */
    public function signedUrl(int $cardId): string
    {
        $exp  = time() + $this->ttl();
        $host = strtolower(trim((string) service('request')->getServer('HTTP_HOST')));
        $path = '/functions/v1/cards/' . $cardId . '/image?e=' . $exp . '&s=' . $this->signature($cardId, $exp);

        return ($host !== '' ? '//' . $host : '') . $path;
    }

    /* ---------- 내부 ---------- */

    private function pathOf(string $key): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._\/-]/', '', $key) ?? '';
        $clean = str_replace('..', '', $clean);

        return $this->root() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $clean);
    }

    private function secret(): string
    {
        $s = trim((string) ($this->cfg->imageUrlSecret ?? ''));
        if ($s !== '') {
            return $s;
        }

        /* .env 에 없으면 writable/ 에 한 번 만들어 둔다. 기존 .env 를 건드리지 않기 위해서다. */
        $file = WRITEPATH . 'card_secret';
        $s    = is_file($file) ? trim((string) @file_get_contents($file)) : '';
        if ($s === '') {
            $s = bin2hex(random_bytes(32));
            if (@file_put_contents($file, $s) === false) {
                throw new \RuntimeException('명함 서명 키를 만들 수 없습니다 (writable/ 쓰기 권한).');
            }
            @chmod($file, 0640);
        }

        return $s;
    }
}
