<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * meet_requests.attendees — 미팅에 나올 인원(회사당 1~5명). 신청 창의 '참석 인원' 선택기.
 * 여러 번 돌아도 안전하게(이미 있으면 건너뜀). 적용: Api\Meet 스키마 가드(SCHEMA_VER 2)
 */
class AddAttendeesToMeetRequests extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('meet_requests')) return;
        if (! in_array('attendees', $this->db->getFieldNames('meet_requests'), true)) {
            $this->forge->addColumn('meet_requests', [
                'attendees' => ['type' => 'TINYINT', 'constraint' => 3, 'default' => 1, 'null' => false],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('meet_requests', 'attendees');
    }
}
