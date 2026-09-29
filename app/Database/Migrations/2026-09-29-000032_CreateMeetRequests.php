<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * meet_requests — 미팅 신청. (행사, 제품, 바이어) 조합당 1행.
 * ------------------------------------------------------------
 * 신청은 사업자 인증을 마친 바이어만(Api\Meet::apply). company·contact·phone 은 신청 시점의 프로필 사본.
 * status: applied(신청) · cancelled(바이어 취소) · met(미팅 완료) · noshow(불참)
 * 공개 API 에는 개수만 나간다 — 개인정보는 관리자 전용.
 */
class CreateMeetRequests extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id'           => ['type' => 'VARCHAR', 'constraint' => 40],
            'trip_id'      => ['type' => 'VARCHAR', 'constraint' => 40],
            'product_id'   => ['type' => 'VARCHAR', 'constraint' => 64],
            'buyer_id'     => ['type' => 'VARCHAR', 'constraint' => 40],
            'company'      => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'contact_name' => ['type' => 'VARCHAR', 'constraint' => 120, 'null' => true],
            'phone'        => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],
            'email'        => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'channel'      => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'volume'       => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'message'      => ['type' => 'TEXT', 'null' => true],
            'status'       => ['type' => 'VARCHAR', 'constraint' => 16, 'default' => 'applied'],
            'memo'         => ['type' => 'TEXT', 'null' => true],
            'aff_ref'      => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'updated_at'   => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['trip_id', 'product_id', 'buyer_id']);
        $this->forge->addKey('buyer_id');
        $this->forge->createTable('meet_requests', true, ['DEFAULT CHARSET' => 'utf8mb4', 'COLLATE' => 'utf8mb4_unicode_ci']);
    }

    public function down()
    {
        $this->forge->dropTable('meet_requests', true);
    }
}
