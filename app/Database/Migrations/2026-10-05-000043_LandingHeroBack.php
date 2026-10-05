<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 문구 되돌림(1회) — 메인(랜딩) 히어로는 원래 것이 낫다는 피드백(2026-10-05)으로
 * 000042 가 바꿨던 히어로 둘째 줄 · 히어로 설명의 덮어쓰기 값(settings key='copy')을 예전 문구로 되돌린다.
 * 마무리 문구(landing.cta.p)와 지운 구역 정리는 그대로 둔다.
 * 000042 가 넣은 문구 그대로일 때만 되돌린다 — 관리자가 그사이 고친 값은 건드리지 않는다.
 * 적용: Api\Meet 스키마 가드 v13.
 */
class LandingHeroBack extends Migration
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
        $old = [
            'landing.hero.h1b' => ['vi' => 'của sản phẩm tiên phong toàn cầu', 'ko' => '공식 유통사가 될 수 있습니다', 'en' => 'of a global innovative product'],
            'landing.hero.sub' => ['vi' => 'Xem điều kiện phân phối của những sản phẩm chưa có mặt tại Việt Nam
và trao đổi trực tiếp với nhà cung cấp. 
Chưa có kinh nghiệm nhập khẩu vẫn bắt đầu được', 'ko' => '아직 베트남에 들어오지 않은 제품의 유통 조건을 확인하고
공급사와 직접 상담하세요. 수입 경험이 없어도 시작할 수 있습니다', 'en' => 'Check the trade terms of products that have not entered Vietnam yet
and talk directly with suppliers. No import experience needed.'],
        ];
        /* 000042 가 넣은 값(한국어)에 이 구절이 있을 때만 되돌린다 */
        $newMark = [
            'landing.hero.h1b' => '베트남에서 직접 만나세요',
            'landing.hero.sub' => '미팅을 신청하면',
        ];
        foreach ($old as $k => $val) {
            if (isset($v[$k]) && strpos((string) ($v[$k]['ko'] ?? ''), $newMark[$k]) !== false) {
                $v[$k] = $val;
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
