<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * meet_requests — 간편 신청(계정 없이 신청) 항목 추가.
 *   homepage  회사 홈페이지(선택)
 *   position  담당자 직함(선택)
 *   ip        신청 IP — 간편 신청 남용 방지(시간당 건수 제한)에만 쓴다
 * 업종은 기존 channel 칸을 그대로 쓴다(자유 입력).
 * 간편 신청의 buyer_id 는 'lead-' + md5(전화번호 숫자) — 같은 번호는 한 공급사에 한 번만 센다.
 * 적용: Api\Meet 스키마 가드 v9.
 */
class AddLeadFieldsToMeetRequests extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('meet_requests')) {
            return;
        }
        $have = $this->db->getFieldNames('meet_requests');
        $add  = [];
        if (! in_array('homepage', $have, true)) {
            $add['homepage'] = ['type' => 'VARCHAR', 'constraint' => 300, 'null' => true];
        }
        if (! in_array('position', $have, true)) {
            $add['position'] = ['type' => 'VARCHAR', 'constraint' => 120, 'null' => true];
        }
        if (! in_array('ip', $have, true)) {
            $add['ip'] = ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true];
        }
        if ($add) {
            $this->forge->addColumn('meet_requests', $add);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('meet_requests', ['homepage', 'position', 'ip']);
    }
}
