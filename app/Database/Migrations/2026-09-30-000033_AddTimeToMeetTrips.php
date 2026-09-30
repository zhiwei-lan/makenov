<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * meet_trips.time_start · time_end — 행사 시작·종료 시각 ("HH:MM", 베트남 시간).
 * 홈 카드·일정 페이지·제품 펀딩 패널에 일자·시간·장소를 함께 보여 주기 위해 추가.
 * 적용: Api\Meet 스키마 가드 v3.
 */
class AddTimeToMeetTrips extends Migration
{
    public function up()
    {
        if (! $this->db->tableExists('meet_trips')) return;
        $have = $this->db->getFieldNames('meet_trips');
        $add  = [];
        if (! in_array('time_start', $have, true)) {
            $add['time_start'] = ['type' => 'VARCHAR', 'constraint' => 5, 'null' => true, 'after' => 'visit_end'];
        }
        if (! in_array('time_end', $have, true)) {
            $add['time_end'] = ['type' => 'VARCHAR', 'constraint' => 5, 'null' => true, 'after' => 'visit_end'];
        }
        if ($add) {
            $this->forge->addColumn('meet_trips', $add);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('meet_trips', ['time_start', 'time_end']);
    }
}
