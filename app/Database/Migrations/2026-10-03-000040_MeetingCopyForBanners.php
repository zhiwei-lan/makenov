<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 문구 교체(1회) — 상단 띠배너와 제품 페이지 중간 배너를 '인증하면 가격 공개'에서 '미팅 신청'으로(2026-10-03 사용자 승인).
 *   settings(key='site').topbar / topbarLink
 *   settings(key='copy')['ui.promo_title' · 'ui.promo_desc' · 'ui.promo_f1' · 'ui.promo_f2']  (관리자 문구 수정의 덮어쓰기 값)
 * 예전 문구 그대로일 때만 바꾼다 — 관리자가 그사이 고친 값은 건드리지 않는다.
 * i18n.js 의 기본값도 같은 문구로 맞췄다(기본값 = DB).
 * 적용: Api\Meet 스키마 가드 v10.
 */
class MeetingCopyForBanners extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('settings')) {
            return;
        }
        $now = date('Y-m-d H:i:s');
        $hasUpdated = in_array('updated_at', $db->getFieldNames('settings'), true);
        $save = function (string $key, array $val) use ($db, $now, $hasUpdated) {
            $row = ['value' => json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
            if ($hasUpdated) {
                $row['updated_at'] = $now;
            }
            $db->table('settings')->where('key', $key)->update($row);
        };

        /* 1) 상단 띠배너 */
        $site = $db->table('settings')->where('key', 'site')->get()->getRowArray();
        if ($site) {
            $v = json_decode((string) ($site['value'] ?? '{}'), true) ?: [];
            $old = (string) (($v['topbar']['ko'] ?? '') ?: ($v['topbar']['vi'] ?? ''));
            if ($old === '' || strpos($old, '인증') !== false || stripos($old, 'Xác thực') !== false) {
                $v['topbar'] = [
                    'vi' => 'Gặp trực tiếp nhà cung cấp Hàn Quốc tại Việt Nam. Đăng ký miễn phí, không cần tạo tài khoản',
                    'ko' => '한국 공급사를 베트남에서 직접 만나세요. 미팅 신청은 무료, 가입 없이 1분이면 됩니다',
                    'en' => 'Meet Korean suppliers in person in Vietnam. Free to request, no account needed',
                ];
                $v['topbarLink'] = '/meetings.html';
                $save('site', $v);
            }
        }

        /* 2) 제품 페이지 중간 배너 (관리자 문구 수정의 덮어쓰기) */
        $copy = $db->table('settings')->where('key', 'copy')->get()->getRowArray();
        if ($copy) {
            $v = json_decode((string) ($copy['value'] ?? '{}'), true) ?: [];
            $new = [
                'ui.promo_title' => [
                    'vi' => "Đủ 5 doanh nghiệp,\nnhà cung cấp Hàn Quốc sang tận nơi",
                    'ko' => "5곳이 모이면\n한국 공급사가 직접 찾아옵니다",
                    'en' => "Five sign-ups,\nand the Korean supplier comes to you",
                ],
                'ui.promo_desc' => [
                    'vi' => 'Hãy đăng ký gặp nhà cung cấp bạn quan tâm. Khi đủ số lượng, đại diện Hàn Quốc sẽ sang Việt Nam gặp trực tiếp 1:1.',
                    'ko' => '만나고 싶은 공급사에 미팅을 신청하세요. 목표 인원이 차면 한국 담당자가 베트남에 와서 1:1로 만납니다.',
                    'en' => 'Request a meeting with the suppliers you want. Once enough buyers join, their team comes to Vietnam to meet you 1:1.',
                ],
                'ui.promo_f1' => [
                    'vi' => 'Đăng ký 1 phút, không cần tài khoản',
                    'ko' => '가입 없이 1분 신청',
                    'en' => 'One-minute request, no account',
                ],
                'ui.promo_f2' => [
                    'vi' => 'Gặp trực tiếp 1:1 với nhà cung cấp',
                    'ko' => '공급사와 1:1 대면 미팅',
                    'en' => '1:1 in-person meetings with suppliers',
                ],
            ];
            $changed = false;
            foreach ($new as $k => $val) {
                $cur = json_encode($v[$k] ?? '', JSON_UNESCAPED_UNICODE);
                /* 예전 문구(인증·가격·견적) 그대로일 때만 */
                if (! isset($v[$k]) || preg_match('/인증|견적|가격|xác minh|báo giá|Xem giá/u', $cur)) {
                    $v[$k] = $val;
                    $changed = true;
                }
            }
            if ($changed) {
                $save('copy', $v);
            }
        }
    }

    public function down()
    {
        // 문구 교체는 되돌리지 않는다
    }
}
