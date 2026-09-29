<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * meet_trips — 방문 일정(미팅 행사). 한국 공급사 담당자가 베트남에 오는 날 하나 = 1행.
 * ------------------------------------------------------------
 * 미팅 펀딩: 공급사(제품)별로 베트남 인증 바이어가 goal(기본 5)곳 모이면 visit_date 에 방문 확정.
 * items = [{"product_id":"p1","goal":5}, ...]  (JSON 문자열, MySQL 5.6 이라 TEXT)
 * title·city·venue·summary 는 {"vi":..,"ko":..,"en":..} JSON.
 * status: open(모집중) · confirmed(방문 확정) · closed(마감) · cancelled(취소)
 * 적용: Api\Meet 의 자동 마이그레이션 가드 (deploy.yml 이 migrate 를 돌리지 않는다)
 * 설계: docs/superpowers/specs/2026-09-29-meeting-funding-design.md
 */
class CreateMeetTrips extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'         => ['type' => 'VARCHAR', 'constraint' => 40],
            'title'      => ['type' => 'TEXT', 'null' => true],
            'city'       => ['type' => 'TEXT', 'null' => true],
            'venue'      => ['type' => 'TEXT', 'null' => true],
            'summary'    => ['type' => 'TEXT', 'null' => true],
            'visit_date' => ['type' => 'DATE', 'null' => true],
            'visit_end'  => ['type' => 'DATE', 'null' => true],
            'deadline'   => ['type' => 'DATE', 'null' => true],
            'items'      => ['type' => 'TEXT', 'null' => true],
            'status'     => ['type' => 'VARCHAR', 'constraint' => 16, 'default' => 'open'],
            'published'  => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'sort'       => ['type' => 'INT', 'default' => 99],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addKey('visit_date');
        $this->forge->createTable('meet_trips', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('meet_trips', true);
    }
}
