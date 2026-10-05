<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 문구 교체(1회) — '한국 공급사' 표현을 글로벌(공급사)로(2026-10-05 사용자 지시).
 * 관리자 설정에 저장돼 있어 사이트에 그대로 나오는 두 곳을 맞춘다:
 *   settings(site).topbar                      상단 띠배너
 *   settings(copy)['ui.promo_title' · 'ui.promo_desc']   제품 페이지 중간 배너
 * 000040 이 넣은 문구(‘한국 공급사’ · ‘한국 담당자’가 들어 있는 값)일 때만 바꾼다 — 관리자가 그사이 고친 값은 건드리지 않는다.
 * 적용: Api\Meet 스키마 가드 v18.
 */
class GlobalSupplierCopy extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('settings')) {
            return;
        }
        $new = json_decode(<<<'JSON'
{
 "topbar": {
  "ko": "글로벌 공급사를 베트남에서 직접 만나세요. 미팅 신청은 무료, 가입 없이 1분이면 됩니다",
  "vi": "Gặp trực tiếp nhà cung cấp toàn cầu tại Việt Nam. Đăng ký miễn phí, không cần tạo tài khoản",
  "en": "Meet global suppliers in person in Vietnam. Free to request, no account needed"
 },
 "ui.promo_title": {
  "ko": "5곳이 모이면\n공급사가 직접 찾아옵니다",
  "vi": "Đủ 5 doanh nghiệp,\nnhà cung cấp sang tận nơi",
  "en": "Five sign-ups,\nand the supplier comes to you"
 },
 "ui.promo_desc": {
  "ko": "만나고 싶은 공급사에 미팅을 신청하세요. 목표 인원이 차면 공급사 담당자가 베트남에 와서 1:1로 만납니다.",
  "vi": "Hãy đăng ký gặp nhà cung cấp bạn quan tâm. Khi đủ số lượng, đại diện nhà cung cấp sẽ sang Việt Nam gặp trực tiếp 1:1.",
  "en": "Request a meeting with the suppliers you want. Once enough buyers join, their team comes to Vietnam to meet you 1:1."
 }
}
JSON, true);
        if (! is_array($new)) {
            return;
        }
        $enc   = static fn ($v) => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $isOld = static fn ($v) => is_array($v) && (strpos((string) ($v['ko'] ?? ''), '한국 공급사') !== false || strpos((string) ($v['ko'] ?? ''), '한국 담당자') !== false);

        $site = $db->table('settings')->where('key', 'site')->get()->getRowArray();
        $v    = $site ? json_decode((string) ($site['value'] ?? ''), true) : null;
        if (is_array($v) && $isOld($v['topbar'] ?? null)) {
            $v['topbar'] = $new['topbar'];
            $db->table('settings')->where('key', 'site')->update(['value' => $enc($v)]);
        }

        $copy = $db->table('settings')->where('key', 'copy')->get()->getRowArray();
        $c    = $copy ? json_decode((string) ($copy['value'] ?? ''), true) : null;
        if (is_array($c)) {
            $changed = false;
            foreach (['ui.promo_title', 'ui.promo_desc'] as $k) {
                if ($isOld($c[$k] ?? null)) {
                    $c[$k]   = $new[$k];
                    $changed = true;
                }
            }
            if ($changed) {
                $db->table('settings')->where('key', 'copy')->update(['value' => $enc($c)]);
            }
        }
    }

    public function down()
    {
        // 문구 교체라 되돌리지 않는다.
    }
}
