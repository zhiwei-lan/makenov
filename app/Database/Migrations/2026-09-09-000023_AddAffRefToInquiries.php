<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * inquiries.aff_ref / aff_ch — 문의가 어느 마케터 링크(코드)·채널로 들어왔는지.
 * 제휴 프로그램에서 기존 테이블을 건드리는 유일한 변경. 컬럼이 없어도 Rest::encode 가
 * 조용히 버리므로 마이그레이션 전에도 문의 저장은 깨지지 않는다.
 * 적용: php spark migrate  (또는 Api\Aff 의 자동 마이그레이션 가드)
 */
class AddAffRefToInquiries extends Migration
{
    public function up()
    {
        $fields = $this->db->getFieldNames('inquiries');
        $add = [];
        if (! in_array('aff_ref', $fields, true)) {
            $add['aff_ref'] = ['type' => 'VARCHAR', 'constraint' => 8, 'null' => true, 'after' => 'memo'];
        }
        if (! in_array('aff_ch', $fields, true)) {
            $add['aff_ch'] = ['type' => 'VARCHAR', 'constraint' => 16, 'null' => true, 'after' => 'memo'];
        }
        if ($add) {
            $this->forge->addColumn('inquiries', $add);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('inquiries', ['aff_ref', 'aff_ch']);
    }
}
