<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 문구 교체(1회) — 메인(랜딩) 페이지를 미팅·행사 중심으로 재편(2026-10-05 사용자 승인).
 * 관리자 카피 탭에 저장돼 있던 랜딩 덮어쓰기 값(settings key='copy' 의 landing.*) 중
 *   - 히어로 둘째 줄 · 히어로 설명 · 마무리 문구는 새 문구로 바꾸고
 *   - 지운 구역(가격 비교 그림 landing.pain.* · 무료 안내 landing.cost.*)의 값은 뺀다.
 * 그대로 두면 매시간 자동 굽기(bake-landing.js)가 옛 문구를 다시 HTML 에 굽는다.
 * 예전 문구 그대로일 때만 바꾼다 — 관리자가 그사이 고친 값은 건드리지 않는다.
 * 적용: Api\Meet 스키마 가드 v12.
 */
class LandingMeetingCopy extends Migration
{
    public function up()
    {
        $db = $this->db;
        if (! $db->tableExists('settings')) {
            return;
        }
        $row = $db->table('settings')->where('key', 'copy')->get()->getRowArray();
        if (! $row) {
            return;
        }
        $v = json_decode((string) ($row['value'] ?? '{}'), true) ?: [];
        $new = [
            'landing.hero.h1b' => ['vi' => 'ngay tại Việt Nam', 'ko' => '베트남에서 직접 만나세요', 'en' => 'in person in Vietnam'],
            'landing.hero.sub' => ['vi' => 'Chọn sản phẩm bạn quan tâm và đăng ký gặp mặt
để trao đổi 1:1 với đại diện nhà cung cấp.
Đăng ký miễn phí, không cần tạo tài khoản', 'ko' => '관심 있는 제품을 고르고 미팅을 신청하면
공급사 담당자와 1:1로 상담합니다. 신청은 무료, 가입 없이 1분이면 됩니다', 'en' => 'Pick the products you are interested in and request a meeting
to talk 1:1 with the supplier. Free to request, no account needed.'],
            'landing.cta.p' => ['vi' => 'Đăng ký miễn phí, không cần tạo tài khoản, chỉ mất 1 phút.', 'ko' => '신청은 무료이고, 가입 없이 1분이면 됩니다.', 'en' => 'It is free, needs no account and takes a minute.'],
        ];
        /* 예전 값(한국어)에 이 구절이 있을 때만 교체 */
        $oldMark = [
            'landing.hero.h1b' => '공식 유통사',
            'landing.hero.sub' => '유통 조건을 확인',
            'landing.cta.p'    => '글로벌 혁신 제품을 만나보세요',
        ];
        foreach ($new as $k => $val) {
            if (isset($v[$k]) && strpos((string) ($v[$k]['ko'] ?? ''), $oldMark[$k]) !== false) {
                $v[$k] = $val;
            }
        }
        foreach (array_keys($v) as $k) {
            if (strpos($k, 'landing.pain.') === 0 || strpos($k, 'landing.cost.') === 0) {
                unset($v[$k]);
            }
        }
        $data = ['value' => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)];
        if (in_array('updated_at', $db->getFieldNames('settings'), true)) {
            $data['updated_at'] = date('Y-m-d H:i:s');
        }
        $db->table('settings')->where('key', 'copy')->update($data);
    }

    public function down()
    {
        // 문구 교체라 되돌리지 않는다.
    }
}
